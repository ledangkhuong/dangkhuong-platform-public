"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import AddSubscriberModal from "@/components/email/AddSubscriberModal";
import ImportSubscribersModal from "@/components/email/ImportSubscribersModal";
import {
  Users,
  UserCheck,
  UserMinus,
  AlertTriangle,
  Search,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit,
  MoreHorizontal,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  ListPlus,
  ListMinus,
  RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Subscriber {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: "active" | "unsubscribed" | "bounced";
  source: string | null;
  tags: string[] | null;
  created_at: string;
}

interface EmailList {
  id: string;
  name: string;
}

interface Stats {
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  active: {
    label: "Hoạt động",
    color: "#D4A843",
    bg: "rgba(212,168,67,0.1)",
    border: "rgba(212,168,67,0.2)",
  },
  unsubscribed: {
    label: "Huỷ đăng ký",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  bounced: {
    label: "Bounced",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SubscribersPage() {
  // Data
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    unsubscribed: 0,
    bounced: 0,
  });
  const [lists, setLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 20;

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Action menus
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Bulk action state
  const [bulkListModalOpen, setBulkListModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"add_to_list" | "remove_from_list" | null>(null);
  const [bulkListId, setBulkListId] = useState("");

  // ── Fetch subscribers ──
  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (listFilter) params.set("list_id", listFilter);

      const res = await fetch(`/api/email/subscribers?${params}`);
      const data = await res.json();

      setSubscribers(data.subscribers ?? []);
      setTotalCount(data.total ?? 0);
      setTotalPages(Math.max(1, Math.ceil((data.total ?? 0) / perPage)));

      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, listFilter]);

  const fetchLists = useCallback(async () => {
    try {
      const res = await fetch("/api/email/lists");
      const data = await res.json();
      if (data.lists) setLists(data.lists);
    } catch {
      // Handle silently
    }
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, statusFilter, listFilter]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [openMenuId]);

  // ── Selection helpers ──
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === subscribers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(subscribers.map((s) => s.id)));
    }
  };

  // ── Actions ──
  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa subscriber này?")) return;
    try {
      await fetch(`/api/email/subscribers/${id}`, { method: "DELETE" });
      fetchSubscribers();
    } catch {
      // Handle silently
    }
  };

  const handleChangeStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/email/subscribers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchSubscribers();
    } catch {
      // Handle silently
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selected.size} subscriber?`)) return;
    try {
      await fetch("/api/email/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selected) }),
      });
      setSelected(new Set());
      fetchSubscribers();
    } catch {
      // Handle silently
    }
  };

  const handleBulkChangeStatus = async (newStatus: string) => {
    if (selected.size === 0) return;
    try {
      await fetch("/api/email/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_status",
          ids: Array.from(selected),
          status: newStatus,
        }),
      });
      setSelected(new Set());
      fetchSubscribers();
    } catch {
      // Handle silently
    }
  };

  const handleBulkListAction = async () => {
    if (selected.size === 0 || !bulkListId || !bulkAction) return;
    try {
      await fetch("/api/email/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: bulkAction,
          ids: Array.from(selected),
          list_id: bulkListId,
        }),
      });
      setSelected(new Set());
      setBulkListModalOpen(false);
      setBulkAction(null);
      setBulkListId("");
      fetchSubscribers();
    } catch {
      // Handle silently
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (listFilter) params.set("list_id", listFilter);
    window.open(`/api/email/subscribers/export?${params}`, "_blank");
  };

  // ── Skeleton loader ──
  const SkeletonRow = () => (
    <tr style={{ borderBottom: "1px solid #1f1f1f" }}>
      <td className="px-4 py-3"><div className="w-4 h-4 rounded bg-[#222] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="w-40 h-4 rounded bg-[#222] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="w-24 h-4 rounded bg-[#222] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="w-16 h-4 rounded bg-[#222] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="w-14 h-4 rounded bg-[#222] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="w-20 h-4 rounded bg-[#222] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="w-6 h-4 rounded bg-[#222] animate-pulse" /></td>
    </tr>
  );

  const statCards = [
    {
      label: "Tổng subscribers",
      value: stats.total,
      icon: Users,
      color: "#3b82f6",
    },
    {
      label: "Đang hoạt động",
      value: stats.active,
      icon: UserCheck,
      color: "#D4A843",
    },
    {
      label: "Huỷ đăng ký",
      value: stats.unsubscribed,
      icon: UserMinus,
      color: "#f59e0b",
    },
    {
      label: "Bounced",
      value: stats.bounced,
      icon: AlertTriangle,
      color: "#ef4444",
    },
  ];

  return (
    <div>
      <TopBar title="Subscribers" subtitle="Quản lý danh sách email" />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "20" }}
                >
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {s.value.toLocaleString("vi-VN")}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action bar */}
        <div className="card-dark p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                className="input-dark pl-9 text-sm"
                placeholder="Tìm email hoặc tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  className="input-dark text-sm pr-8 appearance-none"
                  style={{ minWidth: 140 }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="unsubscribed">Huỷ đăng ký</option>
                  <option value="bounced">Bounced</option>
                </select>
                <Filter
                  size={13}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>

              <div className="relative">
                <select
                  className="input-dark text-sm pr-8 appearance-none"
                  style={{ minWidth: 140 }}
                  value={listFilter}
                  onChange={(e) => setListFilter(e.target.value)}
                >
                  <option value="">Tất cả lists</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <Filter
                  size={13}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>

              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-400 rounded-lg transition-colors hover:text-white"
                style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }}
              >
                <Upload size={14} /> Import CSV
              </button>

              <button
                onClick={() => setAddOpen(true)}
                className="btn-green text-sm py-2"
              >
                <Plus size={15} /> Thêm subscriber
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-400 rounded-lg transition-colors hover:text-white"
                style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }}
              >
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div
            className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: "rgba(212,168,67,0.08)",
              border: "1px solid rgba(212,168,67,0.2)",
            }}
          >
            <span className="text-sm text-white font-medium">
              {selected.size} đã chọn
            </span>
            <div
              className="w-px h-5"
              style={{ background: "rgba(212,168,67,0.3)" }}
            />
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={14} /> Xoá
            </button>
            <button
              onClick={() => {
                setBulkAction("add_to_list");
                setBulkListModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <ListPlus size={14} /> Thêm vào list
            </button>
            <button
              onClick={() => {
                setBulkAction("remove_from_list");
                setBulkListModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <ListMinus size={14} /> Gỡ khỏi list
            </button>
            <button
              onClick={() => handleBulkChangeStatus("active")}
              className="flex items-center gap-1.5 text-sm text-[#D4A843] hover:text-[#B8922E] transition-colors"
            >
              <RefreshCw size={14} /> Active
            </button>
            <button
              onClick={() => handleBulkChangeStatus("unsubscribed")}
              className="flex items-center gap-1.5 text-sm text-[#f59e0b] hover:text-[#d97706] transition-colors"
            >
              <UserMinus size={14} /> Unsubscribe
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-gray-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="card-dark overflow-hidden">
          {loading ? (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  <th className="px-4 py-3 w-10" />
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Email</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Tên</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Trạng thái</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Nguồn</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Ngày đăng ký</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          ) : subscribers.length === 0 ? (
            <div className="p-12 text-center">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(59,130,246,0.1)" }}
              >
                <Mail size={28} className="text-[#3b82f6]" />
              </div>
              <p className="text-white font-medium mb-1">
                Chưa có subscriber nào
              </p>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                Thêm subscriber đầu tiên hoặc import từ CSV.
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setAddOpen(true)}
                  className="btn-green text-sm py-2"
                >
                  <Plus size={15} /> Thêm subscriber
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-400 rounded-lg transition-colors hover:text-white"
                  style={{
                    background: "#1f1f1f",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  <Upload size={14} /> Import CSV
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={
                            subscribers.length > 0 &&
                            selected.size === subscribers.length
                          }
                          onChange={toggleSelectAll}
                          className="accent-[#D4A843] w-3.5 h-3.5 cursor-pointer"
                        />
                      </th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">
                        Email
                      </th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden md:table-cell">
                        Tên
                      </th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">
                        Trạng thái
                      </th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden lg:table-cell">
                        Nguồn
                      </th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden md:table-cell">
                        Ngày đăng ký
                      </th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub, idx) => {
                      const st =
                        STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.active;
                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-[#1f1f1f] transition-colors"
                          style={{
                            borderBottom:
                              idx < subscribers.length - 1
                                ? "1px solid #1f1f1f"
                                : "none",
                          }}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(sub.id)}
                              onChange={() => toggleSelect(sub.id)}
                              className="accent-[#D4A843] w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-white text-sm font-medium">
                              {sub.email}
                            </div>
                            {/* Show name on mobile below email */}
                            {sub.full_name && (
                              <div className="text-xs text-gray-500 mt-0.5 md:hidden">
                                {sub.full_name}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-gray-300 text-sm">
                              {sub.full_name || (
                                <span className="text-gray-600">--</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{
                                background: st.bg,
                                color: st.color,
                                border: `1px solid ${st.border}`,
                              }}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-gray-400 text-sm">
                              {sub.source || (
                                <span className="text-gray-600">--</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-gray-400 text-sm">
                              {formatDate(sub.created_at)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(
                                    openMenuId === sub.id ? null : sub.id
                                  );
                                }}
                                className="text-gray-500 hover:text-white transition-colors p-1 rounded-md hover:bg-[#2a2a2a]"
                              >
                                <MoreHorizontal size={16} />
                              </button>

                              {openMenuId === sub.id && (
                                <div
                                  className="absolute right-0 top-8 z-20 w-44 rounded-lg py-1 shadow-xl"
                                  style={{
                                    background: "#1a1a1a",
                                    border: "1px solid #2a2a2a",
                                  }}
                                >
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      // Could open an edit modal here
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white transition-colors"
                                  >
                                    <Edit size={14} /> Chỉnh sửa
                                  </button>
                                  {sub.status !== "active" && (
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleChangeStatus(sub.id, "active");
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white transition-colors"
                                    >
                                      <UserCheck size={14} /> Đặt Active
                                    </button>
                                  )}
                                  {sub.status !== "unsubscribed" && (
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleChangeStatus(
                                          sub.id,
                                          "unsubscribed"
                                        );
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white transition-colors"
                                    >
                                      <UserMinus size={14} /> Unsubscribe
                                    </button>
                                  )}
                                  <div
                                    className="my-1"
                                    style={{
                                      borderTop: "1px solid #2a2a2a",
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleDelete(sub.id);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#222] hover:text-red-300 transition-colors"
                                  >
                                    <Trash2 size={14} /> Xoá
                                  </button>
                                </div>
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
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: "1px solid #2a2a2a" }}
              >
                <span className="text-xs text-gray-500">
                  Trang {page}/{totalPages} ({totalCount.toLocaleString("vi-VN")}{" "}
                  subscribers)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-400 rounded-lg transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: "#1f1f1f",
                      border: "1px solid #2a2a2a",
                    }}
                  >
                    <ChevronLeft size={14} /> Trước
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-400 rounded-lg transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: "#1f1f1f",
                      border: "1px solid #2a2a2a",
                    }}
                  >
                    Sau <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddSubscriberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={fetchSubscribers}
      />
      <ImportSubscribersModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={fetchSubscribers}
      />

      {/* Bulk list action modal */}
      {bulkListModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => {
            setBulkListModalOpen(false);
            setBulkAction(null);
          }}
        >
          <div
            className="card-dark w-full max-w-sm p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold">
              {bulkAction === "add_to_list"
                ? "Thêm vào danh sách"
                : "Gỡ khỏi danh sách"}
            </h3>
            <select
              className="input-dark"
              value={bulkListId}
              onChange={(e) => setBulkListId(e.target.value)}
            >
              <option value="">-- Chọn danh sách --</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setBulkListModalOpen(false);
                  setBulkAction(null);
                }}
                className="flex-1 py-2 text-sm font-medium text-gray-400 rounded-lg"
                style={{
                  background: "#1f1f1f",
                  border: "1px solid #2a2a2a",
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleBulkListAction}
                disabled={!bulkListId}
                className="btn-green flex-1 justify-center text-sm py-2"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
