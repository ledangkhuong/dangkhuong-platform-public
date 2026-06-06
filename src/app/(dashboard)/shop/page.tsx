/**
 * Public storefront — `/shop`
 *
 * Server Component (Next.js 16 App Router default). Lists active products
 * with category + product_type filters, sort, and pagination via URL
 * search params. KHÔNG dùng "use client" — toàn bộ render trên server.
 *
 * URL search params:
 *  - category: slug của product_categories (1 cấp, tự lookup id)
 *  - type:     book | merch | digital
 *  - sort:     newest (default) | price_asc | price_desc | bestseller
 *  - page:     số trang (1-based)
 *
 * Pagination: 12 items / page.
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  getCategories,
  getProducts,
  getStorefrontFacets,
  type ProductCategoryNode,
  type StorefrontFacets,
} from "@/lib/ecommerce/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  Product,
  ProductCategory,
  ProductType,
} from "@/types/ecommerce";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const SHOP_TITLE = "Cửa hàng Lê Đăng Khương | Sách, Merch & Sản phẩm số";
const SHOP_DESCRIPTION =
  "Khám phá toàn bộ sách, merch và sản phẩm số chính hãng từ Lê Đăng Khương. Giao hàng toàn quốc, thanh toán an toàn.";
const SHOP_URL = "https://dangkhuong.com/shop";
const SHOP_OG_IMAGE = "https://dangkhuong.com/images/hero/offer-banner.jpg";

export const metadata: Metadata = {
  title: SHOP_TITLE,
  description: SHOP_DESCRIPTION,
  alternates: { canonical: SHOP_URL },
  openGraph: {
    title: SHOP_TITLE,
    description: SHOP_DESCRIPTION,
    type: "website",
    url: SHOP_URL,
    siteName: "Lê Đăng Khương Academy",
    locale: "vi_VN",
    images: [
      {
        url: SHOP_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Cửa hàng Lê Đăng Khương — Sách, Merch & Sản phẩm số",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SHOP_TITLE,
    description: SHOP_DESCRIPTION,
    images: [SHOP_OG_IMAGE],
  },
};

// Storefront catalog: ISR 5 phút.
// - Catalog đổi không thường xuyên (admin thêm/sửa product vài lần/ngày).
// - 5 phút đủ tươi cho user, đồng thời giảm tải DB đáng kể với traffic cao.
// - Nếu cần refresh ngay (sau khi publish product mới) → gọi `revalidatePath("/shop")`
//   trong server action của admin form.
export const revalidate = 300;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 12;

type SortKey = "newest" | "price_asc" | "price_desc" | "bestseller";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Mới nhất" },
  { key: "price_asc", label: "Giá tăng dần" },
  { key: "price_desc", label: "Giá giảm dần" },
  { key: "bestseller", label: "Bán chạy" },
];

const TYPE_OPTIONS: Array<{ key: ProductType; label: string }> = [
  { key: "book", label: "Sách" },
  { key: "merch", label: "Merch" },
  { key: "digital", label: "Sản phẩm số" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatVnd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Liên hệ";
  }
  return VND.format(value);
}

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function buildHref(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
): string {
  const next = { ...params, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v && v.length > 0) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

/**
 * Sắp xếp client-side cho các option cần custom (price asc/desc, bestseller).
 * `bestseller` hiện chưa có metric → fallback `newest` để tránh confuse user.
 */
