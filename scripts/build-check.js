const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const required = [
  'index.html',
  'styles.css',
  'style-picker.css',
  'tile-studio.css',
  'chinese-table.css',
  'american.css',
  'american-insights.js',
  'game.js',
  'american-game.js',
  'chinese-game.js',
  'tile-studio.js',
  'mahjong-audio.js',
  'style-selector.js',
  'manifest.webmanifest',
  'robots.txt',
  'icons/mahjong-192.svg',
  '404.html',
  '.htaccess',
  'solitaire-a11y.js',
  'mahjong-codex.css',
  'mahjong-codex.js',
  'solitaire-layouts.css',
  'solitaire-layouts.js',
  'american-charleston-immersive.css',
  'mahjong-daily.css',
  'mahjong-daily.js',
  'mahjong-stats.css',
  'mahjong-stats.js',
  'scripts/static-server.js'
];

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    throw new Error(`Required production file is missing or empty: ${file}`);
  }
}

for (const file of [
  'game.js',
  'american-game.js',
  'chinese-game.js',
  'tile-studio.js',
  'mahjong-audio.js',
  'american-insights.js',
  'style-selector.js',
  'solitaire-a11y.js',
  'mahjong-codex.js',
  'solitaire-layouts.js',
  'mahjong-daily.js',
  'mahjong-stats.js',
  'scripts/static-server.js',
  'scripts/chinese-regression.js',
  'scripts/full-crawler-audit.js'
]) {
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

// Keep local CSS/JS/manifest/icon references in index.html synchronized with the shipped asset set.
const localReferences = [];
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const raw = match[1].split('#')[0].split('?')[0];
  if (!raw || raw.startsWith('/') || raw.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
  localReferences.push(raw);
}
for (const reference of localReferences) {
  const assetPath = path.resolve(root, decodeURIComponent(reference));
  if (!assetPath.startsWith(root + path.sep) || !fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
    throw new Error(`Referenced local asset is missing: ${reference}`);
  }
}

// Deployment contract: protect the HTML/service-worker/manifest update path while
// allowing versioned static assets to remain cacheable on Apache/LiteSpeed hosts.
const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');
const requiredHeaderBlocks = [
  ['<FilesMatch "\\.(html?)$">', 'Header set Cache-Control "no-cache, no-store, must-revalidate"'],
  ['<FilesMatch "\\.(css|js|svg)$">', 'Header set Cache-Control "public, max-age=604800"'],
  ['<FilesMatch "^sw\\.js$">', 'Header set Cache-Control "no-cache, no-store, must-revalidate"'],
  ['<FilesMatch "^manifest\\.webmanifest$">', 'Header set Cache-Control "no-cache, max-age=0, must-revalidate"']
];
for (const [matcher, header] of requiredHeaderBlocks) {
  const matcherIndex = htaccess.indexOf(matcher);
  if (matcherIndex === -1 || !htaccess.slice(matcherIndex, matcherIndex + 240).includes(header)) {
    throw new Error(`Production cache/header contract is missing: ${matcher} -> ${header}`);
  }
}

console.log(`Validated ${localReferences.length} local HTML asset references.`);
console.log('Mahjong production build validation passed.');
