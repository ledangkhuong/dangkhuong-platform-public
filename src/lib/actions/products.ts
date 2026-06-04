"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductType = "book" | "merch" | "digital";
export type ProductStatus = "draft" | "active" | "archived";

export interface ProductInput {
  slug: string;
  name: string;
  description?: string | null;
  short_description?: string | null;
  sku?: string | null;
  price: number;
  compare_at_price?: number | null;
  cost?: number | null;
  product_type: ProductType;
  status?: ProductStatus;
  thumbnail_url?: string | null;
  gallery_urls?: string[] | null;
  weight_grams?: number | null;
  dimensions_cm?: Record<string, unknown> | null;
  tags?: string[] | null;
  category_id?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  focus_keyword?: string | null;
}

export interface VariantInput {
  id?: string;
  name: string;
  sku?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  stock_count?: number;
  low_stock_threshold?: number | null;
  weight_grams?: number | null;
  barcode?: string | null;
  position?: number | null;
  attributes?: Record<string, unknown> | null;
  is_default?: boolean;
}

export interface CategoryInput {
  slug: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  thumbnail_url?: string | null;
  position?: number | null;
  is_visible?: boolean;
}

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ─── Auth Helper ──────────────────────────────────────────────────────────────

const ADMIN_ROLES = ["admin", "manager", "marketing"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * Gate that ensures the caller is a logged-in staff member with rights to
 * manage products. Mirrors the requireStaff pattern in other action files,
 * but narrows accepted roles per the products spec (admin / manager / marketing).
 *
 * Redirects unauthenticated users to /login and non-staff users to /dashboard.
 */
async function requireStaff(): Promise<{ userId: string; role: AdminRole }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role as AdminRole)) {
    redirect("/dashboard");
  }

  return { userId: user.id, role: profile.role as AdminRole };
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlug(slug: string): string | null {
  if (!slug) return "Slug không được để trống";
  if (slug.length > 200) return "Slug quá dài (tối đa 200 ký tự)";
  if (!SLUG_RE.test(slug)) {
    return "Slug chỉ chứa chữ thường, số và dấu gạch ngang (vd: san-pham-moi)";
  }
  return null;
}

function validateProductPayload(
  data: Partial<ProductInput>,
  { isCreate }: { isCreate: boolean }
): string | null {
  if (isCreate) {
    if (!data.name || !data.name.trim()) return "Tên sản phẩm không được để trống";
    if (data.slug == null) return "Slug không được để trống";
    if (data.product_type == null) return "Loại sản phẩm không được để trống";
    if (data.price == null) return "Giá sản phẩm không được để trống";
  }

  if (data.slug != null) {
    const slugErr = validateSlug(data.slug);
    if (slugErr) return slugErr;
  }

  if (data.price != null && (!Number.isFinite(data.price) || data.price < 0)) {
    return "Giá sản phẩm phải >= 0";
  }
  if (
    data.compare_at_price != null &&
    (!Number.isFinite(data.compare_at_price) || data.compare_at_price < 0)
  ) {
    return "Giá so sánh phải >= 0";
  }
  if (data.cost != null && (!Number.isFinite(data.cost) || data.cost < 0)) {
    return "Giá vốn phải >= 0";
  }
  if (
    data.weight_grams != null &&
    (!Number.isInteger(data.weight_grams) || data.weight_grams < 0)
  ) {
    return "Khối lượng (gram) phải là số nguyên >= 0";
  }
  if (
    data.product_type != null &&
    !["book", "merch", "digital"].includes(data.product_type)
  ) {
    return "Loại sản phẩm không hợp lệ";
  }
  if (
    data.status != null &&
    !["draft", "active", "archived"].includes(data.status)
  ) {
    return "Trạng thái không hợp lệ";
  }
  return null;
}

