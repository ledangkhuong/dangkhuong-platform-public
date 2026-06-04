import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sanitizeHtml } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";
import { sendBulkEmails, type BulkEmailEntry } from "@/lib/email/ses";

// GET /api/blog?id=xxx — fetch single blog post for editing
export async function GET(req: NextRequest) {
  try {
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
  } catch (err) {
    console.error("[GET /api/blog]", err);
    return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
  }
}

// POST /api/blog — create or update blog post
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rl = await rateLimit(`blog-post:${ip}`, 10, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

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
      author_name,
      author_avatar,
      author_bio,
      author_facebook,
    } = await req.json();

    if (!title?.trim())
      return NextResponse.json({ error: "Title required" }, { status: 400 });

    const admin = await createAdminClient();

    // Generate slug if not provided, sanitize in all cases
    const finalSlug = (slug?.trim() || title.trim())
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    // Sanitize HTML content at storage time (defense-in-depth)
    const sanitizedContent = content?.trim() ? sanitizeHtml(content.trim()) : null;
    const sanitizedBody = body?.trim() ? sanitizeHtml(body.trim()) : null;

    const postData: Record<string, unknown> = {
      title: title.trim(),
      slug: finalSlug,
      excerpt: excerpt?.trim() || null,
      content: sanitizedContent || sanitizedBody || null,
      body: sanitizedBody || sanitizedContent || null,
      category: category?.trim() || null,
      tags: tags || null,
      status: status || "draft",
      thumbnail: thumbnail || null,
      focus_keyword: focus_keyword?.trim() || null,
      author_name: author_name?.trim() || null,
      author_avatar: author_avatar?.trim() || null,
      author_bio: author_bio?.trim() || null,
      author_facebook: author_facebook?.trim() || null,
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
  } catch (err) {
    console.error("[POST /api/blog]", err);
    return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
  }
}

// DELETE /api/blog?id=xxx — delete blog post
export async function DELETE(req: NextRequest) {
  try {
    // Rate limit: 5 requests per minute per IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rl = await rateLimit(`blog-delete:${ip}`, 5, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

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
  } catch (err) {
    console.error("[DELETE /api/blog]", err);
    return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendBlogNotificationEmail(admin: any, post: any) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
  const siteDomain = (() => { try { return new URL(baseUrl).hostname; } catch { return "dangkhuong.com"; } })();

  if (!process.env.AWS_SES_ACCESS_KEY) return;

  // Get all user emails
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 500 });
  if (!authUsers?.users) return;

  const emails = authUsers.users
    .map((u: { email?: string }) => u.email)
    .filter((e: string | undefined): e is string => !!e);

  if (emails.length === 0) return;

  const safeTitle = escapeHtml(post.title);
  const safeExcerpt = post.excerpt ? escapeHtml(post.excerpt) : "";
  const subject = `Bài viết mới: ${post.title}`;
  const html = `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #D4A843;">${safeTitle}</h2>
              ${safeExcerpt ? `<p style="color: #666;">${safeExcerpt}</p>` : ""}
              <a href="${baseUrl}/blog/${encodeURIComponent(post.slug)}"
                 style="display: inline-block; padding: 12px 24px; background: #D4A843; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Đọc bài viết
              </a>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #999;">
                Bạn nhận email này vì đã đăng ký tài khoản tại ${siteDomain}
              </p>
            </div>
          `;

  const entries: BulkEmailEntry[] = emails.map((email: string) => ({
    to: email,
    subject,
    html,
  }));

  await sendBulkEmails(entries, 100);
}
