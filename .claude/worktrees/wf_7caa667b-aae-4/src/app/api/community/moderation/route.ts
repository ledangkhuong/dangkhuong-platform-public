import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const STAFF_ROLES = ["admin", "manager", "support"];

/**
 * GET /api/community/moderation — Get flagged/reported posts (staff only)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !STAFF_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const filter = url.searchParams.get("filter") || "all"; // all, reported, flagged, hidden

    // Get all posts that need moderation attention
    let query = admin
      .from("posts")
      .select(`
        *,
        profiles!posts_user_id_fkey(full_name, avatar_url),
        post_reports(id, reason, status, reporter_id, created_at)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter === "reported") {
      // Posts that have pending reports
      query = query.not("post_reports", "is", null);
    } else if (filter === "flagged") {
      query = query.eq("flagged", true);
    } else if (filter === "hidden") {
      query = query.eq("status", "hidden");
    } else {
      // "all" — show anything that needs attention
      query = query.or("flagged.eq.true,status.neq.visible");
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/community/moderation error:", error.message);
      return NextResponse.json({ error: "Lỗi tải dữ liệu" }, { status: 500 });
    }

    // Also get pending report count
    const { count: pendingReports } = await admin
      .from("post_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return NextResponse.json({ posts: data, pendingReports: pendingReports ?? 0 });
  } catch (err) {
    console.error("GET /api/community/moderation unexpected:", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

/**
 * PATCH /api/community/moderation — Hide/unhide/delete a post (staff only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !STAFF_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { post_id, action } = body;
    if (!post_id || !["hide", "unhide", "delete", "dismiss_reports"].includes(action)) {
      return NextResponse.json({ error: "post_id và action hợp lệ là bắt buộc" }, { status: 400 });
    }

    if (action === "hide") {
      await admin.from("posts").update({ status: "hidden" }).eq("id", post_id);
      // Auto-review related reports
      await admin.from("post_reports")
        .update({ status: "reviewed", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("post_id", post_id).eq("status", "pending");

    } else if (action === "unhide") {
      await admin.from("posts").update({ status: "visible", flagged: false }).eq("id", post_id);

    } else if (action === "delete") {
      await admin.from("posts").update({ status: "deleted" }).eq("id", post_id);
      await admin.from("post_reports")
        .update({ status: "reviewed", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("post_id", post_id).eq("status", "pending");

    } else if (action === "dismiss_reports") {
      await admin.from("post_reports")
        .update({ status: "dismissed", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("post_id", post_id).eq("status", "pending");
      // Unflag the post
      await admin.from("posts").update({ flagged: false }).eq("id", post_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/community/moderation unexpected:", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