function validateVariantPayload(v: Partial<VariantInput>): string | null {
  if (v.name != null && !v.name.trim()) return "Tên biến thể không được để trống";
  if (v.price != null && (!Number.isFinite(v.price) || v.price < 0)) {
    return "Giá biến thể phải >= 0";
  }
  if (
    v.compare_at_price != null &&
    (!Number.isFinite(v.compare_at_price) || v.compare_at_price < 0)
  ) {
    return "Giá so sánh phải >= 0";
  }
  if (
    v.stock_count != null &&
    (!Number.isInteger(v.stock_count) || v.stock_count < 0)
  ) {
    return "Tồn kho phải là số nguyên >= 0";
  }
  if (
    v.weight_grams != null &&
    (!Number.isInteger(v.weight_grams) || v.weight_grams < 0)
  ) {
    return "Khối lượng phải là số nguyên >= 0";
  }
  return null;
}

function validateCategoryPayload(
  data: Partial<CategoryInput>,
  { isCreate }: { isCreate: boolean }
): string | null {
  if (isCreate) {
    if (!data.name || !data.name.trim()) return "Tên danh mục không được để trống";
    if (data.slug == null) return "Slug danh mục không được để trống";
  }
  if (data.slug != null) {
    const slugErr = validateSlug(data.slug);
    if (slugErr) return slugErr;
  }
  if (data.position != null && !Number.isFinite(data.position)) {
    return "Vị trí không hợp lệ";
  }
  return null;
}

// Strip undefined keys so we don't overwrite columns with NULL on partial updates.
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Map new ecommerce status values to legacy DB CHECK constraint values.
 * The products table CHECK still only accepts 'draft' | 'published' from the
 * original course schema. Until we can drop that constraint, translate.
 *  - active   → published (live in storefront)
 *  - archived → draft     (hide from storefront)
 *  - draft    → draft
 */
function mapStatusToDb(status: string | null | undefined): string {
  if (status === "active") return "published";
  if (status === "archived") return "draft";
  return status || "draft";
}

function revalidateProductSurfaces(slug?: string | null) {
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  if (slug) {
    revalidatePath(`/shop/${slug}`);
  }
}

// ─── Product Actions ─────────────────────────────────────────────────────────

/** Tạo sản phẩm mới. Trả về { ok, product? | error }. */
export async function createProduct(
  data: ProductInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireStaff();

  const vErr = validateProductPayload(data, { isCreate: true });
  if (vErr) return { ok: false, error: vErr };

  const admin = await createAdminClient();

  // Slug uniqueness
  const { data: dupSlug } = await admin
    .from("products")
    .select("id")
    .eq("slug", data.slug)
    .maybeSingle();
  if (dupSlug) return { ok: false, error: "Slug sản phẩm đã tồn tại" };

  // SKU uniqueness (only if provided)
  if (data.sku && data.sku.trim()) {
    const { data: dupSku } = await admin
      .from("products")
      .select("id")
      .eq("sku", data.sku.trim())
      .maybeSingle();
    if (dupSku) return { ok: false, error: "SKU sản phẩm đã tồn tại" };
  }

  const payload = compact({
    slug: data.slug.trim(),
    name: data.name.trim(),
    description: data.description ?? null,
    short_description: data.short_description ?? null,
    sku: data.sku?.trim() || null,
    price: data.price,
    compare_at_price: data.compare_at_price ?? null,
    cost: data.cost ?? null,
    product_type: data.product_type,
    status: mapStatusToDb(data.status),
    thumbnail_url: data.thumbnail_url ?? null,
    gallery_urls: data.gallery_urls ?? [],
    weight_grams: data.weight_grams ?? null,
    dimensions_cm: data.dimensions_cm ?? null,
    tags: data.tags ?? [],
    category_id: data.category_id ?? null,
    seo_title: data.seo_title ?? null,
    seo_description: data.seo_description ?? null,
    focus_keyword: data.focus_keyword ?? null,
  });

  const { data: inserted, error } = await admin
    .from("products")
    .insert(payload)
    .select("id, slug")
    .single();

  if (error || !inserted) {
    console.error("[products.createProduct]", error);
    return { ok: false, error: error?.message ?? "Tạo sản phẩm thất bại" };
  }

  revalidateProductSurfaces(inserted.slug as string);
  return { ok: true, data: { id: inserted.id as string, slug: inserted.slug as string } };
}

