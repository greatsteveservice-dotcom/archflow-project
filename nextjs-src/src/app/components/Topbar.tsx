'use client';
import { Icons } from './Icons';
import NotificationDropdown from './NotificationDropdown';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface TopbarProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  onMenuToggle?: () => void;
  onSearchOpen?: () => void;
}

export default function Topbar({ title, breadcrumbs, actions, onMenuToggle, onSearchOpen }: TopbarProps) {
  return (
    <div className="px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-line bg-srf sticky top-0 z-10 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Гамбургер — только мобиле */}
        {onMenuToggle && (
          <button className="md:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-srf-secondary flex-shrink-0" onClick={onMenuToggle}>
            <Icons.Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          {breadcrumbs && (
            <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-ink-faint mb-0.5">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <Icons.ChevronRight className="w-3 h-3" />}
                  {b.onClick ? (
                    <span className="cursor-pointer hover:text-ink-secondary transition-colors" onClick={b.onClick}>{b.label}</span>
                  ) : (
                    <span className="text-ink-muted">{b.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-[17px] sm:text-[20px] font-semibold truncate">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {onSearchOpen && (
          <button
            className="p-2 rounded-lg hover:bg-srf-secondary transition-colors flex items-center gap-2"
            onClick={onSearchOpen}
            title="Поиск (⌘K)"
          >
            <Icons.Search className="w-4 h-4 text-ink-muted" />
            <kbd className="hidden lg:inline-flex text-[11px] text-ink-faint bg-srf-secondary px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        )}
        {actions}
        <NotificationDropdown />
      </div>
    </div>
  );
}
