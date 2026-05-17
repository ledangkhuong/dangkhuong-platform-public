import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json();
  const { event, properties } = body;

  if (!event) return NextResponse.json({ error: "event required" }, { status: 400 });

  // Whitelist allowed event types
  const ALLOWED_EVENTS = ["page_view", "click", "scroll", "video_play", "lesson_view", "course_view"];
  if (!ALLOWED_EVENTS.includes(event)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  // Limit properties payload size
  if (JSON.stringify(properties || {}).length > 2000) {
    return NextResponse.json({ error: "Properties too large" }, { status: 400 });
  }

  // Capture IP + UA for anonymous tracking
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "";

  await supabase.from("analytics_events").insert({
    user_id: user?.id ?? null,
    event,
    properties: {
      ...properties,
      ip,
      ua: ua.slice(0, 200),
      ts: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
