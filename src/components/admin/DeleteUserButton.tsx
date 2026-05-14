"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  userName: string | null;
}

export default function DeleteUserButton({ userId, userName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xoá tài khoản "${userName || "Chưa đặt tên"}"?\nHành động này không thể hoàn tác.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: [userId] }),
      });
      const data = await res.json();
      if (res.ok && data.deleted > 0) {
        router.refresh();
      } else {
        alert(data.error || "Xoá thất bại");
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50 transition-colors"
      title={`Xoá ${userName || "người dùng"}`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Trash2 size={14} />
      )}
    </button>
  );
}
