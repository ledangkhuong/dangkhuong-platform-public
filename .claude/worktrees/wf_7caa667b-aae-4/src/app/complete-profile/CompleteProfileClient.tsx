"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Phone, Loader2, CheckCircle2 } from "lucide-react";

export default function CompleteProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  // Check if user is logged in and actually needs to complete profile
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("id", user.id)
        .single();

      // If phone already exists, go to dashboard
      if (profile?.phone) {
        router.replace("/dashboard");
        return;
      }

      setUserName(profile?.full_name || user.user_metadata?.full_name || "");
      setChecking(false);
    }
    check();
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleaned = phone.replace(/\s+/g, "");
    if (!/^(0|\+84)[0-9]{9}$/.test(cleaned)) {
      setError("Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 số (VD: 0912345678)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Lỗi không xác định");
        setLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.replace("/dashboard");
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at top, #0d1a12 0%, #0a0a0a 60%)" }}>
        <Loader2 size={32} className="text-[#D4A843] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, #0d1a12 0%, #0a0a0a 60%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/images/about/portrait.jpg" alt="Lê Đăng Khương" className="w-14 h-14 rounded-2xl mb-4 object-cover inline-block" />
          <h1 className="text-2xl font-bold text-white">Hoàn tất đăng ký</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {userName ? (
              <>Xin chào <span className="text-[#D4A843] font-medium">{userName}</span>! </>
            ) : null}
            Vui lòng cung cấp số điện thoại để hoàn tất.
          </p>
        </div>

        {/* Success icon */}
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg text-sm border"
          style={{ background: "rgba(212,168,67,0.06)", borderColor: "rgba(212,168,67,0.2)", color: "#D4A843" }}>
          <CheckCircle2 size={16} />
          <span>Đăng nhập thành công! Chỉ cần thêm 1 bước nữa.</span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
            style={{ background: "rgba(239,68,68,0.08)" }}>
            {error}
          </div>
        )}

        {/* Card */}
        <div className="card-dark p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1.5">
                Số điện thoại <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="phone"
                  type="tel"
                  placeholder="0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-dark w-full pl-10"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Định dạng: 09xx hoặc +84xxx (10 số)</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-green w-full justify-center py-2.5 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Hoàn tất & Vào học"
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-gray-500 mt-4">
            Số điện thoại giúp chúng tôi hỗ trợ bạn tốt hơn và bảo mật tài khoản.
          </p>
        </div>
      </div>
    </div>
  );
}
