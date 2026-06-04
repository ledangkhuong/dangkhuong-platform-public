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


-- ============================================================================
-- WEEK 1 MIGRATION :: 3) product_categories (nested 1-2 levels)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_categories (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          text NOT NULL,
  name          text NOT NULL,
  description   text,
  parent_id     uuid,
  thumbnail_url text,
  position      integer NOT NULL DEFAULT 0,
  is_visible    boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS slug          text;
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS name          text;
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS description   text;
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS parent_id     uuid;
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS position      integer NOT NULL DEFAULT 0;
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS is_visible    boolean NOT NULL DEFAULT true;
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS created_at    timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS updated_at    timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_categories_slug_unique') THEN
    ALTER TABLE public.product_categories
      ADD CONSTRAINT product_categories_slug_unique UNIQUE (slug);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_categories_parent_fk') THEN
    ALTER TABLE public.product_categories
      ADD CONSTRAINT product_categories_parent_fk
      FOREIGN KEY (parent_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_categories_no_self_parent') THEN
    ALTER TABLE public.product_categories
      ADD CONSTRAINT product_categories_no_self_parent
      CHECK (parent_id IS NULL OR parent_id <> id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_categories_slug_format') THEN
    ALTER TABLE public.product_categories
      ADD CONSTRAINT product_categories_slug_format
      CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id  ON public.product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_position   ON public.product_categories(position);
CREATE INDEX IF NOT EXISTS idx_product_categories_is_visible ON public.product_categories(is_visible) WHERE is_visible = true;

DROP TRIGGER IF EXISTS trg_product_categories_updated_at ON public.product_categories;
CREATE TRIGGER trg_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.product_categories IS
  'Phan loai san pham vat ly (sach in, merch). Ho tro nested 1-2 cap qua parent_id self-FK.';
COMMENT ON COLUMN public.product_categories.parent_id IS
  'Self-FK cho nested category. NULL = root category.';
COMMENT ON COLUMN public.product_categories.position IS
  'Thu tu hien thi thu cong, ASC.';
COMMENT ON COLUMN public.product_categories.is_visible IS
  'Soft-hide: false = an khoi storefront nhung khong xoa.';

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_categories_public_read"     ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_staff_read_all"  ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_staff_insert"    ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_staff_update"    ON public.product_categories;
DROP POLICY IF EXISTS "product_categories_admin_delete"    ON public.product_categories;

CREATE POLICY "product_categories_public_read"
  ON public.product_categories
  FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

CREATE POLICY "product_categories_staff_read_all"
  ON public.product_categories
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin','manager','marketing','sale'));

CREATE POLICY "product_categories_staff_insert"
  ON public.product_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin','manager','marketing'));

CREATE POLICY "product_categories_staff_update"
  ON public.product_categories
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() IN ('admin','manager','marketing'))
  WITH CHECK (public.current_user_role() IN ('admin','manager','marketing'));

CREATE POLICY "product_categories_admin_delete"
  ON public.product_categories
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');

GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;


-- ============================================================================
-- WEEK 1 MIGRATION :: 4) products (catalog cho san pham vat ly + digital)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE product_type_enum AS ENUM ('book','merch','digital');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_status_enum AS ENUM ('draft','active','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.products (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                text NOT NULL UNIQUE,
  name                text NOT NULL,
  description         text,
  short_description   text,
  sku                 text UNIQUE,
  price               numeric(12, 2) NOT NULL DEFAULT 0,
  compare_at_price    numeric(12, 2),
  cost                numeric(12, 2),
  product_type        product_type_enum NOT NULL DEFAULT 'book',
  status              product_status_enum NOT NULL DEFAULT 'draft',
  thumbnail_url       text,
  gallery_urls        text[] NOT NULL DEFAULT ARRAY[]::text[],
  weight_grams        integer,
  dimensions_cm       jsonb,
  tags                text[] NOT NULL DEFAULT ARRAY[]::text[],
  category_id         uuid,
  seo_title           text,
  seo_description     text,
  focus_keyword       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  published_at        timestamptz,
  CONSTRAINT products_price_nonneg         CHECK (price >= 0),
  CONSTRAINT products_compare_price_nonneg CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  CONSTRAINT products_cost_nonneg          CHECK (cost IS NULL OR cost >= 0),
  CONSTRAINT products_weight_nonneg        CHECK (weight_grams IS NULL OR weight_grams >= 0)
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug              text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name              text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description       text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku               text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price             numeric(12, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_at_price  numeric(12, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost              numeric(12, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type      product_type_enum DEFAULT 'book';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status            product_status_enum DEFAULT 'draft';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS thumbnail_url     text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_urls      text[] DEFAULT ARRAY[]::text[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_grams      integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dimensions_cm     jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags              text[] DEFAULT ARRAY[]::text[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id       uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title         text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_description   text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS focus_keyword     text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at        timestamptz DEFAULT now();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published_at      timestamptz;

-- FK products.category_id -> product_categories(id) (added after both tables exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_category_id_fkey'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_uidx        ON public.products (slug);
CREATE INDEX        IF NOT EXISTS products_status_idx       ON public.products (status);
CREATE INDEX        IF NOT EXISTS products_product_type_idx ON public.products (product_type);
CREATE INDEX        IF NOT EXISTS products_category_id_idx  ON public.products (category_id);
CREATE INDEX        IF NOT EXISTS products_published_at_idx ON public.products (published_at DESC NULLS LAST);
CREATE INDEX        IF NOT EXISTS products_tags_gin_idx     ON public.products USING GIN (tags);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read_active" ON public.products;
DROP POLICY IF EXISTS "products_staff_read_all"     ON public.products;
DROP POLICY IF EXISTS "products_staff_insert"       ON public.products;
DROP POLICY IF EXISTS "products_staff_update"       ON public.products;
DROP POLICY IF EXISTS "products_admin_delete"       ON public.products;

CREATE POLICY "products_public_read_active"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "products_staff_read_all"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin','manager','marketing','sale'));

CREATE POLICY "products_staff_insert"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin','manager','marketing'));

CREATE POLICY "products_staff_update"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() IN ('admin','manager','marketing'))
  WITH CHECK (public.current_user_role() IN ('admin','manager','marketing'));

CREATE POLICY "products_admin_delete"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');


-- ============================================================================
-- WEEK 1 MIGRATION :: 5) product_variants (SKU-level: size, color, format)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_variants (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id           uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  sku                  text UNIQUE,
  price                numeric(12, 2),
  compare_at_price     numeric(12, 2),
  stock_count          integer NOT NULL DEFAULT 0,
  low_stock_threshold  integer NOT NULL DEFAULT 5,
  weight_grams         integer,
  barcode              text,
  position             integer NOT NULL DEFAULT 0,
  attributes           jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default           boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_price_nonneg          CHECK (price IS NULL OR price >= 0),
  CONSTRAINT product_variants_compare_price_nonneg  CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  CONSTRAINT product_variants_stock_nonneg          CHECK (stock_count >= 0),
  CONSTRAINT product_variants_low_stock_nonneg      CHECK (low_stock_threshold >= 0),
  CONSTRAINT product_variants_weight_nonneg         CHECK (weight_grams IS NULL OR weight_grams >= 0)
);

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS product_id          uuid;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS name                text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS sku                 text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS price               numeric(12, 2);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS compare_at_price    numeric(12, 2);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS stock_count         integer DEFAULT 0;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS weight_grams        integer;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS barcode             text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS position            integer DEFAULT 0;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS attributes          jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_default          boolean DEFAULT false;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS created_at          timestamptz DEFAULT now();
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS updated_at          timestamptz DEFAULT now();

CREATE INDEX        IF NOT EXISTS product_variants_product_id_idx ON public.product_variants (product_id);
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_uidx       ON public.product_variants (sku) WHERE sku IS NOT NULL;
CREATE INDEX        IF NOT EXISTS product_variants_position_idx   ON public.product_variants (product_id, position);
CREATE INDEX        IF NOT EXISTS product_variants_low_stock_idx  ON public.product_variants (product_id)
  WHERE stock_count <= low_stock_threshold;
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_one_default_uidx
  ON public.product_variants (product_id) WHERE is_default = true;

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_variants_public_read_active" ON public.product_variants;
DROP POLICY IF EXISTS "product_variants_staff_read_all"     ON public.product_variants;
DROP POLICY IF EXISTS "product_variants_staff_insert"       ON public.product_variants;
DROP POLICY IF EXISTS "product_variants_staff_update"       ON public.product_variants;
DROP POLICY IF EXISTS "product_variants_admin_delete"       ON public.product_variants;

CREATE POLICY "product_variants_public_read_active"
  ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.status = 'active'
    )
  );

CREATE POLICY "product_variants_staff_read_all"
  ON public.product_variants
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin','manager','marketing','sale'));

CREATE POLICY "product_variants_staff_insert"
  ON public.product_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin','manager','marketing'));

CREATE POLICY "product_variants_staff_update"
  ON public.product_variants
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() IN ('admin','manager','marketing'))
  WITH CHECK (public.current_user_role() IN ('admin','manager','marketing'));

CREATE POLICY "product_variants_admin_delete"
  ON public.product_variants
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');


-- ============================================================================
-- WEEK 1 MIGRATION :: 6) carts (shopping cart for guest + authenticated user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.carts (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_token   text UNIQUE,
  currency     text NOT NULL DEFAULT 'VND',
  subtotal     numeric(14,2) NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'active',
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS cart_token  text;
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS currency    text NOT NULL DEFAULT 'VND';
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS subtotal    numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'active';
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS expires_at  timestamptz;
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_status_check') THEN
    ALTER TABLE public.carts
      ADD CONSTRAINT carts_status_check
      CHECK (status IN ('active','converted','abandoned','expired'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_owner_check') THEN
    ALTER TABLE public.carts
      ADD CONSTRAINT carts_owner_check
      CHECK (user_id IS NOT NULL OR cart_token IS NOT NULL);
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS carts_cart_token_uidx
  ON public.carts (cart_token) WHERE cart_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS carts_user_active_uidx
  ON public.carts (user_id) WHERE status = 'active' AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS carts_user_id_idx    ON public.carts (user_id);
CREATE INDEX IF NOT EXISTS carts_status_idx     ON public.carts (status);
CREATE INDEX IF NOT EXISTS carts_expires_at_idx ON public.carts (expires_at) WHERE expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS carts_set_updated_at ON public.carts;
CREATE TRIGGER carts_set_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS carts_select_own ON public.carts;
CREATE POLICY carts_select_own ON public.carts
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (cart_token IS NOT NULL AND cart_token = current_setting('request.cart_token', true))
  );

DROP POLICY IF EXISTS carts_insert_own ON public.carts;
CREATE POLICY carts_insert_own ON public.carts
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (user_id IS NULL AND cart_token IS NOT NULL
        AND cart_token = current_setting('request.cart_token', true))
  );

DROP POLICY IF EXISTS carts_update_own ON public.carts;
CREATE POLICY carts_update_own ON public.carts
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (cart_token IS NOT NULL AND cart_token = current_setting('request.cart_token', true))
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (cart_token IS NOT NULL AND cart_token = current_setting('request.cart_token', true))
  );

DROP POLICY IF EXISTS carts_delete_own ON public.carts;
CREATE POLICY carts_delete_own ON public.carts
  FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (cart_token IS NOT NULL AND cart_token = current_setting('request.cart_token', true))
  );

DROP POLICY IF EXISTS carts_admin_all ON public.carts;
CREATE POLICY carts_admin_all ON public.carts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','manager')
    )
  );


