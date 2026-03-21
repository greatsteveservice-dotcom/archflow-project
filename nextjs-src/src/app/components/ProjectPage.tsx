"use client";

import { useState } from "react";
import { Icons } from "./Icons";
import Topbar from "./Topbar";
import Loading, { ErrorMessage } from "./Loading";
import { useProject, useProjectVisits, useProjectInvoices } from "../lib/hooks";
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
}

const TABS: { id: ProjectTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "overview", label: "Обзор", icon: Icons.Grid },
  { id: "journal", label: "Journal", icon: Icons.Camera },
  { id: "visits", label: "Визиты", icon: Icons.Calendar },
  { id: "supply", label: "Supply", icon: Icons.Box },
  { id: "docs", label: "Документы", icon: Icons.File },
  { id: "settings", label: "Настройки", icon: Icons.Settings },
];

export default function ProjectPage({ projectId, onNavigate, toast }: ProjectPageProps) {
  const { data: project, loading: loadingProject, error: errorProject, refetch: refetchProject } = useProject(projectId);
  const { data: visits, loading: loadingVisits, refetch: refetchVisits } = useProjectVisits(projectId);
  const { data: invoices, refetch: refetchInvoices } = useProjectInvoices(projectId);

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
      <div className="tn px-7">
        {TABS.map(t => (
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
      <div className="p-7">
        {activeTab === "overview" && (
          <OverviewTab
            project={project}
            visits={projectVisits}
            invoices={projectInvoices}
            onTabChange={(tab) => setActiveTab(tab as ProjectTab)}
          />
        )}
        {activeTab === "journal" && (
          <JournalTab
            project={project}
            projectId={projectId}
            visits={projectVisits}
            invoices={projectInvoices}
            onSelectVisit={handleSelectVisit}
            toast={toast}
            refetchInvoices={refetchInvoices}
          />
        )}
        {activeTab === "visits" && (
          <VisitsTab
            project={project}
            projectId={projectId}
            visits={projectVisits}
            toast={toast}
            refetchVisits={() => { refetchVisits(); refetchProject(); }}
          />
        )}
        {activeTab === "supply" && (
          <SupplyModule projectId={projectId} toast={toast} />
        )}
        {activeTab === "docs" && (
          <DocsTab projectId={projectId} toast={toast} />
        )}
        {activeTab === "settings" && (
          <SettingsTab project={project} projectId={projectId} toast={toast} />
        )}
      </div>
    </div>
  );
}
