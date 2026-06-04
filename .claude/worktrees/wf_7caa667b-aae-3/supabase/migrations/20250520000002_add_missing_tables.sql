-- ============================================================
-- ADD MISSING TABLES — Migration
-- Ensures all tables referenced in application code exist.
-- Uses CREATE TABLE IF NOT EXISTS so this is safe to run even
-- if the tables were already created by schema.sql or standalone
-- migration scripts.
-- ============================================================

BEGIN;

-- ─── EXTENSIONS ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. POST_LIKES — Community post likes (composite PK)
-- Defined in schema.sql; included here for fresh-deploy safety.
-- Columns: user_id, post_id, created_at
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own likes; anyone can read
DO $$ BEGIN
  CREATE POLICY "users_manage_likes" ON public.post_likes
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_likes" ON public.post_likes
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

-- ============================================================
-- 2. POST_REPORTS — Community content moderation reports
-- Referenced in: api/community/reports, api/community/moderation
-- Columns: id, post_id, comment_id, reporter_id, reason,
--          details, status, reviewed_by, reviewed_at, created_at
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id  uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      text NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'harassment', 'misinformation', 'other')),
  details     text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Prevent duplicate reports from the same user on the same content
  CONSTRAINT post_reports_unique_post UNIQUE (reporter_id, post_id),
  CONSTRAINT post_reports_unique_comment UNIQUE (reporter_id, comment_id),
  -- At least one target must be specified
  CONSTRAINT post_reports_has_target CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create reports for content they don't own
DO $$ BEGIN
  CREATE POLICY "users_create_reports" ON public.post_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Staff (admin/manager) can read and manage all reports
DO $$ BEGIN
  CREATE POLICY "staff_read_reports" ON public.post_reports
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager', 'support')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "staff_update_reports" ON public.post_reports
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager', 'support')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_comment_id ON public.post_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter_id ON public.post_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON public.post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON public.post_reports(created_at DESC);

-- ============================================================
-- 3. XP_EVENTS — Gamification XP tracking
-- Defined in schema.sql; included here for fresh-deploy safety.
-- Columns: id, user_id, action, xp_amount, meta, created_at
-- ============================================================
CREATE TABLE IF NOT EXISTS public.xp_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action     text NOT NULL,
  xp_amount  integer NOT NULL,
  meta       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "users_read_own_xp" ON public.xp_events
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON public.xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_action ON public.xp_events(action);
CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON public.xp_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_action ON public.xp_events(user_id, action);

