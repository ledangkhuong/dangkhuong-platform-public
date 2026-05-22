-- ============================================================
-- CRM Migration cho nền tảng khóa học trực tuyến Đăng Khương
-- Tạo các bảng quản lý leads, contacts, deals và activities
-- ============================================================

-- ============================================================
-- 1. BẢNG CRM_CONTACTS — Quản lý leads và thông tin khách hàng
-- Lưu trữ thông tin liên hệ của khách hàng tiềm năng,
-- bao gồm cả những người chưa đăng ký tài khoản trên hệ thống
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Thông tin cơ bản
  full_name text NOT NULL,
  email text,
  phone text,
  company text,
  avatar_url text,

  -- Trường CRM
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'website', 'referral', 'ads', 'social')),
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'negotiation', 'won', 'lost', 'churned')),
  tags text[] DEFAULT '{}',
  notes text,

  -- Phân công nhân viên phụ trách
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Liên kết với tài khoản đã đăng ký (nếu có)
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Metadata
  last_contacted_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bật RLS (Row Level Security) cho bảng crm_contacts
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. BẢNG CRM_ACTIVITIES — Nhật ký hoạt động trên contacts
-- Ghi lại mọi tương tác với khách hàng: ghi chú, cuộc gọi,
-- email, cuộc họp, task và thay đổi trạng thái
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('note', 'call', 'email', 'meeting', 'task', 'status_change')),
  content text,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Bật RLS cho bảng crm_activities
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. BẢNG CRM_DEALS — Quản lý pipeline bán hàng
-- Theo dõi các cơ hội bán hàng từ lead đến chốt đơn,
-- liên kết với contact và sản phẩm (khóa học)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  amount integer DEFAULT 0,
  stage text DEFAULT 'lead' CHECK (stage IN ('lead', 'contacted', 'demo', 'proposal', 'negotiation', 'won', 'lost')),
  probability integer DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  notes text,

  -- Phân công nhân viên phụ trách deal
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Thông tin kết quả
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,

  -- Metadata
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bật RLS cho bảng crm_deals
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. INDEXES — Tối ưu truy vấn
-- ============================================================

-- Index cho bảng crm_contacts
CREATE INDEX idx_crm_contacts_status ON public.crm_contacts(status);
CREATE INDEX idx_crm_contacts_assigned ON public.crm_contacts(assigned_to);
CREATE INDEX idx_crm_contacts_email ON public.crm_contacts(email);

-- Index cho bảng crm_deals
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(stage);
CREATE INDEX idx_crm_deals_contact ON public.crm_deals(contact_id);

-- Index cho bảng crm_activities
CREATE INDEX idx_crm_activities_contact ON public.crm_activities(contact_id);

-- ============================================================
-- 5. RLS POLICIES — Chính sách bảo mật theo vai trò
-- Staff (admin, manager, sale, support, marketing) có quyền truy cập CRM
-- Student không được truy cập bảng CRM
-- ============================================================

-- ----- Policies cho bảng CRM_CONTACTS -----

-- Staff có thể xem tất cả contacts
CREATE POLICY "crm_contacts_select_staff" ON public.crm_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Staff có thể tạo contacts mới
CREATE POLICY "crm_contacts_insert_staff" ON public.crm_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Staff có thể cập nhật contacts
CREATE POLICY "crm_contacts_update_staff" ON public.crm_contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Chỉ admin và manager được xóa contacts
CREATE POLICY "crm_contacts_delete_admin" ON public.crm_contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- ----- Policies cho bảng CRM_ACTIVITIES -----

-- Staff có thể xem tất cả activities
CREATE POLICY "crm_activities_select_staff" ON public.crm_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Staff có thể tạo activities mới
CREATE POLICY "crm_activities_insert_staff" ON public.crm_activities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Staff có thể cập nhật activities
CREATE POLICY "crm_activities_update_staff" ON public.crm_activities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Chỉ admin và manager được xóa activities
CREATE POLICY "crm_activities_delete_admin" ON public.crm_activities
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- ----- Policies cho bảng CRM_DEALS -----

-- Staff có thể xem tất cả deals
CREATE POLICY "crm_deals_select_staff" ON public.crm_deals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Staff có thể tạo deals mới
CREATE POLICY "crm_deals_insert_staff" ON public.crm_deals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Staff có thể cập nhật deals
CREATE POLICY "crm_deals_update_staff" ON public.crm_deals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Chỉ admin và manager được xóa deals
CREATE POLICY "crm_deals_delete_admin" ON public.crm_deals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- ============================================================
-- 6. VIEW CRM_STATS — Thống kê tổng quan CRM
-- Hiển thị số lượng contacts theo từng trạng thái
-- ============================================================
CREATE OR REPLACE VIEW public.crm_stats AS
SELECT
  COUNT(*) AS total_contacts,
  COUNT(*) FILTER (WHERE status = 'new') AS new_contacts,
  COUNT(*) FILTER (WHERE status = 'contacted') AS contacted,
  COUNT(*) FILTER (WHERE status = 'qualified') AS qualified,
  COUNT(*) FILTER (WHERE status = 'won') AS won,
  COUNT(*) FILTER (WHERE status = 'lost') AS lost
FROM public.crm_contacts;

-- ============================================================
-- 7. TRIGGER updated_at — Tự động cập nhật thời gian sửa đổi
-- ============================================================

-- Hàm trigger cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger cho bảng crm_contacts
CREATE TRIGGER set_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger cho bảng crm_deals
CREATE TRIGGER set_crm_deals_updated_at
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
