const { URL } = require('node:url');

const baseUrl = process.env.SITE_URL;
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 15000);

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { redirect: 'follow', ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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
  expect(root.username === '' && root.password === '', 'SITE_URL must not contain embedded credentials');

  const response = await get('index.html');
  expect(response.status === 200, `index.html returned HTTP ${response.status}`);
  expect((response.headers.get('content-type') || '').includes('text/html'), 'index.html is not served as HTML');
  expect((response.headers.get('cache-control') || '').includes('no-cache'), 'index.html is missing no-cache policy');
  expect(response.headers.get('strict-transport-security')?.includes('max-age=31536000'), 'HSTS max-age is missing');
  expect((response.headers.get('x-content-type-options') || '') === 'nosniff', 'X-Content-Type-Options is not nosniff');
  expect(response.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options is not DENY');
  expect(response.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Referrer-Policy is missing or incorrect');
  const permissionsPolicy = response.headers.get('permissions-policy') || '';
  for (const directive of ['camera=()', 'microphone=()', 'geolocation=()']) {
    expect(permissionsPolicy.replace(/\s+/g, '').includes(directive), `Permissions-Policy is missing ${directive}`);
  }
  const csp = response.headers.get('content-security-policy') || '';
  for (const directive of [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]) {
    expect(csp.includes(directive), `CSP is missing ${directive}`);
  }

  const html = await response.text();
  expect(/<link[^>]+rel=["']manifest["'][^>]+href=["'](?:\.\/)?manifest\.webmanifest["']/i.test(html), 'manifest.webmanifest is not linked from index.html');
  expect(/sw-register\.js/i.test(html), 'sw-register.js is not loaded by index.html');
  expect(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'index.html contains an inline script that CSP would block');

  const applicationAssets = [...html.matchAll(/(?:href|src)=["']([^"']+\.(?:css|js)(?:[?#][^"']*)?)["']/gi)]
    .map(match => match[1]);
  const uniqueAssets = [...new Set(applicationAssets)];
  for (const asset of uniqueAssets) {
    let assetUrl;
    try {
      assetUrl = new URL(asset, root);
    } catch (error) {
      failures.push(`Application asset ${asset} has an invalid URL: ${error.message}`);
      continue;
    }
    expect(assetUrl.origin === root.origin, `Application asset ${asset} is not same-origin`);
    if (assetUrl.origin !== root.origin) continue;
    const assetResponse = await get(asset);
    expect(assetResponse.status === 200, `Application asset ${asset} returned HTTP ${assetResponse.status}`);
    const contentType = assetResponse.headers.get('content-type') || '';
    const expectedType = assetUrl.pathname.endsWith('.css') ? 'text/css' : 'javascript';
    expect(contentType.includes(expectedType), `Application asset ${asset} has unexpected content type ${contentType || '(missing)'}`);
  }

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
      let iconUrl;
      try {
        iconUrl = new URL(icon.src, root);
      } catch (error) {
        failures.push(`Manifest icon ${icon.src} has an invalid URL: ${error.message}`);
        continue;
      }
      expect(iconUrl.origin === root.origin, `Manifest icon ${icon.src} is not same-origin`);
      if (iconUrl.origin !== root.origin) continue;
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
  const message = error.name === 'AbortError'
    ? `request timed out after ${REQUEST_TIMEOUT_MS}ms`
    : error.message;
  console.error(`Hostinger live smoke failed: ${message}`);
  process.exit(1);
});
