// ============================================================
// Archflow: React hooks for Supabase data fetching
// ============================================================

'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { supabase } from './supabase';
import { isBackendError, getHealth } from './health';
import { runWithRetry, friendlyError } from './retry';
import type { ProjectWithStats, VisitWithStats, PhotoRecord, Profile, Stage, SupplyItem, Invoice, Notification, ActivityItem, Document, ProjectMember, ProjectMemberWithProfile, DocumentCategory, Task, PhotoRecordWithVisit, RbacMemberWithProfile, ProjectAccessSettings, VisitReportWithStats, VisitRemarkWithDetails, ContractorTaskWithDetails, ChatMessageWithAuthor, ChatType, ChatChannel, DesignFileWithProfile, DesignFileCommentWithProfile, DesignFolder, DesignSubfolder, ProjectRoom, KindStageMapping } from './types';
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
  fetchRbacMembersWithProfiles,
  fetchAccessSettings,
  fetchVisitReports,
  fetchVisitRemarks,
  fetchContractorTasks,
  fetchMyContractorTasks,
  checkProjectAlerts,
  fetchChatMessages,
  fetchUnreadCounts,
  fetchUnreadCountByType,
  markChatRead,
  fetchDesignFiles,
  fetchDesignFileCounts,
  fetchDesignFile,
  fetchDesignFileComments,
  fetchDesignSubfolders,
  fetchChatChannels,
  fetchProjectRooms,
  fetchKindStageMappings,
} from './queries';

// ======================== GENERIC HOOK ========================

interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Simple module-level cache to prevent skeleton flash on re-mounts (e.g. tab switches) */
const _queryCache = new Map<string, unknown>();

