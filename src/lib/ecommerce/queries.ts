/**
 * Server-side query helpers cho module e-commerce (Week 2 — Catalog).
 *
 * Tất cả hàm trong file này được dùng từ Server Components / Server Actions
 * / Route Handlers. KHÔNG export ra client.
 *
 * Quy tắc chung:
 * - Dùng `createClient()` (anon + RLS) cho truy vấn cần tôn trọng quyền user.
 * - Dùng `createAdminClient()` (service role, bypass RLS) cho các query
 *   admin/stats để đảm bảo lấy đủ dữ liệu (kể cả draft / archived / khuất).
 * - Mọi hàm là `async` và `throw` khi gặp lỗi DB; caller tự bọc try/catch.
 * - Log lỗi bằng `console.error` kèm prefix `[ecommerce/queries]` để dễ grep.
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type {
  Product,
  ProductCategory,
  ProductFull,
  ProductStatus,
  ProductType,
  ProductVariant,
  ProductWithVariants,
} from "@/types/ecommerce";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Chuẩn hoá lỗi từ Supabase thành Error có thông điệp rõ ràng để log/throw.
 */
function toError(scope: string, error: unknown): Error {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return new Error(`[ecommerce/queries:${scope}] ${msg}`);
}

// ---------------------------------------------------------------------------
// 1) getProducts — danh sách sản phẩm có filter + phân trang
// ---------------------------------------------------------------------------

export interface GetProductsFilters {
  /** Lọc theo category_id (exact match). */
  categoryId?: string | null;
  /** Lọc theo status (draft / active / archived). */
  status?: ProductStatus;
  /** Lọc theo product_type (book / merch / digital). */
  productType?: ProductType;
  /** Tìm kiếm theo name / sku / slug (ILIKE %search%). */
  search?: string;
  /** Số bản ghi tối đa trả về (default 20, max 100). */
  limit?: number;
  /** Offset cho phân trang (default 0). */
  offset?: number;
}

export interface GetProductsResult {
  products: Product[];
  totalCount: number;
}

/**
 * Lấy danh sách sản phẩm với filter linh hoạt cho admin DataTable + storefront.
 *
 * - Dùng admin client để admin thấy được cả draft/archived.
 * - Trả về kèm `totalCount` (đếm theo cùng filter) để render pagination.
 * - Sắp xếp mặc định: `updated_at DESC` (mới sửa lên đầu).
 */