-- Auto-update XP + level on profiles (idempotent CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.update_user_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_xp integer;
  new_level integer;
BEGIN
  SELECT coalesce(sum(xp_amount), 0) INTO total_xp
  FROM xp_events WHERE user_id = NEW.user_id;

  new_level := greatest(1, floor(total_xp / 200) + 1);

  UPDATE profiles SET xp = total_xp, level = new_level
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_xp_event ON public.xp_events;
CREATE TRIGGER on_xp_event
  AFTER INSERT ON public.xp_events
  FOR EACH ROW EXECUTE FUNCTION public.update_user_xp();

-- ============================================================
-- 4. SUBSCRIBER_LIST_MEMBERS — M:N join: subscriber <-> email list
-- Defined in 20250511_email_marketing.sql; included for safety.
-- Columns: subscriber_id, list_id, added_at
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriber_list_members (
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  list_id       uuid NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  added_at      timestamptz DEFAULT now(),
  PRIMARY KEY (subscriber_id, list_id)
);

ALTER TABLE public.subscriber_list_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "subscriber_list_members_admin_all" ON public.subscriber_list_members
    FOR ALL TO authenticated
    USING (public.is_email_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriber_list_members_list_id ON public.subscriber_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_list_members_subscriber_id ON public.subscriber_list_members(subscriber_id);

-- ============================================================
-- 5. EMAIL_CAMPAIGNS — Email marketing campaigns
-- Defined in schema.sql + extended in 20250511_email_marketing.sql.
-- Full column set included here for fresh-deploy safety.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text,
  subject          text NOT NULL,
  from_name        text DEFAULT 'Đăng Khương Academy',
  from_email       text DEFAULT 'support@ledangkhuong.net',
  reply_to         text,
  html_content     text,
  text_content     text,
  template_id      uuid,
  list_id          uuid,
  status           text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_at     timestamptz,
  sent_at          timestamptz,
  completed_at     timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count       integer NOT NULL DEFAULT 0,
  open_count       integer NOT NULL DEFAULT 0,
  click_count      integer NOT NULL DEFAULT 0,
  bounce_count     integer NOT NULL DEFAULT 0,
  complaint_count  integer NOT NULL DEFAULT 0,
  unsubscribe_count integer NOT NULL DEFAULT 0,
  tags             text[] DEFAULT '{}',
  metadata         jsonb DEFAULT '{}',
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Add columns that may not exist on older schemas (idempotent)
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS from_name text DEFAULT 'Đăng Khương Academy';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS from_email text DEFAULT 'support@ledangkhuong.net';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS reply_to text;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS html_content text;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS text_content text;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS template_id uuid;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS list_id uuid;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS total_recipients integer DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS bounce_count integer DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS complaint_count integer DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS unsubscribe_count integer DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON public.email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_list_id ON public.email_campaigns(list_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at ON public.email_campaigns(scheduled_at)
  WHERE status = 'scheduled';

-- ============================================================
-- 6. EMAIL_QUEUE — Queued emails for batch sending
-- Not currently referenced in application code, but included
-- as a placeholder for future use per the task specification.
-- Columns: id, campaign_id, subscriber_id, status,
--          scheduled_at, sent_at, error_message, created_at
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  subscriber_id uuid REFERENCES public.subscribers(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "email_queue_admin_all" ON public.email_queue
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_queue_campaign_id ON public.email_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_subscriber_id ON public.email_queue(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON public.email_queue(scheduled_at)
  WHERE status = 'pending';

-- ============================================================
-- 7. EMAIL_AUTOMATION_LOGS — Automation step execution logs
-- Defined in 20250516_email_automations.sql; included for safety.
-- The task refers to this as "automation_logs"; actual table name
-- in code is "email_automation_logs".
-- Columns: id, enrollment_id, automation_id, subscriber_id,
--          step_id, action, metadata, created_at
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_automation_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid,
  automation_id uuid NOT NULL,
  subscriber_id uuid NOT NULL,
  step_id       uuid,
  action        text NOT NULL,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_automation_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_all_email_automation_logs" ON public.email_automation_logs
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON public.email_automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_enrollment ON public.email_automation_logs(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_subscriber ON public.email_automation_logs(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.email_automation_logs(created_at DESC);

-- ============================================================
-- 8. AFFILIATE_CLICKS — Track affiliate link clicks
-- Defined in migration_affiliate.sql (standalone); included here
-- so timestamped migrations are self-sufficient for fresh deploy.
-- Columns: id, affiliate_id, ref_code, ip, user_agent,
--          page_url, referrer, created_at
-- ============================================================
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  ref_code     text NOT NULL,
  ip           text,
  user_agent   text,
  page_url     text,
  referrer     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "affiliates_read_own_clicks" ON public.affiliate_clicks
    FOR SELECT USING (
      affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "staff_read_all_clicks" ON public.affiliate_clicks
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_aff_clicks_affiliate ON public.affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_ref_code ON public.affiliate_clicks(ref_code);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_created ON public.affiliate_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_dedup ON public.affiliate_clicks(affiliate_id, ip, created_at);

-- ============================================================
-- 9. AFFILIATE_CONVERSIONS — Commission tracking per order
-- Defined in migration_affiliate.sql as "affiliate_conversions".
-- The task refers to this as "affiliate_commissions".
-- Columns: id, affiliate_id, order_id, buyer_id, product_id,
--          order_amount, commission_rate, commission_amount,
--          status, approved_at, paid_at, created_at
-- ============================================================
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id      uuid NOT NULL,
  order_id          uuid,
  buyer_id          uuid,
  product_id        uuid,
  order_amount      integer NOT NULL,
  commission_rate   numeric(5, 2) NOT NULL,
  commission_amount integer NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  approved_at       timestamptz,
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "affiliates_read_own_conversions" ON public.affiliate_conversions
    FOR SELECT USING (
      affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "staff_manage_conversions" ON public.affiliate_conversions
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_aff_conv_affiliate ON public.affiliate_conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_conv_status ON public.affiliate_conversions(status);
CREATE INDEX IF NOT EXISTS idx_aff_conv_order ON public.affiliate_conversions(order_id);
CREATE INDEX IF NOT EXISTS idx_aff_conv_created_at ON public.affiliate_conversions(created_at DESC);

-- ============================================================
-- 10. LESSON_DISCUSSIONS — Threaded discussions per lesson
-- Defined in 20250518_lesson_discussions.sql; included for safety.
-- Columns: id, lesson_id, user_id, parent_id, content,
--          is_pinned, is_resolved, created_at, updated_at
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lesson_discussions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid NOT NULL,
  user_id     uuid NOT NULL,
  parent_id   uuid REFERENCES public.lesson_discussions(id) ON DELETE CASCADE,
  content     text NOT NULL,
  is_pinned   boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_discussions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "anyone_view_discussions" ON public.lesson_discussions
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "auth_users_create_discussions" ON public.lesson_discussions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "users_edit_own_discussions" ON public.lesson_discussions
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "users_delete_own_discussions" ON public.lesson_discussions
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_lesson_discussions_lesson ON public.lesson_discussions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_parent ON public.lesson_discussions(parent_id);
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_user ON public.lesson_discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_created_at ON public.lesson_discussions(created_at);

COMMIT;

-- ============================================================
-- NOTES
-- ============================================================
-- Table name mapping (task name -> actual name in code):
--   automation_logs      -> email_automation_logs
--   affiliate_commissions -> affiliate_conversions
--   email_queue          -> (placeholder, not yet used in code)
--
-- Tables that already had migrations before this file:
--   post_likes           -> schema.sql
--   xp_events            -> schema.sql
--   subscriber_list_members -> 20250511_email_marketing.sql
--   email_campaigns      -> schema.sql + 20250511_email_marketing.sql
--   email_automation_logs -> 20250516_email_automations.sql
--   affiliate_clicks     -> migration_affiliate.sql (standalone)
--   affiliate_conversions -> migration_affiliate.sql (standalone)
--   lesson_discussions   -> 20250518_lesson_discussions.sql
--
-- Only post_reports was truly missing from all migration files.
-- All other tables are re-declared with IF NOT EXISTS for
-- fresh-deploy safety (the standalone files in supabase/ root
-- are not part of the timestamped migrations directory).
-- ============================================================
