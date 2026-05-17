"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user already consented
    const consent = localStorage.getItem("dk_cookie_consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("dk_cookie_consent", "accepted");
    setShow(false);

    // Record consent server-side for GDPR/PDPA audit trail
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "cookie_consent",
        properties: { decision: "accepted" },
      }),
    }).catch(() => {});
  };

  const decline = () => {
    // Only store locally — do not fire tracking API since user declined consent
    localStorage.setItem("dk_cookie_consent", "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#111] border-t border-[#333]">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-300">
          Trang web sử dụng cookie để cải thiện trải nghiệm của bạn.
          Xem{" "}
          <a href="/privacy-policy" className="text-[#D4A843] hover:underline">
            Chính sách bảo mật
          </a>{" "}
          để biết thêm chi tiết.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-[#333] rounded-lg transition-colors"
          >
            Từ chối
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm bg-[#D4A843] text-black font-medium rounded-lg hover:bg-[#c49a3a] transition-colors"
          >
            Chấp nhận
          </button>
        </div>
      </div>
    </div>
  );
}
