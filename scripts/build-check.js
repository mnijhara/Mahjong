const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const required = ['index.html', 'styles.css', 'style-picker.css', 'american.css', 'american-insights.js', 'game.js', 'american-game.js', 'style-selector.js', 'manifest.webmanifest', 'robots.txt', 'icons/mahjong-192.svg'];

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    throw new Error(`Required production file is missing or empty: ${file}`);
  }
}

for (const file of ['game.js', 'american-game.js', 'american-insights.js', 'style-selector.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const requiredMarkup = ['id="board"', 'id="startGame"', 'id="undo"', 'id="hint"', 'id="shuffle"', 'id="playAgain"', 'id="gameStyle"', 'id="styleDescription"', 'id="americanTable"', 'id="americanHand"', 'id="americanPass"', 'id="americanCombinations"', 'id="americanDirections"'];
for (const marker of requiredMarkup) {
  if (!html.includes(marker)) throw new Error(`Required game control is missing: ${marker}`);
}

const expectedStyles = ['american', 'solitaire', 'riichi', 'hong-kong', 'chinese-classical', 'taiwanese', 'singapore'];
for (const style of expectedStyles) {
  if (!html.includes(`value="${style}"`)) throw new Error(`Mahjong style option is missing: ${style}`);
}

const american = fs.readFileSync(path.join(root, 'american-game.js'), 'utf8');
for (const marker of ['152', 'joker', 'charleston', 'americanPass', 'East', 'updateAmericanInsights']) {
  if (!american.toLowerCase().includes(marker.toLowerCase())) throw new Error(`American mode marker is missing: ${marker}`);
}

const insights = fs.readFileSync(path.join(root, 'american-insights.js'), 'utf8');
for (const marker of ['Pung', 'Kong', 'Quint', 'Joker', 'americanDirections']) {
  if (!insights.toLowerCase().includes(marker.toLowerCase())) throw new Error(`American insights marker is missing: ${marker}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const key of ['name', 'short_name', 'start_url', 'display']) {
  if (!manifest[key]) throw new Error(`Manifest field is missing: ${key}`);
}
if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  throw new Error('Manifest must define at least one application icon.');
}
for (const icon of manifest.icons) {
  if (!icon.src || !icon.sizes || !icon.type) throw new Error('Manifest icon is missing src, sizes, or type.');
  const iconPath = path.resolve(root, icon.src);
  if (!iconPath.startsWith(root + path.sep) || !fs.existsSync(iconPath) || fs.statSync(iconPath).size === 0) {
    throw new Error(`Manifest icon asset is missing or invalid: ${icon.src}`);
  }
}

const iconSvg = fs.readFileSync(path.join(root, 'icons/mahjong-192.svg'), 'utf8');
if (!/<svg\b/i.test(iconSvg) || !/viewBox=/i.test(iconSvg)) {
  throw new Error('Mahjong app icon must be a valid SVG with a viewBox.');
}

console.log('Mahjong production build validation passed.');
