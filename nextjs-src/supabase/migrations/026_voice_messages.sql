-- Add voice message fields to chat_messages
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS voice_duration integer,
  ADD COLUMN IF NOT EXISTS voice_original text;

-- Index for filtering voice messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON chat_messages(message_type);

COMMENT ON COLUMN chat_messages.message_type IS 'text | voice';
COMMENT ON COLUMN chat_messages.voice_duration IS 'Voice message duration in seconds';
COMMENT ON COLUMN chat_messages.voice_original IS 'Raw Whisper transcription before cleanup';
