/**
 * Server-side query helpers cho module Admin Order Management (Week 7).
 *
 * File này phục vụ các trang `/admin/orders/physical` (list + detail) và
 * widget dashboard. Tất cả truy vấn dùng `createAdminClient()` (service role,
 * bypass RLS) vì context là admin/staff đã được kiểm tra ở layer page bằng
 * `requireStaff()` / `requireAdminOrManager()`.
 *
 * Quy tắc chung:
 * - KHÔNG export ra client component (sử dụng trong Server Component / Server
 *   Action / Route Handler).
 * - Mọi hàm `async`; throw `Error` có prefix `[ecommerce/order-queries]` khi
 *   gặp lỗi DB để dễ grep log.
 * - Field naming theo DB (snake_case) để consume thẳng từ Supabase response.
 * - Filter `order_type IN ('physical', 'mixed')` được áp dụng cho mọi query
 *   list/stat — đơn course-only không thuộc phạm vi shipping admin.
 */

import { createAdminClient } from "@/lib/supabase/server";
import type {
  OrderItem,
  OrderType,
  Shipment,
  ShipmentEvent,
  ShippingInfo,
  ShippingStatus,
} from "@/types/ecommerce";

// ---------------------------------------------------------------------------
// Base Order type augmentation
// ---------------------------------------------------------------------------

/**
 * Order row đầy đủ cho admin physical order management.
 *
 * Type base trong `@/types/index.ts` chỉ chứa các cột legacy
 * (`user_id`, `product_id`, `amount`, ...). Để admin UI có đủ context, ta
 * augment với:
 * - các cột Week 1 (shipping_*, order_type, weight_grams_total) từ `ShippingInfo`
 * - các cột customer + payment + assignment có thật trong bảng `orders`
 */
