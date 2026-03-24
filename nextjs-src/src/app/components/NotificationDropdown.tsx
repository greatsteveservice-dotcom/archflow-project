'use client';
import { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { useNotifications } from '../lib/hooks';

const TYPE_CONFIG: Record<string, { color: string; icon: 'alert' | 'check' | 'receipt' | 'camera' }> = {
  issue: { color: '#DC2626', icon: 'alert' },
  resolved: { color: '#16A34A', icon: 'check' },
  invoice_overdue: { color: '#D97706', icon: 'receipt' },
  invoice_new: { color: '#2563EB', icon: 'receipt' },
  visit: { color: '#2563EB', icon: 'camera' },
  photo: { color: '#6B7280', icon: 'camera' },
};

const ICON_MAP = {
  alert: Icons.Alert,
  check: Icons.Check,
  receipt: Icons.Receipt,
  camera: Icons.Camera,
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const { data: notifications, loading } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const unreadCount = notifications?.length || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="btn-secondary rounded-lg p-2 relative border border-[#E5E7EB] bg-white cursor-pointer hover:bg-[#F9FAFB] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Icons.Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-[360px] max-h-[440px] bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden z-50 animate-slide-up max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:w-auto max-sm:top-16">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">Уведомления</h3>
            {unreadCount > 0 && (
              <span className="text-[11px] text-[#9CA3AF]">{unreadCount} шт.</span>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[380px]">
            {loading ? (
              <div className="py-8 text-center text-[13px] text-[#9CA3AF]">
                <div className="inline-block w-5 h-5 border-2 border-[#E5E7EB] border-t-[#111827] rounded-full animate-spin mb-2" />
                <div>Загрузка...</div>
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((n) => {
                const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.photo;
                const IconComp = ICON_MAP[config.icon];
                return (
                  <div
                    key={n.id}
                    className="px-4 py-3 border-b border-[#F9FAFB] last:border-none hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: config.color + '14', color: config.color }}
                      >
                        <IconComp className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-[#374151] leading-relaxed">{n.text}</div>
                        <div className="text-[10px] text-[#9CA3AF] mt-0.5">{n.relativeTime}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center">
                <Icons.Bell className="w-6 h-6 text-[#D1D5DB] mx-auto mb-2" />
                <div className="text-[13px] text-[#9CA3AF]">Нет уведомлений</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
