// AIRCRAFT COLLECTION – Server: Inventar, Mystery Packs, Aktivierung auf Flugzeugen, Tausch, Admin-Vergabe, Pack-Anfragen.
// Speicher (Netlify Blobs):
//   coll/registry        alle Sammlungen, offene/abgeschlossene Tauschangebote, Gutschriften je Bestellung, Statistik (ein Blob → Änderungen atomar per ETag)
//   coll/hist/<user>     Archiv aller geöffneten Packs (Ergebnisse), coll/grants Protokoll der Admin-Vergaben
//   shop/requests        Pack-Anfragen (Packs gibt erst ein Admin frei), shop/log Protokoll
// Zufall: ausschließlich crypto.randomInt. Ergebnisse werden gespeichert, bevor der Browser die Animation zeigt.
import { randomInt, randomUUID } from 'node:crypto';
import SKINS from '../shared/skins.cjs';

const KEY = { reg: 'coll/registry', hist: (u) => `coll/hist/${u}`, grants: 'coll/grants', reqs: 'shop/requests', log: 'shop/log', cfg: 'shop/config' };
const HIST_KEEP = 40, NOTES_KEEP = 30, TRADES_KEEP = 300, MAX_PACKS_GRANT = 100, MAX_OPEN_REQ = 3;
const env = (k) => (typeof process !== 'undefined' && process.env ? process.env[k] : undefined) || '';

async function updateJson(store, key, fn, init = null, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const cur = await store.getWithMetadata(key, { type: 'json' });
    const base = cur ? cur.data : init;
    const next = fn(base === null ? null : structuredClone(base));
    if (next === undefined) return { value: base, changed: false };
    const res = cur ? await store.setJSON(key, next, { onlyIfMatch: cur.etag }) : await store.setJSON(key, next, { onlyIfNew: true });
    if (res.modified !== false) return { value: next, changed: true };
  }
  throw Object.assign(new Error('Gerade viel Betrieb, bitte noch einmal versuchen.'), { status: 409 });
}
const emptyReg = () => ({ v: 1, users: {}, trades: {}, credited: {}, stats: { paidPacks: 0, adminPacks: 0, opened: 0, skinsOut: 0, rarity: { u: 0, r: 0, e: 0, m: 0, l: 0 }, trades: 0, revenueCents: 0, donationCents: 0, donations: 0, orders: 0 }, seq: 0 });
const userOf = (reg, key, name) => { const u = reg.users[key] || (reg.users[key] = { name: name || key, inv: {}, packs: [], opened: [], active: {}, notes: [], ms: [], openedTotal: 0 }); if (name) u.name = name; return u; };
const uniqOf = (u) => Object.values(u.inv).filter((n) => n > 0).length;
const activeCount = (u, skinId) => Object.values(u.active).filter((s) => s === skinId).length;
const reservedOf = (reg, key, skinId, except = null) => Object.values(reg.trades).filter((t) => t.status === 'open' && t.from === key && t.id !== except).reduce((s, t) => s + t.give.filter((x) => x === skinId).length, 0);
// 0.21.61: ein Exemplar deckt SKINS.perCopy(skin) Flugzeuge (Grün/Blau 2, ab Pink 1). freeOf = frei für Tausch (Exemplare ohne aktives Flugzeug), slotsOf = weitere Flugzeuge, die noch gehen.
const freeOf = (reg, key, skinId, except = null) => { const u = reg.users[key]; if (!u) return 0; return (u.inv[skinId] || 0) - Math.ceil(activeCount(u, skinId) / SKINS.perCopy(skinId)) - reservedOf(reg, key, skinId, except); };
const slotsOf = (reg, key, skinId) => { const u = reg.users[key]; if (!u) return 0; return ((u.inv[skinId] || 0) - reservedOf(reg, key, skinId)) * SKINS.perCopy(skinId) - activeCount(u, skinId); };
const note = (u, msg, kind = 'info') => { u.notes.push({ id: randomUUID().slice(0, 8), t: Date.now(), msg, kind }); if (u.notes.length > NOTES_KEEP) u.notes = u.notes.slice(-NOTES_KEEP); };
function milestones(u) {
  const n = uniqOf(u);
  for (const m of SKINS.MILESTONES) if (n >= m.n && !u.ms.includes(m.key)) { u.ms.push(m.key); note(u, `Meilenstein erreicht: ${n} verschiedene Skins – ${m.label}.`, 'good'); }
}
const count = (arr) => arr.reduce((o, x) => ((o[x] = (o[x] || 0) + 1), o), {});
async function logPay(store, e) { try { await updateJson(store, KEY.log, (l) => { l = l || []; l.push({ t: Date.now(), ...e }); return l.slice(-5000); }, [], 4); } catch (x) { console.error('Zahlungsprotokoll', x); } }

