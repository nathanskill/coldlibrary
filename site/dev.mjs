// Local preview: node site/dev.mjs  →  http://localhost:4178
// Serves site/dist with clean URLs. /api is mocked (no database, no email): the code is always 000000.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const port = Number(process.env.PORT || 4178);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };
const mock = { librarians: [{ uid: 1, penName: 'Founding Librarian', since: '2026-10-04' }], lamps: {} };
const hashes = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../api/_lib/lamp-hashes.json'), 'utf8'));

function json(res, status, body) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); }

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    let raw = ''; req.on('data', (c) => (raw += c)); req.on('end', () => {
      const body = raw ? JSON.parse(raw) : {};
      if (url.pathname === '/api/librarians/list') return json(res, 200, { librarians: mock.librarians.map((l) => ({ ...l, penName: l.uid === 1 && url.searchParams.get('lang') === 'zh' ? '创始馆员' : l.penName })), total: mock.librarians.length });
      if (url.pathname === '/api/librarians/register') return json(res, 200, { ok: true, mock: true });
      if (url.pathname === '/api/librarians/confirm') {
        if (body.code !== '000000') return json(res, 400, { message: 'That code did not match. (mock: use 000000)' });
        const uid = 100000 + Math.floor(Math.random() * 899999);
        mock.librarians.push({ uid, penName: 'mock', since: new Date().toISOString().slice(0, 10) });
        return json(res, 200, { uid, penName: body.penName || 'Test Librarian', since: new Date().toISOString().slice(0, 10) });
      }
      if (url.pathname === '/api/lamps' && req.method === 'GET') { const l = mock.lamps[url.searchParams.get('item')] || []; return json(res, 200, { count: l.length, notes: l.filter((x) => x.text) }); }
      if (url.pathname === '/api/lamps') {
        const h = hashes[body.item];
        if (!h || createHash('sha256').update(String(body.token)).digest('hex') !== h.hash) return json(res, 403, { message: 'Only recognised visitors can light a lamp. (mock)' });
        (mock.lamps[body.item] ||= []).unshift({ text: body.note || null, at: new Date().toISOString() });
        return json(res, 200, { ok: true });
      }
      if (url.pathname === '/api/items/submit') return json(res, 200, { ok: true, id: 'S-mock', mock: true, bytes: JSON.stringify(body.item || {}).length });
      if (url.pathname === '/api/items/confirm') return body.code === '000000' ? json(res, 200, { ok: true }) : json(res, 400, { message: 'mock: use 000000' });
      return json(res, 200, { ok: true, db: false, mail: false, mock: true });
    });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  let file = join(dist, p);
  if (p === '/') file = join(dist, 'index.html');
  else if (!extname(p)) file = join(dist, p.replace(/\/$/, '') + '.html');
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': types['.html'] });
    return res.end(readFileSync(join(dist, p.startsWith('/zh') ? 'zh/404.html' : '404.html')));
  }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`Cold Library preview on http://localhost:${port}`));
