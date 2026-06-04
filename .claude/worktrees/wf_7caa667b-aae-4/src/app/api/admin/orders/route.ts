import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// DELETE /api/admin/orders — delete one or multiple orders
export async function DELETE(req: NextRequest) {
  try {
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

    let order_ids;
    try {
      ({ order_ids } = await req.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: "order_ids[] is required" },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();
    const results = { deleted: 0, errors: [] as string[] };

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    for (const oid of order_ids) {
      const { error: delErr } = await adminClient
        .from("orders")
        .delete()
        .eq("id", oid);

      if (delErr) {
        console.error(`[Admin Orders DELETE] Delete failed for ${oid}:`, delErr.message);
        results.errors.push(`${oid}: Xoá đơn hàng thất bại`);
      } else {
        results.deleted++;

        await logAudit({
          admin_id: user.id,
          action: "order.delete",
          target_type: "order",
          target_id: oid,
          ip_address: ip,
        });
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("DELETE /api/admin/orders error:", err);
    return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
  }
}
