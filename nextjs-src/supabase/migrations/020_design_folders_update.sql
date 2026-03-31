-- ============================================================
-- 020: Update design_files folder CHECK constraint
-- Add new folders: design_project, furniture, engineering
-- Rename concept → design_project (migrate existing data)
-- ============================================================

-- Step 1: Drop old CHECK constraint
ALTER TABLE design_files DROP CONSTRAINT IF EXISTS design_files_folder_check;

-- Step 2: Migrate existing 'concept' rows to 'design_project'
UPDATE design_files SET folder = 'design_project' WHERE folder = 'concept';

-- Step 3: Add new CHECK constraint with all 6 folders
ALTER TABLE design_files ADD CONSTRAINT design_files_folder_check
  CHECK (folder IN ('design_project', 'visuals', 'drawings', 'furniture', 'engineering', 'documents'));
