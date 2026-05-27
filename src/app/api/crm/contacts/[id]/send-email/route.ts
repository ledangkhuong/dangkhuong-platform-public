import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getViewerScope } from "@/lib/viewer-scope";
import { sendEmail } from "@/lib/email/ses";
import { logAudit } from "@/lib/audit";
import { isValidUUID } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/crm/contacts/[id]/send-email
 *
 * Body:
 *   {
 *     subject: string;   // required, non-empty after trim
 *     body:    string;   // required, non-empty after trim
 *   }
 *
 * Auth:
 *   admin OR manager OR (sale AND contact.assigned_to === user.id)
 *
 * Behaviour:
 *   - Looks up the contact by id; 404 if missing, 400 if it has no email.
 *   - Wraps the user-provided body inside the brand transactional template
 *     (dark theme + gold accent — see src/lib/email/transactional.ts).
 *     Newlines become <br>; the raw text is used as the plain-text body.
 *   - Calls SES via sendEmail() using the default From address.
 *   - On success: logs the touch into crm_activities (type='email') with
 *     metadata={subject, message_id, sent_by, recipient}; bumps
 *     crm_contacts.last_contacted_at; writes an audit_logs entry; returns
 *     { ok: true, message_id }.
 *   - On SES failure: returns { error } with status 502 and does NOT
 *     insert an activity (so the timeline never shows a "phantom" email).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !isValidUUID(id)) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 }
      );
    }

    // ── Auth: load viewer scope ──────────────────────────────────────────
    const scope = await getViewerScope();
    if (!scope.canView || !scope.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdminOrManager = scope.role === "admin" || scope.role === "manager";
    const isSale = scope.isSale;
    if (!isAdminOrManager && !isSale) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Rate limit: 20 emails/hour per user ─────────────────────────────
    const rl = await rateLimit(`crm-email:${scope.userId}`, 20, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    // ── Parse body ───────────────────────────────────────────────────────
    let body: { subject?: unknown; body?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const subject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    const messageBody =
      typeof body.body === "string" ? body.body.trim() : "";
    if (!subject) {
      return NextResponse.json(
        { error: "subject is required" },
        { status: 400 }
      );
    }
    if (!messageBody) {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 }
      );
    }

    // ── Load contact ─────────────────────────────────────────────────────
    const admin = await createAdminClient();
    const { data: contact, error: contactErr } = await admin
      .from("crm_contacts")
      .select("id, email, full_name, assigned_to")
      .eq("id", id)
      .maybeSingle();

    if (contactErr) {
      console.error("[crm/contacts/send-email] contact lookup:", contactErr);
      return NextResponse.json(
        { error: "Contact lookup failed" },
        { status: 500 }
      );
    }
    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const recipient = (contact.email as string | null)?.trim() ?? "";
    if (!recipient) {
      return NextResponse.json(
        { error: "Contact has no email address" },
        { status: 400 }
      );
    }

    // ── Sale ownership check ─────────────────────────────────────────────
    // Sale reps can only email contacts assigned to them. Admin/manager bypass.
    if (!isAdminOrManager) {
      const owner = (contact.assigned_to as string | null) ?? null;
      if (owner !== scope.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // ── Build HTML (reuses the transactional template look) ─────────────
    const htmlBody = renderContactEmailHtml(messageBody);
    const textBody = messageBody;

    // ── Send via SES ────────────────────────────────────────────────────
    const result = await sendEmail(recipient, subject, htmlBody, textBody);
    if (!result.success) {
      console.error(
        "[crm/contacts/send-email] SES send failed:",
        result.error
      );
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 502 }
      );
    }

    const messageId = result.messageId ?? null;

    // ── Log to crm_activities (type='email') ────────────────────────────
    const { error: actErr } = await admin.from("crm_activities").insert({
      contact_id: id,
      type: "email",
      content: subject,
      metadata: {
        subject,
        message_id: messageId,
        sent_by: scope.userId,
        recipient,
      },
      created_by: scope.userId,
    });
    if (actErr) {
      console.error("[crm/contacts/send-email] activity insert:", actErr);
      // Don't fail the request — email already went out.
    }

    // ── Bump last_contacted_at ──────────────────────────────────────────
    const { error: updErr } = await admin
      .from("crm_contacts")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) {
      console.error(
        "[crm/contacts/send-email] last_contacted_at update:",
        updErr
      );
    }

    // ── Audit log ───────────────────────────────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await logAudit({
      admin_id: scope.userId,
      action: "email.send",
      target_type: "crm_contact",
      target_id: id,
      details: {
        subject,
        message_id: messageId,
        recipient,
      },
      ip_address: ip,
    });

    return NextResponse.json({ ok: true, message_id: messageId });
  } catch (err) {
    console.error("[crm/contacts/send-email] unhandled error:", err);
    return NextResponse.json(
      { error: "Không thể gửi email. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
}

function getSiteDomain(): string {
  try {
    return new URL(getBaseUrl()).hostname;
  } catch {
    return "dangkhuong.com";
  }
}

function getSiteName(): string {
  return process.env.EMAIL_FROM_NAME || "Lê Đăng Khương Academy";
}

/**
 * Wrap a sales rep's free-form message in the brand transactional template.
 * Mirrors `baseTemplate` in src/lib/email/transactional.ts (dark theme,
 * gold #D4A843 accent, footer) but inlined here so this route doesn't have
 * to import a private helper. Splits the body on blank lines into <p> tags
 * and converts single newlines inside each paragraph to <br>.
 */
function renderContactEmailHtml(rawBody: string): string {
  const baseUrl = getBaseUrl();
  const siteDomain = getSiteDomain();
  const siteName = getSiteName();

  const paragraphs = rawBody
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter((para) => para.length > 0)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
    .card { background:#1a1a1a; border:1px solid #2a2a2a; border-radius:12px; padding:32px; }
    .logo { display:flex; align-items:center; gap:10px; margin-bottom:28px; }
    .logo-icon { width:36px; height:36px; border-radius:8px; background:linear-gradient(135deg,#D4A843,#B8922E); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:13px; }
    .logo-text { color:#fff; font-weight:700; font-size:16px; }
    p { color:#9ca3af; font-size:14px; line-height:1.7; margin:0 0 16px; }
    .divider { height:1px; background:#2a2a2a; margin:24px 0; }
    .footer { color:#4b5563; font-size:12px; text-align:center; margin-top:24px; line-height:1.6; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <div class="logo-icon">LĐK</div>
      <div class="logo-text">${escapeHtml(siteName)}</div>
    </div>
    <div class="card">
      ${paragraphs}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} ${escapeHtml(siteName)} · <a href="${baseUrl}" style="color:#4b5563;">${siteDomain}</a>
    </div>
  </div>
</body>
</html>`;
}
