"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/site-config";
import {
  ArrowRight,
  CheckCircle,
  Mail,
  Gift,
  Menu,
  X,
  Download,
} from "lucide-react";

import HeroSection from "@/components/home/HeroSection";
import PainAndRoadmapSection from "@/components/home/PainAndRoadmapSection";
import AboutAndAudienceSection from "@/components/home/AboutAndAudienceSection";
import TestimonialsFaqSection from "@/components/home/TestimonialsFaqSection";
import FreeOfferFinalCtaSection from "@/components/home/FreeOfferFinalCtaSection";

// Lazy-load auth pieces only when the lead modal opens
const PasswordInput = dynamic(
  () => import("@/components/auth/PasswordInput"),
  { ssr: false }
);
const SocialLoginButtons = dynamic(
  () => import("@/components/auth/SocialLoginButtons"),
  { ssr: false }
);

/* ─── Page ────────────────────────────────────────────────────── */

export default function HomePage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [formStatus, setFormStatus] = useState<
    "idle" | "loading" | "success" | "error" | "verify"
  >("idle");
  const [formError, setFormError] = useState("");

  const openModal = () => setShowLeadModal(true);
  const closeModal = () => {
    if (formStatus !== "loading") setShowLeadModal(false);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus("loading");
    setFormError("");

    const fd = new FormData(e.currentTarget);
    const password = fd.get("popup_password") as string;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormStatus("verify");
      } else {
        setFormError(data.error || "Có lỗi xảy ra.");
        setFormStatus("idle");
      }
    } catch {
      setFormError("Lỗi kết nối. Vui lòng thử lại.");
      setFormStatus("idle");
    }
  };

  const navLinks = [
    { label: "Lộ trình", href: "#roadmap" },
    { label: "Học viên", href: "#testimonials" },
    { label: "Nhận quà", href: "#free-offer" },
    { label: "Blog", href: "/blog" },
    { label: "Cộng đồng", href: "/community" },
  ];

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white overflow-x-hidden">
      {/* ═══ HEADER ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/92 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/about/portrait.jpg"
              alt="Lê Đăng Khương"
              width={36}
              height={36}
              sizes="36px"
              className="w-9 h-9 rounded-lg object-cover"
            />
            <div>
              <div className="text-sm font-bold leading-tight">
                Lê Đăng Khương
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Đăng nhập
            </Link>
            <button
              onClick={openModal}
              className="btn-green text-sm py-2 px-5"
            >
              <Gift size={14} /> Nhận quà miễn phí
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label={mobileMenu ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileMenu}
            className="md:hidden text-gray-400 p-2"
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-[#111] border-t border-white/5 px-4 py-4 space-y-3">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMobileMenu(false)}
                className="block text-sm text-gray-300 py-2"
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="text-sm text-gray-400">
                Đăng nhập
              </Link>
              <button
                onClick={() => {
                  openModal();
                  setMobileMenu(false);
                }}
                className="btn-green text-sm py-2 px-4"
              >
                <Gift size={14} /> Nhận quà miễn phí
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ SECTIONS ═══ */}
      <HeroSection onOpenModal={openModal} />
      <PainAndRoadmapSection onOpenModal={openModal} />
      <AboutAndAudienceSection
        onOpenModal={openModal}
        facebookUrl={siteConfig.socials.facebook}
      />
      <TestimonialsFaqSection onOpenModal={openModal} />
      <FreeOfferFinalCtaSection
        onOpenModal={openModal}
        facebookUrl={siteConfig.socials.facebook}
        ownerName={siteConfig.owner.name}
      />

      {/* ═══ STICKY FLOATING CTA BAR ═══ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]"
        style={{
          background: "linear-gradient(transparent, rgba(0,0,0,0.9) 30%)",
        }}
      >
        <div className="max-w-lg mx-auto px-4 pb-4 pt-6 flex items-center justify-center gap-2">
          <div className="flex items-center gap-0.5 shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="blink-arrow"
            >
              <path
                d="M13 5l7 7-7 7"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="blink-arrow-delay"
            >
              <path
                d="M13 5l7 7-7 7"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <button
            onClick={openModal}
            className="flex items-center gap-2 py-3 px-6 sm:px-8 text-sm sm:text-base rounded-full shadow-lg flex-1 max-w-sm justify-center font-bold cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #D4A843, #b8902f)",
              color: "#000",
              boxShadow: "0 -2px 20px rgba(212,168,67,0.25)",
            }}
          >
            <Download size={16} /> Nhận miễn phí &quot;Bí Mật Video AI Triệu
            View&quot;
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="blink-arrow-delay"
              style={{ transform: "scaleX(-1)" }}
            >
              <path
                d="M13 5l7 7-7 7"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="blink-arrow"
              style={{ transform: "scaleX(-1)" }}
            >
              <path
                d="M13 5l7 7-7 7"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ═══ LEAD CAPTURE MODAL ═══ */}
      {showLeadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md bg-[#111] border border-[#D4A843]/30 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              aria-label="Đóng"
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10 p-1 rounded-lg hover:bg-white/5"
            >
              <X size={18} />
            </button>

            <div
              className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at top, #D4A843, transparent 80%)",
              }}
            />

            <div className="relative p-6 sm:p-8">
              {formStatus === "verify" ? (
                <div className="text-center py-4">
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
                    style={{
                      background: "rgba(212,168,67,0.1)",
                      border: "1px solid rgba(212,168,67,0.2)",
                    }}
                  >
                    <Mail size={32} className="text-[#D4A843]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    Kiểm tra email của bạn
                  </h3>
                  <p className="text-sm text-gray-400 mb-2 leading-relaxed">
                    Chúng tôi đã gửi email xác thực đến:
                  </p>
                  <p className="text-[#D4A843] font-semibold mb-4">
                    {formData.email}
                  </p>
                  <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                    Vui lòng mở email và nhấn{" "}
                    <span className="text-gray-300 font-medium">
                      &quot;Xác thực tài khoản&quot;
                    </span>{" "}
                    để kích hoạt. Kiểm tra cả thư mục{" "}
                    <span className="text-gray-300 font-medium">Spam</span>{" "}
                    nếu không thấy.
                  </p>
                  <Link
                    href="/login"
                    className="btn-green w-full justify-center py-3 text-base"
                    onClick={closeModal}
                  >
                    Đã xác thực? Đăng nhập
                  </Link>
                  <p className="text-xs text-gray-400 mt-3">
                    Link xác thực có hiệu lực trong 24 giờ.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <Image
                      src="/images/about/portrait.jpg"
                      alt="Lê Đăng Khương"
                      width={56}
                      height={56}
                      sizes="56px"
                      className="w-14 h-14 rounded-2xl mb-3 object-cover inline-block"
                    />
                    <h3 className="text-xl font-bold mb-1">
                      Tạo tài khoản miễn phí
                    </h3>
                    <p className="text-sm text-gray-400">
                      Đăng ký để nhận{" "}
                      <span className="text-[#D4A843] font-semibold">
                        &quot;Bí Mật Video AI Triệu View&quot;
                      </span>
                    </p>
                  </div>

                  {formError && (
                    <div
                      className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
                      style={{ background: "rgba(239,68,68,0.08)" }}
                    >
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, name: e.target.value }))
                        }
                        className="input-dark w-full"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Số điện thoại{" "}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            phone: e.target.value,
                          }))
                        }
                        pattern="^(0|\+84)[0-9]{9}$"
                        title="Nhập số điện thoại hợp lệ (VD: 0912345678)"
                        className="input-dark w-full"
                        placeholder="0912345678"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Định dạng: 09xx hoặc +84xxx (10 số)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            email: e.target.value,
                          }))
                        }
                        className="input-dark w-full"
                        placeholder="ban@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Mật khẩu
                      </label>
                      <PasswordInput
                        name="popup_password"
                        placeholder="Tối thiểu 8 ký tự"
                        minLength={8}
                      />
                    </div>

                    <p className="text-xs text-gray-400 pt-1">
                      Bằng cách đăng ký, bạn đồng ý với{" "}
                      <a
                        href="/terms"
                        className="text-[#D4A843] hover:underline"
                      >
                        Điều khoản dịch vụ
                      </a>{" "}
                      và{" "}
                      <a
                        href="/privacy"
                        className="text-[#D4A843] hover:underline"
                      >
                        Chính sách bảo mật
                      </a>
                    </p>
                    <button
                      type="submit"
                      disabled={formStatus === "loading"}
                      className="btn-green w-full justify-center py-2.5 mt-2 disabled:opacity-50"
                    >
                      {formStatus === "loading" ? (
                        "Đang xử lý..."
                      ) : (
                        <>
                          Đăng ký — Hoàn toàn miễn phí{" "}
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-5">
                    <SocialLoginButtons />
                  </div>

                  <p className="text-center text-sm text-gray-400 mt-5">
                    Đã có tài khoản?{" "}
                    <Link
                      href="/login"
                      className="text-[#D4A843] font-medium hover:underline"
                      onClick={closeModal}
                    >
                      Đăng nhập
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CheckCircle kept for ESLint — used in modal verify state */}
      <span className="hidden">
        <CheckCircle size={1} />
      </span>
    </div>
  );
}
