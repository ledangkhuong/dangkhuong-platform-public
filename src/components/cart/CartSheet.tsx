"use client"

import * as React from "react"
import Link from "next/link"
import { ShoppingBagIcon } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { CartWithItems } from "@/types/ecommerce"

/**
 * Format VND amount as "123.456 ₫".
 * Kept local so this client component doesn't pull a server-only helper.
 */
function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0))
}

export interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: CartWithItems | null
  /**
   * Slot for the actual <CartItemRow /> list. Wiring will be added in a
   * follow-up — CartSheet stays presentational so the row component can
   * own its own optimistic-update wiring.
   */
  renderItem?: (item: CartWithItems["items"][number]) => React.ReactNode
}

export function CartSheet({
  open,
  onOpenChange,
  cart,
  renderItem,
}: CartSheetProps) {
  const items = cart?.items ?? []
  const itemCount = items.reduce((sum, it) => sum + (it.quantity ?? 0), 0)
  const subtotal =
    typeof cart?.subtotal === "number"
      ? cart.subtotal
      : items.reduce(
          (sum, it) => sum + (it.unit_price ?? 0) * (it.quantity ?? 0),
          0,
        )

  const isEmpty = items.length === 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle>
            Giỏ hàng{" "}
            <span className="text-white/50 font-normal">({itemCount})</span>
          </SheetTitle>
        </SheetHeader>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full",
                "bg-white/5 text-white/40",
              )}
            >
              <ShoppingBagIcon className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-white">
                Giỏ hàng trống
              </p>
              <p className="text-sm text-white/50">
                Hãy khám phá các sản phẩm của chúng tôi.
              </p>
            </div>
            <SheetClose
              render={
                <Link
                  href="/shop"
                  className={cn(
                    "mt-2 inline-flex items-center justify-center rounded-md",
                    "bg-[#D4A843] px-5 py-2.5 text-sm font-medium text-black",
                    "hover:bg-[#c39a3a] transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:ring-offset-2 focus:ring-offset-[#1a1a1a]",
                  )}
                >
                  Tiếp tục mua sắm
                </Link>
              }
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ul className="divide-y divide-white/10">
              {items.map((item) => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  {renderItem ? (
                    renderItem(item)
                  ) : (
                    <DefaultItemRow item={item} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isEmpty && (
          <SheetFooter className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Tạm tính</span>
              <span className="text-lg font-semibold text-[#D4A843]">
                {formatVnd(subtotal)}
              </span>
            </div>
            <p className="text-xs text-white/40">
              Phí vận chuyển và khuyến mãi sẽ được tính ở bước thanh toán.
            </p>
            <SheetClose
              render={
                <Link
                  href="/checkout"
                  className={cn(
                    "flex w-full items-center justify-center rounded-md",
                    "bg-[#D4A843] px-5 py-3 text-sm font-semibold text-black",
                    "hover:bg-[#c39a3a] transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:ring-offset-2 focus:ring-offset-[#1a1a1a]",
                  )}
                >
                  Thanh toán
                </Link>
              }
            />
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

/**
 * Lightweight placeholder row rendered when no `renderItem` prop is
 * provided. Real <CartItemRow /> with qty controls + remove action
 * will replace this via the `renderItem` slot in the next task.
 */
function DefaultItemRow({
  item,
}: {
  item: CartWithItems["items"][number]
}) {
  const snapshot = item.product_snapshot
  const name = snapshot?.product_name ?? item.product?.name ?? "Sản phẩm"
  const thumb =
    snapshot?.thumbnail_url ?? item.product?.thumbnail_url ?? null
  const variantName =
    snapshot?.variant_name ?? item.variant?.name ?? null
  const lineTotal = (item.unit_price ?? 0) * (item.quantity ?? 0)

  return (
    <div className="flex gap-3">
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-white/5">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/30">
            <ShoppingBagIcon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-sm font-medium text-white">{name}</p>
        {variantName && (
          <p className="text-xs text-white/50">{variantName}</p>
        )}
        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="text-white/60">SL: {item.quantity}</span>
          <span className="font-medium text-white">
            {formatVnd(lineTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CartSheet
