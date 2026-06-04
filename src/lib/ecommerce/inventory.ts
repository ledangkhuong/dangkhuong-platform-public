/**
 * Inventory helpers — Week 7
 * ===========================
 * Trừ / hoàn / kiểm tra tồn kho cho các order vật lý (physical / mixed).
 *
 * Quy ước
 * -------
 *  - "Tồn kho" sống ở `public.product_variants.stock_count` (integer ≥ 0).
 *  - 1 order_items row = 1 dòng cần trừ:
 *      • variant_id  IS NOT NULL → trừ trên product_variants.stock_count
 *      • variant_id  IS NULL     → KHÔNG trừ (item này là course / product
 *        không có variant — không quản lý tồn kho).
 *  - Hàm CHỈ tác động đến `item_type IN ('physical', 'digital')`. Items
 *    với `item_type='course'` luôn skip.
 *
 * Idempotency
 * -----------
 *  - `orders.inventory_deducted_at` và `inventory_restored_at` (cột thêm ở
 *    migration 20260608) là "lock" mềm. Helper sẽ check trước:
 *      • deductInventory:  inventory_deducted_at IS NOT NULL → skip (đã trừ rồi)
 *      • restoreInventory: inventory_restored_at IS NOT NULL → skip (đã hoàn rồi)
 *                          + inventory_deducted_at IS NULL    → skip (chưa từng trừ)
 *  - Set timestamp atomically TRƯỚC khi update stock (best-effort optimistic
 *    lock). Nếu update stock fail sau khi đã set timestamp → log error và
 *    rollback timestamp; caller có thể retry.
 *
 * Lỗi
 * ----
 *  - Mọi function trả về `InventoryResult` — không throw. Caller (webhook,
 *    server action) tự quyết định block hay best-effort.
 *  - canFulfill trả về danh sách item thiếu để UI hiển thị cụ thể.
 *
 * Sử dụng
 * -------
 *  ```ts
 *  // Sau khi mark order='paid' trong Sepay/PayOS/COD:
 *  const res = await deductInventory(orderId);
 *  if (!res.ok) console.warn("[inventory] deduct failed:", res.error);
 *
 *  // Trước khi admin huỷ đơn:
 *  const check = await canFulfill(orderId);
 *  // ... (UI confirm)
 *  await restoreInventory(orderId);
 *  ```
 */

import { createAdminClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InventoryAdjustment {
  variantId: string;
  productId: string | null;
  delta: number;            // âm khi deduct, dương khi restore
  previousStock: number;
  newStock: number;
}

export interface InventoryShortage {
  variantId: string;
  productId: string | null;
  required: number;
  available: number;
}

export type InventoryResult =
  | {
      ok: true;
      skipped?: "already_deducted" | "already_restored" | "not_deducted" | "no_physical_items";
      adjustments: InventoryAdjustment[];
    }
  | { ok: false; error: string; code?: "NOT_FOUND" | "INSUFFICIENT_STOCK" | "DB_ERROR" };

export type CanFulfillResult =
  | { ok: true; canFulfill: true; shortages: [] }
  | { ok: true; canFulfill: false; shortages: InventoryShortage[] }
  | { ok: false; error: string; code?: "NOT_FOUND" | "DB_ERROR" };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface PhysicalItemRow {
  variant_id: string;
  product_id: string | null;
  quantity: number;
  item_type: string;
}

/**
 * Load các order_items cần adjust tồn kho cho 1 order.
 * Filter:
 *   - item_type IN ('physical', 'digital')
 *   - variant_id IS NOT NULL  (no variant → không quản lý stock)
 */
async function loadAdjustableItems(
  orderId: string,
): Promise<{ items: PhysicalItemRow[]; error: string | null }> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("order_items")
    .select("variant_id, product_id, quantity, item_type")
    .eq("order_id", orderId)
    .in("item_type", ["physical", "digital"])
    .not("variant_id", "is", null);

  if (error) {
    return { items: [], error: error.message };
  }
  return {
    items: (data ?? []).map((r) => ({
      variant_id: (r as { variant_id: string }).variant_id,
      product_id: ((r as { product_id: string | null }).product_id) ?? null,
      quantity: Number((r as { quantity: number }).quantity) || 0,
      item_type: (r as { item_type: string }).item_type,
    })),
    error: null,
  };
}

/**
 * Gom các item cùng variant lại (đề phòng order_items có nhiều dòng cùng
 * variant — Week 4 cộng dồn đã chống chuyện này, nhưng helper vẫn defensive).
 */
