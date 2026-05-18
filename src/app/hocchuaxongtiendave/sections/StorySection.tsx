"use client";

import {
  BookOpen,
  TrendingUp,
  Check,
  MoveRight,
  Clock,
  X,
  Users,
  CalendarDays,
  Bot,
  Wallet,
} from "lucide-react";

const SYSTEM_FEATURES = [
  "Dashboard tổng quan — xem doanh thu, học viên, đơn hàng real-time",
  "Quản lý khóa học — cấp quyền học tự động sau thanh toán",
  "Quản lý 310+ học viên với XP/Level tracking",
  "Quản lý đơn hàng + mã giảm giá",
  "Quiz cho học viên + Blog SEO để kéo traffic từ Google",
  "Email marketing + Automation đầy đủ",
  "CRM doanh số + Pipeline bán hàng",
  "Quản lý hiệu suất sale + nguồn khách",
  "Khu vực xử lý câu hỏi học viên",
];

const THEN_ITEMS = [
  "~1 tỷ chi phí",
  "1 năm chờ đợi",
  "Website lỗi liên tục",
  "Dự án thất bại",
];

const NOW_ITEMS = [
  "~$200 chi phí",
  "1 tuần hoàn thiện",
  "Sửa lúc nào cũng được",
  "45tr / tuần",
];

const TOOLS = ["Claude Code", "Supabase", "Vercel", "SePay", "Resend"];

