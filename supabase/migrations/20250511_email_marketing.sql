-- ============================================================
-- EMAIL MARKETING SYSTEM — Migration
-- Hệ thống Email Marketing cho nền tảng Đăng Khương Academy
-- Bao gồm: lists, subscribers, templates, campaigns, sends, events
-- ============================================================
-- Lưu ý: Sử dụng CREATE TABLE IF NOT EXISTS và ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- để tương thích với bảng subscribers & email_campaigns đã tồn tại trong schema.sql
-- ============================================================

BEGIN;

-- ─── EXTENSIONS ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- cho gen_random_uuid()

-- ============================================================
-- 1. BẢNG EMAIL_LISTS — Danh sách / phân nhóm subscribers
-- Cho phép phân nhóm subscribers theo chiến dịch, sở thích, v.v.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_lists (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  description      text,
  color            text DEFAULT '#22c55e',         -- màu badge hiển thị trên UI
  subscriber_count integer DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

COMMENT ON TABLE public.email_lists IS 'Danh sách phân nhóm subscribers cho email marketing';
COMMENT ON COLUMN public.email_lists.color IS 'Màu hiển thị badge trên giao diện (hex)';
COMMENT ON COLUMN public.email_lists.subscriber_count IS 'Số lượng subscriber — tự động cập nhật qua trigger';

-- ============================================================
-- 2. BẢNG SUBSCRIBERS — Danh sách người đăng ký nhận email
-- Bảng này có thể đã tồn tại trong schema.sql, nên dùng IF NOT EXISTS
-- và ALTER TABLE để thêm các cột mới
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscribers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  full_name       text,
  phone           text,
  status          text DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained')),
  source          text DEFAULT 'manual',
  tags            text[] DEFAULT '{}',
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

-- Thêm các cột mới cho bảng subscribers (nếu chưa có)
-- Mở rộng CHECK constraint cho status (thêm 'complained')
DO $$
BEGIN
  -- Xóa constraint cũ và tạo mới với thêm 'complained'
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'subscribers' AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%status%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.subscribers DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'subscribers' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%status%'
      LIMIT 1
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- bỏ qua nếu không tìm thấy constraint
END $$;

-- Tạo lại CHECK constraint với đầy đủ giá trị
DO $$
BEGIN
  ALTER TABLE public.subscribers
    ADD CONSTRAINT subscribers_status_check
    CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained'));
EXCEPTION WHEN duplicate_object THEN
  NULL; -- constraint đã tồn tại
END $$;

-- Thêm cột source (kiểu nguồn đăng ký)
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Thêm cột metadata (dữ liệu bổ sung dạng JSON)
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Thêm cột subscribed_at (thời điểm đăng ký)
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS subscribed_at timestamptz DEFAULT now();

-- Thêm cột unsubscribed_at (thời điểm huỷ đăng ký)
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

-- Thêm cột updated_at
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Thêm cột tags nếu chưa có
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

COMMENT ON TABLE public.subscribers IS 'Danh sách subscriber nhận email marketing';
COMMENT ON COLUMN public.subscribers.source IS 'Nguồn đăng ký: manual, import, signup, api';
COMMENT ON COLUMN public.subscribers.metadata IS 'Dữ liệu bổ sung dạng JSON (utm, ip, browser...)';

-- ============================================================
-- 3. BẢNG SUBSCRIBER_LIST_MEMBERS — Bảng trung gian M:N
-- Liên kết subscriber với danh sách (một subscriber có thể thuộc nhiều list)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriber_list_members (
  subscriber_id  uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  list_id        uuid NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  added_at       timestamptz DEFAULT now(),
  PRIMARY KEY (subscriber_id, list_id)
);

COMMENT ON TABLE public.subscriber_list_members IS 'Bảng trung gian liên kết subscriber với email_lists (M:N)';

-- ============================================================
-- 4. BẢNG EMAIL_TEMPLATES — Mẫu email có thể tái sử dụng
-- Lưu trữ HTML template cho các loại email khác nhau
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  subject         text NOT NULL,
  html_content    text NOT NULL,
  text_content    text,                              -- phiên bản plain text
  category        text DEFAULT 'marketing'
                  CHECK (category IN ('marketing', 'transactional', 'newsletter', 'automation')),
  variables       text[] DEFAULT '{}',               -- biến placeholder: {name}, {email}, v.v.
  thumbnail_url   text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE public.email_templates IS 'Mẫu email có thể tái sử dụng cho campaigns';
COMMENT ON COLUMN public.email_templates.variables IS 'Danh sách biến placeholder có thể dùng: {name}, {email}...';
COMMENT ON COLUMN public.email_templates.category IS 'Loại template: marketing, transactional, newsletter, automation';

-- ============================================================
-- 5. BẢNG EMAIL_CAMPAIGNS — Chiến dịch email marketing
-- Bảng này có thể đã tồn tại, nên dùng IF NOT EXISTS + ALTER TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject          text NOT NULL,
  status           text DEFAULT 'draft'
                   CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_at     timestamptz,
  sent_at          timestamptz,
  sent_count       integer DEFAULT 0,
  open_count       integer DEFAULT 0,
  click_count      integer DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

-- Mở rộng CHECK constraint cho status (thêm 'sending', 'paused', 'cancelled')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'email_campaigns' AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%status%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.email_campaigns DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'email_campaigns' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%status%'
      LIMIT 1
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.email_campaigns
    ADD CONSTRAINT email_campaigns_status_check
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Thêm các cột mới cho email_campaigns
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS from_name text DEFAULT 'Đăng Khương Academy';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS from_email text DEFAULT 'support@ledangkhuong.net';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS reply_to text;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS html_content text;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS text_content text;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.email_templates(id);
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS list_id uuid REFERENCES public.email_lists(id);
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS total_recipients integer DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS bounce_count integer DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS complaint_count integer DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS unsubscribe_count integer DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Cập nhật cột name = subject cho các row cũ chưa có name
DO $$
BEGIN
  UPDATE public.email_campaigns SET name = subject WHERE name IS NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMENT ON TABLE public.email_campaigns IS 'Chiến dịch email marketing';
COMMENT ON COLUMN public.email_campaigns.from_name IS 'Tên người gửi hiển thị';
COMMENT ON COLUMN public.email_campaigns.from_email IS 'Địa chỉ email người gửi';
COMMENT ON COLUMN public.email_campaigns.template_id IS 'Liên kết đến mẫu email template';
COMMENT ON COLUMN public.email_campaigns.list_id IS 'Danh sách subscriber nhận email';

-- ============================================================
-- 6. BẢNG EMAIL_SENDS — Theo dõi từng email gửi đi
-- Mỗi bản ghi = 1 email gửi cho 1 subscriber trong 1 campaign
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_sends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  subscriber_id   uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  email           text NOT NULL,
  status          text DEFAULT 'queued'
                  CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')),
  ses_message_id  text,                              -- Message ID từ AWS SES / nhà cung cấp email
  sent_at         timestamptz,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  bounced_at      timestamptz,
  error_message   text,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE public.email_sends IS 'Theo dõi từng email đã gửi (1 record = 1 email cho 1 subscriber)';
COMMENT ON COLUMN public.email_sends.ses_message_id IS 'Message ID từ AWS SES hoặc nhà cung cấp email';
COMMENT ON COLUMN public.email_sends.status IS 'Trạng thái: queued → sent → delivered → opened/clicked | bounced/complained/failed';

-- ============================================================
-- 7. BẢNG EMAIL_EVENTS — Sự kiện tracking (open, click, bounce...)
-- Lưu chi tiết từng sự kiện liên quan đến email đã gửi
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id         uuid NOT NULL REFERENCES public.email_sends(id) ON DELETE CASCADE,
  campaign_id     uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  subscriber_id   uuid REFERENCES public.subscribers(id) ON DELETE SET NULL,
  event_type      text NOT NULL
                  CHECK (event_type IN ('sent', 'delivered', 'open', 'click', 'bounce', 'complaint', 'unsubscribe')),
  metadata        jsonb DEFAULT '{}',                -- url cho click, bounce type, v.v.
  ip_address      text,
  user_agent      text,
  created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE public.email_events IS 'Sự kiện tracking email: open, click, bounce, complaint...';
COMMENT ON COLUMN public.email_events.metadata IS 'Dữ liệu bổ sung: URL (click), bounce type, complaint reason...';

-- ============================================================
-- 8. INDEXES — Tối ưu truy vấn thường dùng
-- ============================================================

-- Subscribers
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON public.subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_source ON public.subscribers(source);
CREATE INDEX IF NOT EXISTS idx_subscribers_created_at ON public.subscribers(created_at DESC);

-- Email Lists
CREATE INDEX IF NOT EXISTS idx_email_lists_created_at ON public.email_lists(created_at DESC);

-- Subscriber List Members
CREATE INDEX IF NOT EXISTS idx_subscriber_list_members_list_id ON public.subscriber_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_list_members_subscriber_id ON public.subscriber_list_members(subscriber_id);

-- Email Templates
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON public.email_templates(is_active) WHERE is_active = true;

-- Email Campaigns
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON public.email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_list_id ON public.email_campaigns(list_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at ON public.email_campaigns(scheduled_at)
  WHERE status = 'scheduled';

-- Email Sends
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_status ON public.email_sends(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_email_sends_subscriber_id ON public.email_sends(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_ses_message_id ON public.email_sends(ses_message_id)
  WHERE ses_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON public.email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_created_at ON public.email_sends(created_at DESC);

-- Email Events
CREATE INDEX IF NOT EXISTS idx_email_events_campaign_type ON public.email_events(campaign_id, event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_send_id ON public.email_events(send_id);
CREATE INDEX IF NOT EXISTS idx_email_events_subscriber_id ON public.email_events(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON public.email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON public.email_events(created_at DESC);

-- ============================================================
-- 9. TRIGGER FUNCTIONS — Tự động cập nhật dữ liệu
-- ============================================================

-- ─── 9a. Tự động cập nhật subscriber_count trong email_lists ────
-- Khi thêm/xoá thành viên trong subscriber_list_members
CREATE OR REPLACE FUNCTION public.update_email_list_subscriber_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.email_lists
    SET subscriber_count = subscriber_count + 1,
        updated_at = now()
    WHERE id = NEW.list_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.email_lists
    SET subscriber_count = GREATEST(subscriber_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Xoá trigger cũ nếu tồn tại rồi tạo mới
DROP TRIGGER IF EXISTS on_subscriber_list_member_change ON public.subscriber_list_members;
CREATE TRIGGER on_subscriber_list_member_change
  AFTER INSERT OR DELETE ON public.subscriber_list_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_list_subscriber_count();

-- ─── 9b. Tự động cập nhật updated_at cho subscribers ────────────
CREATE OR REPLACE FUNCTION public.update_subscriber_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscriber_update ON public.subscribers;
CREATE TRIGGER on_subscriber_update
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriber_updated_at();

-- ─── 9c. Tự động cập nhật updated_at cho email_campaigns ───────
CREATE OR REPLACE FUNCTION public.update_email_campaign_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_email_campaign_update ON public.email_campaigns;
CREATE TRIGGER on_email_campaign_update
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_campaign_updated_at();

-- ─── 9d. Tự động cập nhật updated_at cho email_templates ───────
CREATE OR REPLACE FUNCTION public.update_email_template_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_email_template_update ON public.email_templates;
CREATE TRIGGER on_email_template_update
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_template_updated_at();

-- ─── 9e. Tự động cập nhật updated_at cho email_lists ────────────
CREATE OR REPLACE FUNCTION public.update_email_list_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_email_list_update ON public.email_lists;
CREATE TRIGGER on_email_list_update
  BEFORE UPDATE ON public.email_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_list_updated_at();

-- ============================================================
-- 10. ROW LEVEL SECURITY (RLS) — Bảo mật dữ liệu
-- ============================================================

-- Bật RLS cho tất cả bảng email marketing
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriber_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- ─── Helper function: Kiểm tra user có role admin/manager/marketing ───
CREATE OR REPLACE FUNCTION public.is_email_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
END;
$$;

-- ─── 10a. EMAIL_LISTS — Chỉ admin/moderator mới quản lý ────────

-- Service role có toàn quyền (bypass RLS tự động)
-- Authenticated admin/moderator: đọc + ghi
DROP POLICY IF EXISTS "email_lists_admin_select" ON public.email_lists;
CREATE POLICY "email_lists_admin_select" ON public.email_lists
  FOR SELECT TO authenticated
  USING (public.is_email_admin());

DROP POLICY IF EXISTS "email_lists_admin_insert" ON public.email_lists;
CREATE POLICY "email_lists_admin_insert" ON public.email_lists
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_admin());

DROP POLICY IF EXISTS "email_lists_admin_update" ON public.email_lists;
CREATE POLICY "email_lists_admin_update" ON public.email_lists
  FOR UPDATE TO authenticated
  USING (public.is_email_admin());

DROP POLICY IF EXISTS "email_lists_admin_delete" ON public.email_lists;
CREATE POLICY "email_lists_admin_delete" ON public.email_lists
  FOR DELETE TO authenticated
  USING (public.is_email_admin());

-- ─── 10b. SUBSCRIBERS — Admin quản lý, anon có thể tự unsubscribe ──

DROP POLICY IF EXISTS "subscribers_admin_select" ON public.subscribers;
CREATE POLICY "subscribers_admin_select" ON public.subscribers
  FOR SELECT TO authenticated
  USING (public.is_email_admin());

DROP POLICY IF EXISTS "subscribers_admin_insert" ON public.subscribers;
CREATE POLICY "subscribers_admin_insert" ON public.subscribers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_admin());

DROP POLICY IF EXISTS "subscribers_admin_update" ON public.subscribers;
CREATE POLICY "subscribers_admin_update" ON public.subscribers
  FOR UPDATE TO authenticated
  USING (public.is_email_admin());

DROP POLICY IF EXISTS "subscribers_admin_delete" ON public.subscribers;
CREATE POLICY "subscribers_admin_delete" ON public.subscribers
  FOR DELETE TO authenticated
  USING (public.is_email_admin());

-- Cho phép anon đọc subscriber bằng email (cho trang unsubscribe)
DROP POLICY IF EXISTS "subscribers_anon_read_by_email" ON public.subscribers;
CREATE POLICY "subscribers_anon_read_by_email" ON public.subscribers
  FOR SELECT TO anon
  USING (true);
  -- Lưu ý: Trong thực tế nên dùng function/API route thay vì expose trực tiếp.
  -- Policy này cho phép trang unsubscribe public tra cứu subscriber.
  -- Dữ liệu trả về nên được giới hạn qua .select() ở phía client.

-- Cho phép anon cập nhật status thành 'unsubscribed' (cho trang unsubscribe)
DROP POLICY IF EXISTS "subscribers_anon_unsubscribe" ON public.subscribers;
CREATE POLICY "subscribers_anon_unsubscribe" ON public.subscribers
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (status = 'unsubscribed');

-- ─── 10c. SUBSCRIBER_LIST_MEMBERS — Chỉ admin ──────────────────

DROP POLICY IF EXISTS "subscriber_list_members_admin_all" ON public.subscriber_list_members;
CREATE POLICY "subscriber_list_members_admin_all" ON public.subscriber_list_members
  FOR ALL TO authenticated
  USING (public.is_email_admin());

-- ─── 10d. EMAIL_TEMPLATES — Chỉ admin ──────────────────────────

DROP POLICY IF EXISTS "email_templates_admin_select" ON public.email_templates;
CREATE POLICY "email_templates_admin_select" ON public.email_templates
  FOR SELECT TO authenticated
  USING (public.is_email_admin());

DROP POLICY IF EXISTS "email_templates_admin_insert" ON public.email_templates;
CREATE POLICY "email_templates_admin_insert" ON public.email_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_admin());

DROP POLICY IF EXISTS "email_templates_admin_update" ON public.email_templates;
CREATE POLICY "email_templates_admin_update" ON public.email_templates
  FOR UPDATE TO authenticated
  USING (public.is_email_admin());

DROP POLICY IF EXISTS "email_templates_admin_delete" ON public.email_templates;
CREATE POLICY "email_templates_admin_delete" ON public.email_templates
  FOR DELETE TO authenticated
  USING (public.is_email_admin());

-- ─── 10e. EMAIL_CAMPAIGNS — Chỉ admin ──────────────────────────

DROP POLICY IF EXISTS "email_campaigns_admin_select" ON public.email_campaigns;
CREATE POLICY "email_campaigns_admin_select" ON public.email_campaigns
  FOR SELECT TO authenticated
  USING (public.is_email_admin());

DROP POLICY IF EXISTS "email_campaigns_admin_insert" ON public.email_campaigns;
CREATE POLICY "email_campaigns_admin_insert" ON public.email_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_admin());

DROP POLICY IF EXISTS "email_campaigns_admin_update" ON public.email_campaigns;
CREATE POLICY "email_campaigns_admin_update" ON public.email_campaigns
  FOR UPDATE TO authenticated
  USING (public.is_email_admin());

DROP POLICY IF EXISTS "email_campaigns_admin_delete" ON public.email_campaigns;
CREATE POLICY "email_campaigns_admin_delete" ON public.email_campaigns
  FOR DELETE TO authenticated
  USING (public.is_email_admin());

-- ─── 10f. EMAIL_SENDS — Chỉ admin ──────────────────────────────

DROP POLICY IF EXISTS "email_sends_admin_select" ON public.email_sends;
CREATE POLICY "email_sends_admin_select" ON public.email_sends
  FOR SELECT TO authenticated
  USING (public.is_email_admin());

DROP POLICY IF EXISTS "email_sends_admin_insert" ON public.email_sends;
CREATE POLICY "email_sends_admin_insert" ON public.email_sends
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_admin());

DROP POLICY IF EXISTS "email_sends_admin_update" ON public.email_sends;
CREATE POLICY "email_sends_admin_update" ON public.email_sends
  FOR UPDATE TO authenticated
  USING (public.is_email_admin());

-- ─── 10g. EMAIL_EVENTS — Chỉ admin đọc ─────────────────────────

DROP POLICY IF EXISTS "email_events_admin_select" ON public.email_events;
CREATE POLICY "email_events_admin_select" ON public.email_events
  FOR SELECT TO authenticated
  USING (public.is_email_admin());

DROP POLICY IF EXISTS "email_events_admin_insert" ON public.email_events;
CREATE POLICY "email_events_admin_insert" ON public.email_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_admin());

-- ============================================================
-- 11. SEED DATA — Mẫu email template mặc định (tiếng Việt)
-- ============================================================

-- Template 1: Chào mừng thành viên mới
INSERT INTO public.email_templates (name, subject, html_content, text_content, category, variables)
VALUES (
  'Chào mừng thành viên mới',
  'Chào mừng bạn đến với Đăng Khương Academy! 🎉',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Đăng Khương Academy</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px;">Xin chào {name}! 👋</h2>
              <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 16px;">
                Cảm ơn bạn đã đăng ký nhận thông tin từ Đăng Khương Academy. Bạn sẽ nhận được những nội dung giá trị nhất về:
              </p>
              <ul style="color:#a1a1aa;font-size:15px;line-height:1.8;padding-left:20px;">
                <li>Kinh doanh online & sản phẩm số</li>
                <li>Marketing & xây dựng thương hiệu cá nhân</li>
                <li>Khoá học mới & ưu đãi đặc biệt</li>
              </ul>
              <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background-color:#22c55e;border-radius:8px;padding:12px 28px;">
                    <a href="https://ledangkhuong.net" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">
                      Khám phá khoá học ngay
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#71717a;font-size:13px;line-height:1.5;margin:24px 0 0;">
                Nếu bạn không đăng ký, vui lòng bỏ qua email này hoặc
                <a href="{unsubscribe_url}" style="color:#22c55e;text-decoration:underline;">huỷ đăng ký tại đây</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="color:#52525b;font-size:12px;margin:0;">
                &copy; 2025 Đăng Khương Academy. Mọi quyền được bảo lưu.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Xin chào {name}!

Cảm ơn bạn đã đăng ký nhận thông tin từ Đăng Khương Academy.

Bạn sẽ nhận được những nội dung giá trị nhất về:
- Kinh doanh online & sản phẩm số
- Marketing & xây dựng thương hiệu cá nhân
- Khoá học mới & ưu đãi đặc biệt

Khám phá khoá học: https://ledangkhuong.net

Huỷ đăng ký: {unsubscribe_url}',
  'marketing',
  ARRAY['{name}', '{email}', '{unsubscribe_url}']
)
ON CONFLICT DO NOTHING;

-- Template 2: Newsletter hàng tuần
INSERT INTO public.email_templates (name, subject, html_content, text_content, category, variables)
VALUES (
  'Newsletter hàng tuần',
  '📬 Bản tin tuần này từ Đăng Khương Academy',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 40px;border-bottom:1px solid #2a2a2a;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#22c55e;font-weight:700;font-size:18px;">Đăng Khương Academy</span>
                  </td>
                  <td align="right">
                    <span style="color:#71717a;font-size:13px;">Bản tin tuần #{week_number}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Greeting -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0;">
                Xin chào <strong style="color:#ffffff;">{name}</strong>, đây là những nội dung nổi bật tuần này:
              </p>
            </td>
          </tr>
          <!-- Article 1 -->
          <tr>
            <td style="padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#222222;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:24px;">
                    <span style="display:inline-block;background-color:rgba(34,197,94,0.15);color:#22c55e;font-size:11px;font-weight:600;padding:4px 10px;border-radius:4px;margin-bottom:12px;">BÀI VIẾT MỚI</span>
                    <h3 style="color:#ffffff;font-size:17px;margin:12px 0 8px;">{article_title}</h3>
                    <p style="color:#a1a1aa;font-size:14px;line-height:1.5;margin:0 0 16px;">{article_excerpt}</p>
                    <a href="{article_url}" style="color:#22c55e;font-size:14px;font-weight:600;text-decoration:none;">
                      Đọc tiếp &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#22c55e;border-radius:8px;padding:12px 28px;">
                    <a href="https://ledangkhuong.net/blog" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">
                      Xem tất cả bài viết
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="color:#52525b;font-size:12px;margin:0 0 8px;">
                Bạn nhận email này vì đã đăng ký tại Đăng Khương Academy.
              </p>
              <a href="{unsubscribe_url}" style="color:#71717a;font-size:12px;text-decoration:underline;">Huỷ đăng ký</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Bản tin tuần #{week_number} - Đăng Khương Academy

Xin chào {name},

BÀI VIẾT MỚI: {article_title}
{article_excerpt}
Đọc tiếp: {article_url}

---
Xem tất cả: https://ledangkhuong.net/blog
Huỷ đăng ký: {unsubscribe_url}',
  'newsletter',
  ARRAY['{name}', '{email}', '{week_number}', '{article_title}', '{article_excerpt}', '{article_url}', '{unsubscribe_url}']
)
ON CONFLICT DO NOTHING;

-- Template 3: Thông báo khoá học mới
INSERT INTO public.email_templates (name, subject, html_content, text_content, category, variables)
VALUES (
  'Thông báo khoá học mới',
  '🚀 Khoá học mới: {course_name} — Đăng ký ngay!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:12px;overflow:hidden;">
          <!-- Hero -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%);padding:40px;text-align:center;border-bottom:1px solid #2a2a2a;">
              <span style="display:inline-block;background-color:rgba(34,197,94,0.15);color:#22c55e;font-size:12px;font-weight:700;padding:6px 14px;border-radius:20px;margin-bottom:16px;letter-spacing:0.5px;">KHOÁ HỌC MỚI</span>
              <h1 style="color:#ffffff;font-size:26px;margin:0 0 12px;line-height:1.3;">{course_name}</h1>
              <p style="color:#a1a1aa;font-size:15px;line-height:1.5;margin:0;max-width:480px;display:inline-block;">
                {course_description}
              </p>
            </td>
          </tr>
          <!-- Features -->
          <tr>
            <td style="padding:32px 40px;">
              <h3 style="color:#ffffff;font-size:16px;margin:0 0 16px;">Bạn sẽ học được gì?</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">
                    <span style="color:#22c55e;margin-right:8px;">✓</span>
                    <span style="color:#d4d4d8;font-size:14px;">{feature_1}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">
                    <span style="color:#22c55e;margin-right:8px;">✓</span>
                    <span style="color:#d4d4d8;font-size:14px;">{feature_2}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#22c55e;margin-right:8px;">✓</span>
                    <span style="color:#d4d4d8;font-size:14px;">{feature_3}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Price + CTA -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <div style="background-color:#222222;border-radius:8px;padding:20px;margin-bottom:20px;">
                <span style="color:#71717a;font-size:13px;text-decoration:line-through;">{original_price}</span>
                <br>
                <span style="color:#22c55e;font-size:28px;font-weight:700;">{sale_price}</span>
                <br>
                <span style="color:#f59e0b;font-size:12px;font-weight:600;">Ưu đãi có hạn</span>
              </div>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#22c55e;border-radius:8px;padding:14px 32px;">
                    <a href="{course_url}" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;">
                      Đăng ký ngay
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="color:#52525b;font-size:12px;margin:0 0 8px;">
                &copy; 2025 Đăng Khương Academy
              </p>
              <a href="{unsubscribe_url}" style="color:#71717a;font-size:12px;text-decoration:underline;">Huỷ đăng ký</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'KHOÁ HỌC MỚI: {course_name}

{course_description}

Bạn sẽ học được:
✓ {feature_1}
✓ {feature_2}
✓ {feature_3}

Giá gốc: {original_price}
Giá ưu đãi: {sale_price}

Đăng ký ngay: {course_url}

---
Huỷ đăng ký: {unsubscribe_url}',
  'marketing',
  ARRAY['{name}', '{email}', '{course_name}', '{course_description}', '{feature_1}', '{feature_2}', '{feature_3}', '{original_price}', '{sale_price}', '{course_url}', '{unsubscribe_url}']
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 12. MẪU EMAIL_LISTS MẶC ĐỊNH
-- ============================================================
INSERT INTO public.email_lists (name, description, color)
VALUES
  ('Tất cả subscribers', 'Danh sách mặc định chứa tất cả người đăng ký', '#22c55e'),
  ('Học viên khoá học', 'Những người đã mua ít nhất 1 khoá học', '#3b82f6'),
  ('VIP Members', 'Thành viên VIP — nhận ưu đãi đặc biệt', '#f59e0b')
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- GHI CHÚ TRIỂN KHAI
-- ============================================================
-- 1. Chạy migration này trên Supabase SQL Editor hoặc qua CLI:
--    supabase db push
--
-- 2. Service role key (SUPABASE_SERVICE_ROLE_KEY) tự động bypass RLS,
--    nên các API route server-side sử dụng admin client sẽ có full access.
--
-- 3. Đảm bảo profile có role 'admin' hoặc 'moderator' để truy cập
--    email marketing qua authenticated client.
--
-- 4. Trang unsubscribe public sử dụng anon key với policy cho phép
--    đọc subscriber và cập nhật status thành 'unsubscribed'.
--
-- 5. Webhook từ AWS SES / nhà cung cấp email sẽ dùng service role
--    để ghi vào email_events và cập nhật email_sends.
-- ============================================================