import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sanitizeSearchInput } from "@/lib/utils";
import { getSalesUsers } from "@/lib/sales";
import { getViewerScope } from "@/lib/viewer-scope";
import OrderSearchBar from "@/components/admin/OrderSearchBar";
import OrderSourceFilter, {
  type SourceFilter,
} from "@/components/admin/OrderSourceFilter";
import OrderUtmFilter from "@/components/admin/OrderUtmFilter";
import BulkDeleteOrders from "@/components/admin/BulkDeleteOrders";
import OrdersTable from "./OrdersTable";
import type { OrderRow } from "./OrdersTable";
import {
  ShoppingCart,
  TrendingUp,
  CheckCircle,
  Clock,
  Gift,
  Megaphone,
} from "lucide-react";
import { Suspense } from "react";

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

// `source` query param → set of revenue_source values it represents.
// 'platform' includes legacy NULL rows. We can't `IN (..., NULL)` cleanly in
// PostgREST, so platform filtering is done with an `.or()` clause below.
const VALID_SOURCES: ReadonlyArray<SourceFilter> = [
  "all",
  "platform",
  "external",
  "comp",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string; source?: string; utm?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = (resolvedParams.q ?? "").trim();
  const currentPage = Math.max(1, parseInt(resolvedParams.page ?? "1", 10) || 1);
  const sourceRaw = (resolvedParams.source ?? "all").trim() as SourceFilter;
  const source: SourceFilter = VALID_SOURCES.includes(sourceRaw)
    ? sourceRaw
    : "all";

  // Marketing source (utm_source) filter
  const VALID_UTM_SOURCES = ["all", "facebook", "google", "zalo", "email", "youtube"] as const;
  type UtmFilter = (typeof VALID_UTM_SOURCES)[number];
  const utmRaw = (resolvedParams.utm ?? "all").trim() as UtmFilter;
  const utmFilter: UtmFilter = (VALID_UTM_SOURCES as readonly string[]).includes(utmRaw)
    ? utmRaw as UtmFilter
    : "all";

  // Auth check
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["admin", "manager", "sale"].includes(profile?.role ?? "")) redirect("/dashboard");

  // Viewer scope: sale role sees only their own assigned orders.
  const scope = await getViewerScope();
  if (!scope.canView) redirect("/dashboard");

  const canWrite = ["admin", "manager"].includes(profile?.role ?? "");
  const canConfirm = ["admin", "manager", "sale"].includes(profile?.role ?? "");

  // Bank info for QR
  const bankAccount = process.env.SEPAY_BANK_ACCOUNT ?? "";
  const bankCode = process.env.SEPAY_BANK_CODE ?? "";

  // Fetch orders with product title (bypass RLS)
  const supabase = await createAdminClient();

  // Helper: apply the `source` filter to any query builder. We have to handle
  // 'platform' specially because legacy rows have revenue_source = NULL and
  // PostgREST .in() doesn't match NULL.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applySourceFilter<T extends { eq: any; or: any; in: any }>(q: T): T {
    if (source === "platform") {
      return q.or("revenue_source.is.null,revenue_source.eq.platform");
    }
    if (source === "external") {
      return q.eq("revenue_source", "external");
    }
    if (source === "comp") {
      return q.eq("revenue_source", "comp");
    }
    return q;
  }

  // Helper: apply utm_source filter to a query builder.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyUtmFilter<T extends { eq: any; is: any }>(q: T): T {
    if (utmFilter !== "all") {
      return q.eq("utm_source", utmFilter);
    }
    return q;
  }

  // ── Compute stats and pagination count in parallel ──
  let paginationCountQuery = supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  const safeQuery = query ? sanitizeSearchInput(query) : "";
  if (safeQuery) {
    const q = `%${safeQuery}%`;
    paginationCountQuery = paginationCountQuery.or(
      `order_code.ilike.${q},customer_name.ilike.${q},customer_email.ilike.${q},customer_phone.ilike.${q}`
    );
  }
  if (scope.isSale) {
    paginationCountQuery = paginationCountQuery.eq("assigned_to", scope.userId);
  }
  paginationCountQuery = applySourceFilter(paginationCountQuery);
  paginationCountQuery = applyUtmFilter(paginationCountQuery);

  // Stat-card queries: scope to current sale rep when applicable.
  // KPIs ignore the `source` filter — they're a fixed overview of the orders
  // book regardless of which chip is selected, otherwise the "Tổng đơn hàng"
  // card stops meaning what it says.
  let totalCountQuery = supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  // "Đã thanh toán platform" = paid AND (revenue_source = 'platform' OR NULL).
  let paidPlatformCountQuery = supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "paid")
    .or("revenue_source.is.null,revenue_source.eq.platform");
  let pendingCountQuery = supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  // Platform revenue sum: paid + platform/null only.
  let platformRevenueQuery = supabase
    .from("orders")
    .select("amount")
    .eq("status", "paid")
    .or("revenue_source.is.null,revenue_source.eq.platform");
  // External/comp grant orders — count + sum of nominal amount (info only).
  let externalGrantQuery = supabase
    .from("orders")
    .select("amount", { count: "exact" })
    .eq("status", "paid")
    .in("revenue_source", ["external", "comp"]);

  // Top utm_source: fetch all non-null utm_source values to compute the top one
  let topUtmQuery = supabase
    .from("orders")
    .select("utm_source")
    .not("utm_source", "is", null);

  if (scope.isSale) {
    totalCountQuery = totalCountQuery.eq("assigned_to", scope.userId);
    paidPlatformCountQuery = paidPlatformCountQuery.eq(
      "assigned_to",
      scope.userId
    );
    pendingCountQuery = pendingCountQuery.eq("assigned_to", scope.userId);
    platformRevenueQuery = platformRevenueQuery.eq(
      "assigned_to",
      scope.userId
    );
    externalGrantQuery = externalGrantQuery.eq("assigned_to", scope.userId);
    topUtmQuery = topUtmQuery.eq("assigned_to", scope.userId);
  }

  const [
    { count: totalCount },
    { count: paidPlatformCount },
    { count: pendingCount },
    { data: platformRevenueData },
    { count: externalGrantCount, data: externalGrantData },
    { count: filteredCount },
    { data: utmSourceData },
  ] = await Promise.all([
    totalCountQuery,
    paidPlatformCountQuery,
    pendingCountQuery,
    platformRevenueQuery,
    externalGrantQuery,
    paginationCountQuery,
    topUtmQuery,
  ]);

  const totalPlatformRevenue = (platformRevenueData ?? []).reduce(
    (sum: number, o: { amount: number }) => sum + o.amount,
    0
  );
  const externalGrantValue = (externalGrantData ?? []).reduce(
    (sum: number, o: { amount: number }) => sum + (o.amount ?? 0),
    0
  );
  // Compute top utm_source
  const utmCounts: Record<string, number> = {};
  for (const row of utmSourceData ?? []) {
    const src = (row as { utm_source: string }).utm_source;
    if (src) utmCounts[src] = (utmCounts[src] ?? 0) + 1;
  }
  const topUtmEntries = Object.entries(utmCounts).sort((a, b) => b[1] - a[1]);
  const topUtmSource = topUtmEntries[0]?.[0] ?? null;
  const topUtmCount = topUtmEntries[0]?.[1] ?? 0;
  const totalUtmOrders = Object.values(utmCounts).reduce((s, n) => s + n, 0);

  const totalFilteredOrders = filteredCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFilteredOrders / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  // Fetch sales users for assignment dropdown
  const salesUsers = await getSalesUsers(supabase);

  // Fetch paginated orders. Select revenue_source + external_channel so the
  // table cell can render the right badge. The migration is applied to prod
  // (20260527_001), and Supabase silently returns undefined for unknown
  // columns rather than failing, so no try/catch fallback is needed here.
  let dbQuery = supabase
    .from("orders")
    .select(
      "*, revenue_source, external_channel, utm_source, utm_medium, utm_campaign, products(title), assigned_profile:assigned_to(full_name)"
    )
    .order("created_at", { ascending: false });

  if (safeQuery) {
    const q = `%${safeQuery}%`;
    dbQuery = dbQuery.or(
      `order_code.ilike.${q},customer_name.ilike.${q},customer_email.ilike.${q},customer_phone.ilike.${q}`
    );
  }
  if (scope.isSale) {
    dbQuery = dbQuery.eq("assigned_to", scope.userId);
  }
  dbQuery = applySourceFilter(dbQuery);
  dbQuery = applyUtmFilter(dbQuery);

  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  dbQuery = dbQuery.range(from, to);

  const { data: orders, error } = await dbQuery;

  const rows: OrderRow[] = (orders ?? []) as unknown as OrderRow[];

  const totalOrders = totalCount ?? 0;
  const paidPlatformOrders = paidPlatformCount ?? 0;
  const pendingOrders = pendingCount ?? 0;
  const externalGrantOrders = externalGrantCount ?? 0;

  return (
    <div>
      <TopBar
        title="Quản lý Đơn hàng"
        subtitle="Theo dõi thanh toán và trạng thái đơn hàng"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total orders */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                <ShoppingCart size={17} className="text-[#3b82f6]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{totalOrders}</div>
            <div className="text-xs text-gray-500 mt-0.5">Tổng đơn hàng</div>
          </div>

          {/* Paid platform orders */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,168,67,0.12)" }}
              >
                <CheckCircle size={17} className="text-[#D4A843]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {paidPlatformOrders}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Đã thanh toán platform
            </div>
          </div>

          {/* Pending orders */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.12)" }}
              >
                <Clock size={17} className="text-[#f59e0b]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{pendingOrders}</div>
            <div className="text-xs text-gray-500 mt-0.5">Chờ thanh toán</div>
          </div>

          {/* Platform revenue */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,168,67,0.12)" }}
              >
                <TrendingUp size={17} className="text-[#D4A843]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalPlatformRevenue)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Doanh thu nền tảng
            </div>
          </div>

          {/* External / comp grants (informational, not cash-in) */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.12)" }}
              >
                <Gift size={17} className="text-[#22c55e]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {externalGrantOrders}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Cấp khóa ngoài</div>
            <div className="text-[11px] text-gray-600 mt-0.5">
              ≈ {formatCurrency(externalGrantValue)} giá trị
            </div>
          </div>

          {/* Top marketing source */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                <Megaphone size={17} className="text-[#3b82f6]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {topUtmSource
                ? topUtmSource.charAt(0).toUpperCase() + topUtmSource.slice(1)
                : "—"}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Top nguồn đơn</div>
            {totalUtmOrders > 0 && (
              <div className="text-[11px] text-gray-600 mt-0.5">
                {topUtmCount}/{totalUtmOrders} đơn có nguồn
              </div>
            )}
          </div>
        </div>

        {/* ── Search + source filter ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <Suspense fallback={null}>
            <OrderSearchBar />
          </Suspense>
          <div className="flex flex-col gap-2">
            <Suspense fallback={null}>
              <OrderSourceFilter />
            </Suspense>
            <Suspense fallback={null}>
              <OrderUtmFilter />
            </Suspense>
          </div>
        </div>

        {/* ── Bulk delete ── */}
        {canWrite && (
          <BulkDeleteOrders
            orders={rows.map((o) => ({
              id: o.id,
              order_code: o.order_code,
              customer_name: o.customer_name,
              amount: o.amount,
              status: o.status,
            }))}
          />
        )}

        {/* ── Orders table ── */}
        {error ? (
          <div className="card-dark p-8 text-center text-red-400 text-sm">
            Lỗi khi tải đơn hàng: {error.message}
          </div>
        ) : (
          <Suspense fallback={null}>
            <OrdersTable
              orders={rows}
              salesUsers={salesUsers}
              canWrite={canWrite}
              canConfirm={canConfirm}
              bankAccount={bankAccount}
              bankCode={bankCode}
              totalPages={totalPages}
              currentPage={safePage}
              query={query}
              totalFilteredOrders={totalFilteredOrders}
              pendingOrders={pendingOrders}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
