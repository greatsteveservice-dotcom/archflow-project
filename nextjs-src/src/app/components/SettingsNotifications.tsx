"use client";

import { useState, useEffect } from "react";
import { Icons } from "./Icons";
import { useNotifications } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { updateProfile } from "../lib/queries";
import type { Notification } from "../lib/types";
import {
  getReadNotificationIds,
  markAllNotificationsRead,
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "../lib/notificationState";

// ======================== СТРАНИЦА УВЕДОМЛЕНИЙ ========================

const TYPE_ICON: Record<string, React.FC<{ className?: string }>> = {
  issue: Icons.Alert,
  resolved: Icons.Check,
  invoice_overdue: Icons.Receipt,
  invoice_new: Icons.Receipt,
  visit: Icons.Camera,
  supply_risk: Icons.Box,
  photo: Icons.Camera,
};

export function NotificationsPage() {
  const { data: notifications, loading, error } = useNotifications();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(new Set(getReadNotificationIds()));
  }, []);

  const handleMarkAllRead = () => {
    if (!notifications) return;
    markAllNotificationsRead(notifications.map(n => n.id));
    setReadIds(new Set(getReadNotificationIds()));
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="text-ink-faint text-sm">Загрузка уведомлений…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="text-err text-sm">Ошибка: {error}</div>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-20">
        <Icons.Bell className="w-10 h-10 text-ink-ghost mb-3" />
        <div className="text-ink-faint text-sm">Нет уведомлений</div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  return (
    <div className="animate-fade-in">
      {unreadCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            className="text-[12px] text-ink-muted hover:text-ink transition-colors"
            onClick={handleMarkAllRead}
          >
            Отметить все как прочитанные ({unreadCount})
          </button>
        </div>
      )}
      <div className="bg-srf border border-line rounded-xl px-5 py-1">
        {notifications.map((n: Notification) => {
          const isRead = readIds.has(n.id);
          const IconComp = TYPE_ICON[n.type] || TYPE_ICON.photo;
          const isUrgent = n.type === 'issue' || n.type === 'invoice_overdue' || n.type === 'supply_risk';
          return (
            <div
              key={n.id}
              className={`flex items-start gap-3 py-3 border-b border-line-light last:border-none ${isRead ? 'opacity-60' : ''}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                isUrgent && !isRead ? 'bg-ink text-white' : 'bg-srf-secondary text-ink-muted'
              }`}>
                <IconComp className="w-3 h-3" />
              </div>
              <div className="flex-1">
                <div className={`text-[13px] leading-relaxed ${isRead ? 'text-ink-muted' : 'text-ink font-medium'}`}>{n.text}</div>
                <div className="text-[11px] text-ink-faint mt-0.5">{n.relativeTime}</div>
              </div>
              {!isRead && (
                <div className="w-1.5 h-1.5 rounded-full bg-ink mt-1.5 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ======================== СТРАНИЦА НАСТРОЕК ========================

export function SettingsPage() {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [telegramId, setTelegramId] = useState(profile?.telegram_id || "");
  const [company, setCompany] = useState(profile?.company || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Настройки уведомлений
  const [prefs, setPrefs] = useState<NotificationPrefs>(getNotificationPrefs());

  // Sync state when profile loads
  const [lastProfileId, setLastProfileId] = useState<string | null>(null);
  if (profile && profile.id !== lastProfileId) {
    setLastProfileId(profile.id);
    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setTelegramId(profile.telegram_id || "");
    setCompany(profile.company || "");
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({ full_name: fullName, phone, telegram_id: telegramId, company });
      saveNotificationPrefs(prefs);
      setMessage({ type: "success", text: "Настройки сохранены" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Ошибка сохранения";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: keyof NotificationPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveNotificationPrefs(updated);
  };

  const toggles: { label: string; key: keyof NotificationPrefs }[] = [
    { label: "Новые замечания", key: "issues" },
    { label: "Просроченные счета", key: "overdue" },
    { label: "Просмотр отчёта заказчиком", key: "clientView" },
    { label: "Исправление подрядчиком", key: "contractorFix" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="bg-srf border border-line rounded-xl p-6 max-w-[560px]">
        <h3 className="text-base font-semibold mb-5">Профиль</h3>
        <div className="modal-field mb-4">
          <label>Имя</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="modal-field mb-4">
          <label>Email</label>
          <input type="email" value={profile?.email || ""} disabled className="opacity-60 cursor-not-allowed" />
        </div>
        <div className="modal-field mb-4">
          <label>Телефон</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" />
        </div>
        <div className="modal-field mb-4">
          <label>Telegram ID</label>
          <input type="text" value={telegramId} onChange={(e) => setTelegramId(e.target.value)} placeholder="@username" />
        </div>
        <div className="modal-field mb-4">
          <label>Компания</label>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>

        <h3 className="text-base font-semibold mt-7 mb-5 pt-5 border-t border-line-light">
          Уведомления
        </h3>
        {toggles.map((item, i) => (
          <div
            key={item.key}
            className={`flex justify-between items-center py-2.5 ${
              i < toggles.length - 1 ? "border-b border-line-light" : ""
            }`}
          >
            <span className="text-sm text-ink-muted">{item.label}</span>
            <button
              type="button"
              onClick={() => togglePref(item.key)}
              className={`w-10 h-[22px] rounded-full relative cursor-pointer transition-colors duration-200 ${
                prefs[item.key] ? 'bg-ink' : 'bg-line'
              }`}
            >
              <div
                className="w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] transition-all duration-200 shadow-sm"
                style={{ left: prefs[item.key] ? 20 : 2 }}
              />
            </button>
          </div>
        ))}

        <div className="mt-6 flex items-center gap-3">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          {message && (
            <span className={`text-sm ${message.type === "success" ? "text-ok" : "text-err"}`}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
