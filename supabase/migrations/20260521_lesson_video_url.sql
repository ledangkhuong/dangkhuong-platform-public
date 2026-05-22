-- Add video_url column to lessons table
-- Supports external video sources (Google Drive, etc.) alongside YouTube
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
COMMENT ON COLUMN public.lessons.video_url IS 'External video URL (Google Drive, etc). Used when youtube_id is empty.';
