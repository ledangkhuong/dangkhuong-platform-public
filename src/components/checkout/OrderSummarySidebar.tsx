"use client";

/**
 * OrderSummarySidebar — Week 4 (Checkout multi-step).
 *
 * Sidebar tóm tắt đơn hàng hiển thị bên phải trong layout checkout (desktop)
 * và collapsed accordion phía trên page trên mobile.
 *
 * Vì sao là Client Component:
 *  - Cần state mở/đóng accordion mobile.
 *  - Coupon input có controlled state (Week 6 sẽ wire vào Server Action,
 *    hiện tại chỉ là placeholder để khoá API surface sớm).
 *  - Sticky positioning + responsive toggle dễ kiểm soát ở client side.
 *
 * Nguồn dữ liệu:
 *  - `cart`     : CartWithItems hydrated từ getCurrentCart() ở server,
 *                 truyền xuống qua props (KHÔNG fetch lại trong client).
 *  - `shipping` : Optional. Nếu user chưa đi qua step "shipping" thì để
 *                 undefined → UI render "—" cho phí ship.
 *
 * Tổng cộng = computedSubtotal + (shipping?.fee ?? 0). Discount coupon sẽ
 * được nối vào ở Week 6 (placeholder field `discount` trong total math).
 */

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ShoppingBag, Tag } from "lucide-react";

import type { CartWithItems, CartItemHydrated } from "@/lib/ecommerce/cart-queries";
import type { CheckoutShipping } from "@/types/checkout";
import { SHIPPING_CARRIER_LABELS } from "@/types/checkout";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formatter VND dùng chung. Reuse Intl.NumberFormat instance để không
 * khởi tạo lại mỗi lần render (Intl khá nặng so với template string).
 */
const VND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatVnd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return VND.format(Number(value));
}

/**
 * Đồng bộ với cart page: ưu tiên live product, fallback product_snapshot
 * khi product đã bị admin xoá khỏi catalog.
 */
function resolveItemDisplay(item: CartItemHydrated): {
  name: string;
  thumbnailUrl: string | null;
} {
  const snapshot = item.product_snapshot;
  if (item.product) {
    return {
      name: item.product.name,
      thumbnailUrl: item.product.thumbnail_url ?? null,
    };
  }
  return {
    name: snapshot?.product_name ?? "Sản phẩm đã bị xoá",
    thumbnailUrl: snapshot?.thumbnail_url ?? null,
  };
}

/**
 * Variant label ngắn. Trên sidebar collapsed dùng compact (1 dòng), nên
 * ưu tiên `attributes` joined bằng " · ", fallback `name`.
 */
