"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SocialLoginButtons() {
  const [loading, setLoading] = useState<"google" | null>(null);

  async function handleSocialLogin(provider: "google") {
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

      {/* Google */}
      <button
        type="button"
        onClick={() => handleSocialLogin("google")}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          color: "#e5e5e5",
        }}
      >
        {loading === "google" ? (
          <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        {loading === "google" ? "Đang kết nối..." : "Đăng nhập bằng Google"}
      </button>

    </div>
  );
}
