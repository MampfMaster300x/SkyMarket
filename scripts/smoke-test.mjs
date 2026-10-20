// Prüft den API-Ablauf ohne Netlify: Konten, Spiel mit Passwort, Suche, Beitritt per Code und Einladung, Zeit, Aktionen.
import { handle } from '../server/api.mjs';
import { memStore } from '../server/memstore.mjs';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const store = memStore();
const jar = {};
async function call(who, method, path, body) {
  const headers = { 'content-type': 'application/json' };
  if (jar[who]) headers.cookie = jar[who];
  const r = await handle(new Request('http://localhost/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), { store });
  const sc = r.headers.get('set-cookie'); if (sc) jar[who] = sc.split(';')[0];
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : r.status === 200 ? await r.arrayBuffer() : null;
  return { status: r.status, data, headers: r.headers };
}
const ok = (r, msg) => { if (r.status >= 400) throw new Error(`${msg}: ${r.status} ${JSON.stringify(r.data)}`); return r.data; };

ok(await call('anna', 'POST', '/register', { username: 'Anna', password: 'geheim123' }), 'Registrierung Anna');
assert.equal((await call('x', 'POST', '/register', { username: 'anna', password: 'geheim123' })).status, 409, 'doppelter Name');
ok(await call('ben', 'POST', '/register', { username: 'Ben', password: 'passwort1' }), 'Registrierung Ben');
ok(await call('cleo', 'POST', '/register', { username: 'Cleo', password: 'passwort2' }), 'Registrierung Cleo');
assert.equal((await call('anon', 'GET', '/games/mine')).status, 401, 'ohne Anmeldung gesperrt');
assert.equal((await call('ben2', 'POST', '/login', { username: 'ben', password: 'falsch' })).status, 401, 'falsches Passwort');

const g = ok(await call('anna', 'POST', '/games', { name: 'Freitagsrunde', password: 'flug', difficulty: 'normal', speed: 4, airline: { name: 'Hanse Air', code: 'HX', base: 'HAM' } }), 'Spiel anlegen');
console.log('Spiel', g);
const search = ok(await call('ben', 'GET', '/games/search?q=freitag'), 'Suche');
assert.equal(search.games.length, 1); assert.equal(search.games[0].locked, true);
const look = ok(await call('ben', 'GET', '/games/lookup?code=' + g.code), 'Code');
assert.equal(look.players, 1);
assert.equal((await call('ben', 'POST', `/games/${g.id}/join`, { password: 'nein', airline: { name: 'Isar Jet', code: 'IJ', base: 'MUC' } })).status, 403, 'falsches Spielpasswort');
assert.equal((await call('ben', 'POST', `/games/${g.id}/join`, { password: 'flug', airline: { name: 'Isar Jet', code: 'HX', base: 'MUC' } })).status, 400, 'Kürzel doppelt');
ok(await call('ben', 'POST', `/games/${g.id}/join`, { password: 'flug', airline: { name: 'Isar Jet', code: 'IJ', base: 'MUC' } }), 'Beitritt Ben');
const infoA = ok(await call('anna', 'GET', `/games/${g.id}/info`), 'Info');
assert.equal((await call('cleo', 'GET', `/games/${g.id}/state`)).status, 403, 'Nicht-Mitglied gesperrt');
ok(await call('cleo', 'POST', `/games/${g.id}/join`, { invite: infoA.invite, airline: { name: 'Elbe Wings', code: 'EW', base: 'BER' } }), 'Beitritt Cleo per Einladung');

let st = await call('ben', 'GET', `/games/${g.id}/state`);
assert.equal(st.status, 200);
let w = JSON.parse(gunzipSync(Buffer.from(st.data)).toString());
console.log('Airlines im Spiel:', w.airlines.filter((a) => !a.archetype).map((a) => `${a.id} ${a.name}`).join(', '), 'Tag', w.day);
const ver = st.headers.get('x-ver');
assert.equal((await call('ben', 'GET', `/games/${g.id}/state?v=${encodeURIComponent(ver)}`)).status, 204, 'unverändert → 204');

let r = ok(await call('ben', 'POST', `/games/${g.id}/action`, { action: { type: 'acquire', typeId: 'A20N', mode: 'lease' } }), 'Aktion Leasing');
assert.equal(r.ok, true);
r = ok(await call('ben', 'POST', `/games/${g.id}/action`, { action: { type: 'openRoute', base: 'MUC', dest: 'LIS', typeId: 'A20N', freq: 1 } }), 'Aktion Strecke');
assert.equal(r.ok, true);
r = ok(await call('ben', 'POST', `/games/${g.id}/action`, { action: { type: 'openRoute', base: 'HAM', dest: 'LIS', typeId: 'A20N', freq: 1 } }), 'fremde Basis');
assert.equal(r.ok, false);
assert.equal((await call('ben', 'POST', `/games/${g.id}/control`, { speed: 2 })).status, 403, 'nur Spielleitung');
ok(await call('anna', 'POST', `/games/${g.id}/control`, { speed: 4 }), 'Tempo');

// Zeit vorspulen: lastTick künstlich zurücksetzen
const meta = await store.getWithMetadata(`games/${g.id}/state`, { type: 'arrayBuffer' });
await store.set(`games/${g.id}/state`, meta.data, { metadata: { ...meta.metadata, lastTick: Date.now() - 30000 }, onlyIfMatch: meta.etag });
st = await call('anna', 'GET', `/games/${g.id}/state?v=x`);
w = JSON.parse(gunzipSync(Buffer.from(st.data)).toString());
console.log('nach 30 s bei 4×: Tag', w.day, 'Uhr', st.headers.get('x-clock'));
assert.ok(w.day >= 9);
const mine = ok(await call('cleo', 'GET', '/games/mine'), 'Meine Spiele');
assert.equal(mine.games.length, 1);
ok(await call('dora', 'POST', '/register', { username: 'Dora', password: 'passwort3' }), 'Dora');
ok(await call('dora', 'POST', `/games/${g.id}/join`, { invite: infoA.invite, airline: { name: 'Rhein Air', code: 'RA', base: 'DUS' } }), 'Beitritt Dora');
ok(await call('emil', 'POST', '/register', { username: 'Emil', password: 'passwort4' }), 'Emil');
assert.equal((await call('emil', 'POST', `/games/${g.id}/join`, { invite: infoA.invite, airline: { name: 'Fünfte Air', code: 'FA', base: 'FRA' } })).status, 409, 'max. 4');
console.log('Alle Prüfungen bestanden.');
