import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, #0d1a12 0%, #0a0a0a 60%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #D4A843, #B8922E)" }}>ĐK</div>
          <h1 className="text-2xl font-bold text-white">Đăng nhập</h1>
          <p className="text-gray-400 mt-1 text-sm">Chào mừng trở lại — <span className="text-[#D4A843]">dangkhuong.com</span></p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-400/20" style={{ background: "rgba(239,68,68,0.08)" }}>
            {error}
          </div>
        )}

        {/* Card */}
        <div className="card-dark p-8">
          <form action={signIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input name="email" type="email" placeholder="ban@email.com"
                className="input-dark" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu</label>
              <PasswordInput name="password" placeholder="••••••••" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: "#D4A843" }} />
                <span className="text-sm text-gray-400">Ghi nhớ đăng nhập</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-[#D4A843] hover:underline">Quên mật khẩu?</Link>
            </div>
            <button type="submit" className="btn-green w-full justify-center py-2.5 mt-2">
              Đăng nhập
            </button>
          </form>

          {/* Social Login */}
          <div className="mt-5">
            <SocialLoginButtons />
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-[#D4A843] font-medium hover:underline">Đăng ký miễn phí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
