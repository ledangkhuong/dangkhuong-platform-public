import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { BookOpen, Users, Layers, Plus } from "lucide-react";
import AdminCoursesList, {
  type AdminCourseItem,
} from "@/components/admin/AdminCoursesList";

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

  const allowedRoles = ["admin", "manager", "editor", "instructor"];
  if (!profile || !allowedRoles.includes(profile.role)) redirect("/dashboard");

  const isInstructor = profile.role === "instructor";

  // Use admin client to bypass RLS for admin pages
  const adminClient = await createAdminClient();

  // Fetch products with nested chapters → lessons
  let query = adminClient
    .from("products")
    .select("*, chapters(id, lessons(id))")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  // Instructors only see their own courses
  if (isInstructor) {
    query = query.eq("instructor_id", user.id);
  }

  const { data: products } = await query;

  const rawCourses = products ?? [];

  // Fetch enrollment counts per product
  const productIds = rawCourses.map((c) => c.id);
  const enrollmentMap: Record<string, number> = {};

  if (productIds.length > 0) {
    const { data: enrollments } = await adminClient
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

  const totalCourses = rawCourses.length;
  const totalLessons = rawCourses.reduce((sum, c) => {
    const chapters = (c.chapters ?? []) as ChapterWithLessons[];
    return sum + chapters.reduce((s, ch) => s + (ch.lessons?.length ?? 0), 0);
  }, 0);
  const totalEnrolled = Object.values(enrollmentMap).reduce((s, n) => s + n, 0);

  // Map to client-friendly shape
  const courses: AdminCourseItem[] = rawCourses.map((c) => {
    const chapters = (c.chapters ?? []) as ChapterWithLessons[];
    const chapterCount = chapters.length;
    const lessonCount = chapters.reduce(
      (s, ch) => s + (ch.lessons?.length ?? 0),
      0
    );
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description ?? null,
      thumbnail: c.thumbnail ?? null,
      status: (c.status ?? "draft") as AdminCourseItem["status"],
      price: c.price ?? 0,
      sale_price: c.sale_price ?? null,
      created_at: c.created_at,
      sort_order: c.sort_order ?? 0,
      category: c.category ?? null,
      chapterCount,
      lessonCount,
      enrolled: enrollmentMap[c.id] ?? 0,
    };
  });

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

        {/* Course list (drag-and-drop) */}
        {courses.length === 0 ? (
          <div className="card-dark flex flex-col items-center justify-center py-16 text-center">
            <BookOpen size={40} className="text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">Chưa có khoá học nào.</p>
            <Link href="/admin/courses/new" className="btn-green mt-4">
              <Plus size={14} />
              Tạo khoá học đầu tiên
            </Link>
          </div>
        ) : (
          <AdminCoursesList initialCourses={courses} />
        )}
      </div>
    </div>
  );
}
