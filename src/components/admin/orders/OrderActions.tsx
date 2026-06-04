"use client";

/**
 * OrderActions — Client Component action panel cho /admin/orders/physical/[id].
 *
 * Hiển thị conditional buttons theo (order.status, payment_method, order_type,
 * shipment.status). Mọi action call qua Server Actions trong src/lib/actions/*.
 *
 * Không dùng toast lib (project chưa cài sonner). Feedback: inline banner +
 * router.refresh() sau khi action thành công.
 *
 * Note (Next.js 16): Server Actions phải được import từ module có
 * "use server" — các action dưới đây đã được khai báo "use server" trong
 * file gốc, nên import trực tiếp vào Client Component là hợp lệ.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  PackagePlus,
  Printer,
  RefreshCw,
  Truck,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import { confirmCODOrder } from "@/lib/actions/cod-order";
import {
  cancelOrder,
  markPhysicalDelivered,
} from "@/lib/actions/admin-orders";
import {
  createShipment,
  syncShipmentStatus,
} from "@/lib/actions/shipping";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type OrderStatus = "pending" | "paid" | "cancelled" | "refunded";
type PaymentMethod = "sepay" | "payos" | "cod" | "bank_transfer";
type OrderType = "course" | "physical" | "mixed";

export interface OrderActionsOrder {
  id: string;
  order_code: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  order_type: OrderType | null;
}

export interface OrderActionsShipment {
  id: string;
  status: string; // 'pending' | 'created' | 'picked' | 'in_transit' | 'delivered' | 'cancelled' | 'returned'
  carrier: string | null;
}

interface Props {
  order: OrderActionsOrder;
  shipment?: OrderActionsShipment | null;
}

// ---------------------------------------------------------------------------
// Feedback banner state
// ---------------------------------------------------------------------------

type Feedback =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OrderActions({ order, shipment }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Cancel dialog state.
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const isPhysicalLike =
    order.order_type === "physical" || order.order_type === "mixed";
  const hasShipment = !!shipment;

  function runAction(
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string } | unknown>,
    successMessage: string,
  ) {
    setActiveAction(key);
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = (await fn()) as
          | { ok?: boolean; error?: string }
          | undefined;
        // Some actions return { ok, error }, others may return void / throw.
        if (result && typeof result === "object" && "ok" in result) {
          if (result.ok) {
            setFeedback({ kind: "success", message: successMessage });
            router.refresh();
          } else {
            setFeedback({
              kind: "error",
              message: result.error || "Thao tác thất bại.",
            });
          }
        } else {
          // Void return → treat as success.
          setFeedback({ kind: "success", message: successMessage });
          router.refresh();
        }
      } catch (err) {
        setFeedback({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Lỗi không xác định.",
        });
      } finally {
        setActiveAction(null);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Button visibility flags
  // -------------------------------------------------------------------------

  const showConfirmCOD =
    order.status === "pending" && order.payment_method === "cod";

  // Manual override: pending + non-COD payment (sepay/payos/bank_transfer
  // chưa webhook về). Dùng confirmCODOrder để giữ flow đồng nhất (cấp quyền
  // khoá học + gửi mail).
  const showMarkPaid =
    order.status === "pending" &&
    order.payment_method !== null &&
    order.payment_method !== "cod";

  const showCreateShipment =
    order.status === "paid" && !hasShipment && isPhysicalLike;

  const showSyncShipment =
    hasShipment &&
    !!shipment &&
    (shipment.status === "in_transit" ||
      shipment.status === "created" ||
      shipment.status === "picked");

  const showMarkDelivered =
    hasShipment &&
    !!shipment &&
    shipment.status === "delivered" &&
    order.status !== "cancelled";

  const showCancel_btn =
    order.status !== "cancelled" && order.status !== "refunded";

  const invoiceHref = `/admin/orders/${order.id}/invoice`;

  return (
    <div
      className="card-dark p-5 space-y-4"
      style={{ background: "#0f0f0f", border: "1px solid #1f1f1f" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white tracking-wide">
          Thao tác đơn hàng
        </h3>
        {isPending && (
          <Loader2 size={14} className="animate-spin text-[#D4A843]" />
        )}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-xs"
          style={{
            background:
              feedback.kind === "success"
                ? "rgba(34,197,94,0.08)"
                : "rgba(239,68,68,0.08)",
            border:
              feedback.kind === "success"
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid rgba(239,68,68,0.3)",
            color: feedback.kind === "success" ? "#22c55e" : "#ef4444",
          }}
        >
          {feedback.kind === "success" ? (
            <CheckCircle size={14} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-current opacity-60 hover:opacity-100"
            aria-label="Đóng"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Action stack */}
      <div className="flex flex-col gap-2">
        {showConfirmCOD && (
          <ActionButton
            icon={<Wallet size={14} />}
            label="Xác nhận COD"
            hint="Đánh dấu đã thu tiền + cấp quyền khoá học (nếu mixed)"
            loading={activeAction === "cod" && isPending}
            disabled={isPending}
            tone="success"
            onClick={() =>
              runAction(
                "cod",
                () => confirmCODOrder(order.id),
                "Đã xác nhận đơn COD.",
              )
            }
          />
        )}

        {showMarkPaid && (
          <ActionButton
            icon={<CheckCircle size={14} />}
            label="Đánh dấu đã thanh toán"
            hint="Manual override khi webhook chưa về"
            loading={activeAction === "mark-paid" && isPending}
            disabled={isPending}
            tone="success"
            onClick={() =>
              runAction(
                "mark-paid",
                () => confirmCODOrder(order.id),
                "Đã đánh dấu đơn đã thanh toán.",
              )
            }
          />
        )}

        {showCreateShipment && (
          <ActionButton
            icon={<PackagePlus size={14} />}
            label="Tạo vận đơn GHN"
            hint="Gọi GHN API, ghi shipments + tracking_url"
            loading={activeAction === "create-shipment" && isPending}
            disabled={isPending}
            tone="primary"
            onClick={() =>
              runAction(
                "create-shipment",
                () => createShipment(order.id),
                "Đã tạo vận đơn GHN.",
              )
            }
          />
        )}

        {showSyncShipment && shipment && (
          <ActionButton
            icon={<RefreshCw size={14} />}
            label="Đồng bộ trạng thái"
            hint="Pull tracking từ GHN"
            loading={activeAction === "sync" && isPending}
            disabled={isPending}
            tone="neutral"
            onClick={() =>
              runAction(
                "sync",
                () => syncShipmentStatus(shipment.id),
                "Đã đồng bộ trạng thái vận đơn.",
              )
            }
          />
        )}

        {showMarkDelivered && (
          <ActionButton
            icon={<Truck size={14} />}
            label="Xác nhận đã giao"
            hint="Đóng vòng vận chuyển vật lý"
            loading={activeAction === "delivered" && isPending}
            disabled={isPending}
            tone="success"
            onClick={() =>
              runAction(
                "delivered",
                () => markPhysicalDelivered(order.id),
                "Đã xác nhận giao hàng thành công.",
              )
            }
          />
        )}

        {/* In hoá đơn — always */}
        <a
          href={invoiceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: "#151515",
            border: "1px solid #2a2a2a",
            color: "#cbd5e1",
          }}
        >
          <Printer size={14} />
          <span className="flex-1 text-left">In hoá đơn</span>
          <span className="text-[10px] text-gray-500">mở tab mới</span>
        </a>

        {/* Huỷ — always (trừ cancelled/refunded), accent vàng cảnh báo */}
        {showCancel_btn && (
          <button
            onClick={() => setShowCancel(true)}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            style={{
              background: "rgba(212,168,67,0.08)",
              border: "1px solid rgba(212,168,67,0.4)",
              color: "#D4A843",
            }}
          >
            <XCircle size={14} />
            <span className="flex-1 text-left">Huỷ đơn</span>
          </button>
        )}
      </div>

      {/* Cancel confirm dialog */}
      {showCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card-dark p-6 max-w-md w-full relative"
            style={{
              background: "#0f0f0f",
              border: "1px solid rgba(212,168,67,0.4)",
            }}
          >
            <button
              onClick={() => {
                setShowCancel(false);
                setCancelReason("");
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,168,67,0.15)" }}
              >
                <AlertTriangle size={20} className="text-[#D4A843]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Huỷ đơn hàng</h3>
                <p className="text-xs text-gray-500">
                  {order.order_code ?? order.id}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
              Thao tác sẽ chuyển đơn sang trạng thái{" "}
              <span className="text-[#D4A843] font-medium">cancelled</span>,
              huỷ vận đơn GHN (nếu có) và hoàn tồn kho cho sản phẩm vật lý.
              Hành động không thể hoàn tác.
            </p>

            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1.5">
                Lý do huỷ <span className="text-gray-600">(tuỳ chọn)</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="VD: Khách đổi ý, sai địa chỉ, hết hàng..."
                className="w-full bg-[#151515] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#D4A843]/50 transition-colors resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const reason = cancelReason.trim() || undefined;
                  setShowCancel(false);
                  runAction(
                    "cancel",
                    () => cancelOrder(order.id, reason),
                    "Đã huỷ đơn hàng.",
                  );
                  setCancelReason("");
                }}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                style={{
                  background: "rgba(212,168,67,0.15)",
                  color: "#D4A843",
                  border: "1px solid rgba(212,168,67,0.5)",
                }}
              >
                {activeAction === "cancel" && isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <XCircle size={15} />
                )}
                Xác nhận huỷ
              </button>
              <button
                onClick={() => {
                  setShowCancel(false);
                  setCancelReason("");
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                style={{
                  background: "#1f1f1f",
                  border: "1px solid #333",
                }}
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: ActionButton
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  loading?: boolean;
  disabled?: boolean;
  tone: "primary" | "success" | "neutral" | "danger";
  onClick: () => void;
}

function ActionButton({
  icon,
  label,
  hint,
  loading,
  disabled,
  tone,
  onClick,
}: ActionButtonProps) {
  const palette: Record<
    ActionButtonProps["tone"],
    { bg: string; border: string; color: string }
  > = {
    primary: {
      bg: "rgba(212,168,67,0.12)",
      border: "1px solid rgba(212,168,67,0.45)",
      color: "#D4A843",
    },
    success: {
      bg: "rgba(34,197,94,0.10)",
      border: "1px solid rgba(34,197,94,0.40)",
      color: "#22c55e",
    },
    neutral: {
      bg: "#151515",
      border: "1px solid #2a2a2a",
      color: "#cbd5e1",
    },
    danger: {
      bg: "rgba(239,68,68,0.10)",
      border: "1px solid rgba(239,68,68,0.40)",
      color: "#ef4444",
    },
  };

  const style = palette[tone];

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
      style={{
        background: style.bg,
        border: style.border,
        color: style.color,
      }}
    >
      <span className="mt-0.5 shrink-0">
        {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      </span>
      <span className="flex-1">
        <span className="block">{label}</span>
        {hint && (
          <span
            className="block text-[10px] font-normal mt-0.5 opacity-70"
            style={{ color: "inherit" }}
          >
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}
