-- Add missing UPDATE policy for design_files.
-- Previously only SELECT/INSERT/DELETE policies existed, so
-- updateDesignFileName() silently did nothing (RLS blocked it).
CREATE POLICY "design_files_update" ON design_files FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = design_files.project_id
      AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = design_files.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('designer', 'assistant')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = design_files.project_id
      AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = design_files.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('designer', 'assistant')
  )
);
