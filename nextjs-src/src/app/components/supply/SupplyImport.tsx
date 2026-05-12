'use client';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Icons } from '../Icons';
import { createSupplyItems, fetchProjectRooms, createRoom } from '../../lib/queries';
import type { Stage, CreateSupplyItemInput, KindStageMapping } from '../../lib/types';

// Fields available for mapping
const SUPPLY_FIELDS = [
  { key: 'name', label: 'Наименование', required: true },
  { key: 'room', label: 'Помещение', required: false },
  { key: 'category', label: 'Вид', required: false },
  { key: 'quantity', label: 'Количество', required: false },
  { key: 'unit', label: 'Единица измерения', required: false },
  { key: 'budget', label: 'Стоимость', required: false },
  { key: 'link', label: 'Ссылка', required: false },
  { key: 'specs', label: 'Характеристики', required: false },
  { key: 'supplier', label: 'Поставщик', required: false },
  { key: 'stage', label: 'Этап', required: false },
] as const;

type FieldKey = typeof SUPPLY_FIELDS[number]['key'];

// Virtual fields that concat into notes (link is now a real column → not virtual)
const MULTI_MAP_FIELDS: FieldKey[] = ['unit', 'specs'];

// Auto-detect column mapping by header names
const AUTO_MAP: Record<string, FieldKey> = {
  'название': 'name', 'наименование': 'name', 'name': 'name', 'позиция': 'name', 'товар': 'name', 'item': 'name',
  'вид': 'category', 'категория': 'category', 'category': 'category', 'группа': 'category', 'тип': 'category',
  'помещение': 'room', 'комната': 'room', 'room': 'room',
  'количество': 'quantity', 'кол-во': 'quantity', 'qty': 'quantity', 'quantity': 'quantity',
  'ед. изм': 'unit', 'ед.из': 'unit', 'ед. из.': 'unit', 'ед.': 'unit', 'единица измерения': 'unit', 'единица': 'unit', 'unit': 'unit',
  'бюджет': 'budget', 'цена': 'budget', 'price': 'budget', 'budget': 'budget',
  // NB: 'стоимость', 'сумма', 'итого' are CALCULATED fields (price × qty) — do NOT map
  'ссылка': 'link', 'link': 'link', 'url': 'link',
  'характеристики': 'specs', 'описание': 'specs', 'specs': 'specs', 'comments': 'specs', 'примечание': 'specs', 'примечания': 'specs', 'комментарий': 'specs', 'комментарии': 'specs',
  'поставщик': 'supplier', 'supplier': 'supplier', 'бренд': 'supplier', 'производитель': 'supplier', 'brand': 'supplier',
  // NB: 'спецификация' is a subcategory name, not description — do NOT map to specs
  'этап': 'stage', 'stage': 'stage',
};

// Parsed sheet data
interface SheetData {
  headers: string[];
  rows: string[][];
  recommendation?: { score: number; hint: string };
}

interface SupplyImportProps {
  projectId: string;
  stages: Stage[];
  toast: (msg: string) => void;
  onImportComplete: () => void;
  kindMappings?: KindStageMapping[];
}

