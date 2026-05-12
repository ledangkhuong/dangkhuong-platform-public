"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import {
  Plus,
  Users,
  Edit,
  Trash2,
  MoreHorizontal,
  X,
  Loader2,
  ListPlus,
  Eye,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<EmailList | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(LIST_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email/lists");
      const data = await res.json();
      setLists(data.lists ?? []);
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [openMenuId]);

  const openCreateModal = () => {
    setEditingList(null);
    setFormName("");
    setFormDescription("");
    setFormColor(LIST_COLORS[0]);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (list: EmailList) => {
    setEditingList(list);
    setFormName(list.name);
    setFormDescription(list.description || "");
    setFormColor(list.color || LIST_COLORS[0]);
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError("Tên danh sách là bắt buộc");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const body = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        color: formColor,
      };

      let res: Response;
      if (editingList) {
        res = await fetch(`/api/email/lists/${editingList.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/email/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi khi lưu");
      }

      setModalOpen(false);
      fetchLists();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa danh sách này?")) return;
    try {
      await fetch(`/api/email/lists/${id}`, { method: "DELETE" });
      fetchLists();
    } catch {
      // Handle silently
    }
  };

  // Skeleton cards
  const SkeletonCard = () => (
    <div className="card-dark p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-3 h-3 rounded-full bg-[#222] animate-pulse mt-1" />
        <div className="flex-1">
          <div className="w-32 h-5 rounded bg-[#222] animate-pulse mb-2" />
          <div className="w-48 h-3 rounded bg-[#222] animate-pulse" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="w-24 h-4 rounded bg-[#222] animate-pulse" />
        <div className="w-16 h-4 rounded bg-[#222] animate-pulse" />
      </div>
    </div>
  );

  return (
    <div>
      <TopBar title="Danh sách email" subtitle="Quản lý lists & segments" />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              {lists.length} danh sách
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-green text-sm">
            <Plus size={15} /> Tạo list mới
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="card-dark p-12 text-center">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(212,168,67,0.1)" }}
            >
              <ListPlus size={28} className="text-[#D4A843]" />
            </div>
            <p className="text-white font-medium mb-1">
              Chưa có danh sách nào
            </p>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mb-4">
              Tạo danh sách đầu tiên để phân loại và quản lý subscribers.
            </p>
            <button onClick={openCreateModal} className="btn-green text-sm">
              <Plus size={15} /> Tạo list mới
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <div
                key={list.id}
                className="card-dark p-5 hover:border-[#3a3a3a] transition-colors cursor-pointer group"
                onClick={() => router.push(`/email/lists/${list.id}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 mt-1.5"
                      style={{
                        background: list.color || LIST_COLORS[0],
                      }}
                    />
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold text-sm truncate group-hover:text-[#D4A843] transition-colors">
                        {list.name}
                      </h3>
                      {list.description && (
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                          {list.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative shrink-0 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(
                          openMenuId === list.id ? null : list.id
                        );
                      }}
                      className="text-gray-600 hover:text-white transition-colors p-1 rounded-md hover:bg-[#2a2a2a]"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {openMenuId === list.id && (
                      <div
                        className="absolute right-0 top-8 z-20 w-40 rounded-lg py-1 shadow-xl"
                        style={{
                          background: "#1a1a1a",
                          border: "1px solid #2a2a2a",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            router.push(`/email/lists/${list.id}`);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white transition-colors"
                        >
                          <Eye size={14} /> Xem subscribers
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            openEditModal(list);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#222] hover:text-white transition-colors"
                        >
                          <Edit size={14} /> Chỉnh sửa
                        </button>
                        <div
                          className="my-1"
                          style={{ borderTop: "1px solid #2a2a2a" }}
                        />
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDelete(list.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#222] hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={14} /> Xoá
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div
                  className="flex items-center justify-between pt-3 mt-2"
                  style={{ borderTop: "1px solid #222" }}
                >
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Users size={13} />
                    <span className="text-xs">
                      {(list.subscriber_count ?? 0).toLocaleString("vi-VN")}{" "}
                      subscribers
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">
                    {formatDate(list.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="card-dark w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid #2a2a2a" }}
            >
              <h2 className="text-white font-semibold text-base">
                {editingList ? "Chỉnh sửa danh sách" : "Tạo danh sách mới"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {formError && (
                <div
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Tên danh sách <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="input-dark"
                  placeholder="VD: Khách hàng VIP"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Mô tả
                </label>
                <textarea
                  className="input-dark resize-none"
                  rows={3}
                  placeholder="Mô tả ngắn về danh sách..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
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
                      onClick={() => setFormColor(c)}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        background: c,
                        outline:
                          formColor === c
                            ? `2px solid ${c}`
                            : "2px solid transparent",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-400 rounded-lg transition-colors hover:text-white"
                  style={{
                    background: "#1f1f1f",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-green flex-1 justify-center text-sm py-2.5"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : editingList ? (
                    "Lưu thay đổi"
                  ) : (
                    <>
                      <Plus size={15} /> Tạo danh sách
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
