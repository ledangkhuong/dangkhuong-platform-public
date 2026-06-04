"use server";

/**
 * Shipment server actions (Week 5 — Shipping GHN integration).
 *
 * Trách nhiệm chính
 * -----------------
 *  - `syncShipmentStatus(shipmentId)` — gọi GHN `getOrderDetail` để pull
 *    trạng thái + log mới nhất của 1 shipment, sau đó:
 *      1) Map trạng thái GHN → enum nội bộ (`shipments.status`).
 *      2) Upsert `shipment_events` cho mỗi log entry chưa có (idempotent
 *         theo `event_code + occurred_at`).
 *      3) Update `shipments.status`, `last_synced_at`, `actual_delivery_date`,
 *         `raw_carrier_response` (snapshot detail GHN trả về).
 *
 * Dùng `createAdminClient()` vì mutation thường chạy từ admin context (route
 * handler kiểm tra role trước; webhook không có user). Tất cả trả về
 * `{ ok, ... }` — không throw lên caller.
 *
 * Tham chiếu schema:
 *   supabase/migrations/20260605_ecommerce_foundation.sql
 *   - shipments.status ∈ {created, picked_up, in_transit, delivered, returned, cancelled}
 *   - shipment_events (shipment_id, event_code, event_description, occurred_at, raw_event)
 */

import { createAdminClient } from "@/lib/supabase/server";
import { ghnClientFromEnv, GHNError } from "@/lib/vendor/ghn/client";
import type { OrderDetail, OrderDetailLog } from "@/lib/vendor/ghn/client";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ShipmentStatus =
  | "created"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "returned"
  | "cancelled";

export interface SyncShipmentResult {
  shipmentId: string;
  carrier: string;
  carrierOrderCode: string;
  status: ShipmentStatus;
  rawStatus: string;
  lastSyncedAt: string;
  actualDeliveryDate: string | null;
  eventsInserted: number;
  totalEvents: number;
}

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

// ---------------------------------------------------------------------------
// GHN status → internal enum mapping.
//
// GHN trả status code theo enum sau (rút gọn — full list tại
//   https://api.ghn.vn/home/docs/detail?id=82):
//   ready_to_pick, picking, picked, money_collect_picking, storing, transporting,
//   sorting, delivering, money_collect_delivering, delivered, delivery_fail,
//   waiting_to_return, return, return_transporting, return_sorting,
//   returning, return_fail, returned, cancel, exception, damage, lost
// ---------------------------------------------------------------------------

const GHN_STATUS_MAP: Record<string, ShipmentStatus> = {
  ready_to_pick: "created",
  picking: "created",
  money_collect_picking: "picked_up",
  picked: "picked_up",
  storing: "in_transit",
  transporting: "in_transit",
  sorting: "in_transit",
  delivering: "in_transit",
  money_collect_delivering: "in_transit",
  delivery_fail: "in_transit",
  waiting_to_return: "in_transit",
  delivered: "delivered",
  return: "returned",
  return_transporting: "returned",
  return_sorting: "returned",
  returning: "returned",
  return_fail: "returned",
  returned: "returned",
  cancel: "cancelled",
  exception: "in_transit",
  damage: "in_transit",
  lost: "cancelled",
};

function mapGhnStatus(raw: string | undefined | null): ShipmentStatus {
  if (!raw) return "created";
  const normalized = raw.toLowerCase().trim();
  return GHN_STATUS_MAP[normalized] ?? "in_transit";
}

// ---------------------------------------------------------------------------
// Public action: syncShipmentStatus
// ---------------------------------------------------------------------------

/**
 * Pull trạng thái mới nhất của một shipment từ carrier (hiện chỉ GHN), ghi
 * vào DB. Idempotent — gọi lại nhiều lần không tạo event trùng.
 *
 * Caller (admin route, webhook, cron) chịu trách nhiệm authz trước khi gọi.
 *
 * @param shipmentId  UUID của `shipments.id`.
 */
