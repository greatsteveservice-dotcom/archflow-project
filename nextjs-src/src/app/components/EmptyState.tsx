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
      <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-4 text-[#9CA3AF]">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-[#374151] mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-[#9CA3AF] max-w-[320px]">{description}</p>
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
