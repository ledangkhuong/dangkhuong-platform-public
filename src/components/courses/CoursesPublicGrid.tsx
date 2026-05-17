"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, PlayCircle, ArrowRight } from "lucide-react";

type PublicCourse = {
  slug: string;
  title: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  thumbnail: string | null;
  type: string;
  lessonCount: number;
  chapterCount: number;
};

const PLACEHOLDER_COLORS = [
  "#D4A843",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
];

function formatPrice(p: number) {
  return p.toLocaleString("vi-VN") + "đ";
}

export default function CoursesPublicGrid({
  courses,
}: {
  courses: PublicCourse[];
}) {
  return (
    <div className="pt-20 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
            Khoá Học Của{" "}
            <span className="text-[#D4A843]">Lê Đăng Khương</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl">
            Được thiết kế để bạn áp dụng ngay — không lý thuyết suông. Học từ
            người đã làm được.
          </p>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course, idx) => {
            const isFree = course.price === 0;
            const hasSale =
              course.sale_price !== null && course.sale_price < course.price;
            const displayPrice = hasSale ? course.sale_price! : course.price;
            const color = PLACEHOLDER_COLORS[idx % PLACEHOLDER_COLORS.length];

            return (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="card-dark overflow-hidden flex flex-col hover:ring-1 hover:ring-white/10 transition-all group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-[#1a1a1a] overflow-hidden">
                  {course.thumbnail ? (
                    <Image
                      src={course.thumbnail}
                      alt={course.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                      }}
                    >
                      <BookOpen size={48} style={{ color: color + "60" }} />
                    </div>
                  )}

                  {/* Price badge */}
                  <div className="absolute top-3 left-3">
                    {isFree ? (
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

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-white text-sm leading-snug mb-1.5 line-clamp-2">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
                      {course.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
                    {course.chapterCount > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen size={11} /> {course.chapterCount} chương
                      </span>
                    )}
                    {course.lessonCount > 0 && (
                      <span className="flex items-center gap-1">
                        <PlayCircle size={11} /> {course.lessonCount} bài học
                      </span>
                    )}
                  </div>

                  <div className="flex-1" />

                  {/* CTA */}
                  <div
                    className="flex items-center justify-between mt-auto pt-3"
                    style={{ borderTop: "1px solid #222" }}
                  >
                    <div>
                      {isFree ? (
                        <span className="text-sm font-bold text-[#22c55e]">
                          Miễn phí
                        </span>
                      ) : hasSale ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#D4A843]">
                            {formatPrice(course.sale_price!)}
                          </span>
                          <span className="text-xs text-gray-600 line-through">
                            {formatPrice(course.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-[#D4A843]">
                          {formatPrice(course.price)}
                        </span>
                      )}
                    </div>

                    <span className="flex items-center gap-1 text-xs font-medium text-[#D4A843] group-hover:gap-2 transition-all">
                      Xem chi tiết <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {courses.length === 0 && (
          <div className="card-dark p-10 text-center">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-bold text-white mb-1">Chưa có khoá học nào</h3>
            <p className="text-sm text-gray-400">
              Các khoá học sẽ sớm được cập nhật.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm mb-4">
            Đăng ký tài khoản để truy cập nội dung miễn phí và theo dõi tiến độ
            học
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold py-2.5 px-6 rounded-lg transition-all"
              style={{
                background: "linear-gradient(135deg, #FFD814, #FFA41C)",
                color: "#131921",
              }}
            >
              Đăng ký miễn phí
            </Link>
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors py-2.5 px-4"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
