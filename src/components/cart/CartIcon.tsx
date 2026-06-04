"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";

export type CartIconProps = {
  /** Tổng số lượng item trong cart (sum of quantities). */
  itemCount: number;
  /** Handler khi user click icon → mở CartSheet. */
  onClick: () => void;
  /** Accessible label cho screen reader. */
  ariaLabel?: string;
  /** className tùy chỉnh container. */
  className?: string;
};

/**
 * CartIcon — Client Component icon + badge cho header.
 *
 * - ShoppingCart icon (lucide-react)
 * - Badge tròn vàng (#D4A843) hiển thị count > 0
 * - Hiển thị "99+" nếu count > 99
 * - Pulse animation khi count tăng (useEffect compare prev/next)
 * - Hover: text-[#D4A843]
 *
 * State quản lý ở parent (CartIconContainer) — component này purely presentational.
 */
export function CartIcon({
  itemCount,
  onClick,
  ariaLabel,
  className,
}: CartIconProps) {
  const prevCountRef = useRef<number>(itemCount);
  const [pulse, setPulse] = useState(false);

  // Trigger pulse animation khi count tăng (không trigger khi giảm hoặc lần render đầu).
  useEffect(() => {
    const prev = prevCountRef.current;
    if (itemCount > prev) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      prevCountRef.current = itemCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = itemCount;
  }, [itemCount]);

  const hasItems = itemCount > 0;
  const display = itemCount > 99 ? "99+" : String(itemCount);

  const baseLabel =
    ariaLabel ??
    (hasItems
      ? `Mở giỏ hàng, ${itemCount} sản phẩm`
      : "Mở giỏ hàng, trống");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={baseLabel}
      className={[
        "relative inline-flex items-center justify-center",
        "h-10 w-10 rounded-full",
        "text-foreground transition-colors duration-150",
        "hover:text-[#D4A843] focus-visible:text-[#D4A843]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843] focus-visible:ring-offset-2",
        className ?? "",
      ].join(" ")}
    >
      <ShoppingCart className="h-6 w-6" aria-hidden="true" />

      {hasItems ? (
        <span
          aria-hidden="true"
          className={[
            "absolute -top-1 -right-1",
            "inline-flex items-center justify-center",
            "min-w-5 h-5 w-5 px-1",
            "rounded-full bg-[#D4A843] text-black",
            "text-xs font-bold leading-none tabular-nums",
            "ring-2 ring-background",
            pulse ? "animate-ping-once" : "",
          ].join(" ")}
        >
          {display}
        </span>
      ) : null}

      {/* Animation pulse fallback (inline keyframes via Tailwind arbitrary). */}
      <style jsx>{`
        @keyframes ping-once {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.25);
          }
          100% {
            transform: scale(1);
          }
        }
        :global(.animate-ping-once) {
          animation: ping-once 0.6s ease-out;
        }
      `}</style>
    </button>
  );
}

export default CartIcon;
