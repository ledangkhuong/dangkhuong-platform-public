-- Fix profiles RLS: restrict SELECT to authenticated users only
-- The existing "public_read_profiles" policy uses USING(true), exposing
-- all PII (email, phone, full_name, etc.) to unauthenticated/anonymous users.
--
-- NOTE: Most app code uses createAdminClient() which bypasses RLS,
-- so this primarily protects against direct PostgREST/client-side access.
--
-- Analysis of client-side (createClient) profile queries:
--   - Leaderboard page: reads top 20 profiles by XP (cross-user, authenticated)
--   - Community posts GET: FK join on profiles (cross-user, authenticated)
--   - Community comments GET: FK join on profiles (cross-user, authenticated)
--   - Lesson discussions: FK join on profiles (cross-user, authenticated)
--   - Sidebar/TopBar/settings: reads own profile only (authenticated)
--   - Blog display, course pages: use createAdminClient (bypasses RLS)
--   - Registration, payment: use createAdminClient (not affected)
--
-- Result: authenticated users need cross-user SELECT; anon does NOT.

BEGIN;

-- ============================================================
-- 1. Drop overly-permissive SELECT policies on profiles
-- ============================================================

-- Dynamic drop: remove ALL permissive SELECT policies to start clean.
-- This catches "public_read_profiles" (USING(true)) and
-- "users_read_own_profile" (which will be superseded below).
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles'
      AND schemaname = 'public'
      AND cmd = 'SELECT'
      AND permissive = 'PERMISSIVE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- ============================================================
-- 2. Create new, safer SELECT policies
-- ============================================================

-- Authenticated users can read all profiles.
-- Required for: leaderboard (top N by XP), community post/comment FK joins,
-- lesson discussion FK joins, and own-profile reads.
-- RLS cannot filter columns, so we rely on application-level SELECT lists
-- to avoid exposing unnecessary fields.
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- No anon/public SELECT policy.
-- All public pages (blog author display, course instructor, etc.) use
-- createAdminClient() which bypasses RLS entirely.
-- If a future public page needs profile data via createClient(),
-- add a restricted anon policy or use a SECURITY DEFINER function.

COMMIT;
