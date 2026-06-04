"use client";

/**
 * ExternalOrderModal — modal for granting a customer access to a course on
 * the basis of a payment made outside the website (Facebook, Zalo, bank
 * transfer, cash, prior platform). Submits to the createExternalOrder
 * server action which creates a paid order with revenue_source='external'.
 *
 * Visual style mirrors the existing dark theme + brand color #D4A843
 * used elsewhere on the contact detail page.
 *
 * Submit-while-pending is guarded both by the form's onSubmit `pending`
 * state AND by useFormStatus inside the submit button (defense in depth).
 */

import { useState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createExternalOrder } from "@/lib/actions/external-orders";
import { X, BookOpen, Loader2, KeySquare } from "lucide-react";

type Course = {
  id: string;
  title: string;
  price: number | null;
  sale_price: number | null;
};

interface ExternalOrderModalProps {
  contactId: string;
  contactName: string;
  courses: Course[];
}

const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "zalo", label: "Zalo" },
  { value: "bank_transfer", label: "Chuyển khoản ngân hàng" },
  { value: "cash", label: "Tiền mặt" },
  { value: "other_platform", label: "Nền tảng khác (cũ)" },
  { value: "other", label: "Khác" },
];

// Today in VN as YYYY-MM-DD (default for the date picker).
function vnTodayIso(): string {
  const vn = new Date(Date.now() + 7 * 3600 * 1000);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const d = String(vn.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: pending ? "rgba(212,168,67,0.55)" : "#D4A843",
        color: "#0a0a0a",
      }}
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          Đang lưu...
        </>
      ) : (
        <>
          <KeySquare size={14} />
          Cấp quyền truy cập
        </>
      )}
    </button>
  );
}

export default function ExternalOrderModal({
  contactId,
  contactName,
  courses,
}: ExternalOrderModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // When a course is selected, auto-fill amount with its (sale or list)
  // price. The user can still type over it.
  useEffect(() => {
    if (!selectedCourseId) return;
    const c = courses.find((x) => x.id === selectedCourseId);
    if (!c) return;
    const price = c.sale_price ?? c.price ?? 0;
    if (price > 0) setAmount(String(price));
  }, [selectedCourseId, courses]);

  // ESC closes the modal — small UX nicety.
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-[#D4A843] hover:text-[#D4A843]"
        title="Cấp khóa cho khách đã thanh toán qua kênh ngoài (Facebook, Zalo, bank, tiền mặt...)"
      >
        <KeySquare size={13} className="text-[#D4A843]" />
        Cấp khóa (đã thanh toán ngoài)
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => {
            // Click on backdrop closes; click inside dialog does not.
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="card-dark w-full max-w-lg max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ext-order-title"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#2a2a2a] p-5">
              <div className="flex items-center gap-2">
                <KeySquare size={16} className="text-[#D4A843]" />
                <h2
                  id="ext-order-title"
                  className="text-base font-semibold text-white"
                >
                  Cấp khóa (đã thanh toán ngoài)
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

            <form action={createExternalOrder} className="space-y-4 p-5">
              <input type="hidden" name="contact_id" value={contactId} />

              <p className="text-xs text-gray-400">
                Ghi nhận khách <span className="font-semibold text-white">{contactName}</span>
                {" "}đã thanh toán ngoài web và cấp quyền truy cập khóa.
                Đơn này sẽ KHÔNG tính vào doanh thu nền tảng, nhưng vẫn
                cộng vào lifetime value và mở khóa học cho khách.
              </p>

              {/* ─── Course ─── */}
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
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-md border border-[#2a2a2a] bg-[#141414] py-2 pl-9 pr-3 text-sm text-white focus:border-[#D4A843] focus:outline-none"
                  >
                    <option value="">— Chọn khóa —</option>
                    {courses.map((c) => {
                      const p = c.sale_price ?? c.price ?? 0;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.title}
                          {p > 0 ? ` (${p.toLocaleString("vi-VN")}đ)` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* ─── Amount ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">
                  Số tiền đã thu (VNĐ) <span className="text-red-400">*</span>
                </label>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="VD: 1500000"
                  className="w-full rounded-md border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white focus:border-[#D4A843] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Tự động điền theo giá khóa khi chọn — có thể chỉnh nếu khách
                  được giảm giá hoặc trả khác.
                </p>
              </div>

              {/* ─── Channel + Date ─── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-300">
                    Kênh thanh toán <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="external_channel"
                    required
                    defaultValue=""
                    className="w-full rounded-md border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white focus:border-[#D4A843] focus:outline-none"
                  >
                    <option value="" disabled>
                      — Chọn kênh —
                    </option>
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-300">
                    Ngày thanh toán <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="external_paid_at"
                    type="date"
                    required
                    defaultValue={vnTodayIso()}
                    max={vnTodayIso()}
                    className="w-full rounded-md border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white focus:border-[#D4A843] focus:outline-none"
                  />
                </div>
              </div>

              {/* ─── Note ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">
                  Ghi chú audit <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="external_note"
                  required
                  minLength={3}
                  rows={3}
                  placeholder="VD: Khách chuyển khoản qua MB 12/04, ref TX-9821. Đã xác nhận."
                  className="w-full resize-none rounded-md border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white focus:border-[#D4A843] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Bắt buộc — để truy vết khi đối soát hoặc kiểm toán.
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
