// ============================================================
// Archflow: Supabase query functions
// ============================================================

import { supabase } from './supabase';
import { sanitize, sanitizeUrl } from './sanitize';
import type {
  Project, Profile, Visit, PhotoRecord, Invoice,
  Document, SupplyItem, Stage, ContractPayment,
  ProjectMember, ProjectMemberWithProfile, ProjectInvitation,
  ProjectWithStats, VisitWithStats,
  PhotoStatus, SupplyStatus, RiskLevel, UserRole, AccessLevel,
  SupplyItemWithCalc, Notification, ActivityItem,
  CreateProjectInput, CreateVisitInput,
  CreatePhotoRecordInput, CreateProjectMemberInput, CreateInvoiceInput,
  CreateSupplyItemInput, CreateDocumentInput, UpdateProfileInput,
  DocumentCategory, Task, TaskStatus, CreateTaskInput, PhotoRecordWithVisit,
} from './types';

// ======================== CONSTANTS ========================

export const PROJECTS_PAGE_SIZE = 20;

// ======================== PROJECTS ========================

/** Fetch all projects with stats (visit count, photo count, etc.) */
export async function fetchProjects(): Promise<ProjectWithStats[]> {
  // Get projects
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (projErr) throw projErr;
  if (!projects) return [];

  // Get owner profiles
  const ownerIds = [...new Set(projects.map(p => p.owner_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ownerIds);

  // Get visits for all projects
  const projectIds = projects.map(p => p.id);
  const { data: visits } = await supabase
    .from('visits')
    .select('id, project_id, date')
    .in('project_id', projectIds);

  // Get photo records for all visits
  const visitIds = visits?.map(v => v.id) || [];
  const { data: photos } = visitIds.length > 0
    ? await supabase
        .from('photo_records')
        .select('id, visit_id, status')
        .in('visit_id', visitIds)
    : { data: [] };

  // Build project-to-visit map
  const visitsByProject = new Map<string, typeof visits>();
  visits?.forEach(v => {
    const arr = visitsByProject.get(v.project_id) || [];
    arr.push(v);
    visitsByProject.set(v.project_id, arr);
  });

  // Build visit-to-photos map
  const photosByVisit = new Map<string, typeof photos>();
  photos?.forEach(p => {
    const arr = photosByVisit.get(p.visit_id) || [];
    arr.push(p);
    photosByVisit.set(p.visit_id, arr);
  });

  // Build profiles map
  const profileMap = new Map<string, Profile>();
  profiles?.forEach(p => profileMap.set(p.id, p as Profile));

  // Combine
  return projects.map(project => {
    const projectVisits = visitsByProject.get(project.id) || [];
    const projectVisitIds = projectVisits.map(v => v.id);
    const projectPhotos = projectVisitIds.flatMap(vid => photosByVisit.get(vid) || []);

    // Find last visit date
    const sortedVisits = [...projectVisits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastVisitDate = sortedVisits[0]?.date;

    return {
      ...(project as Project),
      owner: profileMap.get(project.owner_id),
      visit_count: projectVisits.length,
      photo_count: projectPhotos.length,
      open_issues: projectPhotos.filter(p => p.status === 'issue').length,
      last_activity: lastVisitDate
        ? formatRelativeDate(lastVisitDate)
        : 'нет активности',
    };
  });
}

/** Result type for paginated projects */
export interface PaginatedProjects {
  data: ProjectWithStats[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Fetch projects with server-side pagination */
export async function fetchProjectsPaginated(
  page: number = 0,
  pageSize: number = PROJECTS_PAGE_SIZE
): Promise<PaginatedProjects> {
  // Get total count
  const { count, error: countErr } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  if (countErr) throw countErr;
  const total = count || 0;

  // Get projects page
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (projErr) throw projErr;
  if (!projects || projects.length === 0) {
    return { data: [], total, page, pageSize, hasMore: false };
  }

  // Get owner profiles
  const ownerIds = [...new Set(projects.map(p => p.owner_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ownerIds);

  // Get visits for these projects
  const projectIds = projects.map(p => p.id);
  const { data: visits } = await supabase
    .from('visits')
    .select('id, project_id, date')
    .in('project_id', projectIds);

  // Get photo records for all visits
  const visitIds = visits?.map(v => v.id) || [];
  const { data: photos } = visitIds.length > 0
    ? await supabase
        .from('photo_records')
        .select('id, visit_id, status')
        .in('visit_id', visitIds)
    : { data: [] };

  // Build project-to-visit map
  const visitsByProject = new Map<string, typeof visits>();
  visits?.forEach(v => {
    const arr = visitsByProject.get(v.project_id) || [];
    arr.push(v);
    visitsByProject.set(v.project_id, arr);
  });

  // Build visit-to-photos map
  const photosByVisit = new Map<string, typeof photos>();
  photos?.forEach(p => {
    const arr = photosByVisit.get(p.visit_id) || [];
    arr.push(p);
    photosByVisit.set(p.visit_id, arr);
  });

  // Build profiles map
  const profileMap = new Map<string, Profile>();
  profiles?.forEach(p => profileMap.set(p.id, p as Profile));

  // Combine
  const enriched = projects.map(project => {
    const projectVisits = visitsByProject.get(project.id) || [];
    const projectVisitIds = projectVisits.map(v => v.id);
    const projectPhotos = projectVisitIds.flatMap(vid => photosByVisit.get(vid) || []);

    // Find last visit date
    const sortedVisits = [...projectVisits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastVisitDate = sortedVisits[0]?.date;

    return {
      ...(project as Project),
      owner: profileMap.get(project.owner_id),
      visit_count: projectVisits.length,
      photo_count: projectPhotos.length,
      open_issues: projectPhotos.filter(p => p.status === 'issue').length,
      last_activity: lastVisitDate
        ? formatRelativeDate(lastVisitDate)
        : 'нет активности',
    };
  });

  return {
    data: enriched,
    total,
    page,
    pageSize,
    hasMore: from + projects.length < total,
  };
}

/** Fetch a single project by ID */
export async function fetchProject(projectId: string): Promise<ProjectWithStats | null> {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !project) return null;

  // Get owner
  const { data: owner } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', project.owner_id)
    .single();

  // Get visits
  const { data: visits } = await supabase
    .from('visits')
    .select('id, date')
    .eq('project_id', projectId);

  // Get photos
  const visitIds = visits?.map(v => v.id) || [];
  const { data: photos } = visitIds.length > 0
    ? await supabase
        .from('photo_records')
        .select('id, status')
        .in('visit_id', visitIds)
    : { data: [] };

  const sortedVisits = [...(visits || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    ...(project as Project),
    owner: owner as Profile || undefined,
    visit_count: visits?.length || 0,
    photo_count: photos?.length || 0,
    open_issues: photos?.filter(p => p.status === 'issue').length || 0,
    last_activity: sortedVisits[0]?.date
      ? formatRelativeDate(sortedVisits[0].date)
      : 'нет активности',
  };
}

// ======================== VISITS ========================

/** Fetch visits for a project with stats */
export async function fetchProjectVisits(projectId: string): Promise<VisitWithStats[]> {
  const { data: visits, error } = await supabase
    .from('visits')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  if (error || !visits) return [];

  // Get authors
  const authorIds = [...new Set(visits.map(v => v.created_by))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', authorIds);

  const profileMap = new Map<string, Profile>();
  profiles?.forEach(p => profileMap.set(p.id, p as Profile));

  // Get photo stats for each visit
  const visitIds = visits.map(v => v.id);
  const { data: photos } = visitIds.length > 0
    ? await supabase
        .from('photo_records')
        .select('id, visit_id, status')
        .in('visit_id', visitIds)
    : { data: [] };

  const photosByVisit = new Map<string, typeof photos>();
  photos?.forEach(p => {
    const arr = photosByVisit.get(p.visit_id) || [];
    arr.push(p);
    photosByVisit.set(p.visit_id, arr);
  });

  return visits.map(visit => {
    const visitPhotos = photosByVisit.get(visit.id) || [];
    return {
      ...(visit as Visit),
      author: profileMap.get(visit.created_by),
      photo_count: visitPhotos.length,
      issue_count: visitPhotos.filter(p => p.status === 'issue').length,
      resolved_count: visitPhotos.filter(p => p.status === 'resolved' || p.status === 'approved').length
        - visitPhotos.filter(p => p.status === 'approved').length, // only resolved, not approved
    };
  });
}

/** Fetch a single visit */
export async function fetchVisit(visitId: string): Promise<VisitWithStats | null> {
  const { data: visit, error } = await supabase
    .from('visits')
    .select('*')
    .eq('id', visitId)
    .single();

  if (error || !visit) return null;

  // Author
  const { data: author } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', visit.created_by)
    .single();

  // Photos
  const { data: photos } = await supabase
    .from('photo_records')
    .select('id, status')
    .eq('visit_id', visitId);

  return {
    ...(visit as Visit),
    author: author as Profile || undefined,
    photo_count: photos?.length || 0,
    issue_count: photos?.filter(p => p.status === 'issue').length || 0,
    resolved_count: photos?.filter(p => p.status === 'resolved').length || 0,
  };
}

// ======================== PHOTOS ========================

/** Fetch photo records for a visit */
export async function fetchVisitPhotos(visitId: string): Promise<PhotoRecord[]> {
  const { data, error } = await supabase
    .from('photo_records')
    .select('*')
    .eq('visit_id', visitId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as PhotoRecord[];
}

// ======================== PROFILES ========================

/** Fetch current user profile based on auth session */
export async function fetchCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return data as Profile;
}

// ======================== HELPERS ========================

/** Format date to Russian relative string */
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'только что';
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays === 1) return 'вчера';
  if (diffDays < 7) return `${diffDays} дн. назад`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед. назад`;
  return `${Math.floor(diffDays / 30)} мес. назад`;
}

/** Format ISO date to DD.MM.YYYY */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ======================== MUTATIONS ========================

/** Create a new project */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      title: sanitize(input.title),
      address: input.address ? sanitize(input.address) : null,
      scenario_type: input.scenario_type,
      start_date: input.start_date || null,
      owner_id: user.id,
      status: 'active',
      progress: 0,
      supply_discount: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

/** Update project title/address */
export async function updateProject(projectId: string, updates: { title?: string; address?: string }): Promise<Project> {
  const sanitized: Record<string, string> = {};
  if (updates.title) sanitized.title = sanitize(updates.title);
  if (updates.address) sanitized.address = sanitize(updates.address);

  const { data, error } = await supabase
    .from('projects')
    .update(sanitized)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

/** Create a new visit */
export async function createVisit(input: CreateVisitInput): Promise<Visit> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { data, error } = await supabase
    .from('visits')
    .insert({
      project_id: input.project_id,
      title: sanitize(input.title),
      date: input.date,
      note: input.note ? sanitize(input.note) : null,
      created_by: user.id,
      status: 'planned',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Visit;
}

/** Upload a photo file to Supabase Storage */
export async function uploadPhoto(
  file: File,
  projectId: string,
  visitId: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${projectId}/${visitId}/${fileName}`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType: file.type,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('photos')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/** Create a photo record */
export async function createPhotoRecord(input: CreatePhotoRecordInput): Promise<PhotoRecord> {
  const { data, error } = await supabase
    .from('photo_records')
    .insert({
      visit_id: input.visit_id,
      comment: input.comment ? sanitize(input.comment) : null,
      status: input.status,
      zone: input.zone ? sanitize(input.zone) : null,
      photo_url: input.photo_url || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PhotoRecord;
}

/** Update photo record status */
export async function updatePhotoStatus(id: string, status: PhotoStatus): Promise<PhotoRecord> {
  const { data, error } = await supabase
    .from('photo_records')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PhotoRecord;
}

/** Invite a project member by email */
export async function inviteProjectMember(input: CreateProjectMemberInput): Promise<ProjectMember> {
  // Use RPC to look up user by email (bypasses RLS)
  const { data: profileData, error: profileErr } = await supabase
    .rpc('lookup_profile_by_email', { target_email: input.email });

  if (profileErr || !profileData || profileData.length === 0) {
    throw new Error('Пользователь с таким email не найден');
  }

  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: input.project_id,
      user_id: profileData[0].id,
      role: input.role,
      access_level: input.access_level || 'view',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Этот пользователь уже является участником проекта');
    }
    throw error;
  }
  return data as ProjectMember;
}

/** Create an invoice */
export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      project_id: input.project_id,
      title: sanitize(input.title),
      amount: input.amount,
      due_date: input.due_date || null,
      payment_url: input.payment_url ? sanitizeUrl(input.payment_url) : null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
}

// ======================== STAGES ========================

/** Fetch stages for a project */
export async function fetchProjectStages(projectId: string): Promise<Stage[]> {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data || []) as Stage[];
}

// ======================== SUPPLY ========================

/** Calculate derived supply fields (deadline, risk) */
export function calcSupplyItem(item: SupplyItem, stages: Stage[]): SupplyItemWithCalc {
  const stage = stages.find(s => s.id === item.target_stage_id);
  if (!stage || !stage.start_date) {
    return {
      ...item,
      orderDeadline: null,
      deliveryForecast: null,
      daysUntilDeadline: null,
      riskCalc: 'low' as RiskLevel,
      stageName: '—',
      stageStart: null,
    };
  }

  const today = new Date();
  const stageStart = new Date(stage.start_date);
  const orderDeadline = new Date(stageStart);
  orderDeadline.setDate(orderDeadline.getDate() - item.lead_time_days);
  const deliveryForecast = new Date(today);
  deliveryForecast.setDate(deliveryForecast.getDate() + item.lead_time_days);

  const daysUntil = Math.round(
    (orderDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let riskCalc: RiskLevel = 'low';
  if (daysUntil < 0) riskCalc = 'critical';
  else if (daysUntil <= 7) riskCalc = 'high';
  else if (daysUntil <= 30) riskCalc = 'medium';

  return {
    ...item,
    orderDeadline: orderDeadline.toISOString().split('T')[0],
    deliveryForecast: deliveryForecast.toISOString().split('T')[0],
    daysUntilDeadline: daysUntil,
    riskCalc,
    stageName: stage.name,
    stageStart: stage.start_date,
  };
}

/** Fetch supply items for a project */
export async function fetchProjectSupplyItems(projectId: string): Promise<SupplyItem[]> {
  const { data, error } = await supabase
    .from('supply_items')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as SupplyItem[];
}

/** Create a supply item */
export async function createSupplyItem(input: CreateSupplyItemInput): Promise<SupplyItem> {
  const { data, error } = await supabase
    .from('supply_items')
    .insert({
      project_id: input.project_id,
      name: sanitize(input.name),
      category: input.category ? sanitize(input.category) : null,
      target_stage_id: input.target_stage_id || null,
      lead_time_days: input.lead_time_days || 0,
      quantity: input.quantity || 1,
      supplier: input.supplier ? sanitize(input.supplier) : null,
      budget: input.budget || 0,
      notes: input.notes ? sanitize(input.notes) : null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as SupplyItem;
}

/** Batch create supply items */
export async function createSupplyItems(items: CreateSupplyItemInput[]): Promise<SupplyItem[]> {
  const rows = items.map(input => ({
    project_id: input.project_id,
    name: sanitize(input.name),
    category: input.category ? sanitize(input.category) : null,
    target_stage_id: input.target_stage_id || null,
    lead_time_days: input.lead_time_days || 0,
    quantity: input.quantity || 1,
    supplier: input.supplier ? sanitize(input.supplier) : null,
    budget: input.budget || 0,
    notes: input.notes ? sanitize(input.notes) : null,
    status: 'pending' as const,
  }));

  const { data, error } = await supabase
    .from('supply_items')
    .insert(rows)
    .select();

  if (error) throw error;
  return (data || []) as SupplyItem[];
}

/** Update supply item status */
export async function updateSupplyItemStatus(id: string, status: SupplyStatus): Promise<SupplyItem> {
  const { data, error } = await supabase
    .from('supply_items')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SupplyItem;
}

// ======================== INVOICES (list) ========================

/** Fetch invoices for a project */
export async function fetchProjectInvoices(projectId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('project_id', projectId)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Invoice[];
}

// ======================== PROFILE UPDATE ========================

/** Update user profile */
export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const updates: Record<string, unknown> = {};
  if (input.full_name !== undefined) updates.full_name = sanitize(input.full_name);
  if (input.phone !== undefined) updates.phone = input.phone ? sanitize(input.phone) : null;
  if (input.telegram_id !== undefined) updates.telegram_id = input.telegram_id ? sanitize(input.telegram_id) : null;
  if (input.company !== undefined) updates.company = input.company ? sanitize(input.company) : null;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

// ======================== NOTIFICATIONS (computed) ========================

/** Вычисляемые уведомления из существующих данных */
export async function fetchNotifications(): Promise<Notification[]> {
  const notifications: Notification[] = [];

  // Замечания на фото (issue / resolved)
  const { data: recentPhotos } = await supabase
    .from('photo_records')
    .select('id, comment, status, zone, created_at')
    .in('status', ['issue', 'resolved'])
    .order('created_at', { ascending: false })
    .limit(15);

  recentPhotos?.forEach(photo => {
    notifications.push({
      id: `photo-${photo.id}`,
      type: photo.status === 'issue' ? 'issue' : 'resolved',
      text: photo.status === 'issue'
        ? `Замечание: ${photo.comment || photo.zone || 'Без описания'}`
        : `Исправлено: ${photo.comment || photo.zone || 'Без описания'}`,
      time: photo.created_at,
      relativeTime: formatRelativeDate(photo.created_at),
      read: false,
    });
  });

  // Просроченные счета
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, title, amount, due_date')
    .eq('status', 'pending')
    .lt('due_date', new Date().toISOString().split('T')[0])
    .limit(10);

  overdueInvoices?.forEach(inv => {
    notifications.push({
      id: `inv-${inv.id}`,
      type: 'invoice_overdue',
      text: `Просроченный счёт: ${inv.title}`,
      time: inv.due_date || '',
      relativeTime: 'просрочен',
      read: false,
    });
  });

  // Последние визиты
  const { data: recentVisits } = await supabase
    .from('visits')
    .select('id, title, date, status')
    .order('date', { ascending: false })
    .limit(10);

  recentVisits?.forEach(visit => {
    notifications.push({
      id: `visit-${visit.id}`,
      type: 'visit',
      text: `Визит: ${visit.title}`,
      time: visit.date,
      relativeTime: formatRelativeDate(visit.date),
      read: false,
    });
  });

  // Критические риски комплектации
  const { data: riskyItems } = await supabase
    .from('supply_items')
    .select('id, name, lead_time_days, target_stage_id, status, created_at')
    .in('status', ['pending', 'approved', 'in_review'])
    .gt('lead_time_days', 0)
    .limit(20);

  if (riskyItems && riskyItems.length > 0) {
    const stageIds = [...new Set(riskyItems.map(si => si.target_stage_id).filter(Boolean))] as string[];
    const { data: stages } = stageIds.length > 0
      ? await supabase.from('stages').select('id, start_date').in('id', stageIds)
      : { data: [] };
    const stageMap = new Map<string, string>();
    stages?.forEach(s => { if (s.start_date) stageMap.set(s.id, s.start_date); });

    const today = new Date();
    riskyItems.forEach(si => {
      if (!si.target_stage_id) return;
      const stageStart = stageMap.get(si.target_stage_id);
      if (!stageStart) return;
      const deadline = new Date(stageStart);
      deadline.setDate(deadline.getDate() - si.lead_time_days);
      const daysUntil = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7) {
        notifications.push({
          id: `supply-${si.id}`,
          type: 'supply_risk',
          text: daysUntil < 0
            ? `Просрочен заказ: ${si.name} (${Math.abs(daysUntil)} дн.)`
            : `Скоро дедлайн заказа: ${si.name} (${daysUntil} дн.)`,
          time: si.created_at,
          relativeTime: daysUntil < 0 ? 'просрочен' : `${daysUntil} дн.`,
          read: false,
        });
      }
    });
  }

  return notifications
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 30);
}

// ======================== ACTIVITY FEED ========================

/** Fetch recent activity from photos, visits, invoices, supply items, members */
export async function fetchActivityFeed(limit: number = 50): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];

  // Scale sub-query limits relative to the requested total limit
  const photoLimit = Math.max(5, Math.ceil(limit * 0.4));
  const visitLimit = Math.max(3, Math.ceil(limit * 0.3));
  const invoiceLimit = Math.max(2, Math.ceil(limit * 0.15));
  const supplyLimit = Math.max(2, Math.ceil(limit * 0.15));

  // Recent photos
  const { data: photos } = await supabase
    .from('photo_records')
    .select('id, comment, status, zone, created_at, visit_id')
    .order('created_at', { ascending: false })
    .limit(photoLimit);

  photos?.forEach(p => {
    const zone = p.zone || 'Без зоны';
    const desc = p.comment ? `«${p.comment.slice(0, 50)}»` : zone;
    if (p.status === 'issue') {
      items.push({ id: `ph-${p.id}`, color: '#E85D3A', text: `Замечание: ${desc}`, time: p.created_at, relativeTime: '' });
    } else if (p.status === 'approved') {
      items.push({ id: `ph-${p.id}`, color: '#2A9D5C', text: `Фото принято: ${desc}`, time: p.created_at, relativeTime: '' });
    } else if (p.status === 'in_progress') {
      items.push({ id: `ph-${p.id}`, color: '#D4930D', text: `В работе: ${desc}`, time: p.created_at, relativeTime: '' });
    } else {
      items.push({ id: `ph-${p.id}`, color: '#2C5F2D', text: `Новое фото: ${desc}`, time: p.created_at, relativeTime: '' });
    }
  });

  // Recent visits
  const { data: visits } = await supabase
    .from('visits')
    .select('id, title, date, status, created_at')
    .order('created_at', { ascending: false })
    .limit(visitLimit);

  visits?.forEach(v => {
    if (v.status === 'planned') {
      items.push({ id: `vi-${v.id}`, color: '#2563EB', text: `Запланирован визит: ${v.title}`, time: v.created_at, relativeTime: '' });
    } else if (v.status === 'approved') {
      items.push({ id: `vi-${v.id}`, color: '#2A9D5C', text: `Визит завершён: ${v.title}`, time: v.created_at, relativeTime: '' });
    } else {
      items.push({ id: `vi-${v.id}`, color: '#E85D3A', text: `Визит с замечаниями: ${v.title}`, time: v.created_at, relativeTime: '' });
    }
  });

  // Recent invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, title, amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(invoiceLimit);

  invoices?.forEach(inv => {
    const amountStr = new Intl.NumberFormat('ru-RU').format(inv.amount) + ' \u20BD';
    if (inv.status === 'paid') {
      items.push({ id: `inv-${inv.id}`, color: '#2A9D5C', text: `Оплачен счёт: ${inv.title} (${amountStr})`, time: inv.created_at, relativeTime: '' });
    } else {
      items.push({ id: `inv-${inv.id}`, color: '#D4930D', text: `Выставлен счёт: ${inv.title} (${amountStr})`, time: inv.created_at, relativeTime: '' });
    }
  });

  // Recent supply changes
  const { data: supplyItems } = await supabase
    .from('supply_items')
    .select('id, name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(supplyLimit);

  supplyItems?.forEach(si => {
    const statusText: Record<string, string> = {
      ordered: 'заказана', delivered: 'доставлена', in_production: 'в производстве',
      approved: 'согласована', in_review: 'на проверке',
    };
    const action = statusText[si.status] || 'добавлена';
    items.push({ id: `si-${si.id}`, color: '#6B7280', text: `Позиция ${action}: ${si.name}`, time: si.created_at, relativeTime: '' });
  });

  // Sort by time and add relative dates
  return items
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit)
    .map(item => ({ ...item, relativeTime: formatRelativeDate(item.time) }));
}

/** Format short date (1 мар.) */
export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/** Format price in rubles */
export function formatPrice(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n) + ' \u20BD';
}

// ======================== DOCUMENTS ========================

export async function fetchProjectDocuments(projectId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Document[];
}

/** Upload a document file to Supabase Storage */
export async function uploadDocument(file: File, projectId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${projectId}/${fileName}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType: file.type,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/** Create a document record */
export async function createDocument(input: CreateDocumentInput): Promise<Document> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const insertData: Record<string, unknown> = {
      project_id: input.project_id,
      title: sanitize(input.title),
      version: input.version || '1.0',
      format: input.format,
      file_url: input.file_url,
      uploaded_by: user.id,
      status: input.status || 'draft',
  };
  if (input.category) insertData.category = input.category;

  const { data, error } = await supabase
    .from('documents')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as Document;
}

// ======================== DOCUMENTS BY CATEGORY ========================

/** Fetch documents filtered by category */
export async function fetchDocumentsByCategory(projectId: string, category: DocumentCategory): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .eq('category', category)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Document[];
}

// ======================== PROJECT PHOTOS (ALL) ========================

/** Fetch all photo records for a project (across all visits) */
export async function fetchProjectPhotos(projectId: string): Promise<PhotoRecordWithVisit[]> {
  // First get all visits
  const { data: visits, error: vErr } = await supabase
    .from('visits')
    .select('id, title, date')
    .eq('project_id', projectId);
  if (vErr) throw vErr;
  if (!visits || visits.length === 0) return [];

  const visitIds = visits.map(v => v.id);
  const { data: photos, error: pErr } = await supabase
    .from('photo_records')
    .select('*')
    .in('visit_id', visitIds)
    .order('created_at', { ascending: false });
  if (pErr) throw pErr;

  const visitMap = new Map(visits.map(v => [v.id, v]));
  return (photos || []).map(p => {
    const visit = visitMap.get(p.visit_id);
    return {
      ...(p as PhotoRecord),
      visit_title: visit?.title,
      visit_date: visit?.date,
    };
  });
}

// ======================== TASKS ========================

/** Fetch tasks for a project */
export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Task[];
}

/** Create a task */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: input.project_id,
      title: sanitize(input.title),
      description: input.description ? sanitize(input.description) : null,
      photo_record_id: input.photo_record_id || null,
      assigned_to: input.assigned_to || null,
      due_date: input.due_date || null,
      created_by: user.id,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

/** Update task status */
export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as Task;
}

/** Delete a task */
export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  if (error) throw new Error(humanError(error));
}

// ======================== PROJECT WEBCAM ========================

/** Update project webcam URL */
export async function updateProjectWebcam(projectId: string, webcamUrl: string | null): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ webcam_url: webcamUrl })
    .eq('id', projectId)
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as Project;
}

