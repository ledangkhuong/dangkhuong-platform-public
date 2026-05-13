import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// DELETE /api/admin/orders — delete one or multiple orders
export async function DELETE(req: NextRequest) {
  // Auth: only admin/manager can delete orders
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "manager"].includes(myProfile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { order_ids } = await req.json();

  if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
    return NextResponse.json(
      { error: "order_ids[] is required" },
      { status: 400 }
    );
  }

  const adminClient = await createAdminClient();
  const results = { deleted: 0, errors: [] as string[] };

  for (const oid of order_ids) {
    const { error: delErr } = await adminClient
      .from("orders")
      .delete()
      .eq("id", oid);

    if (delErr) {
      results.errors.push(`${oid}: ${delErr.message}`);
    } else {
      results.deleted++;
    }
  }

  return NextResponse.json(results);
}
