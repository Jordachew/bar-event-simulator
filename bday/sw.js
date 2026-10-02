// Nichole's birthday road trip: offline shell + web push
const CACHE = 'bday-shell-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // data and photos always go to the network
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./')))
  );
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'Birthday road trip', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(d.title || 'Birthday road trip', {
      body: d.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.tag || 'bday',
      renotify: true,
      data: { url: d.url || './' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
          c.postMessage({ type: 'goto', url: target });
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