-- ============================================================================
-- WEEK 1 MIGRATION :: 7) cart_items (line items in a cart)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cart_items (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id           uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id        uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity          integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price        numeric(14,2) NOT NULL DEFAULT 0,
  product_snapshot  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS variant_id       uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS quantity         integer NOT NULL DEFAULT 1;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS unit_price       numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS created_at       timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_quantity_check') THEN
    ALTER TABLE public.cart_items
      ADD CONSTRAINT cart_items_quantity_check CHECK (quantity > 0);
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_cart_variant_uidx
  ON public.cart_items (cart_id, variant_id) WHERE variant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_cart_product_no_variant_uidx
  ON public.cart_items (cart_id, product_id) WHERE variant_id IS NULL;

CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx    ON public.cart_items (cart_id);
CREATE INDEX IF NOT EXISTS cart_items_product_id_idx ON public.cart_items (product_id);
CREATE INDEX IF NOT EXISTS cart_items_variant_id_idx ON public.cart_items (variant_id) WHERE variant_id IS NOT NULL;

DROP TRIGGER IF EXISTS cart_items_set_updated_at ON public.cart_items;
CREATE TRIGGER cart_items_set_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-recompute carts.subtotal whenever cart_items change
CREATE OR REPLACE FUNCTION public.tg_recompute_cart_subtotal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_cart_id uuid;
BEGIN
  v_cart_id := COALESCE(NEW.cart_id, OLD.cart_id);
  UPDATE public.carts c
     SET subtotal = COALESCE((
           SELECT SUM(ci.quantity * ci.unit_price)
             FROM public.cart_items ci
            WHERE ci.cart_id = v_cart_id
         ), 0),
         updated_at = now()
   WHERE c.id = v_cart_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS cart_items_recompute_subtotal ON public.cart_items;
CREATE TRIGGER cart_items_recompute_subtotal
  AFTER INSERT OR UPDATE OR DELETE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_cart_subtotal();

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cart_items_select_own ON public.cart_items;
CREATE POLICY cart_items_select_own ON public.cart_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND (
          (auth.uid() IS NOT NULL AND c.user_id = auth.uid())
          OR (c.cart_token IS NOT NULL
              AND c.cart_token = current_setting('request.cart_token', true))
        )
    )
  );

