const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(message); };

const requiredFiles = [
  'index.html',
  'sw.js',
  'sw-register.js',
  'manifest.webmanifest',
  '.htaccess'
];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing deployment file: ${file}`);
}

const index = read('index.html');
const sw = read('sw.js');
const swRegister = read('sw-register.js');
const manifest = read('manifest.webmanifest');
const htaccess = read('.htaccess');

if (!/^<!doctype html>/i.test(index.trim())) fail('index.html is missing a standards doctype');
if (!/<meta[^>]+name=["']viewport["'][^>]+content=/i.test(index)) fail('index.html is missing a viewport meta tag');
if (!/<link[^>]+rel=["']manifest["'][^>]+href=["'](?:\.\/)?manifest\.webmanifest["']/i.test(index)) fail('index.html is missing the canonical manifest link');
if (!/sw-register\.js(?:["'])/i.test(index)) fail('index.html is missing the service-worker loader script');
if (!/navigator\.serviceWorker\.register\(\s*['"](?:\.\/)?sw\.js['"]/.test(swRegister)) fail('sw-register.js is missing service-worker registration');
if (!/updateViaCache:\s*['"]none['"]/.test(swRegister)) fail('sw-register.js must disable cached service-worker script updates');
if (!/self\.addEventListener\(['"]fetch['"]/.test(sw)) fail('sw.js is missing a fetch handler');
if (!/self\.addEventListener\(['"]install['"]/.test(sw)) fail('sw.js is missing an install handler');
if (!/self\.addEventListener\(['"]activate['"]/.test(sw)) fail('sw.js is missing an activate handler');

let manifestJson;
try { manifestJson = JSON.parse(manifest); } catch (error) { fail(`manifest.webmanifest is invalid JSON: ${error.message}`); }
if (!manifestJson.name || !manifestJson.short_name) fail('manifest.webmanifest needs name and short_name');
if (!manifestJson.start_url) fail('manifest.webmanifest needs start_url');
if (!manifestJson.display) fail('manifest.webmanifest needs display mode');

const requiredHeaders = [
  ['Strict-Transport-Security', 'max-age=31536000'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'SAMEORIGIN'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'geolocation=(), microphone=(), camera=()']
];
for (const [name, value] of requiredHeaders) {
  if (!new RegExp(`Header\\s+set\\s+${name}\\s+"?${value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`, 'i').test(htaccess)) {
    fail(`.htaccess is missing required security header: ${name}`);
  }
}

if (!/Header\s+set\s+Cache-Control\s+"no-cache,\s*no-store,\s*must-revalidate"[\s\S]*?<\/FilesMatch>/i.test(htaccess)) {
  fail('HTML cache policy must prevent stale entry documents');
}
if (!/FilesMatch\s+"\^sw\\\\\.js\$"[\s\S]*?no-cache,\s*no-store,\s*must-revalidate/i.test(htaccess)) {
  fail('sw.js cache policy must prevent stale service workers');
}
if (!/worker-src\s+'self'/.test(htaccess) || !/manifest-src\s+'self'/.test(htaccess)) {
  fail('CSP must explicitly scope workers and the web app manifest');
}

if (/localhost|127\.0\.0\.1/.test(manifestJson.start_url)) fail('Manifest start_url must not point to a local development host');

console.log('Hostinger deployment preflight passed');
