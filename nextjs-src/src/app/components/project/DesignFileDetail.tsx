'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDesignFile, useDesignFileComments } from '../../lib/hooks';
import { deleteDesignFile, createDesignFileComment, updateDesignFileName } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { DESIGN_FOLDERS } from '../../lib/types';
import type { DesignFolder, DesignFileCommentWithProfile, SignatureStatus } from '../../lib/types';
import SignatureSection from './SignatureSection';

interface DesignFileDetailProps {
  fileId: string;
  projectId: string;
  folder: DesignFolder;
  toast: (msg: string) => void;
  canDelete?: boolean;
  canComment?: boolean;
  onBack: () => void;
  onDeleted: () => void;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function isImage(mimeType: string | null): boolean {
  return !!mimeType && mimeType.startsWith('image/');
}

function isPdf(mimeType: string | null): boolean {
  return !!mimeType && mimeType.includes('pdf');
}

export default function DesignFileDetail({
  fileId, projectId, folder, toast,
  canDelete = true, canComment = true,
  onBack, onDeleted,
}: DesignFileDetailProps) {
  const { data: file, loading, refetch: refetchFile } = useDesignFile(fileId);
  const { data: comments, refetch: refetchComments } = useDesignFileComments(fileId);
  const { profile } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // PDF fullscreen state
  const [pdfFullscreen, setPdfFullscreen] = useState(false);

  // Rename state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  const startRename = () => {
    if (!file) return;
    const dot = file.name.lastIndexOf('.');
    setNameDraft(dot > 0 ? file.name.slice(0, dot) : file.name);
    setEditingName(true);
  };

  const cancelRename = () => {
    setEditingName(false);
    setNameDraft('');
  };

  const saveRename = async () => {
    if (!file) return;
    const base = nameDraft.trim();
    if (!base) {
      cancelRename();
      return;
    }
    const dot = file.name.lastIndexOf('.');
    const ext = dot > 0 ? file.name.slice(dot) : '';
    const newName = base + ext;
    if (newName === file.name) {
      cancelRename();
      return;
    }
    setSavingName(true);
    try {
      await updateDesignFileName(file.id, newName);
      await refetchFile();
      toast('Файл переименован');
      setEditingName(false);
      setNameDraft('');
    } catch (err: any) {
      toast(err?.message || 'Ошибка переименования');
    } finally {
      setSavingName(false);
    }
  };

  const folderConfig = DESIGN_FOLDERS.find(f => f.id === folder);
  const folderLabel = folderConfig?.label || folder;

