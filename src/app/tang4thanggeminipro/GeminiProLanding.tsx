"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  User, Mail, Phone, Lock, Loader2, AlertCircle, CheckCircle,
  Eye, EyeOff, ArrowRight, Sparkles, Gift, Star,
  X, Zap, Bot,
} from "lucide-react";

/* ─── Constants ─── */
const COURSE_URL = "/courses/google-tang-4-thang-gemini-pro-tri-gia-hon-2-trieu";

/* ─── What you get ─── */
const BENEFITS = [
  { icon: <Sparkles size={20} />, title: "4 tháng Gemini Pro miễn phí", desc: "Trị giá hơn 2 triệu đồng — Google đang tặng, không phải trả thêm gì." },
  { icon: <Bot size={20} />, title: "Tặng tài khoản ChatGPT Plus 1 tháng", desc: "Trị giá $20 (~500k) — dùng GPT-4o, tạo ảnh, phân tích file miễn phí 1 tháng." },
  { icon: <Zap size={20} />, title: "1.000 credit mỗi tháng", desc: "Dùng cho Gemini 2.5 Pro, tạo ảnh, video, code — xài thoải mái." },
  { icon: <Star size={20} />, title: "Hướng dẫn đăng ký chi tiết", desc: "Từng bước có hình ảnh, ai cũng làm được. Nhận ngay sau khi đăng ký." },
  { icon: <Gift size={20} />, title: "Tặng tài liệu Video AI Triệu View", desc: "Bí mật tạo video AI triệu view — tài liệu độc quyền từ Thầy Lê Đăng Khương." },
];

