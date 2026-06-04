"use client";

import { useEffect, useState } from "react";
import { isInAppBrowser, getInAppBrowserName } from "@/lib/user-agent";

/**
 * Global banner shown when the site is opened inside an in-app browser
 * (Zalo, Facebook, Instagram, etc.). These browsers block Google OAuth
 * with 403 disallowed_useragent. The banner guides users to open in
 * Chrome/Safari for full functionality.
 */
export default function InAppBrowserBanner() {
  const [show, setShow] = useState(false);
  const [appName, setAppName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isInAppBrowser()) {
      setShow(true);
      setAppName(getInAppBrowserName());
    }
  }, []);

  if (!show || dismissed) return null;

  const isIOS =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Warning icon */}
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {appName
                ? `Ban dang mo trang trong ${appName}`
                : "Ban dang dung trinh duyet trong ung dung"}
            </p>
            <p className="text-xs mt-1 opacity-90 leading-relaxed">
              Dang nhap bang Google/Facebook se khong hoat dong trong trinh duyet nay.
              Vui long mo bang Chrome hoac Safari:
            </p>

            {/* Instructions */}
            <div className="mt-2 flex flex-wrap gap-2">
              {isIOS ? (
                <button
                  onClick={() => {
                    // iOS: try to open in Safari using window.open
                    window.open(window.location.href, "_blank");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md text-xs font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Mo trong Safari
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Android: intent:// URL to open in Chrome
                    const url = window.location.href;
                    window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md text-xs font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Mo trong Chrome
                </button>
              )}

              <button
                onClick={() => {
                  // Copy URL to clipboard for manual paste
                  navigator.clipboard?.writeText(window.location.href).then(() => {
                    const btn = document.getElementById("copy-url-btn");
                    if (btn) btn.textContent = "Da sao chep!";
                    setTimeout(() => {
                      if (btn) btn.textContent = "Sao chep link";
                    }, 2000);
                  });
                }}
                id="copy-url-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md text-xs font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Sao chep link
              </button>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Dong"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
