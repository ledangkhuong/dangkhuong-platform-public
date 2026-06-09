/**
 * POST /api/aimakemoremoney/enroll
 *
 * Called from the AI Make More Money landing page right after the
 * customer fills in the lead form (and any payment, for VIP/VVIP).
 *
 * Idempotently inserts a row into `aimm_attendees` and immediately
 * sends the welcome email for the customer's tier. Subsequent emails
 * (D-1, T-1h, recap, complete) are sent by the cron endpoint.
 *
 * Body: { email, full_name, phone?, tier: 'free' | 'vip' | 'vvip', user_id? }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/ses";
import { welcomeEmail, type AimmTier } from "@/lib/email/templates/aimakemoremoney";

const VALID_TIERS: readonly AimmTier[] = ["free", "vip", "vvip"];

export async function POST(req: NextRequest) {
  let body: {
    email?: string;
    full_name?: string;
    phone?: string;
    tier?: string;
    user_id?: string;
    // Attribution — captured client-side from URL params + sessionStorage
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    referrer?: string;
    landing_url?: string;
    fbclid?: string;
    gclid?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.full_name?.trim();
  const phone = body.phone?.trim() || null;
  const tier = body.tier?.toLowerCase() as AimmTier | undefined;

  // Sanitise + cap UTM fields so a malicious actor can't stuff arbitrary
  // payloads. All optional; null if blank.
  const cap = (v: string | undefined, max = 255) =>
    v?.trim().slice(0, max) || null;
  const utmFields = {
    utm_source: cap(body.utm_source, 100),
    utm_medium: cap(body.utm_medium, 100),
    utm_campaign: cap(body.utm_campaign, 200),
    utm_term: cap(body.utm_term, 200),
    utm_content: cap(body.utm_content, 200),
    referrer: cap(body.referrer, 500),
    landing_url: cap(body.landing_url, 500),
    fbclid: cap(body.fbclid, 200),
    gclid: cap(body.gclid, 200),
  };

  if (!email || !name) {
    return NextResponse.json(
      { error: "email and full_name are required" },
      { status: 400 }
    );
  }
  if (!tier || !VALID_TIERS.includes(tier)) {
    return NextResponse.json(
      { error: "tier must be one of: free, vip, vvip" },
      { status: 400 }
    );
  }

  try {
    const admin = await createAdminClient();

    // ── Idempotent upsert ──
    // If the same email re-enrolls (e.g. upgrades Free → VIP), we update
    // the tier but PRESERVE stages_sent so they don't get the welcome
    // email twice. The welcome will only fire below if this is a brand-
    // new attendee row.
    const { data: existing, error: selErr } = await admin
      .from("aimm_attendees")
      .select("id, tier, stages_sent")
      .eq("email", email)
      .maybeSingle();

    if (selErr) {
      console.error("[aimm/enroll] Select error:", selErr.message);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    let isNew = false;
    let stagesAlreadySent: string[] = [];

    if (existing) {
      // Only update tier if it's an "upgrade" or matches — never downgrade
      const rank: Record<AimmTier, number> = { free: 0, vip: 1, vvip: 2 };
      const shouldUpdateTier =
        rank[tier] > rank[existing.tier as AimmTier];

      stagesAlreadySent = existing.stages_sent ?? [];

      if (shouldUpdateTier) {
        await admin
          .from("aimm_attendees")
          .update({
            tier,
            full_name: name,
            phone,
            user_id: body.user_id ?? null,
          })
          .eq("id", existing.id);
      } else {
        // Refresh name/phone but keep the existing tier
        await admin
          .from("aimm_attendees")
          .update({
            full_name: name,
            phone,
            user_id: body.user_id ?? null,
          })
          .eq("id", existing.id);
      }
    } else {
      // First-touch attribution: store UTM only on initial insert. We
      // don't overwrite on subsequent visits — the channel that first
      // brought the lead gets credit, which is the convention used by
      // the rest of the marketing dashboards.
      const { error: insErr } = await admin.from("aimm_attendees").insert({
        email,
        full_name: name,
        phone,
        tier,
        user_id: body.user_id ?? null,
        stages_sent: [],
        ...utmFields,
      });
      if (insErr) {
        console.error("[aimm/enroll] Insert error:", insErr.message);
        return NextResponse.json(
          { error: "Failed to create enrollment" },
          { status: 500 }
        );
      }
      isNew = true;
    }

    // ── Send welcome email (only if not already sent) ──
    let welcomeSent = false;
    if (isNew || !stagesAlreadySent.includes("welcome")) {
      try {
        const { subject, html } = welcomeEmail(tier, name);
        const result = await sendEmail(email, subject, html);
        if (result.success) {
          welcomeSent = true;
          await admin
            .from("aimm_attendees")
            .update({
              stages_sent: Array.from(
                new Set([...stagesAlreadySent, "welcome"])
              ),
            })
            .eq("email", email);
        } else {
          console.error(
            "[aimm/enroll] Welcome email failed:",
            result.error
          );
        }
      } catch (mailErr) {
        console.error(
          "[aimm/enroll] Welcome email exception:",
          mailErr instanceof Error ? mailErr.message : mailErr
        );
      }
    }

    return NextResponse.json({
      success: true,
      isNew,
      welcomeSent,
    });
  } catch (err) {
    console.error(
      "[aimm/enroll] Unexpected error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
