"use client";

import { useState, useMemo } from "react";
import { Icons } from "../Icons";
import { formatPrice } from "../../lib/queries";
import { SUPPLY_STATUS_CONFIG, RISK_CONFIG } from "../../lib/types";
import type { SupplyItemWithCalc, ProjectRoom } from "../../lib/types";

interface SupplyPlanProps {
  items: SupplyItemWithCalc[];
  rooms: ProjectRoom[];
  onNavigateToSpec?: (roomName: string) => void;
}

const mono = "'IBM Plex Mono', monospace";
const display = "'Playfair Display', serif";

export default function SupplyPlan({ items, rooms, onNavigateToSpec }: SupplyPlanProps) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Group items by room name
  const roomData = useMemo(() => {
    const roomStats = rooms.map((room) => {
      const roomItems = items.filter((i) => i.room === room.name);
      const total = roomItems.length;
      const delivered = roomItems.filter((i) => i.status === "delivered").length;
      const ordered = roomItems.filter((i) => ["ordered", "in_production", "delivered"].includes(i.status)).length;
      const overdue = roomItems.filter(
        (i) => i.daysUntilDeadline !== null && i.daysUntilDeadline < 0 && i.status !== "delivered"
      );
      const budget = roomItems.reduce((sum, i) => sum + i.budget, 0);

      return {
        ...room,
        items: roomItems,
        total,
        delivered,
        ordered,
        overdueItems: overdue,
        budget,
      };
    });

    // Items without room
    const unassigned = items.filter(
      (i) => !i.room || !rooms.some((r) => r.name === i.room)
    );

    // Median area for span calculation
    const areas = rooms.filter((r) => r.area && r.area > 0).map((r) => r.area!);
    const medianArea = areas.length > 0
      ? areas.sort((a, b) => a - b)[Math.floor(areas.length / 2)]
      : 0;

    return { roomStats, unassigned, medianArea };
  }, [items, rooms]);

  const { roomStats, unassigned, medianArea } = roomData;

  // Selected room details for side panel
  const selectedRoomData = useMemo(() => {
    if (!selectedRoom) return null;
    if (selectedRoom === "__unassigned__") {
      const overdueItems = unassigned.filter(
        (i) => i.daysUntilDeadline !== null && i.daysUntilDeadline < 0 && i.status !== "delivered"
      );
      return {
        name: "Без помещения",
        roomName: "",
        items: unassigned,
        total: unassigned.length,
        delivered: unassigned.filter((i) => i.status === "delivered").length,
        ordered: unassigned.filter((i) => ["ordered", "in_production", "delivered"].includes(i.status)).length,
        overdueItems,
        budget: unassigned.reduce((sum, i) => sum + i.budget, 0),
      };
    }
    const rs = roomStats.find((r) => r.id === selectedRoom);
    return rs ? {
      name: rs.name,
      roomName: rs.name,
      items: rs.items,
      total: rs.total,
      delivered: rs.delivered,
      ordered: rs.ordered,
      overdueItems: rs.overdueItems,
      budget: rs.budget,
    } : null;
  }, [selectedRoom, roomStats, unassigned]);

  if (rooms.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <div style={{ marginBottom: 16, color: "rgb(var(--ink))", opacity: 0.3, display: "flex", justifyContent: "center" }}>
          <Icons.Home className="w-10 h-10" />
        </div>
        <div style={{
          fontFamily: display, fontSize: 18, fontWeight: 700,
          color: "rgb(var(--ink))", marginBottom: 8,
        }}>
          Нет помещений
        </div>
        <div style={{
          fontFamily: mono, fontSize: "var(--af-fs-12)",
          color: "rgb(var(--ink))", opacity: 0.5, lineHeight: 1.6,
        }}>
          Добавьте помещения в настройках комплектации
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", gap: 16 }}>
      {/* Floor plan grid */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
        }}>
          {roomStats.map((room) => {
            const progress = room.total > 0 ? Math.round((room.delivered / room.total) * 100) : 0;
            const spanWide = medianArea > 0 && room.area && room.area > medianArea;
            const isSelected = selectedRoom === room.id;

            return (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(isSelected ? null : room.id)}
                style={{
                  gridColumn: spanWide ? "span 2" : "span 1",
                  background: isSelected ? "rgb(var(--srf))" : "rgb(var(--srf))",
                  border: room.overdueItems.length > 0
                    ? "2px solid rgb(var(--ink))"
                    : isSelected
                      ? "1px solid rgb(var(--ink))"
                      : "0.5px solid rgb(var(--line))",
                  padding: 16,
                  cursor: "pointer",
                  transition: "background 0.15s, border 0.15s",
                  minHeight: 100,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{
                    fontFamily: display, fontSize: 14, fontWeight: 700,
                    color: "rgb(var(--ink))", marginBottom: 2,
                  }}>
                    {room.name}
                  </div>
                  {room.area && (
                    <div style={{
                      fontFamily: mono, fontSize: "var(--af-fs-10)",
                      color: "rgb(var(--ink))", opacity: 0.5, marginBottom: 8,
                    }}>
                      {room.area} м²
                    </div>
                  )}
                </div>

                <div>
                  {room.total > 0 ? (
                    <>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: 4,
                      }}>
                        <span style={{
                          fontFamily: mono, fontSize: "var(--af-fs-10)",
                          color: "rgb(var(--ink))", opacity: 0.5,
                        }}>
                          {room.delivered}/{room.total}
                        </span>
                        <span style={{
                          fontFamily: mono, fontSize: "var(--af-fs-10)",
                          color: "rgb(var(--ink))", fontWeight: 600,
                        }}>
                          {progress}%
                        </span>
                      </div>
                      <div style={{ height: 3, background: "rgb(var(--line))", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", background: "rgb(var(--ink))",
                          width: `${progress}%`, transition: "width 0.5s",
                        }} />
                      </div>
                    </>
                  ) : (
                    <span style={{
                      fontFamily: mono, fontSize: "var(--af-fs-10)",
                      color: "rgb(var(--ink))", opacity: 0.5,
                    }}>
                      Нет позиций
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Unassigned block */}
          {unassigned.length > 0 && (
            <div
              onClick={() => setSelectedRoom(
                selectedRoom === "__unassigned__" ? null : "__unassigned__"
              )}
              style={{
                gridColumn: "span 1",
                background: "rgb(var(--srf))",
                border: selectedRoom === "__unassigned__"
                  ? "1px solid rgb(var(--ink))"
                  : "0.5px dashed rgb(var(--line))",
                padding: 16,
                cursor: "pointer",
                transition: "background 0.15s",
                minHeight: 80,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div style={{
                fontFamily: mono, fontSize: "var(--af-fs-11)",
                color: "rgb(var(--ink))", opacity: 0.5, marginBottom: 4,
              }}>
                Без помещения
              </div>
              <div style={{
                fontFamily: mono, fontSize: "var(--af-fs-13)",
                color: "rgb(var(--ink))", fontWeight: 600,
              }}>
                {unassigned.length}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Side panel ── */}
      {selectedRoomData && (
        <div style={{
          width: 340, flexShrink: 0,
          background: "rgb(var(--srf))", border: "0.5px solid rgb(var(--line))",
          padding: 20, alignSelf: "flex-start",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16,
          }}>
            <div style={{
              fontFamily: display, fontSize: 16, fontWeight: 700,
              color: "rgb(var(--ink))",
            }}>
              {selectedRoomData.name}
            </div>
            <button
              onClick={() => setSelectedRoom(null)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 4, display: "flex", color: "rgb(var(--ink))", opacity: 0.5,
              }}
            >
              <Icons.X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          {selectedRoomData.total > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 6,
              }}>
                <span style={{ fontFamily: mono, fontSize: "var(--af-fs-11)", color: "rgb(var(--ink))", opacity: 0.5 }}>
                  Прогресс
                </span>
                <span style={{ fontFamily: mono, fontSize: "var(--af-fs-11)", color: "rgb(var(--ink))", fontWeight: 600 }}>
                  {Math.round((selectedRoomData.delivered / selectedRoomData.total) * 100)}%
                </span>
              </div>
              <div style={{ height: 4, background: "rgb(var(--line))", overflow: "hidden" }}>
                <div style={{
                  height: "100%", background: "rgb(var(--ink))",
                  width: `${Math.round((selectedRoomData.delivered / selectedRoomData.total) * 100)}%`,
                  transition: "width 0.5s",
                }} />
              </div>
            </div>
          )}

          {/* Three metrics */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2,
            marginBottom: 20,
          }}>
            <div style={{
              background: "rgb(var(--line), 0.3)", padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontFamily: mono, fontSize: "var(--af-fs-14)", fontWeight: 600, color: "rgb(var(--ink))" }}>
                {selectedRoomData.ordered}
              </div>
              <div style={{ fontFamily: mono, fontSize: "var(--af-fs-9)", color: "rgb(var(--ink))", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Куплено
              </div>
            </div>
            <div style={{
              background: "rgb(var(--line), 0.3)", padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontFamily: mono, fontSize: "var(--af-fs-14)", fontWeight: 600, color: "rgb(var(--ink))" }}>
                {selectedRoomData.total}
              </div>
              <div style={{ fontFamily: mono, fontSize: "var(--af-fs-9)", color: "rgb(var(--ink))", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Всего
              </div>
            </div>
            <div style={{
              background: "rgb(var(--line), 0.3)", padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontFamily: mono, fontSize: "var(--af-fs-14)", fontWeight: 600, color: "rgb(var(--ink))" }}>
                {selectedRoomData.budget > 0 ? formatPrice(selectedRoomData.budget) : "—"}
              </div>
              <div style={{ fontFamily: mono, fontSize: "var(--af-fs-9)", color: "rgb(var(--ink))", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Бюджет
              </div>
            </div>
          </div>

          {/* Overdue items (at top) */}
          {selectedRoomData.overdueItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: mono, fontSize: "var(--af-fs-9)", textTransform: "uppercase",
                letterSpacing: "0.14em", color: "rgb(var(--ink))",
                marginBottom: 10,
              }}>
                Просроченные позиции
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {selectedRoomData.overdueItems.map((item) => {
                  const riskCfg = RISK_CONFIG[item.riskCalc];
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: "8px 10px",
                        background: "rgb(var(--line), 0.3)",
                        border: "0.5px solid rgb(var(--line))",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                    >
                      <span style={{
                        fontFamily: mono, fontSize: "var(--af-fs-11)",
                        color: "rgb(var(--ink))", flex: 1, minWidth: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {item.name}
                      </span>
                      <span style={{
                        fontFamily: mono, fontSize: "var(--af-fs-10)", fontWeight: 500,
                        padding: "1px 6px", background: riskCfg.bg, color: riskCfg.text,
                        marginLeft: 8, whiteSpace: "nowrap",
                      }}>
                        {item.daysUntilDeadline !== null
                          ? `${Math.abs(item.daysUntilDeadline)} дн.`
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Link to spec */}
          {selectedRoomData.roomName && onNavigateToSpec && (
            <button
              onClick={() => onNavigateToSpec(selectedRoomData.roomName)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontFamily: mono, fontSize: "var(--af-fs-10)", textTransform: "uppercase",
                letterSpacing: "0.12em", padding: "10px 0",
                border: "0.5px solid rgb(var(--line))", background: "transparent",
                color: "rgb(var(--ink))", cursor: "pointer", transition: "all 0.15s",
              }}
              className="af-btn-hover"
            >
              Открыть все позиции
              <Icons.ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Responsive override for mobile */}
      <style jsx>{`
        @media (max-width: 767px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 900px) {
          div[style*="width: 340"] {
            position: fixed !important;
            right: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            width: 320px !important;
            z-index: 50 !important;
            overflow-y: auto !important;
            box-shadow: -2px 0 8px rgba(0,0,0,0.1) !important;
          }
        }
      `}</style>
    </div>
  );
}
