-- Pin-based annotations on design files (Loom/Figma-style review).
-- One row = either a root pin (parent_id IS NULL, with x/y coords) or a reply (parent_id NOT NULL, no coords).

CREATE TABLE IF NOT EXISTS design_file_annotations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id         uuid NOT NULL REFERENCES design_files(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES design_file_annotations(id) ON DELETE CASCADE,
  author_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- coordinates as % of image (0..100). NULL on replies.
  x               real,
  y               real,
  -- pin number scoped to file (NULL on replies). assigned at insert via trigger.
  number          int,
  content         text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  -- status (root pins only). replies inherit visually.
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_by     uuid REFERENCES auth.users(id),
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dfa_file ON design_file_annotations(file_id);
CREATE INDEX IF NOT EXISTS idx_dfa_parent ON design_file_annotations(parent_id);
CREATE INDEX IF NOT EXISTS idx_dfa_status ON design_file_annotations(file_id, status);

-- Auto-assign pin number per file (root pins only).
CREATE OR REPLACE FUNCTION assign_annotation_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NULL AND NEW.number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1
      INTO NEW.number
      FROM design_file_annotations
      WHERE file_id = NEW.file_id AND parent_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dfa_number ON design_file_annotations;
CREATE TRIGGER trg_dfa_number
  BEFORE INSERT ON design_file_annotations
  FOR EACH ROW EXECUTE FUNCTION assign_annotation_number();

-- RLS: any project member (or owner) can read/write annotations on their project's files.
ALTER TABLE design_file_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dfa_select ON design_file_annotations;
CREATE POLICY dfa_select ON design_file_annotations FOR SELECT USING (
  file_id IN (
    SELECT df.id FROM design_files df
    WHERE df.project_id IN (
      SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid()
      UNION SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS dfa_insert ON design_file_annotations;
CREATE POLICY dfa_insert ON design_file_annotations FOR INSERT WITH CHECK (
  author_id = auth.uid() AND file_id IN (
    SELECT df.id FROM design_files df
    WHERE df.project_id IN (
      SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid()
      UNION SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS dfa_update ON design_file_annotations;
CREATE POLICY dfa_update ON design_file_annotations FOR UPDATE USING (
  author_id = auth.uid() OR file_id IN (
    SELECT df.id FROM design_files df
    WHERE df.project_id IN (
      SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid() AND pm.role = 'designer'
      UNION SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS dfa_delete ON design_file_annotations;
CREATE POLICY dfa_delete ON design_file_annotations FOR DELETE USING (
  author_id = auth.uid() OR file_id IN (
    SELECT df.id FROM design_files df
    WHERE df.project_id IN (
      SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid() AND pm.role = 'designer'
      UNION SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
    )
  )
);
