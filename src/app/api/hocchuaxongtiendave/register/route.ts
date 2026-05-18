import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

/**
 * POST /api/hocchuaxongtiendave/register
 * Đăng ký tài khoản + tạo đơn hàng cho landing page /hocchuaxongtiendave
 * Body: { full_name, email, phone, password, turnstile_token }
 */

const PRODUCT_SLUG = "hoc-chua-xong-tien-da-ve";
const PRODUCT_PRICE = 5000000; // 5.000.000đ — Early Bird

function generateOrderCode(prefix: string = "HC", length = 12): string {
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
  const rl = await rateLimit(`hcxtdv-reg:${ip}`, 5, 600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const { full_name, email, phone, password, turnstile_token } = body;

    const turnstileOk = await verifyTurnstile(turnstile_token);
    if (!turnstileOk) {
      return NextResponse.json(
        { error: "Xác minh CAPTCHA thất bại. Vui lòng thử lại." },
        { status: 400 }
      );
    }

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
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 1 chữ hoa" },
        { status: 400 }
      );
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 1 chữ thường" },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 1 số" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

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
      console.error("[HocChuaXong Register] Signup error:", signUpError);
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

    await admin.from("profiles").upsert({
      id: userId,
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
    });

    const { data: product } = await admin
      .from("products")
      .select("id, title, price, sale_price")
      .eq("slug", PRODUCT_SLUG)
      .single();

    const amount = product?.sale_price || product?.price || PRODUCT_PRICE;
    const productTitle =
      product?.title || "Học Chưa Xong - Tiền Đã Về";

    const orderCode = generateOrderCode();

    let refCode = req.cookies.get("dk_ref")?.value?.toUpperCase() || null;

    if (refCode) {
      const { data: affiliate } = await admin
        .from("affiliates")
        .select("user_id")
        .eq("ref_code", refCode)
        .eq("status", "active")
        .single();
      if (affiliate?.user_id === userId) {
        refCode = null;
      }
    }

    const orderData: Record<string, unknown> = {
      order_code: orderCode,
      user_id: userId,
      amount,
      status: "pending",
      payment_method: "bank_transfer",
      customer_name: full_name.trim(),
      customer_email: email.trim(),
      customer_phone: phone?.trim() || null,
      ref_code: refCode,
    };

    if (product?.id) {
      orderData.product_id = product.id;
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error("[HocChuaXong Register] Order error:", orderError);
      return NextResponse.json(
        { error: "Lỗi tạo đơn hàng. Vui lòng thử lại sau." },
        { status: 500 }
      );
    }

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

    if (!isExistingUser) {
      try {
        await admin.from("xp_events").insert({
          user_id: userId,
          action: "register",
          xp_amount: 100,
          meta: { source: "hocchuaxongtiendave_landing" },
        });
      } catch {
        // Non-critical
      }
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
          full_name: full_name.trim(),
          status: "active",
          source: "hocchuaxongtiendave_landing",
        });
      }
    } catch {
      // Non-critical
    }

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
    });
  } catch (err) {
    console.error("[HocChuaXong Register Error]", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
