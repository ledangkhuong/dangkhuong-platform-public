-- ============================================================
-- Visitor Attribution Migration — First-touch attribution
-- Lưu thông tin nguồn truy cập đầu tiên (frozen) theo visitor_id
-- 1 row / visitor_id mãi mãi, KHÔNG update sau lần INSERT đầu.
-- Mọi UTM / click ID / referrer / landing / device / geo của
-- lượt chạm đầu tiên đều được "đóng băng" tại đây để dùng cho
-- báo cáo attribution downstream (crm_contacts, orders, v.v.).
-- ============================================================

-- ============================================================
-- 1. BẢNG VISITOR_ATTRIBUTION
-- visitor_id do app sinh (cookie / localStorage) và supply lên,
-- KHÔNG có default ở DB — đảm bảo cùng 1 ID xuyên suốt phiên.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visitor_attribution (
  visitor_id uuid PRIMARY KEY,

  -- Thời điểm chạm đầu tiên
  first_seen_at timestamptz NOT NULL DEFAULT now(),

  -- UTM params (first-touch, frozen)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,

  -- Referrer (full URL)
  referrer text,

  -- Click IDs từ các nền tảng quảng cáo
  fbclid text,        -- Facebook / Meta
  gclid text,         -- Google Ads
  ttclid text,        -- TikTok Ads
  msclkid text,       -- Microsoft Ads (Bing)

  -- Landing page đầu tiên
  first_landing_path text,   -- chỉ pathname, vd: /weballinone
  first_landing_url text,    -- full URL

  -- Affiliate / referral code
  ref_code text,

  -- Thông tin thiết bị
  device_type text CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  os text,
  browser text,

  -- Geo (resolve từ IP qua middleware / edge function)
  country text,
  country_code text,         -- ISO 3166-1 alpha-2
  region text,
  city text,

  -- Raw debug
  ip text,
  user_agent text,

  -- Audit
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES — Tối ưu báo cáo attribution
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_visitor_attribution_utm_source
  ON public.visitor_attribution(utm_source);
CREATE INDEX IF NOT EXISTS idx_visitor_attribution_utm_campaign
  ON public.visitor_attribution(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_visitor_attribution_first_landing_path
  ON public.visitor_attribution(first_landing_path);
CREATE INDEX IF NOT EXISTS idx_visitor_attribution_country
  ON public.visitor_attribution(country);
CREATE INDEX IF NOT EXISTS idx_visitor_attribution_first_seen_at
  ON public.visitor_attribution(first_seen_at DESC);

-- ============================================================
-- 3. RLS POLICIES
-- Staff (admin/manager/marketing/sale) chỉ được SELECT.
-- INSERT/UPDATE/DELETE chỉ qua service role (server-side) —
-- không cần policy. Điều này đảm bảo bản ghi first-touch
-- không bị overwrite bởi client.
-- ============================================================
ALTER TABLE public.visitor_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitor_attribution_select_staff" ON public.visitor_attribution
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'marketing', 'sale')
    )
  );

-- INSERT/UPDATE/DELETE chỉ qua service role — không tạo policy

-- ============================================================
-- 4. ALTER public.crm_contacts
-- Bổ sung các cột attribution. Một số cột (utm_source,
-- utm_medium, utm_campaign, referrer, first_page) đã được
-- thêm ở migration trước (20250517_crm_professional_upgrade.sql)
-- nhưng vẫn dùng IF NOT EXISTS để idempotent.
-- ============================================================
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS visitor_id uuid
    REFERENCES public.visitor_attribution(visitor_id) ON DELETE SET NULL;

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS fbclid text;
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS gclid text;
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS ttclid text;

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS device_type text;

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS first_landing_path text;

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS ref_code text;

-- Index partial cho visitor_id (chỉ những contact có gắn visitor)
CREATE INDEX IF NOT EXISTS idx_crm_contacts_visitor_id
  ON public.crm_contacts(visitor_id)
  WHERE visitor_id IS NOT NULL;

-- ============================================================
-- 5. ALTER public.orders
-- Bổ sung các cột attribution. ref_code đã tồn tại từ
-- migration_affiliate.sql nên KHÔNG re-add ở đây.
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS visitor_id uuid
    REFERENCES public.visitor_attribution(visitor_id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS utm_term text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS utm_content text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fbclid text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS gclid text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS referrer text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS landing_path text;

-- Indexes cho báo cáo doanh thu theo nguồn
CREATE INDEX IF NOT EXISTS idx_orders_visitor_id
  ON public.orders(visitor_id);
CREATE INDEX IF NOT EXISTS idx_orders_utm_source
  ON public.orders(utm_source);
CREATE INDEX IF NOT EXISTS idx_orders_utm_campaign
  ON public.orders(utm_campaign);
