-- Add channel column to community_posts
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'general';

-- Create channels reference table
CREATE TABLE IF NOT EXISTS public.community_channels (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10) DEFAULT '💬',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default channels
INSERT INTO public.community_channels (id, name, description, icon, sort_order) VALUES
  ('general', 'Chung', 'Thảo luận chung về mọi chủ đề', '💬', 0),
  ('questions', 'Hỏi đáp', 'Đặt câu hỏi và nhận câu trả lời', '❓', 1),
  ('showcase', 'Chia sẻ', 'Chia sẻ thành quả và dự án', '🏆', 2),
  ('resources', 'Tài nguyên', 'Chia sẻ tài liệu và công cụ hữu ích', '📚', 3),
  ('introductions', 'Giới thiệu', 'Chào hỏi và giới thiệu bản thân', '👋', 4)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view channels" ON public.community_channels FOR SELECT USING (true);

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_community_posts_channel ON public.community_posts(channel);