export default function SupplyImport({ projectId, stages, toast, onImportComplete, kindMappings = [] }: SupplyImportProps) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  // Multi-sheet support
  const [sheets, setSheets] = useState<Record<string, SheetData>>({});
  const [selectedSheet, setSelectedSheet] = useState('');
  // Data from selected sheet
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey | ''>>({});
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [unmatchedStages, setUnmatchedStages] = useState<string[]>([]);
  const [autoFilledStageItems, setAutoFilledStageItems] = useState<Set<string>>(new Set());
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});
  const [aiMapping, setAiMapping] = useState(false);
  const [aiNotes, setAiNotes] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Steps: 1=Upload, 1.5=Sheet select (if multiple), 2=Mapping, 3=Preview, 4=Done
  const stepsConfig = [
    { n: 1, label: 'Загрузка' },
    { n: 2, label: 'Маппинг' },
    { n: 3, label: 'Предпросмотр' },
    { n: 4, label: 'Готово' },
  ];

  // Auto-map columns and count mapped fields
  const autoMapColumns = (hdrs: string[]): { mapping: Record<number, FieldKey | ''>; mappedCount: number; hasName: boolean } => {
    const autoMapping: Record<number, FieldKey | ''> = {};
    const usedFields = new Set<FieldKey>();
    hdrs.forEach((h, i) => {
      const normalized = h.toLowerCase().trim();
      const match = AUTO_MAP[normalized];
      if (match) {
        if (MULTI_MAP_FIELDS.includes(match) && usedFields.has(match)) {
          autoMapping[i] = match;
        } else if (!usedFields.has(match)) {
          autoMapping[i] = match;
          usedFields.add(match);
        }
      }
    });
    return {
      mapping: autoMapping,
      mappedCount: usedFields.size,
      hasName: usedFields.has('name'),
    };
  };

  // Call AI for column mapping
  const aiMapColumns = async (hdrs: string[], sampleRows: string[][]): Promise<Record<number, FieldKey | ''> | null> => {
    setAiMapping(true);
    setAiNotes('');
    try {
      const res = await fetch('/api/supply/map-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: hdrs, sampleRows: sampleRows.slice(0, 5) }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (!data.mapping) return null;

      if (data.notes) setAiNotes(data.notes);

      // Convert AI mapping (field→colIndex) to our format (colIndex→field)
      const result: Record<number, FieldKey | ''> = {};
      for (const [field, colIdx] of Object.entries(data.mapping)) {
        if (colIdx !== null && typeof colIdx === 'number') {
          result[colIdx] = field as FieldKey;
        }
      }
      return result;
    } catch {
      return null;
    } finally {
      setAiMapping(false);
    }
  };

  // ─── Smart header detection helpers ─────────────────────────

  // Keywords indicating service/helper columns to hide from user
  const SERVICE_COL_KEYWORDS = [
    'формул', 'nameproject', 'комплектатор', 'formula', 'helper',
    'скрытый', 'hidden', 'internal', 'calc', 'вычисл', 'спецname',
    'согласован', 'закуплен', 'просрочен', 'доставлен', 'пора ',
    'нет данных', 'скрыть из', 'прошлый век', 'дней между', 'вариант пред',
  ];

  const isServiceColumn = (header: string): boolean => {
    const lower = header.toLowerCase();
    return SERVICE_COL_KEYWORDS.some(kw => lower.includes(kw));
  };

  /**
   * Find the header row in a sheet. Headers are the first row where:
   * - At least 3 non-empty cells
   * - No formulas (values starting with '=')
   * - Dense in leading columns (first 6 cols have ≥ 3 values)
   * - Short values (< 50 chars) — headers, not data
   * - Mostly non-numeric
   * - No #REF! or error values
   */
  const findHeaderRowIndex = (rows: unknown[][]): number => {
    // Score each candidate row; pick the best one
    let bestRow = -1;
    let bestScore = -1;

    for (let i = 0; i < Math.min(rows.length, 8); i++) {
      const row = rows[i];
      const nonEmptyCells: { index: number; value: string }[] = [];

      for (let j = 0; j < row.length; j++) {
        const c = row[j];
        if (c !== null && c !== undefined && String(c).trim() !== '') {
          nonEmptyCells.push({ index: j, value: String(c).trim() });
        }
      }

      if (nonEmptyCells.length < 3) continue;

      // REJECT: formulas or error values
      if (nonEmptyCells.some(c => c.value.startsWith('=') || c.value.startsWith('#REF'))) continue;

      // REJECT: mostly numeric (data row, not headers)
      const numericValues = nonEmptyCells.filter(c => !isNaN(Number(c.value)) && c.value !== '');
      if (numericValues.length > nonEmptyCells.length * 0.5) continue;

      // REJECT: long values (data, not headers)
      const longValues = nonEmptyCells.filter(c => c.value.length > 50);
      if (longValues.length > nonEmptyCells.length * 0.3) continue;

      // SCORE: leading density — how many of first 6 columns have values?
      // Real header rows start at column 0 and are packed: Этап(0), Помещение(1), Вид(2)...
      // Title/meta rows have sparse leading columns: empty(0), "ProjectName"(1), ..., empty(2-8)
      const leadingCount = nonEmptyCells.filter(c => c.index < 6).length;

      // SCORE: starts at column 0 (typical for header rows)
      const startsAtZero = nonEmptyCells[0]?.index === 0 ? 1 : 0;

      // SCORE: total non-empty cells (more = more likely header)
      const totalCount = Math.min(nonEmptyCells.length, 15);

      // SCORE: keywords that indicate a header row
      const headerKeywords = ['наименование', 'название', 'помещение', 'этап', 'вид', 'кол-во', 'количество', 'цена', 'ед.', 'ссылка', 'name', 'item', 'qty', 'price'];
      const keywordHits = nonEmptyCells.filter(c => headerKeywords.some(kw => c.value.toLowerCase().includes(kw))).length;

      const score = (leadingCount * 10) + (startsAtZero * 15) + totalCount + (keywordHits * 20);

      if (score > bestScore) {
        bestScore = score;
        bestRow = i;
      }
    }

    if (bestRow >= 0) return bestRow;

    // Fallback: second row (typical case: project name in first row)
    return Math.min(1, rows.length - 1);
  };

  /**
   * Score a sheet to recommend the best one for import.
   */
  const scoreSheet = (name: string, headers: string[], rowCount: number): { score: number; hint: string } => {
    const specKeywords = ['наименование', 'название', 'позиция', 'артикул', 'name', 'item', 'product'];
    const serviceKeywords = ['справочник', 'формул', 'график', 'бюджет', 'свод', 'итого', 'словарь'];
    // Backup/source sheets — not the main working sheet
    const backupKeywords = ['исход', 'копия', 'backup', 'старый', 'архив', 'original', 'old'];

    const headersLower = headers.map(h => h.toLowerCase());
    const nameLower = name.toLowerCase();

    if (serviceKeywords.some(kw => nameLower.includes(kw))) {
      return { score: 0, hint: 'Служебный лист' };
    }

    if (backupKeywords.some(kw => nameLower.includes(kw))) {
      return { score: 0, hint: 'Архивный лист' };
    }

    // "Общий бюджет" — summary sheet with few rows
    if (nameLower.includes('общий') && rowCount < 20) {
      return { score: 0, hint: 'Служебный лист' };
    }

    const hasSpecHeaders = specKeywords.some(kw => headersLower.some(h => h.includes(kw)));

    if (hasSpecHeaders && rowCount > 10) {
      return { score: 100, hint: `Рекомендуется — ${rowCount} позиций` };
    }

    if (rowCount > 10) {
      return { score: 50, hint: `${rowCount} строк` };
    }

    return { score: 10, hint: 'Мало данных' };
  };

  // Parse a single sheet into headers + rows (smart header detection + column filtering)
  const parseSheet = (sheetName: string, sheet: XLSX.WorkSheet): SheetData | null => {
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (rawData.length < 2) return null;

    // 1. Find header row
    const headerRowIndex = findHeaderRowIndex(rawData);
    const headerRow = rawData[headerRowIndex];

    // 2. Filter to named, non-service columns only
    const namedColumns: { index: number; name: string }[] = [];
    headerRow.forEach((cell, index) => {
      if (cell === null || cell === undefined) return;
      const name = String(cell).trim();
      if (!name || name.startsWith('=')) return;
      if (isServiceColumn(name)) return;
      // Skip auto-generated "Колонка N" style names
      if (/^колонка\s*\d+$/i.test(name)) return;
      namedColumns.push({ index, name });
    });

    if (namedColumns.length === 0) return null;

    const headers = namedColumns.map(c => c.name);

    // 3. Extract data rows (after header, only relevant columns, skip formulas)
    const dataRows: string[][] = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      const mappedRow = namedColumns.map(({ index }) => {
        const val = row[index];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Skip formula values in data
        if (str.startsWith('=') || str.includes('DUMMYFUNCTION')) return '';
        return str.trim();
      });

      // Skip completely empty rows
      if (mappedRow.some(v => v !== '')) {
        dataRows.push(mappedRow);
      }
    }

    if (dataRows.length === 0) return null;

    // 4. Score this sheet
    const recommendation = scoreSheet(sheetName, headers, dataRows.length);

    return { headers, rows: dataRows, recommendation };
  };

  // Apply mapping to a sheet and move to step 2
  const applySheetData = async (sheetData: SheetData) => {
    setHeaders(sheetData.headers);
    setRows(sheetData.rows);

    // Try auto-map first
    const auto = autoMapColumns(sheetData.headers);

    if (auto.hasName && auto.mappedCount >= 2) {
      // Good auto-mapping — use it
      setMapping(auto.mapping);
      setStep(2);
    } else {
      // Auto-map weak — try AI
      const aiResult = await aiMapColumns(sheetData.headers, sheetData.rows);
      if (aiResult && Object.values(aiResult).includes('name')) {
        setMapping(aiResult);
      } else {
        // AI also failed or no name → use whatever auto-map found
        setMapping(auto.mapping);
      }
      setStep(2);
    }
  };

  const parseFile = useCallback((file: File) => {
    setError('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setError('Поддерживаются только файлы .xlsx и .xls');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Parse all sheets (smart header detection + column filtering)
        const parsedSheets: Record<string, SheetData> = {};
        for (const sheetName of workbook.SheetNames) {
          const parsed = parseSheet(sheetName, workbook.Sheets[sheetName]);
          if (parsed) {
            parsedSheets[sheetName] = parsed;
          }
        }

        const sheetNames = Object.keys(parsedSheets);

        if (sheetNames.length === 0) {
          setError('Файл пуст — не найдено данных ни на одном листе');
          return;
        }

        setSheets(parsedSheets);

        if (sheetNames.length === 1) {
          // Single sheet — go straight to mapping
          setSelectedSheet(sheetNames[0]);
          await applySheetData(parsedSheets[sheetNames[0]]);
        } else {
          // Multiple sheets — let user pick
          setStep(1.5 as number);
        }
      } catch {
        setError('Не удалось прочитать файл. Убедитесь что это корректный Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleSelectSheet = async (name: string) => {
    setSelectedSheet(name);
    setError('');
    await applySheetData(sheets[name]);
  };

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

  // Build mapped items — pure function, no setState
  const buildItems = useCallback((): { items: CreateSupplyItemInput[]; unmatched: string[]; autoFilled: Set<string> } => {
    const items: CreateSupplyItemInput[] = [];
    const unmatched = new Set<string>();
    const autoFilled = new Set<string>();

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
          case 'quantity': item.quantity = parseInt(val) || 1; break;
          case 'budget': item.budget = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.')) || 0; break;
          case 'supplier': item.supplier = val; break;
          case 'unit': notesParts.push('Ед. изм.: ' + val); break;
          case 'link': item.url = val; break;
          case 'specs': notesParts.push(val); break;
          case 'stage': {
            const stageId = findStage(val);
            if (stageId) {
              item.target_stage_id = stageId;
            } else if (stageOverrides[val]) {
              item.target_stage_id = stageOverrides[val];
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

      // Auto-fill stage from kind→stage mapping if not already set
      if (!item.target_stage_id && item.category && kindMappings.length > 0) {
        const categoryLower = item.category.toLowerCase().trim();
        const match = kindMappings.find(m => m.kind.toLowerCase().trim() === categoryLower);
        if (match) {
          const stageId = findStage(match.stage_name);
          if (stageId) {
            item.target_stage_id = stageId;
            if (item.name) autoFilled.add(item.name);
          }
        }
      }

      // Skip rows without name
      if (item.name) items.push(item);
    }

    return { items, unmatched: Array.from(unmatched), autoFilled };
  }, [rows, mapping, projectId, stages, kindMappings, stageOverrides]);

  const handleImport = async () => {
    setImporting(true);
    setError('');

    try {
      const { items } = buildItems();

      if (items.length === 0) {
        setError('Нет позиций для импорта. Проверьте маппинг колонки "Наименование".');
        setImporting(false);
        return;
      }

      await createSupplyItems(items);

      // Auto-create project rooms from imported items' room values
      try {
        const uniqueRooms = [...new Set(items.map(i => i.room).filter(Boolean))] as string[];
        if (uniqueRooms.length > 0) {
          const existingRooms = await fetchProjectRooms(projectId);
          const existingNames = new Set(existingRooms.map(r => r.name.toLowerCase().trim()));
          const newRooms = uniqueRooms.filter(name => !existingNames.has(name.toLowerCase().trim()));
          const startOrder = existingRooms.length;
          for (let i = 0; i < newRooms.length; i++) {
            await createRoom({
              project_id: projectId,
              name: newRooms[i],
              sort_order: startOrder + i + 1,
            });
          }
        }
      } catch {
        // Non-critical — rooms not created, items still imported
        console.warn('[SupplyImport] Failed to auto-create rooms');
      }

      setImportedCount(items.length);
      onImportComplete();
      setStep(4);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка импорта');
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
    setSheets({});
    setSelectedSheet('');
    setImportedCount(0);
    setError('');
    setUnmatchedStages([]);
    setAiNotes('');
  };

  // Preview: mapped rows for step 3, grouped by room if room is mapped
  const computed = useMemo(() => {
    const result = buildItems();
    const hasRoom = Object.values(mapping).includes('room');

    let groups: Record<string, CreateSupplyItemInput[]> | null = null;
    if (hasRoom) {
      groups = {};
      for (const item of result.items) {
        const key = item.room || 'Без помещения';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
    }

    return {
      preview: { groups, items: result.items.slice(0, 8), total: result.items.length },
      unmatched: result.unmatched,
      autoFilled: result.autoFilled,
    };
  }, [rows, mapping, buildItems]);

  const previewData = computed.preview;

  // Sync derived state via useEffect (not during render)
  useEffect(() => {
    setUnmatchedStages(computed.unmatched);
    setAutoFilledStageItems(computed.autoFilled);
  }, [computed.unmatched, computed.autoFilled]);

  const mappedFieldsBase = SUPPLY_FIELDS.filter(f =>
    Object.values(mapping).includes(f.key) && !['unit', 'specs'].includes(f.key)
  );
  // Add consolidated notes column if any virtual note field is mapped
  const hasVirtualNotes = ['unit', 'specs'].some(k => Object.values(mapping).includes(k as FieldKey));
  const mappedFieldsWithNotes = hasVirtualNotes
    ? [...mappedFieldsBase, { key: 'notes' as FieldKey, label: 'Заметки', required: false }]
    : mappedFieldsBase;
  // Include stage column in preview when kind mappings auto-filled stages even if no explicit stage column was mapped
  const hasStageColumn = Object.values(mapping).includes('stage');
  const mappedFields = (!hasStageColumn && autoFilledStageItems.size > 0)
    ? [...mappedFieldsWithNotes, { key: 'stage' as FieldKey, label: 'Этап', required: false }]
    : mappedFieldsWithNotes;

  // Helper: resolve stage name from target_stage_id
  const stageName = (stageId: string | undefined): string => {
    if (!stageId) return '—';
    const s = stages.find(st => st.id === stageId);
    return s ? s.name : '—';
  };

  // Helper: get cell value for preview, resolving stage names
  const cellValue = (item: CreateSupplyItemInput, fieldKey: string): string => {
    if (fieldKey === 'stage') return stageName(item.target_stage_id);
    if (fieldKey === 'link') return String(item.url || '—');
    return String((item as unknown as Record<string, unknown>)[fieldKey] || '—');
  };

  // Helper: is this item's stage auto-filled from kind mapping?
  const isAutoStage = (item: CreateSupplyItemInput): boolean => {
    return !!item.name && autoFilledStageItems.has(item.name);
  };

  // Check if a field is used by another column (for dedup in dropdown)
  const isFieldUsedElsewhere = (field: FieldKey, currentColIdx: number): boolean => {
    if (MULTI_MAP_FIELDS.includes(field)) return false; // notes can be multi-mapped
    return Object.entries(mapping).some(
      ([idx, val]) => val === field && Number(idx) !== currentColIdx
    );
  };

  // Visual step number for the step indicator (maps 1.5 to 1 for display)
  const displayStep = step === 1.5 ? 1 : step;

  return (
    <div className="animate-fade-in">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {stepsConfig.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${
              displayStep > s.n ? 'bg-ink text-srf' : displayStep === s.n ? 'bg-ink text-srf' : 'bg-srf-secondary text-ink-faint'
            }`}>
              {displayStep > s.n ? <Icons.Check className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span className={`text-[12px] ${displayStep >= s.n ? 'text-ink font-medium' : 'text-ink-faint'}`}>
              {s.label}
            </span>
            {i < stepsConfig.length - 1 && <div className="w-8 h-px bg-line" />}
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          background: 'rgb(var(--line), 0.15)', border: '0.5px solid rgb(var(--line))',
          padding: '8px 12px', marginBottom: 12,
          fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)',
          color: 'rgb(var(--ink))',
        }}>
          {error}
        </div>
      )}

      {/* AI mapping indicator */}
      {aiMapping && (
        <div style={{
          padding: '12px 16px', marginBottom: 12,
          fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)',
          color: 'rgb(var(--ink))', textAlign: 'center',
          border: '0.5px solid rgb(var(--line))',
        }}>
          Анализирую структуру таблицы...
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div style={{ background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))', padding: 32, textAlign: 'center' }}>
          <div
            style={{
              border: dragOver ? '2px dashed rgb(var(--ink))' : '1px dashed rgb(var(--line))',
              background: dragOver ? 'rgb(var(--line), 0.3)' : 'rgb(var(--line), 0.15)',
              padding: 48,
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div style={{ color: 'rgb(var(--ink))', opacity: 0.5, display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Icons.Upload className="w-10 h-10" />
            </div>
            <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-13)', fontWeight: 500, color: 'rgb(var(--ink))', marginBottom: 4 }}>
              Перетащите файл Excel сюда
            </div>
            <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink))', opacity: 0.5 }}>
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
          <div style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-10)',
            color: 'rgb(var(--ink))', opacity: 0.4, marginTop: 12,
          }}>
            Google Sheets: Файл &rarr; Скачать &rarr; Microsoft Excel (.xlsx)
          </div>
        </div>
      )}

      {/* Step 1.5: Sheet selection */}
      {step === 1.5 && (
        <div style={{ background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))', padding: 24 }}>
          <div style={{
            fontFamily: 'var(--af-font-display)', fontSize: 16, fontWeight: 700,
            textTransform: 'uppercase' as const, color: 'rgb(var(--ink))', marginBottom: 4,
          }}>
            Выберите лист
          </div>
          <div style={{
            fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)',
            color: 'rgb(var(--ink))', opacity: 0.5, marginBottom: 16,
          }}>
            В файле {Object.keys(sheets).length} листов с данными. Выберите нужный:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(sheets)
              .sort(([, a], [, b]) => (b.recommendation?.score ?? 0) - (a.recommendation?.score ?? 0))
              .map(([name, sheet]) => {
                const rec = sheet.recommendation;
                const isRecommended = rec && rec.score === 100;
                const isService = rec && rec.score === 0;
                return (
                  <button
                    key={name}
                    onClick={() => handleSelectSheet(name)}
                    disabled={aiMapping || isService}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: 'rgb(var(--srf))',
                      border: isRecommended ? '1px solid rgb(var(--ink))' : '0.5px solid rgb(var(--line))',
                      cursor: aiMapping || isService ? 'not-allowed' : 'pointer',
                      transition: 'background 0.12s',
                      textAlign: 'left',
                      opacity: isService ? 0.4 : 1,
                    }}
                    onMouseEnter={e => { if (!isService) { e.currentTarget.style.background = 'rgb(var(--ink))'; e.currentTarget.style.color = 'rgb(var(--srf))'; } }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgb(var(--srf))'; e.currentTarget.style.color = 'rgb(var(--ink))'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-13)', fontWeight: 500, color: 'inherit' }}>
                        {name}
                      </span>
                      {isRecommended && (
                        <span style={{
                          fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-8)',
                          padding: '2px 6px', border: '0.5px solid currentColor',
                          textTransform: 'uppercase', letterSpacing: '0.08em', color: 'inherit',
                        }}>
                          Рекомендуется
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-10)', opacity: 0.5, color: 'inherit' }}>
                      {rec ? rec.hint : `${sheet.headers.length} столбцов · ${sheet.rows.length} строк`}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <div style={{ background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ fontFamily: 'var(--af-font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase' }}>Сопоставление колонок</h3>
            <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-9)', color: 'rgb(var(--ink))', opacity: 0.4 }}>
              {fileName}{selectedSheet ? ` / ${selectedSheet}` : ''}
            </span>
          </div>
          {aiNotes && (
            <div style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-10)',
              color: 'rgb(var(--ink))', opacity: 0.5, marginBottom: 8,
            }}>
              AI: {aiNotes}
            </div>
          )}

          {/* Column mapping rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {headers.map((header, i) => {
              const isMapped = !!mapping[i];
              const sampleVal = rows[0]?.[i] || '';
              const sampleVal2 = rows[1]?.[i] || '';
              const fieldLabel = isMapped ? SUPPLY_FIELDS.find(f => f.key === mapping[i])?.label : null;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'stretch', gap: 0,
                  borderBottom: '0.5px solid rgb(var(--line))',
                }}>
                  {/* LEFT: Excel column info */}
                  <div style={{
                    flex: '1 1 50%', padding: '10px 12px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    minWidth: 0,
                  }}>
                    <div style={{
                      fontFamily: 'var(--af-font-mono)', fontSize: 11, fontWeight: 600,
                      color: 'rgb(var(--ink))',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }} title={header}>
                      {header}
                    </div>
                    {sampleVal && (
                      <div style={{
                        fontFamily: 'var(--af-font-mono)', fontSize: 9,
                        color: 'rgb(var(--ink))', opacity: 0.4, marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }} title={sampleVal}>
                        {sampleVal}{sampleVal2 && sampleVal2 !== sampleVal ? ` · ${sampleVal2}` : ''}
                      </div>
                    )}
                  </div>
                  {/* ARROW */}
                  <div style={{
                    display: 'flex', alignItems: 'center', padding: '0 6px',
                    fontFamily: 'var(--af-font-mono)', fontSize: 12,
                    color: isMapped ? 'rgb(var(--ink))' : 'rgb(var(--line))',
                  }}>
                    →
                  </div>
                  {/* RIGHT: Archflow field select */}
                  <div style={{
                    flex: '1 1 50%', padding: '8px 0 8px 0',
                    display: 'flex', alignItems: 'center', minWidth: 0,
                  }}>
                    <select
                      value={mapping[i] || ''}
                      onChange={(e) => updateMapping(i, e.target.value as FieldKey | '')}
                      style={{
                        width: '100%', height: 36,
                        padding: '0 28px 0 10px',
                        fontFamily: 'var(--af-font-mono)', fontSize: 11,
                        color: isMapped ? 'rgb(var(--ink))' : 'rgb(var(--ink), 0.4)',
                        background: isMapped ? 'rgb(var(--srf))' : 'transparent',
                        border: isMapped ? '0.5px solid rgb(var(--ink))' : '0.5px solid rgb(var(--line))',
                        borderRadius: 0,
                        outline: 'none',
                        cursor: 'pointer',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23111'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                      }}
                    >
                      <option value="">Пропустить</option>
                      {SUPPLY_FIELDS.map(f => {
                        const usedElsewhere = isFieldUsedElsewhere(f.key, i);
                        return (
                          <option key={f.key} value={f.key} disabled={usedElsewhere}>
                            {f.label}{usedElsewhere ? ' ✓' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
          {!hasNameMapping && (
            <div style={{
              fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)',
              color: 'rgb(var(--ink))', marginTop: 12,
              padding: '8px 12px', border: '0.5px solid rgb(var(--line))',
            }}>
              Укажите колонку для поля &laquo;Наименование&raquo; &mdash; это обязательное поле
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div style={{ background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))', padding: 20 }}>
          <h3 style={{ fontFamily: 'var(--af-font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Предпросмотр</h3>
          <p className="text-[13px] text-ink-faint mb-4">
            {previewData.total} позиций будут импортированы
          </p>

          {/* Unmatched stages — manual assignment */}
          {unmatchedStages.length > 0 && (
            <div style={{
              background: 'rgb(var(--line), 0.15)', border: '0.5px solid rgb(var(--line))',
              padding: '12px 16px', marginBottom: 12,
            }}>
              <div style={{
                fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-12)',
                color: 'rgb(var(--ink))', fontWeight: 600, marginBottom: 8,
              }}>
                Назначьте этапы вручную ({unmatchedStages.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {unmatchedStages.map((name) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)',
                      color: 'rgb(var(--ink))', minWidth: 200, flexShrink: 0,
                    }}>
                      {name}
                    </span>
                    <span style={{ fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)', color: 'rgb(var(--ink-faint))' }}>→</span>
                    <select
                      value={stageOverrides[name] || ''}
                      onChange={(e) => {
                        setStageOverrides(prev => {
                          const next = { ...prev };
                          if (e.target.value) next[name] = e.target.value;
                          else delete next[name];
                          return next;
                        });
                      }}
                      style={{
                        fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)',
                        padding: '4px 8px', border: '0.5px solid rgb(var(--line))',
                        background: 'rgb(var(--srf))', color: 'rgb(var(--ink))',
                        borderRadius: 0, minWidth: 200,
                      }}
                    >
                      <option value="">— выберите этап —</option>
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {previewData.groups ? (
              // Grouped by room
              <div>
                {Object.entries(previewData.groups).map(([roomName, roomItems]) => (
                  <div key={roomName} style={{ marginBottom: 16 }}>
                    <div style={{
                      fontFamily: 'var(--af-font-display)', fontSize: 13,
                      fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 6,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      {roomName}
                      <span style={{
                        fontFamily: 'var(--af-font-mono)',
                        fontSize: 'var(--af-fs-10)', fontWeight: 400, color: 'rgb(var(--ink))', opacity: 0.5,
                      }}>
                        ({roomItems.length})
                      </span>
                    </div>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '0.5px solid rgb(var(--line))' }}>
                          {mappedFields.filter(f => f.key !== 'room').map(f => (
                            <th key={f.key} style={{
                              textAlign: 'left', padding: '4px 8px',
                              fontFamily: 'var(--af-font-mono)',
                              fontSize: 'var(--af-fs-10)', color: 'rgb(var(--ink))', opacity: 0.5, fontWeight: 500,
                            }}>
                              {f.label.replace(' *', '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {roomItems.slice(0, 5).map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '0.5px solid rgb(var(--line), 0.3)' }}>
                            {mappedFields.filter(f => f.key !== 'room').map(f => (
                              <td key={f.key} style={{
                                padding: '4px 8px', color: '#666',
                                fontFamily: 'var(--af-font-mono)',
                                fontSize: 'var(--af-fs-11)',
                                maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {cellValue(item, f.key)}
                                {f.key === 'stage' && isAutoStage(item) && (
                                  <span style={{ color: 'rgb(var(--ink))', opacity: 0.5, fontSize: 'var(--af-fs-9)', marginLeft: 4 }}>(авто)</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {roomItems.length > 5 && (
                          <tr>
                            <td colSpan={mappedFields.length} style={{
                              padding: '4px 8px', color: 'rgb(var(--ink))', opacity: 0.5,
                              fontFamily: 'var(--af-font-mono)',
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
                          {cellValue(item, f.key)}
                          {f.key === 'stage' && isAutoStage(item) && (
                            <span style={{ color: 'rgb(var(--ink))', opacity: 0.5, fontSize: 'var(--af-fs-9)', marginLeft: 4 }}>(авто)</span>
                          )}
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
        <div style={{ background: 'rgb(var(--srf))', border: '0.5px solid rgb(var(--line))', padding: 32, textAlign: 'center' }}>
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
          onClick={() => {
            if (step === 2 && Object.keys(sheets).length > 1) setStep(1.5 as number);
            else if (step === 2) setStep(1);
            else if (step === 3) setStep(2);
          }}
          style={{ visibility: step > 1 && step < 4 ? 'visible' : 'hidden' }}
        >
          Назад
        </button>
        {step === 1.5 && (
          <button className="btn btn-secondary" onClick={resetWizard}>
            &larr; Другой файл
          </button>
        )}
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
