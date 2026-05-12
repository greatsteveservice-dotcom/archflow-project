'use client';
import { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import type { VisitReport, VisitRemarkWithDetails, ReportStatus, RemarkStatus, ProjectMemberWithProfile, ContractorTask, TaskStatus, EmailDeliveryStatus, ReportAttachment } from '../../lib/types';
import { EMAIL_STATUS_CONFIG } from '../../lib/types';
import { useVisitRemarks, useReportEmailSends } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {
  fetchVisitReport,
  updateVisitReport,
  createVisitRemark,
  updateVisitRemark,
  deleteVisitRemark,
  createRemarkComment,
  fetchRemarkTasks,
  createContractorTask,
  uploadReportFile,
  addReportAttachment,
  removeReportAttachment,
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
  canSendReport?: boolean;
  canAcknowledgeReport?: boolean;
}

export default function ReportDetailView({ reportId, projectId, toast, onBack, members = [], canSendReport = false, canAcknowledgeReport = false }: ReportDetailViewProps) {
  const { profile } = useAuth();
  const [report, setReport] = useState<VisitReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const { data: remarks, loading: loadingRemarks, refetch: refetchRemarks } = useVisitRemarks(reportId);
  const { data: emailSends, refetch: refetchSends } = useReportEmailSends(reportId);

  // Send / acknowledge state
  const [sending, setSending] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  // ─── Voice transcription state ───────────────────────────
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceResult, setVoiceResult] = useState<{ generalComment: string; remarks: string[] } | null>(null);
  const [voiceSelectedRemarks, setVoiceSelectedRemarks] = useState<Set<number>>(new Set());
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceCancelledRef = useRef(false);
  const [acknowledging, setAcknowledging] = useState(false);

  // Edit state
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Date edit state
  const [editingDate, setEditingDate] = useState(false);
  const [editDateValue, setEditDateValue] = useState('');

  // New remark form
  const [showNewRemark, setShowNewRemark] = useState(false);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [newRemarkDeadline, setNewRemarkDeadline] = useState('');
  const [newRemarkAssignee, setNewRemarkAssignee] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);

  // Inline comment form
  const [commentingOnRemark, setCommentingOnRemark] = useState<string | null>(null);
  const [remarkCommentText, setRemarkCommentText] = useState('');

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDate = async () => {
    if (!report || !editDateValue) { setEditingDate(false); return; }
    if (editDateValue === report.visit_date) { setEditingDate(false); return; }
    setSaving(true);
    try {
      const updated = await updateVisitReport(reportId, { visit_date: editDateValue });
      setReport(updated);
      setEditingDate(false);
      toast('Дата изменена');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
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
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
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
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setAddingRemark(false);
    }
  };

  // ─── Voice recording → transcribe → structured remarks ─────
  const voiceCleanup = () => {
    if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null; }
    voiceStreamRef.current?.getTracks().forEach(t => t.stop());
    voiceStreamRef.current = null;
    voiceRecorderRef.current = null;
    voiceChunksRef.current = [];
    setVoiceRecording(false);
    setVoiceDuration(0);
    voiceCancelledRef.current = false;
  };

  const startVoiceRecording = async () => {
    if (voiceRecording || voiceProcessing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType });
      voiceRecorderRef.current = mr;
      voiceChunksRef.current = [];
      voiceCancelledRef.current = false;
      mr.ondataavailable = (e) => { if (e.data.size > 0) voiceChunksRef.current.push(e.data); };
      mr.start(250);
      setVoiceRecording(true);
      setVoiceDuration(0);
      let sec = 0;
      voiceTimerRef.current = setInterval(() => { sec++; setVoiceDuration(sec); }, 1000);
    } catch {
      toast('Нет доступа к микрофону');
    }
  };

  const cancelVoiceRecording = () => {
    voiceCancelledRef.current = true;
    const mr = voiceRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = () => voiceCleanup();
      mr.stop();
    } else {
      voiceCleanup();
    }
  };

  const stopAndTranscribe = async () => {
    const mr = voiceRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null; }
    setVoiceRecording(false);
    setVoiceProcessing(true);

    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
    });
    voiceStreamRef.current?.getTracks().forEach(t => t.stop());

    if (voiceCancelledRef.current) {
      voiceCleanup();
      setVoiceProcessing(false);
      return;
    }

    try {
      const mimeType = mr.mimeType || 'audio/webm';
      const blob = new Blob(voiceChunksRef.current, { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const fd = new FormData();
      fd.append('audio', blob, `report-voice.${ext}`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast('Сессия истекла'); return; }
      const res = await fetch('/api/voice/transcribe-report', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        toast(`Не удалось распознать${text ? ': ' + text : ''}`);
        return;
      }
      const data = (await res.json()) as { generalComment: string; remarks: string[] };
      setVoiceResult({ generalComment: data.generalComment || '', remarks: data.remarks || [] });
      setVoiceSelectedRemarks(new Set((data.remarks || []).map((_, i) => i))); // pre-select all
      if (!data.generalComment && (!data.remarks || data.remarks.length === 0)) {
        toast('Ничего не распознано');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка распознавания');
    } finally {
      setVoiceProcessing(false);
      voiceCleanup();
    }
  };

  const applyVoiceResult = async () => {
    if (!voiceResult) return;
    try {
      // Apply general comment (replaces existing — UX: voice — это «новый» комментарий).
      if (voiceResult.generalComment) {
        const newComment = comment.trim()
          ? `${comment.trim()}\n\n${voiceResult.generalComment}`
          : voiceResult.generalComment;
        setComment(newComment);
        await updateVisitReport(reportId, { general_comment: newComment });
      }
      // Create selected remarks one by one.
      const toCreate = voiceResult.remarks.filter((_, i) => voiceSelectedRemarks.has(i));
      for (const text of toCreate) {
        await createVisitRemark({ report_id: reportId, project_id: projectId, text });
      }
      refetchRemarks();
      const parts: string[] = [];
      if (voiceResult.generalComment) parts.push('комментарий');
      if (toCreate.length > 0) parts.push(`${toCreate.length} замеч.`);
      toast(`Применено: ${parts.join(' + ') || 'ничего'}`);
      setVoiceResult(null);
      setVoiceSelectedRemarks(new Set());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка применения');
    }
  };

  const handleRemarkStatusChange = async (remarkId: string, newStatus: RemarkStatus) => {
    try {
      await updateVisitRemark(remarkId, { status: newStatus });
      refetchRemarks();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleDeleteRemark = async (remarkId: string) => {
    try {
      await deleteVisitRemark(remarkId);
      refetchRemarks();
      toast('Замечание удалено');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
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
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleSendToClients = async () => {
    if (!report || report.status !== 'published') return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(`/api/reports/${reportId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Ошибка отправки');
      toast(`Отправлено: ${result.sent} из ${result.total}`);
      refetchSends();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSending(false);
    }
  };

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(`/api/reports/${reportId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Ошибка');
      toast('Отчёт подтверждён');
      refetchSends();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setAcknowledging(false);
    }
  };

  // File upload handlers
  const handleFileUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) { toast('Файл слишком большой (макс. 50 МБ)'); return; }
    setUploadingFile(true);
    try {
      const fileUrl = await uploadReportFile(file, projectId, reportId);
      const updated = await addReportAttachment(reportId, {
        name: file.name,
        file_url: fileUrl,
        size: file.size,
      });
      setReport(updated);
      toast('Файл загружен');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingFile(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleRemoveAttachment = async (fileUrl: string) => {
    try {
      const updated = await removeReportAttachment(reportId, fileUrl);
      setReport(updated);
      toast('Файл удалён');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  // Check if current user already acknowledged
  const myAcknowledgment = emailSends?.find(
    s => s.recipient_user_id === profile?.id && ['confirmed', 'auto_accepted'].includes(s.status)
  );
  const myPendingSend = emailSends?.find(
    s => s.recipient_user_id === profile?.id && !['confirmed', 'auto_accepted', 'bounced'].includes(s.status)
  );

  // ─── Render ────────────────────────────────────────────

  if (loadingReport) {
    return (
      <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)', color: '#111' }}>
        Загрузка...
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)', color: '#111' }}>
        Отчёт не найден
      </div>
    );
  }

  const st = REPORT_STATUS_STYLE[report.status];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        {editingDate && report.status !== 'published' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="date"
              value={editDateValue}
              onChange={e => setEditDateValue(e.target.value)}
              autoFocus
              style={{
                fontFamily: 'var(--af-font-display)',
                fontWeight: 700,
                fontSize: 22,
                color: '#111',
                border: '0.5px solid #111',
                background: '#FFF',
                padding: '4px 8px',
              }}
            />
            <button
              type="button"
              onClick={handleSaveDate}
              disabled={saving}
              style={{
                fontFamily: 'var(--af-font-mono)',
                fontSize: 'var(--af-fs-9)',
                padding: '4px 12px',
                background: '#111',
                color: '#FFF',
                border: 'none',
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setEditingDate(false)}
              disabled={saving}
              style={{
                fontFamily: 'var(--af-font-mono)',
                fontSize: 'var(--af-fs-9)',
                padding: '4px 12px',
                background: 'none',
                color: '#111',
                border: '0.5px solid #EBEBEB',
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
          </div>
        ) : (
          <h2
            onClick={() => {
              if (report.status === 'published') return;
              setEditDateValue(report.visit_date);
              setEditingDate(true);
            }}
            title={report.status !== 'published' ? 'Нажмите, чтобы изменить дату' : undefined}
            style={{
              fontFamily: 'var(--af-font-display)',
              fontWeight: 900,
              fontSize: 28,
              color: '#111',
              margin: 0,
              marginBottom: 8,
              cursor: report.status === 'published' ? 'default' : 'pointer',
              display: 'inline-block',
            }}
          >
            {formatReportDate(report.visit_date)}
          </h2>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Status chip */}
          <span style={{
            fontFamily: 'var(--af-font-mono)',
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
                fontFamily: 'var(--af-font-mono)',
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
                fontFamily: 'var(--af-font-mono)',
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

          {/* Download as PDF — available once the report is filled or published */}
          {(report.status === 'filled' || report.status === 'published') && (
            <button
              onClick={async () => {
                if (downloadingPdf) return;
                setDownloadingPdf(true);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session?.access_token) {
                    toast('Сессия истекла — войдите заново');
                    return;
                  }
                  const res = await fetch(`/api/reports/${reportId}/pdf`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                  });
                  if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    toast(`Не удалось сгенерировать PDF${text ? ': ' + text : ''}`);
                    return;
                  }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `report-${report.visit_date || reportId}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  // Revoke after a tick so the browser actually starts the download.
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Ошибка генерации PDF');
                } finally {
                  setDownloadingPdf(false);
                }
              }}
              disabled={downloadingPdf}
              style={{
                fontFamily: 'var(--af-font-mono)',
                fontSize: 'var(--af-fs-9)',
                padding: '2px 8px',
                background: 'transparent',
                color: '#111',
                border: '1px solid #111',
                cursor: downloadingPdf ? 'wait' : 'pointer',
                opacity: downloadingPdf ? 0.5 : 1,
              }}
            >
              {downloadingPdf ? 'Готовим...' : 'Скачать PDF →'}
            </button>
          )}

          {/* Send to clients button */}
          {report.status === 'published' && canSendReport && (
            <button
              onClick={handleSendToClients}
              disabled={sending}
              style={{
                fontFamily: 'var(--af-font-mono)',
                fontSize: 'var(--af-fs-9)',
                padding: '2px 8px',
                background: 'transparent',
                color: '#111',
                border: '1px solid #111',
                cursor: sending ? 'wait' : 'pointer',
                opacity: sending ? 0.5 : 1,
              }}
            >
              {sending ? 'Отправка...' : 'Отправить клиенту →'}
            </button>
          )}

          {/* Acknowledge button for clients */}
          {report.status === 'published' && canAcknowledgeReport && myPendingSend && !myAcknowledgment && (
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              style={{
                fontFamily: 'var(--af-font-mono)',
                fontSize: 'var(--af-fs-9)',
                padding: '2px 8px',
                background: 'transparent',
                color: '#111',
                border: '1px solid #111',
                cursor: acknowledging ? 'wait' : 'pointer',
                opacity: acknowledging ? 0.5 : 1,
              }}
            >
              {acknowledging ? '...' : 'Ознакомлен'}
            </button>
          )}
          {myAcknowledgment && (
            <span style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 'var(--af-fs-9)',
              padding: '2px 8px',
              color: '#111',
              border: '1px solid #EBEBEB',
            }}>
              Ознакомлен ✓
            </span>
          )}
        </div>
      </div>

      {/* Delivery section */}
      {emailSends && emailSends.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-8)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#111',
            marginBottom: 6,
          }}>
            Доставка
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {emailSends.map(send => {
              const cfg = EMAIL_STATUS_CONFIG[send.status];
              return (
                <div key={send.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: '#FFF',
                  borderBottom: '0.5px solid #EBEBEB',
                }}>
                  <span style={{
                    fontFamily: 'var(--af-font-mono)',
                    fontSize: 'var(--af-fs-10)',
                    color: '#111',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {send.recipient_profile?.full_name || send.recipient_email}
                  </span>
                  <span style={{
                    fontFamily: 'var(--af-font-mono)',
                    fontSize: 'var(--af-fs-8)',
                    padding: '1px 6px',
                    background: cfg.bg,
                    color: cfg.text,
                    whiteSpace: 'nowrap',
                  }}>
                    {cfg.label}
                  </span>
                  {send.delivered_at && (
                    <span style={{
                      fontFamily: 'var(--af-font-mono)',
                      fontSize: 'var(--af-fs-8)',
                      color: '#111',
                      whiteSpace: 'nowrap',
                    }}>
                      {new Date(send.delivered_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Content hash */}
          {emailSends[0]?.content_hash && (
            <div style={{
              marginTop: 8,
              padding: '8px 10px',
              background: '#F6F6F4',
            }}>
              <div style={{
                fontFamily: 'var(--af-font-mono)',
                fontSize: 'var(--af-fs-8)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#111',
                marginBottom: 2,
              }}>
                SHA-256
              </div>
              <div style={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: 'var(--af-fs-9)',
                color: '#111',
                wordBreak: 'break-all',
                lineHeight: 1.4,
              }}>
                {emailSends[0].content_hash}
              </div>
            </div>
          )}
        </div>
      )}

      {/* General comment */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: 'var(--af-font-mono)',
          fontSize: 'var(--af-fs-8)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#111',
          marginBottom: 6,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>Общий комментарий</span>
          {!voiceRecording && !voiceProcessing && (
            <button
              type="button"
              onClick={startVoiceRecording}
              style={{
                fontFamily: 'var(--af-font-mono)',
                fontSize: 9,
                letterSpacing: '0.08em',
                padding: '4px 10px',
                background: '#FFF',
                color: '#111',
                border: '0.5px solid #111',
                cursor: 'pointer',
              }}
              title="Наговорить голосом — распознается и разложится на общий комментарий + замечания"
            >
              🎤 Голос →
            </button>
          )}
          {voiceRecording && (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span style={{
                fontFamily: 'var(--af-font-mono)',
                fontSize: 10,
                color: '#B8862A',
                letterSpacing: '0.08em',
              }}>
                ● ЗАПИСЬ {Math.floor(voiceDuration / 60)}:{String(voiceDuration % 60).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={cancelVoiceRecording}
                style={{ fontFamily: 'var(--af-font-mono)', fontSize: 9, padding: '4px 8px', background: '#FFF', color: '#111', border: '0.5px solid #EBEBEB', cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={stopAndTranscribe}
                style={{ fontFamily: 'var(--af-font-mono)', fontSize: 9, padding: '4px 10px', background: '#111', color: '#FFF', border: 'none', cursor: 'pointer' }}
              >
                Стоп →
              </button>
            </span>
          )}
          {voiceProcessing && (
            <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 10, color: '#666', letterSpacing: '0.08em' }}>
              Распознаём…
            </span>
          )}
        </div>
        <textarea
          value={comment}
          onChange={e => {
            setComment(e.target.value);
            // Auto-grow fallback for browsers without field-sizing
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
          }}
          ref={(el) => {
            if (el) {
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
            }
          }}
          placeholder="Краткое описание визита..."
          rows={3}
          style={{
            width: '100%',
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-11)',
            padding: '10px 12px',
            border: '0.5px solid #EBEBEB',
            background: '#FFF',
            color: '#111',
            resize: 'none',
            outline: 'none',
            borderRadius: 0,
            minHeight: '5em',
            overflow: 'hidden',
            // @ts-ignore — modern CSS for self-sizing
            fieldSizing: 'content',
          }}
        />
        {comment !== (report.general_comment || '') && (
          <button
            onClick={handleSaveComment}
            disabled={saving}
            style={{
              marginTop: 6,
              fontFamily: 'var(--af-font-mono)',
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

        {/* Voice transcription result panel */}
        {voiceResult && (
          <div style={{ marginTop: 12, padding: 12, border: '0.5px solid #B8862A', background: '#FBF8F2' }}>
            <div style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 9, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: '#B8862A', marginBottom: 10,
            }}>
              Распознано — выберите что применить
            </div>
            {voiceResult.generalComment && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 9, color: '#666', marginBottom: 4, letterSpacing: '0.06em' }}>
                  Дополнение к общему комментарию
                </div>
                <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 12, color: '#111', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {voiceResult.generalComment}
                </div>
              </div>
            )}
            {voiceResult.remarks.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 9, color: '#666', marginBottom: 6, letterSpacing: '0.06em' }}>
                  Новые замечания ({voiceResult.remarks.length})
                </div>
                {voiceResult.remarks.map((r, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', cursor: 'pointer', borderTop: i === 0 ? 'none' : '0.5px dashed #EBEBEB' }}>
                    <input
                      type="checkbox"
                      checked={voiceSelectedRemarks.has(i)}
                      onChange={(e) => {
                        const next = new Set(voiceSelectedRemarks);
                        if (e.target.checked) next.add(i); else next.delete(i);
                        setVoiceSelectedRemarks(next);
                      }}
                      style={{ marginTop: 3 }}
                    />
                    <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 12, color: '#111', lineHeight: 1.4 }}>
                      {r}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={applyVoiceResult}
                disabled={!voiceResult.generalComment && voiceSelectedRemarks.size === 0}
                style={{
                  fontFamily: 'var(--af-font-mono)', fontSize: 9, padding: '6px 12px',
                  background: '#111', color: '#FFF', border: 'none', cursor: 'pointer',
                }}
              >
                Применить →
              </button>
              <button
                onClick={() => { setVoiceResult(null); setVoiceSelectedRemarks(new Set()); }}
                style={{
                  fontFamily: 'var(--af-font-mono)', fontSize: 9, padding: '6px 12px',
                  background: '#FFF', color: '#111', border: '0.5px solid #EBEBEB', cursor: 'pointer',
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attachments section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-8)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#111',
          }}>
            Файлы {(report.attachments || []).length > 0 && `(${(report.attachments || []).length})`}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 'var(--af-fs-9)',
              color: '#111',
              background: 'none',
              border: 'none',
              cursor: uploadingFile ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: uploadingFile ? 0.5 : 1,
            }}
          >
            <Icons.Plus className="w-3 h-3" />
            {uploadingFile ? 'Загрузка...' : 'Загрузить'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.dwg"
            onChange={handleFileInputChange}
          />
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleFileDrop}
          onDragOver={e => { e.preventDefault(); setIsDraggingFile(true); }}
          onDragLeave={() => setIsDraggingFile(false)}
          style={{
            border: `1px dashed ${isDraggingFile ? '#111' : '#EBEBEB'}`,
            background: isDraggingFile ? '#F6F6F4' : '#FFF',
            padding: '12px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.12s',
            marginBottom: (report.attachments || []).length > 0 ? 8 : 0,
          }}
        >
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-10)',
            color: '#111',
            opacity: 0.5,
          }}>
            Перетащите файл или нажмите · PDF, DOC, XLSX, PNG, DWG
          </div>
        </div>

        {/* File list */}
        {(report.attachments || []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(report.attachments || []).map((att, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: '#FFF',
                borderBottom: '0.5px solid #EBEBEB',
              }}>
                <div style={{
                  fontFamily: 'var(--af-font-mono)',
                  fontSize: 'var(--af-fs-8)',
                  textTransform: 'uppercase',
                  color: '#111',
                  padding: '2px 6px',
                  background: '#F6F6F4',
                  whiteSpace: 'nowrap',
                }}>
                  {att.name.split('.').pop()?.toUpperCase() || 'FILE'}
                </div>
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    fontFamily: 'var(--af-font-mono)',
                    fontSize: 'var(--af-fs-10)',
                    color: '#111',
                    textDecoration: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
                >
                  {att.name}
                </a>
                <span style={{
                  fontFamily: 'var(--af-font-mono)',
                  fontSize: 'var(--af-fs-8)',
                  color: '#111',
                  opacity: 0.5,
                  whiteSpace: 'nowrap',
                }}>
                  {att.size < 1024 * 1024
                    ? `${Math.round(att.size / 1024)} КБ`
                    : `${(att.size / (1024 * 1024)).toFixed(1)} МБ`}
                </span>
                <button
                  onClick={() => handleRemoveAttachment(att.file_url)}
                  style={{
                    fontFamily: 'var(--af-font-mono)',
                    fontSize: 14,
                    color: '#111',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 2px',
                    opacity: 0.3,
                    transition: 'opacity 0.12s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '1'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '0.3'; }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
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
            fontFamily: 'var(--af-font-mono)',
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
              fontFamily: 'var(--af-font-mono)',
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
                fontFamily: 'var(--af-font-mono)',
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
                  fontFamily: 'var(--af-font-mono)',
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
                    fontFamily: 'var(--af-font-mono)',
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
                style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-9)', color: '#111', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button
                onClick={handleAddRemark}
                disabled={addingRemark || !newRemarkText.trim()}
                style={{
                  fontFamily: 'var(--af-font-mono)',
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
          <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)', color: '#111' }}>
            Загрузка...
          </div>
        ) : (remarks || []).length === 0 ? (
          <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)', color: '#111', padding: '16px 0' }}>
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
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
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
          fontFamily: 'var(--af-font-mono)',
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
            fontFamily: 'var(--af-font-mono)',
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
              fontFamily: 'var(--af-font-mono)',
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
                  fontFamily: 'var(--af-font-mono)',
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
              <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)', color: '#111' }}>
                {remark.assignee.full_name}
              </span>
            )}

            {/* Deadline */}
            {remark.deadline && (
              <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)', color: '#111' }}>
                до {remark.deadline}
              </span>
            )}

            {/* Comment count */}
            {remark.comments.length > 0 && (
              <button
                onClick={onToggleComment}
                style={{
                  fontFamily: 'var(--af-font-mono)',
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
                  fontFamily: 'var(--af-font-mono)',
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
                fontFamily: 'var(--af-font-mono)',
                fontSize: 'var(--af-fs-10)',
                color: '#111',
                lineHeight: 1.5,
              }}>
                {c.text}
              </div>
              <div style={{
                fontFamily: 'var(--af-font-mono)',
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
                fontFamily: 'var(--af-font-mono)',
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
                fontFamily: 'var(--af-font-mono)',
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
              fontFamily: 'var(--af-font-mono)',
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
                fontFamily: 'var(--af-font-mono)',
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
                  fontFamily: 'var(--af-font-mono)',
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
                      fontFamily: 'var(--af-font-mono)',
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
                      fontFamily: 'var(--af-font-mono)',
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
                  style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)', color: '#111', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={creatingTask || !newTaskTitle.trim() || !newTaskAssignee}
                  style={{
                    fontFamily: 'var(--af-font-mono)',
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
