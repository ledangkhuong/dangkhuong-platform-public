"use server";

/**
 * Server actions for the sale_targets table — set / update per-sale monthly
 * KPI targets used by the Admin sales-dashboard.
 *
 * Auth: admin / manager only. Uses the admin (service-role) Supabase client
 * to bypass RLS after the role check, matching the pattern used by other
 * admin actions in this codebase (e.g. src/lib/actions/crm.ts).
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/** Asia/Ho_Chi_Minh = UTC+7, no DST */
const VN_OFFSET_HOURS = 7;

function currentMonthKey(): string {
  const vn = new Date(Date.now() + VN_OFFSET_HOURS * 3600 * 1000);
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  const mm = String(m + 1).padStart(2, "0");
  return `${y}-${mm}-01`;
}

async function requireAdminOrManager() {
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

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return { userId: user.id };
}

function parseNumber(v: FormDataEntryValue | null): number {
  if (v === null) return 0;
  const s = String(v).replace(/[^\d.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

/**
 * Upsert a sale_targets row for one sale rep + month.
 *
 * Form fields (all required):
 *   - sale_user_id    : uuid
 *   - month           : YYYY-MM-DD (first-of-month) — defaults to current VN month
 *   - revenue_target  : bigint VND
 *   - orders_target   : int (optional, defaults to 0)
 */
export async function setSaleTarget(formData: FormData): Promise<void> {
  const { userId } = await requireAdminOrManager();

  const saleUserId = String(formData.get("sale_user_id") || "").trim();
  if (!saleUserId) {
    redirect("/admin/sales-dashboard?target_error=missing_sale");
  }

  const monthRaw = String(formData.get("month") || "").trim();
  const month = /^\d{4}-\d{2}-\d{2}$/.test(monthRaw) ? monthRaw : currentMonthKey();

  const revenue_target = parseNumber(formData.get("revenue_target"));
  const orders_target = parseNumber(formData.get("orders_target"));

  const admin = await createAdminClient();

  const { error } = await admin
    .from("sale_targets")
    .upsert(
      {
        sale_user_id: saleUserId,
        month,
        revenue_target,
        orders_target,
        set_by: userId,
      },
      { onConflict: "sale_user_id,month" }
    );

  if (error) {
    redirect(`/admin/sales-dashboard?target_error=${encodeURIComponent(error.code || "upsert_failed")}`);
  }

  revalidatePath("/admin/sales-dashboard");
  revalidatePath(`/admin/sales-dashboard/${saleUserId}`);
  redirect("/admin/sales-dashboard?target_saved=1");
}
