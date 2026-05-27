/**
 * SetTargetForm — collapsible admin-only section to set/update each sale
 * rep's monthly revenue + orders target.
 *
 * One outer `<form action={setSaleTargetsBulk}>` wraps every row and a single
 * bottom "Lưu tất cả" submit button — the admin no longer has to click Save
 * per row. Each row uses input names suffixed with the saleId
 * (`revenue_<saleId>` / `orders_<saleId>`) and the form ships a hidden
 * `sale_ids` CSV so the action knows which rows to upsert.
 *
 * Server-renderable: no client interaction needed; the browser handles
 * native form submission, and Next.js server actions handle the rest.
 */
import { setSaleTargetsBulk } from "@/lib/actions/sale-targets";
import { Save, ChevronDown, Target } from "lucide-react";

type Row = {
  sale_user_id: string;
  full_name: string | null;
  current_revenue_target: number | null;
  current_orders_target: number | null;
};

interface SetTargetFormProps {
  rows: Row[];
  month: string; // YYYY-MM-DD
  saved?: boolean;
  savedCount?: number | null;
  errorCode?: string | null;
}

export default function SetTargetForm({
  rows,
  month,
  saved,
  savedCount,
  errorCode,
}: SetTargetFormProps) {
  const saleIdsCsv = rows.map((r) => r.sale_user_id).join(",");

  return (
    <details className="card-dark group [&[open]>summary>svg.chev]:rotate-180">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm text-gray-200 hover:bg-[#141414]">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "rgba(212,168,67,0.14)" }}
          >
            <Target size={14} className="text-[#D4A843]" />
          </div>
          <div>
            <p className="font-semibold text-white">Đặt chỉ tiêu tháng cho từng sale</p>
            <p className="text-[11px] text-gray-500">
              Tháng {month.slice(0, 7)} • Chỉ admin/manager
            </p>
          </div>
        </div>
        <ChevronDown size={16} className="chev text-gray-500 transition-transform" />
      </summary>

      <div className="border-t border-[#2a2a2a] p-5">
        {saved ? (
          <div className="mb-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-300">
            {savedCount && savedCount > 0
              ? `Đã lưu ${savedCount} mục tiêu.`
              : "Đã lưu chỉ tiêu mới."}
          </div>
        ) : null}
        {errorCode ? (
          <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            Lỗi khi lưu: {errorCode}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-xs text-gray-500">
            Chưa có sale rep nào trong hệ thống.
          </p>
        ) : (
          <form action={setSaleTargetsBulk}>
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="sale_ids" value={saleIdsCsv} />

            <div className="space-y-2">
              {rows.map((row) => (
                <div
                  key={row.sale_user_id}
                  className="flex flex-col gap-3 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1 sm:max-w-[180px]">
                    <p className="truncate text-sm font-medium text-white">
                      {row.full_name || "(Chưa có tên)"}
                    </p>
                    {row.current_revenue_target ? (
                      <p className="text-[10px] text-gray-500">
                        Hiện tại:{" "}
                        {row.current_revenue_target.toLocaleString("vi-VN")}đ
                        {row.current_orders_target
                          ? ` • ${row.current_orders_target} đơn`
                          : null}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-600">Chưa đặt</p>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="flex flex-1 items-center gap-2">
                      <span className="text-[11px] text-gray-400">DS (đ):</span>
                      <input
                        type="number"
                        name={`revenue_${row.sale_user_id}`}
                        min={0}
                        step={1000000}
                        defaultValue={row.current_revenue_target ?? ""}
                        placeholder="20000000"
                        className="w-full rounded-md border border-[#2a2a2a] bg-[#141414] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#D4A843]"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">Đơn:</span>
                      <input
                        type="number"
                        name={`orders_${row.sale_user_id}`}
                        min={0}
                        step={1}
                        defaultValue={row.current_orders_target ?? ""}
                        placeholder="20"
                        className="w-20 rounded-md border border-[#2a2a2a] bg-[#141414] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#D4A843]"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#D4A843]/40 bg-[#D4A843]/10 px-4 py-2 text-sm font-semibold text-[#D4A843] transition-colors hover:bg-[#D4A843]/20"
              >
                <Save size={14} />
                Lưu tất cả {rows.length} mục tiêu
              </button>
            </div>
          </form>
        )}
      </div>
    </details>
  );
}
