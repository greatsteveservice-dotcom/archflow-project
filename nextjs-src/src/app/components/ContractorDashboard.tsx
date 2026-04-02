'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { ContractorTaskWithDetails, TaskStatus } from '../lib/types';
import { useMyContractorTasks } from '../lib/hooks';
import { updateContractorTask } from '../lib/queries';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

// ─── Status config ───────────────────────────────────────
const STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Новая',
  in_progress: 'В работе',
  done: 'Выполнена',
};

const STATUS_BORDER: Record<TaskStatus, string> = {
  open: '#EBEBEB',
  in_progress: '#EBEBEB',
  done: '#111',
};

const STATUS_CHIP: Record<TaskStatus, { border: string; color: string }> = {
  open: { border: '#EBEBEB', color: '#111' },
  in_progress: { border: '#EBEBEB', color: '#111' },
  done: { border: '#111', color: '#111' },
};

const SECTION_CONFIG: { status: TaskStatus; label: string }[] = [
  { status: 'open', label: 'Новые' },
  { status: 'in_progress', label: 'В работе' },
  { status: 'done', label: 'Выполнено' },
];

// ─── Props ───────────────────────────────────────────────

interface ContractorDashboardProps {
  onNavigate: (page: string, ctx?: any) => void;
  toast: (msg: string) => void;
}

// ─── Component ───────────────────────────────────────────

