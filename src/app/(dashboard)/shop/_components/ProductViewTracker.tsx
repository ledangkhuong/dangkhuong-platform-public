"use client";

/**
 * ProductViewTracker — Client Component fire `ViewContent` event lên cả
 * Pixel (fbq) + CAPI (/api/capi/track) cùng `eventId` để Meta dedupe.
 *
 * Mount: 1 lần khi PDP `/shop/[slug]` render xong.
 *
 * Props:
 *  - productId   → content_ids: [productId]
 *  - productName → content_name
 *  - price       → value
 *  - currency    → currency (default "VND")
 *  - slug        → slug của trang sản phẩm (route param, KHÔNG phải pixel
 *                  config slug). Hiện component fire qua pixel_config slug
 *                  cố định = "shop"; admin cần tạo config slug="shop" trong
 *                  /admin/pixel-settings. Slug sản phẩm chỉ append vào
 *                  custom_data để báo cáo nội bộ.
 *
 * Dedup contract:
 *  - Cùng `eventID` được gửi cho Pixel client-side + CAPI server-side.
 *  - Meta sẽ dedupe theo eventID + event_name + (~5min window) → 1 event count.
 *
 * Notes:
 *  - Strict-Mode-safe: dùng `useRef` để tránh fire 2 lần khi React 18/19
 *    double-invoke effect trong dev.
 *  - UTM/fbclid/gclid: extract từ URL hiện tại + referrer → gửi qua
 *    `custom_data` (CAPI route auto-merge attribution nếu nằm trong field
 *    `attribution`; ở đây ta gọi `trackPageEvent` chuyên dụng cho client
 *    → merge vào `customData` để Pixel cũng nhận).
 */

import { useEffect, useRef } from "react";

import { trackPageEvent } from "@/lib/pixel-tracker";

/** pixel_config slug — admin cần tạo entry này trong /admin/pixel-settings. */
const PIXEL_CONFIG_SLUG = "shop";

export interface ProductViewTrackerProps {
  productId: string;
  productName: string;
  price: number;
  currency?: string;
  /** Slug route của sản phẩm (ví dụ "ao-thun-den"). Append vào custom_data. */
  slug: string;
}

interface UrlAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  referrer?: string;
  landing_path?: string;
}

function extractAttribution(): UrlAttribution {
  if (typeof window === "undefined") return {};
  try {
    const url = new URL(window.location.href);
    const sp = url.searchParams;
    const pick = (k: string) => sp.get(k) || undefined;
    return {
      utm_source: pick("utm_source"),
      utm_medium: pick("utm_medium"),
      utm_campaign: pick("utm_campaign"),
      utm_term: pick("utm_term"),
      utm_content: pick("utm_content"),
      fbclid: pick("fbclid"),
      gclid: pick("gclid"),
      ttclid: pick("ttclid"),
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      landing_path: url.pathname,
    };
  } catch {
    return {};
  }
}

export default function ProductViewTracker({
  productId,
  productName,
  price,
  currency = "VND",
  slug,
}: ProductViewTrackerProps) {
  // Tránh double-fire trong React Strict Mode (effect chạy 2 lần ở dev).
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const attribution = extractAttribution();

    // Strip undefined keys để custom_data gọn.
    const cleanedAttribution: Record<string, string> = {};
    for (const [k, v] of Object.entries(attribution)) {
      if (typeof v === "string" && v.length > 0) cleanedAttribution[k] = v;
    }

    const customData: Record<string, unknown> = {
      content_ids: [productId],
      content_name: productName,
      content_type: "product",
      value: price,
      currency,
      product_slug: slug,
      ...cleanedAttribution,
    };

    trackPageEvent({
      slug: PIXEL_CONFIG_SLUG,
      eventName: "ViewContent",
      customData,
    });
  }, [productId, productName, price, currency, slug]);

  return null;
}
