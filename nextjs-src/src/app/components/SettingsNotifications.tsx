"use client";

import { useState } from "react";
import { Icons } from "./Icons";
import { useNotifications } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { updateProfile } from "../lib/queries";
import type { Notification } from "../lib/types";

// ======================== NOTIFICATIONS PAGE ========================

const typeColors: Record<string, string> = {
  issue: "#E85D3A",
  resolved: "#2A9D5C",
  invoice_overdue: "#DC2626",
  invoice_new: "#D4930D",
  visit: "#2C5F2D",
  photo: "#6366F1",
};

export function NotificationsPage() {
  const { data: notifications, loading, error } = useNotifications();

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="text-[#9B9B9B] text-sm">Загрузка уведомлений…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="text-[#E85D3A] text-sm">Ошибка: {error}</div>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-20">
        <Icons.Bell className="w-10 h-10 text-[#D5D3CE] mb-3" />
        <div className="text-[#9B9B9B] text-sm">Нет уведомлений</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-white border border-[#E8E6E1] rounded-xl px-5 py-1">
        {notifications.map((n: Notification) => (
          <div
            key={n.id}
            className="flex items-start gap-3 py-3 border-b border-[#F0EEE9] last:border-none"
            style={{ opacity: n.read ? 0.65 : 1 }}
          >
            <div
              className="w-2 h-2 rounded-full mt-[5px] flex-shrink-0"
              style={{ background: typeColors[n.type] || "#9B9B9B" }}
            />
            <div className="flex-1">
              <div className="text-[13px] text-[#6B6B6B] leading-relaxed">{n.text}</div>
              <div className="text-[11px] text-[#9B9B9B] mt-0.5">{n.relativeTime}</div>
            </div>
            {!n.read && (
              <div className="w-2 h-2 rounded-full bg-[#2C5F2D] mt-1.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ======================== SETTINGS PAGE ========================

export function SettingsPage() {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [telegramId, setTelegramId] = useState(profile?.telegram_id || "");
  const [company, setCompany] = useState(profile?.company || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      setMessage({ type: "success", text: "Профиль сохранён" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Ошибка сохранения";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const toggles = [
    { label: "Новые замечания", on: true },
    { label: "Просроченные замечания", on: true },
    { label: "Просмотр отчёта заказчиком", on: true },
    { label: "Исправление подрядчиком", on: false },
  ];

  return (
    <div className="animate-fade-in">
      <div className="bg-white border border-[#E8E6E1] rounded-xl p-6 max-w-[560px]">
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

        <h3 className="text-base font-semibold mt-7 mb-5 pt-5 border-t border-[#F0EEE9]">
          Уведомления
        </h3>
        {toggles.map((item, i) => (
          <div
            key={i}
            className={`flex justify-between items-center py-2.5 ${
              i < toggles.length - 1 ? "border-b border-[#F0EEE9]" : ""
            }`}
          >
            <span className="text-sm text-[#6B6B6B]">{item.label}</span>
            <div
              className="w-10 h-[22px] rounded-full relative cursor-pointer transition-colors duration-200"
              style={{ background: item.on ? "#2C5F2D" : "#E8E6E1" }}
            >
              <div
                className="w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] transition-[left] duration-200"
                style={{
                  left: item.on ? 20 : 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              />
            </div>
          </div>
        ))}

        <div className="mt-6 flex items-center gap-3">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          {message && (
            <span className={`text-sm ${message.type === "success" ? "text-[#2A9D5C]" : "text-[#E85D3A]"}`}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
