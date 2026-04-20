'use client';

import type { CanvasTool } from '../../lib/types';

const TOOLS: { id: CanvasTool; key: string; label: string }[] = [
  { id: 'select', key: 'V', label: 'Выбор' },
  { id: 'image', key: 'I', label: 'Изображение' },
  { id: 'text', key: 'T', label: 'Текст' },
  { id: 'section', key: 'R', label: 'Секция' },
  { id: 'arrow', key: 'A', label: 'Стрелка' },
  { id: 'catalog', key: 'C', label: 'Каталог' },
];

interface Props {
  tool: CanvasTool;
  onToolChange: (t: CanvasTool) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onExportPng: () => void;
  onShare: () => void;
  isPublic: boolean;
}

export default function CanvasToolbar({
  tool, onToolChange, zoom, onZoomIn, onZoomOut, onFitView, onExportPng, onShare, isPublic,
}: Props) {
  return (
    <div className="af-canvas-toolbar">
      {/* Tools */}
      <div className="af-canvas-toolbar-group">
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`af-canvas-tool-btn${tool === t.id ? ' active' : ''}`}
            onClick={() => onToolChange(t.id)}
            title={`${t.label} (${t.key})`}
          >
            {t.key}
          </button>
        ))}
      </div>

      <div className="af-canvas-toolbar-divider" />

      {/* Zoom */}
      <div className="af-canvas-toolbar-group">
        <button className="af-canvas-tool-btn" onClick={onZoomOut} title="Уменьшить">-</button>
        <span className="af-canvas-zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="af-canvas-tool-btn" onClick={onZoomIn} title="Увеличить">+</button>
      </div>

      <div className="af-canvas-toolbar-divider" />

      <button className="af-canvas-tool-btn" onClick={onFitView} title="Показать всё">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="12" height="12" />
          <line x1="1" y1="5" x2="13" y2="5" />
          <line x1="5" y1="1" x2="5" y2="13" />
        </svg>
      </button>

      <div className="af-canvas-toolbar-divider" />

      {/* Export + Share */}
      <button className="af-canvas-tool-btn" onClick={onExportPng} title="Экспорт PNG">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 1v8" />
          <path d="M3 6l4 4 4-4" />
          <path d="M2 12h10" />
        </svg>
      </button>

      <button
        className={`af-canvas-tool-btn${isPublic ? ' active' : ''}`}
        onClick={onShare}
        title={isPublic ? 'Скопировать публичную ссылку' : 'Сделать публичным'}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="3.5" cy="7" r="2" />
          <circle cx="10.5" cy="3.5" r="2" />
          <circle cx="10.5" cy="10.5" r="2" />
          <line x1="5.2" y1="6" x2="8.8" y2="4.4" />
          <line x1="5.2" y1="8" x2="8.8" y2="9.6" />
        </svg>
      </button>
    </div>
  );
}
