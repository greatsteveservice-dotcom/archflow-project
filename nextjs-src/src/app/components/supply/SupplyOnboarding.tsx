'use client';

import { useState, useCallback } from 'react';
import { createStage } from '../../lib/queries';
import { metrikaGoal } from '../../lib/metrika';
import { Icons } from '../Icons';
import SupplyImport from './SupplyImport';
import type { Stage, KindStageMapping } from '../../lib/types';

const mono = 'var(--af-font-mono)';
const display = 'var(--af-font-display)';

// ── Phase & stage templates ──────────────────────────────────

type PhaseId = 'design' | 'rough' | 'electrical' | 'leveling' | 'finishing' | 'furniture';
type PartitionType = 'block' | 'gkl';

interface StageTemplate {
  name: string;
  phase: PhaseId;
  partitionType?: PartitionType;
}

const PHASES: { id: PhaseId; label: string }[] = [
  { id: 'design',     label: 'Проектирование' },
  { id: 'rough',      label: 'Черновые работы' },
  { id: 'electrical', label: 'Электрика и сантехника' },
  { id: 'leveling',   label: 'Стяжка и штукатурка' },
  { id: 'finishing',  label: 'Чистовая отделка' },
  { id: 'furniture',  label: 'Мебель и декор' },
];

const STAGE_TEMPLATES: StageTemplate[] = [
  { name: 'Замеры и проектирование', phase: 'design' },
  { name: 'Демонтаж', phase: 'rough' },
  { name: 'Кладка перегородок', phase: 'rough', partitionType: 'block' },
  { name: 'Штукатурка перегородок', phase: 'rough', partitionType: 'block' },
  { name: 'Каркас перегородок ГКЛ', phase: 'rough', partitionType: 'gkl' },
  { name: 'Обшивка ГКЛ', phase: 'rough', partitionType: 'gkl' },
  { name: 'Разводка электрики', phase: 'electrical' },
  { name: 'Разводка сантехники', phase: 'electrical' },
  { name: 'Стяжка пола', phase: 'leveling' },
  { name: 'Штукатурка стен', phase: 'leveling' },
  { name: 'Плиточные работы', phase: 'finishing' },
  { name: 'Покраска / обои', phase: 'finishing' },
  { name: 'Установка дверей', phase: 'finishing' },
  { name: 'Чистовая электрика', phase: 'finishing' },
  { name: 'Чистовая сантехника', phase: 'finishing' },
  { name: 'Монтаж кухни', phase: 'furniture' },
  { name: 'Мебель', phase: 'furniture' },
  { name: 'Декор', phase: 'furniture' },
];

interface EditableStage {
  id: string;
  name: string;
  sort_order: number;
}

function generateStages(currentPhase: PhaseId, partition: PartitionType | null): EditableStage[] {
  const phaseIndex = PHASES.findIndex(p => p.id === currentPhase);
  return STAGE_TEMPLATES
    .filter(t => {
      const idx = PHASES.findIndex(p => p.id === t.phase);
      if (idx < phaseIndex) return false;
      if (t.partitionType && t.partitionType !== partition) return false;
      return true;
    })
    .map((t, i) => ({ id: crypto.randomUUID(), name: t.name, sort_order: i + 1 }));
}

