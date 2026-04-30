'use client';

/**
 * Mockup: project switcher in ChatView header.
 * Shows two states — closed and open bottom-sheet.
 * Uses Archflow design system (Vollkorn SC, 4 colors, radius 0).
 */

import { useState } from 'react';

const projects = [
  { id: 'p1', title: 'Апартаменты "Букинист"', city: 'Бутлерова 17Б', year: 2026, unread: 0 },
  { id: 'p2', title: 'КП Ели Estate',           city: 'Клин',           year: 2026, unread: 2 },
  { id: 'p3', title: 'ЖК Дом Серебряный Бор',   city: 'Москва',         year: 2026, unread: 0 },
  { id: 'p4', title: 'ЖК ILove',                 city: 'Москва',         year: 2026, unread: 5 },
];

export default function ChatSwitchMockupPage() {
  const [activeId, setActiveId] = useState('p4');
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'team' | 'client'>('team');

  const active = projects.find(p => p.id === activeId)!;

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F6F6F4',
      fontFamily: 'var(--af-font)',
      color: '#111',
      paddingBottom: 80,
    }}>
      {/* Mockup label */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #EBEBEB',
        background: '#FFF',
        fontSize: 'var(--af-fs-9)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        Мокап · Переключение проектов в чате
      </div>

      {/* Crumbs */}
      <div style={{
        padding: '14px 16px 4px',
        fontSize: 'var(--af-fs-9)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#111',
        opacity: 0.55,
      }}>
        Проекты / {active.title} / Чат
      </div>

      {/* Project switcher (chip header) */}
      <div style={{ padding: '8px 16px 14px' }}>
        <button
          onClick={() => setOpen(true)}
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
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#111';
            (e.currentTarget as HTMLElement).style.color = '#FFF';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#FFF';
            (e.currentTarget as HTMLElement).style.color = '#111';
          }}
        >
          <span style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
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
            }}>
              {active.title}
            </span>
          </span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>↓</span>
        </button>
      </div>

      {/* Channel pills (existing chat tabs) */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 16px 12px', flexWrap: 'wrap',
      }}>
        {(['client', 'team'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '6px 14px',
              border: '0.5px solid #111',
              background: activeTab === t ? '#111' : '#FFF',
              color: activeTab === t ? '#FFF' : '#111',
              fontFamily: 'var(--af-font)',
              fontSize: 'var(--af-fs-10)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {t === 'client' ? 'Заказчик' : 'Команда'}
          </button>
        ))}
        <button
          style={{
            padding: '6px 14px',
            border: '0.5px solid #EBEBEB',
            background: '#FFF',
            color: '#111',
            fontFamily: 'var(--af-font)',
            fontSize: 'var(--af-fs-10)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            opacity: 0.6,
            cursor: 'pointer',
          }}
        >
          + Новый чат
        </button>
      </div>

      {/* Fake chat preview */}
      <div style={{
        padding: '20px 16px',
        background: '#FFF',
        borderTop: '1px solid #EBEBEB',
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{
          alignSelf: 'flex-start',
          background: '#F6F6F4',
          padding: '10px 14px',
          maxWidth: '70%',
          fontSize: 'var(--af-fs-12)',
        }}>
          Чат проекта «{active.title}». Переключите проект, чтобы открыть его сообщения.
        </div>
        <div style={{
          alignSelf: 'flex-end',
          background: '#111',
          color: '#FFF',
          padding: '10px 14px',
          maxWidth: '70%',
          fontSize: 'var(--af-fs-12)',
        }}>
          Привет! Это сообщение из «{active.title}».
        </div>
      </div>

      {/* Bottom sheet — open state */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(17,17,17,0.4)',
            zIndex: 100,
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
                style={{
                  background: 'none', border: 'none',
                  fontSize: 22, cursor: 'pointer', color: '#111',
                  lineHeight: 1,
                }}
              >×</button>
            </div>

            {projects.map((p) => {
              const isCurrent = p.id === activeId;
              return (
                <button
                  key={p.id}
                  onClick={() => { setActiveId(p.id); setOpen(false); }}
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
                  onMouseEnter={(e) => {
                    if (!isCurrent) (e.currentTarget as HTMLElement).style.background = '#F6F6F4';
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) (e.currentTarget as HTMLElement).style.background = '#FFF';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                    <span style={{
                      fontSize: 'var(--af-fs-12)',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                    }}>
                      {isCurrent && <span style={{ marginRight: 6 }}>●</span>}
                      {p.title}
                    </span>
                    <span style={{
                      fontSize: 'var(--af-fs-9)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      opacity: 0.55,
                    }}>
                      {p.city} · {p.year}
                    </span>
                  </div>
                  {p.unread > 0 && (
                    <span style={{
                      minWidth: 22, height: 22,
                      padding: '0 6px',
                      background: '#111', color: '#FFF',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'var(--af-fs-9)',
                      fontWeight: 700,
                    }}>
                      {p.unread > 99 ? '99+' : p.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom hint */}
      <div style={{
        padding: '20px 16px',
        fontSize: 'var(--af-fs-9)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        opacity: 0.55,
      }}>
        Тап на шапку «Проект чата» открывает выбор. Текущий проект помечен «●». Бейдж справа — непрочитанные.
      </div>
    </div>
  );
}
