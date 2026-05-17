"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import crypto from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Tạo ref code 6 ký tự, tránh ký tự dễ nhầm (0/O, 1/I/L) */
function generateRefCode(length = 6): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// ─── Student Actions ──────────────────────────────────────────────────────────

/** Đăng ký làm affiliate */
export async function registerAsAffiliate(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check đã đăng ký chưa
  const { data: existing } = await supabase
    .from("affiliates").select("id").eq("user_id", user.id).single();
  if (existing) redirect("/dashboard/affiliate?error=already");

  // Generate unique ref code
  const admin = await createAdminClient();
  let refCode = generateRefCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: clash } = await admin.from("affiliates").select("id").eq("ref_code", refCode).single();
    if (!clash) break;
    refCode = generateRefCode();
    attempts++;
  }

  const bankName = formData.get("bank_name") as string;
  const bankAccount = formData.get("bank_account") as string;
  const bankHolder = formData.get("bank_holder") as string;

  const { error } = await admin.from("affiliates").insert({
    user_id: user.id,
    ref_code: refCode,
    status: "active",
    bank_name: bankName || null,
    bank_account: bankAccount || null,
    bank_holder: bankHolder || null,
  });

  if (error) {
    console.error("[Affiliate Register]", error);
    redirect("/dashboard/affiliate?error=failed");
  }

  redirect("/dashboard/affiliate?registered=1");
}

/** Cập nhật thông tin ngân hàng */
export async function updateAffiliateBankInfo(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("affiliates")
    .update({
      bank_name: formData.get("bank_name") as string || null,
      bank_account: formData.get("bank_account") as string || null,
      bank_holder: formData.get("bank_holder") as string || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) redirect("/dashboard/affiliate?error=update_failed");
  redirect("/dashboard/affiliate?saved=1");
}

/** Yêu cầu thanh toán hoa hồng */
export async function requestPayout() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, total_earned, total_paid, bank_name, bank_account, bank_holder")
    .eq("user_id", user.id)
    .single();

  if (!affiliate) redirect("/dashboard/affiliate?error=not_found");

  const available = (affiliate.total_earned || 0) - (affiliate.total_paid || 0);
  if (available < 200000) {
    redirect("/dashboard/affiliate?error=min_payout");
  }

  if (!affiliate.bank_account) {
    redirect("/dashboard/affiliate?error=no_bank");
  }

  const admin = await createAdminClient();
  await admin.from("affiliate_payouts").insert({
    affiliate_id: affiliate.id,
    amount: available,
    status: "pending",
    bank_name: affiliate.bank_name,
    bank_account: affiliate.bank_account,
    bank_holder: affiliate.bank_holder,
  });

  redirect("/dashboard/affiliate?payout_requested=1");
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

/** Admin duyệt conversion */
export async function approveConversion(conversionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) return;

  const admin = await createAdminClient();
  await admin.from("affiliate_conversions").update({
    status: "approved",
    approved_at: new Date().toISOString(),
  }).eq("id", conversionId);
}

/** Admin từ chối conversion */
export async function rejectConversion(conversionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) return;

  const admin = await createAdminClient();
  await admin.from("affiliate_conversions").update({
    status: "rejected",
  }).eq("id", conversionId);
}

/** Admin xử lý payout */
export async function processPayout(payoutId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) return;

  const admin = await createAdminClient();

  const { data: payout } = await admin.from("affiliate_payouts")
    .select("*, affiliates(user_id)")
    .eq("id", payoutId).single();

  if (!payout) return;

  // Mark payout as completed
  await admin.from("affiliate_payouts").update({
    status: "completed",
    processed_by: user.id,
    processed_at: new Date().toISOString(),
  }).eq("id", payoutId);

  // Update affiliate total_paid
  await admin.from("affiliates").update({
    total_paid: (payout.affiliates as unknown as { total_paid: number })?.total_paid
      ? (payout.affiliates as unknown as { total_paid: number }).total_paid + payout.amount
      : payout.amount,
    updated_at: new Date().toISOString(),
  }).eq("id", payout.affiliate_id);

  // Mark related conversions as paid
  await admin.from("affiliate_conversions").update({
    status: "paid",
    paid_at: new Date().toISOString(),
  }).eq("affiliate_id", payout.affiliate_id).eq("status", "approved");
}

/** Admin cập nhật trạng thái affiliate */
export async function updateAffiliateStatus(affiliateId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) return;

  if (!["pending", "active", "suspended", "rejected"].includes(status)) return;

  const admin = await createAdminClient();
  await admin.from("affiliates").update({
    status,
    updated_at: new Date().toISOString(),
  }).eq("id", affiliateId);
}

/** Admin cập nhật tỷ lệ hoa hồng (min 1%, max 50%, default 20%) */
export async function updateCommissionRate(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check admin/manager role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const affiliateId = formData.get("affiliate_id") as string;
  const rateStr = formData.get("commission_rate") as string;
  let rate = parseInt(rateStr, 10);

  // Enforce bounds: min 1%, max 50%
  if (isNaN(rate) || rate < 1) rate = 1;
  if (rate > 50) rate = 50;

  const admin = await createAdminClient();
  await admin.from("affiliates").update({
    commission_rate: rate,
    updated_at: new Date().toISOString(),
  }).eq("id", affiliateId);

  redirect("/admin/affiliates?updated=1");
}

/** Affiliate thay đổi mã giới thiệu */
export async function changeRefCode(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const newCode = (formData.get("new_ref_code") as string || "").trim().toUpperCase();

  // Validate: 4-20 chars, only letters + digits
  if (!newCode || newCode.length < 4 || newCode.length > 20 || !/^[A-Z0-9]+$/.test(newCode)) {
    redirect("/dashboard/affiliate?error=invalid_code");
  }

  const admin = await createAdminClient();

  // Check uniqueness
  const { data: existing } = await admin.from("affiliates").select("id").eq("ref_code", newCode).single();
  if (existing) {
    redirect("/dashboard/affiliate?error=code_taken");
  }

  // Update
  const { error } = await admin.from("affiliates")
    .update({ ref_code: newCode, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    console.error("[Change Ref Code]", error);
    redirect("/dashboard/affiliate?error=update_failed");
  }

  redirect("/dashboard/affiliate?code_changed=1");
}
