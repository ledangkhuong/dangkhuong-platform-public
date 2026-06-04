"use client";

import { useState } from "react";
import { Users, Sparkles } from "lucide-react";

type Category =
  | "all"
  | "expert"
  | "coach"
  | "designer"
  | "dev"
  | "marketer"
  | "biz"
  | "creator"
  | "other";

type AudienceItem = {
  key: Category;
  emoji: string;
  title: string;
  body: string;
  stat: string;
  fit: number;
  tone: "gold" | "sky" | "emerald";
};

const AUDIENCE: AudienceItem[] = [
  {
    key: "expert",
    emoji: "🎓",
    title: "CHUYÊN GIA CÓ CHUYÊN MÔN",
    body: "Bác sĩ, luật sư, giáo viên, dược sĩ, kế toán, kỹ sư, nhà tâm lý... có kiến thức sâu và muốn biến chuyên môn thành sản phẩm số bán được lâu dài.",
    stat: "Tiềm năng: 200tr/tháng",
    fit: 98,
    tone: "gold",
  },
  {
    key: "coach",
    emoji: "🏆",
    title: "COACH / MENTOR / CONSULTANT",
    body: "Đang dạy 1:1 hoặc theo nhóm nhỏ. Muốn nhân bản kiến thức thành khóa học online, ebook, slot coaching tự động để tiếp cận nhiều người hơn.",
    stat: "Slot 5tr × 20 = 100tr/tháng",
    fit: 96,
    tone: "sky",
  },
  {
    key: "designer",
    emoji: "🎨",
    title: "NHÀ THIẾT KẾ / CREATOR",
    body: "Đang bán template Canva, Notion, Figma, preset Lightroom, LUT video... Muốn có shop riêng tự động giao sản phẩm 24/7.",
    stat: "Template 299K × 500 = 150tr/tháng",
    fit: 95,
    tone: "sky",
  },
  {
    key: "dev",
    emoji: "💻",
    title: "DEVELOPER / DÂN CÔNG NGHỆ",
    body: "Đang bán plugin WordPress, Chrome Extension, SaaS license, source code... Muốn hệ thống bán license tự động và quản lý khách hàng chuyên nghiệp.",
    stat: "License 2tr × 100 = 200tr/tháng",
    fit: 97,
    tone: "gold",
  },
  {
    key: "marketer",
    emoji: "📈",
    title: "MARKETER / AFFILIATE",
    body: "Đang kiếm 5-10% hoa hồng affiliate. Muốn x10, x20 lợi nhuận bằng cách tự tạo sản phẩm số (Ebook, Mini course, Template) của riêng mình.",
    stat: "Hoa hồng 20% scale lớn",
    fit: 92,
    tone: "emerald",
  },
  {
    key: "biz",
    emoji: "🏢",
    title: "CHỦ DOANH NGHIỆP NHỎ",
    body: "Đang vận hành business offline/online. Muốn thêm dòng doanh thu thụ động từ sản phẩm số mà không phải tuyển team.",
    stat: "+30% doanh thu thụ động",
    fit: 94,
    tone: "emerald",
  },
  {
    key: "creator",
    emoji: "📚",
    title: "TÁC GIẢ / BLOGGER / YOUTUBER",
    body: "Đang có audience nhưng chỉ kiếm từ ads. Muốn monetize bằng ebook riêng, khóa học riêng, membership trả phí — sở hữu data fan của mình.",
    stat: "Monetize fans hiệu quả",
    fit: 93,
    tone: "sky",
  },
  {
    key: "other",
    emoji: "💼",
    title: "NGƯỜI ĐI LÀM MUỐN CHUYỂN NGÀNH",
    body: "Muốn có một nghề mới — kỹ năng mới — thu nhập mới từ AI Agent. Sẵn sàng đầu tư 30 ngày để học một kỹ năng đáng giá 10 năm tới.",
    stat: "Kỹ năng đáng giá 10 năm",
    fit: 90,
    tone: "gold",
  },
];

const FILTERS: { key: Category; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "expert", label: "Chuyên gia" },
  { key: "coach", label: "Coach" },
  { key: "designer", label: "Designer" },
  { key: "dev", label: "Dev" },
  { key: "marketer", label: "Marketer" },
  { key: "biz", label: "BizOwner" },
  { key: "creator", label: "Creator" },
  { key: "other", label: "Khác" },
];

const TONE_STYLES: Record<
  AudienceItem["tone"],
  { bg: string; border: string; ring: string; pillBg: string; pillBorder: string; pillColor: string; barFrom: string; barTo: string }
