/**
 * Client-side tracking utility — auto page views, scroll depth, time on page.
 *
 * Works alongside existing PageTracker (page_view) and pixel-tracker.ts (Meta CAPI).
 * All events are sent to /api/analytics/track with visitor_id from dk_vid cookie.
 *
 * Usage:
 *   import { trackPageView, trackScrollDepth, trackTimeOnPage, trackEvent } from "@/lib/tracking";
 *
 * Does NOT import heavy deps. Safe for "use client" components.
 */

import { getOrCreateVisitorIdClient } from "@/lib/visitor-id";
import { hasCookieConsent } from "@/components/CookieConsent";

// ---------------------------------------------------------------------------
// UTM helpers
// ---------------------------------------------------------------------------

/** Extract UTM params + click IDs from the current URL. */
function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "ttclid",
    "msclkid",
  ];
  const result: Record<string, string> = {};
  for (const k of keys) {
    const v = params.get(k);
    if (v) result[k] = v;
  }
  return result;
}

/**
 * Read session-level UTM attribution that PageTracker stores.
 * Falls back to current URL params if session storage is empty.
 */
function getSessionAttribution(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem("dk_utm");
    if (stored) return JSON.parse(stored) as Record<string, string>;
  } catch {
    // corrupted — fall through
  }
  return getUtmParams();
}

// ---------------------------------------------------------------------------
// Queue / batching — buffer events and flush periodically or on unload
// ---------------------------------------------------------------------------

interface QueuedEvent {
  event: string;
  visitor_id: string;
  properties: Record<string, unknown>;
}

const FLUSH_INTERVAL_MS = 5_000; // flush every 5 s
const MAX_QUEUE_SIZE = 20;

let eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQueue();
  }, FLUSH_INTERVAL_MS);
}

/** Flush all queued events. Uses sendBeacon when available for reliability. */
function flushQueue() {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, eventQueue.length);

  for (const item of batch) {
    const payload = JSON.stringify(item);
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const sent = navigator.sendBeacon(
          "/api/analytics/track",
          new Blob([payload], { type: "application/json" }),
        );
        if (sent) continue;
      }
      // Fallback to fetch with keepalive
      void fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: payload,
      }).catch(() => {
        /* swallow — analytics must never throw */
      });
    } catch {
      /* swallow */
    }
  }
}

function enqueue(item: QueuedEvent) {
  eventQueue.push(item);
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushQueue();
  } else {
    scheduleFlush();
  }
}

// ---------------------------------------------------------------------------
// Core tracking functions
// ---------------------------------------------------------------------------

/**
 * Send a generic analytics event.
 * All events automatically include visitor_id, UTM params, and session attribution.
 */
export function trackEvent(
  event: string,
  page: string,
  meta?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (!hasCookieConsent("analytics")) return;

  const visitorId = getOrCreateVisitorIdClient();
  const utmParams = getUtmParams();
  const sessionAttribution = getSessionAttribution();

  enqueue({
    event,
    visitor_id: visitorId,
    properties: {
      path: page,
      url: window.location.href,
      referrer: document.referrer || null,
      ...utmParams,
      session_attribution: sessionAttribution,
      ...meta,
    },
  });
}

/**
 * Track a page view. Typically called automatically by TrackingProvider.
 * NOTE: The existing PageTracker component already fires page_view events.
 * This function is provided for programmatic use outside the provider.
 */
export function trackPageView(page: string, meta?: Record<string, unknown>): void {
  trackEvent("page_view", page, {
    title: typeof document !== "undefined" ? document.title : undefined,
    ...meta,
  });
}

// ---------------------------------------------------------------------------
// Scroll depth tracking
// ---------------------------------------------------------------------------

/**
 * Set up scroll depth tracking for the current page.
 * Fires at 25%, 50%, 75%, 100% thresholds — each fires only once per page.
 * Returns a cleanup function to remove the listener.
 */
