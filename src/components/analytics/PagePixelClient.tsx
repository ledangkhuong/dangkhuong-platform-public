"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { hasCookieConsent } from "@/components/CookieConsent";

/**
 * Client-side initializer cho per-page Facebook Pixel.
 *
 * - Chỉ load fbevents.js nếu user đã đồng ý cookie "marketing".
 * - Init Pixel bằng pixel_id riêng của slug (không phải pixel global trong env).
 * - Mỗi PageView được gán event_id (UUID) → POST song song lên /api/capi/track
 *   để CAPI server-side gửi cùng event_id → Meta dedupe.
 */
export default function PagePixelClient({
  slug,
  pixelId,
  hasCapi,
}: {
  slug: string;
  pixelId: string;
  hasCapi: boolean;
}) {
  const pathname = usePathname();
  const [consentGiven, setConsentGiven] = useState(false);
  const initialized = useRef(false);

  // Lắng nghe consent
  useEffect(() => {
    setConsentGiven(hasCookieConsent("marketing"));
    const onChange = () => setConsentGiven(hasCookieConsent("marketing"));
    window.addEventListener("dk_cookie_consent_change", onChange);
    return () => window.removeEventListener("dk_cookie_consent_change", onChange);
  }, []);

  // Init Pixel sau khi có consent
  useEffect(() => {
    if (!consentGiven || !pixelId || initialized.current) return;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) {
        // fbq đã có (do FacebookPixel global) — chỉ init thêm pixel này
        n = f.fbq;
      } else {
        n = f.fbq = function () {
          // eslint-disable-next-line prefer-rest-params
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      }
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */

    (window as unknown as { fbq: (...args: unknown[]) => void }).fbq("init", pixelId);
    initialized.current = true;
  }, [consentGiven, pixelId]);

  // PageView trên mọi route change — track cả Pixel + CAPI (nếu có token)
  useEffect(() => {
    if (!consentGiven || !pixelId) return;

    const eventId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Client-side Pixel
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === "function") {
      fbq("track", "PageView", {}, { eventID: eventId });
    }

    // Server-side CAPI (nếu config có token)
    if (hasCapi) {
      void fetch("/api/capi/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          slug,
          event_name: "PageView",
          event_id: eventId,
          source_url: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      }).catch(() => {
        /* never throw from analytics */
      });
    }
  }, [pathname, consentGiven, pixelId, slug, hasCapi]);

  // Noscript fallback (cho user tắt JS)
  if (!pixelId) return null;
  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
