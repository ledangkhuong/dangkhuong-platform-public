"use client";

/**
 * PurchaseTracker — fire Meta Purchase event (Pixel + CAPI) one-time on success page mount.
 *
 * Dedup strategy:
 *  - Deterministic eventId = `purchase_${orderCode}` → Meta sẽ tự dedupe nếu user
 *    refresh hoặc trang được mount lại (cùng eventId → cùng Purchase event).
 *  - Thêm sessionStorage guard `dk_purchase_fired_${orderCode}` để skip ngay từ
 *    client side, không gọi network lặp lại trong cùng tab session.
 *
 * Cleanup sessionStorage 'dk_checkout_event_id' (set bởi InitiateCheckout flow,
 * nếu có) để tránh leak event_id qua đơn sau.
 *
 * Component này không render UI — analytics-only side effect.
 */

import { useEffect } from "react";

import { trackPageEvent } from "@/lib/pixel-tracker";

interface PurchaseTrackerItem {
  /** product_id (UUID string) — dùng làm content_ids cho Meta catalog matching. */
  id: string;
  /** Quantity của line item. */
  quantity: number;
}

interface PurchaseTrackerProps {
  orderCode: string;
  value: number;
  currency: string;
  items: PurchaseTrackerItem[];
}

export default function PurchaseTracker({
  orderCode,
  value,
  currency,
  items,
}: PurchaseTrackerProps) {
  useEffect(() => {
    if (!orderCode) return;

    // Deterministic eventId — same orderCode always produces same eventId,
    // so retry / refresh sẽ được Meta dedupe tự nhiên.
    const eventId = `purchase_${orderCode}`;

    // Client-side guard: skip nếu đã fire trong cùng tab session.
    const guardKey = `dk_purchase_fired_${orderCode}`;
    try {
      if (
        typeof window !== "undefined" &&
        window.sessionStorage.getItem(guardKey) === "1"
      ) {
        return;
      }
    } catch {
      /* sessionStorage có thể bị block — vẫn tiếp tục fire, Meta dedup vẫn lo. */
    }

    const contentIds = items.map((i) => i.id);
    const numItems = items.reduce(
      (sum, i) => sum + (Number.isFinite(i.quantity) ? i.quantity : 0),
      0,
    );

    trackPageEvent({
      slug: "shop",
      eventName: "Purchase",
      customData: {
        value,
        currency,
        content_ids: contentIds,
        content_type: "product",
        num_items: numItems,
        order_id: orderCode,
      },
      eventId,
    });

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(guardKey, "1");
        // Clear InitiateCheckout event_id (nếu flow trước có set) để tránh leak.
        window.sessionStorage.removeItem("dk_checkout_event_id");
      }
    } catch {
      /* ignore storage errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
