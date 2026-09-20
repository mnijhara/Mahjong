const CACHE_NAME = 'mahjong-static-v14';
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
  './solitaire-a11y.js?v=20260920-3',
  './style-selector.js?v=20260830-7',
  './new-game.js?v=20260830-7',
  './american-ux.js?v=20260830-7',
  './american-tile-polish.js?v=20260905-1',
  './american-table-polish.js?v=20260905-1',
  './mahjong-codex.js',
  './sw-register.js',
  './manifest.webmanifest',
  './icons/mahjong-192.svg',
  './icons/mahjong-512.svg',
  './robots.txt',
  './404.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(error => {
      console.error('Mahjong app shell installation failed:', error);
      throw error;
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('mahjong-static-') && key !== CACHE_NAME).map(key => caches.delete(key))))
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
        if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())));
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && ['script', 'style', 'image', 'font'].includes(request.destination)) {
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())));
        }
        return response;
      });
    })
  );
});
