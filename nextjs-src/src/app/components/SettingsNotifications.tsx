"use client";

import { Icons } from "./Icons";

const notifications = [
  { type: "issue", text: "Замечание «Перегородка в спальне» — срок исправления истекает завтра", time: "5 ч. назад", read: false },
  { type: "view", text: "Анна Козлова просмотрела отчёт по визиту от 28.02.2026", time: "вчера", read: false },
  { type: "resolved", text: "Замечание «Разводка сантехники» — исправлено подрядчиком", time: "2 дня назад", read: true },
  { type: "invite", text: "Сергей Петров принял приглашение в проект «Загородный дом в Барвихе»", time: "3 дня назад", read: true },
  { type: "photo", text: "Подрядчик загрузил фото исправления в «Квартира на Патриарших»", time: "4 дня назад", read: true },
];

const typeColors: Record<string, string> = {
  issue: "#E85D3A",
  view: "#D4930D",
  resolved: "#2A9D5C",
  invite: "#2C5F2D",
  photo: "#6366F1",
};

export function NotificationsPage() {
  return (
    <div className="animate-fade-in">
      <div className="bg-white border border-[#E8E6E1] rounded-xl px-5 py-1">
        {notifications.map((n, i) => (
          <div
            key={i}
            className="flex items-start gap-3 py-3 border-b border-[#F0EEE9] last:border-none"
            style={{ opacity: n.read ? 0.65 : 1 }}
          >
            <div
              className="w-2 h-2 rounded-full mt-[5px] flex-shrink-0"
              style={{ background: typeColors[n.type] }}
            />
            <div className="flex-1">
              <div className="text-[13px] text-[#6B6B6B] leading-relaxed">{n.text}</div>
              <div className="text-[11px] text-[#9B9B9B] mt-0.5">{n.time}</div>
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

export function SettingsPage() {
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
          <input type="text" defaultValue="Алиса Флоренс" />
        </div>
        <div className="modal-field mb-4">
          <label>Email</label>
          <input type="email" defaultValue="alisa@florence-design.ru" />
        </div>
        <div className="modal-field mb-4">
          <label>Telegram ID</label>
          <input type="text" defaultValue="@aflorence" />
        </div>
        <div className="modal-field mb-4">
          <label>Компания</label>
          <input type="text" defaultValue="Florence Design Studio" />
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

        <div className="mt-6">
          <button className="btn btn-primary">Сохранить</button>
        </div>
      </div>
    </div>
  );
}
