"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { addOrderNote } from "@/lib/actions/admin-orders";

interface Props {
  orderId: string;
}

export default function OrderNoteForm({ orderId }: Props) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await addOrderNote(orderId, trimmed);
      if (res?.ok) {
        setNote("");
        setFeedback("Đã thêm ghi chú");
        setTimeout(() => setFeedback(null), 2000);
      } else {
        setFeedback(res?.error || "Không lưu được ghi chú");
      }
    });
  };

  return (
    <div className="space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Thêm ghi chú nội bộ về đơn hàng..."
        rows={3}
        maxLength={2000}
        disabled={pending}
        className="w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#D4A843] focus:outline-none disabled:opacity-50"
      />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${feedback?.startsWith("Đã") ? "text-green-400" : "text-red-400"}`}>
          {feedback}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !note.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#D4A843]/10 px-3 py-1.5 text-xs font-medium text-[#D4A843] hover:bg-[#D4A843]/20 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquarePlus className="h-3 w-3" />}
          Thêm ghi chú
        </button>
      </div>
    </div>
  );
}
