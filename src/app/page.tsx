import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/site-config";
import HomePage from "./HomePage";

const BASE_URL = getBaseUrl();

export const metadata: Metadata = {
  title: "Lê Đăng Khương — Làm Chủ Video AI, Xây Kênh Triệu View & Thương Hiệu Cá Nhân",
  description:
    "Lộ trình độc quyền giúp bạn tạo video AI chuyên nghiệp với VEO3.1, xây kênh triệu view và kiếm tiền tự động. Đã giúp 1,300+ học viên tạo 300M+ view.",
  alternates: {
    canonical: BASE_URL,
  },
};

export default function Page() {
  return <HomePage />;
}
