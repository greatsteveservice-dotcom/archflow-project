import type { SupplyItemWithCalc, Stage } from './types';

export interface StageGroup {
  /** Stage object, or null for the «Без этапа» bucket */
  stage: Stage | null;
  rows: SupplyItemWithCalc[];
}

/**
 * Group supply items by stage. Items without a stage are bucketed at the end.
 * Within a stage rows are sorted by group_name → subcategory → orderDeadline → name.
 */
export function groupSupplyByStage(
  items: SupplyItemWithCalc[],
  stages: Stage[],
): StageGroup[] {
  const byStage = new Map<string, SupplyItemWithCalc[]>();
  const orphans: SupplyItemWithCalc[] = [];

  for (const item of items) {
    if (item.target_stage_id) {
      const arr = byStage.get(item.target_stage_id) || [];
      arr.push(item);
      byStage.set(item.target_stage_id, arr);
    } else {
      orphans.push(item);
    }
  }

  const sortRows = (rows: SupplyItemWithCalc[]) => {
    rows.sort((a, b) => {
      const g = (a.group_name || '').localeCompare(b.group_name || '', 'ru');
      if (g !== 0) return g;
      const sc = (a.subcategory || '').localeCompare(b.subcategory || '', 'ru');
      if (sc !== 0) return sc;
      const da = a.orderDeadline || '9999-12-31';
      const db = b.orderDeadline || '9999-12-31';
      if (da !== db) return da < db ? -1 : 1;
      return a.name.localeCompare(b.name, 'ru');
    });
    return rows;
  };

  const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order);
  const groups: StageGroup[] = sortedStages
    .filter((s) => byStage.has(s.id))
    .map((s) => ({ stage: s, rows: sortRows(byStage.get(s.id)!) }));

  if (orphans.length) {
    groups.push({ stage: null, rows: sortRows(orphans) });
  }

  return groups;
}

/** Days between two YYYY-MM-DD strings (b − a). */
export function diffDays(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / 86_400_000);
}
