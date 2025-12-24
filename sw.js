const CACHE_NAME = 'adamdh7-offline-v5';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.redirected) {
            return response;
          }
          return response;
        })
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
  }
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'UNREGISTER_SW') {
    (async () => {
      const reg = await self.registration.unregister();
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const c of clients) {
        c.postMessage({ type: 'SW_UNREGISTERED', ok: !!reg });
      }
    })();
  }
});
