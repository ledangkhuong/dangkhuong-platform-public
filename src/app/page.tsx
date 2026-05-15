"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Play, Star, ChevronDown, CheckCircle,
  Users, Video, BookOpen, Bot, Clock, TrendingDown,
  User, Briefcase, Heart, GraduationCap, ShoppingBag, Rocket,
  Mail, Phone, Zap, Shield, Gift, Menu, X,
  MessageCircle, Award, Eye, Sparkles, Download,
} from "lucide-react";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import TurnstileWidget from "@/components/TurnstileWidget";

/* ─── Data ───────────────────────────────────────────────────── */

const painPoints = [
  { icon: Clock, emoji: "😫", title: "Làm video quá tốn thời gian", desc: "Quay 1 video mất cả ngày, dựng thêm 1 ngày nữa. Ra được 1 video/tuần đã kiệt sức." },
  { icon: TrendingDown, emoji: "📉", title: "Kênh mãi không lên", desc: "Đăng video đều mà view chỉ 200-500. Không biết thuật toán muốn gì." },
  { icon: User, emoji: "🤷", title: "Có chuyên môn nhưng không ai biết", desc: "Bạn giỏi nghề thật sự, nhưng người ta tìm chuyên gia khác vì bạn chưa có thương hiệu." },
  { icon: Heart, emoji: "⏰", title: "Bán hàng kiệt sức", desc: "Tư vấn từng khách 1-1, trả tin nhắn đến 11h đêm, không có thời gian cho gia đình." },
];

const steps = [
  {
    num: 1, icon: Video, color: "#FBBF24", title: "LÀM CHỦ VIDEO AI VEO3.1",
    subtitle: "Tạo video chuyên nghiệp trong 30 phút",
    points: ["Không cần quay, không cần dựng", "Prompt đúng — ra video chất lượng cinema", "1 video/ngày dễ dàng, không kiệt sức", "Đã đào tạo 1,000+ học viên thành thạo VEO3.1"],
    quote: "Học từ gốc rễ — Tự tin tạo prompt — Học 1 lần, làm được mọi thể loại",
  },
  {
    num: 2, icon: Eye, color: "#84CC16", title: "XÂY KÊNH TRIỆU VIEW",
    subtitle: "Từ 0 view → triệu view trong 90 ngày",
    points: ["Phương pháp xây kênh độc quyền đã kiểm chứng", "Hiểu thuật toán YouTube, TikTok, Facebook Reels", "Tối ưu nội dung thu hút triệu view tự nhiên", "800+ học viên đã đạt triệu view"],
    quote: "Kênh triệu view không phải may mắn — đó là phương pháp",
  },
  {
    num: 3, icon: BookOpen, color: "#FBBF24", title: "TẠO SẢN PHẨM SỐ",
    subtitle: "Biến kiến thức thành tài sản kiếm tiền 24/7",
    points: ["Đóng gói chuyên môn thành Ebook, Khoá học, Membership", "Định giá đúng — bán được giá cao", "Xây landing page bán hàng chuyển đổi cao", "Một sản phẩm — bán mãi mãi, không giới hạn"],
    quote: "Học viên Thầy Khương đã tạo sản phẩm số bán 50-500 triệu/tháng",
  },
  {
    num: 4, icon: Bot, color: "#84CC16", title: "AI AGENT BÁN HÀNG TỰ ĐỘNG",
    subtitle: "Hệ thống kiếm tiền 24/7 không cần bạn",
    points: ["AI Agent nghiên cứu thị trường, tạo landing page, bán hàng tự động", "Chốt đơn tự động qua chatbot AI", "Email marketing tự động nurture lead 24/7", "Bạn ngủ — hệ thống vẫn bán hàng"],
    quote: "Công nghệ AI Agent mới nhất 2026 — Áp dụng ngay",
  },
];

const targetAudience = [
  { icon: Award, title: "Chuyên gia / Coach / Mentor", desc: "Muốn lan toả kiến thức và kiếm tiền tự động từ chuyên môn" },
  { icon: Heart, title: "Bác sĩ / Dược sĩ / Chuyên gia sức khoẻ", desc: "Muốn xây thương hiệu cá nhân uy tín, thu hút bệnh nhân chủ động" },
  { icon: GraduationCap, title: "Giáo viên / Đào tạo viên", desc: "Muốn bán khoá học online, scale doanh thu không scale thời gian" },
  { icon: Briefcase, title: "Chủ doanh nghiệp nhỏ", desc: "Muốn dùng Video AI để marketing không cần thuê team" },
  { icon: ShoppingBag, title: "Người kinh doanh online", desc: "Muốn tăng đơn 5-10 lần với AI Agent bán hàng tự động" },
  { icon: Rocket, title: "Người mới bắt đầu", desc: "Muốn khởi nghiệp kiếm tiền online từ con số 0 với AI" },
];

