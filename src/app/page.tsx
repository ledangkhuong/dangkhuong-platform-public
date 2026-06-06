import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/site-config";
import HomePage from "./HomePage";

const BASE_URL = getBaseUrl();

const HOME_TITLE = "Lê Đăng Khương — Video AI & Kênh Triệu View";
const HOME_DESCRIPTION =
  "Lộ trình tạo video AI chuyên nghiệp với VEO3.1, xây kênh triệu view và kiếm tiền tự động. Đã giúp 1,300+ học viên tạo 300M+ view.";
const HOME_OG_IMAGE = `${BASE_URL}/images/hero/offer-banner.jpg`;

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: BASE_URL,
    siteName: "Lê Đăng Khương Academy",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: HOME_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Lê Đăng Khương — Video AI & Kênh Triệu View",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [HOME_OG_IMAGE],
  },
};

export default function Page() {
  return <HomePage />;
}
