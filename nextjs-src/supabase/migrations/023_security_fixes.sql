-- ============================================================
-- 023: Security fixes (P0/P1 from security review)
--
-- I-5: project_invitations UPDATE policy was USING(true) —
--      any authenticated user could modify any invitation.
--      Fix: only the creator can update their own invitations.
--      The accept_project_invitation() RPC is SECURITY DEFINER
--      and bypasses RLS, so invitation acceptance still works.
-- ============================================================

-- Drop the overly-permissive UPDATE policy
DROP POLICY IF EXISTS "Auth users can update invitations" ON project_invitations;

-- Only the invitation creator can update (e.g. revoke) their invitations.
-- Acceptance is handled by the SECURITY DEFINER RPC function.
CREATE POLICY "Creator can update own invitations"
ON project_invitations FOR UPDATE
USING (created_by = auth.uid());
