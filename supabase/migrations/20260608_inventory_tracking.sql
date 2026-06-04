-- =====================================================================
-- Migration: 20260608_inventory_tracking.sql
-- Mục đích: Bổ sung 2 timestamp tracking columns trên orders cho việc
--           tự động trừ / hoàn lại tồn kho (product_variants.stock_count).
-- Tuần:     Week 7 — Admin order management physical
-- =====================================================================
-- Nguyên tắc:
--   - Idempotent: ADD COLUMN IF NOT EXISTS — chạy lại nhiều lần OK.
--   - Backward compatible: không đổi DEFAULT, không UPDATE dữ liệu hiện có.
--   - Không ảnh hưởng course-only orders (orders không physical sẽ không
--     bao giờ được helper deductInventory() đụng tới).
--
-- Semantics:
--   - inventory_deducted_at  : thời điểm helper deductInventory() đã trừ
--                              stock_count thành công cho đơn này. NULL =
--                              chưa trừ. Helper IDEMPOTENT: nếu cột !=NULL
--                              thì skip ngay (không trừ lần 2).
--   - inventory_restored_at  : thời điểm helper restoreInventory() đã
--                              hoàn lại stock (khi cancel/refund). NULL =
--                              chưa hoàn. Idempotent tương tự.
--
-- Tương tác:
--   - Sepay webhook + PayOS success + cod-order.confirmCODOrder gọi
--     deductInventory() sau khi mark order='paid'.
--   - Admin Cancel/Refund action gọi restoreInventory() trước khi đổi
--     status — chỉ hoàn nếu inventory_deducted_at IS NOT NULL.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Thêm 2 cột tracking lên orders (idempotent)
-- ---------------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS inventory_deducted_at  timestamptz;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS inventory_restored_at  timestamptz;

COMMENT ON COLUMN public.orders.inventory_deducted_at IS
    'Thời điểm helper deductInventory() đã trừ stock cho đơn này. NULL = chưa trừ. Dùng để đảm bảo idempotency khi webhook retry.';

COMMENT ON COLUMN public.orders.inventory_restored_at IS
    'Thời điểm helper restoreInventory() đã hoàn lại stock (sau cancel/refund). NULL = chưa hoàn.';

-- ---------------------------------------------------------------------
-- 2) Partial index trên inventory_deducted_at (cho query orders cần deduct)
-- ---------------------------------------------------------------------
-- Mục đích: tìm nhanh các orders đã 'paid' nhưng chưa được trừ tồn
--          (inventory_deducted_at IS NULL). Có thể dùng cho:
--            - Admin backfill script khi cần
--            - Cron health-check (alert nếu có quá nhiều dòng tồn đọng)
-- Partial index: chỉ index rows chưa deduct → rất nhỏ trong điều kiện
-- bình thường (background job sẽ deduct ngay).
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS orders_inventory_pending_deduct_idx
    ON public.orders (status, paid_at)
    WHERE inventory_deducted_at IS NULL;

-- Index thứ 2: tra cứu nhanh các order đã deduct theo thời gian (cho
-- report tồn kho theo ngày, audit, …).
CREATE INDEX IF NOT EXISTS orders_inventory_deducted_at_idx
    ON public.orders (inventory_deducted_at)
    WHERE inventory_deducted_at IS NOT NULL;

COMMIT;

-- =====================================================================
-- Ghi chú:
--   - Không cần migrate dữ liệu cũ: course-only orders không có physical
--     items → deductInventory() sẽ no-op và set inventory_deducted_at.
--   - Nếu cần backfill cho physical orders đã 'paid' trước migration này:
--     chạy script Node gọi deductInventory(orderId) lần lượt — helper
--     idempotent nên an toàn.
-- =====================================================================
