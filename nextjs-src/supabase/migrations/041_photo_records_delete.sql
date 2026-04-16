-- Add DELETE policy for photo_records
-- Allows designer/assistant and project owners to delete photos

CREATE POLICY "photos_delete" ON photo_records FOR DELETE USING (
  visit_id IN (
    SELECT v.id FROM visits v
    WHERE v.project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('designer', 'assistant')
    )
    OR v.project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  )
);
