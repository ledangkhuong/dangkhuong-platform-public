"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

interface ShareButtonsProps {
  title: string;
  slug: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";

export default function ShareButtons({ title, slug }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const url = `${BASE_URL}/blog/${slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shares = [
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "#1877F2",
      bg: "rgba(24,119,242,0.1)",
      border: "rgba(24,119,242,0.25)",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: "#fff",
      bg: "rgba(255,255,255,0.06)",
      border: "rgba(255,255,255,0.15)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "#0A66C2",
      bg: "rgba(10,102,194,0.1)",
      border: "rgba(10,102,194,0.25)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: "Zalo",
      href: `https://zalo.me/share?url=${encodedUrl}`,
      color: "#0068FF",
      bg: "rgba(0,104,255,0.1)",
      border: "rgba(0,104,255,0.25)",
      icon: (
        <svg width="16" height="16" viewBox="0 0 48 48" fill="currentColor">
          <path d="M24 0C10.745 0 0 10.745 0 24s10.745 24 24 24 24-10.745 24-24S37.255 0 24 0zm5.032 34.316H17.156c-1.074 0-1.944-.868-1.944-1.944 0-.498.19-.97.536-1.328l10.68-11.364h-9.244a1.26 1.26 0 010-2.52h11.048c1.074 0 1.944.87 1.944 1.944 0 .498-.19.97-.536 1.328L18.96 31.796h10.072a1.26 1.26 0 010 2.52zM35.84 22.54a2.72 2.72 0 01-2.72 2.72 2.72 2.72 0 01-2.72-2.72v-5.38a2.72 2.72 0 012.72-2.72 2.72 2.72 0 012.72 2.72v5.38z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Chia sẻ bài viết
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {shares.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: s.bg,
              color: s.color,
              border: `1px solid ${s.border}`,
            }}
            title={`Chia sẻ lên ${s.name}`}
          >
            {s.icon}
            {s.name}
          </a>
        ))}

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.06)",
            color: copied ? "#22c55e" : "#9ca3af",
            border: `1px solid ${copied ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)"}`,
          }}
          title="Sao chép link"
        >
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? "Đã sao chép!" : "Sao chép link"}
        </button>
      </div>
    </div>
  );
}
