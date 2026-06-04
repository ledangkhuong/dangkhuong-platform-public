"use client";

/**
 * AddressCascade — cascading select Tỉnh/Thành → Phường/Xã (Week 4 — Step 1).
 *
 * Hành vi:
 * - Mount xong fetch provinces 1 lần từ `/api/vn-address/provinces` (cache 1h).
 * - Khi user chọn province → fetch wards của tỉnh đó qua
 *   `/api/vn-address/wards?province=<code>`.
 * - Khi user chọn ward → gọi `onChange({ province_code, ward_code })`.
 * - Đổi tỉnh → reset ward_code về rỗng và emit ngay để form ngoài biết.
 * - Search-as-you-type filter client-side trong dropdown (lọc bằng
 *   `String.includes` + normalize bỏ dấu tiếng Việt).
 *
 * UI:
 * - Hai trigger button kiểu combobox (giữ tone với shadcn outline + dark theme
 *   #0a0a0a, accent #D4A843). Dropdown panel render bằng absolute positioning
 *   thay vì Popover primitive (chưa add) — đủ tốt cho form checkout.
 * - Đóng dropdown khi click ra ngoài hoặc Escape.
 *
 * Props:
 * - `value` — `{ province_code, ward_code }`, controlled bởi parent (lưu vào
 *   sessionStorage / URL).
 * - `onChange` — gọi mỗi khi cặp giá trị thay đổi.
 * - `error` — chuỗi lỗi tổng (validation) hiển thị bên dưới hai select.
 *
 * Lưu ý: component này KHÔNG tự fetch khi value thay đổi từ bên ngoài quá
 * thường xuyên — nó chỉ dựa vào `value.province_code` để biết tỉnh nào hiện
 * tại; wards được fetch trong effect riêng theo `province_code`.
 */

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { VnProvince, VnWard } from "@/types/ecommerce";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AddressCascadeValue {
  province_code: string;
  ward_code: string;
}

export interface AddressCascadeProps {
  value: AddressCascadeValue;
  onChange: (value: AddressCascadeValue) => void;
  error?: string;
  /** Disable cả hai select (vd. khi submit form). */
  disabled?: boolean;
  /** ID prefix cho a11y (label htmlFor). */
  idPrefix?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize chuỗi tiếng Việt cho mục đích search: lowercase + bỏ dấu + bỏ
 * khoảng trắng thừa. Dùng `String.normalize("NFD")` để tách dấu, rồi xoá
 * combining marks (̀-ͯ). Riêng `đ` → `d` (NFD không xử lý).
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

interface AddressApiResponse<T> {
  data?: T[];
  error?: string;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as AddressApiResponse<T>;
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const body = (await res.json()) as AddressApiResponse<T>;
  return body.data ?? [];
}

// ---------------------------------------------------------------------------
// Combobox sub-component
// ---------------------------------------------------------------------------

interface ComboboxOption {
  code: string;
  name: string;
}

interface ComboboxProps {
  id?: string;
  label: string;
  placeholder: string;
  emptyLabel: string;
  options: ComboboxOption[];
  value: string;
  onSelect: (code: string) => void;
  loading?: boolean;
  disabled?: boolean;
  errorText?: string;
}

function Combobox({
  id,
  label,
  placeholder,
  emptyLabel,
  options,
  value,
  onSelect,
  loading,
  disabled,
  errorText,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = React.useMemo(
    () => options.find((o) => o.code === value) ?? null,
    [options, value],
  );

  // Filter client-side bằng normalized string (bỏ dấu).
  const filtered = React.useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter((o) => normalize(o.name).includes(q));
  }, [options, query]);

