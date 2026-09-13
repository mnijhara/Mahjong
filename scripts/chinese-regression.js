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

    // Test Material Theme Swatches (Ebony & Gold, Washizu Crystal)
    await page.locator('.material-card[data-theme="ebony"]').click();
    if ((await page.evaluate(() => localStorage.getItem('mahjong-tile-theme'))) !== 'ebony') throw new Error('Ebony theme not persisted');

    await page.locator('.material-card[data-theme="crystal"]').click();
    if ((await page.evaluate(() => localStorage.getItem('mahjong-tile-theme'))) !== 'crystal') throw new Error('Crystal theme not persisted');
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

    // 3. Test Sichuan Bloody Rules Selection & 108 Tile Wall
    await page.selectOption('#gameStyle', 'sichuan');
    await page.waitForTimeout(100);
    const sichuanState = await page.evaluate(() => window.chineseGameState());
    if (sichuanState.style !== 'sichuan') throw new Error('Sichuan style state not set');
    // 108 tiles - (13 * 4 + 1) = 108 - 53 = 55 in wall
    if (sichuanState.wall !== 55) throw new Error(`Sichuan wall should have 55 tiles remaining, got ${sichuanState.wall}`);
    const sichuanHeader = await page.locator('.chinese-header h2').textContent();
    if (!sichuanHeader.includes('Chengdu Bloody Arena')) throw new Error('Sichuan arena header missing');

    // 4. Test Riichi Mahjong Selection
    await page.selectOption('#gameStyle', 'riichi');
    await page.waitForTimeout(100);
    const riichiState = await page.evaluate(() => window.chineseGameState());
    if (riichiState.style !== 'riichi') throw new Error('Riichi style state not set');
    if (!riichiState.dora) throw new Error('Riichi Dora indicator missing');

    // Reset theme back to ivory for clean state
    await page.evaluate(() => localStorage.setItem('mahjong-tile-theme', 'ivory'));

    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Chinese Mahjong + Washizu Crystal + Sichuan Bloody Rules regression passed cleanly');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
