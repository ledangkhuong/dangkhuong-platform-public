import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/audit-log
 *
 * Fetch audit logs with pagination and filters.
 * Only accessible by admin/manager roles.
 *
 * Query params:
 *   page       - Page number (default: 1)
 *   limit      - Items per page (default: 20, max: 100)
 *   action     - Filter by action type (e.g. "order.confirm")
 *   target_type - Filter by target type (e.g. "user", "order")
 *   user_id    - Filter by admin who performed the action
 *   from       - Start date (ISO string)
 *   to         - End date (ISO string)
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return Response.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const action = searchParams.get("action");
    const targetType = searchParams.get("target_type");
    const userId = searchParams.get("user_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const offset = (page - 1) * limit;

    const admin = await createAdminClient();

    // Build the query
    let query = admin
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq("action", action);
    }
    if (targetType) {
      query = query.eq("target_type", targetType);
    }
    if (userId) {
      query = query.eq("admin_id", userId);
    }
    if (from) {
      query = query.gte("created_at", from);
    }
    if (to) {
      query = query.lte("created_at", to);
    }

    const { data: logs, count, error } = await query;

    if (error) {
      console.error("[Admin AuditLog GET] Error:", error.message);
      return Response.json(
        { error: "Lỗi khi tải nhật ký" },
        { status: 500 }
      );
    }

    // Fetch user profiles for the admin_ids in the results
    const adminIds = [
      ...new Set((logs || []).map((l) => l.admin_id).filter(Boolean)),
    ];

    let profilesMap: Record<string, string> = {};

    if (adminIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", adminIds);

      if (profiles) {
        profilesMap = Object.fromEntries(
          profiles.map((p) => [p.id, p.full_name || ""])
        );
      }
    }

    // Enrich logs with user names
    const enrichedLogs = (logs || []).map((log) => ({
      ...log,
      admin_name: profilesMap[log.admin_id] || log.admin_email || "Hệ thống",
    }));

    return Response.json({
      logs: enrichedLogs,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("[Admin AuditLog GET] Exception:", err);
    return Response.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
