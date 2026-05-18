"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pageview } from "@/lib/gtag";
import WebVitals from "./WebVitals";

/**
 * Client-side analytics wrapper.
 *
 * - Tracks GA4 page views whenever the route changes.
 * - Renders the <WebVitals /> reporter.
 *
 * Usage (in app/layout.tsx, inside a <Suspense>):
 *   <AnalyticsProvider />
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page view on every route change
  useEffect(() => {
    if (!pathname) return;

    const url = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    pageview(url);
  }, [pathname, searchParams]);

  return <WebVitals />;
}
