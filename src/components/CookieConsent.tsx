"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

// Routes where the cookie banner should never appear (long-form sales pages)
const HIDE_ON_PATHS = ["/hocchuaxongtiendave"];

export interface CookiePreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
};

/** Read granular cookie preferences from localStorage. */
export function getCookiePreferences(): CookiePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  const raw = localStorage.getItem("dk_cookie_preferences");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        essential: true,
        analytics: !!parsed.analytics,
        marketing: !!parsed.marketing,
      };
    } catch {
      // Corrupted — fall through
    }
  }

  // Legacy migration: if old key exists but new one does not
  const legacy = localStorage.getItem("dk_cookie_consent");
  if (legacy === "accepted") {
    return { essential: true, analytics: true, marketing: true };
  }
  if (legacy === "declined") {
    return DEFAULT_PREFERENCES;
  }

  return DEFAULT_PREFERENCES;
}

/** Check whether a specific cookie category is allowed. */
export function hasCookieConsent(
  category: "essential" | "analytics" | "marketing",
): boolean {
  const prefs = getCookiePreferences();
  return prefs[category];
}

/** Check whether the user has made any consent decision at all. */
export function hasConsentDecision(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem("dk_cookie_preferences") !== null ||
    localStorage.getItem("dk_cookie_consent") !== null
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
        transition-colors duration-200
        ${checked ? "bg-[#D4A843]" : "bg-[#444]"}
        ${disabled ? "opacity-60 cursor-not-allowed" : ""}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}

export default function CookieConsent() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const hidden = HIDE_ON_PATHS.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (hidden) return;
    if (!hasConsentDecision()) {
      setShow(true);
    }
  }, [hidden]);

  if (hidden) return null;

  /** Persist preferences and dispatch change events. */
  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("dk_cookie_preferences", JSON.stringify(prefs));
    // Keep legacy key in sync for any code that still reads it
    const allAccepted = prefs.analytics && prefs.marketing;
    localStorage.setItem(
      "dk_cookie_consent",
      allAccepted ? "accepted" : "declined",
    );
    setShow(false);

    // Notify other components in the same tab
    window.dispatchEvent(new Event("dk_cookie_consent_change"));

    // Record consent server-side for GDPR/PDPA audit trail
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "cookie_consent",
        properties: {
          decision: allAccepted ? "accepted_all" : "custom",
          analytics: prefs.analytics,
          marketing: prefs.marketing,
        },
      }),
    }).catch(() => {});
  };

  const acceptAll = () => {
    savePreferences({ essential: true, analytics: true, marketing: true });
  };

  const declineAll = () => {
    savePreferences({ essential: true, analytics: false, marketing: false });
  };

  const saveCustom = () => {
    savePreferences({ essential: true, analytics, marketing });
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#111] border-t border-[#333]">
      <div className="max-w-4xl mx-auto">
        {/* ── Main banner ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-gray-300">
            Trang web sử dụng cookie để cải thiện trải nghiệm của bạn.
            Xem{" "}
            <a
              href="/privacy-policy"
              className="text-[#D4A843] hover:underline"
            >
              Chính sách bảo mật
            </a>{" "}
            để biết thêm chi tiết.
          </p>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setShowCustomize((v) => !v)}
              className="px-4 py-2 text-sm text-[#D4A843] hover:text-white border border-[#D4A843] rounded-lg transition-colors"
            >
              Tùy chỉnh
            </button>
            <button
              onClick={declineAll}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-[#333] rounded-lg transition-colors"
            >
              Từ chối
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2 text-sm bg-[#D4A843] text-black font-medium rounded-lg hover:bg-[#c49a3a] transition-colors"
            >
              Chấp nhận
            </button>
          </div>
        </div>

        {/* ── Granular customization panel ── */}
        {showCustomize && (
          <div className="mt-4 pt-4 border-t border-[#333] space-y-4">
            {/* Essential */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  Cookie thiết yếu
                </p>
                <p className="text-xs text-gray-400">
                  Bắt buộc để trang web hoạt động. Không thể tắt.
                </p>
              </div>
              <Toggle checked disabled />
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  Cookie phân tích
                </p>
                <p className="text-xs text-gray-400">
                  Google Analytics, theo dõi lượt xem trang và hành vi sử dụng.
                </p>
              </div>
              <Toggle checked={analytics} onChange={setAnalytics} />
            </div>

            {/* Marketing */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  Cookie tiếp thị
                </p>
                <p className="text-xs text-gray-400">
                  Facebook Pixel, quảng cáo và nhận diện đối tượng.
                </p>
              </div>
              <Toggle checked={marketing} onChange={setMarketing} />
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveCustom}
                className="px-4 py-2 text-sm bg-[#D4A843] text-black font-medium rounded-lg hover:bg-[#c49a3a] transition-colors"
              >
                Lưu tùy chọn
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
