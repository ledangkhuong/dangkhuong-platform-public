// ---------------------------------------------------------------------------
// /api/event — First-party GA4 Measurement Protocol relay
// ---------------------------------------------------------------------------
// Client posts events here; we forward to GA4 server-side. Bypasses adblockers
// because the request goes to dangkhuong.com (first-party origin), not to
// google-analytics.com.
//
// Deliberately named "/api/event" (generic) instead of "/api/ga4" so it does
// not match common adblocker rules like *analytics* or *track*.
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import {
  IS_GA4_SERVER_ENABLED,
  clientIdFromRequest,
  ga4SendEvents,
  type Ga4Event,
} from "@/lib/ga4-server";

export const runtime = "nodejs";

type IncomingBody = {
  /** Array of GA4 events. Capped server-side at 25. */
  events?: unknown;
  /** Optional client_id from gtag.js's _ga cookie. Server falls back. */
  clientId?: unknown;
  /** Optional user_id (Supabase auth uid) for cross-device unification. */
  userId?: unknown;
  /** Optional user props. */
  userProperties?: unknown;
};

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "0.0.0.0";
}

function isValidEvent(e: unknown): e is Ga4Event {
  if (!e || typeof e !== "object") return false;
  const ev = e as Record<string, unknown>;
  if (typeof ev.name !== "string" || ev.name.length === 0) return false;
  if (ev.params && typeof ev.params !== "object") return false;
  return true;
}

export async function POST(req: NextRequest) {
  // Fail open — return 204 even on bad input so client-side never sees errors.
  if (!IS_GA4_SERVER_ENABLED) {
    return new NextResponse(null, { status: 204 });
  }

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const rawEvents = Array.isArray(body.events) ? body.events : [];
  const events: Ga4Event[] = rawEvents.filter(isValidEvent);
  if (events.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "";
  const clientId =
    typeof body.clientId === "string" && body.clientId.length > 0
      ? body.clientId
      : clientIdFromRequest(ip, userAgent);

  const userId =
    typeof body.userId === "string" && body.userId.length > 0
      ? body.userId
      : undefined;

  // Send to GA4 in the background — don't block the response.
  // The Vercel edge runtime keeps the function alive until the promise settles
  // when we use ctx.waitUntil; here we just await with a tight timeout.
  await ga4SendEvents(events, {
    clientId,
    userId,
    userIpOverride: ip,
    userAgent,
    userProperties:
      body.userProperties && typeof body.userProperties === "object"
        ? (body.userProperties as Record<string, { value: string | number | boolean }>)
        : undefined,
    timeoutMs: 1500,
  });

  return new NextResponse(null, { status: 204 });
}

// Allow CORS preflight for same-origin only — keep simple, no wildcard.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://dangkhuong.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
