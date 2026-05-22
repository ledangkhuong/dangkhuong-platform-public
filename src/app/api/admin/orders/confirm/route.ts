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
  try {
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

    if (!["admin", "manager", "sale"].includes(myProfile?.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let order_code;
    try {
      ({ order_code } = await req.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (!order_code) {
      return NextResponse.json(
        { error: "order_code is required" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // Find order (exact match first, then case-insensitive fallback)
    const trimmedCode = order_code.trim();
    let order: Record<string, unknown> | null = null;

    const { data: exactMatch } = await admin
      .from("orders")
      .select("*, products(*)")
      .eq("order_code", trimmedCode)
      .single();

    if (exactMatch) {
      order = exactMatch;
    } else {
      // Fallback: case-insensitive match (ilike)
      const { data: ilikeMatch } = await admin
        .from("orders")
        .select("*, products(*)")
        .ilike("order_code", trimmedCode)
        .single();
      if (ilikeMatch) {
        order = ilikeMatch;
      }
    }

    if (!order) {
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

      // Upgrade tier if product requires it (e.g. Quyền Đồng Hành)
      const products = order.products as Record<string, unknown> | null;
      if (products?.tier_required === "vip") {
        await admin.from("profiles")
          .update({ tier: "vip" })
          .eq("id", order.user_id);
      } else if (products?.tier_required === "member") {
        await admin.from("profiles")
          .update({ tier: "member" })
          .eq("id", order.user_id);
      }

      // Add XP (idempotent — skip if already awarded for this order)
      const { count: existingXpCount } = await admin
        .from("xp_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", order.user_id as string)
        .eq("action", "purchase")
        .contains("meta", { order_id: order.id });

      if (!existingXpCount || existingXpCount === 0) {
        await admin.from("xp_events").insert({
          user_id: order.user_id,
          action: "purchase",
          xp_amount: 500,
          meta: { order_id: order.id, product_id: order.product_id },
        });
      } else {
        console.log(`[Admin Confirm] XP already awarded for order ${order.id}, skipping`);
      }

      // Send emails (purchase confirmation + enrollment welcome)
      try {
        const { sendPurchaseConfirmation, sendEnrollmentWelcomeEmail } = await import("@/lib/email/transactional");
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", order.user_id)
          .single();
        const { data: authUser } = await admin.auth.admin.getUserById(
          order.user_id as string
        );
        const email = authUser?.user?.email;
        const name = profile?.full_name || "bạn";

        if (email) {
          // Purchase confirmation
          await sendPurchaseConfirmation(
            email,
            name,
            products?.title as string || "Sản phẩm",
            order.amount as number,
            order.order_code as string
          ).catch(() => {});

          // Enrollment welcome email
          if (enrolled) {
            await sendEnrollmentWelcomeEmail(
              email,
              name,
              products?.title as string || "Khoá học",
              products?.slug as string || "",
            ).catch(() => {});
          }
        }
      } catch {
        // Email failure should not break enrollment
      }

      // Send Zalo OA notification
      try {
        const { notifyPurchaseViaZalo } = await import("@/lib/zalo-notifications");
        const { data: zaloProfile } = await admin.from("profiles").select("full_name").eq("id", order.user_id).single();
        await notifyPurchaseViaZalo(
          order.user_id as string,
          zaloProfile?.full_name || "bạn",
          (order.products as Record<string, unknown>)?.title as string || "Sản phẩm",
          order.amount as number,
          order.order_code as string,
        );
      } catch {
        console.warn("[Admin Confirm] Zalo notification failed (non-critical)");
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
          const commissionAmount = Math.round((order.amount as number) * (affiliate.commission_rate / 100));
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

          // Update affiliate stats atomically (prevents race condition with concurrent orders)
          await admin.rpc("increment_affiliate_stats", {
            p_affiliate_id: affiliate.id,
            p_earned_amount: commissionAmount,
          });

          // Send affiliate commission email
          try {
            const { sendAffiliateCommissionEmail } = await import("@/lib/email/transactional");
            const { data: affProfile } = await admin.from("profiles").select("full_name").eq("id", affiliate.user_id).single();
            const { data: affAuth } = await admin.auth.admin.getUserById(affiliate.user_id);
            if (affAuth?.user?.email) {
              await sendAffiliateCommissionEmail(
                affAuth.user.email,
                affProfile?.full_name || "bạn",
                (order.products as Record<string, unknown>)?.title as string || "Sản phẩm",
                commissionAmount,
              ).catch((err: unknown) => console.error("[Admin Confirm] Affiliate email error:", err));
            }
          } catch {
            // Non-critical
          }

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
      target_id: order.id as string,
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
  } catch (err) {
    console.error("POST /api/admin/orders/confirm error:", err);
    return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
  }
}
