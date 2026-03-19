"use client";

import { Icons } from "./Icons";
import { useAuth } from "../lib/auth";

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
  const { profile, signOut } = useAuth();

  const isActive = (id: string) =>
    currentPage === id ||
    (currentPage === "project" && id === "projects") ||
    (currentPage === "visit" && id === "projects");

  // Get initials from full name
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  // Map role to Russian label
  const roleLabel: Record<string, string> = {
    designer: "Дизайнер",
    client: "Заказчик",
    contractor: "Подрядчик",
    supplier: "Комплектатор",
    assistant: "Ассистент",
  };

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
      <div className="px-5 py-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#2C5F2D] flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{profile?.full_name || "..."}</div>
            <div className="text-[11px] text-white/40">{roleLabel[profile?.role || ""] || "..."}</div>
          </div>
          <button
            onClick={signOut}
            className="text-white/30 hover:text-white/70 transition-colors p-1"
            title="Выйти"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
