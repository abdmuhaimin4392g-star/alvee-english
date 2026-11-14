/* sw.js — keeps the app opening when the connection is weak (server version only).
   Always tries the network first, so updates show up right away. */
const CACHE = 'alvee-english-v3';
const SHELL = ['./', 'index.html', 'styles.css', 'js/content.js', 'js/boot.js', 'js/core.js', 'js/art.js', 'js/engine.js', 'js/explain.js', 'js/learner.js', 'js/admin.js', 'js/main.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png'];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('index.html')))
  );
});
