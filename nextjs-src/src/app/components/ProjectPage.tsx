"use client";

import { useState } from "react";
import { Icons } from "./Icons";
import Topbar from "./Topbar";
import Loading, { ErrorMessage } from "./Loading";
import { useProject, useProjectVisits, useProjectInvoices } from "../lib/hooks";
import { usePermissions } from "../lib/permissions";
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

  if (loadingProject || loadingVisits) return <Loading />;
  if (errorProject) return <ErrorMessage message={errorProject} />;
  if (!project) return <ErrorMessage message="Проект не найден" />;

  const projectVisits = visits || [];
  const projectInvoices = invoices || [];

  const handleSelectVisit = (visitId: string) => {
    onNavigate("visit", { projectId: project.id, visitId });
  };

  return (
    <div className="animate-fade-in">
      <Topbar
        title={project.title}
        onMenuToggle={onMenuToggle}
        breadcrumbs={[
          { label: "Проекты", onClick: () => onNavigate("projects") },
          { label: project.title },
        ]}
        actions={
          <button className="btn btn-secondary">
            <Icons.Download className="w-4 h-4" /> Экспорт
          </button>
        }
      />

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
          <SettingsTab project={project} projectId={projectId} toast={toast} />
        )}
      </div>
    </div>
  );
}
