-- Extend auto_update_crm_on_paid_order to also propagate assigned_to
-- into profiles.account_manager_id when the user exists and is unassigned.
--
-- Previously the trigger only updated crm_contacts. This adds a third
-- UPDATE block so that paying an order with a sale assignment also sets
-- the buyer's profile account_manager_id (if not already set).

CREATE OR REPLACE FUNCTION auto_update_crm_on_paid_order()
RETURNS trigger AS $$
BEGIN
  -- Only run when order transitions to 'paid'
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'paid') THEN
    -- 1. Update journey, lifetime_value, total_orders on the CRM contact
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

    -- 2. Propagate order's assigned_to to contact if contact is currently unassigned
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

    -- 3. Propagate to profiles.account_manager_id if user exists and is unassigned
    IF NEW.assigned_to IS NOT NULL AND NEW.user_id IS NOT NULL THEN
      UPDATE profiles
      SET account_manager_id = NEW.assigned_to
      WHERE id = NEW.user_id
        AND account_manager_id IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
