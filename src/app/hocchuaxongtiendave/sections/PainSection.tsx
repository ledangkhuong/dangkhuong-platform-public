"use client";

import { useMemo, useState } from "react";
import {
  XCircle,
  CheckCircle2,
  TrendingDown,
  AlertOctagon,
  ArrowRight,
} from "lucide-react";

type PainStat = {
  label: string;
  icon: "down" | "octagon";
};

const PAIN_POINTS: {
  title: string;
  body: string;
  stat: PainStat;
}[] = [
  {
    title: "BỊ NỀN TẢNG NẮM CỔ",
    body: "Đóng 2.6 - 3.8 triệu/tháng cho Kajabi, Skool, Teachable, Gumroad. Mỗi tháng họ tăng giá — bạn cắn răng trả. Họ sập — bạn mất sạch khách hàng. Bạn không sở hữu gì ngoài cái username.",
    stat: { label: "2.6 - 3.8tr / tháng / nền tảng", icon: "down" },
  },
  {
    title: "THUÊ DEV LÀ HỐ ĐEN ĐỐT TIỀN",
    body: "Báo giá 50 triệu, làm 6 tháng, ra sản phẩm dở dang. Muốn sửa nút phải đợi 1 tuần. Mỗi tháng maintain 5-10 triệu. Tổng cộng cả trăm triệu đi đời — hệ thống vẫn chưa thực sự dùng được.",
    stat: { label: "50-500tr ngân sách hố đen", icon: "octagon" },
  },
  {
    title: "KHÔNG SỞ HỮU DATA KHÁCH HÀNG",
    body: "Bạn chạy ads Facebook — Meta khóa account, bay sạch khách. Bán trên Shopee, TikTok Shop, Gumroad — sàn nắm hết data. Không remarketing, không nuôi dưỡng. Chi phí khách mới gấp 6 lần khách cũ.",
    stat: { label: "6x chi phí khách mới vs khách cũ", icon: "down" },
  },
  {
    title: "KHÔNG TỰ ĐỘNG HÓA ĐƯỢC",
    body: "Khách chuyển khoản → bạn check thủ công → gửi file/cấp quyền thủ công → gửi email thủ công. Một ngày 10 đơn là ngộp, sót đơn. Đi vắng 1 hôm là khách phàn nàn. Bạn thành nô lệ của sản phẩm mình.",
    stat: { label: "10 đơn/ngày = ngộp", icon: "octagon" },
  },
  {
    title: "KHÔNG CÓ THỜI GIAN CHO CUỘC SỐNG",
    body: "Vào nghề bán sản phẩm số để có TỰ DO — nhưng thực tế làm 16 tiếng/ngày. Sức khỏe đi xuống. Gia đình bỏ bê. Sở thích quên mất. Bánh xe cuộc đời lệch hẳn về CÔNG VIỆC.",
    stat: { label: "16 tiếng/ngày = mất sức khỏe", icon: "octagon" },
  },
];

