-- Drip Content: timed lesson unlock system
-- Lessons unlock X days after a student enrolls in the course.

-- Safely add unlock_after_days column (idempotent)
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS unlock_after_days INT DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN public.lessons.unlock_after_days IS 'Number of days after enrollment before this lesson unlocks. 0 = immediately available.';
