const CACHE = 'tickit-v3';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/js/config.js',
  '/js/storage.js',
  '/js/themes.js',
  '/js/audio.js',
  '/js/ai.js',
  '/js/ui.js',
  '/js/game-local.js',
  '/js/game-ai.js',
  '/js/game-online.js',
  '/js/app.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache Socket.IO or API calls
  if (url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/api')) return;

  // Network-first for navigation
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for static assets (local/AI offline support)
  if (OFFLINE_ASSETS.some(a => url.pathname.endsWith(a.replace(/^\//, ''))) ||
      url.pathname.startsWith('/js/')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      }))
    );
  }
});
