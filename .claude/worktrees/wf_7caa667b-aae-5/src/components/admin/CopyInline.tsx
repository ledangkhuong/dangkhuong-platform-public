"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyInline({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copy: ${value}`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-gray-300 hover:text-white transition-colors"
      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
    >
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
      {copied ? "Đã copy" : label}
    </button>
  );
}
