"use client";

import { useState } from "react";
import ProjectCard from "./ProjectCard";
import { ErrorMessage } from "./Loading";
import { DashboardSkeleton } from "./Skeleton";
import { useProjects, useActivityFeed, useDashboardRealtime } from "../lib/hooks";

const INITIAL_ACTIVITY = 8;
const LOAD_MORE_STEP = 10;

interface DashboardProps {
  onNavigate: (page: string, ctx?: any) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: projects, loading, error, refetch: refetchProjects } = useProjects();
  const { data: activity, loading: activityLoading, refetch: refetchActivity } = useActivityFeed();

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

  const metrics = [
    { label: "Активных проектов", value: activeProjects.length },
    { label: "Всего визитов", value: totalVisits },
    { label: "Открытых замечаний", value: openIssues },
    { label: "Фото загружено", value: totalPhotos },
  ];

  return (
    <div className="animate-fade-in">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="af-page-title">Дашборд</h1>
        <p className="af-page-subtitle">{projects.length} проектов · {activeProjects.length} активных</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 'var(--af-gap)', marginBottom: 24 }}>
        {metrics.map((m, i) => (
          <div key={i} className="af-metric">
            <div className="af-metric-value">{m.value}</div>
            <div className="af-metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="mb-8">
        <h2 style={{ fontFamily: 'var(--af-font-display)', fontSize: 24, fontWeight: 900, marginBottom: 16 }}>
          Активность
        </h2>
        <div style={{ background: '#F6F6F4' }}>
          {activityLoading ? (
            <div className="af-label" style={{ padding: 24, textAlign: 'center' }}>Загрузка...</div>
          ) : visibleActivity.length > 0 ? (
            <>
              {visibleActivity.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 20px',
                    borderBottom: '0.5px solid #EBEBEB',
                  }}
                >
                  <div style={{
                    width: 6, height: 6, marginTop: 5, flexShrink: 0,
                    background: '#111',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 12, color: '#111', lineHeight: 1.5 }}>
                      {item.text}
                    </div>
                    <div className="af-label" style={{ marginTop: 2, fontSize: 8 }}>
                      {item.relativeTime}
                    </div>
                  </div>
                </div>
              ))}
              {hasMoreActivity && (
                <div style={{ padding: '12px 20px', textAlign: 'center', borderTop: '0.5px solid #EBEBEB' }}>
                  <button
                    className="af-crumb"
                    onClick={() => setActivityLimit(l => l + LOAD_MORE_STEP)}
                    style={{ fontSize: 9 }}
                  >
                    Показать ещё ({activity!.length - activityLimit})
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="af-label" style={{ padding: 24, textAlign: 'center' }}>Нет активности</div>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--af-font-display)', fontSize: 24, fontWeight: 900 }}>
          Проекты
        </h2>
        <button className="af-crumb" onClick={() => onNavigate("projects")} style={{ fontSize: 10 }}>
          Все проекты →
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--af-gap)' }}>
        {activeProjects.length > 0 ? activeProjects.map((project, i) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={i}
            onClick={() => onNavigate("project", project.id)}
          />
        )) : (
          <div className="af-empty" style={{ gridColumn: '1 / -1' }}>
            <div className="af-empty-dash">—</div>
            <div className="af-empty-label">Нет активных проектов</div>
          </div>
        )}
      </div>
    </div>
  );
}
