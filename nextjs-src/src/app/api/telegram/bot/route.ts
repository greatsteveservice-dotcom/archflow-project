import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- Supabase Admin ---
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// --- Telegram helpers ---
const BOT_TOKEN = process.env.TELEGRAM_VOICE_BOT_TOKEN!;

const TG = (method: string, body: object) =>
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const sendMessage = (chatId: number, text: string) =>
  TG('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });

const sendInlineButtons = (chatId: number, text: string, keyboard: object[][]) =>
  TG('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard },
  });

const answerCallback = (callbackQueryId: string) =>
  TG('answerCallbackQuery', { callback_query_id: callbackQueryId });

// --- Tone config ---
const BASE_RULES = `ВАЖНО: Это расшифровка голосовой заметки. Убери ВСЕ слова-паразиты (короче, в общем, ну, типа, как бы, вот, значит, то есть, собственно). Убери повторы и самокоррекции. Сократи до сути — оставь только факты, задачи, сроки. НЕ пересказывай дословно — переформулируй кратко своими словами. Результат должен быть в 2-3 раза короче оригинала.`;

const TONE_PROMPTS: Record<string, string> = {
  foreman:
    `Ты помощник дизайнера интерьера. Преобразуй голосовую заметку в короткое деловое сообщение прорабу. Тон: прямой, без вежливостей. Структура: пронумерованный список задач с дедлайнами если упомянуты. Без вступлений и подписей. ${BASE_RULES}`,
  client:
    `Ты помощник дизайнера интерьера. Преобразуй голосовую заметку в вежливое сообщение заказчику. Тон: спокойный, позитивный. Проблемы подавай как "под контролем". Акцент на прогресс. Вопросы — чётко в конце. ${BASE_RULES}`,
  supplier:
    `Ты помощник дизайнера интерьера. Преобразуй голосовую заметку в деловой запрос поставщику. Тон: нейтральный, фактический. Упомяни номер заказа и сроки если есть. ${BASE_RULES}`,
  team:
    `Ты помощник дизайнера интерьера. Преобразуй голосовую заметку во внутренний апдейт для команды. Тон: неформальный, прямой. Структура: задача → что нужно → дедлайн. ${BASE_RULES}`,
};

const TONE_LABELS: Record<string, string> = {
  foreman: 'для прораба',
  client: 'для заказчика',
  supplier: 'для поставщика',
  team: 'для команды',
};

// --- Main handler ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Callback buttons
    if (body.callback_query) {
      await handleCallback(body.callback_query);
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;

    // /start command
    if (message.text === '/start') {
      await sendMessage(
        chatId,
        'Отправь голосовое — я превращу его в текст для прораба, заказчика, поставщика или команды.'
      );
      return NextResponse.json({ ok: true });
    }

    // Voice message
    const voice = message.voice || message.audio;
    if (voice) {
      const isForwarded =
        !!message.forward_from ||
        !!message.forward_sender_name ||
        !!message.forward_date;

      if (isForwarded) {
        await handleForwardedVoice(chatId, message, voice);
      } else {
        await handleOwnVoice(chatId, voice);
      }
    }

    // Text message — check if awaiting edit
    if (message.text && message.text !== '/start') {
      await handleTextMessage(chatId, message.text);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[telegram/bot] error:', err);
    return NextResponse.json({ ok: true });
  }
}

