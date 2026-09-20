#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const cacheMatch = sw.match(/const CACHE_NAME = ['"]([^'"]+)['"]/);
if (!cacheMatch) throw new Error('CACHE_NAME is missing from sw.js');
if (!/^mahjong-static-v\d+$/.test(cacheMatch[1])) {
  throw new Error(`Unexpected CACHE_NAME: ${cacheMatch[1]}`);
}

const shellMatch = sw.match(/const APP_SHELL = \[(.*?)\];/s);
if (!shellMatch) throw new Error('APP_SHELL is missing from sw.js');

const entries = [...shellMatch[1].matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
const normalized = entries.map(entry => entry.replace(/^\.\//, '').split(/[?#]/)[0]);
const duplicates = [...new Set(normalized.filter((entry, index) => normalized.indexOf(entry) !== index))];

if (duplicates.length) {
  throw new Error(`APP_SHELL contains duplicate assets:\n- ${duplicates.join('\n- ')}`);
}

const required = ['index.html', 'manifest.webmanifest', 'sw-register.js', 'icons/mahjong-192.svg', 'icons/mahjong-512.svg'];
const missing = required.filter(asset => !normalized.includes(asset));
if (missing.length) {
  throw new Error(`APP_SHELL is missing required runtime assets:\n- ${missing.join('\n- ')}`);
}

console.log(`Service worker contract OK: ${cacheMatch[1]}, ${entries.length} unique shell entries.`);
