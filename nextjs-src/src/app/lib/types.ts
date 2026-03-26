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
export type DocumentCategory = 'design_project' | 'visualizations' | 'engineering' | 'contract' | 'schedule' | 'payments' | 'acts' | 'invoices';
export type TaskStatus = 'open' | 'in_progress' | 'done';

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
  webcam_url: string | null;
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

export interface ProjectMemberWithProfile extends ProjectMember {
  profile?: Profile;
}

export interface ProjectInvitation {
  id: string;
  project_id: string;
  token: string;
  role: UserRole;
  access_level: AccessLevel;
  created_by: string | null;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
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
  payment_url: string | null;
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
  category: DocumentCategory | null;
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
  status?: VisitStatus;
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
  payment_url?: string;
}

export interface CreateDocumentInput {
  project_id: string;
  title: string;
  version?: string;
  format: DocumentFormat;
  file_url: string;
  status?: DocumentStatus;
  category?: DocumentCategory;
}

export interface Task {
  id: string;
  project_id: string;
  photo_record_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string;
  photo_record_id?: string;
  assigned_to?: string;
  due_date?: string;
}

/** Photo record with visit info for gallery */
export interface PhotoRecordWithVisit extends PhotoRecord {
  visit_title?: string;
  visit_date?: string;
}

// ======================== SUPPLY COMPUTED TYPES ========================

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

/** Supply item enriched with computed deadline/risk fields */
export interface SupplyItemWithCalc extends SupplyItem {
  orderDeadline: string | null;
  deliveryForecast: string | null;
  daysUntilDeadline: number | null;
  riskCalc: RiskLevel;
  stageName: string;
  stageStart: string | null;
}

export interface CreateSupplyItemInput {
  project_id: string;
  name: string;
  category?: string;
  target_stage_id?: string;
  lead_time_days?: number;
  quantity?: number;
  supplier?: string;
  budget?: number;
  notes?: string;
}

// ======================== PERMISSIONS ========================

export interface ProjectPermissions {
  // Tab visibility (new 4-tab structure)
  canViewDesign: boolean;
  canViewSupervision: boolean;
  canViewSupply: boolean;
  canViewSettings: boolean;
  // Legacy tab visibility (kept for backward compat)
  canViewOverview: boolean;
  canViewJournal: boolean;
  canViewVisits: boolean;
  canViewDocs: boolean;
  // Actions
  canCreateProject: boolean;
  canCreateVisit: boolean;
  canCreateInvoice: boolean;
  canUploadPhoto: boolean;
  canChangePhotoStatus: boolean;
  canUploadDocument: boolean;
  canInviteMembers: boolean;
  canEditProjectSettings: boolean;
  canDeleteProject: boolean;
  canImportSupply: boolean;
  canManageTasks: boolean;
}

export interface UpdateProfileInput {
  full_name?: string;
  phone?: string;
  telegram_id?: string;
  company?: string;
}

/** Computed notification (no separate DB table) */
export interface Notification {
  id: string;
  type: 'issue' | 'resolved' | 'invoice_overdue' | 'invoice_new' | 'visit' | 'photo' | 'supply_risk';
  text: string;
  time: string;
  relativeTime: string;
  read: boolean;
}

export interface ActivityItem {
  id: string;
  color: string;
  text: string;
  time: string;
  relativeTime: string;
}

// ======================== STATUS CONFIG ========================

// Monochrome photo status: filled (needs action) / outlined (in progress) / ghost (done)
export const PHOTO_STATUS_CONFIG: Record<PhotoStatus, { label: string; color: string; bg: string }> = {
  issue:       { label: 'Замечание',   color: 'text-white',          bg: 'bg-ink' },
  approved:    { label: 'Принято',     color: 'text-ink-muted',      bg: 'bg-srf-secondary' },
  in_progress: { label: 'В работе',    color: 'text-ink-secondary',  bg: 'bg-srf-secondary' },
  new:         { label: 'Новое',       color: 'text-ink-secondary',  bg: 'bg-srf-secondary' },
  resolved:    { label: 'Исправлено',  color: 'text-ink-muted',      bg: 'bg-srf-secondary' },
};

// Monochrome supply status
export const SUPPLY_STATUS_CONFIG: Record<SupplyStatus, { label: string; bg: string; text: string }> = {
  approved:      { label: 'Согласовано',     bg: '#F3F4F6', text: '#6B7280' },
  pending:       { label: 'Ожидает',         bg: '#F3F4F6', text: '#374151' },
  in_review:     { label: 'На проверке',     bg: '#F3F4F6', text: '#374151' },
  ordered:       { label: 'Заказано',        bg: '#F3F4F6', text: '#374151' },
  in_production: { label: 'В производстве',  bg: '#F3F4F6', text: '#374151' },
  delivered:     { label: 'Доставлено',      bg: '#F3F4F6', text: '#6B7280' },
};

// Risk keeps subtle semantic hint: dark=critical, medium gray=medium, light=low
export const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string }> = {
  critical: { label: 'Критично',  bg: '#111827', text: '#FFFFFF' },
  high:     { label: 'Высокий',   bg: '#374151', text: '#FFFFFF' },
  medium:   { label: 'Средний',   bg: '#F3F4F6', text: '#374151' },
  low:      { label: 'Низкий',    bg: '#F3F4F6', text: '#6B7280' },
};
