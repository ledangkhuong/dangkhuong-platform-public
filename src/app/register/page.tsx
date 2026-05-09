import Link from "next/link";
import { Mail, Lock, User, Eye } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, #0d1a12 0%, #0a0a0a 60%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>ĐK</div>
          <h1 className="text-2xl font-bold text-white">Tạo tài khoản miễn phí</h1>
          <p className="text-gray-400 mt-1 text-sm">Bắt đầu hành trình học tập cùng <span className="text-[#22c55e]">Đăng Khương</span></p>
        </div>

        <div className="card-dark p-8">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Họ và tên</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" placeholder="Nguyễn Văn A" className="input-dark pl-9" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" placeholder="ban@email.com" className="input-dark pl-9" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" placeholder="Tối thiểu 8 ký tự" className="input-dark pl-9 pr-9" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><Eye size={15} /></button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Bằng cách đăng ký, bạn đồng ý với{" "}
              <a href="#" className="text-[#22c55e] hover:underline">Điều khoản dịch vụ</a> và{" "}
              <a href="#" className="text-[#22c55e] hover:underline">Chính sách bảo mật</a>
            </p>
            <Link href="/dashboard" className="btn-green w-full justify-center py-2.5 block text-center">
              Đăng ký — Hoàn toàn miễn phí
            </Link>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-[#22c55e] font-medium hover:underline">Đăng nhập</Link>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
          {["📚 Khoá học miễn phí", "👥 Cộng đồng 1,200+", "🎯 Học có lộ trình"].map(t => (
            <div key={t} className="card-dark py-3 px-2">{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
