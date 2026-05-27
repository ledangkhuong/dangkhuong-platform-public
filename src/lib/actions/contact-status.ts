"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getViewerScope } from "@/lib/viewer-scope";
import {
  CONTACT_STATUS_VALUES,
  type ContactStatus,
  getContactStatusLabel,
} from "@/lib/contact-status";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Change a contact's pipeline status with an accountability note.
 *
 * Inputs (FormData):
 *   - contact_id: uuid of the crm_contacts row
 *   - new_status: one of CONTACT_STATUS_VALUES
 *   - note:       optional free-text justification.
 *                   - empty/missing  → auto-filled with the default
 *                     "Cập nhật trạng thái từ danh sách khách hàng"
 *                     so inline edits from the contacts list work
 *                     without forcing the user to type one.
 *                   - 1..4 chars     → rejected as a typo (somebody
 *                     started a real note but didn't finish). Keeps
 *                     the existing guard for the detail-page editor,
 *                     which still enforces minLength=5 client-side.
 *                   - 5+ chars       → accepted as-is.
 *
 * Auth: admin/manager OR the sale rep assigned to this contact.
 *
 * On success:
 *   1. UPDATE crm_contacts SET status=..., updated_at=now()
 *   2. INSERT into crm_activities (type='status_change', is_system=true)
 *      with body "Trạng thái: <old_label> → <new_label>. <note>"
 *   3. revalidate the contact detail page and the contacts list
 *
 * Errors redirect back to the contact page with ?error=... so the
 * existing toast/alert pattern in the dashboard surfaces them.
 *
 * NOTE: pure constants/types/labels live in `@/lib/contact-status` —
 * "use server" files cannot export non-async functions or const, so we
 * keep this module strictly to the async action.
 */
export async function setContactStatus(formData: FormData): Promise<void> {
  const contactId = (formData.get("contact_id") as string || "").trim();
  const newStatusRaw = (formData.get("new_status") as string || "").trim();
  const rawNote = (formData.get("note") as string || "").trim();

  if (!contactId) {
    redirect("/crm/contacts?error=missing_contact");
  }

  if (!(CONTACT_STATUS_VALUES as readonly string[]).includes(newStatusRaw)) {
    redirect(`/crm/contacts/${contactId}?error=invalid_status`);
  }
  const newStatus = newStatusRaw as ContactStatus;

  // Relaxed note rule: empty → default; 1..4 chars → still an error
  // (somebody typed a partial note by mistake); 5+ → accepted.
  let note: string;
  if (rawNote.length === 0) {
    note = "Cập nhật trạng thái từ danh sách khách hàng";
  } else if (rawNote.length < 5) {
    redirect(`/crm/contacts/${contactId}?error=note_required`);
  } else {
    note = rawNote;
  }

  // ─── Auth ─────────────────────────────────────────────────────
  const scope = await getViewerScope();
  if (!scope.canView || !scope.userId) {
    redirect("/login");
  }

  const admin = await createAdminClient();

  // Load current status + ownership for the auth check
  const { data: existing, error: loadErr } = await admin
    .from("crm_contacts")
    .select("status, assigned_to")
    .eq("id", contactId)
    .maybeSingle();

  if (loadErr || !existing) {
    redirect("/crm/contacts?error=contact_not_found");
  }

  // Sale reps can only mutate contacts assigned to them.
  // Admin/manager (canMutate) bypass this check.
  if (
    !scope.canMutate &&
    !(scope.isSale && existing.assigned_to === scope.userId)
  ) {
    redirect(`/crm/contacts/${contactId}?error=forbidden`);
  }

  const oldStatus = (existing.status as string | null) ?? "new";

  // No-op when nothing changed — still redirect back so the form
  // resolves but skip the write + activity log.
  if (oldStatus === newStatus) {
    redirect(`/crm/contacts/${contactId}?status_unchanged=1`);
  }

  const now = new Date().toISOString();

  // ─── 1. Update contact status ─────────────────────────────────
  const { error: updateErr } = await admin
    .from("crm_contacts")
    .update({
      status: newStatus,
      updated_at: now,
    })
    .eq("id", contactId);

  if (updateErr) {
    console.error("[setContactStatus] update failed:", updateErr);
    redirect(`/crm/contacts/${contactId}?error=status_update_failed`);
  }

  // ─── 2. Log a system activity row ─────────────────────────────
  const oldLabel = getContactStatusLabel(oldStatus);
  const newLabel = getContactStatusLabel(newStatus);
  const body = `Trạng thái: ${oldLabel} → ${newLabel}. ${note}`;

  const { error: activityErr } = await admin.from("crm_activities").insert({
    contact_id: contactId,
    type: "status_change",
    content: body,
    is_system: true,
    created_by: scope.userId,
    metadata: {
      from: oldStatus,
      to: newStatus,
    },
  });

  if (activityErr) {
    // Fail-soft: the status update already landed — we don't want
    // the user retrying and double-applying it. Just log.
    console.error("[setContactStatus] activity insert failed:", activityErr);
  }

  // ─── 3. Revalidate cached pages ───────────────────────────────
  revalidatePath(`/crm/contacts/${contactId}`);
  revalidatePath("/crm/contacts");

  redirect(`/crm/contacts/${contactId}?status_updated=1`);
}
