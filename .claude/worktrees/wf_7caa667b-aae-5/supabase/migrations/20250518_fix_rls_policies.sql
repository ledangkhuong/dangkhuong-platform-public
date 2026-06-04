-- ============================================================
-- RLS POLICY FIX MIGRATION
-- Fixes security issues found during audit:
--   1. subscribers — anon SELECT with USING(true) exposes all PII
--   2. audit_logs  — INSERT WITH CHECK(true) allows fake entries
--   3. xp_events   — RLS enabled but zero policies (blocks all access)
--   4. products, chapters, lessons — no RLS at all
-- ============================================================

BEGIN;

-- ============================================================
-- Helper: reusable staff-check function
-- Returns true if current user has admin, manager, or marketing role.
-- Uses SECURITY DEFINER so callers don't need direct access to profiles.
-- is_email_admin() already exists but only covers email-marketing tables;
-- we create a broader is_staff() for general use.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_staff()
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

-- Narrower helper: admin or manager only (no marketing)
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
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
    AND role IN ('admin', 'manager')
  );
END;
$$;


-- ============================================================
-- 1. FIX: subscribers — remove overly permissive anon SELECT
-- The existing "subscribers_anon_read_by_email" policy uses
-- USING(true), exposing ALL subscriber emails/names/phones to
-- unauthenticated users. We drop it and replace with a safe
-- alternative that only returns minimal data when queried by
-- exact email (for the unsubscribe page).
-- Staff (admin/manager/marketing) keep full SELECT via the
-- existing "subscribers_admin_select" policy.
-- ============================================================

-- Drop the dangerous anon SELECT policy
DROP POLICY IF EXISTS "subscribers_anon_read_by_email" ON public.subscribers;

-- Replace with a restricted anon SELECT that only exposes id, email,
-- and status columns conceptually. RLS cannot filter columns, but we
-- limit rows to exact-email lookups by requiring the email to be
-- supplied via a request header or RPC. Since RLS cannot enforce
-- column-level restrictions, the safest approach is to remove anon
-- SELECT entirely and use a SECURITY DEFINER function for unsubscribe.
-- However, to keep the unsubscribe page working without code changes,
-- we allow anon SELECT but restrict to rows matching a known email
-- pattern. For maximum safety, we remove anon SELECT entirely:
-- The unsubscribe flow should use the service_role client or a
-- SECURITY DEFINER RPC function instead.

-- No anon SELECT policy on subscribers (service_role bypasses RLS
-- for the unsubscribe API route). If a public unsubscribe lookup
-- is needed, create a SECURITY DEFINER function that returns only
-- the subscriber id and status for a given email.

-- Keep the anon UPDATE for unsubscribe (already properly restricted
-- to only setting status = 'unsubscribed' via WITH CHECK).
-- "subscribers_anon_unsubscribe" already exists and is safe.


-- ============================================================
-- 2. FIX: audit_logs — restrict INSERT to admin/manager only
-- The existing policy "Service role can insert audit logs" uses
-- WITH CHECK(true), allowing ANY authenticated user to insert
-- fake audit entries. Service role already bypasses RLS, so that
-- policy is redundant for service_role and dangerous for regular
-- authenticated users. Drop it and create a proper policy.
-- ============================================================

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;

-- Admin/manager can insert audit logs (for client-side admin actions)
-- Service role (used by logAudit() in API routes) bypasses RLS automatically.
CREATE POLICY "audit_logs_insert_staff" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager());


-- ============================================================
-- 3. FIX: xp_events — add missing policies
-- RLS is enabled (schema.sql line 280) but no policies exist,
-- blocking all client access. Users need to read and insert
-- their own XP events.
-- ============================================================

