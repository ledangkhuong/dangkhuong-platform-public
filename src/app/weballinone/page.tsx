import type { Metadata } from "next";
import WebAllInOneLanding from "./WebAllInOneLanding";
import { getLandingEventConfig, getPixelsForPathname } from "@/lib/landing-pages";

const WAIO_TITLE = "Website All-In-One Bằng AI Agent | Đăng Khương";
const WAIO_DESCRIPTION =
  "Zoom Live 20h-22h tối nay. Chia sẻ tư duy hệ thống All-In-One và cách dùng AI Agent để xây trụ sở kinh doanh số. Kèm bộ tài liệu & quy trình.";
const WAIO_URL = "https://dangkhuong.com/weballinone";
const WAIO_OG_IMAGE = "https://dangkhuong.com/images/weballinone/banner.jpg";

export const metadata: Metadata = {
  title: WAIO_TITLE,
  description: WAIO_DESCRIPTION,
  alternates: {
    canonical: WAIO_URL,
  },
  openGraph: {
    title: WAIO_TITLE,
    description: WAIO_DESCRIPTION,
    type: "website",
    url: WAIO_URL,
    siteName: "Lê Đăng Khương Academy",
    locale: "vi_VN",
    images: [
      {
        url: WAIO_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Lộ Trình Thiết Kế Website All-In-One Bằng AI Agent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: WAIO_TITLE,
    description: WAIO_DESCRIPTION,
    images: [WAIO_OG_IMAGE],
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
