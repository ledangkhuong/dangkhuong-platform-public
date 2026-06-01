import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";
import { validateCoupon, claimCoupon } from "@/lib/coupon-server";

/**
 * POST /api/geminipro/register
 * Đăng ký tài khoản + tạo đơn hàng cho landing page /tang4thanggeminipro
 * Body: { full_name, email, phone, password }
 */

const PRODUCT_SLUG = "google-tang-4-thang-gemini-pro-tri-gia-hon-2-trieu";
const PRODUCT_PRICE = 0; // Miễn phí

function generateOrderCode(prefix: string = "GP", length = 12): string {
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
  const rl = await rateLimit(`geminipro-reg:${ip}`, 5, 600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const { full_name, email, phone, password, coupon_code, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = body;


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
      console.error("[GeminiPro Register] Signup error:", signUpError);
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
    const productTitle = product?.title || "Google Tặng 4 Tháng Gemini Pro";

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

    const isFree = finalAmount === 0;
    const orderData: Record<string, unknown> = {
      order_code: orderCode,
      user_id: userId,
      amount: finalAmount,
      status: isFree ? "paid" : "pending",
      payment_method: isFree ? "free" : "bank_transfer",
      customer_name: orderName,
      customer_email: email.trim(),
      customer_phone: orderPhone,
      ref_code: refCode,
      ...(isFree ? { paid_at: new Date().toISOString() } : {}),
    };
    if (coupon_code?.trim()) {
      orderData.coupon_code = coupon_code.trim().toUpperCase();
    }
    if (utm_source) orderData.utm_source = utm_source;
    if (utm_medium) orderData.utm_medium = utm_medium;
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
      console.error("[GeminiPro Register] Order error:", orderError);
      return NextResponse.json(
        { error: "Lỗi tạo đơn hàng. Vui lòng thử lại sau." },
        { status: 500 }
      );
    }

    // Claim coupon after order created
    if (couponResult?.valid && couponResult.coupon_id && order?.id) {
      await claimCoupon(admin, couponResult.coupon_id, userId, order.id).catch(() => {});
    }

    // If free (product free or coupon) -> auto-enroll
    if (isFree && order?.id && product?.id) {
      await admin.from("enrollments").upsert({
        user_id: userId,
        product_id: product.id,
        order_id: order.id,
        source: "purchase",
      }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
    }

    if (!isExistingUser) {
      try {
        await admin.from("xp_events").insert({
          user_id: userId,
          action: "register",
          xp_amount: 100,
          meta: { source: "geminipro_landing" },
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
          source: "geminipro_landing",
        });
      }
    } catch { /* Non-critical */ }

    if (!isExistingUser) {
      try {
        const { sendWelcomeEmail } = await import("@/lib/email/transactional");
        await sendWelcomeEmail(email.trim(), full_name.trim()).catch(() => {});
      } catch { /* Email service not configured */ }
    }

    return NextResponse.json({
      success: true,
      order,
      productName: productTitle,
      coupon: couponResult?.valid ? {
        code: coupon_code?.trim().toUpperCase(),
        discount_amount: couponResult.discount_amount,
        original_amount: baseAmount,
      } : null,
    });
  } catch (err) {
    console.error("[GeminiPro Register Error]", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
