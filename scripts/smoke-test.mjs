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

const g = ok(await call('anna', 'POST', '/games', { name: 'Freitagsrunde', password: 'flug', difficulty: 'normal', speed: 'x4', airline: { name: 'Hanse Air', code: 'HX', base: 'HAM' } }), 'Spiel anlegen');
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
assert.equal((await call('ben', 'POST', `/games/${g.id}/control`, { speed: 'x2' })).status, 403, 'nur Spielleitung');
ok(await call('anna', 'POST', `/games/${g.id}/control`, { speed: 'x4' }), 'Tempo');

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
// Echtzeit: läuft offline weiter
ok(await call('anna', 'POST', `/games/${g.id}/control`, { speed: 'h1', tz: -120 }), 'Langzeit');
const m2 = await store.getWithMetadata(`games/${g.id}/state`, { type: 'arrayBuffer' });
const d0 = m2.metadata.day;
await store.set(`games/${g.id}/state`, m2.data, { metadata: { ...m2.metadata, lastTick: Date.now() - 5 * 3600000 }, onlyIfMatch: m2.etag });
st = await call('anna', 'GET', `/games/${g.id}/state?v=y`);
w = JSON.parse(gunzipSync(Buffer.from(st.data)).toString());
console.log('Langzeit: 5 Std. offline →', w.day - d0, 'Tage');
assert.equal(w.day - d0, 5);
ok(await call('anna', 'POST', `/games/${g.id}/control`, { speed: 'rt', tz: -120 }), 'Echtzeit');
console.log('Echtzeit-Uhr', st.headers.get('x-clock'));
assert.equal((await call('anna', 'POST', `/games/${g.id}/control`, { speed: 'x10' })).status, 400, 'Turbo nur offline');
// Handel zwischen Menschen: Ben verkauft Anna sein Flugzeug, Cleo darf nicht annehmen, Anna nimmt an
ok(await call('anna', 'POST', `/games/${g.id}/control`, { speed: 'p' }), 'Pause für Handel');
let ws = JSON.parse(gunzipSync(Buffer.from((await call('ben', 'GET', `/games/${g.id}/state?v=t1`)).data)).toString());
const benAl = ws.airlines.find((a) => a.name === 'Isar Jet'), annaAl = ws.airlines.find((a) => a.name === 'Hanse Air');
const benAc = benAl.fleet[0].id;
r = ok(await call('ben', 'POST', `/games/${g.id}/action`, { action: { type: 'dealPropose', to: annaAl.id, give: [{ k: 'ac', id: benAc }], take: [{ k: 'cash', amount: 250000 }], note: 'Test' } }), 'Angebot');
assert.equal(r.ok, true); assert.equal(r.status, 'open');
const dealId = r.id;
r = ok(await call('cleo', 'POST', `/games/${g.id}/action`, { action: { type: 'dealRespond', id: dealId, choice: 'accept' } }), 'fremde Annahme');
assert.equal(r.ok, false);
r = ok(await call('anna', 'POST', `/games/${g.id}/action`, { action: { type: 'dealRespond', id: dealId, choice: 'accept' } }), 'Annahme');
assert.equal(r.ok, true, JSON.stringify(r));
ws = JSON.parse(gunzipSync(Buffer.from((await call('anna', 'GET', `/games/${g.id}/state?v=t2`)).data)).toString());
const annaNow = ws.airlines.find((a) => a.name === 'Hanse Air'), benNow = ws.airlines.find((a) => a.name === 'Isar Jet');
assert.equal(annaNow.fleet.length, 1); assert.equal(benNow.fleet.length, 0);
assert.equal(ws.deals.find((d) => d.id === dealId).status, 'accepted');
console.log('Handel: Flugzeug', benAc, '→', annaNow.fleet[0].id, 'für 250.000 EUR');
// Handel mit der KI: Rückzug kaufen, Antwort kommt sofort
r = ok(await call('anna', 'POST', `/games/${g.id}/action`, { action: { type: 'dealPropose', to: 'KES', give: [{ k: 'cash', amount: 10000 }], take: [{ k: 'exit', pair: 'BER-BCN', days: 365 }] } }), 'KI-Angebot');
console.log('KI antwortet:', r.status, r.reply);
assert.ok(['accepted', 'countered', 'rejected'].includes(r.status));
// Chat: an alle und privat
r = ok(await call('anna', 'POST', `/games/${g.id}/chat`, { text: 'Hallo zusammen!' }), 'Chat an alle');
assert.equal(r.ok, true);
r = ok(await call('ben', 'POST', `/games/${g.id}/chat`, { text: 'Nur für Anna', to: annaAl.id }), 'Chat privat');
const st2 = await call('cleo', 'GET', `/games/${g.id}/state?v=z`);
assert.equal(st2.headers.get('x-chat'), '2', 'Chat-Zähler im Kopf');
const cc = ok(await call('cleo', 'GET', `/games/${g.id}/chat?since=0`), 'Chat lesen Cleo');
assert.equal(cc.messages.length, 1, 'privat bleibt privat');
const ca = ok(await call('anna', 'GET', `/games/${g.id}/chat?since=0`), 'Chat lesen Anna');
assert.equal(ca.messages.length, 2); assert.equal(ca.messages[0].u, undefined);
assert.equal((await call('emil', 'GET', `/games/${g.id}/chat?since=0`)).status, 403, 'Chat nur für Mitglieder');
console.log('Chat ok:', ca.messages.map((m) => `${m.airline}${m.to ? ' (privat)' : ''}: ${m.text}`).join(' | '));
// v0.9: Akademie, Auktion, Kooperation, Abwerben
r = ok(await call('anna', 'POST', `/games/${g.id}/action`, { action: { type: 'academy', role: 'cabin', level: 1 } }), 'Akademie');
assert.equal(r.ok, true, JSON.stringify(r));
ws = JSON.parse(gunzipSync(Buffer.from((await call('anna', 'GET', `/games/${g.id}/state?v=a1`)).data)).toString());
assert.equal(ws.airlines.find((a) => a.name === 'Hanse Air').academy.cabin.lv, 1);
const lot = (ws.auctions || []).find((a) => !a.done);
if (lot) {
  r = ok(await call('ben', 'POST', `/games/${g.id}/action`, { action: { type: 'bid', lot: lot.id, amount: lot.min * 1.2 } }), 'Gebot');
  assert.equal(r.ok, true, JSON.stringify(r));
  console.log('Auktion:', lot.type, 'Gebot ok');
}
r = ok(await call('anna', 'POST', `/games/${g.id}/action`, { action: { type: 'dealPropose', to: benAl.id, give: [{ k: 'coop', kind: 'alliance', days: 180 }], take: [{ k: 'coop', kind: 'alliance', days: 180 }] } }), 'Allianz-Angebot');
assert.equal(r.ok, true, JSON.stringify(r));
r = ok(await call('ben', 'POST', `/games/${g.id}/action`, { action: { type: 'dealRespond', id: r.id, choice: 'accept' } }), 'Allianz annehmen');
assert.equal(r.ok, true, JSON.stringify(r));
ws = JSON.parse(gunzipSync(Buffer.from((await call('anna', 'GET', `/games/${g.id}/state?v=a2`)).data)).toString());
assert.ok(ws.coops.some((c) => c.kind === 'alliance' && [c.a, c.b].includes(annaAl.id) && [c.a, c.b].includes(benAl.id)), 'Allianz aktiv');
r = ok(await call('dora', 'POST', `/games/${g.id}/action`, { action: { type: 'poach', target: annaAl.id, role: 'cabin', n: 2, bonus: 0.2 } }), 'Abwerben');
console.log('Akademie ok · Allianz ok · Abwerben:', r.ok ? 'ok' : r.msg);
// Admin Tim: sieht alle Spiele, tritt ohne Passwort bei, darf fremde Spiele löschen
const tim = ok(await call('tim', 'POST', '/register', { username: 'Tim', password: 'admin1234' }), 'Registrierung Tim');
assert.equal(tim.admin, true, 'Tim ist Admin');
assert.equal((await call('ben', 'GET', '/admin/games')).status, 403, 'Verwaltung nur für Admins');
const g2 = ok(await call('ben', 'POST', '/games', { name: 'Geheimrunde', password: 'zuzu', difficulty: 'hard', speed: 'p', airline: { name: 'Isar Zwei', code: 'IZ', base: 'MUC' } }), 'zweites Spiel');
const adm = ok(await call('tim', 'GET', '/admin/games'), 'Admin-Liste');
assert.ok(adm.games.some((x) => x.id === g.id) && adm.games.some((x) => x.id === g2.id), 'Admin sieht alle Spiele');
const lk = ok(await call('tim', 'GET', `/games/lookup?code=${g2.code}`), 'Admin-Lookup');
assert.equal(lk.adminOk, true);
ok(await call('tim', 'POST', `/games/${g2.id}/join`, { airline: { name: 'Tim Air', code: 'TA', base: 'FRA' } }), 'Admin tritt ohne Passwort bei');
assert.equal((await call('cleo', 'POST', `/games/${g2.id}/delete`)).status, 403, 'Fremde dürfen nicht löschen');
ok(await call('tim', 'POST', `/games/${g2.id}/delete`), 'Admin löscht fremdes Spiel');
assert.equal((await call('ben', 'GET', `/games/${g2.id}/info`)).status, 404, 'Spiel weg');
console.log('Admin ok: Tim sieht', adm.games.length, 'Spiele, Beitritt ohne Passwort, Löschen fremder Spiele');
console.log('Alle Prüfungen bestanden.');
