'use client';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Icons } from '../Icons';
import type { ContractorTaskWithDetails, TaskStatus, ProjectMemberWithProfile } from '../../lib/types';
import { useContractorTasks } from '../../lib/hooks';
import { createContractorTask, updateContractorTask, deleteContractorTask } from '../../lib/queries';

// ─── Status config ───────────────────────────────────────
const STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Открыта',
  in_progress: 'В работе',
  done: 'Выполнена',
};

const STATUS_BORDER: Record<TaskStatus, string> = {
  open: 'var(--af-border)',
  in_progress: 'var(--af-border)',
  done: 'var(--af-black)',
};

const STATUS_CHIP: Record<TaskStatus, { border: string; color: string }> = {
  open: { border: 'var(--af-border)', color: 'var(--af-black)' },
  in_progress: { border: 'var(--af-border)', color: 'var(--af-black)' },
  done: { border: 'var(--af-black)', color: 'var(--af-black)' },
};

// ─── Component ───────────────────────────────────────────
interface ContractorTasksViewProps {
  projectId: string;
  toast: (msg: string) => void;
  canManageTasks?: boolean;
  members?: ProjectMemberWithProfile[];
  isContractor?: boolean;
}

export default function ContractorTasksView({
  projectId, toast, canManageTasks = true, members = [], isContractor = false,
}: ContractorTasksViewProps) {
  const { data: tasks, loading, refetch } = useContractorTasks(projectId);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cAssignee, setCAssignee] = useState('');
  const [cDeadline, setCDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  const contractors = useMemo(
    () => members.filter(m => m.role === 'contractor'),
    [members]
  );

  const handleCreate = async () => {
    if (!cTitle.trim() || !cAssignee) return;
    setCreating(true);
    try {
      await createContractorTask({
        project_id: projectId,
        title: cTitle.trim(),
        description: cDesc || undefined,
        assigned_to: cAssignee,
        deadline: cDeadline || undefined,
      });
      toast('Задача создана');
      setCTitle(''); setCDesc(''); setCAssignee(''); setCDeadline('');
      setShowCreate(false);
      refetch();
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateContractorTask(taskId, {
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      });
      refetch();
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteContractorTask(taskId);
      toast('Задача удалена');
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      refetch();
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    }
  };

  const selectedTask = tasks?.find(t => t.id === selectedTaskId);

  // ─── Task detail view ──────────────────────────────────
  if (selectedTask) {
    return (
      <TaskDetail
        task={selectedTask}
        canManage={canManageTasks}
        isContractor={isContractor}
        onBack={() => setSelectedTaskId(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        toast={toast}
      />
    );
  }

  // ─── Create form view ──────────────────────────────────
  if (showCreate) {
    return (
      <div className="animate-fade-in">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 24, color: 'var(--af-black)', marginBottom: 20 }}>
          Новая задача
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Название *">
            <input
              value={cTitle} onChange={e => setCTitle(e.target.value)}
              placeholder="Проверить плитку в ванной"
              autoFocus
              style={inputStyle}
            />
          </Field>
          <Field label="Описание">
            <textarea
              value={cDesc} onChange={e => setCDesc(e.target.value)}
              placeholder="Подробности задачи..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
          <Field label="Исполнитель *">
            <select value={cAssignee} onChange={e => setCAssignee(e.target.value)} style={inputStyle}>
              <option value="">Выбрать подрядчика</option>
              {contractors.map(m => (
                <option key={m.user_id || m.id} value={m.user_id || ''}>
                  {m.profile?.full_name || m.profile?.email || 'Подрядчик'}
                </option>
              ))}
              {contractors.length === 0 && members.map(m => (
                <option key={m.user_id || m.id} value={m.user_id || ''}>
                  {m.profile?.full_name || m.profile?.email || 'Участник'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Срок">
            <input type="date" value={cDeadline} onChange={e => setCDeadline(e.target.value)} style={inputStyle} />
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => setShowCreate(false)}
              style={{ ...chipBtnStyle, flex: 1, background: 'var(--af-offwhite)', color: 'var(--af-black)' }}
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !cTitle.trim() || !cAssignee}
              style={{ ...chipBtnStyle, flex: 2, background: 'var(--af-black)', color: 'var(--af-white)', opacity: (creating || !cTitle.trim() || !cAssignee) ? 0.4 : 1 }}
            >
              {creating ? '...' : 'Создать задачу →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tasks list ────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 24, color: 'var(--af-black)', margin: 0 }}>
          Задачи
        </h2>
        {canManageTasks && !isContractor && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--af-border)', background: 'var(--af-white)', cursor: 'pointer',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--af-black)'; e.currentTarget.style.color = 'var(--af-white)'; e.currentTarget.style.borderColor = 'var(--af-black)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--af-white)'; e.currentTarget.style.color = 'var(--af-black)'; e.currentTarget.style.borderColor = 'var(--af-border)'; }}
          >
            <Icons.Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: 'var(--af-black)' }}>Загрузка...</div>
      ) : (tasks || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: 'var(--af-black)' }}>Задач пока нет</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(tasks || []).map(task => {
            const sc = STATUS_CHIP[task.status];
            return (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                style={{
                  height: 72,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 16px',
                  background: 'var(--af-white)',
                  borderBottom: '0.5px solid var(--af-border)',
                  borderLeft: `2px solid ${STATUS_BORDER[task.status]}`,
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--af-offwhite)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--af-white)'; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--af-black)' }}>
                    {task.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    {task.assignee && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-7)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--af-black)' }}>
                        → {task.assignee.full_name}
                      </span>
                    )}
                    {task.deadline && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-7)', color: 'var(--af-black)' }}>
                        до {formatShortDate(task.deadline)}
                      </span>
                    )}
                    {task.remark_number && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-7)', color: 'var(--af-black)' }}>
                        ← Замечание {String(task.remark_number).padStart(2, '0')}{task.remark_date ? ` · ${formatShortDate(task.remark_date)}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-9)',
                    padding: '2px 8px', border: `1px solid ${sc.border}`, color: sc.color,
                  }}>
                    {STATUS_LABEL[task.status]}
                  </span>
                  <span style={{ color: 'var(--af-border)', fontSize: 14 }}>→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Task Detail ─────────────────────────────────────────

function TaskDetail({
  task, canManage, isContractor, onBack, onStatusChange, onDelete, toast,
}: {
  task: ContractorTaskWithDetails;
  canManage: boolean;
  isContractor: boolean;
  onBack: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  toast: (msg: string) => void;
}) {
  const statuses: TaskStatus[] = ['open', 'in_progress', 'done'];

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 24, color: 'var(--af-black)', marginBottom: 16 }}>
        {task.title}
      </h2>

      {task.description && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: 'var(--af-black)', lineHeight: 1.6, marginBottom: 16 }}>
          {task.description}
        </p>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {task.assignee && (
          <MetaRow label="Исполнитель" value={task.assignee.full_name || ''} />
        )}
        {task.deadline && (
          <MetaRow label="Срок" value={formatShortDate(task.deadline)} />
        )}
        {task.remark_number && (
          <MetaRow label="Замечание" value={`#${String(task.remark_number).padStart(2, '0')}${task.remark_date ? ` от ${formatShortDate(task.remark_date)}` : ''}`} />
        )}
      </div>

      {/* Photos */}
      {task.photos && task.photos.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-8)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--af-black)', marginBottom: 8 }}>
            Фото
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {task.photos.map((url, i) => (
              <div key={i} style={{ aspectRatio: '3/4', background: 'var(--af-offwhite)', overflow: 'hidden', position: 'relative' }}>
                <Image src={url} alt="" fill sizes="33vw" style={{ objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status controls */}
      {canManage && !isContractor && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-8)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--af-black)', marginBottom: 8 }}>
            Статус
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(task.id, s)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-9)',
                  padding: '4px 12px',
                  background: task.status === s ? 'var(--af-black)' : 'var(--af-offwhite)',
                  color: task.status === s ? 'var(--af-white)' : 'var(--af-black)',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contractor: single button to mark done */}
      {isContractor && task.status !== 'done' && (
        <button
          onClick={() => onStatusChange(task.id, 'done')}
          style={{
            width: '100%',
            fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)',
            padding: '12px',
            background: 'var(--af-black)', color: 'var(--af-white)',
            border: 'none', cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          Отметить выполненной →
        </button>
      )}

      {isContractor && task.status === 'done' && task.completed_at && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: 'var(--af-black)',
          padding: '12px', background: 'var(--af-offwhite)', marginBottom: 20,
          textAlign: 'center',
        }}>
          Выполнено {new Date(task.completed_at).toLocaleDateString('ru-RU')}
        </div>
      )}

      {/* Delete (owner/team only) */}
      {canManage && !isContractor && (
        <button
          onClick={() => { onDelete(task.id); onBack(); }}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-9)',
            color: 'var(--af-black)', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0,
          }}
        >
          Удалить задачу
        </button>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-8)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--af-black)', minWidth: 80 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: 'var(--af-black)' }}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-8)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--af-black)', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--af-fs-11)',
  padding: '8px 10px',
  border: '0.5px solid var(--af-border)',
  background: 'var(--af-white)',
  color: 'var(--af-black)',
  outline: 'none',
  borderRadius: 0,
};

const chipBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--af-fs-11)',
  padding: '10px',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'center',
};
