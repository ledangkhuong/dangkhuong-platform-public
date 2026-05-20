import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/courses/copy-content
 * Body: { source_course_id, target_course_id, chapter_ids: string[] }
 * Copies selected chapters (+ their lessons) from source to target course.
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

  if (!profile || !["admin", "manager", "editor"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { source_course_id, target_course_id, chapter_ids } = body;

  if (!source_course_id || !target_course_id || !Array.isArray(chapter_ids)) {
    return NextResponse.json(
      { error: "source_course_id, target_course_id, chapter_ids[] required" },
      { status: 400 }
    );
  }

  const admin = await createAdminClient();

  // Verify target course exists
  const { data: target } = await admin
    .from("products")
    .select("id")
    .eq("id", target_course_id)
    .single();

  if (!target)
    return NextResponse.json(
      { error: "Target course not found" },
      { status: 404 }
    );

  // Get current max sort_order in target
  const { data: existingChapters } = await admin
    .from("chapters")
    .select("sort_order")
    .eq("product_id", target_course_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  let nextSort = (existingChapters?.[0]?.sort_order ?? -1) + 1;

  // Fetch selected chapters with lessons
  const { data: chapters } = await admin
    .from("chapters")
    .select("*, lessons(*)")
    .in("id", chapter_ids)
    .eq("product_id", source_course_id)
    .order("sort_order", { ascending: true });

  let copiedChapters = 0;
  let copiedLessons = 0;

  for (const chapter of chapters ?? []) {
    const { data: newChapter } = await admin
      .from("chapters")
      .insert({
        product_id: target_course_id,
        title: chapter.title,
        sort_order: nextSort++,
      })
      .select("id")
      .single();

    if (!newChapter) continue;
    copiedChapters++;

    const lessons = (chapter.lessons || []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );

    for (const lesson of lessons) {
      const { error } = await admin.from("lessons").insert({
        chapter_id: newChapter.id,
        product_id: target_course_id,
        title: lesson.title,
        description: lesson.description,
        youtube_id: lesson.youtube_id,
        duration_sec: lesson.duration_sec,
        content: lesson.content,
        sort_order: lesson.sort_order,
        is_free: lesson.is_free,
      });
      if (!error) copiedLessons++;
    }
  }

  return NextResponse.json({
    success: true,
    copiedChapters,
    copiedLessons,
  });
}
