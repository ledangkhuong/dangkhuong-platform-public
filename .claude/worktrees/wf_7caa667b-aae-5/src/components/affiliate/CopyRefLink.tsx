"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyRefLink({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn-green px-3 text-sm shrink-0"
      title={copied ? "Đã copy!" : "Copy link"}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
