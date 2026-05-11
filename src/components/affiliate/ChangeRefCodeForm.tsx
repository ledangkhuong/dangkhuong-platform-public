"use client";

import { useState } from "react";
import { Edit3 } from "lucide-react";
import { changeRefCode } from "@/lib/actions/affiliate";

export default function ChangeRefCodeForm({ currentCode }: { currentCode: string }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-3 text-xs text-gray-500 hover:text-[#22c55e] transition-colors flex items-center gap-1"
      >
        <Edit3 size={12} />
        Đổi mã giới thiệu
      </button>
    );
  }

  return (
    <form action={changeRefCode} className="mt-3 flex items-center gap-2">
      <input
        name="new_ref_code"
        defaultValue={currentCode}
        placeholder="Mã mới (4-20 ký tự)"
        className="input-dark text-sm flex-1"
        maxLength={20}
        minLength={4}
        required
        style={{ textTransform: "uppercase" }}
      />
      <button type="submit" className="btn-green text-xs py-1.5 px-3 shrink-0">
        Lưu
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-gray-500 hover:text-white transition-colors py-1.5 px-2"
      >
        Huỷ
      </button>
    </form>
  );
}
