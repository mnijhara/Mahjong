#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));

function normalize(url) {
  if (!url || /^(?:https?:|data:|mailto:|#|\/\/)/i.test(url)) return null;
  return url.replace(/^\.\//, '').split(/[?#]/)[0];
}

const referenced = new Set();
const scripts = new Set();
const stylesheets = new Set();

function addAsset(url, sourceType) {
  const asset = normalize(url);
  if (!asset) return;
  referenced.add(asset);
  if (sourceType === 'script' || /\.js$/i.test(asset)) scripts.add(asset);
  if (sourceType === 'stylesheet' || /\.css$/i.test(asset)) stylesheets.add(asset);
}

for (const match of index.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
  addAsset(match[1]);
}

for (const icon of manifest.icons || []) addAsset(icon.src);

const scannedScripts = new Set();
const scannedStylesheets = new Set();

function scanScript(script) {
  if (scannedScripts.has(script)) return;
  scannedScripts.add(script);
  const scriptPath = path.join(root, script);
  if (!fs.existsSync(scriptPath)) return;
  const source = fs.readFileSync(scriptPath, 'utf8');

  // Cover literal assignments plus template literals with no interpolation.
  // The latter are common for cache-busted local assets while still being
  // statically verifiable. URLs containing ${...} remain intentionally
  // excluded because their runtime value cannot be proven from source alone.
  for (const match of source.matchAll(/(?:\.src|\.href)\s*=\s*(["'`])([^"'`$]+)\1|setAttribute\(\s*(["'])\s*(?:src|href)\s*\3\s*,\s*(["'`])([^"'`$]+)\4/g)) {
    addAsset(match[2] || match[5]);
  }
}

function scanStylesheet(stylesheet) {
  if (scannedStylesheets.has(stylesheet)) return;
  scannedStylesheets.add(stylesheet);
  const stylesheetPath = path.join(root, stylesheet);
  if (!fs.existsSync(stylesheetPath)) return;
  const source = fs.readFileSync(stylesheetPath, 'utf8');
  for (const match of source.matchAll(/url\(\s*["']?([^\)"']+)["']?\s*\)/gi)) {
    addAsset(match[1]);
  }
}

// Walk the local dependency graph until no new JS/CSS assets are discovered.
// This catches second-order dynamic loads (script -> script -> stylesheet), not
// just the first level referenced by index.html.
let changed = true;
while (changed) {
  changed = false;
  const scriptsBefore = scannedScripts.size;
  for (const script of [...scripts]) scanScript(script);
  if (scannedScripts.size !== scriptsBefore) changed = true;

  const stylesBefore = scannedStylesheets.size;
  for (const stylesheet of [...stylesheets]) scanStylesheet(stylesheet);
  if (scannedStylesheets.size !== stylesBefore) changed = true;
}

const shellMatch = sw.match(/const APP_SHELL = \[(.*?)\];/s);
if (!shellMatch) throw new Error('Unable to locate APP_SHELL in sw.js');
const shell = new Set();
for (const match of shellMatch[1].matchAll(/["']([^"']+)["']/g)) {
  const asset = normalize(match[1]);
  if (asset) shell.add(asset);
}

const missingFromShell = [...referenced].filter(asset => !shell.has(asset));
const missingFiles = [...shell].filter(asset => !fs.existsSync(path.join(root, asset)));

if (missingFromShell.length || missingFiles.length) {
  if (missingFromShell.length) console.error(`Referenced by index.html/manifest/dynamic dependency graph but absent from APP_SHELL:\n- ${missingFromShell.join('\n- ')}`);
  if (missingFiles.length) console.error(`Listed by APP_SHELL but missing from repository:\n- ${missingFiles.join('\n- ')}`);
  process.exit(1);
}

console.log(`PWA shell parity OK: ${referenced.size} document/manifest/dynamic dependency assets verified against APP_SHELL; ${shell.size} shell entries checked for local files.`);
