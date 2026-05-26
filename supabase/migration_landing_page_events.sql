-- ============================================================
-- Landing Page Events Migration
-- Cho phép marketing pick Meta Standard Event cho từng landing:
--   - page_event: fire khi user mở trang (ngoài PageView mặc định)
--   - form_submit_event: fire khi user submit BẤT KỲ form nào trên page
-- + value/currency cho event có giá trị (Lead với value, Purchase ...).
-- ============================================================

-- Standard Event names Meta chuẩn (17 events)
DO $$ BEGIN
  CREATE TYPE meta_standard_event AS ENUM (
    'AddPaymentInfo',
    'AddToCart',
    'AddToWishlist',
    'CompleteRegistration',
    'Contact',
    'CustomizeProduct',
    'Donate',
    'FindLocation',
    'InitiateCheckout',
    'Lead',
    'Purchase',
    'Schedule',
    'Search',
    'StartTrial',
    'SubmitApplication',
    'Subscribe',
    'ViewContent'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS page_event meta_standard_event;

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS form_submit_event meta_standard_event;

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS event_value integer;

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS event_currency text DEFAULT 'VND';

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS event_content_name text;

-- Index phụ trợ báo cáo theo event
CREATE INDEX IF NOT EXISTS idx_landing_pages_page_event
  ON public.landing_pages(page_event)
  WHERE page_event IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_landing_pages_form_submit_event
  ON public.landing_pages(form_submit_event)
  WHERE form_submit_event IS NOT NULL;
