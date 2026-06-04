/**
 * E-commerce TypeScript types for Week 1 schema.
 *
 * Field naming follows the database (snake_case) so values returned by
 * Supabase can be consumed directly without remapping.
 */

// ---------------------------------------------------------------------------
// Enums / literal union types
// ---------------------------------------------------------------------------

export type ProductType = "book" | "merch" | "digital";

export type ProductStatus = "draft" | "active" | "archived";

export type OrderType = "course" | "physical" | "mixed";

export type ShippingStatus =
  | "pending"
  | "ready_to_ship"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "returned"
  | "failed"
  | "cancelled";

export type CartStatus = "active" | "ordered" | "abandoned" | "expired";

export type OrderItemType = "course" | "product" | "variant";

// ---------------------------------------------------------------------------
// Shared value objects
// ---------------------------------------------------------------------------

export interface DimensionsCm {
  length?: number;
  width?: number;
  height?: number;
}

/**
 * Snapshot of a product/variant at the moment it was added to cart or
 * checked out. Persisted as JSONB so downstream history is immutable.
 */
export interface ProductSnapshot {
  product_id: string;
  product_name: string;
  product_slug?: string | null;
  variant_id?: string | null;
  variant_name?: string | null;
  sku?: string | null;
  thumbnail_url?: string | null;
  unit_price: number;
  compare_at_price?: number | null;
  weight_grams?: number | null;
  attributes?: Record<string, string> | null;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  thumbnail_url: string | null;
  position: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  cost: number | null;
  product_type: ProductType;
  status: ProductStatus;
  thumbnail_url: string | null;
  gallery_urls: string[];
  weight_grams: number | null;
  dimensions_cm: DimensionsCm | null;
  tags: string[];
  category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  focus_keyword: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number | null;
  compare_at_price: number | null;
  stock_count: number;
  low_stock_threshold: number | null;
  weight_grams: number | null;
  barcode: string | null;
  position: number;
  attributes: Record<string, string> | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export interface Cart {
  id: string;
  user_id: string | null;
  cart_token: string;
  currency: string;
  subtotal: number;
  status: CartStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  product_snapshot: ProductSnapshot;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Orders / shipping
// ---------------------------------------------------------------------------

/**
 * Mirrors the `ALTER orders` columns added in Week 1. The base `Order`
 * type lives elsewhere; consumers should intersect with this when they
 * need shipping context.
 */
export interface ShippingInfo {
  order_type: OrderType;
  shipping_full_name: string | null;
  shipping_phone: string | null;
  shipping_address_line: string | null;
  shipping_ward_code: string | null;
  shipping_province_code: string | null;
  shipping_notes: string | null;
  shipping_fee: number | null;
  shipping_carrier: string | null;
  shipping_status: ShippingStatus | null;
  weight_grams_total: number | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  course_id: string | null;
  item_type: OrderItemType;
  name: string;
  unit_price: number;
  quantity: number;
  product_snapshot: ProductSnapshot | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  carrier: string;
  carrier_order_code: string | null;
  tracking_url: string | null;
  status: ShippingStatus;
  shipping_fee: number | null;
  weight_grams: number | null;
  pickup_at: string | null;
  delivered_at: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  status: ShippingStatus | string;
  description: string | null;
  location: string | null;
  occurred_at: string;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Vietnam address master data
// ---------------------------------------------------------------------------

export interface VnProvince {
  code: string;
  name: string;
}

export interface VnWard {
  code: string;
  name: string;
  province_code: string;
}

// ---------------------------------------------------------------------------
// Derived / composed types
// ---------------------------------------------------------------------------

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface ProductWithCategory extends Product {
  category: ProductCategory | null;
}

export interface ProductFull extends Product {
  category: ProductCategory | null;
  variants: ProductVariant[];
}

export interface CartItemWithProduct extends CartItem {
  product: Product | null;
  variant: ProductVariant | null;
}

export interface CartWithItems extends Cart {
  items: CartItemWithProduct[];
}

export interface ShipmentWithEvents extends Shipment {
  events: ShipmentEvent[];
}

export interface OrderItemWithProduct extends OrderItem {
  product: Product | null;
  variant: ProductVariant | null;
}
