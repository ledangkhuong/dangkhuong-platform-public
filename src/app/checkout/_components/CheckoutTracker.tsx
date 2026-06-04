"use client";

/**
 * CheckoutTracker — fire InitiateCheckout event (Pixel + CAPI) đúng 1 lần
 * khi user vào trang /checkout.
 *
 * Pattern dedup chuẩn của project (xem `src/lib/pixel-tracker.ts`):
 *  - Cùng 1 `eventId` được dùng cho cả fbq client-side lẫn POST /api/capi/track
 *    → Meta tự dedup, không bị double count.
 *
 * Vì sao tách thành component riêng (thay vì gọi trong CheckoutFlow useEffect)?
 *  - CheckoutFlow đã rất phức tạp (reducer, multi-step, sessionStorage,
 *    URL sync). Giữ analytics ra ngoài để dễ tắt/đổi/test.
 *  - Component này KHÔNG render gì cả (return null), chỉ là "side-effect host"
 *    — pattern quen thuộc trong storefront/analytics layer.
 *
 * eventId được persist vào `sessionStorage` key `dk_checkout_event_id` để
 * trang `/checkout/success` (Purchase event ở Week 8 step kế tiếp) có thể
 * đọc lại — Meta khuyến nghị share eventId giữa InitiateCheckout & Purchase
 * cho cùng 1 session để attribution funnel chính xác.
 *
 * Slug `'shop'` khớp với `pixel_config` của trang /shop (xem AutoPixel + DB
 * seed). Vì /checkout là dynamic per-user, không có pixel_config riêng → reuse
 * slug 'shop' để CAPI có context Pixel ID đúng.
 */

import { useEffect, useRef } from "react";

import { trackPageEvent } from "@/lib/pixel-tracker";

export interface CheckoutTrackerProps {
  /** Tổng tiền (VND, đã tính giỏ hàng — chưa cộng ship). */
  cartSubtotal: number;
  /** Σ quantity của items trong giỏ. */
  itemCount: number;
}

/** Key sessionStorage để chia sẻ eventId với Purchase event ở /checkout/success. */
const CHECKOUT_EVENT_ID_KEY = "dk_checkout_event_id";

export default function CheckoutTracker({
  cartSubtotal,
  itemCount,
}: CheckoutTrackerProps) {
  // useRef để chắc chắn effect chỉ fire 1 lần ngay cả khi React 19 / Strict
  // Mode mount-unmount-remount component (dev-only behavior). Không dùng
  // dependency array trick vì props có thể đổi do parent re-render.
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Generate + fire — pixel-tracker tự tạo eventId nếu không truyền vào.
    const eventId = trackPageEvent({
      slug: "shop",
      eventName: "InitiateCheckout",
      customData: {
        num_items: itemCount,
        value: cartSubtotal,
        currency: "VND",
      },
    });

    // Persist eventId để Purchase event (success page) reuse → Meta dedup
    // toàn bộ funnel theo cùng 1 event_id chain.
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(CHECKOUT_EVENT_ID_KEY, eventId);
      }
    } catch {
      // sessionStorage có thể bị disable (private mode iOS) — nuốt lỗi,
      // analytics fail không được block UX.
    }
    // Chỉ fire 1 lần lúc mount — itemCount/cartSubtotal chỉ là snapshot
    // tại thời điểm user vào /checkout. Nếu user back ra /cart sửa rồi vào
    // lại, component sẽ remount và fire lại 1 lần nữa (đúng hành vi mong muốn).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
