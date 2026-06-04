"use client";

/**
 * OrderSourceFilter — chip row that filters /admin/orders by revenue source.
 *
 *   "Tất cả"            → no filter (default)
 *   "Doanh thu nền tảng" → revenue_source = 'platform' OR NULL
 *   "Cấp khóa ngoài"     → revenue_source = 'external'
 *   "Tặng / Comp"        → revenue_source = 'comp'
 *
 * Drives the `?source=` query param; the page component reads it and applies
 * the corresponding filter to its Supabase queries. Resets `?page=` on change
 * so the user lands on page 1 of the new filtered set.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type SourceFilter = "all" | "platform" | "external" | "comp";

interface ChipDef {
  key: SourceFilter;
  label: string;
  // Active chip colour — matches Hero / DirectGrantModal palette so the
  // filter visually maps to the same concept it represents.
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}

const CHIPS: ChipDef[] = [
  {
    key: "all",
    label: "Tất cả",
    activeColor: "#D4A843",
    activeBg: "rgba(212,168,67,0.16)",
    activeBorder: "rgba(212,168,67,0.45)",
  },
  {
    key: "platform",
    label: "Doanh thu nền tảng",
    activeColor: "#D4A843",
    activeBg: "rgba(212,168,67,0.16)",
    activeBorder: "rgba(212,168,67,0.45)",
  },
  {
    key: "external",
    label: "Cấp khóa ngoài",
    activeColor: "#22c55e",
    activeBg: "rgba(34,197,94,0.14)",
    activeBorder: "rgba(34,197,94,0.4)",
  },
  {
    key: "comp",
    label: "Tặng / Comp",
    activeColor: "#9ca3af",
    activeBg: "rgba(156,163,175,0.14)",
    activeBorder: "rgba(156,163,175,0.4)",
  },
];

export default function OrderSourceFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("source") ?? "all") as SourceFilter;

  const select = useCallback(
    (key: SourceFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "all") {
        params.delete("source");
      } else {
        params.set("source", key);
      }
      // Drop page when changing the filter — old page index almost certainly
      // doesn't exist in the new result set.
      params.delete("page");
      const qs = params.toString();
      router.push(`/admin/orders${qs ? `?${qs}` : ""}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
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