function aggregate(items: PhysicalItemRow[]): Map<string, { quantity: number; productId: string | null }> {
  const map = new Map<string, { quantity: number; productId: string | null }>();
  for (const it of items) {
    if (it.quantity <= 0) continue;
    const existing = map.get(it.variant_id);
    if (existing) {
      existing.quantity += it.quantity;
    } else {
      map.set(it.variant_id, { quantity: it.quantity, productId: it.product_id });
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// 1) deductInventory(orderId)
// ---------------------------------------------------------------------------

/**
 * Trừ stock_count cho mỗi variant trong order. Idempotent qua
 * `orders.inventory_deducted_at`.
 *
 * Trả:
 *   - { ok:true, skipped:'already_deducted' } nếu đã trừ trước đó.
 *   - { ok:true, skipped:'no_physical_items', adjustments:[] } nếu order
 *     không có item cần trừ (course-only). Vẫn set timestamp để
 *     idempotency tốt.
 *   - { ok:false, error, code:'INSUFFICIENT_STOCK' } nếu 1 variant không
 *     đủ stock. KHÔNG trừ phần đã thử (best-effort rollback các dòng
 *     đã trừ trước đó trong cùng call).
 *   - { ok:true, adjustments } sau khi trừ thành công.
 *
 * NOTE: Không atomic across rows (Supabase JS không hỗ trợ multi-row CAS
 * dễ dàng). Mỗi variant trừ qua optimistic compare (lt check) — nếu fail,
 * cố gắng restore các dòng đã trừ rồi return error.
 */
export async function deductInventory(orderId: string): Promise<InventoryResult> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };

  const admin = await createAdminClient();

  // 1) Load order + idempotency check.
  const { data: order, error: ordErr } = await admin
    .from("orders")
    .select("id, inventory_deducted_at")
    .eq("id", orderId)
    .maybeSingle<{ id: string; inventory_deducted_at: string | null }>();

  if (ordErr) {
    return { ok: false, error: ordErr.message, code: "DB_ERROR" };
  }
  if (!order) {
    return { ok: false, error: "Order không tồn tại.", code: "NOT_FOUND" };
  }
  if (order.inventory_deducted_at) {
    return { ok: true, skipped: "already_deducted", adjustments: [] };
  }

  // 2) Load order_items.
  const { items, error: itemErr } = await loadAdjustableItems(orderId);
  if (itemErr) {
    return { ok: false, error: itemErr, code: "DB_ERROR" };
  }

  const grouped = aggregate(items);

  // Course-only / no-variant order — mark timestamp + return no-op.
  if (grouped.size === 0) {
    const now = new Date().toISOString();
    await admin
      .from("orders")
      .update({ inventory_deducted_at: now })
      .eq("id", orderId)
      .is("inventory_deducted_at", null);
    return { ok: true, skipped: "no_physical_items", adjustments: [] };
  }

  // 3) Optimistic-lock: set timestamp TRƯỚC khi trừ stock. Nếu timestamp
  // đã được set bởi 1 webhook khác (race) thì skip — không trừ 2 lần.
  const lockTs = new Date().toISOString();
  const { data: locked, error: lockErr } = await admin
    .from("orders")
    .update({ inventory_deducted_at: lockTs })
    .eq("id", orderId)
    .is("inventory_deducted_at", null)
    .select("id")
    .maybeSingle();

  if (lockErr) {
    return { ok: false, error: lockErr.message, code: "DB_ERROR" };
  }
  if (!locked) {
    // Đã có webhook khác lock trước. Coi như đã deduct.
    return { ok: true, skipped: "already_deducted", adjustments: [] };
  }

  // 4) Trừ stock cho từng variant. Optimistic check: chỉ update khi
  //    stock_count >= required.
  const adjustments: InventoryAdjustment[] = [];
  const rollbackQueue: { variantId: string; quantity: number }[] = [];

  for (const [variantId, info] of grouped) {
    // Load stock hiện tại.
    const { data: variant, error: vErr } = await admin
      .from("product_variants")
      .select("id, product_id, stock_count")
      .eq("id", variantId)
      .maybeSingle<{ id: string; product_id: string; stock_count: number }>();

    if (vErr || !variant) {
      // Roll back các adjustments đã làm + clear timestamp.
      await rollback(rollbackQueue, lockTs, orderId);
      return {
        ok: false,
        error: `Không tìm thấy variant ${variantId}` + (vErr ? `: ${vErr.message}` : ""),
        code: "DB_ERROR",
      };
    }

    const previousStock = Number(variant.stock_count) || 0;
    if (previousStock < info.quantity) {
      await rollback(rollbackQueue, lockTs, orderId);
      return {
        ok: false,
        error: `Variant ${variantId} không đủ tồn kho (cần ${info.quantity}, còn ${previousStock}).`,
        code: "INSUFFICIENT_STOCK",
      };
    }

    const newStock = previousStock - info.quantity;
    // Optimistic update: chỉ update nếu stock_count == previousStock.
    const { data: updated, error: uErr } = await admin
      .from("product_variants")
      .update({ stock_count: newStock })
      .eq("id", variantId)
      .eq("stock_count", previousStock)
      .select("id")
      .maybeSingle();

    if (uErr || !updated) {
      // Race / concurrent update. Rollback.
      await rollback(rollbackQueue, lockTs, orderId);
      return {
        ok: false,
        error: `Cập nhật tồn kho variant ${variantId} thất bại (có thể có giao dịch khác đang chạy).`,
        code: "DB_ERROR",
      };
    }

    adjustments.push({
      variantId,
      productId: info.productId ?? variant.product_id ?? null,
      delta: -info.quantity,
      previousStock,
      newStock,
    });
    rollbackQueue.push({ variantId, quantity: info.quantity });
  }

  return { ok: true, adjustments };
}

/**
 * Internal: rollback các stock đã trừ + clear inventory_deducted_at.
 * Best-effort — log nếu fail nhưng không throw.
 */
async function rollback(
  queue: { variantId: string; quantity: number }[],
  lockTs: string,
  orderId: string,
): Promise<void> {
  const admin = await createAdminClient();
  for (const { variantId, quantity } of queue) {
    try {
      // Load current stock + add back (best-effort, không cần CAS vì
      // đây là rollback của chính ta).
      const { data: v } = await admin
        .from("product_variants")
        .select("stock_count")
        .eq("id", variantId)
        .maybeSingle<{ stock_count: number }>();
      if (v) {
        await admin
          .from("product_variants")
          .update({ stock_count: (Number(v.stock_count) || 0) + quantity })
          .eq("id", variantId);
      }
    } catch (err) {
      console.error(
        "[inventory/rollback] failed to restore variant",
        variantId,
        err instanceof Error ? err.message : err,
      );
    }
  }
  // Clear timestamp để caller có thể retry.
  try {
    await admin
      .from("orders")
      .update({ inventory_deducted_at: null })
      .eq("id", orderId)
      .eq("inventory_deducted_at", lockTs);
  } catch (err) {
    console.error(
      "[inventory/rollback] failed to clear timestamp:",
      err instanceof Error ? err.message : err,
    );
  }
}

// ---------------------------------------------------------------------------
// 2) restoreInventory(orderId) — hoàn lại stock khi cancel / refund
// ---------------------------------------------------------------------------

/**
 * Hoàn lại stock_count đã bị trừ bởi deductInventory.
 *
 * Idempotent:
 *   - inventory_restored_at IS NOT NULL  → skip (đã restore rồi)
 *   - inventory_deducted_at IS NULL      → skip (chưa từng trừ → không có
 *     gì để hoàn)
 *
 * Đặt inventory_restored_at TRƯỚC khi update stock — race-safe.
 */
export async function restoreInventory(orderId: string): Promise<InventoryResult> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };

  const admin = await createAdminClient();

  // 1) Load order + idempotency check.
  const { data: order, error: ordErr } = await admin
    .from("orders")
    .select("id, inventory_deducted_at, inventory_restored_at")
    .eq("id", orderId)
    .maybeSingle<{
      id: string;
      inventory_deducted_at: string | null;
      inventory_restored_at: string | null;
    }>();

  if (ordErr) {
    return { ok: false, error: ordErr.message, code: "DB_ERROR" };
  }
  if (!order) {
    return { ok: false, error: "Order không tồn tại.", code: "NOT_FOUND" };
  }
  if (order.inventory_restored_at) {
    return { ok: true, skipped: "already_restored", adjustments: [] };
  }
  if (!order.inventory_deducted_at) {
    // Chưa từng trừ → coi như no-op nhưng vẫn set timestamp để future
    // restore calls bị skip nhanh.
    const now = new Date().toISOString();
    await admin
      .from("orders")
      .update({ inventory_restored_at: now })
      .eq("id", orderId)
      .is("inventory_restored_at", null);
    return { ok: true, skipped: "not_deducted", adjustments: [] };
  }

  // 2) Load items cần hoàn.
  const { items, error: itemErr } = await loadAdjustableItems(orderId);
  if (itemErr) {
    return { ok: false, error: itemErr, code: "DB_ERROR" };
  }
  const grouped = aggregate(items);

  // 3) Lock timestamp.
  const lockTs = new Date().toISOString();
  const { data: locked, error: lockErr } = await admin
    .from("orders")
    .update({ inventory_restored_at: lockTs })
    .eq("id", orderId)
    .is("inventory_restored_at", null)
    .select("id")
    .maybeSingle();

  if (lockErr) {
    return { ok: false, error: lockErr.message, code: "DB_ERROR" };
  }
  if (!locked) {
    return { ok: true, skipped: "already_restored", adjustments: [] };
  }

  // 4) Cộng lại stock cho từng variant.
  const adjustments: InventoryAdjustment[] = [];
  for (const [variantId, info] of grouped) {
    const { data: variant, error: vErr } = await admin
      .from("product_variants")
      .select("id, product_id, stock_count")
      .eq("id", variantId)
      .maybeSingle<{ id: string; product_id: string; stock_count: number }>();

    if (vErr || !variant) {
      // Best-effort: log + continue (không rollback timestamp — admin có
      // thể tra cứu thủ công). Restore không strict như deduct.
      console.error(
        "[inventory/restore] missing variant",
        variantId,
        vErr?.message,
      );
      continue;
    }

    const previousStock = Number(variant.stock_count) || 0;
    const newStock = previousStock + info.quantity;
    const { error: uErr } = await admin
      .from("product_variants")
      .update({ stock_count: newStock })
      .eq("id", variantId);

    if (uErr) {
      console.error(
        "[inventory/restore] update failed for variant",
        variantId,
        uErr.message,
      );
      continue;
    }

    adjustments.push({
      variantId,
      productId: info.productId ?? variant.product_id ?? null,
      delta: info.quantity,
      previousStock,
      newStock,
    });
  }

  return { ok: true, adjustments };
}

