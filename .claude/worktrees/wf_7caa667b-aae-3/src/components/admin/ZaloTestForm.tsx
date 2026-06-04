"use client";

import { useState } from "react";
import { Send, CheckCircle, XCircle } from "lucide-react";

interface ZaloTestFormProps {
  adminZaloId: string;
}

export default function ZaloTestForm({ adminZaloId }: ZaloTestFormProps) {
  const [message, setMessage] = useState("Day la tin nhan thu tu he thong!");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/zalo/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zaloUserId: adminZaloId, message: message.trim() }),
      });
      const data = await res.json();
      setResult({ success: data.success, error: data.error });
    } catch {
      setResult({ success: false, error: "Loi ket noi. Vui long thu lai." });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1.5 font-medium">Noi dung tin nhan</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="input-dark w-full text-sm resize-none"
          placeholder="Nhap noi dung tin nhan thu..."
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="btn-green text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={14} />
          {sending ? "Dang gui..." : "Gui thu"}
        </button>
        <span className="text-xs text-gray-500">
          Gui den Zalo ID: <code className="text-gray-400">{adminZaloId}</code>
        </span>
      </div>
      {result && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg text-sm"
          style={{
            background: result.success ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${result.success ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: result.success ? "#22c55e" : "#ef4444",
          }}
        >
          {result.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {result.success ? "Da gui tin nhan thanh cong!" : result.error || "Gui that bai"}
        </div>
      )}
    </form>
  );
}
