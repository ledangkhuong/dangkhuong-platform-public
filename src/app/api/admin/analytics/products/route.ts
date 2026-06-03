import { createClient, createAdminClient } from "@/lib/supabase/server";
import { vnDayKey, vnRangeToUtc } from "@/lib/vn-time";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // `from`/`to` are VN calendar days ("YYYY-MM-DD").
    const from = searchParams.get("from") || vnDayKey(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = searchParams.get("to") || vnDayKey(Date.now());

    // VN day window [from 00:00, to 24:00) in Asia/Ho_Chi_Minh, as UTC instants.
    const { startUtc, endUtc } = vnRangeToUtc(from, to);

    const adminClient = await createAdminClient();

    const { data: orders, error } = await adminClient
      .from("orders")
      .select("amount, product_id, products(title, thumbnail)")
      .eq("status", "paid")
      .gte("paid_at", startUtc)
      .lt("paid_at", endUtc);

    if (error) {
      console.error("[Analytics Products] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi tải dữ liệu sản phẩm. Vui lòng thử lại." }, { status: 500 });
    }

    const productMap = new Map<
      string,
      { id: string; title: string; thumbnail: string | null; revenue: number; orders: number }
    >();

    for (const order of orders || []) {
      const productId = order.product_id;
      const product = order.products as unknown as { title: string; thumbnail: string | null } | null;

      if (!productId) continue;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: productId,
          title: product?.title || "Unknown",
          thumbnail: product?.thumbnail || null,
          revenue: 0,
          orders: 0,
        });
      }

      const entry = productMap.get(productId)!;
      entry.revenue += order.amount || 0;
      entry.orders += 1;
    }

    const products = Array.from(productMap.values())
      .map((p) => ({
        ...p,
        avgPrice: p.orders > 0 ? p.revenue / p.orders : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ products });
  } catch (err) {
    console.error("[Analytics Products] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
