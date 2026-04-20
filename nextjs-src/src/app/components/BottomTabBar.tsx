"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import { useProjects } from "../lib/hooks";

interface Props {
  onSearchOpen: () => void;
  onHelpOpen: () => void;
}

function useCurrentProjectId(): string | null {
  const pathname = usePathname();
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

export default function BottomTabBar({ onSearchOpen, onHelpOpen }: Props) {
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
    if (!targetProjectId) { router.push('/projects'); return; }
    router.push(`/projects/${targetProjectId}/${tab}`);
  };

  const isChatActive = pathname === `/projects/${targetProjectId}/chat`;
  const isAssistantActive = pathname === `/projects/${targetProjectId}/assistant`;

  return (
    <nav className="af-tabbar" aria-label="Навигация">
      {/* Чат */}
      <button
        className={`af-tabbar-btn${isChatActive ? ' active' : ''}`}
        onClick={() => goToProjectTab('chat')}
        aria-label="Чат"
      >
        <span className="af-tabbar-icon">
          {isChatActive ? (
            <svg width="28" height="28" viewBox="0 0 26 26" fill="currentColor" aria-hidden="true">
              <path d="M4 5 H22 V18 H13 L7 22 V18 H4 Z" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5 H22 V18 H13 L7 22 V18 H4 Z" />
            </svg>
          )}
        </span>
        <span className="af-tabbar-label">Чат</span>
      </button>

      {/* Поиск */}
      <button
        className="af-tabbar-btn"
        onClick={onSearchOpen}
        aria-label="Поиск"
      >
        <span className="af-tabbar-icon">
          <svg width="28" height="28" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <line x1="16" y1="16" x2="22" y2="22" />
          </svg>
        </span>
        <span className="af-tabbar-label">Поиск</span>
      </button>

      {/* Помощь */}
      <button
        className="af-tabbar-btn"
        onClick={onHelpOpen}
        aria-label="Помощь"
      >
        <span className="af-tabbar-icon">
          <svg width="28" height="28" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="13" cy="13" r="9" />
            <path d="M10 10 Q10 7.5 13 7.5 Q16 7.5 16 10 Q16 11.5 13 13 L13 15" />
            <circle cx="13" cy="18" r="0.9" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="af-tabbar-label">Помощь</span>
      </button>

      {/* Ассистент — только для дизайнера */}
      {isDesigner && (
        <button
          className={`af-tabbar-btn${isAssistantActive ? ' active' : ''}`}
          onClick={() => goToProjectTab('assistant')}
          aria-label="Ассистент"
        >
          <span className="af-tabbar-icon">
            {isAssistantActive ? (
              <svg width="28" height="28" viewBox="0 0 26 26" fill="currentColor" aria-hidden="true">
                <path d="M13 3 L14.7 9.3 L21 11 L14.7 12.7 L13 19 L11.3 12.7 L5 11 L11.3 9.3 Z" />
                <circle cx="20" cy="20" r="2.5" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 3 L14.7 9.3 L21 11 L14.7 12.7 L13 19 L11.3 12.7 L5 11 L11.3 9.3 Z" />
                <circle cx="20" cy="20" r="2.5" />
              </svg>
            )}
          </span>
          <span className="af-tabbar-label">Ассистент</span>
        </button>
      )}
    </nav>
  );
}
