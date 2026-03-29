-- ============================================================
-- Migration 013: Visit Reports, Remarks & Comments
-- ============================================================

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('draft', 'filled', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE remark_status AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Visit reports table
CREATE TABLE IF NOT EXISTS visit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  status report_status NOT NULL DEFAULT 'draft',
  general_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_reports_project ON visit_reports(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_reports_project_date ON visit_reports(project_id, visit_date);

DROP TRIGGER IF EXISTS tr_visit_reports_updated_at ON visit_reports;
CREATE TRIGGER tr_visit_reports_updated_at
  BEFORE UPDATE ON visit_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Visit remarks table
CREATE TABLE IF NOT EXISTS visit_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES visit_reports(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number INTEGER NOT NULL DEFAULT 1,
  text TEXT NOT NULL,
  status remark_status NOT NULL DEFAULT 'open',
  deadline DATE,
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_remarks_report ON visit_remarks(report_id);
CREATE INDEX IF NOT EXISTS idx_visit_remarks_project ON visit_remarks(project_id);
CREATE INDEX IF NOT EXISTS idx_visit_remarks_assigned ON visit_remarks(assigned_to);

DROP TRIGGER IF EXISTS tr_visit_remarks_updated_at ON visit_remarks;
CREATE TRIGGER tr_visit_remarks_updated_at
  BEFORE UPDATE ON visit_remarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Remark comments table
CREATE TABLE IF NOT EXISTS remark_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remark_id UUID NOT NULL REFERENCES visit_remarks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remark_comments_remark ON remark_comments(remark_id);

-- ============================================================
-- RLS: visit_reports
-- ============================================================
ALTER TABLE visit_reports ENABLE ROW LEVEL SECURITY;

-- Owner / team: full access
CREATE POLICY "reports_owner_team_select" ON visit_reports FOR SELECT
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND (pm.member_role IN ('team') OR pm.role = 'designer' OR pm.access_level = 'full')
  ));

CREATE POLICY "reports_owner_team_insert" ON visit_reports FOR INSERT
  WITH CHECK (project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND (pm.member_role IN ('team') OR pm.role = 'designer' OR pm.access_level = 'full')
  ));

CREATE POLICY "reports_owner_team_update" ON visit_reports FOR UPDATE
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND (pm.member_role IN ('team') OR pm.role = 'designer' OR pm.access_level = 'full')
  ));

CREATE POLICY "reports_owner_team_delete" ON visit_reports FOR DELETE
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND (pm.member_role IN ('team') OR pm.role = 'designer' OR pm.access_level = 'full')
  ));

-- Client: read published only
CREATE POLICY "reports_client_select" ON visit_reports FOR SELECT
  USING (
    status = 'published'
    AND project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.member_role = 'client'
    )
  );

-- Fallback: legacy project members can read
CREATE POLICY "reports_legacy_select" ON visit_reports FOR SELECT
  USING (project_id IN (SELECT get_user_project_ids()));

-- ============================================================
-- RLS: visit_remarks
-- ============================================================
ALTER TABLE visit_remarks ENABLE ROW LEVEL SECURITY;

-- Owner / team: full access
CREATE POLICY "remarks_owner_team_all" ON visit_remarks FOR ALL
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND (pm.member_role IN ('team') OR pm.role = 'designer' OR pm.access_level = 'full')
  ));

-- Client: read remarks of published reports
CREATE POLICY "remarks_client_select" ON visit_remarks FOR SELECT
  USING (
    report_id IN (SELECT id FROM visit_reports WHERE status = 'published')
    AND project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.member_role = 'client'
    )
  );

-- Contractor: read remarks assigned to them
CREATE POLICY "remarks_contractor_select" ON visit_remarks FOR SELECT
  USING (assigned_to = auth.uid());

-- Fallback: legacy
CREATE POLICY "remarks_legacy_select" ON visit_remarks FOR SELECT
  USING (project_id IN (SELECT get_user_project_ids()));

-- ============================================================
-- RLS: remark_comments
-- ============================================================
ALTER TABLE remark_comments ENABLE ROW LEVEL SECURITY;

-- Owner / team: full access
CREATE POLICY "comments_owner_team_all" ON remark_comments FOR ALL
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND (pm.member_role IN ('team') OR pm.role = 'designer' OR pm.access_level = 'full')
  ));

-- Client: read/insert own comments on published report remarks
CREATE POLICY "comments_client_select" ON remark_comments FOR SELECT
  USING (
    remark_id IN (
      SELECT vr.id FROM visit_remarks vr
      JOIN visit_reports rep ON rep.id = vr.report_id
      WHERE rep.status = 'published'
    )
    AND project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.member_role = 'client'
    )
  );

CREATE POLICY "comments_client_insert" ON remark_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND remark_id IN (
      SELECT vr.id FROM visit_remarks vr
      JOIN visit_reports rep ON rep.id = vr.report_id
      WHERE rep.status = 'published'
    )
    AND project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.member_role = 'client'
    )
  );

-- Contractor: read/insert own comments on their remarks
CREATE POLICY "comments_contractor_select" ON remark_comments FOR SELECT
  USING (
    remark_id IN (
      SELECT id FROM visit_remarks WHERE assigned_to = auth.uid()
    )
  );

CREATE POLICY "comments_contractor_insert" ON remark_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND remark_id IN (
      SELECT id FROM visit_remarks WHERE assigned_to = auth.uid()
    )
  );

-- Fallback: legacy
CREATE POLICY "comments_legacy_select" ON remark_comments FOR SELECT
  USING (project_id IN (SELECT get_user_project_ids()));
