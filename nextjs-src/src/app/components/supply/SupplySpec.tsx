"use client";

import { useState, useMemo } from "react";
import { Icons } from "../Icons";
import { formatPrice, formatShortDate, updateSupplyItemStatus, deleteSupplyItem, deleteAllSupplyItems } from "../../lib/queries";
import { SUPPLY_STATUS_CONFIG, RISK_CONFIG } from "../../lib/types";
import type { SupplyItemWithCalc, Stage, SupplyStatus, RiskLevel } from "../../lib/types";

type SortKey = 'name' | 'stage' | 'deadline' | 'risk' | 'status' | 'budget';
type SortDir = 'asc' | 'desc';

const RISK_ORDER: Record<RiskLevel, number> = { critical: 3, high: 2, medium: 1, low: 0 };
const STATUS_ORDER: Record<string, number> = { ordered: 2, approved: 1, pending: 0 };

interface SupplySpecProps {
  items: SupplyItemWithCalc[];
  stages: Stage[];
  projectId: string;
  refetchItems: () => void;
  toast?: (msg: string) => void;
  canDelete?: boolean;
}

export function SupplySpec({ items, stages, projectId, refetchItems, toast, canDelete = false }: SupplySpecProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<SupplyItemWithCalc | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir(key === 'budget' || key === 'risk' ? 'desc' : 'asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteSupplyItem(id)));
      const count = selectedIds.size;
      setSelectedIds(new Set());
      setConfirmDeleteSelected(false);
      refetchItems();
      toast?.(`Удалено ${count} позиций`);
    } catch (err: any) {
      toast?.(err.message || 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeleting(true);
    try {
      await deleteSupplyItem(itemId);
      setSelectedItem(null);
      setConfirmDeleteItem(null);
      refetchItems();
      toast?.('Позиция удалена');
    } catch (err: any) {
      toast?.(err.message || 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const count = await deleteAllSupplyItems(projectId);
      setConfirmDeleteAll(false);
      refetchItems();
      toast?.(`Удалено ${count} позиций`);
    } catch (err: any) {
      toast?.(err.message || 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category || "Без категории"));
    return Array.from(cats);
  }, [items]);

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.supplier || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.category || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || item.status === filterStatus;
      return matchSearch && matchStatus;
    });

    if (!sortKey) return filtered;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name, 'ru'); break;
        case 'stage': cmp = (a.stageName || '').localeCompare(b.stageName || '', 'ru'); break;
        case 'deadline': {
          const da = a.orderDeadline || '9999';
          const db = b.orderDeadline || '9999';
          cmp = da.localeCompare(db);
          break;
        }
        case 'risk': cmp = RISK_ORDER[a.riskCalc] - RISK_ORDER[b.riskCalc]; break;
        case 'status': cmp = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0); break;
        case 'budget': cmp = (a.budget || 0) - (b.budget || 0); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [items, search, filterStatus, sortKey, sortDir]);

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

  const SortTh = ({ k, label, align }: { k: SortKey; label: string; align?: 'right' }) => {
    const active = sortKey === k;
    return (
      <th
        className={`text-[12px] font-semibold uppercase tracking-wider px-4 py-3 cursor-pointer select-none transition-colors hover:text-ink ${active ? 'text-ink' : 'text-ink-muted'} ${align === 'right' ? 'text-right' : ''}`}
        onClick={() => toggleSort(k)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <span className="text-[10px]" style={{ opacity: active ? 1 : 0.3 }}>
            {active ? (sortDir === 'asc' ? '▲' : '▼') : '▲'}
          </span>
        </span>
      </th>
    );
  };

  return (
    <div>
      {/* Toolbar — sticky */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 sticky top-0 z-10 bg-[rgb(var(--srf-raised))] py-3 -mx-1 px-1">
        <div className="relative flex-1 max-w-[300px] w-full">
          <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, поставщику..."
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors bg-srf"
            style={{ fontFamily: "var(--af-font-mono)" }}
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
        {canDelete && items.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            {selectedIds.size > 0 && (
              <button
                className="btn btn-secondary text-[12px]"
                style={{ color: '#111', borderColor: '#111' }}
                onClick={() => setConfirmDeleteSelected(true)}
              >
                Удалить выбранные ({selectedIds.size})
              </button>
            )}
            <button
              className="btn btn-secondary text-[12px]"
              style={{ color: '#999', borderColor: '#ddd' }}
              onClick={() => setConfirmDeleteAll(true)}
            >
              Очистить всё
            </button>
          </div>
        )}
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-ink-faint">
            Позиции не найдены
          </div>
        ) : (
          filteredItems.map((item) => {
            const risk = RISK_CONFIG[item.riskCalc];
            const status = SUPPLY_STATUS_CONFIG[item.status];
            return (
              <div
                key={item.id}
                className="bg-srf border border-line rounded-xl p-4 cursor-pointer active:bg-srf-hover transition-colors"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  {canDelete && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 shrink-0 accent-[#111] cursor-pointer"
                    />
                  )}
                  <span className="text-[13px] font-medium leading-tight flex-1">{item.name}</span>
                  <span className="text-[11px] text-ink-faint whitespace-nowrap">{item.category || "—"}</span>
                </div>
                <div className="text-[12px] text-ink-muted mb-2">{item.stageName}</div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: risk.bg, color: risk.text }}
                  >
                    {risk.label}
                  </span>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: status.bg, color: status.text }}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-mono-custom text-ink-muted">
                    {item.orderDeadline ? formatShortDate(item.orderDeadline) : "—"}
                  </span>
                  <span className="text-[13px] font-mono-custom font-medium">
                    {formatPrice(item.budget)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-srf border border-line rounded-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="sticky top-[52px] z-[5] bg-srf">
            <tr className="border-b border-line-light">
              {canDelete && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-[#111] cursor-pointer"
                  />
                </th>
              )}
              <SortTh k="name" label="Позиция" />
              <SortTh k="stage" label="Этап" />
              <SortTh k="deadline" label="Дедлайн" />
              <SortTh k="risk" label="Риск" />
              <SortTh k="status" label="Статус" />
              <SortTh k="budget" label="Бюджет" align="right" />
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={canDelete ? 7 : 6} className="text-center py-8 text-[13px] text-ink-faint">
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
                    className={`border-b border-line-light last:border-none hover:bg-srf-hover cursor-pointer transition-colors ${selectedIds.has(item.id) ? 'bg-srf-hover' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    {canDelete && (
                      <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4 accent-[#111] cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium">{item.name}</div>
                      <div className="text-[11px] text-ink-faint">{item.category || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-muted">{item.stageName}</td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-mono-custom text-ink-muted">
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
                  className="p-1 rounded-lg hover:bg-srf-secondary transition-colors"
                >
                  <Icons.X className="w-5 h-5 text-ink-faint" />
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
                <div className="flex items-center justify-between py-2 border-t border-line-light">
                  <span className="text-[12px] text-ink-faint">Уровень риска</span>
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
                  <div className="pt-2 border-t border-line-light">
                    <span className="text-[12px] text-ink-faint block mb-1">Заметки</span>
                    <div className="text-[13px] text-ink-muted leading-relaxed">{selectedItem.notes}</div>
                  </div>
                )}

                {/* Status change */}
                <div className="pt-4 border-t border-line-light">
                  <span className="text-[12px] text-ink-faint block mb-2">Изменить статус</span>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(SUPPLY_STATUS_CONFIG) as SupplyStatus[]).map((s) => {
                      const cfg = SUPPLY_STATUS_CONFIG[s];
                      const isActive = selectedItem.status === s;
                      return (
                        <button
                          key={s}
                          className="text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-all"
                          style={{
                            background: isActive ? cfg.bg : "#FFFFFF",
                            color: isActive ? cfg.text : "#111111",
                            borderColor: isActive ? cfg.text + "40" : "#EBEBEB",
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

                {/* Delete */}
                {canDelete && (
                  <div className="pt-4 border-t border-line-light">
                    {confirmDeleteItem === selectedItem.id ? (
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-ink-faint">Удалить позицию?</span>
                        <button
                          className="btn btn-primary text-[12px] px-3 py-1"
                          onClick={() => handleDeleteItem(selectedItem.id)}
                          disabled={deleting}
                        >
                          {deleting ? 'Удаление...' : 'Да, удалить'}
                        </button>
                        <button
                          className="btn btn-secondary text-[12px] px-3 py-1"
                          onClick={() => setConfirmDeleteItem(null)}
                          disabled={deleting}
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-[12px] text-ink-faint hover:text-ink transition-colors"
                        onClick={() => setConfirmDeleteItem(selectedItem.id)}
                      >
                        Удалить позицию
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm delete selected modal */}
      {confirmDeleteSelected && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => !deleting && setConfirmDeleteSelected(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-srf border border-line p-6 z-[61] w-[90vw] max-w-[400px]" style={{ borderRadius: 0 }}>
            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--af-font-display)' }}>Удалить выбранные?</h3>
            <p className="text-[13px] text-ink-muted mb-4">
              Будут удалены {selectedIds.size} позиций. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-secondary text-[13px]"
                onClick={() => setConfirmDeleteSelected(false)}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                className="btn btn-primary text-[13px]"
                onClick={handleDeleteSelected}
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : `Удалить (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirm delete all modal */}
      {confirmDeleteAll && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => !deleting && setConfirmDeleteAll(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-srf border border-line p-6 z-[61] w-[90vw] max-w-[400px]" style={{ borderRadius: 0 }}>
            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--af-font-display)' }}>Очистить спецификацию?</h3>
            <p className="text-[13px] text-ink-muted mb-4">
              Будут удалены все {items.length} позиций. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-secondary text-[13px]"
                onClick={() => setConfirmDeleteAll(false)}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                className="btn btn-primary text-[13px]"
                onClick={handleDeleteAll}
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : `Удалить всё (${items.length})`}
              </button>
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
      <span className="text-[12px] text-ink-faint">{label}</span>
      <span className="text-[13px] font-medium text-ink">{value}</span>
    </div>
  );
}
