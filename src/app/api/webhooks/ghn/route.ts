import "server-only";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GHN (Giao Hàng Nhanh) status update webhook.
 *
 *   POST /api/webhooks/ghn
 *
 * GHN posts JSON whenever a shipment's status changes. Configure the URL in
 * the GHN dashboard and set GHN_WEBHOOK_SECRET to the value GHN should send
 * back to us so we can authenticate the call.
 *
 * Verification accepts either:
 *   - Header `x-ghn-signature: <secret>`  (preferred — opaque shared secret)
 *   - Header `Authorization: Bearer <secret>`
 *
 * We **always** respond with HTTP 200 once the request has been accepted —
 * even if the shipment cannot be located in our DB — to stop GHN from
 * retrying indefinitely. Auth failure and rate-limit responses are the only
 * non-2xx codes we return. Hard internal errors are logged but still 200,
 * matching the SePay webhook convention used elsewhere in this codebase.
 *
 * Payload (GHN docs — fields may vary by event, we treat all as optional):
 * {
 *   "OrderCode":         "GZJWXX9F",
 *   "ShopID":            12345,
 *   "Status":            "delivered",            // GHN status code
 *   "StatusName":        "Đã giao hàng",         // VN description
 *   "Description":       "Giao thành công",
 *   "Time":              "2026-06-04T10:11:12+07:00",
 *   "UpdatedDate":       "...",
 *   "Fee":               { ... },
 *   "Reason":            "...",
 *   "ReasonCode":        "...",
 *   "Weight":            500,
 *   "COD":               0,
 *   "Type":              "...",
 *   ...
 * }
 *
 * NOTE: GHN uses **PascalCase** keys in webhook payloads. We accept both
 * PascalCase and snake_case to be defensive.
 */

// ─── Status mapping ─────────────────────────────────────────────────────────
//
// Maps GHN's lifecycle codes to our `shipments.status` enum:
//   created | picked_up | in_transit | delivered | returned | cancelled
//
// Anything unknown maps to `in_transit` (safest neutral state — keeps the
// shipment alive without falsely claiming delivery / cancellation).

type OurStatus =
  | "created"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "returned"
  | "cancelled";

const GHN_STATUS_MAP: Record<string, OurStatus> = {
  // Pre-pickup
  ready_to_pick: "created",
  picking: "created",
  money_collect_picking: "created",

  // Picked up
  picked: "picked_up",
  storing: "picked_up",

  // In transit
  transporting: "in_transit",
  sorting: "in_transit",
  delivering: "in_transit",
  money_collect_delivering: "in_transit",
  delivery_fail: "in_transit",
  waiting_to_return: "in_transit",
  exception: "in_transit",
  damage: "in_transit",
  lost: "in_transit",

  // Delivered
  delivered: "delivered",

  // Returned
  return: "returned",
  return_transporting: "returned",
  return_sorting: "returned",
  returning: "returned",
  return_fail: "returned",
  returned: "returned",

  // Cancelled
  cancel: "cancelled",
  cancelled: "cancelled",
};

/**
 * GHN → orders.shipping_status mapping. Note the orders enum is broader
 * (`pending | confirmed | picked_up | transit | delivered | returned |
 * cancelled`) — we only ever set it to a terminal-ish state on delivery.
 */
