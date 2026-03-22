-- ============================================================
-- Migration 007: Project invitations (invite by link)
-- ============================================================

CREATE TABLE project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  role user_role NOT NULL DEFAULT 'client',
  access_level access_level NOT NULL DEFAULT 'view',
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '7 days',
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- Project members can view invitations
CREATE POLICY "Project members can view invitations"
ON project_invitations FOR SELECT
USING (project_id IN (SELECT get_user_project_ids()));

-- Project owner/designer can create invitations
CREATE POLICY "Auth users can create invitations"
ON project_invitations FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Allow updating invitation (marking as used)
CREATE POLICY "Auth users can update invitations"
ON project_invitations FOR UPDATE
USING (true);

-- RPC to accept invitation by token (bypasses RLS for token lookup)
CREATE OR REPLACE FUNCTION accept_project_invitation(invite_token TEXT)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  inv RECORD;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO inv FROM project_invitations
  WHERE token = invite_token
    AND used_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired invitation');
  END IF;

  -- Add user to project members (ignore if already exists)
  INSERT INTO project_members (project_id, user_id, role, access_level)
  VALUES (inv.project_id, current_user_id, inv.role, inv.access_level)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- Mark invitation as used
  UPDATE project_invitations
  SET used_by = current_user_id, used_at = now()
  WHERE id = inv.id;

  RETURN json_build_object('project_id', inv.project_id, 'role', inv.role);
END;
$$;
