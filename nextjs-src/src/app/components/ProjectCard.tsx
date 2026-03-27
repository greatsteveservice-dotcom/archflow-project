"use client";

import { memo } from "react";
import type { ProjectWithStats } from "../lib/types";

interface ProjectCardProps {
  project: ProjectWithStats;
  onClick: () => void;
  index?: number;
}

const statusLabels: Record<string, string> = {
  active: 'Активный',
  completed: 'Завершён',
  archived: 'Архив',
  paused: 'Пауза',
};

const ProjectCard = memo(function ProjectCard({ project, onClick, index }: ProjectCardProps) {
  const initial = project.title.charAt(0).toUpperCase();
  const city = project.address?.split(',')[0] || '';
  const year = project.created_at ? new Date(project.created_at).getFullYear() : '';
  const meta = [city, year].filter(Boolean).join(' · ');

  return (
    <div className="af-project-row" onClick={onClick}>
      {/* Index */}
      {typeof index === 'number' && (
        <span className="af-project-index">{String(index + 1).padStart(2, '0')}</span>
      )}

      {/* Thumb */}
      <div className="af-project-thumb">{initial}</div>

      {/* Content */}
      <div className="af-project-content">
        <div className="af-project-name">{project.title}</div>
        {meta && <div className="af-project-meta">{meta}</div>}
        <span className="af-project-status">
          {statusLabels[project.status] || project.status}
        </span>
      </div>

      {/* Arrow */}
      <span className="af-project-arrow">→</span>
    </div>
  );
});

export default ProjectCard;
