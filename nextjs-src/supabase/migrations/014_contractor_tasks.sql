-- ============================================================
-- Migration 014: Contractor Tasks
-- ============================================================

-- 1. Enum for contractor task status (safe create — skips if already exists from 009)
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Contractor tasks table
CREATE TABLE IF NOT EXISTS contractor_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  remark_id UUID REFERENCES visit_remarks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  photos TEXT[],
  assigned_to UUID NOT NULL REFERENCES profiles(id),
  deadline DATE,
  status task_status NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_tasks_project ON contractor_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_contractor_tasks_assigned ON contractor_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contractor_tasks_remark ON contractor_tasks(remark_id);
CREATE INDEX IF NOT EXISTS idx_contractor_tasks_status ON contractor_tasks(project_id, status);

DROP TRIGGER IF EXISTS tr_contractor_tasks_updated_at ON contractor_tasks;
CREATE TRIGGER tr_contractor_tasks_updated_at
  BEFORE UPDATE ON contractor_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: contractor_tasks
-- ============================================================
ALTER TABLE contractor_tasks ENABLE ROW LEVEL SECURITY;

-- Owner / team: full access
CREATE POLICY "ctasks_owner_team_all" ON contractor_tasks FOR ALL
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND (pm.member_role IN ('team') OR pm.role = 'designer' OR pm.access_level = 'full')
  ));

-- Contractor: read own tasks
CREATE POLICY "ctasks_contractor_select" ON contractor_tasks FOR SELECT
  USING (assigned_to = auth.uid());

-- Contractor: update own tasks (status + completed_at only)
CREATE POLICY "ctasks_contractor_update" ON contractor_tasks FOR UPDATE
  USING (assigned_to = auth.uid());

-- Client: read only
CREATE POLICY "ctasks_client_select" ON contractor_tasks FOR SELECT
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.member_role = 'client'
  ));

-- Fallback: legacy project members can read
CREATE POLICY "ctasks_legacy_select" ON contractor_tasks FOR SELECT
  USING (project_id IN (SELECT get_user_project_ids()));
