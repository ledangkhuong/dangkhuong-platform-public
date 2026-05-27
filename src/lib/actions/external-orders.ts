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
import { randomBytes } from "crypto";

/**
 * Generate a DK-prefixed order code identical in shape to the one the
 * real checkout uses in `/api/orders/create`. `orders.order_code` is
 * NOT NULL with a unique constraint, so we must provide it or the
 * insert blows up — that was the root cause of the first failed
 * "Cấp khóa (đã thanh toán ngoài)" submission.
 */
function generateOrderCode(prefix = "DK", length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const maxValid = 256 - (256 % chars.length);
  let result = prefix;
  while (result.length < prefix.length + length) {
    const bytes = randomBytes(length - (result.length - prefix.length));
    for (const byte of bytes) {
      if (byte < maxValid && result.length < prefix.length + length) {
        result += chars[byte % chars.length];
      }
    }
  }
  return result;
}

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
  // Mirror what `/api/orders/create` does — that's the source-of-truth
  // for the orders schema. Key NOT NULL columns we MUST send:
  //   - order_code (cryptographic, unique)
  //   - user_id    (FK to auth.users — fall back to the staff recording
  //                 the order if the buyer hasn't registered yet)
  //   - product_id, amount, status, payment_method,
  //     customer_name, customer_email, customer_phone
  //
  // We DO NOT pass `created_at` (DB default) or `updated_at` (trigger).
  // `paid_at` we still set so the order lands in the right VN-day
  // bucket; if the column is missing in some envs the retry below
  // strips it.
  // Promote YYYY-MM-DD to an ISO timestamp at VN noon.
  const paidAtTimestamp = `${externalPaidAt}T05:00:00.000Z`;

  // Buyer fallback: if we couldn't resolve the customer's auth.users id
  // (they've paid externally but never signed up on the site), reuse
  // the staff member's user id so the FK + NOT NULL hold. Enrolment
  // below is still gated on a real `buyerUserId`, so we'll skip
  // granting course access until the customer signs up — the existing
  // contact↔user-id trigger will reconcile on signup.
  const orderUserId = buyerUserId ?? scope.userId;

  // Defensive: re-generate order_code one more time right before INSERT
  // and assert non-empty. If the first call ever returned "" (shouldn't,
  // but the bug we're chasing presents as a NULL order_code at INSERT
  // time), we want to fail loudly with a diagnostic redirect rather than
  // let Postgres reject it with 23502.
  const orderCode = generateOrderCode();
  if (!orderCode || typeof orderCode !== "string" || orderCode.length < 4) {
    console.error(
      "[createExternalOrder] generateOrderCode returned invalid:",
      JSON.stringify({ orderCode, type: typeof orderCode })
    );
    redirect(
      `/crm/contacts/${contactId}?ext_error=insert_failed&ext_code=GEN&ext_msg=${encodeURIComponent("generateOrderCode failed — unable to create order_code")}`
    );
  }

  const orderPayload: Record<string, unknown> = {
    order_code: orderCode,
    user_id: orderUserId,
    product_id: courseId,
    customer_email: contact.email ?? null,
    customer_name: contact.full_name ?? null,
    customer_phone: contact.phone ?? null,
    amount: Math.round(amountNum),
    status: "paid",
    payment_method: "external_migrated",
    paid_at: paidAtTimestamp,
    revenue_source: "external",
    external_paid_at: externalPaidAt,
    external_channel: channel,
    external_note: note,
    assigned_to: (contact.assigned_to as string | null) ?? null,
    note: `Cấp truy cập (đã thanh toán ngoài qua ${channel} ngày ${externalPaidAt})`,
  };

  // Log the keys we're about to insert so prod logs show conclusively
  // whether order_code is in the payload at INSERT time. Helps us bisect
  // build-cache vs trigger vs PostgREST issues without another deploy.
  console.error(
    "[createExternalOrder] inserting order with keys:",
    Object.keys(orderPayload).sort().join(","),
    "order_code length:",
    orderCode.length
  );

  // Try the full payload first.
  let attempt = await admin
    .from("orders")
    .insert(orderPayload)
    .select("id, order_code")
    .single();

  let insertedOrder = attempt.data as
    | { id: string; order_code: string | null }
    | null;
  let insertErr = attempt.error;

  // If a specific column is unknown in this env (PGRST204 / 42703 /
  // "column ... does not exist"), strip the suspect optional columns
  // one at a time and retry. We try in order of most-likely-missing.
  const OPTIONAL_COLUMNS = [
    "paid_at",
    "payment_method",
    "note",
    "external_paid_at",
    "external_channel",
    "external_note",
    "revenue_source",
  ] as const;

  for (const col of OPTIONAL_COLUMNS) {
    if (!insertErr) break;
    const errCode =
      (insertErr as { code?: string } | null)?.code?.toString() ?? "";
    const errMsg = insertErr.message ?? "";
    const looksLikeMissing =
      errCode === "PGRST204" ||
      errCode === "42703" ||
      new RegExp(`column.*${col}`, "i").test(errMsg);
    if (!looksLikeMissing) break;
    // Drop this column from the payload and retry.
    const slim: Record<string, unknown> = { ...orderPayload };
    delete slim[col];
    Object.assign(orderPayload, slim);
    const retry = await admin
      .from("orders")
      .insert(slim)
      .select("id, order_code")
      .single();
    insertedOrder = retry.data as
      | { id: string; order_code: string | null }
      | null;
    insertErr = retry.error;
  }

  if (insertErr || !insertedOrder) {
    console.error("[createExternalOrder] insert failed:", insertErr);
    // Surface the actual error code + message in the redirect so the UI
    // can show why the insert blew up (column missing, NOT NULL, RLS,
    // FK violation...). Without this we lose visibility on prod.
    const errCode =
      (insertErr as { code?: string } | null)?.code?.toString() ?? "unknown";
    const errMsg = (insertErr?.message ?? "").slice(0, 200);
    redirect(
      `/crm/contacts/${contactId}?ext_error=insert_failed&ext_code=${encodeURIComponent(errCode)}&ext_msg=${encodeURIComponent(errMsg)}`
    );
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
