const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');

const requiredHeaders = [
  'Header always set X-Content-Type-Options "nosniff"',
  'Header always set X-Frame-Options "DENY"',
  'Header always set Referrer-Policy "strict-origin-when-cross-origin"',
  'Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"',
  'Header always set Content-Security-Policy "default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; font-src \'self\'; connect-src \'self\'; object-src \'none\'; base-uri \'self\'; form-action \'self\'; frame-ancestors \'none\'"'
];

for (const header of requiredHeaders) {
  if (!htaccess.includes(header)) {
    throw new Error(`Missing production security header: ${header}`);
  }
}

const requiredCacheBlocks = [
  ['<FilesMatch "\\.(html?)$">', 'Header set Cache-Control "no-cache, no-store, must-revalidate"'],
  ['<FilesMatch "\\.(css|js|svg)$">', 'Header set Cache-Control "public, max-age=604800"'],
  ['<FilesMatch "^sw\\.js$">', 'Header set Cache-Control "no-cache, no-store, must-revalidate"'],
  ['<FilesMatch "^manifest\\.webmanifest$">', 'Header set Cache-Control "no-cache, max-age=0, must-revalidate"']
];

for (const [matcher, header] of requiredCacheBlocks) {
  const start = htaccess.indexOf(matcher);
  if (start === -1 || !htaccess.slice(start, start + 240).includes(header)) {
    throw new Error(`Missing production cache rule: ${matcher} -> ${header}`);
  }
}

if (!/^ErrorDocument 404 \/404\.html$/m.test(htaccess)) {
  throw new Error('Production 404 fallback is missing.');
}

console.log(`Validated ${requiredHeaders.length} security headers, ${requiredCacheBlocks.length} cache rules, and the production 404 fallback.`);
