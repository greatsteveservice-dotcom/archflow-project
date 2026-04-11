import { NextResponse } from 'next/server';

// Uses OpenAI gpt-4o-mini vision to classify an interior image by room type.
// Input: { imageUrl: string, existingCounts?: Record<string, number> }
// Output: { roomType: string, confidence: number, suggestedName: string }

type RoomType =
  | 'кухня'
  | 'гостиная'
  | 'спальня'
  | 'детская'
  | 'ванная'
  | 'санузел'
  | 'коридор'
  | 'прихожая'
  | 'кабинет'
  | 'гардеробная'
  | 'балкон'
  | 'столовая'
  | 'фасад'
  | 'план'
  | 'другое';

const ROOM_TYPES: RoomType[] = [
  'кухня', 'гостиная', 'спальня', 'детская', 'ванная', 'санузел',
  'коридор', 'прихожая', 'кабинет', 'гардеробная', 'балкон',
  'столовая', 'фасад', 'план', 'другое',
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function POST(request: Request) {
  try {
    const { imageUrl, existingCounts } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'imageUrl required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 });
    }

    const prompt = `Ты эксперт по дизайну интерьеров. Посмотри на изображение и определи тип помещения.

Отвечай строго JSON без форматирования:
{"type": "<один из: ${ROOM_TYPES.join(', ')}>", "confidence": <0.0-1.0>}

Правила:
- "кухня" — есть кухонный гарнитур, плита, мойка
- "гостиная" — диван, телевизор, зона отдыха
- "спальня" — кровать
- "детская" — кровать + игрушки/детские элементы
- "ванная" — ванна/душевая
- "санузел" — унитаз без ванны
- "коридор" — узкое проходное пространство
- "прихожая" — входная зона с обувницей/вешалкой
- "кабинет" — рабочий стол, книжные полки
- "гардеробная" — шкафы, вешала
- "балкон" — открытое/застеклённое с видом наружу
- "столовая" — обеденный стол как главный объект
- "фасад" — внешний вид здания
- "план" — технический план/чертёж/схема
- "другое" — если ничего не подходит

Если не уверен (< 0.5), ставь confidence ниже.`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI classify-room error:', errText);
      return NextResponse.json({ error: 'vision_api_failed' }, { status: 500 });
    }

    const data = await openaiRes.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'empty_response' }, { status: 500 });
    }

    let parsed: { type?: string; confidence?: number };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 500 });
    }

    const roomType = (ROOM_TYPES.includes(parsed.type as RoomType) ? parsed.type : 'другое') as RoomType;
    const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;

    // Build a friendly suggested name: "Кухня 1", "Кухня 2" etc based on existingCounts
    const count = (existingCounts && typeof existingCounts[roomType] === 'number') ? existingCounts[roomType] : 0;
    const suggestedName = count >= 0 ? `${capitalize(roomType)} ${count + 1}` : capitalize(roomType);

    return NextResponse.json({
      roomType,
      confidence,
      suggestedName,
    });
  } catch (err) {
    console.error('classify-room error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
