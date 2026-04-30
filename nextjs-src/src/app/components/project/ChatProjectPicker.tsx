'use client';

/**
 * ChatProjectPicker — header chip + bottom-sheet to switch project from inside chat.
 * Renders nothing if user has only one project.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjects, useUnreadCounts } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';

interface Props {
  currentProjectId: string;
}

export default function ChatProjectPicker({ currentProjectId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const [open, setOpen] = useState(false);

  // Show active projects + the current one (in case it's archived)
  const visibleProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => p.status === 'active' || p.id === currentProjectId);
  }, [projects, currentProjectId]);

  const projectIds = useMemo(() => visibleProjects.map(p => p.id), [visibleProjects]);
  const { counts: unreadCounts } = useUnreadCounts(projectIds, user?.id || null);

  const current = visibleProjects.find(p => p.id === currentProjectId);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Hide entirely if user has 0 or 1 project
  if (visibleProjects.length < 2) return null;
  if (!current) return null;

  const select = (id: string) => {
    setOpen(false);
    if (id !== currentProjectId) {
      router.push(`/projects/${id}/chat`);
    }
  };

  return (
    <>
      <div style={{ padding: '8px 16px 12px' }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="af-chat-project-switch"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: '#FFF',
            border: '1px solid #111',
            cursor: 'pointer',
            fontFamily: 'var(--af-font)',
            color: '#111',
          }}
        >
          <span style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0,
          }}>
            <span style={{
              fontSize: 'var(--af-fs-8)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.6,
            }}>
              Проект чата
            </span>
            <span style={{
              fontSize: 'var(--af-fs-12)',
              fontWeight: 700,
              letterSpacing: '0.02em',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {current.title}
            </span>
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, marginLeft: 12 }}>↓</span>
        </button>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17,17,17,0.4)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 720,
              margin: '0 auto',
              background: '#FFF',
              borderTop: '1px solid #111',
              maxHeight: '80dvh',
              overflowY: 'auto',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid #EBEBEB',
              position: 'sticky', top: 0, background: '#FFF',
            }}>
              <span style={{
                fontSize: 'var(--af-fs-10)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}>
                Выбрать проект
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                style={{
                  background: 'none', border: 'none',
                  fontSize: 22, cursor: 'pointer', color: '#111',
                  lineHeight: 1, padding: 4,
                }}
              >×</button>
            </div>

            {visibleProjects.map(p => {
              const isCurrent = p.id === currentProjectId;
              const unread = unreadCounts.get(p.id) || 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%',
                    padding: '16px',
                    border: 'none',
                    borderBottom: '1px solid #EBEBEB',
                    background: isCurrent ? '#F6F6F4' : '#FFF',
                    cursor: 'pointer',
                    color: '#111',
                    textAlign: 'left',
                    fontFamily: 'var(--af-font)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 'var(--af-fs-12)',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {isCurrent && <span style={{ marginRight: 6 }}>●</span>}
                      {p.title}
                    </span>
                    {(() => {
                      const meta: string[] = [];
                      if (p.address) meta.push(p.address);
                      if (p.start_date) {
                        const y = new Date(p.start_date).getFullYear();
                        if (!isNaN(y)) meta.push(String(y));
                      }
                      if (meta.length === 0) return null;
                      return (
                        <span style={{
                          fontSize: 'var(--af-fs-9)',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          opacity: 0.55,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {meta.join(' · ')}
                        </span>
                      );
                    })()}
                  </div>
                  {unread > 0 && (
                    <span style={{
                      minWidth: 22, height: 22,
                      padding: '0 6px',
                      background: '#111', color: '#FFF',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'var(--af-fs-9)',
                      fontWeight: 700,
                      marginLeft: 8,
                    }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
