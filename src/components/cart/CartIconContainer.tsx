"use client";

import { useState } from "react";
import { CartIcon } from "./CartIcon";

export type CartIconContainerProps = {
  /** Initial count fetched server-side (passed từ wrapper). */
  initialItemCount: number;
  /** className tùy chỉnh forward sang CartIcon. */
  className?: string;
};

/**
 * CartIconContainer — Client Component bọc CartIcon + manage state open/close Sheet.
 *
 * Responsibility:
 * - Hold `isOpen` state cho CartSheet
 * - Cung cấp `onClick` mở Sheet cho CartIcon
 * - Render <CartSheet open onOpenChange /> (dynamic import khi component ready)
 *
 * NOTE: CartSheet chưa được tích hợp ở đây — placeholder để parent component
 * (hoặc bước tiếp theo) wire vào. Khi CartSheet sẵn sàng:
 *   import { CartSheet } from "./CartSheet";
 *   <CartSheet open={isOpen} onOpenChange={setIsOpen} />
 *
 * itemCount truyền vào là snapshot từ server. Nếu cần real-time update sau khi
 * mutate cart, parent có thể truyền itemCount mới hoặc revalidatePath sẽ
 * re-render wrapper (Server Component) và pass count mới xuống đây.
 */
export function CartIconContainer({
  initialItemCount,
  className,
}: CartIconContainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  return (
    <>
      <CartIcon
        itemCount={initialItemCount}
        onClick={handleOpen}
        className={className}
      />

      {/*
        TODO(week-3): mount CartSheet khi component sẵn sàng.
        <CartSheet open={isOpen} onOpenChange={setIsOpen} />

        Giữ state ở đây để CartSheet (Sheet shadcn) nhận controlled props
        open + onOpenChange. Khi user đóng Sheet, setIsOpen(false) được gọi
        thông qua onOpenChange.
      */}
      {isOpen ? (
        <div
          // Fallback overlay tạm thời cho đến khi CartSheet wire vào.
          // Tránh "dangling" UX khi click icon nhưng chưa có sheet.
          role="presentation"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/40"
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

export default CartIconContainer;
