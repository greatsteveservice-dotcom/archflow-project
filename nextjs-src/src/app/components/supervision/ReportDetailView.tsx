'use client';
import { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import type { VisitReport, VisitRemarkWithDetails, ReportStatus, RemarkStatus, ProjectMemberWithProfile, ContractorTask, TaskStatus } from '../../lib/types';
import { useVisitRemarks } from '../../lib/hooks';
import {
  fetchVisitReport,
  updateVisitReport,
  createVisitRemark,
  updateVisitRemark,
  deleteVisitRemark,
  createRemarkComment,
  fetchRemarkTasks,
  createContractorTask,
} from '../../lib/queries';

// ─── Status config ───────────────────────────────────────
const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  draft: 'Черновик',
  filled: 'Заполнен',
  published: 'Опубликован',
};

const REPORT_STATUS_STYLE: Record<ReportStatus, { border: string; color: string }> = {
  draft: { border: '#EBEBEB', color: '#111' },
  filled: { border: '#EBEBEB', color: '#111' },
  published: { border: '#111', color: '#111' },
};

const REMARK_STATUS_LABEL: Record<RemarkStatus, string> = {
  open: 'Открыто',
  in_progress: 'В работе',
  resolved: 'Решено',
};

const REMARK_STATUS_STYLE: Record<RemarkStatus, { bg: string; color: string }> = {
  open: { bg: '#111', color: '#FFF' },
  in_progress: { bg: '#F6F6F4', color: '#111' },
  resolved: { bg: '#F6F6F4', color: '#111' },
};

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Открыта',
  in_progress: 'В работе',
  done: 'Выполнена',
};

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function formatReportDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Component ───────────────────────────────────────────
interface ReportDetailViewProps {
  reportId: string;
  projectId: string;
  toast: (msg: string) => void;
  onBack: () => void;
  members?: ProjectMemberWithProfile[];
}