// ======================== PROJECT MEMBERS ========================

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId);
  if (error) throw error;
  return (data || []) as ProjectMember[];
}

/** Fetch members with joined profile data */
export async function fetchProjectMembersWithProfiles(projectId: string): Promise<ProjectMemberWithProfile[]> {
  const members = await fetchProjectMembers(projectId);
  if (members.length === 0) return [];

  const userIds = [...new Set(members.map(m => m.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const profileMap = new Map<string, Profile>();
  profiles?.forEach(p => profileMap.set(p.id, p as Profile));

  return members.map(m => ({
    ...m,
    profile: profileMap.get(m.user_id),
  }));
}

// ======================== INVITATIONS ========================

/** Create an invitation link for a project */
export async function createProjectInvitation(
  projectId: string,
  role: UserRole,
  accessLevel: AccessLevel
): Promise<ProjectInvitation> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { data, error } = await supabase
    .from('project_invitations')
    .insert({
      project_id: projectId,
      role,
      access_level: accessLevel,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProjectInvitation;
}

/** Accept an invitation by token (RPC) */
export async function acceptProjectInvitation(token: string): Promise<{ project_id: string; role: string } | null> {
  const { data, error } = await supabase.rpc('accept_project_invitation', { invite_token: token });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ======================== DELETE OPERATIONS ========================

/** Delete a project (cascading deletes handled by DB) */
export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  if (error) throw new Error(humanError(error));
}

/** Delete a visit */
export async function deleteVisit(visitId: string): Promise<void> {
  const { error } = await supabase
    .from('visits')
    .delete()
    .eq('id', visitId);
  if (error) throw new Error(humanError(error));
}

/** Delete a photo record */
export async function deletePhotoRecord(photoId: string): Promise<void> {
  const { error } = await supabase
    .from('photo_records')
    .delete()
    .eq('id', photoId);
  if (error) throw new Error(humanError(error));
}

/** Delete a document */
export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);
  if (error) throw new Error(humanError(error));
}

/** Remove a project member */
export async function removeProjectMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId);
  if (error) throw new Error(humanError(error));
}

