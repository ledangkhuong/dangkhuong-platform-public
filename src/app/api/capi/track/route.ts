import { NextRequest } from "next/server";
import { getPixelConfigBySlug, logPixelEvent } from "@/lib/pixel-config";
import { sendCAPIEvent } from "@/lib/facebook-capi";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/capi/track
 *
 * Server endpoint nhận event từ client (qua trackPageEvent / PagePixelClient),
 * sau đó forward sang Meta CAPI bằng access_token tương ứng với slug.
 *
 * Body:
 *   {
 *     slug: string;            // tên slug trong pixel_configs
 *     event_name: string;      // "Lead", "Contact", "Purchase", ...
 *     event_id: string;        // dùng dedupe với Pixel client-side
 *     user_data?: { email?, phone?, name?, userId? };
 *     custom_data?: { value?, currency?, content_name?, ... };
 *     source_url?: string;
 *   }
 *
 * Rate limit: 60 req / phút / IP.
 */

interface TrackBody {
  slug?: string;
  event_name?: string;
  event_id?: string;
  user_data?: {
    email?: string;
    phone?: string;
    name?: string;
    userId?: string;
  };
  custom_data?: Record<string, unknown>;
  source_url?: string;
  /** Optional attribution context — auto-merged vào custom_data để Meta nhận. */
  attribution?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    fbclid?: string;
    gclid?: string;
    ttclid?: string;
    referrer?: string;
    landing_path?: string;
  };
}

function getClientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return undefined;
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
}

export async function POST(req: NextRequest) {
  // ── Rate limit theo IP ──────────────────────────────────────
  const ip = getClientIp(req) || "unknown";
  const rl = await rateLimit(`capi:${ip}`, 60, 60);
  if (!rl.allowed) {
    return Response.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // ── Parse body ──────────────────────────────────────────────
  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const slug = (body.slug || "").trim();
  const eventName = (body.event_name || "").trim();
  const eventId = (body.event_id || "").trim();

  if (!slug || !eventName || !eventId) {
    return Response.json(
      { error: "missing_required_fields", required: ["slug", "event_name", "event_id"] },
      { status: 400 },
    );
  }

  // ── Lookup config ───────────────────────────────────────────
  const config = await getPixelConfigBySlug(slug);
  if (!config) {
    return Response.json({ error: "config_not_found", slug }, { status: 404 });
  }

  if (!config.capi_access_token) {
    // Pixel-only config — không có CAPI token, không cần gửi server-side.
    // Vẫn trả 200 để client không retry vô ích.
    return Response.json({ skipped: true, reason: "no_capi_token" });
  }

  // ── Build user_data từ request ──────────────────────────────
  const userAgent = req.headers.get("user-agent") || undefined;
  const cookies = parseCookies(req.headers.get("cookie"));

  const userData = {
    email: body.user_data?.email,
    phone: body.user_data?.phone,
    firstName: body.user_data?.name?.split(" ")[0],
    lastName: body.user_data?.name?.split(" ").slice(1).join(" ") || undefined,
    ip,
    userAgent,
    fbc: cookies._fbc,
    fbp: cookies._fbp,
    externalId: body.user_data?.userId,
  };

  // Merge attribution context vào custom_data (Meta nhận utm_*, fbclid, ...)
  const customData: Record<string, unknown> = {
    ...(body.custom_data || {}),
    ...(body.attribution || {}),
  };

  // ── Send to Meta CAPI ───────────────────────────────────────
  const result = await sendCAPIEvent({
    eventName,
    eventId,
    sourceUrl: body.source_url,
    userData,
    customData,
    config: {
      pixelId: config.pixel_id,
      accessToken: config.capi_access_token,
      testEventCode: config.test_event_code,
    },
  });

  // ── Log (best-effort, không await trễ response) ─────────────
  void logPixelEvent({
    configId: config.id,
    slug: config.slug,
    eventName,
    eventId,
    source: "capi",
    userData: { ...userData, ip: undefined, userAgent: undefined },
    customData: body.custom_data,
    fbResponse: result.response ?? null,
    success: result.success,
    errorMessage: result.error ?? null,
  });

  if (!result.success) {
    return Response.json(
      { error: "capi_failed", detail: result.error },
      { status: 502 },
    );
  }

  return Response.json({
    success: true,
    event_id: eventId,
    events_received: result.events_received ?? 0,
  });
}
