"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { FB_PIXEL_ID, pageview } from "@/lib/fbpixel";

function hasConsent(): boolean {
  return (
    typeof window !== "undefined" &&
    localStorage.getItem("dk_cookie_consent") === "accepted"
  );
}

export default function FacebookPixel() {
  const pathname = usePathname();
  const [consentGiven, setConsentGiven] = useState(false);

  // Check consent on mount and listen for changes
  useEffect(() => {
    setConsentGiven(hasConsent());

    // Listen for consent changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "dk_cookie_consent") {
        setConsentGiven(e.newValue === "accepted");
      }
    };

    // Listen for consent changes within the same tab (custom event)
    const handleConsentChange = () => {
      setConsentGiven(hasConsent());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("dk_cookie_consent_change", handleConsentChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "dk_cookie_consent_change",
        handleConsentChange,
      );
    };
  }, []);

  // Initialize Facebook Pixel only after consent
  useEffect(() => {
    if (!FB_PIXEL_ID || !consentGiven) return;

    // Initialize Facebook Pixel
    /* eslint-disable */
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
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
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */

    window.fbq("init", FB_PIXEL_ID);
    window.fbq("track", "PageView");
  }, [consentGiven]);

  // Track page views on route changes (only if consent given)
  useEffect(() => {
    if (!FB_PIXEL_ID || !consentGiven) return;
    pageview();
  }, [pathname, consentGiven]);

  if (!FB_PIXEL_ID || !consentGiven) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
