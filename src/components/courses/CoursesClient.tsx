"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  PlayCircle, Lock, CheckCircle, ChevronDown, BookOpen,
  Clock, Video, Globe, TrendingUp, Sparkles, GraduationCap,
} from "lucide-react";
import CheckoutModal from "@/components/checkout/CheckoutModal";

type CourseItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  type: string;
  tier_required: string;
  thumbnail: string | null;
  status: string;
  category: string | null;
  enrolled: boolean;
  progress: number;
  lesson_count: number;
  chapter_count: number;
};

/* ─── Category config ───────────────────────────────────────────────────────── */

type CategoryKey = "video" | "branding" | "business" | "personal_development";

const CATEGORIES: {
  key: CategoryKey;
  title: string;
  subtitle: string;
  icon: typeof Video;
  color: string;
}[] = [
  {
    key: "video",
    title: "Khóa học làm video",
    subtitle: "Học cách tạo video chuyên nghiệp, thu hút triệu view",
    icon: Video,
    color: "#3b82f6",
  },
  {
    key: "branding",
    title: "Khóa học xây kênh, thương hiệu cá nhân",
    subtitle: "Xây dựng thương hiệu và kênh truyền thông bền vững",
    icon: Globe,
    color: "#a855f7",
  },
  {
    key: "business",
    title: "Khóa học kinh doanh, hệ thống chuyển đổi cao",
    subtitle: "Chiến lược kinh doanh và tối ưu doanh thu",
    icon: TrendingUp,
    color: "#f59e0b",
  },
  {
    key: "personal_development",
    title: "Khóa học phát triển bản thân",
    subtitle: "Nâng cao kỹ năng và tư duy để thành công",
    icon: Sparkles,
    color: "#22c55e",
  },
];

