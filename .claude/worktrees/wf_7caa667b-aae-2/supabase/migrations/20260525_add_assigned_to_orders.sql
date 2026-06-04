-- Migration: Add assigned_to (sales person) to orders
-- Created: 2026-05-25
-- Adds a nullable FK to profiles, an index, and an RLS policy letting
-- users with role 'sale' read only orders assigned to them. Existing
-- admin/manager policies are left untouched.

-- ─── 1. Column ───────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_to uuid
  REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─── 2. Index ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_assigned ON public.orders(assigned_to);

-- ─── 3. RLS — sale role can SELECT own assignments ──────────
-- (admin/manager full-access policies remain as previously defined)
DROP POLICY IF EXISTS "orders_select_assigned_sale" ON public.orders;
CREATE POLICY "orders_select_assigned_sale" ON public.orders
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'sale'
    )
  );
