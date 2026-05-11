"use client";

import { useState } from "react";
import { X, Send, Loader2, Check, AlertCircle, Mail } from "lucide-react";

interface TestEmailModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string | null;
  /** If provided, the campaign will be saved before sending the test */
  onSaveDraft?: () => Promise<string | null>;
}

export default function TestEmailModal({
  open,
  onClose,
  campaignId,
  onSaveDraft,
}: TestEmailModalProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  if (!open) return null;

  const handleSend = async () => {
    if (!email.trim()) return;

    setSending(true);
    setResult(null);

    try {
      // Save draft first if needed
      let id = campaignId;
      if (!id && onSaveDraft) {
        id = await onSaveDraft();
      }

      if (!id) {
        setResult({
          ok: false,
          msg: "Vui long luu campaign truoc khi gui test.",
        });
        setSending(false);
        return;
      }

      const res = await fetch(`/api/email/campaigns/${id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_email: email.trim() }),
      });

      if (res.ok) {
        setResult({
          ok: true,
          msg: `Da gui email test thanh cong den ${email.trim()}!`,
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setResult({
          ok: false,
          msg: data.error || "Gui that bai. Vui long thu lai.",
        });
      }
    } catch {
      setResult({ ok: false, msg: "Loi ket noi. Vui long thu lai." });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setResult(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-xl overflow-hidden"
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.12)" }}
            >
              <Mail size={16} className="text-[#3b82f6]" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                Gui Email Test
              </h3>
              <p className="text-[11px] text-gray-500">
                Gui thu de kiem tra truoc khi gui cho subscribers
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Dia chi email nhan test
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-dark w-full text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && email.trim() && !sending) {
                  handleSend();
                }
              }}
              autoFocus
            />
            <p className="text-[11px] text-gray-600 mt-1.5">
              Subject se duoc them prefix [TEST] de phan biet
            </p>
          </div>

          {/* Result feedback */}
          {result && (
            <div
              className="flex items-start gap-2.5 p-3.5 rounded-lg text-sm"
              style={{
                background: result.ok
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(239,68,68,0.08)",
                border: result.ok
                  ? "1px solid rgba(34,197,94,0.2)"
                  : "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {result.ok ? (
                <Check
                  size={16}
                  className="text-[#22c55e] shrink-0 mt-0.5"
                />
              ) : (
                <AlertCircle
                  size={16}
                  className="text-[#ef4444] shrink-0 mt-0.5"
                />
              )}
              <p
                style={{
                  color: result.ok ? "#22c55e" : "#ef4444",
                }}
              >
                {result.msg}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2a2a2a]">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
            style={{ border: "1px solid #2a2a2a" }}
          >
            Dong
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "rgba(59,130,246,0.15)",
              color: "#3b82f6",
              border: "1px solid rgba(59,130,246,0.3)",
              opacity: sending || !email.trim() ? 0.5 : 1,
              cursor: sending || !email.trim() ? "not-allowed" : "pointer",
            }}
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {sending ? "Dang gui..." : "Gui Email Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
