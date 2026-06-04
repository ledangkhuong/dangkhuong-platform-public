/**
 * Pixel Config helpers — fetch Facebook Pixel + CAPI cấu hình theo slug.
 *
 * - Server-only. KHÔNG import từ Client Component.
 * - Dùng admin client (service role) khi lookup token cho CAPI.
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { PixelConfig, PixelConfigPublic } from "@/types/pixel-config";

/**
 * Lookup pixel config theo slug (server-side, có access token).
 * Trả về null nếu không tìm thấy hoặc bị tắt.
 */
export async function getPixelConfigBySlug(
  slug: string,
): Promise<PixelConfig | null> {
  if (!slug) return null;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("pixel_configs")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[pixel-config] getPixelConfigBySlug error:", error.message);
    return null;
  }

  return (data as PixelConfig | null) ?? null;
}

/**
 * Public-safe version cho client component: KHÔNG trả token.
 * Dùng cho <PagePixel> để render pixel_id vào HTML.
 */
export async function getPublicPixelConfigBySlug(
  slug: string,
): Promise<PixelConfigPublic | null> {
  const config = await getPixelConfigBySlug(slug);
  if (!config) return null;
  return toPublic(config);
}

/** Convert full config → public-safe shape. */
export function toPublic(config: PixelConfig): PixelConfigPublic {
  return {
    id: config.id,
    slug: config.slug,
    name: config.name,
    pixel_id: config.pixel_id,
    is_active: config.is_active,
    apply_to_all_pages: config.apply_to_all_pages,
    custom_events: config.custom_events,
    has_capi: Boolean(config.capi_access_token),
    has_test_code: Boolean(config.test_event_code),
  };
}

/** List tất cả pixel configs (admin only). */
export async function listPixelConfigs(): Promise<PixelConfig[]> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("pixel_configs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[pixel-config] listPixelConfigs error:", error.message);
    return [];
  }
  return (data ?? []) as PixelConfig[];
}

/** Log 1 event vào pixel_events_log (best-effort, không throw). */
export async function logPixelEvent(params: {
  configId: string | null;
  slug: string;
  eventName: string;
  eventId: string;
  source: "pixel" | "capi" | "both";
  userData?: Record<string, unknown>;
  customData?: Record<string, unknown>;
  fbResponse?: Record<string, unknown> | null;
  success: boolean;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    const admin = await createAdminClient();
    await admin.from("pixel_events_log").insert({
      config_id: params.configId,
      slug: params.slug,
      event_name: params.eventName,
      event_id: params.eventId,
      source: params.source,
      user_data: stripPii(params.userData ?? {}),
      custom_data: params.customData ?? {},
      fb_response: params.fbResponse ?? null,
      success: params.success,
      error_message: params.errorMessage ?? null,
    });
  } catch (err) {
    console.error("[pixel-config] logPixelEvent failed:", err);
  }
}

/** Loại bỏ PII thô trước khi log (giữ flag boolean để biết có hay không). */
function stripPii(ud: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(ud)) {
    if (["email", "phone", "firstName", "lastName"].includes(k)) {
      out[`has_${k}`] = Boolean(ud[k]);
    } else if (k === "ip" || k === "userAgent") {
      // giữ — không phải PII strict, dùng để debug
      out[k] = ud[k];
    } else {
      out[k] = ud[k];
    }
  }
  return out;
}
