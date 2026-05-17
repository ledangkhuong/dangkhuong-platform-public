import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
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
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.youtube.com https://www.googletagmanager.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com https://img.youtube.com https://*.googleusercontent.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://api.anthropic.com; " +
              "frame-src https://www.youtube.com https://challenges.cloudflare.com; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              "object-src 'none'",
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
