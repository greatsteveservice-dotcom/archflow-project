"use client";

import { memo } from "react";
import type { ProjectWithStats } from "../lib/types";

interface ProjectCardProps {
  project: ProjectWithStats;
  onClick: () => void;
  onHover?: () => void;
  index?: number;
  hasAlert?: boolean;
  unreadCount?: number;
}

const statusLabels: Record<string, string> = {
  active: 'Активный',
  completed: 'Завершён',
  archived: 'Архив',
  paused: 'Пауза',
};

const ProjectCard = memo(function ProjectCard({ project, onClick, onHover, index, hasAlert, unreadCount }: ProjectCardProps) {
  const initial = project.title.charAt(0).toUpperCase();
  const city = project.address?.split(',')[0] || '';
  const year = project.created_at ? new Date(project.created_at).getFullYear() : '';
  const meta = [city, year].filter(Boolean).join(' · ');

  return (
    <div className="af-project-row" onClick={onClick} onMouseEnter={onHover}>
      {/* Index */}
      {typeof index === 'number' && (
        <span className="af-project-index">{String(index + 1).padStart(2, '0')}</span>
      )}

      {/* Large initial letter — decorative */}
      <div className="af-project-thumb">{initial}</div>

      {/* Content — bottom-aligned */}
      <div className="af-project-content">
        <div className="af-project-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {project.title}
          {hasAlert && (
            <span style={{
              width: 6,
              height: 6,
              background: '#111',
              display: 'inline-block',
              flexShrink: 0,
            }} />
          )}
          {!!unreadCount && unreadCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 16, height: 16, padding: '0 4px',
              background: '#111', color: '#fff',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 600,
              flexShrink: 0,
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
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
