// HOTVID Service Worker - Push Notifications + PWA Install Support
// File location: /frontend/sw.js

const CACHE_NAME = 'hotvid-v2';
const OFFLINE_URLS = ['/index.html'];

// Install
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
});

// Activate
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
    ])
  );
});

// Fetch - network first, fallback to cache (only for navigation requests)
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
  }
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
