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


