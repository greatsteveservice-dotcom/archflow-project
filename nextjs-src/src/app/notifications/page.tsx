import Sidebar from "../components/Sidebar";

const notifications = [
  { type: "issue", text: "Замечание «Перегородка в спальне» — срок исправления истекает завтра", time: "5 ч. назад", read: false },
  { type: "view", text: "Анна Козлова просмотрела отчёт по визиту от 28.02.2026", time: "вчера", read: false },
  { type: "resolved", text: "Замечание «Разводка сантехники» — исправлено подрядчиком", time: "2 дня назад", read: true },
  { type: "invite", text: "Сергей Петров принял приглашение в проект «Загородный дом в Барвихе»", time: "3 дня назад", read: true },
  { type: "photo", text: "Подрядчик загрузил фото исправления в «Квартира на Патриарших»", time: "4 дня назад", read: true },
];

const typeColors: Record<string, string> = {
  issue: "bg-zhan-danger",
  view: "bg-zhan-warning",
  resolved: "bg-zhan-success",
  invite: "bg-zhan-accent",
  photo: "bg-indigo-500",
};

export default function NotificationsPage() {
  return (
    <div className="flex min-h-screen bg-zhan-bg">
      <Sidebar />
      <div className="flex-1 overflow-y-auto main-scroll">
        <div className="px-8 py-5 flex items-center justify-between border-b border-zhan-border bg-zhan-surface sticky top-0 z-10">
          <h1 className="text-xl font-semibold">Уведомления</h1>
        </div>
        <div className="p-8 animate-fade-in">
          <div className="bg-zhan-surface border border-zhan-border rounded-xl px-5 py-1">
            {notifications.map((n, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 py-3 border-b border-zhan-border-light last:border-0 ${n.read ? "opacity-60" : ""}`}
              >
                <div className={`w-2 h-2 rounded-full mt-[5px] flex-shrink-0 ${typeColors[n.type]}`} />
                <div className="flex-1">
                  <div className="text-[13px] text-zhan-text-secondary leading-relaxed">{n.text}</div>
                  <div className="text-[11px] text-zhan-text-muted mt-0.5">{n.time}</div>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-zhan-accent mt-1.5" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
