// ============================================================
// Archflow: Supabase query functions
// ============================================================

import { supabase } from './supabase';
import type {
  Project, Profile, Visit, PhotoRecord, Invoice,
  Document, SupplyItem, Stage, ContractPayment,
  ProjectMember, ProjectWithStats, VisitWithStats,
  PhotoStatus, SupplyStatus, RiskLevel,
  SupplyItemWithCalc, Notification,
  CreateProjectInput, CreateVisitInput,
  CreatePhotoRecordInput, CreateProjectMemberInput, CreateInvoiceInput,
  CreateSupplyItemInput, UpdateProfileInput,
} from './types';

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
      title: input.title,
      address: input.address || null,
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

/** Create a new visit */
export async function createVisit(input: CreateVisitInput): Promise<Visit> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { data, error } = await supabase
    .from('visits')
    .insert({
      project_id: input.project_id,
      title: input.title,
      date: input.date,
      note: input.note || null,
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
      comment: input.comment || null,
      status: input.status,
      zone: input.zone || null,
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
      title: input.title,
      amount: input.amount,
      due_date: input.due_date || null,
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
      name: input.name,
      category: input.category || null,
      target_stage_id: input.target_stage_id || null,
      lead_time_days: input.lead_time_days || 0,
      quantity: input.quantity || 1,
      supplier: input.supplier || null,
      budget: input.budget || 0,
      notes: input.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as SupplyItem;
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
  if (input.full_name !== undefined) updates.full_name = input.full_name;
  if (input.phone !== undefined) updates.phone = input.phone || null;
  if (input.telegram_id !== undefined) updates.telegram_id = input.telegram_id || null;
  if (input.company !== undefined) updates.company = input.company || null;

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

/** Compute notifications from existing data */
export async function fetchNotifications(): Promise<Notification[]> {
  const notifications: Notification[] = [];

  // Recent photo issues/resolved
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

  // Overdue invoices
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

  // Recent visits
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

  return notifications
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 20);
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
