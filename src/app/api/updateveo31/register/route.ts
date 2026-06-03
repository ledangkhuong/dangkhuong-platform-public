import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";
import { validateCoupon, claimCoupon } from "@/lib/coupon-server";
import { syncUtmToContact } from "@/lib/utm-sync";
import { trackLead, trackInitiateCheckout } from "@/lib/facebook-capi";
import { getPixelConfigBySlug } from "@/lib/pixel-config";

/**
 * POST /api/updateveo31/register
 * Đăng ký tài khoản + tạo đơn hàng cho landing page /updateveo3.1
 * Body: { full_name, email, phone, password }
 */

const PRODUCT_SLUG = "update-veo3-1-thanh-gemini-omni-flash";
const PRODUCT_PRICE = 100000; // 100.000đ

function generateOrderCode(prefix: string = "OF", length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const maxValid = 256 - (256 % chars.length);
  let result = prefix;
  while (result.length < prefix.length + length) {
    const bytes = randomBytes(length - (result.length - prefix.length));
    for (const byte of bytes) {
      if (byte < maxValid && result.length < prefix.length + length) {
        result += chars[byte % chars.length];
      }
    }
  }
  return result;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`veo31-reg:${ip}`, 5, 600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const {
      full_name,
      email,
      phone,
      password,
      coupon_code,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      event_id_lead,
      event_id_initiate_checkout,
    } = body;


    if (!email?.trim())
      return NextResponse.json({ error: "Vui lòng nhập email" }, { status: 400 });
    if (!password)
      return NextResponse.json({ error: "Vui lòng nhập mật khẩu" }, { status: 400 });
    if (password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 8 ký tự" }, { status: 400 });
    }
    if (!full_name?.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập họ tên" }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập số điện thoại" }, { status: 400 });
    }

    if (phone?.trim()) {
      const cleanPhone = phone.trim().replace(/[\s\-().]/g, "");
      if (!/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/.test(cleanPhone)) {
        return NextResponse.json(
          { error: "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam." },
          { status: 400 }
        );
      }
    }

    const admin = await createAdminClient();

    let userId: string;
    let isExistingUser = false;

    const { data: signUpData, error: signUpError } =
      await admin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name?.trim() || "" },
      });

    const emailAlreadyExists =
      signUpError?.message?.includes("already registered") ||
      signUpError?.message?.includes("already been registered") ||
      (!signUpError &&
        (!signUpData?.user?.identities || signUpData.user.identities.length === 0));

    if (emailAlreadyExists) {
      const { createClient: createSupabase } = await import("@supabase/supabase-js");
      const authClient = createSupabase(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: signInData, error: signInError } =
        await authClient.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      if (signInError || !signInData.user) {
        return NextResponse.json(
          { error: "Email đã đăng ký. Sai mật khẩu — vui lòng nhập đúng mật khẩu tài khoản đã có." },
          { status: 401 }
        );
      }
      userId = signInData.user.id;
      isExistingUser = true;
    } else if (signUpError) {
      console.error("[Veo31 Register] Signup error:", signUpError);
      return NextResponse.json(
        { error: "Không thể tạo tài khoản. Vui lòng thử lại sau." },
        { status: 400 }
      );
    } else {
      if (!signUpData.user?.id) {
        return NextResponse.json({ error: "Không thể tạo tài khoản" }, { status: 500 });
      }
      userId = signUpData.user.id;
    }

    // Profile handling
    if (isExistingUser) {
      const { data: currentProfile } = await admin
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .maybeSingle();

      const patch: Record<string, string | null> = {};
      if (!currentProfile?.full_name && full_name?.trim()) patch.full_name = full_name.trim();
      if (!currentProfile?.phone && phone?.trim()) patch.phone = phone.trim();
      if (Object.keys(patch).length > 0) {
        await admin.from("profiles").update(patch).eq("id", userId);
      }
    } else {
      await admin.from("profiles").upsert({
        id: userId,
        full_name: full_name?.trim() || "",
        phone: phone?.trim() || null,
      });
    }

    // Find product
    const { data: product } = await admin
      .from("products")
      .select("id, title, price, sale_price")
      .eq("slug", PRODUCT_SLUG)
      .single();

    const baseAmount = product?.sale_price || product?.price || PRODUCT_PRICE;
    const productTitle = product?.title || "Update VEO 3.1 → Gemini Omni Flash";

    const orderCode = generateOrderCode();

    let finalAmount = baseAmount;
    let couponResult: Awaited<ReturnType<typeof validateCoupon>> | null = null;

    if (coupon_code?.trim()) {
      couponResult = await validateCoupon(admin, coupon_code.trim(), baseAmount);
      if (!couponResult.valid) {
        return NextResponse.json({ error: couponResult.error }, { status: 400 });
      }
      finalAmount = couponResult.final_amount!;
    }

    let refCode = req.cookies.get("dk_ref")?.value?.toUpperCase() || null;
    if (refCode) {
      const { data: affiliate } = await admin
        .from("affiliates")
        .select("user_id")
        .eq("ref_code", refCode)
        .eq("status", "active")
        .single();
      if (affiliate?.user_id === userId) refCode = null;
    }

    // Fallback to stored profile for returning users
    let orderName = full_name?.trim() || "";
    let orderPhone = phone?.trim() || null;
    if (isExistingUser && (!orderName || !orderPhone)) {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .maybeSingle();
      if (!orderName && profile?.full_name) orderName = profile.full_name;
      if (!orderPhone && profile?.phone) orderPhone = profile.phone;
    }

    const orderData: Record<string, unknown> = {
      order_code: orderCode,
      user_id: userId,
      amount: finalAmount,
      status: finalAmount === 0 ? "paid" : "pending",
      payment_method: "bank_transfer",
      customer_name: orderName,
      customer_email: email.trim(),
      customer_phone: orderPhone,
      ref_code: refCode,
    };
    if (coupon_code?.trim()) {
      orderData.coupon_code = coupon_code.trim().toUpperCase();
    }
    orderData.utm_source = utm_source || "direct";
    orderData.utm_medium = utm_medium || "none";
    if (utm_campaign) orderData.utm_campaign = utm_campaign;

    if (product?.id) {
      orderData.product_id = product.id;
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error("[Veo31 Register] Order error:", orderError);
      return NextResponse.json(
        { error: "Lỗi tạo đơn hàng. Vui lòng thử lại sau." },
        { status: 500 }
      );
    }

    // Claim coupon after order created
    if (couponResult?.valid && couponResult.coupon_id && order?.id) {
      await claimCoupon(admin, couponResult.coupon_id, userId, order.id).catch(() => {});
    }

    // If coupon makes it free -> auto-enroll
    if (finalAmount === 0 && order?.id && product?.id) {
      await admin.from("enrollments").upsert({
        user_id: userId,
        product_id: product.id,
        order_id: order.id,
        source: "purchase",
      }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
    }

    // Facebook CAPI — Lead + InitiateCheckout (server-side, non-blocking).
    // Dedup: ưu tiên eventId do client gửi (đã fire Pixel với cùng id);
    // fallback deterministic theo order.id để retry không nhân đôi.
    if (order?.id) {
      const pixelConfig = await getPixelConfigBySlug("updateveo31");
      const pixelOverride = pixelConfig?.capi_access_token
        ? {
            pixelId: pixelConfig.pixel_id,
            accessToken: pixelConfig.capi_access_token,
            testEventCode: pixelConfig.test_event_code,
          }
        : undefined;

      const capiBase = {
        email: email.trim(),
        phone: orderPhone || undefined,
        name: orderName || undefined,
        ip,
        userAgent: req.headers.get("user-agent") || undefined,
        fbc: req.cookies.get("_fbc")?.value,
        fbp: req.cookies.get("_fbp")?.value,
        userId,
        sourceUrl: "https://dangkhuong.com/updateveo3.1",
        config: pixelOverride,
      };

      trackLead({
        ...capiBase,
        value: finalAmount,
        currency: "VND",
        eventId:
          (typeof event_id_lead === "string" && event_id_lead.trim()) ||
          `lead_${order.id}`,
      }).catch(() => {});

      trackInitiateCheckout({
        ...capiBase,
        value: finalAmount,
        currency: "VND",
        contentName: productTitle,
        eventId:
          (typeof event_id_initiate_checkout === "string" &&
            event_id_initiate_checkout.trim()) ||
          `checkout_${order.id}`,
      }).catch(() => {});
    }

    const bankAccount = process.env.SEPAY_BANK_ACCOUNT;
    const bankCode = process.env.SEPAY_BANK_CODE;
    const hasSepay = bankAccount && bankCode && !bankAccount.includes("your-");

    const amount = finalAmount;
    const paymentInfo = {
      order_code: orderCode,
      amount,
      bank_account: hasSepay ? bankAccount : null,
      bank_code: hasSepay ? bankCode : null,
      transfer_content: `DK${orderCode}`,
      qr_url: hasSepay
        ? `/api/qr?bank=${bankCode}&acc=${bankAccount}&amount=${amount}&des=DK${orderCode}`
        : null,
    };

    if (!isExistingUser) {
      try {
        await admin.from("xp_events").insert({
          user_id: userId,
          action: "register",
          xp_amount: 100,
          meta: { source: "updateveo31_landing" },
        });
      } catch { /* Non-critical */ }
    }

    try {
      const { data: existingSub } = await admin
        .from("subscribers")
        .select("id")
        .eq("email", email.trim())
        .single();

      if (!existingSub) {
        await admin.from("subscribers").insert({
          email: email.trim(),
          full_name: full_name?.trim() || "",
          status: "active",
          source: "updateveo31_landing",
        });
      }
    } catch { /* Non-critical */ }

    // Sync UTM to crm_contacts
    await syncUtmToContact(admin, userId, orderName, email.trim(), orderPhone, {
      utm_source: utm_source || "direct",
      utm_medium: utm_medium || "none",
      utm_campaign,
    });

    if (!isExistingUser) {
      try {
        const { sendWelcomeEmail } = await import("@/lib/email/transactional");
        await sendWelcomeEmail(email.trim(), full_name.trim()).catch(() => {});
      } catch { /* Email service not configured */ }
    }

    return NextResponse.json({
      success: true,
      order,
      paymentInfo,
      productName: productTitle,
      coupon: couponResult?.valid ? {
        code: coupon_code?.trim().toUpperCase(),
        discount_amount: couponResult.discount_amount,
        original_amount: baseAmount,
      } : null,
    });
  } catch (err) {
    console.error("[Veo31 Register Error]", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
