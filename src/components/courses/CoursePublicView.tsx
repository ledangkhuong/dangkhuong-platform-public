"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  PlayCircle,
  Lock,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";
import VideoPlayer from "@/components/courses/VideoPlayer";
import RichDescription from "@/components/courses/RichDescription";
import CheckoutModal from "@/components/checkout/CheckoutModal";

/* ─── Types ─── */

interface Lesson {
  id: string;
  title: string;
  youtube_id: string | null;
  duration_sec: number;
  is_free: boolean;
  sort_order: number;
  unlock_after_days?: number;
}

interface Chapter {
  id: string;
  title: string;
  sort_order: number;
  lessons: Lesson[];
}

interface Instructor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface CoursePublicViewProps {
  product: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    description_html: string | null;
    price: number;
    sale_price: number | null;
    thumbnail: string | null;
    type: string;
  };
  chapters: Chapter[];
  isAuthenticated: boolean;
  productId?: string;
  enrolledAt?: string; // ISO date when user enrolled
  instructor?: Instructor | null;
}

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

function isDripLocked(lesson: Lesson, enrolledAt?: string): boolean {
  if (!enrolledAt || !lesson.unlock_after_days || lesson.unlock_after_days === 0)
    return false;
  const enrollDate = new Date(enrolledAt);
  const unlockDate = new Date(
    enrollDate.getTime() + lesson.unlock_after_days * 24 * 60 * 60 * 1000
  );
  return new Date() < unlockDate;
}

