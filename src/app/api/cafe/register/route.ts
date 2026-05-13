import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/cafe/register
 * Đăng ký tài khoản + tạo đơn hàng cho landing page /cafe
 * Body: { full_name, email, phone, password }
 *
 * QUAN TRỌNG: Admin cần tạo sản phẩm (khoá học) với slug "100-mo-hinh-kinh-doanh"
 * và giá 99000 trong trang admin trước khi landing page hoạt động.
 */

const CAFE_PRODUCT_SLUG = "tai-lieu-100-mo-hinh-kinh-doanh-san-pham-so-doanh-thu-1-trieu-do";

function generateOrderCode() {
  return (
    "DK" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 5).toUpperCase()
  );
}

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, phone, password } = await req.json();

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

    const supabase = await createClient();
    const admin = await createAdminClient();

    // 1. Create user via admin API (no Supabase email sent)
    const { data: signUpData, error: signUpError } =
      await admin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim() },
      });

    if (signUpError) {
      // Handle already registered
      if (
        signUpError.message.includes("already registered") ||
        signUpError.message.includes("already been registered")
      ) {
        return NextResponse.json(
          {
            error:
              "Email đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      );
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Không thể tạo tài khoản" },
        { status: 500 }
      );
    }

    // Supabase returns fake user with empty identities when email already exists
    // (anti-enumeration behavior with email confirmation enabled)
    if (
      !signUpData.user?.identities ||
      signUpData.user.identities.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Email đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.",
        },
        { status: 409 }
      );
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
        { error: "Lỗi tạo đơn hàng: " + orderError.message },
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

    // 6. Award XP for registration
    try {
      await admin.from("xp_events").insert({
        user_id: userId,
        action: "register",
        xp_amount: 100,
        meta: { source: "cafe_landing" },
      });
    } catch {
      // XP insert failed — non-critical, continue
    }

    // 7. Send welcome email
    try {
      const { sendWelcomeEmail } = await import("@/lib/email/resend");
      await sendWelcomeEmail(email.trim(), full_name.trim()).catch(() => {});
    } catch {
      // Email service not configured — skip
    }

    return NextResponse.json({ success: true, order, paymentInfo });
  } catch (err) {
    console.error("[Cafe Register Error]", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
