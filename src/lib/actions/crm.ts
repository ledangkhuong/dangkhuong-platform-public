"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CRM_JOURNEY_STAGES } from "@/lib/crm-constants";
import { getStickyAssignment } from "@/lib/sticky-assign";
import { rateLimit } from "@/lib/rate-limit";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Kiểm tra user có role staff không */
async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const staffRoles = ["admin", "manager", "marketing", "sale", "support"];
  if (!profile || !staffRoles.includes(profile.role)) redirect("/dashboard");

  return { user, role: profile.role };
}

// ─── Contact Actions ─────────────────────────────────────────────────────────

/** Tạo contact mới trong CRM */
export async function createContact(formData: FormData) {
  const { user } = await requireStaff();

  // Rate limit: 10 requests per minute per user
  const rl = await rateLimit(`crm-create-contact:${user.id}`, 10, 60);
  if (!rl.allowed) {
    redirect("/crm/contacts?error=rate_limited");
  }

  const admin = await createAdminClient();

  const fullName = (formData.get("full_name") as string || "").trim();
  if (!fullName) {
    redirect("/crm/contacts?error=name_required");
  }

  const tagsRaw = (formData.get("tags") as string || "").trim();
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const source = (formData.get("source") as string || "").trim() || null;
  const facebookUrl = (formData.get("facebook_url") as string || "").trim() || null;

  const email = (formData.get("email") as string || "").trim() || null;
  const phoneCheck = (formData.get("phone") as string || "").trim() || null;

  // ─── Anti double-submit guard ────────────────────────────────────
  // If THIS staff member just created a contact with the same name
  // (and same phone, when one was supplied) in the last 30 seconds,
  // treat the new submission as a duplicate and bounce back instead
  // of inserting a copy. Pairs with the disabled-while-pending submit
  // button on the form.
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
  let dupQuery = admin
    .from("crm_contacts")
    .select("id")
    .eq("full_name", fullName)
    .eq("created_by", user.id)
    .gte("created_at", thirtySecondsAgo)
    .limit(1);
  if (phoneCheck) {
    dupQuery = dupQuery.eq("phone", phoneCheck);
  }
  const { data: recentDup } = await dupQuery;
  if (recentDup && recentDup.length > 0) {
    redirect(`/crm/contacts?error=duplicate&dup=${recentDup[0].id}`);
  }

  const courseIds = (formData.getAll("course_ids") as string[]).filter(Boolean);

  const explicitAssign = (formData.get("assigned_to") as string || "").trim() || null;

  // If no explicit assignment, try sticky assignment by email so the contact
  // inherits the same sale rep as any previous orders/contacts for this customer.
  let assignedTo = explicitAssign;
  if (!assignedTo && email) {
    try {
      assignedTo = await getStickyAssignment(admin, { email });
    } catch (stickyErr) {
      console.error(
        "[CRM createContact] Sticky-assign lookup failed:",
        stickyErr instanceof Error ? stickyErr.message : stickyErr
      );
      assignedTo = null;
    }
  }

  const now = new Date().toISOString();

  const contactPayload: Record<string, unknown> = {
    full_name: fullName,
    email,
    phone: (formData.get("phone") as string || "").trim() || null,
    company: (formData.get("company") as string || "").trim() || null,
    source,
    status: "new" as const,
    tags,
    notes: (formData.get("notes") as string || "").trim() || null,
    assigned_to: assignedTo,
    facebook_url: facebookUrl,
    created_by: user.id,
  };

  // When assigned (either explicitly or via sticky), record method and timestamp
  if (assignedTo) {
    contactPayload.assigned_at = now;
    contactPayload.assignment_method = explicitAssign ? "manual" : "sticky";
  }

  const { data: newContact, error: insertErr } = await admin
    .from("crm_contacts")
    .insert(contactPayload)
    .select("id")
    .single();
  if (insertErr) {
    console.error("[CRM createContact]", insertErr);
    redirect("/crm/contacts?error=create_failed");
  }
  const contactId = newContact?.id ?? null;

  // Sync profiles.account_manager_id when a rep is assigned and contact has email
  if (assignedTo && email) {
    try {
      const { data: { users: allUsers } } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
      const matchedAuthUser = (allUsers ?? []).find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (matchedAuthUser) {
        await admin
          .from("profiles")
          .update({ account_manager_id: assignedTo })
          .eq("id", matchedAuthUser.id)
          .is("account_manager_id", null);
      }
    } catch (profileErr) {
      console.error("[CRM createContact] profiles.account_manager_id sync:", profileErr);
    }
  }

  // Save new source to crm_sources for reuse (ignore if already exists)
  if (source) {
    await admin.from("crm_sources").upsert(
      { label: source },
      { onConflict: "label", ignoreDuplicates: true }
    );
  }

  // Create course interest activities + course_interests entries
  if (courseIds.length > 0 && contactId) {
    // Fetch product titles for activity descriptions
    const { data: products } = await admin
      .from("products")
      .select("id, title")
      .in("id", courseIds);
    const productMap = new Map((products ?? []).map((p: { id: string; title: string }) => [p.id, p.title]));

    // Create activities
    const activities = courseIds
      .filter((id) => productMap.has(id))
      .map((id) => ({
        contact_id: contactId!,
        type: "note" as const,
        content: `Quan tâm khoá học: ${productMap.get(id)}`,
        created_by: user.id,
        is_system: true,
      }));
    if (activities.length > 0) {
      await admin.from("crm_activities").insert(activities);
    }

    // Try to create course_interests if contact has an auth user (by email)
    if (email) {
      try {
        const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
        const authUser = (users ?? []).find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (authUser) {
          const interests = courseIds.map((productId) => ({
            user_id: authUser.id,
            product_id: productId,
            view_count: 0,
            status: "new",
          }));
          await admin.from("course_interests").upsert(interests, {
            onConflict: "user_id,product_id",
            ignoreDuplicates: true,
          });
        }
      } catch (err) {
        console.error("[CRM createContact] course_interests lookup:", err);
      }
    }
  }

  redirect("/crm/contacts?created=1");
}