function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseQueryResult<T> {
  // Include fetcher source to distinguish hooks with same deps (e.g. useProject vs useProjectVisits)
  const cacheKey = fetcher.toString().slice(0, 80) + '::' + JSON.stringify(deps);
  const cached = _queryCache.get(cacheKey) as T | undefined;
  const [data, setData] = useState<T | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Don't show loading if we have cached data — show stale data while refreshing
    if (!_queryCache.has(cacheKey)) {
      setLoading(true);
    }
    setError(null);

    runWithRetry(fetcher, () => cancelled)
      .then(result => {
        if (!cancelled) {
          _queryCache.set(cacheKey, result);
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          // If the backend is degraded and we still have cached data,
          // keep showing the cache and don't surface an error state.
          if (isBackendError(err) && _queryCache.has(cacheKey)) {
            setLoading(false);
            return;
          }
          setError(friendlyError(err));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  // Auto-refetch when backend comes back online after a failure
  useEffect(() => {
    const onOnline = () => {
      const h = getHealth();
      if (h.status === 'online' && error) {
        setRefreshKey(k => k + 1);
      }
    };
    window.addEventListener('archflow:health-recovered', onOnline);
    return () => window.removeEventListener('archflow:health-recovered', onOnline);
  }, [error]);

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
          setError(friendlyError(err));
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
        setError(friendlyError(err));
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

/** Fetch rooms for a project */
export function useProjectRooms(projectId: string | null) {
  return useQuery<ProjectRoom[]>(
    () => projectId ? fetchProjectRooms(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch kind→stage mappings for current user */
export function useKindStageMappings() {
  return useQuery<KindStageMapping[]>(
    () => fetchKindStageMappings(),
    []
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

/** Fetch RBAC members with profiles for a project */
export function useRbacMembers(projectId: string | null) {
  return useQuery<RbacMemberWithProfile[]>(
    () => projectId ? fetchRbacMembersWithProfiles(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch project access settings */
export function useAccessSettings(projectId: string | null) {
  return useQuery<ProjectAccessSettings | null>(
    () => projectId ? fetchAccessSettings(projectId) : Promise.resolve(null),
    [projectId]
  );
}

/** Fetch visit reports for a project */
export function useVisitReports(projectId: string | null) {
  return useQuery<VisitReportWithStats[]>(
    () => projectId ? fetchVisitReports(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch remarks for a report */
export function useVisitRemarks(reportId: string | null) {
  return useQuery<VisitRemarkWithDetails[]>(
    () => reportId ? fetchVisitRemarks(reportId) : Promise.resolve([]),
    [reportId]
  );
}

/** Fetch contractor tasks for a project */
export function useContractorTasks(projectId: string | null) {
  return useQuery<ContractorTaskWithDetails[]>(
    () => projectId ? fetchContractorTasks(projectId) : Promise.resolve([]),
    [projectId]
  );
}

/** Fetch all contractor tasks assigned to current user (cross-project) */
export function useMyContractorTasks() {
  return useQuery<ContractorTaskWithDetails[]>(
    () => fetchMyContractorTasks(),
    []
  );
}

/** Check if project has pending alerts (badge dot) */
export function usePendingAlerts(projectIds: string[]): Map<string, boolean> {
  const [alerts, setAlerts] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (projectIds.length === 0) return;
    let cancelled = false;

    Promise.all(
      projectIds.map(async id => {
        try {
          const has = await checkProjectAlerts(id);
          return [id, has] as [string, boolean];
        } catch {
          return [id, false] as [string, boolean];
        }
      })
    ).then(results => {
      if (!cancelled) {
        setAlerts(new Map(results));
      }
    });

    return () => { cancelled = true; };
  }, [projectIds.join(',')]);

  return alerts;
}

// ======================== REALTIME SUBSCRIPTIONS ========================

type RealtimeTable = 'projects' | 'visits' | 'photo_records' | 'invoices' | 'supply_items' | 'tasks' | 'documents' | 'project_members';

interface UseRealtimeOptions {
  /** Tables to subscribe to */
  tables: RealtimeTable[];
  /** Filter events by project_id (optional) */
  projectId?: string;
  /** Callback on any change */
  onUpdate: () => void;
  /** Enable/disable (default: true) */
  enabled?: boolean;
}

/**
 * Subscribe to Supabase Realtime changes on specified tables.
 * Calls onUpdate callback when INSERT/UPDATE/DELETE happens.
 */
export function useRealtimeSubscription({ tables, projectId, onUpdate, enabled = true }: UseRealtimeOptions) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const channelName = `realtime-${tables.join('-')}-${projectId || 'all'}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    tables.forEach(table => {
      const filter = projectId ? `project_id=eq.${projectId}` : undefined;
      channel.on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          // Debounce slightly to batch rapid changes
          setTimeout(() => onUpdateRef.current(), 100);
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables.join(','), projectId, enabled]);
}

/**
 * Subscribe to realtime changes for a project — auto-refetches project data.
 * Usage: pass refetch callbacks from your hooks, and they will be called on changes.
 */
export function useProjectRealtime(
  projectId: string | null,
  callbacks: { refetchProject?: () => void; refetchVisits?: () => void; refetchInvoices?: () => void; refetchTasks?: () => void }
) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useRealtimeSubscription({
    tables: ['visits', 'photo_records', 'invoices', 'supply_items', 'tasks', 'documents'],
    projectId: projectId || undefined,
    enabled: !!projectId,
    onUpdate: () => {
      callbacksRef.current.refetchProject?.();
      callbacksRef.current.refetchVisits?.();
      callbacksRef.current.refetchInvoices?.();
      callbacksRef.current.refetchTasks?.();
    },
  });
}

/**
 * Subscribe to realtime changes for the dashboard — auto-refetches projects list.
 */
export function useDashboardRealtime(refetch: () => void) {
  useRealtimeSubscription({
    tables: ['projects', 'visits', 'photo_records', 'invoices'],
    onUpdate: refetch,
  });
}

// ======================== CHAT ========================

/** Fetch chat messages with auto-scroll-to-load-more */
export function useChatMessages(projectId: string | null, chatType: ChatType = 'team') {
  const [messages, setMessages] = useState<ChatMessageWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const fetchInitial = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await fetchChatMessages(projectId, 50, undefined, chatType);
      setMessages(data);
      setHasMore(data.length >= 50);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId, chatType]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const loadMore = useCallback(async () => {
    if (!projectId || !hasMore || messages.length === 0) return;
    const oldest = messages[messages.length - 1].created_at;
    try {
      const older = await fetchChatMessages(projectId, 50, oldest, chatType);
      setMessages(prev => [...prev, ...older]);
      setHasMore(older.length >= 50);
    } catch {
      // silent
    }
  }, [projectId, chatType, hasMore, messages]);

  // Append a new message locally (optimistic, with deduplication)
  const appendMessage = useCallback((msg: ChatMessageWithAuthor) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [msg, ...prev];
    });
  }, []);

  // Remove a message locally
  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  return { messages, loading, hasMore, loadMore, refetch: fetchInitial, appendMessage, removeMessage };
}

/** Realtime subscription for chat_messages — calls onNewMessage on INSERT/DELETE.
 *
 * IMPORTANT: supabase.channel(name) in v2.x returns the SAME object when
 * called with the same name.  Because ChatView mounts two ChatTabPanel
 * instances (team + client) that both call this hook with the same projectId,
 * we MUST include a per-instance unique suffix (useId) so each panel gets
 * its own independent RealtimeChannel.  Without this the second panel's
 * .subscribe() is a no-op and cleanup in either panel kills both subscriptions.
 */
export function useChatRealtime(
  projectId: string | null,
  onNewMessage: (payload: any) => void,
) {
  const instanceId = useId();
  const callbackRef = useRef(onNewMessage);
  callbackRef.current = onNewMessage;

  useEffect(() => {
    if (!projectId) return;

    const channelName = `chat:${projectId}:${instanceId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          callbackRef.current(payload);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          callbackRef.current(payload);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          callbackRef.current(payload);
        },
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(`[Realtime] channel ${channelName} error:`, err?.message);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, instanceId]);
}

/** Unread message counts for project list */
export function useUnreadCounts(projectIds: string[], userId: string | null) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  const refetch = useCallback(async () => {
    if (!userId || projectIds.length === 0) return;
    try {
      const data = await fetchUnreadCounts(projectIds, userId);
      setCounts(data);
    } catch {
      // silent
    }
  }, [projectIds.join(','), userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { counts, refetch };
}

/** Auto-mark chat as read when component is mounted */
export function useChatMarkRead(projectId: string | null, userId: string | null, chatType: ChatType = 'team') {
  useEffect(() => {
    if (!projectId || !userId) return;
    markChatRead(projectId, userId, chatType).catch(() => {});
  }, [projectId, userId, chatType]);
}

/** Unread count for a specific chat type in a project */
export function useChatUnreadByType(projectId: string | null, userId: string | null, chatType: ChatType) {
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!projectId || !userId) return;
    try {
      const c = await fetchUnreadCountByType(projectId, userId, chatType);
      setCount(c);
    } catch {
      // silent
    }
  }, [projectId, userId, chatType]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { count, refetch };
}

// ======================== DESIGN FILES ========================

/** Fetch design files for a project folder */
export function useDesignFiles(projectId: string | null, folder?: DesignFolder) {
  return useQuery<DesignFileWithProfile[]>(
    () => projectId ? fetchDesignFiles(projectId, folder) : Promise.resolve([]),
    [projectId, folder]
  );
}

/** Fetch file counts per folder */
export function useDesignFileCounts(projectId: string | null) {
  return useQuery<Record<DesignFolder, number>>(
    () => projectId ? fetchDesignFileCounts(projectId) : Promise.resolve({ design_project: 0, visuals: 0, drawings: 0, furniture: 0, engineering: 0, documents: 0 }),
    [projectId]
  );
}

/** Fetch a single design file */
export function useDesignFile(fileId: string | null) {
  return useQuery<DesignFileWithProfile | null>(
    () => fileId ? fetchDesignFile(fileId) : Promise.resolve(null),
    [fileId]
  );
}

/** Fetch comments for a design file */
export function useDesignFileComments(fileId: string | null) {
  return useQuery<DesignFileCommentWithProfile[]>(
    () => fileId ? fetchDesignFileComments(fileId) : Promise.resolve([]),
    [fileId]
  );
}

/** Fetch subfolders for a project+folder */
export function useDesignSubfolders(projectId: string | null, folder?: DesignFolder) {
  return useQuery<DesignSubfolder[]>(
    () => (projectId && folder) ? fetchDesignSubfolders(projectId, folder) : Promise.resolve([]),
    [projectId, folder]
  );
}

/** Fetch chat channels for a project */
export function useChatChannels(projectId: string | null) {
  return useQuery<ChatChannel[]>(
    () => projectId ? fetchChatChannels(projectId) : Promise.resolve([]),
    [projectId]
  );
}

// ======================== PUSH NOTIFICATIONS ========================

const VAPID_PUBLIC_KEY = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
  : '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Check if push is available and already subscribed */
export function usePushStatus() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
    setIsSupported(supported);
    if (!supported) return;

    setPermission(Notification.permission);

    // Check existing subscription
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub);
      });
    }).catch(() => {});
  }, []);

  return { isSupported, isSubscribed, permission };
}

/** Subscribe to push notifications */
export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });

    const json = subscription.toJSON();
    const { savePushSubscription } = await import('./queries');
    await savePushSubscription(userId, {
      endpoint: json.endpoint!,
      keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
    });

    return true;
  } catch (err) {
    console.error('Push subscribe error:', err);
    return false;
  }
}

