import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/notifications/admin
 * Create a broadcast announcement or personal notification (admin/manager only)
 *
 * Body for broadcast:
 *   { broadcast: true, type?, title, message, link? }
 *
 * Body for personal:
 *   { user_id: string, type?, title, message, link? }
 *
 * Body for personal to multiple users:
 *   { user_ids: string[], type?, title, message, link? }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin/manager role
    const admin = await createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { type = "system", title, message, link } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "title and message are required" },
        { status: 400 }
      );
    }

    if (body.broadcast) {
      // Create broadcast announcement
      const { error } = await admin
        .from("announcements")
        .insert({
          type,
          title,
          message,
          link: link || null,
          created_by: user.id,
        });

      if (error) {
        console.error("[Notifications Admin] Broadcast error:", error);
        return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, type: "broadcast" });
    } else if (body.user_id) {
      // Send to single user
      const { error } = await admin
        .from("notifications")
        .insert({
          user_id: body.user_id,
          type,
          title,
          message,
          link: link || null,
        });

      if (error) {
        console.error("[Notifications Admin] Personal error:", error);
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, type: "personal", count: 1 });
    } else if (Array.isArray(body.user_ids) && body.user_ids.length > 0) {
      // Send to multiple users
      const rows = body.user_ids.map((uid: string) => ({
        user_id: uid,
        type,
        title,
        message,
        link: link || null,
      }));

      const { error } = await admin.from("notifications").insert(rows);

      if (error) {
        console.error("[Notifications Admin] Multi-personal error:", error);
        return NextResponse.json({ error: "Failed to create notifications" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, type: "personal", count: rows.length });
    } else {
      return NextResponse.json(
        { error: "Must provide broadcast: true, user_id, or user_ids[]" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[Notifications Admin] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/notifications/admin
 * List recent announcements (admin/manager only)
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Notifications Admin GET]", error);
      return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }

    return NextResponse.json({ announcements: data ?? [] });
  } catch (err) {
    console.error("[Notifications Admin GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
