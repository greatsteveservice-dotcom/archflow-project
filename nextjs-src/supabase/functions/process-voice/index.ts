import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
// Use DB_URL / DB_SERVICE_KEY to point to the Beget-hosted Supabase instance.
// The built-in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are reserved by Supabase Cloud
// and always point to the Cloud project (which has no app tables).
const SUPABASE_URL = Deno.env.get('DB_URL') || Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('DB_SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Map MIME type to Whisper-compatible file extension.
 *  Whisper accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm.
 *  iOS Safari records as audio/mp4 — must send with .mp4 extension. */
function getFileExtension(mimeType: string, originalName?: string): string {
  const mimeMap: Record<string, string> = {
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/webm': 'webm',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'm4a',
    'audio/ogg': 'ogg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
  };

  const lower = mimeType.toLowerCase().trim();
  // Try exact match
  if (mimeMap[lower]) return mimeMap[lower];
  // Try base type (without codecs parameter)
  const baseType = lower.split(';')[0].trim();
  if (mimeMap[baseType]) return mimeMap[baseType];
  // Fallback: try original filename extension
  if (originalName) {
    const extMatch = originalName.match(/\.(\w+)$/);
    if (extMatch) return extMatch[1].toLowerCase();
  }
  // Default to mp4 (safe for iOS Safari)
  console.warn(`Unknown MIME type: ${mimeType}, defaulting to mp4`);
  return 'mp4';
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    console.log('=== process-voice: START ===');
    console.log('Auth header present:', authHeader.substring(0, 20) + '...');

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const projectId = formData.get('project_id') as string;
    const userId = formData.get('user_id') as string;
    const chatType = formData.get('chat_type') as string || 'client';
    const duration = parseInt(formData.get('duration') as string || '0', 10);
    const messageId = formData.get('message_id') as string | null;

    if (!audioFile || !projectId || !userId) {
      console.error('Missing required fields:', { hasAudio: !!audioFile, projectId, userId });
      return new Response(
        JSON.stringify({ error: 'audio, project_id, and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const fileMimeType = audioFile.type || 'audio/mp4';
    const fileExt = getFileExtension(fileMimeType, audioFile.name);
    const fileName = `voice.${fileExt}`;

    console.log(`[1/5] Received audio file:`, JSON.stringify({
      originalName: audioFile.name,
      mimeType: fileMimeType,
      resolvedExt: fileExt,
      fileName,
      size: audioFile.size,
      sizeKB: Math.round(audioFile.size / 1024),
      projectId,
      userId,
      messageId,
      duration,
    }));

    // 1. Transcribe with Whisper
    console.log(`[2/5] Sending to Whisper API (model=whisper-1, lang=ru, file=${fileName})...`);

    const whisperForm = new FormData();
    // Create a new Blob with the audio data and correct MIME type, append with correct filename
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: fileMimeType });
    whisperForm.append('file', audioBlob, fileName);
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'ru');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: whisperForm,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error(`[2/5] Whisper API error (status ${whisperRes.status}):`, errText);

      // Update placeholder with error if message_id provided
      if (messageId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('chat_messages').update({
          text: '⚠️ Ошибка распознавания речи',
        }).eq('id', messageId);
      }

      throw new Error(`Whisper error (${whisperRes.status}): ${errText}`);
    }

    const whisperData = await whisperRes.json();
    const rawTranscript = whisperData.text;
    console.log(`[2/5] Whisper response OK:`, JSON.stringify({
      transcriptLength: rawTranscript?.length || 0,
      transcriptPreview: rawTranscript?.substring(0, 150) || '(empty)',
    }));

    if (!rawTranscript || rawTranscript.trim().length === 0) {
      console.warn('[2/5] Empty transcript — speech not recognized');
      if (messageId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('chat_messages').update({
          text: '🎤 Не удалось распознать речь',
        }).eq('id', messageId);
      }
      return new Response(
        JSON.stringify({ error: 'empty_transcript', message: 'Не удалось распознать речь' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Clean up with GPT-4o-mini (cheaper, same OpenAI key as Whisper)
    console.log(`[3/5] Sending to GPT-4o-mini for cleanup...`);

    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: 'Ты редактор текста. Убери слова-паразиты, расставь знаки препинания. Сохрани живой разговорный тон. Верни только готовый текст без пояснений.',
          },
          {
            role: 'user',
            content: `Это голосовое сообщение заказчика дизайнеру интерьера:\n\n${rawTranscript}`,
          },
        ],
      }),
    });

    let cleanedText = rawTranscript;
    if (gptRes.ok) {
      const gptData = await gptRes.json();
      cleanedText = gptData.choices?.[0]?.message?.content || rawTranscript;
      console.log(`[3/5] GPT-4o-mini response OK:`, JSON.stringify({
        cleanedLength: cleanedText.length,
        cleanedPreview: cleanedText.substring(0, 150),
      }));
    } else {
      const errText = await gptRes.text();
      console.error(`[3/5] GPT-4o-mini error (status ${gptRes.status}), using raw transcript:`, errText);
    }

    // 3. Save to DB
    console.log(`[4/5] Saving to database (mode=${messageId ? 'UPDATE' : 'INSERT'}, messageId=${messageId || 'n/a'})...`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (messageId) {
      // UPDATE existing placeholder message
      const { data: message, error: updateError } = await supabase
        .from('chat_messages')
        .update({
          text: cleanedText,
          voice_original: rawTranscript,
          voice_duration: duration,
        })
        .eq('id', messageId)
        .select()
        .single();

      if (updateError) {
        console.error('[4/5] DB update error:', JSON.stringify(updateError));
        throw updateError;
      }

      console.log(`[5/5] SUCCESS — message updated:`, JSON.stringify({ id: message.id, textPreview: cleanedText.substring(0, 80) }));

      return new Response(
        JSON.stringify({ ok: true, message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } else {
      // INSERT new message (backward compat)
      const { data: message, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          project_id: projectId,
          user_id: userId,
          text: cleanedText,
          chat_type: chatType,
          message_type: 'voice',
          voice_duration: duration,
          voice_original: rawTranscript,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[4/5] DB insert error:', JSON.stringify(insertError));
        throw insertError;
      }

      console.log(`[5/5] SUCCESS — message inserted:`, JSON.stringify({ id: message.id, textPreview: cleanedText.substring(0, 80) }));

      return new Response(
        JSON.stringify({ ok: true, message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  } catch (err) {
    console.error('=== process-voice: FATAL ERROR ===', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
