-- 005_rls_select_fix.sql
-- Fix: INSERT + SELECT (PostgREST return=representation) fails because
-- SECURITY DEFINER function get_user_project_ids() doesn't see newly inserted
-- rows within the same transaction. Add direct ownership checks to SELECT policies.

-- ============================================================
-- PROJECTS: add owner_id check
-- ============================================================
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (SELECT get_user_project_ids())
  );

-- ============================================================
-- VISITS: add created_by check
-- ============================================================
DROP POLICY IF EXISTS "Users can view visits of own projects" ON visits;
CREATE POLICY "Users can view visits of own projects" ON visits
  FOR SELECT USING (
    created_by = auth.uid()
    OR project_id IN (SELECT get_user_project_ids())
  );

-- ============================================================
-- PHOTO_RECORDS: add visit ownership via created_by
-- ============================================================
DROP POLICY IF EXISTS "Users can view photos of own projects" ON photo_records;
CREATE POLICY "Users can view photos of own projects" ON photo_records
  FOR SELECT USING (
    visit_id IN (
      SELECT id FROM visits WHERE created_by = auth.uid()
    )
    OR visit_id IN (
      SELECT id FROM visits WHERE project_id IN (SELECT get_user_project_ids())
    )
  );

-- ============================================================
-- INVOICES: add issued_by check
-- ============================================================
DROP POLICY IF EXISTS "Users can view invoices of own projects" ON invoices;
CREATE POLICY "Users can view invoices of own projects" ON invoices
  FOR SELECT USING (
    issued_by = auth.uid()
    OR project_id IN (SELECT get_user_project_ids())
  );

-- ============================================================
-- PROJECT_MEMBERS: add user_id check
-- ============================================================
DROP POLICY IF EXISTS "Users can view members of own projects" ON project_members;
CREATE POLICY "Users can view members of own projects" ON project_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR project_id IN (SELECT get_user_project_ids())
  );
