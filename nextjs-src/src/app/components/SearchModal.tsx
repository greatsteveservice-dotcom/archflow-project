'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from './Icons';
import { globalSearch, type SearchResult } from '../lib/queries';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: string, ctx?: any) => void;
}

const TYPE_LABELS: Record<string, string> = {
  project: 'Проект',
  visit: 'Визит',
  document: 'Документ',
  supply: 'Комплектация',
  task: 'Задача',
};

const TYPE_ICONS: Record<string, string> = {
  project: 'Folder',
  visit: 'Camera',
  document: 'File',
  supply: 'Box',
  task: 'Check',
};

export default function SearchModal({ open, onClose, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await globalSearch(q);
      setResults(res);
      setSelectedIdx(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = useCallback((result: SearchResult) => {
    onClose();
    switch (result.type) {
      case 'project':
        onNavigate('project', result.projectId); break;
      case 'visit':
        onNavigate('visit', { projectId: result.projectId, visitId: result.visitId }); break;
      case 'document':
      case 'supply':
      case 'task':
        onNavigate('project', result.projectId); break;
    }
  }, [onClose, onNavigate]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIdx]) {
        handleSelect(results[selectedIdx]);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, results, selectedIdx, onClose, handleSelect]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ═══ VOICE INPUT ═══
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(250);
      setRecording(true);
    } catch {
      // silently ignore mic permission denial
    }
  }, []);

  const stopAndTranscribe = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;

    const mimeType = mr.mimeType || 'audio/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
    });
    streamRef.current?.getTracks().forEach(t => t.stop());
    setRecording(false);

    const blob = new Blob(chunksRef.current, { type: mimeType });
    if (blob.size < 500) return;

    setTranscribing(true);
    try {
      const form = new FormData();
      form.append('audio', blob, `voice.${ext}`);
      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok && data.text) {
        handleChange(data.text);
        inputRef.current?.focus();
      }
    } catch {
      // silent
    } finally {
      setTranscribing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMicClick = () => {
    if (recording) stopAndTranscribe();
    else startRecording();
  };

  if (!open) return null;

  const getIcon = (type: string) => {
    const iconMap: Record<string, React.FC<{ className?: string }>> = {
      Folder: Icons.Folder, Camera: Icons.Camera, File: Icons.File, Box: Icons.Box, Check: Icons.Check,
    };
    const IconComp = iconMap[TYPE_ICONS[type]] || Icons.Search;
    return <IconComp className="w-4 h-4 text-ink-muted flex-shrink-0" />;
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 backdrop-blur-sm animate-fade-in pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="bg-srf w-full max-w-[560px] mx-4 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input with mic */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-line">
          <Icons.Search className="w-5 h-5 text-ink-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск или голос"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-ink-faint min-w-0"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-ink-faint border-t-ink rounded-full animate-spin flex-shrink-0" />
          )}
          {/* Mic button */}
          <button
            type="button"
            onClick={handleMicClick}
            aria-label={recording ? 'Остановить запись' : 'Голосовой поиск'}
            className="flex-shrink-0"
            style={{
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: recording ? '#111' : 'transparent',
              color: recording ? '#FFF' : '#111',
              border: '0.5px solid ' + (recording ? '#111' : '#EBEBEB'),
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            disabled={transcribing}
          >
            {transcribing ? (
              <div className="w-4 h-4 border-2 border-ink-faint border-t-ink rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <rect x="7" y="3" width="6" height="10" rx="3" fill={recording ? 'currentColor' : 'none'} />
                <path d="M5 11 C5 14 7.2 16 10 16 C12.8 16 15 14 15 11" />
                <line x1="10" y1="16" x2="10" y2="18" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex-shrink-0"
            style={{
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: '0.5px solid #EBEBEB',
              color: '#111', cursor: 'pointer',
              fontFamily: 'var(--af-font)', fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto">
          {recording && (
            <div className="px-4 py-6 text-center" style={{ fontFamily: 'var(--af-font)', fontSize: 12, color: '#111' }}>
              Запись... Нажмите микрофон, чтобы остановить
            </div>
          )}
          {transcribing && !recording && (
            <div className="px-4 py-6 text-center" style={{ fontFamily: 'var(--af-font)', fontSize: 12, color: '#999' }}>
              Расшифровка...
            </div>
          )}
          {!recording && !transcribing && query.trim().length >= 2 && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-ink-faint text-[14px]">Ничего не найдено</div>
          )}
          {!recording && !transcribing && query.trim().length < 2 && !loading && (
            <div className="px-4 py-6 text-center text-ink-faint text-[13px]">
              Введите запрос или нажмите микрофон
            </div>
          )}
          {results.length > 0 && (
            <div className="py-2">
              {results.map((r, i) => (
                <div
                  key={`${r.type}-${r.id}`}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    i === selectedIdx ? 'bg-srf-secondary' : 'hover:bg-srf-secondary/50'
                  }`}
                  onClick={() => handleSelect(r)}
                  onMouseEnter={() => setSelectedIdx(i)}
                >
                  {getIcon(r.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate">{r.title}</div>
                    <div className="text-[12px] text-ink-muted truncate">{r.subtitle}</div>
                  </div>
                  <span className="text-[11px] text-ink-faint bg-srf-secondary px-2 py-0.5 flex-shrink-0">
                    {TYPE_LABELS[r.type]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
