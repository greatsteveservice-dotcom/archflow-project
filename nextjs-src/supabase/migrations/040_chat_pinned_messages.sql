-- Pinned messages support
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned
  ON chat_messages(project_id, chat_type)
  WHERE is_pinned = true;
