"use client";

/**
 * DirectGrantModal — grant a customer access to a course WITHOUT
 * creating an order. Use when the access is a gift, KOL comp, or a
 * manual fix for an external-order enrolment that failed.
 *
 * Different from ExternalOrderModal — that one creates a paid order
 * (with revenue_source='external') and advances journey_stage. This
 * one only writes the enrollment row; no money, no stage advance.
 *
 * Form is submitted via the createDirectEnrollment server action.
 */

import { useState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createDirectEnrollment } from "@/lib/actions/direct-grant";
import { X, BookOpen, Loader2, Gift } from "lucide-react";

type Course = {
  id: string;
  title: string;
  price: number | null;
  sale_price: number | null;
};

interface DirectGrantModalProps {
  contactId: string;
  contactName: string;
  courses: Course[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: pending ? "rgba(34,197,94,0.55)" : "#22c55e",
        color: "#0a0a0a",
      }}
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          Đang cấp...
        </>
      ) : (
        <>
          <Gift size={14} />
          Cấp khóa miễn phí
        </>
      )}
    </button>
  );
}

export default function DirectGrantModal({
  contactId,
  contactName,
  courses,
}: DirectGrantModalProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-green-500 hover:text-green-400"
        title="Cấp khóa học trực tiếp cho khách (không tạo đơn — dùng để tặng / KOL / fix thủ công)"
      >
        <Gift size={13} className="text-green-500" />
        Cấp khóa trực tiếp
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="card-dark w-full max-w-lg max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="direct-grant-title"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#2a2a2a] p-5">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-green-500" />
                <h2
                  id="direct-grant-title"
                  className="text-base font-semibold text-white"
                >
                  Cấp khóa trực tiếp
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <form action={createDirectEnrollment} className="space-y-4 p-5">
              <input type="hidden" name="contact_id" value={contactId} />

              <p className="text-xs text-gray-400">
                Cấp khóa cho{" "}
                <span className="font-semibold text-white">{contactName}</span>
                {" "}mà KHÔNG tạo đơn hàng — dùng cho tặng, comp KOL, hoặc
                cấp tay khi đơn ngoại sinh fail. Khách cần đã có tài
                khoản (sign-up bằng email này).
              </p>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">
                  Khóa học <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <BookOpen
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <select
                    name="course_id"
                    required
                    defaultValue=""
                    className="w-full rounded-md border border-[#2a2a2a] bg-[#141414] py-2 pl-9 pr-3 text-sm text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      — Chọn khóa —
                    </option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">
                  Lý do cấp <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="note"
                  required
                  minLength={3}
                  rows={3}
                  placeholder="VD: Tặng KOL Nguyễn A theo deal hợp tác T5, fix tay vì đơn external trước fail enrolment..."
                  className="w-full resize-none rounded-md border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Bắt buộc — log vào timeline để truy vết.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#2a2a2a] pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[#2a2a2a] bg-transparent px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
                >
                  Huỷ
                </button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
