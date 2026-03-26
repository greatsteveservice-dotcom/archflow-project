'use client';
import { useState, useMemo } from 'react';
import { Icons } from '../Icons';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import type { Task, TaskStatus } from '../../lib/types';
import { useProjectTasks } from '../../lib/hooks';
import { createTask, updateTaskStatus, deleteTask } from '../../lib/queries';

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  open: { label: 'Открыта', bg: 'bg-warn-bg', text: 'text-warn' },
  in_progress: { label: 'В работе', bg: 'bg-info-bg', text: 'text-info' },
  done: { label: 'Выполнена', bg: 'bg-ok-bg', text: 'text-ok' },
};

interface TasksViewProps {
  projectId: string;
  toast: (msg: string) => void;
  canManageTasks?: boolean;
}

export default function TasksView({ projectId, toast, canManageTasks = true }: TasksViewProps) {
  const { data: tasks, loading, refetch } = useProjectTasks(projectId);
  const [showModal, setShowModal] = useState(false);
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tDue, setTDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      await createTask({ project_id: projectId, title: tTitle.trim(), description: tDesc || undefined, due_date: tDue || undefined });
      toast('Задача создана');
      refetch();
      setShowModal(false);
      setTTitle(''); setTDesc(''); setTDue('');
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

  const renderColumn = (title: string, items: Task[], status: TaskStatus) => (
    <div className="flex-1 min-w-[240px]">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].bg.replace('bg-', 'bg-')}`}
          style={{ backgroundColor: status === 'open' ? '#D97706' : status === 'in_progress' ? '#2563EB' : '#16A34A' }} />
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
                <div className="flex items-center gap-2 mt-1.5">
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
                </div>
              </div>
              {canManageTasks && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {status !== 'done' && (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-ok-bg text-ink-faint hover:text-ok transition-all"
                      onClick={() => handleStatusChange(task.id, status === 'open' ? 'in_progress' : 'done')}
                      title={status === 'open' ? 'В работу' : 'Готово'}
                    >
                      <Icons.Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {status === 'done' && (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-warn-bg text-ink-faint hover:text-warn transition-all"
                      onClick={() => handleStatusChange(task.id, 'open')}
                      title="Вернуть"
                    >
                      <Icons.Undo className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-err-bg text-ink-faint hover:text-err transition-all"
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
