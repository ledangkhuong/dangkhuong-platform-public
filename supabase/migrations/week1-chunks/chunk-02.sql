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