/** Cập nhật contact */
export async function updateContact(formData: FormData) {
  const { user } = await requireStaff();
  const admin = await createAdminClient();

  const contactId = formData.get("contact_id") as string;
  if (!contactId) redirect("/crm/contacts?error=missing_id");

  const fullName = (formData.get("full_name") as string || "").trim();
  if (!fullName) {
    redirect(`/crm/contacts/${contactId}?error=name_required`);
  }

  const tagsRaw = (formData.get("tags") as string || "").trim();
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const source = (formData.get("source") as string || "").trim() || null;
  const facebookUrl = (formData.get("facebook_url") as string || "").trim() || null;
  const newAssignedTo = (formData.get("assigned_to") as string || "").trim() || null;

  // Fetch current contact to detect assignment changes
  const { data: currentContact } = await admin
    .from("crm_contacts")
    .select("assigned_to, email, user_id")
    .eq("id", contactId)
    .maybeSingle();

  const previousAssignedTo = (currentContact?.assigned_to as string | null) ?? null;
  const assignmentChanged = newAssignedTo !== previousAssignedTo;

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    full_name: fullName,
    email: (formData.get("email") as string || "").trim() || null,
    phone: (formData.get("phone") as string || "").trim() || null,
    company: (formData.get("company") as string || "").trim() || null,
    source,
    status: (formData.get("status") as string || "").trim() || null,
    tags,
    notes: (formData.get("notes") as string || "").trim() || null,
    assigned_to: newAssignedTo,
    facebook_url: facebookUrl,
    updated_at: now,
  };

  // When assignment changes to a new rep, record method and timestamp
  if (assignmentChanged && newAssignedTo) {
    updateData.assigned_at = now;
    updateData.assignment_method = "manual";
  }

  const { error } = await admin
    .from("crm_contacts")
    .update(updateData)
    .eq("id", contactId);

  if (error) {
    console.error("[CRM updateContact]", error);
    redirect(`/crm/contacts/${contactId}?error=update_failed`);
  }

  // Save new source to crm_sources for reuse
  if (source) {
    await admin.from("crm_sources").upsert(
      { label: source },
      { onConflict: "label", ignoreDuplicates: true }
    );
  }

  // Cascade assignment change to related orders, interests, and deals
  // (same logic as /api/crm/contacts/[id]/assign route).
  // Skip cascade when unassigning (null) or when no actual change.
  if (assignmentChanged && newAssignedTo) {
    const email = ((currentContact?.email as string | null) ?? "").trim().toLowerCase();
    const userId = (currentContact?.user_id as string | null) ?? null;

    if (email) {
      await admin
        .from("orders")
        .update({ assigned_to: newAssignedTo })
        .ilike("customer_email", email);
    }
    if (userId) {
      await admin
        .from("course_interests")
        .update({ assigned_to: newAssignedTo })
        .eq("user_id", userId);
    }
    await admin
      .from("crm_deals")
      .update({ assigned_to: newAssignedTo })
      .eq("contact_id", contactId);

    // Sync profiles.account_manager_id (authoritative — overwrite existing)
    if (userId) {
      await admin
        .from("profiles")
        .update({ account_manager_id: newAssignedTo })
        .eq("id", userId);
    }

    // Log the assignment change
    await admin.from("crm_lead_assignment_log").insert({
      contact_id: contactId,
      assigned_to: newAssignedTo,
      assigned_by: user.id,
      method: "manual",
    });
  }

  redirect("/crm/contacts?updated=1");
}

/** Xoá contact (chỉ admin/manager) */
export async function deleteContact(formData: FormData) {
  const { role } = await requireStaff();

  if (!["admin", "manager"].includes(role)) {
    redirect("/crm/contacts?error=unauthorized");
  }

  const contactId = formData.get("contact_id") as string;
  if (!contactId) redirect("/crm/contacts?error=missing_id");

  const admin = await createAdminClient();
  const { error } = await admin
    .from("crm_contacts")
    .delete()
    .eq("id", contactId);

  if (error) {
    console.error("[CRM deleteContact]", error);
    redirect("/crm/contacts?error=delete_failed");
  }

  redirect("/crm/contacts?deleted=1");
}

// ─── Activity Actions ────────────────────────────────────────────────────────

