import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/crm/sales-performance — Sales performance data
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
  if (
    !profile ||
    !["admin", "manager", "sale", "support", "marketing"].includes(
      profile.role
    )
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = await createAdminClient();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Query the sales performance view
  const { data: reps, error: repsError } = await adminClient
    .from("crm_sales_performance")
    .select("*");

  if (repsError)
    return NextResponse.json({ error: repsError.message }, { status: 500 });

  let periodStats: {
    total_revenue: number;
    total_won: number;
    avg_conversion: number;
    won_by_rep?: Record<string, number>;
    activities_by_rep?: Record<string, number>;
  } | null = null;

  if (from && to) {
    // Won deals in the date range grouped by assigned_to
    const { data: wonDeals } = await adminClient
      .from("crm_deals")
      .select("assigned_to, value")
      .eq("stage", "won")
      .gte("won_at", from)
      .lte("won_at", to);

    // Activities in the date range grouped by created_by
    const { data: activities } = await adminClient
      .from("crm_activities")
      .select("created_by")
      .gte("created_at", from)
      .lte("created_at", to);

    // Calculate period stats
    const wonByRep: Record<string, number> = {};
    let totalRevenue = 0;
    let totalWon = 0;

    if (wonDeals) {
      for (const deal of wonDeals) {
        totalWon++;
        totalRevenue += deal.value || 0;
        if (deal.assigned_to) {
          wonByRep[deal.assigned_to] = (wonByRep[deal.assigned_to] || 0) + 1;
        }
      }
    }

    const activitiesByRep: Record<string, number> = {};
    if (activities) {
      for (const act of activities) {
        if (act.created_by) {
          activitiesByRep[act.created_by] =
            (activitiesByRep[act.created_by] || 0) + 1;
        }
      }
    }

    // Calculate average conversion (won / total deals in period)
    const { count: totalDealsInPeriod } = await adminClient
      .from("crm_deals")
      .select("id", { count: "exact", head: true })
      .gte("created_at", from)
      .lte("created_at", to);

    const avgConversion =
      totalDealsInPeriod && totalDealsInPeriod > 0
        ? (totalWon / totalDealsInPeriod) * 100
        : 0;

    periodStats = {
      total_revenue: totalRevenue,
      total_won: totalWon,
      avg_conversion: Math.round(avgConversion * 100) / 100,
      won_by_rep: wonByRep,
      activities_by_rep: activitiesByRep,
    };
  }

  return NextResponse.json({
    reps: reps ?? [],
    period_stats: periodStats || {
      total_revenue: 0,
      total_won: 0,
      avg_conversion: 0,
    },
  });
}
