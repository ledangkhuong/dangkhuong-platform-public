-- Lesson Discussions / Q&A system
-- Threaded discussions per lesson with 1-level nesting (parent_id)

CREATE TABLE IF NOT EXISTS public.lesson_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.lesson_discussions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lesson_discussions_lesson ON public.lesson_discussions(lesson_id);
CREATE INDEX idx_lesson_discussions_parent ON public.lesson_discussions(parent_id);

ALTER TABLE public.lesson_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view discussions"
  ON public.lesson_discussions FOR SELECT USING (true);

CREATE POLICY "Auth users can create"
  ON public.lesson_discussions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit own"
  ON public.lesson_discussions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own"
  ON public.lesson_discussions FOR DELETE USING (auth.uid() = user_id);
