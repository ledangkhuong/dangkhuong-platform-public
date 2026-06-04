"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SalesUser } from "@/lib/sales";

interface OrderAssignSelectProps {
  orderId: string;
  assignedTo: string | null;
  salesUsers: SalesUser[];
}

export default function OrderAssignSelect({
  orderId,
  assignedTo,
  salesUsers,
}: OrderAssignSelectProps) {
  const router = useRouter();
  const [value, setValue] = useState<string>(assignedTo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const prev = value;
    setValue(next);
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: next === "" ? null : next }),
      });
      if (!res.ok) {
        let msg = "Không thể gán";
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) msg = data.error;
        } catch {
          // ignore
        }
        setValue(prev);
        setError(msg);
      } else {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setValue(prev);
      setError("Lỗi kết nối");
    } finally {
      setSubmitting(false);
    }
  }

  const isUnassigned = value === "";

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        onChange={handleChange}
        disabled={submitting}
        className="text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#D4A843] transition-colors disabled:opacity-60"
        style={{
          background: isUnassigned ? "rgba(245,158,11,0.1)" : "#1a1a1a",
          border: `1px solid ${
            isUnassigned ? "rgba(245,158,11,0.25)" : "#2a2a2a"
          }`,
          color: isUnassigned ? "#f59e0b" : "#e5e7eb",
          minWidth: 140,
        }}
      >
        <option value="">— Chưa gán —</option>
        {salesUsers.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name ?? u.id.slice(0, 8)}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-[11px] text-red-400">{error}</span>
      )}
    </div>
  );
}
