// Prüft den API-Ablauf ohne Netlify: Konten, Spiel mit Passwort, Suche, Beitritt per Code und Einladung, Zeit, Aktionen.
import { handle, tickMain } from '../server/api.mjs';
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
// Langsame Stufe: läuft offline weiter
ok(await call('anna', 'POST', `/games/${g.id}/control`, { speed: 'h1', tz: -120 }), 'Langzeit');
const m2 = await store.getWithMetadata(`games/${g.id}/state`, { type: 'arrayBuffer' });
const d0 = m2.metadata.day;
await store.set(`games/${g.id}/state`, m2.data, { metadata: { ...m2.metadata, lastTick: Date.now() - 5 * 3600000 }, onlyIfMatch: m2.etag });
st = await call('anna', 'GET', `/games/${g.id}/state?v=y`);
w = JSON.parse(gunzipSync(Buffer.from(st.data)).toString());
console.log('Langzeit: 5 Std. offline →', w.day - d0, 'Tage');
assert.equal(w.day - d0, 5);
ok(await call('anna', 'POST', `/games/${g.id}/control`, { speed: 'm1', tz: -120 }), '1 Min. je Tag');
assert.equal((await call('anna', 'POST', `/games/${g.id}/control`, { speed: 'rt' })).status, 400, 'Echtzeit gibt es nicht mehr');
console.log('Tempo 1 Min./Tag gesetzt');
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
// v0.10: Marktanzeige, Konkurrenz nur durch Spielleitung
r = ok(await call('anna', 'POST', `/games/${g.id}/action`, { action: { type: 'dealPropose', to: 'MARKET', give: [{ k: 'cash', amount: 900000 }], take: [{ k: 'acAny', type: 'A20N', n: 1 }], note: 'Suche A320neo' } }), 'Marktgesuch');
assert.equal(r.ok, true, JSON.stringify(r)); console.log('Marktgesuch:', r.reply);
assert.equal((await call('ben', 'POST', `/games/${g.id}/action`, { action: { type: 'setRivals', key: 'hard' } })).status, 403, 'Konkurrenz nur Spielleitung');
r = ok(await call('anna', 'POST', `/games/${g.id}/action`, { action: { type: 'setRivals', key: 'hard' } }), 'Konkurrenz stark');
assert.equal(r.ok, true);
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

// ---- Hauptwelt: legt sich selbst an, jeder darf beitreten, Tempo nur Admin, läuft offline weiter ----
const mainInfo = ok(await call('anna', 'GET', '/main'), 'Hauptwelt');
assert.equal(mainInfo.main, true); assert.equal(mainInfo.member, false); assert.ok(mainInfo.max >= 40, 'viele Plätze');
assert.ok(!ok(await call('anna', 'GET', '/games/search'), 'Suche').games.some((x) => x.id === 'main'), 'Hauptwelt nicht in der normalen Suche');
ok(await call('anna', 'POST', '/games/main/join', { airline: { name: 'Hanse Air', code: 'HX', base: 'HAM' } }), 'Anna tritt der Hauptwelt bei');
ok(await call('ben', 'POST', '/games/main/join', { airline: { name: 'Isar Jet', code: 'IJ', base: 'MUC' } }), 'Ben tritt bei');
assert.equal((await call('cleo', 'POST', '/games/main/join', { airline: { name: 'Elbe Wings', code: 'HX', base: 'BER' } })).status, 400, 'Kürzel in der Hauptwelt doppelt');
for (let i = 0; i < 6; i++) { const n = 'spieler' + i; ok(await call(n, 'POST', '/register', { username: n, password: 'passwort' + i }), 'Konto ' + n);
  ok(await call(n, 'POST', '/games/main/join', { airline: { name: 'Test Air ' + i, code: 'T' + i, base: 'FRA' } }), 'Beitritt ' + n); }
