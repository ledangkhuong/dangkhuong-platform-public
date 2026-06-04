-- ============================================================================
-- Migration: Instructor Role + Community Features
-- Date: 2026-05-20
-- Features:
--   1. Add 'instructor' role to profiles
--   2. Add instructor_id to products (courses)
--   3. Add category, is_announcement, product_id to posts
--   4. Create learning_journey_events table
--   5. Add score column to lesson_submissions
--   6. RLS policies for instructor access
-- ============================================================================

-- ─── 1. Add 'instructor' role ──────────────────────────────────────────────

-- Drop old constraint and add new one with 'instructor' included
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_role_check' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  -- Add updated constraint
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'admin', 'manager', 'marketing', 'sale', 'support', 'instructor'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Role constraint update: %', SQLERRM;
END $$;

-- ─── 2. Add instructor_id to products ──────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'instructor_id'
  ) THEN
    ALTER TABLE products ADD COLUMN instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_products_instructor_id ON products(instructor_id);
  END IF;
END $$;

-- ─── 3. Add columns to posts table ─────────────────────────────────────────

-- category column for community content classification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'category'
  ) THEN
    ALTER TABLE posts ADD COLUMN category TEXT DEFAULT NULL;
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
  END IF;
END $$;

-- is_announcement flag for admin announcements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'is_announcement'
  ) THEN
    ALTER TABLE posts ADD COLUMN is_announcement BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_posts_is_announcement ON posts(is_announcement) WHERE is_announcement = TRUE;
  END IF;
END $$;

-- product_id for course-level discussions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE CASCADE DEFAULT NULL;
    CREATE INDEX IF NOT EXISTS idx_posts_product_id ON posts(product_id);
  END IF;
END $$;

-- ─── 4. Add score to lesson_submissions ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_submissions' AND column_name = 'score'
  ) THEN
    ALTER TABLE lesson_submissions ADD COLUMN score SMALLINT DEFAULT NULL CHECK (score >= 0 AND score <= 100);
  END IF;
END $$;

-- ─── 5. Create learning_journey_events table ────────────────────────────────

CREATE TABLE IF NOT EXISTS learning_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'enrollment', 'lesson_complete', 'course_complete',
    'quiz_pass', 'milestone', 'custom'
  )),
  title TEXT NOT NULL,
  description TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_user_id ON learning_journey_events(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_created_at ON learning_journey_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journey_event_type ON learning_journey_events(event_type);
CREATE INDEX IF NOT EXISTS idx_journey_public ON learning_journey_events(is_public) WHERE is_public = TRUE;

-- ─── 6. Enable RLS on learning_journey_events ──────────────────────────────

ALTER TABLE learning_journey_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own events
CREATE POLICY IF NOT EXISTS "Users can read own journey events"
  ON learning_journey_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read public events of others
CREATE POLICY IF NOT EXISTS "Users can read public journey events"
  ON learning_journey_events FOR SELECT
  USING (is_public = TRUE);

-- Users can insert their own custom events
CREATE POLICY IF NOT EXISTS "Users can insert own journey events"
  ON learning_journey_events FOR INSERT
  WITH CHECK (auth.uid() = user_id AND event_type IN ('milestone', 'custom'));

-- Users can update their own events
CREATE POLICY IF NOT EXISTS "Users can update own journey events"
  ON learning_journey_events FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own custom events
CREATE POLICY IF NOT EXISTS "Users can delete own journey events"
  ON learning_journey_events FOR DELETE
  USING (auth.uid() = user_id AND event_type IN ('milestone', 'custom'));

-- ─── 7. RLS policy for instructor access to submissions ─────────────────────

-- Instructor can view submissions for their assigned courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Instructors can view course submissions'
    AND tablename = 'lesson_submissions'
  ) THEN
    CREATE POLICY "Instructors can view course submissions"
      ON lesson_submissions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM products p
          JOIN profiles prof ON prof.id = auth.uid()
          WHERE p.id = lesson_submissions.product_id
          AND p.instructor_id = auth.uid()
          AND prof.role = 'instructor'
        )
      );
  END IF;
END $$;

-- Instructor can update submissions (review/grade) for their courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Instructors can review course submissions'
    AND tablename = 'lesson_submissions'
  ) THEN
    CREATE POLICY "Instructors can review course submissions"
      ON lesson_submissions FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM products p
          JOIN profiles prof ON prof.id = auth.uid()
          WHERE p.id = lesson_submissions.product_id
          AND p.instructor_id = auth.uid()
          AND prof.role = 'instructor'
        )
      );
  END IF;
END $$;

-- ─── 8. Instructor can view enrollments for their courses ───────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Instructors can view course enrollments'
    AND tablename = 'enrollments'
  ) THEN
    CREATE POLICY "Instructors can view course enrollments"
      ON enrollments FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM products p
          JOIN profiles prof ON prof.id = auth.uid()
          WHERE p.id = enrollments.product_id
          AND p.instructor_id = auth.uid()
          AND prof.role = 'instructor'
        )
      );
  END IF;
END $$;

-- ─── Done ───────────────────────────────────────────────────────────────────
