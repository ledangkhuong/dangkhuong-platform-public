"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getViewerScope } from "@/lib/viewer-scope";
import { parseContactTags, diffContactTags } from "@/lib/contact-tags";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Replace the freeform tag list on a CRM contact.
 *
 * Inputs (FormData):
 *   - contact_id: uuid of the crm_contacts row.
 *   - tags:       string — newline- or comma-separated. May be empty
 *                 (clears all tags).
 *
 * Parsing rules (in `parseContactTags`):
 *   - split on /[,\n]/, trim each piece, lowercase, drop empties
 *   - per-tag length cap (40 chars), total count cap (20)
 *   - dedupe (set semantics)
 *
 * Auth: admin/manager (canMutate) OR the sale rep assigned to this
 * contact. Same gate as `setContactStatus`.
 *
 * On success:
 *   1. UPDATE crm_contacts SET tags=..., updated_at=now()
 *   2. INSERT crm_activities (type='tags_change', is_system=true)
 *      with body "Nhãn: <added: X, Y>, <removed: Z>" (only the
 *      non-empty side rendered) and metadata { added, removed }.
 *   3. revalidate the contact detail + the list pages.
 *   4. redirect back to the contact with ?tags_updated=1.
 *
 * Errors redirect with ?error=... so the existing toast/alert pattern
 * surfaces them. The activity insert fail-softs — the column update is
 * the source of truth, the log row is best-effort.
 *
 * NOTE: pure helpers (parser, diff, limits) live in `@/lib/contact-tags`
 * because `"use server"` modules may only export async functions.
 */
export async function setContactTags(formData: FormData): Promise<void> {
  const contactId = ((formData.get("contact_id") as string) || "").trim();
  const rawTags = (formData.get("tags") as string) || "";

  if (!contactId) {
    redirect("/crm/contacts?error=missing_contact");
  }

  const nextTags = parseContactTags(rawTags);

  // ─── Auth ─────────────────────────────────────────────────────
  const scope = await getViewerScope();
  if (!scope.canView || !scope.userId) {
    redirect("/login");
  }

  const admin = await createAdminClient();

  // Load current tags + ownership for the diff and the auth check.
  const { data: existing, error: loadErr } = await admin
    .from("crm_contacts")
    .select("tags, assigned_to")
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

  // Normalise the previous list the same way we normalise the new one,
  // so diffing is consistent even if legacy rows contain stray casing
  // or whitespace.
  const prevTags = parseContactTags((existing.tags as string[] | null) ?? []);
  const { added, removed } = diffContactTags(prevTags, nextTags);

  // No-op when nothing changed — still redirect back so the form
  // resolves but skip the write + activity log.
  if (added.length === 0 && removed.length === 0) {
    redirect(`/crm/contacts/${contactId}?tags_unchanged=1`);
  }

  const now = new Date().toISOString();

  // ─── 1. Update contact tags ───────────────────────────────────
  const { error: updateErr } = await admin
    .from("crm_contacts")
    .update({
      tags: nextTags,
      updated_at: now,
    })
    .eq("id", contactId);

  if (updateErr) {
    console.error("[setContactTags] update failed:", updateErr);
    redirect(`/crm/contacts/${contactId}?error=tags_update_failed`);
  }

  // ─── 2. Log a system activity row ─────────────────────────────
  const parts: string[] = [];
  if (added.length > 0) parts.push(`thêm: ${added.join(", ")}`);
  if (removed.length > 0) parts.push(`bỏ: ${removed.join(", ")}`);
  const body = `Nhãn: ${parts.join("; ")}`;

  const { error: activityErr } = await admin.from("crm_activities").insert({
    contact_id: contactId,
    type: "tags_change",
    content: body,
    is_system: true,
    created_by: scope.userId,
    metadata: {
      added,
      removed,
    },
  });

  if (activityErr) {
    // Fail-soft: the tag update already landed — we don't want the
    // user retrying and double-applying it. Just log.
    console.error("[setContactTags] activity insert failed:", activityErr);
  }

  // ─── 3. Revalidate cached pages ───────────────────────────────
  revalidatePath(`/crm/contacts/${contactId}`);
  revalidatePath("/crm/contacts");

  redirect(`/crm/contacts/${contactId}?tags_updated=1`);
}