/** Cập nhật sản phẩm. Partial input — chỉ ghi các trường được truyền vào. */
export async function updateProduct(
  id: string,
  data: Partial<ProductInput>
): Promise<ActionResult> {
  await requireStaff();
  if (!id) return { ok: false, error: "Thiếu product id" };

  const vErr = validateProductPayload(data, { isCreate: false });
  if (vErr) return { ok: false, error: vErr };

  const admin = await createAdminClient();

  // Slug uniqueness check (excluding self)
  if (data.slug != null) {
    const { data: dupSlug } = await admin
      .from("products")
      .select("id")
      .eq("slug", data.slug)
      .neq("id", id)
      .maybeSingle();
    if (dupSlug) return { ok: false, error: "Slug sản phẩm đã tồn tại" };
  }
  if (data.sku != null && data.sku.trim()) {
    const { data: dupSku } = await admin
      .from("products")
      .select("id")
      .eq("sku", data.sku.trim())
      .neq("id", id)
      .maybeSingle();
    if (dupSku) return { ok: false, error: "SKU sản phẩm đã tồn tại" };
  }

  const payload = compact({
    slug: data.slug?.trim(),
    name: data.name?.trim(),
    description: data.description,
    short_description: data.short_description,
    sku: data.sku !== undefined ? data.sku?.trim() || null : undefined,
    price: data.price,
    compare_at_price: data.compare_at_price,
    cost: data.cost,
    product_type: data.product_type,
    status: data.status !== undefined ? mapStatusToDb(data.status) : undefined,
    thumbnail_url: data.thumbnail_url,
    gallery_urls: data.gallery_urls,
    weight_grams: data.weight_grams,
    dimensions_cm: data.dimensions_cm,
    tags: data.tags,
    category_id: data.category_id,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    focus_keyword: data.focus_keyword,
    updated_at: new Date().toISOString(),
  });

  const { data: updated, error } = await admin
    .from("products")
    .update(payload)
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    console.error("[products.updateProduct]", error);
    return { ok: false, error: error.message ?? "Cập nhật sản phẩm thất bại" };
  }

  revalidateProductSurfaces((updated?.slug as string) ?? null);
  return { ok: true };
}

/** Xoá sản phẩm. Chỉ admin/manager (marketing không được xoá). */
export async function deleteProduct(id: string): Promise<ActionResult> {
  const { role } = await requireStaff();
  if (!["admin", "manager"].includes(role)) {
    return { ok: false, error: "Không có quyền xoá sản phẩm" };
  }
  if (!id) return { ok: false, error: "Thiếu product id" };

  const admin = await createAdminClient();

  // Fetch slug for revalidation before delete
  const { data: existing } = await admin
    .from("products")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) {
    console.error("[products.deleteProduct]", error);
    return { ok: false, error: error.message ?? "Xoá sản phẩm thất bại" };
  }

  revalidateProductSurfaces((existing?.slug as string) ?? null);
  return { ok: true };
}

/** Đặt trạng thái sản phẩm thành "archived" (soft-disable). */
export async function archiveProduct(id: string): Promise<ActionResult> {
  return updateProduct(id, { status: "archived" });
}

/** Đặt trạng thái sản phẩm thành "active" (đăng bán). */
export async function activateProduct(id: string): Promise<ActionResult> {
  return updateProduct(id, { status: "active" });
}

/** Cập nhật trạng thái cho nhiều sản phẩm cùng lúc. */
export async function bulkUpdateStatus(
  ids: string[],
  status: ProductStatus
): Promise<ActionResult<{ updated: number }>> {
  await requireStaff();
  if (!ids || ids.length === 0) {
    return { ok: false, error: "Cần chọn ít nhất 1 sản phẩm" };
  }
  if (!["draft", "active", "archived"].includes(status)) {
    return { ok: false, error: "Trạng thái không hợp lệ" };
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("products")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids)
    .select("id");

  if (error) {
    console.error("[products.bulkUpdateStatus]", error);
    return { ok: false, error: error.message ?? "Cập nhật hàng loạt thất bại" };
  }

  revalidateProductSurfaces();
  return { ok: true, data: { updated: data?.length ?? 0 } };
}