function describeVariant(item: CartItemHydrated): string | null {
  const v = item.variant;
  if (!v) return null;
  const attrs = v.attributes;
  if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
    const pairs = Object.entries(attrs as Record<string, unknown>)
      .filter(([, val]) => val !== null && val !== undefined && val !== "")
      .map(([, val]) => String(val));
    if (pairs.length > 0) return pairs.join(" · ");
  }
  return v.name && v.name.trim().length > 0 ? v.name : null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OrderSummarySidebarProps {
  cart: CartWithItems;
  shipping?: CheckoutShipping;
  /**
   * Class bổ sung cho wrapper ngoài cùng (cho phép caller override sticky
   * offset nếu layout có header cao hơn / khác nhau).
   */
  className?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ItemRow({ item }: { item: CartItemHydrated }) {
  const { name, thumbnailUrl } = resolveItemDisplay(item);
  const variantLabel = describeVariant(item);
  const unitPrice = Number(item.unit_price);
  const qty = Number(item.quantity);
  const lineTotal = unitPrice * qty;

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      {/* Thumbnail + qty badge */}
      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border border-white/5 bg-[#0f0f0f]">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={name}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-600">
            No img
          </div>
        )}
        {/* Badge số lượng — pattern giống Saleor/Shopify checkout */}
        <span
          aria-label={`Số lượng ${qty}`}
          className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-[#0a0a0a] bg-[#D4A843] px-1 text-[10px] font-semibold tabular-nums text-[#0a0a0a]"
        >
          {qty}
        </span>
      </div>

      {/* Name + variant */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-white">
          {name}
        </p>
        {variantLabel && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-neutral-500">
            {variantLabel}
          </p>
        )}
      </div>

      {/* Line total */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xs font-semibold tabular-nums text-white">
          {formatVnd(lineTotal)}
        </p>
        {qty > 1 && Number.isFinite(unitPrice) && (
          <p className="mt-0.5 text-[10px] text-neutral-500 tabular-nums">
            {formatVnd(unitPrice)} × {qty}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Phần content chính (items + totals + coupon). Tách riêng để dùng chung
 * cho cả desktop sidebar và mobile accordion body — đảm bảo UX/markup
 * nhất quán giữa 2 breakpoint.
 */
function SummaryContent({
  cart,
  shipping,
  couponCode,
  setCouponCode,
  onApplyCoupon,
  applyDisabled,
}: {
  cart: CartWithItems;
  shipping?: CheckoutShipping;
  couponCode: string;
  setCouponCode: (v: string) => void;
  onApplyCoupon: () => void;
  applyDisabled: boolean;
}) {
  const subtotal = cart.computedSubtotal;
  const shippingFee = shipping?.fee;
  const total = subtotal + (shippingFee ?? 0);

  return (
    <div className="space-y-5">
      {/* Items list */}
      {cart.items.length === 0 ? (
        <p className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-4 text-center text-xs text-neutral-500">
          Giỏ hàng trống.
        </p>
      ) : (
        <ul
          className="divide-y divide-white/5"
          aria-label="Danh sách sản phẩm trong đơn"
        >
          {cart.items.map((it) => (
            <ItemRow key={it.id} item={it} />
          ))}
        </ul>
      )}

      {/* Coupon (placeholder — Week 6 sẽ wire vào server action) */}
      <div className="space-y-2">
        <label
          htmlFor="checkout-coupon"
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-300"
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Mã giảm giá</span>
        </label>
        <div className="flex gap-2">
          <input
            id="checkout-coupon"
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Nhập mã"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-xs text-white placeholder:text-neutral-600 outline-none transition-colors focus:border-[#D4A843]/60"
          />
          <button
            type="button"
            onClick={onApplyCoupon}
            disabled={applyDisabled}
            className="flex-shrink-0 rounded-md border border-[#D4A843]/40 bg-[#D4A843]/10 px-3 py-2 text-xs font-medium text-[#D4A843] transition-colors hover:bg-[#D4A843]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Áp dụng
          </button>
        </div>
        <p className="text-[10px] text-neutral-600">
          Tính năng coupon sẽ khả dụng sớm.
        </p>
      </div>

      {/* Totals */}
      <dl className="space-y-2 border-t border-white/10 pt-4 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-neutral-400">Tạm tính</dt>
          <dd className="font-medium text-white tabular-nums">
            {formatVnd(subtotal)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-400">
            Phí vận chuyển
            {shipping?.carrier && (
              <span className="ml-1 text-[10px] text-neutral-600">
                ({SHIPPING_CARRIER_LABELS[shipping.carrier]})
              </span>
            )}
          </dt>
          <dd className="font-medium text-white tabular-nums">
            {shippingFee === undefined
              ? "—"
              : shippingFee === 0
                ? "Miễn phí"
                : formatVnd(shippingFee)}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <dt className="text-sm font-semibold text-white">Tổng cộng</dt>
          <dd className="text-base font-semibold text-[#D4A843] tabular-nums">
            {formatVnd(total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function OrderSummarySidebar({
  cart,
  shipping,
  className = "",
}: OrderSummarySidebarProps) {
  // Coupon state — local only, chưa persist. Khi Week 6 wire vào sẽ chuyển
  // sang useTransition + server action `applyCoupon(cartId, code)`.
  const [couponCode, setCouponCode] = useState("");

  // Mobile accordion — mặc định đóng để không che form checkout chính.
  // User tap header để toggle. Trên desktop accordion luôn mở (sidebar full).
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalItems = cart.totalQuantity;
  const itemsLabel = useMemo(
    () => `${totalItems} sản phẩm`,
    [totalItems],
  );

  const handleApplyCoupon = () => {
    // Placeholder — Week 6.
    // TODO(week-6): gọi Server Action applyCoupon(couponCode), revalidate
    // cart query và surface error qua toast.
    if (process.env.NODE_ENV !== "production") {
      console.info("[OrderSummarySidebar] coupon apply (stub):", couponCode);
    }
  };

  return (
    <aside className={className} aria-label="Tóm tắt đơn hàng">
      {/* ---------------------------------------------------------------
          Mobile: collapsed accordion ở top page.
          - Header tap được, chevron đổi chiều.
          - Body slide xuống — dùng max-height transition để không jank.
          - Ẩn trên lg+ (desktop dùng sticky sidebar bên dưới).
        --------------------------------------------------------------- */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="order-summary-mobile-body"
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111] px-4 py-3 text-left transition-colors hover:border-white/20"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-white">
            <ShoppingBag className="h-4 w-4 text-[#D4A843]" />
            <span>Đơn hàng của bạn</span>
            <span className="text-xs text-neutral-500">({itemsLabel})</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#D4A843] tabular-nums">
              {formatVnd(cart.computedSubtotal + (shipping?.fee ?? 0))}
            </span>
            {mobileOpen ? (
              <ChevronUp className="h-4 w-4 text-neutral-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            )}
          </span>
        </button>

        {mobileOpen && (
          <div
            id="order-summary-mobile-body"
            className="mt-2 rounded-lg border border-white/10 bg-[#111] p-4"
          >
            <SummaryContent
              cart={cart}
              shipping={shipping}
              couponCode={couponCode}
              setCouponCode={setCouponCode}
              onApplyCoupon={handleApplyCoupon}
              applyDisabled={couponCode.trim().length === 0}
            />
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------
          Desktop: sticky sidebar.
          - top-4 = khoảng cách so với top viewport (tránh dính sát mép).
          - max-h-[calc(100vh-2rem)] + overflow-y-auto để khi items dài,
            sidebar tự scroll thay vì đẩy footer page.
          - Ẩn trên < lg.
        --------------------------------------------------------------- */}
      <div className="hidden lg:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-white/10 bg-[#111] p-5">
          <header className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShoppingBag className="h-4 w-4 text-[#D4A843]" />
              <span>Đơn hàng của bạn</span>
            </h2>
            <span className="text-xs text-neutral-500">{itemsLabel}</span>
          </header>

          <SummaryContent
            cart={cart}
            shipping={shipping}
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            onApplyCoupon={handleApplyCoupon}
            applyDisabled={couponCode.trim().length === 0}
          />
        </div>
      </div>
    </aside>
  );
}
