const { chromium } = require('playwright');

const SAVE_KEY = 'mahjong-solitaire-save-v1';
const URL = 'http://127.0.0.1:4173/index.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));

  const fail = message => { throw new Error(message); };
  const count = selector => page.locator(selector).count();
  const waitForCount = async (selector, expected, timeout = 3000) => {
    await page.waitForFunction(({ selector, expected }) => document.querySelectorAll(selector).length === expected, { selector, expected }, { timeout });
  };
  const setGameStyle = async value => {
    await page.locator('#gameStyle').selectOption(value, { force: true });
    await page.waitForFunction(expected => document.body.classList.contains(`${expected}-mode`), value);
  };
  const findOpenPair = async () => page.locator('#board .tile.free').evaluateAll(tiles => {
    const groups = new Map();
    for (const tile of tiles) {
      const key = tile.dataset.matchKey;
      if (!key) continue;
      const list = groups.get(key) || [];
      list.push(tile.dataset.order);
      groups.set(key, list);
    }
    return [...groups.values()].find(list => list.length >= 2) || [];
  });
  const clearBoard = async () => {
    const solutionOrder = await page.evaluate(() => {
      const layout = window.getLayoutById?.('turtle');
      return layout?.solutionOrder || [];
    });
    if (solutionOrder.length !== 144) fail(`Expected deterministic turtle solution order, got ${solutionOrder.length}`);
    for (let i = 0; i < solutionOrder.length; i += 2) {
      const first = String(solutionOrder[i]);
      const second = String(solutionOrder[i + 1]);
      await page.waitForFunction(({ first, second }) => {
        const a = document.querySelector(`[data-order="${first}"]`);
        const b = document.querySelector(`[data-order="${second}"]`);
        return Boolean(a && b && !a.disabled && !b.disabled);
      }, { first, second }, { timeout: 3000 });
      await page.locator(`[data-order="${first}"]`).click();
      await page.locator(`[data-order="${second}"]`).click();
      const remaining = 144 - i - 2;
      if (remaining > 0) await waitForCount('#board .tile', remaining);
    }
    await waitForCount('#board .tile', 0);
  };

  try {
    await page.goto(URL, { waitUntil: 'networkidle' });
    if (await page.locator('#gameStyle').inputValue() !== 'american') fail('American mode is not the default');

    await setGameStyle('american');
    await page.locator('#americanTable').waitFor({ state: 'visible' });
    if (await count('#americanHand .american-tile') !== 0) fail('American hand should not auto-start');

    const newHand = page.locator('#americanNewHand');
    await newHand.click();
    await waitForCount('#americanHand .american-tile', 14);
    if (!(await page.locator('#americanStatus').textContent()).includes('Charleston')) fail('American Charleston did not start');

    for (let attempt = 0; attempt < 12 && await count('#americanCombinations .american-combo-card') < 1; attempt += 1) {
      await newHand.click();
      await waitForCount('#americanHand .american-tile', 14);
      await page.waitForTimeout(20);
    }
    const insightCards = await count('#americanCombinations .american-combo-card');
    const insightEmpty = await count('#americanCombinations .american-insight-empty');
    if (insightCards < 1 && insightEmpty < 1) fail('American hand guidance did not render');
    await waitForCount('#americanDirections .american-direction-card', 4);
    if (await count('#americanDirections .american-direction-card.recommended') !== 1) fail('Recommended candidate missing');
    await page.locator('#americanSuggested').click();
    if (!await page.locator('#americanInsights').isVisible()) fail('Live Suggested Hands panel did not open');
    if (insightCards > 0) {
      await page.locator('#americanCombinations .american-combo-card').first().click();
      await page.waitForFunction(() => {
        const card = document.querySelector('#americanCombinations .american-combo-card[aria-pressed="true"]');
        return Boolean(card) && document.querySelectorAll('#americanHand .american-tile.insight-focus').length >= 1;
      });
    }

    for (let pass = 0; pass < 3; pass += 1) {
      const indexes = await page.locator('#americanHand .american-tile').evaluateAll(tiles => tiles
        .map((tile, index) => ({ index, joker: /Joker/i.test(tile.getAttribute('aria-label') || '') }))
        .filter(item => !item.joker)
        .slice(0, 3)
        .map(item => item.index));
      for (const index of indexes.reverse()) await page.locator('#americanHand .american-tile').nth(index).click();
      if (await page.locator('#americanPass').isDisabled()) fail(`Charleston pass ${pass + 1} did not enable`);
      await page.locator('#americanPass').click();
      await waitForCount('#americanHand .american-tile', 14);
    }
    if (!(await page.locator('#americanStatus').textContent()).includes('Charleston complete')) fail('Charleston did not complete');

    await page.evaluate(key => localStorage.removeItem(key), SAVE_KEY);
    await setGameStyle('solitaire');
    const skipLink = page.locator('.skip-link');
    if (await skipLink.count() !== 1) fail('Skip-to-game-board link missing');
    await skipLink.focus();
    await skipLink.press('Enter');
    await page.waitForFunction(() => document.activeElement?.id === 'board');

    await page.getByRole('button', { name: 'Start game' }).click();
    await waitForCount('#board .tile', 144);
    const blocked = await count('#board .tile.blocked');
    if (blocked < 1) fail('Solitaire should start with blocked tiles');
    if (await count('#board .tile:disabled') !== blocked) fail('Every blocked tile must be natively disabled');
    if (await count('#board .tile.free:disabled') !== 0) fail('Open tiles must remain enabled');

    const openTile = page.locator('#board .tile.free').first();
    await openTile.focus();
    await openTile.click();
    if (await count('#board .tile.selected') !== 1) fail('Solitaire selection failed');
    await page.getByRole('button', { name: /Undo/ }).click();
    if (await count('#board .tile.selected') !== 0) fail('Solitaire undo failed');

    await page.getByRole('button', { name: /Hint/ }).click();
    await page.waitForFunction(() => document.querySelectorAll('#board .tile.selected').length === 1, null, { timeout: 3000 });
    const hintedTile = page.locator('#board .tile.selected');
    if (await hintedTile.count() !== 1) fail('Hint did not select a tile');
    const hintKey = await hintedTile.getAttribute('data-match-key');
    const firstHintOrder = await hintedTile.getAttribute('data-order');
    if (!hintKey || !firstHintOrder) fail('Hint tile is missing match metadata');
    await page.waitForFunction(({ hintKey, firstHintOrder }) => {
      const selected = document.querySelector('#board .tile.selected');
      return Boolean(selected) && selected.dataset.matchKey === hintKey && selected.dataset.order !== firstHintOrder;
    }, { hintKey, firstHintOrder }, { timeout: 2000 });

    await page.getByRole('button', { name: /New game/ }).click();
    await waitForCount('#board .tile', 144);
    const pair = await findOpenPair();
    if (pair.length < 2) fail('Fresh board did not expose a free matching pair');
    await page.locator(`[data-order="${pair[0]}"]`).click();
    await page.locator(`[data-order="${pair[1]}"]`).click();
    await waitForCount('#board .tile', 142);
    if (!await page.evaluate(key => Boolean(localStorage.getItem(key)), SAVE_KEY)) fail('Solitaire save missing');

    await page.reload({ waitUntil: 'networkidle' });
    await setGameStyle('solitaire');
    await page.getByRole('button', { name: /Resume game|Start game/ }).click();
    await waitForCount('#board .tile', 142);

    await page.getByRole('button', { name: /New game/ }).click();
    await waitForCount('#board .tile', 144);
    const shufflePair = await findOpenPair();
    if (shufflePair.length < 2) fail('Fresh board did not expose a pair for shuffle validation');
    await page.locator(`[data-order="${shufflePair[0]}"]`).click();
    await page.locator(`[data-order="${shufflePair[1]}"]`).click();
    await waitForCount('#board .tile', 142);
    await page.getByRole('button', { name: /Shuffle remaining/ }).click();
    await waitForCount('#board .tile', 142);
    if ((await findOpenPair()).length < 2) fail('Shuffle did not preserve a playable matching pair');

    await page.getByRole('button', { name: /New game/ }).click();
    await waitForCount('#board .tile', 144);
    await clearBoard();
    if (await page.locator('#modal').isHidden()) fail('Completion dialog did not open');
    if (await page.evaluate(key => localStorage.getItem(key), SAVE_KEY) !== null) fail('Completed game should clear saved state');
    await page.waitForFunction(() => document.activeElement?.id === 'playAgain', null, { timeout: 2000 });
    await page.locator('#playAgain').click();
    await waitForCount('#board .tile', 144);
    if (await page.locator('#modal').isVisible()) fail('Play again left completion dialog open');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle' });
    await setGameStyle('american');
    await newHand.click();
    await waitForCount('#americanHand .american-tile', 14);
    await waitForCount('#americanDirections .american-direction-card', 4);
    await setGameStyle('solitaire');
    await page.getByRole('button', { name: /Resume game|Start game/ }).click();
    await waitForCount('#board .tile', 144);
    const viewport = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    if (viewport.width > viewport.clientWidth + 1) fail(`Mobile horizontal overflow: ${JSON.stringify(viewport)}`);

    if (errors.length) fail(errors.join('\n'));
    console.log(`American + Solitaire browser regression passed (${process.env.TEST_VERSION || 'local'})`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