/**
 * Thêm hoạt động cho contact — enhanced for customer-care touches.
 *
 * Required FormData fields:
 *   - contact_id: string
 *   - type:       'note' | 'call' | 'email' | 'meeting' | 'task'
 *   - content:    string (the body of the touch)
 *
 * Optional FormData fields (for richer call/follow-up logging):
 *   - outcome:           string  (meaningful only for type='call')
 *                        'reached'|'no_answer'|'busy'|'rejected'|'callback_later'|'other'
 *                        → stored in crm_activities.metadata.outcome
 *   - duration_minutes:  number  (meaningful only for type='call')
 *                        → stored in crm_activities.metadata.duration_minutes
 *   - interest_level:    'high'|'medium'|'low'
 *                        → UPDATEs crm_contacts.interest_level AND snapshots
 *                          the value in crm_activities.metadata.interest_level_at_touch
 *   - next_follow_up_at: ISO datetime string
 *                        → ALSO inserts a row into crm_next_actions
 *                          (type='follow_up', priority='medium', status='pending',
 *                          assigned_to & created_by = current user).
 *
 * Auth: any staff role. If caller is 'sale', the contact MUST be assigned
 * to them — otherwise we redirect with error=forbidden. Admin/manager bypass.
 *
 * Side-effects preserved: still bumps crm_contacts.last_contacted_at on
 * call/email/meeting.
 */
export async function addActivity(formData: FormData) {
  const { user, role } = await requireStaff();
  const admin = await createAdminClient();

  const contactId = formData.get("contact_id") as string;
  if (!contactId) redirect("/crm/contacts?error=missing_contact");

  const type = (formData.get("type") as string || "note").trim();
  const content = (formData.get("content") as string || "").trim();

  if (!content) {
    redirect(`/crm/contacts/${contactId}?error=content_required`);
  }

  const validTypes = ["note", "call", "email", "meeting", "task"];
  if (!validTypes.includes(type)) {
    redirect(`/crm/contacts/${contactId}?error=invalid_type`);
  }

  // ── Optional enhanced fields ───────────────────────────────────────────
  const outcomeRaw = (formData.get("outcome") as string || "").trim();
  const validOutcomes = [
    "reached",
    "no_answer",
    "busy",
    "rejected",
    "callback_later",
    "other",
  ];
  const outcome =
    type === "call" && outcomeRaw && validOutcomes.includes(outcomeRaw)
      ? outcomeRaw
      : null;

  const durationRaw = (formData.get("duration_minutes") as string || "").trim();
  let durationMinutes: number | null = null;
  if (type === "call" && durationRaw) {
    const parsed = Number(durationRaw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      durationMinutes = Math.round(parsed);
    }
  }

  const interestRaw = (formData.get("interest_level") as string || "").trim();
  const validInterests = ["high", "medium", "low"];
  const interestLevel = validInterests.includes(interestRaw)
    ? (interestRaw as "high" | "medium" | "low")
    : null;

  const nextFollowUpRaw = (
    formData.get("next_follow_up_at") as string || ""
  ).trim();
  // Treat empty / unparseable as "not provided" rather than erroring.
  let nextFollowUpIso: string | null = null;
  if (nextFollowUpRaw) {
    const d = new Date(nextFollowUpRaw);
    if (!isNaN(d.getTime())) {
      nextFollowUpIso = d.toISOString();
    }
  }

  // Sale can log activities on any contact (removed ownership restriction)

  // ── Build activity metadata payload ────────────────────────────────────
  const metadata: Record<string, unknown> = {};
  if (outcome) metadata.outcome = outcome;
  if (durationMinutes !== null) metadata.duration_minutes = durationMinutes;
  if (interestLevel) metadata.interest_level_at_touch = interestLevel;

  const insertPayload: Record<string, unknown> = {
    contact_id: contactId,
    type,
    content,
    created_by: user.id,
  };
  if (Object.keys(metadata).length > 0) {
    insertPayload.metadata = metadata;
  }

  const { error } = await admin.from("crm_activities").insert(insertPayload);

  if (error) {
    console.error("[CRM addActivity]", error);
    redirect(`/crm/contacts/${contactId}?error=activity_failed`);
  }

  // ── Cập nhật last_contacted_at nếu là tương tác trực tiếp + interest ──
  const contactTypes = ["call", "email", "meeting"];
  const contactUpdates: Record<string, unknown> = {};
  if (contactTypes.includes(type)) {
    contactUpdates.last_contacted_at = new Date().toISOString();
  }
  if (interestLevel) {
    contactUpdates.interest_level = interestLevel;
  }
  if (Object.keys(contactUpdates).length > 0) {
    await admin
      .from("crm_contacts")
      .update(contactUpdates)
      .eq("id", contactId);
  }

  // ── Schedule follow-up next-action if requested ────────────────────────
  if (nextFollowUpIso) {
    // Pull contact name for a useful title — fail-soft if lookup fails.
    let contactName = "khách hàng";
    try {
      const { data: c } = await admin
        .from("crm_contacts")
        .select("full_name")
        .eq("id", contactId)
        .maybeSingle();
      if (c?.full_name) contactName = c.full_name as string;
    } catch {
      /* keep default */
    }

    const { error: naErr } = await admin.from("crm_next_actions").insert({
      contact_id: contactId,
      type: "follow_up",
      title: `Theo dõi: ${contactName}`,
      description: content || null,
      priority: "medium",
      due_at: nextFollowUpIso,
      assigned_to: user.id,
      status: "pending",
      created_by: user.id,
      is_auto_generated: false,
    });
    if (naErr) {
      console.error("[CRM addActivity] next_action insert failed:", naErr);
      // Don't redirect-error — activity already saved successfully.
    }
  }

  redirect(`/crm/contacts/${contactId}?activity_added=1`);
}

