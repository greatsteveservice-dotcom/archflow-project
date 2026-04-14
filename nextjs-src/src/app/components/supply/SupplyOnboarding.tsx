'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createStage } from '../../lib/queries';
import { metrikaGoal } from '../../lib/metrika';
import SupplyImport from './SupplyImport';
import type { Stage, KindStageMapping } from '../../lib/types';

const mono = 'var(--af-font-mono)';
const display = 'var(--af-font-display)';

const DEFAULT_STAGES = [
  "Демонтаж", "Черновые работы", "Электрика и сантехника",
  "Стяжка и штукатурка", "Чистовая отделка", "Мебель и декор",
];

interface SupplyOnboardingProps {
  projectId: string;
  stages: Stage[];
  toast: (msg: string) => void;
  refetchRooms: () => void;
  refetchItems: () => void;
  refetchStages: () => void;
  kindMappings: KindStageMapping[];
  onComplete: () => void;
}

export default function SupplyOnboarding({
  projectId, stages, toast, refetchRooms, refetchItems, refetchStages, kindMappings, onComplete,
}: SupplyOnboardingProps) {
  const [step, setStep] = useState(1);
  const [imported, setImported] = useState(false);
  const stagesCreatedRef = useRef(false);

  // Auto-create default stages on mount if none exist
  useEffect(() => {
    if (stagesCreatedRef.current) return;
    if (stages && stages.length > 0) return;

    stagesCreatedRef.current = true;
    (async () => {
      try {
        for (let i = 0; i < DEFAULT_STAGES.length; i++) {
          await createStage({
            project_id: projectId,
            name: DEFAULT_STAGES[i],
            sort_order: i + 1,
          });
        }
        refetchStages();
      } catch (err: any) {
        console.warn('[SupplyOnboarding] Failed to create default stages:', err?.message);
      }
    })();
  }, [projectId, stages, refetchStages]);

  // ── Step 1: Import Excel ──
  const handleImportComplete = useCallback(() => {
    setImported(true);
    refetchItems();
    refetchRooms();
    metrikaGoal('excel_imported', { source: 'onboarding' });
    setStep(2);
  }, [refetchItems, refetchRooms]);

  const handleSkipImport = useCallback(() => {
    setStep(2);
  }, []);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto', padding: '20px 0' }}>
      {/* Progress indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 32 }}>
        {[1, 2].map((s) => (
          <div
            key={s}
            style={{
              flex: 1, height: 3,
              background: s <= step ? 'rgb(var(--ink))' : 'rgb(var(--line))',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* ═══ STEP 1: Import Excel ═══ */}
      {step === 1 && (
        <div>
          <div style={{
            fontFamily: display, fontSize: 22, fontWeight: 700,
            color: 'rgb(var(--ink))', marginBottom: 8,
          }}>
            Загрузите спецификацию
          </div>
          <div style={{
            fontFamily: mono, fontSize: 'var(--af-fs-12)',
            color: 'rgb(var(--ink))', opacity: 0.5, marginBottom: 24, lineHeight: 1.6,
          }}>
            Импортируйте позиции из Excel-файла. Помещения будут созданы автоматически.
          </div>

          <SupplyImport
            projectId={projectId}
            stages={stages.length > 0 ? stages : []}
            toast={toast}
            onImportComplete={handleImportComplete}
            kindMappings={kindMappings}
          />

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={handleSkipImport}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: mono, fontSize: 'var(--af-fs-11)',
                color: 'rgb(var(--ink))', opacity: 0.5,
                textDecoration: 'underline', padding: '8px 16px',
              }}
            >
              Пропустить, добавлю вручную →
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Done ═══ */}
      {step === 2 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: display, fontSize: 22, fontWeight: 700,
            color: 'rgb(var(--ink))', marginBottom: 8,
          }}>
            Готово
          </div>
          <div style={{
            fontFamily: mono, fontSize: 'var(--af-fs-12)',
            color: 'rgb(var(--ink))', opacity: 0.5, marginBottom: 28, lineHeight: 1.6,
          }}>
            {imported
              ? 'Позиции импортированы, помещения созданы автоматически'
              : 'Комплектация настроена и готова к работе'}
          </div>

          <button
            onClick={() => { metrikaGoal('onboarding_completed'); onComplete(); }}
            style={{
              padding: '12px 32px',
              fontFamily: mono, fontSize: 'var(--af-fs-10)', textTransform: 'uppercase',
              letterSpacing: '0.14em',
              background: 'rgb(var(--ink))', color: 'rgb(var(--srf))', border: 'none',
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
          >
            Перейти к комплектации →
          </button>
        </div>
      )}
    </div>
  );
}
