'use client';

import { useState, useCallback } from 'react';
import { Icons } from '../Icons';
import { batchUpsertKindStageMappings } from '../../lib/queries';
import type { Stage, CreateKindStageMappingInput } from '../../lib/types';

const mono = 'var(--af-font-mono)';

interface KindStageReconciliationProps {
  unmappedKinds: string[];
  stages: Stage[];
  toast: (msg: string) => void;
  onSaved: () => void;
}

export default function KindStageReconciliation({
  unmappedKinds,
  stages,
  toast,
  onSaved,
}: KindStageReconciliationProps) {
  const [expanded, setExpanded] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleSelect = (kind: string, stageName: string) => {
    setSelections(prev => ({ ...prev, [kind]: stageName }));
  };

  const filledCount = Object.values(selections).filter(v => v).length;

  const handleSaveAll = useCallback(async () => {
    if (saving || filledCount === 0) return;
    setSaving(true);
    try {
      const inputs: CreateKindStageMappingInput[] = Object.entries(selections)
        .filter(([, stageName]) => stageName)
        .map(([kind, stage_name]) => ({ kind, stage_name }));

      await batchUpsertKindStageMappings(inputs);
      toast(`Сохранено ${inputs.length} маппингов`);
      onSaved();
      setExpanded(false);
      setDismissed(true);
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || 'не удалось сохранить'));
    } finally {
      setSaving(false);
    }
  }, [saving, filledCount, selections, toast, onSaved]);

  if (dismissed || unmappedKinds.length === 0) return null;

  return (
    <div style={{
      background: 'rgb(var(--line), 0.15)',
      border: '0.5px solid rgb(var(--line))',
      padding: expanded ? 16 : '10px 16px',
      marginBottom: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ flexShrink: 0 }}><Icons.Info className="w-4 h-4" /></div>
          <span style={{
            fontFamily: mono, fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))',
          }}>
            {unmappedKinds.length} {unmappedKinds.length === 1 ? 'вид' : unmappedKinds.length < 5 ? 'вида' : 'видов'} без привязки к этапу
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'rgb(var(--ink))', color: 'rgb(var(--srf))', border: 'none',
              fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
              letterSpacing: '0.12em', padding: '5px 14px',
              cursor: 'pointer',
            }}
          >
            {expanded ? 'Свернуть' : 'Настроить'}
          </button>
          {!expanded && (
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 4, display: 'flex', color: 'rgb(var(--ink))', opacity: 0.5,
              }}
            >
              <Icons.X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid rgb(var(--line))' }}>
                <th style={{
                  fontFamily: mono, fontSize: 'var(--af-fs-10)',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  color: 'rgb(var(--ink))', opacity: 0.5, fontWeight: 500,
                  textAlign: 'left', padding: '6px 8px',
                }}>
                  Вид
                </th>
                <th style={{
                  fontFamily: mono, fontSize: 'var(--af-fs-10)',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  color: 'rgb(var(--ink))', opacity: 0.5, fontWeight: 500,
                  textAlign: 'left', padding: '6px 8px',
                }}>
                  Этап
                </th>
              </tr>
            </thead>
            <tbody>
              {unmappedKinds.map((kind) => (
                <tr key={kind} style={{ borderBottom: '0.5px solid rgb(var(--line), 0.3)' }}>
                  <td style={{
                    padding: '8px 8px', fontFamily: mono,
                    fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))',
                  }}>
                    {kind}
                  </td>
                  <td style={{ padding: '8px 8px' }}>
                    <select
                      value={selections[kind] || ''}
                      onChange={(e) => handleSelect(kind, e.target.value)}
                      style={{
                        width: '100%', padding: '4px 8px',
                        border: '0.5px solid rgb(var(--line))',
                        fontFamily: mono, fontSize: 'var(--af-fs-11)',
                        color: 'rgb(var(--ink))', outline: 'none', background: 'rgb(var(--srf))',
                      }}
                    >
                      <option value="">— Выберите этап —</option>
                      {stages.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => { setExpanded(false); setDismissed(true); }}
              style={{
                background: 'none', color: 'rgb(var(--ink))', border: '0.5px solid rgb(var(--line))',
                fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                letterSpacing: '0.12em', padding: '7px 14px',
                cursor: 'pointer',
              }}
            >
              Пропустить
            </button>
            <button
              onClick={handleSaveAll}
              disabled={filledCount === 0 || saving}
              style={{
                background: 'rgb(var(--ink))', color: 'rgb(var(--srf))', border: 'none',
                fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                letterSpacing: '0.12em', padding: '7px 14px',
                cursor: filledCount === 0 || saving ? 'not-allowed' : 'pointer',
                opacity: filledCount === 0 || saving ? 0.4 : 1,
              }}
            >
              {saving ? 'Сохранение...' : `Сохранить (${filledCount})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
