import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

// Generate a cryptographically random order code
// Format: DK + 12 random alphanumeric chars (e.g., "DKa3Bf9Kx2Mn")
// This gives 62^12 ≈ 3.2 × 10^21 possible codes - practically unguessable
function generateOrderCode(prefix: string = "DK"): string {
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { product_id, customer_name, customer_email, customer_phone } = body;

    if (!product_id) {
      return NextResponse.json({ error: "Thiếu product_id" }, { status: 400 });
    }

    // Lấy thông tin sản phẩm (dùng admin client để tránh RLS issues)
    const admin = await createAdminClient();

    const { data: product, error: productError } = await admin
      .from("products").select("*").eq("id", product_id).single();

    if (productError || !product) {
      console.error("[Create Order] Product lookup error:", productError?.message);
      return NextResponse.json({
        error: "Không tìm thấy sản phẩm"
      }, { status: 404 });
    }

    // Nếu miễn phí → enroll ngay
    if (product.price === 0) {
      await admin.from("enrollments").upsert({
        user_id: user.id,
        product_id,
        source: "free"
      }, { onConflict: "user_id,product_id" });
      return NextResponse.json({ success: true, free: true });
    }

    const orderCode = generateOrderCode();
    const amount = product.sale_price || product.price;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Sản phẩm không có giá hợp lệ" }, { status: 400 });
    }

    // Đọc affiliate ref_code từ cookie dk_ref
    let refCode = req.cookies.get("dk_ref")?.value?.toUpperCase() || null;

    // Prevent self-referral
    if (refCode) {
      const { data: affiliate } = await admin
        .from("affiliates")
        .select("user_id")
        .eq("ref_code", refCode)
        .eq("status", "active")
        .single();
      if (affiliate?.user_id === user.id) {
        refCode = null; // Don't allow self-referral
      }
    }

    // Tạo đơn hàng (kèm ref_code nếu có)
    const { data: order, error: orderError } = await admin.from("orders").insert({
      order_code: orderCode,
      user_id: user.id,
      product_id,
      amount,
      status: "pending",
      payment_method: "bank_transfer",
      customer_name: customer_name || user.email,
      customer_email: customer_email || user.email,
      customer_phone: customer_phone || null,
      ref_code: refCode,
    }).select().single();

    if (orderError) {
      console.error("[Create Order] Insert error:", orderError.message);
      return NextResponse.json({
        error: "Không thể tạo đơn hàng. Vui lòng thử lại."
      }, { status: 500 });
    }

    // Thông tin thanh toán
    const bankAccount = process.env.SEPAY_BANK_ACCOUNT;
    const bankCode = process.env.SEPAY_BANK_CODE;
    const hasSepay = bankAccount && bankCode && !bankAccount.includes("your-");

    const paymentInfo = {
      order_code: orderCode,
      amount: order.amount,
      bank_account: hasSepay ? bankAccount : null,
      bank_code: hasSepay ? bankCode : null,
      transfer_content: `DK${orderCode}`,
      qr_url: hasSepay
        ? `/api/qr?bank=${bankCode}&acc=${bankAccount}&amount=${order.amount}&des=DK${orderCode}`
        : null,
      manual: !hasSepay,
    };

    return NextResponse.json({ success: true, order, paymentInfo });
  } catch (err: unknown) {
    console.error("[Create Order] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Không thể tạo đơn hàng. Vui lòng thử lại." }, { status: 500 });
  }
}
