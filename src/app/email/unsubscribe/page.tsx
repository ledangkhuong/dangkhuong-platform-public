"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const REASONS = [
  { value: "", label: "-- Chọn lý do (tuỳ chọn) --" },
  { value: "too_many", label: "Nhận quá nhiều email" },
  { value: "not_relevant", label: "Nội dung không phù hợp" },
  { value: "not_subscribed", label: "Không đăng ký" },
  { value: "other", label: "Khác" },
];

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid") || "";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [alreadyUnsubscribed, setAlreadyUnsubscribed] = useState(false);

  // Fetch subscriber info on load
  useEffect(() => {
    if (!emailParam) return;

    const params = new URLSearchParams();
    params.set("email", emailParam);
    if (sid) params.set("sid", sid);

    fetch(`/api/email/unsubscribe?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.subscriber?.already_unsubscribed) {
          setAlreadyUnsubscribed(true);
        }
      })
      .catch(() => {
        // Silent — page still works
      });
  }, [emailParam, sid]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          send_id: sid || undefined,
          reason: reason || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đã có lỗi xảy ra. Vui lòng thử lại.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "#0a0a0a",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              marginBottom: "16px",
              fontSize: "24px",
              fontWeight: 700,
              color: "#fff",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
            }}
          >
            ĐK
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          {success ? (
            /* Success state */
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "rgba(34,197,94,0.1)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: "8px",
                }}
              >
                Bạn đã huỷ đăng ký thành công
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  marginBottom: "24px",
                }}
              >
                Email <strong style={{ color: "#f5f5f5" }}>{email}</strong> sẽ
                không nhận thêm email từ chúng tôi.
              </p>
              <a
                href="https://dangkhuong.com"
                style={{
                  display: "inline-block",
                  padding: "10px 24px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                Quay về trang chủ
              </a>
            </div>
          ) : alreadyUnsubscribed ? (
            /* Already unsubscribed state */
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: "8px",
                }}
              >
                Đã huỷ đăng ký
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  marginBottom: "24px",
                }}
              >
                Email <strong style={{ color: "#f5f5f5" }}>{email}</strong> đã
                được huỷ đăng ký trước đó.
              </p>
              <a
                href="https://dangkhuong.com"
                style={{
                  display: "inline-block",
                  padding: "10px 24px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                Quay về trang chủ
              </a>
            </div>
          ) : (
            /* Unsubscribe form */
            <>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: "4px",
                  textAlign: "center",
                }}
              >
                Huỷ đăng ký nhận email
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  textAlign: "center",
                  marginBottom: "24px",
                }}
              >
                Chúng tôi sẽ ngừng gửi email đến địa chỉ này.
              </p>

              {error && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#f87171",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Email display */}
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#d1d5db",
                      marginBottom: "6px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly={!!emailParam}
                    placeholder="your@email.com"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #2a2a2a",
                      background: emailParam ? "#111" : "#1a1a1a",
                      color: "#f5f5f5",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      opacity: emailParam ? 0.7 : 1,
                    }}
                  />
                </div>

                {/* Reason select */}
                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#d1d5db",
                      marginBottom: "6px",
                    }}
                  >
                    Lý do (tuỳ chọn)
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #2a2a2a",
                      background: "#1a1a1a",
                      color: "#f5f5f5",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      WebkitAppearance: "none",
                      appearance: "none" as const,
                    }}
                  >
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !email}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "none",
                    background: loading ? "#991b1b" : "#dc2626",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading || !email ? 0.7 : 1,
                    transition: "background 0.2s, opacity 0.2s",
                  }}
                >
                  {loading ? "Đang xử lý..." : "Xác nhận huỷ đăng ký"}
                </button>
              </form>

              {/* Home link */}
              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <a
                  href="https://dangkhuong.com"
                  style={{
                    fontSize: "14px",
                    color: "#22c55e",
                    textDecoration: "none",
                  }}
                >
                  Quay về trang chủ
                </a>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#6b7280",
            marginTop: "24px",
          }}
        >
          dangkhuong.com
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#9ca3af",
          }}
        >
          Đang tải...
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
