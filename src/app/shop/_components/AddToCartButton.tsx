"use client";

/**
 * AddToCartButton — placeholder client component.
 *
 * Week 3 sẽ wire vào cart server actions (`addToCart`) cộng dồn theo
 * `cart_token` cookie + `cart_items`. Hiện tại chỉ alert để user biết
 * tính năng đang trong roadmap và để PDP compile đầy đủ.
 */

import { useState } from "react";
import { ShoppingCart, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AddToCartButtonProps {
  productId: string;
  variantId: string | null;
  /** Số lượng người dùng đang chọn (1..99). */
  quantity: number;
  /** Nếu true → variant đang chọn hết hàng → disable button. */
  disabled?: boolean;
  /** Label tuỳ chỉnh (default "Thêm vào giỏ"). */
  label?: string;
  className?: string;
}

export default function AddToCartButton({
  productId,
  variantId,
  quantity,
  disabled = false,
  label = "Thêm vào giỏ",
  className,
}: AddToCartButtonProps) {
  const [pending, setPending] = useState(false);

  function handleClick() {
    setPending(true);
    // TODO(week-3): gọi server action addToCart({ productId, variantId, quantity })
    // và hiển thị toast/dialog xác nhận. Hiện dùng alert để compile.
    const lines = [
      "🛒 Tính năng giỏ hàng sẽ được mở ở Week 3.",
      "",
      `product_id: ${productId}`,
      `variant_id: ${variantId ?? "—"}`,
      `quantity:   ${quantity}`,
    ];
    window.alert(lines.join("\n"));
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-lg",
        "bg-[#D4A843] px-6 py-3 text-base font-semibold text-[#0a0a0a]",
        "transition hover:bg-[#e0b850] active:scale-[0.99]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {pending ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <ShoppingCart size={18} />
      )}
      <span>{pending ? "Đang xử lý..." : label}</span>
    </button>
  );
}
