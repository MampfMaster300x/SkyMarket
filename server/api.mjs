// SKYMARKET Online-API: Konten, Spiele (bis 4 Airlines), Zeitfortschritt und Aktionen.
// Der Server ist maßgeblich: Er hält den Spielstand und rechnet die Tage mit derselben Engine wie der Browser.
import { scryptSync, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import SM from '../shared/engine.cjs';

const MAX_PLAYERS = 4;
const MAX_DAYS_PER_TICK = 20;          // Aufholen höchstens 20 Tage je Anfrage
const IDLE_CAP_MS = 60000;              // Ohne Anfragen läuft höchstens eine Minute Spielzeit nach
const SESSION_DAYS = 30;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const enc = new TextEncoder();

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const fail = (status, error) => json({ error }, status);
const rnd = (n, chars = CODE_CHARS) => { const b = randomBytes(n); let s = ''; for (let i = 0; i < n; i++) s += chars[b[i] % chars.length]; return s; };
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const msPerDay = (speed) => (speed > 0 ? 12000 / speed : Infinity);
const toArrayBuffer = (u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
async function readJson(req) { try { return await req.json(); } catch (e) { return {}; } }
function hashPw(password, salt = b64u(randomBytes(16))) {
  return { salt, hash: scryptSync(password.normalize('NFKC'), salt, 64, { N: 16384, r: 8, p: 1 }).toString('base64url') };
}
function checkPw(password, salt, hash) {
  const h = scryptSync(String(password).normalize('NFKC'), salt, 64, { N: 16384, r: 8, p: 1 });
  const ref = Buffer.from(hash, 'base64url');
  return ref.length === h.length && timingSafeEqual(ref, h);
}
const cleanName = (s, max) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

// ---------------------------------------------------------------------------
// Sitzung: signiertes Cookie (HMAC), Geheimnis aus SESSION_SECRET oder einmalig im Speicher angelegt
// ---------------------------------------------------------------------------
let secretCache = null;
async function secret(store) {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (secretCache) return secretCache;
  let s = await store.get('config/secret');
  if (!s) { const fresh = b64u(randomBytes(32)); await store.set('config/secret', fresh, { onlyIfNew: true }); s = await store.get('config/secret'); }
  return (secretCache = s);
}
async function makeCookie(store, req, user) {
  const payload = b64u(enc.encode(JSON.stringify({ u: user.key, n: user.name, e: Date.now() + SESSION_DAYS * 864e5 })));
  const sig = createHmac('sha256', await secret(store)).update(payload).digest('base64url');
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `sm_session=${payload}.${sig}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}
async function sessionUser(store, req) {
  const m = /(?:^|;\s*)sm_session=([^;]+)/.exec(req.headers.get('cookie') || '');
  if (!m) return null;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return null;
  const good = createHmac('sha256', await secret(store)).update(payload).digest();
  const got = Buffer.from(sig, 'base64url');
  if (got.length !== good.length || !timingSafeEqual(got, good)) return null;
  try { const d = JSON.parse(Buffer.from(payload, 'base64url').toString()); return d.e > Date.now() ? { key: d.u, name: d.n } : null; } catch (e) { return null; }
}

// ---------------------------------------------------------------------------
// Speicher: Schlüssel
// ---------------------------------------------------------------------------
const K = {
  user: (k) => `users/${k}`, meta: (id) => `games/${id}/meta`, state: (id) => `games/${id}/state`, presence: (id) => `games/${id}/presence`,
  code: (c) => `codes/${c}`, index: 'index/games',
};
async function updateJson(store, key, fn, init = null, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const cur = await store.getWithMetadata(key, { type: 'json' });
    const base = cur ? cur.data : init;
    const next = fn(base === null ? null : structuredClone(base));
    if (next === undefined) return base;
    const res = cur ? await store.setJSON(key, next, { onlyIfMatch: cur.etag }) : await store.setJSON(key, next, { onlyIfNew: true });
    if (res.modified !== false) return next;
  }
  throw Object.assign(new Error('Gerade viel Betrieb, bitte noch einmal versuchen.'), { status: 409 });
}
const summary = (meta, extra = {}) => ({ id: meta.id, name: meta.name, code: meta.code, players: meta.players.length, max: meta.max, locked: !!meta.pw, created: meta.created,
  names: meta.players.map((p) => p.airlineName), ...extra });
async function indexUpsert(store, meta) {
  await updateJson(store, K.index, (list) => { list = (list || []).filter((g) => g.id !== meta.id); list.unshift(summary(meta)); return list.slice(0, 500); }, []);
}

// ---------------------------------------------------------------------------
// Spielstand und Zeit
// ---------------------------------------------------------------------------
function packWorld(w) { return toArrayBuffer(gzipSync(Buffer.from(JSON.stringify(SM.serialize(w))))); }
function unpackWorld(buf) {
  const s = JSON.parse(gunzipSync(Buffer.from(buf)).toString());
  let w = SM.deserialize(s);
  // Notfall: sehr große Stände kompakter ablegen
  return w;
}
function packSized(w) {
  let buf = packWorld(w);
  if (buf.byteLength > 4.5e6) buf = toArrayBuffer(gzipSync(Buffer.from(JSON.stringify(SM.serialize(w, { compact: true })))));
  return buf;
}
function clockDue(md, now) {
  const speed = md.speed || 0;
  if (!(speed > 0)) return { days: 0, carry: md.carry || 0 };
  const el = Math.min(Math.max(0, now - (md.lastTick || now)), IDLE_CAP_MS);
  const total = (md.carry || 0) + el, per = msPerDay(speed);
  const days = Math.floor(total / per);
  return { days: Math.min(days, MAX_DAYS_PER_TICK), carry: days > MAX_DAYS_PER_TICK ? 0 : total - days * per };
}
/** Lädt den Stand, lässt fällige Tage laufen, wendet optional eine Änderung an und speichert mit Versionsprüfung. */
async function mutateState(store, id, fn = null) {
  for (let i = 0; i < 5; i++) {
    const now = Date.now();
    const cur = await store.getWithMetadata(K.state(id), { type: 'arrayBuffer' });
    if (!cur) throw Object.assign(new Error('Spiel nicht gefunden.'), { status: 404 });
    const md = { ...cur.metadata };
    const due = clockDue(md, now);
    if (!fn && due.days === 0) return { etag: cur.etag, md, buf: cur.data, changed: false };
    const w = unpackWorld(cur.data);
    for (let d = 0; d < due.days; d++) w.step();
    if (due.days > 0) { md.carry = due.carry; md.lastTick = now; }
    let result = null;
    if (fn) result = fn(w, md, now);
    md.day = w.day; md.ver = (md.ver || 0) + 1;
    const buf = packSized(w);
    const res = await store.set(K.state(id), buf, { metadata: md, onlyIfMatch: cur.etag });
    if (res.modified !== false) return { etag: res.etag, md, buf, changed: true, result, w };
  }
  throw Object.assign(new Error('Gerade viel Betrieb, bitte noch einmal versuchen.'), { status: 409 });
}
async function loadMeta(store, id) { return store.get(K.meta(id), { type: 'json' }); }
function memberOf(meta, user) { return meta && meta.players.find((p) => p.u === user.key); }
function clockHeader(md) { return JSON.stringify({ speed: md.speed || 0, lastTick: md.lastTick || Date.now(), carry: md.carry || 0, now: Date.now(), day: md.day || 0 }); }

// ---------------------------------------------------------------------------
// Validierung
// ---------------------------------------------------------------------------
function validAirline(a, meta = null) {
  const name = cleanName(a && a.name, 28), code = String((a && a.code) || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2), base = String((a && a.base) || '');
  if (name.length < 2) return { error: 'Bitte einen Airline-Namen mit mindestens 2 Zeichen angeben.' };
  if (code.length !== 2) return { error: 'Das Kürzel braucht genau 2 Buchstaben oder Ziffern.' };
  if (!SM.P.AIRPORTS[base]) return { error: 'Bitte eine Heimatbasis wählen.' };
  if (meta && meta.players.some((p) => p.code === code)) return { error: `Das Kürzel ${code} ist in diesem Spiel schon vergeben.` };
  if (meta && meta.players.some((p) => p.airlineName.toLowerCase() === name.toLowerCase())) return { error: 'Diesen Airline-Namen gibt es in diesem Spiel schon.' };
  return { name, code, base };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export async function handle(req, { store }) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
    const method = req.method.toUpperCase();
    const parts = path.split('/').filter(Boolean);

    // ---- Konten ----
    if (path === '/register' && method === 'POST') {
      const { username, password } = await readJson(req);
      const name = cleanName(username, 20);
      if (!/^[\p{L}\p{N}_-]{3,20}$/u.test(name)) return fail(400, 'Benutzername: 3–20 Zeichen, nur Buchstaben, Ziffern, _ und -.');
      if (typeof password !== 'string' || password.length < 8 || password.length > 200) return fail(400, 'Das Passwort braucht mindestens 8 Zeichen.');
      const key = name.toLowerCase();
      const { salt, hash } = hashPw(password);
      const res = await store.setJSON(K.user(key), { key, name, salt, hash, created: Date.now(), games: [] }, { onlyIfNew: true });
      if (res.modified === false) return fail(409, 'Diesen Benutzernamen gibt es schon.');
      return json({ name, key }, 200, { 'set-cookie': await makeCookie(store, req, { key, name }) });
    }
    if (path === '/login' && method === 'POST') {
      const { username, password } = await readJson(req);
      const key = cleanName(username, 20).toLowerCase();
      const u = key ? await store.get(K.user(key), { type: 'json' }) : null;
      if (!u || !checkPw(password || '', u.salt, u.hash)) return fail(401, 'Benutzername oder Passwort stimmt nicht.');
      return json({ name: u.name, key }, 200, { 'set-cookie': await makeCookie(store, req, u) });
    }
    if (path === '/logout' && method === 'POST') return json({ ok: true }, 200, { 'set-cookie': 'sm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' });

    const user = await sessionUser(store, req);
    if (path === '/me') return user ? json({ name: user.name, key: user.key }) : fail(401, 'Nicht angemeldet.');
    if (!user) return fail(401, 'Bitte zuerst anmelden.');

    // ---- Spielelisten ----
    if (path === '/games/mine' && method === 'GET') {
      const u = await store.get(K.user(user.key), { type: 'json' });
      const metas = (await Promise.all((u && u.games ? u.games : []).slice(-30).map((id) => loadMeta(store, id)))).filter(Boolean);
      const out = [];
      for (const m of metas.reverse()) {
        const st = await store.getMetadata(K.state(m.id));
        out.push(summary(m, { member: true, host: m.host === user.key, day: st && st.metadata ? st.metadata.day || 0 : 0 }));
      }
      return json({ games: out });
    }
    if (path === '/games/search' && method === 'GET') {
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const list = (await store.get(K.index, { type: 'json' })) || [];
      const u = await store.get(K.user(user.key), { type: 'json' });
      const mine = new Set((u && u.games) || []);
      const hits = list.filter((g) => (q ? g.name.toLowerCase().includes(q) || g.code.toLowerCase() === q : g.players < g.max)).slice(0, 30)
        .map((g) => ({ ...g, member: mine.has(g.id) }));
      return json({ games: hits });
    }
    if (path === '/games/lookup' && method === 'GET') {
      const code = String(url.searchParams.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const id = code ? await store.get(K.code(code)) : null;
      const meta = id ? await loadMeta(store, id) : null;
      if (!meta) return fail(404, `Kein Spiel mit dem Code ${code || '–'} gefunden.`);
      const t = url.searchParams.get('t');
      const st = await store.getMetadata(K.state(meta.id));
      return json({ ...summary(meta), day: st && st.metadata ? st.metadata.day || 0 : 0, member: !!memberOf(meta, user), tokenOk: !!t && t === meta.invite, codes: meta.players.map((p) => p.code) });
    }

    // ---- Neues Spiel ----
    if (path === '/games' && method === 'POST') {
      const body = await readJson(req);
      const name = cleanName(body.name, 40);
      if (name.length < 3) return fail(400, 'Der Spielname braucht mindestens 3 Zeichen.');
      const al = validAirline(body.airline); if (al.error) return fail(400, al.error);
      const difficulty = SM.DIFFICULTY[body.difficulty] ? body.difficulty : 'normal';
      const speed = [0, 1, 2, 4].includes(Number(body.speed)) ? Number(body.speed) : 1;
      const pw = typeof body.password === 'string' && body.password.length ? body.password.slice(0, 200) : null;
      const id = rnd(10, 'abcdefghijkmnpqrstuvwxyz23456789');
      let code = null;
      for (let i = 0; i < 8 && !code; i++) { const c = rnd(6); const r = await store.set(K.code(c), id, { onlyIfNew: true }); if (r.modified !== false) code = c; }
      if (!code) return fail(500, 'Kein freier Code gefunden, bitte noch einmal versuchen.');
      const w = SM.newWorld({ difficulty, seed: randomBytes(4).readUInt32LE(0) });
      const h = SM.addHuman(w, { name: al.name, code: al.code, base: al.base, owner: user.key });
      w.playerId = h.id;
      const now = Date.now();
      await store.set(K.state(id), packSized(w), { metadata: { speed, lastTick: now, carry: 0, day: w.day, ver: 1 }, onlyIfNew: true });
      const meta = { id, name, code, invite: rnd(16, 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'), host: user.key, hostName: user.name, created: now, difficulty, max: MAX_PLAYERS,
        pw: pw ? hashPw(pw) : null, players: [{ u: user.key, name: user.name, airlineId: h.id, airlineName: al.name, code: al.code, base: al.base, joined: now }] };
      await store.setJSON(K.meta(id), meta);
      await updateJson(store, K.user(user.key), (u) => { if (!u) return undefined; u.games = [...new Set([...(u.games || []), id])]; return u; });
      await indexUpsert(store, meta);
      return json({ id, code });
    }

    // ---- Spielbezogene Endpunkte ----
    if (parts[0] === 'games' && parts.length >= 3) {
      const id = parts[1], op = parts[2];
      const meta = await loadMeta(store, id);
      if (!meta) return fail(404, 'Spiel nicht gefunden.');

      if (op === 'join' && method === 'POST') {
        if (memberOf(meta, user)) return json({ ok: true, already: true });
        const body = await readJson(req);
        if (meta.players.length >= meta.max) return fail(409, 'Das Spiel ist voll.');
        const viaInvite = body.invite && body.invite === meta.invite;
        if (meta.pw && !viaInvite && !checkPw(body.password || '', meta.pw.salt, meta.pw.hash)) return fail(403, 'Das Passwort stimmt nicht.');
        const al = validAirline(body.airline, meta); if (al.error) return fail(400, al.error);
        let airlineId = null;
        await mutateState(store, id, (w) => {
          if (w.humans.length >= MAX_PLAYERS) throw Object.assign(new Error('Das Spiel ist voll.'), { status: 409 });
          const hmn = SM.addHuman(w, { name: al.name, code: al.code, base: al.base, owner: user.key });
          airlineId = hmn.id;
        });
        const next = await updateJson(store, K.meta(id), (m) => { m.players = m.players.filter((p) => p.u !== user.key); m.players.push({ u: user.key, name: user.name, airlineId, airlineName: al.name, code: al.code, base: al.base, joined: Date.now() }); return m; });
        await updateJson(store, K.user(user.key), (u) => { if (!u) return undefined; u.games = [...new Set([...(u.games || []), id])]; return u; });
        await indexUpsert(store, next);
        return json({ ok: true, airlineId });
      }

      const me = memberOf(meta, user);
      if (!me) return fail(403, 'Sie sind in diesem Spiel nicht angemeldet.');

      if (op === 'info' && method === 'GET') {
        const pres = (await store.get(K.presence(id), { type: 'json' })) || {};
        const now = Date.now();
        return json({ id, name: meta.name, code: meta.code, invite: meta.invite, max: meta.max, locked: !!meta.pw,
          me: { airlineId: me.airlineId, host: meta.host === user.key },
          players: meta.players.map((p) => ({ name: p.name, airlineId: p.airlineId, airlineName: p.airlineName, code: p.code, host: meta.host === p.u, online: now - (pres[p.u] || 0) < 45000 })) });
      }
      if (op === 'state' && method === 'GET') {
        if (url.searchParams.get('ping')) {
          try { await updateJson(store, K.presence(id), (p) => ({ ...(p || {}), [user.key]: Date.now() }), {}, 2); } catch (e) { /* Anwesenheit ist nicht kritisch */ }
        }
        const r = await mutateState(store, id, null);
        const md = r.md, v = url.searchParams.get('v') || '';
        const headers = { 'x-ver': r.etag || String(md.ver), 'x-clock': clockHeader(md), 'cache-control': 'no-store', 'access-control-expose-headers': 'x-ver, x-clock' };
        if (v && v === headers['x-ver']) return new Response(null, { status: 204, headers });
        return new Response(r.buf, { status: 200, headers: { ...headers, 'content-type': 'application/octet-stream' } });
      }
      if (op === 'action' && method === 'POST') {
        const { action } = await readJson(req);
        if (!action || typeof action !== 'object' || typeof action.type !== 'string') return fail(400, 'Ungültige Aktion.');
        const r = await mutateState(store, id, (w) => SM.applyAction(w, me.airlineId, action));
        const res = r.result || { ok: false };
        return json({ ok: !!res.ok, msg: res.msg || null, ver: r.etag, day: r.md.day });
      }
      if (op === 'control' && method === 'POST') {
        if (meta.host !== user.key) return fail(403, 'Nur die Spielleitung ändert das Tempo.');
        const { speed } = await readJson(req);
        if (![0, 1, 2, 4].includes(Number(speed))) return fail(400, 'Ungültiges Tempo.');
        const r = await mutateState(store, id, (w, md, now) => { md.speed = Number(speed); md.lastTick = now; });
        return json({ ok: true, clock: JSON.parse(clockHeader(r.md)) });
      }
      if (op === 'delete' && method === 'POST') {
        if (meta.host !== user.key) return fail(403, 'Nur die Spielleitung kann das Spiel löschen.');
        await store.delete(K.state(id)); await store.delete(K.meta(id)); await store.delete(K.code(meta.code)); await store.delete(K.presence(id));
        await updateJson(store, K.index, (list) => (list || []).filter((g) => g.id !== id), []);
        for (const p of meta.players) await updateJson(store, K.user(p.u), (u) => { if (!u) return undefined; u.games = (u.games || []).filter((g) => g !== id); return u; });
        return json({ ok: true });
      }
    }
    return fail(404, 'Unbekannter Endpunkt.');
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    if (status === 500) console.error(e);
    return fail(status, status === 500 ? 'Interner Fehler auf dem Server.' : e.message);
  }
}
