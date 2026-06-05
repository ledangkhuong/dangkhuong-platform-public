"use client";

import { useState, useRef, useEffect } from "react";
import {
  Star,
  AlertCircle,
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
  Eye,
  EyeOff,
  BarChart3,
  ShoppingCart,
  Megaphone,
  PieChart,
  FileText,
  Link2,
  Zap,
  Coffee,
  MessageCircle,
  Video,
  Gift,
  Monitor,
  Clock,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import BankTransferButtons from "@/components/BankTransferButtons";

/* ---- Types ---- */
interface PaymentInfo {
  order_code: string;
  amount: number;
  transfer_content: string;
  qr_url: string | null;
  bank_account: string | null;
  bank_code: string | null;
}

/* ---- Data ---- */

const STATS = [
  { value: "108,7tr", label: "Tổng doanh thu ghi nhận", color: "#D4A843" },
  { value: "421", label: "Tài khoản học viên", color: "#3b82f6" },
  { value: "149", label: "Đơn hàng trong kỳ", color: "#f59e0b" },
  { value: "14", label: "Học viên mới mỗi ngày", color: "#a855f7" },
];

const PAIN_POINTS = [
  {
    icon: "🌐",
    title: "Blog một nền tảng",
    desc: "Landing page một nơi, khóa học một nơi khác — không thứ gì kết nối với nhau.",
  },
  {
    icon: "📊",
    title: "Đơn hàng nằm trong file Excel",
    desc: "Không biết đơn nào đã xử lý, doanh thu thật là bao nhiêu, khách mua gì.",
  },
  {
    icon: "📧",
    title: "Email marketing phần mềm riêng",
    desc: "Trả tiền nhiều công cụ rời rạc mà dữ liệu không chạy về một chỗ.",
  },
  {
    icon: "🧠",
    title: "CRM nằm trong… trí nhớ",
    desc: "Khách đang ở giai đoạn nào của hành trình? Không ai biết, không ai theo dõi.",
  },
  {
    icon: "🔗",
    title: "Affiliate gắn link thủ công",
    desc: "Không biết khách đến từ đâu, quan tâm gì, đã mua sản phẩm nào.",
  },
  {
    icon: "🏚️",
    title: "Không kiểm soát tài sản của mình",
    desc: "Traffic, data, đơn hàng, học viên… đều nằm rải rác trên nền tảng người khác.",
  },
];

const FEATURES = [
  {
    num: "01",
    icon: BarChart3,
    title: "Dashboard doanh thu & đơn hàng",
    desc: "Xem doanh thu, đơn hàng, học viên theo thời gian thực — không còn mò mẫm Excel.",
    color: "#D4A843",
  },
  {
    num: "02",
    icon: ShoppingCart,
    title: "Bán khóa học & cấp quyền tự động",
    desc: "Học viên thanh toán xong được cấp quyền học ngay, không cần thao tác tay.",
    color: "#3b82f6",
  },
  {
    num: "03",
    icon: PieChart,
    title: "CRM & pipeline sale",
    desc: "Biết khách đang ở giai đoạn nào, theo dõi hiệu suất bán hàng rõ ràng.",
    color: "#f59e0b",
  },
  {
    num: "04",
    icon: Megaphone,
    title: "Email marketing tích hợp",
    desc: "Chăm sóc khách hàng tự động ngay trong hệ thống, dữ liệu không rời rạc.",
    color: "#8b5cf6",
  },
  {
    num: "05",
    icon: FileText,
    title: "Blog SEO kéo traffic miễn phí",
    desc: "Tự xây nguồn traffic bền vững thay vì phụ thuộc hoàn toàn vào quảng cáo.",
    color: "#ec4899",
  },
  {
    num: "06",
    icon: Link2,
    title: "Sản phẩm số, vật lý & affiliate",
    desc: "Quản trị mọi loại sản phẩm và đặt affiliate đúng điểm trong hành trình khách.",
    color: "#ef4444",
  },
];

const BEFORE_AFTER: [string, string][] = [
  [
    "Mỗi công cụ một nơi, không kết nối",
    "Một hệ thống quản trị tập trung",
  ],
  [
    "Trả phí nhiều phần mềm rời rạc",
    "Một nơi — tiết kiệm chi phí & thời gian",
  ],
  [
    "Không biết doanh thu thật, khách thật",
    "Dashboard rõ ràng theo thời gian thực",
  ],
  [
    "Affiliate & CRM làm thủ công",
    "CRM, pipeline, email tự động hóa",
  ],
  [
    "Traffic & data nằm trên nền tảng người khác",
    "Làm chủ traffic, data, đơn hàng, học viên",
  ],
];

const OFFER_ITEMS = [
  { label: "Buổi Zoom live: tư duy hệ thống All-In-One", value: "500.000đ" },
  {
    label: "Quy trình dùng AI Agent để thiết kế & triển khai",
    value: "500.000đ",
  },
  {
    label: "Tặng kèm: bộ tài liệu & quy trình mang về làm ngay",
    value: "500.000đ",
  },
  {
    label: "Hỏi đáp trực tiếp về hệ thống của riêng bạn",
    value: "500.000đ",
  },
];

const FAQ_DATA = [
  {
    q: "Buổi Zoom diễn ra khi nào và bao lâu?",
    a: "Thứ 6, ngày 05/06/2026, từ 20h00 đến 22h00, trực tiếp trên Zoom. Sau khi đăng ký bạn nhận được link khóa học qua email và được mời vào nhóm Zalo để trao đổi trực tiếp.",
  },
  {
    q: "Tôi bận hôm đó, có xem lại được không?",
    a: "Được. Sau buổi live, video và tài liệu sẽ được gửi vào email và đăng trong khu vực khóa học — bạn đăng nhập vào để học lại bất cứ lúc nào.",
  },
  {
    q: "100K mua sinh tố hay mua buổi chia sẻ?",
    a: "Bạn mời tôi ly sinh tố 100K — tôi mở phòng và chia sẻ thật quy trình, tư duy hệ thống và cách tôi đang triển khai website All-In-One, kèm tặng bộ tài liệu & quy trình. Win-win. ☕🎁",
  },
  {
    q: "Tài liệu tặng kèm là gì và nhận khi nào?",
    a: "Là bộ quy trình dùng AI Agent + checklist xây hệ thống All-In-One, ở dạng PDF. Bạn nhận qua email sau buổi Zoom để có thể bắt tay làm ngay. Video cũng được gửi lại qua email và đăng trong khóa học.",
  },
  {
    q: "Tôi chưa biết gì về AI Agent, có theo được không?",
    a: "Được. Tôi chia sẻ từ tư duy hệ thống trước, rồi mới đến cách triển khai bằng AI Agent — phù hợp cả người mới lẫn người đã kinh doanh online.",
  },
  {
    q: "Tôi có thể sở hữu hệ thống tương tự không?",
    a: "Có. Trong buổi Zoom tôi sẽ nói rõ con đường để bạn có thể sở hữu hoặc tự xây một hệ thống tương tự cho sản phẩm số, khóa học, affiliate, cộng đồng và CRM.",
  },
  {
    q: "Thanh toán bằng cách nào?",
    a: "Chuyển khoản ngân hàng qua mã QR — xác nhận tự động, nhận link Zoom ngay lập tức.",
  },
];

const ZALO_GROUP = "https://zalo.me/g/mwrjxixtjhe0aed8fkdf";
const ZOOM_URL =
  "https://us06web.zoom.us/j/2727682727?pwd=bzA4NG1xZEpaTXVaOFVNR1BKNXc0Zz09";
const ZOOM_ID = "272 768 2727";
const ZOOM_PASS = "272727";
const COURSE_URL =
  "/courses/lo-trinh-thiet-ke-website-all-in-one-bang-ai-agent";

/* ---- Component ---- */
interface WebAllInOneLandingProps {
  /**
   * Slug của pixel_config (lấy từ DB server-side) — EventAttrTracker đọc từ
   * data-dk-default-slug để route CAPI event sang đúng pixel access_token.
   */
  pixelSlug?: string;
}

export default function WebAllInOneLanding({ pixelSlug = "default" }: WebAllInOneLandingProps = {}) {
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
  const [couponCode, setCouponCode] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">(
    "pending",
  );
  const formRef = useRef<HTMLDivElement>(null);

  // Capture UTM from URL
  const [utmParams] = useState(() => {
    if (typeof window === "undefined") return {};
    const sp = new URLSearchParams(window.location.search);
    const params: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const val = sp.get(key);
      if (val) params[key] = val;
    }
    return params;
  });

  // Poll payment status
  useEffect(() => {
    if (!showModal || !paymentInfo?.order_code || paymentStatus === "paid")
      return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/orders/check-status?order_code=${paymentInfo.order_code}`,
        );
        const data = await res.json();
        if (data.status === "paid") {
          setPaymentStatus("paid");
          clearInterval(poll);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [showModal, paymentInfo?.order_code, paymentStatus]);

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

    // Generate eventId riêng cho mỗi event để dedupe Pixel↔CAPI (cùng id ở 2 nơi).
    const genId = () => {
      if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
      }
      return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    };
    const leadEventId = genId();
    const checkoutEventId = genId();

    // Fire Pixel với cùng eventID — server sẽ fire CAPI với chính id này → Meta dedupe.
    try {
      const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
      if (typeof fbq === "function") {
        const leadCustomData = {
          content_name: "WebAllInOne — Mời Sinh Tố",
          value: 100000,
          currency: "VND",
        };
        fbq("track", "Lead", leadCustomData, { eventID: leadEventId });

        const checkoutCustomData = {
          content_name: "WebAllInOne — Mời Sinh Tố",
          value: 100000,
          currency: "VND",
        };
        fbq("track", "InitiateCheckout", checkoutCustomData, {
          eventID: checkoutEventId,
        });
      }
    } catch {
      /* analytics fail không được block UX */
    }

    try {
      const res = await fetch("/api/weballinone/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          coupon_code: couponCode.trim() || undefined,
          ...utmParams,
          event_id_lead: leadEventId,
          event_id_initiate_checkout: checkoutEventId,
        }),
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

  /* Brand colors: deep blue-tech */
  const accent = "#3B82F6";
  const gold = "#D4A843";

  return (
    <div
      className="min-h-screen bg-[#050913] text-white"
      data-dk-default-slug={pixelSlug}
    >
      {/* ═══ NAVBAR ═══ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between"
        style={{
          background: "rgba(5,9,19,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(59,130,246,0.12)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/about/portrait.jpg"
            alt="Lê Đăng Khương"
            width={40}
            height={40}
            sizes="40px"
            loading="lazy"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="font-semibold text-sm text-white hidden sm:block">
            Lê Đăng Khương Academy
          </span>
        </Link>
        <button onClick={scrollToForm} className="btn-green text-xs py-2 px-4">
          <Coffee size={14} /> Mời Sinh Tố &mdash; 100K
        </button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-24 sm:pt-32 pb-8 sm:pb-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-10"
            style={{
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)",
              color: accent,
            }}
          >
            <Video size={13} /> Zoom Live &middot; 20h&ndash;22h &middot; Thứ
            6, 05/06/2026
          </div>

          <p className="text-base sm:text-lg text-gray-400 mb-4 font-medium">
            421 học viên đã vào hệ thống &mdash; bạn thì sao?
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.2] sm:leading-[1.15] mb-8">
            <span style={{ color: accent }}>
              Website All-In-One
            </span>
            <br />
            108 Triệu Doanh Số Thật Trong 10 Ngày
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Tôi dùng AI Agent xây một hệ thống website All-In-One cho
            dangkhuong.com &mdash; và nó tạo ra <strong className="text-white">108,7 triệu doanh số thật</strong> chỉ
            trong 10 ngày đầu. Thứ 6 này tôi lên Zoom chia sẻ trực tiếp toàn bộ
            tư duy hệ thống và cách triển khai từ A đến Z. Kèm theo: bộ tài liệu
            & quy trình + video gửi lại qua email sau buổi live.
          </p>

          <button
            onClick={scrollToForm}
            className="btn-green text-sm sm:text-base py-3.5 px-8"
            data-dk-track="Lead"
            data-dk-content="Mời Sinh Tố CTA — Hero"
            data-dk-value="100000"
            data-dk-currency="VND"
          >
            Mời Sinh Tố & Vào Phòng Zoom <ArrowRight size={16} />
          </button>

          <div className="flex items-center justify-center gap-3 sm:gap-5 mt-8 text-xs sm:text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  fill="#D4A843"
                  className="text-[#D4A843]"
                />
              ))}
              <span className="ml-1">4.9/5</span>
            </span>
            <span>421+ học viên đã đăng ký</span>
            <span>Lê Đăng Khương Academy</span>
          </div>

          {/* Hero Banner */}
          <div className="mt-10 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(59,130,246,0.15)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/weballinone/banner.jpg"
              alt="Lộ Trình Thiết Kế Website All-In-One Bằng AI Agent"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="py-6 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="text-center p-5 rounded-xl"
              style={{
                background: "rgba(59,130,246,0.04)",
                border: "1px solid rgba(59,130,246,0.08)",
              }}
            >
              <div
                className="text-2xl sm:text-3xl font-extrabold"
                style={{ color: s.color }}
              >
                {s.value}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ DASHBOARD PROOF ═══ */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span
            className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
            style={{
              background: "rgba(59,130,246,0.1)",
              color: accent,
              border: "1px solid rgba(59,130,246,0.2)",
            }}
          >
            Bằng Chứng Thật &mdash; Không Phải Lý Thuyết
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            108 Triệu Doanh Số Thật Trong 10 Ngày &mdash; Đây Là Dashboard Thật
          </h2>
          <p className="text-sm text-gray-400 max-w-lg mx-auto mb-8 leading-relaxed">
            Không lý thuyết, không photoshop. Dashboard này tôi sẽ mở ra trực tiếp
            trên Zoom và giải thích từng con số &mdash; bạn thấy gì, hỏi được luôn.
          </p>
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: "rgba(59,130,246,0.15)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/weballinone/dashboard.png"
              alt="Admin Dashboard"
              width={1200}
              height={680}
              className="w-full h-auto"
            />
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Doanh thu 108.673.000đ &middot; 421 học viên &middot; 149 đơn hàng
            &middot; 14 học viên mới/ngày &mdash; số liệu thật, cập nhật liên tục.
          </p>
        </div>
      </section>

      {/* ═══ PAIN POINTS ═══ */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span
              className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              Có Phải Bạn Đang Như Thế Này?
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Mỗi Thứ Một Nơi &mdash; Càng Làm Càng Rối
            </h2>
            <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
              Khi bắt đầu có học viên, có đơn hàng, có khách tiềm năng, có
              affiliate&hellip; mà không có hệ thống tập trung, thì mọi thứ vỡ
              trận.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAIN_POINTS.map((p, i) => (
              <div
                key={i}
                className="p-5 rounded-xl"
                style={{
                  background: "rgba(239,68,68,0.03)",
                  border: "1px solid rgba(239,68,68,0.08)",
                }}
              >
                <span className="text-2xl mb-3 block">{p.icon}</span>
                <h3 className="font-semibold text-white text-sm mb-2">
                  {p.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-8 max-w-md mx-auto leading-relaxed">
            Làm nhỏ thì còn chịu được. Nhưng khi bắt đầu lớn &mdash; không có hệ
            thống tập trung là tự trói tay mình.
          </p>
        </div>
      </section>

      {/* ═══ VISION QUOTE ═══ */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <blockquote
            className="text-lg sm:text-xl font-semibold italic leading-relaxed p-8 rounded-2xl"
            style={{
              background: "rgba(59,130,246,0.04)",
              border: "1px solid rgba(59,130,246,0.1)",
              color: "#e0e7ff",
            }}
          >
            &ldquo;Đây không chỉ là một cái website. Đây là một trụ sở kinh
            doanh số.&rdquo;
          </blockquote>
          <p className="text-sm text-gray-400 mt-6 max-w-lg mx-auto leading-relaxed">
            Facebook, TikTok, YouTube, Shopee&hellip; nên là nơi kéo traffic.
            Còn tài sản thực sự nên nằm ở hệ thống riêng của mình: website, data
            khách hàng, đơn hàng, khóa học, cộng đồng và CRM.
          </p>
          <p className="text-sm text-gray-500 mt-4 max-w-lg mx-auto leading-relaxed">
            Trước đây làm hệ thống này cần cả đội kỹ thuật. Bây giờ, với AI
            Agent &mdash; nếu biết cách thiết kế luồng và ra yêu cầu &mdash; mọi
            thứ nhanh hơn rất nhiều.
          </p>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span
              className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
              style={{
                background: "rgba(59,130,246,0.1)",
                color: accent,
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              Bên Trong Hệ Thống All-In-One
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Một Nơi &mdash; Quản Trị Toàn Bộ Kinh Doanh Online
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.num}
                  className="p-5 rounded-xl"
                  style={{
                    background: `${f.color}06`,
                    border: `1px solid ${f.color}15`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: `${f.color}15` }}
                    >
                      <Icon size={18} style={{ color: f.color }} />
                    </div>
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: f.color }}
                    >
                      {f.num}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2">
                    {f.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ GIFTS ═══ */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <span
            className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
            style={{
              background: "rgba(212,168,67,0.1)",
              color: gold,
              border: `1px solid rgba(212,168,67,0.2)`,
            }}
          >
            <Gift size={12} className="inline -mt-0.5 mr-1" />
            Quà tặng kèm khi bạn vào Zoom
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Đăng ký xong &mdash; nhận ngay qua email & vào học luôn
          </h2>
          <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed mb-4">
            Sau buổi live, <strong className="text-white">video + bộ tài liệu</strong> sẽ được gửi vào email
            của bạn. Bạn cũng có thể đăng nhập vào hệ thống để học lại bất cứ lúc nào.
          </p>
          <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
            Nội dung tặng kèm: bộ quy trình dùng AI Agent để thiết kế luồng, ra yêu cầu
            và kiểm soát sản phẩm &mdash; kèm checklist hệ thống All-In-One để bắt tay làm ngay.
          </p>
        </div>
      </section>

      {/* ═══ BEFORE vs AFTER ═══ */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Từ Rối Loạn Đến Một Cỗ Máy 24/7
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2">
                <X size={14} /> TRƯỚC
              </h3>
              <ul className="space-y-3">
                {BEFORE_AFTER.map(([before], i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-400 flex items-start gap-2 leading-relaxed"
                  >
                    <span className="text-red-400/50 mt-0.5 shrink-0">
                      &mdash;
                    </span>
                    {before}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3
                className="text-sm font-bold mb-4 flex items-center gap-2"
                style={{ color: accent }}
              >
                <Check size={14} /> SAU
              </h3>
              <ul className="space-y-3">
                {BEFORE_AFTER.map(([, after], i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-300 flex items-start gap-2 leading-relaxed"
                  >
                    <Check
                      size={13}
                      className="shrink-0 mt-0.5"
                      style={{ color: accent }}
                    />
                    {after}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ AUTHOR ═══ */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-2xl mx-auto">
          <div
            className="flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8 rounded-2xl"
            style={{
              background: "rgba(59,130,246,0.04)",
              border: "1px solid rgba(59,130,246,0.1)",
            }}
          >
            <img
              src="/images/about/portrait.jpg"
              alt="Lê Đăng Khương"
              className="w-24 h-24 rounded-2xl object-cover shrink-0"
            />
            <div>
              <h3 className="text-lg font-bold text-white">Lê Đăng Khương</h3>
              <p className="text-xs text-gray-500 mt-1">
                Chuyên gia Marketing & Thương hiệu cá nhân &middot; Founder LDK
                Academy
              </p>
              <blockquote className="text-sm text-gray-400 mt-3 leading-relaxed italic">
                &ldquo;AI không thay thế tư duy kinh doanh. AI chỉ giúp mình
                triển khai nhanh hơn. Cái gốc vẫn là hiểu mình bán cho ai và
                phễu đi như thế nào.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ OFFER TABLE ═══ */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Thứ 6 Này Bạn Nhận Được <Coffee size={20} className="inline" /> +{" "}
            <Gift size={20} className="inline" />
          </h2>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid rgba(59,130,246,0.15)` }}
          >
            {OFFER_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-4 text-sm"
                style={{
                  borderBottom:
                    i < OFFER_ITEMS.length - 1
                      ? "1px solid rgba(59,130,246,0.08)"
                      : undefined,
                }}
              >
                <span className="text-gray-300">{item.label}</span>
                <span className="text-gray-500 line-through text-xs shrink-0 ml-3">
                  {item.value}
                </span>
              </div>
            ))}

            <div
              className="flex items-center justify-between px-5 py-4 text-sm font-bold"
              style={{
                background: "rgba(59,130,246,0.05)",
                borderTop: "1px solid rgba(59,130,246,0.15)",
              }}
            >
              <span className="text-gray-400">Tổng giá trị</span>
              <span className="text-gray-500 line-through">2.000.000đ</span>
            </div>

            <div
              className="text-center py-6 px-5"
              style={{ background: "rgba(59,130,246,0.08)" }}
            >
              <p className="text-sm text-gray-400 mb-2">
                Thứ 6 này bạn chỉ cần mời tôi:
              </p>
              <p className="text-4xl font-black" style={{ color: accent }}>
                100K
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Đúng vậy &mdash; bằng một ly sinh tố.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-6 text-[11px] text-gray-500 flex-wrap">
            <span>
              <Clock size={11} className="inline mr-1" />
              20h&ndash;22h &middot; Thứ 6, 05/06/2026
            </span>
            <span>
              <MessageCircle size={11} className="inline mr-1" />
              Vào nhóm Zalo trao đổi
            </span>
            <span>
              <Video size={11} className="inline mr-1" />
              Video + tài liệu gửi email sau buổi live
            </span>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={scrollToForm}
              className="btn-green text-sm sm:text-base py-3.5 px-8"
              data-dk-track="Lead"
              data-dk-content="Mời Sinh Tố CTA — Mid"
              data-dk-value="100000"
              data-dk-currency="VND"
            >
              Mời Sinh Tố & Vào Phòng Zoom &mdash; 100K{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOR WHO / NOT FOR WHO ═══ */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-6">
          <div
            className="p-6 rounded-xl"
            style={{
              background: "rgba(59,130,246,0.04)",
              border: "1px solid rgba(59,130,246,0.1)",
            }}
          >
            <h3
              className="font-bold text-sm mb-4"
              style={{ color: accent }}
            >
              <Check size={14} className="inline mr-1" />
              Dành cho bạn nếu:
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              {[
                "Là chuyên gia, trainer, creator, người bán khóa học",
                "Làm affiliate, sản phẩm số hoặc sản phẩm vật lý",
                "Muốn có hệ thống riêng để kiểm soát tài sản kinh doanh",
                "Muốn hiểu cách dùng AI Agent để triển khai nhanh",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <Check
                    size={13}
                    className="shrink-0 mt-0.5"
                    style={{ color: accent }}
                  />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="p-6 rounded-xl"
            style={{
              background: "rgba(239,68,68,0.03)",
              border: "1px solid rgba(239,68,68,0.08)",
            }}
          >
            <h3 className="font-bold text-sm mb-4 text-red-400">
              <X size={14} className="inline mr-1" />
              Không dành cho bạn nếu:
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              {[
                'Tìm cách "làm giàu nhanh" không cần tư duy',
                "Không muốn nghe và áp dụng nghiêm túc",
                "Nghĩ một ly sinh tố là đắt cho buổi chia sẻ thật",
                "Chỉ muốn cái vỏ website đẹp, không cần hệ thống",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <X
                    size={13}
                    className="shrink-0 mt-0.5 text-red-400/50"
                  />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ REGISTRATION FORM ═══ */}
      <section className="py-10 sm:py-14 px-4" id="form">
        <div className="max-w-md mx-auto" ref={formRef}>
          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: "rgba(59,130,246,0.04)",
              border: "1px solid rgba(59,130,246,0.15)",
            }}
          >
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                Mời Sinh Tố & Đăng Ký Zoom
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Điền thông tin để tạo tài khoản, nhận link Zoom
                (20h&ndash;22h Thứ 6, 05/06), lời mời vào nhóm Zalo và bộ tài liệu
                tặng kèm.
              </p>
              <div
                className="mt-3 p-2.5 rounded-lg text-[11px] text-gray-400 leading-relaxed"
                style={{
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.15)",
                }}
              >
                <Gift size={11} className="inline mr-1 text-green-400" />
                Sau khi đăng ký: <strong className="text-green-400">video + tài liệu</strong> sẽ được gửi vào email. Bạn cũng có thể đăng nhập vào hệ thống để học luôn.
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg text-sm text-red-400 mb-4"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Email *
                </label>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
                    style={{
                      background: "#0A1020",
                      border: "1px solid rgba(59,130,246,0.15)",
                    }}
                    placeholder="ban@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Họ và tên *
                </label>
                <div className="relative">
                  <User
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="text"
                    name="full_name"
                    required
                    value={form.full_name}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
                    style={{
                      background: "#0A1020",
                      border: "1px solid rgba(59,130,246,0.15)",
                    }}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Số điện thoại
                </label>
                <div className="relative">
                  <Phone
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
                    style={{
                      background: "#0A1020",
                      border: "1px solid rgba(59,130,246,0.15)",
                    }}
                    placeholder="0912345678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Mật khẩu để tạo tài khoản * (tối thiểu 8 ký tự)
                </label>
                <div className="relative">
                  <Lock
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
                    style={{
                      background: "#0A1020",
                      border: "1px solid rgba(59,130,246,0.15)",
                    }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Mã giảm giá */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Mã giảm giá (nếu có)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-600 outline-none uppercase"
                    style={{
                      background: "#0A1020",
                      border: "1px solid rgba(59,130,246,0.15)",
                    }}
                    placeholder="Nhập mã giảm giá"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-green w-full justify-center py-3 text-sm font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Đang xử
                    lý&hellip;
                  </>
                ) : (
                  <>
                    ĐĂNG KÝ & THANH TOÁN &mdash; 100.000Đ{" "}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-gray-500">
              <span>
                <Lock size={10} className="inline mr-0.5" /> Thanh toán an toàn
              </span>
              <span>
                <Zap size={10} className="inline mr-0.5" /> Cấp link Zoom & tài
                liệu tự động
              </span>
            </div>

            <p className="text-[10px] text-gray-600 text-center mt-4 leading-relaxed">
              Bằng việc đăng ký, bạn đồng ý với{" "}
              <Link href="/terms" className="text-gray-500 hover:underline">
                điều khoản sử dụng
              </Link>{" "}
              của Đăng Khương Academy. Đã có tài khoản? Nhập đúng email & mật
              khẩu &mdash; hệ thống tự tạo đơn hàng.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Câu Hỏi Thường Gặp
          </h2>

          <div className="space-y-3">
            {FAQ_DATA.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{
                  background: "#0A1020",
                  border: "1px solid rgba(59,130,246,0.08)",
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 text-left cursor-pointer"
                >
                  <span className="text-sm font-medium text-white pr-4">
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className="overflow-hidden transition-all"
                  style={{
                    maxHeight: openFaq === i ? "200px" : "0",
                    opacity: openFaq === i ? 1 : 0,
                  }}
                >
                  <div
                    className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-gray-400 leading-relaxed"
                    style={{
                      borderTop: "1px solid rgba(59,130,246,0.06)",
                      paddingTop: "1rem",
                    }}
                  >
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TWO PATHS / FINAL CTA ═══ */}
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
              <p className="text-sm text-gray-400 leading-relaxed mt-4">
                Tiếp tục mỗi thứ một nơi, càng làm càng rối, traffic và data nằm
                trên nền tảng người khác, không kiểm soát được tài sản kinh
                doanh.
              </p>
            </div>

            <div
              className="p-6 sm:p-8 rounded-xl text-left"
              style={{
                background: "rgba(59,130,246,0.04)",
                border: `1px solid rgba(59,130,246,0.12)`,
              }}
            >
              <span className="text-4xl font-black" style={{ color: `${accent}30` }}>
                02
              </span>
              <p className="text-sm text-gray-300 leading-relaxed mt-4">
                Mời một ly sinh tố{" "}
                <strong style={{ color: accent }}>100K</strong> &mdash; vào
                Zoom 20h&ndash;22h Thứ 6 (05/06), vào nhóm Zalo, nhận video + tài liệu
                qua email &mdash; hiểu tư duy hệ thống All-In-One và cách dùng AI
                Agent để xây trụ sở kinh doanh số.
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-10 max-w-md mx-auto leading-relaxed">
            Quyết định nằm ở bạn. Nhưng mỗi ngày trôi qua mà chưa có hệ thống
            riêng, là một ngày bạn vẫn đang xây nhà trên đất người khác.
          </p>

          <button
            onClick={scrollToForm}
            className="btn-green text-sm sm:text-base py-3.5 px-8"
            data-dk-track="Lead"
            data-dk-content="Mời Sinh Tố CTA — Final"
            data-dk-value="100000"
            data-dk-currency="VND"
          >
            <Coffee size={16} /> Mời Sinh Tố & Vào Phòng Zoom &mdash; 100K{" "}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-10 px-4 text-center border-t border-[#0E1730]">
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
          background: "rgba(5,9,19,0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(59,130,246,0.1)",
        }}
      >
        <button
          onClick={scrollToForm}
          className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-bold py-3 cursor-pointer transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #EAB308, #F59E0B)", color: "#000000" }}
        >
          <Coffee size={14} /> Mời Sinh Tố &mdash; 100K{" "}
          <ArrowRight size={14} />
        </button>
      </div>

      {/* ═══ PAYMENT MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          <div
            className="relative w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh]"
            style={{
              background: "#0A1020",
              border: "1px solid rgba(59,130,246,0.15)",
            }}
          >
            {paymentStatus === "paid" ? (
              /* ── SUCCESS STATE ── */
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 bg-green-500/15 border-2 border-green-500/40">
                  <CheckCircle size={40} className="text-green-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Thanh Toán Thành Công! 🎉
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-5">
                  Chúc mừng bạn đã đăng ký thành công! Dưới đây là thông tin
                  buổi Zoom Thứ 6, 05/06. Video + tài liệu sẽ gửi vào email sau buổi live.
                </p>

                {/* Zoom Info Card */}
                <div
                  className="rounded-xl p-4 mb-4 text-left"
                  style={{
                    background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.2)",
                  }}
                >
                  <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: accent }}>
                    <Video size={13} /> Zoom Live &middot; 20h&ndash;22h Thứ 6, 05/06/2026
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Meeting ID</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-white">{ZOOM_ID}</span>
                        <button
                          onClick={() => copyText(ZOOM_ID.replace(/\s/g, ""), "zoom-id")}
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          {copied === "zoom-id" ? <Check size={12} style={{ color: accent }} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Passcode</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-white">{ZOOM_PASS}</span>
                        <button
                          onClick={() => copyText(ZOOM_PASS, "zoom-pass")}
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          {copied === "zoom-pass" ? <Check size={12} style={{ color: accent }} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zoom CTA */}
                <a
                  href={ZOOM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-bold text-white transition-all hover:scale-[1.02] mb-3 w-full justify-center"
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  }}
                >
                  <Video size={18} />
                  Vào Phòng Zoom
                </a>

                {/* Zalo Group */}
                <a
                  href={ZALO_GROUP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] mb-3 w-full justify-center"
                  style={{
                    background: "rgba(0,104,255,0.12)",
                    color: "#3b82f6",
                    border: "1px solid rgba(0,104,255,0.25)",
                  }}
                >
                  <MessageCircle size={16} />
                  Vào Nhóm Zalo Trao Đổi
                </a>

                {/* Course link */}
                <a
                  href={COURSE_URL}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] w-full justify-center"
                  style={{
                    background: "rgba(34,197,94,0.12)",
                    color: "#22c55e",
                    border: "1px solid rgba(34,197,94,0.25)",
                  }}
                >
                  <Monitor size={16} />
                  Vào Khóa Học
                </a>

                <div
                  className="mt-4 p-3 rounded-lg text-xs text-gray-400 leading-relaxed"
                  style={{
                    background: "rgba(59,130,246,0.05)",
                    border: "1px solid rgba(59,130,246,0.1)",
                  }}
                >
                  <Mail size={12} className="inline mr-1" style={{ color: accent }} />
                  Check email để nhận xác nhận đơn hàng. Kiểm tra cả mục
                  Spam/Junk.
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="block w-full mt-4 py-2 text-sm text-gray-500 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              /* ── PAYMENT PENDING STATE ── */
              <>
                <div
                  className="p-8 text-center"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(59,130,246,0.12) 0%, transparent 100%)",
                    borderBottom: "1px solid rgba(59,130,246,0.1)",
                  }}
                >
                  <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-5 bg-blue-500/15 border-2 border-blue-500/30">
                    <CheckCircle size={36} style={{ color: accent }} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    Đăng Ký Thành Công!
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Tài khoản của bạn đã được tạo. Video + tài liệu sẽ được gửi vào email sau buổi live.
                  </p>
                </div>

                <div className="p-6 sm:p-8">
                  {/* Zalo group + email invite */}
                  <div className="mb-5 space-y-2.5">
                    <a
                      href={ZALO_GROUP}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] w-full justify-center"
                      style={{
                        background: "rgba(0,104,255,0.12)",
                        color: "#3b82f6",
                        border: "1px solid rgba(0,104,255,0.25)",
                      }}
                    >
                      <MessageCircle size={16} />
                      Vào Nhóm Zalo Trao Đổi Ngay
                    </a>
                    <a
                      href={COURSE_URL}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] w-full justify-center"
                      style={{
                        background: "rgba(34,197,94,0.08)",
                        color: "#22c55e",
                        border: "1px solid rgba(34,197,94,0.2)",
                      }}
                    >
                      <Monitor size={16} />
                      Đăng Nhập Vào Khóa Học
                    </a>
                    <div
                      className="p-3 rounded-lg text-xs text-gray-400 leading-relaxed"
                      style={{
                        background: "rgba(59,130,246,0.05)",
                        border: "1px solid rgba(59,130,246,0.1)",
                      }}
                    >
                      <Mail size={12} className="inline mr-1" style={{ color: accent }} />
                      Check email &mdash; video + tài liệu sẽ gửi lại sau buổi live. Kiểm tra cả Spam/Junk.
                    </div>
                  </div>

                  {paymentInfo?.qr_url && (
                    <div className="mb-8">
                      <p className="text-sm sm:text-base font-semibold text-white mb-4 text-center leading-relaxed">
                        Chuyển khoản{" "}
                        <span style={{ color: accent }}>
                          {paymentInfo.amount.toLocaleString("vi-VN")}đ
                        </span>{" "}
                        để xác nhận:
                      </p>
                      <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-xl bg-white">
                          <img
                            src={paymentInfo.qr_url}
                            alt="QR thanh toán"
                            width={200}
                            height={200}
                            className="block"
                          />
                        </div>
                      </div>

                      {/* Hướng dẫn chụp QR */}
                      <div
                        className="p-3 rounded-lg mb-5 text-xs leading-relaxed"
                        style={{
                          background: "rgba(245,158,11,0.08)",
                          border: "1px solid rgba(245,158,11,0.2)",
                        }}
                      >
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
                            className="flex items-center justify-between p-4 rounded-lg"
                            style={{ background: "#050913" }}
                          >
                            <span className="text-xs text-gray-400">
                              {item.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${item.highlight ? "" : "text-white font-mono"}`}
                                style={
                                  item.highlight
                                    ? { color: accent }
                                    : undefined
                                }
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
                                      style={{ color: accent }}
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

                      {paymentInfo.bank_account && paymentInfo.bank_code && (
                        <BankTransferButtons
                          bankAccount={paymentInfo.bank_account}
                          bankCode={paymentInfo.bank_code}
                          amount={paymentInfo.amount}
                          transferContent={paymentInfo.transfer_content}
                          accentColor={accent}
                        />
                      )}

                      <div
                        className="mt-4 p-4 rounded-lg text-sm text-gray-400 leading-relaxed"
                        style={{
                          background: "rgba(59,130,246,0.05)",
                          border: "1px solid rgba(59,130,246,0.1)",
                        }}
                      >
                        <span className="font-medium" style={{ color: accent }}>
                          ⚡ Tự động xác nhận
                        </span>{" "}
                        &mdash; Sau khi chuyển khoản, hệ thống tự động xác nhận
                        trong vòng 60 giây.
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full py-3 rounded-xl text-sm font-medium text-gray-500 cursor-pointer"
                    style={{
                      border: "1px solid rgba(59,130,246,0.1)",
                    }}
                  >
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
