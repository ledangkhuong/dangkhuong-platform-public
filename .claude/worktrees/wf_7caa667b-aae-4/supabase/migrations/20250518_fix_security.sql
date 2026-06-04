-- ============================================================
-- SECURITY FIX MIGRATION
-- 1. Fix is_email_admin() role mismatch
-- 2. Add RLS policies for analytics_events and blog_posts
-- 3. Add missing indexes on high-traffic columns
-- ============================================================

BEGIN;

-- ============================================================
-- 1. FIX is_email_admin() — replace 'moderator' with actual roles
-- The profiles.role constraint allows: student, admin, manager, marketing, sale, support
-- The old function checked for 'admin','moderator' — 'moderator' does not exist.
-- Now checks for 'admin','manager','marketing' to match actual staff roles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_email_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager', 'marketing')
  );
END;
$$;

-- ============================================================
-- 2. RLS POLICIES FOR analytics_events AND blog_posts
-- These tables had RLS enabled but no policies, effectively
-- blocking all access except via service role.
-- ============================================================

-- ─── analytics_events ───────────────────────────────────────
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own events
DROP POLICY IF EXISTS "analytics_events_insert_own" ON public.analytics_events;
CREATE POLICY "analytics_events_insert_own" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin/manager can read all analytics events
DROP POLICY IF EXISTS "analytics_events_select_admin" ON public.analytics_events;
CREATE POLICY "analytics_events_select_admin" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- ─── blog_posts ─────────────────────────────────────────────
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Everyone (including anon) can read published blog posts
DROP POLICY IF EXISTS "blog_posts_select_public" ON public.blog_posts;
CREATE POLICY "blog_posts_select_public" ON public.blog_posts
  FOR SELECT
  USING (true);

-- Admin/manager/marketing can insert blog posts
DROP POLICY IF EXISTS "blog_posts_insert_staff" ON public.blog_posts;
CREATE POLICY "blog_posts_insert_staff" ON public.blog_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'marketing')
    )
  );

-- Admin/manager/marketing can update blog posts
DROP POLICY IF EXISTS "blog_posts_update_staff" ON public.blog_posts;
CREATE POLICY "blog_posts_update_staff" ON public.blog_posts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'marketing')
    )
  );

-- Admin/manager/marketing can delete blog posts
DROP POLICY IF EXISTS "blog_posts_delete_staff" ON public.blog_posts;
CREATE POLICY "blog_posts_delete_staff" ON public.blog_posts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'marketing')
    )
  );

-- ============================================================
-- 3. MISSING INDEXES ON HIGH-TRAFFIC COLUMNS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_product ON enrollments(user_id, product_id);

COMMIT;
