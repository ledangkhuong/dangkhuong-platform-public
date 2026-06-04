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


