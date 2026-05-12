"use client";

import { useEffect, useMemo, useState } from "react";
import { Icons } from "../Icons";
import { updateSupplyItem, deleteSupplyItem, calcSupplyItem } from "../../lib/queries";
import { SUPPLY_STATUS_CONFIG } from "../../lib/types";
import type { SupplyItem, Stage, SupplyStatus, SupplyItemWithCalc } from "../../lib/types";

interface SupplyItemDrawerProps {
  item: SupplyItem | null;
  stages: Stage[];
  rooms: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
  toast: (msg: string) => void;
}

const mono = "var(--af-font-mono)";

export default function SupplyItemDrawer({ item, stages, rooms, onClose, onSaved, toast }: SupplyItemDrawerProps) {
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [room, setRoom] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [budget, setBudget] = useState("0");
  const [leadTime, setLeadTime] = useState("0");
  const [stageId, setStageId] = useState("");
  const [status, setStatus] = useState<SupplyStatus>("pending");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [overrideDate, setOverrideDate] = useState("");
  const [useOverride, setUseOverride] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setGroupName(item.group_name || item.category || "");
    setSubcategory(item.subcategory || "");
    setRoom(item.room || "");
    setSupplier(item.supplier || "");
    setQuantity(String(item.quantity ?? 1));
    setBudget(String(item.budget ?? 0));
    setLeadTime(String(item.lead_time_days ?? 0));
    setStageId(item.target_stage_id || "");
    setStatus(item.status);
    setUrl(item.url || "");
    setNotes(item.notes || "");
    setOverrideDate(item.order_deadline_override || "");
    setUseOverride(!!item.order_deadline_override);
  }, [item]);

  // Live-computed deadlines for the form (without saving)
  const livePreview: SupplyItemWithCalc | null = useMemo(() => {
    if (!item) return null;
    const draft: SupplyItem = {
      ...item,
      target_stage_id: stageId || null,
      lead_time_days: Number(leadTime) || 0,
      order_deadline_override: useOverride && overrideDate ? overrideDate : null,
    };
    return calcSupplyItem(draft, stages);
  }, [item, stageId, leadTime, overrideDate, useOverride, stages]);

  // ESC closes
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSupplyItem(item.id, {
        name: name.trim(),
        group_name: groupName.trim() || null,
        subcategory: subcategory.trim() || null,
        room: room.trim() || null,
        supplier: supplier.trim() || null,
        quantity: parseFloat(quantity) || 1,
        budget: parseFloat(budget.replace(/[^\d.,]/g, "").replace(",", ".")) || 0,
        lead_time_days: parseInt(leadTime) || 0,
        target_stage_id: stageId || null,
        status,
        url: url.trim() || null,
        notes: notes.trim() || null,
        order_deadline_override: useOverride && overrideDate ? overrideDate : null,
      });
      toast("Сохранено");
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (newStatus: SupplyStatus) => {
    setSaving(true);
    try {
      await updateSupplyItem(item.id, { status: newStatus });
      setStatus(newStatus);
      toast(`Статус: ${SUPPLY_STATUS_CONFIG[newStatus].label}`);
      onSaved();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Удалить позицию «${item.name}»?`)) return;
    setSaving(true);
    try {
      await deleteSupplyItem(item.id);
      toast("Позиция удалена");
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "0.5px solid rgb(var(--line))",
    fontFamily: mono, fontSize: "var(--af-fs-12)", color: "rgb(var(--ink))",
    background: "rgb(var(--srf))", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: mono, fontSize: "var(--af-fs-10)", color: "rgb(var(--ink))",
    opacity: 0.6, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em",
  };

  return (
    <>
      <div className="af-drawer-backdrop" onClick={onClose} />
      <aside className="af-drawer" role="dialog" aria-label="Позиция комплектации">
        <header className="af-drawer-head">
          <div className="af-drawer-title">Позиция</div>
          <button type="button" onClick={onClose} className="af-drawer-close" aria-label="Закрыть">
            <Icons.X className="w-4 h-4" />
          </button>
        </header>

        <div className="af-drawer-body">
          {/* Live deadline preview */}
          {livePreview && (
            <div className="af-drawer-section">
              <div className="af-drawer-section-title">Сроки</div>
              <div className="af-drawer-deadline">
                <div>
                  <div className="af-drawer-deadline-label">Дата заказа</div>
                  <div className="af-drawer-deadline-value">
                    {livePreview.orderDeadline || "—"}
                    {livePreview.orderDeadlineOverridden && <span className="af-drawer-tag"> · override</span>}
                  </div>
                </div>
                <div>
                  <div className="af-drawer-deadline-label">Начало этапа</div>
                  <div className="af-drawer-deadline-value">{livePreview.stageStart || "—"}</div>
                </div>
                <div>
                  <div className="af-drawer-deadline-label">До заказа</div>
                  <div className="af-drawer-deadline-value">
                    {livePreview.daysUntilDeadline === null ? "—" :
                      livePreview.daysUntilDeadline < 0 ? `${Math.abs(livePreview.daysUntilDeadline)} дн. просрочено` :
                      `${livePreview.daysUntilDeadline} дн.`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Name */}
          <div className="af-drawer-section">
            <label style={labelStyle}>Наименование</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>

          {/* Group + Subcategory */}
          <div className="af-drawer-row">
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Группа</label>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Двери, Мебель" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Подгруппа</label>
              <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Двери распашные" style={inputStyle} />
            </div>
          </div>

          {/* Room + Supplier */}
          <div className="af-drawer-row">
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Помещение</label>
              <input value={room} onChange={(e) => setRoom(e.target.value)} list="af-rooms" style={inputStyle} />
              <datalist id="af-rooms">
                {rooms.map((r) => <option key={r.id} value={r.name} />)}
              </datalist>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Поставщик</label>
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Stage + Lead time */}
          <div className="af-drawer-row">
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Этап стройки</label>
              <select value={stageId} onChange={(e) => setStageId(e.target.value)} style={{ ...inputStyle, height: 36 }}>
                <option value="">— не указан —</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ width: 120 }}>
              <label style={labelStyle}>Срок, дн.</label>
              <input type="number" min={0} value={leadTime} onChange={(e) => setLeadTime(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Override deadline */}
          <div className="af-drawer-section">
            <label className="af-drawer-checkbox">
              <input type="checkbox" checked={useOverride} onChange={(e) => setUseOverride(e.target.checked)} />
              <span>Переопределить дату заказа вручную</span>
            </label>
            {useOverride && (
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                style={{ ...inputStyle, marginTop: 8 }}
              />
            )}
          </div>

          {/* Quantity + Budget */}
          <div className="af-drawer-row">
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Количество</label>
              <input type="number" min={0} step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Цена за ед.</label>
              <input value={budget} onChange={(e) => setBudget(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Status */}
          <div className="af-drawer-section">
            <label style={labelStyle}>Статус</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as SupplyStatus)} style={{ ...inputStyle, height: 36 }}>
              {(Object.keys(SUPPLY_STATUS_CONFIG) as SupplyStatus[]).map((s) => (
                <option key={s} value={s}>{SUPPLY_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          {/* URL */}
          <div className="af-drawer-section">
            <label style={labelStyle}>Ссылка на товар</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>

          {/* Notes */}
          <div className="af-drawer-section">
            <label style={labelStyle}>Заметки</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {/* Quick status actions */}
          <div className="af-drawer-quick">
            {status !== "ordered" && (
              <button type="button" onClick={() => handleQuickStatus("ordered")} disabled={saving} className="af-drawer-quick-btn">
                Отметить заказанным
              </button>
            )}
            {status !== "delivered" && (
              <button type="button" onClick={() => handleQuickStatus("delivered")} disabled={saving} className="af-drawer-quick-btn">
                Отметить доставленным
              </button>
            )}
          </div>
        </div>

        <footer className="af-drawer-foot">
          <button type="button" onClick={handleDelete} disabled={saving} className="af-drawer-delete">
            Удалить
          </button>
          <div style={{ display: "flex", gap: 2 }}>
            <button type="button" onClick={onClose} disabled={saving} className="af-drawer-cancel">
              Отмена
            </button>
            <button type="button" onClick={handleSave} disabled={saving || !name.trim()} className="af-drawer-save">
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
