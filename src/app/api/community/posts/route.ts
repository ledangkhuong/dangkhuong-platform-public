import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { checkFlaggedContent } from "@/lib/keyword-filter";

// GET /api/community/posts — lấy danh sách posts (requires auth)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check — community posts are for authenticated users only
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = parseInt(searchParams.get("offset") || "0");
    const category = searchParams.get("category");
    const product_id = searchParams.get("product_id");

    // Exclude lesson questions (tagged with _q) from community feed
    // Only show visible posts (not hidden/deleted by moderation)
    let query = supabase
      .from("posts")
      .select(`*, profiles!posts_user_id_fkey(full_name, avatar_url, level, tier)`)
      .or('tags.is.null,tags.not.cs.{_q}')
      .eq("status", "visible");

    // Filter by category if provided
    if (category) {
      query = query.eq("category", category);
    }

    // Filter by product_id for course discussions, or exclude course-specific posts
    if (product_id) {
      query = query.eq("product_id", product_id);
    } else {
      query = query.is("product_id", null);
    }

    const { data, error } = await query
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("GET /api/community/posts error:", error.message);
      return NextResponse.json({ error: "Không thể tải bài viết. Vui lòng thử lại." }, { status: 500 });
    }
    return NextResponse.json({ posts: data });
  } catch (err) {
    console.error("GET /api/community/posts error:", err);
    return NextResponse.json({ error: "Không thể tải bài viết. Vui lòng thử lại." }, { status: 500 });
  }
}

// POST /api/community/posts — tạo post mới
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const rateLimitResult = await rateLimit(`posts:${ip}`, 10, 60);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSec) } }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { content, tags, image_url, category, product_id } = body;
    if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
    if (content.trim().length > 5000) {
      return NextResponse.json({ error: "Nội dung quá dài (tối đa 5000 ký tự)" }, { status: 400 });
    }

    if (image_url) {
      try {
        const urlObj = new URL(image_url);
        if (!["http:", "https:"].includes(urlObj.protocol)) {
          return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }
    }

    // Use admin client for DB operations (auth already verified above)
    const admin = await createAdminClient();

    // New-user posting limit: accounts < 24h old → max 2 posts/day
    const { data: userProfile } = await admin
      .from("profiles")
      .select("created_at, role")
      .eq("id", user.id)
      .single();

    const accountAge = Date.now() - new Date(userProfile?.created_at ?? 0).getTime();
    const isNewUser = accountAge < 24 * 60 * 60 * 1000;
    const isStaffRole = ["admin", "manager", "marketing", "sale", "support", "instructor"].includes(userProfile?.role ?? "");

    if (isNewUser && !isStaffRole) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: postsToday } = await admin
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString());

      if ((postsToday ?? 0) >= 2) {
        return NextResponse.json(
          { error: "Tài khoản mới chỉ được đăng tối đa 2 bài/ngày. Vui lòng thử lại sau." },
          { status: 429 }
        );
      }
    }

    // Check content for flagged keywords
    const flagResult = checkFlaggedContent(content);

    // If product_id is provided, verify enrollment or staff role
    if (product_id) {
      const { data: enrollment } = await admin
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product_id)
        .maybeSingle();

      let isStaff = false;
      if (!enrollment) {
        const { data: profile } = await admin
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
    }

    const { data, error } = await admin
      .from("posts")
      .insert({
        user_id: user.id,
        content: content.trim(),
        tags,
        image_url,
        status: "visible",
        ...(category ? { category } : {}),
        ...(product_id ? { product_id } : {}),
        ...(flagResult.flagged ? { flagged: true } : {}),
      })
      .select(`*, profiles!posts_user_id_fkey(full_name, avatar_url, level, tier)`)
      .single();

    if (error) {
      console.error("POST /api/community/posts error:", error.message, "code:", error.code, "details:", error.details);
      return NextResponse.json({ error: "Không thể tạo bài viết. Vui lòng thử lại." }, { status: 500 });
    }

    if (!data) {
      console.error("POST /api/community/posts: insert returned no data");
      return NextResponse.json({ error: "Không thể tạo bài viết. Vui lòng thử lại." }, { status: 500 });
    }

    // Thêm XP (daily cap: 5 post-XP events)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: postXpToday } = await admin
      .from("xp_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", "post_created")
      .gte("created_at", todayStart.toISOString());

    if ((postXpToday ?? 0) < 5) {
      await admin.from("xp_events").insert({ user_id: user.id, action: "post_created", xp_amount: 50 });
    }

    // Notify admins when a post is flagged by keyword filter
    if (flagResult.flagged) {
      try {
        const { data: admins } = await admin
          .from("profiles")
          .select("id")
          .in("role", ["admin", "manager"]);
        if (admins?.length) {
          const notifications = admins.map((a) => ({
            user_id: a.id,
            type: "system",
            title: "Bài viết bị gắn cờ",
            message: `Bài viết mới chứa từ khoá nhạy cảm: ${flagResult.matchedKeywords.join(", ")}`,
            link: "/crm/moderation",
          }));
          await admin.from("notifications").insert(notifications);
        }
      } catch {
        // Notification failure should not break post flow
      }
    }

    return NextResponse.json({ post: data });
  } catch (err) {
    console.error("POST /api/community/posts unexpected error:", err);
    return NextResponse.json({ error: "Không thể tạo bài viết. Vui lòng thử lại." }, { status: 500 });
  }
}