export interface AdminOrder extends ShippingInfo {
  id: string;
  order_code: string;
  user_id: string | null;
  amount: number;
  status: "pending" | "paid" | "cancelled" | "refunded" | string;
  payment_method: "sepay" | "payos" | "cod" | "bank_transfer" | string | null;
  payment_status: string | null;
  /** Họ tên khách (snapshot lúc checkout, có thể khác `shipping_full_name`). */
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  /** Ghi chú đơn (chung), khác `shipping_notes` chỉ dành cho carrier. */
  note: string | null;
  /** Sale rep được phân công xử lý (Week 6+ sticky-assign). */
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Order kèm items + danh sách shipments — dùng cho list view. */
export interface AdminOrderListRow extends AdminOrder {
  items: OrderItem[];
  shipments: Shipment[];
}

/** Order kèm full chi tiết — dùng cho detail page. */
export interface AdminOrderDetail extends AdminOrder {
  items: OrderItem[];
  shipments: ShipmentWithEvents[];
  /** Địa chỉ giao hàng đã format hiển thị (1 dòng, fallback rỗng). */
  shipping_address_display: string;
}

/** Shipment kèm sự kiện (timeline) sắp xếp theo thời gian giảm dần. */
export interface ShipmentWithEvents extends Shipment {
  events: ShipmentEvent[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Chuẩn hoá lỗi Supabase thành Error có thông điệp rõ ràng. */
function toError(scope: string, error: unknown): Error {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return new Error(`[ecommerce/order-queries:${scope}] ${msg}`);
}

/**
 * Cột cần SELECT cho `orders` ở mọi query — giữ thống nhất shape.
 * Có thể có cột chưa tồn tại tuỳ migration (ví dụ `payment_status`,
 * `assigned_to`); Supabase sẽ throw nếu chọn cột không tồn tại, nhưng theo
 * spec Week 1+6 thì các cột này đã có.
 */
const ORDER_SELECT_COLUMNS = [
  "id",
  "order_code",
  "user_id",
  "amount",
  "status",
  "payment_method",
  "payment_status",
  "customer_name",
  "customer_email",
  "customer_phone",
  "note",
  "assigned_to",
  "order_type",
  "shipping_full_name",
  "shipping_phone",
  "shipping_address_line",
  "shipping_ward_code",
  "shipping_province_code",
  "shipping_notes",
  "shipping_fee",
  "shipping_carrier",
  "shipping_status",
  "weight_grams_total",
  "created_at",
  "updated_at",
].join(", ");

/** Cờ bật trace SQL khi cần debug (chỉ log khi env DEBUG_ORDER_QUERIES=1). */
const DEBUG = process.env.DEBUG_ORDER_QUERIES === "1";

/** Escape ký tự đặc biệt của PostgREST `or()` (tránh phá cú pháp). */
function escapeOrTerm(s: string): string {
  return s.replace(/[%,()]/g, "");
}

/** Build chuỗi địa chỉ giao hàng hiển thị 1 dòng (fallback an toàn). */
function buildShippingAddressDisplay(o: ShippingInfo): string {
  const parts = [
    o.shipping_address_line,
    o.shipping_ward_code, // FE có thể map sang tên ward bằng vn_wards
    o.shipping_province_code,
  ]
    .map((p) => (p ?? "").toString().trim())
    .filter(Boolean);
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// 1) getPhysicalOrders — list + filter + pagination
// ---------------------------------------------------------------------------

export interface GetPhysicalOrdersFilters {
  /** Lọc theo trạng thái đơn (pending/paid/cancelled/refunded). */
  status?: string;
  /** Lọc theo phương thức thanh toán (sepay/payos/cod/bank_transfer). */
  paymentMethod?: string;
  /** Lọc theo hãng vận chuyển (vd: 'ghn', 'manual'). */
  carrier?: string;
  /** ISO date string — lọc `created_at >= dateFrom`. */
  dateFrom?: string;
  /** ISO date string — lọc `created_at <= dateTo`. */
  dateTo?: string;
  /**
   * Tìm kiếm: match `order_code`, `customer_email`, `customer_phone`,
   * `shipping_phone`, `shipping_full_name` (ILIKE %term%).
   */
  search?: string;
  /** Số bản ghi tối đa (default 20, max 100). */
  limit?: number;
  /** Offset phân trang (default 0). */
  offset?: number;
}

export interface GetPhysicalOrdersResult {
  orders: AdminOrderListRow[];
  totalCount: number;
}

/**
 * Lấy danh sách đơn hàng vật lý (`order_type IN ('physical', 'mixed')`) kèm
 * items + shipments cho admin DataTable.
 *
 * - Sort mặc định `created_at DESC` (mới nhất lên đầu).
 * - `totalCount` đếm theo cùng filter để render pagination.
 * - Trả về items tối thiểu (không join product) để payload gọn; nếu cần
 *   product detail, gọi `getOrderDetail` cho từng đơn.
 */
export async function getPhysicalOrders(
  filters: GetPhysicalOrdersFilters = {},
): Promise<GetPhysicalOrdersResult> {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const supabase = await createAdminClient();

  const listSelect = `${ORDER_SELECT_COLUMNS}, items:order_items(*), shipments:shipments(*)`;

  let query = supabase
    .from("orders")
    .select(listSelect, { count: "exact" })
    .in("order_type", ["physical", "mixed"] satisfies OrderType[])
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.paymentMethod) {
    query = query.eq("payment_method", filters.paymentMethod);
  }
  if (filters.carrier) {
    query = query.eq("shipping_carrier", filters.carrier);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }
  if (filters.search && filters.search.trim()) {
    const term = escapeOrTerm(filters.search.trim());
    const pattern = `%${term}%`;
    query = query.or(
      [
        `order_code.ilike.${pattern}`,
        `customer_email.ilike.${pattern}`,
        `customer_phone.ilike.${pattern}`,
        `shipping_phone.ilike.${pattern}`,
        `shipping_full_name.ilike.${pattern}`,
      ].join(","),
    );
  }

  const { data, error, count } = await query;

  if (error) {
    if (DEBUG) console.error("[order-queries] getPhysicalOrders raw error", error);
    console.error("[ecommerce/order-queries] getPhysicalOrders failed", {
      filters,
      error,
    });
    throw toError("getPhysicalOrders", error);
  }

  const rows = (data ?? []) as unknown as Array<
    AdminOrder & {
      items: OrderItem[] | null;
      shipments: Shipment[] | null;
    }
  >;

  return {
    orders: rows.map((r) => ({
      ...r,
      items: r.items ?? [],
      shipments: r.shipments ?? [],
    })),
    totalCount: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 2) getOrderDetail — chi tiết 1 đơn
// ---------------------------------------------------------------------------

/**
 * Lấy chi tiết 1 đơn theo `orderId` cho trang admin detail.
 *
 * Bao gồm:
 *  - order_items (sort theo `created_at ASC`)
 *  - shipments + shipment_events (events sort theo `occurred_at DESC`)
 *  - shipping_address_display (1 dòng để hiển thị nhanh)
 *
 * Trả về `null` nếu không tìm thấy. KHÔNG filter theo `order_type` ở đây vì
 * detail page có thể được mở từ link trực tiếp; nếu cần restrict, caller tự
 * kiểm tra.
 */
export async function getOrderDetail(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  if (!orderId || typeof orderId !== "string") return null;

  const supabase = await createAdminClient();

  const detailSelect = `${ORDER_SELECT_COLUMNS}, items:order_items(*), shipments:shipments(*, events:shipment_events(*))`;

  const { data, error } = await supabase
    .from("orders")
    .select(detailSelect)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("[ecommerce/order-queries] getOrderDetail failed", {
      orderId,
      error,
    });
    throw toError("getOrderDetail", error);
  }
  if (!data) return null;

  const row = data as unknown as AdminOrder & {
    items: OrderItem[] | null;
    shipments:
      | Array<Shipment & { events: ShipmentEvent[] | null }>
      | null;
  };

  // Sort items theo created_at ASC để timeline ổn định.
  const items = (row.items ?? [])
    .slice()
    .sort((a, b) =>
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
    );

  // Sort shipments theo created_at ASC; events trong từng shipment theo
  // occurred_at DESC (mới nhất lên đầu — phù hợp timeline UI).
  const shipments: ShipmentWithEvents[] = (row.shipments ?? [])
    .slice()
    .sort((a, b) =>
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
    )
    .map((s) => ({
      ...s,
      events: (s.events ?? [])
        .slice()
        .sort((a, b) =>
          (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""),
        ),
    }));

  return {
    ...row,
    items,
    shipments,
    shipping_address_display: buildShippingAddressDisplay(row),
  };
}

// ---------------------------------------------------------------------------
// 3) getOrderByCode — tra cứu theo order_code
// ---------------------------------------------------------------------------

/**
 * Tra cứu nhanh 1 đơn theo `order_code` (vd: `DH2026060400001`).
 *
 * - Match exact (case-sensitive) — order_code đã được normalize uppercase
 *   lúc generate.
 * - Trả về `null` nếu không tìm thấy.
 * - Trả về cùng shape `AdminOrderDetail` để tiện reuse component detail.
 */
export async function getOrderByCode(
  orderCode: string,
): Promise<AdminOrderDetail | null> {
  if (!orderCode || typeof orderCode !== "string") return null;

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("order_code", orderCode.trim())
    .maybeSingle();

  if (error) {
    console.error("[ecommerce/order-queries] getOrderByCode failed", {
      orderCode,
      error,
    });
    throw toError("getOrderByCode", error);
  }
  if (!data) return null;

  return getOrderDetail((data as { id: string }).id);
}

// ---------------------------------------------------------------------------
// 4) getOrderStats — số liệu nhanh cho dashboard widget
// ---------------------------------------------------------------------------

export interface OrderStats {
  /** Đơn pending payment (status='pending'), trong scope physical/mixed. */
  pendingPayment: number;
  /** Đã thanh toán nhưng chưa giao cho carrier (shipping_status='pending' hoặc 'ready_to_ship'). */
  paidAwaitingShip: number;
  /** Đang giao trên đường (picked_up/in_transit/out_for_delivery). */
  inTransit: number;
  /** Đơn delivered trong ngày hôm nay (theo giờ server). */
  deliveredToday: number;
}

/**
 * Lấy số liệu nhanh cho widget dashboard admin.
 *
 * Tất cả counter đều scope `order_type IN ('physical','mixed')` để consistent
 * với màn list. Dùng `head: true, count: 'exact'` để chỉ lấy con số, không
 * load row data.
 *
 * `deliveredToday` dựa trên `shipping_status='delivered'` + `updated_at` ≥ đầu
 * ngày hôm nay (giờ server). Nếu cần chính xác theo timezone Asia/Ho_Chi_Minh,
 * convert ở caller.
 */
export async function getOrderStats(): Promise<OrderStats> {
  const supabase = await createAdminClient();
  const physicalScope: OrderType[] = ["physical", "mixed"];

  const startOfTodayIso = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  })();

