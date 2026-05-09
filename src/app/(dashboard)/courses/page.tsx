import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import CoursesClient from "@/components/courses/CoursesClient";

export default async function CoursesPage() {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch published products with chapter + lesson counts
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, slug, title, description, price, sale_price, type, tier_required, thumbnail,
      chapters(id, lessons(id))
    `)
    .eq("status", "published")
    .order("sort_order");

  // Fetch user enrollments
  const { data: enrollments } = user
    ? await supabase
        .from("enrollments")
        .select("product_id")
        .eq("user_id", user.id)
    : { data: [] };

  // Fetch user lesson progress (to compute % per course)
  const { data: progressRows } = user
    ? await supabase
        .from("lesson_progress")
        .select("product_id, completed")
        .eq("user_id", user.id)
        .eq("completed", true)
    : { data: [] };

  // Fetch user profile role
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = profile?.role === "admin";

  // Build lookup sets
  const enrolledIds = new Set((enrollments ?? []).map((e) => e.product_id));

  // Count completed lessons per product
  const completedByProduct: Record<string, number> = {};
  for (const row of progressRows ?? []) {
    completedByProduct[row.product_id] = (completedByProduct[row.product_id] ?? 0) + 1;
  }

  // Map products to course items
  const courses = (products ?? []).map((p) => {
    const chapters = (p.chapters as { id: string; lessons: { id: string }[] }[]) ?? [];
    const chapterCount = chapters.length;
    const lessonCount = chapters.reduce((sum, ch) => sum + (ch.lessons?.length ?? 0), 0);
    const completedLessons = completedByProduct[p.id] ?? 0;
    const progress = lessonCount > 0 ? Math.round((completedLessons / lessonCount) * 100) : 0;

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
      lesson_count: lessonCount,
      chapter_count: chapterCount,
    };
  });

  return (
    <div>
      <TopBar title="Khoá học" subtitle="Học từ những người đã làm được" />
      <CoursesClient courses={courses} />
    </div>
  );
}
