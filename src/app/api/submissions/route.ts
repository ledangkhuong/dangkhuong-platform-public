import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET — fetch submissions for current user + lesson
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lesson_id = searchParams.get("lesson_id");
  const product_id = searchParams.get("product_id");

  if (!lesson_id || !product_id) {
    return NextResponse.json(
      { error: "lesson_id and product_id are required" },
      { status: 400 }
    );
  }

  const adminClient = await createAdminClient();

  const { data, error } = await adminClient
    .from("lesson_submissions")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson_id)
    .eq("product_id", product_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Submissions GET] Error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải bài nộp." },
      { status: 500 }
    );
  }

  return NextResponse.json({ submissions: data });
}

// POST — create a new submission
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lesson_id, product_id, content, links } = await req.json();

  if (!lesson_id || !product_id) {
    return NextResponse.json(
      { error: "lesson_id and product_id are required" },
      { status: 400 }
    );
  }

  if (!content?.trim() && (!links || links.length === 0)) {
    return NextResponse.json(
      { error: "Vui lòng nhập nội dung hoặc thêm liên kết." },
      { status: 400 }
    );
  }

  // Validate links
  if (links && Array.isArray(links)) {
    if (links.length > 10) {
      return NextResponse.json(
        { error: "Tối đa 10 liên kết." },
        { status: 400 }
      );
    }
    for (const link of links) {
      if (
        !link.url ||
        (!link.url.startsWith("http://") && !link.url.startsWith("https://"))
      ) {
        return NextResponse.json(
          { error: "Liên kết không hợp lệ." },
          { status: 400 }
        );
      }
    }
  }

  const adminClient = await createAdminClient();

  // Verify enrollment or staff role (matching progress API pattern)
  const { data: enrollment } = await adminClient
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", product_id)
    .maybeSingle();

  let isStaff = false;
  if (!enrollment) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isStaff = ["admin", "manager", "marketing", "sale", "support", "instructor"].includes(
      profile?.role ?? ""
    );
  }

  if (!enrollment && !isStaff) {
    return NextResponse.json(
      { error: "Bạn chưa đăng ký khoá học này" },
      { status: 403 }
    );
  }

  const { data, error } = await adminClient
    .from("lesson_submissions")
    .insert({
      user_id: user.id,
      lesson_id,
      product_id,
      content: content?.trim() || "",
      links: links || [],
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[Submissions POST] Error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi nộp bài." },
      { status: 500 }
    );
  }

  return NextResponse.json({ submission: data });
}

// PATCH — update submission (student edit or admin review)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, content, links, status, feedback } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  // Check user role
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = ["admin", "manager"].includes(profile?.role ?? "");
  const isInstructor = profile?.role === "instructor";

  // Fetch existing submission
  const { data: existing } = await adminClient
    .from("lesson_submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Bài nộp không tồn tại." },
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (isAdmin) {
    // Admin can update status and feedback
    if (status) updateData.status = status;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (body.score !== undefined) updateData.score = body.score;
    if (status === "reviewed" || status === "approved") {
      updateData.reviewed_by = user.id;
      updateData.reviewed_at = new Date().toISOString();
    }
  } else if (isInstructor) {
    // Instructor can review submissions for their assigned courses
    const { data: product } = await adminClient
      .from("products")
      .select("instructor_id")
      .eq("id", existing.product_id)
      .single();

    if (product?.instructor_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn không phải giảng viên của khóa học này." },
        { status: 403 }
      );
    }

    if (status) updateData.status = status;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (body.score !== undefined) updateData.score = body.score;
    if (status === "reviewed" || status === "approved") {
      updateData.reviewed_by = user.id;
      updateData.reviewed_at = new Date().toISOString();
    }
  } else if (existing.user_id === user.id && existing.status === "pending") {
    // Student can only edit their own pending submissions
    if (content !== undefined) updateData.content = content.trim();
    if (links !== undefined) updateData.links = links;
  } else {
    return NextResponse.json(
      { error: "Không có quyền chỉnh sửa bài nộp này." },
      { status: 403 }
    );
  }

  const { data, error } = await adminClient
    .from("lesson_submissions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Submissions PATCH] Error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi cập nhật bài nộp." },
      { status: 500 }
    );
  }

  return NextResponse.json({ submission: data });
}