const mi = ok(await call('ben', 'GET', '/games/main/info'), 'Info Hauptwelt');
assert.equal(mi.players.length, 8, 'mehr als vier Airlines'); assert.equal(mi.main, true); assert.equal(mi.me.host, false);
assert.equal((await call('anna', 'POST', '/games/main/control', { speed: 'x4' })).status, 403, 'Tempo nur Admin');
assert.equal((await call('ben', 'POST', '/games/main/action', { action: { type: 'setRivals', key: 'hard' } })).status, 403, 'Konkurrenz nur Admin');
// offline weiterlaufen: 30 Stunden zurückdatieren, stündlicher Lauf holt nach
const ms = await store.getWithMetadata('games/main/state', { type: 'arrayBuffer' });
assert.equal(ms.metadata.speed, 'm20', 'Hauptwelt: 20 Min. pro Tag');
await store.set('games/main/state', ms.data, { metadata: { ...ms.metadata, lastTick: Date.now() - 15 * 3600000 - 1000 }, onlyIfMatch: ms.etag });
const tk = await tickMain(store);
assert.ok(tk.days >= 30, 'Tick holt 30 Tage nach: ' + JSON.stringify(tk));
// Neustart: nur nach Insolvenz, außer freiwillig
const benId = mi.players.find((p) => p.name === 'Ben').airlineId;
assert.equal((await call('ben', 'POST', '/games/main/restart', { airline: { name: 'Phoenix', code: 'PH', base: 'VIE' } })).status, 409, 'nicht insolvent');
ok(await call('ben', 'POST', '/games/main/restart', { force: true, airline: { name: 'Phoenix', code: 'PH', base: 'VIE' } }), 'freiwilliger Neustart');
st = await call('ben', 'GET', '/games/main/state?v=x');
w = JSON.parse(gunzipSync(Buffer.from(st.data)).toString());
const ph = w.airlines.find((a) => a.id === benId);
assert.equal(ph.name, 'Phoenix'); assert.deepEqual(ph.bases, ['VIE']); assert.equal(ph.past.length, 1); assert.equal(ph.past[0].name, 'Isar Jet');
const mi2 = ok(await call('anna', 'GET', '/games/main/info'), 'Info nach Neustart');
assert.equal(mi2.players.find((p) => p.airlineId === benId).airlineName, 'Phoenix');
assert.equal((await call('tim', 'POST', '/games/main/control', { speed: 'm10' })).status < 400, true, 'Admin stellt Tempo');
ok(await call('tim', 'POST', '/games/main/control', { speed: 'm30' }), 'Admin zurück auf 30 Min.');
// private Runde: Neustart auch dort
ok(await call('anna', 'POST', `/games/${g.id}/restart`, { force: true, airline: { name: 'Anna Zwei', code: 'A2', base: 'DUS' } }), 'Neustart in privater Runde');
// Marktstudie über den Server: beauftragen, Zeit vergehen lassen, Bericht liegt im Spielstand
{ const r = ok(await call('anna', 'POST', '/games/main/action', { action: { type: 'orderStudy', kind: 'routes', tier: 'small', focus: { t: 'region', v: 'Europa' } } }), 'Studie beauftragen');
  assert.equal(r.ok, true, 'Studie angenommen: ' + JSON.stringify(r));
  const bad = ok(await call('anna', 'POST', '/games/main/action', { action: { type: 'orderStudy', kind: 'routes', tier: 'riesig' } }), 'ungültiges Paket');
  assert.equal(bad.ok, false);
  const m2 = await store.getWithMetadata('games/main/state', { type: 'arrayBuffer' });
  await store.set('games/main/state', m2.data, { metadata: { ...m2.metadata, lastTick: Date.now() - 4 * 1800000 - 1000 }, onlyIfMatch: m2.etag });
  await tickMain(store);
  const sa = await call('anna', 'GET', '/games/main/state?v=x');
  const ws = JSON.parse(gunzipSync(Buffer.from(sa.data)).toString());
  const ann = ws.airlines.find((a) => a.name === 'Hanse Air' && a.owner === 'anna');
  const rep = ann.reports.find((x) => x.kind === 'routes');
  assert.equal(rep.status, 'done', 'Bericht fertig'); assert.ok(rep.res.rows.length > 0, 'Bericht hat Vorschläge');
  console.log('Marktstudie ok:', rep.res.title, '·', rep.res.rec ? rep.res.rec.text.slice(0, 80) : '–'); }
