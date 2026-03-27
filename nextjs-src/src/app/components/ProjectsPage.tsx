"use client";

import { useState, useMemo } from "react";
import ProjectCard from "./ProjectCard";
import EmptyState from "./EmptyState";
import { ErrorMessage } from "./Loading";
import { ProjectsListSkeleton } from "./Skeleton";
import { useProjectsPaginated } from "../lib/hooks";

interface ProjectsPageProps {
  onNavigate: (page: string, ctx?: any) => void;
  onCreateProject?: () => void;
}

export default function ProjectsPage({ onNavigate, onCreateProject }: ProjectsPageProps) {
  const {
    projects,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  } = useProjectsPaginated();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const activeCount = projects.filter(p => p.status === 'active').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="animate-fade-in">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="af-page-title">Проекты</h1>
        <p className="af-page-subtitle">{total} проектов · {dateStr}</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-[340px] w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="af-input"
            style={{ height: 44, fontSize: 12 }}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setSearch("")}
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#AAA' }}
            >
              ✕
            </button>
          )}
        </div>
        <div className="stab">
          <button className={`stb ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
            Все ({total})
          </button>
          <button className={`stb ${statusFilter === "active" ? "active" : ""}`} onClick={() => setStatusFilter("active")}>
            Активные ({activeCount})
          </button>
          {completedCount > 0 && (
            <button className={`stb ${statusFilter === "completed" ? "active" : ""}`} onClick={() => setStatusFilter("completed")}>
              Завершённые ({completedCount})
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--af-gap)' }}>
            {filtered.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                onClick={() => onNavigate("project", project.id)}
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
