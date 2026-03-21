"use client";

import ProjectCard from "./ProjectCard";
import Loading, { ErrorMessage } from "./Loading";
import { useProjects } from "../lib/hooks";

interface ProjectsPageProps {
  onNavigate: (page: string, ctx?: any) => void;
}

export default function ProjectsPage({ onNavigate }: ProjectsPageProps) {
  const { data: projects, loading, error } = useProjects();

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!projects) return null;

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
