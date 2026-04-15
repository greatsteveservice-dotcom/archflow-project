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
  onboarding_completed: boolean;
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
  member_role: MemberRole | null;
  access_level: AccessLevel;
  status: MemberStatus;
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
  room: string | null;
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
  scenario_type?: ScenarioType;
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
  room?: string;
}

// ======================== PROJECT ROOMS ========================

export interface ProjectRoom {
  id: string;
  project_id: string;
  name: string;
  area: number | null;
  sort_order: number;
  created_at: string;
}

export interface CreateProjectRoomInput {
  project_id: string;
  name: string;
  area?: number;
  sort_order?: number;
}

// ======================== KIND → STAGE MAPPING ========================

export interface KindStageMapping {
  id: string;
  user_id: string;
  kind: string;
  stage_name: string;
  created_at: string;
}

export interface CreateKindStageMappingInput {
  kind: string;
  stage_name: string;
}

// ======================== RBAC (Role-Based Access) ========================

export type MemberRole = 'team' | 'client' | 'contractor';
export type MemberStatus = 'pending' | 'active';

export interface RbacMember {
  id: string;
  project_id: string;
  user_id: string | null;
  role: UserRole;             // legacy profile-level role
  member_role: MemberRole | null;
  access_level: AccessLevel;
  invite_token: string | null;
  invite_email: string | null;
  status: MemberStatus;
  invited_at: string;
  created_at: string;
  updated_at: string;
}

export interface RbacMemberWithProfile extends RbacMember {
  profile?: Profile;
}

export interface ProjectAccessSettings {
  id: string;
  project_id: string;
  client_can_see_design: boolean;
  client_can_see_furnishing: boolean;
  created_at: string;
  updated_at: string;
}

// ======================== SUPERVISION CONFIG ========================

export interface SupervisionConfig {
  visitSchedule: {
    type: 'weekly' | 'biweekly' | 'monthly' | 'custom';
    weekday: number | null;       // 0=Mon,1=Tue,2=Wed,3=Thu,4=Fri,5=Sat
    customDay: number | null;     // day of month 1-28
  };
  billingDay: number;             // 1-28
  reminderDays: number;           // working days before billing
  extraVisitCost: number | null;  // optional, in rubles
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
  canSendReport: boolean;
  canAcknowledgeReport: boolean;
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
  approved:      { label: 'Согласовано',     bg: '#F6F6F4', text: '#111111' },
  pending:       { label: 'Ожидает',         bg: '#F6F6F4', text: '#111111' },
  in_review:     { label: 'На проверке',     bg: '#F6F6F4', text: '#111111' },
  ordered:       { label: 'Заказано',        bg: '#EBEBEB', text: '#111111' },
  in_production: { label: 'В производстве',  bg: '#EBEBEB', text: '#111111' },
  delivered:     { label: 'Доставлено',      bg: '#F6F6F4', text: '#111111' },
};

// Risk uses grayscale gradient: darker gray = higher risk, no black backgrounds
export const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string }> = {
  critical: { label: 'Критично',  bg: '#D0D0D0', text: '#111111' },
  high:     { label: 'Высокий',   bg: '#DCDCDC', text: '#111111' },
  medium:   { label: 'Средний',   bg: '#EBEBEB', text: '#111111' },
  low:      { label: 'Низкий',    bg: '#F6F6F4', text: '#111111' },
};

// ======================== VISIT REPORTS ========================

export type ReportStatus = 'draft' | 'filled' | 'published';
export type RemarkStatus = 'open' | 'in_progress' | 'resolved';

export interface ReportAttachment {
  name: string;
  file_url: string;
  size: number;
  uploaded_at: string;
}

export interface VisitReport {
  id: string;
  project_id: string;
  visit_date: string;
  status: ReportStatus;
  general_comment: string | null;
  attachments: ReportAttachment[] | null;
  created_at: string;
  updated_at: string;
}

