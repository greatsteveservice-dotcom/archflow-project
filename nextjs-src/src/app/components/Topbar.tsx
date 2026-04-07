'use client';

import { useAuth } from '../lib/auth';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface TopbarProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  depth?: number; // 1–4 for progress indicator
  contextLabel?: string;
  onMenuToggle?: () => void;
  onSearchOpen?: () => void;
  onLogoClick?: () => void;
}

export default function Topbar({ title, breadcrumbs, actions, depth = 1, contextLabel, onMenuToggle, onSearchOpen, onLogoClick }: TopbarProps) {
  const { profile } = useAuth();

  const roleLabel: Record<string, string> = {
    designer: 'Дизайнер',
    client: 'Заказчик',
    contractor: 'Подрядчик',
    supplier: 'Комплектатор',
    assistant: 'Ассистент',
  };

  const ctx = contextLabel || roleLabel[profile?.role || ''] || '';

  return (
    <div className="bg-white">
      {/* Top bar: logo + context */}
      <div className="af-topbar">
        <span className="af-topbar-logo" onClick={onLogoClick}>
          <img src="/logo.png" alt="ArchFlow" style={{ height: 28, width: 'auto' }} />
        </span>
        <div className="af-topbar-right">
          {onSearchOpen && (
            <button
              onClick={onSearchOpen}
              className="af-topbar-context"
              style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '4px 0' }}
              title="Поиск (⌘K)"
            >
              ⌘K
            </button>
          )}
          {actions}
          <span className="af-topbar-context">{ctx}</span>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="af-progress">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`af-progress-line ${i <= depth ? 'active' : ''}`} />
        ))}
      </div>

      {/* Breadcrumb */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="af-breadcrumb">
          {breadcrumbs.map((b, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span className="af-crumb-sep">/</span>}
              {b.onClick ? (
                <button className="af-crumb" onClick={b.onClick}>{b.label}</button>
              ) : (
                <span className="af-crumb active">{b.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
