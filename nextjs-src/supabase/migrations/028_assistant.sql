-- ============================================================
-- Migration 028: Smart Assistant (events, reminders)
-- ============================================================

-- Table: assistant_events
CREATE TABLE IF NOT EXISTS assistant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN (
      'invoice_due', 'no_response', 'stage_deadline',
      'contractor_overdue', 'visit_pending', 'suggestion'
    )),
  title text NOT NULL,
  description text NOT NULL,
  action_label text,
  action_type text
    CHECK (action_type IS NULL OR action_type IN (
      'create_invoice', 'create_reminder',
      'create_task', 'open_chat', 'open_section'
    )),
  priority text DEFAULT 'normal'
    CHECK (priority IN ('urgent', 'important', 'normal')),
  status text DEFAULT 'active'
    CHECK (status IN ('active', 'dismissed', 'done')),
  related_id uuid,
  related_type text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Table: reminders
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chat_type text CHECK (chat_type IS NULL OR chat_type IN ('team', 'client')),
  action_text text NOT NULL,
  target_role text NOT NULL,
  remind_at timestamptz NOT NULL,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'cancelled')),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assistant_events_project ON assistant_events(project_id);
CREATE INDEX IF NOT EXISTS idx_assistant_events_status ON assistant_events(project_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_assistant_events_type ON assistant_events(event_type);
CREATE INDEX IF NOT EXISTS idx_reminders_project ON reminders(project_id);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(status, remind_at)
  WHERE status = 'pending';

-- RLS: assistant_events
ALTER TABLE assistant_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view assistant events"
  ON assistant_events FOR SELECT
  USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.status = 'active'
    )
    OR
    project_id IN (
      SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owner can manage assistant events"
  ON assistant_events FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
    )
  );

-- RLS: reminders
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view reminders"
  ON reminders FOR SELECT
  USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.status = 'active'
    )
    OR
    project_id IN (
      SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project members can insert reminders"
  ON reminders FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      project_id IN (
        SELECT pm.project_id FROM project_members pm
        WHERE pm.user_id = auth.uid() AND pm.status = 'active'
      )
      OR project_id IN (
        SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Creator can update own reminders"
  ON reminders FOR UPDATE
  USING (created_by = auth.uid());
