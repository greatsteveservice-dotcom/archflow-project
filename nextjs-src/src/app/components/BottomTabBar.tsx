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

  const fallbackProjectId = useMemo(() => {
    if (!projects) return null;
    const active = projects.find(p => p.status === 'active');
    return (active || projects[0])?.id || null;
  }, [projects]);

  const targetProjectId = currentProjectId || fallbackProjectId;
  const isDesigner = profile?.role === 'designer';

  if (!session) return null;

  const goToProjectTab = (tab: string) => {
    if (!targetProjectId) {
      router.push('/projects');
      return;
    }
    router.push(`/projects/${targetProjectId}/${tab}`);
  };

  const isActive = (tab: string) => pathname === `/projects/${targetProjectId}/${tab}`;

  return (
    <nav className="af-tabbar" aria-label="Навигация">
      <button
        className={`af-tabbar-btn${isActive('chat') ? ' active' : ''}`}
        onClick={() => goToProjectTab('chat')}
        aria-label="Чат"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
          <path d="M4 5 H20 V16 H12 L6 20 V16 H4 Z" />
        </svg>
        <span className="af-tabbar-label">Чат</span>
      </button>

      <button
        className="af-tabbar-btn"
        onClick={onSearchOpen}
        aria-label="Поиск"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <line x1="15.5" y1="15.5" x2="20" y2="20" />
        </svg>
        <span className="af-tabbar-label">Поиск</span>
      </button>

      <button
        className={`af-tabbar-btn${isActive('supervision') ? ' active' : ''}`}
        onClick={() => goToProjectTab('supervision')}
        aria-label="Задачи"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
          <rect x="5" y="4" width="14" height="17" rx="1" />
          <line x1="8" y1="9" x2="16" y2="9" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
        <span className="af-tabbar-label">Задачи</span>
      </button>

      {isDesigner && (
        <button
          className={`af-tabbar-btn${isActive('assistant') ? ' active' : ''}`}
          onClick={() => goToProjectTab('assistant')}
          aria-label="Ассистент"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
            <path d="M5 7 L12 3 L19 7 L19 13 Q12 18 5 13 Z" />
            <circle cx="10" cy="10.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="14" cy="10.5" r="1" fill="currentColor" stroke="none" />
            <path d="M10 13.5 Q12 15 14 13.5" />
          </svg>
          <span className="af-tabbar-label">Ассистент</span>
        </button>
      )}
    </nav>
  );
}
