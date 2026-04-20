-- 050: Supply search cache (Yandex Search + page scraping + GPT extraction)

CREATE TABLE IF NOT EXISTS supply_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  supply_item_id uuid REFERENCES supply_items(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text NOT NULL,
  query_normalized text NOT NULL,
  budget integer,
  sort_by text NOT NULL DEFAULT 'availability' CHECK (sort_by IN ('availability','price','reliability')),
  results jsonb NOT NULL DEFAULT '[]',
  results_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supply_search_item ON supply_search_results(supply_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supply_search_query ON supply_search_results(query_normalized, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supply_search_project ON supply_search_results(project_id, created_at DESC);

-- RLS
ALTER TABLE supply_search_results ENABLE ROW LEVEL SECURITY;

-- Select: project members + owner
CREATE POLICY "supply_search_select" ON supply_search_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = supply_search_results.project_id
        AND (p.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        ))
    )
  );

-- Insert: owner + designer/assistant/supplier
CREATE POLICY "supply_search_insert" ON supply_search_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = supply_search_results.project_id
        AND (p.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('designer','assistant','supplier')
        ))
    )
  );
