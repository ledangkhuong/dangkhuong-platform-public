import type { Metadata } from "next";
import CafeLanding from "./CafeLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mời Cafe 99K — Nhận 100 Mô Hình Kinh Doanh Triệu Đô | Đăng Khương",
  description:
    "Mỗi ly cafe 99K, tôi tặng bạn tài liệu 100 mô hình kinh doanh sản phẩm số doanh thu 1 triệu đô la trên thế giới, ứng dụng cho Việt Nam.",
  alternates: {
    canonical: "/cafe",
  },
  openGraph: {
    title: "Mời Cafe 99K — Nhận 100 Mô Hình Kinh Doanh Triệu Đô",
    description:
      "Tài liệu nghiên cứu 100 mô hình kinh doanh sản phẩm số từ những cá nhân doanh thu 1 triệu đô la — đã được phân tích & bản địa hóa để ứng dụng ngay tại Việt Nam.",
    type: "website",
    url: "https://dangkhuong.com/cafe",
    images: [
      {
        url: "https://dangkhuong.com/cafe.jpg",
        width: 1200,
        height: 630,
        alt: "Mời Cafe 99K — Nhận 100 Mô Hình Kinh Doanh Triệu Đô",
      },
    ],
  },
};

export default function CafePage() {
  return <CafeLanding />;
}
