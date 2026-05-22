"use client";

import {
  Camera,
  BarChart3,
  ShoppingBag,
  Layout,
  TrendingUp,
  Users,
  Receipt,
  Percent,
  Wallet,
  Play,
  CheckCircle2,
  Circle,
  type LucideIcon,
} from "lucide-react";

type Proof = {
  icon: LucideIcon;
  title: string;
  body: string;
  pill: string;
  mockup: "dashboard" | "orders" | "lms" | "revenue";
};

const PROOFS: Proof[] = [
  {
    icon: BarChart3,
    title: "Dashboard quản trị dangkhuong.com/admin",
    body: "310 học viên đang được track real-time. Mỗi học viên có XP riêng, level riêng. Hệ thống tự cấp khi họ hoàn thành bài học.",
    pill: "Real-time Analytics",
    mockup: "dashboard",
  },
  {
    icon: ShoppingBag,
    title: "Quản lý đơn hàng — SePay tự động",
    body: "Khách chuyển khoản qua SePay → hệ thống tự nhận diện, tự khớp đơn, tự cấp khóa học, tự gửi email. Tôi không phải làm gì cả.",
    pill: "100% Automation",
    mockup: "orders",
  },
  {
    icon: Layout,
    title: "LMS học viên — giao diện đẹp",
    body: "Sidebar đầy đủ module và bài học. Video YouTube embed. Mark complete tự động. Bookmark được. Comment trao đổi với nhau.",
    pill: "Premium UX",
    mockup: "lms",
  },
  {
    icon: TrendingUp,
    title: "Doanh thu 45 triệu / 7 ngày",
    body: "Kết quả 1 tuần đầu thử nghiệm với 300 data. Chưa chạy ads gì cả. Chỉ post Facebook cá nhân.",
    pill: "Validated Result",
    mockup: "revenue",
  },
];

const COMPARISON = [
  {
    option: "Thuê dev",
    initial: "50-500 triệu",
    monthly: "5-10 triệu",
    own: "❌ Phụ thuộc",
    bad: true,
  },
  {
    option: "Kajabi / Skool / Gumroad",
    initial: "0đ",
    monthly: "2,6 - 5 triệu",
    own: "❌ Thuê",
    bad: true,
  },
  {
    option: "Chương trình Thầy Khương",
    initial: "10.000.000đ",
    monthly: "~600K",
    own: "✅ 100%",
    bad: false,
  },
];

// Monospace / tabular numeric style for the dashboard feel
const MONO_FONT =
  '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace';
const TABULAR_NUM = "tabular-nums" as const;

/* ---------------- Mockup 1: Admin Dashboard ---------------- */

function Sparkline({
  points,
  color,
}: {
  points: number[];
  color: string;
}) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  const w = 70;
  const h = 22;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: "block" }}
    >
      <path d={area} fill={color} opacity={0.18} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.4} />
    </svg>
  );
}

