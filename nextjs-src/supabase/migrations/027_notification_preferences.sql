-- ============================================================
-- Migration 027: Notification preferences for project members
-- ============================================================

-- Table: notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Channels
  email_enabled boolean DEFAULT true,
  telegram_enabled boolean DEFAULT false,
  telegram_chat_id text,
  telegram_link_token text,  -- temporary token for linking flow
  max_enabled boolean DEFAULT false,
  max_chat_id text,
  push_enabled boolean DEFAULT true,

  -- Schedule
  schedule_type text DEFAULT 'work_hours_weekend'
    CHECK (schedule_type IN ('any', 'work_hours_weekend', 'work_hours', 'custom')),
  schedule_from time DEFAULT '09:00',
  schedule_to time DEFAULT '20:00',
  schedule_weekends boolean DEFAULT true,

  -- Urgent
  urgent_always boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_project ON notification_preferences(project_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_tg_token ON notification_preferences(telegram_link_token)
  WHERE telegram_link_token IS NOT NULL;

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- User can view own preferences
CREATE POLICY "Users can view own notification prefs"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Project owner can view all members' preferences
CREATE POLICY "Project owner can view all notification prefs"
  ON notification_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = notification_preferences.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- User can insert own preferences
CREATE POLICY "Users can insert own notification prefs"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User can update own preferences
CREATE POLICY "Users can update own notification prefs"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- User can delete own preferences
CREATE POLICY "Users can delete own notification prefs"
  ON notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can update (for Telegram bot linking)
-- Note: service_role bypasses RLS by default

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_notif_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notif_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notif_prefs_updated_at();
