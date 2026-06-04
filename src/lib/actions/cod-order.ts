"use server";

/**
 * COD (Cash-on-Delivery) order server actions — Week 6.
 *
 * Bối cảnh
 * --------
 * Week 4 placeOrderDraft hardcode `payment_method='bank_transfer'`. Week 6
 * relax CHECK constraint để cho phép thêm 'cod' và 'payos', đồng thời cần
 * flow riêng cho COD:
 *
 *   1. Customer chọn COD ở Checkout → đơn được tạo ngay với
 *      status='pending', payment_status='pending', payment_method='cod'.
 *      KHÔNG gọi `createShipment` ngay (đợi admin confirm để tránh tạo
 *      đơn rác ở GHN).
 *   2. Hệ thống gửi mail cho admin (`sendCODAdminAlert`) để team biết có
 *      đơn COD mới chờ xử lý.
 *   3. Admin verify (gọi điện xác nhận khách thật, kiểm tra địa chỉ…) rồi
 *      bấm "Xác nhận COD" → `confirmCODOrder(orderId)`:
 *        • orders.status = 'paid'  (giữ enum hiện tại — không thêm 'confirmed_cod' ở Week 6 để tránh phải migrate enum)
 *        • orders.payment_status = 'cod_confirmed' (best-effort field, optional column)
 *        • gọi `createShipment(orderId)` → tạo vận đơn GHN với payment_type_id=2 (GHN thu hộ — handled inside shipping action via env override or future enhancement).
 *        • gửi mail xác nhận khách hàng (kèm tracking).
 *   4. Shipper xác nhận đã thu tiền → `markCODDelivered(orderId)`:
 *        • shipping_status = 'delivered'
 *        • payment_status   = 'paid'
 *        • orders.status stays 'paid' (đã set ở bước 3)
 *
 * Nguyên tắc
 * ----------
 *  - BACKWARD COMPATIBLE: chỉ thao tác trên orders có payment_method='cod';
 *    không touch course-only / sepay / payos / bank_transfer flow.
 *  - Idempotent: gọi `confirmCODOrder` 2 lần không tạo shipment 2 lần
 *    (delegate to shipping.createShipment idempotency check).
 *  - Best-effort side effects: createShipment fail hoặc email fail KHÔNG
 *    block status update. Log error + admin manual retry.
 *  - Admin-only: caller phải có profiles.role ∈ {admin, manager}. Webhook
 *    không gọi function này — webhook đi qua sepay/payos flow.
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createShipment } from "@/lib/actions/shipping";
import {
  sendPurchaseConfirmation,
  // sendCODAdminAlert exported below — imported via dynamic import in callers
  // to avoid circular when this file also defines mail helpers.
} from "@/lib/email/transactional";
import { sendEmail as sesSendEmail } from "@/lib/email/ses";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CodActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export interface ConfirmCODOrderResult {
  orderId: string;
  shipmentId: string | null;
  shipmentError: string | null;
  emailSent: boolean;
}

export interface MarkCODDeliveredResult {
  orderId: string;
}

// ---------------------------------------------------------------------------
// Auth helper — admin/manager only
// ---------------------------------------------------------------------------

/**
 * Verify caller is admin or manager. Throws via redirect("/login" or
 * "/dashboard") nếu không hợp lệ — pattern khớp sale-targets.ts.
 *
 * Returns { userId, email } để caller dùng trong audit log nếu cần.
 */
async function requireAdminOrManager(): Promise<{
  userId: string;
  email: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return { userId: user.id, email: user.email ?? null };
}

// ---------------------------------------------------------------------------
// 1) confirmCODOrder(orderId) — admin xác nhận COD và phát hành vận đơn
// ---------------------------------------------------------------------------

/**
 * Admin xác nhận đơn COD sau khi gọi điện khách / kiểm tra địa chỉ.
 *
 * Bước thực hiện:
 *   1. Auth check (admin/manager).
 *   2. Load order. Validate:
 *       - tồn tại
 *       - payment_method = 'cod'
 *       - status hiện tại ∈ {'pending'} (idempotency: nếu đã 'paid' với
 *         shipment thì trả OK, không lỗi)
 *   3. Update orders.status='paid' + payment_status='cod_confirmed'
 *      (best-effort — payment_status column có thể null/optional).
 *   4. Gọi createShipment(orderId). Fail → log + continue (admin có thể
 *      retry qua "Tạo vận đơn" trong dashboard).
 *   5. Gửi mail xác nhận khách hàng (best-effort).
 *   6. revalidatePath admin order list.
 */
