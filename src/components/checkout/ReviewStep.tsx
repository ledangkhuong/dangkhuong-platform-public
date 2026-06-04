"use client";

/**
 * ReviewStep — Bước 4 (cuối) trong luồng checkout multi-step.
 *
 * Trách nhiệm:
 * - Hiển thị lại toàn bộ thông tin đã thu thập ở 3 bước trước
 *   (địa chỉ, vận chuyển, thanh toán) ở dạng read-only.
 * - Liệt kê các sản phẩm trong giỏ kèm tổng kết tiền.
 * - Yêu cầu user tick "đồng ý điều khoản" trước khi cho phép Đặt hàng.
 * - Gọi `onPlace()` (server action wrapper từ parent) và quản lý
 *   trạng thái pending + lỗi cục bộ. Mọi side-effect (redirect, gọi
 *   payment provider) do parent xử lý — component này thuần UI.
 *
 * KHÔNG sửa `state` trực tiếp (trừ checkbox đồng ý điều khoản qua
 * callback parent — ở đây ta giữ checkbox cục bộ vì state.agreedTerms
 * chỉ cần "true" tại thời điểm đặt; parent có thể đồng bộ sau nếu muốn).
 */

import { useState } from "react";
import Image from "next/image";
import { Loader2, AlertCircle, MapPin, Truck, Wallet, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  type CheckoutState,
  SHIPPING_CARRIER_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/types/checkout";
import type { CartWithItems } from "@/lib/ecommerce/cart-queries";

// ---------------------------------------------------------------------------
// Currency helper — copy cục bộ thay vì import từ /app/cart/page.tsx để
// component giữ tính độc lập (server page không export helper).
// ---------------------------------------------------------------------------

const VND_FMT = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatVnd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return VND_FMT.format(Number(value));
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AddressDisplay {
  /** Tên phường/xã đã resolve từ `state.address.ward_code`. */
  ward: string | null;
  /** Tên tỉnh/thành đã resolve từ `state.address.province_code`. */
  province: string | null;
}

export interface ReviewStepProps {
  state: CheckoutState;
  cart: CartWithItems;
  addressDisplay: AddressDisplay;
  /**
   * Trigger đặt hàng. Throw để báo lỗi — component sẽ hiển thị message.
   * Resolve = thành công (parent tự redirect / chuyển trạng thái).
   */
  onPlace: () => Promise<void>;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReviewStep({
  state,
  cart,
  addressDisplay,
  onPlace,
  onBack,
}: ReviewStepProps) {
  const [agreed, setAgreed] = useState<boolean>(state.agreedTerms);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, shipping, payment } = state;

  const subtotal = cart.computedSubtotal;
  const shippingFee = shipping?.fee ?? 0;
  const grandTotal = subtotal + shippingFee;

  // Disable Đặt hàng khi: chưa đồng ý điều khoản, đang gửi, hoặc thiếu data
  // tối thiểu (defensive — parent đã chặn ở stepper nhưng để chắc chắn).
  const canPlace =
    agreed &&
    !pending &&
    !!address &&
    !!shipping &&
    !!payment &&
    cart.items.length > 0;

  async function handlePlace() {
    if (!canPlace) return;
    setError(null);
    setPending(true);
    try {
      await onPlace();
      // Không reset pending — parent sẽ điều hướng. Nếu parent không
      // navigate (e.g. mở modal QR), pending giữ true cũng OK vì
      // component sẽ unmount hoặc parent re-render với state khác.
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Đặt hàng thất bại, vui lòng thử lại.";
      setError(msg);
      setPending(false);
    }
  }

  return (
    <div className="space-y-6 text-neutral-100">
      {/* ---------------- Section: Thông tin giao hàng ---------------- */}
      <section className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-5">
        <header className="mb-3 flex items-center gap-2">
          <MapPin className="size-4 text-[#D4A843]" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
            Thông tin giao hàng
          </h3>
        </header>
        {address ? (
          <dl className="grid grid-cols-1 gap-y-1.5 text-sm sm:grid-cols-[140px_1fr]">
            <dt className="text-neutral-400">Họ và tên</dt>
            <dd className="font-medium">{address.full_name}</dd>

            <dt className="text-neutral-400">Số điện thoại</dt>
            <dd>{address.phone}</dd>

            {address.email ? (
              <>
                <dt className="text-neutral-400">Email</dt>
                <dd>{address.email}</dd>
              </>
            ) : null}

            <dt className="text-neutral-400">Địa chỉ</dt>
            <dd className="leading-relaxed">
              {address.address_line}
              {(addressDisplay.ward || addressDisplay.province) && (
                <>
                  {", "}
                  {addressDisplay.ward}
                  {addressDisplay.ward && addressDisplay.province ? ", " : ""}
                  {addressDisplay.province}
                </>
              )}
            </dd>

            {address.notes ? (
              <>
                <dt className="text-neutral-400">Ghi chú</dt>
                <dd className="italic text-neutral-300">{address.notes}</dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-neutral-500">Chưa có thông tin địa chỉ.</p>
        )}
      </section>

      {/* ---------------- Section: Vận chuyển ---------------- */}
      <section className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-5">
        <header className="mb-3 flex items-center gap-2">
          <Truck className="size-4 text-[#D4A843]" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
            Phương thức vận chuyển
          </h3>
        </header>
        {shipping ? (
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">
                {SHIPPING_CARRIER_LABELS[shipping.carrier] ?? shipping.carrier}
              </p>
              {shipping.expected_days ? (
                <p className="mt-0.5 text-xs text-neutral-400">
                  Dự kiến {shipping.expected_days} ngày
                </p>
              ) : null}
            </div>
            <p className="font-medium tabular-nums">
              {shipping.fee > 0 ? formatVnd(shipping.fee) : "Miễn phí"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Chưa chọn phương thức vận chuyển.
          </p>
        )}
      </section>

      {/* ---------------- Section: Thanh toán ---------------- */}
      <section className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-5">
        <header className="mb-3 flex items-center gap-2">
          <Wallet className="size-4 text-[#D4A843]" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
            Phương thức thanh toán
          </h3>
        </header>
        {payment ? (
          <p className="text-sm font-medium">
            {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
          </p>
        ) : (
          <p className="text-sm text-neutral-500">
            Chưa chọn phương thức thanh toán.
          </p>
        )}
      </section>

      {/* ---------------- Section: Sản phẩm ---------------- */}
      <section className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-5">
        <header className="mb-3 flex items-center gap-2">
          <Package className="size-4 text-[#D4A843]" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
            Sản phẩm ({cart.totalQuantity})
          </h3>
        </header>

        <ul className="divide-y divide-neutral-800/80">
          {cart.items.map((item) => {
            const snapshot = item.product_snapshot;
            const name =
              snapshot?.product_name ?? item.product?.name ?? "Sản phẩm";
            const variantName =
              snapshot?.variant_name ?? item.variant?.name ?? null;
            const thumb =
              snapshot?.thumbnail_url ?? item.product?.thumbnail_url ?? null;
            const lineSubtotal = Number(item.unit_price) * Number(item.quantity);

            return (
              <li
                key={item.id}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                {/* Thumbnail */}
                <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                      <Package className="size-5" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  {variantName ? (
                    <p className="mt-0.5 truncate text-xs text-neutral-400">
                      {variantName}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-neutral-500 tabular-nums">
                    {formatVnd(item.unit_price)} × {item.quantity}
                  </p>
                </div>

                {/* Line subtotal */}
                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {formatVnd(lineSubtotal)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------- Totals ---------------- */}
      <section className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-neutral-400">Tạm tính</dt>
            <dd className="tabular-nums">{formatVnd(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-neutral-400">Phí vận chuyển</dt>
            <dd className="tabular-nums">
              {shippingFee > 0 ? formatVnd(shippingFee) : "Miễn phí"}
            </dd>
          </div>
          <Separator className="my-2 bg-neutral-800" />
          <div className="flex items-center justify-between">
            <dt className="text-base font-semibold">Tổng cộng</dt>
            <dd className="text-lg font-bold tabular-nums text-[#D4A843]">
              {formatVnd(grandTotal)}
            </dd>
          </div>
        </dl>
      </section>

      {/* ---------------- Terms checkbox ---------------- */}
      {/*
        Dùng native checkbox + label thay vì shadcn Checkbox vì project hiện
        chưa export `components/ui/checkbox.tsx` (grep xác nhận chỉ có
        dropdown-menu sử dụng từ "checkbox"). Style đồng bộ accent vàng.
      */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={pending}
          className="mt-0.5 size-4 cursor-pointer accent-[#D4A843]"
          aria-describedby="terms-desc"
        />
        <span id="terms-desc" className="leading-relaxed text-neutral-300">
          Tôi đồng ý với{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D4A843] underline-offset-4 hover:underline"
          >
            điều khoản
          </a>{" "}
          và{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D4A843] underline-offset-4 hover:underline"
          >
            chính sách bảo mật
          </a>
          .
        </span>
      </label>

      {/* ---------------- Error message ---------------- */}
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {/* ---------------- Actions ---------------- */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={pending}
          className="text-neutral-300"
        >
          ← Quay lại
        </Button>

        <Button
          type="button"
          onClick={handlePlace}
          disabled={!canPlace}
          className="min-w-[160px] bg-[#D4A843] text-black hover:bg-[#D4A843]/90"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Đang xử lý…
            </>
          ) : (
            "Đặt hàng"
          )}
        </Button>
      </div>
    </div>
  );
}
