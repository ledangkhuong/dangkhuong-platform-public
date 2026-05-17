import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * SEPAY WEBHOOK
 * Sepay gọi endpoint này sau khi phát hiện giao dịch ngân hàng
 * Docs: https://docs.sepay.vn/webhook
 *
 * Cấu hình tại Sepay Dashboard:
 *   Webhook URL: https://dangkhuong.com/api/sepay/webhook
 *   API Key: giá trị SEPAY_API_KEY trong env
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Xác thực webhook từ Sepay
    const authHeader = req.headers.get("Authorization") || "";
    const apiKey = authHeader.replace("Apikey ", "").trim();
    const envKey = process.env.SEPAY_API_KEY || "";
    const isPlaceholder = !envKey || envKey.includes("your-");

    if (isPlaceholder) {
      console.warn("[Sepay] ⚠️ SEPAY_API_KEY chưa được cấu hình! Webhook sẽ xử lý nhưng không xác thực.");
    } else if (apiKey !== envKey) {
      console.error("[Sepay] ❌ Unauthorized - API key không khớp. Received:", apiKey?.slice(0, 8) + "...");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("[Sepay Webhook] Payload:", JSON.stringify(body));

    /**
     * Cấu trúc body từ Sepay:
     * {
     *   id: number,
     *   gateway: string,         // tên ngân hàng
     *   transactionDate: string,
     *   accountNumber: string,
     *   code: string,            // mã Sepay extract từ nội dung CK
     *   content: string,         // nội dung chuyển khoản đầy đủ
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
    // Nội dung CK format: "DK{ORDER_CODE}" - VD: "DKSPMP7Q9ZD0WP3"
    // SePay code field có thể chứa: "DKSPMP7Q9ZD0WP3" hoặc "SPMP7Q9ZD0WP3"
    // Order codes có thể bắt đầu bằng: SP (sanphamso), SE (slowenglish), DK (khác)

    // Extract all possible order codes to try
    const rawCode = (code || "").toUpperCase().trim();
    const contentMatch = (content || "").toUpperCase().match(/DK([A-Z0-9]+)/);
    const contentCode = contentMatch?.[1] || "";

    // Build list of candidates to try (deduplicated)
    const candidates = [...new Set([
      rawCode,                          // SePay code field as-is
      rawCode.replace(/^DK/, ""),       // Strip DK prefix from SePay code
      contentCode,                      // Regex extract from content (after DK)
      contentCode.replace(/^DK/, ""),   // Strip another DK if double-prefixed
    ])].filter(Boolean);

    console.log("[Sepay] Order code candidates:", candidates, "| content:", content, "| code:", code);

    if (candidates.length === 0) {
      console.warn("[Sepay] ⚠️ No order code found in content:", content);
      return NextResponse.json({ success: true, message: "No order code found" });
    }

    // Try each candidate until we find a matching order
    let order: Record<string, unknown> | null = null;
    let matchedCode = "";
    for (const candidate of candidates) {
      const { data } = await supabase
        .from("orders")
        .select("*, products(*)")
        .eq("order_code", candidate)
        .single();
      if (data) {
        order = data;
        matchedCode = candidate;
        break;
      }
    }

    if (!order) {
      console.error("[Sepay] ❌ Order not found. Tried:", candidates);
      return NextResponse.json({ success: true, message: "Order not found" });
    }

    console.log(`[Sepay] ✅ Found order ${matchedCode} (status: ${order.status})`);

    // Skip if already paid
    if (order.status === "paid") {
      console.log(`[Sepay] Order ${matchedCode} already paid, skipping`);
      return NextResponse.json({ success: true, message: "Already paid" });
    }

    // 3. Kiểm tra số tiền
    if (transferAmount < (order.amount as number)) {
      console.warn(`[Sepay] Thiếu tiền: cần ${order.amount}, nhận ${transferAmount}`);
      await supabase.from("orders").update({
        note: `Thiếu tiền: cần ${order.amount}đ, nhận ${transferAmount}đ`,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      return NextResponse.json({ success: true, message: "Amount mismatch" });
    }

    // 4. Cập nhật đơn hàng → PAID
    // Sepay transactionDate is Vietnam local time (UTC+7) WITHOUT timezone suffix.
    // We must append +07:00 before storing so it converts correctly when displayed.
    let paidAt: string;
    try {
      if (transactionDate) {
        const hasTimezone = /[Z+\-]\d{2}/.test(transactionDate);
        const dateStr = hasTimezone ? transactionDate : transactionDate.replace(" ", "T") + "+07:00";
        paidAt = new Date(dateStr).toISOString();
      } else {
        paidAt = new Date().toISOString();
      }
    } catch {
      paidAt = new Date().toISOString();
    }

    await supabase.from("orders").update({
      status: "paid",
      sepay_txn_id: referenceCode,
      sepay_content: content,
      bank_code: gateway,
      paid_at: paidAt,
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);

    // 5. Cấp quyền truy cập khoá học
    if (order.user_id && order.product_id) {
      await supabase.from("enrollments").upsert({
        user_id: order.user_id as string,
        product_id: order.product_id as string,
        order_id: order.id as string,
        source: "purchase",
      });

      // 6. Upgrade tier nếu là Quyền Đồng Hành
      const products = order.products as Record<string, unknown> | null;
      if (products?.tier_required === "vip") {
        await supabase.from("profiles")
          .update({ tier: "vip" })
          .eq("id", order.user_id);
      } else if (products?.tier_required === "member") {
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
      try {
        const { sendPurchaseConfirmation } = await import("@/lib/email/resend");
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", order.user_id).single();
        const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id as string);
        if (authUser?.user?.email) {
          await sendPurchaseConfirmation(
            authUser.user.email,
            profile?.full_name || "bạn",
            products?.name as string || "Sản phẩm",
            order.amount as number,
            order.order_code as string,
          ).catch(() => {});
        }
      } catch {
        console.warn("[Sepay] Email confirmation failed (non-critical)");
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
          const commissionAmount = Math.round((order.amount as number) * (affiliate.commission_rate / 100));
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
          try {
            const { sendAffiliateCommissionEmail } = await import("@/lib/email/resend");
            const { data: affProfile } = await supabase.from("profiles").select("full_name").eq("id", affiliate.user_id).single();
            const { data: affAuth } = await supabase.auth.admin.getUserById(affiliate.user_id);
            if (affAuth?.user?.email) {
              await sendAffiliateCommissionEmail(
                affAuth.user.email,
                affProfile?.full_name || "bạn",
                (order.products as Record<string, unknown>)?.name as string || "Sản phẩm",
                commissionAmount,
              ).catch(() => {});
            }
          } catch {
            // Non-critical
          }
          console.log(`[Sepay] 💰 Affiliate ${order.ref_code}: +${commissionAmount}đ hoa hồng`);
        }
      } catch (affErr) {
        console.error("[Sepay] Affiliate attribution error:", affErr);
      }
    }

    console.log(`[Sepay] ✅ Đơn ${matchedCode} thanh toán thành công: ${transferAmount}đ`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[Sepay Webhook Error]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
