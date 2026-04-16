import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/api-auth';
import { computeReportHash, generateTrackingToken } from '../../../../lib/evidence';
import { buildReportEmailHtml } from '../../../../lib/mailer';
import { Resend } from 'resend';

// ============================================================
// POST /api/reports/[reportId]/send
// ============================================================
// Sends a published report to all project clients via email.
// Computes content hash, creates email_sends records, sends
// via Resend with tracked links.
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://archflow.ru';

// Lazy-init: Resend throws when RESEND_API_KEY is missing, so defer to request
// time to avoid breaking `next build` in CI without runtime secrets.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM_EMAIL = 'Archflow <hello@archflow.ru>';

// Simple in-memory rate limit: 10 sends per user per hour
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_SENDS_PER_HOUR = 10;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 3600_000 });
    return false;
  }
  entry.count++;
  return entry.count > MAX_SENDS_PER_HOUR;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { reportId: string } },
) {
  try {
    // Auth check
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }

    // Rate limit
    if (isRateLimited(userId)) {
      return NextResponse.json({ error: 'Too many sends, try later' }, { status: 429 });
    }

    const { reportId } = params;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Load report with remarks
    const { data: report, error: reportErr } = await supabaseAdmin
      .from('visit_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.status !== 'published') {
      return NextResponse.json({ error: 'Report must be published first' }, { status: 400 });
    }

    // Verify sender is a team member
    const { data: senderMembership } = await supabaseAdmin
      .from('project_members')
      .select('role, access_level')
      .eq('project_id', report.project_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!senderMembership) {
      return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
    }

    const canSend = senderMembership.role === 'designer'
      || (senderMembership.role === 'assistant' && senderMembership.access_level === 'full');
    if (!canSend) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // 2. Load remarks
    const { data: remarks } = await supabaseAdmin
      .from('visit_remarks')
      .select('number, text, status, deadline')
      .eq('report_id', reportId)
      .order('number', { ascending: true });

    // 3. Compute content hash
    const contentHash = computeReportHash({
      visit_date: report.visit_date,
      general_comment: report.general_comment,
      remarks: (remarks || []).map((r) => ({
        number: r.number,
        text: r.text,
        status: r.status,
        deadline: r.deadline,
      })),
    });

    // Save hash to report
    await supabaseAdmin
      .from('visit_reports')
      .update({ content_hash: contentHash, hash_computed_at: new Date().toISOString() })
      .eq('id', reportId);

    // 4. Find project + all client members with emails
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('title')
      .eq('id', report.project_id)
      .single();

    const { data: clientMembers } = await supabaseAdmin
      .from('project_members')
      .select('user_id, role, member_role')
      .eq('project_id', report.project_id)
      .eq('status', 'active');

    const clientUserIds = (clientMembers || [])
      .filter((m) => m.member_role === 'client' || m.role === 'client')
      .map((m) => m.user_id);

    if (clientUserIds.length === 0) {
      return NextResponse.json({ error: 'No clients in project', sent: 0 }, { status: 400 });
    }

    // Get client profiles with emails
    const { data: clientProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', clientUserIds);

    const recipients = (clientProfiles || []).filter((p) => p.email);
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No clients with email', sent: 0 }, { status: 400 });
    }

    // 5. Send emails
    const projectTitle = project?.title || 'Проект';
    const remarkCount = remarks?.length || 0;
    const results: { email: string; success: boolean; resendId?: string }[] = [];

    for (const recipient of recipients) {
      const trackingToken = generateTrackingToken(reportId, recipient.email);
      const trackedUrl = `${BASE_URL}/api/r/${trackingToken}`;

      const html = buildReportEmailHtml({
        projectName: projectTitle,
        visitDate: report.visit_date,
        remarkCount,
        generalComment: report.general_comment || '',
        contentHash,
        trackedUrl,
      });

      try {
        const { data: resendData, error: resendErr } = await getResend().emails.send({
          from: FROM_EMAIL,
          to: recipient.email,
          subject: `Отчёт авторского надзора — ${projectTitle}`,
          html,
          headers: {
            'X-Report-Id': reportId,
            'X-Report-Hash': contentHash,
          },
        });

        const resendEmailId = resendData?.id || null;

        // Create email_sends record
        await supabaseAdmin.from('email_sends').insert({
          project_id: report.project_id,
          report_id: reportId,
          resend_email_id: resendEmailId,
          recipient_email: recipient.email,
          recipient_user_id: recipient.id,
          status: resendEmailId ? 'sent' : 'sending',
          content_hash: contentHash,
          tracking_token: trackingToken,
          sent_at: resendEmailId ? new Date().toISOString() : null,
        });

        results.push({ email: recipient.email, success: !resendErr, resendId: resendEmailId || undefined });
      } catch (err) {
        console.error(`[ReportSend] Failed for ${recipient.email}:`, err);
        results.push({ email: recipient.email, success: false });
      }
    }

    const sent = results.filter((r) => r.success).length;
    return NextResponse.json({ ok: true, sent, total: recipients.length, contentHash });
  } catch (err) {
    console.error('[ReportSend] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
