"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RefreshCw } from "lucide-react";

export default function DeleteLandingButton({
  landingId,
  pathname,
  redirectAfter,
}: {
  landingId: string;
  pathname: string;
  redirectAfter?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/landing-pages/${landingId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Không xoá được");
        return;
      }
      if (redirectAfter) router.push(redirectAfter);
      else router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title={confirming ? `Bấm lần nữa để xoá landing ${pathname}` : "Xoá landing"}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
      style={{
        background: confirming ? "rgba(239,68,68,0.15)" : "transparent",
        color: confirming ? "#ef4444" : "#9ca3af",
        border: `1px solid ${confirming ? "rgba(239,68,68,0.3)" : "transparent"}`,
      }}
    >
      {loading ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
      {confirming ? "Bấm lần nữa" : "Xoá"}
    </button>
  );
}
