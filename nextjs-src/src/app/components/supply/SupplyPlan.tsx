"use client";

import { useState, useMemo } from "react";
import { Icons } from "../Icons";
import { SUPPLY_STATUS_CONFIG, RISK_CONFIG } from "../../lib/types";
import type { SupplyItemWithCalc, ProjectRoom } from "../../lib/types";

interface SupplyPlanProps {
  items: SupplyItemWithCalc[];
  rooms: ProjectRoom[];
}

const mono = "'IBM Plex Mono', monospace";
const display = "'Playfair Display', serif";

export default function SupplyPlan({ items, rooms }: SupplyPlanProps) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Group items by room name
  const roomData = useMemo(() => {
    // Build room stats
    const roomStats = rooms.map((room) => {
      const roomItems = items.filter((i) => i.room === room.name);
      const total = roomItems.length;
      const delivered = roomItems.filter((i) => i.status === "delivered").length;
      const overdue = roomItems.some(
        (i) => i.daysUntilDeadline !== null && i.daysUntilDeadline < 0 && i.status !== "delivered"
      );
      const budget = roomItems.reduce((sum, i) => sum + i.budget, 0);

      return {
        ...room,
        items: roomItems,
        total,
        delivered,
        overdue,
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

  // Selected room details
  const selectedRoomData = useMemo(() => {
    if (!selectedRoom) return null;
    if (selectedRoom === "__unassigned__") {
      return { name: "Без помещения", items: unassigned };
    }
    const rs = roomStats.find((r) => r.id === selectedRoom);
    return rs ? { name: rs.name, items: rs.items } : null;
  }, [selectedRoom, roomStats, unassigned]);

  if (rooms.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <div style={{ marginBottom: 16, color: "#999", display: "flex", justifyContent: "center" }}>
          <Icons.Home className="w-10 h-10" />
        </div>
        <div style={{
          fontFamily: display, fontSize: 18, fontWeight: 700,
          color: "#111", marginBottom: 8,
        }}>
          Нет помещений
        </div>
        <div style={{
          fontFamily: mono, fontSize: "var(--af-fs-12)", color: "#888",
          lineHeight: 1.6,
        }}>
          Добавьте помещения в настройках комплектации
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Floor plan grid */}
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
                background: isSelected ? "#F6F6F4" : "#fff",
                border: room.overdue
                  ? "2px solid #111"
                  : isSelected
                    ? "1px solid #111"
                    : "0.5px solid #EBEBEB",
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
                  color: "#111", marginBottom: 2,
                }}>
                  {room.name}
                </div>
                {room.area && (
                  <div style={{
                    fontFamily: mono, fontSize: "var(--af-fs-10)",
                    color: "#888", marginBottom: 8,
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
                        fontFamily: mono, fontSize: "var(--af-fs-10)", color: "#888",
                      }}>
                        {room.delivered}/{room.total}
                      </span>
                      <span style={{
                        fontFamily: mono, fontSize: "var(--af-fs-10)",
                        color: "#111", fontWeight: 600,
                      }}>
                        {progress}%
                      </span>
                    </div>
                    <div style={{ height: 3, background: "#F6F6F4", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", background: "#111",
                        width: `${progress}%`, transition: "width 0.5s",
                      }} />
                    </div>
                  </>
                ) : (
                  <span style={{
                    fontFamily: mono, fontSize: "var(--af-fs-10)", color: "#888",
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
              background: selectedRoom === "__unassigned__" ? "#F6F6F4" : "#FAFAF8",
              border: selectedRoom === "__unassigned__"
                ? "1px solid #111"
                : "0.5px dashed #EBEBEB",
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
              color: "#888", marginBottom: 4,
            }}>
              Без помещения
            </div>
            <div style={{
              fontFamily: mono, fontSize: "var(--af-fs-13)",
              color: "#111", fontWeight: 600,
            }}>
              {unassigned.length}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedRoomData && selectedRoomData.items.length > 0 && (
        <div style={{
          marginTop: 16, background: "#fff",
          border: "0.5px solid #EBEBEB", padding: 20,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <div style={{
              fontFamily: display, fontSize: 14, fontWeight: 700, color: "#111",
            }}>
              {selectedRoomData.name}
            </div>
            <button
              onClick={() => setSelectedRoom(null)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 4, display: "flex", color: "#888",
              }}
            >
              <Icons.X className="w-4 h-4" />
            </button>
          </div>

          {/* Items table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid #EBEBEB" }}>
                  {["Позиция", "Статус", "Риск", "Этап", "Бюджет"].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontFamily: mono, fontSize: "var(--af-fs-10)",
                        textTransform: "uppercase", letterSpacing: "0.12em",
                        color: "#888", fontWeight: 500,
                        textAlign: "left", padding: "6px 8px",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedRoomData.items.map((item) => {
                  const statusCfg = SUPPLY_STATUS_CONFIG[item.status];
                  const riskCfg = RISK_CONFIG[item.riskCalc];
                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: "0.5px solid #F6F6F4" }}
                    >
                      <td style={{
                        padding: "8px 8px", fontFamily: mono,
                        fontSize: "var(--af-fs-12)", color: "#111",
                      }}>
                        {item.name}
                        {item.supplier && (
                          <span style={{ color: "#888", marginLeft: 8, fontSize: "var(--af-fs-10)" }}>
                            {item.supplier}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px 8px" }}>
                        <span style={{
                          fontFamily: mono, fontSize: "var(--af-fs-10)", fontWeight: 500,
                          padding: "1px 6px", background: statusCfg.bg, color: statusCfg.text,
                          whiteSpace: "nowrap",
                        }}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "8px 8px" }}>
                        <span style={{
                          fontFamily: mono, fontSize: "var(--af-fs-10)", fontWeight: 500,
                          padding: "1px 6px", background: riskCfg.bg, color: riskCfg.text,
                          whiteSpace: "nowrap",
                        }}>
                          {riskCfg.label}
                        </span>
                      </td>
                      <td style={{
                        padding: "8px 8px", fontFamily: mono,
                        fontSize: "var(--af-fs-11)", color: "#888",
                      }}>
                        {item.stageName || "—"}
                      </td>
                      <td style={{
                        padding: "8px 8px", fontFamily: mono,
                        fontSize: "var(--af-fs-11)", color: "#111",
                        textAlign: "right",
                      }}>
                        {item.budget > 0 ? item.budget.toLocaleString("ru-RU") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Responsive override for mobile */}
      <style jsx>{`
        @media (max-width: 767px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
