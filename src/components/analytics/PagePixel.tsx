import { getPublicPixelConfigBySlug } from "@/lib/pixel-config";
import PagePixelClient from "./PagePixelClient";

/**
 * <PagePixel slug="khoa-hoc-xyz" />
 *
 * Server component drop-in cho landing page. Fetch config theo slug từ DB,
 * sau đó render client component để khởi tạo fbq + tracker.
 *
 * Cách dùng — copy-paste vào bất cứ landing nào:
 *
 *   import PagePixel from "@/components/analytics/PagePixel";
 *   export default function MyLandingPage() {
 *     return (
 *       <>
 *         <PagePixel slug="khoa-hoc-video-ai" />
 *         ...rest of page
 *       </>
 *     );
 *   }
 *
 * Slug phải khớp với 1 record trong bảng `pixel_configs`. Nếu slug không tồn
 * tại hoặc bị tắt, component không render gì (im lặng — không crash trang).
 */
export default async function PagePixel({ slug }: { slug: string }) {
  const config = await getPublicPixelConfigBySlug(slug);
  if (!config || !config.is_active) return null;

  return (
    <PagePixelClient
      slug={config.slug}
      pixelId={config.pixel_id}
      hasCapi={config.has_capi}
    />
  );
}
