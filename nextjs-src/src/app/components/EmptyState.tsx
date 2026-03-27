'use client';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="af-empty">
      <div className="af-empty-dash">—</div>
      <div className="af-empty-label">{title}</div>
      {description && (
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          color: '#AAA',
          marginTop: 8,
          maxWidth: 320,
        }}>
          {description}
        </p>
      )}
      {action && (
        <button className="af-empty-btn" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
