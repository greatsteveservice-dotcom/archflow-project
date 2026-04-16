import { Resend } from 'resend';

/** Escape HTML special characters to prevent injection in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Lazy-init Resend client — constructor throws when RESEND_API_KEY is missing,
// so we defer instantiation to request time to keep `next build` happy in CI
// where this secret may not be set.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = 'Archflow <hello@archflow.ru>';

/**
 * Send welcome email after registration (NO passwords).
 */
export async function sendWelcomeEmail(
  to: string,
  fullName: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping welcome email');
    return;
  }

  const html = buildWelcomeHtml(fullName, to);

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Добро пожаловать в Archflow',
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

/**
 * Send invite email when designer invites someone to a project.
 */
export async function sendInviteEmail(
  to: string,
  projectName: string,
  inviteUrl: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping invite email');
    return;
  }

  // Security: only allow https:// URLs in invite emails
  if (!inviteUrl.startsWith('https://') && !inviteUrl.startsWith('http://')) {
    throw new Error('Invalid invite URL protocol');
  }

  const html = buildInviteHtml(projectName, inviteUrl);

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Вас пригласили в проект — ArchFlow',
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

function buildWelcomeHtml(name: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#111827;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Archflow</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:13px;">Architecture Workflow Platform</p>
    </div>
    <!-- Content -->
    <div style="padding:32px;">
      <p style="margin:0 0 20px;font-size:15px;color:#111827;">Привет, ${escapeHtml(name)}!</p>

      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
        Добро пожаловать в Archflow. Ваш аккаунт создан и готов к работе.
      </p>

      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
        Для входа используйте email <strong>${escapeHtml(email)}</strong> и пароль, который вы указали при регистрации.
      </p>

      <a href="https://archflow.ru" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:14px;font-weight:600;">
        Войти в Archflow &rarr;
      </a>

      <p style="margin:28px 0 0;font-size:14px;color:#374151;line-height:1.7;">
        Если что-то непонятно &mdash; пишите напрямую, мы на связи.
      </p>

      <p style="margin:24px 0 0;font-size:14px;color:#111827;">
        Евгений<br>
        <span style="color:#6b7280;">Archflow</span>
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">&copy; Archflow ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}

// ======================== REPORT EMAIL ========================

interface ReportEmailParams {
  projectName: string;
  visitDate: string;
  remarkCount: number;
  generalComment: string;
  contentHash: string;
  trackedUrl: string;
}

/**
 * Build HTML for a supervision report notification email.
 * Includes: project name, visit date, remark count, content hash, CTA link.
 */
export function buildReportEmailHtml(params: ReportEmailParams): string {
  const { projectName, visitDate, remarkCount, generalComment, contentHash, trackedUrl } = params;

  // Format date for display
  const dateStr = new Date(visitDate + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Truncate comment to 200 chars
  const shortComment = generalComment.length > 200
    ? generalComment.slice(0, 197) + '...'
    : generalComment;

  const remarkWord = remarkCount === 1 ? 'замечание'
    : remarkCount >= 2 && remarkCount <= 4 ? 'замечания'
    : 'замечаний';

  return `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#111827;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Archflow</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:13px;">Architecture Workflow Platform</p>
    </div>
    <!-- Content -->
    <div style="padding:32px;">
      <p style="margin:0 0 20px;font-size:15px;color:#111827;">
        Новый отчёт авторского надзора
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:0 0 24px;">
        <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Проект</p>
        <p style="margin:6px 0 0;font-size:16px;color:#111827;font-weight:600;">${escapeHtml(projectName)}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Дата визита</p>
        <p style="margin:4px 0 0;font-size:14px;color:#111827;">${escapeHtml(dateStr)}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Замечания</p>
        <p style="margin:4px 0 0;font-size:14px;color:#111827;">${remarkCount} ${remarkWord}</p>
      </div>

      ${shortComment ? `
      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
        ${escapeHtml(shortComment)}
      </p>` : ''}

      <a href="${encodeURI(trackedUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:14px;font-weight:600;">
        Посмотреть отчёт &rarr;
      </a>

      <!-- Content hash for legal evidence -->
      <div style="margin:28px 0 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
        <p style="margin:0 0 6px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">SHA-256 хеш содержимого</p>
        <p style="margin:0;font-size:11px;color:#111827;font-family:'Courier New',Courier,monospace;word-break:break-all;">${escapeHtml(contentHash)}</p>
      </div>
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">&copy; Archflow ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}

function buildInviteHtml(projectName: string, inviteUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#111827;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Archflow</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:13px;">Architecture Workflow Platform</p>
    </div>
    <!-- Content -->
    <div style="padding:32px;">
      <p style="margin:0 0 20px;font-size:15px;color:#111827;">
        Дизайнер открыл вам доступ к проекту.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:0 0 24px;">
        <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Проект</p>
        <p style="margin:6px 0 0;font-size:16px;color:#111827;font-weight:600;">${escapeHtml(projectName)}</p>
      </div>

      <a href="${encodeURI(inviteUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:14px;font-weight:600;">
        Открыть проект &rarr;
      </a>

      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Если вы ещё не зарегистрированы, создайте аккаунт по ссылке выше.
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">&copy; Archflow ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}
