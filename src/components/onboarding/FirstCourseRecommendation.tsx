"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  thumbnail: string | null;
}

function formatPrice(p: number) {
  return p.toLocaleString("vi-VN") + "đ";
}

const PLACEHOLDER_COLORS = ["#D4A843", "#3b82f6", "#a855f7"];

export default function FirstCourseRecommendation() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasEnrollments, setHasEnrollments] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Check enrollment count
      const { count } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((count ?? 0) > 0) {
        setHasEnrollments(true);
        setLoading(false);
        return;
      }

      setHasEnrollments(false);

      // Fetch 3 published courses, ordered by sort_order (featured/popular first)
      const { data: products } = await supabase
        .from("products")
        .select("id, slug, title, description, price, sale_price, thumbnail")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .limit(3);

      setCourses(products ?? []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  // Don't show if loading, has enrollments, or no courses found
  if (loading || hasEnrollments !== false || courses.length === 0) return null;

  return (
    <div className="card-dark p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} className="text-[#D4A843]" />
        <h3 className="text-base font-bold text-white">
          Chưa biết bắt đầu từ đâu?
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        Dưới đây là các khoá học phổ biến nhất để bạn bắt đầu hành trình.
      </p>

      {/* Course cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {courses.map((course, idx) => {
          const isFree = course.price === 0;
          const hasSale =
            course.sale_price !== null && course.sale_price < course.price;
          const displayPrice = hasSale ? course.sale_price! : course.price;
          const color = PLACEHOLDER_COLORS[idx % PLACEHOLDER_COLORS.length];

          return (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group rounded-xl bg-[#111] border border-[#2a2a2a] overflow-hidden hover:ring-1 hover:ring-[#D4A843]/30 transition-all flex flex-col"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-[#1a1a1a] overflow-hidden">
                {course.thumbnail ? (
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                    }}
                  >
                    <BookOpen size={36} style={{ color: color + "60" }} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3.5 flex flex-col flex-1">
                <h4 className="text-sm font-semibold text-white leading-snug mb-1.5 line-clamp-2">
                  {course.title}
                </h4>

                {course.description && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
                    {course.description}
                  </p>
                )}

                <div className="flex-1" />

                {/* Price + CTA */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[#222]">
                  <div>
                    {isFree ? (
                      <span className="text-sm font-bold text-[#22c55e]">
                        Miễn phí
                      </span>
                    ) : hasSale ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#D4A843]">
                          {formatPrice(displayPrice)}
                        </span>
                        <span className="text-[10px] text-gray-600 line-through">
                          {formatPrice(course.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-[#D4A843]">
                        {formatPrice(course.price)}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-[#D4A843] group-hover:gap-1.5 transition-all">
                    Xem khoá học <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* View all link */}
      <div className="mt-4 text-center">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#D4A843] transition-colors"
        >
          Xem tất cả khoá học
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
