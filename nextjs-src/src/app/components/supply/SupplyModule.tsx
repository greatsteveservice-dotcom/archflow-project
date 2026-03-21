"use client";

import { useState, useMemo } from "react";
import { Icons } from "../Icons";
import Loading, { ErrorMessage } from "../Loading";
import { useProjectStages, useProjectSupplyItems } from "../../lib/hooks";
import { calcSupplyItem } from "../../lib/queries";
import type { SupplyItemWithCalc } from "../../lib/types";
import { SupplyDashboard } from "./SupplyDashboard";
import { SupplySpec } from "./SupplySpec";
import { SupplyTimeline } from "./SupplyTimeline";
import { SupplyStages } from "./SupplyStages";

interface SupplyModuleProps {
  projectId: string;
}

const TABS = [
  { id: "dashboard", label: "Обзор", icon: Icons.Grid },
  { id: "spec", label: "Спецификация", icon: Icons.List },
  { id: "timeline", label: "Timeline", icon: Icons.Timeline },
  { id: "stages", label: "Этапы", icon: Icons.Layers },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SupplyModule({ projectId }: SupplyModuleProps) {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const { data: stages, loading: loadingStages, error: errorStages } = useProjectStages(projectId);
  const { data: items, loading: loadingItems, error: errorItems, refetch: refetchItems } = useProjectSupplyItems(projectId);

  // Computed items with risk/deadline calculations
  const calcItems: SupplyItemWithCalc[] = useMemo(() => {
    if (!items || !stages) return [];
    return items.map((item) => calcSupplyItem(item, stages));
  }, [items, stages]);

  if (loadingStages || loadingItems) return <Loading />;
  if (errorStages) return <ErrorMessage message={errorStages} />;
  if (errorItems) return <ErrorMessage message={errorItems} />;

  if (!stages || stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icons.Layers className="w-10 h-10 text-[#D5D3CE] mb-3" />
        <div className="text-[15px] font-medium text-[#6B6B6B] mb-1">Нет этапов стройки</div>
        <div className="text-[13px] text-[#9B9B9B]">Добавьте этапы в Supabase для работы с комплектацией</div>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="supply-tabs mb-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`supply-tab flex items-center gap-1.5 ${activeTab === tab.id ? "active" : ""}`}
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
        {activeTab === "dashboard" && (
          <SupplyDashboard items={calcItems} stages={stages} />
        )}
        {activeTab === "spec" && (
          <SupplySpec items={calcItems} stages={stages} projectId={projectId} refetchItems={refetchItems} />
        )}
        {activeTab === "timeline" && (
          <SupplyTimeline items={calcItems} stages={stages} />
        )}
        {activeTab === "stages" && (
          <SupplyStages stages={stages} items={calcItems} />
        )}
      </div>
    </div>
  );
}
