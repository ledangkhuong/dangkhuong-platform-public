/**
 * Tiny helper for splitting paid-order revenue into the three buckets
 * established by migration 20260527_001_external_revenue_source.sql:
 *
 *   platform — money flowed through Stripe/VNPay/PayOS/Sepay (real cash-in).
 *              Legacy NULL rows are treated as platform so historical KPIs
 *              don't shift the day the column landed.
 *   external — customer paid in another channel (Facebook, Zalo, bank, cash,
 *              prior platform). We only granted access on the new platform.
 *              Status='paid' so journey_stage triggers fire, but it MUST NOT
 *              count as platform cash-in.
 *   comp     — free/gift access; zero revenue.
 *
 * Used by /admin (master Admin panel landing) and /crm (CRM & Doanh số) to
 * compute headline figures without going through the `crm_overview` /
 * `daily_revenue` views, which still SUM blindly across all paid rows.
 *
 * Mirrors the splitting convention in `src/lib/sale-kpi.ts` and the
 * `/admin/orders` page (commit 852c3e6).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type RevenueSplit = {
  platformCount: number;
  platformAmount: number;
  externalCount: number;
  externalAmount: number;
};

/**
 * Returns paid-order revenue split into platform vs external buckets, optionally
 * scoped to a paid_at window. `comp` rows are ignored entirely (no count, no
 * revenue) — they represent free access, not cash and not "external sale".
 *
 * `from` / `to` are ISO timestamps applied against `paid_at` as a half-open
 * `[from, to)` range. Omit both to scope to all-time.
 *
 * Two parallel queries (one per source bucket) — each uses `head: true` for
 * the count and pulls only `amount` for the sum, so the round-trips stay cheap.
 */
export async function getRevenueSplit(
  admin: SupabaseClient,
  from?: string,
  to?: string,
): Promise<RevenueSplit> {
  // Platform bucket: revenue_source IS NULL OR = 'platform'. NULL covers
  // legacy rows from before the migration's DEFAULT 'platform' took effect.
  let platformQuery = admin
    .from("orders")
    .select("amount", { count: "exact" })
    .eq("status", "paid")
    .or("revenue_source.is.null,revenue_source.eq.platform");

  let externalQuery = admin
    .from("orders")
    .select("amount", { count: "exact" })
    .eq("status", "paid")
    .eq("revenue_source", "external");

  if (from) {
    platformQuery = platformQuery.gte("paid_at", from);
    externalQuery = externalQuery.gte("paid_at", from);
  }
  if (to) {
    platformQuery = platformQuery.lt("paid_at", to);
    externalQuery = externalQuery.lt("paid_at", to);
  }

  const [platformRes, externalRes] = await Promise.all([
    platformQuery,
    externalQuery,
  ]);

  const platformAmount = (platformRes.data ?? []).reduce(
    (s: number, o: { amount: number | null }) => s + (o.amount ?? 0),
    0,
  );
  const externalAmount = (externalRes.data ?? []).reduce(
    (s: number, o: { amount: number | null }) => s + (o.amount ?? 0),
    0,
  );

  return {
    platformCount: platformRes.count ?? 0,
    platformAmount,
    externalCount: externalRes.count ?? 0,
    externalAmount,
  };
}
