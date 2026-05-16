"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Detect in-app browsers (Facebook, Zalo, Instagram, TikTok, Line, etc.)
 * Google OAuth blocks these with 403: disallowed_useragent
 */
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const patterns = [
    "FBAN", "FBAV",           // Facebook
    "FB_IAB",                 // Facebook In-App Browser
    "Instagram",              // Instagram
    "Line/",                  // Line
    "KAKAOTALK",              // KakaoTalk
    "MicroMessenger",         // WeChat / Zalo uses similar pattern
    "ZaloTheme", "Zalo",      // Zalo
    "Twitter",                // Twitter/X
    "TikTok",                 // TikTok
    "Snapchat",               // Snapchat
    "Pinterest",              // Pinterest
    "LinkedInApp",            // LinkedIn
  ];
  return patterns.some((p) => ua.includes(p));
}

/** Get the detected app name for user-friendly messaging */
function getInAppName(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent || "";
  if (ua.includes("FBAN") || ua.includes("FBAV") || ua.includes("FB_IAB")) return "Facebook";
  if (ua.includes("ZaloTheme") || ua.includes("Zalo")) return "Zalo";
  if (ua.includes("Instagram")) return "Instagram";
  if (ua.includes("TikTok")) return "TikTok";
  if (ua.includes("Line/")) return "Line";
  if (ua.includes("MicroMessenger")) return "Zalo/WeChat";
  if (ua.includes("Twitter")) return "Twitter";
  return "ứng dụng";
}

export default function SocialLoginButtons() {
  const [loading, setLoading] = useState<"google" | null>(null);
  const [inAppDetected, setInAppDetected] = useState(false);
  const [appName, setAppName] = useState("");
  const [showCopyTip, setShowCopyTip] = useState(false);

  useEffect(() => {
    const detected = isInAppBrowser();
    setInAppDetected(detected);
    if (detected) {
      setAppName(getInAppName());
    }
  }, []);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShowCopyTip(true);
      setTimeout(() => setShowCopyTip(false), 2000);
    });
  }

  async function handleSocialLogin(provider: "google") {
    // Block OAuth in in-app browsers
    if (inAppDetected) return;

    setLoading(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
        },
      });
      if (error) {
        console.error("OAuth error:", error.message);
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-[#2a2a2a]" />
        <span className="text-xs text-gray-500">hoặc tiếp tục với</span>
        <div className="flex-1 h-px bg-[#2a2a2a]" />
      </div>

      {/* In-app browser warning */}
      {inAppDetected && (
        <div
          className="rounded-xl p-4 text-sm space-y-3"
          style={{
            background: "rgba(234, 179, 8, 0.08)",
            border: "1px solid rgba(234, 179, 8, 0.25)",
          }}
        >
          <div className="flex items-start gap-2.5">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-400 mb-1">
                Không thể đăng nhập Google từ {appName}
              </p>
              <p className="text-gray-300 leading-relaxed">
                Google chặn đăng nhập từ trình duyệt trong {appName}.
                Vui lòng mở trang này bằng <strong className="text-white">Chrome</strong> hoặc <strong className="text-white">Safari</strong>:
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2 pl-7">
            <div className="flex items-center gap-2 text-gray-300">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center">1</span>
              <span>Nhấn nút <strong className="text-white">⋯</strong> hoặc <strong className="text-white">≡</strong> góc trên phải</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center">2</span>
              <span>Chọn <strong className="text-white">&quot;Mở trong trình duyệt&quot;</strong></span>
            </div>
          </div>

          {/* Copy link button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95"
            style={{
              background: "rgba(234, 179, 8, 0.15)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              color: "#EAB308",
            }}
          >
            {showCopyTip ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Đã copy link!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy link — dán vào Chrome/Safari
              </>
            )}
          </button>

          {/* Fallback: still can use email login */}
          <p className="text-xs text-gray-500 text-center">
            Hoặc đăng nhập bằng email bên dưới
          </p>
        </div>
      )}

      {/* Google Button */}
      <button
        type="button"
        onClick={() => handleSocialLogin("google")}
        disabled={loading !== null || inAppDetected}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: inAppDetected ? "#111" : "#1a1a1a",
          border: `1px solid ${inAppDetected ? "#1a1a1a" : "#2a2a2a"}`,
          color: inAppDetected ? "#666" : "#e5e5e5",
        }}
      >
        {loading === "google" ? (
          <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ opacity: inAppDetected ? 0.3 : 1 }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        {loading === "google" ? "Đang kết nối..." : inAppDetected ? "Google (không khả dụng)" : "Đăng nhập bằng Google"}
      </button>

    </div>
  );
}
