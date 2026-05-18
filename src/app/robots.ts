import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/blog",
          "/courses",
          "/cafe",
          "/pricing",
          "/terms",
          "/privacy",
          "/refund-policy",
        ],
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/settings",
          "/notifications",
          "/email",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
