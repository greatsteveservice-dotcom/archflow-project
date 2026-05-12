"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { RISK_CONFIG, SUPPLY_STATUS_CONFIG } from "../../lib/types";
import type { SupplyItemWithCalc, Stage } from "../../lib/types";
import { groupSupplyByStage } from "../../lib/supply-grouping";

interface SupplyTimelineProps {
  items: SupplyItemWithCalc[];
  stages: Stage[];
  /** Optional callback when user clicks a supply row (opens drawer). */
  onItemClick?: (id: string) => void;
}

type Zoom = "week" | "month" | "quarter";
type Filter = "all" | "critical" | "unordered";

const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

/** px per day for each zoom level */
const PX_PER_DAY: Record<Zoom, number> = {
  week: 24,
  month: 8,
  quarter: 3.2,
};

const LANE_HEIGHT = 30;
const STAGE_BAR_HEIGHT = 26;
const STAGE_HEADER_HEIGHT = 30;
const LEFT_COL_WIDTH = 240;
const LEFT_COL_WIDTH_MOBILE = 140;

function fmt(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

function parseISO(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function isToday(d: Date): boolean {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

export function SupplyTimeline({ items, stages, onItemClick }: SupplyTimelineProps) {
  const [zoom, setZoom] = useState<Zoom>("month");
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  // Hotkeys 1/2/3 for zoom
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") setZoom("week");
      else if (e.key === "2") setZoom("month");
      else if (e.key === "3") setZoom("quarter");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredItems = useMemo(() => {
    let out = items;
    if (filter === "critical") out = out.filter((i) => i.riskCalc === "critical" || i.riskCalc === "high");
    else if (filter === "unordered") out = out.filter((i) => !["ordered", "in_production", "delivered"].includes(i.status));
    if (stageFilter) out = out.filter((i) => i.target_stage_id === stageFilter);
    return out;
  }, [items, filter, stageFilter]);

  const groups = useMemo(() => groupSupplyByStage(filteredItems, stages), [filteredItems, stages]);

  // Compute timeline bounds from stages + items
  const { startDate, endDate, totalDays } = useMemo(() => {
    const all: number[] = [];
    const today = new Date();
    all.push(today.getTime());
    stages.forEach((s) => {
      const sd = parseISO(s.start_date);
      const ed = parseISO(s.end_date);
      if (sd) all.push(sd.getTime());
      if (ed) all.push(ed.getTime());
    });
    items.forEach((i) => {
      const od = parseISO(i.orderDeadline);
      if (od) all.push(od.getTime());
    });
    if (all.length < 2) {
      const t = new Date();
      const end = new Date(t.getTime() + 90 * 86_400_000);
      const days = 90;
      return { startDate: t, endDate: end, totalDays: days };
    }
    const min = Math.min(...all);
    const max = Math.max(...all);
    const start = new Date(min);
    start.setDate(start.getDate() - 7);
    const end = new Date(max);
    end.setDate(end.getDate() + 14);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    return { startDate: start, endDate: end, totalDays: days };
  }, [stages, items]);

  const pxPerDay = PX_PER_DAY[zoom];
  const trackWidth = totalDays * pxPerDay;

  const dayOffset = useCallback(
    (d: Date | null): number => {
      if (!d) return 0;
      return Math.max(0, Math.round((d.getTime() - startDate.getTime()) / 86_400_000));
    },
    [startDate],
  );

  // Build month + week markers
  const monthMarkers = useMemo(() => {
    const result: { label: string; year: number; offsetDays: number }[] = [];
    const c = new Date(startDate);
    c.setDate(1);
    if (c < startDate) c.setMonth(c.getMonth() + 1);
    while (c <= endDate) {
      const off = Math.round((c.getTime() - startDate.getTime()) / 86_400_000);
      result.push({ label: MONTHS[c.getMonth()], year: c.getFullYear(), offsetDays: off });
      c.setMonth(c.getMonth() + 1);
    }
    return result;
  }, [startDate, endDate]);

  const weekMarkers = useMemo(() => {
    if (zoom === "quarter") return [];
    const result: number[] = [];
    const c = new Date(startDate);
    // Snap to next Monday
    while (c.getDay() !== 1) c.setDate(c.getDate() + 1);
    while (c <= endDate) {
      result.push(Math.round((c.getTime() - startDate.getTime()) / 86_400_000));
      c.setDate(c.getDate() + 7);
    }
    return result;
  }, [startDate, endDate, zoom]);

  const todayOffset = dayOffset(new Date());

  const toggleCollapse = (key: string) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  if (items.length === 0) {
    return (
      <div className="af-gantt-empty">
        Нет позиций для отображения. Импортируйте Excel или добавьте позицию вручную.
      </div>
    );
  }

  // Total render height
  const visibleRows = groups.reduce((acc, g) => {
    const collapsedKey = g.stage ? g.stage.id : "__no_stage__";
    return acc + STAGE_HEADER_HEIGHT + (collapsed[collapsedKey] ? 0 : g.rows.length * LANE_HEIGHT);
  }, 0);

  return (
    <div className="af-gantt">
      {/* ── Toolbar ── */}
      <div className="af-gantt-toolbar">
        <div className="af-gantt-zoom">
          {(["week", "month", "quarter"] as const).map((z) => (
            <button
              key={z}
              className={`af-gantt-zoom-btn ${zoom === z ? "active" : ""}`}
              onClick={() => setZoom(z)}
              type="button"
              title={`Зум: ${z === "week" ? "Неделя" : z === "month" ? "Месяц" : "Квартал"} (горячая клавиша ${z === "week" ? "1" : z === "month" ? "2" : "3"})`}
            >
              {z === "week" ? "Неделя" : z === "month" ? "Месяц" : "Квартал"}
            </button>
          ))}
        </div>

        <div className="af-gantt-filter">
          {(["all", "critical", "unordered"] as const).map((f) => (
            <button
              key={f}
              className={`af-gantt-filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f === "all" ? "Все" : f === "critical" ? "Критичные" : "Не заказано"}
            </button>
          ))}
        </div>

        {stageFilter && (
          <button className="af-gantt-clear" onClick={() => setStageFilter(null)} type="button">
            Сбросить этап ×
          </button>
        )}

        <div className="af-gantt-legend">
          <span><i className="af-gantt-swatch" style={{ background: RISK_CONFIG.critical.bg }} /> Критично</span>
          <span><i className="af-gantt-swatch" style={{ background: RISK_CONFIG.high.bg }} /> Высокий</span>
          <span><i className="af-gantt-swatch" style={{ background: RISK_CONFIG.medium.bg }} /> Средний</span>
          <span><i className="af-gantt-swatch af-gantt-swatch-delivered" /> Доставлено</span>
        </div>
      </div>

      {/* ── Scroll container ── */}
      <div className="af-gantt-scroll">
        <div className="af-gantt-grid" style={{ width: LEFT_COL_WIDTH + trackWidth }}>
          {/* ── Header: months + weeks ── */}
          <div className="af-gantt-header">
            <div className="af-gantt-header-left" style={{ width: LEFT_COL_WIDTH }}>
              Позиция · Поставщик
            </div>
            <div className="af-gantt-header-track" style={{ width: trackWidth }}>
              {/* Month labels */}
              {monthMarkers.map((m, i) => (
                <div
                  key={i}
                  className="af-gantt-month"
                  style={{ left: m.offsetDays * pxPerDay }}
                  title={`${m.label} ${m.year}`}
                >
                  <span className="af-gantt-month-label">{m.label}</span>
                </div>
              ))}
              {/* Week ticks */}
              {weekMarkers.map((w, i) => (
                <div key={`w${i}`} className="af-gantt-week-tick" style={{ left: w * pxPerDay }} />
              ))}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="af-gantt-body" style={{ height: visibleRows }}>
            {/* Today line spans whole body */}
            {todayOffset >= 0 && todayOffset <= totalDays && (
              <div
                className="af-gantt-today"
                style={{ left: LEFT_COL_WIDTH + todayOffset * pxPerDay, height: visibleRows }}
                title="Сегодня"
              />
            )}

            {/* Week-tick background lines (light) */}
            {weekMarkers.map((w, i) => (
              <div
                key={`bg${i}`}
                className="af-gantt-week-bg"
                style={{ left: LEFT_COL_WIDTH + w * pxPerDay, height: visibleRows }}
              />
            ))}

            {(() => {
              let cursorY = 0;
              return groups.map((g) => {
                const key = g.stage ? g.stage.id : "__no_stage__";
                const isCollapsed = !!collapsed[key];
                const stageStart = parseISO(g.stage?.start_date ?? null);
                const stageEnd = parseISO(g.stage?.end_date ?? null);
                const stageOffset = stageStart ? dayOffset(stageStart) : 0;
                const stageWidth = stageStart && stageEnd
                  ? Math.max(2, (dayOffset(stageEnd) - stageOffset + 1) * pxPerDay)
                  : 0;

                const headerY = cursorY;
                cursorY += STAGE_HEADER_HEIGHT;
                const rowsStartY = cursorY;
                if (!isCollapsed) cursorY += g.rows.length * LANE_HEIGHT;

                const todayMs = Date.now();
                const isCurrent = stageStart && stageEnd
                  && stageStart.getTime() <= todayMs
                  && stageEnd.getTime() >= todayMs;
                const isDone = stageEnd && stageEnd.getTime() < todayMs;
                const stageClass = isCurrent ? "af-gantt-stage-bar current"
                  : isDone ? "af-gantt-stage-bar done"
                  : "af-gantt-stage-bar future";

                return (
                  <div key={key}>
                    {/* Stage header row */}
                    <div className="af-gantt-stage-row" style={{ top: headerY, height: STAGE_HEADER_HEIGHT }}>
                      <button
                        type="button"
                        className="af-gantt-stage-label"
                        style={{ width: LEFT_COL_WIDTH }}
                        onClick={() => toggleCollapse(key)}
                        title={isCollapsed ? "Развернуть" : "Свернуть"}
                      >
                        <span className="af-gantt-caret">{isCollapsed ? "▸" : "▾"}</span>
                        <span className="af-gantt-stage-name">
                          {g.stage ? g.stage.name : "Без этапа"}
                        </span>
                        <span className="af-gantt-stage-count">· {g.rows.length}</span>
                      </button>
                      <div
                        className="af-gantt-stage-track"
                        style={{ left: LEFT_COL_WIDTH, width: trackWidth }}
                      >
                        {g.stage && stageStart && stageEnd && (
                          <button
                            type="button"
                            className={stageClass}
                            style={{
                              left: stageOffset * pxPerDay,
                              width: stageWidth,
                              height: STAGE_BAR_HEIGHT,
                            }}
                            onClick={() => setStageFilter((cur) => (cur === g.stage!.id ? null : g.stage!.id))}
                            title={`${g.stage.name}: ${fmt(stageStart)} – ${fmt(stageEnd)}`}
                          >
                            <span className="af-gantt-stage-bar-label">
                              {fmt(stageStart)}–{fmt(stageEnd)}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Supply item rows */}
                    {!isCollapsed && g.rows.map((item, idx) => {
                      const y = rowsStartY + idx * LANE_HEIGHT;
                      const od = parseISO(item.orderDeadline);
                      const ss = parseISO(item.stageStart);

                      // Bar from orderDeadline to stage.start (delivery window)
                      const barStart = od ? dayOffset(od) : null;
                      const barEnd = ss ? dayOffset(ss) : (od ? dayOffset(od) + Math.max(1, item.lead_time_days) : null);

                      const risk = RISK_CONFIG[item.riskCalc];
                      const statusCfg = SUPPLY_STATUS_CONFIG[item.status];
                      const overdue = (item.daysUntilDeadline ?? 0) < 0 && item.status !== "delivered";
                      const isDelivered = item.status === "delivered";
                      const isOrdered = ["ordered", "in_production"].includes(item.status);

                      return (
                        <div
                          key={item.id}
                          className="af-gantt-row"
                          style={{ top: y, height: LANE_HEIGHT }}
                        >
                          <button
                            type="button"
                            className="af-gantt-row-label"
                            style={{ width: LEFT_COL_WIDTH }}
                            onClick={() => onItemClick?.(item.id)}
                            title={item.name}
                          >
                            <span
                              className="af-gantt-status-dot"
                              style={{ background: isDelivered ? "#111" : isOrdered ? "#777" : "transparent", border: isDelivered || isOrdered ? "none" : "1px solid #999" }}
                              aria-label={statusCfg.label}
                            />
                            <span className="af-gantt-row-text">
                              <span className="af-gantt-row-name">{item.name}</span>
                              {(item.subcategory || item.supplier) && (
                                <span className="af-gantt-row-meta">
                                  {item.subcategory ? item.subcategory : ""}
                                  {item.subcategory && item.supplier ? " · " : ""}
                                  {item.supplier || ""}
                                </span>
                              )}
                            </span>
                          </button>

                          <div
                            className="af-gantt-row-track"
                            style={{ left: LEFT_COL_WIDTH, width: trackWidth }}
                          >
                            {barStart !== null && barEnd !== null && barEnd > barStart && (
                              <button
                                type="button"
                                className={`af-gantt-item-bar${overdue ? " overdue" : ""}${isDelivered ? " delivered" : ""}`}
                                style={{
                                  left: barStart * pxPerDay,
                                  width: Math.max(4, (barEnd - barStart) * pxPerDay),
                                  background: isDelivered ? "#111" : risk.bg,
                                  borderColor: isDelivered ? "#111" : item.riskCalc === "critical" ? "#B8862A" : "rgba(17,17,17,0.25)",
                                }}
                                onClick={() => onItemClick?.(item.id)}
                                title={`${item.name}\n${item.orderDeadline ? fmt(od!) : "?"} → ${item.stageStart ? fmt(ss!) : "?"} · ${item.lead_time_days}д · ${statusCfg.label}${overdue ? ` · ${Math.abs(item.daysUntilDeadline!)} дн. просрочено` : ""}`}
                              >
                                <span className="af-gantt-bar-text" style={{ color: isDelivered ? "#fff" : risk.text }}>
                                  {isDelivered ? "✓ Доставлено" : (
                                    <>
                                      {od ? fmt(od) : ""}{od && ss ? " → " : ""}{ss ? fmt(ss) : ""} · {item.lead_time_days}д
                                    </>
                                  )}
                                </span>
                              </button>
                            )}
                            {/* Crayon marker at stage start (deadline) */}
                            {ss && (
                              <div
                                className="af-gantt-deadline-marker"
                                style={{ left: dayOffset(ss) * pxPerDay }}
                                title={`Крайняя дата: ${fmt(ss)}`}
                              />
                            )}
                            {/* Overdue label */}
                            {overdue && (
                              <span
                                className="af-gantt-overdue-label"
                                style={{ left: (barEnd ?? 0) * pxPerDay + 4 }}
                              >
                                −{Math.abs(item.daysUntilDeadline!)} дн.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Footer hints */}
      <div className="af-gantt-foot">
        Серая полоса — окно поставки (от даты заказа до начала этапа). Вертикальная линия справа — крайняя дата = начало этапа. Сегодня — чёрная линия. Hotkeys: 1/2/3 — зум.
      </div>
    </div>
  );
}

export default SupplyTimeline;
