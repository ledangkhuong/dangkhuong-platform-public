"use server";

/**
 * Direct course-grant action — for cases where the customer just needs
 * access to a course WITHOUT creating an order (gift, KOL comp, manual
 * fix for a failed external-order enrolment, etc).
 *
 * Distinct from `createExternalOrder`:
 *   - createExternalOrder: insert paid order + advance journey_stage +
 *     enrol the user. The order shows up in revenue dashboards as
 *     external (not platform cash).
 *   - createDirectEnrollment: ONLY upsert the enrollment row. Nothing
 *     in orders, no journey_stage advance, no revenue impact. Use when
 *     the audit trail isn't about money.
 *
 * Auth: admin/manager OR sale assigned to this contact.
 * Requires: the contact must have a resolvable auth.users id (either
 * crm_contacts.user_id is set, or profiles.email matches the contact's
 * email). If the customer hasn't signed up yet we refuse and tell the
 * admin to either create the user first or use the external-order flow
 * which can park the order for later linkage.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getViewerScope } from "@/lib/viewer-scope";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createDirectEnrollment(formData: FormData): Promise<void> {
  // ─── Auth ─────────────────────────────────────────────────
  const scope = await getViewerScope();
  if (!scope.canView || !scope.userId) redirect("/login");

  const contactId =
    (formData.get("contact_id") as string | null)?.trim() || "";
  if (!contactId) redirect("/crm/contacts?grant_error=missing_contact");

  const admin = await createAdminClient();
  const { data: contact } = await admin
    .from("crm_contacts")
    .select("id, full_name, email, assigned_to, user_id")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) redirect("/crm/contacts?grant_error=contact_not_found");

  const isAdminOrManager =
    scope.role === "admin" || scope.role === "manager";
  const isAssignedSale =
    scope.isSale && contact.assigned_to === scope.userId;
  if (!isAdminOrManager && !isAssignedSale) {
    redirect(`/crm/contacts/${contactId}?grant_error=forbidden`);
  }

  // ─── Validate inputs ──────────────────────────────────────
  const courseId =
    (formData.get("course_id") as string | null)?.trim() || "";
  if (!courseId) {
    redirect(`/crm/contacts/${contactId}?grant_error=missing_course`);
  }

  const note = (formData.get("note") as string | null)?.trim() || "";
  if (!note) {
    redirect(`/crm/contacts/${contactId}?grant_error=missing_note`);
  }

  // ─── Resolve buyer user_id ────────────────────────────────
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
    // Final fallback: scan auth users for an exact email match.
    let page = 1;
    const perPage = 500;
    while (true) {
      const {
        data: { users },
      } = await admin.auth.admin.listUsers({ page, perPage });
      if (!users || users.length === 0) break;
      const match = users.find((u) => u.email?.toLowerCase() === emailLower);
      if (match) {
        buyerUserId = match.id;
        break;
      }
      if (users.length < perPage) break;
      page++;
    }
  }

  if (!buyerUserId) {
    // No registered account → can't enrol. Tell the admin to use the
    // external-order flow which doesn't require an existing account.
    redirect(`/crm/contacts/${contactId}?grant_error=no_user_account`);
  }

  // ─── Verify course exists ─────────────────────────────────
  const { data: course } = await admin
    .from("products")
    .select("id, title")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) {
    redirect(`/crm/contacts/${contactId}?grant_error=course_not_found`);
  }

  // ─── Upsert enrollment ────────────────────────────────────
  const enrollPayload: Record<string, unknown> = {
    user_id: buyerUserId,
    product_id: courseId,
    source: "admin_grant",
  };
  let enrollRes = await admin
    .from("enrollments")
    .upsert(enrollPayload, {
      onConflict: "user_id,product_id",
      ignoreDuplicates: false,
    });

  // CHECK violation (23514) on `source` → retry with 'purchase', then bare.
  if (enrollRes.error) {
    const code =
      (enrollRes.error as { code?: string } | null)?.code?.toString() ?? "";
    const msg = enrollRes.error.message ?? "";
    if (
      code === "23514" ||
      code === "PGRST204" ||
      code === "42703" ||
      /source/i.test(msg)
    ) {
      const retry1 = { ...enrollPayload, source: "purchase" };
      enrollRes = await admin
        .from("enrollments")
        .upsert(retry1, {
          onConflict: "user_id,product_id",
          ignoreDuplicates: false,
        });
      if (enrollRes.error) {
        const bare = { ...enrollPayload };
        delete bare.source;
        enrollRes = await admin
          .from("enrollments")
          .upsert(bare, {
            onConflict: "user_id,product_id",
            ignoreDuplicates: false,
          });
      }
    }
  }

  if (enrollRes.error) {
    console.error(
      "[createDirectEnrollment] enroll failed:",
      enrollRes.error,
    );
    const code =
      (enrollRes.error as { code?: string } | null)?.code?.toString() ??
      "unknown";
    const msg = (enrollRes.error.message ?? "").slice(0, 200);
    redirect(
      `/crm/contacts/${contactId}?grant_error=enroll_failed&grant_code=${encodeURIComponent(code)}&grant_msg=${encodeURIComponent(msg)}`,
    );
  }

  // ─── Log activity ─────────────────────────────────────────
  await admin.from("crm_activities").insert({
    contact_id: contactId,
    type: "note",
    content: `Cấp khóa "${course.title}" trực tiếp (không tạo đơn): ${note}`,
    created_by: scope.userId,
    is_system: true,
    metadata: {
      kind: "direct_grant",
      product_id: courseId,
      product_title: course.title,
    },
  });

  // ─── Revalidate ───────────────────────────────────────────
  revalidatePath(`/crm/contacts/${contactId}`);

  redirect(`/crm/contacts/${contactId}?grant_ok=1`);
}
