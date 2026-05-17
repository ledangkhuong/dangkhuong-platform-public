import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/courses/duplicate
 * Body: { course_id: string }
 * Duplicates a course with all chapters and lessons (no enrollments/progress).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { course_id } = await req.json();
  if (!course_id)
    return NextResponse.json(
      { error: "course_id is required" },
      { status: 400 }
    );

  const admin = await createAdminClient();

  // 1. Fetch the original course
  const { data: original } = await admin
    .from("products")
    .select("*")
    .eq("id", course_id)
    .single();

  if (!original)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // 2. Create the duplicate course
  const { id: _origId, created_at: _ca, ...courseFields } = original;
  const newSlug = `${original.slug}-copy-${Date.now()}`;

  // Get max sort_order
  const { data: allProducts } = await admin
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const maxSort = allProducts?.[0]?.sort_order ?? 0;

  const { data: newCourse, error: courseErr } = await admin
    .from("products")
    .insert({
      ...courseFields,
      title: `${original.title} (Bản sao)`,
      slug: newSlug,
      status: "draft",
      sort_order: maxSort + 1,
    })
    .select("id")
    .single();

  if (courseErr || !newCourse) {
    return NextResponse.json(
      { error: courseErr?.message || "Failed to create duplicate" },
      { status: 500 }
    );
  }

  // 3. Fetch chapters + lessons from original
  const { data: chapters } = await admin
    .from("chapters")
    .select("*, lessons(*)")
    .eq("product_id", course_id)
    .order("sort_order", { ascending: true });

  // 4. Copy chapters & lessons
  for (const chapter of chapters ?? []) {
    const { data: newChapter } = await admin
      .from("chapters")
      .insert({
        product_id: newCourse.id,
        title: chapter.title,
        sort_order: chapter.sort_order,
      })
      .select("id")
      .single();

    if (!newChapter) continue;

    const lessons = (chapter.lessons || []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );

    for (const lesson of lessons) {
      await admin.from("lessons").insert({
        chapter_id: newChapter.id,
        product_id: newCourse.id,
        title: lesson.title,
        description: lesson.description,
        youtube_id: lesson.youtube_id,
        duration_sec: lesson.duration_sec,
        content: lesson.content,
        sort_order: lesson.sort_order,
        is_free: lesson.is_free,
      });
    }
  }

  return NextResponse.json({ success: true, newCourseId: newCourse.id });
}
