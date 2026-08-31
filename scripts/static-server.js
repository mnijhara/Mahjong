const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const safePath = requestPath => {
  try {
    const decoded = decodeURIComponent(requestPath.split('?')[0]);
    const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const candidate = path.resolve(root, relative);
    return candidate.startsWith(`${root}${path.sep}`) ? candidate : null;
  } catch {
    return null;
  }
};

const server = http.createServer((req, res) => {
  let file = safePath(req.url || '/');
  const invalidPath = !file;

  if (invalidPath || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    file = path.join(root, '404.html');
    res.statusCode = invalidPath ? 400 : 404;
  } else {
    res.statusCode = 200;
  }

  const ext = path.extname(file).toLowerCase();
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=3600');

  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.end('Method not allowed');
    return;
  }

  fs.createReadStream(file).on('error', () => {
    if (!res.headersSent) res.statusCode = 500;
    res.end('Server error');
  }).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Static server listening on http://127.0.0.1:${port}`);
});