// ── Component ────────────────────────────────────────────────

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
  const hasStages = stages && stages.length > 0;

  // Steps: 1=Phase, 2=Partition (conditional), 3=StageMap, 4=Import, 5=Done
  // If stages already exist → start at step 4
  const [step, setStep] = useState(hasStages ? 4 : 1);
  const [imported, setImported] = useState(false);

  // Step 1
  const [selectedPhase, setSelectedPhase] = useState<PhaseId | null>(null);
  // Step 2
  const [partitionType, setPartitionType] = useState<PartitionType | null>(null);
  // Step 3
  const [editableStages, setEditableStages] = useState<EditableStage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [creatingStages, setCreatingStages] = useState(false);

  const needsPartition = selectedPhase === 'design' || selectedPhase === 'rough';

  // Total visual steps for progress bar
  const totalSteps = hasStages ? 2 : (needsPartition ? 5 : 4);
  const visualStep = hasStages
    ? (step === 4 ? 1 : 2)
    : (needsPartition ? step : (step <= 2 ? step : step - 1));

  // ── Handlers ──

  const handlePhaseSelect = (id: PhaseId) => {
    setSelectedPhase(id);
    const needs = id === 'design' || id === 'rough';
    if (needs) {
      setStep(2);
    } else {
      setEditableStages(generateStages(id, null));
      setStep(3);
    }
  };

  const handlePartitionSelect = (type: PartitionType) => {
    setPartitionType(type);
    setEditableStages(generateStages(selectedPhase!, type));
    setStep(3);
  };

  const handleBack = () => {
    if (step === 2) { setPartitionType(null); setStep(1); }
    else if (step === 3) { setStep(needsPartition ? 2 : 1); }
  };

  // Stage editing (local state only)
  const handleDeleteStage = (id: string) => {
    setEditableStages(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, sort_order: i + 1 })));
  };
  const handleRenameStage = (id: string) => {
    if (!editName.trim()) return;
    setEditableStages(prev => prev.map(s => s.id === id ? { ...s, name: editName.trim() } : s));
    setEditingId(null);
    setEditName('');
  };
  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    setEditableStages(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: newStageName.trim(), sort_order: prev.length + 1 },
    ]);
    setNewStageName('');
    setShowAddForm(false);
  };
  const handleMoveStage = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= editableStages.length) return;
    setEditableStages(prev => {
      const arr = [...prev];
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return arr.map((s, i) => ({ ...s, sort_order: i + 1 }));
    });
  };

  // Persist stages to Supabase
  const handleConfirmStages = async () => {
    if (editableStages.length === 0) { toast('Добавьте хотя бы один этап'); return; }
    setCreatingStages(true);
    try {
      for (const s of editableStages) {
        await createStage({ project_id: projectId, name: s.name, sort_order: s.sort_order });
      }
      refetchStages();
      metrikaGoal('wizard_stages_created', { count: editableStages.length, phase: selectedPhase });
      setStep(4);
    } catch (err: any) {
      toast('Ошибка: ' + (err?.message || 'не удалось создать этапы'));
    } finally {
      setCreatingStages(false);
    }
  };

  // Import handlers
  const handleImportComplete = useCallback(() => {
    setImported(true);
    refetchItems();
    refetchRooms();
    metrikaGoal('excel_imported', { source: 'onboarding' });
    setStep(5);
  }, [refetchItems, refetchRooms]);

  const handleSkipImport = useCallback(() => { setStep(5); }, []);

  // ── Shared styles ──
  const headingStyle = {
    fontFamily: display, fontSize: 22, fontWeight: 700 as const,
    color: 'rgb(var(--ink))', marginBottom: 8,
  };
  const subtitleStyle = {
    fontFamily: mono, fontSize: 'var(--af-fs-12)',
    color: 'rgb(var(--ink))', opacity: 0.5, marginBottom: 24, lineHeight: 1.6,
  };
  const primaryBtn = (disabled?: boolean) => ({
    padding: '12px 32px',
    fontFamily: mono, fontSize: 'var(--af-fs-10)', textTransform: 'uppercase' as const,
    letterSpacing: '0.14em',
    background: 'rgb(var(--ink))', color: 'rgb(var(--srf))', border: 'none',
    cursor: disabled ? 'default' as const : 'pointer' as const,
    opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s',
  });
  const ghostBtn = {
    background: 'none', border: '0.5px solid rgb(var(--line))',
    fontFamily: mono, fontSize: 'var(--af-fs-11)',
    color: 'rgb(var(--ink))', cursor: 'pointer' as const,
    padding: '10px 16px', transition: 'all 0.15s',
  };
  const backLink = {
    background: 'none', border: 'none', cursor: 'pointer' as const,
    fontFamily: mono, fontSize: 'var(--af-fs-11)',
    color: 'rgb(var(--ink))', opacity: 0.5, textDecoration: 'underline',
    padding: '8px 16px',
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto', padding: '20px 0' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 32 }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 3,
              background: i < visualStep ? 'rgb(var(--ink))' : 'rgb(var(--line))',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* ═══ STEP 1: Phase selection ═══ */}
      {step === 1 && (
        <div>
          <div style={headingStyle}>На каком этапе объект?</div>
          <div style={subtitleStyle}>
            Этапы до текущего будут пропущены — их позиции уже закуплены
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {PHASES.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePhaseSelect(p.id)}
                className="af-ghost-row"
                style={{
                  ...ghostBtn,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', textAlign: 'left',
                }}
              >
                <span>{p.label}</span>
                <span style={{ opacity: 0.3, fontSize: 'var(--af-fs-10)' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Partition type ═══ */}
      {step === 2 && (
        <div>
          <div style={headingStyle}>Какие перегородки?</div>
          <div style={subtitleStyle}>
            Это влияет на состав черновых работ
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={() => handlePartitionSelect('block')}
              className="af-ghost-row"
              style={{ ...ghostBtn, flex: 1, textAlign: 'center' }}
            >
              Блоки
            </button>
            <button
              onClick={() => handlePartitionSelect('gkl')}
              className="af-ghost-row"
              style={{ ...ghostBtn, flex: 1, textAlign: 'center' }}
            >
              ГКЛ (гипсокартон)
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={handleBack} style={backLink}>← Назад</button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Editable stage map ═══ */}
      {step === 3 && (
        <div>
          <div style={headingStyle}>Карта этапов</div>
          <div style={subtitleStyle}>
            Переименуйте, удалите или добавьте этапы перед подтверждением
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
            {editableStages.map((s, idx) => (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  border: '0.5px solid rgb(var(--line))',
                  padding: '8px 12px', background: 'rgb(var(--srf))',
                }}
              >
                <span style={{
                  fontFamily: mono, fontSize: 'var(--af-fs-10)',
                  color: 'rgb(var(--ink))', opacity: 0.3, minWidth: 20, textAlign: 'center',
                }}>
                  {s.sort_order}
                </span>

                {editingId === s.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameStage(s.id); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus
                      style={{
                        flex: 1, fontFamily: mono, fontSize: 'var(--af-fs-11)',
                        border: '0.5px solid rgb(var(--line))', padding: '4px 8px',
                        background: 'rgb(var(--srf))', color: 'rgb(var(--ink))', outline: 'none',
                      }}
                    />
                    <button onClick={() => handleRenameStage(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Icons.Check className="w-4 h-4" style={{ color: 'rgb(var(--ink))' }} />
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Icons.X className="w-4 h-4" style={{ color: 'rgb(var(--ink))', opacity: 0.4 }} />
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))' }}>
                      {s.name}
                    </span>
                    <div style={{ display: 'flex', gap: 2, opacity: 0.3 }} className="af-hover-show">
                      <button
                        onClick={() => handleMoveStage(idx, -1)}
                        disabled={idx === 0}
                        style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: 2, opacity: idx === 0 ? 0.2 : 1 }}
                        title="Вверх"
                      >
                        <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)' }}>▲</span>
                      </button>
                      <button
                        onClick={() => handleMoveStage(idx, 1)}
                        disabled={idx === editableStages.length - 1}
                        style={{ background: 'none', border: 'none', cursor: idx === editableStages.length - 1 ? 'default' : 'pointer', padding: 2, opacity: idx === editableStages.length - 1 ? 0.2 : 1 }}
                        title="Вниз"
                      >
                        <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)' }}>▼</span>
                      </button>
                      <button
                        onClick={() => { setEditingId(s.id); setEditName(s.name); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                        title="Переименовать"
                      >
                        <Icons.Edit className="w-3.5 h-3.5" style={{ color: 'rgb(var(--ink))' }} />
                      </button>
                      <button
                        onClick={() => handleDeleteStage(s.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                        title="Удалить"
                      >
                        <Icons.X className="w-3.5 h-3.5" style={{ color: 'rgb(var(--ink))' }} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add stage */}
          {showAddForm ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={newStageName}
                onChange={e => setNewStageName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddStage(); if (e.key === 'Escape') { setShowAddForm(false); setNewStageName(''); } }}
                placeholder="Название этапа"
                autoFocus
                style={{
                  flex: 1, fontFamily: mono, fontSize: 'var(--af-fs-11)',
                  border: '0.5px solid rgb(var(--line))', padding: '8px 12px',
                  background: 'rgb(var(--srf))', color: 'rgb(var(--ink))', outline: 'none',
                }}
              />
              <button onClick={handleAddStage} style={{ ...primaryBtn(), padding: '8px 16px', fontSize: 'var(--af-fs-10)' }}>
                Добавить
              </button>
              <button onClick={() => { setShowAddForm(false); setNewStageName(''); }} style={backLink}>
                Отмена
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              style={{ ...ghostBtn, width: '100%', textAlign: 'center', marginBottom: 16, opacity: 0.6 }}
            >
              + Добавить этап
            </button>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={handleBack} style={backLink}>← Назад</button>
            <button
              onClick={handleConfirmStages}
              disabled={creatingStages || editableStages.length === 0}
              style={primaryBtn(creatingStages || editableStages.length === 0)}
            >
              {creatingStages ? 'Создаём...' : `Подтвердить этапы (${editableStages.length}) →`}
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 4: Import Excel ═══ */}
      {step === 4 && (
        <div>
          <div style={headingStyle}>Загрузите спецификацию</div>
          <div style={subtitleStyle}>
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
            <button onClick={handleSkipImport} style={backLink}>
              Пропустить, добавлю вручную →
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 5: Done ═══ */}
      {step === 5 && (
        <div style={{ textAlign: 'center' }}>
          <div style={headingStyle}>Готово</div>
          <div style={subtitleStyle}>
            {imported
              ? 'Позиции импортированы, помещения созданы автоматически'
              : 'Комплектация настроена и готова к работе'}
          </div>
          <button
            onClick={() => { metrikaGoal('onboarding_completed'); onComplete(); }}
            style={primaryBtn()}
          >
            Перейти к комплектации →
          </button>
        </div>
      )}
    </div>
  );
}
