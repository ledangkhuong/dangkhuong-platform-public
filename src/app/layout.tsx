import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import PageTracker from "@/components/analytics/PageTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Đăng Khương — Marketing & Thương Hiệu Cá Nhân",
  description: "Học marketing, xây dựng thương hiệu cá nhân và kinh doanh online cùng chuyên gia Đăng Khương.",
  keywords: "Đăng Khương, marketing, thương hiệu cá nhân, khóa học online",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ĐK Academy",
  },
};

export const viewport: Viewport = {
  themeColor: "#22c55e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased min-h-screen" style={{ background: "#0a0a0a", color: "#f5f5f5" }}>
        <Suspense fallback={null}>
          <PageTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
