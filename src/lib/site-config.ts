// ──────────────────────────────────────────────
// Site Configuration — Customize via Environment Variables
// ──────────────────────────────────────────────
// Tất cả giá trị đều có thể override bằng env vars trên Vercel.
// Học viên KHÔNG cần sửa file này — chỉ cần set env vars.
// Giá trị mặc định (fallback) là của Lê Đăng Khương Academy.
// ──────────────────────────────────────────────

const env = (key: string, fallback: string): string =>
  (typeof process !== "undefined" ? process.env?.[key] : undefined) ?? fallback;

export const siteConfig = {
  // ─── Brand ───
  // Env: NEXT_PUBLIC_SITE_NAME, NEXT_PUBLIC_SITE_SHORT_NAME, NEXT_PUBLIC_SITE_DOMAIN
  //      NEXT_PUBLIC_SITE_TAGLINE, NEXT_PUBLIC_SITE_DESCRIPTION
  name: env("NEXT_PUBLIC_SITE_NAME", "Lê Đăng Khương Academy"),
  shortName: env("NEXT_PUBLIC_SITE_SHORT_NAME", "LĐK Academy"),
  domain: env("NEXT_PUBLIC_SITE_DOMAIN", "dangkhuong.com"),
  tagline: env("NEXT_PUBLIC_SITE_TAGLINE", "Chuyên gia Video AI & Thương Hiệu Cá Nhân"),
  description: env(
    "NEXT_PUBLIC_SITE_DESCRIPTION",
    "Làm chủ Video AI, xây kênh triệu view và thương hiệu cá nhân"
  ),

  // ─── Owner ───
  // Env: NEXT_PUBLIC_OWNER_NAME, NEXT_PUBLIC_OWNER_BIO, NEXT_PUBLIC_OWNER_AVATAR
  owner: {
    name: env("NEXT_PUBLIC_OWNER_NAME", "Lê Đăng Khương"),
    bio: env("NEXT_PUBLIC_OWNER_BIO", "Chuyên gia Video AI & Thương Hiệu Cá Nhân"),
    avatar: env("NEXT_PUBLIC_OWNER_AVATAR", "/images/about/portrait.jpg"),
  },

  // ─── Email ───
  // Env: NEXT_PUBLIC_EMAIL_FROM (the verified SES sender address)
  emailFrom: env("NEXT_PUBLIC_EMAIL_FROM", "support@ledangkhuong.net"),

  // ─── Colors (CSS values) ───
  // Env: NEXT_PUBLIC_COLOR_BRAND, NEXT_PUBLIC_COLOR_BRAND_HOVER
  //      NEXT_PUBLIC_COLOR_BG, NEXT_PUBLIC_COLOR_SURFACE, NEXT_PUBLIC_COLOR_TEXT
  colors: {
    brand: env("NEXT_PUBLIC_COLOR_BRAND", "#D4A843"),
    brandHover: env("NEXT_PUBLIC_COLOR_BRAND_HOVER", "#FBBF24"),
    background: env("NEXT_PUBLIC_COLOR_BG", "#0a0a0a"),
    surface: env("NEXT_PUBLIC_COLOR_SURFACE", "#111111"),
    text: env("NEXT_PUBLIC_COLOR_TEXT", "#f5f5f5"),
  },

  // ─── Social Links ───
  // Env: NEXT_PUBLIC_SOCIAL_FACEBOOK, NEXT_PUBLIC_SOCIAL_YOUTUBE,
  //      NEXT_PUBLIC_SOCIAL_ZALO, NEXT_PUBLIC_SOCIAL_TIKTOK, NEXT_PUBLIC_SOCIAL_INSTAGRAM
  socials: {
    facebook: env("NEXT_PUBLIC_SOCIAL_FACEBOOK", "https://www.facebook.com/jackmadk13"),
    youtube: env("NEXT_PUBLIC_SOCIAL_YOUTUBE", "https://youtube.com/@ledangkhuong"),
    zalo: env("NEXT_PUBLIC_SOCIAL_ZALO", "https://zalo.me/0782276727"),
    tiktok: env("NEXT_PUBLIC_SOCIAL_TIKTOK", ""),
    instagram: env("NEXT_PUBLIC_SOCIAL_INSTAGRAM", ""),
  },

  // ─── Footer ───
  // Env: NEXT_PUBLIC_FOOTER_COPYRIGHT
  footer: {
    copyright: env(
      "NEXT_PUBLIC_FOOTER_COPYRIGHT",
      `© ${new Date().getFullYear()} Lê Đăng Khương Academy`
    ),
  },

  // ─── Features (toggle on/off) ───
  // Env: NEXT_PUBLIC_FEATURE_AFFILIATE, NEXT_PUBLIC_FEATURE_COMMUNITY, etc.
  // Set to "false" to disable
  features: {
    affiliate: env("NEXT_PUBLIC_FEATURE_AFFILIATE", "true") !== "false",
    community: env("NEXT_PUBLIC_FEATURE_COMMUNITY", "true") !== "false",
    leaderboard: env("NEXT_PUBLIC_FEATURE_LEADERBOARD", "true") !== "false",
    events: env("NEXT_PUBLIC_FEATURE_EVENTS", "true") !== "false",
    blog: env("NEXT_PUBLIC_FEATURE_BLOG", "true") !== "false",
    crm: env("NEXT_PUBLIC_FEATURE_CRM", "true") !== "false",
    emailMarketing: env("NEXT_PUBLIC_FEATURE_EMAIL_MARKETING", "true") !== "false",
  },
} as const;

export type SiteConfig = typeof siteConfig;

/**
 * Extracts the phone number from the Zalo URL (e.g. "https://zalo.me/0782276727" → "0782276727").
 * Falls back to the raw URL if parsing fails.
 */
export function getZaloPhone(): string {
  const match = siteConfig.socials.zalo.match(/zalo\.me\/(\d+)/);
  return match?.[1] ?? siteConfig.socials.zalo;
}

/**
 * Returns the canonical base URL for the site.
 * Uses NEXT_PUBLIC_APP_URL env var, falling back to the configured domain.
 * Never returns a trailing slash.
 */
export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return `https://${siteConfig.domain}`;
}
