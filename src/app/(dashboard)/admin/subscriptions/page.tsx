import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import CreatePlanForm from "@/components/admin/CreatePlanForm";
import {
  CreditCard,
  Users,
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Types ──────────────────────────────────────────────────────────────────

type BillingPeriod = "monthly" | "3months" | "6months" | "yearly";

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  billing_period: BillingPeriod;
  price: number;
  original_price: number | null;
  features: string[];
  tier_granted: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  active_subscribers?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

const BILLING_LABELS: Record<BillingPeriod, string> = {
  monthly: "Hàng tháng",
  "3months": "3 tháng",
  "6months": "6 tháng",
  yearly: "1 năm",
};

function TierBadge({ tier }: { tier: string }) {
  const config: Record<string, { label: string; color: string; bg: string; border: string }> = {
    vip: {
      label: "VIP",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.2)",
    },
    member: {
      label: "Member",
      color: "#a855f7",
      bg: "rgba(168,85,247,0.1)",
      border: "rgba(168,85,247,0.2)",
    },
    free: {
      label: "Free",
      color: "#6b7280",
      bg: "rgba(107,114,128,0.1)",
      border: "rgba(107,114,128,0.2)",
    },
  };
  const cfg = config[tier] ?? config.free;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function AdminSubscriptionsPage() {
  // Auth check
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const supabase = await createAdminClient();

  // Fetch all plans
  const { data: rawPlans } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("sort_order", { ascending: true });

  const plans: PlanRow[] = (rawPlans ?? []) as unknown as PlanRow[];

  // Get subscriber counts per plan
  const plansWithCounts: PlanRow[] = await Promise.all(
    plans.map(async (plan) => {
      const { count } = await supabase
        .from("user_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("plan_id", plan.id)
        .eq("status", "active");
      return { ...plan, active_subscribers: count ?? 0 };
    })
  );

  // Stats
  const { count: totalPlansCount } = await supabase
    .from("subscription_plans")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const now = new Date();
  const { count: activeSubCount } = await supabase
    .from("user_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .gte("current_period_end", now.toISOString());

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: monthlyOrders } = await supabase
    .from("orders")
    .select("amount")
    .eq("payment_method", "subscription")
    .eq("status", "paid")
    .gte("paid_at", monthStart);

  const monthlyRevenue = (monthlyOrders ?? []).reduce(
    (sum: number, o: { amount: number }) => sum + o.amount,
    0
  );

  // Churn rate
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: churned } = await supabase
    .from("user_subscriptions")
    .select("*", { count: "exact", head: true })
    .in("status", ["expired", "cancelled"])
    .gte("updated_at", thirtyDaysAgo);

  const totalActive = (activeSubCount ?? 0) + (churned ?? 0);
  const churnRate =
    totalActive > 0
      ? Math.round(((churned ?? 0) / totalActive) * 100 * 10) / 10
      : 0;

  return (
    <div>
      <TopBar
        title="Quản lý Gói đăng ký"
        subtitle="Tạo và quản lý các gói đăng ký cho thành viên"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total plans */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                <CreditCard size={17} className="text-[#3b82f6]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {totalPlansCount ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Gói đăng ký</div>
          </div>

          {/* Active subscribers */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,168,67,0.12)" }}
              >
                <Users size={17} className="text-[#D4A843]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {activeSubCount ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Người đăng ký
            </div>
          </div>

          {/* Monthly revenue */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.12)" }}
              >
                <TrendingUp size={17} className="text-[#22c55e]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(monthlyRevenue)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Doanh thu tháng
            </div>
          </div>

          {/* Churn rate */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.12)" }}
              >
                <BarChart3 size={17} className="text-[#ef4444]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{churnRate}%</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Tỷ lệ huỷ (30 ngày)
            </div>
          </div>
        </div>

        {/* ── Create plan form ── */}
        <CreatePlanForm />

        {/* ── Plans table ── */}
        <div className="card-dark overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <span className="text-xs text-gray-500">
              Hiển thị{" "}
              <span className="text-white font-medium">
                {plansWithCounts.length}
              </span>{" "}
              gói đăng ký
            </span>
          </div>

          {plansWithCounts.length === 0 ? (
            <div className="p-12 text-center text-gray-600 text-sm">
              Chưa có gói đăng ký nào. Tạo gói đầu tiên ở trên.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {[
                      "Tên gói",
                      "Chu kỳ",
                      "Giá",
                      "Tier",
                      "Người đăng ký",
                      "Trạng thái",
                      "",
                    ].map((col, i) => (
                      <th
                        key={col || `col-${i}`}
                        className="text-left text-xs font-semibold text-gray-500 px-5 py-3 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plansWithCounts.map((plan, idx) => (
                    <tr
                      key={plan.id}
                      className="hover:bg-white/[0.02] transition-colors"
                      style={{
                        borderBottom:
                          idx < plansWithCounts.length - 1
                            ? "1px solid #1f1f1f"
                            : "none",
                      }}
                    >
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-white text-sm">
                          {plan.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {plan.slug}
                        </div>
                      </td>

                      {/* Billing period */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-600" />
                          <span className="text-gray-300 text-sm">
                            {BILLING_LABELS[plan.billing_period] ??
                              plan.billing_period}
                          </span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-white">
                          {formatCurrency(plan.price)}
                        </span>
                        {plan.original_price &&
                          plan.original_price > plan.price && (
                            <span className="text-xs text-gray-600 line-through ml-2">
                              {formatCurrency(plan.original_price)}
                            </span>
                          )}
                      </td>

                      {/* Tier */}
                      <td className="px-5 py-3.5">
                        <TierBadge tier={plan.tier_granted} />
                      </td>

                      {/* Subscribers */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-gray-600" />
                          <span className="text-gray-300 text-sm">
                            {plan.active_subscribers ?? 0}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {plan.is_active ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(34,197,94,0.1)",
                              color: "#22c55e",
                              border: "1px solid rgba(34,197,94,0.2)",
                            }}
                          >
                            <CheckCircle size={11} />
                            Hoạt động
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(107,114,128,0.1)",
                              color: "#6b7280",
                              border: "1px solid rgba(107,114,128,0.2)",
                            }}
                          >
                            <XCircle size={11} />
                            Ngưng
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {/* Placeholder for future edit/delete buttons */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
