-- ============================================================
-- Migration: Course Interest Tracking for CRM
-- Tracks when logged-in users view courses they haven't purchased
-- ============================================================

-- 1. Create course_interests table
CREATE TABLE IF NOT EXISTS course_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  view_count INT DEFAULT 1,
  first_viewed_at TIMESTAMPTZ DEFAULT now(),
  last_viewed_at TIMESTAMPTZ DEFAULT now(),
  -- CRM integration
  contacted BOOLEAN DEFAULT false,
  contacted_at TIMESTAMPTZ,
  contacted_by UUID REFERENCES auth.users(id),
  notes TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'dismissed')),
  -- Unique per user+product
  UNIQUE (user_id, product_id)
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_course_interests_product ON course_interests(product_id);
CREATE INDEX IF NOT EXISTS idx_course_interests_user ON course_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_course_interests_status ON course_interests(status);
CREATE INDEX IF NOT EXISTS idx_course_interests_last_viewed ON course_interests(last_viewed_at DESC);

-- 3. RLS policies
ALTER TABLE course_interests ENABLE ROW LEVEL SECURITY;

-- Users can view their own interests
CREATE POLICY "Users can view own interests"
  ON course_interests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own interests
CREATE POLICY "Users can insert own interests"
  ON course_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own interests (view_count, last_viewed_at)
CREATE POLICY "Users can update own interests"
  ON course_interests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Staff can view all interests (for CRM)
CREATE POLICY "Staff can view all interests"
  ON course_interests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support')
    )
  );

-- Staff can update interests (contacted, notes, status)
CREATE POLICY "Staff can update all interests"
  ON course_interests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support')
    )
  );

-- 4. Function to upsert course interest (increment view_count on duplicate)
CREATE OR REPLACE FUNCTION upsert_course_interest(
  p_user_id UUID,
  p_product_id UUID
) RETURNS void AS $$
BEGIN
  INSERT INTO course_interests (user_id, product_id, view_count, first_viewed_at, last_viewed_at)
  VALUES (p_user_id, p_product_id, 1, now(), now())
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET
    view_count = course_interests.view_count + 1,
    last_viewed_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. View for CRM dashboard (joins with profiles and products)
CREATE OR REPLACE VIEW course_interests_detail AS
SELECT
  ci.id,
  ci.user_id,
  ci.product_id,
  ci.view_count,
  ci.first_viewed_at,
  ci.last_viewed_at,
  ci.contacted,
  ci.contacted_at,
  ci.contacted_by,
  ci.notes,
  ci.status,
  p.full_name AS customer_name,
  p.avatar_url AS customer_avatar,
  u.email AS customer_email,
  p.tier AS customer_tier,
  p.level AS customer_level,
  pr.title AS product_title,
  pr.slug AS product_slug,
  pr.price AS product_price,
  pr.sale_price AS product_sale_price,
  pr.thumbnail AS product_thumbnail,
  contacted_profile.full_name AS contacted_by_name
FROM course_interests ci
JOIN profiles p ON p.id = ci.user_id
JOIN auth.users u ON u.id = ci.user_id
JOIN products pr ON pr.id = ci.product_id
LEFT JOIN profiles contacted_profile ON contacted_profile.id = ci.contacted_by;

-- Grant access to the view
GRANT SELECT ON course_interests_detail TO authenticated;
