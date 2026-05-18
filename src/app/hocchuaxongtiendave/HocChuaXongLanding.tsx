"use client";

import { useState, useRef, useCallback } from "react";
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
  Crown,
} from "lucide-react";
import TurnstileWidget from "@/components/TurnstileWidget";
import BankTransferButtons from "@/components/BankTransferButtons";
import HeroSection from "./sections/HeroSection";
import PainSection from "./sections/PainSection";
import StorySection from "./sections/StorySection";
import SolutionSection from "./sections/SolutionSection";
import ProofSection from "./sections/ProofSection";
import AudienceSection from "./sections/AudienceSection";
import NotForYouSection from "./sections/NotForYouSection";
import ModulesSection from "./sections/ModulesSection";
import BonusSection from "./sections/BonusSection";
import TotalValueSection from "./sections/TotalValueSection";
import SpeakerSection from "./sections/SpeakerSection";
import PricingSection from "./sections/PricingSection";
import UrgencySection from "./sections/UrgencySection";
import FAQSection from "./sections/FAQSection";
import FinalCTASection from "./sections/FinalCTASection";

/* ─── Brand colors ──────────────────────────────────── */
// Premium navy + champagne gold (distinct from /sanphamso yellow/black)
// Background scale: #050913 → #0A1020 → #0E1730 → #13203F (cards)
// Accent: #E5B663 (champagne) · #C9A86B (soft gold) · Highlight: #7DD3FC (sky)

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

interface PaymentInfo {
  order_code: string;
  amount: number;
  transfer_content: string;
  qr_url: string | null;
  bank_account: string | null;
  bank_code: string | null;
}

