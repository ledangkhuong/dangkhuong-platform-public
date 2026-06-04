-- Enable RLS on tables that may be missing it
-- App code uses createAdminClient() for most operations, so RLS
-- primarily protects against direct PostgREST/client-side access.

-- subscription_plans: public read for pricing page, admin write
ALTER TABLE IF EXISTS subscription_plans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_plans' AND policyname='Public can view active plans') THEN
    CREATE POLICY "Public can view active plans" ON subscription_plans FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_plans' AND policyname='Admin can manage plans') THEN
    CREATE POLICY "Admin can manage plans" ON subscription_plans FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
END $$;

-- user_subscriptions: own data + staff
ALTER TABLE IF EXISTS user_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_subscriptions' AND policyname='Users view own subscriptions') THEN
    CREATE POLICY "Users view own subscriptions" ON user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_subscriptions' AND policyname='Admin manage subscriptions') THEN
    CREATE POLICY "Admin manage subscriptions" ON user_subscriptions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
END $$;

-- coupons: public read for validation, admin write
ALTER TABLE IF EXISTS coupons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupons' AND policyname='Public can view coupons') THEN
    CREATE POLICY "Public can view coupons" ON coupons FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupons' AND policyname='Admin manage coupons') THEN
    CREATE POLICY "Admin manage coupons" ON coupons FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
END $$;

-- coupon_usages: own data + authenticated insert + staff
ALTER TABLE IF EXISTS coupon_usages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupon_usages' AND policyname='Users view own usage') THEN
    CREATE POLICY "Users view own usage" ON coupon_usages FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupon_usages' AND policyname='Auth insert usage') THEN
    CREATE POLICY "Auth insert usage" ON coupon_usages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupon_usages' AND policyname='Admin manage usages') THEN
    CREATE POLICY "Admin manage usages" ON coupon_usages FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
  END IF;
END $$;
