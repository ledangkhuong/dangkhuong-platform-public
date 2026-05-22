"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Calendar,
  Clock,
  XCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Crown,
  Loader2,
} from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  billing_period: string;
  price: number;
  tier_granted: string;
}

interface Subscription {
  id: string;
  status: "active" | "cancelled" | "expired" | "pending";
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  auto_renew: boolean;
  subscription_plans: SubscriptionPlan;
}

const BILLING_LABELS: Record<string, string> = {
  monthly: "Hàng tháng",
  "3months": "3 tháng",
  "6months": "6 tháng",
  yearly: "1 năm",
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [message, setMessage] = useState("");

  const fetchSubscription = () => {
    setLoading(true);
    fetch("/api/subscriptions/my")
      .then((res) => res.json())
      .then((data) => {
        setSubscription(data.subscription ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    setMessage("");

    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel_reason: cancelReason }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage(data.error || "Không thể huỷ gói đăng ký.");
        return;
      }

      setMessage(data.message || "Gói đăng ký đã được huỷ.");
      setShowCancelConfirm(false);
      setCancelReason("");
      fetchSubscription();
    } catch {
      setMessage("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="card-dark p-6 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#D4A843]" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="card-dark p-6">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(107,114,128,0.12)" }}
          >
            <CreditCard size={17} className="text-gray-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Gói đăng ký
            </h3>
            <p className="text-xs text-gray-500">
              Chưa có gói đăng ký
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Bạn chưa đăng ký gói nào. Chọn gói phù hợp bên dưới để bắt đầu.
        </p>
      </div>
    );
  }

  const plan = subscription.subscription_plans;
  const now = new Date();
  const periodEnd = new Date(subscription.current_period_end);
  const periodStart = new Date(subscription.current_period_start);
  const totalDays = Math.max(
    1,
    Math.round(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const daysRemaining = Math.max(
    0,
    Math.round(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const progressPercent = Math.min(
    100,
    Math.round(((totalDays - daysRemaining) / totalDays) * 100)
  );
  const isNearExpiry = daysRemaining <= 7;
  const isCancelled = subscription.status === "cancelled";

  return (
    <div className="card-dark overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid #2a2a2a" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(212,168,67,0.12)" }}
          >
            <Crown size={17} className="text-[#D4A843]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
            <p className="text-xs text-gray-500">
              {BILLING_LABELS[plan.billing_period] ?? plan.billing_period} -{" "}
              {formatCurrency(plan.price)}
            </p>
          </div>
        </div>

        {/* Status badge */}
        {isCancelled ? (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(245,158,11,0.1)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <XCircle size={11} />
            Đã huỷ
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(34,197,94,0.1)",
              color: "#22c55e",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <CheckCircle size={11} />
            Đang hoạt động
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Info row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Calendar size={12} />
              Bắt đầu
            </div>
            <div className="text-sm text-white font-medium">
              {formatDate(subscription.current_period_start)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Calendar size={12} />
              Hết hạn
            </div>
            <div className="text-sm text-white font-medium">
              {formatDate(subscription.current_period_end)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Clock size={12} />
              Còn lại
            </div>
            <div
              className="text-sm font-medium"
              style={{
                color: isNearExpiry ? "#f59e0b" : "#22c55e",
              }}
            >
              {daysRemaining} ngày
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Tiến trình gói</span>
            <span>{progressPercent}%</span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "#2a2a2a" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                background: isNearExpiry
                  ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                  : "linear-gradient(90deg, #D4A843, #22c55e)",
              }}
            />
          </div>
        </div>

        {/* Near expiry warning */}
        {isNearExpiry && !isCancelled && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <AlertTriangle size={15} className="text-[#f59e0b] shrink-0" />
            <span className="text-[#f59e0b]">
              Gói đăng ký sắp hết hạn. Hãy gia hạn để tiếp tục sử dụng.
            </span>
          </div>
        )}

        {/* Cancelled info */}
        {isCancelled && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{
              background: "rgba(107,114,128,0.08)",
              border: "1px solid rgba(107,114,128,0.2)",
            }}
          >
            <XCircle size={15} className="text-gray-500 shrink-0" />
            <span className="text-gray-400">
              Gói đã huỷ. Bạn vẫn có thể sử dụng đến{" "}
              {formatDate(subscription.current_period_end)}.
            </span>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              color: "#22c55e",
            }}
          >
            {message}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-1">
          {/* Renew button — show if near expiry or cancelled */}
          {(isNearExpiry || isCancelled) && (
            <a
              href="/subscriptions"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #D4A843, #b8922e)",
                boxShadow: "0 2px 8px rgba(212,168,67,0.3)",
              }}
            >
              <RefreshCw size={14} />
              Gia hạn
            </a>
          )}

          {/* Cancel button — only if active */}
          {!isCancelled && (
            <>
              {showCancelConfirm ? (
                <div className="flex-1 space-y-3">
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Lý do huỷ (tuỳ chọn)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none resize-none"
                    style={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        color: "#ef4444",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      {cancelling ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <XCircle size={14} />
                      )}
                      Xác nhận huỷ
                    </button>
                    <button
                      onClick={() => {
                        setShowCancelConfirm(false);
                        setCancelReason("");
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                      style={{
                        background: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                      }}
                    >
                      Không
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 transition-colors"
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  <XCircle size={14} />
                  Huỷ gói
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
