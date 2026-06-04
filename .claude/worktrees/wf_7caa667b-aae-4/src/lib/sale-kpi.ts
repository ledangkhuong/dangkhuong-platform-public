/**
 * Sales-performance KPI helpers used by the Sale Dashboard (/sale/dashboard)
 * and the Admin sales-dashboard (/admin/sales-dashboard).
 *
 * Every helper accepts `saleId` — null means "team / all sales" (admin view),
 * a uuid means "scope to this one sale rep" (sale view, or admin drill-down).
 *
 * Period boundaries are computed in Asia/Ho_Chi_Minh (UTC+7) — never UTC —
 * so a "today" KPI matches what a Vietnamese sale rep sees on their wall.
 *
 * Uses the admin (service-role) Supabase client to bypass RLS — callers are
 * expected to gate access with `getViewerScope()` BEFORE calling these.
 */
import { createAdminClient } from "@/lib/supabase/server";

// ────────────────────────────────────────────────────────────
// Public types
// ────────────────────────────────────────────────────────────

export type SalePeriod = "today" | "mtd" | "last_month" | "this_week";

export type SaleKPI = {
  sale_user_id: string | null; // null = whole team
  full_name: string | null;
  period: SalePeriod;
  /**
   * Headline revenue = revenue_platform. Cash that actually flowed through
   * the website (Stripe/VNPay/PayOS/Sepay). Existing UI keeps using this.
   */
  revenue: number;
  /**
   * Cash that flowed through the web (revenue_source = 'platform' or
   * legacy NULL rows from before the migration). Mirrors `revenue`.
   */
  revenue_platform: number;
  /**
   * Revenue from customers who paid in another channel (Facebook, Zalo,
   * bank transfer, cash, prior platform) and were granted access here.
   * Tracked for LTV and audit — does NOT count toward platform cash KPIs.
   */
  revenue_external: number;
  revenue_target: number | null;
  revenue_pct: number | null; // 0-100, null if no target
  /**
   * Per-day slice of the monthly target — current month's `revenue_target`
   * divided by the number of days in the current VN month. Only populated
   * when `period === 'today'`; null for every other period.
   */
  daily_revenue_target: number | null;
  /** revenue / daily_revenue_target × 100, when both are available. */
  daily_pct: number | null;
  orders_paid: number;
  orders_pending: number;
  pending_value: number; // total amount pending
  contacts_total: number;
  contacts_new_this_period: number;
  avg_order_value: number;
  conversion_rate: number; // % lead→contacted+
  retention_rate: number; // % buyers who bought 2+
  prev_period_revenue: number; // for vs-comparison
};

export type ActionQueueItem = {
  kind:
    | "overdue_followup"
    | "today_followup"
    | "pending_order_chase"
    | "new_lead";
  id: string; // contact id or order id depending on kind
  contact_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  journey_stage: string | null;
  amount: number | null; // for pending orders
  due_at: string | null; // ISO
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
};

export type FunnelData = {
  lead: number;
  contacted: number;
  qualified: number;
  negotiation: number;
  customer: number;
  advocate: number;
};

export type StrategyTip = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  cta_label: string | null;
  cta_href: string | null;
  affected_count: number | null;
};

// ────────────────────────────────────────────────────────────
// Internal: Asia/Ho_Chi_Minh period boundaries
// ────────────────────────────────────────────────────────────

const VN_OFFSET_HOURS = 7; // Asia/Ho_Chi_Minh = UTC+7, no DST

/**
 * Returns a Date that, when read in UTC, corresponds to the given moment
 * in Asia/Ho_Chi_Minh. We do this by shifting epoch-ms by ±7h. This is the
 * pattern used throughout the codebase since VN has no DST.
 */
function vnNow(): Date {
  return new Date(Date.now() + VN_OFFSET_HOURS * 3600 * 1000);
}

/**
 * Convert a "VN wall-clock" Date (i.e. UTC fields read as VN time) back to
 * an actual UTC instant for use in Postgres timestamptz queries.
 */
