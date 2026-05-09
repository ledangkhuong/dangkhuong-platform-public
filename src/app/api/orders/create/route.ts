import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function generateOrderCode() {
  return "DK" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
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
      return NextResponse.json({
        error: "Không tìm thấy sản phẩm",
        detail: productError?.message
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

    // Tạo đơn hàng
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
    }).select().single();

    if (orderError) {
      console.error("[Create Order] Insert error:", orderError);
      return NextResponse.json({
        error: "Không thể tạo đơn hàng: " + orderError.message
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
        ? `https://qr.sepay.vn/img?bank=${bankCode}&acc=${bankAccount}&template=compact&amount=${order.amount}&des=DK${orderCode}`
        : null,
      manual: !hasSepay,
    };

    return NextResponse.json({ success: true, order, paymentInfo });
  } catch (err: unknown) {
    console.error("[Create Order] Unexpected:", err);
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