// Manipulierte Aktionen dürfen den Spielstand nicht beschädigen (sonst stürzt die Welt für alle ab)
{ const evil = [{ type: 'terminal', apt: 'HAM', v: 'constructor' }, { type: 'terminal', apt: 'HAM', v: '__proto__' }, { type: 'hire', role: 'xyz', count: 5 },
    { type: 'hire', role: 'pilot', group: 'toString', count: 3 }, { type: 'train', from: 'A32F', to: 'hasOwnProperty', count: 1 }, { type: 'insurance', v: 'valueOf' },
    { type: 'openRoute', base: 'HAM', dest: 'CDG', typeId: 'A20N', term: 'constructor', service: '__proto__', buffer: 'toString', freq: 1, fo: 99, fi: 99 },
    { type: 'academy', role: 'constructor', level: 2 }, { type: 'repay', id: 'nix' }, { type: 'openBase', apt: 'constructor' }];
  for (const action of evil) { const r = await call('anna', 'POST', '/games/main/action', { action }); assert.ok(r.status < 500, 'kein Serverfehler bei ' + JSON.stringify(action)); }
  const m3 = await store.getWithMetadata('games/main/state', { type: 'arrayBuffer' });
  await store.set('games/main/state', m3.data, { metadata: { ...m3.metadata, lastTick: Date.now() - 3 * 1800000 - 1000 }, onlyIfMatch: m3.etag });
  const t3 = await tickMain(store);
  assert.ok(t3.days >= 3, 'Welt läuft nach manipulierten Aktionen weiter: ' + JSON.stringify(t3));
  const rp = ok(await call('anna', 'POST', '/games/main/action', { action: { type: 'repay', id: 'nix' } }), 'Kredit fehlt');
  assert.equal(rp.ok, false); assert.ok(rp.msg, 'Meldung beim fehlenden Kredit');
  console.log('Robust ok: 10 manipulierte Aktionen abgewiesen, Welt läuft weiter (+' + t3.days + ' Tage)'); }
{ const L = { type: 'setLogo', shape: 'hex', sym: 'eagle', c1: '#0b3d91', c2: '#ffcc00' };
  assert.equal(ok(await call('anna', 'POST', '/games/main/action', { action: L }), 'Logo Anna').ok, true);
  const dup = ok(await call('ben', 'POST', '/games/main/action', { action: L }), 'Logo Ben gleich');
  assert.equal(dup.ok, false, 'gleiches Logo gesperrt'); assert.ok(/schon/.test(dup.msg));
  assert.equal(ok(await call('ben', 'POST', '/games/main/action', { action: { ...L, c2: '#ffffff' } }), 'Logo Ben anders').ok, true);
  console.log('Logo ok: gleiche Kombination gesperrt –', dup.msg); }
{ const act = async (action) => ok(await call('anna', 'POST', '/games/main/action', { action }), action.type);
  const r1 = await act({ type: 'setCabin', haul: 'short', f: 0, b: 0.12 }); assert.equal(r1.ok, true, 'Kabine');
  const r2 = await act({ type: 'marketingPct', v: 0.03 }); assert.equal(r2.ok, true, 'Marketing %');
  const r3 = await act({ type: 'loyalty', lv: 1 }); assert.equal(r3.ok, true, 'Vielflieger');
  const r4 = await act({ type: 'buySlots', apt: 'LHR', n: 1 }); assert.ok(r4.ok || /Slot|Dispo/.test(r4.msg || ''), 'Slots: ' + JSON.stringify(r4));
  const r5 = await act({ type: 'hubLevel', apt: 'HAM', lv: 1 }); assert.equal(r5.ok, false, 'Drehkreuz braucht Strecken');
  const st2 = await call('anna', 'GET', '/games/main/state?v=x'), w2 = JSON.parse(gunzipSync(Buffer.from(st2.data)).toString());
  const an = w2.airlines.find((a) => a.owner === 'anna');
  assert.equal(an.cabin.short.b, 0.12); assert.equal(an.mktPct, 0.03); assert.equal(an.loyalty.lv, 1);
  console.log('Strategie ok: Kabine, Marketing 3 %, Meilenprogramm, Slotkauf', r4.ok ? 'gekauft' : 'abgelehnt (' + r4.msg + ')', '· Drehkreuz:', r5.msg); }
// Verwaltung: Admin entfernt und sperrt, hebt Sperre auf, annulliert Ereignis, bucht Kapital; Spielleitung im privaten Spiel
{ assert.equal((await call('ben', 'GET', '/games/main/admin')).status, 403, 'Verwaltung nur für Admins');
  assert.equal((await call('anna', 'POST', '/games/main/admin', { cmd: 'unban', u: 'x' })).status, 403, 'Verwaltung POST nur für Admins');
  const ad = ok(await call('tim', 'GET', '/games/main/admin'), 'Verwaltung laden');
  const benP = ad.players.find((p) => p.u === 'ben'); assert.ok(benP, 'Ben in der Liste');
  ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'kick', airlineId: benP.airlineId, ban: true }), 'Ben entfernen und sperren');
  assert.equal((await call('ben', 'GET', '/games/main/state')).status, 403, 'Ben hat keinen Zugriff mehr');
  assert.equal((await call('ben', 'POST', '/games/main/join', { airline: { name: 'Neu Ben', code: 'NB', base: 'MUC' } })).status, 403, 'gesperrt');
  ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'unban', u: 'ben' }), 'Sperre aufheben');
  ok(await call('ben', 'POST', '/games/main/join', { airline: { name: 'Neu Ben', code: 'NB', base: 'MUC' } }), 'Ben tritt neu bei');
  const ad2 = ok(await call('tim', 'GET', '/games/main/admin'), 'Verwaltung neu');
  const ev = ad2.events.find((e) => !e.cancelled);
  if (ev) { ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'cancelEvent', eventId: ev.id }), 'Ereignis annullieren');
    assert.equal((await call('tim', 'POST', '/games/main/admin', { cmd: 'cancelEvent', eventId: ev.id })).status, 400, 'doppelt annullieren abgewiesen'); }
  const annP = ad2.players.find((p) => p.u === 'anna');
  ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'grant', airlineId: annP.airlineId, amount: 5e6 }), 'Kapital buchen');
  const ad3 = ok(await call('tim', 'GET', '/games/main/admin'), 'Verwaltung danach');
  assert.ok(ad3.players.find((p) => p.u === 'anna').equity > annP.equity + 4e6, 'Kapital gebucht');
  const gi = ok(await call('anna', 'GET', `/games/${g.id}/admin`), 'Spielleitung privat');
  const cl = gi.players.find((p) => p.u === 'cleo');
  ok(await call('anna', 'POST', `/games/${g.id}/admin`, { cmd: 'kick', airlineId: cl.airlineId }), 'Spielleitung entfernt Cleo');
  assert.equal((await call('ben', 'POST', `/games/${g.id}/admin`, { cmd: 'kick', airlineId: gi.players.find((p) => p.u === 'anna').airlineId })).status, 403, 'Mitspieler darf nicht verwalten');
  console.log('Verwaltung ok: entfernen + sperren, entsperren, Neubeitritt,', ev ? 'Ereignis „' + ev.type + '“ annulliert,' : 'kein Ereignis offen,', 'Kapital +5 Mio., Spielleitung privat'); }