function applyClientSort(products: Product[], sort: SortKey): Product[] {
  if (sort === "price_asc") {
    return [...products].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  }
  if (sort === "price_desc") {
    return [...products].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }
  // "newest" và "bestseller" giữ nguyên thứ tự server (updated_at DESC).
  return products;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryTree({
  nodes,
  activeSlug,
  paramsForLink,
}: {
  nodes: ProductCategoryNode[];
  activeSlug?: string;
  paramsForLink: Record<string, string | undefined>;
}) {
  if (nodes.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {nodes.map((node) => {
        const isActive = node.slug === activeSlug;
        return (
          <li key={node.id}>
            <Link
              href={buildHref(paramsForLink, {
                category: node.slug,
                page: undefined,
              })}
              className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-[#D4A843]/15 text-[#D4A843] font-medium"
                  : "text-neutral-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {node.name}
            </Link>
            {node.children.length > 0 && (
              <ul className="mt-1 ml-3 space-y-1 border-l border-white/10 pl-3">
                {node.children.map((child) => {
                  const childActive = child.slug === activeSlug;
                  return (
                    <li key={child.id}>
                      <Link
                        href={buildHref(paramsForLink, {
                          category: child.slug,
                          page: undefined,
                        })}
                        className={`block rounded-md px-2 py-1 text-sm transition-colors ${
                          childActive
                            ? "text-[#D4A843] font-medium"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        {child.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FilterSidebar({
  categories,
  activeCategorySlug,
  activeType,
  paramsForLink,
  facets,
}: {
  categories: ProductCategoryNode[];
  activeCategorySlug?: string;
  activeType?: ProductType;
  paramsForLink: Record<string, string | undefined>;
  facets: StorefrontFacets;
}) {
  // Chỉ render type options có ít nhất 1 sản phẩm
  const visibleTypeOptions = TYPE_OPTIONS.filter(
    (opt) => (facets.byType[opt.key] ?? 0) > 0,
  );
  return (
    <div className="space-y-8">
      {/* Danh mục */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Danh mục
        </h3>
        <Link
          href={buildHref(paramsForLink, {
            category: undefined,
            page: undefined,
          })}
          className={`mb-2 block rounded-md px-3 py-1.5 text-sm transition-colors ${
            !activeCategorySlug
              ? "bg-[#D4A843]/15 text-[#D4A843] font-medium"
              : "text-neutral-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          Tất cả sản phẩm
        </Link>
        <CategoryTree
          nodes={categories}
          activeSlug={activeCategorySlug}
          paramsForLink={paramsForLink}
        />
      </section>

      {/* Loại sản phẩm */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Loại sản phẩm
        </h3>
        <ul className="space-y-1.5">
          <li>
            <Link
              href={buildHref(paramsForLink, {
                type: undefined,
                page: undefined,
              })}
              className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                !activeType
                  ? "bg-[#D4A843]/15 text-[#D4A843] font-medium"
                  : "text-neutral-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              Tất cả
            </Link>
          </li>
          {visibleTypeOptions.map((opt) => {
            const isActive = activeType === opt.key;
            return (
              <li key={opt.key}>
                <Link
                  href={buildHref(paramsForLink, {
                    type: opt.key,
                    page: undefined,
                  })}
                  className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-[#D4A843]/15 text-[#D4A843] font-medium"
                      : "text-neutral-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {opt.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const hasDiscount =
    product.compare_at_price !== null &&
    product.compare_at_price !== undefined &&
    product.compare_at_price > product.price;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group block overflow-hidden rounded-lg bg-[#1a1a1a] border border-white/5 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#D4A843]/40 hover:shadow-lg hover:shadow-black/40"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#0f0f0f]">
        {product.thumbnail_url ? (
          <Image
            src={product.thumbnail_url}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-600 text-xs">
            Chưa có ảnh
          </div>
        )}
        {hasDiscount && (
          <span className="absolute left-2 top-2 rounded-full bg-[#D4A843] px-2 py-0.5 text-[11px] font-semibold text-black">
            Giảm giá
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-white min-h-[2.5rem] group-hover:text-[#D4A843] transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-[#D4A843]">
            {formatVnd(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-neutral-500 line-through">
              {formatVnd(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Pagination({
  currentPage,
  totalPages,
  paramsForLink,
}: {
  currentPage: number;
  totalPages: number;
  paramsForLink: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const pagesToShow: number[] = [];
  const windowSize = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - windowSize && i <= currentPage + windowSize)
    ) {
      pagesToShow.push(i);
    }
  }

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
      aria-label="Phân trang"
    >
      <Link
        href={buildHref(paramsForLink, {
          page: currentPage > 1 ? String(currentPage - 1) : undefined,
        })}
        aria-disabled={currentPage === 1}
        className={`rounded-md border border-white/10 px-3 py-1.5 text-sm transition-colors ${
          currentPage === 1
            ? "pointer-events-none text-neutral-600"
            : "text-neutral-300 hover:border-[#D4A843]/40 hover:text-[#D4A843]"
        }`}
      >
        Trước
      </Link>
      {pagesToShow.map((p, idx) => {
        const prev = pagesToShow[idx - 1];
        const showGap = prev !== undefined && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-2">
            {showGap && <span className="text-neutral-600">…</span>}
            <Link
              href={buildHref(paramsForLink, {
                page: p === 1 ? undefined : String(p),
              })}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                p === currentPage
                  ? "bg-[#D4A843] text-black font-semibold"
                  : "border border-white/10 text-neutral-300 hover:border-[#D4A843]/40 hover:text-[#D4A843]"
              }`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </Link>
          </span>
        );
      })}
      <Link
        href={buildHref(paramsForLink, {
          page:
            currentPage < totalPages ? String(currentPage + 1) : undefined,
        })}
        aria-disabled={currentPage === totalPages}
        className={`rounded-md border border-white/10 px-3 py-1.5 text-sm transition-colors ${
          currentPage === totalPages
            ? "pointer-events-none text-neutral-600"
            : "text-neutral-300 hover:border-[#D4A843]/40 hover:text-[#D4A843]"
        }`}
      >
        Sau
      </Link>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Tìm category theo slug để chuyển thành `categoryId` cho `getProducts()`.
 * Trả `null` nếu không tìm thấy (page sẽ hiển thị empty state).
 */
async function resolveCategoryBySlug(
  slug: string
): Promise<ProductCategory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_visible", true)
    .maybeSingle();
  if (error) {
    console.error("[shop/page] resolveCategoryBySlug failed", { slug, error });
    return null;
  }
  return (data as ProductCategory) ?? null;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string | string[];
    type?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
}) {
  const sp = await searchParams;

  const categorySlug = pickFirst(sp.category);
  const typeParam = pickFirst(sp.type);
  const sortParam = pickFirst(sp.sort);
  const pageParam = pickFirst(sp.page);

  // Validate enum-ish params, fallback an toàn.
  const productType: ProductType | undefined = (
    ["book", "merch", "digital"] as const
  ).includes(typeParam as ProductType)
    ? (typeParam as ProductType)
    : undefined;

  const sort: SortKey = (
    ["newest", "price_asc", "price_desc", "bestseller"] as const
  ).includes(sortParam as SortKey)
    ? (sortParam as SortKey)
    : "newest";

  const currentPage = Math.max(
    1,
    Number.parseInt(pageParam ?? "1", 10) || 1
  );
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Giữ lại bộ params hiện tại để build link mới (không "rớt" filter khi sort).
  const paramsForLink: Record<string, string | undefined> = {
    category: categorySlug,
    type: productType,
    sort: sort === "newest" ? undefined : sort,
    page: currentPage === 1 ? undefined : String(currentPage),
  };

  // Fetch song song: categories + (resolve category nếu có slug) + facets.
  const [categories, activeCategory, facets] = await Promise.all([
    getCategories(),
    categorySlug ? resolveCategoryBySlug(categorySlug) : Promise.resolve(null),
    getStorefrontFacets(),
  ]);

  // Chỉ hiển thị category có sản phẩm thực (count > 0) + visible.
  // Một category được hiển thị nếu CHÍNH NÓ có sản phẩm, hoặc bất kỳ child nào có sản phẩm.
  function categoryHasProducts(c: ProductCategoryNode): boolean {
    if ((facets.byCategory[c.id] ?? 0) > 0) return true;
    return (c.children ?? []).some((ch) => (facets.byCategory[ch.id] ?? 0) > 0);
  }

  const visibleCategories = categories
    .filter((c) => c.is_visible && categoryHasProducts(c))
    .map((c) => ({
      ...c,
      children: (c.children ?? []).filter(
        (ch) => ch.is_visible && (facets.byCategory[ch.id] ?? 0) > 0,
      ),
    }));

  // Nếu user filter category-slug không tồn tại / ẩn → trả empty list.
  const shouldQueryEmpty = !!categorySlug && !activeCategory;

  const { products, totalCount } = shouldQueryEmpty
    ? { products: [], totalCount: 0 }
    : await getProducts({
        status: "active",
        productType,
        categoryId: activeCategory?.id ?? null,
        limit: PAGE_SIZE,
        offset,
      });

  const sortedProducts = applyClientSort(products, sort);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      {/* Hero */}
      <section className="border-b border-white/5 bg-gradient-to-b from-[#141414] to-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Cửa hàng{" "}
            <span className="text-[#D4A843]">Lê Đăng Khương</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base text-neutral-400 sm:text-lg">
            Sách, merch và sản phẩm số chính hãng — đồng hành cùng hành trình
            phát triển bản thân của bạn.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar — desktop sticky, mobile collapsible <details> */}
          <aside className="lg:w-64 lg:flex-shrink-0">
            {/* Mobile: drawer-like via <details> để không cần client JS */}
            <details className="group rounded-lg border border-white/10 bg-[#141414] p-4 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-white">
                <span>Bộ lọc</span>
                <span className="text-[#D4A843] transition-transform group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <div className="mt-4">
                <FilterSidebar
                  categories={visibleCategories}
                  activeCategorySlug={categorySlug}
                  activeType={productType}
                  paramsForLink={paramsForLink}
                  facets={facets}
                />
              </div>
            </details>

            {/* Desktop: sticky sidebar */}
            <div className="hidden lg:sticky lg:top-24 lg:block">
              <FilterSidebar
                categories={visibleCategories}
                activeCategorySlug={categorySlug}
                activeType={productType}
                paramsForLink={paramsForLink}
                facets={facets}
              />
            </div>
          </aside>

          {/* Main content */}
          <section className="flex-1">
            {/* Toolbar: count + sort */}
            <div className="mb-6 flex flex-col items-start justify-between gap-3 border-b border-white/5 pb-4 sm:flex-row sm:items-center">
              <p className="text-sm text-neutral-400">
                {totalCount > 0 ? (
                  <>
                    Hiển thị{" "}
                    <span className="font-semibold text-white">
                      {sortedProducts.length}
                    </span>{" "}
                    / {totalCount} sản phẩm
                    {activeCategory ? (
                      <>
                        {" "}
                        trong{" "}
                        <span className="text-[#D4A843]">
                          {activeCategory.name}
                        </span>
                      </>
                    ) : null}
                  </>
                ) : (
                  <span>Không có sản phẩm phù hợp</span>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-neutral-500">
                  Sắp xếp:
                </span>
                {SORT_OPTIONS.map((opt) => {
                  const isActive = opt.key === sort;
                  return (
                    <Link
                      key={opt.key}
                      href={buildHref(paramsForLink, {
                        sort: opt.key === "newest" ? undefined : opt.key,
                        page: undefined,
                      })}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-[#D4A843] text-black"
                          : "border border-white/10 text-neutral-300 hover:border-[#D4A843]/40 hover:text-[#D4A843]"
                      }`}
                    >
                      {opt.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Grid / Empty state */}
            {sortedProducts.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-[#141414] p-12 text-center">
                <p className="text-lg font-medium text-white">
                  Chưa có sản phẩm nào
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  Bộ lọc hiện tại không trả về kết quả. Hãy thử bỏ bớt điều
                  kiện lọc.
                </p>
                <Link
                  href="/shop"
                  className="mt-6 inline-flex items-center rounded-md bg-[#D4A843] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#c4982f]"
                >
                  Xem tất cả sản phẩm
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
                {sortedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              paramsForLink={paramsForLink}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
