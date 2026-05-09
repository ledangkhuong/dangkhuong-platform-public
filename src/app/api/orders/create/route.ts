import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Tạo mã đơn hàng ngẫu nhiên
function generateOrderCode() {
  return "DK" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { product_id, customer_name, customer_email, customer_phone } = await req.json();

    // Lấy thông tin sản phẩm
    const { data: product } = await supabase
      .from("products").select("*").eq("id", product_id).single();
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Nếu miễn phí → enroll ngay
    if (product.price === 0) {
      await supabase.from("enrollments").upsert({ user_id: user.id, product_id, source: "free" });
      return NextResponse.json({ success: true, free: true });
    }

    const orderCode = generateOrderCode();
    const admin = await createAdminClient();

    // Tạo đơn hàng
    const { data: order, error } = await admin.from("orders").insert({
      order_code: orderCode,
      user_id: user.id,
      product_id,
      amount: product.sale_price || product.price,
      status: "pending",
      payment_method: "sepay",
      customer_name: customer_name || user.email,
      customer_email: customer_email || user.email,
      customer_phone,
    }).select().single();

    if (error) throw error;

    // Thông tin thanh toán Sepay (QR chuyển khoản)
    const paymentInfo = {
      order_code: orderCode,
      amount: order.amount,
      bank_account: process.env.SEPAY_BANK_ACCOUNT,
      bank_code: process.env.SEPAY_BANK_CODE,
      transfer_content: `DK ${orderCode}`,
      // QR code URL từ Sepay
      qr_url: `https://qr.sepay.vn/img?bank=${process.env.SEPAY_BANK_CODE}&acc=${process.env.SEPAY_BANK_ACCOUNT}&template=compact&amount=${order.amount}&des=DK${orderCode}`,
    };

    return NextResponse.json({ success: true, order, paymentInfo });
  } catch (err) {
    console.error("[Create Order]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
