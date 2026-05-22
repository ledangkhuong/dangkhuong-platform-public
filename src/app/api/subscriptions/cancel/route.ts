import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// ─── POST: Cancel subscription ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = await rateLimit(`sub-cancel:${ip}`, 5, 60);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfterSec) },
        }
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // Parse optional cancel reason
    let cancelReason = "";
    try {
      const body = await req.json();
      cancelReason = body.cancel_reason || "";
    } catch {
      // No body is fine
    }

    const admin = await createAdminClient();

    // Find active subscription
    const { data: subscription, error: fetchError } = await admin
      .from("user_subscriptions")
      .select("id, status, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("current_period_end", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[Cancel Sub] Fetch error:", fetchError.message);
      return NextResponse.json(
        { error: "Lỗi khi tìm gói đăng ký" },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        { error: "Không tìm thấy gói đăng ký đang hoạt động" },
        { status: 404 }
      );
    }

    // Cancel — subscription remains active until current_period_end
    const { error: updateError } = await admin
      .from("user_subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason || null,
        auto_renew: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("[Cancel Sub] Update error:", updateError.message);
      return NextResponse.json(
        { error: "Không thể huỷ gói đăng ký. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Gói đăng ký đã được huỷ. Bạn vẫn có thể sử dụng cho đến hết kỳ hiện tại.",
      active_until: subscription.current_period_end,
    });
  } catch (err) {
    console.error("[Cancel Sub] Error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
