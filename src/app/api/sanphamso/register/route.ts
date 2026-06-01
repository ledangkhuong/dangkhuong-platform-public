import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";
import { validateCoupon, claimCoupon } from "@/lib/coupon-server";

/**
 * POST /api/sanphamso/register
 * Đăng ký tài khoản + tạo đơn hàng cho landing page /sanphamso
 * Body: { full_name, email, phone, password }
 */

const PRODUCT_SLUG = "con-duong-kiem-tien-tu-san-pham-so-2026";
const PRODUCT_PRICE = 100000; // 100K VND

function generateOrderCode(prefix: string = "SP", length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const maxValid = 256 - (256 % chars.length); // reject values >= this to avoid modulo bias
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
  // Rate limit: 5 registrations per IP per 10 minutes
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`sanphamso-reg:${ip}`, 5, 600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const { full_name, email, phone, password, coupon_code, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = body;


    // Validate
    if (!full_name?.trim())
      return NextResponse.json(
        { error: "Vui lòng nhập họ tên" },
        { status: 400 }
      );
    if (!email?.trim())
      return NextResponse.json(
        { error: "Vui lòng nhập email" },
        { status: 400 }
      );
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 8 ký tự" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // 1. Try to create user
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
        (!signUpData?.user?.identities ||
          signUpData.user.identities.length === 0));

    if (emailAlreadyExists) {
      // Existing user — verify password and create order for them
      const { createClient: createSupabase } = await import(
        "@supabase/supabase-js"
      );
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
          {
            error:
              "Email đã đăng ký. Sai mật khẩu — vui lòng nhập đúng mật khẩu tài khoản đã có.",
          },
          { status: 401 }
        );
      }
      userId = signInData.user.id;
      isExistingUser = true;
    } else if (signUpError) {
      console.error("[SanPhamSo Register] Signup error:", signUpError);
      return NextResponse.json(
        { error: "Không thể tạo tài khoản. Vui lòng thử lại sau." },
        { status: 400 }
      );
    } else {
      if (!signUpData.user?.id) {
        return NextResponse.json(
          { error: "Không thể tạo tài khoản" },
          { status: 500 }
        );
      }
      userId = signUpData.user.id;
    }

    // 2. Update profile
    await admin.from("profiles").upsert({
      id: userId,
      full_name: full_name?.trim() || "",
      phone: phone?.trim() || null,
    });

    // 3. Find the product (or use default price)
    const { data: product } = await admin
      .from("products")
      .select("id, title, price, sale_price")
      .eq("slug", PRODUCT_SLUG)
      .single();

    const baseAmount = product?.sale_price || product?.price || PRODUCT_PRICE;
    const productTitle =
      product?.title || "Lộ Trình Kiếm Tiền Từ Sản Phẩm Số 2026";

    // 4. Create order
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

    // Read affiliate ref_code from cookie
    let refCode = req.cookies.get("dk_ref")?.value?.toUpperCase() || null;

    // Prevent self-referral
    if (refCode) {
      const { data: affiliate } = await admin
        .from("affiliates")
        .select("user_id")
        .eq("ref_code", refCode)
        .eq("status", "active")
        .single();
      if (affiliate?.user_id === userId) {
        refCode = null; // Don't allow self-referral
      }
    }

    const orderData: Record<string, unknown> = {
      order_code: orderCode,
      user_id: userId,
      amount: finalAmount,
      status: finalAmount === 0 ? "paid" : "pending",
      payment_method: "bank_transfer",
      customer_name: full_name.trim(),
      customer_email: email.trim(),
      customer_phone: phone?.trim() || null,
      ref_code: refCode,
    };
    if (coupon_code?.trim()) {
      orderData.coupon_code = coupon_code.trim().toUpperCase();
    }
    if (utm_source) orderData.utm_source = utm_source;
    if (utm_medium) orderData.utm_medium = utm_medium;
    if (utm_campaign) orderData.utm_campaign = utm_campaign;

    // Only set product_id if product exists in DB
    if (product?.id) {
      orderData.product_id = product.id;
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error("[SanPhamSo Register] Order error:", orderError);
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

    // 5. Payment info
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

    // 6. Award XP (only for new users)
    if (!isExistingUser) {
      try {
        await admin.from("xp_events").insert({
          user_id: userId,
          action: "register",
          xp_amount: 100,
          meta: { source: "sanphamso_landing" },
        });
      } catch {
        // Non-critical
      }
    }

    // 7. Add to subscribers list
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
          source: "sanphamso_landing",
        });
      }
    } catch {
      // Non-critical
    }

    // 8. Send welcome email (only for new users)
    if (!isExistingUser) {
      try {
        const { sendWelcomeEmail } = await import("@/lib/email/transactional");
        await sendWelcomeEmail(email.trim(), full_name.trim()).catch(() => {});
      } catch {
        // Email service not configured
      }
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
    console.error("[SanPhamSo Register Error]", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
