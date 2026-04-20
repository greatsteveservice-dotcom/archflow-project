'use client';

import { useState } from 'react';
import type { CanvasTool } from '../../lib/types';

interface ToolDef {
  id: CanvasTool;
  key: string;
  label: string;
  icon: React.ReactNode;
}

const TOOLS: ToolDef[] = [
  { id: 'select', key: 'V', label: 'Выбор', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M3 2 L3 13 L6 10 L8 14 L10 13 L8 9 L12 9 Z" fill="currentColor" />
    </svg>
  )},
  { id: 'image', key: 'I', label: 'Изображение', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1.5" y="2.5" width="13" height="11" />
      <circle cx="5" cy="6" r="1" fill="currentColor" />
      <path d="M1.5 11 L5 8 L8 10.5 L11 6.5 L14.5 10.5" />
    </svg>
  )},
  { id: 'text', key: 'T', label: 'Текст', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4 L3 3 L13 3 L13 4" />
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="6" y1="13" x2="10" y2="13" />
    </svg>
  )},
  { id: 'section', key: 'R', label: 'Секция', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 2">
      <rect x="1.5" y="2.5" width="13" height="11" />
    </svg>
  )},
  { id: 'arrow', key: 'A', label: 'Стрелка', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="13" x2="13" y2="3" />
      <polyline points="8,3 13,3 13,8" />
    </svg>
  )},
  { id: 'catalog', key: 'C', label: 'Каталог', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2" y="3" width="12" height="10" />
      <line x1="2" y1="6" x2="14" y2="6" />
      <line x1="6" y1="9" x2="10" y2="9" />
      <line x1="6" y1="11" x2="8.5" y2="11" />
    </svg>
  )},
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
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function CanvasToolbar({
  tool, onToolChange, zoom, onZoomIn, onZoomOut, onFitView, onExportPng, onShare, isPublic,
  onToggleSidebar, sidebarOpen,
}: Props) {
  const activeTool = TOOLS.find(t => t.id === tool);

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
            aria-label={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Active tool label (mobile helper) */}
      {activeTool && (
        <div className="af-canvas-tool-hint">{activeTool.label}</div>
      )}

      <div className="af-canvas-toolbar-divider" />

      {/* Zoom */}
      <div className="af-canvas-toolbar-group">
        <button className="af-canvas-tool-btn" onClick={onZoomOut} title="Уменьшить" aria-label="Уменьшить">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="7" x2="11" y2="7" /></svg>
        </button>
        <span className="af-canvas-zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="af-canvas-tool-btn" onClick={onZoomIn} title="Увеличить" aria-label="Увеличить">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="7" x2="11" y2="7" /><line x1="7" y1="3" x2="7" y2="11" /></svg>
        </button>
      </div>

      <button className="af-canvas-tool-btn" onClick={onFitView} title="Показать всё" aria-label="Показать всё">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 5 L2 2 L5 2" />
          <path d="M12 5 L12 2 L9 2" />
          <path d="M2 9 L2 12 L5 12" />
          <path d="M12 9 L12 12 L9 12" />
        </svg>
      </button>

      <div className="af-canvas-toolbar-divider" />

      {/* Export + Share */}
      <button className="af-canvas-tool-btn" onClick={onExportPng} title="Экспорт PNG" aria-label="Экспорт PNG">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="2" x2="7" y2="9" />
          <polyline points="4,6 7,9 10,6" />
          <line x1="2" y1="12" x2="12" y2="12" />
        </svg>
      </button>

      <button
        className={`af-canvas-tool-btn${isPublic ? ' active' : ''}`}
        onClick={onShare}
        title={isPublic ? 'Скопировать публичную ссылку' : 'Сделать публичным'}
        aria-label="Поделиться"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="3.5" cy="7" r="1.8" />
          <circle cx="10.5" cy="3.5" r="1.8" />
          <circle cx="10.5" cy="10.5" r="1.8" />
          <line x1="5.2" y1="6" x2="8.8" y2="4.4" />
          <line x1="5.2" y1="8" x2="8.8" y2="9.6" />
        </svg>
      </button>

      {/* Mobile sidebar toggle */}
      {onToggleSidebar && (
        <button
          className={`af-canvas-tool-btn af-canvas-mobile-only${sidebarOpen ? ' active' : ''}`}
          onClick={onToggleSidebar}
          title="Свойства"
          aria-label="Открыть панель"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="10" height="10" />
            <line x1="8" y1="2" x2="8" y2="12" />
          </svg>
        </button>
      )}
    </div>
  );
}
