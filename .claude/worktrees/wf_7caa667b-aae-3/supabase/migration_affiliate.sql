-- ═══════════════════════════════════════════════════════════════
-- AFFILIATE SYSTEM — dangkhuong.com
-- Chạy trong Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════

-- 1. Bảng affiliates — mỗi học viên đăng ký làm affiliate
CREATE TABLE IF NOT EXISTS public.affiliates (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  ref_code        text UNIQUE NOT NULL,
  status          text DEFAULT 'active' CHECK (status IN ('pending','active','suspended','rejected')),
  commission_rate numeric(5,2) DEFAULT 20.00,
  total_clicks    integer DEFAULT 0,
  total_conversions integer DEFAULT 0,
  total_earned    integer DEFAULT 0,
  total_paid      integer DEFAULT 0,
  bank_name       text,
  bank_account    text,
  bank_holder     text,
  note            text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_ref_code ON affiliates(ref_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);

-- 2. Bảng affiliate_clicks — tracking mỗi click
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  ref_code    text NOT NULL,
  ip          text,
  user_agent  text,
  page_url    text,
  referrer    text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aff_clicks_affiliate ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_created ON affiliate_clicks(created_at);

-- 3. Bảng affiliate_conversions — hoa hồng khi bán hàng
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id    uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id        uuid,
  buyer_id        uuid,
  product_id      uuid,
  order_amount    integer NOT NULL,
  commission_rate numeric(5,2) NOT NULL,
  commission_amount integer NOT NULL,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  approved_at     timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aff_conv_affiliate ON affiliate_conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_conv_status ON affiliate_conversions(status);

-- 4. Bảng affiliate_payouts — lịch sử thanh toán
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id  uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount        integer NOT NULL,
  status        text DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  bank_name     text,
  bank_account  text,
  bank_holder   text,
  note          text,
  processed_by  uuid,
  processed_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aff_payouts_affiliate ON affiliate_payouts(affiliate_id);

-- 5. Bảng affiliate_settings — cấu hình chung
CREATE TABLE IF NOT EXISTS public.affiliate_settings (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  default_commission  numeric(5,2) DEFAULT 20.00,
  cookie_days         integer DEFAULT 90,
  min_payout_amount   integer DEFAULT 200000,
  auto_approve        boolean DEFAULT false,
  program_active      boolean DEFAULT true,
  updated_at          timestamptz DEFAULT now()
);

INSERT INTO public.affiliate_settings (default_commission, cookie_days, min_payout_amount)
VALUES (20.00, 90, 200000)
ON CONFLICT DO NOTHING;

-- 6. Thêm cột ref_code vào orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ref_code text;
CREATE INDEX IF NOT EXISTS idx_orders_ref_code ON orders(ref_code);

-- 7. Trigger tự cập nhật affiliate totals
CREATE OR REPLACE FUNCTION update_affiliate_totals()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE affiliates SET
    total_conversions = (SELECT count(*) FROM affiliate_conversions WHERE affiliate_id = NEW.affiliate_id AND status != 'rejected'),
    total_earned = (SELECT coalesce(sum(commission_amount),0) FROM affiliate_conversions WHERE affiliate_id = NEW.affiliate_id AND status IN ('pending','approved','paid')),
    updated_at = now()
  WHERE id = NEW.affiliate_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_affiliate_conversion_change ON public.affiliate_conversions;
CREATE TRIGGER on_affiliate_conversion_change
  AFTER INSERT OR UPDATE ON public.affiliate_conversions
  FOR EACH ROW EXECUTE PROCEDURE update_affiliate_totals();

-- 8. RLS Policies
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;

-- Affiliates
CREATE POLICY "users_read_own_affiliate" ON affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_register_affiliate" ON affiliates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_affiliate" ON affiliates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "staff_manage_affiliates" ON affiliates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
);

-- Clicks: affiliates read own
CREATE POLICY "affiliates_read_own_clicks" ON affiliate_clicks FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
CREATE POLICY "staff_read_all_clicks" ON affiliate_clicks FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
);

-- Conversions: affiliates read own
CREATE POLICY "affiliates_read_own_conversions" ON affiliate_conversions FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
CREATE POLICY "staff_manage_conversions" ON affiliate_conversions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
);

-- Payouts
CREATE POLICY "affiliates_read_own_payouts" ON affiliate_payouts FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
CREATE POLICY "staff_manage_payouts" ON affiliate_payouts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
);

-- Settings: public read
CREATE POLICY "public_read_affiliate_settings" ON affiliate_settings FOR SELECT USING (true);
CREATE POLICY "admin_manage_settings" ON affiliate_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
