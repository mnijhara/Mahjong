const { chromium } = require('playwright');

const SAVE_KEY = 'mahjong-solitaire-save-v1';
const viewports = [
  { width: 360, height: 800, name: '360x800 portrait' },
  { width: 390, height: 844, name: '390x844 portrait' },
  { width: 430, height: 932, name: '430x932 portrait' },
  { width: 844, height: 390, name: '844x390 landscape' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
      await page.evaluate(key => localStorage.removeItem(key), SAVE_KEY);
      await page.selectOption('#gameStyle', 'solitaire');
      await page.getByRole('button', { name: 'Start game' }).click();
      await page.waitForFunction(() => document.body.classList.contains('solitaire-mode'));
      await page.waitForFunction(() => {
        const board = document.querySelector('#board');
        const wrap = board?.closest('.board-wrap');
        if (!board || !wrap) return false;
        const transform = getComputedStyle(board).transform;
        return transform !== 'none';
      });

      const metrics = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        boardRect: document.querySelector('#board').getBoundingClientRect().toJSON(),
        wrapRect: document.querySelector('.board-wrap').getBoundingClientRect().toJSON(),
      }));
      if (metrics.scrollWidth > metrics.innerWidth + 1 || metrics.scrollHeight > metrics.innerHeight + 1) {
        throw new Error(`${viewport.name}: document overflow ${metrics.scrollWidth}x${metrics.scrollHeight} for viewport ${metrics.innerWidth}x${metrics.innerHeight}`);
      }
      if (metrics.boardRect.left < metrics.wrapRect.left - 1 || metrics.boardRect.right > metrics.wrapRect.right + 1 || metrics.boardRect.top < metrics.wrapRect.top - 1 || metrics.boardRect.bottom > metrics.wrapRect.bottom + 1) {
        throw new Error(`${viewport.name}: board is clipped by its viewport`);
      }
      await page.close();
      console.log(`${viewport.name}: viewport fit passed`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
