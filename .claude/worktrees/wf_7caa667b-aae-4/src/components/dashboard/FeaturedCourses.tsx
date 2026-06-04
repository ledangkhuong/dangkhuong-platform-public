import Link from "next/link";
import Image from "next/image";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";

interface FeaturedCourseData {
  id: string;
  badge_text: string;
  highlight_text: string | null;
  sort_order: number;
  products: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    price: number | null;
    sale_price: number | null;
  };
}

function formatPrice(price: number | null) {
  if (!price) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

export default async function FeaturedCourses() {
  const admin = await createAdminClient();

  const { data: featuredCourses } = await admin
    .from("featured_courses")
    .select("id, badge_text, highlight_text, sort_order, products(id, title, slug, thumbnail, price, sale_price)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(3);

  const courses = (featuredCourses ?? []) as unknown as FeaturedCourseData[];

  if (courses.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={14} className="text-[#D4A843]" />
          Khoá học mới nhất
        </h3>
      </div>

      <div className={`grid gap-3 ${courses.length === 1 ? "grid-cols-1" : courses.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
        {courses.map((course) => {
          const product = course.products;
          const price = product.sale_price || product.price;
          const originalPrice = product.sale_price ? product.price : null;

          return (
            <Link
              key={course.id}
              href={`/courses/${product.slug}`}
              className="card-dark group hover:bg-[#1a1a1a] transition-all duration-200 overflow-hidden border border-transparent hover:border-[#D4A843]/20"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-[#222] overflow-hidden">
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={32} className="text-gray-600" />
                  </div>
                )}

                {/* Badge */}
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-[#D4A843] text-black">
                    {course.badge_text}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-3.5">
                <h4 className="text-sm font-semibold text-white group-hover:text-[#D4A843] transition-colors line-clamp-2 leading-snug">
                  {product.title}
                </h4>

                {course.highlight_text && (
                  <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-2">
                    {course.highlight_text}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#D4A843]">
                      {formatPrice(price)}
                    </span>
                    {originalPrice && (
                      <span className="text-[11px] text-gray-500 line-through">
                        {formatPrice(originalPrice)}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#D4A843] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Xem chi tiết <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
