#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));

function normalize(url, baseDir = '') {
  if (!url || /^(?:https?:|data:|mailto:|#|\/\/)/i.test(url)) return null;
  const clean = url.replace(/^\.\//, '').split(/[?#]/)[0];
  if (!clean) return null;
  const combined = clean.startsWith('/')
    ? clean.slice(1)
    : path.posix.join(baseDir.replace(/\\/g, '/'), clean);
  const normalized = path.posix.normalize(combined).replace(/^\.\//, '');
  if (!normalized || normalized === '..' || normalized.startsWith('../')) return null;
  return normalized;
}

const referenced = new Set();
const scripts = new Set();
const stylesheets = new Set();

function addAsset(url, sourceType, baseDir = '') {
  const asset = normalize(url, baseDir);
  if (!asset) return;
  referenced.add(asset);
  if (sourceType === 'script' || /\.js$/i.test(asset)) scripts.add(asset);
  if (sourceType === 'stylesheet' || /\.css$/i.test(asset)) stylesheets.add(asset);
}

function addSrcset(value, baseDir = '') {
  // A srcset candidate is the URL followed by optional width/density descriptors.
  // Commas inside CSS functions are not valid here, so the first token of each
  // comma-separated candidate is the local asset URL we need in the app shell.
  for (const candidate of value.split(',')) {
    const url = candidate.trim().split(/\s+/)[0];
    if (url) addAsset(url, undefined, baseDir);
  }
}

for (const match of index.matchAll(/(?:src|href|poster)=["']([^"']+)["']/gi)) {
  addAsset(match[1]);
}
for (const match of index.matchAll(/(?:srcset|imagesrcset)=["']([^"']+)["']/gi)) {
  addSrcset(match[1]);
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
  const scriptDir = path.posix.dirname(script);

  // DOM src/href/poster values resolve against the document, so keep these root-based.
  for (const match of source.matchAll(/(?:\.src|\.href|\.poster)\s*=\s*(["'`])([^"'`$]+)\1|setAttribute\(\s*(["'])\s*(?:src|href|poster)\s*\3\s*,\s*(["'`])([^"'`$]+)\4/g)) {
    addAsset(match[2] || match[5]);
  }

  // srcset properties are document-resolved URLs and may contain multiple candidates.
  for (const match of source.matchAll(/(?:\.srcset|\.imagesrcset)\s*=\s*(["'`])([^"'`$]+)\1/g)) {
    addSrcset(match[2]);
  }

  // Module imports resolve relative to the importing module, not the document.
  for (const match of source.matchAll(/(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?\s+from\s+|import\s*\(\s*)(["'`])([^"'`$]+)\1/g)) {
    addAsset(match[2], 'script', scriptDir);
  }
}

function scanStylesheet(stylesheet) {
  if (scannedStylesheets.has(stylesheet)) return;
  scannedStylesheets.add(stylesheet);
  const stylesheetPath = path.join(root, stylesheet);
  if (!fs.existsSync(stylesheetPath)) return;
  const source = fs.readFileSync(stylesheetPath, 'utf8');
  const stylesheetDir = path.posix.dirname(stylesheet);

  // CSS url(...) and @import paths resolve relative to the stylesheet.
  for (const match of source.matchAll(/url\(\s*["']?([^\)"']+)["']?\s*\)/gi)) {
    addAsset(match[1], undefined, stylesheetDir);
  }

  for (const match of source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/gi)) {
    addAsset(match[1], 'stylesheet', stylesheetDir);
  }
}

// Walk the local dependency graph until no new JS/CSS assets are discovered.
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
