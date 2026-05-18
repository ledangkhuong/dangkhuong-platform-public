import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

// --- Level / streak helpers ---
// Level formula must match DB trigger `update_user_xp`: floor(xp / 200) + 1
function getLevelFromXP(xp: number): number {
  return Math.max(1, Math.floor(xp / 200) + 1);
}

const STREAK_MILESTONES = [7, 14, 30, 60];

// POST — đánh dấu bài học hoàn thành
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lesson_id, product_id, completed, watch_sec, note } = await req.json();

  // Verify enrollment before allowing progress update
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", product_id)
    .single();

  if (!enrollment) {
    return NextResponse.json(
      { error: "Bạn chưa đăng ký khoá học này" },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("lesson_progress")
    .upsert({ user_id: user.id, lesson_id, product_id, completed, watch_sec, note, updated_at: new Date().toISOString() })
    .select().single();

  if (error) {
    console.error("[Progress POST] Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi cập nhật tiến độ. Vui lòng thử lại." }, { status: 500 });
  }

  // Thêm XP khi hoàn thành bài học lần đầu
  if (completed) {
    const { count } = await supabase.from("xp_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id).eq("action", "lesson_complete")
      .eq("meta->lesson_id", lesson_id);

    if (count === 0) {
      await supabase.from("xp_events").insert({
        user_id: user.id, action: "lesson_complete", xp_amount: 30,
        meta: { lesson_id, product_id },
      });

      // --- Update streak ---
      try {
        const { data: streakProfile } = await supabase
          .from("profiles")
          .select("streak, last_active_date")
          .eq("id", user.id)
          .single();

        if (streakProfile) {
          const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
          const lastActive = streakProfile.last_active_date as string | null;

          let newStreak = 1;
          if (lastActive === today) {
            // Already counted today — keep current streak, skip update
            newStreak = streakProfile.streak ?? 1;
          } else if (lastActive) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().slice(0, 10);

            if (lastActive === yesterdayStr) {
              // Consecutive day — increment
              newStreak = (streakProfile.streak ?? 0) + 1;
            }
            // else: gap > 1 day — reset to 1 (default)
          }

          if (lastActive !== today) {
            await supabase
              .from("profiles")
              .update({ streak: newStreak, last_active_date: today })
              .eq("id", user.id);
          }
        }
      } catch {
        // Streak failure should not break progress tracking
      }

      // --- Achievement notifications (level-up & streak milestones) ---
      try {
        const adminClient = await createAdminClient();

        // Fetch current profile to get XP (already incremented by DB trigger) and streak
        const { data: profile } = await supabase
          .from("profiles")
          .select("xp, streak")
          .eq("id", user.id)
          .single();

        if (profile) {
          const newXP = profile.xp ?? 0;
          const oldXP = newXP - 30; // XP before this award
          const oldLevel = getLevelFromXP(oldXP);
          const newLevel = getLevelFromXP(newXP);

          if (newLevel > oldLevel) {
            await createNotification(
              adminClient,
              user.id,
              "achievement",
              `🎉 Lên cấp ${newLevel}!`,
              `Chúc mừng bạn đã đạt cấp ${newLevel}! Tiếp tục học để mở khoá nhiều thành tựu hơn.`,
              "/leaderboard",
            );
          }

          // Streak milestone check
          const streak = profile.streak ?? 0;
          if (STREAK_MILESTONES.includes(streak)) {
            await createNotification(
              adminClient,
              user.id,
              "achievement",
              `🔥 Streak ${streak} ngày!`,
              `Tuyệt vời! Bạn đã duy trì chuỗi học ${streak} ngày liên tiếp.`,
            );
          }
        }
      } catch {
        // Notification failure should never break progress tracking
      }
    }

    // Check if ALL lessons in the course are now completed → send completion email
    try {
      // Count total lessons for this product (via chapters)
      const { data: chapters } = await supabase
        .from("chapters")
        .select("lessons(id)")
        .eq("product_id", product_id);

      const totalLessons = (chapters ?? []).reduce(
        (sum, ch) => sum + ((ch.lessons as { id: string }[]) ?? []).length,
        0,
      );

      // Count completed lesson_progress for this user + product
      const { count: completedCount } = await supabase
        .from("lesson_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("product_id", product_id)
        .eq("completed", true);

      if (totalLessons > 0 && (completedCount ?? 0) >= totalLessons) {
        const { sendCourseCompletionEmail } = await import("@/lib/email/resend");
        const { data: product } = await supabase
          .from("products")
          .select("name, title, slug")
          .eq("id", product_id)
          .single();
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (user.email && product?.slug) {
          await sendCourseCompletionEmail(
            user.email,
            profile?.full_name || "bạn",
            product.name || product.title || "Khoá học",
            product.slug,
          ).catch(() => {});
        }
      }
    } catch {
      // Email failure should not break progress tracking
    }
  }

  return NextResponse.json({ progress: data });
}

// GET — lấy progress của user cho 1 khoá học
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const product_id = searchParams.get("product_id");

  const lesson_id = searchParams.get("lesson_id");

  const query = supabase.from("lesson_progress")
    .select("*").eq("user_id", user.id);
  if (product_id) query.eq("product_id", product_id);
  if (lesson_id) query.eq("lesson_id", lesson_id);

  const { data, error } = await query;
  if (error) {
    console.error("[Progress GET] Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi tải tiến độ. Vui lòng thử lại." }, { status: 500 });
  }
  return NextResponse.json({ progress: data });
}
