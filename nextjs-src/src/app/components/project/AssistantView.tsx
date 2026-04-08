'use client';

import { useEffect, useCallback } from 'react';
import { useAssistantEvents, useReminders, useUpcomingTimeline } from '../../lib/hooks';
import { dismissAssistantEvent, triggerProjectAnalysis } from '../../lib/queries';
import type { AssistantEvent } from '../../lib/types';

interface AssistantViewProps {
  projectId: string;
  toast: (msg: string) => void;
  onNavigate: (page: string, ctx?: any) => void;
}

const mono = "'IBM Plex Mono', monospace";
const display = "'Playfair Display', serif";

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'СРОЧНО',
  important: 'ВАЖНО',
  normal: 'ИНФО',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function daysUntil(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export default function AssistantView({ projectId, toast, onNavigate }: AssistantViewProps) {
  const { data: events, loading: eventsLoading, refetch: refetchEvents } = useAssistantEvents(projectId);
  const { data: timeline, loading: timelineLoading } = useUpcomingTimeline(projectId);
  const { data: reminders } = useReminders(projectId);

  // Trigger analysis on mount
  useEffect(() => {
    triggerProjectAnalysis(projectId).catch(() => {});
  }, [projectId]);

  const handleDismiss = useCallback(async (eventId: string) => {
    try {
      await dismissAssistantEvent(eventId);
      refetchEvents();
    } catch {
      toast('Ошибка');
    }
  }, [refetchEvents, toast]);

  const handleAction = useCallback((event: AssistantEvent) => {
    switch (event.action_type) {
      case 'open_chat':
        onNavigate('project', { id: projectId, tab: 'chat' });
        break;
      case 'open_section':
        onNavigate('project', { id: projectId, tab: 'supervision' });
        break;
      case 'create_task':
        onNavigate('project', { id: projectId, tab: 'supervision' });
        break;
      default:
        toast(event.action_label || 'Действие');
    }
  }, [projectId, onNavigate, toast]);

  const urgentEvents = (events || []).filter(e => e.priority === 'urgent' || e.priority === 'important');
  const suggestions = (events || []).filter(e => e.event_type === 'suggestion' && e.priority === 'normal');
  const normalEvents = (events || []).filter(e => e.priority === 'normal' && e.event_type !== 'suggestion');

  const today = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720 }}>
      {/* Header */}
      <h3 style={{
        fontFamily: display, fontSize: 20, fontWeight: 700,
        color: 'rgb(var(--ink))', marginBottom: 4, textTransform: 'uppercase' as const,
      }}>
        Ассистент
      </h3>
      <p style={{
        fontFamily: mono, fontSize: 9, color: 'rgb(var(--ink))',
        opacity: 0.5, marginBottom: 24, textTransform: 'uppercase',
        letterSpacing: '0.12em',
      }}>
        {today}
      </p>

      {/* ══════ REQUIRES ATTENTION ══════ */}
      {urgentEvents.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h4 style={{
            fontFamily: mono, fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'rgb(var(--ink))', marginBottom: 8,
          }}>
            Требует внимания
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {urgentEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onDismiss={handleDismiss}
                onAction={handleAction}
              />
            ))}
          </div>
        </section>
      )}

      {/* ══════ UPCOMING TIMELINE ══════ */}
      <section style={{ marginBottom: 24 }}>
        <h4 style={{
          fontFamily: mono, fontSize: 9, textTransform: 'uppercase',
          letterSpacing: '0.14em', color: 'rgb(var(--ink))', marginBottom: 8,
        }}>
          Ближайшие события
        </h4>

        {timelineLoading ? (
          <div style={{ fontFamily: mono, fontSize: 9, color: 'rgb(var(--ink))' }}>Загрузка...</div>
        ) : (!timeline || timeline.length === 0) ? (
          <div style={{
            background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))',
            padding: 16, fontFamily: mono, fontSize: 10, color: 'rgb(var(--ink))',
          }}>
            Нет событий на ближайшие 2 недели
          </div>
        ) : (
          <div style={{
            background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))',
            padding: '12px 16px',
          }}>
            {timeline.map((item, idx) => {
              const days = daysUntil(item.date);
              const isSoon = days <= 3;
              return (
                <div key={`${item.type}-${item.id}`} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '8px 0',
                  borderBottom: idx < timeline.length - 1 ? '0.5px solid rgb(var(--line))' : 'none',
                }}>
                  {/* Dot */}
                  <div style={{
                    width: 8, height: 8, marginTop: 3, flexShrink: 0,
                    background: isSoon ? 'rgb(var(--ink))' : 'rgb(var(--line))',
                  }} />
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: mono, fontSize: 10, color: 'rgb(var(--ink))',
                      fontWeight: isSoon ? 600 : 400,
                    }}>
                      {item.title}
                    </div>
                    <div style={{
                      fontFamily: mono, fontSize: 8, color: 'rgb(var(--ink))',
                      opacity: 0.5, marginTop: 2,
                    }}>
                      {formatDate(item.date)}
                      {item.type === 'visit' && ' · визит'}
                      {item.type === 'stage' && ' · этап'}
                      {item.type === 'payment' && ' · оплата'}
                    </div>
                  </div>
                  {/* Badge */}
                  <span style={{
                    fontFamily: mono, fontSize: 7, textTransform: 'uppercase',
                    letterSpacing: '0.1em', padding: '2px 6px', flexShrink: 0,
                    background: isSoon ? 'rgb(var(--ink))' : 'transparent',
                    color: isSoon ? 'rgb(var(--srf))' : 'rgb(var(--ink))',
                    border: isSoon ? 'none' : '0.5px solid rgb(var(--line))',
                  }}>
                    {days === 0 ? 'Сегодня' : days === 1 ? 'Завтра' : `${days} дн`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ══════ NORMAL EVENTS ══════ */}
      {normalEvents.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h4 style={{
            fontFamily: mono, fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'rgb(var(--ink))', marginBottom: 8,
          }}>
            Информация
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {normalEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onDismiss={handleDismiss}
                onAction={handleAction}
              />
            ))}
          </div>
        </section>
      )}

      {/* ══════ SUGGESTIONS ══════ */}
      {suggestions.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h4 style={{
            fontFamily: mono, fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'rgb(var(--ink))', marginBottom: 8,
          }}>
            Предложения
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {suggestions.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onDismiss={handleDismiss}
                onAction={handleAction}
              />
            ))}
          </div>
        </section>
      )}

      {/* ══════ EMPTY STATE ══════ */}
      {!eventsLoading && urgentEvents.length === 0 && normalEvents.length === 0 && suggestions.length === 0 && (
        <div style={{
          background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))',
          padding: 32, textAlign: 'center',
        }}>
          <div style={{
            fontFamily: display, fontSize: 16, fontWeight: 700,
            color: 'rgb(var(--ink))', marginBottom: 8,
          }}>
            Всё под контролем
          </div>
          <div style={{
            fontFamily: mono, fontSize: 10, color: 'rgb(var(--ink))', opacity: 0.5,
          }}>
            Нет активных уведомлений. Анализ обновляется автоматически.
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// Event Card
// ════════════════════════════════════════════

