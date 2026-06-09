"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Mail,
  Clock,
  ShoppingCart,
  DollarSign,
  Building2,
} from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import ContactAssignSelect from "./ContactAssignSelect";
import StatusInlineSelect from "./StatusInlineSelect";
import SourceInlineSelect from "./SourceInlineSelect";
import CopyablePhone from "@/components/crm/CopyablePhone";
import type { SalesUser } from "@/lib/sales";

/* ---------- Types ---------- */

export interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  assigned_to: string | null;
  assigned_profile: { full_name: string | null } | null;
  journey_stage: string;
  lead_score: number;
  utm_source: string | null;
}

export interface OrderSummary {
  paidCount: number;
  pendingCount: number;
  totalPaid: number;
}

/* ---------- Config ---------- */

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  new: {
    label: "Mới",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
  },
  contacted: {
    label: "Đã liên hệ",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
  },
  qualified: {
    label: "Tiềm năng",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.25)",
  },
  negotiation: {
    label: "Đàm phán",
    color: "#f97316",
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.25)",
  },
  won: {
    label: "Thành công",
    color: "#D4A843",
    bg: "rgba(212,168,67,0.1)",
    border: "rgba(212,168,67,0.25)",
  },
  lost: {
    label: "Mất",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
  },
  churned: {
    label: "Rời bỏ",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
    border: "rgba(107,114,128,0.25)",
  },
};

// Note: the source pill palette used to live here, but it now lives
// inline in `SourceInlineSelect.tsx` (the source column is rendered by
// that client component). Kept removed to avoid two sources of truth.

const journeyStageConfig: Record<
  string,
  { label: string; color: string }
> = {
  visitor: { label: "KH Mục tiêu", color: "#6b7280" },
  lead: { label: "KH Tiềm năng", color: "#3b82f6" },
  contacted: { label: "Người mua hàng", color: "#f59e0b" },
  qualified: { label: "Khách hàng", color: "#a855f7" },
  negotiation: { label: "Hội viên", color: "#f97316" },
  customer: { label: "Người ủng hộ", color: "#D4A843" },
  advocate: { label: "Fan hâm mộ", color: "#22c55e" },
};

/* ---------- Helpers ---------- */

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
}

function formatVND(amount: number): string {
  if (!amount) return "0đ";
  return amount.toLocaleString("vi-VN") + "đ";
}

/* ---------- Props ---------- */

interface ContactsTableProps {
  contacts: Contact[];
  orderMap: Record<string, OrderSummary>;
  enrollmentMap: Record<string, number>;
  salesUsers: SalesUser[];
  canMutate: boolean;
  totalContacts: number;
  query: string;
  statusFilter: string;
  journeyFilter: string;
  /** Current viewer's profile id — used to gate inline editing for sales. */
  viewerId: string | null;
  /** Known `crm_sources.label` values to suggest in the source datalist. */
  existingSources: string[];
}

/* ---------- Component ---------- */

