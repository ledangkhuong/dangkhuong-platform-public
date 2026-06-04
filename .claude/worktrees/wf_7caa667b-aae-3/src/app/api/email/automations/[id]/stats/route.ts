import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/email/automations/[id]/stats — get automation stats and recent activity
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: only admin/manager
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["admin", "manager"].includes(profile?.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const admin = await createAdminClient();

    // 1. Enrollment stats: count enrollments grouped by status
    const { data: enrollments } = await admin
      .from("email_automation_enrollments")
      .select("status")
      .eq("automation_id", id);

    const enrollmentStats = {
      active: 0,
      waiting: 0,
      completed: 0,
      paused: 0,
      exited: 0,
    };

    for (const e of enrollments || []) {
      const status = e.status as keyof typeof enrollmentStats;
      if (status in enrollmentStats) {
        enrollmentStats[status]++;
      }
    }

    // 2. Step performance: for each email step, count sent/opened/clicked
    const { data: emailLogs } = await admin
      .from("email_automation_logs")
      .select("step_id, action")
      .eq("automation_id", id)
      .in("action", ["email_sent", "email_opened", "email_clicked"]);

    const stepMap: Record<
      string,
      { step_id: string; sent: number; opened: number; clicked: number }
    > = {};

    for (const log of emailLogs || []) {
      if (!log.step_id) continue;
      if (!stepMap[log.step_id]) {
        stepMap[log.step_id] = {
          step_id: log.step_id,
          sent: 0,
          opened: 0,
          clicked: 0,
        };
      }
      if (log.action === "email_sent") stepMap[log.step_id].sent++;
      else if (log.action === "email_opened") stepMap[log.step_id].opened++;
      else if (log.action === "email_clicked") stepMap[log.step_id].clicked++;
    }

    const stepPerformance = Object.values(stepMap);

    // 3. Recent activity: last 50 logs
    const { data: logs } = await admin
      .from("email_automation_logs")
      .select("*, subscribers(email, full_name)")
      .eq("automation_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    // 4. Daily enrollment trend: group enrollments by date (last 30 days)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: recentEnrollments } = await admin
      .from("email_automation_enrollments")
      .select("enrolled_at")
      .eq("automation_id", id)
      .gte("enrolled_at", thirtyDaysAgo);

    const dailyMap: Record<string, number> = {};
    for (const enrollment of recentEnrollments || []) {
      if (!enrollment.enrolled_at) continue;
      const date = enrollment.enrolled_at.split("T")[0];
      dailyMap[date] = (dailyMap[date] || 0) + 1;
    }

    const dailyTrend = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      enrollmentStats,
      recentLogs: logs || [],
      dailyTrend,
      stepPerformance,
    });
  } catch (err) {
    console.error("GET /api/email/automations/[id]/stats error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
