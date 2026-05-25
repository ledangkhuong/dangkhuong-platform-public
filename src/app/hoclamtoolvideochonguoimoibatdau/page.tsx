import type { Metadata } from "next";
import HocLamToolVideoLanding from "./HocLamToolVideoLanding";

export const metadata: Metadata = {
  title: "Học Làm Tool Video Cho Người Mới Bắt Đầu — Từ 500K Còn 200K | Lê Đăng Khương",
  description:
    "Khóa học tạo Tool video tự động trên Google Flow với Gemini Omni Flash — nhập ý tưởng, AI tự viết kịch bản, tạo MC ảo, render cả loạt video. Giá gốc 500K, ưu đãi chỉ 200K.",
  alternates: {
    canonical: "https://dangkhuong.com/hoclamtoolvideochonguoimoibatdau",
  },
  openGraph: {
    title: "Học Làm Tool Video Cho Người Mới Bắt Đầu — Chỉ 200K",
    description:
      "Tạo Tool video tự động trên Google Flow — MC ảo, kịch bản AI, render tự động. Giá gốc 500K, ưu đãi chỉ 200K.",
    type: "website",
    url: "https://dangkhuong.com/hoclamtoolvideochonguoimoibatdau",
    images: [
      {
        url: "https://dangkhuong.com/images/updateveo31/banner.png",
        width: 1200,
        height: 630,
        alt: "Học Làm Tool Video Cho Người Mới Bắt Đầu — Khóa học Lê Đăng Khương",
      },
    ],
  },
};

export default function HocLamToolVideoPage() {
  return <HocLamToolVideoLanding />;
}
