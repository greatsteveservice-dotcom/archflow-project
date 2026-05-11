'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDesignFiles, useDesignSubfolders } from '../../lib/hooks';
import { createDesignFile, updateDesignFileName, createDesignSubfolder, renameDesignSubfolder, deleteDesignSubfolder, moveDesignFileToSubfolder, deleteDesignFile } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { DESIGN_FOLDERS } from '../../lib/types';
import type { DesignFolder, DesignFileWithProfile, DesignSubfolder } from '../../lib/types';

interface DesignFolderViewProps {
  projectId: string;
  folder: DesignFolder;
  toast: (msg: string) => void;
  canUpload?: boolean;
  onBack: () => void;
  onSelectFile: (fileId: string) => void;
}

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.ppt,.pptx,.doc,.docx';

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)$/i;

function isImageFile(file: DesignFileWithProfile): boolean {
  if (file.file_type && file.file_type.startsWith('image/')) return true;
  return IMAGE_EXT_RE.test(file.name);
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      width: 56, height: 68, border: '0.5px solid #EBEBEB', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#fff',
    }}>
      <span style={{
        fontFamily: 'var(--af-font-mono)', fontSize: 10,
        fontWeight: 600, color: '#111', textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>{type}</span>
    </div>
  );
}

// Split filename into base + extension for editing
function splitName(fullName: string): { base: string; ext: string } {
  const dot = fullName.lastIndexOf('.');
  if (dot <= 0 || dot === fullName.length - 1) return { base: fullName, ext: '' };
  return { base: fullName.slice(0, dot), ext: fullName.slice(dot) };
}

// ============================================================================
// Uploading tiles state — for optimistic UI
// ============================================================================
interface PendingUpload {
  id: string;
  name: string;
  blobUrl: string;
  progress: number; // 0-100
  error?: string;
}

