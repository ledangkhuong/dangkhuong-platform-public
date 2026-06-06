/**
 * JSON-LD <Product> schema cho trang chi tiết sản phẩm shop.
 *
 * Nhận `product` (ProductFull hoặc ProductWithVariants) + `url` canonical.
 * Emit script application/ld+json kèm offers (price, VND, availability)
 * và aggregateRating khi `rating_count > 0` (đọc qua optional access vì
 * field rating chưa nằm trong type ổn định — tránh fail build).
 */

import type { Product, ProductVariant } from "@/types/ecommerce";

type ProductLike = Product & {
  variants?: ProductVariant[];
  // Rating fields chưa có trong Product type nhưng có thể xuất hiện trên row
  // mở rộng tương lai — đọc lỏng để emit AggregateRating khi DB có dữ liệu.
  rating_value?: number | null;
  rating_count?: number | null;
  review_count?: number | null;
};

export interface ProductJsonLdProps {
  product: ProductLike;
  url: string;
}

function pickDefaultVariant(
  variants: ProductVariant[] | undefined
): ProductVariant | null {
  if (!variants || variants.length === 0) return null;
  return variants.find((v) => v.is_default) ?? variants[0];
}

function deriveAvailability(
  product: ProductLike,
  variant: ProductVariant | null
): string {
  // Có variants: hết hàng khi tổng tồn kho toàn bộ variants <= 0.
  if (product.variants && product.variants.length > 0) {
    const total = product.variants.reduce(
      (sum, v) => sum + (typeof v.stock_count === "number" ? v.stock_count : 0),
      0
    );
    if (total <= 0) return "https://schema.org/OutOfStock";
    return "https://schema.org/InStock";
  }
  // Không variants: mặc định InStock (model hiện chưa track stock cấp product).
  if (variant && variant.stock_count <= 0) return "https://schema.org/OutOfStock";
  return "https://schema.org/InStock";
}

export function ProductJsonLd({ product, url }: ProductJsonLdProps) {
  const defaultVariant = pickDefaultVariant(product.variants);

  const price = defaultVariant?.price ?? product.price;
  const sku = defaultVariant?.sku || product.sku || undefined;

  const description =
    product.seo_description ||
    product.short_description ||
    (product.description ? product.description.slice(0, 5000) : undefined) ||
    undefined;

  const images = Array.from(
    new Set(
      [product.thumbnail_url, ...(product.gallery_urls ?? [])].filter(
        (u): u is string => !!u
      )
    )
  );

  const availability = deriveAvailability(product, defaultVariant);

  const ratingCount =
    typeof product.rating_count === "number" ? product.rating_count : 0;
  const ratingValue =
    typeof product.rating_value === "number" ? product.rating_value : null;

  const aggregateRating =
    ratingCount > 0 && ratingValue !== null
      ? {
          "@type": "AggregateRating",
          ratingValue,
          reviewCount:
            typeof product.review_count === "number"
              ? product.review_count
              : ratingCount,
          ratingCount,
        }
      : undefined;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    ...(description ? { description } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(sku ? { sku } : {}),
    brand: {
      "@type": "Brand",
      name: "dangkhuong.com",
    },
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "VND",
      availability,
      url,
    },
    ...(aggregateRating ? { aggregateRating } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default ProductJsonLd;
