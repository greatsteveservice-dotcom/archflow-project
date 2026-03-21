"use client";

import { useMemo } from "react";
import { Icons } from "../Icons";
import { formatShortDate } from "../../lib/queries";
import { SUPPLY_STATUS_CONFIG, RISK_CONFIG } from "../../lib/types";
import type { SupplyItemWithCalc, Stage, StageStatus } from "../../lib/types";

interface SupplyStagesProps {
  stages: Stage[];
  items: SupplyItemWithCalc[];
}

const STAGE_STATUS_STYLE: Record<StageStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Ожидает", bg: "#F3F4F6", text: "#6B7280" },
  in_progress: { label: "В работе", bg: "#FFF7ED", text: "#D97706" },
  done: { label: "Завершён", bg: "#ECFDF3", text: "#16A34A" },
};

export function SupplyStages({ stages, items }: SupplyStagesProps) {
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

  return (
    <div className="space-y-4">
      {stageData.map((stage) => {
        const stageStyle = STAGE_STATUS_STYLE[stage.status];
        const progress = stage.total > 0 ? Math.round((stage.delivered / stage.total) * 100) : 0;

        return (
          <div key={stage.id} className="bg-white border border-[#E8E6E1] rounded-xl p-5">
            {/* Stage header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F0EEE9] flex items-center justify-center text-[13px] font-semibold font-mono-custom text-[#6B6B6B]">
                  {stage.sort_order}
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold">{stage.name}</h4>
                  <div className="text-[11px] text-[#9B9B9B]">
                    {stage.start_date ? formatShortDate(stage.start_date) : "—"}
                    {stage.end_date ? ` → ${formatShortDate(stage.end_date)}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {stage.critical > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626]">
                    <Icons.Alert className="w-3 h-3" /> {stage.critical}
                  </span>
                )}
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: stageStyle.bg, color: stageStyle.text }}
                >
                  {stageStyle.label}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            {stage.total > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#9B9B9B]">
                    {stage.delivered}/{stage.total} доставлено
                  </span>
                  <span className="text-[11px] font-mono-custom text-[#6B6B6B]">{progress}%</span>
                </div>
                <div className="h-1.5 bg-[#F0EEE9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2C5F2D] rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Items list */}
            {stage.items.length > 0 ? (
              <div className="space-y-0">
                {stage.items.map((item) => {
                  const statusCfg = SUPPLY_STATUS_CONFIG[item.status];
                  const riskCfg = RISK_CONFIG[item.riskCalc];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b border-[#F0EEE9] last:border-none"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] text-[#1A1A1A]">{item.name}</span>
                        {item.supplier && (
                          <span className="text-[11px] text-[#9B9B9B] ml-2">{item.supplier}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: riskCfg.bg, color: riskCfg.text }}
                        >
                          {riskCfg.label}
                        </span>
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: statusCfg.bg, color: statusCfg.text }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[12px] text-[#9B9B9B] py-2">
                Нет позиций для этого этапа
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
