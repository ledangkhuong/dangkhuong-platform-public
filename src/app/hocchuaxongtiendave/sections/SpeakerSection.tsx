"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Check,
  GraduationCap,
  Star,
  TrendingUp,
  Users,
  Sparkles,
  Activity,
  HandshakeIcon,
  Zap,
} from "lucide-react";

const ACHIEVEMENTS = [
  "11+ năm kinh nghiệm trong giáo dục online & marketing",
  "151K Follow trên Facebook cá nhân — hàng trăm ngàn học viên đã học",
  "45 triệu doanh thu trong 1 tuần thử nghiệm với chỉ 300 data",
  "Đã tự xây thành công hệ thống dangkhuong.com (LMS, Admin, CRM)",
  "Tiết kiệm 1 tỷ đồng so với cách làm truyền thống thuê dev",
];

const REASONS = [
  {
    title: "Học từ người đang LÀM",
    body: "Không phải từ giảng viên lý thuyết. Tôi đang vận hành hệ thống mà tôi dạy bạn xây.",
    Icon: Zap,
  },
  {
    title: "Hệ thống đang chạy thật",
    body: "Bạn có thể vào dangkhuong.com xem trực tiếp ngay bây giờ.",
    Icon: Activity,
  },
  {
    title: "Cam kết đồng hành",
    body: "Live Q&A hàng tuần. Group Zalo hỗ trợ trực tiếp 30 ngày. Không bỏ rơi học viên.",
    Icon: HandshakeIcon,
  },
];

type Stat = {
  Icon: typeof Calendar;
  target: number;
  display: (n: number) => string;
  label: string;
};

const STATS: Stat[] = [
  {
    Icon: Calendar,
    target: 11,
    display: (n) => `${n}+`,
    label: "năm trong nghề",
  },
  {
    Icon: Users,
    target: 151,
    display: (n) => `${n}K+`,
    label: "followers Facebook",
  },
  {
    Icon: GraduationCap,
    target: 300,
    display: (n) => `${n}K+`,
    label: "học viên đã học",
  },
  {
    Icon: TrendingUp,
    target: 45,
    display: (n) => `${n}tr/tuần`,
    label: "doanh thu thử nghiệm",
  },
];

const MEDIA = [
  "FACEBOOK 151K",
  "YOUTUBE",
  "ZALO OA",
  "DANGKHUONG.COM",
  "LINKEDIN",
  "EBOOK SHOP",
];

function CountUpNumber({
  target,
  display,
  active,
  duration = 1500,
}: {
  target: number;
  display: (n: number) => string;
  active: boolean;
  duration?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const steps = 40;
    const stepTime = Math.max(20, Math.floor(duration / steps));
    let current = 0;
    const increment = target / steps;
    const id = setInterval(() => {
      current += increment;
      if (current >= target) {
        setValue(target);
        clearInterval(id);
      } else {
        setValue(Math.floor(current));
      }
    }, stepTime);
    return () => clearInterval(id);
  }, [active, target, duration]);

  return <>{display(value)}</>;
}

