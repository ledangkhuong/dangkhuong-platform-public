import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import PageTracker from "@/components/analytics/PageTracker";
import FacebookPixel from "@/components/analytics/FacebookPixel";
import AffiliateTracker from "@/components/affiliate/AffiliateTracker";
import CookieConsent from "@/components/CookieConsent";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${siteConfig.owner.name} — ${siteConfig.tagline}`,
  description: "Làm chủ Video AI VEO3.1, xây kênh triệu view và thương hiệu cá nhân cùng Lê Đăng Khương. Đã giúp 1,300+ học viên tạo 300M+ view. Nhận miễn phí Bí Mật Video AI Triệu View.",
  keywords: "Lê Đăng Khương, Video AI, VEO3.1, thương hiệu cá nhân, kênh triệu view, AI Agent, Kohada, khóa học video AI",
  manifest: "/manifest.json",
  metadataBase: new URL(`https://${siteConfig.domain}`),
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  openGraph: {
    title: "Lê Đăng Khương — Làm Chủ Video AI, Xây Kênh Triệu View và Xây dựng thương hiệu cá nhân với AI Agent",
    description: "Lộ trình độc quyền giúp bạn tạo video AI chuyên nghiệp, xây kênh triệu view và kiếm tiền tự động với AI Agent. Nhận miễn phí Bí Mật Video AI Triệu View.",
    siteName: siteConfig.name,
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/images/hero/offer-banner.jpg",
        width: 1200,
        height: 630,
        alt: "Bí Mật Video AI Triệu View - Lê Đăng Khương",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lê Đăng Khương — Làm Chủ Video AI, Xây Kênh Triệu View và Xây dựng thương hiệu cá nhân với AI Agent",
    description: "Nhận miễn phí Bí Mật Video AI Triệu View. Đã giúp 1,300+ học viên tạo 300M+ view.",
    images: ["/images/hero/offer-banner.jpg"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteConfig.shortName,
  },
};

export const viewport: Viewport = {
  themeColor: "#D4A843",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased min-h-screen" style={{ background: "#0a0a0a", color: "#f5f5f5" }} suppressHydrationWarning>
        {/* Skip to main content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#D4A843] focus:text-black focus:text-sm focus:font-semibold focus:outline-none"
        >
          Chuyển đến nội dung chính
        </a>
        <Suspense fallback={null}>
          <PageTracker />
          <FacebookPixel />
          <AffiliateTracker />
        </Suspense>
        <main id="main-content">{children}</main>
        <CookieConsent />
      </body>
    </html>
  );
}