// ─── Deal Actions ────────────────────────────────────────────────────────────

/** Tạo deal mới */
export async function createDeal(formData: FormData) {
  const { user } = await requireStaff();
  const admin = await createAdminClient();

  const title = (formData.get("title") as string || "").trim();
  if (!title) {
    redirect("/crm/pipeline?error=title_required");
  }

  const contactId = formData.get("contact_id") as string;
  if (!contactId) {
    redirect("/crm/pipeline?error=contact_required");
  }

  const amountStr = formData.get("amount") as string || "0";
  const amount = parseFloat(amountStr) || 0;

  const probabilityStr = formData.get("probability") as string || "50";
  let probability = parseInt(probabilityStr, 10);
  if (isNaN(probability) || probability < 0) probability = 0;
  if (probability > 100) probability = 100;

  // Honor explicit assignment from the form; otherwise fall back to the
  // sticky sale rep on the linked CRM contact. Fail-soft on lookup errors.
  let assignedTo =
    (formData.get("assigned_to") as string || "").trim() || null;
  if (!assignedTo) {
    try {
      assignedTo = await getStickyAssignment(admin, { contact_id: contactId });
    } catch (stickyErr) {
      console.error(
        "[CRM createDeal] Sticky-assign lookup failed:",
        stickyErr instanceof Error ? stickyErr.message : stickyErr
      );
      assignedTo = null;
    }
  }

  const { error } = await admin.from("crm_deals").insert({
    contact_id: contactId,
    product_id: (formData.get("product_id") as string || "").trim() || null,
    title,
    amount,
    stage: (formData.get("stage") as string || "lead").trim(),
    probability,
    expected_close_date:
      (formData.get("expected_close_date") as string || "").trim() || null,
    notes: (formData.get("notes") as string || "").trim() || null,
    assigned_to: assignedTo,
    created_by: user.id,
  });

  if (error) {
    console.error("[CRM createDeal]", error);
    redirect("/crm/pipeline?error=create_failed");
  }

  redirect("/crm/pipeline?deal_created=1");
}

