"use client";

import { memo } from "react";
import { Icons } from "./Icons";
import type { ProjectWithStats } from "../lib/types";

interface ProjectCardProps {
  project: ProjectWithStats;
  onClick: () => void;
}

const ProjectCard = memo(function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <div
      className="card p-5 cursor-pointer hover:shadow-md group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold leading-tight truncate">{project.title}</h3>
          {project.address && (
            <div className="flex items-center gap-1.5 text-[13px] text-ink-muted mt-1.5">
              <Icons.Map className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{project.address}</span>
            </div>
          )}
        </div>
        {/* Activity indicator */}
        <div className="flex-shrink-0 mt-1">
          <div className={`w-2.5 h-2.5 rounded-full ${
            project.open_issues > 0 ? 'bg-err' :
            project.last_activity !== 'нет активности' ? 'bg-ok' :
            'bg-ink-ghost'
          }`} title={project.last_activity} />
        </div>
      </div>
    </div>
  );
});

export default ProjectCard;