// ---------------------------------------------------------------------------
// 3) canFulfill(orderId) — kiểm tra đủ stock trước khi xác nhận đơn
// ---------------------------------------------------------------------------

/**
 * Trả `{ canFulfill: true }` nếu mọi variant trong order đều còn đủ stock,
 * ngược lại trả danh sách shortage để UI hiển thị.
 *
 * Lưu ý:
 *   - Đây là snapshot tại thời điểm gọi — KHÔNG khoá stock. Để đảm bảo
 *     tuyệt đối đủ, dùng deductInventory() (có optimistic CAS).
 *   - Items không có variant_id hoặc item_type='course' đều được coi là
 *     fulfilled (không thuộc phạm vi tồn kho).
 */
export async function canFulfill(orderId: string): Promise<CanFulfillResult> {
  if (!orderId) return { ok: false, error: "orderId rỗng." };

  const admin = await createAdminClient();

  // Verify order tồn tại để phân biệt với "not found".
  const { data: order, error: ordErr } = await admin
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .maybeSingle();
  if (ordErr) {
    return { ok: false, error: ordErr.message, code: "DB_ERROR" };
  }
  if (!order) {
    return { ok: false, error: "Order không tồn tại.", code: "NOT_FOUND" };
  }

  const { items, error: itemErr } = await loadAdjustableItems(orderId);
  if (itemErr) {
    return { ok: false, error: itemErr, code: "DB_ERROR" };
  }
  const grouped = aggregate(items);

  if (grouped.size === 0) {
    return { ok: true, canFulfill: true, shortages: [] };
  }

  const variantIds = [...grouped.keys()];
  const { data: variants, error: vErr } = await admin
    .from("product_variants")
    .select("id, product_id, stock_count")
    .in("id", variantIds);
  if (vErr) {
    return { ok: false, error: vErr.message, code: "DB_ERROR" };
  }

  const stockByVariant = new Map<string, { stock: number; productId: string | null }>();
  for (const v of variants ?? []) {
    const row = v as { id: string; product_id: string | null; stock_count: number };
    stockByVariant.set(row.id, {
      stock: Number(row.stock_count) || 0,
      productId: row.product_id ?? null,
    });
  }

  const shortages: InventoryShortage[] = [];
  for (const [variantId, info] of grouped) {
    const stock = stockByVariant.get(variantId);
    const available = stock?.stock ?? 0;
    if (available < info.quantity) {
      shortages.push({
        variantId,
        productId: info.productId ?? stock?.productId ?? null,
        required: info.quantity,
        available,
      });
    }
  }

  if (shortages.length === 0) {
    return { ok: true, canFulfill: true, shortages: [] };
  }
  return { ok: true, canFulfill: false, shortages };
}
