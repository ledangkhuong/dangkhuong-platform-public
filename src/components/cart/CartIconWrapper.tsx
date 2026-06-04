import { getCartItemCount } from "@/lib/ecommerce/cart-queries";
import { CartIconContainer } from "./CartIconContainer";

export type CartIconWrapperProps = {
  /** className forward xuống <CartIcon> để align trong header. */
  className?: string;
};

/**
 * CartIconWrapper — Server Component.
 *
 * Fetch tổng số lượng item trong cart hiện tại (user-bound hoặc guest qua
 * cookie `dk_cart_id`) qua `getCartItemCount()`, sau đó pass xuống
 * <CartIconContainer> (Client Component) để render icon + manage state Sheet.
 *
 * An toàn cho SSR/streaming: `getCartItemCount` đã trả về 0 khi không có cart,
 * không throw cho path không-có-cookie.
 *
 * Cách dùng trong header:
 *   import { CartIconWrapper } from "@/components/cart/CartIconWrapper";
 *   ...
 *   <CartIconWrapper />
 *
 * Để re-render badge sau khi mutate cart, gọi `revalidatePath("/")` (hoặc
 * path đang chứa header) trong Server Action — wrapper sẽ re-fetch count.
 */
export async function CartIconWrapper({ className }: CartIconWrapperProps) {
  let itemCount = 0;
  try {
    itemCount = await getCartItemCount();
  } catch (err) {
    // Không vỡ header chỉ vì badge fail — log và fallback 0.
    console.error("[components/cart/CartIconWrapper] getCartItemCount failed", err);
    itemCount = 0;
  }

  return (
    <CartIconContainer initialItemCount={itemCount} className={className} />
  );
}

export default CartIconWrapper;
