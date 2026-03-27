"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProjectsPage from "./components/ProjectsPage";
import ProjectPage from "./components/ProjectPage";
import VisitPage from "./components/VisitPage";
import LoginPage from "./components/LoginPage";
import WelcomeScreen from "./components/WelcomeScreen";
import ProfilePage from "./components/ProfilePage";
import CreateProjectModal from "./components/CreateProjectModal";
import Topbar from "./components/Topbar";
import Toast from "./components/Toast";
import FeedbackBar from "./components/FeedbackBar";
import OfflineBanner from "./components/OfflineBanner";
import SearchModal from "./components/SearchModal";
import { useProjects } from "./lib/hooks";
import { useAuth } from "./lib/auth";
import { acceptProjectInvitation } from "./lib/queries";

export default function Home() {
  const { session, profile, loading: authLoading } = useAuth();
  const canCreateProject = profile?.role === 'designer' || profile?.role === 'assistant';
  const [page, setPage] = useState("dashboard");
  const [context, setContext] = useState<any>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const toast = useCallback((msg: string) => setToastMsg(msg), []);

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

  // Handle invite token from URL
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (!inviteToken) return;

    window.history.replaceState({}, '', window.location.pathname);

    acceptProjectInvitation(inviteToken)
      .then((result) => {
        if (result?.project_id) {
          refetchProjects();
          setPage('project');
          setContext(result.project_id);
          setToastMsg('Вы добавлены в проект');
        }
      })
      .catch((err) => {
        setToastMsg(err.message || 'Ошибка принятия приглашения');
      });
  }, [session, refetchProjects]);

  // Auth loading state — editorial
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#AAA' }}>
          Загрузка...
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return <LoginPage />;
  }

  // New user welcome
  const showWelcome = !welcomeDismissed && !projectsLoading && projects !== null && projects.length === 0 && page === "dashboard";

  const navigate = (newPage: string, ctx: any = null) => {
    setPage(newPage);
    setContext(ctx);
  };

  const openSidebar = () => setSidebarOpen(true);
  const openSearch = () => setSearchOpen(true);
  const goHome = () => navigate("projects");

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return (
          <>
            <Topbar
              title="Дашборд"
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
                <Dashboard onNavigate={navigate} />
              </div>
            </div>
          </>
        );
      case "projects":
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
                <ProjectsPage onNavigate={navigate} onCreateProject={canCreateProject ? () => setShowCreateProject(true) : undefined} />
              </div>
            </div>
          </>
        );
      case "project":
        return (
          <ProjectPage
            projectId={context}
            onNavigate={navigate}
            toast={toast}
            onMenuToggle={openSidebar}
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
            onMenuToggle={openSidebar}
            onSearchOpen={openSearch}
          />
        );
      case "profile":
        return (
          <ProfilePage
            onNavigate={navigate}
            onMenuToggle={openSidebar}
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
            onCreateProject={() => { setWelcomeDismissed(true); setShowCreateProject(true); }}
            onNavigate={(p) => { setWelcomeDismissed(true); navigate(p); }}
          />
        ) : (
          renderPage()
        )}
      </div>

      <CreateProjectModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onSuccess={() => {
          refetchProjects();
          navigate("projects");
          toast("Проект создан");
        }}
      />

      <OfflineBanner />

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
