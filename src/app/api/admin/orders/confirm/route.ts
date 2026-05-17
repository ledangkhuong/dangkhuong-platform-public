import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

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
      { error: "Không tìm thấy đơn hàng" },
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

  // Update order → paid (optimistic lock: only update if still pending)
  const { data: updatedOrder, error: updateErr } = await admin
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      note: `Xác nhận thủ công bởi admin ${user.email}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .select()
    .single();

  if (!updatedOrder || updateErr) {
    return NextResponse.json(
      { error: "Order already processed or status changed" },
      { status: 409 }
    );
  }

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

    // Send emails (purchase confirmation + enrollment welcome)
    try {
      const { sendPurchaseConfirmation, sendEnrollmentWelcomeEmail } = await import("@/lib/email/resend");
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", order.user_id)
        .single();
      const { data: authUser } = await admin.auth.admin.getUserById(
        order.user_id
      );
      const email = authUser?.user?.email;
      const name = profile?.full_name || "bạn";

      if (email) {
        // Purchase confirmation
        await sendPurchaseConfirmation(
          email,
          name,
          order.products?.name || "Sản phẩm",
          order.amount,
          order.order_code
        ).catch(() => {});

        // Enrollment welcome email
        if (enrolled) {
          await sendEnrollmentWelcomeEmail(
            email,
            name,
            order.products?.name || order.products?.title || "Khoá học",
            order.products?.slug || "",
          ).catch(() => {});
        }
      }
    } catch {
      // Email failure should not break enrollment
    }
  }

  // Affiliate commission (same logic as Sepay webhook)
  if (order.ref_code) {
    try {
      const { data: affiliate } = await admin
        .from("affiliates")
        .select("id, user_id, commission_rate")
        .eq("ref_code", order.ref_code)
        .eq("status", "active")
        .single();

      if (affiliate && affiliate.user_id !== order.user_id) {
        const commissionAmount = Math.round(order.amount * (affiliate.commission_rate / 100));
        await admin.from("affiliate_conversions").insert({
          affiliate_id: affiliate.id,
          order_id: order.id,
          buyer_id: order.user_id,
          product_id: order.product_id,
          order_amount: order.amount,
          commission_rate: affiliate.commission_rate,
          commission_amount: commissionAmount,
          status: "pending",
        });
        console.log(`[Admin Confirm] Affiliate ${order.ref_code}: +${commissionAmount}đ commission`);
      }
    } catch (affErr) {
      console.error("[Admin Confirm] Affiliate attribution error:", affErr);
    }
  }

  // Audit log for order confirmation
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  await logAudit({
    admin_id: user.id,
    action: "order.confirm",
    target_type: "order",
    target_id: order.id,
    details: { order_code: order.order_code, amount: order.amount },
    ip_address: ip,
  });

  return NextResponse.json({
    success: true,
    order_code: order.order_code,
    status: "paid",
    enrolled,
    customer: order.customer_name,
  });
}
