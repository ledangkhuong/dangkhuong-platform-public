/**
 * Facebook Conversions API (CAPI) — Server-side event tracking
 *
 * Sends events directly to Meta's Graph API for reliable conversion tracking,
 * bypassing browser ad-blockers and cookie restrictions.
 *
 * Required env vars:
 *   FB_PIXEL_ID            — same Pixel ID used on the client
 *   FB_CAPI_ACCESS_TOKEN   — System User access token from Events Manager
 *   FB_TEST_EVENT_CODE     — (optional) test event code for debugging
 */

import { createHash } from "crypto";

const PIXEL_ID = process.env.FB_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const ACCESS_TOKEN = process.env.FB_CAPI_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE; // remove in production
const API_VERSION = "v21.0";

// ── Helpers ──────────────────────────────────────────────

/** SHA-256 hash for PII fields (required by Meta) */
function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** Hash user data fields according to Meta spec */
function hashUserData(params: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  ip?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  externalId?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ud: Record<string, any> = {};

  if (params.email) ud.em = sha256(params.email);
  if (params.phone) {
    // Normalise Vietnamese phone: 0xxx → +84xxx
    let phone = params.phone.replace(/[\s\-()]/g, "");
    if (phone.startsWith("0")) phone = "+84" + phone.slice(1);
    else if (!phone.startsWith("+")) phone = "+" + phone;
    ud.ph = sha256(phone);
  }
  if (params.firstName) ud.fn = sha256(params.firstName);
  if (params.lastName) ud.ln = sha256(params.lastName);

  // Non-hashed fields
  if (params.ip) ud.client_ip_address = params.ip;
  if (params.userAgent) ud.client_user_agent = params.userAgent;
  if (params.fbc) ud.fbc = params.fbc; // _fbc cookie
  if (params.fbp) ud.fbp = params.fbp; // _fbp cookie
  if (params.externalId) ud.external_id = sha256(params.externalId);

  return ud;
}

// ── Public API ───────────────────────────────────────────

export interface CAPIEventParams {
  eventName: string;
  eventId?: string; // for deduplication with browser pixel
  sourceUrl?: string;
  userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    ip?: string;
    userAgent?: string;
    fbc?: string;
    fbp?: string;
    externalId?: string;
  };
  customData?: Record<string, unknown>;
  actionSource?: "website" | "app" | "email" | "phone_call" | "chat" | "other";
}

/**
 * Send a single event to Facebook Conversions API.
 * Returns true on success, false on error (never throws).
 */
export async function sendCAPIEvent(params: CAPIEventParams): Promise<boolean> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn("[FB CAPI] Missing PIXEL_ID or ACCESS_TOKEN — skipping event:", params.eventName);
    return false;
  }

  const eventTime = Math.floor(Date.now() / 1000);

  const eventData = {
    event_name: params.eventName,
    event_time: eventTime,
    event_id: params.eventId || `${params.eventName}_${eventTime}_${Math.random().toString(36).slice(2, 8)}`,
    event_source_url: params.sourceUrl || "https://dangkhuong.com/slowenglish",
    action_source: params.actionSource || "website",
    user_data: hashUserData(params.userData),
    custom_data: params.customData || {},
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    data: [eventData],
    access_token: ACCESS_TOKEN,
  };

  if (TEST_EVENT_CODE) {
    payload.test_event_code = TEST_EVENT_CODE;
  }

  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[FB CAPI] Error ${res.status} for ${params.eventName}:`, body);
      return false;
    }

    const result = await res.json();
    console.log(`[FB CAPI] ✓ ${params.eventName} — events_received: ${result.events_received}`);
    return true;
  } catch (err) {
    console.error(`[FB CAPI] Network error for ${params.eventName}:`, err);
    return false;
  }
}

// ── Convenience methods ──────────────────────────────────

/** Track a Lead event (form submission / registration) */
export function trackLead(opts: {
  email: string;
  phone?: string;
  name?: string;
  ip?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  userId?: string;
  value?: number;
  currency?: string;
  eventId?: string;
  sourceUrl?: string;
}) {
  const nameParts = (opts.name || "").split(" ");
  return sendCAPIEvent({
    eventName: "Lead",
    eventId: opts.eventId,
    sourceUrl: opts.sourceUrl,
    userData: {
      email: opts.email,
      phone: opts.phone,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" "),
      ip: opts.ip,
      userAgent: opts.userAgent,
      fbc: opts.fbc,
      fbp: opts.fbp,
      externalId: opts.userId,
    },
    customData: {
      content_name: "SlowEnglish Registration",
      ...(opts.value ? { value: opts.value, currency: opts.currency || "VND" } : {}),
    },
  });
}

/** Track an InitiateCheckout event */
export function trackInitiateCheckout(opts: {
  email: string;
  phone?: string;
  name?: string;
  ip?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  userId?: string;
  value: number;
  currency?: string;
  contentName?: string;
  eventId?: string;
  sourceUrl?: string;
}) {
  const nameParts = (opts.name || "").split(" ");
  return sendCAPIEvent({
    eventName: "InitiateCheckout",
    eventId: opts.eventId,
    sourceUrl: opts.sourceUrl,
    userData: {
      email: opts.email,
      phone: opts.phone,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" "),
      ip: opts.ip,
      userAgent: opts.userAgent,
      fbc: opts.fbc,
      fbp: opts.fbp,
      externalId: opts.userId,
    },
    customData: {
      value: opts.value,
      currency: opts.currency || "VND",
      content_name: opts.contentName || "SlowEnglish",
    },
  });
}

/** Track a Purchase event (payment confirmed) */
export function trackPurchase(opts: {
  email: string;
  phone?: string;
  name?: string;
  ip?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  userId?: string;
  value: number;
  currency?: string;
  orderId?: string;
  contentName?: string;
  eventId?: string;
  sourceUrl?: string;
}) {
  const nameParts = (opts.name || "").split(" ");
  return sendCAPIEvent({
    eventName: "Purchase",
    eventId: opts.eventId,
    sourceUrl: opts.sourceUrl,
    userData: {
      email: opts.email,
      phone: opts.phone,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" "),
      ip: opts.ip,
      userAgent: opts.userAgent,
      fbc: opts.fbc,
      fbp: opts.fbp,
      externalId: opts.userId,
    },
    customData: {
      value: opts.value,
      currency: opts.currency || "VND",
      content_name: opts.contentName || "SlowEnglish",
      order_id: opts.orderId,
    },
  });
}
