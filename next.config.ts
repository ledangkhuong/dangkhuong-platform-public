import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), " +
              "magnetometer=(), gyroscope=(), accelerometer=(), display-capture=(), " +
              "bluetooth=(), interest-cohort=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Report-To",
            value:
              '{"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"https://dangkhuong.report-uri.com/r/d/csp/enforce"}]}',
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              // 'unsafe-inline' is required for Next.js inline scripts (style/script hydration).
              // Removing it would require a full nonce-based CSP infrastructure (middleware + per-request nonces).
              // 'wasm-unsafe-eval' is kept to allow WebAssembly modules (e.g. Cloudflare Turnstile, video processing).
              // 'unsafe-eval' is intentionally excluded — it is not needed by the current build.
              "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://www.youtube.com https://www.googletagmanager.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com https://img.youtube.com https://*.googleusercontent.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://api.anthropic.com; " +
              "frame-src https://www.youtube.com https://challenges.cloudflare.com; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              "object-src 'none'; " +
              "upgrade-insecure-requests; " +
              "report-uri https://dangkhuong.report-uri.com/r/d/csp/enforce; " +
              "report-to csp-endpoint",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ezgqdriljfodsuxdxjrd.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "qr.sepay.vn",
        pathname: "/img**",
      },
    ],
  },
};

export default nextConfig;
