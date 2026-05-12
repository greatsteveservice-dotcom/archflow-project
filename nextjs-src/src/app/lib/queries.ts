// ============================================================
// Archflow: Supabase query functions
// ============================================================

import { supabase } from './supabase';
import { sanitize, sanitizeUrl } from './sanitize';
import { runWithRetry, withReauth } from './retry';
import type {
  Project, Profile, Visit, PhotoRecord, Invoice,
  Document, SupplyItem, Stage, ContractPayment,
  ProjectMember, ProjectMemberWithProfile, ProjectInvitation,
  ProjectWithStats, VisitWithStats,
  PhotoStatus, SupplyStatus, RiskLevel, UserRole, AccessLevel,
  SupplyItemWithCalc, Notification, ActivityItem,
  CreateProjectInput, CreateVisitInput,
  CreatePhotoRecordInput, CreateProjectMemberInput, CreateInvoiceInput,
  CreateSupplyItemInput, UpdateSupplyItemInput, CreateDocumentInput, UpdateProfileInput,
  DocumentCategory, Task, TaskStatus, CreateTaskInput, PhotoRecordWithVisit,
  MemberRole, RbacMember, RbacMemberWithProfile, ProjectAccessSettings,
  VisitReport, VisitReportWithStats, VisitRemark, VisitRemarkWithDetails,
  RemarkComment, RemarkCommentWithProfile, ReportStatus, RemarkStatus,
  CreateVisitReportInput, CreateVisitRemarkInput, CreateRemarkCommentInput,
  ContractorTask, ContractorTaskWithDetails, CreateContractorTaskInput,
  ChatType, ChatMessage, ChatMessageWithAuthor, ChatRead, SendChatMessageInput,
  DesignFile, DesignFileWithProfile, DesignFileComment, DesignFileCommentWithProfile,
  DesignFolder, CreateDesignFileInput, DesignSubfolder,
  ProjectRoom, CreateProjectRoomInput,
  KindStageMapping, CreateKindStageMappingInput,
  OnboardingUpload,
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

/**
 * Throw on auth-broken errors (PGRST301 / "JWT expired" / "Invalid JWT") so
 * callers can surface them instead of treating an expired session as
 * "row not found". instrumentedFetch in lib/supabase.ts will also trigger
 * signOut → redirect on the same condition.
 */
function throwIfAuthBroken(error: { code?: string; message?: string } | null) {
  if (!error) return;
  const code = error.code;
  const msg = error.message || '';
  if (code === 'PGRST301' || /JWT|jwt|Invalid token/.test(msg)) {
    throw new Error('Session expired — please sign in again');
  }
}

/** Fetch a single project by ID */
export async function fetchProject(projectId: string): Promise<ProjectWithStats | null> {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  throwIfAuthBroken(error);
  if (error || !project) {
    if (error) console.error('[fetchProject] failed', projectId, error.code, error.message);
    return null;
  }

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

/** Update project fields */
export async function updateProject(projectId: string, updates: {
  title?: string;
  address?: string;
  scenario_type?: 'block' | 'gkl';
  start_date?: string | null;
  supply_discount?: number;
}): Promise<Project> {
  const payload: Record<string, unknown> = {};
  if (updates.title) payload.title = sanitize(updates.title);
  if (updates.address) payload.address = sanitize(updates.address);
  if (updates.scenario_type) payload.scenario_type = updates.scenario_type;
  if (updates.start_date !== undefined) payload.start_date = updates.start_date;
  if (updates.supply_discount !== undefined) payload.supply_discount = updates.supply_discount;

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
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
      cacheControl: '31536000',
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

/** Update photo record fields (zone, comment, status) */
export async function updatePhotoRecord(
  id: string,
  updates: { zone?: string; comment?: string; status?: PhotoStatus }
): Promise<PhotoRecord> {
  const { data, error } = await supabase
    .from('photo_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(humanError(error));
  return data as PhotoRecord;
}

/** Invite a project member by email */
export async function inviteProjectMember(input: CreateProjectMemberInput): Promise<ProjectMember> {
  // Use RPC to look up user by email (bypasses RLS)
  const { data: profileData, error: profileErr } = await supabase
    .rpc('lookup_profile_by_email', { target_email: input.email });

  if (profileErr || !profileData || profileData.length === 0) {
    throw new Error('Пользователь с таким email не зарегистрирован. Используйте приглашение по ссылке — участник зарегистрируется при переходе.');
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

/** Update access level for an existing project member */
export async function updateProjectMemberAccess(
  memberId: string,
  accessLevel: string,
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ access_level: accessLevel })
    .eq('id', memberId);
  if (error) throw error;
}

export async function updateProjectMemberRole(
  memberId: string,
  role: string,
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('id', memberId);
  if (error) throw error;
}

// ── Design file annotations (pins) ────────────────────────────────────────

export async function getFileAnnotations(fileId: string) {
  // FK author_id → auth.users (not profiles), so we hydrate authors separately.
  const { data: rows, error } = await supabase
    .from('design_file_annotations')
    .select('*')
    .eq('file_id', fileId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const list = rows || [];
  if (list.length === 0) return [] as Array<import('./types').DesignFileAnnotation>;
  const authorIds = Array.from(new Set(list.map((r: any) => r.author_id).filter(Boolean)));
  const { data: authors } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', authorIds);
  const byId = new Map((authors || []).map((p: any) => [p.id, p]));
  return list.map((r: any) => ({ ...r, author: byId.get(r.author_id) || null })) as Array<import('./types').DesignFileAnnotation>;
}

export async function createFileAnnotation(input: {
  fileId: string;
  parentId?: string | null;
  x?: number | null;
  y?: number | null;
  content: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');
  const { data, error } = await supabase
    .from('design_file_annotations')
    .insert({
      file_id: input.fileId,
      parent_id: input.parentId ?? null,
      author_id: user.id,
      x: input.parentId ? null : (input.x ?? null),
      y: input.parentId ? null : (input.y ?? null),
      content: input.content,
    })
    .select()
    .single();
  if (error) throw error;
  return data as import('./types').DesignFileAnnotation;
}

export async function updateFileAnnotationStatus(id: string, status: 'open' | 'resolved') {
  const { data: { user } } = await supabase.auth.getUser();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'resolved') {
    patch.resolved_by = user?.id || null;
    patch.resolved_at = new Date().toISOString();
  } else {
    patch.resolved_by = null;
    patch.resolved_at = null;
  }
  const { error } = await supabase
    .from('design_file_annotations')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFileAnnotation(id: string) {
  const { error } = await supabase
    .from('design_file_annotations')
    .delete()
    .eq('id', id);
  if (error) throw error;
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

/** Create a new construction stage */
export async function createStage(input: {
  project_id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  sort_order?: number;
}): Promise<Stage> {
  const { data, error } = await supabase
    .from('stages')
    .insert({
      project_id: input.project_id,
      name: sanitize(input.name),
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      sort_order: input.sort_order ?? 0,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Stage;
}

/** Update a stage */
export async function updateStage(stageId: string, updates: {
  name?: string;
  start_date?: string | null;
  end_date?: string | null;
  sort_order?: number;
  status?: string;
}): Promise<Stage> {
  const clean: Record<string, unknown> = {};
  if (updates.name !== undefined) clean.name = sanitize(updates.name);
  if (updates.start_date !== undefined) clean.start_date = updates.start_date;
  if (updates.end_date !== undefined) clean.end_date = updates.end_date;
  if (updates.sort_order !== undefined) clean.sort_order = updates.sort_order;
  if (updates.status !== undefined) clean.status = updates.status;

  const { data, error } = await supabase
    .from('stages')
    .update(clean)
    .eq('id', stageId)
    .select()
    .single();

  if (error) throw error;
  return data as Stage;
}

/** Delete a stage */
export async function deleteStage(stageId: string): Promise<void> {
  const { error } = await supabase
    .from('stages')
    .delete()
    .eq('id', stageId);

  if (error) throw error;
}

// ======================== PROJECT ROOMS ========================

/** Fetch rooms for a project */
export async function fetchProjectRooms(projectId: string): Promise<ProjectRoom[]> {
  const { data, error } = await supabase
    .from('project_rooms')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data || []) as ProjectRoom[];
}

/** Create a room */
export async function createRoom(input: CreateProjectRoomInput): Promise<ProjectRoom> {
  const { data, error } = await supabase
    .from('project_rooms')
    .insert({
      project_id: input.project_id,
      name: sanitize(input.name),
      area: input.area || null,
      sort_order: input.sort_order || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProjectRoom;
}

/** Update a room */
export async function updateRoom(roomId: string, updates: { name?: string; area?: number | null; sort_order?: number }): Promise<ProjectRoom> {
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = sanitize(updates.name);
  if (updates.area !== undefined) patch.area = updates.area;
  if (updates.sort_order !== undefined) patch.sort_order = updates.sort_order;

  const { data, error } = await supabase
    .from('project_rooms')
    .update(patch)
    .eq('id', roomId)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectRoom;
}

/** Delete a room */
export async function deleteRoom(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('project_rooms')
    .delete()
    .eq('id', roomId);

  if (error) throw error;
}

/** Rename room across supply_items (batch update when room name changes) */
export async function renameRoomInSupplyItems(projectId: string, oldName: string, newName: string): Promise<void> {
  const { error } = await supabase
    .from('supply_items')
    .update({ room: sanitize(newName) })
    .eq('project_id', projectId)
    .eq('room', oldName);

  if (error) throw error;
}

// ======================== KIND → STAGE MAPPING ========================

/** Fetch all kind→stage mappings for current user */
export async function fetchKindStageMappings(): Promise<KindStageMapping[]> {
  const { data, error } = await supabase
    .from('kind_stage_mappings')
    .select('*')
    .order('kind');

  if (error) throw error;
  return (data || []) as KindStageMapping[];
}

/** Upsert a kind→stage mapping (insert or update by user_id+kind) */
export async function upsertKindStageMapping(input: CreateKindStageMappingInput): Promise<KindStageMapping> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('kind_stage_mappings')
    .upsert(
      {
        user_id: user.id,
        kind: sanitize(input.kind),
        stage_name: sanitize(input.stage_name),
      },
      { onConflict: 'user_id,kind' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as KindStageMapping;
}

/** Delete a kind→stage mapping */
export async function deleteKindStageMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('kind_stage_mappings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/** Batch upsert kind→stage mappings */
export async function batchUpsertKindStageMappings(inputs: CreateKindStageMappingInput[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const rows = inputs.map((input) => ({
    user_id: user.id,
    kind: sanitize(input.kind),
    stage_name: sanitize(input.stage_name),
  }));

  const { error } = await supabase
    .from('kind_stage_mappings')
    .upsert(rows, { onConflict: 'user_id,kind' });

  if (error) throw error;
}

// ======================== SUPPLY ========================

/** Calculate derived supply fields (deadline, risk). Uses order_deadline_override if set. */
export function calcSupplyItem(item: SupplyItem, stages: Stage[]): SupplyItemWithCalc {
  const stage = stages.find(s => s.id === item.target_stage_id);
  const today = new Date();

  // If no stage at all — we may still honour a manual override
  if (!stage || !stage.start_date) {
    if (item.order_deadline_override) {
      const od = new Date(item.order_deadline_override);
      const daysUntil = Math.round((od.getTime() - today.getTime()) / 86_400_000);
      let riskCalc: RiskLevel = 'low';
      if (daysUntil < 0) riskCalc = 'critical';
      else if (daysUntil <= 7) riskCalc = 'high';
      else if (daysUntil <= 30) riskCalc = 'medium';
      return {
        ...item,
        orderDeadline: item.order_deadline_override,
        deliveryForecast: null,
        daysUntilDeadline: daysUntil,
        riskCalc,
        stageName: stage ? stage.name : '—',
        stageStart: null,
        orderDeadlineOverridden: true,
      };
    }
    return {
      ...item,
      orderDeadline: null,
      deliveryForecast: null,
      daysUntilDeadline: null,
      riskCalc: 'low' as RiskLevel,
      stageName: stage ? stage.name : '—',
      stageStart: stage ? stage.start_date : null,
      orderDeadlineOverridden: false,
    };
  }

  const stageStart = new Date(stage.start_date);
  let orderDeadline: Date;
  let overridden = false;
  if (item.order_deadline_override) {
    orderDeadline = new Date(item.order_deadline_override);
    overridden = true;
  } else {
    orderDeadline = new Date(stageStart);
    orderDeadline.setDate(orderDeadline.getDate() - item.lead_time_days);
  }

  const deliveryForecast = new Date(today);
  deliveryForecast.setDate(deliveryForecast.getDate() + item.lead_time_days);

  const daysUntil = Math.round(
    (orderDeadline.getTime() - today.getTime()) / 86_400_000
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
    orderDeadlineOverridden: overridden,
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
      group_name: input.group_name ? sanitize(input.group_name) : null,
      subcategory: input.subcategory ? sanitize(input.subcategory) : null,
      target_stage_id: input.target_stage_id || null,
      lead_time_days: input.lead_time_days || 0,
      quantity: input.quantity || 1,
      supplier: input.supplier ? sanitize(input.supplier) : null,
      budget: input.budget || 0,
      notes: input.notes ? sanitize(input.notes) : null,
      room: input.room ? sanitize(input.room) : null,
      url: input.url ? sanitize(input.url) : null,
      order_deadline_override: input.order_deadline_override || null,
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
    group_name: input.group_name ? sanitize(input.group_name) : null,
    subcategory: input.subcategory ? sanitize(input.subcategory) : null,
    target_stage_id: input.target_stage_id || null,
    lead_time_days: input.lead_time_days || 0,
    quantity: input.quantity || 1,
    supplier: input.supplier ? sanitize(input.supplier) : null,
    budget: input.budget || 0,
    notes: input.notes ? sanitize(input.notes) : null,
    room: input.room ? sanitize(input.room) : null,
    url: input.url ? sanitize(input.url) : null,
    order_deadline_override: input.order_deadline_override || null,
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

/** Generic update for a supply item — used by SupplyItemDrawer */
export async function updateSupplyItem(id: string, updates: UpdateSupplyItemInput): Promise<SupplyItem> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = sanitize(updates.name);
  if (updates.category !== undefined) payload.category = updates.category ? sanitize(updates.category) : null;
  if (updates.group_name !== undefined) payload.group_name = updates.group_name ? sanitize(updates.group_name) : null;
  if (updates.subcategory !== undefined) payload.subcategory = updates.subcategory ? sanitize(updates.subcategory) : null;
  if (updates.target_stage_id !== undefined) payload.target_stage_id = updates.target_stage_id;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.lead_time_days !== undefined) payload.lead_time_days = updates.lead_time_days;
  if (updates.quantity !== undefined) payload.quantity = updates.quantity;
  if (updates.supplier !== undefined) payload.supplier = updates.supplier ? sanitize(updates.supplier) : null;
  if (updates.budget !== undefined) payload.budget = updates.budget;
  if (updates.notes !== undefined) payload.notes = updates.notes ? sanitize(updates.notes) : null;
  if (updates.room !== undefined) payload.room = updates.room ? sanitize(updates.room) : null;
  if (updates.url !== undefined) payload.url = updates.url ? sanitize(updates.url) : null;
  if (updates.order_deadline_override !== undefined) payload.order_deadline_override = updates.order_deadline_override;

  const { data, error } = await supabase
    .from('supply_items')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SupplyItem;
}

/** Delete a single supply item */
export async function deleteSupplyItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('supply_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/** Delete all supply items for a project */
export async function deleteAllSupplyItems(projectId: string): Promise<number> {
  const { data, error } = await supabase
    .from('supply_items')
    .delete()
    .eq('project_id', projectId)
    .select('id');
  if (error) throw error;
  return data?.length || 0;
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

/** Upload avatar and update profile */
export async function uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);
  if (updateError) throw updateError;

  return avatarUrl;
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
      cacheControl: '31536000',
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

/** Update task assignment */
export async function updateTaskAssignment(taskId: string, assignedTo: string | null): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ assigned_to: assignedTo })
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

// ======================== SUPERVISION CONFIG ========================

const SV_KEY = (pid: string) => `archflow:sv_config:${pid}`;

/**
 * Load supervision config from `projects.supervision_config jsonb`.
 * Falls back to a localStorage cache so the UI has something to render
 * before the network round-trip resolves and during cold starts.
 *
 * IMPORTANT: this used to be localStorage-only, which meant settings
 * silently disappeared after logout (and the calendar lost its visit
 * and payment markers as a result). The DB column has existed since
 * migration 011 — we just weren't using it.
 */
export async function loadSupervisionConfig(
  projectId: string,
): Promise<import('./types').SupervisionConfig | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('supervision_config')
    .eq('id', projectId)
    .single();
  if (!error && data && (data as { supervision_config: unknown }).supervision_config) {
    const cfg = (data as { supervision_config: import('./types').SupervisionConfig }).supervision_config;
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(SV_KEY(projectId), JSON.stringify(cfg)); } catch { /* quota / private mode */ }
    }
    return cfg;
  }
  // DB read failed or column is null — fall back to local cache so the
  // first load after a redeploy doesn't flash empty for users who have
  // existing local settings. Their next save will mirror them to the DB.
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(SV_KEY(projectId));
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
  }
  return null;
}

/** Sync read of the local cache — used for instant first paint while the DB call is in flight. */
export function loadSupervisionConfigCached(
  projectId: string,
): import('./types').SupervisionConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SV_KEY(projectId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Persist supervision config to the DB through the auth-checked API
 * route. The route uses the service role to bypass the owner-only RLS
 * on `projects.UPDATE`, so member designers/assistants can save too.
 */
export async function saveSupervisionConfig(
  projectId: string,
  config: import('./types').SupervisionConfig,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Требуется авторизация');

  const res = await fetch('/api/supervision/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ projectId, config }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Не удалось сохранить настройки');
  }
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(SV_KEY(projectId), JSON.stringify(config)); } catch { /* ignore */ }
  }
}

// ======================== RBAC: MEMBERS + ACCESS SETTINGS ========================

/** Fetch RBAC members for a project (uses new columns from migration 012) */
export async function fetchRbacMembers(projectId: string): Promise<RbacMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .not('member_role', 'is', null)
    .order('created_at', { ascending: true });
  if (error) throw new Error(humanError(error));
  return (data || []) as RbacMember[];
}

/** Fetch RBAC members with profile data */
export async function fetchRbacMembersWithProfiles(projectId: string): Promise<RbacMemberWithProfile[]> {
  const members = await fetchRbacMembers(projectId);
  if (members.length === 0) return [];

  const userIds = members.map(m => m.user_id).filter(Boolean) as string[];
  if (userIds.length === 0) return members.map(m => ({ ...m }));

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const profileMap = new Map<string, import('./types').Profile>();
  profiles?.forEach(p => profileMap.set(p.id, p as import('./types').Profile));

  return members.map(m => ({
    ...m,
    profile: m.user_id ? profileMap.get(m.user_id) : undefined,
  }));
}

/** Create RBAC invite (inserts pending member with token) */
export async function createRbacInvite(
  projectId: string,
  memberRole: MemberRole,
  email: string
): Promise<RbacMember> {
  const token = crypto.randomUUID().replace(/-/g, '');
  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: projectId,
      member_role: memberRole,
      role: memberRole === 'team' ? 'assistant' : memberRole, // map to legacy user_role
      access_level: memberRole === 'team' ? 'full' : 'view',
      invite_token: token,
      invite_email: email.trim().toLowerCase(),
      status: 'pending',
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('Этот email уже приглашён в проект');
    throw new Error(humanError(error));
  }
  return data as RbacMember;
}

/** Remove RBAC member */
export async function removeRbacMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId);
  if (error) throw new Error(humanError(error));
}

/** Accept RBAC invite by token (uses RPC from migration 012) */
export async function acceptRbacInvite(token: string): Promise<{ project_id: string; role: string } | null> {
  return runWithRetry(async () => {
    const { data, error } = await supabase.rpc('accept_member_invite', { p_token: token });
    if (error) throw new Error(humanError(error));
    if (data?.error) throw new Error(data.error);
    return data;
  });
}

// ─── Access settings ────────────────────────────────────

/** Fetch access settings for a project */
export async function fetchAccessSettings(projectId: string): Promise<ProjectAccessSettings | null> {
  const { data, error } = await supabase
    .from('project_access_settings')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw new Error(humanError(error));
  return data as ProjectAccessSettings | null;
}

/** Upsert access settings for a project */
export async function upsertAccessSettings(
  projectId: string,
  settings: { client_can_see_design: boolean; client_can_see_furnishing: boolean }
): Promise<ProjectAccessSettings> {
  const { data, error } = await supabase
    .from('project_access_settings')
    .upsert(
      { project_id: projectId, ...settings },
      { onConflict: 'project_id' }
    )
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as ProjectAccessSettings;
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
  return runWithRetry(async () => {
    const { data, error } = await supabase.rpc('accept_project_invitation', { invite_token: token });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  });
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

// ======================== VISIT REPORTS ========================

/** Fetch all reports for a project, with remark stats */
export async function fetchVisitReports(projectId: string): Promise<VisitReportWithStats[]> {
  const { data, error } = await supabase
    .from('visit_reports')
    .select('*')
    .eq('project_id', projectId)
    .order('visit_date', { ascending: false });
  if (error) throw new Error(humanError(error));

  const reports = (data || []) as VisitReport[];
  if (reports.length === 0) return [];

  // Fetch remark stats in bulk
  const reportIds = reports.map(r => r.id);
  const { data: remarks } = await supabase
    .from('visit_remarks')
    .select('id, report_id, status')
    .in('report_id', reportIds);

  const remarksByReport = new Map<string, { total: number; open: number; resolved: number }>();
  (remarks || []).forEach(r => {
    const stats = remarksByReport.get(r.report_id) || { total: 0, open: 0, resolved: 0 };
    stats.total++;
    if (r.status === 'open') stats.open++;
    if (r.status === 'resolved') stats.resolved++;
    remarksByReport.set(r.report_id, stats);
  });

  return reports.map(r => {
    const stats = remarksByReport.get(r.id) || { total: 0, open: 0, resolved: 0 };
    return {
      ...r,
      remark_count: stats.total,
      open_count: stats.open,
      resolved_count: stats.resolved,
    };
  });
}

/** Fetch a single report by ID */
export async function fetchVisitReport(reportId: string): Promise<VisitReport | null> {
  const { data, error } = await supabase
    .from('visit_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();
  if (error) throw new Error(humanError(error));
  return data as VisitReport | null;
}

/** Create a visit report */
export async function createVisitReport(input: CreateVisitReportInput): Promise<VisitReport> {
  const { data, error } = await supabase
    .from('visit_reports')
    .insert({
      project_id: input.project_id,
      visit_date: input.visit_date,
      status: input.status || 'draft',
      general_comment: input.general_comment || null,
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('Отчёт на эту дату уже существует');
    throw new Error(humanError(error));
  }
  return data as VisitReport;
}

/** Update a visit report */
export async function updateVisitReport(
  reportId: string,
  updates: Partial<Pick<VisitReport, 'status' | 'general_comment' | 'visit_date'>>
): Promise<VisitReport> {
  const { data, error } = await supabase
    .from('visit_reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as VisitReport;
}

/**
 * Upload a supervision report cover image (used as page 1 of the generated PDF).
 * Stored in the same `documents` bucket but at a per-project path so it
 * persists across reports of the same project.
 */
export async function uploadSupervisionCover(file: File, projectId: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `cover-${crypto.randomUUID()}.${ext}`;
  const filePath = `${projectId}/supervision/${fileName}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '31536000',
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });
  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);
  return urlData.publicUrl;
}

/** Upload a report attachment file to Supabase Storage */
export async function uploadReportFile(file: File, projectId: string, reportId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${projectId}/reports/${reportId}/${fileName}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '31536000',
      contentType: file.type,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/** Add an attachment to a visit report */
export async function addReportAttachment(
  reportId: string,
  attachment: { name: string; file_url: string; size: number }
): Promise<VisitReport> {
  // Fetch current attachments
  const { data: report, error: fetchError } = await supabase
    .from('visit_reports')
    .select('attachments')
    .eq('id', reportId)
    .single();
  if (fetchError) throw new Error(humanError(fetchError));

  const current = (report?.attachments || []) as Array<{ name: string; file_url: string; size: number; uploaded_at: string }>;
  const updated = [...current, { ...attachment, uploaded_at: new Date().toISOString() }];

  const { data, error } = await supabase
    .from('visit_reports')
    .update({ attachments: updated })
    .eq('id', reportId)
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as VisitReport;
}

/** Remove an attachment from a visit report */
export async function removeReportAttachment(reportId: string, fileUrl: string): Promise<VisitReport> {
  const { data: report, error: fetchError } = await supabase
    .from('visit_reports')
    .select('attachments')
    .eq('id', reportId)
    .single();
  if (fetchError) throw new Error(humanError(fetchError));

  const current = (report?.attachments || []) as Array<{ name: string; file_url: string; size: number; uploaded_at: string }>;
  const updated = current.filter(a => a.file_url !== fileUrl);

  const { data, error } = await supabase
    .from('visit_reports')
    .update({ attachments: updated })
    .eq('id', reportId)
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as VisitReport;
}

/** Delete a visit report */
export async function deleteVisitReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('visit_reports')
    .delete()
    .eq('id', reportId);
  if (error) throw new Error(humanError(error));
}

// ─── Remarks ─────────────────────────────────────────────

/** Fetch remarks for a report with comments and assignee profiles */
export async function fetchVisitRemarks(reportId: string): Promise<VisitRemarkWithDetails[]> {
  const { data, error } = await supabase
    .from('visit_remarks')
    .select('*')
    .eq('report_id', reportId)
    .order('number', { ascending: true });
  if (error) throw new Error(humanError(error));

  const remarks = (data || []) as VisitRemark[];
  if (remarks.length === 0) return [];

  // Fetch comments
  const remarkIds = remarks.map(r => r.id);
  const { data: comments } = await supabase
    .from('remark_comments')
    .select('*')
    .in('remark_id', remarkIds)
    .order('created_at', { ascending: true });

  // Fetch unique user IDs for comments + assignees
  const userIds = new Set<string>();
  remarks.forEach(r => { if (r.assigned_to) userIds.add(r.assigned_to); });
  (comments || []).forEach(c => userIds.add(c.user_id));

  const profiles = new Map<string, Profile>();
  if (userIds.size > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(userIds));
    (profileData || []).forEach(p => profiles.set(p.id, p as Profile));
  }

  // Group comments by remark
  const commentsByRemark = new Map<string, RemarkCommentWithProfile[]>();
  (comments || []).forEach(c => {
    const arr = commentsByRemark.get(c.remark_id) || [];
    arr.push({ ...c, author: profiles.get(c.user_id) });
    commentsByRemark.set(c.remark_id, arr);
  });

  return remarks.map(r => ({
    ...r,
    assignee: r.assigned_to ? profiles.get(r.assigned_to) : undefined,
    comments: commentsByRemark.get(r.id) || [],
  }));
}

/** Create a remark */
export async function createVisitRemark(input: CreateVisitRemarkInput): Promise<VisitRemark> {
  // Get next number
  const { count } = await supabase
    .from('visit_remarks')
    .select('*', { count: 'exact', head: true })
    .eq('report_id', input.report_id);

  const { data, error } = await supabase
    .from('visit_remarks')
    .insert({
      report_id: input.report_id,
      project_id: input.project_id,
      number: (count || 0) + 1,
      text: sanitize(input.text),
      deadline: input.deadline || null,
      assigned_to: input.assigned_to || null,
    })
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as VisitRemark;
}

/** Update a remark */
export async function updateVisitRemark(
  remarkId: string,
  updates: Partial<Pick<VisitRemark, 'text' | 'status' | 'deadline' | 'assigned_to'>>
): Promise<VisitRemark> {
  const { data, error } = await supabase
    .from('visit_remarks')
    .update(updates)
    .eq('id', remarkId)
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as VisitRemark;
}

/** Delete a remark */
export async function deleteVisitRemark(remarkId: string): Promise<void> {
  const { error } = await supabase
    .from('visit_remarks')
    .delete()
    .eq('id', remarkId);
  if (error) throw new Error(humanError(error));
}

// ─── Remark Comments ─────────────────────────────────────

/** Create a remark comment */
export async function createRemarkComment(input: CreateRemarkCommentInput): Promise<RemarkComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('remark_comments')
    .insert({
      remark_id: input.remark_id,
      project_id: input.project_id,
      user_id: user.id,
      text: sanitize(input.text),
    })
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as RemarkComment;
}

// ─── Auto-draft ──────────────────────────────────────────

/** Check if today is a scheduled visit day and auto-create draft if needed */
export async function ensureTodayDraft(projectId: string, isScheduledToday: boolean): Promise<VisitReport | null> {
  if (!isScheduledToday) return null;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Check if report already exists for today
  const { data: existing } = await supabase
    .from('visit_reports')
    .select('id')
    .eq('project_id', projectId)
    .eq('visit_date', today)
    .maybeSingle();

  if (existing) return null; // already exists

  // Create draft
  try {
    return await createVisitReport({
      project_id: projectId,
      visit_date: today,
      status: 'draft',
    });
  } catch {
    return null; // silently fail (may be a race condition)
  }
}

// ======================== CONTRACTOR TASKS ========================

/** Fetch contractor tasks for a project with assignee profiles + remark info */
export async function fetchContractorTasks(projectId: string): Promise<ContractorTaskWithDetails[]> {
  const { data, error } = await supabase
    .from('contractor_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(humanError(error));

  const tasks = (data || []) as ContractorTask[];
  if (tasks.length === 0) return [];

  // Fetch assignee profiles
  const userIds = [...new Set(tasks.map(t => t.assigned_to))];
  const profiles = new Map<string, Profile>();
  if (userIds.length > 0) {
    const { data: pData } = await supabase.from('profiles').select('*').in('id', userIds);
    (pData || []).forEach(p => profiles.set(p.id, p as Profile));
  }

  // Fetch remark info for linked tasks
  const remarkIds = tasks.map(t => t.remark_id).filter(Boolean) as string[];
  const remarkMap = new Map<string, { number: number; date: string }>();
  if (remarkIds.length > 0) {
    const { data: rData } = await supabase
      .from('visit_remarks')
      .select('id, number, report_id')
      .in('id', remarkIds);
    if (rData && rData.length > 0) {
      const reportIds = [...new Set(rData.map(r => r.report_id))];
      const { data: repData } = await supabase
        .from('visit_reports')
        .select('id, visit_date')
        .in('id', reportIds);
      const reportDateMap = new Map<string, string>();
      (repData || []).forEach(r => reportDateMap.set(r.id, r.visit_date));
      rData.forEach(r => {
        remarkMap.set(r.id, { number: r.number, date: reportDateMap.get(r.report_id) || '' });
      });
    }
  }

  return tasks.map(t => ({
    ...t,
    assignee: profiles.get(t.assigned_to),
    remark_number: t.remark_id ? remarkMap.get(t.remark_id)?.number : undefined,
    remark_date: t.remark_id ? remarkMap.get(t.remark_id)?.date : undefined,
  }));
}

/** Fetch contractor tasks assigned to current user */
export async function fetchMyContractorTasks(): Promise<ContractorTaskWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('contractor_tasks')
    .select('*')
    .eq('assigned_to', user.id)
    .order('status', { ascending: true })
    .order('deadline', { ascending: true, nullsFirst: false });
  if (error) throw new Error(humanError(error));
  return (data || []) as ContractorTaskWithDetails[];
}

/** Fetch contractor tasks linked to a remark */
export async function fetchRemarkTasks(remarkId: string): Promise<ContractorTask[]> {
  const { data, error } = await supabase
    .from('contractor_tasks')
    .select('*')
    .eq('remark_id', remarkId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(humanError(error));
  return (data || []) as ContractorTask[];
}

/** Create contractor task */
export async function createContractorTask(input: CreateContractorTaskInput): Promise<ContractorTask> {
  const { data, error } = await supabase
    .from('contractor_tasks')
    .insert({
      project_id: input.project_id,
      title: sanitize(input.title),
      description: input.description ? sanitize(input.description) : null,
      assigned_to: input.assigned_to,
      deadline: input.deadline || null,
      remark_id: input.remark_id || null,
      photos: input.photos || null,
    })
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as ContractorTask;
}

/** Update contractor task */
export async function updateContractorTask(
  taskId: string,
  updates: Partial<Pick<ContractorTask, 'title' | 'description' | 'status' | 'deadline' | 'assigned_to' | 'completed_at'>>
): Promise<ContractorTask> {
  const { data, error } = await supabase
    .from('contractor_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw new Error(humanError(error));
  return data as ContractorTask;
}

/** Delete contractor task */
export async function deleteContractorTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('contractor_tasks')
    .delete()
    .eq('id', taskId);
  if (error) throw new Error(humanError(error));
}

/** Check if project has pending alerts (for badge) */
export async function checkProjectAlerts(projectId: string): Promise<boolean> {
  // 1. Has open/in_progress contractor tasks
  const { count: taskCount } = await supabase
    .from('contractor_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .in('status', ['open', 'in_progress']);
  if ((taskCount || 0) > 0) return true;

  // 2. Has open remarks with deadline <= today + 3 days
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const soonStr = soon.toISOString().slice(0, 10);
  const { count: remarkCount } = await supabase
    .from('visit_remarks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'open')
    .lte('deadline', soonStr);
  if ((remarkCount || 0) > 0) return true;

  return false;
}

// ======================== GLOBAL SEARCH ========================

export interface SearchResult {
  type: 'project' | 'visit' | 'document' | 'supply' | 'task';
  id: string;
  title: string;
  subtitle: string;
  projectId?: string;
  visitId?: string;
}

/** Search across projects, visits, documents, supply items, tasks */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim().toLowerCase();
  const results: SearchResult[] = [];

  // Search projects (title, address)
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, address, status')
    .or(`title.ilike.%${q}%,address.ilike.%${q}%`)
    .limit(5);

  projects?.forEach(p => {
    results.push({
      type: 'project',
      id: p.id,
      title: p.title,
      subtitle: p.address || p.status,
      projectId: p.id,
    });
  });

  // Search visits (title, note)
  const { data: visits } = await supabase
    .from('visits')
    .select('id, title, date, project_id')
    .or(`title.ilike.%${q}%`)
    .limit(5);

  visits?.forEach(v => {
    results.push({
      type: 'visit',
      id: v.id,
      title: v.title,
      subtitle: formatShortDate(v.date),
      projectId: v.project_id,
      visitId: v.id,
    });
  });

  // Search documents (title)
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, format, project_id')
    .ilike('title', `%${q}%`)
    .limit(5);

  docs?.forEach(d => {
    results.push({
      type: 'document',
      id: d.id,
      title: d.title,
      subtitle: d.format,
      projectId: d.project_id,
    });
  });

  // Search supply items (name, supplier, category)
  const { data: supply } = await supabase
    .from('supply_items')
    .select('id, name, supplier, category, project_id')
    .or(`name.ilike.%${q}%,supplier.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(5);

  supply?.forEach(s => {
    results.push({
      type: 'supply',
      id: s.id,
      title: s.name,
      subtitle: s.supplier || s.category || 'Комплектация',
      projectId: s.project_id,
    });
  });

  // Search tasks (title, description)
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, project_id')
    .or(`title.ilike.%${q}%`)
    .limit(5);

  tasks?.forEach(t => {
    const statusLabel: Record<string, string> = { open: 'Открыта', in_progress: 'В работе', done: 'Готово' };
    results.push({
      type: 'task',
      id: t.id,
      title: t.title,
      subtitle: statusLabel[t.status] || t.status,
      projectId: t.project_id,
    });
  });

  return results;
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

// ======================== CHAT ========================

/** Fetch chat messages for a project (newest first, paginated) */
export async function fetchChatMessages(
  projectId: string,
  limit = 50,
  before?: string,
  chatType?: ChatType,
): Promise<ChatMessageWithAuthor[]> {
  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (chatType) {
    query = query.eq('chat_type', chatType);
  }

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Fetch author profiles
  const userIds = [...new Set(data.map(m => m.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return data.map(m => ({
    ...m,
    author: profileMap.get(m.user_id) || undefined,
  }));
}

/** Send a chat message */
export async function sendChatMessage(
  input: SendChatMessageInput,
  userId: string,
): Promise<ChatMessage> {
  // withReauth: auto-refreshes the session and retries once if the JWT was
  // anon/expired by the time it hit the database (the "row violates RLS"
  // family of errors on mobile after the tab was backgrounded).
  return withReauth(async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        project_id: input.project_id,
        user_id: userId,
        text: sanitize(input.text),
        chat_type: input.chat_type || 'team',
        channel_id: input.channel_id || null,
        image_url: input.image_url || null,
        ref_type: input.ref_type || null,
        ref_id: input.ref_id || null,
        ref_preview: input.ref_preview ? sanitize(input.ref_preview) : null,
        message_type: input.message_type || 'text',
        voice_duration: input.voice_duration || null,
        voice_original: input.voice_original || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

/** Delete a chat message (own only, within 24h of sending) */
export async function deleteChatMessage(messageId: string): Promise<void> {
  // Pre-check so we can show a friendly error. RLS also enforces this server-side.
  const { data: msg, error: fetchErr } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('id', messageId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (msg?.created_at) {
    const age = Date.now() - new Date(msg.created_at).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      throw new Error('Сообщение можно удалить только в течение 24 часов после отправки');
    }
  }

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
}

/** Update a chat message text (own only) */
export async function updateChatMessage(
  messageId: string,
  text: string,
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .update({ text: sanitize(text) })
    .eq('id', messageId);

  if (error) throw error;
}

/** Toggle pin status of a chat message */
export async function toggleChatMessagePin(messageId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_pinned: pinned })
    .eq('id', messageId);

  if (error) throw error;
}

/** Fetch pinned messages for a project+chatType */
export async function fetchPinnedMessages(
  projectId: string,
  chatType: ChatType = 'team',
): Promise<ChatMessageWithAuthor[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('chat_type', chatType)
    .eq('is_pinned', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Fetch author profiles
  const userIds = [...new Set(data.map(m => m.user_id))] as string[];
  let profiles: Profile[] = [];
  if (userIds.length > 0) {
    const { data: p } = await supabase.from('profiles').select('*').in('id', userIds);
    profiles = (p || []) as Profile[];
  }
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return data.map(m => ({
    ...m,
    author: profileMap.get(m.user_id),
  })) as ChatMessageWithAuthor[];
}

/** Search chat messages by text */
export async function searchChatMessages(
  projectId: string,
  chatType: ChatType,
  query: string,
): Promise<ChatMessageWithAuthor[]> {
  const clean = query.trim();
  if (!clean) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('chat_type', chatType)
    .ilike('text', `%${clean}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map(m => m.user_id))] as string[];
  let profiles: Profile[] = [];
  if (userIds.length > 0) {
    const { data: p } = await supabase.from('profiles').select('*').in('id', userIds);
    profiles = (p || []) as Profile[];
  }
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return data.map(m => ({
    ...m,
    author: profileMap.get(m.user_id),
  })) as ChatMessageWithAuthor[];
}

/** Get or create the chat_reads row, return last_read_at */
export async function fetchChatRead(
  projectId: string,
  userId: string,
  chatType: ChatType = 'team',
): Promise<string | null> {
  const { data } = await supabase
    .from('chat_reads')
    .select('last_read_at')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('chat_type', chatType)
    .single();

  return data?.last_read_at || null;
}

/** Mark chat as read (upsert) */
export async function markChatRead(
  projectId: string,
  userId: string,
  chatType: ChatType = 'team',
): Promise<void> {
  const { error } = await supabase
    .from('chat_reads')
    .upsert(
      { project_id: projectId, user_id: userId, chat_type: chatType, last_read_at: new Date().toISOString() },
      { onConflict: 'project_id,user_id,chat_type' },
    );

  if (error) throw error;
}

/** Count unread messages per project for a user (sum of both chat types) */
export async function fetchUnreadCounts(
  projectIds: string[],
  userId: string,
): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map();

  // Get last read times for all projects (both chat types)
  const { data: reads } = await supabase
    .from('chat_reads')
    .select('project_id, chat_type, last_read_at')
    .eq('user_id', userId)
    .in('project_id', projectIds);

  // Key: "projectId:chatType" → last_read_at
  const readMap = new Map((reads || []).map(r => [`${r.project_id}:${r.chat_type}`, r.last_read_at]));
  const result = new Map<string, number>();

  // For each project, count unread in both chat types
  await Promise.all(
    projectIds.map(async (pid) => {
      let total = 0;
      for (const ct of ['team', 'client'] as const) {
        const lastRead = readMap.get(`${pid}:${ct}`);
        let query = supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', pid)
          .eq('chat_type', ct)
          .neq('user_id', userId);

        if (lastRead) {
          query = query.gt('created_at', lastRead);
        }

        const { count } = await query;
        if (count && count > 0) total += count;
      }
      if (total > 0) result.set(pid, total);
    }),
  );

  return result;
}

/** Count unread messages for a specific chat type in a project */
export async function fetchUnreadCountByType(
  projectId: string,
  userId: string,
  chatType: ChatType,
): Promise<number> {
  const { data: read } = await supabase
    .from('chat_reads')
    .select('last_read_at')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('chat_type', chatType)
    .single();

  let query = supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('chat_type', chatType)
    .neq('user_id', userId);

  if (read?.last_read_at) {
    query = query.gt('created_at', read.last_read_at);
  }

  const { count } = await query;
  return count || 0;
}

// ======================== PUSH SUBSCRIPTIONS ========================

/** Save a push subscription for the current user */
export async function savePushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
      },
      { onConflict: 'user_id,endpoint' },
    );

  if (error) throw error;
}

/** Remove a push subscription */
export async function removePushSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) throw error;
}

// ======================== CHAT CHANNELS ========================

/** Fetch chat channels for a project */
export async function fetchChatChannels(
  projectId: string,
): Promise<import('./types').ChatChannel[]> {
  const { data, error } = await supabase
    .from('chat_channels')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as import('./types').ChatChannel[];
}

/** Create a chat channel */
export async function createChatChannel(
  projectId: string,
  chatGroup: import('./types').ChatType,
  name: string,
): Promise<import('./types').ChatChannel> {
  const { data: { user } } = await supabase.auth.getUser();
  const clean = sanitize(name).trim();
  if (!clean) throw new Error('Имя канала не может быть пустым');

  const { data, error } = await supabase
    .from('chat_channels')
    .insert({ project_id: projectId, chat_group: chatGroup, name: clean, created_by: user?.id || null })
    .select()
    .single();

  if (error) throw error;
  return data as import('./types').ChatChannel;
}

/** Delete a chat channel */
export async function deleteChatChannel(channelId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_channels')
    .delete()
    .eq('id', channelId);
  if (error) throw error;
}

/** Upload a chat image to storage */
export async function uploadChatImage(
  projectId: string,
  file: File,
): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `chat/${projectId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from('design-files')
    .upload(path, file, { contentType: file.type });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from('design-files').getPublicUrl(path);
  return urlData.publicUrl;
}

// ======================== DESIGN FILES ========================

/** Fetch design files for a project, optionally filtered by folder */
export async function fetchDesignFiles(
  projectId: string,
  folder?: DesignFolder,
): Promise<DesignFileWithProfile[]> {
  let query = supabase
    .from('design_files')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (folder) {
    query = query.eq('folder', folder);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Fetch uploader profiles
  const uploaderIds = [...new Set(data.map(f => f.uploaded_by).filter(Boolean))] as string[];
  let profiles: Profile[] = [];
  if (uploaderIds.length > 0) {
    const { data: p } = await supabase.from('profiles').select('*').in('id', uploaderIds);
    profiles = (p || []) as Profile[];
  }
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return data.map(f => ({
    ...f,
    uploader: f.uploaded_by ? profileMap.get(f.uploaded_by) : undefined,
  })) as DesignFileWithProfile[];
}

/** Fetch file counts per folder for a project */
export async function fetchDesignFileCounts(
  projectId: string,
): Promise<Record<DesignFolder, number>> {
  const { data, error } = await supabase
    .from('design_files')
    .select('folder')
    .eq('project_id', projectId);

  if (error) throw error;

  const counts: Record<string, number> = { design_project: 0, visuals: 0, drawings: 0, furniture: 0, engineering: 0, documents: 0 };
  (data || []).forEach(f => {
    counts[f.folder] = (counts[f.folder] || 0) + 1;
  });
  return counts as Record<DesignFolder, number>;
}

/** Fetch a single design file by ID */
export async function fetchDesignFile(fileId: string): Promise<DesignFileWithProfile | null> {
  const { data, error } = await supabase
    .from('design_files')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error) return null;
  if (!data) return null;

  let uploader: Profile | undefined;
  if (data.uploaded_by) {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', data.uploaded_by).single();
    uploader = p as Profile | undefined;
  }

  return { ...data, uploader } as DesignFileWithProfile;
}

/** Create a design file record */
export async function createDesignFile(input: CreateDesignFileInput): Promise<DesignFile> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('design_files')
    .insert({
      project_id: input.project_id,
      folder: input.folder,
      subfolder: input.subfolder || null,
      name: sanitize(input.name),
      file_path: input.file_path,
      file_url: input.file_url,
      file_size: input.file_size || null,
      file_type: input.file_type || null,
      uploaded_by: user?.id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DesignFile;
}

/** Delete a design file (removes from storage too) */
export async function deleteDesignFile(fileId: string, filePath: string): Promise<void> {
  // Delete from storage
  await supabase.storage.from('design-files').remove([filePath]);

  // Delete from database
  const { error } = await supabase.from('design_files').delete().eq('id', fileId);
  if (error) throw error;
}

/** Rename a design file (DB field only — storage path and URL stay the same).
 *  Uses a server-side API route with service role key because the
 *  design_files table has no UPDATE RLS policy (only SELECT/INSERT/DELETE). */
export async function updateDesignFileName(fileId: string, newName: string): Promise<void> {
  const clean = sanitize(newName).trim();
  if (!clean) throw new Error('Имя файла не может быть пустым');
  if (clean.length > 200) throw new Error('Имя слишком длинное');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Требуется авторизация');

  const res = await fetch('/api/design/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId,
      name: clean,
      accessToken: session.access_token,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Ошибка переименования');
  }
}

/** Move a design file to a subfolder (or root if null) */
export async function moveDesignFileToSubfolder(fileId: string, subfolder: string | null): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Требуется авторизация');

  // Use the same API route as rename, but with subfolder field
  const res = await fetch('/api/design/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, subfolder, accessToken: session.access_token }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Ошибка перемещения');
  }
}

// ======================== DESIGN SUBFOLDERS ========================

/** Fetch subfolders for a project+folder */
export async function fetchDesignSubfolders(
  projectId: string,
  folder: DesignFolder,
): Promise<DesignSubfolder[]> {
  const { data, error } = await supabase
    .from('design_subfolders')
    .select('*')
    .eq('project_id', projectId)
    .eq('folder', folder)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data || []) as DesignSubfolder[];
}

/** Create a new subfolder */
export async function createDesignSubfolder(
  projectId: string,
  folder: DesignFolder,
  name: string,
): Promise<DesignSubfolder> {
  const clean = sanitize(name).trim();
  if (!clean) throw new Error('Имя папки не может быть пустым');

  const { data, error } = await supabase
    .from('design_subfolders')
    .insert({ project_id: projectId, folder, name: clean })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Папка с таким именем уже существует');
    throw error;
  }
  return data as DesignSubfolder;
}

/** Rename a subfolder */
export async function renameDesignSubfolder(id: string, newName: string): Promise<void> {
  const clean = sanitize(newName).trim();
  if (!clean) throw new Error('Имя папки не может быть пустым');

  const { error } = await supabase
    .from('design_subfolders')
    .update({ name: clean })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') throw new Error('Папка с таким именем уже существует');
    throw error;
  }
}

/** Delete a subfolder (files move to root) */
export async function deleteDesignSubfolder(id: string): Promise<void> {
  const { error } = await supabase
    .from('design_subfolders')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/** Fetch comments for a design file */
export async function fetchDesignFileComments(
  fileId: string,
): Promise<DesignFileCommentWithProfile[]> {
  const { data, error } = await supabase
    .from('design_file_comments')
    .select('*')
    .eq('file_id', fileId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map(c => c.user_id))];
  let profiles: Profile[] = [];
  if (userIds.length > 0) {
    const { data: p } = await supabase.from('profiles').select('*').in('id', userIds);
    profiles = (p || []) as Profile[];
  }
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return data.map(c => ({
    ...c,
    author: profileMap.get(c.user_id),
  })) as DesignFileCommentWithProfile[];
}

/** Add a comment to a design file */
export async function createDesignFileComment(
  fileId: string,
  projectId: string,
  text: string,
): Promise<DesignFileComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('design_file_comments')
    .insert({
      file_id: fileId,
      project_id: projectId,
      user_id: user.id,
      text: sanitize(text),
    })
    .select()
    .single();

  if (error) throw error;
  return data as DesignFileComment;
}

/** Delete a comment */
export async function deleteDesignFileComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('design_file_comments').delete().eq('id', commentId);
  if (error) throw error;
}

/** Count comments for a file */
export async function fetchDesignFileCommentCounts(
  fileIds: string[],
): Promise<Map<string, number>> {
  if (fileIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('design_file_comments')
    .select('file_id')
    .in('file_id', fileIds);

  if (error) return new Map();

  const counts = new Map<string, number>();
  (data || []).forEach(c => {
    counts.set(c.file_id, (counts.get(c.file_id) || 0) + 1);
  });
  return counts;
}

// ======================== NOTIFICATION PREFERENCES ========================

import type { NotificationPreferences, NotificationPreferencesInput } from './types';

/** Fetch notification preferences for a user+project */
export async function fetchNotificationPreferences(
  userId: string,
  projectId: string,
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;
  return data as NotificationPreferences | null;
}

/** Upsert notification preferences (create or update) */
export async function upsertNotificationPreferences(
  input: NotificationPreferencesInput,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(input, { onConflict: 'user_id,project_id' })
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
}

/** Generate a Telegram link token for the linking flow */
export async function generateTelegramLinkToken(
  userId: string,
  projectId: string,
): Promise<string> {
  const token = crypto.randomUUID();

  // Upsert to ensure row exists, set the link token
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      project_id: projectId,
      telegram_link_token: token,
    }, { onConflict: 'user_id,project_id' });

  if (error) {
    console.error('Telegram link token error:', error);
    throw new Error('Не удалось сгенерировать токен для Telegram. Попробуйте перезайти в аккаунт.');
  }
  return token;
}

/** Unlink Telegram from notification preferences */
export async function unlinkTelegram(
  userId: string,
  projectId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .update({
      telegram_enabled: false,
      telegram_chat_id: null,
      telegram_link_token: null,
    })
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) throw error;
}

// ======================== MAX ========================

/** Generate a one-time token for linking MAX messenger */
export async function generateMaxLinkToken(
  userId: string,
  projectId: string,
): Promise<string> {
  const token = crypto.randomUUID();

  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      project_id: projectId,
      max_link_token: token,
    }, { onConflict: 'user_id,project_id' });

  if (error) throw error;
  return token;
}

/** Unlink MAX from notification preferences */
export async function unlinkMax(
  userId: string,
  projectId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .update({
      max_enabled: false,
      max_chat_id: null,
      max_link_token: null,
    })
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) throw error;
}

// ======================== ASSISTANT ========================

import type { AssistantEvent, AssistantEventStatus, Reminder, ChatAnalysisResult } from './types';

/** Fetch active assistant events for a project */
export async function fetchAssistantEvents(
  projectId: string,
  status: AssistantEventStatus = 'active',
): Promise<AssistantEvent[]> {
  const { data, error } = await supabase
    .from('assistant_events')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', status)
    .order('priority', { ascending: true }) // urgent first
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as AssistantEvent[];
}

/** Dismiss an assistant event */
export async function dismissAssistantEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('assistant_events')
    .update({ status: 'dismissed' })
    .eq('id', eventId);
  if (error) throw error;
}

/** Mark an assistant event as done */
export async function completeAssistantEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('assistant_events')
    .update({ status: 'done' })
    .eq('id', eventId);
  if (error) throw error;
}

