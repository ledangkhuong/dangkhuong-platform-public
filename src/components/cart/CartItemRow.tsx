"use client";

/**
 * CartItemRow — 1 hàng trong giỏ hàng (Client Component).
 *
 * Layout horizontal (mobile-first, cũng OK trên desktop):
 *   [thumbnail 80x80] | [info: name, variant, unit price] | [qty controls] | [remove X]
 *
 * Tương tác:
 *  - Quantity controls dùng <EditQuantityButton/> (gọi updateQuantity action).
 *  - Remove: nút X, gọi removeItem(itemId) bọc trong useTransition để
 *    hiện loading state (giảm opacity row).
 *  - Khi product không còn `status='active'` (đã archived/draft) hoặc
 *    `item.product == null` (đã bị xoá), ta:
 *      * disable quantity controls (vẫn cho remove),
 *      * hiện cảnh báo "Sản phẩm không còn bán",
 *      * fallback hiển thị qua product_snapshot (name/thumbnail/slug).
 *
 * Subtotal mỗi row = unit_price * quantity, format theo VND.
 */

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { removeItem } from "@/lib/actions/cart";
import type { CartItemWithProduct } from "@/types/ecommerce";
import { cn } from "@/lib/utils";

import { EditQuantityButton } from "./EditQuantityButton";

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatVND(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return vndFormatter.format(n);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CartItemRowProps {
  item: CartItemWithProduct;
  /**
   * Khi true → render compact hơn (vd: trong cart Sheet).
   * Mặc định false dùng cho /cart page.
   */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CartItemRow({ item, compact = false }: CartItemRowProps) {
  const [isRemoving, startRemoveTransition] = useTransition();

  // ---- Resolve display fields (ưu tiên data live, fallback snapshot) -----
  const snapshot = item.product_snapshot;
  const product = item.product;
  const variant = item.variant;

  const productActive = product?.status === "active";
  const productAvailable = !!product && productActive;

  const displayName =
    product?.name ?? snapshot?.product_name ?? "Sản phẩm";
  const displaySlug = product?.slug ?? snapshot?.product_slug ?? null;
  const displayThumb =
    product?.thumbnail_url ?? snapshot?.thumbnail_url ?? null;
  const displayVariantName = variant?.name ?? snapshot?.variant_name ?? null;

  const unitPrice = Number(item.unit_price) || 0;
  const lineTotal = unitPrice * item.quantity;

  // ---- Actions -----------------------------------------------------------
  function handleRemove() {
    startRemoveTransition(async () => {
      await removeItem(item.id);
    });
  }

  // ---- Render ------------------------------------------------------------
  const thumbSize = compact ? 64 : 80;

  return (
    <div
      data-cart-item-id={item.id}
      className={cn(
        "flex items-start gap-3 py-3 transition-opacity",
        isRemoving && "pointer-events-none opacity-50"
      )}
    >
      {/* Thumbnail */}
      <div
        className="relative shrink-0 overflow-hidden rounded-md border bg-muted"
        style={{ width: thumbSize, height: thumbSize }}
      >
        {displayThumb ? (
          <Image
            src={displayThumb}
            alt={displayName}
            fill
            sizes={`${thumbSize}px`}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>

      {/* Info + actions */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {displaySlug ? (
              <Link
                href={`/shop/${displaySlug}`}
                className="line-clamp-2 text-sm font-medium hover:underline"
              >
                {displayName}
              </Link>
            ) : (
              <span className="line-clamp-2 text-sm font-medium">
                {displayName}
              </span>
            )}

            {displayVariantName && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {displayVariantName}
              </div>
            )}

            <div className="mt-1 text-xs text-muted-foreground">
              {formatVND(unitPrice)}{" "}
              <span className="text-muted-foreground/70">/ sp</span>
            </div>
          </div>

          {/* Remove button — luôn cho phép xoá kể cả khi product không còn active */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Xoá khỏi giỏ"
            onClick={handleRemove}
            disabled={isRemoving}
            className="text-muted-foreground hover:text-destructive"
          >
            <X />
          </Button>
        </div>

        {/* Warning khi product không còn bán */}
        {!productAvailable && (
          <div className="rounded-sm bg-destructive/10 px-2 py-1 text-xs text-destructive">
            Sản phẩm không còn bán. Bạn vẫn có thể xoá khỏi giỏ.
          </div>
        )}

        {/* Quantity + line total */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center">
            <EditQuantityButton
              itemId={item.id}
              quantity={item.quantity}
              disabled={!productAvailable}
            />
          </div>

          <div className="text-sm font-semibold tabular-nums">
            {formatVND(lineTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartItemRow;
