-- Add 'editor' role for content editors (biên tập viên)
-- Editors can edit course content and help answer student questions
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'admin', 'manager', 'marketing', 'sale', 'support', 'instructor', 'editor'));
