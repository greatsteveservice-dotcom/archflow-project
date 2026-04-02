"use client";

import { useProjectsPaginated } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { ErrorMessage } from "./Loading";
import { ProjectsListSkeleton } from "./Skeleton";

interface ClientDashboardProps {
  onNavigate: (page: string, ctx?: any) => void;
  toast: (msg: string) => void;
}

export default function ClientDashboard({ onNavigate, toast }: ClientDashboardProps) {
  const { profile, signOut } = useAuth();
  const { projects, total, loading, error } = useProjectsPaginated();

  if (loading) return <ProjectsListSkeleton />;
  if (error) return <ErrorMessage message={error} />;
  if (!projects) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const greeting = profile?.full_name
    ? profile.full_name.split(' ')[0]
    : null;

  const projectWord = (n: number) => {
    if (n === 1) return 'проект';
    if (n >= 2 && n <= 4) return 'проекта';
    return 'проектов';
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="af-page-title">
            {greeting ? `${greeting},` : 'Мои проекты'}
          </h1>
          {greeting && (
            <h2
              style={{
                fontFamily: "var(--af-font-display)",
                fontSize: 32,
                fontWeight: 900,
                color: '#111',
                lineHeight: 1.0,
                marginTop: 4,
              }}
            >
              ваши проекты
            </h2>
          )}
          <p className="af-page-subtitle">
            {total} {projectWord(total)} &middot; {dateStr}
          </p>
        </div>
        <button
          onClick={signOut}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: "var(--af-font-mono)",
            fontSize: 7,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#111',
            cursor: 'pointer',
            padding: '4px 0',
            marginTop: 4,
          }}
        >
          Выйти
        </button>
      </div>

      {/* Project list */}
      {projects.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {projects.map((project) => (
            <button
              key={project.id}
              className="af-block"
              onClick={() => onNavigate("project", project.id)}
              style={{ minHeight: 120 }}
            >
              <div className="af-block-inner">
                <span
                  className="af-block-name"
                  style={{
                    fontSize: project.title.length > 20 ? 28 : 36,
                  }}
                >
                  {project.title}
                </span>
                {project.address && (
                  <span className="af-block-sub">{project.address}</span>
                )}
              </div>
              <span className="af-block-arrow">&rarr;</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="af-empty">
          <div className="af-empty-dash">&mdash;</div>
          <div className="af-empty-label">
            Пока нет проектов
          </div>
          <p
            style={{
              fontFamily: "var(--af-font-mono)",
              fontSize: 10,
              color: '#111',
              marginTop: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            Ваш дизайнер пригласит вас в проект
          </p>
        </div>
      )}
    </div>
  );
}
