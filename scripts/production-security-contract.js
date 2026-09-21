#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');

const requiredHeaders = [
  'X-Content-Type-Options "nosniff"',
  'X-Frame-Options "DENY"',
  'Referrer-Policy "strict-origin-when-cross-origin"',
  'Permissions-Policy "camera=(), microphone=(), geolocation=()"',
  'Content-Security-Policy "default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; font-src \'self\'; connect-src \'self\'; worker-src \'self\'; manifest-src \'self\'; object-src \'none\'; base-uri \'self\'; form-action \'self\'; frame-ancestors \'none\'"',
];

const missingHeaders = requiredHeaders.filter(header => !htaccess.includes(`Header always set ${header}`));
const requiredCacheRules = [
  ['FilesMatch "^sw\\.js$"', 'Header set Cache-Control "no-cache, no-store, must-revalidate"'],
  ['FilesMatch "^manifest\\.webmanifest$"', 'Header set Cache-Control "no-cache, max-age=0, must-revalidate"'],
];
const missingCacheRules = requiredCacheRules
  .filter(([matcher, header]) => {
    const start = htaccess.indexOf(matcher);
    return start === -1 || !htaccess.slice(start, start + 220).includes(header);
  })
  .map(([matcher, header]) => `${matcher} -> ${header}`);

if (missingHeaders.length || missingCacheRules.length) {
  if (missingHeaders.length) console.error(`Missing required security headers:\n- ${missingHeaders.join('\n- ')}`);
  if (missingCacheRules.length) console.error(`Missing required deployment cache rules:\n- ${missingCacheRules.join('\n- ')}`);
  process.exit(1);
}

console.log(`Production security contract OK: ${requiredHeaders.length} isolation headers and ${requiredCacheRules.length} SW/manifest cache controls are present.`);
