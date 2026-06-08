"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { siteConfig } from "@/lib/site-config";
import {
  CalendarClock,
  CheckCircle,
  ChevronDown,
  Clock,
  Crown,
  Gift,
  GraduationCap,
  Heart,
  Mail,
  MessageCircle,
  Rocket,
  Shield,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Video,
  Zap,
  ArrowRight,
  X,
} from "lucide-react";

const CheckoutModal = dynamic(
  () => import("@/components/checkout/CheckoutModal"),
  { ssr: false }
);
const PasswordInput = dynamic(
  () => import("@/components/auth/PasswordInput"),
  { ssr: false }
);

/* ─── DB product IDs (inserted via Supabase SQL) ───────────────────── */

const VIP_PRODUCT = {
  id: "85f21e60-7f21-4f9f-a43d-6a76612bb6c6",
  name: "AI Make More Money — Vé VIP",
  price: 99_000,
  description:
    "Trọn bộ Free + Video xem lại vĩnh viễn + Bộ slide PDF từng buổi + Ưu tiên Q&A",
};

const VVIP_PRODUCT = {
  id: "d20cf733-0d4c-44fa-8c4a-26ba140614dc",
  name: "AI Make More Money — Vé VVIP",
  price: 499_000,
  description:
    "Trọn bộ VIP + Coaching 1-1 30 phút với Lê Đăng Khương + AI Agent Starter Kit. Giới hạn 50 suất.",
};

/* ─── Event date (Fri 12/06/2026 20:00 Asia/Ho_Chi_Minh = 13:00 UTC) ── */

const EVENT_START_ISO = "2026-06-12T20:00:00+07:00";

/* ─── Static data ──────────────────────────────────────────────────── */

const TRUST_STATS = [
  { value: "1.300+", label: "Học viên" },
  { value: "300M+", label: "Lượt view học viên tạo ra" },
  { value: "4.9/5", label: "Từ 500+ đánh giá" },
];

const PAIN_POINTS = [
  {
    Icon: Clock,
    emoji: "😫",
    title: "Làm video quá tốn thời gian",
    desc: "Quay 1 video mất cả ngày, dựng thêm ngày nữa. Ra được 1 video/tuần đã kiệt sức.",
  },
  {
    Icon: TrendingDown,
    emoji: "📉",
    title: "Kênh mãi không lên",
    desc: "Đăng đều mà view chỉ 200-500. Không biết thuật toán muốn gì.",
  },
  {
    Icon: User,
    emoji: "🤷",
    title: "Có chuyên môn nhưng không ai biết",
    desc: "Bạn giỏi nghề thật sự, nhưng người ta tìm chuyên gia khác vì bạn chưa có thương hiệu.",
  },
  {
    Icon: Heart,
    emoji: "⏰",
    title: "Bán hàng kiệt sức",
    desc: "Tư vấn từng khách 1-1, trả tin nhắn đến 11h đêm, không còn thời gian cho gia đình.",
  },
];

const SESSIONS = [
  {
    num: 1,
    day: "Thứ 6, 12/06",
    time: "20:00",
    title: "Tư Duy Đúng & 10 Nguồn Thu Nhập Từ AI 2026",
    Icon: Sparkles,
    color: "#D4A843",
    points: [
      "Tư duy đúng để kiếm tiền bằng AI — vì sao 2026 là thời điểm vàng.",
      "Toàn cảnh 10 nguồn thu nhập đến từ AI và bạn nên bắt đầu từ đâu.",
      "Lộ trình kiếm 10 nguồn thu nhập trên internet, từ con số 0.",
    ],
  },
  {
    num: 2,
    day: "Thứ 7, 13/06",
    time: "20:00",
    title: "Video & Kênh Triệu View — Kiếm Tiền Từ Affiliate",
    Icon: Video,
    color: "#22c55e",
    points: [
      "Cách tạo video AI hấp dẫn và xây kênh triệu view, không cần quay dựng.",
      "Kiếm tiền Affiliate ở 4 ngách hot: KOL AI, Tiếng Anh, Sức khỏe, Sách.",
      "Công thức biến lượt xem thành hoa hồng đều đặn.",
    ],
  },
  {
    num: 3,
    day: "Chủ Nhật, 14/06",
    time: "20:00",
    title: "Chuyển Đổi Khách Thành Tiền & Hệ Thống Tự Động",
    Icon: Rocket,
    color: "#D4A843",
    points: [
      "Bí mật chuyển đổi danh sách khách hàng thành tiền.",
      "Cách xây dựng sản phẩm số từ chính chuyên môn của bạn.",
      "Dựng Website All-in-One bán hàng tự động với AI Agent — bạn ngủ, hệ thống vẫn bán.",
    ],
  },
];