// Sparkline patterns — relative heights in %.
const SPARKS: Record<string, number[]> = {
  revenue: [18, 26, 22, 38, 44, 58, 72, 86, 100],
  students: [30, 34, 42, 50, 58, 64, 78, 90, 100],
  days: [100, 90, 78, 66, 54, 42, 30, 20, 10],
  auto: [60, 70, 65, 80, 85, 92, 96, 100, 100],
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  return (
    <div className="flex items-end gap-[3px] h-8 mt-2" aria-hidden>
      {data.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-[2px]"
          style={{
            height: `${h}%`,
            background: `linear-gradient(180deg, ${color} 0%, ${color}33 100%)`,
            minHeight: "3px",
          }}
        />
      ))}
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon,
  spark,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  spark: number[];
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{
        background: "linear-gradient(180deg, #13203F 0%, #0B1428 100%)",
        border: "1px solid rgba(229,182,99,0.18)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] uppercase tracking-[0.16em] font-semibold"
          style={{ color: "rgba(241,245,251,0.6)" }}
        >
          {label}
        </span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${color}22`, color }}
        >
          {icon}
        </span>
      </div>
      <div className="text-lg sm:text-xl font-extrabold" style={{ color: "#F1F5FB" }}>
        {value}
      </div>
      <Sparkline data={spark} color={color} />
    </div>
  );
}

export default function StorySection() {
  return (
    <section
      className="relative overflow-hidden py-14 sm:py-24 md:py-32 px-4 sm:px-6"
      style={{
        background:
          "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(229,182,99,0.06) 0%, transparent 70%), #050913",
      }}
    >
      <div className="mx-auto max-w-4xl">
        {/* Tag */}
        <div className="text-center mb-5">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{
              borderColor: "rgba(229,182,99,0.3)",
              background: "rgba(229,182,99,0.06)",
              color: "#E5B663",
            }}
          >
            <BookOpen size={12} /> Câu Chuyện Có Thật
          </span>
        </div>

        <h2
          className="mb-6 text-center text-[26px] font-extrabold leading-tight sm:text-3xl md:text-4xl lg:text-[44px]"
          style={{ color: "#F1F5FB", letterSpacing: "-0.01em" }}
        >
          10 Năm Trước, Tôi Đốt Gần{" "}
          <span style={{ color: "#E5B663" }}>1 Tỷ Đồng</span> Thuê Dev...
        </h2>

        <p
          className="mb-12 sm:mb-16 text-center text-base sm:text-lg italic"
          style={{ color: "rgba(241,245,251,0.65)" }}
        >
          Bây giờ tôi tự làm trong 1 tuần. Đây là cách.
        </p>

        {/* Story body */}
        <div className="space-y-5 text-[15px] sm:text-base leading-[1.85]" style={{ color: "rgba(241,245,251,0.78)" }}>
          <p>
            Tôi vẫn nhớ rõ ngày đó — cách đây khoảng 10 năm. Tôi có ý tưởng xây hệ thống bán khóa học online: website riêng, khu học viên, quản lý đơn hàng, thanh toán, cấp khóa tự động, chăm sóc khách hàng.
          </p>
          <p>
            Tôi thuê một đội dev. Họ báo giá 100 triệu. Tôi gật đầu. 3 tháng trôi qua vẫn chưa chạy nổi. Thêm 3 tháng nữa, mua thêm phần mềm này, chức năng kia, mua cả server vì sợ bị hack…
          </p>

          {/* Pull quote */}
          <div
            className="my-8 rounded-2xl p-6 sm:p-8"
            style={{
              background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderLeft: "4px solid #E63946",
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold mb-1" style={{ color: "#F87171" }}>
                  ~1 Tỷ
                </div>
                <div className="text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(241,245,251,0.55)" }}>
                  Tổng chi phí
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold mb-1" style={{ color: "#F87171" }}>
                  ~1 Năm
                </div>
                <div className="text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(241,245,251,0.55)" }}>
                  Thời gian làm
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold mb-1" style={{ color: "#F87171" }}>
                  Thất bại
                </div>
                <div className="text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(241,245,251,0.55)" }}>
                  Kết quả cuối
                </div>
              </div>
            </div>
          </div>

          {/* === NEW: Then vs Now timeline === */}
          <div className="my-10 sm:my-12">
            <div className="text-center mb-6">
              <span
                className="inline-block text-[11px] uppercase tracking-[0.22em] font-semibold"
                style={{ color: "rgba(241,245,251,0.55)" }}
              >
                So sánh trực tiếp
              </span>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 md:gap-4 items-stretch">
              {/* THEN column */}
              <div
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(230,57,70,0.18) 0%, rgba(230,57,70,0.04) 100%)",
                  border: "1px solid rgba(230,57,70,0.35)",
                }}
              >
                <div
                  className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                  style={{ color: "#F87171" }}
                >
                  2014 – 2024
                </div>
                <div className="text-lg sm:text-xl font-extrabold mb-4" style={{ color: "#F1F5FB" }}>
                  Thuê Dev
                </div>
                <ul className="space-y-2.5">
                  {THEN_ITEMS.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-[14px]" style={{ color: "rgba(241,245,251,0.85)" }}>
                      <span
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: "rgba(230,57,70,0.18)",
                          border: "1px solid rgba(230,57,70,0.4)",
                        }}
                      >
                        <X className="h-3 w-3" strokeWidth={3} style={{ color: "#F87171" }} />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Arrow (desktop) */}
              <div className="hidden md:flex items-center justify-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(229,182,99,0.15)",
                    border: "1px solid rgba(229,182,99,0.4)",
                    boxShadow: "0 0 24px rgba(229,182,99,0.25)",
                  }}
                >
                  <MoveRight size={22} style={{ color: "#E5B663" }} />
                </div>
              </div>

              {/* Arrow (mobile) */}
              <div className="md:hidden flex items-center justify-center">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(229,182,99,0.15)",
                    border: "1px solid rgba(229,182,99,0.4)",
                    transform: "rotate(90deg)",
                  }}
                >
                  <MoveRight size={18} style={{ color: "#E5B663" }} />
                </div>
              </div>

              {/* NOW column */}
              <div
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(229,182,99,0.22) 0%, rgba(229,182,99,0.05) 100%)",
                  border: "1px solid rgba(229,182,99,0.45)",
                  boxShadow: "0 0 32px rgba(229,182,99,0.08)",
                }}
              >
                <div
                  className="text-[10px] uppercase tracking-[0.22em] font-bold mb-1"
                  style={{ color: "#E5B663" }}
                >
                  2025
                </div>
                <div className="text-lg sm:text-xl font-extrabold mb-4" style={{ color: "#F1F5FB" }}>
                  Claude Code
                </div>
                <ul className="space-y-2.5">
                  {NOW_ITEMS.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-[14px]" style={{ color: "rgba(241,245,251,0.92)" }}>
                      <span
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: "rgba(52,211,153,0.18)",
                          border: "1px solid rgba(52,211,153,0.4)",
                        }}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#34D399" }} />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <p>
            Muốn sửa một cái nút — phải nhắn dev, chờ phản hồi, chờ báo giá, chờ sửa. Một việc nhỏ mất cả tuần. Cảm giác lúc đó là:{" "}
            <em className="text-white">tôi có ý tưởng — nhưng bị KẸT bởi công nghệ</em>. Website lỗi liên tục, học viên không học được, không dám bán. Tôi thất bại ở dự án mình ấp ủ nhiều năm chỉ vì website lỗi.
          </p>

          <p className="text-lg sm:text-xl font-semibold pt-4" style={{ color: "#E5B663" }}>
            Nhưng rồi 2025 đến — AI Agent xuất hiện. Và mọi thứ thay đổi.
          </p>

          <p>
            Tôi thử nói chuyện với Claude. Yêu cầu nó viết code. Yêu cầu nó xây giao diện. Yêu cầu nó làm dashboard. Và nó làm được. <strong className="text-white">TẤT CẢ.</strong>
          </p>
          <p>
            Tôi vừa làm việc khác, vừa cà phê, vừa đọc sách — em nó tự code hết. Tôi chỉ ngồi nói chuyện, test một chút, vài chỗ chưa ưng thì bảo nó sửa.
          </p>

          {/* === NEW: Hero stat card with clock icon === */}
          <div
            className="my-6 rounded-2xl p-5 sm:p-7 flex items-center gap-4 sm:gap-5"
            style={{
              background:
                "linear-gradient(135deg, rgba(229,182,99,0.18) 0%, rgba(229,182,99,0.04) 100%)",
              border: "1px solid rgba(229,182,99,0.4)",
              boxShadow:
                "0 0 40px rgba(229,182,99,0.12), inset 0 1px 0 rgba(244,217,168,0.15)",
            }}
          >
            <div
              className="flex-shrink-0 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl"
              style={{
                background: "rgba(229,182,99,0.22)",
                border: "1px solid rgba(229,182,99,0.4)",
              }}
            >
              <Clock size={26} style={{ color: "#F4D9A8" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-1"
                style={{ color: "#E5B663" }}
              >
                Khoảnh khắc thay đổi
              </div>
              <div
                className="text-lg sm:text-2xl md:text-[28px] font-extrabold leading-tight"
                style={{ color: "#F4D9A8", letterSpacing: "-0.01em" }}
              >
                1 TUẦN SAU TÔI CÓ HỆ THỐNG HOÀN CHỈNH
              </div>
            </div>
          </div>
        </div>

        {/* System features */}
        <div
          className="mt-10 rounded-2xl p-6 sm:p-8"
          style={{
            background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
            border: "1px solid rgba(229,182,99,0.18)",
          }}
        >
          <h3 className="text-base sm:text-lg font-bold mb-5 text-white">
            Hệ thống của tôi bây giờ có gì?
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SYSTEM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <span
                  className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#34D399" }} />
                </span>
                <span className="text-[14px] sm:text-[15px] leading-[1.6]" style={{ color: "rgba(241,245,251,0.82)" }}>
                  {f}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* === NEW: Dashboard mockup === */}
        <div
          className="mt-8 rounded-2xl p-5 sm:p-7"
          style={{
            background: "linear-gradient(180deg, #0E1730 0%, #050913 100%)",
            border: "1px solid rgba(229,182,99,0.22)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          {/* Browser chrome */}
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: "1px solid rgba(229,182,99,0.12)" }}>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#E63946" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#E5B663" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#34D399" }} />
            </div>
            <div
              className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: "#E5B663" }}
            >
              Dashboard · Doanh Thu Tuần
            </div>
            <div className="w-12" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiTile
              label="Doanh Thu"
              value="45.000.000đ"
              icon={<Wallet size={14} />}
              spark={SPARKS.revenue}
              color="#E5B663"
            />
            <KpiTile
              label="Học Viên"
              value="310"
              icon={<Users size={14} />}
              spark={SPARKS.students}
              color="#7DD3FC"
            />
            <KpiTile
              label="Số Ngày"
              value="7"
              icon={<CalendarDays size={14} />}
              spark={SPARKS.days}
              color="#F4D9A8"
            />
            <KpiTile
              label="Tự Động"
              value="100%"
              icon={<Bot size={14} />}
              spark={SPARKS.auto}
              color="#34D399"
            />
          </div>

          <div
            className="mt-4 text-center text-[11px] italic"
            style={{ color: "rgba(241,245,251,0.45)" }}
          >
            Ảnh chụp dashboard thật — số liệu tuần thử nghiệm
          </div>
        </div>

        {/* Result highlight */}
        <div
          className="mt-8 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 sm:gap-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(229,182,99,0.15) 0%, rgba(229,182,99,0.04) 100%)",
            border: "1px solid rgba(229,182,99,0.35)",
          }}
        >
          <div className="flex-shrink-0">
            <div
              className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl"
              style={{ background: "rgba(229,182,99,0.2)" }}
            >
              <TrendingUp size={36} style={{ color: "#E5B663" }} />
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: "#E5B663" }}>
              Kết quả thực tế
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              45 TRIỆU doanh thu / 1 TUẦN
            </div>
            <p className="text-sm sm:text-[15px] leading-[1.7]" style={{ color: "rgba(241,245,251,0.75)" }}>
              Thử nghiệm với 300 data khách hàng, chưa đẩy mạnh marketing. Hệ thống tự vận hành — tôi đi cà phê, đọc sách, đi tập, mà tiền vẫn về.
            </p>
          </div>
        </div>

        {/* === NEW: Tools pill row === */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <span
            className="text-[10px] uppercase tracking-[0.2em] font-semibold mr-1"
            style={{ color: "rgba(241,245,251,0.5)" }}
          >
            Built with
          </span>
          {TOOLS.map((tool) => (
            <span
              key={tool}
              className="inline-flex items-center rounded-full px-3.5 py-1.5 text-[12px] sm:text-[13px] font-semibold"
              style={{
                background: "linear-gradient(180deg, #13203F 0%, #0B1428 100%)",
                border: "1px solid rgba(229,182,99,0.35)",
                color: "#F4D9A8",
                boxShadow: "inset 0 1px 0 rgba(244,217,168,0.08)",
              }}
            >
              {tool}
            </span>
          ))}
        </div>

        {/* === NEW: Cost comparison mini-bar === */}
        <div
          className="mt-10 rounded-2xl p-5 sm:p-7"
          style={{
            background: "linear-gradient(180deg, #0E1730 0%, #050913 100%)",
            border: "1px solid rgba(229,182,99,0.18)",
          }}
        >
          <div className="text-center mb-5">
            <div
              className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-1"
              style={{ color: "#E5B663" }}
            >
              Chi phí xây hệ thống
            </div>
            <div className="text-base sm:text-lg font-bold" style={{ color: "#F1F5FB" }}>
              Khi xưa vs Bây giờ
            </div>
          </div>

          <div className="space-y-4">
            {/* THEN bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#F87171" }}>
                  Khi xưa · Thuê Dev
                </span>
                <span className="text-sm sm:text-base font-extrabold" style={{ color: "#F87171" }}>
                  1.000.000.000đ
                </span>
              </div>
              <div className="flex items-center">
                <div
                  className="h-7 sm:h-8 rounded-r-lg flex items-center justify-end pr-3"
                  style={{
                    width: "100%",
                    background:
                      "linear-gradient(90deg, rgba(230,57,70,0.7) 0%, rgba(230,57,70,0.3) 100%)",
                    border: "1px solid rgba(230,57,70,0.4)",
                    borderLeft: "none",
                  }}
                >
                  <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/80">
                    100%
                  </span>
                </div>
              </div>
            </div>

            {/* NOW bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#E5B663" }}>
                  Bây giờ · Claude Code
                </span>
                <span className="text-sm sm:text-base font-extrabold" style={{ color: "#E5B663" }}>
                  ~5.000.000đ
                </span>
              </div>
              <div className="flex items-center">
                <div
                  className="h-7 sm:h-8 rounded-r-lg flex items-center justify-end pr-2"
                  style={{
                    width: "0.5%",
                    minWidth: "12px",
                    background:
                      "linear-gradient(90deg, #E5B663 0%, #F4D9A8 100%)",
                    border: "1px solid rgba(229,182,99,0.5)",
                    borderLeft: "none",
                    boxShadow: "0 0 16px rgba(229,182,99,0.4)",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className="mt-5 text-center text-[12px] sm:text-[13px] italic"
            style={{ color: "rgba(241,245,251,0.6)" }}
          >
            Rẻ hơn <span style={{ color: "#E5B663", fontWeight: 700 }}>200 lần</span> — và nhanh hơn 50 lần.
          </div>
        </div>

        <p
          className="mt-10 text-center text-lg sm:text-xl font-semibold"
          style={{ color: "rgba(241,245,251,0.9)" }}
        >
          Nếu tôi làm được — <span style={{ color: "#E5B663" }}>bạn cũng làm được.</span>
        </p>
      </div>
    </section>
  );
}
