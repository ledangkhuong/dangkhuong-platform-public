// ──────────────────────────────────────────────
// SEO Configuration
// ──────────────────────────────────────────────
// Centralised SEO constants used by root metadata, sitemap, robots,
// and any per-page metadata helpers (JSON-LD, OpenGraph, etc.).
//
// Values can be overridden via environment variables on Vercel —
// no code edits required.
// ──────────────────────────────────────────────

/**
 * Canonical site origin (no trailing slash).
 * Override via NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://dangkhuong.com"
).replace(/\/$/, "");

/**
 * Human-readable site name.
 * Used in OpenGraph site_name, JSON-LD Organization name, etc.
 * Override via NEXT_PUBLIC_SITE_NAME.
 */
export const SITE_NAME: string =
  process.env.NEXT_PUBLIC_SITE_NAME || "dangkhuong.com";

/**
 * Google Search Console verification token.
 *
 * Obtain from Google Search Console → "HTML tag" verification method;
 * paste only the `content="..."` value (not the full meta tag).
 *
 * Wired into `metadata.verification.google` in `src/app/layout.tsx`.
 * Override via NEXT_PUBLIC_GSC_VERIFICATION.
 */
export const GSC_VERIFICATION: string =
  process.env.NEXT_PUBLIC_GSC_VERIFICATION || "";