const courses = [
  { emoji: "🎬", title: "Học Làm Video VEO3.1 Từ A-Z", badge: "Flagship", desc: "Học làm video Video AI VEO3.1 từ gốc rễ — tự tin tạo prompt, ra video chuyên nghiệp mọi thể loại.", stats: "1,300+ học viên | ⭐ 4.9/5 | 🎬 50+ bài học", slug: "hoc-lam-video-veo3-1" },
  { emoji: "📈", title: "Xây Kênh Nhàn Tênh - Triệu View", badge: "Độc quyền", desc: "Từ 0 view → triệu view trong 90 ngày với phương pháp đã kiểm chứng qua hàng trăm học viên.", stats: "800+ học viên | ⭐ 4.9/5 | 📅 90 ngày lộ trình", slug: "xay-kenh-trieu-view" },
  { emoji: "🤖", title: "AI Agent Bán Hàng Tự Động", badge: "Coming Soon", desc: "Xây hệ thống bán hàng 24/7 với AI Agent — không cần nhân viên, không cần tư vấn thủ công.", stats: "⏰ Ra mắt Q2/2026 | 🎁 Ưu đãi early bird", slug: null },
  { emoji: "💎", title: "30Day10M - Thử Thách 30 Ngày", badge: "Hot", desc: "Lộ trình 30 ngày từ chuyên gia ẩn danh → có video viral + chốt đơn đầu tiên.", stats: "500+ học viên | 💰 Cam kết kết quả", slug: "30day10m" },
];

const testimonials = [
  { name: "Thùy Dung", role: "Coach sức khoẻ", result: "📈 250K sub", text: "Sau khoá Video AI VEO3.1 của Thầy Khương, em ra 1 video/ngày dễ dàng. Kênh em đạt 200K sub sau 4 tháng.", avatar: "TD" },
  { name: "BS. Trần Thị Ninh", role: "Bác sĩ Da liễu", result: "📈 1.5M view/tháng", text: "Em là bác sĩ da liễu, ngại lên video. Nhờ VEO3.1 + phương pháp xây kênh của Thầy, giờ em có 1,5 triệu view/tháng và phòng khám kín lịch.", avatar: "TN" },
  { name: "Phạm Văn Tùng", role: "Chuyên gia tài chính", result: "💰 80M/tháng", text: "Em đã chốt 80 triệu doanh thu trong tháng đầu áp dụng. Cảm ơn Thầy Khương rất nhiều!", avatar: "VT" },
  { name: "Lê Kim Yến", role: "Giáo viên Tiếng Anh", result: "💰 25M/30 ngày", text: "Học xong 30Day10M, em vượt KPI 10 triệu, đạt 25 triệu trong 30 ngày. Cuộc đời em thay đổi 180°.", avatar: "KY" },
  { name: "Hoàng Văn Nam", role: "55 tuổi, Hà Nội", result: "📱 100K follow TikTok", text: "Em không rành công nghệ. Vậy mà giờ em tự làm video AI, có kênh TikTok 100K follow. Thầy Khương dạy quá tâm huyết.", avatar: "VN" },
  { name: "Vũ Thị Tình", role: "Chủ shop online", result: "🤖 Bán tự động", text: "AI Agent của Thầy giúp em bán hàng 24/7. Em đi du lịch mà đơn vẫn về đều đặn.", avatar: "VT" },
];

