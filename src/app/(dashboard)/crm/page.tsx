import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import {
  TrendingUp, ShoppingCart, Users, DollarSign,
  BarChart2, Package, AlertCircle,
} from "lucide-react";

/* ---------- helpers ---------- */

function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  paid:      { label: "Đã TT",   color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  pending:   { label: "Chờ XL",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  cancelled: { label: "Đã huỷ",  color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

/* ---------- page ---------- */

export default async function CRMPage() {
  const supabase = await createClient();

  // Fetch all data in parallel
  const [overviewRes, dailyRevenueRes, recentOrdersRes, topProductsRes] = await Promise.all([
    supabase.from("crm_overview").select("*").single(),
    supabase.from("daily_revenue").select("*").order("day", { ascending: true }),
    supabase
      .from("orders")
      .select("id, order_code, customer_name, customer_email, amount, status, paid_at, created_at, products(title)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("orders")
      .select("product_id, products(title), amount")
      .eq("status", "paid"),
  ]);

  const overview = overviewRes.data ?? {
    total_orders: 0,
    total_revenue: 0,
    total_customers: 0,
    avg_order_value: 0,
    pending_orders: 0,
  };

  const dailyRevenue = (dailyRevenueRes.data ?? []) as {
    day: string;
    revenue: number;
    orders: number;
  }[];

  const recentOrders = ((recentOrdersRes.data ?? []) as unknown as {
    id: string;
    order_code: string;
    customer_name: string | null;
    customer_email: string | null;
    amount: number;
    status: string;
    paid_at: string | null;
    created_at: string;
    products: { title: string } | null;
  }[]);

  // Aggregate top products by revenue
  const productRevMap = new Map<string, { title: string; revenue: number; orders: number }>();
  for (const row of ((topProductsRes.data ?? []) as unknown as { product_id: string; products: { title: string } | null; amount: number }[])) {
    const title = row.products?.title ?? "Không rõ";
    const existing = productRevMap.get(title);
    if (existing) {
      existing.revenue += row.amount;
      existing.orders += 1;
    } else {
      productRevMap.set(title, { title, revenue: row.amount, orders: 1 });
    }
  }
  const topProducts = Array.from(productRevMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Stats cards
  const stats = [
    {
      label: "Doanh thu",
      value: formatVND(overview.total_revenue),
      icon: DollarSign,
      color: "#f59e0b",
    },
    {
      label: "Đơn đã TT",
      value: String(overview.total_orders),
      sub: `${overview.pending_orders} đang chờ`,
      icon: ShoppingCart,
      color: "#a855f7",
    },
    {
      label: "Khách hàng",
      value: String(overview.total_customers),
      icon: Users,
      color: "#22c55e",
    },
    {
      label: "TB/đơn hàng",
      value: formatVND(Math.round(overview.avg_order_value)),
      icon: TrendingUp,
      color: "#3b82f6",
    },
  ];

  // Chart calculations
  const maxRevenue = dailyRevenue.length > 0
    ? Math.max(...dailyRevenue.map((d) => d.revenue))
    : 1;
  const totalChartRevenue = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0);

  // Order status breakdown for donut
  const paidCount = overview.total_orders;
  const totalOrdersAll = paidCount + overview.pending_orders;
  const paidPct = totalOrdersAll > 0 ? Math.round((paidCount / totalOrdersAll) * 100) : 0;
  const pendingPct = totalOrdersAll > 0 ? Math.round((overview.pending_orders / totalOrdersAll) * 100) : 0;

  const maxProductRevenue = topProducts.length > 0
    ? Math.max(...topProducts.map((p) => p.revenue))
    : 1;

  return (
    <div>
      <TopBar title="CRM & Doanh số" subtitle="Quản lý kinh doanh của bạn" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-white">Tổng quan doanh số</h2>
          <p className="text-gray-400 text-sm">Dữ liệu cập nhật theo thời gian thực</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{s.label}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "20" }}
                >
                  <s.icon size={15} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              {s.sub && <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* Pending orders alert */}
        {overview.pending_orders > 0 && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl text-sm"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <AlertCircle size={16} className="text-[#f59e0b] shrink-0" />
            <div>
              <strong className="text-white">
                {overview.pending_orders} đơn hàng đang chờ xử lý
              </strong>
              <span className="text-gray-400 ml-2">
                — Kiểm tra và xác nhận thanh toán.
              </span>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="card-dark p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Doanh thu 30 ngày qua
                </h3>
                <div className="text-xl font-bold text-white mt-1">
                  {formatVND(totalChartRevenue)}
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <BarChart2 size={11} />
                  {dailyRevenue.length} ngày có doanh thu
                </div>
              </div>
            </div>
            {dailyRevenue.length > 0 ? (
              <div className="flex items-end gap-1 h-32 mt-4">
                {dailyRevenue.map((d, i) => {
                  const pct = (d.revenue / maxRevenue) * 100;
                  const dayLabel = new Date(d.day).toLocaleDateString("vi-VN", {
                    day: "numeric",
                    month: "numeric",
                  });
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full rounded-t transition-all hover:opacity-80"
                        style={{
                          height: `${pct}%`,
                          background: "#22c55e",
                          minHeight: 4,
                        }}
                        title={`${dayLabel}: ${formatVND(d.revenue)} (${d.orders} đơn)`}
                      />
                      {dailyRevenue.length <= 15 && (
                        <span className="text-[9px] text-gray-600">{dayLabel}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
                Chưa có dữ liệu doanh thu
              </div>
            )}
          </div>

          {/* Order Status Donut */}
          <div className="card-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-sm">Trạng thái đơn hàng</h3>
            </div>
            <div className="flex justify-center mb-4">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-white"
                style={{
                  background: totalOrdersAll > 0
                    ? `conic-gradient(#22c55e 0% ${paidPct}%, #f59e0b ${paidPct}% ${paidPct + pendingPct}%, #6b7280 ${paidPct + pendingPct}% 100%)`
                    : "#2a2a2a",
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: "#1a1a1a" }}
                >
                  {totalOrdersAll > 0 ? `${paidPct}%` : "—"}
                </div>
              </div>
            </div>
            {[
              { label: "Đã thanh toán", count: paidCount, color: "#22c55e" },
              { label: "Chờ xử lý", count: overview.pending_orders, color: "#f59e0b" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-gray-400">{item.label}</span>
                </div>
                <span className="text-xs font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card-dark">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <h3 className="font-semibold text-white">Đơn hàng gần đây</h3>
            <span className="text-xs text-gray-500">10 đơn mới nhất</span>
          </div>
          {recentOrders.length > 0 ? (
            <div className="divide-y divide-[#2a2a2a]">
              {recentOrders.map((order) => {
                const st = statusConfig[order.status] ?? statusConfig.cancelled;
                const productTitle =
                  order.products?.title ?? "—";
                const displayName = order.customer_name || order.customer_email || "Khách hàng";
                const initial = displayName.charAt(0).toUpperCase();
                return (
                  <div key={order.id} className="flex items-center gap-4 p-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}
                    >
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {productTitle} &bull; {timeAgo(order.created_at)}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {formatVND(order.amount)}
                    </div>
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-600 text-sm">
              Chưa có đơn hàng nào
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-[#22c55e]" />
            <h3 className="font-semibold text-white">Sản phẩm bán chạy</h3>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, i) => {
                const barPct = (product.revenue / maxProductRevenue) * 100;
                return (
                  <div key={product.title} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                          style={{
                            background: i === 0 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
                            color: i === 0 ? "#f59e0b" : "#9ca3af",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm text-white">{product.title}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-white">
                          {formatVND(product.revenue)}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {product.orders} đơn
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barPct}%`,
                          background: i === 0 ? "#f59e0b" : "#22c55e",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-600 text-sm">
              Chưa có dữ liệu sản phẩm
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
