import type { Metadata } from "next";
import PricingContent from "./PricingContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bảng Giá Khoá Học | Lê Đăng Khương Academy",
  description:
    "Chọn gói học phù hợp tại Lê Đăng Khương Academy — từ miễn phí đến Premium với tư vấn 1-1 và tài liệu độc quyền. Làm chủ Video AI & Thương Hiệu Cá Nhân.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Bảng Giá Khoá Học | Lê Đăng Khương Academy",
    description:
      "Chọn gói học phù hợp — Miễn phí, Standard hoặc Premium. Truy cập khoá học Video AI, chứng chỉ, tư vấn 1-1 và tài liệu độc quyền.",
    type: "website",
    url: "https://dangkhuong.com/pricing",
    images: [
      {
        url: "https://dangkhuong.com/og-pricing.jpg",
        width: 1200,
        height: 630,
        alt: "Bảng Giá Khoá Học — Lê Đăng Khương Academy",
      },
    ],
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
