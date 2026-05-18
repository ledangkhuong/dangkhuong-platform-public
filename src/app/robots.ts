import type { MetadataRoute } from "next";

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
    sitemap: "https://dangkhuong.com/sitemap.xml",
    host: "https://dangkhuong.com",
  };
}
