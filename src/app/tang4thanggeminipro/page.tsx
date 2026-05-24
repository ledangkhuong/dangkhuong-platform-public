import type { Metadata } from "next";
import GeminiProLanding from "./GeminiProLanding";

export const metadata: Metadata = {
  title: "Google Tặng 4 Tháng Gemini Pro Miễn Phí — Trị Giá Hơn 2 Triệu | Lê Đăng Khương",
  description:
    "Nhận ngay 4 tháng Gemini Pro miễn phí từ Google — 1000 credit/tháng, tiết kiệm hơn 2 triệu. Hướng dẫn chi tiết + tài liệu bí mật video AI triệu view. Chỉ 99k.",
  alternates: {
    canonical: "https://dangkhuong.com/tang4thanggeminipro",
  },
  openGraph: {
    title: "Google Tặng 4 Tháng Gemini Pro Miễn Phí — Trị Giá Hơn 2 Triệu",
    description:
      "Nhận 4 tháng Gemini Pro miễn phí, 1000 credit/tháng. Hướng dẫn đăng ký + tài liệu video AI triệu view. Chỉ 99k.",
    type: "website",
    url: "https://dangkhuong.com/tang4thanggeminipro",
    images: [
      {
        url: "https://dangkhuong.com/images/geminipro/banner.png",
        width: 1600,
        height: 900,
        alt: "Google Tặng 4 Tháng Gemini Pro Miễn Phí — 1000 credit/tháng, 0đ 4 tháng",
      },
    ],
  },
};

export default function GeminiProPage() {
  return <GeminiProLanding />;
}
