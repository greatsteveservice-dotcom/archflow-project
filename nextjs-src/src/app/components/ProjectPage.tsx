"use client";

import { useState, useRef, useEffect } from "react";
import Topbar from "./Topbar";
import { ErrorMessage } from "./Loading";
import { ProjectPageSkeleton } from "./Skeleton";
import { useProject, useProjectVisits, useProjectInvoices, useProjectMembersWithProfiles, useProjectRealtime, useDesignFileCounts } from "../lib/hooks";
import { usePermissions } from "../lib/permissions";
import { useAuth } from "../lib/auth";
import { updateProject } from "../lib/queries";
import type { ProjectPermissions } from "../lib/types";
import { exportVisitsCsv, exportInvoicesCsv } from "../lib/export";
import { metrikaGoal } from "../lib/metrika";
import dynamic from "next/dynamic";
import SupplyModule from "./supply/SupplyModule";
import DesignSection from "./project/DesignSection";
import SupervisionTab from "./project/SupervisionTab";
import SettingsTab from "./project/SettingsTab";
import ClientProjectHome from "./project/ClientProjectHome";

const ChatView = dynamic(() => import("./project/ChatView"), { loading: () => null, ssr: false });
const AssistantView = dynamic(() => import("./project/AssistantView"), { loading: () => null, ssr: false });

type ProjectTab = "design" | "supervision" | "supply" | "chat" | "settings" | "assistant";

interface ProjectPageProps {
  projectId: string;
  initialTab?: string | null;
  onNavigate: (page: string, ctx?: any) => void;
  toast: (msg: string) => void;
  onMenuToggle?: () => void;
  onSearchOpen?: () => void;
}

const SECTION_CONFIG: { id: ProjectTab; label: string; permKey: keyof ProjectPermissions; index: string }[] = [
  { id: "design", label: "Дизайн", permKey: "canViewDesign", index: "01" },
  { id: "supply", label: "Комплектация", permKey: "canViewSupply", index: "02" },
  { id: "supervision", label: "Авторский надзор", permKey: "canViewSupervision", index: "03" },
];

/** Client-friendly labels: renames professional jargon for client role */
const CLIENT_LABELS: Partial<Record<ProjectTab, string>> = {};

