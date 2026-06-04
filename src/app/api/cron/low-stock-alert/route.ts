import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { checkLowStock, sendLowStockAlert } from "@/lib/ecommerce/alerts";

/**
 * Low Stock Alert Cron
 *
 * Chạy daily (08:00 sáng) — quét product_variants có stock_count <= low_stock_threshold,
 * sau đó gửi email cảnh báo tới tất cả admin (profiles WHERE role='admin').
 *
 * Schedule: 0 8 * * * (xem vercel.json)
 * Auth: Bearer token qua CRON_SECRET env var
 */
export async function GET(req: NextRequest) {
  // ── Guard: reject if CRON_SECRET is not configured ─────────
  if (!process.env.CRON_SECRET) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 503 },
    );
  }

  // ── Auth ────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  const expected = Buffer.from(expectedAuth, "utf-8");
  const received = Buffer.from(authHeader, "utf-8");
  const isAuthorized =
    expected.length === received.length &&
    timingSafeEqual(expected, received);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Query low-stock variants ─────────────────────────────
    const variants = await checkLowStock();

    if (variants.length === 0) {
      return NextResponse.json({ sent: 0, lowStockCount: 0 });
    }

    // ── 2. Get admin emails từ profiles WHERE role='admin' ─────
    const admin = await createAdminClient();

    const { data: adminProfiles, error: profilesError } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (profilesError) {
      console.error(
        "[Low Stock Alert] Profiles query error:",
        profilesError.message,
      );
      return NextResponse.json(
        { error: "Failed to query admin profiles" },
        { status: 500 },
      );
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.warn("[Low Stock Alert] No admin profiles found");
      return NextResponse.json({
        sent: 0,
        lowStockCount: variants.length,
        warning: "No admin recipients",
      });
    }

    // Lookup auth emails (profiles không lưu email — phải qua auth.admin)
    const userResults = await Promise.allSettled(
      adminProfiles.map((p) => admin.auth.admin.getUserById(p.id)),
    );

    const adminEmails: string[] = [];
    for (let i = 0; i < adminProfiles.length; i++) {
      const result = userResults[i];
      if (result.status === "fulfilled") {
        const { data, error } = result.value;
        if (!error && data?.user?.email) {
          adminEmails.push(data.user.email);
        } else {
          console.warn(
            `[Low Stock Alert] Could not get email for admin ${adminProfiles[i].id}:`,
            error?.message,
          );
        }
      } else {
        console.warn(
          `[Low Stock Alert] Failed to fetch admin ${adminProfiles[i].id}:`,
          result.reason,
        );
      }
    }

    if (adminEmails.length === 0) {
      return NextResponse.json({
        sent: 0,
        lowStockCount: variants.length,
        warning: "No admin emails resolved",
      });
    }

    // ── 3. Send alert email tới từng admin ──────────────────────
    let sent = 0;
    for (const email of adminEmails) {
      try {
        const result = await sendLowStockAlert(email, variants);
        if (result.success) {
          sent++;
          console.log(
            `[Low Stock Alert] Sent to ${email} (${variants.length} variants)`,
          );
        } else {
          console.error(
            `[Low Stock Alert] Send failed to ${email}:`,
            result.error,
          );
        }
      } catch (err) {
        console.error(
          `[Low Stock Alert] Error sending to ${email}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return NextResponse.json({
      sent,
      lowStockCount: variants.length,
    });
  } catch (err) {
    console.error(
      "[Low Stock Alert] Unexpected error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
