import type { Metadata } from "next";
import UpdateVeoLanding from "./UpdateVeoLanding";

export const metadata: Metadata = {
  title: "Update VEO 3.1 → Gemini Omni Flash | Workshop Trực Tuyến 2 Buổi Tối",
  description:
    "Workshop trực tuyến 2 buổi tối cùng Thầy Lê Đăng Khương. Từ người gõ prompt đến ĐẠO DIỄN AI. Học trọn bộ 5 nâng cấp Google Flow & Gemini Omni Flash. Vé chỉ 100.000đ.",
  alternates: {
    canonical: "https://dangkhuong.com/updateveo3.1",
  },
  openGraph: {
    title: "Update VEO 3.1 → Gemini Omni Flash | Workshop 2 Buổi Tối",
    description:
      "Từ người gõ prompt đến ĐẠO DIỄN AI. Google Flow & Gemini Omni Flash. 23-24/05. 20:00-22:00. Zoom. Vé 100.000đ.",
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