export default function GeminiProLanding() {
  const registerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  // Capture UTM from URL
  const [utmParams] = useState(() => {
    if (typeof window === "undefined") return {};
    const sp = new URLSearchParams(window.location.search);
    const params: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const val = sp.get(key);
      if (val) params[key] = val;
    }
    return params;
  });

  // Check existing email
  const [emailCheck, setEmailCheck] = useState<{ status: "idle" | "checking" | "exists" | "new" }>({ status: "idle" });
  useEffect(() => {
    const email = form.email.trim();
    if (!email || !email.includes("@") || !email.includes(".")) { setEmailCheck({ status: "idle" }); return; }
    const handle = setTimeout(async () => {
      setEmailCheck({ status: "checking" });
      try {
        const res = await fetch("/api/geminipro/check-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        const data = await res.json();
        setEmailCheck({ status: data.exists ? "exists" : "new" });
      } catch { setEmailCheck({ status: "new" }); }
    }, 600);
    return () => clearTimeout(handle);
  }, [form.email]);

  const isReturningUser = emailCheck.status === "exists";

  const scrollToRegister = () => registerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) { setError("Vui lòng điền đầy đủ thông tin bắt buộc"); return; }
    if (!isReturningUser && (!form.full_name.trim() || !form.phone.trim())) { setError("Vui lòng điền đầy đủ thông tin bắt buộc"); return; }
    if (!isReturningUser && form.password.length < 8) { setError("Mật khẩu tối thiểu 8 ký tự"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/geminipro/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, coupon_code: couponCode.trim() || undefined, ...utmParams }) });
      const data = await res.json();
      if (data.success) { setShowSuccess(true); }
      else { setError(data.error || "Có lỗi xảy ra, vui lòng thử lại"); }
    } catch { setError("Lỗi kết nối. Vui lòng thử lại."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: "#050913", color: "#F1F5FB" }}>

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between" style={{ background: "rgba(5,9,19,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(66,133,244,0.12)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/images/about/portrait.jpg" alt="Lê Đăng Khương" className="w-9 h-9 rounded-lg object-cover" style={{ border: "1px solid rgba(66,133,244,0.35)" }} />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">Lê Đăng Khương</span>
            <span className="text-[10px]" style={{ color: "rgba(241,245,251,0.5)" }}>Video AI & Thương Hiệu Cá Nhân</span>
          </div>
        </Link>
        <button onClick={scrollToRegister} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide cursor-pointer transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #34A853 0%, #1E8E3E 100%)", color: "#fff" }}>
          <Gift size={14} /> Nhận Miễn Phí
        </button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-16 px-4 sm:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(66,133,244,0.12), transparent)" }} />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-bold uppercase tracking-wider" style={{ background: "rgba(52,168,83,0.12)", border: "1px solid rgba(52,168,83,0.3)", color: "#34A853" }}>
            <Gift size={14} /> Miễn Phí 100%
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-4">
            <span className="text-white">Google Tặng </span>
            <span style={{ background: "linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>4 Tháng</span>
            <br />
            <span className="text-white">Gemini Pro </span>
            <span style={{ color: "#34A853" }}>Miễn Phí</span>
          </h1>

          <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-6" style={{ color: "rgba(241,245,251,0.7)" }}>
            Trị giá <strong className="text-white">hơn 2 triệu đồng</strong> — mỗi tháng được <strong className="text-white">1.000 credit</strong>.
            <br className="hidden sm:block" />
            Đăng ký <strong style={{ color: "#34A853" }}>miễn phí</strong> để nhận hướng dẫn chi tiết + link đăng ký + <strong className="text-white">tặng tài khoản ChatGPT Plus 1 tháng ($20)</strong> + tài liệu Video AI Triệu View.
          </p>

          <button onClick={scrollToRegister} className="inline-flex items-center gap-2 rounded-xl py-3.5 px-8 text-base font-bold cursor-pointer transition-all hover:scale-[1.03]" style={{ background: "linear-gradient(135deg, #34A853 0%, #1E8E3E 100%)", color: "#fff", boxShadow: "0 8px 30px rgba(52,168,83,0.35)" }}>
            <Gift size={18} /> Nhận Ngay — Miễn Phí <ArrowRight size={16} />
          </button>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-10">
            {[
              { value: "0đ", label: "Hoàn toàn miễn phí" },
              { value: "1.000", label: "Credit/tháng" },
              { value: "2TR+", label: "Tiết kiệm" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold" style={{ color: "#34A853" }}>{s.value}</div>
                <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: "rgba(241,245,251,0.45)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Banner image */}
          <div className="mt-10 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(66,133,244,0.2)", boxShadow: "0 8px 40px rgba(66,133,244,0.15)" }}>
            <img src="/images/geminipro/banner.png" alt="Google tặng 4 tháng Gemini Pro miễn phí — Tiết kiệm hơn 2 triệu, 1000 credit/tháng" className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* ═══ WHAT YOU GET ═══ */}
      <section className="py-12 sm:py-16 px-4 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-extrabold text-center mb-8 text-white">
            Bạn Nhận Được Gì?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl p-5" style={{ background: "rgba(66,133,244,0.05)", border: "1px solid rgba(66,133,244,0.15)" }}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)" }}>
                    <span className="text-white">{b.icon}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-1">{b.title}</div>
                    <div className="text-[13px] leading-relaxed" style={{ color: "rgba(241,245,251,0.6)" }}>{b.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GOOGLE ONE PROOF ═══ */}
      <section className="py-8 sm:py-12 px-4 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-sm font-semibold mb-4" style={{ color: "rgba(241,245,251,0.6)" }}>
            Ưu đãi chính thức từ <strong className="text-white">Google One</strong> — 0đ cho 4 tháng Gemini Pro
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(66,133,244,0.2)", boxShadow: "0 4px 30px rgba(66,133,244,0.1)" }}>
            <img src="/images/geminipro/google-one-offer.png" alt="Trang Google One — 0đ cho 4 tháng Gemini Pro" className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-12 sm:py-16 px-4 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-extrabold text-center mb-8 text-white">
            Cách Nhận — Đơn Giản 2 Bước
          </h2>
          {[
            { num: "1", title: "Đăng ký miễn phí", desc: "Điền thông tin bên dưới — chỉ mất 30 giây." },
            { num: "2", title: "Nhận hướng dẫn & làm theo", desc: "Xem video hướng dẫn chi tiết, đăng ký theo link — 4 tháng Gemini Pro về tay. Kèm tài liệu Video AI Triệu View." },
          ].map((step, i) => (
            <div key={step.num} className="flex items-start gap-4 mb-6">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)", color: "#fff" }}>{step.num}</span>
              <div>
                <div className="text-base font-bold text-white">{step.title}</div>
                <div className="text-sm mt-1" style={{ color: "rgba(241,245,251,0.6)" }}>{step.desc}</div>
              </div>
              {i < 1 && <div className="hidden sm:block" />}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ REGISTER FORM ═══ */}
      <section ref={registerRef} className="py-12 sm:py-16 px-4 sm:px-8" id="register">
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(66,133,244,0.08) 0%, rgba(13,20,38,0.95) 100%)", border: "1px solid rgba(66,133,244,0.2)" }}>
            {/* Header */}
            <div className="text-center p-6 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ background: "rgba(52,168,83,0.12)", border: "1px solid rgba(52,168,83,0.3)", color: "#34A853" }}>
                <Gift size={12} /> Miễn Phí
              </div>
              <h3 className="text-lg font-bold text-white">Đăng Ký Nhận Hướng Dẫn</h3>
              <p className="text-xs mt-1" style={{ color: "rgba(241,245,251,0.5)" }}>Điền thông tin bên dưới — hoàn toàn miễn phí</p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(241,245,251,0.5)" }}>Email *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.3)" }} />
                  <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="your@email.com" className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(66,133,244,0.2)" }} />
                </div>
                {emailCheck.status === "exists" && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px]" style={{ color: "#34A853" }}>
                    <CheckCircle size={12} /> Chào mừng trở lại!
                  </div>
                )}
              </div>

              {/* Name + Phone (new users) */}
              {!isReturningUser && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(241,245,251,0.5)" }}>Họ và tên *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.3)" }} />
                      <input name="full_name" type="text" value={form.full_name} onChange={handleChange} placeholder="Nguyễn Văn A" className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-white placeholder-gray-600 outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(66,133,244,0.2)" }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(241,245,251,0.5)" }}>Số điện thoại *</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.3)" }} />
                      <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="0912 345 678" className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-white placeholder-gray-600 outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(66,133,244,0.2)" }} />
                    </div>
                  </div>
                </>
              )}

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(241,245,251,0.5)" }}>{isReturningUser ? "Mật khẩu tài khoản *" : "Tạo mật khẩu *"}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.3)" }} />
                  <input name="password" type={showPassword ? "text" : "password"} required value={form.password} onChange={handleChange} placeholder={isReturningUser ? "Nhập mật khẩu" : "Tối thiểu 8 ký tự"} className="w-full pl-10 pr-10 py-3 rounded-lg text-sm text-white placeholder-gray-600 outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(66,133,244,0.2)" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "rgba(241,245,251,0.3)" }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-[13px]" style={{ background: "rgba(234,67,53,0.1)", border: "1px solid rgba(234,67,53,0.25)", color: "#f87171" }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Mã giảm giá */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(241,245,251,0.5)" }}>Mã giảm giá (nếu có)</label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full pl-4 pr-4 py-3 rounded-lg text-sm text-white placeholder-gray-600 outline-none uppercase"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(66,133,244,0.2)" }}
                  placeholder="Nhập mã giảm giá"
                />
              </div>

              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold cursor-pointer transition-all hover:scale-[1.01] disabled:opacity-50" style={{ background: "linear-gradient(135deg, #34A853 0%, #1E8E3E 100%)", color: "#fff", boxShadow: "0 6px 24px rgba(52,168,83,0.3)" }}>
                {loading ? <><Loader2 size={16} className="animate-spin" /> Đang xử lý...</> : <><Gift size={16} /> Nhận Miễn Phí <ArrowRight size={16} /></>}
              </button>

              <p className="text-center text-[11px]" style={{ color: "rgba(241,245,251,0.35)" }}>
                Hoàn toàn miễn phí. Nhận hướng dẫn ngay sau khi đăng ký.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ═══ TRAINER ═══ */}
      <section className="py-12 px-4 sm:px-8">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-6 rounded-2xl p-6" style={{ background: "rgba(66,133,244,0.04)", border: "1px solid rgba(66,133,244,0.12)" }}>
          <img src="/images/about/portrait.jpg" alt="Lê Đăng Khương" className="w-24 h-24 rounded-2xl object-cover flex-shrink-0" style={{ border: "2px solid rgba(66,133,244,0.3)" }} />
          <div>
            <div className="text-base font-bold text-white mb-1">Lê Đăng Khương</div>
            <div className="text-xs mb-2" style={{ color: "#8AB4F8" }}>Chuyên gia Video AI & Thương Hiệu Cá Nhân</div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(241,245,251,0.6)" }}>
              Hơn 5 năm nghiên cứu & ứng dụng AI vào sản xuất video. Đào tạo hàng nghìn học viên tạo video AI chuyên nghiệp và xây dựng thương hiệu cá nhân.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 px-4 text-center" style={{ borderTop: "1px solid rgba(66,133,244,0.1)" }}>
        <p className="text-xs" style={{ color: "rgba(241,245,251,0.3)" }}>
          &copy; {new Date().getFullYear()} Lê Đăng Khương Academy. All rights reserved.
        </p>
      </footer>

      {/* ═══ STICKY CTA ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4" style={{ background: "rgba(5,9,19,0.92)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(66,133,244,0.18)" }}>
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-3">
          <div className="hidden sm:flex items-center gap-3 flex-1">
            <div className="text-sm font-bold text-white">4 Tháng Gemini Pro Miễn Phí</div>
            <div className="text-xs" style={{ color: "rgba(241,245,251,0.5)" }}>Trị giá hơn 2 triệu</div>
          </div>
          <button onClick={scrollToRegister} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-sm font-bold cursor-pointer transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #34A853 0%, #1E8E3E 100%)", color: "#fff", boxShadow: "0 -2px 24px rgba(52,168,83,0.3)" }}>
            <Gift size={15} /> Nhận Miễn Phí Ngay <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="h-20" />

      {/* ═══ SUCCESS POPUP ═══ */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowSuccess(false)} />
          <div className="relative w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh] p-6 sm:p-8" style={{ background: "linear-gradient(180deg, #0E1730 0%, #0A1020 100%)", border: "1px solid rgba(66,133,244,0.25)", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)" }}>
            <button onClick={() => setShowSuccess(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer"><X size={18} /></button>

            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(52,168,83,0.15)", border: "2px solid rgba(52,168,83,0.5)" }}>
                <CheckCircle size={40} style={{ color: "#34A853" }} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Đăng Ký Thành Công!</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(241,245,251,0.6)" }}>
                Chúc mừng bạn! Hãy vào xem hướng dẫn ngay nhé.
              </p>
            </div>

            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)" }}>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)", color: "#fff" }}>1</span>
                <div>
                  <div className="text-sm font-semibold text-white mb-1">Xem Video Hướng Dẫn</div>
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(241,245,251,0.65)" }}>
                    Video hướng dẫn đăng ký 4 tháng Gemini Pro + hướng dẫn nhận tài khoản ChatGPT Plus miễn phí 1 tháng ($20) + tài liệu Video AI Triệu View đã sẵn sàng cho bạn.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)" }}>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)", color: "#fff" }}>2</span>
                <div>
                  <div className="text-sm font-semibold text-white mb-1">Làm Theo Hướng Dẫn</div>
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(241,245,251,0.65)" }}>
                    Xem video, đăng ký theo link — chỉ mất 5 phút là có ngay 4 tháng Gemini Pro!
                  </p>
                </div>
              </div>
            </div>

            <a href={COURSE_URL} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #34A853 0%, #1E8E3E 100%)", color: "#fff" }}>
              Vào Xem Hướng Dẫn Ngay <ArrowRight size={14} />
            </a>
            <button onClick={() => setShowSuccess(false)} className="block w-full mt-3 py-2 text-sm cursor-pointer" style={{ color: "rgba(241,245,251,0.5)" }}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
