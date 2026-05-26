"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  DataTable,
  createColumnHelper,
  type ColumnDef,
} from "@/components/ui/DataTable";
import DeleteOrderButton from "@/components/admin/DeleteOrderButton";
import ConfirmOrderButton from "@/components/admin/ConfirmOrderButton";
import QRCodeButton from "@/components/admin/QRCodeButton";
import OrderAssignSelect from "./OrderAssignSelect";
import type { SalesUser } from "@/lib/sales";
import {
  CreditCard,
  Calendar,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type OrderStatus = "pending" | "paid" | "cancelled" | "refunded";

export interface OrderRow {
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
  assigned_to: string | null;
  assigned_profile: { full_name: string | null } | null;
  products: { title: string } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Column definitions ─────────────────────────────────────────────────────

const columnHelper = createColumnHelper<OrderRow>();

function buildColumns({
  canWrite,
  canConfirm,
  salesUsers,
  bankAccount,
  bankCode,
}: {
  canWrite: boolean;
  canConfirm: boolean;
  salesUsers: SalesUser[];
  bankAccount: string;
  bankCode: string;
}): ColumnDef<OrderRow, any>[] {
  return [
    // Mã đơn
    columnHelper.accessor("order_code", {
      header: "Mã đơn",
      size: 140,
      enableSorting: true,
      cell: (info) => (
        <span className="font-mono text-xs text-gray-400 whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),

    // Khách hàng
    columnHelper.display({
      id: "customer",
      header: "Khách hàng",
      size: 200,
      enableSorting: false,
      cell: ({ row }) => {
        const o = row.original;
        return (
          <div>
            <div className="font-medium text-white text-sm">
              {o.customer_name ?? "—"}
            </div>
            {o.customer_email && (
              <div className="text-xs text-gray-500 mt-0.5">
                {o.customer_email}
              </div>
            )}
            {o.customer_phone && (
              <div className="text-xs text-gray-500">
                {o.customer_phone}
              </div>
            )}
          </div>
        );
      },
    }),

    // Sản phẩm
    columnHelper.display({
      id: "product",
      header: "Sản phẩm",
      size: 180,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-gray-300 text-sm">
          {row.original.products?.title ?? "—"}
        </span>
      ),
    }),

    // Số tiền
    columnHelper.accessor("amount", {
      header: "Số tiền",
      size: 120,
      enableSorting: true,
      cell: (info) => (
        <span className="font-bold text-white whitespace-nowrap">
          {formatCurrency(info.getValue())}
        </span>
      ),
      meta: { className: "text-right" },
    }),

    // Trạng thái
    columnHelper.accessor("status", {
      header: "Trạng thái",
      size: 130,
      enableSorting: true,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),

    // Sale
    columnHelper.display({
      id: "sale",
      header: "Sale",
      size: 160,
      enableSorting: false,
      cell: ({ row }) => {
        const o = row.original;
        return (
          <div className="flex flex-col gap-1.5 whitespace-nowrap">
            {o.assigned_to ? (
              <span className="text-xs text-gray-300">
                {o.assigned_profile?.full_name ??
                  o.assigned_to.slice(0, 8)}
              </span>
            ) : (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                Chưa gán
              </span>
            )}
            {canWrite && (
              <OrderAssignSelect
                orderId={o.id}
                assignedTo={o.assigned_to}
                salesUsers={salesUsers}
              />
            )}
          </div>
        );
      },
    }),

    // Thanh toán
    columnHelper.display({
      id: "payment",
      header: "Thanh toán",
      size: 150,
      enableSorting: false,
      cell: ({ row }) => {
        const o = row.original;
        return (
          <div className="whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <CreditCard size={13} className="text-gray-500" />
              <span className="text-xs text-gray-400 capitalize">
                {o.payment_method ?? "—"}
              </span>
              {o.status === "pending" && bankAccount && bankCode && (
                <QRCodeButton
                  orderCode={o.order_code}
                  amount={o.amount}
                  customerName={o.customer_name}
                  customerEmail={o.customer_email}
                  customerPhone={o.customer_phone}
                  bankAccount={bankAccount}
                  bankCode={bankCode}
                />
              )}
            </div>
            {o.status === "paid" && o.paid_at && (
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar size={11} className="text-amber-600" />
                <span className="text-[11px] text-amber-500/70">
                  {formatDateTime(o.paid_at)}
                </span>
              </div>
            )}
          </div>
        );
      },
    }),

    // Ngày tạo
    columnHelper.accessor("created_at", {
      header: "Ngày tạo",
      size: 140,
      enableSorting: true,
      cell: (info) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatDateTime(info.getValue())}
        </span>
      ),
    }),

    // Actions
    columnHelper.display({
      id: "actions",
      header: "",
      size: 80,
      enableSorting: false,
      enableResizing: false,
      cell: ({ row }) => {
        const o = row.original;
        return (
          <div className="flex items-center gap-1 whitespace-nowrap">
            {canConfirm && o.status === "pending" && (
              <ConfirmOrderButton
                orderCode={o.order_code}
                customerName={o.customer_name}
                amount={o.amount}
              />
            )}
            {canWrite && (
              <DeleteOrderButton
                orderId={o.id}
                orderCode={o.order_code}
              />
            )}
          </div>
        );
      },
    }),
  ];
}

// ─── OrdersTable component ──────────────────────────────────────────────────

export interface OrdersTableProps {
  orders: OrderRow[];
  salesUsers: SalesUser[];
  canWrite: boolean;
  canConfirm: boolean;
  bankAccount: string;
  bankCode: string;
  totalPages: number;
  currentPage: number;
  query: string;
  totalFilteredOrders: number;
  pendingOrders: number;
}

export default function OrdersTable({
  orders,
  salesUsers,
  canWrite,
  canConfirm,
  bankAccount,
  bankCode,
  totalPages,
  currentPage,
  query,
  totalFilteredOrders,
  pendingOrders,
}: OrdersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const columns = buildColumns({
    canWrite,
    canConfirm,
    salesUsers,
    bankAccount,
    bankCode,
  });

  const buildPageUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page > 1) {
        params.set("page", String(page));
      } else {
        params.delete("page");
      }
      const qs = params.toString();
      return `/admin/orders${qs ? `?${qs}` : ""}`;
    },
    [searchParams]
  );

  const handlePaginationChange = useCallback(
    (pageIndex: number) => {
      // DataTable uses zero-based pageIndex; our URLs use 1-based page numbers
      router.push(buildPageUrl(pageIndex + 1));
    },
    [router, buildPageUrl]
  );

  const emptyMessage = query
    ? "Không tìm thấy đơn hàng nào khớp với từ khoá."
    : "Chưa có đơn hàng nào.";

  return (
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
              <span className="text-white font-medium">
                {totalFilteredOrders}
              </span>{" "}
              kết quả cho &ldquo;
              <span className="text-[#D4A843]">{query}</span>&rdquo;
            </>
          ) : (
            <>
              <span className="text-white font-medium">
                {totalFilteredOrders}
              </span>{" "}
              đơn hàng
            </>
          )}
          {totalPages > 1 && (
            <>
              {" "}
              &middot; Trang {currentPage}/{totalPages}
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

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={orders}
        emptyMessage={emptyMessage}
        stickyFirstColumn
        stickyLastColumn
        pageCount={totalPages}
        pageIndex={currentPage - 1}
        pageSize={20}
        onPaginationChange={handlePaginationChange}
      />
    </div>
  );
}
