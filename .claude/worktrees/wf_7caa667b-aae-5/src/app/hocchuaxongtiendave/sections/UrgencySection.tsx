"use client";

import { useEffect, useState } from "react";
import { Clock, Flame, ArrowRight, Crown, TrendingDown, AlertTriangle } from "lucide-react";

interface UrgencySectionProps {
  onScrollToRegister?: () => void;
}

const SEATS_TOTAL = 100;
const SEATS_TAKEN = 20;
const SEATS_LEFT = SEATS_TOTAL - SEATS_TAKEN;

// 20 fake registered users (initial + color) — stable order
const AVATARS: { initial: string; bg: string }[] = [
  { initial: "N", bg: "#E5B663" },
  { initial: "T", bg: "#34D399" },
  { initial: "L", bg: "#F87171" },
  { initial: "P", bg: "#60A5FA" },
  { initial: "H", bg: "#C9A86B" },
  { initial: "V", bg: "#A78BFA" },
  { initial: "Đ", bg: "#FB923C" },
  { initial: "M", bg: "#22D3EE" },
  { initial: "Q", bg: "#F472B6" },
  { initial: "B", bg: "#E5B663" },
  { initial: "C", bg: "#34D399" },
  { initial: "K", bg: "#F87171" },
  { initial: "A", bg: "#60A5FA" },
  { initial: "D", bg: "#C9A86B" },
  { initial: "G", bg: "#A78BFA" },
  { initial: "S", bg: "#FB923C" },
  { initial: "U", bg: "#22D3EE" },
  { initial: "X", bg: "#F472B6" },
  { initial: "Y", bg: "#E5B663" },
  { initial: "Z", bg: "#34D399" },
];

// Live activity feed entries
const FEED: { text: string; sub: string }[] = [
  { text: "Nguyễn V.A vừa đăng ký", sub: "2 phút trước" },
  { text: "Trần T.H vừa đăng ký", sub: "7 phút trước" },
  { text: "Lê M.D đang xem trang này", sub: "ngay bây giờ" },
  { text: "Phạm Q.K vừa đăng ký", sub: "12 phút trước" },
];

// 3 days from "now" client-side, recalculated only at first mount
function useCountdown() {
  const [time, setTime] = useState({ d: 3, h: 14, m: 27, s: 15 });

  useEffect(() => {
    const target = new Date();
    target.setDate(target.getDate() + 3);
    target.setHours(target.getHours() + 14);
    target.setMinutes(target.getMinutes() + 27);
    target.setSeconds(target.getSeconds() + 15);

    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setTime({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTime({ d, h, m, s });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

// Independent rotating live feed index — 4s interval, fade transition
function useLiveFeed(length: number) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      // fade out, swap, fade in
      setVisible(false);
      const fadeId = setTimeout(() => {
        setIdx((p) => (p + 1) % length);
        setVisible(true);
      }, 400);
      return () => clearTimeout(fadeId);
    }, 4000);
    return () => clearInterval(id);
  }, [length]);

  return { idx, visible };
}

