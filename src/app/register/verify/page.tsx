import Link from "next/link";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, #0d1a12 0%, #0a0a0a 60%)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/images/about/portrait.jpg" alt="Lê Đăng Khương" className="w-14 h-14 rounded-2xl mb-4 object-cover inline-block" />
          <h1 className="text-2xl font-bold text-white">Kiểm tra email của bạn</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Chỉ còn một bước nữa để kích hoạt tài khoản
          </p>
        </div>

        <div className="card-dark p-6 sm:p-8 text-center">
          {/* Email icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed mb-2">
            Chúng tôi đã gửi email xác thực đến:
          </p>

          {email && (
            <p className="text-[#D4A843] font-semibold text-base mb-4 break-all">
              {email}
            </p>
          )}

          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Vui lòng mở email và nhấn vào nút <span className="text-gray-300 font-medium">&quot;Xác thực tài khoản&quot;</span> để kích hoạt.
            Kiểm tra cả thư mục <span className="text-gray-300 font-medium">Spam</span> nếu bạn không thấy email.
          </p>

          <div className="h-px mb-6" style={{ background: "#2a2a2a" }} />

          <div className="space-y-3">
            <Link
              href="/login"
              className="btn-green w-full justify-center py-2.5 inline-flex"
            >
              Đã xác thực? Đăng nhập
            </Link>
            <Link
              href="/register"
              className="block text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Chưa nhận được? Đăng ký lại
            </Link>
          </div>
        </div>

        {/* Tip */}
        <div className="mt-6 card-dark p-4 text-center">
          <p className="text-xs text-gray-500">
            Link xác thực có hiệu lực trong 24 giờ.
          </p>
        </div>
      </div>
    </div>
  );
}