function mapOrderShippingStatus(s: OurStatus): string | null {
  switch (s) {
    case "delivered":
      return "delivered";
    case "returned":
      return "returned";
    case "cancelled":
      return "cancelled";
    case "picked_up":
      return "picked_up";
    case "in_transit":
      return "transit";
    case "created":
      return "confirmed";
    default:
      return null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pick<T = unknown>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function verifySecret(req: NextRequest): { ok: boolean; reason?: string } {
  const expected = process.env.GHN_WEBHOOK_SECRET || "";
  if (!expected || expected.includes("your-") || expected === "change-me") {
    return { ok: false, reason: "GHN_WEBHOOK_SECRET not configured" };
  }

  const sigHeader = (req.headers.get("x-ghn-signature") || "").trim();
  if (sigHeader && constantTimeEqual(sigHeader, expected)) {
    return { ok: true };
  }

  const authHeader = (req.headers.get("authorization") || "").trim();
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (constantTimeEqual(token, expected)) return { ok: true };
  }

  return { ok: false, reason: "Signature mismatch" };
}

function parseGhnTime(raw: unknown): string {
  if (!raw || typeof raw !== "string") return new Date().toISOString();
  // GHN sometimes emits local Vietnam time without a TZ suffix
  // (e.g. "2026-06-04 10:11:12"). Treat those as +07:00.
  try {
    const hasTz = /(?:Z|[+-]\d{2}:?\d{2})\s*$/.test(raw);
    const normalised = raw.replace(" ", "T");
    const candidate = hasTz ? normalised : `${normalised}+07:00`;
    const d = new Date(candidate);
    if (Number.isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1) Rate limit — 1000 requests/hour/IP. We don't want GHN itself blocked,
  //    so the limit is generous; it's mostly a defence against accidental
  //    floods from a misconfigured proxy.
  const ip = getClientIp(req);
  try {
    const rl = await rateLimit(`ghn-webhook:${ip}`, 1000, 3600);
    if (!rl.allowed) {
      console.warn(`[GHN Webhook] Rate limited ip=${ip} retryAfter=${rl.retryAfterSec}s`);
      return NextResponse.json(
        { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      );
    }
  } catch (rlErr) {
    // Don't let rate-limit infra failures take down the webhook.
    console.error("[GHN Webhook] Rate limit check failed (non-fatal):", rlErr);
  }

  // 2) Verify shared secret
  const auth = verifySecret(req);
  if (!auth.ok) {
    console.warn(`[GHN Webhook] Unauthorized ip=${ip} reason=${auth.reason}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3) Parse body — accept any JSON shape, fall back to text logging.
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch (parseErr) {
    console.error("[GHN Webhook] Invalid JSON:", parseErr);
    // 200 so GHN doesn't retry malformed payloads forever.
    return NextResponse.json({ success: true, message: "Invalid JSON ignored" });
  }

  const orderCode = pick<string>(payload, "OrderCode", "order_code", "OrderCODE");
  const ghnStatusRaw = pick<string>(payload, "Status", "status");
  const statusDescription =
    pick<string>(payload, "StatusName", "status_name", "Description", "description") ||
    pick<string>(payload, "StatusDescription", "status_description") ||
    "";
  const updatedAtRaw = pick<string>(
    payload,
    "UpdatedDate",
    "updated_date",
    "UpdatedAt",
    "updated_at",
    "Time",
    "time",
  );

  if (!orderCode || typeof orderCode !== "string") {
    console.warn("[GHN Webhook] Payload missing OrderCode:", JSON.stringify(payload).slice(0, 500));
    return NextResponse.json({ success: true, message: "Missing OrderCode ignored" });
  }

  const ghnStatus = (ghnStatusRaw || "").toString().trim().toLowerCase();
  const mappedStatus: OurStatus = GHN_STATUS_MAP[ghnStatus] ?? "in_transit";
  const occurredAt = parseGhnTime(updatedAtRaw);

  console.log(
    `[GHN Webhook] ${orderCode} | ghn=${ghnStatus || "(blank)"} → ours=${mappedStatus} | ${statusDescription}`,
  );

  try {
    const supabase = await createAdminClient();

    // 4) Find shipment by carrier_order_code
    const { data: shipment, error: shipErr } = await supabase
      .from("shipments")
      .select("id, order_id, status, carrier")
      .eq("carrier", "ghn")
      .eq("carrier_order_code", orderCode)
      .maybeSingle();

    if (shipErr) {
      console.error("[GHN Webhook] Lookup error:", shipErr);
      // Still 200 — GHN should not retry on our DB hiccups; we log + move on.
      return NextResponse.json({ success: true, message: "Lookup error logged" });
    }

    if (!shipment) {
      console.warn(
        `[GHN Webhook] Shipment not found for OrderCode=${orderCode}. ` +
          `Accepting payload to prevent retry storm.`,
      );
      return NextResponse.json({ success: true, message: "Shipment not found" });
    }

    // 5) Update shipment status + sync timestamp + raw response
    const shipmentUpdate: Record<string, unknown> = {
      status: mappedStatus,
      last_synced_at: new Date().toISOString(),
      raw_carrier_response: payload,
      updated_at: new Date().toISOString(),
    };

    // Only stamp actual_delivery_date once, on first delivery transition.
    if (mappedStatus === "delivered") {
      shipmentUpdate.actual_delivery_date = occurredAt;
    }

    const { error: updateErr } = await supabase
      .from("shipments")
      .update(shipmentUpdate)
      .eq("id", shipment.id);

    if (updateErr) {
      console.error(`[GHN Webhook] Shipment update failed id=${shipment.id}:`, updateErr);
      // Continue — try to log the event regardless.
    }

    // 6) Insert shipment_event row with raw payload
    const { error: eventErr } = await supabase.from("shipment_events").insert({
      shipment_id: shipment.id,
      event_code: ghnStatus || "unknown",
      event_description: statusDescription || null,
      occurred_at: occurredAt,
      raw_event: payload,
    });

    if (eventErr) {
      console.error(`[GHN Webhook] Event insert failed shipment=${shipment.id}:`, eventErr);
      // Non-fatal.
    }

    // 7) Mirror terminal states onto the order row
    const orderShippingStatus = mapOrderShippingStatus(mappedStatus);
    if (orderShippingStatus && shipment.order_id) {
      const orderUpdate: Record<string, unknown> = {
        shipping_status: orderShippingStatus,
        updated_at: new Date().toISOString(),
      };
      // Note: orders table doesn't have actual_delivery_date column —
      // that lives on shipments (stamped above). If the column gets added
      // later, mirror it here on the `delivered` branch.

      const { error: orderErr } = await supabase
        .from("orders")
        .update(orderUpdate)
        .eq("id", shipment.order_id);

      if (orderErr) {
        console.error(
          `[GHN Webhook] Order update failed order=${shipment.order_id}:`,
          orderErr,
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[GHN Webhook] Unhandled error:", err);
    // Always 200 — see top-of-file rationale.
    return NextResponse.json({ success: true, message: "Logged" });
  }
}

// Disable static optimisation: this route is always dynamic.
export const dynamic = "force-dynamic";
