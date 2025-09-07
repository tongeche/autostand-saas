// --- Service Worker for Web Push ---

// Show incoming push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // if payload isn't JSON, fall back to text
    data = { title: 'Notification', body: event.data && event.data.text ? event.data.text() : '' };
  }

  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    // note: these paths are optional; remove if you don't have these assets
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    // pass-through data for click handling (e.g., deep link)
    data: data.data || {},
    actions: Array.isArray(data.actions) ? data.actions : [],
    // keep UX snappy; the default is false
    requireInteraction: !!data.requireInteraction
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle clicks on notifications (focus an open tab or open a new one)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil((async () => {
    // Try to focus an existing client at the same origin
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        const url = new URL(client.url);
        if (url.pathname === targetUrl || targetUrl === '/') {
          await client.focus();
          return;
        }
      } catch {}
    }
    // Otherwise open a new window/tab
    await clients.openWindow(targetUrl);
  })());
});

// (Optional) Ensure updated SW takes control ASAP after install
self.addEventListener('install', () => {
  self.skipWaiting?.();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
