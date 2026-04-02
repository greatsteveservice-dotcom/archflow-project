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
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
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

  // Navigate to result
  const handleSelect = useCallback((result: SearchResult) => {
    onClose();
    switch (result.type) {
      case 'project':
        onNavigate('project', result.projectId);
        break;
      case 'visit':
        onNavigate('visit', { projectId: result.projectId, visitId: result.visitId });
        break;
      case 'document':
      case 'supply':
      case 'task':
        onNavigate('project', result.projectId);
        break;
    }
  }, [onClose, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
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

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const getIcon = (type: string) => {
    const iconMap: Record<string, React.FC<{ className?: string }>> = {
      Folder: Icons.Folder,
      Camera: Icons.Camera,
      File: Icons.File,
      Box: Icons.Box,
      Check: Icons.Check,
    };
    const IconComp = iconMap[TYPE_ICONS[type]] || Icons.Search;
    return <IconComp className="w-4 h-4 text-ink-muted flex-shrink-0" />;
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 backdrop-blur-sm animate-fade-in pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="bg-srf w-full max-w-[560px] mx-4 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <Icons.Search className="w-5 h-5 text-ink-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск по проектам, визитам, документам…"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-ink-faint"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-ink-faint border-t-ink rounded-full animate-spin flex-shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex text-[11px] text-ink-faint bg-srf-secondary px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-ink-faint text-[14px]">
              Ничего не найдено
            </div>
          )}

          {query.trim().length < 2 && !loading && (
            <div className="px-4 py-6 text-center text-ink-faint text-[13px]">
              Введите минимум 2 символа для поиска
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

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-line flex items-center gap-4 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1">
            <kbd className="bg-srf-secondary px-1 py-0.5 font-mono">↑↓</kbd> навигация
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-srf-secondary px-1 py-0.5 font-mono">Enter</kbd> открыть
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-srf-secondary px-1 py-0.5 font-mono">Esc</kbd> закрыть
          </span>
        </div>
      </div>
    </div>
  );
}