// ─── Variant Actions ─────────────────────────────────────────────────────────

/**
 * Insert hoặc update biến thể của sản phẩm.
 * - Nếu variantData.id có giá trị → update.
 * - Nếu không → insert mới.
 * Khi biến thể được đặt is_default = true, các biến thể còn lại của cùng
 * product sẽ tự động bị bỏ cờ default để giữ ràng buộc 1-default-per-product.
 */
export async function upsertVariant(
  productId: string,
  variantData: VariantInput
): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  if (!productId) return { ok: false, error: "Thiếu product id" };

  const vErr = validateVariantPayload(variantData);
  if (vErr) return { ok: false, error: vErr };

  const admin = await createAdminClient();

  // Verify parent product exists
  const { data: parent } = await admin
    .from("products")
    .select("id, slug")
    .eq("id", productId)
    .maybeSingle();
  if (!parent) return { ok: false, error: "Sản phẩm không tồn tại" };

  // SKU uniqueness for variants (within all variants, not just same product)
  if (variantData.sku && variantData.sku.trim()) {
    let dupQuery = admin
      .from("product_variants")
      .select("id")
      .eq("sku", variantData.sku.trim());
    if (variantData.id) dupQuery = dupQuery.neq("id", variantData.id);
    const { data: dup } = await dupQuery.maybeSingle();
    if (dup) return { ok: false, error: "SKU biến thể đã tồn tại" };
  }

  const payload = compact({
    product_id: productId,
    name: variantData.name?.trim(),
    sku: variantData.sku?.trim() || null,
    price: variantData.price,
    compare_at_price: variantData.compare_at_price,
    stock_count: variantData.stock_count,
    low_stock_threshold: variantData.low_stock_threshold,
    weight_grams: variantData.weight_grams,
    barcode: variantData.barcode,
    position: variantData.position,
    attributes: variantData.attributes,
    is_default: variantData.is_default,
  });

  let resultId: string;
  if (variantData.id) {
    const { data: updated, error } = await admin
      .from("product_variants")
      .update(payload)
      .eq("id", variantData.id)
      .eq("product_id", productId)
      .select("id")
      .single();
    if (error || !updated) {
      console.error("[products.upsertVariant:update]", error);
      return { ok: false, error: error?.message ?? "Cập nhật biến thể thất bại" };
    }
    resultId = updated.id as string;
  } else {
    const { data: inserted, error } = await admin
      .from("product_variants")
      .insert(payload)
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("[products.upsertVariant:insert]", error);
      return { ok: false, error: error?.message ?? "Tạo biến thể thất bại" };
    }
    resultId = inserted.id as string;
  }

  // Enforce single default per product
  if (variantData.is_default === true) {
    await admin
      .from("product_variants")
      .update({ is_default: false })
      .eq("product_id", productId)
      .neq("id", resultId);
  }

  revalidateProductSurfaces((parent.slug as string) ?? null);
  return { ok: true, data: { id: resultId } };
}

/** Xoá biến thể. */
export async function deleteVariant(variantId: string): Promise<ActionResult> {
  await requireStaff();
  if (!variantId) return { ok: false, error: "Thiếu variant id" };

  const admin = await createAdminClient();

  // Fetch parent product slug for revalidation
  const { data: variant } = await admin
    .from("product_variants")
    .select("product_id, products!inner(slug)")
    .eq("id", variantId)
    .maybeSingle();

  const { error } = await admin
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  if (error) {
    console.error("[products.deleteVariant]", error);
    return { ok: false, error: error.message ?? "Xoá biến thể thất bại" };
  }

  const slug =
    (variant as { products?: { slug?: string } } | null)?.products?.slug ?? null;
  revalidateProductSurfaces(slug);
  return { ok: true };
}

// ─── Category Actions ────────────────────────────────────────────────────────