DROP POLICY IF EXISTS cart_items_insert_own ON public.cart_items;
CREATE POLICY cart_items_insert_own ON public.cart_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND (
          (auth.uid() IS NOT NULL AND c.user_id = auth.uid())
          OR (c.cart_token IS NOT NULL
              AND c.cart_token = current_setting('request.cart_token', true))
        )
    )
  );

DROP POLICY IF EXISTS cart_items_update_own ON public.cart_items;
CREATE POLICY cart_items_update_own ON public.cart_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND (
          (auth.uid() IS NOT NULL AND c.user_id = auth.uid())
          OR (c.cart_token IS NOT NULL
              AND c.cart_token = current_setting('request.cart_token', true))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND (
          (auth.uid() IS NOT NULL AND c.user_id = auth.uid())
          OR (c.cart_token IS NOT NULL
              AND c.cart_token = current_setting('request.cart_token', true))
        )
    )
  );

DROP POLICY IF EXISTS cart_items_delete_own ON public.cart_items;
CREATE POLICY cart_items_delete_own ON public.cart_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND (
          (auth.uid() IS NOT NULL AND c.user_id = auth.uid())
          OR (c.cart_token IS NOT NULL
              AND c.cart_token = current_setting('request.cart_token', true))
        )
    )
  );

