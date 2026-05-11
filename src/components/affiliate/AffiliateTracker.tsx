"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * AffiliateTracker — Gắn vào root layout, tracking ref code trên MỌI trang.
 *
 * Khi user truy cập bất kỳ URL nào có ?ref=ABC123:
 * 1. Ghi nhận click qua API (IP, user agent, page URL)
 * 2. Lưu cookie dk_ref = ABC123 (90 ngày, last-click attribution)
 *
 * Cookie này sẽ được đọc khi user mua khoá học để ghi nhận hoa hồng.
 */
export default function AffiliateTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || ref.length < 4 || ref.length > 20) return;

    const refCode = ref.toUpperCase();

    // Last-click attribution: luôn ghi đè ref mới nhất
    // Gửi click tracking (fire-and-forget)
    fetch("/api/affiliate/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref_code: refCode,
        page_url: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});

    // Set first-party cookie 90 ngày
    const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `dk_ref=${refCode};path=/;expires=${expires};SameSite=Lax`;
  }, [searchParams]);

  return null;
}
