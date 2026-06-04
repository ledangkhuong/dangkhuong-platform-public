/**
 * Product Detail Page (PDP) — `/shop/[slug]`
 *
 * Server Component. Render chi tiết 1 sản phẩm theo slug:
 * - Trái: Gallery (thumbnail + carousel ảnh nhỏ từ gallery_urls)
 * - Phải: breadcrumb, tên, giá, variant selector, quantity, AddToCartButton,
 *   trạng thái tồn kho.
 * - Tabs: Mô tả chi tiết / Thông số / SEO meta (chỉ staff mới thấy tab SEO).
 *
 * SEO:
 * - `generateMetadata` map từ `seo_title` / `seo_description` của product.
 * - JSON-LD Product schema chèn trực tiếp ở cuối page.
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, Check, AlertTriangle, XCircle } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { siteConfig, getBaseUrl } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/server";
import { getProductBySlug } from "@/lib/ecommerce/queries";
import type { ProductVariant } from "@/types/ecommerce";

import AddToCartButton from "../_components/AddToCartButton";

export const dynamic = "force-dynamic";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

const STAFF_ROLES = new Set([
  "admin",
  "manager",
  "marketing",
  "sale",
  "support",
]);

/**
 * Lightweight staff probe cho mục đích hiển thị tab SEO trên PDP.
 * Không redirect — page public — chỉ trả về true/false.
 */
async function viewerIsStaff(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return !!profile && STAFF_ROLES.has(String(profile.role ?? ""));
  } catch {
    return false;
  }
}

/**
 * Resolve giá hiển thị + tồn kho từ variant mặc định (nếu có) hoặc product.
 * - Variant mặc định = `is_default = true`, fallback variant đầu tiên.
 * - Nếu product không có variant: dùng giá product, tồn kho coi như còn hàng
 *   (sẽ ràng buộc lại ở Week 3 khi cộng dồn vào cart).
 */
function pickDefaultVariant(
  variants: ProductVariant[]
): ProductVariant | null {
  if (variants.length === 0) return null;
  return variants.find((v) => v.is_default) ?? variants[0];
}

type StockState = "in_stock" | "low_stock" | "out_of_stock" | "no_variants";

function deriveStockState(variant: ProductVariant | null): StockState {
  if (!variant) return "no_variants";
  if (variant.stock_count <= 0) return "out_of_stock";
  const threshold = variant.low_stock_threshold ?? 0;
  if (threshold > 0 && variant.stock_count <= threshold) return "low_stock";
  return "in_stock";
}

// ─── Metadata ───────────────────────────────────────────────────────────────

type ShopSlugProps = { params: Promise<{ slug: string }> };