DROP POLICY IF EXISTS cart_items_admin_all ON public.cart_items;
CREATE POLICY cart_items_admin_all ON public.cart_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','manager')
    )
  );


-- ============================================================================
-- WEEK 1 MIGRATION :: 8) orders extension (physical-order columns)
-- Adds columns to existing orders table; does NOT recreate it.
-- ============================================================================

-- Skip the entire extension block if orders table does not exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    RAISE NOTICE 'Table public.orders does not exist; skipping orders extension. Run base orders migration first.';
    RETURN;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'course';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'orders_order_type_check'
        AND conrelid = 'public.orders'::regclass
    ) THEN
      ALTER TABLE public.orders DROP CONSTRAINT orders_order_type_check;
    END IF;

    ALTER TABLE public.orders
      ADD CONSTRAINT orders_order_type_check
      CHECK (order_type IN ('course','physical','mixed'));
  END IF;
END $$;

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS shipping_full_name     text,
  ADD COLUMN IF NOT EXISTS shipping_phone         text,
  ADD COLUMN IF NOT EXISTS shipping_address_line  text,
  ADD COLUMN IF NOT EXISTS shipping_ward_code     text,
  ADD COLUMN IF NOT EXISTS shipping_province_code text,
  ADD COLUMN IF NOT EXISTS shipping_notes         text,
  ADD COLUMN IF NOT EXISTS shipping_fee           numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_carrier       text,
  ADD COLUMN IF NOT EXISTS shipping_status        text,
  ADD COLUMN IF NOT EXISTS weight_grams_total     integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname='orders_shipping_ward_code_fkey'
                   AND conrelid='public.orders'::regclass) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_shipping_ward_code_fkey
      FOREIGN KEY (shipping_ward_code) REFERENCES public.vn_wards(code)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname='orders_shipping_province_code_fkey'
                   AND conrelid='public.orders'::regclass) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_shipping_province_code_fkey
      FOREIGN KEY (shipping_province_code) REFERENCES public.vn_provinces(code)
      ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint
             WHERE conname='orders_shipping_carrier_check'
               AND conrelid='public.orders'::regclass) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_shipping_carrier_check;
  END IF;
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_shipping_carrier_check
    CHECK (shipping_carrier IS NULL OR shipping_carrier IN ('ghn','ghtk','jt','vnpost','self'));

  IF EXISTS (SELECT 1 FROM pg_constraint
             WHERE conname='orders_shipping_status_check'
               AND conrelid='public.orders'::regclass) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_shipping_status_check;
  END IF;
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_shipping_status_check
    CHECK (shipping_status IS NULL OR shipping_status IN
      ('pending','confirmed','picked_up','transit','delivered','returned','cancelled'));
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    CREATE INDEX IF NOT EXISTS idx_orders_order_type        ON public.orders(order_type);
    CREATE INDEX IF NOT EXISTS idx_orders_shipping_status   ON public.orders(shipping_status)
      WHERE shipping_status IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_shipping_province ON public.orders(shipping_province_code)
      WHERE shipping_province_code IS NOT NULL;
  END IF;
END $$;


-- ============================================================================
-- WEEK 1 MIGRATION :: 9) order_items (multi-line orders, supports mixed cart)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         uuid NOT NULL,
  product_id       uuid,
  variant_id       uuid,
  course_id        uuid,
  item_type        text NOT NULL DEFAULT 'physical',
  name             text NOT NULL,
  unit_price       numeric(12,2) NOT NULL DEFAULT 0,
  quantity         integer       NOT NULL DEFAULT 1,
  total_price      numeric(12,2) NOT NULL DEFAULT 0,
  weight_grams     integer       NOT NULL DEFAULT 0,
  product_snapshot jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT order_items_item_type_check CHECK (item_type IN ('course','physical','digital')),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)
);