// ======================== NOTIFICATION PREFERENCES ========================

import { fetchNotificationPreferences, fetchAssistantEvents, fetchReminders, fetchUpcomingTimeline } from './queries';
import type { NotificationPreferences, AssistantEvent, Reminder } from './types';

export function useNotificationPreferences(userId: string | null, projectId: string | null): UseQueryResult<NotificationPreferences | null> {
  return useQuery<NotificationPreferences | null>(
    () => (userId && projectId) ? fetchNotificationPreferences(userId, projectId) : Promise.resolve(null),
    [userId, projectId],
  );
}

// ======================== ASSISTANT ========================

export function useAssistantEvents(projectId: string | null): UseQueryResult<AssistantEvent[]> {
  return useQuery<AssistantEvent[]>(
    () => projectId ? fetchAssistantEvents(projectId) : Promise.resolve([]),
    [projectId],
  );
}

export function useReminders(projectId: string | null): UseQueryResult<Reminder[]> {
  return useQuery<Reminder[]>(
    () => projectId ? fetchReminders(projectId) : Promise.resolve([]),
    [projectId],
  );
}

export function useUpcomingTimeline(projectId: string | null): UseQueryResult<any[]> {
  return useQuery<any[]>(
    () => projectId ? fetchUpcomingTimeline(projectId) : Promise.resolve([]),
    [projectId],
  );
}

