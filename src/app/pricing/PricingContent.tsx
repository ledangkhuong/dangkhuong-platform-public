"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Crown,
  Sparkles,
  Users,
  BookOpen,
  MessageCircle,
  FileText,
  Award,
  Headphones,
  Star,
} from "lucide-react";
import { siteConfig } from "@/lib/site-config";

/* ─── Types ──────────────────────────────────────────── */

interface PricingTier {
  name: string;
  price: string;
  priceNote: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
  badge?: string;
}

/* ─── Data ───────────────────────────────────────────── */

const TIERS: PricingTier[] = [
  {
    name: "Miễn Phí",
    price: "0đ",
    priceNote: "Mãi mãi",
    description: "Bắt đầu hành trình học tập với những tài nguyên cơ bản.",
    icon: Users,
    features: [
      "Truy cập cộng đồng học viên",
      "1 khoá học miễn phí",
      "Blog & tài nguyên miễn phí",
      "Cập nhật bài viết mới",
    ],
    cta: "Bắt đầu ngay",
    ctaHref: "/register",
    highlighted: false,
  },
  {
    name: "Standard",
    price: "499.000đ",
    priceNote: "/ tháng",
    description: "Truy cập toàn bộ khoá học và nhận chứng chỉ hoàn thành.",
    icon: BookOpen,
    features: [
      "Tất cả khoá học trên nền tảng",
      "Quiz & chứng chỉ hoàn thành",
      "Hỗ trợ qua cộng đồng",
      "Tài liệu kèm theo khoá học",
      "Cập nhật nội dung mới",
    ],
    cta: "Đăng ký ngay",
    ctaHref: "/courses",
    highlighted: true,
    badge: "Phổ biến nhất",
  },
  {
    name: "Premium",
    price: "1.499.000đ",
    priceNote: "/ tháng",
    description: "Trải nghiệm toàn diện với tư vấn cá nhân và hỗ trợ ưu tiên.",
    icon: Crown,
    features: [
      "Tất cả quyền lợi Standard",
      "Tư vấn 1-1 với giảng viên",
      "Tài liệu độc quyền Premium",
      "Ưu tiên hỗ trợ kỹ thuật",
      "Truy cập sớm nội dung mới",
      "Nhóm mastermind riêng",
    ],
    cta: "Liên hệ tư vấn",
    ctaHref: siteConfig.socials.zalo,
    highlighted: false,
  },
];

const FAQ_DATA = [
  {
    q: "Tôi có thể đổi gói hoặc huỷ bất kỳ lúc nào không?",
    a: "Có. Bạn có thể nâng cấp, hạ cấp hoặc huỷ gói đăng ký bất kỳ lúc nào. Thay đổi sẽ có hiệu lực từ chu kỳ thanh toán tiếp theo.",
  },
  {
    q: "Khoá học có cập nhật nội dung mới không?",
    a: "Có. Tất cả khoá học được cập nhật thường xuyên với nội dung mới nhất về Video AI và Thương Hiệu Cá Nhân. Học viên Standard và Premium được truy cập miễn phí mọi bản cập nhật.",
  },
  {
    q: "Tư vấn 1-1 trong gói Premium diễn ra như thế nào?",
    a: "Bạn sẽ được đặt lịch tư vấn trực tiếp với giảng viên qua Zoom hoặc Google Meet. Mỗi buổi tư vấn kéo dài 30-60 phút, tập trung vào vấn đề cụ thể của bạn.",
  },
  {
    q: "Chứng chỉ hoàn thành có giá trị gì?",
    a: "Chứng chỉ được cấp bởi Lê Đăng Khương Academy sau khi bạn hoàn thành khoá học và vượt qua bài kiểm tra. Bạn có thể chia sẻ chứng chỉ trên LinkedIn và CV.",
  },
  {
    q: "Thanh toán bằng phương thức nào?",
    a: "Chúng tôi hỗ trợ chuyển khoản ngân hàng qua mã QR — xác nhận tự động, kích hoạt tài khoản ngay lập tức sau khi thanh toán thành công.",
  },
];

/* ─── Component ──────────────────────────────────────── */

