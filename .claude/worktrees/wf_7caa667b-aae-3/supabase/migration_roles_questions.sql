-- ============================================================
-- Migration: Add roles + lesson_questions table
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── 1. Mở rộng hệ thống vai trò ─────────────────────────────
-- Thêm: manager (quản lý), marketing, sale, support (chăm sóc khách hàng)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'admin', 'manager', 'marketing', 'sale', 'support'));

-- ─── 2. Bảng câu hỏi cho giảng viên ──────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_questions (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES public.products(id) ON DELETE CASCADE,
  lesson_id   uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  content     text NOT NULL,
  reply       text,
  replied_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  replied_at  timestamptz,
  status      text DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.lesson_questions ENABLE ROW LEVEL SECURITY;

-- Học viên đọc câu hỏi của mình
CREATE POLICY "users_read_own_questions" ON lesson_questions
  FOR SELECT USING (auth.uid() = user_id);

-- Học viên tạo câu hỏi
CREATE POLICY "users_create_questions" ON lesson_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Staff (admin, manager, support) đọc tất cả câu hỏi
CREATE POLICY "staff_read_all_questions" ON lesson_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'support')
    )
  );

-- Staff trả lời / cập nhật câu hỏi
CREATE POLICY "staff_update_questions" ON lesson_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager', 'support')
    )
  );

-- Index cho performance
CREATE INDEX IF NOT EXISTS idx_questions_product ON lesson_questions(product_id);
CREATE INDEX IF NOT EXISTS idx_questions_user ON lesson_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON lesson_questions(status);