  const handleDelete = async () => {
    if (!file) return;
    setDeleting(true);
    try {
      await deleteDesignFile(file.id, file.file_path);
      toast('Файл удалён');
      onDeleted();
    } catch {
      toast('Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      await createDesignFileComment(fileId, projectId, commentText.trim());
      setCommentText('');
      refetchComments();
    } catch {
      toast('Ошибка отправки');
    } finally {
      setSendingComment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 9, color: '#111', textAlign: 'center', padding: '40px 0', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
        Загрузка...
      </div>
    );
  }

  if (!file) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 9, color: '#111' }}>Файл не найден</div>
        <button onClick={onBack} style={{ fontFamily: 'var(--af-font-mono)', fontSize: 8, color: '#111', background: 'none', border: 'none', cursor: 'pointer', marginTop: 12, textDecoration: 'underline' }}>
          ← Назад
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          fontFamily: 'var(--af-font-mono)', fontSize: 8,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: '#111',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16,
        }}
      >
        ← {folderLabel}
      </button>

      {/* File header */}
      {!editingName ? (
        <h3
          onClick={canDelete ? startRename : undefined}
          title={canDelete ? 'Нажмите, чтобы переименовать' : undefined}
          style={{
            fontFamily: 'var(--af-font-display)',
            fontSize: 22,
            fontWeight: 900,
            color: '#111',
            marginBottom: 4,
            wordBreak: 'break-word',
            cursor: canDelete ? 'text' : 'default',
          }}
        >
          {file.name}
        </h3>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <input
            ref={nameInputRef}
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename();
              if (e.key === 'Escape') cancelRename();
            }}
            disabled={savingName}
            style={{
              flex: '1 1 200px',
              fontFamily: 'var(--af-font-mono)',
              fontSize: 16,
              color: '#111',
              border: '0.5px solid #111',
              padding: '10px 12px',
              outline: 'none',
              background: '#fff',
            }}
          />
          <button
            onClick={saveRename}
            disabled={savingName || !nameDraft.trim()}
            style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: '#fff', background: '#111', border: '0.5px solid #111',
              padding: '10px 14px', cursor: 'pointer',
              opacity: (savingName || !nameDraft.trim()) ? 0.5 : 1,
            }}
          >
            {savingName ? '...' : 'Сохранить'}
          </button>
          <button
            onClick={cancelRename}
            disabled={savingName}
            style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: '#111', background: 'none', border: '0.5px solid #EBEBEB',
              padding: '10px 14px', cursor: 'pointer',
            }}
          >
            Отмена
          </button>
        </div>
      )}
      <p style={{ fontFamily: 'var(--af-font-mono)', fontSize: 8, color: '#111', marginBottom: 20 }}>
        {formatSize(file.file_size)} · {formatDate(file.created_at)} · {file.uploader?.full_name || '—'}
      </p>

      {/* Electronic signature — only in "documents" folder, for PDF files */}
      {folder === 'documents' && isPdf(file.file_type) && (
        <SignatureSection
          fileId={file.id}
          canSend={!!canDelete}
          status={(file as any).signature_status as SignatureStatus | null}
          onStatusChange={() => refetchFile()}
          toast={toast}
        />
      )}

      {/* Preview */}
      <div style={{ marginBottom: 20 }}>
        {isImage(file.file_type) && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.file_url}
              alt={file.name}
              style={{ width: '100%', height: 'auto', display: 'block', border: '0.5px solid #EBEBEB' }}
            />
          </div>
        )}
        {isPdf(file.file_type) && (
          <div>
            {/* PDF preview — CSS transform to fit entire A4 page */}
            <div
              style={{ position: 'relative', cursor: 'pointer', width: '100%', height: 480, overflow: 'hidden', border: '0.5px solid #EBEBEB' }}
              onClick={() => {
                // On mobile, open in new tab — Safari native PDF viewer is far superior
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 768);
                if (isMobile) {
                  window.open(file.file_url, '_blank');
                } else {
                  setPdfFullscreen(true);
                }
              }}
            >
              <iframe
                src={file.file_url}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '250%', height: '250%',
                  border: 'none', pointerEvents: 'none',
                  transform: 'scale(0.4)',
                  transformOrigin: 'top left',
                }}
                title={file.name}
              />
              {/* Overlay */}
              <div
                className="af-pdf-preview-overlay"
                style={{
                  position: 'absolute', inset: 0, zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)'; }}
              >
                <span style={{
                  fontFamily: 'var(--af-font-mono)', fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  color: '#111', background: '#fff', border: '0.5px solid #111',
                  padding: '6px 14px', opacity: 0.85,
                }}>
                  Открыть
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 768);
                if (isMobile) {
                  window.open(file.file_url, '_blank');
                } else {
                  setPdfFullscreen(true);
                }
              }}
              style={{
                fontFamily: 'var(--af-font-mono)', fontSize: 8,
                color: '#111', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, marginTop: 8,
                textDecoration: 'underline',
              }}
            >
              Открыть на весь экран →
            </button>
          </div>
        )}
        {!isImage(file.file_type) && !isPdf(file.file_type) && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{
              width: 80, height: 96, border: '0.5px solid #EBEBEB', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: '#F6F6F4',
            }}>
              <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 14, fontWeight: 600, color: '#111' }}>
                {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <a
          href={file.file_url}
          download={file.name}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 8,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: '#111', border: '0.5px solid #EBEBEB', padding: '8px 14px',
            textDecoration: 'none', display: 'inline-block',
          }}
        >
          Скачать →
        </a>
        {canDelete && (
          <>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  fontFamily: 'var(--af-font-mono)', fontSize: 8,
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  color: '#111', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '8px 0',
                }}
              >
                Удалить
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 7, color: '#111' }}>
                  Удалить файл?
                </span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    fontFamily: 'var(--af-font-mono)', fontSize: 7,
                    color: '#111', background: 'none', border: '0.5px solid #111',
                    padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  {deleting ? '...' : 'Да'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    fontFamily: 'var(--af-font-mono)', fontSize: 7,
                    color: '#111', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '4px 0',
                  }}
                >
                  Отмена
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Comments section */}
      <div style={{ borderTop: '0.5px solid #EBEBEB', paddingTop: 16 }}>
        <div style={{
          fontFamily: 'var(--af-font-mono)', fontSize: 8,
          textTransform: 'uppercase', letterSpacing: '0.14em', color: '#111', marginBottom: 12,
        }}>
          Комментарии
        </div>

        {/* Comment list */}
        {comments && comments.length > 0 ? (
          <div>
            {comments.map((comment) => (
              <CommentRow key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 8, color: '#111', marginBottom: 16 }}>
            Нет комментариев
          </div>
        )}

        {/* Comment input */}
        {canComment && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
              placeholder="Комментарий..."
              style={{
                flex: 1, fontFamily: 'var(--af-font-mono)', fontSize: 9,
                color: '#111', border: '0.5px solid #EBEBEB', padding: '8px 12px',
                outline: 'none', background: 'none',
              }}
            />
            <button
              onClick={handleSendComment}
              disabled={sendingComment || !commentText.trim()}
              style={{
                fontFamily: 'var(--af-font-mono)', fontSize: 11,
                color: '#fff', background: '#111', border: 'none',
                padding: '8px 14px', cursor: 'pointer',
                opacity: sendingComment || !commentText.trim() ? 0.4 : 1,
              }}
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* PDF fullscreen viewer */}
      {pdfFullscreen && file && isPdf(file.file_type) && (
        <PdfLightbox url={file.file_url} name={file.name} onClose={() => setPdfFullscreen(false)} />
      )}
    </div>
  );
}