// --- Mode 1: own voice ---
async function handleOwnVoice(chatId: number, voice: { file_id: string }) {
  await sendMessage(chatId, 'Обрабатываю...');

  const transcript = await transcribe(voice.file_id);
  if (!transcript) {
    await sendMessage(chatId, 'Не удалось распознать. Попробуй ещё раз.');
    return;
  }

  // Save transcript to Supabase
  const { data: draft } = await supabaseAdmin
    .from('bot_drafts')
    .insert({
      chat_id: chatId,
      transcript,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (!draft) {
    await sendMessage(chatId, 'Ошибка сохранения. Попробуй ещё раз.');
    return;
  }

  // Ask recipient
  await sendInlineButtons(chatId, 'Кому отправляем?', [
    [
      { text: 'Прорабу', callback_data: `tone:foreman:${draft.id}` },
      { text: 'Заказчику', callback_data: `tone:client:${draft.id}` },
    ],
    [
      { text: 'Поставщику', callback_data: `tone:supplier:${draft.id}` },
      { text: 'Команде', callback_data: `tone:team:${draft.id}` },
    ],
  ]);
}

// --- Mode 2: forwarded voice ---
async function handleForwardedVoice(
  chatId: number,
  message: { forward_from?: { first_name?: string }; forward_sender_name?: string },
  voice: { file_id: string; duration: number }
) {
  const senderName =
    message.forward_from?.first_name ||
    message.forward_sender_name ||
    'собеседник';

  await sendMessage(chatId, 'Транскрибирую...');

  const transcript = await transcribe(voice.file_id);
  if (!transcript) {
    await sendMessage(chatId, 'Не удалось распознать. Попробуй ещё раз.');
    return;
  }

  if (voice.duration > 120) {
    await sendLongTranscript(chatId, senderName, transcript);
  } else {
    await sendShortTranscript(chatId, senderName, transcript);
  }
}

async function sendShortTranscript(chatId: number, senderName: string, transcript: string) {
  const cleaned = await cleanTranscript(transcript);
  const text = `*${senderName} говорит:*\n\n${cleaned}`;
  await sendInlineButtons(chatId, text, [
    [{ text: 'Скопировать', callback_data: 'copy_plain:done' }],
  ]);
}

async function sendLongTranscript(chatId: number, senderName: string, transcript: string) {
  const summary = await summarize(transcript);

  const preview = transcript.length > 300 ? transcript.slice(0, 300) + '...' : transcript;
  const text = `*${senderName} говорит — кратко:*\n\n${summary}\n\n*Полный текст:*\n${preview}`;

  // Save full transcript for copy buttons
  const { data: draft } = await supabaseAdmin
    .from('bot_drafts')
    .insert({
      chat_id: chatId,
      transcript,
      result: summary,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  const draftId = draft?.id || 'none';

  await sendInlineButtons(chatId, text, [
    [
      { text: 'Показать полный текст', callback_data: `full:${draftId}` },
    ],
  ]);
}

// --- Handle text messages (edit flow) ---
async function handleTextMessage(chatId: number, text: string) {
  // Check for active draft awaiting edit
  const { data: draft } = await supabaseAdmin
    .from('bot_drafts')
    .select('id, transcript, tone, result')
    .eq('chat_id', chatId)
    .eq('awaiting_edit', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!draft || !draft.tone || !draft.result) return;

  await sendMessage(chatId, 'Обновляю текст...');

  // Re-format with edit instruction
  const result = await applyEdit(draft.transcript, draft.result, draft.tone, text);

  // Update draft
  await supabaseAdmin
    .from('bot_drafts')
    .update({ result, awaiting_edit: false })
    .eq('id', draft.id);

  const label = TONE_LABELS[draft.tone] || '';
  await sendResultWithButtons(chatId, label, result, draft.id);
}

// --- Callback handler ---
async function handleCallback(callbackQuery: {
  id: string;
  message: { chat: { id: number } };
  data: string;
}) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  await answerCallback(callbackQuery.id);

  // Tone selection: tone:foreman:draftId
  if (data.startsWith('tone:')) {
    const parts = data.split(':');
    const tone = parts[1];
    const draftId = parts[2];

    const { data: draft } = await supabaseAdmin
      .from('bot_drafts')
      .select('transcript')
      .eq('id', draftId)
      .single();

    if (!draft) {
      await sendMessage(chatId, 'Что-то пошло не так. Запиши голосовое ещё раз.');
      return;
    }

    await sendMessage(chatId, 'Готовлю текст...');

    const result = await formatForRecipient(draft.transcript, tone);
    const label = TONE_LABELS[tone] || '';

    // Save result and tone to draft
    await supabaseAdmin
      .from('bot_drafts')
      .update({ result, tone })
      .eq('id', draftId);

    await sendResultWithButtons(chatId, label, result, draftId);
  }

  // Edit request
  if (data.startsWith('edit:')) {
    const draftId = data.split(':')[1];
    await supabaseAdmin
      .from('bot_drafts')
      .update({ awaiting_edit: true })
      .eq('id', draftId);

    await sendMessage(chatId, 'Надиктуй правку или напиши что изменить — обновлю текст.');
  }

  // Show full transcript
  if (data.startsWith('full:')) {
    const draftId = data.split(':')[1];
    const { data: draft } = await supabaseAdmin
      .from('bot_drafts')
      .select('transcript')
      .eq('id', draftId)
      .single();

    if (draft?.transcript) {
      // Telegram message limit is 4096 chars
      const text = draft.transcript.length > 4000
        ? draft.transcript.slice(0, 4000) + '...'
        : draft.transcript;
      await sendMessage(chatId, text);
    }
  }

  // Copy — just acknowledge (Telegram can't copy to clipboard)
  if (data.startsWith('copy')) {
    // answerCallback already sent above
  }
}

async function sendResultWithButtons(chatId: number, label: string, text: string, draftId: string) {
  await TG('sendMessage', {
    chat_id: chatId,
    text: `*${label}*\n\n${text}`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Редактировать', callback_data: `edit:${draftId}` }],
      ],
    },
  });
}

// --- Transcription via Whisper ---
async function transcribe(fileId: string): Promise<string | null> {
  try {
    // Get file path from Telegram
    const fileRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
    );
    const fileData = await fileRes.json();

    if (!fileData.ok || !fileData.result?.file_path) {
      console.error('[transcribe] getFile failed:', fileData);
      return null;
    }

    const filePath = fileData.result.file_path;

    // Download audio
    const audioRes = await fetch(
      `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`
    );
    const audioBuffer = await audioRes.arrayBuffer();

    // Send to Whisper
    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'voice.ogg');
    form.append('model', 'whisper-1');
    form.append('language', 'ru');
    form.append(
      'prompt',
      'дизайн интерьера, авторский надзор, прораб, заказчик, фрезеровка, гипрок, стяжка, комплектация, поставщик'
    );

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });

    const whisperData = await whisperRes.json();
    return whisperData.text || null;
  } catch (err) {
    console.error('[transcribe] error:', err);
    return null;
  }
}