-- Users can read their own XP events
DROP POLICY IF EXISTS "xp_events_select_own" ON public.xp_events;
CREATE POLICY "xp_events_select_own" ON public.xp_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own XP events
DROP POLICY IF EXISTS "xp_events_insert_own" ON public.xp_events;
CREATE POLICY "xp_events_insert_own" ON public.xp_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin/manager can read all XP events (for analytics/moderation)
DROP POLICY IF EXISTS "xp_events_select_admin" ON public.xp_events;
CREATE POLICY "xp_events_select_admin" ON public.xp_events
  FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());


-- ============================================================
-- 4. FIX: products, chapters, lessons — enable RLS + add policies
-- These content tables had no RLS, meaning any role (including
-- anon with the anon key) could read/write all rows.
-- ============================================================

-- ─── 4a. PRODUCTS ───────────────────────────────────────────
-- products.status column exists: ('draft','published','archived')
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read published products
DROP POLICY IF EXISTS "products_select_published" ON public.products;
CREATE POLICY "products_select_published" ON public.products
  FOR SELECT
  USING (status = 'published');

-- Admin/manager can read ALL products (including draft/archived)
DROP POLICY IF EXISTS "products_select_admin" ON public.products;
CREATE POLICY "products_select_admin" ON public.products
  FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

-- Admin/manager can insert products
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager());

-- Admin/manager can update products
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager());

-- Admin/manager can delete products
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
CREATE POLICY "products_delete_admin" ON public.products
  FOR DELETE TO authenticated
  USING (public.is_admin_or_manager());


-- ─── 4b. CHAPTERS ───────────────────────────────────────────
-- chapters does NOT have a status column.
-- Visibility is derived from the parent product's status.
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Anyone can read chapters belonging to a published product
DROP POLICY IF EXISTS "chapters_select_published" ON public.chapters;
CREATE POLICY "chapters_select_published" ON public.chapters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = chapters.product_id
      AND products.status = 'published'
    )
  );

-- Admin/manager can read ALL chapters
DROP POLICY IF EXISTS "chapters_select_admin" ON public.chapters;
CREATE POLICY "chapters_select_admin" ON public.chapters
  FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

-- Admin/manager can insert chapters
DROP POLICY IF EXISTS "chapters_insert_admin" ON public.chapters;
CREATE POLICY "chapters_insert_admin" ON public.chapters
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager());

-- Admin/manager can update chapters
DROP POLICY IF EXISTS "chapters_update_admin" ON public.chapters;
CREATE POLICY "chapters_update_admin" ON public.chapters
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager());

-- Admin/manager can delete chapters
DROP POLICY IF EXISTS "chapters_delete_admin" ON public.chapters;
CREATE POLICY "chapters_delete_admin" ON public.chapters
  FOR DELETE TO authenticated
  USING (public.is_admin_or_manager());


-- ─── 4c. LESSONS ────────────────────────────────────────────
-- lessons does NOT have a status column.
-- Visibility is derived from the parent product's status.
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Anyone can read lessons belonging to a published product
DROP POLICY IF EXISTS "lessons_select_published" ON public.lessons;
CREATE POLICY "lessons_select_published" ON public.lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = lessons.product_id
      AND products.status = 'published'
    )
  );

-- Admin/manager can read ALL lessons
DROP POLICY IF EXISTS "lessons_select_admin" ON public.lessons;
CREATE POLICY "lessons_select_admin" ON public.lessons
  FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

-- Admin/manager can insert lessons
DROP POLICY IF EXISTS "lessons_insert_admin" ON public.lessons;
CREATE POLICY "lessons_insert_admin" ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager());

-- Admin/manager can update lessons
DROP POLICY IF EXISTS "lessons_update_admin" ON public.lessons;
CREATE POLICY "lessons_update_admin" ON public.lessons
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager());

-- Admin/manager can delete lessons
DROP POLICY IF EXISTS "lessons_delete_admin" ON public.lessons;
CREATE POLICY "lessons_delete_admin" ON public.lessons
  FOR DELETE TO authenticated
  USING (public.is_admin_or_manager());


COMMIT;
