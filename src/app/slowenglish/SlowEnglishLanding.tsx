"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { siteConfig, getZaloPhone } from "@/lib/site-config";
import {
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import BankTransferButtons from "@/components/BankTransferButtons";
import { event as fbEvent } from "@/lib/fbpixel";
import HeroSection from "./sections/HeroSection";
import ProofSection from "./sections/ProofSection";
import PainPointsSection from "./sections/PainPointsSection";
import CourseContentSection from "./sections/CourseContentSection";
import ResourcesSection from "./sections/ResourcesSection";
import PricingSection from "./sections/PricingSection";
import ComparisonSection from "./sections/ComparisonSection";
import AudienceSection from "./sections/AudienceSection";
import FAQSection from "./sections/FAQSection";
import FinalCTASection from "./sections/FinalCTASection";

/* ─── Types ──────────────────────────────────────────── */

interface PaymentInfo {
  order_code: string;
  amount: number;
  transfer_content: string;
  qr_url: string | null;
  bank_account: string | null;
  bank_code: string | null;
}

/* ─── Component ──────────────────────────────────────── */

export default function SlowEnglishLanding() {
  const pricingRef = useRef<HTMLDivElement>(null);
  const registerRef = useRef<HTMLDivElement>(null);

  /* ── Form state ── */
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    package: "ultra" as "standard" | "ultra",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [productName, setProductName] = useState("");
  const [copied, setCopied] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");

  // Poll order status every 5s when payment modal is open
  useEffect(() => {
    if (!showModal || !paymentInfo?.order_code || paymentStatus === "paid") return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/check-status?order_code=${paymentInfo.order_code}`);
        const data = await res.json();
        if (data.status === "paid") {
          setPaymentStatus("paid");
          clearInterval(poll);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [showModal, paymentInfo?.order_code, paymentStatus]);

  // Facebook Pixel — ViewContent on page load
  useEffect(() => {
    fbEvent("ViewContent", {
      content_name: "SlowEnglish Landing",
      content_category: "course",
      content_type: "product",
    });
  }, []);

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToRegister = () => {
    registerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu tối thiểu 8 ký tự");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/slowenglish/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.paymentInfo) setPaymentInfo(data.paymentInfo);
        if (data.productName) setProductName(data.productName);
        setShowModal(true);

        // Facebook Pixel — client-side Lead + InitiateCheckout (deduplication via eventID with CAPI)
        const amount = data.paymentInfo?.amount || 0;
        const orderId = data.order?.id || "";
        fbEvent("Lead", {
          content_name: "SlowEnglish Registration",
          value: amount,
          currency: "VND",
        });
        fbEvent("InitiateCheckout", {
          content_name: data.productName || "SlowEnglish",
          value: amount,
          currency: "VND",
          content_ids: [orderId],
        });
      } else {
        setError(data.error || "Có lỗi xảy ra, vui lòng thử lại");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#f5f5f5" }}>
      {/* ═══ NAVBAR ═══ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between"
        style={{
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/images/about/portrait.jpg"
            alt="Lê Đăng Khương"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="font-semibold text-sm text-white hidden sm:block">
            Lê Đăng Khương
          </span>
        </Link>
        <button
          onClick={scrollToRegister}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-gray-900 transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
          }}
        >
          Đăng Ký Ngay <ArrowRight size={14} />
        </button>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-14" />

      <HeroSection onScrollToRegister={scrollToRegister} />

      <ProofSection />
      <PainPointsSection />
      <CourseContentSection />
      <ResourcesSection />
      <div ref={pricingRef}>
        <PricingSection onScrollToRegister={scrollToRegister} />
      </div>
      <ComparisonSection />
      <AudienceSection />
      <FAQSection />

      {/* ═══ REGISTRATION FORM ═══ */}
      <section ref={registerRef} id="register" className="py-12 sm:py-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-white">
              Đăng Ký & Thanh Toán Ngay
            </h2>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Điền thông tin bên dưới — nhận mã QR chuyển khoản ngay lập tức
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-2xl space-y-3"
            style={{ background: "#111", border: "1px solid rgba(212,168,67,0.12)" }}
          >
            {error && (
              <div
                className="p-4 rounded-lg flex items-start gap-3 text-sm"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span className="text-red-400 leading-relaxed">{error}</span>
              </div>
            )}

            {/* Package Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Chọn gói học
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, package: "standard" }))}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    background: form.package === "standard" ? "rgba(251,191,36,0.1)" : "#1a1a1a",
                    border: `2px solid ${form.package === "standard" ? "#FBBF24" : "#2a2a2a"}`,
                  }}
                >
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Standard
                  </span>
                  <p className="text-lg font-bold text-white mt-1">499K</p>
                  <p className="text-[10px] text-gray-500 line-through">999.000đ</p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, package: "ultra" }))}
                  className="relative p-3 rounded-xl text-left transition-all"
                  style={{
                    background: form.package === "ultra" ? "rgba(251,191,36,0.1)" : "#1a1a1a",
                    border: `2px solid ${form.package === "ultra" ? "#FBBF24" : "#2a2a2a"}`,
                  }}
                >
                  <span
                    className="absolute -top-2.5 right-2 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ background: "#FBBF24", color: "#0a0a0a" }}
                  >
                    Hot
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#FBBF24" }}>
                    Ultra (Đồng Hành)
                  </span>
                  <p className="text-lg font-bold text-white mt-1">789K</p>
                  <p className="text-[10px] text-gray-500 line-through">1.990.000đ</p>
                </button>
              </div>
            </div>

            {/* Email — FIRST for consistency with hocchuaxongtiendave */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(212,168,67,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                  required
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Họ và tên <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  name="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(212,168,67,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                  required
                />
              </div>
            </div>

            {/* Phone — now required */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Số điện thoại <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0901 234 567"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(212,168,67,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                  required
                />
              </div>
            </div>

            {/* Password — minimum 8 characters */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Mật khẩu <span className="text-red-400">*</span>{" "}
                <span className="text-gray-500">(tối thiểu 8 ký tự)</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(212,168,67,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "2.75rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-4 mt-4 text-base sm:text-lg font-bold uppercase tracking-wide transition-all hover:opacity-95 hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #D4A843 0%, #B8944A 100%)",
                color: "#0A1020",
                boxShadow: "0 0 30px rgba(212,168,67,0.4)",
              }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={18} />
              )}
              {loading
                ? "Đang xử lý..."
                : form.package === "ultra"
                  ? "ĐĂNG KÝ GÓI ĐỒNG HÀNH — 789.000Đ"
                  : "ĐĂNG KÝ GÓI STANDARD — 499.000Đ"}
            </button>

            <div className="flex items-center justify-center gap-4 pt-3 text-xs" style={{ color: "rgba(245,245,245,0.45)" }}>
              <span>🔒 Thanh toán an toàn</span>
              <span>•</span>
              <span>⚡ Cấp khóa tự động</span>
            </div>

            <p className="text-[11px] text-gray-500 text-center leading-relaxed pt-1">
              Bằng việc đăng ký, bạn đồng ý với điều khoản sử dụng của Lê Đăng
              Khương Academy.
            </p>
            <p className="text-xs text-center pt-3 text-gray-400">
              Đã có tài khoản?{" "}
              <span className="text-[#FBBF24]">
                Nhập đúng email &amp; mật khẩu — hệ thống tự tạo đơn hàng.
              </span>
            </p>
          </form>
        </div>
      </section>

      <FinalCTASection onScrollToRegister={scrollToRegister} />

      {/* ═══ STICKY MOBILE CTA ═══ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:hidden"
        style={{
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #1a1a1a",
        }}
      >
        <button
          onClick={scrollToRegister}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold uppercase tracking-wide"
          style={{
            background: "linear-gradient(135deg, #EAB308, #F59E0B)",
            color: "#000000",
          }}
        >
          Đăng Ký Ngay <ArrowRight size={14} />
        </button>
      </div>

      {/* Bottom padding for sticky mobile CTA */}
      <div className="h-20 sm:hidden" />

      {/* ═══ PAYMENT MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          <div
            className="relative w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh]"
            style={{ background: "#111", border: "1px solid #1f1f1f" }}
          >
            {paymentStatus === "paid" ? (
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 bg-green-500/15 border-2 border-green-500/40">
                  <CheckCircle size={40} className="text-green-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Thanh Toán Thành Công! 🎉
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  Khoá học đã được mở khoá. Đăng nhập để bắt đầu học ngay!
                </p>
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-bold transition-all hover:scale-[1.02] text-gray-900"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                >
                  Vào Học Ngay <ArrowRight size={16} />
                </a>
                <button
                  onClick={() => setShowModal(false)}
                  className="block w-full mt-4 py-2 text-sm text-gray-500 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <>
            {/* Modal Header */}
            <div
              className="p-8 text-center"
              style={{
                background:
                  "linear-gradient(180deg, rgba(251,191,36,0.12) 0%, transparent 100%)",
                borderBottom: "1px solid rgba(251,191,36,0.1)",
              }}
            >
              <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-5 bg-[#FBBF24]/15 border-2 border-[#FBBF24]/30">
                <CheckCircle size={36} className="text-[#FBBF24]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Đăng Ký Thành Công!
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {productName || "Khoá học Slow English"}
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {/* QR Payment */}
              {paymentInfo?.qr_url && (
                <div className="mb-8">
                  <p className="text-sm sm:text-base font-semibold text-white mb-4 text-center leading-relaxed">
                    Chuyển khoản{" "}
                    <span style={{ color: "#FBBF24" }}>
                      {paymentInfo.amount.toLocaleString("vi-VN")}đ
                    </span>{" "}
                    để mở khoá khoá học:
                  </p>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-xl bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={paymentInfo.qr_url}
                        alt="QR thanh toán"
                        width={220}
                        height={220}
                        className="block"
                      />
                    </div>
                  </div>

                  {/* Hướng dẫn chụp QR */}
                  <div className="p-3 rounded-lg mb-5 text-xs leading-relaxed" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <p className="font-semibold text-[#f59e0b] mb-1.5">📱 Hướng dẫn thanh toán:</p>
                    <ol className="text-gray-400 space-y-1 list-decimal list-inside">
                      <li><strong className="text-gray-300">Chụp màn hình</strong> mã QR ở trên</li>
                      <li>Mở <strong className="text-gray-300">app ngân hàng</strong> trên điện thoại</li>
                      <li>Chọn <strong className="text-gray-300">Quét mã QR</strong> hoặc <strong className="text-gray-300">QR Pay</strong></li>
                      <li>Quét mã QR đã chụp → Xác nhận chuyển khoản</li>
                    </ol>
                    <p className="text-gray-500 mt-2 italic">Hoặc bấm nút &ldquo;Chuyển khoản ngay&rdquo; bên dưới để mở app ngân hàng tự động.</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        label: "Số tiền",
                        value: `${paymentInfo.amount.toLocaleString("vi-VN")}đ`,
                        key: "amount",
                        highlight: true,
                      },
                      {
                        label: "Nội dung CK",
                        value: paymentInfo.transfer_content,
                        key: "content",
                        copyable: true,
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a]"
                      >
                        <span className="text-xs text-gray-400">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              item.highlight ? "text-[#FBBF24]" : "text-white font-mono"
                            }`}
                          >
                            {item.value}
                          </span>
                          {item.copyable && (
                            <button
                              onClick={() => copyText(item.value, item.key)}
                              className="text-gray-500 hover:text-white transition-colors"
                            >
                              {copied === item.key ? (
                                <Check size={13} className="text-[#FBBF24]" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bank deep link buttons */}
                  {paymentInfo.bank_account && paymentInfo.bank_code && (
                    <BankTransferButtons
                      bankAccount={paymentInfo.bank_account}
                      bankCode={paymentInfo.bank_code}
                      amount={paymentInfo.amount}
                      transferContent={paymentInfo.transfer_content}
                      accentColor="#FBBF24"
                    />
                  )}

                  <div className="mt-4 p-4 rounded-lg text-sm text-gray-400 leading-relaxed bg-[#FBBF24]/5 border border-[#FBBF24]/10">
                    <span className="text-[#FBBF24] font-medium">
                      ⚡ Tự động xác nhận
                    </span>{" "}
                    — Sau khi chuyển khoản, hệ thống sẽ tự động mở khoá khoá học
                    trong vòng 60 giây.
                  </div>
                </div>
              )}

              {/* No QR fallback */}
              {!paymentInfo?.qr_url && paymentInfo && (
                <div className="mb-8 p-5 rounded-xl bg-[#f59e0b]/5 border border-[#f59e0b]/15">
                  <p className="text-sm font-semibold text-[#f59e0b] mb-3">
                    📞 Liên hệ thanh toán
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Vui lòng liên hệ admin qua Zalo{" "}
                    <strong className="text-white">{getZaloPhone()}</strong> để nhận
                    thông tin chuyển khoản và mở khoá khoá học.
                  </p>
                </div>
              )}

              {/* Instructions */}
              <div className="p-5 rounded-xl bg-[#f59e0b]/5 border border-[#f59e0b]/15 space-y-4">
                <p className="text-sm sm:text-base font-semibold text-[#f59e0b] flex items-center gap-2">
                  <Mail size={16} /> Bước tiếp theo:
                </p>
                <div className="space-y-4">
                  {[
                    <>
                      Chuyển khoản theo mã QR ở trên.
                    </>,
                    <>
                      Kiểm tra email{" "}
                      <strong className="text-white">({form.email})</strong> và{" "}
                      <strong className="text-white">kích hoạt tài khoản</strong>.
                    </>,
                    <>
                      <strong className="text-white">Đăng nhập</strong> tại{" "}
                      <Link
                        href="/login"
                        className="text-[#FBBF24] underline font-medium"
                      >
                        dangkhuong.com/login
                      </Link>{" "}
                      để truy cập khoá học.
                    </>,
                  ].map((content, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-xs font-bold text-[#f59e0b] bg-[#f59e0b]/10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-300 leading-relaxed">
                        {content}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wide text-gray-900"
                  style={{
                    background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
                  }}
                >
                  <ExternalLink size={14} /> Đăng Nhập Ngay
                </Link>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  Đóng
                </button>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
