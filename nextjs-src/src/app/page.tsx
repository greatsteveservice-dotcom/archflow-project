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
import { Icons } from "./components/Icons";
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
  const { data: projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const toast = useCallback((msg: string) => setToastMsg(msg), []);

  // Handle invite token from URL
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (!inviteToken) return;

    // Clear the URL parameter
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

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
          <span className="text-white text-sm">Загрузка Archflow...</span>
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!session) {
    return <LoginPage />;
  }

  // New user — show welcome screen (0 projects, first visit)
  const showWelcome = !welcomeDismissed && !projectsLoading && projects !== null && projects.length === 0 && page === "dashboard";

  const navigate = (newPage: string, ctx: any = null) => {
    setPage(newPage);
    setContext(ctx);
  };

  const openSidebar = () => setSidebarOpen(true);

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return (
          <>
            <Topbar
              title="Дашборд"
              onMenuToggle={openSidebar}
              actions={
                canCreateProject ? (
                  <button className="btn btn-primary" onClick={() => setShowCreateProject(true)}>
                    <Icons.Plus className="w-4 h-4" /> <span className="hidden sm:inline">Новый проект</span>
                  </button>
                ) : undefined
              }
            />
            <div className="p-4 sm:p-7">
              <Dashboard onNavigate={navigate} />
            </div>
          </>
        );
      case "projects":
        return (
          <>
            <Topbar
              title="Проекты"
              onMenuToggle={openSidebar}
              actions={
                canCreateProject ? (
                  <button className="btn btn-primary" onClick={() => setShowCreateProject(true)}>
                    <Icons.Plus className="w-4 h-4" /> <span className="hidden sm:inline">Новый проект</span>
                  </button>
                ) : undefined
              }
            />
            <div className="p-4 sm:p-7">
              <ProjectsPage onNavigate={navigate} />
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
          />
        );
      case "visit":
        return (
          <VisitPage
            projectId={context?.projectId}
            visitId={context?.visitId}
            onNavigate={navigate}
            toast={toast}
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
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar currentPage={page} onNavigate={navigate} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 overflow-x-hidden">
        {showWelcome ? (
          <WelcomeScreen
            onCreateProject={() => { setWelcomeDismissed(true); setShowCreateProject(true); }}
            onNavigate={(p) => { setWelcomeDismissed(true); navigate(p); }}
          />
        ) : (
          renderPage()
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onSuccess={() => {
          refetchProjects();
          navigate("projects");
          toast("Проект создан");
        }}
      />

      {/* Toast */}
      {toastMsg && <Toast msg={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
