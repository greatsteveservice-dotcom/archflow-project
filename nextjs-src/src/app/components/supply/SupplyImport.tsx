'use client';
import { useState, useRef, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Icons } from '../Icons';
import { createSupplyItems } from '../../lib/queries';
import type { Stage, CreateSupplyItemInput } from '../../lib/types';

// Fields available for mapping
const SUPPLY_FIELDS = [
  { key: 'name', label: 'Название *', required: true },
  { key: 'category', label: 'Категория', required: false },
  { key: 'room', label: 'Помещение', required: false },
  { key: 'lead_time_days', label: 'Срок поставки (дни)', required: false },
  { key: 'quantity', label: 'Количество', required: false },
  { key: 'supplier', label: 'Поставщик', required: false },
  { key: 'budget', label: 'Бюджет', required: false },
  { key: 'notes', label: 'Заметки', required: false },
  { key: 'stage', label: 'Этап', required: false },
] as const;

type FieldKey = typeof SUPPLY_FIELDS[number]['key'];

// Fields that allow multiple columns mapped to them (values get concatenated)
const MULTI_MAP_FIELDS: FieldKey[] = ['notes'];

// Auto-detect column mapping by header names
const AUTO_MAP: Record<string, FieldKey> = {
  'название': 'name', 'наименование': 'name', 'name': 'name', 'позиция': 'name', 'товар': 'name', 'item': 'name',
  'категория': 'category', 'category': 'category', 'группа': 'category', 'тип': 'category',
  'вид': 'category',
  'помещение': 'room', 'комната': 'room', 'room': 'room',
  'срок': 'lead_time_days', 'lead_time': 'lead_time_days', 'дни': 'lead_time_days', 'срок поставки': 'lead_time_days',
  'количество': 'quantity', 'кол-во': 'quantity', 'qty': 'quantity', 'quantity': 'quantity', 'шт': 'quantity',
  'поставщик': 'supplier', 'supplier': 'supplier', 'vendor': 'supplier',
  'бюджет': 'budget', 'цена': 'budget', 'стоимость': 'budget', 'price': 'budget', 'budget': 'budget', 'сумма': 'budget',
  'заметки': 'notes', 'примечание': 'notes', 'notes': 'notes', 'комментарий': 'notes',
  'спецификация': 'notes', 'характеристики': 'notes', 'ссылка': 'notes', 'ед.из': 'notes', 'ед. изм': 'notes', 'единица': 'notes',
  'этап': 'stage', 'stage': 'stage',
};

interface SupplyImportProps {
  projectId: string;
  stages: Stage[];
  toast: (msg: string) => void;
  onImportComplete: () => void;
}

