// ============================================================
// Archflow: TypeScript types matching Supabase database schema
// ============================================================

// ======================== ENUMS ========================

export type UserRole = 'designer' | 'client' | 'contractor' | 'supplier' | 'assistant';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type ScenarioType = 'block' | 'gkl';
export type VisitStatus = 'planned' | 'approved' | 'issues_found';
export type PhotoStatus = 'new' | 'approved' | 'issue' | 'in_progress' | 'resolved';
export type InvoiceStatus = 'pending' | 'paid' | 'overdue';
export type DocumentStatus = 'draft' | 'in_review' | 'approved';
export type DocumentFormat = 'PDF' | 'DWG' | 'XLSX' | 'PNG';
export type SupplyStatus = 'pending' | 'approved' | 'in_review' | 'ordered' | 'in_production' | 'delivered';
export type StageStatus = 'pending' | 'in_progress' | 'done';
export type AccessLevel = 'view' | 'view_comment' | 'view_comment_photo' | 'view_supply' | 'full';
export type PaymentType = 'supervision' | 'design' | 'supply_commission';
export type PaymentPeriod = 'one_time' | 'monthly';
export type PaymentStatus = 'pending' | 'paid' | 'partial';

// ======================== DATABASE ROW TYPES ========================

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  telegram_id: string | null;
  company: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  address: string | null;
  status: ProjectStatus;
  owner_id: string;
  scenario_type: ScenarioType;
  start_date: string | null;
  supply_discount: number;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: UserRole;
  access_level: AccessLevel;
  invited_at: string;
}

export interface Stage {
  id: string;
  project_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  status: StageStatus;
  created_at: string;
}

export interface Visit {
  id: string;
  project_id: string;
  created_by: string;
  date: string;
  title: string;
  note: string | null;
  status: VisitStatus;
  created_at: string;
}

export interface PhotoRecord {
  id: string;
  visit_id: string;
  comment: string | null;
  status: PhotoStatus;
  zone: string | null;
  photo_url: string | null;
  deadline: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  project_id: string;
  title: string;
  amount: number;
  due_date: string | null;
  status: InvoiceStatus;
  issued_at: string;
  paid_at: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  uploaded_by: string;
  title: string;
  version: string;
  format: DocumentFormat;
  file_url: string | null;
  status: DocumentStatus;
  created_at: string;
}

export interface SupplyItem {
  id: string;
  project_id: string;
  target_stage_id: string | null;
  name: string;
  category: string | null;
  status: SupplyStatus;
  lead_time_days: number;
  quantity: number;
  supplier: string | null;
  budget: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractPayment {
  id: string;
  project_id: string;
  type: PaymentType;
  amount: number;
  period: PaymentPeriod | null;
  status: PaymentStatus;
  next_due: string | null;
  created_at: string;
}

// ======================== VIEW TYPES (for components) ========================

/** Project with computed stats for display */
export interface ProjectWithStats extends Project {
  owner?: Profile;
  visit_count: number;
  photo_count: number;
  open_issues: number;
  last_activity: string;
}

/** Visit with computed stats for display */
export interface VisitWithStats extends Visit {
  author?: Profile;
  photo_count: number;
  issue_count: number;
  resolved_count: number;
}

// ======================== INPUT TYPES (for create/update operations) ========================

export interface CreateProjectInput {
  title: string;
  address?: string;
  scenario_type: ScenarioType;
  start_date?: string;
}

export interface CreateVisitInput {
  project_id: string;
  title: string;
  date: string;
  note?: string;
}

export interface CreatePhotoRecordInput {
  visit_id: string;
  comment?: string;
  status: PhotoStatus;
  zone?: string;
  photo_url?: string;
}

export interface CreateProjectMemberInput {
  project_id: string;
  email: string;
  role: UserRole;
  access_level?: AccessLevel;
}

export interface CreateInvoiceInput {
  project_id: string;
  title: string;
  amount: number;
  due_date?: string;
}

// ======================== STATUS CONFIG ========================

export const PHOTO_STATUS_CONFIG: Record<PhotoStatus, { label: string; color: string; bg: string }> = {
  issue: { label: 'Замечание', color: 'text-[#E85D3A]', bg: 'bg-[#FEF0EC]' },
  approved: { label: 'Принято', color: 'text-[#2A9D5C]', bg: 'bg-[#EAFAF1]' },
  in_progress: { label: 'В работе', color: 'text-[#D4930D]', bg: 'bg-[#FFF8E7]' },
  new: { label: 'Новое', color: 'text-[#6B7280]', bg: 'bg-gray-100' },
  resolved: { label: 'Исправлено', color: 'text-[#2A9D5C]', bg: 'bg-[#EAFAF1]' },
};
