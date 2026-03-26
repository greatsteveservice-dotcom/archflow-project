"use client";

import { Icons, ArchflowLogo } from "./Icons";
import { useAuth } from "../lib/auth";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string, ctx?: any) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
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

  const handleNav = (page: string) => {
    onNavigate(page);
    onClose?.();
  };

  const sidebarContent = (
    <aside className="w-[220px] bg-ink text-white flex flex-col flex-shrink-0 h-screen">
      {/* Logo — minimal */}
      <div className="px-5 pt-5 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ArchflowLogo className="w-7 h-7" mono />
          <span className="text-[15px] font-semibold tracking-tight">Archflow</span>
        </div>
        <button className="md:hidden p-1 text-white/40 hover:text-white" onClick={onClose}>
          <Icons.X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav — clean, no section headers */}
      <nav className="px-3 flex-1 space-y-0.5">
        <div
          className={`sidebar-item ${isActive("dashboard") ? "active" : ""}`}
          onClick={() => handleNav("dashboard")}
        >
          <Icons.Grid className="w-4 h-4" />
          Дашборд
        </div>
        <div
          className={`sidebar-item ${isActive("projects") ? "active" : ""}`}
          onClick={() => handleNav("projects")}
        >
          <Icons.Folder className="w-4 h-4" />
          Проекты
        </div>
      </nav>

      {/* Bottom — compact */}
      <div className="px-3 pb-3 space-y-0.5">
        <div
          className="sidebar-item"
          onClick={() => handleNav("profile")}
        >
          <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-[9px] font-semibold">
            {initials}
          </div>
          <span className="truncate">{profile?.full_name || "..."}</span>
          <span className="text-[10px] text-white/30 ml-auto">{roleLabel[profile?.role || ""] || ""}</span>
        </div>
        <div className="sidebar-item" onClick={signOut}>
          <Icons.LogOut className="w-4 h-4" />
          Выйти
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: static sidebar */}
      <div className="hidden md:block sticky top-0 h-screen">
        {sidebarContent}
      </div>

      {/* Mobile: overlay sidebar */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <div className="relative z-10 animate-slide-in-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