const TAKEAWAYS = [
  {
    Icon: TrendingUp,
    text: "Một bản đồ rõ ràng để kiếm tiền bằng AI mà không cần giỏi công nghệ.",
  },
  {
    Icon: Sparkles,
    text: "Biết chọn nguồn thu nhập phù hợp với bạn để bắt đầu ngay tuần này.",
  },
  {
    Icon: Video,
    text: "Cách làm video AI & xây kênh hút khách tự nhiên, không tốn tiền quảng cáo.",
  },
  {
    Icon: Heart,
    text: "Hiểu cách dựng hệ thống tự bán hàng để có thêm thời gian cho cuộc sống.",
  },
];

type Benefit = { label: string; free: boolean | string; vip: boolean | string; vvip: boolean | string };
const BENEFITS: Benefit[] = [
  { label: "Học trực tiếp cả 3 buổi Zoom", free: true, vip: true, vvip: true },
  { label: "Cẩm nang \"Bí Mật Video AI Triệu View\" (trị giá 2.990.000đ)", free: true, vip: true, vvip: true },
  { label: "Nhóm cộng đồng (Zalo / Facebook)", free: true, vip: true, vvip: true },
  { label: "Video xem lại (replay) vĩnh viễn", free: false, vip: true, vvip: true },
  { label: "Bộ slide + tài liệu PDF từng buổi", free: false, vip: true, vvip: true },
  { label: "Ưu tiên đặt câu hỏi trong Q&A", free: false, vip: "Có", vvip: "Ưu tiên 1" },
  { label: "Coaching 1-1 30 phút với Lê Đăng Khương", free: false, vip: false, vvip: true },
  { label: "AI Agent Starter Kit (template + prompt)", free: false, vip: false, vvip: true },
  { label: "Số suất", free: "99 suất", vip: "Không giới hạn", vvip: "50 suất" },
];

const TESTIMONIALS = [
  {
    text: "Sau khoá Video AI của Thầy Khương, em ra 1 video/ngày dễ dàng. Kênh đạt 200K sub sau 4 tháng.",
    name: "Thùy Dung",
    role: "Coach sức khoẻ",
    result: "📈 250K sub",
    avatar: "TD",
  },
  {
    text: "Em là bác sĩ da liễu, ngại lên video. Nhờ phương pháp của Thầy, giờ em có 1,5 triệu view/tháng và phòng khám kín lịch.",
    name: "BS. Trần Thị Ninh",
    role: "Bác sĩ Da liễu",
    result: "📈 1,5M view/tháng",
    avatar: "TN",
  },
  {
    text: "Em đã chốt 80 triệu doanh thu trong tháng đầu áp dụng. Cảm ơn Thầy Khương!",
    name: "Phạm Văn Tùng",
    role: "Chuyên gia tài chính",
    result: "💰 80M/tháng",
    avatar: "VT",
  },
  {
    text: "Em không rành công nghệ, vậy mà giờ tự làm video AI, có kênh TikTok 100K follow.",
    name: "Hoàng Văn Nam",
    role: "55 tuổi, Hà Nội",
    result: "📱 100K follow",
    avatar: "VN",
  },
];

const GIFT_PARTS = [
  {
    title: "PHẦN 1 — 10 ngách video dễ lên triệu view tại Việt Nam 2026",
    price: "990.000đ",
  },
  {
    title: "PHẦN 2 — Bí mật Hook 3 giây giữ người xem không lướt qua",
    price: "990.000đ",
  },
  {
    title: "PHẦN 3 — Giải mã thuật toán YouTube Shorts / TikTok / Facebook Reels 2026",
    price: "1.010.000đ",
  },
];

