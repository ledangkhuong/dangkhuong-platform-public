-- =====================================================
-- CRM Professional Upgrade: Journey Tracking, Attribution,
-- Lead Assignment, Sales Performance, Recommendations
-- =====================================================

-- ─── 1. ALTER crm_contacts: Journey & Attribution ───────────

-- Journey tracking
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS journey_stage text DEFAULT 'lead'
  CHECK (journey_stage IN ('visitor','lead','contacted','qualified','negotiation','customer','advocate'));
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS lifetime_value integer DEFAULT 0;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS first_seen_at timestamptz;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS converted_at timestamptz;

-- Marketing attribution (first-touch)
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS first_page text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS referrer text;

-- Lead assignment metadata
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS assignment_method text DEFAULT 'manual'
  CHECK (assignment_method IN ('manual','round_robin','rule_based'));
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- Lead scoring
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_contacts_journey ON crm_contacts(journey_stage);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_ltv ON crm_contacts(lifetime_value DESC);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_utm ON crm_contacts(utm_source, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_assigned_at ON crm_contacts(assigned_to, assigned_at);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_lead_score ON crm_contacts(lead_score DESC);

-- ─── 2. ALTER crm_activities: Richer types ─────────────────

ALTER TABLE crm_activities DROP CONSTRAINT IF EXISTS crm_activities_type_check;
ALTER TABLE crm_activities ADD CONSTRAINT crm_activities_type_check
  CHECK (type IN ('note','call','email','meeting','task','status_change','journey_change','purchase','enrollment','page_view','form_submit','assignment'));
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES crm_deals(id) ON DELETE SET NULL;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS due_at timestamptz;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

-- ─── 3. NEW: Lead Assignment Rules ─────────────────────────

CREATE TABLE IF NOT EXISTS public.crm_lead_assignment_rules (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  -- conditions: {"source": "ads", "utm_campaign": "fb_retarget", "utm_source": "facebook"}
  conditions jsonb NOT NULL DEFAULT '{}',
  assign_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- 'specific' = assign to assign_to, 'round_robin_pool' = rotate among pool_members
  assignment_method text DEFAULT 'specific' CHECK (assignment_method IN ('specific','round_robin_pool')),
  pool_members uuid[] DEFAULT '{}',
  last_assigned_index integer DEFAULT 0, -- for round-robin tracking
  created_at timestamptz DEFAULT now()
);

-- ─── 4. NEW: Lead Assignment Log ───────────────────────────

CREATE TABLE IF NOT EXISTS public.crm_lead_assignment_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL, -- null = auto-assigned
  method text NOT NULL CHECK (method IN ('manual','round_robin','rule_based')),
  rule_id uuid REFERENCES crm_lead_assignment_rules(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignment_log_contact ON crm_lead_assignment_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_assignment_log_rep ON crm_lead_assignment_log(assigned_to, created_at);

-- ─── 5. NEW: Next Actions (Tasks/Reminders for Sales) ──────

CREATE TABLE IF NOT EXISTS public.crm_next_actions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES crm_deals(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('follow_up','demo_schedule','send_info','upsell','re_engage','check_in','custom')),
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_at timestamptz,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_auto_generated boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_next_actions_contact ON crm_next_actions(contact_id);
CREATE INDEX IF NOT EXISTS idx_next_actions_assigned ON crm_next_actions(assigned_to, status, due_at);
CREATE INDEX IF NOT EXISTS idx_next_actions_due ON crm_next_actions(due_at) WHERE status = 'pending';

-- ─── 6. NEW: Course Recommendations ────────────────────────

CREATE TABLE IF NOT EXISTS public.crm_course_recommendations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reason text,
  score integer DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  status text DEFAULT 'suggested' CHECK (status IN ('suggested','sent','accepted','declined')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_contact ON crm_course_recommendations(contact_id);

-- ─── 7. RLS Policies for New Tables ────────────────────────

ALTER TABLE crm_lead_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_assignment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_next_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_course_recommendations ENABLE ROW LEVEL SECURITY;

-- Assignment Rules: admin/manager only
CREATE POLICY "assignment_rules_admin" ON crm_lead_assignment_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );

-- Assignment Log: staff can read
CREATE POLICY "assignment_log_select_staff" ON crm_lead_assignment_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','sale','support','marketing'))
  );
CREATE POLICY "assignment_log_insert_staff" ON crm_lead_assignment_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','sale'))
  );

-- Next Actions: staff can CRUD
CREATE POLICY "next_actions_select_staff" ON crm_next_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','sale','support','marketing'))
  );
CREATE POLICY "next_actions_insert_staff" ON crm_next_actions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','sale','support'))
  );
CREATE POLICY "next_actions_update_staff" ON crm_next_actions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','sale','support'))
  );
CREATE POLICY "next_actions_delete_admin" ON crm_next_actions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );

