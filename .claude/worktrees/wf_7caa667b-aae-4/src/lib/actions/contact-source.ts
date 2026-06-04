"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getViewerScope } from "@/lib/viewer-scope";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Change a contact's `source` value from the contacts list (inline
 * editor) or from anywhere else that posts the same FormData shape.
 *
 * Inputs (FormData):
 *   - contact_id: uuid of the crm_contacts row
 *   - source:     free-text source label. Empty/whitespace → stored
 *                 as NULL (clears the source).
 *
 * Auth: admin/manager OR the sale rep assigned to this contact.
 *   The client-side `canEdit` flag is just a UX gate — every write
 *   re-checks ownership here against the trusted session.
 *
 * On success:
 *   1. UPDATE crm_contacts SET source=..., updated_at=now()
 *   2. INSERT into crm_activities (type='source_change', is_system=true)
 *      with body "Nguồn: <old> → <new>" and metadata { from, to }
 *   3. revalidate the contact detail page and the contacts list
 *
 * No-op short-circuit: if the normalized old/new values match (both
 * including the null case), we skip the write and redirect with
 * ?source_unchanged=1 so the form resolves without a noisy log row.
 *
 * NOTE: this file is `"use server"` — Next.js 16 + Turbopack only
 * accepts async function exports here. Any helpers/constants must
 * live in a non-`"use server"` module.
 */
export async function setContactSource(formData: FormData): Promise<void> {
  const contactId = (formData.get("contact_id") as string || "").trim();
  const rawSource = (formData.get("source") as string || "").trim();
  // Empty string → null (clears the source). Otherwise store the
  // trimmed text as-is — the schema is free-text + datalist suggestions.
  const newSource: string | null = rawSource.length === 0 ? null : rawSource;

  if (!contactId) {
    redirect("/crm/contacts?error=missing_contact");
  }

  // ─── Auth ─────────────────────────────────────────────────────
  const scope = await getViewerScope();
  if (!scope.canView || !scope.userId) {
    redirect("/login");
  }

  const admin = await createAdminClient();

  // Load current source + ownership for the auth check
  const { data: existing, error: loadErr } = await admin
    .from("crm_contacts")
    .select("source, assigned_to")
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

  const oldSourceRaw = existing.source as string | null;
  const oldSource: string | null =
    oldSourceRaw && oldSourceRaw.trim().length > 0 ? oldSourceRaw : null;

  // No-op when nothing changed — still redirect so the form resolves
  // but skip the write + activity log.
  if (oldSource === newSource) {
    redirect(`/crm/contacts/${contactId}?source_unchanged=1`);
  }

  const now = new Date().toISOString();

  // ─── 1. Update contact source ─────────────────────────────────
  const { error: updateErr } = await admin
    .from("crm_contacts")
    .update({
      source: newSource,
      updated_at: now,
    })
    .eq("id", contactId);

  if (updateErr) {
    console.error("[setContactSource] update failed:", updateErr);
    redirect(`/crm/contacts/${contactId}?error=source_update_failed`);
  }

  // ─── 2. Log a system activity row ─────────────────────────────
  const fromLabel = oldSource ?? "(trống)";
  const toLabel = newSource ?? "(trống)";
  const body = `Nguồn: ${fromLabel} → ${toLabel}`;

  const { error: activityErr } = await admin.from("crm_activities").insert({
    contact_id: contactId,
    type: "source_change",
    content: body,
    is_system: true,
    created_by: scope.userId,
    metadata: {
      from: oldSource,
      to: newSource,
    },
  });

  if (activityErr) {
    // Fail-soft: the source update already landed — don't make the
    // user retry and double-apply it. Just log.
    console.error("[setContactSource] activity insert failed:", activityErr);
  }

  // ─── 3. Revalidate cached pages ───────────────────────────────
  revalidatePath(`/crm/contacts/${contactId}`);
  revalidatePath("/crm/contacts");

  redirect(`/crm/contacts/${contactId}?source_updated=1`);
}
