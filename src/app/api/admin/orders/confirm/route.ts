import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/orders/confirm
 * Admin xác nhận thanh toán thủ công cho đơn hàng
 * Body: { order_code: string }
 *
 * Thực hiện: update status → paid, tạo enrollment, thêm XP
 */
export async function POST(req: NextRequest) {
  // Auth: only admin/manager
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "manager"].includes(myProfile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { order_code } = await req.json();
  if (!order_code) {
    return NextResponse.json(
      { error: "order_code is required" },
      { status: 400 }
    );
  }

  const admin = await createAdminClient();

  // Find order
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("*, products(*)")
    .eq("order_code", order_code.toUpperCase())
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: `Order ${order_code} not found` },
      { status: 404 }
    );
  }

  if (order.status === "paid") {
    return NextResponse.json({
      success: true,
      message: "Order already paid",
      order_code: order.order_code,
    });
  }

  // Update order → paid
  await admin
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      note: `Xác nhận thủ công bởi admin ${user.email}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  // Create enrollment
  let enrolled = false;
  if (order.user_id && order.product_id) {
    const { error: enrollErr } = await admin.from("enrollments").upsert({
      user_id: order.user_id,
      product_id: order.product_id,
      order_id: order.id,
      source: "purchase",
    });
    enrolled = !enrollErr;

    // Add XP
    await admin.from("xp_events").insert({
      user_id: order.user_id,
      action: "purchase",
      xp_amount: 500,
      meta: { order_id: order.id, product_id: order.product_id },
    });

    // Send confirmation email
    try {
      const { sendPurchaseConfirmation } = await import("@/lib/email/resend");
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", order.user_id)
        .single();
      const { data: authUser } = await admin.auth.admin.getUserById(
        order.user_id
      );
      if (authUser?.user?.email) {
        await sendPurchaseConfirmation(
          authUser.user.email,
          profile?.full_name || "bạn",
          order.products?.name || "Sản phẩm",
          order.amount,
          order.order_code
        ).catch(() => {});
      }
    } catch {
      // Non-critical
    }
  }

  return NextResponse.json({
    success: true,
    order_code: order.order_code,
    status: "paid",
    enrolled,
    customer: order.customer_name,
  });
}
