'use client';

import { useState, useRef } from 'react';
import { useDesignFiles } from '../../lib/hooks';
import { createDesignFile } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { DESIGN_FOLDERS } from '../../lib/types';
import type { DesignFolder, DesignFileWithProfile } from '../../lib/types';

interface DesignFolderViewProps {
  projectId: string;
  folder: DesignFolder;
  toast: (msg: string) => void;
  canUpload?: boolean;
  onBack: () => void;
  onSelectFile: (fileId: string) => void;
}

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.ppt,.pptx,.doc,.docx';

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFileTypeLabel(mimeType: string | null, name: string): string {
  if (mimeType?.includes('pdf')) return 'PDF';
  if (mimeType?.includes('image')) return 'IMG';
  if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation') || name.match(/\.pptx?$/i)) return 'PPT';
  if (mimeType?.includes('msword') || mimeType?.includes('wordprocessing') || name.match(/\.docx?$/i)) return 'DOC';
  return 'FILE';
}

function FileTypeIcon({ type }: { type: string }) {
  return (
    <div style={{
      width: 40, height: 48, border: '0.5px solid #EBEBEB', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#F6F6F4',
    }}>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
        fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{type}</span>
    </div>
  );
}

export default function DesignFolderView({ projectId, folder, toast, canUpload = true, onBack, onSelectFile }: DesignFolderViewProps) {
  const { data: files, loading, refetch } = useDesignFiles(projectId, folder);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folderConfig = DESIGN_FOLDERS.find(f => f.id === folder);
  const folderLabel = folderConfig?.label || folder;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (file.size > MAX_SIZE) {
      setUploadError('Файл слишком большой. Максимум 50 МБ.');
      return;
    }

    setUploadError(null);
    setUploading(true);
    setUploadProgress(10);

    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `design/${projectId}/${folder}/${timestamp}_${safeName}`;

      setUploadProgress(30);

      const { error: storageError } = await supabase.storage
        .from('design-files')
        .upload(path, file, { contentType: file.type });

      if (storageError) throw storageError;

      setUploadProgress(70);

      const { data: urlData } = supabase.storage.from('design-files').getPublicUrl(path);

      await createDesignFile({
        project_id: projectId,
        folder,
        name: file.name,
        file_path: path,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
      });

      setUploadProgress(100);
      refetch();
      toast('Файл загружен');
    } catch (err: any) {
      setUploadError(err.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <button
        onClick={onBack}
        style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: '#111',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16,
        }}
      >
        ← Назад
      </button>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#111', margin: 0, textTransform: 'uppercase' }}>
          {folderLabel}
        </h3>
        {canUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
              textTransform: 'uppercase', letterSpacing: '0.14em',
              color: '#111', background: 'none', border: '0.5px solid #EBEBEB',
              padding: '6px 12px', cursor: 'pointer',
            }}
          >
            + Загрузить
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ height: 2, background: '#EBEBEB', width: '100%' }}>
            <div style={{ height: 2, background: '#111', width: `${uploadProgress}%`, transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#111', marginTop: 4, display: 'block' }}>
            Загрузка... {uploadProgress}%
          </span>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#111',
          marginBottom: 12, padding: '8px 12px', border: '0.5px solid #EBEBEB',
        }}>
          {uploadError}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#111', textAlign: 'center', padding: '40px 0', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Загрузка...
        </div>
      )}

      {/* Empty state */}
      {!loading && (!files || files.length === 0) && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 900, color: '#EBEBEB', marginBottom: 8 }}>—</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#111' }}>
            Файлов пока нет
          </div>
          {canUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
                textTransform: 'uppercase', letterSpacing: '0.14em',
                color: '#111', background: 'none', border: '0.5px solid #EBEBEB',
                padding: '8px 16px', cursor: 'pointer', marginTop: 16,
              }}
            >
              + Загрузить файл
            </button>
          )}
        </div>
      )}

      {/* File list */}
      {files && files.length > 0 && (
        <div>
          {files.map((file) => (
            <FileRow key={file.id} file={file} onClick={() => onSelectFile(file.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({ file, onClick }: { file: DesignFileWithProfile; onClick: () => void }) {
  const typeLabel = getFileTypeLabel(file.file_type, file.name);
  const uploaderName = file.uploader?.full_name || '—';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
        borderBottom: '0.5px solid #EBEBEB', cursor: 'pointer',
      }}
    >
      <FileTypeIcon type={typeLabel} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: '#111',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {file.name}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: '#111', marginTop: 2 }}>
          {formatSize(file.file_size)} · {formatDate(file.created_at)} · {uploaderName}
        </div>
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#EBEBEB', flexShrink: 0 }}>→</span>
    </div>
  );
}