/** Create a reminder */
export async function createReminder(input: {
  project_id: string;
  chat_type?: string;
  action_text: string;
  target_role: string;
  remind_at: string;
}): Promise<Reminder> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('reminders')
    .insert({ ...input, created_by: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Reminder;
}

/** Fetch reminders for a project */
export async function fetchReminders(
  projectId: string,
  status?: string,
): Promise<Reminder[]> {
  let q = supabase
    .from('reminders')
    .select('*')
    .eq('project_id', projectId)
    .order('remind_at', { ascending: true });

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Reminder[];
}

/** Trigger project analysis via Edge Function */
export async function triggerProjectAnalysis(projectId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  await fetch('https://fcbllfvlpzlczinlydcm.supabase.co/functions/v1/analyze-project', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ project_id: projectId }),
  });
}

/** Analyze chat messages via Edge Function */
export async function analyzeChatMessages(
  projectId: string,
  chatType: string,
  messages: { author: string; text: string }[],
): Promise<ChatAnalysisResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch('https://fcbllfvlpzlczinlydcm.supabase.co/functions/v1/analyze-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      project_id: projectId,
      chat_type: chatType,
      last_messages: messages,
    }),
  });

  if (!res.ok) return { found: false };
  return await res.json();
}

// ======================== EMAIL EVIDENCE ========================

