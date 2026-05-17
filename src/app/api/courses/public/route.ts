import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: products, error } = await supabase
      .from("products")
      .select(
        `
        id, slug, title, description, price, sale_price, thumbnail, type,
        chapters(id, lessons(id))
      `
      )
      .eq("status", "published")
      .order("sort_order");

    if (error) {
      console.error("[CoursesPublic] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi tải danh sách khóa học. Vui lòng thử lại." }, { status: 500 });
    }

    const courses = (products ?? []).map((p) => {
      const chapters =
        (p.chapters as { id: string; lessons: { id: string }[] }[]) ?? [];
      const chapterCount = chapters.length;
      const lessonCount = chapters.reduce(
        (sum, ch) => sum + (ch.lessons?.length ?? 0),
        0
      );

      return {
        slug: p.slug,
        title: p.title,
        description: p.description,
        price: p.price,
        sale_price: p.sale_price,
        thumbnail: p.thumbnail,
        type: p.type,
        lessonCount,
        chapterCount,
      };
    });

    return NextResponse.json(courses, {
      headers: {
        "Cache-Control": "public, s-maxage=300",
      },
    });
  } catch (err) {
    console.error("[CoursesPublic] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
