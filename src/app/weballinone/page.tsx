import type { Metadata } from "next";
import WebAllInOneLanding from "./WebAllInOneLanding";
import { getLandingEventConfig, getPixelsForPathname } from "@/lib/landing-pages";

export const metadata: Metadata = {
  title:
    "Mời Sinh Tố 100K — Lộ Trình Thiết Kế Website All-In-One Bằng AI Agent | Đăng Khương",
  description:
    "Zoom Live 20h-22h tối nay. Chia sẻ tư duy hệ thống All-In-One và cách dùng AI Agent để xây trụ sở kinh doanh số. Kèm bộ tài liệu & quy trình.",
  alternates: {
    canonical: "https://dangkhuong.com/weballinone",
  },
  openGraph: {
    title:
      "Mời Sinh Tố 100K — Lộ Trình Thiết Kế Website All-In-One Bằng AI Agent",
    description:
      "10 ngày qua, tôi để AI Agent chạy thử một hệ thống website All-In-One. Tối nay tôi lên Zoom chia sẻ trực tiếp tư duy hệ thống và cách triển khai từ A đến Z.",
    type: "website",
    url: "https://dangkhuong.com/weballinone",
    images: [
      {
        url: "https://dangkhuong.com/images/weballinone/banner.jpg",
        width: 1200,
        height: 630,
        alt: "Lộ Trình Thiết Kế Website All-In-One Bằng AI Agent",
      },
    ],
  },
};

// Resolve pixel slug server-side để EventAttrTracker route CAPI đúng pixel
// config. Ưu tiên slug từ landing event config; fallback sang pixel attached
// đầu tiên; cuối cùng fallback 'default' (route sẽ 404 nếu không có config).
async function resolvePixelSlug(): Promise<string> {
  const cfg = await getLandingEventConfig("/weballinone");
  if (cfg?.slug) return cfg.slug;
  const pixels = await getPixelsForPathname("/weballinone");
  return pixels[0]?.slug || "default";
}

export default async function WebAllInOnePage() {
  const pixelSlug = await resolvePixelSlug();
  return <WebAllInOneLanding pixelSlug={pixelSlug} />;
}
