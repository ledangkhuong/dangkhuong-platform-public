"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// ServerSideTracker — sends page_view to /api/event on every route change.
// Bypasses adblockers because the request goes to dangkhuong.com (first-party).
// Sits alongside the gtag.js client tracker — when both fire, GA4 dedupes by
// client_id, so we don't double-count users who don't block JS.
// ---------------------------------------------------------------------------

const GA_COOKIE_RE = /(?:^|;\s*)_ga=GA1\.\d+\.([\d.]+)/;

/** Read gtag.js's _ga cookie so server uses the same client_id as the browser. */
function getClientIdFromCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(GA_COOKIE_RE);
  return match?.[1];
}

async function postEvent(
  events: Array<{ name: string; params?: Record<string, unknown> }>,
) {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({
      events,
      clientId: getClientIdFromCookie(),
    });
    // sendBeacon survives page unloads (perfect for outbound clicks).
    const beaconOk =
      "sendBeacon" in navigator &&
      navigator.sendBeacon(
        "/api/event",
        new Blob([payload], { type: "application/json" }),
      );
    if (!beaconOk) {
      await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  } catch {
    // Silent — analytics must never break the page.
  }
}

function buildUrl(pathname: string, search: string): string {
  const q = search.length > 0 ? `?${search}` : "";
  return `${pathname}${q}`;
}

export default function ServerSideTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    const url = buildUrl(pathname, searchParams.toString());
    if (lastSentRef.current === url) return;
    lastSentRef.current = url;

    const pageLocation = `${window.location.origin}${url}`;
    void postEvent([
      {
        name: "page_view",
        params: {
          page_location: pageLocation,
          page_title: document.title || undefined,
          page_referrer: document.referrer || undefined,
          engagement_time_msec: 1,
        },
      },
    ]);
  }, [pathname, searchParams]);

  return null;
}
