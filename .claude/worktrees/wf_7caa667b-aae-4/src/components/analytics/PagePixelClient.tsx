"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { hasCookieConsent } from "@/components/CookieConsent";

/**
 * Client-side initializer cho per-page Facebook Pixel.
 *
 * Robust init pattern: poll consent + listen to change event + init exactly once
 * khi cả 2 điều kiện đủ (consent + pixelId). Tránh race condition với
 * CookieConsent auto-accept trên sales landings.
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
  const initialized = useRef(false);
  // QUAN TRỌNG: Khởi tạo bằng pathname hiện tại → SKIP initial PageView vì
  // AutoPixel inline script đã fire rồi (HTML parse time, trước hydration).
  // PagePixelClient chỉ fire PageView khi pathname THAY ĐỔI (SPA navigation).
  // Tránh duplicate PageView event với 2 eventID khác nhau → Meta dedupe fail.
  const lastFiredPath = useRef<string | null>(pathname);

  // Init Pixel + fire PageView. 1 useEffect duy nhất, không phụ thuộc state.
  // Re-run mỗi khi pathname đổi để fire PageView trên SPA navigation.
  useEffect(() => {
    if (!pixelId) return;

    const tryInitAndFire = (): boolean => {
      if (!hasCookieConsent("marketing")) return false;

      // KHÔNG init lại pixel ở đây — AutoPixel inline script đã init đúng
      // pixelId qua base code (cùng ID này) ở HTML parse time. Gọi
      // fbq('init', pixelId) lần nữa sẽ làm Meta SDK log warning:
      //   "[Meta Pixel] - Duplicate Pixel ID: ..."
      // → Pixel Helper nhận state lạ → báo dị thường. Chỉ cần đánh dấu init
      // = true để các nhánh khác (nếu có) bỏ qua.
      if (!initialized.current) {
        initialized.current = true;
      }

      // Fire PageView (once per pathname to avoid double-firing in StrictMode)
      if (lastFiredPath.current === pathname) return true;
      lastFiredPath.current = pathname;

      const eventId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
      if (typeof fbq === "function") {
        fbq("track", "PageView", {}, { eventID: eventId });
      }

      // Server-side CAPI
      if (hasCapi) {
        const url = new URL(window.location.href);
        const sp = url.searchParams;
        const attribution = {
          utm_source: sp.get("utm_source") || undefined,
          utm_medium: sp.get("utm_medium") || undefined,
          utm_campaign: sp.get("utm_campaign") || undefined,
          utm_term: sp.get("utm_term") || undefined,
          utm_content: sp.get("utm_content") || undefined,
          fbclid: sp.get("fbclid") || undefined,
          gclid: sp.get("gclid") || undefined,
          ttclid: sp.get("ttclid") || undefined,
          referrer: document.referrer || undefined,
          landing_path: url.pathname,
        };
        void fetch("/api/capi/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            slug,
            event_name: "PageView",
            event_id: eventId,
            source_url: window.location.href,
            attribution,
          }),
        }).catch(() => {
          /* never throw from analytics */
        });
      }

      return true;
    };

    // Thử init ngay
    if (tryInitAndFire()) return;

    // Chưa có consent — đăng ký listener + poll fallback (đề phòng race condition)
    const onConsentChange = () => {
      tryInitAndFire();
    };
    window.addEventListener("dk_cookie_consent_change", onConsentChange);

    // Poll lần nữa sau 100ms + 500ms + 1500ms để bắt CookieConsent auto-accept
    // (case này xảy ra khi auto-accept dispatch event TRƯỚC khi listener install)
    const t1 = setTimeout(tryInitAndFire, 100);
    const t2 = setTimeout(tryInitAndFire, 500);
    const t3 = setTimeout(tryInitAndFire, 1500);

    return () => {
      window.removeEventListener("dk_cookie_consent_change", onConsentChange);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, pixelId, slug, hasCapi]);

  // Noscript fallback
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
