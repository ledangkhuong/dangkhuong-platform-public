import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import PageTracker from "@/components/analytics/PageTracker";
import FacebookPixel from "@/components/analytics/FacebookPixel";
import AutoPixel from "@/components/analytics/AutoPixel";
import AutoEvent from "@/components/analytics/AutoEvent";
import EngagementTracker from "@/components/analytics/EngagementTracker";
import EventAttrTracker from "@/components/analytics/EventAttrTracker";
import AffiliateTracker from "@/components/affiliate/AffiliateTracker";
import CookieConsent from "@/components/CookieConsent";
import ErrorBoundary from "@/components/providers/ErrorBoundary";
import TrackingProvider from "@/components/TrackingProvider";
import WebsiteJsonLd from "@/components/seo/WebsiteJsonLd";
import { siteConfig, getBaseUrl } from "@/lib/site-config";
import { validateEnv } from "@/lib/env-check";
import "./globals.css";

// Validate environment variables once at server startup
validateEnv();

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: `${siteConfig.owner.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  keywords: `${siteConfig.owner.name}, ${siteConfig.shortName}`,
  manifest: "/manifest.json",
  metadataBase: new URL(getBaseUrl()),
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  openGraph: {
    title: `${siteConfig.owner.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/images/hero/offer-banner.jpg",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - ${siteConfig.owner.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.owner.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
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
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
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
          <AutoPixel />
          <AutoEvent />
          <EngagementTracker />
          <EventAttrTracker />
          <AffiliateTracker />
        </Suspense>
        <ErrorBoundary>
          <TrackingProvider>
            <main id="main-content">{children}</main>
          </TrackingProvider>
        </ErrorBoundary>
        <CookieConsent />
        <WebsiteJsonLd />
      </body>
    </html>
  );
}
