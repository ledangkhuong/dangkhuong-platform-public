"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";

export default function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const full_name = form.get("full_name") as string;
    const phone = (form.get("phone") as string)?.replace(/\s+/g, "");
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    // Client-side validation
    if (!full_name?.trim()) { setError("Vui lòng nhập họ và tên"); setLoading(false); return; }
    if (!phone || !/^(0|\+84)[0-9]{9}$/.test(phone)) { setError("Số điện thoại không hợp lệ (VD: 0912345678)"); setLoading(false); return; }
    if (!email?.trim()) { setError("Vui lòng nhập email"); setLoading(false); return; }
    if (!password || password.length < 8) { setError("Mật khẩu phải có ít nhất 8 ký tự"); setLoading(false); return; }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name,
          phone,
          email,
          password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/login?registered=1");
      } else {
        setError(data.error || "Có lỗi xảy ra");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
          style={{ background: "rgba(239,68,68,0.08)" }}
        >
          {error}
        </div>
      )}

      {/* Họ và tên */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1.5">
          Họ và tên
        </label>
        <input id="fullName" name="full_name" type="text" placeholder="Nguyễn Văn A" className="input-dark w-full" required />
      </div>

      {/* Số điện thoại */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1.5">
          Số điện thoại <span className="text-red-400">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="0912345678"
          pattern="^(0|\+84)[0-9]{9}$"
          title="Nhập số điện thoại hợp lệ (VD: 0912345678)"
          className="input-dark w-full"
          required
        />
        <p className="text-[10px] text-gray-500 mt-1">Định dạng: 09xx hoặc +84xxx (10 số)</p>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
          Email
        </label>
        <input id="email" name="email" type="email" placeholder="ban@email.com" className="input-dark w-full" required />
        <p className="text-[10px] text-amber-500/80 mt-1">
          Vui lòng sử dụng email chính xác. Một số tính năng sẽ bị hạn chế nếu email không đúng.
        </p>
      </div>

      {/* Mật khẩu */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
          Mật khẩu
        </label>
        <PasswordInput id="password" name="password" placeholder="Tối thiểu 8 ký tự" minLength={8} />
      </div>

      {/* Xác nhận mật khẩu */}
      <div>
        <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-300 mb-1.5">
          Xác nhận mật khẩu
        </label>
        <PasswordInput id="passwordConfirm" name="password_confirm" placeholder="Nhập lại mật khẩu" minLength={8} />
      </div>

      <p className="text-xs text-gray-500 pt-1">
        Bằng cách đăng ký, bạn đồng ý với{" "}
        <a href="#" className="text-[#D4A843] hover:underline">Điều khoản dịch vụ</a>{" "}
        và{" "}
        <a href="#" className="text-[#D4A843] hover:underline">Chính sách bảo mật</a>
      </p>

      <button
        type="submit"
        disabled={loading}
        className="btn-green w-full justify-center py-2.5 mt-2 disabled:opacity-50"
      >
        {loading ? "Đang xử lý..." : "Tạo tài khoản"}
      </button>

      <SocialLoginButtons />
    </form>
  );
}
