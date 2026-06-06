// ---------------------------------------------------------------------------
// GA4 Measurement Protocol — Server-side event tracking
// ---------------------------------------------------------------------------
// Bypasses client-side adblockers by sending events directly from our server
// to Google Analytics via HTTP POST. Mirrors the Facebook CAPI pattern we
// already use for FB Pixel.
//
// Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
// ---------------------------------------------------------------------------

import { createHash, randomBytes } from "node:crypto";

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
const GA4_API_SECRET = process.env.GA4_API_SECRET || "";
const GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect";
const GA4_DEBUG_ENDPOINT = "https://www.google-analytics.com/debug/mp/collect";

export const IS_GA4_SERVER_ENABLED = !!(GA4_MEASUREMENT_ID && GA4_API_SECRET);

export type Ga4EventParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export type Ga4Event = {
  name: string;
  params?: Ga4EventParams;
};

export type Ga4UserProps = Record<
  string,
  { value: string | number | boolean }
>;

export type Ga4SendOptions = {
  /** GA4 client_id — pin to a stable id per browser. Falls back to random. */
  clientId?: string;
  /** Stable user_id for logged-in users (Supabase auth.uid). Optional. */
  userId?: string;
  /** Auto-populated by route from request headers. */
  userIpOverride?: string;
  /** Auto-populated by route from request headers. */
  userAgent?: string;
  /** Custom user properties (e.g. role, plan). */
  userProperties?: Ga4UserProps;
  /** Use debug endpoint — returns validation errors instead of 204. */
  debug?: boolean;
  /** Non-personalized ads — set true if you don't want ad personalization. */
  nonPersonalizedAds?: boolean;
  /** Hard timeout in ms (default 2000). */
  timeoutMs?: number;
};

/**
 * Generate a stable client_id when one is not provided.
 * Pattern matches what gtag.js produces: <random_int>.<unix_seconds>
 */
export function generateClientId(): string {
  const rand = parseInt(randomBytes(4).toString("hex"), 16);
  const sec = Math.floor(Date.now() / 1000);
  return `${rand}.${sec}`;
}

/**
 * Derive a stable client_id from an IP + UA pair when the browser didn't send
 * one. Hash so we don't store PII.
 */
export function clientIdFromRequest(ip: string, userAgent: string): string {
  const h = createHash("sha256")
    .update(`${ip}|${userAgent}`)
    .digest("hex");
  // GA4 prefers <int>.<int> but accepts hex too. Truncate to keep payload small.
  return h.slice(0, 16);
}

/**
 * Send one or more events to GA4 Measurement Protocol.
 *
 * Fire-and-forget by design — never throws. Returns a result object so the
 * caller can log non-fatal failures.
 */
export async function ga4SendEvents(
  events: Ga4Event[],
  options: Ga4SendOptions = {},
): Promise<{ ok: boolean; status?: number; error?: string; debug?: unknown }> {
  if (!IS_GA4_SERVER_ENABLED) {
    return { ok: false, error: "GA4 server not configured" };
  }
  if (events.length === 0) return { ok: true };

  const clientId = options.clientId || generateClientId();
  const endpoint = options.debug ? GA4_DEBUG_ENDPOINT : GA4_ENDPOINT;
  const timeoutMs = options.timeoutMs ?? 2000;

  // GA4 hard caps: 25 events per request; each event ≤ 25 params.
  const trimmed = events.slice(0, 25).map((ev) => ({
    name: ev.name.slice(0, 40),
    params: ev.params
      ? Object.fromEntries(
          Object.entries(ev.params)
            .filter(([, v]) => v !== undefined && v !== null)
            .slice(0, 25),
        )
      : undefined,
  }));

  const payload: Record<string, unknown> = {
    client_id: clientId,
    events: trimmed,
    non_personalized_ads: !!options.nonPersonalizedAds,
  };

  if (options.userId) payload.user_id = options.userId;
  if (options.userProperties) payload.user_properties = options.userProperties;

  const url = new URL(endpoint);
  url.searchParams.set("measurement_id", GA4_MEASUREMENT_ID);
  url.searchParams.set("api_secret", GA4_API_SECRET);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.userAgent ? { "User-Agent": options.userAgent } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (options.debug) {
      const debug = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, debug };
    }

    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Convenience helper for a single page_view event.
 */
export async function ga4SendPageView(
  pagePath: string,
  pageTitle: string | undefined,
  options: Ga4SendOptions = {},
) {
  return ga4SendEvents(
    [
      {
        name: "page_view",
        params: {
          page_location: pagePath,
          page_title: pageTitle,
          engagement_time_msec: 1,
        },
      },
    ],
    options,
  );
}
