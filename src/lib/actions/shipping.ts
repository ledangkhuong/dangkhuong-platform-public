"use server";

/**
 * Shipping server actions (Week 5 — GHN integration).
 *
 * Public surface
 * --------------
 *  - calculateShippingFee  — preview phí GHN cho 1 (province, ward, weight,
 *    items). Dùng ở bước 2 Checkout để thay thế flat-rate placeholder
 *    Week 4. Best-effort: nếu GHN fail → caller fallback flat-rate.
 *  - createShipment        — gọi sau khi đơn đã pay (Week 6) hoặc admin
 *    bấm "Tạo vận đơn" (Week 7). Tạo order ở GHN, insert row vào
 *    `shipments`, log event 'created', update `orders.shipping_*`.
 *  - syncShipmentStatus    — admin/cron poll GHN /detail → update status
 *    + insert event mới nếu status thay đổi.
 *  - cancelGHNShipment     — huỷ vận đơn ở GHN + update local state.
 *
 * Nguyên tắc:
 *  - Mọi action trả `{ ok, ... }`; không throw lên caller.
 *  - Dùng `createAdminClient()` để bypass RLS — shipping logic chạy server
 *    side, cần đọc/ghi orders + shipments mà user thường không có quyền.
 *  - Mọi địa chỉ nội bộ (province_code + ward_code) phải đi qua
 *    `mapToGHNAddress()` để có (district_id, ward_code) GHN yêu cầu.
 *  - GHN trả {code, message, data}; code !== 200 = lỗi → wrapped trong
 *    GHNError ở client/raw client. Ta catch ở đây và biến thành
 *    `{ ok: false, error }`.
 *  - Default package: 15×10×5 cm (sách paperback) — override được qua input.
 *  - Default weight tối thiểu: 200g (GHN reject < 50g; chọn 200g cho an toàn).
 */

