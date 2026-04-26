"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import ProjectCard from "./ProjectCard";
import EmptyState from "./EmptyState";
import ChangelogBanner from "./ChangelogBanner";
import { ErrorMessage } from "./Loading";
import { ProjectsListSkeleton } from "./Skeleton";
import { useProjectsPaginated, usePendingAlerts, useUnreadCounts } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { fetchProject } from "../lib/queries";

interface ProjectsPageProps {
  onNavigate: (page: string, ctx?: any) => void;
  onCreateProject?: () => void;
  refreshKey?: number;
}

export default function ProjectsPage({ onNavigate, onCreateProject, refreshKey = 0 }: ProjectsPageProps) {
  const {
    projects,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  } = useProjectsPaginated();

  // Refresh when parent signals (e.g. after project creation)
  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey, refetch]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { user, signOut } = useAuth();
  const projectIds = useMemo(() => (projects || []).map(p => p.id), [projects]);
  const alerts = usePendingAlerts(projectIds);
  const { counts: unreadCounts } = useUnreadCounts(projectIds, user?.id || null);

  const prefetchProject = useCallback((id: string) => {
    fetchProject(id).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.address || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, search, statusFilter]);

  if (loading) return <ProjectsListSkeleton />;
  if (error) return <ErrorMessage message={error} />;
  if (!projects) return null;

  if (projects.length === 0) {
    return (
      <div className="animate-fade-in">
        <EmptyState
          icon={null}
          title="Нет проектов"
          description="Создайте первый проект"
          action={onCreateProject ? { label: '+ Создать проект', onClick: onCreateProject } : undefined}
        />
      </div>
    );
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="animate-fade-in">
      {/* Page title + logout */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="af-page-title">Проекты</h1>
          <p className="af-page-subtitle">{total} проектов · {dateStr}</p>
        </div>
        <button
          onClick={signOut}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-7)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#111',
            cursor: 'pointer',
            padding: '4px 0',
            marginTop: 4,
          }}
        >
          Выйти
        </button>
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 2 }}>
            {filtered.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                hasAlert={alerts.get(project.id) || false}
                unreadCount={unreadCounts.get(project.id) || 0}
                onClick={() => onNavigate("project", project.id)}
                onHover={() => prefetchProject(project.id)}
              />
            ))}
            {/* Add new project */}
            {onCreateProject && (
              <button className="af-project-add" onClick={onCreateProject}>
                <span className="af-project-add-label">+ Новый проект</span>
              </button>
            )}
          </div>

          {/* Load more */}
          {hasMore && !search && statusFilter === "all" && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="af-btn af-btn-outline"
                style={{ height: 44, fontSize: 10 }}
              >
                {loadingMore ? 'Загрузка...' : `Показать ещё (${projects.length} из ${total})`}
              </button>
            </div>
          )}

          {/* Changelog announcement */}
          <ChangelogBanner />
        </>
      ) : (
        <div className="af-empty">
          <div className="af-empty-dash">—</div>
          <div className="af-empty-label">Проекты не найдены</div>
          {search && (
            <button className="af-empty-btn" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
              Сбросить фильтры
            </button>
          )}
        </div>
      )}
    </div>
  );
}
