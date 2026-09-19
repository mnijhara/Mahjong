const CACHE_NAME = 'mahjong-static-v7';
const APP_SHELL = [
  './',
  './index.html',
  './404.html',
  './styles.css',
  './style-picker.css',
  './tile-studio.css',
  './chinese-table.css',
  './american.css?v=20260830-7',
  './american-ux.css?v=20260830-7',
  './american-live.css?v=20260830-5',
  './american-live-viewport.css?v=20260830-1',
  './american-tile-legibility.css?v=20260831-1',
  './american-tile-polish.css?v=20260905-1',
  './american-table-polish.css?v=20260905-1',
  './american-charleston-immersive.css',
  './mahjong-codex.css',
  './solitaire-layouts.css',
  './mahjong-daily.css',
  './mahjong-stats.css',
  './mahjong-audio.js',
  './tile-studio.js',
  './chinese-game.js',
  './american-game.js?v=20260830-7',
  './american-card-engine.js?v=20260830-7',
  './american-insights.js?v=20260830-7',
  './solitaire-layouts.js',
  './mahjong-daily.js',
  './mahjong-stats.js',
  './game.js?v=20260830-7',
  './solitaire-a11y.js?v=20260831-1',
  './style-selector.js?v=20260830-7',
  './new-game.js?v=20260830-7',
  './american-ux.js?v=20260830-7',
  './american-tile-polish.js?v=20260905-1',
  './american-table-polish.js?v=20260905-1',
  './mahjong-codex.js',
  './sw-register.js',
  './manifest.webmanifest',
  './icons/mahjong-192.svg',
  './icons/mahjong-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const failures = [];
      await Promise.all(APP_SHELL.map(async asset => {
        try {
          const response = await fetch(asset, { cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          await cache.put(asset, response);
        } catch (error) {
          failures.push(`${asset}: ${error.message}`);
        }
      }));
      if (failures.length) {
        await caches.delete(CACHE_NAME);
        throw new Error(`App shell installation incomplete: ${failures.join('; ')}`);
      }
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
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy))
          );
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
        event.waitUntil(
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
        );
      }
      return response;
    }))
  );
});