/** Chuyển stage cho deal */
export async function updateDealStage(formData: FormData) {
  const { user } = await requireStaff();
  const admin = await createAdminClient();

  const dealId = formData.get("deal_id") as string;
  if (!dealId) redirect("/crm/pipeline?error=missing_deal");

  const stage = (formData.get("stage") as string || "").trim();
  if (!stage) redirect("/crm/pipeline?error=missing_stage");

  const updateData: Record<string, unknown> = {
    stage,
    updated_at: new Date().toISOString(),
  };

  if (stage === "won") {
    updateData.won_at = new Date().toISOString();
  } else if (stage === "lost") {
    updateData.lost_at = new Date().toISOString();
    updateData.lost_reason =
      (formData.get("lost_reason") as string || "").trim() || null;
  }

  // Fetch the deal BEFORE updating so we can cascade to the contact on "won".
  const { data: deal } = await admin
    .from("crm_deals")
    .select("id, contact_id, amount")
    .eq("id", dealId)
    .maybeSingle();

  const { error } = await admin
    .from("crm_deals")
    .update(updateData)
    .eq("id", dealId);

  if (error) {
    console.error("[CRM updateDealStage]", error);
    redirect("/crm/pipeline?error=stage_update_failed");
  }

  // When a deal is WON, promote the parent contact to "customer" and
  // accumulate lifetime_value. Fail-soft — pipeline update already succeeded.
  if (stage === "won" && deal?.contact_id) {
    try {
      const dealAmount = typeof deal.amount === "number" ? deal.amount : 0;

      // Fetch the current contact to read existing lifetime_value.
      const { data: contact } = await admin
        .from("crm_contacts")
        .select("id, journey_stage, lifetime_value")
        .eq("id", deal.contact_id)
        .maybeSingle();

      if (contact) {
        const currentLtv =
          typeof contact.lifetime_value === "number"
            ? contact.lifetime_value
            : 0;

        const contactUpdate: Record<string, unknown> = {
          lifetime_value: currentLtv + dealAmount,
          updated_at: new Date().toISOString(),
        };

        // Only promote journey_stage forward — never demote.
        const customerStages = ["customer", "advocate"];
        if (!customerStages.includes(contact.journey_stage ?? "")) {
          contactUpdate.journey_stage = "customer";
          contactUpdate.converted_at = new Date().toISOString();
        }

        await admin
          .from("crm_contacts")
          .update(contactUpdate)
          .eq("id", deal.contact_id);

        // Log journey change activity if the stage was promoted.
        if (contactUpdate.journey_stage) {
          await admin.from("crm_activities").insert({
            contact_id: deal.contact_id,
            type: "journey_change",
            content: `Chuyển sang giai đoạn: customer (deal "${deal.id}" won)`,
            created_by: user.id,
            is_system: true,
          });
        }
      }
    } catch (err) {
      console.error(
        "[CRM updateDealStage] won-cascade to contact failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  redirect("/crm/pipeline?stage_updated=1");
}

// ─── Import Actions ──────────────────────────────────────────────────────────

/** Import contacts từ CSV (name,email,phone mỗi dòng) */
export async function importContacts(formData: FormData) {
  const { user } = await requireStaff();
  const admin = await createAdminClient();

  const raw = (formData.get("csv_data") as string || "").trim();
  if (!raw) {
    redirect("/crm/contacts?error=empty_import");
  }

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    redirect("/crm/contacts?error=empty_import");
  }

  const contacts = [];
  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    const fullName = parts[0] || "";
    if (!fullName) continue;

    contacts.push({
      full_name: fullName,
      email: parts[1] || null,
      phone: parts[2] || null,
      source: "import",
      status: "new",
      created_by: user.id,
    });
  }

  if (contacts.length === 0) {
    redirect("/crm/contacts?error=no_valid_rows");
  }

  const { error } = await admin.from("crm_contacts").insert(contacts);

  if (error) {
    console.error("[CRM importContacts]", error);
    redirect("/crm/contacts?error=import_failed");
  }

  redirect(`/crm/contacts?imported=${contacts.length}`);
}

// ─── Assignment Actions ─────────────────────────────────────────────────────

/** Gán contact cho sales rep (thủ công) */
export async function assignContact(formData: FormData) {
  const { user, role } = await requireStaff();

  // Chỉ admin/manager mới có thể phân công khách hàng
  if (!["admin", "manager"].includes(role)) {
    redirect("/crm/contacts?error=forbidden");
  }

  const admin = await createAdminClient();

  const contactId = formData.get("contact_id") as string;
  const assignedTo = formData.get("assigned_to") as string;

  if (!contactId || !assignedTo) {
    redirect("/crm/contacts?error=missing_fields");
  }

  // Fetch contact info for cascade
  const { data: contact } = await admin
    .from("crm_contacts")
    .select("email, user_id")
    .eq("id", contactId)
    .maybeSingle();

  const now = new Date().toISOString();

  // Update contact assignment
  const { error: updateError } = await admin
    .from("crm_contacts")
    .update({
      assigned_to: assignedTo,
      assigned_at: now,
      assignment_method: "manual",
    })
    .eq("id", contactId);

  if (updateError) {
    console.error("[CRM assignContact]", updateError);
    redirect("/crm/contacts?error=assign_failed");
  }

  // Cascade to related orders, interests, and deals
  if (contact) {
    const email = ((contact.email as string | null) ?? "").trim().toLowerCase();
    const userId = (contact.user_id as string | null) ?? null;

    if (email) {
      await admin
        .from("orders")
        .update({ assigned_to: assignedTo })
        .ilike("customer_email", email);
    }
    if (userId) {
      await admin
        .from("course_interests")
        .update({ assigned_to: assignedTo })
        .eq("user_id", userId);
    }
    await admin
      .from("crm_deals")
      .update({ assigned_to: assignedTo })
      .eq("contact_id", contactId);

    // Sync profiles.account_manager_id (authoritative — overwrite existing)
    if (userId) {
      await admin
        .from("profiles")
        .update({ account_manager_id: assignedTo })
        .eq("id", userId);
    }
  }

  // Log assignment
  await admin.from("crm_lead_assignment_log").insert({
    contact_id: contactId,
    assigned_to: assignedTo,
    assigned_by: user.id,
    method: "manual",
  });

  // Log activity
  await admin.from("crm_activities").insert({
    contact_id: contactId,
    type: "assignment",
    content: `Được gán cho nhân viên sale`,
    created_by: user.id,
    is_system: true,
  });

  redirect("/crm/contacts?updated=1");
}

/** Gán nhiều contacts cho 1 rep */
export async function bulkAssignContacts(formData: FormData) {
  const { user, role } = await requireStaff();

  // Chỉ admin/manager mới có thể phân công khách hàng
  if (!["admin", "manager"].includes(role)) {
    redirect("/crm/assignments?error=forbidden");
  }

  // Rate limit: 5 requests per minute per user
  const rl = await rateLimit(`crm-bulk-assign:${user.id}`, 5, 60);
  if (!rl.allowed) {
    redirect("/crm/assignments?error=rate_limited");
  }

  const admin = await createAdminClient();

  const contactIdsRaw = (formData.get("contact_ids") as string || "").trim();
  const assignedTo = formData.get("assigned_to") as string;

  if (!contactIdsRaw || !assignedTo) {
    redirect("/crm/assignments?error=missing_fields");
  }

  const contactIds = contactIdsRaw.split(",").map((id) => id.trim()).filter(Boolean);
  const now = new Date().toISOString();
  let count = 0;

  // Fetch contact info for all contacts to cascade assignments
  const { data: contacts } = await admin
    .from("crm_contacts")
    .select("id, email, user_id")
    .in("id", contactIds);
  const contactMap = new Map(
    (contacts ?? []).map((c) => [c.id as string, c])
  );

  for (const contactId of contactIds) {
    const { error } = await admin
      .from("crm_contacts")
      .update({
        assigned_to: assignedTo,
        assigned_at: now,
        assignment_method: "manual",
      })
      .eq("id", contactId);

    if (!error) {
      // Cascade to related orders, interests, and deals
      const contact = contactMap.get(contactId);
      if (contact) {
        const email = ((contact.email as string | null) ?? "").trim().toLowerCase();
        const userId = (contact.user_id as string | null) ?? null;

        if (email) {
          await admin
            .from("orders")
            .update({ assigned_to: assignedTo })
            .ilike("customer_email", email);
        }
        if (userId) {
          await admin
            .from("course_interests")
            .update({ assigned_to: assignedTo })
            .eq("user_id", userId);
        }
        await admin
          .from("crm_deals")
          .update({ assigned_to: assignedTo })
          .eq("contact_id", contactId);

        // Sync profiles.account_manager_id (authoritative — overwrite existing)
        if (userId) {
          await admin
            .from("profiles")
            .update({ account_manager_id: assignedTo })
            .eq("id", userId);
        }
      }

      await admin.from("crm_lead_assignment_log").insert({
        contact_id: contactId,
        assigned_to: assignedTo,
        assigned_by: user.id,
        method: "manual",
      });
      count++;
    }
  }

  redirect(`/crm/assignments?assigned=${count}`);
}

/** Auto-assign leads theo round-robin */
export async function autoAssignLeads(formData: FormData) {
  const { user, role } = await requireStaff();

  // Chỉ admin/manager mới có thể phân công khách hàng
  if (!["admin", "manager"].includes(role)) {
    redirect("/crm/assignments?error=forbidden");
  }

  const admin = await createAdminClient();

  const method = (formData.get("method") as string || "round_robin").trim();

  // Fetch unassigned contacts
  const { data: unassigned } = await admin
    .from("crm_contacts")
    .select("id")
    .is("assigned_to", null)
    .order("created_at", { ascending: true });

  if (!unassigned || unassigned.length === 0) {
    redirect("/crm/assignments?error=no_unassigned");
  }

  // Fetch all sale reps
  const { data: reps } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "sale")
    .order("full_name", { ascending: true });

  if (!reps || reps.length === 0) {
    redirect("/crm/assignments?error=no_reps");
  }

  // Find last assigned rep index for round-robin continuity
  const { data: lastAssignment } = await admin
    .from("crm_lead_assignment_log")
    .select("assigned_to")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let startIndex = 0;
  if (lastAssignment) {
    const lastRepIndex = reps.findIndex((r) => r.id === lastAssignment.assigned_to);
    if (lastRepIndex >= 0) {
      startIndex = (lastRepIndex + 1) % reps.length;
    }
  }

  const now = new Date().toISOString();
  let count = 0;

  for (let i = 0; i < unassigned.length; i++) {
    const contactId = unassigned[i].id;
    const repIndex = (startIndex + i) % reps.length;
    const rep = reps[repIndex];

    const { error } = await admin
      .from("crm_contacts")
      .update({
        assigned_to: rep.id,
        assigned_at: now,
        assignment_method: "round_robin",
      })
      .eq("id", contactId);

    if (!error) {
      await admin.from("crm_lead_assignment_log").insert({
        contact_id: contactId,
        assigned_to: rep.id,
        assigned_by: user.id,
        method: "round_robin",
      });
      count++;
    }
  }

  redirect(`/crm/assignments?auto_assigned=${count}`);
}

