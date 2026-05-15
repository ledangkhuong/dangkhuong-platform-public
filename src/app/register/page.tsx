import Link from "next/link";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import RegisterForm from "@/components/auth/RegisterForm";

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
            Tham gia <span className="font-bold text-white">CODE4FUNC</span> và bắt đầu hành trình học tập
          </p>
        </div>

        <div className="card-dark p-6 sm:p-8">
          {/* Social Login */}
          <SocialLoginButtons />

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Hoặc tiếp tục với email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

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
