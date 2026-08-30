const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const count = selector => page.locator(selector).count();
  const fail = message => { throw new Error(message); };

  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
    await page.selectOption('#gameStyle', 'solitaire');
    await page.getByRole('button', { name: 'Start game' }).click();
    if (await count('#board .tile') !== 144) fail('Fresh Solitaire board must contain 144 tiles');

    const firstOpen = page.locator('#board .tile.free').first();
    await firstOpen.click();
    if (await count('#board .tile.selected') !== 1) fail('Fresh game selection failed');
    await page.getByRole('button', { name: /Undo/ }).click();
    if (await count('#board .tile.selected') !== 0) fail('Undo did not clear the selection');

    await page.getByRole('button', { name: /Hint/ }).click();
    await page.waitForTimeout(700);
    const first = await page.locator('#board .tile.selected').getAttribute('data-order');
    if (!first) fail('Hint did not identify a first tile');
    await page.waitForTimeout(700);
    const second = await page.locator('#board .tile.selected').getAttribute('data-order');
    if (!second || second === first) fail('Hint did not identify a second tile');
    await page.locator(`[data-order="${first}"]`).click();
    await page.locator(`[data-order="${second}"]`).click();
    if (await count('#board .tile') !== 142) fail('Matched hint pair did not remove two tiles');
    if (!await page.evaluate(() => Boolean(localStorage.getItem('mahjong-solitaire-save-v1')))) fail('Active Solitaire game was not saved');

    await page.reload({ waitUntil: 'networkidle' });
    await page.selectOption('#gameStyle', 'solitaire');
    await page.getByRole('button', { name: /Resume game|Start game/ }).click();
    if (await count('#board .tile') !== 142) fail('Resume did not restore the saved 142-tile state');

    await page.getByRole('button', { name: /New game/ }).click();
    if (await count('#board .tile') !== 144) fail('New Game did not discard the previous board');
    if (await count('#board .tile.selected') !== 0) fail('New Game retained selection state');
    if (!await page.evaluate(() => Boolean(localStorage.getItem('mahjong-solitaire-save-v1')))) fail('New Game did not save the fresh board');

    await page.reload({ waitUntil: 'networkidle' });
    await page.selectOption('#gameStyle', 'solitaire');
    await page.getByRole('button', { name: /Resume game|Start game/ }).click();
    if (await count('#board .tile') !== 144) fail('Fresh New Game state did not survive reload');

    console.log('Solitaire lifecycle regression passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
