"use client";

import { useState, useCallback } from "react";
import TurnstileWidget from "@/components/TurnstileWidget";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  const handleVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          turnstile_token: turnstileToken,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Đăng ký thành công! Cảm ơn bạn.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } catch {
      setStatus("error");
      setMessage("Không kết nối được. Vui lòng thử lại sau.");
    }
  };

  return (
    <div
      className="card-dark p-6 text-center"
      style={{ borderColor: "rgba(212,168,67,0.2)" }}
    >
      <div className="text-2xl mb-3">{"📬"}</div>
      <h3 className="font-bold text-white mb-1">
        Nhận bài viết mới mỗi tuần
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        Tham gia 1,200+ người đang nhận newsletter marketing thực chiến của{" "}
        Lê Đăng Khương
      </p>

      {status === "success" ? (
        <div className="flex items-center justify-center gap-2 text-[#D4A843] text-sm font-medium py-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13.3 4.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L6.6 9.6l5.3-5.3a1 1 0 0 1 1.4 0z" fill="currentColor"/>
          </svg>
          {message}
        </div>
      ) : (
        <div>
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="Email của bạn..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              required
              className="input-dark flex-1"
            />
            <button
              type="submit"
              disabled={status === "loading" || !email.trim()}
              className="btn-green shrink-0"
            >
              {status === "loading" ? "Đang xử lý..." : "Đăng ký"}
            </button>
          </form>
          <div className="mt-3 flex justify-center">
            <TurnstileWidget onVerify={handleVerify} />
          </div>
        </div>
      )}

      {status === "error" && message && (
        <p className="text-red-400 text-xs mt-2">{message}</p>
      )}
    </div>
  );
}