> = {
  gold: {
    bg: "linear-gradient(160deg, rgba(229,182,99,0.14) 0%, #13203F 45%, #0E1730 100%)",
    border: "rgba(229,182,99,0.28)",
    ring: "0 0 0 1px rgba(229,182,99,0.25), 0 18px 40px -18px rgba(229,182,99,0.45)",
    pillBg: "rgba(229,182,99,0.12)",
    pillBorder: "rgba(229,182,99,0.35)",
    pillColor: "#F4D9A8",
    barFrom: "#E5B663",
    barTo: "#F4D9A8",
  },
  sky: {
    bg: "linear-gradient(160deg, rgba(125,211,252,0.12) 0%, #13203F 45%, #0E1730 100%)",
    border: "rgba(125,211,252,0.28)",
    ring: "0 0 0 1px rgba(125,211,252,0.25), 0 18px 40px -18px rgba(125,211,252,0.4)",
    pillBg: "rgba(125,211,252,0.12)",
    pillBorder: "rgba(125,211,252,0.35)",
    pillColor: "#7DD3FC",
    barFrom: "#7DD3FC",
    barTo: "#C9E9FD",
  },
  emerald: {
    bg: "linear-gradient(160deg, rgba(52,211,153,0.12) 0%, #13203F 45%, #0E1730 100%)",
    border: "rgba(52,211,153,0.28)",
    ring: "0 0 0 1px rgba(52,211,153,0.25), 0 18px 40px -18px rgba(52,211,153,0.4)",
    pillBg: "rgba(52,211,153,0.12)",
    pillBorder: "rgba(52,211,153,0.35)",
    pillColor: "#34D399",
    barFrom: "#34D399",
    barTo: "#86EFAC",
  },
};

const TESTIMONIALS: { initials: string; color: string; name: string; role: string; quote: string }[] = [
  {
    initials: "NK",
    color: "#E5B663",
    name: "Anh Khoa",
    role: "Bác sĩ",
    quote: "Có khoá thứ 2 trong 14 ngày",
  },
  {
    initials: "TH",
    color: "#7DD3FC",
    name: "Chị Hà",
    role: "Coach kinh doanh",
    quote: "Doanh thu x3 sau 30 ngày",
  },
  {
    initials: "AT",
    color: "#F4D9A8",
    name: "Anh Tú",
    role: "Designer",
    quote: "100 đơn template tháng đầu",
  },
  {
    initials: "DN",
    color: "#34D399",
    name: "Anh Nam",
    role: "Developer",
    quote: "License auto — khỏi support thủ công",
  },
  {
    initials: "ML",
    color: "#C9A86B",
    name: "Chị Linh",
    role: "Marketer",
    quote: "Bỏ affiliate, tự bán mini course",
  },
];

