import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  BookOpen,
  Users,
  Layers,
  Plus,
  Edit2,
  ExternalLink,
  Calendar,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price === 0) return "Miễn phí";
  return price.toLocaleString("vi-VN") + "₫";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

type CourseStatus = "draft" | "published" | "archived";

const STATUS_CONFIG: Record<CourseStatus, { label: string; className: string }> = {
  published: { label: "Đã xuất bản", className: "badge-green" },
  draft: {
    label: "Bản nháp",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-400 border border-gray-700",
  },
  archived: {
    label: "Đã lưu trữ",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-900/30 text-red-400 border border-red-800/40",
  },
};

function StatusBadge({ status }: { status: CourseStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return <span className={cfg.className}>{cfg.label}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminCoursesPage() {
  const supabase = await createClient();

  // Auth + admin check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // Fetch products with nested chapters → lessons
  const { data: products } = await supabase
    .from("products")
    .select("*, chapters(id, lessons(id))")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const courses = products ?? [];

  // Fetch enrollment counts per product
  const productIds = courses.map((c) => c.id);
  let enrollmentMap: Record<string, number> = {};

  if (productIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("product_id");

    if (enrollments) {
      for (const e of enrollments) {
        enrollmentMap[e.product_id] = (enrollmentMap[e.product_id] || 0) + 1;
      }
    }
  }

  // Compute stats
  interface ChapterWithLessons {
    id: string;
    lessons: { id: string }[];
  }

  const totalCourses = courses.length;
  const totalLessons = courses.reduce((sum, c) => {
    const chapters = (c.chapters ?? []) as ChapterWithLessons[];
    return sum + chapters.reduce((s, ch) => s + (ch.lessons?.length ?? 0), 0);
  }, 0);
  const totalEnrolled = Object.values(enrollmentMap).reduce((s, n) => s + n, 0);

  return (
    <div>
      <TopBar
        title="Quản lý Khoá học"
        subtitle="Tạo và quản lý nội dung khoá học trên nền tảng"
      />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header action row */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-white text-base">
              Danh sách khoá học
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalCourses} khoá học đang quản lý
            </p>
          </div>
          <Link href="/admin/courses/new" className="btn-green">
            <Plus size={15} />
            Tạo khoá học mới
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(212,168,67,0.09)" }}
            >
              <BookOpen size={20} className="text-[#D4A843]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white leading-none mb-1">
                {totalCourses}
              </div>
              <div className="text-xs text-gray-500">Tổng khoá học</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(245,158,11,0.09)" }}
            >
              <Layers size={20} className="text-[#f59e0b]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white leading-none mb-1">
                {totalLessons}
              </div>
              <div className="text-xs text-gray-500">Tổng bài học</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(59,130,246,0.09)" }}
            >
              <Users size={20} className="text-[#3b82f6]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white leading-none mb-1">
                {totalEnrolled.toLocaleString("vi-VN")}
              </div>
              <div className="text-xs text-gray-500">Học viên đang học</div>
            </div>
          </div>
        </div>

        {/* Course list */}
        <div className="space-y-3">
          {courses.length === 0 && (
            <div className="card-dark flex flex-col items-center justify-center py-16 text-center">
              <BookOpen size={40} className="text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">Chưa có khoá học nào.</p>
              <Link href="/admin/courses/new" className="btn-green mt-4">
                <Plus size={14} />
                Tạo khoá học đầu tiên
              </Link>
            </div>
          )}

          {courses.map((course) => {
            const chapters = (course.chapters ?? []) as ChapterWithLessons[];
            const chapterCount = chapters.length;
            const lessonCount = chapters.reduce(
              (s, ch) => s + (ch.lessons?.length ?? 0),
              0
            );
            const enrolled = enrollmentMap[course.id] ?? 0;

            return (
              <div
                key={course.id}
                className="card-dark p-5 hover:bg-[#1f1f1f] transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Thumbnail + Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "#252525",
                          border: "1px solid #2a2a2a",
                        }}
                      >
                        <BookOpen size={22} className="text-gray-600" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-white text-sm leading-snug">
                          {course.title}
                        </h3>
                        <StatusBadge
                          status={
                            (course.status as CourseStatus) ?? "draft"
                          }
                        />
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-1 mb-1">
                        {course.description || "Chưa có mô tả"}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-600">
                        <span className="flex items-center gap-1">
                          <ExternalLink size={10} />
                          /{course.slug}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(course.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6 text-xs shrink-0">
                    <div className="text-center">
                      <div className="text-gray-400 mb-0.5">Chương</div>
                      <div className="font-semibold text-white">
                        {chapterCount}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 mb-0.5">Bài học</div>
                      <div className="font-semibold text-white">
                        {lessonCount}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 mb-0.5">Học viên</div>
                      <div className="font-semibold text-white">
                        {enrolled.toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <div className="text-center min-w-[80px]">
                      <div className="text-gray-400 mb-0.5">Giá</div>
                      <div className="font-semibold text-[#D4A843]">
                        {formatPrice(course.sale_price ?? course.price ?? 0)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-gray-300 hover:text-white hover:bg-white/5"
                      style={{ border: "1px solid #2a2a2a" }}
                    >
                      <Edit2 size={12} />
                      Sửa
                    </Link>
                    <Link
                      href={`/admin/courses/${course.id}/lessons`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: "rgba(212,168,67,0.1)",
                        color: "#D4A843",
                        border: "1px solid rgba(212,168,67,0.2)",
                      }}
                    >
                      <Layers size={12} />
                      Quản lý bài học
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
