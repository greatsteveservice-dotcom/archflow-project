"use client";

import Sidebar from "../components/Sidebar";

const toggles = [
  { label: "Новые замечания", on: true },
  { label: "Просроченные замечания", on: true },
  { label: "Просмотр отчёта заказчиком", on: true },
  { label: "Исправление подрядчиком", on: false },
];

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-zhan-bg">
      <Sidebar />
      <div className="flex-1 overflow-y-auto main-scroll">
        <div className="px-8 py-5 flex items-center justify-between border-b border-zhan-border bg-zhan-surface sticky top-0 z-10">
          <h1 className="text-xl font-semibold">Настройки</h1>
        </div>

        <div className="p-8 animate-fade-in">
          <div className="bg-zhan-surface border border-zhan-border rounded-xl p-6 max-w-[560px]">
            <h3 className="text-base font-semibold mb-5">Профиль</h3>

            {[
              { label: "Имя", value: "Алиса Флоренс" },
              { label: "Email", value: "alisa@florence-design.ru" },
              { label: "Telegram ID", value: "@aflorence" },
              { label: "Компания", value: "Florence Design Studio" },
            ].map((field, i) => (
              <div key={i} className="mb-4">
                <label className="block text-xs font-medium text-zhan-text-secondary mb-1.5">{field.label}</label>
                <input
                  type="text"
                  defaultValue={field.value}
                  className="w-full px-3 py-2.5 border border-zhan-border rounded-lg text-sm outline-none focus:border-zhan-accent transition-colors"
                />
              </div>
            ))}

            <h3 className="text-base font-semibold mt-7 mb-5 pt-5 border-t border-zhan-border-light">Уведомления</h3>

            {toggles.map((toggle, i) => (
              <div
                key={i}
                className={`flex justify-between items-center py-2.5 ${i < toggles.length - 1 ? "border-b border-zhan-border-light" : ""}`}
              >
                <span className="text-sm text-zhan-text-secondary">{toggle.label}</span>
                <div
                  className={`w-10 h-[22px] rounded-full relative cursor-pointer transition-colors ${toggle.on ? "bg-zhan-accent" : "bg-zhan-border"}`}
                >
                  <div
                    className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] shadow-sm transition-all ${toggle.on ? "left-5" : "left-0.5"}`}
                  />
                </div>
              </div>
            ))}

            <div className="mt-6">
              <button className="px-4 py-2 rounded-lg text-[13px] font-medium bg-zhan-accent text-white hover:bg-zhan-accent-hover transition-colors">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
