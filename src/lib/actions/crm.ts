"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
  const admin = await createAdminClient();

  const fullName = (formData.get("full_name") as string || "").trim();
  if (!fullName) {
    redirect("/crm/contacts?error=name_required");
  }

  const tagsRaw = (formData.get("tags") as string || "").trim();
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const { error } = await admin.from("crm_contacts").insert({
    full_name: fullName,
    email: (formData.get("email") as string || "").trim() || null,
    phone: (formData.get("phone") as string || "").trim() || null,
    company: (formData.get("company") as string || "").trim() || null,
    source: (formData.get("source") as string || "").trim() || null,
    status: (formData.get("status") as string || "new").trim(),
    tags,
    notes: (formData.get("notes") as string || "").trim() || null,
    assigned_to: (formData.get("assigned_to") as string || "").trim() || null,
    created_by: user.id,
  });

  if (error) {
    console.error("[CRM createContact]", error);
    redirect("/crm/contacts?error=create_failed");
  }

  redirect("/crm/contacts?created=1");
}

/** Cập nhật contact */
export async function updateContact(formData: FormData) {
  await requireStaff();
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

  const { error } = await admin
    .from("crm_contacts")
    .update({
      full_name: fullName,
      email: (formData.get("email") as string || "").trim() || null,
      phone: (formData.get("phone") as string || "").trim() || null,
      company: (formData.get("company") as string || "").trim() || null,
      source: (formData.get("source") as string || "").trim() || null,
      status: (formData.get("status") as string || "").trim() || null,
      tags,
      notes: (formData.get("notes") as string || "").trim() || null,
      assigned_to: (formData.get("assigned_to") as string || "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  if (error) {
    console.error("[CRM updateContact]", error);
    redirect(`/crm/contacts/${contactId}?error=update_failed`);
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

/** Thêm hoạt động cho contact */
export async function addActivity(formData: FormData) {
  const { user } = await requireStaff();
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

  const { error } = await admin.from("crm_activities").insert({
    contact_id: contactId,
    type,
    content,
    created_by: user.id,
  });

  if (error) {
    console.error("[CRM addActivity]", error);
    redirect(`/crm/contacts/${contactId}?error=activity_failed`);
  }

  // Cập nhật last_contacted_at nếu là tương tác trực tiếp
  const contactTypes = ["call", "email", "meeting"];
  if (contactTypes.includes(type)) {
    await admin
      .from("crm_contacts")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", contactId);
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
    assigned_to: (formData.get("assigned_to") as string || "").trim() || null,
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
  await requireStaff();
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

  const { error } = await admin
    .from("crm_deals")
    .update(updateData)
    .eq("id", dealId);

  if (error) {
    console.error("[CRM updateDealStage]", error);
    redirect("/crm/pipeline?error=stage_update_failed");
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