export interface VisitRemark {
  id: string;
  report_id: string;
  project_id: string;
  number: number;
  text: string;
  status: RemarkStatus;
  deadline: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface RemarkComment {
  id: string;
  remark_id: string;
  project_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

/** Remark with its comments and assigned profile */
export interface VisitRemarkWithDetails extends VisitRemark {
  assignee?: Profile;
  comments: RemarkCommentWithProfile[];
}

/** Comment with author profile */
export interface RemarkCommentWithProfile extends RemarkComment {
  author?: Profile;
}

/** Report with computed stats */
export interface VisitReportWithStats extends VisitReport {
  remark_count: number;
  open_count: number;
  resolved_count: number;
}

export interface CreateVisitReportInput {
  project_id: string;
  visit_date: string;
  status?: ReportStatus;
  general_comment?: string;
}

export interface CreateVisitRemarkInput {
  report_id: string;
  project_id: string;
  text: string;
  deadline?: string;
  assigned_to?: string;
}

export interface CreateRemarkCommentInput {
  remark_id: string;
  project_id: string;
  text: string;
}

// ======================== CONTRACTOR TASKS ========================

export interface ContractorTask {
  id: string;
  project_id: string;
  remark_id: string | null;
  title: string;
  description: string | null;
  photos: string[] | null;
  assigned_to: string;
  deadline: string | null;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorTaskWithDetails extends ContractorTask {
  assignee?: Profile;
  remark_number?: number;
  remark_date?: string;
}

export interface CreateContractorTaskInput {
  project_id: string;
  title: string;
  description?: string;
  assigned_to: string;
  deadline?: string;
  remark_id?: string;
  photos?: string[];
}

// ======================== CHAT ========================

export type ChatRefType = 'remark' | 'report' | 'task';
export type ChatType = 'team' | 'client';

export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  text: string;
  chat_type: ChatType;
  channel_id: string | null;
  image_url: string | null;
  ref_type: ChatRefType | null;
  ref_id: string | null;
  ref_preview: string | null;
  created_at: string;
  updated_at: string;
  message_type: 'text' | 'voice';
  voice_duration: number | null;
  voice_original: string | null;
}

export interface ChatMessageWithAuthor extends ChatMessage {
  author?: Profile;
}

export interface ChatRead {
  id: string;
  project_id: string;
  user_id: string;
  chat_type: ChatType;
  last_read_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
}

export interface SendChatMessageInput {
  project_id: string;
  text: string;
  chat_type?: ChatType;
  channel_id?: string;
  image_url?: string;
  ref_type?: ChatRefType;
  ref_id?: string;
  ref_preview?: string;
  message_type?: 'text' | 'voice';
  voice_duration?: number;
  voice_original?: string;
}

export interface ChatChannel {
  id: string;
  project_id: string;
  chat_group: ChatType;
  name: string;
  created_by: string | null;
  created_at: string;
}

// ======================== DESIGN FILES ========================

export type DesignFolder = 'design_project' | 'visuals' | 'drawings' | 'furniture' | 'engineering' | 'documents';

export interface DesignFile {
  id: string;
  project_id: string;
  folder: DesignFolder;
  subfolder: string | null;
  name: string;
  file_path: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DesignFileWithProfile extends DesignFile {
  uploader?: Profile;
}

export interface DesignFileComment {
  id: string;
  file_id: string;
  project_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface DesignFileCommentWithProfile extends DesignFileComment {
  author?: Profile;
}

export interface CreateDesignFileInput {
  project_id: string;
  folder: DesignFolder;
  subfolder?: string | null;
  name: string;
  file_path: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
}

export interface DesignSubfolder {
  id: string;
  project_id: string;
  folder: DesignFolder;
  name: string;
  position: number;
  created_at: string;
}

export interface DesignFolderConfig {
  id: DesignFolder;
  label: string;
  index: string;
}

export const DESIGN_FOLDERS: DesignFolderConfig[] = [
  { id: 'design_project', label: 'Дизайн-проект', index: '01' },
  { id: 'visuals', label: 'Визуализации', index: '02' },
  { id: 'drawings', label: 'Чертежи', index: '03' },
  { id: 'furniture', label: 'Проект мебели', index: '04' },
  { id: 'engineering', label: 'Инженерные проекты', index: '05' },
  { id: 'documents', label: 'Документы', index: '06' },
];

// ======================== NOTIFICATION PREFERENCES ========================

export type ScheduleType = 'any' | 'work_hours_weekend' | 'work_hours' | 'custom';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  project_id: string;
  email_enabled: boolean;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
  telegram_link_token: string | null;
  max_enabled: boolean;
  max_chat_id: string | null;
  push_enabled: boolean;
  schedule_type: ScheduleType;
  schedule_from: string;  // time 'HH:MM'
  schedule_to: string;
  schedule_weekends: boolean;
  urgent_always: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferencesInput {
  user_id: string;
  project_id: string;
  email_enabled?: boolean;
  telegram_enabled?: boolean;
  telegram_chat_id?: string | null;
  max_enabled?: boolean;
  max_chat_id?: string | null;
  push_enabled?: boolean;
  schedule_type?: ScheduleType;
  schedule_from?: string;
  schedule_to?: string;
  schedule_weekends?: boolean;
  urgent_always?: boolean;
}

// ======================== ASSISTANT ========================

export type AssistantEventType = 'invoice_due' | 'no_response' | 'stage_deadline' | 'contractor_overdue' | 'visit_pending' | 'suggestion';
export type AssistantPriority = 'urgent' | 'important' | 'normal';
export type AssistantEventStatus = 'active' | 'dismissed' | 'done';
export type ReminderStatus = 'pending' | 'sent' | 'cancelled';

export interface AssistantEvent {
  id: string;
  project_id: string;
  event_type: AssistantEventType;
  title: string;
  description: string;
  action_label: string | null;
  action_type: string | null;
  priority: AssistantPriority;
  status: AssistantEventStatus;
  related_id: string | null;
  related_type: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface Reminder {
  id: string;
  project_id: string;
  chat_type: ChatType | null;
  action_text: string;
  target_role: string;
  remind_at: string;
  status: ReminderStatus;
  created_by: string;
  created_at: string;
}

export interface ChatAnalysisResult {
  found: boolean;
  action?: string;
  target?: 'client' | 'designer' | 'contractor';
  suggested_time?: string;
  reminder_text?: string;
}

// ======================== EMAIL EVIDENCE ========================

export type EmailDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'bounced' | 'opened' | 'confirmed' | 'auto_accepted';

export interface EmailSend {
  id: string;
  project_id: string;
  report_id: string;
  resend_email_id: string | null;
  recipient_email: string;
  recipient_user_id: string | null;
  status: EmailDeliveryStatus;
  content_hash: string;
  tracking_token: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  auto_accepted_at: string | null;
  created_at: string;
  /** Joined from profiles (client-side enrichment) */
  recipient_profile?: Profile;
}

export interface EmailEvent {
  id: string;
  email_send_id: string;
  resend_email_id: string | null;
  event_type: string;
  raw_payload: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/** Monochrome status config for email delivery badges */
export const EMAIL_STATUS_CONFIG: Record<EmailDeliveryStatus, { label: string; bg: string; text: string }> = {
  sending:       { label: 'Отправка',     bg: '#F6F6F4', text: '#111111' },
  sent:          { label: 'Отправлено',   bg: '#F6F6F4', text: '#111111' },
  delivered:     { label: 'Доставлено',   bg: '#EBEBEB', text: '#111111' },
  bounced:       { label: 'Ошибка',       bg: '#111111', text: '#FFFFFF' },
  opened:        { label: 'Просмотрено',  bg: '#EBEBEB', text: '#111111' },
  confirmed:     { label: 'Подтверждён',  bg: '#111111', text: '#FFFFFF' },
  auto_accepted: { label: 'Авто-принято', bg: '#DCDCDC', text: '#111111' },
};
