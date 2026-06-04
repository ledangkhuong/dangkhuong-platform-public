-- Expand CHECK constraints for assignment tracking
-- Previous constraint on crm_contacts.assignment_method was too narrow:
--   ('manual','round_robin','rule_based')
-- New values needed: 'sticky' (inherited from existing contact/order),
--                     'sync' (from syncContactsFromOrders), 'auto' (from trigger)

-- 1. Expand crm_contacts.assignment_method CHECK constraint
ALTER TABLE crm_contacts
  DROP CONSTRAINT IF EXISTS crm_contacts_assignment_method_check;

ALTER TABLE crm_contacts
  ADD CONSTRAINT crm_contacts_assignment_method_check
  CHECK (assignment_method IN ('manual','round_robin','rule_based','sticky','sync','auto'));

-- 2. Expand crm_lead_assignment_log.method CHECK constraint
-- Previous: ('manual','round_robin','rule_based')
-- Adding: 'sticky', 'sync', 'auto'
ALTER TABLE crm_lead_assignment_log
  DROP CONSTRAINT IF EXISTS crm_lead_assignment_log_method_check;

ALTER TABLE crm_lead_assignment_log
  ADD CONSTRAINT crm_lead_assignment_log_method_check
  CHECK (method IN ('manual','round_robin','rule_based','sticky','sync','auto'));

-- 3. Add missing index on orders.customer_email for cascade lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_email
  ON public.orders(LOWER(customer_email));

-- 4. Add missing column course_interests.assigned_to if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_interests'
      AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.course_interests
      ADD COLUMN assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
    CREATE INDEX idx_course_interests_assigned ON public.course_interests(assigned_to);
  END IF;
END $$;

-- 5. Update auto_update_crm_on_paid_order trigger to also propagate assigned_to
CREATE OR REPLACE FUNCTION auto_update_crm_on_paid_order()
RETURNS trigger AS $$
BEGIN
  -- Only run when order transitions to 'paid'
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'paid') THEN
    -- Update journey, lifetime_value, total_orders
    UPDATE crm_contacts
    SET
      journey_stage = CASE
        WHEN journey_stage IN ('visitor','lead','contacted','qualified','negotiation')
        THEN 'customer'
        ELSE journey_stage
      END,
      lifetime_value = COALESCE(lifetime_value, 0) + COALESCE(NEW.amount, 0),
      total_orders = COALESCE(total_orders, 0) + 1,
      converted_at = COALESCE(converted_at, now()),
      status = CASE
        WHEN status IN ('new','contacted','qualified','negotiation')
        THEN 'won'
        ELSE status
      END,
      updated_at = now()
    WHERE email = LOWER(NEW.customer_email)
      AND NEW.customer_email IS NOT NULL;

    -- Propagate order's assigned_to to contact if contact is currently unassigned
    IF NEW.assigned_to IS NOT NULL THEN
      UPDATE crm_contacts
      SET
        assigned_to = NEW.assigned_to,
        assigned_at = now(),
        assignment_method = 'auto'
      WHERE email = LOWER(NEW.customer_email)
        AND NEW.customer_email IS NOT NULL
        AND assigned_to IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
