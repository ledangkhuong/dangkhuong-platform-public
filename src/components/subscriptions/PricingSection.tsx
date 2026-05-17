"use client";

import { useState, useEffect } from "react";
import { Check, Star, Zap, Crown, Loader2 } from "lucide-react";

type BillingPeriod = "monthly" | "3months" | "6months" | "yearly";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  billing_period: BillingPeriod;
  price: number;
  original_price: number | null;
  features: string[];
  tier_granted: string;
  sort_order: number;
}

const PERIOD_MONTHS: Record<BillingPeriod, number> = {
  monthly: 1,
  "3months": 3,
  "6months": 6,
  yearly: 12,
};

const PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: "/ tháng",
  "3months": "/ 3 tháng",
  "6months": "/ 6 tháng",
  yearly: "/ năm",
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

interface PricingSectionProps {
  onSubscribe?: (planId: string) => void;
}

export default function PricingSection({ onSubscribe }: PricingSectionProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/subscriptions/plans")
      .then((res) => res.json())
      .then((data) => {
        setPlans(data.plans ?? []);
      })
      .catch(() => {
        setError("Không thể tải gói đăng ký");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (onSubscribe) {
      onSubscribe(planId);
      return;
    }

    setSubscribing(planId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/subscriptions/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Không thể đăng ký. Vui lòng thử lại.");
        return;
      }

      setSuccess(
        `Đã tạo đơn hàng ${data.order?.order_code}. Vui lòng chuyển khoản để kích hoạt gói.`
      );

      // If there's a QR URL, could open payment modal here
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSubscribing(null);
    }
  };

  // Determine which plan to highlight (6months if exists, otherwise middle plan)
  const popularIndex = plans.findIndex((p) => p.billing_period === "6months");
  const highlightIndex = popularIndex >= 0 ? popularIndex : Math.floor(plans.length / 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-[#D4A843]" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        Chưa có gói đăng ký nào.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error / Success messages */}
      {error && (
        <div
          className="p-4 rounded-xl text-sm"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="p-4 rounded-xl text-sm"
          style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.2)",
            color: "#22c55e",
          }}
        >
          {success}
        </div>
      )}

      {/* Pricing cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan, index) => {
          const isPopular = index === highlightIndex;
          const months = PERIOD_MONTHS[plan.billing_period] || 1;
          const monthlyPrice = Math.round(plan.price / months);
          const discount =
            plan.original_price && plan.original_price > plan.price
              ? Math.round(
                  ((plan.original_price - plan.price) / plan.original_price) *
                    100
                )
              : 0;

          return (
            <div
              key={plan.id}
              className="relative rounded-2xl p-5 flex flex-col transition-all"
              style={{
                background: isPopular
                  ? "linear-gradient(135deg, rgba(212,168,67,0.08), rgba(212,168,67,0.02))"
                  : "#111111",
                border: isPopular
                  ? "2px solid rgba(212,168,67,0.4)"
                  : "1px solid #2a2a2a",
              }}
            >
              {/* Popular badge */}
              {isPopular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background:
                      "linear-gradient(135deg, #D4A843, #b8922e)",
                    color: "#0a0a0a",
                  }}
                >
                  <Star size={11} />
                  Phổ biến nhất
                </div>
              )}

              {/* Discount badge */}
              {discount > 0 && (
                <div
                  className="absolute top-3 right-3 px-2 py-0.5 rounded-lg text-xs font-bold"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  -{discount}%
                </div>
              )}

              {/* Plan name */}
              <div className="mb-4 mt-1">
                <h3 className="text-base font-bold text-white">{plan.name}</h3>
                {plan.description && (
                  <p className="text-xs text-gray-500 mt-1">
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {PERIOD_LABELS[plan.billing_period]}
                  </span>
                </div>
                {plan.original_price &&
                  plan.original_price > plan.price && (
                    <div className="text-xs text-gray-600 line-through mt-0.5">
                      {formatCurrency(plan.original_price)}
                    </div>
                  )}
                {months > 1 && (
                  <div className="text-xs text-gray-500 mt-1">
                    ~ {formatCurrency(monthlyPrice)} / tháng
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {(plan.features ?? []).map((feature, fi) => (
                  <li
                    key={fi}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <Check
                      size={14}
                      className="shrink-0 mt-0.5"
                      style={{
                        color: isPopular ? "#D4A843" : "#22c55e",
                      }}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Tier badge */}
              <div className="mb-4">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background:
                      plan.tier_granted === "vip"
                        ? "rgba(245,158,11,0.1)"
                        : "rgba(168,85,247,0.1)",
                    color:
                      plan.tier_granted === "vip" ? "#f59e0b" : "#a855f7",
                    border: `1px solid ${
                      plan.tier_granted === "vip"
                        ? "rgba(245,158,11,0.2)"
                        : "rgba(168,85,247,0.2)"
                    }`,
                  }}
                >
                  <Crown size={11} />
                  {plan.tier_granted === "vip" ? "VIP" : "Member"}
                </span>
              </div>

              {/* CTA button */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={subscribing === plan.id}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: isPopular
                    ? "linear-gradient(135deg, #D4A843, #b8922e)"
                    : "rgba(212,168,67,0.1)",
                  color: isPopular ? "#0a0a0a" : "#D4A843",
                  border: isPopular
                    ? "none"
                    : "1px solid rgba(212,168,67,0.3)",
                }}
              >
                {subscribing === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Đang xử lý...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Zap size={14} />
                    Đăng ký ngay
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
