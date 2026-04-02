import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('DB_URL') || Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('DB_SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'project_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const now = new Date();
    const events: any[] = [];

    // Helper: check if active event already exists
    async function eventExists(eventType: string, relatedId?: string): Promise<boolean> {
      let q = supabase
        .from('assistant_events')
        .select('id')
        .eq('project_id', project_id)
        .eq('event_type', eventType)
        .eq('status', 'active');
      if (relatedId) q = q.eq('related_id', relatedId);
      const { data } = await q.limit(1);
      return (data && data.length > 0) || false;
    }

    // ────────────────────────────────────────────
    // 1. INVOICES: contract_payments due within 3 days
    // ────────────────────────────────────────────
    const threeDaysLater = new Date(now.getTime() + 3 * 86400000).toISOString();
    const { data: duePay } = await supabase
      .from('contract_payments')
      .select('id, type, amount, next_due, status')
      .eq('project_id', project_id)
      .neq('status', 'paid')
      .lte('next_due', threeDaysLater)
      .gte('next_due', now.toISOString().split('T')[0]);

    for (const p of duePay || []) {
      if (await eventExists('invoice_due', p.id)) continue;
      const typeLabel: Record<string, string> = {
        supervision: 'Авторский надзор',
        design: 'Дизайн-проект',
        supply_commission: 'Комиссия комплектации',
      };
      events.push({
        project_id,
        event_type: 'invoice_due',
        title: `Оплата: ${typeLabel[p.type] || p.type}`,
        description: `${p.amount?.toLocaleString('ru-RU')} ₽ · срок ${new Date(p.next_due).toLocaleDateString('ru-RU')}`,
        action_label: 'Напомнить заказчику',
        action_type: 'create_reminder',
        priority: 'urgent',
        related_id: p.id,
        related_type: 'contract_payment',
      });
    }

    // ────────────────────────────────────────────
    // 2. NO RESPONSE: messages awaiting reply > 48h
    // ────────────────────────────────────────────
    const twoDaysAgo = new Date(now.getTime() - 48 * 3600000).toISOString();
    const keywords = ['посмотрите', 'согласуйте', 'одобрите', 'варианты', 'подтвердите', 'выберите'];

    const { data: recentMsgs } = await supabase
      .from('chat_messages')
      .select('id, user_id, text, chat_type, created_at')
      .eq('project_id', project_id)
      .eq('chat_type', 'client')
      .order('created_at', { ascending: false })
      .limit(30);

    if (recentMsgs && recentMsgs.length > 0) {
      // Find the last message containing approval-related keywords
      for (const msg of recentMsgs) {
        const lower = (msg.text || '').toLowerCase();
        const hasKeyword = keywords.some(kw => lower.includes(kw));
        if (!hasKeyword) continue;
        if (new Date(msg.created_at) > new Date(twoDaysAgo)) continue; // Not old enough

        // Check if there's a reply after this message from a different user
        const { data: replies } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('project_id', project_id)
          .eq('chat_type', 'client')
          .neq('user_id', msg.user_id)
          .gt('created_at', msg.created_at)
          .limit(1);

        if (!replies || replies.length === 0) {
          if (await eventExists('no_response', msg.id)) continue;
          const preview = msg.text.length > 60 ? msg.text.substring(0, 57) + '...' : msg.text;
          events.push({
            project_id,
            event_type: 'no_response',
            title: 'Нет ответа > 48ч',
            description: `«${preview}»`,
            action_label: 'Написать в чат',
            action_type: 'open_chat',
            priority: 'important',
            related_id: msg.id,
            related_type: 'chat_message',
          });
          break; // One event per analysis
        }
      }
    }

    // ────────────────────────────────────────────
    // 3. STAGES: ending within 5 days without completed tasks
    // ────────────────────────────────────────────
    const fiveDaysLater = new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0];
    const { data: stages } = await supabase
      .from('stages')
      .select('id, name, end_date, status')
      .eq('project_id', project_id)
      .neq('status', 'done')
      .lte('end_date', fiveDaysLater)
      .gte('end_date', now.toISOString().split('T')[0]);

    for (const s of stages || []) {
      const { data: doneTasks } = await supabase
        .from('contractor_tasks')
        .select('id')
        .eq('project_id', project_id)
        .eq('status', 'done')
        .limit(1);

      // If no completed tasks, create event
      if (!doneTasks || doneTasks.length === 0) {
        if (await eventExists('stage_deadline', s.id)) continue;
        events.push({
          project_id,
          event_type: 'stage_deadline',
          title: `Этап: ${s.name}`,
          description: `Дедлайн ${new Date(s.end_date!).toLocaleDateString('ru-RU')} — задачи не завершены`,
          action_label: 'Создать задачу',
          action_type: 'create_task',
          priority: 'important',
          related_id: s.id,
          related_type: 'stage',
        });
      }
    }

    // ────────────────────────────────────────────
    // 4. CONTRACTORS: overdue tasks
    // ────────────────────────────────────────────
    const { data: overdue } = await supabase
      .from('contractor_tasks')
      .select('id, title, deadline, assigned_to')
      .eq('project_id', project_id)
      .neq('status', 'done')
      .lt('deadline', now.toISOString().split('T')[0]);

    for (const t of overdue || []) {
      if (await eventExists('contractor_overdue', t.id)) continue;
      events.push({
        project_id,
        event_type: 'contractor_overdue',
        title: `Просрочена: ${t.title}`,
        description: `Дедлайн был ${new Date(t.deadline!).toLocaleDateString('ru-RU')}`,
        action_label: 'Открыть задачу',
        action_type: 'open_section',
        priority: 'important',
        related_id: t.id,
        related_type: 'contractor_task',
      });
    }

    // ────────────────────────────────────────────
    // 5. VISITS: tomorrow's visits
    // ────────────────────────────────────────────
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const { data: tmrVisits } = await supabase
      .from('visits')
      .select('id, title, date')
      .eq('project_id', project_id)
      .eq('date', tomorrow);

    for (const v of tmrVisits || []) {
      if (await eventExists('visit_pending', v.id)) continue;
      events.push({
        project_id,
        event_type: 'visit_pending',
        title: `Визит завтра: ${v.title}`,
        description: `${new Date(v.date).toLocaleDateString('ru-RU')}`,
        action_label: 'Открыть визит',
        action_type: 'open_section',
        priority: 'normal',
        related_id: v.id,
        related_type: 'visit',
      });
    }

    // ────────────────────────────────────────────
    // Insert all new events
    // ────────────────────────────────────────────
    if (events.length > 0) {
      const { error: insertErr } = await supabase
        .from('assistant_events')
        .insert(events);

      if (insertErr) {
        console.error('Failed to insert events:', insertErr);
      }
    }

    console.log(`[analyze-project] ${project_id}: created ${events.length} events`);

    return new Response(
      JSON.stringify({ ok: true, created: events.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[analyze-project] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
