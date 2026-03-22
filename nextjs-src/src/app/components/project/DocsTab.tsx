'use client';
import { useState, useRef } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import Modal from '../Modal';
import type { Document, DocumentFormat } from '../../lib/types';
import { useProjectDocuments } from '../../lib/hooks';
import { formatDate, uploadDocument, createDocument } from '../../lib/queries';

const FORMAT_COLORS: Record<string, { bg: string; text: string }> = {
  PDF: { bg: '#FEE2E2', text: '#DC2626' },
  DWG: { bg: '#DBEAFE', text: '#2563EB' },
  XLSX: { bg: '#D1FAE5', text: '#059669' },
  PNG: { bg: '#FEF3C7', text: '#D97706' },
};

const EXT_TO_FORMAT: Record<string, DocumentFormat> = {
  pdf: 'PDF', dwg: 'DWG', xlsx: 'XLSX', xls: 'XLSX', png: 'PNG',
  jpg: 'PNG', jpeg: 'PNG', svg: 'PNG',
};

interface DocsTabProps {
  projectId: string;
  toast: (msg: string) => void;
  canUploadDocument?: boolean;
}

export default function DocsTab({ projectId, toast, canUploadDocument = true }: DocsTabProps) {
  const { data: docs, loading, refetch } = useProjectDocuments(projectId);
  const [showModal, setShowModal] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docVersion, setDocVersion] = useState('1.0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (loading) return <div className="text-[13px] text-[#9CA3AF]">Загрузка...</div>;

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
    setError('');
    try {
      const fileUrl = await uploadDocument(docFile, projectId);
      await createDocument({
        project_id: projectId,
        title: docTitle.trim(),
        version: docVersion || '1.0',
        format: detectFormat(docFile.name),
        file_url: fileUrl,
      });
      toast('Документ загружен');
      refetch();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setDocFile(null);
    setDocTitle('');
    setDocVersion('1.0');
    setError('');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[14px] font-semibold">Документы</h3>
        {canUploadDocument && (
          <button className="btn btn-primary text-[12px] py-1.5 px-3" onClick={() => setShowModal(true)}>
            <Icons.Plus className="w-3.5 h-3.5" /> Загрузить
          </button>
        )}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {(docs || []).map((doc: Document) => {
          const fmt = FORMAT_COLORS[doc.format?.toUpperCase() || ''] || { bg: '#F3F4F6', text: '#6B7280' };
          return (
            <div
              key={doc.id}
              className="card p-4 cursor-pointer"
              onClick={() => {
                if (doc.file_url) {
                  window.open(doc.file_url, '_blank');
                } else {
                  toast('Файл недоступен');
                }
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: fmt.bg, color: fmt.text }}>
                  {doc.format?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{doc.title}</div>
                  <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                    {doc.version || ''} · {formatDate(doc.created_at)}
                  </div>
                </div>
              </div>
              <Bdg s={doc.status} />
            </div>
          );
        })}
        {(!docs || docs.length === 0) && (
          <div className="text-[13px] text-[#9CA3AF] col-span-full">Документов пока нет</div>
        )}
      </div>

      {/* Upload Document Modal */}
      <Modal open={showModal} onClose={closeModal} title="Загрузить документ">
        <div className="space-y-4">
          {error && (
            <div className="bg-[#FEF2F2] border border-[#DC2626]/20 text-[#DC2626] text-[13px] px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-[#111827] bg-[#F3F4F6]'
                : docFile
                ? 'border-[#111827] bg-[#F9FAFB]'
                : 'border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#D1D5DB] hover:bg-[#F3F4F6]'
            }`}
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.dwg,.xlsx,.xls,.png,.jpg,.jpeg,.svg"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            {docFile ? (
              <div>
                <div className="text-[13px] font-medium">{docFile.name}</div>
                <div className="text-[12px] text-[#6B7280] mt-1">
                  {(docFile.size / 1024 / 1024).toFixed(1)} МБ · {detectFormat(docFile.name)}
                </div>
              </div>
            ) : (
              <>
                <div className="text-[#9CA3AF] mb-2">
                  <Icons.File className="w-6 h-6 mx-auto" />
                </div>
                <div className="text-[13px] text-[#6B7280]">
                  Перетащите файл или нажмите для выбора
                </div>
                <div className="text-[11px] text-[#9CA3AF] mt-1">PDF, DWG, XLSX, PNG до 50 МБ</div>
              </>
            )}
          </div>

          <div className="modal-field">
            <label>Название</label>
            <input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Планировочное решение" />
          </div>
          <div className="modal-field">
            <label>Версия</label>
            <input value={docVersion} onChange={e => setDocVersion(e.target.value)} placeholder="1.0" />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-secondary" onClick={closeModal}>Отмена</button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={saving || !docFile || !docTitle.trim()}>
              {saving ? 'Загрузка...' : 'Загрузить'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
