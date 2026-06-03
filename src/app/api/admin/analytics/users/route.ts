import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  vnDayKey,
  vnMonthKey,
  vnRangeToUtc,
  vnDayKeysInRange,
  vnMonthKeysInRange,
} from "@/lib/vn-time";

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    // `from`/`to` are VN calendar days ("YYYY-MM-DD").
    const from = searchParams.get("from") || vnDayKey(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = searchParams.get("to") || vnDayKey(Date.now());
    const groupBy = searchParams.get("groupBy") || "day";

    // VN day window [from 00:00, to 24:00) in Asia/Ho_Chi_Minh, as UTC instants.
    const { startUtc, endUtc } = vnRangeToUtc(from, to);

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient();

    // Fetch new users (profiles) in range
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("created_at")
      .gte("created_at", startUtc)
      .lt("created_at", endUtc);

    // Fetch new enrollments in range
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("created_at")
      .gte("created_at", startUtc)
      .lt("created_at", endUtc);

    // Group by VN day or VN month (00:00 → 24:00 Asia/Ho_Chi_Minh).
    const formatDate = (dateStr: string): string =>
      groupBy === "month" ? vnMonthKey(dateStr) : vnDayKey(dateStr);

    // Build a map of all VN date/month keys in the range (zero-filled).
    const dateMap: Record<string, { newUsers: number; newEnrollments: number }> =
      {};
    const keys =
      groupBy === "month"
        ? vnMonthKeysInRange(from, to)
        : vnDayKeysInRange(from, to);
    for (const key of keys) {
      dateMap[key] = { newUsers: 0, newEnrollments: 0 };
    }

    // Count users per date
    for (const p of profiles || []) {
      const key = formatDate(p.created_at);
      if (dateMap[key]) {
        dateMap[key].newUsers++;
      }
    }

    // Count enrollments per date
    for (const e of enrollments || []) {
      const key = formatDate(e.created_at);
      if (dateMap[key]) {
        dateMap[key].newEnrollments++;
      }
    }

    // Convert to sorted array
    const result = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        newUsers: counts.newUsers,
        newEnrollments: counts.newEnrollments,
      }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analytics users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
