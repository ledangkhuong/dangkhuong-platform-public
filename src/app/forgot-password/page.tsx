import Link from "next/link";
import { forgotPassword } from "@/lib/actions/forgot-password";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

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
          <h1 className="text-2xl font-bold text-white">Quên mật khẩu</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Nhập email để nhận link đặt lại mật khẩu
          </p>
        </div>

        {/* Success */}
        {success && (
          <div
            className="mb-4 p-3 rounded-lg text-sm text-green-400 border border-green-400/20"
            style={{ background: "rgba(34,197,94,0.08)" }}
          >
            {success}
          </div>
        )}

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
          <form action={forgotPassword} className="space-y-4">
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

            <button type="submit" className="btn-green w-full justify-center py-2.5 mt-2">
              Gửi link đặt lại mật khẩu
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Nhớ mật khẩu rồi?{" "}
            <Link href="/login" className="text-[#22c55e] font-medium hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
