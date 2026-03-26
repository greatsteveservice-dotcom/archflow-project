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

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-srf-secondary flex items-center justify-center mb-4 text-ink-faint">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-ink-secondary mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-ink-faint max-w-[320px]">{description}</p>
      )}
      {action && (
        <button
          className="btn btn-primary mt-4 text-[13px]"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