// Tempo der Hauptwelt durch den Admin (auch ohne eigene Airline), nicht durch andere
{ const ad = ok(await call('tim', 'GET', '/games/main/admin'), 'Verwaltung Tempo'); assert.ok(ad.canSpeed && ad.speed, 'Tempo sichtbar');
  ok(await call('tim', 'POST', '/games/main/control', { speed: 'm10' }), 'Tim stellt Tempo');
  assert.equal(ok(await call('tim', 'GET', '/games/main/admin'), 'nach Tempo').speed, 'm10', 'Tempo übernommen');
  assert.equal((await call('ben', 'POST', '/games/main/control', { speed: 'h1' })).status, 403, 'Tempo nur Admin');
  ok(await call('tim', 'POST', '/games/main/control', { speed: 'm30' }), 'Tempo zurück');
  console.log('Tempo ok: Tim stellt die Hauptwelt um, andere nicht'); }
// Neustart der Hauptwelt nur durch den Admin
{ const before = ok(await call('tim', 'GET', '/games/main/admin'), 'vor Neustart');
  assert.equal((await call('ben', 'POST', '/games/main/admin', { cmd: 'resetWorld', keep: true })).status, 403, 'Neustart nur Admin');
  const rs = ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'resetWorld', keep: true }), 'Neustart Hauptwelt');
  const after = ok(await call('tim', 'GET', '/games/main/admin'), 'nach Neustart');
  assert.equal(after.players.length, before.players.length, 'alle Airlines behalten'); assert.ok(after.day <= 1, 'Tag 1');
  const stR = await call('anna', 'GET', '/games/main/state?v=r'), wr = JSON.parse(gunzipSync(Buffer.from(stR.data)).toString());
  assert.ok(wr.airlines.some((a) => a.owner === 'anna'), 'Anna hat wieder eine Airline');
  console.log('Neustart ok:', rs.msg); }
