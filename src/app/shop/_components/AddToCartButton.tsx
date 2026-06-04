"use client";

/**
 * AddToCartButton — Client Component, gọi Server Action `addItem` để thêm
 * sản phẩm vào giỏ hàng cộng dồn (Week 3).
 *
 * Behavior:
 * - useTransition để có pending state (button disabled + spinner).
 * - Gọi `addItem({ productId, variantId, quantity })`.
 * - Toast success/error qua sonner nếu provider có mount, fallback console.
 * - Khi success → router.refresh() để CartIcon badge (Server Component) tự
 *   re-fetch count mới (revalidatePath đã được gọi trong server action,
 *   refresh() đảm bảo header re-render ngay với user).
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2 } from "lucide-react";

import { addItem } from "@/lib/actions/cart";
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

/**
 * Toast helper.
 *
 * sonner (toaster lib) chưa được cài/mount ở repo này, nên ta dùng pattern
 * "fire CustomEvent" — bất kỳ Toaster nào (sonner, Radix, custom) mount sau
 * này chỉ cần listen `dk:toast` là nhận được message. Fallback hiện tại:
 *  - success: console.info (không spam UI).
 *  - error:   console.error + window.alert (để user biết tại sao add fail).
 */
function toast(kind: "success" | "error", message: string) {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("dk:toast", { detail: { kind, message } })
      );
    } catch {
      /* noop */
    }
  }
  if (kind === "error") {
    console.error("[cart] " + message);
    if (typeof window !== "undefined") window.alert(message);
  } else {
    console.info("[cart] " + message);
  }
}

export default function AddToCartButton({
  productId,
  variantId,
  quantity,
  disabled = false,
  label = "Thêm vào giỏ",
  className,
}: AddToCartButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (disabled || pending) return;

    startTransition(async () => {
      const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));
      const result = await addItem({
        productId,
        variantId,
        quantity: safeQty,
      });

      if (result.ok) {
        toast("success", "Đã thêm vào giỏ hàng");
        // Refresh để CartIconWrapper (Server Component) lấy count mới.
        router.refresh();
      } else {
        toast(
          "error",
          result.error || "Không thể thêm vào giỏ. Vui lòng thử lại."
        );
      }
    });
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