  // Chạy song song để giảm latency tổng.
  const [pendingRes, awaitingShipRes, inTransitRes, deliveredRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("order_type", physicalScope)
        .eq("status", "pending"),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("order_type", physicalScope)
        .eq("status", "paid")
        .in("shipping_status", ["pending", "ready_to_ship"] satisfies ShippingStatus[]),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("order_type", physicalScope)
        .in("shipping_status", [
          "picked_up",
          "in_transit",
          "out_for_delivery",
        ] satisfies ShippingStatus[]),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("order_type", physicalScope)
        .eq("shipping_status", "delivered" satisfies ShippingStatus)
        .gte("updated_at", startOfTodayIso),
    ]);

  for (const [scope, res] of [
    ["pendingPayment", pendingRes],
    ["paidAwaitingShip", awaitingShipRes],
    ["inTransit", inTransitRes],
    ["deliveredToday", deliveredRes],
  ] as const) {
    if (res.error) {
      console.error("[ecommerce/order-queries] getOrderStats failed", {
        scope,
        error: res.error,
      });
      throw toError(`getOrderStats:${scope}`, res.error);
    }
  }

  return {
    pendingPayment: pendingRes.count ?? 0,
    paidAwaitingShip: awaitingShipRes.count ?? 0,
    inTransit: inTransitRes.count ?? 0,
    deliveredToday: deliveredRes.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 5) searchOrders — fuzzy search ở thanh tìm kiếm tổng (command palette)
// ---------------------------------------------------------------------------

/**
 * Tìm kiếm nhanh đơn hàng theo `order_code` / `customer_email` /
 * `customer_phone` / `shipping_phone`. Dùng cho command palette hoặc
 * autocomplete header.
 *
 * - Giới hạn 20 kết quả, sort `created_at DESC`.
 * - KHÔNG join items/shipments để response nhẹ.
 * - Filter `order_type IN ('physical','mixed')` để khớp scope module.
 */
export async function searchOrders(
  query: string,
): Promise<AdminOrder[]> {
  if (!query || !query.trim()) return [];

  const term = escapeOrTerm(query.trim());
  if (!term) return [];

  const pattern = `%${term}%`;
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT_COLUMNS)
    .in("order_type", ["physical", "mixed"] satisfies OrderType[])
    .or(
      [
        `order_code.ilike.${pattern}`,
        `customer_email.ilike.${pattern}`,
        `customer_phone.ilike.${pattern}`,
        `shipping_phone.ilike.${pattern}`,
        `shipping_full_name.ilike.${pattern}`,
      ].join(","),
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[ecommerce/order-queries] searchOrders failed", {
      query,
      error,
    });
    throw toError("searchOrders", error);
  }

  return (data ?? []) as unknown as AdminOrder[];
}
