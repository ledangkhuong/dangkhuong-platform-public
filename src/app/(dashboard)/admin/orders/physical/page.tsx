/**
 * /admin/orders/physical — Week 7
 *
 * Server Component liệt kê đơn hàng vật lý (`order_type IN ('physical','mixed')`)
 * kèm bộ lọc, search, stats cards và DataTable theo pattern của
 * `/admin/products`.
 *
 * Auth: inline `requireStaff` (mirror pattern từ `/admin/products`).
 * Data: lấy qua `getPhysicalOrders` + `getOrderStats` từ
 * `@/lib/ecommerce/order-queries` (Service Role, bypass RLS).
 *
 * Filter hỗ trợ qua searchParams:
 *  - status: pending | paid | cancelled | refunded
 *  - payment: sepay | payos | cod | bank_transfer
 *  - carrier: tên hãng (ghn, manual, ...)
 *  - from / to: ISO date (YYYY-MM-DD)
 *  - q: search (order_code, email, phone, shipping_phone, shipping_full_name)
 *  - page: số trang (1-based)
 *
 * Next.js 16 lưu ý: `searchParams` là Promise — phải `await` trước khi đọc.
 */

import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getPhysicalOrders,
  getOrderStats,
  type AdminOrderListRow,
} from "@/lib/ecommerce/order-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Search,
  Eye,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "shipped", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã huỷ" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["value"];

const PAYMENT_OPTIONS = [
  { value: "", label: "Tất cả phương thức" },
  { value: "sepay", label: "SePay" },
  { value: "payos", label: "PayOS" },
  { value: "cod", label: "COD" },
  { value: "bank_transfer", label: "Chuyển khoản" },
] as const;

const CARRIER_OPTIONS = [
  { value: "", label: "Tất cả hãng vận chuyển" },
  { value: "ghn", label: "GHN" },
  { value: "manual", label: "Tự giao" },
] as const;

const ORDER_STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Chờ thanh toán",
    className: "border border-amber-800/40 bg-amber-900/30 text-amber-400",
  },
  paid: {
    label: "Đã thanh toán",
    className:
      "border border-emerald-800/40 bg-emerald-900/30 text-emerald-400",
  },
  cancelled: {
    label: "Đã huỷ",
    className: "border border-red-800/40 bg-red-900/30 text-red-400",
  },
  refunded: {
    label: "Đã hoàn",
    className: "border border-purple-800/40 bg-purple-900/30 text-purple-400",
  },
};

const SHIPPING_STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Chưa tạo vận đơn",
    className: "border border-gray-700 bg-gray-800 text-gray-400",
  },
  ready_to_ship: {
    label: "Sẵn sàng gửi",
    className: "border border-blue-800/40 bg-blue-900/30 text-blue-300",
  },
  picked_up: {
    label: "Đã lấy hàng",
    className: "border border-blue-800/40 bg-blue-900/30 text-blue-300",
  },
  in_transit: {
    label: "Đang vận chuyển",
    className: "border border-blue-800/40 bg-blue-900/30 text-blue-300",
  },
  out_for_delivery: {
    label: "Đang giao",
    className: "border border-blue-800/40 bg-blue-900/30 text-blue-300",
  },
  delivered: {
    label: "Đã giao",
    className:
      "border border-emerald-800/40 bg-emerald-900/30 text-emerald-400",
  },
  returned: {
    label: "Hoàn hàng",
    className: "border border-amber-800/40 bg-amber-900/30 text-amber-400",
  },
  failed: {
    label: "Giao thất bại",
    className: "border border-red-800/40 bg-red-900/30 text-red-400",
  },
  cancelled: {
    label: "Đã huỷ",
    className: "border border-red-800/40 bg-red-900/30 text-red-400",
  },
};

