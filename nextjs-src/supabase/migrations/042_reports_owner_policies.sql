-- Allow project owners (projects.owner_id) to manage visit_reports,
-- visit_remarks and remark_comments.
--
-- Existing policies from migration 013 only check project_members — which
-- means that a designer who created a project (but wasn't added as a member
-- of their own project) gets "policy violation" when trying to create a report.

-- ─── visit_reports ────────────────────────────────────────
CREATE POLICY "reports_owner_select" ON visit_reports FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "reports_owner_insert" ON visit_reports FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "reports_owner_update" ON visit_reports FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "reports_owner_delete" ON visit_reports FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- ─── visit_remarks ────────────────────────────────────────
CREATE POLICY "remarks_owner_all" ON visit_remarks FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- ─── remark_comments ──────────────────────────────────────
CREATE POLICY "comments_owner_all" ON remark_comments FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
