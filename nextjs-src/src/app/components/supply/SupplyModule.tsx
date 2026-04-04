"use client";

import { useState, useMemo, useCallback } from "react";
import { Icons } from "../Icons";
import Loading, { ErrorMessage } from "../Loading";
import { useProjectStages, useProjectSupplyItems, useProjectRooms, useKindStageMappings } from "../../lib/hooks";
import { calcSupplyItem } from "../../lib/queries";
import type { SupplyItemWithCalc } from "../../lib/types";
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

const mono = "'IBM Plex Mono', monospace";

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

  // Show onboarding if no supply items AND no rooms
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
                  onImportComplete={() => { refetchItems(); setShowImport(false); }}
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
                  <SupplySpec items={calcItems} stages={stages!} projectId={projectId} refetchItems={refetchItems} toast={doToast} />
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

/** Placeholder when no stages exist */
function EmptyStagesMessage() {
  return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <div style={{ marginBottom: 16, color: "rgb(var(--ink))", opacity: 0.3, display: "flex", justifyContent: "center" }}>
        <Icons.Layers className="w-10 h-10" />
      </div>
      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700,
        color: "rgb(var(--ink))", marginBottom: 8,
      }}>
        Нет этапов стройки
      </div>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: "var(--af-fs-12)",
        color: "rgb(var(--ink))", opacity: 0.5, lineHeight: 1.6,
      }}>
        Добавьте этапы в разделе Настройки
      </div>
    </div>
  );
}