export default function PainSection() {
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const count = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );

  const toggle = (idx: number) => {
    setSelected((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCTA = () => {
    if (typeof document !== "undefined") {
      document
        .getElementById("register")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const intense = count >= 2;
  const veryIntense = count >= 3;

  return (
    <section
      className="pain-section relative overflow-hidden pt-10 pb-14 sm:pt-14 sm:pb-20 md:pt-16 md:pb-24 px-4 sm:px-6"
      style={{ backgroundColor: "#0A1020" }}
    >
      <style jsx>{`
        @keyframes painOrbDrift1 {
          0% {
            transform: translate(-10%, -10%) scale(1);
            opacity: 0.35;
          }
          50% {
            transform: translate(15%, 20%) scale(1.15);
            opacity: 0.55;
          }
          100% {
            transform: translate(-10%, -10%) scale(1);
            opacity: 0.35;
          }
        }
        @keyframes painOrbDrift2 {
          0% {
            transform: translate(20%, 10%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-15%, -20%) scale(1.2);
            opacity: 0.5;
          }
          100% {
            transform: translate(20%, 10%) scale(1);
            opacity: 0.3;
          }
        }
        @keyframes painOrbDrift3 {
          0% {
            transform: translate(0%, 0%) scale(1);
            opacity: 0.25;
          }
          50% {
            transform: translate(-12%, 18%) scale(1.1);
            opacity: 0.45;
          }
          100% {
            transform: translate(0%, 0%) scale(1);
            opacity: 0.25;
          }
        }
        @keyframes painQuotePulse {
          0%,
          100% {
            box-shadow:
              0 0 0 0 rgba(229, 182, 99, 0.0),
              0 0 30px 0 rgba(229, 182, 99, 0.08);
          }
          50% {
            box-shadow:
              0 0 0 4px rgba(229, 182, 99, 0.12),
              0 0 60px 4px rgba(229, 182, 99, 0.25);
          }
        }
        @keyframes painQuoteShake {
          0%,
          100% {
            transform: translateX(0) scale(1);
          }
          15% {
            transform: translateX(-3px) scale(1.005);
          }
          30% {
            transform: translateX(3px) scale(1.005);
          }
          45% {
            transform: translateX(-2px) scale(1.005);
          }
          60% {
            transform: translateX(2px) scale(1.005);
          }
          75% {
            transform: translateX(-1px) scale(1.005);
          }
        }
        @keyframes painTallyPop {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.12);
          }
          100% {
            transform: scale(1);
          }
        }
        .pain-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(80px);
          pointer-events: none;
        }
        .pain-orb-1 {
          top: -120px;
          left: -120px;
          width: 420px;
          height: 420px;
          background: radial-gradient(
            circle,
            rgba(230, 57, 70, 0.35) 0%,
            rgba(230, 57, 70, 0) 70%
          );
          animation: painOrbDrift1 18s ease-in-out infinite;
        }
        .pain-orb-2 {
          bottom: -150px;
          right: -150px;
          width: 500px;
          height: 500px;
          background: radial-gradient(
            circle,
            rgba(248, 113, 113, 0.28) 0%,
            rgba(248, 113, 113, 0) 70%
          );
          animation: painOrbDrift2 22s ease-in-out infinite;
        }
        .pain-orb-3 {
          top: 40%;
          left: 50%;
          width: 360px;
          height: 360px;
          background: radial-gradient(
            circle,
            rgba(230, 57, 70, 0.18) 0%,
            rgba(230, 57, 70, 0) 70%
          );
          animation: painOrbDrift3 26s ease-in-out infinite;
        }
        .pain-quote-glow {
          animation: painQuotePulse 3.2s ease-in-out infinite;
        }
        .pain-quote-shake {
          animation:
            painQuotePulse 3.2s ease-in-out infinite,
            painQuoteShake 0.8s ease-in-out 1;
        }
        .pain-tally-pop {
          animation: painTallyPop 0.35s ease-out;
        }
      `}</style>

      {/* Drifting red glow orbs */}
      <div className="pain-orb pain-orb-1" aria-hidden />
      <div className="pain-orb pain-orb-2" aria-hidden />
      <div className="pain-orb pain-orb-3" aria-hidden />

      <div className="relative mx-auto max-w-6xl">
        <h2
          className="mb-4 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          Nếu Bạn Đang Bán Sản Phẩm Số Online
        </h2>
        <p
          className="mb-8 text-center text-[14px] sm:text-base leading-[1.7] max-w-3xl mx-auto"
          style={{ color: "rgba(241,245,251,0.55)" }}
        >
          (Ebook, Khóa học, Template, Phần mềm...) — Có phải bạn đang đối mặt{" "}
          <span style={{ color: "#E5B663" }} className="font-semibold">
            5 vấn đề
          </span>{" "}
          này?
        </p>

        {/* Live tally counter */}
        <div className="mb-10 flex justify-center">
          <div
            key={count}
            className="pain-tally-pop inline-flex items-center gap-3 rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold tabular-nums"
            style={{
              background:
                count > 0
                  ? "linear-gradient(180deg, rgba(229,182,99,0.14) 0%, rgba(201,168,107,0.06) 100%)"
                  : "rgba(255,255,255,0.03)",
              border:
                count > 0
                  ? "1px solid rgba(229,182,99,0.45)"
                  : "1px solid rgba(241,245,251,0.12)",
              color: count > 0 ? "#E5B663" : "rgba(241,245,251,0.7)",
              transition: "all 300ms ease",
            }}
          >
            <CheckCircle2
              size={18}
              style={{ color: count > 0 ? "#E5B663" : "rgba(241,245,251,0.4)" }}
            />
            <span className="tabular-nums">
              <span style={{ fontSize: "1.15em", fontWeight: 800 }}>
                {count}
              </span>
              /5 vấn đề bạn đang gặp phải
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          {PAIN_POINTS.map((pain, index) => {
            const isSelected = !!selected[index];
            const StatIcon =
              pain.stat.icon === "down" ? TrendingDown : AlertOctagon;
            return (
              <button
                key={index}
                type="button"
                onClick={() => toggle(index)}
                aria-pressed={isSelected}
                className={`group text-left flex flex-col gap-3 rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:translate-y-[-2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B663]/60 ${
                  index === PAIN_POINTS.length - 1
                    ? "md:col-span-2 md:max-w-2xl md:mx-auto md:w-full"
                    : ""
                }`}
                style={{
                  background: isSelected
                    ? "linear-gradient(180deg, rgba(229,182,99,0.08) 0%, #0E1730 100%)"
                    : "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  borderStyle: "solid",
                  borderTopWidth: "1px",
                  borderRightWidth: "1px",
                  borderBottomWidth: "1px",
                  borderLeftWidth: "3px",
                  borderTopColor: isSelected
                    ? "rgba(229,182,99,0.45)"
                    : "rgba(239,68,68,0.15)",
                  borderRightColor: isSelected
                    ? "rgba(229,182,99,0.45)"
                    : "rgba(239,68,68,0.15)",
                  borderBottomColor: isSelected
                    ? "rgba(229,182,99,0.45)"
                    : "rgba(239,68,68,0.15)",
                  borderLeftColor: isSelected ? "#E5B663" : "#E63946",
                  boxShadow: isSelected
                    ? "0 0 0 1px rgba(229,182,99,0.18), 0 12px 32px -16px rgba(229,182,99,0.35)"
                    : "none",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-start gap-3">
                  {isSelected ? (
                    <CheckCircle2
                      className="mt-0.5 h-6 w-6 flex-shrink-0"
                      style={{ color: "#E5B663" }}
                      strokeWidth={2.25}
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 h-6 w-6 flex-shrink-0"
                      style={{ color: "#E63946" }}
                      strokeWidth={2}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div
                        className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em]"
                        style={{
                          color: isSelected ? "#E5B663" : "#F87171",
                        }}
                      >
                        Vấn đề #{index + 1}
                      </div>
                      {isSelected && (
                        <div
                          className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] inline-flex items-center gap-1"
                          style={{ color: "#E5B663" }}
                        >
                          <CheckCircle2 size={12} /> Tôi đang gặp
                        </div>
                      )}
                    </div>
                    <h3
                      className="text-base sm:text-lg font-bold tracking-[-0.005em] mb-2.5"
                      style={{ color: "#F1F5FB" }}
                    >
                      {pain.title}
                    </h3>

                    {/* Stat chip */}
                    <div className="mb-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] sm:text-[12px] font-semibold tracking-[0.02em]"
                        style={{
                          background: isSelected
                            ? "linear-gradient(180deg, rgba(229,182,99,0.14) 0%, rgba(201,168,107,0.06) 100%)"
                            : "linear-gradient(180deg, rgba(248,113,113,0.12) 0%, rgba(230,57,70,0.05) 100%)",
                          border: isSelected
                            ? "1px solid rgba(229,182,99,0.35)"
                            : "1px solid rgba(239,68,68,0.30)",
                          color: isSelected ? "#E5B663" : "#F87171",
                          transition: "all 300ms ease",
                        }}
                      >
                        <StatIcon size={12} strokeWidth={2.25} />
                        {pain.stat.label}
                      </span>
                    </div>

                    <p
                      className="text-[14px] sm:text-[14.5px] leading-[1.7]"
                      style={{ color: "rgba(241,245,251,0.72)" }}
                    >
                      {pain.body}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom quote */}
        <div
          className={`mx-auto mt-12 max-w-3xl rounded-2xl p-6 sm:p-8 text-center transition-all duration-500 ${
            veryIntense
              ? "pain-quote-shake"
              : intense
                ? "pain-quote-glow"
                : ""
          }`}
          style={{
            background: intense
              ? "linear-gradient(180deg, rgba(229,182,99,0.14) 0%, rgba(229,182,99,0.04) 100%)"
              : "linear-gradient(180deg, rgba(229,182,99,0.08) 0%, rgba(229,182,99,0.02) 100%)",
            border: intense
              ? "1px solid rgba(229,182,99,0.5)"
              : "1px solid rgba(229,182,99,0.25)",
            transform: intense ? "scale(1.01)" : "scale(1)",
          }}
        >
          <p
            className="text-[15px] sm:text-base leading-[1.75] mb-2.5"
            style={{ color: "rgba(241,245,251,0.85)" }}
          >
            <span className="text-2xl mr-1">💡</span> Vấn đề thật sự không phải bạn{" "}
            <em>thiếu sản phẩm</em> hay <em>chuyên môn</em>.
          </p>
          <p
            className="text-lg sm:text-xl font-bold tracking-[-0.005em]"
            style={{ color: "#E5B663" }}
          >
            Vấn đề là bạn THIẾU MỘT HỆ THỐNG.
          </p>
          <p
            className="text-[14px] sm:text-[14.5px] mt-2.5 leading-[1.7]"
            style={{ color: "rgba(241,245,251,0.55)" }}
          >
            Một hệ thống tự động hóa — bán được MỌI loại sản phẩm số — sở hữu
            100% — và TỰ TAY BẠN XÂY ĐƯỢC.
          </p>

          {/* CTA */}
          <div className="mt-5">
            <button
              type="button"
              onClick={handleCTA}
              className="inline-flex items-center gap-2 rounded-full px-5 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-[15px] font-bold tracking-wide transition-all duration-300 hover:translate-y-[-1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B663]/60"
              style={{
                background:
                  "linear-gradient(180deg, #F4D9A8 0%, #E5B663 55%, #C9A86B 100%)",
                color: "#0A1020",
                boxShadow:
                  "0 10px 28px -10px rgba(229,182,99,0.6), inset 0 1px 0 rgba(255,255,255,0.45)",
                cursor: "pointer",
              }}
            >
              Tôi gặp đúng vấn đề này — Xem giải pháp
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