const faqs = [
  { q: "Tôi không rành công nghệ, có học Video AI được không?", a: "Hoàn toàn được! Hơn 1,300 học viên của Thầy Khương đa số đều không rành công nghệ, có học viên 55-60 tuổi vẫn làm video AI đều đặn. Lộ trình được thiết kế từ A-Z, mỗi bước rõ ràng nhất." },
  { q: "Tôi cần đầu tư bao nhiêu để bắt đầu?", a: "Bạn có thể bắt đầu HOÀN TOÀN MIỄN PHÍ với Bộ Kit Khởi Đầu. Khi sẵn sàng đầu tư sâu hơn, các khoá học từ 999k." },
  { q: "Video AI VEO3.1 khác gì các công cụ khác?", a: "VEO3.1 là công nghệ mới nhất 2025-2026 của Google, cho chất lượng video gần như cinema, lip-sync chính xác, có sound effects tự động — vượt xa các công cụ cũ." },
  { q: "Phương pháp xây kênh triệu view có khác YouTube/TikTok mỗi nền tảng không?", a: "Có. Thầy Khương dạy bạn nguyên tắc cốt lõi áp dụng được mọi nền tảng + chi tiết tối ưu cho từng nền tảng (YouTube, TikTok, Facebook Reels)." },
  { q: "AI Agent có phức tạp không? Tôi không biết code.", a: "Không cần biết code. Thầy Khương dạy bạn dùng các no-code platform để dựng AI Agent — kéo thả là xong." },
  { q: "Tôi cần bao nhiêu thời gian mỗi ngày?", a: "Chỉ cần 30-60 phút/ngày là đủ để thấy kết quả sau 30 ngày. Phù hợp người bận rộn." },
  { q: "Tôi có được hỗ trợ trực tiếp từ Thầy Khương không?", a: "Có. Học viên các khoá có Q&A với Thầy Khương qua Zoom + cộng đồng — không chỉ học video sẵn." },
];

const statsBar = [
  { value: "1,300+", label: "Học viên" },
  { value: "300M+", label: "Lượt view học viên tạo ra" },
  { value: "500+", label: "Đánh giá 5★" },
  { value: "4.9/5", label: "Mức độ hài lòng" },
];

const freeOfferItems = [
  { icon: Video, title: "PHẦN 1: 10 ngách Video triệu view", desc: "Danh sách 10 ngách dễ lên triệu view nhất tại Việt Nam 2026 — kèm phân tích cạnh tranh." },
  { icon: Zap, title: "PHẦN 2: BÍ MẬT HOOK 3 GIÂY ĐẦU", desc: "Cách viết hook khiến người xem KHÔNG THỂ lướt qua — yếu tố quyết định 80% thành công của video." },
  { icon: TrendingDown, title: "PHẦN 3: GIẢI MÃ THUẬT TOÁN 2026", desc: "Cập nhật mới nhất về thuật toán YouTube Shorts, TikTok, Facebook Reels — đăng giờ nào, dài bao nhiêu, hashtag gì." },
];

