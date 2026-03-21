"use client";

import { Icons } from "./Icons";
import { useAuth } from "../lib/auth";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string, ctx?: any) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { profile, signOut } = useAuth();

  const isActive = (id: string) =>
    currentPage === id ||
    (currentPage === "project" && id === "projects") ||
    (currentPage === "visit" && id === "projects");

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  const roleLabel: Record<string, string> = {
    designer: "Дизайнер",
    client: "Заказчик",
    contractor: "Подрядчик",
    supplier: "Комплектатор",
    assistant: "Ассистент",
  };

  return (
    <aside className="w-[240px] bg-[#111827] text-white flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
            <Icons.Layers className="w-4 h-4 text-white/70" />
          </div>
          <span className="text-[15px] font-bold tracking-tight">Archflow</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="p-3 flex-1">
        <div className="text-[10px] font-medium text-white/25 uppercase tracking-wider px-3 mb-2">
          Навигация
        </div>
        <div
          className={`sidebar-item ${isActive("projects") ? "active" : ""}`}
          onClick={() => onNavigate("projects")}
        >
          <Icons.Folder className="w-4 h-4" />
          Проекты
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.08]">
        <div className="sidebar-item" onClick={signOut}>
          <Icons.LogOut className="w-4 h-4" />
          Выйти
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <div>
            <div className="text-[12px] font-medium">{profile?.full_name || "..."}</div>
            <div className="text-[10px] text-white/35">
              {roleLabel[profile?.role || ""] || "..."}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