function EventCard({
  event,
  onDismiss,
  onAction,
}: {
  event: AssistantEvent;
  onDismiss: (id: string) => void;
  onAction: (event: AssistantEvent) => void;
}) {
  const isUrgent = event.priority === 'urgent' || event.priority === 'important';

  return (
    <div style={{
      background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: isUrgent ? 'rgb(var(--ink))' : 'transparent',
        borderBottom: isUrgent ? 'none' : '0.5px solid rgb(var(--line))',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          fontWeight: 600,
          color: isUrgent ? 'rgb(var(--srf))' : 'rgb(var(--ink))',
        }}>
          {event.title}
        </span>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 7,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          padding: '1px 6px',
          background: isUrgent ? 'rgb(var(--srf))' : 'rgb(var(--line))',
          color: isUrgent ? 'rgb(var(--ink))' : 'rgb(var(--ink))',
        }}>
          {PRIORITY_LABEL[event.priority] || event.priority}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px' }}>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          color: 'rgb(var(--ink))', lineHeight: 1.5, marginBottom: 12,
        }}>
          {event.description}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          {event.action_label && (
            <button
              onClick={() => onAction(event)}
              style={{
                padding: '6px 12px',
                background: 'rgb(var(--ink))', color: 'rgb(var(--srf))',
                border: 'none', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {event.action_label}
            </button>
          )}
          <button
            onClick={() => onDismiss(event.id)}
            style={{
              padding: '6px 12px',
              background: 'transparent', color: 'rgb(var(--ink))',
              border: '0.5px solid rgb(var(--line))', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}
          >
            Отложить
          </button>
        </div>
      </div>
    </div>
  );
}
