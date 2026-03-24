"use client";

import { useState, useMemo } from "react";
import { Icons } from "../Icons";
import { formatPrice, formatShortDate, updateSupplyItemStatus } from "../../lib/queries";
import { SUPPLY_STATUS_CONFIG, RISK_CONFIG } from "../../lib/types";
import type { SupplyItemWithCalc, Stage, SupplyStatus } from "../../lib/types";

interface SupplySpecProps {
  items: SupplyItemWithCalc[];
  stages: Stage[];
  projectId: string;
  refetchItems: () => void;
  toast?: (msg: string) => void;
}

export function SupplySpec({ items, stages, projectId, refetchItems, toast }: SupplySpecProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<SupplyItemWithCalc | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category || "Без категории"));
    return Array.from(cats);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.supplier || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.category || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || item.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [items, search, filterStatus]);

  const handleStatusChange = async (itemId: string, newStatus: SupplyStatus) => {
    setUpdatingStatus(true);
    try {
      await updateSupplyItemStatus(itemId, newStatus);
      refetchItems();
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem({ ...selectedItem, status: newStatus });
      }
    } catch (err: any) {
      toast?.(err.message || 'Ошибка обновления статуса');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-[300px] w-full">
          <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9B9B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, поставщику..."
            className="w-full pl-9 pr-3 py-2 border border-[#E8E6E1] rounded-lg text-sm outline-none focus:border-[#2C5F2D] transition-colors bg-white"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            Все ({items.length})
          </button>
          <button
            className={`filter-tab ${filterStatus === "pending" ? "active" : ""}`}
            onClick={() => setFilterStatus("pending")}
          >
            Ожидает
          </button>
          <button
            className={`filter-tab ${filterStatus === "approved" ? "active" : ""}`}
            onClick={() => setFilterStatus("approved")}
          >
            Согласовано
          </button>
          <button
            className={`filter-tab ${filterStatus === "ordered" ? "active" : ""}`}
            onClick={() => setFilterStatus("ordered")}
          >
            Заказано
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E6E1] rounded-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#F0EEE9]">
              <th className="text-[11px] text-[#9B9B9B] font-medium uppercase tracking-wider px-4 py-3">Позиция</th>
              <th className="text-[11px] text-[#9B9B9B] font-medium uppercase tracking-wider px-4 py-3">Этап</th>
              <th className="text-[11px] text-[#9B9B9B] font-medium uppercase tracking-wider px-4 py-3">Дедлайн</th>
              <th className="text-[11px] text-[#9B9B9B] font-medium uppercase tracking-wider px-4 py-3">Риск</th>
              <th className="text-[11px] text-[#9B9B9B] font-medium uppercase tracking-wider px-4 py-3">Статус</th>
              <th className="text-[11px] text-[#9B9B9B] font-medium uppercase tracking-wider px-4 py-3 text-right">Бюджет</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[13px] text-[#9B9B9B]">
                  Позиции не найдены
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const risk = RISK_CONFIG[item.riskCalc];
                const status = SUPPLY_STATUS_CONFIG[item.status];
                return (
                  <tr
                    key={item.id}
                    className="border-b border-[#F0EEE9] last:border-none hover:bg-[#FAFAF8] cursor-pointer transition-colors"
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium">{item.name}</div>
                      <div className="text-[11px] text-[#9B9B9B]">{item.category || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#6B6B6B]">{item.stageName}</td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-mono-custom text-[#6B6B6B]">
                        {item.orderDeadline ? formatShortDate(item.orderDeadline) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: risk.bg, color: risk.text }}
                      >
                        {risk.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: status.bg, color: status.text }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[13px] font-mono-custom font-medium">
                        {formatPrice(item.budget)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selectedItem && (
        <>
          <div className="supply-drawer-overlay" onClick={() => setSelectedItem(null)} />
          <div className="supply-drawer">
            <div className="p-6">
              {/* Drawer header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">{selectedItem.name}</h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-lg hover:bg-[#F0EEE9] transition-colors"
                >
                  <Icons.X className="w-5 h-5 text-[#9B9B9B]" />
                </button>
              </div>

              {/* Info grid */}
              <div className="space-y-4">
                <InfoRow label="Категория" value={selectedItem.category || "—"} />
                <InfoRow label="Поставщик" value={selectedItem.supplier || "—"} />
                <InfoRow label="Количество" value={String(selectedItem.quantity)} />
                <InfoRow label="Бюджет" value={formatPrice(selectedItem.budget)} />
                <InfoRow label="Этап" value={selectedItem.stageName} />
                <InfoRow
                  label="Начало этапа"
                  value={selectedItem.stageStart ? formatShortDate(selectedItem.stageStart) : "—"}
                />
                <InfoRow label="Срок поставки" value={`${selectedItem.lead_time_days} дн.`} />
                <InfoRow
                  label="Дедлайн заказа"
                  value={selectedItem.orderDeadline ? formatShortDate(selectedItem.orderDeadline) : "—"}
                />
                <InfoRow
                  label="Прогноз доставки"
                  value={selectedItem.deliveryForecast ? formatShortDate(selectedItem.deliveryForecast) : "—"}
                />

                {/* Risk badge */}
                <div className="flex items-center justify-between py-2 border-t border-[#F0EEE9]">
                  <span className="text-[12px] text-[#9B9B9B]">Уровень риска</span>
                  <span
                    className="text-[12px] font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: RISK_CONFIG[selectedItem.riskCalc].bg,
                      color: RISK_CONFIG[selectedItem.riskCalc].text,
                    }}
                  >
                    {RISK_CONFIG[selectedItem.riskCalc].label}
                    {selectedItem.daysUntilDeadline !== null && (
                      <> · {selectedItem.daysUntilDeadline < 0
                        ? `${Math.abs(selectedItem.daysUntilDeadline)} дн. просрочено`
                        : `${selectedItem.daysUntilDeadline} дн.`
                      }</>
                    )}
                  </span>
                </div>

                {/* Notes */}
                {selectedItem.notes && (
                  <div className="pt-2 border-t border-[#F0EEE9]">
                    <span className="text-[12px] text-[#9B9B9B] block mb-1">Заметки</span>
                    <div className="text-[13px] text-[#6B6B6B] leading-relaxed">{selectedItem.notes}</div>
                  </div>
                )}

                {/* Status change */}
                <div className="pt-4 border-t border-[#F0EEE9]">
                  <span className="text-[12px] text-[#9B9B9B] block mb-2">Изменить статус</span>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(SUPPLY_STATUS_CONFIG) as SupplyStatus[]).map((s) => {
                      const cfg = SUPPLY_STATUS_CONFIG[s];
                      const isActive = selectedItem.status === s;
                      return (
                        <button
                          key={s}
                          className="text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-all"
                          style={{
                            background: isActive ? cfg.bg : "white",
                            color: isActive ? cfg.text : "#6B6B6B",
                            borderColor: isActive ? cfg.text + "40" : "#E8E6E1",
                            opacity: updatingStatus ? 0.5 : 1,
                          }}
                          disabled={updatingStatus || isActive}
                          onClick={() => handleStatusChange(selectedItem.id, s)}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[#9B9B9B]">{label}</span>
      <span className="text-[13px] font-medium text-[#1A1A1A]">{value}</span>
    </div>
  );
}
