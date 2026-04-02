"use client";

import { Icons, ArchflowLogo } from "./Icons";
import { useAuth } from "../lib/auth";

interface WelcomeScreenProps {
  onCreateProject: () => void;
  onNavigate: (page: string) => void;
}

export default function WelcomeScreen({ onCreateProject, onNavigate }: WelcomeScreenProps) {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "пользователь";
  const isDesigner = profile?.role === "designer" || profile?.role === "assistant";

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-8">
      <div className="text-center max-w-[520px] animate-fade-in">
        {/* Welcome icon */}
        <div className="mx-auto mb-6">
          <ArchflowLogo className="w-14 h-14" />
        </div>

        <h1 className="text-[26px] font-bold mb-2 tracking-tight">
          Добро пожаловать, {firstName}!
        </h1>
        <p className="text-[14px] text-ink-muted mb-10 leading-relaxed max-w-[400px] mx-auto">
          {isDesigner
            ? "Archflow поможет управлять дизайн-проектами, визитами на объекты и комплектацией. Создайте первый проект чтобы начать."
            : "Вас пригласили для совместной работы над дизайн-проектом. Скоро здесь появятся ваши проекты."
          }
        </p>

        {/* Feature cards — monochrome */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-left">
          {[
            { icon: <Icons.Camera className="w-4 h-4" />, title: "Авторский надзор", desc: "Визиты, фото, замечания" },
            { icon: <Icons.Box className="w-4 h-4" />, title: "Комплектация", desc: "Заказы, сроки, риски" },
            { icon: <Icons.Receipt className="w-4 h-4" />, title: "Счета", desc: "Выставление и оплата" },
          ].map((f, i) => (
            <div key={i} className="bg-srf border border-line p-4">
              <div className="w-8 h-8 bg-srf-secondary flex items-center justify-center mb-3 text-ink-muted">
                {f.icon}
              </div>
              <div className="text-[13px] font-medium mb-1">{f.title}</div>
              <div className="text-[11px] text-ink-faint leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isDesigner && (
            <button
              className="btn btn-primary py-3 px-6 text-[14px] justify-center"
              onClick={onCreateProject}
            >
              <Icons.Plus className="w-4 h-4" /> Создать проект
            </button>
          )}
          <button
            className="btn btn-secondary py-3 px-6 text-[14px] justify-center"
            onClick={() => onNavigate("dashboard")}
          >
            Перейти к дашборду
          </button>
        </div>
      </div>
    </div>
  );
}
