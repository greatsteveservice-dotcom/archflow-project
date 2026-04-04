"use client";

import { useState, useMemo, useCallback } from "react";
import { Icons } from "../Icons";
import { formatShortDate, updateStage, deleteStage } from "../../lib/queries";
import { SUPPLY_STATUS_CONFIG, RISK_CONFIG } from "../../lib/types";
import type { SupplyItemWithCalc, Stage, StageStatus } from "../../lib/types";

interface SupplyStagesProps {
  stages: Stage[];
  items: SupplyItemWithCalc[];
  refetchStages?: () => void;
  toast?: (msg: string) => void;
}

const mono = "'IBM Plex Mono', monospace";
const display = "'Playfair Display', serif";

const STAGE_STATUS_STYLE: Record<StageStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Ожидает", bg: "rgb(var(--line), 0.3)", text: "rgb(var(--ink))" },
  in_progress: { label: "В работе", bg: "rgb(var(--line))", text: "rgb(var(--ink))" },
  done: { label: "Завершён", bg: "rgb(var(--line), 0.3)", text: "rgb(var(--ink))" },
};

export function SupplyStages({ stages, items, refetchStages, toast }: SupplyStagesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const doToast = toast || (() => {});

  const stageData = useMemo(() => {
    return stages.map((stage) => {
      const stageItems = items.filter((i) => i.target_stage_id === stage.id);
      const total = stageItems.length;
      const delivered = stageItems.filter((i) => i.status === "delivered").length;
      const ordered = stageItems.filter((i) => ["ordered", "in_production"].includes(i.status)).length;
      const critical = stageItems.filter((i) => i.riskCalc === "critical" || i.riskCalc === "high").length;
      const budget = stageItems.reduce((sum, i) => sum + i.budget, 0);

      return {
        ...stage,
        items: stageItems,
        total,
        delivered,
        ordered,
        critical,
        budget,
      };
    });
  }, [stages, items]);

  const startEdit = useCallback((stage: Stage) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setConfirmDeleteId(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditName("");
  }, []);

  const saveEdit = useCallback(async (stageId: string) => {
    if (!editName.trim() || savingId) return;
    setSavingId(stageId);
    try {
      await updateStage(stageId, { name: editName.trim() });
      doToast("Этап обновлён");
      setEditingId(null);
      setEditName("");
      refetchStages?.();
    } catch (err: any) {
      doToast("Ошибка: " + (err.message || "не удалось обновить"));
    } finally {
      setSavingId(null);
    }
  }, [editName, savingId, doToast, refetchStages]);

  const handleDelete = useCallback(async (stageId: string) => {
    if (deletingId) return;
    setDeletingId(stageId);
    try {
      await deleteStage(stageId);
      doToast("Этап удалён");
      setConfirmDeleteId(null);
      refetchStages?.();
    } catch (err: any) {
      doToast("Ошибка: " + (err.message || "не удалось удалить"));
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, doToast, refetchStages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {stageData.map((stage) => {
        const stageStyle = STAGE_STATUS_STYLE[stage.status];
        const progress = stage.total > 0 ? Math.round((stage.delivered / stage.total) * 100) : 0;
        const isEditing = editingId === stage.id;
        const isConfirmingDelete = confirmDeleteId === stage.id;
        const isSaving = savingId === stage.id;
        const isDeleting = deletingId === stage.id;

        return (
          <div
            key={stage.id}
            className="group"
            style={{
              background: 'rgb(var(--srf))',
              border: '0.5px solid rgb(var(--line))',
              padding: 20,
            }}
          >
            {/* Stage header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={{
                  width: 32, height: 32, background: 'rgb(var(--line), 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: mono, fontSize: 'var(--af-fs-13)', fontWeight: 600, color: 'rgb(var(--ink))', opacity: 0.5,
                  flexShrink: 0,
                }}>
                  {stage.sort_order}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(stage.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        style={{
                          flex: 1, padding: '4px 8px',
                          border: '0.5px solid rgb(var(--line))',
                          fontFamily: mono, fontSize: 'var(--af-fs-13)',
                          color: 'rgb(var(--ink))', outline: 'none',
                          background: 'rgb(var(--line), 0.15)',
                        }}
                      />
                      <button
                        onClick={() => saveEdit(stage.id)}
                        disabled={!editName.trim() || isSaving}
                        style={{
                          background: 'none', border: 'none',
                          cursor: !editName.trim() || isSaving ? 'not-allowed' : 'pointer',
                          padding: 2, display: 'flex',
                          color: 'rgb(var(--ink))', opacity: !editName.trim() || isSaving ? 0.3 : 1,
                        }}
                        title="Сохранить"
                      >
                        <Icons.Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{
                          background: 'none', border: 'none',
                          cursor: 'pointer', padding: 2,
                          display: 'flex', color: 'rgb(var(--ink))', opacity: 0.5,
                        }}
                        title="Отменить"
                      >
                        <Icons.X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: 'rgb(var(--ink))' }}>
                        {stage.name}
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', opacity: 0.5, marginTop: 2 }}>
                        {stage.start_date ? formatShortDate(stage.start_date) : "—"}
                        {stage.end_date ? ` → ${formatShortDate(stage.end_date)}` : ""}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right: status badge + action icons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {stage.critical > 0 && (
                  <span style={{
                    fontFamily: mono, fontSize: 'var(--af-fs-10)', fontWeight: 600,
                    padding: '2px 6px', background: 'rgb(var(--line), 0.3)', color: 'rgb(var(--ink))',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Icons.Alert className="w-3 h-3" /> {stage.critical}
                  </span>
                )}
                <span style={{
                  fontFamily: mono, fontSize: 'var(--af-fs-10)', fontWeight: 500,
                  padding: '2px 8px', background: stageStyle.bg, color: stageStyle.text,
                }}>
                  {stageStyle.label}
                </span>

                {/* Edit/delete icons — visible on hover */}
                {!isEditing && !isConfirmingDelete && (
                  <div
                    className="stage-actions"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      opacity: 0, transition: 'opacity 0.15s',
                    }}
                  >
                    <button
                      onClick={() => startEdit(stage)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 4, display: 'flex', color: 'rgb(var(--ink))', opacity: 0.5,
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                      title="Редактировать"
                    >
                      <Icons.Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(stage.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 4, display: 'flex', color: 'rgb(var(--ink))', opacity: 0.5,
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                      title="Удалить"
                    >
                      <Icons.Trash className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Inline delete confirmation */}
            {isConfirmingDelete && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'rgb(var(--line), 0.15)',
                border: '0.5px solid rgb(var(--line))', marginBottom: 12,
              }}>
                <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', flex: 1 }}>
                  Удалить этап?
                </span>
                <button
                  onClick={() => handleDelete(stage.id)}
                  disabled={isDeleting}
                  style={{
                    background: 'rgb(var(--ink))', color: 'rgb(var(--srf))', border: 'none',
                    fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                    letterSpacing: '0.12em', padding: '6px 14px',
                    cursor: isDeleting ? 'wait' : 'pointer',
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                >
                  {isDeleting ? 'Удаление...' : 'Да'}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  style={{
                    background: 'none', color: 'rgb(var(--ink))', border: '0.5px solid rgb(var(--line))',
                    fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                    letterSpacing: '0.12em', padding: '6px 14px',
                    cursor: 'pointer',
                  }}
                >
                  Отмена
                </button>
              </div>
            )}

            {/* Progress bar */}
            {stage.total > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', opacity: 0.5 }}>
                    {stage.delivered}/{stage.total} доставлено
                  </span>
                  <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))' }}>{progress}%</span>
                </div>
                <div style={{ height: 4, background: 'rgb(var(--line), 0.3)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: 'rgb(var(--ink))',
                    width: `${progress}%`, transition: 'width 0.5s',
                  }} />
                </div>
              </div>
            )}

            {/* Items list */}
            {stage.items.length > 0 ? (
              <div>
                {stage.items.map((item) => {
                  const statusCfg = SUPPLY_STATUS_CONFIG[item.status];
                  const riskCfg = RISK_CONFIG[item.riskCalc];
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 0', borderBottom: '0.5px solid rgb(var(--line), 0.3)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-13)', color: 'rgb(var(--ink))' }}>{item.name}</span>
                        {item.supplier && (
                          <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', opacity: 0.5, marginLeft: 8 }}>{item.supplier}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
                        <span style={{
                          fontFamily: mono, fontSize: 'var(--af-fs-10)', fontWeight: 500,
                          padding: '1px 6px', background: riskCfg.bg, color: riskCfg.text,
                        }}>
                          {riskCfg.label}
                        </span>
                        <span style={{
                          fontFamily: mono, fontSize: 'var(--af-fs-10)', fontWeight: 500,
                          padding: '1px 6px', background: statusCfg.bg, color: statusCfg.text,
                        }}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))', opacity: 0.5, padding: '8px 0' }}>
                Нет позиций для этого этапа
              </div>
            )}

            {/* CSS for hover: show action buttons */}
            <style jsx>{`
              .group:hover .stage-actions {
                opacity: 1 !important;
              }
            `}</style>
          </div>
        );
      })}
    </div>
  );
}