function vnToUtc(d: Date): Date {
  return new Date(d.getTime() - VN_OFFSET_HOURS * 3600 * 1000);
}

type Range = { start: Date; end: Date };

function getPeriodRange(period: SalePeriod): Range {
  const vn = vnNow();
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  const d = vn.getUTCDate();

  if (period === "today") {
    const startVn = new Date(Date.UTC(y, m, d, 0, 0, 0));
    const endVn = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));
    return { start: vnToUtc(startVn), end: vnToUtc(endVn) };
  }

  if (period === "mtd") {
    const startVn = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const endVn = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
    return { start: vnToUtc(startVn), end: vnToUtc(endVn) };
  }

  if (period === "last_month") {
    const startVn = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const endVn = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    return { start: vnToUtc(startVn), end: vnToUtc(endVn) };
  }

  // this_week — Monday-anchored
  // getUTCDay: 0=Sun..6=Sat → shift so Monday=0
  const dow = vn.getUTCDay();
  const offsetToMonday = (dow + 6) % 7; // Mon→0, Sun→6
  const startVn = new Date(Date.UTC(y, m, d - offsetToMonday, 0, 0, 0));
  const endVn = new Date(Date.UTC(y, m, d - offsetToMonday + 7, 0, 0, 0));
  return { start: vnToUtc(startVn), end: vnToUtc(endVn) };
}

/**
 * Range of the period immediately preceding `period` — used for the
 * "vs previous" comparison badge. Same length as the current period.
 */
function getPrevPeriodRange(period: SalePeriod): Range {
  const cur = getPeriodRange(period);
  const len = cur.end.getTime() - cur.start.getTime();
  return {
    start: new Date(cur.start.getTime() - len),
    end: new Date(cur.start.getTime()),
  };
}

/**
 * First-of-month date (UTC) corresponding to `today` in VN time — used as
 * the lookup key into the sale_targets table.
 */
function currentMonthKey(): string {
  const vn = vnNow();
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  const mm = String(m + 1).padStart(2, "0");
  return `${y}-${mm}-01`;
}

/**
 * Number of days in the current VN month (28..31). Used to derive the
 * `daily_revenue_target` from the monthly target.
 */
function daysInCurrentVnMonth(): number {
  const vn = vnNow();
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  // Day 0 of the next month = last day of this month
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

// ────────────────────────────────────────────────────────────
// Helper: small safe-numeric coercion
// ────────────────────────────────────────────────────────────

function n(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }
  return 0;
}

function pct(numer: number, denom: number): number {
  if (!denom) return 0;
  return Math.round((numer / denom) * 10000) / 100;
}

// ────────────────────────────────────────────────────────────
// 1. getSaleKPI — full KPI snapshot for one sale or the team
// ────────────────────────────────────────────────────────────

