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
assert.equal(ms.metadata.speed, 'm30', 'Hauptwelt: 30 Min. pro Tag');
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
console.log('Hauptwelt ok: 8 Airlines, Tag', w.day, '· Tick', tk.days, 'Tage · Neustart Isar Jet → Phoenix');
console.log('Alle Prüfungen bestanden.');