export default function HocChuaXongLanding() {
  const registerRef = useRef<HTMLDivElement>(null);

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
  const [turnstileToken, setTurnstileToken] = useState("");

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const scrollToRegister = () => {
    registerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hocchuaxongtiendave/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstile_token: turnstileToken }),
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
    <div
      className="min-h-screen"
      style={{
        background: "#050913",
        color: "#F1F5FB",
        fontFeatureSettings: '"ss01", "cv11"',
      }}
    >
      {/* ═══ NAVBAR ═══ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between"
        style={{
          background: "rgba(5,9,19,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(229,182,99,0.12)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/images/about/portrait.jpg"
            alt="Lê Đăng Khương"
            className="w-9 h-9 rounded-lg object-cover"
            style={{ border: "1px solid rgba(229,182,99,0.35)" }}
          />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-semibold text-sm text-white">Lê Đăng Khương</span>
            <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#C9A86B" }}>
              Premium Mentorship
            </span>
          </div>
        </Link>
        <button
          onClick={scrollToRegister}
          className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer transition-all hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
            color: "#0A1020",
            boxShadow: "0 0 18px rgba(229,182,99,0.35)",
          }}
        >
          <Crown size={14} />
          Đăng Ký Early Bird
        </button>
      </nav>

      <div className="h-14" />

      {/* ═══ SECTIONS ═══ */}
      <HeroSection onScrollToRegister={scrollToRegister} />
      <PainSection />
      <StorySection />
      <SolutionSection />
      <ProofSection />
      <AudienceSection />
      <NotForYouSection />
      <ModulesSection />
      <BonusSection onScrollToRegister={scrollToRegister} />
      <TotalValueSection onScrollToRegister={scrollToRegister} />
      <SpeakerSection />
      <PricingSection onScrollToRegister={scrollToRegister} />
      <UrgencySection onScrollToRegister={scrollToRegister} />
      <FAQSection />

      {/* ═══ REGISTRATION FORM ═══ */}
      <section
        ref={registerRef}
        id="register"
        className="py-16 sm:py-24 px-4"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(229,182,99,0.08) 0%, transparent 60%), #050913",
        }}
      >
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase mb-5"
              style={{
                borderColor: "rgba(229,182,99,0.35)",
                background: "rgba(229,182,99,0.08)",
                color: "#E5B663",
              }}
            >
              <Crown size={12} /> Suất Early Bird
            </span>
            <h2 className="text-[26px] sm:text-3xl font-extrabold mb-3 text-white leading-tight">
              Đăng Ký & Thanh Toán An Toàn
            </h2>
            <p className="text-[15px] sm:text-base leading-[1.75]" style={{ color: "rgba(241,245,251,0.55)" }}>
              Điền thông tin bên dưới — nhận mã QR chuyển khoản trong 5 giây.
            </p>
            <div
              className="mt-5 inline-flex items-center gap-3 rounded-xl px-5 py-2.5"
              style={{
                background: "rgba(229,182,99,0.08)",
                border: "1px solid rgba(229,182,99,0.3)",
              }}
            >
              <span className="text-xl font-extrabold" style={{ color: "#E5B663" }}>
                5.000.000đ
              </span>
              <span className="text-sm line-through" style={{ color: "rgba(241,245,251,0.4)" }}>
                20.000.000đ
              </span>
              <span
                className="text-[10px] font-bold uppercase px-2 py-1 rounded"
                style={{ background: "#E5B663", color: "#0A1020" }}
              >
                -75%
              </span>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-2xl space-y-3"
            style={{
              background: "linear-gradient(180deg, #0E1730 0%, #0A1020 100%)",
              border: "1px solid rgba(229,182,99,0.18)",
              boxShadow:
                "0 30px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(229,182,99,0.05) inset",
            }}
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
                <span className="text-red-300 leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "rgba(241,245,251,0.7)" }}>
                Họ và tên <span style={{ color: "#F87171" }}>*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.4)" }} />
                <input
                  name="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#050913",
                    border: "1px solid rgba(229,182,99,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "rgba(241,245,251,0.7)" }}>
                Email <span style={{ color: "#F87171" }}>*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.4)" }} />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#050913",
                    border: "1px solid rgba(229,182,99,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "rgba(241,245,251,0.7)" }}>
                Số điện thoại
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.4)" }} />
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0901 234 567"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#050913",
                    border: "1px solid rgba(229,182,99,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "rgba(241,245,251,0.7)" }}>
                Mật khẩu <span style={{ color: "#F87171" }}>*</span>{" "}
                <span style={{ color: "rgba(241,245,251,0.4)" }}>(8+ ký tự, hoa, thường, số)</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.4)" }} />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#050913",
                    border: "1px solid rgba(229,182,99,0.15)",
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "rgba(241,245,251,0.5)" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <TurnstileWidget onVerify={handleTurnstileVerify} className="mt-2" />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-4 mt-4 text-base sm:text-lg font-bold uppercase tracking-wide transition-all hover:opacity-95 hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                color: "#0A1020",
                boxShadow: "0 0 30px rgba(229,182,99,0.4)",
              }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Crown size={18} />
              )}
              {loading ? "Đang xử lý..." : "ĐĂNG KÝ EARLY BIRD — 5.000.000Đ"}
            </button>

            <div className="flex items-center justify-center gap-4 pt-3 text-xs" style={{ color: "rgba(241,245,251,0.45)" }}>
              <span>🔒 Thanh toán an toàn</span>
              <span>•</span>
              <span>⚡ Cấp khóa tự động</span>
            </div>

            <p className="text-[11px] text-center leading-relaxed pt-1" style={{ color: "rgba(241,245,251,0.4)" }}>
              Bằng việc đăng ký, bạn đồng ý điều khoản sử dụng của Lê Đăng Khương Academy.
            </p>
            <p className="text-xs text-center pt-3" style={{ color: "rgba(241,245,251,0.55)" }}>
              Đã có tài khoản?{" "}
              <span style={{ color: "#E5B663" }}>
                Nhập đúng email & mật khẩu — hệ thống tự tạo đơn hàng.
              </span>
            </p>
          </form>
        </div>
      </section>

      <FinalCTASection onScrollToRegister={scrollToRegister} />

      {/* ═══ STICKY BOTTOM CTA (all viewports) ═══ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4"
        style={{
          background: "rgba(5,9,19,0.92)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(229,182,99,0.18)",
        }}
      >
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
          {/* Price info — hidden on small mobile to save space */}
          <div className="hidden sm:flex items-center gap-3 flex-1 min-w-0">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                boxShadow: "0 0 18px rgba(229,182,99,0.35)",
              }}
            >
              <Crown size={18} style={{ color: "#0A1020" }} />
            </div>
            <div className="min-w-0">
              <div
                className="text-[10px] uppercase tracking-[0.18em] font-bold leading-none mb-1"
                style={{ color: "#E5B663" }}
              >
                Early Bird · Còn 80 suất
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base sm:text-lg font-extrabold text-white leading-none">
                  5.000.000đ
                </span>
                <span
                  className="text-xs line-through"
                  style={{ color: "rgba(241,245,251,0.4)" }}
                >
                  20.000.000đ
                </span>
                <span
                  className="hidden md:inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                  style={{ background: "#E5B663", color: "#0A1020" }}
                >
                  -75%
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={scrollToRegister}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl py-3.5 sm:py-3 px-6 sm:px-7 text-base font-bold uppercase tracking-wide cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
              color: "#0A1020",
              boxShadow: "0 -2px 24px rgba(229,182,99,0.3)",
            }}
          >
            <Crown size={16} />
            Nhận Ưu Đãi Ngay
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="h-20 sm:h-24" />

      {/* ═══ PAYMENT MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={() => setShowModal(false)}
          />

          <div
            className="relative w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh]"
            style={{
              background: "linear-gradient(180deg, #0E1730 0%, #0A1020 100%)",
              border: "1px solid rgba(229,182,99,0.25)",
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)",
            }}
          >
            <div
              className="p-8 text-center"
              style={{
                background:
                  "linear-gradient(180deg, rgba(229,182,99,0.12) 0%, transparent 100%)",
                borderBottom: "1px solid rgba(229,182,99,0.15)",
              }}
            >
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-5"
                style={{
                  background: "rgba(229,182,99,0.15)",
                  border: "2px solid rgba(229,182,99,0.4)",
                }}
              >
                <CheckCircle size={36} style={{ color: "#E5B663" }} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Đăng Ký Thành Công!
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(241,245,251,0.6)" }}>
                Học Chưa Xong - Tiền Đã Về
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {paymentInfo?.qr_url && (
                <div className="mb-8">
                  <p className="text-sm sm:text-base font-semibold text-white mb-4 text-center leading-relaxed">
                    Chuyển khoản{" "}
                    <span style={{ color: "#E5B663" }}>
                      {paymentInfo.amount.toLocaleString("vi-VN")}đ
                    </span>{" "}
                    để mở khoá chương trình:
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
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ background: "#050913", border: "1px solid rgba(229,182,99,0.1)" }}
                      >
                        <span className="text-xs sm:text-sm" style={{ color: "rgba(241,245,251,0.6)" }}>
                          {item.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm sm:text-base font-semibold ${
                              item.highlight ? "" : "text-white font-mono"
                            }`}
                            style={item.highlight ? { color: "#E5B663" } : undefined}
                          >
                            {item.value}
                          </span>
                          {item.copyable && (
                            <button
                              onClick={() => copyText(item.value, item.key)}
                              className="p-1.5 rounded-md transition-all active:scale-90"
                              style={{ color: "rgba(241,245,251,0.5)" }}
                              title={`Copy ${item.label}`}
                            >
                              {copied === item.key ? (
                                <Check size={14} style={{ color: "#E5B663" }} />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {paymentInfo.bank_account && paymentInfo.bank_code && (
                    <BankTransferButtons
                      bankAccount={paymentInfo.bank_account}
                      bankCode={paymentInfo.bank_code}
                      amount={paymentInfo.amount}
                      transferContent={paymentInfo.transfer_content}
                      accentColor="#E5B663"
                    />
                  )}

                  <div
                    className="mt-4 p-4 rounded-lg text-sm leading-relaxed"
                    style={{
                      background: "rgba(229,182,99,0.05)",
                      border: "1px solid rgba(229,182,99,0.15)",
                      color: "rgba(241,245,251,0.7)",
                    }}
                  >
                    <span className="font-medium" style={{ color: "#E5B663" }}>
                      ⚡ Tự động xác nhận
                    </span>{" "}
                    — Sau khi chuyển khoản, hệ thống tự động mở khoá chương trình trong 60 giây.
                  </div>
                </div>
              )}

              {!paymentInfo?.qr_url && paymentInfo && (
                <div
                  className="mb-8 p-5 rounded-xl"
                  style={{
                    background: "rgba(229,182,99,0.05)",
                    border: "1px solid rgba(229,182,99,0.2)",
                  }}
                >
                  <p className="text-sm font-semibold mb-3" style={{ color: "#E5B663" }}>
                    📞 Liên hệ thanh toán
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(241,245,251,0.65)" }}>
                    Vui lòng liên hệ admin qua Zalo{" "}
                    <strong className="text-white">{getZaloPhone()}</strong> để nhận thông tin chuyển khoản.
                  </p>
                </div>
              )}

              <div
                className="p-5 rounded-xl space-y-4"
                style={{
                  background: "rgba(229,182,99,0.05)",
                  border: "1px solid rgba(229,182,99,0.15)",
                }}
              >
                <h4 className="text-sm font-semibold text-white">Sau khi thanh toán:</h4>
                <ol className="text-sm space-y-2 list-decimal list-inside" style={{ color: "rgba(241,245,251,0.65)" }}>
                  <li>Hệ thống tự động xác nhận trong 60 giây</li>
                  <li>Bạn nhận email chứa link truy cập 50 bài học</li>
                  <li>Được add vào Group Zalo VIP 30 ngày + nhận 7 Bonus</li>
                </ol>
                <p className="text-xs" style={{ color: "rgba(241,245,251,0.45)" }}>
                  Cần hỗ trợ? Liên hệ Zalo:{" "}
                  <a
                    href={siteConfig.socials.zalo}
                    className="hover:underline"
                    style={{ color: "#E5B663" }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {getZaloPhone()}
                  </a>
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-full mt-6 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                style={{
                  border: "1px solid rgba(229,182,99,0.2)",
                  color: "rgba(241,245,251,0.65)",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
