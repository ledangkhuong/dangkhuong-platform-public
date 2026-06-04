import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// ─── GET: Get current user's active subscription ────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const admin = await createAdminClient();

    // Get active or cancelled-but-not-expired subscription
    const { data: subscription, error } = await admin
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", user.id)
      .in("status", ["active", "cancelled"])
      .gte("current_period_end", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[My Subscription] Error:", error.message);
      return NextResponse.json(
        { error: "Lỗi khi tải thông tin gói đăng ký" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscription: subscription ?? null });
  } catch (err) {
    console.error("[My Subscription] Error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
