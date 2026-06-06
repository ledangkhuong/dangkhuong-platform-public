import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/blog",
          "/courses",
          "/shop",
          "/cafe",
          "/terms",
          "/privacy",
          "/refund-policy",
          "/slowenglish",
          "/sanphamso",
          "/weballinone",
          "/tang4thanggeminipro",
          "/updateveo3.1",
          "/hocchuaxongtiendave",
          "/hoclamtoolvideochonguoimoibatdau",
        ],
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/checkout",
          "/cart",
          "/settings",
          "/notifications",
          "/email",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify",
          "/complete-profile",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
