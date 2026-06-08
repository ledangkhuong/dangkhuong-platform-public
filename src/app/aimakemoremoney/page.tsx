import type { Metadata } from "next";
import AIMakeMoneyLanding from "./AIMakeMoneyLanding";

const URL = "https://dangkhuong.com/aimakemoremoney";
const OG_IMAGE = "https://dangkhuong.com/images/hero/offer-banner.jpg";
const TITLE =
  "AI Make More Money and Freedom — 3 buổi Zoom miễn phí 12-14/06 | Lê Đăng Khương";
const DESCRIPTION =
  "3 buổi tối Zoom miễn phí từ Lê Đăng Khương: học cách dùng AI để mở 10 nguồn thu nhập và dựng hệ thống tự bán hàng 24/7. Tặng cẩm nang trị giá 2.990.000đ. Vé VIP 99k, VVIP 499k có coaching 1-1.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: URL,
    siteName: "Lê Đăng Khương Academy",
    locale: "vi_VN",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function Page() {
  return <AIMakeMoneyLanding />;
}
