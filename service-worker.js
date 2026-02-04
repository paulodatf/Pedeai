const CACHE_NAME = 'pedeai-v1';
const FILES_TO_CACHE = [
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// Instala
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Ativa
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});