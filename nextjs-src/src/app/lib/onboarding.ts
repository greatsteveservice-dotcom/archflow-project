// ============================================================
// Onboarding helpers — общая логика для AI-классификации
// ============================================================

import type { OnboardingCategory, DesignFolder } from './types';

export const ONBOARDING_BUCKET = 'design-files';
export const ONBOARDING_PREFIX = '_onboarding';

/** Только эти 6 категорий валидны как final folder в design_files. */
export const DESIGN_FOLDER_IDS: DesignFolder[] = [
  'design_project',
  'visuals',
  'drawings',
  'furniture',
  'engineering',
  'documents',
];

/** Расширенный список категорий, которые ИИ может вернуть. */
export const ALL_AI_CATEGORIES: OnboardingCategory[] = [
  ...DESIGN_FOLDER_IDS,
  'supply_excel',
  'sign_contract',
  'unknown',
];

/** Threshold, выше которого файл раскладывается автоматически. */
export const AUTO_PLACE_CONFIDENCE = 0.85;

/** MIME prefixes изображений — для них берём vision. */
export function isImageMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return mime.startsWith('image/');
}

/** Excel-файлы (.xlsx/.xls) — для них читаем headers. */
export function isExcelMime(mime: string | null | undefined, name?: string): boolean {
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return true;
  if (mime === 'application/vnd.ms-excel') return true;
  if (name && /\.(xlsx|xls)$/i.test(name)) return true;
  return false;
}

/** Описание файла для LLM-промпта (всё, что мы знаем без скачивания). */
export interface OnboardingFileBrief {
  index: number;
  name: string;
  size: number;
  mime: string;
  excelHeaders?: string[];      // для Excel — первая строка
  imageDataUrl?: string;         // для изображений — signed URL или data URL
}

/** Структура ответа LLM на одну позицию. */
export interface AiClassification {
  index: number;
  category: OnboardingCategory;
  confidence: number; // 0..1
  reason: string;
}

/** Сборка промпта для batch-классификации. */
export function buildClassifyPrompt(briefs: OnboardingFileBrief[]): string {
  const lines: string[] = [];
  lines.push(
    'Ты помогаешь дизайнеру интерьера разложить файлы проекта по 6 папкам Archflow + кросс-модульным подсказкам.',
    '',
    'КАТЕГОРИИ:',
    '  "design_project" — ТЗ, концепция, планировка, обмерный план, стилевые решения',
    '  "visuals" — рендеры, визуализации, мудборды, рефы, коллажи',
    '  "drawings" — чертежи (план, развёртки, узлы), AutoCAD-PDF',
    '  "furniture" — спецификации мебели, чертежи мебели на заказ',
    '  "engineering" — электрика, сантехника, вентиляция, тёплый пол',
    '  "documents" — договоры, акты, сметы, КП, счета (НЕ Excel-комплектация!)',
    '  "supply_excel" — Excel-таблица комплектации (артикул/поставщик/цена) → пойдёт в модуль Supply',
    '  "sign_contract" — договор/акт, который явно нужно подписать (название содержит «договор», «акт»)',
    '  "unknown" — не уверен',
    '',
    'ФАЙЛЫ:',
  );
  for (const f of briefs) {
    lines.push(`  ${f.index}: name="${f.name}", mime="${f.mime}", size=${f.size}b`);
    if (f.excelHeaders && f.excelHeaders.length > 0) {
      lines.push(`     excel_headers=${JSON.stringify(f.excelHeaders.slice(0, 20))}`);
    }
  }
  lines.push(
    '',
    'Верни ТОЛЬКО валидный JSON формата:',
    '{"items":[{"index":0,"category":"design_project","confidence":0.95,"reason":"короткое объяснение на русском"}, ...]}',
    '',
    'ПРАВИЛА:',
    '- Если в имени явно «ТЗ», «техническое задание», «концепция», «планировка» → design_project (high)',
    '- Если в имени «рендер», «визуализация», «мудборд», «moodboard» → visuals',
    '- Если в имени «чертеж», «развёртка», «обмеры», «узел» → drawings',
    '- Если в имени «спецификация мебели», «furniture», «комод», «диван» → furniture',
    '- Если в имени «электрика», «сантехника», «вентиляция», «отопление» → engineering',
    '- Если в имени «договор», «акт», «КП», «смета», «счёт» → documents (или sign_contract если договор/акт)',
    '- Если Excel и в headers есть «артикул», «поставщик», «цена», «бренд» → supply_excel',
    '- Если непонятно (имя generic «Документ.pdf», «IMG_001.jpg») → confidence ниже 0.85',
    '- НЕ выдумывай категории вне списка',
  );
  return lines.join('\n');
}

/** Очистка/валидация ответа LLM. */
export function parseAiResponse(raw: string, expectedCount: number): AiClassification[] {
  let parsed: { items?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed.items || !Array.isArray(parsed.items)) return [];

  const out: AiClassification[] = [];
  for (const item of parsed.items as Array<Record<string, unknown>>) {
    const index = typeof item.index === 'number' ? item.index : -1;
    if (index < 0 || index >= expectedCount) continue;
    const category = ALL_AI_CATEGORIES.includes(item.category as OnboardingCategory)
      ? (item.category as OnboardingCategory)
      : 'unknown';
    const confidence = Math.max(0, Math.min(1, Number(item.confidence) || 0));
    const reason = typeof item.reason === 'string' ? item.reason.slice(0, 500) : '';
    out.push({ index, category, confidence, reason });
  }
  return out;
}

/** Какой статус и куда перенести файл по результату ИИ. */
export function decideStatus(c: AiClassification): {
  status: 'auto_placed' | 'needs_review' | 'supply_suggested';
  finalCategory: DesignFolder | null;
} {
  if (c.category === 'supply_excel') {
    return { status: 'supply_suggested', finalCategory: null };
  }
  if (c.category === 'unknown' || c.confidence < AUTO_PLACE_CONFIDENCE) {
    return { status: 'needs_review', finalCategory: null };
  }
  // sign_contract → кладём в documents автоматически (флаг можно поставить позже)
  if (c.category === 'sign_contract') {
    return { status: 'auto_placed', finalCategory: 'documents' };
  }
  // одна из 6 папок Дизайна
  if (DESIGN_FOLDER_IDS.includes(c.category as DesignFolder)) {
    return { status: 'auto_placed', finalCategory: c.category as DesignFolder };
  }
  return { status: 'needs_review', finalCategory: null };
}
