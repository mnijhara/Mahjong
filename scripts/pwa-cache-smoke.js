const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = 'http://127.0.0.1:4173/index.html';
const SERVICE_WORKER_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const SERVICE_WORKER_CACHE = SERVICE_WORKER_SOURCE.match(/const CACHE_NAME = ['"]([^'"]+)['"]/)?.[1];
if (!SERVICE_WORKER_CACHE) throw new Error('Unable to determine service-worker cache name from sw.js');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      if (!navigator.serviceWorker) throw new Error('service workers are unavailable');
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(expectedCache => caches.has(expectedCache), SERVICE_WORKER_CACHE);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      if (!navigator.serviceWorker?.controller) throw new Error('service worker did not take control after reload');
    });

    const result = await page.evaluate(expectedCache => caches.open(expectedCache).then(async cache => {
      const localAssets = [
        './index.html',
        ...[...document.scripts]
          .map(script => script.src)
          .filter(src => src.startsWith(window.location.origin))
          .map(src => new URL(src).pathname + new URL(src).search),
        ...[...document.querySelectorAll('link[rel="stylesheet"]')]
          .map(link => link.href)
          .filter(src => src.startsWith(window.location.origin))
          .map(src => new URL(src).pathname + new URL(src).search),
      ].map(asset => asset.replace(/^\//, './'));
      const requiredAssets = [...new Set(localAssets)];
      const missing = [];
      for (const asset of requiredAssets) {
        if (!await cache.match(asset)) missing.push(asset);
      }
      return {
        expectedCache,
        cacheNames: await caches.keys(),
        requiredAssets,
        missing,
      };
    }), SERVICE_WORKER_CACHE);

    if (!result.cacheNames.includes(SERVICE_WORKER_CACHE)) {
      throw new Error(`Expected active cache missing: ${SERVICE_WORKER_CACHE}`);
    }
    if (result.missing.length) {
      throw new Error(`Assets missing from active cache: ${JSON.stringify(result.missing)}`);
    }
    console.log(`Active PWA cache ${SERVICE_WORKER_CACHE} contains ${result.requiredAssets.length} page-referenced local assets`);
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