function dripDaysLeft(lesson: Lesson, enrolledAt?: string): number {
  if (!enrolledAt || !lesson.unlock_after_days || lesson.unlock_after_days === 0)
    return 0;
  const enrollDate = new Date(enrolledAt);
  const unlockDate = new Date(
    enrollDate.getTime() + lesson.unlock_after_days * 24 * 60 * 60 * 1000
  );
  const diff = unlockDate.getTime() - new Date().getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

/* ─── Component ─── */

export default function CoursePublicView({
  product,
  chapters,
  isAuthenticated,
  enrolledAt,
  instructor,
}: CoursePublicViewProps) {
  const [activeVideo, setActiveVideo] = useState<{
    youtubeId: string;
    title: string;
  } | null>(null);
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(
    new Set()
  );
  const [showCheckout, setShowCheckout] = useState(false);

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

  const toggleChapter = (chapterId: string) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const handleFreeLesson = (lesson: Lesson) => {
    if (!lesson.is_free || !lesson.youtube_id) return;
    setActiveVideo({ youtubeId: lesson.youtube_id, title: lesson.title });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProLesson = () => {
    if (!isAuthenticated) {
      window.location.href = "/register";
      return;
    }
    if (!isFree) {
      setShowCheckout(true);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* ═══ VIDEO PLAYER (when a free lesson is selected) ═══ */}
      {activeVideo && (
        <section className="max-w-4xl mx-auto px-4 pt-20 pb-4">
          <VideoPlayer
            youtubeId={activeVideo.youtubeId}
            title={activeVideo.title}
          />
          <div className="mt-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {activeVideo.title}
            </h3>
            <button
              onClick={() => setActiveVideo(null)}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Đóng video
            </button>
          </div>
        </section>
      )}

      {/* ═══ HERO SECTION ═══ */}
      <section
        className="relative"
        style={{
          paddingTop: activeVideo ? "2rem" : "5rem",
          paddingBottom: "3rem",
        }}
      >
        {/* Background */}
        {product.thumbnail && !activeVideo && (
          <div className="absolute inset-0 z-0">
            <Image
              src={product.thumbnail}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-15"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(10,10,10,0.6) 0%, #0a0a0a 100%)",
              }}
            />
          </div>
        )}

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left: Course info */}
            <div className="lg:col-span-2">
              {/* Thumbnail (mobile only, when no video is playing) */}
              {product.thumbnail && !activeVideo && (
                <div className="lg:hidden mb-6 rounded-xl overflow-hidden border border-[#2a2a2a]">
                  <Image
                    src={product.thumbnail}
                    alt={product.title}
                    width={800}
                    height={450}
                    sizes="100vw"
                    className="w-full aspect-video object-cover"
                  />
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
                {product.title}
              </h1>

              {product.description && (
                <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6 max-w-2xl">
                  {product.description}
                </p>
              )}

              {/* Rich description */}
              {product.description_html && (
                <div className="mb-6 max-w-2xl">
                  <RichDescription html={product.description_html} />
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <BookOpen size={16} className="text-[#D4A843]" />
                  {sortedChapters.length} chương
                </span>
                <span className="flex items-center gap-1.5">
                  <PlayCircle size={16} className="text-[#D4A843]" />
                  {totalLessons} bài học
                </span>
                {totalDuration > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={16} className="text-[#D4A843]" />
                    {formatTotalDuration(totalDuration)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Award size={16} className="text-[#D4A843]" />
                  Chứng chỉ hoàn thành
                </span>
              </div>
            </div>

            {/* Right: Price card */}
            <div
              className="card-dark p-5 lg:sticky lg:top-20"
              style={{ background: "#151515" }}
            >
              {/* Thumbnail desktop */}
              {product.thumbnail && (
                <div className="hidden lg:block mb-4 rounded-lg overflow-hidden border border-[#2a2a2a]">
                  <Image
                    src={product.thumbnail}
                    alt={product.title}
                    width={400}
                    height={225}
                    sizes="400px"
                    className="w-full aspect-video object-cover"
                  />
                </div>
              )}

              {/* Price */}
              <div className="mb-4">
                {isFree ? (
                  <div className="text-2xl font-bold text-[#22c55e]">
                    Miễn phí
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#D4A843]">
                      {formatPrice(displayPrice)}
                    </span>
                    {hasSale && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Meta in card */}
              <div
                className="space-y-2 mb-5 pb-4"
                style={{ borderBottom: "1px solid #2a2a2a" }}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Số chương</span>
                  <span className="text-white font-medium">
                    {sortedChapters.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Số bài học</span>
                  <span className="text-white font-medium">{totalLessons}</span>
                </div>
                {totalDuration > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Thời lượng</span>
                    <span className="text-white font-medium">
                      {formatTotalDuration(totalDuration)}
                    </span>
                  </div>
                )}
              </div>

              {/* CTA */}
              {!isAuthenticated ? (
                <Link
                  href="/register"
                  className={`${isFree ? "btn-success" : "btn-gold"} w-full justify-center text-sm py-3`}
                >
                  {isFree ? "Đăng ký miễn phí để vào học" : "Đăng ký để mua khoá học"}
                </Link>
              ) : isFree ? (
                <Link
                  href={`/courses/${product.slug}`}
                  className="btn-success w-full justify-center text-sm py-3"
                >
                  Vào học ngay
                </Link>
              ) : (
                <button
                  onClick={() => setShowCheckout(true)}
                  className="btn-gold w-full justify-center text-sm py-3"
                >
                  Mua khoá học — {formatPrice(displayPrice)}
                </button>
              )}

              {!isAuthenticated && (
                <p className="text-center text-xs text-gray-500 mt-3">
                  Đã có tài khoản?{" "}
                  <Link
                    href="/login"
                    className="text-[#D4A843] hover:underline"
                  >
                    Đăng nhập
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ INSTRUCTOR SECTION ═══ */}
      {instructor && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
          <div className="max-w-4xl">
            <div
              className="rounded-xl p-5 sm:p-6"
              style={{ background: "#151515", border: "1px solid #2a2a2a" }}
            >
              <h3 className="text-lg font-bold text-white mb-4">Giảng viên</h3>
              <div className="flex items-start gap-4">
                {instructor.avatar_url ? (
                  <Image
                    src={instructor.avatar_url}
                    alt={instructor.full_name || ""}
                    width={64}
                    height={64}
                    className="rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#D4A843]/20 flex items-center justify-center text-[#D4A843] text-xl font-bold shrink-0">
                    {(instructor.full_name || "?")[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-white">
                    {instructor.full_name}
                  </p>
                  {instructor.bio && (
                    <p className="text-sm text-gray-400 mt-1">
                      {instructor.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ CURRICULUM SECTION ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="lg:col-span-2 max-w-4xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Nội dung khoá học
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            {sortedChapters.length} chương &bull; {totalLessons} bài học
            {totalDuration > 0 && (
              <> &bull; {formatTotalDuration(totalDuration)}</>
            )}
          </p>

          {/* Chapters */}
          <div className="space-y-3">
            {sortedChapters.map((chapter, chIdx) => {
              const isCollapsed = collapsedChapters.has(chapter.id);
              const chapterLessons = chapter.lessons;
              const freeLessons = chapterLessons.filter((l) => l.is_free);

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
                          {chapterLessons.length} bài học
                          {freeLessons.length > 0 && (
                            <> &bull; {freeLessons.length} miễn phí</>
                          )}
                        </span>
                      </div>
                    </div>
                    {isCollapsed ? (
                      <ChevronDown size={16} className="text-gray-500" />
                    ) : (
                      <ChevronUp size={16} className="text-gray-500" />
                    )}
                  </button>

                  {/* Lessons */}
                  {!isCollapsed && (
                    <div
                      className="px-4 pb-3 space-y-0.5"
                      style={{ borderTop: "1px solid #1f1f1f" }}
                    >
                      {chapterLessons.map((lesson) => {
                        const dripLocked = isDripLocked(lesson, enrolledAt);
                        const isFreeLesson =
                          lesson.is_free && !!lesson.youtube_id && !dripLocked;
                        const isPlaying =
                          activeVideo?.youtubeId === lesson.youtube_id;
                        const remainingDays = dripLocked
                          ? dripDaysLeft(lesson, enrolledAt)
                          : 0;

                        return (
                          <div
                            key={lesson.id}
                            onClick={() =>
                              dripLocked
                                ? undefined
                                : isFreeLesson
                                  ? handleFreeLesson(lesson)
                                  : handleProLesson()
                            }
                            className={`flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors ${
                              dripLocked
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer"
                            } ${
                              dripLocked
                                ? ""
                                : isFreeLesson
                                  ? "hover:bg-white/[0.04]"
                                  : "hover:bg-white/[0.02]"
                            } ${isPlaying ? "bg-[#D4A843]/10" : ""}`}
                          >
                            {/* Icon */}
                            {dripLocked ? (
                              <Clock
                                size={16}
                                className="text-gray-500 shrink-0"
                              />
                            ) : lesson.is_free ? (
                              <PlayCircle
                                size={16}
                                className={
                                  isPlaying
                                    ? "text-[#D4A843] shrink-0"
                                    : "text-[#22c55e] shrink-0"
                                }
                              />
                            ) : (
                              <Lock
                                size={14}
                                className="text-gray-500 shrink-0"
                              />
                            )}

                            {/* Title */}
                            <span
                              className={`text-sm flex-1 ${
                                dripLocked
                                  ? "text-gray-500"
                                  : lesson.is_free
                                    ? "text-gray-200"
                                    : "text-gray-500"
                              } ${isPlaying ? "text-[#D4A843] font-medium" : ""}`}
                            >
                              {lesson.title}
                            </span>

                            {/* Drip badge */}
                            {dripLocked ? (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  background: "rgba(107,114,128,0.12)",
                                  color: "#9ca3af",
                                  border: "1px solid rgba(107,114,128,0.25)",
                                }}
                              >
                                Mở sau {remainingDays} ngày
                              </span>
                            ) : /* Free / Pro badge */
                            lesson.is_free ? (
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

                            {/* Duration */}
                            {lesson.duration_sec > 0 && (
                              <span className="text-xs text-gray-500 tabular-nums shrink-0">
                                {formatDuration(lesson.duration_sec)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {sortedChapters.length === 0 && (
            <div className="card-dark p-10 text-center">
              <BookOpen size={40} className="text-gray-500 mx-auto mb-3" />
              <h3 className="font-bold text-white mb-1">
                Nội dung đang được cập nhật
              </h3>
              <p className="text-sm text-gray-400">
                Khoá học sẽ sớm có nội dung chi tiết.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ BOTTOM CTA (mobile sticky) ═══ */}
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

          {!isAuthenticated ? (
            <Link href="/register" className={`${isFree ? "btn-success" : "btn-gold"} text-sm py-2.5 px-5`}>
              {isFree ? "Đăng ký" : "Đăng ký ngay"}
            </Link>
          ) : isFree ? (
            <Link
              href={`/courses/${product.slug}`}
              className="btn-success text-sm py-2.5 px-5"
            >
              Vào học
            </Link>
          ) : (
            <button
              onClick={() => setShowCheckout(true)}
              className="btn-gold text-sm py-2.5 px-5"
            >
              Mua ngay
            </button>
          )}
        </div>
      </div>

      {/* Bottom spacer for mobile sticky bar */}
      <div className="h-16 lg:hidden" />

      {/* Checkout Modal for Pro lessons */}
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
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
