import type { Metadata } from "next";
import SanPhamSoLanding from "./SanPhamSoLanding";

export const metadata: Metadata = {
  title: "Lộ Trình Kiếm Tiền Từ Sản Phẩm Số 2026 | Lê Đăng Khương",
  description:
    "Chỉ với 100K — sở hữu lộ trình kiếm tiền từ sản phẩm số 2026 trị giá 1.000.000đ. Không cần vốn lớn, không cần kho hàng, tận dụng AI làm việc 10x năng suất.",
  alternates: {
    canonical: "https://dangkhuong.com/sanphamso",
  },
  openGraph: {
    title: "Lộ Trình Kiếm Tiền Từ Sản Phẩm Kỹ Thuật Số 2026",
    description:
      "Bí quyết kiếm tiền từ sản phẩm số — Ứng dụng thực chiến cho thị trường Việt Nam 2026. Giá gốc 1.000.000đ → Chỉ 100.000đ.",
    type: "website",
    url: "https://dangkhuong.com/sanphamso",
    images: [
      {
        url: "https://dangkhuong.com/images/sanphamso/banner.jpg",
        width: 1200,
        height: 630,
        alt: "Lộ Trình Kiếm Tiền Từ Sản Phẩm Số 2026 — Trainer Lê Đăng Khương",
      },
    ],
  },
};

export default function SanPhamSoPage() {
  return <SanPhamSoLanding />;
}
