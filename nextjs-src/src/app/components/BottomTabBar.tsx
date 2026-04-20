"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import { useProjects } from "../lib/hooks";

interface Props {
  onSearchOpen: () => void;
}

/** Parse current project id from URL (/projects/:id or /projects/:id/:tab) */
function useCurrentProjectId(): string | null {
  const pathname = usePathname();
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

export default function BottomTabBar({ onSearchOpen }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, session } = useAuth();
  const currentProjectId = useCurrentProjectId();
  const { data: projects } = useProjects();

  // Fallback project: first active project if user isn't currently in one
  const fallbackProjectId = useMemo(() => {
    if (!projects) return null;
    const active = projects.find(p => p.status === 'active');
    return (active || projects[0])?.id || null;
  }, [projects]);

  const targetProjectId = currentProjectId || fallbackProjectId;
  const isDesigner = profile?.role === 'designer';

  // Don't render if not authenticated
  if (!session) return null;

  const goToProjectTab = (tab: string) => {
    if (!targetProjectId) {
      router.push('/projects');
      return;
    }
    router.push(`/projects/${targetProjectId}/${tab}`);
  };

  const isActive = (tab: string) => {
    return pathname === `/projects/${targetProjectId}/${tab}`;
  };

  return (
    <nav className="af-tabbar" aria-label="Навигация">
      <button
        className={`af-tabbar-btn${isActive('chat') ? ' active' : ''}`}
        onClick={() => goToProjectTab('chat')}
        aria-label="Чат"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
          <path d="M3 4 H17 V14 H10 L5 17.5 V14 H3 Z" />
        </svg>
        <span className="af-tabbar-label">Чат</span>
      </button>

      <button
        className="af-tabbar-btn"
        onClick={onSearchOpen}
        aria-label="Поиск"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <line x1="13" y1="13" x2="17" y2="17" strokeLinecap="round" />
        </svg>
        <span className="af-tabbar-label">Поиск</span>
      </button>

      <button
        className={`af-tabbar-btn${isActive('supervision') ? ' active' : ''}`}
        onClick={() => goToProjectTab('supervision')}
        aria-label="Задачи"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
          <rect x="4" y="3" width="12" height="14" />
          <line x1="7" y1="7" x2="13" y2="7" />
          <line x1="7" y1="10" x2="13" y2="10" />
          <line x1="7" y1="13" x2="11" y2="13" />
        </svg>
        <span className="af-tabbar-label">Задачи</span>
      </button>

      {isDesigner && (
        <button
          className={`af-tabbar-btn${isActive('assistant') ? ' active' : ''}`}
          onClick={() => goToProjectTab('assistant')}
          aria-label="Ассистент"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
            <circle cx="10" cy="10" r="7" />
            <circle cx="7.5" cy="9" r="0.9" fill="currentColor" />
            <circle cx="12.5" cy="9" r="0.9" fill="currentColor" />
            <path d="M7 13 Q10 15 13 13" fill="none" strokeLinecap="round" />
          </svg>
          <span className="af-tabbar-label">Ассистент</span>
        </button>
      )}
    </nav>
  );
}
