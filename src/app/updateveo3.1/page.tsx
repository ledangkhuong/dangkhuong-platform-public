import type { Metadata } from "next";
import UpdateVeoLanding from "./UpdateVeoLanding";

export const metadata: Metadata = {
  title: "Tạo Tool Làm Video Tự Động trên Google Flow | Workshop 2 Buổi Tối",
  description:
    "Workshop 2 buổi tối cùng Thầy Lê Đăng Khương. Tạo Tool video tự động trên Google Flow với Gemini Omni Flash — nhập ý tưởng, AI tự viết kịch bản, tạo MC ảo, render cả loạt video. Vé chỉ 100.000đ.",
  alternates: {
    canonical: "https://dangkhuong.com/updateveo3.1",
  },
  openGraph: {
    title: "Tạo Tool Làm Video Tự Động trên Google Flow | Workshop 2 Buổi Tối",
    description:
      "Tạo Tool video tự động trên Google Flow — MC ảo, kịch bản AI, render tự động. Workshop 23-24/05. 20:00-22:00. Zoom. Vé 100.000đ.",
    type: "website",
    url: "https://dangkhuong.com/updateveo3.1",
    images: [
      {
        url: "https://dangkhuong.com/images/updateveo31/banner.png",
        width: 1200,
        height: 630,
        alt: "Update VEO 3.1 thành Gemini Omni Flash — Workshop trực tuyến · Trainer Lê Đăng Khương",
      },
    ],
  },
};

export default function UpdateVeoPage() {
  return <UpdateVeoLanding />;
}
