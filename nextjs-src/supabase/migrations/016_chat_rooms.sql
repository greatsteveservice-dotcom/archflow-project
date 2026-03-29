-- ============================================================
-- Migration 016: Dual Chat Rooms (team / client)
-- ============================================================

-- 1. Add chat_type column to chat_messages
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS chat_type TEXT NOT NULL DEFAULT 'team'
CHECK (chat_type IN ('team', 'client'));

-- Index for filtering by chat_type
CREATE INDEX IF NOT EXISTS idx_chat_messages_type
ON chat_messages(project_id, chat_type, created_at DESC);

-- 2. Add chat_type column to chat_reads
ALTER TABLE chat_reads
ADD COLUMN IF NOT EXISTS chat_type TEXT NOT NULL DEFAULT 'team';

-- Drop old unique constraint and add new one with chat_type
ALTER TABLE chat_reads DROP CONSTRAINT IF EXISTS chat_reads_project_id_user_id_key;
ALTER TABLE chat_reads ADD CONSTRAINT chat_reads_project_user_type_key
  UNIQUE(project_id, user_id, chat_type);

-- 3. Update RLS policies for chat_messages
-- Drop existing policies
DROP POLICY IF EXISTS "chat_msg_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_insert" ON chat_messages;

-- Team chat: visible to owner + team members only (not client, not contractor)
-- Client chat: visible to owner + team + client (not contractor)
CREATE POLICY "chat_msg_select" ON chat_messages FOR SELECT
  USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.member_role != 'contractor'
        AND (
          -- team chat: only owner/team
          (chat_messages.chat_type = 'team' AND pm.member_role IN ('team'))
          OR
          -- client chat: owner/team/client
          (chat_messages.chat_type = 'client' AND pm.member_role IN ('team', 'client'))
        )
    )
    OR
    -- Project owner (designer) sees all
    project_id IN (
      SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
    )
    OR
    -- Fallback: legacy project members
    project_id IN (SELECT get_user_project_ids())
  );

-- Insert: same logic
CREATE POLICY "chat_msg_insert" ON chat_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      project_id IN (
        SELECT pm.project_id FROM project_members pm
        WHERE pm.user_id = auth.uid()
          AND pm.status = 'active'
          AND pm.member_role != 'contractor'
          AND (
            (chat_messages.chat_type = 'team' AND pm.member_role IN ('team'))
            OR
            (chat_messages.chat_type = 'client' AND pm.member_role IN ('team', 'client'))
          )
      )
      OR
      project_id IN (
        SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
      )
      OR
      project_id IN (SELECT get_user_project_ids())
    )
  );
