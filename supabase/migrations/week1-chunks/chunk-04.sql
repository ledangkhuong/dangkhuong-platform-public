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


