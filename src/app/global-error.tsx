"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error("[Global Error Boundary]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Lỗi hệ thống — Lê Đăng Khương Academy</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #0a0a0a;
            color: #f5f5f5;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            text-align: center;
          }
          .glow {
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            width: 500px;
            height: 300px;
            border-radius: 50%;
            background: radial-gradient(circle, #D4A843, transparent 70%);
            opacity: 0.07;
            filter: blur(60px);
            pointer-events: none;
          }
          .container {
            position: relative;
            max-width: 480px;
            width: 100%;
          }
          .icon { font-size: 56px; margin-bottom: 16px; }
          h1 {
            font-size: clamp(22px, 5vw, 30px);
            font-weight: 800;
            margin-bottom: 10px;
            color: #f5f5f5;
          }
          .subtitle {
            font-size: 15px;
            color: #9ca3af;
            line-height: 1.6;
            margin-bottom: 8px;
          }
          .digest {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 8px;
            font-family: monospace;
          }
          .dev-error {
            margin: 16px 0;
            padding: 12px 16px;
            border-radius: 8px;
            background: rgba(239,68,68,0.08);
            border: 1px solid rgba(239,68,68,0.2);
            text-align: left;
            font-size: 12px;
            color: #fca5a5;
            font-family: monospace;
            word-break: break-word;
            max-height: 120px;
            overflow-y: auto;
          }
          .dev-error strong { color: #ef4444; }
          .actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 28px;
          }
          .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: #D4A843;
            color: #0a0a0a;
            font-weight: 700;
            font-size: 15px;
            padding: 13px 32px;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            width: 100%;
            transition: opacity 0.2s;
            font-family: inherit;
          }
          .btn-primary:hover { opacity: 0.88; }
          .btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: transparent;
            color: #9ca3af;
            font-weight: 600;
            font-size: 14px;
            padding: 12px 32px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.08);
            cursor: pointer;
            width: 100%;
            transition: border-color 0.2s, color 0.2s;
            font-family: inherit;
          }
          .btn-secondary:hover {
            border-color: rgba(255,255,255,0.18);
            color: #f5f5f5;
          }
          .divider {
            margin: 32px 0;
            height: 1px;
            background: rgba(255,255,255,0.06);
          }
          .brand {
            margin-top: 48px;
            font-size: 12px;
            color: #4b5563;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 20px;
            background: rgba(212,168,67,0.1);
            border: 1px solid rgba(212,168,67,0.2);
            color: #D4A843;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 20px;
          }
        `}</style>
      </head>
      <body>
        <div className="glow" aria-hidden="true" />

        <div className="container">
          {/* Brand badge */}
          <div className="badge">⚡ Lê Đăng Khương Academy</div>

          {/* Icon */}
          <div className="icon">🔧</div>

          {/* Heading */}
          <h1>Lỗi hệ thống</h1>

          {/* Sub-text */}
          <p className="subtitle">
            Đã xảy ra lỗi nghiêm trọng trong hệ thống.
            <br />
            Chúng tôi đang xử lý. Vui lòng thử lại sau.
          </p>

          {/* Error digest (safe to show) */}
          {error.digest && (
            <p className="digest">Mã lỗi: {error.digest}</p>
          )}

          {/* Dev-only error message */}
          {isDev && error.message && (
            <div className="dev-error">
              <strong>Dev:</strong> {error.message}
            </div>
          )}

          {/* Actions */}
          <div className="actions">
            <button className="btn-primary" onClick={reset}>
              🔄 Thử lại
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              ← Về trang chủ
            </button>
          </div>

          <div className="divider" />

          {/* Support hint */}
          <p style={{ fontSize: "13px", color: "#6b7280" }}>
            Nếu lỗi vẫn tiếp tục, hãy liên hệ hỗ trợ qua{" "}
            <a
              href="https://web.facebook.com/jackmadk13"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#D4A843", textDecoration: "none" }}
            >
              Facebook
            </a>
            .
          </p>

          <p className="brand">© 2026 Lê Đăng Khương Academy</p>
        </div>
      </body>
    </html>
  );
}
