"use client";

import { useState } from "react";
import { Icons } from "./Icons";
import ProjectCard from "./ProjectCard";
import { ErrorMessage } from "./Loading";
import { DashboardSkeleton } from "./Skeleton";
import { useProjects, useActivityFeed, useDashboardRealtime } from "../lib/hooks";
import OnboardingTip from "./OnboardingTip";

const INITIAL_ACTIVITY = 8;
const LOAD_MORE_STEP = 10;

interface DashboardProps {
  onNavigate: (page: string, ctx?: any) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: projects, loading, error, refetch: refetchProjects } = useProjects();
  const { data: activity, loading: activityLoading, refetch: refetchActivity } = useActivityFeed();

  // Real-time updates
  useDashboardRealtime(() => { refetchProjects(); refetchActivity(); });
  const [activityLimit, setActivityLimit] = useState(INITIAL_ACTIVITY);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorMessage message={error} />;
  if (!projects) return null;

  const activeProjects = projects.filter(p => p.status === "active");
  const totalVisits = projects.reduce((sum, p) => sum + p.visit_count, 0);
  const totalPhotos = projects.reduce((sum, p) => sum + p.photo_count, 0);
  const openIssues = projects.reduce((sum, p) => sum + p.open_issues, 0);

  const visibleActivity = activity ? activity.slice(0, activityLimit) : [];
  const hasMoreActivity = activity ? activity.length > activityLimit : false;

  return (
    <div className="animate-fade-in">
      <OnboardingTip
        id="dashboard-intro"
        title="Ваш дашборд"
        text="Здесь отображается сводка по всем проектам: статистика, активность и быстрый доступ к проектам."
        className="mb-5"
      />
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Активных проектов", value: String(activeProjects.length), change: `из ${projects.length} всего`, up: true },
          { label: "Всего визитов", value: String(totalVisits), change: "по всем проектам", up: true },
          { label: "Открытых замечаний", value: String(openIssues), change: openIssues > 0 ? "требуют внимания" : "всё ОК", up: false, danger: openIssues > 0 },
          { label: "Фото загружено", value: String(totalPhotos), change: "по всем проектам", up: true },
        ].map((stat, i) => (
          <div key={i} className="bg-srf border border-line rounded-xl p-4">
            <div className="text-xs text-ink-faint mb-1.5">{stat.label}</div>
            <div
              className={`text-2xl font-bold font-mono-custom ${stat.danger ? "text-err" : "text-ink"}`}
            >
              {stat.value}
            </div>
            <div className={`text-[11px] mt-1 ${stat.up ? "text-ok" : "text-err"}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold">Последняя активность</h2>
      </div>
      <div className="bg-srf border border-line rounded-xl px-5 py-1 mb-6">
        {activityLoading ? (
          <div className="py-6 text-center text-[13px] text-ink-faint">Загрузка...</div>
        ) : visibleActivity.length > 0 ? (
          <>
            {visibleActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-3 border-b border-line-light last:border-none"
              >
                <div
                  className="w-2 h-2 rounded-full mt-[5px] flex-shrink-0"
                  style={{ background: item.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-ink-muted leading-relaxed">{item.text}</div>
                  <div className="text-[11px] text-ink-faint mt-0.5">{item.relativeTime}</div>
                </div>
              </div>
            ))}
            {hasMoreActivity && (
              <div className="py-3 text-center border-t border-line-light">
                <button
                  className="text-[12px] text-info hover:text-info hover:underline transition-colors"
                  onClick={() => setActivityLimit(l => l + LOAD_MORE_STEP)}
                >
                  Показать ещё ({activity!.length - activityLimit} шт.)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-6 text-center text-[13px] text-ink-faint">Нет активности</div>
        )}
      </div>

      {/* Projects */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold">Проекты</h2>
        <button className="btn btn-primary text-[12px] sm:text-[13px]" onClick={() => onNavigate("projects")}>
          <span className="hidden sm:inline">Все проекты</span>
          <span className="sm:hidden">Все</span>
          <Icons.ChevronRight />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {activeProjects.length > 0 ? activeProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => onNavigate("project", project.id)}
          />
        )) : (
          <div className="col-span-full text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-srf-secondary flex items-center justify-center mx-auto mb-3 text-ink-faint">
              <Icons.Folder className="w-6 h-6" />
            </div>
            <p className="text-[13px] text-ink-faint">Нет активных проектов</p>
          </div>
        )}
      </div>
    </div>
  );
}
