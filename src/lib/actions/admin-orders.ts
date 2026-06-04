"use server";

/**
 * Admin order management server actions — Week 7.
 *
 * Phạm vi
 * -------
 * Tập hợp các action cho trang `/admin/orders/physical` (và view chi tiết)
 * để team vận hành quản lý đơn vật lý sau khi đặt thành công ở Week 4–6:
 *
 *  - updateOrderStatus       — đổi trạng thái có validate transition.
 *  - addOrderNote            — append ghi chú nội bộ vào `orders.note`
 *                              kèm timestamp + tên admin.
 *  - cancelOrder             — huỷ đơn, huỷ shipment GHN (nếu có), restore
 *                              tồn kho cho variant/product.
 *  - markPhysicalDelivered   — đánh dấu đã giao (shipping_status,
 *                              actual_delivery_date).
 *  - bulkUpdateStatus        — bulk action cho checkbox list view.
 *  - assignOrderToSale       — gán đơn cho 1 sale rep.
 *
 * Nguyên tắc
 * ----------
 *  - Auth inline: `requireStaff()` ở đầu mỗi action, theo pattern của
 *    `lib/actions/products.ts` (admin/manager/marketing). Marketing CHỈ được
 *    đọc — các action mutate nguy hiểm (cancel, bulk) restrict thêm về
 *    admin/manager. Đơn giản, không tách 2 helper: 1 helper chung trả role,
 *    caller tự gate thêm nếu cần.
 *  - Result shape `{ ok, data | error }` — không throw lên caller, tránh
 *    Next.js render lỗi 500 khi UI bấm button.
 *  - Mọi mutation cuối cùng đều `revalidatePath('/admin/orders/physical')`
 *    để list view refresh; với cancel/markDelivered cũng revalidate detail
 *    page.
 *  - Status transition table (xem `STATUS_TRANSITIONS` dưới đây) — không
 *    cho phép nhảy bậc nguy hiểm như `pending → refunded` hoặc
 *    `cancelled → paid`.
 *  - Restore inventory chỉ áp dụng khi đơn đã từng trừ stock (status='paid'
 *    hoặc 'pending' với variant_id). Best-effort — RPC update nhỏ; nếu fail
 *    log warn, không block cancel.
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cancelGHNShipment } from "@/lib/actions/shipping";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type OrderStatus = "pending" | "paid" | "cancelled" | "refunded";

export type AdminOrderActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export interface UpdateOrderStatusResult {
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
}

export interface AddOrderNoteResult {
  orderId: string;
  noteAppended: string;
}

export interface CancelOrderResult {
  orderId: string;
  shipmentCancelled: boolean;
  shipmentError: string | null;
  inventoryRestored: number;
}

export interface MarkPhysicalDeliveredResult {
  orderId: string;
  actualDeliveryDate: string;
}

export interface BulkUpdateStatusResult {
  total: number;
  updated: number;
  failed: Array<{ orderId: string; error: string }>;
}

export interface AssignOrderResult {
  orderId: string;
  assignedTo: string | null;
}

// ---------------------------------------------------------------------------
// Auth helper — admin / manager / marketing.
//
// Khớp pattern `requireStaff` trong `lib/actions/products.ts` để hành vi
// đồng nhất trên toàn bộ admin namespace.
// ---------------------------------------------------------------------------

const ADMIN_ROLES = ["admin", "manager", "marketing"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

interface StaffSession {
  userId: string;
  role: AdminRole;
  displayName: string;
}

async function requireStaff(): Promise<StaffSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, display_name")
    .eq("id", user.id)
    .single<{
      role: string;
      full_name: string | null;
      display_name: string | null;
    }>();

  if (!profile || !ADMIN_ROLES.includes(profile.role as AdminRole)) {
    redirect("/dashboard");
  }

  const displayName =
    profile.display_name?.trim() ||
    profile.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "admin";

  return {
    userId: user.id,
    role: profile.role as AdminRole,
    displayName,
  };
}

/**
 * Một số action có hiệu lực phá huỷ (cancel, bulk update sang cancelled,
 * refunded) — gate riêng admin/manager. Marketing chỉ là role hỗ trợ
 * SEO/content, không được huỷ đơn.
 */
