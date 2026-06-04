import { createClient, createAdminClient } from "@/lib/supabase/server";

// ─── GET: Admin subscription statistics ─────────────────────────────────────

export async function GET() {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return Response.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const admin = await createAdminClient();
    const now = new Date();

    // Total active plans
    const { count: totalPlans } = await admin
      .from("subscription_plans")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Total active subscribers
    const { count: activeSubscribers } = await admin
      .from("user_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gte("current_period_end", now.toISOString());

    // Total subscriptions (all time)
    const { count: totalSubscriptions } = await admin
      .from("user_subscriptions")
      .select("*", { count: "exact", head: true });

    // Monthly revenue (from subscription orders paid this month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: monthlyOrders } = await admin
      .from("orders")
      .select("amount")
      .eq("payment_method", "subscription")
      .eq("status", "paid")
      .gte("paid_at", monthStart);

    const monthlyRevenue = (monthlyOrders ?? []).reduce(
      (sum: number, o: { amount: number }) => sum + o.amount,
      0
    );

    // Churn rate: expired or cancelled in last 30 days / total at start of period
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { count: churned } = await admin
      .from("user_subscriptions")
      .select("*", { count: "exact", head: true })
      .in("status", ["expired", "cancelled"])
      .gte("updated_at", thirtyDaysAgo);

    const totalActive = (activeSubscribers ?? 0) + (churned ?? 0);
    const churnRate =
      totalActive > 0
        ? Math.round(((churned ?? 0) / totalActive) * 100 * 10) / 10
        : 0;

    // Pending subscriptions (awaiting payment)
    const { count: pendingCount } = await admin
      .from("user_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return Response.json({
      stats: {
        total_plans: totalPlans ?? 0,
        active_subscribers: activeSubscribers ?? 0,
        total_subscriptions: totalSubscriptions ?? 0,
        monthly_revenue: monthlyRevenue,
        churn_rate: churnRate,
        pending_subscriptions: pendingCount ?? 0,
      },
    });
  } catch (err) {
    console.error("[Admin Sub Stats] Error:", err);
    return Response.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
