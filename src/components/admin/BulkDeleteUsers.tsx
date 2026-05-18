"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, CheckSquare, Square, X } from "lucide-react";

interface UserItem {
  id: string;
  full_name: string | null;
  role: string;
}

interface Props {
  users: UserItem[];
}

export default function BulkDeleteUsers({ users }: Props) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ deleted: number; errors: string[] } | null>(null);

  // Only show deletable users (not admin/manager)
  const deletableUsers = users.filter(
    (u) => !["admin", "manager"].includes(u.role)
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === deletableUsers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(deletableUsers.map((u) => u.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
    setResult(null);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xoá ${selected.size} tài khoản?\nHành động này không thể hoàn tác.`
    );
    if (!confirmed) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: Array.from(selected) }),
      });
      const data = await res.json();
      setResult({ deleted: data.deleted ?? 0, errors: data.errors ?? [] });
      if (data.deleted > 0) {
        setSelected(new Set());
        setTimeout(() => router.refresh(), 1500);
      }
    } catch {
      setResult({ deleted: 0, errors: ["Lỗi kết nối"] });
    } finally {
      setLoading(false);
    }
  };

  if (!selectMode) {
    return (
      <button
        onClick={() => setSelectMode(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        style={{ border: "1px solid #2a2a2a" }}
      >
        <CheckSquare size={14} />
        Chọn nhiều để xoá
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl"
        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
      >
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          {selected.size === deletableUsers.length ? (
            <CheckSquare size={14} className="text-red-400" />
          ) : (
            <Square size={14} />
          )}
          {selected.size === deletableUsers.length ? "Bỏ chọn tất cả" : `Chọn tất cả (${deletableUsers.length})`}
        </button>

        <span className="text-xs text-gray-500">
          Đã chọn: <span className="text-red-400 font-bold">{selected.size}</span>
        </span>

        <button
          onClick={handleBulkDelete}
          disabled={loading || selected.size === 0}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-40"
          style={{ background: selected.size > 0 ? "#dc2626" : "#4b5563" }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Xoá {selected.size > 0 ? `${selected.size} tài khoản` : ""}
        </button>

        <button
          onClick={exitSelectMode}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={14} />
          Huỷ
        </button>
      </div>

      {/* Result message */}
      {result && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            background: result.deleted > 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${result.deleted > 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: result.deleted > 0 ? "#4ade80" : "#f87171",
          }}
        >
          {result.deleted > 0 && `Đã xoá thành công ${result.deleted} tài khoản. `}
          {result.errors.length > 0 && `Lỗi: ${result.errors.join(", ")}`}
        </div>
      )}

      {/* Checkbox list */}
      <div
        className="rounded-xl overflow-hidden max-h-[400px] overflow-y-auto"
        style={{ background: "#111", border: "1px solid #2a2a2a" }}
      >
        {deletableUsers.map((u, idx) => (
          <label
            key={u.id}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
            style={{
              borderBottom: idx < deletableUsers.length - 1 ? "1px solid #1f1f1f" : "none",
              background: selected.has(u.id) ? "rgba(239,68,68,0.06)" : "transparent",
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(u.id)}
              onChange={() => toggleSelect(u.id)}
              className="accent-red-500 w-4 h-4 rounded"
            />
            <span className="text-sm text-white">{u.full_name || "Chưa đặt tên"}</span>
            <span className="text-[11px] text-gray-500 truncate">{u.id.slice(0, 8)}...</span>
          </label>
        ))}
        {deletableUsers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            Không có tài khoản nào có thể xoá (admin/quản lý được bảo vệ)
          </div>
        )}
      </div>
    </div>
  );
}
