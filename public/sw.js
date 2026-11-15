/* sw.js — keeps the app opening when the connection is weak (server version only).
   Always tries the network first, so updates show up right away. */
const CACHE = 'alvee-english-v22';
const SHELL = ['./', 'index.html', 'styles.css', 'js/content.js', 'js/boot.js', 'js/core.js', 'js/art.js', 'js/engine.js', 'js/explain.js', 'js/treasure.js', 'js/scenes.js', 'js/learner.js', 'js/voyage.js', 'js/voyage-ui.js', 'js/notify.js', 'js/music.js', 'js/map3d.js', 'map.css', 'js/ptest-data.js', 'js/ptest.js', 'js/pt-prof1.js', 'js/pt-prof2.js', 'js/pt-prof3.js', 'js/pt-prof4.js', 'js/pt-compare.js', 'js/pt-views.js', 'vendor/three.min.js', 'js/idioms.js', 'js/bonus.js', 'js/storm.js', 'js/calendar.js', 'js/admin.js', 'js/sandbox.js', 'js/main.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'img/boats/hb.webp', 'img/boats/toy.webp'];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(
    (e.request.mode === 'navigate' ? fetch(e.request) : fetch(e.request, { cache: 'no-cache' }))
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('index.html')))
  );
});
