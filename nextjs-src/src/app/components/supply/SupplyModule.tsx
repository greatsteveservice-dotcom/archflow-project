"use client";

import { useState, useMemo, useCallback } from "react";
import { Icons } from "../Icons";
import Loading, { ErrorMessage } from "../Loading";
import { useProjectStages, useProjectSupplyItems } from "../../lib/hooks";
import { calcSupplyItem, createStage } from "../../lib/queries";
import type { SupplyItemWithCalc } from "../../lib/types";
import { SupplyDashboard } from "./SupplyDashboard";
import { SupplySpec } from "./SupplySpec";
import { SupplyTimeline } from "./SupplyTimeline";
import { SupplyStages } from "./SupplyStages";
import SupplyImport from "./SupplyImport";
import SupplySettings from "./SupplySettings";
import SupplyDocuments from "./SupplyDocuments";

interface SupplyModuleProps {
  projectId: string;
  toast?: (msg: string) => void;
}

const TABS = [
  { id: "dashboard", label: "Обзор", icon: Icons.Grid },
  { id: "spec", label: "Спецификация", icon: Icons.List },
  { id: "timeline", label: "Timeline", icon: Icons.Timeline },
  { id: "stages", label: "Этапы", icon: Icons.Layers },
  { id: "docs", label: "Документы", icon: Icons.File },
  { id: "import", label: "Импорт", icon: Icons.Upload },
  { id: "settings", label: "Настройки", icon: Icons.Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

const mono = "'IBM Plex Mono', monospace";
const display = "'Playfair Display', serif";

/** Default stages for interior design projects */
const DEFAULT_STAGES = [
  "Демонтаж",
  "Черновые работы",
  "Электрика и сантехника",
  "Стяжка и штукатурка",
  "Чистовая отделка",
  "Мебель и декор",
];

export default function SupplyModule({ projectId, toast }: SupplyModuleProps) {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const { data: stages, loading: loadingStages, error: errorStages, refetch: refetchStages } = useProjectStages(projectId);
  const { data: items, loading: loadingItems, error: errorItems, refetch: refetchItems } = useProjectSupplyItems(projectId);

  // Add stage form state
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageStart, setNewStageStart] = useState("");
  const [newStageEnd, setNewStageEnd] = useState("");
  const [addingStage, setAddingStage] = useState(false);
  const [creatingDefaults, setCreatingDefaults] = useState(false);

  const doToast = toast || (() => {});

  // Computed items with risk/deadline calculations
  const calcItems: SupplyItemWithCalc[] = useMemo(() => {
    if (!items || !stages) return [];
    return items.map((item) => calcSupplyItem(item, stages));
  }, [items, stages]);

  const handleAddStage = useCallback(async () => {
    if (!newStageName.trim() || addingStage) return;
    setAddingStage(true);
    try {
      await createStage({
        project_id: projectId,
        name: newStageName.trim(),
        start_date: newStageStart || null,
        end_date: newStageEnd || null,
        sort_order: (stages?.length || 0) + 1,
      });
      doToast("Этап добавлен");
      setNewStageName("");
      setNewStageStart("");
      setNewStageEnd("");
      setShowAddStage(false);
      refetchStages();
    } catch (err: any) {
      doToast("Ошибка: " + (err.message || "не удалось создать этап"));
    } finally {
      setAddingStage(false);
    }
  }, [projectId, newStageName, newStageStart, newStageEnd, addingStage, stages, doToast, refetchStages]);

  const handleCreateDefaults = useCallback(async () => {
    if (creatingDefaults) return;
    setCreatingDefaults(true);
    try {
      for (let i = 0; i < DEFAULT_STAGES.length; i++) {
        await createStage({
          project_id: projectId,
          name: DEFAULT_STAGES[i],
          sort_order: i + 1,
        });
      }
      doToast(`Создано ${DEFAULT_STAGES.length} этапов`);
      refetchStages();
    } catch (err: any) {
      doToast("Ошибка: " + (err.message || "не удалось создать этапы"));
    } finally {
      setCreatingDefaults(false);
    }
  }, [projectId, creatingDefaults, doToast, refetchStages]);

  if (loadingStages || loadingItems) return <Loading />;
  if (errorStages) return <ErrorMessage message={errorStages} />;
  if (errorItems) return <ErrorMessage message={errorItems} />;

  const hasStages = stages && stages.length > 0;

  // Tabs that work without stages
  const noStagesTabs: TabId[] = ["docs", "settings"];

  return (
    <div>
      {/* Sub-tabs — always visible */}
      <div className="stab mb-5 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`stb ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {/* Tabs that need stages — show empty state if none */}
        {!hasStages && !noStagesTabs.includes(activeTab) ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ marginBottom: 16, color: '#999', display: 'flex', justifyContent: 'center' }}>
              <Icons.Layers className="w-10 h-10" />
            </div>
            <div style={{
              fontFamily: display, fontSize: 18, fontWeight: 700,
              color: '#111', marginBottom: 8,
            }}>
              Нет этапов стройки
            </div>
            <div style={{
              fontFamily: mono, fontSize: 12, color: '#888',
              marginBottom: 28, lineHeight: 1.6,
            }}>
              Добавьте этапы, чтобы начать работу с комплектацией
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <button
                onClick={handleCreateDefaults}
                disabled={creatingDefaults}
                style={{
                  background: '#111', color: '#fff', border: 'none',
                  fontFamily: mono, fontSize: 9, textTransform: 'uppercase',
                  letterSpacing: '0.14em', padding: '12px 28px',
                  cursor: creatingDefaults ? 'wait' : 'pointer',
                  opacity: creatingDefaults ? 0.6 : 1,
                }}
              >
                {creatingDefaults ? 'Создаём...' : 'Создать стандартные этапы'}
              </button>

              <button
                onClick={() => setShowAddStage(true)}
                style={{
                  background: 'none', color: '#111', border: '0.5px solid #EBEBEB',
                  fontFamily: mono, fontSize: 9, textTransform: 'uppercase',
                  letterSpacing: '0.14em', padding: '10px 24px',
                  cursor: 'pointer',
                }}
              >
                Добавить свой этап
              </button>
            </div>

            {/* Inline add stage form */}
            {showAddStage && (
              <div style={{
                maxWidth: 400, margin: '20px auto 0', textAlign: 'left',
                border: '0.5px solid #EBEBEB', padding: 20,
                background: '#FAFAF8',
              }}>
                <div style={{
                  fontFamily: mono, fontSize: 9, textTransform: 'uppercase',
                  letterSpacing: '0.14em', color: '#111', marginBottom: 14,
                }}>
                  Новый этап
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontFamily: mono, fontSize: 10, color: '#888', display: 'block', marginBottom: 4 }}>
                    Название *
                  </label>
                  <input
                    type="text"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Например: Демонтаж"
                    style={{
                      width: '100%', padding: '8px 10px', border: '0.5px solid #EBEBEB',
                      fontFamily: mono, fontSize: 12, color: '#111',
                      background: '#fff', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontFamily: mono, fontSize: 10, color: '#888', display: 'block', marginBottom: 4 }}>
                      Начало
                    </label>
                    <input
                      type="date"
                      value={newStageStart}
                      onChange={(e) => setNewStageStart(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 10px', border: '0.5px solid #EBEBEB',
                        fontFamily: mono, fontSize: 11, color: '#111',
                        background: '#fff', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontFamily: mono, fontSize: 10, color: '#888', display: 'block', marginBottom: 4 }}>
                      Окончание
                    </label>
                    <input
                      type="date"
                      value={newStageEnd}
                      onChange={(e) => setNewStageEnd(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 10px', border: '0.5px solid #EBEBEB',
                        fontFamily: mono, fontSize: 11, color: '#111',
                        background: '#fff', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleAddStage}
                    disabled={!newStageName.trim() || addingStage}
                    style={{
                      flex: 1, background: '#111', color: '#fff', border: 'none',
                      fontFamily: mono, fontSize: 9, textTransform: 'uppercase',
                      letterSpacing: '0.12em', padding: '10px 0',
                      cursor: !newStageName.trim() || addingStage ? 'not-allowed' : 'pointer',
                      opacity: !newStageName.trim() || addingStage ? 0.4 : 1,
                    }}
                  >
                    {addingStage ? 'Создаём...' : 'Создать'}
                  </button>
                  <button
                    onClick={() => { setShowAddStage(false); setNewStageName(''); setNewStageStart(''); setNewStageEnd(''); }}
                    style={{
                      background: 'none', color: '#111', border: '0.5px solid #EBEBEB',
                      fontFamily: mono, fontSize: 9, textTransform: 'uppercase',
                      letterSpacing: '0.12em', padding: '10px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && hasStages && (
              <SupplyDashboard items={calcItems} stages={stages!} />
            )}
            {activeTab === "spec" && hasStages && (
              <SupplySpec items={calcItems} stages={stages!} projectId={projectId} refetchItems={refetchItems} toast={doToast} />
            )}
            {activeTab === "timeline" && hasStages && (
              <SupplyTimeline items={calcItems} stages={stages!} />
            )}
            {activeTab === "stages" && hasStages && (
              <SupplyStages stages={stages!} items={calcItems} />
            )}
            {activeTab === "docs" && (
              <SupplyDocuments projectId={projectId} toast={doToast} />
            )}
            {activeTab === "import" && hasStages && (
              <SupplyImport projectId={projectId} stages={stages!} toast={doToast} onImportComplete={refetchItems} />
            )}
            {activeTab === "settings" && (
              <SupplySettings projectId={projectId} toast={doToast} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