const FAQS = [
  {
    q: "Tôi không rành công nghệ, có theo được không?",
    a: "Được. Chương trình dạy từ gốc, từng bước; nhiều học viên trên 50 tuổi vẫn làm tốt.",
  },
  {
    q: "Vé Free có được xem lại không?",
    a: "Vé Free chỉ học trực tiếp, không có video xem lại. Nếu muốn xem lại vĩnh viễn, bạn chọn vé VIP hoặc VVIP.",
  },
  {
    q: "Tôi cần đầu tư bao nhiêu để bắt đầu?",
    a: "Bạn có thể bắt đầu với chi phí rất nhỏ; phần lớn công cụ AI có gói dùng được ngay từ đầu.",
  },
  {
    q: "Mỗi ngày cần bao nhiêu thời gian?",
    a: "Chỉ cần 30-60 phút mỗi ngày, lộ trình được chia nhỏ để dễ theo.",
  },
  {
    q: "VVIP coaching 1-1 diễn ra thế nào?",
    a: "Sau chương trình, bạn có 30 phút trao đổi trực tiếp 1-1 với diễn giả Lê Đăng Khương để gỡ vướng cho trường hợp của riêng bạn.",
  },
  {
    q: "Tôi có được hỗ trợ sau chương trình không?",
    a: "Có. Bạn ở lại nhóm cộng đồng; vé VIP/VVIP có thêm tài liệu và các quyền lợi đi kèm.",
  },
];

/* ─── Countdown helper ────────────────────────────────────────────── */

function useCountdown(targetIso: string) {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return { d: 0, h: 0, m: 0, s: 0, expired: false, mounted: false };

  const ms = target - now;
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true, mounted: true };

  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { d, h, m, s, expired: false, mounted: true };
}

const pad = (n: number) => n.toString().padStart(2, "0");

/* ─── Page ─────────────────────────────────────────────────────────── */