/** Tạo danh mục sản phẩm. */
export async function createCategory(
  data: CategoryInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireStaff();

  const vErr = validateCategoryPayload(data, { isCreate: true });
  if (vErr) return { ok: false, error: vErr };

  const admin = await createAdminClient();

  // Slug uniqueness
  const { data: dup } = await admin
    .from("product_categories")
    .select("id")
    .eq("slug", data.slug)
    .maybeSingle();
  if (dup) return { ok: false, error: "Slug danh mục đã tồn tại" };

  // Verify parent exists (avoid orphan FK)
  if (data.parent_id) {
    const { data: parent } = await admin
      .from("product_categories")
      .select("id")
      .eq("id", data.parent_id)
      .maybeSingle();
    if (!parent) return { ok: false, error: "Danh mục cha không tồn tại" };
  }

  const payload = compact({
    slug: data.slug.trim(),
    name: data.name.trim(),
    description: data.description ?? null,
    parent_id: data.parent_id ?? null,
    thumbnail_url: data.thumbnail_url ?? null,
    position: data.position ?? 0,
    is_visible: data.is_visible ?? true,
  });

  const { data: inserted, error } = await admin
    .from("product_categories")
    .insert(payload)
    .select("id, slug")
    .single();

  if (error || !inserted) {
    console.error("[products.createCategory]", error);
    return { ok: false, error: error?.message ?? "Tạo danh mục thất bại" };
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: true, data: { id: inserted.id as string, slug: inserted.slug as string } };
}

/** Cập nhật danh mục. */
export async function updateCategory(
  id: string,
  data: Partial<CategoryInput>
): Promise<ActionResult> {
  await requireStaff();
  if (!id) return { ok: false, error: "Thiếu category id" };

  const vErr = validateCategoryPayload(data, { isCreate: false });
  if (vErr) return { ok: false, error: vErr };

  const admin = await createAdminClient();

  if (data.slug != null) {
    const { data: dup } = await admin
      .from("product_categories")
      .select("id")
      .eq("slug", data.slug)
      .neq("id", id)
      .maybeSingle();
    if (dup) return { ok: false, error: "Slug danh mục đã tồn tại" };
  }

  // Prevent self-parent loops
  if (data.parent_id) {
    if (data.parent_id === id) {
      return { ok: false, error: "Danh mục không thể là cha của chính nó" };
    }
    const { data: parent } = await admin
      .from("product_categories")
      .select("id")
      .eq("id", data.parent_id)
      .maybeSingle();
    if (!parent) return { ok: false, error: "Danh mục cha không tồn tại" };
  }

  const payload = compact({
    slug: data.slug?.trim(),
    name: data.name?.trim(),
    description: data.description,
    parent_id: data.parent_id,
    thumbnail_url: data.thumbnail_url,
    position: data.position,
    is_visible: data.is_visible,
    updated_at: new Date().toISOString(),
  });

  const { error } = await admin
    .from("product_categories")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[products.updateCategory]", error);
    return { ok: false, error: error.message ?? "Cập nhật danh mục thất bại" };
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: true };
}

/**
 * Xoá danh mục.
 * - Chặn nếu có danh mục con (yêu cầu xoá/di chuyển con trước).
 * - Chặn nếu còn sản phẩm thuộc danh mục (yêu cầu chuyển sản phẩm sang
 *   danh mục khác trước khi xoá).
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const { role } = await requireStaff();
  if (!["admin", "manager"].includes(role)) {
    return { ok: false, error: "Không có quyền xoá danh mục" };
  }
  if (!id) return { ok: false, error: "Thiếu category id" };

  const admin = await createAdminClient();

  // Block if has children
  const { data: children } = await admin
    .from("product_categories")
    .select("id")
    .eq("parent_id", id)
    .limit(1);
  if (children && children.length > 0) {
    return { ok: false, error: "Danh mục còn danh mục con, không thể xoá" };
  }

  // Block if has products
  const { data: prods } = await admin
    .from("products")
    .select("id")
    .eq("category_id", id)
    .limit(1);
  if (prods && prods.length > 0) {
    return {
      ok: false,
      error: "Danh mục còn sản phẩm, hãy chuyển sản phẩm trước khi xoá",
    };
  }

  const { error } = await admin
    .from("product_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[products.deleteCategory]", error);
    return { ok: false, error: error.message ?? "Xoá danh mục thất bại" };
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: true };
}
