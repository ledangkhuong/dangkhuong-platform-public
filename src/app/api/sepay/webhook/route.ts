import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";
import { trackPurchase } from "@/lib/facebook-capi";
import { getPixelConfigBySlug } from "@/lib/pixel-config";
import { syncAttributionToConversion } from "@/lib/attribution";
import { alertPaymentFailure, alertUnderpayment } from "@/lib/admin-alerts";

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
    // Known order code prefixes: DK, OF (Omni Flash), SP (sanphamso), SE (slowenglish), HX (hocchuaxong)
    // Known transfer_content formats:
    //   Standard:  "DK{orderCode}"  → e.g. "DKOF5WUrNymCdSHL"
    //   Legacy OF: "OF{orderCode}"  → e.g. "OFOF5WUrNymCdSHL" (bug: double OF)
    //   Double DK: "DK{DKxxx}"     → e.g. "DKDKa3Bf9Kx2Mn"
    const rawCode = (code || "").trim();
    const fullContent = (content || "").trim();

    // Primary regex: match DK prefix (standard format)
    const dkMatch = fullContent.match(/DK([A-Za-z0-9]+)/i);
    const dkCode = dkMatch?.[1] || "";
    const dkFullMatch = dkMatch?.[0] || "";

    // Secondary regex: match any known order prefix (OF, SP, SE, HX) for resilience
    // This catches cases where transfer_content accidentally uses wrong prefix
    const anyPrefixMatch = fullContent.match(/(?:OF|SP|SE|HX)([A-Za-z0-9]{10,})/);
    const anyPrefixCode = anyPrefixMatch?.[1] || "";
    const anyPrefixFullMatch = anyPrefixMatch?.[0] || "";

    // Build list of candidates to try (deduplicated)
    // Order matters: most specific first for faster matching
    const candidates = [...new Set([
      rawCode,                                    // SePay code field as-is
      rawCode.replace(/^DK/i, ""),                // Strip DK prefix
      rawCode.replace(/^(OF|SP|SE|HX)/i, ""),     // Strip any known prefix from rawCode
      dkFullMatch,                                // Full DK regex match (e.g. "DKsN7hvQbbCuGA")
      dkCode,                                     // After DK (e.g. "sN7hvQbbCuGA")
      dkCode.replace(/^DK/i, ""),                 // Strip double DK (old format)
      `DK${dkCode}`,                              // Reconstruct with DK prefix
      anyPrefixFullMatch,                         // Full match with OF/SP/SE/HX prefix
      anyPrefixCode,                              // After OF/SP/SE/HX prefix
      `${anyPrefixFullMatch.slice(0, 2)}${anyPrefixCode}`, // Preserve original 2-char prefix + code
      fullContent,                                // Full content as-is (fallback)
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
      // Alert admins so they can manually confirm
      alertPaymentFailure({
        source: "SePay",
        amount: transferAmount,
        content: fullContent,
        candidates,
        gateway,
      });
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
      const shortfall = (order.amount as number) - transferAmount;
      console.error(
        `[Sepay] ❌ UNDERPAYMENT: order=${matchedCode} expected=${order.amount}đ received=${transferAmount}đ shortfall=${shortfall}đ user=${order.user_id ?? "unknown"}`,
      );
      await supabase.from("orders").update({
        note: `Thiếu tiền: cần ${order.amount}đ, nhận ${transferAmount}đ`,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      // Alert admins about underpayment
      alertUnderpayment({
        orderCode: matchedCode,
        expected: order.amount as number,
        received: transferAmount,
        customerName: (order.customer_name as string) || "Unknown",
      });
      await logAudit({
        admin_id: "system",
        action: "order.underpaid" as any,
        target_type: "order",
        target_id: order.id as string,
        details: {
          order_code: matchedCode,
          expected_amount: order.amount,
          received_amount: transferAmount,
          shortfall,
          bank: gateway,
          sepay_ref: referenceCode,
          source: "sepay_webhook",
        },
      }).catch((err) => console.error("[SePay Webhook] Audit log error (non-critical):", err));
      return NextResponse.json({ success: true, message: "Amount mismatch" });
    }

    // 4. Cập nhật đơn hàng → PAID
    // Sepay transactionDate is Vietnam local time (UTC+7) WITHOUT timezone suffix.
    // Format: "2026-05-22 13:22:21" — always append +07:00 to convert correctly.
    // BUGFIX: Old regex /[Z+\-]\d{2}/ falsely matched "-05" in the DATE part "2026-05-22",
    // causing Vietnam time to be treated as UTC (7 hours off).
    let paidAt: string;
    try {
      if (transactionDate) {
        // Only detect timezone if it ends with Z, +HH:MM, or +HHMM pattern
        const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})\s*$/.test(transactionDate);
        const normalized = transactionDate.replace(" ", "T");
        const dateStr = hasTimezone ? normalized : normalized + "+07:00";
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

    // 4a.0 Auto-tạo user account nếu order chưa có user_id (khách CK trực tiếp
    //      mà chưa đăng ký). Sau khi tạo, gắn user_id vào order để các bước
    //      enrollment / progression / Zalo invite chạy được.
    if (!order.user_id && order.customer_email) {
      try {
        const email = String(order.customer_email).trim().toLowerCase();
        const fullName = (order.customer_name as string | null) || email.split("@")[0];
        const phone = (order.customer_phone as string | null) || null;

        // 1. Tìm xem user đã tồn tại chưa (trùng email)
        let existingUserId: string | null = null;
        try {
          const { data: existingByEmail } = await supabase
            .from("profiles")
            .select("id")
            .eq("email" as never, email)
            .maybeSingle();
          if (existingByEmail) existingUserId = (existingByEmail as { id: string }).id;
        } catch {
          /* table có thể chưa có cột email — bỏ qua */
        }

        if (!existingUserId) {
          // Tạo Supabase auth user mới — password random, user sẽ reset qua email
          const randomPassword = crypto.randomBytes(16).toString("hex");
          const { data: created, error: createErr } =
            await supabase.auth.admin.createUser({
              email,
              password: randomPassword,
              email_confirm: true, // không cần verify email
              user_metadata: { full_name: fullName, source: "sepay_auto_create" },
            });
          if (createErr) {
            console.warn(`[Sepay] Auto-create user error: ${createErr.message}`);
          } else if (created?.user) {
            existingUserId = created.user.id;
            // Tạo profile nếu trigger handle_new_user chưa lo
            await supabase.from("profiles").upsert({
              id: created.user.id,
              full_name: fullName,
              phone,
              role: "student",
            });

            // Sinh link đặt mật khẩu (Supabase recovery) — kèm redirect về
            // /reset-password để UI handle setting new password.
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
            let setPasswordLink = `${baseUrl}/forgot-password`;
            try {
              const { data: linkData } = await supabase.auth.admin.generateLink({
                type: "recovery",
                email,
                options: { redirectTo: `${baseUrl}/reset-password` },
              });
              if (linkData?.properties?.action_link) {
                setPasswordLink = linkData.properties.action_link;
              }
            } catch (linkErr) {
              console.warn("[Sepay] generateLink error:", linkErr);
            }

            // Gửi email welcome tự custom (AWS SES) — không phụ thuộc
            // Supabase email template config
            try {
              const { sendAutoAccountEmail } = await import("@/lib/email/transactional");
              const productName =
                ((order.products as Record<string, unknown> | null)?.title as string) ||
                ((order.products as Record<string, unknown> | null)?.name as string) ||
                "khoá học";
              await sendAutoAccountEmail(
                email,
                fullName,
                setPasswordLink,
                productName,
                matchedCode,
              );
              console.log(`[Sepay] ✅ Auto-created user ${email} + sent welcome email`);
            } catch (mailErr) {
              console.warn("[Sepay] sendAutoAccountEmail error:", mailErr);
            }
          }
        }

        // Gắn user_id vào order
        if (existingUserId) {
          await supabase
            .from("orders")
            .update({ user_id: existingUserId })
            .eq("id", order.id);
          (order as { user_id?: string }).user_id = existingUserId;
        }
      } catch (autoErr) {
        console.error("[Sepay] Auto-create user failed:", autoErr);
        // Không block flow — order vẫn paid, admin có thể tạo user thủ công
      }
    }

    // 4a. Cancel other pending orders for same user + product (prevents stale "Chờ thanh toán" showing)
    if (order.user_id && order.product_id) {
      const { data: cancelledOrders } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          note: `Auto-cancelled: payment confirmed on order ${matchedCode}`,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", order.user_id as string)
        .eq("product_id", order.product_id as string)
        .eq("status", "pending")
        .neq("id", order.id as string)
        .select("order_code");

      if (cancelledOrders && cancelledOrders.length > 0) {
        console.log(`[Sepay] 🗑 Cancelled ${cancelledOrders.length} duplicate pending order(s):`, cancelledOrders.map(o => o.order_code));
      }
    }

    // 4b. Handle subscription orders
    if (order.payment_method === "subscription" || (updatedOrder as Record<string, unknown>).payment_method === "subscription") {
      try {
        if (!process.env.INTERNAL_WEBHOOK_SECRET || process.env.INTERNAL_WEBHOOK_SECRET === 'change-me-to-a-random-secret') {
          console.error('[Sepay] INTERNAL_WEBHOOK_SECRET is not properly configured, skipping subscription confirm');
        } else {
          const confirmHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET}`,
          };
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
        }
      } catch (subErr) {
        console.error("[Sepay] Subscription confirm error:", subErr);
      }
    }

    // 4c. Physical/Mixed orders — tạo vận đơn GHN (best-effort, idempotent)
    //
    // BACKWARD COMPAT: nếu order.order_type không tồn tại (legacy course orders)
    // hoặc giá trị là 'course'/null → skip hoàn toàn, không đụng tới flow cũ.
    //
    // Idempotency: createShipment() đã có internal check trên shipments table,
    // nhưng ta vẫn check trước đây để tránh gọi không cần thiết khi webhook retry.
    const orderType = (order as Record<string, unknown>).order_type as string | null | undefined;
    if (orderType === "physical" || orderType === "mixed") {
      try {
        const { data: existingShipment } = await supabase
          .from("shipments")
          .select("id")
          .eq("order_id", order.id as string)
          .maybeSingle();

        if (existingShipment) {
          console.log(`[Sepay] Shipment đã tồn tại cho order ${matchedCode}, skip createShipment.`);
        } else {
          const { createShipment } = await import("@/lib/actions/shipping");
          const shipRes = await createShipment(order.id as string);
          if (shipRes.ok) {
            console.log(`[Sepay] 📦 Created shipment for ${matchedCode}:`, shipRes.carrierOrderCode);
          } else {
            console.warn(`[Sepay] ⚠️ createShipment failed (non-blocking) for ${matchedCode}:`, shipRes.error);
          }
        }
      } catch (shipErr) {
        // Best-effort: lỗi tạo shipment KHÔNG block payment confirmation.
        // Admin sẽ thấy order paid + shipping_status pending và xử lý thủ công.
        console.error(`[Sepay] createShipment threw (non-blocking) for ${matchedCode}:`, shipErr);
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

      // 7. Thêm XP mua hàng (idempotent — skip if already awarded for this order)
      const { count: existingXpCount } = await supabase
        .from("xp_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", order.user_id as string)
        .eq("action", "purchase")
        .contains("meta", { order_id: order.id });

      if (!existingXpCount || existingXpCount === 0) {
        await supabase.from("xp_events").insert({
          user_id: order.user_id,
          action: "purchase",
          xp_amount: 500,
          meta: { order_id: order.id, product_id: order.product_id },
        });
      } else {
        console.log(`[Sepay] XP already awarded for order ${order.id}, skipping`);
      }

      // 8. Gửi email xác nhận mua hàng
      // BACKWARD COMPAT: course-only orders → giữ nguyên flow cũ.
      // Physical/mixed → gửi thêm 1 email ngắn báo tracking sẽ đến sau.
      try {
        const { sendPurchaseConfirmation } = await import("@/lib/email/transactional");
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", order.user_id).single();
        const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id as string);
        if (authUser?.user?.email) {
          await sendPurchaseConfirmation(
            authUser.user.email,
            profile?.full_name || "bạn",
            products?.title as string || "Sản phẩm",
            order.amount as number,
            order.order_code as string,
          ).catch((err) => console.error("[SePay Webhook] Non-critical error:", err));

          // Physical/mixed: kèm thông báo tracking sẽ gửi sau
          if (orderType === "physical" || orderType === "mixed") {
            try {
              const { sendEmail } = await import("@/lib/email/ses");
              const fullName = profile?.full_name || "bạn";
              await sendEmail(
                authUser.user.email,
                `📦 Đơn hàng ${order.order_code} — thông tin vận chuyển`,
                `<div style="font-family:system-ui,-apple-system,sans-serif;color:#111;line-height:1.6;">
                  <p>Xin chào <strong>${fullName}</strong>,</p>
                  <p>Cảm ơn bạn đã đặt mua sản phẩm vật lý từ chúng tôi.</p>
                  <p><strong>Bạn sẽ nhận tracking sau khi đơn được giao cho carrier.</strong> Chúng tôi sẽ gửi mã vận đơn qua email ngay khi đơn vị vận chuyển nhận hàng.</p>
                  <p style="color:#6b7280;font-size:13px;">Mã đơn: <code>${order.order_code}</code></p>
                </div>`,
              ).catch((err) => console.error("[SePay Webhook] Shipping notice email error (non-critical):", err));
            } catch (mailErr) {
              console.warn("[Sepay] Shipping notice email failed (non-critical):", mailErr);
            }
          }
        }
      } catch {
        console.warn("[Sepay] Email confirmation failed (non-critical)");
      }

      // 8b. Gửi email chào mừng khoá học
      try {
        const { sendEnrollmentWelcomeEmail } = await import("@/lib/email/transactional");
        const { data: enrollProfile } = await supabase.from("profiles").select("full_name").eq("id", order.user_id).single();
        const { data: enrollAuth } = await supabase.auth.admin.getUserById(order.user_id as string);
        if (enrollAuth?.user?.email) {
          await sendEnrollmentWelcomeEmail(
            enrollAuth.user.email,
            enrollProfile?.full_name || "bạn",
            products?.title as string || "Khoá học",
            products?.slug as string || "",
          ).catch((err) => console.error("[SePay Webhook] Enrollment email error (non-critical):", err));
        }
      } catch {
        console.warn("[Sepay] Enrollment welcome email failed (non-critical)");
      }

      // 8c. Gửi thông báo Zalo OA
      try {
        const { notifyPurchaseViaZalo } = await import("@/lib/zalo-notifications");
        const { data: zaloProfile } = await supabase.from("profiles").select("full_name").eq("id", order.user_id).single();
        await notifyPurchaseViaZalo(
          order.user_id as string,
          zaloProfile?.full_name || "bạn",
          products?.title as string || "Sản phẩm",
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

          // Update affiliate stats atomically (prevents race condition with concurrent orders)
          await supabase.rpc("increment_affiliate_stats", {
            p_affiliate_id: affiliate.id,
            p_earned_amount: commissionAmount,
          });

          // Gửi email thông báo hoa hồng cho affiliate
          try {
            const { sendAffiliateCommissionEmail } = await import("@/lib/email/transactional");
            const { data: affProfile } = await supabase.from("profiles").select("full_name").eq("id", affiliate.user_id).single();
            const { data: affAuth } = await supabase.auth.admin.getUserById(affiliate.user_id);
            if (affAuth?.user?.email) {
              await sendAffiliateCommissionEmail(
                affAuth.user.email,
                affProfile?.full_name || "bạn",
                (order.products as Record<string, unknown>)?.title as string || "Sản phẩm",
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

    // 9b. Re-sync attribution sang crm_contacts + orders khi đã có purchase
    //     (orders.visitor_id đã được set ở register flow; helper sẽ cập nhật
     //     crm_contacts journey với purchase data đầy đủ).
    syncAttributionToConversion({
      visitorId: (order.visitor_id as string | null) || null,
      email: (order.customer_email as string | null) || null,
      orderId: order.id as string,
      fullName: (order.customer_name as string | null) || null,
      phone: (order.customer_phone as string | null) || null,
    }).catch(() => {});

    // 10. Facebook CAPI — Purchase event (server-side, non-blocking)
    try {
      const { data: purchaseProfile } = await supabase.from("profiles").select("full_name, phone").eq("id", order.user_id).single();
      const { data: purchaseAuth } = await supabase.auth.admin.getUserById(order.user_id as string);
      const products = order.products as Record<string, unknown> | null;

      // Lookup pixel config theo order.source (landing slug) hoặc product slug.
      // Nếu không tìm thấy hoặc không có CAPI token → fallback env vars.
      const sourceSlug = (order.source as string | null) || (products?.slug as string | null);
      let pixelOverride: { pixelId: string; accessToken: string; testEventCode: string | null } | undefined;
      if (sourceSlug) {
        const cfg = await getPixelConfigBySlug(sourceSlug);
        if (cfg?.capi_access_token) {
          pixelOverride = {
            pixelId: cfg.pixel_id,
            accessToken: cfg.capi_access_token,
            testEventCode: cfg.test_event_code,
          };
        }
      }

      trackPurchase({
        email: purchaseAuth?.user?.email || (order.customer_email as string) || "",
        phone: purchaseProfile?.phone || (order.customer_phone as string),
        name: purchaseProfile?.full_name || (order.customer_name as string),
        userId: order.user_id as string,
        value: transferAmount,
        currency: "VND",
        orderId: matchedCode,
        contentName: (products?.title as string) || (products?.name as string) || "Product",
        eventId: `purchase_${order.id}`,
        sourceUrl: products?.slug ? `https://dangkhuong.com/courses/${products.slug as string}` : "https://dangkhuong.com",
        config: pixelOverride,
      }).catch(() => {});
    } catch {
      // Purchase CAPI failure should never block webhook
    }

    console.log(`[Sepay] ✅ Đơn ${matchedCode} thanh toán thành công: ${transferAmount}đ`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[Sepay Webhook Error]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
