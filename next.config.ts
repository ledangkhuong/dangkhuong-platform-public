import type { NextConfig } from "next";

// Derive Supabase hostname from env so it's not hardcoded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";

// CSP report URI — configurable via env, defaults to empty (disables reporting)
const cspReportUri = process.env.CSP_REPORT_URI ?? "";

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
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          ...(cspReportUri
            ? [
                {
                  key: "Report-To",
                  value: JSON.stringify({
                    group: "csp-endpoint",
                    max_age: 10886400,
                    endpoints: [{ url: cspReportUri }],
                  }),
                },
              ]
            : []),
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              // 'unsafe-inline' is required for Next.js inline scripts (style/script hydration).
              // 'wasm-unsafe-eval' is kept for WebAssembly modules (e.g. Cloudflare Turnstile).
              // 'unsafe-eval' is required by html2canvas for dynamic canvas rendering.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://www.youtube.com https://connect.facebook.net https://www.googletagmanager.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              `img-src 'self' data: blob: ${supabaseHostname ? `https://${supabaseHostname}` : ""} https://i.ytimg.com https://img.youtube.com; ` +
              "font-src 'self' data: https://fonts.gstatic.com; " +
              "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://challenges.cloudflare.com https://api.anthropic.com https://www.facebook.com https://api.qrserver.com; " +
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com https://drive.google.com; " +
              "media-src 'self' https://www.youtube.com; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              "object-src 'none'; " +
              "upgrade-insecure-requests" +
              (cspReportUri ? `; report-uri ${cspReportUri}; report-to csp-endpoint` : ""),
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "qr.sepay.vn",
        pathname: "/img**",
      },
    ],
  },
};

export default nextConfig;