export default function DesignFolderView({ projectId, folder, toast, canUpload = true, onBack, onSelectFile }: DesignFolderViewProps) {
  const { data: files, loading, refetch } = useDesignFiles(projectId, folder);
  const { data: subfolders, refetch: refetchSubfolders } = useDesignSubfolders(projectId, folder);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [renameDialog, setRenameDialog] = useState<{
    fileId: string;
    currentName: string;
    suggestedName?: string;
    loading?: boolean;
  } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeSubfolder, setActiveSubfolder] = useState<string | null>(null); // subfolder for upload target
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  // Multi-select state: Set<fileId>. When size > 0 → selection mode UI is on.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [movePicker, setMovePicker] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectionMode = selectedIds.size > 0;

  const toggleSelect = useCallback((fileId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0 || bulkBusy) return;
    const n = selectedIds.size;
    if (!confirm(`Удалить выбранные файлы (${n})? Действие необратимо.`)) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const targets = (files ?? []).filter(f => ids.includes(f.id));
      await Promise.all(targets.map(f => deleteDesignFile(f.id, f.file_path)));
      clearSelection();
      await refetch();
      toast(`Удалено: ${n}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, files, refetch, toast, clearSelection, bulkBusy]);

  const handleBulkMove = useCallback(async (targetSubfolder: string | null) => {
    if (selectedIds.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => moveDesignFileToSubfolder(id, targetSubfolder)));
      clearSelection();
      setMovePicker(false);
      await refetch();
      toast(targetSubfolder ? `Перемещено в «${targetSubfolder}»` : 'Перемещено в корень');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка перемещения');
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, refetch, toast, clearSelection, bulkBusy]);

  const folderConfig = DESIGN_FOLDERS.find(f => f.id === folder);
  const folderLabel = folderConfig?.label || folder;

  const imageFiles: DesignFileWithProfile[] = useMemo(
    () => (files ?? []).filter(isImageFile),
    [files]
  );

  // Group files by subfolder
  const rootFiles = useMemo(() => (files ?? []).filter(f => !f.subfolder), [files]);
  const filesBySubfolder = useMemo(() => {
    const map = new Map<string, DesignFileWithProfile[]>();
    (files ?? []).forEach(f => {
      if (f.subfolder) {
        const arr = map.get(f.subfolder) || [];
        arr.push(f);
        map.set(f.subfolder, arr);
      }
    });
    return map;
  }, [files]);

  const toggleFolder = (name: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  // Create subfolder
  const handleCreateSubfolder = async () => {
    const name = prompt('Имя папки:');
    if (!name?.trim()) return;
    try {
      await createDesignSubfolder(projectId, folder, name.trim());
      refetchSubfolders();
      toast('Папка создана');
    } catch (err: any) {
      toast(err?.message || 'Ошибка создания папки');
    }
  };

  // Rename subfolder (double-click)
  const handleRenameSubfolder = async (sf: DesignSubfolder) => {
    const name = prompt('Новое имя папки:', sf.name);
    if (!name?.trim() || name.trim() === sf.name) return;
    try {
      await renameDesignSubfolder(sf.id, name.trim());
      refetchSubfolders();
      toast('Папка переименована');
    } catch (err: any) {
      toast(err?.message || 'Ошибка переименования');
    }
  };

  // Delete subfolder
  const handleDeleteSubfolder = async (sf: DesignSubfolder) => {
    const fileCount = filesBySubfolder.get(sf.name)?.length || 0;
    const msg = fileCount > 0
      ? `Удалить папку «${sf.name}»? ${fileCount} файл(ов) будут перемещены в корень.`
      : `Удалить папку «${sf.name}»?`;
    if (!confirm(msg)) return;
    try {
      // Move files to root first
      const filesToMove = filesBySubfolder.get(sf.name) || [];
      await Promise.all(filesToMove.map(f => moveDesignFileToSubfolder(f.id, null)));
      await deleteDesignSubfolder(sf.id);
      refetchSubfolders();
      refetch();
      toast('Папка удалена');
    } catch (err: any) {
      toast(err?.message || 'Ошибка удаления');
    }
  };

  // Drag-and-drop file to subfolder
  const handleFileDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.setData('text/plain', fileId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFolderDrop = async (e: React.DragEvent, subfolderName: string | null) => {
    e.preventDefault();
    setDragOverFolder(null);
    const fileId = e.dataTransfer.getData('text/plain');
    if (!fileId) return;
    try {
      await moveDesignFileToSubfolder(fileId, subfolderName);
      refetch();
      toast(subfolderName ? `Перемещено в «${subfolderName}»` : 'Перемещено в корень');
    } catch (err: any) {
      toast(err?.message || 'Ошибка перемещения');
    }
  };

  const handleFileClick = (file: DesignFileWithProfile) => {
    // In selection mode a plain click on the tile toggles selection
    // instead of opening the file. The explicit checkbox keeps the same behaviour.
    if (selectionMode) {
      toggleSelect(file.id);
      return;
    }
    // Click goes straight to the file detail view (download, video reviews,
    // future pin annotations) — skip the intermediate lightbox preview.
    onSelectFile(file.id);
  };

  // ---- UPLOAD ----
  const uploadOne = useCallback(async (file: File, pendingId: string) => {
    const updateOne = (patch: Partial<PendingUpload>) => {
      setPending(prev => prev.map(p => p.id === pendingId ? { ...p, ...patch } : p));
    };

    try {
      updateOne({ progress: 5 });
      // 1. Ask backend for a presigned PUT URL into YC Object Storage (public
      //    bucket fronted by Yandex CDN). Replaces the legacy proxy upload
      //    through supabase-storage on the VM.
      const { data: { session } } = await supabase.auth.getSession();
      const urlRes = await fetch('/api/design/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          projectId,
          folder,
          subfolder: activeSubfolder,
          name: file.name,
          mime: file.type,
          size: file.size,
        }),
      });
      if (!urlRes.ok) throw new Error((await urlRes.json()).error || 'upload-url failed');
      const { uploadUrl, key, publicUrl } = await urlRes.json();
      updateOne({ progress: 15 });

      // 2. Direct PUT to the bucket. The browser uploads to ru-central1
      //    storage edge; our app server never sees the bytes.
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' },
        body: file,
      });
      if (!putRes.ok) throw new Error(`storage PUT ${putRes.status}`);
      updateOne({ progress: 70 });

      // 3. Finalize — registers the design_files row and triggers async
      //    thumbnail generation.
      const finRes = await fetch('/api/design/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          projectId,
          folder,
          subfolder: activeSubfolder,
          name: file.name,
          key,
          size: file.size,
          mime: file.type,
        }),
      });
      if (!finRes.ok) throw new Error((await finRes.json()).error || 'finalize failed');
      const { id: createdId } = await finRes.json();

      updateOne({ progress: 100 });
      await refetch();

      // Remove the pending tile
      setPending(prev => prev.filter(p => p.id !== pendingId));

      // For images: kick off auto-classification in background and offer rename
      if (file.type.startsWith('image/')) {
        fetch('/api/classify-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: publicUrl }),
        })
          .then(r => r.ok ? r.json() : null)
          .then((result: { suggestedName?: string; confidence?: number } | null) => {
            if (result && result.suggestedName && (result.confidence ?? 0) >= 0.55) {
              // Only open rename dialog if we're not already showing one
              setRenameDialog(prev => prev ?? {
                fileId: createdId,
                currentName: file.name,
                suggestedName: result.suggestedName,
              });
            }
          })
          .catch(() => {}); // silent fail — classification is non-critical
      }
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      toast(err instanceof Error ? `Ошибка: ${err.message}` : 'Ошибка загрузки файла');
      updateOne({ error: err instanceof Error ? err.message : 'Ошибка загрузки', progress: 0 });
      // Keep failed pending on screen for 5s, then remove
      setTimeout(() => {
        setPending(prev => prev.filter(p => p.id !== pendingId));
      }, 5000);
    }
  }, [projectId, folder, activeSubfolder, refetch]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // IMPORTANT: Copy files BEFORE resetting input value!
    // FileList is a live reference — setting value='' clears it.
    const filesArr = Array.from(fileList);

    // Reset input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';

    setUploadError(null);
    // Validate sizes
    const tooLarge = filesArr.filter(f => f.size > MAX_SIZE);
    if (tooLarge.length > 0) {
      setUploadError(`Файлы слишком большие (${tooLarge.map(f => f.name).join(', ')}). Максимум 2 ГБ.`);
      return;
    }

    // Create pending tiles
    const pendingItems: PendingUpload[] = filesArr.map(f => ({
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      blobUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
      progress: 5,
    }));

    setPending(prev => [...pendingItems, ...prev]);

    // Simulate smooth progress while actual upload runs
    pendingItems.forEach((item, idx) => {
      const start = Date.now();
      const interval = setInterval(() => {
        setPending(prev => {
          const target = prev.find(p => p.id === item.id);
          if (!target || target.progress >= 90 || target.error) {
            clearInterval(interval);
            return prev;
          }
          const elapsed = Date.now() - start;
          // Sigmoid-ish ramp up: fast at first, slow near 90
          const nextProgress = Math.min(88, 5 + (elapsed / 100));
          return prev.map(p => p.id === item.id ? { ...p, progress: Math.max(p.progress, nextProgress) } : p);
        });
      }, 100);

      // Kick off actual upload (staggered slightly to avoid race on timestamps)
      setTimeout(() => uploadOne(filesArr[idx], item.id), idx * 50);
    });
  };

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      pending.forEach(p => { if (p.blobUrl) URL.revokeObjectURL(p.blobUrl); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- RENAME ----
  const handleRenameConfirm = async (newName: string) => {
    if (!renameDialog) return;
    const name = newName.trim();
    if (!name || name === renameDialog.currentName) {
      setRenameDialog(null);
      return;
    }
    setRenameDialog({ ...renameDialog, loading: true });
    try {
      await updateDesignFileName(renameDialog.fileId, name);
      await refetch();
      toast('Файл переименован');
      setRenameDialog(null);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка переименования');
      setRenameDialog({ ...renameDialog, loading: false });
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <button
        onClick={onBack}
        style={{
          fontFamily: 'var(--af-font-mono)', fontSize: 8,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: '#111',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16,
        }}
      >
        ← Назад
      </button>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-13)', fontWeight: 400, color: '#111', margin: 0, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          {folderLabel}
        </h3>
        {canUpload && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="af-btn-pill small" onClick={handleCreateSubfolder} type="button">
              + Папка
            </button>
            <button className="af-btn-pill small action" onClick={() => { setActiveSubfolder(null); fileInputRef.current?.click(); }} type="button">
              + Загрузить
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleUpload}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Upload error */}
      {uploadError && (
        <div style={{
          fontFamily: 'var(--af-font-mono)', fontSize: 9, color: '#111',
          marginBottom: 12, padding: '10px 12px', border: '0.5px solid #111', background: '#FFF8E1',
        }}>
          {uploadError}
        </div>
      )}

      {/* Loading initial */}
      {loading && !files && (
        <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 9, color: '#111', textAlign: 'center', padding: '40px 0', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Загрузка...
        </div>
      )}

      {/* Empty state */}
      {!loading && pending.length === 0 && (!files || files.length === 0) && (!subfolders || subfolders.length === 0) && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontFamily: 'var(--af-font-display)', fontSize: 48, fontWeight: 900, color: '#EBEBEB', marginBottom: 8 }}>—</div>
          <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#111' }}>
            Файлов пока нет
          </div>
          {canUpload && (
            <button
              className="af-btn-pill action"
              style={{ marginTop: 16 }}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              + Загрузить файл
            </button>
          )}
        </div>
      )}

      {/* Subfolders */}
      {subfolders && subfolders.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {subfolders.map((sf) => {
            const isExpanded = expandedFolders.has(sf.name);
            const folderFiles = filesBySubfolder.get(sf.name) || [];
            const isDragOver = dragOverFolder === sf.name;
            return (
              <div key={sf.id} style={{ marginBottom: 2 }}>
                {/* Folder row */}
                <div
                  onClick={() => toggleFolder(sf.name)}
                  onDoubleClick={(e) => { e.stopPropagation(); handleRenameSubfolder(sf); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverFolder(sf.name); }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => handleFolderDrop(e, sf.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', cursor: 'pointer',
                    border: isDragOver ? '0.5px solid #111' : '0.5px solid #EBEBEB',
                    background: isDragOver ? '#F6F6F4' : '#fff',
                    transition: 'border-color 0.15s, background 0.15s',
                    userSelect: 'none',
                  }}
                >
                  {/* Folder icon */}
                  <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  {/* Folder visual */}
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M0 1h7l2 2h9v11H0V1z" fill="#111" />
                  </svg>
                  <span style={{
                    fontFamily: 'var(--af-font-mono)', fontSize: 10, color: '#111',
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {sf.name}
                  </span>
                  <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 8, color: '#999' }}>
                    {folderFiles.length}
                  </span>
                  {canUpload && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveSubfolder(sf.name); fileInputRef.current?.click(); }}
                        title="Загрузить в папку"
                        style={{
                          fontFamily: 'var(--af-font-mono)', fontSize: 10, color: '#111',
                          background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px',
                        }}
                      >+</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSubfolder(sf); }}
                        title="Удалить папку"
                        style={{
                          fontFamily: 'var(--af-font-mono)', fontSize: 10, color: '#999',
                          background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px',
                        }}
                      >✕</button>
                    </>
                  )}
                </div>
                {/* Expanded folder content — visually nested inside folder */}
                {isExpanded && folderFiles.length > 0 && (
                  <div style={{
                    marginTop: 2,
                    marginBottom: 8,
                    borderLeft: '2px solid #111',
                    background: '#F6F6F4',
                    padding: '10px 8px 10px 14px',
                  }}>
                    <div className="af-file-grid">
                      {folderFiles.map((file) => (
                        <FileTile
                          key={file.id}
                          file={file}
                          onClick={() => handleFileClick(file)}
                          draggable
                          onDragStart={(e) => handleFileDragStart(e, file.id)}
                          selected={selectedIds.has(file.id)}
                          onToggleSelect={() => toggleSelect(file.id)}
                          selectionMode={selectionMode}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {isExpanded && folderFiles.length === 0 && (
                  <div style={{
                    padding: '12px', borderLeft: '0.5px solid #EBEBEB', marginTop: 2,
                    fontFamily: 'var(--af-font-mono)', fontSize: 8, color: '#999',
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                  }}>
                    Пусто
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Root files (no subfolder) + pending tiles */}
      {(pending.length > 0 || rootFiles.length > 0) && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverFolder('__root__'); }}
          onDragLeave={() => setDragOverFolder(null)}
          onDrop={(e) => handleFolderDrop(e, null)}
          style={{
            border: dragOverFolder === '__root__' ? '0.5px dashed #111' : 'none',
            padding: dragOverFolder === '__root__' ? 4 : 0,
            transition: 'border 0.15s',
          }}
        >
          <div className="af-file-grid">
            {pending.map((p) => (
              <PendingTile key={p.id} pending={p} />
            ))}
            {rootFiles.map((file) => (
              <FileTile
                key={file.id}
                file={file}
                onClick={() => handleFileClick(file)}
                draggable
                onDragStart={(e) => handleFileDragStart(e, file.id)}
                selected={selectedIds.has(file.id)}
                onToggleSelect={() => toggleSelect(file.id)}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox overlay */}
      {lightboxIndex !== null && imageFiles.length > 0 && (
        <Lightbox
          images={imageFiles}
          index={Math.min(lightboxIndex, imageFiles.length - 1)}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onOpenDetail={(id) => {
            setLightboxIndex(null);
            onSelectFile(id);
          }}
          canRename={canUpload}
          onRequestRename={(fileId, currentName) => {
            setLightboxIndex(null);
            setRenameDialog({ fileId, currentName });
          }}
        />
      )}

      {/* Bulk selection action bar */}
      {selectionMode && (
        <div
          style={{
            position: 'fixed',
            left: 0, right: 0,
            // Sit above the BottomTabBar (.af-tabbar = fixed 72px height +
            // safe-area inset). The old `bottom: 40` was a leftover from the
            // FeedbackBar era and got hidden under the new tabbar — that's
            // why "Удалить / Переместить / Отмена" were invisible after
            // selecting files on mobile.
            bottom: 'calc(72px + env(safe-area-inset-bottom) + 8px)',
            zIndex: 40,
            background: '#111',
            color: '#fff',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: 'var(--af-font-mono)', fontSize: 10,
            textTransform: 'uppercase', letterSpacing: '0.14em',
          }}
        >
          <span style={{ fontWeight: 700 }}>Выбрано: {selectedIds.size}</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setMovePicker(true)}
            disabled={bulkBusy}
            style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.14em',
              color: '#fff', background: 'transparent',
              border: '0.5px solid #fff', padding: '6px 12px', cursor: 'pointer',
            }}
          >
            Переместить
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkBusy}
            style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.14em',
              color: '#fff', background: 'transparent',
              border: '0.5px solid #fff', padding: '6px 12px', cursor: 'pointer',
            }}
          >
            Удалить
          </button>
          <button
            onClick={clearSelection}
            disabled={bulkBusy}
            style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.14em',
              color: '#fff', background: 'transparent',
              border: 'none', padding: '6px 4px', cursor: 'pointer',
            }}
          >
            Отмена
          </button>
        </div>
      )}

      {/* Move-to-folder picker modal */}
      {movePicker && (
        <div
          className="af-modal-overlay"
          onClick={() => !bulkBusy && setMovePicker(false)}
          style={{ zIndex: 60 }}
        >
          <div className="af-modal" onClick={(e) => e.stopPropagation()} style={{ width: 360, padding: 20 }}>
            <div style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.14em', color: '#111',
              marginBottom: 14,
            }}>
              Переместить в
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button
                onClick={() => handleBulkMove(null)}
                disabled={bulkBusy}
                style={{
                  fontFamily: 'var(--af-font-mono)', fontSize: 11, color: '#111',
                  background: '#F6F6F4', border: 'none', padding: '12px 14px',
                  textAlign: 'left', cursor: 'pointer',
                }}
              >
                ← Корень
              </button>
              {(subfolders ?? []).map((sf) => (
                <button
                  key={sf.id}
                  onClick={() => handleBulkMove(sf.name)}
                  disabled={bulkBusy}
                  style={{
                    fontFamily: 'var(--af-font-mono)', fontSize: 11, color: '#111',
                    background: '#F6F6F4', border: 'none', padding: '12px 14px',
                    textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <svg width="14" height="11" viewBox="0 0 18 14" fill="none">
                    <path d="M0 1h7l2 2h9v11H0V1z" fill="#111" />
                  </svg>
                  {sf.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMovePicker(false)}
              disabled={bulkBusy}
              style={{
                marginTop: 16,
                fontFamily: 'var(--af-font-mono)', fontSize: 9,
                textTransform: 'uppercase', letterSpacing: '0.14em',
                color: '#111', background: 'none', border: 'none',
                padding: 0, cursor: 'pointer',
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Rename dialog */}
      {renameDialog && (
        <RenameDialog
          currentName={renameDialog.currentName}
          suggestedName={renameDialog.suggestedName}
          loading={renameDialog.loading}
          onCancel={() => setRenameDialog(null)}
          onConfirm={handleRenameConfirm}
        />
      )}
    </div>
  );
}

// ============================================================================
// FileTile — one cell in the grid (uploaded file)
// ============================================================================

function FileTile({
  file,
  onClick,
  draggable,
  onDragStart,
  selected = false,
  onToggleSelect,
  selectionMode = false,
}: {
  file: DesignFileWithProfile;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  selectionMode?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const isImg = isImageFile(file);
  const isPdfFile = file.file_type?.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
  const showImg = isImg && !imgError;
  const typeLabel = getFileTypeLabel(file.file_type, file.name);

  // Server-rendered thumbnail (mig 056). When ready we prefer it for PDFs
  // and as an even smaller initial render for images — original loads
  // lazily / on click.
  const thumbUrl = (() => {
    if (!file.thumb_path || file.thumb_status !== 'ready') return null;
    try {
      const u = new URL(file.file_url);
      return `${u.protocol}//${u.host}/${file.thumb_path}`;
    } catch {
      return null;
    }
  })();

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgError(false);
    setReloadKey(k => k + 1);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.();
  };

  return (
    <div
      className="af-file-tile"
      onClick={onClick}
      draggable={draggable && !selectionMode}
      onDragStart={onDragStart}
      style={selected ? { outline: '2px solid #111', outlineOffset: -2 } : undefined}
    >
      {/* Selection checkbox — visible when selectionMode or hover (handled via CSS) */}
      {onToggleSelect && (
        <div
          onClick={handleCheckboxClick}
          className={`af-file-tile-checkbox${selectionMode || selected ? ' visible' : ''}`}
          style={{
            position: 'absolute', top: 8, left: 8, zIndex: 2,
            width: 20, height: 20,
            background: selected ? '#111' : 'rgba(255,255,255,0.92)',
            border: '0.5px solid #111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            fontFamily: 'var(--af-font-mono)',
            fontSize: 12, lineHeight: 1, color: '#fff', fontWeight: 700,
          }}
        >
          {selected ? '✓' : ''}
        </div>
      )}
      {showImg ? (
        <img
          src={thumbUrl
            ? `${thumbUrl}?r=${reloadKey}`
            : `${file.file_url}${file.file_url.includes('?') ? '&' : '?'}r=${reloadKey}`}
          alt={file.name}
          loading="lazy"
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : isImg && imgError ? (
        // Image was expected but failed to load — show honest error + retry
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 12,
          gap: 8,
          textAlign: 'center',
          background: '#F6F6F4',
        }}>
          <div style={{
            fontFamily: 'var(--af-font-display)',
            fontSize: 24,
            fontWeight: 900,
            color: '#999',
            lineHeight: 1,
          }}>!</div>
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 8,
            color: '#111',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            Не удалось загрузить
          </div>
          <button
            onClick={handleRetry}
            style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 8,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#111',
              background: 'none',
              border: '0.5px solid #111',
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Повторить
          </button>
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 7,
            color: '#888',
            marginTop: 2,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {file.name}
          </div>
        </div>
      ) : isPdfFile && thumbUrl ? (
        /* PDF tile — server-rendered first-page thumbnail (mig 056). */
        <img
          src={`${thumbUrl}?r=${reloadKey}`}
          alt={file.name}
          loading="lazy"
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : isPdfFile ? (
        /* PDF tile — placeholder (no thumb yet OR thumb generation failed). */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 12,
          gap: 10,
          textAlign: 'center',
          background: '#F6F6F4',
        }}>
          <div style={{
            fontFamily: 'var(--af-font-display)',
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: '0.05em',
            color: '#111',
            lineHeight: 1,
          }}>PDF</div>
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 9,
            color: '#111',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}>
            {file.name}
          </div>
          {file.thumb_status === 'pending' && (
            <div style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 8,
              color: '#999',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              превью готовится…
            </div>
          )}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 12,
          gap: 10,
          textAlign: 'center',
        }}>
          <FileTypeIcon type={typeLabel} />
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 9,
            color: '#111',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}>
            {file.name}
          </div>
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 8,
            color: '#888',
          }}>
            {formatSize(file.file_size)}
          </div>
        </div>
      )}

      {(showImg || isPdfFile) && (
        <div className="af-file-tile-name">{file.name}</div>
      )}
    </div>
  );
}

