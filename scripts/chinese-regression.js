const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));

  try {
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });

    // 1. Test Tile Studio Modal & Material Customization
    const studioBtn = page.locator('#tileStudioLaunchBtn');
    if (await studioBtn.count() !== 1) throw new Error('Tile Studio launch button missing');
    await studioBtn.click();
    if (!await page.locator('#tileStudioModal').isVisible()) throw new Error('Tile Studio modal did not open');

    // Test Material Theme Swatch (Ebony & Gold)
    await page.locator('.material-card[data-theme="ebony"]').click();
    if ((await page.evaluate(() => localStorage.getItem('mahjong-tile-theme'))) !== 'ebony') throw new Error('Ebony theme not persisted');

    // Close Studio
    await page.locator('#studioApplyBtn').click();
    if (await page.locator('#tileStudioModal').isVisible()) throw new Error('Tile Studio modal did not close');

    // 2. Test Chinese / Hong Kong Mahjong Selection
    await page.selectOption('#gameStyle', 'hong-kong');
    if (!(await page.evaluate(() => document.body.classList.contains('chinese-mode')))) throw new Error('Chinese mode not active on body');
    if (!await page.locator('#chineseTable').isVisible()) throw new Error('Chinese table is not visible');
    if (await page.locator('#chineseHand .chinese-tile').count() !== 14) throw new Error('Chinese hand did not deal 14 initial tiles');
    if (await page.locator('.chinese-seat').count() !== 3) throw new Error('Chinese table does not render 3 opponents');

    // Test Human Discard in Chinese Table
    await page.locator('#chineseHand .chinese-tile').first().click();
    await page.waitForTimeout(120);
    if (await page.locator('#chineseDiscardGrid .discard-tile').count() < 1) throw new Error('Discard not recorded in Chinese discard grid');

    // Reset theme back to ivory for clean state
    await page.evaluate(() => localStorage.setItem('mahjong-tile-theme', 'ivory'));

    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Chinese Mahjong + Tile Studio regression passed cleanly');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
