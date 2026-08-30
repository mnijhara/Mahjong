const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));

  const fail = message => { throw new Error(message); };
  const count = selector => page.locator(selector).count();

  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
    if (await page.locator('#gameStyle').inputValue() !== 'american') fail('American mode is not the default');
    if (await count('#americanHand .american-tile') !== 0) fail('American hand should not auto-start');

    await page.locator('#americanStart').click();
    if (await count('#americanHand .american-tile') !== 14) fail('American Start game did not deal 14 tiles');
    if (!(await page.locator('#americanStatus').textContent()).includes('Charleston')) fail('American Charleston did not start');
    for (let attempt = 0; attempt < 12 && await count('#americanCombinations .american-combo-card') < 1; attempt++) {
      await page.locator('#americanStart').click();
      await page.waitForTimeout(20);
    }
    const insightCards = await count('#americanCombinations .american-combo-card');
    const insightEmpty = await count('#americanCombinations .american-insight-empty');
    if (insightCards < 1 && insightEmpty < 1) fail('American hand guidance did not render');
    if (await count('#americanDirections .american-direction-card') !== 4) fail('American candidate ranking did not render');
    if (await count('#americanDirections .american-direction-card.recommended') !== 1) fail('Recommended candidate missing');
    await page.locator('#americanSuggested').click();
    if (!await page.locator('#americanInsights').isVisible()) fail('Live Suggested Hands panel did not open');
    if (insightCards > 0) {
      await page.locator('#americanCombinations .american-combo-card').first().click();
      if (await count('#americanHand .american-tile.insight-focus') < 1) fail('Combination card did not highlight tiles');
    }
    for (let pass = 0; pass < 3; pass++) {
      const indexes = await page.locator('#americanHand .american-tile').evaluateAll(els => els.map((el, index) => ({ index, joker: /Joker/i.test(el.getAttribute('aria-label') || '') })).filter(x => !x.joker).slice(0, 3).map(x => x.index));
      for (const index of indexes.slice().reverse()) await page.locator('#americanHand .american-tile').nth(index).click();
      if (await page.locator('#americanPass').isDisabled()) fail(`Charleston pass ${pass + 1} did not enable`);
      await page.locator('#americanPass').click();
    }
    if (!(await page.locator('#americanStatus').textContent()).includes('Charleston complete')) fail('Charleston did not complete');

    await page.selectOption('#gameStyle', 'solitaire');
    await page.getByRole('button', { name: 'Start game' }).click();
    if (await count('#board .tile') !== 144) fail('Expected 144 Solitaire tiles');
    const blockedCount = await count('#board .tile.blocked');
    const disabledCount = await count('#board .tile:disabled');
    if (blockedCount < 1) fail('Solitaire should start with blocked tiles');
    if (disabledCount !== blockedCount) fail('Every blocked Solitaire tile must be natively disabled');
    if (await count('#board .tile.free:disabled') !== 0) fail('Open Solitaire tiles must remain enabled');
    if (await page.locator('#board .tile.blocked').first().evaluate(el => { el.focus(); return document.activeElement === el; })) fail('Blocked Solitaire tile must not be focusable');

    const openTile = page.locator('#board .tile.free').first();
    await openTile.focus();
    if (await page.evaluate(() => document.activeElement?.classList.contains('free')) !== true) fail('Open Solitaire tile should be keyboard focusable');
    await openTile.click();
    if (await count('#board .tile.selected') !== 1) fail('Solitaire selection failed');
    await page.getByRole('button', { name: /Undo/ }).click();
    if (await count('#board .tile.selected') !== 0) fail('Solitaire undo failed');

    await page.getByRole('button', { name: /Hint/ }).click();
    await page.waitForTimeout(700);
    const firstHint = await page.locator('#board .tile.selected').getAttribute('data-order');
    if (!firstHint) fail('Hint did not select first tile');
    await page.waitForTimeout(700);
    const secondHint = await page.locator('#board .tile.selected').getAttribute('data-order');
    if (!secondHint || secondHint === firstHint) fail('Hint did not select second matching tile');
    await page.locator(`[data-order="${firstHint}"]`).click();
    await page.locator(`[data-order="${secondHint}"]`).click();
    if (await count('#board .tile') !== 142) fail('Hint pair did not remove two tiles');
    if (!(await page.evaluate(() => Boolean(localStorage.getItem('mahjong-solitaire-save-v1'))))) fail('Solitaire save missing');

    await page.reload({ waitUntil: 'networkidle' });
    await page.selectOption('#gameStyle', 'solitaire');
    await page.getByRole('button', { name: /Resume game|Start game/ }).click();
    if (await count('#board .tile') !== 142) fail('Saved Solitaire board did not restore');

    await page.getByRole('button', { name: /Shuffle remaining/ }).click();
    for (let run = 0; run < 10; run++) {
      await page.getByRole('button', { name: /Hint/ }).click();
      await page.waitForTimeout(700);
      if (await count('#board .tile.selected') !== 1) fail(`Shuffle ${run + 1} left no legal hint`);
      await page.locator('#board .tile.selected').click();
      await page.getByRole('button', { name: /Shuffle remaining/ }).click();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.selectOption('#gameStyle', 'american');
    await page.locator('#americanStart').click();
    if (await count('#americanHand .american-tile') !== 14) fail('Mobile American Start game failed');
    if (await count('#americanDirections .american-direction-card') !== 4) fail('Mobile American candidate ranking failed');
    await page.selectOption('#gameStyle', 'solitaire');
    await page.getByRole('button', { name: /Resume game|Start game/ }).click();
    if (await count('#board .tile') !== 142) fail('Mobile Solitaire resume failed');
    const viewport = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight }));
    if (viewport.w > viewport.cw + 1 || viewport.h > viewport.ch + 1) fail(`Mobile Solitaire viewport overflow: ${JSON.stringify(viewport)}`);
    if (errors.length) fail(errors.join('\n'));
    console.log(`American + Solitaire browser regression passed (${process.env.TEST_VERSION || 'local'})`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