function assertMutatorRole(session: StaffSession): void {
  if (!(["admin", "manager"] as const).includes(session.role as never)) {
    // Throw vào redirect để UI thấy ngay; gateway behavior khớp requireStaff.
    redirect("/dashboard");
  }
}

// ---------------------------------------------------------------------------
// Status transition table
// ---------------------------------------------------------------------------

/**
 * Map các chuyển đổi trạng thái hợp lệ.
 *
 *   pending   → paid | cancelled
 *   paid      → refunded | cancelled (cancel sau paid = trả lại / huỷ đặc biệt)
 *   cancelled → (terminal)
 *   refunded  → (terminal)
 *
 * Lý do bao gồm `paid → cancelled`: trường hợp khách yêu cầu huỷ giữa
 * chừng sau khi đã thanh toán nhưng trước khi giao — admin huỷ đơn,
 * `cancelOrder` sẽ vừa set 'cancelled' vừa restore inventory + cancel
 * shipment. Không cho `pending → delivered` vì delivery thuộc shipping
 * status (xem markPhysicalDelivered), không phải order.status.
 */
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["refunded", "cancelled"],
  cancelled: [],
  refunded: [],
};

function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true; // no-op cho phép (idempotent)
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// 1) updateOrderStatus
// ---------------------------------------------------------------------------

/**
 * Đổi trạng thái đơn (pending/paid/cancelled/refunded) với validate transition.
 *
 * - KHÔNG xử lý side-effect như restore inventory / cancel shipment ở đây.
 *   Nếu admin muốn huỷ "đúng quy trình" → dùng `cancelOrder()` (gọi action
 *   này nội bộ + thêm cleanup).
 * - Nếu newStatus === current → trả ok, no-op.
 * - Log transition vào `order_status_history` nếu bảng tồn tại; bảng chưa
 *   có thì best-effort try/catch, không block.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
): Promise<AdminOrderActionResult<UpdateOrderStatusResult>> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };
  if (!["pending", "paid", "cancelled", "refunded"].includes(newStatus)) {
    return { ok: false, error: "Trạng thái không hợp lệ.", code: "BAD_STATUS" };
  }

  const session = await requireStaff();
  // Cancelled / refunded yêu cầu mutator role.
  if (newStatus === "cancelled" || newStatus === "refunded") {
    assertMutatorRole(session);
  }

  const admin = await createAdminClient();

  const { data: order, error: loadErr } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle<{ id: string; status: OrderStatus }>();

  if (loadErr) {
    console.error("[admin-orders/updateOrderStatus] load error:", loadErr.message);
    return { ok: false, error: "Không thể đọc đơn hàng." };
  }
  if (!order) {
    return { ok: false, error: "Không tìm thấy đơn hàng.", code: "NOT_FOUND" };
  }

  const previousStatus = order.status;
  if (!isValidTransition(previousStatus, newStatus)) {
    return {
      ok: false,
      error: `Không thể chuyển từ '${previousStatus}' sang '${newStatus}'.`,
      code: "INVALID_TRANSITION",
    };
  }

  if (previousStatus === newStatus) {
    // No-op — return ok để UI không hiển thị lỗi giả.
    return {
      ok: true,
      data: { orderId, previousStatus, newStatus },
    };
  }

  const { error: updErr } = await admin
    .from("orders")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", previousStatus); // optimistic concurrency

  if (updErr) {
    console.error("[admin-orders/updateOrderStatus] update error:", updErr.message);
    return { ok: false, error: "Không thể cập nhật trạng thái đơn." };
  }

  // Best-effort history log. Schema gợi ý:
  //   order_status_history(id, order_id, from_status, to_status, changed_by,
  //                        changed_by_name, created_at)
  // Nếu bảng chưa tạo → catch silently.
  try {
    await admin.from("order_status_history").insert({
      order_id: orderId,
      from_status: previousStatus,
      to_status: newStatus,
      changed_by: session.userId,
      changed_by_name: session.displayName,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // PGRST or 42P01 (relation does not exist) — chấp nhận.
    console.warn(
      "[admin-orders/updateOrderStatus] history insert skipped:",
      err instanceof Error ? err.message : err,
    );
  }

  revalidatePath("/admin/orders/physical");
  revalidatePath(`/admin/orders/${orderId}`);

  return {
    ok: true,
    data: { orderId, previousStatus, newStatus },
  };
}

// ---------------------------------------------------------------------------
// 2) addOrderNote
// ---------------------------------------------------------------------------

/**
 * Append một ghi chú nội bộ vào `orders.note`.
 *
 * Format: `\n[YYYY-MM-DD HH:mm — {displayName}] {note}`
 *
 * Không xoá nội dung cũ — chỉ concat. Nếu `note` đang null → set giá trị
 * mới (không có leading newline).
 */
