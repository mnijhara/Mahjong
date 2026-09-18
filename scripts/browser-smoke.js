const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    for (const viewport of [
      { width: 844, height: 390, name: 'landscape-844x390' },
      { width: 390, height: 844, name: 'portrait-390x844' },
    ]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
      await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
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
    const errors = [];
    const failedRequests = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'failed'}`));
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
    const sw = await page.evaluate(async () => ({
      controller: Boolean(navigator.serviceWorker?.controller),
      registrations: await navigator.serviceWorker.getRegistrations().then(list => list.length),
      cacheNames: await caches.keys(),
      cachedIndex: await caches.match('./index.html').then(response => Boolean(response)),
      cachedScripts: await Promise.all([
        './game.js?v=20260830-7',
        './solitaire-a11y.js?v=20260831-1',
        './style-selector.js?v=20260830-7',
      ].map(asset => caches.match(asset).then(response => Boolean(response)))),
    }));
    if (!sw.controller || sw.registrations < 1) failures.push(`service worker not controlling page: ${JSON.stringify(sw)}`);
    if (!sw.cacheNames.some(name => name === 'mahjong-static-v5')) failures.push(`expected v5 cache missing: ${JSON.stringify(sw.cacheNames)}`);
    if (!sw.cachedIndex || sw.cachedScripts.some(Boolean => !Boolean)) failures.push(`offline application assets missing: ${JSON.stringify(sw)}`);

    await context.setOffline(true);
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
    if (failedRequests.length) failures.push(`unexpected failed requests: ${failedRequests.join(' | ')}`);
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
