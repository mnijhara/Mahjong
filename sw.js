const CACHE_NAME = 'mahjong-static-v4';
const APP_SHELL = [
  './',
  './index.html',
  './404.html',
  './styles.css',
  './style-picker.css',
  './american.css?v=20260830-7',
  './american-ux.css?v=20260830-7',
  './american-live.css?v=20260830-5',
  './american-live-viewport.css?v=20260830-1',
  './american-tile-legibility.css?v=20260831-1',
  './american-game.js?v=20260830-7',
  './american-card-engine.js?v=20260830-7',
  './american-insights.js?v=20260830-7',
  './game.js?v=20260830-7',
  './solitaire-a11y.js?v=20260831-1',
  './solitaire-fit.js',
  './style-selector.js?v=20260830-7',
  './new-game.js?v=20260830-7',
  './american-ux.js?v=20260830-7',
  './skip-link-a11y.js',
  './sw-register.js',
  './manifest.webmanifest',
  './icons/mahjong-192.svg',
  './icons/mahjong-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(APP_SHELL.map(async asset => {
        try {
          const response = await fetch(asset, { cache: 'no-store' });
          if (response.ok) await cache.put(asset, response);
        } catch (_) {
          // Keep installation resilient if one optional shell asset is unavailable.
        }
      }));
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && ['style', 'script', 'image', 'font'].includes(request.destination)) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});
