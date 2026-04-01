// This service worker intentionally does nothing.
// It replaces the old PWA service worker to clear cached content.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll()).then((clients) => {
        clients.forEach((c) => c.navigate(c.url));
      })
  );
});