export function trackScrollDepth(page: string): () => void {
  if (typeof window === "undefined") return () => {};

  const thresholds = [25, 50, 75, 100];
  const fired = new Set<number>();

  function getScrollPercent(): number {
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
    );
    const winHeight = window.innerHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (docHeight <= winHeight) return 100; // page fits in viewport
    return Math.min(100, Math.round(((scrollTop + winHeight) / docHeight) * 100));
  }

  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (!hasCookieConsent("analytics")) return;

      const pct = getScrollPercent();
      for (const threshold of thresholds) {
        if (pct >= threshold && !fired.has(threshold)) {
          fired.add(threshold);
          trackEvent("scroll_depth", page, {
            depth: threshold,
            max_scroll_percent: pct,
          });
        }
      }
    });
  }

  // Check initial scroll position (e.g. page loaded with anchor)
  // Use a small delay to let the page settle after navigation
  const initTimer = setTimeout(onScroll, 500);

  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    clearTimeout(initTimer);
    window.removeEventListener("scroll", onScroll);
  };
}

// ---------------------------------------------------------------------------
// Time on page tracking
// ---------------------------------------------------------------------------

/**
 * Track time spent on a page.
 * Sends a `time_on_page` event when the user leaves (visibilitychange + beforeunload).
 * Uses sendBeacon for reliability during page unload.
 * Returns a cleanup function.
 */
export function trackTimeOnPage(page: string): () => void {
  if (typeof window === "undefined") return () => {};

  const startTime = Date.now();
  let totalVisibleMs = 0;
  let lastVisibleStart = document.visibilityState === "visible" ? startTime : 0;
  let hasSent = false;

  function sendTimeEvent() {
    if (hasSent) return;
    if (!hasCookieConsent("analytics")) return;

    // Account for current visible period if still visible
    if (lastVisibleStart > 0) {
      totalVisibleMs += Date.now() - lastVisibleStart;
      lastVisibleStart = 0;
    }

    const totalElapsedMs = Date.now() - startTime;
    const timeOnPageSec = Math.round(totalVisibleMs / 1000);
    const totalElapsedSec = Math.round(totalElapsedMs / 1000);

    // Only send if user spent at least 1 second
    if (timeOnPageSec < 1) return;

    hasSent = true;

    const visitorId = getOrCreateVisitorIdClient();
    const utmParams = getUtmParams();
    const sessionAttribution = getSessionAttribution();

    const payload = JSON.stringify({
      event: "time_on_page",
      visitor_id: visitorId,
      properties: {
        path: page,
        url: window.location.href,
        time_on_page_seconds: timeOnPageSec,
        total_elapsed_seconds: totalElapsedSec,
        ...utmParams,
        session_attribution: sessionAttribution,
      },
    });

    // Prefer sendBeacon for unload reliability
    try {
      if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon(
          "/api/analytics/track",
          new Blob([payload], { type: "application/json" }),
        );
        if (sent) return;
      }
    } catch {
      /* fallback below */
    }

    // Fallback
    try {
      void fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: payload,
      }).catch(() => {});
    } catch {
      /* swallow */
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      // User switched tabs or minimized — accumulate visible time
      if (lastVisibleStart > 0) {
        totalVisibleMs += Date.now() - lastVisibleStart;
        lastVisibleStart = 0;
      }
      // Send time event — the user might not come back
      sendTimeEvent();
    } else if (document.visibilityState === "visible") {
      // User came back — reset visible timer
      lastVisibleStart = Date.now();
      // Allow re-sending if they come back and then leave again
      hasSent = false;
    }
  }

  function onBeforeUnload() {
    // Final attempt — flush the queue too
    flushQueue();
    sendTimeEvent();
  }

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("beforeunload", onBeforeUnload);

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("beforeunload", onBeforeUnload);
    // Send any accumulated time
    sendTimeEvent();
  };
}

// ---------------------------------------------------------------------------
// Flush on unload (global — registered once)
// ---------------------------------------------------------------------------

let globalUnloadRegistered = false;

/** Register global unload handler to flush the event queue. Call once. */
export function registerGlobalUnloadFlush(): void {
  if (typeof window === "undefined") return;
  if (globalUnloadRegistered) return;
  globalUnloadRegistered = true;

  window.addEventListener("beforeunload", () => {
    flushQueue();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushQueue();
    }
  });
}
