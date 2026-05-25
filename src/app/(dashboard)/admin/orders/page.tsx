import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSalesUsers } from "@/lib/sales";
import { getViewerScope } from "@/lib/viewer-scope";
import OrderSearchBar from "@/components/admin/OrderSearchBar";
import BulkDeleteOrders from "@/components/admin/BulkDeleteOrders";
import OrdersTable from "./OrdersTable";
import type { OrderRow } from "./OrdersTable";
import {
  ShoppingCart,
  TrendingUp,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Suspense } from "react";

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = (resolvedParams.q ?? "").trim();
  const currentPage = Math.max(1, parseInt(resolvedParams.page ?? "1", 10) || 1);

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

  // ── Compute stats and pagination count in parallel ──
  let paginationCountQuery = supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  if (query) {
    const q = `%${query}%`;
    paginationCountQuery = paginationCountQuery.or(
      `order_code.ilike.${q},customer_name.ilike.${q},customer_email.ilike.${q},customer_phone.ilike.${q}`
    );
  }
  if (scope.isSale) {
    paginationCountQuery = paginationCountQuery.eq("assigned_to", scope.userId);
  }

  // Stat-card queries: scope to current sale rep when applicable.
  let totalCountQuery = supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  let paidCountQuery = supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "paid");
  let pendingCountQuery = supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  let revenueQuery = supabase
    .from("orders")
    .select("amount")
    .eq("status", "paid");
  if (scope.isSale) {
    totalCountQuery = totalCountQuery.eq("assigned_to", scope.userId);
    paidCountQuery = paidCountQuery.eq("assigned_to", scope.userId);
    pendingCountQuery = pendingCountQuery.eq("assigned_to", scope.userId);
    revenueQuery = revenueQuery.eq("assigned_to", scope.userId);
  }

  const [
    { count: totalCount },
    { count: paidCount },
    { count: pendingCount },
    { data: revenueData },
    { count: filteredCount },
  ] = await Promise.all([
    totalCountQuery,
    paidCountQuery,
    pendingCountQuery,
    revenueQuery,
    paginationCountQuery,
  ]);

  const totalRevenue = (revenueData ?? []).reduce(
    (sum: number, o: { amount: number }) => sum + o.amount,
    0
  );
  const totalFilteredOrders = filteredCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFilteredOrders / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  // Fetch sales users for assignment dropdown
  const salesUsers = await getSalesUsers(supabase);

  // Fetch paginated orders
  let dbQuery = supabase
    .from("orders")
    .select("*, products(title), assigned_profile:assigned_to(full_name)")
    .order("created_at", { ascending: false });

  if (query) {
    const q = `%${query}%`;
    dbQuery = dbQuery.or(
      `order_code.ilike.${q},customer_name.ilike.${q},customer_email.ilike.${q},customer_phone.ilike.${q}`
    );
  }
  if (scope.isSale) {
    dbQuery = dbQuery.eq("assigned_to", scope.userId);
  }

  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  dbQuery = dbQuery.range(from, to);

  const { data: orders, error } = await dbQuery;

  const rows: OrderRow[] = (orders ?? []) as unknown as OrderRow[];

  const totalOrders = totalCount ?? 0;
  const paidOrders = paidCount ?? 0;
  const pendingOrders = pendingCount ?? 0;

  return (
    <div>
      <TopBar
        title="Quản lý Đơn hàng"
        subtitle="Theo dõi thanh toán và trạng thái đơn hàng"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

          {/* Paid orders */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,168,67,0.12)" }}
              >
                <CheckCircle size={17} className="text-[#D4A843]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{paidOrders}</div>
            <div className="text-xs text-gray-500 mt-0.5">Đã thanh toán</div>
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

          {/* Total revenue */}
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
              {formatCurrency(totalRevenue)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Doanh thu (đã thanh toán)</div>
          </div>
        </div>

        {/* ── Search bar ── */}
        <Suspense fallback={null}>
          <OrderSearchBar />
        </Suspense>

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
