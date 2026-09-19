const { chromium } = require('playwright');

const BASE_URL = 'http://127.0.0.1:4173/index.html';
const SERVICE_WORKER_CACHE = 'mahjong-static-v5';
const SOLITAIRE_ASSETS = [
  './game.js?v=20260830-7',
  './solitaire-a11y.js?v=20260831-1',
  './style-selector.js?v=20260830-7',
];
const VIEWPORTS = [
  { width: 844, height: 390, name: 'landscape-844x390' },
  { width: 390, height: 844, name: 'portrait-390x844' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      page.setDefaultTimeout(45000);
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.selectOption('#gameStyle', 'solitaire');
      await page.getByRole('button', { name: /Start game/ }).click();
      await page.waitForFunction(() => document.querySelectorAll('#board .tile').length === 144);
      const metrics = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyWidth: document.body.scrollWidth,
        boardWidth: document.querySelector('#board')?.getBoundingClientRect().width ?? 0,
      }));
      if (metrics.width > metrics.clientWidth + 1 || metrics.bodyWidth > metrics.clientWidth + 1) {
        failures.push(`${viewport.name}: horizontal overflow ${JSON.stringify(metrics)}`);
      }
      if (errors.length) failures.push(`${viewport.name}: ${errors.join(' | ')}`);
      await context.close();
    }

    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    const errors = [];
    const failedRequests = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'failed'}`));
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      if (!navigator.serviceWorker) throw new Error('service workers are unavailable');
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(expectedCache => caches.has(expectedCache), SERVICE_WORKER_CACHE);

    // A newly installed service worker does not control the page that triggered
    // its installation. Reload once so this smoke test verifies the real
    // controlled-app path instead of relying on first-load timing.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      if (!navigator.serviceWorker?.controller) throw new Error('service worker did not take control after reload');
    });
    const sw = await page.evaluate(async (assets, expectedCache) => ({
      controller: Boolean(navigator.serviceWorker?.controller),
      registrations: await navigator.serviceWorker.getRegistrations().then(list => list.length),
      cacheNames: await caches.keys(),
      cachedIndex: await caches.match('./index.html').then(response => Boolean(response)),
      cachedScripts: await Promise.all(assets.map(asset => caches.match(asset).then(response => Boolean(response)))),
      expectedCache,
    }), SOLITAIRE_ASSETS, SERVICE_WORKER_CACHE);
    if (!sw.controller || sw.registrations < 1) failures.push(`service worker not controlling page: ${JSON.stringify(sw)}`);
    if (!sw.cacheNames.some(name => name === SERVICE_WORKER_CACHE)) failures.push(`expected v5 cache missing: ${JSON.stringify(sw.cacheNames)}`);
    if (!sw.cachedIndex || sw.cachedScripts.some(cached => !cached)) failures.push(`offline application assets missing: ${JSON.stringify(sw)}`);

    await context.setOffline(true);
    failedRequests.length = 0;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#board');
    await page.selectOption('#gameStyle', 'solitaire');
    await page.getByRole('button', { name: /Start game/ }).click();
    await page.waitForFunction(() => document.querySelectorAll('#board .tile').length === 144);
    const offlineState = await page.evaluate(() => ({
      title: document.title,
      boardPresent: Boolean(document.querySelector('#board')),
      tileCount: document.querySelectorAll('#board .tile').length,
      controlled: Boolean(navigator.serviceWorker?.controller),
    }));
    if (errors.length) failures.push(`offline reload browser errors: ${errors.join(' | ')}`);
    if (failedRequests.length) failures.push(`unexpected failed requests during offline reload: ${failedRequests.join(' | ')}`);
    if (!offlineState.boardPresent || offlineState.tileCount !== 144 || !offlineState.controlled) {
      failures.push(`offline gameplay reload failed: ${JSON.stringify(offlineState)}`);
    }
    await context.close();

    if (failures.length) throw new Error(failures.join('\n'));
    console.log('Responsive + service-worker smoke tests passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