-- FK order_items.order_id -> orders(id) (added only if orders exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='orders')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conname='order_items_order_id_fkey'
                       AND conrelid='public.order_items'::regclass) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='products')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conname='order_items_product_id_fkey'
                       AND conrelid='public.order_items'::regclass) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='product_variants')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conname='order_items_variant_id_fkey'
                       AND conrelid='public.order_items'::regclass) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='courses')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conname='order_items_course_id_fkey'
                       AND conrelid='public.order_items'::regclass) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_course_id  ON public.order_items(course_id)  WHERE course_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_item_type  ON public.order_items(item_type);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_owner_or_staff" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_staff"          ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_staff"          ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_admin"          ON public.order_items;

CREATE POLICY "order_items_select_owner_or_staff"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin','manager','sale','marketing')
        )
      )
  )
);

CREATE POLICY "order_items_insert_staff"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','manager','sale')
  )
);

CREATE POLICY "order_items_update_staff"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','manager','sale')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','manager','sale')
  )
);

CREATE POLICY "order_items_delete_admin"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);


-- ============================================================================
-- WEEK 1 MIGRATION :: 10) shipments (carrier delivery state machine)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  carrier text NOT NULL,
  carrier_order_code text,
  tracking_url text,
  label_url text,
  shipping_fee numeric(12,2) DEFAULT 0,
  weight_grams integer,
  service_type_code text,
  expected_delivery_date timestamptz,
  actual_delivery_date timestamptz,
  status text NOT NULL DEFAULT 'created',
  last_synced_at timestamptz,
  raw_carrier_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipments_carrier_check CHECK (carrier IN ('ghn','ghtk','jt','manual')),
  CONSTRAINT shipments_status_check  CHECK (status IN ('created','picked_up','in_transit','delivered','returned','cancelled')),
  CONSTRAINT shipments_weight_check  CHECK (weight_grams IS NULL OR weight_grams >= 0),
  CONSTRAINT shipments_fee_check     CHECK (shipping_fee >= 0)
);

ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS order_id uuid;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS carrier_order_code text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS label_url text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipping_fee numeric(12,2) DEFAULT 0;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS weight_grams integer;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS service_type_code text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS expected_delivery_date timestamptz;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS actual_delivery_date timestamptz;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS status text DEFAULT 'created';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS raw_carrier_response jsonb;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='orders')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conname='shipments_order_id_fkey'
                       AND conrelid='public.shipments'::regclass) THEN
    ALTER TABLE public.shipments
      ADD CONSTRAINT shipments_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shipments_order_id           ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier_order_code ON public.shipments(carrier_order_code);
CREATE INDEX IF NOT EXISTS idx_shipments_status             ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier            ON public.shipments(carrier);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipments_carrier_code
  ON public.shipments(carrier, carrier_order_code)
  WHERE carrier_order_code IS NOT NULL;

DROP TRIGGER IF EXISTS trg_shipments_updated_at ON public.shipments;
CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipments_select_owner" ON public.shipments;
CREATE POLICY "shipments_select_owner" ON public.shipments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = shipments.order_id
        AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "shipments_select_staff" ON public.shipments;
CREATE POLICY "shipments_select_staff" ON public.shipments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','manager','sale')
    )
  );

DROP POLICY IF EXISTS "shipments_insert_staff" ON public.shipments;
CREATE POLICY "shipments_insert_staff" ON public.shipments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','manager','sale')
    )
  );

DROP POLICY IF EXISTS "shipments_update_staff" ON public.shipments;
CREATE POLICY "shipments_update_staff" ON public.shipments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','manager','sale')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','manager','sale')
    )
  );

DROP POLICY IF EXISTS "shipments_delete_admin" ON public.shipments;
CREATE POLICY "shipments_delete_admin" ON public.shipments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ============================================================================
-- WEEK 1 MIGRATION :: 11) shipment_events (lifecycle log from carrier webhooks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shipment_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  event_code text NOT NULL,
  event_description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS shipment_id uuid;
ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS event_code text;
ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS event_description text;
ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS occurred_at timestamptz DEFAULT now();
ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS raw_event jsonb;
ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id ON public.shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_occurred_at ON public.shipment_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipment_events_event_code  ON public.shipment_events(event_code);

ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipment_events_select_owner" ON public.shipment_events;
CREATE POLICY "shipment_events_select_owner" ON public.shipment_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      JOIN public.orders o ON o.id = s.order_id
      WHERE s.id = shipment_events.shipment_id
        AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "shipment_events_select_staff" ON public.shipment_events;
CREATE POLICY "shipment_events_select_staff" ON public.shipment_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','manager','sale')
    )
  );

