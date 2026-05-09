import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const order_id = searchParams.get("order_id");
  if (!order_id) return NextResponse.json({ error: "order_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("orders")
    .select("id, status, product_id, amount")
    .eq("id", order_id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  return NextResponse.json({ status: data.status, order: data });
}