  // Đóng dropdown khi click ra ngoài / nhấn Escape.
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto focus search input khi mở.
  React.useEffect(() => {
    if (open) {
      // Hoãn 1 tick để input đã mount.
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    setQuery("");
    return;
  }, [open]);

  const triggerLabel = selected?.name ?? placeholder;
  const hasError = Boolean(errorText);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-zinc-200 select-none"
      >
        {label}
      </label>

      <div ref={wrapperRef} className="relative">
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={hasError || undefined}
          disabled={disabled || loading}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-zinc-800 bg-[#0a0a0a] px-3 py-2 text-sm text-zinc-100 transition-colors outline-none",
            "hover:border-zinc-700 focus-visible:border-[#D4A843] focus-visible:ring-2 focus-visible:ring-[#D4A843]/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasError && "border-red-500/70 focus-visible:border-red-500",
            !selected && "text-zinc-500",
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          {loading ? (
            <Loader2 className="ml-2 size-4 shrink-0 animate-spin text-zinc-400" />
          ) : (
            <ChevronsUpDown className="ml-2 size-4 shrink-0 text-zinc-400" />
          )}
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-hidden rounded-lg border border-zinc-800 bg-[#0a0a0a] shadow-xl shadow-black/40"
          >
            <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
              <Search className="size-4 text-zinc-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="h-7 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
            </div>

            <div className="max-h-56 overflow-y-auto py-1">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-zinc-500">
                  <Loader2 className="size-4 animate-spin" />
                  Đang tải...
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-zinc-500">
                  {emptyLabel}
                </div>
              ) : (
                filtered.map((option) => {
                  const isActive = option.code === value;
                  return (
                    <button
                      key={option.code}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onSelect(option.code);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-200 transition-colors",
                        "hover:bg-zinc-900 focus:bg-zinc-900 focus:outline-none",
                        isActive && "bg-zinc-900 text-[#D4A843]",
                      )}
                    >
                      <span className="truncate">{option.name}</span>
                      {isActive && (
                        <Check className="size-4 shrink-0 text-[#D4A843]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {errorText && (
        <p className="text-xs text-red-400" role="alert">
          {errorText}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AddressCascade({
  value,
  onChange,
  error,
  disabled,
  idPrefix = "address",
}: AddressCascadeProps) {
  const [provinces, setProvinces] = React.useState<VnProvince[]>([]);
  const [wards, setWards] = React.useState<VnWard[]>([]);
  const [provincesLoading, setProvincesLoading] = React.useState(true);
  const [wardsLoading, setWardsLoading] = React.useState(false);
  const [provincesError, setProvincesError] = React.useState<string | null>(
    null,
  );
  const [wardsError, setWardsError] = React.useState<string | null>(null);

  // Fetch provinces 1 lần khi mount.
  React.useEffect(() => {
    const ctrl = new AbortController();
    setProvincesLoading(true);
    setProvincesError(null);

    fetchJson<VnProvince>("/api/vn-address/provinces", ctrl.signal)
      .then((data) => setProvinces(data))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.error("[AddressCascade] fetch provinces", err);
        setProvincesError("Không tải được danh sách tỉnh/thành");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setProvincesLoading(false);
      });

    return () => ctrl.abort();
  }, []);

  // Fetch wards mỗi khi province_code thay đổi.
  React.useEffect(() => {
    if (!value.province_code) {
      setWards([]);
      setWardsError(null);
      setWardsLoading(false);
      return;
    }

    const ctrl = new AbortController();
    setWardsLoading(true);
    setWardsError(null);

    fetchJson<VnWard>(
      `/api/vn-address/wards?province=${encodeURIComponent(value.province_code)}`,
      ctrl.signal,
    )
      .then((data) => setWards(data))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.error("[AddressCascade] fetch wards", err);
        setWardsError("Không tải được danh sách phường/xã");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setWardsLoading(false);
      });

    return () => ctrl.abort();
  }, [value.province_code]);

  const handleProvinceSelect = (code: string) => {
    // Đổi tỉnh → reset ward về rỗng (tránh giữ ward không thuộc tỉnh mới).
    onChange({ province_code: code, ward_code: "" });
  };

  const handleWardSelect = (code: string) => {
    onChange({ province_code: value.province_code, ward_code: code });
  };

  const provinceOptions = React.useMemo<ComboboxOption[]>(
    () => provinces.map((p) => ({ code: p.code, name: p.name })),
    [provinces],
  );
  const wardOptions = React.useMemo<ComboboxOption[]>(
    () => wards.map((w) => ({ code: w.code, name: w.name })),
    [wards],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Combobox
          id={`${idPrefix}-province`}
          label="Tỉnh / Thành phố"
          placeholder="Chọn tỉnh / thành"
          emptyLabel="Không tìm thấy tỉnh phù hợp"
          options={provinceOptions}
          value={value.province_code}
          onSelect={handleProvinceSelect}
          loading={provincesLoading}
          disabled={disabled}
          errorText={provincesError ?? undefined}
        />

        <Combobox
          id={`${idPrefix}-ward`}
          label="Phường / Xã"
          placeholder={
            value.province_code
              ? "Chọn phường / xã"
              : "Hãy chọn tỉnh trước"
          }
          emptyLabel={
            value.province_code
              ? "Không tìm thấy phường/xã phù hợp"
              : "Hãy chọn tỉnh trước"
          }
          options={wardOptions}
          value={value.ward_code}
          onSelect={handleWardSelect}
          loading={wardsLoading}
          disabled={disabled || !value.province_code}
          errorText={wardsError ?? undefined}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default AddressCascade;
