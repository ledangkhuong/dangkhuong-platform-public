import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";
import { trackLead, trackInitiateCheckout } from "@/lib/facebook-capi";

/**
 * POST /api/slowenglish/register
 * Đăng ký tài khoản + tạo đơn hàng cho landing page /slowenglish
 * Body: { full_name, email, phone, password, package: "standard" | "ultra" }
 */

const PRODUCT_SLUGS: Record<string, string> = {
  standard: "standard-lam-video-youtube-slow-english-bang-veo3-1",
  ultra: "ultra-dong-hanh-lam-video-youtube-slow-english-bang-veo3-1",
};

function generateOrderCode(prefix: string = "SE", length = 12): string {
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
  const rl = await rateLimit(`sloweng-reg:${ip}`, 5, 600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const { full_name, email, phone, password, turnstile_token } = body;
    const pkg = body.package as string;

    // Verify Turnstile CAPTCHA
    const turnstileOk = await verifyTurnstile(turnstile_token);
    if (!turnstileOk) {
      return NextResponse.json({ error: "Xác minh CAPTCHA thất bại. Vui lòng thử lại." }, { status: 400 });
    }

    // Validate
    if (!full_name?.trim())
      return NextResponse.json({ error: "Vui lòng nhập họ tên" }, { status: 400 });
    if (!email?.trim())
      return NextResponse.json({ error: "Vui lòng nhập email" }, { status: 400 });
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 8 ký tự" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 1 chữ hoa" }, { status: 400 });
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 1 chữ thường" }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 1 số" }, { status: 400 });
    }
    if (!pkg || !PRODUCT_SLUGS[pkg])
      return NextResponse.json({ error: "Vui lòng chọn gói học" }, { status: 400 });

    const admin = await createAdminClient();

    // 1. Try to create user
    let userId: string;
    let isExistingUser = false;

    const { data: signUpData, error: signUpError } =
      await admin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim() },
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
      return NextResponse.json({ error: "Không thể tạo tài khoản. Vui lòng thử lại." }, { status: 400 });
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
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
    });

    // 3. Find the product
    const slug = PRODUCT_SLUGS[pkg];
    const { data: product } = await admin
      .from("products")
      .select("id, title, price, sale_price")
      .eq("slug", slug)
      .single();

    if (!product) {
      return NextResponse.json({
        success: true,
        registered: true,
        noProduct: true,
        message: "Tài khoản đã tạo thành công! Khoá học đang được cập nhật.",
      });
    }

    // 4. Create order
    const orderCode = generateOrderCode();
    const amount = product.sale_price || product.price;

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

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        order_code: orderCode,
        user_id: userId,
        product_id: product.id,
        amount,
        status: "pending",
        payment_method: "bank_transfer",
        customer_name: full_name.trim(),
        customer_email: email.trim(),
        customer_phone: phone?.trim() || null,
        ref_code: refCode,
      })
      .select()
      .single();

    if (orderError) {
      console.error("[SlowEnglish Register] Order error:", orderError);
      return NextResponse.json(
        { error: "Lỗi tạo đơn hàng. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    // 5. Facebook CAPI — Lead + InitiateCheckout (server-side, non-blocking)
    {
      const capiBase = {
        email: email.trim(),
        phone: phone?.trim(),
        name: full_name.trim(),
        ip,
        userAgent: req.headers.get("user-agent") || undefined,
        fbc: req.cookies.get("_fbc")?.value,
        fbp: req.cookies.get("_fbp")?.value,
        userId: userId,
        sourceUrl: "https://dangkhuong.com/slowenglish",
      };

      // Lead event — user submitted the registration form
      trackLead({
        ...capiBase,
        value: amount,
        currency: "VND",
        eventId: `lead_${order.id}`,
      }).catch(() => {});

      // InitiateCheckout — order created, payment pending
      trackInitiateCheckout({
        ...capiBase,
        value: amount,
        currency: "VND",
        contentName: product.title,
        eventId: `checkout_${order.id}`,
      }).catch(() => {});
    }

    // 7. Payment info
    const bankAccount = process.env.SEPAY_BANK_ACCOUNT;
    const bankCode = process.env.SEPAY_BANK_CODE;
    const hasSepay = bankAccount && bankCode && !bankAccount.includes("your-");

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

    // 8. Award XP (only for new users)
    if (!isExistingUser) {
      try {
        await admin.from("xp_events").insert({
          user_id: userId,
          action: "register",
          xp_amount: 100,
          meta: { source: "slowenglish_landing" },
        });
      } catch {
        // Non-critical
      }
    }

    // 9. Send welcome email (only for new users)
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
      productName: product.title,
    });
  } catch (err) {
    console.error("[SlowEnglish Register Error]", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
