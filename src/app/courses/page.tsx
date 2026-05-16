import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import CoursesClient from "@/components/courses/CoursesClient";
import CoursesPublicGrid from "@/components/courses/CoursesPublicGrid";

export const metadata = {
  title: "Khoá học — Lê Đăng Khương Academy",
  description:
    "Khoá học Video AI, Xây kênh triệu view, Sản phẩm số & AI Agent từ Lê Đăng Khương.",
};

export default async function CoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch published products with chapter + lesson counts
  const { data: products } = await supabase
    .from("products")
    .select(
      `
      id, slug, title, description, price, sale_price, type, tier_required, thumbnail,
      chapters(id, lessons(id))
    `
    )
    .eq("status", "published")
    .order("sort_order");

  const allProducts = (products ?? []).map((p) => {
    const chapters =
      (p.chapters as { id: string; lessons: { id: string }[] }[]) ?? [];
    const chapterCount = chapters.length;
    const lessonCount = chapters.reduce(
      (sum, ch) => sum + (ch.lessons?.length ?? 0),
      0
    );
    return { ...p, chapterCount, lessonCount };
  });

  /* ── Authenticated: full dashboard experience ── */
  if (user) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("product_id")
      .eq("user_id", user.id);

    const { data: progressRows } = await supabase
      .from("lesson_progress")
      .select("product_id, completed")
      .eq("user_id", user.id)
      .eq("completed", true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";
    const enrolledIds = new Set(
      (enrollments ?? []).map((e) => e.product_id)
    );

    const completedByProduct: Record<string, number> = {};
    for (const row of progressRows ?? []) {
      completedByProduct[row.product_id] =
        (completedByProduct[row.product_id] ?? 0) + 1;
    }

    const courses = allProducts.map((p) => {
      const completedLessons = completedByProduct[p.id] ?? 0;
      const progress =
        p.lessonCount > 0
          ? Math.round((completedLessons / p.lessonCount) * 100)
          : 0;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        price: p.price,
        sale_price: p.sale_price,
        type: p.type,
        tier_required: p.tier_required,
        thumbnail: p.thumbnail,
        enrolled: isAdmin || enrolledIds.has(p.id),
        progress,
        lesson_count: p.lessonCount,
        chapter_count: p.chapterCount,
      };
    });

    return (
      <div>
        <TopBar title="Khoá học" subtitle="Học từ những người đã làm được" />
        <CoursesClient courses={courses} />
      </div>
    );
  }

  /* ── Public: clean course grid for visitors ── */
  const publicCourses = allProducts.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    price: p.price,
    sale_price: p.sale_price,
    thumbnail: p.thumbnail,
    type: p.type,
    lessonCount: p.lessonCount,
    chapterCount: p.chapterCount,
  }));

  return <CoursesPublicGrid courses={publicCourses} />;
}
