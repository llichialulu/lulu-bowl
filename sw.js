const CACHE_NAME = 'lulu-workspace-v12';
const ASSETS = [
  './',
  './index.html?v=12',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  // Delete ALL old caches first, then install
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('lulu-workspace')).map(k => caches.delete(k))
    )).then(() => 
      caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(()=>{}))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    // Delete any remaining old caches
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
  // Notify all clients to reload
  e.waitUntil(
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Network-first strategy: try network, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        // Cache successful responses for offline fallback
        if (resp && resp.status === 200) {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, respClone).catch(()=>{});
          });
        }
        return resp;
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(e.request).then(cached => {
          return cached || new Response('离线模式', { status: 200 });
        });
      })
  );
});
