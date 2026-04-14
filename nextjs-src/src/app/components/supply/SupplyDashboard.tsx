"use client";

import { useMemo } from "react";
import { formatPrice, formatShortDate } from "../../lib/queries";
import { RISK_CONFIG } from "../../lib/types";
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
    { label: "Всего позиций", value: stats.total },
    { label: "Общий бюджет", value: formatPrice(stats.totalBudget) },
    { label: "Заказано", value: `${stats.ordered}/${stats.total}` },
    { label: "Требуют внимания", value: stats.critical },
  ];

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 'var(--af-gap, 2px)', marginBottom: 24 }}>
        {kpiCards.map((card) => (
          <div key={card.label} className="af-metric">
            <div className="af-metric-value">{card.value}</div>
            <div className="af-metric-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Critical warnings */}
        <div style={{ background: 'rgb(var(--line), 0.3)', padding: 20, border: '0.5px solid rgb(var(--line))' }}>
          <h3 style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-9)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgb(var(--ink))',
            marginBottom: 16,
          }}>
            Критические позиции
          </h3>
          {criticalItems.length === 0 ? (
            <div className="text-[13px] text-ink-faint py-4 text-center">
              Нет критических позиций
            </div>
          ) : (
            <div className="space-y-3">
              {criticalItems.map((item) => {
                const risk = RISK_CONFIG[item.riskCalc];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-line-light last:border-none"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{item.name}</div>
                      <div className="text-[11px] text-ink-faint">
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
        <div style={{ background: 'rgb(var(--line), 0.3)', padding: 20, border: '0.5px solid rgb(var(--line))' }}>
          <h3 style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-9)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgb(var(--ink))',
            marginBottom: 16,
          }}>
            Ближайшие этапы
          </h3>
          {upcomingStages.length === 0 ? (
            <div className="text-[13px] text-ink-faint py-4 text-center">
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
                    className="py-2 border-b border-line-light last:border-none"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium">{stage.name}</span>
                      <span className="text-[12px] text-ink-faint font-mono-custom">
                        {stage.start_date ? formatShortDate(stage.start_date) : "—"}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-faint">
                      {stageItems.length} позиций · {pending > 0 ? (
                        <span style={{ color: 'rgb(var(--ink))', fontWeight: 500 }}>{pending} не заказано</span>
                      ) : (
                        <span style={{ color: 'rgb(var(--ink))' }}>всё заказано</span>
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
