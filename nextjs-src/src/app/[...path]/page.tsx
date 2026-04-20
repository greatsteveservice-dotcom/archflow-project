"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import ProjectsPage from "../components/ProjectsPage";
import ProjectPage from "../components/ProjectPage";
import VisitPage from "../components/VisitPage";
import LoginPage from "../components/LoginPage";
import WelcomeScreen from "../components/WelcomeScreen";
import ProfilePage from "../components/ProfilePage";
import CreateProjectModal from "../components/CreateProjectModal";
import Topbar from "../components/Topbar";
import Toast from "../components/Toast";
import FeedbackBar from "../components/FeedbackBar";
import OfflineBanner from "../components/OfflineBanner";
import DatabaseBanner from "../components/DatabaseBanner";
import SearchModal from "../components/SearchModal";
import OnboardingFlow from "../components/OnboardingFlow";
import ClientDashboard from "../components/ClientDashboard";
import ContractorDashboard from "../components/ContractorDashboard";
import { useProjects } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { acceptProjectInvitation, acceptRbacInvite } from "../lib/queries";
import { metrikaGoal } from "../lib/metrika";

// ======================== URL ROUTING ========================

/** Parse URL pathname into routing state */
function parsePath(pathname: string): { page: string; context: any; tab: string | null } {
  // /visit/:projectId/:visitId
  const visitMatch = pathname.match(/^\/visit\/([^/]+)\/([^/]+)/);
  if (visitMatch) {
    return { page: 'visit', context: { projectId: visitMatch[1], visitId: visitMatch[2] }, tab: null };
  }

  // /profile
  if (pathname === '/profile') {
    return { page: 'profile', context: null, tab: null };
  }

  // /projects/:id/:tab (chat|design|supervision|supply|settings|assistant|moodboard)
  const projectTabMatch = pathname.match(/^\/projects\/([^/]+)\/(chat|design|supervision|supply|settings|assistant|moodboard)$/);
  if (projectTabMatch) {
    return { page: 'project', context: projectTabMatch[1], tab: projectTabMatch[2] };
  }

  // /projects/:id
  const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) {
    return { page: 'project', context: projectMatch[1], tab: null };
  }

  // Default: /projects or anything else
  return { page: 'projects', context: null, tab: null };
}

/** Build URL from navigation target */
function buildUrl(target: string, ctx?: any): string {
  switch (target) {
    case 'projects':
    case 'dashboard':
      return '/projects';
    case 'project':
      if (typeof ctx === 'object' && ctx !== null && ctx.tab) {
        return `/projects/${ctx.id}/${ctx.tab}`;
      }
      return `/projects/${ctx}`;
    case 'visit':
      return `/visit/${ctx.projectId}/${ctx.visitId}`;
    case 'profile':
      return '/profile';
    default:
      return '/projects';
  }
}

// ======================== HELPERS ========================

// Valid values for profiles.role (user_role enum)
const VALID_USER_ROLES = new Set(['designer', 'client', 'contractor', 'supplier', 'assistant']);

/**
 * Sync the profile.role column from an invite acceptance result.
 *
 * Important: accept_member_invite RPC returns member_role
 * ('team' | 'client' | 'contractor'), which is a different enum from
 * profiles.role (user_role). Trying to set role='team' on profiles
 * results in a 400 error and used to silently break the invite flow.
 *
 * Strategy: only update profiles.role when the returned value is also
 * a valid user_role. For 'team' (RBAC-only role) we leave profiles.role
 * untouched.
 */
async function syncProfileRoleFromInvite(
  inviteRole: string | undefined,
  userId: string | undefined,
  refreshProfile: () => void,
): Promise<void> {
  if (!inviteRole || !userId) return;
  if (inviteRole === 'designer') return; // never demote designers
  if (!VALID_USER_ROLES.has(inviteRole)) {
    // RBAC-only role like 'team' — don't touch profile.role
    return;
  }
  try {
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase
      .from('profiles')
      .update({ role: inviteRole })
      .eq('id', userId);
    if (error) {
      console.error('[invite] profile role sync failed:', error);
      return;
    }
    refreshProfile();
  } catch (e) {
    console.error('[invite] profile role sync exception:', e);
  }
}

