"use client";

import {
  type ColumnDef,
  type SortingState,
  type ColumnResizeMode,
  type Header,
  type Row,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * Props for the DataTable component.
 *
 * @template T - The shape of each row in the table data.
 */
export interface DataTableProps<T> {
  /** Column definitions created with @tanstack/react-table's `ColumnDef` or `createColumnHelper`. */
  columns: ColumnDef<T, any>[];
  /** Array of row data to display. */
  data: T[];
  /** Show skeleton loading rows instead of data. */
  isLoading?: boolean;
  /** Message to display when `data` is empty and not loading. */
  emptyMessage?: string;

  // ── Pagination (server-side) ──
  /** Total number of pages (for server-side pagination). */
  pageCount?: number;
  /** Current zero-based page index. */
  pageIndex?: number;
  /** Number of rows per page (used for skeleton row count). */
  pageSize?: number;
  /** Called when the user navigates to a different page. Receives the new page index. */
  onPaginationChange?: (pageIndex: number) => void;

  // ── Optional ──
  /** When true, the first column stays pinned to the left edge during horizontal scroll. */
  stickyFirstColumn?: boolean;
  /** Called when a row body is clicked. Receives the row's original data object. */
  onRowClick?: (row: T) => void;
  /** Returns an additional className string to apply to a row's `<tr>` element. */
  rowClassName?: (row: T) => string;
  /** Maximum height for the scrollable table body (e.g. "500px", "70vh"). Enables vertical scroll with sticky header. */
  maxHeight?: string;
}

// ─── Sort indicator ───────────────────────────────────────────────────────────

function SortIndicator<T>({ header }: { header: Header<T, unknown> }) {
  const sorted = header.column.getIsSorted();

  return (
    <span className="ml-1.5 inline-flex flex-col leading-none">
      <ChevronUp
        size={10}
        className={cn(
          "transition-colors -mb-px",
          sorted === "asc" ? "text-blue-400" : "text-gray-600"
        )}
      />
      <ChevronDown
        size={10}
        className={cn(
          "transition-colors -mt-px",
          sorted === "desc" ? "text-blue-400" : "text-gray-600"
        )}
      />
    </span>
  );
}

// ─── Resize handle ────────────────────────────────────────────────────────────

function ResizeHandle<T>({
  header,
  isResizing,
}: {
  header: Header<T, unknown>;
  isResizing: boolean;
}) {
  return (
    <div
      onDoubleClick={() => header.column.resetSize()}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      className={cn(
        "absolute right-0 top-0 h-full w-[3px] cursor-col-resize select-none touch-none transition-colors",
        isResizing ? "bg-[#D4A843]" : "bg-[#2a2a2a] hover:bg-[#D4A843]/60"
      )}
    />
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ columnCount }: { columnCount: number }) {
  return (
    <tr className="border-b border-white/[0.06]">
      {Array.from({ length: columnCount }, (_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded bg-white/[0.06] animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────

/**
 * A reusable, generic data table built on @tanstack/react-table v8.
 *
 * Supports column sorting, column resizing, horizontal/vertical scrolling,
 * sticky header, sticky first column, row hover, loading skeletons, empty
 * state, and server-side pagination.
 *
 * @example
 * ```tsx
 * import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
 *
 * const columns: ColumnDef<User>[] = [
 *   { accessorKey: "name", header: "Name" },
 *   { accessorKey: "email", header: "Email" },
 * ];
 *
 * <DataTable columns={columns} data={users} />
 * ```
 */
export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "Không có dữ liệu.",
  pageCount,
  pageIndex = 0,
  pageSize = 10,
  onPaginationChange,
  stickyFirstColumn = false,
  onRowClick,
  rowClassName,
  maxHeight,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>("onChange");

  const hasPagination =
    pageCount !== undefined && pageCount > 1 && onPaginationChange !== undefined;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode,
    manualPagination: true,
    pageCount: pageCount ?? -1,
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  const handleRowClick = useCallback(
    (row: Row<T>) => {
      onRowClick?.(row.original);
    },
    [onRowClick]
  );

  // Memoize column sizes for inline styles
  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders();
    const vars: Record<string, string> = {};
    for (const header of headers) {
      vars[`--header-${header.id}-size`] = `${header.getSize()}px`;
      vars[`--col-${header.column.id}-size`] = `${header.column.getSize()}px`;
    }
    return vars;
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    table.getState().columnSizingInfo,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    table.getState().columnSizing,
    table,
  ]);

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
      {/* Scrollable wrapper */}
      <div
        className="overflow-auto"
        style={{ maxHeight: maxHeight ?? undefined }}
      >
        <table
          className="w-full text-sm border-collapse"
          style={{
            ...columnSizeVars,
            minWidth: table.getTotalSize(),
          }}
        >
          {/* ── Header ── */}
          <thead
            className={cn(
              "bg-[#111]",
              maxHeight && "sticky top-0 z-20"
            )}
          >
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, colIdx) => {
                  const canSort = header.column.getCanSort();
                  const isSticky = stickyFirstColumn && colIdx === 0;

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "relative text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap select-none",
                        "border-b border-white/[0.06]",
                        canSort && "cursor-pointer hover:text-gray-200 transition-colors",
                        isSticky && "sticky left-0 z-30 bg-[#111]"
                      )}
                      style={{
                        width: `var(--header-${header.id}-size)`,
                      }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIndicator header={header} />}
                      </div>
                      {header.column.getCanResize() && (
                        <ResizeHandle
                          header={header}
                          isResizing={header.column.getIsResizing()}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* ── Body ── */}
          <tbody>
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: pageSize }, (_, i) => (
                <SkeletonRow key={`skel-${i}`} columnCount={columns.length} />
              ))
            ) : rows.length === 0 ? (
              // Empty state
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-16 text-gray-500 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Data rows
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className={cn(
                    "border-b border-white/[0.06] transition-colors",
                    "hover:bg-white/[0.02]",
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row.original)
                  )}
                >
                  {row.getVisibleCells().map((cell, colIdx) => {
                    const isSticky = stickyFirstColumn && colIdx === 0;

                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-4 py-3.5 text-gray-300",
                          isSticky && "sticky left-0 z-10 bg-[#1a1a1a]"
                        )}
                        style={{
                          width: `var(--col-${cell.column.id}-size)`,
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {hasPagination && (
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: "1px solid #2a2a2a" }}
        >
          <span className="text-xs text-gray-500">
            Trang{" "}
            <span className="text-white font-semibold">{pageIndex + 1}</span>
            {" / "}
            {pageCount}
          </span>

          <div className="flex items-center gap-1">
            {/* Previous */}
            <button
              onClick={() => onPaginationChange!(Math.max(0, pageIndex - 1))}
              disabled={pageIndex <= 0}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg border text-xs transition-colors",
                pageIndex <= 0
                  ? "border-[#2a2a2a] bg-[#1a1a1a] text-gray-600 cursor-not-allowed"
                  : "border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-[#3a3a3a]"
              )}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page numbers */}
            <PageNumbers
              currentPage={pageIndex}
              totalPages={pageCount!}
              onPageChange={onPaginationChange!}
            />

            {/* Next */}
            <button
              onClick={() => onPaginationChange!(Math.min(pageCount! - 1, pageIndex + 1))}
              disabled={pageIndex >= pageCount! - 1}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg border text-xs transition-colors",
                pageIndex >= pageCount! - 1
                  ? "border-[#2a2a2a] bg-[#1a1a1a] text-gray-600 cursor-not-allowed"
                  : "border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-[#3a3a3a]"
              )}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page numbers sub-component ───────────────────────────────────────────────

function PageNumbers({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const maxVisible = 5;

  const pages = useMemo(() => {
    const result: number[] = [];

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) result.push(i);
    } else if (currentPage <= 2) {
      for (let i = 0; i < maxVisible; i++) result.push(i);
    } else if (currentPage >= totalPages - 3) {
      for (let i = totalPages - maxVisible; i < totalPages; i++) result.push(i);
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) result.push(i);
    }

    return result;
  }, [currentPage, totalPages]);

  return (
    <>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={cn(
            "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
            p === currentPage
              ? "bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30"
              : "border border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-[#3a3a3a]"
          )}
        >
          {p + 1}
        </button>
      ))}
    </>
  );
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export { createColumnHelper };
export type { ColumnDef, SortingState };