export default function AudienceSection() {
  const [active, setActive] = useState<Category>("all");

  return (
    <section
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{ background: "#0A1020" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{
              borderColor: "rgba(229,182,99,0.3)",
              background: "rgba(229,182,99,0.06)",
              color: "#E5B663",
            }}
          >
            <Users size={12} /> Đối Tượng Phù Hợp
          </span>
        </div>

        <h2
          className="mb-3 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          Chương Trình Này
          <br />
          <span style={{ color: "#E5B663" }} className="whitespace-nowrap">Dành Cho Ai?</span>
        </h2>
        <p
          className="mb-8 text-center text-[14px] sm:text-base leading-[1.7] max-w-2xl mx-auto"
          style={{ color: "rgba(241,245,251,0.7)" }}
        >
          Bạn phù hợp nếu bạn là 1 trong 8 nhóm dưới đây:
        </p>

        {/* Filter picker */}
        <div className="mb-10">
          <p
            className="text-center text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase mb-3"
            style={{ color: "rgba(241,245,251,0.55)" }}
          >
            Bạn thuộc nhóm nào?
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {FILTERS.map((f) => {
              const isActive = active === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActive(f.key)}
                  className="rounded-full px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold tracking-[0.02em] transition-all duration-200"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)"
                      : "rgba(229,182,99,0.05)",
                    border: isActive
                      ? "1px solid rgba(229,182,99,0.6)"
                      : "1px solid rgba(241,245,251,0.12)",
                    color: isActive ? "#0A1020" : "rgba(241,245,251,0.78)",
                    opacity: isActive ? 1 : 0.85,
                    boxShadow: isActive ? "0 6px 18px -8px rgba(229,182,99,0.6)" : "none",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {AUDIENCE.map((a) => {
            const tone = TONE_STYLES[a.tone];
            const isMatch = active === "all" || active === a.key;
            const isFocused = active !== "all" && active === a.key;

            return (
              <div
                key={a.title}
                className="audience-card group rounded-2xl p-5 flex flex-col"
                style={{
                  background: tone.bg,
                  border: `1px solid ${tone.border}`,
                  opacity: isMatch ? 1 : 0.4,
                  transform: isFocused ? "scale(1.03)" : "scale(1)",
                  transition:
                    "transform 320ms cubic-bezier(.2,.7,.2,1), opacity 320ms ease, box-shadow 320ms ease",
                  ["--ring-shadow" as string]: tone.ring,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl leading-none">{a.emoji}</div>
                  <div
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-bold tracking-[0.05em] tabular-nums"
                    style={{
                      background: tone.pillBg,
                      border: `1px solid ${tone.pillBorder}`,
                      color: tone.pillColor,
                    }}
                  >
                    <Sparkles size={10} /> {a.fit}%
                  </div>
                </div>

                <h3
                  className="text-[13px] sm:text-[14px] font-bold tracking-[-0.005em] mb-2 leading-tight"
                  style={{ color: "rgba(241,245,251,0.95)" }}
                >
                  {a.title}
                </h3>

                <div
                  className="inline-block self-start rounded-full px-2.5 py-1 mb-3 text-[11px] sm:text-[12px] font-semibold tabular-nums"
                  style={{
                    background: tone.pillBg,
                    border: `1px solid ${tone.pillBorder}`,
                    color: tone.pillColor,
                  }}
                >
                  {a.stat}
                </div>

                <p
                  className="text-[13px] sm:text-[13.5px] leading-[1.6] mb-4"
                  style={{ color: "rgba(241,245,251,0.7)" }}
                >
                  {a.body}
                </p>

                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: "rgba(241,245,251,0.55)" }}
                    >
                      Phù hợp
                    </span>
                    <span
                      className="text-[10px] sm:text-[11px] font-bold tracking-[0.05em] tabular-nums"
                      style={{ color: tone.pillColor }}
                    >
                      {a.fit}%
                    </span>
                  </div>
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: "rgba(241,245,251,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${a.fit}%`,
                        background: `linear-gradient(90deg, ${tone.barFrom}, ${tone.barTo})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Student testimonial strip */}
        <div className="mt-14">
          <div className="text-center mb-4">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{
                borderColor: "rgba(125,211,252,0.3)",
                background: "rgba(125,211,252,0.06)",
                color: "#7DD3FC",
              }}
            >
              Học Viên Thực Tế
            </span>
          </div>

          <div className="testimonial-strip flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory sm:justify-center sm:flex-wrap sm:overflow-visible">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.initials + t.name}
                className="testimonial-chip flex items-center gap-3 rounded-2xl p-4 snap-start shrink-0"
                style={{
                  background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  border: "1px solid rgba(241,245,251,0.08)",
                  width: 250,
                  minWidth: 240,
                  maxWidth: 260,
                }}
              >
                <div
                  className="avatar flex items-center justify-center rounded-full text-[12px] sm:text-[13px] font-bold shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    background: `linear-gradient(135deg, ${t.color} 0%, rgba(255,255,255,0.15) 120%)`,
                    color: "#0A1020",
                    boxShadow: `0 0 0 1px ${t.color}55, 0 8px 18px -10px ${t.color}88`,
                  }}
                >
                  {t.initials}
                </div>
                <div className="leading-tight min-w-0">
                  <div
                    className="text-[12px] sm:text-[13px] font-semibold truncate"
                    style={{ color: "rgba(241,245,251,0.95)" }}
                  >
                    {t.name}{" "}
                    <span
                      className="text-[11px] sm:text-[11.5px] font-medium"
                      style={{ color: "rgba(241,245,251,0.55)" }}
                    >
                      · {t.role}
                    </span>
                  </div>
                  <div
                    className="text-[12px] sm:text-[12.5px] italic leading-[1.55] mt-0.5 tabular-nums"
                    style={{ color: "rgba(241,245,251,0.7)" }}
                  >
                    “{t.quote}”
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .audience-card {
          will-change: transform;
        }
        .audience-card:hover {
          transform: translateY(-5px) scale(1.01);
          box-shadow: var(--ring-shadow);
        }
        .testimonial-chip {
          transition: transform 220ms ease, border-color 220ms ease;
        }
        .testimonial-chip:hover {
          transform: translateY(-2px);
          border-color: rgba(229, 182, 99, 0.35);
        }
        .testimonial-strip::-webkit-scrollbar {
          height: 6px;
        }
        .testimonial-strip::-webkit-scrollbar-thumb {
          background: rgba(229, 182, 99, 0.25);
          border-radius: 999px;
        }
      `}</style>
    </section>
  );
}
