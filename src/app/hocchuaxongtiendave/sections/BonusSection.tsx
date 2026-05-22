"use client";

import {
  Gift,
  ArrowRight,
  Crown,
  Sparkles,
  Code2,
  LayoutDashboard,
  Palette,
  Mail,
  Users,
  Play,
  Circle,
} from "lucide-react";

interface BonusSectionProps {
  onScrollToRegister?: () => void;
}

const BONUSES = [
  {
    icon: "📝",
    title: "50 Prompt Claude Tạo Nội Dung Bán Hàng",
    body: "50 prompt mẫu Thầy Khương đã test và tối ưu — viết landing page, email, ad copy, content social. Copy paste vào Claude là dùng được ngay.",
    value: "1.997.000đ",
  },
  {
    icon: "💻",
    title: "Source Code Next.js Đầy Đủ",
    body: "Toàn bộ source code Landing Page + Tích hợp SePay + Email Resend đã test kỹ. Bạn copy về — đổi nội dung — deploy là chạy. Tiết kiệm 1 tháng tự code.",
    value: "4.997.000đ",
  },
  {
    icon: "🎓",
    title: "Source Code LMS Hoàn Chỉnh",
    body: "Source code LMS y hệt dangkhuong.com: Dashboard học viên + Course Player + Tracking + Certificate. Bạn được sở hữu 100%.",
    value: "4.997.000đ",
  },
  {
    icon: "🎨",
    title: "10 Template Canva Ebook & Landing",
    body: "10 template Canva thiết kế chuyên nghiệp — chỉ cần đổ nội dung là có Ebook đẹp như sách thật và Landing Page chuyên nghiệp.",
    value: "997.000đ",
  },
  {
    icon: "📧",
    title: "7 Email Sequence Nurture Mẫu",
    body: "7 email Thầy đã viết sẵn — nurture khách hàng từ lúc để lại email đến lúc mua khóa Core. Copy paste vào Resend là chạy.",
    value: "497.000đ",
  },
  {
    icon: "👥",
    title: "Group Zalo Hỗ Trợ 30 Ngày + Live Q&A",
    body: "Vào group Zalo riêng để Thầy và team hỗ trợ trực tiếp 30 ngày. Live Q&A hàng tuần với Thầy Khương để giải đáp mọi vướng mắc.",
    value: "2.997.000đ",
  },
];

const TOTAL_BONUS_VALUE = "16.479.000đ";

/* ---------- Mockup previews (pure CSS / inline) ---------- */
/* All previews are wrapped in a fixed-height shell so the 6 cards line up. */

const PREVIEW_SHELL_CLASS = "h-[120px] sm:h-[124px] overflow-hidden";

