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


