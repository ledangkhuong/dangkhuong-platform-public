-- ============================================================================
-- WEEK 5 MIGRATION: GHN ADDRESS CACHE
-- File: 20260606_ghn_address_cache.sql
-- Purpose: Cache mapping giữa wardCode nội bộ (vn_wards.code) và
--          (ghn_district_id, ghn_ward_code) của GHN API.
--
-- Why: GHN API vẫn dùng model 3 cấp (province → district → ward), trong khi
-- VN gov 2025 đã bỏ districts → schema mình chỉ còn province + ward.
-- Mỗi request tính phí/tạo đơn cần resolve ward nội bộ sang cặp
-- (district_id, ward_code) của GHN. Gọi GHN master-data 3 lần (province,
-- district, ward) cho MỖI request là quá tốn — cache vào table này.
--
-- Strategy: key chính là `ward_code` (vn_wards.code). Mỗi entry chứa
-- ghn_district_id (int) + ghn_ward_code (text), province_code để debug,
-- mapped_at để TTL/refresh nếu sau này admin redraw boundaries.
-- Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ghn_address_cache (
  -- Khoá chính = wardCode của schema mình. Mỗi ward nội bộ chỉ map đến
  -- đúng 1 cặp (district, ward) bên GHN nên 1:1 là đủ.
  ward_code         text PRIMARY KEY
    REFERENCES public.vn_wards(code) ON DELETE CASCADE,

  -- Lưu lại province_code để admin debug nhanh + filter theo tỉnh.
  -- Không bắt buộc nullable vì map function luôn biết tỉnh khi resolve.
  province_code     text NOT NULL
    REFERENCES public.vn_provinces(code) ON DELETE CASCADE,

  -- Output của mapping. district_id là int (GHN dùng integer ID),
  -- ward_code là string (GHN trả về text vd "1A0807").
  ghn_district_id   integer NOT NULL,
  ghn_ward_code     text    NOT NULL,

  -- Lưu lại tên GHN trả về để verify sau này (audit, debug fuzzy mismatch).
  ghn_province_name text,
  ghn_district_name text,
  ghn_ward_name     text,

  -- Timestamps. mapped_at dùng để invalidate nếu cần (vd. GHN cập nhật
  -- master-data, fuzzy match sai → admin xoá row → lần sau re-map).
  mapped_at         timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Index phụ: query theo province để admin xem coverage mapping từng tỉnh.
CREATE INDEX IF NOT EXISTS idx_ghn_address_cache_province
  ON public.ghn_address_cache(province_code);

-- Trigger: tự update updated_at khi sửa row.
DROP TRIGGER IF EXISTS trg_ghn_address_cache_updated_at
  ON public.ghn_address_cache;
CREATE TRIGGER trg_ghn_address_cache_updated_at
  BEFORE UPDATE ON public.ghn_address_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RLS: cache là server-side only, không expose ra client.
-- ============================================================================

ALTER TABLE public.ghn_address_cache ENABLE ROW LEVEL SECURITY;

-- Drop policies cũ (nếu re-run) trước khi tạo lại.
DROP POLICY IF EXISTS "ghn_address_cache_admin_read"
  ON public.ghn_address_cache;
DROP POLICY IF EXISTS "ghn_address_cache_admin_write"
  ON public.ghn_address_cache;

-- Admin có thể đọc để debug/audit mapping coverage qua dashboard.
CREATE POLICY "ghn_address_cache_admin_read"
  ON public.ghn_address_cache
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- Admin có thể tay xoá row sai để force re-map.
CREATE POLICY "ghn_address_cache_admin_write"
  ON public.ghn_address_cache
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Insert/Update từ server-side mapper dùng SERVICE_ROLE_KEY → bypass RLS,
-- không cần thêm policy cho anon/authenticated thường.

COMMENT ON TABLE public.ghn_address_cache IS
  'Cache mapping vn_wards.code → (ghn_district_id, ghn_ward_code). Server-only, populated lazily bởi src/lib/vendor/ghn/address-mapper.ts.';