export async function getSaleKPI(opts: {
  saleId: string | null;
  period: SalePeriod;
}): Promise<SaleKPI> {
  const { saleId, period } = opts;
  const supabase = await createAdminClient();

  const range = getPeriodRange(period);
  const prevRange = getPrevPeriodRange(period);

  // Profile name (when scoped to one sale)
  let fullName: string | null = null;
  if (saleId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", saleId)
      .maybeSingle();
    fullName = (prof?.full_name as string | null) ?? null;
  }

  // ─── Paid orders inside period ────────────────────────────
  // Pull revenue_source so we can split platform vs external. NULL / missing
  // value (e.g. rows created before the 20260527 migration) is treated as
  // 'platform' so the historical KPI doesn't shift the day the column lands.
  // 'comp' rows are paid but represent zero cash — excluded from revenue
  // entirely while still counted toward orders_paid (a conversion is a win).
  let paidQ = supabase
    .from("orders")
    .select("id, amount, paid_at, created_at, revenue_source", {
      count: "exact",
    })
    .eq("status", "paid")
    .gte("paid_at", range.start.toISOString())
    .lt("paid_at", range.end.toISOString());
  if (saleId) paidQ = paidQ.eq("assigned_to", saleId);
  const { data: paidOrders, count: paidCount } = await paidQ;

  let revenue_platform = 0;
  let revenue_external = 0;
  for (const o of paidOrders ?? []) {
    const row = o as { amount: unknown; revenue_source?: string | null };
    const amt = n(row.amount);
    const src = row.revenue_source ?? "platform";
    if (src === "external") revenue_external += amt;
    else if (src === "comp") {
      /* comp = free, contributes nothing to revenue */
    } else revenue_platform += amt;
  }
  const revenue = revenue_platform; // headline KPI = real cash
  const orders_paid = paidCount ?? (paidOrders?.length ?? 0);
  // AOV uses platform-cash only — including external would distort the
  // "average money the website is collecting" metric the sale rep watches.
  const avg_order_value = orders_paid > 0 ? Math.round(revenue / orders_paid) : 0;

  // ─── Pending orders (all-time pending, not period-bound) ──
  let pendingQ = supabase
    .from("orders")
    .select("id, amount", { count: "exact" })
    .eq("status", "pending");
  if (saleId) pendingQ = pendingQ.eq("assigned_to", saleId);
  const { data: pendingOrders, count: pendingCount } = await pendingQ;

  let pending_value = 0;
  for (const o of pendingOrders ?? [])
    pending_value += n((o as { amount: unknown }).amount);
  const orders_pending = pendingCount ?? (pendingOrders?.length ?? 0);

  // ─── Previous period revenue ──────────────────────────────
  // Compare like-for-like with current `revenue` (= platform cash), so the
  // delta badge isn't muddied by external migrations. External orders are
  // excluded here for the same reason.
  let prevQ = supabase
    .from("orders")
    .select("amount, revenue_source")
    .eq("status", "paid")
    .gte("paid_at", prevRange.start.toISOString())
    .lt("paid_at", prevRange.end.toISOString());
  if (saleId) prevQ = prevQ.eq("assigned_to", saleId);
  const { data: prevOrders } = await prevQ;
  let prev_period_revenue = 0;
  for (const o of prevOrders ?? []) {
    const row = o as { amount: unknown; revenue_source?: string | null };
    const src = row.revenue_source ?? "platform";
    if (src === "platform") prev_period_revenue += n(row.amount);
  }

  // ─── Contacts ─────────────────────────────────────────────
  let cTotalQ = supabase
    .from("crm_contacts")
    .select("id, journey_stage, total_orders, created_at", { count: "exact" });
  if (saleId) cTotalQ = cTotalQ.eq("assigned_to", saleId);
  const { data: contacts, count: contactsCount } = await cTotalQ;
  const contacts_total = contactsCount ?? (contacts?.length ?? 0);

  let contacts_new_this_period = 0;
  let beyondLead = 0; // contacts at stage >= contacted
  let buyers = 0; // total_orders >= 1
  let repeatBuyers = 0; // total_orders >= 2
  const rangeStartMs = range.start.getTime();
  const rangeEndMs = range.end.getTime();
  for (const row of contacts ?? []) {
    const r = row as {
      journey_stage?: string | null;
      total_orders?: number | null;
      created_at?: string | null;
    };
    if (r.created_at) {
      const t = new Date(r.created_at).getTime();
      if (t >= rangeStartMs && t < rangeEndMs) contacts_new_this_period += 1;
    }
    const stage = (r.journey_stage ?? "lead") as string;
    if (stage !== "lead" && stage !== "visitor") beyondLead += 1;
    const totalOrders = n(r.total_orders);
    if (totalOrders >= 1) buyers += 1;
    if (totalOrders >= 2) repeatBuyers += 1;
  }
  const conversion_rate = pct(beyondLead, contacts_total);
  const retention_rate = pct(repeatBuyers, buyers);

  // ─── Revenue target (current month only) ──────────────────
  let revenue_target: number | null = null;
  if (saleId) {
    const { data: tgt } = await supabase
      .from("sale_targets")
      .select("revenue_target")
      .eq("sale_user_id", saleId)
      .eq("month", currentMonthKey())
      .maybeSingle();
    revenue_target = tgt ? n((tgt as { revenue_target: unknown }).revenue_target) : null;
  } else {
    // Team total = sum of all sale targets for current month
    const { data: tgts } = await supabase
      .from("sale_targets")
      .select("revenue_target")
      .eq("month", currentMonthKey());
    if (tgts && tgts.length > 0) {
      revenue_target = 0;
      for (const t of tgts)
        revenue_target += n((t as { revenue_target: unknown }).revenue_target);
    }
  }
  const revenue_pct =
    revenue_target && revenue_target > 0
      ? Math.round((revenue / revenue_target) * 10000) / 100
      : null;

  // ─── Daily revenue target (today only) ────────────────────
  // The monthly target sliced evenly across VN days in the current month.
  // Team-mode already summed all sale_targets for the month above, so we
  // can just divide either branch here.
  let daily_revenue_target: number | null = null;
  let daily_pct: number | null = null;
  if (period === "today" && revenue_target !== null && revenue_target > 0) {
    const days = daysInCurrentVnMonth();
    daily_revenue_target = Math.round(revenue_target / days);
    if (daily_revenue_target > 0) {
      daily_pct =
        Math.round((revenue / daily_revenue_target) * 10000) / 100;
    }
  }

  return {
    sale_user_id: saleId,
    full_name: fullName,
    period,
    revenue,
    revenue_platform,
    revenue_external,
    revenue_target,
    revenue_pct,
    daily_revenue_target,
    daily_pct,
    orders_paid,
    orders_pending,
    pending_value,
    contacts_total,
    contacts_new_this_period,
    avg_order_value,
    conversion_rate,
    retention_rate,
    prev_period_revenue,
  };
}