// ======================== EMAIL EVIDENCE ========================

import { fetchReportEmailSends, fetchEmailEvents } from './queries';
import type { EmailSend, EmailEvent } from './types';

/** Fetch email sends for a specific report */
export function useReportEmailSends(reportId: string | null) {
  return useQuery<EmailSend[]>(
    () => reportId ? fetchReportEmailSends(reportId) : Promise.resolve([]),
    [reportId],
  );
}

/** Fetch email events for a specific send */
export function useEmailEvents(emailSendId: string | null) {
  return useQuery<EmailEvent[]>(
    () => emailSendId ? fetchEmailEvents(emailSendId) : Promise.resolve([]),
    [emailSendId],
  );
}

/** Fire-and-forget: notify other project members about a new message */
export function sendPushNotification(
  projectId: string,
  senderUserId: string,
  senderName: string,
  text: string,
) {
  // Get current session token for authenticated API call
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.access_token) return;
    fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ projectId, senderUserId, senderName, text }),
    }).catch(() => {
      // Fire and forget — don't block the UI
    });
  });
}

// ======================== CLIENT HOME ========================

import type { DocumentSignature, ContractPayment } from './types';
import {
  fetchPendingSignatures,
  fetchDuePayments,
  fetchProjectActivity,
} from './queries';

export function usePendingSignatures(projectId: string | null, userId: string | null) {
  return useQuery<DocumentSignature[]>(
    () => (projectId && userId) ? fetchPendingSignatures(projectId, userId) : Promise.resolve([]),
    [projectId, userId]
  );
}

export function useDuePayments(projectId: string | null, days: number = 30) {
  return useQuery<ContractPayment[]>(
    () => projectId ? fetchDuePayments(projectId, days) : Promise.resolve([]),
    [projectId, days]
  );
}

export function useProjectActivity(projectId: string | null, limit: number = 8) {
  return useQuery<Awaited<ReturnType<typeof fetchProjectActivity>>>(
    () => projectId ? fetchProjectActivity(projectId, limit) : Promise.resolve([]),
    [projectId, limit]
  );
}

// useUpcomingTimeline already defined earlier at line 843

// ======================== MOODBOARDS ========================

import type { MoodboardWithStats, MoodboardItem, MoodboardComment, MoodboardSection } from './types';
import { fetchMoodboards, fetchMoodboardItems, fetchMoodboardComments, fetchMoodboardSections } from './queries';

export function useMoodboards(projectId: string | null) {
  return useQuery<MoodboardWithStats[]>(
    () => projectId ? fetchMoodboards(projectId) : Promise.resolve([]),
    [projectId]
  );
}

export function useMoodboardItems(moodboardId: string | null) {
  return useQuery<MoodboardItem[]>(
    () => moodboardId ? fetchMoodboardItems(moodboardId) : Promise.resolve([]),
    [moodboardId]
  );
}

export function useMoodboardComments(moodboardId: string | null) {
  return useQuery<MoodboardComment[]>(
    () => moodboardId ? fetchMoodboardComments(moodboardId) : Promise.resolve([]),
    [moodboardId]
  );
}

export function useMoodboardSections(moodboardId: string | null) {
  return useQuery<MoodboardSection[]>(
    () => moodboardId ? fetchMoodboardSections(moodboardId) : Promise.resolve([]),
    [moodboardId]
  );
}