const PAYMENT_BADGE: Record<string, { label: string; className: string }> = {
  sepay: {
    label: "SePay",
    className: "border border-blue-800/40 bg-blue-900/30 text-blue-300",
  },
  payos: {
    label: "PayOS",
    className: "border border-purple-800/40 bg-purple-900/30 text-purple-300",
  },
  cod: {
    label: "COD",
    className: "border border-amber-800/40 bg-amber-900/30 text-amber-300",
  },
  bank_transfer: {
    label: "Chuyển khoản",
    className: "border border-gray-700 bg-gray-800 text-gray-300",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount: number | null | undefined): string {
  const v = typeof amount === "number" ? amount : 0;
  return v.toLocaleString("vi-VN") + "₫";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Map UI status tab → filter values cho `getPhysicalOrders`.
 *
 * "shipped" / "delivered" không phải cột `status` mà là `shipping_status`,
 * nhưng `getPhysicalOrders` hiện chỉ expose `status` filter. Tạm thời nhóm
 * "shipped" và "delivered" vào filter `status=paid` rồi lọc phía client-side
 * (post-fetch) theo `shipping_status` — chấp nhận trade-off pagination chưa
 * chính xác cho 2 tab này cho tới khi `getPhysicalOrders` nhận thêm
 * `shippingStatus` filter ở iteration sau.
 */
function statusTabToFilter(tab: StatusTab): {
  status?: string;
  postFilter?: (o: AdminOrderListRow) => boolean;
} {
  switch (tab) {
    case "pending":
      return { status: "pending" };
    case "paid":
      return {
        status: "paid",
        postFilter: (o) =>
          !o.shipping_status ||
          ["pending", "ready_to_ship"].includes(o.shipping_status),
      };
    case "shipped":
      return {
        status: "paid",
        postFilter: (o) =>
          !!o.shipping_status &&
          ["picked_up", "in_transit", "out_for_delivery"].includes(
            o.shipping_status,
          ),
      };
    case "delivered":
      return {
        status: "paid",
        postFilter: (o) => o.shipping_status === "delivered",
      };
    case "cancelled":
      return { status: "cancelled" };
    case "all":
    default:
      return {};
  }
}

function isStatusTab(value: string): value is StatusTab {
  return (STATUS_TABS as ReadonlyArray<{ value: string }>).some(
    (t) => t.value === value,
  );
}

/** Convert "YYYY-MM-DD" → ISO ở 00:00 (from) hoặc 23:59:59.999 (to). */
function toDayIsoBoundary(
  date: string | undefined,
  end: boolean,
): string | undefined {
  if (!date) return undefined;
  // Loose validation — accept YYYY-MM-DD only
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const d = new Date(date + (end ? "T23:59:59.999" : "T00:00:00"));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    payment?: string;
    carrier?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function AdminPhysicalOrdersPage({
  searchParams,
}: PageProps) {
  // ── Auth gate (staff only) — inline ──
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

  const staffRoles = ["admin", "manager", "marketing", "sale", "support"];
  if (!profile || !staffRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  const canWrite = ["admin", "manager", "sale"].includes(profile.role);

  // ── Parse query params ──
  const resolved = await searchParams;
  const search = (resolved.q ?? "").trim();
  const statusRaw = (resolved.status ?? "all").trim();
  const statusTab: StatusTab = isStatusTab(statusRaw) ? statusRaw : "all";
  const payment = (resolved.payment ?? "").trim();
  const carrier = (resolved.carrier ?? "").trim();
  const dateFromInput = (resolved.from ?? "").trim();
  const dateToInput = (resolved.to ?? "").trim();
  const dateFrom = toDayIsoBoundary(dateFromInput, false);
  const dateTo = toDayIsoBoundary(dateToInput, true);
  const currentPage = Math.max(1, parseInt(resolved.page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  // ── Fetch orders + stats in parallel ──
  const { status: statusFilter, postFilter } = statusTabToFilter(statusTab);

  const [{ orders: fetchedOrders, totalCount }, stats] = await Promise.all([
    getPhysicalOrders({
      status: statusFilter,
      paymentMethod: payment || undefined,
      carrier: carrier || undefined,
      dateFrom,
      dateTo,
      search: search || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    getOrderStats(),
  ]);

  // Áp post-filter cho 2 tab "shipped"/"delivered" (xem comment ở statusTabToFilter).
  const orders = postFilter ? fetchedOrders.filter(postFilter) : fetchedOrders;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ── Build query-string preserver ──
  function buildHref(overrides: Record<string, string | null>): string {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusTab !== "all") params.set("status", statusTab);
    if (payment) params.set("payment", payment);
    if (carrier) params.set("carrier", carrier);
    if (dateFromInput) params.set("from", dateFromInput);
    if (dateToInput) params.set("to", dateToInput);
    if (currentPage > 1) params.set("page", String(currentPage));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    return qs ? `/admin/orders/physical?${qs}` : "/admin/orders/physical";
  }

  const hasAnyFilter =
    !!search ||
    statusTab !== "all" ||
    !!payment ||
    !!carrier ||
    !!dateFromInput ||
    !!dateToInput;

  return (
    <div>
      <TopBar
        title="Đơn hàng vật lý"
        subtitle="Sách + merch + đơn mixed"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Stats cards row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pending payment */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.12)" }}
              >
                <Clock size={17} className="text-[#f59e0b]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.pendingPayment.toLocaleString("vi-VN")}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Hôm nay chờ thanh toán
            </div>
          </div>

          {/* Ready to ship */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,168,67,0.12)" }}
              >
                <Package size={17} className="text-[#D4A843]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.paidAwaitingShip.toLocaleString("vi-VN")}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Chờ ship</div>
          </div>

          {/* In transit */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                <Truck size={17} className="text-[#3b82f6]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.inTransit.toLocaleString("vi-VN")}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Đang giao</div>
          </div>

          {/* Delivered today */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.12)" }}
              >
                <CheckCircle size={17} className="text-[#22c55e]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.deliveredToday.toLocaleString("vi-VN")}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Đã giao hôm nay</div>
          </div>
        </div>

        {/* ── Header row ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-white text-base">
              Danh sách đơn vật lý
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalCount.toLocaleString("vi-VN")} đơn (sau khi áp dụng bộ lọc)
            </p>
          </div>
          {hasAnyFilter && (
            <Link
              href="/admin/orders/physical"
              className="text-xs text-gray-400 hover:text-[#D4A843] transition-colors"
            >
              Xoá tất cả bộ lọc
            </Link>
          )}
        </div>

        {/* ── Status chips ── */}
        <div
          className="flex flex-wrap items-center gap-1.5 rounded-xl p-3"
          style={{
            background: "#161616",
            border: "1px solid #2a2a2a",
          }}
        >
          {STATUS_TABS.map((tab) => {
            const active = statusTab === tab.value;
            return (
              <Link
                key={tab.value}
                href={buildHref({
                  status: tab.value === "all" ? null : tab.value,
                  page: null,
                })}
                className={
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors " +
                  (active
                    ? "bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30"
                    : "text-gray-400 border border-transparent hover:bg-white/5 hover:text-white")
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* ── Filter row: date + carrier + payment + search ── */}
        <form
          action="/admin/orders/physical"
          method="GET"
          className="flex flex-wrap items-center gap-3 rounded-xl p-3"
          style={{
            background: "#161616",
            border: "1px solid #2a2a2a",
          }}
        >
          {/* Preserve status tab via hidden input */}
          {statusTab !== "all" && (
            <input type="hidden" name="status" value={statusTab} />
          )}

          {/* Date range */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Từ</label>
            <input
              type="date"
              name="from"
              defaultValue={dateFromInput}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 focus:outline-none focus:border-[#D4A843]/40"
            />
            <label className="text-xs text-gray-500">đến</label>
            <input
              type="date"
              name="to"
              defaultValue={dateToInput}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 focus:outline-none focus:border-[#D4A843]/40"
            />
          </div>

          {/* Carrier */}
          <select
            name="carrier"
            defaultValue={carrier}
            className="px-3 py-1.5 rounded-lg text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 focus:outline-none focus:border-[#D4A843]/40"
          >
            {CARRIER_OPTIONS.map((c) => (
              <option key={c.value || "_all"} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Payment method */}
          <select
            name="payment"
            defaultValue={payment}
            className="px-3 py-1.5 rounded-lg text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 focus:outline-none focus:border-[#D4A843]/40"
          >
            {PAYMENT_OPTIONS.map((p) => (
              <option key={p.value || "_all"} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Search box */}
          <div className="relative ml-auto">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Tìm mã đơn / SĐT / email..."
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#D4A843]/40 w-64"
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-[#2a2a2a] bg-[#0f0f0f] text-gray-300 hover:bg-white/5"
          >
            Áp dụng
          </Button>
          {(search ||
            payment ||
            carrier ||
            dateFromInput ||
            dateToInput) && (
            <Link
              href={buildHref({
                q: null,
                payment: null,
                carrier: null,
                from: null,
                to: null,
                page: null,
              })}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Xoá lọc
            </Link>
          )}
        </form>

        {/* ── Table or empty state ── */}
        {orders.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center rounded-xl"
            style={{
              background: "#161616",
              border: "1px solid #2a2a2a",
            }}
          >
            <Package size={40} className="text-gray-700 mb-3" />
            <p className="text-gray-400 text-sm mb-1">
              {hasAnyFilter
                ? "Không có đơn hàng phù hợp với bộ lọc."
                : "Chưa có đơn hàng vật lý nào."}
            </p>
            <p className="text-xs text-gray-600">
              {hasAnyFilter
                ? "Thử xoá bớt filter hoặc đổi khoảng ngày."
                : "Đơn sách/merch/mixed sẽ tự động hiện ở đây."}
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "#161616",
              border: "1px solid #2a2a2a",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <tr className="text-left text-xs text-gray-400">
                    <th className="px-3 py-3 font-medium w-8">
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả"
                        className="rounded border-[#2a2a2a] bg-[#0f0f0f]"
                        disabled
                        title="Bulk action sẽ bật ở iteration kế tiếp"
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">Mã đơn</th>
                    <th className="px-3 py-3 font-medium">Khách hàng</th>
                    <th className="px-3 py-3 font-medium">Sản phẩm</th>
                    <th className="px-3 py-3 font-medium text-right">Tổng</th>
                    <th className="px-3 py-3 font-medium">Thanh toán</th>
                    <th className="px-3 py-3 font-medium">Trạng thái</th>
                    <th className="px-3 py-3 font-medium">Vận chuyển</th>
                    <th className="px-3 py-3 font-medium">Ngày đặt</th>
                    <th className="px-3 py-3 font-medium text-right">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const itemCount = o.items.reduce(
                      (sum, it) => sum + (it.quantity ?? 0),
                      0,
                    );
                    const firstItem = o.items[0]?.name ?? "—";
                    const restItems = o.items.length - 1;
                    const orderBadge =
                      ORDER_STATUS_BADGE[o.status] ?? {
                        label: o.status,
                        className:
                          "border border-gray-700 bg-gray-800 text-gray-400",
                      };
                    const paymentBadge = o.payment_method
                      ? (PAYMENT_BADGE[o.payment_method] ?? {
                          label: o.payment_method,
                          className:
                            "border border-gray-700 bg-gray-800 text-gray-300",
                        })
                      : null;
                    const shippingBadge = o.shipping_status
                      ? (SHIPPING_STATUS_BADGE[o.shipping_status] ?? {
                          label: o.shipping_status,
                          className:
                            "border border-gray-700 bg-gray-800 text-gray-300",
                        })
                      : null;

                    // Lấy shipment mới nhất để hiện tracking link.
                    const latestShipment =
                      o.shipments.length > 0
                        ? o.shipments[o.shipments.length - 1]
                        : null;
                    const canMarkShipped =
                      canWrite &&
                      o.status === "paid" &&
                      (!o.shipping_status ||
                        ["pending", "ready_to_ship"].includes(
                          o.shipping_status,
                        ));

                    return (
                      <tr
                        key={o.id}
                        className="border-t border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors"
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Chọn đơn ${o.order_code}`}
                            className="rounded border-[#2a2a2a] bg-[#0f0f0f]"
                            disabled
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/admin/orders/physical/${o.id}`}
                            className="font-mono text-xs font-medium text-white hover:text-[#D4A843] transition-colors"
                          >
                            {o.order_code}
                          </Link>
                          {o.order_type === "mixed" && (
                            <div className="mt-0.5">
                              <Badge
                                variant="outline"
                                className="rounded-full px-1.5 py-0 text-[10px] border-purple-800/40 bg-purple-900/30 text-purple-300"
                              >
                                MIXED
                              </Badge>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-white text-sm">
                            {o.shipping_full_name ||
                              o.customer_name ||
                              "—"}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {o.shipping_phone ||
                              o.customer_phone ||
                              o.customer_email ||
                              "—"}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-xs text-gray-300">
                            {itemCount.toLocaleString("vi-VN")} sản phẩm
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">
                            {firstItem}
                            {restItems > 0 ? ` + ${restItems} khác...` : ""}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-[#D4A843] font-medium whitespace-nowrap">
                          {formatPrice(o.amount)}
                        </td>
                        <td className="px-3 py-3">
                          {paymentBadge ? (
                            <Badge
                              className={
                                "rounded-full px-2 py-0.5 text-[11px] " +
                                paymentBadge.className
                              }
                            >
                              {paymentBadge.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            className={
                              "rounded-full px-2 py-0.5 text-[11px] " +
                              orderBadge.className
                            }
                          >
                            {orderBadge.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            {o.shipping_carrier ? (
                              <span className="text-xs text-gray-300 uppercase">
                                {o.shipping_carrier}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-600">
                                Chưa gán
                              </span>
                            )}
                            {shippingBadge && (
                              <Badge
                                className={
                                  "rounded-full px-2 py-0.5 text-[10px] w-fit " +
                                  shippingBadge.className
                                }
                              >
                                {shippingBadge.label}
                              </Badge>
                            )}
                            {latestShipment?.tracking_url && (
                              <a
                                href={latestShipment.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-[#D4A843] hover:underline w-fit"
                              >
                                Tracking
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(o.created_at)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/orders/physical/${o.id}`}
                              aria-label="Xem chi tiết"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye size={14} />
                            </Link>
                            {canMarkShipped ? (
                              <Link
                                href={`/admin/orders/physical/${o.id}?action=mark-shipped`}
                                aria-label="Đánh dấu đã ship"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-[#D4A843] hover:bg-white/5 transition-colors"
                                title="Đánh dấu đã ship"
                              >
                                <Truck size={14} />
                              </Link>
                            ) : null}
                            {o.status === "pending" && (
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-amber-400/70"
                                title="Đơn chờ thanh toán"
                              >
                                <AlertCircle size={14} />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-xs text-gray-400">
                <div>
                  Trang <span className="text-white">{currentPage}</span> /{" "}
                  {totalPages} · Hiển thị {orders.length} /{" "}
                  {totalCount.toLocaleString("vi-VN")} đơn
                </div>
                <div className="flex items-center gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={buildHref({
                        page:
                          currentPage - 1 === 1
                            ? null
                            : String(currentPage - 1),
                      })}
                      className="px-3 py-1.5 rounded-md border border-[#2a2a2a] text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      ← Trước
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 rounded-md border border-[#2a2a2a] text-gray-600 cursor-not-allowed">
                      ← Trước
                    </span>
                  )}
                  {currentPage < totalPages ? (
                    <Link
                      href={buildHref({ page: String(currentPage + 1) })}
                      className="px-3 py-1.5 rounded-md border border-[#2a2a2a] text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      Sau →
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 rounded-md border border-[#2a2a2a] text-gray-600 cursor-not-allowed">
                      Sau →
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
