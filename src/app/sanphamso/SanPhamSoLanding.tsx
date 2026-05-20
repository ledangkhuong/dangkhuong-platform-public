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
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import BankTransferButtons from "@/components/BankTransferButtons";
import HeroSection from "./sections/HeroSection";
import PainSection from "./sections/PainSection";
import SolutionSection from "./sections/SolutionSection";
import SpeakerSection from "./sections/SpeakerSection";
import ModulesSection from "./sections/ModulesSection";
import BonusSection from "./sections/BonusSection";
import TestimonialSection from "./sections/TestimonialSection";
import FAQSection from "./sections/FAQSection";
import FinalCTASection from "./sections/FinalCTASection";

/* ─── Constants ─────────────────────────────────────── */

const BANK_NAMES: Record<string, string> = {
  BIDV: "Ngân hàng BIDV",
  VCB: "Vietcombank",
  TCB: "Techcombank",
  MB: "MB Bank",
  ACB: "ACB",
  VPB: "VPBank",
  TPB: "TPBank",
  STB: "Sacombank",
  VIB: "VIB",
  MSB: "MSB",
  SHB: "SHB",
  HDB: "HDBank",
  OCB: "OCB",
  LPB: "LienVietPostBank",
  EIB: "Eximbank",
  NAB: "Nam A Bank",
  BAB: "Bac A Bank",
  SCB: "SCB",
};

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

export default function SanPhamSoLanding() {
  const registerRef = useRef<HTMLDivElement>(null);

  /* ── Form state ── */
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
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
      const res = await fetch("/api/sanphamso/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.paymentInfo) setPaymentInfo(data.paymentInfo);
        setShowModal(true);
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
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-gray-900 transition-opacity hover:opacity-90 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
          }}
        >
          Đăng Ký Ngay — 100K <ArrowRight size={14} />
        </button>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-14" />

      {/* ═══ SECTIONS ═══ */}
      <HeroSection onScrollToRegister={scrollToRegister} />
      <PainSection />
      <SolutionSection />
      <SpeakerSection />
      <ModulesSection />
      <BonusSection onScrollToRegister={scrollToRegister} />
      <TestimonialSection />
      <FAQSection />

      {/* ═══ REGISTRATION FORM ═══ */}
      <section ref={registerRef} id="register" className="py-14 sm:py-20 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-[28px] sm:text-3xl font-extrabold mb-3 text-white">
              Đăng Ký & Thanh Toán Ngay
            </h2>
            <p className="text-[15px] sm:text-base text-gray-500 leading-[1.75]">
              Điền thông tin bên dưới — nhận mã QR chuyển khoản ngay lập tức
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
              <span className="text-lg font-bold" style={{ color: "#FBBF24" }}>CHỈ 100.000đ</span>
              <span className="text-sm text-gray-400 line-through">3.000.000đ</span>
            </div>
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

            {/* Email */}
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
                  className="input-dark w-full rounded-lg outline-none text-white"
                  style={{ paddingLeft: "2.75rem", paddingTop: "0.75rem", paddingBottom: "0.75rem", background: "#0a0a0a", border: "1px solid rgba(212,168,67,0.15)" }}
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
                  className="input-dark w-full rounded-lg outline-none text-white"
                  style={{ paddingLeft: "2.75rem", paddingTop: "0.75rem", paddingBottom: "0.75rem", background: "#0a0a0a", border: "1px solid rgba(212,168,67,0.15)" }}
                  required
                />
              </div>
            </div>

            {/* Phone */}
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
                  className="input-dark w-full rounded-lg outline-none text-white"
                  style={{ paddingLeft: "2.75rem", paddingTop: "0.75rem", paddingBottom: "0.75rem", background: "#0a0a0a", border: "1px solid rgba(212,168,67,0.15)" }}
                  required
                />
              </div>
            </div>

            {/* Password */}
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
                  className="input-dark w-full rounded-lg outline-none text-white"
                  style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem", paddingTop: "0.75rem", paddingBottom: "0.75rem", background: "#0a0a0a", border: "1px solid rgba(212,168,67,0.15)" }}
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
              {loading ? "Đang xử lý..." : "ĐĂNG KÝ NGAY — CHỈ 100.000đ"}
            </button>

            <div className="flex items-center justify-center gap-4 pt-3 text-xs text-gray-500">
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
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold uppercase tracking-wide text-gray-900 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
            boxShadow: "0 -2px 20px rgba(251,191,36,0.25)",
          }}
        >
          Đăng Ký Ngay — 100K <ArrowRight size={16} />
        </button>
      </div>

      {/* Bottom padding for sticky mobile CTA */}
      <div className="h-20 sm:hidden" />

      {/* ═══ PAYMENT MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-bold text-white transition-all hover:scale-[1.02]"
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
                Lộ Trình Kiếm Tiền Từ Sản Phẩm Số 2026
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
                  <div className="flex justify-center mb-5">
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

                  <div className="space-y-3">
                    {[
                      ...(paymentInfo.bank_code
                        ? [
                            {
                              label: "Ngân hàng",
                              value:
                                BANK_NAMES[paymentInfo.bank_code.toUpperCase()] ||
                                paymentInfo.bank_code,
                              key: "bank",
                              copyable: true,
                              highlight: false,
                            },
                          ]
                        : []),
                      ...(paymentInfo.bank_account
                        ? [
                            {
                              label: "Số tài khoản",
                              value: paymentInfo.bank_account,
                              key: "account",
                              copyable: true,
                              highlight: false,
                            },
                          ]
                        : []),
                      {
                        label: "Số tiền",
                        value: `${paymentInfo.amount.toLocaleString("vi-VN")}đ`,
                        key: "amount",
                        copyable: true,
                        highlight: true,
                      },
                      {
                        label: "Nội dung CK",
                        value: paymentInfo.transfer_content,
                        key: "content",
                        copyable: true,
                        highlight: false,
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a]"
                      >
                        <span className="text-xs sm:text-sm text-gray-400">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm sm:text-base font-semibold ${
                              item.highlight ? "text-[#FBBF24]" : "text-white font-mono"
                            }`}
                          >
                            {item.value}
                          </span>
                          {item.copyable && (
                            <button
                              onClick={() => copyText(item.value, item.key)}
                              className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                              title={`Copy ${item.label}`}
                            >
                              {copied === item.key ? (
                                <Check size={14} className="text-[#FBBF24]" />
                              ) : (
                                <Copy size={14} />
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
                <h4 className="text-sm font-semibold text-white">Sau khi thanh toán:</h4>
                <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                  <li>Hệ thống tự động xác nhận trong 60 giây</li>
                  <li>Bạn nhận email chứa link truy cập khoá học</li>
                  <li>Được add vào Group VIP + nhận Bonus</li>
                </ol>
                <p className="text-xs text-gray-500">
                  Cần hỗ trợ? Liên hệ Zalo:{" "}
                  <a
                    href={siteConfig.socials.zalo}
                    className="text-[#FBBF24] hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {getZaloPhone()}
                  </a>
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowModal(false)}
                className="w-full mt-6 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
                style={{ border: "1px solid #2a2a2a" }}
              >
                Đóng
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