export async function confirmCODOrder(
  orderId: string,
): Promise<CodActionResult<ConfirmCODOrderResult>> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };

  // 1) Authz.
  await requireAdminOrManager();

  const admin = await createAdminClient();

  // 2) Load order.
  const { data: order, error: loadErr } = await admin
    .from("orders")
    .select(
      [
        "id",
        "order_code",
        "status",
        "payment_method",
        "payment_status",
        "user_id",
        "customer_email",
        "customer_name",
        "shipping_full_name",
        "total_amount",
      ].join(","),
    )
    .eq("id", orderId)
    .maybeSingle<{
      id: string;
      order_code: string | null;
      status: string;
      payment_method: string | null;
      payment_status: string | null;
      user_id: string | null;
      customer_email: string | null;
      customer_name: string | null;
      shipping_full_name: string | null;
      total_amount: number | null;
    }>();

  if (loadErr) {
    console.error("[cod-order/confirmCODOrder] load error:", loadErr.message);
    return { ok: false, error: "Không thể đọc đơn hàng." };
  }
  if (!order) {
    return { ok: false, error: "Không tìm thấy đơn hàng.", code: "NOT_FOUND" };
  }
  if (order.payment_method !== "cod") {
    return {
      ok: false,
      error: "Đơn này không phải COD.",
      code: "NOT_COD",
    };
  }

  // Idempotency: nếu đã được xác nhận trước đó, tiếp tục đảm bảo shipment
  // đã được tạo (createShipment có check trùng).
  const alreadyPaid = order.status === "paid";

  if (!alreadyPaid) {
    const { error: updErr } = await admin
      .from("orders")
      .update({
        status: "paid",
        payment_status: "cod_confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("payment_method", "cod"); // double-guard tránh race

    if (updErr) {
      // Có thể fail nếu cột payment_status chưa tồn tại — thử lại không có nó.
      const fallback = await admin
        .from("orders")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("payment_method", "cod");
      if (fallback.error) {
        console.error(
          "[cod-order/confirmCODOrder] update orders failed:",
          updErr.message,
          fallback.error.message,
        );
        return { ok: false, error: "Không thể cập nhật trạng thái đơn." };
      }
    }
  }

  // 3.5) Trừ tồn kho (Week 7) — best-effort, idempotent.
  //      COD chỉ tạo shipment sau khi admin confirm, nên đây là điểm
  //      mark đơn 'paid' — cần trừ stock luôn để đồng bộ với Sepay/PayOS.
  try {
    const { deductInventory } = await import("@/lib/ecommerce/inventory");
    const invRes = await deductInventory(orderId);
    if (!invRes.ok) {
      console.warn(
        "[cod-order/confirmCODOrder] deductInventory failed (non-fatal):",
        invRes.error,
      );
    }
  } catch (err) {
    console.error(
      "[cod-order/confirmCODOrder] deductInventory threw (non-fatal):",
      err,
    );
  }

  // 4) Tạo vận đơn — best-effort, không block confirm.
  let shipmentId: string | null = null;
  let shipmentError: string | null = null;
  try {
    const shipResult = await createShipment(orderId);
    if (shipResult.ok) {
      shipmentId = shipResult.shipmentId;
    } else {
      shipmentError = shipResult.error;
      console.warn(
        "[cod-order/confirmCODOrder] createShipment failed (non-fatal):",
        shipResult.error,
      );
    }
  } catch (err) {
    shipmentError = err instanceof Error ? err.message : String(err);
    console.error(
      "[cod-order/confirmCODOrder] createShipment threw:",
      err,
    );
  }

  // 5) Gửi mail xác nhận khách (best-effort).
  let emailSent = false;
  const recipient = order.customer_email;
  const recipientName =
    order.customer_name ?? order.shipping_full_name ?? "Quý khách";
  if (recipient) {
    try {
      await sendPurchaseConfirmation(
        recipient,
        recipientName,
        `Đơn hàng ${order.order_code ?? order.id.slice(0, 8)}`,
        Number(order.total_amount) || 0,
        order.order_code ?? order.id,
      );
      emailSent = true;
    } catch (err) {
      console.warn(
        "[cod-order/confirmCODOrder] purchase email failed (non-fatal):",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // 6) Revalidate admin views.
  try {
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
  } catch {
    // revalidatePath may be a no-op in some contexts — ignore.
  }

  return {
    ok: true,
    data: {
      orderId,
      shipmentId,
      shipmentError,
      emailSent,
    },
  };
}

// ---------------------------------------------------------------------------
// 2) markCODDelivered(orderId) — shipper xác nhận đã thu tiền + giao hàng
// ---------------------------------------------------------------------------

/**
 * Đánh dấu đơn COD đã được giao và thu tiền thành công.
 *
 * Thường được gọi:
 *  - Tự động từ webhook GHN khi shipment chuyển sang 'delivered' (Week 5
 *    syncShipmentStatus sẽ set orders.shipping_status='delivered'; hàm này
 *    bổ sung thêm payment_status='paid' cho riêng nhóm COD).
 *  - Admin bấm tay trong dashboard nếu webhook miss.
 *
 * Idempotent: gọi lại nhiều lần chỉ giữ trạng thái cuối.
 */
export async function markCODDelivered(
  orderId: string,
): Promise<CodActionResult<MarkCODDeliveredResult>> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };

  // Authz — admin/manager hoặc webhook (webhook nên gọi qua endpoint riêng,
  // không qua server action). Ở đây enforce admin.
  await requireAdminOrManager();

  const admin = await createAdminClient();

  // Verify đơn này là COD trước khi update — tránh chạm vào đơn course / online payment.
  const { data: order, error: loadErr } = await admin
    .from("orders")
    .select("id, payment_method, status, shipping_status, payment_status")
    .eq("id", orderId)
    .maybeSingle<{
      id: string;
      payment_method: string | null;
      status: string;
      shipping_status: string | null;
      payment_status: string | null;
    }>();

  if (loadErr) {
    console.error(
      "[cod-order/markCODDelivered] load error:",
      loadErr.message,
    );
    return { ok: false, error: "Không thể đọc đơn hàng." };
  }
  if (!order) {
    return { ok: false, error: "Không tìm thấy đơn hàng.", code: "NOT_FOUND" };
  }
  if (order.payment_method !== "cod") {
    return {
      ok: false,
      error: "Đơn này không phải COD.",
      code: "NOT_COD",
    };
  }

  const now = new Date().toISOString();

  // Update both shipping_status + payment_status. status='paid' giữ nguyên
  // nếu đã set ở confirmCODOrder; nếu admin skip confirm (edge case) thì
  // ép sang 'paid' luôn — đã giao + đã thu tiền tức là done.
  const { error: updErr } = await admin
    .from("orders")
    .update({
      status: "paid",
      shipping_status: "delivered",
      payment_status: "paid",
      updated_at: now,
    })
    .eq("id", orderId)
    .eq("payment_method", "cod");

  if (updErr) {
    // Fallback nếu payment_status column chưa tồn tại.
    const fallback = await admin
      .from("orders")
      .update({
        status: "paid",
        shipping_status: "delivered",
        updated_at: now,
      })
      .eq("id", orderId)
      .eq("payment_method", "cod");
    if (fallback.error) {
      console.error(
        "[cod-order/markCODDelivered] update failed:",
        updErr.message,
        fallback.error.message,
      );
      return { ok: false, error: "Không thể cập nhật trạng thái đơn." };
    }
  }

  try {
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
  } catch {
    /* no-op */
  }

  return { ok: true, data: { orderId } };
}

// ---------------------------------------------------------------------------
// 3) sendCODAdminAlert — email admin khi customer vừa đặt COD
// ---------------------------------------------------------------------------

/**
 * Trả về list email admin nhận alert. Đọc từ env (comma-separated) hoặc
 * fallback profiles.role='admin' active. Tránh hard-code domain.
 */
async function resolveAdminAlertRecipients(): Promise<string[]> {
  const envList = process.env.COD_ADMIN_ALERT_EMAILS || process.env.ADMIN_ALERT_EMAILS;
  if (envList) {
    return envList
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /.+@.+\..+/.test(e));
  }

  // Fallback: query profiles where role='admin' và có email.
  try {
    const admin = await createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(20);
    const ids = (data ?? []).map((r) => (r as { id: string }).id);
    if (ids.length === 0) return [];
    const { data: users } = await admin.auth.admin.listUsers();
    return (users?.users ?? [])
      .filter((u) => u.email && ids.includes(u.id))
      .map((u) => u.email!.toLowerCase());
  } catch (err) {
    console.warn(
      "[cod-order/resolveAdminAlertRecipients] fallback query failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Gửi mail cho admin báo có đơn COD mới cần xác nhận thủ công.
 *
 * Thiết kế là một export riêng (không nằm trong transactional.ts) vì:
 *  - Recipient là internal (admin), không phải customer → format gọn,
 *    không cần wrap brand template.
 *  - Lifecycle hook đặc thù COD — chỉ chỗ duy nhất gọi là
 *    placeOrderDraft / checkout flow khi method='cod'.
 *
 * Best-effort: fail không throw lên caller (return { ok:false } nhẹ).
 */
export async function sendCODAdminAlert(input: {
  orderId: string;
  orderCode: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  totalAmount: number;
  shippingAddress: string;
  itemsSummary: string;
}): Promise<CodActionResult<{ recipients: string[] }>> {
  const recipients = await resolveAdminAlertRecipients();
  if (recipients.length === 0) {
    console.warn(
      "[cod-order/sendCODAdminAlert] no admin recipients configured (set COD_ADMIN_ALERT_EMAILS).",
    );
    return {
      ok: false,
      error: "Chưa cấu hình email admin nhận thông báo COD.",
      code: "NO_RECIPIENTS",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
  const adminLink = `${baseUrl}/admin/orders/${encodeURIComponent(input.orderId)}`;
  const codeDisplay = input.orderCode ?? input.orderId.slice(0, 8);
  const amountFmt = (Number(input.totalAmount) || 0).toLocaleString("vi-VN") + "₫";

  const subject = `[COD] Đơn mới cần xác nhận — ${codeDisplay}`;
  const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,Segoe UI,sans-serif;background:#f5f5f5;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px;">
    <h2 style="margin:0 0 12px;color:#111;font-size:18px;">🛒 Đơn COD mới — cần xác nhận thủ công</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:14px;">
      Một khách hàng vừa đặt hàng theo hình thức <strong>Thanh toán khi nhận hàng (COD)</strong>.
      Vui lòng gọi điện xác nhận trước khi tạo vận đơn.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;color:#111;">
      <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Mã đơn</td><td style="font-family:monospace;">${escapeHtml(codeDisplay)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Khách hàng</td><td>${escapeHtml(input.customerName)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">SĐT</td><td><a href="tel:${escapeHtml(input.customerPhone)}" style="color:#0ea5e9;">${escapeHtml(input.customerPhone)}</a></td></tr>
      ${input.customerEmail ? `<tr><td style="padding:6px 0;color:#6b7280;">Email</td><td>${escapeHtml(input.customerEmail)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Địa chỉ giao</td><td>${escapeHtml(input.shippingAddress)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Sản phẩm</td><td>${escapeHtml(input.itemsSummary)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Tổng tiền thu hộ</td><td style="color:#dc2626;font-weight:700;font-size:15px;">${escapeHtml(amountFmt)}</td></tr>
    </table>
    <div style="text-align:center;margin:20px 0 8px;">
      <a href="${escapeHtml(adminLink)}" style="display:inline-block;padding:11px 22px;background:#111;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Mở chi tiết đơn →</a>
    </div>
    <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
      Email tự động — gửi từ hệ thống Lê Đăng Khương Academy. Không reply.
    </p>
  </div>
</body></html>`;

  // SES sendEmail nhận từng địa chỉ — gửi tuần tự để có rate-limit ổn định.
  // Số recipient nội bộ thường ≤ 5 nên không cần parallelize.
  let sent = 0;
  for (const to of recipients) {
    try {
      await sesSendEmail(to, subject, html);
      sent++;
    } catch (err) {
      console.warn(
        `[cod-order/sendCODAdminAlert] send to ${to} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (sent === 0) {
    return { ok: false, error: "Tất cả lần gửi email thất bại." };
  }

  return { ok: true, data: { recipients } };
}
