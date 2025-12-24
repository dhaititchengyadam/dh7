const CACHE_NAME = 'adamdh7-offline-v7';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Nou fòse yon vèsyon pwòp san okenn redireksyon
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
    // NOUVO: Nou kite navigatè a jere fetch la nòmalman anvan
    // Sa evite erè redireksyon Safari a
    e.respondWith(
      fetch(e.request).catch(() => {
        // SE SÈLMAN SI FETCH LA ECHWE (OFFLINE) NOU BAY KACH LA
        return caches.match(OFFLINE_URL);
      })
    );
  }
});

// Pou dezenstale si sa nesesè
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
