// sw.js - Service Worker per Mangje! PWA
const CACHE_NAME = 'mangje-v7';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/db.js',
  './js/model.js',
  './js/advisor.js',
  './js/openfoodfacts.js',
  './js/app.js',
  './js/views_common.js',
  './js/view_dashboard.js',
  './js/view_addfood.js',
  './js/view_foodform.js',
  './js/view_composites.js',
  './js/view_profiles.js',
  './js/view_others.js',
  './js/actions.js',
  './favicon.ico',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.10.0/dist/tabler-icons.min.css'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Open Food Facts: rete prima (serve connessione), fallback su cache se disponibile
  if (url.hostname.includes('openfoodfacts.org')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Tutto il resto: cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return response;
    }))
  );
});
