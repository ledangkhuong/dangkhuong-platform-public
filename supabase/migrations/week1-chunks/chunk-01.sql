-- ============================================================================
-- WEEK 1 MIGRATION: E-COMMERCE FOUNDATION
-- File: 20260605_ecommerce_foundation.sql
-- Purpose: Consolidate 6 design migrations into 1 idempotent file
-- Order: vn_provinces -> vn_wards -> product_categories -> products ->
--        product_variants -> carts -> cart_items -> orders_extension ->
--        order_items -> shipments -> shipment_events -> seed data
-- Safe to re-run multiple times (CREATE IF NOT EXISTS, DO blocks, ON CONFLICT)
-- ============================================================================

-- ============================================================================
-- WEEK 1 MIGRATION :: PRELUDE - extensions + shared helpers
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shared trigger function: auto-update updated_at on row UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Alias kept for backward compatibility with cart migration
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Helper: lookup current user's role from profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;


-- ============================================================================
-- WEEK 1 MIGRATION :: 1) vn_provinces (Vietnam administrative reference)
-- Post-2025 reform: 2 levels only (provinces + wards), no districts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vn_provinces (
    code           text        PRIMARY KEY,
    name           text        NOT NULL,
    name_en        text,
    code_name      text,
    division_type  text,
    phone_code     integer,
    created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vn_provinces ADD COLUMN IF NOT EXISTS name_en       text;
ALTER TABLE public.vn_provinces ADD COLUMN IF NOT EXISTS code_name     text;
ALTER TABLE public.vn_provinces ADD COLUMN IF NOT EXISTS division_type text;
ALTER TABLE public.vn_provinces ADD COLUMN IF NOT EXISTS phone_code    integer;
ALTER TABLE public.vn_provinces ADD COLUMN IF NOT EXISTS created_at    timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_vn_provinces_name      ON public.vn_provinces (name);
CREATE INDEX IF NOT EXISTS idx_vn_provinces_code_name ON public.vn_provinces (code_name);

COMMENT ON TABLE  public.vn_provinces            IS 'Vietnam provinces / centrally-governed cities (post-2025 administrative reform).';
COMMENT ON COLUMN public.vn_provinces.code       IS 'Official 2-digit province code (e.g. ''01'' = Ha Noi).';
COMMENT ON COLUMN public.vn_provinces.code_name  IS 'Slug-friendly code name (e.g. ''ha_noi'').';

ALTER TABLE public.vn_provinces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vn_provinces_public_read"   ON public.vn_provinces;
DROP POLICY IF EXISTS "vn_provinces_service_write" ON public.vn_provinces;

CREATE POLICY "vn_provinces_public_read"
    ON public.vn_provinces
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "vn_provinces_service_write"
    ON public.vn_provinces
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

GRANT SELECT ON public.vn_provinces TO anon, authenticated;
GRANT ALL    ON public.vn_provinces TO service_role;


-- ============================================================================
-- WEEK 1 MIGRATION :: 2) vn_wards (xa / phuong / thi tran)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vn_wards (
    code           text        PRIMARY KEY,
    name           text        NOT NULL,
    name_en        text,
    code_name      text,
    division_type  text,
    province_code  text        NOT NULL REFERENCES public.vn_provinces(code) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vn_wards ADD COLUMN IF NOT EXISTS name_en       text;
ALTER TABLE public.vn_wards ADD COLUMN IF NOT EXISTS code_name     text;
ALTER TABLE public.vn_wards ADD COLUMN IF NOT EXISTS division_type text;
ALTER TABLE public.vn_wards ADD COLUMN IF NOT EXISTS created_at    timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'vn_wards_province_code_fkey'
          AND conrelid = 'public.vn_wards'::regclass
    ) THEN
        ALTER TABLE public.vn_wards
            ADD CONSTRAINT vn_wards_province_code_fkey
            FOREIGN KEY (province_code) REFERENCES public.vn_provinces(code)
            ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_vn_wards_province_code ON public.vn_wards (province_code);
CREATE INDEX IF NOT EXISTS idx_vn_wards_name          ON public.vn_wards (name);
CREATE INDEX IF NOT EXISTS idx_vn_wards_code_name     ON public.vn_wards (code_name);
CREATE INDEX IF NOT EXISTS idx_vn_wards_province_name ON public.vn_wards (province_code, name);

COMMENT ON TABLE  public.vn_wards               IS 'Vietnam wards/communes (xa/phuong/thi tran). Post-2025 reform: districts removed, wards link directly to provinces.';
COMMENT ON COLUMN public.vn_wards.province_code IS 'FK to vn_provinces.code. No intermediate district level.';

ALTER TABLE public.vn_wards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vn_wards_public_read"   ON public.vn_wards;
DROP POLICY IF EXISTS "vn_wards_service_write" ON public.vn_wards;

CREATE POLICY "vn_wards_public_read"
    ON public.vn_wards
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "vn_wards_service_write"
    ON public.vn_wards
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

GRANT SELECT ON public.vn_wards TO anon, authenticated;
GRANT ALL    ON public.vn_wards TO service_role;


