import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notifications — fetch notifications for current user
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Notifications GET] Error:", error);
      return NextResponse.json(
        { error: "Có lỗi xảy ra khi tải thông báo." },
        { status: 500 }
      );
    }

    const notifications = data ?? [];
    const unread_count = notifications.filter(
      (n: { read: boolean }) => !n.read
    ).length;

    return NextResponse.json({ notifications, unread_count });
  } catch (err) {
    console.error("[Notifications GET] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications — mark as read
// Body: { id: string } for single notification, or { all: true } for all
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
      // Mark all unread notifications as read
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        console.error("[Notifications PATCH all] Error:", error);
        return NextResponse.json(
          { error: "Không thể đánh dấu đã đọc." },
          { status: 500 }
        );
      }
    } else if (body.id && typeof body.id === "string") {
      // Mark single notification as read
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", body.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("[Notifications PATCH single] Error:", error);
        return NextResponse.json(
          { error: "Không thể đánh dấu đã đọc." },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Body phải có { id: string } hoặc { all: true }." },
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
