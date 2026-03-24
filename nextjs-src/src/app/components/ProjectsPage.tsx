"use client";

import { useState, useMemo } from "react";
import { Icons } from "./Icons";
import ProjectCard from "./ProjectCard";
import EmptyState from "./EmptyState";
import { ErrorMessage } from "./Loading";
import { ProjectsListSkeleton } from "./Skeleton";
import { useProjects } from "../lib/hooks";

interface ProjectsPageProps {
  onNavigate: (page: string, ctx?: any) => void;
  onCreateProject?: () => void;
}

export default function ProjectsPage({ onNavigate, onCreateProject }: ProjectsPageProps) {
  const { data: projects, loading, error } = useProjects();
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
          icon={<Icons.Folder className="w-7 h-7" />}
          title="Нет проектов"
          description="Создайте первый проект, чтобы начать вести авторский надзор"
          action={onCreateProject ? { label: '+ Создать проект', onClick: onCreateProject } : undefined}
        />
      </div>
    );
  }

  const activeCount = projects.filter(p => p.status === 'active').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  return (
    <div className="animate-fade-in">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-[340px] w-full">
          <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или адресу..."
            className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#111827] transition-colors bg-white"
          />
          {search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]"
              onClick={() => setSearch("")}
            >
              <Icons.X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="stab">
          <button className={`stb ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
            Все ({projects.length})
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onNavigate("project", project.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-[#9CA3AF]">
          <Icons.Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <div className="text-[13px]">Проекты не найдены</div>
          {search && (
            <button className="text-[12px] text-[#2563EB] hover:underline mt-1" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
              Сбросить фильтры
            </button>
          )}
        </div>
      )}
    </div>
  );
}