function DashboardMockup({ Icon }: { Icon: LucideIcon }) {
  const kpis = [
    {
      label: "Doanh thu",
      value: "45.000.000đ",
      delta: "+12%",
      spark: [3, 5, 4, 7, 6, 9, 11],
      color: "#E5B663",
      Tag: Wallet,
    },
    {
      label: "Học viên",
      value: "310",
      delta: "+24",
      spark: [4, 5, 6, 8, 9, 11, 12],
      color: "#7DD3FC",
      Tag: Users,
    },
    {
      label: "Đơn hàng",
      value: "5",
      delta: "+2",
      spark: [2, 3, 4, 4, 6, 7, 9],
      color: "#34D399",
      Tag: Receipt,
    },
    {
      label: "Tỷ lệ CR",
      value: "15%",
      delta: "+2.1%",
      spark: [5, 6, 5, 7, 8, 7, 9],
      color: "#F4D9A8",
      Tag: Percent,
    },
  ];

  const activity = [
    { name: "Nguyễn Văn A", amount: "10tr", time: "2 phút trước", color: "#34D399" },
    { name: "Trần Thị B", amount: "10tr", time: "11 phút trước", color: "#7DD3FC" },
    { name: "Lê Hoàng C", amount: "10tr", time: "38 phút trước", color: "#E5B663" },
  ];

  return (
    <div
      className="relative w-full h-full p-3 sm:p-4 flex flex-col"
      style={{ fontFamily: MONO_FONT, fontVariantNumeric: TABULAR_NUM }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#F87171" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#E5B663" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#34D399" }}
          />
          <span
            className="ml-2 text-[9px] tracking-wider"
            style={{ color: "rgba(241,245,251,0.5)" }}
          >
            dangkhuong.com/admin
          </span>
        </div>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded"
          style={{
            background: "rgba(52,211,153,0.12)",
            color: "#34D399",
            fontWeight: 600,
          }}
        >
          ● LIVE
        </span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2">
        {kpis.map((k) => {
          const Tag = k.Tag;
          return (
            <div
              key={k.label}
              className="rounded-md p-2"
              style={{
                background: "rgba(5,9,19,0.55)",
                border: "1px solid rgba(229,182,99,0.12)",
              }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1">
                  <Tag size={9} style={{ color: k.color }} />
                  <span
                    className="text-[8.5px] uppercase tracking-wider"
                    style={{ color: "rgba(241,245,251,0.55)" }}
                  >
                    {k.label}
                  </span>
                </div>
                <span
                  className="text-[8.5px] font-bold"
                  style={{ color: "#34D399" }}
                >
                  {k.delta}
                </span>
              </div>
              <div className="flex items-end justify-between gap-1">
                <span
                  className="text-[11px] sm:text-[12px] font-bold leading-none"
                  style={{ color: "#F1F5FB" }}
                >
                  {k.value}
                </span>
                <Sparkline points={k.spark} color={k.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity */}
      <div
        className="rounded-md p-1.5 sm:p-2 flex-1"
        style={{
          background: "rgba(5,9,19,0.55)",
          border: "1px solid rgba(229,182,99,0.12)",
        }}
      >
        <div
          className="text-[8.5px] uppercase tracking-wider mb-1"
          style={{ color: "rgba(241,245,251,0.55)" }}
        >
          Hoạt động gần đây
        </div>
        <div className="space-y-1">
          {activity.map((a) => (
            <div
              key={a.name}
              className="flex items-center justify-between text-[9.5px] tabular-nums leading-tight"
              style={{ fontVariantNumeric: TABULAR_NUM }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0 flex items-center justify-center text-[7px] font-bold"
                  style={{ background: a.color, color: "#050913" }}
                >
                  {a.name.charAt(0)}
                </span>
                <span style={{ color: "#F1F5FB" }} className="truncate">
                  {a.name}
                </span>
                <span style={{ color: "rgba(241,245,251,0.45)" }}>•</span>
                <span style={{ color: "#E5B663", fontWeight: 600 }}>
                  {a.amount}
                </span>
              </div>
              <span style={{ color: "rgba(241,245,251,0.45)" }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Corner icon badge */}
      <CornerBadge Icon={Icon} />
    </div>
  );
}

/* ---------------- Mockup 2: Orders Table ---------------- */

function OrdersMockup({ Icon }: { Icon: LucideIcon }) {
  const orders = [
    { code: "#DK-1042", name: "Nguyễn Văn A", amount: "10.000.000đ", status: "Paid" },
    { code: "#DK-1041", name: "Trần Thị B", amount: "10.000.000đ", status: "Paid" },
    { code: "#DK-1040", name: "Lê Hoàng C", amount: "10.000.000đ", status: "Pending" },
    { code: "#DK-1039", name: "Phạm Minh D", amount: "10.000.000đ", status: "Paid" },
    { code: "#DK-1038", name: "Đỗ Thu E", amount: "10.000.000đ", status: "Paid" },
  ];

  return (
    <div
      className="relative w-full h-full p-3 sm:p-4 flex flex-col"
      style={{ fontFamily: MONO_FONT, fontVariantNumeric: TABULAR_NUM }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ShoppingBag size={11} style={{ color: "#E5B663" }} />
          <span
            className="text-[10px] sm:text-[11px] font-bold"
            style={{ color: "#F1F5FB" }}
          >
            Đơn hàng gần đây
          </span>
          <span style={{ color: "rgba(241,245,251,0.4)" }} className="text-[10px]">
            ·
          </span>
          <span
            className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              background: "rgba(125,211,252,0.12)",
              color: "#7DD3FC",
              fontWeight: 700,
            }}
          >
            SePay
          </span>
        </div>
        <span
          className="text-[9px]"
          style={{ color: "rgba(241,245,251,0.5)" }}
        >
          Tự khớp
        </span>
      </div>

      {/* Column header */}
      <div
        className="grid grid-cols-12 gap-2 px-2 py-1.5 rounded-t-md text-[8.5px] uppercase tracking-wider"
        style={{
          background: "rgba(5,9,19,0.7)",
          color: "rgba(241,245,251,0.5)",
          border: "1px solid rgba(229,182,99,0.12)",
        }}
      >
        <div className="col-span-3">Mã đơn</div>
        <div className="col-span-4">Khách hàng</div>
        <div className="col-span-3 text-right">Số tiền</div>
        <div className="col-span-2 text-right">Trạng thái</div>
      </div>

      {/* Rows */}
      <div
        className="flex-1 overflow-hidden rounded-b-md"
        style={{
          background: "rgba(5,9,19,0.55)",
          border: "1px solid rgba(229,182,99,0.12)",
          borderTop: "none",
        }}
      >
        {orders.map((o, i) => (
          <div
            key={o.code}
            className="grid grid-cols-12 gap-2 px-2 py-1.5 items-center text-[9.5px] sm:text-[10px]"
            style={{
              borderBottom:
                i < orders.length - 1
                  ? "1px solid rgba(229,182,99,0.06)"
                  : "none",
            }}
          >
            <div
              className="col-span-3 font-semibold"
              style={{ color: "#7DD3FC" }}
            >
              {o.code}
            </div>
            <div
              className="col-span-4 truncate"
              style={{ color: "#F1F5FB" }}
            >
              {o.name}
            </div>
            <div
              className="col-span-3 text-right font-bold"
              style={{ color: "#E5B663" }}
            >
              {o.amount}
            </div>
            <div className="col-span-2 text-right">
              <span
                className="inline-block text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                style={{
                  background:
                    o.status === "Paid"
                      ? "rgba(52,211,153,0.14)"
                      : "rgba(245,158,11,0.14)",
                  color: o.status === "Paid" ? "#34D399" : "#FBBF24",
                }}
              >
                {o.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <CornerBadge Icon={Icon} />
    </div>
  );
}

/* ---------------- Mockup 3: LMS Course Player ---------------- */

function LmsMockup({ Icon }: { Icon: LucideIcon }) {
  const modules = [
    { name: "Module 1: Foundation", progress: 100, done: true },
    { name: "Module 2: Setup hạ tầng", progress: 100, done: true },
    { name: "Module 3: Build LMS", progress: 60, done: false, active: true },
    { name: "Module 4: Marketing", progress: 0, done: false },
  ];

  return (
    <div
      className="relative w-full h-full p-3 sm:p-4 flex gap-2 sm:gap-3"
      style={{ fontFamily: MONO_FONT }}
    >
      {/* Sidebar */}
      <div
        className="w-[42%] rounded-md p-2 flex flex-col gap-1.5"
        style={{
          background: "rgba(5,9,19,0.6)",
          border: "1px solid rgba(229,182,99,0.12)",
        }}
      >
        <div
          className="text-[8.5px] uppercase tracking-wider mb-0.5"
          style={{ color: "rgba(241,245,251,0.5)" }}
        >
          Khóa học
        </div>
        {modules.map((m) => (
          <div
            key={m.name}
            className="rounded p-1.5"
            style={{
              background: m.active
                ? "rgba(229,182,99,0.1)"
                : "transparent",
              border: m.active
                ? "1px solid rgba(229,182,99,0.3)"
                : "1px solid transparent",
            }}
          >
            <div className="flex items-center gap-1 mb-1">
              {m.done ? (
                <CheckCircle2 size={9} style={{ color: "#34D399" }} />
              ) : (
                <Circle size={9} style={{ color: m.active ? "#E5B663" : "rgba(241,245,251,0.4)" }} />
              )}
              <span
                className="text-[8.5px] sm:text-[9px] font-semibold truncate"
                style={{
                  color: m.active
                    ? "#F4D9A8"
                    : m.done
                    ? "#F1F5FB"
                    : "rgba(241,245,251,0.6)",
                }}
              >
                {m.name}
              </span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(241,245,251,0.08)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${m.progress}%`,
                  background: m.done
                    ? "#34D399"
                    : m.active
                    ? "linear-gradient(90deg, #E5B663, #F4D9A8)"
                    : "rgba(241,245,251,0.2)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Video pane */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div
          className="text-[8.5px] uppercase tracking-wider"
          style={{ color: "rgba(241,245,251,0.5)" }}
        >
          Bài đang học
        </div>
        <div
          className="flex-1 rounded-md relative overflow-hidden flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, #050913 0%, #13203F 100%)",
            border: "1px solid rgba(229,182,99,0.18)",
          }}
        >
          {/* fake video grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(229,182,99,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(229,182,99,0.06) 1px, transparent 1px)",
              backgroundSize: "14px 14px",
            }}
          />
          <div
            className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(229,182,99,0.95)",
              boxShadow: "0 4px 20px rgba(229,182,99,0.45)",
            }}
          >
            <Play
              size={13}
              fill="#050913"
              style={{ color: "#050913", marginLeft: 1 }}
            />
          </div>
          {/* progress bar */}
          <div
            className="absolute left-2 right-2 bottom-1.5 h-0.5 rounded-full"
            style={{ background: "rgba(241,245,251,0.15)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: "38%", background: "#E5B663" }}
            />
          </div>
          <div
            className="absolute right-2 top-1.5 text-[8px] px-1.5 py-0.5 rounded"
            style={{
              background: "rgba(5,9,19,0.7)",
              color: "#F1F5FB",
              fontWeight: 600,
            }}
          >
            HD
          </div>
        </div>
        <div
          className="text-[9.5px] sm:text-[10.5px] font-bold leading-tight"
          style={{ color: "#F1F5FB" }}
        >
          Bài 3.1: Mua domain + Setup DNS
        </div>
        <button
          className="self-start text-[8.5px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1"
          style={{
            background: "linear-gradient(90deg, #E5B663, #C9A86B)",
            color: "#050913",
          }}
        >
          <CheckCircle2 size={10} /> Mark complete
        </button>
      </div>

      <CornerBadge Icon={Icon} />
    </div>
  );
}

/* ---------------- Mockup 4: Revenue Bar Chart ---------------- */

function RevenueMockup({ Icon }: { Icon: LucideIcon }) {
  // 7 days, values in millions, building up to 45M total
  const days = [
    { d: "T2", v: 3 },
    { d: "T3", v: 4 },
    { d: "T4", v: 5 },
    { d: "T5", v: 6.5 },
    { d: "T6", v: 8 },
    { d: "T7", v: 9 },
    { d: "CN", v: 9.5 },
  ];
  const yLabels = [10, 8, 6, 4, 2];
  const maxY = 10;

  return (
    <div
      className="relative w-full h-full p-3 sm:p-4 flex flex-col"
      style={{ fontFamily: MONO_FONT, fontVariantNumeric: TABULAR_NUM }}
    >
      {/* Top: floating total */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div
            className="text-[8.5px] uppercase tracking-wider"
            style={{ color: "rgba(241,245,251,0.55)" }}
          >
            7 ngày qua
          </div>
          <div
            className="text-[9.5px] sm:text-[10px]"
            style={{ color: "rgba(241,245,251,0.65)" }}
          >
            Doanh thu thật
          </div>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-md"
          style={{
            background:
              "linear-gradient(135deg, rgba(229,182,99,0.18), rgba(52,211,153,0.15))",
            border: "1px solid rgba(229,182,99,0.3)",
          }}
        >
          <TrendingUp size={11} style={{ color: "#34D399" }} />
          <span
            className="text-[10px] sm:text-[12px] font-extrabold"
            style={{ color: "#F4D9A8", letterSpacing: "-0.01em" }}
          >
            +45,000,000đ
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 flex gap-1.5 sm:gap-2 min-h-0">
        {/* Y axis */}
        <div className="flex flex-col justify-between text-[8px] py-1" style={{ color: "rgba(241,245,251,0.4)" }}>
          {yLabels.map((y) => (
            <span key={y}>{y}M</span>
          ))}
        </div>

        {/* Bars */}
        <div
          className="flex-1 relative flex items-end justify-between gap-1 sm:gap-1.5 pb-4"
          style={{
            borderLeft: "1px solid rgba(229,182,99,0.15)",
            borderBottom: "1px solid rgba(229,182,99,0.15)",
            paddingLeft: 4,
            paddingRight: 2,
          }}
        >
          {/* gridlines */}
          {yLabels.map((y, i) => (
            <div
              key={`g${y}`}
              className="absolute left-0 right-0"
              style={{
                top: `${(i / (yLabels.length - 1)) * 100}%`,
                height: 1,
                background: "rgba(241,245,251,0.05)",
              }}
            />
          ))}

          {days.map((day, i) => {
            const heightPct = (day.v / maxY) * 100;
            const isPeak = i === days.length - 1;
            return (
              <div
                key={day.d}
                className="relative flex-1 flex flex-col items-center justify-end h-full"
              >
                <div
                  className="w-full rounded-t relative"
                  style={{
                    height: `${heightPct}%`,
                    background: isPeak
                      ? "linear-gradient(180deg, #F4D9A8 0%, #E5B663 60%, #C9A86B 100%)"
                      : "linear-gradient(180deg, rgba(229,182,99,0.85) 0%, rgba(201,168,107,0.55) 100%)",
                    boxShadow: isPeak
                      ? "0 0 14px rgba(229,182,99,0.45)"
                      : "none",
                    minHeight: 2,
                  }}
                >
                  {isPeak && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-bold whitespace-nowrap"
                      style={{ color: "#F4D9A8" }}
                    >
                      9.5M
                    </span>
                  )}
                </div>
                <span
                  className="absolute -bottom-3.5 text-[8.5px]"
                  style={{
                    color: isPeak ? "#E5B663" : "rgba(241,245,251,0.55)",
                    fontWeight: isPeak ? 700 : 500,
                  }}
                >
                  {day.d}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <CornerBadge Icon={Icon} />
    </div>
  );
}

/* ---------------- Corner badge shared by all mockups ---------------- */

function CornerBadge({ Icon }: { Icon: LucideIcon }) {
  return (
    <div
      className="absolute top-2 right-2 h-5 w-5 sm:h-6 sm:w-6 rounded-md flex items-center justify-center"
      style={{
        background: "rgba(229,182,99,0.12)",
        border: "1px solid rgba(229,182,99,0.3)",
        backdropFilter: "blur(4px)",
      }}
    >
      <Icon size={11} style={{ color: "#E5B663" }} />
    </div>
  );
}

/* ---------------- Mockup dispatcher ---------------- */

function ProofMockup({
  kind,
  Icon,
}: {
  kind: Proof["mockup"];
  Icon: LucideIcon;
}) {
  switch (kind) {
    case "dashboard":
      return <DashboardMockup Icon={Icon} />;
    case "orders":
      return <OrdersMockup Icon={Icon} />;
    case "lms":
      return <LmsMockup Icon={Icon} />;
    case "revenue":
      return <RevenueMockup Icon={Icon} />;
  }
}

/* ---------------- Section ---------------- */

export default function ProofSection() {
  return (
    <section
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{ background: "#050913" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold"
            style={{
              borderColor: "rgba(125,211,252,0.3)",
              background: "rgba(125,211,252,0.06)",
              color: "#7DD3FC",
            }}
          >
            <Camera size={12} /> Bằng Chứng Thật
          </span>
        </div>

        <h2
          className="mb-3 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          Đây Không Phải Lý Thuyết
        </h2>
        <p
          className="mb-12 text-center text-[15px] sm:text-base italic leading-[1.65]"
          style={{ color: "rgba(241,245,251,0.65)" }}
        >
          Đây là hệ thống đang chạy thật ngay lúc này.
        </p>

        {/* Proof grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {PROOFS.map((proof) => {
            const Icon = proof.icon;
            return (
              <div
                key={proof.title}
                className="relative rounded-2xl p-6 sm:p-7 overflow-hidden flex flex-col"
                style={{
                  background:
                    "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  border: "1px solid rgba(229,182,99,0.15)",
                }}
              >
                {/* Mock screenshot frame */}
                <div
                  className="aspect-video rounded-xl mb-5 overflow-hidden relative"
                  style={{
                    background:
                      "linear-gradient(135deg, #0E1730 0%, #050913 100%)",
                    border: "1px solid rgba(229,182,99,0.18)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 28px rgba(0,0,0,0.45)",
                  }}
                >
                  <ProofMockup kind={proof.mockup} Icon={Icon} />
                </div>

                <span
                  className="inline-flex items-center self-start h-6 text-[10px] font-bold uppercase tracking-[0.18em] px-2.5 rounded mb-3"
                  style={{
                    background: "rgba(229,182,99,0.1)",
                    color: "#E5B663",
                  }}
                >
                  {proof.pill}
                </span>
                <h3
                  className="text-base sm:text-lg font-bold tracking-[-0.005em] mb-2"
                  style={{ color: "#F1F5FB" }}
                >
                  {proof.title}
                </h3>
                <p
                  className="text-[13.5px] sm:text-[14.5px] leading-[1.7]"
                  style={{ color: "rgba(241,245,251,0.72)" }}
                >
                  {proof.body}
                </p>
              </div>
            );
          })}
        </div>

        {/* Comparison table */}
        <div className="mt-14">
          <h3
            className="text-center text-lg sm:text-xl font-bold"
            style={{ color: "#F1F5FB" }}
          >
            So sánh chi phí
          </h3>
          <div
            className="overflow-hidden rounded-2xl mt-6"
            style={{
              background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
              border: "1px solid rgba(229,182,99,0.18)",
            }}
          >
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-[560px] text-left"
                style={{ fontVariantNumeric: TABULAR_NUM }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(229,182,99,0.15)" }}>
                    <th
                      className="px-5 py-4 sm:py-5 text-[11px] sm:text-xs uppercase tracking-[0.14em] font-bold"
                      style={{ color: "rgba(241,245,251,0.6)" }}
                    >
                      Phương án
                    </th>
                    <th
                      className="px-5 py-4 sm:py-5 text-[11px] sm:text-xs uppercase tracking-[0.14em] font-bold"
                      style={{ color: "rgba(241,245,251,0.6)" }}
                    >
                      Chi phí ban đầu
                    </th>
                    <th
                      className="px-5 py-4 sm:py-5 text-[11px] sm:text-xs uppercase tracking-[0.14em] font-bold"
                      style={{ color: "rgba(241,245,251,0.6)" }}
                    >
                      Hàng tháng
                    </th>
                    <th
                      className="px-5 py-4 sm:py-5 text-[11px] sm:text-xs uppercase tracking-[0.14em] font-bold"
                      style={{ color: "rgba(241,245,251,0.6)" }}
                    >
                      Sở hữu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, idx) => (
                    <tr
                      key={row.option}
                      style={{
                        borderBottom:
                          idx < COMPARISON.length - 1
                            ? "1px solid rgba(229,182,99,0.08)"
                            : "none",
                        background: !row.bad
                          ? "rgba(229,182,99,0.06)"
                          : "transparent",
                      }}
                    >
                      <td
                        className="px-5 py-4 sm:py-5 text-[14px] sm:text-[15px] tabular-nums font-semibold"
                        style={{
                          color: !row.bad ? "#E5B663" : "rgba(241,245,251,0.8)",
                        }}
                      >
                        {row.option}
                      </td>
                      <td
                        className="px-5 py-4 sm:py-5 text-[14px] sm:text-[15px] tabular-nums"
                        style={{ color: "rgba(241,245,251,0.78)" }}
                      >
                        {row.initial}
                      </td>
                      <td
                        className="px-5 py-4 sm:py-5 text-[14px] sm:text-[15px] tabular-nums"
                        style={{ color: "rgba(241,245,251,0.78)" }}
                      >
                        {row.monthly}
                      </td>
                      <td
                        className="px-5 py-4 sm:py-5 text-[14px] sm:text-[15px] tabular-nums font-semibold"
                        style={{ color: !row.bad ? "#34D399" : "#F87171" }}
                      >
                        {row.own}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
