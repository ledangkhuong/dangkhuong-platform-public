"use client";

import { useState, useRef } from "react";
import {
  Coffee,
  Star,
  AlertCircle,
  BookOpen,
  Globe,
  Search,
  Layout,
  Lightbulb,
  TrendingUp,
  Award,
  Check,
  X,
  ChevronDown,
  ArrowRight,
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import BankTransferButtons from "@/components/BankTransferButtons";

/* ─── Types ──────────────────────────────────────────── */

interface PaymentInfo {
  order_code: string;
  amount: number;
  transfer_content: string;
  qr_url: string | null;
  bank_account: string | null;
  bank_code: string | null;
}

/* ─── Data ───────────────────────────────────────────── */

const PAIN_POINTS = [
  {
    icon: "😵",
    title: "Muốn kinh doanh online nhưng không biết bán gì",
    desc: "Lướt mạng cả ngày, đọc hàng trăm bài nhưng vẫn không ra ý tưởng nào khả thi.",
  },
  {
    icon: "😤",
    title: "Đã thử nhiều mô hình nhưng chưa có gì ra tiền",
    desc: "Dropshipping, affiliate, bán khoá học… thử hết rồi nhưng không bền.",
  },
  {
    icon: "😰",
    title: "Sợ đầu tư sai, mất thời gian và tiền bạc",
    desc: "Mỗi lần bắt đầu lại tốn 3–6 tháng, cuối cùng quay về vạch xuất phát.",
  },
  {
    icon: "🤷",
    title: "Không có mentor, không biết ai đã thành công thật",
    desc: 'Nghe nhiều "guru" nhưng không ai cho thấy mô hình cụ thể.',
  },
  {
    icon: "😔",
    title: "Thấy người khác kiếm tiền online mà mình thì không",
    desc: "Mỗi ngày lướt thấy người ta khoe doanh thu, còn mình vẫn đang loay hoay.",
  },
  {
    icon: "🧩",
    title: "Biết sản phẩm số là xu hướng nhưng không biết bắt đầu",
    desc: "Ebook, khoá học, template… nghe thì dễ nhưng làm thì không biết cách.",
  },
];

const FEATURES = [
  {
    icon: TrendingUp,
    tag: "Nghiên cứu",
    title: "100 mô hình kinh doanh sản phẩm số thực tế",
    benefit: "Không cần tự nghĩ — chọn 1 mô hình phù hợp và bắt đầu ngay",
    color: "#D4A843",
  },
  {
    icon: Globe,
    tag: "Case Study",
    title: "Case study từ solopreneur triệu đô toàn cầu",
    benefit: "Học từ người đã làm được, không phải từ lý thuyết suông",
    color: "#3b82f6",
  },
  {
    icon: Search,
    tag: "Việt Nam",
    title: "Phân tích bản địa hoá cho thị trường Việt Nam",
    benefit: "Biết cái nào áp dụng được, cái nào cần điều chỉnh",
    color: "#f59e0b",
  },
  {
    icon: Layout,
    tag: "Phân loại",
    title: "Phân loại theo ngành & mức đầu tư",
    benefit: "Dễ tìm mô hình phù hợp với khả năng và nguồn lực của bạn",
    color: "#8b5cf6",
  },
  {
    icon: BookOpen,
    tag: "Framework",
    title: "Framework xây dựng sản phẩm số từ 0",
    benefit: "Có lộ trình rõ ràng từng bước, không mò mẫm",
    color: "#ec4899",
  },
  {
    icon: Lightbulb,
    tag: "Bài học",
    title: "Bài học thất bại & sai lầm phổ biến",
    benefit: "Tránh mất 6–12 tháng đi sai hướng như người khác",
    color: "#ef4444",
  },
];

const BEFORE_AFTER: [string, string][] = [
  [
    "Lướt mạng cả ngày tìm ý tưởng",
    "Chọn được 2–3 mô hình phù hợp trong 1 buổi",
  ],
  [
    "Copy mô hình nước ngoài nhưng fail",
    "Hiểu cách bản địa hoá cho Việt Nam",
  ],
  ["Không biết bắt đầu từ đâu", "Có lộ trình rõ ràng từ A → Z"],
  [
    "Sợ rủi ro, không dám bắt đầu",
    "Tự tin vì đã thấy 100 người làm được",
  ],
  [
    "Mất 6–12 tháng thử sai",
    "Tiết kiệm thời gian, đi thẳng vào mô hình đúng",
  ],
];

const FAQ_DATA = [
  {
    q: "Tài liệu ở dạng gì?",
    a: "PDF chất lượng cao, đọc được trên điện thoại & máy tính. Gửi ngay sau khi thanh toán thành công.",
  },
  {
    q: "99K mua cafe hay mua tài liệu?",
    a: "Bạn mời tôi ly cafe 99K — tôi tặng bạn tài liệu nghiên cứu mà tôi đã bỏ hàng trăm giờ tổng hợp. Win-win. ☕",
  },
  {
    q: "Có áp dụng được cho thị trường Việt Nam không?",
    a: "Có. Mỗi mô hình đều có phần phân tích riêng cho thị trường VN — cái nào làm được ngay, cái nào cần điều chỉnh.",
  },
  {
    q: "Tôi chưa có kinh nghiệm kinh doanh, có đọc được không?",
    a: "Hoàn toàn được. Tài liệu viết cho cả người mới bắt đầu lẫn người đã có kinh nghiệm.",
  },
  {
    q: "Có được hỗ trợ sau khi mua không?",
    a: "Bạn được tham gia cộng đồng Lê Đăng Khương Academy để trao đổi và hỏi đáp.",
  },
  {
    q: "Thanh toán bằng cách nào?",
    a: "Chuyển khoản ngân hàng qua mã QR — xác nhận tự động, nhận tài liệu ngay lập tức.",
  },
];

/* ─── Component ──────────────────────────────────────── */

export default function CafeLanding() {
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu tối thiểu 8 ký tự");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cafe/register", {
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

  /* ─── Render ─────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ═══ NAVBAR ═══ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between"
        style={{
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/images/about/portrait.jpg" alt="Lê Đăng Khương" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-semibold text-sm text-white hidden sm:block">
            Lê Đăng Khương
          </span>
        </Link>
        <button
          onClick={scrollToForm}
          className="btn-green text-xs py-2 px-4"
        >
          <Coffee size={14} /> Nhận Tài Liệu — 99K
        </button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-24 sm:pt-32 pb-8 sm:pb-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-10"
            style={{
              background: "rgba(212,168,67,0.1)",
              border: "1px solid rgba(212,168,67,0.25)",
              color: "#D4A843",
            }}
          >
            <Coffee size={13} /> Chương trình giới hạn — Dành cho người
            nghiêm túc
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.3] sm:leading-[1.25] mb-8">
            Mời Bạn Ly Cafe 99K
            <br />
            Tôi Tặng Bạn{" "}
            <span className="text-[#D4A843]">
              100 Mô Hình Kinh Doanh Triệu Đô
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Tài liệu nghiên cứu 100 mô hình kinh doanh sản phẩm số từ những
            cá nhân doanh thu 1 triệu đô la trên thế giới — đã được phân tích
            và bản địa hoá để ứng dụng ngay tại Việt Nam.
          </p>

          <button
            onClick={scrollToForm}
            className="btn-green text-sm sm:text-base py-3.5 px-8"
          >
            Nhận Tài Liệu Ngay — 99K <ArrowRight size={16} />
          </button>

          <div className="flex items-center justify-center gap-3 sm:gap-5 mt-8 text-xs sm:text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  className="text-yellow-500 fill-yellow-500"
                />
              ))}
              <span className="ml-1 text-gray-400">4.9/5</span>
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">1,200+ học viên</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">Lê Đăng Khương Academy</span>
          </div>
        </div>
      </section>

      {/* ═══ PAIN POINTS ═══ */}
      <section
        className="py-8 sm:py-10 px-4"
        style={{ background: "#080808" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6">
              Bạn Có Đang Gặp Những Điều Này?
            </h2>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Nếu bạn thấy mình trong những tình huống dưới đây — bạn cần đọc
              tiếp.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {PAIN_POINTS.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-4 sm:gap-5 p-5 sm:p-6 rounded-xl"
                style={{
                  background: "rgba(239,68,68,0.03)",
                  border: "1px solid rgba(239,68,68,0.1)",
                }}
              >
                <span className="text-2xl sm:text-3xl shrink-0 mt-0.5">
                  {p.icon}
                </span>
                <div>
                  <h3 className="font-semibold text-white text-sm sm:text-base mb-2">
                    {p.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-8 p-5 sm:p-6 rounded-xl text-center"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <p className="text-sm sm:text-base text-[#f59e0b] leading-relaxed">
              Nếu bạn gặp <strong>3 trong 6</strong> vấn đề trên — tài liệu
              này dành cho bạn.
              <br />
              Nếu bạn gặp 5 hoặc 6 — bạn cần đọc nó{" "}
              <strong>NGAY HÔM NAY</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ SOLUTION ═══ */}
      <section className="py-8 sm:py-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 leading-snug">
            Tôi Đã Nghiên Cứu{" "}
            <span className="text-[#D4A843]">100 Mô Hình Kinh Doanh</span>{" "}
            Sản Phẩm Số Doanh Thu Triệu Đô
          </h2>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-10 max-w-xl mx-auto">
            Đây không phải ebook lý thuyết. Đây là kết quả nghiên cứu thực tế
            100 cá nhân và doanh nghiệp nhỏ đã đạt doanh thu từ 1 triệu đô la
            trở lên chỉ bằng sản phẩm số — từ khoá học online, template, SaaS,
            community, đến digital service.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
            <span className="text-gray-500">Mỗi mô hình được phân tích:</span>
            {[
              "Họ bán gì",
              "Bán cho ai",
              "Bán bằng cách nào",
              "Doanh thu bao nhiêu",
              "Ứng dụng cho VN ra sao",
            ].map((t, i) => (
              <span key={i} className="text-[#D4A843] font-medium">
                {t}
                {i < 4 ? " ·" : ""}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section
        className="py-8 sm:py-10 px-4"
        style={{ background: "#080808" }}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Bên Trong Tài Liệu Có Gì?
          </h2>

          <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="p-6 sm:p-7 rounded-xl transition-all duration-200 hover:-translate-y-1"
                style={{ background: "#111", border: "1px solid #1f1f1f" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: f.color + "15" }}
                  >
                    <f.icon size={20} style={{ color: f.color }} />
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: f.color + "15", color: f.color }}
                  >
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-sm sm:text-base mb-3 leading-snug">
                  {f.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                  {f.benefit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AUTHOR ═══ */}
      <section className="py-8 sm:py-10 px-4">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Ai Đứng Sau Tài Liệu Này?
          </h2>

          <div
            className="p-8 sm:p-10 rounded-2xl text-center"
            style={{ background: "#111", border: "1px solid #1f1f1f" }}
          >
            <img
              src="/images/about/portrait.jpg"
              alt="Lê Đăng Khương"
              className="w-24 h-24 rounded-full mx-auto mb-6 object-cover"
            />

            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Lê Đăng Khương
            </h3>
            <p className="text-sm sm:text-base text-[#D4A843] font-medium mb-6">
              Chuyên gia Marketing & Thương hiệu cá nhân
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <Award size={15} className="text-[#f59e0b]" /> 1,200+ học
                viên
              </span>
              <span className="flex items-center gap-2">
                <BookOpen size={15} className="text-[#3b82f6]" /> Founder
                Lê Đăng Khương Academy
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-6 italic leading-relaxed">
              &ldquo;Một ly cafe có thể thay đổi cả hướng đi kinh
              doanh&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ═══ BEFORE / AFTER ═══ */}
      <section
        className="py-8 sm:py-10 px-4"
        style={{ background: "#080808" }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Trước vs. Sau Khi Có Tài Liệu
          </h2>

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            {/* Before */}
            <div
              className="p-6 sm:p-8 rounded-xl"
              style={{
                background: "rgba(239,68,68,0.03)",
                border: "1px solid rgba(239,68,68,0.12)",
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <X size={16} className="text-red-400" />
                </div>
                <span className="font-bold text-red-400 text-sm uppercase tracking-wide">
                  Trước
                </span>
              </div>
              <div className="space-y-3">
                {BEFORE_AFTER.map(([before], i) => (
                  <div key={i} className="flex items-start gap-3">
                    <X
                      size={14}
                      className="text-red-400/50 mt-1 shrink-0"
                    />
                    <span className="text-sm text-gray-400 leading-relaxed">
                      {before}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div
              className="p-6 sm:p-8 rounded-xl"
              style={{
                background: "rgba(212,168,67,0.03)",
                border: "1px solid rgba(212,168,67,0.12)",
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Check size={16} className="text-[#D4A843]" />
                </div>
                <span className="font-bold text-[#D4A843] text-sm uppercase tracking-wide">
                  Sau
                </span>
              </div>
              <div className="space-y-3">
                {BEFORE_AFTER.map(([, after], i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check
                      size={14}
                      className="text-[#D4A843]/50 mt-1 shrink-0"
                    />
                    <span className="text-sm text-gray-300 leading-relaxed">
                      {after}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VALUE STACK ═══ */}
      <section className="py-8 sm:py-10 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-10">
            Tất Cả Chỉ Với Giá Một Ly Cafe ☕
          </h2>

          <div
            className="p-7 sm:p-10 rounded-2xl text-left"
            style={{ background: "#111", border: "1px solid #1f1f1f" }}
          >
            <div className="space-y-3 mb-8">
              {[
                ["Nghiên cứu 100 mô hình kinh doanh", "2.000.000đ"],
                ["Phân tích bản địa hoá Việt Nam", "500.000đ"],
                ["Framework xây sản phẩm số từ 0", "500.000đ"],
              ].map(([item, value], i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex items-center gap-3 text-sm text-gray-300">
                    <Check size={15} className="text-[#D4A843] shrink-0" />{" "}
                    {item}
                  </span>
                  <span className="text-sm text-gray-500 line-through shrink-0">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#2a2a2a] pt-6 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Tổng giá trị:</span>
                <span className="text-xs text-gray-500 line-through">
                  3.000.000đ
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-bold text-white">
                  Hôm nay bạn chỉ cần:
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#D4A843]">
                  99K
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 text-right">
                Đúng vậy — bằng giá một ly cafe.
              </p>
            </div>

            <button
              onClick={scrollToForm}
              className="btn-green w-full justify-center text-sm sm:text-base py-3.5"
            >
              <Coffee size={16} /> Mời Cafe & Nhận Tài Liệu Ngay{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ IS FOR / NOT FOR ═══ */}
      <section
        className="py-8 sm:py-10 px-4"
        style={{ background: "#080808" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            {/* For */}
            <div
              className="p-6 sm:p-8 rounded-xl"
              style={{
                background: "rgba(212,168,67,0.03)",
                border: "1px solid rgba(212,168,67,0.12)",
              }}
            >
              <h3 className="font-bold text-[#D4A843] text-sm sm:text-base mb-6 flex items-center gap-2">
                <CheckCircle size={18} /> Dành cho bạn nếu:
              </h3>
              <div className="space-y-3">
                {[
                  "Muốn kinh doanh sản phẩm số nhưng chưa biết bắt đầu",
                  "Đã có kinh nghiệm nhưng muốn thêm ý tưởng mới",
                  "Muốn học từ người đã thành công thay vì tự mò",
                  "Sẵn sàng hành động, không chỉ đọc cho vui",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check
                      size={15}
                      className="text-[#D4A843] mt-1 shrink-0"
                    />
                    <span className="text-sm text-gray-300 leading-relaxed">
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Not for */}
            <div
              className="p-6 sm:p-8 rounded-xl"
              style={{
                background: "rgba(239,68,68,0.03)",
                border: "1px solid rgba(239,68,68,0.1)",
              }}
            >
              <h3 className="font-bold text-red-400 text-sm sm:text-base mb-6 flex items-center gap-2">
                <AlertCircle size={18} /> Không dành cho bạn nếu:
              </h3>
              <div className="space-y-3">
                {[
                  'Tìm cách "làm giàu nhanh" không cần nỗ lực',
                  "Không muốn đọc và nghiên cứu",
                  "Nghĩ 99K là đắt cho kiến thức",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <X
                      size={15}
                      className="text-red-400/60 mt-1 shrink-0"
                    />
                    <span className="text-sm text-gray-400 leading-relaxed">
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ REGISTRATION FORM ═══ */}
      <section ref={formRef} id="register" className="py-8 sm:py-10 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D4A843]/10 mb-6">
              <Coffee size={28} className="text-[#D4A843]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Đăng Ký & Nhận Tài Liệu
            </h2>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Điền thông tin bên dưới để tạo tài khoản và nhận tài liệu ngay
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-2xl space-y-3"
            style={{ background: "#111", border: "1px solid rgba(212,168,67,0.12)" }}
          >
            {error && (
              <div
                className="p-4 rounded-lg flex items-start gap-3 text-sm"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <AlertCircle
                  size={16}
                  className="text-red-400 shrink-0 mt-0.5"
                />
                <span className="text-red-400 leading-relaxed">{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#111",
                    border: "1px solid rgba(212,168,67,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                  required
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Họ và tên <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  name="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#111",
                    border: "1px solid rgba(212,168,67,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Số điện thoại <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0901 234 567"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#111",
                    border: "1px solid rgba(212,168,67,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Mật khẩu <span className="text-red-400">*</span>{" "}
                <span className="text-gray-500">(tối thiểu 8 ký tự)</span>
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg outline-none text-white"
                  style={{
                    background: "#111",
                    border: "1px solid rgba(212,168,67,0.15)",
                    paddingLeft: "2.75rem",
                    paddingRight: "2.75rem",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                  }}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-4 mt-4 text-base sm:text-lg font-bold uppercase tracking-wide transition-all hover:opacity-95 hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #D4A843 0%, #B8944A 100%)",
                color: "#0A1020",
                boxShadow: "0 0 30px rgba(212,168,67,0.4)",
              }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Coffee size={18} />
              )}
              {loading ? "Đang xử lý..." : "ĐĂNG KÝ & THANH TOÁN — 99.000Đ"}
            </button>

            <div className="flex items-center justify-center gap-4 pt-3 text-xs text-gray-500">
              <span>🔒 Thanh toán an toàn</span>
              <span>•</span>
              <span>⚡ Cấp khóa tự động</span>
            </div>

            <p className="text-[11px] text-gray-500 text-center leading-relaxed pt-2">
              Bằng việc đăng ký, bạn đồng ý với điều khoản sử dụng của Đăng
              Khương Academy.
            </p>
            <p className="text-xs text-center pt-3 text-gray-400">
              Đã có tài khoản?{" "}
              <span className="text-[#FBBF24]">
                Nhập đúng email &amp; mật khẩu — hệ thống tự tạo đơn hàng.
              </span>
            </p>
          </form>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section
        className="py-8 sm:py-10 px-4"
        style={{ background: "#080808" }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Câu Hỏi Thường Gặp
          </h2>

          <div className="space-y-4">
            {FAQ_DATA.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{ background: "#111", border: "1px solid #1f1f1f" }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left gap-4"
                >
                  <span className="text-sm sm:text-base font-medium text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-500 shrink-0 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    openFaq === i ? "max-h-48" : "max-h-0"
                  }`}
                >
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-gray-400 leading-relaxed border-t border-[#1f1f1f] pt-4">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-8 sm:py-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8">
            Hai Con Đường Của Bạn
          </h2>

          <div className="grid sm:grid-cols-2 gap-6 mb-10">
            <div
              className="p-6 sm:p-8 rounded-xl text-left"
              style={{
                background: "rgba(239,68,68,0.03)",
                border: "1px solid rgba(239,68,68,0.1)",
              }}
            >
              <span className="text-4xl font-black text-red-400/20">01</span>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed mt-4">
                Tiếp tục lướt mạng, thử sai, mất thêm 6–12 tháng mà vẫn chưa
                tìm được mô hình phù hợp.
              </p>
            </div>

            <div
              className="p-6 sm:p-8 rounded-xl text-left"
              style={{
                background: "rgba(212,168,67,0.03)",
                border: "1px solid rgba(212,168,67,0.12)",
              }}
            >
              <span className="text-4xl font-black text-[#D4A843]/20">
                02
              </span>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed mt-4">
                Đầu tư{" "}
                <strong className="text-[#D4A843]">99K</strong> — bằng một ly
                cafe — để có ngay 100 mô hình đã được chứng minh, nghiên cứu
                kỹ, và sẵn sàng ứng dụng.
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-gray-500 mb-10 max-w-md mx-auto leading-relaxed">
            Quyết định nằm ở bạn. Nhưng mỗi ngày trôi qua mà không hành
            động, là một ngày bạn lại đi sau những người đã bắt đầu.
          </p>

          <button
            onClick={scrollToForm}
            className="btn-green text-sm sm:text-base py-3.5 px-8"
          >
            <Coffee size={16} /> Mời Cafe & Nhận Tài Liệu Ngay — 99K{" "}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-10 px-4 text-center border-t border-[#1a1a1a]">
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Lê Đăng Khương Academy. All rights
          reserved.
        </p>
        <div className="flex items-center justify-center gap-5 mt-3">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Trang chủ
          </Link>
          <Link
            href="/login"
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Đăng nhập
          </Link>
        </div>
      </footer>

      {/* ═══ STICKY MOBILE CTA ═══ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:hidden"
        style={{
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #1a1a1a",
        }}
      >
        <button
          onClick={scrollToForm}
          className="btn-green w-full justify-center text-sm py-3"
        >
          <Coffee size={14} /> Nhận Tài Liệu — 99K{" "}
          <ArrowRight size={14} />
        </button>
      </div>

      {/* ═══ THANK YOU MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          <div
            className="relative w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh]"
            style={{ background: "#111", border: "1px solid #1f1f1f" }}
          >
            {/* Modal Header */}
            <div
              className="p-8 text-center"
              style={{
                background:
                  "linear-gradient(180deg, rgba(212,168,67,0.12) 0%, transparent 100%)",
                borderBottom: "1px solid rgba(212,168,67,0.1)",
              }}
            >
              <div className="w-18 h-18 rounded-full flex items-center justify-center mx-auto mb-5 bg-[#D4A843]/15 border-2 border-[#D4A843]/30 w-[72px] h-[72px]">
                <CheckCircle size={36} className="text-[#D4A843]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Đăng Ký Thành Công!
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Tài khoản của bạn đã được tạo.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {/* QR Payment */}
              {paymentInfo?.qr_url && (
                <div className="mb-8">
                  <p className="text-sm sm:text-base font-semibold text-white mb-4 text-center leading-relaxed">
                    Chuyển khoản{" "}
                    {paymentInfo.amount.toLocaleString("vi-VN")}đ để nhận
                    tài liệu:
                  </p>
                  <div className="flex justify-center mb-5">
                    <div className="p-3 rounded-xl bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={paymentInfo.qr_url}
                        alt="QR thanh toán"
                        width={200}
                        height={200}
                        className="block"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        label: "Số tiền",
                        value: `${paymentInfo.amount.toLocaleString("vi-VN")}đ`,
                        key: "amount",
                        highlight: true,
                      },
                      {
                        label: "Nội dung CK",
                        value: paymentInfo.transfer_content,
                        key: "content",
                        copyable: true,
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a]"
                      >
                        <span className="text-xs text-gray-400">
                          {item.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              item.highlight
                                ? "text-[#D4A843]"
                                : "text-white font-mono"
                            }`}
                          >
                            {item.value}
                          </span>
                          {item.copyable && (
                            <button
                              onClick={() =>
                                copyText(item.value, item.key)
                              }
                              className="text-gray-500 hover:text-white transition-colors"
                            >
                              {copied === item.key ? (
                                <Check
                                  size={13}
                                  className="text-[#D4A843]"
                                />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bank deep link buttons */}
                  {paymentInfo.bank_account && paymentInfo.bank_code && (
                    <BankTransferButtons
                      bankAccount={paymentInfo.bank_account}
                      bankCode={paymentInfo.bank_code}
                      amount={paymentInfo.amount}
                      transferContent={paymentInfo.transfer_content}
                      accentColor="#D4A843"
                    />
                  )}

                  <div className="mt-4 p-4 rounded-lg text-sm text-gray-400 leading-relaxed bg-[#D4A843]/5 border border-[#D4A843]/10">
                    <span className="text-[#D4A843] font-medium">
                      ⚡ Tự động xác nhận
                    </span>{" "}
                    — Sau khi chuyển khoản, hệ thống sẽ tự động mở khoá tài
                    liệu trong vòng 60 giây.
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="p-5 rounded-xl bg-[#f59e0b]/5 border border-[#f59e0b]/15 space-y-4">
                <p className="text-sm sm:text-base font-semibold text-[#f59e0b] flex items-center gap-2">
                  <Mail size={16} /> Bước tiếp theo:
                </p>
                <div className="space-y-4">
                  {[
                    <>
                      Kiểm tra email{" "}
                      <strong className="text-white">({form.email})</strong>{" "}
                      và{" "}
                      <strong className="text-white">
                        kích hoạt tài khoản
                      </strong>{" "}
                      bằng link xác nhận.
                    </>,
                    <>
                      Chuyển khoản{" "}
                      <strong className="text-white">99.000đ</strong> theo
                      QR code ở trên.
                    </>,
                    <>
                      <strong className="text-white">Đăng nhập</strong> tại{" "}
                      <Link
                        href="/login"
                        className="text-[#D4A843] underline font-medium"
                      >
                        dangkhuong.com/login
                      </Link>{" "}
                      với tài khoản vừa đăng ký để truy cập tài liệu.
                    </>,
                  ].map((content, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-xs font-bold text-[#f59e0b] bg-[#f59e0b]/10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-300 leading-relaxed">
                        {content}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                <Link
                  href="/login"
                  className="btn-green w-full justify-center text-sm py-3"
                >
                  <ExternalLink size={14} /> Đăng Nhập Ngay
                </Link>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding for sticky mobile CTA */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
