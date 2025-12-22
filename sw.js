self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {title: "D'H7", body: "Ou gen yon nouvo mesaj"};
  const options = {
    body: data.body,
    icon: '/asset/IMG_7023.png',
    badge: '/asset/IMG_7023.png',
    vibrate: [200, 100, 200],
    data: { url: 'https://www.adamdh7.org' }
  };
  event.waitUntil(self.registration.showNotification(data.title || "Nouvo mesaj", options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
