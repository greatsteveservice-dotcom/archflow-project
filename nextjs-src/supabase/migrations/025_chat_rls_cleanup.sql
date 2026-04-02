-- ============================================================
-- 025: Chat RLS cleanup — fix realtime + profile visibility
--
-- Problems fixed:
-- 1. chat_legacy_select policy uses get_user_project_ids() (SECURITY DEFINER)
--    which Supabase Realtime can't evaluate properly → client doesn't receive
--    designer's messages in real time. Also a security hole: lets clients
--    see team chat messages.
-- 2. Designer (owner) is NOT in project_members → client can't see
--    designer's profile via RLS → shows "Пользователь" instead of name.
-- ============================================================

-- ─── Fix 1: Remove overly-permissive legacy SELECT policy ────
-- This policy uses get_user_project_ids() which:
-- a) Is a SECURITY DEFINER function that Realtime struggles with
-- b) Lets clients see team chat (security hole)
-- c) Conflicts with the proper role-based policies
DROP POLICY IF EXISTS "chat_legacy_select" ON chat_messages;

-- ─── Fix 2: Add profile visibility for project owners ────────
-- When designer creates a project, they are set as projects.owner_id
-- but NOT added to project_members. This means the existing profiles
-- RLS ("Users can view project member profiles") can't find them.
-- Result: client sees "Пользователь" instead of designer's name.
CREATE POLICY "Users can view project owner profiles"
ON profiles FOR SELECT
USING (
  id IN (
    SELECT p.owner_id FROM projects p
    WHERE p.id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
    )
  )
);
