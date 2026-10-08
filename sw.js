// Offline support: try the network first (so updates arrive), fall back to the cached copy
// when there is no reception or the network is slow.
const CACHE = 'setou-v20.42';
const SHELL = ['./', 'index.html', 'styles.css', 'i18n.js', 'app.js', 'icons.js', 'cloud.js', 'config.js', 'vendor/firebase.js', 'manifest.webmanifest',
  'icons/setou-gold-180.png', 'icons/setou-gold-192.png', 'icons/setou-gold-512.png',
  'fonts/heebo-hebrew.woff2', 'fonts/heebo-latin.woff2', 'fonts/barlow-condensed-800i.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    // no-cache: always ask the server (cheap ETag check) instead of trusting the browser's 10-minute HTTP cache
    const network = fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    });
    if (!cached) return network;
    const slow = new Promise(resolve => setTimeout(() => resolve(cached), 2500));
    return Promise.race([network.catch(() => cached), slow]);
  }));
});
