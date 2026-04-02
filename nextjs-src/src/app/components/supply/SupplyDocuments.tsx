'use client';

import { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface SupplyDoc {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  created_at: string;
}

interface SupplyDocumentsProps {
  projectId: string;
  toast: (msg: string) => void;
}

const mono = "'IBM Plex Mono', monospace";
const display = "'Playfair Display', serif";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getFileIcon(type: string): string {
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('sheet') || type.includes('excel') || type.includes('xlsx') || type.includes('csv')) return 'XLS';
  if (type.includes('image')) return 'IMG';
  if (type.includes('word') || type.includes('doc')) return 'DOC';
  return 'FILE';
}

export default function SupplyDocuments({ projectId, toast }: SupplyDocumentsProps) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<SupplyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      // List files from storage bucket
      const { data: files, error } = await supabase.storage
        .from('supply-docs')
        .list(`${projectId}`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) {
        // Bucket might not exist yet — that's OK
        console.warn('[SupplyDocuments] list error:', error.message);
        setDocs([]);
        setLoading(false);
        return;
      }

      if (!files || files.length === 0) {
        setDocs([]);
        setLoading(false);
        return;
      }

      const result: SupplyDoc[] = files
        .filter(f => f.name && !f.name.startsWith('.'))
        .map(f => {
          const { data: urlData } = supabase.storage
            .from('supply-docs')
            .getPublicUrl(`${projectId}/${f.name}`);
          return {
            id: f.id || f.name,
            name: f.name,
            size: f.metadata?.size || 0,
            type: f.metadata?.mimetype || '',
            url: urlData.publicUrl,
            uploaded_by: f.metadata?.uploadedBy || '',
            created_at: f.created_at || new Date().toISOString(),
          };
        });

      setDocs(result);
    } catch (err) {
      console.error('[SupplyDocuments] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, [projectId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let uploaded = 0;

    for (const file of Array.from(files)) {
      try {
        // Sanitize filename: keep extension, add timestamp
        const ext = file.name.split('.').pop() || 'bin';
        const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Zа-яА-ЯёЁ0-9_\- ]/g, '');
        const fileName = `${baseName}_${Date.now()}.${ext}`;
        const filePath = `${projectId}/${fileName}`;

        const { error } = await supabase.storage
          .from('supply-docs')
          .upload(filePath, file, {
            cacheControl: '3600',
            contentType: file.type,
          });

        if (error) {
          console.error('[SupplyDocuments] Upload error:', error.message);
          toast(`Ошибка загрузки ${file.name}: ${error.message}`);
        } else {
          uploaded++;
        }
      } catch (err: any) {
        toast(`Ошибка: ${err.message}`);
      }
    }

    if (uploaded > 0) {
      toast(`Загружено ${uploaded} ${uploaded === 1 ? 'файл' : 'файлов'}`);
      fetchDocs();
    }
    setUploading(false);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (doc: SupplyDoc) => {
    try {
      const { error } = await supabase.storage
        .from('supply-docs')
        .remove([`${projectId}/${doc.name}`]);

      if (error) {
        toast('Ошибка удаления: ' + error.message);
        return;
      }

      toast('Файл удалён');
      fetchDocs();
    } catch (err: any) {
      toast('Ошибка: ' + err.message);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header + Upload button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ fontFamily: mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgb(var(--ink))' }}>
          Документация · {docs.length} {docs.length === 1 ? 'файл' : 'файлов'}
        </div>
        <label
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em',
            padding: '6px 14px', border: '0.5px solid rgb(var(--line))',
            background: 'transparent', color: 'rgb(var(--ink))',
            cursor: uploading ? 'wait' : 'pointer',
            opacity: uploading ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
          className="af-btn-hover"
        >
          <Icons.Upload className="w-3.5 h-3.5" />
          {uploading ? 'Загрузка...' : 'Загрузить файлы'}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.zip"
            onChange={handleUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>
      </div>

      {/* File list */}
      {loading ? (
        <div style={{ fontFamily: mono, fontSize: 11, color: 'rgb(var(--ink))', opacity: 0.5, padding: 20, textAlign: 'center' }}>
          Загрузка...
        </div>
      ) : docs.length === 0 ? (
        <div style={{
          border: '0.5px dashed rgb(var(--line))', padding: '40px 20px', textAlign: 'center',
        }}>
          <div className="mx-auto mb-3 w-8 h-8" style={{ color: 'rgb(var(--line))' }}>
            <Icons.File className="w-8 h-8" />
          </div>
          <div style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 6 }}>
            Нет документов
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, color: 'rgb(var(--ink))', opacity: 0.5 }}>
            Загрузите PDF, Excel или спецификации
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {docs.map(doc => (
            <div
              key={doc.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', background: 'rgb(var(--srf))',
                border: '0.5px solid rgb(var(--line))',
                transition: 'background 0.15s',
              }}
            >
              {/* File type badge */}
              <div style={{
                width: 36, height: 36, background: 'rgb(var(--ink))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontFamily: mono, fontSize: 8, color: 'rgb(var(--srf))', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {getFileIcon(doc.type)}
                </span>
              </div>

              {/* File info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: mono, fontSize: 12, color: 'rgb(var(--ink))',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {doc.name}
                </div>
                <div style={{ fontFamily: mono, fontSize: 9, color: 'rgb(var(--ink))', opacity: 0.5, marginTop: 2 }}>
                  {formatFileSize(doc.size)} · {formatDate(doc.created_at)}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, border: '0.5px solid rgb(var(--line))',
                    background: 'transparent', color: 'rgb(var(--ink))',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  title="Скачать"
                >
                  <Icons.Download className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleDelete(doc)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, border: '0.5px solid rgb(var(--line))',
                    background: 'transparent', color: 'rgb(var(--ink))',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  title="Удалить"
                >
                  <Icons.X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
