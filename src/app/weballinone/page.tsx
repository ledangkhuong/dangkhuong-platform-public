import type { Metadata } from "next";
import WebAllInOneLanding from "./WebAllInOneLanding";
import PagePixel from "@/components/analytics/PagePixel";

export const metadata: Metadata = {
  title:
    "Mời Sinh Tố 100K — Lộ Trình Thiết Kế Website All-In-One Bằng AI Agent | Đăng Khương",
  description:
    "Zoom Live 20h-22h tối nay. Chia sẻ tư duy hệ thống All-In-One và cách dùng AI Agent để xây trụ sở kinh doanh số. Kèm bộ tài liệu & quy trình.",
  alternates: {
    canonical: "https://dangkhuong.com/weballinone",
  },
  openGraph: {
    title:
      "Mời Sinh Tố 100K — Lộ Trình Thiết Kế Website All-In-One Bằng AI Agent",
    description:
      "10 ngày qua, tôi để AI Agent chạy thử một hệ thống website All-In-One. Tối nay tôi lên Zoom chia sẻ trực tiếp tư duy hệ thống và cách triển khai từ A đến Z.",
    type: "website",
    url: "https://dangkhuong.com/weballinone",
    images: [
      {
        url: "https://dangkhuong.com/images/weballinone/banner.png",
        width: 1200,
        height: 630,
        alt: "Lộ Trình Thiết Kế Website All-In-One Bằng AI Agent",
      },
    ],
  },
};

export default function WebAllInOnePage() {
  return (
    <>
      <PagePixel slug="weballinone" />
      <WebAllInOneLanding />
    </>
  );
}
