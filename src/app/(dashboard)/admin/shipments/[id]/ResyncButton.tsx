"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side "Resync" button. POSTs to /api/admin/shipments/[id]/sync
 * then triggers `router.refresh()` để Server Component reload data.
 *
 * Hiển thị inline status (loading / success / error). Để minimal cho
 * Week 5 — Week 7 sẽ refactor sang toast/dialog UX hoàn chỉnh.
 */
export default function ResyncButton({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const busy = isPending || submitting;

  async function handleClick() {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/shipments/${shipmentId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = (await res.json()) as
        | { ok: true; data: { status: string; eventsInserted: number } }
        | { ok?: false; error: string };

      if (!res.ok || "error" in json) {
        const errText = "error" in json ? json.error : `HTTP ${res.status}`;
        setMessage({ kind: "err", text: errText });
        return;
      }

      setMessage({
        kind: "ok",
        text: `Đồng bộ thành công — trạng thái: ${json.data.status} (thêm ${json.data.eventsInserted} sự kiện).`,
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setMessage({
        kind: "err",
        text:
          err instanceof Error
            ? err.message
            : "Không thể đồng bộ. Vui lòng thử lại.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Đang đồng bộ..." : "Đồng bộ GHN"}
      </button>
      {message && (
        <span
          className={
            message.kind === "ok"
              ? "text-sm text-green-700"
              : "text-sm text-red-700"
          }
        >
          {message.text}
        </span>
      )}
    </div>
  );
}
