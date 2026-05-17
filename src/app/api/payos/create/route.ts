import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { isPayOSConfigured, createPaymentLink, generatePayOSOrderCode } from "@/lib/payos";

/**
 * POST /api/payos/create
 *
 * Tạo link thanh toán PayOS cho đơn hàng đang ở trạng thái "pending".
 * Yêu cầu: user đã đăng nhập, đơn hàng tồn tại và thuộc về user.
 *
 * Body: { order_id: string }
 * Response: { checkoutUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = await rateLimit(`payos:${ip}`, 10, 60);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfterSec) },
        }
      );
    }

    // Check PayOS configuration
    if (!isPayOSConfigured()) {
      return NextResponse.json(
        { error: "PayOS chưa được cấu hình" },
        { status: 503 }
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { order_id } = body;
    if (!order_id) {
      return NextResponse.json(
        { error: "Thiếu order_id" },
        { status: 400 }
      );
    }

    // Fetch order (admin client to bypass RLS)
    const admin = await createAdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("*, products(name)")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng" },
        { status: 404 }
      );
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "Đơn hàng không ở trạng thái chờ thanh toán" },
        { status: 400 }
      );
    }

    // Generate unique PayOS order code if not already set
    let payosOrderCode = order.payos_order_code;
    if (!payosOrderCode) {
      payosOrderCode = generatePayOSOrderCode();

      // Store the payos_order_code in the order row for webhook lookup
      const { error: updateError } = await admin
        .from("orders")
        .update({ payos_order_code: payosOrderCode })
        .eq("id", order.id);

      if (updateError) {
        console.error("[PayOS Create] Failed to store payos_order_code:", updateError.message);
        return NextResponse.json(
          { error: "Không thể tạo mã thanh toán. Vui lòng thử lại." },
          { status: 500 }
        );
      }
    }

    // Build URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || "https://dangkhuong.com";
    const cancelUrl = `${baseUrl}/api/payos/cancel?order_id=${order.id}`;
    const returnUrl = `${baseUrl}/api/payos/success?order_id=${order.id}`;

    // Truncate description to 25 chars (PayOS limit)
    const productName = (order.products as Record<string, unknown>)?.name as string || "Khoa hoc";
    const description = `DK ${productName}`.slice(0, 25);

    // Create PayOS payment link
    const payosResponse = await createPaymentLink({
      orderCode: payosOrderCode,
      amount: order.amount,
      description,
      cancelUrl,
      returnUrl,
      items: [
        {
          name: productName.slice(0, 256),
          quantity: 1,
          price: order.amount,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: payosResponse.data.checkoutUrl,
    });
  } catch (err: unknown) {
    console.error(
      "[PayOS Create] Error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Không thể tạo link thanh toán. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
