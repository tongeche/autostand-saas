// --- Service Worker for Web Push ---

// Show incoming push notifications
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch {}
  const title = payload.title || 'Notification';
  const options = {
    body: payload.body || '',
    data: payload.data || {},
    actions: payload.actions || [],
    requireInteraction: !!payload.requireInteraction,
    icon: '/icon-192.png',
    badge: '/badge.png',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle clicks on notifications (focus an open tab or open a new one)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification?.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        const u = new URL(client.url);
        if (u.pathname === url && 'focus' in client) return client.focus();
      } catch {}
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});

// (Optional) Ensure updated SW takes control ASAP after install
self.addEventListener('install', () => {
  self.skipWaiting?.();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
