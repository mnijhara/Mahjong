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
for (const match of index.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
  const asset = normalize(match[1]);
  if (asset) referenced.add(asset);
  if (asset && /\.js$/i.test(asset)) scripts.add(asset);
}

for (const icon of manifest.icons || []) {
  const asset = normalize(icon.src);
  if (asset) referenced.add(asset);
}

// Protect the offline shell from scripts that dynamically load additional
// local assets after the initial HTML parse (for example, the Solitaire
// viewport fitter). These requests are invisible to the index.html-only scan.
for (const script of scripts) {
  const scriptPath = path.join(root, script);
  if (!fs.existsSync(scriptPath)) continue;
  const source = fs.readFileSync(scriptPath, 'utf8');
  for (const match of source.matchAll(/(?:\.src\s*=|setAttribute\(\s*["']src["']\s*,\s*)["']([^"']+)["']/g)) {
    const asset = normalize(match[1]);
    if (asset) referenced.add(asset);
  }
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
  if (missingFromShell.length) console.error(`Referenced by index.html/manifest/dynamic local scripts but absent from APP_SHELL:\n- ${missingFromShell.join('\n- ')}`);
  if (missingFiles.length) console.error(`Listed by APP_SHELL but missing from repository:\n- ${missingFiles.join('\n- ')}`);
  process.exit(1);
}

console.log(`PWA shell parity OK: ${referenced.size} document/manifest/dynamic assets verified against APP_SHELL; ${shell.size} shell entries checked for local files.`);