// ────────────────────────────────────────────────────────────
// 2. getActionQueue — overdue + today follow-ups + pending chases + new leads
// ────────────────────────────────────────────────────────────

const DEFAULT_KINDS: ActionQueueItem["kind"][] = [
  "overdue_followup",
  "today_followup",
  "pending_order_chase",
  "new_lead",
];

export async function getActionQueue(opts: {
  saleId: string | null;
  kinds?: Array<ActionQueueItem["kind"]>;
  limit?: number;
}): Promise<ActionQueueItem[]> {
  const { saleId } = opts;
  const kinds = opts.kinds && opts.kinds.length > 0 ? opts.kinds : DEFAULT_KINDS;
  const limit = opts.limit && opts.limit > 0 ? opts.limit : 50;
  const supabase = await createAdminClient();

  const out: ActionQueueItem[] = [];
  const nowIso = new Date().toISOString();

  // VN-day boundaries for "today" follow-up bucket
  const today = getPeriodRange("today");
  const next24 = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  // ─── overdue + today follow-ups via crm_next_actions ──────
  // We need contact info — join via contact_id.
  const needsActions =
    kinds.includes("overdue_followup") || kinds.includes("today_followup");
  if (needsActions) {
    let q = supabase
      .from("crm_next_actions")
      .select(
        `id, contact_id, title, description, due_at, priority, status,
         crm_contacts:contact_id (
           id, full_name, phone, email, journey_stage
         )`
      )
      .eq("status", "pending")
      .order("due_at", { ascending: true })
      .limit(limit);
    if (saleId) q = q.eq("assigned_to", saleId);
    const { data: actions } = await q;

    type ContactJoin = {
      id: string;
      full_name: string | null;
      phone: string | null;
      email: string | null;
      journey_stage: string | null;
    };
    type ActionRow = {
      id: string;
      contact_id: string | null;
      title: string;
      description: string | null;
      due_at: string | null;
      priority: string | null;
      // PostgREST returns embedded relations as either a single object or an
      // array depending on whether the FK is unique. We handle both.
      crm_contacts: ContactJoin | ContactJoin[] | null;
    };
    for (const row of (actions ?? []) as unknown as ActionRow[]) {
      if (!row.due_at) continue;
      const due = new Date(row.due_at).getTime();
      let kind: ActionQueueItem["kind"] | null = null;
      if (due < Date.now() && kinds.includes("overdue_followup")) {
        kind = "overdue_followup";
      } else if (
        due >= today.start.getTime() &&
        due <= new Date(next24).getTime() &&
        kinds.includes("today_followup")
      ) {
        kind = "today_followup";
      }
      if (!kind) continue;
      const contact = Array.isArray(row.crm_contacts)
        ? row.crm_contacts[0] ?? null
        : row.crm_contacts;
      out.push({
        kind,
        id: row.id,
        contact_id: row.contact_id,
        full_name: contact?.full_name ?? null,
        phone: contact?.phone ?? null,
        email: contact?.email ?? null,
        journey_stage: contact?.journey_stage ?? null,
        amount: null,
        due_at: row.due_at,
        description: row.title || row.description || "Theo dõi khách",
        priority: (row.priority as ActionQueueItem["priority"]) ?? "medium",
      });
    }
  }

  // ─── pending_order_chase ─────────────────────────────────
  if (kinds.includes("pending_order_chase")) {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    let q = supabase
      .from("orders")
      .select(
        "id, order_code, amount, customer_name, customer_email, customer_phone, created_at"
      )
      .eq("status", "pending")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (saleId) q = q.eq("assigned_to", saleId);
    const { data: pending } = await q;
    for (const row of pending ?? []) {
      const r = row as {
        id: string;
        order_code: string | null;
        amount: unknown;
        customer_name: string | null;
        customer_email: string | null;
        customer_phone: string | null;
        created_at: string | null;
      };
      out.push({
        kind: "pending_order_chase",
        id: r.id,
        contact_id: null,
        full_name: r.customer_name,
        phone: r.customer_phone,
        email: r.customer_email,
        journey_stage: null,
        amount: n(r.amount),
        due_at: r.created_at,
        description: `Đơn ${r.order_code ?? r.id.slice(0, 8)} chờ thanh toán >1h`,
        priority: n(r.amount) > 1_000_000 ? "high" : "medium",
      });
    }
  }

  // ─── new_lead ─────────────────────────────────────────────
  if (kinds.includes("new_lead")) {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    let q = supabase
      .from("crm_contacts")
      .select("id, full_name, phone, email, journey_stage, created_at, last_contacted_at, status")
      .eq("status", "new")
      .is("last_contacted_at", null)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (saleId) q = q.eq("assigned_to", saleId);
    const { data: leads } = await q;
    for (const row of leads ?? []) {
      const r = row as {
        id: string;
        full_name: string | null;
        phone: string | null;
        email: string | null;
        journey_stage: string | null;
        created_at: string | null;
      };
      out.push({
        kind: "new_lead",
        id: r.id,
        contact_id: r.id,
        full_name: r.full_name,
        phone: r.phone,
        email: r.email,
        journey_stage: r.journey_stage,
        amount: null,
        due_at: r.created_at,
        description: "Lead mới, chưa từng liên hệ",
        priority: "high",
      });
    }
  }

  // Sort: critical → high → medium → low; within priority, oldest first.
  // overdue_followup always treated as highest urgency.
  const priorityRank: Record<ActionQueueItem["priority"], number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  out.sort((a, b) => {
    if (a.kind === "overdue_followup" && b.kind !== "overdue_followup") return -1;
    if (b.kind === "overdue_followup" && a.kind !== "overdue_followup") return 1;
    const pr = priorityRank[a.priority] - priorityRank[b.priority];
    if (pr !== 0) return pr;
    const ad = a.due_at ? new Date(a.due_at).getTime() : 0;
    const bd = b.due_at ? new Date(b.due_at).getTime() : 0;
    return ad - bd;
  });

  void nowIso; // currently unused but reserved for future "since" filtering
  return out.slice(0, limit);
}

