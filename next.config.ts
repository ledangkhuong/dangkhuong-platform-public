import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Derive Supabase hostname from env so it's not hardcoded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";

// CSP report URI — configurable via env, defaults to empty (disables reporting)
const cspReportUri = process.env.CSP_REPORT_URI ?? "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    inlineCss: true,
    optimizePackageImports: [
      "lucide-react",
      "@tiptap/starter-kit",
      "@tiptap/react",
      "@xyflow/react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@tanstack/react-table",
      "novel",
    ],
  },
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
              // Note: html2canvas 1.x uses DOM traversal + Canvas API and does NOT need 'unsafe-eval'.
              "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://www.youtube.com https://connect.facebook.net https://www.googletagmanager.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              `img-src 'self' data: blob: ${supabaseHostname ? `https://${supabaseHostname}` : ""} https://i.ytimg.com https://img.youtube.com https://www.facebook.com; ` +
              "font-src 'self' data: https://fonts.gstatic.com; " +
              "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://challenges.cloudflare.com https://api.anthropic.com https://www.facebook.com https://*.facebook.com https://*.on.aws https://*.run.app https://api.qrserver.com; " +
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
    minimumCacheTTL: 2592000,
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
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: { disable: true },
});
