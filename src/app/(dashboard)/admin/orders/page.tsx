"use client";

import { useState, useMemo } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  ShoppingCart,
  TrendingUp,
  Clock,
  XCircle,
  Search,
  ChevronDown,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "pending" | "paid" | "failed";
type DateRange = "today" | "7d" | "30d" | "all";

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  product: string;
  amount: number;
  status: OrderStatus;
  createdAt: string; // ISO string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-001",
    customerName: "Nguyễn Văn An",
    customerEmail: "an.nguyen@gmail.com",
    product: "Quyền Đồng Hành (1 năm)",
    amount: 4_990_000,
    status: "paid",
    createdAt: "2026-05-09T08:15:00",
  },
  {
    id: "ORD-002",
    customerName: "Trần Thị Bình",
    customerEmail: "binh.tran@gmail.com",
    product: "Digital Product Starter",
    amount: 1_990_000,
    status: "pending",
    createdAt: "2026-05-09T09:42:00",
  },
  {
    id: "ORD-003",
    customerName: "Lê Hoàng Cường",
    customerEmail: "cuong.le@gmail.com",
    product: "Khoá học Marketing 0đ",
    amount: 990_000,
    status: "paid",
    createdAt: "2026-05-08T14:30:00",
  },
  {
    id: "ORD-004",
    customerName: "Phạm Thị Duyên",
    customerEmail: "duyen.pham@outlook.com",
    product: "Quyền Đồng Hành (1 năm)",
    amount: 4_990_000,
    status: "failed",
    createdAt: "2026-05-08T11:05:00",
  },
  {
    id: "ORD-005",
    customerName: "Hoàng Minh Đức",
    customerEmail: "duc.hoang@gmail.com",
    product: "Digital Product Starter",
    amount: 1_990_000,
    status: "paid",
    createdAt: "2026-05-07T16:22:00",
  },
  {
    id: "ORD-006",
    customerName: "Vũ Thị Hà",
    customerEmail: "ha.vu@gmail.com",
    product: "Khoá học Marketing 0đ",
    amount: 990_000,
    status: "pending",
    createdAt: "2026-05-09T10:55:00",
  },
  {
    id: "ORD-007",
    customerName: "Đỗ Quốc Hùng",
    customerEmail: "hung.do@gmail.com",
    product: "Quyền Đồng Hành (6 tháng)",
    amount: 2_990_000,
    status: "paid",
    createdAt: "2026-05-06T09:00:00",
  },
  {
    id: "ORD-008",
    customerName: "Ngô Thị Lan",
    customerEmail: "lan.ngo@gmail.com",
    product: "Digital Product Starter",
    amount: 1_990_000,
    status: "failed",
    createdAt: "2026-05-05T13:18:00",
  },
  {
    id: "ORD-009",
    customerName: "Bùi Thanh Long",
    customerEmail: "long.bui@gmail.com",
    product: "Quyền Đồng Hành (1 năm)",
    amount: 4_990_000,
    status: "paid",
    createdAt: "2026-05-04T07:45:00",
  },
  {
    id: "ORD-010",
    customerName: "Cao Thị Mai",
    customerEmail: "mai.cao@gmail.com",
    product: "Khoá học Marketing 0đ",
    amount: 990_000,
    status: "pending",
    createdAt: "2026-05-09T11:30:00",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + "₫";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; color: string }
> = {
  pending: {
    label: "Chờ xử lý",
    bg: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
  },
  paid: {
    label: "Thành công",
    bg: "rgba(34,197,94,0.1)",
    color: "#22c55e",
  },
  failed: {
    label: "Thất bại",
    bg: "rgba(239,68,68,0.1)",
    color: "#ef4444",
  },
};

function isWithinRange(iso: string, range: DateRange): boolean {
  const date = new Date(iso);
  const now = new Date("2026-05-09T23:59:59"); // pinned to mock date
  if (range === "all") return true;
  if (range === "today") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }
  const days = range === "7d" ? 7 : 30;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date >= cutoff;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

interface ConfirmModalProps {
  order: Order;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ order, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="card-dark w-full max-w-md p-6 relative"
        style={{ boxShadow: "0 0 0 1px #2a2a2a, 0 24px 48px rgba(0,0,0,0.6)" }}
      >
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Warning icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(245,158,11,0.12)" }}
        >
          <AlertTriangle size={24} className="text-[#f59e0b]" />
        </div>

        <h2 className="text-lg font-bold text-white mb-1">
          Xác nhận thủ công đơn hàng
        </h2>
        <p className="text-sm text-gray-400 mb-5">
          Thao tác này sẽ đánh dấu đơn hàng là{" "}
          <span className="text-[#22c55e] font-medium">Đã thanh toán</span> mà
          không cần xác minh từ cổng thanh toán. Chỉ dùng khi bạn đã xác nhận
          chuyển khoản thành công.
        </p>

        {/* Order info */}
        <div
          className="rounded-xl p-4 mb-5 text-sm space-y-2"
          style={{ background: "#111", border: "1px solid #2a2a2a" }}
        >
          <div className="flex justify-between">
            <span className="text-gray-500">Mã đơn</span>
            <span className="text-white font-mono font-medium">{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Khách hàng</span>
            <span className="text-white">{order.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Sản phẩm</span>
            <span className="text-white text-right max-w-[55%]">
              {order.product}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Số tiền</span>
            <span className="text-[#f59e0b] font-bold">
              {formatCurrency(order.amount)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 transition-colors"
            style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }}
          >
            Huỷ bỏ
          </button>
          <button onClick={onConfirm} className="btn-green flex-1 justify-center">
            <CheckCircle size={15} />
            Xác nhận ngay
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [confirmTarget, setConfirmTarget] = useState<Order | null>(null);

  // Derived stats (always from original mock, not filtered)
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.status === "paid").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const failedOrders = orders.filter((o) => o.status === "failed").length;

