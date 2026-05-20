import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { withErrorHandler } from "@/lib/api-handler";

async function _POST(req: NextRequest) {
  // Capture IP + UA early (used for both rate limiting and analytics tracking)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") ?? "";

  const rateLimitResult = await rateLimit(`analytics:${ip}`, 60, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSec) } }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
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

export const POST = withErrorHandler(_POST);
