import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { randomBytes } from "crypto";

/**
 * POST /api/cafe/register
 * Đăng ký tài khoản + tạo đơn hàng cho landing page /cafe
 * Body: { full_name, email, phone, password }
 *
 * QUAN TRỌNG: Admin cần tạo sản phẩm (khoá học) với slug "100-mo-hinh-kinh-doanh"
 * và giá 99000 trong trang admin trước khi landing page hoạt động.
 */

const CAFE_PRODUCT_SLUG = "tai-lieu-100-mo-hinh-kinh-doanh-san-pham-so-doanh-thu-1-trieu-do";

function generateOrderCode(prefix: string = "CF"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(12);
  let code = prefix;
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, email, phone, password, turnstile_token } = body;

    // Verify Turnstile CAPTCHA
    const turnstileOk = await verifyTurnstile(turnstile_token);
    if (!turnstileOk) {
      return NextResponse.json(
        { error: "Xác minh CAPTCHA thất bại. Vui lòng thử lại." },
        { status: 400 }
      );
    }

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
      console.error("[Cafe Register] Sign-up error:", signUpError);
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

    // 2. Update profile with phone
    await admin.from("profiles").upsert({
      id: userId,
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
    });

    // 3. Find the cafe product
    const { data: product } = await admin
      .from("products")
      .select("id, title, price, sale_price")
      .eq("slug", CAFE_PRODUCT_SLUG)
      .single();

    if (!product) {
      return NextResponse.json({
        success: true,
        registered: true,
        noProduct: true,
        message:
          "Tài khoản đã tạo thành công! Sản phẩm đang được cập nhật, vui lòng quay lại sau.",
      });
    }

    // 4. Create order
    const orderCode = generateOrderCode();
    const amount = product.sale_price || product.price || 99000;

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
      })
      .select()
      .single();

    if (orderError) {
      console.error("[Cafe Register] Order error:", orderError);
      return NextResponse.json(
        { error: "Lỗi tạo đơn hàng. Vui lòng thử lại sau." },
        { status: 500 }
      );
    }

    // 5. Generate payment info
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

    // 6. Award XP (only for new users)
    if (!isExistingUser) {
      try {
        await admin.from("xp_events").insert({
          user_id: userId,
          action: "register",
          xp_amount: 100,
          meta: { source: "cafe_landing" },
        });
      } catch {
        // Non-critical
      }
    }

    // 7. Send welcome email (only for new users)
    if (!isExistingUser) {
      try {
        const { sendWelcomeEmail } = await import("@/lib/email/resend");
        await sendWelcomeEmail(email.trim(), full_name.trim()).catch(() => {});
      } catch {
        // Email service not configured
      }
    }

    return NextResponse.json({ success: true, order, paymentInfo });
  } catch (err) {
    console.error("[Cafe Register Error]", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
