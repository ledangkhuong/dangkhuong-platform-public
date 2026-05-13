import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
