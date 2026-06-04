-- Migration: sale_targets — per-sale monthly KPI targets
-- Created: 2026-05-26
--
-- Stores revenue / orders / conversion goals for each sale rep per month.
-- Used by the Sale Dashboard (compare current MTD revenue vs target) and
-- the Admin sales-dashboard (leaderboard + coaching status). One row per
-- (sale_user_id, month) — month is normalized to the first-of-month date.
--
-- RLS pattern matches crm_next_actions (see 20250517_crm_professional_upgrade.sql):
--   - admin/manager: full CRUD
--   - sale: SELECT only (read their own / team rows)

CREATE TABLE IF NOT EXISTS public.sale_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month date NOT NULL,                  -- store as YYYY-MM-01
  revenue_target bigint NOT NULL DEFAULT 0,
  orders_target int NOT NULL DEFAULT 0,
  conversion_target numeric(5,2),       -- optional %, 0-100
  notes text,
  set_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sale_user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_sale_targets_sale_month
  ON public.sale_targets(sale_user_id, month);

CREATE INDEX IF NOT EXISTS idx_sale_targets_month
  ON public.sale_targets(month);

-- Auto-update updated_at on row change (re-uses pattern used by crm_contacts)
CREATE OR REPLACE FUNCTION public.sale_targets_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sale_targets_updated_at ON public.sale_targets;
CREATE TRIGGER trg_sale_targets_updated_at
  BEFORE UPDATE ON public.sale_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.sale_targets_set_updated_at();

-- ─── RLS Policies ────────────────────────────────────────────
-- Pattern: admin/manager full CRUD, sale read-only.

ALTER TABLE public.sale_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_targets_select_staff" ON public.sale_targets;
CREATE POLICY "sale_targets_select_staff" ON public.sale_targets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid()
         AND role IN ('admin','manager','sale')
    )
  );

DROP POLICY IF EXISTS "sale_targets_insert_admin" ON public.sale_targets;
CREATE POLICY "sale_targets_insert_admin" ON public.sale_targets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid()
         AND role IN ('admin','manager')
    )
  );

DROP POLICY IF EXISTS "sale_targets_update_admin" ON public.sale_targets;
CREATE POLICY "sale_targets_update_admin" ON public.sale_targets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid()
         AND role IN ('admin','manager')
    )
  );

DROP POLICY IF EXISTS "sale_targets_delete_admin" ON public.sale_targets;
CREATE POLICY "sale_targets_delete_admin" ON public.sale_targets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid()
         AND role IN ('admin','manager')
    )
  );
