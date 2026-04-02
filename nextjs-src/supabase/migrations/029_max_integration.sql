-- ============================================================
-- Migration 029: MAX Messenger integration
-- ============================================================

-- Add MAX linking columns to notification_preferences
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS max_chat_id text,
  ADD COLUMN IF NOT EXISTS max_link_token text;
