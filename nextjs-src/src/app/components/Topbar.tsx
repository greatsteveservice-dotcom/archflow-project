'use client';
import { Icons } from './Icons';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface TopbarProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  onMenuToggle?: () => void;
}

export default function Topbar({ title, breadcrumbs, actions, onMenuToggle }: TopbarProps) {
  return (
    <div className="px-4 sm:px-7 py-4 flex items-center justify-between border-b border-[#E5E7EB] bg-white sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        {onMenuToggle && (
          <button className="md:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-[#F3F4F6]" onClick={onMenuToggle}>
            <Icons.Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          {breadcrumbs && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF] mb-0.5">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <Icons.ChevronRight className="w-3 h-3" />}
                  {b.onClick ? (
                    <span className="cursor-pointer hover:text-[#374151] transition-colors" onClick={b.onClick}>{b.label}</span>
                  ) : (
                    <span className="text-[#6B7280]">{b.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-[17px] font-semibold truncate">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
        <button className="btn-secondary rounded-lg p-2 relative border border-[#E5E7EB] bg-white cursor-pointer">
          <Icons.Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </div>
  );
}
