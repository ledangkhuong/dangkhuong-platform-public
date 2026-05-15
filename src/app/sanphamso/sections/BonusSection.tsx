"use client";

import { Gift, ArrowRight, CreditCard, ShieldCheck } from "lucide-react";

interface BonusSectionProps {
  onScrollToRegister?: () => void;
}

const BONUSES = [
  {
    tag: "BONUS #1",
    title: "Vào Group VIP 'Cộng đồng kiếm tiền số'",
    value: "1.000.000đ/năm",
    description: "Networking với 3.000+ chuyên gia",
  },
  {
    tag: "BONUS #2",
    title: "Buổi Coaching 1-1 với đội ngũ KOHADA",
    value: "1.000.000đ",
    description: "Giải đáp riêng cho trường hợp của bạn",
  },
];

export default function BonusSection({
  onScrollToRegister,
}: BonusSectionProps) {
  const handleCTAClick = () => {
    if (onScrollToRegister) {
      onScrollToRegister();
    }
  };

  return (
    <section
      className="py-12 sm:py-20 md:py-28 px-4 sm:px-6"
      style={{ background: "#0d0d0d" }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Headline */}
        <h2
          className="mb-12 text-center text-2xl font-bold tracking-tight sm:mb-16 sm:text-3xl md:text-4xl"
          style={{ color: "#ffffff" }}
        >
          QUÀ TẶNG ĐẶC BIỆT KHI ĐĂNG KÝ HÔM NAY
        </h2>

        {/* Bonus Cards */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 sm:mb-16">
          {BONUSES.map((bonus) => (
            <div
              key={bonus.tag}
              className="rounded-2xl border p-6 sm:p-8"
              style={{
                background: "rgba(251,191,36,0.03)",
                borderColor: "rgba(251,191,36,0.3)",
              }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(251,191,36,0.15)",
                    color: "#FBBF24",
                  }}
                >
                  <Gift className="h-5 w-5" />
                </div>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#FBBF24" }}
                >
                  {bonus.tag}
                </span>
              </div>

              <h3
                className="mb-2 text-base font-bold sm:text-lg"
                style={{ color: "#ffffff" }}
              >
                {bonus.title}
              </h3>

              <p
                className="mb-3 text-[15px]"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {bonus.description}
              </p>

              <p className="text-sm font-semibold" style={{ color: "#FBBF24" }}>
                Trị giá:{" "}
                <span className="text-base">{bonus.value}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Pricing Summary Box */}
        <div
          className="mx-auto mb-10 max-w-lg rounded-2xl border p-8 sm:p-12 text-center sm:mb-12"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          {/* Line items */}
          <div
            className="mb-6 flex flex-col gap-2 text-base sm:text-lg"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <p>
              Khóa học:{" "}
              <span className="font-semibold">1.000.000đ</span>
            </p>
            <p>
              2 Bonus: <span className="font-semibold">2.000.000đ</span>
            </p>
            <p className="mt-2">
              TỔNG:{" "}
              <span
                className="font-semibold line-through"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                3.000.000đ
              </span>
            </p>
          </div>

          {/* Big Price */}
          <p
            className="mb-2 text-4xl font-extrabold sm:text-4xl md:text-5xl"
            style={{
              color: "#FBBF24",
              textShadow: "0 0 40px rgba(251,191,36,0.4)",
            }}
          >
            CHỈ 100.000Đ
          </p>
          <p
            className="mb-0 text-sm italic sm:text-base"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            (Bằng 1 ly sinh tố!)
          </p>
        </div>

        {/* CTA Button */}
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={handleCTAClick}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-10 py-[18px] text-lg font-bold tracking-wide text-black shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl sm:px-12 sm:py-5 sm:text-lg"
            style={{
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
              boxShadow: "0 0 30px rgba(251,191,36,0.3)",
            }}
          >
            ĐĂNG KÝ NGAY — 100K
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* Payment Info */}
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
          <span
            className="flex items-center gap-2 text-sm"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <CreditCard className="h-4 w-4" style={{ color: "#FBBF24" }} />
            Chuyển khoản ngân hàng
          </span>
          <span
            className="flex items-center gap-2 text-sm"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <ShieldCheck className="h-4 w-4" style={{ color: "#22c55e" }} />
            Thanh toán an toàn 100%
          </span>
        </div>
      </div>
    </section>
  );
}