const PLACEHOLDER_COLORS = ["#D4A843", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#06b6d4"];

function formatPrice(p: number) {
  return p.toLocaleString("vi-VN") + "đ";
}

/* ─── Course Card ───────────────────────────────────────────────────────────── */

function CourseCard({
  course,
  idx,
  onBuy,
  isComingSoon,
}: {
  course: CourseItem;
  idx: number;
  onBuy: (course: CourseItem) => void;
  isComingSoon?: boolean;
}) {
  const isFree = course.price === 0;
  const isEnrolled = course.enrolled;
  const locked = !isEnrolled && !isFree && !isComingSoon;
  const hasSale = course.sale_price !== null && course.sale_price < course.price;
  const color = PLACEHOLDER_COLORS[idx % PLACEHOLDER_COLORS.length];

  const Wrapper = isComingSoon ? "div" : Link;
  const wrapperProps = isComingSoon
    ? { className: "card-dark overflow-hidden flex flex-col opacity-80 cursor-default" }
    : {
        href: `/courses/${course.slug}`,
        className: "card-dark overflow-hidden flex flex-col hover:ring-1 hover:ring-white/10 transition-all group",
      };

  return (
    // @ts-expect-error -- polymorphic wrapper
    <Wrapper key={course.id} {...wrapperProps}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#1a1a1a] overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            width={400}
            height={225}
            className={`w-full h-full object-cover ${isComingSoon ? "grayscale-[30%]" : "group-hover:scale-105"} transition-transform duration-300`}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)` }}
          >
            <BookOpen size={48} style={{ color: color + "60" }} />
          </div>
        )}

        {/* Badge overlay */}
        <div className="absolute top-3 left-3">
          {isComingSoon ? (
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-purple-600 text-white flex items-center gap-1">
              <Clock size={11} /> Sắp ra mắt
            </span>
          ) : isFree ? (
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#22c55e] text-white">
              Miễn phí
            </span>
          ) : isEnrolled ? (
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#22c55e]/90 text-white">
              Đã đăng ký
            </span>
          ) : (
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#f59e0b] text-black">
              Cần mua
            </span>
          )}
        </div>

        {/* Progress overlay */}
        {course.progress > 0 && !isComingSoon && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
            <div className="h-full bg-[#22c55e]" style={{ width: `${course.progress}%` }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-white text-sm leading-snug mb-1.5 line-clamp-2">
          {course.title}
        </h3>

        {course.description && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">
            {course.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
          {course.chapter_count > 0 && (
            <span className="flex items-center gap-1">
              <ChevronDown size={11} /> {course.chapter_count} chương
            </span>
          )}
          {course.lesson_count > 0 && (
            <span className="flex items-center gap-1">
              <PlayCircle size={11} /> {course.lesson_count} bài học
            </span>
          )}
          {course.progress > 0 && !isComingSoon && (
            <span className="flex items-center gap-1 text-[#22c55e]">
              <CheckCircle size={11} /> {course.progress}%
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: "1px solid #222" }}>
          <div>
            {isComingSoon ? (
              <span className="text-xs text-gray-500 italic">Đang chuẩn bị</span>
            ) : isFree ? (
              <span className="text-sm font-bold text-[#22c55e]">Miễn phí</span>
            ) : isEnrolled ? (
              <span className="text-xs text-gray-400">Đã sở hữu</span>
            ) : hasSale ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#f59e0b]">{formatPrice(course.sale_price!)}</span>
                <span className="text-xs text-gray-400 line-through">{formatPrice(course.price)}</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-[#f59e0b]">{formatPrice(course.price)}</span>
            )}
          </div>

          {isComingSoon ? (
            <span className="text-xs py-1.5 px-3 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-600/30 font-medium flex items-center gap-1">
              <Clock size={11} /> Chờ đón
            </span>
          ) : locked ? (
            <span
              className="btn-gold text-xs py-1.5 px-3"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBuy(course);
              }}
            >
              <Lock size={11} /> Mua ngay
            </span>
          ) : (
            <span className="btn-success text-xs py-1.5 px-3">
              <PlayCircle size={12} />
              {course.progress > 0 ? "Tiếp tục" : "Vào học"}
            </span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

/* ─── Section Header ────────────────────────────────────────────────────────── */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  iconColor,
}: {
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${iconColor}15` }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────────── */

export default function CoursesClient({ courses }: { courses: CourseItem[] }) {
  const [checkoutProduct, setCheckoutProduct] = useState<{
    id: string; name: string; price: number; description?: string;
  } | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const checkoutId = searchParams.get("checkout");
    if (!checkoutId) return;
    const course = courses.find((c) => c.id === checkoutId);
    if (course && !course.enrolled && course.price > 0) {
      setCheckoutProduct({
        id: course.id,
        name: course.title,
        price: course.sale_price ?? course.price,
        description: course.description ?? undefined,
      });
    }
  }, [searchParams, courses]);

  // Scroll to category section when ?cat= is present
  useEffect(() => {
    const cat = searchParams.get("cat");
    if (!cat) return;
    const el = document.getElementById(`cat-${cat}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [searchParams]);

  const handleBuy = (course: CourseItem) => {
    setCheckoutProduct({
      id: course.id,
      name: course.title,
      price: course.sale_price ?? course.price,
      description: course.description ?? undefined,
    });
  };

  // ── "Khóa học của tôi" — enrolled courses ──
  const myCourses = courses.filter(
    (c) => c.status !== "coming_soon" && (c.enrolled || c.price === 0)
  );

  // ── Coming soon ──
  const comingSoonCourses = courses.filter((c) => c.status === "coming_soon");

  // ── Published courses (not coming_soon) grouped by category ──
  const publishedCourses = courses.filter((c) => c.status !== "coming_soon");

  // ── Courses without a category (show separately if any) ──
  const uncategorized = publishedCourses.filter((c) => !c.category);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-10">
      {/* ── Khóa học của tôi ── */}
      {myCourses.length > 0 && (
        <section>
          <SectionHeader
            icon={GraduationCap}
            title="Khoá học của tôi"
            subtitle={`Bạn có quyền truy cập ${myCourses.length} khoá học`}
            iconColor="#22c55e"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
            {myCourses.map((course, idx) => (
              <CourseCard key={course.id} course={course} idx={idx} onBuy={handleBuy} />
            ))}
          </div>
        </section>
      )}

      {/* ── Category sections ── */}
      {CATEGORIES.map((cat) => {
        const catCourses = publishedCourses.filter((c) => c.category === cat.key);
        if (catCourses.length === 0) return null;

        return (
          <section key={cat.key} id={`cat-${cat.key}`}>
            <SectionHeader
              icon={cat.icon}
              title={cat.title}
              subtitle={cat.subtitle}
              iconColor={cat.color}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
              {catCourses.map((course, idx) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  idx={idx}
                  onBuy={handleBuy}
                  isComingSoon={course.status === "coming_soon"}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* ── Uncategorized courses (fallback) ── */}
      {uncategorized.length > 0 && !CATEGORIES.some((cat) => publishedCourses.some((c) => c.category === cat.key)) && (
        <section>
          <SectionHeader
            icon={BookOpen}
            title="Tất cả khoá học"
            subtitle="Khám phá các khoá học chất lượng"
            iconColor="#D4A843"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
            {uncategorized.map((course, idx) => (
              <CourseCard key={course.id} course={course} idx={idx} onBuy={handleBuy} />
            ))}
          </div>
        </section>
      )}

      {/* ── Coming soon ── */}
      {comingSoonCourses.length > 0 && (
        <section>
          <SectionHeader
            icon={Clock}
            title="Khoá học sắp ra mắt"
            subtitle="Những khoá học đang được chuẩn bị, hãy chờ đón!"
            iconColor="#a855f7"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
            {comingSoonCourses.map((course, idx) => (
              <CourseCard key={course.id} course={course} idx={idx} onBuy={handleBuy} isComingSoon />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {courses.length === 0 && (
        <div className="card-dark p-10 text-center">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="font-bold text-white mb-1">Chưa có khoá học nào</h3>
          <p className="text-sm text-gray-400">Các khoá học sẽ sớm được cập nhật.</p>
        </div>
      )}

      {checkoutProduct && (
        <CheckoutModal
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          onSuccess={() => {
            setCheckoutProduct(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
