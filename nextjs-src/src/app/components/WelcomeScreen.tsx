"use client";

import { Icons } from "./Icons";
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
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-7">
      <div className="text-center max-w-[480px] animate-fade-in">
        {/* Welcome icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#111827] flex items-center justify-center mx-auto mb-6">
          <Icons.Layers className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold mb-2">
          Добро пожаловать, {firstName}!
        </h1>
        <p className="text-[14px] text-[#6B7280] mb-8 leading-relaxed">
          {isDesigner
            ? "Archflow поможет управлять дизайн-проектами, визитами на объекты и комплектацией. Создайте первый проект чтобы начать."
            : "Вас пригласили для совместной работы над дизайн-проектом. Скоро здесь появятся ваши проекты."
          }
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
          <div className="card p-4">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center mb-3">
              <Icons.Camera className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="text-[13px] font-medium mb-1">Авторский надзор</div>
            <div className="text-[11px] text-[#9CA3AF]">Визиты, фото, замечания</div>
          </div>
          <div className="card p-4">
            <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] flex items-center justify-center mb-3">
              <Icons.Box className="w-4 h-4 text-[#D97706]" />
            </div>
            <div className="text-[13px] font-medium mb-1">Комплектация</div>
            <div className="text-[11px] text-[#9CA3AF]">Заказы, сроки, риски</div>
          </div>
          <div className="card p-4">
            <div className="w-8 h-8 rounded-lg bg-[#ECFDF3] flex items-center justify-center mb-3">
              <Icons.Receipt className="w-4 h-4 text-[#16A34A]" />
            </div>
            <div className="text-[13px] font-medium mb-1">Счета</div>
            <div className="text-[11px] text-[#9CA3AF]">Выставление и оплата</div>
          </div>
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
