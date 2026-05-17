import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EventType = "login" | "lesson_complete" | "post_created" | "register";

interface Notification {
  id: string;
  type: "system" | "achievement" | "community" | "welcome";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface XpEvent {
  id: string;
  action: string;
  xp_amount: number | null;
  created_at: string;
  meta?: Record<string, unknown> | null;
}

const TYPE_MAP: Record<EventType, Notification["type"]> = {
  login: "system",
  lesson_complete: "achievement",
  post_created: "community",
  register: "welcome",
};

const TITLE_MAP: Record<Notification["type"], string> = {
  system: "Hoạt động hệ thống",
  achievement: "Thành tích mới!",
  community: "Cộng đồng",
  welcome: "Chào mừng!",
};

const MESSAGE_MAP: Record<EventType, (xp: number | null) => string> = {
  login: () => "Bạn đã đăng nhập thành công.",
  lesson_complete: (xp) => `Bạn đã hoàn thành một bài học${xp ? ` và nhận được ${xp} XP` : ""}.`,
  post_created: (xp) => `Bài viết của bạn đã được đăng thành công${xp ? ` (+${xp} XP)` : ""}.`,
  register: () => "Chào mừng bạn đến với nền tảng! Hãy bắt đầu hành trình học tập.",
};

function transformEvent(event: XpEvent): Notification {
  const action = event.action as EventType;
  const type = TYPE_MAP[action] ?? "system";
  const title = TITLE_MAP[type];
  const messageFn = MESSAGE_MAP[action];
  const message = messageFn ? messageFn(event.xp_amount) : "Có hoạt động mới trên tài khoản của bạn.";

  return {
    id: event.id,
    type,
    title,
    message,
    read: false,
    created_at: event.created_at,
  };
}

// GET /api/notifications — lấy notifications của user (mock từ xp_events)
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("xp_events")
    .select("id, action, xp_amount, created_at, meta")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[Notifications] Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi tải thông báo. Vui lòng thử lại." }, { status: 500 });
  }

  const notifications: Notification[] = (data as XpEvent[]).map(transformEvent);
  const unread_count = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications, unread_count });
}

// POST /api/notifications — đánh dấu đã đọc
// Body: { notification_id?: string } — không có id → mark all read
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // notification_id không bắt buộc — ignored trong mock (chưa có notifications table)
  await req.json().catch(() => ({}));

  // Real impl: UPDATE notifications SET read = true WHERE user_id = ? [AND id = ?]
  return NextResponse.json({ ok: true });
}
