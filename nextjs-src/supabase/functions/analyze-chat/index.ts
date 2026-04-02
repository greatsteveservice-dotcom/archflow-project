import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('DB_URL') || Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('DB_SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Ты помощник дизайнера интерьера в России.
Анализируй переписку и находи незакрытые действия —
что отправлено на согласование, одобрение или ожидает ответа от другой стороны.
Отвечай ТОЛЬКО валидным JSON без markdown:
{
  "found": boolean,
  "action": string,
  "target": "client" | "designer" | "contractor",
  "suggested_time": string,
  "reminder_text": string
}
Если незакрытых действий нет: {"found": false}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id, chat_type, last_messages } = await req.json();

    if (!project_id || !last_messages || !Array.isArray(last_messages)) {
      return new Response(
        JSON.stringify({ error: 'project_id and last_messages required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Format messages for the LLM
    const formatted = last_messages
      .map((m: any) => `[${m.author || 'unknown'}]: ${m.text}`)
      .join('\n');

    console.log(`[analyze-chat] Analyzing ${last_messages.length} messages for project ${project_id}`);

    // Call GPT-4o-mini (using OpenAI since Anthropic credits may be low)
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 512,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Чат (${chat_type || 'team'}):\n\n${formatted}` },
        ],
      }),
    });

    if (!gptRes.ok) {
      const errText = await gptRes.text();
      console.error(`[analyze-chat] GPT error (${gptRes.status}):`, errText);
      return new Response(
        JSON.stringify({ found: false, error: 'LLM error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const gptData = await gptRes.json();
    const content = gptData.choices?.[0]?.message?.content || '{"found": false}';

    // Parse JSON response
    let result;
    try {
      // Strip markdown code blocks if present
      const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      console.warn('[analyze-chat] Failed to parse LLM response:', content);
      result = { found: false };
    }

    console.log(`[analyze-chat] Result:`, JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[analyze-chat] Error:', err);
    return new Response(
      JSON.stringify({ found: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
