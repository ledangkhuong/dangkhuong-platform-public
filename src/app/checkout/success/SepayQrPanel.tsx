"use client";

/**
 * SepayQrPanel — Week 6.
 *
 * Hiển thị QR Sepay + nội dung chuyển khoản + poll status webhook.
 *  - `qrUrl` đã build server-side qua `/api/qr` proxy (giữ params an toàn
 *    + cache 1h ở edge).
 *  - Poll `/api/orders/check-status?order_code=...` mỗi 5s. Khi status
 *    chuyển `paid` → đổi UI thành "Đã nhận thanh toán" và auto-redirect
 *    sang `/orders/[orderCode]` sau 2s.
 *  - Có copy buttons cho amount + nội dung CK.
 *  - Countdown 15 phút — sau đó vẫn poll nhưng hiển thị banner "đã quá hạn,
 *    vui lòng liên hệ admin" (không block — webhook có thể trễ).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Clock, Copy, CreditCard } from "lucide-react";

interface SepayQrPanelProps {
  qrUrl: string;
  amount: number;
  /** Nội dung chuyển khoản — thường là order_code (DKxxxxxxxx). */
  transferContent: string;
  /** Order UUID — dùng để redirect tracking page (`/orders/[orderCode]`). */
  orderId: string;
}

type PollStatus = "pending" | "paid" | "expired" | "cancelled";

function formatVnd(value: number): string {
  return value.toLocaleString("vi-VN") + "₫";
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function SepayQrPanel({
  qrUrl,
  amount,
  transferContent,
}: SepayQrPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PollStatus>("pending");
  const [countdown, setCountdown] = useState(15 * 60); // 15 min
  const [copied, setCopied] = useState<"amount" | "content" | null>(null);
  const redirectedRef = useRef(false);

  // ─── Poll status ────────────────────────────────────────────────────────
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/orders/check-status?order_code=${encodeURIComponent(transferContent)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { status?: string };
      if (data.status === "paid") setStatus("paid");
      else if (data.status === "cancelled") setStatus("cancelled");
    } catch {
      // silent retry
    }
  }, [transferContent]);

  useEffect(() => {
    if (status !== "pending") return;
    const id = window.setInterval(checkStatus, 5000);
    // kick off ngay (không đợi 5s đầu).
    void checkStatus();
    return () => window.clearInterval(id);
  }, [status, checkStatus]);

  // ─── Countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "pending") return;
    const id = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(id);
          // Không đổi sang 'expired' — webhook có thể đến trễ. Chỉ cho
          // countdown chạm 0 và banner hiện.
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  // ─── Auto-redirect khi paid ────────────────────────────────────────────
  useEffect(() => {
    if (status !== "paid" || redirectedRef.current) return;
    redirectedRef.current = true;
    const timer = window.setTimeout(() => {
      router.push(`/orders/${encodeURIComponent(transferContent)}`);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [status, transferContent, router]);

  const handleCopy = useCallback(
    (text: string, key: "amount" | "content") => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(key);
        window.setTimeout(() => setCopied(null), 2000);
      });
    },
    [],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  if (status === "paid") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="mt-4 text-base font-bold text-white">
          Đã nhận thanh toán!
        </h3>
        <p className="mt-2 text-sm text-neutral-300">
          Hệ thống đang chuyển bạn sang trang theo dõi đơn hàng...
        </p>
      </div>
    );
  }

  const expiredBanner = status === "pending" && countdown === 0;

  return (
    <div className="rounded-xl border border-white/10 bg-[#111] p-5 text-left">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-200">
          <CreditCard className="size-4 text-[#D4A843]" />
          Quét QR để thanh toán
        </h2>
        <div className="flex items-center gap-1.5 text-xs">
          <Clock
            className={
              countdown < 120
                ? "size-3.5 text-red-400"
                : "size-3.5 text-[#f59e0b]"
            }
          />
          <span
            className={
              countdown < 120
                ? "font-mono font-bold text-red-400"
                : "font-mono font-bold text-[#f59e0b]"
            }
          >
            {formatCountdown(countdown)}
          </span>
        </div>
      </div>

      {/* QR */}
      <div className="mb-4 flex justify-center">
        <div className="rounded-xl bg-white p-3">
          <Image
            src={qrUrl}
            alt="QR thanh toán Sepay"
            width={220}
            height={220}
            className="block"
            unoptimized
          />
        </div>
      </div>

      {/* Transfer details */}
      <div className="space-y-2.5">
        <div
          className="flex items-center justify-between rounded-lg p-3"
          style={{ background: "#1a1a1a" }}
        >
          <span className="text-xs text-neutral-400">Số tiền</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#D4A843]">
              {formatVnd(amount)}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(String(amount), "amount")}
              className="text-neutral-500 transition-colors hover:text-white"
              aria-label="Sao chép số tiền"
            >
              {copied === "amount" ? (
                <Check className="size-3.5 text-[#D4A843]" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
        </div>

        <div
          className="flex items-center justify-between rounded-lg p-3"
          style={{ background: "#1a1a1a" }}
        >
          <span className="text-xs text-neutral-400">Nội dung CK</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-white">
              {transferContent}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(transferContent, "content")}
              className="text-neutral-500 transition-colors hover:text-white"
              aria-label="Sao chép nội dung chuyển khoản"
            >
              {copied === "content" ? (
                <Check className="size-3.5 text-[#D4A843]" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {expiredBanner ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-300">
          Đã quá 15 phút — nếu bạn vừa chuyển khoản, webhook có thể trễ. Hệ
          thống vẫn đang chờ; vui lòng liên hệ admin qua Zalo/Facebook nếu cần
          hỗ trợ.
        </div>
      ) : (
        <div
          className="mt-4 rounded-lg p-3 text-xs leading-relaxed text-neutral-400"
          style={{
            background: "rgba(212,168,67,0.06)",
            border: "1px solid rgba(212,168,67,0.15)",
          }}
        >
          <span className="font-medium text-[#D4A843]">
            ⚡ Tự động xác nhận
          </span>{" "}
          — sau khi chuyển khoản, hệ thống xác nhận trong vòng 60 giây.
        </div>
      )}
    </div>
  );
}
