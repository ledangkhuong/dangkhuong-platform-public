-- Announcements: broadcast notifications for ALL users
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which users have read which announcements
CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read announcements
CREATE POLICY "Authenticated users read announcements"
  ON announcements FOR SELECT TO authenticated USING (true);

-- Only staff can insert announcements
CREATE POLICY "Staff insert announcements"
  ON announcements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Users can read their own read-tracking records
CREATE POLICY "Users read own announcement_reads"
  ON announcement_reads FOR SELECT USING (auth.uid() = user_id);

-- Users can mark announcements as read (insert)
CREATE POLICY "Users insert own announcement_reads"
  ON announcement_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
