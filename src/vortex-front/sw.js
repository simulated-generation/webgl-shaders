self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  self.clients.claim();
});

/* No caching yet — streaming friendly */
self.addEventListener('fetch', e => {});

