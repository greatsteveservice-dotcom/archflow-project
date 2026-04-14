import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/api-auth';

// ============================================================
// GET /api/projects/[projectId]/evidence-export
// ============================================================
// Generates a print-optimized HTML document with the full
// evidence chain for all reports in a project.
// Open in browser → Ctrl+P → Save as PDF.
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STATUS_LABELS: Record<string, string> = {
  sending: 'Отправка',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  bounced: 'Ошибка доставки',
  opened: 'Просмотрено',
  confirmed: 'Подтверждено заказчиком',
  auto_accepted: 'Авто-принято (3 дня)',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const { projectId } = params;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is designer/owner
    const { data: membership } = await supabaseAdmin
      .from('project_members')
      .select('role, access_level')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || (membership.role !== 'designer' && membership.access_level !== 'full')) {
      return NextResponse.json({ error: 'Only designers can export evidence' }, { status: 403 });
    }

    // Load project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('title, address, owner_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Load designer profile
    const { data: designer } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', project.owner_id)
      .single();

    // Load all published reports with remarks
    const { data: reports } = await supabaseAdmin
      .from('visit_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'published')
      .order('visit_date', { ascending: true });

    if (!reports || reports.length === 0) {
      return new NextResponse(
        '<html><body><p>No published reports found</p></body></html>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    }

    // Load all email sends and events for this project
    const { data: allSends } = await supabaseAdmin
      .from('email_sends')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    const sendIds = (allSends || []).map(s => s.id);
    let allEvents: Record<string, unknown>[] = [];
    if (sendIds.length > 0) {
      const { data: events } = await supabaseAdmin
        .from('email_events')
        .select('*')
        .in('email_send_id', sendIds)
        .order('created_at', { ascending: true });
      allEvents = events || [];
    }

    // Load all remarks for these reports
    const reportIds = reports.map(r => r.id);
    const { data: allRemarks } = await supabaseAdmin
      .from('visit_remarks')
      .select('*')
      .in('report_id', reportIds)
      .order('number', { ascending: true });

    // Group by report
    const remarksByReport = new Map<string, typeof allRemarks>();
    (allRemarks || []).forEach(r => {
      const list = remarksByReport.get(r.report_id) || [];
      list.push(r);
      remarksByReport.set(r.report_id, list);
    });

    const sendsByReport = new Map<string, typeof allSends>();
    (allSends || []).forEach(s => {
      const list = sendsByReport.get(s.report_id) || [];
      list.push(s);
      sendsByReport.set(s.report_id, list);
    });

    // Build HTML
    const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Доказательный пакет — ${escapeHtml(project.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #111; line-height: 1.6; padding: 40px; }
    h1 { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
    h2 { font-size: 14px; font-weight: bold; margin: 24px 0 8px; border-bottom: 1px solid #111; padding-bottom: 4px; }
    h3 { font-size: 12px; font-weight: bold; margin: 16px 0 4px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; vertical-align: top; font-size: 10px; }
    th { background: #f0f0f0; font-weight: bold; }
    .hash { font-family: 'Courier New', monospace; font-size: 9px; word-break: break-all; }
    .page-break { page-break-before: always; }
    .cover { text-align: center; padding: 120px 0 60px; }
    .cover h1 { font-size: 24px; margin-bottom: 16px; }
    .legal { margin-top: 32px; padding: 16px; border: 1px solid #ccc; font-size: 10px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

<!-- Cover -->
<div class="cover">
  <h1>ДОКАЗАТЕЛЬНЫЙ ПАКЕТ</h1>
  <p>Авторский надзор — email-доставка отчётов</p>
  <br><br>
  <table style="width:auto; margin:0 auto; border:none;">
    <tr><td style="border:none; text-align:right; padding-right:16px;"><b>Проект:</b></td><td style="border:none;">${escapeHtml(project.title)}</td></tr>
    ${project.address ? `<tr><td style="border:none; text-align:right; padding-right:16px;"><b>Адрес:</b></td><td style="border:none;">${escapeHtml(project.address)}</td></tr>` : ''}
    <tr><td style="border:none; text-align:right; padding-right:16px;"><b>Дизайнер:</b></td><td style="border:none;">${escapeHtml(designer?.full_name || '')} (${escapeHtml(designer?.email || '')})</td></tr>
    <tr><td style="border:none; text-align:right; padding-right:16px;"><b>Период:</b></td><td style="border:none;">${formatDate(reports[0].visit_date + 'T00:00:00')} — ${formatDate(reports[reports.length - 1].visit_date + 'T00:00:00')}</td></tr>
    <tr><td style="border:none; text-align:right; padding-right:16px;"><b>Отчётов:</b></td><td style="border:none;">${reports.length}</td></tr>
    <tr><td style="border:none; text-align:right; padding-right:16px;"><b>Дата формирования:</b></td><td style="border:none;">${now}</td></tr>
  </table>
</div>

<!-- Reports chronology -->
<div class="page-break"></div>
<h2>1. Хронология отчётов</h2>
<table>
  <tr><th>#</th><th>Дата визита</th><th>Замечания</th><th>SHA-256 хеш</th></tr>`;

    reports.forEach((report, i) => {
      const remarks = remarksByReport.get(report.id) || [];
      html += `
  <tr>
    <td>${i + 1}</td>
    <td>${formatDate(report.visit_date + 'T00:00:00')}</td>
    <td>${remarks.length}</td>
    <td class="hash">${escapeHtml(report.content_hash || 'не вычислен')}</td>
  </tr>`;
    });

    html += `
</table>

<!-- Per-report delivery details -->
<h2>2. Доставка по каждому отчёту</h2>`;

    reports.forEach((report, i) => {
      const sends = sendsByReport.get(report.id) || [];
      html += `
<h3>Отчёт ${i + 1}: ${formatDate(report.visit_date + 'T00:00:00')}</h3>`;

      if (sends.length === 0) {
        html += `<p>Не отправлялся по email.</p>`;
      } else {
        html += `
<table>
  <tr><th>Получатель</th><th>Resend ID</th><th>Статус</th><th>Отправлено</th><th>Доставлено</th><th>Просмотрено</th><th>Подтверждено</th></tr>`;
        sends.forEach(send => {
          html += `
  <tr>
    <td>${escapeHtml(send.recipient_email)}</td>
    <td style="font-size:8px;">${escapeHtml(send.resend_email_id || '—')}</td>
    <td>${STATUS_LABELS[send.status] || send.status}</td>
    <td>${send.sent_at ? formatDateTime(send.sent_at) : '—'}</td>
    <td>${send.delivered_at ? formatDateTime(send.delivered_at) : '—'}</td>
    <td>${send.opened_at ? formatDateTime(send.opened_at) : '—'}</td>
    <td>${send.confirmed_at ? formatDateTime(send.confirmed_at) : (send.auto_accepted_at ? formatDateTime(send.auto_accepted_at) + ' (авто)' : '—')}</td>
  </tr>`;
        });
        html += `</table>`;
      }
    });

    // Full event log
    html += `
<div class="page-break"></div>
<h2>3. Полный лог SMTP-событий</h2>
<table>
  <tr><th>Время</th><th>Тип события</th><th>Resend ID</th><th>IP</th></tr>`;

    allEvents.forEach((evt: Record<string, unknown>) => {
      html += `
  <tr>
    <td>${formatDateTime(evt.created_at as string)}</td>
    <td>${escapeHtml(evt.event_type as string)}</td>
    <td style="font-size:8px;">${escapeHtml((evt.resend_email_id as string) || '—')}</td>
    <td>${escapeHtml((evt.ip_address as string) || '—')}</td>
  </tr>`;
    });

    html += `
</table>

<!-- Legal note -->
<div class="legal">
  <h3>Правовая справка</h3>
  <p>Настоящий документ содержит доказательства надлежащего уведомления заказчика о результатах авторского надзора в соответствии с:</p>
  <ul style="margin: 8px 0 0 20px;">
    <li>ГПК РФ ст. 55 — доказательства</li>
    <li>ГПК РФ ст. 71 — письменные доказательства</li>
    <li>Федеральный закон от 27.07.2006 N 149-ФЗ — об информации</li>
  </ul>
  <p style="margin-top: 8px;">SHA-256 хеши подтверждают неизменность содержимого отчётов с момента отправки. SMTP-события получены через веб-хуки почтового сервиса Resend и сохранены в неизменяемом audit log.</p>
</div>

</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[EvidenceExport] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
