-- ============================================================
-- Migration 012: Role-Based Access Control schema
-- Adds invite columns to project_members,
-- creates project_access_settings table,
-- adds granular RLS policies.
-- ============================================================

-- ======================== ENUMS ========================

-- Project-level member role (distinct from profile-level user_role)
DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('team', 'client', 'contractor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Member invite status
DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('pending', 'active');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ======================== ALTER project_members ========================

-- Allow user_id to be null (pending invites before user registers)
ALTER TABLE project_members ALTER COLUMN user_id DROP NOT NULL;

-- Add new columns (IF NOT EXISTS guards for re-runnability)
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS member_role member_role;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS invite_token TEXT;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS invite_email TEXT;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS status member_status NOT NULL DEFAULT 'active';
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Unique index on invite_token for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_invite_token
  ON project_members(invite_token) WHERE invite_token IS NOT NULL;

-- Index on invite_email for lookup during registration
CREATE INDEX IF NOT EXISTS idx_pm_invite_email
  ON project_members(invite_email) WHERE invite_email IS NOT NULL;

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS tr_project_members_updated_at ON project_members;
CREATE TRIGGER tr_project_members_updated_at
  BEFORE UPDATE ON project_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ======================== CREATE project_access_settings ========================

CREATE TABLE IF NOT EXISTS project_access_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_can_see_design BOOLEAN NOT NULL DEFAULT false,
  client_can_see_furnishing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_access_settings_project_unique UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_pas_project
  ON project_access_settings(project_id);

DROP TRIGGER IF EXISTS tr_pas_updated_at ON project_access_settings;
CREATE TRIGGER tr_pas_updated_at
  BEFORE UPDATE ON project_access_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ======================== RLS: project_access_settings ========================

ALTER TABLE project_access_settings ENABLE ROW LEVEL SECURITY;

-- Designer (project owner) can do everything
CREATE POLICY "Owner full access to access settings"
  ON project_access_settings FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- Project members can read access settings (needed to resolve their own permissions)
CREATE POLICY "Members can view access settings"
  ON project_access_settings FOR SELECT
  USING (project_id IN (SELECT get_user_project_ids()));

-- ======================== RLS REFINEMENTS: project_members ========================

-- Allow any authenticated user to read a row by invite_token (for invite acceptance)
-- This is needed because the invited user is not yet a member
CREATE POLICY "Anyone can look up own pending invite by token"
  ON project_members FOR SELECT
  USING (
    invite_token IS NOT NULL
    AND status = 'pending'
  );

-- Allow pending invite to be updated (accepted) by the invited user
CREATE POLICY "Invited user can accept own invite"
  ON project_members FOR UPDATE
  USING (
    status = 'pending'
    AND (
      invite_email = (SELECT email FROM profiles WHERE id = auth.uid())
      OR invite_token IS NOT NULL
    )
  );

-- ======================== RLS REFINEMENTS: tasks ========================

-- Contractors can update tasks assigned to them (mark as done)
-- The existing tasks_update policy uses get_user_project_ids() which already
-- covers project members. No extra policy needed — contractors who are
-- project_members already satisfy that check.

-- ======================== RPC: accept member invite by token ========================

CREATE OR REPLACE FUNCTION accept_member_invite(p_token TEXT)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_member RECORD;
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Find the pending invite
  SELECT * INTO v_member
  FROM project_members
  WHERE invite_token = p_token
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or already used invite');
  END IF;

  -- Check if user already has an active membership in this project
  IF EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = v_member.project_id
      AND user_id = v_uid
      AND status = 'active'
  ) THEN
    -- Already a member — just mark the invite as used
    UPDATE project_members SET status = 'active', updated_at = now()
    WHERE id = v_member.id;
    RETURN json_build_object(
      'project_id', v_member.project_id,
      'role', v_member.member_role,
      'already_member', true
    );
  END IF;

  -- Accept: set user_id, mark active, clear token
  UPDATE project_members
  SET user_id = v_uid,
      status = 'active',
      invite_token = NULL,
      updated_at = now()
  WHERE id = v_member.id;

  RETURN json_build_object(
    'project_id', v_member.project_id,
    'role', v_member.member_role
  );
END;
$$;