// ======================== APP SHELL ========================

export default function AppShell() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile, loading: authLoading, refreshProfile } = useAuth();
  const canCreateProject = profile?.role === 'designer' || profile?.role === 'assistant';

  // Derive routing state from URL pathname (source of truth)
  const { page, context, tab } = useMemo(() => parsePath(pathname), [pathname]);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('archflow-welcome-seen') === '1';
    }
    return false;
  });
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);

  // RBAC invite token from /invite/TOKEN path
  const [rbacInviteToken, setRbacInviteToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/invite\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : null;
    }
    return null;
  });
  const [inviteAccepting, setInviteAccepting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const toast = useCallback((msg: string) => setToastMsg(msg), []);

  // Navigation via Next.js router
  const navigate = useCallback((target: string, ctx: any = null) => {
    router.push(buildUrl(target, ctx));
  }, [router]);

  // Cmd+K / Ctrl+K to open search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Auto-dismiss welcome screen when user has projects (persist across reloads)
  useEffect(() => {
    if (projects && projects.length > 0 && !welcomeDismissed) {
      localStorage.setItem('archflow-welcome-seen', '1');
      setWelcomeDismissed(true);
    }
  }, [projects, welcomeDismissed]);

  // Handle invite token from URL query
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (!inviteToken) return;

    window.history.replaceState({}, '', window.location.pathname);

    acceptProjectInvitation(inviteToken)
      .then(async (result) => {
        // Update profile role to match the invite
        await syncProfileRoleFromInvite(result?.role, session?.user?.id, refreshProfile);
        if (result?.project_id) {
          refetchProjects();
          navigate('project', result.project_id);
          setToastMsg('Вы добавлены в проект');
          metrikaGoal('invite_accepted', { type: 'project' });
        }
      })
      .catch((err) => {
        console.error('[invite] project invitation failed:', err);
        setToastMsg(err.message || 'Ошибка принятия приглашения');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Handle RBAC invite token from /invite/TOKEN path
  useEffect(() => {
    if (!session || !rbacInviteToken || inviteAccepting) return;

    setInviteAccepting(true);
    setInviteError(null);

    acceptRbacInvite(rbacInviteToken)
      .then(async (result) => {
        // Clear URL
        router.replace('/projects');
        setRbacInviteToken(null);

        // Update profile role to match the invite so permissions and UI adapt.
        // Note: accept_member_invite returns member_role ('team'|'client'|'contractor'),
        // but profiles.role is user_role ('designer'|'client'|'contractor'|'supplier'|'assistant').
        // syncProfileRoleFromInvite handles the mapping/skipping safely.
        await syncProfileRoleFromInvite(result?.role, session?.user?.id, refreshProfile);

        if (result?.project_id) {
          refetchProjects();
          navigate('project', result.project_id);
          setToastMsg('Вы добавлены в проект');
          metrikaGoal('invite_accepted', { type: 'rbac' });
        } else {
          setToastMsg('Приглашение принято');
          metrikaGoal('invite_accepted', { type: 'rbac' });
        }
      })
      .catch((err) => {
        console.error('[invite] rbac invite failed:', err);
        router.replace('/projects');
        setRbacInviteToken(null);
        setInviteError(err?.message || 'Ссылка недействительна или уже использована');
      })
      .finally(() => {
        setInviteAccepting(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, rbacInviteToken, inviteAccepting]);

  // Auth loading state — editorial
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#AAA' }}>
          Загрузка...
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return <LoginPage inviteHint={!!rbacInviteToken} />;
  }

  // RBAC invite accepting screen
  if (inviteAccepting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 style={{ fontFamily: 'var(--af-font-display)', fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 12 }}>
            Принимаем приглашение
          </h1>
          <p style={{ fontFamily: 'var(--af-font-mono)', fontSize: 11, color: '#AAA' }}>
            Подождите...
          </p>
        </div>
      </div>
    );
  }

  // RBAC invite error screen
  if (inviteError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center" style={{ maxWidth: 400 }}>
          <h1 style={{ fontFamily: 'var(--af-font-display)', fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 12 }}>
            Ссылка недействительна
          </h1>
          <p style={{ fontFamily: 'var(--af-font-mono)', fontSize: 11, color: '#999', marginBottom: 24 }}>
            {inviteError}
          </p>
          <button
            onClick={() => { setInviteError(null); navigate('projects'); }}
            className="af-btn"
          >
            Перейти к проектам
          </button>
        </div>
      </div>
    );
  }

  // Demo users skip onboarding and welcome screens
  const isDemoUser = ['demo@archflow.ru', 'supply-demo@archflow.ru'].includes(profile?.email || '');

  // Onboarding flow for new users (demo users skip)
  const showOnboarding = !isDemoUser && profile && profile.onboarding_completed === false;

  if (showOnboarding && session?.user) {
    return (
      <OnboardingFlow
        userId={session.user.id}
        userRole={profile?.role}
        userEmail={profile?.email || undefined}
        onComplete={() => refreshProfile()}
      />
    );
  }

  // Welcome screen disabled — causes false positives due to RLS race condition
  const showWelcome = false;

  const openSearch = () => setSearchOpen(true);
  const goHome = () => navigate("projects");

  const renderPage = () => {
    switch (page) {
      case "projects":
        // Role-based dashboard routing
        if (profile?.role === 'client') {
          return (
            <>
              <Topbar title="Мои проекты" depth={1} onSearchOpen={openSearch} onLogoClick={goHome} />
              <div className="af-layout">
                <div className="af-content">
                  <ClientDashboard onNavigate={navigate} toast={toast} />
                </div>
              </div>
            </>
          );
        }
        if (profile?.role === 'contractor') {
          return (
            <>
              <Topbar title="Мои задачи" depth={1} onSearchOpen={openSearch} onLogoClick={goHome} />
              <div className="af-layout">
                <div className="af-content">
                  <ContractorDashboard onNavigate={navigate} toast={toast} />
                </div>
              </div>
            </>
          );
        }
        // Default: designer / assistant / supplier — standard interface
        return (
          <>
            <Topbar
              title="Проекты"
              depth={1}
              onSearchOpen={openSearch}
              onLogoClick={goHome}
              actions={
                canCreateProject ? (
                  <button className="btn btn-primary" onClick={() => setShowCreateProject(true)}>
                    + <span className="hidden sm:inline">Новый проект</span>
                  </button>
                ) : undefined
              }
            />
            <div className="af-layout">
              <div className="af-content">
                <ProjectsPage onNavigate={navigate} onCreateProject={canCreateProject ? () => setShowCreateProject(true) : undefined} refreshKey={projectsRefreshKey} />
              </div>
            </div>
          </>
        );
      case "project":
        return (
          <ProjectPage
            projectId={context}
            initialTab={tab}
            onNavigate={navigate}
            toast={toast}
            onMenuToggle={() => setSidebarOpen(true)}
            onSearchOpen={openSearch}
          />
        );
      case "visit":
        return (
          <VisitPage
            projectId={context?.projectId}
            visitId={context?.visitId}
            onNavigate={navigate}
            toast={toast}
            onMenuToggle={() => setSidebarOpen(true)}
            onSearchOpen={openSearch}
          />
        );
      case "profile":
        return (
          <ProfilePage
            onNavigate={navigate}
            onMenuToggle={() => setSidebarOpen(true)}
            toast={toast}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar kept as no-op for compat */}
      <Sidebar currentPage={page} onNavigate={navigate} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="overflow-x-hidden" style={{ paddingBottom: 56 }}>
        {showWelcome ? (
          <WelcomeScreen
            onCreateProject={() => { localStorage.setItem('archflow-welcome-seen', '1'); setWelcomeDismissed(true); setShowCreateProject(true); }}
            onNavigate={(p: string) => { localStorage.setItem('archflow-welcome-seen', '1'); setWelcomeDismissed(true); navigate(p); }}
          />
        ) : (
          renderPage()
        )}
      </div>

      <CreateProjectModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onSuccess={(projectId: string) => {
          refetchProjects();
          setProjectsRefreshKey(k => k + 1);
          navigate("project", projectId);
          toast("Проект создан");
        }}
      />

      <OfflineBanner />
      <DatabaseBanner />

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigate}
      />

      <FeedbackBar />

      {toastMsg && <Toast msg={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