import {
  GHNError,
  ghnClientFromEnv,
  type FeeInputItem,
  type GHNService,
  type OrderInputItem,
} from "@/lib/vendor/ghn/client";
import { mapToGHNAddress } from "@/lib/vendor/ghn/address-mapper";
import { createAdminClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Constants & defaults
// ---------------------------------------------------------------------------

/** Sách paperback mặc định: 15×10×5 cm. */
const DEFAULT_DIMENSIONS_CM = { length: 15, width: 10, height: 5 } as const;

/** Trọng lượng tối thiểu GHN chấp nhận an toàn (gram). */
const MIN_WEIGHT_GRAMS = 200;

/** Trọng lượng mặc định 1 sản phẩm nếu DB không có (gram). */
const DEFAULT_ITEM_WEIGHT_GRAMS = 300;

/** Required note mặc định khi tạo đơn — "cho thử hàng không cho thu" an toàn nhất với sách. */
const DEFAULT_REQUIRED_NOTE = "KHONGCHOXEMHANG" as const;

/** Tracking URL pattern — GHN tra cứu public bằng order_code. */
const GHN_TRACKING_URL = (orderCode: string) =>
  `https://tracking.ghn.dev/?order_code=${encodeURIComponent(orderCode)}`;

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export interface ShippingFeeItemDim {
  length: number;
  width: number;
  height: number;
  /** Trọng lượng từng item (gram). Optional — nếu thiếu, dùng default. */
  weight?: number;
  quantity?: number;
}

export interface CalculateShippingFeeInput {
  provinceCode: string;
  wardCode: string;
  /** Tổng trọng lượng đơn (gram). Sẽ được clamp lên MIN_WEIGHT_GRAMS. */
  weightGrams: number;
  /** Optional dimensions for each line — dùng để chọn dimension max. */
  items?: ShippingFeeItemDim[];
}

export interface ShippingFeeServiceOption {
  serviceId: number;
  serviceTypeId: number;
  name: string;
  /** Phí của service này (VND). null nếu calc lỗi cho service đó. */
  fee: number | null;
}

export type CalculateShippingFeeResult =
  | {
      ok: true;
      /** Phí của service mặc định (đã chọn). */
      fee: number;
      /** Service nào được dùng để tính fee (default GHN_DEFAULT_SERVICE_TYPE_ID). */
      selectedServiceId: number | null;
      /** Danh sách services khả dụng + phí từng service (cho selector UI). */
      services: ShippingFeeServiceOption[];
    }
  | { ok: false; error: string };

export type CreateShipmentResult =
  | { ok: true; shipmentId: string; trackingUrl: string; carrierOrderCode: string }
  | { ok: false; error: string };

export type SyncShipmentStatusResult =
  | { ok: true; status: string; changed: boolean }
  | { ok: false; error: string };

export type CancelGHNShipmentResult =
  | { ok: true }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

type AdminSupabase = Awaited<ReturnType<typeof createAdminClient>>;

/**
 * Map shipping_status (orders.shipping_status) ↔ shipments.status.
 * Order CHECK constraints khác nhau: orders cho phép 'pending'/'transit',
 * shipments dùng 'created'/'in_transit'. Hàm này dịch shipments → orders.
 */
function mapShipmentStatusToOrderStatus(shipmentStatus: string): string | null {
  switch (shipmentStatus) {
    case "created":
      return "confirmed";
    case "picked_up":
      return "picked_up";
    case "in_transit":
      return "transit";
    case "delivered":
      return "delivered";
    case "returned":
      return "returned";
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

/**
 * Convert GHN log status (vd "ready_to_pick", "picking", "delivering",
 * "delivered", "return", "cancel"...) sang shipments.status enum cục bộ.
 *
 * Reference: https://api.ghn.vn/home/docs/detail?id=88
 */
function normalizeGHNStatus(ghnStatus: string | undefined | null): string {
  const s = (ghnStatus ?? "").toLowerCase();
  if (!s) return "created";

  if (
    s === "ready_to_pick" ||
    s === "picking" ||
    s === "money_collect_picking" ||
    s === "picked"
  ) {
    return s === "picked" ? "picked_up" : "created";
  }
  if (
    s === "storing" ||
    s === "transporting" ||
    s === "sorting" ||
    s === "delivering" ||
    s === "money_collect_delivering"
  ) {
    return "in_transit";
  }
  if (s === "delivered") return "delivered";
  if (s.startsWith("return") || s === "returned") return "returned";
  if (s === "cancel" || s === "canceled" || s === "cancelled") return "cancelled";

  // Fallback an toàn — coi như đang transit.
  return "in_transit";
}

/**
 * Chuẩn hoá weight: clamp lên min, đảm bảo integer dương.
 */
function clampWeight(grams: number): number {
  const n = Math.round(Number(grams) || 0);
  if (n < MIN_WEIGHT_GRAMS) return MIN_WEIGHT_GRAMS;
  return n;
}

/**
 * Chọn dimension lớn nhất từ items (mỗi chiều lấy max), fallback default.
 * GHN tính phí theo trọng lượng quy đổi: (L×W×H)/5000. Dùng max thay vì
 * sum cho gần đúng kích thước bao bì thực.
 */
function pickPackageDimensions(items: ShippingFeeItemDim[] | undefined): {
  length: number;
  width: number;
  height: number;
} {
  if (!items || items.length === 0) return { ...DEFAULT_DIMENSIONS_CM };
  let length = 0;
  let width = 0;
  let height = 0;
  for (const it of items) {
    if (Number.isFinite(it.length) && it.length > length) length = it.length;
    if (Number.isFinite(it.width) && it.width > width) width = it.width;
    if (Number.isFinite(it.height) && it.height > height) height = it.height;
  }
  return {
    length: length > 0 ? Math.round(length) : DEFAULT_DIMENSIONS_CM.length,
    width: width > 0 ? Math.round(width) : DEFAULT_DIMENSIONS_CM.width,
    height: height > 0 ? Math.round(height) : DEFAULT_DIMENSIONS_CM.height,
  };
}

/**
 * Đọc warehouse origin từ env (mỗi action cần). Tách hàm riêng để
 * `calculateShippingFee` có thể fallback gracefully khi env chưa set
 * (vd dev local quên config) thay vì crash UI.
 */
function readWarehouseOrigin():
  | { ok: true; districtId: number; wardCode: string; serviceTypeId: number }
  | { ok: false; error: string } {
  const districtRaw = process.env.GHN_FROM_DISTRICT_ID;
  const wardCode = process.env.GHN_FROM_WARD_CODE;
  const serviceRaw = process.env.GHN_DEFAULT_SERVICE_TYPE_ID;

  if (!districtRaw || !wardCode) {
    return {
      ok: false,
      error:
        "Thiếu cấu hình warehouse GHN (GHN_FROM_DISTRICT_ID / GHN_FROM_WARD_CODE).",
    };
  }
  const districtId = Number.parseInt(districtRaw, 10);
  if (!Number.isFinite(districtId)) {
    return { ok: false, error: "GHN_FROM_DISTRICT_ID không phải số." };
  }
  const serviceTypeId = serviceRaw ? Number.parseInt(serviceRaw, 10) : 5;
  return {
    ok: true,
    districtId,
    wardCode,
    serviceTypeId: Number.isFinite(serviceTypeId) ? serviceTypeId : 5,
  };
}

// ---------------------------------------------------------------------------
// 1) calculateShippingFee
// ---------------------------------------------------------------------------

/**
 * Tính phí ship GHN cho địa chỉ + tổng weight cho trước.
 *
 * Flow:
 *  1. Map nội bộ → GHN (province → district → ward) qua mapToGHNAddress.
 *     Cache hit thì siêu nhanh; miss thì gọi GHN master-data ~2-3 round trip.
 *  2. Đọc warehouse origin từ env. Thiếu env → trả error (caller fallback).
 *  3. Pick dimension: max của items, fallback 15×10×5 (sách).
 *  4. Clamp weight ≥ MIN_WEIGHT_GRAMS.
 *  5. Gọi GHN /available-services để lấy list service khả dụng.
 *  6. Loop tính phí từng service (parallel) → trả về { fee, services }.
 *     "fee" mặc định là service có serviceTypeId khớp env default (5 = standard).
 *
 * Không throw. Lỗi GHN → `{ ok: false, error }` để Checkout step 2 fallback
 * sang flat-rate placeholder Week 4.
 */
export async function calculateShippingFee(
  input: CalculateShippingFeeInput,
): Promise<CalculateShippingFeeResult> {
  try {
    const { provinceCode, wardCode } = input;
    if (!provinceCode || !wardCode) {
      return { ok: false, error: "Thiếu province/ward code." };
    }

    // 1) Map sang GHN address.
    const mapping = await mapToGHNAddress({ provinceCode, wardCode });
    if (!mapping) {
      return {
        ok: false,
        error: "Không tìm được district/ward GHN tương ứng với địa chỉ.",
      };
    }

    // 2) Warehouse origin.
    const origin = readWarehouseOrigin();
    if (!origin.ok) return origin;

    // 3) Dimensions + weight.
    const dims = pickPackageDimensions(input.items);
    const weight = clampWeight(input.weightGrams);

    const client = ghnClientFromEnv();

    // 5) Available services.
    let services: GHNService[] = [];
    try {
      services = await client.getServices({
        from_district: origin.districtId,
        to_district: mapping.ghnDistrictId,
      });
    } catch (err) {
      const msg =
        err instanceof GHNError
          ? `GHN getServices: ${err.message}`
          : err instanceof Error
            ? err.message
            : "GHN getServices failed";
      return { ok: false, error: msg };
    }

    if (services.length === 0) {
      return {
        ok: false,
        error: "GHN không có service khả dụng cho tuyến đường này.",
      };
    }

    // 6) Tính phí cho từng service song song.
    const feeItems: FeeInputItem[] | undefined = input.items?.map((it) => ({
      name: "Item",
      quantity: it.quantity ?? 1,
      length: Math.round(it.length) || DEFAULT_DIMENSIONS_CM.length,
      width: Math.round(it.width) || DEFAULT_DIMENSIONS_CM.width,
      height: Math.round(it.height) || DEFAULT_DIMENSIONS_CM.height,
      weight: it.weight ?? DEFAULT_ITEM_WEIGHT_GRAMS,
    }));

    const feeResults = await Promise.all(
      services.map(async (svc): Promise<ShippingFeeServiceOption> => {
        try {
          const fee = await client.calculateFee({
            from_district_id: origin.districtId,
            from_ward_code: origin.wardCode,
            to_district_id: mapping.ghnDistrictId,
            to_ward_code: mapping.ghnWardCode,
            service_id: svc.service_id,
            service_type_id: svc.service_type_id,
            weight,
            length: dims.length,
            width: dims.width,
            height: dims.height,
            items: feeItems,
          });
          return {
            serviceId: svc.service_id,
            serviceTypeId: svc.service_type_id,
            name: svc.short_name,
            fee: Number(fee.total) || 0,
          };
        } catch (err) {
          // Một số service GHN trả lỗi (vd không support tuyến / weight quá nặng)
          // → giữ trong list với fee = null thay vì fail cả batch.
          console.warn(
            "[shipping/calculateShippingFee] service fee failed",
            svc.service_id,
            err instanceof Error ? err.message : err,
          );
          return {
            serviceId: svc.service_id,
            serviceTypeId: svc.service_type_id,
            name: svc.short_name,
            fee: null,
          };
        }
      }),
    );

    // Pick default fee: ưu tiên service_type_id khớp env, sau đó service rẻ nhất.
    const valid = feeResults.filter(
      (s): s is ShippingFeeServiceOption & { fee: number } => s.fee !== null,
    );
    if (valid.length === 0) {
      return { ok: false, error: "GHN trả lỗi cho tất cả services." };
    }

    const preferred =
      valid.find((s) => s.serviceTypeId === origin.serviceTypeId) ??
      valid.reduce((min, cur) => (cur.fee < min.fee ? cur : min), valid[0]);

    return {
      ok: true,
      fee: preferred.fee,
      selectedServiceId: preferred.serviceId,
      services: feeResults,
    };
  } catch (err) {
    const msg =
      err instanceof GHNError
        ? `GHN error ${err.code}: ${err.message}`
        : err instanceof Error
          ? err.message
          : "Unknown error";
    console.error("[shipping/calculateShippingFee]", err);
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 2) createShipment
// ---------------------------------------------------------------------------

/**
 * Tạo vận đơn GHN cho 1 order đã có shipping_* fields.
 *
 * Flow:
 *  1. Load order + items + province/ward names.
 *  2. Idempotency check — nếu order đã có shipment GHN active → trả lại.
 *  3. Map địa chỉ sang GHN (district_id + ward_code).
 *  4. Build OrderInput (recipient + items + dimensions + weight).
 *  5. Gọi client.createOrder → nhận order_code.
 *  6. Transactional best-effort: insert shipments + shipment_event 'created'
 *     + update orders.shipping_status='confirmed', shipping_carrier='ghn'.
 */
export async function createShipment(
  orderId: string,
): Promise<CreateShipmentResult> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };

  try {
    const supabase = await createAdminClient();

    // 1) Load order.
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        [
          "id",
          "order_code",
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
          "total_amount",
        ].join(","),
      )
      .eq("id", orderId)
      .maybeSingle<{
        id: string;
        order_code: string;
        shipping_full_name: string | null;
        shipping_phone: string | null;
        shipping_address_line: string | null;
        shipping_ward_code: string | null;
        shipping_province_code: string | null;
        shipping_notes: string | null;
        shipping_fee: number | null;
        shipping_carrier: string | null;
        shipping_status: string | null;
        weight_grams_total: number | null;
        total_amount: number | null;
      }>();

    if (orderErr) {
      console.error("[shipping/createShipment] load order error", orderErr);
      return { ok: false, error: "Lỗi đọc đơn hàng." };
    }
    if (!order) return { ok: false, error: "Không tìm thấy đơn hàng." };

    if (
      !order.shipping_full_name ||
      !order.shipping_phone ||
      !order.shipping_address_line ||
      !order.shipping_ward_code ||
      !order.shipping_province_code
    ) {
      return { ok: false, error: "Đơn thiếu thông tin giao hàng." };
    }

    // 2) Idempotency.
    const { data: existing } = await supabase
      .from("shipments")
      .select("id, carrier_order_code, tracking_url, status")
      .eq("order_id", orderId)
      .eq("carrier", "ghn")
      .not("carrier_order_code", "is", null)
      .neq("status", "cancelled")
      .limit(1)
      .maybeSingle<{
        id: string;
        carrier_order_code: string;
        tracking_url: string | null;
        status: string;
      }>();
    if (existing) {
      return {
        ok: true,
        shipmentId: existing.id,
        trackingUrl:
          existing.tracking_url ?? GHN_TRACKING_URL(existing.carrier_order_code),
        carrierOrderCode: existing.carrier_order_code,
      };
    }

    // Load items.
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("id, name, quantity, unit_price, weight_grams, item_type, product_snapshot")
      .eq("order_id", orderId);
    if (itemsErr) {
      console.error("[shipping/createShipment] load items error", itemsErr);
      return { ok: false, error: "Lỗi đọc order_items." };
    }
    // Chỉ ship item vật lý.
    const physicalItems = (items ?? []).filter(
      (it) => (it.item_type ?? "physical") === "physical",
    );
    if (physicalItems.length === 0) {
      return { ok: false, error: "Đơn không có sản phẩm vật lý cần giao." };
    }

    // Load province + ward names cho GHN order create.
    const [{ data: province }, { data: ward }] = await Promise.all([
      supabase
        .from("vn_provinces")
        .select("name")
        .eq("code", order.shipping_province_code)
        .maybeSingle<{ name: string }>(),
      supabase
        .from("vn_wards")
        .select("name")
        .eq("code", order.shipping_ward_code)
        .maybeSingle<{ name: string }>(),
    ]);

    // 3) Map address.
    const mapping = await mapToGHNAddress({
      provinceCode: order.shipping_province_code,
      wardCode: order.shipping_ward_code,
    });
    if (!mapping) {
      return {
        ok: false,
        error: "Không map được địa chỉ giao hàng sang GHN.",
      };
    }

    const origin = readWarehouseOrigin();
    if (!origin.ok) return origin;

    // 4) Build items + tổng weight.
    const ghnItems: OrderInputItem[] = physicalItems.map((it) => {
      const snap = (it.product_snapshot ?? {}) as Record<string, unknown>;
      const dims = (snap.dimensions_cm ?? {}) as Record<string, number>;
      const length = Math.round(Number(dims.length) || DEFAULT_DIMENSIONS_CM.length);
      const width = Math.round(Number(dims.width) || DEFAULT_DIMENSIONS_CM.width);
      const height = Math.round(Number(dims.height) || DEFAULT_DIMENSIONS_CM.height);
      const weight = Math.max(
        Math.round(Number(it.weight_grams) || DEFAULT_ITEM_WEIGHT_GRAMS),
        1,
      );
      return {
        name: it.name,
        code: (snap.sku as string | undefined) ?? undefined,
        quantity: Number(it.quantity) || 1,
        price: Math.round(Number(it.unit_price) || 0),
        length,
        width,
        height,
        weight,
      };
    });

    const totalWeight = clampWeight(
      Number(order.weight_grams_total) ||
        ghnItems.reduce((s, it) => s + it.weight * it.quantity, 0),
    );

    // Package dims = max của tất cả items.
    const pkgDims = pickPackageDimensions(
      ghnItems.map((it) => ({
        length: it.length ?? DEFAULT_DIMENSIONS_CM.length,
        width: it.width ?? DEFAULT_DIMENSIONS_CM.width,
        height: it.height ?? DEFAULT_DIMENSIONS_CM.height,
      })),
    );

    // 5) Gọi GHN.
    const client = ghnClientFromEnv();
    let ghnResult;
    try {
      ghnResult = await client.createOrder({
        payment_type_id: 1, // shop trả phí ship (đã thu của khách qua checkout).
        required_note: DEFAULT_REQUIRED_NOTE,
        client_order_code: order.order_code || order.id,
        to_name: order.shipping_full_name,
        to_phone: order.shipping_phone,
        to_address: order.shipping_address_line,
        to_ward_name: ward?.name,
        to_ward_code: mapping.ghnWardCode,
        to_district_name: mapping.ghnDistrictName,
        to_district_id: mapping.ghnDistrictId,
        to_province_name: province?.name ?? mapping.ghnProvinceName,
        content: physicalItems
          .map((it) => `${it.name} x${it.quantity}`)
          .join(", ")
          .slice(0, 200),
        weight: totalWeight,
        length: pkgDims.length,
        width: pkgDims.width,
        height: pkgDims.height,
        service_type_id: origin.serviceTypeId,
        note: order.shipping_notes ?? undefined,
        items: ghnItems,
      });
    } catch (err) {
      const msg =
        err instanceof GHNError
          ? `GHN createOrder ${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : "GHN createOrder failed";
      console.error("[shipping/createShipment] GHN error", err);
      return { ok: false, error: msg };
    }

    const carrierOrderCode = ghnResult.order_code;
    const trackingUrl = GHN_TRACKING_URL(carrierOrderCode);

    // 6) Persist.
    const { data: inserted, error: insErr } = await supabase
      .from("shipments")
      .insert({
        order_id: orderId,
        carrier: "ghn",
        carrier_order_code: carrierOrderCode,
        tracking_url: trackingUrl,
        shipping_fee: Number(ghnResult.total_fee) || Number(order.shipping_fee) || 0,
        weight_grams: totalWeight,
        service_type_code: String(origin.serviceTypeId),
        expected_delivery_date: ghnResult.expected_delivery_time ?? null,
        status: "created",
        last_synced_at: new Date().toISOString(),
        raw_carrier_response: ghnResult as unknown as Record<string, unknown>,
      })
      .select("id")
      .single<{ id: string }>();

    if (insErr || !inserted) {
      console.error(
        "[shipping/createShipment] insert shipment failed",
        insErr,
      );
      // GHN đã tạo đơn thật rồi → cố gắng huỷ best-effort để tránh leak.
      try {
        await client.cancelOrder([carrierOrderCode]);
      } catch (cancelErr) {
        console.error(
          "[shipping/createShipment] rollback cancel failed",
          cancelErr,
        );
      }
      return { ok: false, error: "Lỗi lưu shipment vào DB." };
    }

    // Log event đầu tiên.
    await supabase.from("shipment_events").insert({
      shipment_id: inserted.id,
      event_code: "created",
      event_description: "Đã tạo vận đơn GHN",
      occurred_at: new Date().toISOString(),
      raw_event: ghnResult as unknown as Record<string, unknown>,
    });

    // Update orders.
    await supabase
      .from("orders")
      .update({
        shipping_carrier: "ghn",
        shipping_status: "confirmed",
      })
      .eq("id", orderId);

    return {
      ok: true,
      shipmentId: inserted.id,
      trackingUrl,
      carrierOrderCode,
    };
  } catch (err) {
    console.error("[shipping/createShipment]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 3) syncShipmentStatus
// ---------------------------------------------------------------------------

/**
 * Poll GHN /shipping-order/detail cho 1 shipment, update status nội bộ +
 * log event nếu status mới khác status cũ.
 *
 * Dùng cho:
 *  - Admin bấm "Đồng bộ" trong dashboard.
 *  - Cron sync hàng giờ cho shipments chưa terminal (delivered/cancelled/returned).
 */
export async function syncShipmentStatus(
  shipmentId: string,
): Promise<SyncShipmentStatusResult> {
  if (!shipmentId) return { ok: false, error: "shipmentId rỗng." };

  try {
    const supabase = await createAdminClient();

    const { data: shipment, error: loadErr } = await supabase
      .from("shipments")
      .select("id, order_id, carrier, carrier_order_code, status")
      .eq("id", shipmentId)
      .maybeSingle<{
        id: string;
        order_id: string;
        carrier: string;
        carrier_order_code: string | null;
        status: string;
      }>();

    if (loadErr) {
      console.error("[shipping/syncShipmentStatus] load failed", loadErr);
      return { ok: false, error: "Lỗi đọc shipment." };
    }
    if (!shipment) return { ok: false, error: "Không tìm thấy shipment." };
    if (shipment.carrier !== "ghn") {
      return { ok: false, error: "Shipment không phải GHN." };
    }
    if (!shipment.carrier_order_code) {
      return { ok: false, error: "Shipment chưa có carrier_order_code." };
    }

    const client = ghnClientFromEnv();
    let detail;
    try {
      detail = await client.getOrderDetail(shipment.carrier_order_code);
    } catch (err) {
      const msg =
        err instanceof GHNError
          ? `GHN detail ${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : "GHN getOrderDetail failed";
      return { ok: false, error: msg };
    }

    const newStatus = normalizeGHNStatus(detail.status);
    const changed = newStatus !== shipment.status;

    const updates: Record<string, unknown> = {
      status: newStatus,
      last_synced_at: new Date().toISOString(),
      raw_carrier_response: detail as unknown as Record<string, unknown>,
    };
    if (newStatus === "delivered" && detail.finish_date) {
      updates.actual_delivery_date = detail.finish_date;
    }

    await supabase.from("shipments").update(updates).eq("id", shipmentId);

    if (changed) {
      await supabase.from("shipment_events").insert({
        shipment_id: shipmentId,
        event_code: newStatus,
        event_description: `GHN status: ${detail.status ?? "unknown"}`,
        occurred_at: new Date().toISOString(),
        raw_event: detail as unknown as Record<string, unknown>,
      });

      const orderStatus = mapShipmentStatusToOrderStatus(newStatus);
      if (orderStatus) {
        await supabase
          .from("orders")
          .update({ shipping_status: orderStatus })
          .eq("id", shipment.order_id);
      }
    }

    return { ok: true, status: newStatus, changed };
  } catch (err) {
    console.error("[shipping/syncShipmentStatus]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 4) cancelGHNShipment
// ---------------------------------------------------------------------------

/**
 * Huỷ vận đơn GHN + update DB.
 *
 * GHN chỉ cho huỷ khi shipment chưa được pickup (status: ready_to_pick).
 * Nếu GHN từ chối → trả error, không touch DB.
 */
export async function cancelGHNShipment(
  shipmentId: string,
): Promise<CancelGHNShipmentResult> {
  if (!shipmentId) return { ok: false, error: "shipmentId rỗng." };

  try {
    const supabase = await createAdminClient();

    const { data: shipment, error: loadErr } = await supabase
      .from("shipments")
      .select("id, order_id, carrier, carrier_order_code, status")
      .eq("id", shipmentId)
      .maybeSingle<{
        id: string;
        order_id: string;
        carrier: string;
        carrier_order_code: string | null;
        status: string;
      }>();

    if (loadErr) {
      console.error("[shipping/cancelGHNShipment] load failed", loadErr);
      return { ok: false, error: "Lỗi đọc shipment." };
    }
    if (!shipment) return { ok: false, error: "Không tìm thấy shipment." };
    if (shipment.carrier !== "ghn") {
      return { ok: false, error: "Shipment không phải GHN." };
    }
    if (!shipment.carrier_order_code) {
      return { ok: false, error: "Shipment chưa có carrier_order_code." };
    }
    if (shipment.status === "cancelled") {
      return { ok: true };
    }
    if (shipment.status === "delivered") {
      return { ok: false, error: "Không thể huỷ đơn đã giao." };
    }

    const client = ghnClientFromEnv();
    try {
      const results = await client.cancelOrder([shipment.carrier_order_code]);
      const r = results.find(
        (x) => x.order_code === shipment.carrier_order_code,
      );
      if (!r || r.result !== true) {
        return {
          ok: false,
          error: r?.message ?? "GHN từ chối huỷ vận đơn.",
        };
      }
    } catch (err) {
      const msg =
        err instanceof GHNError
          ? `GHN cancel ${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : "GHN cancelOrder failed";
      return { ok: false, error: msg };
    }

    await supabase
      .from("shipments")
      .update({
        status: "cancelled",
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", shipmentId);

    await supabase.from("shipment_events").insert({
      shipment_id: shipmentId,
      event_code: "cancelled",
      event_description: "Đã huỷ vận đơn GHN",
      occurred_at: new Date().toISOString(),
    });

    await supabase
      .from("orders")
      .update({ shipping_status: "cancelled" })
      .eq("id", shipment.order_id);

    return { ok: true };
  } catch (err) {
    console.error("[shipping/cancelGHNShipment]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