DROP POLICY IF EXISTS "shipment_events_insert_staff" ON public.shipment_events;
CREATE POLICY "shipment_events_insert_staff" ON public.shipment_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','manager','sale')
    )
  );


-- ============================================================================
-- WEEK 1 MIGRATION :: 12) SEED DATA (Vietnam addresses + categories + products)
-- ============================================================================

-- ---- VN address samples: HN, HCM, DN + 13 wards total ----
INSERT INTO public.vn_provinces (code, name, name_en, code_name, division_type, phone_code) VALUES
    ('01', 'Thanh pho Ha Noi',      'Ha Noi City',        'ha_noi',      'thanh pho trung uong', 24),
    ('79', 'Thanh pho Ho Chi Minh', 'Ho Chi Minh City',   'ho_chi_minh', 'thanh pho trung uong', 28),
    ('48', 'Thanh pho Da Nang',     'Da Nang City',       'da_nang',     'thanh pho trung uong', 236)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.vn_wards (code, name, name_en, code_name, division_type, province_code) VALUES
    ('00001', 'Phuong Phuc Xa',          'Phuc Xa Ward',          'phuong_phuc_xa',          'phuong', '01'),
    ('00004', 'Phuong Truc Bach',        'Truc Bach Ward',        'phuong_truc_bach',        'phuong', '01'),
    ('00006', 'Phuong Vinh Phuc',        'Vinh Phuc Ward',        'phuong_vinh_phuc',        'phuong', '01'),
    ('00007', 'Phuong Cong Vi',          'Cong Vi Ward',          'phuong_cong_vi',          'phuong', '01'),
    ('00008', 'Phuong Lieu Giai',        'Lieu Giai Ward',        'phuong_lieu_giai',        'phuong', '01'),
    ('26734', 'Phuong Ben Nghe',         'Ben Nghe Ward',         'phuong_ben_nghe',         'phuong', '79'),
    ('26737', 'Phuong Ben Thanh',        'Ben Thanh Ward',        'phuong_ben_thanh',        'phuong', '79'),
    ('26740', 'Phuong Nguyen Thai Binh', 'Nguyen Thai Binh Ward', 'phuong_nguyen_thai_binh', 'phuong', '79'),
    ('26743', 'Phuong Pham Ngu Lao',     'Pham Ngu Lao Ward',     'phuong_pham_ngu_lao',     'phuong', '79'),
    ('26746', 'Phuong Cau Ong Lanh',     'Cau Ong Lanh Ward',     'phuong_cau_ong_lanh',     'phuong', '79'),
    ('20194', 'Phuong Thanh Binh',       'Thanh Binh Ward',       'phuong_thanh_binh',       'phuong', '48'),
    ('20195', 'Phuong Thuan Phuoc',      'Thuan Phuoc Ward',      'phuong_thuan_phuoc',      'phuong', '48'),
    ('20197', 'Phuong Thach Thang',      'Thach Thang Ward',      'phuong_thach_thang',      'phuong', '48')
ON CONFLICT (code) DO NOTHING;

-- ---- Product categories (root + children) ----
INSERT INTO public.product_categories (id, slug, name, description, parent_id, position, is_visible) VALUES
    ('11111111-1111-1111-1111-111111110001', 'sach',                'Sach',                'Sach in giay va ebook',                NULL, 1, true),
    ('11111111-1111-1111-1111-111111110002', 'merch',               'Merchandise',         'San pham luu niem, qua tang',          NULL, 2, true),
    ('11111111-1111-1111-1111-111111110011', 'sach-phat-trien-ban-than', 'Sach phat trien ban than', 'Self-help, tu duy', '11111111-1111-1111-1111-111111110001', 1, true),
    ('11111111-1111-1111-1111-111111110012', 'sach-kinh-doanh',     'Sach kinh doanh',     'Khoi nghiep, marketing, lanh dao',     '11111111-1111-1111-1111-111111110001', 2, true),
    ('11111111-1111-1111-1111-111111110021', 'ao-thun',             'Ao thun',             'Ao thun in logo',                       '11111111-1111-1111-1111-111111110002', 1, true),
    ('11111111-1111-1111-1111-111111110022', 'so-tay',              'So tay',              'So tay, planner',                       '11111111-1111-1111-1111-111111110002', 2, true)
ON CONFLICT (slug) DO NOTHING;