export default function PricingContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ═══ HERO ═══ */}
      <section className="pt-28 sm:pt-36 pb-10 sm:pb-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{
              background: "rgba(212,168,67,0.1)",
              border: "1px solid rgba(212,168,67,0.25)",
              color: "#D4A843",
            }}
          >
            <Sparkles size={13} /> Chọn gói phù hợp với bạn
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.3] sm:leading-[1.25] mb-6">
            Đầu tư cho{" "}
            <span className="text-[#D4A843]">tương lai của bạn</span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
            Bắt đầu miễn phí hoặc chọn gói nâng cao để truy cập toàn bộ khoá
            học, tài liệu và hỗ trợ từ {siteConfig.name}.
          </p>
        </div>
      </section>

      {/* ═══ PRICING CARDS ═══ */}
      <section className="pb-14 sm:pb-20 px-4">
        <div className="max-w-5xl mx-auto grid gap-6 sm:gap-8 md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <div
              key={i}
              className={`relative flex flex-col p-7 sm:p-8 rounded-2xl transition-all duration-200 ${
                tier.highlighted ? "md:-translate-y-3" : ""
              }`}
              style={{
                background: tier.highlighted
                  ? "linear-gradient(180deg, rgba(212,168,67,0.06) 0%, #111 40%)"
                  : "#111",
                border: tier.highlighted
                  ? "2px solid rgba(212,168,67,0.5)"
                  : "1px solid #1f1f1f",
              }}
            >
              {/* Badge */}
              {tier.badge && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                  style={{
                    background:
                      "linear-gradient(135deg, #D4A843, #FBBF24)",
                    color: "#131921",
                  }}
                >
                  <Star size={11} className="inline -mt-0.5 mr-1" />
                  {tier.badge}
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: tier.highlighted
                        ? "rgba(212,168,67,0.15)"
                        : "rgba(255,255,255,0.05)",
                    }}
                  >
                    <tier.icon
                      size={20}
                      style={{
                        color: tier.highlighted ? "#D4A843" : "#888",
                      }}
                    />
                  </div>
                  <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                </div>

                <div className="flex items-baseline gap-1.5 mb-3">
                  <span
                    className={`text-3xl sm:text-4xl font-extrabold ${
                      tier.highlighted ? "text-[#D4A843]" : "text-white"
                    }`}
                  >
                    {tier.price}
                  </span>
                  <span className="text-sm text-gray-500">
                    {tier.priceNote}
                  </span>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed">
                  {tier.description}
                </p>
              </div>

              {/* Features */}
              <div className="flex-1 mb-8">
                <div className="space-y-3">
                  {tier.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <Check
                        size={16}
                        className={`shrink-0 mt-0.5 ${
                          tier.highlighted
                            ? "text-[#D4A843]"
                            : "text-gray-500"
                        }`}
                      />
                      <span className="text-sm text-gray-300 leading-relaxed">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              {tier.ctaHref.startsWith("http") ? (
                <a
                  href={tier.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-center gap-2 font-bold text-sm py-3.5 rounded-lg transition-all duration-200 ${
                    tier.highlighted
                      ? "btn-green"
                      : "bg-white/5 text-white hover:bg-white/10 border border-[#2a2a2a]"
                  }`}
                >
                  <MessageCircle size={16} />
                  {tier.cta}
                </a>
              ) : (
                <Link
                  href={tier.ctaHref}
                  className={`w-full flex items-center justify-center gap-2 font-bold text-sm py-3.5 rounded-lg transition-all duration-200 ${
                    tier.highlighted
                      ? "btn-green"
                      : "bg-white/5 text-white hover:bg-white/10 border border-[#2a2a2a]"
                  }`}
                >
                  {tier.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURE COMPARISON ═══ */}
      <section className="pb-14 sm:pb-20 px-4" style={{ background: "#080808" }}>
        <div className="max-w-3xl mx-auto pt-14 sm:pt-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            So sánh các gói
          </h2>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid #1f1f1f" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#151515" }}>
                  <th className="text-left p-4 sm:p-5 text-gray-400 font-medium">
                    Tính năng
                  </th>
                  <th className="p-4 sm:p-5 text-gray-400 font-medium text-center">
                    Miễn Phí
                  </th>
                  <th
                    className="p-4 sm:p-5 font-medium text-center"
                    style={{ color: "#D4A843" }}
                  >
                    Standard
                  </th>
                  <th className="p-4 sm:p-5 text-gray-400 font-medium text-center">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Cộng đồng học viên", free: true, standard: true, premium: true },
                  { feature: "Khoá học miễn phí", free: "1", standard: "Tất cả", premium: "Tất cả" },
                  { feature: "Blog & tài nguyên", free: true, standard: true, premium: true },
                  { feature: "Quiz & chứng chỉ", free: false, standard: true, premium: true },
                  { feature: "Tài liệu khoá học", free: false, standard: true, premium: true },
                  { feature: "Tư vấn 1-1", free: false, standard: false, premium: true },
                  { feature: "Tài liệu độc quyền", free: false, standard: false, premium: true },
                  { feature: "Ưu tiên hỗ trợ", free: false, standard: false, premium: true },
                  { feature: "Nhóm mastermind", free: false, standard: false, premium: true },
                ].map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? "#111" : "#0d0d0d",
                      borderTop: "1px solid #1a1a1a",
                    }}
                  >
                    <td className="p-4 sm:p-5 text-gray-300">{row.feature}</td>
                    <td className="p-4 sm:p-5 text-center">
                      <ComparisonCell value={row.free} />
                    </td>
                    <td className="p-4 sm:p-5 text-center">
                      <ComparisonCell value={row.standard} highlighted />
                    </td>
                    <td className="p-4 sm:p-5 text-center">
                      <ComparisonCell value={row.premium} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ TRUST SIGNALS ═══ */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: Award,
                title: "Chứng chỉ uy tín",
                desc: "Nhận chứng chỉ hoàn thành từ Lê Đăng Khương Academy.",
              },
              {
                icon: Headphones,
                title: "Hỗ trợ tận tâm",
                desc: "Đội ngũ hỗ trợ sẵn sàng giải đáp mọi thắc mắc của bạn.",
              },
              {
                icon: FileText,
                title: "Nội dung cập nhật",
                desc: "Khoá học được cập nhật liên tục với xu hướng mới nhất.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 sm:p-7 rounded-xl text-center"
                style={{ background: "#111", border: "1px solid #1f1f1f" }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(212,168,67,0.1)" }}
                >
                  <item.icon size={22} className="text-[#D4A843]" />
                </div>
                <h3 className="font-semibold text-white text-sm sm:text-base mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section
        className="py-14 sm:py-20 px-4"
        style={{ background: "#080808" }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Câu Hỏi Thường Gặp
          </h2>

          <div className="space-y-4">
            {FAQ_DATA.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{ background: "#111", border: "1px solid #1f1f1f" }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left gap-4"
                >
                  <span className="text-sm sm:text-base font-medium text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-500 shrink-0 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    openFaq === i ? "max-h-48" : "max-h-0"
                  }`}
                >
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-gray-400 leading-relaxed border-t border-[#1f1f1f] pt-4">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Sẵn sàng bắt đầu?
          </h2>
          <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            Tham gia cộng đồng hơn 1,200+ học viên đang làm chủ Video AI và xây
            dựng thương hiệu cá nhân cùng {siteConfig.name}.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-green text-sm sm:text-base py-3.5 px-8"
            >
              Bắt đầu miễn phí
            </Link>
            <Link
              href="/courses"
              className="text-sm sm:text-base py-3.5 px-8 font-bold rounded-lg bg-white/5 text-white hover:bg-white/10 border border-[#2a2a2a] transition-all duration-200"
            >
              Xem khoá học
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Helper ──────────────────────────────────────────── */

function ComparisonCell({
  value,
  highlighted,
}: {
  value: boolean | string;
  highlighted?: boolean;
}) {
  if (typeof value === "string") {
    return (
      <span
        className={`text-sm font-medium ${
          highlighted ? "text-[#D4A843]" : "text-gray-300"
        }`}
      >
        {value}
      </span>
    );
  }
  if (value) {
    return (
      <Check
        size={16}
        className={`inline-block ${
          highlighted ? "text-[#D4A843]" : "text-green-500"
        }`}
      />
    );
  }
  return <span className="text-gray-600">—</span>;
}