function PromptPreview() {
  return (
    <div
      className="h-full rounded-lg p-3 font-mono text-[11px] leading-[1.55] space-y-1 border"
      style={{
        background: "#070C1A",
        borderColor: "rgba(229,182,99,0.18)",
        color: "rgba(241,245,251,0.78)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: "#ef4444" }} />
        <span className="h-2 w-2 rounded-full" style={{ background: "#f4d9a8" }} />
        <span className="h-2 w-2 rounded-full" style={{ background: "#34D399" }} />
        <span className="ml-2 text-[10px]" style={{ color: "rgba(241,245,251,0.4)" }}>
          prompt_01.txt
        </span>
      </div>
      <div>
        <span style={{ color: "#E5B663" }}>&gt;</span> Hãy viết headline cho LP{" "}
        <span style={{ color: "#7DD3FC" }}>khóa học</span>...
      </div>
      <div>
        <span style={{ color: "#E5B663" }}>&gt;</span> Tạo 5 hook cảm xúc theo{" "}
        <span style={{ color: "#7DD3FC" }}>PAS</span>...
      </div>
      <div>
        <span style={{ color: "#E5B663" }}>&gt;</span> Email nurture day{" "}
        <span style={{ color: "#34D399" }}>1-7</span>_
      </div>
    </div>
  );
}

function CodeEditorPreview() {
  return (
    <div
      className="h-full rounded-lg overflow-hidden border text-[10px] font-mono flex flex-col"
      style={{
        background: "#070C1A",
        borderColor: "rgba(229,182,99,0.18)",
      }}
    >
      <div
        className="flex items-center justify-between px-2.5 py-1.5 border-b"
        style={{
          background: "rgba(229,182,99,0.06)",
          borderColor: "rgba(229,182,99,0.12)",
        }}
      >
        <span className="flex items-center gap-1" style={{ color: "#E5B663" }}>
          <Code2 size={10} /> next.js
        </span>
        <span style={{ color: "rgba(241,245,251,0.4)" }}>main</span>
      </div>
      <div className="flex flex-1 min-h-0">
        <div
          className="w-[42%] p-2 space-y-1 border-r"
          style={{ borderColor: "rgba(229,182,99,0.1)", color: "rgba(241,245,251,0.7)" }}
        >
          <div>📁 app/</div>
          <div className="pl-2.5" style={{ color: "#7DD3FC" }}>
            ▸ page.tsx
          </div>
          <div className="pl-2.5">▸ register.ts</div>
          <div className="pl-2.5">▸ qr.ts</div>
        </div>
        <div className="flex-1 p-2 leading-[1.6]" style={{ color: "rgba(241,245,251,0.55)" }}>
          <div>
            <span style={{ color: "rgba(241,245,251,0.3)" }}>1</span>{" "}
            <span style={{ color: "#C9A86B" }}>export</span> default
          </div>
          <div
            className="rounded px-1 -mx-1"
            style={{
              background: "rgba(229,182,99,0.12)",
              color: "#F4D9A8",
            }}
          >
            <span style={{ color: "rgba(241,245,251,0.3)" }}>2</span>{" "}
            <span style={{ color: "#7DD3FC" }}>function</span> Page() {`{`}
          </div>
          <div>
            <span style={{ color: "rgba(241,245,251,0.3)" }}>3</span>{" "}
            <span style={{ color: "#34D399" }}>return</span> &lt;LP/&gt;
          </div>
        </div>
      </div>
    </div>
  );
}

function LmsPreview() {
  return (
    <div
      className="h-full rounded-lg overflow-hidden border"
      style={{
        background: "#070C1A",
        borderColor: "rgba(229,182,99,0.18)",
      }}
    >
      <div className="flex h-full">
        {/* Sidebar */}
        <div
          className="w-[34%] p-2 space-y-1.5 border-r"
          style={{
            background: "rgba(229,182,99,0.04)",
            borderColor: "rgba(229,182,99,0.12)",
          }}
        >
          <div className="text-[9px] uppercase tracking-wider" style={{ color: "#E5B663" }}>
            Modules
          </div>
          <div
            className="h-1.5 rounded-full"
            style={{ background: "linear-gradient(90deg,#E5B663,#C9A86B)", width: "85%" }}
          />
          <div className="h-1.5 rounded-full" style={{ background: "rgba(125,211,252,0.5)", width: "60%" }} />
          <div className="h-1.5 rounded-full" style={{ background: "rgba(241,245,251,0.18)", width: "70%" }} />
        </div>
        {/* Main */}
        <div className="flex-1 p-2 flex flex-col gap-1.5">
          <div
            className="flex-1 rounded relative flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(125,211,252,0.18), rgba(229,182,99,0.12))",
              border: "1px solid rgba(229,182,99,0.18)",
            }}
          >
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center"
              style={{ background: "rgba(10,16,32,0.7)", border: "1px solid rgba(229,182,99,0.5)" }}
            >
              <Play size={10} style={{ color: "#E5B663", marginLeft: 1 }} fill="#E5B663" />
            </div>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: "rgba(241,245,251,0.1)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: "62%",
                background: "linear-gradient(90deg,#E5B663,#F4D9A8)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvaPreview() {
  const tiles = [
    "linear-gradient(135deg,#E5B663,#C9A86B)",
    "linear-gradient(135deg,#7DD3FC,#3B82F6)",
    "linear-gradient(135deg,#F472B6,#E5B663)",
    "linear-gradient(135deg,#34D399,#0EA5A4)",
  ];
  return (
    <div
      className="h-full rounded-lg p-2.5 grid grid-cols-2 gap-2 border"
      style={{
        background: "#070C1A",
        borderColor: "rgba(229,182,99,0.18)",
      }}
    >
      {tiles.map((bg, i) => (
        <div
          key={i}
          className="rounded-md relative overflow-hidden"
          style={{ background: bg }}
        >
          <div
            className="absolute inset-1 rounded-sm flex flex-col justify-between p-1"
            style={{ background: "rgba(10,16,32,0.18)" }}
          >
            <div className="h-1 w-3/4 rounded-full" style={{ background: "rgba(255,255,255,0.8)" }} />
            <div className="h-0.5 w-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.55)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailPreview() {
  return (
    <div
      className="h-full rounded-lg p-3 border space-y-2"
      style={{
        background: "#070C1A",
        borderColor: "rgba(229,182,99,0.18)",
      }}
    >
      <div
        className="flex items-center justify-between pb-2 border-b"
        style={{ borderColor: "rgba(229,182,99,0.12)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{
              background: "linear-gradient(135deg,#E5B663,#C9A86B)",
              color: "#0A1020",
            }}
          >
            TK
          </div>
          <div className="text-[10px] leading-tight">
            <div style={{ color: "#F1F5FB" }}>
              From: <span style={{ color: "#E5B663" }}>Thầy Khương</span>
            </div>
            <div style={{ color: "rgba(241,245,251,0.55)" }}>Re: Chào mừng bạn</div>
          </div>
        </div>
        <span className="text-[9px]" style={{ color: "rgba(241,245,251,0.4)" }}>
          1/7
        </span>
      </div>
      <div className="space-y-1.5 pt-0.5">
        <div className="h-1.5 rounded-full" style={{ background: "rgba(241,245,251,0.22)", width: "92%" }} />
        <div className="h-1.5 rounded-full" style={{ background: "rgba(241,245,251,0.16)", width: "78%" }} />
        <div className="h-1.5 rounded-full" style={{ background: "rgba(229,182,99,0.35)", width: "45%" }} />
      </div>
    </div>
  );
}

function ZaloPreview() {
  const avatars = [
    { i: "NK", bg: "linear-gradient(135deg,#E5B663,#C9A86B)" },
    { i: "TH", bg: "linear-gradient(135deg,#7DD3FC,#3B82F6)" },
    { i: "AT", bg: "linear-gradient(135deg,#F472B6,#C9A86B)" },
    { i: "DN", bg: "linear-gradient(135deg,#34D399,#0EA5A4)" },
  ];
  return (
    <div
      className="h-full rounded-lg p-3 border flex items-center justify-between"
      style={{
        background: "#070C1A",
        borderColor: "rgba(229,182,99,0.18)",
      }}
    >
      <div className="flex items-center">
        {avatars.map((a, i) => (
          <div
            key={a.i}
            className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold relative"
            style={{
              background: a.bg,
              color: "#0A1020",
              border: "2px solid #070C1A",
              marginLeft: i === 0 ? 0 : -10,
              zIndex: 10 - i,
            }}
          >
            {a.i}
            {i === 0 && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                style={{
                  background: "#34D399",
                  border: "2px solid #070C1A",
                  boxShadow: "0 0 6px rgba(52,211,153,0.8)",
                }}
              />
            )}
          </div>
        ))}
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{
            background: "rgba(229,182,99,0.12)",
            color: "#E5B663",
            border: "2px solid #070C1A",
            marginLeft: -10,
          }}
        >
          +25
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px]" style={{ color: "#34D399" }}>
        <Circle size={6} fill="#34D399" />
        Online
      </div>
    </div>
  );
}

const PREVIEWS = [
  { node: <PromptPreview />, Icon: Sparkles },
  { node: <CodeEditorPreview />, Icon: Code2 },
  { node: <LmsPreview />, Icon: LayoutDashboard },
  { node: <CanvaPreview />, Icon: Palette },
  { node: <EmailPreview />, Icon: Mail },
  { node: <ZaloPreview />, Icon: Users },
];

export default function BonusSection({ onScrollToRegister }: BonusSectionProps) {
  return (
    <section
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(229,182,99,0.08) 0%, transparent 70%), #0A1020",
      }}
    >
      {/* Local keyframes for pulse glow on total card */}
      <style jsx>{`
        @keyframes bonusPulseGlow {
          0%, 100% {
            box-shadow: 0 0 30px rgba(229, 182, 99, 0.25),
              inset 0 0 30px rgba(229, 182, 99, 0.05);
            border-color: rgba(229, 182, 99, 0.45);
          }
          50% {
            box-shadow: 0 0 60px rgba(229, 182, 99, 0.55),
              inset 0 0 40px rgba(229, 182, 99, 0.1);
            border-color: rgba(229, 182, 99, 0.75);
          }
        }
        .bonus-total-glow {
          animation: bonusPulseGlow 3.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .bonus-total-glow {
            animation: none;
          }
        }
      `}</style>

      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold"
            style={{
              borderColor: "rgba(229,182,99,0.4)",
              background: "rgba(229,182,99,0.08)",
              color: "#E5B663",
            }}
          >
            <Gift size={12} /> Bonus Stack
          </span>
        </div>

        <h2
          className="mb-3 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          CHƯA HẾT! Đăng Ký Hôm Nay
          <br className="hidden sm:block" />
          <span className="block sm:inline mt-2 sm:mt-0">
            Nhận Ngay <span style={{ color: "#E5B663" }}>6 Bonus Trị Giá {TOTAL_BONUS_VALUE}</span>
          </span>
        </h2>

        <p
          className="mb-12 text-center text-[14px] sm:text-base leading-[1.7] max-w-3xl mx-auto"
          style={{ color: "rgba(241,245,251,0.65)" }}
        >
          Mỗi bonus đều có thể bán riêng ra ngoài — nhưng tôi tặng hết cho bạn.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {BONUSES.map((bonus, i) => {
            const preview = PREVIEWS[i];
            const Icon = preview.Icon;
            return (
              <div
                key={bonus.title}
                className="group relative rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:translate-y-[-3px] overflow-hidden flex flex-col"
                style={{
                  background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  border: "1px solid rgba(229,182,99,0.2)",
                }}
              >
                {/* Faint "free gift" stamp — top-left, doesn't compete with ribbon */}
                <div
                  className="pointer-events-none absolute -left-[52px] top-[14px] rotate-[-35deg] px-12 py-[3px] text-[9px] sm:text-[10px] uppercase tracking-[0.16em] font-bold"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(229,182,99,0.14), rgba(229,182,99,0.04))",
                    color: "rgba(244,217,168,0.65)",
                    border: "1px dashed rgba(229,182,99,0.28)",
                    opacity: 0.6,
                  }}
                >
                  Tặng kèm 100% miễn phí
                </div>

                {/* Bonus # ribbon */}
                <div
                  className="absolute top-0 right-5 px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold rounded-b-md z-10"
                  style={{
                    background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
                    color: "#0A1020",
                  }}
                >
                  Bonus #{i + 1}
                </div>

                <div className="flex items-center gap-2 mb-4 mt-2">
                  <span className="text-4xl leading-none">{bonus.icon}</span>
                  <span
                    className="inline-flex items-center justify-center h-7 w-7 rounded-lg"
                    style={{
                      background: "rgba(229,182,99,0.12)",
                      border: "1px solid rgba(229,182,99,0.3)",
                      color: "#E5B663",
                    }}
                    aria-hidden
                  >
                    <Icon size={14} />
                  </span>
                </div>

                <h3
                  className="text-[15px] sm:text-base font-bold tracking-[-0.005em] leading-[1.3] mb-3 text-white"
                >
                  {bonus.title}
                </h3>

                {/* Preview mockup — uniform height across all 6 cards */}
                <div className={`mb-4 ${PREVIEW_SHELL_CLASS}`}>{preview.node}</div>

                <p
                  className="text-[13.5px] sm:text-[14px] leading-[1.65] mb-5 flex-1"
                  style={{ color: "rgba(241,245,251,0.7)" }}
                >
                  {bonus.body}
                </p>

                <div
                  className="flex items-center justify-between pt-4 border-t"
                  style={{ borderColor: "rgba(229,182,99,0.15)" }}
                >
                  <span
                    className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em]"
                    style={{ color: "rgba(241,245,251,0.5)" }}
                  >
                    Giá trị
                  </span>
                  <span
                    className="text-base sm:text-lg font-extrabold tabular-nums"
                    style={{ color: "#E5B663" }}
                  >
                    {bonus.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total + CTA */}
        <div
          className="bonus-total-glow mt-12 rounded-2xl p-8 sm:p-10 text-center relative"
          style={{
            background:
              "linear-gradient(135deg, rgba(229,182,99,0.18) 0%, rgba(229,182,99,0.05) 100%)",
            border: "1px solid rgba(229,182,99,0.45)",
          }}
        >
          <div
            className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] mb-3"
            style={{ color: "#E5B663" }}
          >
            Tổng giá trị 6 Bonus
          </div>
          <div
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tabular-nums tracking-[-0.02em] mb-4"
            style={{
              background: "linear-gradient(135deg, #E5B663 0%, #F4D9A8 50%, #C9A86B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {TOTAL_BONUS_VALUE}
          </div>
          <p
            className="text-[14px] sm:text-base leading-[1.7] mb-6"
            style={{ color: "rgba(241,245,251,0.7)" }}
          >
            Tặng kèm 100% khi bạn đăng ký Early Bird hôm nay
          </p>

          <button
            onClick={onScrollToRegister}
            className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm sm:text-base font-bold tracking-wide transition-all hover:scale-[1.03] cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #E5B663 0%, #F4D9A8 50%, #C9A86B 100%)",
              color: "#0A1020",
              boxShadow: "0 0 30px rgba(229,182,99,0.4)",
            }}
          >
            <Crown size={16} />
            NHẬN BONUS NGAY — 10.000.000Đ
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
