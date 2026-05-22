import { createAdminClient } from "@/lib/supabase/server";

/**
 * Send critical alerts to all admin/manager users via in-app notifications.
 * Non-blocking — fire-and-forget, never throws.
 */
export async function alertAdmins(
  title: string,
  message: string,
  link?: string
): Promise<void> {
  try {
    const supabase = await createAdminClient();

    // Find all admin/manager users
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "manager"]);

    if (!admins || admins.length === 0) return;

    // Create notification for each admin
    const rows = admins.map((a) => ({
      user_id: a.id,
      type: "alert",
      title,
      message,
      link: link || "/admin",
      read: false,
    }));

    await supabase.from("notifications").insert(rows);
  } catch (err) {
    // Never throw — this is a best-effort alert
    console.error("[AdminAlert] Failed to send:", err);
  }
}

/**
 * Alert admins about a failed payment webhook.
 * Called when SePay/PayOS webhook can't match an order.
 */
export function alertPaymentFailure(details: {
  source: string;
  amount: number;
  content: string;
  candidates: string[];
  gateway?: string;
}): void {
  alertAdmins(
    "⚠️ Thanh toán không khớp đơn hàng",
    `${details.source}: Nhận ${details.amount.toLocaleString("vi-VN")}đ từ ${details.gateway || "unknown"}. ` +
    `Nội dung: "${details.content}". ` +
    `Đã thử: ${details.candidates.join(", ")} — không tìm thấy đơn.`,
    "/admin/orders"
  ).catch(() => {});
}

/**
 * Alert admins about underpayment.
 */
export function alertUnderpayment(details: {
  orderCode: string;
  expected: number;
  received: number;
  customerName: string;
}): void {
  alertAdmins(
    "⚠️ Thiếu tiền thanh toán",
    `Đơn ${details.orderCode} (${details.customerName}): ` +
    `Cần ${details.expected.toLocaleString("vi-VN")}đ, nhận ${details.received.toLocaleString("vi-VN")}đ. ` +
    `Thiếu ${(details.expected - details.received).toLocaleString("vi-VN")}đ.`,
    "/admin/orders"
  ).catch(() => {});
}
