"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BookOpen, PlayCircle, ArrowRight, Clock,
  Video, Globe, TrendingUp, Sparkles,
} from "lucide-react";

type PublicCourse = {
  slug: string;
  title: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  thumbnail: string | null;
  type: string;
  status: string;
  category: string | null;
  lessonCount: number;
  chapterCount: number;
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

function PublicCourseCard({
  course,
  idx,
  isComingSoon,
}: {
  course: PublicCourse;
  idx: number;
  isComingSoon?: boolean;
}) {
  const isFree = course.price === 0;
  const hasSale = course.sale_price !== null && course.sale_price < course.price;
  const displayPrice = hasSale ? course.sale_price! : course.price;
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
    <Wrapper key={course.slug} {...wrapperProps}>
      <div className="relative aspect-video bg-[#1a1a1a] overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={`object-cover ${isComingSoon ? "grayscale-[30%]" : "group-hover:scale-105"} transition-transform duration-300`}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)` }}
          >
            <BookOpen size={48} style={{ color: color + "60" }} />
          </div>
        )}
        <div className="absolute top-3 left-3">
          {isComingSoon ? (
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-purple-600 text-white flex items-center gap-1">
              <Clock size={11} /> Sắp ra mắt
            </span>
          ) : isFree ? (
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#22c55e] text-white">
              Miễn phí
            </span>
          ) : (
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#D4A843] text-black">
              {formatPrice(displayPrice)}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-white text-sm leading-snug mb-1.5 line-clamp-2">{course.title}</h3>
        {course.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{course.description}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
          {course.chapterCount > 0 && (
            <span className="flex items-center gap-1"><BookOpen size={11} /> {course.chapterCount} chương</span>
          )}
          {course.lessonCount > 0 && (
            <span className="flex items-center gap-1"><PlayCircle size={11} /> {course.lessonCount} bài học</span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: "1px solid #222" }}>
          <div>
            {isComingSoon ? (
              <span className="text-xs text-gray-500 italic">Đang chuẩn bị</span>
            ) : isFree ? (
              <span className="text-sm font-bold text-[#22c55e]">Miễn phí</span>
            ) : hasSale ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#D4A843]">{formatPrice(course.sale_price!)}</span>
                <span className="text-xs text-gray-500 line-through">{formatPrice(course.price)}</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-[#D4A843]">{formatPrice(course.price)}</span>
            )}
          </div>
          {isComingSoon ? (
            <span className="text-xs py-1.5 px-3 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-600/30 font-medium flex items-center gap-1">
              <Clock size={11} /> Chờ đón
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-[#D4A843] group-hover:gap-2 transition-all">
              Xem chi tiết <ArrowRight size={13} />
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
    <div className="flex items-start gap-3 mb-5">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${iconColor}15` }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────────── */

export default function CoursesPublicGrid({ courses }: { courses: PublicCourse[] }) {
  const publishedCourses = courses.filter((c) => c.status !== "coming_soon");
  const comingSoonCourses = courses.filter((c) => c.status === "coming_soon");
  const uncategorized = publishedCourses.filter((c) => !c.category);

  return (
    <div className="pt-20 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
            Khoá Học Của <span className="text-[#D4A843]">Lê Đăng Khương</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl">
            Được thiết kế để bạn áp dụng ngay — không lý thuyết suông. Học từ người đã làm được.
          </p>
        </div>

        {/* ── Category sections ── */}
        {CATEGORIES.map((cat) => {
          const catCourses = publishedCourses.filter((c) => c.category === cat.key);
          if (catCourses.length === 0) return null;

          return (
            <section key={cat.key} className="mb-12">
              <SectionHeader icon={cat.icon} title={cat.title} subtitle={cat.subtitle} iconColor={cat.color} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {catCourses.map((course, idx) => (
                  <PublicCourseCard key={course.slug} course={course} idx={idx} />
                ))}
              </div>
            </section>
          );
        })}

        {/* ── Uncategorized fallback ── */}
        {uncategorized.length > 0 && !CATEGORIES.some((cat) => publishedCourses.some((c) => c.category === cat.key)) && (
          <section className="mb-12">
            <SectionHeader icon={Sparkles} title="Khoá học hiện có" subtitle="Bắt đầu học ngay với những khoá học chất lượng" iconColor="#D4A843" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {uncategorized.map((course, idx) => (
                <PublicCourseCard key={course.slug} course={course} idx={idx} />
              ))}
            </div>
          </section>
        )}

        {/* ── Coming soon ── */}
        {comingSoonCourses.length > 0 && (
          <section className="mb-12">
            <SectionHeader icon={Clock} title="Khoá học sắp ra mắt" subtitle="Những khoá học đang được chuẩn bị, hãy chờ đón!" iconColor="#a855f7" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {comingSoonCourses.map((course, idx) => (
                <PublicCourseCard key={course.slug} course={course} idx={idx} isComingSoon />
              ))}
            </div>
          </section>
        )}

        {courses.length === 0 && (
          <div className="card-dark p-10 text-center">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-bold text-white mb-1">Chưa có khoá học nào</h3>
            <p className="text-sm text-gray-400">Các khoá học sẽ sớm được cập nhật.</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm mb-4">
            Đăng ký tài khoản để truy cập nội dung miễn phí và theo dõi tiến độ học
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold py-2.5 px-6 rounded-lg transition-all"
              style={{ background: "linear-gradient(135deg, #FFD814, #FFA41C)", color: "#131921" }}
            >
              Đăng ký miễn phí
            </Link>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors py-2.5 px-4">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
