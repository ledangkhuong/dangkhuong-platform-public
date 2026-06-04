"use client";

import { useState } from "react";
import { Edit3, Check, X } from "lucide-react";
import { updateCommissionRate } from "@/lib/actions/affiliate";

export default function EditCommissionForm({
  affiliateId,
  currentRate,
}: {
  affiliateId: string;
  currentRate: number;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 text-gray-400 hover:text-[#f59e0b] transition-colors group"
        title="Chỉnh sửa tỷ lệ hoa hồng"
      >
        <span className="font-medium">{currentRate}%</span>
        <Edit3 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <form action={updateCommissionRate} className="inline-flex items-center gap-1">
      <input type="hidden" name="affiliate_id" value={affiliateId} />
      <input
        name="commission_rate"
        type="number"
        min={1}
        max={50}
        defaultValue={currentRate}
        className="input-dark w-14 text-xs text-center py-1 px-1.5"
        autoFocus
      />
      <span className="text-xs text-gray-500">%</span>
      <button
        type="submit"
        className="text-[#D4A843] hover:text-amber-400 transition-colors p-0.5"
        title="Lưu"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-gray-500 hover:text-white transition-colors p-0.5"
        title="Huỷ"
      >
        <X size={14} />
      </button>
    </form>
  );
}
