"use client";

import { useMemo } from "react";
import { Icons } from "../Icons";
import { formatPrice, formatShortDate } from "../../lib/queries";
import { RISK_CONFIG, SUPPLY_STATUS_CONFIG } from "../../lib/types";
import type { SupplyItemWithCalc, Stage } from "../../lib/types";

interface SupplyDashboardProps {
  items: SupplyItemWithCalc[];
  stages: Stage[];
}

export function SupplyDashboard({ items, stages }: SupplyDashboardProps) {
  const stats = useMemo(() => {
    const total = items.length;
    const totalBudget = items.reduce((sum, i) => sum + i.budget, 0);
    const ordered = items.filter((i) => ["ordered", "in_production", "delivered"].includes(i.status)).length;
    const critical = items.filter((i) => i.riskCalc === "critical" || i.riskCalc === "high").length;
    const delivered = items.filter((i) => i.status === "delivered").length;

    return { total, totalBudget, ordered, critical, delivered };
  }, [items]);

  const criticalItems = useMemo(() => {
    return items
      .filter((i) => i.riskCalc === "critical" || i.riskCalc === "high")
      .sort((a, b) => (a.daysUntilDeadline ?? 999) - (b.daysUntilDeadline ?? 999))
      .slice(0, 5);
  }, [items]);

  const upcomingStages = useMemo(() => {
    const today = new Date();
    return stages
      .filter((s) => s.start_date && new Date(s.start_date) >= today)
      .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())
      .slice(0, 3);
  }, [stages]);

  const kpiCards = [
    {
      label: "Всего позиций",
      value: stats.total,
      icon: Icons.Box,
      color: "#2C5F2D",
    },
    {
      label: "Общий бюджет",
      value: formatPrice(stats.totalBudget),
      icon: Icons.Receipt,
      color: "#2563EB",
    },
    {
      label: "Заказано",
      value: `${stats.ordered}/${stats.total}`,
      icon: Icons.Check,
      color: "#16A34A",
    },
    {
      label: "Требуют внимания",
      value: stats.critical,
      icon: Icons.Alert,
      color: stats.critical > 0 ? "#DC2626" : "#16A34A",
    },
  ];

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-[#E8E6E1] rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-[#9B9B9B] font-medium">{card.label}</span>
                <span style={{ color: card.color }}><Icon className="w-4 h-4" /></span>
              </div>
              <div className="text-xl font-semibold font-mono-custom" style={{ color: card.color }}>
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Critical warnings */}
        <div className="bg-white border border-[#E8E6E1] rounded-xl p-5">
          <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
            <Icons.Alert className="w-4 h-4 text-[#E85D3A]" />
            Критические позиции
          </h3>
          {criticalItems.length === 0 ? (
            <div className="text-[13px] text-[#9B9B9B] py-4 text-center">
              Нет критических позиций
            </div>
          ) : (
            <div className="space-y-3">
              {criticalItems.map((item) => {
                const risk = RISK_CONFIG[item.riskCalc];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-[#F0EEE9] last:border-none"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{item.name}</div>
                      <div className="text-[11px] text-[#9B9B9B]">
                        Дедлайн заказа: {item.orderDeadline ? formatShortDate(item.orderDeadline) : "—"}
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full ml-2 whitespace-nowrap"
                      style={{ background: risk.bg, color: risk.text }}
                    >
                      {item.daysUntilDeadline !== null
                        ? item.daysUntilDeadline < 0
                          ? `${Math.abs(item.daysUntilDeadline)} дн. просрочено`
                          : `${item.daysUntilDeadline} дн.`
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming stages */}
        <div className="bg-white border border-[#E8E6E1] rounded-xl p-5">
          <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
            <Icons.Clock className="w-4 h-4 text-[#D4930D]" />
            Ближайшие этапы
          </h3>
          {upcomingStages.length === 0 ? (
            <div className="text-[13px] text-[#9B9B9B] py-4 text-center">
              Нет предстоящих этапов
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingStages.map((stage) => {
                const stageItems = items.filter((i) => i.target_stage_id === stage.id);
                const pending = stageItems.filter((i) => !["ordered", "in_production", "delivered"].includes(i.status)).length;
                return (
                  <div
                    key={stage.id}
                    className="py-2 border-b border-[#F0EEE9] last:border-none"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium">{stage.name}</span>
                      <span className="text-[12px] text-[#9B9B9B] font-mono-custom">
                        {stage.start_date ? formatShortDate(stage.start_date) : "—"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#9B9B9B]">
                      {stageItems.length} позиций · {pending > 0 ? (
                        <span className="text-[#D97706]">{pending} не заказано</span>
                      ) : (
                        <span className="text-[#16A34A]">всё заказано</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