/** Tạo rule phân bổ lead */
export async function createAssignmentRule(formData: FormData) {
  await requireStaff();
  const admin = await createAdminClient();

  const name = (formData.get("name") as string || "").trim();
  const priority = parseInt(formData.get("priority") as string || "0", 10);
  const assignTo = formData.get("assign_to") as string;
  const assignmentMethod = (formData.get("assignment_method") as string || "manual").trim();

  if (!name || !assignTo) {
    redirect("/crm/assignments?error=missing_fields");
  }

  // Build conditions from form fields
  const conditions: Record<string, string> = {};
  const source = (formData.get("conditions_source") as string || "").trim();
  const utmSource = (formData.get("conditions_utm_source") as string || "").trim();
  const utmCampaign = (formData.get("conditions_utm_campaign") as string || "").trim();

  if (source) conditions.source = source;
  if (utmSource) conditions.utm_source = utmSource;
  if (utmCampaign) conditions.utm_campaign = utmCampaign;

  const { error } = await admin.from("crm_lead_assignment_rules").insert({
    name,
    priority,
    conditions,
    assign_to: assignTo,
    assignment_method: assignmentMethod,
  });

  if (error) {
    console.error("[CRM createAssignmentRule]", error);
    redirect("/crm/assignments?error=rule_create_failed");
  }

  redirect("/crm/assignments?rule_created=1");
}