// Geplanter Start: Anmelden, Logo, Basis ändern – Uhr steht bis zum Termin, dann 1 Tag = 20 Min.
{ const t0 = Date.now(), startAt = t0 + 2 * 3600e3;
  const rs = ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'resetWorld', keep: true, startAt, speed: 'm20' }), 'Neustart mit Termin');
  assert.ok(/Start:/.test(rs.msg), 'Meldung nennt Start');
  const mn = ok(await call('anna', 'GET', '/main'), 'Lobby'); assert.equal(mn.startAt, startAt, 'Termin in der Lobby'); assert.equal(mn.speed, 'm20', 'Tempo 20 Min.');
  assert.ok(mn.roster.length >= 2 && mn.roster.every((r) => r.name && r.base), 'Liste der Airlines mit Basis');
  const act = async (u, a) => ok(await call(u, 'POST', '/games/main/action', { action: a }), 'Aktion ' + a.type);
  const blocked = await act('anna', { type: 'acquire', typeId: 'DH8D', mode: 'lease', base: 'HAM' }); assert.equal(blocked.ok, false, 'vor dem Start kein Flugzeug'); assert.ok(blocked.waiting, 'Hinweis auf Start');
  assert.equal((await act('anna', { type: 'setLogo', shape: 'circle', sym: 'bolt', c1: '#123456', c2: '#ffffff' })).ok, true, 'Logo vor dem Start');
  ok(await call('anna', 'POST', '/games/main/rebase', { airline: { name: 'Nordlicht', code: 'NL', base: 'BRE' } }), 'Basis vor dem Start ändern');
  const mn2 = ok(await call('ben', 'GET', '/main'), 'Lobby 2'); const nl = mn2.roster.find((r) => r.name === 'Nordlicht');
  assert.ok(nl && nl.base === 'BRE' && nl.logo && nl.logo.sym === 'bolt', 'andere sehen Name, Basis und Logo');
  ok(await call('tim', 'POST', '/games/main/control', { speed: 'm10' }), 'Tempo vor dem Start'); ok(await call('tim', 'POST', '/games/main/control', { speed: 'm20' }), 'Tempo zurück');
  const real = Date.now;
  Date.now = () => real() + 3600e3;   // eine Stunde später: noch vor dem Start
  let ad = ok(await call('tim', 'GET', '/games/main/admin'), 'Admin vor Start'); assert.equal(ad.day, 0, 'Uhr steht'); assert.equal(ad.startAt, startAt, 'Termin im Admin');
  Date.now = () => real() + 3 * 3600e3;   // eine Stunde nach dem Start = 3 Spieltage
  ad = ok(await call('tim', 'GET', '/games/main/admin'), 'Admin nach Start'); assert.equal(ad.day, 3, 'eine Stunde nach dem Start: 3 Tage (' + ad.day + ')'); assert.equal(ad.startAt, null, 'Termin vorbei');
  assert.equal((await act('anna', { type: 'acquire', typeId: 'DH8D', mode: 'lease', base: 'BRE' })).ok, true, 'nach dem Start Flugzeug');
  assert.equal((await call('anna', 'POST', '/games/main/rebase', { airline: { name: 'Nordlicht', code: 'NL', base: 'HAM' } })).status, 400, 'mit Flugzeug keine Basisänderung');
  Date.now = real;
  // Termin verschieben und sofort starten
  ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'resetWorld', keep: true, startAt: Date.now() + 864e5 }), 'Neustart morgen');
  ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'setStart', startAt: null }), 'Jetzt starten');
  assert.equal(ok(await call('tim', 'GET', '/games/main/admin'), 'gestartet').startAt, null, 'läuft sofort');
  console.log('Starttermin ok: Anmeldung, Logo, Basiswechsel vor dem Start, Uhr steht, danach 3 Tage pro Stunde, Jetzt starten'); }
// Kapitalmarkt: Anteile, anteiliger Gewinn, Kapitalerhöhung, Anleihe, Übernahme mit Mehrheit
{ const SMx = (await import('../shared/engine.cjs')).default;
  const wk = SMx.newWorld({ seed: 11 }), a1 = SMx.addHuman(wk, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }), b1 = SMx.addHuman(wk, { id: 'P2', name: 'Beta', code: 'BB', base: 'MUC' }); wk.playerId = 'P1';
  a1.ledger.cash += 300e6 * 100; a1.ledger.equityContrib += 300e6 * 100;
  for (let i = 0; i < 100; i++) wk.step();
  const tg = wk.list.filter((x) => x.archetype && x.status === 'active').sort((x, y) => SMx.mktCap(wk, x) - SMx.mktCap(wk, y))[0];
  for (const q of [0.2, 0.2, 0.15]) assert.equal(SMx.applyAction(wk, 'P1', { type: 'buyStake', target: tg.id, q }).ok, true, 'Anteile kaufen');
  assert.ok(SMx.stakeOf(a1, tg) >= 0.55, 'Mehrheit'); assert.ok(wk.coops.some((c) => c.stake), 'Konzernallianz');
  for (let i = 0; i < 65; i++) wk.step();
  assert.ok(a1.stakes[tg.id].inc !== 0, 'anteiliger Gewinn gebucht');
  const offer = SMx.maValue(wk, tg, a1); assert.ok(offer.mult === 1.3 && offer.rest < 0.46, 'Angebot nur für den Rest mit Mehrheitsaufschlag');
  assert.equal(SMx.applyAction(wk, 'P1', { type: 'takeover', target: tg.id }).ok, true, 'Rest übernommen');
  const iq = SMx.applyAction(wk, 'P2', { type: 'issueShares', q: 0.1 }); assert.equal(iq.ok, true, 'Kapitalerhöhung: ' + iq.msg);
  assert.equal(SMx.applyAction(wk, 'P1', { type: 'buyStake', target: 'P2', q: 0.05 }).ok, true, 'Aktien eines Mitspielers kaufen');
  assert.equal(SMx.applyAction(wk, 'P2', { type: 'issueShares', q: 0.2 }).ok, false, 'Sperrfrist für Kapitalerhöhung');
  assert.equal(SMx.applyAction(wk, 'P2', { type: 'issueBond', amount: 3e6, years: 3 }).ok, true, 'Anleihe');
  for (let i = 0; i < 35; i++) wk.step();
  for (const al of [a1, b1]) assert.ok(Math.abs(SMx.balanceSheet(al).check) < 1, 'Bilanz stimmt ' + al.id);
  const rt2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(wk)))); assert.ok(rt2.airlines.P1.stakes && rt2.airlines.P2.cap && rt2.airlines.P2.bonds, 'Speichern/Laden Kapitalmarkt');
  console.log('Kapitalmarkt ok: 55 % an', tg.name, ', anteiliger Gewinn, Rest übernommen, Kapitalerhöhung', Math.round(iq.net / 1e3), 'Tsd. €, Anleihe, Bilanz stimmt'); }