export default function SpeakerSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const node = sectionRef.current;
    if (!node) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{ background: "#0A1020" }}
    >
      {/* Local CSS keyframes for rotating ring & live pulse */}
      <style>{`
        @keyframes dk-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes dk-pulse-dot {
          0%   { transform: scale(1);   opacity: 1;   }
          50%  { transform: scale(1.6); opacity: 0.4; }
          100% { transform: scale(1);   opacity: 1;   }
        }
        @keyframes dk-pulse-bar {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 1;    }
        }
      `}</style>

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
            <GraduationCap size={12} /> Về Người Hướng Dẫn
          </span>
        </div>

        <h2
          className="mb-10 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          Ai Là Người <span style={{ color: "#E5B663" }}>Hướng Dẫn Bạn?</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 sm:gap-10 items-start mb-10">
          {/* Portrait */}
          <div className="lg:col-span-2 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Rotating gold ring */}
              <div
                aria-hidden
                className="absolute -inset-5 rounded-[28px] pointer-events-none"
                style={{
                  background:
                    "conic-gradient(from 0deg, rgba(229,182,99,0) 0deg, rgba(229,182,99,0.7) 90deg, rgba(244,217,168,0.9) 180deg, rgba(201,168,107,0.5) 270deg, rgba(229,182,99,0) 360deg)",
                  WebkitMask:
                    "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  padding: "2px",
                  animation: "dk-rotate 14s linear infinite",
                }}
              />
              {/* Soft glow */}
              <div
                aria-hidden
                className="absolute -inset-4 rounded-2xl pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(229,182,99,0.3) 0%, transparent 60%)",
                  filter: "blur(20px)",
                }}
              />
              <img
                src="/images/about/portrait.jpg"
                alt="Thầy Lê Đăng Khương"
                className="relative w-full max-w-xs rounded-2xl object-cover"
                style={{ border: "2px solid rgba(229,182,99,0.35)" }}
              />
              <div
                className="absolute -bottom-3 -right-3 rounded-xl px-4 py-2 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                  boxShadow: "0 8px 20px rgba(229,182,99,0.35)",
                }}
              >
                <Star size={14} className="fill-current" style={{ color: "#0A1020" }} />
                <span
                  className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] tabular-nums"
                  style={{ color: "#0A1020" }}
                >
                  151K Followers
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="lg:col-span-3">
            <div
              className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] mb-2 font-semibold"
              style={{ color: "#E5B663" }}
            >
              Thầy
            </div>
            <h3
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight tracking-[-0.01em]"
              style={{ color: "#F1F5FB" }}
            >
              LÊ ĐĂNG KHƯƠNG
            </h3>
            <p
              className="text-[14.5px] sm:text-[15px] leading-[1.75] mb-5"
              style={{ color: "rgba(241,245,251,0.78)" }}
            >
              Chuyên gia hàng đầu Việt Nam về xây thương hiệu cá nhân & Đào tạo AI, xây dựng hệ thống bán hàng tự động bằng AI Agent.
            </p>

            {/* Mini "Hệ thống của Thầy" dashboard preview */}
            <div
              className="rounded-2xl p-4 sm:p-5 mb-6"
              style={{
                background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                border: "1px solid rgba(229,182,99,0.2)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      background: "rgba(52,211,153,0.12)",
                      color: "#34D399",
                      border: "1px solid rgba(52,211,153,0.35)",
                    }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "#34D399",
                        animation: "dk-pulse-dot 1.5s ease-in-out infinite",
                      }}
                    />
                    Live
                  </span>
                  <span
                    className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: "rgba(241,245,251,0.55)" }}
                  >
                    Hệ thống của Thầy
                  </span>
                </div>
                <Sparkles size={14} style={{ color: "#E5B663" }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div
                    className="text-xl font-extrabold tabular-nums tracking-[-0.02em]"
                    style={{ color: "#F1F5FB" }}
                  >
                    310
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-[0.15em]"
                    style={{ color: "rgba(241,245,251,0.55)" }}
                  >
                    học viên
                  </div>
                </div>
                <div style={{ borderLeft: "1px solid rgba(229,182,99,0.18)", paddingLeft: "12px" }}>
                  <div
                    className="text-xl font-extrabold tabular-nums tracking-[-0.02em]"
                    style={{ color: "#7DD3FC" }}
                  >
                    47
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-[0.15em]"
                    style={{ color: "rgba(241,245,251,0.55)" }}
                  >
                    đơn hôm nay
                  </div>
                </div>
                <div style={{ borderLeft: "1px solid rgba(229,182,99,0.18)", paddingLeft: "12px" }}>
                  <div
                    className="text-xl font-extrabold tabular-nums tracking-[-0.02em]"
                    style={{ color: "#E5B663" }}
                  >
                    45tr
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-[0.15em]"
                    style={{ color: "rgba(241,245,251,0.55)" }}
                  >
                    doanh thu
                  </div>
                </div>
              </div>
              {/* fake activity bar */}
              <div className="mt-3 flex items-end gap-1 h-6">
                {[40, 65, 50, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${h}%`,
                      background: i % 3 === 0 ? "#E5B663" : "rgba(229,182,99,0.35)",
                      animation: `dk-pulse-bar ${1.4 + (i % 4) * 0.2}s ease-in-out ${i * 0.05}s infinite`,
                    }}
                  />
                ))}
              </div>
              <div
                className="mt-2 text-[10px] sm:text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "rgba(241,245,251,0.55)" }}
              >
                dangkhuong.com đang chạy real-time
              </div>
            </div>
          </div>
        </div>

        {/* Big stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-12">
          {STATS.map(({ Icon, target, display, label }) => (
            <div
              key={label}
              className="relative rounded-2xl p-4 sm:p-5 overflow-hidden flex flex-col h-full"
              style={{
                background:
                  "linear-gradient(180deg, rgba(229,182,99,0.08) 0%, rgba(14,23,48,0.6) 100%)",
                border: "1px solid rgba(229,182,99,0.3)",
                boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
              }}
            >
              <div
                aria-hidden
                className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(229,182,99,0.18) 0%, transparent 70%)",
                }}
              />
              <Icon size={20} style={{ color: "#E5B663" }} className="mb-3" />
              <div
                className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-[-0.02em] leading-none mb-2"
                style={{ color: "#F4D9A8" }}
              >
                <CountUpNumber target={target} display={display} active={inView} />
              </div>
              <div
                className="text-[11px] sm:text-[12px] uppercase tracking-[0.14em] font-semibold mt-auto"
                style={{ color: "rgba(241,245,251,0.7)" }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Achievements + Quote (kept after stats) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 sm:gap-10 mb-12">
          <div className="lg:col-span-5">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mb-8">
              {ACHIEVEMENTS.map((a) => (
                <li key={a} className="flex items-start gap-3">
                  <span
                    className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(229,182,99,0.15)",
                      border: "1px solid rgba(229,182,99,0.3)",
                    }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#E5B663" }} />
                  </span>
                  <span
                    className="text-[13.5px] sm:text-[14.5px] leading-[1.65]"
                    style={{ color: "rgba(241,245,251,0.82)" }}
                  >
                    {a}
                  </span>
                </li>
              ))}
            </ul>

            {/* Quote */}
            <blockquote
              className="rounded-2xl p-5 sm:p-6 relative"
              style={{
                background: "rgba(229,182,99,0.06)",
                border: "1px solid rgba(229,182,99,0.25)",
                borderLeft: "4px solid #E5B663",
              }}
            >
              <p
                className="text-[14px] sm:text-[15px] italic leading-[1.8] mb-3"
                style={{ color: "rgba(241,245,251,0.88)" }}
              >
                &ldquo;Tôi không phải là dev. Tôi là chuyên gia về sức khỏe và marketing. Nhưng với Claude Code, tôi xây được hệ thống mà ngày xưa cần cả đội kỹ sư. Đây là kỹ năng đáng giá nhất tôi học được trong 10 năm qua — và tôi muốn truyền lại cho bạn.&rdquo;
              </p>
              <footer
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "#E5B663" }}
              >
                — Thầy Lê Đăng Khương
              </footer>
            </blockquote>

            {/* "Đã xuất hiện trên" credibility row */}
            <div className="mt-8">
              <div
                className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] mb-3 text-center"
                style={{ color: "rgba(241,245,251,0.55)" }}
              >
                Đã xuất hiện trên
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {MEDIA.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-[0.18em] uppercase"
                    style={{
                      color: "#F4D9A8",
                      background:
                        "linear-gradient(180deg, rgba(229,182,99,0.10) 0%, rgba(14,23,48,0.5) 100%)",
                      border: "1px solid rgba(229,182,99,0.3)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2) inset",
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Why learn from Thay */}
        <h3
          className="text-center text-base sm:text-lg font-bold mb-8 mt-10"
          style={{ color: "#F1F5FB" }}
        >
          Tại sao bạn nên học từ Thầy Khương?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          {REASONS.map((r, i) => {
            const RIcon = r.Icon;
            return (
              <div
                key={r.title}
                className="relative rounded-2xl p-5 sm:p-6 overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  border: "1px solid rgba(229,182,99,0.18)",
                  minHeight: "200px",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                }}
              >
                {/* HUGE faded gold numeral */}
                <div
                  aria-hidden
                  className="absolute select-none pointer-events-none text-7xl sm:text-8xl font-extrabold leading-none tabular-nums"
                  style={{
                    top: "-12px",
                    right: "8px",
                    color: "#E5B663",
                    opacity: 0.08,
                    letterSpacing: "-0.05em",
                  }}
                >
                  0{i + 1}
                </div>
                <div className="relative">
                  <div
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4"
                    style={{
                      background: "rgba(229,182,99,0.12)",
                      border: "1px solid rgba(229,182,99,0.3)",
                    }}
                  >
                    <RIcon size={18} style={{ color: "#E5B663" }} />
                  </div>
                  <h4
                    className="text-base sm:text-lg font-bold mb-2"
                    style={{ color: "#F1F5FB" }}
                  >
                    {r.title}
                  </h4>
                  <p
                    className="text-[13.5px] sm:text-[14px] leading-[1.65]"
                    style={{ color: "rgba(241,245,251,0.72)" }}
                  >
                    {r.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