/* ─── Page ────────────────────────────────────────────────────── */

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success" | "error" | "verify">("idle");
  const [formError, setFormError] = useState("");
  const [countdown, setCountdown] = useState({ h: 23, m: 59, s: 59 });
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(""), []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        let { h, m, s } = prev;
        if (s > 0) { s--; }
        else if (m > 0) { m--; s = 59; }
        else if (h > 0) { h--; m = 59; s = 59; }
        else { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus("loading");
    setFormError("");
    const fd = new FormData(e.currentTarget);
    const password = fd.get("popup_password") as string;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: password,
          turnstile_token: turnstileToken,
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

  const pad = (n: number) => n.toString().padStart(2, "0");

  const navLinks = [
    { label: "Khoá học", href: "#courses" },
    { label: "Lộ trình", href: "#roadmap" },
    { label: "Học viên", href: "#testimonials" },
    { label: "Blog", href: "/blog" },
    { label: "Cộng đồng", href: "/community" },
  ];

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white overflow-x-hidden">

      {/* ═══ HEADER ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/92 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/images/about/portrait.jpg" alt="Lê Đăng Khương" className="w-9 h-9 rounded-lg object-cover" />
            <div>
              <div className="text-sm font-bold leading-tight">Lê Đăng Khương</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</a>
            ))}
          </div>

          {/* Right */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Đăng nhập</Link>
            <button onClick={() => setShowLeadModal(true)} className="btn-green text-sm py-2 px-5">
              <Gift size={14} /> Nhận quà miễn phí
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-gray-400 p-2">
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-[#111] border-t border-white/5 px-4 py-4 space-y-3">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMobileMenu(false)} className="block text-sm text-gray-300 py-2">{l.label}</a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="text-sm text-gray-400">Đăng nhập</Link>
              <button onClick={() => { setShowLeadModal(true); setMobileMenu(false); }} className="btn-green text-sm py-2 px-4">
                <Gift size={14} /> Nhận quà miễn phí
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ SECTION 1: HERO ═══ */}
      <section className="pt-24 sm:pt-36 pb-12 sm:pb-24 relative">
        {/* Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-15 blur-[80px] pointer-events-none"
          style={{ background: "radial-gradient(circle, #FBBF24, transparent 70%)" }} />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-5 sm:mb-8 text-xs sm:text-sm font-medium"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#FBBF24" }}>
            <Zap size={14} /> Hơn 1,300 người đã xây kênh triệu view cùng Lê Đăng Khương
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] mb-4 sm:mb-6">
            Làm Chủ{" "}
            <span className="text-[#FBBF24]">Video AI</span>
            , Xây Kênh{" "}
            <span className="text-[#84CC16]">Triệu View</span>
            {" "}& <span className="text-[#FBBF24]">Thương Hiệu Cá Nhân</span>
            {" "}Với AI Agent
          </h1>

          {/* Sub-headline */}
          <p className="text-sm sm:text-lg text-gray-400 max-w-2xl mx-auto mb-6 sm:mb-10 leading-relaxed">
            Lộ trình độc quyền từ <strong className="text-white">Lê Đăng Khương</strong> — chuyên gia đào tạo Video AI VEO3.1 đã giúp 1,300+ học viên Việt Nam tạo video AI chuyên nghiệp, xây kênh triệu view và thiết lập hệ thống AI Agent kiếm tiền tự động 24/7.
          </p>

          {/* CTA */}
          <div className="flex justify-center">
            <button onClick={() => setShowLeadModal(true)} className="btn-green text-sm sm:text-base py-3 sm:py-3.5 px-5 sm:px-8 justify-center">
              <Download size={16} /> Đăng ký nhận Bí Mật Video AI Triệu View
            </button>
          </div>

          {/* Video giới thiệu */}
          <div className="mt-8 sm:mt-14 max-w-2xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-[#FBBF24]/20 aspect-video bg-black">
              <iframe
                src="https://www.youtube.com/embed/b7tuRnyuuNw"
                title="Video giới thiệu - Lê Đăng Khương"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>

          {/* Video triệu view showcase - 4 ảnh */}
          <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-3 max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-video border border-white/10 hover:border-[#FBBF24]/30 transition-colors bg-[#111]">
                <img src={`/images/students/channel-${i}.jpg`} alt={`Video triệu view ${i}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 mt-6 sm:mt-10 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Users size={14} className="text-[#FBBF24]" /> +1,300 học viên</span>
            <span className="flex items-center gap-1.5"><Video size={14} className="text-[#84CC16]" /> 500M+ view</span>
            <span className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="#F59E0B" color="#F59E0B" />)}
              <span className="ml-1">4.9/5 (500+ đánh giá)</span>
            </span>
            <span className="flex items-center gap-1.5"><Award size={14} className="text-[#FBBF24]" /> Founder Kohada</span>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2: PAIN POINTS ═══ */}
      <section className="py-12 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-14">
            Bạn có đang mắc kẹt với <span className="text-[#FBBF24]">những điều này?</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {painPoints.map((p, i) => (
              <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-red-500/20 transition-colors">
                <div className="text-3xl mb-3">{p.emoji}</div>
                <h3 className="text-lg font-bold mb-2">{p.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-gray-400">
            👇 <em>Tin tốt là: Tất cả những điều này đều có thể giải quyết — bằng AI, đúng phương pháp.</em>
          </p>
        </div>
      </section>

      {/* ═══ SECTION 3: SOLUTION — 4 BƯỚC ═══ */}
      <section id="roadmap" className="py-12 sm:py-24 px-4 sm:px-6 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-3">
              Lộ Trình <span className="text-[#FBBF24]">4 Bước</span> Từ Lê Đăng Khương
            </h2>
            <p className="text-gray-400">Từ con số 0 → Kênh triệu view → Thu nhập tự động</p>
          </div>

          <div className="space-y-5">
            {steps.map((s) => (
              <div key={s.num} className="bg-[#111] border border-white/5 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
                {/* Step number bg */}
                <div className="absolute top-4 right-6 text-[80px] font-extrabold leading-none opacity-5" style={{ color: s.color }}>
                  {s.num}
                </div>

                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${s.color}20` }}>
                      <s.icon size={20} style={{ color: s.color }} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: s.color }}>Bước {s.num}</div>
                      <h3 className="text-xl font-extrabold">{s.title}</h3>
                    </div>
                  </div>

                  <p className="text-gray-300 font-medium mb-4">{s.subtitle}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {s.points.map((pt, j) => (
                      <div key={j} className="flex items-start gap-2 text-sm text-gray-400">
                        <CheckCircle size={15} className="text-[#22c55e] shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm italic" style={{ color: s.color }}>→ &quot;{s.quote}&quot;</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button onClick={() => setShowLeadModal(true)} className="btn-green text-base py-3.5 px-8 justify-center inline-flex">
              <Download size={18} /> Đăng ký nhận Bí Mật Video AI Triệu View
            </button>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4: ABOUT LÊ ĐĂNG KHƯƠNG ═══ */}
      <section className="py-12 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-14">
            Lê Đăng Khương <span className="text-[#FBBF24]">Là Ai?</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            {/* Photo */}
            <div className="lg:col-span-2">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden relative border border-white/10">
                <img
                  src="/images/about/portrait.jpg"
                  alt="Lê Đăng Khương"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                />
                <div className="hidden w-full h-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #1a1a1a, #111)" }}>
                  <div className="text-center">
                    <img src="/images/about/portrait.jpg" alt="Lê Đăng Khương" className="w-28 h-28 rounded-full mx-auto mb-3 object-cover" />
                    <div className="text-lg font-bold">Lê Đăng Khương</div>
                    <div className="text-sm text-[#FBBF24]">Founder Kohada</div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 text-center"
                  style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                  <div className="text-lg font-bold">Lê Đăng Khương</div>
                  <div className="text-sm text-[#FBBF24]">Founder Kohada</div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="lg:col-span-3 space-y-5">
              <h3 className="text-xl sm:text-2xl font-bold leading-snug">
                Chuyên gia đào tạo Video AI & Thương hiệu cá nhân <span className="text-[#FBBF24]">hàng đầu Việt Nam</span>
              </h3>

              <p className="text-gray-400 leading-relaxed">
                Tôi là <strong className="text-white">Lê Đăng Khương</strong> — người đã dành nhiều năm nghiên cứu và làm chủ công nghệ Video AI đặc biệt là VEO3.1 để giúp các chuyên gia Việt Nam phá vỡ giới hạn truyền thông cũng như xây dựng thương hiệu cá nhân hiệu quả trên internet.
              </p>

              <div className="space-y-3">
                {[
                  { icon: "🎓", text: "Founder Kohada — Hệ sinh thái đào tạo Video AI & Thương hiệu cá nhân" },
                  { icon: "👥", text: "Đã đào tạo 1,300+ học viên thành thạo Video AI và xây kênh triệu view" },
                  { icon: "🎬", text: "Pioneer Video AI VEO3.1 tại Việt Nam — Người Việt đầu tiên xây giáo trình A-Z" },
                  { icon: "📈", text: "Học viên tạo ra 300M+ view từ phương pháp đào tạo" },
                  { icon: "🤖", text: "Tiên phong ứng dụng AI Agent vào hệ thống bán hàng tự động" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <span className="text-sm text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>

              <blockquote className="border-l-2 border-[#FBBF24] pl-4 italic text-gray-400 text-sm">
                &quot;Giúp 10,000 chuyên gia Việt Nam làm chủ Video AI, xây kênh triệu view và xây dựng thương hiệu cá nhân bằng AI — để sống cân bằng và tự do tài chính.&quot;
              </blockquote>

              <a href="https://web.facebook.com/jackmadk13" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ background: "#1877F2", color: "#fff" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Chat với Lê Đăng Khương
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5: WHO IS THIS FOR ═══ */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-14">
            Lộ trình này <span className="text-[#84CC16]">dành cho bạn</span> nếu...
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {targetAudience.map((t, i) => (
              <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-[#84CC16]/20 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(132,204,22,0.1)" }}>
                  <t.icon size={20} className="text-[#84CC16]" />
                </div>
                <h3 className="font-bold mb-2">{t.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6: KHOÁ HỌC ═══ */}
      <section id="courses" className="py-12 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-3">
              Khoá Học Của <span className="text-[#FBBF24]">Lê Đăng Khương</span>
            </h2>
            <p className="text-gray-400">Được thiết kế để bạn áp dụng ngay — không lý thuyết suông</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {courses.map((c, i) => (
              <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col hover:border-[#FBBF24]/20 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{c.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{c.title}</h3>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{
                        background: c.badge === "Coming Soon" ? "rgba(132,204,22,0.1)" : "rgba(251,191,36,0.1)",
                        color: c.badge === "Coming Soon" ? "#84CC16" : "#FBBF24",
                      }}>
                      {c.badge}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-4 flex-1">{c.desc}</p>
                <div className="text-xs text-gray-500 mb-4">{c.stats}</div>
                {c.slug ? (
                  <Link href={`/courses/${c.slug}`} className="btn-green text-sm py-2.5 justify-center">
                    Tham gia ngay <ArrowRight size={15} />
                  </Link>
                ) : (
                  <Link href="/register" className="inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold border border-[#84CC16]/30 text-[#84CC16] hover:bg-[#84CC16]/5 transition-colors">
                    Đăng ký nhận thông báo <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7: TESTIMONIALS ═══ */}
      <section id="testimonials" className="py-12 sm:py-24 px-4 sm:px-6 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-6">
            Hơn 1,200 Học Viên Đã <span className="text-[#84CC16]">Thay Đổi Cuộc Đời</span>
          </h2>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
            {statsBar.map((s, i) => (
              <div key={i} className="text-center bg-[#111] border border-white/5 rounded-xl py-5 px-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#FBBF24]">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Testimonial cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-5">
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(j => <Star key={j} size={13} fill="#F59E0B" color="#F59E0B" />)}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed mb-4 italic">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #FBBF24, #84CC16)", color: "#0a0a0a" }}>
                    {t.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                  <span className="text-xs font-medium text-[#84CC16] shrink-0">{t.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 8: FREE OFFER ═══ */}
      <section id="free-offer" className="py-12 sm:py-24 px-4 sm:px-6 relative overflow-hidden scroll-mt-20">
        {/* Background glow */}
        <div className="absolute inset-0 opacity-10"
          style={{ background: "radial-gradient(ellipse at center, #FBBF24, transparent 70%)" }} />

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-bold"
              style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24" }}>
              <Gift size={16} /> TẶNG MIỄN PHÍ TỪ LÊ ĐĂNG KHƯƠNG
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-3">
              &quot;Bí Mật Video AI <span className="text-[#FBBF24]">Triệu View</span>&quot;
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Cẩm Nang Độc Quyền Giúp Bạn Tạo Video AI Viral Triệu View — Ngay Cả Khi Bạn Mới Bắt Đầu Từ Con Số 0
            </p>
          </div>

          {/* Banner image */}
          <div className="mb-10 rounded-2xl overflow-hidden border border-[#FBBF24]/20">
            <img
              src="/images/hero/offer-banner.jpg"
              alt="Bí Mật Video AI Triệu View - Khoá học miễn phí"
              className="w-full h-auto object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                if (target.parentElement) {
                  target.parentElement.innerHTML = `
                    <div style="background: linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(132,204,22,0.08) 100%); padding: 48px 24px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 12px;">🎁</div>
                      <div style="color: #FBBF24; font-weight: 700; font-size: 20px; margin-bottom: 8px;">BÍ MẬT VIDEO AI TRIỆU VIEW</div>
                      <div style="color: #9ca3af; font-size: 14px;">Tải ảnh banner lên: /images/hero/offer-banner.jpg</div>
                    </div>
                  `;
                }
              }}
            />
          </div>

          {/* Value badge + countdown */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <span className="text-sm font-bold px-4 py-2 rounded-full"
              style={{ background: "rgba(251,191,36,0.1)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.2)" }}>
              💎 Trị giá 2.990.000đ — Miễn phí
            </span>
            <span className="text-sm font-mono text-[#84CC16]">
              ⏰ Ưu đãi kết thúc sau: {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left - content */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold">📦 Bên trong cẩm nang có gì?</h3>

              {freeOfferItems.map((item, i) => (
                <div key={i} className="flex gap-4 bg-[#111] border border-white/5 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(251,191,36,0.1)" }}>
                    <item.icon size={18} className="text-[#FBBF24]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}

              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2"><CheckCircle size={14} className="text-[#22c55e]" /> Đã giúp <strong className="text-white">1,300+ học viên</strong> tạo video triệu view</div>
                <div className="flex items-center gap-2"><CheckCircle size={14} className="text-[#22c55e]" /> Tổng cộng học viên đã tạo ra <strong className="text-white">300M+ view</strong></div>
                <div className="flex items-center gap-2"><CheckCircle size={14} className="text-[#22c55e]" /> Đánh giá <strong className="text-white">4.9/5</strong> từ 500+ học viên</div>
              </div>
            </div>

            {/* Right - CTA box */}
            <div className="bg-[#111] border-2 border-[#FBBF24]/30 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center">
              <Gift size={40} className="text-[#FBBF24] mb-4" />
              <h3 className="text-xl font-bold mb-3">NHẬN CẨM NANG NGAY HÔM NAY</h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Đăng ký miễn phí để nhận ngay khoá học &quot;Bí Mật Video AI Triệu View&quot; + bộ tài liệu độc quyền trị giá 2.990.000đ
              </p>

              {formStatus === "verify" ? (
                <div className="w-full">
                  <CheckCircle size={48} className="text-[#22c55e] mx-auto mb-4" />
                  <h4 className="text-lg font-bold mb-2">Đăng ký thành công! 🎉</h4>
                  <p className="text-sm text-gray-400 mb-4">Vui lòng kiểm tra email để xác thực tài khoản, sau đó đăng nhập.</p>
                  <Link href="/login" className="btn-green w-full justify-center py-3 text-base">
                    Đăng nhập <ArrowRight size={18} />
                  </Link>
                </div>
              ) : (
                <button onClick={() => setShowLeadModal(true)}
                  className="btn-green w-full justify-center py-3.5 text-base">
                  <Download size={18} /> ĐĂNG KÝ NHẬN MIỄN PHÍ →
                </button>
              )}

              <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><Shield size={10} /> Bảo mật tuyệt đối</span>
                <span className="flex items-center gap-1"><Zap size={10} /> Gửi trong 2 phút</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 9: FAQ ═══ */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-14">
            Câu Hỏi <span className="text-[#FBBF24]">Thường Gặp</span>
          </h2>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/2 transition-colors"
                >
                  <span className="font-semibold text-sm sm:text-base pr-4">{f.q}</span>
                  <ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
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

      {/* ═══ SECTION 10: FINAL CTA ═══ */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ background: "radial-gradient(circle at center, #FBBF24, transparent 60%)" }} />

        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-4">
            Sẵn Sàng <span className="text-[#FBBF24]">Bứt Phá</span> Cùng Lê Đăng Khương?
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Tham gia cùng 1,300+ chuyên gia Việt Nam đang làm chủ Video AI, xây kênh triệu view và kiếm tiền tự động với AI Agent.
          </p>

          <div className="flex items-center justify-center gap-2 mb-8 text-sm text-gray-500">
            {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#F59E0B" color="#F59E0B" />)}
            <span className="ml-1">4.9/5 từ 500+ học viên</span>
            <span className="mx-2">|</span>
            <span>👥 1,300+ học viên đã thành công</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setShowLeadModal(true)} className="btn-green text-base py-3.5 px-8 justify-center">
              <Download size={18} /> Đăng ký nhận Bí Mật Video AI Triệu View
            </button>
            <a href="https://web.facebook.com/jackmadk13" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 py-3.5 px-8 rounded-lg text-base font-semibold border border-white/10 hover:border-white/20 transition-colors">
              <MessageCircle size={16} className="text-[#FBBF24]" /> Tư vấn trực tiếp
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-12 pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Col 1: About */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/images/about/portrait.jpg" alt="Lê Đăng Khương" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-bold text-sm">Lê Đăng Khương</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Giới thiệu</a></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><a href="https://web.facebook.com/jackmadk13" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Liên hệ</a></li>
              </ul>
            </div>

            {/* Col 2: Courses */}
            <div>
              <h4 className="font-bold text-sm mb-4">Khoá học</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Video AI VEO3.1 A-Z</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Xây Kênh Triệu View</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AI Agent Bán Hàng</a></li>
                <li><a href="#" className="hover:text-white transition-colors">30Day10M Challenge</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sản phẩm số</a></li>
              </ul>
            </div>

            {/* Col 3: Links */}
            <div>
              <h4 className="font-bold text-sm mb-4">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/community" className="hover:text-white transition-colors">Cộng đồng</Link></li>
                <li><Link href="/events" className="hover:text-white transition-colors">Sự kiện</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Col 4: Newsletter */}
            <div>
              <h4 className="font-bold text-sm mb-4">Đăng ký nhận tin</h4>
              <p className="text-xs text-gray-500 mb-3">Nhận tip Video AI + Xây kênh triệu view mỗi tuần</p>
              <form className="flex gap-2">
                <input type="email" placeholder="Email của bạn" className="input-dark flex-1 text-sm py-2 px-3" />
                <button type="submit" className="btn-green text-xs py-2 px-3 shrink-0">Đăng ký</button>
              </form>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
            <p>© 2026 Lê Đăng Khương | dangkhuong.com | Powered by Kohada</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Refund Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══ STICKY FLOATING CTA BAR ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]"
        style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.9) 30%)" }}>
        <div className="max-w-lg mx-auto px-4 pb-4 pt-6 flex items-center justify-center gap-2">
          {/* Left arrows */}
          <div className="flex items-center gap-0.5 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="blink-arrow">
              <path d="M13 5l7 7-7 7" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="blink-arrow-delay">
              <path d="M13 5l7 7-7 7" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <button onClick={() => setShowLeadModal(true)}
            className="btn-success py-3 px-6 sm:px-8 text-sm sm:text-base rounded-full shadow-lg shadow-green-500/25 flex-1 max-w-sm justify-center">
            <Download size={16} /> Đăng ký nhận Bí Mật Video AI Triệu View Miễn Phí
          </button>

          {/* Right arrows */}
          <div className="flex items-center gap-0.5 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="blink-arrow-delay" style={{ transform: "scaleX(-1)" }}>
              <path d="M13 5l7 7-7 7" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="blink-arrow" style={{ transform: "scaleX(-1)" }}>
              <path d="M13 5l7 7-7 7" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ═══ ĐĂNG KÝ POPUP MODAL ═══ */}
      {showLeadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => formStatus !== "loading" && setShowLeadModal(false)} />
          <div className="relative w-full max-w-md bg-[#111] border border-[#FBBF24]/30 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button onClick={() => formStatus !== "loading" && setShowLeadModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10 p-1 rounded-lg hover:bg-white/5">
              <X size={18} />
            </button>

            {/* Header glow */}
            <div className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at top, #FBBF24, transparent 80%)" }} />

            <div className="relative p-6 sm:p-8">
              {/* Verify email state */}
              {formStatus === "verify" ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
                    style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)" }}>
                    <Mail size={32} className="text-[#D4A843]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Kiểm tra email của bạn</h3>
                  <p className="text-sm text-gray-400 mb-2 leading-relaxed">
                    Chúng tôi đã gửi email xác thực đến:
                  </p>
                  <p className="text-[#D4A843] font-semibold mb-4">{formData.email}</p>
                  <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    Vui lòng mở email và nhấn <span className="text-gray-300 font-medium">&quot;Xác thực tài khoản&quot;</span> để kích hoạt.
                    Kiểm tra cả thư mục <span className="text-gray-300 font-medium">Spam</span> nếu không thấy.
                  </p>
                  <Link href="/login" className="btn-green w-full justify-center py-3 text-base"
                    onClick={() => setShowLeadModal(false)}>
                    Đã xác thực? Đăng nhập
                  </Link>
                  <p className="text-xs text-gray-500 mt-3">Link xác thực có hiệu lực trong 24 giờ.</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center mb-6">
                    <img src="/images/about/portrait.jpg" alt="Lê Đăng Khương" className="w-14 h-14 rounded-2xl mb-3 object-cover inline-block" />
                    <h3 className="text-xl font-bold mb-1">Tạo tài khoản miễn phí</h3>
                    <p className="text-sm text-gray-400">
                      Đăng ký để nhận <span className="text-[#FBBF24] font-semibold">&quot;Bí Mật Video AI Triệu View&quot;</span>
                    </p>
                  </div>

                  {/* Error */}
                  {formError && (
                    <div className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
                      style={{ background: "rgba(239,68,68,0.08)" }}>
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Họ và tên</label>
                      <input type="text" required value={formData.name}
                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                        className="input-dark w-full" placeholder="Nguyễn Văn A" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Số điện thoại <span className="text-red-400">*</span>
                      </label>
                      <input type="tel" required value={formData.phone}
                        onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                        pattern="^(0|\+84)[0-9]{9}$"
                        title="Nhập số điện thoại hợp lệ (VD: 0912345678)"
                        className="input-dark w-full" placeholder="0912345678" />
                      <p className="text-[10px] text-gray-600 mt-1">Định dạng: 09xx hoặc +84xxx (10 số)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                      <input type="email" required value={formData.email}
                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                        className="input-dark w-full" placeholder="ban@email.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu</label>
                      <PasswordInput name="popup_password"
                        placeholder="Tối thiểu 8 ký tự"
                        minLength={8} />
                      {/* Hidden input to sync password to state */}
                    </div>

                    {/* Turnstile CAPTCHA */}
                    <TurnstileWidget onVerify={handleTurnstileVerify} onExpire={handleTurnstileExpire} />

                    <p className="text-xs text-gray-500 pt-1">
                      Bằng cách đăng ký, bạn đồng ý với{" "}
                      <a href="#" className="text-[#D4A843] hover:underline">Điều khoản dịch vụ</a> và{" "}
                      <a href="#" className="text-[#D4A843] hover:underline">Chính sách bảo mật</a>
                    </p>
                    <button type="submit" disabled={formStatus === "loading"}
                      className="btn-green w-full justify-center py-2.5 mt-2 disabled:opacity-50">
                      {formStatus === "loading" ? "Đang xử lý..." : "Đăng ký — Hoàn toàn miễn phí"}
                    </button>
                  </form>

                  {/* Social Login */}
                  <div className="mt-5">
                    <SocialLoginButtons />
                  </div>

                  <p className="text-center text-sm text-gray-500 mt-5">
                    Đã có tài khoản?{" "}
                    <Link href="/login" className="text-[#D4A843] font-medium hover:underline"
                      onClick={() => setShowLeadModal(false)}>
                      Đăng nhập
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
