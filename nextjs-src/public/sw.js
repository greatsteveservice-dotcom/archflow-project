// Archflow Service Worker — offline caching
// Bump version to invalidate all caches on deploy
const SW_VERSION = '1776676145411';
const CACHE_NAME = 'archflow-v' + SW_VERSION;
const STATIC_CACHE = 'archflow-static-v' + SW_VERSION;
const API_CACHE = 'archflow-api-v' + SW_VERSION;

// Static assets to precache
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
];

// Inline HTML fallback — used when /offline.html is not in cache
// (e.g. precache failed at install time because the origin was unreachable).
// Keep this in sync with /offline.html styling.
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Archflow — Нет подключения</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:'IBM Plex Mono',ui-monospace,monospace;background:#F6F6F4;color:#111;padding:24px;}
  .c{max-width:420px;text-align:center;}
  h1{font-family:'Playfair Display',Georgia,serif;font-size:28px;margin:0 0 12px;font-weight:900;}
  p{font-size:11px;letter-spacing:.12em;text-transform:uppercase;line-height:1.6;margin:0 0 8px;color:#111;}
  .hint{font-size:10px;letter-spacing:.08em;text-transform:none;opacity:.6;margin:20px 0 28px;line-height:1.6;}
  button{font-family:inherit;font-size:10px;text-transform:uppercase;letter-spacing:.15em;
    padding:14px 28px;background:#111;color:#fff;border:0.5px solid #111;cursor:pointer;margin:4px;}
  button.ghost{background:none;color:#111;}
  button:hover{background:#fff;color:#111;}
</style></head>
<body><div class="c">
  <h1>Нет связи с сервером</h1>
  <p>Archflow временно недоступен</p>
  <div class="hint">Проверьте подключение к интернету.<br/>Если сайт не открывается — попробуйте VPN или мобильный интернет, возможно ваш провайдер блокирует доступ.</div>
  <button onclick="location.reload()">Обновить</button>
  <button class="ghost" onclick="location.href='/reset'">Сбросить кэш</button>
</div></body></html>`;

// Install — precache each URL individually (best-effort) so a single
// bad URL doesn't break the whole install. Previously cache.addAll was
// all-or-nothing, and if ANY asset failed the offline fallback page
// never got cached, leaving users with raw "Offline" text on failures.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async (cache) => {
        await Promise.all(
          PRECACHE_URLS.map((u) =>
            cache.add(u).catch((err) => {
              // Best-effort: log and continue so the rest still caches.
              console.warn('[SW] precache failed for', u, err);
            })
          )
        );
      })
      .catch(() => {}) // never block install
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase realtime WebSocket connections
  if (url.pathname.includes('/realtime/')) return;

  // Bypass SW entirely for invite links — these must always be fresh
  // and never be served from any cache. Stale SW caches were causing
  // white-screen issues for invited users.
  if (url.pathname.startsWith('/invite/')) return;

  // Bypass SW entirely for the reset page — it's the recovery tool
  // for users stuck on a broken cache and must never be intercepted.
  if (url.pathname === '/reset' || url.pathname === '/reset.html') return;

  // Bypass SW entirely for Supabase Storage (photos, PDFs, avatars).
  // The browser already caches them by HTTP headers. SW caching here
  // caused broken images when a transient fetch error got persisted.
  if (url.hostname.includes('supabase') && url.pathname.includes('/storage/')) return;

  // Skip cross-origin requests except for fonts
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin && !isFont) return;

  // Supabase API calls (rest/v1) — Network first, fallback to cache
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets (JS, CSS, images, fonts) — Cache first
  if (isStaticAsset(url.pathname) || isFont) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages — Network first with offline fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // Everything else — Network first
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// Build an HTML Response from the offline fallback. Tries cached
// /offline.html first, then falls back to inline OFFLINE_HTML.
async function offlineResponse() {
  const offline = await caches.match('/offline.html');
  if (offline) return offline;
  return new Response(OFFLINE_HTML, {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// Check if a request is for an HTML document
function isHtmlRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (isHtmlRequest(request)) return offlineResponse();
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For HTML requests, always show offline page (cached or inline)
    if (isHtmlRequest(request)) return offlineResponse();

    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)(\?.*)?$/.test(pathname) ||
    pathname.startsWith('/_next/static/');
}

// ======================== PUSH NOTIFICATIONS ========================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Archflow', body: event.data.text() };
  }

  const { title, body, icon, badge, data } = payload;

  event.waitUntil(
    self.registration.showNotification(title || 'Archflow', {
      body: body || '',
      icon: icon || '/icon-192.png',
      badge: badge || '/icon-192.png',
      data: data || {},
      tag: data?.projectId ? `chat-${data.projectId}` : 'archflow',
      renotify: true,
    })
  );
});

// Skip waiting when told by the client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Click on notification — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const projectId = event.notification.data?.projectId;
  const targetUrl = projectId ? `/?project=${projectId}&tab=chat` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if found
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (projectId) {
            client.postMessage({ type: 'NAVIGATE_CHAT', projectId });
          }
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
