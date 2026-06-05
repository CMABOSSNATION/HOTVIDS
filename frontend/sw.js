// HOTVID Service Worker - Push Notifications
// File location: /frontend/sw.js

const CACHE_NAME = 'hotvid-v1';

// Install
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data.json();
  } catch (_) {
    data = { title: 'HOTVID', body: e.data?.text() || 'New notification' };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: false,
    silent: false
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'HOTVID 🔥', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if (e.action === 'dismiss') return;

  const url = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