-- ---- 5 books + 5 merch products ----
INSERT INTO public.products (
    id, slug, name, short_description, sku, price, compare_at_price, cost,
    product_type, status, thumbnail_url, weight_grams, dimensions_cm, tags, category_id, published_at
) VALUES
    -- BOOKS (5)
    ('22222222-2222-2222-2222-000000000001', 'tu-duy-nguoc-dong',
     'Tu duy nguoc dong', 'Cuon sach ve tu duy phan bien va chu dong',
     'BOOK-TDNG-001', 189000, 240000, 95000,
     'book', 'active', 'https://cdn.example.com/books/tu-duy-nguoc-dong.jpg',
     350, '{"length": 20.5, "width": 14.5, "height": 2.0}'::jsonb,
     ARRAY['tu-duy','self-help','best-seller'],
     '11111111-1111-1111-1111-111111110011', now()),

    ('22222222-2222-2222-2222-000000000002', 'thoi-quen-nguyen-tu',
     'Thoi quen nguyen tu', 'Phuong phap xay dung thoi quen tot moi ngay',
     'BOOK-TQNT-002', 219000, 280000, 110000,
     'book', 'active', 'https://cdn.example.com/books/thoi-quen-nguyen-tu.jpg',
     420, '{"length": 20.5, "width": 14.5, "height": 2.5}'::jsonb,
     ARRAY['thoi-quen','self-help'],
     '11111111-1111-1111-1111-111111110011', now()),

    ('22222222-2222-2222-2222-000000000003', 'khoi-nghiep-tinh-gon',
     'Khoi nghiep tinh gon', 'Lean Startup phien ban Viet Nam',
     'BOOK-KNTG-003', 259000, 320000, 130000,
     'book', 'active', 'https://cdn.example.com/books/khoi-nghiep-tinh-gon.jpg',
     480, '{"length": 21.0, "width": 14.8, "height": 3.0}'::jsonb,
     ARRAY['khoi-nghiep','kinh-doanh','lean'],
     '11111111-1111-1111-1111-111111110012', now()),

    ('22222222-2222-2222-2222-000000000004', 'marketing-3-0',
     'Marketing 3.0', 'Tu san pham den khach hang den tinh than',
     'BOOK-MK30-004', 195000, 250000, 100000,
     'book', 'active', 'https://cdn.example.com/books/marketing-30.jpg',
     400, '{"length": 20.5, "width": 14.5, "height": 2.3}'::jsonb,
     ARRAY['marketing','kinh-doanh'],
     '11111111-1111-1111-1111-111111110012', now()),

    ('22222222-2222-2222-2222-000000000005', 'lanh-dao-don-gian',
     'Lanh dao don gian', 'Nguyen tac lanh dao thuc dung cho manager moi',
     'BOOK-LDDG-005', 229000, 290000, 115000,
     'book', 'active', 'https://cdn.example.com/books/lanh-dao-don-gian.jpg',
     440, '{"length": 20.5, "width": 14.5, "height": 2.6}'::jsonb,
     ARRAY['lanh-dao','quan-tri','kinh-doanh'],
     '11111111-1111-1111-1111-111111110012', now()),

    -- MERCH (5)
    ('22222222-2222-2222-2222-000000000101', 'ao-thun-logo-classic',
     'Ao thun logo classic', 'Ao thun cotton 100%, in logo thuong hieu',
     'MERCH-TS-CL-101', 290000, 350000, 120000,
     'merch', 'active', 'https://cdn.example.com/merch/ao-thun-classic.jpg',
     220, '{"length": 30, "width": 25, "height": 2}'::jsonb,
     ARRAY['ao-thun','merch','classic'],
     '11111111-1111-1111-1111-111111110021', now()),

    ('22222222-2222-2222-2222-000000000102', 'ao-thun-mua-he',
     'Ao thun mua he', 'Ao thun mong mat, phu hop mua nong',
     'MERCH-TS-SM-102', 270000, 320000, 110000,
     'merch', 'active', 'https://cdn.example.com/merch/ao-thun-mua-he.jpg',
     200, '{"length": 30, "width": 25, "height": 2}'::jsonb,
     ARRAY['ao-thun','merch','summer'],
     '11111111-1111-1111-1111-111111110021', now()),

    ('22222222-2222-2222-2222-000000000103', 'so-tay-planner-2026',
     'So tay Planner 2026', 'Planner 365 ngay, bia cung, giay kraft',
     'MERCH-NB-PL26-103', 320000, 400000, 140000,
     'merch', 'active', 'https://cdn.example.com/merch/planner-2026.jpg',
     520, '{"length": 21, "width": 15, "height": 2.5}'::jsonb,
     ARRAY['so-tay','planner','2026'],
     '11111111-1111-1111-1111-111111110022', now()),

    ('22222222-2222-2222-2222-000000000104', 'so-tay-notes-A5',
     'So tay Notes A5', 'So ke dong A5, 200 trang giay 80gsm',
     'MERCH-NB-A5-104', 150000, 190000, 60000,
     'merch', 'active', 'https://cdn.example.com/merch/notes-a5.jpg',
     280, '{"length": 21, "width": 14.8, "height": 1.5}'::jsonb,
     ARRAY['so-tay','notes','a5'],
     '11111111-1111-1111-1111-111111110022', now()),

    ('22222222-2222-2222-2222-000000000105', 'tui-tote-canvas',
     'Tui tote canvas', 'Tui vai canvas in logo, ben va tien dung',
     'MERCH-BAG-TT-105', 180000, 220000, 75000,
     'merch', 'active', 'https://cdn.example.com/merch/tui-tote.jpg',
     180, '{"length": 38, "width": 35, "height": 1}'::jsonb,
     ARRAY['tui','tote','canvas'],
     '11111111-1111-1111-1111-111111110002', now())
