"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  Calendar,
  RefreshCw,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_email: string | null;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

// ─── Action config ──────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: "", label: "Tất cả hành động" },
  { value: "user.delete", label: "Xoá người dùng" },
  { value: "user.role_change", label: "Đổi vai trò" },
  { value: "user.tier_change", label: "Đổi hạng" },
  { value: "order.confirm", label: "Xác nhận đơn" },
  { value: "order.delete", label: "Xoá đơn hàng" },
  { value: "course.delete", label: "Xoá khoá học" },
  { value: "course.duplicate", label: "Nhân bản khoá học" },
  { value: "enrollment.create", label: "Cấp quyền truy cập" },
  { value: "enrollment.delete", label: "Thu hồi quyền" },
  { value: "email.campaign_send", label: "Gửi chiến dịch" },
  { value: "payment.received", label: "Nhận thanh toán" },
  { value: "account.delete", label: "Xoá tài khoản" },
  { value: "auth.login_failed", label: "Đăng nhập thất bại" },
  { value: "auth.rate_limited", label: "Giới hạn truy cập" },
  { value: "webhook.auth_failed", label: "Webhook lỗi xác thực" },
];

type ActionCategory = "create" | "update" | "delete" | "auth" | "system";

function getActionCategory(action: string): ActionCategory {
  if (
    action.includes("create") ||
    action.includes("confirm") ||
    action.includes("campaign_send") ||
    action.includes("duplicate") ||
    action.includes("received")
  )
    return "create";
  if (
    action.includes("delete") ||
    action.includes("revoke") ||
    action.includes("ban")
  )
    return "delete";
  if (
    action.includes("login") ||
    action.includes("rate_limited") ||
    action.includes("auth") ||
    action.includes("webhook")
  )
    return "auth";
  if (
    action.includes("update") ||
    action.includes("change") ||
    action.includes("toggle")
  )
    return "update";
  return "system";
}

const CATEGORY_STYLES: Record<ActionCategory, string> = {
  create: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  update: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  delete: "bg-red-500/15 text-red-400 border-red-500/30",
  auth: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  system: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getActionLabel(action: string): string {
  const found = ACTION_OPTIONS.find((o) => o.value === action);
  return found?.label || action;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "vừa xong";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;

  const years = Math.floor(months / 12);
  return `${years} năm trước`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDetails(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    parts.push(`${key}: ${String(value)}`);
  }
  return parts.join(", ");
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (actionFilter) params.set("action", actionFilter);
      if (dateFrom) params.set("from", new Date(dateFrom).toISOString());
      if (dateTo) {
        // Set to end of day
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        params.set("to", end.toISOString());
      }

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Lỗi tải dữ liệu");
      }

      const data: AuditLogResponse = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [actionFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Action filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#D4A843]/50 transition-colors"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-500" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Từ ngày"
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#D4A843]/50 transition-colors"
          />
          <span className="text-gray-500 text-xs">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Đến ngày"
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#D4A843]/50 transition-colors"
          />
        </div>

        {/* Refresh */}
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 text-xs rounded-lg px-3 py-2 hover:text-white hover:border-[#3a3a3a] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>

        {/* Total count */}
        <span className="text-xs text-gray-500 ml-auto">
          {total} bản ghi
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#111] text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                <th className="text-left px-4 py-3 font-medium">
                  Người dùng
                </th>
                <th className="text-left px-4 py-3 font-medium">Hành động</th>
                <th className="text-left px-4 py-3 font-medium">Đối tượng</th>
                <th className="text-left px-4 py-3 font-medium">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Loader2
                      size={20}
                      className="animate-spin text-[#D4A843] mx-auto"
                    />
                    <p className="text-gray-500 text-xs mt-2">
                      Đang tải...
                    </p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-red-400 text-sm"
                  >
                    {error}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-gray-500 text-sm"
                  >
                    Chưa có bản ghi nào
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const category = getActionCategory(log.action);
                  return (
                    <tr
                      key={log.id}
                      className="border-t border-[#1a1a1a] hover:bg-[#111] transition-colors"
                    >
                      {/* Thời gian */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div
                          className="text-gray-300 text-xs"
                          title={formatDateTime(log.created_at)}
                        >
                          {relativeTime(log.created_at)}
                        </div>
                        <div className="text-gray-500 text-[10px] mt-0.5">
                          {formatDateTime(log.created_at)}
                        </div>
                      </td>

                      {/* Người dùng */}
                      <td className="px-4 py-3">
                        <div className="text-gray-200 text-xs">
                          {log.admin_name}
                        </div>
                        {log.ip_address && (
                          <div className="text-gray-500 text-[10px] mt-0.5 font-mono">
                            {log.ip_address}
                          </div>
                        )}
                      </td>

                      {/* Hành động */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[category]}`}
                        >
                          {getActionLabel(log.action)}
                        </span>
                      </td>

                      {/* Đối tượng */}
                      <td className="px-4 py-3">
                        <div className="text-gray-300 text-xs">
                          {log.target_type}
                        </div>
                        <div className="text-gray-500 text-[10px] mt-0.5 font-mono truncate max-w-[200px]">
                          {log.target_id}
                        </div>
                      </td>

                      {/* Chi tiết */}
                      <td className="px-4 py-3">
                        <div className="text-gray-400 text-[11px] max-w-[300px] truncate">
                          {formatDetails(log.details)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Trang {page} / {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-[#3a3a3a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  disabled={loading}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    pageNum === page
                      ? "bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30"
                      : "border border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-[#3a3a3a]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-[#3a3a3a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
