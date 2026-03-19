"use client";

import { useState } from "react";
import ProjectCard from "./ProjectCard";
import Loading, { ErrorMessage } from "./Loading";
import { useProjects } from "../lib/hooks";

interface ProjectsPageProps {
  onNavigate: (page: string, ctx?: any) => void;
}

export default function ProjectsPage({ onNavigate }: ProjectsPageProps) {
  const [filter, setFilter] = useState("all");
  const { data: projects, loading, error } = useProjects();

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!projects) return null;

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  return (
    <div className="animate-fade-in">
      <div className="filter-tabs mb-5">
        {[
          { id: "all", label: "Все" },
          { id: "active", label: "Активные" },
          { id: "completed", label: "Завершённые" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`filter-tab ${filter === tab.id ? "active" : ""}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 max-sm:grid-cols-1">
        {filtered.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => onNavigate("project", project.id)}
          />
        ))}
      </div>
    </div>
  );
}
