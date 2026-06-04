-- ============================================================
-- Pixel Configs Migration — Facebook Pixel + CAPI per landing
-- Quản lý nhiều Pixel ID + CAPI token theo từng landing page
-- ============================================================

-- ============================================================
-- 1. BẢNG PIXEL_CONFIGS
-- Mỗi bản ghi = 1 cấu hình Pixel + CAPI gắn vào 1 slug landing.
-- Slug được dùng trong component <PagePixel slug="..." /> để
-- lookup pixel_id (public) và capi_access_token (server-only).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pixel_configs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Định danh
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,

  -- Meta Pixel
  pixel_id text NOT NULL,
  capi_access_token text,
  test_event_code text,

  -- Bật/tắt
  is_active boolean NOT NULL DEFAULT true,

  -- Custom event mapping: cho phép cấu hình các event tuỳ biến theo trang
  -- VD: { "lead_form_submit": { "event_name": "Lead", "value": 0 } }
  custom_events jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Audit
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pixel_configs_slug ON public.pixel_configs(slug);
CREATE INDEX IF NOT EXISTS idx_pixel_configs_active ON public.pixel_configs(is_active) WHERE is_active = true;

-- Constraint: slug chỉ chứa chữ thường, số, gạch ngang
ALTER TABLE public.pixel_configs
  ADD CONSTRAINT pixel_configs_slug_format
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- ============================================================
-- 2. RLS POLICIES
-- Staff (admin/manager/marketing) full quyền.
-- Anon/public KHÔNG truy cập trực tiếp — phải qua API route
-- (server-side dùng service role để fetch token).
-- ============================================================
ALTER TABLE public.pixel_configs ENABLE ROW LEVEL SECURITY;

-- Staff SELECT
CREATE POLICY "pixel_configs_select_staff" ON public.pixel_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'marketing')
    )
  );

-- Staff INSERT
CREATE POLICY "pixel_configs_insert_staff" ON public.pixel_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'marketing')
    )
  );

-- Staff UPDATE
CREATE POLICY "pixel_configs_update_staff" ON public.pixel_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'marketing')
    )
  );

-- Chỉ admin/manager được DELETE
CREATE POLICY "pixel_configs_delete_admin" ON public.pixel_configs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- ============================================================
-- 3. TRIGGER updated_at
-- ============================================================
DROP TRIGGER IF EXISTS set_pixel_configs_updated_at ON public.pixel_configs;
CREATE TRIGGER set_pixel_configs_updated_at
  BEFORE UPDATE ON public.pixel_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 4. BẢNG PIXEL_EVENTS_LOG (optional, dùng debug + audit CAPI)
-- Log tất cả event CAPI đã gửi để dễ debug Match Quality và
-- đối chiếu Pixel-vs-CAPI trong Events Manager.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pixel_events_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  config_id uuid REFERENCES public.pixel_configs(id) ON DELETE CASCADE,
  slug text NOT NULL,
  event_name text NOT NULL,
  event_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('pixel', 'capi', 'both')),
  user_data jsonb DEFAULT '{}'::jsonb,
  custom_data jsonb DEFAULT '{}'::jsonb,
  fb_response jsonb,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pixel_events_log_slug ON public.pixel_events_log(slug);
CREATE INDEX IF NOT EXISTS idx_pixel_events_log_event_id ON public.pixel_events_log(event_id);
CREATE INDEX IF NOT EXISTS idx_pixel_events_log_created_at ON public.pixel_events_log(created_at DESC);

ALTER TABLE public.pixel_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pixel_events_log_select_staff" ON public.pixel_events_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'marketing')
    )
  );

-- INSERT/UPDATE/DELETE chỉ qua service role (server-side) — không cần policy

-- ============================================================
-- 5. SEED dữ liệu mẫu (optional)
-- Xoá block này nếu không muốn seed
-- ============================================================
-- INSERT INTO public.pixel_configs (slug, name, pixel_id, is_active)
-- VALUES ('default', 'Pixel mặc định dangkhuong.com', 'YOUR_PIXEL_ID', true)
-- ON CONFLICT (slug) DO NOTHING;