export default function ContactsTable({
  contacts,
  orderMap,
  enrollmentMap,
  salesUsers,
  canMutate,
  totalContacts,
  query,
  statusFilter,
  journeyFilter,
  viewerId,
  existingSources,
}: ContactsTableProps) {
  const columns = useMemo<ColumnDef<Contact, any>[]>(
    () => [
      /* ── Tên (+ SĐT inline cho dễ thấy, click-to-copy) ── */
      {
        accessorKey: "full_name",
        header: "Tên",
        size: 220,
        enableSorting: true,
        cell: ({ row }) => {
          const c = row.original;
          const st = statusConfig[c.status] || statusConfig.new;
          const initial = c.full_name.charAt(0).toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${st.color}, ${st.color}99)`,
                }}
              >
                {initial}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/crm/contacts/${c.id}`}
                  className="font-semibold text-white truncate block hover:underline"
                >
                  {c.full_name}
                </Link>
                {/* Phone inline under the name — most teams need to call
                    the customer faster than they need to read the company,
                    so we surface it here too (not just in the SĐT column
                    further right which can be off-screen on narrow viewports). */}
                {c.phone && (
                  <div className="mt-0.5">
                    <CopyablePhone phone={c.phone} compact />
                  </div>
                )}
                {c.company && (
                  <div className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                    <Building2 size={10} />
                    {c.company}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },

      /* ── Email ── */
      {
        accessorKey: "email",
        header: "Email",
        size: 180,
        enableSorting: true,
        cell: ({ row }) => {
          const email = row.original.email;
          if (!email)
            return <span className="text-gray-700 text-xs">&mdash;</span>;
          return (
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <Mail size={12} className="text-gray-500" />
              <span className="truncate max-w-[160px]">{email}</span>
            </div>
          );
        },
      },

      /* ── SĐT (đầy đủ + copy button — cột riêng cho ai cần scan nhanh) ── */
      {
        accessorKey: "phone",
        header: "SĐT",
        size: 180,
        enableSorting: false,
        cell: ({ row }) => {
          const phone = row.original.phone;
          if (!phone)
            return <span className="text-gray-700 text-xs">&mdash;</span>;
          return <CopyablePhone phone={phone} />;
        },
      },

      /* ── Trạng thái ── */
      {
        accessorKey: "status",
        header: "Trạng thái",
        size: 100,
        enableSorting: true,
        cell: ({ row }) => {
          const c = row.original;
          // Admin/manager can edit any contact's status. A sale rep can
          // only edit contacts they're assigned to. Anyone else sees a
          // read-only badge. The server re-checks this on every write.
          const canEdit =
            canMutate ||
            (!!viewerId && c.assigned_to === viewerId);
          return (
            <StatusInlineSelect
              contactId={c.id}
              currentStatus={c.status}
              canEdit={canEdit}
            />
          );
        },
      },

      /* ── Giai đoạn ── */
      {
        accessorKey: "journey_stage",
        header: "Giai đoạn",
        size: 100,
        enableSorting: true,
        cell: ({ row }) => {
          const js =
            journeyStageConfig[row.original.journey_stage] ||
            journeyStageConfig.visitor;
          return (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: js.color + "18",
                color: js.color,
                border: `1px solid ${js.color}40`,
              }}
            >
              {js.label}
            </span>
          );
        },
      },

      /* ── Điểm ── */
      {
        accessorKey: "lead_score",
        header: "Điểm",
        size: 70,
        enableSorting: true,
        cell: ({ row }) => {
          const score = row.original.lead_score ?? 0;
          let cls = "text-gray-500";
          if (score >= 60) cls = "text-green-400";
          else if (score >= 30) cls = "text-amber-400";
          else if (score > 0) cls = "text-red-400";
          return <span className={`text-xs font-bold ${cls}`}>{score}</span>;
        },
      },

      /* ── Phụ trách (PROMINENT) ── */
      {
        accessorKey: "assigned_to",
        header: "Phụ trách",
        size: 160,
        enableSorting: true,
        cell: ({ row }) => {
          const c = row.original;
          const assignedName = c.assigned_profile?.full_name;
          return (
            <div
              className="flex flex-col gap-1.5 -mx-2 px-2 py-1 rounded-lg"
              style={{
                background: c.assigned_to
                  ? "rgba(212,168,67,0.06)"
                  : "rgba(245,158,11,0.04)",
              }}
            >
              {assignedName ? (
                <span className="text-xs font-bold text-[#D4A843]">
                  {assignedName}
                </span>
              ) : (
                <span
                  className="inline-flex items-center self-start px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.25)",
                  }}
                >
                  Chưa gán
                </span>
              )}
              {canMutate && (
                <ContactAssignSelect
                  contactId={c.id}
                  assignedTo={c.assigned_to}
                  salesUsers={salesUsers}
                />
              )}
            </div>
          );
        },
      },

      /* ── Đơn hàng ── */
      {
        id: "orders",
        header: "Đơn hàng",
        size: 100,
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original;
          const os = c.email ? orderMap[c.email] : null;
          const enroll = c.email ? enrollmentMap[c.email] ?? 0 : 0;
          if (!os && enroll <= 0) {
            return <span className="text-gray-700 text-xs">&mdash;</span>;
          }
          return (
            <div className="space-y-0.5">
              {os && (
                <div className="flex items-center gap-1.5 text-xs">
                  <ShoppingCart size={12} className="text-gray-500" />
                  <span>
                    {os.paidCount > 0 && (
                      <span className="text-amber-400 font-medium">
                        {os.paidCount} đã TT
                      </span>
                    )}
                    {os.paidCount > 0 && os.pendingCount > 0 && (
                      <span className="text-gray-500"> / </span>
                    )}
                    {os.pendingCount > 0 && (
                      <span className="text-yellow-400 font-medium">
                        {os.pendingCount} chờ
                      </span>
                    )}
                  </span>
                </div>
              )}
              {enroll > 0 && (
                <div className="text-[11px] text-blue-400">
                  {enroll} khoá học
                </div>
              )}
            </div>
          );
        },
      },

      /* ── Doanh thu ── */
      {
        id: "revenue",
        header: "Doanh thu",
        size: 120,
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original;
          const total = c.email ? orderMap[c.email]?.totalPaid ?? 0 : 0;
          if (total <= 0) {
            return <span className="text-gray-700 text-xs">&mdash;</span>;
          }
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <DollarSign size={12} className="text-amber-500" />
              <span className="text-amber-400 font-semibold">
                {formatVND(total)}
              </span>
            </div>
          );
        },
      },

      /* ── Nguồn ── */
      {
        accessorKey: "source",
        header: "Nguồn",
        size: 90,
        enableSorting: true,
        cell: ({ row }) => {
          const c = row.original;
          const canEdit =
            canMutate ||
            (!!viewerId && c.assigned_to === viewerId);
          return (
            <SourceInlineSelect
              contactId={c.id}
              currentSource={c.source}
              canEdit={canEdit}
              existingSources={existingSources}
            />
          );
        },
      },

      /* ── Ngày tạo ── */
      {
        accessorKey: "created_at",
        header: "Ngày tạo",
        size: 100,
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <Clock size={12} className="text-gray-500" />
            {formatShortDate(row.original.created_at)}
          </div>
        ),
      },
    ],
    [orderMap, enrollmentMap, salesUsers, canMutate, viewerId, existingSources]
  );

  const hasFilters = !!(query || statusFilter || journeyFilter);

  return (
    <div className="card-dark overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
        <h3 className="font-semibold text-white text-sm">
          Danh sách khách hàng
        </h3>
        <span className="text-xs text-gray-500">
          {contacts.length} kết quả
        </span>
      </div>

      <DataTable
        columns={columns}
        data={contacts}
        stickyFirstColumn
        emptyMessage={
          hasFilters
            ? "Không tìm thấy khách hàng phù hợp."
            : "Chưa có khách hàng nào. Hãy thêm khách hàng đầu tiên!"
        }
      />

      {/* Footer */}
      {contacts.length > 0 && (
        <div className="px-4 py-3 border-t border-[#2a2a2a] flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Hiển thị{" "}
            <span className="text-white font-semibold">
              {contacts.length}
            </span>{" "}
            khách hàng
            {hasFilters && " (đã lọc)"}
          </p>
          {hasFilters && (
            <Link
              href="/crm/contacts"
              className="text-xs text-[#D4A843] hover:underline"
            >
              Xoá bộ lọc
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
