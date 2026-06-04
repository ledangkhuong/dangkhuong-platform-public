"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import EmailNav from "@/components/email/EmailNav";
import { Tag, Plus, Search, Trash2, Edit, Users, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TagItem {
  id: string;
  name: string;
  color: string;
  description: string | null;
  subscriber_count: number;
}

interface Subscriber {
  id: string;
  email: string;
  full_name: string | null;
  tags: string[] | null;
}

// ─── Preset Colors ──────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#D4A843",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
  "#a855f7",
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function TagsPage() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Assign section state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [assignTagId, setAssignTagId] = useState<string>("");
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // ─── Fetch Tags ─────────────────────────────────────────────────────────────

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/email/tags");
      if (!res.ok) throw new Error("Không thể tải danh sách tags");
      const data = await res.json();
      setTags(data.tags ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // ─── Fetch Subscribers ──────────────────────────────────────────────────────

  const fetchSubscribers = useCallback(async (search: string) => {
    try {
      setLoadingSubscribers(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/email/subscribers?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải subscribers");
      const data = await res.json();
      setSubscribers(data.subscribers ?? []);
    } catch {
      setSubscribers([]);
    } finally {
      setLoadingSubscribers(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchSubscribers(subscriberSearch);
    }, 300);
    return () => clearTimeout(timeout);
  }, [subscriberSearch, fetchSubscribers]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingTag(null);
    setFormName("");
    setFormColor(PRESET_COLORS[0]);
    setFormDescription("");
    setShowModal(true);
  };

  const openEditModal = (tag: TagItem) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormColor(tag.color);
    setFormDescription(tag.description ?? "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTag(null);
  };

  const handleSaveTag = async () => {
    if (!formName.trim()) return;
    try {
      setSaving(true);
      const body = {
        name: formName.trim(),
        color: formColor,
        description: formDescription.trim() || null,
        ...(editingTag ? { id: editingTag.id } : {}),
      };

      const res = await fetch("/api/email/tags", {
        method: editingTag ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Không thể lưu tag");
      closeModal();
      fetchTags();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa tag này?")) return;
    try {
      const res = await fetch(`/api/email/tags?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Không thể xóa tag");
      fetchTags();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    }
  };

  const toggleSubscriber = (id: string) => {
    setSelectedSubscribers((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAssignTag = async () => {
    if (!assignTagId || selectedSubscribers.length === 0) return;
    try {
      const res = await fetch("/api/email/tags/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagId: assignTagId,
          subscriberIds: selectedSubscribers,
        }),
      });
      if (!res.ok) throw new Error("Không thể gán tag");
      setSelectedSubscribers([]);
      fetchTags();
      fetchSubscribers(subscriberSearch);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    }
  };

  const handleRemoveTag = async () => {
    if (!assignTagId || selectedSubscribers.length === 0) return;
    try {
      const res = await fetch("/api/email/tags/assign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagId: assignTagId,
          subscriberIds: selectedSubscribers,
        }),
      });
      if (!res.ok) throw new Error("Không thể gỡ tag");
      setSelectedSubscribers([]);
      fetchTags();
      fetchSubscribers(subscriberSearch);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    }
  };

  // ─── Computed ───────────────────────────────────────────────────────────────

  const totalSubscribersWithTags = tags.reduce(
    (sum, t) => sum + t.subscriber_count,
    0
  );
  const mostUsedTag =
    tags.length > 0
      ? tags.reduce((max, t) =>
          t.subscriber_count > max.subscriber_count ? t : max
        )
      : null;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <TopBar title="Email Marketing" subtitle="Quản lý tags cho subscribers" />
      <EmailNav />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Quản lý Tags</h1>
          <button
            onClick={openCreateModal}
            className="bg-[#D4A843] text-black font-medium rounded-lg px-4 py-2 flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Thêm tag mới
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-300 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#151515] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#D4A843]/20">
                <Tag size={18} className="text-[#D4A843]" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Tổng tags</p>
                <p className="text-lg font-semibold text-white">
                  {loading ? "..." : tags.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#151515] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-500/20">
                <Users size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">
                  Subscribers có tags
                </p>
                <p className="text-lg font-semibold text-white">
                  {loading ? "..." : totalSubscribersWithTags}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#151515] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-500/20">
                <Tag size={18} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Tag phổ biến nhất</p>
                <p className="text-lg font-semibold text-white">
                  {loading
                    ? "..."
                    : mostUsedTag
                      ? mostUsedTag.name
                      : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tag List */}
        <div>
          <h2 className="text-base font-medium text-white mb-3">
            Danh sách Tags
          </h2>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              Đang tải...
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Chưa có tag nào. Hãy tạo tag đầu tiên!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="bg-[#151515] border border-[#2a2a2a] rounded-xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="font-medium text-white">
                        {tag.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(tag)}
                        className="p-1.5 rounded-md hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 line-clamp-2">
                    {tag.description || "Không có mô tả"}
                  </p>

                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Users size={12} />
                    <span>{tag.subscriber_count} subscribers</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign Tag Section */}
        <div className="bg-[#151515] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
          <h2 className="text-base font-medium text-white">
            Gán tag cho Subscribers
          </h2>

          {/* Tag selector */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Chọn tag
            </label>
            <select
              value={assignTagId}
              onChange={(e) => setAssignTagId(e.target.value)}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white w-full md:w-64"
            >
              <option value="">-- Chọn tag --</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search subscribers */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Tìm kiếm subscribers
            </label>
            <div className="relative w-full md:w-96">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                placeholder="Tìm theo email hoặc tên..."
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg pl-9 pr-3 py-2 text-white w-full"
              />
            </div>
          </div>

          {/* Subscriber list */}
          <div className="max-h-60 overflow-y-auto border border-[#2a2a2a] rounded-lg">
            {loadingSubscribers ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                Đang tải...
              </div>
            ) : subscribers.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                Không tìm thấy subscribers
              </div>
            ) : (
              <div className="divide-y divide-[#2a2a2a]">
                {subscribers.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubscribers.includes(sub.id)}
                      onChange={() => toggleSubscriber(sub.id)}
                      className="w-4 h-4 rounded border-[#333] bg-[#1a1a1a] accent-[#D4A843]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {sub.email}
                      </p>
                      {sub.full_name && (
                        <p className="text-xs text-gray-500 truncate">
                          {sub.full_name}
                        </p>
                      )}
                    </div>
                    {sub.tags && sub.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {sub.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2a2a] text-gray-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAssignTag}
              disabled={!assignTagId || selectedSubscribers.length === 0}
              className="bg-[#D4A843] text-black font-medium rounded-lg px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Gán tag ({selectedSubscribers.length})
            </button>
            <button
              onClick={handleRemoveTag}
              disabled={!assignTagId || selectedSubscribers.length === 0}
              className="border border-red-500/50 text-red-400 font-medium rounded-lg px-4 py-2 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Gỡ tag ({selectedSubscribers.length})
            </button>
          </div>
        </div>
      </div>

      {/* ─── Add/Edit Modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-[#151515] border border-[#2a2a2a] rounded-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingTag ? "Chỉnh sửa tag" : "Thêm tag mới"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded-md hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Tên tag
              </label>
              <input
                type="text"
                placeholder="VD: VIP, Newsletter, Premium..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white w-full"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Màu sắc
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormColor(color)}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        formColor === color ? "#fff" : "transparent",
                      transform:
                        formColor === color ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Mô tả
              </label>
              <textarea
                placeholder="Mô tả ngắn về tag..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white w-full resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white hover:border-[#555] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveTag}
                disabled={!formName.trim() || saving}
                className="bg-[#D4A843] text-black font-medium rounded-lg px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving
                  ? "Đang lưu..."
                  : editingTag
                    ? "Cập nhật"
                    : "Tạo tag"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
