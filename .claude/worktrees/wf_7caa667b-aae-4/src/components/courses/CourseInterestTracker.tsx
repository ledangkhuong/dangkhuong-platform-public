"use client";

import { useEffect } from "react";

interface CourseInterestTrackerProps {
  productId: string;
}

/**
 * Invisible component that fires a POST to /api/courses/interest
 * when an authenticated user views a course they haven't purchased.
 * Mounted only in the "authenticated but not enrolled" branch.
 */
export default function CourseInterestTracker({
  productId,
}: CourseInterestTrackerProps) {
  useEffect(() => {
    // Debounce: only track once per session per course
    const key = `interest_tracked_${productId}`;
    if (sessionStorage.getItem(key)) return;

    const controller = new AbortController();

    fetch("/api/courses/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
      signal: controller.signal,
    })
      .then(() => {
        sessionStorage.setItem(key, "1");
      })
      .catch(() => {
        // silently fail — tracking should never break UX
      });

    return () => controller.abort();
  }, [productId]);

  // This component renders nothing
  return null;
}
