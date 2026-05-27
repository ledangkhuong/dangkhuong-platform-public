"use server";

/**
 * External-order actions — for granting course access to customers who paid
 * via channels OUTSIDE the website (Facebook, Zalo, bank transfer, cash, or
 * a previous platform).
 *
 * The resulting row in `orders` is marked with `revenue_source = 'external'`
 * so that:
 *   - dashboard KPIs split it from real platform cash (no double-counting)
 *   - lifetime_value still reflects the money the customer actually paid
 *   - the `auto_update_crm_on_paid_order` DB trigger advances journey_stage
 *     exactly like a normal paid order (paid is paid)
 *   - an explicit audit trail records the channel, date, and admin note.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getViewerScope } from "@/lib/viewer-scope";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const VALID_CHANNELS = [
  "facebook",
  "zalo",
  "bank_transfer",
  "cash",
  "other_platform",
  "other",
] as const;

type ExternalChannel = (typeof VALID_CHANNELS)[number];

/**
 * Grant a customer access to a course on the basis of a payment made
 * outside the website. Creates a `paid` order with `revenue_source =
 * 'external'`, then creates the enrollment row directly (the existing
 * paid-order pipeline lives in API routes, not a DB trigger, so we
 * replicate the access-granting step here).
 *
 * Auth: admin / manager OR the sale rep currently assigned to the contact.
 * Anyone else is bounced to /dashboard.
 *
 * Required form fields:
 *   - contact_id        uuid   crm_contacts.id
 *   - course_id         uuid   products.id (single-course in v1)
 *   - amount            number VND, original price the customer paid
 *   - external_channel  enum   facebook | zalo | bank_transfer | cash | other_platform | other
 *   - external_paid_at  date   YYYY-MM-DD — when the real payment happened
 *   - external_note     text   audit explanation (required)
 *
 * On failure we redirect back to the contact page with ?ext_error=... so
 * the modal trigger can surface it. On success we redirect with ?ext_ok=1
 * and revalidate the relevant dashboards.
 */
