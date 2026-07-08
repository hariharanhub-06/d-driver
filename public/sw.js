/* Onlive service worker — minimal, safe app-shell cache.
   Deliberately conservative: it NEVER caches API or auth traffic, only
   same-origin static assets and a navigation fallback. */
const CACHE = 'ddriver-shell-v4';
const SHELL = ['/', '/offline.html', '/icons/icon.svg', '/manifest.webmanifest'];

// ── Web Push: show OS-level notifications (SOS + alerts) even when the app is closed ──
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Onlive', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Onlive';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/' },
    vibrate: [200, 100, 200],
    // Tagged alerts (e.g. SOS) replace the previous one instead of stacking.
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    requireInteraction: payload.tag === 'sos',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Focus an existing tab (or open one) when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

// Let the page trigger an immediate activation of a freshly-installed worker.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never touch cross-origin, API, auth, socket, or map-tile traffic.
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/')
  ) {
    return;
  }

  // Navigations: network-first, fall back to cached shell / offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((r) => r || caches.match('/offline.html'))
      )
    );
    return;
  }

  // Static assets: cache-first, then network (and populate cache).
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          }).catch(() => cached)
      )
    );
  }
});
