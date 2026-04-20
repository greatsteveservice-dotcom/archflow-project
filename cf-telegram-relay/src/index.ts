/**
 * Cloudflare Worker: Telegram webhook relay for ArchFlow bots.
 *
 * Routes:
 *   POST /<SECRET>          → https://archflow.ru/api/telegram/bot  (voice bot, backward compat)
 *   POST /voice/<SECRET>    → https://archflow.ru/api/telegram/bot  (voice bot)
 *   POST /support/<SECRET>  → https://archflow.ru/api/telegram      (support bot)
 *
 * The secret token in the URL path prevents unauthorized access.
 */

interface Env {
  RELAY_SECRET: string;
}

const ROUTES: Record<string, string> = {
  voice: 'https://archflow.ru/api/telegram/bot',
  support: 'https://archflow.ru/api/telegram',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Health check
    if (request.method === 'GET') {
      return new Response('ok', { status: 200 });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse path: /<secret> or /<channel>/<secret>
    const url = new URL(request.url);
    const parts = url.pathname.slice(1).split('/'); // strip leading /

    let channel: string;
    let token: string;

    if (parts.length === 2) {
      // /voice/<secret> or /support/<secret>
      channel = parts[0];
      token = parts[1];
    } else {
      // /<secret> — backward compat → voice
      channel = 'voice';
      token = parts[0];
    }

    if (token !== env.RELAY_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }

    const target = ROUTES[channel];
    if (!target) {
      return new Response('Not found', { status: 404 });
    }

    // Forward to VPS
    try {
      const body = await request.text();
      const res = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Relay error:', err);
      // Return 200 to Telegram so it doesn't retry endlessly
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