export async function getProducts(
  filters: GetProductsFilters = {}
): Promise<GetProductsResult> {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const supabase = await createAdminClient();

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.status) {
    // Legacy DB column stores 'published' where the new enum uses 'active'.
    // Treat them as the same when filtering so the storefront still sees products.
    if (filters.status === "active") {
      query = query.in("status", ["active", "published"]);
      // Exclude legacy course rows that share the table — those rows have a
      // NULL `name` because they predate the ecommerce schema and only carry
      // the legacy `title` column. The storefront should never show them.
      query = query.not("name", "is", null);
    } else {
      query = query.eq("status", filters.status);
    }
  }
  if (filters.productType) {
    query = query.eq("product_type", filters.productType);
  }
  if (filters.search && filters.search.trim()) {
    // Escape `%` và `,` để tránh phá vỡ cú pháp `or` của PostgREST.
    const term = filters.search.trim().replace(/[%,]/g, "");
    const pattern = `%${term}%`;
    query = query.or(
      `name.ilike.${pattern},sku.ilike.${pattern},slug.ilike.${pattern}`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[ecommerce/queries] getProducts failed", error);
    throw toError("getProducts", error);
  }

  return {
    products: (data ?? []) as Product[],
    totalCount: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 2) getProductBySlug — chi tiết sản phẩm theo slug (storefront)
// ---------------------------------------------------------------------------

/**
 * Lấy chi tiết 1 sản phẩm theo `slug` kèm variants + category.
 *
 * - Dùng anon client + RLS: chỉ trả về sản phẩm `status = 'active'` cho
 *   public, hoặc full nếu là staff (được RLS cho phép).
 * - Trả về `null` khi không tìm thấy (không throw).
 * - Variants được sort theo `position ASC`.
 */
export async function getProductBySlug(
  slug: string
): Promise<ProductFull | null> {
  if (!slug || typeof slug !== "string") return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        category:product_categories!products_category_id_fkey ( * ),
        variants:product_variants ( * )
      `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[ecommerce/queries] getProductBySlug failed", { slug, error });
    throw toError("getProductBySlug", error);
  }
  if (!data) return null;

  const row = data as Product & {
    category: ProductCategory | null;
    variants: ProductVariant[] | null;
  };

  const variants = (row.variants ?? []).slice().sort((a, b) => {
    return (a.position ?? 0) - (b.position ?? 0);
  });

  return {
    ...row,
    category: row.category ?? null,
    variants,
  };
}

// ---------------------------------------------------------------------------
// 3) getProductById — chi tiết sản phẩm theo id (admin edit form)
// ---------------------------------------------------------------------------

/**
 * Lấy chi tiết 1 sản phẩm theo `id` kèm variants. Phục vụ trang
 * admin edit (cần thấy cả draft/archived) → dùng admin client.
 *
 * Trả về `null` khi không tìm thấy.
 */
export async function getProductById(
  id: string
): Promise<ProductWithVariants | null> {
  if (!id || typeof id !== "string") return null;

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        variants:product_variants ( * )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[ecommerce/queries] getProductById failed", { id, error });
    throw toError("getProductById", error);
  }
  if (!data) return null;

  const row = data as Product & { variants: ProductVariant[] | null };
  const variants = (row.variants ?? []).slice().sort((a, b) => {
    return (a.position ?? 0) - (b.position ?? 0);
  });

  return { ...row, variants };
}

// ---------------------------------------------------------------------------
// 4) getCategories — cây danh mục (parent + children)
// ---------------------------------------------------------------------------

export interface ProductCategoryNode extends ProductCategory {
  children: ProductCategoryNode[];
}

/**
 * Lấy toàn bộ danh mục sản phẩm và dựng tree theo `parent_id`.
 *
 * - Dùng admin client để bao gồm cả category bị `is_visible = false`
 *   (admin cần thấy để toggle hiển thị).
 * - Sort: `position ASC`, sau đó `name ASC` để stable.
 * - Trả về mảng các node root (parent_id = null), mỗi node có `children[]`.
 */
export async function getCategories(): Promise<ProductCategoryNode[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[ecommerce/queries] getCategories failed", error);
    throw toError("getCategories", error);
  }

  const rows = (data ?? []) as ProductCategory[];

  // Build tree: map id -> node, rồi gắn children theo parent_id.
  const byId = new Map<string, ProductCategoryNode>();
  for (const row of rows) {
    byId.set(row.id, { ...row, children: [] });
  }

  const roots: ProductCategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      // parent_id NULL hoặc parent đã bị xoá → coi là root.
      roots.push(node);
    }
  }

  return roots;
}

// ---------------------------------------------------------------------------
// 5) getActiveProductsCount — số lượng sản phẩm đang active (admin stats)
// ---------------------------------------------------------------------------

/**
 * Đếm số sản phẩm có `status = 'active'`. Dùng cho widget thống kê
 * trên dashboard admin.
 */
export async function getActiveProductsCount(): Promise<number> {
  const supabase = await createAdminClient();

  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .in("status", ["active", "published"]);

  if (error) {
    console.error("[ecommerce/queries] getActiveProductsCount failed", error);
    throw toError("getActiveProductsCount", error);
  }

  return count ?? 0;
}

// ---------------------------------------------------------------------------
// 6) getLowStockVariants — variants sắp/đang hết hàng (admin alert)
// ---------------------------------------------------------------------------

export interface LowStockVariant extends ProductVariant {
  product: Pick<Product, "id" | "name" | "slug" | "thumbnail_url"> | null;
}

/**
 * Lấy danh sách `product_variants` có tồn kho thấp để hiển thị cảnh báo
 * trên admin dashboard.
 *
 * Logic:
 * - Nếu `threshold` được truyền vào → so sánh `stock_count <= threshold`.
 * - Nếu KHÔNG truyền → so sánh `stock_count <= low_stock_threshold` của
 *   chính variant (cấu hình mỗi SKU).
 *
 * Sắp xếp: `stock_count ASC` (hết hàng nhất lên đầu), giới hạn 100 dòng
 * để tránh payload quá lớn.
 */
export async function getLowStockVariants(
  threshold?: number
): Promise<LowStockVariant[]> {
  const supabase = await createAdminClient();

  let query = supabase
    .from("product_variants")
    .select(
      `
        *,
        product:products!product_variants_product_id_fkey (
          id, name, slug, thumbnail_url
        )
      `
    )
    .order("stock_count", { ascending: true })
    .limit(100);

  if (typeof threshold === "number" && Number.isFinite(threshold)) {
    query = query.lte("stock_count", Math.max(threshold, 0));
  }

  const { data, error } = await query;

  if (error) {
    console.error("[ecommerce/queries] getLowStockVariants failed", {
      threshold,
      error,
    });
    throw toError("getLowStockVariants", error);
  }

  const rows = (data ?? []) as LowStockVariant[];

  // Nếu không có threshold cứng → lọc client-side theo low_stock_threshold
  // của từng variant (Postgres không cho so sánh 2 cột trong .filter() của
  // supabase-js v2 một cách trực tiếp).
  if (typeof threshold !== "number") {
    return rows.filter((v) => {
      const limit = v.low_stock_threshold ?? 0;
      return v.stock_count <= limit;
    });
  }

  return rows;
}
