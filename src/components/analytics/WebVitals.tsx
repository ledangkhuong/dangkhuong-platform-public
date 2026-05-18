"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useCallback, useRef } from "react";
import { IS_GA_ENABLED } from "@/lib/gtag";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

interface VitalEntry {
  name: string;
  value: number;
  id: string;
  rating?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BATCH_INTERVAL_MS = 2_500; // flush every 2.5 s
const TRACKED_METRICS = new Set([
  "CLS",
  "FID",
  "FCP",
  "LCP",
  "TTFB",
  "INP",
]);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Collects Web Vitals (CLS, FID, FCP, LCP, TTFB, INP) and forwards them
 * to Google Analytics 4 as custom events.  In development mode the metrics
 * are also logged to the browser console.
 *
 * Reports are batched to avoid excessive network calls.
 */
export default function WebVitals() {
  const queueRef = useRef<VitalEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callback reference (required by Next.js docs).
  const handleMetric: ReportWebVitalsCallback = useCallback((metric) => {
    if (!TRACKED_METRICS.has(metric.name)) return;

    // Log in development
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(
        `[WebVital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating ?? "n/a"})`,
      );
    }

    const entry: VitalEntry = {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
    };

    queueRef.current.push(entry);

    // Schedule a flush if one isn't pending already
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        flushQueue(queueRef.current);
        queueRef.current = [];
        timerRef.current = null;
      }, BATCH_INTERVAL_MS);
    }
  }, []);

  useReportWebVitals(handleMetric);

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Send all queued metrics to GA4 in one go.  Falls back to `sendBeacon`
 * where available so the reports survive page unloads.
 */
function flushQueue(entries: VitalEntry[]) {
  if (entries.length === 0) return;

  // Forward each entry to GA4 if available
  if (IS_GA_ENABLED && typeof window !== "undefined" && window.gtag) {
    for (const entry of entries) {
      window.gtag("event", entry.name, {
        // CLS is reported as a fraction -- multiply to get a usable integer
        value: Math.round(
          entry.name === "CLS" ? entry.value * 1000 : entry.value,
        ),
        event_label: entry.id,
        non_interaction: true,
      });
    }
  }
}