function CommentRow({ comment }: { comment: DesignFileCommentWithProfile }) {
  const authorName = comment.author?.full_name || 'Аноним';
  const authorRole = comment.author?.role || 'designer';

  const roleLabels: Record<string, string> = {
    designer: 'Дизайнер',
    client: 'Заказчик',
    contractor: 'Подрядчик',
    supplier: 'Поставщик',
    assistant: 'Ассистент',
  };

  return (
    <div style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '0.5px solid #EBEBEB' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 7, textTransform: 'uppercase', color: '#111', fontWeight: 600 }}>
          {authorName}
        </span>
        <span style={{
          fontFamily: 'var(--af-font-mono)', fontSize: 6, color: '#111',
          border: '0.5px solid #EBEBEB', padding: '1px 5px',
        }}>
          {roleLabels[authorRole] || authorRole}
        </span>
        <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 6, color: '#111', marginLeft: 'auto' }}>
          {formatTime(comment.created_at)}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 9, color: '#111', lineHeight: 1.5 }}>
        {comment.text}
      </div>
    </div>
  );
}

// ============================================================================
// PdfLightbox — fullscreen PDF viewer with page navigation & zoom
// ============================================================================

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200];

function PdfLightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [zoomIdx, setZoomIdx] = useState(2); // default 75%
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // On mobile, open in new tab and close lightbox — Safari native PDF viewer is better
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 768);
    if (isMobile) {
      window.open(url, '_blank');
      onClose();
    }
  }, [url, onClose]);

  const zoom = ZOOM_LEVELS[zoomIdx];
  const pdfSrc = `${url}#page=${page}&zoom=${zoom}`;

  // Keyboard: Escape to close, arrows for pages
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setPage(p => Math.max(1, p - 1));
      else if (e.key === 'ArrowRight') setPage(p => p + 1);
      else if (e.key === '+' || e.key === '=') setZoomIdx(i => Math.min(ZOOM_LEVELS.length - 1, i + 1));
      else if (e.key === '-') setZoomIdx(i => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const btnStyle: React.CSSProperties = {
    color: '#fff',
    background: 'rgba(0,0,0,0.5)',
    border: '0.5px solid rgba(255,255,255,0.3)',
    fontFamily: 'var(--af-font-mono)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      zIndex: 1000,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Close button — safe area for iOS notch */}
      <button
        onClick={onClose}
        aria-label="Закрыть"
        style={{
          ...btnStyle,
          position: 'absolute', top: 'max(16px, env(safe-area-inset-top, 16px))', right: 8, zIndex: 3,
          width: 44, height: 44, fontSize: 20,
        }}
      >✕</button>

      {/* Prev page arrow */}
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page <= 1}
        aria-label="Предыдущая страница"
        style={{
          ...btnStyle,
          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
          width: 40, height: 40, fontSize: 20,
          opacity: page <= 1 ? 0.3 : 0.7,
        }}
      >←</button>

      {/* Next page arrow */}
      <button
        onClick={() => setPage(p => p + 1)}
        aria-label="Следующая страница"
        style={{
          ...btnStyle,
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
          width: 40, height: 40, fontSize: 20,
          opacity: 0.7,
        }}
      >→</button>

      {/* PDF iframe */}
      <div style={{ flex: 1, padding: '16px 8px 0', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          key={`${page}-${zoom}`}
          src={pdfSrc}
          title={name}
          style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
        />
      </div>

      {/* Bottom bar: filename + page + zoom */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(0,0,0,0.7)',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* Row 1: filename + page number */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderBottom: '0.5px solid rgba(255,255,255,0.12)',
          minHeight: 32,
          overflow: 'hidden',
        }}>
          <span style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 10, color: '#fff',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: '1 1 auto', minWidth: 0,
          }}>
            {name}
          </span>
          <span style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 9,
            color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            Стр. {page}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 8, color: '#fff',
              border: '0.5px solid rgba(255,255,255,0.35)', padding: '3px 8px',
              textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Скачать
          </a>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 8, color: '#fff',
              border: '0.5px solid rgba(255,255,255,0.35)', padding: '3px 8px',
              background: 'none', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Закрыть
          </button>
        </div>

        {/* Row 2: zoom controls */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '5px 12px',
        }}>
          <button
            onClick={() => setZoomIdx(i => Math.max(0, i - 1))}
            disabled={zoomIdx <= 0}
            aria-label="Уменьшить"
            style={{
              ...btnStyle,
              width: 24, height: 24, fontSize: 14,
              border: '0.5px solid rgba(255,255,255,0.25)',
              background: 'none',
              opacity: zoomIdx <= 0 ? 0.3 : 1,
            }}
          >−</button>
          <span style={{
            color: '#fff', fontFamily: 'var(--af-font-mono)', fontSize: 9,
            minWidth: 36, textAlign: 'center',
          }}>
            {zoom}%
          </span>
          <button
            onClick={() => setZoomIdx(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
            disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
            aria-label="Увеличить"
            style={{
              ...btnStyle,
              width: 24, height: 24, fontSize: 14,
              border: '0.5px solid rgba(255,255,255,0.25)',
              background: 'none',
              opacity: zoomIdx >= ZOOM_LEVELS.length - 1 ? 0.3 : 1,
            }}
          >+</button>
        </div>
      </div>
    </div>
  );
}
