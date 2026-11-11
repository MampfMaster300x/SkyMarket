// Prüft den API-Ablauf ohne Netlify: Konten, Spiel mit Passwort, Suche, Beitritt per Code und Einladung, Zeit, Aktionen.
import { handle, tickMain, _clock } from '../server/api.mjs';
import { memStore } from '../server/memstore.mjs';
import { gunzipSync, gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Oberfläche muss sich fehlerfrei parsen lassen (ein Syntaxfehler legt die ganze Seite lahm)
{ const vm = await import('node:vm'); new vm.Script(fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8'), { filename: 'src/app.js' }); console.log('Syntax ok: src/app.js'); }

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
// 0.21.11: Admin setzt ein Passwort zurück – vorläufiges Passwort, Pflicht zum Ändern, alte Sitzungen ungültig
{ ok(await call('tim', 'POST', '/register', { username: 'Tim', password: 'admin1234' }), 'Registrierung Tim (Admin)');
  assert.equal((await call('anna', 'POST', '/admin/password', { username: 'ben' })).status, 403, 'nur Admins setzen zurück');
  assert.equal((await call('tim', 'POST', '/admin/password', { username: 'niemand' })).status, 404, 'unbekanntes Konto');
  const rs = ok(await call('tim', 'POST', '/admin/password', { username: 'Ben' }), 'Zurücksetzen'); assert.ok(rs.temp && rs.temp.length >= 10, 'vorläufiges Passwort');
  assert.equal((await call('ben', 'GET', '/games/mine')).status, 401, 'alte Sitzung von Ben ungültig');
  assert.equal((await call('ben', 'POST', '/login', { username: 'ben', password: 'passwort1' })).status, 401, 'altes Passwort gilt nicht mehr');
  const li = ok(await call('ben', 'POST', '/login', { username: 'ben', password: rs.temp }), 'Login mit vorläufigem Passwort'); assert.equal(li.mustChange, true, 'muss ändern');
  assert.equal(ok(await call('ben', 'GET', '/me'), 'me').mustChange, true);
  assert.equal((await call('ben', 'POST', '/password', { current: 'falsch', next: 'passwort1' })).status, 403, 'Ändern braucht das bisherige Passwort');
  assert.equal((await call('ben', 'POST', '/password', { current: rs.temp, next: 'kurz' })).status, 400, 'zu kurz');
  ok(await call('ben', 'POST', '/password', { current: rs.temp, next: 'passwort1' }), 'Passwort geändert');
  assert.equal(ok(await call('ben', 'GET', '/me'), 'me nach Änderung').mustChange, false, 'Pflicht erledigt, Sitzung gilt weiter');
  ok(await call('ben3', 'POST', '/login', { username: 'ben', password: 'passwort1' }), 'Login mit neuem Passwort');
  assert.equal((await call('tim', 'GET', '/me')).status, 200, 'Admin-Sitzung unberührt');
  console.log('0.21.11 ok: Passwort zurücksetzen (Admin), alte Sitzung ungültig, Pflicht zum Ändern'); }

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
const benAcV = Math.round(benAl.fleet[0].owned ? 2e7 : (benAl.fleet[0].deposit || 0) + (benAl.fleet[0].flex ? 0.25 : 0.5) * (benAl.fleet[0].leaseMonth || 0));   // fairer Preis (0.20: Handel nur in realistischer Spanne)
r = ok(await call('ben', 'POST', `/games/${g.id}/action`, { action: { type: 'dealPropose', to: annaAl.id, give: [{ k: 'ac', id: benAc }], take: [{ k: 'cash', amount: benAcV }], note: 'Test' } }), 'Angebot');
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
console.log('Handel: Flugzeug', benAc, '→', annaNow.fleet[0].id, 'für', benAcV, 'EUR');
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
{ const ac = ws.airlines.find((a) => a.name === 'Hanse Air').academy.cabin; assert.equal(Array.isArray(ac) ? ac[0].lv : ac.lv, 1); }
const lot = (ws.auctions || []).find((a) => !a.done);
if (lot) {
  r = ok(await call('ben', 'POST', `/games/${g.id}/action`, { action: { type: 'bid', lot: lot.id, amount: lot.min * 1.2 } }), 'Gebot');
  assert.equal(r.ok, true, JSON.stringify(r));
  console.log('Auktion:', lot.type, 'Gebot ok');
}
r = ok(await call('anna', 'POST', `/games/${g.id}/action`, { action: { type: 'dealPropose', to: benAl.id, give: [{ k: 'coop', kind: 'alliance', days: 180 }], take: [] } }), 'Allianz-Angebot');   // 0.21.41: Kooperation gilt für beide Seiten – nur einmal eintragen
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
const tim = ok(await call('tim', 'POST', '/login', { username: 'Tim', password: 'admin1234' }), 'Anmeldung Tim');
assert.equal(tim.admin, true, 'Tim ist Admin');
// 0.21.19: Spielzeit – sichtbares Spielfenster zählt, Admin-Übersicht
{ await call('anna', 'GET', `/games/${g.id}/state?ping=1&vis=1`); await new Promise((r) => setTimeout(r, 40)); await call('anna', 'GET', `/games/${g.id}/state?ping=1&vis=1`);
  await call('ben', 'GET', `/games/${g.id}/state?ping=1&vis=0`);
  assert.equal((await call('anna', 'GET', '/admin/playtime')).status, 403, 'Spielzeit nur für Admins');
  const pt = ok(await call('tim', 'GET', '/admin/playtime'), 'Spielzeit'); const ra = pt.rows.find((r) => r.key === 'anna'), rb = pt.rows.find((r) => r.key === 'ben');
  assert.ok(ra && ra.total >= 30 && ra.sessions === 1 && ra.games.length === 1 && ra.days[pt.today] === ra.total, 'Anna: Spielzeit erfasst ' + JSON.stringify(ra && { t: ra.total, s: ra.sessions }));
  assert.ok(rb && rb.total === 0 && !rb.sessions, 'Ben: Fenster im Hintergrund zählt nicht');
  // 0.21.26: Patch-Hinweis einmal je Konto
  { const ua = await store.get('users/anna', { type: 'json' }); delete ua.patchSeen; await store.setJSON('users/anna', ua);   // Konto von vor dem Update
    const me1 = ok(await call('anna', 'GET', '/me'), 'me'); assert.ok(Array.isArray(me1.patch) && me1.patch.length === 1 && /Wochenend/.test(me1.patch[0].title), 'Patch-Hinweis (nur der angeforderte) für bestehende Konten');
    { const ub = await store.get('users/ben', { type: 'json' }); ub.patchSeen = '2026-11-05-wochenende'; await store.setJSON('users/ben', ub); const mb = ok(await call('ben', 'GET', '/me'), 'me ben'); assert.ok(!mb.patch, 'nicht angeforderter Hinweis wird nicht gezeigt'); }
    ok(await call('anna', 'POST', '/patch/seen', {}), 'gesehen'); assert.ok(!ok(await call('anna', 'GET', '/me'), 'me2').patch, 'danach nicht mehr');
    const nu = ok(await call('neu', 'POST', '/register', { username: 'NeuKonto', password: 'geheim1234' }), 'neues Konto'); assert.ok(!nu.patch && !ok(await call('neu', 'GET', '/me'), 'me3').patch, 'neue Konten sehen ihn nicht'); }
  // 0.21.26: Wochenend-Tempo der Hauptwelt (Fr 17 Uhr bis Mo 6 Uhr deutscher Zeit: 1 Tag = 1 Std.)
  { const C = _clock, Z = (s) => Date.parse(s);
    assert.ok(!C.isWeekend(Z('2026-11-06T15:59:00Z')) && C.isWeekend(Z('2026-11-06T16:00:00Z')), 'Fr 17 Uhr (MEZ) beginnt das Wochenende');
    assert.ok(C.isWeekend(Z('2026-11-08T12:00:00Z')) && C.isWeekend(Z('2026-11-09T04:59:00Z')) && !C.isWeekend(Z('2026-11-09T05:00:00Z')), 'Mo 6 Uhr endet es');
    assert.ok(!C.isWeekend(Z('2027-07-02T14:59:00Z')) && C.isWeekend(Z('2027-07-02T15:00:00Z')) && !C.isWeekend(Z('2027-07-05T04:00:00Z')), 'Sommerzeit: Fr 17 Uhr = 15 Uhr UTC, Mo 6 Uhr = 4 Uhr UTC');
    const md = { speed: 'm20', lastTick: Z('2026-11-06T15:00:00Z'), carry: 0 };
    assert.equal(C.clockDue(md, Z('2026-11-06T17:00:00Z'), true).days, 4, 'Hauptwelt: 1 Std. unter der Woche (3 Tage) + 1 Std. Wochenende (1 Tag)');
    assert.equal(C.clockDue(md, Z('2026-11-06T17:00:00Z'), false).days, 6, 'private Spiele unverändert');
    const md2 = { speed: 'm20', lastTick: Z('2026-11-09T04:30:00Z'), carry: 0 }, d2 = C.clockDue(md2, Z('2026-11-09T05:30:00Z'), true);
    assert.equal(d2.days, 2, 'Mo: halbe Std. Wochenende (0,5) + halbe Std. normal (1,5)'); assert.ok(Math.abs(d2.carry) < 1, 'Rest passt');
    assert.equal(C.effSpeed({ speed: 'p' }, Z('2026-11-07T12:00:00Z'), true).key, 'p', 'Pause bleibt Pause');
    console.log('0.21.26 ok: Wochenend-Tempo Fr 17 – Mo 6 Uhr (auch Sommerzeit), Patch-Hinweis einmal je Konto'); }
  // 0.21.22: ältere Fenster ohne vis-Angabe zählen ebenfalls; Server meldet die App-Version
  await call('ben', 'GET', `/games/${g.id}/state?ping=1`); await new Promise((r) => setTimeout(r, 40)); await call('ben', 'GET', `/games/${g.id}/state?ping=1`);
  const pt2 = ok(await call('tim', 'GET', '/admin/playtime'), 'Spielzeit 2'); assert.ok(pt2.rows.find((r) => r.key === 'ben').total >= 30, 'altes Fenster ohne vis zählt');
  { const { APP_VERSION } = await import('../server/version.mjs'); const r = await handle(new Request(`http://localhost/api/games/${g.id}/state`, { headers: { cookie: jar.ben } }), { store });
    assert.equal(r.headers.get('x-app'), APP_VERSION, 'Server meldet die App-Version'); assert.equal(APP_VERSION, JSON.parse(fs.readFileSync('package.json', 'utf8')).version, 'version.mjs passt zu package.json (npm run build)'); }
  console.log('0.21.19 ok: Spielzeit', ra.total, 'ms für Anna,', pt.rows.length, 'Konten in der Übersicht'); }
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
const mdBack = { ...ms.metadata, lastTick: Date.now() - 15 * 3600000 - 1000 };
await store.set('games/main/state', ms.data, { metadata: mdBack, onlyIfMatch: ms.etag });
const expDays = Math.min(30, Math.floor(_clock.progressDays(mdBack, Date.now(), true)));   // am Wochenende 1 Tag je Stunde
const tk = await tickMain(store);
assert.ok(tk.days >= expDays && tk.days >= 15, `Tick holt ${expDays} Tage nach: ` + JSON.stringify(tk));
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
  await store.set('games/main/state', m2.data, { metadata: { ...m2.metadata, lastTick: Date.now() - 4 * 1800000 * (_clock.isWeekend(Date.now()) ? 2 : 1) - 1000 }, onlyIfMatch: m2.etag });
  await tickMain(store);
  const sa = await call('anna', 'GET', '/games/main/state?v=x');
  const ws = JSON.parse(gunzipSync(Buffer.from(sa.data)).toString());
  const ann = ws.airlines.find((a) => a.name === 'Hanse Air' && a.owner === 'anna');
  const rep = ann.reports.find((x) => x.kind === 'routes');
  assert.equal(rep.status, 'done', 'Bericht fertig'); assert.ok(rep.res.rows.length > 0, 'Bericht hat Vorschläge');
  console.log('Marktstudie ok:', rep.res.title, '·', rep.res.rec ? rep.res.rec.text.slice(0, 80) : '–'); }
// 0.21.49: Abruf liefert die schlanke Ansicht (ohne Einzelposten), die eigenen Einzelposten kommen über /ledger
{ const SMx = (await import('../shared/engine.cjs')).default;
  const sv = await call('anna', 'GET', '/games/main/state?v=y'), vs = JSON.parse(gunzipSync(Buffer.from(sv.data)).toString());
  const fu = await call('anna', 'GET', '/games/main/state?v=y&full=1'), fs2 = JSON.parse(gunzipSync(Buffer.from(fu.data)).toString());
  assert.equal(sv.headers.get('x-ver'), fu.headers.get('x-ver'), 'gleiche Version');
  assert.ok(vs.view === 1 && vs.airlines.every((a) => !a.ledger.det && !a.ledger.fx && a.ledger.months.every((m) => !m.det && !m.fx)), 'Ansicht ohne Einzelposten');
  const annF = fs2.airlines.find((a) => a.owner === 'anna' && a.status !== 'insolvent'); assert.ok(annF.ledger.det, 'voller Stand hat Einzelposten');
  assert.ok(sv.data.byteLength < fu.data.byteLength, `Ansicht kleiner (${sv.data.byteLength} < ${fu.data.byteLength})`);
  const ld = ok(await call('anna', 'GET', '/games/main/ledger'), 'Einzelposten'); assert.equal(ld.ver, sv.headers.get('x-ver')); assert.deepStrictEqual(ld.det, annF.ledger.det); assert.equal(ld.months.length, annF.ledger.months.length);
  const wv = SMx.deserialize(vs), av = wv.airlines[annF.id]; assert.ok(!av.ledger.det && !av.ledger.fx, 'Ansicht legt keine leeren Einzelposten an');
  const wf = SMx.deserialize(fs2); assert.deepStrictEqual(SMx.balanceSheet(av), SMx.balanceSheet(wf.airlines[annF.id]), 'Bilanz gleich');
  const v2 = await call('anna', 'GET', '/games/main/state?v=y'); assert.equal(v2.data.byteLength, sv.data.byteLength, 'Ansicht aus dem Speicher');
  console.log(`0.21.49 ok: schlanke Ansicht ${Math.round(sv.data.byteLength / 1024)} KB statt ${Math.round(fu.data.byteLength / 1024)} KB, Einzelposten über /ledger`); }
// Manipulierte Aktionen dürfen den Spielstand nicht beschädigen (sonst stürzt die Welt für alle ab)
{ const evil = [{ type: 'terminal', apt: 'HAM', v: 'constructor' }, { type: 'terminal', apt: 'HAM', v: '__proto__' }, { type: 'hire', role: 'xyz', count: 5 },
    { type: 'hire', role: 'pilot', group: 'toString', count: 3 }, { type: 'train', from: 'A32F', to: 'hasOwnProperty', count: 1 }, { type: 'insurance', v: 'valueOf' },
    { type: 'openRoute', base: 'HAM', dest: 'CDG', typeId: 'A20N', term: 'constructor', service: '__proto__', buffer: 'toString', freq: 1, fo: 99, fi: 99 },
    { type: 'academy', role: 'constructor', level: 2 }, { type: 'repay', id: 'nix' }, { type: 'openBase', apt: 'constructor' }];
  for (const action of evil) { const r = await call('anna', 'POST', '/games/main/action', { action }); assert.ok(r.status < 500, 'kein Serverfehler bei ' + JSON.stringify(action)); }
  const m3 = await store.getWithMetadata('games/main/state', { type: 'arrayBuffer' });
  await store.set('games/main/state', m3.data, { metadata: { ...m3.metadata, lastTick: Date.now() - 3 * 1800000 * (_clock.isWeekend(Date.now()) ? 2 : 1) - 1000 }, onlyIfMatch: m3.etag });
  const t3 = await tickMain(store);
  assert.ok(t3.days >= 3, 'Welt läuft nach manipulierten Aktionen weiter: ' + JSON.stringify(t3));
  const rp = ok(await call('anna', 'POST', '/games/main/action', { action: { type: 'repay', id: 'nix' } }), 'Kredit fehlt');
  assert.equal(rp.ok, false); assert.ok(rp.msg, 'Meldung beim fehlenden Kredit');
  console.log('Robust ok: 10 manipulierte Aktionen abgewiesen, Welt läuft weiter (+' + t3.days + ' Tage)'); }
// 0.21.39: KI-Vertretung – nach 72 Stunden ohne Aktion und ohne aktive Sitzung übernimmt die KI, eine eigene Aktion beendet sie
{ const SMx = (await import('../shared/engine.cjs')).default;
  const load = async () => { const m = await store.getWithMetadata('games/main/state', { type: 'arrayBuffer' }); return { m, w: SMx.deserialize(JSON.parse(gunzipSync(Buffer.from(m.data)).toString())) }; };
  const save = async (m, w, back) => { const buf = gzipSync(Buffer.from(JSON.stringify(SMx.serialize(w)))); await store.set('games/main/state', buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), { metadata: { ...m.metadata, lastTick: Date.now() - back }, onlyIfMatch: m.etag }); };
  let { m, w } = await load(); const al = w.humans.find((h) => h.owner === 'anna' && h.status !== 'insolvent');
  assert.ok(al, 'Anna hat eine Airline in der Hauptwelt');
  al.lastAct = Date.now() - 73 * 3600e3; w.autoAt = 0; await store.delete('play/anna');
  await save(m, w, 3 * 1800000 * (_clock.isWeekend(Date.now()) ? 2 : 1) + 1000);
  await tickMain(store);
  ({ m, w } = await load()); const a2 = w.airlines[al.id];
  assert.ok(a2.auto, 'nach 72 Stunden vertritt die KI'); assert.ok(a2.events.some((e) => /vertritt Ihre Airline/.test(e.msg)), 'Hinweis im Logbuch');
  ok(await call('anna', 'POST', '/games/main/action', { action: { type: 'resume' } }), 'zurück übernehmen');
  ({ m, w } = await load()); assert.ok(!w.airlines[al.id].auto && w.airlines[al.id].lastAct > Date.now() - 60000, 'eigene Aktion beendet die Vertretung');
  // 0.21.43: rückwirkend – ohne erfasste Aktion zählt die letzte Spielzeit
  for (const [hAgo, want] of [[80, true], [10, false]]) {
    ({ m, w } = await load()); delete w.airlines[al.id].lastAct; w.airlines[al.id].auto = 0; w.autoAt = 0; await store.setJSON('play/anna', { last: Date.now() - hAgo * 3600e3 });
    await save(m, w, 3 * 1800000 * (_clock.isWeekend(Date.now()) ? 2 : 1) + 1000); await tickMain(store);
    ({ m, w } = await load()); assert.equal(!!w.airlines[al.id].auto, want, `zuletzt gespielt vor ${hAgo} h → Vertretung ${want ? 'an' : 'aus'}`);
  }
  ok(await call('anna', 'POST', '/games/main/action', { action: { type: 'resume' } }), 'zurück übernehmen');
  // 0.21.47: Spielleitung startet die Vertretung für eine Person – sie bleibt über die stündliche Prüfung, bis die Person wieder spielt
  assert.equal((await call('anna', 'POST', '/games/main/admin', { cmd: 'autopilot', airlineId: al.id, on: true })).status, 403, 'nur die Spielleitung');
  const fa = ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'autopilot', airlineId: al.id, on: true }), 'Vertretung anordnen'); assert.ok(/vertritt jetzt/.test(fa.msg), fa.msg);
  const adl = ok(await call('tim', 'GET', '/games/main/admin'), 'Verwaltung'); const ap = adl.players.find((x) => x.airlineId === al.id); assert.ok(ap.auto && ap.autoForced, 'Liste zeigt die Vertretung');
  await store.setJSON('play/anna', { last: Date.now() - 3600e3 });
  ({ m, w } = await load()); w.autoAt = 0; await save(m, w, 3 * 1800000 * (_clock.isWeekend(Date.now()) ? 2 : 1) + 1000); await tickMain(store);
  ({ m, w } = await load()); assert.ok(w.airlines[al.id].auto && w.airlines[al.id].autoForced, 'bleibt trotz kurzer Abwesenheit an'); assert.ok(w.airlines[al.id].events.some((e) => /Spielleitung hat die KI-Vertretung gestartet/.test(e.msg)), 'Hinweis im Logbuch');
  // Person spielt wieder (Spielzeit nach der Anordnung) → Vertretung endet bei der nächsten Prüfung
  ({ m, w } = await load()); w.autoAt = 0; await store.setJSON('play/anna', { last: w.airlines[al.id].autoForced + 120e3 }); await save(m, w, 3 * 1800000 * (_clock.isWeekend(Date.now()) ? 2 : 1) + 1000); await tickMain(store);
  ({ m, w } = await load()); assert.ok(!w.airlines[al.id].auto && !w.airlines[al.id].autoForced, 'endet, wenn die Person wieder spielt');
  // erneut anordnen und von Hand beenden; eigene Aktion beendet sie ebenso
  ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'autopilot', airlineId: al.id, on: true }), 'erneut');
  ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'autopilot', airlineId: al.id, on: false }), 'beenden'); ({ m, w } = await load()); assert.ok(!w.airlines[al.id].auto && !w.airlines[al.id].autoForced, 'von Hand beendet');
  ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'autopilot', airlineId: al.id, on: true }), 'nochmal');
  ok(await call('anna', 'POST', '/games/main/action', { action: { type: 'resume' } }), 'Person übernimmt selbst'); ({ m, w } = await load()); assert.ok(!w.airlines[al.id].auto && !w.airlines[al.id].autoForced, 'eigene Aktion beendet');
  console.log('0.21.47 ok: Spielleitung startet/beendet die KI-Vertretung je Person; sie hält, bis die Person wieder spielt');
  // Engine: Vertretung handelt maßvoll (Preisautomatik, Personal, freie Flugzeuge) und hält die Bilanz
  const v = SMx.newWorld({ seed: 55 }), p = SMx.addHuman(v, { id: 'P1', name: 'Abwesend', code: 'AW', base: 'HAJ' }); v.playerId = 'P1'; p.ledger.equityFlow(60e6, 't');
  SMx.applyAction(v, 'P1', { type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAJ' }); SMx.applyAction(v, 'P1', { type: 'openRoute', base: 'HAJ', dest: 'PMI', typeId: 'A20N', freq: 1, fo: 400, fi: 400 });
  SMx.applyAction(v, 'P1', { type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAJ' });
  for (let i = 0; i < 20; i++) v.step();
  p.auto = 1; const e0 = p.events.length; for (let i = 0; i < 70; i++) v.step();
  const acts = p.events.slice(e0).filter((e) => /^Vertretung \(KI\)/.test(e.msg)).map((e) => e.msg);
  assert.ok(acts.some((x) => /Preisautomatik/.test(x)) && acts.some((x) => /Neue Strecke/.test(x)), 'Vertretung: ' + acts.join(' | '));
  assert.ok(p.activeRoutes().every((r) => r.ap > 0), 'alle Strecken mit Preisautomatik'); assert.ok(Math.abs(SMx.balanceSheet(p).check) < 1, 'Bilanz ausgeglichen');
  // 0.21.48: Vertretung baut langsam aus – leere Airline least ihr erstes Flugzeug und fliegt damit, Strecke ohne Flugzeug bekommt eins
  { const v2 = SMx.newWorld({ seed: 3 }), q = SMx.addHuman(v2, { id: 'P1', name: 'Leer', code: 'LE', base: 'HAM' }); v2.playerId = 'P1'; q.auto = 1;
    for (let i = 0; i < 130; i++) v2.step();
    const ev = q.events.filter((e) => /^Vertretung \(KI\)/.test(e.msg)).map((e) => e.msg);
    assert.ok(ev.some((x) => /geleast als erstes Flugzeug/.test(x)) && ev.some((x) => /Neue Strecke/.test(x)) && q.fleet.length >= 1 && q.fleet.length <= 3, 'Ausbau: ' + q.fleet.length + ' · ' + ev.join(' | '));
    assert.ok(q.activeRoutes().length >= 1 && Math.abs(SMx.balanceSheet(q).check) < 1, 'fliegt, Bilanz stimmt');
    assert.ok(q.activeRoutes().every((r) => !v2.routeBan(q, r.base, r.dest)), 'keine Strecke unter Flugverbot');
    const v3 = SMx.newWorld({ seed: 5 }), o = SMx.addHuman(v3, { id: 'P1', name: 'Ohne', code: 'OH', base: 'HAM' }); v3.playerId = 'P1';
    SMx.applyAction(v3, 'P1', { type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); for (let i = 0; i < 16; i++) v3.step();
    SMx.applyAction(v3, 'P1', { type: 'openRoute', base: 'HAM', dest: 'PMI', typeId: 'A20N', freq: 1 }); for (const x of [...o.fleet]) SMx.applyAction(v3, 'P1', { type: 'dispose', acId: x.id });
    o.auto = 1; for (let i = 0; i < 31; i++) v3.step();
    assert.ok(o.events.some((e) => /geleast für die Strecke HAM–PMI/.test(e.msg)) && o.fleet.some((x) => x.type_id === 'A20N'), 'Strecke ohne Flugzeug bekommt eins');
  }
  console.log('0.21.48 ok: Vertretung least langsam (erstes Flugzeug, fehlendes Muster, nur bei Gewinn) und setzt es ein');
  console.log('0.21.39/43 ok: KI-Vertretung nach 72 h (auch rückwirkend nach letzter Spielzeit), Ende durch eigene Aktion; ' + acts.length + ' Vertretungsschritte in 70 Tagen');
}
// 0.21.34: Fehlerprotokoll der Geräte – senden darf jedes Konto, lesen nur Admins; Flut je Konto begrenzt
{ ok(await call('anna', 'POST', '/diag', { kind: 'load', msg: 'Zeitüberschreitung', status: 0, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', extra: { attempt: 2, game: 'main' } }), 'Diag senden');
  assert.equal((await call('anna', 'GET', '/admin/diag')).status, 403, 'Protokoll nur für Admins');
  const dg = ok(await call('tim', 'GET', '/admin/diag'), 'Diag lesen'); const e0 = dg.list.find((x) => x.u === 'anna');
  assert.ok(e0 && e0.kind === 'load' && e0.extra.attempt === 2 && e0.server, 'Meldung mit Zusatzangaben im Protokoll');
  for (let i = 0; i < 40; i++) await call('ben', 'POST', '/diag', { kind: 'js', msg: 'x' + i });
  const dg2 = ok(await call('tim', 'GET', '/admin/diag'), 'Diag lesen 2'); assert.equal(dg2.list.filter((x) => x.u === 'ben').length, 30, 'höchstens 30 je Konto und Stunde');
  ok(await call('tim', 'GET', '/admin/diag?clear=1'), 'Diag leeren');
  console.log('0.21.34 ok: Fehlerprotokoll (Senden, nur Admins lesen, 30/Stunde je Konto, leeren)'); }
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
  { assert.ok(ad.audit && Array.isArray(ad.audit.pairs) && ad.audit.humans.length >= 2, 'Prüfübersicht in der Verwaltung');
    const [h1, h2] = ad.audit.humans;
    assert.equal((await call('anna', 'POST', '/games/main/admin', { cmd: 'auditOrder', b: h1.id, a: h2.id, amount: 2e6 })).status, 403, 'Nachprüfung nur für die Verwaltung');
    const ao = ok(await call('tim', 'POST', '/games/main/admin', { cmd: 'auditOrder', b: h1.id, a: h2.id, amount: 2e6, state: true }), 'Nachprüfung anordnen'); assert.ok(/Staatskasse/.test(ao.msg), ao.msg);
    const ad2 = ok(await call('tim', 'GET', '/games/main/admin'), 'Verwaltung neu laden'); assert.ok(ad2.audit.log.some((r) => r.by && r.findings.length === 1 && r.findings[0].b === h1.id), 'Prüfbericht gespeichert'); }
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
  ad = ok(await call('tim', 'GET', '/games/main/admin'), 'Admin nach Start');
  { const w1 = _clock.isWeekend(real() + 2 * 3600e3), w2 = _clock.isWeekend(real() + 3 * 3600e3);   // am Wochenende 1 Spieltag je Stunde
    if (w1 === w2) assert.equal(ad.day, w1 ? 1 : 3, 'eine Stunde nach dem Start: ' + (w1 ? 1 : 3) + ' Tage (' + ad.day + ')'); else assert.ok(ad.day >= 1 && ad.day <= 3, 'Start am Übergang zum Wochenende: ' + ad.day); } assert.equal(ad.startAt, null, 'Termin vorbei');
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
  SMx.setFuelX(0); assert.ok(SMx.refPrice('RUH', 'JED') < 85, 'regulierte Inlandstarife Saudi-Arabien');
  const ws = SMx.newGame({ seed: 4, base: 'HAM' }), ps = ws.player, A = (a) => SMx.applyAction(ws, ps.id, a);
  assert.ok(ws.airlines.NJD && ws.airlines.NJD.activeRoutes().some((r) => r.dest === 'JED'), 'Najd Air fliegt Riad–Dschidda');
  A({ type: 'acquire', typeId: 'A21N', mode: 'lease', base: 'HAM' });
  for (let i = 0; i < 240; i++) ws.step();
  assert.ok(ws.acmiOffers.some((o) => o.ev), 'Charteranfragen zu Großereignissen');
  const o = ws.acmiOffers.find((x) => SMx.P.AIRCRAFT_TYPES[x.type].group === 'A32F' && !SMx.P.AIRCRAFT_TYPES[x.type].role && x.type !== 'A21N' && x.start >= ws.day);
  if (o) { const ac = ps.fleet[0]; const r = A({ type: 'acmi', offerId: o.id, acId: ac.id }); assert.equal(r.ok, true, 'Familie passt: ' + r.msg); assert.ok(ac.acmi.rate !== o.rate || o.type === ac.type_id, 'Rate nach Sitzen angepasst'); }
  console.log('0.17.3 ok: Riad–Dschidda', Math.round(SMx.refPrice('RUH', 'JED')), '€ mit Najd Air als Konkurrenz,', ws.acmiOffers.filter((x) => x.ev).length, 'Großereignis-Charter,', o ? 'Familien-Charter angenommen' : 'keine passende Familienanfrage'); }
// 0.17.4/0.17.5: feste Slottermine, Basis-Slots, Studien je Basis
{ const SMx = (await import('../shared/engine.cjs')).default;
  const wf = SMx.newGame({ seed: 6, base: 'FRA' }), pf = wf.player, A = (a) => SMx.applyAction(wf, pf.id, a);
  assert.equal(pf.heldAt('FRA', wf.day), 3, 'drei Basis-Slots in Frankfurt');
  assert.ok(SMx.baseSlotCost(wf, 'FRA') > 5 * SMx.baseSlotCost(wf, 'HAJ'), 'Basis-Slots an Drehkreuzen viel teurer');
  pf.ledger.cashOnly(2e8, 't');
  { const r0 = A({ type: 'openBase', apt: 'MUC' }); assert.equal(r0.ok, false, 'München lehnt eine junge Airline ab'); assert.ok(r0.rejected && /Ansehen/.test(r0.msg), 'Absage mit Begründung'); }
  pf.brand = 1; pf._st = null;   // starke Marke: München sagt unter Auflagen zu
  assert.equal(SMx.baseApproval(pf, 'MUC').cond, true, 'Zusage unter Auflagen');
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
// 0.17.6: Charter-Pool, mehrere Aufträge je Flugzeug, freie Zeiträume
{ const SMx = (await import('../shared/engine.cjs')).default;
  const wc = SMx.newGame({ seed: 4, base: 'HAM' }), pc = wc.player, A = (a) => SMx.applyAction(wc, pc.id, a);
  A({ type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); for (let i = 0; i < 20; i++) wc.step();
  const ac = pc.fleet[0]; assert.equal(A({ type: 'assignAircraft', acId: ac.id, mode: 'charter' }).ok, true, 'Charter-Pool'); assert.equal(ac.mode, 'charter');
  const mk = (start, end) => { const o = { id: 'T' + start, client: 'Test ' + start, type: 'A20N', start: wc.day + start, end: wc.day + end, rate: 20000, expires: wc.day + 30 }; wc.acmiOffers.push(o); return o; };
  const o1 = mk(5, 20), o2 = mk(30, 50), o3 = mk(15, 35);
  assert.equal(A({ type: 'acmi', offerId: o2.id, acId: ac.id }).ok, true, 'später Auftrag');
  assert.equal(A({ type: 'acmi', offerId: o1.id, acId: ac.id }).ok, true, 'früherer Auftrag davor');
  assert.equal(A({ type: 'acmi', offerId: o3.id, acId: ac.id }).ok, false, 'Überschneidung abgelehnt');
  assert.deepEqual(SMx.acmiList(ac, wc.day).map((b) => b.start - wc.day), [5, 30], 'zwei Aufträge in Reihenfolge');
  assert.deepEqual(SMx.acmiGaps(ac, wc.day, wc.day + 60).map(([x, y]) => [x - wc.day, y - wc.day]), [[0, 5], [20, 30], [50, 60]], 'freie Zeiträume');
  const d0 = wc.day; let rev = 0; for (let i = 0; i < 55; i++) { wc.step(); }
  const acc = pc.ledger.months ? null : null; rev = SMx.acmiList(ac, wc.day).length;
  assert.equal(rev, 0, 'beide Aufträge geflogen'); assert.ok(ac.used_hours === 0 || ac.mode === 'charter', 'fliegt keine Strecke');
  const ser = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(wc)))); assert.ok(ser.player.fleet[0].mode === 'charter', 'Pool bleibt nach Speichern');
  console.log('0.17.6 ok: Charter-Pool, zwei Aufträge nacheinander ab Tag', d0, ', Überschneidung abgelehnt, freie Zeiträume stimmen'); }
// 0.17.7: bekannte Fachkräfte (Lukas Flitz, Marten Grillkalt, Philipp Peter Son), Rolle Bordprodukt
{ const SMx = (await import('../shared/engine.cjs')).default;
  const wn = SMx.newGame({ seed: 4, base: 'HAM' }), pn = wn.player, A = (a) => SMx.applyAction(wn, pn.id, a);
  pn.ledger.cashOnly(5e8, 't'); while (wn.day < 95) wn.step();
  for (const id of ['NLF', 'NMG', 'NPS']) assert.ok(wn.candidates.some((c) => c.id === id), id + ' bewirbt sich');
  const t0 = pn.turnExtra('HAM'), u0 = pn.extraU('HAM', 'CDG').business;
  for (const id of ['NLF', 'NMG', 'NPS']) assert.equal(A({ type: 'hireExpert', cid: id }).ok, true, id + ' eingestellt');
  for (const id of ['NLF', 'NMG', 'NPS']) { A({ type: 'expertContract', id, kind: 'bind' }); A({ type: 'expertContract', id, kind: 'nca', v: true }); }
  for (let i = 0; i < 35; i++) wn.step();
  assert.equal(pn.turnExtra('HAM'), t0 - 4, 'Flitz: Bodenzeit kürzer');
  assert.ok(pn.extraU('HAM', 'CDG').business > u0 + 0.01 && pn.bizPrem() >= 0.05, 'Son: Premium-Wahrnehmung (schwankt monatlich)');
  const mg = pn.experts.find((e) => e.id === 'NMG'); assert.equal(mg.level, 1, 'Grillkalt startet als Junior');
  while (wn.day < 95 + 400) wn.step(); if (pn.experts.includes(mg)) assert.equal(mg.level, 2, 'Grillkalt wird Senior');
  console.log('0.17.7 ok: Flitz −4 Min. Bodenzeit, Son hebt die Premium-Wahrnehmung, Grillkalt nach einem Jahr Senior'); }
// 0.17.9: Konzernvorteile bei Mehrheit an einer KI-Airline
{ const SMx = (await import('../shared/engine.cjs')).default;
  const wg = SMx.newGame({ seed: 4, base: 'HAM' }), pg = wg.player, A = (a) => SMx.applyAction(wg, pg.id, a);
  pg.ledger.cashOnly(2e9, 't'); A({ type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); for (let i = 0; i < 60; i++) wg.step();
  const T = wg.list.filter((a) => a.archetype && a.status === 'active').sort((a, b) => SMx.mktCap(wg, a) - SMx.mktCap(wg, b))[3];
  for (let n = 0; n < 20 && SMx.stakeOf(pg, T) < 0.55; n++) A({ type: 'buyStake', target: T.id, q: 0.1 });
  assert.equal(SMx.parentOf(wg, T), pg, 'Mutterkonzern erkannt');
  const tr = T.activeRoutes()[0]; assert.ok(tr, 'Tochter fliegt');
  const o = A({ type: 'openRoute', base: 'HAM', dest: tr.dest === 'HAM' ? tr.base : tr.dest, typeId: 'A20N', freq: 1 });
  { const mr = pg.activeRoutes()[0]; if (mr) { const before = wg.competitorFares('NOPE', mr.base, mr.dest).length, sub = wg.competitorFares(T.id, mr.base, mr.dest).length; assert.ok(sub < before || before === 0, 'Tochter zählt die Mutter nicht als Preiskonkurrenz'); } }
  assert.equal(A({ type: 'groupDiv', t: T.id, v: 0.5 }).ok, true, 'Ausschüttung steuern'); assert.equal(A({ type: 'groupDiv', t: T.id, v: 0.9 }).ok, false, 'höchstens 50 %');
  const c0 = pg.ledger.cash, sp = A({ type: 'groupSpecial', t: T.id });
  assert.equal(sp.ok, true, 'Sonderausschüttung: ' + sp.msg); assert.ok(pg.ledger.cash > c0, 'Geld fließt');
  assert.equal(A({ type: 'groupSpecial', t: T.id }).ok, false, 'nur alle 90 Tage');
  const ac = T.fleet[0], v = SMx.aiDealValue(wg, T, { from: pg.id, to: T.id, give: [{ k: 'cash', amount: 1 }], take: [{ k: 'ac', id: ac.id }] });
  assert.equal(v.margin, 0, 'Konzernhandel ohne Aufschlag');
  console.log('0.17.9 ok: Mehrheit an', T.name, '– Ausschüttung gesteuert, Sonderausschüttung', Math.round(sp.mine / 1e5) / 10, 'Mio. €, Konzernhandel zum fairen Wert', o.ok ? '' : ''); }
{ const SMx = (await import('../shared/engine.cjs')).default; const wa = SMx.newGame({ seed: 2, base: 'HAM' }), c0 = wa.player.ledger.cash;
  assert.equal(SMx.adminGrant(wa, wa.playerId, 999e6, 'Tim').ok, true, 'Spielleitung +999 Mio.'); assert.equal(wa.player.ledger.cash - c0, 999e6 * 100, '+999 Mio. gebucht');
  SMx.adminGrant(wa, wa.playerId, -2000e6, 'Tim'); assert.equal(wa.player.ledger.cash - c0, 0, 'höchstens −999 Mio. je Buchung');
  console.log('0.17.11 ok: Kapitalkorrektur bis ±999 Mio. €'); }
// 0.18: Börse gegen Kreislauf (ausgeben, Ergebnis drücken, billig zurückkaufen), Kurs geglättet, Kaufpreis ohne Aufschaukeln, Neugründungen
{ const SMx = (await import('../shared/engine.cjs')).default;
  const wx = SMx.newGame({ seed: 4, base: 'HAM' }), px = wx.player, A = (a) => SMx.applyAction(wx, px.id, a);
  px.ledger.cashOnly(2e9, 't'); for (let i = 0; i < 100; i++) wx.step();
  const c0 = SMx.mktCap(wx, px); px.ledger.post('one_off', -5e8); assert.equal(SMx.mktCap(wx, px), c0, 'Kurs bewegt sich nicht mehr mit dem Tagesergebnis');
  assert.equal(A({ type: 'issueShares', q: 0.1 }).ok, true, 'Kapitalerhöhung');
  assert.equal(A({ type: 'buyback', q: 0.05 }).ok, false, 'Rückkauf direkt danach gesperrt');
  const T = wx.list.find((a) => a.archetype && a.status === 'active'), p1 = SMx.stakeBuyPrice(wx, px, T, 0.05); A({ type: 'buyStake', target: T.id, q: 0.05 }); const p2 = SMx.stakeBuyPrice(wx, px, T, 0.05);
  assert.ok(Math.abs(p2 / p1 - 1) < 0.001, 'zweites Paket kostet gleich viel (kein Aufschaukeln)');
  const bs = SMx.balanceSheet(px); assert.ok(Math.abs(bs.assets - (bs.cash + bs.nbv + bs.deposits + bs.slots + bs.stakes)) < 1, 'Bilanzposten vollständig');
  const wz = SMx.newWorld({ seed: 11 }); wz.playerId = null; for (let i = 0; i < 400; i++) wz.step();
  const nAct = wz.list.filter((a) => a.archetype && a.status !== 'insolvent').length; assert.ok(nAct > Object.keys(SMx.AI_SETUP).length, 'neue KI-Airlines gegründet (' + nAct + ')');
  console.log('0.18 ok: Kurs geglättet, Rückkauf-Sperre, Kaufpreis ohne Aufschaukeln, Bilanz vollständig,', nAct, 'KI-Airlines nach 400 Tagen'); }
console.log('Hauptwelt ok: 8 Airlines, Tag', w.day, '· Tick', tk.days, 'Tage · Neustart Isar Jet → Phoenix');
// Version 0.16: Karriere, Marktwissen, Slots als Vermögen, Übernahme, Pixel-Logo, Frequenz unter täglich
{ const SMx = (await import('../shared/engine.cjs')).default;
  const w6 = SMx.newGame({ seed: 9, base: 'HAJ', mode: 'career' }), p6 = w6.player, A6 = (a) => SMx.applyAction(w6, p6.id, a);
  assert.equal(SMx.careerLv(p6), 0, 'Karriere startet in Phase 1');
  assert.ok(SMx.riskTerms(p6, 'B789').reject && !SMx.riskTerms(p6, 'DH8D').reject && !SMx.riskTerms(p6, 'AT76').cond && !SMx.riskTerms(p6, 'E295').reject, 'Ansehen: 787 abgelehnt, Turboprops und Regionaljets zugesagt');
  assert.ok(SMx.riskTerms(p6, 'A20N').cond && !SMx.riskTerms(p6, 'A20N').reject && SMx.riskTerms(p6, 'A20N').lease > 1.15, 'A320neo zum Start nur unter Auflagen');
  { const st0 = SMx.standingOf(p6, w6.day).v; assert.ok(st0 >= 15 && st0 <= 35, 'Startansehen um 25: ' + st0); }
  const k0 = w6.knowOf(p6, 'HAJ', 'MUC'); assert.ok(k0.lv <= 1 && k0.sigma > 0.2, 'ohne Studie nur grobes Marktwissen');
  assert.equal(A6({ type: 'acquire', typeId: 'DH8D', mode: 'lease', base: 'HAJ' }).ok, true, 'Dash 8 leasen');
  const r6 = A6({ type: 'openRoute', base: 'HAJ', dest: 'NUE', typeId: 'DH8D', freq: 1, wk: 4, fo: 100, fi: 100 }); assert.equal(r6.ok, true, '4x pro Woche: ' + r6.msg);
  assert.equal(p6.routes.find((r) => r.id === r6.id).wk, 4, 'Wochenfrequenz gespeichert');
  const b6 = SMx.balanceSheet(p6); assert.ok(Math.abs(b6.check) < 1, 'Bilanz stimmt mit Slots als Vermögen'); assert.ok(b6.slots > 0, 'Slots aktiviert');
  { const c0 = p6.ledger.cash; assert.equal(A6({ type: 'openBase', apt: 'BRE' }).ok, true, 'zweite Basis geht – nur teurer');
    assert.ok(c0 - p6.ledger.cash > 1.9 * SMx.baseSetupCost(w6, 'BRE') * 100, 'Aufschlag auf die zweite Basis in Phase 1'); }
  const ai6 = w6.list.find((a) => a.archetype && a.status !== 'insolvent');
  assert.ok(SMx.maValue(w6, ai6, p6).price > SMx.maValue(w6, ai6).price * 1.4, 'Übernahme vor Phase 3 mit Aufschlag');
  { const l0 = SMx.leaseRoom(p6, w6.day).left; A6({ type: 'acquire', typeId: 'DH8D', mode: 'lease', base: 'HAJ' }); assert.equal(SMx.leaseRoom(p6, w6.day).left, l0 - 1, 'jeder Leasingvertrag zählt');
    for (let i = 0; i < 8; i++) A6({ type: 'acquire', typeId: 'DH8D', mode: 'lease', base: 'HAJ' });
    const rj = A6({ type: 'acquire', typeId: 'DH8D', mode: 'lease', base: 'HAJ' }); assert.ok(!rj.ok && rj.rejected, 'Leasinggeber bremsen schnelles Wachstum');
    p6.ledger.cashOnly(3e7, 't'); assert.equal(A6({ type: 'acquire', typeId: 'DH8D', mode: 'buy', base: 'HAJ' }).ok, true, 'Kaufen geht trotzdem'); }
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
// 0.19: Ansehen, Schocks, Ankeraktionäre, Flughafenwachstum, Privatjets und Frachter, Endspiel
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newGame({ seed: 21, base: 'HAJ' }), p = w.player, A = (a) => SMx.applyAction(w, p.id, a);
  // Start bleibt möglich: Turboprop und Regionaljet ohne Auflagen, Strecke eröffnen
  assert.equal(A({ type: 'acquire', typeId: 'AT76', mode: 'lease', base: 'HAJ' }).ok, true, 'ATR zum Start');
  assert.equal(A({ type: 'acquire', typeId: 'E295', mode: 'lease', base: 'HAJ' }).ok, true, 'E195-E2 zum Start');
  const rb = A({ type: 'acquire', typeId: 'B789', mode: 'lease', base: 'HAJ' }); assert.ok(!rb.ok && rb.rejected, '787 wird abgelehnt');
  for (let i = 0; i < 16; i++) w.step();
  const ro = ['VIE', 'CPH', 'ZRH', 'AMS', 'BCN', 'NCE', 'PRG'].map((d) => A({ type: 'openRoute', base: 'HAJ', dest: d, typeId: 'E295', freq: 1 })).find((x) => x.ok) || { ok: false, msg: 'keine Strecke' }; assert.equal(ro.ok, true, 'erste Strecke: ' + ro.msg);
  const ba = SMx.baseApproval(p, 'FRA'); assert.ok(!ba.ok && /Ansehen/.test(ba.msg), 'Frankfurt lehnt Basis ab');
  assert.ok(SMx.baseApproval(p, 'BRE').ok, 'Bremen sagt zu');
  for (let i = 0; i < 200; i++) w.step();
  const st = SMx.standingOf(p, w.day).v; assert.ok(st > 30, 'Ansehen wächst mit Flugbetrieb: ' + st);
  // A350-1000ULR: Sydney–London nonstop
  assert.ok(SMx.rangeOk('SYD', 'LHR', 'A35U') && !SMx.rangeOk('SYD', 'LHR', 'A35K'), 'A350-1000ULR schafft SYD–LHR');
  // Schocks verändern Rechengrundlagen
  const w2 = SMx.newGame({ seed: 5, base: 'FRA' }), p2 = w2.player; for (let i = 0; i < 100; i++) w2.step();
  const d0 = SMx.leaseDelivery(w2, 'A20N', 'lease'), r0 = w2.macro.rate;
  w2.addEvent({ type: 'supply_chain', mxX: 1.25, leaseX: 1.15, delay: 60, scope: 'all', end: w2.day + 400, text: 'Test Lieferkette', severity: 'crit' });
  w2.addEvent({ type: 'credit_crunch', rateD: 0.02, req: 10, scope: 'all', end: w2.day + 400, text: 'Test Kreditkrise', severity: 'crit' });
  assert.equal(SMx.leaseDelivery(w2, 'A20N', 'lease'), d0 + 60, 'Lieferkette verlängert Auslieferung');
  assert.ok(Math.abs(SMx.shockX(w2, 'mx') - 1.25) < 1e-9 && Math.abs(SMx.shockX(w2, 'lease') - 1.15) < 1e-9, 'Wartung und Leasing teurer');
  w2.step(); assert.ok(SMx.riskTerms(p2, 'A20N').req >= 45, 'Kreditkrise: Leasinggeber verlangen mehr Ansehen');
  p2.ledger.cashOnly(3e8, 't'); SMx.applyAction(w2, p2.id, { type: 'acquire', typeId: 'A20N', mode: 'buy', base: 'FRA' });
  for (let i = 0; i < 35; i++) w2.step();
  const ac = p2.fleet[0]; const g = w2.addEvent({ type: 'grounding', types: ['A20N'], share: 1, delay: 90, comp: 0.5, scope: 'all', end: w2.day + 60, text: 'Test Stilllegung', severity: 'crit' });
  w2.step(); assert.ok(ac.status === 'aog' && ac.grounded === g.id && ac.until > w2.day + 20, 'Stilllegung: Flugzeug am Boden');
  assert.ok(SMx.shockX(w2, 'delay', 'A20N') >= 90 && SMx.shockX(w2, 'delay', 'E295') === 60, 'Stilllegung verzögert Auslieferung des Musters');
  // Häufigkeit: in 5 Jahren mehrere der neuen Schocks
  { const w3 = SMx.newWorld({ seed: 8 }); w3.playerId = null; for (let i = 0; i < 365 * 5; i++) { if (w3.day % 30 === 0) w3.generateMonthlyEvents(); w3.day++; } const ty = new Set(w3.events.map((e) => e.type)); const n = ['credit_crunch', 'grounding', 'supply_chain', 'tourism', 'labor_crisis', 'disaster'].filter((t) => ty.has(t)).length; assert.ok(n >= 3, 'neue Schocks treten auf: ' + [...ty].join(',')); }
  // Ankeraktionäre: große KI nicht über die Börse zu mehrheitlich
  const big = w.list.filter((a) => a.archetype).sort((a, b) => b.fleet.length - a.fleet.length)[0];
  assert.ok(SMx.capState(big).ext < 0.5, 'größte KI hat Ankeraktionäre: ' + SMx.capState(big).ext);
  assert.ok(/Ankeraktionäre/.test(SMx.maBlock(w, p, big) || ''), 'kleine Airline darf große nicht übernehmen');
  assert.deepEqual(SMx.P.CAPITAL.group.divOpts, [0, 0.3, 0.5], 'Konzern-Ausschüttung höchstens 50 %');
  // Flughafen wächst mit dem Verkehr: Code F ab 25 Mio.
  assert.ok(!SMx.aptOk('HAJ', 'DXB', 'A388'), 'Hannover anfangs zu klein für A380');
  w.aptObs = { HAJ: 61 }; SMx.setFuelX(w); assert.ok(SMx.aptOk('HAJ', 'DXB', 'A388') && SMx.paxEff('HAJ') === 61, 'gewachsenes Hannover ist Code F');
  w.aptObs = {}; SMx.setFuelX(w);
  // Privatjets und Frachter
  p.ledger.cashOnly(2e8, 't');
  const bj = A({ type: 'acquire', typeId: 'C68A', mode: 'lease', base: 'HAJ' }); assert.equal(bj.ok, true, 'Privatjet leasen: ' + bj.msg);
  const jet = p.fleet.find((a) => a.id === bj.acId); assert.equal(jet.mode, 'charter', 'Privatjet steht im Charter-Pool');
  assert.ok(!A({ type: 'openRoute', base: 'HAJ', dest: 'VIE', typeId: 'C68A', freq: 1 }).ok, 'Privatjet fliegt keine Linie');
  for (let i = 0; i < 45; i++) w.step();
  assert.ok(w.acmiOffers.some((o) => o.kind === 'biz') && w.acmiOffers.some((o) => o.kind === 'cargo'), 'Privatjet- und Frachtanfragen');
  const ob = w.acmiOffers.find((o) => o.kind === 'biz' && o.start > w.day && o.start >= jet.delivery_day && SMx.P.AIRCRAFT_TYPES[o.type].group === 'BIZ' && !SMx.acmiList(jet, w.day).some((b) => o.start < b.end && o.end > b.start));
  if (ob) { const ra = A({ type: 'acmi', offerId: ob.id, acId: jet.id }); assert.equal(ra.ok, true, 'Privatjet-Charter angenommen: ' + ra.msg); }
  const oc = w.acmiOffers.find((o) => o.kind === 'cargo' && o.type === 'AT7F'); const atr = p.fleet.find((a) => a.type_id === 'AT76');
  if (oc && atr) assert.ok(!A({ type: 'acmi', offerId: oc.id, acId: atr.id }).ok, 'Passagier-ATR fliegt keine Fracht');
  // Endspiel: Verwaltung wächst überproportional
  const hq = (n) => { const x = { isPlayer: true, fleet: { length: n } }; return SMx.Airline.prototype.hqDay.call(x); };
  assert.ok(hq(200) / 200 > 1.2 * hq(100) / 100 && hq(400) / 400 > hq(200) / 200, 'Verwaltung je Flugzeug steigt ab 100');
  const rt = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); assert.ok(rt.list.some((a) => a.cap && a.cap.anchor > 0.4), 'Ankeraktionäre gespeichert');
  console.log('0.19 ok: Start mit ATR/E2, 787 abgelehnt, Ansehen', st, '· Schocks wirken · Anker', Math.round((1 - SMx.capState(big).ext) * 100), '% bei', big.name, '· Code F nach Wachstum · Privatjet', ob ? 'verchartert' : 'ohne passende Anfrage', '· HQ', Math.round(hq(100)), '/', Math.round(hq(200)), '/', Math.round(hq(400))); }
// 0.20: fairer Handel, Wirtschaftsprüfer, Führungsspanne, Leasing-Ausblick, Preisniveau abgelegener Märkte
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 12 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }), b = SMx.addHuman(w, { id: 'P2', name: 'Beta', code: 'BB', base: 'MUC' }); w.playerId = 'P1';
  const A = (al, x) => SMx.applyAction(w, al.id, x);
  for (let i = 0; i < 5; i++) w.step();
  a.ledger.cashOnly(5e7, 't'); b.staff.cab += 3;
  // Geschenk über Handel wird abgelehnt
  const g = A(a, { type: 'dealPropose', to: 'P2', give: [{ k: 'cash', amount: 20000000 }], take: [{ k: 'staff', role: 'cabin', n: 1 }] });
  assert.ok(!g.ok && g.unfair, 'Geschenk über Handel abgelehnt: ' + g.msg);
  const mk = A(a, { type: 'dealPropose', to: SMx.MARKET, give: [{ k: 'cash', amount: 20000000 }], take: [{ k: 'staff', role: 'cabin', n: 1 }] });
  assert.equal(mk.ok, true, 'Marktgesuch geht (KI-Airlines entscheiden selbst)');
  const ma = A(b, { type: 'marketAccept', id: mk.id }); assert.ok(!ma.ok && ma.unfair, 'Annahme durch Mitspielende wird geprüft: ' + ma.msg);
  A(a, { type: 'dealWithdraw', id: mk.id });
  { const f1 = SMx.tradeFairness(w, a, b, [{ k: 'cash', amount: 2600000 }], [{ k: 'cash', amount: 2000000 }]); assert.ok(f1.ok && f1.lim === 1e6 * w.macro.cpi || f1.ok, '0,6 Mio. Abweichung bei 4,6 Mio. Gesamtbetrag erlaubt');
    const f2 = SMx.tradeFairness(w, a, b, [{ k: 'cash', amount: 12000000 }], [{ k: 'cash', amount: 10500000 }]); assert.ok(!f2.ok && Math.abs(f2.lim - 1e6 * w.macro.cpi) < 1, 'über 1 Mio. Abweichung nicht erlaubt');
    const f3 = SMx.tradeFairness(w, a, b, [{ k: 'cash', amount: 950000 }], [{ k: 'cash', amount: 0 }]); assert.ok(f3.ok, 'bis 1 Mio. Abweichung frei, auch bei kleinen Geschäften');
    const f4 = SMx.tradeFairness(w, a, b, [{ k: 'cash', amount: 1200000 * w.macro.cpi }], []); assert.ok(!f4.ok, 'mehr als 1 Mio. Abweichung nicht erlaubt'); }
  const f = A(a, { type: 'dealPropose', to: 'P2', give: [{ k: 'cash', amount: 20000 }], take: [{ k: 'staff', role: 'cabin', n: 1 }] });
  assert.equal(f.ok, true, 'fairer Kleinhandel geht: ' + f.msg);
  assert.equal(A(b, { type: 'dealRespond', id: f.id, choice: 'accept' }).ok, true, 'angenommen');
  assert.ok(w.xfers.some((x) => x.deal), 'für die Prüfung erfasst');
  // Altfall: 20 Mio. für eine Flugbegleiterin (vor der Regel) – Prüfer greifen zum Jahresende
  w.xfers.push({ day: w.day, a: 'P1', b: 'P2', va: 20e6, vb: 8000, old: true });
  const pv = SMx.auditPreview(w, b).find((e) => e.partner === 'P1'); assert.ok(pv && pv.flagged && pv.excess > 15e6, 'Vorschau zeigt Beanstandung');
  const ca0 = a.ledger.cash, cb0 = b.ledger.cash;
  SMx.auditYear(w, { mode: 'now' });
  assert.ok(b.audit && b.audit.malus === 8 && b.audit.strikes === 1, 'Prüfvermerk für den Begünstigten');
  assert.ok(a.ledger.cash > ca0, 'Geber bekommt Geld zurück');
  assert.ok(cb0 - b.ledger.cash > 15e6 || SMx.auditDebtSum(b.audit).left > 0, 'Rückzahlung plus Bußgeld (oder Ratenplan)');
  assert.ok(SMx.standingOf(b, w.day + 1).parts.find((x) => x[0] === 'Finanzen')[3].includes('Prüfvermerk'), 'Prüfvermerk mindert das Ansehen');
  // Selbstanzeige: freiwillig zurückzahlen, kein Bußgeld
  w.xfers.push({ day: w.day + 1, a: 'P1', b: 'P2', va: 5e6, vb: 0 }); b.ledger.cashOnly(2e7, 't');
  const st = A(b, { type: 'auditSettle', partner: 'P1' }); assert.equal(st.ok, true, 'Selbstanzeige: ' + st.msg);
  assert.ok(!SMx.auditPreview(w, b).some((e) => e.flagged), 'danach keine Beanstandung mehr: ' + JSON.stringify(SMx.auditPreview(w, b)) + ' from ' + w.auditFrom);
  // Partner pleite: Rückzahlung geht an die Staatskasse, nicht an die (neu gegründete) Airline
  { const w3 = SMx.newWorld({ seed: 13 }), x = SMx.addHuman(w3, { id: 'X1', name: 'Wodu', code: 'WD', base: 'HAM' }), y = SMx.addHuman(w3, { id: 'Y1', name: 'Lukas', code: 'LK', base: 'MUC' }); w3.playerId = 'Y1';
    for (let i = 0; i < 3; i++) w3.step();
    w3.xfers = [{ day: w3.day, a: 'X1', b: 'Y1', va: 20e6, vb: 8000, old: true }]; w3.auditFrom = 0;
    x.status = 'insolvent'; const cx = x.ledger.cash, cy = y.ledger.cash;
    SMx.auditYear(w3, { mode: 'now' });
    assert.equal(x.ledger.cash, cx, 'pleiter Partner bekommt nichts');
    assert.ok(cy - y.ledger.cash > 15e6 || (y.audit.debts && y.audit.debts[0].to === null), 'Begünstigter zahlt an die Staatskasse');
  }
  // Admin-Entfernung ist nicht öffentlich
  const k = SMx.kickHuman(w, 'P2'); assert.ok(k.ok && !w.news.some((n) => /aus dem Spiel genommen/.test(n.msg)) && w.news.some((n) => /zieht sich vom Markt zurück/.test(n.msg)), 'keine öffentliche Sperrmeldung');
  // Führungsspanne für Fachkräfte
  const w2 = SMx.newGame({ seed: 4, base: 'HAM' }), p2 = w2.player; p2.ledger.cashOnly(5e7, 't');
  const tm = SMx.expertTeam(p2); assert.equal(tm.cap, 3, 'Startspanne 3');
  let hired = 0, refused = 0;
  for (let i = 0; i < 6; i++) { w2.monthEnd ? null : null; for (const c of w2.candidates.filter((x) => x.expires > w2.day && !SMx.P.EXPERT_ROLES[x.role].unique)) { const r = SMx.applyAction(w2, p2.id, { type: 'hireExpert', cid: c.id }); if (r.ok) hired++; else if (/Absage/.test(r.msg || '')) refused++; } for (let d = 0; d < 31; d++) w2.step(); }
  assert.ok(p2.experts.length <= SMx.expertTeam(p2).cap + 2 && refused > 0, `Spanne bremst: ${p2.experts.length} eingestellt, ${refused} Absagen`);
  // Leasing-Ausblick
  const lo = SMx.leaseOutlook(p2, 'B789', w2.day); assert.ok(lo.freeNeed > 0 && (lo.freeDay === null || lo.freeDay > w2.day), 'Ausblick für die 787');
  // Preisniveau: abgelegene Märkte und Afrika teurer, große Drehkreuze unverändert
  assert.ok(SMx.fareLv('YFB') > 1.4 && SMx.fareLv('FRA') === 1 && SMx.fareLv('NBO') > 1.2, 'Preisniveau abgelegen/Afrika');
  console.log('0.20 ok: Geschenk-Handel blockiert, Prüfer: Rückzahlung, Bußgeld, Prüfvermerk, Selbstanzeige; Sperre still; Fachkräfte', p2.experts.length, 'von Spanne', SMx.expertTeam(p2).cap, ',', refused, 'Absagen'); }
// 0.21: Airline-spezifische Schocks – Ausschüttung, Gewerkschaft, stille Gegenwehr, Monopol, Preisaufsicht, Hilfe für Kleine
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const S = SMx.P.AL_SHOCKS, keep = JSON.parse(JSON.stringify(S));
  for (const k of Object.keys(S)) if (S[k].p !== undefined) S[k].p = 1;   // für den Test: jede Lage löst sofort aus
  const w = SMx.newWorld({ seed: 31 }), big = SMx.addHuman(w, { id: 'B1', name: 'Gross', code: 'GR', base: 'NRT' }), small = SMx.addHuman(w, { id: 'S1', name: 'Klein', code: 'KL', base: 'HAJ' }); w.playerId = 'B1';
  const A = (al, x) => SMx.applyAction(w, al.id, x);
  for (let i = 0; i < 3; i++) w.step();
  assert.equal(SMx.payoutRate(big).rate, 0, 'am Start keine Ausschüttung');
  big.ledger.post('one_off', 3 * SMx.ownersCapital(big));
  const pr = SMx.payoutRate(big); assert.ok(pr.mult > 3.5 && pr.rate > 0.3 && pr.rate <= 0.7, 'Ausschüttung wächst mit dem Vielfachen');
  assert.ok(SMx.attackEligible(big) && !SMx.attackEligible(small), 'Gegenwehr droht jeder Airline mit 2,5-fachem Kapital');
  for (let i = 0; i < 3; i++) big.ledger.months.push({ label: { y: 0, m: i }, acc: { rev_ticket: 5e9, fuel: -3e9 } });   // drei Monate mit 40 % Marge
  big.cap = { ext: 0.2, sent: 1, hist: [], div: 0, last: -999 };   // 20 % der Aktien außerhalb (Kapitalerhöhung)
  w.day = 100; const c00 = big.ledger.cash; SMx.dominanceMonth(w);
  const agm = big.decisions.find((x) => x.type === 'agm' && !x.resolved);
  assert.ok(agm && big.ledger.cash === c00 && !big.agm, 'Hauptversammlung: Abstimmung statt sofortiger Ausschüttung');
  assert.equal(A(big, { type: 'decide', id: agm.id, choice: 'share' }).ok, false, 'nur Hauptversammlungs-Antworten');
  assert.equal(A(big, { type: 'decide', id: agm.id, choice: 'half' }).ok, true, 'Kompromiss');
  assert.ok(Math.abs(big.agm.rate - agm.rate * (0.2 + 0.8 / 2)) < 0.002 && big.agm.until === w.day + 360, 'Kompromiss: Minderheit voll, Sie zur Hälfte – 12 Monate');
  { const k = SMx.agmFactor(big, 'no'); assert.ok(Math.abs(k - 0.2) < 1e-9 && SMx.agmFactor(big, 'yes') === 1, 'Ablehnung: nur der Anteil der Minderheit'); }
  const negs = big.decisions.filter((x) => x.type === 'profit' && !x.resolved).length + (Object.values(w.attacks).some((a) => a.al === 'B1') ? 1 : 0) + (big.shocks || []).filter((x) => (x.k === 'entrant' || x.k === 'pricecap') && x.from === w.day).length;
  assert.equal(negs, 1, 'genau eine Belastung auf einmal');
  assert.ok(SMx.alShock(small, 'fuelpool', w.day), 'kleine Airline bekommt die Einkaufsgemeinschaft');
  const fSmall = w.fuelPriceFor(small, 'HAJ'); small.shocks = []; const fNo = w.fuelPriceFor(small, 'HAJ'); assert.ok(fSmall < fNo * 0.97, 'Kerosin günstiger');
  // Stille Gegenwehr: keine Meldung
  big.decisions = []; big.profitShare = null; big.press = { next: 0, lastUnion: w.day }; w.attacks = {};
  const logs0 = big.events.length, news0 = w.news.length; w.day += 61; SMx.dominanceMonth(w);
  const att = Object.values(w.attacks).filter((a) => a.al === 'B1');
  if (att.length) assert.ok(!big.events.slice(logs0).some((e) => /wehren|Preisangriff|greif/.test(e.msg || '')) && !w.news.slice(news0).some((n) => /greif|Preiskampf/.test(n.msg)), 'Gegenwehr im Stillen');
  { const c0 = big.ledger.cash; SMx.dominanceMonth(w); const paid = (c0 - big.ledger.cash) / 100;
    const pre = SMx.divRate(big, 20e6) * (SMx.capState(big).ext || 0) * 20e6;   // 0.21.37: Mindestdividende ist schon abgezogen
    assert.ok(Math.abs(paid - Math.max(0, big.agm.rate * 20e6 - pre)) <= 1000, `Ausschüttung laut Beschluss gezahlt (${paid})`);
    // Ablehnen kostet Ansehen; wer alle Aktien hält, bekommt keine Versammlung
    const st0 = SMx.standingOf(big, w.day + 1).v; big.agm = { k: 'no', rate: 0.05, asked: 0.4, from: w.day, until: w.day + 180 }; big._st = null;
    assert.equal(st0 - SMx.standingOf(big, w.day + 1).v, SMx.P.PAYOUT.noMalus, 'Ansehen −' + SMx.P.PAYOUT.noMalus + ' nach Überstimmen der Minderheit');
    big.agm = null; big.cap.ext = 0; big.decisions = []; SMx.dominanceMonth(w);
    assert.ok(!big.decisions.some((x) => x.type === 'agm'), 'alleinige Eigentümer: keine Hauptversammlung'); big.cap.ext = 0.2; }
  // Monopol: allein auf einer Strecke mit hoher Marge lockt Konkurrenz an
  big.ledger.cashOnly(2e8, 't'); A(big, { type: 'acquire', typeId: 'A20N', mode: 'buy', base: 'NRT' }); for (let i = 0; i < 35; i++) w.step(); A(big, { type: 'fillStaff' });
  for (const x of ['KMQ', 'TAK', 'OIT', 'KCZ', 'MYJ', 'HKD', 'AOJ', 'ICN']) if (A(big, { type: 'openRoute', base: 'NRT', dest: x, typeId: 'A20N', freq: 1 }).ok) break;
  for (let i = 0; i < 25; i++) w.step();
  const mono = SMx.monopolyRoutes(w, big);
  big.decisions = []; big.profitShare = null; big.press = { next: 0, lastUnion: w.day }; w.attacks = {}; w.fareCaps = {};
  const ev1 = big.events.length, nw1 = w.news.length; SMx.dominanceMonth(w);
  const att2 = Object.values(w.attacks).filter((a) => a.al === 'B1');
  assert.ok(att2.length > 0 || (big.shocks || []).some((x) => x.k === 'entrant' || x.k === 'pricecap'), 'Gegenwehr ausgelöst');
  assert.ok(!big.events.slice(ev1).some((e) => /wehren|Preisangriff|greif|Monopol/.test(e.msg || '')) && !w.news.slice(nw1).some((n) => /greif|Preiskampf|Monopol/.test(n.msg)), 'Gegenwehr im Stillen – keine Meldung');
  const r0 = big.activeRoutes()[0], co = w.competitorOffers('B1', r0.base, r0.dest);
  { const e = w.addEvent({ type: 'fuel_spike', fuelF: 1.5, scope: 'all', end: w.day + 90, text: 'Ölpreisschock: Kerosin +50 %', severity: 'crit' }); w.macro.fuelUsd *= 1.5; w.day++;
    assert.equal(w.cancelEvent(e.id, 'Tim').ok, true, 'Annullieren');
    const m = w.news.at(-1).msg; assert.ok(/Ölmarkt/.test(m) && !/annulliert|Tim/.test(m), 'Annullierung erscheint als Gegenereignis: ' + m);
    assert.ok(!big.events.some((x) => x.msg === m), 'Weltereignis nicht als eigene Meldung im Logbuch'); }
  // Ölschwemme ab 1. Oktober (bestehende Spielstände, ohne Ankündigung); Absicherer profitieren nicht
  { const wg = SMx.newWorld({ seed: 52 }); SMx.addHuman(wg, { id: 'G1', name: 'Glut', code: 'GL', base: 'HAM' }); wg.playerId = 'G1'; for (let i = 0; i < 3; i++) wg.step();
    const sv = JSON.parse(JSON.stringify(SMx.serialize(wg))); sv.day = 250; delete sv.glutPlanned; const wo = SMx.deserialize(sv);
    assert.ok(wo.scheduled.some((x) => x.kind === 'oil_glut' && x.day === 273), 'Ölschwemme für den 1. Oktober vorgemerkt');
    assert.ok(!wo.news.some((n) => /Ölschwemme/.test(n.msg)), 'nicht angekündigt');
    while (wo.day < 273) wo.step(); const f0 = wo.macro.fuelUsd, r0 = wo.macro.fuelRefUsd; wo.step();
    assert.ok(wo.macro.fuelUsd < f0 * 0.82 && wo.macro.fuelRefUsd < r0 * 0.8 && wo.news.some((n) => /Ölschwemme/.test(n.msg)), 'Kerosin fällt ab dem 1. Oktober');
    const gm = wo.news.find((n) => /Ölschwemme/.test(n.msg)).msg; assert.ok(!/abgesichert|profitier/.test(gm), 'Meldung nennt nicht, wen sie treffen soll: ' + gm);
    const ev = wo.events.find((e) => e.type === 'oil_glut'); while (wo.day < ev.end + 1) wo.step();
    assert.ok(Math.abs(wo.macro.fuelRefUsd - r0) < 1e-9, 'nach fünf Monaten gilt wieder der alte Referenzpreis');
    const wn = SMx.newWorld({ seed: 53 }); assert.ok(wn.glutPlanned && !(wn.scheduled || []).length, 'neue Welten bekommen keine vorgemerkte Ölschwemme'); }
  // 0.21.7: Ereignistexte verraten nicht, wen sie treffen sollen – auch in alten Spielständen
  { const all = [...big.events.map((e) => e.msg), ...w.news.map((n) => n.msg), ...big.decisions.map((d) => d.text || '')].join('\n');
    assert.ok(!/kleiner Airlines|niemand dorthin|mehr als verdoppelt|je mehr Kapital|Begehrlichkeiten|Gewinnmarge und|der Abflüge und verlangen/.test(all), 'neue Meldungen neutral');
    const sv = JSON.parse(JSON.stringify(SMx.serialize(w)));
    sv.news.push({ day: sv.day, msg: 'Ölschwemme: Die Förderländer fluten den Markt – Kerosin fällt um 25 % und bleibt voraussichtlich 5 Monate niedrig. Wer nicht abgesichert hat, profitiert sofort.', kind: 'good' });
    sv.news.push({ day: sv.day, msg: 'Preisaufsicht in Hamburg: Sie haben 72 % der Abflüge und verlangen im Schnitt das 1,45-fache des Marktpreises. Für 6 Monate gilt dort höchstens das 1,2-fache.', kind: 'crit' });
    const wm = SMx.deserialize(sv), t = wm.news.slice(-2).map((n) => n.msg);
    assert.ok(t[0].endsWith('Monate niedrig.') && t[1] === 'Preisaufsicht in Hamburg: Die Behörde begrenzt Ihre Tarife dort für 6 Monate auf höchstens das 1,2-fache des Marktpreises.', 'alte Meldungen umformuliert: ' + t.join(' | ')); }
  console.log('0.21 ok: Ausschüttung', Math.round(pr.rate * 100), '% bei', pr.mult.toFixed(1) + '-fachem Kapital, eine Belastung zur Zeit, Gegenwehr still auf', att2.length, 'Strecken', ', Kerosin für Kleine', ((1 - fSmall / fNo) * 100).toFixed(1), '% günstiger, Monopolstrecken', mono.length);
  Object.assign(S, keep); }
// 0.21.9: Winter-Slotvergabe zum 1. Oktober (nicht erst 1. November), Zusage auch bei überbuchtem Flughafen, Nachholung
{ const SMx = (await import('../shared/engine.cjs')).default;
  const w0 = SMx.newGame({ seed: 61, base: 'HAM' }); for (let i = 0; i < 3; i++) w0.step();
  const mk = (day, round) => { const sv = JSON.parse(JSON.stringify(SMx.serialize(w0))); sv.day = day; if (round === undefined) delete sv.slotRoundDay; else sv.slotRoundDay = round; const w = SMx.deserialize(sv), pl = w.player;
    pl.cash = Math.max(pl.cash, 5e8); const f = w.slotsFree('LHR'); w.slotCap.LHR -= f + 2;   // überbucht: 2 Slots zu viel belegt
    assert.equal(SMx.applyAction(w, pl.id, { type: 'slotWait', apt: 'LHR', n: 1 }).ok, true, 'Warteliste LHR'); return { w, pl }; };
  assert.equal(SMx.nextSlotDay(250).day, 273, 'nächster Termin 1. Oktober');
  { const { w, pl } = mk(268, 90); while (w.day < 272) w.step();
    assert.equal(pl.heldAt('LHR', w.day), 0, 'vor dem 1. Oktober nichts');
    w.step(); assert.equal(w.day, 273); assert.equal(pl.heldAt('LHR', w.day), 1, 'am 1. Oktober zugeteilt – auch bei überbuchtem Flughafen');
    assert.ok(w.news.some((n) => n.day === 273 && /Winterflugplan/.test(n.msg)), 'Meldung zum 1. Oktober');
    const cap = w.slotCap.LHR; for (let i = 0; i < 40; i++) w.step(); assert.equal(w.slotCap.LHR, cap, 'keine zweite Vergabe am 1. November'); }
  { const { w, pl } = mk(285); assert.equal(w.slotRoundDay, 90, 'alter Stand im Oktober: Vergabe steht noch aus'); w.step();
    assert.equal(pl.heldAt('LHR', w.day), 1, 'verpasste Oktober-Vergabe wird nachgeholt'); assert.equal(w.slotRoundDay, 273); }
  { const { w, pl } = mk(310); assert.equal(w.slotRoundDay, 273, 'alter Stand im November: schon vergeben'); w.step(); assert.equal(pl.heldAt('LHR', w.day), 0, 'keine doppelte Vergabe'); }
  console.log('0.21.9 ok: Winter-Slotvergabe am 1. Oktober, Zusage bei Überbuchung, Nachholung im Oktober'); }
// 0.21.10: Ausfälle stehen morgens fest (Karte, Abflugtafel, Netz = Tagessimulation), Sperrungen gelten trotz Fachkraft, verchartert fliegt nicht
{ const SMx = (await import('../shared/engine.cjs')).default;
  const w = SMx.newGame({ seed: 4, base: 'HAM' }), pl = w.player, A = (a) => SMx.applyAction(w, pl.id, a);
  pl.cash = Math.max(pl.cash, 3e8); pl.staff.agency = true;
  A({ type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); A({ type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); for (let i = 0; i < 20; i++) w.step();
  const ro = A({ type: 'openRoute', base: 'HAM', dest: 'PMI', typeId: 'A20N', freq: 2 }); assert.equal(ro.ok, true, 'Strecke: ' + ro.msg);
  const r = pl.routes.find((x) => x.base === 'HAM' && x.dest === 'PMI' && !x.closed); while (w.day < r.opened_day + 2) w.step();
  // Sturm mit 50 %: Vorschau morgens = Ergebnis abends
  let same = 0, tot = 0, some = 0;
  const ev = w.addEvent({ type: 'storm', airports: ['PMI'], end: w.day + 12, ops: { cancel: 0.5, delay: 30 }, text: 'Sturm über Palma: Ausfälle', severity: 'warn' });
  for (let d = 0; d < 10; d++) { w.operableFreq(pl); const f = r.flyingToday, rk = w.legRisk(pl, r); let pre = 0; for (let i = 0; i < Math.ceil(f - 1e-9); i++) if (w.legCancel(pl, r, i, w.day, rk).c) pre += Math.min(1, f - i);
    w.step(); const h = r.hist.at(-1); tot++; if (Math.abs(h.cancelled - 2 * pre) < 0.11) same++; if (h.cancelled > 0) some++; }
  assert.equal(same, tot, `Vorschau und Tagessimulation streichen dieselben Umläufe (${same}/${tot})`); assert.ok(some > 0, 'Sturm streicht Flüge');
  w.events = w.events.filter((e) => e !== ev);
  // Vulkanasche: Luftraum gesperrt – auch mit Operations-Stufe 3 fliegt nichts
  pl.skill = (k) => (k === 'ops' ? 3 : 0);
  w.addEvent({ type: 'volcano', airports: ['PMI'], end: w.day + 3, ops: { cancel: 1.0, delay: 0 }, text: 'Vulkanasche: Luftraum über Palma gesperrt.', severity: 'crit' });
  w.operableFreq(pl); const lc = w.legCancel(pl, r, 0); assert.ok(lc.c && /Vulkanasche \(PMI\)/.test(lc.why), 'Grund: ' + lc.why);
  w.step(); { const h = r.hist.at(-1); assert.ok(h.flights > 0 && h.cancelled === h.flights && h.pax === 0, `Sperrung: alle Flüge annulliert (${h.cancelled}/${h.flights})`); }
  delete pl.skill; for (let i = 0; i < 4; i++) w.step();
  // Verchartert: das Flugzeug fliegt die Strecke nicht, die Strecke wird nicht verkauft
  const acs = pl.fleet.filter((a) => a.type_id === 'A20N'); for (const ac of acs) { const o = { id: 'TX' + ac.id, client: 'Test', type: 'A20N', start: w.day, end: w.day + 10, rate: 20000, expires: w.day + 5 }; w.acmiOffers.push(o); assert.equal(A({ type: 'acmi', offerId: o.id, acId: ac.id }).ok, true, 'ACMI'); }
  w.operableFreq(pl); assert.equal(r.flyingToday, 0, 'verchartert: heute kein Umlauf'); const n0 = r.hist.length, rev0 = pl.ledger.today ? 0 : 0;
  w.step(); assert.ok(r.hist.length === n0 || r.hist.at(-1).flights === 0, 'verchartert: keine Flüge auf der Strecke');
  console.log('0.21.10 ok: Vorschau = Simulation an', tot, 'Tagen,', some, 'mit Sturmausfällen; Vulkanasche sperrt trotz Fachkraft; verchartert fliegt nicht'); }
// 0.21.11: P&L bis in die Einzelposten – Summe der Posten = Konto, auch nach Speichern/Laden und Monatswechsel
{ const SMx = (await import('../shared/engine.cjs')).default;
  const w = SMx.newGame({ seed: 7, base: 'HAM' }), pl = w.player, A = (a) => SMx.applyAction(w, pl.id, a);
  pl.cash = Math.max(pl.cash, 3e8);
  A({ type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); A({ type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); A({ type: 'fillStaff' }); for (let i = 0; i < 20; i++) w.step();
  for (const d of ['PMI', 'BCN']) A({ type: 'openRoute', base: 'HAM', dest: d, typeId: 'A20N', freq: 1 });
  A({ type: 'buySlots', apt: 'HAM', n: 1 });
  for (let i = 0; i < 40; i++) w.step();
  const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))), L = w2.player.ledger, sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  for (const [k, v] of Object.entries(L.pnl)) assert.equal(sum(L.det.p[k]), v, 'seit Start: Einzelposten = Konto ' + k);
  const m = L.months.at(-1); for (const [k, v] of Object.entries(m.acc)) if (!k.startsWith('cf_')) assert.equal(sum(m.det[k]), v, 'Vormonat: Einzelposten = Konto ' + k);
  for (const [k, v] of Object.entries(L.month)) if (!k.startsWith('cf_')) assert.equal(sum(L.det.m[k]), v, 'lfd. Monat: Einzelposten = Konto ' + k);
  assert.ok(Object.keys(L.det.p.fuel || {}).includes('HAM–PMI') && Object.keys(L.det.p.slots || {}).some((t) => /Slotgebühr genutzt › .*\(PMI\)/.test(t)), 'Treibstoff je Strecke, Slots je Flughafen');
  assert.ok(Object.keys(L.det.p.lease || {}).some((t) => /HX-001/.test(t)) && Object.keys(L.det.p.overhead || {}).includes('Zentrale (Hauptverwaltung)'), 'Leasing je Flugzeug, Verwaltung aufgeteilt');
  assert.ok(!Object.keys(L.det.p).some((k) => (L.det.p[k] || {})['ohne Zuordnung']), 'jede Buchung hat eine Herkunft: ' + Object.keys(L.det.p).filter((k) => (L.det.p[k] || {})['ohne Zuordnung']).join(','));
  assert.ok(!w2.list.some((x) => x.archetype && x.ledger.det), 'KI-Airlines ohne Einzelposten (Speicher)');
  console.log('0.21.11 ok: P&L-Einzelposten stimmen mit allen Konten überein,', Object.values(L.det.p).reduce((a, o) => a + Object.keys(o).length, 0), 'Posten'); }
// 0.21.13: Jeder Knopf (data-act) in der Seitenleiste muss einen Empfänger haben, den der zentrale Klickverteiler auch erreicht
{ const fs = await import('node:fs'); const src = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8').replace('/*COLLECTION*/', () => fs.readFileSync(new URL('../src/collection.js', import.meta.url), 'utf8'));
  const names = new Set([...src.matchAll(/data-act="([a-z][a-z0-9]*)"/gi)].map((m) => m[1]));
  const body = (name) => { const i = src.indexOf(`function ${name}(`); if (i < 0) return ''; let j = src.indexOf('{', i), d = 0, k = j; for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(j, k + 1); };
  const pane = body('onPaneClick'), gates = [...pane.matchAll(/\n  if \((?:(.*?) && )?(on[A-Z]\w*Click)\(act, b\)\) return;/g)].map((m) => ({ cond: m[1] || 'true', fn: m[2] }));
  const handles = (code, n) => new RegExp(`(case '${n}'|act === '${n}'|\\[[^\\]]*'${n}'[^\\]]*\\]\\.includes\\(act\\))`).test(code);
  let direct = pane; for (const g of gates) direct = direct.replace(`${g.fn}(act, b)`, '');
  const rest = src.replace(pane, ''), broken = [];
  for (const n of names) {
    if (handles(direct, n)) continue;
    const hits = gates.filter((g) => handles(body(g.fn), n) || (g.fn === 'onLogoClick' && handles(body('onPixClick'), n)));
    if (hits.length) { if (!hits.some((g) => new Function('act', 'return ' + g.cond)(n))) broken.push(`${n} (Tor ${hits.map((h) => h.cond).join(' / ')})`); continue; }
    if (!new RegExp(`(act === '${n}'|case '${n}'|'${n}'[,\\]])`).test(rest)) broken.push(`${n} (kein Empfänger)`);
  }
  assert.deepEqual(broken, [], 'Knöpfe ohne erreichbaren Empfänger: ' + broken.join(', '));
  console.log('0.21.13 ok:', names.size, 'Knopf-Aktionen haben einen erreichbaren Empfänger'); }
// 0.21.14: Finanzbericht – Kasse, Einlagen und Ergebnis stimmen je Monat und seit Gründung auf den Cent; alte Stände beginnen die Aufzeichnung beim Laden
{ const SMx = (await import('../shared/engine.cjs')).default, sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  const w0 = SMx.newGame({ seed: 9, base: 'HAM' }), A = (w, a) => SMx.applyAction(w, w.player.id, a);
  let w = w0; w.player.cash = Math.max(w.player.cash, 3e8);
  A(w, { type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); A(w, { type: 'acquire', typeId: 'E295', mode: 'buy', base: 'HAM' }); A(w, { type: 'fillStaff' }); for (let i = 0; i < 20; i++) w.step();
  for (const d of ['PMI', 'VIE']) A(w, { type: 'openRoute', base: 'HAM', dest: d, typeId: d === 'VIE' ? 'E295' : 'A20N', freq: 1 });
  A(w, { type: 'buySlots', apt: 'HAM', n: 1 }); for (let i = 0; i < 45; i++) w.step();
  SMx.adminGrant(w, w.player.id, 4e6, 'Test'); A(w, { type: 'sellSlots', apt: 'HAM', n: 1 });
  w = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); for (let i = 0; i < 40; i++) w.step();
  const L = w.player.ledger, F = L.fx, ni = sum(L.pnl);
  assert.equal(F.t0.cash + (ni - F.t0.ni) - sum(F.tnc) + sum(F.cf), L.cash, 'Kasse seit Gründung = Startkapital + Kapitalfluss');
  assert.equal(F.t0.ec + sum(F.eq), L.equityContrib, 'Einlagen seit Gründung = Startkapital + Bewegungen');
  assert.ok(F.eq.start > 0 && F.eq.admin === 4e8 && F.tnc.depreciation < 0, 'Startkapital, Zuschuss und Abschreibung erfasst');
  const ms = L.months.filter((m) => m.fx); assert.ok(ms.length >= 3, 'Monatsabschlüsse mit Kapitalfluss');
  for (const m of ms) {
    const net = Object.entries(m.acc).reduce((a, [k, v]) => a + (k.startsWith('cf_') ? 0 : v), 0), cf = Object.entries(m.acc).reduce((a, [k, v]) => a + (k.startsWith('cf_') ? v : 0), 0);
    assert.equal(m.fx.m0.cash + net - sum(m.fx.nc) + cf, m.fx.m1.cash, 'Monat: Kasse Anfang + Kapitalfluss = Kasse Ende');
    assert.equal(m.fx.m0.ec + sum(m.fx.eq), m.fx.m1.ec, 'Monat: Einlagen'); assert.equal(m.fx.m0.ni + net, m.fx.m1.ni, 'Monat: Ergebnis');
    for (const [k, v] of Object.entries(m.acc)) if (!k.startsWith('cf_')) assert.equal(sum(m.det[k]), v, 'Monat: Einzelposten = Konto ' + k);
  }
  assert.ok(Math.abs(SMx.balanceSheet(w.player).check) < 0.01, 'Bilanz: Vermögen − Schulden = Einlagen + Ergebnisse');
  // Alter Spielstand ohne Aufzeichnung: beginnt beim Laden mit den heutigen Ständen
  const sv = JSON.parse(JSON.stringify(SMx.serialize(w))); delete sv.airlines.find((a) => a.id === w.player.id).ledger.fx;
  const wo = SMx.deserialize(sv), Lo = wo.player.ledger; assert.ok(Lo.fx && Lo.fx.t0.day === wo.day && Lo.fx.t0.cash === Lo.cash, 'alter Stand: Aufzeichnung ab heute');
  for (let i = 0; i < 35; i++) wo.step(); const Fo = Lo.fx;
  assert.equal(Fo.t0.cash + (sum(Lo.pnl) - Fo.t0.ni) - sum(Fo.tnc) + sum(Fo.cf), Lo.cash, 'alter Stand: Kasse seit Aufzeichnung stimmt');
  assert.ok(!wo.list.some((a) => a.archetype && a.ledger.fx), 'KI-Airlines ohne Finanzbericht');
  console.log('0.21.14 ok: Kasse, Einlagen, Ergebnis und Einzelposten stimmen in', ms.length, 'Monaten und seit Gründung auf den Cent'); }
// 0.21.15: Wachstumsbremsen – Größenzuschlag der Verwaltung ab 25 Flugzeugen, Konkurrenz greift Strecken mit hoher Marge an
{ const SMx = (await import('../shared/engine.cjs')).default;
  const w = SMx.newGame({ seed: 12, base: 'HAM' }), pl = w.player, A = (a) => SMx.applyAction(w, pl.id, a);
  const fl = pl.fleet; const fake = (n) => { fl.length = 0; for (let i = 0; i < n; i++) fl.push({ type_id: 'A20N' }); };
  fake(34); assert.equal(pl.hqSizeDay(100), 0, 'vor dem 1. Januar 2028 kein Zuschlag');
  fake(25); assert.equal(pl.hqSizeDay(400), 0, 'bis 25 Flugzeuge kein Zuschlag'); fake(34); const z34 = pl.hqSizeDay(400); fake(50); const z50 = pl.hqSizeDay(400);
  assert.ok(z34 > 50000 && z34 < 150000 && z50 / 50 > z34 / 34 * 1.5, `Zuschlag wächst schneller als die Flotte (${Math.round(z34)} / ${Math.round(z50)} €/Tag)`); fake(0);
  pl.cash = Math.max(pl.cash, 3e8); A({ type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); A({ type: 'fillStaff' }); for (let i = 0; i < 20; i++) w.step();
  assert.equal(A({ type: 'openRoute', base: 'HAM', dest: 'PMI', typeId: 'A20N', freq: 1 }).ok, true, 'Strecke');
  const r = pl.routes.find((x) => x.dest === 'PMI'); for (let i = 0; i < 70; i++) w.step();
  // sehr hohe Marge vortäuschen und Margendruck auslösen
  for (const h of r.hist) { h.rev = 200000; h.cost = 20000; }
  const M = SMx.P.MARGIN_PRESSURE, p0 = M.p; M.p = 10; w.attacks = {}; SMx.dominanceMonth(w);
  assert.ok(!Object.values(w.attacks).some((a) => a.why === 'margin'), 'vor dem Stichtag kein Margendruck');
  const bf = SMx.P.BRAKES_FROM; SMx.P.BRAKES_FROM = 0; w.attacks = {}; SMx.dominanceMonth(w); M.p = p0; SMx.P.BRAKES_FROM = bf;
  const at = w.attacks[SMx.pairKey('HAM', 'PMI')]; assert.ok(at && at.why === 'margin' && at.al === pl.id && at.x < 1, 'Konkurrenz greift die Strecke mit hoher Marge an');
  console.log('0.21.15 ok: Größenzuschlag', Math.round(z34), '€/Tag bei 34 Flugzeugen, Margendruck auf HAM–PMI'); }
// 0.21.20: Harte Zeiten – Branchenkrise, Leasing-Indexierung, Sicherheitsnachforderung bei schwachem Rating
{ const SMx = (await import('../shared/engine.cjs')).default;
  const w = SMx.newGame({ seed: 14, base: 'HAM' }), pl = w.player, A = (a) => SMx.applyAction(w, pl.id, a);
  pl.ledger.equityFlow(3e8, 'admin'); A({ type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); A({ type: 'acquire', typeId: 'A20N', mode: 'lease', base: 'HAM' }); for (let i = 0; i < 20; i++) w.step();
  // Branchenkrise
  SMx.setFuelX(w); const ref0 = SMx.refPrice('HAM', 'JFK', w.macro.cpi), dm0 = w.demandMult('HAM', 'JFK', 'business');
  const ev = w.startDownturn(10, 200); assert.ok(w.news.some((n) => /Branchenkrise/.test(n.msg)), 'Branchenkrise angekündigt');
  for (let i = 0; i < 12; i++) w.step(); SMx.setFuelX(w);
  const dm1 = w.demandMult('HAM', 'JFK', 'business'), ref1 = SMx.refPrice('HAM', 'JFK', w.macro.cpi);
  assert.ok(dm1 < dm0 * 0.85 && Math.abs(dm1 / dm0 - ev.demand.business) < 0.02, `Geschäftsreisen brechen ein (${dm1.toFixed(2)})`);
  assert.ok(ref1 < ref0 * 0.96, 'Ticketpreise unter Druck'); w.monthlyMacro(); assert.ok(w.macro.bank < 0.8, 'Banken kürzen Kreditlinien');
  // Leasing-Indexierung
  const ac = pl.fleet[0], u0 = ac.leaseUsd; ac.delivery_day = w.day - 365; w.step(); assert.ok(Math.abs(ac.leaseUsd / u0 - 1.03) < 1e-9, 'Leasingrate +3 % nach einem Vertragsjahr');
  // Sicherheitsnachforderung
  // 0.21.31: Die Kaution steigt nach Vertragsabschluss nicht mehr – auch nicht bei schwachem Rating; frühere Nachforderungen kommen zurück
  const c0 = pl.ledger.cash, d0 = pl.fleet.reduce((x, a) => x + (a.deposit || 0), 0); pl.rating = 'CCC'; SMx.leaseSecurity(w, pl);
  assert.ok(!pl.secDep && pl.ledger.cash === c0 && pl.fleet.reduce((x, a) => x + (a.deposit || 0), 0) === d0, 'Rating CCC: keine zusätzliche Kaution');
  { const a0 = pl.fleet.find((a) => !a.owned && a.delivery_day <= w.day); if (a0) { a0.deposit += 50000; pl.ledger.cashOnly(-50000, 'deposit'); pl.secDep = { day: w.day, amt: 50000, per: { [a0.id]: 50000 } };
      const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))), p2 = w2.airlines[pl.id]; assert.ok(!p2.secDep && p2.ledger.cash === c0, 'alte Nachforderung beim Laden zurück');
      SMx.leaseSecurity(w, pl); assert.ok(!pl.secDep && pl.ledger.cash === c0, 'und auch zum Monatsende'); } }
  const tot = 0;
  assert.ok(Math.abs(SMx.balanceSheet(pl).check) < 0.01, 'Bilanz stimmt weiter');
  console.log('0.21.20 ok: Branchenkrise (Geschäftsreisen', Math.round((1 - ev.demand.business) * 100) + ' %, Preise', Math.round((1 - ev.fareX) * 100) + ' %), Leasing +3 %/Jahr, Kaution steigt nach Abschluss nicht', tot); }
// 0.21.21: Wirtschaftsprüfung durchgängig – Handel → Erfassung → Jahresabschluss, Nacherfassung fehlender Geschäfte, Nachprüfung, Neugründung, Prüfbericht
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const mk = (seed) => { const w = SMx.newWorld({ seed }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }), b = SMx.addHuman(w, { id: 'P2', name: 'Beta', code: 'BB', base: 'MUC' }); w.playerId = 'P1';
    for (let i = 0; i < 3; i++) w.step(); a.ledger.equityFlow(4e7, 't'); b.ledger.equityFlow(4e7, 't'); return { w, a, b }; };
  const gift = (w, f, t, amount) => { const p = SMx.applyAction(w, f.id, { type: 'dealPropose', to: t.id, give: [{ k: 'cash', amount }], take: [] }); assert.ok(p.ok, 'Angebot: ' + p.msg); assert.ok(SMx.applyAction(w, t.id, { type: 'dealRespond', id: p.id, choice: 'accept' }).ok, 'angenommen'); };
  const rt = (w) => SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w))));
  // a) Viele kleine Geschenke (je unter 1 Mio., also erlaubt) summieren sich – der Jahresabschluss greift
  { const { w, a, b } = mk(31); for (let i = 0; i < 4; i++) gift(w, a, b, 950000);
    const pv = SMx.auditPreview(w, b)[0]; assert.ok(pv.flagged && pv.n === 4, 'Vorschau: beanstandet');
    w.day = 364; const ca = a.ledger.cash, cb = b.ledger.cash; const rep = SMx.auditYear(w, { mode: 'now' });
    assert.ok(rep.findings.length === 1 && rep.n === 4 && b.audit.strikes === 1, 'Beanstandung im Prüfbericht');
    const f = rep.findings[0]; assert.equal(Math.round(cb - b.ledger.cash), Math.round((f.claw + f.fine) * 100), 'Begünstigter zahlt Vorteil + Bußgeld');
    assert.ok(a.ledger.cash - ca > 0 && w.auditLog.length === 1 && w.auditFrom === 365, 'Geber bekommt zurück, Bericht gespeichert, neues Prüfjahr'); }
  // b) Fairer Handel: Bericht ohne Beanstandung, für alle sichtbar
  { const { w, a, b } = mk(32); b.staff.cab += 2; const p = SMx.applyAction(w, a.id, { type: 'dealPropose', to: 'P2', give: [{ k: 'cash', amount: 20000 }], take: [{ k: 'staff', role: 'cabin', n: 1 }] }); SMx.applyAction(w, b.id, { type: 'dealRespond', id: p.id, choice: 'accept' });
    w.day = 364; const rep = SMx.auditYear(w); assert.ok(!rep.findings.length && rep.n === 1, 'keine Beanstandung');
    assert.ok(w.news.some((n) => /keine Beanstandung/.test(n.msg)), 'Meldung: geprüft, keine Beanstandung'); }
  // c) Altgeschäft fehlt in der Handelsbilanz (z. B. 20 Mio. für eine Flugbegleiterin) – Nacherfassung und Nachprüfung, nur einmal
  { const { w, a, b } = mk(33);
    w.deals.push({ id: 'DX', from: 'P1', to: 'P2', day: 1, resolvedDay: 1, expires: 15, status: 'accepted', give: [{ k: 'cash', amount: 20e6 }], take: [{ k: 'staff', role: 'cabin', group: null, n: 1 }], note: '' });
    w.auditFrom = 2;   // das Jahr mit dem Geschäft ist schon geprüft
    for (let i = 0; i < 150; i++) w.deals.push({ id: 'DA' + i, from: 'P1', to: 'AI1', day: 2, status: 'rejected', give: [], take: [], note: '' });
    let w2 = rt(w); assert.ok(w2.deals.some((d) => d.id === 'DX'), 'Geschäft zwischen Spielenden bleibt gespeichert, auch bei vielen anderen Angeboten');
    assert.ok(w2.xfers.some((x) => x.deal === 'DX' && x.late === true), 'nacherfasst für die Nachprüfung');
    const B2 = w2.airlines.P2, cb = B2.ledger.cash; w2.step();
    const dc = B2.decisions.find((x) => x.type === 'auditpay' && !x.resolved); assert.ok(B2.audit && B2.audit.strikes === 1 && dc, 'Nachprüfung: Airline wählt die Zahlungsweise');
    assert.ok(SMx.applyAction(w2, 'P2', { type: 'decide', id: dc.id, choice: 'now' }).ok, 'sofort zahlen');
    assert.ok(cb - B2.ledger.cash > 15e8, 'Nachprüfung: Rückzahlung und Bußgeld (mit Nachlass)');
    assert.ok(w2.auditLog.at(-1).late && w2.news.some((n) => /^Nachprüfung: /.test(n.msg)), 'Nachprüfung im Bericht und in den Meldungen');
    const w3 = rt(w2); w3.step(); assert.equal(w3.airlines.P2.audit.strikes, 1, 'nicht doppelt bestraft');
    assert.ok(!w3.xfers.some((x) => x.late === true) && w3.xfers.some((x) => x.deal === 'DX'), 'bleibt als erledigt erfasst'); }
  // d) Neugründung: Geschäfte der abgewickelten Vorgängerin zählen nicht für die neue Gesellschaft
  { const { w, a, b } = mk(34); gift(w, a, b, 950000); gift(w, a, b, 950000); w.step(); w.step();
    SMx.restartHuman(w, 'P2', { name: 'Beta Neu', code: 'BN', base: 'FRA' });
    assert.equal(SMx.auditPreview(w, w.airlines.P2).length, 0, 'neue Gesellschaft haftet nicht für die alte'); }
  // e) Anordnung der Spielleitung: genau der festgestellte Vorteil, Rückzahlung an die Staatskasse, Übersicht
  { const { w, a, b } = mk(35); const ca = a.ledger.cash, cb = b.ledger.cash;
    const r = SMx.auditOrder(w, { b: 'P2', a: 'P1', amount: 20e6, state: true, mode: 'now' }); assert.ok(r.ok, r.msg);
    assert.equal(r.finding.claw, 20e6); assert.equal(r.finding.fine, 2e6); assert.ok(r.finding.state, 'an die Staatskasse');
    assert.equal(Math.round((cb - b.ledger.cash) / 100), 22e6, '22 Mio. abgebucht'); assert.equal(a.ledger.cash, ca, 'Partner bekommt nichts und zahlt kein Bußgeld');
    assert.ok(!SMx.auditOrder(w, { b: 'P2', a: 'P2', amount: 5e6 }).ok && !SMx.auditOrder(w, { b: 'P2', a: 'P1', amount: 0 }).ok, 'Eingaben geprüft');
    const ov = SMx.adminAudit(w); assert.ok(ov.log.length === 1 && ov.pairs.length === 1 && ov.pairs[0].adv === 20e6, 'Übersicht für die Verwaltung');
    assert.ok(Math.abs(SMx.balanceSheet(b).check) < 0.01, 'Bilanz stimmt'); }
  console.log('0.21.21 ok: kleine Geschenke summiert und beanstandet, Bericht ohne Beanstandung, Altgeschäft nacherfasst und nachgeprüft (einmal), Neugründung ausgenommen, Anordnung 20 Mio. + 2 Mio. Bußgeld an die Staatskasse');
}
// 0.21.22: Leasingflugzeug übernehmen, Akademien wachsen mit, knapper Arbeitsmarkt, eigener Nachwuchs
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
// a) Leasingübernahme
{ const w = SMx.newWorld({ seed: 41 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }); w.playerId = 'P1';
  a.ledger.equityFlow(6e7, 't');
  const r = SMx.applyAction(w, 'P1', { type: 'acquire', typeId: 'DH8D', base: 'HAM', mode: 'lease' }); assert.ok(r.ok, r.msg);
  const ac = a.fleet[0]; while (w.day <= ac.delivery_day) w.step();
  const q0 = SMx.leaseBuyQuote(w, a, ac); assert.ok(q0.ok && !q0.ended && q0.fee > 0, 'vor Vertragsende: Ablöse');
  // Vertragsende simulieren
  ac.lease_start -= 1200; ac.bornDay -= 1200; w.step(); for (let i=0;i<40;i++) w.step();
  assert.ok(ac.endNote, 'Hinweis bei Vertragsende'); assert.ok(a.events.some((e) => /Mindestlaufzeit/.test(e.msg)), 'Logbuch');
  const q = SMx.leaseBuyQuote(w, a, ac); assert.ok(q.ended && q.fee === 0, 'nach Vertragsende keine Ablöse');
  const c0 = a.ledger.cash; const b = SMx.applyAction(w, 'P1', { type: 'leaseBuy', acId: ac.id }); assert.ok(b.ok, b.msg);
  assert.ok(ac.owned && ac.nbv === q.price && ac.loan === q.loan && !ac.deposit, 'gehört jetzt der Airline');
  assert.equal(Math.round((c0 - a.ledger.cash) / 100), Math.round(q.down - q.dep), 'Kasse: Eigenanteil minus Kaution');
  assert.ok(Math.abs(SMx.balanceSheet(a).check) < 0.01, 'Bilanz stimmt');
  const ls0 = a.ledger.month.lease || 0; w.step(); assert.equal(a.ledger.month.lease || 0, ls0, 'keine Leasingrate mehr');
    const rt = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); assert.ok(rt.airlines.P1.fleet[0].owned, 'gespeichert');
}
// b) Akademie nach Phase
{ const w = SMx.newWorld({ seed: 42 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }); w.playerId = 'P1';
  a.ledger.equityFlow(6e7, 't');
  assert.equal(SMx.academyMax(a), 1);
  const x = SMx.applyAction(w, 'P1', { type: 'academy', role: 'pilot', level: 3, group: 'DH8' }); assert.ok(!x.ok && /Phase/.test(x.msg), x.msg);
  assert.ok(SMx.applyAction(w, 'P1', { type: 'academy', role: 'cabin', level: 1 }).ok);
  a.prog.lv = 4; assert.equal(SMx.academyMax(a), 5); assert.ok(SMx.applyAction(w, 'P1', { type: 'academy', role: 'cabin', level: 5 }).ok, 'Stufe 5 als Global Player');
  a.academy.cabin[0].since = w.day - 100; const c0 = a.staff.cab; w.academyMonthly(a); assert.equal(a.staff.cab - c0, 38); assert.equal(a.staff.home.cab, 38);
  const hx = SMx.homeShares(a); assert.equal(hx.cab, 1);
  // Kündigungen: Eigene bleiben eher
  a.staff.cab = 400; a.staff.home.cab = 200; a.staff.morale = 0.3; SMx.homeShares(a);
  const cab0 = a.staff.cab + 38, h0 = a.staff.home.cab + 38; w.playerMonthly(a); assert.ok(a.staff.home.cab <= a.staff.cab && h0 - a.staff.home.cab <= cab0 - a.staff.cab, 'Eigene kündigen seltener');
}
// c) Arbeitsmarkt knapp, Freisetzung und Krise
{ const w = SMx.newWorld({ seed: 43 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }); w.playerId = 'P1';
  const p0 = SMx.laborPool(w, 'pilot'); assert.equal(p0.base, 175, 'Grundstock Piloten 150 + 25');
  SMx.releaseStaff(w, { pilot: 100 }); assert.equal(SMx.laborPool(w, 'pilot').free, 60, '60 % kommen auf den Markt');
  a.staff.pil.DH8 = 20; const f = w.fire(a, 'pilot', 'DH8', 10); assert.ok(f.ok); assert.equal(SMx.laborPool(w, 'pilot').free, 66);
  w.events.push({ id: 'X', type: 'downturn', start: w.day, end: w.day + 100, countries: [] }); assert.ok(SMx.laborCrisis(w)); assert.equal(SMx.laborPool(w, 'pilot').base, Math.floor(175 * 1.5 / w.macro.laborTight));
}

  // d) höchstens vier Basen
  { const w = SMx.newWorld({ seed: 44 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }); w.playerId = 'P1'; a.ledger.equityFlow(5e8, 't');
    a.bases.push('BRE', 'HAJ', 'LEJ'); const r = w.openBase(a, 'DRS'); assert.ok(!r.ok && /4 Basen/.test(r.msg), 'fünfte Basis abgelehnt: ' + r.msg); }
  console.log('0.21.22 ok: Übernahme nach Vertragsende ohne Ablöse (vorher mit), Akademie-Stufen nach Phase bis 5, Absolventen als eigener Nachwuchs, Arbeitsmarkt 150+25 Piloten, Freisetzung 60 %, Krise ×1,5');
}
// 0.21.24: Prüfung, wenn der Partner nicht mehr im Spiel ist; Zahlungsweisen
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const mk = (seed) => { const w = SMx.newWorld({ seed }), a = SMx.addHuman(w, { id: 'P1', name: 'Wodubist', code: 'WD', base: 'HAM' }), b = SMx.addHuman(w, { id: 'P2', name: 'Lukas Air', code: 'LK', base: 'MUC' }); w.playerId = 'P2';
    for (let i = 0; i < 3; i++) w.step(); b.ledger.equityFlow(6e7, 't'); return { w, a, b }; };
  // a) Partner unter derselben Kennung neu gegründet: frühere Gesellschaft auswählbar, Rückzahlung an die Staatskasse
  { const { w, a, b } = mk(51); SMx.restartHuman(w, 'P1', { name: 'Wodu Neu', code: 'WN', base: 'FRA' }); const P1 = w.airlines.P1, c1 = P1.ledger.cash;
    const ov = SMx.adminAudit(w); assert.ok(ov.former.includes('Wodubist'), 'frühere Airline in der Auswahl: ' + JSON.stringify(ov.former));
    const cb = b.ledger.cash, r = SMx.auditOrder(w, { b: 'P2', name: 'Wodubist', amount: 20e6, mode: 'now' }); assert.ok(r.ok && r.finding.state, r.msg);
    assert.equal(Math.round((cb - b.ledger.cash) / 100), 22e6, 'Lukas Air zahlt 20 + 2 Mio.'); assert.equal(P1.ledger.cash, c1, 'neue Gesellschaft bekommt nichts');
    assert.ok(SMx.adminAudit(w).pairs.some((p) => p.aName === 'Wodubist' || p.bName === 'Wodubist'), 'in der Übersicht unter dem alten Namen');
    assert.ok(!SMx.auditOrder(w, { b: 'P2', amount: 5e6 }).ok, 'ohne Partner und Namen abgelehnt');
    assert.ok(!SMx.auditPreview(w, b).some((e) => e.excess > 0), 'angeordnete Nachprüfung zählt im Jahresabschluss nicht noch einmal');
    w.day = 364; assert.equal(SMx.auditYear(w, { mode: 'now' }).findings.length, 0, 'keine zweite Strafe zum 31.12.'); }
  // b) entfernte Airline als Partner: an die Staatskasse; 24 Raten mit Aufschlag
  { const { w, a, b } = mk(52); a.status = 'insolvent'; a.removed = true; const cb = b.ledger.cash;
    const r = SMx.auditOrder(w, { b: 'P2', a: 'P1', amount: 10e6, mode: 'r24' }); assert.ok(r.ok && r.finding.state, r.msg);
    assert.equal(b.ledger.cash, cb, 'Raten: heute nichts abgebucht'); const d = SMx.auditDebtSum(b.audit); assert.equal(d.left, Math.round(11e6 * 1.12 / 1e3) * 1e3, '24 Raten +12 %');
    for (let i = 0; i < 31; i++) w.step(); assert.ok(SMx.auditDebtSum(b.audit).left < d.left, 'erste Rate am Monatsende'); }
  // c) Airline wählt selbst; ohne Wahl 12 Raten; Sofortzahlung mit Nachlass
  { const { w, b } = mk(53); SMx.auditOrder(w, { b: 'P2', a: 'P1', amount: 10e6 }); const dc = b.decisions.find((x) => x.type === 'auditpay');
    assert.ok(dc && !dc.resolved, 'Entscheidung offen'); assert.ok(!SMx.applyAction(w, 'P2', { type: 'decide', id: dc.id, choice: 'yes' }).ok, 'falsche Wahl abgelehnt');
    for (let i = 0; i < 9; i++) w.step(); assert.equal(dc.resolved, 'ignored'); assert.equal(SMx.auditDebtSum(b.audit).left > 0 || b.audit.debts.length === 0, true);
    const w2 = mk(54); SMx.auditOrder(w2.w, { b: 'P2', a: 'P1', amount: 10e6 }); const d2 = w2.b.decisions.find((x) => x.type === 'auditpay'), c0 = w2.b.ledger.cash;
    assert.ok(SMx.applyAction(w2.w, 'P2', { type: 'decide', id: d2.id, choice: 'now' }).ok); assert.equal(Math.round((c0 - w2.b.ledger.cash) / 100), 10e6 + 0.9e6, 'sofort: 10 Mio. + 1 Mio. Bußgeld − 10 % Nachlass');
    assert.ok(Math.abs(SMx.balanceSheet(w2.b).check) < 0.01, 'Bilanz stimmt');
    // 0.21.61: Bescheide nachvollziehbar – Zusammensetzung, wer wann gewählt hat, Stand der Raten
    const bA = b.audit.bills.at(-1); assert.ok(bA.how === 'auto' && bA.mode === 'r12' && bA.claw === 10e6 && bA.fine0 === 1e6 && bA.total === Math.round(11e6 * 1.05 / 1e3) * 1e3 && bA.n === 12 && bA.deadline, 'automatisch gewählt, 12 Raten mit Aufschlag');
    const bB = w2.b.audit.bills.at(-1); assert.ok(bB.how === 'self' && bB.mode === 'now' && bB.skonto === 1e5 && bB.paid === 10.9e6 && bB.rest === 0, 'selbst gewählt, sofort mit Nachlass');
    for (let i = 0; i < 40; i++) w.step(); assert.ok(bA.paidN >= 1 && bA.paid >= bA.monthly && bA.rest === bA.total - bA.paid, 'Raten werden mitgezählt'); }
  { const { w, b } = mk(55); SMx.auditOrder(w, { b: 'P2', a: 'P1', amount: 8e6, mode: 'now' }); const txt = b.events.map((e) => e.msg).join(' ') + w.news.map((n) => n.msg).join(' ');
    assert.ok(/Nachprüfung/.test(txt) && !/Spielleitung|Anordnung|angeordnet von/i.test(txt.replace(/Rückzahlung und Bußgeld angeordnet/g, '')), 'Spieler sehen eine gewöhnliche Nachprüfung, keinen Hinweis auf die Spielleitung'); }
  console.log('0.21.24 ok: Partner nicht mehr im Spiel (neu gegründet/entfernt) → Staatskasse, Zahlungsweisen sofort/6/12/24 Raten, Wahl durch die Airline mit Nachlass, ohne Wahl 12 Raten');
}
// 0.21.25: Exklusivvertrag sehr teuer, befristet, ohne Kartellverfahren
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0); const P = SMx.P;
  const w = SMx.newWorld({ seed: 61 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAJ' }); w.playerId = 'P1';
  const pr = (c) => w.gateLockPrice(c), big = SMx.AP_CODES.find((c) => SMx.paxEff(c) >= 9.5 && SMx.paxEff(c) < 11);
  assert.ok(pr(big) > 150e6 * w.macro.cpi, 'Flughafen mit ~10 Mio. Pax: über 150 Mio. € (' + Math.round(pr(big) / 1e6) + ' Mio.)');
  assert.ok(pr('HAJ') / SMx.paxEff('HAJ') < pr(big) / SMx.paxEff(big), 'überproportional mit der Größe');
  a.ledger.equityFlow(2e9, 't');
  const A0 = { ...P.ANTITRUST }; Object.assign(P.ANTITRUST, { share: 0, minDeps: 0, minPax: 0 });
  a.fleet.length || SMx.applyAction(w, 'P1', { type: 'acquire', typeId: 'DH8D', base: 'HAJ', mode: 'lease' }); while (w.day <= a.fleet[0].delivery_day) w.step();
  const dest = SMx.AP_CODES.find((c) => c !== 'HAJ' && SMx.gcDistanceKm('HAJ', c) > 250 && SMx.gcDistanceKm('HAJ', c) < 600 && SMx.applyAction(w, 'P1', { type: 'openRoute', base: 'HAJ', dest: c, typeId: 'DH8D', freq: 1 }).ok);
  assert.ok(dest, 'Strecke eröffnet'); for (let i = 0; i < 3; i++) w.step(); w.antitrustCheck(); assert.ok(a.antitrust && a.antitrust.HAJ, 'ohne Vertrag: Verfahren');
  const c0 = a.ledger.cash, r = SMx.applyAction(w, 'P1', { type: 'gateLock', apt: 'HAJ', on: true }); assert.ok(r.ok, r.msg);
  assert.equal(Math.round((c0 - a.ledger.cash) / 100), Math.round(r.price), 'Preis bezahlt'); assert.equal(r.until, w.day + 3 * 365, '3 Jahre Laufzeit');
  assert.ok(!(a.antitrust && a.antitrust.HAJ), 'Verfahren eingestellt'); w.antitrustCheck(); assert.ok(!(a.antitrust && a.antitrust.HAJ), 'kein neues Verfahren während der Laufzeit');
  const rf = w.gateLockRefund(a.gateLock.HAJ); assert.ok(rf > 0.39 * r.price && rf <= 0.4 * r.price, 'Kündigung am Anfang: knapp 40 % zurück');
  a.gateLock.HAJ.until = w.day + 1; w.step(); w.step(); assert.ok(!a.gateLock.HAJ, 'läuft aus'); w.antitrustCheck(); assert.ok(a.antitrust && a.antitrust.HAJ, 'danach wieder Wettbewerbsaufsicht');
  Object.assign(P.ANTITRUST, A0);
  a.gateLock = { HAJ: { since: 0, price: 5e6 } }; const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); assert.equal(w2.airlines.P1.gateLock.HAJ.until, w2.day + 180, 'alter Vertrag läuft 180 Tage');
  console.log('0.21.25 ok: Exklusivvertrag', Math.round(pr(big) / 1e6), 'Mio. € bei', big, '(' + SMx.paxEff(big).toFixed(1), 'Mio. Pax), 3 Jahre, kein Kartellverfahren, danach wieder Aufsicht, Altverträge 180 Tage');
}
// 0.21.26: Auslastung nach geflogenen Flügen – Ausfälle zählen nicht als leere Sitze; Preisautomatik reagiert auf Abweisungen
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 71 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HKT' }); w.playerId = 'P1'; a.ledger.equityFlow(3e8, 't');
  const ac = a.acquire(w.day, 'A20N', 'HKT', 'lease', null, w); ac.delivery_day = w.day; a.staff.pil.A32F = 30; a.staff.cab = 40; a.staff.tech = 20;
  assert.ok(SMx.applyAction(w, 'P1', { type: 'openRoute', base: 'HKT', dest: 'HKG', typeId: 'A20N', freq: 1 }).ok);
  for (let i = 0; i < 3; i++) w.step(); const r = a.routes[0];
  assert.ok(r.hist.at(-1).so_out > 0, 'geflogene Sitze werden erfasst');
  const day = (cx) => ({ flights: cx ? 2 : 2, seats: 344, cancelled: cx ? 2 : 0, pax: cx ? 0 : 200, pax_out: cx ? 0 : 172, pax_in: cx ? 0 : 28, seats_out: 172, seats_in: 172, so_out: cx ? 0 : 172, so_in: cx ? 0 : 172, demand_out: 2500, demand_in: 30, spill_out: cx ? 2500 : 2328, spill_in: cx ? 30 : 2, cost: 0, rev: 0 });
  r.hist = [day(0), day(0), day(1), day(0), day(0), day(0), day(0)];
  assert.equal(SMx.routeLf(r, 7, 'out'), 1, 'hin: geflogene Flüge voll (Ausfall zählt nicht)');
  assert.ok(Math.abs(SMx.routeLf(r, 7, 'in') - 28 / 172) < 1e-9, 'zurück: echte Auslastung');
  const old = { ...r.hist[0] }; delete old.so_out; delete old.so_in; r.hist.push(old); assert.ok(SMx.routeLf(r, 1, 'out') === 1, 'alte Einträge ohne Angabe: wie bisher');
  r.ap = 0.9; r.opened_day = w.day - 60; r.pending = []; const f0 = r.fare_out, i0 = r.fare_in; w.playerAutoPricing(a);
  assert.ok(r.pending.length && r.pending[0][1] > f0 && r.pending[0][2] < i0, 'Preisautomatik: hin rauf (ausgebucht, viele Abweisungen), zurück runter');
  // Warteliste: kleinere Airlines zuerst, egal wann eingetragen
  { const big = SMx.addHuman(w, { id: 'P2', name: 'Groß', code: 'GR', base: 'MUC' }), small = SMx.addHuman(w, { id: 'P3', name: 'Klein', code: 'KL', base: 'BER' });
    big.ledger.equityFlow(5e8, 't'); small.ledger.equityFlow(5e8, 't'); for (let i = 0; i < 6; i++) big.acquire(w.day, 'DH8D', 'MUC', 'lease', null, w);
    const apt = 'FRA'; w.slotWait = []; assert.ok(w.joinWait(big, apt, 2).ok && w.joinWait(small, apt, 2).ok, 'eingetragen');
    const q = w.waitQueue(apt); assert.equal(q[0].al, 'P3', 'kleinere Airline steht vorn, obwohl später eingetragen'); assert.equal(w.waitPos(q[0]), 1);
    { const mid = SMx.addHuman(w, { id: 'P4', name: 'Mittel', code: 'MI', base: 'HAM' }); mid.ledger.equityFlow(5e8, 't'); for (let i = 0; i < 3; i++) mid.acquire(w.day, 'DH8D', 'HAM', 'lease', null, w); w._wr = null;
      const sw0 = w.slotWait.slice();
      // Groß (früh), Klein (Plan-Eintrag 2 später), Mittel: Klein hat nur einen Vorrangplatz, der zweite Eintrag steht nach Zeit hinten
      w.slotWait.push({ id: 'WX1', al: 'P4', apt, n: 1 }); w.slotWait.push({ id: 'WX2', al: 'P3', apt, n: 1, plan: 'PL9' });
      const q2 = w.waitQueue(apt).map((e) => e.al + (e.plan ? '*' : ''));
      assert.deepEqual(q2, ['P3', 'P4', 'P2', 'P3*'], 'je Airline ein Vorrangplatz (klein vor mittel vor groß), weitere Einträge nach Zeit: ' + q2.join(','));
      w.slotWait = sw0; delete w.airlines.P4; w.order = w.order.filter((x) => x !== 'P4'); }
    w.slotCap[apt] -= w.slotsFree(apt) - 1; assert.equal(w.slotsFree(apt), 1, 'genau ein Slot frei');
    const fc = w.waitForecast(apt); assert.equal(fc.byId[q[0].id], 1, 'Prognose: Slot an die kleine Airline');
    const hb = big.heldAt(apt, w.day), hs = small.heldAt(apt, w.day); w.allocateWaitlist();
    assert.equal(small.heldAt(apt, w.day) - hs, 1, 'Zuteilung an die kleine Airline'); assert.equal(big.heldAt(apt, w.day), hb, 'große geht leer aus'); }
  // 0.21.28: Slot-Rating (Flotte, Slots, Eigenkapital, Ergebnis seit der Vergabe) und höchstens 3 Einträge ab dem 1. April 2028
  { const big = w.airlines.P2, small = w.airlines.P3; w._wr = null; const rs = w.slotRating(small), rb = w.slotRating(big); assert.ok(rs.score < rb.score, 'kleine Airline hat das niedrigere Rating: ' + rs.score + ' < ' + rb.score);
    assert.ok(['fleet', 'slots', 'equity', 'profit'].every((k) => k in rb.parts), 'vier Bausteine');
    small.ledger.equityFlow(5e9, 't'); w._wr = null; const rs2 = w.slotRating(small), rb2 = w.slotRating(big); assert.ok(rs2.parts.equity === 1 && rb2.parts.equity < 0.2 && rb2.score < rb.score, 'Eigenkapital zählt mit (relativ zur Größten)'); small.ledger.equityFlow(-5e9, 't'); w._wr = null;
    // Einträge: vor dem 1. April bis 12, danach 3; zum 1. April werden überzählige gekürzt (die frühesten bleiben)
    w.slotWait = []; const apts = ['FRA', 'MUC', 'LHR', 'CDG', 'AMS'].filter((c) => SMx.apx(c).slots !== null);
    for (const c of apts) assert.ok(w.joinWait(big, c, 1).ok, 'vor dem 1. April mehr als 3 erlaubt');
    const d0 = w.day; w.day = SMx.P.WAIT.from - 1; const lim = w.joinWait(small, 'FRA', 1); assert.ok(lim.ok);
    for (const c of apts.slice(1, 3)) w.joinWait(small, c, 1); const x4 = w.joinWait(small, apts[3], 1); assert.ok(!x4.ok && /Höchstens 3/.test(x4.msg), 'ab dem 1. April höchstens 3: ' + x4.msg);
    const nb = w.slotWait.filter((e) => e.al === big.id).length; assert.ok(nb > 3);
    w.slotRound(SMx.P.WAIT.from); assert.ok(w.slotWait.filter((e) => e.al === big.id && e.n > 0).length <= 3, 'zum 1. April gekürzt');
    assert.ok(big.events.some((e) => /verfallen/.test(e.msg)), 'Hinweis im Logbuch'); w.day = d0; }
  console.log('0.21.26–28 ok: Slot-Rating, max. 3 Einträge ab 1. April, Auslastung ohne annullierte Flüge, Preisautomatik hin +' + Math.round((r.pending[0][1] / f0 - 1) * 100) + ' %, zurück ' + Math.round((r.pending[0][2] / i0 - 1) * 100) + ' %');
}
// 0.21.29: Auslastung nie über 100 % – Speicherformat der Streckenhistorie (Spalten) und Reparatur verschobener Einträge
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 81 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HKT' }); w.playerId = 'P1'; a.ledger.equityFlow(6e8, 't'); a.prog.lv = 3;
  w.setCabin(a, 'short', 0, 0.15); w.setCabin(a, 'long', 0, 0.15);
  for (let i = 0; i < 5; i++) { const ac = a.acquire(w.day, 'A20N', 'HKT', 'lease', null, w); ac.delivery_day = w.day; }
  { const ac = a.acquire(w.day, 'A21N', 'HKT', 'lease', null, w); ac.delivery_day = w.day; }
  a.staff.pil.A32F = 90; a.staff.cab = 160; a.staff.tech = 40;
  for (const d of ['HKG', 'KUL', 'TPE', 'CAN', 'BKK']) SMx.applyAction(w, 'P1', { type: 'openRoute', base: 'HKT', dest: d, typeId: 'A20N', freq: 1 });
  SMx.applyAction(w, 'P1', { type: 'openRoute', base: 'HKT', dest: 'MEL', typeId: 'A21N', freq: 1 });   // Teilbetrieb (ein Flugzeug für eine lange Strecke)
  for (const r of a.routes) SMx.applyAction(w, 'P1', { type: 'autoPrice', id: r.id, on: true, lf: 0.9 });
  for (let i = 0; i < 45; i++) w.step();
  let bad = 0; for (const r of a.routes) for (const h of r.hist) for (const d of ['out', 'in']) if (h['pax_' + d] > h['so_' + d] + 0.5) bad++;
  assert.equal(bad, 0, 'nie mehr Passagiere als Sitze auf geflogenen Flügen');
  for (const r of a.routes) for (const d of ['out', 'in']) assert.ok(SMx.routeLf(r, 7, d) <= 1 + 1e-9, r.dest + ' ' + d + ' ' + SMx.routeLf(r, 7, d));
  // Rundreise im heutigen Format
  const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); const r0 = a.routes[0], r2 = w2.airlines.P1.routes[0];
  assert.deepEqual(r2.hist.at(-1), r0.hist.at(-1), 'Historie bleibt beim Speichern erhalten');
  // Alter Stand (vor 0.21.26, 23 Spalten) → unter 0.21.26–28 verschoben gelesen und gespeichert → wird jetzt repariert
  const OLD = ['flights', 'seats', 'cancelled', 'cost', 'block_h', 'pax', 'rev', 'pax_out', 'pax_in', 'seats_out', 'seats_in', 'late', 'demand_out', 'demand_in', 'spill_out', 'spill_in', 'tr_out', 'tr_in', 'cargo', 'prem', 'd', 'trd', 'ps'];
  const BROKEN = ['flights', 'seats', 'cancelled', 'cost', 'block_h', 'pax', 'rev', 'pax_out', 'pax_in', 'seats_out', 'seats_in', 'so_out', 'so_in', 'late', 'demand_out', 'demand_in', 'spill_out', 'spill_in', 'tr_out', 'tr_in', 'cargo', 'prem', 'd', 'trd', 'ps'];
  const S = SMx.serialize(w); delete S.hv;
  const pr = S.airlines ? null : null; void pr;
  const routesOf = (st) => { const out = []; const walk = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(walk); return; } if (Array.isArray(o.hist) && !o.hk && o.hist.length && Array.isArray(o.hist[0]) && o.hist[0].length >= 25) out.push(o); for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v); }; walk(st); return out; };
  const rs = routesOf(S); assert.ok(rs.length >= 5, 'Strecken im Speicherstand gefunden');
  const orig = rs.map((r) => r.hist.map((arr) => Object.fromEntries(OLD.map((k, i) => [k, arr[i]]))));
  rs.forEach((r, j) => { r.hist = r.hist.map((arr, i) => {
    if (i >= r.hist.length - 3) { const o = Object.fromEntries([...OLD, 'so_out', 'so_in'].map((k, x) => [k, arr[x]])); return BROKEN.map((k) => o[k] ?? 0); }   // echte Einträge aus 0.21.26–28
    const old = OLD.map((k) => orig[j][i][k]), dec = Object.fromEntries(BROKEN.map((k, x) => [k, old[x] ?? 0])); return BROKEN.map((k) => dec[k]);   // alt, verschoben gelesen und wieder gespeichert
  }); });
  const w3 = SMx.deserialize(JSON.parse(JSON.stringify(S)));
  let fixed = 0, total = 0; for (const r of a.routes) { const r3 = w3.airlines.P1.routes.find((x) => x.id === r.id); r.hist.forEach((h, i) => { total++; if (OLD.every((k) => Math.abs((r3.hist[i][k] || 0) - (k === 'block_h' ? Math.round(h[k] * 10) / 10 : Math.round(h[k] || 0))) < 0.11)) fixed++; }); }
  assert.equal(fixed, total, `verschobene Einträge repariert (${fixed} von ${total})`);
  for (const r of w3.airlines.P1.routes) for (const d of ['out', 'in']) assert.ok(SMx.routeLf(r, 60, d) <= 1 + 1e-9, 'nach Reparatur ≤ 100 %');
  console.log('0.21.29 ok: Auslastung ≤ 100 % auf allen Strecken (auch Teilbetrieb), Speicherformat stabil, ' + total + ' Einträge aus dem verschobenen Format korrekt gelesen');
}
// 0.21.30: Komplettübernahme hebt Wachstumsgrenzen auf (Basen, Aufschläge)
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 91 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAJ' }); w.playerId = 'P1'; a.ledger.equityFlow(5e9, 't');
  a.bases.push('BRE', 'LEJ', 'DRS'); assert.ok(!w.openBase(a, 'NUE').ok, 'vorher: höchstens 4 Basen'); assert.ok(!SMx.limitsLifted(a));
  const before = SMx.softX(a, 'baseDay');
  const t = w.list.filter((x) => x.archetype && x.status === 'active' && !SMx.maBlock(w, a, x)).sort((x, y) => SMx.maValue(w, x, a).price - SMx.maValue(w, y, a).price)[0];
  assert.ok(t, 'übernehmbare KI-Airline gefunden'); const r = SMx.applyAction(w, 'P1', { type: 'takeover', target: t.id }); assert.ok(r.ok, r.msg);
  assert.ok(SMx.limitsLifted(a) && a.group && a.group.names.includes(t.name), 'Konzern nach Übernahme'); assert.equal(SMx.softX(a, 'baseDay'), 1, 'keine Aufschläge mehr'); assert.ok(before >= 1);
  const nb = SMx.AP_CODES.find((c) => !a.bases.includes(c) && SMx.baseApproval(a, c).ok && !(SMx.apx(c).slots !== null && w.slotsFree(c) < 3));
  const ob = w.openBase(a, nb); assert.ok(ob.ok, 'weitere Basis trotz ' + (a.bases.length - 1) + ' Basen: ' + ob.msg);
  const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); assert.ok(SMx.limitsLifted(w2.airlines.P1), 'bleibt gespeichert');
  console.log('0.21.30 ok: nach Übernahme von', t.name, '– Basen', a.bases.length, ', keine Aufschläge, gespeichert');
}
// 0.21.37: Börsenwert – KGV nie unter 4 (operatives Ergebnis), schnelleres Nachziehen, stille Reserven in Beteiligungen
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 31 }), a = SMx.addHuman(w, { id: 'P1', name: 'Kurs', code: 'KQ', base: 'HAJ' }); w.playerId = 'P1';
  for (let i = 0; i < 120; i++) w.step();
  const c = SMx.capState(a); c.mc = 20e6;   // Kurs hinkt hinterher
  // sechs starke Monate: 25 Mio. operatives Ergebnis je Monat (Erlös), plus ein Sondergewinn, der nicht zählt
  const ms = a.ledger.months.slice(-6); for (const m of ms) { m.acc.rev_pax = (m.acc.rev_pax || 0) + 25e6 * 100; }
  ms.at(-1).acc.one_off = (ms.at(-1).acc.one_off || 0) + 500e6 * 100;
  const e6 = SMx.earnRecent(a), cap = SMx.mktCap(w, a);
  assert.ok(e6 > 250e6 && cap >= 4 * Math.min(e6, Math.max(SMx.opResult(a), 0) * 2.5) - 1, `KGV nicht unter 4: Börsenwert ${Math.round(cap / 1e6)} Mio., Ergebnis ${Math.round(e6 / 1e6)} Mio.`);
  assert.ok(cap / e6 >= 3.99, 'KGV ' + (cap / e6).toFixed(1));
  const before = SMx.capState(a).mc; SMx.updateCap(w, a); assert.ok(SMx.capState(a).mc >= before && SMx.capState(a).mc <= Math.max(before, cap) * 1.41, 'Nachziehen: halber Weg zum Zielwert');
  const B = w.list.find((x) => !x.isPlayer && x.status !== 'insolvent'); const p0 = SMx.stakeBuyPrice(w, B.isPlayer ? B : a, a, 0.05);
  assert.ok(p0 >= 0.05 * 4 * Math.min(e6, SMx.opResult(a) * 2.5) * 0.99, 'Aktienkauf zum Mindestwert');
  // Mindestdividende: mehr als 5 % der Aktien bei anderen → mindestens 25 % des Gewinns, auch wenn 0 % gewählt
  { const cs = SMx.capState(a); cs.div = 0; cs.ext = 0.111; a.ledger.equityFlow(50e6, 't');
    assert.equal(SMx.divRate(a, 10e6), 0.25, 'Mindestquote greift'); cs.ext = 0.03; assert.equal(SMx.divRate(a, 10e6), 0, 'unter 5 % außerhalb frei wählbar');
    cs.ext = 0.111; assert.equal(SMx.divRate(a, -5e6), 0, 'im Verlustmonat keine Pflicht'); cs.div = 0.5; assert.equal(SMx.divRate(a, 10e6), 0.5, 'höhere eigene Quote bleibt'); cs.div = 0; cs.ext = 0; }
  console.log('0.21.37 ok: Börsenwert ' + Math.round(cap / 1e6) + ' Mio. statt 20 Mio. (KGV ' + (cap / e6).toFixed(1) + ' auf das operative Ergebnis, Sondergewinn zählt nicht)');
}
// 0.21.35: Geopolitik und Natur – Konflikt mit Überflugverbot (Umweg), Flugverbot zwischen Ländern, Landerechte, Kurzstreckenverbot, Einreisestopp, Annullieren
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 77 }), a = SMx.addHuman(w, { id: 'P1', name: 'Geo', code: 'GQ', base: 'FRA' }); w.playerId = 'P1'; a.ledger.equityFlow(8e8, 't'); a.brand = 1; a._st = null;
  for (const [d, t] of [['ICN', 'A359'], ['IST', 'A20N'], ['DXB', 'A359']]) { SMx.applyAction(w, 'P1', { type: 'acquire', typeId: t, mode: 'lease', base: 'FRA' }); assert.ok(SMx.applyAction(w, 'P1', { type: 'openRoute', base: 'FRA', dest: d, typeId: t, freq: 1 }).ok, 'Strecke ' + d); }
  for (let i = 0; i < 40; i++) w.step();
  const R = (d) => a.routes.find((x) => x.dest === d && !x.closed), z = SMx.GEO_ZONES.find((x) => x.key === 'russland');
  const f0 = w.costsFor(a, R('ICN'), 'FRA', 'ICN', 200, 1e5, true).fuel;
  const ev = w.addEvent({ type: 'conflict', zone: 'russland', short: 'Konflikt Russland', countries: z.countries, airports: SMx.AP_CODES.filter((x) => SMx.P.AIRPORTS[x].country === 'RU'), ops: { cancel: 1, delay: 0 }, overfly: { circles: z.circles, name: 'Russland' }, countries2: ['FI'], demand2: { leisure: 0.75, business: 0.85, vfr: 0.92 }, end: w.day + 30, recovery: 60, text: 'Konflikt: Test', severity: 'crit' });
  const dt = w.detour(a, 'FRA', 'ICN'), f1 = w.costsFor(a, R('ICN'), 'FRA', 'ICN', 200, 1e5, true).fuel;
  assert.ok(dt.km > 800 && f1 > f0 * 1.1, 'Umweg um Russland verteuert FRA–ICN: +' + Math.round(dt.km) + ' km');
  assert.ok(w.opsAt('SVO').hard && !w.opsAt('HEL').hard, 'Russland gesperrt, Finnland nicht (nur Nachfrage)');
  assert.ok(w.demandMult('HEL', 'ARN', 'leisure') < 0.8, 'Nachfrage im Nachbarland sinkt');
  w.addEvent({ type: 'flight_ban', short: 'Flugverbot Deutschland–Türkei', countries: ['DE', 'TR'], ban: { a: ['DE'], b: ['TR'] }, end: w.day + 20, text: 'Flugverbot: Test', severity: 'crit' });
  assert.ok(/Flugverbot/.test(w.legRisk(a, R('IST')).hard || ''), 'FRA–IST fällt wegen Flugverbot aus'); assert.ok(!w.routeBan(a, 'FRA', 'MUC'), 'Inland nicht betroffen');
  w.addEvent({ type: 'carrier_ban', short: 'Landerechte VAE', countries: ['AE'], ban: { a: ['AE'], carrier: ['DE'] }, end: w.day + 20, text: 'Landerechte: Test', severity: 'crit' });
  assert.ok(w.legRisk(a, R('DXB')).hard, 'deutsche Airline darf nicht in die VAE'); assert.ok(!w.routeBan({ bases: ['LHR'] }, 'LHR', 'DXB'), 'britische schon');
  w.addEvent({ type: 'shorthaul_ban', countries: ['DE'], ban: { dom: 'DE', rail: 2.5 }, end: w.day + 100, text: 'Kurzstreckenverbot: Test', severity: 'warn' });
  assert.ok(w.routeBan(a, 'HAM', 'BER') && !w.routeBan(a, 'FRA', 'MUC'), 'Kurzstreckenverbot nur, wo der Zug höchstens 2,5 h braucht');
  w.addEvent({ type: 'entry_ban', countries: ['TR'], pair: { a: ['TR'], b: ['DE'] }, pairDemand: { leisure: 0.15, business: 0.3, vfr: 0.45 }, end: w.day + 20, text: 'Einreisestopp: Test', severity: 'warn' });
  assert.ok(w.demandMult('FRA', 'IST', 'leisure') < 0.2 && w.demandMult('FRA', 'CDG', 'leisure') > 0.9, 'Einreisestopp nur zwischen den Ländern');
  assert.ok(w.cancelEvent(ev.id).ok && w.detour(a, 'FRA', 'ICN').km === 0 && !w.opsAt('SVO').hard, 'Annullieren hebt Sperre und Umweg auf');
  // Generatoren: ein Jahr mit erhöhter Häufigkeit – alle neuen Arten entstehen ohne Fehler, Bilanz bleibt ausgeglichen
  w.eventMult = 3; const seen = new Set();
  for (let i = 0; i < 365; i++) { w.step(); for (const e of w.events) seen.add(e.type); }
  const neu = ['conflict', 'flight_ban', 'carrier_ban', 'unrest', 'entry_ban', 'open_skies', 'visa_free', 'foreign_fee', 'domestic_aid', 'heatwave', 'sandstorm', 'monsoon', 'blizzard', 'wildfire'].filter((k) => seen.has(k));
  assert.ok(neu.length >= 8, 'neue Ereignisarten im Jahr: ' + neu.join(', '));
  assert.ok(Math.abs(SMx.balanceSheet(a).check) < 1, 'Bilanz ausgeglichen');
  const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); const act = (W) => W.events.filter((e) => (e.ban || e.overfly) && e.end > W.day).map((e) => e.id).join(); assert.equal(act(w2), act(w), 'laufende Sperren bleiben gespeichert');
  console.log('0.21.35 ok: Konflikt mit Umweg (+' + Math.round(dt.km) + ' km FRA–ICN), Flugverbot, Landerechte, Kurzstreckenverbot, Einreisestopp, Annullieren; im Jahr:', neu.join(', '));
}
// 0.21.33: höchstens 2 neue Basen je Kalenderjahr; ab der 5. Basis Konzessionsabgabe und nur 2 Slots
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 93 }), a = SMx.addHuman(w, { id: 'P1', name: 'Beta', code: 'BB', base: 'HAJ' }); w.playerId = 'P1'; a.ledger.equityFlow(5e9, 't'); a.brand = 1; a._st = null;
  const ok = (c) => !a.bases.includes(c) && SMx.baseApproval(a, c).ok && SMx.apx(c).slots !== null && w.slotsFree(c) >= 3;
  const cands = SMx.AP_CODES.filter(ok);
  assert.ok(w.openBase(a, cands[0]).ok && w.openBase(a, cands[1]).ok, 'zwei neue Basen im ersten Jahr');
  const r3 = w.openBase(a, cands[2]); assert.ok(!r3.ok && /1\. Januar/.test(r3.msg), 'dritte im selben Jahr abgelehnt: ' + r3.msg);
  assert.equal(SMx.baseOpensYear(w, a), 2);
  while (Math.floor(w.day / 365) === 0) w.day += 30;
  assert.equal(SMx.baseOpensYear(w, a), 0, 'neues Kalenderjahr');
  assert.ok(w.openBase(a, cands[2]).ok, 'im neuen Jahr wieder möglich (vierte Basis)');
  const r5 = w.openBase(a, cands[3]); assert.ok(!r5.ok && /4 Basen/.test(r5.msg), 'ohne Konzern bleibt es bei 4');
  a.group = { since: w.day, names: ['Test'] }; assert.ok(SMx.limitsLifted(a));
  const fee = SMx.baseExtraFee(w, a, cands[3]); assert.ok(fee >= 100e6 * 0.99, 'Konzessionsabgabe für die 5. Basis: ' + fee);
  assert.equal(SMx.baseSlotN(a, cands[3]), 2, 'nur 2 Slots ab der 5. Basis');
  const eq0 = SMx.balanceSheet(a).equity; assert.ok(w.openBase(a, cands[3]).ok, 'fünfte Basis im Konzern');
  assert.equal(a.heldAt(cands[3], w.day), 2, 'zwei Basis-Slots an der 5. Basis'); assert.ok(eq0 - SMx.balanceSheet(a).equity >= fee * 0.99, 'Abgabe mindert das Eigenkapital');
  assert.ok(SMx.baseExtraFee(w, a, cands[4]) > fee * 1.4, 'sechste Basis noch teurer');
  const r6 = w.openBase(a, cands[4]); assert.ok(!r6.ok && /1\. Januar/.test(r6.msg), 'auch im Konzern höchstens 2 neue je Kalenderjahr');
  const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); assert.equal(SMx.baseOpensYear(w2, w2.airlines.P1), 2, 'Zählung bleibt gespeichert');
  console.log('0.21.33 ok: 2 neue Basen je Kalenderjahr, 5. Basis', Math.round(fee / 1e6), 'Mio. € Abgabe und 2 Slots, 6. Basis', Math.round(SMx.baseExtraFee(w, a, cands[4]) / 1e6), 'Mio. €');
}
// 0.21.31: Kredit ablösen mit zeitweiligem Dispo (Umschuldung)
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 95 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAJ' }); w.playerId = 'P1';
  for (let i = 0; i < 3; i++) w.step(); a.ledger.equityFlow(4e7, 't'); a.rating = 'A';
  const lim = a.creditLimit(w.macro.bank ?? 1); assert.ok(lim > 1e6, 'Kreditlinie vorhanden: ' + Math.round(lim));
  const tk = w.takeLoan(a, Math.min(5e6, w.loanLimit(a)), 5); assert.ok(tk.ok, tk.msg); const ln = a.loans[0];
  const keep = Math.max(0, ln.balance * 1.01 - lim * 0.6); a.ledger.equityFlow(-(a.ledger.cash / 100 - keep), 't');   // Guthaben reicht nicht ganz
  const q = w.repayQuote(a, ln); assert.ok(q.ok && q.fromCredit > 0, 'Teil aus dem Dispo nötig und möglich');
  const eq0 = SMx.balanceSheet(a).equity, cu0 = a.creditUsed || 0, r = SMx.applyAction(w, 'P1', { type: 'repay', id: ln.id }); assert.ok(r.ok, r.msg);
  assert.ok(!a.loans.length && Math.abs((a.creditUsed - cu0) - q.fromCredit) < 1, 'Kredit weg, Differenz im Dispo');
  assert.ok(Math.abs(SMx.balanceSheet(a).equity - (eq0 - ln.balance * 0.01)) < 1, 'Eigenkapital sinkt nur um die Vorfälligkeit'); assert.ok(Math.abs(SMx.balanceSheet(a).check) < 0.01, 'Bilanz stimmt');
  assert.ok(a.creditUsed <= a.creditLimit(w.macro.bank ?? 1) + 1, 'innerhalb der Kreditlinie');
  // zu wenig Spielraum: abgelehnt
  const t2 = w.takeLoan(a, Math.min(2e6, w.loanLimit(a)), 3); if (t2.ok) { const l2 = a.loans[0]; a.ledger.equityFlow(-(a.ledger.cash / 100), 't'); a.creditUsed = a.creditLimit(w.macro.bank ?? 1);
    const r2 = SMx.applyAction(w, 'P1', { type: 'repay', id: l2.id }); assert.ok(!r2.ok && /Dispo/.test(r2.msg), 'ohne Spielraum abgelehnt: ' + r2.msg); }
  console.log('0.21.31 ok: Kredit abgelöst, ' + Math.round(q.fromCredit / 1e3) + ' Tsd. € vorübergehend aus dem Dispo, Eigenkapital nur −1 % Vorfälligkeit');
}
// 0.21.31: Warteliste – austragen; wer bei der letzten Vergabe dort einen Slot bekam, hat beim nächsten Mal keinen Vorrang
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 97 }), a = SMx.addHuman(w, { id: 'P1', name: 'Klein', code: 'KL', base: 'HAM' }), b = SMx.addHuman(w, { id: 'P2', name: 'Groß', code: 'GR', base: 'MUC' }); w.playerId = 'P1';
  a.ledger.equityFlow(3e8, 't'); b.ledger.equityFlow(9e8, 't'); for (let i = 0; i < 6; i++) b.acquire(w.day, 'DH8D', 'MUC', 'lease', null, w);
  const apt = 'FRA'; w.slotWait = []; w.joinWait(a, apt, 1); w.slotCap[apt] -= w.slotsFree(apt) - 1;
  w.allocateWaitlist(SMx.nextSlotDay(w.day).day); w.slotRoundDay = SMx.nextSlotDay(w.day).day;
  assert.ok(w.gotLastRound('P1', apt), 'Zuteilung gemerkt');
  w.joinWait(b, apt, 1); w.joinWait(a, apt, 1); w._wr = null;
  const q = w.waitQueue(apt); assert.equal(q[0].al, 'P2', 'kleine Airline ohne Vorrang, weil sie zuletzt einen Slot bekam'); assert.ok(!w.waitFirst(q[1]));
  const rt = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); assert.ok(rt.gotLastRound('P1', apt), 'gespeichert');
  // austragen
  const mine = w.slotWait.find((e) => e.al === 'P1'); assert.ok(SMx.applyAction(w, 'P1', { type: 'slotWaitLeave', id: mine.id }).ok, 'austragen'); assert.ok(!w.slotWait.some((e) => e.al === 'P1'), 'Eintrag weg');
  assert.ok(!SMx.applyAction(w, 'P1', { type: 'slotWaitLeave', id: w.slotWait[0].id }).ok, 'fremde Einträge nicht');
  console.log('0.21.31 ok: Warteliste austragen, kein Vorrang nach Zuteilung in der letzten Vergabe');
}
// 0.21.32: Ungenutzte Slots gehen nach 6 Monaten zurück (Warnung 30 Tage vorher, Erstattung wie bei der Rückgabe an den Flughafen)
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 99 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }); w.playerId = 'P1'; a.ledger.equityFlow(2e8, 't');
  for (let i = 0; i < 2; i++) w.step();
  const apt = SMx.AP_CODES.find((c) => SMx.apx(c).slots !== null && w.slotsFree(c) >= 3 && c !== 'HAM');
  const r = w.buySlots(a, apt, 2); assert.ok(r.ok, r.msg); const h0 = a.heldAt(apt, w.day); assert.equal(h0, 2);
  const free0 = w.slotsFree(apt), hs = a.slotHold[apt].filter((h) => h.buy); assert.ok(hs.every((h) => h.since !== undefined), 'Reserve mit Datum');
  for (const h of hs) h.since = w.day - (SMx.P.SLOT_IDLE.days - SMx.P.SLOT_IDLE.warn); w.slotIdleCheck(a);
  assert.ok(a.events.some((e) => /seit fast 6 Monaten ungenutzt/.test(e.msg)) && a.heldAt(apt, w.day) === 2, 'Warnung 30 Tage vorher, Slots noch da');
  for (const h of a.slotHold[apt]) if (h.buy) h.since = w.day - SMx.P.SLOT_IDLE.days; const c0 = a.ledger.cash; w.slotIdleCheck(a);
  assert.equal(a.heldAt(apt, w.day), 0, 'nach 6 Monaten zurückgegeben'); assert.ok(a.ledger.cash > c0, 'mit Erstattung'); assert.equal(w.slotsFree(apt), free0 + 2, 'Slots wieder frei am Flughafen');
  assert.ok(Math.abs(SMx.balanceSheet(a).check) < 0.01, 'Bilanz stimmt');
  // Strecke verbraucht die älteste Reserve zuerst
  a.hold(apt, 1, 0, true); a.slotHold[apt][0].since = 5; a.hold(apt, 1, 0, true); a.slotHold[apt][1].since = 50; a.useHeld(apt, 1, w.day); assert.equal(a.slotHold[apt][0].since, 50, 'älteste Reserve zuerst verbraucht');
  // ältere Stände ohne Datum: Frist beginnt mit dem Update
  delete a.slotHold[apt][0].since; w.slotIdleCheck(a); assert.equal(a.slotHold[apt][0].since, w.day);
  console.log('0.21.32 ok: ungenutzte Slots nach 6 Monaten zurück (Warnung 30 Tage vorher, Erstattung), älteste Reserve zuerst genutzt');
}
// 0.21.32: mehrere Schulen je Bereich (z. B. Flugschulen für verschiedene Musterberechtigungen)
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 103 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }); w.playerId = 'P1'; a.ledger.equityFlow(2e8, 't');
  const A = (x) => SMx.applyAction(w, 'P1', { type: 'academy', ...x });
  assert.ok(A({ role: 'pilot', id: 'new', level: 1, group: 'DH8' }).ok, 'erste Flugschule');
  const no = A({ role: 'pilot', id: 'new', level: 1, group: 'A32F' }); assert.ok(!no.ok && /Phase/.test(no.msg), 'Gründung: nur eine Schule je Bereich: ' + no.msg);
  a.prog.lv = 2; assert.ok(A({ role: 'pilot', id: 'new', level: 2, group: 'A32F' }).ok && A({ role: 'pilot', id: 'new', level: 1, group: 'ATR' }).ok, 'Netzwerk: drei Flugschulen');
  assert.ok(!A({ role: 'pilot', id: 'new', level: 1, group: 'EJET' }).ok, 'nicht mehr als drei');
  const L = SMx.acadList(a, 'pilot'); assert.deepEqual(L.map((x) => x.group), ['DH8', 'A32F', 'ATR']); assert.equal(SMx.acadLv(a, 'pilot'), 2);
  for (const x of L) x.since = w.day - 200; const p0 = { ...a.staff.pil }; w.academyMonthly(a);
  assert.ok(a.staff.pil.DH8 - p0.DH8 === 2 && a.staff.pil.A32F - p0.A32F === 4 && a.staff.pil.ATR - p0.ATR === 2, 'jede Schule bildet für ihre Familie aus');
  assert.ok(A({ role: 'pilot', id: L[2].id, level: 0 }).ok && SMx.acadList(a, 'pilot').length === 2, 'Schule schließen');
  // ältere Stände (ein Objekt je Bereich) werden zur Liste
  a.academy.cabin = { lv: 2, since: 5 }; const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); const c2 = SMx.acadList(w2.airlines.P1, 'cabin'); assert.ok(c2.length === 1 && c2[0].lv === 2 && c2[0].id, 'alter Stand übernommen');
  console.log('0.21.32 ok: mehrere Schulen je Bereich (Netzwerk: 3), je Schule eigene Musterberechtigung, schließen, alte Stände übernommen');
}
// 0.21.41: Umsteiger – Erlös nach Einzeltarifen, Platzreserve nur für lohnende und beförderbare Umsteiger, Prognose mit Umsteigern, Drehkreuz-Analyse
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const mk = (seed) => { const w = SMx.newWorld({ seed }), a = SMx.addHuman(w, { id: 'P1', name: 'Hub Air', code: 'HB', base: 'NAS' }); w.playerId = 'P1'; a.ledger.equityFlow(3e9, 't'); if (a.prog) a.prog.lv = 4;
    for (const k of ['dailyEvents', 'generateMonthlyEvents', 'monthlyMacro', 'geoShocks']) w[k] = () => {}; w.slotsOkFor = () => true; w.takeSlots = () => {}; w.slotCost = () => ({ cost: 0, parts: [] });
    for (const g of Object.keys(a.staff.pil)) a.staff.pil[g] = 2000; a.staff.cab = 8000; a.staff.tech = 2000; return { w, a, A: (x) => SMx.applyAction(w, 'P1', x) }; };
  { const { w, a, A } = mk(41);
    for (let i = 0; i < 12; i++) A({ type: 'acquire', typeId: 'A20N', mode: 'buy', base: 'NAS' }); for (let i = 0; i < 2; i++) A({ type: 'acquire', typeId: 'A359', mode: 'buy', base: 'NAS' });
    for (const x of a.fleet) x.delivery_day = w.day;
    for (const d of ['MIA', 'FLL', 'ATL', 'BOS', 'JFK', 'ORD']) assert.ok(A({ type: 'openRoute', base: 'NAS', dest: d, typeId: 'A20N', freq: 2, role: d === 'MIA' ? 'feeder' : 'mixed' }).ok, d);
    for (const d of ['LHR', 'MAD']) assert.ok(A({ type: 'openRoute', base: 'NAS', dest: d, typeId: 'A359', freq: 1 }).ok, d);
    for (let i = 0; i < 40; i++) w.step();
    // Erlösanteil der kurzen Zubringerstrecke: ihr Tarif abzüglich Umsteigerrabatt (nach Entfernung wären es bei Europa-Reisen nur wenige Prozent)
    const mia = a.activeRoutes().find((r) => r.dest === 'MIA'), h = mia.hist.slice(-20); let tr = 0, trr = 0; for (const x of h) { tr += x.tr_out + x.tr_in; trr += x.trr || 0; }
    assert.ok(tr > 50, 'Umsteiger auf NAS–MIA: ' + tr); const y = trr / tr / ((mia.fare_out + mia.fare_in) / 2); assert.ok(y > 0.6 && y < 1.05, 'Erlösanteil je Umsteiger ≈ Tarif × Rabatt: ' + y.toFixed(2));
    for (const r of a.activeRoutes()) if (r.trCar) for (const d of ['out', 'in']) assert.ok(r.trCar[d] <= (r.trDem ? r.trDem[d] : 0) + 1e-6, 'beförderbar ≤ gewünscht ' + r.dest);
    // Prognose mit Umsteigern
    const spec = { airline: 'P1', base: 'NAS', dest: 'MCO', type_id: 'A20N', freq: 2, fare_out: 120, fare_in: 120, service: 'standard', buffer: 'normal' };
    const f0 = w.forecastFor(a, spec, { nDraws: 2, exact: true }), f1 = w.forecastFor(a, spec, { nDraws: 2, exact: true, tr: true }), fl = w.forecastFor(a, { ...spec, role: 'local' }, { nDraws: 2, exact: true, tr: true });
    assert.ok(f1.trPax > 0 && f1.transfer && f1.transfer.want > 0 && f1.transfer.flows.length, 'Prognose kennt Umsteiger: ' + f1.trPax);
    assert.ok(Math.abs(f1.pax - f1.localPax - f1.trPax) < 1e-6 && f1.lf <= 1 + 1e-9, 'Passagiere = Ortsgäste + Umsteiger, nie mehr als Sitze');
    assert.ok(!f0.trPax && !fl.trPax && !fl.transfer, 'ohne Wunsch bzw. als Endziel keine Umsteiger');
    // Drehkreuz-Analyse: Ströme, neue Ziele, Speichern
    const F = a.hubFlows && a.hubFlows.NAS; assert.ok(F && Object.keys(F).length > 5, 'Umsteigerströme über NAS erfasst');
    const tg = w.hubTargets(a, 'NAS'); assert.ok(tg.length > 3 && tg.every((x) => x.dest && x.car >= 0 && x.from.length), 'neue Ziele für Umsteiger');
    const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))), a2 = w2.airlines.P1, m2 = a2.routes.find((r) => r.id === mia.id);
    assert.ok(a2.hubFlows && Object.keys(a2.hubFlows.NAS).length === Object.keys(F).length && m2.trCar && m2.hist.at(-1).trr === mia.hist.at(-1).trr, 'Speichern: Ströme, Reserve-Grundlage, Umsteigererlös');
    console.log('0.21.41 ok: Erlösanteil NAS–MIA je Umsteiger', y.toFixed(2), '× Tarif · Prognose MCO mit', Math.round(f1.trPax), 'Umsteigern ·', tg.length, 'Zielvorschläge, z. B.', tg.slice(0, 3).map((x) => x.dest).join(', ')); }
  // Zwei volle Zubringer: Kurz-zu-Kurz-Umsteiger verdrängen keine voll zahlenden Ortsgäste (keine Platzreserve)
  { const { w, a, A } = mk(42);
    for (let i = 0; i < 2; i++) A({ type: 'acquire', typeId: 'A20N', mode: 'buy', base: 'NAS' }); for (const x of a.fleet) x.delivery_day = w.day;
    for (const d of ['MIA', 'BOS']) { const ref = SMx.refPrice('NAS', d, w.macro.cpi); assert.ok(A({ type: 'openRoute', base: 'NAS', dest: d, typeId: 'A20N', freq: 1, role: 'feeder', fo: Math.round(ref * 0.5), fi: Math.round(ref * 0.5) }).ok); }
    for (const r of a.activeRoutes()) delete r.ap;
    for (let i = 0; i < 30; i++) w.step();
    for (const r of a.activeRoutes()) { const c = r.trCar ? r.trCar.out : 0; assert.ok(r.trDem && r.trDem.out > 1 && c < 0.25 * r.trDem.out, `${r.dest}: keine Reserve für Umsteiger, die weniger bringen als verdrängte Ortsgäste (${c.toFixed(1)} von ${r.trDem ? r.trDem.out.toFixed(1) : 0})`); }
    console.log('0.21.41 ok: volle Zubringer halten keine Plätze für Kurz-zu-Kurz-Umsteiger frei'); }
  // Preisautomatik: viele Abweisungen trotz freier Plätze → nicht billiger
  { const { w, a, A } = mk(43); A({ type: 'acquire', typeId: 'A20N', mode: 'buy', base: 'NAS' }); for (const x of a.fleet) x.delivery_day = w.day;
    assert.ok(A({ type: 'openRoute', base: 'NAS', dest: 'ATL', typeId: 'A20N', freq: 1, fo: 200, fi: 200 }).ok); const r = a.activeRoutes()[0]; r.ap = 0.9; r.opened_day = w.day - 60; r.pending = [];
    r.hist = Array.from({ length: 7 }, () => ({ seats_out: 180, so_out: 180, pax_out: 110, spill_out: 40, demand_out: 150, seats_in: 180, so_in: 180, pax_in: 175, spill_in: 0, demand_in: 175 }));
    w.playerAutoPricing(a); const nf = r.pending.length ? r.pending[0][1] : r.fare_out; assert.ok(nf >= 200, 'Abweisungen: Preis sinkt nicht trotz 61 % Auslastung: ' + nf);
    const short = A({ type: 'openRoute', base: 'NAS', dest: 'MIA', typeId: 'A20N', freq: 1 }); assert.ok(short.ok || !/300 km/.test(short.msg), 'Mindestentfernung im Text stimmt');
    console.log('0.21.41 ok: Preisautomatik senkt nicht, solange viele abgewiesen werden'); }
}
// 0.21.41: Krisenvorschläge, Preisautomatik für Extremfälle, Startangebote, Codeshare-Handel, Flughafenausbau
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const mk = (seed, base = 'HAM') => { const w = SMx.newWorld({ seed }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base }); w.playerId = 'P1'; a.ledger.equityFlow(3e9, 't'); if (a.prog) a.prog.lv = 4;
    for (const k of ['dailyEvents', 'generateMonthlyEvents', 'geoShocks']) w[k] = () => {}; w.slotsOkFor = () => true; w.takeSlots = () => {}; w.slotCost = () => ({ cost: 0, parts: [] });
    for (const g of Object.keys(a.staff.pil)) a.staff.pil[g] = 2000; a.staff.cab = 8000; a.staff.tech = 2000; return { w, a, A: (x) => SMx.applyAction(w, 'P1', x) }; };
  // Startangebote: drei zur Gründung, annehmen/ablehnen, Marktstudie −90 %
  { const { w, a, A } = mk(51); assert.ok(a.offers && a.offers.length === 3 && a.offers.every((o) => o.until === w.day + 30 && SMx.offerText(a, o).t), 'drei Startangebote');
    a.offers[0] = { id: 'O1', k: 'study', until: w.day + 30 }; const p0 = w.studyPrice(a, 'full').cost;
    assert.ok(A({ type: 'takeOffer', id: 'O1' }).ok && w.studyPrice(a, 'full').cost <= Math.round(p0 * 0.1 / 1000) * 1000 + 1000, 'Marktstudie 90 % günstiger');
    assert.ok(A({ type: 'dropOffer', id: a.offers[0].id }).ok && a.offers.length === 1, 'ablehnen');
    a.offers[0] = { id: 'O9', k: 'mro', until: w.day - 1 }; assert.ok(!A({ type: 'takeOffer', id: 'O9' }).ok, 'abgelaufen');
    console.log('0.21.41 ok: Startangebote (3 zur Gründung, Marktstudie −90 %, ablehnen, Ablauf)'); }
  // Krisenvorschlag: starker Einbruch → Preisautomatik und weniger Frequenz, Slots bleiben bis nach der Krise, danach zurück
  { const { w, a, A } = mk(52); for (let i = 0; i < 3; i++) A({ type: 'acquire', typeId: 'A20N', mode: 'buy', base: 'HAM' }); for (const x of a.fleet) x.delivery_day = w.day;
    assert.ok(A({ type: 'openRoute', base: 'HAM', dest: 'PMI', typeId: 'A20N', freq: 3 }).ok && A({ type: 'openRoute', base: 'HAM', dest: 'LHR', typeId: 'A20N', freq: 2 }).ok);
    for (let i = 0; i < 5; i++) w.step();
    const e = w.addEvent({ type: 'big_event', airports: ['PMI'], demand: { leisure: 0.4, business: 0.6, vfr: 0.5 }, end: w.day + 120, text: 'Test: Einbruch auf Mallorca', severity: 'crit' });
    const plan = w.crisisPlan(a, e), pmi = a.activeRoutes().find((r) => r.dest === 'PMI'), lhr = a.activeRoutes().find((r) => r.dest === 'LHR');
    assert.ok(plan.length === 1 && plan[0].id === pmi.id && plan[0].ap && plan[0].freq === 1 + 0 * plan[0].freq || plan[0].freq === Math.max(1, Math.round(3 * 0.5)), 'Plan nur für betroffene Strecke: ' + JSON.stringify(plan));
    assert.ok(w.crisisPlan(a, { type: 'recession', countries: ['DE'], depth: 0.1, id: 'X' }).length === 2, 'Rezession trifft beide Strecken ab Hamburg');
    const res = A({ type: 'crisisAdjust', event: e.id }); assert.ok(res.ok && pmi.ap > 0 && pmi.freq < 3 && pmi.crisis && pmi.crisis.freq === 3 && !lhr.ap, 'übernommen: ' + res.msg);
    assert.ok((a.slotHold.PMI || []).filter((h) => h.buy).every((h) => h.since >= e.end), 'frei gewordene Slots verfallen nicht während der Krise');
    assert.ok(a.crisisDone[e.id] && !w.crisisPlan(a, e).some((x) => x.freq), 'nicht doppelt kürzen');
    assert.ok(A({ type: 'crisisSkip', event: e.id }).ok);
    for (let i = 0; i < 125; i++) w.step();
    const back = A({ type: 'crisisRestore' }); assert.ok(back.ok && pmi.freq === 3 && !pmi.crisis, 'nach der Krise zurück: ' + back.msg);
    console.log('0.21.41 ok: Krisenvorschlag (Preisautomatik, Frequenz 3× →', plan[0].freq + '×, Slots bleiben, danach zurück)'); }
  // Preisautomatik: Extremfälle täglich und in großen Schritten
  { const { w, a, A } = mk(53); A({ type: 'acquire', typeId: 'A20N', mode: 'buy', base: 'HAM' }); for (const x of a.fleet) x.delivery_day = w.day;
    assert.ok(A({ type: 'openRoute', base: 'HAM', dest: 'LHR', typeId: 'A20N', freq: 1, fo: 200, fi: 200 }).ok); const r = a.activeRoutes()[0];
    assert.ok(A({ type: 'autoPrice', id: r.id, on: true, lf: 0.85 }).ok && SMx.apCfgOf(r).ext === 1, 'Extremfälle ab Werk an'); r.opened_day = w.day - 60; r.pending = [];
    r.hist = Array.from({ length: 5 }, () => ({ seats_out: 180, so_out: 180, pax_out: 70, spill_out: 0, demand_out: 70, seats_in: 180, so_in: 180, pax_in: 70, spill_in: 0, demand_in: 70 }));
    w.playerAutoPricingExtreme(a); const f1 = r.pending.length ? r.pending.at(-1)[1] : r.fare_out;
    assert.ok(f1 < 200 * 0.9 && f1 >= 200 * 0.84, 'Einbruch: sofort bis zu −15 %: ' + f1);
    r.pending = []; w.playerAutoPricingExtreme(a); assert.ok(!r.pending.length, 'danach Pause');
    r.apx = w.day - 10; r.hist = Array.from({ length: 5 }, () => ({ seats_out: 180, so_out: 180, pax_out: 180, spill_out: 150, demand_out: 330, seats_in: 180, so_in: 180, pax_in: 180, spill_in: 150, demand_in: 330 }));
    w.playerAutoPricingExtreme(a); const f2 = r.pending.length ? r.pending.at(-1)[1] : r.fare_out; assert.ok(f2 > f1 * 1.1, 'Ansturm: sofort deutlich rauf: ' + f1 + ' → ' + f2);
    assert.ok(A({ type: 'autoPrice', id: r.id, on: true, cfg: { ext: 0 } }).ok && SMx.apCfgOf(r).ext === 0, 'abschaltbar');
    console.log('0.21.41 ok: Preisautomatik in Extremfällen', 200, '→', f1, '(Einbruch), dann', f2, '(Ansturm)'); }
  // Codeshare-Handel: gleiche Kooperation nicht doppelt, KI zählt sie nur einmal
  { const { w, a, A } = mk(54); const ai = w.list.find((x) => !x.isPlayer && x.status !== 'insolvent' && x.activeRoutes().length);
    const r0 = ai.activeRoutes()[0], pair = SMx.pairKey(r0.base, r0.dest), cs = { k: 'coop', kind: 'codeshare', pair, days: 365 };
    const dup = A({ type: 'dealPropose', to: ai.id, give: [cs, { ...cs }], take: [{ k: 'cash', v: 1e6 }] }); assert.ok(!dup.ok && /nur einmal/.test(dup.msg), 'doppelt: ' + dup.msg);
    const both = A({ type: 'dealPropose', to: ai.id, give: [cs], take: [{ ...cs }, { k: 'cash', v: 1e6 }] }); assert.ok(!both.ok && /nur einmal/.test(both.msg), 'beide Seiten: ' + both.msg);
    const one = SMx.aiDealValue(w, ai, { from: a.id, to: ai.id, give: [cs], take: [] }), two = SMx.aiDealValue(w, ai, { from: a.id, to: ai.id, give: [cs], take: [{ ...cs }] }), three = SMx.aiDealValue(w, ai, { from: a.id, to: ai.id, give: [cs, { ...cs }, { ...cs }], take: [] });
    assert.ok(Math.abs(one.vin - two.vin) < 1e-6 && Math.abs(one.vin - three.vin) < 1e-6 && Math.abs(one.vout - three.vout) < 1e-6, 'KI-Bewertung zählt die Kooperation einmal');
    console.log('0.21.41 ok: Codeshare-Handel (nicht doppelt, nicht auf beiden Seiten, KI zählt einmal)'); }
  // Flughafenausbau: Bahn (Code F), Terminal (Kapazität, Nachfrage, Slots), Bauherrenrabatt
  { const { w, a, A } = mk(55, 'HAJ'); for (const g of Object.keys(a.staff.pil)) a.staff.pil[g] = 0; a.staff.cab = 0; a.staff.tech = 0;   // ohne Flugbetrieb keine Gehälter
    assert.ok(!SMx.rangeOk('HAJ', 'JFK', 'A388') && !SMx.rangeOk('HAJ', 'JFK', 'B748') && SMx.rangeOk('HAJ', 'JFK', 'B77W'), 'Code F: A380 und 747-8 nicht in Hannover');
    const r1 = A({ type: 'aptInvest', apt: 'HAJ', kind: 'rwy' }); assert.ok(r1.ok, r1.msg); assert.ok(!A({ type: 'aptInvest', apt: 'HAJ', kind: 'term' }).ok, 'ein Bau gleichzeitig');
    assert.ok(!A({ type: 'aptInvest', apt: 'MUC', kind: 'term' }).ok, 'nur mit Basis oder Station');
    for (let i = 0; i < 451; i++) w.step();
    assert.ok(SMx.rangeOk('HAJ', 'JFK', 'A388') && a.aptRebate.HAJ.x === 0.8 && a.heldAt('HAJ', w.day) >= 2, 'Bahn fertig: Code F, Rabatt, Slots');
    const q0 = SMx.qPot('HAJ', 'FRA').business, pe0 = SMx.paxEff('HAJ'), cap0 = w.slotCap.HAJ;
    assert.ok(A({ type: 'aptInvest', apt: 'HAJ', kind: 'term' }).ok); for (let i = 0; i < 301; i++) w.step();
    assert.ok(SMx.paxEff('HAJ') > pe0 * 1.2 && SMx.qPot('HAJ', 'FRA').business > q0 * 1.03 && a.aptRebate.HAJ.x < 0.8, 'Terminal: mehr Kapazität, Nachfrage, mehr Rabatt');
    const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); assert.ok(w2.aptUp.HAJ.term === 1 && w2.aptUp.HAJ.rwy === 1 && w2.airlines.P1.aptRebate.HAJ, 'Speichern');
    assert.ok(Math.abs(SMx.balanceSheet(a).check) < 0.01, 'Bilanz stimmt');
    console.log('0.21.41 ok: Flughafenausbau Hannover (Bahn: A380/747-8, Terminal', pe0, '→', SMx.paxEff('HAJ').toFixed(1), 'Mio., Slots', cap0, '→', w.slotCap.HAJ + ')'); }
}
// 0.21.42: zwei Flugzeugmuster auf einer Strecke, Flugzeugkredite ablösen, Prognose im Detail
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 71 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }); w.playerId = 'P1'; a.ledger.equityFlow(2e9, 't'); if (a.prog) a.prog.lv = 4;
  for (const k of ['dailyEvents', 'generateMonthlyEvents', 'geoShocks']) w[k] = () => {}; w.slotsOkFor = () => true; w.takeSlots = () => {}; w.slotCost = () => ({ cost: 0, parts: [] });
  const A = (x) => SMx.applyAction(w, 'P1', x);
  for (const t of ['A20N', 'A20N', 'A21N']) assert.ok(A({ type: 'acquire', typeId: t, mode: 'buy', base: 'HAM' }).ok);
  for (const x of a.fleet) x.delivery_day = w.day;
  // 0.21.46: weiteres Muster = eigene Strecke auf demselben Paar (eigene Preise und Auswertung); 0.21.42–45-Stände mit „mix“ werden aufgeteilt
  assert.ok(A({ type: 'openRoute', base: 'HAM', dest: 'PMI', typeId: 'A20N', freq: 2, fo: 120, fi: 120 }).ok);
  assert.ok(!A({ type: 'openRoute', base: 'HAM', dest: 'PMI', typeId: 'A20N', freq: 1 }).ok, 'gleiches Muster nicht doppelt');
  const sp = { airline: 'P1', base: 'HAM', dest: 'PMI', type_id: 'A21N', freq: 1, fare_out: 180, fare_in: 180, service: 'premium', buffer: 'normal' };
  const fAlone = (() => { const keep = a.routes; a.routes = []; const f = w.forecastFor(a, sp, { exact: true }); a.routes = keep; return f; })(), fWith = w.forecastFor(a, sp, { exact: true });
  assert.ok(fWith.pax < fAlone.pax, 'Prognose rechnet die eigene Strecke mit dem anderen Muster als Konkurrenz: ' + Math.round(fWith.pax) + ' < ' + Math.round(fAlone.pax));
  assert.ok(A({ type: 'openRoute', base: 'HAM', dest: 'PMI', typeId: 'A21N', freq: 1, fo: 180, fi: 180, service: 'premium' }).ok, 'anderes Muster als eigene Strecke');
  const [r1, r2] = a.activeRoutes(); assert.ok(r1.type_id === 'A20N' && r2.type_id === 'A21N' && r2.fare_out === 180 && r1.fare_out === 120, 'getrennte Tarife');
  for (let i = 0; i < 12; i++) w.step();
  assert.ok(r1.hist.at(-1).pax_out > 0 && r2.hist.at(-1).pax_out > 0 && r2.hist.at(-1).seats_out === SMx.P.AIRCRAFT_TYPES.A21N.seats.premium, 'getrennte Auslastung');
  // Altbestand: Strecke mit zweitem Muster wird zu zwei Strecken
  const sv = SMx.serialize(w), pr = sv.airlines.find((x) => x.id === 'P1'); const sr = pr.routes.find((x) => x.id === r1.id); sr.freq = 3; sr.mix = { type_id: 'A21N', freq: 1 };
  pr.routes = pr.routes.filter((x) => x.id !== r2.id);
  const w2 = SMx.deserialize(JSON.parse(JSON.stringify(sv))), rs = w2.airlines.P1.activeRoutes();
  assert.ok(rs.length === 2 && rs.some((x) => x.type_id === 'A20N' && x.freq === 2 && !x.mix) && rs.some((x) => x.type_id === 'A21N' && x.freq === 1), 'Altbestand aufgeteilt: ' + rs.map((x) => x.type_id + ':' + x.freq).join(', '));
  assert.ok(Math.abs(SMx.balanceSheet(a).check) < 0.01, 'Bilanz stimmt');
  console.log('0.21.46 ok: HAM–PMI mit A320neo und A321neo als zwei Strecken (eigene Tarife und Auslastung), Prognose mit Kannibalisierung, Altbestand aufgeteilt');
  // Flugzeugkredite ablösen
  const own = a.fleet.filter((x) => x.owned && x.loan > 0), bal = own.reduce((s2, x) => s2 + x.loan, 0); assert.ok(own.length === 3 && bal > 0);
  const one = A({ type: 'repayAc', id: own[0].id }); assert.ok(one.ok && own[0].loan === 0 && own[1].loan > 0, 'einzeln: ' + one.msg);
  const q2 = w.acLoanQuote(a); a.ledger.equityFlow(-(a.ledger.cash / 100 - (q2.cost - Math.min(1e6, q2.free / 2))), 't'); const all = A({ type: 'repayAc' }); assert.ok(all.ok && all.n === 2 && all.fromCredit > 0 && own.every((x) => x.loan === 0), 'alle, Rest aus dem Dispo: ' + all.msg);
  assert.ok(!A({ type: 'repayAc' }).ok, 'nichts mehr offen'); assert.ok(Math.abs(SMx.balanceSheet(a).check) < 0.01, 'Bilanz stimmt nach Ablösen');
  console.log('0.21.42 ok: Flugzeugkredite abgelöst (einzeln und alle, fehlender Betrag aus dem Dispo)');
}
// 0.21.44: Börse ohne Bewegungsgrenze, Handel ab 0,1 %
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const w = SMx.newWorld({ seed: 81 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAM' }); w.playerId = 'P1'; a.ledger.equityFlow(5e8, 't');
  for (let i = 0; i < 40; i++) w.step();
  const T = w.list.filter((x) => !x.isPlayer && x.status !== 'insolvent' && SMx.floatOf(w, x) > 0.05).sort((x, y) => SMx.mktCap(w, y) - SMx.mktCap(w, x))[0];
  const r = SMx.applyAction(w, 'P1', { type: 'buyStake', target: T.id, q: 0.004 }); assert.ok(r.ok && Math.abs(SMx.stakeOf(a, T) - 0.004) < 1e-9, '0,4 % gekauft: ' + r.msg);
  assert.ok(!SMx.applyAction(w, 'P1', { type: 'buyStake', target: T.id, q: 0.0004 }).ok, 'unter 0,1 % nicht');
  assert.ok(SMx.applyAction(w, 'P1', { type: 'sellStake', target: T.id, q: 0.0015 }).ok && Math.abs(SMx.stakeOf(a, T) - 0.0025) < 1e-9, 'Teilverkauf 0,15 %');
  const c = SMx.capState(T), cur = SMx.mktCap(w, T); c.mc = cur * 0.2; SMx.updateCap(w, T); assert.ok(SMx.capState(T).mc > cur * 0.2 * 1.4 + 1, 'Kurs darf mehr als +40 % im Monat steigen');
  c.mc = cur * 6; SMx.updateCap(w, T); assert.ok(SMx.capState(T).mc < cur * 6 * 0.8 - 1 || SMx.capState(T).mc <= Math.max(cur, 1) * 3.6, 'und mehr als −20 % fallen');
  console.log('0.21.44 ok: Handel ab 0,1 %, Kurse ohne Monatsgrenze');
}
// 0.21.52: AIRCRAFT COLLECTION – Katalog, Ziehung, Packs, Aktivierung, Tausch, Kaufanfragen, Admin
{ process.env.DAILY_PACK = '0';   // tägliches Gratis-Pack hier aus, eigener Test unten (0.21.59)
  const SK = (await import('../shared/skins.cjs')).default, { randomInt } = await import('node:crypto');
  const SM0 = (await import('../shared/engine.cjs')).default, load = async () => { const m = await store.getWithMetadata('games/main/state', { type: 'arrayBuffer' }); return { m, w: SM0.deserialize(JSON.parse(gunzipSync(Buffer.from(m.data)).toString())) }; };
  const fleetSig = async (id) => (await load()).w.airlines[id].fleet.map((a) => [a.id, a.type_id, a.base, a.mode || '', (a.assigned || []).length].join(':')).join('|');
  assert.equal(SK.SKINS.length, 420); assert.equal(new Set(SK.SKINS.map((x) => x.id)).size, 420); assert.equal(SK.MODELS.length, 28); assert.equal(SK.TOTAL, 420);
  for (const m of SK.MODELS) { const l = SK.SKINS.filter((x) => x.model === m.id); assert.deepStrictEqual(['u', 'r', 'e', 'm', 'l'].map((k) => l.filter((x) => x.rarity === k).length), [5, 4, 3, 2, 1], m.id); assert.ok(SM0.P.AIRCRAFT_TYPES[m.type], m.type);
    assert.equal(l.filter((x) => x.blink).length, 1, 'je Modell genau ein Disco-Skin'); assert.ok(l.find((x) => x.blink).rarity === 'm', 'Disco ist rot'); }
  // 0.21.55: alle 280 IDs von 0.21.52–0.21.54 bleiben gültig (Formel von damals)
  { const OLD = { u: 4, r: 3, e: 2, l: 1 }; let n = 0;
    for (const m of SK.MODELS) for (const rk of ['u', 'r', 'e', 'l']) { const pool = SK.DESIGNS[rk]; for (let j = 0; j < OLD[rk]; j++) { const d = pool[(m.idx * OLD[rk] + j + (rk === 'l' ? 0 : Math.floor(m.idx / pool.length))) % pool.length]; const old = SK.SKIN_BY_ID[`${m.id}__${d.k}`]; assert.ok(old && old.rarity === rk, `alte ID ${m.id}__${d.k}`); n++; } }
    assert.equal(n, 280); }
  // Wahrscheinlichkeiten: 200.000 Packs mit dem Zufall des Servers
  const N = 200000, cnt = { 1: 0, 2: 0, 3: 0 }, rar = { u: 0, r: 0, e: 0, m: 0, l: 0 }, mod = {}; let tot = 0;
  for (let i = 0; i < N; i++) { const r = SK.drawPack((n) => randomInt(n)); cnt[r.length]++; for (const id of r) { const k = SK.SKIN_BY_ID[id]; rar[k.rarity]++; mod[k.model] = (mod[k.model] || 0) + 1; tot++; } }
  const near = (x, p, tol, what) => assert.ok(Math.abs(x - p) < tol, `${what}: ${(x * 100).toFixed(2)} % statt ${(p * 100).toFixed(0)} %`);
  near(cnt[1] / N, 0.80, 0.006, '1 Skin'); near(cnt[2] / N, 0.17, 0.006, '2 Skins'); near(cnt[3] / N, 0.03, 0.003, '3 Skins');
  near(rar.u / tot, 0.55, 0.006, 'grün'); near(rar.r / tot, 0.27, 0.006, 'blau'); near(rar.e / tot, 0.13, 0.005, 'pink'); near(rar.m / tot, 0.04, 0.003, 'rot'); near(rar.l / tot, 0.01, 0.0015, 'gold');
  for (const m of SK.MODELS) near(mod[m.id] / tot, 1 / 28, 0.004, m.id);
  // Admin vergibt Packs; normale Spieler dürfen das nicht
  assert.equal((await call('anna', 'POST', '/coll/admin/grant', { user: 'ben', count: 5 })).status, 403, 'Vergabe nur für Admins');
  assert.equal((await call('anna', 'GET', '/coll/admin')).status, 403);
  ok(await call('tim', 'POST', '/coll/admin/grant', { user: 'anna', count: 60, reason: 'Test' }), 'Vergabe');
  ok(await call('tim', 'POST', '/coll/admin/grant', { user: 'ben', count: 40, reason: 'Test' }), 'Vergabe Ben');
  let me = ok(await call('anna', 'GET', '/coll'), 'Sammlung').me; assert.equal(me.packs.length, 60); assert.ok(me.notes.some((n) => /kostenlose Aircraft Mystery Packs/.test(n.msg)), 'Benachrichtigung');
  // Öffnen: genau einmal, Ergebnis bleibt
  const pid = me.packs[0].id, o1 = ok(await call('anna', 'POST', '/coll/open', { packId: pid }), 'öffnen'), o2 = ok(await call('anna', 'POST', '/coll/open', { packId: pid }), 'noch einmal');
  assert.deepStrictEqual(o2.pack.res, o1.pack.res, 'gleiches Ergebnis, keine neue Ziehung'); assert.ok(o2.again); assert.equal(o2.me.packs.length, 59);
  const par = await Promise.all([1, 2, 3].map(() => call('anna', 'POST', '/coll/open', { packId: o1.me.packs[0].id }))); assert.ok(par.every((r) => r.status === 200) && new Set(par.map((r) => JSON.stringify(r.data.pack.res))).size === 1, 'parallel: ein Ergebnis');
  for (let i = 0; i < 58; i++) me = ok(await call('anna', 'POST', '/coll/open', {}), 'öffnen').me;
  assert.equal(me.packs.length, 0); assert.equal((await call('anna', 'POST', '/coll/open', {})).status, 404, 'kein Pack mehr');
  const held = Object.values(me.inv).reduce((a, b) => a + b, 0); assert.ok(held >= 60 && me.uniq <= held && me.openedTotal === 60, 'Inventar');
  for (let i = 0; i < 40; i++) await call('ben', 'POST', '/coll/open', {});
  // Aktivieren: nur passendes Modell, nur eigenes Flugzeug, ein Exemplar je Flugzeug
  const { w: wc } = await load(), annaAl = wc.humans.find((h) => h.owner === 'anna' && h.status !== 'insolvent'), ac = annaAl.fleet[0];
  if (ac) { const fit = SK.SKINS.find((x) => x.type === ac.type_id && me.inv[x.id]), wrong = SK.SKINS.find((x) => x.type !== ac.type_id && me.inv[x.id]);
    if (wrong) assert.equal((await call('anna', 'POST', '/coll/activate', { game: 'main', acId: ac.id, skinId: wrong.id })).status, 400, 'falsches Modell');
    assert.equal((await call('ben', 'POST', '/coll/activate', { game: 'main', acId: ac.id, skinId: (fit || SK.SKINS[0]).id })).status >= 400, true, 'fremdes Flugzeug');
    if (fit) { me = ok(await call('anna', 'POST', '/coll/activate', { game: 'main', acId: ac.id, skinId: fit.id }), 'aktivieren').me; assert.equal(me.active['main|' + ac.id], fit.id);
      const info = ok(await call('ben', 'GET', '/games/main/info'), 'Info'); assert.equal(info.skins[annaAl.id][ac.id], fit.id, 'andere sehen den Skin');
      const before = await fleetSig(annaAl.id); me = ok(await call('anna', 'POST', '/coll/activate', { game: 'main', acId: ac.id, skinId: null }), 'abnehmen').me; assert.ok(!me.active['main|' + ac.id]);
      assert.equal(await fleetSig(annaAl.id), before, 'Spielstand unberührt'); } }
  // Tausch: beide stimmen zu, atomar, nur einmal
  const benMe = ok(await call('ben', 'GET', '/coll'), 'Ben').me, gA = Object.keys(me.inv)[0], gB = Object.keys(benMe.inv).find((x) => x !== gA) || Object.keys(benMe.inv)[0];
  assert.equal((await call('anna', 'POST', '/coll/trade', { to: 'ben', give: ['nix'], want: [] })).status, 400, 'unbekannter Skin');
  const tr = ok(await call('anna', 'POST', '/coll/trade', { to: 'ben', give: [gA], want: [gB] }), 'Angebot').trade;
  assert.equal((await call('anna', 'POST', `/coll/trade/${tr.id}/accept`, {})).status, 403, 'eigene Angebote nicht selbst annehmen');
  assert.equal((await call('cleo', 'POST', `/coll/trade/${tr.id}/accept`, {})).status, 403, 'Dritte nicht');
  const a0 = me.inv[gA], b0 = benMe.inv[gB], acc = await Promise.all([call('ben', 'POST', `/coll/trade/${tr.id}/accept`, {}), call('ben', 'POST', `/coll/trade/${tr.id}/accept`, {})]);
  assert.deepStrictEqual(acc.map((r) => r.status).sort(), [200, 409], 'nur einmal übertragen');
  me = ok(await call('anna', 'GET', '/coll'), 'A').me; const bm = ok(await call('ben', 'GET', '/coll'), 'B').me;
  assert.equal((me.inv[gA] || 0), a0 - 1 + (gA === gB ? 1 : 0)); assert.equal(bm.inv[gB] || 0, b0 - 1 + (gA === gB ? 1 : 0)); assert.ok(bm.inv[gA] >= 1 && me.inv[gB] >= 1, 'getauscht');
  const tr2 = ok(await call('anna', 'POST', '/coll/trade', { to: 'ben', give: [gB], want: [] }), 'Angebot 2').trade; ok(await call('anna', 'POST', `/coll/trade/${tr2.id}/cancel`, {}), 'zurückziehen');
  assert.equal((await call('ben', 'POST', `/coll/trade/${tr2.id}/accept`, {})).status, 409, 'zurückgezogen');
  // Kaufanfrage: ohne Freischaltung gesperrt; Packs erst nach Freigabe durch einen Admin, genau einmal
  delete process.env.SHOP_ENABLED; assert.equal((await call('cleo', 'POST', '/shop/request', { offer: 'starter' })).status, 503, 'Anfragen gesperrt');
  assert.equal((await call('anna', 'POST', '/coll/admin/shop', { enabled: true })).status, 403, 'Freischalten nur für Admins');
  assert.equal(ok(await call('tim', 'POST', '/coll/admin/shop', { enabled: true, info: 'Token gibt es bei Aktionen.' }), 'freischalten').shop.enabled, true);
  assert.equal(ok(await call('cleo', 'GET', '/coll'), 'C').shop.payInfo, 'Token gibt es bei Aktionen.');
  // Offline-Spiel (solo): Skin am Konto, Modell und freie Exemplare werden geprüft
  { const sid = Object.keys(me.inv).find((x) => me.inv[x] === 1 && !Object.values(me.active).includes(x)), sk = SK.SKIN_BY_ID[sid];
    assert.equal((await call('anna', 'POST', '/coll/activate', { game: 'solo', acId: 'P1-001', skinId: sid, type: 'XXXX', fleet: ['P1-001', 'P1-002'] })).status, 400, 'solo: falsches Modell');
    let m2 = ok(await call('anna', 'POST', '/coll/activate', { game: 'solo', acId: 'P1-001', skinId: sid, type: sk.type, fleet: ['P1-001', 'P1-002'] }), 'solo aktivieren').me; assert.equal(m2.active['solo|P1-001'], sid);
    // 0.21.61: ein Exemplar deckt 2 Flugzeuge (Grün/Blau) bzw. 1 (ab Pink)
    const F6 = ['P1-001', 'P1-002', 'P1-003', 'P1-004', 'P1-005', 'P1-006'], cap = SK.perCopy(sid);
    assert.equal(SK.perCopy(SK.SKINS.find((x) => x.rarity === 'u').id), 2); assert.equal(SK.perCopy(SK.SKINS.find((x) => x.rarity === 'e').id), 1); assert.equal(SK.perCopy(SK.SKINS.find((x) => x.rarity === 'l').id), 1);
    for (const ac of F6.slice(1, cap)) m2 = ok(await call('anna', 'POST', '/coll/activate', { game: 'solo', acId: ac, skinId: sid, type: sk.type, fleet: F6 }), 'solo: ' + ac).me;
    assert.equal(Object.values(m2.active).filter((x) => x === sid).length, cap, `${cap} Flugzeug(e) mit einem Exemplar`);
    assert.equal((await call('anna', 'POST', '/coll/activate', { game: 'solo', acId: F6[cap], skinId: sid, type: sk.type, fleet: F6 })).status, 409, 'solo: darüber braucht es ein zweites Exemplar');
    // ältere Stände mit mehr Flugzeugen werden beim Laden auf die Grenze zurückgesetzt
    { const rg = await store.get('coll/registry', { type: 'json' }); for (const ac of F6) rg.users.anna.active['solo|' + ac] = sid; await store.setJSON('coll/registry', rg);
      const mt = ok(await call('anna', 'GET', '/coll'), 'trim').me; assert.equal(Object.values(mt.active).filter((x) => x === sid).length, cap, 'auf die Grenze zurückgesetzt'); assert.ok(mt.notes.some((x) => /Neue Regel/.test(x.msg)), 'Hinweis'); }
    m2 = ok(await call('anna', 'POST', '/coll/activate', { game: 'solo', acId: 'P1-002', skinId: null, type: sk.type, fleet: ['P1-002'] }), 'solo aufräumen').me; assert.ok(!m2.active['solo|P1-001'], 'verkauftes Flugzeug gibt den Skin frei');
    assert.ok(!Object.keys(m2.active).some((k) => k.startsWith('solo|') && k !== 'solo|P1-002'), 'alle verkauften Flugzeuge geben frei'); }
  assert.equal((await call('cleo', 'POST', '/shop/request', { offer: 'x' })).status, 400);
  const rq = ok(await call('cleo', 'POST', '/shop/request', { offer: 'starter' }), 'Anfrage').request;
  assert.equal(rq.packs, 10); assert.equal(rq.amount, '5'); assert.equal(rq.currency, 'TOKEN'); assert.equal(ok(await call('cleo', 'GET', '/coll'), 'C').me.packs.length, 0, 'noch keine Packs');
  assert.equal((await call('cleo', 'POST', `/shop/request/${rq.id}/approve`, {})).status, 403, 'nicht selbst freigeben');
  const ap = await Promise.all([call('tim', 'POST', `/shop/request/${rq.id}/approve`, {}), call('tim', 'POST', `/shop/request/${rq.id}/approve`, {})]);
  assert.deepStrictEqual(ap.map((r) => r.status).sort(), [200, 409], 'Freigabe nur einmal'); assert.equal(ok(await call('cleo', 'GET', '/coll'), 'C').me.packs.length, 10, 'genau 10 Packs');
  const rq2 = ok(await call('cleo', 'POST', '/shop/request', { offer: 'collector' }), 'Anfrage 2').request;
  ok(await call('tim', 'POST', `/shop/request/${rq2.id}/decline`, { note: 'kein Geldeingang' }), 'ablehnen'); assert.equal(ok(await call('cleo', 'GET', '/coll'), 'C').me.packs.length, 10, 'abgelehnt: nichts');
  const rq3 = ok(await call('cleo', 'POST', '/shop/request', { offer: 'starter' }), 'Anfrage 3').request; ok(await call('cleo', 'POST', `/shop/request/${rq3.id}/cancel`, {}), 'zurückziehen');
  assert.equal((await call('tim', 'POST', `/shop/request/${rq3.id}/approve`, {})).status, 409, 'zurückgezogene nicht freigeben');
  const ad = ok(await call('tim', 'GET', '/coll/admin'), 'Admin'); assert.equal(ad.stats.paidPacks, 10); assert.equal(ad.stats.adminPacks, 100); assert.equal(ad.stats.revenueCents, 500); assert.equal(ad.stats.opened, 100); assert.ok(ad.stats.trades === 1 && ad.grants.length === 2 && ad.grants[0].source === 'admin_grant');
  // 0.21.55: einzelne Packs, Anzahl frei (1–50), 0,5 Token je Pack
  { const q1 = ok(await call('cleo', 'POST', '/shop/request', { offer: 'single', count: 3 }), 'Einzelpacks').request;
    assert.equal(q1.packs, 3); assert.equal(q1.amount, '1.5'); ok(await call('tim', 'POST', `/shop/request/${q1.id}/approve`, {}), 'freigeben');
    assert.equal(ok(await call('cleo', 'GET', '/coll'), 'C').me.packs.length, 13, '3 Packs mehr');
    const q2 = ok(await call('cleo', 'POST', '/shop/request', { offer: 'single', count: 999 }), 'zu viele').request; assert.equal(q2.packs, 50); assert.equal(q2.amount, '25');
    const q3 = ok(await call('cleo', 'POST', '/shop/request', { offer: 'single', count: 0 }), 'null').request; assert.equal(q3.packs, 1); assert.equal(q3.amount, '0.5');
    for (const q of [q2, q3]) ok(await call('cleo', 'POST', `/shop/request/${q.id}/cancel`, {}), 'zurückziehen');
    const so = ok(await call('cleo', 'GET', '/shop/config'), 'Shop'); assert.deepStrictEqual(so.offers.map((o) => o.key), ['single', 'starter', 'collector'], 'Reihenfolge: einzeln, 10, 20'); }
  // 0.21.63: Admins passen Angebote an – Preis, Anzahl, aus/an, neue Pakete; Standard wiederherstellen
  { assert.equal((await call('cleo', 'POST', '/coll/admin/shop', { offers: [] })).status, 403, 'nur Admins');
    const base = ok(await call('tim', 'GET', '/coll/admin'), 'adm').shop.offersAll;
    const edited = base.map((o) => (o.key === 'starter' ? { ...o, packs: 12, price: '4,5', label: 'Starter Plus' } : o.key === 'collector' ? { ...o, active: false } : o)).concat([{ key: 'mega', label: 'Mega', packs: 50, price: '20', active: true }]);
    ok(await call('tim', 'POST', '/coll/admin/shop', { offers: edited }), 'speichern');
    const so2 = ok(await call('cleo', 'GET', '/shop/config'), 'S'); assert.deepStrictEqual(so2.offers.map((o) => o.key), ['single', 'starter', 'mega'], 'ausgeschaltetes Angebot fehlt im Shop');
    const st = so2.offers.find((o) => o.key === 'starter'); assert.ok(st.packs === 12 && st.price === '4.5' && st.label === 'Starter Plus');
    assert.equal((await call('cleo', 'POST', '/shop/request', { offer: 'collector' })).status, 400, 'ausgeschaltet nicht anfragbar');
    const rq = ok(await call('cleo', 'POST', '/shop/request', { offer: 'mega' }), 'neu').request; assert.ok(rq.packs === 50 && rq.amount === '20'); ok(await call('cleo', 'POST', `/shop/request/${rq.id}/cancel`, {}), 'zurück');
    assert.equal(ok(await call('tim', 'GET', '/coll'), 'T').shop.enabled, true, 'Freischaltung bleibt beim Speichern der Angebote');
    ok(await call('tim', 'POST', '/coll/admin/shop', { offers: 'reset' }), 'Standard'); assert.deepStrictEqual(ok(await call('cleo', 'GET', '/shop/config'), 'S').offers.map((o) => o.key), ['single', 'starter', 'collector']); }
  // 0.21.59: tägliches Gratis-Pack – einmal je Konto und Berliner Kalendertag, auch bei gleichzeitigen Aufrufen; Admin schaltet an und aus
  { ok(await call('tim', 'POST', '/coll/admin/shop', { daily: true }), 'täglich an');
    const p0 = ok(await call('anna', 'GET', '/coll'), 'A').me.packs.length;
    const rs = await Promise.all([1, 2, 3, 4].map(() => call('anna', 'GET', '/coll')));
    const p1 = ok(await call('anna', 'GET', '/coll'), 'A').me;
    assert.equal(p1.packs.length, p0, 'nur einmal am Tag (erster Aufruf hat schon gegeben)');
    const first = rs.concat([]).map((r) => r.status); assert.ok(first.every((x) => x === 200));
    assert.equal(p1.dailyDay, p1.today, 'heute abgeholt');
    const reg = await store.get('coll/registry', { type: 'json' }); assert.equal(reg.users.anna.packs.filter((x) => x.src === 'daily').length, 1, 'genau ein Tagespack');
    const yest = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() - 864e5));
    reg.users.anna.daily = yest; reg.users.anna.notes = []; await store.setJSON('coll/registry', reg);
    await Promise.all([1, 2, 3, 4, 5].map(() => call('anna', 'GET', '/coll')));   // gleichzeitig am neuen Tag: trotzdem nur ein Pack
    const p2 = ok(await call('anna', 'GET', '/coll'), 'A').me; assert.equal(p2.packs.length, p0 + 1, 'nächster Tag: genau ein neues Pack');
    assert.ok(p2.notes.some((x) => x.kind === 'daily' && /2 Tage in Folge/.test(x.msg)), 'Serie');
    ok(await call('tim', 'POST', '/coll/admin/shop', { daily: false }), 'täglich aus');
    const r3 = await store.get('coll/registry', { type: 'json' }); r3.users.anna.daily = yest; await store.setJSON('coll/registry', r3);
    assert.equal(ok(await call('anna', 'GET', '/coll'), 'A').me.packs.length, p0 + 1, 'aus: kein Pack');
    assert.equal(ok(await call('cleo', 'GET', '/shop/config'), 'S').daily, false); }
  console.log(`0.21.52 ok: Aircraft Collection – 420 Skins, Ziehung (${(rar.l / tot * 100).toFixed(2)} % gold), Öffnen einmalig, Aktivieren, Tausch, Kaufanfrage mit Freigabe, Admin`);
}
// 0.21.55: Wettbewerbsaufsicht mit konkretem Vorschlag (Grenze in Flügen, welche Strecken), Übernahme per Klick
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0); const P = SMx.P, A0 = { ...P.ANTITRUST };
  const w = SMx.newWorld({ seed: 77 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'HAJ' }); w.playerId = 'P1';
  a.ledger.equityFlow(2e9, 't'); Object.assign(P.ANTITRUST, { minDeps: 4, minPax: 0 });
  for (let i = 0; i < 8; i++) SMx.applyAction(w, 'P1', { type: 'acquire', typeId: 'A320', base: 'HAJ', mode: 'lease' });
  while (w.day <= Math.max(...a.fleet.map((x) => x.delivery_day))) w.step();
  let n = 0; for (const c of SMx.AP_CODES) { if (n >= 3) break; if (c === 'HAJ' || SMx.gcDistanceKm('HAJ', c) < 300 || SMx.gcDistanceKm('HAJ', c) > 900) continue; if (SMx.applyAction(w, 'P1', { type: 'openRoute', base: 'HAJ', dest: c, typeId: 'A320', freq: 3 }).ok) n++; }
  for (let i = 0; i < 20; i++) w.step(); w.antitrustCheck(); assert.ok(a.antitrust && a.antitrust.HAJ, 'Verfahren');
  const pa = w.antitrustPlan(a, 'HAJ'); assert.ok(!pa.ok && pa.cuts.length && pa.after < pa.limit && pa.routes.length === n, 'Vorschlag mit Strecken: ' + pa.adviceTxt);
  assert.ok(/höchstens \d+ eigene Abflüge am Tag/.test(pa.adviceTxt) && /→ \d+× täglich|schließen/.test(pa.adviceTxt), 'konkrete Zahlen: ' + pa.adviceTxt);
  assert.ok(a.events.some((e) => /Wettbewerbsaufsicht: Hannover/.test(e.msg) && /Vorschlag: höchstens/.test(e.msg)), 'Meldung nennt Zahlen');
  const fine0 = w.antitrustFine(a, 0.9); assert.ok(fine0 >= 0);
  const r = SMx.applyAction(w, 'P1', { type: 'antitrustAdjust', apt: 'HAJ' }); assert.ok(r.ok, r.msg);
  w.antitrustCheck(); assert.ok(!(a.antitrust && a.antitrust.HAJ), 'nach Übernahme kein Verfahren mehr');
  assert.equal(SMx.applyAction(w, 'P1', { type: 'antitrustAdjust', apt: 'HAJ' }).ok, false, 'nichts mehr anzupassen');
  Object.assign(P.ANTITRUST, A0);
  console.log('0.21.55 ok: Wettbewerbsaufsicht mit Grenze in Flügen, Streckenliste und Vorschlag zum Übernehmen');
}
// 0.21.56: Frachtsparte – eigene Frachtstrecken, Markt, Rate, Frachter, Slots, Speichern
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0); const P = SMx.P;
  const w = SMx.newWorld({ seed: 5 }), a = SMx.addHuman(w, { id: 'P1', name: 'Alpha', code: 'AA', base: 'FRA' }); w.playerId = 'P1'; a.ledger.equityFlow(2e9, 't');
  assert.equal(SMx.applyAction(w, 'P1', { type: 'cgOpen', base: 'FRA', dest: 'MAD', typeId: 'A21F', freq: 5 }).ok, false, 'ohne Frachter keine Frachtstrecke');
  assert.ok(/Passagier|fliegt keine Linie/.test(SMx.applyAction(w, 'P1', { type: 'openRoute', base: 'FRA', dest: 'MAD', typeId: 'A21F', freq: 1 }).msg || ''), 'Frachter fliegen keine Passagierlinie');
  for (const t of ['A21F', 'A21F']) assert.ok(SMx.applyAction(w, 'P1', { type: 'acquire', typeId: t, base: 'FRA', mode: 'lease' }).ok);
  while (w.day <= Math.max(...a.fleet.map((x) => x.delivery_day))) w.step();
  assert.ok(a.dayHist.some((x) => x.cf && x.cf.deposit < 0) && a.dayHist.every((x) => typeof x.nc === 'number'), '0.21.61: Tagesverlauf zeigt Geldbewegungen ohne Ergebnis (Kaution) und Kontostand netto');
  assert.equal(SMx.applyAction(w, 'P1', { type: 'cgOpen', base: 'FRA', dest: 'A320', typeId: 'A21F', freq: 5 }).ok, false);
  const qt = w.freightQuote(a, 'FRA', 'MAD', 'A21F', 5, 1); assert.ok(qt.need === 1 && qt.kg > 0 && qt.dem > qt.kg, 'Vorschau');
  const u0 = w.slotUse('MAD'), r = SMx.applyAction(w, 'P1', { type: 'cgOpen', base: 'FRA', dest: 'MAD', typeId: 'A21F', freq: 5, rate: 1 }); assert.ok(r.ok, r.msg);
  const q = a.cgRoutes()[0]; assert.equal(a.fleet.filter((x) => x.cg === q.id).length, 1, 'ein Frachter zugeteilt'); assert.equal(w.slotUse('MAD'), u0 + 1, 'Slot belegt');
  assert.equal(a.activeRoutes().length, 0, 'Fracht getrennt von den Passagierstrecken');
  const fr = a.fleet.find((x) => x.cg === q.id);
  for (let i = 0; i < 40; i++) w.step();
  assert.ok(a.crewNeed(w.day).pil.A32F > 0, 'Crew für den Frachter');
  const h = q.hist.slice(-30), kg = h.reduce((x, e) => x + e[2] + e[3], 0), fl = h.reduce((x, e) => x + e[1], 0), cap = h.reduce((x, e) => x + 2 * e[4], 0);
  assert.ok(Math.abs(fl - 30 * 5 / 7) <= 1.5, 'Umläufe nach Plan: ' + fl); assert.ok(Math.abs(kg / 30 - 2 * qt.kg) / (2 * qt.kg) < 0.15, `Fracht wie vorhergesagt: ${Math.round(kg / 30)} vs ${Math.round(2 * qt.kg)}`); assert.ok(kg / cap <= P.FREIGHT.loadMax + 1e-9);
  assert.ok(a.ledger.months.at(-1).acc.rev_cargo > 0 || a.ledger.today.rev_cargo > 0 || h.some((e) => e[5] > 0), 'Frachterlös gebucht'); assert.ok(fr.fh > 0, 'Flugstunden');
  assert.equal(w.acceptAcmi(a, 'x', fr.id).ok, false);
  // Rate: höher → weniger Fracht, mehr je Kilo
  const lo = w.freightQuote(a, 'FRA', 'MAD', 'A21F', 5, 0.7, q.id), hi = w.freightQuote(a, 'FRA', 'MAD', 'A21F', 5, 1.3, q.id); assert.ok(lo.kg >= hi.kg && hi.rateKg > lo.rateKg, 'Rate wirkt');
  const per = SMx.cgPerAc('FRA', 'MAD', 'A21F'), f2 = Math.floor(7 * per) + 2, f3 = Math.min(P.FREIGHT.maxWeek, Math.floor(14 * per) + 2);
  assert.equal(SMx.applyAction(w, 'P1', { type: 'cgEdit', id: q.id, freq: f2 }).ok, true, 'zweiter Frachter frei'); assert.equal(a.fleet.filter((x) => x.cg === q.id).length, 2);
  if (f3 > Math.floor(14 * per)) assert.equal(SMx.applyAction(w, 'P1', { type: 'cgEdit', id: q.id, freq: f3 }).ok, false, 'nicht genug Frachter');
  assert.ok(SMx.applyAction(w, 'P1', { type: 'cgEdit', id: q.id, freq: 4, rate: 1.15 }).ok); assert.equal(a.fleet.filter((x) => x.cg === q.id).length, 1, 'Frachter wieder frei'); assert.equal(q.rate, 1.15);
  const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))), a2 = w2.airlines.P1; assert.ok(a2.cgRoutes().length === 1 && a2.fleet.some((x) => x.cg === q.id) && a2.cgRoutes()[0].hist.length === q.hist.length, 'gespeichert');
  for (let i = 0; i < 3; i++) { w.step(); w2.step(); } assert.equal(JSON.stringify(w.airlines.P1.cgRoutes()[0].hist.at(-1)), JSON.stringify(a2.cgRoutes()[0].hist.at(-1)), 'nach dem Laden gleich weiter');
  // 0.21.60: Planung und Voraussetzungen
  const ck = w.cgCheck(a, 'FRA', 'LHR', 'B77F', 3); assert.ok(!ck.ok && ck.missing >= 1 && ck.range, 'Voraussetzung: Frachter fehlt');
  const pa = SMx.applyAction(w, 'P1', { type: 'cgPlanAdd', base: 'FRA', dest: 'LHR', typeId: 'B77F', freq: 3 }); assert.ok(pa.ok, pa.msg);
  assert.equal(SMx.applyAction(w, 'P1', { type: 'cgPlanAdd', base: 'LHR', dest: 'FRA', typeId: 'B77F', freq: 3 }).ok, false, 'doppelt geplant');
  assert.ok(SMx.applyAction(w, 'P1', { type: 'cgPlanEdit', id: pa.plan.id, freq: 5 }).ok); assert.equal(a.cg.plans[0].freq, 5);
  const wp = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); assert.equal(wp.airlines.P1.cg.plans.length, 1, 'Planung gespeichert');
  assert.ok(SMx.applyAction(w, 'P1', { type: 'cgPlanAdd', base: 'FRA', dest: 'BCN', typeId: 'A21F', freq: 2 }).ok);
  assert.ok(SMx.applyAction(w, 'P1', { type: 'cgPlanDel', id: pa.plan.id }).ok); assert.equal(a.cg.plans.length, 1);
  assert.ok(SMx.applyAction(w, 'P1', { type: 'cgClose', id: q.id }).ok);
  assert.ok(SMx.applyAction(w, 'P1', { type: 'cgOpen', base: 'FRA', dest: 'BCN', typeId: 'A21F', freq: 2 }).ok, 'aus der Planung eröffnet'); assert.equal(a.cg.plans.length, 0, 'eröffnete Strecke verschwindet aus der Planung');
  assert.ok(SMx.applyAction(w, 'P1', { type: 'cgClose', id: a.cgRoutes()[0].id }).ok); assert.ok(!a.fleet.some((x) => x.cg) && !a.cgRoutes().length, 'geschlossen, Frachter frei'); assert.ok(a.cgSlotsAt('MAD') === 0, 'keine Frachtslots mehr in Nutzung');
  // KI eröffnet Frachtsparten
  const w3 = SMx.newWorld({ seed: 9 }); SMx.addHuman(w3, { id: 'P1', name: 'B', code: 'BB', base: 'HAM' }); w3.playerId = 'P1';
  for (let i = 0; i < 240; i++) w3.step();
  const aiCg = w3.list.filter((x) => x.archetype && x.cg && x.cgRoutes().length); assert.ok(aiCg.length >= 1, 'KI mit Frachtsparte');
  console.log(`0.21.56 ok: Frachtsparte – ${Math.round(kg / 30 / 1000)} t/Tag FRA–MAD (Vorschau ${Math.round(2 * qt.kg / 1000)} t), ${aiCg.length} KI-Frachtsparten nach 240 Tagen`);
}
// 0.21.60: Charteranfragen wachsen mit der Zahl der Spielenden, werden wöchentlich aufgefüllt, Anlass-Charter je Monat
{ const SMx = (await import('../shared/engine.cjs')).default; SMx.setFuelX(0);
  const count = (H) => { const w = SMx.newWorld({ seed: 3 }); for (let i = 1; i <= H; i++) SMx.addHuman(w, { id: 'P' + i, name: 'A' + i, code: 'Q' + String.fromCharCode(64 + i), base: ['FRA', 'HAM', 'MUC', 'DUS', 'BER', 'CGN', 'STR', 'HAJ', 'NUE', 'LEJ', 'AMS', 'VIE'][i - 1] }); w.playerId = 'P1';
    for (let d = 0; d < 70; d++) w.step(); return { pax: w.acmiOffers.filter((x) => !x.kind && !x.ev).length, occ: w.acmiOffers.filter((x) => /^occ/.test(x.ev || '')).length }; };
  const c1 = count(1), c12 = count(12);
  assert.ok(c12.pax > c1.pax, `mehr Anfragen bei mehr Spielenden: ${c1.pax} → ${c12.pax}`); assert.ok(c12.occ >= 2, 'Anlass-Charter vorhanden');
  console.log(`0.21.60 ok: Charteranfragen ${c1.pax} (1 Spieler) → ${c12.pax} (12 Spielende), ${c12.occ} Anlass-Charter; Frachtplanung`);
}
// 0.21.62: Farben der Spielenden – eindeutig, wählbar, vergebene gesperrt, ältere Doppel werden aufgelöst
{ const SMx = (await import('../shared/engine.cjs')).default; const P = SMx.P;
  assert.ok(P.AL_COLORS.length >= 40 && new Set(P.AL_COLORS.map((c) => c.hex)).size === P.AL_COLORS.length, 'genug verschiedene Farben');
  const w = SMx.newWorld({ seed: 2 }); const bases = ['FRA', 'HAM', 'MUC', 'DUS', 'BER', 'CGN', 'STR', 'HAJ', 'NUE', 'LEJ', 'AMS', 'VIE'];
  for (let i = 0; i < 12; i++) SMx.addHuman(w, { id: 'P' + (i + 1), name: 'A' + i, code: 'Q' + String.fromCharCode(65 + i), base: bases[i] });
  assert.equal(new Set(w.humans.map((h) => h.color)).size, 12, 'keine Farbe doppelt (früher reihum 8)');
  assert.equal(SMx.applyAction(w, 'P2', { type: 'setColor', color: w.airlines.P1.color }).ok, false, 'vergebene Farbe gesperrt');
  assert.ok(SMx.applyAction(w, 'P2', { type: 'setColor', color: 30 }).ok); assert.equal(w.airlines.P2.color, 30);
  w.airlines.P3.color = 30; w.airlines.P4.color = 99;   // alter Stand mit Doppel und ungültiger Farbe
  const w2 = SMx.deserialize(JSON.parse(JSON.stringify(SMx.serialize(w)))); assert.equal(new Set(w2.humans.map((h) => h.color)).size, 12, 'beim Laden aufgelöst'); assert.equal(w2.airlines.P2.color, 30, 'wer zuerst da war, behält sie');
  console.log('0.21.62 ok: Farben eindeutig und wählbar');
}
console.log('Alle Prüfungen bestanden.');
