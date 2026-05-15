import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * POST /api/slowenglish/register
 * Đăng ký tài khoản + tạo đơn hàng cho landing page /slowenglish
 * Body: { full_name, email, phone, password, package: "standard" | "ultra" }
 */

const PRODUCT_SLUGS: Record<string, string> = {
  standard: "standard-lam-video-youtube-slow-english-bang-veo3-1",
  ultra: "ultra-dong-hanh-lam-video-youtube-slow-english-bang-veo3-1",
};

function generateOrderCode() {
  return (
    "DK" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 5).toUpperCase()
  );
}

export async function POST(req: NextRequest) {
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
    if (!password || password.length < 6)
      return NextResponse.json({ error: "Mật khẩu tối thiểu 6 ký tự" }, { status: 400 });
    if (!pkg || !PRODUCT_SLUGS[pkg])
      return NextResponse.json({ error: "Vui lòng chọn gói học" }, { status: 400 });

    const admin = await createAdminClient();

    // 1. Create user
    const { data: signUpData, error: signUpError } =
      await admin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim() },
      });

    if (signUpError) {
      if (
        signUpError.message.includes("already registered") ||
        signUpError.message.includes("already been registered")
      ) {
        return NextResponse.json(
          { error: "Email đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Không thể tạo tài khoản" }, { status: 500 });
    }

    // Supabase anti-enumeration: empty identities = email already exists
    if (!signUpData.user?.identities || signUpData.user.identities.length === 0) {
      return NextResponse.json(
        { error: "Email đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác." },
        { status: 409 }
      );
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
    const refCode = req.cookies.get("dk_ref")?.value?.toUpperCase() || null;

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
        { error: "Lỗi tạo đơn hàng: " + orderError.message },
        { status: 500 }
      );
    }

    // 5. Payment info
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

    // 6. Award XP
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

    // 7. Send welcome email
    try {
      const { sendWelcomeEmail } = await import("@/lib/email/resend");
      await sendWelcomeEmail(email.trim(), full_name.trim()).catch(() => {});
    } catch {
      // Email service not configured
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
