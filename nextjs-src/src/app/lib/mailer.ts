import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Archflow <hello@archflow.ru>';

/**
 * Send welcome email after registration with login credentials.
 * Uses Resend API for transactional email delivery.
 */
export async function sendWelcomeEmail(
  to: string,
  fullName: string,
  password: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping welcome email');
    return;
  }

  const html = buildWelcomeHtml(fullName, to, password);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Добро пожаловать в Archflow \u{1F44B}',
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

function buildWelcomeHtml(name: string, email: string, password: string): string {
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
      <p style="margin:0 0 20px;font-size:15px;color:#111827;">Привет!</p>

      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
        Ты один из первых, кто зашёл&nbsp;&mdash; и это не просто красивые слова.
        Мы строим Archflow вместе с такими людьми, как ты, и очень ценим,
        что ты здесь с самого начала.
      </p>

      <p style="margin:0 0 12px;font-size:14px;color:#374151;">Вот твои данные для входа:</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#374151;">\u{1F510} Логин:</td>
            <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${email}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#374151;">\u{1F511} Пароль:</td>
            <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;font-family:monospace;">${password}</td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
        Заходи, смотри, ломай&nbsp;&mdash; нам важно знать, что работает, а что нет.
        Если что-то непонятно или бесит&nbsp;&mdash; пиши напрямую, читаем всё сами.
      </p>

      <a href="https://archflow.ru" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:14px;font-weight:600;">
        Войти в Archflow &rarr;
      </a>

      <p style="margin:28px 0 0;font-size:14px;color:#374151;line-height:1.7;">
        И да: как ранний пользователь ты навсегда остаёшься на лучших условиях,
        которые у нас есть. Это обещание, не маркетинг.
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