export default function ReportDetailView({ reportId, projectId, toast, onBack, members = [] }: ReportDetailViewProps) {
  const [report, setReport] = useState<VisitReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const { data: remarks, loading: loadingRemarks, refetch: refetchRemarks } = useVisitRemarks(reportId);

  // Edit state
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  // New remark form
  const [showNewRemark, setShowNewRemark] = useState(false);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [newRemarkDeadline, setNewRemarkDeadline] = useState('');
  const [newRemarkAssignee, setNewRemarkAssignee] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);

  // Inline comment form
  const [commentingOnRemark, setCommentingOnRemark] = useState<string | null>(null);
  const [remarkCommentText, setRemarkCommentText] = useState('');

  // Load report
  useEffect(() => {
    setLoadingReport(true);
    fetchVisitReport(reportId)
      .then(r => {
        setReport(r);
        setComment(r?.general_comment || '');
      })
      .catch(() => toast('Ошибка загрузки отчёта'))
      .finally(() => setLoadingReport(false));
  }, [reportId, toast]);

  // ─── Handlers ──────────────────────────────────────────

  const handleSaveComment = async () => {
    if (!report) return;
    setSaving(true);
    try {
      const updated = await updateVisitReport(reportId, { general_comment: comment || null });
      setReport(updated);
      toast('Сохранено');
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: ReportStatus) => {
    if (!report) return;
    setSaving(true);
    try {
      const updated = await updateVisitReport(reportId, { status: newStatus });
      setReport(updated);
      toast(newStatus === 'published' ? 'Отчёт опубликован' : 'Статус обновлён');
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRemark = async () => {
    if (!newRemarkText.trim()) return;
    setAddingRemark(true);
    try {
      await createVisitRemark({
        report_id: reportId,
        project_id: projectId,
        text: newRemarkText.trim(),
        deadline: newRemarkDeadline || undefined,
        assigned_to: newRemarkAssignee || undefined,
      });
      setNewRemarkText('');
      setNewRemarkDeadline('');
      setNewRemarkAssignee('');
      setShowNewRemark(false);
      refetchRemarks();
      toast('Замечание добавлено');
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    } finally {
      setAddingRemark(false);
    }
  };

  const handleRemarkStatusChange = async (remarkId: string, newStatus: RemarkStatus) => {
    try {
      await updateVisitRemark(remarkId, { status: newStatus });
      refetchRemarks();
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    }
  };

  const handleDeleteRemark = async (remarkId: string) => {
    try {
      await deleteVisitRemark(remarkId);
      refetchRemarks();
      toast('Замечание удалено');
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    }
  };

  const handleAddComment = async (remarkId: string) => {
    if (!remarkCommentText.trim()) return;
    try {
      await createRemarkComment({
        remark_id: remarkId,
        project_id: projectId,
        text: remarkCommentText.trim(),
      });
      setRemarkCommentText('');
      setCommentingOnRemark(null);
      refetchRemarks();
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    }
  };

  // ─── Render ────────────────────────────────────────────

  if (loadingReport) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: '#111' }}>
        Загрузка...
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: '#111' }}>
        Отчёт не найден
      </div>
    );
  }

  const st = REPORT_STATUS_STYLE[report.status];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: 28,
          color: '#111',
          margin: 0,
          marginBottom: 8,
        }}>
          {formatReportDate(report.visit_date)}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Status chip */}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--af-fs-9)',
            padding: '2px 8px',
            border: `1px solid ${st.border}`,
            color: st.color,
          }}>
            {REPORT_STATUS_LABEL[report.status]}
          </span>

          {/* Status actions */}
          {report.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('filled')}
              disabled={saving}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--af-fs-9)',
                padding: '2px 8px',
                background: '#111',
                color: '#FFF',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Заполнен →
            </button>
          )}
          {report.status === 'filled' && (
            <button
              onClick={() => handleStatusChange('published')}
              disabled={saving}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--af-fs-9)',
                padding: '2px 8px',
                background: '#111',
                color: '#FFF',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Опубликовать →
            </button>
          )}
        </div>
      </div>

      {/* General comment */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--af-fs-8)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#111',
          marginBottom: 6,
        }}>
          Общий комментарий
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Краткое описание визита..."
          rows={3}
          style={{
            width: '100%',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--af-fs-11)',
            padding: '10px 12px',
            border: '0.5px solid #EBEBEB',
            background: '#FFF',
            color: '#111',
            resize: 'vertical',
            outline: 'none',
            borderRadius: 0,
          }}
        />
        {comment !== (report.general_comment || '') && (
          <button
            onClick={handleSaveComment}
            disabled={saving}
            style={{
              marginTop: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--af-fs-9)',
              padding: '4px 12px',
              background: '#111',
              color: '#FFF',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {saving ? '...' : 'Сохранить'}
          </button>
        )}
      </div>

      {/* Remarks section */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--af-fs-8)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#111',
          }}>
            Замечания {remarks ? `(${remarks.length})` : ''}
          </div>
          <button
            onClick={() => setShowNewRemark(!showNewRemark)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--af-fs-9)',
              color: '#111',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icons.Plus className="w-3 h-3" />
            Добавить
          </button>
        </div>

        {/* New remark form */}
        {showNewRemark && (
          <div style={{
            padding: '12px',
            background: '#F6F6F4',
            marginBottom: 8,
          }}>
            <textarea
              value={newRemarkText}
              onChange={e => setNewRemarkText(e.target.value)}
              placeholder="Текст замечания..."
              rows={2}
              autoFocus
              style={{
                width: '100%',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--af-fs-11)',
                padding: '8px',
                border: '0.5px solid #EBEBEB',
                background: '#FFF',
                color: '#111',
                resize: 'vertical',
                outline: 'none',
                borderRadius: 0,
                marginBottom: 8,
              }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={newRemarkDeadline}
                onChange={e => setNewRemarkDeadline(e.target.value)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--af-fs-10)',
                  padding: '4px 8px',
                  border: '0.5px solid #EBEBEB',
                  background: '#FFF',
                  borderRadius: 0,
                  color: '#111',
                }}
                title="Дедлайн"
              />
              {members.length > 0 && (
                <select
                  value={newRemarkAssignee}
                  onChange={e => setNewRemarkAssignee(e.target.value)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--af-fs-10)',
                    padding: '4px 8px',
                    border: '0.5px solid #EBEBEB',
                    background: '#FFF',
                    borderRadius: 0,
                    color: '#111',
                  }}
                >
                  <option value="">Ответственный</option>
                  {members.map(m => (
                    <option key={m.user_id || m.id} value={m.user_id || ''}>
                      {m.profile?.full_name || m.profile?.email || 'Участник'}
                    </option>
                  ))}
                </select>
              )}
              <div style={{ flex: 1 }} />
              <button
                onClick={() => { setShowNewRemark(false); setNewRemarkText(''); }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-9)', color: '#111', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button
                onClick={handleAddRemark}
                disabled={addingRemark || !newRemarkText.trim()}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--af-fs-9)',
                  padding: '4px 12px',
                  background: '#111',
                  color: '#FFF',
                  border: 'none',
                  cursor: addingRemark ? 'wait' : 'pointer',
                  opacity: addingRemark || !newRemarkText.trim() ? 0.5 : 1,
                }}
              >
                {addingRemark ? '...' : 'Добавить →'}
              </button>
            </div>
          </div>
        )}

        {/* Remarks list */}
        {loadingRemarks ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: '#111' }}>
            Загрузка...
          </div>
        ) : (remarks || []).length === 0 ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: '#111', padding: '16px 0' }}>
            Замечаний нет
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(remarks || []).map(remark => (
              <RemarkRow
                key={remark.id}
                remark={remark}
                projectId={projectId}
                members={members}
                toast={toast}
                onStatusChange={handleRemarkStatusChange}
                onDelete={handleDeleteRemark}
                isCommenting={commentingOnRemark === remark.id}
                onToggleComment={() => {
                  setCommentingOnRemark(commentingOnRemark === remark.id ? null : remark.id);
                  setRemarkCommentText('');
                }}
                commentText={remarkCommentText}
                onCommentTextChange={setRemarkCommentText}
                onSubmitComment={() => handleAddComment(remark.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Remark Row ──────────────────────────────────────────

function RemarkRow({
  remark,
  projectId,
  members,
  toast,
  onStatusChange,
  onDelete,
  isCommenting,
  onToggleComment,
  commentText,
  onCommentTextChange,
  onSubmitComment,
}: {
  remark: VisitRemarkWithDetails;
  projectId: string;
  members: ProjectMemberWithProfile[];
  toast: (msg: string) => void;
  onStatusChange: (remarkId: string, status: RemarkStatus) => void;
  onDelete: (remarkId: string) => void;
  isCommenting: boolean;
  onToggleComment: () => void;
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onSubmitComment: () => void;
}) {
  const [linkedTasks, setLinkedTasks] = useState<ContractorTask[]>([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Load linked tasks
  useEffect(() => {
    fetchRemarkTasks(remark.id).then(setLinkedTasks).catch(() => {});
  }, [remark.id]);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !newTaskAssignee) return;
    setCreatingTask(true);
    try {
      await createContractorTask({
        project_id: projectId,
        title: newTaskTitle.trim(),
        assigned_to: newTaskAssignee,
        remark_id: remark.id,
      });
      setNewTaskTitle('');
      setNewTaskAssignee('');
      setShowCreateTask(false);
      const tasks = await fetchRemarkTasks(remark.id);
      setLinkedTasks(tasks);
      toast('Задача создана');
    } catch (err: any) {
      toast(err.message || 'Ошибка');
    } finally {
      setCreatingTask(false);
    }
  };

  const rs = REMARK_STATUS_STYLE[remark.status];
  const nextStatus: RemarkStatus | null =
    remark.status === 'open' ? 'in_progress' :
    remark.status === 'in_progress' ? 'resolved' : null;

  const contractors = members.filter(m => m.role === 'contractor');

  return (
    <div style={{
      background: '#FFF',
      borderBottom: '0.5px solid #EBEBEB',
    }}>
      {/* Main row */}
      <div className="group" style={{
        padding: '10px 12px',
        display: 'flex',
        gap: 10,
      }}>
        {/* Number */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--af-fs-10)',
          color: '#111',
          minWidth: 20,
          paddingTop: 1,
        }}>
          {String(remark.number).padStart(2, '0')}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--af-fs-11)',
            color: '#111',
            lineHeight: 1.5,
          }}>
            {remark.text}
          </div>

          {/* Meta */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 4,
            flexWrap: 'wrap',
          }}>
            {/* Status chip */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--af-fs-8)',
              padding: '1px 6px',
              background: rs.bg,
              color: rs.color,
            }}>
              {REMARK_STATUS_LABEL[remark.status]}
            </span>

            {/* Advance status */}
            {nextStatus && (
              <button
                onClick={() => onStatusChange(remark.id, nextStatus)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--af-fs-8)',
                  color: '#111',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                → {REMARK_STATUS_LABEL[nextStatus]}
              </button>
            )}

            {/* Assignee */}
            {remark.assignee && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-8)', color: '#111' }}>
                {remark.assignee.full_name}
              </span>
            )}

            {/* Deadline */}
            {remark.deadline && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-8)', color: '#111' }}>
                до {remark.deadline}
              </span>
            )}

            {/* Comment count */}
            {remark.comments.length > 0 && (
              <button
                onClick={onToggleComment}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--af-fs-8)',
                  color: '#111',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                💬 {remark.comments.length}
              </button>
            )}

            {/* Add comment */}
            {remark.comments.length === 0 && (
              <button
                onClick={onToggleComment}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--af-fs-8)',
                  color: '#111',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                + комментарий
              </button>
            )}

            <div style={{ flex: 1 }} />

            {/* Delete */}
            <button
              onClick={() => onDelete(remark.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                fontSize: 'var(--af-fs-12)',
                color: '#111',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 2px',
              }}
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* Comments section */}
      {isCommenting && (
        <div style={{ padding: '0 12px 10px 42px' }}>
          {/* Existing comments */}
          {remark.comments.map(c => (
            <div key={c.id} style={{
              padding: '6px 0',
              borderTop: '0.5px solid #EBEBEB',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--af-fs-10)',
                color: '#111',
                lineHeight: 1.5,
              }}>
                {c.text}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--af-fs-8)',
                color: '#111',
                marginTop: 2,
              }}>
                {c.author?.full_name || 'Автор'} · {new Date(c.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ))}

          {/* New comment input */}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input
              type="text"
              value={commentText}
              onChange={e => onCommentTextChange(e.target.value)}
              placeholder="Комментарий..."
              autoFocus
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--af-fs-10)',
                padding: '4px 8px',
                border: '0.5px solid #EBEBEB',
                background: '#F6F6F4',
                color: '#111',
                outline: 'none',
                borderRadius: 0,
              }}
              onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) onSubmitComment(); }}
            />
            <button
              onClick={onSubmitComment}
              disabled={!commentText.trim()}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--af-fs-9)',
                padding: '4px 10px',
                background: '#111',
                color: '#FFF',
                border: 'none',
                cursor: 'pointer',
                opacity: !commentText.trim() ? 0.4 : 1,
              }}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Linked tasks */}
      {(linkedTasks.length > 0 || true) && (
        <div style={{ padding: '0 12px 8px 42px' }}>
          {linkedTasks.map(task => (
            <div key={task.id} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--af-fs-8)',
              color: '#111',
              padding: '2px 0',
            }}>
              → {task.title} · {TASK_STATUS_LABEL[task.status]}
            </div>
          ))}

          {!showCreateTask && (
            <button
              onClick={() => setShowCreateTask(true)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--af-fs-8)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#111',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 0',
              }}
            >
              + Создать задачу
            </button>
          )}

          {showCreateTask && (
            <div style={{
              marginTop: 4,
              padding: 8,
              background: '#F6F6F4',
            }}>
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Название задачи..."
                autoFocus
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--af-fs-10)',
                  padding: '4px 8px',
                  border: '0.5px solid #EBEBEB',
                  background: '#FFF',
                  color: '#111',
                  outline: 'none',
                  borderRadius: 0,
                  marginBottom: 6,
                }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {contractors.length > 0 && (
                  <select
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--af-fs-10)',
                      padding: '3px 6px',
                      border: '0.5px solid #EBEBEB',
                      background: '#FFF',
                      borderRadius: 0,
                      color: '#111',
                    }}
                  >
                    <option value="">Исполнитель</option>
                    {contractors.map(m => (
                      <option key={m.user_id || m.id} value={m.user_id || ''}>
                        {m.profile?.full_name || m.profile?.email || 'Подрядчик'}
                      </option>
                    ))}
                  </select>
                )}
                {contractors.length === 0 && members.length > 0 && (
                  <select
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--af-fs-10)',
                      padding: '3px 6px',
                      border: '0.5px solid #EBEBEB',
                      background: '#FFF',
                      borderRadius: 0,
                      color: '#111',
                    }}
                  >
                    <option value="">Исполнитель</option>
                    {members.map(m => (
                      <option key={m.user_id || m.id} value={m.user_id || ''}>
                        {m.profile?.full_name || m.profile?.email || 'Участник'}
                      </option>
                    ))}
                  </select>
                )}
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => { setShowCreateTask(false); setNewTaskTitle(''); setNewTaskAssignee(''); }}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-8)', color: '#111', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={creatingTask || !newTaskTitle.trim() || !newTaskAssignee}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--af-fs-8)',
                    padding: '3px 8px',
                    background: '#111',
                    color: '#FFF',
                    border: 'none',
                    cursor: creatingTask ? 'wait' : 'pointer',
                    opacity: creatingTask || !newTaskTitle.trim() || !newTaskAssignee ? 0.5 : 1,
                  }}
                >
                  {creatingTask ? '...' : 'Создать →'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
