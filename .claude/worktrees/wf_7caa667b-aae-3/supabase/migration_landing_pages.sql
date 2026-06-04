-- ============================================================
-- Landing Pages Migration — Marketing tự gắn Pixel/CAPI
-- Cho phép marketing team định nghĩa landing page theo pathname,
-- sau đó attach 1..N pixel_configs vào từng landing — KHÔNG đụng code.
-- ============================================================

-- ============================================================
-- 1. BẢNG LANDING_PAGES
-- Mỗi record = 1 trang trên dangkhuong.com mà marketing muốn track.
-- Pathname là khoá unique (VD: "/weballinone", "/slowenglish").
-- ============================================================
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,

  pathname text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,

  is_active boolean NOT NULL DEFAULT true,

  -- Audit
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_pathname ON public.landing_pages(pathname);
CREATE INDEX IF NOT EXISTS idx_landing_pages_active ON public.landing_pages(is_active) WHERE is_active = true;

-- Constraint: pathname phải bắt đầu bằng /
ALTER TABLE public.landing_pages
  ADD CONSTRAINT landing_pages_pathname_format
  CHECK (pathname ~ '^/[a-zA-Z0-9/_\.\-]*$');

-- ============================================================
-- 2. BẢNG LANDING_PAGE_PIXELS (m-n)
-- 1 landing có thể attach nhiều pixel (split test, multi-account).
-- 1 pixel có thể dùng cho nhiều landing.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.landing_page_pixels (
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  pixel_config_id uuid NOT NULL REFERENCES public.pixel_configs(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (landing_page_id, pixel_config_id)
);

CREATE INDEX IF NOT EXISTS idx_landing_page_pixels_landing ON public.landing_page_pixels(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_pixels_pixel ON public.landing_page_pixels(pixel_config_id);

-- ============================================================
-- 3. RLS POLICIES — Staff (admin/manager/marketing)
-- ============================================================
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_pixels ENABLE ROW LEVEL SECURITY;

-- landing_pages: staff full quyền
CREATE POLICY "landing_pages_select_staff" ON public.landing_pages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'marketing'))
  );

CREATE POLICY "landing_pages_insert_staff" ON public.landing_pages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'marketing'))
  );

CREATE POLICY "landing_pages_update_staff" ON public.landing_pages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'marketing'))
  );

CREATE POLICY "landing_pages_delete_admin" ON public.landing_pages
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager'))
  );

-- landing_page_pixels: tương tự
CREATE POLICY "landing_page_pixels_select_staff" ON public.landing_page_pixels
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'marketing'))
  );

CREATE POLICY "landing_page_pixels_insert_staff" ON public.landing_page_pixels
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'marketing'))
  );

CREATE POLICY "landing_page_pixels_delete_staff" ON public.landing_page_pixels
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'marketing'))
  );

-- ============================================================
-- 4. TRIGGER updated_at
-- ============================================================
DROP TRIGGER IF EXISTS set_landing_pages_updated_at ON public.landing_pages;
CREATE TRIGGER set_landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 5. SEED — Các landing hiện có trên dangkhuong.com
-- Marketing có thể vào admin xoá/sửa sau nếu muốn.
-- ============================================================
INSERT INTO public.landing_pages (pathname, name, description) VALUES
  ('/', 'Trang chủ dangkhuong.com', 'Homepage chính'),
  ('/slowenglish', 'SlowEnglish — Khoá học Veo3', 'Landing bán khóa Video YouTube Slow English'),
  ('/weballinone', 'WebAllInOne — Sinh tố 100K', 'Landing zoom live AI Agent + Website All-In-One'),
  ('/hocchuaxongtiendave', 'Học Chưa Xong Tiền Đã Về', 'Landing khoá affiliate'),
  ('/hoclamtoolvideochonguoimoibatdau', 'Tool Video — Người Mới', 'Landing tool làm video AI'),
  ('/tang4thanggeminipro', 'Tặng 4 Tháng Gemini Pro', 'Landing tặng quà Gemini'),
  ('/sanphamso', 'Sản Phẩm Số', 'Landing bán sản phẩm số'),
  ('/cafe', 'Cafe Mời Mentor', 'Landing booking cafe'),
  ('/updateveo3.1', 'Update Veo 3.1', 'Landing update khoá Veo'),
  ('/pricing', 'Bảng giá', 'Trang pricing chính')
ON CONFLICT (pathname) DO NOTHING;
