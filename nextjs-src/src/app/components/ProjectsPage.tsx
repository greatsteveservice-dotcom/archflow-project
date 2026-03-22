"use client";

import { Icons } from "./Icons";
import ProjectCard from "./ProjectCard";
import EmptyState from "./EmptyState";
import Loading, { ErrorMessage } from "./Loading";
import { useProjects } from "../lib/hooks";

interface ProjectsPageProps {
  onNavigate: (page: string, ctx?: any) => void;
  onCreateProject?: () => void;
}

export default function ProjectsPage({ onNavigate, onCreateProject }: ProjectsPageProps) {
  const { data: projects, loading, error } = useProjects();

  if (loading) return <Loading />;
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

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projects.map((project) => (
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