export async function createExternalOrder(formData: FormData) {
  // ─── 1. Auth ──────────────────────────────────────────────
  const scope = await getViewerScope();
  if (!scope.canView || !scope.userId) redirect("/login");

  const contactId = (formData.get("contact_id") as string | null)?.trim() || "";
  if (!contactId) redirect("/crm/contacts?ext_error=missing_contact");

  // We need the contact early to enforce the "sale must own this contact"
  // rule and to copy customer details into the order.
  const admin = await createAdminClient();
  const { data: contact } = await admin
    .from("crm_contacts")
    .select("id, full_name, email, phone, assigned_to, user_id")
    .eq("id", contactId)
    .maybeSingle();

  if (!contact) {
    redirect(`/crm/contacts?ext_error=contact_not_found`);
  }

  const isAdminOrManager = scope.role === "admin" || scope.role === "manager";
  const isAssignedSale =
    scope.isSale && contact.assigned_to === scope.userId;
  if (!isAdminOrManager && !isAssignedSale) {
    redirect(`/crm/contacts/${contactId}?ext_error=forbidden`);
  }

  // ─── 2. Validate form input ───────────────────────────────
  const courseId = (formData.get("course_id") as string | null)?.trim() || "";
  if (!courseId) {
    redirect(`/crm/contacts/${contactId}?ext_error=missing_course`);
  }

  const amountRaw = (formData.get("amount") as string | null)?.trim() || "";
  // Strip any thousands separators a user may have pasted ("1.500.000")
  const amountNum = Number(amountRaw.replace(/[.,\s]/g, ""));
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    redirect(`/crm/contacts/${contactId}?ext_error=invalid_amount`);
  }

  const channelRaw =
    (formData.get("external_channel") as string | null)?.trim() || "";
  if (!VALID_CHANNELS.includes(channelRaw as ExternalChannel)) {
    redirect(`/crm/contacts/${contactId}?ext_error=invalid_channel`);
  }
  const channel = channelRaw as ExternalChannel;

  const paidAtRaw =
    (formData.get("external_paid_at") as string | null)?.trim() || "";
  // HTML <input type="date"> gives us YYYY-MM-DD. Reject anything else so
  // bad rows can't slip into the audit log.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAtRaw)) {
    redirect(`/crm/contacts/${contactId}?ext_error=invalid_paid_at`);
  }
  const externalPaidAt = paidAtRaw;

  const note = (formData.get("external_note") as string | null)?.trim() || "";
  if (!note) {
    redirect(`/crm/contacts/${contactId}?ext_error=missing_note`);
  }

  // ─── 3. Look up the course ────────────────────────────────
  const { data: course } = await admin
    .from("products")
    .select("id, title")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) {
    redirect(`/crm/contacts/${contactId}?ext_error=course_not_found`);
  }

  // ─── 4. Resolve the buyer's user_id for enrollment ────────
  // The order can be inserted without a user_id (we have customer_email),
  // but the enrollment row needs one. Try contact.user_id first, then
  // profiles-by-email, then auth.users-by-email.
  let buyerUserId: string | null = (contact.user_id as string | null) ?? null;
  const emailLower = ((contact.email as string | null) ?? "")
    .toLowerCase()
    .trim();

  if (!buyerUserId && emailLower) {
    const { data: profileMatch } = await admin
      .from("profiles")
      .select("id")
      .eq("email", emailLower)
      .maybeSingle();
    if (profileMatch?.id) buyerUserId = profileMatch.id as string;
  }

  if (!buyerUserId && emailLower) {
    // Final fallback — scan auth users (same pattern as crm.ts).
    let page = 1;
    const perPage = 500;
    while (true) {
      const {
        data: { users },
      } = await admin.auth.admin.listUsers({ page, perPage });
      if (!users || users.length === 0) break;
      const match = users.find(
        (u) => u.email?.toLowerCase() === emailLower
      );
      if (match) {
        buyerUserId = match.id;
        break;
      }
      if (users.length < perPage) break;
      page++;
    }
  }

  // ─── 5. Insert the order ──────────────────────────────────
  // `created_at` stays = now() (when the admin recorded it). The real
  // payment date lives in `external_paid_at`. `paid_at` is the order's
  // canonical paid timestamp; we use `external_paid_at` (as a timestamp)
  // so it appears in historical period KPIs. The trigger that fires on
  // `status=paid` doesn't care about source — it advances journey_stage.
  const now = new Date().toISOString();
  // Promote YYYY-MM-DD to an ISO timestamp at VN noon — keeps the order
  // inside the right VN day for the paid_at-based daily revenue buckets.
  const paidAtTimestamp = `${externalPaidAt}T05:00:00.000Z`; // 05:00Z = 12:00 VN

  const orderPayload: Record<string, unknown> = {
    product_id: courseId,
    customer_email: contact.email ?? null,
    customer_name: contact.full_name ?? null,
    customer_phone: contact.phone ?? null,
    amount: Math.round(amountNum),
    status: "paid",
    paid_at: paidAtTimestamp,
    created_at: now,
    revenue_source: "external",
    external_paid_at: externalPaidAt,
    external_channel: channel,
    external_note: note,
    assigned_to: (contact.assigned_to as string | null) ?? null,
    user_id: buyerUserId,
    note: `Cấp truy cập (đã thanh toán ngoài qua ${channel} ngày ${externalPaidAt})`,
  };

  // Try to attach payment_method if the column exists. If the schema
  // doesn't have it we retry without — fail-soft.
  const tryWithPaymentMethod = await admin
    .from("orders")
    .insert({ ...orderPayload, payment_method: "external_migrated" })
    .select("id, order_code")
    .single();

  let insertedOrder = tryWithPaymentMethod.data as
    | { id: string; order_code: string | null }
    | null;
  let insertErr = tryWithPaymentMethod.error;

  if (insertErr) {
    // PostgREST returns a column-missing error code (PGRST204 / 42703) when
    // a column is unknown. Retry without payment_method.
    const errCode =
      (insertErr as { code?: string } | null)?.code?.toString() ?? "";
    const errMsg = insertErr.message ?? "";
    const looksLikeMissingColumn =
      errCode === "PGRST204" ||
      errCode === "42703" ||
      /column.*payment_method/i.test(errMsg);
    if (looksLikeMissingColumn) {
      const retry = await admin
        .from("orders")
        .insert(orderPayload)
        .select("id, order_code")
        .single();
      insertedOrder = retry.data as
        | { id: string; order_code: string | null }
        | null;
      insertErr = retry.error;
    }
  }

  if (insertErr || !insertedOrder) {
    console.error("[createExternalOrder] insert failed:", insertErr);
    redirect(`/crm/contacts/${contactId}?ext_error=insert_failed`);
  }

  // ─── 6. Auto-enroll the user ─────────────────────────────
  // The platform's regular paid-order flow creates the enrollment in the
  // API route (see /api/admin/orders/confirm and the payment webhooks),
  // not in a DB trigger. Replicate the same upsert here so external buyers
  // get immediate access.
  if (buyerUserId) {
    const { error: enrollErr } = await admin.from("enrollments").upsert(
      {
        user_id: buyerUserId,
        product_id: courseId,
        order_id: insertedOrder.id,
        source: "external",
      },
      { onConflict: "user_id,product_id", ignoreDuplicates: true }
    );
    if (enrollErr) {
      console.error("[createExternalOrder] enroll failed:", enrollErr);
      // Order was created — surface as a partial-success warning so the
      // admin knows to grant access manually if needed.
      redirect(
        `/crm/contacts/${contactId}?ext_error=enrollment_failed&order=${insertedOrder.id}`
      );
    }
  }
  // If buyerUserId is null we silently skip enrollment — the customer
  // hasn't registered on the site yet. Access will be auto-granted when
  // they sign up (an existing trigger links profiles → contacts → orders).

  // ─── 7. Log to contact activity timeline ─────────────────
  await admin.from("crm_activities").insert({
    contact_id: contactId,
    type: "note",
    content: `Cấp truy cập khóa "${course.title}" — đã thanh toán ${channel} ngày ${externalPaidAt}: ${note}`,
    created_by: scope.userId,
    is_system: true,
    metadata: {
      kind: "order_external",
      order_id: insertedOrder.id,
      channel,
      external_paid_at: externalPaidAt,
      amount: Math.round(amountNum),
    },
  });

  // ─── 8. Revalidate UI ────────────────────────────────────
  revalidatePath(`/crm/contacts/${contactId}`);
  revalidatePath("/sale/dashboard");
  revalidatePath("/admin/sales-dashboard");

  redirect(`/crm/contacts/${contactId}?ext_ok=1`);
}