/** Delete an invoice */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId);
  if (error) throw new Error(humanError(error));
}

// ======================== UPDATE OPERATIONS ========================

/** Update a visit (title, date, note) */
export async function updateVisit(
  visitId: string,
  updates: { title?: string; date?: string; note?: string; status?: string }
): Promise<Visit> {
  const sanitized: Record<string, unknown> = {};
  if (updates.title !== undefined) sanitized.title = sanitize(updates.title);
  if (updates.date !== undefined) sanitized.date = updates.date;
  if (updates.note !== undefined) sanitized.note = updates.note ? sanitize(updates.note) : null;
  if (updates.status !== undefined) sanitized.status = updates.status;

  const { data, error } = await supabase
    .from('visits')
    .update(sanitized)
    .eq('id', visitId)
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as Visit;
}

/** Toggle invoice status between pending ↔ paid */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'pending' | 'paid'
): Promise<Invoice> {
  const updates: Record<string, unknown> = { status };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  } else {
    updates.paid_at = null;
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId)
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as Invoice;
}

// ======================== HUMAN-READABLE ERRORS ========================

/** Convert Supabase error to user-friendly Russian message */
function humanError(err: { code?: string; message?: string; details?: string }): string {
  const code = err.code || '';
  const msg = err.message || '';

  // RLS policy violations
  if (code === '42501' || msg.includes('policy')) {
    return 'Недостаточно прав для выполнения этого действия';
  }
  // Foreign key violations
  if (code === '23503') {
    return 'Невозможно удалить: есть связанные данные. Сначала удалите зависимые записи';
  }
  // Unique constraint
  if (code === '23505') {
    return 'Такая запись уже существует';
  }
  // Not null violation
  if (code === '23502') {
    return 'Обязательное поле не заполнено';
  }
  // Check constraint
  if (code === '23514') {
    return 'Некорректное значение поля';
  }
  // Network / timeout
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) {
    return 'Ошибка сети. Проверьте подключение к интернету';
  }
  // Auth
  if (code === 'PGRST301' || msg.includes('JWT')) {
    return 'Сессия истекла. Войдите заново';
  }
  // Fallback
  return msg || 'Произошла ошибка. Попробуйте ещё раз';
}
