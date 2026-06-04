import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { checkAndExpireSubscriptions } from "@/lib/subscription";

/**
 * Subscription Expiry Cron
 *
 * Finds active/cancelled subscriptions whose period has ended,
 * marks them as expired, and downgrades users with no remaining
 * active subscription to the free tier.
 *
 * Schedule: daily at 2 AM UTC via Vercel Cron (see vercel.json)
 * Auth: Bearer token via CRON_SECRET env var
 */
export async function GET(req: NextRequest) {
  // ── Guard: reject if CRON_SECRET is not configured ─────────
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET is not configured');
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
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
    const result = await checkAndExpireSubscriptions();

    return NextResponse.json({
      expired: result.expired,
      downgraded: result.downgraded,
    });
  } catch (err) {
    console.error(
      "[Subscription Cron] Unexpected error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
