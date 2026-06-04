"use client";

// ──────────────────────────────────────────────────────────────────────────────
// PrintOnMount — auto-trigger `window.print()` ngay sau khi invoice mount.
// ──────────────────────────────────────────────────────────────────────────────
// Tách thành 1 client component nhỏ để page server vẫn render thuần SSR
// (fetch dữ liệu, no client JS) còn việc gọi browser API in được delegate
// xuống đây. Có:
//   - Delay nhỏ (~250ms) cho font/CSS load xong tránh in thiếu kiểu.
//   - Guard `printed` để không gọi lại khi React Strict Mode mount lần 2.
//   - Nút "In lại" để user trigger thủ công nếu prompt bị dismiss; ẩn khi
//     `@media print` (vì có attribute `data-print-hide`).
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";

export default function PrintOnMount() {
  const printedRef = useRef(false);

  useEffect(() => {
    if (printedRef.current) return;
    printedRef.current = true;

    // Đợi 1 frame + nhẹ để layout/CSS @page apply trước khi print.
    const timer = window.setTimeout(() => {
      try {
        window.print();
      } catch {
        // Một số browser block print khi không phải user gesture — bỏ qua
        // và để user bấm nút "In lại".
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      data-print-hide
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        display: "flex",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          padding: "8px 14px",
          background: "#D4A843",
          color: "#0a0a0a",
          border: "none",
          borderRadius: 6,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        In lại
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        style={{
          padding: "8px 14px",
          background: "transparent",
          color: "#f5f5f5",
          border: "1px solid #444",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Đóng
      </button>
    </div>
  );
}
