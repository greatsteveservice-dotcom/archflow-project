-- ============================================================
-- Migration 003: RLS v2 — non-recursive policies
-- Fixes infinite recursion from v1 by using SECURITY DEFINER function
-- ============================================================

-- Step 1: Drop ALL existing policies
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Step 2: Create helper function (SECURITY DEFINER — bypasses RLS, prevents recursion)
CREATE OR REPLACE FUNCTION get_user_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM projects WHERE owner_id = auth.uid()
  UNION
  SELECT project_id FROM project_members WHERE user_id = auth.uid()
$$;

-- Step 3: Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_payments ENABLE ROW LEVEL SECURITY;

-- ======= PROFILES =======
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view team profiles"
  ON profiles FOR SELECT USING (
    id IN (SELECT user_id FROM project_members WHERE project_id IN (SELECT get_user_project_ids()))
  );

-- ======= PROJECTS =======
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT USING (id IN (SELECT get_user_project_ids()));
CREATE POLICY "Users can insert projects"
  ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update projects"
  ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owners can delete projects"
  ON projects FOR DELETE USING (owner_id = auth.uid());

-- ======= PROJECT_MEMBERS =======
CREATE POLICY "Users can view project members"
  ON project_members FOR SELECT USING (project_id IN (SELECT get_user_project_ids()));
CREATE POLICY "Owners can manage project members"
  ON project_members FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ======= STAGES =======
CREATE POLICY "Users can view stages"
  ON stages FOR SELECT USING (project_id IN (SELECT get_user_project_ids()));
CREATE POLICY "Owners can manage stages"
  ON stages FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ======= VISITS =======
CREATE POLICY "Users can view visits"
  ON visits FOR SELECT USING (project_id IN (SELECT get_user_project_ids()));
CREATE POLICY "Users can create visits"
  ON visits FOR INSERT WITH CHECK (
    project_id IN (SELECT get_user_project_ids()) AND created_by = auth.uid()
  );
CREATE POLICY "Authors can update visits"
  ON visits FOR UPDATE USING (
    created_by = auth.uid() OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Owners can delete visits"
  ON visits FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ======= PHOTO_RECORDS =======
CREATE POLICY "Users can view photos"
  ON photo_records FOR SELECT USING (
    visit_id IN (SELECT id FROM visits WHERE project_id IN (SELECT get_user_project_ids()))
  );
CREATE POLICY "Users can create photos"
  ON photo_records FOR INSERT WITH CHECK (
    visit_id IN (SELECT id FROM visits WHERE project_id IN (SELECT get_user_project_ids()))
  );
CREATE POLICY "Users can update photos"
  ON photo_records FOR UPDATE USING (
    visit_id IN (SELECT id FROM visits WHERE project_id IN (SELECT get_user_project_ids()))
  );

-- ======= INVOICES =======
CREATE POLICY "Users can view invoices"
  ON invoices FOR SELECT USING (project_id IN (SELECT get_user_project_ids()));
CREATE POLICY "Owners can manage invoices"
  ON invoices FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ======= DOCUMENTS =======
CREATE POLICY "Users can view documents"
  ON documents FOR SELECT USING (project_id IN (SELECT get_user_project_ids()));
CREATE POLICY "Users can manage documents"
  ON documents FOR ALL USING (
    uploaded_by = auth.uid() OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ======= SUPPLY_ITEMS =======
CREATE POLICY "Users can view supply items"
  ON supply_items FOR SELECT USING (project_id IN (SELECT get_user_project_ids()));
CREATE POLICY "Owners can manage supply items"
  ON supply_items FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ======= CONTRACT_PAYMENTS =======
CREATE POLICY "Users can view contract payments"
  ON contract_payments FOR SELECT USING (project_id IN (SELECT get_user_project_ids()));
CREATE POLICY "Owners can manage contract payments"
  ON contract_payments FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
