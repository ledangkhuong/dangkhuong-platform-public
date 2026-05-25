"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hasCookieConsent } from "@/components/CookieConsent";
import { getOrCreateVisitorIdClient } from "@/lib/visitor-id";
import { parseUserAgent } from "@/lib/user-agent";

/**
 * PageTracker — phía client, chạy trong root layout.
 *
 * - Bắt UTM, click IDs (fbclid/gclid/ttclid/msclkid), referrer, landing path,
 *   device info, affiliate ref code.
 * - Gắn visitor_id (cookie dk_vid, 2 năm) cho mọi visitor.
 * - POST sang /api/analytics/track — server ghi visitor_attribution lần đầu
 *   (frozen first-touch) + analytics_events cho mọi page view.
 * - Tuân thủ cookie consent "analytics".
 */
export default function PageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasCookieConsent("analytics")) return;

    // Ensure visitor_id cookie tồn tại
    const visitorId = getOrCreateVisitorIdClient();

    // Bắt UTM + click IDs từ URL hiện tại
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
    const clickIdKeys = ["fbclid", "gclid", "ttclid", "msclkid"] as const;

    const captured: Record<string, string> = {};
    for (const k of utmKeys) {
      const v = searchParams.get(k);
      if (v) captured[k] = v;
    }
    for (const k of clickIdKeys) {
      const v = searchParams.get(k);
      if (v) captured[k] = v;
    }

    // Affiliate ref code
    const ref = searchParams.get("ref");
    if (ref) captured.ref_code = ref;

    // Lưu/merge vào sessionStorage cho attribution xuyên suốt session
    if (Object.keys(captured).length > 0) {
      const stored = sessionStorage.getItem("dk_utm");
      const prev = stored ? (JSON.parse(stored) as Record<string, string>) : {};
      // Giữ UTM cũ nếu visit này không có UTM mới
      const merged = { ...prev, ...captured };
      sessionStorage.setItem("dk_utm", JSON.stringify(merged));
    }
    const storedUtm = sessionStorage.getItem("dk_utm");
    const sessionAttribution = storedUtm ? (JSON.parse(storedUtm) as Record<string, string>) : {};

    // Device info từ UA
    const ua = navigator.userAgent;
    const parsed = parseUserAgent(ua);

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event: "page_view",
        visitor_id: visitorId,
        properties: {
          path: pathname,
          url: window.location.href,
          referrer: document.referrer || null,
          title: document.title,
          device_type: parsed.deviceType,
          os: parsed.os,
          browser: parsed.browser,
          is_bot: parsed.isBot,
          // Hiện-tại UTM (URL params)
          ...captured,
          // Toàn-session UTM (merge với capture trước đó)
          session_attribution: sessionAttribution,
        },
      }),
    }).catch(() => {
      /* fire-and-forget, never throw from analytics */
    });
  }, [pathname, searchParams]);

  return null;
}
