import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const from = searchParams.get("from") || defaultFrom.toISOString();
  const to = searchParams.get("to") || now.toISOString();

  const adminClient = await createAdminClient();

  const { data: orders, error } = await adminClient
    .from("orders")
    .select("amount, product_id, products(title, thumbnail)")
    .eq("status", "paid")
    .gte("paid_at", from)
    .lte("paid_at", to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
}