export async function generateMetadata(
  props: ShopSlugProps
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product || product.status !== "active") {
    return { title: `Không tìm thấy sản phẩm — ${siteConfig.name}` };
  }

  const title = product.seo_title?.trim() || `${product.name} — ${siteConfig.name}`;
  const description =
    product.seo_description?.trim() ||
    product.short_description?.trim() ||
    product.description?.slice(0, 160) ||
    undefined;

  const canonical = `${getBaseUrl()}/shop/${product.slug}`;
  const images = [product.thumbnail_url, ...(product.gallery_urls ?? [])]
    .filter((u): u is string => !!u)
    .slice(0, 4);

  return {
    title,
    description,
    keywords: product.seo_keywords ?? undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: images.length > 0 ? images : undefined,
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title,
      description,
      images: images.length > 0 ? images : undefined,
    },
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ProductDetailPage(
  props: ShopSlugProps
) {
  const { slug } = await props.params;

  const product = await getProductBySlug(slug);
  if (!product || product.status !== "active") notFound();

  const isStaff = await viewerIsStaff();

  const defaultVariant = pickDefaultVariant(product.variants);
  const stockState = deriveStockState(defaultVariant);

  // Giá hiển thị: ưu tiên variant mặc định, fallback giá product.
  const displayPrice = defaultVariant?.price ?? product.price;
  const displayCompareAt =
    defaultVariant?.compare_at_price ?? product.compare_at_price ?? null;
  const hasDiscount =
    typeof displayCompareAt === "number" && displayCompareAt > displayPrice;
  const discountPct = hasDiscount
    ? Math.round(((displayCompareAt - displayPrice) / displayCompareAt) * 100)
    : 0;

  // Gallery: thumbnail trước, rồi tới gallery_urls (dedupe).
  const gallery = Array.from(
    new Set(
      [product.thumbnail_url, ...(product.gallery_urls ?? [])].filter(
        (u): u is string => !!u
      )
    )
  );

  // ─── JSON-LD Product schema ───
  const canonicalUrl = `${getBaseUrl()}/shop/${product.slug}`;
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description:
      product.seo_description ||
      product.short_description ||
      product.description ||
      undefined,
    image: gallery.length > 0 ? gallery : undefined,
    sku: defaultVariant?.sku || product.sku || undefined,
    brand: { "@type": "Brand", name: siteConfig.name },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "VND",
      price: displayPrice,
      availability:
        stockState === "out_of_stock"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-400"
        >
          <Link href="/" className="hover:text-[#D4A843]">
            Trang chủ
          </Link>
          <ChevronRight size={14} className="text-gray-600" />
          <Link href="/shop" className="hover:text-[#D4A843]">
            Shop
          </Link>
          {product.category && (
            <>
              <ChevronRight size={14} className="text-gray-600" />
              <Link
                href={`/shop?category=${encodeURIComponent(product.category.slug)}`}
                className="hover:text-[#D4A843]"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight size={14} className="text-gray-600" />
          <span className="truncate text-gray-200">{product.name}</span>
        </nav>

        {/* Main grid */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery — left (server-rendered, static for Week 2) */}
          <div>
            <ProductGalleryStatic images={gallery} alt={product.name} />
          </div>

          {/* Info — right */}
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold leading-tight text-white md:text-3xl">
                {product.name}
              </h1>
              {product.sku && (
                <p className="mt-1 text-xs text-gray-500">
                  SKU: <span className="font-mono">{product.sku}</span>
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-[#D4A843]">
                {formatVnd(displayPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-500 line-through">
                    {formatVnd(displayCompareAt!)}
                  </span>
                  <span className="rounded-md bg-red-900/40 px-2 py-0.5 text-xs font-semibold text-red-300">
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>

            {/* Short description */}
            {product.short_description && (
              <p className="text-sm leading-relaxed text-gray-300">
                {product.short_description}
              </p>
            )}

            {/* Inventory status */}
            <StockBadge state={stockState} variant={defaultVariant} />

            {/* Variant selector (placeholder — wire ở Week 3 cùng cart) */}
            {product.variants.length > 1 && (
              <div>
                <label
                  htmlFor="variant-select"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Phân loại
                </label>
                <select
                  id="variant-select"
                  name="variant"
                  defaultValue={defaultVariant?.id ?? undefined}
                  className="w-full rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm text-gray-100 focus:border-[#D4A843] focus:outline-none"
                >
                  {product.variants.map((v) => {
                    const out = v.stock_count <= 0;
                    return (
                      <option key={v.id} value={v.id} disabled={out}>
                        {v.name}
                        {v.price != null
                          ? ` — ${formatVnd(v.price)}`
                          : ""}
                        {out ? " (hết hàng)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Quantity (placeholder — Week 3 sẽ làm client input có +/-) */}
            <div>
              <label
                htmlFor="quantity-input"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Số lượng
              </label>
              <input
                id="quantity-input"
                name="quantity"
                type="number"
                min={1}
                max={99}
                defaultValue={1}
                className="w-24 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm text-gray-100 focus:border-[#D4A843] focus:outline-none"
              />
            </div>

            {/* Add to cart */}
            <AddToCartButton
              productId={product.id}
              variantId={defaultVariant?.id ?? null}
              quantity={1}
              disabled={stockState === "out_of_stock"}
              label={
                stockState === "out_of_stock"
                  ? "Hết hàng"
                  : "Thêm vào giỏ"
              }
            />

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-gray-800 bg-gray-900/60 px-2.5 py-0.5 text-xs text-gray-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs below */}
        <div className="mt-12">
          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">Mô tả chi tiết</TabsTrigger>
              <TabsTrigger value="specs">Thông số</TabsTrigger>
              {isStaff && (
                <TabsTrigger value="seo">SEO meta (admin)</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="description" className="pt-4">
              <DescriptionPanel description={product.description} />
            </TabsContent>

            <TabsContent value="specs" className="pt-4">
              <SpecsPanel
                weightGrams={
                  defaultVariant?.weight_grams ?? product.weight_grams ?? null
                }
                dimensions={product.dimensions_cm ?? null}
                productType={product.product_type}
                sku={defaultVariant?.sku ?? product.sku ?? null}
              />
            </TabsContent>

            {isStaff && (
              <TabsContent value="seo" className="pt-4">
                <SeoPanel
                  seoTitle={product.seo_title}
                  seoDescription={product.seo_description}
                  seoKeywords={product.seo_keywords}
                  focusKeyword={product.focus_keyword}
                  slug={product.slug}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StockBadge({
  state,
  variant,
}: {
  state: StockState;
  variant: ProductVariant | null;
}) {
  if (state === "in_stock") {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-green-400">
        <Check size={16} /> Còn hàng
        {variant && variant.stock_count > 0 && variant.stock_count <= 20 && (
          <span className="text-xs text-gray-500">
            ({variant.stock_count} sản phẩm)
          </span>
        )}
      </div>
    );
  }
  if (state === "low_stock") {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400">
        <AlertTriangle size={16} />
        Sắp hết hàng
        {variant && (
          <span className="text-xs text-gray-500">
            (còn {variant.stock_count})
          </span>
        )}
      </div>
    );
  }
  if (state === "out_of_stock") {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-red-400">
        <XCircle size={16} /> Hết hàng
      </div>
    );
  }
  // no_variants — sản phẩm không có variant; chưa enforce tồn kho ở PDP.
  return (
    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-green-400">
      <Check size={16} /> Có sẵn
    </div>
  );
}

function DescriptionPanel({ description }: { description: string | null }) {
  if (!description || !description.trim()) {
    return (
      <p className="text-sm text-gray-500">Chưa có mô tả chi tiết cho sản phẩm này.</p>
    );
  }
  return (
    <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
      {description}
    </div>
  );
}

function SpecsPanel({
  weightGrams,
  dimensions,
  productType,
  sku,
}: {
  weightGrams: number | null;
  dimensions: { length?: number; width?: number; height?: number } | null;
  productType: string;
  sku: string | null;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Loại sản phẩm", value: productLabel(productType) },
  ];
  if (sku) rows.push({ label: "SKU", value: sku });
  if (typeof weightGrams === "number") {
    rows.push({ label: "Trọng lượng", value: `${weightGrams} g` });
  }
  if (dimensions) {
    const { length, width, height } = dimensions;
    if (length || width || height) {
      rows.push({
        label: "Kích thước (D × R × C)",
        value: `${length ?? "?"} × ${width ?? "?"} × ${height ?? "?"} cm`,
      });
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">Chưa cập nhật thông số.</p>;
  }

  return (
    <dl className="divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-900/40">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-3 gap-4 px-4 py-2.5 text-sm"
        >
          <dt className="text-gray-400">{row.label}</dt>
          <dd className="col-span-2 text-gray-200">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function productLabel(type: string): string {
  switch (type) {
    case "book":
      return "Sách";
    case "merch":
      return "Hàng vật lý / Merch";
    case "digital":
      return "Sản phẩm số";
    default:
      return type;
  }
}

function SeoPanel({
  seoTitle,
  seoDescription,
  seoKeywords,
  focusKeyword,
  slug,
}: {
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[] | null;
  focusKeyword: string | null;
  slug: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-amber-900/40 bg-amber-950/10 p-4 text-sm">
      <p className="text-xs uppercase tracking-wide text-amber-400">
        Chỉ admin thấy panel này
      </p>
      <SeoRow label="Slug" value={slug} mono />
      <SeoRow label="SEO title" value={seoTitle} />
      <SeoRow label="SEO description" value={seoDescription} />
      <SeoRow label="Focus keyword" value={focusKeyword} />
      <SeoRow
        label="SEO keywords"
        value={seoKeywords && seoKeywords.length > 0 ? seoKeywords.join(", ") : null}
      />
    </div>
  );
}

function SeoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <span className="text-gray-400">{label}</span>
      <span
        className={
          "col-span-2 text-gray-200 " + (mono ? "font-mono text-xs" : "")
        }
      >
        {value && value.trim() ? value : <em className="text-gray-600">— chưa thiết lập —</em>}
      </span>
    </div>
  );
}

// ─── Static gallery (server-rendered) ───────────────────────────────────────

function ProductGalleryStatic({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const main = images[0];
  const thumbs = images.slice(1, 5);

  if (!main) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-gray-800 bg-gray-900/40 text-sm text-gray-500">
        Chưa có ảnh sản phẩm
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <Image
          src={main}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          className="object-cover"
        />
      </div>
      {thumbs.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {thumbs.map((src, idx) => (
            <div
              key={src + idx}
              className="relative aspect-square overflow-hidden rounded-lg border border-gray-800 bg-gray-900"
            >
              <Image
                src={src}
                alt={`${alt} — ${idx + 2}`}
                fill
                sizes="120px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
