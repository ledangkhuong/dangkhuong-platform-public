import type { Metadata } from "next";
import HomePage from "./HomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lê Đăng Khương — Làm Chủ Video AI, Xây Kênh Triệu View & Thương Hiệu Cá Nhân",
  description:
    "Lộ trình độc quyền giúp bạn tạo video AI chuyên nghiệp với VEO3.1, xây kênh triệu view và kiếm tiền tự động. Đã giúp 1,300+ học viên tạo 300M+ view.",
  alternates: {
    canonical: "/",
  },
};

export default function Page() {
  return <HomePage />;
}
