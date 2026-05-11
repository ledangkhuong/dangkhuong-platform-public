import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, #0d1a12 0%, #0a0a0a 60%)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
          >
            ĐK
          </div>
          <h1 className="text-2xl font-bold text-white">Tạo tài khoản miễn phí</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Bắt đầu hành trình học tập cùng{" "}
            <span className="text-[#22c55e]">Đăng Khương</span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
            style={{ background: "rgba(239,68,68,0.08)" }}
          >
            {error}
          </div>
        )}

        <div className="card-dark p-6 sm:p-8">
          <form action={signUp} className="space-y-4">
            {/* Họ và tên */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Họ và tên
              </label>
              <input
                name="full_name"
                type="text"
                placeholder="Nguyễn Văn A"
                className="input-dark w-full"
                required
              />
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Số điện thoại <span className="text-red-400">*</span>
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="0912345678"
                pattern="^(0|\+84)[0-9]{9}$"
                title="Nhập số điện thoại hợp lệ (VD: 0912345678)"
                className="input-dark w-full"
                required
              />
              <p className="text-[10px] text-gray-600 mt-1">Định dạng: 09xx hoặc +84xxx (10 số)</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="ban@email.com"
                className="input-dark w-full"
                required
              />
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Mật khẩu
              </label>
              <PasswordInput name="password" placeholder="Tối thiểu 8 ký tự" minLength={8} />
            </div>

            <p className="text-xs text-gray-500 pt-1">
              Bằng cách đăng ký, bạn đồng ý với{" "}
              <a href="#" className="text-[#22c55e] hover:underline">
                Điều khoản dịch vụ
              </a>{" "}
              và{" "}
              <a href="#" className="text-[#22c55e] hover:underline">
                Chính sách bảo mật
              </a>
            </p>
            <button type="submit" className="btn-green w-full justify-center py-2.5 mt-2">
              Đăng ký — Hoàn toàn miễn phí
            </button>
          </form>
          {/* Social Login */}
          <div className="mt-5">
            <SocialLoginButtons />
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-[#22c55e] font-medium hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
          {["📚 Khoá học miễn phí", "👥 Cộng đồng 1,200+", "🎯 Học có lộ trình"].map((t) => (
            <div key={t} className="card-dark py-3 px-2">
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
