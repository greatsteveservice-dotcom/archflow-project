// Archflow Service Worker — offline caching
// Bump version to invalidate all caches on deploy
const SW_VERSION = '1775827871722';
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

// Install — precache static assets, then immediately skip waiting
// so the new SW takes over from any stale old SW without requiring
// the user to close all tabs or click an update button.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {}) // don't block install if precache fails
      .then(() => self.skipWaiting())
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

  // Skip cross-origin requests except for fonts and Supabase storage
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isStorage = url.hostname.includes('supabase') && url.pathname.includes('/storage/');
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin && !isFont && !isStorage) return;

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

  // Supabase storage (photos, avatars) — Cache first
  if (isStorage) {
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
    return new Response('Offline', { status: 503, statusText: 'Offline' });
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

    // For HTML requests, show offline page
    if (request.headers.get('accept')?.includes('text/html')) {
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }

    return new Response('Offline', { status: 503, statusText: 'Offline' });
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
