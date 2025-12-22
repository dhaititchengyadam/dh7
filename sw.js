self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
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

const DB_NAME = 'notificationsDB';
const STORE_NAME = 'messages';
const DB_VERSION = 1;

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e.target.error);
  });
}

async function getMessages(tfid) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(tfid);
    request.onsuccess = e => resolve(e.target.result || []);
    request.onerror = e => reject(e.target.error);
  });
}

async function addMessage(tfid, message) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const requestGet = store.get(tfid);
    requestGet.onsuccess = e => {
      const messages = e.target.result || [];
      messages.push(message);
      const requestPut = store.put(messages, tfid);
      requestPut.onsuccess = () => resolve();
      requestPut.onerror = err => reject(err.target.error);
    };
    requestGet.onerror = err => reject(err.target.error);
  });
}

async function clearMessages(tfid) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(tfid);
    request.onsuccess = () => resolve();
    request.onerror = e => reject(e.target.error);
  });
}

self.addEventListener('push', async function(event) {
  const data = event.data.json();
  const { title, tfid, body } = data; // Assume push payload: { title: 'Name', tfid: 'TFID', body: 'The message' }

  await addMessage(tfid, body);

  const messages = await getMessages(tfid);
  const notificationBody = messages.join('\n');

  const options = {
    body: notificationBody,
    icon: 'asset/IMG_7024.png',
    badge: 'asset/IMG_7024.png',
    vibrate: [200, 100, 200],
    tag: tfid,
    renotify: true,
    requireInteraction: true,
    data: { tfid },
    actions: [
      { action: 'reply', title: 'Reply', type: 'text' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', async function(event) {
  event.notification.close();

  const tfid = event.notification.data.tfid;

  if (event.action === 'reply') {
    const replyText = event.reply;
    if (replyText) {
      await fetch(`${self.registration.scope}api/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tfid, message: replyText })
      });
    }
  }

  await clearMessages(tfid);

  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    for (const client of clientList) {
      if (client.url.includes(tfid) && 'focus' in client) {
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(`/${tfid}`);
    }
  }));
});
