"use client";

import { useState, useRef, useEffect } from "react";
import Topbar from "./Topbar";
import { ErrorMessage } from "./Loading";
import { ProjectPageSkeleton } from "./Skeleton";
import { useProject, useProjectVisits, useProjectInvoices, useProjectMembersWithProfiles, useProjectRealtime } from "../lib/hooks";
import { usePermissions } from "../lib/permissions";
import { updateProject } from "../lib/queries";
import type { ProjectPermissions } from "../lib/types";
import { exportVisitsCsv, exportInvoicesCsv } from "../lib/export";
import dynamic from "next/dynamic";
import SupplyModule from "./supply/SupplyModule";
import DesignTab from "./project/DesignTab";
import SupervisionTab from "./project/SupervisionTab";
import SettingsTab from "./project/SettingsTab";

const ChatView = dynamic(() => import("./project/ChatView"), { loading: () => null, ssr: false });

type ProjectTab = "design" | "supervision" | "supply" | "chat" | "settings";

interface ProjectPageProps {
  projectId: string;
  onNavigate: (page: string, ctx?: any) => void;
  toast: (msg: string) => void;
  onMenuToggle?: () => void;
  onSearchOpen?: () => void;
}

const SECTION_CONFIG: { id: ProjectTab; label: string; permKey: keyof ProjectPermissions; index: string; disabled?: boolean }[] = [
  { id: "design", label: "Дизайн", permKey: "canViewDesign", index: "01" },
  { id: "supervision", label: "Авторский надзор", permKey: "canViewSupervision", index: "02" },
  { id: "supply", label: "Комплектация", permKey: "canViewSupply", index: "03", disabled: true },
];

export default function ProjectPage({ projectId, onNavigate, toast, onMenuToggle, onSearchOpen }: ProjectPageProps) {
  const { data: project, loading: loadingProject, error: errorProject, refetch: refetchProject } = useProject(projectId);
  const { data: visits, loading: loadingVisits, refetch: refetchVisits } = useProjectVisits(projectId);
  const { data: invoices, refetch: refetchInvoices } = useProjectInvoices(projectId);
  const { data: membersWithProfiles } = useProjectMembersWithProfiles(projectId);
  const { permissions } = usePermissions(projectId);

  useProjectRealtime(projectId, { refetchProject, refetchVisits, refetchInvoices });

  const visibleSections = SECTION_CONFIG.filter(t => permissions[t.permKey]);
  // null = Level 2 (section list), string = Level 3 (section content)
  const [activeTab, setActiveTab] = useState<ProjectTab | null>(null);

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

  const sectionLabel = activeTab
    ? (activeTab === 'chat' ? 'Чат' : SECTION_CONFIG.find(s => s.id === activeTab)?.label || '')
    : '';

  const depth = activeTab ? 3 : 2;

  const breadcrumbs = activeTab
    ? [
        { label: 'Проекты', onClick: () => onNavigate("projects") },
        { label: project.title, onClick: () => setActiveTab(null) },
        { label: sectionLabel },
      ]
    : [
        { label: 'Проекты', onClick: () => onNavigate("projects") },
        { label: project.title },
      ];

  const isShortName = (name: string) => name.length <= 8;

  return (
    <div className="animate-fade-in">
      <Topbar
        title={project.title}
        onSearchOpen={onSearchOpen}
        onLogoClick={() => onNavigate("projects")}
        depth={depth}
        breadcrumbs={breadcrumbs}
        contextLabel={activeTab ? sectionLabel : undefined}
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
        {/* ═══ LEVEL 2: Section blocks ═══ */}
        {activeTab === null && (
          <div style={{ padding: 0 }}>
            {visibleSections.map((section) =>
              section.disabled ? (
                <div
                  key={section.id}
                  className="af-block af-block-disabled"
                  style={{ cursor: 'default', background: '#F6F6F4' }}
                >
                  <div className="af-block-inner">
                    <span className="af-block-index" style={{ color: '#DDDDDD' }}>{section.index} — Раздел</span>
                    <span
                      className={`af-block-name ${isShortName(section.label) ? 'af-block-name-short' : 'af-block-name-long'}`}
                      style={{ color: '#CCCCCC' }}
                    >
                      {section.label}
                    </span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.16em',
                      color: '#AAAAAA',
                    }}>
                      Будет доступно в апреле
                    </span>
                  </div>
                  <span className="af-block-arrow" style={{ color: '#DDDDDD' }}>→</span>
                </div>
              ) : (
                <button
                  key={section.id}
                  className="af-block"
                  onClick={() => setActiveTab(section.id)}
                >
                  <div className="af-block-inner">
                    <span className="af-block-index">{section.index} — Раздел</span>
                    <span className={`af-block-name ${isShortName(section.label) ? 'af-block-name-short' : 'af-block-name-long'}`}>
                      {section.label}
                    </span>
                    <span className="af-block-sub">
                      {section.id === 'design' && `${projectInvoices.length} счетов`}
                      {section.id === 'supervision' && `${projectVisits.length} визитов`}
                    </span>
                  </div>
                  <span className="af-block-arrow">→</span>
                </button>
              )
            )}

            {/* Chat block */}
            <button
              className="af-block"
              onClick={() => setActiveTab("chat")}
            >
              <div className="af-block-inner">
                <span className="af-block-index">04 — Раздел</span>
                <span className="af-block-name af-block-name-short">Чат</span>
                <span className="af-block-sub">Обсуждение проекта</span>
              </div>
              <span className="af-block-arrow">→</span>
            </button>

            {/* Settings — dark block */}
            {permissions.canViewSettings && (
              <button
                className="af-block af-block-settings"
                onClick={() => setActiveTab("settings")}
              >
                <div className="af-block-inner">
                  <span className="af-block-name">Настройки</span>
                </div>
                <span className="af-block-arrow">→</span>
              </button>
            )}
          </div>
        )}

        {/* ═══ LEVEL 3: Section content ═══ */}
        {activeTab !== null && (
          <div>
            {/* Section hero */}
            {activeTab !== 'settings' && activeTab !== 'chat' && (
              <div className="af-section-hero">
                <h2 className="af-section-hero-title">{sectionLabel}</h2>
              </div>
            )}

            {/* Content */}
            <div className="af-content">
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
                  members={membersWithProfiles || []}
                />
              )}
              {activeTab === "supply" && permissions.canViewSupply && (
                <SupplyModule projectId={projectId} toast={toast} />
              )}
              {activeTab === "chat" && (
                <ChatView projectId={projectId} toast={toast} />
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
        )}
      </div>
    </div>
  );
}
