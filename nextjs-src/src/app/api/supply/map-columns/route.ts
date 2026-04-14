import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// POST /api/supply/map-columns
// ============================================================
// AI-powered column mapping for Excel supply import.
// Uses OpenAI GPT-4o-mini (same pattern as classify-room).
// Input: { headers: string[], sampleRows: string[][] }
// Output: { mapping: Record<string, number | null>, confidence, notes }
// ============================================================

const ARCHFLOW_FIELDS = [
  { key: 'name', label: 'Наименование позиции', required: true },
  { key: 'room', label: 'Помещение / комната' },
  { key: 'category', label: 'Вид / категория' },
  { key: 'quantity', label: 'Количество' },
  { key: 'unit', label: 'Единица измерения' },
  { key: 'budget', label: 'Цена за единицу (НЕ стоимость/итого)' },
  { key: 'link', label: 'Ссылка на товар' },
  { key: 'specs', label: 'Характеристики / описание / комментарии' },
  { key: 'stage', label: 'Этап' },
] as const;

export async function POST(req: NextRequest) {
  try {
    const { headers, sampleRows } = await req.json();

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json({ error: 'headers required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const prompt = `Ты помогаешь импортировать таблицу комплектации интерьерного проекта в систему Archflow.

СТОЛБЦЫ Excel (индекс → название заголовка):
${headers.map((h: string, i: number) => `  ${i}: "${h}"`).join('\n')}

${sampleRows && sampleRows.length > 0 ? `ПРИМЕРЫ ДАННЫХ (первые строки):
${(sampleRows as string[][]).slice(0, 3).map((row: string[], ri: number) =>
  `  Строка ${ri + 1}: ` + (headers as string[]).map((_: string, ci: number) =>
    row[ci] ? `[${ci}]="${String(row[ci]).slice(0, 40)}"` : null
  ).filter(Boolean).join(' ')
).join('\n')}` : ''}

ПОЛЯ Archflow (key → описание):
  "name" — Наименование позиции (ОБЯЗАТЕЛЬНОЕ)
  "room" — Помещение / комната
  "category" — Вид / категория товара
  "quantity" — Количество
  "unit" — Единица измерения (шт, м2, компл.)
  "budget" — ЦЕНА ЗА ЕДИНИЦУ (не итоговая стоимость!)
  "link" — Ссылка на товар (URL)
  "specs" — Характеристики / описание / комментарии
  "stage" — Этап работ

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:
1. Столбец "Наименование" / "Название" / "Позиция" / "Товар" → name
2. Столбец "Помещение" / "Комната" / "Зона" → room
3. Столбец "Вид" / "Категория" / "Тип" / "Группа" → category
4. ВАЖНО: столбец "Спецификация" — это подкатегория вида, НЕ specs. Лучше category (если category свободно) или null
5. Столбец "Кол-во" / "Количество" / "Qty" → quantity
6. Столбец "Ед. изм." / "Ед. из." / "Unit" → unit
7. КРИТИЧЕСКИ ВАЖНО: "Цена" / "Price" → budget. НО "Стоимость" / "Итого" / "Сумма" / "Total" → null (это расчётное поле цена×количество, НЕ использовать!)
8. Столбец "Ссылка" / "URL" / "Link" → link
9. Столбец "Характеристики" / "Описание" / "Specs" → specs
10. Столбец "Comments" / "Примечания" / "Комментарий" → specs (если specs свободно)
11. Столбец "Этап" / "Stage" → stage
12. Столбцы "Статус", "Фото", даты, boolean-флаги → null (не нужны)
13. Поле name ОБЯЗАТЕЛЬНО должно быть сопоставлено

Верни ТОЛЬКО валидный JSON:
{"mapping": {"name": 4, "room": 1, "category": 2, "quantity": 12, "unit": 13, "budget": 14, "link": null, "specs": null, "stage": 0}, "confidence": "high", "notes": "краткий комментарий на русском"}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[map-columns] OpenAI error:', errText);
      return NextResponse.json({ error: 'ai_failed' }, { status: 500 });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'empty_response' }, { status: 500 });
    }

    let parsed: { mapping?: Record<string, number | null>; confidence?: string; notes?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'invalid_json', raw: content }, { status: 422 });
    }

    // Validate mapping — only allow valid field keys and column indices within range
    const validMapping: Record<string, number | null> = {};
    for (const field of ARCHFLOW_FIELDS) {
      const val = parsed.mapping?.[field.key];
      if (val !== null && val !== undefined && typeof val === 'number' && val >= 0 && val < headers.length) {
        validMapping[field.key] = val;
      } else {
        validMapping[field.key] = null;
      }
    }

    return NextResponse.json({
      mapping: validMapping,
      confidence: parsed.confidence || 'medium',
      notes: parsed.notes || '',
    });
  } catch (err) {
    console.error('[map-columns] Error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