export async function addOrderNote(
  orderId: string,
  note: string,
): Promise<AdminOrderActionResult<AddOrderNoteResult>> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };
  const trimmed = (note ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: "Ghi chú không được để trống.", code: "EMPTY" };
  }
  if (trimmed.length > 2000) {
    return {
      ok: false,
      error: "Ghi chú quá dài (tối đa 2000 ký tự).",
      code: "TOO_LONG",
    };
  }

  const session = await requireStaff();
  const admin = await createAdminClient();

  const { data: order, error: loadErr } = await admin
    .from("orders")
    .select("id, note")
    .eq("id", orderId)
    .maybeSingle<{ id: string; note: string | null }>();

  if (loadErr) {
    console.error("[admin-orders/addOrderNote] load error:", loadErr.message);
    return { ok: false, error: "Không thể đọc đơn hàng." };
  }
  if (!order) {
    return { ok: false, error: "Không tìm thấy đơn hàng.", code: "NOT_FOUND" };
  }

  const ts = formatVietnamTimestamp(new Date());
  const stamped = `[${ts} — ${session.displayName}] ${trimmed}`;
  const nextNote = order.note ? `${order.note}\n${stamped}` : stamped;

  const { error: updErr } = await admin
    .from("orders")
    .update({
      note: nextNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updErr) {
    console.error("[admin-orders/addOrderNote] update error:", updErr.message);
    return { ok: false, error: "Không thể lưu ghi chú." };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders/physical");

  return { ok: true, data: { orderId, noteAppended: stamped } };
}

/**
 * Format timestamp giờ VN: "YYYY-MM-DD HH:mm".
 * Dùng Intl thay vì hard-code offset để Daylight Saving (không áp dụng cho
 * VN nhưng vẫn an toàn) + i18n đồng nhất.
 */
function formatVietnamTimestamp(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

// ---------------------------------------------------------------------------
// 3) cancelOrder
// ---------------------------------------------------------------------------

/**
 * Huỷ đơn hàng — quy trình đầy đủ:
 *
 *   1. Auth check + mutator role.
 *   2. Load order + shipments + items.
 *   3. Nếu order đã 'cancelled' → idempotent return ok.
 *   4. Nếu order đã 'refunded' → từ chối (đã hoàn tiền không nên đổi sang cancel).
 *   5. Nếu có shipment GHN status không 'delivered'/'cancelled' → gọi
 *      `cancelGHNShipment`. Lỗi GHN → return error, KHÔNG touch DB (giữ
 *      nguyên để admin retry hoặc decide).
 *   6. Update orders: status='cancelled', cancel_reason, cancelled_at.
 *      (cancel_reason/cancelled_at là best-effort columns — fallback nếu
 *      DB chưa thêm.)
 *   7. Restore inventory: với mỗi order_item có variant_id/product_id và
 *      item_type='physical' → +quantity vào stock_count.
 *   8. Append note "[Huỷ đơn] {reason}".
 */
export async function cancelOrder(
  orderId: string,
  reason?: string,
): Promise<AdminOrderActionResult<CancelOrderResult>> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };

  const session = await requireStaff();
  assertMutatorRole(session);

  const admin = await createAdminClient();

  // 2) Load order.
  const { data: order, error: loadErr } = await admin
    .from("orders")
    .select("id, status, note")
    .eq("id", orderId)
    .maybeSingle<{ id: string; status: OrderStatus; note: string | null }>();

  if (loadErr) {
    console.error("[admin-orders/cancelOrder] load order error:", loadErr.message);
    return { ok: false, error: "Không thể đọc đơn hàng." };
  }
  if (!order) {
    return { ok: false, error: "Không tìm thấy đơn hàng.", code: "NOT_FOUND" };
  }

  if (order.status === "cancelled") {
    // Idempotent.
    return {
      ok: true,
      data: {
        orderId,
        shipmentCancelled: false,
        shipmentError: null,
        inventoryRestored: 0,
      },
    };
  }
  if (order.status === "refunded") {
    return {
      ok: false,
      error: "Đơn đã hoàn tiền — không thể chuyển sang trạng thái huỷ.",
      code: "ALREADY_REFUNDED",
    };
  }

  // 5) Cancel shipment(s) nếu có.
  const { data: shipments } = await admin
    .from("shipments")
    .select("id, carrier, status, carrier_order_code")
    .eq("order_id", orderId);

  let shipmentCancelled = false;
  let shipmentError: string | null = null;

  for (const shipment of shipments ?? []) {
    if (shipment.status === "delivered") {
      shipmentError = "Có vận đơn đã giao — không thể huỷ đơn tự động.";
      return {
        ok: false,
        error: shipmentError,
        code: "SHIPMENT_DELIVERED",
      };
    }
    if (shipment.status === "cancelled") continue;
    if (shipment.carrier === "ghn" && shipment.carrier_order_code) {
      try {
        const cancelRes = await cancelGHNShipment(shipment.id);
        if (cancelRes.ok) {
          shipmentCancelled = true;
        } else {
          shipmentError = cancelRes.error;
          // GHN từ chối → return error, không touch order status.
          return {
            ok: false,
            error: `Không thể huỷ vận đơn GHN: ${cancelRes.error}`,
            code: "GHN_CANCEL_FAILED",
          };
        }
      } catch (err) {
        shipmentError = err instanceof Error ? err.message : String(err);
        console.error("[admin-orders/cancelOrder] cancelGHNShipment threw:", err);
        return {
          ok: false,
          error: `Lỗi khi huỷ vận đơn: ${shipmentError}`,
          code: "GHN_CANCEL_ERROR",
        };
      }
    } else {
      // Carrier khác (manual/ghtk/jt) — chỉ cập nhật local status.
      await admin
        .from("shipments")
        .update({
          status: "cancelled",
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", shipment.id);
      shipmentCancelled = true;
    }
  }

  // 6) Update order status. Try full payload trước, fallback bỏ cancel_*.
  const now = new Date().toISOString();
  const cancelReason = (reason ?? "").trim() || null;

  const { error: updErr } = await admin
    .from("orders")
    .update({
      status: "cancelled",
      cancel_reason: cancelReason,
      cancelled_at: now,
      shipping_status: "cancelled",
      updated_at: now,
    })
    .eq("id", orderId);

  if (updErr) {
    // Fallback nếu DB chưa có cancel_reason / cancelled_at.
    const fallback = await admin
      .from("orders")
      .update({
        status: "cancelled",
        updated_at: now,
      })
      .eq("id", orderId);
    if (fallback.error) {
      console.error(
        "[admin-orders/cancelOrder] update order failed:",
        updErr.message,
        fallback.error.message,
      );
      return { ok: false, error: "Không thể cập nhật trạng thái đơn." };
    }
  }

  // 7) Restore inventory.
  const inventoryRestored = await restoreInventoryForOrder(admin, orderId);

  // 8) Append cancel note.
  try {
    const stamp = formatVietnamTimestamp(new Date());
    const reasonText = cancelReason ?? "Không ghi lý do";
    const cancelNote = `[${stamp} — ${session.displayName}] [HUỶ ĐƠN] ${reasonText}`;
    const nextNote = order.note ? `${order.note}\n${cancelNote}` : cancelNote;
    await admin.from("orders").update({ note: nextNote }).eq("id", orderId);
  } catch (err) {
    console.warn(
      "[admin-orders/cancelOrder] note append skipped:",
      err instanceof Error ? err.message : err,
    );
  }

  // Status history (best-effort).
  try {
    await admin.from("order_status_history").insert({
      order_id: orderId,
      from_status: order.status,
      to_status: "cancelled",
      changed_by: session.userId,
      changed_by_name: session.displayName,
      reason: cancelReason,
      created_at: now,
    });
  } catch {
    /* table optional */
  }

  revalidatePath("/admin/orders/physical");
  revalidatePath(`/admin/orders/${orderId}`);

  return {
    ok: true,
    data: {
      orderId,
      shipmentCancelled,
      shipmentError,
      inventoryRestored,
    },
  };
}

/**
 * Cộng tồn kho trả lại cho các order_item của 1 đơn.
 *
 * Thực hiện tuần tự — số lượng line items 1 đơn thường ≤ 10 nên không cần
 * parallel/RPC phức tạp. Với variant → bump `product_variants.stock_count`.
 * Với product không có variant → bump `products.stock_count` (nếu cột đó
 * có) — wrap try/catch riêng để cột thiếu không block.
 *
 * Trả về số item đã restore thành công (không phải tổng quantity).
 */
async function restoreInventoryForOrder(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  orderId: string,
): Promise<number> {
  const { data: items, error } = await admin
    .from("order_items")
    .select("id, product_id, variant_id, quantity, item_type")
    .eq("order_id", orderId);

  if (error) {
    console.warn(
      "[admin-orders/restoreInventoryForOrder] cannot load items:",
      error.message,
    );
    return 0;
  }

  let restored = 0;

  for (const item of items ?? []) {
    if (item.item_type === "course" || item.item_type === "digital") continue;
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;

    try {
      if (item.variant_id) {
        // Đọc → cộng → ghi. Không có RPC `increment` mặc định trên Supabase;
        // race-condition window rất nhỏ ở luồng admin nên chấp nhận.
        const { data: variant } = await admin
          .from("product_variants")
          .select("stock_count")
          .eq("id", item.variant_id)
          .maybeSingle<{ stock_count: number }>();
        const current = Number(variant?.stock_count ?? 0);
        const { error: vErr } = await admin
          .from("product_variants")
          .update({ stock_count: current + qty })
          .eq("id", item.variant_id);
        if (!vErr) restored++;
        else {
          console.warn(
            "[admin-orders/restoreInventory] variant update error:",
            vErr.message,
          );
        }
      } else if (item.product_id) {
        // Fallback cho product không có variant — thử cập nhật stock_count
        // trên products. Nếu cột không tồn tại sẽ throw → bỏ qua.
        try {
          const { data: prod } = await admin
            .from("products")
            .select("stock_count")
            .eq("id", item.product_id)
            .maybeSingle<{ stock_count: number | null }>();
          const current = Number(prod?.stock_count ?? 0);
          const { error: pErr } = await admin
            .from("products")
            .update({ stock_count: current + qty })
            .eq("id", item.product_id);
          if (!pErr) restored++;
        } catch (err) {
          console.warn(
            "[admin-orders/restoreInventory] product fallback skipped:",
            err instanceof Error ? err.message : err,
          );
        }
      }
    } catch (err) {
      console.warn(
        "[admin-orders/restoreInventory] item failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return restored;
}

// ---------------------------------------------------------------------------
// 4) markPhysicalDelivered
// ---------------------------------------------------------------------------

/**
 * Đánh dấu đơn vật lý đã giao thành công.
 *
 *  - shipping_status = 'delivered'
 *  - actual_delivery_date = now()
 *
 * KHÔNG đụng `orders.status` (vẫn 'paid' hoặc giữ nguyên) — delivery là
 * trục riêng. Nếu đơn là COD thì caller nên dùng `markCODDelivered`
 * trong `cod-order.ts` để chốt cả payment_status='paid'.
 */
export async function markPhysicalDelivered(
  orderId: string,
): Promise<AdminOrderActionResult<MarkPhysicalDeliveredResult>> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };

  await requireStaff();

  const admin = await createAdminClient();

  const { data: order, error: loadErr } = await admin
    .from("orders")
    .select("id, status, shipping_status")
    .eq("id", orderId)
    .maybeSingle<{
      id: string;
      status: OrderStatus;
      shipping_status: string | null;
    }>();

  if (loadErr) {
    console.error(
      "[admin-orders/markPhysicalDelivered] load error:",
      loadErr.message,
    );
    return { ok: false, error: "Không thể đọc đơn hàng." };
  }
  if (!order) {
    return { ok: false, error: "Không tìm thấy đơn hàng.", code: "NOT_FOUND" };
  }
  if (order.status === "cancelled" || order.status === "refunded") {
    return {
      ok: false,
      error: "Đơn đã huỷ/hoàn — không thể đánh dấu giao hàng.",
      code: "BAD_STATE",
    };
  }

  const now = new Date().toISOString();

  const { error: updErr } = await admin
    .from("orders")
    .update({
      shipping_status: "delivered",
      actual_delivery_date: now,
      updated_at: now,
    })
    .eq("id", orderId);

  if (updErr) {
    console.error(
      "[admin-orders/markPhysicalDelivered] update error:",
      updErr.message,
    );
    return { ok: false, error: "Không thể cập nhật trạng thái giao hàng." };
  }

  // Đồng bộ shipments hiện hữu (best-effort) — set status='delivered' cho
  // shipment chưa terminal. Giúp dashboard hiển thị đồng nhất khi admin
  // mark tay (skip webhook GHN).
  try {
    await admin
      .from("shipments")
      .update({
        status: "delivered",
        actual_delivery_date: now,
        last_synced_at: now,
      })
      .eq("order_id", orderId)
      .not("status", "in", "(delivered,cancelled,returned)");
  } catch (err) {
    console.warn(
      "[admin-orders/markPhysicalDelivered] shipment sync skipped:",
      err instanceof Error ? err.message : err,
    );
  }

  revalidatePath("/admin/orders/physical");
  revalidatePath(`/admin/orders/${orderId}`);

  return { ok: true, data: { orderId, actualDeliveryDate: now } };
}

// ---------------------------------------------------------------------------
// 5) bulkUpdateStatus
// ---------------------------------------------------------------------------

/**
 * Bulk update trạng thái cho nhiều đơn — tick checkbox trên list view.
 *
 *  - Chạy tuần tự qua từng đơn để re-use validate transition của
 *    `updateOrderStatus`. Số lượng bulk thường ≤ 50; nếu nhu cầu tăng có
 *    thể đổi sang batch SQL ở Week 8.
 *  - Trả về breakdown (updated count + failed list) thay vì throw — UI
 *    hiển thị toast "X/Y đơn đã cập nhật, Z lỗi".
 *  - REVALIDATE 1 LẦN sau cùng (không trong loop) để giảm work.
 */
export async function bulkUpdateStatus(
  orderIds: string[],
  newStatus: OrderStatus,
): Promise<AdminOrderActionResult<BulkUpdateStatusResult>> {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return { ok: false, error: "Danh sách đơn rỗng.", code: "EMPTY_LIST" };
  }
  if (orderIds.length > 100) {
    return {
      ok: false,
      error: "Vượt giới hạn 100 đơn / lần.",
      code: "TOO_MANY",
    };
  }
  if (!["pending", "paid", "cancelled", "refunded"].includes(newStatus)) {
    return { ok: false, error: "Trạng thái không hợp lệ.", code: "BAD_STATUS" };
  }

  const session = await requireStaff();
  if (newStatus === "cancelled" || newStatus === "refunded") {
    assertMutatorRole(session);
  }

  const admin = await createAdminClient();

  // Dedupe.
  const ids = Array.from(new Set(orderIds.filter(Boolean)));
  const failed: Array<{ orderId: string; error: string }> = [];
  let updated = 0;

  // Pre-load tất cả status hiện tại trong 1 query.
  const { data: rows, error: loadErr } = await admin
    .from("orders")
    .select("id, status")
    .in("id", ids);

  if (loadErr) {
    console.error("[admin-orders/bulkUpdateStatus] load error:", loadErr.message);
    return { ok: false, error: "Không thể đọc danh sách đơn." };
  }

  const statusMap = new Map<string, OrderStatus>();
  for (const r of (rows as Array<{ id: string; status: OrderStatus }>) ?? []) {
    statusMap.set(r.id, r.status);
  }

  const now = new Date().toISOString();

  for (const id of ids) {
    const current = statusMap.get(id);
    if (!current) {
      failed.push({ orderId: id, error: "Không tìm thấy đơn." });
      continue;
    }
    if (current === newStatus) {
      // Idempotent — coi như success, không tăng updated.
      continue;
    }
    if (!isValidTransition(current, newStatus)) {
      failed.push({
        orderId: id,
        error: `Không thể chuyển '${current}' → '${newStatus}'.`,
      });
      continue;
    }

    const { error: upErr } = await admin
      .from("orders")
      .update({ status: newStatus, updated_at: now })
      .eq("id", id)
      .eq("status", current);

    if (upErr) {
      failed.push({ orderId: id, error: upErr.message });
      continue;
    }
    updated++;

    // History best-effort.
    try {
      await admin.from("order_status_history").insert({
        order_id: id,
        from_status: current,
        to_status: newStatus,
        changed_by: session.userId,
        changed_by_name: session.displayName,
        created_at: now,
      });
    } catch {
      /* table optional */
    }
  }

  revalidatePath("/admin/orders/physical");

  return {
    ok: true,
    data: {
      total: ids.length,
      updated,
      failed,
    },
  };
}

// ---------------------------------------------------------------------------
// 6) assignOrderToSale
// ---------------------------------------------------------------------------

/**
 * Gán đơn cho 1 sale rep (profiles.id). Cho phép null để bỏ assignment.
 *
 *  - Verify saleUserId tồn tại trong profiles + có role hợp lệ (admin /
 *    manager / sales). Nếu role không phải các giá trị này, từ chối.
 *  - Best-effort: nếu role schema khác → fallback chỉ kiểm tra profile tồn tại.
 */
export async function assignOrderToSale(
  orderId: string,
  saleUserId: string | null,
): Promise<AdminOrderActionResult<AssignOrderResult>> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };

  await requireStaff();
  const admin = await createAdminClient();

  // Verify order tồn tại.
  const { data: order, error: loadErr } = await admin
    .from("orders")
    .select("id, assigned_to")
    .eq("id", orderId)
    .maybeSingle<{ id: string; assigned_to: string | null }>();

  if (loadErr) {
    console.error(
      "[admin-orders/assignOrderToSale] load order error:",
      loadErr.message,
    );
    return { ok: false, error: "Không thể đọc đơn hàng." };
  }
  if (!order) {
    return { ok: false, error: "Không tìm thấy đơn hàng.", code: "NOT_FOUND" };
  }

  // Verify sale user (nếu không null).
  if (saleUserId) {
    const { data: sale, error: saleErr } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", saleUserId)
      .maybeSingle<{ id: string; role: string }>();

    if (saleErr) {
      console.error(
        "[admin-orders/assignOrderToSale] load sale error:",
        saleErr.message,
      );
      return { ok: false, error: "Không thể xác thực sale rep." };
    }
    if (!sale) {
      return {
        ok: false,
        error: "Sale rep không tồn tại.",
        code: "SALE_NOT_FOUND",
      };
    }
    const allowed = ["admin", "manager", "sales", "marketing"];
    if (!allowed.includes(sale.role)) {
      return {
        ok: false,
        error: `Người dùng có role '${sale.role}' không thể nhận đơn.`,
        code: "INVALID_ROLE",
      };
    }
  }

  // No-op nếu đã assigned giống y hệt.
  if (order.assigned_to === saleUserId) {
    return { ok: true, data: { orderId, assignedTo: saleUserId } };
  }

  const { error: updErr } = await admin
    .from("orders")
    .update({
      assigned_to: saleUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updErr) {
    console.error(
      "[admin-orders/assignOrderToSale] update error:",
      updErr.message,
    );
    return { ok: false, error: "Không thể gán đơn." };
  }

  revalidatePath("/admin/orders/physical");
  revalidatePath(`/admin/orders/${orderId}`);

  return { ok: true, data: { orderId, assignedTo: saleUserId } };
}
