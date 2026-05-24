"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  User, Mail, Phone, Lock, Loader2, AlertCircle, CheckCircle, Check,
  Copy, Eye, EyeOff, ArrowRight, Sparkles, Gift, Star, Coffee,
  ChevronDown, X, Zap,
} from "lucide-react";
import BankTransferButtons from "@/components/BankTransferButtons";

/* ─── Constants ─── */
const COURSE_URL = "/courses/google-tang-4-thang-gemini-pro-tri-gia-hon-2-trieu";

const BANK_NAMES: Record<string, string> = {
  BIDV: "BIDV", VCB: "Vietcombank", TCB: "Techcombank", MB: "MB Bank",
  ACB: "ACB", VPB: "VPBank", TPB: "TPBank", STB: "Sacombank",
  VIB: "VIB", MSB: "MSB", SHB: "SHB", HDB: "HDBank",
};

interface PaymentInfo {
  order_code: string;
  amount: number;
  transfer_content: string;
  qr_url: string | null;
  bank_account: string | null;
  bank_code: string | null;
}

/* ─── What you get ─── */
const BENEFITS = [
  { icon: <Sparkles size={20} />, title: "4 tháng Gemini Pro miễn phí", desc: "Trị giá hơn 2 triệu đồng — Google đang tặng, không phải trả thêm gì." },
  { icon: <Zap size={20} />, title: "1.000 credit mỗi tháng", desc: "Dùng cho Gemini 2.5 Pro, tạo ảnh, video, code — xài thoải mái." },
  { icon: <Star size={20} />, title: "Hướng dẫn đăng ký chi tiết", desc: "Từng bước có hình ảnh, ai cũng làm được. Gửi qua email ngay sau thanh toán." },
  { icon: <Gift size={20} />, title: "Tặng tài liệu Video AI Triệu View", desc: "Bí mật tạo video AI triệu view — tài liệu độc quyền từ Thầy Lê Đăng Khương." },
];

