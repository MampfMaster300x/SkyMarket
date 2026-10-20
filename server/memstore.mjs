// Einfacher Speicher für lokale Tests (gleiche Schnittstelle wie Netlify Blobs, inkl. ETag-Prüfung).
// Optional dauerhaft in einer JSON-Datei, damit ein Neustart des lokalen Servers nichts verliert.
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
export function memStore(file = null) {
  const m = new Map();
  if (file && fs.existsSync(file)) {
    for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')))) m.set(k, { ...v, value: v.bin ? new Uint8Array(Buffer.from(v.value, 'base64')) : v.value });
  }
  let t = null;
  const persist = () => {
    if (!file) return;
    clearTimeout(t);
    t = setTimeout(() => {
      const o = {};
      for (const [k, v] of m) o[k] = { ...v, bin: v.value instanceof Uint8Array, value: v.value instanceof Uint8Array ? Buffer.from(v.value).toString('base64') : v.value };
      fs.writeFileSync(file, JSON.stringify(o));
    }, 200);
  };
  const conv = (v, type) => {
    if (v === undefined) return null;
    if (type === 'json') return JSON.parse(typeof v === 'string' ? v : Buffer.from(v).toString());
    if (type === 'arrayBuffer') { const u = typeof v === 'string' ? new TextEncoder().encode(v) : v; return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength); }
    return typeof v === 'string' ? v : Buffer.from(v).toString();
  };
  const api = {
    async get(key, o = {}) { const e = m.get(key); return e ? conv(e.value, o.type) : null; },
    async getWithMetadata(key, o = {}) { const e = m.get(key); if (!e) return null; return { data: o.etag && o.etag === e.etag ? null : conv(e.value, o.type), etag: e.etag, metadata: e.metadata || {} }; },
    async getMetadata(key) { const e = m.get(key); return e ? { etag: e.etag, metadata: e.metadata || {} } : null; },
    async set(key, value, o = {}) {
      const e = m.get(key);
      if (o.onlyIfNew && e) return { modified: false };
      if (o.onlyIfMatch && (!e || e.etag !== o.onlyIfMatch)) return { modified: false };
      const v = typeof value === 'string' ? value : new Uint8Array(value instanceof ArrayBuffer ? value : value.buffer ? value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) : value);
      const etag = '"' + randomBytes(8).toString('hex') + '"';
      m.set(key, { value: v, metadata: o.metadata || {}, etag }); persist();
      return { modified: true, etag };
    },
    async setJSON(key, value, o = {}) { return api.set(key, JSON.stringify(value), o); },
    async delete(key) { m.delete(key); persist(); },
    async list({ prefix = '' } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: m.get(key).etag })), directories: [] }; },
  };
  return api;
}