export default function SupplyImport({ projectId, stages, toast, onImportComplete }: SupplyImportProps) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey | ''>>({});
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [unmatchedStages, setUnmatchedStages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const stepsConfig = [
    { n: 1, label: 'Загрузка' },
    { n: 2, label: 'Маппинг' },
    { n: 3, label: 'Предпросмотр' },
    { n: 4, label: 'Готово' },
  ];

  const parseFile = useCallback((file: File) => {
    setError('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setError('Поддерживаются только файлы .xlsx и .xls');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (json.length < 2) {
          setError('Файл пуст или содержит только заголовки');
          return;
        }

        const hdrs = json[0].map(h => String(h).trim());
        const dataRows = json.slice(1).filter(row => row.some(cell => String(cell).trim() !== ''));

        if (dataRows.length === 0) {
          setError('Файл не содержит данных');
          return;
        }

        setHeaders(hdrs);
        setRows(dataRows.map(row => row.map(cell => String(cell))));

        // Auto-map columns
        const autoMapping: Record<number, FieldKey | ''> = {};
        const usedFields = new Set<FieldKey>();
        hdrs.forEach((h, i) => {
          const normalized = h.toLowerCase().trim();
          const match = AUTO_MAP[normalized];
          if (match) {
            // For multi-map fields (notes), allow multiple columns
            if (MULTI_MAP_FIELDS.includes(match) && usedFields.has(match)) {
              autoMapping[i] = match;
            } else if (!usedFields.has(match)) {
              autoMapping[i] = match;
              usedFields.add(match);
            }
          }
        });
        setMapping(autoMapping);
        setStep(2);
      } catch {
        setError('Не удалось прочитать файл. Убедитесь что это корректный Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  }, [parseFile]);

  const updateMapping = (colIndex: number, field: FieldKey | '') => {
    setMapping(prev => ({ ...prev, [colIndex]: field }));
  };

  const hasNameMapping = Object.values(mapping).includes('name');

  // Find stage by name (fuzzy)
  const findStage = (val: string): string | null => {
    if (!val) return null;
    const lower = val.toLowerCase().trim();
    const exact = stages.find(s => s.name.toLowerCase() === lower);
    if (exact) return exact.id;
    const partial = stages.find(s => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase()));
    return partial ? partial.id : null;
  };

  // Build mapped items (used for preview and import)
  const buildItems = useCallback((): CreateSupplyItemInput[] => {
    const items: CreateSupplyItemInput[] = [];
    const unmatched = new Set<string>();

    for (const row of rows) {
      const item: CreateSupplyItemInput = { project_id: projectId, name: '' };
      const notesParts: string[] = [];

      for (const [colIdx, field] of Object.entries(mapping)) {
        if (!field) continue;
        const val = row[Number(colIdx)]?.trim() || '';
        if (!val) continue;

        switch (field) {
          case 'name': item.name = val; break;
          case 'category': item.category = val; break;
          case 'room': item.room = val; break;
          case 'lead_time_days': item.lead_time_days = parseInt(val) || 0; break;
          case 'quantity': item.quantity = parseInt(val) || 1; break;
          case 'supplier': item.supplier = val; break;
          case 'budget': item.budget = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.')) || 0; break;
          case 'notes': notesParts.push(val); break;
          case 'stage': {
            const stageId = findStage(val);
            if (stageId) {
              item.target_stage_id = stageId;
            } else {
              unmatched.add(val);
            }
            break;
          }
        }
      }

      // Join multi-column notes
      if (notesParts.length > 0) {
        item.notes = notesParts.join('\n');
      }

      // Skip rows without name
      if (item.name) items.push(item);
    }

    setUnmatchedStages(Array.from(unmatched));
    return items;
  }, [rows, mapping, projectId, stages]);

  const handleImport = async () => {
    setImporting(true);
    setError('');

    try {
      const items = buildItems();

      if (items.length === 0) {
        setError('Нет позиций для импорта. Проверьте маппинг колонки "Название".');
        setImporting(false);
        return;
      }

      await createSupplyItems(items);
      setImportedCount(items.length);
      onImportComplete();
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Ошибка импорта');
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImportedCount(0);
    setError('');
    setUnmatchedStages([]);
  };

  // Preview: mapped rows for step 3, grouped by room if room is mapped
  const previewData = useMemo(() => {
    const allItems = buildItems();
    const hasRoom = Object.values(mapping).includes('room');

    let groups: Record<string, CreateSupplyItemInput[]> | null = null;
    if (hasRoom) {
      groups = {};
      for (const item of allItems) {
        const key = item.room || 'Без помещения';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
    }

    return { groups, items: allItems.slice(0, 8), total: allItems.length };
  }, [rows, mapping, buildItems]);

  const mappedFields = SUPPLY_FIELDS.filter(f => Object.values(mapping).includes(f.key));

  // Check if a field is used by another column (for dedup in dropdown)
  const isFieldUsedElsewhere = (field: FieldKey, currentColIdx: number): boolean => {
    if (MULTI_MAP_FIELDS.includes(field)) return false; // notes can be multi-mapped
    return Object.entries(mapping).some(
      ([idx, val]) => val === field && Number(idx) !== currentColIdx
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {stepsConfig.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${
              step > s.n ? 'bg-ink text-srf' : step === s.n ? 'bg-ink text-srf' : 'bg-srf-secondary text-ink-faint'
            }`}>
              {step > s.n ? <Icons.Check className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span className={`text-[12px] ${step >= s.n ? 'text-ink font-medium' : 'text-ink-faint'}`}>
              {s.label}
            </span>
            {i < stepsConfig.length - 1 && <div className="w-8 h-px bg-line" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-err-bg border border-err/20 text-err text-[13px] px-4 py-2.5 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div style={{ background: '#fff', border: '0.5px solid #EBEBEB', padding: 32, textAlign: 'center' }}>
          <div
            style={{
              border: dragOver ? '2px dashed #111' : '1px dashed #EBEBEB',
              background: dragOver ? '#F6F6F4' : '#FAFAF8',
              padding: 48,
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div style={{ color: '#888', display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Icons.Upload className="w-10 h-10" />
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-13)', fontWeight: 500, color: '#111', marginBottom: 4 }}>
              Перетащите файл Excel сюда
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-11)', color: '#888' }}>
              или нажмите для выбора (.xlsx, .xls)
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold">Сопоставление колонок</h3>
            <span className="text-[12px] text-ink-faint">{fileName}</span>
          </div>
          <div className="space-y-3">
            {headers.map((header, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-[13px] text-ink-muted w-[180px] truncate" title={header}>
                  {header || `Колонка ${i + 1}`}
                </span>
                <select
                  className="flex-1 px-3 py-2 border border-line rounded-lg text-[13px]"
                  value={mapping[i] || ''}
                  onChange={(e) => updateMapping(i, e.target.value as FieldKey | '')}
                >
                  <option value="">— Пропустить —</option>
                  {SUPPLY_FIELDS.map(f => {
                    const usedElsewhere = isFieldUsedElsewhere(f.key, i);
                    return (
                      <option key={f.key} value={f.key} disabled={usedElsewhere}>
                        {f.label}{usedElsewhere ? ' (уже выбрано)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}
          </div>
          {!hasNameMapping && (
            <div className="mt-3 text-[12px] text-warn">
              Укажите колонку для поля "Название" — это обязательное поле
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="card p-5">
          <h3 className="text-[14px] font-semibold mb-2">Предпросмотр</h3>
          <p className="text-[13px] text-ink-faint mb-4">
            {previewData.total} позиций будут импортированы
          </p>

          {/* Unmatched stages warning */}
          {unmatchedStages.length > 0 && (
            <div style={{
              background: '#FAFAF8', border: '0.5px solid #EBEBEB',
              padding: '8px 12px', marginBottom: 12,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 'var(--af-fs-11)',
              color: '#111',
            }}>
              Не найден этап: {unmatchedStages.join(', ')}
            </div>
          )}

          <div className="overflow-x-auto">
            {previewData.groups ? (
              // Grouped by room
              <div>
                {Object.entries(previewData.groups).map(([roomName, roomItems]) => (
                  <div key={roomName} style={{ marginBottom: 16 }}>
                    <div style={{
                      fontFamily: "'Playfair Display', serif", fontSize: 13,
                      fontWeight: 700, color: '#111', marginBottom: 6,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      {roomName}
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 'var(--af-fs-10)', fontWeight: 400, color: '#888',
                      }}>
                        ({roomItems.length})
                      </span>
                    </div>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '0.5px solid #EBEBEB' }}>
                          {mappedFields.filter(f => f.key !== 'room').map(f => (
                            <th key={f.key} style={{
                              textAlign: 'left', padding: '4px 8px',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: 'var(--af-fs-10)', color: '#888', fontWeight: 500,
                            }}>
                              {f.label.replace(' *', '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {roomItems.slice(0, 5).map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '0.5px solid #F6F6F4' }}>
                            {mappedFields.filter(f => f.key !== 'room').map(f => (
                              <td key={f.key} style={{
                                padding: '4px 8px', color: '#666',
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: 'var(--af-fs-11)',
                                maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {(item as any)[f.key] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {roomItems.length > 5 && (
                          <tr>
                            <td colSpan={mappedFields.length} style={{
                              padding: '4px 8px', color: '#888',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: 'var(--af-fs-10)',
                            }}>
                              ... ещё {roomItems.length - 5}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              // Flat list
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-line">
                    {mappedFields.map(f => (
                      <th key={f.key} className="text-left py-2 px-3 text-ink-muted font-medium">{f.label.replace(' *', '')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.items.map((item, i) => (
                    <tr key={i} className="border-b border-line-light">
                      {mappedFields.map(f => (
                        <td key={f.key} className="py-2 px-3 text-ink-secondary max-w-[200px] truncate">
                          {(item as any)[f.key] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-ok-bg flex items-center justify-center mx-auto mb-3">
            <Icons.Check className="w-6 h-6 text-ok" />
          </div>
          <div className="text-[16px] font-semibold mb-1">Импорт завершён</div>
          <div className="text-[13px] text-ink-faint">{importedCount} позиций успешно импортированы</div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-5">
        <button
          className="btn btn-secondary"
          onClick={() => step === 1 ? undefined : setStep(step - 1)}
          style={{ visibility: step > 1 && step < 4 ? 'visible' : 'hidden' }}
        >
          Назад
        </button>
        {step === 2 && (
          <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!hasNameMapping}>
            Далее
          </button>
        )}
        {step === 3 && (
          <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
            {importing ? 'Импорт...' : `Импортировать (${previewData.total})`}
          </button>
        )}
        {step === 4 && (
          <button className="btn btn-primary" onClick={resetWizard}>
            Новый импорт
          </button>
        )}
      </div>
    </div>
  );
}