// Sanierung und Insolvenz: Werkzeuge in der Krise, Abwicklung an den Markt
{ const SMx = (await import('../shared/engine.cjs')).default;
  const wr = SMx.newGame({ seed: 5, base: 'HAM' }), pr = wr.player, A = (a) => SMx.applyAction(wr, pr.id, a);
  A({ type: 'acquire', typeId: 'DH8D', mode: 'buy', base: 'HAM' }); A({ type: 'acquire', typeId: 'DH8D', mode: 'lease', base: 'HAM' });
  A({ type: 'openRoute', base: 'HAM', dest: 'CGN', typeId: 'DH8D', freq: 1, fo: 120, fi: 120 }); A({ type: 'fillStaff' });
  for (let i = 0; i < 30; i++) wr.step();
  pr.ledger.cash -= 30e6 * 100; pr.ledger.equityContrib -= 30e6 * 100;
  for (let i = 0; i < 10; i++) wr.step();
  assert.equal(pr.status, 'restructuring', 'Restrukturierung');
  const rl = A({ type: 'rescueLoan' }); assert.equal(rl.ok, true, 'Sanierungskredit: ' + rl.msg);
  const own = pr.fleet.find((a) => a.owned); assert.equal(A({ type: 'saleLeaseback', acId: own.id }).ok, true, 'Sale & Lease-back');
  assert.equal(A({ type: 'leaseDefer' }).ok, true, 'Stundung');
  assert.ok(Math.abs(SMx.balanceSheet(pr).check) < 1, 'Bilanz in der Sanierung');
  const n0m = wr.acMarket.length; pr.ledger.cash -= 100e6 * 100;
  for (let i = 0; i < 60 && pr.status !== 'insolvent'; i++) wr.step();
  assert.equal(pr.status, 'insolvent', 'Insolvenz'); assert.ok(pr.liq && pr.fleet.length === 0 && wr.acMarket.length > n0m, 'Masse geht an den Markt');
  assert.ok(wr.acMarket.some((o) => o.from === pr.name), 'Insolvenzangebote markiert');
  console.log('Sanierung ok: Sale & Lease-back, Stundung, Sanierungskredit · Insolvenz:', JSON.stringify(pr.liq)); }
// 0.17.2: Gehalt relativ zum Markt, Personalhandel nur mit vorhandenem Personal, Großereignisse, Kaufkraft
{ const SMx = (await import('../shared/engine.cjs')).default;
  const wq = SMx.newGame({ seed: 9, base: 'IST' }), pq = wq.player, A = (a) => SMx.applyAction(wq, pq.id, a);
  assert.equal(A({ type: 'pay', rel: 1.05 }).ok, true, 'Gehalt +5 %');
  for (let i = 0; i < 200; i++) wq.step();
  assert.ok(Math.abs(pq.staff.pay / wq.macro.wage - 1.05) < 0.002, 'bleibt +5 % zum Markt (' + (pq.staff.pay / wq.macro.wage).toFixed(3) + ')');
  const h2 = SMx.addHuman(wq, { id: 'P2', name: 'Zwei', code: 'ZW', base: 'ADB' });
  const tooMany = SMx.applyAction(wq, pq.id, { type: 'dealPropose', to: 'P2', give: [{ k: 'staff', role: 'cabin', n: (pq.staff.cab || 0) + 5 }], take: [{ k: 'cash', amount: 1000 }] });
  assert.equal(tooMany.ok, false, 'mehr Personal anbieten als vorhanden geht nicht');
  const mg = SMx.MEGA.find((e) => e.key === 'oly28'), S0 = SMx.megaStart(mg, 2028);
  const wm = SMx.newWorld({ seed: 4 }); wm.playerId = null; while (wm.day < S0 - mg.lead + 31) wm.step();
  assert.ok(wm.events.some((e) => e.mega === 'oly282028'), 'Olympia 2028 angekündigt');
  assert.ok(wm.demandMult('FRA', 'LAX', 'leisure', S0 + 2) > 2, 'Olympia treibt Nachfrage nach Los Angeles');
  assert.ok(SMx.refPrice('IST', 'ADB') < SMx.refPrice('HAM', 'MUC') * 0.8, 'Kaufkraft: Inlandstarif Türkei unter Deutschland');
  assert.ok(SMx.wageX('IST') < 0.7 && SMx.wageX('HAM') > 0.95, 'Lohnniveau nach Basis');
  console.log('0.17.2 ok: Gehalt bleibt +5 % zum Markt, Personalhandel geprüft, Olympia 2028 angekündigt (Tag', S0, '), Kaufkraft und Lohnniveau'); }