-- Course Recommendations: staff can CRUD
CREATE POLICY "recommendations_select_staff" ON crm_course_recommendations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','sale','support','marketing'))
  );
CREATE POLICY "recommendations_insert_staff" ON crm_course_recommendations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','sale'))
  );
CREATE POLICY "recommendations_update_staff" ON crm_course_recommendations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','sale'))
  );
CREATE POLICY "recommendations_delete_admin" ON crm_course_recommendations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );

-- ─── 8. Auto-update Journey on Paid Order ──────────────────

CREATE OR REPLACE FUNCTION auto_update_crm_on_paid_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on status change to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Update crm_contacts matching by email
    UPDATE crm_contacts
    SET
      journey_stage = CASE
        WHEN journey_stage IN ('visitor','lead','contacted','qualified','negotiation') THEN 'customer'
        ELSE journey_stage
      END,
      lifetime_value = lifetime_value + COALESCE(NEW.amount, 0),
      total_orders = total_orders + 1,
      converted_at = COALESCE(converted_at, now()),
      updated_at = now()
    WHERE email = LOWER(NEW.customer_email)
      AND NEW.customer_email IS NOT NULL;

    -- Also update status to 'won' if still in early stages
    UPDATE crm_contacts
    SET status = 'won'
    WHERE email = LOWER(NEW.customer_email)
      AND NEW.customer_email IS NOT NULL
      AND status IN ('new','contacted','qualified','negotiation');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists, then create
DROP TRIGGER IF EXISTS trigger_crm_on_paid_order ON orders;
CREATE TRIGGER trigger_crm_on_paid_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_crm_on_paid_order();

-- ─── 9. Sales Performance View ─────────────────────────────

CREATE OR REPLACE VIEW public.crm_sales_performance AS
SELECT
  p.id as rep_id,
  p.full_name as rep_name,
  p.avatar_url as rep_avatar,
  -- Contacts
  COUNT(DISTINCT c.id) as total_contacts,
  COUNT(DISTINCT c.id) FILTER (WHERE c.journey_stage = 'customer') as converted_contacts,
  COUNT(DISTINCT c.id) FILTER (WHERE c.journey_stage IN ('visitor','lead')) as pending_contacts,
  -- Deals
  COUNT(DISTINCT d.id) as total_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'won') as won_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'lost') as lost_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE d.stage NOT IN ('won','lost')) as active_deals,
  COALESCE(SUM(d.amount) FILTER (WHERE d.stage = 'won'), 0) as total_revenue,
  -- Pipeline value
  COALESCE(SUM(d.amount) FILTER (WHERE d.stage NOT IN ('won','lost')), 0) as pipeline_value,
  -- Conversion rate
  CASE WHEN COUNT(DISTINCT d.id) > 0
    THEN ROUND(COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'won')::numeric / NULLIF(COUNT(DISTINCT d.id) FILTER (WHERE d.stage IN ('won','lost')), 0) * 100, 1)
    ELSE 0 END as conversion_rate,
  -- Activity count (last 30 days)
  COUNT(DISTINCT a.id) FILTER (WHERE a.created_at > now() - interval '30 days') as activities_30d,
  -- Pending actions
  (SELECT COUNT(*) FROM crm_next_actions na WHERE na.assigned_to = p.id AND na.status = 'pending') as pending_actions
FROM profiles p
LEFT JOIN crm_contacts c ON c.assigned_to = p.id
LEFT JOIN crm_deals d ON d.assigned_to = p.id
LEFT JOIN crm_activities a ON a.created_by = p.id AND a.is_system = false
WHERE p.role = 'sale'
GROUP BY p.id, p.full_name, p.avatar_url;

-- ─── 10. Backfill existing contacts ────────────────────────

-- Set journey_stage for existing won contacts
UPDATE crm_contacts SET journey_stage = 'customer' WHERE status = 'won' AND journey_stage = 'lead';
UPDATE crm_contacts SET journey_stage = 'contacted' WHERE status = 'contacted' AND journey_stage = 'lead';
UPDATE crm_contacts SET journey_stage = 'qualified' WHERE status = 'qualified' AND journey_stage = 'lead';
UPDATE crm_contacts SET journey_stage = 'negotiation' WHERE status = 'negotiation' AND journey_stage = 'lead';

-- Backfill lifetime_value and total_orders from orders
UPDATE crm_contacts c SET
  lifetime_value = COALESCE(sub.total_paid, 0),
  total_orders = COALESCE(sub.order_count, 0)
FROM (
  SELECT
    LOWER(customer_email) as email,
    SUM(amount) FILTER (WHERE status = 'paid') as total_paid,
    COUNT(*) FILTER (WHERE status = 'paid') as order_count
  FROM orders
  WHERE customer_email IS NOT NULL
  GROUP BY LOWER(customer_email)
) sub
WHERE LOWER(c.email) = sub.email;
