'use client';
import { useState, useMemo } from 'react';
import { Icons } from '../Icons';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import type { Task, TaskStatus, ProjectMemberWithProfile } from '../../lib/types';
import { useProjectTasks } from '../../lib/hooks';
import { createTask, updateTaskStatus, updateTaskAssignment, deleteTask } from '../../lib/queries';

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  open: { label: 'Открыта', bg: 'bg-srf-secondary', text: 'text-ink' },
  in_progress: { label: 'В работе', bg: 'bg-srf-secondary', text: 'text-ink-secondary' },
  done: { label: 'Выполнена', bg: 'bg-srf-secondary', text: 'text-ink-muted' },
};

interface TasksViewProps {
  projectId: string;
  toast: (msg: string) => void;
  canManageTasks?: boolean;
  members?: ProjectMemberWithProfile[];
}

export default function TasksView({ projectId, toast, canManageTasks = true, members = [] }: TasksViewProps) {
  const { data: tasks, loading, refetch } = useProjectTasks(projectId);
  const [showModal, setShowModal] = useState(false);
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tDue, setTDue] = useState('');
  const [tAssignee, setTAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Build member lookup for display
  const memberMap = useMemo(() => {
    const map = new Map<string, { name: string; initials: string }>();
    members.forEach(m => {
      if (m.profile) {
        const name = m.profile.full_name || m.profile.email || '?';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        map.set(m.user_id, { name, initials });
      }
    });
    return map;
  }, [members]);

  const grouped = useMemo(() => {
    if (!tasks) return { open: [], in_progress: [], done: [] };
    return {
      open: tasks.filter(t => t.status === 'open'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      done: tasks.filter(t => t.status === 'done'),
    };
  }, [tasks]);

  const handleCreate = async () => {
    if (!tTitle.trim()) return;
    setSaving(true);
    try {
      await createTask({
        project_id: projectId,
        title: tTitle.trim(),
        description: tDesc || undefined,
        due_date: tDue || undefined,
        assigned_to: tAssignee || undefined,
      });
      toast('Задача создана');
      refetch();
      setShowModal(false);
      setTTitle(''); setTDesc(''); setTDue(''); setTAssignee('');
    } catch (e: any) {
      toast(e.message || 'Ошибка');
    }
    setSaving(false);
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, status);
      refetch();
    } catch (e: any) {
      toast(e.message || 'Ошибка');
    }
  };

  const handleAssignChange = async (taskId: string, assignedTo: string | null) => {
    try {
      await updateTaskAssignment(taskId, assignedTo);
      refetch();
    } catch (e: any) {
      toast(e.message || 'Ошибка');
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      await deleteTask(taskToDelete.id);
      toast('Задача удалена');
      refetch();
      setTaskToDelete(null);
    } catch (e: any) {
      toast(e.message || 'Ошибка');
    }
    setDeleting(false);
  };

  if (loading) return <div className="text-[13px] text-ink-faint py-4">Загрузка...</div>;

  const renderAssignee = (task: Task) => {
    if (!task.assigned_to) return null;
    const info = memberMap.get(task.assigned_to);
    if (!info) return null;
    return (
      <span className="text-[10px] text-ink-faint flex items-center gap-0.5" title={info.name}>
        <span className="w-3.5 h-3.5 rounded-full bg-srf-secondary flex items-center justify-center text-[7px] font-semibold flex-shrink-0">
          {info.initials}
        </span>
        <span className="truncate max-w-[80px]">{info.name.split(' ')[0]}</span>
      </span>
    );
  };

  const renderColumn = (title: string, items: Task[], status: TaskStatus) => (
    <div className="flex-1 min-w-[240px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2"
          style={{ backgroundColor: status === 'open' ? 'var(--af-black)' : status === 'in_progress' ? 'var(--af-border)' : 'var(--af-border)' }} />
        <h4 className="text-[13px] font-semibold">{title}</h4>
        <span className="text-[11px] text-ink-faint">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map(task => (
          <div key={task.id} className="card p-3 group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{task.title}</div>
                {task.description && <div className="text-[11px] text-ink-muted mt-0.5 line-clamp-2">{task.description}</div>}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {task.due_date && (
                    <span className="text-[10px] text-ink-faint flex items-center gap-0.5">
                      <Icons.Calendar className="w-2.5 h-2.5" /> {task.due_date}
                    </span>
                  )}
                  {task.photo_record_id && (
                    <span className="text-[10px] text-ink-faint flex items-center gap-0.5">
                      <Icons.Camera className="w-2.5 h-2.5" /> Из фото
                    </span>
                  )}
                  {renderAssignee(task)}
                </div>
              </div>
              {canManageTasks && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Assign dropdown */}
                  {members.length > 0 && (
                    <select
                      className="opacity-0 group-hover:opacity-100 text-[10px] bg-srf border border-line rounded cursor-pointer text-ink-faint hover:text-ink transition-all h-6 px-0.5"
                      title="Назначить"
                      value={task.assigned_to || ''}
                      onChange={(e) => handleAssignChange(task.id, e.target.value || null)}
                    >
                      <option value="">—</option>
                      {members.map(m => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  )}
                  {status !== 'done' && (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-srf-secondary text-ink-faint hover:text-ink transition-all"
                      onClick={() => handleStatusChange(task.id, status === 'open' ? 'in_progress' : 'done')}
                      title={status === 'open' ? 'В работу' : 'Готово'}
                    >
                      <Icons.Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {status === 'done' && (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-srf-secondary text-ink-faint hover:text-ink transition-all"
                      onClick={() => handleStatusChange(task.id, 'open')}
                      title="Вернуть"
                    >
                      <Icons.Undo className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-srf-secondary text-ink-faint hover:text-ink transition-all"
                    onClick={() => setTaskToDelete(task)}
                    title="Удалить"
                  >
                    <Icons.Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-[11px] text-ink-faint text-center py-3 border border-dashed border-line rounded-lg">
            Пусто
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icons.List className="w-4 h-4 text-ink-muted" />
          <h3 className="text-[14px] font-semibold">Задачи</h3>
          <span className="text-[11px] text-ink-faint">({tasks?.length || 0})</span>
        </div>
        {canManageTasks && (
          <button className="btn btn-primary text-[12px] py-1.5 px-3" onClick={() => setShowModal(true)}>
            <Icons.Plus className="w-3.5 h-3.5" /> Новая задача
          </button>
        )}
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {renderColumn('Открытые', grouped.open, 'open')}
        {renderColumn('В работе', grouped.in_progress, 'in_progress')}
        {renderColumn('Выполненные', grouped.done, 'done')}
      </div>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Новая задача">
        <div className="space-y-4">
          <div className="modal-field">
            <label>Название *</label>
            <input value={tTitle} onChange={e => setTTitle(e.target.value)} placeholder="Проверить плитку в ванной" />
          </div>
          <div className="modal-field">
            <label>Описание</label>
            <textarea value={tDesc} onChange={e => setTDesc(e.target.value)} placeholder="Необязательно" rows={2} />
          </div>
          {members.length > 0 && (
            <div className="modal-field">
              <label>Исполнитель</label>
              <select value={tAssignee} onChange={e => setTAssignee(e.target.value)}>
                <option value="">Не назначен</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="modal-field">
            <label>Срок</label>
            <input type="date" value={tDue} onChange={e => setTDue(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !tTitle.trim()}>
              {saving ? 'Сохранение...' : 'Создать'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!taskToDelete}
        title="Удалить задачу?"
        message={`Задача «${taskToDelete?.title || ''}» будет удалена.`}
        confirmLabel="Удалить"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
}
