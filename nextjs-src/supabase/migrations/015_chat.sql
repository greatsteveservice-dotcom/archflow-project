-- ============================================================
-- Migration 015: Project Chat + Push Subscriptions
-- ============================================================

-- 1. Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  ref_type TEXT CHECK (ref_type IN ('remark', 'report', 'task')),
  ref_id UUID,
  ref_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON chat_messages(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

DROP TRIGGER IF EXISTS tr_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER tr_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Chat reads (last-read cursor per user per project)
CREATE TABLE IF NOT EXISTS chat_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_reads_user ON chat_reads(user_id);

-- 3. Push subscriptions (Web Push API)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ============================================================
-- RLS: chat_messages
-- ============================================================
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Project members (except contractors) can read messages
CREATE POLICY "chat_msg_select" ON chat_messages FOR SELECT
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.member_role != 'contractor'
  ));

-- Project members (except contractors) can insert messages
CREATE POLICY "chat_msg_insert" ON chat_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.member_role != 'contractor'
    )
  );

-- Users can delete only their own messages
CREATE POLICY "chat_msg_delete" ON chat_messages FOR DELETE
  USING (user_id = auth.uid());

-- Users can update only their own messages (edit text)
CREATE POLICY "chat_msg_update" ON chat_messages FOR UPDATE
  USING (user_id = auth.uid());

-- Fallback: legacy project members can read
CREATE POLICY "chat_msg_legacy_select" ON chat_messages FOR SELECT
  USING (project_id IN (SELECT get_user_project_ids()));

-- ============================================================
-- RLS: chat_reads
-- ============================================================
ALTER TABLE chat_reads ENABLE ROW LEVEL SECURITY;

-- Each user reads only their own rows
CREATE POLICY "chat_reads_select" ON chat_reads FOR SELECT
  USING (user_id = auth.uid());

-- Each user inserts only their own rows
CREATE POLICY "chat_reads_insert" ON chat_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Each user updates only their own rows
CREATE POLICY "chat_reads_update" ON chat_reads FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- RLS: push_subscriptions
-- ============================================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Each user reads only their own subscriptions
CREATE POLICY "push_sub_select" ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Each user inserts only their own subscriptions
CREATE POLICY "push_sub_insert" ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Each user deletes only their own subscriptions
CREATE POLICY "push_sub_delete" ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- Enable Realtime for chat_messages
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
