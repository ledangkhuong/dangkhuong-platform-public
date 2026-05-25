/**
 * Sales-assignment helpers + API contract for Agents B & C.
 *
 * API CONTRACT
 * ────────────────────────────────────────────────────────────────
 * POST  /api/admin/orders/[id]/assign
 *   body:    { assigned_to: string | null }   // null = unassign
 *   200:     { ok: true, assigned_to: string | null }
 *   4xx/5xx: { error: string }
 *
 * POST  /api/crm/contacts/[id]/assign
 *   body:    { assigned_to: string | null }   // null = unassign
 *   200:     { ok: true, assigned_to: string | null }
 *   4xx/5xx: { error: string }
 *
 * PATCH /api/crm/interests                    (existing route — do not duplicate)
 *   body:    { interest_id, assigned_to, ... }
 *   200:     { ok: true }
 *
 * Auth on all three: caller must be a profile whose role is in
 * ['admin','manager']. Target `assigned_to` (when not null) must be a
 * profile whose role is in ['admin','manager','sale'].
 *
 * NOTE on the role string: it is 'sale' (SINGULAR), not 'sales'.
 * See profiles.role CHECK in supabase/schema.sql.
 * ────────────────────────────────────────────────────────────────
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type SalesUser = {
  id: string;
  full_name: string | null;
  role: string;
};

/**
 * Fetch profiles eligible to be assigned to orders / contacts / interests.
 * Caller passes whichever Supabase client is appropriate for the context
 * (createClient for RSCs, createAdminClient for server actions / routes
 * that bypass RLS).
 */
export async function getSalesUsers(
  supabase: SupabaseClient
): Promise<SalesUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["admin", "manager", "sale"])
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[getSalesUsers]", error);
    return [];
  }

  return (data ?? []) as SalesUser[];
}

/** Roles allowed as an `assigned_to` target. Single source of truth. */
export const ASSIGNABLE_ROLES: readonly string[] = ["admin", "manager", "sale"];
