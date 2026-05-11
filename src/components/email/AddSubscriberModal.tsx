"use client";

import { useState, useEffect } from "react";
import { X, Plus, Loader2 } from "lucide-react";

interface EmailList {
  id: string;
  name: string;
}

interface AddSubscriberModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubscriberModal({
  open,
  onClose,
  onSuccess,
}: AddSubscriberModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState("");
  const [listId, setListId] = useState("");
  const [lists, setLists] = useState<EmailList[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/email/lists")
        .then((r) => r.json())
        .then((data) => {
          if (data.lists) setLists(data.lists);
        })
        .catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email là bắt buộc");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/email/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          list_id: listId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi khi thêm subscriber");
      }

      setEmail("");
      setFullName("");
      setPhone("");
      setTags("");
      setListId("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi thêm subscriber");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
            Thêm subscriber mới
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              className="input-dark"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Họ và tên
            </label>
            <input
              type="text"
              className="input-dark"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Số điện thoại
            </label>
            <input
              type="text"
              className="input-dark"
              placeholder="0901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Tags <span className="text-gray-600 text-xs">(phân cách bằng dấu phẩy)</span>
            </label>
            <input
              type="text"
              className="input-dark"
              placeholder="vip, khách hàng mới"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Danh sách
            </label>
            <select
              className="input-dark"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
            >
              <option value="">-- Không chọn --</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-400 rounded-lg transition-colors hover:text-white"
              style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-green flex-1 justify-center text-sm py-2.5"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Plus size={15} /> Thêm subscriber
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
