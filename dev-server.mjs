// Lokaler Testserver ohne Netlify: liefert public/ aus und beantwortet /api/* mit demselben Code wie die Netlify Function.
// Start: npm run local  →  http://localhost:8888
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handle } from './server/api.mjs';
import { memStore } from './server/memstore.mjs';

const PORT = Number(process.env.PORT || 8888);
const store = memStore(process.env.SKY_DATA_FILE || '.local-data.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const r = await handle(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), { store });
      const headers = {}; r.headers.forEach((v, k) => { headers[k] = v; });
      res.writeHead(r.status, headers);
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let file = path.join('public', decodeURIComponent(url.pathname));
    if (!file.startsWith('public') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join('public', 'index.html');
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { console.error(e); res.writeHead(500); res.end('Fehler'); }
}).listen(PORT, () => console.log(`SKYMARKET läuft lokal auf http://localhost:${PORT}`));
