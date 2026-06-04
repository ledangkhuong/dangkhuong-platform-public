-- =====================================================================
-- Migration: 20260607_payment_method_relax.sql
-- Mục đích: Mở rộng CHECK constraint cho cột orders.payment_method
--          để hỗ trợ thêm các phương thức thanh toán mới: 'payos', 'cod'
-- Tuần: Week 6 — Payment integration + Post-payment hooks
-- =====================================================================
-- Nguyên tắc:
--   - Idempotent: chạy lại nhiều lần không gây lỗi
--   - Backward compatible: không ảnh hưởng dữ liệu hiện có
--   - KHÔNG đổi DEFAULT value (vẫn là 'sepay')
--   - KHÔNG migrate / cập nhật bất kỳ row nào hiện có
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Bước 1: DROP CHECK constraint cũ trên orders.payment_method (nếu có)
-- ---------------------------------------------------------------------
-- Constraint cũ chỉ cho phép ('sepay', 'bank_transfer').
-- Tên constraint có thể là 'orders_payment_method_check' (do Postgres auto-gen)
-- hoặc tên custom. Ta quét pg_catalog.pg_constraint để tìm và drop tất cả
-- CHECK constraint đang ràng buộc lên cột payment_method của bảng orders.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_constraint_name text;
    v_table_oid       oid;
    v_column_attnum   int2;
BEGIN
    -- Lấy OID của bảng orders (schema public)
    SELECT c.oid
      INTO v_table_oid
      FROM pg_catalog.pg_class      c
      JOIN pg_catalog.pg_namespace  n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'orders'
       AND c.relkind = 'r';

    IF v_table_oid IS NULL THEN
        RAISE NOTICE 'Bảng public.orders không tồn tại — bỏ qua DROP constraint.';
        RETURN;
    END IF;

    -- Lấy attnum của cột payment_method
    SELECT a.attnum
      INTO v_column_attnum
      FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = v_table_oid
       AND a.attname  = 'payment_method'
       AND a.attnum   > 0
       AND NOT a.attisdropped;

    IF v_column_attnum IS NULL THEN
        RAISE NOTICE 'Cột orders.payment_method không tồn tại — bỏ qua DROP constraint.';
        RETURN;
    END IF;

    -- Tìm tất cả CHECK constraint (contype = 'c') ràng buộc lên cột payment_method
    FOR v_constraint_name IN
        SELECT con.conname
          FROM pg_catalog.pg_constraint con
         WHERE con.conrelid = v_table_oid
           AND con.contype  = 'c'
           AND v_column_attnum = ANY(con.conkey)
    LOOP
        EXECUTE format(
            'ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I',
            v_constraint_name
        );
        RAISE NOTICE 'Đã DROP CHECK constraint: %', v_constraint_name;
    END LOOP;
END
$$;

-- ---------------------------------------------------------------------
-- Bước 2: ADD CHECK constraint mới với danh sách payment_method mở rộng
-- ---------------------------------------------------------------------
-- Các giá trị được phép:
--   - 'sepay'         : Cổng Sepay (bank transfer auto-verify qua webhook)
--   - 'bank_transfer' : Chuyển khoản thủ công (admin confirm)
--   - 'payos'         : Cổng thanh toán PayOS
--   - 'cod'           : Cash on Delivery — thu hộ khi giao hàng (chỉ physical)
-- ---------------------------------------------------------------------
ALTER TABLE public.orders
    ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('sepay', 'bank_transfer', 'payos', 'cod'));

-- ---------------------------------------------------------------------
-- Bước 3: Comment mô tả cho cột (idempotent — COMMENT ON luôn ghi đè)
-- ---------------------------------------------------------------------
COMMENT ON COLUMN public.orders.payment_method IS
    'Phương thức thanh toán. Cho phép: sepay | bank_transfer | payos | cod. Default: sepay.';

COMMIT;

-- =====================================================================
-- Ghi chú:
--   - DEFAULT của cột vẫn giữ nguyên là 'sepay' (không ALTER COLUMN ... SET DEFAULT)
--   - Không có UPDATE nào trên dữ liệu hiện hữu
--   - Order flow course-only (Sepay) hoàn toàn không bị ảnh hưởng
-- =====================================================================
