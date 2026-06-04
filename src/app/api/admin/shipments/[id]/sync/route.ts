import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils";
import { syncShipmentStatus } from "@/lib/actions/shipments";

/**
 * POST /api/admin/shipments/[id]/sync
 *
 * Manual resync entrypoint cho admin / manager khi webhook GHN bị miss
 * hoặc khi cần kiểm tra status realtime.
 *
 * Auth: admin / manager. Sale không có quyền (đọc qua trang chi tiết order
 * là đủ cho sale).
 *
 * Body: none.
 *
 * Response:
 *   200 → { ok: true, data: SyncShipmentResult }
 *   400 → { error: "Invalid ID format" } | { error: <action error> }
 *   401 → { error: "Unauthorized" }
 *   403 → { error: "Forbidden" }
 *   404 → { error: "Vận đơn không tồn tại." }
 *   5xx → { error: "Có lỗi xảy ra. Vui lòng thử lại." }
 *
 * Audit log entry intentionally không ghi ở đây vì sync là idempotent
 * read-mostly — nếu cần track ai bấm resync, mở rộng `AuditAction` ở
 * Week 7 (admin order management) rồi log từ đây.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  // Auth: phải đăng nhập + role admin/manager.
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncShipmentStatus(id);

    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "NO_CARRIER_CODE" ||
              result.code === "UNSUPPORTED_CARRIER"
            ? 400
            : 502;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status },
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err) {
    console.error("[POST /api/admin/shipments/[id]/sync] error:", err);
    return NextResponse.json(
      { error: "Có lỗi xảy ra. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
