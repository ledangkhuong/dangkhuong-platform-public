"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  name?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
}

export default function PasswordInput({
  name = "password",
  placeholder = "Tối thiểu 8 ký tự",
  required = true,
  minLength = 8,
  className = "input-dark w-full",
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        className={className}
        required={required}
        minLength={minLength}
        style={{ paddingRight: "2.75rem" }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        tabIndex={-1}
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