ON CONFLICT (slug) DO NOTHING;

-- ---- Variants (default variant for each product + size/color variants for merch) ----
INSERT INTO public.product_variants (
    id, product_id, name, sku, price, stock_count, weight_grams, position, attributes, is_default
) VALUES
    -- Books: 1 default variant per book
    ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000001', 'Bia mem', 'BOOK-TDNG-001-PB', 189000, 50, 350, 0, '{"format": "paperback"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000002', '22222222-2222-2222-2222-000000000002', 'Bia mem', 'BOOK-TQNT-002-PB', 219000, 60, 420, 0, '{"format": "paperback"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000003', '22222222-2222-2222-2222-000000000003', 'Bia mem', 'BOOK-KNTG-003-PB', 259000, 40, 480, 0, '{"format": "paperback"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000004', '22222222-2222-2222-2222-000000000004', 'Bia mem', 'BOOK-MK30-004-PB',  195000, 45, 400, 0, '{"format": "paperback"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000005', '22222222-2222-2222-2222-000000000005', 'Bia mem', 'BOOK-LDDG-005-PB', 229000, 35, 440, 0, '{"format": "paperback"}'::jsonb, true),

    -- Ao thun classic: 3 sizes
    ('33333333-3333-3333-3333-000000000101', '22222222-2222-2222-2222-000000000101', 'Size M / Den', 'MERCH-TS-CL-101-M-BK', 290000, 30, 220, 0, '{"size":"M","color":"black"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000102', '22222222-2222-2222-2222-000000000101', 'Size L / Den', 'MERCH-TS-CL-101-L-BK', 290000, 25, 240, 1, '{"size":"L","color":"black"}'::jsonb, false),
    ('33333333-3333-3333-3333-000000000103', '22222222-2222-2222-2222-000000000101', 'Size XL / Den', 'MERCH-TS-CL-101-XL-BK', 290000, 15, 260, 2, '{"size":"XL","color":"black"}'::jsonb, false),

    -- Ao thun mua he: 2 colors
    ('33333333-3333-3333-3333-000000000111', '22222222-2222-2222-2222-000000000102', 'Trang Size M', 'MERCH-TS-SM-102-M-WH', 270000, 20, 200, 0, '{"size":"M","color":"white"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000112', '22222222-2222-2222-2222-000000000102', 'Xanh Size M',  'MERCH-TS-SM-102-M-BL', 270000, 18, 200, 1, '{"size":"M","color":"blue"}'::jsonb, false),

    -- Planner 2026: 1 default
    ('33333333-3333-3333-3333-000000000121', '22222222-2222-2222-2222-000000000103', 'Bia kraft', 'MERCH-NB-PL26-103-K', 320000, 40, 520, 0, '{"cover":"kraft"}'::jsonb, true),

    -- Notes A5: 2 colors
    ('33333333-3333-3333-3333-000000000131', '22222222-2222-2222-2222-000000000104', 'Den', 'MERCH-NB-A5-104-BK', 150000, 60, 280, 0, '{"color":"black"}'::jsonb, true),
    ('33333333-3333-3333-3333-000000000132', '22222222-2222-2222-2222-000000000104', 'Nau', 'MERCH-NB-A5-104-BR', 150000, 50, 280, 1, '{"color":"brown"}'::jsonb, false),

    -- Tote bag: 1 default
    ('33333333-3333-3333-3333-000000000141', '22222222-2222-2222-2222-000000000105', 'Trang tu nhien', 'MERCH-BAG-TT-105-NT', 180000, 80, 180, 0, '{"color":"natural"}'::jsonb, true)
ON CONFLICT (sku) DO NOTHING;

-- ============================================================================
-- END OF WEEK 1 MIGRATION :: e-commerce foundation
-- ============================================================================
