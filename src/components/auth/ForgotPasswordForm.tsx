"use client";

import { useState, useCallback } from "react";
import TurnstileWidget from "@/components/TurnstileWidget";

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  const handleVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;

    if (!email?.trim()) {
      setError("Vui lòng nhập email");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstile_token: turnstileToken }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.");
      } else {
        setError(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div
          className="p-3 rounded-lg text-sm text-amber-400 border border-amber-400/20"
          style={{ background: "rgba(212,168,67,0.08)" }}
        >
          {success}
        </div>
      )}

      {error && (
        <div
          className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
          style={{ background: "rgba(239,68,68,0.08)" }}
        >
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
        <input
          name="email"
          type="email"
          placeholder="ban@email.com"
          className="input-dark w-full"
          required
        />
      </div>

      {/* Turnstile CAPTCHA */}
      <TurnstileWidget onVerify={handleVerify} />

      <button
        type="submit"
        disabled={loading}
        className="btn-green w-full justify-center py-2.5 mt-2 disabled:opacity-50"
      >
        {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
      </button>
    </form>
  );
}
