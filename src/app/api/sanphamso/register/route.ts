import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * POST /api/sanphamso/register
 * Đăng ký tài khoản + tạo đơn hàng cho landing page /sanphamso
 * Body: { full_name, email, phone, password, turnstile_token }
 */

const PRODUCT_SLUG = "con-duong-kiem-tien-tu-san-pham-so-2026";
const PRODUCT_PRICE = 100000; // 100K VND

function generateOrderCode() {
  return (
    "SP" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 5).toUpperCase()
  );
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
    if (!password || password.length < 6)
      return NextResponse.json(
        { error: "Mật khẩu tối thiểu 6 ký tự" },
        { status: 400 }
      );

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
      return NextResponse.json(
        { error: signUpError.message },
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
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
    });

    // 3. Find the product (or use default price)
    const { data: product } = await admin
      .from("products")
      .select("id, title, price, sale_price")
      .eq("slug", PRODUCT_SLUG)
      .single();

    const amount = product?.sale_price || product?.price || PRODUCT_PRICE;
    const productTitle =
      product?.title || "Lộ Trình Kiếm Tiền Từ Sản Phẩm Số 2026";

    // 4. Create order
    const orderCode = generateOrderCode();

    // Read affiliate ref_code from cookie
    const refCode = req.cookies.get("dk_ref")?.value?.toUpperCase() || null;

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
          full_name: full_name.trim(),
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
        const { sendWelcomeEmail } = await import("@/lib/email/resend");
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
    console.error("[SanPhamSo Register Error]", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
