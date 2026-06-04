import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  getProducts,
  getCategories,
  type ProductCategoryNode,
} from "@/lib/ecommerce/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Archive,
  Trash2,
  ImageOff,
} from "lucide-react";
import type {
  Product,
  ProductStatus,
  ProductType,
  ProductVariant,
} from "@/types/ecommerce";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_TABS: ReadonlyArray<{
  value: "all" | ProductStatus;
  label: string;
}> = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang bán" },
  { value: "draft", label: "Bản nháp" },
  { value: "archived", label: "Đã lưu trữ" },
];

const STATUS_BADGE: Record<
  ProductStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Đang bán",
    className:
      "border border-emerald-800/40 bg-emerald-900/30 text-emerald-400",
  },
  draft: {
    label: "Bản nháp",
    className: "border border-gray-700 bg-gray-800 text-gray-400",
  },
  archived: {
    label: "Đã lưu trữ",
    className: "border border-red-800/40 bg-red-900/30 text-red-400",
  },
};

const TYPE_LABEL: Record<ProductType, string> = {
  book: "Sách",
  merch: "Merchandise",
  digital: "Digital",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number | null | undefined): string {
  const value = typeof price === "number" ? price : 0;
  return value.toLocaleString("vi-VN") + "₫";
}

/**
 * Flatten the category tree to a flat list, prefixing children with `— ` so the
 * <select> dropdown still reads as a hierarchy without needing <optgroup>.
 */
function flattenCategories(
  nodes: ProductCategoryNode[],
  depth = 0,
): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const node of nodes) {
    out.push({
      id: node.id,
      label: `${"— ".repeat(depth)}${node.name}`,
    });
    if (node.children.length > 0) {
      out.push(...flattenCategories(node.children, depth + 1));
    }
  }
  return out;
}