export default function UrgencySection({ onScrollToRegister }: UrgencySectionProps) {
  const t = useCountdown();
  const { idx, visible } = useLiveFeed(FEED.length);
  const pct = Math.round((SEATS_TAKEN / SEATS_TOTAL) * 100);
  const current = FEED[idx];

  return (
    <section
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{ background: "#0A1020" }}
    >
      {/* Local CSS keyframes for pulse, fade, sticker wobble */}
      <style>{`
        @keyframes urgPulse {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(230, 57, 70, 0.55); }
          50% { transform: scale(1.15); opacity: 0.85; box-shadow: 0 0 0 8px rgba(230, 57, 70, 0); }
        }
        @keyframes urgPulseRing {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes urgFeedIn {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes urgWobble {
          0%, 100% { transform: rotate(-6deg) scale(1); }
          50% { transform: rotate(-4deg) scale(1.03); }
        }
        @keyframes urgStripPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(230, 57, 70, 0); border-color: rgba(230, 57, 70, 0.45); }
          50% { box-shadow: 0 0 18px 0 rgba(230, 57, 70, 0.35); border-color: rgba(230, 57, 70, 0.85); }
        }
      `}</style>

      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{
              borderColor: "rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.08)",
              color: "#F87171",
            }}
          >
            <Flame size={12} /> Khan Hiếm + Khẩn Cấp
          </span>
        </div>

        <h2
          className="mb-8 sm:mb-10 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          Tại Sao Phải <span style={{ color: "#E5B663" }}>Quyết Định Ngay?</span>
        </h2>

        {/* 3 reasons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Seats counter */}
          <div
            className="rounded-2xl p-5 sm:p-7"
            style={{
              background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
              border: "1px solid rgba(229,182,99,0.25)",
            }}
          >
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] mb-3 font-semibold" style={{ color: "#E5B663" }}>
              🔥 Lý do 1: Giá Early Bird
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
              Chỉ áp dụng cho 100 suất đầu tiên
            </h3>

            <div className="mb-3 flex items-center justify-between text-sm">
              <span style={{ color: "rgba(241,245,251,0.7)" }}>
                Đã đăng ký: <strong className="text-white tabular-nums">{SEATS_TAKEN}/{SEATS_TOTAL}</strong>
              </span>
              <span className="font-bold tabular-nums" style={{ color: "#E5B663" }}>
                Còn {SEATS_LEFT} suất
              </span>
            </div>

            <div
              className="h-2.5 w-full overflow-hidden rounded-full mb-4"
              style={{ background: "rgba(229,182,99,0.12)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #E5B663 0%, #F4D9A8 100%)",
                }}
              />
            </div>

            {/* Avatar pile — 20 already registered */}
            <div className="mb-3">
              <div
                className="text-[10px] uppercase tracking-[0.14em] mb-2 font-semibold"
                style={{ color: "rgba(241,245,251,0.6)" }}
              >
                20 người đã đăng ký
              </div>
              <div className="flex items-center flex-wrap">
                {AVATARS.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center rounded-full text-[10px] sm:text-[11px] font-bold"
                    style={{
                      width: 26,
                      height: 26,
                      marginLeft: i === 0 ? 0 : -8,
                      background: a.bg,
                      color: "#0A1020",
                      border: "2px solid #0E1730",
                      zIndex: AVATARS.length - i,
                      position: "relative",
                    }}
                  >
                    {a.initial}
                  </div>
                ))}
                <span
                  className="ml-3 text-[12px] font-semibold tabular-nums"
                  style={{ color: "rgba(241,245,251,0.7)" }}
                >
                  + 80 chỗ trống
                </span>
              </div>
            </div>

            <p className="text-[13px] sm:text-[14px] leading-[1.7]" style={{ color: "rgba(241,245,251,0.65)" }}>
              Sau khi đủ 100 suất — giá trở về <strong className="text-white">20.000.000đ</strong> (gấp đôi).
            </p>
          </div>

          {/* Live activity feed (between reason 1 and reason 2) */}
          <div
            className="rounded-2xl p-5 sm:p-7 flex flex-col justify-between"
            style={{
              background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
              border: "1px solid rgba(52,211,153,0.22)",
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: "#34D399" }}>
                  Hoạt động trực tiếp
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex">
                    <span
                      className="absolute inline-flex h-2.5 w-2.5 rounded-full"
                      style={{
                        background: "#34D399",
                        animation: "urgPulseRing 1.4s ease-out infinite",
                      }}
                    />
                    <span
                      className="relative inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ background: "#34D399" }}
                    />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: "#34D399" }}>
                    Live
                  </span>
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
                Đang có nhiều người quan tâm
              </h3>

              <div
                className="rounded-xl p-4 min-h-[78px] flex items-center"
                style={{
                  background: "rgba(52,211,153,0.06)",
                  border: "1px solid rgba(52,211,153,0.18)",
                }}
              >
                <div
                  key={idx}
                  className="w-full tabular-nums"
                  style={{
                    opacity: visible ? 1 : 0,
                    transition: "opacity 380ms ease",
                    animation: visible ? "urgFeedIn 380ms ease both" : undefined,
                  }}
                >
                  <div className="text-[14px] sm:text-[15px] font-semibold text-white leading-snug">
                    🔥 {current.text}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "rgba(241,245,251,0.6)" }}>
                    · {current.sub}
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[12px] leading-[1.6]" style={{ color: "rgba(241,245,251,0.55)" }}>
              Số liệu cập nhật mỗi vài giây từ form đăng ký.
            </p>
          </div>

          {/* Countdown — full width on its row */}
          <div
            className="rounded-2xl p-5 sm:p-7 md:col-span-2 relative"
            style={{
              background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            {/* Pulsing LIVE badge top-right */}
            <div
              className="absolute top-4 right-4 flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{
                background: "rgba(230,57,70,0.12)",
                border: "1px solid rgba(230,57,70,0.4)",
              }}
            >
              <span className="relative inline-flex">
                <span
                  className="absolute inline-flex h-2.5 w-2.5 rounded-full"
                  style={{
                    background: "#E63946",
                    animation: "urgPulseRing 1.2s ease-out infinite",
                  }}
                />
                <span
                  className="relative inline-flex h-2.5 w-2.5 rounded-full"
                  style={{
                    background: "#E63946",
                    animation: "urgPulse 1.2s ease-in-out infinite",
                  }}
                />
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: "#F87171" }}>
                LIVE · Còn lại
              </span>
            </div>

            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] mb-3 font-semibold" style={{ color: "#F87171" }}>
              🔥 Lý do 2: Countdown đóng đăng ký
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock size={20} style={{ color: "#F87171" }} /> Còn lại:
            </h3>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { val: t.d, label: "Ngày" },
                { val: t.h, label: "Giờ" },
                { val: t.m, label: "Phút" },
                { val: t.s, label: "Giây" },
              ].map((u) => (
                <div
                  key={u.label}
                  className="rounded-xl py-3 min-h-[78px] flex flex-col items-center justify-center text-center"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  <div className="text-2xl sm:text-3xl font-extrabold tabular-nums leading-none" style={{ color: "#F87171" }}>
                    {String(u.val).padStart(2, "0")}
                  </div>
                  <div className="mt-1.5 text-[10px] uppercase tracking-[0.14em]" style={{ color: "rgba(241,245,251,0.55)" }}>
                    {u.label}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[13px] sm:text-[14px] leading-[1.7]" style={{ color: "rgba(241,245,251,0.65)" }}>
              Khai giảng K01: <strong className="text-white">20h ngày 26.05.2026</strong> trên ZOOM trực tiếp.
            </p>
          </div>
        </div>

        {/* Reason 3 — dramatic math card */}
        <div
          className="rounded-2xl p-5 sm:p-7 mb-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(229,182,99,0.08) 0%, rgba(229,182,99,0.02) 100%)",
            border: "1px solid rgba(229,182,99,0.25)",
          }}
        >
          {/* Red rotated sticker overlay */}
          <div
            className="hidden sm:flex absolute items-center justify-center text-center select-none pointer-events-none"
            style={{
              top: 18,
              right: 18,
              width: 138,
              height: 138,
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, #F87171 0%, #E63946 70%)",
              color: "#fff",
              boxShadow: "0 12px 28px rgba(230,57,70,0.35)",
              animation: "urgWobble 2.6s ease-in-out infinite",
              border: "3px dashed rgba(255,255,255,0.5)",
              padding: 8,
              lineHeight: 1.15,
            }}
          >
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] font-bold opacity-90">Mỗi giờ mất</div>
              <div className="text-[18px] font-extrabold tabular-nums">~139.000Đ</div>
              <div className="text-[9px] uppercase tracking-[0.18em] font-bold opacity-90">nếu trì hoãn</div>
            </div>
          </div>

          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] mb-3 font-semibold text-center" style={{ color: "#E5B663" }}>
            🔥 Lý do 3: Mỗi ngày trì hoãn = mỗi ngày mất tiền
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-5 text-center flex items-center justify-center gap-2">
            <TrendingDown size={22} style={{ color: "#F87171" }} />
            Hãy tính nhẩm:
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div
              className="rounded-xl p-4 sm:p-5"
              style={{
                background: "rgba(229,182,99,0.04)",
                border: "1px solid rgba(229,182,99,0.12)",
              }}
            >
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: "rgba(241,245,251,0.55)" }}>
                1 sản phẩm bán
              </div>
              <div className="text-xl font-bold text-white tabular-nums">10.000.000đ / khóa</div>
            </div>
            <div
              className="rounded-xl p-4 sm:p-5"
              style={{
                background: "rgba(229,182,99,0.04)",
                border: "1px solid rgba(229,182,99,0.12)",
              }}
            >
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: "rgba(241,245,251,0.55)" }}>
                10 đơn/tháng
              </div>
              <div className="text-xl font-bold tabular-nums" style={{ color: "#34D399" }}>
                = 100tr / tháng
              </div>
            </div>
            <div
              className="rounded-xl p-4 sm:p-5"
              style={{
                background: "rgba(239,68,68,0.04)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: "rgba(241,245,251,0.55)" }}>
                Mỗi ngày trì hoãn
              </div>
              <div className="text-xl font-bold tabular-nums flex items-center justify-center gap-1.5" style={{ color: "#F87171" }}>
                <TrendingDown size={18} />
                ~3.300.000đ
              </div>
            </div>
          </div>

          <p className="text-center mt-6 text-[14px] sm:text-[15px] leading-[1.75]" style={{ color: "rgba(241,245,251,0.75)" }}>
            Học phí Early Bird chỉ <strong className="text-white">10.000.000đ</strong> — hoàn vốn ngay đơn đầu tiên.
            <br />
            Nếu trễ — bạn phải trả <strong style={{ color: "#F87171" }}>20.000.000đ</strong> (gấp đôi).
          </p>
        </div>

        {/* Scarcity reminder strip — sits above CTA */}
        <div
          className="rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 mb-6 flex items-start sm:items-center gap-3"
          style={{
            background: "linear-gradient(90deg, rgba(230,57,70,0.12) 0%, rgba(230,57,70,0.04) 100%)",
            border: "1px solid rgba(230,57,70,0.45)",
            animation: "urgStripPulse 2.4s ease-in-out infinite",
          }}
        >
          <AlertTriangle size={20} style={{ color: "#F87171", flexShrink: 0 }} />
          <p className="text-[13px] sm:text-[14px] leading-[1.6]" style={{ color: "#F1F5FB" }}>
            <strong style={{ color: "#F87171" }}>Cảnh báo:</strong> Sau khi đủ <strong>100 suất</strong>, giá sẽ tăng từ{" "}
            <strong>10.000.000đ</strong> lên <strong style={{ color: "#F87171" }}>20.000.000đ</strong> (gấp đôi).{" "}
            <strong>Không có gia hạn.</strong>
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={onScrollToRegister}
            className="group inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base sm:text-lg font-bold tracking-wide transition-all hover:scale-[1.03] cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)",
              color: "#0A1020",
              boxShadow: "0 0 30px rgba(229,182,99,0.4)",
            }}
          >
            <Crown size={20} />
            ĐĂNG KÝ EARLY BIRD NGAY — 10.000.000Đ
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
