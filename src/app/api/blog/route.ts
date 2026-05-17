import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/blog?id=xxx — fetch single blog post for editing
export async function GET(req: NextRequest) {
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

  if (!["admin", "manager", "marketing"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data: post, error } = await admin
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ post });
}

// POST /api/blog — create or update blog post
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

  if (!["admin", "manager", "marketing"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    id,
    title,
    slug,
    excerpt,
    content,
    body,
    category,
    tags,
    status,
    thumbnail,
    sendEmail,
    focus_keyword,
  } = await req.json();

  if (!title?.trim())
    return NextResponse.json({ error: "Title required" }, { status: 400 });

  const admin = await createAdminClient();

  // Generate slug if not provided
  const finalSlug =
    slug?.trim() ||
    title
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);

  const postData: Record<string, unknown> = {
    title: title.trim(),
    slug: finalSlug,
    excerpt: excerpt?.trim() || null,
    content: content?.trim() || body?.trim() || null,
    body: body?.trim() || content?.trim() || null,
    category: category?.trim() || null,
    tags: tags || null,
    status: status || "draft",
    thumbnail: thumbnail || null,
    focus_keyword: focus_keyword?.trim() || null,
  };

  // Only set published_at when first publishing
  if (status === "published") {
    if (id) {
      // Check if already published — don't overwrite published_at
      const { data: existing } = await admin
        .from("blog_posts")
        .select("published_at")
        .eq("id", id)
        .single();
      if (!existing?.published_at) {
        postData.published_at = new Date().toISOString();
      }
    } else {
      postData.published_at = new Date().toISOString();
    }
  }

  let result;

  if (id) {
    // Update existing
    const { data, error } = await admin
      .from("blog_posts")
      .update(postData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[Blog Update] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi cập nhật bài viết. Vui lòng thử lại." }, { status: 500 });
    }
    result = data;
  } else {
    // Create new
    const { data, error } = await admin
      .from("blog_posts")
      .insert(postData)
      .select()
      .single();
    if (error) {
      console.error("[Blog Create] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi tạo bài viết. Vui lòng thử lại." }, { status: 500 });
    }
    result = data;
  }

  // Only send email if explicitly requested
  if (status === "published" && sendEmail === true) {
    try {
      await sendBlogNotificationEmail(admin, result);
    } catch {
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json({ post: result });
}

// DELETE /api/blog?id=xxx — delete blog post
export async function DELETE(req: NextRequest) {
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

  if (!["admin", "manager"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin.from("blog_posts").delete().eq("id", id);

  if (error) {
    console.error("[Blog Delete] Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi xóa bài viết. Vui lòng thử lại." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendBlogNotificationEmail(admin: any, post: any) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "no-reply@dangkhuong.com";

  if (!apiKey || apiKey.startsWith("re_your")) return;

  // Get all user emails
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 500 });
  if (!authUsers?.users) return;

  const emails = authUsers.users
    .map((u: { email?: string }) => u.email)
    .filter((e: string | undefined): e is string => !!e);

  if (emails.length === 0) return;

  // Send via Resend batch (max 50 per batch)
  const batches = [];
  for (let i = 0; i < emails.length; i += 50) {
    batches.push(emails.slice(i, i + 50));
  }

  for (const batch of batches) {
    await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        batch.map((email: string) => ({
          from: fromEmail,
          to: email,
          subject: `Bài viết mới: ${post.title}`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #D4A843;">${post.title}</h2>
              ${post.excerpt ? `<p style="color: #666;">${post.excerpt}</p>` : ""}
              <a href="https://dangkhuong.com/blog/${post.slug}"
                 style="display: inline-block; padding: 12px 24px; background: #D4A843; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Đọc bài viết
              </a>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #999;">
                Bạn nhận email này vì đã đăng ký tài khoản tại dangkhuong.com
              </p>
            </div>
          `,
        }))
      ),
    });
  }
}
