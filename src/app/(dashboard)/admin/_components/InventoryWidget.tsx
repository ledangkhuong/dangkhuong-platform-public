/**
 * InventoryWidget — Server Component
 *
 * Hiển thị số lượng product variants sắp hết / hết hàng trên admin dashboard.
 * Có viền vàng (#D4A843) khi count > 0 để nổi bật cảnh báo.
 *
 * Usage:
 *   import { InventoryWidget } from "@/app/(dashboard)/admin/_components/InventoryWidget";
 *   <InventoryWidget />
 */

import Link from "next/link";
import { checkLowStock } from "@/lib/ecommerce/alerts";

export async function InventoryWidget() {
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let hasError = false;

  try {
    const variants = await checkLowStock();
    lowStockCount = variants.length;
    outOfStockCount = variants.filter((v) => v.stock_count <= 0).length;
  } catch (err) {
    console.error("[InventoryWidget] checkLowStock failed:", err);
    hasError = true;
  }

  const hasAlert = lowStockCount > 0;

  const borderClass = hasAlert
    ? "border-[#D4A843]"
    : "border-[#2a2a2a]";

  return (
    <div
      className={`rounded-xl border ${borderClass} bg-[#1a1a1a] p-5 shadow-sm transition-colors`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Tồn kho
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold ${
                hasAlert ? "text-[#D4A843]" : "text-neutral-200"
              }`}
            >
              {hasError ? "—" : lowStockCount}
            </span>
            <span className="text-sm text-neutral-400">
              {hasError ? "lỗi tải dữ liệu" : "sản phẩm sắp hết hàng"}
            </span>
          </div>
          {outOfStockCount > 0 && (
            <p className="mt-1 text-xs font-medium text-red-400">
              Trong đó {outOfStockCount} đã hết hàng hoàn toàn
            </p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            hasAlert ? "bg-[#D4A843]/15 text-[#D4A843]" : "bg-neutral-800 text-neutral-400"
          }`}
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
      </div>

      <div className="mt-4 border-t border-[#2a2a2a] pt-3">
        <Link
          href="/admin/products/inventory"
          className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
            hasAlert
              ? "text-[#D4A843] hover:text-[#e8be5e]"
              : "text-neutral-300 hover:text-white"
          }`}
        >
          Xem chi tiết
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

export default InventoryWidget;
