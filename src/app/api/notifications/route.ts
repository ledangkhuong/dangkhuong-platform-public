import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface UnifiedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  is_broadcast: boolean;
}

// GET /api/notifications — fetch personal + broadcast notifications
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Personal notifications
    const { data: personal, error: personalErr } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (personalErr) {
      console.error("[Notifications GET] Personal error:", personalErr);
    }

    // 2. Broadcast announcements (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: announcements, error: annErr } = await supabase
      .from("announcements")
      .select("id, type, title, message, link, created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    if (annErr) {
      console.error("[Notifications GET] Announcements error:", annErr);
    }

    // 3. Which announcements has user already read?
    let readAnnouncementIds = new Set<string>();
    if (announcements && announcements.length > 0) {
      const annIds = announcements.map((a) => a.id);
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id)
        .in("announcement_id", annIds);

      if (reads) {
        readAnnouncementIds = new Set(reads.map((r) => r.announcement_id));
      }
    }

    // 4. Merge & sort
    const personalItems: UnifiedNotification[] = (personal ?? []).map((n) => ({
      ...n,
      is_broadcast: false,
    }));

    const broadcastItems: UnifiedNotification[] = (announcements ?? []).map((a) => ({
      ...a,
      link: a.link ?? null,
      read: readAnnouncementIds.has(a.id),
      is_broadcast: true,
    }));

    const all = [...personalItems, ...broadcastItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const unread_count = all.filter((n) => !n.read).length;

    return NextResponse.json({ notifications: all, unread_count });
  } catch (err) {
    console.error("[Notifications GET] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications — mark as read
// Body: { id, is_broadcast? } for single, or { all: true } for all
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    if (body.all === true) {
      // Mark all personal notifications as read
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      // Mark all unread announcements as read
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: announcements } = await supabase
        .from("announcements")
        .select("id")
        .gte("created_at", thirtyDaysAgo);

      if (announcements && announcements.length > 0) {
        const { data: alreadyRead } = await supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", user.id);

        const alreadyReadIds = new Set(
          (alreadyRead ?? []).map((r) => r.announcement_id)
        );

        const toInsert = announcements
          .filter((a) => !alreadyReadIds.has(a.id))
          .map((a) => ({ announcement_id: a.id, user_id: user.id }));

        if (toInsert.length > 0) {
          await supabase.from("announcement_reads").insert(toInsert);
        }
      }
    } else if (body.id && typeof body.id === "string") {
      if (body.is_broadcast) {
        // Mark broadcast announcement as read
        await supabase
          .from("announcement_reads")
          .upsert(
            { announcement_id: body.id, user_id: user.id },
            { onConflict: "announcement_id,user_id" }
          );
      } else {
        // Mark personal notification as read
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", body.id)
          .eq("user_id", user.id);
      }
    } else {
      return NextResponse.json(
        { error: "Body phải có { id, is_broadcast? } hoặc { all: true }." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Notifications PATCH] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
