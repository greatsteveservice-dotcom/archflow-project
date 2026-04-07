'use client';

import { useState, useCallback } from 'react';
import { Icons } from '../Icons';
import { createRoom, createStage } from '../../lib/queries';
import { metrikaGoal } from '../../lib/metrika';
import SupplyImport from './SupplyImport';
import type { Stage, KindStageMapping } from '../../lib/types';

const mono = "'IBM Plex Mono', monospace";
const display = "'Playfair Display', serif";

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

interface RoomEntry {
  id: string;
  name: string;
  area: string;
}

export default function SupplyOnboarding({
  projectId, stages, toast, refetchRooms, refetchItems, refetchStages, kindMappings, onComplete,
}: SupplyOnboardingProps) {
  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomArea, setNewRoomArea] = useState('');
  const [saving, setSaving] = useState(false);
  const [imported, setImported] = useState(false);

  // Room counts from import for step 3
  const [importedRoomCounts, setImportedRoomCounts] = useState<Record<string, number>>({});

  // ── Step 1: Add rooms ──
  const addRoom = useCallback(() => {
    if (!newRoomName.trim()) return;
    setRooms(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newRoomName.trim(),
      area: newRoomArea.trim(),
    }]);
    setNewRoomName('');
    setNewRoomArea('');
  }, [newRoomName, newRoomArea]);

  const removeRoom = useCallback((id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleStep1Next = useCallback(async () => {
    if (rooms.length === 0 || saving) return;
    setSaving(true);
    try {
      // Create rooms in DB
      for (let i = 0; i < rooms.length; i++) {
        await createRoom({
          project_id: projectId,
          name: rooms[i].name,
          area: rooms[i].area ? Number(rooms[i].area) : undefined,
          sort_order: i + 1,
        });
      }
      // Create default stages if none exist
      if (!stages || stages.length === 0) {
        for (let i = 0; i < DEFAULT_STAGES.length; i++) {
          await createStage({
            project_id: projectId,
            name: DEFAULT_STAGES[i],
            sort_order: i + 1,
          });
        }
        refetchStages();
      }
      refetchRooms();
      toast(`Добавлено ${rooms.length} помещений`);
      setStep(2);
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || 'не удалось сохранить'));
    } finally {
      setSaving(false);
    }
  }, [rooms, saving, projectId, stages, refetchRooms, refetchStages, toast]);

  // ── Step 2: Import Excel ──
  const handleImportComplete = useCallback(() => {
    setImported(true);
    refetchItems();
    metrikaGoal('excel_imported', { source: 'onboarding' });
    setStep(3);
  }, [refetchItems]);

  const handleSkipImport = useCallback(() => {
    setStep(3);
  }, []);

  // Styles
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '0.5px solid rgb(var(--line))',
    fontFamily: mono, fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))',
    background: 'rgb(var(--srf))', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto', padding: '20px 0' }}>
      {/* Progress indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 32 }}>
        {[1, 2, 3].map((s) => (
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

      {/* ═══ STEP 1: Add rooms ═══ */}
      {step === 1 && (
        <div>
          <div style={{
            fontFamily: display, fontSize: 22, fontWeight: 700,
            color: 'rgb(var(--ink))', marginBottom: 8,
          }}>
            Добавьте помещения
          </div>
          <div style={{
            fontFamily: mono, fontSize: 'var(--af-fs-12)',
            color: 'rgb(var(--ink))', opacity: 0.5, marginBottom: 24, lineHeight: 1.6,
          }}>
            Укажите комнаты и площади вашего проекта
          </div>

          {/* Room list */}
          {rooms.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {rooms.map((room) => (
                <div key={room.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'rgb(var(--line), 0.3)',
                  border: '0.5px solid rgb(var(--line))',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))', fontWeight: 500 }}>
                      {room.name}
                    </span>
                    {room.area && (
                      <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))', opacity: 0.5 }}>
                        {room.area} м²
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeRoom(room.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'rgb(var(--ink))', opacity: 0.4 }}
                  >
                    <Icons.X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add room form */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 24 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))', opacity: 0.5, display: 'block', marginBottom: 4 }}>
                Название
              </label>
              <input
                type="text" value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addRoom(); }}
                placeholder="Гостиная"
                style={inputStyle}
                autoFocus
              />
            </div>
            <div style={{ width: 100 }}>
              <label style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))', opacity: 0.5, display: 'block', marginBottom: 4 }}>
                Площадь
              </label>
              <input
                type="number" value={newRoomArea}
                onChange={(e) => setNewRoomArea(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addRoom(); }}
                placeholder="м²" min="0" step="0.1"
                style={inputStyle}
              />
              <span style={{ fontFamily: mono, fontSize: 11, color: 'rgb(var(--ink))', opacity: 0.4, marginTop: 3, display: 'block' }}>
                можно примерно
              </span>
            </div>
            <button
              onClick={addRoom}
              disabled={!newRoomName.trim()}
              style={{
                background: 'rgb(var(--ink))', color: 'rgb(var(--srf))', border: 'none',
                fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                letterSpacing: '0.12em', padding: '9px 16px',
                cursor: !newRoomName.trim() ? 'not-allowed' : 'pointer',
                opacity: !newRoomName.trim() ? 0.4 : 1, whiteSpace: 'nowrap',
              }}
            >
              Добавить
            </button>
          </div>

          {/* Next button */}
          <button
            onClick={handleStep1Next}
            disabled={rooms.length === 0 || saving}
            style={{
              width: '100%', padding: '12px 0',
              fontFamily: mono, fontSize: 'var(--af-fs-10)', textTransform: 'uppercase',
              letterSpacing: '0.14em',
              background: rooms.length > 0 ? 'rgb(var(--ink))' : 'transparent',
              color: rooms.length > 0 ? 'rgb(var(--srf))' : 'rgb(var(--ink))',
              border: rooms.length > 0 ? 'none' : '0.5px solid rgb(var(--line))',
              cursor: rooms.length === 0 || saving ? 'not-allowed' : 'pointer',
              opacity: rooms.length === 0 || saving ? 0.4 : 1,
              transition: 'all 0.15s',
            }}
          >
            {saving ? 'Сохраняем...' : 'Далее →'}
          </button>
        </div>
      )}

      {/* ═══ STEP 2: Import Excel ═══ */}
      {step === 2 && (
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
            Импортируйте позиции из Excel-файла
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

      {/* ═══ STEP 3: Done ═══ */}
      {step === 3 && (
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
            Комплектация настроена и готова к работе
          </div>

          {/* Mini plan — rooms summary */}
          {rooms.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2,
              marginBottom: 28, maxWidth: 400, margin: '0 auto 28px',
            }}>
              {rooms.map((room) => (
                <div key={room.id} style={{
                  background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))',
                  padding: '12px 10px', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: mono, fontSize: 'var(--af-fs-11)',
                    color: 'rgb(var(--ink))', fontWeight: 500, marginBottom: 2,
                  }}>
                    {room.name}
                  </div>
                  {room.area && (
                    <div style={{
                      fontFamily: mono, fontSize: 'var(--af-fs-9)',
                      color: 'rgb(var(--ink))', opacity: 0.4,
                    }}>
                      {room.area} м²
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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
