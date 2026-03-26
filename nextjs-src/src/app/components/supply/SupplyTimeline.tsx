"use client";

import { useMemo } from "react";
import { RISK_CONFIG } from "../../lib/types";
import type { SupplyItemWithCalc, Stage } from "../../lib/types";

interface SupplyTimelineProps {
  items: SupplyItemWithCalc[];
  stages: Stage[];
}

export function SupplyTimeline({ items, stages }: SupplyTimelineProps) {
  // Calculate timeline bounds
  const { startDate, endDate, totalDays, todayOffset, rows } = useMemo(() => {
    const allDates: Date[] = [];
    const today = new Date();
    allDates.push(today);

    items.forEach((item) => {
      if (item.orderDeadline) allDates.push(new Date(item.orderDeadline));
      if (item.deliveryForecast) allDates.push(new Date(item.deliveryForecast));
    });

    stages.forEach((s) => {
      if (s.start_date) allDates.push(new Date(s.start_date));
      if (s.end_date) allDates.push(new Date(s.end_date));
    });

    if (allDates.length < 2) {
      return { startDate: today, endDate: today, totalDays: 1, todayOffset: 0, rows: [] };
    }

    const sorted = allDates.sort((a, b) => a.getTime() - b.getTime());
    const start = new Date(sorted[0]);
    start.setDate(start.getDate() - 7); // 1 week padding
    const end = new Date(sorted[sorted.length - 1]);
    end.setDate(end.getDate() + 14); // 2 weeks padding

    const totalMs = end.getTime() - start.getTime();
    const totalD = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
    const todayMs = today.getTime() - start.getTime();
    const todayOff = (todayMs / totalMs) * 100;

    // Build rows: each item gets a bar from orderDeadline to delivery/stageStart
    const r = items
      .filter((item) => item.orderDeadline || item.stageStart)
      .map((item) => {
        const barStart = item.orderDeadline ? new Date(item.orderDeadline) : today;
        const barEnd = item.stageStart ? new Date(item.stageStart) : new Date(today.getTime() + item.lead_time_days * 86400000);

        const leftPct = ((barStart.getTime() - start.getTime()) / totalMs) * 100;
        const widthPct = ((barEnd.getTime() - barStart.getTime()) / totalMs) * 100;

        return {
          ...item,
          leftPct: Math.max(0, Math.min(100, leftPct)),
          widthPct: Math.max(0.5, Math.min(100 - leftPct, widthPct)),
        };
      });

    return { startDate: start, endDate: end, totalDays: totalD, todayOffset: todayOff, rows: r };
  }, [items, stages]);

  // Month markers
  const months = useMemo(() => {
    const result: { label: string; leftPct: number }[] = [];
    const totalMs = endDate.getTime() - startDate.getTime();
    const current = new Date(startDate);
    current.setDate(1);
    if (current < startDate) current.setMonth(current.getMonth() + 1);

    const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

    while (current <= endDate) {
      const pct = ((current.getTime() - startDate.getTime()) / totalMs) * 100;
      result.push({ label: monthNames[current.getMonth()], leftPct: pct });
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  }, [startDate, endDate]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-[13px] text-ink-faint">
        Нет позиций для отображения на Timeline
      </div>
    );
  }

  return (
    <div className="bg-white border border-line rounded-xl overflow-hidden">
      {/* Month header */}
      <div className="relative h-8 border-b border-line-light bg-srf-hover">
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 h-full flex items-center text-[10px] text-ink-faint font-medium"
            style={{ left: `${m.leftPct}%` }}
          >
            <div className="w-px h-full bg-line-light" />
            <span className="ml-1">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="relative">
        {/* Today marker */}
        {todayOffset > 0 && todayOffset < 100 && (
          <div className="timeline-today" style={{ left: `${todayOffset}%` }} />
        )}

        {rows.map((item) => {
          const riskColor = RISK_CONFIG[item.riskCalc];
          return (
            <div
              key={item.id}
              className="relative h-[44px] border-b border-line-light last:border-none flex items-center"
            >
              {/* Label */}
              <div className="absolute left-2 z-10 text-[11px] font-medium text-ink-muted truncate max-w-[140px]">
                {item.name}
              </div>
              {/* Bar */}
              <div
                className="timeline-bar"
                style={{
                  left: `${item.leftPct}%`,
                  width: `${item.widthPct}%`,
                  background: riskColor.bg,
                  border: `1px solid ${riskColor.text}30`,
                }}
                title={`${item.name}: ${item.orderDeadline || "?"} → ${item.stageStart || "?"}`}
              >
                <span
                  className="absolute inset-0 flex items-center px-2 text-[10px] font-medium truncate"
                  style={{ color: riskColor.text }}
                >
                  {item.lead_time_days}д
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-srf-hover border-t border-line-light">
        {(["critical", "high", "medium", "low"] as const).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded"
              style={{ background: RISK_CONFIG[level].bg, border: `1px solid ${RISK_CONFIG[level].text}30` }}
            />
            <span className="text-[10px] text-ink-faint">{RISK_CONFIG[level].label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-3 h-0.5 bg-err rounded" />
          <span className="text-[10px] text-ink-faint">Сегодня</span>
        </div>
      </div>
    </div>
  );
}
