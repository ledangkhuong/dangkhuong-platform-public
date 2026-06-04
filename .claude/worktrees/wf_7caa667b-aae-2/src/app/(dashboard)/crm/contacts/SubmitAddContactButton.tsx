"use client";

import { UserPlus, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

/**
 * Submit button for the "Thêm khách hàng mới" form.
 * Uses React's `useFormStatus` to know when the parent form is mid-submit so
 * we can disable the button + swap the label/icon. Pairs with the
 * recent-duplicate guard in the `createContact` server action — together
 * they make double-click submits impossible to commit.
 */
export default function SubmitAddContactButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="btn-green px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          Đang tạo…
        </>
      ) : (
        <>
          <UserPlus size={14} />
          Thêm KH
        </>
      )}
    </button>
  );
}