  // Filtered list
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      const matchDate = isWithinRange(o.createdAt, dateRange);
      return matchSearch && matchStatus && matchDate;
    });
  }, [orders, search, statusFilter, dateRange]);

  function handleConfirm() {
    if (!confirmTarget) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === confirmTarget.id ? { ...o, status: "paid" as OrderStatus } : o
      )
    );
    setConfirmTarget(null);
  }

  // Revenue for this month (mock)
  const revenueThisMonth = 45_820_000;

  return (
    <>
      {confirmTarget && (
        <ConfirmModal
          order={confirmTarget}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      <div>
        <TopBar
          title="Quản lý Đơn hàng"
          subtitle="Theo dõi thanh toán và xác nhận thủ công"
        />

        <div className="p-6 max-w-7xl mx-auto space-y-6">

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.12)" }}
                >
                  <CheckCircle size={17} className="text-[#22c55e]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{paidOrders}</div>
              <div className="text-xs text-gray-500 mt-0.5">Đã thanh toán</div>
            </div>

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
                {pendingOrders}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Chờ xử lý</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.12)" }}
                >
                  <XCircle size={17} className="text-[#ef4444]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{failedOrders}</div>
              <div className="text-xs text-gray-500 mt-0.5">Thất bại</div>
            </div>
          </div>

          {/* ── Revenue summary ── */}
          <div
            className="card-dark p-5 flex flex-col md:flex-row md:items-center gap-4"
            style={{
              background:
                "linear-gradient(135deg, #1a1a1a 0%, rgba(34,197,94,0.04) 100%)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(34,197,94,0.12)" }}
            >
              <TrendingUp size={22} className="text-[#22c55e]" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-0.5">
                Doanh thu tháng này (5/2026)
              </div>
              <div className="text-3xl font-bold text-white">
                {formatCurrency(revenueThisMonth)}
              </div>
            </div>
            <div className="text-right">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
                style={{
                  background: "rgba(34,197,94,0.1)",
                  color: "#22c55e",
                  border: "1px solid rgba(34,197,94,0.2)",
                }}
              >
                <TrendingUp size={13} />
                +23% so với tháng trước
              </div>
              <div className="text-xs text-gray-600 mt-1.5">
                Tháng 4/2026: {formatCurrency(37_250_000)}
              </div>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                className="input-dark pl-9"
                placeholder="Tìm theo tên, email hoặc mã đơn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status dropdown */}
            <div className="relative">
              <select
                className="input-dark pr-8 appearance-none cursor-pointer"
                style={{ width: 180 }}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as OrderStatus | "all")
                }
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="paid">Thành công</option>
                <option value="failed">Thất bại</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>

            {/* Date range */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
              {(
                [
                  { value: "today", label: "Hôm nay" },
                  { value: "7d", label: "7 ngày" },
                  { value: "30d", label: "30 ngày" },
                  { value: "all", label: "Tất cả" },
                ] as { value: DateRange; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  className="px-4 py-2 text-xs font-medium transition-colors"
                  style={{
                    background:
                      dateRange === opt.value
                        ? "rgba(34,197,94,0.12)"
                        : "#1a1a1a",
                    color: dateRange === opt.value ? "#22c55e" : "#6b7280",
                    borderRight: "1px solid #2a2a2a",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Export */}
            <button
              className="btn-gold shrink-0"
              style={{ padding: "8px 16px" }}
            >
              <Download size={14} />
              Xuất Excel
            </button>
          </div>

          {/* ── Orders table ── */}
          <div className="card-dark overflow-hidden">
            {/* Result count */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid #2a2a2a" }}
            >
              <span className="text-xs text-gray-500">
                Hiển thị{" "}
                <span className="text-white font-medium">{filtered.length}</span>{" "}
                đơn hàng
              </span>
              {pendingOrders > 0 && (
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  {pendingOrders} đơn cần xác nhận
                </span>
              )}
            </div>

            {/* Table wrapper */}
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
                      "Thời gian",
                      "Hành động",
                    ].map((col) => (
                      <th
                        key={col}
                        className="text-left text-xs font-semibold text-gray-500 px-5 py-3 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-gray-600 text-sm"
                      >
                        Không tìm thấy đơn hàng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((order, idx) => (
                      <tr
                        key={order.id}
                        className="hover:bg-white/[0.02] transition-colors"
                        style={{
                          borderBottom:
                            idx < filtered.length - 1
                              ? "1px solid #1f1f1f"
                              : "none",
                        }}
                      >
                        {/* Mã đơn */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs text-gray-400">
                            {order.id}
                          </span>
                        </td>

                        {/* Khách hàng */}
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-white text-sm">
                            {order.customerName}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {order.customerEmail}
                          </div>
                        </td>

                        {/* Sản phẩm */}
                        <td className="px-5 py-3.5">
                          <span className="text-gray-300 text-sm">
                            {order.product}
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

                        {/* Thời gian */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-xs text-gray-500">
                            {formatDateTime(order.createdAt)}
                          </span>
                        </td>

                        {/* Hành động */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {order.status === "pending" && (
                              <button
                                onClick={() => setConfirmTarget(order)}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                                style={{
                                  background: "rgba(245,158,11,0.1)",
                                  color: "#f59e0b",
                                  border: "1px solid rgba(245,158,11,0.2)",
                                }}
                              >
                                <CheckCircle size={12} />
                                Xác nhận thủ công
                              </button>
                            )}
                            <button
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-gray-400 hover:text-white"
                              style={{
                                background: "#1f1f1f",
                                border: "1px solid #2a2a2a",
                              }}
                            >
                              <Eye size={12} />
                              Xem chi tiết
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
