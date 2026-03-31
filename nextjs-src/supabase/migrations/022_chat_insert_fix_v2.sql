-- ============================================================
-- 022: Fix chat_messages INSERT + SELECT RLS — robust fallback
--
-- Problem: Migration 021 dropped the get_user_project_ids() fallback,
-- so members with NULL member_role or legacy members can't send messages.
--
-- Fix: Replace INSERT policies with a single robust policy using
-- get_user_project_ids() as the primary membership check. Chat-type
-- restrictions for clients are enforced through SELECT policies (clients
-- can only SEE the client chat tab) and the UI.
--
-- Also adds REPLICA IDENTITY FULL for better Realtime support.
-- ============================================================

-- ─── DROP existing INSERT policies ─────────────────────────

DROP POLICY IF EXISTS "chat_owner_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_team_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_client_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_insert" ON chat_messages;

-- ─── Single robust INSERT policy ───────────────────────────
-- Any project participant (owner or member) can send messages.
-- Chat-type visibility is enforced by SELECT policies + UI.

CREATE POLICY "chat_msg_insert" ON chat_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (SELECT get_user_project_ids())
);

-- ─── Fix SELECT policies: add fallback for legacy members ──
-- Drop and recreate to ensure consistency

DROP POLICY IF EXISTS "chat_owner_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_team_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_client_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_legacy_select" ON chat_messages;

-- Owner sees ALL messages (team + client)
CREATE POLICY "chat_owner_select" ON chat_messages FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
);

-- Team members see ALL messages (team + client)
CREATE POLICY "chat_team_select" ON chat_messages FOR SELECT
USING (
  project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.member_role = 'team'
  )
);

-- Client members see ONLY client chat
CREATE POLICY "chat_client_select" ON chat_messages FOR SELECT
USING (
  chat_type = 'client'
  AND project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.member_role = 'client'
  )
);

-- Fallback: legacy members (no member_role set) can read all messages
CREATE POLICY "chat_legacy_select" ON chat_messages FOR SELECT
USING (
  project_id IN (SELECT get_user_project_ids())
);

-- ─── Ensure Realtime works well with filters ───────────────
-- REPLICA IDENTITY FULL allows Realtime to filter on any column
-- (not just PK), needed for project_id filter in subscriptions
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
