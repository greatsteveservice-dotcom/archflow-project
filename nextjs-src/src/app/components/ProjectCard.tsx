"use client";

import { Icons } from "./Icons";
import Bdg from "./Bdg";
import type { ProjectWithStats } from "../lib/types";

interface ProjectCardProps {
  project: ProjectWithStats;
  onClick: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <div
      className="card p-5 cursor-pointer hover:shadow-md group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-[15px] font-semibold leading-tight">{project.title}</h3>
          <div className="flex items-center gap-1 text-xs text-[#9CA3AF] mt-1">
            <Icons.Map /> {project.address || '—'}
          </div>
        </div>
        <Bdg s={project.status} />
      </div>

      <div className="flex gap-4 mt-4 pt-3.5 border-t border-[#F3F4F6]">
        <div>
          <div className="text-lg font-semibold font-mono-custom">{project.visit_count}</div>
          <div className="text-[11px] text-[#9CA3AF] mt-0.5">визитов</div>
        </div>
        <div>
          <div className="text-lg font-semibold font-mono-custom">{project.photo_count}</div>
          <div className="text-[11px] text-[#9CA3AF] mt-0.5">фото</div>
        </div>
        <div>
          <div className="text-lg font-semibold font-mono-custom">{project.progress}%</div>
          <div className="text-[11px] text-[#9CA3AF] mt-0.5">прогресс</div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-3.5">
        <div className="flex items-center gap-1 text-xs text-[#9CA3AF]">
          <Icons.Clock /> {project.last_activity}
        </div>
        <div className="h-1 bg-[#F3F4F6] rounded-sm overflow-hidden flex-1 max-w-[80px] ml-3">
          <div
            className="h-full bg-[#111827] rounded-sm transition-all duration-700 ease-out"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
