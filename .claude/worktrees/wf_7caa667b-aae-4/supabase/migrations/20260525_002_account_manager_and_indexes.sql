-- Migration: account_manager_id on profiles + supporting indexes
-- Created: 2026-05-25
-- Adds:
--   1. profiles.account_manager_id (nullable FK -> profiles.id) — the
--      sale person who manages this user (typically used for students
--      tied to a customer-success / sales account manager).
--   2. Index on profiles.account_manager_id for lookups by manager.
--   3. Index on crm_deals.assigned_to (if not already present) to keep
--      filter/sort by deal owner fast.
--   4. RLS policy allowing admin/manager to UPDATE any profile row,
--      mirroring the pattern in supabase/migration_crm.sql. (The
--      existing "users_update_own_profile" policy only covers self.)

-- ─── 1. Column ───────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_manager_id uuid
  REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─── 2. Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_account_manager
  ON public.profiles(account_manager_id);

CREATE INDEX IF NOT EXISTS idx_crm_deals_assigned
  ON public.crm_deals(assigned_to);

-- ─── 3. RLS — admin/manager can UPDATE any profile ──────────
-- profiles already has RLS enabled. The only pre-existing UPDATE
-- policy is "users_update_own_profile" (self-only). Without this
-- policy, admin/manager calling profiles.update under the user
-- session client would be blocked. API routes use createAdminClient
-- (service role) which bypasses RLS, but we add this for parity
-- with crm_* tables and so future direct-from-client updates work.
DROP POLICY IF EXISTS "profiles_update_admin_manager" ON public.profiles;
CREATE POLICY "profiles_update_admin_manager" ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    )
  );
