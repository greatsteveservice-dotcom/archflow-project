"use client";

import { Icons } from "./Icons";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string, ctx?: any) => void;
}

const navItems = [
  { id: "dashboard", label: "Дашборд", icon: <Icons.Home /> },
  { id: "projects", label: "Проекты", icon: <Icons.Folder /> },
  { id: "notifications", label: "Уведомления", icon: <Icons.Bell />, notif: true },
  { id: "settings", label: "Настройки", icon: <Icons.Settings /> },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const isActive = (id: string) =>
    currentPage === id ||
    (currentPage === "project" && id === "projects") ||
    (currentPage === "visit" && id === "projects");

  return (
    <aside className="w-[260px] bg-[#1A1F1A] text-white flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 pt-6 pb-5 border-b border-white/[0.08]">
        <h1 className="text-[22px] font-bold tracking-[3px]">ЖАН</h1>
        <span className="text-[11px] text-white/40 tracking-wide block mt-0.5">
          журнал авторского надзора
        </span>
      </div>

      {/* Nav */}
      <nav className="p-3 flex-1">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-item ${isActive(item.id) ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className={item.notif ? "notif-dot" : ""}>
              {item.icon}
            </span>
            {item.label}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-5 py-4 border-t border-white/[0.08] flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#2C5F2D] flex items-center justify-center text-sm font-semibold">
          АФ
        </div>
        <div>
          <div className="text-[13px] font-medium">Алиса Флоренс</div>
          <div className="text-[11px] text-white/40">Дизайнер</div>
        </div>
      </div>
    </aside>
  );
}
