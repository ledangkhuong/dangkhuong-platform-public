"use client";

import { useOptimistic, useTransition, useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { updateQuantity } from "@/lib/actions/cart";

type EditQuantityButtonProps = {
  itemId: string;
  /**
   * Số lượng hiện tại của item. Component này render trong CartItemRow
   * (Server Component) → mỗi lần cart re-fetch, prop này sẽ mới.
   * Accept cả 2 alias `quantity` và `initialQuantity` để không phá vỡ
   * caller hiện có.
   */
  quantity?: number;
  initialQuantity?: number;
  max?: number;
  /** Disable toàn bộ control (vd sản phẩm không còn bán). */
  disabled?: boolean;
};

export function EditQuantityButton({
  itemId,
  quantity,
  initialQuantity,
  max = 99,
  disabled = false,
}: EditQuantityButtonProps) {
  const startQuantity = quantity ?? initialQuantity ?? 1;
  const [isPending, startTransition] = useTransition();
  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(
    startQuantity,
    (_state, newQuantity: number) => newQuantity
  );
  const [inputValue, setInputValue] = useState(String(startQuantity));

  useEffect(() => {
    setInputValue(String(optimisticQuantity));
  }, [optimisticQuantity]);

  const commitQuantity = (next: number) => {
    const clamped = Math.max(1, Math.min(max, Math.floor(next)));
    if (clamped === optimisticQuantity) return;

    startTransition(async () => {
      setOptimisticQuantity(clamped);
      await updateQuantity({ itemId, quantity: clamped });
    });
  };

  const handleDecrement = () => {
    if (optimisticQuantity <= 1) return;
    commitQuantity(optimisticQuantity - 1);
  };

  const handleIncrement = () => {
    if (optimisticQuantity >= max) return;
    commitQuantity(optimisticQuantity + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < 1) {
      setInputValue(String(optimisticQuantity));
      return;
    }
    commitQuantity(parsed);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const decrementDisabled = optimisticQuantity <= 1 || isPending || disabled;
  const incrementDisabled = optimisticQuantity >= max || isPending || disabled;

  return (
    <div className="flex gap-1 items-center">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={decrementDisabled}
        aria-label="Giảm số lượng"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 transition-colors hover:bg-[#D4A843]/20 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        disabled={isPending || disabled}
        aria-label="Số lượng"
        className="w-12 text-center rounded-md border border-neutral-200 px-1 py-1 text-sm tabular-nums outline-none transition-colors focus:border-[#D4A843] focus:ring-1 focus:ring-[#D4A843] disabled:opacity-60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={incrementDisabled}
        aria-label="Tăng số lượng"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 transition-colors hover:bg-[#D4A843]/20 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default EditQuantityButton;