export default function AIMakeMoneyLanding() {
  const cd = useCountdown(EVENT_START_ISO);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<typeof VIP_PRODUCT | null>(null);

  // Lead-capture modal (Free tier registration)
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "verify" | "error">(
    "idle"
  );
  const [formError, setFormError] = useState("");

  const handleFreeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus("loading");
    setFormError("");
    const fd = new FormData(e.currentTarget);
    const password = (fd.get("popup_password") as string) ?? "";
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password,
          source: "aimakemoremoney-free",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormStatus("verify");
      } else {
        setFormError(data.error || "Có lỗi xảy ra.");
        setFormStatus("idle");
      }
    } catch {
      setFormError("Lỗi kết nối. Vui lòng thử lại.");
      setFormStatus("idle");
    }
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white overflow-x-hidden">
      {/* ═══ HEADER ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/92 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/about/portrait.jpg"
              alt="Lê Đăng Khương"
              width={36}
              height={36}
              className="w-9 h-9 rounded-lg object-cover"
            />
            <div>
              <div className="text-sm font-bold leading-tight">
                Lê Đăng Khương
              </div>
              <div className="text-[10px] text-gray-400">Academy · Kohada</div>
            </div>
          </Link>

          <button
            onClick={() => setShowFreeModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-transform hover:scale-[1.02]"
            style={{ background: "#D4A843", color: "#0a0a0a" }}
          >
            <Gift size={14} /> Đăng ký vé FREE
          </button>
        </div>
      </nav>

      {/* ═══ 1. HERO ═══ */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 relative">
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20 blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle, #D4A843, transparent 70%)" }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Top label */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs sm:text-sm font-bold uppercase tracking-wider"
            style={{
              background: "rgba(212,168,67,0.12)",
              border: "1px solid rgba(212,168,67,0.35)",
              color: "#D4A843",
            }}
          >
            <CalendarClock size={14} />
            <span>MIỄN PHÍ · 3 BUỔI TỐI ZOOM · 12-14/06</span>
          </div>

          {/* H1 */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-3 sm:mb-4">
            <span className="text-[#D4A843]">AI Make More Money</span>
            <br /> and Freedom
          </h1>

          {/* Subhead */}
          <p className="text-xl sm:text-2xl font-bold text-white/90 mb-5 sm:mb-7">
            Kiếm Tiền &amp; Tự Do Bằng AI
          </p>

          {/* Value line */}
          <p className="text-sm sm:text-lg text-gray-400 max-w-2xl mx-auto mb-7 sm:mb-10 leading-relaxed">
            3 buổi tối, học cách dùng AI để{" "}
            <strong className="text-white">mở 10 nguồn thu nhập</strong> và dựng
            hệ thống <strong className="text-white">tự bán hàng 24/7</strong> —
            bắt đầu được ngay cả khi bạn từ con số 0 và không rành công nghệ.
          </p>

          {/* Countdown */}
          <div className="mb-8 sm:mb-10">
            <p className="text-xs sm:text-sm text-gray-400 mb-3">
              ⏰ Khai mạc sau:
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {[
                { label: "Ngày", value: cd.d },
                { label: "Giờ", value: cd.h },
                { label: "Phút", value: cd.m },
                { label: "Giây", value: cd.s },
              ].map((u, i) => (
                <div
                  key={u.label}
                  className="flex flex-col items-center"
                >
                  <div
                    className="w-14 sm:w-20 h-14 sm:h-20 rounded-xl flex items-center justify-center font-extrabold text-2xl sm:text-4xl"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(212,168,67,0.18), rgba(212,168,67,0.05))",
                      border: "1px solid rgba(212,168,67,0.3)",
                      color: "#D4A843",
                    }}
                  >
                    {cd.mounted ? pad(u.value) : "--"}
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-500 mt-1.5 uppercase tracking-wider">
                    {u.label}
                  </span>
                  {i < 3 && null}
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <button
              onClick={() => setShowFreeModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl font-bold text-base text-black transition-transform hover:scale-[1.02]"
              style={{
                background: "#D4A843",
                boxShadow: "0 10px 35px -10px rgba(212,168,67,0.55)",
              }}
            >
              <Gift size={18} /> ĐĂNG KÝ VÉ FREE NGAY
            </button>
            <a
              href="#tickets"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl font-bold text-base transition-colors"
              style={{
                border: "1.5px solid #D4A843",
                color: "#D4A843",
              }}
            >
              Xem hạng vé khác <ArrowRight size={16} />
            </a>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Học trực tiếp cùng Lê Đăng Khương · Tặng cẩm nang trị giá 2.990.000đ
          </p>
        </div>
      </section>

      {/* ═══ 2. TRUST BAR ═══ */}
      <section className="py-6 sm:py-10 px-4 border-y border-white/5 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-3 sm:gap-6 text-center">
          {TRUST_STATS.map((s) => (
            <div key={s.label}>
              <div className="text-xl sm:text-3xl font-extrabold text-[#D4A843]">
                {s.value}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-400 mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 3. PAIN POINTS ═══ */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-12">
            Bạn có đang mắc kẹt ở{" "}
            <span className="text-[#D4A843]">những điều này?</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PAIN_POINTS.map((p, i) => (
              <div
                key={i}
                className="bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-red-500/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <p.Icon size={18} className="text-red-400" />
                  </div>
                  <div className="text-2xl leading-none">{p.emoji}</div>
                </div>
                <h3 className="text-sm font-bold mb-1.5 text-white">{p.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-2xl mx-auto">
            <div
              className="rounded-xl py-5 px-6 text-center"
              style={{
                background: "rgba(212,168,67,0.06)",
                border: "1px solid rgba(212,168,67,0.25)",
              }}
            >
              <p className="text-sm sm:text-base text-gray-200 leading-relaxed">
                Tin tốt là: tất cả những điều này đều giải quyết được —{" "}
                <span className="text-[#D4A843] font-semibold">
                  bằng AI, đúng phương pháp.
                </span>{" "}
                Và trong 3 buổi tối, tôi sẽ chỉ cho bạn cách.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4. SESSIONS ═══ */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-3">
              Bạn sẽ học gì trong <span className="text-[#D4A843]">3 buổi?</span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              3 đêm liền — 20:00 Thứ 6, Thứ 7, Chủ Nhật trên Zoom
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {SESSIONS.map((s) => (
              <div
                key={s.num}
                className="bg-[#111] border border-white/5 rounded-2xl p-6 relative overflow-hidden hover:border-[#D4A843]/30 transition-colors"
              >
                <div
                  className="absolute top-3 right-4 text-[80px] font-extrabold leading-none opacity-[0.07] select-none"
                  style={{ color: s.color }}
                >
                  {s.num}
                </div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${s.color}20` }}
                    >
                      <s.Icon size={20} style={{ color: s.color }} />
                    </div>
                    <div>
                      <div
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: s.color }}
                      >
                        Buổi {s.num} · {s.day} · {s.time}
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight mt-0.5">
                        {s.title}
                      </h3>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {s.points.map((pt, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle size={15} className="text-[#22c55e] shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. TAKEAWAYS ═══ */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-12">
            Sau 3 buổi, <span className="text-[#D4A843]">bạn mang về</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TAKEAWAYS.map((t, i) => (
              <div
                key={i}
                className="bg-[#111] border border-white/5 rounded-xl p-5 flex items-start gap-4 hover:border-[#D4A843]/20 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(212,168,67,0.12)" }}
                >
                  <t.Icon size={18} className="text-[#D4A843]" />
                </div>
                <p className="text-sm text-gray-200 leading-relaxed pt-1.5">
                  {t.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. TICKETS (centerpiece) ═══ */}
      <section
        id="tickets"
        className="py-12 sm:py-24 px-4 sm:px-6 bg-[#0d0d0d] scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 text-xs font-bold uppercase tracking-wider"
              style={{
                background: "rgba(212,168,67,0.12)",
                border: "1px solid rgba(212,168,67,0.3)",
                color: "#D4A843",
              }}
            >
              <Crown size={12} /> Chọn hạng vé
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-3">
              3 lựa chọn — phù hợp với bạn
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
              Vé Free cho người mới khám phá, VIP cho người muốn xem lại vĩnh
              viễn, VVIP cho người muốn được Khương kèm 1-1.
            </p>
          </div>

          {/* 3 ticket cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
            {/* FREE */}
            <div
              className="rounded-2xl p-6 sm:p-7 flex flex-col"
              style={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                FREE
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-extrabold text-white">0đ</span>
              </div>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                Học trực tiếp cả 3 buổi + nhận cẩm nang 2.990.000đ.{" "}
                <strong className="text-yellow-400">Giới hạn 99 suất.</strong>
              </p>
              <ul className="space-y-2.5 text-sm text-gray-300 mb-6 flex-1">
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> Học trực tiếp cả 3 buổi Zoom</li>
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> Cẩm nang Bí Mật Video AI</li>
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> Vào nhóm cộng đồng</li>
                <li className="flex items-start gap-2 text-gray-500"><X size={14} className="shrink-0 mt-0.5" /> KHÔNG có video xem lại</li>
              </ul>
              <button
                onClick={() => setShowFreeModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors"
                style={{ border: "1.5px solid #D4A843", color: "#D4A843" }}
              >
                ĐĂNG KÝ VÉ FREE
              </button>
            </div>

            {/* VIP */}
            <div
              className="rounded-2xl p-6 sm:p-7 flex flex-col"
              style={{
                background: "#111",
                border: "1px solid rgba(212,168,67,0.25)",
              }}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-[#D4A843] mb-2">
                VIP
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-extrabold text-[#D4A843]">99k</span>
                <span className="text-xs text-gray-500">≈ 1 ly cà phê</span>
              </div>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                Giữ trọn bộ tài liệu và video xem lại{" "}
                <strong className="text-white">vĩnh viễn</strong> để học lại bất
                cứ lúc nào.
              </p>
              <ul className="space-y-2.5 text-sm text-gray-300 mb-6 flex-1">
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> Tất cả của Free</li>
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> <strong className="text-white">Video xem lại vĩnh viễn</strong></li>
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> Slide + PDF từng buổi</li>
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> Ưu tiên đặt câu hỏi Q&amp;A</li>
              </ul>
              <button
                onClick={() => setCheckoutProduct(VIP_PRODUCT)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-black transition-transform hover:scale-[1.02]"
                style={{ background: "#D4A843" }}
              >
                LẤY VÉ VIP — 99K
              </button>
            </div>

            {/* VVIP — featured */}
            <div
              className="relative rounded-2xl p-6 sm:p-7 flex flex-col"
              style={{
                background: "linear-gradient(155deg, rgba(212,168,67,0.18) 0%, rgba(34,197,94,0.06) 100%)",
                border: "2px solid #D4A843",
                boxShadow: "0 20px 50px -20px rgba(212,168,67,0.5)",
              }}
            >
              {/* Best value badge */}
              <div
                className="absolute -top-3 right-5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
                style={{
                  background: "#D4A843",
                  color: "#0a0a0a",
                  boxShadow: "0 4px 12px rgba(212,168,67,0.5)",
                }}
              >
                ⭐ Giá trị tốt nhất
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} className="text-[#D4A843]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#D4A843]">
                  VVIP
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-extrabold text-[#D4A843]">499k</span>
                <span className="text-xs text-yellow-400">Chỉ 50 suất</span>
              </div>
              <p className="text-xs text-gray-300 mb-5 leading-relaxed">
                Suất gần Thầy nhất — có{" "}
                <strong className="text-white">coaching 1-1 30 phút</strong>{" "}
                trực tiếp với Lê Đăng Khương.
              </p>
              <ul className="space-y-2.5 text-sm text-gray-200 mb-6 flex-1">
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> Tất cả của VIP</li>
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> <strong className="text-white">Coaching 1-1 30 phút với Khương</strong></li>
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> AI Agent Starter Kit (template + prompt)</li>
                <li className="flex items-start gap-2"><CheckCircle size={14} className="text-[#22c55e] shrink-0 mt-0.5" /> Ưu tiên Q&amp;A số 1</li>
              </ul>
              <button
                onClick={() => setCheckoutProduct(VVIP_PRODUCT)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-sm text-black transition-transform hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #D4A843, #b8902f)",
                  boxShadow: "0 10px 30px -10px rgba(212,168,67,0.6)",
                }}
              >
                <Crown size={16} /> LẤY VÉ VVIP — 499K
              </button>
            </div>
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr style={{ background: "#0a0a0a" }}>
                  <th className="text-left p-4 font-bold text-gray-400">Quyền lợi</th>
                  <th className="p-4 font-bold text-gray-300">FREE (0đ)</th>
                  <th className="p-4 font-bold text-[#D4A843]">VIP (99k)</th>
                  <th className="p-4 font-bold text-[#D4A843]">VVIP (499k)</th>
                </tr>
              </thead>
              <tbody>
                {BENEFITS.map((b, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? "bg-[#111]" : "bg-[#0d0d0d]"}
                  >
                    <td className="p-4 text-gray-200">{b.label}</td>
                    <td className="text-center p-4">{renderCell(b.free)}</td>
                    <td className="text-center p-4">{renderCell(b.vip)}</td>
                    <td className="text-center p-4">{renderCell(b.vvip)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Risk reversal */}
          <p className="text-center text-xs text-gray-500 mt-6 max-w-xl mx-auto">
            <Shield size={12} className="inline mb-0.5 mr-1" />
            Cam kết hoàn 100% phí vé VIP/VVIP nếu sau buổi 1 bạn không thấy giá
            trị — chỉ cần email báo trong 24h.
          </p>
        </div>
      </section>

      {/* ═══ 7. ABOUT SPEAKER ═══ */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-10">
            Về diễn giả <span className="text-[#D4A843]">Lê Đăng Khương</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-2">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 relative">
                <Image
                  src="/images/about/portrait.jpg"
                  alt="Lê Đăng Khương"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
                <div
                  className="absolute bottom-0 left-0 right-0 p-4 text-center"
                  style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}
                >
                  <div className="text-lg font-bold">Lê Đăng Khương</div>
                  <div className="text-sm text-[#D4A843]">Founder Kohada</div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                <strong className="text-white">Lê Đăng Khương</strong> — Founder
                Kohada, chuyên gia đào tạo Video AI &amp; thương hiệu cá nhân
                hàng đầu Việt Nam.
              </p>
              <ul className="space-y-3">
                {[
                  "👥 Đã đào tạo 1.300+ học viên thành thạo Video AI và xây kênh triệu view",
                  "📈 Học viên tạo ra hơn 300 triệu view từ phương pháp đào tạo",
                  "🎬 Người Việt tiên phong xây giáo trình Video AI VEO3.1 từ A-Z",
                  "🤖 Tiên phong ứng dụng AI Agent vào hệ thống bán hàng tự động",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="shrink-0">{item.slice(0, 2)}</span>
                    <span>{item.slice(3)}</span>
                  </li>
                ))}
              </ul>
              <blockquote className="border-l-2 border-[#D4A843] pl-4 italic text-gray-400 text-sm mt-4">
                &quot;Giúp 10.000 chuyên gia Việt Nam làm chủ AI, xây thương
                hiệu cá nhân và kiếm tiền tự động — để sống cân bằng và tự do.&quot;
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 8. TESTIMONIALS ═══ */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-10">
            Học viên <span className="text-[#22c55e]">nói gì?</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="bg-[#111] border border-white/5 rounded-2xl p-5"
              >
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <Star key={j} size={13} fill="#D4A843" color="#D4A843" />
                  ))}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed mb-4 italic">
                  &quot;{t.text}&quot;
                </p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg, #D4A843, #22c55e)",
                      color: "#0a0a0a",
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                  <span className="text-xs font-medium text-[#22c55e] shrink-0">
                    {t.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 9. GIFT BONUS ═══ */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 relative">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, #D4A843, transparent 70%)" }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-bold"
              style={{ background: "rgba(212,168,67,0.15)", color: "#D4A843" }}
            >
              <Gift size={16} /> QUÀ TẶNG KHI ĐĂNG KÝ
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-3">
              Cẩm nang <span className="text-[#D4A843]">&quot;Bí Mật Video AI Triệu View&quot;</span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Trị giá <strong className="text-white line-through">2.990.000đ</strong> —{" "}
              <strong className="text-[#22c55e]">MIỄN PHÍ</strong> cho cả 3 hạng vé
            </p>
          </div>

          <div
            className="rounded-2xl p-6 sm:p-8 mb-6"
            style={{
              background: "#111",
              border: "1px solid rgba(212,168,67,0.3)",
            }}
          >
            <div className="space-y-4">
              {GIFT_PARTS.map((g, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 pb-4 border-b border-white/5 last:border-b-0 last:pb-0"
                >
                  <p className="text-sm text-gray-200 leading-snug flex-1">
                    {g.title}
                  </p>
                  <span className="text-sm font-bold text-[#D4A843] shrink-0">
                    {g.price}
                  </span>
                </div>
              ))}
              <div
                className="rounded-xl p-4 mt-4 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(212,168,67,0.15), rgba(34,197,94,0.08))",
                  border: "1px solid rgba(212,168,67,0.3)",
                }}
              >
                <p className="text-xs text-gray-400 mb-1">TỔNG TRỊ GIÁ</p>
                <p className="text-xl font-extrabold">
                  <span className="text-gray-500 line-through mr-2">2.990.000đ</span>
                  <span className="text-[#22c55e]">MIỄN PHÍ</span>
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowFreeModal(true)}
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl font-bold text-base text-black transition-transform hover:scale-[1.02]"
              style={{
                background: "#D4A843",
                boxShadow: "0 10px 35px -10px rgba(212,168,67,0.55)",
              }}
            >
              <Gift size={18} /> ĐĂNG KÝ MIỄN PHÍ &amp; NHẬN CẨM NANG
            </button>
            <p className="text-xs text-gray-500 mt-3">
              <Shield size={11} className="inline mb-0.5 mr-1" /> Bảo mật tuyệt
              đối · <Zap size={11} className="inline mb-0.5 mx-1" /> Gửi trong 2
              phút
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 10. FAQ ═══ */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-10">
            Câu hỏi <span className="text-[#D4A843]">thường gặp</span>
          </h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div
                key={i}
                className="bg-[#111] border border-white/5 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-semibold text-sm sm:text-base pr-4">{f.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-gray-400 transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 11. FINAL CTA ═══ */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 relative">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle at center, #D4A843, transparent 60%)" }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-4">
            Sẵn sàng dùng AI để{" "}
            <span className="text-[#D4A843]">kiếm nhiều tiền hơn</span> và sống
            tự do hơn?
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Tham gia cùng 1.300+ chuyên gia Việt Nam đang làm chủ AI. 3 buổi tối
            có thể thay đổi cả năm tới của bạn.
          </p>

          <div className="flex items-center justify-center gap-2 mb-8 text-sm text-gray-400 flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={14} fill="#D4A843" color="#D4A843" />
            ))}
            <span className="ml-1">4.9/5 từ 500+ học viên</span>
            <span className="mx-2 hidden sm:inline">|</span>
            <span>
              <Users size={13} className="inline mr-1 mb-0.5" /> 1.300+ học viên đã
              thành công
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowFreeModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl font-bold text-base text-black transition-transform hover:scale-[1.02]"
              style={{
                background: "#D4A843",
                boxShadow: "0 10px 35px -10px rgba(212,168,67,0.55)",
              }}
            >
              <Gift size={18} /> ĐĂNG KÝ VÉ FREE NGAY
            </button>
            <a
              href={siteConfig.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl font-bold text-base border border-white/10 hover:border-white/20 transition-colors"
            >
              <MessageCircle size={16} className="text-[#D4A843]" /> Tư vấn trực tiếp
            </a>
          </div>

          <p className="text-xs text-gray-500 mt-5">
            Bắt đầu lúc 20:00 Thứ 6, 7, CN trên Zoom · 12, 13, 14/06
          </p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6 text-center text-xs text-gray-500">
        <p>© 2026 Lê Đăng Khương · dangkhuong.com · Powered by KOHADA</p>
        <p className="mt-2 italic text-[#D4A843]">
          Giỏi nghề. Tự do. Sống trọn cuộc đời.
        </p>
      </footer>

      {/* ═══ CHECKOUT MODAL (VIP/VVIP) ═══ */}
      {checkoutProduct && (
        <CheckoutModal
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          onSuccess={() => {
            setCheckoutProduct(null);
            window.location.href = "/dashboard";
          }}
        />
      )}

      {/* ═══ FREE-TIER LEAD CAPTURE MODAL ═══ */}
      {showFreeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => formStatus !== "loading" && setShowFreeModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#111] border border-[#D4A843]/30 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => formStatus !== "loading" && setShowFreeModal(false)}
              aria-label="Đóng"
              className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 p-1 rounded-lg hover:bg-white/5"
            >
              <X size={18} />
            </button>

            <div className="relative p-6 sm:p-8">
              {formStatus === "verify" ? (
                <div className="text-center py-4">
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
                    style={{
                      background: "rgba(212,168,67,0.1)",
                      border: "1px solid rgba(212,168,67,0.2)",
                    }}
                  >
                    <Mail size={32} className="text-[#D4A843]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Đăng ký thành công 🎉</h3>
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                    Em đã gửi email xác thực đến{" "}
                    <span className="text-[#D4A843]">{formData.email}</span>.
                    Vui lòng xác thực để chính thức nhận vé Free + link Zoom 3 buổi.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-base text-black"
                    style={{ background: "#D4A843" }}
                    onClick={() => setShowFreeModal(false)}
                  >
                    Đăng nhập <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-3 bg-[#D4A843]/10">
                      <Gift size={26} className="text-[#D4A843]" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Đăng ký Vé FREE</h3>
                    <p className="text-sm text-gray-400">
                      3 buổi Zoom 12-14/06 + cẩm nang 2.990.000đ
                    </p>
                  </div>

                  {formError && (
                    <div
                      className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
                      style={{ background: "rgba(239,68,68,0.08)" }}
                    >
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handleFreeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, name: e.target.value }))
                        }
                        className="input-dark w-full"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Số điện thoại <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, phone: e.target.value }))
                        }
                        pattern="^(0|\+84)[0-9]{9}$"
                        title="Nhập số điện thoại hợp lệ (VD: 0912345678)"
                        className="input-dark w-full"
                        placeholder="0912345678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, email: e.target.value }))
                        }
                        className="input-dark w-full"
                        placeholder="ban@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Mật khẩu
                      </label>
                      <PasswordInput
                        name="popup_password"
                        placeholder="Tối thiểu 8 ký tự"
                        minLength={8}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={formStatus === "loading"}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base text-black disabled:opacity-50 transition-transform hover:scale-[1.01]"
                      style={{ background: "#D4A843" }}
                    >
                      {formStatus === "loading"
                        ? "Đang xử lý..."
                        : "ĐĂNG KÝ NHẬN VÉ FREE"}
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                      <Shield size={11} className="inline mb-0.5 mr-1" /> Bảo mật tuyệt
                      đối · không spam
                    </p>

                    <p className="text-center text-sm text-gray-400">
                      Đã có tài khoản?{" "}
                      <Link
                        href="/login"
                        className="text-[#D4A843] font-medium hover:underline"
                        onClick={() => setShowFreeModal(false)}
                      >
                        Đăng nhập
                      </Link>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ESLint-keep: ensure GraduationCap stays imported (used by future audience expansion) */}
      <span className="hidden">
        <GraduationCap size={1} />
      </span>
    </div>
  );
}

/* ─── Helper to render comparison-table cells ─────────────────────── */

function renderCell(v: boolean | string) {
  if (v === true)
    return <CheckCircle size={16} className="inline text-[#22c55e]" />;
  if (v === false)
    return <X size={14} className="inline text-gray-600" />;
  return <span className="text-xs font-medium text-[#D4A843]">{v}</span>;
}
