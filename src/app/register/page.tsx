import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/site-config";
import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";

export const dynamic = "force-dynamic";

const BASE_URL = getBaseUrl();

export const metadata: Metadata = {
  title: "Đăng Ký Tài Khoản | Lê Đăng Khương Academy",
  description:
    "Tạo tài khoản miễn phí để nhận Bí Mật Video AI Triệu View và truy cập khoá học của Lê Đăng Khương.",
  alternates: {
    canonical: `${BASE_URL}/register`,
  },
};

export default function RegisterPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, #0d1a12 0%, #0a0a0a 60%)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Tạo tài khoản</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Tham gia <span className="font-bold text-white">Đăng Khương</span> và bắt đầu hành trình học tập
          </p>
        </div>

        <div className="card-dark p-6 sm:p-8">
          {/* Registration Form with Turnstile */}
          <RegisterForm />

          <p className="text-center text-sm text-gray-500 mt-5">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-[#D4A843] font-medium hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
