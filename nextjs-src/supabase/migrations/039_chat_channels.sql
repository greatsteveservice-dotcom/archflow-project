-- Chat channels: multiple named chats per group (team/client)
-- Image support in chat messages

-- 1. Chat channels registry
CREATE TABLE IF NOT EXISTS chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chat_group text NOT NULL CHECK (chat_group IN ('team', 'client')),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_select" ON chat_channels FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

CREATE POLICY "channels_insert" ON chat_channels FOR INSERT WITH CHECK (
  project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid() AND pm.member_role IN ('designer', 'assistant')
  )
  OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

CREATE POLICY "channels_delete" ON chat_channels FOR DELETE USING (
  project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid() AND pm.member_role IN ('designer', 'assistant')
  )
  OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_project ON chat_channels(project_id, chat_group);

-- 2. Add channel_id and image_url to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES chat_channels(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url text;

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id);
