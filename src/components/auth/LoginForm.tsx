"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  async function handleResendVerification() {
    if (resending || !unconfirmedEmail) return;
    setResending(true);
    setResendSuccess(false);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unconfirmedEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setResendSuccess(true);
      } else {
        setError(data.error || "Gửi lại thất bại. Vui lòng thử lại.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setEmailNotConfirmed(false);
    setResendSuccess(false);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string)?.trim();
    const password = form.get("password") as string;

    // Honeypot: if bot filled the hidden field, silently reject
    const honeypot = form.get("website") as string;
    if (honeypot) {
      // Fake success to not tip off bots
      await new Promise((r) => setTimeout(r, 1500));
      setLoading(false);
      return;
    }

    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        // Redirect back to intended page, or dashboard
        const redirectTo = searchParams.get("redirect") || "/dashboard";
        router.push(redirectTo);
        router.refresh();
      } else if (data.code === "email_not_confirmed") {
        setEmailNotConfirmed(true);
        setUnconfirmedEmail(data.email || email);
        setError("");
      } else {
        setError(data.error || "Email hoặc mật khẩu không đúng");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
          style={{ background: "rgba(239,68,68,0.08)" }}
        >
          {error}
        </div>
      )}

      {emailNotConfirmed && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-lg text-sm border"
          style={{
            background: "rgba(212,168,67,0.08)",
            borderColor: "rgba(212,168,67,0.25)",
          }}
        >
          <p className="text-[#D4A843] font-medium mb-2">
            Email chưa được xác nhận
          </p>
          <p className="text-gray-400 mb-3">
            Vui lòng kiểm tra hộp thư <strong className="text-white">{unconfirmedEmail}</strong> và
            nhấn vào link xác nhận. Kiểm tra cả mục <strong>Spam / Junk</strong>.
          </p>
          {resendSuccess ? (
            <p className="text-green-400 text-sm">
              Đã gửi lại email xác nhận! Vui lòng kiểm tra hộp thư.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all disabled:opacity-50"
              style={{
                background: "rgba(212,168,67,0.15)",
                color: "#D4A843",
                border: "1px solid rgba(212,168,67,0.3)",
              }}
            >
              {resending ? "Đang gửi..." : "Gửi lại email xác nhận"}
            </button>
          )}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
        <input id="email" name="email" type="email" placeholder="ban@email.com" className="input-dark w-full" required />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu</label>
        <PasswordInput id="password" name="password" placeholder="••••••••" />
      </div>

      {/* Honeypot — hidden from real users, bots auto-fill it */}
      <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true" tabIndex={-1}>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex items-center justify-end">
        <Link href="/forgot-password" className="text-sm text-[#D4A843] hover:underline">
          Quên mật khẩu?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-green w-full justify-center py-2.5 mt-2 disabled:opacity-50"
      >
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>

      <SocialLoginButtons />
    </form>
  );
}
