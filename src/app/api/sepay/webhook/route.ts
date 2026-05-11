import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * SEPAY WEBHOOK
 * Sepay gọi endpoint này sau khi phát hiện giao dịch ngân hàng
 * Docs: https://docs.sepay.vn/webhook
 *
 * Cấu hình tại Sepay Dashboard:
 *   Webhook URL: https://dangkhuong.com/api/sepay/webhook
 *   Secret key: giá trị SEPAY_WEBHOOK_SECRET trong .env
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Xác thực webhook từ Sepay
    const apiKey = req.headers.get("Authorization")?.replace("Apikey ", "");
    if (apiKey !== process.env.SEPAY_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("[Sepay Webhook]", body);

    /**
     * Cấu trúc body từ Sepay:
     * {
     *   id: number,
     *   gateway: string,         // tên ngân hàng
     *   transactionDate: string,
     *   accountNumber: string,
     *   code: string,            // mã đơn hàng trong nội dung CK
     *   content: string,         // nội dung chuyển khoản
     *   transferType: "in"|"out",
     *   transferAmount: number,  // số tiền
     *   accumulated: number,
     *   referenceCode: string,
     *   description: string,
     * }
     */

    const {
      transferType, transferAmount, content,
      code, referenceCode, gateway, transactionDate,
    } = body;

    // Chỉ xử lý giao dịch tiền vào
    if (transferType !== "in") {
      return NextResponse.json({ success: true, message: "Ignored outgoing" });
    }

    const supabase = await createAdminClient();

    // 2. Tìm đơn hàng theo mã trong nội dung chuyển khoản
    // Nội dung CK format: "DK{ORDER_CODE}" - VD: "DK123456"
    const orderCodeMatch = content?.match(/DK([A-Z0-9]+)/i);
    const orderCode = code || orderCodeMatch?.[1];

    if (!orderCode) {
      return NextResponse.json({ success: true, message: "No order code found" });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, products(*)")
      .eq("order_code", orderCode.toUpperCase())
      .single();

    if (orderError || !order) {
      console.error("[Sepay] Order not found:", orderCode);
      return NextResponse.json({ success: true, message: "Order not found" });
    }

    // 3. Kiểm tra số tiền
    if (transferAmount < order.amount) {
      console.warn(`[Sepay] Thiếu tiền: cần ${order.amount}, nhận ${transferAmount}`);
      await supabase.from("orders").update({
        note: `Thiếu tiền: cần ${order.amount}đ, nhận ${transferAmount}đ`,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      return NextResponse.json({ success: true, message: "Amount mismatch" });
    }

    // 4. Cập nhật đơn hàng → PAID
    await supabase.from("orders").update({
      status: "paid",
      sepay_txn_id: referenceCode,
      sepay_content: content,
      bank_code: gateway,
      paid_at: transactionDate,
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);

    // 5. Cấp quyền truy cập khoá học
    if (order.user_id && order.product_id) {
      await supabase.from("enrollments").upsert({
        user_id: order.user_id,
        product_id: order.product_id,
        order_id: order.id,
        source: "purchase",
      });

      // 6. Upgrade tier nếu là Quyền Đồng Hành
      if (order.products?.tier_required === "vip") {
        await supabase.from("profiles")
          .update({ tier: "vip" })
          .eq("id", order.user_id);
      } else if (order.products?.tier_required === "member") {
        await supabase.from("profiles")
          .update({ tier: "member" })
          .eq("id", order.user_id);
      }

      // 7. Thêm XP mua hàng
      await supabase.from("xp_events").insert({
        user_id: order.user_id,
        action: "purchase",
        xp_amount: 500,
        meta: { order_id: order.id, product_id: order.product_id },
      });

      // 8. Gửi email xác nhận mua hàng
      const { sendPurchaseConfirmation } = await import("@/lib/email/resend");
      // Lấy email của user
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", order.user_id).single();
      const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
      if (authUser?.user?.email) {
        await sendPurchaseConfirmation(
          authUser.user.email,
          profile?.full_name || "bạn",
          order.products?.name || "Sản phẩm",
          order.amount,
          order.order_code,
        ).catch(() => {});
      }
    }

    // 9. Affiliate conversion attribution
    if (order.ref_code) {
      try {
        const { data: affiliate } = await supabase
          .from("affiliates")
          .select("id, user_id, commission_rate")
          .eq("ref_code", order.ref_code)
          .eq("status", "active")
          .single();

        // Không cho tự giới thiệu chính mình
        if (affiliate && affiliate.user_id !== order.user_id) {
          const commissionAmount = Math.round(order.amount * (affiliate.commission_rate / 100));
          await supabase.from("affiliate_conversions").insert({
            affiliate_id: affiliate.id,
            order_id: order.id,
            buyer_id: order.user_id,
            product_id: order.product_id,
            order_amount: order.amount,
            commission_rate: affiliate.commission_rate,
            commission_amount: commissionAmount,
            status: "pending",
          });

          // Gửi email thông báo hoa hồng cho affiliate
          const { sendAffiliateCommissionEmail } = await import("@/lib/email/resend");
          const { data: affProfile } = await supabase.from("profiles").select("full_name").eq("id", affiliate.user_id).single();
          const { data: affAuth } = await supabase.auth.admin.getUserById(affiliate.user_id);
          if (affAuth?.user?.email) {
            await sendAffiliateCommissionEmail(
              affAuth.user.email,
              affProfile?.full_name || "bạn",
              order.products?.name || "Sản phẩm",
              commissionAmount,
            ).catch(() => {});
          }
          console.log(`[Sepay] 💰 Affiliate ${order.ref_code}: +${commissionAmount}đ hoa hồng`);
        }
      } catch (affErr) {
        console.error("[Sepay] Affiliate attribution error:", affErr);
      }
    }

    console.log(`[Sepay] ✅ Đơn ${orderCode} thanh toán thành công: ${transferAmount}đ`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[Sepay Webhook Error]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
