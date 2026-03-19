-- ============================================================
-- Archflow: Initial Database Schema
-- Supabase (PostgreSQL) migration
-- ============================================================

-- ======================== ENUM TYPES ========================

CREATE TYPE user_role AS ENUM ('designer', 'client', 'contractor', 'supplier', 'assistant');
CREATE TYPE project_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE scenario_type AS ENUM ('block', 'gkl');
CREATE TYPE visit_status AS ENUM ('planned', 'approved', 'issues_found');
CREATE TYPE photo_status AS ENUM ('new', 'approved', 'issue', 'in_progress', 'resolved');
CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE document_status AS ENUM ('draft', 'in_review', 'approved');
CREATE TYPE document_format AS ENUM ('PDF', 'DWG', 'XLSX', 'PNG');
CREATE TYPE supply_status AS ENUM ('pending', 'approved', 'in_review', 'ordered', 'in_production', 'delivered');
CREATE TYPE stage_status AS ENUM ('pending', 'in_progress', 'done');
CREATE TYPE access_level AS ENUM ('view', 'view_comment', 'view_comment_photo', 'view_supply', 'full');
CREATE TYPE payment_type AS ENUM ('supervision', 'design', 'supply_commission');
CREATE TYPE payment_period AS ENUM ('one_time', 'monthly');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial');

-- ======================== TABLES ========================

-- 1. profiles — расширение auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  telegram_id TEXT,
  company TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'designer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. projects — проекты
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  address TEXT,
  status project_status NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scenario_type scenario_type NOT NULL DEFAULT 'block',
  start_date DATE,
  supply_discount NUMERIC(5,2) DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. project_members — связь пользователей с проектами
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  access_level access_level NOT NULL DEFAULT 'view',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- 4. stages — этапы стройки
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status stage_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. visits — визиты авторского надзора
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  status visit_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. photo_records — фотофиксация
CREATE TABLE photo_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  comment TEXT,
  status photo_status NOT NULL DEFAULT 'new',
  zone TEXT,
  photo_url TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. invoices — счета
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  status invoice_status NOT NULL DEFAULT 'pending',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. documents — проектные документы
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  version TEXT DEFAULT 'v1.0',
  format document_format NOT NULL DEFAULT 'PDF',
  file_url TEXT,
  status document_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. supply_items — позиции комплектации
CREATE TABLE supply_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  target_stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  status supply_status NOT NULL DEFAULT 'pending',
  lead_time_days INTEGER DEFAULT 0,
  quantity NUMERIC(10,2) DEFAULT 1,
  supplier TEXT,
  budget NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. contract_payments — условия контракта
CREATE TABLE contract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type payment_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  period payment_period,
  status payment_status NOT NULL DEFAULT 'pending',
  next_due DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ======================== INDEXES ========================

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_stages_project ON stages(project_id);
CREATE INDEX idx_stages_sort ON stages(project_id, sort_order);
CREATE INDEX idx_visits_project ON visits(project_id);
CREATE INDEX idx_visits_date ON visits(date);
CREATE INDEX idx_photo_records_visit ON photo_records(visit_id);
CREATE INDEX idx_photo_records_status ON photo_records(status);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_supply_items_project ON supply_items(project_id);
CREATE INDEX idx_supply_items_stage ON supply_items(target_stage_id);
CREATE INDEX idx_contract_payments_project ON contract_payments(project_id);

-- ======================== UPDATED_AT TRIGGER ========================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_supply_items_updated_at
  BEFORE UPDATE ON supply_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ======================== AUTO-CREATE PROFILE ========================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'designer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ======================== ROW LEVEL SECURITY ========================

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

-- Profiles: пользователь видит свой профиль, все видят профили участников своих проектов
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view project member profiles"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT pm.user_id FROM project_members pm
      WHERE pm.project_id IN (
        SELECT pm2.project_id FROM project_members pm2 WHERE pm2.user_id = auth.uid()
      )
    )
  );

-- Projects: участники проекта видят проект
CREATE POLICY "Project members can view projects"
  ON projects FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can insert projects"
  ON projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update projects"
  ON projects FOR UPDATE
  USING (owner_id = auth.uid());

-- Project Members: участники видят членов своего проекта
CREATE POLICY "Members can view project members"
  ON project_members FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owners can manage project members"
  ON project_members FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Stages: участники проекта видят этапы
CREATE POLICY "Project members can view stages"
  ON stages FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage stages"
  ON stages FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- Visits: участники проекта видят визиты
CREATE POLICY "Project members can view visits"
  ON visits FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Designers can manage visits"
  ON visits FOR ALL
  USING (created_by = auth.uid() OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- Photo Records: участники проекта видят фото
CREATE POLICY "Project members can view photos"
  ON photo_records FOR SELECT
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      WHERE v.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM projects WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Designers can manage photos"
  ON photo_records FOR ALL
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      WHERE v.project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
         OR v.created_by = auth.uid()
    )
  );

-- Invoices: участники проекта видят счета
CREATE POLICY "Project members can view invoices"
  ON invoices FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage invoices"
  ON invoices FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- Documents: участники проекта видят документы
CREATE POLICY "Project members can view documents"
  ON documents FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Designers can manage documents"
  ON documents FOR ALL
  USING (
    uploaded_by = auth.uid()
    OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Supply Items: участники проекта видят комплектацию
CREATE POLICY "Project members can view supply items"
  ON supply_items FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage supply items"
  ON supply_items FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- Contract Payments: участники проекта видят платежи
CREATE POLICY "Project members can view contract payments"
  ON contract_payments FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage contract payments"
  ON contract_payments FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
