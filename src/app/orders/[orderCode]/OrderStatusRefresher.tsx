"use client";

/**
 * Client component: polls `/api/orders/check-status?order_code=...` mỗi
 * `intervalMs` (default 30s). Khi `status` trả về khác lần check trước,
 * gọi `router.refresh()` để Server Component re-fetch và render lại
 * timeline + shipment block.
 *
 * Quy tắc:
 *  - Skip poll khi tab ẩn (Page Visibility API) để tiết kiệm quota.
 *  - Skip poll khi status đã thuộc terminal set (delivered/completed/cancelled).
 *  - Best-effort: lỗi network → log + im lặng, không break UI.
 *  - Không render gì cả (chỉ side-effect).
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface OrderStatusRefresherProps {
  orderCode: string;
  intervalMs?: number;
}

const TERMINAL_STATUSES = new Set([
  "delivered",
  "completed",
  "cancelled",
  "refunded",
]);

export function OrderStatusRefresher({
  orderCode,
  intervalMs = 30000,
}: OrderStatusRefresherProps) {
  const router = useRouter();
  const lastStatusRef = useRef<string | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!orderCode) return;

    let cancelled = false;

    async function poll() {
      if (cancelled || stoppedRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        const res = await fetch(
          `/api/orders/check-status?order_code=${encodeURIComponent(orderCode)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { status?: string };
        const status = json.status ?? null;
        if (!status) return;

        if (
          lastStatusRef.current !== null &&
          lastStatusRef.current !== status
        ) {
          router.refresh();
        }
        lastStatusRef.current = status;

        if (TERMINAL_STATUSES.has(status)) {
          stoppedRef.current = true;
        }
      } catch (err) {
        // Im lặng — best-effort.
        if (process.env.NODE_ENV !== "production") {
          console.debug("[OrderStatusRefresher] poll error", err);
        }
      }
    }

    // Lần đầu chạy ngay để seed `lastStatusRef`.
    poll();
    const id = window.setInterval(poll, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderCode, intervalMs, router]);

  return null;
}
