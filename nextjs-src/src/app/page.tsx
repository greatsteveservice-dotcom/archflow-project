"use client";

import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProjectsPage from "./components/ProjectsPage";
import ProjectPage from "./components/ProjectPage";
import VisitPage from "./components/VisitPage";
import { NotificationsPage, SettingsPage } from "./components/SettingsNotifications";
import LoginPage from "./components/LoginPage";
import { Icons } from "./components/Icons";
import { useProjects } from "./lib/hooks";
import { useAuth } from "./lib/auth";

export default function Home() {
  const { session, loading: authLoading } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [context, setContext] = useState<any>(null);
  const { data: projects } = useProjects();

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[28px] font-bold tracking-[4px] text-[#1A1F1A] mb-3">ЖАН</h1>
          <div className="inline-block w-6 h-6 border-2 border-[#E8E6E1] border-t-[#2C5F2D] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!session) {
    return <LoginPage />;
  }

  const navigate = (newPage: string, ctx: any = null) => {
    setPage(newPage);
    setContext(ctx);
  };

  const getPageTitle = () => {
    switch (page) {
      case "dashboard":
        return "Дашборд";
      case "projects":
        return "Проекты";
      case "project": {
        const p = projects?.find((pr) => pr.id === context);
        return p ? p.title : "Проект";
      }
      case "visit":
        return "Визит";
      case "notifications":
        return "Уведомления";
      case "settings":
        return "Настройки";
      default:
        return "";
    }
  };

  const getBreadcrumb = () => {
    if (page === "project") {
      return (
        <div className="flex items-center gap-1.5 text-[13px] text-[#6B6B6B]">
          <span
            className="text-[#9B9B9B] cursor-pointer hover:text-[#2C5F2D] transition-colors"
            onClick={() => navigate("projects")}
          >
            Проекты
          </span>
          <Icons.ChevronRight />
          <span>{getPageTitle()}</span>
        </div>
      );
    }
    if (page === "visit") {
      const project = projects?.find((p) => p.id === context?.projectId);
      return (
        <div className="flex items-center gap-1.5 text-[13px] text-[#6B6B6B]">
          <span
            className="text-[#9B9B9B] cursor-pointer hover:text-[#2C5F2D] transition-colors"
            onClick={() => navigate("projects")}
          >
            Проекты
          </span>
          <Icons.ChevronRight />
          <span
            className="text-[#9B9B9B] cursor-pointer hover:text-[#2C5F2D] transition-colors"
            onClick={() => navigate("project", context?.projectId)}
          >
            {project?.title}
          </span>
          <Icons.ChevronRight />
          <span>Визит</span>
        </div>
      );
    }
    return null;
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard onNavigate={navigate} />;
      case "projects":
        return <ProjectsPage onNavigate={navigate} />;
      case "project":
        return <ProjectPage projectId={context} onNavigate={navigate} />;
      case "visit":
        return (
          <VisitPage
            projectId={context?.projectId}
            visitId={context?.visitId}
            onNavigate={navigate}
          />
        );
      case "notifications":
        return <NotificationsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F6F3]">
      <Sidebar currentPage={page} onNavigate={navigate} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Top bar */}
        <div className="px-8 py-5 flex items-center justify-between border-b border-[#E8E6E1] bg-white sticky top-0 z-10">
          <div>
            {(page === "project" || page === "visit") && (
              <div
                className="inline-flex items-center gap-1 text-[13px] text-[#9B9B9B] cursor-pointer hover:text-[#1A1A1A] transition-colors mb-1"
                onClick={() =>
                  page === "visit"
                    ? navigate("project", context?.projectId)
                    : navigate("projects")
                }
              >
                <Icons.ChevronLeft /> Назад
              </div>
            )}
            {getBreadcrumb() || (
              <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {page === "dashboard" && (
              <button className="btn btn-primary" onClick={() => navigate("projects")}>
                <Icons.Plus /> Новый проект
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-7 max-sm:p-4">{renderPage()}</div>
      </div>
    </div>
  );
}
