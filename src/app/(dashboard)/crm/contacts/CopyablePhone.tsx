"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check, Phone } from "lucide-react";

/**
 * Phone number display with a one-click copy button.
 *
 * Layout:
 *   <Phone icon> [number] [Copy button]
 *
 * After click:
 *   - Writes the digits-only phone number to the clipboard (so it can be
 *     pasted straight into a dialer / messaging app without "(", ")", or
 *     leading "+84" being doubled if the user re-types it).
 *   - Swaps the button icon to a green check for 1.5s as feedback.
 *   - Logs nothing on failure — we silently no-op if clipboard write
 *     fails (e.g. older browsers without secure context).
 *
 * `compact` renders a smaller version intended to sit as a sub-line
 * under a primary identifier (the customer's name in the table); the
 * default render is comfortable on its own.
 */
export default function CopyablePhone({
  phone,
  compact = false,
}: {
  phone: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy(e: React.MouseEvent) {
    // Prevent the click bubbling up to row-level handlers (e.g. the row
    // link that opens contact detail).
    e.preventDefault();
    e.stopPropagation();

    // Strip everything except digits and the leading "+" so paste lands
    // in a dialer cleanly.
    const cleaned = phone.replace(/[^\d+]/g, "");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(cleaned);
      } else {
        // Fallback for non-secure contexts (rare on prod, possible on
        // local dev over http).
        const ta = document.createElement("textarea");
        ta.value = cleaned;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }

      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent no-op
    }
  }

  const numberClass = compact
    ? "text-[11px] text-gray-400 tabular-nums tracking-tight"
    : "text-xs text-gray-300 tabular-nums";

  const iconSize = compact ? 10 : 12;
  const buttonSize = compact ? 11 : 13;

  return (
    <span
      className="inline-flex items-center gap-1.5 group"
      onClick={(e) => e.stopPropagation()}
    >
      <Phone size={iconSize} className="text-gray-500 shrink-0" />
      <a
        href={`tel:${phone.replace(/\s+/g, "")}`}
        className={`${numberClass} hover:text-[#D4A843] transition-colors`}
        onClick={(e) => e.stopPropagation()}
        title="Bấm để gọi"
      >
        {phone}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Đã copy!" : "Copy SĐT"}
        aria-label={copied ? "Đã copy số điện thoại" : "Copy số điện thoại"}
        className={`inline-flex items-center justify-center rounded transition-colors ${
          copied
            ? "text-[#22c55e]"
            : "text-gray-500 hover:text-[#D4A843] opacity-60 group-hover:opacity-100"
        }`}
      >
        {copied ? (
          <Check size={buttonSize} strokeWidth={2.5} />
        ) : (
          <Copy size={buttonSize} />
        )}
      </button>
      {copied && (
        <span className="text-[10px] font-semibold text-[#22c55e] animate-in fade-in">
          Đã copy
        </span>
      )}
    </span>
  );
}
