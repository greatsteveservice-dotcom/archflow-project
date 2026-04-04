'use client';
import { useState, useEffect, useCallback } from 'react';
import { Icons } from '../Icons';
import { useProject, useProjectRooms, useKindStageMappings } from '../../lib/hooks';
import {
  updateProject, createRoom, updateRoom, deleteRoom, renameRoomInSupplyItems,
  upsertKindStageMapping, deleteKindStageMapping,
  createStage, updateStage, deleteStage,
} from '../../lib/queries';
import type { ProjectRoom, KindStageMapping, Stage, SupplyItemWithCalc } from '../../lib/types';

const mono = "'IBM Plex Mono', monospace";
const display = "'Playfair Display', serif";

const DEFAULT_STAGES = [
  "Демонтаж", "Черновые работы", "Электрика и сантехника",
  "Стяжка и штукатурка", "Чистовая отделка", "Мебель и декор",
];

interface SupplySettingsProps {
  projectId: string;
  toast: (msg: string) => void;
  stages: Stage[];
  items: SupplyItemWithCalc[];
  refetchStages: () => void;
}

export default function SupplySettings({ projectId, toast, stages, items, refetchStages }: SupplySettingsProps) {
  const { data: project, refetch } = useProject(projectId);
  const { data: rooms, refetch: refetchRooms } = useProjectRooms(projectId);
  const { data: kindMappings, refetch: refetchMappings } = useKindStageMappings();

  const [scenario, setScenario] = useState<'block' | 'gkl'>('block');
  const [startDate, setStartDate] = useState('');
  const [discount, setDiscount] = useState('0');
  const [saving, setSaving] = useState(false);

  // Room state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomArea, setNewRoomArea] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomArea, setEditRoomArea] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);

  // Mapping state
  const [newKind, setNewKind] = useState('');
  const [newMappingStageName, setNewMappingStageName] = useState('');
  const [addingMapping, setAddingMapping] = useState(false);
  const [deletingMappingId, setDeletingMappingId] = useState<string | null>(null);

  // Stage state
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageNameInput, setNewStageNameInput] = useState('');
  const [newStageStart, setNewStageStart] = useState('');
  const [newStageEnd, setNewStageEnd] = useState('');
  const [addingStage, setAddingStage] = useState(false);
  const [creatingDefaults, setCreatingDefaults] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [savingStageId, setSavingStageId] = useState<string | null>(null);
  const [confirmDeleteStageId, setConfirmDeleteStageId] = useState<string | null>(null);
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setScenario(project.scenario_type || 'block');
    setStartDate(project.start_date || '');
    setDiscount(String(project.supply_discount || 0));
  }, [project]);

  const hasChanges = project && (
    scenario !== (project.scenario_type || 'block') ||
    startDate !== (project.start_date || '') ||
    discount !== String(project.supply_discount || 0)
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProject(projectId, { scenario_type: scenario, start_date: startDate || null, supply_discount: Number(discount) || 0 });
      refetch();
      toast('Настройки сохранены');
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || 'не удалось сохранить'));
    } finally { setSaving(false); }
  };

  // Room handlers
  const handleAddRoom = useCallback(async () => {
    if (!newRoomName.trim() || addingRoom) return;
    setAddingRoom(true);
    try {
      await createRoom({ project_id: projectId, name: newRoomName.trim(), area: newRoomArea ? Number(newRoomArea) : undefined, sort_order: (rooms?.length || 0) + 1 });
      toast('Помещение добавлено'); setNewRoomName(''); setNewRoomArea(''); refetchRooms();
    } catch (err: any) { toast('Ошибка: ' + (err.message || 'не удалось добавить')); }
    finally { setAddingRoom(false); }
  }, [projectId, newRoomName, newRoomArea, addingRoom, rooms, toast, refetchRooms]);

  const startEditRoom = (room: ProjectRoom) => { setEditingRoomId(room.id); setEditRoomName(room.name); setEditRoomArea(room.area ? String(room.area) : ''); setConfirmDeleteRoomId(null); };
  const cancelEditRoom = () => { setEditingRoomId(null); setEditRoomName(''); setEditRoomArea(''); };

  const saveEditRoom = useCallback(async (room: ProjectRoom) => {
    if (!editRoomName.trim() || savingRoom) return;
    setSavingRoom(true);
    try {
      const newName = editRoomName.trim();
      await updateRoom(room.id, { name: newName, area: editRoomArea ? Number(editRoomArea) : null });
      if (newName !== room.name) await renameRoomInSupplyItems(projectId, room.name, newName);
      toast('Помещение обновлено'); setEditingRoomId(null); refetchRooms();
    } catch (err: any) { toast('Ошибка: ' + (err.message || 'не удалось обновить')); }
    finally { setSavingRoom(false); }
  }, [editRoomName, editRoomArea, savingRoom, projectId, toast, refetchRooms]);

  const handleDeleteRoom = useCallback(async (roomId: string) => {
    if (deletingRoom) return;
    setDeletingRoom(true);
    try { await deleteRoom(roomId); toast('Помещение удалено'); setConfirmDeleteRoomId(null); refetchRooms(); }
    catch (err: any) { toast('Ошибка: ' + (err.message || 'не удалось удалить')); }
    finally { setDeletingRoom(false); }
  }, [deletingRoom, toast, refetchRooms]);

  // Mapping handlers
  const handleAddMapping = useCallback(async () => {
    if (!newKind.trim() || !newMappingStageName.trim() || addingMapping) return;
    setAddingMapping(true);
    try {
      await upsertKindStageMapping({ kind: newKind.trim(), stage_name: newMappingStageName.trim() });
      toast('Маппинг сохранён'); setNewKind(''); setNewMappingStageName(''); refetchMappings();
    } catch (err: any) { toast('Ошибка: ' + (err.message || 'не удалось сохранить')); }
    finally { setAddingMapping(false); }
  }, [newKind, newMappingStageName, addingMapping, toast, refetchMappings]);

  // Stage handlers
  const handleAddStage = useCallback(async () => {
    if (!newStageNameInput.trim() || addingStage) return;
    setAddingStage(true);
    try {
      await createStage({ project_id: projectId, name: newStageNameInput.trim(), start_date: newStageStart || null, end_date: newStageEnd || null, sort_order: (stages?.length || 0) + 1 });
      toast('Этап добавлен'); setNewStageNameInput(''); setNewStageStart(''); setNewStageEnd(''); setShowAddStage(false); refetchStages();
    } catch (err: any) { toast('Ошибка: ' + (err.message || 'не удалось создать этап')); }
    finally { setAddingStage(false); }
  }, [projectId, newStageNameInput, newStageStart, newStageEnd, addingStage, stages, toast, refetchStages]);

  const handleCreateDefaults = useCallback(async () => {
    if (creatingDefaults) return;
    setCreatingDefaults(true);
    try {
      for (let i = 0; i < DEFAULT_STAGES.length; i++) await createStage({ project_id: projectId, name: DEFAULT_STAGES[i], sort_order: i + 1 });
      toast(`Создано ${DEFAULT_STAGES.length} этапов`); refetchStages();
    } catch (err: any) { toast('Ошибка: ' + (err.message || 'не удалось создать этапы')); }
    finally { setCreatingDefaults(false); }
  }, [projectId, creatingDefaults, toast, refetchStages]);

  const handleSaveStageEdit = useCallback(async (stageId: string) => {
    if (!editStageName.trim() || savingStageId) return;
    setSavingStageId(stageId);
    try { await updateStage(stageId, { name: editStageName.trim() }); toast('Этап обновлён'); setEditingStageId(null); setEditStageName(''); refetchStages(); }
    catch (err: any) { toast('Ошибка: ' + (err.message || 'не удалось обновить')); }
    finally { setSavingStageId(null); }
  }, [editStageName, savingStageId, toast, refetchStages]);

  const handleDeleteStage = useCallback(async (stageId: string) => {
    if (deletingStageId) return;
    setDeletingStageId(stageId);
    try { await deleteStage(stageId); toast('Этап удалён'); setConfirmDeleteStageId(null); refetchStages(); }
    catch (err: any) { toast('Ошибка: ' + (err.message || 'не удалось удалить')); }
    finally { setDeletingStageId(null); }
  }, [deletingStageId, toast, refetchStages]);

  /* ═══ Input style helper ═══ */
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px', border: '0.5px solid rgb(var(--line))',
    fontFamily: mono, fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))',
    background: 'rgb(var(--srf))', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))', opacity: 0.5, display: 'block', marginBottom: 4,
  };
  const cardStyle: React.CSSProperties = {
    background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))', padding: 24,
  };
  const rowItemStyle: React.CSSProperties = {
    background: 'rgb(var(--line), 0.3)', border: '0.5px solid rgb(var(--line))', padding: '10px 14px',
  };
  const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
    background: 'rgb(var(--ink))', color: 'rgb(var(--srf))', border: 'none',
    fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
    letterSpacing: '0.12em', padding: '7px 14px',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, whiteSpace: 'nowrap',
  });
  const ghostBtnStyle: React.CSSProperties = {
    background: 'none', color: 'rgb(var(--ink))', border: '0.5px solid rgb(var(--line))',
    fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
    letterSpacing: '0.12em', padding: '5px 12px', cursor: 'pointer',
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
      {/* ═══ LEFT COLUMN ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Project params */}
        <div style={cardStyle}>
          <div style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 16 }}>
            Основные параметры
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Тип перегородок</label>
              <div className="stab w-fit">
                <button className={`stb ${scenario === 'block' ? 'active' : ''}`} onClick={() => setScenario('block')}>Блок</button>
                <button className={`stb ${scenario === 'gkl' ? 'active' : ''}`} onClick={() => setScenario('gkl')}>ГКЛ</button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Дата начала стройки</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Скидка поставщика (%)</label>
              <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={handleSave} disabled={saving || !hasChanges}
              style={{
                width: '100%', padding: '10px 0', fontFamily: mono, fontSize: 'var(--af-fs-9)',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                background: hasChanges ? 'rgb(var(--ink))' : 'transparent',
                color: hasChanges ? 'rgb(var(--srf))' : 'rgb(var(--ink))',
                border: hasChanges ? 'none' : '0.5px solid rgb(var(--line))',
                cursor: saving || !hasChanges ? 'not-allowed' : 'pointer',
                opacity: saving || !hasChanges ? 0.4 : 1, transition: 'all 0.15s',
              }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Kind→Stage mapping */}
        <div style={cardStyle}>
          <div style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 4 }}>
            Словарь Вид → Этап
          </div>
          <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))', opacity: 0.5, marginBottom: 16 }}>
            Автоматическое назначение этапа при импорте
          </div>
          {kindMappings && kindMappings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {kindMappings.map((m) => (
                <div key={m.id} className="group" style={{ ...rowItemStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))', fontWeight: 500 }}>{m.kind}</span>
                    <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))', opacity: 0.5 }}>→</span>
                    <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))' }}>{m.stage_name}</span>
                  </div>
                  <button className="mapping-actions" onClick={async () => {
                    if (deletingMappingId) return; setDeletingMappingId(m.id);
                    try { await deleteKindStageMapping(m.id); toast('Маппинг удалён'); refetchMappings(); }
                    catch (err: any) { toast('Ошибка: ' + (err.message || 'не удалось удалить')); }
                    finally { setDeletingMappingId(null); }
                  }} disabled={deletingMappingId === m.id}
                    style={{ background: 'none', border: 'none', cursor: deletingMappingId === m.id ? 'wait' : 'pointer', padding: 4, display: 'flex', color: 'rgb(var(--ink))', opacity: 0, transition: 'opacity 0.15s' }}
                    title="Удалить"><Icons.X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', opacity: 0.5, padding: '12px 0', marginBottom: 12 }}>
              Нет маппингов. Добавьте первый ниже.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Вид *</label>
              <input type="text" value={newKind} onChange={(e) => setNewKind(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newKind.trim() && newMappingStageName.trim()) handleAddMapping(); }}
                placeholder="Плитка" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Этап *</label>
              <input type="text" value={newMappingStageName} onChange={(e) => setNewMappingStageName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newKind.trim() && newMappingStageName.trim()) handleAddMapping(); }}
                placeholder="Чистовая отделка" style={inputStyle} />
            </div>
            <button onClick={handleAddMapping} disabled={!newKind.trim() || !newMappingStageName.trim() || addingMapping}
              style={primaryBtnStyle(!newKind.trim() || !newMappingStageName.trim() || addingMapping)}>
              {addingMapping ? '...' : 'Добавить'}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT COLUMN ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Rooms */}
        <div style={cardStyle}>
          <div style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 16 }}>Помещения проекта</div>
          {rooms && rooms.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {rooms.map((room) => {
                const isEditing = editingRoomId === room.id;
                const isConfirmingDelete = confirmDeleteRoomId === room.id;
                return (
                  <div key={room.id} className="group" style={rowItemStyle}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input type="text" value={editRoomName} onChange={(e) => setEditRoomName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditRoom(room); if (e.key === 'Escape') cancelEditRoom(); }}
                            autoFocus placeholder="Название" style={{ ...inputStyle, flex: 1, width: 'auto' }} />
                          <input type="number" value={editRoomArea} onChange={(e) => setEditRoomArea(e.target.value)}
                            placeholder="м²" min="0" step="0.1" style={{ ...inputStyle, width: 70 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => saveEditRoom(room)} disabled={!editRoomName.trim() || savingRoom}
                            style={primaryBtnStyle(!editRoomName.trim() || savingRoom)}>{savingRoom ? '...' : 'Сохранить'}</button>
                          <button onClick={cancelEditRoom} style={ghostBtnStyle}>Отмена</button>
                        </div>
                      </div>
                    ) : isConfirmingDelete ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', flex: 1 }}>Удалить «{room.name}»?</span>
                        <button onClick={() => handleDeleteRoom(room.id)} disabled={deletingRoom}
                          style={primaryBtnStyle(deletingRoom)}>{deletingRoom ? '...' : 'Да'}</button>
                        <button onClick={() => setConfirmDeleteRoomId(null)} style={ghostBtnStyle}>Отмена</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))', fontWeight: 500 }}>{room.name}</span>
                          {room.area && <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))', opacity: 0.5 }}>{room.area} м²</span>}
                        </div>
                        <div className="room-actions" style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0, transition: 'opacity 0.15s' }}>
                          <button onClick={() => startEditRoom(room)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'rgb(var(--ink))', opacity: 0.5 }} title="Редактировать"><Icons.Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDeleteRoomId(room.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'rgb(var(--ink))', opacity: 0.5 }} title="Удалить"><Icons.Trash className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', opacity: 0.5, padding: '12px 0', marginBottom: 12 }}>
              Нет помещений. Добавьте первое помещение ниже.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Название *</label>
              <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRoom(); }} placeholder="Гостиная" style={inputStyle} />
            </div>
            <div style={{ width: 80 }}>
              <label style={labelStyle}>Площадь</label>
              <input type="number" value={newRoomArea} onChange={(e) => setNewRoomArea(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRoom(); }} placeholder="м²" min="0" step="0.1" style={inputStyle} />
            </div>
            <button onClick={handleAddRoom} disabled={!newRoomName.trim() || addingRoom}
              style={primaryBtnStyle(!newRoomName.trim() || addingRoom)}>{addingRoom ? '...' : 'Добавить'}</button>
          </div>
        </div>

        {/* Stages */}
        <div style={cardStyle}>
          <div style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 16 }}>Этапы стройки</div>
          {stages && stages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {stages.map((stage) => {
                const isEditing = editingStageId === stage.id;
                const isConfirmingDelete = confirmDeleteStageId === stage.id;
                const isSaving = savingStageId === stage.id;
                const isDeleting = deletingStageId === stage.id;
                const stageItems = items.filter(i => i.target_stage_id === stage.id);
                return (
                  <div key={stage.id} className="group" style={rowItemStyle}>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="text" value={editStageName} onChange={(e) => setEditStageName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveStageEdit(stage.id); if (e.key === 'Escape') { setEditingStageId(null); setEditStageName(''); } }}
                          autoFocus style={{ ...inputStyle, flex: 1, width: 'auto' }} />
                        <button onClick={() => handleSaveStageEdit(stage.id)} disabled={!editStageName.trim() || !!isSaving}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'rgb(var(--ink))', opacity: !editStageName.trim() || isSaving ? 0.3 : 1 }} title="Сохранить"><Icons.Check className="w-4 h-4" /></button>
                        <button onClick={() => { setEditingStageId(null); setEditStageName(''); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'rgb(var(--ink))', opacity: 0.5 }} title="Отменить"><Icons.X className="w-4 h-4" /></button>
                      </div>
                    ) : isConfirmingDelete ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', flex: 1 }}>Удалить «{stage.name}»?</span>
                        <button onClick={() => handleDeleteStage(stage.id)} disabled={!!isDeleting}
                          style={primaryBtnStyle(!!isDeleting)}>{isDeleting ? '...' : 'Да'}</button>
                        <button onClick={() => setConfirmDeleteStageId(null)} style={ghostBtnStyle}>Отмена</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', opacity: 0.4, width: 20, textAlign: 'center' }}>{stage.sort_order}</span>
                          <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-12)', color: 'rgb(var(--ink))', fontWeight: 500 }}>{stage.name}</span>
                          {stageItems.length > 0 && <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))', opacity: 0.4 }}>{stageItems.length} поз.</span>}
                        </div>
                        <div className="stage-actions" style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0, transition: 'opacity 0.15s' }}>
                          <button onClick={() => { setEditingStageId(stage.id); setEditStageName(stage.name); setConfirmDeleteStageId(null); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'rgb(var(--ink))', opacity: 0.5 }} title="Редактировать"><Icons.Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDeleteStageId(stage.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'rgb(var(--ink))', opacity: 0.5 }} title="Удалить"><Icons.Trash className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 12 }}>
              <div style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', opacity: 0.5, marginBottom: 12 }}>
                Нет этапов. Создайте стандартные или добавьте свои.
              </div>
              <button onClick={handleCreateDefaults} disabled={creatingDefaults}
                style={{ ...primaryBtnStyle(creatingDefaults), padding: '10px 24px' }}>
                {creatingDefaults ? 'Создаём...' : 'Создать стандартные этапы'}
              </button>
            </div>
          )}
          {!showAddStage ? (
            <button onClick={() => setShowAddStage(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                letterSpacing: '0.12em', padding: '8px 0',
                border: '0.5px solid rgb(var(--line))', background: 'transparent',
                color: 'rgb(var(--ink))', cursor: 'pointer', transition: 'all 0.15s',
              }} className="af-btn-hover">
              <Icons.Plus className="w-3.5 h-3.5" />
              Добавить этап
            </button>
          ) : (
            <div style={{ border: '0.5px solid rgb(var(--line))', padding: 16, background: 'rgb(var(--line), 0.15)' }}>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Название *</label>
                <input type="text" value={newStageNameInput} onChange={(e) => setNewStageNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddStage(); }}
                  placeholder="Например: Демонтаж" autoFocus style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Начало</label>
                  <input type="date" value={newStageStart} onChange={(e) => setNewStageStart(e.target.value)} style={{ ...inputStyle, fontSize: 'var(--af-fs-11)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Окончание</label>
                  <input type="date" value={newStageEnd} onChange={(e) => setNewStageEnd(e.target.value)} style={{ ...inputStyle, fontSize: 'var(--af-fs-11)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddStage} disabled={!newStageNameInput.trim() || addingStage}
                  style={{ ...primaryBtnStyle(!newStageNameInput.trim() || addingStage), flex: 1, padding: '8px 0', textAlign: 'center' }}>
                  {addingStage ? 'Создаём...' : 'Создать'}
                </button>
                <button onClick={() => { setShowAddStage(false); setNewStageNameInput(''); setNewStageStart(''); setNewStageEnd(''); }}
                  style={{ ...ghostBtnStyle, padding: '8px 16px' }}>Отмена</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .group:hover .room-actions,
        .group:hover .mapping-actions,
        .group:hover .stage-actions {
          opacity: 1 !important;
        }
        @media (max-width: 767px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