// ============================================================================
// PendingTile — upload in progress (optimistic)
// ============================================================================

function PendingTile({ pending }: { pending: PendingUpload }) {
  return (
    <div className="af-file-tile" style={{ cursor: 'default', opacity: pending.error ? 0.6 : 0.85 }}>
      {pending.blobUrl ? (
        <img src={pending.blobUrl} alt={pending.name} draggable={false} />
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}>
          <FileTypeIcon type="..." />
        </div>
      )}

      {/* Progress bar overlay */}
      {!pending.error && (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: 'rgba(255,255,255,0.3)',
        }}>
          <div style={{
            height: '100%',
            width: `${pending.progress}%`,
            background: '#fff',
            transition: 'width 0.2s ease',
          }} />
        </div>
      )}

      {/* Label */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        padding: '6px 8px',
        background: 'rgba(0,0,0,0.55)',
        color: '#fff',
        fontFamily: 'var(--af-font-mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        textAlign: 'center',
      }}>
        {pending.error ? 'Ошибка' : `Загрузка ${Math.round(pending.progress)}%`}
      </div>
    </div>
  );
}

// ============================================================================
// RenameDialog — prompts user for new file name
// ============================================================================

function RenameDialog({
  currentName,
  suggestedName,
  loading,
  onCancel,
  onConfirm,
}: {
  currentName: string;
  suggestedName?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (newName: string) => void;
}) {
  const { ext } = splitName(currentName);
  const initialBase = suggestedName
    ? suggestedName
    : splitName(currentName).base;
  const [baseName, setBaseName] = useState(initialBase);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const handleSubmit = () => {
    const fullName = baseName.trim() + ext;
    onConfirm(fullName);
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          border: '0.5px solid #111',
          padding: 24,
          maxWidth: 420,
          width: '100%',
        }}
      >
        <div style={{
          fontFamily: 'var(--af-font-display)',
          fontSize: 20, fontWeight: 700, color: '#111',
          marginBottom: 4,
        }}>
          Переименовать
        </div>
        {suggestedName && (
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 9, color: '#666', marginBottom: 16,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            ArchFlow распознал помещение
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
          <input
            ref={inputRef}
            type="text"
            value={baseName}
            onChange={(e) => setBaseName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            disabled={loading}
            style={{
              flex: 1,
              fontFamily: 'var(--af-font-mono)', fontSize: 13,
              color: '#111',
              border: '0.5px solid #111',
              padding: '10px 12px',
              outline: 'none',
              background: '#fff',
            }}
          />
          {ext && (
            <span style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 12, color: '#888',
              borderTop: '0.5px solid #111',
              borderRight: '0.5px solid #111',
              borderBottom: '0.5px solid #111',
              padding: '10px 10px',
              background: '#F6F6F4',
            }}>
              {ext}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em',
              color: '#111', background: 'none', border: '0.5px solid #EBEBEB',
              padding: '10px 16px', cursor: 'pointer',
            }}
          >
            Оставить
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !baseName.trim()}
            style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em',
              color: '#fff', background: '#111', border: '0.5px solid #111',
              padding: '10px 16px', cursor: 'pointer',
              opacity: (loading || !baseName.trim()) ? 0.5 : 1,
            }}
          >
            {loading ? '...' : 'Применить →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Lightbox — fullscreen image viewer with zoom and pan
// ============================================================================

interface LightboxProps {
  images: DesignFileWithProfile[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onOpenDetail: (fileId: string) => void;
  canRename?: boolean;
  onRequestRename?: (fileId: string, currentName: string) => void;
}

function Lightbox({
  images, index, onClose, onIndexChange, onOpenDetail,
  canRename, onRequestRename,
}: LightboxProps) {
  const current = images[index];
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  // Refs that always hold latest state for native event listeners
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  const draggingRef = useRef(dragging);
  const pinchingRef = useRef(false);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);

  // Clamp pan offset so image never leaves the container
  const clampOffset = useCallback((ox: number, oy: number) => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return { x: ox, y: oy };
    const imgRect = img.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    const maxX = Math.max(0, (imgRect.width - contRect.width) / 2);
    const maxY = Math.max(0, (imgRect.height - contRect.height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  // Reset zoom/pan when switching images
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [index]);

  // Re-clamp offset when scale changes (zoom out past panned position)
  useEffect(() => {
    if (scale === 1) {
      setOffset({ x: 0, y: 0 });
    } else {
      const id = requestAnimationFrame(() => {
        setOffset((o) => clampOffset(o.x, o.y));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [scale, clampOffset]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && index > 0) {
        onIndexChange(index - 1);
      } else if (e.key === 'ArrowRight' && index < images.length - 1) {
        onIndexChange(index + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length, onClose, onIndexChange]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Native wheel + touch handlers (non-passive so preventDefault works)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setScale((prev) => {
        const next = Math.max(1, Math.min(4, prev + delta));
        return Math.round(next * 100) / 100;
      });
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const a = e.touches[0];
        const b = e.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        pinchStart.current = { dist, scale: scaleRef.current };
        pinchingRef.current = true;
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        const t = e.touches[0];
        dragStart.current = {
          x: t.clientX,
          y: t.clientY,
          ox: offsetRef.current.x,
          oy: offsetRef.current.y,
        };
        setDragging(true);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStart.current) {
        e.preventDefault();
        const a = e.touches[0];
        const b = e.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const ratio = dist / pinchStart.current.dist;
        const next = Math.max(1, Math.min(4, pinchStart.current.scale * ratio));
        setScale(Math.round(next * 100) / 100);
      } else if (e.touches.length === 1 && draggingRef.current && scaleRef.current > 1) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - dragStart.current.x;
        const dy = t.clientY - dragStart.current.y;
        setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy));
      }
    };

    const onTouchEnd = () => {
      pinchStart.current = null;
      pinchingRef.current = false;
      setDragging(false);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [clampOffset]);

  // Mouse drag (desktop)
  const onImageMouseDown = (e: React.MouseEvent) => {
    if (scaleRef.current <= 1) return;
    e.preventDefault();
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, clampOffset]);

  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  // Disable transition during pinch/drag for instant response
  const noTransition = dragging || pinchingRef.current;

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
        touchAction: 'none',
      }}
    >
      {/* Close — safe area for iOS notch */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Закрыть"
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top, 16px))',
          right: 8,
          width: 44,
          height: 44,
          background: 'rgba(0,0,0,0.5)',
          border: '0.5px solid rgba(255,255,255,0.3)',
          color: '#fff',
          fontSize: 20,
          fontFamily: 'var(--af-font-mono)',
          cursor: 'pointer',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >✕</button>

      {/* Prev arrow */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1); }}
          aria-label="Предыдущее"
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 48,
            background: 'rgba(0,0,0,0.5)',
            border: '0.5px solid rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: 22,
            fontFamily: 'var(--af-font-mono)',
            cursor: 'pointer',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >←</button>
      )}

      {/* Next arrow */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1); }}
          aria-label="Следующее"
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 48,
            background: 'rgba(0,0,0,0.5)',
            border: '0.5px solid rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: 22,
            fontFamily: 'var(--af-font-mono)',
            cursor: 'pointer',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >→</button>
      )}

      {/* Image */}
      <img
        ref={imgRef}
        key={current.id}
        src={current.file_url}
        alt={current.name}
        draggable={false}
        onMouseDown={onImageMouseDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '94vw',
          maxHeight: 'calc(100vh - 80px)',
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: noTransition ? 'none' : 'transform 0.15s ease-out',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
          willChange: 'transform',
          imageRendering: 'auto' as const,
        }}
      />

      {/* Bottom bar: filename + actions + zoom — single compact strip */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* Row 1: filename + counter + action buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderBottom: '0.5px solid rgba(255,255,255,0.12)',
          minHeight: 32,
          flexWrap: 'nowrap',
          overflow: 'hidden',
        }}>
          <span style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 10,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: '1 1 auto',
            minWidth: 0,
          }}>
            {current.name}
          </span>
          {images.length > 1 && (
            <span style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 9,
              color: 'rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {index + 1}/{images.length}
            </span>
          )}
          {canRename && onRequestRename && (
            <button
              onClick={(e) => { e.stopPropagation(); onRequestRename(current.id, current.name); }}
              style={{
                fontFamily: 'var(--af-font-mono)',
                fontSize: 8,
                color: '#fff',
                background: 'none',
                border: '0.5px solid rgba(255,255,255,0.35)',
                padding: '3px 8px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Переименовать
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetail(current.id); }}
            style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 8,
              color: '#fff',
              background: 'none',
              border: '0.5px solid rgba(255,255,255,0.35)',
              padding: '3px 8px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Подробнее
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              fontFamily: 'var(--af-font-mono)',
              fontSize: 8,
              color: '#fff',
              background: 'none',
              border: '0.5px solid rgba(255,255,255,0.35)',
              padding: '3px 8px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Закрыть
          </button>
        </div>

        {/* Row 2: zoom controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '5px 12px',
        }}>
          <button
            onClick={() => setScale(s => Math.max(1, Math.round((s - 0.25) * 100) / 100))}
            aria-label="Уменьшить"
            style={{
              color: '#fff', background: 'none',
              border: '0.5px solid rgba(255,255,255,0.25)',
              width: 24, height: 24,
              fontSize: 14, fontFamily: 'var(--af-font-mono)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >−</button>
          <span style={{
            color: '#fff',
            fontFamily: 'var(--af-font-mono)',
            fontSize: 9,
            minWidth: 36,
            textAlign: 'center',
          }}>
            {Math.round(scale * 100)}%
          </span>
          <input
            type="range"
            min={100}
            max={400}
            step={5}
            value={Math.round(scale * 100)}
            onChange={(e) => setScale(Number(e.target.value) / 100)}
            style={{ width: 120, accentColor: '#fff' }}
            aria-label="Масштаб"
          />
          <button
            onClick={() => setScale(s => Math.min(4, Math.round((s + 0.25) * 100) / 100))}
            aria-label="Увеличить"
            style={{
              color: '#fff', background: 'none',
              border: '0.5px solid rgba(255,255,255,0.25)',
              width: 24, height: 24,
              fontSize: 14, fontFamily: 'var(--af-font-mono)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >+</button>
        </div>
      </div>
    </div>
  );
}
