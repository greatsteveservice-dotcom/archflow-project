// ============================================================
// Archflow: Supabase query functions
// ============================================================

import { supabase } from './supabase';
import type {
  Project, Profile, Visit, PhotoRecord, Invoice,
  Document, SupplyItem, Stage, ContractPayment,
  ProjectMember, ProjectWithStats, VisitWithStats,
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
