"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import {
  ArrowLeft,
  Users,
  Search,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  UserPlus,
  Mail,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmailList {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  subscriber_count: number;
  created_at: string;
}

interface Subscriber {
  id: string;
  email: string;
  full_name: string | null;
  status: "active" | "unsubscribed" | "bounced";
  created_at: string;
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

const LIST_COLORS = [
  "#D4A843",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // List info
  const [list, setList] = useState<EmailList | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Subscribers
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 20;

  // Add subscriber modal
  const [addSubModalOpen, setAddSubModalOpen] = useState(false);
  const [addSubEmail, setAddSubEmail] = useState("");
  const [addingSub, setAddingSub] = useState(false);

  // ── Fetch list info ──
  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/email/lists/${id}`);
      if (!res.ok) {
        router.push("/email/lists");
        return;
      }
      const data = await res.json();
      setList(data.list ?? data);
    } catch {
      router.push("/email/lists");
    } finally {
      setLoadingList(false);
    }
  }, [id, router]);

  // ── Fetch subscribers of this list ──
  const fetchSubscribers = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (search) params.set("search", search);

      const res = await fetch(
        `/api/email/lists/${id}/subscribers?${params}`
      );
      const data = await res.json();

      setSubscribers(data.subscribers ?? []);
      setTotalCount(data.total ?? 0);
      setTotalPages(
        Math.max(1, Math.ceil((data.total ?? 0) / perPage))
      );
    } catch {
      // Handle silently
    } finally {
      setLoadingSubs(false);
    }
  }, [id, page, search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // ── Edit handlers ──
  const startEditing = () => {
    if (!list) return;
    setEditName(list.name);
    setEditDescription(list.description || "");
    setEditColor(list.color || LIST_COLORS[0]);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/email/lists/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          color: editColor,
        }),
      });
      if (res.ok) {
        setEditing(false);
        fetchList();
      }
    } catch {
      // Handle silently
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Remove subscriber from list ──
  const handleRemoveFromList = async (subscriberId: string) => {
    if (!confirm("Gỡ subscriber này khỏi danh sách?")) return;
    try {
      await fetch(`/api/email/lists/${id}/subscribers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriber_id: subscriberId }),
      });
      fetchSubscribers();
      fetchList();
    } catch {
      // Handle silently
    }
  };

  // ── Add subscriber to list ──
  const handleAddSubscriber = async () => {
    if (!addSubEmail.trim()) return;
    setAddingSub(true);
    try {
      const res = await fetch(`/api/email/lists/${id}/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addSubEmail.trim() }),
      });
      if (res.ok) {
        setAddSubEmail("");
        setAddSubModalOpen(false);
        fetchSubscribers();
        fetchList();
      }
    } catch {
      // Handle silently
    } finally {
      setAddingSub(false);
    }
  };

  // ── Skeleton row ──
  const SkeletonRow = () => (
    <tr style={{ borderBottom: "1px solid #1f1f1f" }}>
      <td className="px-4 py-3">
        <div className="w-40 h-4 rounded bg-[#222] animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="w-24 h-4 rounded bg-[#222] animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="w-16 h-4 rounded bg-[#222] animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="w-20 h-4 rounded bg-[#222] animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="w-6 h-4 rounded bg-[#222] animate-pulse" />
      </td>
    </tr>
  );

  if (loadingList) {
    return (
      <div>
        <TopBar title="Đang tải..." subtitle="" />
        <div className="p-6 max-w-6xl mx-auto">
          <div className="card-dark p-6">
            <div className="w-48 h-6 rounded bg-[#222] animate-pulse mb-3" />
            <div className="w-72 h-4 rounded bg-[#222] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!list) return null;

  return (
    <div>
      <TopBar title={list.name} subtitle="Chi tiết danh sách email" />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        {/* Back button */}
        <button
          onClick={() => router.push("/email/lists")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>

        {/* List info card */}
        <div className="card-dark p-5">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Tên danh sách
                </label>
                <input
                  type="text"
                  className="input-dark"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Mô tả
                </label>
                <textarea
                  className="input-dark resize-none"
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Màu sắc
                </label>
                <div className="flex gap-2">
                  {LIST_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className="w-6 h-6 rounded-full transition-all"
                      style={{
                        background: c,
                        outline:
                          editColor === c
                            ? `2px solid ${c}`
                            : "2px solid transparent",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-400 rounded-lg transition-colors hover:text-white"
                  style={{
                    background: "#1f1f1f",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  <X size={14} /> Hủy
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="btn-green text-sm py-2"
                >
                  {savingEdit ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={14} /> Lưu
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-4 h-4 rounded-full shrink-0 mt-1"
                  style={{
                    background: list.color || LIST_COLORS[0],
                  }}
                />
                <div>
                  <h2 className="text-white font-bold text-lg">{list.name}</h2>
                  {list.description && (
                    <p className="text-gray-400 text-sm mt-1">
                      {list.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                      <Users size={14} />
                      <span>
                        {(
                          list.subscriber_count ?? 0
                        ).toLocaleString("vi-VN")}{" "}
                        subscribers
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                      <Calendar size={14} />
                      <span>Tạo ngày {formatDate(list.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-400 rounded-lg transition-colors hover:text-white shrink-0"
                style={{
                  background: "#1f1f1f",
                  border: "1px solid #2a2a2a",
                }}
              >
                <Edit size={14} /> Chỉnh sửa
              </button>
            </div>
          )}
        </div>

        {/* Subscriber section */}
        <div className="card-dark overflow-hidden">
          {/* Header */}
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <div className="relative flex-1 w-full sm:w-auto">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                className="input-dark pl-9 text-sm"
                placeholder="Tìm subscriber trong list..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setAddSubModalOpen(true)}
              className="btn-green text-sm py-2 shrink-0"
            >
              <UserPlus size={15} /> Thêm subscriber vào list
            </button>
          </div>

          {/* Table */}
          {loadingSubs ? (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden md:table-cell">
                    Tên
                  </th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">
                    Trạng thái
                  </th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden md:table-cell">
                    Ngày đăng ký
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          ) : subscribers.length === 0 ? (
            <div className="p-10 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(59,130,246,0.1)" }}
              >
                <Mail size={24} className="text-[#3b82f6]" />
              </div>
              <p className="text-white font-medium mb-1">
                Chưa có subscriber nào trong list
              </p>
              <p className="text-gray-500 text-sm mb-4">
                Thêm subscriber vào danh sách này.
              </p>
              <button
                onClick={() => setAddSubModalOpen(true)}
                className="btn-green text-sm py-2"
              >
                <UserPlus size={15} /> Thêm subscriber
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">
                        Email
                      </th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden md:table-cell">
                        Tên
                      </th>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">
                        Trạng thái
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
                            <div className="text-white text-sm font-medium">
                              {sub.email}
                            </div>
                            {sub.full_name && (
                              <div className="text-xs text-gray-500 mt-0.5 md:hidden">
                                {sub.full_name}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-gray-300 text-sm">
                              {sub.full_name || (
                                <span className="text-gray-500">--</span>
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
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-gray-400 text-sm">
                              {formatDate(sub.created_at)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveFromList(sub.id)}
                              className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-[#2a2a2a]"
                              title="Gỡ khỏi list"
                            >
                              <Trash2 size={15} />
                            </button>
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
                  Trang {page}/{totalPages} (
                  {totalCount.toLocaleString("vi-VN")} subscribers)
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

      {/* Add subscriber to list modal */}
      {addSubModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setAddSubModalOpen(false)}
        >
          <div
            className="card-dark w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid #2a2a2a" }}
            >
              <h3 className="text-white font-semibold text-sm">
                Thêm subscriber vào list
              </h3>
              <button
                onClick={() => setAddSubModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Email subscriber
                </label>
                <input
                  type="email"
                  className="input-dark"
                  placeholder="email@example.com"
                  value={addSubEmail}
                  onChange={(e) => setAddSubEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSubscriber();
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Subscriber phải đã tồn tại trong hệ thống.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setAddSubModalOpen(false)}
                  className="flex-1 py-2 text-sm font-medium text-gray-400 rounded-lg"
                  style={{
                    background: "#1f1f1f",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddSubscriber}
                  disabled={addingSub || !addSubEmail.trim()}
                  className="btn-green flex-1 justify-center text-sm py-2"
                >
                  {addingSub ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={14} /> Thêm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
