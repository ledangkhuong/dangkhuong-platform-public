import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, #0d1a12 0%, #0a0a0a 60%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/images/about/portrait.jpg" alt="Lê Đăng Khương" className="w-14 h-14 rounded-2xl mb-4 object-cover inline-block" />
          <h1 className="text-2xl font-bold text-white">Đăng nhập</h1>
          <p className="text-gray-400 mt-1 text-sm">Chào mừng trở lại — <span className="text-[#D4A843]">dangkhuong.com</span></p>
        </div>

        {/* Card */}
        <div className="card-dark p-6 sm:p-8">
          {/* Login Form with Turnstile */}
          <LoginForm />

          <p className="text-center text-sm text-gray-500 mt-5">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-[#D4A843] font-medium hover:underline">Đăng ký miễn phí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
