import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { withErrorHandler } from "@/lib/api-handler";
import { isValidVisitorId } from "@/lib/visitor-id";
import { lookupGeoFromIp } from "@/lib/geo";
import { parseUserAgent } from "@/lib/user-agent";

/**
 * /api/analytics/track
 *
 * 1. Mọi page_view → insert vào analytics_events (event-level log)
 * 2. Lần đầu thấy visitor_id → insert vào visitor_attribution
 *    (frozen first-touch, dedupe qua PRIMARY KEY)
 *
 * Visitor_id do client gửi qua field `visitor_id` (đọc từ cookie dk_vid).
 */
async function _POST(req: NextRequest) {
  // Capture IP + UA early
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") ?? "";

  const rateLimitResult = await rateLimit(`analytics:${ip}`, 60, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSec) } },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: {
    event?: string;
    visitor_id?: string;
    properties?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { event, properties, visitor_id: visitorIdInput } = body;

  if (!event) return NextResponse.json({ error: "event required" }, { status: 400 });

  const ALLOWED_EVENTS = ["page_view", "click", "scroll", "video_play", "lesson_view", "course_view"];
  if (!ALLOWED_EVENTS.includes(event)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  if (JSON.stringify(properties || {}).length > 2000) {
    return NextResponse.json({ error: "Properties too large" }, { status: 400 });
  }

  const props = (properties || {}) as Record<string, unknown>;
  const sessionAttr = (props.session_attribution as Record<string, string> | undefined) || {};

  // ── 1. analytics_events insert (log mọi event) ──────────────
  await supabase.from("analytics_events").insert({
    user_id: user?.id ?? null,
    event,
    page: typeof props.path === "string" ? props.path : null,
    utm_source:
      (props.utm_source as string | undefined) || sessionAttr.utm_source || null,
    utm_medium:
      (props.utm_medium as string | undefined) || sessionAttr.utm_medium || null,
    utm_campaign:
      (props.utm_campaign as string | undefined) || sessionAttr.utm_campaign || null,
    meta: {
      ...props,
      ip,
      ua: ua.slice(0, 200),
      ts: new Date().toISOString(),
    },
    ip,
  });

  // ── 2. visitor_attribution insert (first-touch only) ────────
  if (event === "page_view" && isValidVisitorId(visitorIdInput)) {
    const visitorId = visitorIdInput;

    // Chỉ insert nếu CHƯA tồn tại — frozen first-touch
    const admin = await createAdminClient();
    const { data: existing } = await admin
      .from("visitor_attribution")
      .select("visitor_id")
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (!existing) {
      // First touch — parse UA + lookup geo + insert
      const parsed = parseUserAgent(ua);
      const geo = await lookupGeoFromIp(ip).catch(() => ({
        country: null,
        countryCode: null,
        region: null,
        city: null,
      }));

      await admin
        .from("visitor_attribution")
        .insert({
          visitor_id: visitorId,
          utm_source:
            (props.utm_source as string | undefined) || sessionAttr.utm_source || null,
          utm_medium:
            (props.utm_medium as string | undefined) || sessionAttr.utm_medium || null,
          utm_campaign:
            (props.utm_campaign as string | undefined) || sessionAttr.utm_campaign || null,
          utm_term:
            (props.utm_term as string | undefined) || sessionAttr.utm_term || null,
          utm_content:
            (props.utm_content as string | undefined) || sessionAttr.utm_content || null,
          referrer: (props.referrer as string | null | undefined) || null,
          fbclid: (props.fbclid as string | undefined) || sessionAttr.fbclid || null,
          gclid: (props.gclid as string | undefined) || sessionAttr.gclid || null,
          ttclid: (props.ttclid as string | undefined) || sessionAttr.ttclid || null,
          msclkid: (props.msclkid as string | undefined) || sessionAttr.msclkid || null,
          first_landing_path: (props.path as string | undefined) || null,
          first_landing_url: (props.url as string | undefined) || null,
          ref_code: sessionAttr.ref_code || null,
          device_type: parsed.deviceType,
          os: parsed.os,
          browser: parsed.browser,
          country: geo.country,
          country_code: geo.countryCode,
          region: geo.region,
          city: geo.city,
          ip,
          user_agent: ua.slice(0, 500),
        })
        .then(({ error }) => {
          if (error && error.code !== "23505") {
            // 23505 = unique violation (race condition, another request inserted first) — ignore
            console.warn("[analytics/track] visitor_attribution insert error:", error.message);
          }
        });
    }
  }

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandler(_POST);
