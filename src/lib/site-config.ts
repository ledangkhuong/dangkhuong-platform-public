// ──────────────────────────────────────────────
// Site Configuration — Edit this file to customize your platform
// ──────────────────────────────────────────────

export const siteConfig = {
  // ─── Brand ───
  name: "Lê Đăng Khương Academy",
  shortName: "LĐK Academy",
  domain: "dangkhuong.com",
  tagline: "Chuyên gia Video AI & Thương Hiệu Cá Nhân",
  description:
    "Làm chủ Video AI, xây kênh triệu view và thương hiệu cá nhân",

  // ─── Owner ───
  owner: {
    name: "Lê Đăng Khương",
    bio: "Chuyên gia Video AI & Thương Hiệu Cá Nhân",
    avatar: "/images/about/portrait.jpg",
  },

  // ─── Colors (CSS values) ───
  colors: {
    brand: "#D4A843",
    brandHover: "#FBBF24",
    background: "#0a0a0a",
    surface: "#111111",
    text: "#f5f5f5",
  },

  // ─── Social Links ───
  socials: {
    facebook: "https://facebook.com/ledangkhuong",
    youtube: "https://youtube.com/@ledangkhuong",
    zalo: "https://zalo.me/0782276727",
    tiktok: "",
    instagram: "",
  },

  // ─── Footer ───
  footer: {
    copyright: `© ${new Date().getFullYear()} Lê Đăng Khương Academy`,
  },

  // ─── Features (toggle on/off) ───
  features: {
    affiliate: true,
    community: true,
    leaderboard: true,
    events: true,
    blog: true,
    crm: true,
    emailMarketing: true,
  },
} as const;

export type SiteConfig = typeof siteConfig;
