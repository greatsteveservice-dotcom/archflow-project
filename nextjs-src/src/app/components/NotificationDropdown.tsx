'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from './Icons';
import { useNotifications } from '../lib/hooks';
import { getReadNotificationIds, markNotificationsRead, markAllNotificationsRead } from '../lib/notificationState';

const TYPE_ICON: Record<string, React.FC<{ className?: string }>> = {
  issue: Icons.Alert,
  resolved: Icons.Check,
  invoice_overdue: Icons.Receipt,
  invoice_new: Icons.Receipt,
  visit: Icons.Camera,
  supply_risk: Icons.Box,
  photo: Icons.Camera,
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const { data: notifications, loading } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load read state
  useEffect(() => {
    setReadIds(new Set(getReadNotificationIds()));
  }, []);

  // Mark visible notifications as read when dropdown opens
  useEffect(() => {
    if (open && notifications && notifications.length > 0) {
      const newIds = notifications.map(n => n.id).filter(id => !readIds.has(id));
      if (newIds.length > 0) {
        // Delay marking as read so user sees unread state briefly
        const timer = setTimeout(() => {
          markNotificationsRead(newIds);
          setReadIds(new Set(getReadNotificationIds()));
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [open, notifications, readIds]);

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

  const unreadCount = notifications?.filter(n => !readIds.has(n.id)).length || 0;

  const handleMarkAllRead = useCallback(() => {
    if (!notifications) return;
    markAllNotificationsRead(notifications.map(n => n.id));
    setReadIds(new Set(getReadNotificationIds()));
  }, [notifications]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="btn-secondary rounded-lg p-2 relative border border-line bg-srf cursor-pointer hover:bg-srf-raised transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Icons.Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-ink rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-[360px] max-h-[440px] bg-srf border border-line rounded-xl shadow-lg overflow-hidden z-50 animate-slide-up max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:w-auto max-sm:top-16">
          {/* Header */}
          <div className="px-4 py-3 border-b border-line-light flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">Уведомления</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <>
                  <span className="text-[11px] text-ink-faint">{unreadCount} новых</span>
                  <button
                    className="text-[11px] text-ink-muted hover:text-ink transition-colors"
                    onClick={handleMarkAllRead}
                  >
                    Прочитать все
                  </button>
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[380px]">
            {loading ? (
              <div className="py-8 text-center text-[13px] text-ink-faint">
                <div className="inline-block w-5 h-5 border-2 border-line border-t-ink rounded-full animate-spin mb-2" />
                <div>Загрузка...</div>
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((n) => {
                const IconComp = TYPE_ICON[n.type] || TYPE_ICON.photo;
                const isUnread = !readIds.has(n.id);
                const isUrgent = n.type === 'issue' || n.type === 'invoice_overdue' || n.type === 'supply_risk';
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-srf-raised last:border-none hover:bg-srf-raised transition-colors ${isUnread ? 'bg-srf-secondary/50' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isUrgent ? 'bg-ink text-srf' : 'bg-srf-secondary text-ink-muted'
                        }`}
                      >
                        <IconComp className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[12px] leading-relaxed ${isUnread ? 'text-ink font-medium' : 'text-ink-secondary'}`}>{n.text}</div>
                        <div className="text-[10px] text-ink-faint mt-0.5">{n.relativeTime}</div>
                      </div>
                      {isUnread && (
                        <div className="w-1.5 h-1.5 rounded-full bg-ink flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center">
                <Icons.Bell className="w-6 h-6 text-ink-ghost mx-auto mb-2" />
                <div className="text-[13px] text-ink-faint">Нет уведомлений</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
