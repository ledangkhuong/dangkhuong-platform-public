import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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
    const now = new Date();
    const defaultTo = now.toISOString();
    const defaultFrom = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const rawFrom = searchParams.get("from") || defaultFrom;
    const rawTo = searchParams.get("to") || defaultTo;
    const groupBy = searchParams.get("groupBy") || "day";

    // Normalize date range: ensure full day coverage
    const fromISO = rawFrom.includes("T") ? rawFrom : `${rawFrom}T00:00:00.000Z`;
    const toISO = rawTo.includes("T") ? rawTo : `${rawTo}T23:59:59.999Z`;

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient();

    // Fetch new users (profiles) in range
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("created_at")
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    // Fetch new enrollments in range
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("created_at")
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    // Group by day or month
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      if (groupBy === "month") {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
      return date.toISOString().split("T")[0];
    };

    // Build a map of all dates in the range
    const dateMap: Record<string, { newUsers: number; newEnrollments: number }> =
      {};

    // Generate all date keys in range
    const startDate = new Date(fromISO);
    const endDate = new Date(toISO);

    if (groupBy === "month") {
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (current <= endDate) {
        const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
        dateMap[key] = { newUsers: 0, newEnrollments: 0 };
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      const current = new Date(startDate);
      current.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      while (current <= end) {
        const key = current.toISOString().split("T")[0];
        dateMap[key] = { newUsers: 0, newEnrollments: 0 };
        current.setDate(current.getDate() + 1);
      }
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