export default function ProjectPage({ projectId, initialTab, onNavigate, toast, onMenuToggle, onSearchOpen }: ProjectPageProps) {
  const { data: project, loading: loadingProject, error: errorProject, refetch: refetchProject } = useProject(projectId);
  const { data: visits, loading: loadingVisits, refetch: refetchVisits } = useProjectVisits(projectId);
  const { data: invoices, refetch: refetchInvoices } = useProjectInvoices(projectId);
  const { data: membersWithProfiles } = useProjectMembersWithProfiles(projectId);
  const { data: designCounts } = useDesignFileCounts(projectId);
  const { permissions } = usePermissions(projectId);
  const { profile } = useAuth();
  const isClient = profile?.role === 'client';
  const isContractor = profile?.role === 'contractor';

  useProjectRealtime(projectId, { refetchProject, refetchVisits, refetchInvoices });

  const visibleSections = SECTION_CONFIG.filter(t => permissions[t.permKey]);
  // activeTab derived from URL (initialTab prop) — null = Level 2 (section list), string = Level 3 (section content)
  const validTabs: string[] = ['design', 'supervision', 'supply', 'chat', 'settings', 'assistant'];
  const isDesigner = profile?.role === 'designer';
  const activeTab: ProjectTab | null = (initialTab && validTabs.includes(initialTab) ? initialTab : null) as ProjectTab | null;

  // Title editing
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

  // Metrika goals
  useEffect(() => {
    if (project) metrikaGoal('project_opened', { projectId });
  }, [projectId, project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'supply') metrikaGoal('supply_opened', { projectId });
  }, [activeTab, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show skeleton only on initial load (no data yet). During tab switches
  // within the same project, data persists so we skip the skeleton flash.
  if (!project && (loadingProject || loadingVisits)) return <ProjectPageSkeleton />;
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

  /** Resolve display label for a section, applying client-friendly renames */
  const getSectionLabel = (id: ProjectTab): string => {
    if (id === 'chat') return 'Чат';
    const base = SECTION_CONFIG.find(s => s.id === id)?.label || '';
    return isClient ? (CLIENT_LABELS[id] || base) : base;
  };

  const sectionLabel = activeTab ? getSectionLabel(activeTab) : '';

  const depth = activeTab ? 3 : 2;

  const breadcrumbs = activeTab
    ? [
        { label: 'Проекты', onClick: () => onNavigate("projects") },
        { label: project.title, onClick: () => onNavigate("project", projectId) },
        { label: sectionLabel },
      ]
    : [
        { label: 'Проекты', onClick: () => onNavigate("projects") },
        { label: project.title },
      ];


  return (
    <div className="animate-fade-in">
      <Topbar
        title={project.title}
        onSearchOpen={onSearchOpen}
        onLogoClick={() => onNavigate("projects")}
        depth={depth}
        breadcrumbs={breadcrumbs}
        contextLabel={undefined}
        actions={
          <div className="flex items-center gap-2">
            {permissions.canEditProjectSettings && !isEditingTitle && !activeTab && (
              <button
                className="btn btn-secondary"
                onClick={handleStartEditTitle}
                style={{ padding: '0 12px', minHeight: 36, fontSize: 9 }}
              >
                Ред.
              </button>
            )}
            {activeTab && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (activeTab === 'design') {
                    exportInvoicesCsv(projectInvoices, project.title);
                    toast('Счета экспортированы');
                  } else {
                    exportVisitsCsv(projectVisits, project.title);
                    toast('Визиты экспортированы');
                  }
                }}
                style={{ padding: '0 12px', minHeight: 36, fontSize: 9 }}
              >
                Экспорт →
              </button>
            )}
          </div>
        }
      />

      {/* Inline title editing */}
      {isEditingTitle && (
        <div className="af-content" style={{ background: '#F6F6F4', borderBottom: '0.5px solid #EBEBEB', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px' }}>
          <input
            ref={titleInputRef}
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            className="af-input"
            style={{ flex: 1, height: 40 }}
            placeholder="Название проекта"
            disabled={savingTitle}
          />
          <button className="af-btn" style={{ height: 40, padding: '0 16px', fontSize: 9 }} onClick={handleSaveTitle} disabled={savingTitle || !editTitle.trim()}>
            {savingTitle ? '...' : 'Сохранить'}
          </button>
          <button className="af-btn af-btn-outline" style={{ height: 40, padding: '0 16px', fontSize: 9 }} onClick={() => setIsEditingTitle(false)} disabled={savingTitle}>
            Отмена
          </button>
        </div>
      )}

      <div className="af-layout">
        {/* ═══ LEVEL 2: CLIENT — rich project home ═══ */}
        {activeTab === null && isClient && (
          <ClientProjectHome
            project={project}
            projectId={projectId}
            members={membersWithProfiles || []}
            toast={toast}
          />
        )}

        {/* ═══ LEVEL 2: NON-CLIENT — Section grid ═══ */}
        {activeTab === null && !isClient && (
          <div className="af-tab-list">
            {visibleSections.map((section) => {
              const displayLabel = getSectionLabel(section.id);
              let metricValue: string | number | null = null;
              let metricLabel = '';
              if (section.id === 'design') {
                metricValue = designCounts ? Object.values(designCounts).reduce((a, b) => a + b, 0) : '—';
                metricLabel = 'файлов';
              } else if (section.id === 'supervision') {
                metricValue = projectVisits.length;
                metricLabel = isClient ? 'отчётов' : 'визитов';
              } else if (section.id === 'supply') {
                metricValue = '—';
                metricLabel = 'позиции';
              }
              return (
                <div
                  key={section.id}
                  className="af-tab-row"
                  onClick={() => onNavigate("project", { id: projectId, tab: section.id })}
                >
                  <span className="af-tab-index">{section.index}</span>
                  <span className="af-tab-name">{displayLabel}</span>
                  {metricValue !== null && (
                    <div className="af-tab-metric">
                      <span className="af-tab-metric-value">{metricValue}</span>
                      <span className="af-tab-metric-label">{metricLabel}</span>
                    </div>
                  )}
                  <span className="af-tab-arrow">→</span>
                </div>
              );
            })}

            {/* Chat — hidden for contractors */}
            {!isContractor && (
              <div
                className="af-tab-row"
                onClick={() => onNavigate("project", { id: projectId, tab: "chat" })}
              >
                <span className="af-tab-index">04</span>
                <span className="af-tab-name">Чат</span>
                <span className="af-tab-arrow">→</span>
              </div>
            )}

            {/* Settings — dark block */}
            {permissions.canViewSettings && (
              <div
                className="af-tab-row af-tab-row-dark"
                onClick={() => onNavigate("project", { id: projectId, tab: "settings" })}
              >
                <span className="af-tab-name">Настройки</span>
                <span className="af-tab-arrow">→</span>
              </div>
            )}
          </div>
        )}

        {/* ═══ LEVEL 3: Section content ═══ */}
        {activeTab !== null && (
          <div>
            {/* Chat renders edge-to-edge (no af-content padding) for proper viewport fill */}
            {activeTab === "chat" && (
              <ChatView projectId={projectId} toast={toast} />
            )}

            {/* All other tabs render inside af-content with standard padding */}
            {activeTab !== "chat" && (
              <div className="af-content">
                {activeTab === "design" && permissions.canViewDesign && (
                  <DesignSection
                    projectId={projectId}
                    toast={toast}
                    canUpload={permissions.canUploadDocument}
                    canDelete={permissions.canUploadDocument}
                    canComment={true}
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
                    canSendReport={permissions.canSendReport}
                    canAcknowledgeReport={permissions.canAcknowledgeReport}
                    members={membersWithProfiles || []}
                  />
                )}
                {activeTab === "supply" && permissions.canViewSupply && (
                  <SupplyModule projectId={projectId} toast={toast} />
                )}
                {activeTab === "assistant" && isDesigner && (
                  <AssistantView
                    projectId={projectId}
                    toast={toast}
                    onNavigate={onNavigate}
                  />
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
