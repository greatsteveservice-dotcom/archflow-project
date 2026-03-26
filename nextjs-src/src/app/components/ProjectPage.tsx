"use client";

import { useState, useRef, useEffect } from "react";
import { Icons } from "./Icons";
import Topbar from "./Topbar";
import { ErrorMessage } from "./Loading";
import { ProjectPageSkeleton } from "./Skeleton";
import { useProject, useProjectVisits, useProjectInvoices } from "../lib/hooks";
import { usePermissions } from "../lib/permissions";
import { updateProject } from "../lib/queries";
import type { ProjectPermissions } from "../lib/types";
import { exportVisitsCsv, exportInvoicesCsv } from "../lib/export";
import SupplyModule from "./supply/SupplyModule";
import DesignTab from "./project/DesignTab";
import SupervisionTab from "./project/SupervisionTab";
import SettingsTab from "./project/SettingsTab";
import OnboardingTip from "./OnboardingTip";

type ProjectTab = "design" | "supervision" | "supply" | "settings";

interface ProjectPageProps {
  projectId: string;
  onNavigate: (page: string, ctx?: any) => void;
  toast: (msg: string) => void;
  onMenuToggle?: () => void;
}

const ALL_TABS: { id: ProjectTab; label: string; icon: React.FC<{ className?: string }>; permKey: keyof ProjectPermissions }[] = [
  { id: "design", label: "Дизайн", icon: Icons.File, permKey: "canViewDesign" },
  { id: "supervision", label: "Авторский надзор", icon: Icons.Camera, permKey: "canViewSupervision" },
  { id: "supply", label: "Комплектация", icon: Icons.Box, permKey: "canViewSupply" },
  { id: "settings", label: "Настройки", icon: Icons.Settings, permKey: "canViewSettings" },
];

export default function ProjectPage({ projectId, onNavigate, toast, onMenuToggle }: ProjectPageProps) {
  const { data: project, loading: loadingProject, error: errorProject, refetch: refetchProject } = useProject(projectId);
  const { data: visits, loading: loadingVisits, refetch: refetchVisits } = useProjectVisits(projectId);
  const { data: invoices, refetch: refetchInvoices } = useProjectInvoices(projectId);
  const { permissions } = usePermissions(projectId);

  const visibleTabs = ALL_TABS.filter(t => permissions[t.permKey]);
  const [activeTab, setActiveTab] = useState<ProjectTab>("design");

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  if (loadingProject || loadingVisits) return <ProjectPageSkeleton />;
  if (errorProject) return <ErrorMessage message={errorProject} />;
  if (!project) return <ErrorMessage message="Проект не найден" />;

  const projectVisits = visits || [];
  const projectInvoices = invoices || [];

  const handleSelectVisit = (visitId: string) => {
    onNavigate("visit", { projectId: project.id, visitId });
  };

  const handleStartEditTitle = () => {
    setEditTitle(project.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === project.title) {
      setIsEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await updateProject(project.id, { title: trimmed });
      toast('Название обновлено');
      refetchProject();
      setIsEditingTitle(false);
    } catch (e: any) {
      toast(e.message || 'Ошибка обновления названия');
    }
    setSavingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveTitle();
    if (e.key === 'Escape') setIsEditingTitle(false);
  };

  return (
    <div className="animate-fade-in">
      <Topbar
        title={isEditingTitle ? editTitle : project.title}
        onMenuToggle={onMenuToggle}
        breadcrumbs={[
          { label: "Проекты", onClick: () => onNavigate("projects") },
          { label: project.title },
        ]}
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {permissions.canEditProjectSettings && !isEditingTitle && (
              <button
                className="btn btn-secondary p-2"
                onClick={handleStartEditTitle}
                title="Редактировать название"
              >
                <Icons.Edit className="w-4 h-4" />
              </button>
            )}
            <button
              className="btn btn-secondary p-2 sm:px-4 sm:py-2.5"
              onClick={() => {
                if (!project) return;
                if (activeTab === 'design') {
                  exportInvoicesCsv(projectInvoices, project.title);
                  toast('Счета экспортированы в CSV');
                } else {
                  exportVisitsCsv(projectVisits, project.title);
                  toast('Визиты экспортированы в CSV');
                }
              }}
              title="Экспорт в CSV"
            >
              <Icons.Download className="w-4 h-4" /> <span className="hidden sm:inline">Экспорт</span>
            </button>
          </div>
        }
      />

      {/* Inline title editing */}
      {isEditingTitle && (
        <div className="px-4 sm:px-8 py-3 bg-srf-raised border-b border-line flex items-center gap-3">
          <input
            ref={titleInputRef}
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 text-[15px] font-medium px-3 py-2 border border-ink-ghost rounded-lg focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent"
            placeholder="Название проекта"
            disabled={savingTitle}
          />
          <button
            className="btn btn-primary text-[12px] py-2 px-4"
            onClick={handleSaveTitle}
            disabled={savingTitle || !editTitle.trim()}
          >
            {savingTitle ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            className="btn btn-secondary text-[12px] py-2 px-4"
            onClick={() => setIsEditingTitle(false)}
            disabled={savingTitle}
          >
            Отмена
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tn px-4 sm:px-8 overflow-x-auto scrollbar-hide">
        {visibleTabs.map(t => (
          <div
            key={t.id}
            className={`ti ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 sm:p-8">
        <OnboardingTip
          id="project-tabs-v2"
          title="Управление проектом"
          text="Переключайтесь между вкладками: Дизайн (документы и счета), Авторский надзор (календарь, фото, задачи), Комплектация и Настройки."
          className="mb-5"
        />
        {activeTab === "design" && permissions.canViewDesign && (
          <DesignTab
            projectId={projectId}
            invoices={projectInvoices}
            toast={toast}
            refetchInvoices={refetchInvoices}
            canUploadDocument={permissions.canUploadDocument}
            canCreateInvoice={permissions.canCreateInvoice}
          />
        )}
        {activeTab === "supervision" && permissions.canViewSupervision && (
          <SupervisionTab
            project={project}
            projectId={projectId}
            visits={projectVisits}
            toast={toast}
            refetchVisits={() => { refetchVisits(); refetchProject(); }}
            refetchProject={refetchProject}
            onSelectVisit={handleSelectVisit}
            canCreateVisit={permissions.canCreateVisit}
            canUploadPhoto={permissions.canUploadPhoto}
            canChangePhotoStatus={permissions.canChangePhotoStatus}
            canManageTasks={permissions.canManageTasks}
            canEditProjectSettings={permissions.canEditProjectSettings}
          />
        )}
        {activeTab === "supply" && permissions.canViewSupply && (
          <SupplyModule projectId={projectId} toast={toast} />
        )}
        {activeTab === "settings" && permissions.canViewSettings && (
          <SettingsTab
            project={project}
            projectId={projectId}
            toast={toast}
            canDeleteProject={permissions.canDeleteProject}
            onDeleteProject={() => onNavigate('projects')}
          />
        )}
      </div>
    </div>
  );
}