/** Shop-Einstellungen. Spieler fragen Packs an (Angebote in Token), die Spielleitung gibt sie von Hand frei. */
/** 0.21.63: Angebote – Standard aus dem Katalog, von Admins anpassbar (Blob shop/config, Feld offers). */
const defaultOffers = () => Object.values(SKINS.OFFERS).map((o) => ({ ...o, active: true }));
function cleanOffers(list) {
  if (!Array.isArray(list)) return null;
  const out = [], keys = new Set(); let single = false;
  for (const x of list.slice(0, 12)) {
    const perPack = !!x.perPack; if (perPack && single) continue;
    const key = perPack ? 'single' : String(x.key || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || `p${out.length + 1}`;
    if (keys.has(key)) continue;
    const price = Math.round(Math.max(0, Math.min(100000, Number(String(x.price).replace(',', '.')) || 0)) * 100) / 100;
    const o = { key, label: String(x.label || (perPack ? 'Einzelne Packs' : 'Paket')).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 30) || 'Paket', packs: perPack ? 1 : Math.max(1, Math.min(200, Math.floor(Number(x.packs) || 1))), price: String(price), currency: 'TOKEN', active: x.active !== false };
    if (perPack) { o.perPack = true; o.max = Math.max(1, Math.min(200, Math.floor(Number(x.max) || 50))); single = true; }
    keys.add(key); out.push(o);
  }
  return out.length ? out : null;
}
const offersOf = (c) => (c && Array.isArray(c.offers) && c.offers.length ? c.offers : defaultOffers());
export async function shopConfig(store) {
  // Freischaltung und Hinweistext pflegen Admins im Spiel (Blob shop/config); die Umgebungsvariablen gelten nur, solange dort nichts gespeichert ist
  const c = (await store.get(KEY.cfg, { type: 'json' })) || null;
  return { enabled: c ? !!c.enabled : env('SHOP_ENABLED') === '1', daily: c ? c.daily !== false : env('DAILY_PACK') !== '0', offers: offersOf(c).filter((o) => o.active !== false), offersAll: offersOf(c), payInfo: c ? c.info || '' : env('SHOP_REQUEST_INFO') || '',
    odds: { count: SKINS.PACK_COUNT_ODDS, rarity: SKINS.RARITY_ORDER.map((k) => [k, SKINS.RARITIES[k].odds]), models: SKINS.MODELS.length } };
}
/** 0.21.59: Kalendertag in Deutschland (Wechsel um Mitternacht Berliner Zeit). */
export const berlinDay = (t = Date.now()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
function meView(reg, key) {
  const u = reg.users[key] || { inv: {}, packs: [], opened: [], active: {}, notes: [], ms: [], openedTotal: 0 };
  const reserved = {}; for (const t of Object.values(reg.trades)) if (t.status === 'open' && t.from === key) for (const s of t.give) reserved[s] = (reserved[s] || 0) + 1;
  return { inv: u.inv, packs: u.packs, opened: u.opened, active: u.active, notes: u.notes, ms: u.ms, openedTotal: u.openedTotal || 0, uniq: uniqOf(u), total: SKINS.TOTAL, reserved, dailyDay: u.daily || null, today: berlinDay() };
}
function tradeView(t, reg) { return { ...t, fromName: (reg.users[t.from] || {}).name || t.from, toName: (reg.users[t.to] || {}).name || t.to }; }

/** Aktive Skins und Sammler-Auszeichnungen für ein Spiel (für /games/<id>/info): { skins: { airlineId: { acId: skinId } }, badges: { userKey: [..] } } */
export async function collForGame(store, gameId, players) {
  const reg = (await store.get(KEY.reg, { type: 'json' })) || null; if (!reg) return { skins: {}, badges: {} };
  const skins = {}, badges = {};
  for (const p of players) {
    const u = reg.users[p.u]; if (!u) continue;
    if (u.ms && u.ms.length) badges[p.u] = u.ms;
    for (const [k, s] of Object.entries(u.active)) { const [g, ac] = k.split('|'); if (g === gameId && p.airlineId && ac.startsWith(p.airlineId + '-')) (skins[p.airlineId] = skins[p.airlineId] || {})[ac] = s; }
  }
  return { skins, badges };
}

/** Packs gutschreiben (Anfrage oder Admin). Gutschrift je Bestellung höchstens einmal (credited). */
function addPacks(u, n, src, ref) { for (let i = 0; i < n; i++) u.packs.push({ id: randomUUID(), src, at: Date.now(), ref }); }
/** Pack-Anfrage freigeben: Packs gutschreiben – je Anfrage höchstens einmal (credited). */
async function creditRequest(store, rq, admin) {
  const r = await updateJson(store, KEY.reg, (reg) => {
    reg = reg || emptyReg();
    if (reg.credited[rq.id]) return undefined;
    reg.credited[rq.id] = { at: Date.now(), by: admin.key, kind: 'request' };
    const u = userOf(reg, rq.user, rq.userName);
    addPacks(u, rq.packs, 'purchase', rq.id); reg.stats.paidPacks += rq.packs; reg.stats.revenueCents += Math.round(Number(rq.amount) * 100); reg.stats.orders++;
    note(u, `Anfrage ${rq.id} freigegeben: ${rq.packs} Aircraft Mystery Packs liegen in Ihrem Inventar.`, 'good');
    return reg;
  }, null);
  return r.changed;
}
export async function handleCollection(req, ctx) {
  const { store, url, path, method, user, json, fail, readJson, isAdmin, loadMeta, loadGameView } = ctx;

  if (!(path.startsWith('/coll') || path.startsWith('/shop'))) return null;
  if (!user) return fail(401, 'Bitte zuerst anmelden.');
  const me = user.key;

  // ---- Übersicht ----
  if (path === '/coll' && method === 'GET') {
    let reg = (await store.get(KEY.reg, { type: 'json' })) || emptyReg();
    const shop = await shopConfig(store), today = berlinDay();
    // 0.21.59: tägliches Gratis-Pack – beim ersten Laden der Sammlung an einem Kalendertag (einmal je Konto und Tag, atomar)
    // 0.21.61: strengere Grenze je Exemplar – was darüber hinaus aktiv ist, wird zurückgesetzt (Standardlackierung)
    const over = (u) => u && Object.values(u.active).some((sid) => activeCount(u, sid) > (u.inv[sid] || 0) * SKINS.perCopy(sid));
    if (over(reg.users[me])) {
      const r0 = await updateJson(store, KEY.reg, (cur) => {
        if (!cur || !over(cur.users[me])) return undefined; const u = cur.users[me], cut = {};
        for (const k of Object.keys(u.active).sort()) { const sid = u.active[k], cap = (u.inv[sid] || 0) * SKINS.perCopy(sid); cut[sid] = (cut[sid] || 0) + 1; if (cut[sid] > cap) { delete u.active[k]; (cut['_' + sid] = (cut['_' + sid] || 0) + 1); } }
        const names = Object.keys(cut).filter((k) => k.startsWith('_')).map((k) => `${(SKINS.SKIN_BY_ID[k.slice(1)] || {}).name || k.slice(1)} (${cut[k]}×)`);
        note(u, `Neue Regel: Ein Exemplar gilt für höchstens 2 Flugzeuge, ab Pink für eins. Zurückgesetzt: ${names.join(', ')}.`, 'warn');
        return cur;
      }, null);
      if (r0 && r0.value) reg = r0.value;
    }
    const fs0 = ctx.fairState ? await ctx.fairState() : null, packBan = !!(fs0 && fs0.pack && fs0.pack.until > Date.now());   // 0.21.75: Pack-Sperre (Fair Play)
    if (shop.daily && !packBan && (!reg.users[me] || reg.users[me].daily !== today)) {
      const r = await updateJson(store, KEY.reg, (cur) => {
        cur = cur || emptyReg(); const u = userOf(cur, me, user.name);
        if (u.daily === today) return undefined;
        const streak = u.daily && u.daily === berlinDay(Date.now() - 864e5) ? (u.streak || 1) + 1 : 1;
        u.daily = today; u.streak = streak; addPacks(u, 1, 'daily', today);
        cur.stats.dailyPacks = (cur.stats.dailyPacks || 0) + 1;
        note(u, `Tägliches Gratis-Pack: Ein Aircraft Mystery Pack liegt für Sie bereit${streak > 1 ? ` (${streak} Tage in Folge)` : ''}.`, 'daily');
        return cur;
      }, null);
      if (r && r.value) reg = r.value; else reg = (await store.get(KEY.reg, { type: 'json' })) || reg;
    }
    return json({ me: meView(reg, me), shop, admin: isAdmin(user) });
  }
  if (path === '/coll/notes/read' && method === 'POST') {
    const b = await readJson(req), ids = new Set(Array.isArray(b.ids) ? b.ids.map(String) : []);
    await updateJson(store, KEY.reg, (reg) => { if (!reg || !reg.users[me]) return undefined; const u = reg.users[me], n0 = u.notes.length; u.notes = u.notes.filter((x) => !ids.has(x.id)); return u.notes.length === n0 ? undefined : reg; }, null);
    return json({ ok: true });
  }
  // ---- Pack öffnen: Ziehung auf dem Server, Ergebnis wird gespeichert, bevor der Browser es zeigt ----
  if (path === '/coll/open' && method === 'POST') {
    const b = await readJson(req), want = b.packId ? String(b.packId) : null;
    let result = null;
    const r = await updateJson(store, KEY.reg, (reg) => {
      reg = reg || emptyReg(); const u = userOf(reg, me, user.name);
      if (want) { const done = u.opened.find((p) => p.id === want); if (done) { result = { pack: done, again: true }; return undefined; } }   // schon geöffnet: gespeichertes Ergebnis, keine neue Ziehung
      const i = want ? u.packs.findIndex((p) => p.id === want) : 0;
      if (i < 0 || !u.packs[i]) { result = { none: true }; return undefined; }
      const p = u.packs.splice(i, 1)[0], before = new Set(Object.keys(u.inv).filter((k) => u.inv[k] > 0));
      const res = SKINS.drawPack((n) => randomInt(n));
      for (const s of res) { u.inv[s] = (u.inv[s] || 0) + 1; { const rk = SKINS.SKIN_BY_ID[s].rarity; reg.stats.rarity[rk] = (reg.stats.rarity[rk] || 0) + 1; } }
      const done = { id: p.id, src: p.src, at: p.at, op: Date.now(), res, fresh: res.map((s, k) => !before.has(s) && res.indexOf(s) === k) };
      u.opened.unshift(done); if (u.opened.length > HIST_KEEP) u.opened.length = HIST_KEEP;
      u.openedTotal = (u.openedTotal || 0) + 1; reg.stats.opened++; reg.stats.skinsOut += res.length;
      milestones(u);
      result = { pack: done };
      return reg;
    }, null);
    if (result && result.none) return fail(404, 'Kein ungeöffnetes Pack vorhanden.');
    if (r.changed) { try { await updateJson(store, KEY.hist(me), (l) => { l = l || []; l.push(result.pack); return l.slice(-1000); }, [], 4); } catch (e) { /* Archiv nicht kritisch – Ergebnis steht in der Sammlung */ } }
    return json({ ok: true, ...result, me: meView(r.value, me) });
  }
  // ---- Skin auf einem eigenen Flugzeug aktivieren (Darstellung; Spielwerte bleiben unberührt) ----
  if ((path === '/coll/activate' || path === '/coll/prune') && method === 'POST') {
    const b = await readJson(req), game = String(b.game || '').slice(0, 40);
    let fleet;
    if (game === 'solo') {   // Offline-Spiel: Der Spielstand liegt nur im Browser. Flugzeug und Muster meldet der Browser; geprüft werden Skin, Modell und freie Exemplare.
      const ids = (Array.isArray(b.fleet) ? b.fleet : []).map(String).slice(0, 2000), t = String(b.type || '');
      fleet = new Map(ids.map((x) => [x, null])); if (b.acId) fleet.set(String(b.acId), t);
    } else {
      const meta = game ? await loadMeta(store, game) : null, pm = meta && meta.players.find((p) => p.u === me);
      if (!pm || !pm.airlineId) return fail(403, 'Sie spielen in diesem Spiel nicht mit.');
      const view = await loadGameView(game), al = view && (view.airlines || []).find((a) => a.id === pm.airlineId);
      if (!al) return fail(404, 'Ihre Airline wurde im Spielstand nicht gefunden.');
      fleet = new Map((al.fleet || []).map((a) => [a.id, a.type_id]));
    }
    if (path === '/coll/prune') {
      const r = await updateJson(store, KEY.reg, (reg) => { if (!reg || !reg.users[me]) return undefined; const u = reg.users[me]; let ch = false; for (const k of Object.keys(u.active)) { const [g, ac] = k.split('|'); if (g === game && !fleet.has(ac)) { delete u.active[k]; ch = true; } } return ch ? reg : undefined; }, null);
      return json({ ok: true, me: meView(r.value || emptyReg(), me) });
    }
    const acId = String(b.acId || ''), skinId = b.skinId ? String(b.skinId) : null;
    if (!fleet.has(acId)) return fail(404, 'Dieses Flugzeug gehört nicht zu Ihrer Flotte.');
    if (skinId) { const s = SKINS.SKIN_BY_ID[skinId]; if (!s) return fail(400, 'Unbekannter Skin.'); if (s.type !== fleet.get(acId)) return fail(400, `${s.name} passt nur auf die ${SKINS.MODEL_BY_ID[s.model].name}.`); }
    let err = null;
    const r = await updateJson(store, KEY.reg, (reg) => {
      reg = reg || emptyReg(); const u = userOf(reg, me, user.name), k = `${game}|${acId}`;
      let pruned = false;
      for (const kk of Object.keys(u.active)) { const [g, ac] = kk.split('|'); if (g === game && !fleet.has(ac)) { delete u.active[kk]; pruned = true; } }   // verkaufte Flugzeuge geben ihre Skins frei
      if (!skinId) { if (!u.active[k]) return pruned ? reg : undefined; delete u.active[k]; return reg; }
      if (u.active[k] === skinId) return pruned ? reg : undefined;
      const prev = u.active[k]; delete u.active[k];
      if (slotsOf(reg, me, skinId) < 1) { err = `Ein Exemplar reicht für ${SKINS.perCopy(skinId) === 1 ? 'ein Flugzeug' : `${SKINS.perCopy(skinId)} Flugzeuge`} – alle Exemplare dieses Skins sind schon voll belegt oder in einem Tauschangebot.`; if (prev) u.active[k] = prev; return undefined; }
      u.active[k] = skinId; return reg;
    }, null);
    if (err) return fail(409, err);
    return json({ ok: true, me: meView(r.value || emptyReg(), me) });
  }
  // ---- Spieler suchen und Sammlungen ansehen (für den Tausch) ----
  if (path === '/coll/players' && method === 'GET') {
    const q = String(url.searchParams.get('q') || '').toLowerCase().slice(0, 20);
    const list = await store.list({ prefix: 'users/' });
    const keys = list.blobs.map((x) => x.key.slice(6)).filter((k) => k !== me && (!q || k.includes(q))).slice(0, 30);
    const reg = (await store.get(KEY.reg, { type: 'json' })) || emptyReg();
    const rows = await Promise.all(keys.map(async (k) => { const u = await store.get(`users/${k}`, { type: 'json' }); return u ? { key: k, name: u.name, uniq: reg.users[k] ? uniqOf(reg.users[k]) : 0 } : null; }));
    return json({ players: rows.filter(Boolean).sort((a, b) => b.uniq - a.uniq || a.name.localeCompare(b.name)) });
  }
  if (parts(path)[0] === 'coll' && parts(path)[1] === 'user' && method === 'GET') {
    const k = String(parts(path)[2] || '').toLowerCase();
    const reg = (await store.get(KEY.reg, { type: 'json' })) || emptyReg(), u = reg.users[k];
    if (!u) return json({ key: k, name: k, free: {} });
    const free = {}; for (const s of Object.keys(u.inv)) { const f = freeOf(reg, k, s); if (f > 0) free[s] = f; }
    return json({ key: k, name: u.name, free, uniq: uniqOf(u), ms: u.ms });
  }
  // ---- Tausch ----
  if (path === '/coll/trades' && method === 'GET') {
    const reg = (await store.get(KEY.reg, { type: 'json' })) || emptyReg();
    const mine = Object.values(reg.trades).filter((t) => t.from === me || t.to === me).sort((a, b) => b.created - a.created).slice(0, 60).map((t) => tradeView(t, reg));
    return json({ trades: mine });
  }
  if (path === '/coll/trade' && method === 'POST') {
    const b = await readJson(req), to = String(b.to || '').toLowerCase();
    const give = (Array.isArray(b.give) ? b.give : []).map(String).slice(0, 20), want = (Array.isArray(b.want) ? b.want : []).map(String).slice(0, 20);
    if (!to || to === me) return fail(400, 'Bitte einen anderen Spieler wählen.');
    if (!give.length && !want.length) return fail(400, 'Das Angebot ist leer.');
    if ([...give, ...want].some((s) => !SKINS.SKIN_BY_ID[s] || !SKINS.SKIN_BY_ID[s].isTradable)) return fail(400, 'Unbekannter oder nicht tauschbarer Skin.');
    if (!(await store.get(`users/${to}`, { type: 'json' }))) return fail(404, 'Diesen Spieler gibt es nicht.');
    let err = null, made = null;
    await updateJson(store, KEY.reg, (reg) => {
      reg = reg || emptyReg(); userOf(reg, me, user.name); userOf(reg, to);
      for (const [s, n] of Object.entries(count(give))) if (freeOf(reg, me, s) < n) { err = `Sie haben nicht genug freie Exemplare von ${SKINS.SKIN_BY_ID[s].name} (${SKINS.MODEL_BY_ID[SKINS.SKIN_BY_ID[s].model].name}).`; return undefined; }
      for (const [s, n] of Object.entries(count(want))) if (freeOf(reg, to, s) < n) { err = `${reg.users[to].name} hat nicht genug freie Exemplare von ${SKINS.SKIN_BY_ID[s].name}.`; return undefined; }
      if (Object.values(reg.trades).filter((t) => t.status === 'open' && t.from === me).length >= 20) { err = 'Höchstens 20 offene Angebote gleichzeitig.'; return undefined; }
      made = { id: randomUUID().slice(0, 12), from: me, to, give, want, status: 'open', created: Date.now() };
      reg.trades[made.id] = made;
      note(reg.users[to], `${user.name} bietet Ihnen einen Skin-Tausch an.`, 'info');
      return reg;
    }, null);
    if (err) return fail(409, err);
    return json({ ok: true, trade: made });
  }
  { const p = parts(path);
    if (p[0] === 'coll' && p[1] === 'trade' && p[2] && ['accept', 'decline', 'cancel'].includes(p[3]) && method === 'POST') {
      const id = p[2], act = p[3]; let err = null, out = null;
      const r = await updateJson(store, KEY.reg, (reg) => {
        reg = reg || emptyReg(); const t = reg.trades[id];
        if (!t) { err = [404, 'Angebot nicht gefunden.']; return undefined; }
        if (t.status !== 'open') { err = [409, t.status === 'done' ? 'Dieser Tausch ist bereits abgeschlossen.' : 'Dieses Angebot ist nicht mehr offen.']; return undefined; }
        if (act === 'cancel' && t.from !== me) { err = [403, 'Nur wer das Angebot gemacht hat, kann es zurückziehen.']; return undefined; }
        if ((act === 'accept' || act === 'decline') && t.to !== me) { err = [403, 'Nur die angesprochene Person kann annehmen oder ablehnen.']; return undefined; }
        const A = userOf(reg, t.from), B = userOf(reg, t.to);
        if (act === 'accept') {
          // Bei Annahme alles erneut prüfen – in derselben atomaren Änderung, in der übertragen wird
          for (const [s, n] of Object.entries(count(t.give))) if (freeOf(reg, t.from, s, t.id) < n) { err = [409, `${A.name} besitzt die angebotenen Skins nicht mehr frei – das Angebot ist hinfällig.`]; t.status = 'void'; t.closed = Date.now(); return reg; }
          for (const [s, n] of Object.entries(count(t.want))) if (freeOf(reg, t.to, s) < n) { err = [409, 'Sie besitzen die gewünschten Skins nicht (mehr) frei – auf Flugzeugen aktiv oder in einem anderen Angebot.']; return undefined; }
          for (const s of t.give) { A.inv[s]--; B.inv[s] = (B.inv[s] || 0) + 1; }
          for (const s of t.want) { B.inv[s]--; A.inv[s] = (A.inv[s] || 0) + 1; }
          for (const U of [A, B]) for (const s of Object.keys(U.inv)) if (U.inv[s] <= 0) delete U.inv[s];
          t.status = 'done'; t.closed = Date.now(); reg.stats.trades++;
          milestones(A); milestones(B);
          note(A, `${B.name} hat Ihren Tausch angenommen.`, 'good');
        } else if (act === 'decline') { t.status = 'declined'; t.closed = Date.now(); note(A, `${B.name} hat Ihr Tauschangebot abgelehnt.`, 'info'); }
        else { t.status = 'cancelled'; t.closed = Date.now(); }
        // alte abgeschlossene Angebote ausdünnen
        const closed = Object.values(reg.trades).filter((x) => x.status !== 'open').sort((a, b) => b.closed - a.closed);
        for (const x of closed.slice(TRADES_KEEP)) delete reg.trades[x.id];
        out = t; return reg;
      }, null);
      if (err) return fail(err[0], err[1]);
      return json({ ok: true, trade: tradeView(out, r.value), me: meView(r.value, me) });
    }
  }
  // ---- Admin: kostenlose Packs, Protokoll, Statistik ----
  if (path === '/coll/admin' && method === 'GET') {
    if (!isAdmin(user)) return fail(403, 'Nur für Admins.');
    const [reg, grants, log, reqs] = await Promise.all([store.get(KEY.reg, { type: 'json' }), store.get(KEY.grants, { type: 'json' }), store.get(KEY.log, { type: 'json' }), store.get(KEY.reqs, { type: 'json' })]);
    const R = reg || emptyReg(), owners = Object.values(R.users);
    const uniqAll = new Set(owners.flatMap((u) => Object.keys(u.inv).filter((s) => u.inv[s] > 0))).size;
    return json({ stats: { ...R.stats, collectors: owners.filter((u) => uniqOf(u) > 0).length, uniqAll, skinsHeld: owners.reduce((s, u) => s + Object.values(u.inv).reduce((a, b) => a + b, 0), 0), unopened: owners.reduce((s, u) => s + u.packs.length, 0) },
      grants: (grants || []).slice(-200).reverse(), payments: (log || []).slice(-200).reverse(), shop: await shopConfig(store),
      requests: (reqs || []).filter((x) => x.status === 'open').concat((reqs || []).filter((x) => x.status !== 'open').slice(-60).reverse()) });
  }
  if (path === '/coll/admin/shop' && method === 'POST') {   // Anfragen für alle freischalten oder sperren, Hinweistext setzen
    if (!isAdmin(user)) return fail(403, 'Nur für Admins.');
    const b = await readJson(req);
    const prev = (await store.get(KEY.cfg, { type: 'json' })) || null;
    const offers = b.offers === undefined || b.offers === null ? (prev && prev.offers) || null : b.offers === 'reset' ? null : cleanOffers(b.offers);
    if (b.offers && b.offers !== 'reset' && !offers) return fail(400, 'Mindestens ein gültiges Angebot nötig.');
    const daily = b.daily === undefined || b.daily === null ? (prev ? prev.daily !== false : env('DAILY_PACK') !== '0') : !!b.daily;
    const enabled = b.enabled === undefined || b.enabled === null ? (prev ? !!prev.enabled : env('SHOP_ENABLED') === '1') : !!b.enabled;
    const info = b.info === undefined || b.info === null ? (prev ? prev.info || '' : '') : String(b.info).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 600);
    await store.setJSON(KEY.cfg, { enabled, daily, info, ...(offers ? { offers } : {}), by: user.key, at: Date.now() });
    return json({ ok: true, shop: await shopConfig(store) });
  }
  if (path === '/coll/admin/grant' && method === 'POST') {
    if (!isAdmin(user)) return fail(403, 'Nur für Admins.');
    const b = await readJson(req), to = String(b.user || '').trim().toLowerCase(), n = Math.floor(Number(b.count)), reason = String(b.reason || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
    if (!(n >= 1 && n <= MAX_PACKS_GRANT)) return fail(400, `Anzahl 1 bis ${MAX_PACKS_GRANT}.`);
    const target = to ? await store.get(`users/${to}`, { type: 'json' }) : null;
    if (!target) return fail(404, 'Diesen Spieler gibt es nicht.');
    const g = { id: randomUUID().slice(0, 12), t: Date.now(), admin: user.key, adminName: user.name, user: target.key, userName: target.name, count: n, reason, source: 'admin_grant' };
    await updateJson(store, KEY.reg, (reg) => {
      reg = reg || emptyReg(); const u = userOf(reg, target.key, target.name);
      addPacks(u, n, 'admin_grant', g.id); reg.stats.adminPacks += n;
      note(u, n === 1 ? 'Sie haben ein kostenloses Aircraft Mystery Pack erhalten!' : `Sie haben ${n} kostenlose Aircraft Mystery Packs erhalten!`, 'good');
      return reg;
    }, null);
    await updateJson(store, KEY.grants, (l) => { l = l || []; l.push(g); return l.slice(-2000); }, [], 6);
    return json({ ok: true, grant: g });
  }
  // ---- Shop: Pack-Anfragen (Freigabe durch die Spielleitung) ----
  if (path === '/shop/config' && method === 'GET') return json(await shopConfig(store));
  if (path === '/shop/request' && method === 'POST') {
    const sc = await shopConfig(store); if (!sc.enabled) return fail(503, 'Anfragen sind noch nicht freigeschaltet.');
    { const fs1 = ctx.fairState ? await ctx.fairState() : null; if (fs1 && fs1.pack && fs1.pack.until > Date.now()) return fail(403, `Die Luftfahrtaufsicht hat Pack-Anfragen für Ihr Konto bis ${new Date(fs1.pack.until).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr gesperrt.`); }
    const b = await readJson(req), cfg = (await store.get(KEY.cfg, { type: 'json' })) || null, of = offersOf(cfg).find((o) => o.key === String(b.offer || '') && o.active !== false);
    if (!of) return fail(400, 'Unbekanntes Angebot.');
    let made = null, err = null;
    await updateJson(store, KEY.reqs, (list) => {
      list = list || [];
      if (list.filter((x) => x.user === me && x.status === 'open').length >= MAX_OPEN_REQ) { err = `Höchstens ${MAX_OPEN_REQ} offene Anfragen gleichzeitig.`; return undefined; }
      // 0.21.55: einzelne Packs – Anzahl 1 bis max, Preis je Pack
      const n = of.perPack ? Math.max(1, Math.min(of.max || 50, Math.floor(Number(b.count) || 1))) : of.packs;
      const amount = of.perPack ? String(Math.round(n * Number(of.price) * 100) / 100) : of.price;
      made = { id: randomUUID().slice(0, 8).toUpperCase(), user: me, userName: user.name, offer: of.key, label: of.perPack ? `${n} ${n === 1 ? 'Pack' : 'Packs'}` : of.label, packs: n, amount, currency: of.currency, status: 'open', created: Date.now() };
      list.push(made); return list.slice(-3000);
    }, [], 8);
    if (err) return fail(409, err);
    await logPay(store, { kind: 'request', oid: made.id, user: me, amount: made.amount, currency: made.currency, what: `${made.packs} Packs` });
    return json({ ok: true, request: made, payInfo: sc.payInfo });
  }
  if (path === '/shop/requests' && method === 'GET') {
    const list = (await store.get(KEY.reqs, { type: 'json' })) || [];
    return json({ requests: list.filter((x) => x.user === me).slice(-20).reverse(), payInfo: (await shopConfig(store)).payInfo });
  }
  { const p = parts(path);
    if (p[0] === 'shop' && p[1] === 'request' && p[2] && ['cancel', 'approve', 'decline'].includes(p[3]) && method === 'POST') {
      const id = p[2], act = p[3], admin = isAdmin(user);
      if (act !== 'cancel' && !admin) return fail(403, 'Nur für Admins.');
      const b = await readJson(req); let err = null, rq = null;
      await updateJson(store, KEY.reqs, (list) => {
        list = list || []; const x = list.find((y) => y.id === id);
        if (!x) { err = [404, 'Anfrage nicht gefunden.']; return undefined; }
        if (act === 'cancel' && x.user !== me) { err = [403, 'Das ist nicht Ihre Anfrage.']; return undefined; }
        if (x.status !== 'open') { err = [409, `Diese Anfrage ist bereits ${({ approved: 'freigegeben', declined: 'abgelehnt', cancelled: 'zurückgezogen' })[x.status] || 'erledigt'}.`]; return undefined; }
        x.status = act === 'approve' ? 'approved' : act === 'decline' ? 'declined' : 'cancelled'; x.closed = Date.now(); x.by = user.key;
        if (act !== 'cancel' && b.note) x.note = String(b.note).replace(/[\u0000-\u001f]/g, ' ').slice(0, 200);
        rq = { ...x }; return list;
      }, [], 8);
      if (err) return fail(err[0], err[1]);
      if (act === 'approve') await creditRequest(store, rq, user);
      if (act === 'decline') await updateJson(store, KEY.reg, (reg) => { reg = reg || emptyReg(); note(userOf(reg, rq.user, rq.userName), `Ihre Anfrage ${rq.id} wurde abgelehnt${rq.note ? `: ${rq.note}` : '.'}`, 'warn'); return reg; }, null);
      await logPay(store, { kind: act, oid: id, user: rq.user, by: user.key, amount: rq.amount, currency: rq.currency, what: `${rq.packs} Packs` });
      return json({ ok: true, request: rq });
    }
  }
  return fail(404, 'Unbekannte Anfrage.');
}
const parts = (p) => p.split('/').filter(Boolean);
export const _test = { updateJson, KEY, emptyReg };
