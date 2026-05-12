"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import PasswordInput from "@/components/auth/PasswordInput";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();

  // On mount, verify the token_hash from the URL
  useEffect(() => {
    async function verifyToken() {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (!tokenHash || type !== "recovery") {
        setError("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
        setVerifying(false);
        return;
      }

      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });

      if (verifyError) {
        console.error("[Reset Password] verifyOtp error:", verifyError.message);
        setError("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.");
        setVerifying(false);
        return;
      }

      setVerified(true);
      setVerifying(false);
    }

    verifyToken();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu phải có tối thiểu 8 ký tự.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  // Loading state while verifying token
  if (verifying) {
    return (
      <div className="w-full max-w-md text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl font-bold text-white"
          style={{ background: "linear-gradient(135deg, #D4A843, #B8922E)" }}
        >
          ĐK
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Đang xác thực...</h1>
        <p className="text-gray-400 text-sm">Vui lòng đợi trong giây lát</p>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #D4A843, #B8922E)" }}
          >
            ĐK
          </div>
          <h1 className="text-2xl font-bold text-white">Đổi mật khẩu thành công!</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Mật khẩu mới đã được cập nhật. Bạn có thể đăng nhập ngay.
          </p>
        </div>
        <div className="card-dark p-6 sm:p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <Link href="/login" className="btn-green inline-flex justify-center py-2.5 px-6">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  // Error state (invalid/expired token)
  if (!verified) {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #D4A843, #B8922E)" }}
          >
            ĐK
          </div>
          <h1 className="text-2xl font-bold text-white">Đặt lại mật khẩu</h1>
        </div>
        <div
          className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
          style={{ background: "rgba(239,68,68,0.08)" }}
        >
          {error}
        </div>
        <div className="card-dark p-6 sm:p-8 text-center">
          <Link href="/forgot-password" className="btn-green inline-flex justify-center py-2.5 px-6">
            Yêu cầu link mới
          </Link>
        </div>
      </div>
    );
  }

  // Password reset form (token verified)
  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl font-bold text-white"
          style={{ background: "linear-gradient(135deg, #D4A843, #B8922E)" }}
        >
          ĐK
        </div>
        <h1 className="text-2xl font-bold text-white">Đặt lại mật khẩu</h1>
        <p className="text-gray-400 mt-1 text-sm">Nhập mật khẩu mới cho tài khoản của bạn</p>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Mật khẩu mới
            </label>
            <PasswordInput
              name="password"
              placeholder="Tối thiểu 8 ký tự"
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Xác nhận mật khẩu
            </label>
            <PasswordInput
              name="confirm_password"
              placeholder="Nhập lại mật khẩu"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-green w-full justify-center py-2.5 mt-2 disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, #0d1a12 0%, #0a0a0a 60%)" }}
    >
      <Suspense
        fallback={
          <div className="w-full max-w-md text-center">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #D4A843, #B8922E)" }}
            >
              ĐK
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Đang tải...</h1>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
