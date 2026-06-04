/* Plain <a> tags used instead of next/link to avoid prerender serialization issues */
import { siteConfig } from "@/lib/site-config";

export default function NotFound() {
  return (
    <html lang="vi">
      <body style={{ background: "#0a0a0a", color: "#f5f5f5", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
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
              background: "radial-gradient(circle, #D4A843, transparent 70%)",
              opacity: 0.08,
              filter: "blur(60px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", maxWidth: "480px", width: "100%" }}>
            {/* 404 number */}
            <div
              style={{
                fontSize: "clamp(80px, 20vw, 140px)",
                fontWeight: 900,
                lineHeight: 1,
                background: "linear-gradient(135deg, #D4A843, #FBBF24)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: "8px",
                letterSpacing: "-4px",
              }}
            >
              404
            </div>

            {/* Icon */}
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>🗺️</div>

            {/* Heading */}
            <h1
              style={{
                fontSize: "clamp(22px, 5vw, 32px)",
                fontWeight: 800,
                margin: "0 0 12px",
                color: "#f5f5f5",
              }}
            >
              Không tìm thấy trang
            </h1>

            {/* Sub-text */}
            <p
              style={{
                fontSize: "15px",
                color: "#9ca3af",
                lineHeight: 1.6,
                margin: "0 0 32px",
              }}
            >
              Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
              <br />
              Hãy quay về trang chủ để tiếp tục.
            </p>

            {/* CTA Button */}
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#D4A843",
                color: "#0a0a0a",
                fontWeight: 700,
                fontSize: "15px",
                padding: "13px 32px",
                borderRadius: "10px",
                textDecoration: "none",
              }}
            >
              ← Về trang chủ
            </a>

            {/* Divider */}
            <div
              style={{
                margin: "32px 0",
                height: "1px",
                background: "rgba(255,255,255,0.06)",
              }}
            />

            {/* Quick links */}
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
              Hoặc truy cập nhanh:
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              {[
                { label: "Khoá học", href: "/courses" },
                { label: "Blog", href: "/blog" },
                { label: "Đăng nhập", href: "/login" },
                { label: "Cộng đồng", href: "/community" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: "13px",
                    color: "#D4A843",
                    textDecoration: "none",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "1px solid rgba(212,168,67,0.25)",
                    background: "rgba(212,168,67,0.06)",
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Branding */}
            <p
              style={{
                marginTop: "48px",
                fontSize: "12px",
                color: "#4b5563",
              }}
            >
              {siteConfig.footer.copyright}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
