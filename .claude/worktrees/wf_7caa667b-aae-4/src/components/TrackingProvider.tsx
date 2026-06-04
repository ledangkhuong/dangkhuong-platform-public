"use client";

/**
 * TrackingProvider — client wrapper that auto-tracks:
 *   - scroll_depth (25/50/75/100% thresholds, each fires once per page)
 *   - time_on_page (visible time, sent on visibility change / unload)
 *
 * NOTE: page_view events are already handled by the existing PageTracker
 * component in layout.tsx. This provider complements it with engagement
 * metrics without duplicating page view tracking.
 *
 * Place in layout.tsx alongside (not replacing) PageTracker:
 *   <TrackingProvider>
 *     <main>{children}</main>
 *   </TrackingProvider>
 *
 * Does not render any DOM — just wraps children and attaches listeners.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  trackScrollDepth,
  trackTimeOnPage,
  registerGlobalUnloadFlush,
} from "@/lib/tracking";

interface TrackingProviderProps {
  children: ReactNode;
}

export default function TrackingProvider({ children }: TrackingProviderProps) {
  const pathname = usePathname();
  const cleanupRef = useRef<(() => void)[]>([]);

  // Register the global unload flush handler once
  useEffect(() => {
    registerGlobalUnloadFlush();
  }, []);

  // Set up scroll depth + time on page tracking per route change
  useEffect(() => {
    // Clean up previous page's trackers
    for (const cleanup of cleanupRef.current) {
      try {
        cleanup();
      } catch {
        /* swallow */
      }
    }
    cleanupRef.current = [];

    // Small delay to let the new page render and settle
    const timer = setTimeout(() => {
      const cleanupScroll = trackScrollDepth(pathname);
      const cleanupTime = trackTimeOnPage(pathname);
      cleanupRef.current = [cleanupScroll, cleanupTime];
    }, 100);

    return () => {
      clearTimeout(timer);
      for (const cleanup of cleanupRef.current) {
        try {
          cleanup();
        } catch {
          /* swallow */
        }
      }
      cleanupRef.current = [];
    };
  }, [pathname]);

  return <>{children}</>;
}