import type { EmailSend, EmailEvent, EmailDeliveryStatus } from './types';

/** Fetch email sends for a specific report */
export async function fetchReportEmailSends(reportId: string): Promise<EmailSend[]> {
  const { data, error } = await supabase
    .from('email_sends')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Enrich with recipient profiles
  const userIds = [...new Set(data.filter(s => s.recipient_user_id).map(s => s.recipient_user_id))];
  let profiles: Profile[] = [];
  if (userIds.length > 0) {
    const { data: p } = await supabase.from('profiles').select('*').in('id', userIds);
    profiles = (p || []) as Profile[];
  }
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return data.map(s => ({
    ...s,
    recipient_profile: s.recipient_user_id ? profileMap.get(s.recipient_user_id) : undefined,
  })) as EmailSend[];
}

/** Fetch all email sends for a project */
export async function fetchProjectEmailSends(projectId: string): Promise<EmailSend[]> {
  const { data, error } = await supabase
    .from('email_sends')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as EmailSend[];
}

/** Fetch email events for a specific send */
export async function fetchEmailEvents(emailSendId: string): Promise<EmailEvent[]> {
  const { data, error } = await supabase
    .from('email_events')
    .select('*')
    .eq('email_send_id', emailSendId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as EmailEvent[];
}

/** Fetch aggregated delivery status for a report (worst-case across recipients) */
export async function fetchReportDeliveryStatus(
  reportId: string,
): Promise<EmailDeliveryStatus | null> {
  const { data, error } = await supabase
    .from('email_sends')
    .select('status')
    .eq('report_id', reportId);

  if (error || !data || data.length === 0) return null;

  // Priority: bounced > sending > sent > delivered > opened > confirmed > auto_accepted
  const statuses = data.map(s => s.status as EmailDeliveryStatus);
  if (statuses.includes('bounced')) return 'bounced';
  if (statuses.includes('sending')) return 'sending';
  if (statuses.includes('sent')) return 'sent';
  if (statuses.includes('delivered')) return 'delivered';
  if (statuses.includes('opened')) return 'opened';
  if (statuses.includes('confirmed')) return 'confirmed';
  if (statuses.includes('auto_accepted')) return 'auto_accepted';
  return statuses[0] || null;
}

/** Bulk fetch delivery statuses for multiple reports */
export async function fetchReportDeliveryStatuses(
  reportIds: string[],
): Promise<Map<string, EmailDeliveryStatus>> {
  if (reportIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('email_sends')
    .select('report_id, status')
    .in('report_id', reportIds);

  if (error || !data) return new Map();

  // Group by report_id, pick worst status
  const byReport = new Map<string, EmailDeliveryStatus[]>();
  for (const row of data) {
    const list = byReport.get(row.report_id) || [];
    list.push(row.status as EmailDeliveryStatus);
    byReport.set(row.report_id, list);
  }

  const result = new Map<string, EmailDeliveryStatus>();
  for (const [reportId, statuses] of byReport) {
    if (statuses.includes('bounced')) { result.set(reportId, 'bounced'); continue; }
    if (statuses.includes('sending')) { result.set(reportId, 'sending'); continue; }
    if (statuses.includes('sent')) { result.set(reportId, 'sent'); continue; }
    if (statuses.includes('delivered')) { result.set(reportId, 'delivered'); continue; }
    if (statuses.includes('opened')) { result.set(reportId, 'opened'); continue; }
    if (statuses.includes('confirmed')) { result.set(reportId, 'confirmed'); continue; }
    if (statuses.includes('auto_accepted')) { result.set(reportId, 'auto_accepted'); continue; }
    result.set(reportId, statuses[0]);
  }

  return result;
}

/** Fetch upcoming timeline items (visits + stages + payments) for 2 weeks */
export async function fetchUpcomingTimeline(projectId: string): Promise<any[]> {
  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [visitsRes, stagesRes, paymentsRes] = await Promise.all([
    supabase.from('visits').select('id, title, date, status')
      .eq('project_id', projectId)
      .gte('date', today).lte('date', twoWeeks)
      .order('date'),
    supabase.from('stages').select('id, name, end_date, status')
      .eq('project_id', projectId)
      .not('end_date', 'is', null)
      .gte('end_date', today).lte('end_date', twoWeeks)
      .order('end_date'),
    supabase.from('contract_payments').select('id, type, amount, next_due, status')
      .eq('project_id', projectId)
      .not('next_due', 'is', null)
      .gte('next_due', today).lte('next_due', twoWeeks)
      .order('next_due'),
  ]);

  const items: any[] = [];

  (visitsRes.data || []).forEach(v => items.push({
    type: 'visit', id: v.id, title: v.title,
    date: v.date, status: v.status,
  }));

  (stagesRes.data || []).forEach(s => items.push({
    type: 'stage', id: s.id, title: s.name,
    date: s.end_date, status: s.status,
  }));

  const typeLabel: Record<string, string> = {
    supervision: 'АН', design: 'Дизайн', supply_commission: 'Комиссия',
  };
  (paymentsRes.data || []).forEach(p => items.push({
    type: 'payment', id: p.id,
    title: `${typeLabel[p.type] || p.type}: ${p.amount?.toLocaleString('ru-RU')} ₽`,
    date: p.next_due, status: p.status,
  }));

  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return items;
}

// ======================== CLIENT HOME (project-scoped) ========================

import type { DocumentSignature } from './types';

/** Pending signatures for a project — for the current authed user (client) */
export async function fetchPendingSignatures(projectId: string, userId: string): Promise<DocumentSignature[]> {
  const { data, error } = await supabase
    .from('document_signatures')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .in('status', ['sent', 'viewed'])
    .order('sent_at', { ascending: true });
  if (error) throw error;
  return (data || []) as DocumentSignature[];
}

/** Contract payments due in next N days, not yet paid */
export async function fetchDuePayments(projectId: string, days: number = 30): Promise<ContractPayment[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 86400000).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('contract_payments')
    .select('*')
    .eq('project_id', projectId)
    .neq('status', 'paid')
    .not('next_due', 'is', null)
    .gte('next_due', today)
    .lte('next_due', horizon)
    .order('next_due', { ascending: true });
  if (error) throw error;
  return (data || []) as ContractPayment[];
}

/**
 * Project-scoped activity feed: design uploads, photos, visits, invoices, supply changes.
 * Each item has a `who` (display name) when available so client sees "Анна загрузила…"
 */
export async function fetchProjectActivity(projectId: string, limit: number = 8): Promise<Array<{
  id: string;
  kind: 'design' | 'photo' | 'visit' | 'invoice' | 'supply';
  text: string;
  who: string | null;
  whoInitials: string | null;
  time: string;
  relativeTime: string;
}>> {
  const items: Array<any> = [];
  const per = Math.max(3, Math.ceil(limit / 2));

  const [designsRes, photosRes, visitsRes, invoicesRes, suppliesRes] = await Promise.all([
    supabase
      .from('design_files')
      .select('id, name, folder, created_at, uploaded_by')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(per),
    supabase
      .from('photo_records')
      .select('id, comment, status, zone, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(per),
    supabase
      .from('visits')
      .select('id, title, status, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(per),
    supabase
      .from('invoices')
      .select('id, title, amount, status, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(Math.max(2, Math.ceil(per / 2))),
    supabase
      .from('supply_items')
      .select('id, name, status, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(Math.max(2, Math.ceil(per / 2))),
  ]);

  // Resolve uploader profiles for design files
  const uploaderIds = Array.from(new Set((designsRes.data || []).map(d => d.uploaded_by).filter(Boolean) as string[]));
  let profileMap: Record<string, string> = {};
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uploaderIds);
    (profiles || []).forEach(p => { profileMap[p.id] = p.full_name; });
  }

  const initials = (name: string | null): string => {
    if (!name) return '·';
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  };

  const folderLabel: Record<string, string> = {
    design_project: 'Дизайн-проект',
    visuals: 'Визуализации',
    drawings: 'Чертежи',
    furniture: 'Мебель',
    engineering: 'Инженерия',
    documents: 'Документы',
  };

  (designsRes.data || []).forEach(f => {
    const who = f.uploaded_by ? profileMap[f.uploaded_by] || null : null;
    const folder = folderLabel[f.folder] || f.folder || 'Дизайн';
    items.push({
      id: `df-${f.id}`, kind: 'design',
      text: `загрузил${who?.match(/а\s*$/) ? 'а' : ''} файл «${f.name}» в раздел «${folder}»`,
      who, whoInitials: initials(who),
      time: f.created_at,
    });
  });

  (photosRes.data || []).forEach(p => {
    const zone = p.zone || 'Без зоны';
    const stub = p.comment ? `«${p.comment.slice(0, 40)}»` : zone;
    let text = '';
    if (p.status === 'issue') text = `Замечание · ${stub}`;
    else if (p.status === 'approved') text = `Принято фото · ${stub}`;
    else if (p.status === 'in_progress') text = `В работе · ${stub}`;
    else text = `Новое фото · ${stub}`;
    items.push({ id: `ph-${p.id}`, kind: 'photo', text, who: null, whoInitials: null, time: p.created_at });
  });

  (visitsRes.data || []).forEach(v => {
    let text = '';
    if (v.status === 'planned') text = `Запланирован визит · ${v.title}`;
    else if (v.status === 'approved') text = `Визит завершён · ${v.title}`;
    else text = `Визит с замечаниями · ${v.title}`;
    items.push({ id: `vi-${v.id}`, kind: 'visit', text, who: null, whoInitials: null, time: v.created_at });
  });

  (invoicesRes.data || []).forEach(inv => {
    const amt = new Intl.NumberFormat('ru-RU').format(inv.amount) + ' ₽';
    const text = inv.status === 'paid'
      ? `Оплачен счёт · ${inv.title} (${amt})`
      : `Выставлен счёт · ${inv.title} (${amt})`;
    items.push({ id: `inv-${inv.id}`, kind: 'invoice', text, who: null, whoInitials: null, time: inv.created_at });
  });

  (suppliesRes.data || []).forEach(si => {
    const action: Record<string, string> = {
      ordered: 'заказана', delivered: 'доставлена', in_production: 'в производстве',
      approved: 'согласована', in_review: 'на проверке',
    };
    items.push({
      id: `si-${si.id}`, kind: 'supply',
      text: `Позиция ${action[si.status] || 'добавлена'} · ${si.name}`,
      who: null, whoInitials: null, time: si.created_at,
    });
  });

  return items
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit)
    .map(item => ({ ...item, relativeTime: formatRelativeDate(item.time) }));
}

// ======================== MOODBOARDS ========================

import type { Moodboard, MoodboardWithStats, MoodboardItem, MoodboardComment, MoodboardSection } from './types';

export async function fetchMoodboards(projectId: string): Promise<MoodboardWithStats[]> {
  const { data, error } = await supabase
    .from('moodboards')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!data) return [];

  // Get item counts per moodboard
  const ids = data.map(m => m.id);
  if (ids.length === 0) return [];

  const { data: counts } = await supabase
    .from('moodboard_items')
    .select('moodboard_id')
    .in('moodboard_id', ids);

  const countMap: Record<string, number> = {};
  (counts || []).forEach(c => {
    countMap[c.moodboard_id] = (countMap[c.moodboard_id] || 0) + 1;
  });

  return data.map(m => ({ ...m, item_count: countMap[m.id] || 0 }));
}

export async function fetchMoodboard(moodboardId: string): Promise<Moodboard | null> {
  const { data, error } = await supabase
    .from('moodboards')
    .select('*')
    .eq('id', moodboardId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMoodboardItems(moodboardId: string): Promise<MoodboardItem[]> {
  const { data, error } = await supabase
    .from('moodboard_items')
    .select('*')
    .eq('moodboard_id', moodboardId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createMoodboard(input: {
  project_id: string;
  title: string;
  description?: string;
  room_type?: string;
}): Promise<Moodboard> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('moodboards')
    .insert({ ...input, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMoodboard(id: string, updates: Partial<Pick<Moodboard, 'title' | 'description' | 'room_type' | 'style_tags' | 'is_public' | 'public_token' | 'client_can_comment' | 'color_palette'>> & { canvas_viewport?: { x: number; y: number; scale: number } }): Promise<void> {
  const { error } = await supabase
    .from('moodboards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMoodboard(id: string): Promise<void> {
  // First delete storage files for all items
  const { data: items } = await supabase
    .from('moodboard_items')
    .select('file_path')
    .eq('moodboard_id', id)
    .not('file_path', 'is', null);
  if (items && items.length > 0) {
    const paths = items.map(i => i.file_path).filter(Boolean) as string[];
    if (paths.length > 0) {
      await supabase.storage.from('moodboard-images').remove(paths);
    }
  }
  const { error } = await supabase.from('moodboards').delete().eq('id', id);
  if (error) throw error;
}

export async function createMoodboardItem(input: {
  moodboard_id: string;
  type: string;
  image_url?: string;
  thumbnail_url?: string;
  file_path?: string;
  title?: string;
  source_url?: string;
  source_platform?: string;
  text_content?: string;
  text_color?: string;
  bg_color?: string;
  color_hex?: string;
  color_name?: string;
  canvas_x?: number;
  canvas_y?: number;
  canvas_w?: number;
  canvas_h?: number;
  section_id?: string;
  supply_item_id?: string;
}): Promise<MoodboardItem> {
  // Auto-assign position (append to end)
  const { data: last } = await supabase
    .from('moodboard_items')
    .select('position')
    .eq('moodboard_id', input.moodboard_id)
    .order('position', { ascending: false })
    .limit(1)
    .single();
  const position = (last?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('moodboard_items')
    .insert({ ...input, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMoodboardItem(id: string, updates: Partial<Pick<MoodboardItem, 'title' | 'position' | 'text_content' | 'text_color' | 'bg_color' | 'color_hex' | 'color_name' | 'client_reaction' | 'client_comment' | 'dominant_colors' | 'canvas_x' | 'canvas_y' | 'canvas_w' | 'canvas_h' | 'section_id'>>): Promise<void> {
  const { error } = await supabase
    .from('moodboard_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMoodboardItem(id: string, filePath?: string | null): Promise<void> {
  if (filePath) {
    await supabase.storage.from('moodboard-images').remove([filePath]);
  }
  const { error } = await supabase.from('moodboard_items').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderMoodboardItems(moodboardId: string, orderedIds: string[]): Promise<void> {
  // Bulk update positions
  const updates = orderedIds.map((id, i) => supabase
    .from('moodboard_items')
    .update({ position: i })
    .eq('id', id)
    .eq('moodboard_id', moodboardId)
  );
  await Promise.all(updates);
}

export async function toggleMoodboardPublic(moodboardId: string, isPublic: boolean): Promise<string | null> {
  const updates: Record<string, unknown> = { is_public: isPublic, updated_at: new Date().toISOString() };
  if (isPublic) {
    updates.public_token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  const { data, error } = await supabase
    .from('moodboards')
    .update(updates)
    .eq('id', moodboardId)
    .select('public_token')
    .single();
  if (error) throw error;
  return data?.public_token || null;
}

export async function fetchMoodboardComments(moodboardId: string): Promise<MoodboardComment[]> {
  const { data, error } = await supabase
    .from('moodboard_comments')
    .select('*')
    .eq('moodboard_id', moodboardId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ═══ SUPPLY SEARCH FOR CATALOG TOOL ═══

export async function searchProjectSupplyItems(projectId: string, query: string): Promise<Array<{ id: string; name: string; budget: number; category: string | null; supplier: string | null }>> {
  let q = supabase
    .from('supply_items')
    .select('id, name, budget, category, supplier')
    .eq('project_id', projectId)
    .order('name', { ascending: true })
    .limit(50);
  if (query.trim()) {
    q = q.ilike('name', `%${query.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// ═══ MOODBOARD SECTIONS (canvas room zones) ═══

export async function fetchMoodboardSections(moodboardId: string): Promise<MoodboardSection[]> {
  const { data, error } = await supabase
    .from('moodboard_sections')
    .select('*')
    .eq('moodboard_id', moodboardId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createMoodboardSection(input: {
  moodboard_id: string;
  title?: string;
  area_label?: string;
  canvas_x?: number;
  canvas_y?: number;
  canvas_w?: number;
  canvas_h?: number;
}): Promise<MoodboardSection> {
  const { data, error } = await supabase
    .from('moodboard_sections')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMoodboardSection(id: string, updates: Partial<Pick<MoodboardSection, 'title' | 'area_label' | 'canvas_x' | 'canvas_y' | 'canvas_w' | 'canvas_h' | 'sort_order'>>): Promise<void> {
  const { error } = await supabase
    .from('moodboard_sections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMoodboardSection(id: string): Promise<void> {
  const { error } = await supabase.from('moodboard_sections').delete().eq('id', id);
  if (error) throw error;
}

export async function createMoodboardComment(moodboardId: string, content: string, itemId?: string): Promise<MoodboardComment> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('moodboard_comments')
    .insert({
      moodboard_id: moodboardId,
      item_id: itemId || null,
      author_type: 'designer',
      author_user_id: user?.id,
      content,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ======================== ONBOARDING QUEUE ========================

/** Список файлов в очереди онбординга для проекта (всё, что ещё не подтверждено/отклонено). */
export async function listOnboardingPending(projectId: string): Promise<OnboardingUpload[]> {
  const { data, error } = await supabase
    .from('onboarding_uploads')
    .select('*')
    .eq('project_id', projectId)
    .in('status', ['pending', 'auto_placed', 'needs_review', 'supply_suggested'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as OnboardingUpload[];
}

/** Запустить классификацию пакета загруженных файлов. Возвращает классификации, не обновляет UI. */
export async function classifyOnboardingBatch(
  projectId: string,
  files: { storagePath: string; name: string; size: number; mime: string }[],
): Promise<{ items: OnboardingUpload[]; cost_usd?: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Требуется авторизация');

  const res = await fetch('/api/onboarding/classify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ projectId, files }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Ошибка классификации');
  }
  return res.json();
}

/** Подтвердить категорию (или изменить и перенести в design_files). */
export async function confirmOnboardingItem(
  uploadId: string,
  finalCategory: DesignFolder,
): Promise<DesignFile> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Требуется авторизация');

  const res = await fetch('/api/onboarding/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ uploadId, finalCategory }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Ошибка подтверждения');
  }
  const json = await res.json();
  return json.designFile as DesignFile;
}

/** Отклонить файл — удаляет из Storage и помечает rejected. */
export async function rejectOnboardingItem(uploadId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Требуется авторизация');

  const res = await fetch('/api/onboarding/reject', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ uploadId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Ошибка отклонения');
  }
}
