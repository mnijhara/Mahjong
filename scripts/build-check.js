const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const required = ['index.html', 'styles.css', 'game.js', 'manifest.webmanifest', 'robots.txt'];

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    throw new Error(`Required production file is missing or empty: ${file}`);
  }
}

execFileSync(process.execPath, ['--check', path.join(root, 'game.js')], { stdio: 'inherit' });

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const requiredMarkup = ['id="board"', 'id="startGame"', 'id="undo"', 'id="hint"', 'id="shuffle"', 'id="playAgain"'];
for (const marker of requiredMarkup) {
  if (!html.includes(marker)) throw new Error(`Required game control is missing: ${marker}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const key of ['name', 'short_name', 'start_url', 'display']) {
  if (!manifest[key]) throw new Error(`Manifest field is missing: ${key}`);
}

console.log('Mahjong production build validation passed.');
