const { chromium } = require('playwright');

const SELECTOR = '#board .tile';
const SAVE_KEY = 'mahjong-solitaire-save-v1';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const count = selector => page.locator(selector).count();
  const fail = message => { throw new Error(message); };
  const waitForSelectedOrder = async (previous = null) => {
    await page.waitForFunction(prev => {
      const selected = document.querySelector('#board .tile.selected');
      return Boolean(selected && selected.dataset.order && selected.dataset.order !== prev);
    }, previous, { timeout: 3000 });
    return page.locator('#board .tile.selected').getAttribute('data-order');
  };

  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(key => localStorage.removeItem(key), SAVE_KEY);
    await page.selectOption('#gameStyle', 'solitaire');
    await page.getByRole('button', { name: 'Start game' }).click();
    if (await count(SELECTOR) !== 144) fail('Fresh Solitaire board must contain 144 tiles');

    const firstOpen = page.locator('#board .tile.free').first();
    await firstOpen.click();
    if (await count('#board .tile.selected') !== 1) fail('Fresh game selection failed');
    await page.getByRole('button', { name: /Undo/ }).click();
    if (await count('#board .tile.selected') !== 0) fail('Undo did not clear the selection');

    await page.getByRole('button', { name: /Hint/ }).click();
    const first = await waitForSelectedOrder();
    const second = await waitForSelectedOrder(first);
    if (!second || second === first) fail('Hint did not identify a second matching tile');
    await page.locator(`[data-order="${first}"]`).click();
    await page.locator(`[data-order="${second}"]`).click();
    await page.waitForFunction(() => document.querySelectorAll('#board .tile').length === 142);
    if (await count(SELECTOR) !== 142) fail('Matched hint pair did not remove two tiles');
    if (!await page.evaluate(key => Boolean(localStorage.getItem(key)), SAVE_KEY)) fail('Active Solitaire game was not saved');

    await page.reload({ waitUntil: 'networkidle' });
    await page.selectOption('#gameStyle', 'solitaire');
    await page.getByRole('button', { name: /Resume game|Start game/ }).click();
    if (await count(SELECTOR) !== 142) fail('Resume did not restore the saved 142-tile state');

    await page.getByRole('button', { name: /New game/ }).click();
    if (await count(SELECTOR) !== 144) fail('New Game did not discard the previous board');
    if (await count('#board .tile.selected') !== 0) fail('New Game retained selection state');
    if (!await page.evaluate(key => Boolean(localStorage.getItem(key)), SAVE_KEY)) fail('New Game did not save the fresh board');

    await page.reload({ waitUntil: 'networkidle' });
    await page.selectOption('#gameStyle', 'solitaire');
    await page.getByRole('button', { name: /Resume game|Start game/ }).click();
    if (await count(SELECTOR) !== 144) fail('Fresh New Game state did not survive reload');

    console.log('Solitaire lifecycle regression passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
