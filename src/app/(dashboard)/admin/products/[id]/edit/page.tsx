import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getProductById } from "@/lib/ecommerce/queries";
import ProductForm, {
  type ProductCategory,
  type ProductFormValues,
  type VariantInput,
} from "../../_components/ProductForm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Admin: trang chỉnh sửa sản phẩm.
 *
 * Server Component:
 *  - Auth gate qua `requireStaff()`
 *  - Fetch chi tiết sản phẩm theo `params.id` (kèm variants) qua `getProductById`
 *  - 404 nếu không tìm thấy
 *  - Render `<ProductForm mode="edit" initialData={product} />`
 */
export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  // Next.js 15+ / 16: params là Promise và phải await trước khi dùng
  const { id } = await params;

  // Auth: chỉ staff mới được vào admin (inline pattern, không có @/lib/auth helper)
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

  const product = await getProductById(id);
  if (!product) {
    notFound();
  }

  // Load categories cho dropdown
  const { data: categoriesData } = await authClient
    .from("product_categories")
    .select("id, name, parent_id")
    .eq("is_visible", true)
    .order("position", { ascending: true });
  const categories = (categoriesData ?? []) as ProductCategory[];

  // Map product → ProductFormValues
  const initialValues: Partial<ProductFormValues> = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    short_description: product.short_description ?? "",
    product_type: product.product_type as ProductFormValues["product_type"],
    status: product.status as ProductFormValues["status"],
    price: String(product.price ?? ""),
    compare_at_price: product.compare_at_price != null ? String(product.compare_at_price) : "",
    sku: product.sku ?? "",
    weight_grams: product.weight_grams != null ? String(product.weight_grams) : "",
    thumbnail_url: product.thumbnail_url ?? "",
    gallery_urls: (product.gallery_urls ?? []).join("\n"),
    tags: (product.tags ?? []).join(", "),
    category_id: product.category_id ?? "",
    seo_title: product.seo_title ?? "",
    seo_description: product.seo_description ?? "",
    focus_keyword: product.focus_keyword ?? "",
    variants: (product.variants ?? []).map<VariantInput>((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku ?? "",
      price: v.price != null ? String(v.price) : "",
      stock_count: String(v.stock_count ?? 0),
      attributes: v.attributes
        ? Object.entries(v.attributes as Record<string, unknown>).map(([key, value]) => ({
            key,
            value: String(value ?? ""),
          }))
        : [],
    })),
  };

  return <ProductForm mode="edit" categories={categories} initialValues={initialValues} />;
}
