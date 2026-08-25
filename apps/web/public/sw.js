// Minimal Web Push service worker. Shows whatever payload the server sends
// (apps/api/src/services/pushService.js) as a system notification, and
// focuses/opens the app on click. No caching/offline logic — this app
// isn't an installable PWA, this file exists solely for the Push API,
// which requires an active service worker registration to deliver to.

self.addEventListener('push', (event) => {
  let data = { title: 'Organisation Task Manager', body: 'You have a new notification.' };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((client) => client.url.includes(targetUrl));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});
