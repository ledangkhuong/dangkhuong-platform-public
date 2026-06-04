"use client";

/**
 * CheckoutStepper — Week 4
 *
 * Horizontal progress stepper for the 4-step checkout flow:
 *   1. Địa chỉ   (MapPin)
 *   2. Vận chuyển (Truck)
 *   3. Thanh toán (CreditCard)
 *   4. Xác nhận  (CheckCircle)
 *
 * Visual states per step:
 *   - completed: green check icon + solid green connector
 *   - current:   accent #D4A843 outline + scaled-up + accent connector start
 *   - future:    gray icon + gray connector
 *
 * Responsive:
 *   - Desktop (md+): full horizontal stepper with icons, labels, connectors.
 *   - Mobile (<md): compact "Bước N/4" header + current step label.
 *
 * Pure presentational client component — no state of its own; the parent
 * passes `currentStep` derived from URL search params or sessionStorage.
 */

import {
  MapPin,
  Truck,
  CreditCard,
  CheckCircle,
  Check,
  type LucideIcon,
} from "lucide-react";
import {
  CHECKOUT_STEPS,
  CHECKOUT_STEP_INDEX,
  CHECKOUT_STEP_LABELS,
  type CheckoutStep,
} from "@/types/checkout";
import { cn } from "@/lib/utils";

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
  /** Optional extra wrapper classes. */
  className?: string;
}

const STEP_ICONS: Record<CheckoutStep, LucideIcon> = {
  address: MapPin,
  shipping: Truck,
  payment: CreditCard,
  review: CheckCircle,
};

type StepStatus = "completed" | "current" | "future";

function statusFor(
  step: CheckoutStep,
  currentIdx: number,
): StepStatus {
  const idx = CHECKOUT_STEP_INDEX[step];
  if (idx < currentIdx) return "completed";
  if (idx === currentIdx) return "current";
  return "future";
}

export function CheckoutStepper({
  currentStep,
  className,
}: CheckoutStepperProps) {
  const currentIdx = CHECKOUT_STEP_INDEX[currentStep];
  const totalSteps = CHECKOUT_STEPS.length;
  const currentLabel = CHECKOUT_STEP_LABELS[currentStep];
  const CurrentIcon = STEP_ICONS[currentStep];

  return (
    <nav
      aria-label="Tiến trình thanh toán"
      className={cn("w-full", className)}
    >
      {/* ---------- Mobile compact (<md) ---------- */}
      <div className="md:hidden">
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border-2"
              style={{
                borderColor: "#D4A843",
                backgroundColor: "rgba(212, 168, 67, 0.12)",
              }}
            >
              <CurrentIcon
                className="h-4 w-4"
                style={{ color: "#D4A843" }}
                aria-hidden="true"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">
                Bước {currentIdx + 1}/{totalSteps}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: "#D4A843" }}
              >
                {currentLabel}
              </span>
            </div>
          </div>

          {/* Mobile mini progress dots */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {CHECKOUT_STEPS.map((step) => {
              const status = statusFor(step, currentIdx);
              return (
                <span
                  key={step}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    status === "current" ? "w-6" : "w-1.5",
                  )}
                  style={{
                    backgroundColor:
                      status === "completed"
                        ? "#22c55e"
                        : status === "current"
                          ? "#D4A843"
                          : "rgba(255,255,255,0.18)",
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- Desktop horizontal (md+) ---------- */}
      <ol
        className="hidden md:flex md:items-start md:justify-between"
        role="list"
      >
        {CHECKOUT_STEPS.map((step, idx) => {
          const status = statusFor(step, currentIdx);
          const Icon = STEP_ICONS[step];
          const label = CHECKOUT_STEP_LABELS[step];
          const isLast = idx === CHECKOUT_STEPS.length - 1;

          return (
            <li
              key={step}
              className="relative flex flex-1 flex-col items-center"
              aria-current={status === "current" ? "step" : undefined}
            >
              {/* Connector line — drawn from this step's right edge to next step.
                  Positioned absolutely so it sits behind the circle. */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-6 h-0.5 w-full -translate-y-1/2"
                  style={{
                    backgroundColor:
                      status === "completed"
                        ? "#22c55e"
                        : "rgba(255,255,255,0.12)",
                  }}
                />
              )}

              {/* Circle with icon */}
              <div
                className={cn(
                  "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                  status === "current" && "scale-110 shadow-lg",
                )}
                style={{
                  borderColor:
                    status === "completed"
                      ? "#22c55e"
                      : status === "current"
                        ? "#D4A843"
                        : "rgba(255,255,255,0.18)",
                  backgroundColor:
                    status === "completed"
                      ? "rgba(34, 197, 94, 0.12)"
                      : status === "current"
                        ? "rgba(212, 168, 67, 0.14)"
                        : "rgba(255,255,255,0.04)",
                  boxShadow:
                    status === "current"
                      ? "0 0 0 4px rgba(212, 168, 67, 0.18)"
                      : undefined,
                }}
              >
                {status === "completed" ? (
                  <Check
                    className="h-5 w-5"
                    style={{ color: "#22c55e" }}
                    aria-hidden="true"
                  />
                ) : (
                  <Icon
                    className="h-5 w-5"
                    style={{
                      color:
                        status === "current"
                          ? "#D4A843"
                          : "rgba(255,255,255,0.45)",
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Step number + label */}
              <div className="mt-3 flex flex-col items-center text-center">
                <span
                  className="text-xs font-medium"
                  style={{
                    color:
                      status === "completed"
                        ? "#22c55e"
                        : status === "current"
                          ? "#D4A843"
                          : "rgba(255,255,255,0.45)",
                  }}
                >
                  Bước {idx + 1}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-sm transition-colors",
                    status === "current" ? "font-semibold" : "font-medium",
                  )}
                  style={{
                    color:
                      status === "completed"
                        ? "rgba(255,255,255,0.85)"
                        : status === "current"
                          ? "#D4A843"
                          : "rgba(255,255,255,0.55)",
                  }}
                >
                  {label}
                </span>
              </div>

              {/* Screen-reader status */}
              <span className="sr-only">
                {status === "completed"
                  ? "đã hoàn thành"
                  : status === "current"
                    ? "đang thực hiện"
                    : "chưa thực hiện"}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default CheckoutStepper;
