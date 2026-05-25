/**
 * Landing pages helpers — server-only.
 *
 * Marketing-managed mapping pathname → pixel_configs[]. Cho phép gắn Pixel
 * vào landing không cần đụng source code.
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { LandingPage, LandingPageWithPixels, PixelConfig } from "@/types/pixel-config";

/**
 * Resolve all ACTIVE pixel configs cho 1 pathname.
 * Dùng bởi <AutoPixel /> trong root layout.
 *
 * - Match exact pathname (`/weballinone`)
 * - Cả landing_pages.is_active = true + pixel_configs.is_active = true
 * - Order theo position
 */
export async function getPixelsForPathname(pathname: string): Promise<PixelConfig[]> {
  if (!pathname) return [];

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("landing_pages")
    .select(`
      id,
      pathname,
      is_active,
      landing_page_pixels (
        position,
        pixel_config:pixel_configs!inner (*)
      )
    `)
    .eq("pathname", pathname)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return [];

  type Row = {
    landing_page_pixels: Array<{
      position: number;
      pixel_config: PixelConfig;
    }>;
  };
  const row = data as unknown as Row;

  const pixels = (row.landing_page_pixels ?? [])
    .map((r) => ({ position: r.position, cfg: r.pixel_config }))
    .filter((r) => r.cfg && r.cfg.is_active)
    .sort((a, b) => a.position - b.position)
    .map((r) => r.cfg);

  return pixels;
}

/** List tất cả landing pages (admin). */
export async function listLandingPages(): Promise<LandingPage[]> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("landing_pages")
    .select("*")
    .order("pathname", { ascending: true });
  if (error) {
    console.error("[landing-pages] listLandingPages:", error.message);
    return [];
  }
  return (data ?? []) as LandingPage[];
}

/** Lấy 1 landing kèm danh sách pixel đang attach. */
export async function getLandingPageById(
  id: string,
): Promise<LandingPageWithPixels | null> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("landing_pages")
    .select(`
      *,
      landing_page_pixels (
        position,
        pixel_config:pixel_configs!inner (*)
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  type Row = LandingPage & {
    landing_page_pixels: Array<{ position: number; pixel_config: PixelConfig }>;
  };
  const row = data as unknown as Row;

  const pixels = (row.landing_page_pixels ?? [])
    .map((r) => ({ position: r.position, cfg: r.pixel_config }))
    .sort((a, b) => a.position - b.position)
    .map((r) => r.cfg);

  const { landing_page_pixels: _omit, ...landing } = row;
  void _omit;
  return { ...(landing as LandingPage), pixels };
}

/**
 * Đếm số landing đang attach cho từng pixel_config_id.
 * Dùng để hiển thị "Pixel này đang dùng cho N landing" trong UI.
 */
export async function countPixelUsage(): Promise<Record<string, number>> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("landing_page_pixels")
    .select("pixel_config_id");
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data as Array<{ pixel_config_id: string }>) {
    out[row.pixel_config_id] = (out[row.pixel_config_id] || 0) + 1;
  }
  return out;
}
