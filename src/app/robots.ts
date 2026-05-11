import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/dashboard/",
          "/settings/",
          "/crm/",
          "/email/",
          "/auth/",
        ],
      },
    ],
    sitemap: "https://dangkhuong.com/sitemap.xml",
  };
}
