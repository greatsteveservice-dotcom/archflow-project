// ============================================================
// Archflow: React hooks for Supabase data fetching
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProjectWithStats, VisitWithStats, PhotoRecord, Profile, Stage, SupplyItem, Invoice, Notification, ActivityItem, Document, ProjectMember, ProjectMemberWithProfile, DocumentCategory, Task, PhotoRecordWithVisit } from './types';
import {
  fetchProjects,
  fetchProjectsPaginated,
  PROJECTS_PAGE_SIZE,
  fetchProject,
  fetchProjectVisits,
  fetchVisit,
  fetchVisitPhotos,
  fetchCurrentProfile,
  fetchProjectStages,
  fetchProjectSupplyItems,
  fetchProjectInvoices,
  fetchNotifications,
  fetchProjectDocuments,
  fetchProjectMembers,
  fetchProjectMembersWithProfiles,
  fetchActivityFeed,
  fetchDocumentsByCategory,
  fetchProjectPhotos,
  fetchProjectTasks,
} from './queries';

// ======================== GENERIC HOOK ========================

interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then(result => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'Ошибка загрузки данных');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  return { data, loading, error, refetch };
}

// ======================== SPECIFIC HOOKS ========================

/** Fetch all projects with stats */
export function useProjects() {
  return useQuery<ProjectWithStats[]>(() => fetchProjects(), []);
}

/** Paginated projects result */
export interface UsePaginatedProjectsResult {
  projects: ProjectWithStats[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

/** Fetch projects with server-side pagination (accumulates pages) */
export function useProjectsPaginated(pageSize: number = PROJECTS_PAGE_SIZE): UsePaginatedProjectsResult {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load first page (or re-load on refetch)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(0);
    setProjects([]);

    fetchProjectsPaginated(0, pageSize)
      .then(result => {
        if (!cancelled) {
          setProjects(result.data);
          setTotal(result.total);
          setHasMore(result.hasMore);
          setPage(0);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'Ошибка загрузки проектов');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [pageSize, refreshKey]);

  // Load more pages
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);

    fetchProjectsPaginated(nextPage, pageSize)
      .then(result => {
        setProjects(prev => [...prev, ...result.data]);
        setTotal(result.total);
        setHasMore(result.hasMore);
        setPage(nextPage);
        setLoadingMore(false);
      })
      .catch(err => {
        setError(err.message || 'Ошибка загрузки проектов');
        setLoadingMore(false);
      });
  }, [page, pageSize, loadingMore, hasMore]);

  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  return { projects, total, loading, loadingMore, error, hasMore, loadMore, refetch };
}

/** Fetch a single project by ID */
export function useProject(projectId: string | null) {
  return useQuery<ProjectWithStats | null>(
    () => projectId ? fetchProject(projectId) : Promise.resolve(null),
    [projectId]
  );
}

/** Fetch visits for a project */
export function useProjectVisits(projectId: string | null) {
  return useQuery<VisitWithStats[]>(
    () => projectId ? fetchProjectVisits(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch a single visit by ID */
export function useVisit(visitId: string | null) {
  return useQuery<VisitWithStats | null>(
    () => visitId ? fetchVisit(visitId) : Promise.resolve(null),
    [visitId]
  );
}

/** Fetch photos for a visit */
export function useVisitPhotos(visitId: string | null) {
  return useQuery<PhotoRecord[]>(
    () => visitId ? fetchVisitPhotos(visitId) : Promise.resolve([]),
    [visitId]
  );
}

/** Fetch current user profile */
export function useCurrentProfile() {
  return useQuery<Profile | null>(() => fetchCurrentProfile(), []);
}

/** Fetch stages for a project */
export function useProjectStages(projectId: string | null) {
  return useQuery<Stage[]>(
    () => projectId ? fetchProjectStages(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch supply items for a project */
export function useProjectSupplyItems(projectId: string | null) {
  return useQuery<SupplyItem[]>(
    () => projectId ? fetchProjectSupplyItems(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch invoices for a project */
export function useProjectInvoices(projectId: string | null) {
  return useQuery<Invoice[]>(
    () => projectId ? fetchProjectInvoices(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch computed notifications */
export function useNotifications() {
  return useQuery<Notification[]>(() => fetchNotifications(), []);
}

/** Fetch activity feed for dashboard */
export function useActivityFeed() {
  return useQuery<ActivityItem[]>(() => fetchActivityFeed(), []);
}

/** Fetch documents for a project */
export function useProjectDocuments(projectId: string | null) {
  return useQuery<Document[]>(
    () => projectId ? fetchProjectDocuments(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch members for a project */
export function useProjectMembers(projectId: string | null) {
  return useQuery<ProjectMember[]>(
    () => projectId ? fetchProjectMembers(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch members with profile info */
export function useProjectMembersWithProfiles(projectId: string | null) {
  return useQuery<ProjectMemberWithProfile[]>(
    () => projectId ? fetchProjectMembersWithProfiles(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch documents by category */
export function useDocumentsByCategory(projectId: string | null, category: DocumentCategory) {
  return useQuery<Document[]>(
    () => projectId ? fetchDocumentsByCategory(projectId, category) : Promise.resolve([]),
    [projectId, category]
  );
}

/** Fetch all photos for a project (across visits) */
export function useProjectPhotos(projectId: string | null) {
  return useQuery<PhotoRecordWithVisit[]>(
    () => projectId ? fetchProjectPhotos(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch tasks for a project */
export function useProjectTasks(projectId: string | null) {
  return useQuery<Task[]>(
    () => projectId ? fetchProjectTasks(projectId) : Promise.resolve([]),
    [projectId]
  );
}
