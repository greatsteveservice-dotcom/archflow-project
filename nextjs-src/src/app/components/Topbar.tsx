'use client';

import { useState } from 'react';
import { useAuth } from '../lib/auth';
import ProfileCabinet from './ProfileCabinet';

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

  void roleLabel;
  const ctx = contextLabel || '';
  const [showCabinet, setShowCabinet] = useState<false | 'main' | 'billing' | 'settings' | 'profile'>(false);

  const firstName = (profile?.full_name || '').split(' ')[0] || '';
  const lastName = (profile?.full_name || '').split(' ')[1] || '';
  const initials = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase() || 'A';
  const shortName = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;

  return (
    <div className="af-topbar-wrapper">
      {/* Top bar: logo + context */}
      <div className="af-topbar">
        <span className="af-topbar-logo" onClick={onLogoClick}>
          <img src="/logo.png" alt="ArchFlow" style={{ height: 28, width: 'auto' }} />
        </span>
        <div className="af-topbar-right">
          {actions}
          {ctx && <span className="af-topbar-context">{ctx}</span>}
          {profile && (
            <button
              type="button"
              onClick={() => setShowCabinet('main')}
              aria-label="Личный кабинет"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, marginLeft: 8,
              }}
            >
              <span style={{
                fontFamily: 'var(--af-font)', fontSize: 11,
                fontWeight: 700, color: '#111',
                whiteSpace: 'nowrap', maxWidth: 120,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: 'none',
              }}
              className="af-topbar-user-name">
                {shortName}
              </span>
              <span style={{
                width: 30, height: 30, background: '#111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: 'var(--af-font)', fontSize: 10,
                  fontWeight: 700, color: '#F6F6F4',
                  letterSpacing: '0.04em',
                }}>
                  {initials}
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
      {showCabinet && (
        <ProfileCabinet
          initialScreen={showCabinet}
          onClose={() => setShowCabinet(false)}
        />
      )}

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
