"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PlayCircle, Lock, CheckCircle, ChevronDown, BookOpen } from "lucide-react";
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
  enrolled: boolean;
  progress: number;
  lesson_count: number;
  chapter_count: number;
};

const PLACEHOLDER_COLORS = ["#D4A843", "#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#06b6d4"];

function formatPrice(p: number) {
  return p.toLocaleString("vi-VN") + "đ";
}

export default function CoursesClient({ courses }: { courses: CourseItem[] }) {
  const [checkoutProduct, setCheckoutProduct] = useState<{
    id: string; name: string; price: number; description?: string;
  } | null>(null);

  const searchParams = useSearchParams();

  // Auto-open checkout modal when ?checkout=<productId> is in the URL
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

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Khoá học của tôi</h2>
        <p className="text-gray-400 text-sm mt-1">
          Bạn có quyền truy cập {courses.filter((c) => c.enrolled || c.price === 0).length} khoá học
        </p>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course, idx) => {
          const isFree = course.price === 0;
          const isEnrolled = course.enrolled;
          const locked = !isEnrolled && !isFree;
          const hasSale = course.sale_price !== null && course.sale_price < course.price;
          const color = PLACEHOLDER_COLORS[idx % PLACEHOLDER_COLORS.length];

          return (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="card-dark overflow-hidden flex flex-col hover:ring-1 hover:ring-white/10 transition-all group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-[#1a1a1a] overflow-hidden">
                {course.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                  {isFree ? (
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
                {course.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                    <div
                      className="h-full bg-[#22c55e]"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                )}
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
                  {course.progress > 0 && (
                    <span className="flex items-center gap-1 text-[#22c55e]">
                      <CheckCircle size={11} /> {course.progress}%
                    </span>
                  )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Price + CTA */}
                <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: "1px solid #222" }}>
                  {/* Price */}
                  <div>
                    {isFree ? (
                      <span className="text-sm font-bold text-[#22c55e]">Miễn phí</span>
                    ) : isEnrolled ? (
                      <span className="text-xs text-gray-500">Đã sở hữu</span>
                    ) : hasSale ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#f59e0b]">
                          {formatPrice(course.sale_price!)}
                        </span>
                        <span className="text-xs text-gray-600 line-through">
                          {formatPrice(course.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-[#f59e0b]">
                        {formatPrice(course.price)}
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  {locked ? (
                    <span
                      className="btn-gold text-xs py-1.5 px-3"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCheckoutProduct({
                          id: course.id,
                          name: course.title,
                          price: course.sale_price ?? course.price,
                          description: course.description ?? undefined,
                        });
                      }}
                    >
                      <Lock size={11} />
                      Mua ngay
                    </span>
                  ) : (
                    <span className="btn-success text-xs py-1.5 px-3">
                      <PlayCircle size={12} />
                      {course.progress > 0 ? "Tiếp tục" : "Vào học"}
                    </span>
                  )}
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
          <p className="text-sm text-gray-400">Các khoá học sẽ sớm được cập nhật.</p>
        </div>
      )}

      {/* Checkout modal */}
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