function isProductStatus(value: string): value is ProductStatus {
  return value === "draft" || value === "active" || value === "archived";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  // ── Auth gate (staff only) ──
  // No shared `@/lib/auth` helper exists yet; mirror the inline pattern used by
  // `/admin/courses` and `/admin/orders` so behaviour is consistent.
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const staffRoles = ["admin", "manager", "marketing", "sale", "support"];
  if (!profile || !staffRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  const canWrite = ["admin", "manager", "marketing"].includes(profile.role);

  // ── Parse query params ──
  const resolvedParams = await searchParams;
  const search = (resolvedParams.q ?? "").trim();
  const statusRaw = (resolvedParams.status ?? "all").trim();
  const status: "all" | ProductStatus = isProductStatus(statusRaw)
    ? statusRaw
    : "all";
  const categoryId = (resolvedParams.category ?? "").trim() || null;
  const currentPage = Math.max(
    1,
    parseInt(resolvedParams.page ?? "1", 10) || 1,
  );
  const offset = (currentPage - 1) * PAGE_SIZE;

  // ── Fetch products + categories in parallel ──
  const [{ products, totalCount }, categoryTree] = await Promise.all([
    getProducts({
      search: search || undefined,
      status: status === "all" ? undefined : status,
      categoryId: categoryId ?? undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    getCategories(),
  ]);

  const categoryList = flattenCategories(categoryTree);

  // ── Stock + category lookup: fetch in one round trip via admin client ──
  // `getProducts()` returns the bare product rows; we still need the variant
  // sum for the Stock column and the category name for the Category column.
  const productIds = products.map((p) => p.id);
  const categoryIds = Array.from(
    new Set(
      products
        .map((p) => p.category_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const adminClient = await createAdminClient();

  const variantsPromise = productIds.length
    ? adminClient
        .from("product_variants")
        .select("product_id, stock_count")
        .in("product_id", productIds)
    : Promise.resolve({ data: [] as Array<Pick<ProductVariant, "product_id" | "stock_count">>, error: null });

  const categoriesPromise = categoryIds.length
    ? adminClient
        .from("product_categories")
        .select("id, name")
        .in("id", categoryIds)
    : Promise.resolve({ data: [] as Array<{ id: string; name: string }>, error: null });

  const [variantsRes, categoriesRes] = await Promise.all([
    variantsPromise,
    categoriesPromise,
  ]);

  const stockByProduct = new Map<string, number>();
  for (const v of variantsRes.data ?? []) {
    const current = stockByProduct.get(v.product_id) ?? 0;
    stockByProduct.set(v.product_id, current + (v.stock_count ?? 0));
  }

  const categoryNameById = new Map<string, string>();
  for (const c of categoriesRes.data ?? []) {
    categoryNameById.set(c.id, c.name);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ── Build query-string preserver for tabs/filters/pagination ──
  // Each filter control points to /admin/products with the relevant param
  // overridden, while keeping the rest intact.
  function buildHref(overrides: Record<string, string | null>): string {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (categoryId) params.set("category", categoryId);
    if (currentPage > 1) params.set("page", String(currentPage));
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  }

  return (
    <div>
      <TopBar
        title="Sản phẩm"
        subtitle="Quản lý catalog sách / merch / digital"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-white text-base">
              Danh sách sản phẩm
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalCount.toLocaleString("vi-VN")} sản phẩm
            </p>
          </div>
          {canWrite && (
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#D4A843] text-black hover:bg-[#D4A843]/90 transition-colors"
            >
              <Plus size={15} />
              Thêm sản phẩm
            </Link>
          )}
        </div>

        {/* Filters row: status chips + category dropdown + search */}
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl p-3"
          style={{
            background: "#161616",
            border: "1px solid #2a2a2a",
          }}
        >
          {/* Status chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const active = status === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={buildHref({
                    status: tab.value === "all" ? null : tab.value,
                    page: null,
                  })}
                  className={
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors " +
                    (active
                      ? "bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30"
                      : "text-gray-400 border border-transparent hover:bg-white/5 hover:text-white")
                  }
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Category filter — server-rendered <form GET> so the page stays a
              Server Component. Submitting navigates with the new query param. */}
          <form
            action="/admin/products"
            method="GET"
            className="flex items-center gap-2"
          >
            {/* preserve current filters as hidden inputs */}
            {search && <input type="hidden" name="q" value={search} />}
            {status !== "all" && (
              <input type="hidden" name="status" value={status} />
            )}
            <select
              name="category"
              defaultValue={categoryId ?? ""}
              className="px-3 py-1.5 rounded-lg text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 focus:outline-none focus:border-[#D4A843]/40"
            >
              <option value="">Tất cả danh mục</option>
              {categoryList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-[#2a2a2a] bg-[#0f0f0f] text-gray-300 hover:bg-white/5"
            >
              Lọc
            </Button>
          </form>

          {/* Search box — separate GET form so users can submit by pressing Enter. */}
          <form
            action="/admin/products"
            method="GET"
            className="flex items-center gap-2 ml-auto"
          >
            {status !== "all" && (
              <input type="hidden" name="status" value={status} />
            )}
            {categoryId && (
              <input type="hidden" name="category" value={categoryId} />
            )}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder="Tìm theo tên / SKU / slug..."
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#D4A843]/40 w-64"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-[#2a2a2a] bg-[#0f0f0f] text-gray-300 hover:bg-white/5"
            >
              Tìm
            </Button>
          </form>
        </div>

        {/* Table or empty state */}
        {products.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center rounded-xl"
            style={{
              background: "#161616",
              border: "1px solid #2a2a2a",
            }}
          >
            <Package size={40} className="text-gray-700 mb-3" />
            <p className="text-gray-400 text-sm mb-1">
              {search || status !== "all" || categoryId
                ? "Không có sản phẩm phù hợp với bộ lọc."
                : "Chưa có sản phẩm nào."}
            </p>
            <p className="text-xs text-gray-600 mb-4">
              {search || status !== "all" || categoryId
                ? "Thử xoá bớt filter hoặc tìm từ khoá khác."
                : "Tạo sản phẩm đầu tiên để bắt đầu bán sách / merch / digital."}
            </p>
            {canWrite && (
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#D4A843] text-black hover:bg-[#D4A843]/90 transition-colors"
              >
                <Plus size={15} />
                Thêm sản phẩm
              </Link>
            )}
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "#161616",
              border: "1px solid #2a2a2a",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <tr className="text-left text-xs text-gray-400">
                    <th className="px-4 py-3 font-medium w-16">Ảnh</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Tên</th>
                    <th className="px-4 py-3 font-medium">Danh mục</th>
                    <th className="px-4 py-3 font-medium">Loại</th>
                    <th className="px-4 py-3 font-medium text-right">Stock</th>
                    <th className="px-4 py-3 font-medium text-right">Giá</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p: Product) => {
                    const stock = stockByProduct.get(p.id) ?? 0;
                    const categoryName = p.category_id
                      ? (categoryNameById.get(p.category_id) ?? "—")
                      : "—";
                    const badge = STATUS_BADGE[p.status] ?? {
                      label: String(p.status ?? "unknown"),
                      className: "border border-gray-700 bg-gray-800 text-gray-400",
                    };
                    const typeLabel =
                      TYPE_LABEL[p.product_type] ?? String(p.product_type ?? "—");
                    return (
                      <tr
                        key={p.id}
                        className="border-t border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors"
                      >
                        <td className="px-4 py-3">
                          {p.thumbnail_url ? (
                            // Using <img> rather than next/image because thumbnail
                            // domain whitelisting is product-storage-bucket specific
                            // and not configured here.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.thumbnail_url}
                              alt={p.name}
                              className="w-10 h-10 rounded-md object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md flex items-center justify-center bg-[#1f1f1f] border border-[#2a2a2a]">
                              <ImageOff
                                size={16}
                                className="text-gray-600"
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">
                          {p.sku ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="font-medium text-white hover:text-[#D4A843] transition-colors"
                          >
                            {p.name}
                          </Link>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            /{p.slug}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-300">
                          {categoryName}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="border-[#2a2a2a] bg-[#1a1a1a] text-gray-300"
                          >
                            {typeLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              stock <= 0
                                ? "text-red-400 font-medium"
                                : stock < 10
                                  ? "text-amber-400 font-medium"
                                  : "text-gray-200"
                            }
                          >
                            {stock.toLocaleString("vi-VN")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[#D4A843] font-medium">
                          {formatPrice(p.price)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              "rounded-full px-2 py-0.5 text-[11px] " +
                              badge.className
                            }
                          >
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canWrite ? (
                              <>
                                <Link
                                  href={`/admin/products/${p.id}`}
                                  aria-label="Sửa"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                  <Edit2 size={14} />
                                </Link>
                                {p.status !== "archived" ? (
                                  <Link
                                    href={`/admin/products/${p.id}?action=archive`}
                                    aria-label="Lưu trữ"
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
                                  >
                                    <Archive size={14} />
                                  </Link>
                                ) : null}
                                <Link
                                  href={`/admin/products/${p.id}?action=delete`}
                                  aria-label="Xoá"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </Link>
                              </>
                            ) : (
                              <span className="text-xs text-gray-600">
                                Chỉ xem
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-xs text-gray-400">
                <div>
                  Trang <span className="text-white">{currentPage}</span> /{" "}
                  {totalPages} · Hiển thị {products.length} /{" "}
                  {totalCount.toLocaleString("vi-VN")} sản phẩm
                </div>
                <div className="flex items-center gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={buildHref({
                        page:
                          currentPage - 1 === 1
                            ? null
                            : String(currentPage - 1),
                      })}
                      className="px-3 py-1.5 rounded-md border border-[#2a2a2a] text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      ← Trước
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 rounded-md border border-[#2a2a2a] text-gray-600 cursor-not-allowed">
                      ← Trước
                    </span>
                  )}
                  {currentPage < totalPages ? (
                    <Link
                      href={buildHref({ page: String(currentPage + 1) })}
                      className="px-3 py-1.5 rounded-md border border-[#2a2a2a] text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      Sau →
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 rounded-md border border-[#2a2a2a] text-gray-600 cursor-not-allowed">
                      Sau →
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
