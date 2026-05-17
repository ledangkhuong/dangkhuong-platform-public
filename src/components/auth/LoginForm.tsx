"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/components/auth/PasswordInput";
import TurnstileWidget from "@/components/TurnstileWidget";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
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
        body: JSON.stringify({ email, password, turnstileToken }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard");
        router.refresh();
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
          className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
          style={{ background: "rgba(239,68,68,0.08)" }}
        >
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
        <input name="email" type="email" placeholder="ban@email.com" className="input-dark w-full" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu</label>
        <PasswordInput name="password" placeholder="••••••••" />
      </div>

      {/* Honeypot — hidden from real users, bots auto-fill it */}
      <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true" tabIndex={-1}>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: "#D4A843" }} />
          <span className="text-sm text-gray-400">Ghi nhớ đăng nhập</span>
        </label>
        <Link href="/forgot-password" className="text-sm text-[#D4A843] hover:underline">
          Quên mật khẩu?
        </Link>
      </div>

      <TurnstileWidget onVerify={setTurnstileToken} />

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
