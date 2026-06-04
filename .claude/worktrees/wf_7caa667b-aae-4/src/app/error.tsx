"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error("[Error Boundary]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#0a0a0a",
        color: "#f5f5f5",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        textAlign: "center",
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "500px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #ef4444, transparent 70%)",
          opacity: 0.06,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", maxWidth: "480px", width: "100%" }}>
        {/* Icon */}
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>⚠️</div>

        {/* Heading */}
        <h1
          style={{
            fontSize: "clamp(22px, 5vw, 30px)",
            fontWeight: 800,
            margin: "0 0 10px",
            color: "#f5f5f5",
          }}
        >
          Đã xảy ra lỗi
        </h1>

        {/* Sub-text */}
        <p
          style={{
            fontSize: "15px",
            color: "#9ca3af",
            lineHeight: 1.6,
            margin: "0 0 8px",
          }}
        >
          Có sự cố xảy ra trong quá trình tải trang.
          <br />
          Vui lòng thử lại hoặc quay về trang chủ.
        </p>

        {/* Error digest (safe to show) */}
        {error.digest && (
          <p
            style={{
              fontSize: "11px",
              color: "#6b7280",
              marginBottom: "8px",
              fontFamily: "monospace",
            }}
          >
            Mã lỗi: {error.digest}
          </p>
        )}

        {/* Dev-only error message */}
        {isDev && error.message && (
          <div
            style={{
              margin: "16px 0",
              padding: "12px 16px",
              borderRadius: "8px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              textAlign: "left",
              fontSize: "12px",
              color: "#fca5a5",
              fontFamily: "monospace",
              wordBreak: "break-word",
              maxHeight: "120px",
              overflowY: "auto",
            }}
          >
            <strong style={{ color: "#ef4444" }}>Dev:</strong> {error.message}
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginTop: "28px",
          }}
        >
          {/* Primary: Try again */}
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              backgroundColor: "#D4A843",
              color: "#0a0a0a",
              fontWeight: 700,
              fontSize: "15px",
              padding: "13px 32px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              width: "100%",
              transition: "opacity 0.2s",
            }}
            onMouseOver={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")
            }
            onMouseOut={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
            }
          >
            🔄 Thử lại
          </button>

          {/* Secondary: Home */}
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              backgroundColor: "transparent",
              color: "#9ca3af",
              fontWeight: 600,
              fontSize: "14px",
              padding: "12px 32px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              textDecoration: "none",
              width: "100%",
              boxSizing: "border-box",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseOver={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = "rgba(255,255,255,0.18)";
              el.style.color = "#f5f5f5";
            }}
            onMouseOut={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = "rgba(255,255,255,0.08)";
              el.style.color = "#9ca3af";
            }}
          >
            ← Về trang chủ
          </Link>
        </div>

        {/* Branding */}
        <p
          style={{
            marginTop: "48px",
            fontSize: "12px",
            color: "#4b5563",
          }}
        >
          © 2026 Lê Đăng Khương Academy
        </p>
      </div>
    </div>
  );
}