export default function ContractorDashboard({ onNavigate, toast }: ContractorDashboardProps) {
  const { data: tasks, loading, refetch } = useMyContractorTasks();
  const { signOut } = useAuth();
  const [projectNames, setProjectNames] = useState<Map<string, string>>(new Map());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  // Fetch project names for all unique project_ids
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    const uniqueIds = [...new Set(tasks.map(t => t.project_id))];
    // Only fetch IDs we don't already have
    const missing = uniqueIds.filter(id => !projectNames.has(id));
    if (missing.length === 0) return;

    supabase
      .from('projects')
      .select('id, title')
      .in('id', missing)
      .then(({ data }) => {
        if (data) {
          setProjectNames(prev => {
            const next = new Map(prev);
            data.forEach((p: { id: string; title: string }) => next.set(p.id, p.title));
            return next;
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Group tasks by status
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, ContractorTaskWithDetails[]> = {
      open: [],
      in_progress: [],
      done: [],
    };
    (tasks || []).forEach(t => {
      map[t.status]?.push(t);
    });
    return map;
  }, [tasks]);

  const totalCount = tasks?.length || 0;
  const openCount = grouped.open.length;
  const inProgressCount = grouped.in_progress.length;
  const doneCount = grouped.done.length;

  // Mark task as done
  const handleMarkDone = useCallback(async (taskId: string) => {
    setCompleting(taskId);
    try {
      await updateContractorTask(taskId, {
        status: 'done',
        completed_at: new Date().toISOString(),
      });
      toast('Задача выполнена');
      refetch();
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    } finally {
      setCompleting(null);
    }
  }, [refetch, toast]);

  // Selected task detail
  const selectedTask = tasks?.find(t => t.id === selectedTaskId);

  // ─── Date string ───────────────────────────────────────
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  // ─── Task detail view ──────────────────────────────────
  if (selectedTask) {
    return (
      <div className="animate-fade-in">
        {/* Back */}
        <button
          onClick={() => setSelectedTaskId(null)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'rgb(var(--ink-muted))',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginBottom: 24,
          }}
        >
          &larr; Назад к задачам
        </button>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: 28,
          color: 'rgb(var(--ink))',
          lineHeight: 1.1,
          marginBottom: 8,
        }}>
          {selectedTask.title}
        </h1>

        {/* Project name */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'rgb(var(--ink-muted))',
          marginBottom: 24,
        }}>
          {projectNames.get(selectedTask.project_id) || 'Проект'}
        </div>

        {/* Description */}
        {selectedTask.description && (
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'rgb(var(--ink-secondary))',
            lineHeight: 1.6,
            marginBottom: 20,
          }}>
            {selectedTask.description}
          </p>
        )}

        {/* Meta rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
          <MetaRow label="Статус" value={STATUS_LABEL[selectedTask.status]} />
          {selectedTask.deadline && (
            <MetaRow label="Срок" value={formatDate(selectedTask.deadline)} />
          )}
          {selectedTask.remark_number && (
            <MetaRow
              label="Замечание"
              value={`#${String(selectedTask.remark_number).padStart(2, '0')}${selectedTask.remark_date ? ` от ${formatDate(selectedTask.remark_date)}` : ''}`}
            />
          )}
          {selectedTask.completed_at && (
            <MetaRow label="Выполнена" value={formatDate(selectedTask.completed_at)} />
          )}
        </div>

        {/* Photos */}
        {selectedTask.photos && selectedTask.photos.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgb(var(--ink-faint))',
              marginBottom: 8,
            }}>
              Фото
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {selectedTask.photos.map((url, i) => (
                <div key={i} style={{ aspectRatio: '3/4', background: 'rgb(var(--srf-secondary))', overflow: 'hidden', position: 'relative' }}>
                  <Image src={url} alt="" fill sizes="33vw" style={{ objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mark done button */}
        {selectedTask.status !== 'done' && (
          <button
            onClick={() => handleMarkDone(selectedTask.id)}
            disabled={completing === selectedTask.id}
            style={{
              width: '100%',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '14px',
              background: 'rgb(var(--ink))',
              color: 'rgb(var(--srf))',
              border: 'none',
              cursor: completing === selectedTask.id ? 'wait' : 'pointer',
              opacity: completing === selectedTask.id ? 0.5 : 1,
              transition: 'opacity 0.12s',
            }}
          >
            {completing === selectedTask.id ? '...' : 'Отметить выполненной \u2192'}
          </button>
        )}

        {/* Completed indicator */}
        {selectedTask.status === 'done' && selectedTask.completed_at && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'rgb(var(--ink-muted))',
            padding: '14px',
            background: 'rgb(var(--srf-secondary))',
            textAlign: 'center',
          }}>
            Выполнено {new Date(selectedTask.completed_at).toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>
    );
  }

  // ─── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-fade-in">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgb(var(--ink-muted))' }}>
          Загрузка...
        </div>
      </div>
    );
  }

  // ─── Empty state ───────────────────────────────────────
  if (totalCount === 0) {
    return (
      <div className="animate-fade-in">
        {/* Header */}
        <div style={{ marginBottom: 48, display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="af-page-title">Мои задачи</h1>
            <p className="af-page-subtitle">0 задач &middot; {dateStr}</p>
          </div>
          <button onClick={signOut} style={logoutBtnStyle}>
            Выйти
          </button>
        </div>
        <div className="af-empty">
          <div className="af-empty-dash">&mdash;</div>
          <div className="af-empty-label">Задач нет &mdash; отличная работа!</div>
        </div>
      </div>
    );
  }

  // ─── Main task list ────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="af-page-title">Мои задачи</h1>
          <p className="af-page-subtitle">{totalCount} задач &middot; {dateStr}</p>
        </div>
        <button onClick={signOut} style={logoutBtnStyle}>
          Выйти
        </button>
      </div>

      {/* Stats bar */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'rgb(var(--ink-muted))',
        marginBottom: 32,
        marginTop: 16,
      }}>
        {openCount} новых &middot; {inProgressCount} в работе &middot; {doneCount} выполнено
      </div>

      {/* Task sections */}
      {SECTION_CONFIG.map(({ status, label }) => {
        const sectionTasks = grouped[status];
        if (sectionTasks.length === 0) return null;

        const isDone = status === 'done';
        const isCollapsed = isDone && doneCollapsed;

        return (
          <div key={status} style={{ marginBottom: 32 }}>
            {/* Section header */}
            <button
              onClick={isDone ? () => setDoneCollapsed(c => !c) : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'rgb(var(--ink-muted))',
                background: 'none',
                border: 'none',
                cursor: isDone ? 'pointer' : 'default',
                padding: 0,
                marginBottom: 8,
              }}
            >
              <span>{label}</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                color: 'rgb(var(--ink-faint))',
              }}>
                ({sectionTasks.length})
              </span>
              {isDone && (
                <span style={{ fontSize: 8, color: 'rgb(var(--ink-faint))' }}>
                  {isCollapsed ? '\u25B6' : '\u25BC'}
                </span>
              )}
            </button>

            {/* Task cards */}
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sectionTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    projectName={projectNames.get(task.project_id)}
                    isDone={isDone}
                    completing={completing === task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    onMarkDone={() => handleMarkDone(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── TaskCard ────────────────────────────────────────────

function TaskCard({
  task,
  projectName,
  isDone,
  completing,
  onClick,
  onMarkDone,
}: {
  task: ContractorTaskWithDetails;
  projectName?: string;
  isDone: boolean;
  completing: boolean;
  onClick: () => void;
  onMarkDone: () => void;
}) {
  const sc = STATUS_CHIP[task.status];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        minHeight: 72,
        background: 'rgb(var(--srf))',
        borderBottom: '0.5px solid rgb(var(--line))',
        borderLeft: `2px solid ${STATUS_BORDER[task.status]}`,
        cursor: 'pointer',
        transition: 'background 0.12s',
        opacity: isDone ? 0.5 : 1,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgb(var(--srf-hover))'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgb(var(--srf))'; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Task title */}
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 14,
          fontWeight: 700,
          color: 'rgb(var(--ink))',
          lineHeight: 1.3,
        }}>
          {task.title}
        </div>
        {/* Meta line */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {projectName && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'rgb(var(--ink-muted))',
            }}>
              {projectName}
            </span>
          )}
          {task.deadline && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: 'rgb(var(--ink-muted))',
            }}>
              до {formatDate(task.deadline)}
            </span>
          )}
        </div>
      </div>

      {/* Right side: done button + status chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
        {!isDone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkDone();
            }}
            disabled={completing}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              padding: '4px 10px',
              background: 'rgb(var(--ink))',
              color: 'rgb(var(--srf))',
              border: 'none',
              cursor: completing ? 'wait' : 'pointer',
              opacity: completing ? 0.4 : 1,
              whiteSpace: 'nowrap',
              transition: 'opacity 0.12s',
            }}
          >
            {completing ? '...' : 'Выполнено \u2192'}
          </button>
        )}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          padding: '2px 8px',
          border: `1px solid ${sc.border}`,
          color: sc.color,
          whiteSpace: 'nowrap',
        }}>
          {STATUS_LABEL[task.status]}
        </span>
      </div>
    </div>
  );
}

// ─── MetaRow ─────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'rgb(var(--ink-muted))',
        minWidth: 80,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'rgb(var(--ink))',
      }}>
        {value}
      </span>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const logoutBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 7,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: '#111',
  cursor: 'pointer',
  padding: '4px 0',
  marginTop: 4,
};