export default function GeminiProLanding() {
  const registerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [copied, setCopied] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");

  // Poll payment status
  useEffect(() => {
    if (!showModal || !paymentInfo?.order_code || paymentStatus === "paid") return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/check-status?order_code=${paymentInfo.order_code}`);
        const data = await res.json();
        if (data.status === "paid") { setPaymentStatus("paid"); clearInterval(poll); }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [showModal, paymentInfo?.order_code, paymentStatus]);

  // Check existing email
  const [emailCheck, setEmailCheck] = useState<{ status: "idle" | "checking" | "exists" | "new"; fullName: string | null }>({ status: "idle", fullName: null });
  useEffect(() => {
    const email = form.email.trim();
    if (!email || !email.includes("@") || !email.includes(".")) { setEmailCheck({ status: "idle", fullName: null }); return; }
    const handle = setTimeout(async () => {
      setEmailCheck((s) => ({ ...s, status: "checking" }));
      try {
        const res = await fetch("/api/geminipro/check-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        const data = await res.json();
        setEmailCheck({ status: data.exists ? "exists" : "new", fullName: data.fullName ?? null });
      } catch { setEmailCheck({ status: "new", fullName: null }); }
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
      const res = await fetch("/api/geminipro/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form }) });
      const data = await res.json();
      if (data.success) { if (data.paymentInfo) setPaymentInfo(data.paymentInfo); setShowModal(true); }
      else { setError(data.error || "Có lỗi xảy ra, vui lòng thử lại"); }
    } catch { setError("Lỗi kết nối. Vui lòng thử lại."); }
    finally { setLoading(false); }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(""), 2000); });
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
        <button onClick={scrollToRegister} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide cursor-pointer transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)", color: "#fff" }}>
          <Coffee size={14} /> Nhận Ngay
        </button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-16 px-4 sm:px-8 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(66,133,244,0.12), transparent)" }} />

        <div className="relative max-w-3xl mx-auto">
          {/* Google badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-bold uppercase tracking-wider" style={{ background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.25)", color: "#8AB4F8" }}>
            <Sparkles size={14} /> Google One AI Premium
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
            Mời tôi ly cafe <strong style={{ color: "#FBBC05" }}>99.000đ</strong>, tôi gửi bạn hướng dẫn chi tiết + link đăng ký + <strong className="text-white">tặng tài liệu bí mật Video AI Triệu View</strong>.
          </p>

          <button onClick={scrollToRegister} className="inline-flex items-center gap-2 rounded-xl py-3.5 px-8 text-base font-bold cursor-pointer transition-all hover:scale-[1.03]" style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)", color: "#fff", boxShadow: "0 8px 30px rgba(66,133,244,0.35)" }}>
            <Coffee size={18} /> Mời Cafe & Nhận Ngay <ArrowRight size={16} />
          </button>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-10">
            {[
              { value: "0đ", label: "4 tháng đầu" },
              { value: "1.000", label: "Credit/tháng" },
              { value: "2TR+", label: "Tiết kiệm" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold" style={{ color: "#FBBC05" }}>{s.value}</div>
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
            Cách Nhận — Đơn Giản 3 Bước
          </h2>
          {[
            { num: "1", title: "Mời cafe 99k", desc: "Thanh toán nhanh qua chuyển khoản ngân hàng." },
            { num: "2", title: "Kiểm tra email", desc: "Nhận hướng dẫn chi tiết từng bước có hình ảnh + link đăng ký trực tiếp." },
            { num: "3", title: "Làm theo & nhận", desc: "Đăng ký theo hướng dẫn — 4 tháng Gemini Pro về tay. Kèm tài liệu Video AI Triệu View." },
          ].map((step, i) => (
            <div key={step.num} className="flex items-start gap-4 mb-6">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)", color: "#fff" }}>{step.num}</span>
              <div>
                <div className="text-base font-bold text-white">{step.title}</div>
                <div className="text-sm mt-1" style={{ color: "rgba(241,245,251,0.6)" }}>{step.desc}</div>
              </div>
              {i < 2 && <div className="hidden sm:block" />}
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ background: "rgba(251,188,5,0.12)", border: "1px solid rgba(251,188,5,0.3)", color: "#FBBC05" }}>
                <Coffee size={12} /> Chỉ 99.000đ
              </div>
              <h3 className="text-lg font-bold text-white">Mời Cafe & Nhận Hướng Dẫn</h3>
              <p className="text-xs mt-1" style={{ color: "rgba(241,245,251,0.5)" }}>Điền thông tin bên dưới để bắt đầu</p>
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
                    <CheckCircle size={12} /> Chào mừng trở lại{emailCheck.fullName ? `, ${emailCheck.fullName}` : ""}!
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

              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold cursor-pointer transition-all hover:scale-[1.01] disabled:opacity-50" style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)", color: "#fff", boxShadow: "0 6px 24px rgba(66,133,244,0.3)" }}>
                {loading ? <><Loader2 size={16} className="animate-spin" /> Đang xử lý...</> : <><Coffee size={16} /> Thanh Toán 99.000đ <ArrowRight size={16} /></>}
              </button>

              <p className="text-center text-[11px]" style={{ color: "rgba(241,245,251,0.35)" }}>
                Thanh toán qua chuyển khoản ngân hàng. Nhận hướng dẫn qua email ngay lập tức.
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
          <button onClick={scrollToRegister} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-sm font-bold cursor-pointer transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)", color: "#fff", boxShadow: "0 -2px 24px rgba(66,133,244,0.3)" }}>
            <Coffee size={15} /> Mời Cafe 99K & Nhận Ngay <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="h-20" />

      {/* ═══ PAYMENT MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh]" style={{ background: "linear-gradient(180deg, #0E1730 0%, #0A1020 100%)", border: "1px solid rgba(66,133,244,0.25)", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)" }}>

            {paymentStatus === "paid" ? (
              /* ─── SUCCESS POPUP ─── */
              <div className="p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(52,168,83,0.15)", border: "2px solid rgba(52,168,83,0.5)" }}>
                    <CheckCircle size={40} style={{ color: "#34A853" }} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Thanh Toán Thành Công!</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(241,245,251,0.6)" }}>
                    Cảm ơn bạn đã mời cafe! Hãy kiểm tra email ngay nhé.
                  </p>
                </div>

                <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)" }}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)", color: "#fff" }}>1</span>
                    <div>
                      <div className="text-sm font-semibold text-white mb-1">Kiểm Tra Email</div>
                      <p className="text-[13px] leading-relaxed" style={{ color: "rgba(241,245,251,0.65)" }}>
                        Hướng dẫn đăng ký 4 tháng Gemini Pro + tài liệu Video AI Triệu View đã được gửi vào email. Kiểm tra cả <strong className="text-white">Spam/Promotions</strong> nhé!
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
                        Mở email, đọc hướng dẫn từng bước và click link đăng ký. Chỉ mất 5 phút là có ngay 4 tháng Gemini Pro!
                      </p>
                    </div>
                  </div>
                </div>

                <a href={COURSE_URL} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #34A853 0%, #1E8E3E 100%)", color: "#fff" }}>
                  Vào Xem Hướng Dẫn <ArrowRight size={14} />
                </a>
                <button onClick={() => setShowModal(false)} className="block w-full mt-3 py-2 text-sm cursor-pointer" style={{ color: "rgba(241,245,251,0.5)" }}>Đóng</button>
              </div>
            ) : (
              /* ─── PAYMENT QR ─── */
              <div>
                <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(66,133,244,0.15)" }}>
                  <h3 className="text-sm font-bold text-white">Thanh toán</h3>
                  <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white cursor-pointer"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Amount */}
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(241,245,251,0.4)" }}>Số tiền</div>
                    <div className="text-3xl font-extrabold tabular-nums" style={{ color: "#FBBC05" }}>{paymentInfo?.amount?.toLocaleString("vi-VN")}đ</div>
                  </div>

                  {/* QR */}
                  {paymentInfo?.qr_url && (
                    <div className="flex justify-center">
                      <div className="rounded-xl p-2" style={{ background: "#fff" }}>
                        <img src={paymentInfo.qr_url} alt="QR" className="w-48 h-48 object-contain" />
                      </div>
                    </div>
                  )}

                  {/* Transfer content */}
                  <div className="rounded-lg p-3" style={{ background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)" }}>
                    <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "rgba(241,245,251,0.4)" }}>Nội dung chuyển khoản</div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white">{paymentInfo?.transfer_content}</span>
                      <button onClick={() => copyText(paymentInfo?.transfer_content || "", "content")} className="flex items-center gap-1 text-[11px] cursor-pointer" style={{ color: "#8AB4F8" }}>
                        {copied === "content" ? <><Check size={12} /> Đã copy</> : <><Copy size={12} /> Copy</>}
                      </button>
                    </div>
                  </div>

                  {/* Bank info */}
                  {paymentInfo?.bank_account && paymentInfo?.bank_code && (
                    <div className="rounded-lg p-3" style={{ background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(241,245,251,0.4)" }}>Ngân hàng</span>
                        <span className="text-sm font-semibold text-white">{BANK_NAMES[paymentInfo.bank_code] || paymentInfo.bank_code}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(241,245,251,0.4)" }}>Số tài khoản</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tabular-nums">{paymentInfo.bank_account}</span>
                          <button onClick={() => copyText(paymentInfo.bank_account!, "bank")} className="text-[11px] cursor-pointer" style={{ color: "#8AB4F8" }}>
                            {copied === "bank" ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank transfer buttons */}
                  {paymentInfo?.bank_account && paymentInfo?.bank_code && (
                    <BankTransferButtons
                      bankCode={paymentInfo.bank_code}
                      bankAccount={paymentInfo.bank_account}
                      amount={paymentInfo.amount}
                      transferContent={paymentInfo.transfer_content}
                    />
                  )}

                  {/* Waiting */}
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 size={14} className="animate-spin" style={{ color: "#4285F4" }} />
                    <span className="text-xs" style={{ color: "rgba(241,245,251,0.5)" }}>Đang chờ thanh toán...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