export async function syncShipmentStatus(
  shipmentId: string,
): Promise<ActionResult<SyncShipmentResult>> {
  if (!shipmentId) {
    return { ok: false, error: "shipmentId is required" };
  }

  const supabase = await createAdminClient();

  // 1) Load shipment.
  const { data: shipment, error: loadErr } = await supabase
    .from("shipments")
    .select(
      "id, order_id, carrier, carrier_order_code, status, actual_delivery_date",
    )
    .eq("id", shipmentId)
    .maybeSingle();

  if (loadErr) {
    console.error("[syncShipmentStatus] load error:", loadErr.message);
    return { ok: false, error: "Không thể tải thông tin vận đơn." };
  }
  if (!shipment) {
    return { ok: false, error: "Vận đơn không tồn tại.", code: "NOT_FOUND" };
  }
  if (!shipment.carrier_order_code) {
    return {
      ok: false,
      error: "Vận đơn chưa có mã carrier — chưa thể đồng bộ.",
      code: "NO_CARRIER_CODE",
    };
  }

  // Hiện Week 5 chỉ implement GHN. Carrier khác (ghtk, jt, manual) sẽ
  // được handle ở Week 6/7. Manual không có gì để sync.
  if (shipment.carrier !== "ghn") {
    return {
      ok: false,
      error: `Carrier '${shipment.carrier}' chưa được hỗ trợ đồng bộ tự động.`,
      code: "UNSUPPORTED_CARRIER",
    };
  }

  // 2) Call GHN.
  let detail: OrderDetail;
  try {
    const client = ghnClientFromEnv();
    detail = await client.getOrderDetail(shipment.carrier_order_code);
  } catch (err) {
    if (err instanceof GHNError) {
      console.error(
        `[syncShipmentStatus] GHN error code=${err.code} path=${err.path ?? "?"} msg=${err.message}`,
      );
      return {
        ok: false,
        error: `GHN: ${err.message}`,
        code: `GHN_${err.code}`,
      };
    }
    console.error("[syncShipmentStatus] unexpected error:", err);
    return { ok: false, error: "Không thể kết nối GHN. Vui lòng thử lại." };
  }

  // 3) Compute new status + delivery date.
  const newStatus = mapGhnStatus(detail.status);
  const finishDateRaw = detail.finish_date ?? null;
  // GHN trả "0001-01-01T00:00:00Z" khi chưa giao — coi như null.
  const actualDeliveryDate =
    finishDateRaw && !finishDateRaw.startsWith("0001-")
      ? finishDateRaw
      : newStatus === "delivered"
        ? new Date().toISOString()
        : null;

  const nowIso = new Date().toISOString();

  // 4) Update shipments row.
  const { error: updErr } = await supabase
    .from("shipments")
    .update({
      status: newStatus,
      last_synced_at: nowIso,
      actual_delivery_date: actualDeliveryDate,
      raw_carrier_response: detail as unknown as Record<string, unknown>,
      updated_at: nowIso,
    })
    .eq("id", shipmentId);

  if (updErr) {
    console.error("[syncShipmentStatus] update error:", updErr.message);
    return { ok: false, error: "Không thể cập nhật vận đơn." };
  }

  // 5) Upsert events — idempotent theo (shipment_id, event_code, occurred_at).
  const incomingLogs: OrderDetailLog[] = Array.isArray(detail.log)
    ? detail.log
    : [];

  let eventsInserted = 0;
  if (incomingLogs.length > 0) {
    // Load existing events to dedupe.
    const { data: existingEvents } = await supabase
      .from("shipment_events")
      .select("event_code, occurred_at")
      .eq("shipment_id", shipmentId);

    const existingKeys = new Set(
      (existingEvents ?? []).map(
        (e) => `${e.event_code}::${new Date(e.occurred_at).toISOString()}`,
      ),
    );

    const toInsert = incomingLogs
      .filter((log) => log.status && log.updated_date)
      .map((log) => ({
        shipment_id: shipmentId,
        event_code: log.status,
        event_description: null as string | null,
        occurred_at: log.updated_date,
        raw_event: log as unknown as Record<string, unknown>,
      }))
      .filter((row) => {
        try {
          const key = `${row.event_code}::${new Date(row.occurred_at).toISOString()}`;
          return !existingKeys.has(key);
        } catch {
          // Invalid date string → skip.
          return false;
        }
      });

    if (toInsert.length > 0) {
      const { error: evtErr, count } = await supabase
        .from("shipment_events")
        .insert(toInsert, { count: "exact" });

      if (evtErr) {
        // Non-fatal: shipment row đã update; events fail không block sync.
        console.warn(
          "[syncShipmentStatus] event insert error (non-fatal):",
          evtErr.message,
        );
      } else {
        eventsInserted = count ?? toInsert.length;
      }
    }
  }

  return {
    ok: true,
    data: {
      shipmentId,
      carrier: shipment.carrier,
      carrierOrderCode: shipment.carrier_order_code,
      status: newStatus,
      rawStatus: detail.status ?? "",
      lastSyncedAt: nowIso,
      actualDeliveryDate,
      eventsInserted,
      totalEvents: incomingLogs.length,
    },
  };
}