// 0.17.3: Saudi-Arabien entschärft, Charter mit Familie und Großereignis-Anfragen
{ const SMx = (await import('../shared/engine.cjs')).default;
  assert.ok(SMx.refPrice('RUH', 'JED') < 85, 'regulierte Inlandstarife Saudi-Arabien');
  const ws = SMx.newGame({ seed: 4, base: 'HAM' }), ps = ws.player, A = (a) => SMx.applyAction(ws, ps.id, a);
  assert.ok(ws.airlines.NJD && ws.airlines.NJD.activeRoutes().some((r) => r.dest === 'JED'), 'Najd Air fliegt Riad–Dschidda');
  A({ type: 'acquire', typeId: 'A21N', mode: 'lease', base: 'HAM' });
  for (let i = 0; i < 240; i++) ws.step();
  assert.ok(ws.acmiOffers.some((o) => o.ev), 'Charteranfragen zu Großereignissen');
  const o = ws.acmiOffers.find((x) => SMx.P.AIRCRAFT_TYPES[x.type].group === 'A32F' && x.type !== 'A21N' && x.start >= ws.day);
  if (o) { const ac = ps.fleet[0]; const r = A({ type: 'acmi', offerId: o.id, acId: ac.id }); assert.equal(r.ok, true, 'Familie passt: ' + r.msg); assert.ok(ac.acmi.rate !== o.rate || o.type === ac.type_id, 'Rate nach Sitzen angepasst'); }
  console.log('0.17.3 ok: Riad–Dschidda', Math.round(SMx.refPrice('RUH', 'JED')), '€ mit Najd Air als Konkurrenz,', ws.acmiOffers.filter((x) => x.ev).length, 'Großereignis-Charter,', o ? 'Familien-Charter angenommen' : 'keine passende Familienanfrage'); }
// 0.17.4/0.17.5: feste Slottermine, Basis-Slots, Studien je Basis
{ const SMx = (await import('../shared/engine.cjs')).default;
  const wf = SMx.newGame({ seed: 6, base: 'FRA' }), pf = wf.player, A = (a) => SMx.applyAction(wf, pf.id, a);
  assert.equal(pf.heldAt('FRA', wf.day), 3, 'drei Basis-Slots in Frankfurt');
  assert.ok(SMx.baseSlotCost(wf, 'FRA') > 5 * SMx.baseSlotCost(wf, 'HAJ'), 'Basis-Slots an Drehkreuzen viel teurer');
  pf.ledger.cashOnly(2e8, 't');
  assert.equal(A({ type: 'openBase', apt: 'MUC' }).ok, true, 'zweite Basis');
  assert.equal(pf.heldAt('MUC', wf.day), 3, 'drei Basis-Slots in München');
  A({ type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'FRA' }); for (let i = 0; i < 15; i++) wf.step();
  const ro = A({ type: 'openRoute', base: 'FRA', dest: 'PMI', typeId: 'A20N', freq: 1 });
  assert.equal(ro.ok, true, 'Strecke ab voller Basis dank Basis-Slots: ' + ro.msg);
  const so = A({ type: 'orderStudy', kind: 'routes', tier: 'small', focus: null, bases: ['MUC'] });
  assert.equal(so.ok, true, 'Studie nur ab München'); for (let i = 0; i < 6; i++) wf.step();
  const rep = pf.reports.find((r) => r.id === so.id);
  assert.ok(rep.status === 'done' && rep.res.rows.length && rep.res.rows.every((x) => x.o === 'MUC'), 'Studie sucht nur ab München');
  const free = wf.slotsFree('LHR'); wf.slotCap.LHR -= Math.max(0, free);
  const jw = A({ type: 'slotWait', apt: 'LHR', n: 2 }); assert.equal(jw.ok, true, 'Warteliste ohne Strecke');
  const t = SMx.nextSlotDay(wf.day).day; while (wf.day < t - 1) wf.step();
  assert.equal(pf.heldAt('LHR', wf.day), 0, 'vor dem Termin keine Zuteilung'); wf.step(); wf.step();
  assert.ok(pf.heldAt('LHR', wf.day) >= 1, 'am Termin zugeteilt');
  console.log('0.17.5 ok: 3 Basis-Slots (FRA', Math.round(SMx.baseSlotCost(wf, 'FRA') / 1000), 'Tsd. €), Strecke ab voller Basis, Studie ab gewählter Basis, Warteliste am', t, 'bedient'); }
