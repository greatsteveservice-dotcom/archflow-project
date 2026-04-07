'use client';

import { useState } from 'react';
import { useDesignFile, useDesignFileComments } from '../../lib/hooks';
import { deleteDesignFile, createDesignFileComment } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { DESIGN_FOLDERS } from '../../lib/types';
import type { DesignFolder, DesignFileCommentWithProfile } from '../../lib/types';

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
  const { data: file, loading } = useDesignFile(fileId);
  const { data: comments, refetch: refetchComments } = useDesignFileComments(fileId);
  const { profile } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

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
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--af-black)', textAlign: 'center', padding: '40px 0', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
        Загрузка...
      </div>
    );
  }

  if (!file) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--af-black)' }}>Файл не найден</div>
        <button onClick={onBack} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--af-black)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 12, textDecoration: 'underline' }}>
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
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--af-black)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16,
        }}
      >
        ← {folderLabel}
      </button>

      {/* File header */}
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: 'var(--af-black)', marginBottom: 4, wordBreak: 'break-word' }}>
        {file.name}
      </h3>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--af-black)', marginBottom: 20 }}>
        {formatSize(file.file_size)} · {formatDate(file.created_at)} · {file.uploader?.full_name || '—'}
      </p>

      {/* Preview */}
      <div style={{ marginBottom: 20 }}>
        {isImage(file.file_type) && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.file_url}
              alt={file.name}
              style={{ width: '100%', height: 'auto', display: 'block', border: '0.5px solid var(--af-border)' }}
            />
          </div>
        )}
        {isPdf(file.file_type) && (
          <div>
            <iframe
              src={file.file_url}
              style={{ width: '100%', height: 400, border: '0.5px solid var(--af-border)' }}
              title={file.name}
            />
            <a
              href={file.file_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
                color: 'var(--af-black)', textDecoration: 'underline', display: 'inline-block', marginTop: 8,
              }}
            >
              Открыть полностью →
            </a>
          </div>
        )}
        {!isImage(file.file_type) && !isPdf(file.file_type) && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{
              width: 80, height: 96, border: '0.5px solid var(--af-border)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: 'var(--af-offwhite)',
            }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: 'var(--af-black)' }}>
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
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--af-black)', border: '0.5px solid var(--af-border)', padding: '8px 14px',
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
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  color: 'var(--af-black)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '8px 0',
                }}
              >
                Удалить
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: 'var(--af-black)' }}>
                  Удалить файл?
                </span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 7,
                    color: 'var(--af-black)', background: 'none', border: '0.5px solid var(--af-black)',
                    padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  {deleting ? '...' : 'Да'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 7,
                    color: 'var(--af-black)', background: 'none', border: 'none',
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
      <div style={{ borderTop: '0.5px solid var(--af-border)', paddingTop: 16 }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
          textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--af-black)', marginBottom: 12,
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
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--af-black)', marginBottom: 16 }}>
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
                flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                color: 'var(--af-black)', border: '0.5px solid var(--af-border)', padding: '8px 12px',
                outline: 'none', background: 'none',
              }}
            />
            <button
              onClick={handleSendComment}
              disabled={sendingComment || !commentText.trim()}
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                color: 'var(--af-white)', background: 'var(--af-black)', border: 'none',
                padding: '8px 14px', cursor: 'pointer',
                opacity: sendingComment || !commentText.trim() ? 0.4 : 1,
              }}
            >
              →
            </button>
          </div>
        )}
      </div>
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
    <div style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '0.5px solid var(--af-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, textTransform: 'uppercase', color: 'var(--af-black)', fontWeight: 600 }}>
          {authorName}
        </span>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 6, color: 'var(--af-black)',
          border: '0.5px solid var(--af-border)', padding: '1px 5px',
        }}>
          {roleLabels[authorRole] || authorRole}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 6, color: 'var(--af-black)', marginLeft: 'auto' }}>
          {formatTime(comment.created_at)}
        </span>
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--af-black)', lineHeight: 1.5 }}>
        {comment.text}
      </div>
    </div>
  );
}
