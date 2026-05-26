"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { siteConfig, getZaloPhone } from "@/lib/site-config";
import {
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  ArrowRight,
  Crown,
  Sparkles,
  Zap,
  Star,
  HelpCircle,
  ChevronDown,
  Users,
  Video,
  Mic,
  UserCircle,
  Bot,
  Play,
  X,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import BankTransferButtons from "@/components/BankTransferButtons";

/* ─── Brand colors ──────────────────────────────────── */
// Deep blue-violet tech + electric cyan accent
// Background scale: #050913 → #0A1020 → #0E1730 → #13203F
// Primary: #3B82F6 (blue) · Accent: #22D3EE (cyan) · Gold: #E5B663

const COURSE_URL = "/courses/hoc-lam-tool-video-cho-nguoi-moi-bat-dau";

const BANK_NAMES: Record<string, string> = {
  BIDV: "Ngân hàng BIDV",
  VCB: "Vietcombank",
  TCB: "Techcombank",
  MB: "MB Bank",
  ACB: "ACB",
  VPB: "VPBank",
  TPB: "TPBank",
  STB: "Sacombank",
  VIB: "VIB",
  MSB: "MSB",
  SHB: "SHB",
  HDB: "HDBank",
  OCB: "OCB",
  LPB: "LienVietPostBank",
  EIB: "Eximbank",
  NAB: "Nam A Bank",
  BAB: "Bac A Bank",
  SCB: "SCB",
};

interface PaymentInfo {
  order_code: string;
  amount: number;
  transfer_content: string;
  qr_url: string | null;
  bank_account: string | null;
  bank_code: string | null;
}

/* ─── Pain points ─── */
const PAIN_POINTS = [
  "Muốn làm video bằng AI nhưng không biết bắt đầu từ đâu, quá nhiều tool rối rắm.",
  "Mỗi video phải làm thủ công từ đầu — tốn hàng giờ mà kết quả chưa ưng ý.",
  "Không có hệ thống — mỗi lần làm video lại phải lặp lại cả quy trình.",
  "Muốn tự động hóa nhưng không biết cách xây tool, sợ phức tạp, sợ code.",
];

/* ─── 5 Điều bạn sẽ học ─── */
const UPGRADES = [
  {
    num: "01",
    icon: <Zap size={20} />,
    title: "Hiểu nền tảng Google Flow",
    subtitle: "Nền tảng",
    desc: "Nắm trọn cách hoạt động của Google Flow & Gemini — nền tảng xây tool video AI mạnh nhất hiện tại. Không cần biết code, chỉ cần hiểu logic là xây được.",
  },
  {
    num: "02",
    icon: <Bot size={20} />,
    title: "Xây Tool Video từ Zero",
    subtitle: "Cốt lõi",
    desc: "Tự tay xây Tool làm video tự động hoàn chỉnh trên Google Flow — nhập ý tưởng, AI tự viết kịch bản, tạo MC ảo, render cả loạt video chỉ bằng 1 nút bấm.",
  },
  {
    num: "03",
    icon: <Users size={20} />,
    title: "Tạo nhân vật & MC ảo",
    subtitle: "Nhân vật",
    desc: "Xây Characters — nhân vật nhất quán cho cả series. Gán tên, gọi bằng @tên — giữ nguyên gương mặt, phong cách xuyên suốt mọi video.",
  },
  {
    num: "04",
    icon: <Mic size={20} />,
    title: "Giọng nói & Avatar @me",
    subtitle: "Cá nhân hóa",
    desc: "Tạo giọng nói riêng cho MC ảo. Đưa chính bạn vào video bằng Avatar @me — chỉ cần selfie ngắn, không cần dựng máy quay.",
  },
  {
    num: "05",
    icon: <Video size={20} />,
    title: "Ứng dụng thực tế",
    subtitle: "Kinh doanh",
    desc: "Biến tool video AI thành công cụ kinh doanh: video bán hàng, phễu nội dung, đào tạo, đa ngôn ngữ — tất cả chạy tự động.",
  },
];

/* ─── Audience ─── */
const AUDIENCE = [
  { icon: <Star size={18} />, title: "Người mới hoàn toàn", desc: "chưa biết gì về AI hay code, muốn tự xây tool video đơn giản mà hiệu quả." },
  { icon: <Video size={18} />, title: "Người bán hàng, KOL, KOC", desc: "cần hệ thống tạo video tự động để ra content đều đặn mà không tốn thời gian." },
  { icon: <Crown size={18} />, title: "Chủ doanh nghiệp", desc: "muốn tự xây tool video nội bộ — đào tạo, quảng cáo, content — không cần thuê ekip." },
  { icon: <Play size={18} />, title: "Content Creator", desc: "muốn tự động hóa quy trình sản xuất video, ra hàng loạt video chất lượng mỗi ngày." },
];

/* ─── Benefits ─── */
const BENEFITS = [
  "Tự xây được Tool video AI hoàn chỉnh trên Google Flow — từ zero, không cần biết code.",
  "Nhập ý tưởng → AI tự viết kịch bản, tạo MC ảo, lồng giọng, render video tự động.",
  "Tạo nhân vật & Avatar @me nhất quán — dùng lại cho hàng loạt video mà không làm lại.",
  "Hiểu cách tự động hóa quy trình: từ 1 video/ngày lên 10-20 video/ngày dễ dàng.",
  "Ứng dụng ngay vào kinh doanh: video bán hàng, đào tạo, phễu nội dung tự động.",
];

/* ─── Nội dung khóa học ─── */
const MODULES = [
  {
    module: "PHẦN 1",
    title: "Nền tảng & Nguyên liệu cho Tool Video",
    items: [
      "Google Flow là gì — vì sao đây là nền tảng xây tool video AI tốt nhất hiện tại",
      "Tạo video AI chất lượng cao với Gemini — hiểu cách AI tạo video từ prompt",
      "Xây Characters & Avatar @me — tạo MC ảo với gương mặt và giọng nói nhất quán",
      "Chuẩn bị đầy đủ nguyên liệu trước khi xây tool: nhân vật, giọng nói, phong cách",
    ],
  },
  {
    module: "PHẦN 2",
    title: "Xây Tool Video Tự Động từ Zero",
    items: [
      "Thiết kế luồng tool trên Google Flow — từ ý tưởng đến video hoàn chỉnh",
      "Kết nối AI viết kịch bản → tạo MC ảo → lồng giọng → render tự động",
      "Tối ưu tool: chạy hàng loạt video chỉ bằng 1 nút bấm, không cần can thiệp",
      "Ứng dụng thực tế: video bán hàng, đào tạo, phễu nội dung, đa ngôn ngữ",
    ],
  },
];

/* ─── Included ─── */
const INCLUDED = [
  "Khóa học từ zero: xây tool video AI hoàn chỉnh, không cần biết code",
  "Hướng dẫn từng bước trên Google Flow — làm theo là được",
  "Tạo MC ảo: Characters, Avatar @me, Voices — nhân vật nhất quán",
  "Template tool sẵn: nhập ý tưởng → AI tự viết kịch bản, render video",
  "Ứng dụng thực tế: video bán hàng, đào tạo, phễu nội dung tự động",
  "Hỗ trợ qua nhóm Zalo học viên",
];

/* ─── FAQ ─── */
const FAQS = [
  {
    q: "Tôi không biết code, có xây được tool không?",
    a: "Hoàn toàn được! Google Flow là nền tảng kéo-thả, không cần viết code. Khóa học hướng dẫn từng bước — bạn chỉ cần làm theo là xây được tool video AI hoàn chỉnh.",
  },
  {
    q: "Tool xây xong có chạy tự động không?",
    a: "Có! Sau khi xây xong, bạn chỉ cần nhập ý tưởng → tool tự viết kịch bản, tạo MC ảo, lồng giọng và render video. Chạy hoàn toàn tự động, không cần can thiệp.",
  },
  {
    q: "Khóa học có xem lại được không?",
    a: "Có! Sau khi đăng ký, bạn có quyền truy cập trọn đời vào toàn bộ nội dung khóa học và có thể xem lại bất cứ lúc nào.",
  },
  {
    q: "Sao giá ưu đãi chỉ 200K?",
    a: "Đây là mức ưu đãi đặc biệt trong giai đoạn ra mắt. Giá gốc khóa học là 500.000đ và sẽ được điều chỉnh về giá gốc sau khi hết ưu đãi.",
  },
];

export default function HocLamToolVideoLanding() {
  const registerRef = useRef<HTMLDivElement>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [copied, setCopied] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Poll order status every 5s when payment modal is open
  useEffect(() => {
    if (!showModal || !paymentInfo?.order_code || paymentStatus === "paid") return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/check-status?order_code=${paymentInfo.order_code}`);
        const data = await res.json();
        if (data.status === "paid") {
          setPaymentStatus("paid");
          clearInterval(poll);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [showModal, paymentInfo?.order_code, paymentStatus]);

  // Auto-detect returning customers by email
  const [emailCheck, setEmailCheck] = useState<{
    status: "idle" | "checking" | "exists" | "new";
  }>({ status: "idle" });

  useEffect(() => {
    const email = form.email.trim();
    if (!email || !email.includes("@") || !email.includes(".")) {
      setEmailCheck({ status: "idle" });
      return;
    }
    const handle = setTimeout(async () => {
      setEmailCheck({ status: "checking" });
      try {
        const res = await fetch("/api/hoclamtoolvideo/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setEmailCheck({
          status: data.exists ? "exists" : "new",
        });
      } catch {
        setEmailCheck({ status: "new" });
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [form.email]);

  const isReturningUser = emailCheck.status === "exists";

  const scrollToRegister = () => {
    registerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    if (!isReturningUser && (!form.full_name.trim() || !form.phone.trim())) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    if (!isReturningUser && form.password.length < 8) {
      setError("Mật khẩu tối thiểu 8 ký tự");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hoclamtoolvideo/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.paymentInfo) setPaymentInfo(data.paymentInfo);
        setShowModal(true);
      } else {
        setError(data.error || "Có lỗi xảy ra, vui lòng thử lại");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#050913",
        color: "#F1F5FB",
        fontFeatureSettings: '"ss01", "cv11"',
      }}
    >
      {/* ═══ NAVBAR ═══ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between"
        style={{
          background: "rgba(5,9,19,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(59,130,246,0.12)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/images/about/portrait.jpg"
            alt="Lê Đăng Khương"
            className="w-9 h-9 rounded-lg object-cover"
            style={{ border: "1px solid rgba(59,130,246,0.35)" }}
          />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-semibold text-sm text-white">Lê Đăng Khương</span>
            <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#22D3EE" }}>
              AI Video Course
            </span>
          </div>
        </Link>
        <button
          onClick={scrollToRegister}
          className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer transition-all hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, #3B82F6 0%, #22D3EE 100%)",
            color: "#fff",
            boxShadow: "0 0 18px rgba(59,130,246,0.35)",
          }}
        >
          <Zap size={14} />
          Đăng Ký Ngay
        </button>
      </nav>

      <div className="h-14" />

      {/* ═══ HERO ═══ */}
      <section
        className="relative overflow-hidden pt-12 pb-8 sm:pt-20 sm:pb-12 md:pt-24 md:pb-16 px-4 sm:px-6"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 60%), linear-gradient(180deg, #050913 0%, #0A1020 100%)",
        }}
      >
        <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
          {/* Badge */}
          <span
            className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase"
            style={{
              borderColor: "rgba(34,211,238,0.5)",
              color: "#22D3EE",
              background: "rgba(34,211,238,0.08)",
              letterSpacing: "0.18em",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <BookOpen size={12} />
            Khóa Học Cho Người Mới Bắt Đầu
          </span>

          {/* H1 for SEO */}
          <h1 className="sr-only">
            Học Làm Tool Video Cho Người Mới Bắt Đầu — Tự Xây Tool Video AI Đơn Giản, Hiệu Quả trên Google Flow
          </h1>

          {/* Headline */}
          <h2
            className="mb-3 font-extrabold max-w-4xl text-[22px] sm:text-[28px] md:text-[36px] leading-[1.25]"
            style={{ letterSpacing: "-0.01em" }}
          >
            Tự Xây{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #3B82F6 0%, #22D3EE 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Tool Video AI
            </span>
            {" "}Đơn Giản, Hiệu Quả
          </h2>

          <p
            className="mx-auto mb-6 max-w-3xl text-[14px] sm:text-[15px] leading-[1.7]"
            style={{ color: "rgba(241,245,251,0.75)" }}
          >
            Từ zero — tự tay xây tool trên Google Flow: nhập ý tưởng → AI tự viết kịch bản, tạo <strong className="text-white">MC ảo</strong>, lồng giọng, render cả loạt video{" "}
            <strong style={{ color: "#22D3EE" }}>chỉ bằng 1 nút bấm</strong>. Không cần biết code. Đơn giản. Hiệu quả.
          </p>

          {/* Video giới thiệu — banner thumbnail, click to play */}
          <div className="mb-6 sm:mb-8 w-full max-w-3xl">
            <div
              className="relative overflow-hidden rounded-2xl cursor-pointer group"
              style={{
                paddingBottom: "56.25%",
                border: "1px solid rgba(59,130,246,0.25)",
                boxShadow: "0 20px 60px -15px rgba(0,0,0,0.5), 0 0 40px rgba(59,130,246,0.12)",
              }}
              onClick={() => setVideoPlaying(true)}
            >
              {videoPlaying ? (
                <iframe
                  src="https://www.youtube.com/embed/DqmPtSi-cf4?rel=0&autoplay=1"
                  title="Học Làm Tool Video Cho Người Mới Bắt Đầu — Xây Tool Video AI Đơn Giản, Hiệu Quả"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              ) : (
                <>
                  <img
                    src="/images/updateveo31/banner.png"
                    alt="Học Làm Tool Video Cho Người Mới Bắt Đầu"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full transition-transform group-hover:scale-110"
                      style={{
                        background: "rgba(255,0,0,0.85)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                      }}
                    >
                      <Play size={28} className="text-white ml-1" fill="white" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Google Flow Tool Screenshots */}
          <div className="w-full max-w-4xl mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid rgba(34,211,238,0.3)",
                  boxShadow: "0 15px 40px -10px rgba(0,0,0,0.5), 0 0 25px rgba(34,211,238,0.1)",
                }}
              >
                <div
                  className="px-3.5 py-2 flex items-center gap-2"
                  style={{
                    background: "linear-gradient(180deg, #1a1a2e 0%, #16162a 100%)",
                    borderBottom: "1px solid rgba(34,211,238,0.15)",
                  }}
                >
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: "#eab308" }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-medium ml-1.5" style={{ color: "rgba(241,245,251,0.5)" }}>
                    Tool Builder · MC ảo - Video tiếng Việt
                  </span>
                </div>
                <img
                  src="/images/updateveo31/flow-tool-overview.png"
                  alt="Google Flow Tool Builder — Tạo tool MC ảo tự động"
                  className="block w-full h-auto"
                />
              </div>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid rgba(34,211,238,0.3)",
                  boxShadow: "0 15px 40px -10px rgba(0,0,0,0.5), 0 0 25px rgba(34,211,238,0.1)",
                }}
              >
                <div
                  className="px-3.5 py-2 flex items-center gap-2"
                  style={{
                    background: "linear-gradient(180deg, #1a1a2e 0%, #16162a 100%)",
                    borderBottom: "1px solid rgba(34,211,238,0.15)",
                  }}
                >
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: "#eab308" }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-medium ml-1.5" style={{ color: "rgba(241,245,251,0.5)" }}>
                    Kịch bản chi tiết · 4 cảnh · Omni Flash
                  </span>
                </div>
                <img
                  src="/images/updateveo31/flow-tool-detail.png"
                  alt="Google Flow — Kịch bản video chi tiết từng cảnh"
                  className="block w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Price highlight */}
          <div
            className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 rounded-2xl px-5 py-3.5 max-w-3xl w-full"
            style={{
              background: "rgba(14,23,48,0.6)",
              border: "1px solid rgba(59,130,246,0.18)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="flex items-center gap-2 text-[13px] sm:text-sm" style={{ color: "rgba(241,245,251,0.85)" }}>
              <BookOpen size={16} style={{ color: "#3B82F6" }} />
              <strong className="text-white">Khóa Học Online</strong> · Truy cập trọn đời
            </span>
            <span className="hidden sm:block h-4 w-px" style={{ background: "rgba(59,130,246,0.25)" }} />
            <span className="flex items-center gap-2 text-[13px] sm:text-sm" style={{ color: "rgba(241,245,251,0.85)" }}>
              <Crown size={16} style={{ color: "#F59E0B" }} />
              <span className="line-through" style={{ color: "rgba(241,245,251,0.45)" }}>500.000đ</span>
              <strong style={{ color: "#22D3EE" }}>→ Chỉ 200.000đ</strong>
            </span>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={scrollToRegister}
            className="group flex cursor-pointer items-center gap-3 rounded-xl px-8 sm:px-12 py-[16px] sm:py-[18px] text-base sm:text-lg font-bold transition-all duration-200 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
              color: "#000000",
              boxShadow: "0 0 40px rgba(245,158,11,0.4), 0 0 0 1px rgba(245,158,11,0.5)",
            }}
          >
            <Zap className="h-5 w-5" />
            ĐĂNG KÝ NGAY — CHỈ 200.000Đ
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>

          <p className="mt-3 text-[12px] sm:text-[13px]" style={{ color: "rgba(241,245,251,0.55)" }}>
            Giá gốc <span className="line-through">500.000đ</span> — Ưu đãi{" "}
            <strong style={{ color: "#22D3EE" }}>tiết kiệm 300K</strong> cho người đăng ký sớm
          </p>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}</style>
      </section>

      {/* ═══ PAIN POINTS ═══ */}
      <section
        className="relative overflow-hidden py-12 sm:py-20 md:py-24 px-4 sm:px-6"
        style={{ background: "#050913" }}
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-4">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{
                borderColor: "rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.06)",
                color: "#F87171",
              }}
            >
              <AlertCircle size={12} /> Vấn Đề
            </span>
          </div>
          <h2 className="mb-8 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]">
            Bạn đang gặp <span style={{ color: "#F87171" }}>khó khăn này?</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {PAIN_POINTS.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl p-4 sm:p-5"
                style={{
                  background: "rgba(239,68,68,0.04)",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <X size={12} strokeWidth={3} style={{ color: "#F87171" }} />
                </span>
                <span className="text-[14px] sm:text-[15px] leading-[1.65]" style={{ color: "rgba(241,245,251,0.8)" }}>
                  {p}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5 UPGRADES ═══ */}
      <section
        className="relative overflow-hidden py-12 sm:py-20 md:py-24 px-4 sm:px-6"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 60%), #0A1020",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-4">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{
                borderColor: "rgba(59,130,246,0.4)",
                background: "rgba(59,130,246,0.08)",
                color: "#3B82F6",
              }}
            >
              <Sparkles size={12} /> Lộ Trình Xây Tool
            </span>
          </div>
          <h2 className="mb-3 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]">
            <span style={{ color: "#22D3EE" }}>5 bước</span> xây tool video AI
          </h2>
          <p className="mb-10 text-center text-[14.5px] sm:text-[15px] leading-[1.75]" style={{ color: "rgba(241,245,251,0.65)" }}>
            Đơn giản — hiệu quả — từ zero đến tool hoàn chỉnh:
          </p>

          {/* Top row: 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {UPGRADES.slice(0, 3).map((u) => (
              <div
                key={u.num}
                className="rounded-2xl p-5 sm:p-6 flex flex-col"
                style={{
                  background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  border: "1px solid rgba(59,130,246,0.18)",
                  boxShadow: "0 10px 30px -20px rgba(0,0,0,0.5)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "rgba(59,130,246,0.15)",
                      border: "1px solid rgba(59,130,246,0.3)",
                      color: "#3B82F6",
                    }}
                  >
                    {u.icon}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: "#22D3EE" }}>
                      {u.num} · {u.subtitle}
                    </div>
                    <div className="text-base font-bold text-white">{u.title}</div>
                  </div>
                </div>
                <p className="text-[13.5px] leading-[1.7]" style={{ color: "rgba(241,245,251,0.72)" }}>
                  {u.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom row: 2 cards centered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {UPGRADES.slice(3).map((u) => (
              <div
                key={u.num}
                className="rounded-2xl p-5 sm:p-6 flex flex-col"
                style={{
                  background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  border: "1px solid rgba(59,130,246,0.18)",
                  boxShadow: "0 10px 30px -20px rgba(0,0,0,0.5)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "rgba(59,130,246,0.15)",
                      border: "1px solid rgba(59,130,246,0.3)",
                      color: "#3B82F6",
                    }}
                  >
                    {u.icon}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: "#22D3EE" }}>
                      {u.num} · {u.subtitle}
                    </div>
                    <div className="text-base font-bold text-white">{u.title}</div>
                  </div>
                </div>
                <p className="text-[13.5px] leading-[1.7]" style={{ color: "rgba(241,245,251,0.72)" }}>
                  {u.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ QUOTE ═══ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6" style={{ background: "#050913" }}>
        <div
          className="mx-auto max-w-3xl rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
            borderLeft: "4px solid #3B82F6",
            border: "1px solid rgba(59,130,246,0.2)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-4 select-none"
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: 700,
              fontSize: "120px",
              lineHeight: 1,
              color: "rgba(59,130,246,0.06)",
            }}
          >
            &ldquo;
          </div>
          <p className="relative text-[15px] sm:text-[17px] leading-[1.8] italic" style={{ color: "rgba(241,245,251,0.85)" }}>
            &ldquo;Người giỏi không phải người biết nhiều tool — mà là người tự xây được tool cho riêng mình. Khi bạn có tool video AI chạy tự động, bạn không còn làm video nữa — bạn xây hệ thống.&rdquo;
          </p>
          <div className="mt-4 text-[13px] font-semibold" style={{ color: "#3B82F6" }}>
            — Lê Đăng Khương
          </div>
        </div>
      </section>

      {/* ═══ AUDIENCE & BENEFITS ═══ */}
      <section
        className="relative overflow-hidden py-12 sm:py-20 md:py-24 px-4 sm:px-6"
        style={{ background: "#0A1020" }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
            {/* For whom */}
            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase mb-4"
                style={{ borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.06)", color: "#3B82F6" }}
              >
                <Users size={12} /> Dành Cho Ai
              </span>
              <h2 className="text-[22px] sm:text-2xl font-extrabold mb-6 text-white">
                Khóa học này dành cho bạn nếu...
              </h2>
              <div className="space-y-3">
                {AUDIENCE.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)" }}>
                    <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(59,130,246,0.12)", color: "#3B82F6" }}>
                      {a.icon}
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold text-white">{a.title}</div>
                      <div className="text-[13px] leading-[1.6]" style={{ color: "rgba(241,245,251,0.65)" }}>{a.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What you get */}
            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase mb-4"
                style={{ borderColor: "rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.06)", color: "#34D399" }}
              >
                <Check size={12} /> Bạn Nhận Được
              </span>
              <h2 className="text-[22px] sm:text-2xl font-extrabold mb-6 text-white">
                Sau khóa học, bạn có thể...
              </h2>
              <div className="space-y-3">
                {BENEFITS.map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)" }}>
                      <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#34D399" }} />
                    </span>
                    <span className="text-[14px] leading-[1.65]" style={{ color: "rgba(241,245,251,0.85)" }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MODULES ═══ */}
      <section
        className="relative overflow-hidden py-12 sm:py-20 md:py-24 px-4 sm:px-6"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 60%), #050913",
        }}
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-4">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ borderColor: "rgba(59,130,246,0.4)", background: "rgba(59,130,246,0.08)", color: "#3B82F6" }}
            >
              <BookOpen size={12} /> Nội Dung Khóa Học
            </span>
          </div>
          <h2 className="mb-8 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]">
            Nội dung <span style={{ color: "#22D3EE" }}>chi tiết từng phần</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {MODULES.map((a, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  border: `1px solid rgba(59,130,246,${i === 0 ? "0.35" : "0.18"})`,
                  boxShadow: i === 0 ? "0 0 30px rgba(59,130,246,0.15)" : undefined,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em]"
                    style={{
                      background: i === 0 ? "linear-gradient(135deg, #3B82F6 0%, #22D3EE 100%)" : "rgba(59,130,246,0.15)",
                      color: i === 0 ? "#fff" : "#3B82F6",
                    }}
                  >
                    {a.module}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-4">{a.title}</h3>
                <ul className="space-y-2.5">
                  {a.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
                        <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#3B82F6" }} />
                      </span>
                      <span className="text-[13.5px] leading-[1.6]" style={{ color: "rgba(241,245,251,0.78)" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BANNER ═══ */}
      <section className="py-8 sm:py-12 px-4 sm:px-6" style={{ background: "#0A1020" }}>
        <div className="mx-auto max-w-4xl">
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              border: "1px solid rgba(59,130,246,0.35)",
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6), 0 0 60px rgba(59,130,246,0.18)",
            }}
          >
            <img
              src="/images/updateveo31/banner.png"
              alt="Học Làm Tool Video Cho Người Mới Bắt Đầu — Khóa học Lê Đăng Khương"
              className="block w-full h-auto"
              loading="lazy"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                boxShadow: "0 0 0 1px rgba(59,130,246,0.2) inset, 0 0 60px rgba(59,130,246,0.12) inset",
              }}
            />
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section
        className="relative overflow-hidden py-12 sm:py-20 md:py-24 px-4 sm:px-6"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 70%), #0A1020",
        }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-4">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ borderColor: "rgba(59,130,246,0.4)", background: "rgba(59,130,246,0.08)", color: "#3B82F6" }}
            >
              <Crown size={12} /> Ưu Đãi Đặc Biệt
            </span>
          </div>
          <h2 className="mb-4 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]">
            Tiết kiệm <span style={{ color: "#22D3EE" }}>300.000đ</span> khi đăng ký sớm
          </h2>

          {/* Pricing card */}
          <div
            className="relative rounded-3xl p-7 sm:p-10 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #13203F 0%, #0A1020 100%)",
              border: "2px solid rgba(59,130,246,0.5)",
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6), 0 0 60px rgba(59,130,246,0.15)",
            }}
          >
            <div aria-hidden className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[200px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.2) 0%, transparent 70%)" }} />

            <div className="relative text-center">
              <div className="mb-6">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{
                    background: "linear-gradient(135deg, #3B82F6 0%, #22D3EE 100%)",
                    color: "#fff",
                    boxShadow: "0 8px 20px rgba(59,130,246,0.35)",
                  }}
                >
                  <Sparkles size={12} /> Khóa Học Trọn Bộ
                </span>
              </div>

              <div className="mb-1">
                <span className="text-2xl sm:text-3xl font-bold line-through" style={{ color: "rgba(241,245,251,0.35)" }}>
                  500.000đ
                </span>
              </div>
              <div className="mb-3">
                <span
                  className="text-6xl sm:text-7xl md:text-8xl font-extrabold tabular-nums tracking-[-0.03em] leading-none"
                  style={{
                    background: "linear-gradient(135deg, #3B82F6 0%, #22D3EE 50%, #3B82F6 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 4px 24px rgba(59,130,246,0.25))",
                  }}
                >
                  200.000đ
                </span>
              </div>
              <p className="text-[14px] sm:text-[15px] mb-8" style={{ color: "rgba(241,245,251,0.6)" }}>
                Ưu đãi ra mắt — tiết kiệm <strong style={{ color: "#22D3EE" }}>300K</strong> so với giá gốc
              </p>

              {/* Included */}
              <div
                className="rounded-2xl p-5 sm:p-6 mb-8 text-left"
                style={{
                  background: "rgba(59,130,246,0.06)",
                  border: "1px solid rgba(59,130,246,0.22)",
                }}
              >
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] mb-4 font-semibold text-center" style={{ color: "#3B82F6" }}>
                  Bạn Nhận Được
                </div>
                <ul className="space-y-3">
                  {INCLUDED.map((it, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)" }}>
                        <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#34D399" }} />
                      </span>
                      <span className="text-[13.5px] sm:text-[14px] leading-[1.6]" style={{ color: "rgba(241,245,251,0.85)" }}>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={scrollToRegister}
                className="group w-full flex items-center justify-center gap-3 rounded-xl px-8 py-4 sm:py-5 text-base sm:text-lg font-bold tracking-wide transition-all hover:scale-[1.02] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
                  color: "#000000",
                  boxShadow: "0 0 40px rgba(245,158,11,0.45), 0 8px 24px rgba(245,158,11,0.3)",
                }}
              >
                <Zap size={20} />
                ĐĂNG KÝ NGAY — 200.000Đ
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>

              <p className="mt-5 text-[13px]" style={{ color: "rgba(241,245,251,0.55)" }}>
                Đầu tư một lần — truy cập trọn đời. Giá sẽ tăng về 500K sau khi hết ưu đãi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SPEAKER ═══ */}
      <section className="py-12 sm:py-20 px-4 sm:px-6" style={{ background: "#050913" }}>
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-6">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.06)", color: "#3B82F6" }}
            >
              <Star size={12} /> Giảng Viên
            </span>
          </div>
          <div
            className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl p-6 sm:p-8"
            style={{
              background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
              border: "1px solid rgba(59,130,246,0.18)",
            }}
          >
            <img
              src="/images/about/portrait.jpg"
              alt="Thầy Lê Đăng Khương"
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover flex-shrink-0"
              style={{ border: "2px solid rgba(59,130,246,0.35)" }}
            />
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Thầy Lê Đăng Khương</h3>
              <div className="text-[12px] uppercase tracking-[0.15em] font-semibold mb-3" style={{ color: "#3B82F6" }}>
                KOHADA · AI Technology · Training · Video
              </div>
              <p className="text-[14px] leading-[1.75]" style={{ color: "rgba(241,245,251,0.72)" }}>
                11+ năm kinh nghiệm. 151K+ followers. Người tiên phong ứng dụng AI vào sản xuất video và kinh doanh sản phẩm số tại Việt Nam.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section
        className="relative overflow-hidden py-12 sm:py-20 md:py-24 px-4 sm:px-6"
        style={{ background: "#0A1020" }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-4">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.06)", color: "#3B82F6" }}
            >
              <HelpCircle size={12} /> Câu Hỏi Thường Gặp
            </span>
          </div>
          <h2 className="mb-8 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]">
            Bạn Còn <span style={{ color: "#22D3EE" }}>Băn Khoăn?</span>
          </h2>

          <div className="space-y-2 sm:space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = faqOpen === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                    border: `1px solid ${isOpen ? "rgba(59,130,246,0.35)" : "rgba(59,130,246,0.12)"}`,
                  }}
                >
                  <button
                    onClick={() => setFaqOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left cursor-pointer"
                  >
                    <span className="text-[15px] sm:text-base font-semibold text-white leading-[1.4]">{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className="flex-shrink-0 transition-transform"
                      style={{ color: "#3B82F6", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1">
                      <p className="text-[14px] sm:text-[14.5px] leading-[1.75]" style={{ color: "rgba(241,245,251,0.72)" }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ REGISTRATION FORM ═══ */}
      <section
        ref={registerRef}
        id="register"
        className="py-16 sm:py-24 px-4"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 60%), #050913",
        }}
      >
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase mb-5"
              style={{
                borderColor: "rgba(59,130,246,0.35)",
                background: "rgba(59,130,246,0.08)",
                color: "#3B82F6",
              }}
            >
              <Zap size={12} /> Đăng Ký
            </span>
            <h2 className="text-[26px] sm:text-3xl font-extrabold mb-3 text-white leading-tight">
              Đăng Ký & Thanh Toán
            </h2>
            <p className="text-[15px] sm:text-base leading-[1.75]" style={{ color: "rgba(241,245,251,0.55)" }}>
              Điền thông tin — nhận mã QR chuyển khoản trong 5 giây.
            </p>
            <div
              className="mt-5 inline-flex items-center gap-3 rounded-xl px-5 py-2.5"
              style={{
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.3)",
              }}
            >
              <span className="text-sm line-through" style={{ color: "rgba(241,245,251,0.4)" }}>500.000đ</span>
              <span className="text-xl font-extrabold" style={{ color: "#22D3EE" }}>200.000đ</span>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-2xl space-y-3"
            style={{
              background: "linear-gradient(180deg, #0E1730 0%, #0A1020 100%)",
              border: "1px solid rgba(59,130,246,0.18)",
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.05) inset",
            }}
          >
            {error && (
              <div className="p-4 rounded-lg flex items-start gap-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span className="text-red-300 leading-relaxed">{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "rgba(241,245,251,0.7)" }}>
                Email <span style={{ color: "#F87171" }}>*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.4)" }} />
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" className="w-full rounded-lg outline-none text-white" style={{ background: "#050913", border: `1px solid ${isReturningUser ? "rgba(59,130,246,0.45)" : "rgba(59,130,246,0.15)"}`, paddingLeft: "2.75rem", paddingRight: "2.75rem", paddingTop: "0.85rem", paddingBottom: "0.85rem" }} required />
                {emailCheck.status === "checking" && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "rgba(241,245,251,0.4)" }} />}
                {emailCheck.status === "exists" && <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#34D399" }} />}
              </div>
            </div>

            {/* Returning user banner */}
            {isReturningUser && (
              <div className="p-3.5 rounded-lg flex items-start gap-3 text-sm" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)" }}>
                <Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: "#34D399" }} />
                <div className="leading-relaxed">
                  <div className="font-semibold" style={{ color: "#34D399" }}>
                    Chào mừng quay lại!
                  </div>
                  <div className="text-[13px] mt-0.5" style={{ color: "rgba(241,245,251,0.7)" }}>
                    Email này đã có tài khoản — chỉ cần nhập đúng mật khẩu để tiếp tục.
                  </div>
                </div>
              </div>
            )}

            {/* Name + phone — only for new users */}
            {!isReturningUser && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(241,245,251,0.7)" }}>
                    Họ và tên <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.4)" }} />
                    <input name="full_name" type="text" value={form.full_name} onChange={handleChange} placeholder="Nguyễn Văn A" className="w-full rounded-lg outline-none text-white" style={{ background: "#050913", border: "1px solid rgba(59,130,246,0.15)", paddingLeft: "2.75rem", paddingRight: "1rem", paddingTop: "0.85rem", paddingBottom: "0.85rem" }} required={!isReturningUser} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(241,245,251,0.7)" }}>
                    Số điện thoại <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.4)" }} />
                    <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="0901 234 567" className="w-full rounded-lg outline-none text-white" style={{ background: "#050913", border: "1px solid rgba(59,130,246,0.15)", paddingLeft: "2.75rem", paddingRight: "1rem", paddingTop: "0.85rem", paddingBottom: "0.85rem" }} required={!isReturningUser} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "rgba(241,245,251,0.7)" }}>
                Mật khẩu <span style={{ color: "#F87171" }}>*</span>
                {!isReturningUser && <span style={{ color: "rgba(241,245,251,0.4)" }}> (tối thiểu 8 ký tự)</span>}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(241,245,251,0.4)" }} />
                <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="••••••••" className="w-full rounded-lg outline-none text-white" style={{ background: "#050913", border: "1px solid rgba(59,130,246,0.15)", paddingLeft: "2.75rem", paddingRight: "2.75rem", paddingTop: "0.85rem", paddingBottom: "0.85rem" }} minLength={isReturningUser ? 1 : 8} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "rgba(241,245,251,0.5)" }} tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isReturningUser && (
                <div className="mt-2 text-right">
                  <Link href={`/forgot-password${form.email ? `?email=${encodeURIComponent(form.email)}` : ""}`} className="text-[12px] sm:text-[13px] hover:underline" style={{ color: "#3B82F6" }}>
                    Quên mật khẩu?
                  </Link>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-4 mt-4 text-base sm:text-lg font-bold uppercase tracking-wide transition-all hover:opacity-95 hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
              style={{
                background: "#EAB308",
                color: "#000000",
                boxShadow: "0 0 30px rgba(234,179,8,0.4)",
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {loading ? "Đang xử lý..." : "ĐĂNG KÝ — 200.000Đ"}
            </button>

            <div className="flex items-center justify-center gap-4 pt-3 text-xs" style={{ color: "rgba(241,245,251,0.45)" }}>
              <span>🔒 Thanh toán an toàn</span>
              <span>•</span>
              <span>⚡ Xác nhận tự động</span>
            </div>

            <p className="text-[11px] text-center leading-relaxed pt-1" style={{ color: "rgba(241,245,251,0.4)" }}>
              Bằng việc đăng ký, bạn đồng ý điều khoản sử dụng của Lê Đăng Khương Academy.
            </p>
            <p className="text-xs text-center pt-3" style={{ color: "rgba(241,245,251,0.55)" }}>
              Đã có tài khoản?{" "}
              <span style={{ color: "#3B82F6" }}>Nhập đúng email & mật khẩu — hệ thống tự tạo đơn hàng.</span>
            </p>
          </form>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section
        className="relative overflow-hidden py-12 sm:py-20 md:py-24 px-4 sm:px-6"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 70%), #0A1020",
        }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]">
            Tự xây <span style={{ color: "#22D3EE" }}>tool video AI</span> của riêng bạn
          </h2>
          <p className="mb-8 text-[14.5px] sm:text-[15px] leading-[1.75]" style={{ color: "rgba(241,245,251,0.65)" }}>
            Đừng chỉ dùng tool người khác làm — hãy tự xây tool cho mình. Đơn giản, hiệu quả, và chạy tự động mỗi ngày.
          </p>

          <button
            onClick={scrollToRegister}
            className="group inline-flex items-center gap-3 rounded-xl px-8 sm:px-12 py-4 sm:py-5 text-base sm:text-lg font-bold tracking-wide transition-all hover:scale-[1.03] cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
              color: "#000000",
              boxShadow: "0 0 40px rgba(245,158,11,0.45), 0 10px 24px -10px rgba(245,158,11,0.55)",
            }}
          >
            <Zap size={20} />
            ĐĂNG KÝ NGAY — CHỈ 200.000Đ
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>

          <div className="mt-5">
            <a
              href={siteConfig.socials.zalo}
              target="_blank"
              rel="noopener noreferrer"
              className="group/zalo inline-flex items-center gap-2 text-[13px] sm:text-sm font-medium border-b border-dashed transition-colors"
              style={{ color: "rgba(241,245,251,0.75)", borderColor: "rgba(59,130,246,0.45)" }}
            >
              <MessageCircle size={15} strokeWidth={2.2} style={{ color: "#3B82F6" }} />
              Vẫn lăn tăn? Inbox Zalo Thầy
              <ArrowRight size={14} className="transition-transform group-hover/zalo:translate-x-1" style={{ color: "#3B82F6" }} />
            </a>
          </div>
        </div>
      </section>

      {/* ═══ STICKY BOTTOM CTA ═══ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4"
        style={{
          background: "rgba(5,9,19,0.92)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(59,130,246,0.18)",
        }}
      >
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
          <div className="hidden sm:flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #3B82F6 0%, #22D3EE 100%)", boxShadow: "0 0 18px rgba(59,130,246,0.35)" }}>
              <Zap size={18} style={{ color: "#fff" }} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold leading-none mb-1" style={{ color: "#22D3EE" }}>
                Xây Tool Video AI · Đơn Giản
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm line-through" style={{ color: "rgba(241,245,251,0.35)" }}>500K</span>
                <span className="text-base sm:text-lg font-extrabold text-white leading-none tabular-nums">200.000đ</span>
              </div>
            </div>
          </div>
          <button
            onClick={scrollToRegister}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl py-3.5 sm:py-3 px-6 sm:px-7 text-base font-bold uppercase tracking-wide cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #EAB308 0%, #F59E0B 100%)",
              color: "#000000",
              boxShadow: "0 -2px 24px rgba(234,179,8,0.3)",
            }}
          >
            <Zap size={16} />
            Đăng Ký Ngay
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="h-20 sm:h-24" />

      {/* ═══ PAYMENT MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div
            className="relative w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh]"
            style={{
              background: "linear-gradient(180deg, #0E1730 0%, #0A1020 100%)",
              border: "1px solid rgba(59,130,246,0.25)",
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)",
            }}
          >
            {paymentStatus === "paid" ? (
              <div className="p-6 sm:p-8">
                {/* Success header */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.5)" }}>
                    <CheckCircle size={40} style={{ color: "#22c55e" }} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Thanh Toán Thành Công! 🎉</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(241,245,251,0.6)" }}>
                    Khóa học đã được mở khóa. Hãy thực hiện <strong className="text-white">2 bước</strong> bên dưới ngay nhé!
                  </p>
                </div>

                {/* Step 1: Check email */}
                <div
                  className="rounded-xl p-4 mb-3"
                  style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, #3B82F6 0%, #22D3EE 100%)", color: "#fff" }}
                    >
                      1
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white mb-1">📧 Kiểm tra Email</div>
                      <p className="text-[13px] leading-relaxed" style={{ color: "rgba(241,245,251,0.65)" }}>
                        Email xác nhận đã được gửi kèm thông tin truy cập khóa học. Kiểm tra cả thư mục <strong className="text-white">Spam/Promotions</strong> nhé.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Join Zalo group */}
                <div
                  className="rounded-xl p-4 mb-5"
                  style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, #3B82F6 0%, #22D3EE 100%)", color: "#fff" }}
                    >
                      2
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white mb-1">💬 Vào Nhóm Zalo Học Viên</div>
                      <p className="text-[13px] leading-relaxed mb-3" style={{ color: "rgba(241,245,251,0.65)" }}>
                        Tham gia nhóm để nhận thông báo, tài liệu và hỗ trợ.
                      </p>
                      <a
                        href="https://zalo.me/g/fox4t1gvyqaogbenaqmo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]"
                        style={{ background: "linear-gradient(135deg, #0068FF 0%, #0099FF 100%)", color: "#fff", boxShadow: "0 4px 12px rgba(0,104,255,0.3)" }}
                      >
                        <MessageCircle size={16} />
                        Vào Nhóm Zalo Ngay
                        <ArrowRight size={14} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* CTA buttons */}
                <a
                  href={COURSE_URL}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl text-base font-bold transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", color: "#fff", boxShadow: "0 4px 16px rgba(34,197,94,0.3)" }}
                >
                  Vào Khóa Học
                  <ArrowRight size={16} />
                </a>
                <button onClick={() => setShowModal(false)} className="block w-full mt-3 py-2 text-sm cursor-pointer" style={{ color: "rgba(241,245,251,0.5)" }}>
                  Đóng
                </button>
              </div>
            ) : (
              <>
                <div className="p-8 text-center" style={{ background: "linear-gradient(180deg, rgba(59,130,246,0.12) 0%, transparent 100%)", borderBottom: "1px solid rgba(59,130,246,0.15)" }}>
                  <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(59,130,246,0.15)", border: "2px solid rgba(59,130,246,0.4)" }}>
                    <CheckCircle size={36} style={{ color: "#3B82F6" }} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Đăng Ký Thành Công!</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(241,245,251,0.6)" }}>
                    Khóa Học Làm Tool Video Cho Người Mới Bắt Đầu
                  </p>
                </div>

                <div className="p-6 sm:p-8">
                  {paymentInfo?.qr_url && (
                    <div className="mb-8">
                      <p className="text-sm sm:text-base font-semibold text-white mb-4 text-center leading-relaxed">
                        Chuyển khoản{" "}
                        <span style={{ color: "#22D3EE" }}>{paymentInfo.amount.toLocaleString("vi-VN")}đ</span>{" "}
                        để mở khóa học:
                      </p>
                      <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-xl bg-white">
                          <img src={paymentInfo.qr_url} alt="QR thanh toán" width={220} height={220} className="block" />
                        </div>
                      </div>

                      {/* Hướng dẫn chụp QR */}
                      <div className="p-3 rounded-lg mb-5 text-xs leading-relaxed" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                        <p className="font-semibold text-[#f59e0b] mb-1.5">📱 Hướng dẫn thanh toán:</p>
                        <ol className="text-gray-400 space-y-1 list-decimal list-inside">
                          <li><strong className="text-gray-300">Chụp màn hình</strong> mã QR ở trên</li>
                          <li>Mở <strong className="text-gray-300">app ngân hàng</strong> trên điện thoại</li>
                          <li>Chọn <strong className="text-gray-300">Quét mã QR</strong> hoặc <strong className="text-gray-300">QR Pay</strong></li>
                          <li>Quét mã QR đã chụp → Xác nhận chuyển khoản</li>
                        </ol>
                        <p className="text-gray-500 mt-2 italic">Hoặc bấm nút &ldquo;Chuyển khoản ngay&rdquo; bên dưới để mở app ngân hàng tự động.</p>
                      </div>

                      <div className="space-y-3">
                        {[
                          ...(paymentInfo.bank_code ? [{ label: "Ngân hàng", value: BANK_NAMES[paymentInfo.bank_code.toUpperCase()] || paymentInfo.bank_code, key: "bank", copyable: true, highlight: false }] : []),
                          ...(paymentInfo.bank_account ? [{ label: "Số tài khoản", value: paymentInfo.bank_account, key: "account", copyable: true, highlight: false }] : []),
                          { label: "Số tiền", value: `${paymentInfo.amount.toLocaleString("vi-VN")}đ`, key: "amount", copyable: true, highlight: true },
                          { label: "Nội dung CK", value: paymentInfo.transfer_content, key: "content", copyable: true, highlight: false },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-4 rounded-lg" style={{ background: "#050913", border: "1px solid rgba(59,130,246,0.1)" }}>
                            <span className="text-xs sm:text-sm" style={{ color: "rgba(241,245,251,0.6)" }}>{item.label}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm sm:text-base font-semibold ${item.highlight ? "" : "text-white font-mono"}`} style={item.highlight ? { color: "#22D3EE" } : undefined}>{item.value}</span>
                              {item.copyable && (
                                <button onClick={() => copyText(item.value, item.key)} className="p-1.5 rounded-md transition-all active:scale-90" style={{ color: "rgba(241,245,251,0.5)" }} title={`Copy ${item.label}`}>
                                  {copied === item.key ? <Check size={14} style={{ color: "#3B82F6" }} /> : <Copy size={14} />}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {paymentInfo.bank_account && paymentInfo.bank_code && (
                        <BankTransferButtons
                          bankAccount={paymentInfo.bank_account}
                          bankCode={paymentInfo.bank_code}
                          amount={paymentInfo.amount}
                          transferContent={paymentInfo.transfer_content}
                          accentColor="#3B82F6"
                        />
                      )}

                      <div className="mt-4 p-4 rounded-lg text-sm leading-relaxed" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", color: "rgba(241,245,251,0.7)" }}>
                        <span className="font-medium" style={{ color: "#3B82F6" }}>⚡ Tự động xác nhận</span> — Sau khi chuyển khoản, hệ thống tự động mở khóa học trong 60 giây.
                      </div>
                    </div>
                  )}

                  {!paymentInfo?.qr_url && paymentInfo && (
                    <div className="mb-8 p-5 rounded-xl" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)" }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: "#3B82F6" }}>📞 Liên hệ thanh toán</p>
                      <p className="text-sm leading-relaxed" style={{ color: "rgba(241,245,251,0.65)" }}>
                        Vui lòng liên hệ admin qua Zalo <strong className="text-white">{getZaloPhone()}</strong> để nhận thông tin chuyển khoản.
                      </p>
                    </div>
                  )}

                  <div className="p-5 rounded-xl space-y-4" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    <h4 className="text-sm font-semibold text-white">Sau khi thanh toán:</h4>
                    <ol className="text-sm space-y-2 list-decimal list-inside" style={{ color: "rgba(241,245,251,0.65)" }}>
                      <li>Hệ thống tự động xác nhận trong 60 giây</li>
                      <li>Bạn nhận email chứa link truy cập khóa học</li>
                      <li>Được add vào nhóm Zalo học viên</li>
                    </ol>
                    <p className="text-xs" style={{ color: "rgba(241,245,251,0.45)" }}>
                      Cần hỗ trợ? Liên hệ Zalo:{" "}
                      <a href={siteConfig.socials.zalo} className="hover:underline" style={{ color: "#3B82F6" }} target="_blank" rel="noopener noreferrer">
                        {getZaloPhone()}
                      </a>
                    </p>
                  </div>

                  <button onClick={() => setShowModal(false)} className="w-full mt-6 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer" style={{ border: "1px solid rgba(59,130,246,0.2)", color: "rgba(241,245,251,0.65)" }}>
                    Đóng
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
