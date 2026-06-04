import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const VALID_REASONS = ["spam", "inappropriate", "harassment", "misinformation", "other"];

/**
 * POST /api/community/reports — Report a post or comment
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimit(`reports:${ip}`, 10, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều báo cáo. Vui lòng thử lại sau." },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { post_id, comment_id, reason, details } = body;

    if (!post_id && !comment_id) {
      return NextResponse.json({ error: "post_id hoặc comment_id là bắt buộc" }, { status: 400 });
    }
    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Lý do không hợp lệ" }, { status: 400 });
    }

    // Don't allow reporting your own content
    const admin = await createAdminClient();
    if (post_id) {
      const { data: post } = await admin.from("posts").select("user_id").eq("id", post_id).single();
      if (post?.user_id === user.id) {
        return NextResponse.json({ error: "Không thể báo cáo bài viết của chính mình" }, { status: 400 });
      }
    }

    const { error } = await admin.from("post_reports").insert({
      ...(post_id ? { post_id } : {}),
      ...(comment_id ? { comment_id } : {}),
      reporter_id: user.id,
      reason,
      details: details?.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Bạn đã báo cáo nội dung này rồi" }, { status: 409 });
      }
      console.error("POST /api/community/reports error:", error.message);
      return NextResponse.json({ error: "Không thể gửi báo cáo" }, { status: 500 });
    }

    // Notify admins
    try {
      const { data: admins } = await admin
        .from("profiles")
        .select("id")
        .in("role", ["admin", "manager"]);

      if (admins?.length) {
        const notifications = admins.map((a) => ({
          user_id: a.id,
          type: "system",
          title: "Báo cáo mới từ cộng đồng",
          message: `Có nội dung bị báo cáo: ${reason}`,
          link: "/crm/moderation",
        }));
        await admin.from("notifications").insert(notifications);
      }
    } catch {
      // Notification failure should not break report flow
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/community/reports unexpected:", err);
    return NextResponse.json({ error: "Không thể thực hiện. Vui lòng thử lại." }, { status: 500 });
  }
}
