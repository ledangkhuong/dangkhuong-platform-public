"use client";

/**
 * OrderFilterBar — unified filter bar for physical/mixed order list pages.
 *
 * Drives the following search params (Server Component re-fetches via the
 * Next.js router):
 *   - q              free-text search (mã đơn, email, SĐT, tên khách)
 *   - status         pending | paid | cancelled | refunded (multi)
 *   - payment_method sepay | payos | cod | bank_transfer
 *   - carrier        ghn | ghtk | viettel_post | jt | self
 *   - from / to      ISO date strings (YYYY-MM-DD)
 *
 * Behaviour:
 *   - Search input is debounced 300ms; it pushes `q` then resets `page`.
 *   - Status chips are multi-select (comma-separated in the URL).
 *   - Every change uses `router.replace` so the browser back stack stays clean.
 *   - "Reset" clears every filter this bar controls but preserves anything
 *     unrelated (sort, page-size etc.) that other components might own.
 */

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Search, X, Calendar, RotateCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export type OrderStatus = "pending" | "paid" | "cancelled" | "refunded";
export type PaymentMethod = "sepay" | "payos" | "cod" | "bank_transfer";
export type Carrier = "ghn" | "ghtk" | "viettel_post" | "jt" | "self";

export interface OrderFilters {
  q: string;
  status: OrderStatus[];
  payment_method: PaymentMethod | "";
  carrier: Carrier | "";
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface OrderFilterBarProps {
  initialFilters: Partial<OrderFilters>;
  routePath: string; // e.g. '/admin/orders/physical'
}

interface StatusChip {
  key: OrderStatus;
  label: string;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}

const STATUS_CHIPS: StatusChip[] = [
  {
    key: "pending",
    label: "Chờ xử lý",
    activeColor: "#fbbf24",
    activeBg: "rgba(251,191,36,0.14)",
    activeBorder: "rgba(251,191,36,0.4)",
  },
  {
    key: "paid",
    label: "Đã thanh toán",
    activeColor: "#22c55e",
    activeBg: "rgba(34,197,94,0.14)",
    activeBorder: "rgba(34,197,94,0.4)",
  },
  {
    key: "cancelled",
    label: "Đã hủy",
    activeColor: "#ef4444",
    activeBg: "rgba(239,68,68,0.14)",
    activeBorder: "rgba(239,68,68,0.4)",
  },
  {
    key: "refunded",
    label: "Hoàn tiền",
    activeColor: "#9ca3af",
    activeBg: "rgba(156,163,175,0.14)",
    activeBorder: "rgba(156,163,175,0.4)",
  },
];

const PAYMENT_OPTIONS: { value: PaymentMethod | ""; label: string }[] = [
  { value: "", label: "Tất cả phương thức" },
  { value: "sepay", label: "SePay" },
  { value: "payos", label: "PayOS" },
  { value: "cod", label: "COD" },
  { value: "bank_transfer", label: "Chuyển khoản" },
];

const CARRIER_OPTIONS: { value: Carrier | ""; label: string }[] = [
  { value: "", label: "Tất cả nhà vận chuyển" },
  { value: "ghn", label: "GHN" },
  { value: "ghtk", label: "GHTK" },
  { value: "viettel_post", label: "Viettel Post" },
  { value: "jt", label: "J&T Express" },
  { value: "self", label: "Tự giao" },
];

// Keys this bar owns — used by Reset to know what to clear without nuking
// unrelated params owned by other components (sort, page_size, etc.).
const OWNED_KEYS = [
  "q",
  "status",
  "payment_method",
  "carrier",
  "from",
  "to",
  "page",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const baseInputStyle = {
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  color: "#fff",
} as const;

const accentBtnStyle = {
  background: "rgba(212,168,67,0.12)",
  color: "#D4A843",
  border: "1px solid rgba(212,168,67,0.25)",
} as const;

export default function OrderFilterBar({
  initialFilters,
  routePath,
}: OrderFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local controlled value for the search box — debounced into the URL.
  const [searchValue, setSearchValue] = useState(initialFilters.q ?? "");
  // Keep search box in sync if parent (Server Component) navigates / resets.
  // Use a ref so we don't fight the user while they're typing.
  const lastPushedSearch = useRef(initialFilters.q ?? "");

  // Derive current state directly from URL — single source of truth — so
  // chips & dropdowns stay correct after back/forward navigation.
  const current = useMemo<OrderFilters>(() => {
    const statusRaw = searchParams.get("status") ?? "";
    const status = statusRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is OrderStatus =>
        ["pending", "paid", "cancelled", "refunded"].includes(s),
      );
    return {
      q: searchParams.get("q") ?? "",
      status,
      payment_method: (searchParams.get("payment_method") ?? "") as
        | PaymentMethod
        | "",
      carrier: (searchParams.get("carrier") ?? "") as Carrier | "",
      from: searchParams.get("from") ?? "",
      to: searchParams.get("to") ?? "",
    };
  }, [searchParams]);

  // ---- URL push helper -----------------------------------------------------
  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      // Any filter change should drop the page back to 1.
      params.delete("page");
      const qs = params.toString();
      router.replace(`${routePath}${qs ? `?${qs}` : ""}`);
    },
    [router, routePath, searchParams],
  );

  // ---- Debounced search ----------------------------------------------------
  useEffect(() => {
    // Don't push on mount if nothing changed.
    if (searchValue === lastPushedSearch.current) return;

    const handle = window.setTimeout(() => {
      lastPushedSearch.current = searchValue;
      pushParams((params) => {
        const trimmed = searchValue.trim();
        if (trimmed) params.set("q", trimmed);
        else params.delete("q");
      });
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchValue, pushParams]);

  // ---- Status chip toggle --------------------------------------------------
  const toggleStatus = useCallback(
    (key: OrderStatus) => {
      pushParams((params) => {
        const next = new Set(current.status);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        if (next.size === 0) params.delete("status");
        else params.set("status", Array.from(next).join(","));
      });
    },
    [current.status, pushParams],
  );

  // ---- Dropdown handlers ---------------------------------------------------
  const onPaymentChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      pushParams((params) => {
        if (value) params.set("payment_method", value);
        else params.delete("payment_method");
      });
    },
    [pushParams],
  );

  const onCarrierChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      pushParams((params) => {
        if (value) params.set("carrier", value);
        else params.delete("carrier");
      });
    },
    [pushParams],
  );

  // ---- Date range ----------------------------------------------------------
  const onDateChange = useCallback(
    (field: "from" | "to") => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      pushParams((params) => {
        if (value) params.set(field, value);
        else params.delete(field);
      });
    },
    [pushParams],
  );

  // ---- Reset ---------------------------------------------------------------
  const reset = useCallback(() => {
    setSearchValue("");
    lastPushedSearch.current = "";
    pushParams((params) => {
      for (const key of OWNED_KEYS) params.delete(key);
    });
  }, [pushParams]);

  const hasAnyFilter =
    !!current.q ||
    current.status.length > 0 ||
    !!current.payment_method ||
    !!current.carrier ||
    !!current.from ||
    !!current.to;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-2xl"
      style={{ background: "#0f0f0f", border: "1px solid #1f1f1f" }}
    >
      {/* Row 1: search + reset */}
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="relative flex-1 md:max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Tìm mã đơn, email, SĐT, tên khách..."
            className="w-full pl-9 pr-9 py-2 rounded-xl text-sm placeholder-gray-600 outline-none transition-colors"
            style={baseInputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(212,168,67,0.4)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
            }}
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex-1" />

        {hasAnyFilter && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              background: "#1a1a1a",
              color: "#9ca3af",
              border: "1px solid #2a2a2a",
            }}
          >
            <RotateCcw size={13} />
            Đặt lại bộ lọc
          </button>
        )}
      </div>

      {/* Row 2: status chips */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_CHIPS.map((chip) => {
          const isActive = current.status.includes(chip.key);
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => toggleStatus(chip.key)}
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

      {/* Row 3: dropdowns + date range */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={current.payment_method}
          onChange={onPaymentChange}
          className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer transition-colors"
          style={baseInputStyle}
        >
          {PAYMENT_OPTIONS.map((opt) => (
            <option key={opt.value || "_all_pay"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={current.carrier}
          onChange={onCarrierChange}
          className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer transition-colors"
          style={baseInputStyle}
        >
          {CARRIER_OPTIONS.map((opt) => (
            <option key={opt.value || "_all_car"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Calendar
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              type="date"
              value={current.from}
              onChange={onDateChange("from")}
              max={current.to || undefined}
              className="pl-8 pr-2 py-2 rounded-xl text-sm outline-none transition-colors"
              style={baseInputStyle}
              aria-label="Từ ngày"
            />
          </div>
          <span className="text-xs text-gray-500">→</span>
          <div className="relative">
            <Calendar
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              type="date"
              value={current.to}
              onChange={onDateChange("to")}
              min={current.from || undefined}
              className="pl-8 pr-2 py-2 rounded-xl text-sm outline-none transition-colors"
              style={baseInputStyle}
              aria-label="Đến ngày"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export for callers that want the accent style tokens.
export { accentBtnStyle, baseInputStyle };
