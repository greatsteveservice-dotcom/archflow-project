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
import SupplyModule from "./supply/SupplyModule";
import OverviewTab from "./project/OverviewTab";
import JournalTab from "./project/JournalTab";
import VisitsTab from "./project/VisitsTab";
import DocsTab from "./project/DocsTab";
import SettingsTab from "./project/SettingsTab";

type ProjectTab = "overview" | "journal" | "visits" | "supply" | "docs" | "settings";

interface ProjectPageProps {
  projectId: string;
  onNavigate: (page: string, ctx?: any) => void;
  toast: (msg: string) => void;
  onMenuToggle?: () => void;
}

const ALL_TABS: { id: ProjectTab; label: string; icon: React.FC<{ className?: string }>; permKey: keyof ProjectPermissions }[] = [
  { id: "overview", label: "Обзор", icon: Icons.Grid, permKey: "canViewOverview" },
  { id: "journal", label: "Journal", icon: Icons.Camera, permKey: "canViewJournal" },
  { id: "visits", label: "Визиты", icon: Icons.Calendar, permKey: "canViewVisits" },
  { id: "supply", label: "Supply", icon: Icons.Box, permKey: "canViewSupply" },
  { id: "docs", label: "Документы", icon: Icons.File, permKey: "canViewDocs" },
  { id: "settings", label: "Настройки", icon: Icons.Settings, permKey: "canViewSettings" },
];

export default function ProjectPage({ projectId, onNavigate, toast, onMenuToggle }: ProjectPageProps) {
  const { data: project, loading: loadingProject, error: errorProject, refetch: refetchProject } = useProject(projectId);
  const { data: visits, loading: loadingVisits, refetch: refetchVisits } = useProjectVisits(projectId);
  const { data: invoices, refetch: refetchInvoices } = useProjectInvoices(projectId);
  const { permissions } = usePermissions(projectId);

  const visibleTabs = ALL_TABS.filter(t => permissions[t.permKey]);
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");

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
          <div className="flex items-center gap-2">
            {permissions.canEditProjectSettings && !isEditingTitle && (
              <button
                className="btn btn-secondary p-2"
                onClick={handleStartEditTitle}
                title="Редактировать название"
              >
                <Icons.Edit className="w-4 h-4" />
              </button>
            )}
            <button className="btn btn-secondary">
              <Icons.Download className="w-4 h-4" /> Экспорт
            </button>
          </div>
        }
      />

      {/* Inline title editing */}
      {isEditingTitle && (
        <div className="px-4 sm:px-7 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center gap-3">
          <input
            ref={titleInputRef}
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 text-[15px] font-medium px-3 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827] focus:border-transparent"
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
      <div className="tn px-4 sm:px-7 overflow-x-auto scrollbar-hide">
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
      <div className="p-4 sm:p-7">
        {activeTab === "overview" && permissions.canViewOverview && (
          <OverviewTab
            project={project}
            visits={projectVisits}
            invoices={projectInvoices}
            onTabChange={(tab) => setActiveTab(tab as ProjectTab)}
          />
        )}
        {activeTab === "journal" && permissions.canViewJournal && (
          <JournalTab
            project={project}
            projectId={projectId}
            visits={projectVisits}
            invoices={projectInvoices}
            onSelectVisit={handleSelectVisit}
            toast={toast}
            refetchInvoices={refetchInvoices}
            canCreateInvoice={permissions.canCreateInvoice}
          />
        )}
        {activeTab === "visits" && permissions.canViewVisits && (
          <VisitsTab
            project={project}
            projectId={projectId}
            visits={projectVisits}
            toast={toast}
            refetchVisits={() => { refetchVisits(); refetchProject(); }}
            canCreateVisit={permissions.canCreateVisit}
          />
        )}
        {activeTab === "supply" && permissions.canViewSupply && (
          <SupplyModule projectId={projectId} toast={toast} />
        )}
        {activeTab === "docs" && permissions.canViewDocs && (
          <DocsTab projectId={projectId} toast={toast} canUploadDocument={permissions.canUploadDocument} />
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
