"use client";

import { Icons } from "./Icons";
import ProjectCard from "./ProjectCard";
import Loading, { ErrorMessage } from "./Loading";
import { useProjects, useActivityFeed } from "../lib/hooks";

interface DashboardProps {
  onNavigate: (page: string, ctx?: any) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: projects, loading, error } = useProjects();
  const { data: activity, loading: activityLoading } = useActivityFeed();

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!projects) return null;

  const activeProjects = projects.filter(p => p.status === "active");
  const totalVisits = projects.reduce((sum, p) => sum + p.visit_count, 0);
  const totalPhotos = projects.reduce((sum, p) => sum + p.photo_count, 0);
  const openIssues = projects.reduce((sum, p) => sum + p.open_issues, 0);

  return (
    <div className="animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {[
          { label: "Активных проектов", value: String(activeProjects.length), change: `из ${projects.length} всего`, up: true },
          { label: "Всего визитов", value: String(totalVisits), change: "по всем проектам", up: true },
          { label: "Открытых замечаний", value: String(openIssues), change: openIssues > 0 ? "требуют внимания" : "всё ОК", up: false, danger: openIssues > 0 },
          { label: "Фото загружено", value: String(totalPhotos), change: "по всем проектам", up: true },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-[#E8E6E1] rounded-xl p-4">
            <div className="text-xs text-[#9B9B9B] mb-1.5">{stat.label}</div>
            <div
              className="text-2xl font-bold font-mono-custom"
              style={{ color: stat.danger ? "#E85D3A" : "#1A1A1A" }}
            >
              {stat.value}
            </div>
            <div className={`text-[11px] mt-1 ${stat.up ? "text-[#2A9D5C]" : "text-[#E85D3A]"}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold">Последняя активность</h2>
      </div>
      <div className="bg-white border border-[#E8E6E1] rounded-xl px-5 py-1 mb-6">
        {activityLoading ? (
          <div className="py-6 text-center text-[13px] text-[#9CA3AF]">Загрузка...</div>
        ) : activity && activity.length > 0 ? (
          activity.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 py-3 border-b border-[#F0EEE9] last:border-none"
            >
              <div
                className="w-2 h-2 rounded-full mt-[5px] flex-shrink-0"
                style={{ background: item.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-[#6B6B6B] leading-relaxed">{item.text}</div>
                <div className="text-[11px] text-[#9B9B9B] mt-0.5">{item.relativeTime}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-[13px] text-[#9CA3AF]">Нет активности</div>
        )}
      </div>

      {/* Projects */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold">Проекты</h2>
        <button className="btn btn-primary" onClick={() => onNavigate("projects")}>
          Все проекты <Icons.ChevronRight />
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 max-sm:grid-cols-1">
        {activeProjects.length > 0 ? activeProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => onNavigate("project", project.id)}
          />
        )) : (
          <div className="col-span-full text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-3 text-[#9CA3AF]">
              <Icons.Folder className="w-6 h-6" />
            </div>
            <p className="text-[13px] text-[#9CA3AF]">Нет активных проектов</p>
          </div>
        )}
      </div>
    </div>
  );
}
