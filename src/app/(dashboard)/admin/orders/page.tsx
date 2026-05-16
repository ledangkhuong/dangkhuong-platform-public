import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import DeleteOrderButton from "@/components/admin/DeleteOrderButton";
import ConfirmOrderButton from "@/components/admin/ConfirmOrderButton";
import QRCodeButton from "@/components/admin/QRCodeButton";
import OrderSearchBar from "@/components/admin/OrderSearchBar";
import {
  ShoppingCart,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Ban,
  CreditCard,
  Calendar,
} from "lucide-react";
import { Suspense } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "pending" | "paid" | "cancelled" | "refunded";

interface OrderRow {
  id: string;
  order_code: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  amount: number;
  status: OrderStatus;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  products: { title: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  paid: {
    label: "Đã thanh toán",
    bg: "rgba(34,197,94,0.1)",
    color: "#22c55e",
    border: "rgba(34,197,94,0.2)",
  },
  pending: {
    label: "Chờ thanh toán",
    bg: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
    border: "rgba(245,158,11,0.2)",
  },
  cancelled: {
    label: "Đã huỷ",
    bg: "rgba(107,114,128,0.1)",
    color: "#6b7280",
    border: "rgba(107,114,128,0.2)",
  },
  refunded: {
    label: "Hoàn tiền",
    bg: "rgba(239,68,68,0.1)",
    color: "#ef4444",
    border: "rgba(239,68,68,0.2)",
  },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function StatusIcon({ status }: { status: OrderStatus }) {
  switch (status) {
    case "paid":
      return <CheckCircle size={17} className="text-[#D4A843]" />;
    case "pending":
      return <Clock size={17} className="text-[#f59e0b]" />;
    case "cancelled":
      return <Ban size={17} className="text-[#6b7280]" />;
    case "refunded":
      return <XCircle size={17} className="text-[#ef4444]" />;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = (resolvedParams.q ?? "").trim();

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
  if (profile?.role !== "admin") redirect("/dashboard");

  // Bank info for QR
  const bankAccount = process.env.SEPAY_BANK_ACCOUNT ?? "";
  const bankCode = process.env.SEPAY_BANK_CODE ?? "";

  // Fetch orders with product title (bypass RLS)
  const supabase = await createAdminClient();

  let dbQuery = supabase
    .from("orders")
    .select("*, products(title)")
    .order("created_at", { ascending: false });

  // Apply search filter
  if (query) {
    const q = `%${query}%`;
    dbQuery = dbQuery.or(
      `order_code.ilike.${q},customer_name.ilike.${q},customer_email.ilike.${q},customer_phone.ilike.${q}`
    );
  } else {
    dbQuery = dbQuery.limit(50);
  }

  const { data: orders, error } = await dbQuery;

  const rows: OrderRow[] = (orders ?? []) as unknown as OrderRow[];

  // ── Compute stats (always from all orders, not just filtered) ──
  const { count: totalCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  const { count: paidCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "paid");
  const { count: pendingCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  const { data: revenueData } = await supabase
    .from("orders")
    .select("amount")
    .eq("status", "paid");
  const totalRevenue = (revenueData ?? []).reduce(
    (sum: number, o: { amount: number }) => sum + o.amount,
    0
  );

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

        {/* ── Orders table ── */}
        <div className="card-dark overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <span className="text-xs text-gray-500">
              {query ? (
                <>
                  Tìm thấy{" "}
                  <span className="text-white font-medium">{rows.length}</span>{" "}
                  kết quả cho &ldquo;
                  <span className="text-[#D4A843]">{query}</span>&rdquo;
                </>
              ) : (
                <>
                  Hiển thị{" "}
                  <span className="text-white font-medium">{rows.length}</span>{" "}
                  đơn hàng gần nhất
                </>
              )}
            </span>
            {pendingOrders > 0 && !query && (
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-lg"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                {pendingOrders} đơn chờ thanh toán
              </span>
            )}
          </div>

          {error ? (
            <div className="p-8 text-center text-red-400 text-sm">
              Lỗi khi tải đơn hàng: {error.message}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-gray-600 text-sm">
              {query
                ? "Không tìm thấy đơn hàng nào khớp với từ khoá."
                : "Chưa có đơn hàng nào."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {[
                      "Mã đơn",
                      "Khách hàng",
                      "Sản phẩm",
                      "Số tiền",
                      "Trạng thái",
                      "Thanh toán",
                      "Ngày tạo",
                      "",
                    ].map((col, i) => (
                      <th
                        key={col || `col-${i}`}
                        className="text-left text-xs font-semibold text-gray-500 px-5 py-3 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order, idx) => (
                    <tr
                      key={order.id}
                      className="hover:bg-white/[0.02] transition-colors"
                      style={{
                        borderBottom:
                          idx < rows.length - 1
                            ? "1px solid #1f1f1f"
                            : "none",
                      }}
                    >
                      {/* Mã đơn */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-400">
                          {order.order_code}
                        </span>
                      </td>

                      {/* Khách hàng */}
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-white text-sm">
                          {order.customer_name ?? "—"}
                        </div>
                        {order.customer_email && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            {order.customer_email}
                          </div>
                        )}
                        {order.customer_phone && (
                          <div className="text-xs text-gray-600">
                            {order.customer_phone}
                          </div>
                        )}
                      </td>

                      {/* Sản phẩm */}
                      <td className="px-5 py-3.5">
                        <span className="text-gray-300 text-sm">
                          {order.products?.title ?? "—"}
                        </span>
                      </td>

                      {/* Số tiền */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-white">
                          {formatCurrency(order.amount)}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-5 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Thanh toán */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <CreditCard size={13} className="text-gray-600" />
                          <span className="text-xs text-gray-400 capitalize">
                            {order.payment_method ?? "—"}
                          </span>
                          {order.status === "pending" &&
                            bankAccount &&
                            bankCode && (
                              <QRCodeButton
                                orderCode={order.order_code}
                                amount={order.amount}
                                customerName={order.customer_name}
                                customerEmail={order.customer_email}
                                customerPhone={order.customer_phone}
                                bankAccount={bankAccount}
                                bankCode={bankCode}
                              />
                            )}
                        </div>
                        {order.status === "paid" && order.paid_at && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Calendar size={11} className="text-amber-600" />
                            <span className="text-[11px] text-amber-500/70">
                              {formatDateTime(order.paid_at)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Ngày tạo */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">
                          {formatDateTime(order.created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {order.status === "pending" && (
                            <ConfirmOrderButton
                              orderCode={order.order_code}
                              customerName={order.customer_name}
                              amount={order.amount}
                            />
                          )}
                          {(order.status === "pending" ||
                            order.status === "cancelled") && (
                            <DeleteOrderButton
                              orderId={order.id}
                              orderCode={order.order_code}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
