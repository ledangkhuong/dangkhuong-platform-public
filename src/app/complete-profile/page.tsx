import type { Metadata } from "next";
import CompleteProfileClient from "./CompleteProfileClient";

export const metadata: Metadata = {
  title: "Hoàn tất hồ sơ — Lê Đăng Khương Academy",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function CompleteProfilePage() {
  return <CompleteProfileClient />;
}
