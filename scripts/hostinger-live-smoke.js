const { URL } = require('node:url');

const baseUrl = process.env.SITE_URL;

if (!baseUrl) {
  console.error('SITE_URL is required, for example: https://example.com');
  process.exit(2);
}

let root;
try {
  root = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
} catch (error) {
  console.error(`SITE_URL is invalid: ${error.message}`);
  process.exit(2);
}

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function get(path, options = {}) {
  const url = new URL(path, root);
  return fetch(url, { redirect: 'follow', ...options });
}

async function readJson(response, label) {
  try {
    return JSON.parse(await response.text());
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

async function check() {
  expect(root.protocol === 'https:', `SITE_URL must use HTTPS (received ${root.protocol})`);

  const response = await get('index.html');
  expect(response.status === 200, `index.html returned HTTP ${response.status}`);
  expect((response.headers.get('content-type') || '').includes('text/html'), 'index.html is not served as HTML');
  expect((response.headers.get('cache-control') || '').includes('no-cache'), 'index.html is missing no-cache policy');
  expect(response.headers.get('strict-transport-security')?.includes('max-age=31536000'), 'HSTS max-age is missing');
  expect(response.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options is not nosniff');
  expect(response.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options is not DENY');
  expect(response.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Referrer-Policy is missing or incorrect');
  const permissionsPolicy = response.headers.get('permissions-policy') || '';
  for (const directive of ['camera=()', 'microphone=()', 'geolocation=()']) {
    expect(permissionsPolicy.replace(/\s+/g, '').includes(directive), `Permissions-Policy is missing ${directive}`);
  }
  const csp = response.headers.get('content-security-policy') || '';
  expect(csp.includes("worker-src 'self'"), 'CSP is missing worker-src');
  expect(csp.includes("manifest-src 'self'"), 'CSP is missing manifest-src');

  const html = await response.text();
  expect(/<link[^>]+rel=["']manifest["'][^>]+href=["'](?:\.\/)?manifest\.webmanifest["']/i.test(html), 'manifest.webmanifest is not linked from index.html');
  expect(/sw-register\.js/i.test(html), 'sw-register.js is not loaded by index.html');

  const loader = await get('sw-register.js');
  expect(loader.status === 200, `sw-register.js returned HTTP ${loader.status}`);
  expect((loader.headers.get('content-type') || '').includes('javascript'), 'sw-register.js is not served as JavaScript');
  expect((loader.headers.get('cache-control') || '').includes('no-cache'), 'sw-register.js is missing no-cache policy');
  const loaderBody = await loader.text();
  expect(/navigator\.serviceWorker\.register\(\s*['"](?:\.\/)?sw\.js['"]/.test(loaderBody), 'sw-register.js does not register sw.js');
  expect(/updateViaCache\s*:\s*['"]none['"]/.test(loaderBody), 'sw-register.js must disable cached service-worker updates');

  const manifest = await get('manifest.webmanifest');
  expect(manifest.status === 200, `manifest.webmanifest returned HTTP ${manifest.status}`);
  expect((manifest.headers.get('cache-control') || '').includes('no-cache'), 'manifest.webmanifest is missing no-cache policy');
  expect((manifest.headers.get('content-type') || '').includes('manifest'), 'manifest.webmanifest is not served with a manifest content type');
  const manifestJson = await readJson(manifest, 'manifest.webmanifest');
  if (manifestJson) {
    expect(typeof manifestJson.name === 'string' && manifestJson.name.length > 0, 'manifest.name is missing');
    expect(typeof manifestJson.start_url === 'string' && manifestJson.start_url.length > 0, 'manifest.start_url is missing');
    expect(typeof manifestJson.scope === 'string' && manifestJson.scope.length > 0, 'manifest.scope is missing');
    expect(manifestJson.display === 'standalone', `manifest.display should be standalone (received ${manifestJson.display})`);
    expect(Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 1, 'manifest.icons is missing');
    for (const icon of manifestJson.icons || []) {
      const iconResponse = await get(icon.src);
      expect(iconResponse.status === 200, `Manifest icon ${icon.src} returned HTTP ${iconResponse.status}`);
      expect((iconResponse.headers.get('content-type') || '').includes(icon.type || 'image/'), `Manifest icon ${icon.src} has unexpected content type`);
      expect((iconResponse.headers.get('cache-control') || '').includes('public'), `Manifest icon ${icon.src} is missing a public cache policy`);
    }
  }

  const sw = await get('sw.js');
  expect(sw.status === 200, `sw.js returned HTTP ${sw.status}`);
  expect((sw.headers.get('cache-control') || '').includes('no-cache'), 'sw.js is missing no-cache policy');
  const swBody = await sw.text();
  expect(/addEventListener\(['"]install['"]/.test(swBody), 'sw.js has no install handler');
  expect(/addEventListener\(['"]activate['"]/.test(swBody), 'sw.js has no activate handler');
  expect(/addEventListener\(['"]fetch['"]/.test(swBody), 'sw.js has no fetch handler');

  const missing = await get('__mahjong-hostinger-smoke-404__');
  expect(missing.status === 404, `missing route returned HTTP ${missing.status} instead of 404`);
  expect((await missing.text()).includes('Page not found'), '404 fallback content is unexpected');

  if (failures.length) {
    console.error(failures.map(message => `FAIL: ${message}`).join('\n'));
    process.exit(1);
  }

  console.log(`Hostinger live smoke passed: ${root.origin}`);
}

check().catch(error => {
  console.error(`Hostinger live smoke failed: ${error.message}`);
  process.exit(1);
});
