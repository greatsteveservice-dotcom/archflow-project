'use client';
import { useState, useRef } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import type { Document, DocumentFormat, DocumentCategory } from '../../lib/types';
import { useDocumentsByCategory } from '../../lib/hooks';
import { formatDate, uploadDocument, createDocument, deleteDocument } from '../../lib/queries';

const FORMAT_COLORS: Record<string, { bg: string; text: string }> = {
  PDF:  { bg: '#111111', text: '#FFFFFF' },
  DWG:  { bg: '#111111', text: '#FFFFFF' },
  XLSX: { bg: '#F6F6F4', text: '#111111' },
  PNG:  { bg: '#F6F6F4', text: '#111111' },
};

const EXT_TO_FORMAT: Record<string, DocumentFormat> = {
  pdf: 'PDF', dwg: 'DWG', xlsx: 'XLSX', xls: 'XLSX', png: 'PNG',
  jpg: 'PNG', jpeg: 'PNG', svg: 'PNG',
};

interface DocCategoryListProps {
  projectId: string;
  category: DocumentCategory;
  toast: (msg: string) => void;
  canUpload?: boolean;
}

export default function DocCategoryList({ projectId, category, toast, canUpload = true }: DocCategoryListProps) {
  const { data: docs, loading, refetch } = useDocumentsByCategory(projectId, category);
  const [showModal, setShowModal] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docVersion, setDocVersion] = useState('1.0');
  const [saving, setSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (loading) return <div className="text-[13px] text-ink-faint py-4">Загрузка...</div>;

  const handleFileSelect = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 50 МБ)');
      return;
    }
    setDocFile(file);
    setError('');
    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const detectFormat = (fileName: string): DocumentFormat => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return EXT_TO_FORMAT[ext] || 'PDF';
  };

  const handleUpload = async () => {
    if (!docFile || !docTitle.trim()) return;
    setSaving(true);
    setUploadStep('uploading');
    setError('');
    try {
      const fileUrl = await uploadDocument(docFile, projectId);
      setUploadStep('saving');
      await createDocument({
        project_id: projectId,
        title: docTitle.trim(),
        version: docVersion || '1.0',
        format: detectFormat(docFile.name),
        file_url: fileUrl,
        category,
      });
      toast('Документ загружен');
      refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setSaving(false);
      setUploadStep('idle');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setDocFile(null);
    setDocTitle('');
    setDocVersion('1.0');
    setError('');
    setUploadStep('idle');
  };

  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await deleteDocument(docToDelete.id);
      toast('Документ удалён');
      refetch();
      setDocToDelete(null);
    } catch (err: any) {
      toast(err.message || 'Ошибка удаления документа');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {canUpload && (
        <div className="flex items-center justify-end mb-4">
          <button className="btn btn-primary text-[12px] py-1.5 px-3" onClick={() => setShowModal(true)}>
            <Icons.Plus className="w-3.5 h-3.5" /> Загрузить
          </button>
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {(docs || []).map((doc: Document) => {
          const fmt = FORMAT_COLORS[doc.format?.toUpperCase() || ''] || { bg: '#F6F6F4', text: '#111111' };
          const hasFile = !!doc.file_url;
          return (
            <div
              key={doc.id}
              className={`card p-4 group ${hasFile ? 'cursor-pointer hover:border-ink-ghost' : 'opacity-60'}`}
              onClick={() => { if (hasFile) window.open(doc.file_url!, '_blank'); }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: fmt.bg, color: fmt.text }}>
                  {doc.format?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{doc.title}</div>
                  <div className="text-[11px] text-ink-faint mt-0.5">
                    {doc.version || ''} · {formatDate(doc.created_at)}
                  </div>
                </div>
                {hasFile && <Icons.Download className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />}
                {canUpload && (
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-err-bg text-ink-faint hover:text-err flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); setDocToDelete(doc); }}
                    title="Удалить"
                  >
                    <Icons.Trash className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Bdg s={doc.status} />
            </div>
          );
        })}
      </div>

      {(!docs || docs.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icons.File className="w-8 h-8 text-ink-ghost mb-2" />
          <div className="text-[13px] text-ink-faint">Документов пока нет</div>
          {canUpload && (
            <button className="btn btn-primary text-[12px] py-1.5 px-3 mt-3" onClick={() => setShowModal(true)}>
              <Icons.Plus className="w-3.5 h-3.5" /> Загрузить первый документ
            </button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <Modal open={showModal} onClose={closeModal} title="Загрузить документ">
        <div className="space-y-4">
          {error && (
            <div className="bg-err-bg border border-err/20 text-err text-[13px] px-4 py-2.5 rounded-lg">{error}</div>
          )}
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging ? 'border-ink bg-srf-secondary' : docFile ? 'border-ink bg-srf-raised' : 'border-line bg-srf-raised hover:border-ink-ghost'
            }`}
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
          >
            <input ref={fileRef} type="file" accept=".pdf,.dwg,.xlsx,.xls,.png,.jpg,.jpeg,.svg" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            {docFile ? (
              <div>
                <div className="text-[13px] font-medium">{docFile.name}</div>
                <div className="text-[12px] text-ink-muted mt-1">{(docFile.size / 1024 / 1024).toFixed(1)} МБ</div>
              </div>
            ) : (
              <>
                <Icons.File className="w-5 h-5 mx-auto text-ink-faint mb-1" />
                <div className="text-[13px] text-ink-muted">Перетащите файл или нажмите</div>
                <div className="text-[11px] text-ink-faint mt-0.5">PDF, DWG, XLSX, PNG до 50 МБ</div>
              </>
            )}
          </div>
          <div className="modal-field">
            <label>Название</label>
            <input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Название документа" />
          </div>
          <div className="modal-field">
            <label>Версия</label>
            <input value={docVersion} onChange={e => setDocVersion(e.target.value)} placeholder="1.0" />
          </div>
          {saving && (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-line border-t-ink rounded-full animate-spin" />
              <span className="text-[12px] text-ink-muted">
                {uploadStep === 'uploading' ? 'Загрузка файла...' : 'Сохранение...'}
              </span>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>Отмена</button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={saving || !docFile || !docTitle.trim()}>
              {saving ? 'Загрузка...' : 'Загрузить'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!docToDelete}
        title="Удалить документ?"
        message={`Документ «${docToDelete?.title || ''}» будет удалён.`}
        confirmLabel="Удалить"
        loading={deleting}
        onConfirm={handleDeleteDoc}
        onCancel={() => setDocToDelete(null)}
      />
    </div>
  );
}