// --- AI: clean transcript (remove filler words, make concise) ---
async function cleanTranscript(transcript: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `Очисти расшифровку голосового сообщения. Убери ВСЕ слова-паразиты (короче, в общем, ну, типа, как бы, вот, значит, то есть, собственно, слушай, смотри). Убери повторы, самокоррекции, незаконченные мысли. Переформулируй кратко и чётко своими словами, сохраняя ВСЕ факты, имена, даты, числа и суть. Результат должен быть лаконичным — в 2-3 раза короче оригинала. Не добавляй ничего от себя. Не используй маркдаун.`,
      messages: [{ role: 'user', content: transcript }],
    }),
  });

  const data = await res.json();
  return data.content?.[0]?.text || transcript;
}

// --- AI: format for recipient ---
async function formatForRecipient(transcript: string, tone: string): Promise<string> {
  const systemPrompt = TONE_PROMPTS[tone] || TONE_PROMPTS.team;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: transcript }],
    }),
  });

  const data = await res.json();
  return data.content?.[0]?.text || transcript;
}

// --- AI: summarize long transcript ---
async function summarize(transcript: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `Сделай краткое резюме этого монолога. Выдели отдельно: что хочет изменить, что спрашивает, что сообщает. Только факты, без воды.\n\n${transcript}`,
        },
      ],
    }),
  });

  const data = await res.json();
  return data.content?.[0]?.text || transcript;
}

// --- AI: apply edit ---
async function applyEdit(
  originalTranscript: string,
  currentResult: string,
  tone: string,
  editInstruction: string
): Promise<string> {
  const systemPrompt = TONE_PROMPTS[tone] || TONE_PROMPTS.team;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Оригинальная заметка:\n${originalTranscript}\n\nТекущий текст:\n${currentResult}\n\nПравка от пользователя:\n${editInstruction}\n\nПрименя правку, верни обновлённый текст.`,
        },
      ],
    }),
  });

  const data = await res.json();
  return data.content?.[0]?.text || currentResult;
}
