const cacheName = 'virtualctl';
const staticAssets = [
  './',
  './index.0641b553.js',
  './index.0641b553.js.map',
  './index.2cdaf7bc.css',
  './index.2cdaf7bc.css.map',
  './index.5aba306b.js',
  './index.5aba306b.js.map',
  './index.bb1568c1.js',
  './index.bb1568c1.js.map',
  './index.e121266c.js',
  './index.e121266c.js.map',
  './index.e8e5a470.css',
  './index.e8e5a470.css.map',
  './index.html',
];

self.addEventListener('install', async e => {
  const cache = await caches.open(cacheName);
  await cache.addAll(staticAssets);
  return self.skipWaiting();
});

self.addEventListener('activate', e => {
  self.clients.claim();
});

self.addEventListener('fetch', async e => {
  const req = e.request;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith(cacheFirst(req));
  } else {
    e.respondWith(networkAndCache(req));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  return cached || fetch(req);
}

async function networkAndCache(req) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    await cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    return cached;
  }
}
