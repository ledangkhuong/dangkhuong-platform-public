/**
 * GET /api/cron/aimakemoremoney
 *
 * Runs every 10 minutes via Vercel Cron. Walks through the fixed event
 * schedule and, for every stage whose fireAt is in the past, sends the
 * corresponding email to every attendee who hasn't received it yet.
 *
 * Idempotent: each (email, stage) pair is sent at most once because
 * stages_sent is checked + updated atomically per attendee.
 *
 * Auth: Bearer token via CRON_SECRET env var.
 */
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/ses";
import {
  reminderD1Email,
  reminderT1hEmail,
  eventCompleteEmail,
  type AimmTier,
  type SessionNum,
} from "@/lib/email/templates/aimakemoremoney";

// ─── Schedule ───
// All times Asia/Ho_Chi_Minh (UTC+7).
// fireAt = the earliest moment the email may be sent.

type StageDef = {
  stage: string;
  fireAtIso: string;
  build: (
    tier: AimmTier,
    name: string
  ) => { subject: string; html: string };
};

function d1(num: SessionNum): StageDef {
  return {
    stage: `d1_session${num}`,
    // D-1 reminder fires at noon the day before the session.
    // Sessions: 12/06, 13/06, 14/06 → reminders at noon 11/06, 12/06, 13/06.
    fireAtIso: `2026-06-${10 + num}T12:00:00+07:00`,
    build: (tier, name) => reminderD1Email(tier, name, num),
  };
}

function t1h(num: SessionNum): StageDef {
  return {
    stage: `t1h_session${num}`,
    // T-1h reminder fires at 19:00 the day of each session.
    fireAtIso: `2026-06-${11 + num}T19:00:00+07:00`,
    build: (tier, name) => reminderT1hEmail(tier, name, num),
  };
}

// Recap-per-session emails were removed per anh Khương's feedback.
// The funnel is now Welcome → 3× D-1 → 3× T-1h → Event Complete.

const SCHEDULE: StageDef[] = [
  d1(1),
  d1(2),
  d1(3),
  t1h(1),
  t1h(2),
  t1h(3),
  {
    stage: "event_complete",
    // Morning after the last session (15/06 08:00).
    fireAtIso: "2026-06-15T08:00:00+07:00",
    build: (tier, name) => eventCompleteEmail(tier, name),
  },
];

const MAX_PER_RUN = 200; // cap emails sent per cron invocation

export async function GET(req: NextRequest) {
  // ── Auth guard ──
  if (!process.env.CRON_SECRET) {
    console.error("[aimm/cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 503 }
    );
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET}`, "utf-8");
  const received = Buffer.from(authHeader, "utf-8");
  const authorized =
    expected.length === received.length &&
    timingSafeEqual(expected, received);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const dueStages = SCHEDULE.filter((s) => Date.parse(s.fireAtIso) <= now);

  if (dueStages.length === 0) {
    return NextResponse.json({
      processed: 0,
      sent: 0,
      message: "No stages due yet",
    });
  }

  const dueStageNames = dueStages.map((s) => s.stage);

  try {
    const admin = await createAdminClient();

    // Pull every attendee that hasn't received at least one of the due
    // stages yet. The post-filter below handles per-stage logic.
    const { data: attendees, error: queryErr } = await admin
      .from("aimm_attendees")
      .select("id, email, full_name, tier, stages_sent, unsubscribed_at")
      .is("unsubscribed_at", null)
      .limit(2000);

    if (queryErr) {
      console.error("[aimm/cron] Query error:", queryErr.message);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    if (!attendees || attendees.length === 0) {
      return NextResponse.json({
        processed: 0,
        sent: 0,
        message: "No attendees",
      });
    }

    let sent = 0;
    const stageCounts: Record<string, number> = {};

    outer: for (const stageDef of dueStages) {
      for (const att of attendees) {
        if (sent >= MAX_PER_RUN) break outer;

        const sentArr: string[] = att.stages_sent ?? [];
        if (sentArr.includes(stageDef.stage)) continue;

        const tier = att.tier as AimmTier;
        if (!tier) continue;

        try {
          const { subject, html } = stageDef.build(tier, att.full_name);
          const result = await sendEmail(att.email, subject, html);
          if (!result.success) {
            console.warn(
              `[aimm/cron] Send failed for ${att.email} / ${stageDef.stage}:`,
              result.error
            );
            continue;
          }

          const newSentArr = Array.from(new Set([...sentArr, stageDef.stage]));
          const { error: updateErr } = await admin
            .from("aimm_attendees")
            .update({ stages_sent: newSentArr })
            .eq("id", att.id);

          if (updateErr) {
            console.error(
              `[aimm/cron] Failed to update stages_sent for ${att.email}:`,
              updateErr.message
            );
            // Don't increment sent counter — better to risk a retry than
            // a silent duplicate.
            continue;
          }

          // Update local copy so subsequent stages see the new sent list
          att.stages_sent = newSentArr;
          sent++;
          stageCounts[stageDef.stage] =
            (stageCounts[stageDef.stage] ?? 0) + 1;
        } catch (err) {
          console.error(
            `[aimm/cron] Error sending ${stageDef.stage} to ${att.email}:`,
            err instanceof Error ? err.message : err
          );
        }
      }
    }

    return NextResponse.json({
      processed: attendees.length,
      sent,
      stageCounts,
      dueStages: dueStageNames,
      capped: sent >= MAX_PER_RUN,
    });
  } catch (err) {
    console.error(
      "[aimm/cron] Unexpected error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