// ────────────────────────────────────────────────────────────
// 3. getFunnel — contacts grouped by journey_stage
// ────────────────────────────────────────────────────────────

export async function getFunnel(opts: {
  saleId: string | null;
}): Promise<FunnelData> {
  const supabase = await createAdminClient();
  let q = supabase.from("crm_contacts").select("journey_stage");
  if (opts.saleId) q = q.eq("assigned_to", opts.saleId);
  const { data } = await q;

  const out: FunnelData = {
    lead: 0,
    contacted: 0,
    qualified: 0,
    negotiation: 0,
    customer: 0,
    advocate: 0,
  };
  for (const row of data ?? []) {
    const stage = ((row as { journey_stage?: string | null }).journey_stage ??
      "lead") as keyof FunnelData | "visitor";
    if (stage === "visitor") {
      out.lead += 1;
      continue;
    }
    if (stage in out) {
      out[stage as keyof FunnelData] += 1;
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// 4. getStrategyTips — rule-based coaching suggestions
// ────────────────────────────────────────────────────────────

export async function getStrategyTips(opts: {
  saleId: string | null;
}): Promise<StrategyTip[]> {
  const { saleId } = opts;
  const supabase = await createAdminClient();

  const tips: StrategyTip[] = [];

  // Pull a few aggregates in parallel
  const [
    overdueRes,
    pendingChaseRes,
    kpi,
    funnel,
    qualifiedRes,
    customerAffRes,
  ] = await Promise.all([
    (async () => {
      let q = supabase
        .from("crm_next_actions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("due_at", new Date().toISOString());
      if (saleId) q = q.eq("assigned_to", saleId);
      return q;
    })(),
    (async () => {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      let q = supabase
        .from("orders")
        .select("amount", { count: "exact" })
        .eq("status", "pending")
        .lt("created_at", cutoff);
      if (saleId) q = q.eq("assigned_to", saleId);
      return q;
    })(),
    getSaleKPI({ saleId, period: "mtd" }),
    getFunnel({ saleId }),
    (async () => {
      let q = supabase
        .from("crm_contacts")
        .select("id, lifetime_value")
        .eq("journey_stage", "qualified")
        .gte("lifetime_value", 3_000_000);
      if (saleId) q = q.eq("assigned_to", saleId);
      return q;
    })(),
    (async () => {
      // contacts at customer/advocate stage that have an active affiliate
      let q = supabase
        .from("crm_contacts")
        .select("id, user_id, journey_stage")
        .in("journey_stage", ["customer", "advocate"]);
      if (saleId) q = q.eq("assigned_to", saleId);
      return q;
    })(),
  ]);

  const overdueCount = overdueRes.count ?? 0;
  if (overdueCount > 0) {
    tips.push({
      id: "overdue_followups",
      severity: overdueCount >= 5 ? "critical" : "warning",
      title: `${overdueCount} khách quá hạn theo dõi`,
      detail:
        "Có khách hàng chờ bạn liên hệ lại — phản hồi sớm để giữ tỉ lệ chốt đơn.",
      cta_label: "Xem hàng đợi",
      cta_href: saleId ? "/sale/dashboard#queue" : "/admin/sales-dashboard#queue",
      affected_count: overdueCount,
    });
  }

  const pendingChaseCount = pendingChaseRes.count ?? 0;
  let pendingChaseValue = 0;
  for (const o of pendingChaseRes.data ?? [])
    pendingChaseValue += n((o as { amount: unknown }).amount);
  if (pendingChaseCount > 5) {
    tips.push({
      id: "pending_orders",
      severity: "warning",
      title: `${pendingChaseCount} đơn pending >1h`,
      detail: `Tổng giá trị ${pendingChaseValue.toLocaleString("vi-VN")}đ đang chờ — nhắc khách thanh toán ngay.`,
      cta_label: "Nhắc thanh toán",
      cta_href: "/admin/orders?status=pending",
      affected_count: pendingChaseCount,
    });
  }

  if (kpi.contacts_total >= 20 && kpi.conversion_rate < 15) {
    tips.push({
      id: "low_conversion",
      severity: "warning",
      title: `Tỉ lệ convert thấp (${kpi.conversion_rate.toFixed(1)}%)`,
      detail:
        "Tỉ lệ chuyển lead → đã liên hệ đang dưới 15%. Cân nhắc training kịch bản gọi.",
      cta_label: null,
      cta_href: null,
      affected_count: null,
    });
  }

  if (kpi.revenue_pct !== null && kpi.revenue_pct < 40) {
    tips.push({
      id: "behind_target",
      severity: "critical",
      title: `Doanh số mới đạt ${kpi.revenue_pct.toFixed(0)}% chỉ tiêu tháng`,
      detail:
        "Còn cách target khá xa — ưu tiên đóng các deal Hội viên/Khách hàng đang nóng.",
      cta_label: "Xem pipeline",
      cta_href: "/admin/crm/deals",
      affected_count: null,
    });
  } else if (kpi.revenue_pct !== null && kpi.revenue_pct >= 100) {
    tips.push({
      id: "target_hit",
      severity: "info",
      title: `Vượt chỉ tiêu! ${kpi.revenue_pct.toFixed(0)}% target tháng`,
      detail: "Tận dụng đà này để upsell khách hàng đã chốt lên gói cao hơn.",
      cta_label: null,
      cta_href: null,
      affected_count: null,
    });
  }

  const qualifiedHot = qualifiedRes.data?.length ?? 0;
  if (qualifiedHot >= 3) {
    tips.push({
      id: "upsell_qualified",
      severity: "info",
      title: `${qualifiedHot} Khách hàng sẵn sàng upsell Hội viên`,
      detail:
        "Các khách đã chi >3M có khả năng nâng cấp gói. Gợi ý chương trình thành viên.",
      cta_label: "Lọc Khách hàng",
      cta_href: "/admin/crm/contacts?stage=qualified",
      affected_count: qualifiedHot,
    });
  }

  // "No active affiliate among customers" — invite affiliate
  const customerCount = funnel.customer + funnel.advocate;
  const customersWithUserId = (customerAffRes.data ?? []).filter(
    (r) => (r as { user_id: string | null }).user_id
  );
  if (customerCount >= 3 && customersWithUserId.length > 0) {
    const userIds = customersWithUserId.map(
      (r) => (r as { user_id: string }).user_id
    );
    const { data: affs } = await supabase
      .from("affiliates")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "active");
    const activeCount = affs?.length ?? 0;
    if (activeCount === 0) {
      tips.push({
        id: "invite_affiliate",
        severity: "info",
        title: "Chưa có Hội viên nào là affiliate",
        detail:
          "Mời các khách hàng trung thành tham gia affiliate để tăng nguồn lead miễn phí.",
        cta_label: "Xem chương trình",
        cta_href: "/affiliate",
        affected_count: customerCount,
      });
    }
  }

  // Cap to 7 — most-severe first
  const sevRank: Record<StrategyTip["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  tips.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
  return tips.slice(0, 7);
}

// ────────────────────────────────────────────────────────────
// 5. getDailyRevenue — last N days bucketed by VN day
// ────────────────────────────────────────────────────────────

/**
 * Per-day revenue point used by the dashboard line charts.
 *
 * Fields:
 *   - revenue          legacy alias = revenue_platform (existing chart UI
 *                      keeps reading `revenue` without code changes)
 *   - revenue_platform real cash that flowed through the web that day
 *   - revenue_external sum of `external`-source paid orders that day
 *                      (paid_at is when the admin recorded it; charts
 *                      may also show by external_paid_at but the simple
 *                      v1 here keys by paid_at for parity with `revenue`)
 *   - orders           total paid orders (any source, excl. `comp` is a
 *                      design tradeoff — kept inclusive so the "+1 đơn"
 *                      tooltip matches what the sale just logged)
 */
export type DailyRevenuePoint = {
  date: string;
  revenue: number;
  revenue_platform: number;
  revenue_external: number;
  orders: number;
};

export async function getDailyRevenue(opts: {
  saleId: string | null;
  days: number;
}): Promise<DailyRevenuePoint[]> {
  const { saleId } = opts;
  const days = Math.max(1, Math.min(opts.days || 30, 365));
  const supabase = await createAdminClient();

  // Range: from `days` days ago at VN-midnight, up to next VN-midnight.
  const vn = vnNow();
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  const d = vn.getUTCDate();
  const startVn = new Date(Date.UTC(y, m, d - (days - 1), 0, 0, 0));
  const endVn = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));
  const start = vnToUtc(startVn);
  const end = vnToUtc(endVn);

  let q = supabase
    .from("orders")
    .select("amount, paid_at, revenue_source")
    .eq("status", "paid")
    .gte("paid_at", start.toISOString())
    .lt("paid_at", end.toISOString());
  if (saleId) q = q.eq("assigned_to", saleId);
  const { data } = await q;

  // Bucket by VN day
  const buckets = new Map<
    string,
    { revenue_platform: number; revenue_external: number; orders: number }
  >();
  for (let i = 0; i < days; i++) {
    const dayVn = new Date(Date.UTC(y, m, d - (days - 1) + i, 0, 0, 0));
    const key = `${dayVn.getUTCFullYear()}-${String(dayVn.getUTCMonth() + 1).padStart(2, "0")}-${String(dayVn.getUTCDate()).padStart(2, "0")}`;
    buckets.set(key, { revenue_platform: 0, revenue_external: 0, orders: 0 });
  }

  for (const row of data ?? []) {
    const r = row as {
      amount: unknown;
      paid_at: string | null;
      revenue_source?: string | null;
    };
    if (!r.paid_at) continue;
    const vnAt = new Date(new Date(r.paid_at).getTime() + VN_OFFSET_HOURS * 3600 * 1000);
    const key = `${vnAt.getUTCFullYear()}-${String(vnAt.getUTCMonth() + 1).padStart(2, "0")}-${String(vnAt.getUTCDate()).padStart(2, "0")}`;
    const b = buckets.get(key);
    if (!b) continue;
    const amt = n(r.amount);
    const src = r.revenue_source ?? "platform";
    if (src === "external") b.revenue_external += amt;
    else if (src === "comp") {
      /* comp = no cash; still counts toward orders below */
    } else b.revenue_platform += amt;
    b.orders += 1;
  }

  return Array.from(buckets.entries()).map(([date, v]) => ({
    date,
    // Legacy alias — existing chart code reading `revenue` keeps working.
    revenue: v.revenue_platform,
    revenue_platform: v.revenue_platform,
    revenue_external: v.revenue_external,
    orders: v.orders,
  }));
}

// ────────────────────────────────────────────────────────────
// 6. getTeamLeaderboard — admin-only ranking of all sales
// ────────────────────────────────────────────────────────────

export async function getTeamLeaderboard(opts: {
  period: SalePeriod;
}): Promise<
  Array<
    SaleKPI & {
      rank: number;
      status: "on_track" | "needs_push" | "needs_coaching";
    }
  >
> {
  const supabase = await createAdminClient();
  const { data: sales } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "sale")
    .order("full_name", { ascending: true });

  const list = (sales ?? []) as Array<{ id: string; full_name: string | null }>;
  const kpis = await Promise.all(
    list.map((s) => getSaleKPI({ saleId: s.id, period: opts.period }))
  );

  // Rank by revenue desc
  const sorted = [...kpis].sort((a, b) => b.revenue - a.revenue);
  return sorted.map((k, i) => {
    let status: "on_track" | "needs_push" | "needs_coaching";
    const pctTarget = k.revenue_pct;
    if (pctTarget === null) {
      status = "needs_push"; // no target set → neutral middle
    } else if (pctTarget >= 80) {
      status = "on_track";
    } else if (pctTarget >= 40) {
      status = "needs_push";
    } else {
      status = "needs_coaching";
    }
    return { ...k, rank: i + 1, status };
  });
}
