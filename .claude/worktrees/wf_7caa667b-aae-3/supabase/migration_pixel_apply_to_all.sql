-- ============================================================
-- Add apply_to_all_pages flag to pixel_configs
-- Cho phép tạo Pixel áp dụng cho TOÀN site (mọi pathname),
-- không cần bind từng landing trong landing_page_pixels.
-- ============================================================

ALTER TABLE public.pixel_configs
  ADD COLUMN IF NOT EXISTS apply_to_all_pages boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pixel_configs_apply_all
  ON public.pixel_configs(apply_to_all_pages)
  WHERE apply_to_all_pages = true AND is_active = true;
