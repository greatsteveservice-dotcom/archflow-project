"use client";

import { useState, useMemo, useCallback } from "react";
import { Icons } from "../Icons";
import Loading, { ErrorMessage } from "../Loading";
import { useProjectStages, useProjectSupplyItems, useProjectRooms, useKindStageMappings } from "../../lib/hooks";
import { calcSupplyItem, createSupplyItem, createRoom, fetchProjectRooms } from "../../lib/queries";
import { metrikaGoal } from "../../lib/metrika";
import type { SupplyItemWithCalc, Stage } from "../../lib/types";
import { SupplySpec } from "./SupplySpec";
import { SupplyTimeline } from "./SupplyTimeline";
import SupplyImport from "./SupplyImport";
import SupplySettings from "./SupplySettings";
import SupplyDocuments from "./SupplyDocuments";
import SupplyPlan from "./SupplyPlan";
import KindStageReconciliation from "./KindStageReconciliation";
import SupplyOnboarding from "./SupplyOnboarding";

interface SupplyModuleProps {
  projectId: string;
  toast?: (msg: string) => void;
}

/* ── Top-level sections ── */
const SECTIONS = [
  { id: "items", label: "Позиции" },
  { id: "plan", label: "План" },
  { id: "settings", label: "Настройки" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/* ── Sub-tabs inside "Позиции" ── */
const ITEM_TABS = [
  { id: "spec", label: "Спецификация" },
  { id: "timeline", label: "Timeline" },
  { id: "docs", label: "Документы" },
] as const;

type ItemTabId = (typeof ITEM_TABS)[number]["id"];

const mono = 'var(--af-font-mono)';

export default function SupplyModule({ projectId, toast }: SupplyModuleProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("items");
  const [activeItemTab, setActiveItemTab] = useState<ItemTabId>("spec");
  const [showImport, setShowImport] = useState(false);

  const { data: stages, loading: loadingStages, error: errorStages, refetch: refetchStages } = useProjectStages(projectId);
  const { data: items, loading: loadingItems, error: errorItems, refetch: refetchItems } = useProjectSupplyItems(projectId);
  const { data: rooms, refetch: refetchRooms } = useProjectRooms(projectId);
  const { data: kindMappings, refetch: refetchMappings } = useKindStageMappings();

  const doToast = toast || (() => {});

  // Computed items with risk/deadline calculations
  const calcItems: SupplyItemWithCalc[] = useMemo(() => {
    if (!items || !stages) return [];
    return items.map((item) => calcSupplyItem(item, stages));
  }, [items, stages]);

  // Find unmapped kinds
  const unmappedKinds = useMemo(() => {
    if (!calcItems.length || !kindMappings) return [];
    const mappedKindsLower = new Set((kindMappings || []).map(m => m.kind.toLowerCase().trim()));
    const categories = new Set<string>();
    for (const item of calcItems) {
      if (item.category && !mappedKindsLower.has(item.category.toLowerCase().trim())) {
        categories.add(item.category);
      }
    }
    return Array.from(categories).sort();
  }, [calcItems, kindMappings]);

  // Navigate from Plan to Spec with room filter
  const navigateToSpecWithRoom = useCallback((_roomName: string) => {
    setActiveSection("items");
    setActiveItemTab("spec");
  }, []);

  if (loadingStages || loadingItems) return <Loading />;
  if (errorStages) return <ErrorMessage message={errorStages} />;
  if (errorItems) return <ErrorMessage message={errorItems} />;

  const hasStages = stages && stages.length > 0;
  const hasItems = items && items.length > 0;
  const hasRooms = rooms && rooms.length > 0;

  // Show onboarding when no supply data exists (stages may already be set by designer)
  if (!hasItems && !hasRooms) {
    return (
      <SupplyOnboarding
        projectId={projectId}
        stages={stages || []}
        toast={doToast}
        refetchRooms={refetchRooms}
        refetchItems={refetchItems}
        refetchStages={refetchStages}
        kindMappings={kindMappings || []}
        onComplete={() => {
          refetchRooms();
          refetchItems();
          refetchStages();
        }}
      />
    );
  }

  return (
    <div>
      {/* ── Section tabs ── */}
      <div className="stab mb-5 w-fit">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            className={`stb ${activeSection === section.id ? "active" : ""}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* ── Kind→Stage reconciliation banner ── */}
      {hasStages && unmappedKinds.length > 0 && activeSection === "items" && (
        <KindStageReconciliation
          unmappedKinds={unmappedKinds}
          stages={stages!}
          toast={doToast}
          onSaved={refetchMappings}
        />
      )}

      {/* ── Section content ── */}
      <div className="animate-fade-in">
        {/* ═══ ПОЗИЦИИ ═══ */}
        {activeSection === "items" && (
          <div>
            {/* Sub-header: tabs + import button */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16, flexWrap: "wrap", gap: 8,
            }}>
              <div className="stab w-fit" style={{ marginBottom: 0 }}>
                {ITEM_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={`stb ${activeItemTab === tab.id ? "active" : ""}`}
                    onClick={() => setActiveItemTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {hasStages && (
                <button
                  onClick={() => setShowImport(!showImport)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontFamily: mono, fontSize: "var(--af-fs-9)", textTransform: "uppercase",
                    letterSpacing: "0.12em", padding: "6px 14px",
                    border: "0.5px solid rgb(var(--line))", background: "transparent",
                    color: "rgb(var(--ink))", cursor: "pointer", transition: "all 0.15s",
                  }}
                  className="af-btn-hover"
                >
                  <Icons.Upload className="w-3.5 h-3.5" />
                  Импортировать Excel
                </button>
              )}
            </div>

            {/* Import overlay */}
            {showImport && hasStages && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 12,
                }}>
                  <span style={{
                    fontFamily: mono, fontSize: "var(--af-fs-9)", textTransform: "uppercase",
                    letterSpacing: "0.14em", color: "rgb(var(--ink))",
                  }}>
                    Импорт из Excel
                  </span>
                  <button
                    onClick={() => setShowImport(false)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: 4, display: "flex", color: "rgb(var(--ink))", opacity: 0.5,
                    }}
                  >
                    <Icons.X className="w-4 h-4" />
                  </button>
                </div>
                <SupplyImport
                  projectId={projectId}
                  stages={stages!}
                  toast={doToast}
                  onImportComplete={() => { metrikaGoal('excel_imported', { source: 'supply' }); refetchItems(); refetchRooms(); setShowImport(false); }}
                  kindMappings={kindMappings || []}
                />
              </div>
            )}

            {/* Tab content */}
            {!hasStages && activeItemTab !== "docs" ? (
              <EmptyStagesMessage />
            ) : (
              <>
                {activeItemTab === "spec" && hasStages && (
                  !hasItems ? (
                    <EmptyItemsState
                      projectId={projectId}
                      stages={stages!}
                      toast={doToast}
                      onImportClick={() => setShowImport(true)}
                      onItemCreated={() => { refetchItems(); refetchRooms(); }}
                    />
                  ) : (
                    <SupplySpec items={calcItems} stages={stages!} projectId={projectId} refetchItems={refetchItems} toast={doToast} canDelete={true} />
                  )
                )}
                {activeItemTab === "timeline" && hasStages && (
                  <SupplyTimeline items={calcItems} stages={stages!} />
                )}
                {activeItemTab === "docs" && (
                  <SupplyDocuments projectId={projectId} toast={doToast} />
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ ПЛАН ═══ */}
        {activeSection === "plan" && (
          hasStages ? (
            <SupplyPlan
              items={calcItems}
              rooms={rooms || []}
              onNavigateToSpec={navigateToSpecWithRoom}
            />
          ) : (
            <EmptyStagesMessage />
          )
        )}

        {/* ═══ НАСТРОЙКИ ═══ */}
        {activeSection === "settings" && (
          <SupplySettings
            projectId={projectId}
            toast={doToast}
            stages={stages || []}
            items={calcItems}
            refetchStages={refetchStages}
          />
        )}
      </div>
    </div>
  );
}

/** Empty state when stages exist but no items — two paths: import or add manually */
function EmptyItemsState({ projectId, stages, toast, onImportClick, onItemCreated }: {
  projectId: string;
  stages: Stage[];
  toast: (msg: string) => void;
  onImportClick: () => void;
  onItemCreated: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [budget, setBudget] = useState('');
  const [stageId, setStageId] = useState(stages[0]?.id || '');

  const resetForm = () => {
    setName(''); setRoom(''); setCategory(''); setQuantity('1'); setBudget(''); setStageId(stages[0]?.id || '');
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createSupplyItem({
        project_id: projectId,
        name: name.trim(),
        room: room.trim() || undefined,
        category: category.trim() || undefined,
        quantity: parseInt(quantity) || 1,
        budget: parseFloat(budget.replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
        target_stage_id: stageId || undefined,
      });
      // Auto-create room if it doesn't exist
      if (room.trim()) {
        try {
          const existing = await fetchProjectRooms(projectId);
          const exists = existing.some(r => r.name.toLowerCase().trim() === room.trim().toLowerCase());
          if (!exists) {
            await createRoom({ project_id: projectId, name: room.trim(), sort_order: existing.length + 1 });
          }
        } catch { /* non-critical */ }
      }
      toast('Позиция добавлена');
      resetForm();
      onItemCreated();
    } catch (err: any) {
      toast(err?.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '0.5px solid rgb(var(--line))',
    fontFamily: mono, fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))',
    background: 'rgb(var(--srf))', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))',
    opacity: 0.5, display: 'block', marginBottom: 4,
  };

  if (!showForm) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ marginBottom: 16, color: 'rgb(var(--ink))', opacity: 0.2, display: 'flex', justifyContent: 'center' }}>
          <Icons.Box className="w-12 h-12" />
        </div>
        <div style={{
          fontFamily: 'var(--af-font-display)', fontSize: 18, fontWeight: 700,
          color: 'rgb(var(--ink))', marginBottom: 6,
        }}>
          Нет позиций
        </div>
        <div style={{
          fontFamily: mono, fontSize: 'var(--af-fs-12)',
          color: 'rgb(var(--ink))', opacity: 0.5, lineHeight: 1.6, marginBottom: 28,
        }}>
          Импортируйте из Excel или добавьте первую позицию вручную
        </div>
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onImportClick}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
              letterSpacing: '0.12em', padding: '10px 20px',
              background: 'rgb(var(--ink))', color: 'rgb(var(--srf))',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Icons.Upload className="w-3.5 h-3.5" />
            Импорт из Excel
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
              letterSpacing: '0.12em', padding: '10px 20px',
              background: 'transparent', color: 'rgb(var(--ink))',
              border: '0.5px solid rgb(var(--line))', cursor: 'pointer',
            }}
          >
            <Icons.Plus className="w-3.5 h-3.5" />
            Добавить вручную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))',
      padding: 24, maxWidth: 500,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          fontFamily: 'var(--af-font-display)', fontSize: 16, fontWeight: 700,
          color: 'rgb(var(--ink))',
        }}>
          Новая позиция
        </div>
        <button
          onClick={() => { setShowForm(false); resetForm(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'rgb(var(--ink))', opacity: 0.4 }}
        >
          <Icons.X className="w-4 h-4" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Name — required */}
        <div>
          <label style={labelStyle}>Наименование *</label>
          <input
            type="text" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleAdd(); }}
            placeholder="Керамогранит 60×60"
            style={inputStyle} autoFocus
          />
        </div>

        {/* Room + Category row */}
        <div style={{ display: 'flex', gap: 2 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Помещение</label>
            <input type="text" value={room} onChange={e => setRoom(e.target.value)} placeholder="Гостиная" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Вид</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Плитка" style={inputStyle} />
          </div>
        </div>

        {/* Quantity + Budget row */}
        <div style={{ display: 'flex', gap: 2 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Количество</label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Цена за ед.</label>
            <input type="text" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>

        {/* Stage */}
        <div>
          <label style={labelStyle}>Этап</label>
          <select value={stageId} onChange={e => setStageId(e.target.value)} style={{ ...inputStyle, height: 36 }}>
            <option value="">Не указан</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 2, marginTop: 16 }}>
        <button
          onClick={handleAdd}
          disabled={!name.trim() || saving}
          style={{
            flex: 1, padding: '10px 0',
            fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
            letterSpacing: '0.12em',
            background: name.trim() ? 'rgb(var(--ink))' : 'transparent',
            color: name.trim() ? 'rgb(var(--srf))' : 'rgb(var(--ink))',
            border: name.trim() ? 'none' : '0.5px solid rgb(var(--line))',
            cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
            opacity: !name.trim() || saving ? 0.4 : 1,
          }}
        >
          {saving ? 'Сохраняем...' : 'Добавить'}
        </button>
        <button
          onClick={onImportClick}
          style={{
            padding: '10px 16px',
            fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
            letterSpacing: '0.12em',
            background: 'transparent', color: 'rgb(var(--ink))',
            border: '0.5px solid rgb(var(--line))', cursor: 'pointer',
          }}
        >
          Или импорт из Excel
        </button>
      </div>
    </div>
  );
}

/** Placeholder when no stages exist */
function EmptyStagesMessage() {
  return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <div style={{ marginBottom: 16, color: "rgb(var(--ink))", opacity: 0.3, display: "flex", justifyContent: "center" }}>
        <Icons.Layers className="w-10 h-10" />
      </div>
      <div style={{
        fontFamily: 'var(--af-font-display)', fontSize: 18, fontWeight: 700,
        color: "rgb(var(--ink))", marginBottom: 8,
      }}>
        Нет этапов стройки
      </div>
      <div style={{
        fontFamily: 'var(--af-font-mono)', fontSize: "var(--af-fs-12)",
        color: "rgb(var(--ink))", opacity: 0.5, lineHeight: 1.6,
      }}>
        Добавьте этапы в разделе Настройки
      </div>
    </div>
  );
}
