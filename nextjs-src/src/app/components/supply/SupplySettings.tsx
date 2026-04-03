'use client';
import { useState, useEffect, useCallback } from 'react';
import { Icons } from '../Icons';
import { useProject, useProjectRooms, useKindStageMappings } from '../../lib/hooks';
import { updateProject, createRoom, updateRoom, deleteRoom, renameRoomInSupplyItems, upsertKindStageMapping, deleteKindStageMapping } from '../../lib/queries';
import type { ProjectRoom, KindStageMapping } from '../../lib/types';

const mono = "'IBM Plex Mono', monospace";
const display = "'Playfair Display', serif";

interface SupplySettingsProps {
  projectId: string;
  toast: (msg: string) => void;
}

export default function SupplySettings({ projectId, toast }: SupplySettingsProps) {
  const { data: project, refetch } = useProject(projectId);
  const { data: rooms, refetch: refetchRooms } = useProjectRooms(projectId);
  const { data: kindMappings, refetch: refetchMappings } = useKindStageMappings();
  const [scenario, setScenario] = useState<'block' | 'gkl'>('block');
  const [startDate, setStartDate] = useState('');
  const [discount, setDiscount] = useState('0');
  const [saving, setSaving] = useState(false);

  // Room form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomArea, setNewRoomArea] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);

  // Edit room state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomArea, setEditRoomArea] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);

  // Delete room state
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);

  // Kind→Stage mapping state
  const [newKind, setNewKind] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [addingMapping, setAddingMapping] = useState(false);
  const [deletingMappingId, setDeletingMappingId] = useState<string | null>(null);

  // Sync form with project data
  useEffect(() => {
    if (!project) return;
    setScenario(project.scenario_type || 'block');
    setStartDate(project.start_date || '');
    setDiscount(String(project.supply_discount || 0));
  }, [project]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProject(projectId, {
        scenario_type: scenario,
        start_date: startDate || null,
        supply_discount: Number(discount) || 0,
      });
      refetch();
      toast('Настройки сохранены');
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || 'не удалось сохранить'));
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = project && (
    scenario !== (project.scenario_type || 'block') ||
    startDate !== (project.start_date || '') ||
    discount !== String(project.supply_discount || 0)
  );

  // Room handlers
  const handleAddRoom = useCallback(async () => {
    if (!newRoomName.trim() || addingRoom) return;
    setAddingRoom(true);
    try {
      await createRoom({
        project_id: projectId,
        name: newRoomName.trim(),
        area: newRoomArea ? Number(newRoomArea) : undefined,
        sort_order: (rooms?.length || 0) + 1,
      });
      toast('Помещение добавлено');
      setNewRoomName('');
      setNewRoomArea('');
      refetchRooms();
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || 'не удалось добавить'));
    } finally {
      setAddingRoom(false);
    }
  }, [projectId, newRoomName, newRoomArea, addingRoom, rooms, toast, refetchRooms]);

  const startEditRoom = (room: ProjectRoom) => {
    setEditingRoomId(room.id);
    setEditRoomName(room.name);
    setEditRoomArea(room.area ? String(room.area) : '');
    setConfirmDeleteRoomId(null);
  };

  const cancelEditRoom = () => {
    setEditingRoomId(null);
    setEditRoomName('');
    setEditRoomArea('');
  };

  const saveEditRoom = useCallback(async (room: ProjectRoom) => {
    if (!editRoomName.trim() || savingRoom) return;
    setSavingRoom(true);
    try {
      const newName = editRoomName.trim();
      const newArea = editRoomArea ? Number(editRoomArea) : null;

      await updateRoom(room.id, { name: newName, area: newArea });

      // If name changed, update supply_items
      if (newName !== room.name) {
        await renameRoomInSupplyItems(projectId, room.name, newName);
      }

      toast('Помещение обновлено');
      setEditingRoomId(null);
      setEditRoomName('');
      setEditRoomArea('');
      refetchRooms();
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || 'не удалось обновить'));
    } finally {
      setSavingRoom(false);
    }
  }, [editRoomName, editRoomArea, savingRoom, projectId, toast, refetchRooms]);

  const handleDeleteRoom = useCallback(async (roomId: string) => {
    if (deletingRoom) return;
    setDeletingRoom(true);
    try {
      await deleteRoom(roomId);
      toast('Помещение удалено');
      setConfirmDeleteRoomId(null);
      refetchRooms();
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || 'не удалось удалить'));
    } finally {
      setDeletingRoom(false);
    }
  }, [deletingRoom, toast, refetchRooms]);

  // Kind→Stage mapping handler
  const handleAddMapping = useCallback(async () => {
    if (!newKind.trim() || !newStageName.trim() || addingMapping) return;
    setAddingMapping(true);
    try {
      await upsertKindStageMapping({
        kind: newKind.trim(),
        stage_name: newStageName.trim(),
      });
      toast('Маппинг сохранён');
      setNewKind('');
      setNewStageName('');
      refetchMappings();
    } catch (err: any) {
      toast('Ошибка: ' + (err.message || 'не удалось сохранить'));
    } finally {
      setAddingMapping(false);
    }
  }, [newKind, newStageName, addingMapping, toast, refetchMappings]);

  return (
    <div className="animate-fade-in max-w-[500px]">
      {/* Project settings card */}
      <div className="card p-6">
        <h3 className="text-[14px] font-semibold mb-5">Настройки комплектации</h3>

        <div className="space-y-5">
          <div>
            <label className="block text-[12px] font-medium text-ink-muted mb-2">Тип перегородок</label>
            <div className="stab w-fit">
              <button className={`stb ${scenario === 'block' ? 'active' : ''}`} onClick={() => setScenario('block')}>
                Блок
              </button>
              <button className={`stb ${scenario === 'gkl' ? 'active' : ''}`} onClick={() => setScenario('gkl')}>
                ГКЛ
              </button>
            </div>
            <p className="text-[11px] text-ink-faint mt-1.5">
              {scenario === 'block' ? 'Блочные перегородки — стандартный порядок этапов' : 'ГКЛ перегородки — изменённый порядок этапов'}
            </p>
          </div>

          <div className="modal-field">
            <label>Дата начала стройки</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <p className="text-[11px] text-ink-faint mt-1">Влияет на расчёт дедлайнов заказа материалов</p>
          </div>

          <div className="modal-field">
            <label>Скидка поставщика (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
            />
            <p className="text-[11px] text-ink-faint mt-1">Применяется к расчёту бюджета позиций</p>
          </div>

          <button
            className="btn btn-primary w-full justify-center py-3 mt-2 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Icons.Check className="w-4 h-4" />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rooms card */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          background: '#fff', border: '0.5px solid #EBEBEB', padding: 24,
        }}>
          <div style={{
            fontFamily: display, fontSize: 14, fontWeight: 700,
            color: '#111', marginBottom: 16,
          }}>
            Помещения проекта
          </div>

          {/* Rooms list */}
          {rooms && rooms.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {rooms.map((room) => {
                const isEditing = editingRoomId === room.id;
                const isConfirmingDelete = confirmDeleteRoomId === room.id;

                return (
                  <div
                    key={room.id}
                    className="group"
                    style={{
                      background: '#FAFAF8', border: '0.5px solid #EBEBEB',
                      padding: '10px 14px',
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            value={editRoomName}
                            onChange={(e) => setEditRoomName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditRoom(room);
                              if (e.key === 'Escape') cancelEditRoom();
                            }}
                            autoFocus
                            placeholder="Название"
                            style={{
                              flex: 1, padding: '4px 8px',
                              border: '0.5px solid #EBEBEB',
                              fontFamily: mono, fontSize: 'var(--af-fs-12)',
                              color: '#111', outline: 'none', background: '#fff',
                            }}
                          />
                          <input
                            type="number"
                            value={editRoomArea}
                            onChange={(e) => setEditRoomArea(e.target.value)}
                            placeholder="м²"
                            min="0"
                            step="0.1"
                            style={{
                              width: 70, padding: '4px 8px',
                              border: '0.5px solid #EBEBEB',
                              fontFamily: mono, fontSize: 'var(--af-fs-12)',
                              color: '#111', outline: 'none', background: '#fff',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => saveEditRoom(room)}
                            disabled={!editRoomName.trim() || savingRoom}
                            style={{
                              background: '#111', color: '#fff', border: 'none',
                              fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                              letterSpacing: '0.12em', padding: '5px 12px',
                              cursor: !editRoomName.trim() || savingRoom ? 'not-allowed' : 'pointer',
                              opacity: !editRoomName.trim() || savingRoom ? 0.4 : 1,
                            }}
                          >
                            {savingRoom ? '...' : 'Сохранить'}
                          </button>
                          <button
                            onClick={cancelEditRoom}
                            style={{
                              background: 'none', color: '#111', border: '0.5px solid #EBEBEB',
                              fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                              letterSpacing: '0.12em', padding: '5px 12px',
                              cursor: 'pointer',
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : isConfirmingDelete ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: mono, fontSize: 'var(--af-fs-11)', color: '#111', flex: 1 }}>
                          Удалить «{room.name}»?
                        </span>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          disabled={deletingRoom}
                          style={{
                            background: '#111', color: '#fff', border: 'none',
                            fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                            letterSpacing: '0.12em', padding: '5px 12px',
                            cursor: deletingRoom ? 'wait' : 'pointer',
                            opacity: deletingRoom ? 0.5 : 1,
                          }}
                        >
                          {deletingRoom ? '...' : 'Да'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteRoomId(null)}
                          style={{
                            background: 'none', color: '#111', border: '0.5px solid #EBEBEB',
                            fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                            letterSpacing: '0.12em', padding: '5px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontFamily: mono, fontSize: 'var(--af-fs-12)',
                            color: '#111', fontWeight: 500,
                          }}>
                            {room.name}
                          </span>
                          {room.area && (
                            <span style={{
                              fontFamily: mono, fontSize: 'var(--af-fs-10)',
                              color: '#888',
                            }}>
                              {room.area} м²
                            </span>
                          )}
                        </div>
                        <div
                          className="room-actions"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            opacity: 0, transition: 'opacity 0.15s',
                          }}
                        >
                          <button
                            onClick={() => startEditRoom(room)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: 4, display: 'flex', color: '#888',
                            }}
                            title="Редактировать"
                          >
                            <Icons.Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteRoomId(room.id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: 4, display: 'flex', color: '#888',
                            }}
                            title="Удалить"
                          >
                            <Icons.Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              fontFamily: mono, fontSize: 'var(--af-fs-11)', color: '#888',
              padding: '12px 0', marginBottom: 12,
            }}>
              Нет помещений. Добавьте первое помещение ниже.
            </div>
          )}

          {/* Add room form */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: '#888', display: 'block', marginBottom: 4 }}>
                Название *
              </label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRoom(); }}
                placeholder="Гостиная"
                style={{
                  width: '100%', padding: '6px 8px',
                  border: '0.5px solid #EBEBEB',
                  fontFamily: mono, fontSize: 'var(--af-fs-12)',
                  color: '#111', outline: 'none', background: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ width: 80 }}>
              <label style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: '#888', display: 'block', marginBottom: 4 }}>
                Площадь
              </label>
              <input
                type="number"
                value={newRoomArea}
                onChange={(e) => setNewRoomArea(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRoom(); }}
                placeholder="м²"
                min="0"
                step="0.1"
                style={{
                  width: '100%', padding: '6px 8px',
                  border: '0.5px solid #EBEBEB',
                  fontFamily: mono, fontSize: 'var(--af-fs-12)',
                  color: '#111', outline: 'none', background: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={handleAddRoom}
              disabled={!newRoomName.trim() || addingRoom}
              style={{
                background: '#111', color: '#fff', border: 'none',
                fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                letterSpacing: '0.12em', padding: '7px 14px',
                cursor: !newRoomName.trim() || addingRoom ? 'not-allowed' : 'pointer',
                opacity: !newRoomName.trim() || addingRoom ? 0.4 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {addingRoom ? '...' : 'Добавить'}
            </button>
          </div>
        </div>
      </div>

      {/* Kind→Stage mapping card */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          background: '#fff', border: '0.5px solid #EBEBEB', padding: 24,
        }}>
          <div style={{
            fontFamily: display, fontSize: 14, fontWeight: 700,
            color: '#111', marginBottom: 4,
          }}>
            Словарь Вид → Этап
          </div>
          <div style={{
            fontFamily: mono, fontSize: 'var(--af-fs-10)', color: '#888',
            marginBottom: 16,
          }}>
            Автоматическое назначение этапа при импорте
          </div>

          {/* Mappings list */}
          {kindMappings && kindMappings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {kindMappings.map((m) => (
                <div
                  key={m.id}
                  className="group"
                  style={{
                    background: '#FAFAF8', border: '0.5px solid #EBEBEB',
                    padding: '10px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: mono, fontSize: 'var(--af-fs-12)',
                      color: '#111', fontWeight: 500,
                    }}>
                      {m.kind}
                    </span>
                    <span style={{
                      fontFamily: mono, fontSize: 'var(--af-fs-10)',
                      color: '#888',
                    }}>
                      →
                    </span>
                    <span style={{
                      fontFamily: mono, fontSize: 'var(--af-fs-12)',
                      color: '#111',
                    }}>
                      {m.stage_name}
                    </span>
                  </div>
                  <button
                    className="mapping-actions"
                    onClick={async () => {
                      if (deletingMappingId) return;
                      setDeletingMappingId(m.id);
                      try {
                        await deleteKindStageMapping(m.id);
                        toast('Маппинг удалён');
                        refetchMappings();
                      } catch (err: any) {
                        toast('Ошибка: ' + (err.message || 'не удалось удалить'));
                      } finally {
                        setDeletingMappingId(null);
                      }
                    }}
                    disabled={deletingMappingId === m.id}
                    style={{
                      background: 'none', border: 'none', cursor: deletingMappingId === m.id ? 'wait' : 'pointer',
                      padding: 4, display: 'flex', color: '#888',
                      opacity: 0, transition: 'opacity 0.15s',
                    }}
                    title="Удалить"
                  >
                    <Icons.X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              fontFamily: mono, fontSize: 'var(--af-fs-11)', color: '#888',
              padding: '12px 0', marginBottom: 12,
            }}>
              Нет маппингов. Добавьте первый ниже.
            </div>
          )}

          {/* Add mapping form */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: '#888', display: 'block', marginBottom: 4 }}>
                Вид *
              </label>
              <input
                type="text"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newKind.trim() && newStageName.trim()) {
                    handleAddMapping();
                  }
                }}
                placeholder="Плитка"
                style={{
                  width: '100%', padding: '6px 8px',
                  border: '0.5px solid #EBEBEB',
                  fontFamily: mono, fontSize: 'var(--af-fs-12)',
                  color: '#111', outline: 'none', background: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: mono, fontSize: 'var(--af-fs-10)', color: '#888', display: 'block', marginBottom: 4 }}>
                Этап *
              </label>
              <input
                type="text"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newKind.trim() && newStageName.trim()) {
                    handleAddMapping();
                  }
                }}
                placeholder="Чистовая отделка"
                style={{
                  width: '100%', padding: '6px 8px',
                  border: '0.5px solid #EBEBEB',
                  fontFamily: mono, fontSize: 'var(--af-fs-12)',
                  color: '#111', outline: 'none', background: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={handleAddMapping}
              disabled={!newKind.trim() || !newStageName.trim() || addingMapping}
              style={{
                background: '#111', color: '#fff', border: 'none',
                fontFamily: mono, fontSize: 'var(--af-fs-9)', textTransform: 'uppercase',
                letterSpacing: '0.12em', padding: '7px 14px',
                cursor: !newKind.trim() || !newStageName.trim() || addingMapping ? 'not-allowed' : 'pointer',
                opacity: !newKind.trim() || !newStageName.trim() || addingMapping ? 0.4 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {addingMapping ? '...' : 'Добавить'}
            </button>
          </div>
        </div>
      </div>

      {/* CSS for hover: show action buttons */}
      <style jsx>{`
        .group:hover .room-actions,
        .group:hover .mapping-actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
