-- ============================================================
-- 021: Fix chat_messages RLS policies
-- Ensures designer (owner) and client can see each other's
-- messages in the 'client' chat, and team chat is restricted.
-- ============================================================

-- Drop ALL existing SELECT and INSERT policies on chat_messages
DROP POLICY IF EXISTS "chat_msg_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_legacy_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_msg_insert" ON chat_messages;

-- ─── SELECT ──────────────────────────────────────────────

-- 1. Project owner sees ALL messages (team + client)
CREATE POLICY "chat_owner_select" ON chat_messages FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
);

-- 2. Team members see ALL messages (team + client)
CREATE POLICY "chat_team_select" ON chat_messages FOR SELECT
USING (
  project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.member_role = 'team'
  )
);

-- 3. Client members see ONLY client chat
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

-- ─── INSERT ──────────────────────────────────────────────

-- Owner can insert into any chat
CREATE POLICY "chat_owner_insert" ON chat_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
);

-- Team members can insert into any chat
CREATE POLICY "chat_team_insert" ON chat_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.member_role = 'team'
  )
);

-- Client members can insert only into client chat
CREATE POLICY "chat_client_insert" ON chat_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND chat_type = 'client'
  AND project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.member_role = 'client'
  )
);
