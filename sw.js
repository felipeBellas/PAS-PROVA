/* PAS-PROVA - Service Worker: atualização segura, sem cache de páginas privadas. */
const CACHE_NAME = 'pas-prova-public-v2';
const PUBLIC_FILES = ['./', './index.html', './manifest.json'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PUBLIC_FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const publicPaths = PUBLIC_FILES.map(path => new URL(path, self.registration.scope).pathname);
  if (!publicPaths.includes(url.pathname)) return;
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
