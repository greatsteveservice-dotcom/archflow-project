"use client";

import { Icons } from "./Icons";

interface Project {
  id: number;
  title: string;
  address: string;
  status: string;
  visits: number;
  photos: number;
  lastActivity: string;
  progress: number;
  client: string;
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <div
      className="bg-white border border-[#E8E6E1] rounded-xl p-5 cursor-pointer transition-all duration-200 relative overflow-hidden group hover:border-[#D5D3CE] hover:shadow-md"
      onClick={onClick}
    >
      {/* Top accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#2C5F2D] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-[15px] font-semibold leading-tight">{project.title}</h3>
          <div className="flex items-center gap-1 text-xs text-[#9B9B9B] mt-1">
            <Icons.Map /> {project.address}
          </div>
        </div>
        <span
          className={`badge ${project.status === "active" ? "bg-[#E8F0E8] text-[#2C5F2D]" : "bg-gray-100 text-gray-500"}`}
        >
          {project.status === "active" ? "Активный" : "Завершён"}
        </span>
      </div>

      <div className="flex gap-4 mt-4 pt-3.5 border-t border-[#F0EEE9]">
        <div>
          <div className="text-lg font-semibold font-mono-custom">{project.visits}</div>
          <div className="text-[11px] text-[#9B9B9B] mt-0.5">визитов</div>
        </div>
        <div>
          <div className="text-lg font-semibold font-mono-custom">{project.photos}</div>
          <div className="text-[11px] text-[#9B9B9B] mt-0.5">фото</div>
        </div>
        <div>
          <div className="text-lg font-semibold font-mono-custom">{project.progress}%</div>
          <div className="text-[11px] text-[#9B9B9B] mt-0.5">прогресс</div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-3.5">
        <div className="flex items-center gap-1 text-xs text-[#9B9B9B]">
          <Icons.Clock /> {project.lastActivity}
        </div>
        <div className="h-1 bg-[#F0EEE9] rounded-sm overflow-hidden flex-1 max-w-[80px] ml-3">
          <div
            className="h-full bg-[#2C5F2D] rounded-sm transition-all duration-700 ease-out"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
