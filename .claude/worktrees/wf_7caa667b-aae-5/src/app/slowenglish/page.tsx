import type { Metadata } from "next";
import SlowEnglishLanding from "./SlowEnglishLanding";

export const metadata: Metadata = {
  title: "Làm Video YouTube Slow English Bằng VEO 3.1 & CapCut | Lê Đăng Khương",
  description:
    "Khóa học thực chiến làm video YouTube Slow English bằng VEO 3.1. Chỉ 2 video hướng dẫn – ra video đầu tiên trong 48 giờ. Bí mật kênh 372K subs kiếm $30.000/tháng.",
  alternates: {
    canonical: "https://dangkhuong.com/slowenglish",
  },
  openGraph: {
    title: "Làm Video YouTube Slow English Bằng VEO 3.1 & CapCut",
    description:
      "Chỉ 2 video hướng dẫn – bạn sẽ tự tay làm được video YouTube Slow English đầu tiên. Bí mật đằng sau kênh 372K subs kiếm $30.000/tháng chỉ với 38 video.",
    type: "website",
    url: "https://dangkhuong.com/slowenglish",
    images: [
      {
        url: "https://dangkhuong.com/images/slowenglish/banner-ultra.png",
        width: 1200,
        height: 630,
        alt: "Làm Video YouTube Slow English Bằng VEO 3.1",
      },
    ],
  },
};

export default function SlowEnglishPage() {
  return <SlowEnglishLanding />;
}
