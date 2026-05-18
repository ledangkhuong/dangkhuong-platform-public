"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Lock,
  Clock,
  BookOpen,
  Award,
  ShieldCheck,
  Users,
} from "lucide-react";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { siteConfig } from "@/lib/site-config";

/* ─── Types ─── */

interface SalesProduct {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  description_html: string | null;
  price: number;
  sale_price: number | null;
  thumbnail: string | null;
}

interface SalesChapter {
  id: string;
  title: string;
  sort_order: number;
  lessons: {
    id: string;
    title: string;
    duration_sec: number;
    is_free: boolean;
    sort_order: number;
  }[];
}

interface PainPoint {
  icon: string;
  title: string;
  description: string;
}

interface Benefit {
  icon: string;
  title: string;
  description: string;
}

interface Testimonial {
  name: string;
  role: string;
  text: string;
  avatar?: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface Instructor {
  name: string;
  bio: string;
  avatar: string;
}

export interface SalesPageProps {
  product: SalesProduct;
  chapters: SalesChapter[];
  isAuthenticated: boolean;
  painPoints?: PainPoint[];
  benefits?: Benefit[];
  testimonials?: Testimonial[];
  faqs?: FAQ[];
  instructor?: Instructor;
  guaranteeDays?: number;
}

/* ─── Defaults ─── */

const defaultPainPoints: PainPoint[] = [
  {
    icon: "\u{1F630}",
    title: "Không biết bắt đầu từ đâu",
    description:
      "Quá nhiều thông tin nhưng không có lộ trình rõ ràng",
  },
  {
    icon: "⏰",
    title: "Mất thời gian tự mày mò",
    description:
      "Tự học tốn hàng tháng trời mà vẫn không có kết quả",
  },
  {
    icon: "\u{1F4B8}",
    title: "Tốn tiền cho những khoá học kém chất lượng",
    description:
      "Đầu tư nhưng không nhận được giá trị tương xứng",
  },
  {
    icon: "\u{1F61E}",
    title: "Thiếu mentor hướng dẫn",
    description:
      "Không có ai đồng hành và giải đáp thắc mắc khi cần",
  },
];

const defaultBenefits: Benefit[] = [
  {
    icon: "\u{1F3AF}",
    title: "Lộ trình rõ ràng từ A-Z",
    description:
      "Được thiết kế bài bản, từ cơ bản đến nâng cao",
  },
  {
    icon: "\u{1F3A5}",
    title: "Video chất lượng cao",
    description:
      "Bài giảng sinh động, dễ hiểu, xem lại không giới hạn",
  },
  {
    icon: "\u{1F468}‍\u{1F3EB}",
    title: "Giảng viên giàu kinh nghiệm",
    description:
      "Học trực tiếp từ chuyên gia hàng đầu trong lĩnh vực",
  },
  {
    icon: "\u{1F4DC}",
    title: "Chứng chỉ hoàn thành",
    description:
      "Nhận chứng chỉ sau khi hoàn thành 100% khoá học",
  },
];

const defaultFaqs: FAQ[] = [
  {
    question:
      "Khoá học có thời hạn truy cập không?",
    answer:
      "Không! Bạn được truy cập khoá học trọn đời sau khi mua.",
  },
  {
    question:
      "Tôi có thể hoàn tiền không?",
    answer:
      "Có! Chúng tôi cam kết hoàn tiền 100% trong vòng 7 ngày nếu bạn không hài lòng.",
  },
  {
    question:
      "Tôi cần kiến thức gì trước khi học?",
    answer:
      "Không cần! Khoá học được thiết kế cho cả người mới bắt đầu.",
  },
  {
    question:
      "Làm sao để được hỗ trợ?",
    answer:
      "Bạn có thể đặt câu hỏi trực tiếp trong mỗi bài học hoặc liên hệ qua Zalo/Facebook.",
  },
];

/* ─── Helpers ─── */

function formatPrice(p: number) {
  return p.toLocaleString("vi-VN") + "đ";
}

function formatDuration(sec: number) {
  if (sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTotalDuration(sec: number) {
  if (sec <= 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
}

function calcDiscount(original: number, sale: number) {
  if (original <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

/* ─── Component ─── */

export default function SalesPageTemplate({
  product,
  chapters,
  isAuthenticated,
  painPoints,
  benefits,
  testimonials,
  faqs,
  instructor,
  guaranteeDays = 7,
}: SalesPageProps) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    () => new Set(chapters.slice(0, 2).map((ch) => ch.id))
  );
  const [expandedFaqs, setExpandedFaqs] = useState<Set<number>>(new Set());

  const sortedChapters = useMemo(
    () =>
      [...chapters]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((ch) => ({
          ...ch,
          lessons: [...ch.lessons].sort((a, b) => a.sort_order - b.sort_order),
        })),
    [chapters]
  );

  const totalLessons = useMemo(
    () => sortedChapters.reduce((sum, ch) => sum + ch.lessons.length, 0),
    [sortedChapters]
  );

  const totalDuration = useMemo(
    () =>
      sortedChapters.reduce(
        (sum, ch) =>
          sum + ch.lessons.reduce((s, l) => s + (l.duration_sec || 0), 0),
        0
      ),
    [sortedChapters]
  );

  const hasSale =
    product.sale_price !== null && product.sale_price < product.price;
  const displayPrice = hasSale ? product.sale_price! : product.price;
  const isFree = product.price === 0;
  const discount = hasSale ? calcDiscount(product.price, product.sale_price!) : 0;

  const usedPainPoints = painPoints?.length ? painPoints : defaultPainPoints;
  const usedBenefits = benefits?.length ? benefits : defaultBenefits;
  const usedFaqs = faqs?.length ? faqs : defaultFaqs;
  const usedInstructor = instructor ?? {
    name: siteConfig.owner.name,
    bio: siteConfig.owner.bio,
    avatar: siteConfig.owner.avatar,
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFaq = (idx: number) => {
    setExpandedFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleCTA = () => {
    if (!isAuthenticated) {
      window.location.href = "/register";
      return;
    }
    if (isFree) {
      window.location.href = `/courses/${product.slug}`;
      return;
    }
    setShowCheckout(true);
  };

  const ctaLabel = isFree
    ? "Vào học ngay"
    : isAuthenticated
      ? `Mua khoá học — ${formatPrice(displayPrice)}`
      : "Đăng ký ngay";

  /* ─── Section: Price block ─── */
  const priceBlock = (
    <div className="flex items-center gap-3 flex-wrap">
      {isFree ? (
        <span className="text-3xl font-bold text-[#22c55e]">
          Miễn phí
        </span>
      ) : (
        <>
          <span className="text-3xl sm:text-4xl font-bold text-[#D4A843]">
            {formatPrice(displayPrice)}
          </span>
          {hasSale && (
            <>
              <span className="text-lg text-gray-500 line-through">
                {formatPrice(product.price)}
              </span>
              <span
                className="text-sm font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                -{discount}%
              </span>
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* ═══════════════════════════════════════════════
          SECTION 1: HERO
      ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: "70vh" }}>
        {/* Background image */}
        {product.thumbnail && (
          <div className="absolute inset-0 z-0">
            <img
              src={product.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: "blur(20px) brightness(0.3)", transform: "scale(1.1)" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.85) 60%, #0a0a0a 100%)",
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-24">
          <div className="text-center">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
              {product.title}
            </h1>

            {/* Description */}
            {product.description && (
              <p className="text-gray-300 text-lg sm:text-xl leading-relaxed mb-8 max-w-3xl mx-auto">
                {product.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8 text-sm sm:text-base text-gray-400">
              <span className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#D4A843]" />
                {sortedChapters.length} chương
              </span>
              <span className="flex items-center gap-2">
                <PlayCircle size={18} className="text-[#D4A843]" />
                {totalLessons} bài học
              </span>
              {totalDuration > 0 && (
                <span className="flex items-center gap-2">
                  <Clock size={18} className="text-[#D4A843]" />
                  {formatTotalDuration(totalDuration)}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Award size={18} className="text-[#D4A843]" />
                Chứng chỉ hoàn thành
              </span>
            </div>

            {/* Price */}
            <div className="flex justify-center mb-6">{priceBlock}</div>

            {/* CTA */}
            <button
              onClick={handleCTA}
              className="btn-gold text-base sm:text-lg py-3.5 px-10 sm:px-14"
            >
              {ctaLabel}
            </button>

            {/* Trust badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
              <ShieldCheck size={16} className="text-[#22c55e]" />
              <span>
                Hoàn tiền trong {guaranteeDays} ngày nếu không hài lòng
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 2: PAIN POINTS
      ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#0d0d0d" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
            Bạn có đang gặp vấn đề này?
          </h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
            Nếu bạn đang gặp những vấn đề dưới đây, khoá học này chính là giải pháp dành cho bạn.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {usedPainPoints.map((point, i) => (
              <div
                key={i}
                className="rounded-xl p-5 sm:p-6 transition-colors"
                style={{
                  background: "#151515",
                  border: "1px solid #2a2a2a",
                }}
              >
                <div className="text-3xl mb-3">{point.icon}</div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {point.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 3: SOLUTION / BENEFITS
      ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#0a0a0a" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
            Khoá học này sẽ giúp bạn...
          </h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
            Những giá trị bạn sẽ nhận được khi tham gia khoá học
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {usedBenefits.map((benefit, i) => (
              <div
                key={i}
                className="rounded-xl p-5 sm:p-6 transition-colors"
                style={{
                  background: "#111",
                  border: "1px solid rgba(212,168,67,0.15)",
                }}
              >
                <div className="text-3xl mb-3">{benefit.icon}</div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 4: CURRICULUM
      ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#0d0d0d" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
            Nội dung khoá học
          </h2>
          <p className="text-gray-400 text-center mb-10">
            {sortedChapters.length} chương &bull; {totalLessons} bài học
            {totalDuration > 0 && <> &bull; {formatTotalDuration(totalDuration)}</>}
          </p>

          {sortedChapters.length === 0 ? (
            <div
              className="rounded-xl p-10 text-center"
              style={{ background: "#151515", border: "1px solid #2a2a2a" }}
            >
              <BookOpen size={40} className="text-gray-500 mx-auto mb-3" />
              <h3 className="font-bold text-white mb-1">
                Nội dung đang được cập nhật
              </h3>
              <p className="text-sm text-gray-400">
                Khoá học sẽ sớm có nội dung chi tiết.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedChapters.map((chapter, chIdx) => {
                const isExpanded = expandedChapters.has(chapter.id);
                const chapterDuration = chapter.lessons.reduce(
                  (s, l) => s + (l.duration_sec || 0),
                  0
                );
                const freeLessons = chapter.lessons.filter((l) => l.is_free);

                return (
                  <div
                    key={chapter.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: "#151515",
                      border: "1px solid #2a2a2a",
                    }}
                  >
                    {/* Chapter header */}
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: "rgba(212,168,67,0.12)",
                            color: "#D4A843",
                          }}
                        >
                          {chIdx + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-white">
                            {chapter.title}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {chapter.lessons.length} bài học
                            {freeLessons.length > 0 && (
                              <> &bull; {freeLessons.length} miễn phí</>
                            )}
                            {chapterDuration > 0 && (
                              <> &bull; {formatTotalDuration(chapterDuration)}</>
                            )}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-500" />
                      )}
                    </button>

                    {/* Lessons */}
                    {isExpanded && (
                      <div
                        className="px-4 pb-3 space-y-0.5"
                        style={{ borderTop: "1px solid #1f1f1f" }}
                      >
                        {chapter.lessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-3 py-2.5 px-2 rounded-lg"
                          >
                            {lesson.is_free ? (
                              <PlayCircle
                                size={16}
                                className="text-[#22c55e] shrink-0"
                              />
                            ) : (
                              <Lock
                                size={14}
                                className="text-gray-500 shrink-0"
                              />
                            )}

                            <span
                              className={`text-sm flex-1 ${
                                lesson.is_free ? "text-gray-200" : "text-gray-500"
                              }`}
                            >
                              {lesson.title}
                            </span>

                            {lesson.is_free ? (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  background: "rgba(34,197,94,0.12)",
                                  color: "#22c55e",
                                  border: "1px solid rgba(34,197,94,0.25)",
                                }}
                              >
                                Miễn phí
                              </span>
                            ) : !isFree ? (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  background: "rgba(212,168,67,0.12)",
                                  color: "#D4A843",
                                  border: "1px solid rgba(212,168,67,0.25)",
                                }}
                              >
                                Pro
                              </span>
                            ) : null}

                            {lesson.duration_sec > 0 && (
                              <span className="text-xs text-gray-500 tabular-nums shrink-0">
                                {formatDuration(lesson.duration_sec)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA after curriculum */}
          <div className="mt-10 text-center">
            <button
              onClick={handleCTA}
              className="btn-gold text-sm sm:text-base py-3 px-8 sm:px-12"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 5: INSTRUCTOR
      ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#0a0a0a" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">
            Giảng viên
          </h2>

          <div
            className="rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
            }}
          >
            {/* Avatar */}
            <div className="shrink-0">
              <img
                src={usedInstructor.avatar}
                alt={usedInstructor.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover"
                style={{ border: "3px solid #D4A843" }}
              />
            </div>

            {/* Info */}
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-white mb-2">
                {usedInstructor.name}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {usedInstructor.bio}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 6: TESTIMONIALS / SOCIAL PROOF
      ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#0d0d0d" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {testimonials && testimonials.length > 0 ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
                Học viên nói gì?
              </h2>
              <p className="text-gray-400 text-center mb-10">
                Những chia sẻ từ học viên đã tham gia khoá học
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {testimonials.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-5 sm:p-6"
                    style={{
                      background: "#151515",
                      border: "1px solid #2a2a2a",
                    }}
                  >
                    {/* Stars */}
                    <div className="flex gap-0.5 mb-3 text-[#D4A843]">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <svg
                          key={s}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">
                      &ldquo;{t.text}&rdquo;
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-3">
                      {t.avatar ? (
                        <img
                          src={t.avatar}
                          alt={t.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{
                            background: "rgba(212,168,67,0.15)",
                            color: "#D4A843",
                          }}
                        >
                          {t.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">
                          {t.name}
                        </p>
                        <p className="text-xs text-gray-500">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Generic social proof */
            <div className="text-center">
              <div
                className="inline-flex items-center gap-3 rounded-full px-6 py-3"
                style={{
                  background: "rgba(212,168,67,0.08)",
                  border: "1px solid rgba(212,168,67,0.2)",
                }}
              >
                <Users size={20} className="text-[#D4A843]" />
                <span className="text-base font-semibold text-white">
                  1,300+ học viên đã tham gia
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Hãy tham gia cùng hàng nghìn học viên khác
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 7: FAQ
      ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20" style={{ background: "#0a0a0a" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">
            Câu hỏi thường gặp
          </h2>

          <div className="space-y-3">
            {usedFaqs.map((faq, i) => {
              const isOpen = expandedFaqs.has(i);
              return (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "#151515",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  <button
                    onClick={() => toggleFaq(i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-sm font-medium text-white pr-4">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp size={16} className="text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div
                      className="px-5 pb-4"
                      style={{ borderTop: "1px solid #1f1f1f" }}
                    >
                      <p className="text-sm text-gray-400 leading-relaxed pt-3">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 8: FINAL CTA
      ═══════════════════════════════════════════════ */}
      <section
        className="py-16 sm:py-24"
        style={{
          background:
            "linear-gradient(180deg, #0d0d0d 0%, rgba(212,168,67,0.05) 50%, #0d0d0d 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Sẵn sàng bắt đầu?
          </h2>

          {/* Price */}
          <div className="flex justify-center mb-6">{priceBlock}</div>

          {/* CTA */}
          <button
            onClick={handleCTA}
            className="btn-gold text-base sm:text-lg py-3.5 px-10 sm:px-14 mb-6"
          >
            {ctaLabel}
          </button>

          {/* Urgency */}
          {!isFree && (
            <p className="text-sm text-gray-500 mb-4">
              Giá ưu đãi có thể thay đổi bất kỳ lúc nào
            </p>
          )}

          {/* Guarantee badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <ShieldCheck size={18} className="text-[#22c55e]" />
            <span className="text-sm font-medium text-[#22c55e]">
              Cam kết hoàn tiền 100% trong {guaranteeDays} ngày
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          STICKY BOTTOM BAR (Mobile)
      ═══════════════════════════════════════════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
        style={{
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid #1a1a1a",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            {isFree ? (
              <span className="text-base font-bold text-[#22c55e]">
                Miễn phí
              </span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-[#D4A843]">
                  {formatPrice(displayPrice)}
                </span>
                {hasSale && (
                  <span className="text-xs text-gray-500 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
            )}
            <span className="text-[11px] text-gray-500">
              {totalLessons} bài học
            </span>
          </div>

          <button
            onClick={handleCTA}
            className="btn-gold text-sm py-2.5 px-5"
          >
            {isFree ? "Vào học" : isAuthenticated ? "Mua ngay" : "Đăng ký ngay"}
          </button>
        </div>
      </div>

      {/* Bottom spacer for mobile sticky bar */}
      <div className="h-16 lg:hidden" />

      {/* Checkout Modal */}
      {showCheckout && isAuthenticated && !isFree && (
        <CheckoutModal
          product={{
            id: product.id,
            name: product.title,
            price: displayPrice,
            description: product.description ?? undefined,
          }}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false);
            window.location.href = `/courses/${product.slug}`;
          }}
        />
      )}
    </div>
  );
}