/** Toggle trạng thái active của rule */
export async function toggleRuleActive(formData: FormData) {
  await requireStaff();
  const admin = await createAdminClient();

  const ruleId = formData.get("rule_id") as string;
  const isActive = (formData.get("is_active") as string) === "true";

  if (!ruleId) {
    redirect("/crm/assignments?error=missing_rule_id");
  }

  const { error } = await admin
    .from("crm_lead_assignment_rules")
    .update({ is_active: isActive })
    .eq("id", ruleId);

  if (error) {
    console.error("[CRM toggleRuleActive]", error);
    redirect("/crm/assignments?error=rule_update_failed");
  }

  redirect("/crm/assignments?rule_updated=1");
}

// ─── Next Action Actions ────────────────────────────────────────────────────

/** Tạo next action cho contact */
export async function createNextAction(formData: FormData) {
  const { user } = await requireStaff();
  const admin = await createAdminClient();

  const contactId = formData.get("contact_id") as string;
  const type = (formData.get("type") as string || "").trim();
  const title = (formData.get("title") as string || "").trim();

  if (!contactId || !type || !title) {
    redirect("/crm/contacts?error=missing_fields");
  }

  const { error } = await admin.from("crm_next_actions").insert({
    contact_id: contactId,
    deal_id: (formData.get("deal_id") as string || "").trim() || null,
    type,
    title,
    description: (formData.get("description") as string || "").trim() || null,
    priority: (formData.get("priority") as string || "medium").trim(),
    due_at: (formData.get("due_at") as string || "").trim() || null,
    assigned_to: (formData.get("assigned_to") as string || "").trim() || null,
    created_by: user.id,
  });

  if (error) {
    console.error("[CRM createNextAction]", error);
    redirect(`/crm/contacts/${contactId}?error=action_create_failed`);
  }

  redirect(`/crm/contacts/${contactId}?action_created=1`);
}

