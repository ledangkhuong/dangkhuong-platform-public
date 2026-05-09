"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmParams: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
      const v = searchParams.get(k);
      if (v) utmParams[k] = v;
    });

    // Store UTMs in sessionStorage for attribution
    if (Object.keys(utmParams).length > 0) {
      sessionStorage.setItem("dk_utm", JSON.stringify(utmParams));
    }

    const storedUtm = sessionStorage.getItem("dk_utm");
    const utm = storedUtm ? JSON.parse(storedUtm) : {};

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "page_view",
        properties: {
          path: pathname,
          referrer: document.referrer,
          title: document.title,
          ...utm,
        },
      }),
    }).catch(() => {}); // fire-and-forget
  }, [pathname, searchParams]);

  return null;
}
