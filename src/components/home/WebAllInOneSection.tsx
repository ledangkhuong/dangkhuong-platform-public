"use client";

import Image from "next/image";
import {
  FileText,
  LayoutTemplate,
  ClipboardCheck,
  Mail,
  ShoppingCart,
  Users,
  GraduationCap,
  CreditCard,
  Headphones,
  Target,
  Download,
} from "lucide-react";

interface WebAllInOneSectionProps {
  onOpenModal?: () => void;
}

type Component = {
  num: number;
  Icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
  title: string;
  desc: string;
};

// 9 inner components of the Web All in One (Social is the inbound layer,
// Pixel/Tracking is the outbound layer — kept in the diagram itself).
const COMPONENTS: Component[] = [
  {
    num: 2,
    Icon: FileText,
    title: "Blog (SEO)",
    desc: "Tăng traffic tự nhiên từ Google — đầu vào miễn phí, bền vững.",
  },
  {
    num: 3,
    Icon: LayoutTemplate,
    title: "Landing Page",
    desc: "Trang đích chuyển đổi cao — gom khách từ mọi nguồn đổ về.",
  },
  {
    num: 4,
    Icon: ClipboardCheck,
    title: "Form thu data",
    desc: "Thu thông tin khách hàng tự động, nối thẳng vào CRM.",
  },
  {
    num: 5,
    Icon: Mail,
    title: "Email Marketing",
    desc: "Automation nuôi dưỡng — gửi đúng người, đúng lúc, đúng nội dung.",
  },
  {
    num: 6,
    Icon: ShoppingCart,
    title: "Sales Page",
    desc: "Trang chốt đơn cuối cùng — sản phẩm, giá, CTA mua ngay.",
  },
  {
    num: 7,
    Icon: Users,
    title: "CRM khách hàng",
    desc: "Lưu trữ & quản lý toàn bộ khách — biết ai đang ở giai đoạn nào.",
  },
  {
    num: 8,
    Icon: GraduationCap,
    title: "LMS Học tập",
    desc: "Hệ thống học khoá / sản phẩm số — bán xong khách vào học ngay.",
  },
  {
    num: 9,
    Icon: CreditCard,
    title: "Thanh toán tự động",
    desc: "Tự xử lý đơn 24/7 — không cần bạn thức đêm xác nhận chuyển khoản.",
  },
  {
    num: 10,
    Icon: Headphones,
    title: "Automation & CSKH",
    desc: "Chatbot AI tự tư vấn, chăm sóc khách hàng tự động sau bán.",
  },
];

export default function WebAllInOneSection({
  onOpenModal,
}: WebAllInOneSectionProps) {
  return (
    <section
      id="web-all-in-one"
      className="py-12 sm:py-24 px-4 sm:px-6 bg-[#0a0a0a]"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs sm:text-sm font-medium"
            style={{
              background: "rgba(212,168,67,0.1)",
              border: "1px solid rgba(212,168,67,0.25)",
              color: "#D4A843",
            }}
          >
            <Target size={14} />
            <span>Chi tiết Bước 4 — Cỗ máy bán hàng 24/7</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-3 sm:mb-4 text-white">
            Bên trong{" "}
            <span className="text-[#D4A843]">Web All in One</span> có gì?
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
            Social chỉ là nguồn kéo traffic. Tất cả khách đổ về một hệ thống
            duy nhất — tự tư vấn, chốt đơn, thu tiền, chăm sóc và bám đuổi
            khách 24/7. Đây là cấu trúc hoàn chỉnh:
          </p>
        </div>

        {/* Diagram image */}
        <div
          className="relative rounded-2xl overflow-hidden mb-10 sm:mb-14 mx-auto max-w-5xl"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(212,168,67,0.3)",
            boxShadow: "0 20px 60px -20px rgba(212,168,67,0.25)",
          }}
        >
          <Image
            src="/images/weballinone/websiteallinone.png"
            alt="Sơ đồ Web All in One — hệ thống tự bán hàng 24/7"
            width={1920}
            height={1400}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1024px"
            className="w-full h-auto"
            priority={false}
          />
        </div>

        {/* Components grid */}
        <div className="text-center mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white">
            9 thành phần cốt lõi của hệ thống
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Mỗi mảnh ghép giải quyết một bài toán — khi ráp lại, bạn có cỗ máy
            tự chạy
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-10 sm:mb-14">
          {COMPONENTS.map((c) => (
            <div
              key={c.num}
              className="relative rounded-xl bg-[#111] border border-white/5 p-4 sm:p-5 hover:border-[#D4A843]/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Number badge */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-extrabold"
                  style={{ background: "#D4A843", color: "#0a0a0a" }}
                >
                  {c.num}
                </div>
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(212,168,67,0.12)" }}
                >
                  <c.Icon size={18} className="text-[#D4A843]" />
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white mb-1 leading-tight">
                    {c.title}
                  </h4>
                  <p className="text-xs text-gray-400 leading-snug">
                    {c.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary box */}
        <div
          className="rounded-2xl p-5 sm:p-6 mb-8 sm:mb-10"
          style={{
            background:
              "linear-gradient(135deg, rgba(212,168,67,0.1) 0%, rgba(34,197,94,0.05) 100%)",
            border: "1px solid rgba(212,168,67,0.25)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl shrink-0">⭐</div>
            <div>
              <p className="text-sm sm:text-base font-bold text-white mb-1">
                Web All in One ={" "}
                <span className="text-[#D4A843]">
                  Blog + Email + Landing Page + Sales Page + CRM + LMS + Thanh
                  toán + Automation
                </span>
              </p>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Social chỉ là nguồn kéo traffic. Pixel giúp theo dõi, bám đuổi
                và remarketing khách chưa mua. Tất cả tích hợp trong{" "}
                <span className="text-white font-semibold">
                  một website duy nhất
                </span>{" "}
                — bạn làm chủ hệ thống thay vì lệ thuộc nhiều nền tảng rời rạc.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            type="button"
            onClick={onOpenModal}
            className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#c39a3a] text-[#0a0a0a] font-bold text-sm sm:text-base py-3 sm:py-3.5 px-6 sm:px-8 rounded-xl transition-colors shadow-lg shadow-[#D4A843]/20"
          >
            <Download size={16} />
            Nhận miễn phí &quot;Bí Mật Video AI Triệu View&quot;
          </button>
        </div>
      </div>
    </section>
  );
}
