"use client";

/**
 * OrderUtmFilter — dropdown that filters /admin/orders by marketing source
 * (utm_source).
 *
 *   "Tất cả nguồn"  → no filter (default)
 *   "Facebook"       → utm_source = 'facebook'
 *   "Google"         → utm_source = 'google'
 *   "Zalo"           → utm_source = 'zalo'
 *   "Email"          → utm_source = 'email'
 *   "YouTube"        → utm_source = 'youtube'
 *
 * Drives the `?utm=` query param; the page component reads it and applies the
 * corresponding filter to its Supabase queries. Resets `?page=` on change.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Megaphone } from "lucide-react";

export type UtmFilter =
  | "all"
  | "facebook"
  | "google"
  | "zalo"
  | "email"
  | "youtube";

interface ChipDef {
  key: UtmFilter;
  label: string;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}

const CHIPS: ChipDef[] = [
  {
    key: "all",
    label: "Tất cả nguồn",
    activeColor: "#D4A843",
    activeBg: "rgba(212,168,67,0.16)",
    activeBorder: "rgba(212,168,67,0.45)",
  },
  {
    key: "facebook",
    label: "Facebook",
    activeColor: "#1877F2",
    activeBg: "rgba(24,119,242,0.15)",
    activeBorder: "rgba(24,119,242,0.4)",
  },
  {
    key: "google",
    label: "Google",
    activeColor: "#EA4335",
    activeBg: "rgba(234,67,53,0.15)",
    activeBorder: "rgba(234,67,53,0.4)",
  },
  {
    key: "zalo",
    label: "Zalo",
    activeColor: "#0068FF",
    activeBg: "rgba(0,104,255,0.15)",
    activeBorder: "rgba(0,104,255,0.4)",
  },
  {
    key: "email",
    label: "Email",
    activeColor: "#f59e0b",
    activeBg: "rgba(245,158,11,0.15)",
    activeBorder: "rgba(245,158,11,0.4)",
  },
  {
    key: "youtube",
    label: "YouTube",
    activeColor: "#FF0000",
    activeBg: "rgba(255,0,0,0.15)",
    activeBorder: "rgba(255,0,0,0.4)",
  },
];

export default function OrderUtmFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("utm") ?? "all") as UtmFilter;

  const select = useCallback(
    (key: UtmFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "all") {
        params.delete("utm");
      } else {
        params.set("utm", key);
      }
      params.delete("page");
      const qs = params.toString();
      router.push(`/admin/orders${qs ? `?${qs}` : ""}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Megaphone size={14} className="text-gray-500" />
      {CHIPS.map((chip) => {
        const isActive = current === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => select(chip.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
            style={
              isActive
                ? {
                    background: chip.activeBg,
                    color: chip.activeColor,
                    border: `1px solid ${chip.activeBorder}`,
                  }
                : {
                    background: "#1a1a1a",
                    color: "#9ca3af",
                    border: "1px solid #2a2a2a",
                  }
            }
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
