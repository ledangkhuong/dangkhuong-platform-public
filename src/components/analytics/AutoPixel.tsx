import { headers } from "next/headers";
import { getPixelsForPathname } from "@/lib/landing-pages";
import PagePixelClient from "./PagePixelClient";

/**
 * <AutoPixel /> — Auto-bind Pixel theo pathname từ DB.
 *
 * Render trong root layout. Đọc current pathname từ header `x-dk-pathname`
 * (do middleware set), sau đó query DB và render 1 PagePixelClient cho mỗi
 * pixel_config đang attach vào landing.
 *
 * Marketing team thao tác hoàn toàn trong /admin/pixel-settings/pages, KHÔNG
 * cần đụng code. Khi xoá assignment trong admin, Pixel tự dừng track ở landing.
 */
export default async function AutoPixel() {
  const h = await headers();
  const pathname = h.get("x-dk-pathname");
  if (!pathname) return null;

  const pixels = await getPixelsForPathname(pathname);
  if (pixels.length === 0) return null;

  return (
    <>
      {pixels.map((p) => (
        <PagePixelClient
          key={p.id}
          slug={p.slug}
          pixelId={p.pixel_id}
          hasCapi={Boolean(p.capi_access_token)}
        />
      ))}
    </>
  );
}
