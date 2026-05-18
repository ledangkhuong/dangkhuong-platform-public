import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

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
      console.error("[Sepay] SEPAY_API_KEY not configured! Rejecting.");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    const apiKeyBuf = Buffer.from(apiKey);
    const envKeyBuf = Buffer.from(envKey);
    if (apiKeyBuf.length !== envKeyBuf.length || !crypto.timingSafeEqual(apiKeyBuf, envKeyBuf)) {
      console.error("[Sepay] Unauthorized - API key mismatch");
      logAudit({
        admin_id: "system",
        action: "webhook.auth_failed" as any,
        target_type: "webhook",
        target_id: "sepay",
        details: { ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown" },
      }).catch((err) => console.error("[SePay Webhook] Non-critical error:", err));
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("[Sepay Webhook] Received:", { transferType: body.transferType, code: body.code, amount: body.transferAmount });

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
    // IMPORTANT: Preserve original case — order codes are case-sensitive (nanoid)
    // Formats encountered:
    //   Old: transfer_content = "DK{DKxxx}" (double DK) → content = "DKDKa3Bf9Kx2Mn"
    //   New: transfer_content = "{DKxxx}" (single)      → content = "DKa3Bf9Kx2Mn"
    //   SP:  transfer_content = "DK{SPxxx}"             → content = "DKSPTSXecPUjukw2"
    const rawCode = (code || "").trim();
    const fullContent = (content || "").trim();
    const contentMatch = fullContent.match(/DK([A-Za-z0-9]+)/i);
    const contentCode = contentMatch?.[1] || "";

    // Build list of candidates to try (deduplicated)
    const candidates = [...new Set([
      rawCode,                                    // SePay code field as-is
      rawCode.replace(/^DK/i, ""),                // Strip DK prefix (case-insensitive)
      contentCode,                                // Regex extract from content (after first DK)
      contentCode.replace(/^DK/i, ""),            // Strip another DK if double-prefixed (old format)
      fullContent,                                // Full content as-is (new format: content IS the code)
      fullContent.replace(/^DK/i, ""),            // Full content minus DK prefix
    ])].filter(Boolean);

    console.log("[Sepay] Order code candidates:", candidates, "| content:", content, "| code:", code);

    if (candidates.length === 0) {
      console.warn("[Sepay] ⚠️ No order code found in content:", content);
      return NextResponse.json({ success: true, message: "No order code found" });
    }

    // Try each candidate until we find a matching order
    // Use case-insensitive search (ilike) as fallback for case mismatches
    let order: Record<string, unknown> | null = null;
    let matchedCode = "";
    for (const candidate of candidates) {
      // Try exact match first (faster, uses index)
      const { data: exactMatch } = await supabase
        .from("orders")
        .select("*, products(*)")
        .eq("order_code", candidate)
        .single();
      if (exactMatch) {
        order = exactMatch;
        matchedCode = candidate;
        break;
      }
      // Fallback: case-insensitive match
      const { data: ilikeMatch } = await supabase
        .from("orders")
        .select("*, products(*)")
        .ilike("order_code", candidate)
        .single();
      if (ilikeMatch) {
        order = ilikeMatch;
        matchedCode = (ilikeMatch as Record<string, unknown>).order_code as string || candidate;
        break;
      }
    }

    if (!order) {
      console.error("[Sepay] ❌ Order not found. Tried:", candidates);
      return NextResponse.json({ success: true, message: "Order not found" });
    }

    console.log(`[Sepay] ✅ Found order ${matchedCode} (status: ${order.status})`);

    // Only process pending orders
    if (order.status !== "pending") {
      console.log(`[Sepay] Order ${matchedCode} status is '${order.status}', skipping`);
      return NextResponse.json({ success: true, message: `Order status is ${order.status}` });
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

    const { data: updatedOrder, error: updateErr } = await supabase.from("orders").update({
      status: "paid",
      sepay_txn_id: referenceCode,
      sepay_content: content,
      bank_code: gateway,
      paid_at: paidAt,
      updated_at: new Date().toISOString(),
    }).eq("id", order.id).eq("status", "pending").select().single();

    if (!updatedOrder || updateErr) {
      console.log(`[Sepay] Order ${matchedCode} already processed (race condition prevented)`);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Audit log for successful payment
    await logAudit({
      admin_id: "system",
      action: "order.confirm" as any,
      target_type: "order",
      target_id: order.id as string,
      details: {
        order_code: matchedCode,
        amount: transferAmount,
        source: "sepay_webhook",
        bank: gateway,
      },
    });

    // 4b. Handle subscription orders
    if (order.payment_method === "subscription" || (updatedOrder as Record<string, unknown>).payment_method === "subscription") {
      try {
        const confirmHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (process.env.INTERNAL_WEBHOOK_SECRET) {
          confirmHeaders["Authorization"] = `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET}`;
        }
        const confirmRes = await fetch(new URL("/api/subscriptions/confirm", req.url).toString(), {
          method: "POST",
          headers: confirmHeaders,
          body: JSON.stringify({ order_id: order.id }),
        });
        if (!confirmRes.ok) {
          console.warn("[Sepay] Subscription confirm failed:", await confirmRes.text());
        } else {
          console.log(`[Sepay] ✅ Subscription activated for order ${matchedCode}`);
        }
      } catch (subErr) {
        console.error("[Sepay] Subscription confirm error:", subErr);
      }
    }

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
          ).catch((err) => console.error("[SePay Webhook] Non-critical error:", err));
        }
      } catch {
        console.warn("[Sepay] Email confirmation failed (non-critical)");
      }

      // 8b. Gửi thông báo Zalo OA
      try {
        const { notifyPurchaseViaZalo } = await import("@/lib/zalo-notifications");
        const { data: zaloProfile } = await supabase.from("profiles").select("full_name").eq("id", order.user_id).single();
        await notifyPurchaseViaZalo(
          order.user_id as string,
          zaloProfile?.full_name || "bạn",
          products?.name as string || "Sản phẩm",
          order.amount as number,
          order.order_code as string,
        );
      } catch {
        console.warn("[Sepay] Zalo notification failed (non-critical)");
      }
    }

    // 9. Affiliate conversion attribution
    if (order.ref_code) {
      try {
        const { data: affiliate } = await supabase
          .from("affiliates")
          .select("id, user_id, commission_rate, total_earned, total_conversions")
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

          // Update affiliate stats (total_earned & total_conversions)
          await supabase
            .from("affiliates")
            .update({
              total_earned: affiliate.total_earned + commissionAmount,
              total_conversions: affiliate.total_conversions + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", affiliate.id);

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
              ).catch((err) => console.error("[SePay Webhook] Non-critical error:", err));
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