/** Đánh dấu next action đã hoàn thành */
export async function completeNextAction(formData: FormData) {
  const { user } = await requireStaff();
  const admin = await createAdminClient();

  const actionId = formData.get("action_id") as string;
  const contactId = formData.get("contact_id") as string;

  if (!actionId || !contactId) {
    redirect("/crm/contacts?error=missing_fields");
  }

  const { error } = await admin
    .from("crm_next_actions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq("id", actionId);

  if (error) {
    console.error("[CRM completeNextAction]", error);
    redirect(`/crm/contacts/${contactId}?error=action_complete_failed`);
  }

  redirect(`/crm/contacts/${contactId}?action_completed=1`);
}

// ─── Journey Actions ────────────────────────────────────────────────────────

/** Cập nhật journey stage cho contact */
export async function updateJourneyStage(formData: FormData) {
  const { user } = await requireStaff();
  const admin = await createAdminClient();

  const contactId = formData.get("contact_id") as string;
  const journeyStage = (formData.get("journey_stage") as string || "").trim();

  if (!contactId || !journeyStage) {
    redirect("/crm/contacts?error=missing_fields");
  }

  if (!(CRM_JOURNEY_STAGES as readonly string[]).includes(journeyStage)) {
    redirect(`/crm/contacts/${contactId}?error=invalid_stage`);
  }

  const updateData: Record<string, unknown> = {
    journey_stage: journeyStage,
    updated_at: new Date().toISOString(),
  };

  if (journeyStage === "customer") {
    updateData.converted_at = new Date().toISOString();
  }

  const { error: updateError } = await admin
    .from("crm_contacts")
    .update(updateData)
    .eq("id", contactId);

  if (updateError) {
    console.error("[CRM updateJourneyStage]", updateError);
    redirect(`/crm/contacts/${contactId}?error=journey_update_failed`);
  }

  // Log journey change activity
  await admin.from("crm_activities").insert({
    contact_id: contactId,
    type: "journey_change",
    content: `Chuyển sang giai đoạn: ${journeyStage}`,
    created_by: user.id,
    is_system: true,
  });

  redirect(`/crm/contacts/${contactId}?journey_updated=1`);
}

// ─── Sync Actions ──────────────────────────────────────────────────────────

/** Đồng bộ khách hàng từ orders + profiles vào CRM (thủ công) */
export async function syncContactsFromOrders() {
  await requireStaff();
  const admin = await createAdminClient();

  // 1. Lấy tất cả email đã có trong crm_contacts (with assignment info)
  const { data: existingContacts } = await admin
    .from("crm_contacts")
    .select("id, email, assigned_to")
    .not("email", "is", null);
  const existingContactMap = new Map<
    string,
    { id: string; assigned_to: string | null }
  >();
  for (const c of existingContacts ?? []) {
    existingContactMap.set(
      (c.email as string).toLowerCase(),
      { id: c.id as string, assigned_to: c.assigned_to as string | null }
    );
  }

  // 2. Lấy tất cả khách hàng từ bảng orders (unique by email)
  //    Include assigned_to so we can propagate sale rep to new/unassigned contacts
  const { data: allOrders } = await admin
    .from("orders")
    .select(
      "customer_name, customer_email, customer_phone, status, amount, created_at, assigned_to"
    )
    .not("customer_email", "is", null)
    .order("created_at", { ascending: true });

  const orderCustomerMap = new Map<
    string,
    {
      name: string;
      email: string;
      phone: string | null;
      hasPaid: boolean;
      firstOrder: string;
      assigned_to: string | null;
    }
  >();
  for (const o of allOrders ?? []) {
    const email = (o.customer_email as string).toLowerCase();
    if (!orderCustomerMap.has(email)) {
      orderCustomerMap.set(email, {
        name: (o.customer_name as string) || email.split("@")[0],
        email,
        phone: (o.customer_phone as string) || null,
        hasPaid: o.status === "paid",
        firstOrder: o.created_at as string,
        assigned_to: (o.assigned_to as string) || null,
      });
    } else {
      const existing = orderCustomerMap.get(email)!;
      if (o.status === "paid") existing.hasPaid = true;
      // Keep the first non-null assigned_to (sticky: first sale wins)
      if (!existing.assigned_to && o.assigned_to) {
        existing.assigned_to = o.assigned_to as string;
      }
    }
  }

  // 3. Lấy tất cả profiles đã đăng ký (students)
  const { data: allProfiles } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, role, created_at")
    .not("email", "is", null);

  // 4. Merge: tạo danh sách cần insert + update unassigned existing contacts
  const toInsert: {
    full_name: string;
    email: string;
    phone: string | null;
    source: string;
    status: string;
    user_id: string | null;
    created_at: string;
    journey_stage: string;
    first_seen_at: string;
    assigned_to: string | null;
    assigned_at: string | null;
    assignment_method: string | null;
  }[] = [];

  const now = new Date().toISOString();
  let updatedCount = 0;

  // Thêm từ orders
  for (const [email, customer] of orderCustomerMap) {
    if (existingContactMap.has(email)) {
      // Contact already exists — update assigned_to if currently unassigned
      // and the order has a sale rep
      const existing = existingContactMap.get(email)!;
      if (!existing.assigned_to && customer.assigned_to) {
        const { error: upErr } = await admin
          .from("crm_contacts")
          .update({
            assigned_to: customer.assigned_to,
            assigned_at: now,
            assignment_method: "sync",
          })
          .eq("id", existing.id)
          .is("assigned_to", null); // guard against race
        if (!upErr) updatedCount++;
      }
      continue;
    }
    existingContactMap.set(email, { id: "", assigned_to: customer.assigned_to });
    toInsert.push({
      full_name: customer.name,
      email: customer.email,
      phone: customer.phone,
      source: "website",
      status: customer.hasPaid ? "won" : "new",
      user_id: null,
      created_at: customer.firstOrder,
      journey_stage: customer.hasPaid ? "customer" : "lead",
      first_seen_at: customer.firstOrder,
      assigned_to: customer.assigned_to,
      assigned_at: customer.assigned_to ? now : null,
      assignment_method: customer.assigned_to ? "sync" : null,
    });
  }

  // Thêm từ profiles (chưa có trong orders)
  for (const p of allProfiles ?? []) {
    const email = (p.email as string).toLowerCase();
    if (existingContactMap.has(email)) continue;
    if (
      ["admin", "manager", "marketing", "sale", "support"].includes(p.role)
    )
      continue;
    existingContactMap.set(email, { id: "", assigned_to: null });
    toInsert.push({
      full_name: p.full_name || email.split("@")[0],
      email,
      phone: (p.phone as string) || null,
      source: "website",
      status: "new",
      user_id: p.id,
      created_at: p.created_at as string,
      journey_stage: "lead",
      first_seen_at: p.created_at as string,
      assigned_to: null,
      assigned_at: null,
      assignment_method: null,
    });
  }

  // 5. Bulk insert (nếu có)
  if (toInsert.length > 0) {
    await admin.from("crm_contacts").insert(toInsert);
  }

  // 6. Sync profiles.account_manager_id for users whose orders have an assigned sale
  //    Only update profiles that don't already have an account_manager_id (fail-soft).
  try {
    // Build email→profile_id map from the already-fetched allProfiles
    const profileByEmail = new Map<string, string>();
    for (const p of allProfiles ?? []) {
      if (p.email && !["admin", "manager", "marketing", "sale", "support"].includes(p.role)) {
        profileByEmail.set((p.email as string).toLowerCase(), p.id as string);
      }
    }

    // Collect profile IDs that need account_manager_id set, grouped by assigned_to
    const updatesByManager = new Map<string, string[]>();
    for (const [email, customer] of orderCustomerMap) {
      if (!customer.assigned_to) continue;
      const profileId = profileByEmail.get(email);
      if (!profileId) continue;
      const list = updatesByManager.get(customer.assigned_to) ?? [];
      list.push(profileId);
      updatesByManager.set(customer.assigned_to, list);
    }

    // Issue one update per account_manager, only touching profiles with NULL account_manager_id
    for (const [managerId, profileIds] of updatesByManager) {
      await admin
        .from("profiles")
        .update({ account_manager_id: managerId })
        .in("id", profileIds)
        .is("account_manager_id", null);
    }
  } catch (err) {
    // Fail-soft: log but don't block the sync
    console.error("[syncContactsFromOrders] profiles.account_manager_id sync:", err);
  }

  redirect(`/crm/contacts?synced=${toInsert.length}&updated=${updatedCount}`);
}