console.log('Hauptwelt ok: 8 Airlines, Tag', w.day, '· Tick', tk.days, 'Tage · Neustart Isar Jet → Phoenix');
// Version 0.16: Karriere, Marktwissen, Slots als Vermögen, Übernahme, Pixel-Logo, Frequenz unter täglich
{ const SMx = (await import('../shared/engine.cjs')).default;
  const w6 = SMx.newGame({ seed: 9, base: 'HAJ', mode: 'career' }), p6 = w6.player, A6 = (a) => SMx.applyAction(w6, p6.id, a);
  assert.equal(SMx.careerLv(p6), 0, 'Karriere startet in Phase 1');
  assert.ok(SMx.riskTerms(p6, 'B789').lease > 1.5 && SMx.riskTerms(p6, 'DH8D').lease === 1, 'Risikoaufschlag für große Muster');
  const k0 = w6.knowOf(p6, 'HAJ', 'MUC'); assert.ok(k0.lv <= 1 && k0.sigma > 0.2, 'ohne Studie nur grobes Marktwissen');
  assert.equal(A6({ type: 'acquire', typeId: 'DH8D', mode: 'lease', base: 'HAJ' }).ok, true, 'Dash 8 leasen');
  const r6 = A6({ type: 'openRoute', base: 'HAJ', dest: 'NUE', typeId: 'DH8D', freq: 1, wk: 4, fo: 100, fi: 100 }); assert.equal(r6.ok, true, '4x pro Woche: ' + r6.msg);
  assert.equal(p6.routes.find((r) => r.id === r6.id).wk, 4, 'Wochenfrequenz gespeichert');
  const b6 = SMx.balanceSheet(p6); assert.ok(Math.abs(b6.check) < 1, 'Bilanz stimmt mit Slots als Vermögen'); assert.ok(b6.slots > 0, 'Slots aktiviert');
  { const c0 = p6.ledger.cash; assert.equal(A6({ type: 'openBase', apt: 'BRE' }).ok, true, 'zweite Basis geht – nur teurer');
    assert.ok(c0 - p6.ledger.cash > 1.9 * SMx.baseSetupCost(w6, 'BRE') * 100, 'Aufschlag auf die zweite Basis in Phase 1'); }
  const ai6 = w6.list.find((a) => a.archetype && a.status !== 'insolvent');
  assert.ok(SMx.maValue(w6, ai6, p6).price > SMx.maValue(w6, ai6).price * 1.4, 'Übernahme vor Phase 3 mit Aufschlag');
  { const rA = SMx.riskTerms(p6, 'DH8D'); A6({ type: 'acquire', typeId: 'DH8D', mode: 'lease', base: 'HAJ' }); const rB = SMx.riskTerms(p6, 'DH8D'); assert.ok(rB.lease > rA.lease, 'schnelles Wachstum kostet Aufschlag'); }
  { const wL = SMx.newGame({ seed: 4, base: 'LHR' }), pL = wL.player; const ok3 = [0, 1, 2].map(() => SMx.applyAction(wL, pL.id, { type: 'acquire', typeId: 'B789', mode: 'lease', base: 'LHR' }).ok).filter(Boolean).length;
    assert.ok(ok3 < 3, 'zum Start keine drei 787 in London'); }
  const px = Buffer.alloc(2048); px[10] = 0x21; const pr = A6({ type: 'setPixLogo', pal: ['#112233', '#ffcc00'], px: px.toString('base64') }); assert.equal(pr.ok, true, 'Pixel-Logo');
  A6({ type: 'orderStudy', kind: 'routes', tier: 'small', focus: null }); for (let i = 0; i < 8; i++) w6.step();
  assert.ok(Object.keys(p6.mk || {}).length >= 10, 'Studie hinterlässt Marktwissen');
  const w7 = SMx.newGame({ seed: 9, base: "HAM" }), p7 = w7.player; p7.ledger.cash += 400e6 * 100; p7.ledger.equityContrib += 400e6 * 100;
  const ai7 = w7.list.filter((a) => a.archetype && a.status !== 'insolvent').sort((x, y) => SMx.maValue(w7, x, p7).price - SMx.maValue(w7, y, p7).price)[0], n7 = ai7.fleet.length;
  const t7 = SMx.applyAction(w7, p7.id, { type: 'takeover', target: ai7.id }); assert.equal(t7.ok, true, 'Übernahme mit Aufschlag: ' + t7.msg);
  assert.equal(p7.fleet.length, n7, 'Flotte übernommen'); assert.ok(Math.abs(SMx.balanceSheet(p7).check) < 1, 'Bilanz nach Übernahme');
  for (let i = 0; i < 5; i++) w7.step();
  const rt = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w6)))); assert.equal(rt.mode, 'career'); assert.ok(rt.player.prog && rt.player.pixLogo && rt.player.mk, 'Speichern/Laden 0.16');
  console.log('0.16 ok: Phasen immer aktiv, Risikoaufschlag, Wachstumsaufschlag, keine drei 787 zum Start, Marktwissen + Studie, 4x/Woche, Slots als Vermögen, Basis mit Aufschlag, Übernahme (' + t7.fleet + ' Flugzeuge), Pixel-Logo'); }
console.log('Alle Prüfungen bestanden.');
