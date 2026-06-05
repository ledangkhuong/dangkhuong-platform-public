/**
 * Landing pages helpers — server-only.
 *
 * Marketing-managed mapping pathname → pixel_configs[]. Cho phép gắn Pixel
 * vào landing không cần đụng source code.
 */

import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/server";
import type { LandingPage, LandingPageWithPixels, PixelConfig } from "@/types/pixel-config";

/**
 * Resolve all ACTIVE pixel configs cho 1 pathname.
 * Dùng bởi <AutoPixel /> trong root layout.
 *
 * Bao gồm:
 *   1. Các pixel đã bind vào landing có pathname này (qua landing_page_pixels)
 *   2. Các pixel có apply_to_all_pages = true (fire trên MỌI pathname)
 *
 * Dedupe theo id (1 pixel chỉ fire 1 lần dù có cả 2 nguồn).
 */
export const getPixelsForPathname = cache(async (pathname: string): Promise<PixelConfig[]> => {
  if (!pathname) return [];

  const admin = await createAdminClient();

  // ── Source 1: pixels bind vào landing này ──
  const { data: landingData } = await admin
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

  type LandingRow = {
    landing_page_pixels: Array<{ position: number; pixel_config: PixelConfig }>;
  };
  const landingRow = landingData as unknown as LandingRow | null;

  const fromLanding = (landingRow?.landing_page_pixels ?? [])
    .map((r) => ({ position: r.position, cfg: r.pixel_config }))
    .filter((r) => r.cfg && r.cfg.is_active)
    .sort((a, b) => a.position - b.position)
    .map((r) => r.cfg);

  // ── Source 2: pixels apply_to_all_pages ──
  const { data: globalPixels } = await admin
    .from("pixel_configs")
    .select("*")
    .eq("apply_to_all_pages", true)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const fromGlobal = (globalPixels ?? []) as PixelConfig[];

  // ── Dedupe theo id, ưu tiên thứ tự: landing bind trước, global sau ──
  const seen = new Set<string>();
  const out: PixelConfig[] = [];
  for (const p of [...fromLanding, ...fromGlobal]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
});

/**
 * Lookup landing page event config theo pathname.
 * Dùng bởi <AutoEvent /> trong root layout để bind sự kiện chuẩn cho landing.
 */
export interface LandingEventConfig {
  pageEvent: string | null;
  formSubmitEvent: string | null;
  value: number | null;
  currency: string | null;
  contentName: string | null;
  slug: string | null;
}

export const getLandingEventConfig = cache(async (pathname: string): Promise<LandingEventConfig | null> => {
  if (!pathname) return null;
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("landing_pages")
    .select(`
      id,
      pathname,
      page_event,
      form_submit_event,
      event_value,
      event_currency,
      event_content_name,
      landing_page_pixels (
        pixel_config:pixel_configs!inner ( slug, is_active )
      )
    `)
    .eq("pathname", pathname)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;

  type Row = {
    page_event: string | null;
    form_submit_event: string | null;
    event_value: number | null;
    event_currency: string | null;
    event_content_name: string | null;
    landing_page_pixels: Array<{ pixel_config: { slug: string; is_active: boolean } }>;
  };
  const row = data as unknown as Row;

  // Chọn slug pixel đầu tiên đang active để gắn vào event
  const firstActive = row.landing_page_pixels.find((b) => b.pixel_config?.is_active);

  return {
    pageEvent: row.page_event,
    formSubmitEvent: row.form_submit_event,
    value: row.event_value,
    currency: row.event_currency,
    contentName: row.event_content_name,
    slug: firstActive?.pixel_config.slug || null,
  };
});

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
