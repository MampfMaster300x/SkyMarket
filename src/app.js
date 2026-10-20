(() => {
'use strict';
const P = SM.P, MAP = window.SKYMAP;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svgNS = 'http://www.w3.org/2000/svg';

let W = null;                       // Spielwelt
const ui = { tab: 'cockpit', speedKey: 'p', lastSpeed: null, t: 0.25, expanded: null, planner: null, selApt: null, showAi: true, acqBase: null,
  lastSaveDay: null, saveMode: 'lokal', confirm: null, routesSig: '', newsSeen: 0, gameOverShown: false, hedge: { share: 0.5, months: 6 },
  loan: { amount: 2e6, years: 5 }, decisionsSeen: 0, flightFilter: 'all', lastSub: {}, bubbleQ: [], hintSeen: {} };

// ---------------------------------------------------------------------------
// Formatierung
// ---------------------------------------------------------------------------
const nf = (d = 0) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const NF0 = nf(0), NF1 = nf(1), NF2 = nf(2), NF3 = nf(3);
function eur(x, opts = {}) {
  if (x === null || x === undefined || Number.isNaN(x)) return '–';
  const a = Math.abs(x), sign = x < 0 ? '−' : (opts.plus && x > 0 ? '+' : '');
  if (a >= 1e6) return `${sign}${NF2.format(a / 1e6)} Mio. €`;
  if (a >= 1e4 && opts.k) return `${sign}${NF0.format(a / 1e3)} Tsd. €`;
  return `${sign}${NF0.format(a)} €`;
}
const pct = (x, d = 0) => (x === null || !isFinite(x) ? '–' : `${(d ? NF1 : NF0).format(x * 100)} %`);
const n0 = (x) => NF0.format(x);
/** Gewinn grün, Verlust rot, null neutral. */
/** Kontostand wie bei der Bank: genutzte Kreditlinie (Dispo) zählt als Minus. */
const netCash = (al) => al.ledger.cash / 100 - (al.creditUsed || 0);
const netHistOf = (al) => (al.netHist && al.netHist.length ? al.netHist : al.ledger.cashHist);
/** Für Sie nutzbare Slots: frei am Markt plus Ihre eigene Slot-Reserve. */
const slotsMine = (apt) => W.slotsFreeFor(W.player, apt);
const slotTxt = (apt) => { const f = Math.max(0, W.slotsFree(apt)), h = W.player.heldAt(apt, W.day); return h ? `${f + h} (${h} aus Ihrer Reserve)` : String(f); };
const sgn = (x) => (x > 0 ? 'pos' : x < 0 ? 'neg' : '');
const n1 = (x) => NF1.format(x);
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTHS_L = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function dateParts(day) {
  const y = 2027 + Math.floor(day / 365), doy = ((day % 365) + 365) % 365, m = SM.monthOf(doy);
  return { y, m, d: doy - SM.MONTH_STARTS[m] + 1, wd: WD[((day % 7) + 7) % 7] };
}
const dateShort = (day) => { const p = dateParts(day); return `${p.d}. ${MONTHS[p.m]}`; };
const dateY = (day) => { const p = dateParts(day); return `${p.d}. ${MONTHS[p.m]} ${p.y}`; };
const dateLong = (day) => { const p = dateParts(day); return `${p.wd}, ${p.d}. ${MONTHS[p.m]} ${p.y}`; };
const apName = (c) => P.AIRPORTS[c].name;
const colorOf = (al) => (al.id === W.playerId ? 'var(--accent)' : al.archetype ? `var(--ai${al.color})` : `var(--hum${al.color || 1})`);
const svcLabel = (s) => P.SERVICE[s].label;
const bufLabel = (b) => P.BUFFER_POLICY[b].label;
const modeLabel = (a) => (a.owned ? 'Eigentum' : a.flex ? 'Flex-Leasing' : 'Leasing');
const cpi = () => W.macro.cpi;
const tl = (id) => (P.AIRCRAFT_TYPES[id] ? P.AIRCRAFT_TYPES[id].label : id);
/** Klickbarer Mustername: öffnet das Datenblatt. */
const tlx = (id) => `<span class="acl" role="button" tabindex="0" data-acinfo="${id}" title="Datenblatt ${esc(tl(id))}">${esc(tl(id))}</span>`;   // span statt button: steht auch in Knöpfen
const acName = (id) => (W.playerId && id.startsWith(W.playerId + '-') ? (W.player.code || 'SM') + id.slice(W.playerId.length) : id);
const LEVEL = ['', 'Junior', 'Senior', 'Experte', 'Spitzenklasse'];
const byRegion = (codes) => SM.REGION_ORDER.map((r) => [r, codes.filter((c) => P.AIRPORTS[c].region === r).sort((x, y) => apName(x).localeCompare(apName(y), 'de'))]).filter(([, l]) => l.length);

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 3600);
}

// ---------------------------------------------------------------------------
// Speichern: Cloud (pro Person, privat) mit Rückfall auf den Browser
// ---------------------------------------------------------------------------
const store = { db: null, uid: null };
const storeReady = (async () => {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    store.db = db; store.uid = uid; ui.saveMode = 'Cloud';
  } catch (e) { /* bleibt lokal */ }
})();
async function pack(obj) {
  const json = JSON.stringify(obj);
  try {
    if (typeof CompressionStream !== 'undefined') {
      const cs = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
      const buf = new Uint8Array(await new Response(cs).arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      return { z: btoa(bin) };
    }
  } catch (e) { /* unkomprimiert */ }
  return { raw: json };
}
async function unpack(doc) {
  if (doc.raw) return JSON.parse(doc.raw);
  const bin = atob(doc.z), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(ds).text());
}
const LS_KEY = 'skymarket-save-v1';
let saving = false;
async function saveGame(manual = false) {
  if (!W || saving) return;
  saving = true;
  try {
    let body = await pack(SM.serialize(W));
    if ((body.z || body.raw).length > 240000) body = await pack(SM.serialize(W, { compact: true }));
    const meta = { v: 4, day: W.day, name: W.player.name, savedAt: new Date().toISOString(), speed: ui.speedKey === 'p' ? (ui.lastSpeed || 'p') : ui.speedKey, running: ui.speedKey !== 'p', t: ui.t, cash: W.player.ledger.cash / 100 };
    let where = null;
    await storeReady;
    if (store.db) {
      try { await store.db.doc(`data/users/${store.uid}/save`).set({ ...meta, ...body }); where = 'Cloud'; }
      catch (e) { if (manual && e && e.code === 'quota_exceeded') toast('Cloud-Speicher ist voll. Gespeichert wird im Browser.'); }
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...meta, ...body })); where = where || 'Browser'; } catch (e) { /* privat */ }
    ui.lastSaveDay = W.day; ui.saveMode = where || ui.saveMode;
    if (manual) toast(where ? `Gespeichert (${where}) · ${dateLong(W.day)}` : 'Speichern ist in dieser Ansicht nicht möglich.');
    renderHeader();
  } finally { saving = false; }
}
async function findSave() {
  await storeReady;
  let best = null;
  if (store.db) {
    try { const s = await store.db.doc(`data/users/${store.uid}/save`).get(); if (s.exists) best = { ...s.data(), where: 'Cloud' }; } catch (e) { /* weiter */ }
  }
  try {
    const l = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (l && (!best || (l.savedAt > best.savedAt))) best = { ...l, where: 'Browser' };
  } catch (e) { /* keiner */ }
  return best;
}

// ---------------------------------------------------------------------------
// Karte
// ---------------------------------------------------------------------------
// Weltkarte in Mercator. Land, Grenzen und Strecken liegen in Kartenkoordinaten in einer skalierten Gruppe;
// Flughäfen und Flugzeuge werden in Bildschirmkoordinaten gezeichnet, damit sie beim Zoomen gleich groß bleiben.
const RAD = Math.PI / 180;
function proj(lat, lon) { return [MAP.W / 2 + MAP.S * lon * RAD, MAP.TY - MAP.S * Math.log(Math.tan(Math.PI / 4 + lat * RAD / 2))]; }
const _pt = {};
const pt = (c) => _pt[c] || (_pt[c] = proj(P.AIRPORTS[c].lat, P.AIRPORTS[c].lon));
const view = { k: 1, tx: 0, ty: 0, w: 1000, h: 700 };
const toScreen = (x, y) => [x * view.k + view.tx, y * view.k + view.ty];
const wrapX = (x) => ((x % MAP.W) + MAP.W) % MAP.W;
// Großkreis als Polylinie (x fortlaufend, über die Datumsgrenze hinaus)
const _gc = {};
function gcLine(a, b) {
  const key = a + b;
  if (_gc[key]) return _gc[key];
  const A = P.AIRPORTS[a], B = P.AIRPORTS[b];
  const p1 = [A.lat * RAD, A.lon * RAD], p2 = [B.lat * RAD, B.lon * RAD];
  const v = (p) => [Math.cos(p[0]) * Math.cos(p[1]), Math.cos(p[0]) * Math.sin(p[1]), Math.sin(p[0])];
  const u1 = v(p1), u2 = v(p2), dot = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2])), om = Math.acos(dot);
  const n = Math.max(6, Math.ceil(SM.gcDistanceKm(a, b) / 220));
  const pts = [];
  let last = null, off = 0;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    let q;
    if (om < 1e-6) q = u1;
    else { const s1 = Math.sin((1 - f) * om) / Math.sin(om), s2 = Math.sin(f * om) / Math.sin(om); q = [s1 * u1[0] + s2 * u2[0], s1 * u1[1] + s2 * u2[1], s1 * u1[2] + s2 * u2[2]]; }
    const lat = Math.atan2(q[2], Math.hypot(q[0], q[1])) / RAD, lon = Math.atan2(q[1], q[0]) / RAD;
    let [x, y] = proj(Math.max(-84, Math.min(84, lat)), lon);
    if (last !== null) { if (x + off - last > MAP.W / 2) off -= MAP.W; else if (last - (x + off) > MAP.W / 2) off += MAP.W; }
    x += off; last = x; pts.push([x, y]);
  }
  return (_gc[key] = pts);
}
function lineAt(pts, f) {
  const t = Math.max(0, Math.min(1, f)) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(t)), r = t - i;
  const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
  return [x1 + (x2 - x1) * r, y1 + (y2 - y1) * r, Math.atan2(y2 - y1, x2 - x1)];
}
function lineD(pts, upto = 1) {
  const t = Math.max(0, Math.min(1, upto)) * (pts.length - 1), n = Math.floor(t);
  const seg = pts.slice(0, n + 1);
  if (t > n && n < pts.length - 1) { const p = lineAt(pts, upto); seg.push([p[0], p[1]]); }
  const d = (dx) => 'M' + seg.map(([x, y]) => `${(x + dx).toFixed(1)},${y.toFixed(1)}`).join('L');
  const minX = Math.min(...seg.map((p) => p[0])), maxX = Math.max(...seg.map((p) => p[0]));
  let out = d(0);
  if (minX < 0) out += d(MAP.W);
  if (maxX > MAP.W) out += d(-MAP.W);
  return out;
}
function mapArea() {
  const wrap = $('#mapwrap'), side = $('.side');
  const pw = side && getComputedStyle(side).position === 'absolute' ? side.offsetWidth + 24 : 0;
  return { w: wrap.clientWidth || 1000, h: wrap.clientHeight || 700, pw };
}
const kMin = () => Math.max(view.w / MAP.W, view.h / MAP.H);
function clampView() {
  view.k = Math.max(kMin(), Math.min(14, view.k));
  const mw = MAP.W * view.k, mh = MAP.H * view.k;
  view.tx = Math.min(0, Math.max(view.w - mw, view.tx));
  view.ty = Math.min(0, Math.max(view.h - mh, view.ty));
}
function applyView() {
  clampView();
  $('#gWorld').setAttribute('transform', `translate(${view.tx.toFixed(2)},${view.ty.toFixed(2)}) scale(${view.k.toFixed(5)})`);
  ui.viewDirty = true;
}
function fitCodes(codes, pad = 50) {
  const a = mapArea(); view.w = a.w; view.h = a.h;
  const ps = codes.map(pt), xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const availW = Math.max(160, a.w - a.pw - 2 * pad), availH = Math.max(160, a.h - 2 * pad);
  view.k = Math.min(availW / Math.max(x1 - x0, 40), availH / Math.max(y1 - y0, 40), 6);
  view.k = Math.max(view.k, kMin());
  view.tx = pad + (availW - (x1 - x0) * view.k) / 2 - x0 * view.k;
  view.ty = pad + (availH - (y1 - y0) * view.k) / 2 - y0 * view.k;
  applyView();
}
function homeCodes() {
  const pl = W.player, s = new Set(pl.bases);
  for (const r of pl.activeRoutes()) { s.add(r.base); s.add(r.dest); }
  if (s.size < 4) for (const c of SM.AP_CODES) if (SM.gcDistanceKm(pl.bases[0], c) < 1800) s.add(c);
  return [...s];
}
function fitMap() {
  const a = mapArea(), cx = (view.w / 2 - view.tx) / view.k, cy = (view.h / 2 - view.ty) / view.k;
  view.w = a.w; view.h = a.h;
  $('#map').setAttribute('viewBox', `0 0 ${a.w} ${a.h}`);
  view.tx = a.w / 2 - cx * view.k; view.ty = a.h / 2 - cy * view.k;
  applyView();
}
function zoomAt(f, sx, sy) {
  const k2 = Math.max(kMin(), Math.min(14, view.k * f));
  view.tx = sx - (sx - view.tx) * k2 / view.k; view.ty = sy - (sy - view.ty) * k2 / view.k; view.k = k2;
  applyView();
}
function initMap() {
  const svg = $('#map');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = `<rect x="0" y="0" width="100%" height="100%" fill="var(--sea)"/>
    <g id="gWorld"><path class="land" d="${MAP.land}"/><g id="gGrey"></g><path class="borders" d="${MAP.borders}"/><g id="gRoutes"></g><g id="gDraft"></g><g id="gTrails"></g></g>
    <g id="gApts"></g><g id="gPlanes"></g>`;
  const a = mapArea(); view.w = a.w; view.h = a.h; svg.setAttribute('viewBox', `0 0 ${a.w} ${a.h}`);
  window.addEventListener('resize', fitMap);
  if (window.ResizeObserver) new ResizeObserver(() => fitMap()).observe($('#mapwrap'));
  // Zoom und Verschieben (Maus, Rad, Touch mit zwei Fingern)
  const ptrs = new Map(); let drag = null, pinch = null;
  const local = (e) => { const r = svg.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  svg.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = local(e); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), x, y); }, { passive: false });
  svg.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.plane')) return;
    ptrs.set(e.pointerId, local(e));
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    if (ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; pinch = { d: Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), k: view.k, tx: view.tx, ty: view.ty, m: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2] }; drag = null; }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, local(e));
    if (pinch && ptrs.size === 2) {
      const [p1, p2] = [...ptrs.values()], d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
      const k2 = Math.max(kMin(), Math.min(14, pinch.k * d / pinch.d)), m = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      view.k = k2; view.tx = m[0] - (pinch.m[0] - pinch.tx) * k2 / pinch.k; view.ty = m[1] - (pinch.m[1] - pinch.ty) * k2 / pinch.k;
      applyView(); return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 4) { drag.moved = true; try { svg.setPointerCapture(e.pointerId); } catch (err) { /* egal */ } }
      if (drag.moved) { view.tx = drag.tx + dx; view.ty = drag.ty + dy; applyView(); }
    }
  });
  const end = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { if (drag && drag.moved) ui.suppressClick = performance.now(); drag = null; } };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  const g = $('#gApts');
  g.addEventListener('click', (e) => { if (ui.suppressClick && performance.now() - ui.suppressClick < 250) return; const a2 = e.target.closest('.apt'); if (a2) selectAirport(a2.dataset.apt); });
  g.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a2 = e.target.closest('.apt'); if (a2) selectAirport(a2.dataset.apt); } });
  $('#zoomIn').addEventListener('click', () => zoomAt(1.6, (view.w - mapArea().pw) / 2, view.h / 2));
  $('#zoomOut').addEventListener('click', () => zoomAt(1 / 1.6, (view.w - mapArea().pw) / 2, view.h / 2));
  $('#zoomWorld').addEventListener('click', () => fitCodes(SM.AP_CODES, 30));
  $('#zoomHome').addEventListener('click', () => fitCodes(homeCodes()));
}
function aptEventState(c) {
  const ops = W.opsAt(c);
  if (ops.cancel > 0 || ops.delay > 0) return 'bad';
  for (const e of W.activeEvents()) if (e.demand && W.eventAffects(e, c) && (e.demand.leisure || 1) > 1) return 'good';
  return null;
}
function renderAirports() {
  const pl = W.player, stations = new Set(stationsOf(pl)), k = view.k;
  const rankLim = k < 0.55 ? 12 : k < 0.9 ? 30 : k < 1.6 ? 60 : 200;
  let html = '';
  const placed = [];
  const order = SM.AP_CODES.slice().sort((x, y) => (stations.has(y) - stations.has(x)) || ((P.AIRPORTS[y].pax || 0) - (P.AIRPORTS[x].pax || 0)));
  for (const c of order) {
    const a = P.AIRPORTS[c], [mx, my] = pt(c);
    let shown = false;
    for (const dx of [0, -MAP.W, MAP.W]) {
      const [x, y] = toScreen(mx + dx, my);
      if (x < -40 || y < -40 || x > view.w + 40 || y > view.h + 40) continue;
      shown = true;
      const mine = stations.has(c), base = pl.bases.includes(c), sel = ui.selApt === c, ev = aptEventState(c), dd = ui.dead && ui.dead.has(a.country);
      const r = 2.6 + Math.sqrt(a.pax || 20) * 0.32;
      let label = mine || sel || (a.rank || 999) <= rankLim || (!a.rank && k >= 1.6);
      if (label && !mine && !sel && placed.some(([px, py]) => Math.abs(px - x) < 34 && Math.abs(py - y) < 13)) label = false;
      if (label) placed.push([x, y]);
      const city = (k >= 2.6 && label) || base || sel;
      const left = x > view.w - mapArea().pw - 120;
      const tx = left ? x - r - 5 : x + r + 5, anchor = left ? 'end' : 'start';
      html += `<g class="apt${dd ? ' dead' : ''}${base ? ' base' : ''}${mine ? ' mine' : ''}${sel ? ' sel' : ''}${ev === 'bad' ? ' evbad' : ev === 'good' ? ' evgood' : ''}" data-apt="${c}" tabindex="0" role="button" aria-label="${esc(a.name)} (${c})">
        <circle class="hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 7).toFixed(1)}"/><circle class="halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 5).toFixed(1)}"/><circle class="ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>
        ${label ? `<text x="${tx.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="${anchor}">${c}</text>` : ''}${city ? `<text class="city" x="${tx.toFixed(1)}" y="${(y + 16).toFixed(1)}" text-anchor="${anchor}">${esc(a.name)}</text>` : ''}</g>`;
      if (shown) break;
    }
  }
  html += distLabelHtml();
  $('#gApts').innerHTML = html;
  ui.viewDirty = false;
}
// Welche Airlines auf der Karte erscheinen: Filter „Live-Flüge“ und Schalter Konkurrenz
function visibleAl(al) {
  if (al.id === W.playerId) return true;
  if (!al.archetype) return ui.flightFilter !== 'mine';
  return ui.flightFilter === 'all' && ui.showAi;
}
function renderMapRoutes(force = false) {
  const evs = SM.AP_CODES.map(aptEventState).join(','), dead = deadCountries();
  const sig = dead.join('') + W.list.map((al) => al.activeRoutes().map((r) => r.id + r.freq + (r.flyingToday || 0)).join(',')).join('|') + ui.showAi + ui.flightFilter + ui.expanded + ui.selApt + evs + W.player.bases.join();
  if (!force && sig === ui.routesSig) return;
  ui.routesSig = sig;
  let ai = '', hum = '', mine = '';
  const seen = new Set();
  for (const al of W.list) {
    if (!visibleAl(al)) continue;
    const me = al.id === W.playerId;
    for (const r of al.activeRoutes()) {
      const k = al.id + [r.base, r.dest].sort().join('');
      if (seen.has(k)) continue; seen.add(k);
      const d = lineD(gcLine(r.base, r.dest));
      if (me) mine += `<path class="rt meglow" d="${d}"/><path class="rt me${(r.flyingToday || 0) < r.freq ? ' wait' : ''}${ui.expanded === r.id ? ' hl' : ''}" d="${d}"/>`;
      else if (!al.archetype) hum += `<path class="rt huglow" d="${d}" stroke="${colorOf(al)}"/><path class="rt hu" d="${d}" stroke="${colorOf(al)}"/>`;
      else ai += `<path class="rt ai" d="${d}" stroke="${colorOf(al)}"/>`;
    }
  }
  $('#gRoutes').innerHTML = ai + hum + mine;
  renderGrey(dead); ui.dead = new Set(dead);
  ui.viewDirty = true;
  renderLegend();
}
function renderDraft() {
  const p = ui.planner, g = $('#gDraft');
  ui.viewDirty = true;
  if (!p || !p.dest || ui.tab !== 'plan') { g.innerHTML = ''; return; }
  g.innerHTML = `<path class="rt draft" d="${lineD(gcLine(p.base, p.dest))}"/>`;
}
/** Distanz-Schild mitten auf der geplanten bzw. aufgeklappten Strecke. */
function distLabelHtml() {
  let a = null, b = null, type = 'A20N';
  if (ui.planner && ui.planner.dest && ui.tab === 'plan') { a = ui.planner.base; b = ui.planner.dest; type = ui.planner.type; }
  else if (ui.expanded && ui.tab === 'routes') { const r = W.player.routes.find((x) => x.id === ui.expanded); if (r) { a = r.base; b = r.dest; type = r.type_id; } }
  if (!a || !b || !P.AIRPORTS[a] || !P.AIRPORTS[b]) return '';
  const pts = gcLine(a, b), m = pts[Math.floor(pts.length / 2)];
  const x = m[0] * view.k + view.tx, y = m[1] * view.k + view.ty;
  const txt = `${n0(SM.gcDistanceKm(a, b))} km · ${n1(SM.blockHours(a, b, type))} h`;
  const w = txt.length * 7 + 16;
  return `<g class="dlbl" transform="translate(${x.toFixed(1)},${(y - 14).toFixed(1)})"><rect x="${(-w / 2).toFixed(1)}" y="-10" width="${w.toFixed(1)}" height="20" rx="10"/><text text-anchor="middle" y="4">${txt}</text></g>`;
}
function renderLegend() {
  const n = W.list.filter((al) => al.archetype && al.status !== 'insolvent').length;
  const items = [`<span><i style="background:var(--accent);box-shadow:0 0 8px var(--accent)"></i>${esc(W.player.name)}</span>`]
    .concat(ui.flightFilter === 'mine' ? [] : W.humans.filter((h) => h.id !== W.playerId).map((h) => `<span><i style="background:${colorOf(h)};box-shadow:0 0 8px ${colorOf(h)}"></i>${esc(h.name)}</span>`));
  if (ui.showAi && ui.flightFilter === 'all') items.push(`<span><i style="background:var(--plane-ai)"></i>${n} Konkurrenten</span>`);
  if (SM.AP_CODES.some((c) => aptEventState(c) === 'bad')) items.push('<span><i class="ring crit"></i>Störung</span>');
  if (SM.AP_CODES.some((c) => aptEventState(c) === 'good')) items.push('<span><i class="ring good"></i>Großereignis</span>');
  if (ui.dead && ui.dead.size) items.push('<span><i style="background:#6b7280"></i>keine Nachfrage</span>');
  $('#legend').innerHTML = `<div class="row">${items.join('')}</div>`;
}
// Zähler „Aktive Flüge“ mit Tagesprofil (eigene Flüge je Stunde)
function activeFlights() {
  const h = ui.t * 24;
  let now = 0;
  const hours = new Array(24).fill(0);
  for (const s of schedules) {
    if (!s.me) continue;
    if (legAt(s, h)) now++;
    for (let i = 0; i < 24; i++) if (legAt(s, i + 0.5)) hours[i]++;
  }
  return { now, hours };
}
function renderActiveBox() {
  const box = $('#activeBox'); if (!box || !W) return;
  const { now, hours } = activeFlights(), mx = Math.max(1, ...hours), cur = Math.floor(ui.t * 24) % 24;
  const bars = hours.map((v, i) => `<rect x="${i * 2.7}" y="${(26 - Math.max(1.5, v / mx * 24)).toFixed(1)}" width="2" height="${Math.max(1.5, v / mx * 24).toFixed(1)}" rx=".6" opacity="${i === cur ? 1 : 0.45}"/>`).join('');
  box.innerHTML = `<div><small>Aktive Flüge</small><b>${now}</b></div><svg class="bars" viewBox="0 0 65 26" aria-hidden="true">${bars}</svg>`;
}

// Flugzeug-Illustration (Seitenansicht, eigene schematische Zeichnung je Modell)
function acSvg(id, o = {}) {
  const t = P.AIRCRAFT_TYPES[id]; if (!t) return '';
  const I = t.ill, color = o.color || 'var(--accent)', code = (o.code || '').slice(0, 2);
  const f = (x) => x.toFixed(1);
  const L = 150 + 150 * I.len, x0 = (320 - L) / 2, xe = x0 + L, prop = I.kind === 'prop';
  const h = prop ? 17 : 19 + (I.len >= 0.95 ? 1 : 0), cy = 52, top = cy - h / 2, bot = cy + h / 2;
  const tailX = xe - L * 0.2;
  const fus = `M${f(x0 + h * 0.9)},${f(top)} L${f(xe - L * 0.16)},${f(top)} C${f(xe - L * 0.06)},${f(top)} ${f(xe - 6)},${f(top - 1)} ${f(xe)},${f(top - 3)} L${f(xe)},${f(top + 4)} C${f(xe - L * 0.06)},${f(cy + 2)} ${f(xe - L * 0.13)},${f(bot)} ${f(xe - L * 0.22)},${f(bot)} L${f(x0 + h)},${f(bot)} C${f(x0 + h * 0.35)},${f(bot)} ${f(x0)},${f(cy + h * 0.25)} ${f(x0)},${f(cy + 1)} C${f(x0)},${f(cy - h * 0.3)} ${f(x0 + h * 0.35)},${f(top)} ${f(x0 + h * 0.9)},${f(top)}Z`;
  const fh = prop ? h * 2.0 : I.fin === 'a220' ? h * 2.05 : h * 1.85;
  let fin;
  if (I.fin === 'boeing') fin = `M${f(tailX - L * 0.07)},${f(top + 0.5)} L${f(tailX)},${f(top - fh * 0.14)} L${f(xe - L * 0.075)},${f(top - fh)} L${f(xe - L * 0.025)},${f(top - fh)} L${f(xe - 1)},${f(top - 2)}Z`;
  else if (prop) fin = `M${f(tailX + L * 0.01)},${f(top + 0.5)} L${f(xe - L * 0.085)},${f(top - fh)} L${f(xe - L * 0.03)},${f(top - fh)} L${f(xe - 1)},${f(top - 2)}Z`;
  else fin = `M${f(tailX)},${f(top + 0.5)} L${f(xe - L * 0.08)},${f(top - fh)} L${f(xe - L * 0.03)},${f(top - fh)} L${f(xe - 1)},${f(top - 2)}Z`;
  const stab = prop
    ? `M${f(xe - L * 0.11)},${f(top - fh + 1)} L${f(xe - L * 0.0)},${f(top - fh - 1.5)} L${f(xe + 1)},${f(top - fh + 0.5)} L${f(xe - L * 0.1)},${f(top - fh + 2.5)}Z`
    : `M${f(xe - L * 0.14)},${f(top + h * 0.45)} L${f(xe - L * 0.015)},${f(top + h * 0.12)} L${f(xe - L * 0.01)},${f(top + h * 0.3)} L${f(xe - L * 0.11)},${f(top + h * 0.6)}Z`;
  const cabinX0 = x0 + h * 1.7, cabinX1 = xe - L * 0.25, n = Math.floor((cabinX1 - cabinX0) / 6.3);
  let win = '';
  for (let k = 0; k < n; k++) win += `<rect x="${f(cabinX0 + k * 6.3)}" y="${f(cy - h * 0.2)}" width="2.8" height="3.4" rx="1.2"/>`;
  const doors = [x0 + h * 1.25, cabinX1 + 3].map((x) => `<rect x="${f(x)}" y="${f(top + 3)}" width="4.6" height="${f(h - 6)}" rx="1.4" fill="none" stroke="var(--fus-line)" stroke-width=".7"/>`).join('');
  const shield = `<path d="M${f(x0 + h * 0.32)},${f(cy - h * 0.12)} L${f(x0 + h * 0.72)},${f(top + h * 0.22)} L${f(x0 + h * 1.08)},${f(top + h * 0.22)} L${f(x0 + h * 1.02)},${f(cy - h * 0.12)}Z" fill="var(--glass)"/>`;
  let wing, eng, gear;
  if (prop) {
    const wx = x0 + L * 0.37;
    wing = `<path d="M${f(wx)},${f(top + 0.5)} L${f(wx + L * 0.2)},${f(top + 0.5)} L${f(wx + L * 0.18)},${f(top + 3.2)} L${f(wx + L * 0.015)},${f(top + 3.2)}Z" fill="var(--fus-line)"/>`;
    const nl = I.fin === 'dash' ? L * 0.17 : L * 0.12, nx = wx - L * 0.025;
    eng = `<rect x="${f(nx)}" y="${f(top - 1)}" width="${f(nl)}" height="9" rx="4" fill="var(--fus)" stroke="var(--fus-line)" stroke-width=".8"/>
      <ellipse cx="${f(nx - 1.5)}" cy="${f(top + 3.5)}" rx="1.4" ry="15" fill="var(--ink-3)" opacity=".28"/><ellipse cx="${f(nx - 1)}" cy="${f(top + 3.5)}" rx="2.6" ry="2.4" fill="var(--ink-2)"/>`;
    const gx = I.fin === 'dash' ? nx + nl - 6 : x0 + L * 0.5;
    gear = `<line x1="${f(x0 + h * 1.4)}" y1="${f(bot - 1)}" x2="${f(x0 + h * 1.4)}" y2="${f(bot + 5)}" stroke="var(--gear)" stroke-width="1.2"/><circle cx="${f(x0 + h * 1.4)}" cy="${f(bot + 6)}" r="2.4" fill="var(--gear)"/>
      <line x1="${f(gx)}" y1="${f(bot - 2)}" x2="${f(gx)}" y2="${f(bot + 4)}" stroke="var(--gear)" stroke-width="1.6"/><circle cx="${f(gx)}" cy="${f(bot + 5.5)}" r="3.2" fill="var(--gear)"/>
      ${I.fin === 'dash' ? '' : `<path d="M${f(x0 + L * 0.44)},${f(bot)} Q${f(x0 + L * 0.5)},${f(bot + 4)} ${f(x0 + L * 0.58)},${f(bot)}Z" fill="var(--fus)" stroke="var(--fus-line)" stroke-width=".7"/>`}`;
  } else {
    const wx = x0 + L * 0.37;
    wing = `<path d="M${f(wx)},${f(bot - 3)} L${f(wx + L * 0.22)},${f(bot - 1.2)} L${f(wx + L * 0.235)},${f(bot + 0.8)} L${f(wx + L * 0.02)},${f(bot + 0.6)}Z" fill="var(--fus-line)"/>`;
    const el = (I.neo ? 36 : 31) * L / 290, eh = I.neo ? 11.5 : 10, flat = I.fin === 'boeing', ex = wx - el * 0.45, ey = bot - (flat ? 1.5 : 0.5);
    eng = `<line x1="${f(ex + el * 0.6)}" y1="${f(bot - 1)}" x2="${f(ex + el * 0.75)}" y2="${f(ey + 2)}" stroke="var(--fus-line)" stroke-width="2"/>
      <rect x="${f(ex)}" y="${f(ey)}" width="${f(el)}" height="${f(eh)}" rx="${f(eh / 2)}" fill="var(--fus)" stroke="var(--fus-line)" stroke-width=".8"/>
      <ellipse cx="${f(ex + 1.6)}" cy="${f(ey + eh / 2)}" rx="1.8" ry="${f(eh / 2 - 1)}" fill="var(--glass)" opacity=".85"/>
      <path d="M${f(ex + el - 1)},${f(ey + 2.5)} L${f(ex + el + 4)},${f(ey + eh / 2)} L${f(ex + el - 1)},${f(ey + eh - 2.5)}Z" fill="var(--fus-line)"/>
      <rect x="${f(ex + el * 0.25)}" y="${f(ey + eh / 2 - 0.7)}" width="${f(el * 0.45)}" height="1.4" fill="${color}" opacity=".9"/>`;
    const gx = x0 + L * 0.53;
    gear = `<line x1="${f(x0 + h * 1.45)}" y1="${f(bot - 1)}" x2="${f(x0 + h * 1.45)}" y2="${f(bot + 6)}" stroke="var(--gear)" stroke-width="1.2"/><circle cx="${f(x0 + h * 1.45)}" cy="${f(bot + 7)}" r="2.6" fill="var(--gear)"/>
      <line x1="${f(gx)}" y1="${f(bot - 1)}" x2="${f(gx)}" y2="${f(bot + 5)}" stroke="var(--gear)" stroke-width="1.6"/><circle cx="${f(gx)}" cy="${f(bot + 7)}" r="3.4" fill="var(--gear)"/>`;
  }
  const label = code ? `<text x="${f((tailX + xe) / 2 + (prop ? 4 : 2))}" y="${f(top - fh * 0.42)}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="${prop ? 8 : 9}" fill="${o.ink || 'var(--on-accent)'}">${esc(code)}</text>` : '';
  return `<svg class="${o.cls || 'acv'}" viewBox="0 0 320 76" role="img" aria-label="${esc(t.label)}">
    <ellipse cx="160" cy="${f(bot + 10.5)}" rx="${f(L * 0.42)}" ry="2.4" fill="#000" opacity=".1"/>
    ${gear}${prop ? '' : eng}
    <path d="${fin}" fill="${color}"/>
    <path d="${fus}" fill="var(--fus)" stroke="var(--fus-line)" stroke-width=".9"/>
    <path d="M${f(x0 + h * 1.1)},${f(cy + h * 0.28)} L${f(tailX - 4)},${f(cy + h * 0.28)}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="${stab}" fill="${prop ? color : 'var(--fus-line)'}"/>
    <g fill="var(--glass)">${win}</g>${doors}${shield}${wing}${prop ? eng : ''}${label}
  </svg>`;
}

// Flugbewegungen (nur Darstellung; der Zustand entsteht in der Tagessimulation)
const ICON_JET = 'M8.5,0 Q8,-1.1 6,-1.1 L1.5,-1.1 L-2.5,-8 L-4.2,-8 L-2.2,-1.1 L-6,-1.1 L-7.6,-3.8 L-8.6,-3.8 L-7.6,0 L-8.6,3.8 L-7.6,3.8 L-6,1.1 L-2.2,1.1 L-4.2,8 L-2.5,8 L1.5,1.1 L6,1.1 Q8,1.1 8.5,0Z';
const ICON_PROP = 'M8,0 Q8,-1 6,-1 L2,-1 L1.6,-8.5 L-0.4,-8.5 L-0.8,-1 L-6,-1 L-6.6,-3.6 L-7.8,-3.6 L-7.4,0 L-7.8,3.6 L-6.6,3.6 L-6,1 L-0.8,1 L-0.4,8.5 L1.6,8.5 L2,1 L6,1 Q8,1 8,0Z';
const ICON_WIDE = 'M10,0 Q9.4,-1.5 7,-1.5 L2,-1.5 L-3,-10.5 L-5.2,-10.5 L-2.6,-1.5 L-7,-1.5 L-9,-4.6 L-10.2,-4.6 L-9,0 L-10.2,4.6 L-9,4.6 L-7,1.5 L-2.6,1.5 L-5.2,10.5 L-3,10.5 L2,1.5 L7,1.5 Q9.4,1.5 10,0Z';
let schedules = [];
function buildSchedules() {
  schedules = [];
  for (const al of W.list) {
    if (al.status === 'insolvent') continue;
    const byId = Object.fromEntries(al.routes.map((r) => [r.id, r]));
    const me = al.id === W.playerId;
    al.fleet.forEach((a, idx) => {
      if (!a.assigned || !a.assigned.length || a.delivery_day > W.day) return;
      const share = {};
      let t = 6 + ((idx * 0.37) % 1.4);
      const legs = [];
      for (const rid of a.assigned) {
        const r = byId[rid]; if (!r) continue;
        const bh = SM.blockHours(r.base, r.dest, r.type_id), turn = SM.turnHours(r.type_id, r.service, r.buffer);
        const w = SM.winOf(r.type_id), rot = 2 * bh + 2 * turn;
        if (rot > w) {
          // Langer Umlauf auf mehreren Flugzeugen: jedes startet an jedem k-ten Tag
          const k = Math.ceil(rot / w), slot = (share[rid] = share[rid] ?? (idx % k)), dOff = (W.day + slot) % k;
          const t0 = 8 + (idx % 3) - 24 * dOff;
          legs.push({ a: r.base, b: r.dest, t0, t1: t0 + bh, r, dir: 'out' });
          legs.push({ a: r.dest, b: r.base, t0: t0 + bh + turn, t1: t0 + 2 * bh + turn, r, dir: 'in' });
          continue;
        }
        legs.push({ a: r.base, b: r.dest, t0: t, t1: t + bh, r, dir: 'out' }); t += bh + turn;
        legs.push({ a: r.dest, b: r.base, t0: t, t1: t + bh, r, dir: 'in' }); t += bh + turn;
      }
      const kind = P.AIRCRAFT_TYPES[a.type_id].ill.kind;
      if (legs.length) schedules.push({ me, al, ac: a, icon: kind === 'prop' ? ICON_PROP : kind === 'wide' ? ICON_WIDE : ICON_JET, legs, lines: legs.map((l) => gcLine(l.a, l.b)) });
    });
  }
}
function legAt(s, h) {
  for (let i = 0; i < s.legs.length; i++) {
    const l = s.legs[i];
    for (const off of [0, 24]) if (h + off >= l.t0 && h + off <= l.t1) return [i, (h + off - l.t0) / (l.t1 - l.t0)];
  }
  return null;
}
function renderPlanes() {
  const h = ui.t * 24;
  if (ui.viewDirty) renderAirports();
  let trails = '', planes = '', selPlane = '';
  const k = view.k, sc0 = Math.max(0.7, Math.min(1.25, 0.75 + k * 0.25));
  for (const s of schedules) {
    const sel = ui.sel && ui.sel.ac === s.ac.id;
    if (!sel && !visibleAl(s.al)) continue;
    const hit = legAt(s, h);
    if (!hit) continue;
    const [i, f] = hit, line = s.lines[i];
    const [mx, my, ang] = lineAt(line, f);
    const x0 = wrapX(mx);
    if (s.me || sel) trails += `<path class="trail${sel ? ' sel' : ''}" d="${lineD(line, f)}"/>`;
    for (const dx of [0, -MAP.W, MAP.W]) {
      const [x, y] = toScreen(x0 + dx, my);
      if (x < -20 || y < -20 || x > view.w + 20 || y > view.h + 20) continue;
      const hu = !s.me && !s.al.archetype;
      const g = `<g class="plane${s.me ? ' me' : ''}${sel ? ' sel' : ''}" data-ac="${s.ac.id}" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(ang / RAD).toFixed(0)}) scale(${(sel ? 1.35 : s.me || hu ? 1.0 : 0.78) * sc0})"><circle r="11"/><path d="${s.icon}"${hu && !sel ? ` style="fill:${colorOf(s.al)}"` : ''}/></g>`;
      if (sel) selPlane = g; else planes += g;
      break;
    }
  }
  $('#gTrails').innerHTML = trails;
  $('#gPlanes').innerHTML = planes + selPlane;
  $('#daybar').style.width = `${(ui.t * 100).toFixed(2)}%`;
  const now = performance.now();
  if (ui.sel && (!renderPlanes.last || now - renderPlanes.last > 250)) { renderPlanes.last = now; renderPlaneCard(); }
  if (!renderPlanes.lastBox || now - renderPlanes.lastBox > 700) { renderPlanes.lastBox = now; renderActiveBox(); const c = $('#clock'); if (c) c.textContent = clockText(); applyTheme(); }
}
const hhmm = (hrs) => { const m = Math.round(hrs * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
function flightNo(al, r, dir) {
  const code = al.id === W.playerId ? (al.code || 'SM') : al.id.slice(0, 2);
  const idx = Math.max(0, al.routes.indexOf(r));
  return `${code} ${100 + idx * 2 + (dir === 'in' ? 1 : 0)}`;
}
function renderPlaneCard() {
  const box = $('#planeCard');
  const s = ui.sel && schedules.find((x) => x.ac.id === ui.sel.ac);
  if (!s) { box.hidden = true; ui.sel = null; return; }
  const h = ui.t * 24, al = s.al, a = s.ac, t = P.AIRCRAFT_TYPES[a.type_id], me = s.me;
  const hit = legAt(s, h);
  let i, f = 0, ground = !hit;
  if (hit) [i, f] = hit; else { i = s.legs.findIndex((l) => l.t0 > h); if (i < 0) i = s.legs.length - 1; }
  const l = s.legs[i];
  const phase = ground ? (h < l.t0 ? `Am Boden in ${l.a}` : `Am Boden in ${l.b}`) : f < 0.14 ? 'Steigflug' : f > 0.86 ? 'Sinkflug' : `Reiseflug FL${t.ill.kind === 'prop' ? 240 : 360}`;
  const last = l.r.hist.at(-1), seatsDir = l.r.seats(), fl = l.r.flyingToday || l.r.freq;
  const pax = last ? Math.round((last['pax_' + l.dir] || 0) / Math.max(1, fl)) : null;
  const color = me ? 'var(--accent)' : `var(--ai${al.color})`;
  const hu = !me && !al.archetype;
  box.innerHTML = `<div class="pc-head${me || hu ? '' : ' ai'}"${hu ? ` style="background:linear-gradient(120deg, ${colorOf(al)}, #0b1a33)"` : ''}><div><span class="badge">${ground ? 'Am Boden' : 'In der Luft'}</span><b style="display:block;margin-top:5px">${flightNo(al, l.r, l.dir)}</b><small>${esc(al.name)} · ${t.label}</small></div><button data-pc="close" aria-label="Schließen">×</button></div>
    ${acSvg(a.type_id, al.logo ? { color: al.logo.c1, ink: al.logo.c2, code: al.code } : { color, code: me ? al.code : al.id.slice(0, 2), ink: me ? 'var(--on-accent)' : '#fff' })}
    <div class="pc-route"><div><b>${l.a}</b><span>${apName(l.a)}</span></div><i>✈</i><div><b>${l.b}</b><span>${apName(l.b)}</span></div></div>
    <div class="pc-prog"><i style="width:${(f * 100).toFixed(0)}%"></i></div>
    <div class="pc-times"><span>${hhmm((l.t0 % 24 + 24) % 24)}</span><span>${ground ? phase : `${n0(Math.max(0, (1 - f) * (l.t1 - l.t0)) * 60)} Min. verbleibend`}</span><span>${hhmm((l.t1 % 24 + 24) % 24)}</span></div>
    <dl><div><dt>Flugzeug</dt><dd>${tlx(a.type_id)}</dd></div><div><dt>Kennung</dt><dd>${me ? acName(a.id) : a.id}</dd></div>
      <div><dt>Status</dt><dd>${ground ? 'am Boden' : phase}</dd></div><div><dt>Geschwindigkeit</dt><dd>${ground ? '–' : n0(f < 0.14 || f > 0.86 ? t.speed_kmh * 0.7 : t.speed_kmh + 40) + ' km/h'}</dd></div>
      <div><dt>Passagiere</dt><dd>${pax === null ? '–' : `${pax} / ${seatsDir}`}</dd></div><div><dt>Distanz</dt><dd>${n0(SM.gcDistanceKm(l.a, l.b))} km</dd></div>
      <div><dt>Alter</dt><dd>${n1(al.acAge(a, W.day))} Jahre</dd></div><div><dt>Tarif</dt><dd>${eur(l.dir === 'out' ? l.r.fare_out : l.r.fare_in)}</dd></div>
      ${me ? (() => { const c = crewInfo(al, a); return `<div><dt>Besitzer</dt><dd><b>Ihr Flugzeug</b></dd></div><div><dt>Crew</dt><dd class="${c ? (c.cls === 'good' ? 'pos' : c.cls === 'crit' ? 'neg' : 'warnc') : ''}" title="${c ? esc(c.tip) : ''}">${c ? c.txt : '–'}</dd></div>`; })() : `<div><dt>Betreiber</dt><dd>${esc(al.name)}</dd></div><div><dt>Musterfamilie</dt><dd>${esc(P.TYPE_GROUPS[t.group])}</dd></div>`}</dl>
    ${me ? `<div style="padding:10px 12px"><button class="btn small" data-pc="route" data-id="${l.r.id}">Strecke ${l.r.base}–${l.r.dest} öffnen</button></div>` : ''}`;
  box.hidden = false;
}

// ---------------------------------------------------------------------------
// Kopfzeile
// ---------------------------------------------------------------------------
function monthResult(al) {
  let s = 0; for (const k in al.ledger.month) if (!k.startsWith('cf_')) s += al.ledger.month[k];
  return s / 100;
}
// ---------------------------------------------------------------------------
// Kennzahlen
// ---------------------------------------------------------------------------
function rstats(r, days, al = W.player) {
  const h = r.hist.slice(-days);
  const s = { n: h.length, flights: 0, seats: 0, pax: 0, rev: 0, cost: 0, cancelled: 0, late: 0, demand: 0, spill: 0, pax_out: 0, pax_in: 0, seats_out: 0, seats_in: 0, tr: 0, cargo: 0 };
  for (const x of h) {
    s.flights += x.flights; s.seats += x.seats; s.pax += x.pax; s.rev += x.rev; s.cost += x.cost; s.cancelled += x.cancelled; s.late += x.late || 0;
    s.demand += (x.demand_out || 0) + (x.demand_in || 0); s.spill += (x.spill_out || 0) + (x.spill_in || 0);
    s.pax_out += x.pax_out; s.pax_in += x.pax_in; s.seats_out += x.seats_out; s.seats_in += x.seats_in; s.tr += (x.tr_out || 0) + (x.tr_in || 0); s.cargo += x.cargo || 0;
  }
  const rot = al.rotH(r) * r.freq;
  s.acCost = SM.aircraftDayFixedGeneric(r.type_id) * rot / P.OPERATING_WINDOW_H * s.n;
  s.db1 = s.rev - s.cost; s.db2 = s.db1 - s.acCost;
  s.lf = s.seats ? s.pax / s.seats : 0;
  s.avgFare = s.pax ? (s.rev / s.pax) - P.SERVICE[r.service].ancillary * cpi() : 0;
  s.otp = s.flights ? 1 - (s.late + s.cancelled) / s.flights : null;
  return s;
}
function playerOtp() { const h = W.player.otpHist; return h.length ? h.reduce((a, b) => a + b, 0) / h.length : null; }
function acDayCost(a) {
  const pl = W.player, t = P.AIRCRAFT_TYPES[a.type_id];
  let c = P.OVERHEAD_PER_AIRCRAFT_DAY * cpi() + (a.owned ? a.nbv : t.value_eur) * P.INSURANCE[pl.insurance].rate / 365;
  if (a.owned) c += (a.value0 || t.value_eur) * (1 - P.RESIDUAL_SHARE) / P.DEPRECIATION_YEARS / 365 + a.loan * (a.loanRate || 0.06) / 365;
  else c += (a.leaseUsd / W.macro.eurusd) * (1 + (a.flex ? P.FLEX_LEASE_PREMIUM : 0)) * 12 / 365;
  return c;
}
function stationsOf(pl) {
  const s = new Set(pl.bases);
  for (const r of pl.activeRoutes()) { s.add(r.base); s.add(r.dest); }
  return [...s];
}
function depsAt(pl, apt) {
  let n = 0, hand = 0;
  for (const r of pl.activeRoutes()) {
    if (r.base !== apt && r.dest !== apt) continue;
    n += r.freq; hand += r.freq * P.AIRCRAFT_TYPES[r.type_id].handling;
  }
  return { n, hand };
}
const staffPlan = (pl) => SM.staffPlanOf(pl);

// ---------------------------------------------------------------------------
// Bereiche (farbcodiert) und Unter-Tabs
// ---------------------------------------------------------------------------
const IC = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  plane: '<path d="M21 15.5 13.5 11V5.5a1.5 1.5 0 0 0-3 0V11L3 15.5V17l7.5-2.2v3.7L8.5 20v1.2l3.5-1 3.5 1V20l-2-1.5v-3.7L21 17z"/>',
  route: '<circle cx="6" cy="18" r="2.3"/><circle cx="18" cy="6" r="2.3"/><path d="M8.2 17.2c6.5-1.2 1.6-9.2 7.6-10.4"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-4M12 16V8M17 16V5"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  building: '<path d="M4 21V5l8-3v19"/><path d="M12 9h8v12"/><path d="M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2M3 21h18"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  layers: '<path d="M12 3 2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
};
const icon = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
const SECTIONS = [
  { key: 'karte', label: 'Karte', sub: 'Live-Lage und Überblick', icon: 'globe', tabs: [['dashboard', 'Dashboard'], ['cockpit', 'Übersicht'], ['departures', 'Abflüge'], ['news', 'Meldungen']] },
  { key: 'flotte', label: 'Flotte', sub: 'Jedes Flugzeug zählt', icon: 'plane', tabs: [['fleetOwn', 'Ihre Flotte'], ['fleetPlan', 'Einsatzplan'], ['fleetBuy', 'Beschaffung'], ['fleetAcmi', 'Charter']] },
  { key: 'strecken', label: 'Strecken', sub: 'Verbindungen sind Chancen', icon: 'route', tabs: [['routes', 'Netz'], ['plan', 'Planung']] },
  { key: 'finanzen', label: 'Finanzen', sub: 'Zahlen. Fakten. Entscheidungen.', icon: 'chart', tabs: [['finance', 'Ergebnis und Bilanz'], ['credit', 'Kredite und Rating']] },
  { key: 'markt', label: 'Markt', sub: 'Trends erkennen. Chancen nutzen.', icon: 'trend', tabs: [['market', 'Nachfrage'], ['rivals', 'Wettbewerb'], ['trade', 'Handel'], ['world', 'Weltlage']] },
  { key: 'unternehmen', label: 'Unternehmen', sub: 'Menschen, Standorte, Einkauf', icon: 'building', tabs: [['profile', 'Profil & Logo'], ['milestones', 'Meilensteine'], ['staff', 'Personal'], ['stations', 'Stationen'], ['supply', 'Einkauf'], ['assistant', 'Assistenz']] },
];
const TAB_ALIAS = { fleet: 'fleetOwn' };
const sectionOf = (t) => SECTIONS.find((s) => s.tabs.some(([k]) => k === t)) || SECTIONS[0];
function openDecisions() { return W.player.decisions.filter((d) => !d.resolved); }
function tabDots() {
  const pl = W.player;
  const cov = pl.staff.cov;
  return {
    news: W.news.length + pl.events.length > ui.newsSeen && ui.tab !== 'news',
    cockpit: openDecisions().length > 0 || pl.events.some((e) => e.kind === 'crit' && e.day >= W.day - 3),
    staff: !!(cov && (Object.values(cov.cancel).some((x) => x > 0) || cov.agencyH > 0)),
    world: W.activeEvents().some((e) => e.severity === 'crit'),
    trade: incomingDeals().length > 0,
  };
}
function renderNav() {
  const dots = tabDots(), cur = sectionOf(ui.tab);
  $('#nav').innerHTML = SECTIONS.map((s) => `<button role="tab" data-sec="${s.key}" aria-selected="${s === cur}" title="${s.label}" style="--sc:var(--c-${s.key})">${icon(s.icon)}<span class="lbl">${s.label}</span>${s.tabs.some(([k]) => dots[k] && k !== 'news') ? '<span class="dot"></span>' : ''}</button>`).join('');
  const bell = $('#bell .dot'); if (bell) bell.hidden = !dots.news;
}
function renderTabs() {
  const sec = sectionOf(ui.tab), dots = tabDots();
  const side = $('#side'); if (side) side.dataset.sec = sec.key;
  $('#secHead').innerHTML = `<div class="secic">${icon(sec.icon)}</div><div><b>${sec.label}</b><span>${sec.sub}</span></div>`;
  $('#tabs').innerHTML = sec.tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${ui.tab === k}">${l}${dots[k] ? '<span class="dot"></span>' : ''}</button>`).join('');
  renderNav();
}
function setTab(t) {
  t = TAB_ALIAS[t] || t;
  if (!VIEWS[t]) t = 'cockpit';
  ui.tab = t; ui.confirm = null; ui.viewDirty = true;
  ui.lastSub = ui.lastSub || {};
  ui.lastSub[sectionOf(t).key] = t;
  if (t === 'news') ui.newsSeen = W.news.length + W.player.events.length;
  renderTabs(); renderPane(true); renderDraft();
  $('#pane').scrollTop = 0;
}
function editing() { const a = document.activeElement; return a && $('#pane').contains(a) && /INPUT|SELECT/.test(a.tagName); }
const VIEWS = {};
function renderPane(force = false) {
  if (!force && editing()) return;
  const pane = $('#pane'), st = pane.scrollTop;
  pane.innerHTML = VIEWS[ui.tab]();
  if (!force) pane.scrollTop = st;
  if (ui.tab === 'plan' && ui.planner) updateForecast();
}

// ---------------------------------------------------------------------------
// Kopfzeile, Seitenleiste, Zeit
// ---------------------------------------------------------------------------
const speedNow = () => (ui.mp ? (mpState.clock ? SM.speedKey(mpState.clock.speed) : 'p') : ui.speedKey || 'p');
function renderSpeed() {
  const cur = speedNow(), sel = $('#speedSel'); if (!sel) return;
  const keys = Object.keys(SM.SPEEDS).filter((k) => k !== 'p' && !(ui.mp && SM.SPEEDS[k].local));
  const show = cur === 'p' ? (ui.lastSpeed || (ui.mp ? 'h1' : 'x1')) : cur;
  sel.innerHTML = keys.map((k) => `<option value="${k}" ${k === show ? 'selected' : ''}>${SM.SPEEDS[k].short}</option>`).join('');
  sel.title = SM.SPEEDS[show].label;
  $('#btnPause').setAttribute('aria-pressed', String(cur === 'p'));
  $('#btnPlay').setAttribute('aria-pressed', String(cur !== 'p'));
  const lock = !!ui.mp && !ui.mp.host;
  for (const el of [$('#btnPause'), $('#btnPlay'), sel]) el.disabled = lock;
}
function clockText() {
  const mins = Math.floor((ui.t % 1) * 1440);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}
function renderHeader() {
  if (!W || !W.player) return;
  const pl = W.player, p = dateParts(W.day);
  $('#date').innerHTML = `<b>${p.wd}, ${p.d}. ${MONTHS[p.m]} ${p.y}</b><span id="clock">${clockText()}</span><small>Tag ${W.day + 1} · ${SM.SPEEDS[speedNow()].short}</small>`;
  { const ub = $('#userBtn'), lk = JSON.stringify(logoOf(pl)) + pl.code; if (ub.dataset.lk !== lk) { ub.innerHTML = logoSvg(pl, 36); ub.dataset.lk = lk; } }
  applyTheme();
  renderSpeed();
  renderSidebar();
}
function trendPct(now, before) { if (!before || !isFinite(before) || Math.abs(before) < 1) return null; return (now - before) / Math.abs(before); }
function kpiDelta(d, invert = false) {
  if (d === null || !isFinite(d)) return '<em></em>';
  const up = d >= 0;
  return `<em class="${(up !== invert) ? 'up' : 'down'}">${up ? '↑' : '↓'} ${NF1.format(Math.abs(d) * 100)} %</em>`;
}
function renderSidebar() {
  const sb = $('#sidebar'); if (!sb || getComputedStyle(sb).display === 'none') return;
  const pl = W.player, bs = SM.balanceSheet(pl), h = netHistOf(pl), nc = netCash(pl);
  const routes = pl.activeRoutes(), s7 = routes.map((r) => rstats(r, 7)), s14 = routes.map((r) => rstats(r, 14));
  const seats7 = s7.reduce((a, x) => a + x.seats, 0), pax7 = s7.reduce((a, x) => a + x.pax, 0);
  const seats14 = s14.reduce((a, x) => a + x.seats, 0) - seats7, pax14 = s14.reduce((a, x) => a + x.pax, 0) - pax7;
  const lf = seats7 ? pax7 / seats7 : null, lfPrev = seats14 ? pax14 / seats14 : null, otp = playerOtp();
  const cashPrev = h.length > 30 ? h[h.length - 31] : h[0];
  sb.innerHTML = `
    <div class="card2 alcard"><button class="albadge" data-act="tab" data-tab="profile" title="Logo gestalten">${logoSvg(pl, 46)}</button><div style="min-width:0"><b>${esc(pl.name)}</b><span>${pl.stage().label} · Basis ${pl.bases.join(', ')}${ui.mp ? ' · ' + esc(ui.mp.name) : ''}</span></div></div>
    <div class="card2 kpilist">
      <div><span>Kontostand${nc < 0 ? ' · im Dispo' : ''}</span><b class="${nc < 0 ? 'neg' : ''}">${eur(nc)}</b>${nc > 0 && cashPrev > 0 ? kpiDelta(trendPct(nc, cashPrev)) : '<em></em>'}</div>
      <div><span>Tagesergebnis</span><b class="${sgn(pl.ledger.lastDay || 0)}">${eur(pl.ledger.lastDay || 0, { plus: true })}</b><em></em></div>
      <div><span>Auslastung 7 Tage</span><b>${lf === null ? '–' : pct(lf)}</b>${lf !== null && lfPrev ? kpiDelta(lf - lfPrev) : '<em></em>'}</div>
      <div><span>Pünktlichkeit</span><b>${otp === null ? '–' : pct(otp)}</b><em></em></div>
      <div><span>Eigenkapital · Rating</span><b>${eur(bs.equity)}</b><em class="up" style="color:var(--ink-2)">${pl.rating}</em></div>
    </div>
    ${assistantCard()}`;
}
function setSpeed(k) {
  k = SM.speedKey(k);
  if (k !== 'p') ui.lastSpeed = k;
  if (k === 'rt' && ui.speedKey !== 'rt') { ui.t = wallFrac(); ui.rtDay = localDayNum(); }
  ui.speedKey = k;
  if (W) renderHeader();
}
function speedChosen(k) {
  if (ui.mp) mpSetSpeed(k); else { setSpeed(k); if (SM.SPEEDS[k].slow) saveGame(false); }
}
function renderUserMenu() {
  const m = $('#userMenu'), items = [];
  if (ui.mp) items.push(['invite', 'Mitspielende einladen'], ['lobby', 'Zur Lobby']);
  else { items.push(['save', 'Speichern'], ['newgame', 'Neues Spiel']); if (ONLINE) items.push(['lobby', 'Online spielen']); }
  const dark = document.documentElement.dataset.theme !== 'light';
  void dark;
  items.push(['sep'], ['tour', 'Kurzer Rundgang'], ['guide', 'Anleitung'], ['assistant', 'Assistenz einstellen'], ['profile', 'Logo gestalten'], ['theme', `Design: ${THEME_LABEL[themePref()]} (wechseln)`]);
  if (ONLINE && mpState.user) items.push(['sep'], ['logout', `Abmelden (${mpState.user.name})`]);
  m.innerHTML = items.map(([k, l]) => (k === 'sep' ? '<div class="sep"></div>' : `<button data-um="${k}">${esc(l)}</button>`)).join('');
}
function onUserMenu(k) {
  $('#userMenu').hidden = true;
  if (k === 'invite') showInvite();
  else if (k === 'lobby') { if (mpState.user) showLobby(); else showAuth(); }
  else if (k === 'save') saveGame(true);
  else if (k === 'newgame') showStart(true);
  else if (k === 'guide') showGuide();
  else if (k === 'tour') startTour();
  else if (k === 'assistant') setTab('assistant');
  else if (k === 'theme') cycleTheme();
  else if (k === 'profile') setTab('profile');
  else if (k === 'logout') { api('/logout', { body: {} }).catch(() => {}).finally(() => { mpState.user = null; stopOnline(); showAuth(); }); }
}

// ---------- Cockpit ----------
// ---------- Dashboard: alles Wichtige auf einen Blick ----------
VIEWS.dashboard = function viewDashboard() {
  const pl = W.player, L = pl.ledger, routes = pl.activeRoutes();
  const s30 = routes.map((r) => ({ r, s: rstats(r, 30) })), s7 = routes.map((r) => rstats(r, 7));
  const seats7 = s7.reduce((a, x) => a + x.seats, 0), pax7 = s7.reduce((a, x) => a + x.pax, 0), lf7 = seats7 ? pax7 / seats7 : null;
  const spill = s30.reduce((a, x) => a + x.s.spill, 0), dem = s30.reduce((a, x) => a + x.s.demand, 0);
  const cur = pnlCol(L.month), prev = L.months.length ? pnlCol(L.months.at(-1).acc) : null;
  const nc = netCash(pl), otp = playerOtp();
  const panel = (title, tab, body, sub = '') => `<section class="dpanel"><div class="dp-head"><b>${title}</b>${sub ? `<span class="small muted">${sub}</span>` : ''}${tab ? `<button class="btn small" data-act="tab" data-tab="${tab}">Öffnen</button>` : ''}</div>${body}</section>`;
  const tile = (l, v, cls, em) => `<div class="tile"><span>${l}</span><b class="${cls || ''}">${v}</b><em>${em || ''}</em></div>`;
  let html = `<div class="spread"><h2 class="sec">Dashboard <small>${esc(pl.name)} · ${pl.stage().label}</small></h2></div>`;
  // Kennzahlen
  html += `<div class="tiles dtiles">
    ${tile('Ergebnis ' + MONTHS[dateParts(W.day).m] + ' (lfd.)', eur(cur.net, { plus: true }), sgn(cur.net), prev ? `Vormonat <span class="${sgn(prev.net)}">${eur(prev.net, { plus: true })}</span>` : 'erster Monat')}
    ${tile('Kontostand', eur(nc), nc < 0 ? 'neg' : '', `${nc < 0 ? 'im Dispo · ' : ''}frei ${eur(pl.spendable(W.macro.bank ?? 1))}`)}
    ${tile('Auslastung 7 Tage', lf7 === null ? '–' : pct(lf7), lf7 !== null && lf7 < 0.65 ? 'warnc' : '', dem ? `abgewiesen ${pct(spill / dem)} der Nachfrage` : 'noch keine Flüge')}
    ${tile('Pünktlichkeit', otp === null ? '–' : pct(otp), otp !== null && otp < 0.75 ? 'warnc' : '', `Marke ${n0(pl.brand * 100)} · Rating ${pl.rating}`)}
  </div>`;
  html += '<div class="dash">';
  // Profitabilität je Strecke
  const rows = s30.filter((x) => x.s.n).map((x) => ({ ...x, d: x.s.db2 / x.s.n })).sort((a, b) => b.d - a.d);
  const maxAbs = Math.max(1, ...rows.map((x) => Math.abs(x.d)));
  const prof = rows.length ? `<div class="dbars">${rows.slice(0, 10).map((x) => { const w = Math.abs(x.d) / maxAbs * 50;
      return `<div class="dbar" title="${x.r.base}–${x.r.dest}: ${eur(x.d, { plus: true })} pro Tag, Auslastung ${pct(x.s.lf)}"><span class="dl">${x.r.base}–${x.r.dest}</span><span class="dtrack div"><i class="${x.d < 0 ? 'neg' : 'pos'}" style="${x.d < 0 ? `right:50%;width:${w}%` : `left:50%;width:${w}%`}"></i></span><span class="dv ${sgn(x.d)}">${eur(x.d, { plus: true })}</span></div>`; }).join('')}</div>
      ${rows.length > 10 ? `<p class="small muted">${rows.length - 10} weitere Strecken unter Strecken → Netz.</p>` : ''}
      <p class="small muted">Streckenbeitrag (DB2) pro Tag, Mittel der letzten 30 Tage. ${rows.filter((x) => x.d < 0).length ? `<b>${rows.filter((x) => x.d < 0).length}</b> Strecke${rows.filter((x) => x.d < 0).length > 1 ? 'n' : ''} im Minus.` : 'Alle Strecken tragen sich.'}</p>`
    : '<p class="small muted">Noch keine Strecke im Betrieb.</p>';
  html += panel('Profitabilität je Strecke', 'routes', prof, rows.length ? `gesamt ${eur(rows.reduce((a, x) => a + x.d, 0), { plus: true })}/Tag` : '');
  // Monatsergebnisse
  const ms = L.months.slice(-11).map((m) => ({ lab: MONTHS[m.label.m], v: pnlCol(m.acc).net })).concat([{ lab: MONTHS[dateParts(W.day).m] + '*', v: cur.net }]);
  const mMax = Math.max(1, ...ms.map((x) => Math.abs(x.v)));
  html += panel('Ergebnis je Monat', 'finance', `<div class="mbars">${ms.map((x) => `<div class="mb" title="${x.lab}: ${eur(x.v, { plus: true })}"><span class="mb-up">${x.v > 0 ? `<i class="pos" style="height:${(x.v / mMax * 100).toFixed(0)}%"></i>` : ''}</span><span class="mb-dn">${x.v < 0 ? `<i class="neg" style="height:${(-x.v / mMax * 100).toFixed(0)}%"></i>` : ''}</span><em>${x.lab}</em></div>`).join('')}</div>
    <p class="small muted">Jahresüberschuss je Monat, * = laufender Monat. Seit Start: <b class="${sgn(pnlCol(L.pnl).net)}">${eur(pnlCol(L.pnl).net, { plus: true })}</b>.</p>`);
  // Auslastung je Strecke
  const lfRows = s30.filter((x) => x.s.n).sort((a, b) => b.s.lf - a.s.lf);
  html += panel('Auslastung je Strecke', 'routes', lfRows.length ? `<div class="dbars">${lfRows.slice(0, 10).map((x) => { const sp = x.s.demand ? x.s.spill / x.s.demand : 0;
      return `<div class="dbar" title="${x.r.base}–${x.r.dest}: ${pct(x.s.lf)} Auslastung, ${pct(sp)} der Nachfrage abgewiesen"><span class="dl">${x.r.base}–${x.r.dest}</span><span class="dtrack"><i class="${x.s.lf < 0.65 ? 'warn' : 'me'}" style="width:${(x.s.lf * 100).toFixed(0)}%"></i><b class="tgt" style="left:80%"></b></span><span class="dv">${pct(x.s.lf)}${sp > 0.08 ? ' <span class="chip warn" title="Viele Abweisungen – Preis oder Frequenz erhöhen">voll</span>' : ''}</span></div>`; }).join('')}</div>
      <p class="small muted">Letzte 30 Tage, Strich bei 80 %. „voll“: mehr als 8 % der Nachfrage abgewiesen – Preis oder Frequenz erhöhen. Unter 65 % (gelb): Preis zu hoch oder Konkurrenz zu stark.</p>` : '<p class="small muted">Noch keine Flüge.</p>');
  // Personal
  const sp = staffPlan(pl), st = pl.staff;
  const staffRows = sp.map((r) => { const cov = r.need ? (r.have) / r.need : 1, w = Math.min(1.3, cov) / 1.3 * 100;
    return `<div class="dbar" title="${r.label}: ${n0(r.have)} da, Bedarf ${n0(Math.ceil(r.need))}${r.pipe ? `, ${n0(r.pipe)} kommen` : ''}"><span class="dl">${r.role === 'pilot' ? 'Piloten ' + esc(r.group) : r.role === 'cabin' ? 'Kabine' : 'Technik'}</span><span class="dtrack"><i class="${cov < 0.95 ? 'crit' : cov < 1.05 ? 'warn' : 'pos'}" style="width:${w.toFixed(0)}%"></i><b class="tgt" style="left:${(100 / 1.3).toFixed(1)}%"></b></span><span class="dv">${n0(r.have)} / ${n0(Math.ceil(r.need))}${r.pipe ? ` <span class="muted">+${n0(r.pipe)}</span>` : ''}</span></div>`; }).join('');
  const short = sp.filter((r) => r.have + r.pipe < r.need);
  html += panel('Personal', 'staff', `<div class="dbars">${staffRows}
      <div class="dbar" title="Stimmung ${pct(st.morale)}"><span class="dl">Stimmung</span><span class="dtrack"><i class="${st.morale < 0.55 ? 'crit' : st.morale < 0.65 ? 'warn' : 'pos'}" style="width:${(st.morale * 100).toFixed(0)}%"></i><b class="tgt" style="left:55%"></b></span><span class="dv">${pct(st.morale)}</span></div></div>
    <p class="small muted">Balken: vorhanden gegen Bedarf (Strich = 100 %), „+“ = in Einstellung. Gehalt ${pct(st.pay / wageNow() - 1).replace(/^(?!-|−)/, '+')} zum Marktlohn.${short.length ? ` <b class="neg">Es fehlen ${short.map((r) => `${n0(Math.ceil(r.need - r.have - r.pipe))} ${r.label}`).join(', ')}</b> – bis dahin fliegt teures Agenturpersonal.` : ''}</p>
    ${short.length ? '<button class="btn small primary" data-act="fillstaff">Bedarf plus 10 % decken</button>' : ''}`);
  // Flotte
  W.operableFreq(pl);
  const fl = pl.fleet, delivered = fl.filter((a) => a.delivery_day <= W.day), maint = delivered.filter((a) => (a.status === 'ccheck' || a.status === 'aog') && a.until > W.day), idle = delivered.filter((a) => !(a.used_hours > 0) && !(a.acmi && a.acmi.end > W.day) && !maint.includes(a));
  const util = delivered.length ? delivered.reduce((a, x) => a + Math.min(1, (x.used_hours || 0) / SM.winOf(x.type_id)), 0) / delivered.length : null;
  const coming = fl.filter((a) => a.delivery_day > W.day).sort((a, b) => a.delivery_day - b.delivery_day);
  const checks = delivered.filter((a) => P.CCHECK_FH - (a.fh - a.lastC) < 300).length;
  html += panel('Flotte', 'fleetOwn', `<div class="tiles">
      ${tile('Flugzeuge', n0(fl.length), '', `${delivered.length} im Dienst${coming.length ? `, ${coming.length} in Lieferung` : ''}`)}
      ${tile('Nutzung', util === null ? '–' : pct(util), util !== null && util < 0.5 ? 'warnc' : '', 'vom Betriebsfenster')}
      ${tile('Ungenutzt', n0(idle.length), idle.length ? 'warnc' : '', idle.length ? 'kosten trotzdem jeden Tag' : maint.length ? `${maint.length} in Wartung` : 'alle fliegen')}
    </div>
    ${idle.length ? `<p class="small">Ohne Einsatz: ${idle.slice(0, 6).map((a) => `<b>${acName(a.id)}</b> ${a.type_id}`).join(', ')}${idle.length > 6 ? ' …' : ''} <button class="btn small" data-act="plan">Strecke planen</button></p>` : ''}
    <p class="small muted">${coming.length ? `Nächste Lieferung: ${tl(coming[0].type_id)} am ${dateShort(coming[0].delivery_day)}. ` : ''}${maint.length ? `${maint.length} in Wartung bis ${dateShort(Math.max(...maint.map((a) => a.until)))} – in der Zeit fallen Flüge aus, wenn keine Reserve da ist. ` : ''}${checks ? `${checks} C-Check${checks > 1 ? 's' : ''} in Kürze. ` : ''}</p>`);
  // Markt und Risiko
  const att = pl.events.filter((e) => /greift Ihre Strecke/.test(e.msg) && e.day >= W.day - 60).length;
  const poach = pl.events.filter((e) => /abgeworben|wechselt zu/.test(e.msg) && e.day >= W.day - 60).length;
  const evs = W.activeEvents().filter((e) => stationsOf(pl).some((c) => W.eventAffects(e, c))).length;
  html += panel('Markt und Risiko', 'world', `<div class="tiles">
      ${tile('Angriffe 60 Tage', n0(att), att ? 'warnc' : '', 'KI auf Ihren Strecken')}
      ${tile('Abwerbungen 60 Tage', n0(poach), poach ? 'warnc' : '', 'Personal und Fachkräfte')}
      ${tile('Ereignisse', n0(evs), evs ? 'warnc' : '', 'betreffen Ihre Stationen')}
    </div>
    <p class="small muted">Konkurrenz: ${esc((SM.RIVALS[W.rivals] || SM.RIVALS.normal).label)} · Banken ${(W.macro.bank ?? 1) < 0.9 ? 'vorsichtig' : 'offen'} · Kerosin ${NF3.format(W.fuelPrice)} €/kg · Dispo ${eur(-pl.creditUsed)} von ${eur(-pl.creditLimit(W.macro.bank ?? 1))}.</p>`);
  html += '</div>';
  return html;
};
VIEWS.cockpit = function viewCockpit() {
  const pl = W.player, bs = SM.balanceSheet(pl), routes = pl.activeRoutes();
  const st7 = routes.map((r) => rstats(r, 7)), st30 = routes.map((r) => rstats(r, 30));
  const seats = st7.reduce((s, x) => s + x.seats, 0), pax = st7.reduce((s, x) => s + x.pax, 0);
  const db2 = st30.reduce((s, x) => s + x.db2 / Math.max(x.n, 1), 0);
  const otp = playerOtp();
  const last = pl.ledger.months.at(-1);
  const lastRes = last ? Object.entries(last.acc).filter(([k]) => !k.startsWith('cf_')).reduce((s, [, v]) => s + v, 0) / 100 : null;
  let html = `<h2 class="sec">Übersicht <small>${dateLong(W.day)}</small></h2>`;
  html += `<div class="only-narrow">${assistantCard()}</div>`;
  for (const d of openDecisions()) html += decisionCard(d);
  html += playersCard();
  const staffed = SM.sumObj(pl.staff.pil) + pl.staff.cab + pl.staff.pipeline.length > 0;
  const steps = [
    [pl.fleet.length > 0, 'Flugzeug beschaffen', 'Unter Flotte → Beschaffung leasen oder gebraucht kaufen. Leasing schont den Kontostand.', 'fleetBuy'],
    [routes.length > 0, 'Erste Strecke planen', 'Ziel auf der Karte antippen oder unter Strecken → Planung. Die Prognose rechnet mit Ihren echten Kosten.', 'plan'],
    [staffed, 'Personal einstellen', 'Unter Unternehmen → Personal. Bis die Leute anfangen, springt teures Agenturpersonal ein.', 'staff'],
    [W.day > 20 && routes.length > 0, 'Zeit laufen lassen', ui.mp ? 'Die Spielleitung stellt oben das Tempo ein, von 1 Stunde bis 3 Sekunden pro Spieltag.' : 'Oben Tempo wählen und auf Weiter drücken: von 1 Stunde pro Spieltag bis Turbo.', null],
  ];
  if (steps.some((s) => !s[0])) {
    html += `<div class="card pad stack"><div class="spread"><h3>Erste Schritte</h3><span class="row" style="gap:6px"><button class="btn small" data-act="tour">Rundgang</button><button class="btn small" data-act="guide">Anleitung</button></span></div>${steps.map(([done, t, d, tab], i) => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="chip ${done ? 'good' : ''}" style="min-width:26px;justify-content:center">${done ? '✓' : i + 1}</span><div style="min-width:0"><b>${t}</b><div class="small muted">${d}</div></div>${!done && tab ? `<button class="btn small" data-act="tab" data-tab="${tab}" style="margin-left:auto">Öffnen</button>` : ''}</div>`).join('')}</div>`;
  }
  const cov = pl.staff.cov;
  if (cov && routes.length) {
    const canc = Object.entries(cov.cancel).filter(([, v]) => v > 0);
    if (canc.length) html += `<div class="callout crit"><b>Personalmangel</b>Heute fallen Flüge aus, weil Crews fehlen${pl.staff.agency ? '' : ' und Agenturpersonal abgeschaltet ist'}. <button class="btn small" data-act="tab" data-tab="staff">Personal öffnen</button></div>`;
    else if (cov.agencyH > 0) html += `<div class="callout warn"><b>Agenturpersonal im Einsatz</b>Heute ${n0(cov.agencyH)} Crew-Stunden über Agenturen zum 1,6-fachen Stundensatz. Mehrkosten ${eur(cov.extraCost)} pro Tag. <button class="btn small" data-act="tab" data-tab="staff">Personal öffnen</button></div>`;
  }
  const warns = pl.events.filter((e) => (e.kind === 'warn' || e.kind === 'crit') && e.day >= W.day - 10).slice(-3).reverse();
  for (const e of warns) html += `<div class="callout ${e.kind}"><b>${dateShort(e.day)}</b>${esc(e.msg)}</div>`;
  if (pl.status === 'restructuring') html += `<div class="callout crit"><b>Restrukturierung läuft</b>Ohne positiven Kontostand innerhalb von ${P.INSOLVENCY_AFTER_DAYS - pl.distressDays} Tagen folgt die Insolvenz. Verlustbringer schließen, Flugzeuge abgeben oder einen Kredit aufnehmen.</div>`;
  const stg = pl.stage(), next = P.STAGES.find((s) => s.min > pl.fleet.length);
  html += `<div class="tiles">
    <div class="tile"><span>Kontostand</span><b class="${netCash(pl) < 0 ? 'neg' : ''}">${eur(netCash(pl))}</b><em>Dispo bis ${eur(-pl.creditLimit(W.macro.bank ?? 1))} · frei ${eur(pl.spendable(W.macro.bank ?? 1))}</em></div>
    <div class="tile"><span>Eigenkapital</span><b>${eur(bs.equity)}</b><em>Start ${eur(pl.ledger.equityContrib / 100)}</em></div>
    <div class="tile"><span>Reichweite</span><b class="${pl.runway < 60 ? 'warnc' : ''}">${pl.runway === undefined || !isFinite(pl.runway) ? 'stabil' : `${n0(pl.runway)} Tage`}</b><em>beim Abfluss der letzten 30 Tage</em></div>
    <div class="tile"><span>Auslastung 7 T.</span><b>${seats ? pct(pax / seats) : '–'}</b><em>${n0(pax / 7)} Pax pro Tag</em></div>
    <div class="tile"><span>Pünktlichkeit</span><b>${otp === null ? '–' : pct(otp)}</b><em>letzte 60 Flüge</em></div>
    <div class="tile"><span>Streckenbeitrag</span><b class="${db2 < 0 ? 'neg' : 'pos'}">${routes.length ? eur(db2, { plus: true }) : '–'}</b><em>pro Tag, Ø 30 Tage</em></div>
    <div class="tile"><span>Marke</span><b>${n0(pl.brand * 100)} / 100</b><em>Wettbewerber 60–70</em></div>
    <div class="tile"><span>Stimmung</span><b class="${pl.staff.morale < 0.5 ? 'warnc' : ''}">${pct(pl.staff.morale)}</b><em>unter 55 % droht Streik</em></div>
    <div class="tile"><span>Stufe</span><b>${stg.label}</b><em>${next ? `${next.label} ab ${next.min} Flugzeugen` : 'höchste Stufe'}</em></div>
  </div>`;
  if (last) html += `<p class="small ink2">Abgeschlossener Monat ${MONTHS_L[last.label.m]} ${2027 + last.label.y}: Ergebnis <b class="${lastRes < 0 ? 'neg' : 'pos'}">${eur(lastRes, { plus: true })}</b>.</p>`;
  const evs = W.activeEvents().concat(W.upcomingEvents()).filter((e) => e.type !== 'rate_change' && e.type !== 'fx_shock').slice(-4);
  if (evs.length) html += `<div class="stack"><h2 class="sec">Lage <small>laufende und angekündigte Ereignisse</small></h2><div class="news">${evs.map(eventRow).join('')}</div></div>`;
  html += `<div class="stack"><h2 class="sec">Kontostand <small>letzte ${Math.min(netHistOf(pl).length, 365)} Tage</small></h2>${sparkline(netHistOf(pl).slice(-365))}</div>`;
  if (routes.length) {
    const rows = routes.map((r, i) => ({ r, s: st30[i] })).sort((a, b) => b.s.db2 / Math.max(b.s.n, 1) - a.s.db2 / Math.max(a.s.n, 1));
    html += `<div class="stack"><h2 class="sec">Strecken nach Beitrag <small>Ø 30 Tage</small></h2><div class="tw"><table class="t"><thead><tr><th>Strecke</th><th class="r">Auslastung</th><th class="r">Ø Tarif</th><th class="r">DB2/Tag</th></tr></thead><tbody>
      ${rows.map(({ r, s }) => `<tr><td><a href="#" data-act="openroute" data-id="${r.id}">${r.base}–${r.dest}</a> <span class="muted small">${n0(SM.gcDistanceKm(r.base, r.dest))} km · ${r.freq}x ${tlx(r.type_id)}</span></td><td class="r">${s.n ? pct(s.lf) : '–'}</td><td class="r">${s.n ? eur(s.avgFare) : '–'}</td><td class="r ${s.db2 < 0 ? 'neg' : 'pos'}">${s.n ? eur(s.db2 / s.n, { plus: true }) : 'neu'}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  }
  const news = mergedNews().slice(0, 5);
  if (news.length) html += `<div class="stack"><h2 class="sec">Neueste Meldungen</h2><div class="news">${news.map(newsRow).join('')}</div></div>`;
  return html;
};
function decisionCard(d) {
  const pl = W.player, monthly = pl.staffMonthly(cpi());
  return `<div class="callout crit"><b>Entscheidung bis ${dateShort(d.deadline)}</b><span>${esc(d.text)}</span>
    <div class="stack small" style="margin-top:6px">
      <div class="row"><button class="btn small primary" data-act="decide" data-id="${d.id}" data-choice="raise5">5 % mehr Gehalt</button><span class="muted">dauerhaft ${eur(monthly * 0.05)} pro Monat, Streik abgesagt, Stimmung +12</span></div>
      <div class="row"><button class="btn small" data-act="decide" data-id="${d.id}" data-choice="bonus">Einmalzahlung</button><span class="muted">${eur(monthly * 0.5)} sofort, wird mit 60 % Wahrscheinlichkeit angenommen</span></div>
      <div class="row"><button class="btn small danger" data-act="decide" data-id="${d.id}" data-choice="reject">Ablehnen</button><span class="muted">Streik findet statt, Stimmung −5</span></div>
    </div></div>`;
}
function sparkline(vals) {
  if (vals.length < 2) return '<p class="small muted">Der Verlauf erscheint nach den ersten Spieltagen.</p>';
  const vmin = Math.min(...vals), vmax = Math.max(...vals), pad = Math.max((vmax - vmin) * 0.15, Math.abs(vmax) * 0.01, 1);
  const w = 400, h = 70, lo = vmin < 0 ? Math.min(vmin, 0) - pad : vmin - pad, hi = vmax + pad, span = hi - lo || 1;
  const x = (i) => (i / (vals.length - 1)) * w, y = (v) => h - 6 - ((v - lo) / span) * (h - 14);
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const zero = lo < 0 ? `<line x1="0" x2="${w}" y1="${y(0)}" y2="${y(0)}" stroke="var(--crit)" stroke-dasharray="3 3" stroke-width="1"/>` : '';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Verlauf Kontostand, aktuell ${eur(vals.at(-1))}">
    <path d="${d} L${w},${h} L0,${h}Z" fill="var(--accent-soft)"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.8" vector-effect="non-scaling-stroke"/>${zero}
    <circle cx="${x(vals.length - 1)}" cy="${y(vals.at(-1))}" r="3" fill="var(--accent)"/></svg>
    <div class="spread small muted"><span>min. ${eur(Math.min(...vals))}</span><span>aktuell ${eur(vals.at(-1))}</span></div>`;
}

// ---------- Strecken ----------
function fleetFree(typeId, base, horizon = P.LEASE_DELIVERY_DAYS) {
  const pl = W.player, { used } = pl.plan(W.day, null, horizon);
  return pl.fleet.filter((a) => a.type_id === typeId && a.base === base && pl.available(a, W.day, horizon))
    .map((a) => ({ a, free: SM.winOf(typeId) - (used[a.id] || 0) }));
}
function defaultPlanner(dest, base = null) {
  const pl = W.player;
  base = base || (pl.bases.includes(ui.selBase) ? ui.selBase : pl.bases[0]);
  if (dest === base || !dest) dest = bestFreeDest(base);
  const types = [...new Set(pl.fleet.filter((a) => a.base === base).map((a) => a.type_id))];
  let type = types.find((t) => SM.rangeOk(base, dest, t)) || 'A20N';
  if (!SM.rangeOk(base, dest, type)) type = 'A20N';
  const st = pl.stations[dest];
  return { base, dest, type, freq: 1, service: 'standard', buffer: 'normal', fo: Math.round(SM.refPrice(base, dest, cpi())), fi: Math.round(SM.refPrice(dest, base, cpi())),
    auto: true, target: 0.85, term: st ? st.terminal : 'std' };
}
VIEWS.routes = function viewRoutes() {
  const pl = W.player, routes = pl.routes.filter((r) => !r.closed);
  const s30 = routes.map((r) => rstats(r, 30)), db = s30.reduce((a, x) => a + x.db2 / Math.max(x.n, 1), 0);
  let html = `<div class="spread"><h2 class="sec">Ihr Netz <small>${routes.length} Strecken${routes.length ? ` · DB2 ${eur(db, { plus: true })} pro Tag` : ''}</small></h2><button class="btn primary" data-act="plan">Neue Strecke planen</button></div>`;
  if (!routes.length) html += `<div class="callout info">Noch keine Strecke. Wählen Sie ein Ziel auf der Karte oder öffnen Sie die Planung. Sie brauchen dafür ein Flugzeug an Ihrer Basis.</div>`;
  else html += `<div class="rlist">${routes.map(routeItem).join('')}</div>`;
  return html;
};
VIEWS.plan = function viewPlan() {
  if (!ui.planner) { const pl = W.player; ui.planner = defaultPlanner(ui.selApt && !pl.bases.includes(ui.selApt) ? ui.selApt : null); ui.selApt = ui.planner.dest; setTimeout(() => { renderDraft(); renderMapRoutes(true); }, 0); }
  return viewPlanner();
};
function routeItem(r) {
  const s7 = rstats(r, 7), s30 = rstats(r, 30), open = ui.expanded === r.id;
  const waiting = W.day < r.opened_day ? `startet ${dateShort(r.opened_day)}` : r.partial ? `Teilbetrieb: fliegt an ${pct(r.partial)} der Tage` : (r.flyingToday || 0) < r.freq ? `${r.flyingToday || 0} von ${r.freq} Umläufen haben ein Flugzeug` : null;
  const lfo = SM.routeLf(r, 7, 'out'), lfi = SM.routeLf(r, 7, 'in');
  let html = `<div class="ritem${open ? ' open' : ''}"><button class="rhead" data-act="toggle" data-id="${r.id}" aria-expanded="${open}">
    <div><div class="rcode">${r.base}<span class="arr">⇄</span>${r.dest}</div><div class="rmeta">${apName(r.dest)} · ${n0(SM.gcDistanceKm(r.base, r.dest))} km · ${n1(SM.blockHours(r.base, r.dest, r.type_id))} h · ${r.freq}x täglich · ${tlx(r.type_id)} · ${svcLabel(r.service)} ${waiting ? `· <span class="warnc">${waiting}</span>` : ''}</div></div>
    <div class="rdb ${s30.db2 < 0 ? 'neg' : 'pos'}">${s30.n ? eur(s30.db2 / s30.n, { plus: true }) : '–'}<small>DB2 pro Tag</small></div>
    <div class="lfrow"><span>hin</span><div class="bar"><i class="me" style="width:${(lfo * 100).toFixed(0)}%"></i></div><span class="num">${s7.n ? pct(lfo) : '–'}</span></div>
    <div class="lfrow"><span>zurück</span><div class="bar"><i class="me" style="width:${(lfi * 100).toFixed(0)}%"></i></div><span class="num">${s7.n ? pct(lfi) : '–'}</span></div>
  </button>`;
  if (open) html += routeBody(r, s7, s30);
  return html + '</div>';
}
function insights(r, s7, s30) {
  const out = [], pl = W.player;
  { const h = pl.rotH(r), w = SM.winOf(r.type_id); if (h > w) { const k = Math.ceil(h / w), have = pl.fleet.filter((a) => a.type_id === r.type_id && a.base === r.base && a.delivery_day <= W.day).length;
    if (r.partial) out.push(['warn', `Langstrecke: Ein Umlauf dauert ${n1(h)} Stunden, ein Flugzeug ist ${k} Tage unterwegs. Für täglichen Betrieb braucht es ${k} Flugzeuge (${tl(r.type_id)} in ${r.base}); mit ${have} fliegt die Strecke an ${pct(r.partial)} der Tage.`]);
    else out.push(['info', `Langstrecke: Ein Umlauf dauert ${n1(h)} Stunden und bindet ${k} Flugzeuge pro täglichem Flug.`]); } }
  const ramp = r.ramp(W.day, pl.rampT());
  if (ramp < 0.9 && W.day >= r.opened_day) out.push(['info', `Markthochlauf: Die Strecke ist erst zu ${pct(ramp)} bekannt. Marketing und eine Marketingfachkraft beschleunigen das.`]);
  if (s7.demand > 0 && s7.spill / s7.demand > 0.06) out.push(['good', `Ø ${n0(s7.spill / 7)} Reisende pro Tag finden keinen Platz. Preis erhöhen oder Frequenz ausbauen.`]);
  if (s30.n >= 14 && s30.lf < 0.6) out.push(['warn', `Nur ${pct(s30.lf)} Auslastung. Preis senken, kleineres Flugzeug oder weniger Frequenz prüfen.`]);
  if (s30.n >= 14 && s30.db1 > 0 && s30.db2 < 0) out.push(['warn', 'Deckt die direkten Flugkosten, aber nicht die Flugzeugzeit. Lohnt nur, wenn das Flugzeug sonst leer stünde.']);
  if (s30.n >= 14 && s30.db1 < 0) out.push(['crit', 'Deckt nicht einmal die direkten Flugkosten. Jeder Flug verbrennt Geld.']);
  if (s30.tr > 0) out.push(['info', `Ø ${n0(s30.tr / Math.max(s30.n, 1))} Umsteiger pro Tag über Ihre Basis ${r.base}. Ihr Erlösanteil richtet sich nach der Flugstrecke.`]);
  const comp = W.competitorOffers(W.playerId, r.base, r.dest);
  const cheap = comp.filter((c) => c.fare < r.fare_out * 0.9);
  if (cheap.length) { const c = cheap.sort((a, b) => a.fare - b.fare)[0]; out.push(['warn', `${W.airlines[c.airline].name} fliegt dieselbe Strecke ${pct(1 - c.fare / r.fare_out)} günstiger (${eur(c.fare)}).`]); }
  if (s30.flights && s30.cancelled) out.push(['info', `${s30.cancelled} Flugausfälle in 30 Tagen (Technik, Wetter, Streik oder Personal). Betreuung und Entschädigung sind gebucht.`]);
  return out;
}
function routeBody(r, s7, s30) {
  const comp = W.competitorOffers(W.playerId, r.base, r.dest);
  const c = ui.confirm === 'close:' + r.id;
  const pend = r.pending.length ? `<p class="small warnc">Neue Preise ${n0(r.pending.at(-1)[1])} / ${n0(r.pending.at(-1)[2])} € gelten ab ${dateShort(r.pending.at(-1)[0])}.</p>` : '';
  const ins = insights(r, s7, s30);
  const n = Math.max(s30.n, 1);
  return `<div class="rbody">
    ${ins.map(([k, t]) => `<div class="callout ${k}">${esc(t)}</div>`).join('')}
    <div class="fc">
      <div><span>Erlös pro Tag</span><b>${eur(s30.rev / n)}</b><em>Tickets, Zusatzleistungen, Fracht</em></div>
      <div><span>Direkte Kosten</span><b>${eur(-s30.cost / n)}</b><em>Treibstoff, Gebühren, Spesen …</em></div>
      <div><span>DB1 pro Tag</span><b class="${s30.db1 < 0 ? 'neg' : 'pos'}">${eur(s30.db1 / n, { plus: true })}</b><em>nach direkten Kosten</em></div>
      <div><span>DB2 pro Tag</span><b class="${s30.db2 < 0 ? 'neg' : 'pos'}">${eur(s30.db2 / n, { plus: true })}</b><em>nach anteiliger Flugzeugzeit</em></div>
      <div><span>Ø Ticketpreis</span><b>${s30.n ? eur(s30.avgFare) : '–'}</b><em>netto, ohne Steuer</em></div>
      <div><span>Pünktlich</span><b>${s30.otp === null ? '–' : pct(s30.otp)}</b><em>${n0(s30.flights)} Flüge in ${s30.n} Tagen</em></div>
    </div>
    <p class="small">Heute im Einsatz: ${(() => { const acs = W.player.fleet.filter((x) => (x.assigned || []).includes(r.id)); return acs.length ? acs.map((x) => `<a href="#" data-act="asgopen" data-id="${x.id}">${acName(x.id)}</a> <span class="muted">(${n1(W.player.acAge(x, W.day))} J.${acMode(x) === 'manual' ? ', fest' : acMode(x) === 'reserve' ? ', Reserve' : ''})</span>`).join(', ') : '<span class="warnc">kein Flugzeug</span>'; })()}</p>
    <p class="small muted">Gehälter des Stammpersonals stehen nicht im Streckenbeitrag, sondern in den Personalkosten. Im DB2 ist die Flugzeugzeit mit Standard-Leasingrate angesetzt.</p>
    <div class="stack">
      <h3>Preise und Angebot</h3>
      <div class="grid2">
        <label class="f"><span>Tarif ${r.base} → ${r.dest} (€)</span><input type="number" id="ef-o-${r.id}" min="10" max="900" step="5" value="${Math.round(r.fare_out)}"></label>
        <label class="f"><span>Tarif ${r.dest} → ${r.base} (€)</span><input type="number" id="ef-i-${r.id}" min="10" max="900" step="5" value="${Math.round(r.fare_in)}"></label>
      </div>
      <div class="row">
        <label class="f" style="flex:1"><span>Frequenz pro Tag</span><select id="ef-f-${r.id}">${[1, 2, 3, 4, 5, 6].map((f) => `<option ${f === r.freq ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label class="f" style="flex:1"><span>Produkt</span><select id="ef-s-${r.id}">${Object.keys(P.SERVICE).map((s) => `<option value="${s}" ${s === r.service ? 'selected' : ''}>${svcLabel(s)}</option>`).join('')}</select></label>
        <label class="f" style="flex:1"><span>Flugzeugtyp</span><select id="ef-ty-${r.id}">${[...new Set([r.type_id, ...W.player.fleet.filter((x) => x.base === r.base).map((x) => x.type_id)])].filter((t) => SM.rangeOk(r.base, r.dest, t)).map((t) => `<option value="${t}" ${t === r.type_id ? 'selected' : ''}>${t} · ${P.AIRCRAFT_TYPES[t].seats[r.service]} Sitze</option>`).join('')}</select></label>
        <label class="f" style="flex:1"><span>Puffer</span><select id="ef-b-${r.id}">${Object.keys(P.BUFFER_POLICY).map((b) => `<option value="${b}" ${b === r.buffer ? 'selected' : ''}>${bufLabel(b)}</option>`).join('')}</select></label>
      </div>
      <p class="small muted">Preise steuern Sie selbst – es gibt keine Automatik. Die Konkurrenz beobachtet Ihre Tarife und reagiert jede Woche.</p>
      ${pend}
      <div class="row"><button class="btn primary" data-act="applyroute" data-id="${r.id}">Änderungen übernehmen</button>
        ${c ? `<span class="small">Strecke wirklich einstellen?</span><button class="btn danger small" data-act="closeroute" data-id="${r.id}">Ja, einstellen</button><button class="btn small" data-act="cancelconfirm">Abbrechen</button>`
    : `<button class="btn danger" data-act="askclose" data-id="${r.id}" style="margin-left:auto">Strecke einstellen</button>`}</div>
      <p class="small muted">Preise wirken nach ${P.PRICE_CHANGE_LAG_DAYS} Tagen (Buchungsvorlauf). Mehr Frequenz braucht freie Flugzeugzeit, Crews und an koordinierten Flughäfen freie Slots.</p>
    </div>
    <div class="stack"><h3>Wettbewerb auf ${r.base}–${r.dest}</h3>${comp.length ? `<table class="t"><thead><tr><th>Airline</th><th class="r">Flüge/Tag</th><th class="r">Tarif hin</th><th>Produkt</th><th></th></tr></thead><tbody>${comp.map((o) => { const a = W.airlines[o.airline]; return `<tr><td><span class="sw" style="background:${colorOf(a)}"></span> ${esc(a.name)}</td><td class="r">${o.freq}</td><td class="r">${eur(o.fare)}</td><td>${svcLabel(o.service)}</td><td class="r">${a && a.id !== W.playerId && W.airlines[o.airline] ? `<button class="btn small" data-act="dealexit" data-al="${a.id}" data-pair="${SM.pairKey(r.base, r.dest)}" title="Ablöse für den Rückzug anbieten">Rückzug verhandeln</button>` : ''}</td></tr>`; }).join('')}</tbody></table>` : '<p class="small muted">Keine Direktkonkurrenz. Ab 900 km konkurrieren Sie mit Umsteigeverbindungen über fremde Drehkreuze.</p>'}</div>
  </div>`;
}

// Planer
function viewPlanner() {
  const p = ui.planner, pl = W.player, base = p.base;
  const dests = SM.AP_CODES.filter((c) => c !== base && SM.routeKmOk(base, c));
  const types = Object.keys(P.AIRCRAFT_TYPES);
  const st = pl.stations[p.dest];
  return `<div class="card pad stack" id="planner">
    <div class="spread"><h2 class="sec">Neue Strecke ${base}–${p.dest} <small>${n0(SM.gcDistanceKm(base, p.dest))} km · ${n1(SM.blockHours(base, p.dest, p.type))} h Flugzeit</small></h2><button class="btn small" data-act="closeplan">Verwerfen</button></div>
    <p class="small muted">Tipp: Ein Flughafen auf der Karte setzt das Ziel.</p>
    <div class="grid2">
      ${pl.bases.length > 1 ? `<label class="f"><span>Basis</span><select id="pl-base">${pl.bases.map((b) => `<option value="${b}" ${b === base ? 'selected' : ''}>${b} · ${apName(b)}</option>`).join('')}</select></label>` : ''}
      <label class="f"><span>Ziel</span><select id="pl-dest">${byRegion(dests).map(([rg, l]) => `<optgroup label="${esc(rg)}">${l.map((c) => `<option value="${c}" ${c === p.dest ? 'selected' : ''}>${esc(apName(c))} ${c} (${n0(SM.gcDistanceKm(base, c))} km)</option>`).join('')}</optgroup>`).join('')}</select></label>
      <label class="f"><span>Flugzeugtyp <span class="acl small" role="button" tabindex="0" data-acinfo="${p.type}">Datenblatt</span></span><select id="pl-type">${(() => {
        const opt = (t, ownTxt) => { const ok = SM.rangeOk(base, p.dest, t); return `<option value="${t}" ${t === p.type ? 'selected' : ''} ${ok ? '' : 'disabled'} ${ownTxt ? 'class="own"' : ''}>${ownTxt ? '★ ' : ''}${t} · ${P.AIRCRAFT_TYPES[t].label}${ownTxt}${ok ? '' : ' · Reichweite zu kurz'}</option>`; };
        const own = types.filter((t) => pl.fleet.some((a) => a.type_id === t)), rest = types.filter((t) => !own.includes(t));
        const ownTxt = (t) => { const here = pl.fleet.filter((a) => a.type_id === t && a.base === base).length, all = pl.fleet.filter((a) => a.type_id === t).length; return ` · ${here ? `${here} an ${base}` : ''}${all > here ? `${here ? ', ' : ''}${all - here} anderswo` : ''}`; };
        return (own.length ? `<optgroup label="Ihre Flugzeuge">${own.map((t) => opt(t, ownTxt(t))).join('')}</optgroup><optgroup label="Weitere Typen (noch beschaffen)">` : '') + rest.map((t) => opt(t, '')).join('') + (own.length ? '</optgroup>' : '');
      })()}</select></label>
      <label class="f"><span>Terminal in ${p.dest}</span><select id="pl-term" ${st ? 'disabled' : ''}>${Object.entries(P.TERMINALS).map(([k, t]) => `<option value="${k}" ${k === p.term ? 'selected' : ''}>${t.label} · ${eur(t.rent * SM.apx(p.dest).cost * cpi())}/Mon.</option>`).join('')}</select></label>
    </div>
    ${(() => { const own = [...new Set(pl.fleet.map((a) => a.type_id))]; return own.length ? `<div class="owntypes"><span class="small muted">Ihre Flugzeuge:</span>${own.map((t) => { const here = pl.fleet.filter((a) => a.type_id === t && a.base === base).length, ok = SM.rangeOk(base, p.dest, t); return `<button class="ownt${t === p.type ? ' on' : ''}" data-act="pltype" data-t="${t}" ${ok ? '' : 'disabled title="Reichweite zu kurz"'}><b>${esc(tl(t))}</b><span>${here} an ${base}</span></button>`; }).join('')}</div>` : ''; })()}
    <div class="grid3">
      <label class="f"><span>Flüge pro Tag</span><select id="pl-freq">${[1, 2, 3, 4, 5, 6].map((f) => `<option ${f === p.freq ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      <label class="f"><span>Produkt</span><select id="pl-svc">${Object.keys(P.SERVICE).map((s) => `<option value="${s}" ${s === p.service ? 'selected' : ''}>${svcLabel(s)}</option>`).join('')}</select></label>
      <label class="f"><span>Puffer</span><select id="pl-buf">${Object.keys(P.BUFFER_POLICY).map((b) => `<option value="${b}" ${b === p.buffer ? 'selected' : ''}>${bufLabel(b)} (${pct(P.BUFFER_POLICY[b].otp)} pünktlich)</option>`).join('')}</select></label>
    </div>
    <div class="grid2">
      <label class="f"><span>Tarif ${base} → ${p.dest} (€ netto)</span><input type="number" id="pl-fo" min="10" max="900" step="5" value="${p.fo}"></label>
      <label class="f"><span>Tarif ${p.dest} → ${base} (€ netto)</span><input type="number" id="pl-fi" min="10" max="900" step="5" value="${p.fi}"></label>
    </div>
    <div class="row"><button class="btn small" data-act="suggest">Preisvorschlag aus der Prognose</button><span class="small muted">Die Prognose kennt die Reaktion der Konkurrenz nicht.</span></div>
    ${st ? `<p class="small muted">In ${p.dest} haben Sie schon eine Station (${P.TERMINALS[st.terminal].label}). Ändern im Tab Stationen.</p>` : ''}
    <div id="forecast"><p class="small muted">Prognose wird berechnet …</p></div>
  </div>`;
}
function readPlanner() {
  const p = ui.planner; if (!p) return false;
  const v = (id) => $(id) && $(id).value;
  const nb = v('#pl-base');
  if (nb && nb !== p.base) { const keep = { freq: p.freq, service: p.service, buffer: p.buffer }; ui.planner = { ...defaultPlanner(p.dest === nb ? null : p.dest, nb), ...keep }; return true; }
  const nd = v('#pl-dest');
  if (nd && nd !== p.dest) { const keep = { freq: p.freq, service: p.service, buffer: p.buffer }; ui.planner = { ...defaultPlanner(nd, p.base), ...keep }; ui.selApt = nd; return true; }
  p.type = v('#pl-type') || p.type; p.freq = Number(v('#pl-freq') || p.freq); p.service = v('#pl-svc') || p.service; p.buffer = v('#pl-buf') || p.buffer;
  p.term = v('#pl-term') || p.term;
  { const acq = document.querySelector('input[name="pl-acq"]:checked'); if (acq) p.acq = acq.value; const hb = $('#pl-hire'); if (hb) p.hire = hb.checked; }
  p.fo = Math.max(10, Number(v('#pl-fo')) || p.fo); p.fi = Math.max(10, Number(v('#pl-fi')) || p.fi);
  return false;
}
function plannerSpec(p, fo = p.fo, fi = p.fi) {
  return { airline: W.playerId, base: p.base, dest: p.dest, type_id: p.type, freq: p.freq, fare_out: fo, fare_in: fi, service: p.service, buffer: p.buffer };
}
function withPlannerStation(p, fn) {
  const pl = W.player, had = pl.stations[p.dest];
  if (!had) pl.stations[p.dest] = { handling: 'contract', terminal: p.term };
  try { return fn(); } finally { if (!had) delete pl.stations[p.dest]; }
}
function plannerForecast(p, opts = {}, fo, fi) {
  const pl = W.player, isNew = !stationsOf(pl).includes(p.dest);
  const rent = isNew ? P.TERMINALS[p.term].rent * SM.apx(p.dest).cost * cpi() / 30.4 : 0;
  return withPlannerStation(p, () => W.forecastFor(pl, plannerSpec(p, fo, fi), { ...opts, extraDaily: rent }));
}
function updateForecast() {
  const p = ui.planner, box = $('#forecast'); if (!p || !box) return;
  const pl = W.player, base = p.base;
  if (!SM.rangeOk(base, p.dest, p.type)) { box.innerHTML = `<div class="callout crit">Die ${tl(p.type)} schafft ${n0(SM.gcDistanceKm(base, p.dest))} km nicht. Anderen Typ wählen.</div>`; return; }
  const band = W.forecastBand(pl), m = SM.monthOf(W.day);
  const r = plannerForecast(p, { nDraws: 4 });
  const lo = plannerForecast(p, { nDraws: 2, demandScale: 1 - band });
  const hi = plannerForecast(p, { nDraws: 2, demandScale: 1 + band });
  const cur = plannerForecast(p, { nDraws: 2, month: m });
  const rotH = withPlannerStation(p, () => SM.rotationHours(base, p.dest, p.type, p.service, p.buffer, pl.turnExtra(base), pl.turnExtra(p.dest)));
  const free = fleetFree(p.type, base);
  const fit = (() => { let need = p.freq; for (const f of free.map((x) => x.free).sort((a, b) => b - a)) { need -= Math.floor((f + 1e-9) / rotH); if (need <= 0) return true; } return need <= 0; })();
  const pot = SM.qPot(base, p.dest), potSum = pot.leisure + pot.business + pot.vfr;
  const rail = SM.railShare(base, p.dest);
  const segTot = r.dirs.out.seg.leisure + r.dirs.out.seg.business + r.dirs.out.seg.vfr || 1;
  const t = P.AIRCRAFT_TYPES[p.type];
  const study = pl.studies[SM.pairKey(base, p.dest)];
  const slotsB = slotsMine(base), slotsD = slotsMine(p.dest), slotOk = W.slotsOkFor(pl, base, p.dest, p.freq);
  const bh = SM.blockHours(base, p.dest, p.type) * 2 * p.freq;
  const needPil = 2 * bh / P.STAFF.pilotH, needCab = t.cabin * bh / P.STAFF.cabinH;
  const sp = staffPlan(pl), pilRow = sp.find((x) => x.key === t.group), cabRow = sp.find((x) => x.key === 'cab');
  const sparePil = pilRow ? pilRow.have + pilRow.pipe - pilRow.need : 0, spareCab = cabRow.have + cabRow.pipe - cabRow.need;
  const wnd = SM.winOf(p.type), kLong = rotH > wnd ? Math.ceil(rotH / wnd) : 0;
  const freeWhole = free.filter((x) => x.free >= wnd - 1e-9).length;
  const acNeed = kLong ? (freeWhole >= kLong * p.freq ? null : `Langstrecke: Ein Umlauf dauert ${n1(rotH)} h – länger als das Betriebsfenster von ${wnd} h. Für ${p.freq}x täglich braucht es ${kLong * p.freq} freie ${tl(p.type)} in ${base}, frei sind ${freeWhole}. ${freeWhole ? `Mit ${freeWhole} fliegt die Strecke nur an ${pct(Math.min(1, freeWhole / kLong / p.freq))} der Tage.` : ''}`)
    : fit ? null : `Für ${p.freq}x täglich fehlt Flugzeugzeit an ${base}: ein Umlauf braucht ${n1(rotH)} h, frei sind ${free.length ? free.map((x) => n1(x.free) + ' h').join(', ') : 'keine passenden Flugzeuge'}.`;
  box.innerHTML = `<div class="stack">
    <div class="fc">
      <div><span>Passagiere pro Tag</span><b>${n0(r.pax)}</b><em>beide Richtungen, Auslastung ${pct(r.lf)}</em></div>
      <div><span>Umsatz pro Tag</span><b>${eur(r.revenue)}</b><em>Ø Tarif ${eur(r.avgFare)}</em></div>
      <div><span>DB1 pro Tag</span><b class="${sgn(r.db1List)}">${eur(r.db1List, { plus: true })}</b><em>nach direkten Flugkosten</em></div>
      <div><span>DB2 pro Tag · Streckenbeitrag</span><b class="${sgn(r.db2List)}">${eur(r.db2List, { plus: true })}</b><em>wie später in der Streckenliste · Spanne ${eur(lo.db2List, { plus: true })} bis ${eur(hi.db2List, { plus: true })}</em></div>
    </div>
    <p class="small ink2">Nach <b>allen</b> Kosten – also auch Crew-Gehältern, Leasing, Versicherung, Technik, Slots und Terminal – bleiben <b class="${sgn(r.db2)}">${eur(r.db2, { plus: true })}</b> pro Tag. So viel landet im Ergebnis.</p>
    ${fcExplain(r, { band: W.forecastBand(pl), cur, m, study, potSum, rail })}
    <p class="small ink2">Jahresmittel bei ausgereifter Strecke, Marke ${n0(pl.brand * 100)}. Im ${MONTHS_L[m]}: Streckenbeitrag <b class="${sgn(cur.db2List)}">${eur(cur.db2List, { plus: true })}</b> pro Tag bei ${pct(cur.lf)} Auslastung. ${study && study.done ? `<b>Marktstudie liegt vor</b> (${esc(study.by)}): Nachfrage ${pct(study.est - 1, 0).replace(/^(?!-)/, '+')} gegenüber Modell, Unsicherheit ±${pct(study.err)}.` : `Ohne Marktstudie liegt die echte Nachfrage bis zu ±${pct(band)} daneben.`}</p>
    ${kitHtml(p, { acNeed, kLong, freeWhole, free, rotH, wnd, t })}
    ${!slotOk ? `<div class="callout crit">Keine Slots: ${[base, p.dest].filter((x) => slotsMine(x) < p.freq).map((x) => `${x} hat für Sie nur ${slotTxt(x)} freie`).join(', ')}. Neue Slots kommen zum Sommer- und Winterflugplan (April, Oktober).</div>` : ''}
    <table class="t"><tbody>
      <tr><td>Reisepotenzial ${base}→${p.dest}</td><td class="r">${n0(potSum)} pro Tag</td></tr>
      <tr><td>Mix Ihrer Passagiere</td><td class="r">Urlaub ${pct(r.dirs.out.seg.leisure / segTot)} · Geschäft ${pct(r.dirs.out.seg.business / segTot)} · Besuch ${pct(r.dirs.out.seg.vfr / segTot)}</td></tr>
      ${rail > 0.02 ? `<tr><td>Bahn nimmt weg</td><td class="r">${pct(rail)} des Potenzials</td></tr>` : ''}
      <tr><td>Umsteiger über fremde Drehkreuze</td><td class="r">${r.dirs.out.indirect > 0.5 ? n0(r.dirs.out.indirect) + ' pro Tag' : 'keine'}</td></tr>
      <tr><td>Konkurrenz</td><td class="r">${(() => { const co = W.competitorOffers(W.playerId, base, p.dest); return co.length ? co.map((c) => `${esc(W.airlines[c.airline].name)} ${c.freq}x ${eur(c.fare)}`).join(', ') : 'keine'; })()}</td></tr>
      ${isFinite(slotsB) || isFinite(slotsD) ? `<tr><td>Freie Slots</td><td class="r">${[base, p.dest].filter((x) => isFinite(W.slotsFree(x))).map((x) => `${x} ${slotTxt(x)}`).join(' · ')}</td></tr>` : ''}
      <tr><td>Kosten je angebotenem Sitz-km</td><td class="r">${NF2.format(r.caskCt)} ct (Erlös ${NF2.format(r.raskCt)} ct)</td></tr>
    </tbody></table>
    <button class="btn primary" data-act="openroute-new" ${slotOk ? '' : 'disabled'}>${kitLabel(p)}</button>
  </div>`;
}
const rivalsPicker = (prefix, cur) => `<div class="stack"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Konkurrenz</span><div class="seg wrap" id="${prefix}Rivals">
  ${Object.entries(SM.RIVALS).map(([k, r]) => `<button type="button" data-rivals="${k}" aria-pressed="${k === cur}">${r.label}</button>`).join('')}</div>
  <p class="small muted">${Object.values(SM.RIVALS).map((r) => `<b>${r.label}:</b> ${r.desc}.`).join(' ')} Lässt sich im Spiel unter Markt → Wettbewerb ändern.</p></div>`;
/** Herleitung der Prognose: woher die Passagiere kommen und welche Kosten abgehen. */
function fcExplain(r, x) {
  const cb = r.costBreakdown || {}, crewPd = Math.max(0, (cb.crew || 0) - (r.crewSalary || 0));
  const fees = (cb.navigation || 0) + (cb.landing || 0) + (cb.pax_fees || 0);
  const svc = (cb.pax_service || 0) + (cb.distribution || 0) + crewPd;
  const acExtra = (r.acFull || 0) - (r.acGeneric || 0);
  const row = (l, v, cls = '', note = '') => `<tr class="${cls}"><td>${l}${note ? `<div class="small muted">${note}</div>` : ''}</td><td class="r ${cls === 'sum' ? sgn(v) : ''}" style="white-space:nowrap">${cls === 'sum' ? eur(v, { plus: true }) : l.startsWith('−') ? eur(Math.abs(v)) : eur(v)}</td></tr>`;
  return `<details class="fcx"><summary>So rechnet die Prognose</summary>
    <ol class="fcx-steps">
      <li><b>Markt:</b> Zwischen beiden Städten wollen etwa <b>${n0(x.potSum)}</b> Menschen pro Tag reisen (Urlaub, Geschäft, Besuch)${x.rail > 0.02 ? `, ${pct(x.rail)} davon nimmt die Bahn` : ''}.</li>
      <li><b>Ihr Anteil:</b> Reisende wählen nach Preis, Abflügen pro Tag, Pünktlichkeit, Produkt und Marke – gegen Konkurrenz, Umsteigeverbindungen und den Verzicht aufs Fliegen. Ergebnis: <b>${n0(r.pax)}</b> Passagiere, ${pct(r.lf)} Auslastung. Mehr als Sitze da sind, fliegen nicht mit.</li>
      <li><b>Saison:</b> Gezeigt ist das Jahresmittel. Im ${MONTHS_L[x.m]} ${x.cur.pax >= r.pax ? 'liegt die Nachfrage darüber' : 'liegt sie darunter'} (${n0(x.cur.pax)} Passagiere).</li>
      <li><b>Anlauf:</b> Eine neue Strecke muss erst bekannt werden – in den ersten Wochen kommen nur etwa 35–60 % der Passagiere, nach rund 90 Tagen ist sie ausgereift. Die Prognose zeigt den ausgereiften Zustand.</li>
      <li><b>Unsicherheit:</b> ${x.study && x.study.done ? 'Mit Ihrer Marktstudie' : 'Ohne Marktstudie'} kann die echte Nachfrage um bis zu ±${n0(x.band * 100)} % abweichen. Nicht enthalten: wie die Konkurrenz reagiert – läuft die Strecke gut, kann eine KI-Airline mit Kampfpreisen nachziehen.</li>
    </ol>
    <table class="t"><tbody>
      ${row('Umsatz', r.revenue, '', `Tickets ${eur(r.fareRev)}, Zusatzerlöse ${eur(r.ancRev)}`)}
      ${row('− Kerosin', -(cb.fuel || 0))}
      ${row('− Flughafen- und Flugsicherungsgebühren', -fees)}
      ${row('− Abfertigung', -(cb.handling || 0))}
      ${row('− Wartung', -(cb.maintenance || 0))}
      ${row('− Bordservice, Vertrieb, Crew-Spesen', -svc)}
      ${row('= DB1', r.db1List, 'sum')}
      ${row('− Flugzeugzeit zur Standardrate', -(r.acGeneric || 0), '', `${n1(r.rotationH)} h Umlauf belegen ${pct(r.aircraftShare)} eines Flugzeugs`)}
      ${row('= DB2 · Streckenbeitrag', r.db2List, 'sum')}
      ${row('− Crew-Gehälter', -(r.crewSalary || 0), '', 'laufen als Personalkosten, nicht je Strecke')}
      ${row(acExtra >= 0 ? '− Mehrkosten Ihres Flugzeugs' : '+ Ersparnis bei Ihrem Flugzeug', -acExtra, '', 'Leasing, Versicherung, Technik und Verwaltung statt Standardrate')}
      ${row('− Slots und Terminal', -((r.slotFee || 0) + (r.stationDaily || 0)))}
      ${row('= Ergebnisbeitrag', r.db2, 'sum')}
    </tbody></table>
    <p class="small muted">Gegenprobe im Test: Bei ausgereiften Strecken lag die Prognose im Mittel etwa 4 % neben der tatsächlichen Nachfrage und dem tatsächlichen Streckenbeitrag.</p>
  </details>`;
}
/** Startpaket in der Planung: Flugzeug, Personal und Einsatz in einem Schritt. */
function kitHtml(p, x) {
  const pl = W.player, base = p.base, t = x.t;
  // Wie viele Flugzeuge fehlen?
  let n = 0;
  if (x.acNeed) {
    if (x.kLong) n = Math.max(1, x.kLong * p.freq - x.freeWhole);
    else { let need = p.freq; for (const f of x.free.map((y) => y.free).sort((a, b) => b - a)) need -= Math.floor((f + 1e-9) / x.rotH); n = Math.max(1, Math.ceil(Math.max(0, need) / Math.max(1, Math.floor(x.wnd / x.rotH)))); }
  }
  const stock = W.lessorStock && W.lessorStock[p.type] !== undefined ? W.lessorStock[p.type] : SM.stockCap(p.type);
  const auctionOnly = t.launch && W.day < t.launch + 365;
  const leaseOk = n > 0 && !auctionOnly && stock >= n;
  const used = n === 1 ? W.acMarket.filter((o) => o.type === p.type).sort((a, b) => a.delivery - b.delivery).slice(0, 2) : [];
  const opts = [];
  if (leaseOk) opts.push(['lease', `${n > 1 ? n + ' × ' : ''}${tl(p.type)} leasen`, `Kaution ${eur(acquireCost(p.type, 'lease') * n)}, Lieferung in ${SM.leaseDelivery(W, p.type, 'lease')} Tagen`]);
  for (const o of used) opts.push(['used:' + o.id, `Gebraucht: ${o.age} Jahre, ${o.kind === 'lease' ? eur(o.lease_month * pl.oldAcFactor(o.age)) + '/Monat' : 'Kauf ' + eur(o.price * pl.oldAcFactor(o.age))}`, `sofort ${eur(acquireCost(o.type, o.kind === 'lease' ? 'lease' : 'buy', o))}, Lieferung in ${o.delivery} Tagen${pl.oldAcExpert() ? ' · Zustand ' + condWord(o.cond || 1) : ''}`]);
  opts.push(['none', 'Ohne Flugzeug anlegen', 'Die Strecke startet, sobald ein passendes Flugzeug frei ist']);
  if (!opts.some((o) => o[0] === p.acq)) p.acq = n ? opts[0][0] : 'none';
  if (!n) p.acq = 'none';
  // Personal nach Eröffnung
  const bh = SM.blockHours(base, p.dest, p.type) * 2 * p.freq;
  const needPil = 2 * bh / P.STAFF.pilotH, needCab = t.cabin * bh / P.STAFF.cabinH;
  const sp = staffPlan(pl), pilRow = sp.find((y) => y.key === t.group), cabRow = sp.find((y) => y.key === 'cab');
  const sparePil = pilRow ? pilRow.have + pilRow.pipe - pilRow.need : 0, spareCab = cabRow.have + cabRow.pipe - cabRow.need;
  const misPil = Math.max(0, Math.ceil(needPil * 1.1 - sparePil)), misCab = Math.max(0, Math.ceil(needCab * 1.1 - spareCab)), misTech = n ? Math.ceil(P.STAFF.techPerAc * n) : 0;
  const staffShort = misPil + misCab + misTech > 0;
  if (p.hire === undefined) p.hire = false;   // Personal nur auf Wunsch mit einstellen
  ui.plannerKit = { n, staffShort };
  const row = (ok, title, body) => `<div class="kit-row ${ok ? 'ok' : 'todo'}"><span class="kit-ic">${ok ? '✓' : '!'}</span><div><b>${title}</b>${body ? `<div class="small muted">${body}</div>` : ''}</div></div>`;
  return `<div class="kit card pad stack"><div class="spread"><b>Startpaket</b><span class="small muted">alles mit einem Klick</span></div>
    ${n ? row(false, `Flugzeug: ${x.acNeed}`, `<div class="kit-opts">${opts.map(([v, l, d]) => `<label class="chk"><input type="radio" name="pl-acq" id="pl-acq-${v.replace(':', '-')}" value="${v}" ${p.acq === v ? 'checked' : ''}> <span><b>${esc(l)}</b><br><span class="muted">${esc(d)}</span></span></label>`).join('')}</div>${auctionOnly ? '<span class="small muted">Dieses Muster gibt es im ersten Jahr nur per Auktion.</span>' : !leaseOk && stock < n ? '<span class="small muted">Beim Leasinggeber derzeit nicht genug auf Lager.</span>' : ''}`)
      : row(true, x.kLong ? `Flugzeuge: ${x.kLong * p.freq} fliegen die Langstrecke im Wechsel` : `Flugzeug: passt auf ${x.free.length === 1 ? 'Ihr Flugzeug' : 'Ihre Flotte'}`, `${n1(x.rotH * p.freq)} h von ${n0(x.wnd)} h Betriebsfenster – wird automatisch eingeplant`)}
    ${staffShort ? row(false, `Personal: es fehlen etwa ${[misPil ? `${misPil} ${SM.roleLabel('pilot', t.group)}` : '', misCab ? `${misCab} Flugbegleiterinnen` : '', misTech ? `${misTech} Techniker` : ''].filter(Boolean).join(', ')}`,
      `<label class="chk"><input type="checkbox" id="pl-hire" ${p.hire ? 'checked' : ''}> <span>Auf Wunsch gleich mit einstellen (Bedarf plus 10 % Reserve). Sonst selbst unter <b>Unternehmen → Personal</b> – bis dahin fliegt teures Agenturpersonal.</span></label>`)
      : row(true, 'Personal: reicht', 'Crews und Technik sind vorhanden.')}
    ${row(true, 'Einsatz: automatisch', 'Der Einsatzplan teilt Flugzeuge selbst zu. Unter Flotte → Einsatzplan können Sie später feste Umläufe vorgeben – nötig ist das nicht.')}
  </div>`;
}
function kitLabel(p) {
  const k = ui.plannerKit || {}, parts = [];
  if (k.n && p.acq && p.acq !== 'none') parts.push(p.acq === 'lease' ? (k.n > 1 ? `${k.n} Flugzeuge leasen` : 'Flugzeug leasen') : 'Gebrauchtes übernehmen');
  if (k.staffShort && p.hire) parts.push('Personal einstellen');
  return parts.length ? `Strecke eröffnen · ${parts.join(' · ')}` : 'Strecke eröffnen';
}
function suggestPrice() {
  readPlanner();
  const p = ui.planner;
  const ro = SM.refPrice(p.base, p.dest, cpi()), ri = SM.refPrice(p.dest, p.base, cpi());
  let best = null;
  for (let k = 0.55; k <= 1.9; k += 0.05) {
    const fo = Math.round(ro * k / 5) * 5, fi = Math.round(ri * k / 5) * 5;
    const r = plannerForecast(p, { nDraws: 2, seed: 3 }, fo, fi);
    if (!best || r.db2 > best[2]) best = [fo, fi, r.db2];
  }
  p.fo = best[0]; p.fi = best[1];
  renderPane(true);
  toast(`Bester Beitrag bei ${p.fo} € / ${p.fi} €`);
}
function openNewRoute() {
  readPlanner();
  const p = ui.planner, base = p.base, kit = ui.plannerKit || {}, done = [];
  // 1. Flugzeug beschaffen (falls gewählt)
  if (kit.n && p.acq && p.acq !== 'none') {
    if (p.acq === 'lease') {
      for (let i = 0; i < kit.n; i++) { const r = doAction({ type: 'acquire', typeId: p.type, mode: 'lease', base }); if (!r.ok) { refreshAll(); return; } }
      done.push(`${kit.n > 1 ? kit.n + ' × ' : ''}${tl(p.type)} geleast`);
    } else {
      const r = doAction({ type: 'acquire', offerId: p.acq.slice(5), base }); if (!r.ok) { refreshAll(); return; }
      done.push(`gebrauchte ${tl(p.type)} übernommen`);
    }
  }
  // 2. Strecke eröffnen
  const res = doAction({ type: 'openRoute', base, dest: p.dest, typeId: p.type, freq: p.freq, fo: p.fo, fi: p.fi, service: p.service, buffer: p.buffer, term: p.term });
  if (!res.ok) { refreshAll(); return; }
  // 3. Personal
  if (kit.staffShort && p.hire) { const h = doAction({ type: 'fillStaff' }); if (h.ok && h.n) done.push(`${h.n} Personen eingestellt`); }
  ui.planner = null; ui.plannerKit = null; ui.expanded = res.id; ui.selApt = null;
  toast(`${base}–${p.dest} ${res.start > W.day + 1 ? `angelegt, erster Flug am ${dateShort(res.start)}` : 'eröffnet, erster Flug morgen'}.${done.length ? ' ' + done.join(', ') + '.' : ''} Der Einsatz wird automatisch geplant.`);
  W.operableFreq(W.player); buildSchedules(); setTab('routes'); renderMapRoutes(true); renderHeader();
}
function applyRoute(id) {
  const g = (k) => $(`#ef-${k}-${id}`);
  const res = doAction({ type: 'editRoute', id, fo: Number(g('o').value), fi: Number(g('i').value), freq: Number(g('f').value), service: g('s').value, buffer: g('b').value, typeId: g('ty') ? g('ty').value : undefined });
  if (res.ok) toast(res.msg || 'Änderungen gespeichert.');
  refreshAll();
}

// ---------- Flotte ----------
const acquireCost = (typeId, mode, offer = null) => SM.acquireCost(W.player, typeId, mode, offer, W.macro.eurusd, W);
/** Crew-Lage für ein Flugzeug: Piloten hängen an der Musterfamilie, Kabine und Technik sind allgemein. */
function crewInfo(pl, a) {
  const st = pl.staff, cov = st && st.cov; if (!cov) return null;
  const g = P.AIRCRAFT_TYPES[a.type_id].group, S = P.STAFF;
  const own = (capH, needH) => (needH > 0 ? Math.min(1, capH / needH) : 1);
  const pOwn = own(st.pil[g] * S.pilotH, cov.need.pil[g] || 0), cOwn = own(st.cab * S.cabinH, cov.need.cab || 0);
  const canc = Math.max(cov.cancel[g] || 0, cov.cancel.cab || 0);
  const fam = P.TYPE_GROUPS[g];
  if (canc > 0.001) return { cls: 'crit', txt: 'Crew fehlt – Flüge fallen aus', tip: `Piloten ${fam}: ${pct(pOwn)} eigen, Kabine ${pct(cOwn)} eigen, Agentur aus` };
  if (pOwn >= 0.999 && cOwn >= 0.999) return { cls: 'good', txt: 'Crew besetzt', tip: `eigene Piloten (${fam}) und Kabine` };
  return { cls: 'warn', txt: 'Crew teils Agentur', tip: `Piloten ${fam}: ${pct(pOwn)} eigen, Kabine ${pct(cOwn)} eigen – Rest Überstunden/Agentur (teuer)` };
}
function acRoleChips(pl, a) {
  const out = [];
  const inService = a.delivery_day <= W.day && !((a.status === 'ccheck' || a.status === 'aog') && a.until > W.day) && !(a.acmi && a.acmi.start <= W.day && a.acmi.end > W.day);
  if (inService && a.used_hours > 0) { const c = crewInfo(pl, a); if (c) out.push(`<span class="chip ${c.cls}" title="${esc(c.tip)}">${c.txt}</span>`); }
  else if (inService && acMode(a) === 'reserve') out.push(`<span class="chip me" title="Springt ein, wenn ein anderes Flugzeug ausfällt">Reserve in ${a.base}</span>`);
  else if (inService) out.push(`<span class="chip" title="Einsatzbereit, aber ohne Strecke – kostet trotzdem jeden Tag">bereit in ${a.base}</span>`);
  return out.join(' ');
}
function acStatus(pl, a) {
  if (a.delivery_day > W.day) return `<span class="chip warn">Lieferung ${dateShort(a.delivery_day)}</span>`;
  if (a.status === 'ccheck' && a.until > W.day) return `<span class="chip warn">C-Check bis ${dateShort(a.until)}</span>`;
  if (a.status === 'aog' && a.until > W.day) return `<span class="chip crit">Schaden, am Boden bis ${dateShort(a.until)}</span>`;
  if (a.acmi && a.acmi.start <= W.day && a.acmi.end > W.day) return `<span class="chip me">verchartert bis ${dateShort(a.acmi.end)}</span>`;
  if (a.used_hours > 0) return `<span class="chip good">im Einsatz ${n1(a.used_hours)} h/Tag</span>`;
  return `<span class="chip crit">ungenutzt${a.idle_days ? ' seit ' + a.idle_days + ' Tagen' : ''}</span>`;
}
function justAcqHtml() {
  const ja = ui.justAcq; if (!ja || W.day - ja.day > 20) return '';
  const pl = W.player, idle = pl.fleet.filter((a) => a.type_id === ja.type && a.base === ja.base && !(a.assigned || []).length).length;
  if (!idle) return '';
  return `<div class="callout good"><b>${tl(ja.type)} kommt nach ${ja.base}.</b> Noch fliegt sie keine Strecke. <span class="row" style="gap:6px;margin-top:6px"><button class="btn small primary" data-act="planwith">Strecke dafür planen</button><button class="btn small" data-act="justacqclose">Später</button></span></div>`;
}
VIEWS.fleetOwn = function viewFleetOwn() {
  const pl = W.player;
  W.operableFreq(pl);
  const used = pl.fleet.filter((a) => a.used_hours > 0).length, coming = pl.fleet.filter((a) => a.delivery_day > W.day).length;
  let html = justAcqHtml() + `<div class="spread"><h2 class="sec">Ihre Flotte <small>${pl.fleet.length} Flugzeuge · ${used} im Einsatz${coming ? ` · ${coming} in Lieferung` : ''}</small></h2><button class="btn small primary" data-act="tab" data-tab="fleetBuy">Flugzeug beschaffen</button></div>`;
  if (pl.fleet.length) {
    const del = pl.fleet.filter((a) => a.delivery_day <= W.day), maint = del.filter((a) => (a.status === 'ccheck' || a.status === 'aog') && a.until > W.day);
    const flying = del.filter((a) => a.used_hours > 0 && !maint.includes(a)), reserve = del.filter((a) => !(a.used_hours > 0) && acMode(a) === 'reserve' && !maint.includes(a));
    const ready = del.filter((a) => !(a.used_hours > 0) && acMode(a) !== 'reserve' && !maint.includes(a) && !(a.acmi && a.acmi.start <= W.day && a.acmi.end > W.day));
    const crewBad = flying.map((a) => crewInfo(pl, a)).filter((c) => c && c.cls !== 'good');
    html += `<div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip good">${flying.length} im Einsatz</span>${reserve.length ? `<span class="chip me">${reserve.length} Reserve</span>` : ''}${ready.length ? `<span class="chip">${ready.length} bereit ohne Strecke</span>` : ''}${maint.length ? `<span class="chip warn">${maint.length} in Wartung</span>` : ''}${pl.fleet.length - del.length ? `<span class="chip warn">${pl.fleet.length - del.length} in Lieferung</span>` : ''}
      <span class="chip ${crewBad.some((c) => c.cls === 'crit') ? 'crit' : crewBad.length ? 'warn' : 'good'}">${crewBad.length ? `Crew: ${crewBad.length} Flugzeug${crewBad.length > 1 ? 'e' : ''} nicht voll besetzt` : 'Crew: alle besetzt'}</span></div>`;
  }
  if (!pl.fleet.length) html += `<div class="callout info">Noch kein Flugzeug. Unter „Beschaffung“ gibt es neue Flugzeuge vom Leasinggeber, Gebrauchte vom Markt und Bestellungen ab Werk.</div>`;
  html += pl.fleet.map((a) => {
    const c = ui.confirm === 'dispose:' + a.id, dc = pl.disposeCost(W.day, a), age = pl.acAge(a, W.day), toC = P.CCHECK_FH - (a.fh - a.lastC);
    const routes = (a.assigned || []).map((id) => pl.routes.find((r) => r.id === id)).filter(Boolean).map((r) => r.dest);
    const upcoming = a.acmi && a.acmi.start > W.day ? ` · Charter ab ${dateShort(a.acmi.start)} (${esc(a.acmi.client)})` : '';
    const move = pl.bases.length > 1 ? `<select data-act-change="move" data-id="${a.id}" aria-label="Basis wechseln" style="width:auto">${pl.bases.map((b) => `<option ${b === a.base ? 'selected' : ''}>${b}</option>`).join('')}</select>` : '';
    return `<div class="fleet-row"><div style="min-width:0"><div class="acrow"><div class="thumb">${acSvg(a.type_id, { ...myAcColors(), code: pl.code })}</div><div style="min-width:0"><div class="row" style="gap:8px"><b class="mono">${acName(a.id)}</b> <span>${tlx(a.type_id)}</span> ${acStatus(pl, a)} ${acRoleChips(pl, a)}${acMode(a) !== 'auto' ? ` <span class="chip ${acMode(a) === 'manual' ? 'me' : 'warn'}">${MODE_LABEL[acMode(a)]}</span>` : ''}</div>
      <div class="small muted">${modeLabel(a)} · Basis ${a.base} · ${n1(age)} Jahre${a.cond && a.cond !== 1 && pl.oldAcExpert() ? ` · Zustand <span class="${condCls(a.cond) === 'crit' ? 'neg' : condCls(a.cond) === 'good' ? 'pos' : ''}">${condWord(a.cond)}</span>` : ''} · ${eur(acDayCost(a))} pro Tag${routes.length ? ' · fliegt ' + [...new Set(routes)].join(', ') : ''}${upcoming}</div>
      <div class="small muted">Nächster C-Check in ${n0(Math.max(0, toC))} Flugstunden (dauert ${Math.max(4, P.CCHECK_DAYS - (pl.hangars.includes(a.base) ? P.HANGAR_CHECK_DAYS : 0) - pl.skill('tech'))} Tage)</div>
      </div></div><div class="bar" style="margin-top:6px" title="Auslastung des 17-Stunden-Betriebsfensters"><i class="me" style="width:${Math.min(100, a.used_hours / P.OPERATING_WINDOW_H * 100).toFixed(0)}%"></i></div></div>
      <div class="stack" style="justify-items:end">${move}${c ? `<div class="stack small" style="justify-items:end"><span>${a.owned ? `Verkauf: ${eur(dc.cash)} Zufluss nach Kredittilgung` : a.flex ? 'Rückgabe ohne Kosten' : `Rückgabe kostet ${eur(-dc.pnl)}`}</span><div class="row"><button class="btn danger small" data-act="dispose" data-id="${a.id}">${a.owned ? 'Verkaufen' : 'Zurückgeben'}</button><button class="btn small" data-act="cancelconfirm">Abbrechen</button></div></div>`
      : `<button class="btn small" data-act="askdispose" data-id="${a.id}">${a.owned ? 'Verkaufen' : 'Zurückgeben'}</button>`}<button class="btn small" data-act="asgopen" data-id="${a.id}">Einsatz planen</button>${a.delivery_day <= W.day && !(a.acmi && a.acmi.end > W.day) ? `<button class="btn small" data-act="dealac" data-id="${a.id}">An Airline abgeben</button>` : ''}</div></div>`;
  }).join('');
  if (pl.fleet.length) html += `<p class="small muted">Ältere Flugzeuge verbrauchen mehr Kerosin, kosten mehr Wartung und fallen öfter aus. Alle ${n0(P.CCHECK_FH)} Flugstunden steht ein C-Check an; ein eigener Hangar an der Basis verkürzt ihn.</p>`;
  return html;
};
VIEWS.fleetAcmi = function viewFleetAcmi() {
  const pl = W.player;
  let html = `<h2 class="sec">Charter (ACMI) <small>${W.acmiOffers.length} Anfragen</small></h2>`;
  const offers = W.acmiOffers;
  html += `<p class="small ink2">ACMI heißt: Sie stellen Flugzeug, Crew, Wartung und Versicherung, der Kunde zahlt eine Tagesrate und trägt Treibstoff und Gebühren. Gut für Flugzeuge, die gerade wenig zu tun haben. In der Charterzeit fehlt das Flugzeug im eigenen Flugplan.</p>`;
  html += offers.length ? offers.map((o) => {
    const cands = pl.fleet.filter((a) => a.type_id === o.type && a.delivery_day <= o.start && !(a.acmi && a.acmi.end > o.start));
    return `<div class="card pad stack"><div class="spread"><b>${esc(o.client)}</b><span class="chip">${tlx(o.type)}</span></div>${acSvg(o.type, { color: 'var(--ink-3)' })}
      <div class="small ink2">${dateShort(o.start)} bis ${dateShort(o.end)} (${o.end - o.start} Tage) · ${eur(o.rate)} pro Tag · gesamt ${eur(o.rate * (o.end - o.start))}</div>
      ${cands.length ? `<div class="row"><select id="acmi-${o.id}" style="width:auto">${cands.map((a) => `<option value="${a.id}">${acName(a.id)} · ${a.used_hours > 0 ? n1(a.used_hours) + ' h/Tag im Einsatz' : 'frei'}</option>`).join('')}</select><button class="btn small primary" data-act="acmi" data-id="${o.id}">Annehmen</button></div>` : `<span class="small muted">Keine passende ${tl(o.type)} verfügbar.</span>`}
      <span class="small muted">Angebot gilt bis ${dateShort(o.expires)}</span></div>`;
  }).join('') : '<p class="small muted">Gerade keine Anfragen. Neue kommen zum Monatswechsel.</p>';
  return html;
};
VIEWS.fleetBuy = function viewFleetBuy() {
  const pl = W.player;
  const base = pl.bases.includes(ui.acqBase) ? ui.acqBase : pl.bases[0];
  let html = `<h2 class="sec">Beschaffung <small>Leasing, Gebrauchtmarkt, ab Werk, Auktionen</small></h2>` + justAcqHtml();
  html += `<p class="small muted">Tipp: Am schnellsten geht es über <b>Strecken → Planung</b> – dort beschaffen Sie das passende Flugzeug und das Personal gleich mit.</p>`;
  html += auctionsHtml();
  const cash = pl.spendable(W.macro.bank ?? 1);
  if (pl.bases.length > 1) html += `<label class="f"><span>Stationieren in</span><select id="acq-base">${pl.bases.map((b) => `<option ${b === base ? 'selected' : ''}>${b}</option>`).join('')}</select></label>`;
  const btn = (id, mode, label, offer = null, primary = false) => { const need = acquireCost(id, mode, offer); const ok = cash >= need; return `<button class="btn small${primary ? ' primary' : ''}" data-act="acquire" data-type="${id}" data-mode="${mode}"${offer ? ` data-offer="${offer.id}"` : ''} ${ok ? '' : 'disabled'} title="${ok ? `sofort ${eur(need)}${need > pl.ledger.cash / 100 ? ' – geht in den Dispo' : ''}` : 'Auch mit Dispo fehlen ' + eur(need - cash)}">${label}</button>`; };
  html += `<div class="stack"><h2 class="sec">Gebrauchtmarkt <small>wechselt monatlich</small></h2><div class="tw"><table class="t"><thead><tr><th>Typ</th><th class="r">Alter · Zustand</th><th class="r">Konditionen</th><th></th></tr></thead><tbody>
    ${W.acMarket.slice().sort((a, b) => a.type.localeCompare(b.type) || a.age - b.age).map((o) => `<tr><td><b>${tlx(o.type)}</b><div class="small muted">Angebot bis ${dateShort(o.expires)} · Lieferung ${o.delivery} T.</div></td><td style="text-align:right"><span class="mono">${o.age} J.</span><div>${condInfo(o)}</div></td>
      <td style="text-align:right">${(() => { const f = pl.oldAcFactor(o.age), v = o.kind === 'lease' ? o.lease_month : o.price; return `<b class="mono">${eur(v * f)}${o.kind === 'lease' ? '/Mon.' : ''}</b><div class="small muted">${o.kind === 'lease' ? 'Leasing 36 M.' : 'Kauf'}${f < 1 ? ` · <span class="pos" title="statt ${eur(v)}">Luis −10 %</span>` : ''}</div>`; })()}</td>
      <td class="r">${btn(o.type, o.kind === 'lease' ? 'lease' : 'buy', o.kind === 'lease' ? 'Leasen' : 'Kaufen', o)}</td></tr>`).join('')}
  </tbody></table></div><p class="small muted">Leasingraten sind in US-Dollar vereinbart: Fällt der Euro, wird das Leasing teurer. Der Zustand gebrauchter Flugzeuge ist verborgen: Verbrauchte Maschinen verhalten sich wie deutlich ältere. ${pl.oldAcExpert() ? 'Luis Perez begutachtet jedes Angebot ab 8 Jahren.' : 'Ein Gutachter wie Luis Perez (Unternehmen → Personal) sieht ihn genau, Ihre Technik ab Senior grob.'}</p></div>`;
  html += `<h2 class="sec">Neu vom Leasinggeber oder ab Werk</h2><div class="types">${Object.entries(P.AIRCRAFT_TYPES).filter(([, t]) => !t.launch || W.day >= t.launch - 30).map(([id, t]) => {
    const known = pl.familyKnown(id), fam = P.TYPE_GROUPS[t.group];
    const stock = W.lessorStock && W.lessorStock[id] !== undefined ? W.lessorStock[id] : SM.stockCap(id), duty = SM.acTariff(W, pl, id), auctionOnly = t.launch && W.day < t.launch + 365;
    const avail = auctionOnly ? `<span class="chip me">Neues Muster – im ersten Jahr nur per Auktion</span>` : `<span class="chip ${stock <= 0 ? 'crit' : stock <= 2 ? 'warn' : ''}">${stock <= 0 ? 'beim Leasinggeber ausverkauft' : `${stock} beim Leasinggeber`}</span> <span class="chip">Lieferung ${SM.leaseDelivery(W, id, 'lease')} T.</span>${duty ? ` <span class="chip crit">Zoll +${pct(duty)}</span>` : ''}`;
    const intro = known ? `Familie ${fam} schon in der Flotte, Piloten können wechseln` : `neue Familie ${fam}: ${eur(P.TYPE_INTRO_COST)} Einführung${pl.typesIntroduced.length ? ` + ${eur(P.TYPE_COMPLEXITY_DAY)} pro Tag Komplexität, eigene Musterberechtigung für Piloten` : ''}`;
    return `<div class="type"><div class="type-h"><b>${tlx(id)}</b><span class="small muted">${esc(t.maker)} · ${t.cls}${t.age >= 10 ? ` · ${t.age} J. alt` : ''}</span></div>
      <div class="acv-box">${acSvg(id, { ...myAcColors(), code: pl.code })}</div>
      <div class="specs"><div><span>Sitze</span><b>${t.seats.basic}/${t.seats.standard}/${t.seats.premium}</b></div><div><span>Reichweite</span><b>${n0(t.range_km)} km</b></div><div><span>Verbrauch</span><b>${n0(t.fuel_bh_kg)} kg/h</b></div><div><span>Crew</span><b>2 + ${t.cabin}</b></div></div>
      <div class="small ink2">${esc(t.note)}. ${esc(t.engines)}.</div>
      <div class="row" style="gap:6px">${avail}</div>
      <div class="small muted">Leasing ${eur(t.lease_month * (1 + duty) * pl.oldAcFactor(t.age) * P.EURUSD / W.macro.eurusd)}/Monat · Flex ${eur(t.lease_month * (1 + duty) * pl.oldAcFactor(t.age) * (1 + P.FLEX_LEASE_PREMIUM) * P.EURUSD / W.macro.eurusd)}/Monat${pl.oldAcFactor(t.age) < 1 ? ' (−10 % durch Luis)' : ''} · ${t.age >= 10 ? `Kauf ${eur(t.value_eur * (1 + duty) * pl.oldAcFactor(t.age))}` : `ab Werk ${eur(t.value_eur * 1.08 * (1 + duty))} in ${SM.leaseDelivery(W, id, 'factory')} Tagen`} · ${intro}</div>
      ${auctionOnly ? '' : `<div class="row">${stock > 0 ? btn(id, 'lease', 'Leasen, 36 Monate', null, true) + btn(id, 'flex', 'Flex-Leasing') : '<span class="small neg">Leasing derzeit nicht möglich</span>'}${t.age >= 10 ? '' : btn(id, 'factory', 'Ab Werk bestellen')}</div>`}</div>`;
  }).join('')}</div>
  <p class="small muted">Leasinggeber haben nur begrenzten Bestand, den sich alle Airlines teilen; viele Bestellungen verlängern die Lieferzeiten. Flugzeuge kosten jeden Tag, auch wenn sie stehen.</p>`;
  return html;
};

// ---------- Personal ----------
VIEWS.staff = function viewStaff() {
  const pl = W.player, st = pl.staff, rows = staffPlan(pl), cov = st.cov;
  const hrLead = (role) => Math.round(P.STAFF.lead[role] * SM.lv3([1, 0.75, 0.6, 0.5], pl.skill('hr')) * (role === 'pilot' ? W.macro.laborTight : 1));
  let html = `<h2 class="sec">Personal <small>${n0(SM.sumObj(st.pil) + st.cab + st.tech)} Beschäftigte · ${eur(pl.staffMonthly(cpi()))} pro Monat</small></h2>`;
  html += `<div class="crewrule"><div><b>Piloten</b><span>je Musterfamilie eingestellt – ein Typ-Rating gilt nur für ${[...new Set(pl.fleet.map((a) => P.AIRCRAFT_TYPES[a.type_id].group))].map((g) => esc(P.TYPE_GROUPS[g])).join(', ') || 'die jeweilige Familie'}. Umschulung auf eine andere Familie dauert ${P.STAFF.trainDays} Tage.</span></div><div><b>Flugbegleiterinnen &amp; Technik</b><span>arbeiten auf allen Mustern und an allen Basen.</span></div></div>`;
  if (cov) {
    const canc = Object.entries(cov.cancel).filter(([, v]) => v > 0);
    if (canc.length) html += `<div class="callout crit">Heute fallen Flüge aus: Es fehlen Crews${st.agency ? '' : ', und Agenturpersonal ist abgeschaltet'}.</div>`;
    else if (cov.agencyH > 0) html += `<div class="callout warn">Heute ${n0(cov.agencyH)} Crew-Stunden über Agenturen (1,6-facher Satz) und ${n0(cov.overtimeH)} Überstunden. Mehrkosten ${eur(cov.extraCost)} pro Tag.</div>`;
    else if (cov.overtimeH > 0) html += `<div class="callout info">Heute ${n0(cov.overtimeH)} Überstunden (1,5-facher Satz). Dauerhafte Überlastung drückt die Stimmung.</div>`;
  }
  html += `<div class="tw"><table class="t"><thead><tr><th>Gruppe</th><th class="r">Bestand</th><th class="r">Bedarf</th><th class="r">kommen</th><th class="r">Gehalt</th></tr></thead><tbody>
    ${rows.map((r) => { const gap = r.have + r.pipe - r.need; return `<tr><td>${r.label}</td><td class="r">${n0(r.have)}</td><td class="r">${n0(Math.ceil(r.need))}</td><td class="r">${r.pipe ? '+' + n0(r.pipe) : '–'}</td><td class="r">${eur(r.salary * st.pay * cpi())}</td></tr>
      <tr class="sub"><td colspan="5"><div class="row small"><span class="${gap < 0 ? 'neg' : 'muted'}">${gap < 0 ? `fehlen ${n0(Math.ceil(-gap))}` : `Reserve ${n0(Math.floor(gap))}`}</span>
        <input type="number" id="hire-${r.key}" min="1" max="${P.STAFF.maxHire[r.role]}" value="${Math.max(1, Math.min(P.STAFF.maxHire[r.role], Math.ceil(Math.max(1, r.need * 1.1 - r.have - r.pipe))))}" style="width:64px">
        <button class="btn small primary" data-act="hire" data-role="${r.role}" data-group="${r.group || ''}" data-key="${r.key}">Einstellen</button><button class="btn small" data-act="fire" data-role="${r.role}" data-group="${r.group || ''}" data-key="${r.key}">Entlassen</button>
        <span class="muted">Start in ${hrLead(r.role)} T. · ${eur(P.STAFF.recruit[r.role] * cpi() * (r.role === 'pilot' ? W.macro.laborTight : 1))} je Einstellung</span></div></td></tr>`; }).join('')}
  </tbody></table></div>
  <div class="row"><button class="btn primary" data-act="fillstaff">Bedarf plus 10 % Reserve decken</button><button class="btn" data-act="dealnew">Crews per Handel übernehmen</button><span class="small muted">Monatlich höchstens ${P.STAFF.maxHire.pilot} Piloten, ${P.STAFF.maxHire.cabin} Flugbegleiterinnen, ${P.STAFF.maxHire.tech} Techniker. Entlassen kostet ${P.STAFF.severanceMonths} Monatsgehälter.</span></div>
  <p class="small muted">Bedarf aus dem Flugplan: Ein Pilot fliegt im Schnitt ${n1(P.STAFF.pilotH)} Blockstunden am Tag, eine Flugbegleiterin ${n1(P.STAFF.cabinH)}. Technik: ${n1(P.STAFF.techPerAc)} Personen je Flugzeug, sonst steigen Ausfälle und Wartungskosten.</p>`;
  const groups = SM.STAFF_GROUPS.filter((g) => st.pil[g] > 0);
  if (groups.length && new Set(pl.typesIntroduced.map((x) => P.AIRCRAFT_TYPES[x].group)).size > 1) {
    html += `<div class="card pad stack"><h3>Umschulung (Musterberechtigung)</h3><div class="row small"><select id="tr-from" style="width:auto">${groups.map((g) => `<option value="${g}">${P.TYPE_GROUPS[g]} (${st.pil[g]})</option>`).join('')}</select> → <select id="tr-to" style="width:auto">${SM.STAFF_GROUPS.map((g) => `<option value="${g}">${P.TYPE_GROUPS[g]}</option>`).join('')}</select>
      <input type="number" id="tr-n" min="1" value="2" style="width:60px"><button class="btn small" data-act="train">Umschulen</button></div><span class="small muted">${P.STAFF.trainDays} Tage, ${eur(P.STAFF.trainCost * cpi())} je Pilot. Während der Schulung fliegen sie nicht, bekommen aber Gehalt.</span></div>`;
  }
  html += `<div class="stack"><h2 class="sec">Tarif und Stimmung</h2>
    <div class="row"><span class="small">Gehaltsniveau</span><div class="seg">${[0.9, 0.95, 1, 1.05, 1.1, 1.2].map((v) => `<button data-act="payrel" data-v="${v}" aria-pressed="${Math.abs(st.pay / wageNow() - v) < 0.004}">${v === 1 ? 'Markt' : (v > 1 ? '+' : '−') + n0(Math.abs(v - 1) * 100) + ' %'}</button>`).join('')}</div>${![0.9, 0.95, 1, 1.05, 1.1, 1.2].some((v) => Math.abs(st.pay / wageNow() - v) < 0.004) ? `<span class="chip ${st.pay < wageNow() ? 'crit' : ''}">aktuell ${pct(st.pay / wageNow() - 1).replace(/^(?!-|−)/, '+')} zum Markt</span>` : ''}</div>
    <div class="lfrow" style="grid-template-columns:70px 1fr 48px"><span>Stimmung</span><div class="bar"><i class="${st.morale < 0.5 ? 'crit' : 'me'}" style="width:${(st.morale * 100).toFixed(0)}%"></i><span class="tgt" style="left:55%"></span></div><span class="num">${pct(st.morale)}</span></div>
    <p class="small muted">Die Stimmung folgt dem Gehalt und der Arbeitslast. Unter etwa 55 % steigen Kündigungen und das Streikrisiko. Eine Personalfachkraft hebt die Stimmung und beschleunigt Einstellungen.</p>
    <label class="chk"><input type="checkbox" id="agency" ${st.agency ? 'checked' : ''}> Lücken mit Agenturpersonal füllen (1,6-facher Stundensatz). Aus: Flüge ohne Crew fallen aus.</label></div>`;
  html += laborHtml() + academyHtml() + poachHtml();
  // Fachkräfte
  html += `<div class="stack"><h2 class="sec">Fachkräfte und Berater <small>${pl.experts.length} angestellt</small></h2>`;
  html += pl.experts.length ? pl.experts.map((e) => `<div class="card pad stack"><div class="spread"><b>${esc(e.name)}</b><span class="chip me">${P.EXPERT_ROLES[e.role].label} · ${LEVEL[e.level]}</span></div>
      <div class="small ink2">${esc(P.EXPERT_ROLES[e.role].effect[e.level - 1])}</div>
      <div class="spread small muted"><span>${e.years} Jahre Erfahrung, ${esc(e.prev)}, Schwerpunkt ${esc(e.region)}</span><span>${eur(e.salary * cpi())}/Monat <button class="btn small" data-act="fireexpert" data-id="${e.id}">Freistellen</button></span></div></div>`).join('')
    : '<p class="small muted">Noch niemand. Fachkräfte wirken sofort und dauerhaft, jede Rolle kann einmal besetzt werden (Marktanalyse zweimal).</p>';
  { const taken = SM.P.STAR_CONSULTANTS.map((S) => [S, W.starHolder(S.id)]).filter(([, h]) => h && h.id !== pl.id);
    if (taken.length) html += `<p class="small muted">${taken.map(([S, h]) => `${esc(S.name)} arbeitet gerade für ${esc(h.name)}.`).join(' ')} Wer ihn freistellt oder verliert, gibt ihn wieder frei.</p>`; }
  html += `<h3>Bewerbungen</h3>${W.candidates.slice().sort((a, b) => (P.EXPERT_ROLES[b.role].unique ? 1 : 0) - (P.EXPERT_ROLES[a.role].unique ? 1 : 0) || a.role.localeCompare(b.role) || b.level - a.level).map((c) => {
    const taken = pl.experts.filter((e) => e.role === c.role).length >= P.EXPERT_ROLES[c.role].max;
    return `<div class="cand"><div class="spread"><b>${esc(c.name)}</b><span class="chip">${P.EXPERT_ROLES[c.role].label} · ${LEVEL[c.level]}</span></div>
      <div class="small ink2">${esc(P.EXPERT_ROLES[c.role].effect[c.level - 1])}</div>
      <div class="spread small"><span class="muted">${c.years} Jahre, ${esc(c.trait)}, ${esc(c.prev)} · kennt ${esc(c.region)} · ${P.EXPERT_ROLES[c.role].unique ? `einmalig in der Welt – verfügbar, bis jemand zugreift · Antrittshonorar ${eur(P.EXPERT_ROLES[c.role].signOn)}` : 'bis ' + dateShort(c.expires)}</span>
        <span><b class="mono">${eur(c.salary)}</b>/Mon. <button class="btn small${taken ? '' : ' primary'}" data-act="hireexpert" data-id="${c.id}" ${taken ? 'disabled title="Rolle besetzt"' : ''}>Einstellen</button></span></div></div>`;
  }).join('')}<p class="small muted">Neue Bewerbungen kommen zum Monatswechsel. Wer eine Region kennt, liefert dort Marktstudien schneller und genauer.</p></div>`;
  return html;
};

// ---------- Stationen ----------
VIEWS.stations = function viewStations() {
  const pl = W.player, list = stationsOf(pl), proc = 1 - SM.lv3([0, 0.03, 0.06, 0.09], pl.skill('procurement'));
  let total = 0;
  const cards = list.map((apt) => {
    const s = pl.station(apt), x = SM.apx(apt), d = depsAt(pl, apt), isBase = pl.bases.includes(apt);
    const rent = P.TERMINALS[s.terminal].rent * x.cost * cpi() * proc;
    const contract = d.hand * x.hand * cpi() * proc, own = P.OWN_HANDLING_DAY * x.cost * cpi() + d.hand * P.OWN_HANDLING_SHARE * cpi();
    const hangar = pl.hangars.includes(apt);
    const monthly = rent + (s.handling === 'own' ? P.OWN_HANDLING_DAY * x.cost * cpi() * 30.4 : 0) + (hangar ? P.HANGAR_MONTH * x.cost * cpi() * proc : 0);
    total += monthly;
    const slots = slotsMine(apt);
    return `<div class="card pad stack"><div class="spread"><b>${apt} · ${apName(apt)}</b><span>${isBase ? '<span class="chip me">Basis</span> ' : ''}${isFinite(slots) ? `<span class="chip ${slots < 2 ? 'warn' : ''}">${slotTxt(apt)} Slots frei</span>` : '<span class="chip">ohne Slotvergabe</span>'}</span></div>
      <div class="small muted">${d.n} ${d.n === 1 ? 'Abflug' : 'Abflüge'} pro Tag · Fixkosten ${eur(monthly)} pro Monat</div>
      <div class="stack small"><span class="muted">Terminal</span><div class="opts">${Object.entries(P.TERMINALS).map(([k, t]) => `<button data-act="term" data-apt="${apt}" data-v="${k}" aria-pressed="${s.terminal === k}" title="${esc(t.desc)}"><b>${t.label}</b><span>${eur(t.rent * x.cost * cpi() * proc)}/Mon.</span></button>`).join('')}</div>
        <span class="muted">${esc(P.TERMINALS[s.terminal].desc)}. Passagierentgelte ×${NF2.format(P.TERMINALS[s.terminal].paxF)}, Bodenzeit ${P.TERMINALS[s.terminal].turn > 0 ? '+' : ''}${P.TERMINALS[s.terminal].turn} Min., Geschäftsreisende ${s.terminal === 'prem' ? 'zahlen lieber mehr' : s.terminal === 'lcc' ? 'meiden Sie eher' : 'neutral'}.</span></div>
      <div class="stack small"><span class="muted">Abfertigung</span><div class="opts"><button data-act="hand" data-apt="${apt}" data-v="contract" aria-pressed="${s.handling === 'contract'}"><b>Dienstleister</b><span>${eur(contract)}/Tag</span></button><button data-act="hand" data-apt="${apt}" data-v="own" aria-pressed="${s.handling === 'own'}"><b>Eigenes Team</b><span>${eur(own)}/Tag</span></button></div>
        <span class="muted">Ein eigenes Team kostet fest ${eur(P.OWN_HANDLING_DAY * x.cost * cpi())} pro Tag und lohnt sich ab vielen Abflügen.</span></div>
      ${isBase && pl.bases.length > 1 ? (ui.confirm === 'closebase:' + apt ? (() => { const rs = pl.activeRoutes().filter((r) => r.base === apt), acs = pl.fleet.filter((a) => a.base === apt), others = pl.bases.filter((b) => b !== apt);
        return `<div class="callout warn"><b>Basis ${apt} schließen?</b><span>${rs.length ? `Eingestellt werden: ${rs.map((r) => r.base + '–' + r.dest).join(', ')}. ` : ''}${acs.length ? `${acs.length} Flugzeuge ziehen um nach <select id="cb-to" style="width:auto">${others.map((b) => `<option>${b}</option>`).join('')}</select> (je ${eur(12000 * cpi())}). ` : ''}Einmalig ${eur(P.BASE_SETUP_COST * 0.25 * cpi())} für Auflösung, danach entfallen ${eur(P.BASE_FIXED_DAY * cpi())} pro Tag. Slots ab ${apt} bleiben 180 Tage in Ihrer Reserve.</span>
          <div class="row"><button class="btn small danger" data-act="closebase" data-apt="${apt}">Ja, schließen</button><button class="btn small" data-act="cancelconfirm">Abbrechen</button></div></div>`; })()
        : `<div class="row small"><button class="btn small danger" data-act="askclosebase" data-apt="${apt}">Basis schließen</button><span class="muted">Strecken ab ${apt} werden eingestellt, Flugzeuge verlegt.</span></div>`) : ''}
      ${isBase ? `<div class="row small"><span>Hangar: ${hangar ? 'gemietet' : 'keiner'}</span><button class="btn small" data-act="hangar" data-apt="${apt}">${hangar ? 'Kündigen' : `Mieten (${eur(P.HANGAR_MONTH * x.cost * cpi() * proc)}/Mon.)`}</button><span class="muted">Wartung −6 %, C-Check ${P.HANGAR_CHECK_DAYS} Tage kürzer für hier stationierte Flugzeuge</span></div>` : ''}
    </div>`;
  });
  let html = `<h2 class="sec">Stationen <small>${list.length} Flughäfen · ${eur(total)} pro Monat</small></h2>
    <p class="small ink2">An jedem Flughafen mieten Sie Schalter und Gates und kaufen die Abfertigung ein. Billige Bereiche sparen Miete und Entgelte, kosten aber Bodenzeit und Geschäftsreisende.</p>${cards.join('')}`;
  const cand = SM.AP_CODES.filter((c) => !pl.bases.includes(c));
  html += `<div class="card pad stack"><h3>Neue Basis eröffnen</h3><p class="small ink2">Eine Basis erlaubt Strecken von dort aus und Umsteigeverbindungen über diesen Flughafen. Einmalig ${eur(P.BASE_SETUP_COST * cpi())}, danach ${eur(P.BASE_FIXED_DAY * cpi())} pro Tag für Leitung und Crewräume. Flugzeuge lassen sich im Tab Flotte umstationieren.</p>
    <div class="row"><select id="newbase" style="width:auto">${cand.map((c) => { const al = W.list.find((x) => x.archetype && x.bases.includes(c)); return `<option value="${c}">${c} · ${apName(c)}${al ? ' · Basis ' + al.name : ''}</option>`; }).join('')}</select><button class="btn" data-act="openbase">Basis eröffnen</button></div></div>`;
  const slotApts = SM.AP_CODES.filter((c) => isFinite(W.slotsFree(c)));
  html += `<div class="stack"><h2 class="sec">Slots <small>koordinierte Flughäfen</small></h2><table class="t"><thead><tr><th>Flughafen</th><th class="r">für Sie frei</th><th class="r">Entgelt je Bewegung</th></tr></thead><tbody>${slotApts.map((c) => `<tr><td>${c} · ${apName(c)}</td><td class="r">${slotTxt(c)}</td><td class="r">${eur(SM.apx(c).slotFee * cpi())}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">Jeder tägliche Flug belegt einen Slot an beiden Enden. Im April und Oktober (Sommer- und Winterflugplan) kommen neue Slots dazu; wer eine Strecke einstellt, gibt seine frei.</p></div>`;
  return html;
};

// ---------- Einkauf ----------
VIEWS.supply = function viewSupply() {
  const pl = W.player, M = W.macro, kg = W.estFuelKgMonth(pl);
  const hq = W.hedgeQuote(pl, ui.hedge.share, ui.hedge.months);
  const h = pl.hedge && pl.hedge.until > W.day ? pl.hedge : null;
  let html = `<h2 class="sec">Einkauf und Verträge</h2>`;
  html += `<div class="tiles">
    <div class="tile"><span>Kerosin Tagespreis</span><b>${NF3.format(W.fuelPrice)} €/kg</b><em>${NF3.format(M.fuelUsd)} $/kg · 1 € = ${NF3.format(M.eurusd)} $</em></div>
    <div class="tile"><span>Ø 12 Monate</span><b>${NF3.format(W.fuelAvg())} €/kg</b><em>${W.fuelPrice > W.fuelAvg() ? 'aktuell teurer' : 'aktuell günstiger'}</em></div>
    <div class="tile"><span>Ihr Verbrauch</span><b>${n0(kg / 1000)} t</b><em>pro Monat, ${eur(kg * W.fuelPrice)}</em></div>
  </div>`;
  html += `<div class="stack"><h2 class="sec">Kerosin <small>${h ? `${pct(h.share)} abgesichert bis ${dateShort(h.until)}` : 'alles zum Tagespreis'}</small></h2>${miniLine(W.fuelHist.slice(-365), (v) => NF2.format(v) + ' €')}
    ${h ? `<div class="callout good">Abgesichert: ${pct(h.share)} Ihres Bedarfs zu ${NF3.format(h.price)} €/kg bis ${dateShort(h.until)}. Tagespreis heute ${NF3.format(W.fuelPrice)} €/kg: ${W.fuelPrice > h.price ? 'die Absicherung spart Geld' : 'die Absicherung kostet gerade Geld'}.</div>` : ''}
    <div class="card pad stack"><h3>Preis absichern (Hedging)</h3>
      <div class="row small"><span>Anteil</span><div class="seg">${[0.25, 0.5, 0.8].map((v) => `<button data-act="hq" data-k="share" data-v="${v}" aria-pressed="${ui.hedge.share === v}">${pct(v)}</button>`).join('')}</div>
        <span>Laufzeit</span><div class="seg">${[3, 6, 12].map((v) => `<button data-act="hq" data-k="months" data-v="${v}" aria-pressed="${ui.hedge.months === v}">${v} Mon.</button>`).join('')}</div></div>
      <p class="small ink2">Festpreis ${NF3.format(hq.price)} €/kg für ${pct(ui.hedge.share)} des Bedarfs${hq.impact > 0.002 ? ` (davon ${pct(hq.impact, 1)} Aufschlag, weil am Terminmarkt gerade viel gekauft wird)` : ''}, Prämie ${pct(hq.prem, 1)} je Monat: <b>${eur(hq.cost)}</b> sofort.${kg ? '' : ' Ohne Flugplan gibt es nichts abzusichern.'}</p>
      <div class="row"><button class="btn primary" data-act="hedge" ${kg ? '' : 'disabled'}>${h ? 'Neu absichern (ersetzt die laufende)' : 'Absichern'}</button>${h ? '<button class="btn" data-act="unhedge">Absicherung beenden</button>' : ''}</div>
      <p class="small muted">Schützt vor Ölpreisschocks, kostet aber eine Prämie, und bei fallenden Preisen zahlen Sie mehr als die Konkurrenz. Große Absicherungen treiben den Terminpreis und im Folgemonat auch den Tagespreis – für alle Airlines. Eine Einkaufsfachkraft senkt Prämie und Kerosinpreis.</p></div></div>`;
  html += `<div class="stack"><h2 class="sec">Versicherung</h2><div class="opts">${Object.entries(P.INSURANCE).map(([k, v]) => `<button data-act="ins" data-v="${k}" aria-pressed="${pl.insurance === k}"><b>${v.label}</b><span>${NF2.format(v.rate * 100)} % vom Wert · Selbstbehalt ${eur(v.deductible)}</span></button>`).join('')}</div>
    <p class="small muted">Jahresprämie in Prozent des Flugzeugwerts. Der Selbstbehalt gilt je Triebwerks- oder Strukturschaden (Reparaturen kosten ${eur(P.AOG_COST[0])} bis ${eur(P.AOG_COST[1])}).</p></div>`;
  const mk = pl.marketing;
  html += `<div class="stack"><h2 class="sec">Marketing <small>Marke ${n0(pl.brand * 100)} / 100</small></h2><div class="seg wrap">${[0, 25000, 50000, 100000, 200000].map((v) => `<button data-act="mkt" data-v="${v}" aria-pressed="${mk === v}">${v ? eur(v) : 'keins'}</button>`).join('')}</div>
    <p class="small muted">Monatsbudget. Bekanntheit und Image wirken auf die Buchungswahl: Wettbewerber stehen bei 60 bis 70. Die Marke wächst mit abnehmendem Ertrag und verblasst ohne Werbung langsam; schlechte Pünktlichkeit kostet Punkte.</p></div>`;
  const lm = pl.ledger.months.at(-1), cr = lm ? (lm.acc.rev_cargo || 0) / 100 : 0;
  html += `<div class="stack"><h2 class="sec">Beiladefracht</h2><label class="chk"><input type="checkbox" id="cargo" ${pl.cargo ? 'checked' : ''}> Frachtraum über einen Frachtagenten vermarkten (${eur(P.CARGO.gsaMonth * cpi())} pro Monat, 15 % Provision)</label>
    <p class="small muted">Nutzt den Frachtraum unter der Kabine. Lohnt auf Strecken zwischen Wirtschaftszentren, weniger auf Ferienstrecken. ${lm ? `Letzter Monat: ${eur(cr)} Frachterlös.` : ''}</p></div>`;
  return html;
};

// ---------- Datenblatt Flugzeugmuster ----------
function showAcInfo(id) {
  const t = P.AIRCRAFT_TYPES[id]; if (!t) return;
  const pl = W.player, base = pl.bases[0], mine = pl.fleet.filter((a) => a.type_id === id), fam = P.TYPE_GROUPS[t.group];
  const reach = SM.AP_CODES.filter((c) => c !== base && SM.routeKmOk(base, c) && SM.rangeOk(base, c, id));
  const sample = reach.map((c) => ({ c, km: SM.gcDistanceKm(base, c), pot: potOf(base, c).sum })).sort((a, b) => b.pot - a.pot).slice(0, 6);
  const bh1000 = SM.blockHours(base, sample[0] ? sample[0].c : base, id);
  const cpiV = cpi(), lease = t.lease_month * P.EURUSD / W.macro.eurusd;
  const row = (l, v) => `<tr><td>${l}</td><td class="r">${v}</td></tr>`;
  const m = modal(`<div class="spread"><div><h1 style="margin:0">${esc(t.label)}</h1><span class="small muted">${esc(t.maker)} · ${esc(t.cls)} · Familie ${esc(fam)}</span></div><button class="btn small" id="aiClose">Schließen</button></div>
    <div class="acv-box">${acSvg(id, { ...myAcColors(), code: pl.code })}</div>
    <p class="small ink2">${esc(t.note || '')}${t.engines ? ` · ${esc(t.engines)}` : ''}</p>
    <div class="tiles">
      <div class="tile"><span>Sitzplätze</span><b>${t.seats.standard}</b><em>Basis ${t.seats.basic} · Komfort ${t.seats.premium}</em></div>
      <div class="tile"><span>Reichweite</span><b>${n0(t.range_km)} km</b><em>ab ${base}: ${reach.length} Ziele erreichbar</em></div>
      <div class="tile"><span>Reisegeschwindigkeit</span><b>${n0(t.speed_kmh)} km/h</b><em>Wende ${t.turn_min} Min.</em></div>
    </div>
    <div class="grid2">
      <table class="t"><tbody>
        ${row('Crew je Flug', `${SM.pilotsFor(2)} Piloten + ${t.cabin} Flugbegleiterinnen`)}
        ${row('Piloten-Typ-Rating', esc(fam))}
        ${row('Verbrauch', `${n0(t.fuel_bh_kg)} kg/h + ${n0(t.fuel_cycle_kg)} kg je Start`)}
        ${row('Frachtraum', `${n0(t.cargo_kg)} kg`)}
        ${row('Betriebsfenster', `${SM.winOf(id)} h pro Tag`)}
        ${row('Zuverlässigkeit', `${pct(t.dispatch_rel, 1)} pünktlich startklar`)}
      </tbody></table>
      <table class="t"><tbody>
        ${row('Leasing', `${eur(lease)}/Monat`)}
        ${row('Kaufpreis neu', eur(t.value_eur * 1.08))}
        ${row('Wartung', `${eur(t.maint_bh * cpiV)}/Blockstunde`)}
        ${row('Abfertigung', `${eur(t.handling * cpiV)} je Umlauf`)}
        ${row('Höchstgewicht', `${n0(t.mtow_t)} t`)}
        ${row('Ihre Flotte', mine.length ? `${mine.length} Stück` : pl.familyKnown(id) ? 'Familie bekannt' : `noch keins · Einführung ${eur(P.TYPE_INTRO_COST)}`)}
      </tbody></table>
    </div>
    ${sample.length ? `<div class="stack"><h3>Größte erreichbare Märkte ab ${base}</h3><table class="t"><thead><tr><th>Ziel</th><th class="r">Distanz</th><th class="r">Blockzeit</th><th class="r">Potenzial/Tag ⇄</th></tr></thead><tbody>${sample.map((x) => `<tr><td><b>${x.c}</b> <span class="small muted">${esc(apName(x.c))}</span></td><td class="r">${n0(x.km)} km</td><td class="r">${n1(SM.blockHours(base, x.c, id))} h</td><td class="r">${n0(x.pot)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <p class="small muted">Sitzplätze je nach Produkt (Basis, Standard, Komfort). Ab 9 Stunden Flugzeit fliegen drei, ab 13 Stunden vier Piloten.${void bh1000 || ''}</p>`, true);
  m.querySelector('#aiClose').addEventListener('click', () => { m.hidden = true; });
  m.onclick = (e) => { if (e.target === m) m.hidden = true; };
}

// ---------- Flughafen-Karte auf der Karte: Reisepotenzial auf einen Blick ----------
function potOf(o, d) { const a = SM.qPot(o, d), b = SM.qPot(d, o); return { leisure: a.leisure + b.leisure, business: a.business + b.business, vfr: a.vfr + b.vfr, sum: a.leisure + a.business + a.vfr + b.leisure + b.business + b.vfr }; }
function aptCardHtml(c) {
  const pl = W.player, base = pl.bases.includes(ui.selBase) ? ui.selBase : pl.bases[0], a = P.AIRPORTS[c];
  const isBase = pl.bases.includes(c);
  let body = '';
  if (!isBase && SM.routeKmOk(base, c)) {
    const p = potOf(base, c), km = SM.gcDistanceKm(base, c), rail = SM.railShare(base, c);
    const comp = W.competitorOffers(W.playerId, base, c), mine = pl.activeRoutes().find((r) => SM.pairKey(r.base, r.dest) === SM.pairKey(base, c));
    const months = Array.from({ length: 12 }, (_, m) => { const q = SM.qPot(base, c, m), r = SM.qPot(c, base, m); return q.leisure + q.business + q.vfr + r.leisure + r.business + r.vfr; });
    const mx = Math.max(...months);
    body = `<div class="ac-pot"><span>Reisepotenzial ${base} ⇄ ${c}</span><b>${n0(p.sum)}</b><em>Menschen pro Tag, beide Richtungen</em></div>
      <div class="ac-mix"><span style="flex:${p.leisure}" title="Urlaub ${pct(p.leisure / p.sum)}" class="l"></span><span style="flex:${p.business}" title="Geschäft ${pct(p.business / p.sum)}" class="b"></span><span style="flex:${p.vfr}" title="Besuch ${pct(p.vfr / p.sum)}" class="v"></span></div>
      <div class="small muted">Urlaub ${pct(p.leisure / p.sum)} · Geschäft ${pct(p.business / p.sum)} · Besuch ${pct(p.vfr / p.sum)}</div>
      <div class="ac-season" title="Saison: Potenzial je Monat">${months.map((v, m) => `<i style="height:${(v / mx * 100).toFixed(0)}%" title="${MONTHS[m]}: ${n0(v)} pro Tag"></i>`).join('')}</div>
      <div class="small muted" style="display:flex;justify-content:space-between"><span>Jan</span><span>Saison</span><span>Dez</span></div>
      <div class="small">${n0(km)} km · ${n1(SM.blockHours(base, c, 'A20N'))} h mit A320neo${rail > 0.05 ? ` · Bahn nimmt ${pct(rail)}` : ''}</div>
      <div class="small">${mine ? `<span class="chip me">Sie fliegen ${mine.freq}x</span> ` : ''}${comp.length ? comp.map((o) => `<span class="sw" style="background:${colorOf(W.airlines[o.airline])}"></span> ${esc(W.airlines[o.airline].name)} ${o.freq}x ${eur(o.fare)}`).join(' · ') : 'Noch keine Konkurrenz auf dieser Strecke.'}</div>`;
  }
  const top = SM.AP_CODES.filter((d) => d !== c && SM.routeKmOk(c, d)).map((d) => ({ d, s: potOf(c, d).sum })).sort((x, y) => y.s - x.s).slice(0, 5);
  body += `<div class="small" style="margin-top:6px"><b>Größte Märkte ab ${c}:</b> ${top.map((x) => `<a href="#" data-aptsel="${x.d}">${x.d}</a> ${n0(x.s)}`).join(' · ')}</div>`;
  return `<div class="apc-head"><div><b>${c} · ${esc(a.name)}</b><span>${esc(SM.COUNTRY_NAMES[a.country].replace(/^den /, ''))} · ${NF1.format(a.pop)} Mio. Einwohner</span></div><button class="x" data-apc="close" aria-label="Schließen">×</button></div>
    <div class="apc-body">${body}</div>
    <div class="apc-foot">${!isBase && SM.routeKmOk(base, c) ? `<button class="btn small primary" data-apc="plan" data-apt="${c}">Strecke ${base}–${c} planen</button>` : ''}<button class="btn small" data-apc="market" data-apt="${c}">Markt ansehen</button></div>`;
}
function showAptCard(c) {
  const box = $('#aptCard'); if (!box || !W) return;
  if (!c) { box.hidden = true; return; }
  $('#planeCard').hidden = true; ui.sel = null;
  box.innerHTML = aptCardHtml(c); box.hidden = false; ui.aptCard = c;
}

// ---------- Markt ----------
function selectAirport(c) {
  ui.selApt = c; showAptCard(c);
  const pl = W.player;
  if (ui.tab === 'plan' && ui.planner && c !== ui.planner.base) { ui.planner = { ...defaultPlanner(c, ui.planner.base), freq: ui.planner.freq, service: ui.planner.service, buffer: ui.planner.buffer }; setTab('plan'); }
  else { if (pl.bases.includes(c)) ui.selBase = c; setTab('market'); }
  renderMapRoutes(true);
}
VIEWS.market = function viewMarket() {
  const pl = W.player, base = pl.bases.includes(ui.selBase) ? ui.selBase : pl.bases[0], c = ui.selApt || base, a = P.AIRPORTS[c];
  const based = W.list.filter((x) => x.bases.includes(c) && x.status !== 'insolvent');
  let html = `<div class="spread"><h2 class="sec">${esc(a.name)} <small>${c} · ${SM.COUNTRY_NAMES[a.country].replace(/^den /, '')}</small></h2>${c !== base ? `<button class="btn primary" data-act="planfrom" data-apt="${c}">Strecke ${base}–${c} planen</button>` : '<span class="chip me">Ihre Basis</span>'}</div>`;
  const ev = W.activeEvents().concat(W.upcomingEvents()).filter((e) => W.eventAffects(e, c) && e.scope !== 'all');
  for (const e of ev) html += `<div class="callout ${e.severity === 'good' ? 'good' : 'warn'}">${e.start > W.day ? `Ab ${dateShort(e.start)}: ` : ''}${esc(e.text)}</div>`;
  if (c !== base && SM.routeKmOk(base, c)) { const p = potOf(base, c); html += `<div class="tiles"><div class="tile"><span>Reisepotenzial ${base} ⇄ ${c}</span><b>${n0(p.sum)} pro Tag</b><em>Urlaub ${pct(p.leisure / p.sum)} · Geschäft ${pct(p.business / p.sum)} · Besuch ${pct(p.vfr / p.sum)}</em></div><div class="tile"><span>Distanz</span><b>${n0(SM.gcDistanceKm(base, c))} km</b><em>${SM.railShare(base, c) > 0.05 ? `Bahn nimmt ${pct(SM.railShare(base, c))}` : 'keine Bahnkonkurrenz'}</em></div><div class="tile"><span>Konkurrenz</span><b>${W.competitorOffers(W.playerId, base, c).length || 'keine'}</b><em>Airlines auf ${base}–${c}</em></div></div>`; }
  html += `<div class="tiles">
    <div class="tile"><span>Einzugsgebiet</span><b>${NF1.format(a.pop)} Mio.</b><em>Einwohner</em></div>
    <div class="tile"><span>Tourismus</span><b>${NF2.format(a.tour)}</b><em>Index, 1 = Mittel</em></div>
    <div class="tile"><span>Wirtschaft</span><b>${NF2.format(a.biz)}</b><em>Konjunktur ${pct(W.macro.econ[a.country] - 1).replace(/^(?!−|-)/, '+')}</em></div>
    <div class="tile"><span>Passagierentgelt</span><b>${eur(a.paxfee * cpi())}</b><em>je Abflug-Pax</em></div>
    <div class="tile"><span>Ticketsteuer</span><b>${eur(W.taxAt(c))}</b><em>zahlt der Kunde</em></div>
    <div class="tile"><span>Kerosin</span><b>${NF3.format(W.fuelPrice * SM.apx(c).fuel)} €</b><em>je kg vor Ort</em></div>
  </div>`;
  html += `<p class="small ink2">${based.length ? 'Basis von ' + based.map((x) => `<span class="sw" style="background:${colorOf(x)}"></span> ${esc(x.name)}`).join(', ') : 'Keine Airline hat hier eine Basis.'}${isFinite(W.slotsFree(c)) ? ` Koordinierter Flughafen: ${slotTxt(c)} Slots frei.` : ''}${P.LEISURE_SEASON_PROFILE[c] ? ` Ferienziel mit starker Saison (${P.LEISURE_SEASON_PROFILE[c] === 'island' ? 'Insel: Sommer etwa dreimal so stark wie Winter' : 'Sommer deutlich stärker'}).` : ''}</p>`;
  // Marktstudie
  if (c !== base) {
    const k = SM.pairKey(base, c), s = pl.studies[k], lv = pl.skill('analyst');
    html += `<div class="card pad stack"><h3>Marktstudie ${base}–${c}</h3>${s && s.done ? `<p class="small">Ergebnis von ${esc(s.by)} (${dateShort(s.ready)}): Die Nachfrage liegt <b>${pct(Math.abs(s.est - 1))} ${s.est >= 1 ? 'über' : 'unter'}</b> dem Modellwert, Unsicherheit ±${pct(s.err)}. Die Streckenprognose rechnet damit.</p>`
      : s ? `<p class="small">In Arbeit bei ${esc(s.by)}, fertig am ${dateShort(s.ready)}.</p>`
        : `<p class="small ink2">Jede Strecke hat einen eigenen, unbekannten Nachfragetrend. Eine Studie misst ihn (${eur(P.STUDY_COST * cpi())}).</p>`}
      ${lv ? `<div class="row"><button class="btn small" data-act="study" data-a="${base}" data-b="${c}" ${s && !s.done ? 'disabled' : ''}>${s && s.done ? 'Neu messen' : 'Studie beauftragen'}</button></div>` : '<p class="small muted">Dafür brauchen Sie eine Fachkraft für Marktanalyse (Tab Personal).</p>'}</div>`;
  }
  const allRows = SM.AP_CODES.filter((d) => d !== base && SM.routeKmOk(base, d)).map((d) => {
    const pot = SM.qPot(base, d), sum = pot.leisure + pot.business + pot.vfr;
    const comp = W.competitorOffers(W.playerId, base, d);
    const mine = pl.activeRoutes().find((r) => (r.base === base && r.dest === d) || (r.dest === base && r.base === d));
    const st = pl.studies[SM.pairKey(base, d)];
    return { d, sum, biz: pot.business / sum, dist: SM.gcDistanceKm(base, d), rail: SM.railShare(base, d), comp, mine, st };
  }).sort((x, y) => y.sum - x.sum);
  const rows = ui.marketAll ? allRows : allRows.slice(0, 25);
  html += `<div class="stack"><h2 class="sec">Märkte ab ${base} <small>${ui.marketAll ? `alle ${allRows.length} Ziele` : 'die 25 größten'}, Potenzial pro Tag und Richtung</small></h2><div class="tw"><table class="t"><thead><tr><th>Ziel</th><th class="r">km</th><th class="r">Potenzial</th><th class="r">Geschäft</th><th>Angebot heute</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td><a href="#" data-act="selapt" data-apt="${r.d}">${r.d}</a> <span class="small muted">${apName(r.d)}</span>${r.rail > 0.1 ? ` <span class="chip">Bahn ${pct(r.rail)}</span>` : ''}${r.st && r.st.done ? ` <span class="chip ${r.st.est >= 1 ? 'good' : 'warn'}">Studie ${r.st.est >= 1 ? '+' : '−'}${pct(Math.abs(r.st.est - 1))}</span>` : ''}</td><td class="r">${n0(r.dist)}</td><td class="r">${n0(r.sum * (r.st && r.st.done ? r.st.est : 1))}</td><td class="r">${pct(r.biz)}</td>
      <td class="small">${r.mine ? `<span class="chip me">Sie ${r.mine.freq}x</span> ` : ''}${r.comp.length ? r.comp.map((o) => `<span class="sw" style="background:${colorOf(W.airlines[o.airline])}"></span> ${o.freq}x ${eur(o.fare)}`).join(' ') : (r.mine ? '' : '<span class="muted">frei</span>')}</td></tr>`).join('')}
  </tbody></table></div><button class="btn small" data-act="marketall">${ui.marketAll ? 'Nur die 25 größten zeigen' : `Alle ${allRows.length} Ziele zeigen`}</button><p class="small muted">Potenzial heißt: so viele Menschen würden zum Referenzpreis eine Reise erwägen (Jahresmittel, ohne Konjunktur und Ereignisse). Wie viele fliegen, hängt von Preis, Frequenz, Produkt, Pünktlichkeit, Marke und Konkurrenz ab.</p></div>`;
  return html;
};

// ---------- Finanzen ----------
const PNL_ROWS = [
  ['grp', 'Erlöse'], ['rev_ticket', 'Tickets'], ['rev_ancillary', 'Zusatzleistungen'], ['rev_cargo', 'Fracht'], ['rev_acmi', 'ACMI-Charter'],
  ['grp', 'Flugbetrieb'], ['fuel', 'Treibstoff'], ['hedge', 'Kerosin-Absicherung'], ['crew', 'Crew-Spesen'], ['maintenance', 'Wartung'], ['navigation', 'Flugsicherung'],
  ['landing', 'Landeentgelte'], ['handling', 'Abfertigung'], ['pax_fees', 'Passagierentgelte'], ['pax_service', 'Bordservice'], ['distribution', 'Vertrieb'], ['cargo_cost', 'Frachtkosten'], ['disruption', 'Störungen'],
  ['grp', 'Personal'], ['staff_cockpit', 'Cockpit'], ['staff_cabin', 'Kabine'], ['staff_tech', 'Technik'], ['staff_extra', 'Agentur, Überstunden, Recruiting'], ['experts', 'Fachkräfte'],
  ['grp', 'Flugzeuge, Standorte, Verwaltung'], ['lease', 'Leasing'], ['depreciation', 'Abschreibung'], ['insurance', 'Versicherung'], ['stations', 'Stationen und Hangars'], ['slots', 'Slotentgelte'],
  ['marketing', 'Marketing'], ['overhead', 'Verwaltung'], ['one_off', 'Einmalkosten'], ['trade', 'Handel mit Airlines'],
  ['ebit', 'Betriebsergebnis (EBIT)'], ['interest', 'Zinsen'], ['tax', 'Steuern'], ['net', 'Jahresüberschuss'],
];
const PNL_ACCOUNTS_EBIT = SM.PNL_ACCOUNTS.filter((k) => k !== 'interest' && k !== 'tax');
function pnlCol(acc) {
  const v = (k) => (acc[k] || 0) / 100;
  const ebit = PNL_ACCOUNTS_EBIT.reduce((s, k) => s + v(k), 0);
  return { v, ebit, net: ebit + v('interest') + v('tax'), rev: v('rev_ticket') + v('rev_ancillary') + v('rev_cargo') + v('rev_acmi') };
}
VIEWS.finance = function viewFinance() {
  const pl = W.player, bs = SM.balanceSheet(pl), L = pl.ledger;
  const cur = pnlCol(L.month), prev = L.months.length ? pnlCol(L.months.at(-1).acc) : null, tot = pnlCol(L.pnl);
  const pm = dateParts(W.day).m;
  const cell = (col, k) => { if (!col) return '<td class="r muted">–</td>'; const x = k === 'ebit' ? col.ebit : k === 'net' ? col.net : col.v(k); return `<td class="r ${['ebit', 'net'].includes(k) ? sgn(x) : ''}">${x === 0 ? '<span class="muted">0</span>' : eur(x)}</td>`; };
  const used = new Set(PNL_ROWS.filter(([k]) => k !== 'grp' && !['ebit', 'net'].includes(k) && (L.pnl[k] || L.month[k])).map(([k]) => k));
  let html = `<h2 class="sec">Ergebnis und Bilanz <small>EBIT-Marge seit Start ${tot.rev ? pct(tot.ebit / tot.rev, 1) : '–'}</small></h2>`;
  html += `<div class="tiles">
    <div class="tile"><span>Kontostand</span><b class="${netCash(pl) < 0 ? 'neg' : ''}">${eur(netCash(pl))}</b><em>${netCash(pl) < 0 ? 'im Dispo' : 'Guthaben'} · frei ${eur(pl.spendable(W.macro.bank ?? 1))}</em></div>
    <div class="tile"><span>Dispo genutzt</span><b class="${pl.creditUsed > 0 ? 'neg' : ''}">${pl.creditUsed > 0 ? eur(-pl.creditUsed) : eur(0)}</b><em>Rahmen ${eur(pl.creditLimit(W.macro.bank ?? 1))}, ${pct(pl.creditRate(W.macro.rate, W.macro.bank ?? 1), 1)} Zins</em></div>
    <div class="tile"><span>Ergebnis gestern</span><b class="${sgn(L.lastDay || 0)}">${eur(L.lastDay || 0, { plus: true })}</b><em>${MONTHS[pm]} bisher <span class="${sgn(cur.net)}">${eur(cur.net, { plus: true })}</span></em></div>
  </div>
  <div class="stack"><h2 class="sec">Kontostand <small>letzte ${Math.min(netHistOf(pl).length, 365)} Tage</small></h2>${sparkline(netHistOf(pl).slice(-365))}</div>`;
  html += `<div class="stack"><h2 class="sec">Gewinn- und Verlustrechnung <small>Ergebnis ist nicht Kontostand</small></h2><div class="tw"><table class="t"><thead><tr><th></th><th class="r">${MONTHS[pm]} (lfd.)</th><th class="r">Vormonat</th><th class="r">seit Start</th></tr></thead><tbody>
    ${PNL_ROWS.filter(([k]) => k === 'grp' || ['ebit', 'net', 'interest', 'tax'].includes(k) || used.has(k)).map(([k, l]) => k === 'grp' ? `<tr class="grp"><td colspan="4">${l}</td></tr>` : `<tr class="${['ebit', 'net'].includes(k) ? 'sum' : ''}"><td>${l}</td>${cell(cur, k)}${cell(prev, k)}${cell(tot, k)}</tr>`).join('')}
  </tbody></table></div></div>`;
  html += `<div class="stack"><h2 class="sec">Bilanz <small>vereinfacht</small></h2><table class="t"><tbody>
    <tr><td>Bank</td><td class="r">${eur(bs.cash)}</td><td>Flugzeugkredite</td><td class="r">${eur(bs.loans)}</td></tr>
    <tr><td>Flugzeuge (Buchwert)</td><td class="r">${eur(bs.nbv)}</td><td>Bankkredite</td><td class="r">${eur(bs.bank)}</td></tr>
    <tr><td>Leasing-Kautionen</td><td class="r">${eur(bs.deposits)}</td><td>Kreditlinie</td><td class="r">${eur(bs.credit)}</td></tr>
    <tr><td></td><td></td><td>Eigenkapital</td><td class="r">${eur(bs.equity)}</td></tr>
    <tr class="sum"><td>Summe</td><td class="r">${eur(bs.assets)}</td><td>Summe</td><td class="r">${eur(bs.liabilities + bs.equity)}</td></tr>
  </tbody></table><p class="small muted">Außerhalb der Bilanz: Leasingverpflichtungen von rund ${eur(bs.leaseLiab)} (24 Monatsraten). Kauf, Kaution und Tilgung bewegen Geld, aber nicht das Ergebnis. Abschreibung mindert das Ergebnis, aber kein Geld. Steuern: 25 % auf Monatsgewinne mit Verlustvortrag.</p></div>`;
  return html;
};
function miniLine(vals, f) {
  if (vals.length < 2) return '<p class="small muted">Noch keine Daten.</p>';
  const w = 400, h = 50, lo = Math.min(...vals) * 0.98, hi = Math.max(...vals) * 1.02, sp = hi - lo || 1;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(i / (vals.length - 1) * w).toFixed(1)},${(h - 4 - (v - lo) / sp * (h - 8)).toFixed(1)}`).join(' ');
  return `<svg class="spark" style="height:50px" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Verlauf, aktuell ${f(vals.at(-1))}"><path d="${d}" fill="none" stroke="var(--ink-2)" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg><div class="spread small muted"><span>${f(Math.min(...vals))} – ${f(Math.max(...vals))}</span><span>aktuell ${f(vals.at(-1))}</span></div>`;
}

VIEWS.credit = function viewCredit() {
  const pl = W.player, bs = SM.balanceSheet(pl);
  let html = `<h2 class="sec">Kredite und Rating <small>Rating ${pl.rating} · Leitzins ${pct(W.macro.rate, 1)}</small></h2>`;
  html += `<div class="tiles">
    <div class="tile"><span>Rating</span><b>${pl.rating}</b><em>monatlich neu bewertet</em></div>
    <div class="tile"><span>Dispo genutzt</span><b class="${pl.creditUsed > 0 ? 'neg' : ''}">${pl.creditUsed > 0 ? eur(-pl.creditUsed) : eur(0)}</b><em>Rahmen ${eur(pl.creditLimit(W.macro.bank ?? 1))}, ${pct(pl.creditRate(W.macro.rate, W.macro.bank ?? 1), 1)} Zins</em></div>
    <div class="tile"><span>Reichweite</span><b class="${pl.runway < 60 ? 'warnc' : ''}">${pl.runway === undefined || !isFinite(pl.runway) ? 'stabil' : `${n0(pl.runway)} Tage`}</b><em>Kontostand ${eur(netCash(pl))}</em></div>
  </div>`;
  // Kredite
  const lim = W.loanLimit(pl), rate = W.loanRate(pl);
  html += `<div class="card pad stack"><h3>Neuer Bankkredit</h3>
    ${pl.loans.length ? `<table class="t"><thead><tr><th>Kredit</th><th class="r">Rest</th><th class="r">Zins</th><th class="r">Rate/Mon.</th><th></th></tr></thead><tbody>${pl.loans.map((l) => `<tr><td>${dateShort(l.day)} · ${l.years} J.</td><td class="r">${eur(l.balance)}</td><td class="r">${pct(l.rate, 1)}</td><td class="r">${eur(l.annuity)}</td><td class="r"><button class="btn small" data-act="repay" data-id="${l.id}">Ablösen</button></td></tr>`).join('')}</tbody></table>` : ''}
    <div class="row small"><span>Betrag</span><div class="seg">${[1e6, 2e6, 5e6, 10e6].map((v) => `<button data-act="lq" data-k="amount" data-v="${v}" aria-pressed="${ui.loan.amount === v}">${n0(v / 1e6)} Mio.</button>`).join('')}</div>
      <span>Laufzeit</span><div class="seg">${[3, 5, 8].map((v) => `<button data-act="lq" data-k="years" data-v="${v}" aria-pressed="${ui.loan.years === v}">${v} J.</button>`).join('')}</div></div>
    <p class="small ink2">Bei Rating ${pl.rating} gibt die Bank bis ${eur(lim)} zu ${pct(rate, 1)} Zins. Monatsrate für ${eur(ui.loan.amount)}: ${eur(ui.loan.amount * (rate / 12) / (1 - (1 + rate / 12) ** -(ui.loan.years * 12)))}.</p>
    <div class="row"><button class="btn" data-act="loan" ${lim >= ui.loan.amount ? '' : 'disabled'}>Kredit aufnehmen</button></div>
    <p class="small muted">Das Rating ergibt sich monatlich aus Eigenkapitalquote (Leasingverpflichtungen zählen mit) und Zinsdeckung. Es bestimmt Zinsaufschlag und Kreditlinie. Eine Finanzfachkraft verbessert beides.</p>
    <p class="small muted">Die Kreditlinie hängt an Ihren Umsätzen, Ihrem Anlagevermögen und an der Stimmung der Banken (derzeit × ${NF2.format(W.macro.bank ?? 1)}). In Abschwüngen und Bankenkrisen kürzen die Banken Linien – der Überhang wird dann sofort vom Konto eingezogen.${W.player.lineCut ? ' <b class="neg">Ihre Linie wurde zuletzt gekürzt.</b>' : ''}</p></div>`;
  return html;
};

// ---------- Welt ----------
function eventRow(e) {
  const when = e.start > W.day ? `ab ${dateShort(e.start)}` : e.end > W.day ? `bis ${dateShort(e.end)}` : 'erholt sich';
  const cls = e.severity === 'crit' ? 'crit' : e.severity === 'good' ? 'good' : 'warn';
  return `<div><time>${when}</time><span class="${cls}">${esc(e.text)}</span></div>`;
}
VIEWS.world = function viewWorld() {
  const M = W.macro;
  const act = W.activeEvents(), up = W.upcomingEvents();
  let html = `<h2 class="sec">Weltlage <small>${dateLong(W.day)}</small></h2>`;
  html += `<div class="tiles">
    <div class="tile"><span>Kerosin</span><b>${NF3.format(M.fuelUsd)} $/kg</b><em>Referenz ${NF3.format(M.fuelRefUsd)} $</em></div>
    <div class="tile"><span>Euro</span><b>${NF3.format(M.eurusd)} $</b><em>Leasing und Kerosin in Dollar</em></div>
    <div class="tile"><span>Leitzins</span><b>${pct(M.rate, 2)}</b><em>Basis für Kredite</em></div>
    <div class="tile"><span>Preisniveau</span><b>${NF1.format(M.cpi * 100)}</b><em>Start 100, Inflation ~2,2 %</em></div>
    <div class="tile"><span>Arbeitsmarkt</span><b>${M.laborTight > 1.2 ? 'angespannt' : 'normal'}</b><em>Piloten${M.laborTight > 1.2 ? ' knapp und teurer' : ' verfügbar'}</em></div>
    <div class="tile"><span>Ereignisse</span><b>${act.length}</b><em>${up.length} angekündigt</em></div>
  </div>`;
  html += worldExtraHtml();
  html += `<div class="stack"><h2 class="sec">Konjunktur <small>100 = normal, Geschäftsreisen reagieren am stärksten</small></h2><div class="econ">${[...new Set(stationsOf(W.player).map((c) => P.AIRPORTS[c].country).concat(['US', 'CN', 'DE', 'GB', 'JP', 'IN', 'AE', 'BR']))].map((c) => { const v = M.econ[c]; return `<div><span>${SM.COUNTRY_LABEL[c]}</span><div class="bar"><i class="${v < 0.97 ? 'crit' : v > 1.03 ? 'good' : ''}" style="width:${clampPct((v - 0.8) / 0.4)}%"></i><span class="tgt" style="left:50%"></span></div><b class="num">${n0(v * 100)}</b></div>`; }).join('')}</div></div>`;
  html += `<div class="stack"><h2 class="sec">Ereignisse</h2>${act.length + up.length ? `<div class="news">${up.concat(act).map(eventRow).join('')}</div>` : '<p class="small muted">Ruhige Lage.</p>'}</div>`;
  return html;
};
VIEWS.rivals = function viewRivals() {
  const n = W.list.filter((al) => al.status !== 'insolvent').length;
  let html = `<h2 class="sec">Wettbewerb <small>${n} aktive Airlines</small></h2>`;
  { const R = SM.RIVALS[W.rivals] || SM.RIVALS.normal, can = !ui.mp || ui.mp.host;
    html += `<div class="card pad stack"><div class="spread"><b>Stärke der Konkurrenz</b>${can ? '' : '<span class="small muted">stellt die Spielleitung ein</span>'}</div>
      <div class="seg">${Object.entries(SM.RIVALS).map(([k, r]) => `<button data-act="rivals" data-v="${k}" aria-pressed="${k === (W.rivals || 'normal')}" ${can ? '' : 'disabled'}>${r.label}</button>`).join('')}</div>
      <p class="small muted">${esc(R.label)}: ${esc(R.desc)}. Wirkt auf Angriffe auf Ihre Strecken, Preiskämpfe, Abwerben, wie genau die KI Märkte einschätzt und wie schlank sie fliegt.</p></div>`; }
  const cap = W.list.filter((al) => al.status !== 'insolvent').map((al) => ({ al, seats: al.activeRoutes().reduce((a, r) => a + r.seats() * r.freq * 2, 0) })).sort((a, b) => b.seats - a.seats);
  const tot = cap.reduce((a, x) => a + x.seats, 0) || 1, top = cap[0] ? cap[0].seats || 1 : 1;
  let shown = cap.slice(0, 12);
  if (!shown.some((x) => x.al.id === W.playerId)) shown = shown.slice(0, 11).concat(cap.filter((x) => x.al.id === W.playerId));
  html += `<div class="stack"><h2 class="sec">Sitzplatzangebot <small>Sitze pro Tag, Anteil am Gesamtmarkt</small></h2><div class="econ share">${shown.map(({ al, seats }) => `<div><span${al.id === W.playerId ? ' style="font-weight:700;color:var(--ink)"' : ''}><span class="sw" style="background:${colorOf(al)}"></span> ${esc(al.name)}</span><div class="bar"><i style="width:${(seats / top * 100).toFixed(0)}%;background:${colorOf(al)}"></i></div><b class="num">${pct(seats / tot)}</b></div>`).join('')}</div></div>`;
  // Konkurrenz
  const rows = W.list.map((al) => {
    const ms = al.ledger.months.slice(-3);
    let rev = 0, ebit = 0;
    for (const m of ms) { const c = pnlCol(m.acc); rev += c.rev; ebit += c.ebit; }
    return { al, margin: rev ? ebit / rev : null };
  });
  const pl = W.player;
  const famsOf = (al) => [...new Set(al.fleet.map((a) => P.AIRCRAFT_TYPES[a.type_id].group))];
  const myFams = new Set(famsOf(pl)), allFams = [...new Set(W.list.flatMap(famsOf))].sort();
  const flt = ui.rivFilter || 'all';
  const keep = (al) => flt === 'all' || al.id === W.playerId || (flt === 'same' ? famsOf(al).some((g) => myFams.has(g)) : famsOf(al).includes(flt));
  html += `<div class="stack"><h2 class="sec">Airlines im Markt <small>Marge der letzten drei Monate</small></h2>
    <div class="row" style="gap:6px;flex-wrap:wrap"><span class="small muted">Filter:</span><div class="seg wrap">
      <button data-act="rivflt" data-v="all" aria-pressed="${flt === 'all'}">Alle</button>
      <button data-act="rivflt" data-v="same" aria-pressed="${flt === 'same'}" ${myFams.size ? '' : 'disabled title="Sie haben noch keine Flugzeuge"'}>Gleiche Muster wie ich</button>
      ${allFams.map((g) => `<button data-act="rivflt" data-v="${g}" aria-pressed="${flt === g}">${esc(P.TYPE_GROUPS[g])}</button>`).join('')}</div></div>
    <p class="small muted">Gleiche Musterfamilie heißt gleiche Piloten: Piloten haben ein Typ-Rating je Familie und sind nur dort einsetzbar – die interessanten Partner zum Abwerben oder Crew-Handel. Flugbegleiterinnen und Technik arbeiten auf allen Mustern.</p>
    <div class="tw"><table class="t"><thead><tr><th>Airline</th><th>Modell</th><th>Musterfamilien</th><th>Basen</th><th class="r">Flotte</th><th class="r">Strecken</th><th class="r">Marge</th><th></th></tr></thead><tbody>
    ${rows.filter(({ al }) => keep(al)).map(({ al, margin }) => `<tr><td><span class="lgi">${logoSvg(al, 18)}</span> ${esc(al.name)}${al.status !== 'active' ? ` <span class="chip crit">${al.status === 'insolvent' ? 'insolvent' : 'Restrukturierung'}</span>` : ''}</td><td>${al.archetype ? P.AI_ARCHETYPES[al.archetype].label : al.id === W.playerId ? 'Sie' : 'Mitspieler'}</td><td>${famsOf(al).map((g) => `<span class="chip ${al.id !== W.playerId && myFams.has(g) ? 'me' : ''}" title="${esc(P.TYPE_GROUPS[g])}${al.id !== W.playerId && myFams.has(g) ? ' – gleiche Piloten wie bei Ihnen' : ''}">${g}</span>`).join(' ') || '<span class="muted">–</span>'}</td><td>${al.bases.join(', ')}</td><td class="r">${al.fleet.length}</td><td class="r">${al.activeRoutes().length}</td><td class="r ${margin !== null ? sgn(margin) : ''}">${margin === null ? '–' : pct(margin, 1)}</td><td class="r">${al.id !== W.playerId && al.status !== 'insolvent' ? `<button class="btn small" data-act="dealwith" data-al="${al.id}">Handeln</button>` : ''}</td></tr>`).join('')}
  </tbody></table></div></div>`;
  const overlap = [];
  const mine = new Set(pl.activeRoutes().map((r) => SM.pairKey(r.base, r.dest)));
  for (const al of W.list) if (al.id !== W.playerId) for (const r of al.activeRoutes()) if (mine.has(SM.pairKey(r.base, r.dest))) overlap.push([al, r]);
  html += `<div class="stack"><h2 class="sec">Auf Ihren Strecken</h2>${overlap.length ? `<table class="t"><thead><tr><th>Airline</th><th>Strecke</th><th class="r">Flüge</th><th class="r">Tarife</th><th>Produkt</th></tr></thead><tbody>${overlap.map(([al, r]) => `<tr><td><span class="sw" style="background:${colorOf(al)}"></span> ${esc(al.name)}</td><td>${r.base}–${r.dest}</td><td class="r">${r.freq}x</td><td class="r">${n0(r.fare_out)} / ${n0(r.fare_in)} €</td><td>${svcLabel(r.service)}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Niemand fliegt direkt auf Ihren Strecken. Das bleibt nicht so, wenn die Strecken gut verdienen: Die KI prüft jeden Monat neue Märkte und jedes Quartal neue Basen.</p>'}</div>`;
  html += `<div class="callout info">Die KI-Airlines rechnen mit demselben Nachfragemodell und denselben Flugkosten wie Sie. Sie sehen nur öffentliche Preise und Flugpläne und schätzen die Nachfrage mit eigenem Fehler. Ereignisse treffen alle.</div>`;
  return html;
};
const clampPct = (x) => Math.max(0, Math.min(100, x * 100)).toFixed(0);

// ---------- Meldungen ----------
function mergedNews() {
  const pl = W.player;
  const a = W.news.map((n) => ({ day: n.day, msg: n.msg, kind: n.kind, who: n.airline }));
  const b = pl.events.map((e) => ({ day: e.day, msg: e.msg, kind: e.kind, who: W.playerId }));
  return a.concat(b).sort((x, y) => y.day - x.day);
}
function newsRow(n) {
  const al = W.airlines[n.who];
  const cls = n.kind === 'crit' ? 'crit' : n.kind === 'warn' ? 'warn' : n.kind === 'good' ? 'good' : '';
  return `<div><time>${dateShort(n.day)}</time><span class="${cls}">${al ? `<span class="sw" style="background:${colorOf(al)}"></span> ` : ''}${esc(n.msg)}</span></div>`;
}
VIEWS.news = function viewNews() {
  const list = mergedNews().slice(0, 150);
  return `<h2 class="sec">Meldungen <small>Ihre Airline und der Markt</small></h2>${list.length ? `<div class="news">${list.map(newsRow).join('')}</div>` : '<p class="muted">Noch keine Meldungen.</p>'}`;
};

// ---------- Einsatzplan: Flugzeuge festen Strecken zuweisen ----------
const MODE_LABEL = { auto: 'Automatisch', manual: 'Feste Strecken', reserve: 'Reserve' };
const ROUTE_HUES = [212, 152, 266, 32, 330, 186, 48, 0, 100, 290];
const routeColor = (r) => `hsl(${ROUTE_HUES[Math.max(0, W.player.routes.indexOf(r)) % ROUTE_HUES.length]} 75% 58%)`;
const acMode = (a) => a.mode || 'auto';
function unplacedNow() {
  const pl = W.player, { unplaced } = pl.plan(W.day, pl.activeRoutes().filter((r) => r.opened_day <= W.day));
  return Object.entries(unplaced).map(([rid, k]) => [pl.routes.find((r) => r.id === rid), k]).filter(([r]) => r);
}
function ganttSvg(a) {
  const s = schedules.find((x) => x.ac.id === a.id), X = (h) => Math.max(0, Math.min(24, h)) / 24 * 100;
  let body = '';
  const block = (cls, txt) => `<span class="gt-blk ${cls}" style="left:0;width:100%">${txt}</span>`;
  if (a.delivery_day > W.day) body = block('off', `Lieferung ${dateShort(a.delivery_day)}`);
  else if ((a.status === 'ccheck' || a.status === 'aog') && a.until > W.day) body = block('bad', `${a.status === 'ccheck' ? 'C-Check' : 'Schaden'} bis ${dateShort(a.until)}`);
  else if (a.acmi && a.acmi.start <= W.day && a.acmi.end > W.day) body = block('acmi', `Charter für ${esc(a.acmi.client)}`);
  else if (s) for (const l of s.legs) {
    for (const off of [0, 24]) {
      const t0 = l.t0 + off, t1 = l.t1 + off;
      if (t1 <= 0 || t0 >= 24) continue;
      const x0 = X(t0), wd = Math.max(0.6, X(t1) - x0);
      body += `<span class="gt-leg" style="left:${x0.toFixed(2)}%;width:${wd.toFixed(2)}%;background:${routeColor(l.r)}" title="${l.a}→${l.b} ${hhmm(((t0 % 24) + 24) % 24)}–${hhmm(((t1 % 24) + 24) % 24)}">${wd > 7 ? l.b : ''}</span>`;
    }
  } else body = '<span class="gt-free">frei</span>';
  return `<div class="gantt" role="img" aria-label="Tagesumläufe ${esc(acName(a.id))}"><i class="gt-g" style="left:25%"></i><i class="gt-g" style="left:50%"></i><i class="gt-g" style="left:75%"></i>${body}<i class="gt-now" style="left:${(ui.t * 100).toFixed(2)}%"></i></div>`;
}
VIEWS.fleetPlan = function viewFleetPlan() {
  const pl = W.player;
  W.operableFreq(pl);
  const miss = unplacedNow();
  let html = `<h2 class="sec">Einsatzplan <small>Umläufe heute · Betriebsfenster ${P.OPERATING_WINDOW_H} h</small></h2>
    <p class="small ink2"><b>Automatisch</b>: Der Planer verteilt die Umläufe. <b>Feste Strecken</b>: Das Flugzeug fliegt nur, was Sie zuweisen – etwa neue, sparsame Maschinen auf langen Strecken, ältere auf kurzen (Alter wirkt auf Kerosin, Wartung und Ausfälle). <b>Reserve</b>: springt nur ein, wenn sonst ein Flug ausfiele.</p>`;
  if (miss.length) html += `<div class="callout warn"><b>Umläufe ohne Flugzeug</b>${miss.map(([r, k]) => `${r.base}–${r.dest}: ${k} von ${r.freq} (${tl(r.type_id)})`).join(' · ')}. Diese Flüge fallen aus. Weitere Flugzeuge auf Automatik stellen, Zuweisungen ändern oder die Frequenz senken.</div>`;
  if (!pl.fleet.length) return html + '<div class="callout info">Noch keine Flugzeuge.</div>';
  html += `<div class="gt-axis"><span></span><div><span>0</span><span>6</span><span>12</span><span>18</span><span>24 Uhr</span></div></div>`;
  const list = pl.fleet.slice().sort((x, y) => x.base.localeCompare(y.base) || x.type_id.localeCompare(y.type_id) || x.id.localeCompare(y.id));
  html += `<div class="gt-list">${list.map((a) => {
    const m = acMode(a), routes = [...new Set((a.assigned || []).map((id) => pl.routes.find((r) => r.id === id)).filter(Boolean))];
    const open = ui.asg && ui.asg.acId === a.id;
    return `<div class="gt-row${open ? ' open' : ''}"><div class="gt-h"><div><b class="mono">${acName(a.id)}</b> <span class="small">${a.type_id}</span> <span class="chip ${m === 'manual' ? 'me' : m === 'reserve' ? 'warn' : ''}">${MODE_LABEL[m]}</span></div>
      <span class="small muted">${a.base} · ${n1(pl.acAge(a, W.day))} J. · ${n1(a.used_hours || 0)} / ${SM.winOf(a.type_id)} h</span></div>
      ${ganttSvg(a)}
      <div class="spread small"><span class="muted">${routes.length ? routes.map((r) => `<span class="sw" style="background:${routeColor(r)}"></span> ${r.base}–${r.dest}`).join(' ') : m === 'reserve' ? 'wartet als Reserve' : 'ohne Einsatz'}</span>${open ? '' : `<button class="btn small" data-act="asgopen" data-id="${a.id}">Einsatz ändern</button>`}</div>
      ${open ? assignEditor(a) : ''}</div>`;
  }).join('')}</div>`;
  return html;
};
function assignEditor(a) {
  const pl = W.player, D = ui.asg, win = SM.winOf(a.type_id);
  let html = `<div class="asg"><div class="seg" role="group">${Object.entries(MODE_LABEL).map(([k, l]) => `<button data-act="asgmode" data-v="${k}" aria-pressed="${D.mode === k}">${l}</button>`).join('')}</div>`;
  if (D.mode === 'manual') {
    let hours = 0, long = false;
    const rows = pl.activeRoutes().map((r) => {
      const h = pl.rotH(r), lh = h > SM.winOf(r.type_id);
      const taken = pl.fleet.filter((x) => x !== a && acMode(x) === 'manual').reduce((s, x) => s + (x.pins || []).filter((p) => p.route === r.id).reduce((t, p) => t + p.n, 0), 0);
      const n = D.pins[r.id] || 0;
      if (n) { if (lh) long = true; else hours += n * h; }
      let ctl;
      if (r.base !== a.base) ctl = `<span class="muted">startet in ${r.base}</span>`;
      else if (r.type_id !== a.type_id) ctl = SM.rangeOk(r.base, r.dest, a.type_id) ? `<span class="muted">fliegt ${r.type_id}</span> <button class="btn small" data-act="retype" data-route="${r.id}" data-type="${a.type_id}" title="Strecke auf ${tl(a.type_id)} umstellen">auf ${a.type_id} umstellen</button>` : `<span class="muted">Reichweite zu kurz</span>`;
      else {
        const max = lh ? 1 : Math.max(0, r.freq - taken);
        ctl = `<select id="asg-n-${r.id}" style="width:auto">${Array.from({ length: max + 1 }, (_, i) => `<option value="${i}" ${i === n ? 'selected' : ''}>${i ? (lh ? 'fest zugeordnet' : i + '× täglich') : '–'}</option>`).join('')}</select>${taken ? ` <span class="muted">${taken} von ${r.freq} schon fest vergeben</span>` : ''}`;
      }
      return `<tr><td><span class="sw" style="background:${routeColor(r)}"></span> <b>${r.base}–${r.dest}</b><div class="small muted">${r.freq}× · ${n1(h)} h je Umlauf${lh ? ' · Langstrecke' : ''}</div></td><td class="r">${ctl}</td></tr>`;
    }).join('');
    const over = hours > win + 1e-9, pctH = Math.min(100, hours / win * 100);
    html += `<table class="t"><tbody>${rows || '<tr><td class="muted">Noch keine Strecken.</td></tr>'}</tbody></table>
      <div class="lfrow" style="grid-template-columns:90px 1fr 96px"><span>Betriebszeit</span><div class="bar"><i class="${over ? 'crit' : 'me'}" style="width:${long ? 100 : pctH.toFixed(0)}%"></i></div><span class="num ${over ? 'neg' : ''}">${long ? 'Langstrecke' : `${n1(hours)} / ${win} h`}</span></div>
      ${over ? `<div class="callout crit">Zu viel: ${n1(hours)} Stunden passen nicht ins Betriebsfenster von ${win} Stunden.</div>` : ''}
      <p class="small muted">Grenzen: gleiche Basis, gleicher Flugzeugtyp wie die Strecke, höchstens ${win} Stunden am Tag, nicht mehr Umläufe als die Frequenz. Ein Langstreckenumlauf belegt das Flugzeug ganz. Fällt ein fest zugewiesenes Flugzeug aus, übernehmen Automatik- oder Reserveflugzeuge desselben Typs.</p>`;
  } else html += `<p class="small muted">${D.mode === 'auto' ? 'Der Planer setzt das Flugzeug dort ein, wo Umläufe offen sind.' : 'Das Flugzeug fliegt nur, wenn sonst ein Umlauf ausfiele (Technik, C-Check, Charter). Bis dahin kostet es Leasing und Versicherung.'}</p>`;
  html += `<div class="row"><button class="btn primary" data-act="asgsave">Speichern</button><button class="btn" data-act="asgcancel">Abbrechen</button></div></div>`;
  return html;
}
function onAssignClick(act, b) {
  const pl = W.player;
  switch (act) {
    case 'asgopen': { const a = pl.fleet.find((x) => x.id === b.dataset.id); if (!a) return true; ui.asg = { acId: a.id, mode: acMode(a), pins: Object.fromEntries((a.pins || []).map((p) => [p.route, p.n])) }; if (ui.tab !== 'fleetPlan') setTab('fleetPlan'); else renderPane(true); return true; }
    case 'asgmode': ui.asg.mode = b.dataset.v; renderPane(true); return true;
    case 'asgcancel': ui.asg = null; renderPane(true); return true;
    case 'asgsave': {
      const D = ui.asg, pins = Object.entries(D.pins).filter(([, n]) => n > 0).map(([route, n]) => ({ route, n }));
      const res = doAction({ type: 'assignAircraft', acId: D.acId, mode: D.mode, pins });
      if (res.ok) { ui.asg = null; toast(res.msg || 'Gespeichert.'); }
      refreshAll(); return true;
    }
    case 'retype': {
      const r = pl.routes.find((x) => x.id === b.dataset.route);
      const res = doAction({ type: 'editRoute', id: r.id, typeId: b.dataset.type });
      if (res.ok) toast(res.msg || 'Umgestellt.');
      refreshAll(); return true;
    }
    default: return false;
  }
}
function onAssignChange(t) {
  const m = /^asg-n-(.+)$/.exec(t.id);
  if (!m || !ui.asg) return false;
  ui.asg.pins[m[1]] = Number(t.value); renderPane(true); return true;
}

// ---------------------------------------------------------------------------
// Logo: Form, Symbol und zwei Farben je Airline (Vorlagen und eigene Farben)
// ---------------------------------------------------------------------------
const LOGO_SHAPE = {
  circle: '<circle cx="24" cy="24" r="23"/>',
  square: '<rect x="1" y="1" width="46" height="46" rx="12"/>',
  shield: '<path d="M24 1.5 44 8.5v13.5c0 12.5-8.6 20.3-20 24.5C12.6 42.3 4 34.5 4 22V8.5z"/>',
  hex: '<path d="M24 1.5 43.5 12.75v22.5L24 46.5 4.5 35.25v-22.5z"/>',
  diamond: '<path d="M24 1 47 24 24 47 1 24z"/>',
  tail: '<path d="M4 46 20 2h14l10 44z"/>',
  none: '',
};
const LOGO_SYM = {
  paper: { d: 'M2 11 22 3 15 21 11 14zM11 14 22 3', st: false },
  jet: { d: 'M21 15.5 13.5 11V5.5a1.5 1.5 0 0 0-3 0V11L3 15.5V17l7.5-2.2v3.7L8.5 20v1.2l3.5-1 3.5 1V20l-2-1.5v-3.7L21 17z' },
  eagle: { d: 'M1 7.5c4 .5 7.5 2.2 10 5.5 1-3 3.5-5 7-5.5l1.5-1.5 1 1.5L23 8l-2.5 1.2c-1 2.8-3.2 4.6-6 5.3l.8 3.5-2.3-1.6-1.8 2.6-.6-3.2c-3-.5-6.5-2.5-9.6-7.8z' },
  star: { d: 'M12 2.5l2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17.4l-6.1 3.4 1.4-6.7-5-4.6 6.8-.8z' },
  globe: { d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z', st: true },
  wing: { d: 'M2 16c6-.5 12-4 20-11-.8 5.5-4 10-9 12-3.6 1.5-7.4 1.2-11-1zM5 18.5c3 .8 6.3.6 9.5-.6' },
  crown: { d: 'M3 18h18l-1.5-10-4.5 4-3-6-3 6-4.5-4zM3 20.5h18v1.5H3z' },
  wave: { d: 'M2 15c3-4 5-4 8 0s5 4 8 0 3-3 4-2M2 9c3-4 5-4 8 0s5 4 8 0 3-3 4-2', st: true },
  sun: { d: 'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1', st: true },
  mountain: { d: 'M1.5 20 9 6.5l4 6.5 2.5-3.5 7 10.5z' },
  leaf: { d: 'M20 3C9 3.5 4 9 4 16c0 1.5.3 2.8.9 4C7 13.5 11 10 16 8c-4 3-7.2 6.5-9 12.5C16 20 20 13 20 3z' },
  arrow: { d: 'M4 19 12 3l8 16-8-4.5z' },
  compass: { d: 'M12 1.5 14.6 12 12 22.5 9.4 12zM1.5 12 12 9.4 22.5 12 12 14.6z' },
  bolt: { d: 'M13.5 1.5 4 13.5h6.5l-2 9 9.5-12.5h-6.5z' },
  code: { d: '' },
};
const LOGO_PALETTES = [['#0b1a33', '#ffc61a'], ['#c8102e', '#ffffff'], ['#003a70', '#ffffff'], ['#1fa463', '#ffffff'], ['#7c4dff', '#ffffff'], ['#ef8a17', '#0b1a33'],
  ['#e23d7f', '#ffffff'], ['#0fa39a', '#ffffff'], ['#111111', '#d4af37'], ['#ffffff', '#c8102e'], ['#2f7cf6', '#ffffff'], ['#5b2c06', '#ffd27a']];
const AI_LOGO = { premium: ['shield', 'crown'], lcc: ['circle', 'bolt'], regional: ['square', 'wing'], leisure: ['circle', 'sun'] };
function logoOf(al) {
  if (al.logo) return al.logo;
  if (al.archetype) { const [shape, sym] = AI_LOGO[al.archetype] || ['circle', 'paper']; return { shape, sym, c1: getAiColor(al), c2: '#ffffff', ai: true }; }
  return { shape: 'square', sym: 'code', c1: '#ffc61a', c2: '#1a1400', dflt: true };
}
function getAiColor(al) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--ai${al.color}`).trim();
  return v || '#64748b';
}
/** Logo als SVG; size in Pixeln. */
function logoSvg(al, size = 40, lg = null) {
  const L = lg || logoOf(al), code = esc((al.code || al.id || 'SM').slice(0, 2));
  const sym = LOGO_SYM[L.sym] || LOGO_SYM.paper, bg = L.shape !== 'none', fg = bg ? L.c2 : L.c1;
  const inner = L.sym === 'code'
    ? `<text x="24" y="24" dy=".36em" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="${L.shape === 'tail' ? 15 : 18}" fill="${fg}" letter-spacing=".5">${code}</text>`
    : `<g transform="translate(${L.shape === 'tail' ? 13.5 : 11} ${L.shape === 'shield' ? 10 : 11}) scale(${L.shape === 'none' ? 1.1 : 1.08})"><path d="${sym.d}" ${sym.st ? `fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"` : `fill="${fg}"`}/></g>`;
  return `<svg class="logo-svg" width="${size}" height="${size}" viewBox="0 0 48 48" role="img" aria-label="Logo ${esc(al.name || '')}">${bg ? `<g fill="${L.c1}">${LOGO_SHAPE[L.shape]}</g>` : ''}${inner}</svg>`;
}
VIEWS.profile = function viewProfile() {
  const pl = W.player, cur = logoOf(pl);
  ui.logo = ui.logo || { shape: cur.dflt ? 'shield' : cur.shape, sym: cur.dflt ? 'paper' : cur.sym, c1: cur.c1, c2: cur.c2 };
  const L = ui.logo, demo = { ...pl, logo: L };
  return `<h2 class="sec">Profil & Logo <small>${esc(pl.name)} · ${esc(pl.code || '')}</small></h2>
    <div class="logo-stage"><div class="logo-big">${logoSvg(demo, 112, L)}</div>
      <div class="stack" style="gap:6px"><b style="font-size:18px">${esc(pl.name)}</b><span class="small muted">So erscheint Ihr Logo in der Seitenleiste, bei Mitspielenden, im Handel und auf dem Leitwerk.</span>
      <div class="acv-box" style="max-width:280px">${acSvg('A20N', { color: L.c1, code: pl.code, ink: L.c2 })}</div></div></div>
    <div class="stack"><h3>Form</h3><div class="logo-grid">${Object.keys(LOGO_SHAPE).map((k) => `<button data-act="lg" data-k="shape" data-v="${k}" aria-pressed="${L.shape === k}" title="${k}">${logoSvg(demo, 44, { ...L, shape: k })}</button>`).join('')}</div></div>
    <div class="stack"><h3>Symbol</h3><div class="logo-grid">${Object.keys(LOGO_SYM).map((k) => `<button data-act="lg" data-k="sym" data-v="${k}" aria-pressed="${L.sym === k}" title="${k === 'code' ? 'Kürzel' : k}">${logoSvg(demo, 44, { ...L, sym: k })}</button>`).join('')}</div></div>
    <div class="stack"><h3>Farben</h3><div class="logo-grid">${LOGO_PALETTES.map(([a, b]) => `<button data-act="lgpal" data-a="${a}" data-b="${b}" aria-pressed="${L.c1 === a && L.c2 === b}" title="${a} / ${b}">${logoSvg(demo, 44, { ...L, c1: a, c2: b })}</button>`).join('')}</div>
      <div class="row small"><label class="row" style="gap:6px">Grundfarbe <input type="color" id="lg-c1" value="${L.c1}"></label><label class="row" style="gap:6px">Symbolfarbe <input type="color" id="lg-c2" value="${L.c2}"></label></div></div>
    <div class="row"><button class="btn primary" data-act="lgsave">Logo übernehmen</button><button class="btn" data-act="lgreset">Zurücksetzen</button></div>
    <p class="small muted">Ihre Farben erscheinen auch auf dem Leitwerk Ihrer Flugzeuge. Das Logo können Sie jederzeit ändern.</p>`;
};
function onLogoClick(act, b) {
  if (!['lg', 'lgpal', 'lgsave', 'lgreset'].includes(act)) return false;
  const L = ui.logo;
  if (act === 'lg') L[b.dataset.k] = b.dataset.v;
  else if (act === 'lgpal') { L.c1 = b.dataset.a; L.c2 = b.dataset.b; }
  else if (act === 'lgreset') ui.logo = null;
  else { const res = doAction({ type: 'setLogo', ...L }); if (res.ok) toast('Neues Logo übernommen.'); refreshAll(); return true; }
  renderPane(true); return true;
}
function onLogoChange(t) {
  if (!ui.logo || !/^lg-c[12]$/.test(t.id)) return false;
  ui.logo[t.id === 'lg-c1' ? 'c1' : 'c2'] = t.value; renderPane(true); return true;
}
const myAcColors = (pl = W.player) => { const L = pl.logo; return L ? { color: L.c1, ink: L.c2 } : { color: 'var(--accent)', ink: 'var(--on-accent)' }; };

// ---------------------------------------------------------------------------
// Chat (nur im Mehrspieler): an alle oder privat
// ---------------------------------------------------------------------------
const chat = { open: false, list: [], seq: 0, unread: 0, to: '', busy: false };
function chatReset() { Object.assign(chat, { open: false, list: [], seq: 0, unread: 0, to: '', busy: false, loaded: false }); const p = $('#chatPanel'); if (p) p.hidden = true; renderChatBtn(); }
function renderChatBtn() {
  const b = $('#chatBtn'); if (!b) return;
  b.hidden = !ui.mp;
  const d = b.querySelector('.cnt'); d.hidden = !chat.unread; d.textContent = chat.unread > 9 ? '9+' : chat.unread;
}
async function chatFetch() {
  if (!ui.mp || chat.busy) return;
  chat.busy = true;
  try {
    const r = await api(`/games/${ui.mp.id}/chat?since=${chat.seq}`);
    const fresh = r.messages.filter((m) => m.seq > chat.seq);
    if (fresh.length) {
      chat.list = chat.list.concat(fresh).slice(-200);
      chat.seq = Math.max(chat.seq, ...fresh.map((m) => m.seq));
      const others = fresh.filter((m) => m.from !== ui.mp.airlineId);
      if (chat.loaded && !chat.open && others.length) { chat.unread += others.length; const m = others.at(-1); toast(`${m.airline}${m.to ? ' (privat)' : ''}: ${m.text.slice(0, 80)}`); }
      chat.loaded = true;
      if (chat.open) renderChat();
    } else chat.loaded = true;
  } catch (e) { /* nächster Versuch */ }
  finally { chat.busy = false; renderChatBtn(); }
}
function renderChat() {
  const p = $('#chatPanel'); if (!p || !ui.mp) return;
  const me = ui.mp.airlineId, others = (W ? W.humans : []).filter((h) => h.id !== me);
  const t = (ts) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  p.innerHTML = `<div class="chat-h"><b>Chat</b><span class="small muted">${esc(ui.mp.name)}</span><button class="x" data-chat="close" aria-label="Schließen">×</button></div>
    <div class="chat-list" id="chatList">${chat.list.length ? chat.list.map((m) => { const al = W && W.airlines[m.from]; const mine = m.from === me;
      return `<div class="msg${mine ? ' me' : ''}">${al ? logoSvg(al, 26) : ''}<div><div class="meta">${esc(m.airline)}${m.to ? ` <span class="chip me" style="font-size:10px">privat${mine && W.airlines[m.to] ? ' an ' + esc(W.airlines[m.to].name) : ''}</span>` : ''} · ${t(m.t)}</div><p>${esc(m.text)}</p></div></div>`; }).join('')
      : '<p class="small muted" style="padding:12px">Noch keine Nachrichten. Verhandeln, verabreden, sticheln – hier ist Platz dafür.</p>'}</div>
    <form class="chat-in" id="chatForm"><select id="chatTo" aria-label="Empfänger"><option value="">An alle</option>${others.map((h) => `<option value="${h.id}" ${chat.to === h.id ? 'selected' : ''}>Privat an ${esc(h.name)}</option>`).join('')}</select>
      <div class="row" style="flex-wrap:nowrap"><input type="text" id="chatText" maxlength="500" placeholder="Nachricht schreiben …" autocomplete="off"><button class="btn primary" type="submit">Senden</button></div></form>`;
  const l = $('#chatList'); l.scrollTop = l.scrollHeight;
}
function toggleChat(open = !chat.open) {
  chat.open = open; $('#chatPanel').hidden = !open;
  if (open) { chat.unread = 0; renderChat(); setTimeout(() => $('#chatText') && $('#chatText').focus(), 30); chatFetch(); }
  renderChatBtn();
}
async function chatSend(text) {
  if (!ui.mp || !text.trim()) return;
  try {
    const r = await api(`/games/${ui.mp.id}/chat`, { body: { text, to: chat.to || null } });
    if (r.message && r.message.seq > chat.seq) { chat.list.push(r.message); chat.seq = r.message.seq; }
    renderChat();
  } catch (e) { toast(e.message); }
}

// ---------------------------------------------------------------------------
// Design: Dunkel, Hell oder Automatisch (bei langen Spieltagen nach Tageszeit)
// ---------------------------------------------------------------------------
const THEME_LABEL = { dark: 'Dunkel', light: 'Hell', auto: 'Automatisch' };
const themePref = () => { try { return localStorage.getItem('skymarket-theme') || 'auto'; } catch (e) { return 'auto'; } };
function themeNow() {
  const pref = themePref();
  if (pref !== 'auto') return pref;
  const k = speedNow(), sp = SM.SPEEDS[k === 'p' ? (ui.lastSpeed || 'x1') : k];
  if (!W || !sp || !sp.slow || sp.noTheme) return 'dark';
  const h = ui.t * 24;
  return h >= 6.5 && h < 19.5 ? 'light' : 'dark';
}
function applyTheme() {
  const th = themeNow();
  if (document.documentElement.dataset.theme !== th) { document.documentElement.dataset.theme = th; ui.routesSig = ''; if (W) { renderMapRoutes(true); renderSidebar(); } }
  const b = $('#themeBtn');
  if (b) { const pref = themePref(); b.innerHTML = pref === 'auto' ? '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>' : pref === 'light' ? '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>' : '<svg class="ic" viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>';
    b.title = `Design: ${THEME_LABEL[pref]}${pref === 'auto' ? ' (bei langsamen Tempi nach Tageszeit, sonst dunkel)' : ''}`; }
}
function cycleTheme() {
  const order = ['auto', 'dark', 'light'], next = order[(order.indexOf(themePref()) + 1) % 3];
  try { localStorage.setItem('skymarket-theme', next); } catch (e) { /* egal */ }
  applyTheme(); toast(`Design: ${THEME_LABEL[next]}${next === 'auto' ? ' – folgt bei langen Spieltagen der Tageszeit' : ''}`);
}

// ---------- Härtere Welt: Auktionen, Arbeitsmarkt, Akademien, Abwerben, Meilensteine, Weltlage ----------
const ROLE_OPTS = () => SM.STAFF_GROUPS.map((g) => [`pilot:${g}`, `Piloten ${P.TYPE_GROUPS[g]}`]).concat([['cabin', 'Flugbegleiterinnen'], ['tech', 'Techniker']]);
const wageNow = () => W.macro.wage || 1;
function auctionsHtml() {
  const pl = W.player, list = (W.auctions || []).filter((a) => !a.done);
  const recent = (W.auctions || []).filter((a) => a.done && a.closes > W.day - 30 && a.bids[pl.id] !== undefined);
  if (!list.length && !recent.length) return `<div class="stack"><h2 class="sec">Auktionen <small>frühe Lieferpositionen</small></h2><p class="small muted">Gerade keine Auktion. Neue Muster (A321XLR ab Tag 150, 777-9 ab Tag 330) gibt es im ersten Jahr nur hier; bei langen Wartezeiten versteigern Leasinggeber auch frühe Positionen gängiger Typen.</p></div>`;
  return `<div class="stack"><h2 class="sec">Auktionen <small>verdeckte Gebote, die Höchstbietenden erhalten den Zuschlag</small></h2>${list.map((a) => {
    const t = P.AIRCRAFT_TYPES[a.type], mine = a.bids[pl.id], nb = Object.keys(a.bids).length;
    return `<div class="card pad stack"><div class="spread"><b>${tlx(a.type)}</b><span class="chip ${t.launch ? 'me' : ''}">${a.n} ${a.n === 1 ? 'Position' : 'Positionen'} · ${nb} ${nb === 1 ? 'Gebot' : 'Gebote'}</span></div>
      <div class="acv-box">${acSvg(a.type, { ...myAcColors(), code: pl.code })}</div>
      <div class="small ink2">${esc(a.note || '')} Gebote bis ${dateShort(a.closes)}, Auslieferung ${a.delivery} Tage nach Zuschlag als Leasing zu ${eur(t.lease_month * (1 + SM.acTariff(W, pl, a.type)))}/Monat. Mindestgebot ${eur(a.minBid)} Prämie je Flugzeug.</div>
      <div class="row"><input type="number" id="bid-${a.id}" min="${a.minBid}" step="10000" value="${Math.max(a.minBid, (mine || 0) + 50000)}" style="width:150px"><button class="btn small primary" data-act="bid" data-id="${a.id}">${mine ? 'Gebot erhöhen' : 'Bieten'}</button>${mine ? `<span class="small">Ihr Gebot: <b>${eur(mine)}</b></span>` : ''}</div></div>`;
  }).join('')}${recent.map((a) => `<p class="small ${a.winners && a.winners.includes(pl.id) ? 'pos' : 'muted'}">${P.AIRCRAFT_TYPES[a.type].label}: ${a.winners && a.winners.includes(pl.id) ? 'Zuschlag erhalten' : `kein Zuschlag (Zuschlag ab ${eur(a.cut || 0)})`}</p>`).join('')}</div>`;
}
function laborHtml() {
  const M = W.macro, rows = [['pilot', 'Piloten'], ['cabin', 'Flugbegleiterinnen'], ['tech', 'Techniker']].map(([r, l]) => { const x = SM.laborPool(W, r); return `<tr><td>${l}</td><td class="r">${Math.max(0, x.pool - x.used)} von ${x.pool}</td></tr>`; }).join('');
  return `<div class="stack"><h2 class="sec">Arbeitsmarkt <small>gemeinsam für alle Airlines</small></h2>
    <div class="tiles"><div class="tile"><span>Marktlohn</span><b>${pct(wageNow() - 1, 1).replace(/^(?!-|−)/, '+')}</b><em>gegenüber Spielstart</em></div>
      <div class="tile"><span>Pilotenmarkt</span><b class="${M.laborTight > 1.3 ? 'warnc' : ''}">${M.laborTight > 1.6 ? 'leergefegt' : M.laborTight > 1.25 ? 'angespannt' : 'normal'}</b><em>Index ${NF2.format(M.laborTight)}</em></div>
      <div class="tile"><span>Ihr Gehalt</span><b class="${W.player.staff.pay < wageNow() - 0.005 ? 'neg' : ''}">${pct(W.player.staff.pay / wageNow() - 1).replace(/^(?!-|−)/, '+')}</b><em>gegenüber Markt</em></div></div>
    <table class="t"><thead><tr><th>Diesen Monat noch einstellbar (alle Mitspielenden zusammen)</th><th class="r"></th></tr></thead><tbody>${rows}</tbody></table>
    <p class="small muted">Wer viel einstellt, verknappt den Markt für alle: Recruiting wird teurer, Wartezeiten länger, Löhne steigen. Liegt Ihr Gehalt unter dem Marktlohn, sinkt die Stimmung und die Konkurrenz wirbt ab.</p></div>`;
}
function academyHtml() {
  const pl = W.player, A = pl.academy || {};
  return `<div class="stack"><h2 class="sec">Akademien <small>eigenen Nachwuchs fördern</small></h2>
    <p class="small ink2">Mit monatlicher Förderung bilden Flugschule, Kabinenakademie und Technikschule exklusiv für Sie aus. Nach der Anlaufzeit kommen jeden Monat Absolventinnen und Absolventen – ohne Arbeitsmarkt, und sie lassen sich schwerer abwerben.</p>
    ${Object.entries(SM.ACADEMY).map(([role, d]) => { const x = A[role] || { lv: 0 }, ready = x.lv ? x.since + d.ramp : null;
      return `<div class="card pad stack"><div class="spread"><b>${d.label}</b>${x.lv ? `<span class="chip ${W.day >= ready ? 'good' : 'warn'}">${W.day >= ready ? `${d.out[x.lv]} pro Monat` : `erste Absolventen ${dateShort(ready)}`}</span>` : '<span class="chip">nicht gefördert</span>'}</div>
        <div class="seg wrap">${[0, 1, 2, 3].map((lv) => `<button data-act="academy" data-role="${role}" data-lv="${lv}" aria-pressed="${(x.lv || 0) === lv}">${lv ? `Stufe ${lv} · ${eur(d.cost[lv] * cpi())}/Mon. · ${d.out[lv]}/Mon.` : 'keine'}</button>`).join('')}</div>
        ${role === 'pilot' ? `<label class="f" style="max-width:280px"><span>Musterberechtigung der Absolventen</span><select id="acad-group">${SM.STAFF_GROUPS.map((g) => `<option value="${g}" ${(x.group || 'A32F') === g ? 'selected' : ''}>${P.TYPE_GROUPS[g]}</option>`).join('')}</select></label>` : ''}
        <span class="small muted">Anlaufzeit ${d.ramp} Tage.</span></div>`; }).join('')}</div>`;
}
function poachHtml() {
  const pl = W.player, P0 = ui.poach || (ui.poach = { target: null, role: 'pilot:A32F', n: 5, bonus: 10000 });
  const [role, group] = P0.role.split(':');
  const flies = (a, g) => a.fleet.some((x) => P.AIRCRAFT_TYPES[x.type_id].group === g);
  const targets = W.list.filter((a) => a.id !== pl.id && a.status !== 'insolvent').sort((a, b) => (role === 'pilot' ? flies(b, group) - flies(a, group) : 0) || a.name.localeCompare(b.name));
  if (!P0.target || !W.airlines[P0.target]) P0.target = (targets.find((a) => !a.archetype) || targets[0]).id;
  const T = W.airlines[P0.target];
  const S = P.STAFF, sal = (role === 'pilot' ? S.pilotSalary[group] : role === 'cabin' ? S.cabinSalary : S.techSalary) * wageNow() * cpi();
  const theirPay = T.staff ? T.staff.pay : wageNow() * (1 + ({ premium: 0.06, lcc: -0.04 }[T.archetype] || 0)), theirMor = T.staff ? T.staff.morale : 0.62;
  const acLv = T.academy && T.academy[role] ? T.academy[role].lv || 0 : 0;
  const p = Math.max(0.03, Math.min(0.85, (0.12 + 0.9 * (pl.staff.pay - (T.staff ? theirPay : 1 + ({ premium: 0.06, lcc: -0.04 }[T.archetype] || 0))) + 0.35 * Math.min(1, P0.bonus / (sal * 3)) + 0.8 * Math.max(0, 0.65 - theirMor)) * (1 - 0.12 * acLv)));
  const last = pl.poachLog && pl.poachLog[T.id] !== undefined ? pl.poachLog[T.id] : null, wait = last !== null && W.day - last < 30 ? 30 - (W.day - last) : 0;
  const humansExp = W.humans.filter((h) => h.id !== pl.id && h.experts.length);
  return `<div class="stack"><h2 class="sec">Abwerben <small>Personal und Fachkräfte der Konkurrenz</small></h2>
    <div class="card pad stack"><div class="grid2"><label class="f"><span>Bei</span><select id="po-target">${targets.map((a) => `<option value="${a.id}" ${a.id === T.id ? 'selected' : ''}>${esc(a.name)}${a.archetype ? '' : ' (Mitspieler)'}${role === 'pilot' ? (flies(a, group) ? ` · fliegt ${group}` : ' · ohne ' + group) : ''}</option>`).join('')}</select></label>
      <label class="f"><span>Wen</span><select id="po-role">${ROLE_OPTS().map(([v, l]) => `<option value="${v}" ${v === P0.role ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div class="grid2"><label class="f"><span>Anzahl</span><input type="number" id="po-n" min="1" max="20" value="${P0.n}"></label>
      <label class="f"><span>Wechselprämie je Person</span><select id="po-bonus">${[0, 5000, 10000, 20000, 40000].map((v) => `<option value="${v}" ${v === P0.bonus ? 'selected' : ''}>${v ? eur(v) : 'keine'}</option>`).join('')}</select></label></div>
      ${role === 'pilot' && !flies(T, group) ? `<div class="callout warn">${esc(T.name)} fliegt keine ${esc(P.TYPE_GROUPS[group])} – dort gibt es keine passenden Piloten. Oben stehen die Airlines mit dieser Familie.</div>` : ''}
      <p class="small muted">Piloten haben ein Typ-Rating je Musterfamilie und fliegen nur dort. Flugbegleiterinnen und Technik sind für alle Muster einsetzbar.</p>
      <p class="small ink2">Erfolgschance je Person etwa <b>${pct(p)}</b>${T.staff ? ` · Stimmung drüben ${pct(theirMor)}` : ''}. Kosten: Prämie je gewonnener Person plus ${eur(S.recruit[role] * 0.4 * cpi())} Headhunter je Versuch. Wer wechselt, beginnt nach 14 Tagen.${T.isPlayer ? ' Mitspielende werden informiert.' : ' Die KI merkt sich das und wirbt zurück.'}</p>
      <div class="row"><button class="btn primary" data-act="poach" ${wait ? 'disabled' : ''}>${wait ? `wieder in ${wait} Tagen` : 'Abwerben'}</button></div></div>
    ${humansExp.length ? `<div class="card pad stack"><h3>Fachkräfte von Mitspielenden</h3>${humansExp.map((h) => h.experts.map((e) => `<div class="spread small"><span>${logoSvg(h, 16)} <b>${esc(e.name)}</b> · ${P.EXPERT_ROLES[e.role].label} ${LEVEL[e.level]} bei ${esc(h.name)} · ${eur(e.salary)}/Mon.</span>
      <span class="row" style="gap:6px"><select id="pe-${e.id}" style="width:auto">${[1.1, 1.25, 1.4, 1.6].map((f) => `<option value="${f}">+${Math.round((f - 1) * 100)} % Gehalt</option>`).join('')}</select><button class="btn small" data-act="poachexp" data-t="${h.id}" data-id="${e.id}">Abwerben</button></span></div>`).join('')).join('')}</div>` : ''}</div>`;
}
function onHardClick(act, b) {
  const pl = W.player;
  switch (act) {
    case 'bid': { const v = Number($(`#bid-${b.dataset.id}`).value); const res = doAction({ type: 'bid', lot: b.dataset.id, amount: v }); if (res.ok) toast('Gebot abgegeben. Zuschläge am Ende der Auktion.'); refreshAll(); return true; }
    case 'academy': { const g = $('#acad-group'); const res = doAction({ type: 'academy', role: b.dataset.role, level: Number(b.dataset.lv), group: g ? g.value : undefined }); if (res.ok) toast(Number(b.dataset.lv) ? 'Förderung vereinbart.' : 'Förderung beendet.'); refreshAll(); return true; }
    case 'poach': {
      readPoach(); const [role, group] = ui.poach.role.split(':');
      const res = doAction({ type: 'poach', target: ui.poach.target, role, group: group || null, n: ui.poach.n, bonus: ui.poach.bonus });
      if (res.ok) toast(res.taken ? `${res.taken} von ${res.tried} wechseln zu Ihnen (Start in 14 Tagen).` : 'Niemand wollte wechseln. Die Kosten für den Headhunter bleiben.');
      refreshAll(); return true;
    }
    case 'poachexp': { const f = Number($(`#pe-${b.dataset.id}`).value); const res = doAction({ type: 'poachExpert', target: b.dataset.t, id: b.dataset.id, factor: f }); if (res.ok) toast(res.taken ? 'Wechsel geglückt.' : 'Abgelehnt – die Person bleibt bei der Konkurrenz.'); refreshAll(); return true; }
    case 'payrel': doAction({ type: 'pay', v: Math.round(wageNow() * Number(b.dataset.v) * 1000) / 1000 }); refreshAll(); return true;
    default: return false;
  }
}
function readPoach() { if (!ui.poach) return; const g = (id) => $(id); if (g('#po-target')) ui.poach.target = g('#po-target').value; if (g('#po-role')) ui.poach.role = g('#po-role').value; if (g('#po-n')) ui.poach.n = Math.max(1, Math.min(20, Number(g('#po-n').value) || 1)); if (g('#po-bonus')) ui.poach.bonus = Number(g('#po-bonus').value); }
function onHardChange(t) {
  if (/^po-/.test(t.id)) { readPoach(); renderPane(true); return true; }
  if (t.id === 'acad-group') { const A = W.player.academy && W.player.academy.pilot; if (A && A.lv) doAction({ type: 'academy', role: 'pilot', level: A.lv, group: t.value }); refreshAll(); return true; }
  return false;
}
VIEWS.milestones = function viewMilestones() {
  const pl = W.player, got = pl.milestones || {};
  const pts = (al) => SM.MILESTONES.reduce((s, m) => s + ((al.milestones || {})[m.id] !== undefined ? m.pts : 0), 0);
  const total = SM.MILESTONES.reduce((s, m) => s + m.pts, 0);
  let html = `<h2 class="sec">Meilensteine <small>${pts(pl)} von ${total} Punkten</small></h2>`;
  if (W.humans.length > 1) {
    const rank = W.humans.slice().sort((a, b) => pts(b) - pts(a));
    html += `<div class="stack"><h3>Rangliste</h3><table class="t"><thead><tr><th>#</th><th>Airline</th><th class="r">Punkte</th><th class="r">Eigenkapital</th><th class="r">Passagiere</th><th class="r">Flotte</th></tr></thead><tbody>${rank.map((h, i) => `<tr><td>${i + 1}</td><td><span class="lgi">${logoSvg(h, 18)}</span> ${esc(h.name)}${h.id === pl.id ? ' <span class="chip me">Sie</span>' : ''}${h.status === 'insolvent' ? ' <span class="chip crit">insolvent</span>' : ''}</td><td class="r"><b>${pts(h)}</b></td><td class="r">${eur(SM.balanceSheet(h).equity)}</td><td class="r">${n0(h.paxTotal || 0)}</td><td class="r">${h.fleet.length}</td></tr>`).join('')}</tbody></table></div>`;
  }
  html += `<div class="ms-grid">${SM.MILESTONES.map((m) => { const d = got[m.id]; return `<div class="ms ${d !== undefined ? 'done' : ''}"><div class="ms-ic">${d !== undefined ? '★' : '☆'}</div><div><b>${esc(m.label)}</b><span>${esc(m.desc)}</span><em>${m.pts} Punkte${m.brand ? ` · Marke +${Math.round(m.brand * 100)}` : ''}${d !== undefined ? ` · erreicht ${dateShort(d)}` : ''}</em></div></div>`; }).join('')}</div>`;
  return html;
};
function worldExtraHtml() {
  const M = W.macro, C = M.cycle || { phase: 0, amp: 0 };
  const trend = Math.cos(C.phase) >= 0 ? 'Aufschwung' : 'Abschwung', lvl = 1 + C.amp * Math.sin(C.phase);
  const regs = SM.REGION_ORDER.map((rg) => { const cs = [...new Set(SM.AP_CODES.filter((c) => P.AIRPORTS[c].region === rg).map((c) => P.AIRPORTS[c].country))]; const v = cs.reduce((s, c) => s + (M.econ[c] ?? 1), 0) / Math.max(1, cs.length); return [rg, v]; });
  const tariffs = Object.entries(M.tariffs || {});
  const carbon = Object.entries(M.carbon || {}).filter(([, v]) => v > 0);
  const fees = Object.entries(M.feeMult || {}).filter(([, v]) => v > 1.001);
  const stock = Object.keys(P.AIRCRAFT_TYPES).filter((k) => !(P.AIRCRAFT_TYPES[k].launch && W.day < P.AIRCRAFT_TYPES[k].launch + 365));
  let html = `<div class="tiles">
    <div class="tile"><span>Weltkonjunktur</span><b>${trend}</b><em>Zyklus ${n0(lvl * 100)} · ${n0(C.period || 54)} Monate</em></div>
    <div class="tile"><span>Banken</span><b class="${(M.bank ?? 1) < 0.8 ? 'warnc' : ''}">${(M.bank ?? 1) < 0.7 ? 'restriktiv' : (M.bank ?? 1) < 0.9 ? 'vorsichtig' : 'offen'}</b><em>Kreditlinien × ${NF2.format(M.bank ?? 1)}</em></div>
    <div class="tile"><span>Zölle</span><b>${tariffs.length ? tariffs.length + ' Konflikt' + (tariffs.length > 1 ? 'e' : '') : 'keine'}</b><em>Handel und Flugzeuge</em></div></div>`;
  html += `<div class="stack"><h2 class="sec">Konjunktur nach Regionen <small>Zyklen laufen versetzt – Streuung schützt</small></h2><div class="econ">${regs.map(([rg, v]) => `<div><span>${rg}</span><div class="bar"><i class="${v < 0.95 ? 'crit' : v > 1.04 ? 'good' : ''}" style="width:${clampPct((v - 0.7) / 0.6)}%"></i><span class="tgt" style="left:50%"></span></div><b class="num">${n0(v * 100)}</b></div>`).join('')}</div></div>`;
  html += `<div class="stack"><h2 class="sec">Handelskonflikte und Zölle</h2>${tariffs.length ? `<table class="t"><tbody>${tariffs.map(([k, v]) => { const [a, b] = k.split('|'); return `<tr><td>${esc(SM.blocName(a))} ↔ ${esc(SM.blocName(b))}</td><td class="r">${pct(v)}</td></tr>`; }).join('')}</tbody></table><p class="small muted">Zölle senken Geschäftsreisen (stark), Fracht und Urlaubsreisen zwischen den Blöcken und verteuern Flugzeuge aus dem jeweils anderen Block (Airbus/ATR: EU, Boeing: USA, Embraer: Brasilien, Dash 8: Kanada).</p>` : '<p class="small muted">Freier Handel. Das kann sich schnell ändern.</p>'}</div>`;
  if (carbon.length || fees.length) html += `<div class="stack"><h2 class="sec">Abgaben und Entgelte</h2><table class="t"><tbody>${carbon.map(([b, v]) => `<tr><td>CO₂-Abgabe ${esc(SM.blocName(b))}</td><td class="r">Kerosin +${pct(v)}</td></tr>`).join('')}${fees.map(([a, v]) => `<tr><td>Entgelte ${a} · ${esc(apName(a))}</td><td class="r">+${pct(v - 1)}</td></tr>`).join('')}</tbody></table></div>`;
  html += `<div class="stack"><h2 class="sec">Leasingmarkt <small>Bestand für alle Airlines</small></h2><div class="tw"><table class="t"><thead><tr><th>Typ</th><th class="r">verfügbar</th><th class="r">Lieferung</th><th class="r">ab Werk</th></tr></thead><tbody>${stock.map((k) => { const n = W.lessorStock && W.lessorStock[k] !== undefined ? W.lessorStock[k] : SM.stockCap(k); return `<tr><td>${tl(k)}</td><td class="r ${n <= 0 ? 'neg' : ''}">${n <= 0 ? 'ausverkauft' : n}</td><td class="r">${SM.leaseDelivery(W, k, 'lease')} T.</td><td class="r">${SM.leaseDelivery(W, k, 'factory')} T.</td></tr>`; }).join('')}</tbody></table></div><p class="small muted">Leasinggeber füllen ihren Bestand monatlich nur teilweise auf. Wer viel bestellt, kauft anderen den Markt leer und verlängert die Lieferzeiten.</p></div>`;
  return html;
}
// Länder ohne Nachfrage auf der Karte ausgrauen
function deadCountries() {
  const out = [];
  for (const c of SM.COUNTRIES) {
    const aps = SM.AP_CODES.filter((x) => P.AIRPORTS[x].country === c); if (!aps.length) continue;
    const cancel = Math.min(...aps.map((x) => W.opsAt(x).cancel));
    const dm = (W.demandMult(aps[0], aps[0], 'business') + W.demandMult(aps[0], aps[0], 'leisure')) / 2;
    const idx = (W.macro.econ[c] ?? 1) * dm * (1 - cancel);
    if (idx < 0.2) out.push(c);
  }
  return out;
}
function renderGrey(dead) {
  const g = $('#gGrey'); if (!g) return;
  g.innerHTML = dead.map((c) => {
    const d = MAP.countries && MAP.countries[c];
    if (d) return `<path class="greyc" d="${d}"><title>${esc(SM.COUNTRY_LABEL[c] || c)}: keine Nachfrage</title></path>`;
    const a = SM.AP_CODES.find((x) => P.AIRPORTS[x].country === c), [x, y] = pt(a);
    return `<circle class="greyc" cx="${x}" cy="${y}" r="6"/>`;
  }).join('');
}

// ---------- Rechter Bereich: Breite ziehbar ----------
const RW_DEFAULT = 520;
function setPaneWidth(px, save = true) {
  const main = document.querySelector('main.body'); if (!main) return;
  const sideOn = getComputedStyle($('#sidebar')).display !== 'none';
  const max = Math.max(380, main.clientWidth - 24 - (sideOn ? 312 : 0) - 320);   // Karte behält mindestens 320 px
  const w = Math.round(Math.max(380, Math.min(max, px)));
  main.style.setProperty('--rw', w + 'px');
  if (save) { try { localStorage.setItem('skymarket-rw', String(w)); } catch (e) { /* egal */ } }
  return w;
}
function initResizer() {
  const h = $('#resizer'); if (!h) return;
  let saved = null; try { saved = Number(localStorage.getItem('skymarket-rw')) || null; } catch (e) { /* egal */ }
  if (saved) setPaneWidth(saved, false);
  let drag = null;
  h.addEventListener('pointerdown', (e) => { e.preventDefault(); h.setPointerCapture(e.pointerId); drag = { x: e.clientX, w: $('#rcol').getBoundingClientRect().width }; h.classList.add('drag'); document.body.classList.add('resizing'); });
  h.addEventListener('pointermove', (e) => { if (drag) setPaneWidth(drag.w + (drag.x - e.clientX), false); });
  const end = () => { if (!drag) return; drag = null; h.classList.remove('drag'); document.body.classList.remove('resizing'); setPaneWidth($('#rcol').getBoundingClientRect().width); };
  h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
  h.addEventListener('dblclick', () => setPaneWidth(RW_DEFAULT));
  h.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setPaneWidth($('#rcol').getBoundingClientRect().width + (e.key === 'ArrowLeft' ? 40 : -40)); } });
  window.addEventListener('resize', () => { const cur = $('#rcol').getBoundingClientRect().width; if (cur) setPaneWidth(cur, false); });
}

// ---------- Zustand gebrauchter Flugzeuge ----------
const condWord = (c) => (c < 0.85 ? 'sehr gepflegt' : c < 0.97 ? 'gepflegt' : c <= 1.12 ? 'normal' : c < 1.3 ? 'abgenutzt' : 'verbraucht');
const condCls = (c) => (c < 0.97 ? 'good' : c <= 1.12 ? '' : c < 1.3 ? 'warn' : 'crit');
function condNoise(id) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ((h % 1000) / 1000 - 0.5) * 0.5; }
/** Was die Airline über den Zustand eines Gebrauchtangebots weiß: Luis exakt, Technik-Fachkraft ab Senior grob, sonst nichts. */
function condInfo(o) {
  const pl = W.player, c = o.cond || 1;
  if (pl.oldAcExpert()) {
    const verdict = c < 0.85 ? 'Klare Empfehlung – mehr Flugzeug, als der Preis sagt.' : c <= 1.12 ? 'Fairer Zustand, fairer Preis.' : c < 1.3 ? 'Nur mit Abschlag – mehr Wartung und Ausfälle.' : 'Finger weg: verbraucht, teure Wartung, häufige Ausfälle.';
    return `<span class="chip ${condCls(c)}" title="Gutachten Luis Perez: ${verdict}">${condWord(c)}</span><div class="small muted">wirkt wie ${n0(o.age * c)} J.</div>`;
  }
  if (pl.skill('tech') >= 2) { const g = c + condNoise(o.id); return `<span class="chip ${condCls(g)}" title="Schätzung Ihrer Technik – ungenau">eher ${condWord(g)}</span>`; }
  return '<span class="small muted" title="Ohne Gutachter sehen Sie nur Alter und Preis">unbekannt</span>';
}

// ---------- Handel ----------
const DEAL_KINDS = [['cash', 'Geld'], ['ac', 'Flugzeug'], ['staff', 'Personal'], ['slots', 'Slots'], ['exit', 'Streckenrückzug'], ['coop', 'Kooperation']];
const DEAL_STATUS = { open: ['', 'offen'], accepted: ['good', 'abgeschlossen'], rejected: ['crit', 'abgelehnt'], countered: ['warn', 'Gegenangebot'], withdrawn: ['', 'zurückgezogen'], expired: ['', 'abgelaufen'], failed: ['crit', 'gescheitert'] };
const myDeals = () => (W.deals || []).filter((d) => d.to !== SM.MARKET && (d.from === W.playerId || d.to === W.playerId));
const incomingDeals = () => myDeals().filter((d) => d.status === 'open' && d.to === W.playerId);
const partnersOf = () => W.list.filter((al) => al.id !== W.playerId && al.status !== 'insolvent');
function alChip(al) { return `${logoSvg(al, 18)} ${esc(al.name)}${al.archetype ? '' : ' <span class="chip me" style="font-size:10px">Mitspieler</span>'}`; }
/** Grobe Bewertung aus Ihrer Sicht: Geld, Marktwert der Flugzeuge, Ersatzkosten für Personal, Slotwert, Wert eines Rückzugs. */
function myDealValue(d) {
  const me = W.player, partner = W.airlines[d.from === me.id ? d.to : d.from];
  const iGive = d.from === me.id ? d.give : d.take, iGet = d.from === me.id ? d.take : d.give;
  const val = (it, owner, getting) => {
    if (it.k === 'cash') return it.amount;
    if (it.k === 'ac') { const a = owner.fleet.find((x) => x.id === it.id); return a ? SM.acDealValue(W, a) : 0; }
    if (it.k === 'staff') { const S = P.STAFF, sal = it.role === 'pilot' ? S.pilotSalary[it.group] : it.role === 'cabin' ? S.cabinSalary : S.techSalary; return it.n * (S.recruit[it.role] + (getting ? 0.5 : 0.2) * sal) * cpi(); }
    if (it.k === 'slots') return SM.slotValue(W, it.apt) * it.n;
    if (it.k === 'exit') return getting ? SM.exitGain(W, me, partner, it.pair, it.days) : SM.exitLoss(W, me, it.pair, it.days);
    if (it.k === 'coop') { if (!getting) return 0; const months = it.days / 30; if (it.kind === 'alliance') return W.estFuelKgMonth(me) * W.fuelPrice * 0.02 * months; const r = me.activeRoutes().find((x) => SM.pairKey(x.base, x.dest) === it.pair); const h = r ? r.hist.slice(-30) : []; return h.length ? h.reduce((s, x) => s + x.rev, 0) / h.length * 0.05 * 30 * months : 0; }
    return 0;
  };
  return iGet.reduce((s, it) => s + val(it, partner, true), 0) - iGive.reduce((s, it) => s + val(it, me, false), 0);
}
function itemLi(it, owner) { return `<li>${esc(SM.itemText(W, it, owner))}</li>`; }
function dealCard(d) {
  const me = W.playerId, out = d.from === me, partner = W.airlines[out ? d.to : d.from];
  const iGive = out ? d.give : d.take, iGet = out ? d.take : d.give;
  const [cls, label] = DEAL_STATUS[d.status] || ['', d.status];
  const v = d.status === 'open' ? myDealValue(d) : null;
  return `<div class="deal ${d.status}"><div class="spread"><div>${out ? 'An' : 'Von'} ${alChip(partner)}</div><span class="chip ${cls}">${d.status === 'open' ? `offen bis ${dateShort(d.expires)}` : `${label} · ${dateShort(d.resolvedDay ?? d.day)}`}</span></div>
    ${d.note ? `<p class="small ink2" style="font-style:italic">„${esc(d.note)}“</p>` : ''}
    <div class="dealcols"><div><span>Sie erhalten</span><ul>${iGet.map((x) => itemLi(x, partner)).join('') || '<li class="muted">nichts</li>'}</ul></div><div><span>Sie geben</span><ul>${iGive.map((x) => itemLi(x, W.player)).join('') || '<li class="muted">nichts</li>'}</ul></div></div>
    ${d.reply && out ? `<p class="small">${esc(d.reply)}</p>` : ''}
    ${v !== null ? `<p class="small muted">Grobe Bewertung für Sie: <b class="${v < 0 ? 'neg' : 'pos'}">${eur(v, { plus: true })}</b> (Marktwerte, Ersatzkosten, Streckenbeitrag)</p>` : ''}
    ${d.status === 'open' && !out ? `<div class="row"><button class="btn small primary" data-act="dealaccept" data-id="${d.id}">Annehmen</button><button class="btn small" data-act="dealcounter" data-id="${d.id}">Gegenangebot</button><button class="btn small danger" data-act="dealreject" data-id="${d.id}">Ablehnen</button></div>` : ''}
    ${d.status === 'open' && out ? `<div class="row"><button class="btn small" data-act="dealwithdraw" data-id="${d.id}">Zurückziehen</button>${partner.archetype ? '' : '<span class="small muted">Wartet auf Antwort der Mitspielerin oder des Mitspielers.</span>'}</div>` : ''}
  </div>`;
}
VIEWS.trade = function viewTrade() {
  const me = W.player, inc = incomingDeals(), outg = myDeals().filter((d) => d.status === 'open' && d.from === me.id);
  let html = `<div class="spread"><h2 class="sec">Handel <small>${inc.length} eingegangen · ${outg.length} offen</small></h2>${ui.deal ? '' : '<button class="btn primary" data-act="dealnew">Neues Angebot</button>'}</div>`;
  if (ui.deal) html += dealComposer();
  else html += `<p class="small ink2">Handeln Sie mit KI-Airlines und Mitspielenden: Flugzeuge samt Leasingvertrag oder Kredit, Crews, Slots an koordinierten Flughäfen, Geld – und Rückzüge von Strecken mit Wettbewerbsverzicht. KI-Airlines antworten sofort, oft mit einem Gegenangebot.</p>`;
  html += marketHtml();
  html += `<div class="stack"><h2 class="sec">Eingang <small>${inc.length ? 'Antwort erwartet' : 'leer'}</small></h2>${inc.length ? inc.map(dealCard).join('') : '<p class="small muted">Keine offenen Angebote an Sie. KI-Airlines melden sich gelegentlich zum Monatswechsel.</p>'}</div>`;
  if (outg.length) html += `<div class="stack"><h2 class="sec">Ihre offenen Angebote</h2>${outg.map(dealCard).join('')}</div>`;
  const cps = (W.coops || []).filter((c) => c.until > W.day && (c.a === me.id || c.b === me.id));
  if (cps.length) html += `<div class="stack"><h2 class="sec">Kooperationen</h2><table class="t"><tbody>${cps.map((c) => { const o = W.airlines[c.a === me.id ? c.b : c.a]; return `<tr><td><span class="lgi">${logoSvg(o, 18)}</span> ${esc(o.name)}</td><td>${c.kind === 'alliance' ? 'Allianz' : 'Codeshare ' + c.pair.replace('-', '–')}</td><td class="r">bis ${dateY(c.until)}</td></tr>`; }).join('')}</tbody></table></div>`;
  const ags = (W.agreements || []).filter((g) => g.until > W.day && (g.airline === me.id || g.partner === me.id));
  if (ags.length) html += `<div class="stack"><h2 class="sec">Vereinbarungen <small>Wettbewerbsverzicht</small></h2><table class="t"><tbody>${ags.map((g) => `<tr><td>${g.airline === me.id ? `<b>Sie</b> verzichten gegenüber ${esc(W.airlines[g.partner].name)}` : `<b>${esc(W.airlines[g.airline].name)}</b> verzichtet zu Ihren Gunsten`}</td><td>${g.pair.replace('-', '–')}</td><td class="r">bis ${dateY(g.until)}</td></tr>`).join('')}</tbody></table></div>`;
  const holds = Object.keys(me.slotHold || {}).map((apt) => [apt, me.heldAt(apt, W.day), Math.min(...me.slotHold[apt].filter((h) => h.until > W.day).map((h) => h.until))]).filter((x) => x[1] > 0);
  html += `<div class="stack"><h2 class="sec">Ihre Slot-Reserve <small>freie Slots, die Ihnen gehören</small></h2>${holds.length ? `<table class="t"><tbody>${holds.map(([apt, n, until]) => `<tr><td><b>${apt}</b> ${esc(apName(apt))}</td><td class="r">${n} ${n === 1 ? 'Slot' : 'Slots'}</td><td class="r small muted">verfällt ab ${dateY(until)}</td><td class="r"><button class="btn small" data-act="dealslots" data-apt="${apt}">Verkaufen</button></td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Keine. Wenn Sie an einem koordinierten Flughafen eine Strecke einstellen oder Flüge streichen, behalten Sie die Slots 180 Tage – zum Wiederverwenden oder Verkaufen. Per Handel erworbene Slots gelten 365 Tage.</p>'}</div>`;
  const hist = myDeals().filter((d) => d.status !== 'open').sort((a, b) => (b.resolvedDay ?? b.day) - (a.resolvedDay ?? a.day)).slice(0, 12);
  if (hist.length) html += `<div class="stack"><h2 class="sec">Verlauf</h2>${hist.map(dealCard).join('')}</div>`;
  return html;
};
function dealOpts(side) {
  const D = ui.deal, me = W.player, partner = W.airlines[D.to], giver = side === 'give' ? me : partner;
  const k = (ui.dealK && ui.dealK[side]) || 'cash', id = (x) => `dl-${x}-${side}`;
  let f = '';
  if (k === 'cash') f = `<input type="number" id="${id('cash')}" min="0" step="5000" value="100000">`;
  else if (k === 'ac') {
    const list = giver.fleet.filter((a) => a.delivery_day <= W.day && !(a.acmi && a.acmi.end > W.day) && !(D[side] || []).some((x) => x.k === 'ac' && x.id === a.id));
    f = list.length ? `<select id="${id('ac')}">${list.map((a) => `<option value="${a.id}">${giver === me ? acName(a.id) : a.id} · ${tl(a.type_id)} · ${a.owned ? 'Eigentum' : 'Leasing'} · ${n0(al_age(giver, a))} J.${a.used_hours > 0 ? ' · im Einsatz' : ''} · ~${eur(SM.acDealValue(W, a))}</option>`).join('')}</select>` : '<span class="small muted">Keine verfügbaren Flugzeuge.</span>';
  } else if (k === 'staff') {
    const opts = SM.STAFF_GROUPS.map((g) => [`pilot:${g}`, `Piloten ${P.TYPE_GROUPS[g]}`, giver.staff ? giver.staff.pil[g] : null]).concat([['cabin', 'Flugbegleiterinnen', giver.staff ? giver.staff.cab : null], ['tech', 'Techniker', giver.staff ? giver.staff.tech : null]]);
    f = `<select id="${id('role')}">${opts.filter((o) => o[2] === null || o[2] > 0).map(([v, l, h]) => `<option value="${v}">${l}${h !== null ? ` (${h})` : ''}</option>`).join('')}</select><input type="number" id="${id('n')}" min="1" max="60" value="3" style="width:70px">`;
  } else if (k === 'slots') {
    const apts = Object.keys(giver.slotHold || {}).filter((a) => giver.heldAt(a, W.day) > 0);
    f = apts.length ? `<select id="${id('apt')}">${apts.map((a) => `<option value="${a}">${a} · ${giver.heldAt(a, W.day)} frei · ~${eur(SM.slotValue(W, a))} je Slot</option>`).join('')}</select><input type="number" id="${id('n')}" min="1" max="8" value="1" style="width:60px">` : `<span class="small muted">${giver === me ? 'Sie halten' : esc(giver.name) + ' hält'} keine freien Slots.</span>`;
  } else if (k === 'exit') {
    const mine = new Set(me.activeRoutes().map((r) => SM.pairKey(r.base, r.dest)));
    const theirs = giver.activeRoutes().map((r) => SM.pairKey(r.base, r.dest));
    const pairs = [...new Set(theirs)].sort((a, b) => (mine.has(b) && theirs.includes(b)) - (mine.has(a) && theirs.includes(a)));
    f = pairs.length ? `<select id="${id('pair')}">${pairs.map((p) => `<option value="${p}">${p.replace('-', '–')}${side === 'take' && mine.has(p) ? ' · auch Ihre Strecke' : ''}</option>`).join('')}</select>
      <select id="${id('days')}" style="width:auto">${SM.EXIT_DAYS.map((x) => `<option value="${x}" ${x === 365 ? 'selected' : ''}>${x / 30 | 0} Mon.</option>`).join('')}</select>
      <label class="chk small"><input type="checkbox" id="${id('ws')}"> Slots übergeben</label>` : `<span class="small muted">${giver === me ? 'Sie fliegen' : esc(giver.name) + ' fliegt'} keine Strecke.</span>`;
  }
  if (k === 'coop') {
    const mine = new Set(me.activeRoutes().map((r) => SM.pairKey(r.base, r.dest))), theirs = new Set(partner.activeRoutes().map((r) => SM.pairKey(r.base, r.dest)));
    const pairs = [...new Set([...mine, ...theirs])].sort((a, b) => ((mine.has(b) && theirs.has(b)) - (mine.has(a) && theirs.has(a))));
    f = `<select id="${id('ck')}" style="width:auto"><option value="codeshare">Codeshare auf einer Strecke</option><option value="alliance">Allianz (ganzes Netz)</option></select>
      ${pairs.length ? `<select id="${id('pair')}">${pairs.map((p) => `<option value="${p}">${p.replace('-', '–')}${mine.has(p) && theirs.has(p) ? ' · beide fliegen' : mine.has(p) ? ' · nur Sie' : ' · nur Partner'}</option>`).join('')}</select>` : ''}
      <select id="${id('days')}" style="width:auto">${SM.EXIT_DAYS.map((x) => `<option value="${x}" ${x === 365 ? 'selected' : ''}>${x / 30 | 0} Mon.</option>`).join('')}</select>
      <span class="small muted" style="flex:1 1 100%">Codeshare: Beide verkaufen die Flüge des anderen mit – mehr Frequenz im Angebot, etwas mehr Marke. Allianz: Codeshare auf allen gemeinsamen Strecken und 2 % günstigeres Kerosin durch gemeinsamen Einkauf.</span>`;
  }
  return `<div class="dealadd"><select id="${id('k')}" style="width:auto">${DEAL_KINDS.map(([v, l]) => `<option value="${v}" ${v === k ? 'selected' : ''}>${l}</option>`).join('')}</select>${f}<button class="btn small" data-act="dealadd" data-side="${side}">Hinzufügen</button></div>`;
}
const al_age = (al, a) => al.acAge(a, W.day);
function dealComposer() {
  const D = ui.deal, me = W.player, partner = W.airlines[D.to];
  const items = (side, owner) => (D[side].length ? `<ul class="dlitems">${D[side].map((it, i) => `<li>${esc(SM.itemText(W, it, owner))}<button class="x" data-act="dealrm" data-side="${side}" data-i="${i}" aria-label="Entfernen">×</button></li>`).join('')}</ul>` : '<p class="small muted">noch nichts</p>');
  const pseudo = { from: me.id, to: partner.id, give: D.give, take: D.take };
  const err = SM.checkSide(W, me, partner, D.give) || (partner.isPlayer ? SM.checkSide(W, partner, me, D.take) : null);
  let est = '';
  if (!partner.isPlayer && (D.give.length || D.take.length)) {
    const ev = SM.aiDealValue(W, partner, pseudo);
    const e2 = SM.checkSide(W, partner, me, D.take) || (ev.why.includes('Flotte voll') ? `${partner.name} hat keinen Platz für weitere Flugzeuge.` : '');
    est = e2 ? `<div class="callout crit">${esc(e2)}</div>` : ev.value >= 0 ? `<div class="callout good"><b>Gute Chancen.</b> ${esc(partner.name)} dürfte annehmen.</div>`
      : `<div class="callout warn"><b>${ev.need < 0.25 * (ev.vin + ev.vout + 1) ? 'Knapp.' : 'Eher nicht.'}</b> Ihnen fehlen aus Sicht von ${esc(partner.name)} etwa ${eur(ev.need)}. Sie bekommen dann voraussichtlich ein Gegenangebot.</div>`;
  } else if (partner.isPlayer) est = `<div class="callout info">${esc(partner.name)} entscheidet selbst. Das Angebot gilt ${SM.DEAL_DAYS} Spieltage.</div>`;
  const v = (D.give.length || D.take.length) ? myDealValue(pseudo) : null;
  return `<div class="card pad stack dealcomp"><div class="spread"><h3>${D.replyTo ? 'Gegenangebot' : 'Neues Angebot'}</h3><button class="btn small" data-act="dealcancel">Verwerfen</button></div>
    <label class="f"><span>Handelspartner</span><select id="dl-to" ${D.replyTo ? 'disabled' : ''}>
      ${W.humans.filter((h) => h.id !== me.id && h.status !== 'insolvent').length ? `<optgroup label="Mitspielende">${W.humans.filter((h) => h.id !== me.id && h.status !== 'insolvent').map((h) => `<option value="${h.id}" ${h.id === D.to ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</optgroup>` : ''}
      <optgroup label="KI-Airlines">${W.list.filter((a) => a.archetype && a.status !== 'insolvent').map((a) => `<option value="${a.id}" ${a.id === D.to ? 'selected' : ''}>${esc(a.name)} · ${P.AI_ARCHETYPES[a.archetype].label} · ${a.bases.join(', ')}</option>`).join('')}</optgroup></select></label>
    <div class="dealcols edit"><div><span>Sie geben</span>${items('give', me)}${dealOpts('give')}</div><div><span>Sie erhalten von ${esc(partner.name)}</span>${items('take', partner)}${dealOpts('take')}</div></div>
    <label class="f"><span>Nachricht (optional)</span><input type="text" id="dl-note" maxlength="200" value="${esc(D.note || '')}" placeholder="z. B. Wir brauchen die Maschine ab sofort."></label>
    ${err ? `<div class="callout crit">${esc(err)}</div>` : ''}${est}
    ${v !== null ? `<p class="small muted">Grobe Bewertung für Sie: <b class="${v < 0 ? 'neg' : 'pos'}">${eur(v, { plus: true })}</b></p>` : ''}
    <div class="row"><button class="btn primary" data-act="dealsend" ${err || !(D.give.length || D.take.length) ? 'disabled' : ''}>${partner.isPlayer ? 'Angebot senden' : 'Angebot machen'}</button>${!partner.isPlayer && (D.give.some((x) => x.k === 'cash') || D.take.some((x) => x.k === 'cash')) ? '<button class="btn" data-act="dealtune" title="Geldbetrag auf das setzen, was die KI gerade akzeptieren würde">Preis anpassen</button>' : ''}
      <span class="small muted">Flugzeuge wechseln mit Leasingvertrag bzw. Kredit und Kaution. Bei einem Rückzug stellt die Airline die Strecke sofort ein und darf sie in der Laufzeit nicht wieder fliegen.</span></div></div>`;
}
function readDealItem(side) {
  const g = (x) => $(`#dl-${x}-${side}`), k = g('k').value;
  if (k === 'cash') { const v = Math.round(Number(g('cash').value)); return v > 0 ? { k, amount: v } : null; }
  if (k === 'ac') return g('ac') ? { k, id: g('ac').value } : null;
  if (k === 'staff') { if (!g('role')) return null; const [role, group] = g('role').value.split(':'); return { k, role, group: group || null, n: Math.max(1, Math.round(Number(g('n').value) || 1)) }; }
  if (k === 'slots') return g('apt') ? { k, apt: g('apt').value, n: Math.max(1, Math.round(Number(g('n').value) || 1)) } : null;
  if (k === 'exit') return g('pair') ? { k, pair: g('pair').value, days: Number(g('days').value), withSlots: g('ws').checked } : null;
  if (k === 'coop') { const kind = g('ck').value; if (kind === 'codeshare' && !g('pair')) return null; return { k, kind, pair: kind === 'codeshare' ? g('pair').value : null, days: Number(g('days').value) }; }
  return null;
}
// ---------- Marktplatz: Anzeigen an alle Airlines ----------
const mktOpen = () => (W.deals || []).filter((d) => d.to === SM.MARKET && d.status === 'open');
function mktItemOpts() {
  const M = ui.mkt, me = W.player, k = M.k || 'ac', sell = M.mode === 'sell';
  let f = '';
  if (k === 'ac') {
    if (sell) { const list = me.fleet.filter((a) => a.delivery_day <= W.day && !(a.acmi && a.acmi.end > W.day) && !M.items.some((x) => x.k === 'ac' && x.id === a.id));
      f = list.length ? `<select id="mk-ac">${list.map((a) => `<option value="${a.id}">${acName(a.id)} · ${tl(a.type_id)} · ${a.owned ? 'Eigentum' : 'Leasing'} · ${n0(me.acAge(a, W.day))} J.</option>`).join('')}</select>` : '<span class="small muted">Keine Flugzeuge verfügbar.</span>'; }
    else f = `<select id="mk-type">${Object.entries(P.AIRCRAFT_TYPES).filter(([, t]) => !t.launch).map(([id, t]) => `<option value="${id}">${esc(t.label)}</option>`).join('')}</select>
      <select id="mk-age" style="width:auto"><option value="">jedes Alter</option>${[5, 10, 15, 20].map((y) => `<option value="${y}">bis ${y} Jahre</option>`).join('')}</select>
      <input type="number" id="mk-n" min="1" max="4" value="1" style="width:64px" aria-label="Anzahl">
      <label class="chk small"><input type="checkbox" id="mk-fam"> auch andere Muster der Familie</label>`;
  } else if (k === 'staff') {
    const opts = SM.STAFF_GROUPS.map((g) => [`pilot:${g}`, `Piloten ${P.TYPE_GROUPS[g]}`, me.staff ? me.staff.pil[g] : 0]).concat([['cabin', 'Flugbegleiterinnen', me.staff ? me.staff.cab : 0], ['tech', 'Techniker', me.staff ? me.staff.tech : 0]]);
    f = `<select id="mk-role">${opts.filter((o) => !sell || o[2] > 0).map(([v, l, h]) => `<option value="${v}">${l}${sell ? ` (${h})` : ''}</option>`).join('')}</select><input type="number" id="mk-n" min="1" max="60" value="5" style="width:72px" aria-label="Anzahl">`;
  } else {
    const apts = sell ? Object.keys(me.slotHold || {}).filter((a) => me.heldAt(a, W.day) > 0) : SM.AP_CODES.filter((c) => isFinite(W.slotsFree(c)));
    f = apts.length ? `<select id="mk-apt">${apts.map((a) => `<option value="${a}">${a} · ${esc(apName(a))}${sell ? ` · ${me.heldAt(a, W.day)} in Reserve` : ` · ${Math.max(0, W.slotsFree(a))} frei am Markt`}</option>`).join('')}</select><input type="number" id="mk-n" min="1" max="8" value="1" style="width:64px" aria-label="Anzahl">` : '<span class="small muted">Sie haben keine Slots in Reserve.</span>';
  }
  return `<div class="dealadd"><select id="mk-k" style="width:auto">${[['ac', 'Flugzeug'], ['staff', 'Personal'], ['slots', 'Slots']].map(([v, l]) => `<option value="${v}" ${v === k ? 'selected' : ''}>${l}</option>`).join('')}</select>${f}<button class="btn small" data-act="mktadd">Hinzufügen</button></div>`;
}
function mktReadItem() {
  const M = ui.mkt, k = M.k || 'ac', g = (x) => $('#mk-' + x), sell = M.mode === 'sell';
  if (k === 'ac') {
    if (sell) return g('ac') ? { k: 'ac', id: g('ac').value } : null;
    return { k: 'acAny', type: g('type').value, n: Math.max(1, Math.min(4, Number(g('n').value) || 1)), fam: g('fam').checked, maxAge: g('age').value ? Number(g('age').value) : null };
  }
  if (k === 'staff') { const [role, group] = g('role').value.split(':'); return { k: 'staff', role, group: group || null, n: Math.max(1, Number(g('n').value) || 1) }; }
  return g('apt') ? { k: 'slots', apt: g('apt').value, n: Math.max(1, Number(g('n').value) || 1) } : null;
}
function marketHtml() {
  const me = W.player, all = mktOpen(), M = ui.mkt;
  let html = `<div class="stack"><div class="spread"><h2 class="sec">Marktplatz <small>Anzeigen an alle Airlines</small></h2>${M ? '' : '<button class="btn small primary" data-act="mktnew">Anzeige aufgeben</button>'}</div>`;
  if (M) {
    const sell = M.mode === 'sell';
    html += `<div class="card pad stack mkt-comp">
      <div class="seg"><button data-act="mktmode" data-v="sell" aria-pressed="${sell}">Ich biete an</button><button data-act="mktmode" data-v="buy" aria-pressed="${!sell}">Ich suche</button></div>
      <p class="small muted">${sell ? 'Alle KI-Airlines und Mitspielenden sehen Ihre Anzeige. Wer Interesse hat, schickt ein Angebot in Ihren Eingang – Sie wählen das beste.' : 'Alle Airlines sehen Ihr Gesuch. Wer liefern kann, schickt ein Angebot in Ihren Eingang – Sie wählen das beste.'}</p>
      ${M.items.length ? `<ul class="mkt-items">${M.items.map((x, i) => `<li>${esc(SM.itemText(W, x, me))} <button class="btn small" data-act="mktrm" data-i="${i}" aria-label="Entfernen">×</button></li>`).join('')}</ul>` : ''}
      ${mktItemOpts()}
      <div class="grid2"><label class="f"><span>${sell ? 'Wunschpreis (leer = Angebote abwarten)' : 'Sie zahlen (leer = Preisangebote abwarten)'}</span><input type="number" id="mk-price" min="0" step="5000" value="${M.price || ''}" placeholder="z. B. 500000"></label>
        <label class="f"><span>Notiz</span><input type="text" id="mk-note" maxlength="140" value="${esc(M.note || '')}" placeholder="optional"></label></div>
      <div class="row"><button class="btn primary" data-act="mktpost" ${M.items.length ? '' : 'disabled'}>Anzeige veröffentlichen</button><button class="btn" data-act="mktcancel">Verwerfen</button><span class="small muted">gilt 21 Tage · höchstens 4 gleichzeitig</span></div>
    </div>`;
  }
  if (!all.length) html += `<p class="small muted">Gerade keine Anzeigen. Stellen Sie zum Beispiel ein Gesuch „2 × A320neo, bis 10 Jahre“ oder bieten Sie ein ungenutztes Flugzeug an – KI-Airlines antworten innerhalb weniger Tage.</p>`;
  for (const d of all.sort((a, b) => (b.from === me.id) - (a.from === me.id) || b.day - a.day)) {
    const P0 = W.airlines[d.from], mine = d.from === me.id, sell = d.give.some((x) => x.k !== 'cash');
    const items = (sell ? d.give : d.take).filter((x) => x.k !== 'cash'), cash = (sell ? d.take : d.give).find((x) => x.k === 'cash');
    const resp = (W.deals || []).filter((x) => x.marketOf === d.id && x.status === 'open').length;
    let act = '';
    if (mine) act = `<span class="small">${resp ? `<b>${resp} Angebot${resp > 1 ? 'e' : ''}</b> im Eingang` : 'noch keine Antwort'}</span><button class="btn small" data-act="dealwithdraw" data-id="${d.id}">Zurückziehen</button>`;
    else if (sell) act = `${cash ? `<button class="btn small primary" data-act="mktaccept" data-id="${d.id}">Kaufen für ${eur(cash.amount)}</button>` : ''}<button class="btn small" data-act="mktoffer" data-id="${d.id}">Angebot machen</button>`;
    else { const can = SM.resolveItems(W, me, d.take); act = can ? `${cash ? `<button class="btn small primary" data-act="mktaccept" data-id="${d.id}">Liefern für ${eur(cash.amount)}</button>` : ''}<button class="btn small" data-act="mktoffer" data-id="${d.id}">Angebot machen</button>` : '<span class="small muted">Sie können das nicht liefern.</span>'; }
    html += `<div class="deal mkt ${mine ? 'mine' : ''}"><div class="spread"><div>${mine ? '<b>Ihre Anzeige</b>' : alChip(P0)} <span class="chip ${sell ? 'good' : 'me'}">${sell ? (mine ? 'Sie bieten' : 'bietet') : (mine ? 'Sie suchen' : 'sucht')}</span></div><span class="small muted">bis ${dateShort(d.expires)}</span></div>
      <ul class="mkt-items">${items.map((x) => `<li>${esc(SM.itemText(W, x, P0))}</li>`).join('')}</ul>
      <p class="small">${cash ? `${sell ? 'Preis' : 'Zahlt'}: <b>${eur(cash.amount)}</b>` : `<span class="muted">${sell ? 'Kein Preis genannt – Angebote erwünscht' : 'Preis offen – Angebote erwünscht'}</span>`}${d.note ? ` · <i>„${esc(d.note)}“</i>` : ''}</p>
      <div class="row">${act}</div></div>`;
  }
  return html + '</div>';
}
function onMarketClick(act, b) {
  const me = W.player;
  const keep = () => { if (!ui.mkt) return; const p = $('#mk-price'), n = $('#mk-note'); if (p) ui.mkt.price = p.value; if (n) ui.mkt.note = n.value; };
  switch (act) {
    case 'mktnew': ui.mkt = { mode: 'buy', items: [], k: 'ac', price: '', note: '' }; renderPane(true); return true;
    case 'mktcancel': ui.mkt = null; renderPane(true); return true;
    case 'mktmode': keep(); ui.mkt.mode = b.dataset.v; ui.mkt.items = []; renderPane(true); return true;
    case 'mktadd': { keep(); const it = mktReadItem(); if (it) ui.mkt.items.push(it); renderPane(true); return true; }
    case 'mktrm': keep(); ui.mkt.items.splice(Number(b.dataset.i), 1); renderPane(true); return true;
    case 'mktpost': {
      keep(); const M = ui.mkt, price = Math.round(Number(M.price) || 0), cash = price > 0 ? [{ k: 'cash', amount: price }] : [];
      const res = doAction({ type: 'dealPropose', to: SM.MARKET, give: M.mode === 'sell' ? M.items : cash, take: M.mode === 'sell' ? cash : M.items, note: M.note || '' });
      if (res.ok) { ui.mkt = null; toast(res.reply || 'Anzeige veröffentlicht.'); }
      refreshAll(); return true;
    }
    case 'mktaccept': { const res = doAction({ type: 'marketAccept', id: b.dataset.id }); if (res.ok) toast('Handel abgeschlossen.'); refreshAll(); return true; }
    case 'mktoffer': {
      const d = mktOpen().find((x) => x.id === b.dataset.id); if (!d) return true;
      const sell = d.give.some((x) => x.k !== 'cash');
      if (sell) startDeal(d.from, d.take.length ? d.take.map((x) => ({ ...x })) : [{ k: 'cash', amount: 100000 }], d.give.map((x) => ({ ...x })), { marketOf: d.id });
      else { const items = SM.resolveItems(W, me, d.take) || []; startDeal(d.from, items, d.give.length ? d.give.map((x) => ({ ...x })) : [{ k: 'cash', amount: 100000 }], { marketOf: d.id }); }
      return true;
    }
  }
  return false;
}
function onMarketChange(t) { if (t.id === 'mk-k' && ui.mkt) { const p = $('#mk-price'), n = $('#mk-note'); if (p) ui.mkt.price = p.value; if (n) ui.mkt.note = n.value; ui.mkt.k = t.value; renderPane(true); return true; } return false; }
function startDeal(to, give = [], take = [], extra = {}, tune = false) {
  ui.deal = { to, give, take, note: '', ...extra }; ui.dealK = { give: 'cash', take: 'cash' };
  if (tune) tuneCash();
  setTab('trade');
}
/** Vorschlag: Geldbetrag so setzen, dass die KI gerade zustimmen würde. */
function tuneCash() {
  const D = ui.deal, partner = W.airlines[D.to]; if (!partner || partner.isPlayer) return;
  const pay = D.give.find((x) => x.k === 'cash'), get = D.take.find((x) => x.k === 'cash');
  for (let i = 0; i < 6; i++) {
    const ev = SM.aiDealValue(W, partner, { from: W.playerId, to: D.to, give: D.give, take: D.take });
    if (pay) pay.amount = Math.max(5000, pay.amount - ev.value); else if (get) get.amount = Math.max(0, get.amount + ev.value);
  }
  if (pay) pay.amount = Math.ceil(pay.amount / 5000) * 5000;
  if (get) get.amount = Math.floor(get.amount / 5000) * 5000;
  if (get && get.amount <= 0) D.take = D.take.filter((x) => x !== get);
}
function bestBuyerFor(a) {
  const ais = W.list.filter((x) => x.archetype && x.status === 'active' && x.fleet.length < x.maxFleet);
  return (ais.find((x) => (x.cfg.pref_types || []).includes(a.type_id)) || ais.find((x) => x.familyKnown(a.type_id)) || ais[0] || W.list.find((x) => x.id !== W.playerId)).id;
}
function onDealClick(act, b) {
  const pl = W.player;
  switch (act) {
    case 'dealnew': { const comp = W.list.find((x) => x.id !== pl.id && x.status !== 'insolvent' && !x.archetype) || W.list.find((x) => x.archetype && x.status !== 'insolvent'); startDeal(comp.id); return true; }
    case 'dealwith': startDeal(b.dataset.al); return true;
    case 'dealac': { const a = pl.fleet.find((x) => x.id === b.dataset.id); if (a) startDeal(bestBuyerFor(a), [{ k: 'ac', id: a.id }], [{ k: 'cash', amount: Math.max(5000, Math.round(SM.acDealValue(W, a) / 5000) * 5000) }], {}, true); return true; }
    case 'dealexit': { const al = W.airlines[b.dataset.al], pair = b.dataset.pair; startDeal(al.id, [{ k: 'cash', amount: Math.round(SM.exitLoss(W, al, pair, 365) * 1.1 / 5000) * 5000 }], [{ k: 'exit', pair, days: 365, withSlots: true }], {}, true); return true; }
    case 'dealslots': { const apt = b.dataset.apt, buyer = W.list.filter((x) => x.archetype && x.status === 'active').find((x) => x.bases.includes(apt) || x.activeRoutes().some((r) => r.base === apt || r.dest === apt)) || W.list.find((x) => x.archetype); startDeal(buyer.id, [{ k: 'slots', apt, n: 1 }], [{ k: 'cash', amount: Math.round(SM.slotValue(W, apt) * 0.9 / 5000) * 5000 }], {}, true); return true; }
    case 'dealcancel': ui.deal = null; renderPane(true); return true;
    case 'dealtune': readDealNote(); tuneCash(); renderPane(true); return true;
    case 'dealadd': { const it = readDealItem(b.dataset.side); if (!it) { toast('Bitte zuerst etwas auswählen.'); return true; } readDealNote(); const arr = ui.deal[b.dataset.side]; const same = arr.find((x) => x.k === 'cash' && it.k === 'cash'); if (same) same.amount += it.amount; else arr.push(it); renderPane(true); return true; }
    case 'dealrm': readDealNote(); ui.deal[b.dataset.side].splice(Number(b.dataset.i), 1); renderPane(true); return true;
    case 'dealsend': {
      readDealNote();
      const D = ui.deal, partner = W.airlines[D.to];
      const res = doAction({ type: 'dealPropose', to: D.to, give: D.give, take: D.take, note: D.note, replyTo: D.replyTo || null, marketOf: D.marketOf || null });
      if (!res.ok) return true;
      ui.deal = null;
      if (partner.isPlayer) toast(`Angebot an ${partner.name} gesendet.`);
      else toast(res.reply || 'Angebot gemacht.');
      refreshAll(); setTab('trade'); return true;
    }
    case 'dealaccept': { const res = doAction({ type: 'dealRespond', id: b.dataset.id, choice: 'accept' }); if (res.ok) toast('Handel abgeschlossen.'); refreshAll(); return true; }
    case 'dealreject': doAction({ type: 'dealRespond', id: b.dataset.id, choice: 'reject' }); refreshAll(); return true;
    case 'dealwithdraw': doAction({ type: 'dealWithdraw', id: b.dataset.id }); refreshAll(); return true;
    case 'dealcounter': {
      const d = W.deals.find((x) => x.id === b.dataset.id); if (!d) return true;
      // Aus Ihrer Sicht: Sie geben, was der Absender haben wollte, und erhalten, was er bot
      startDeal(d.from, d.take.map((x) => ({ ...x })), d.give.map((x) => ({ ...x })), { replyTo: d.id });
      return true;
    }
    default: return false;
  }
}
function readDealNote() { const n = $('#dl-note'); if (n && ui.deal) ui.deal.note = n.value; }
function onDealChange(t) {
  if (!ui.deal) return false;
  if (t.id === 'dl-to') { readDealNote(); ui.deal.to = t.value; ui.deal.take = []; renderPane(true); return true; }
  const m = /^dl-k-(give|take)$/.exec(t.id);
  if (m) { readDealNote(); ui.dealK = ui.dealK || {}; ui.dealK[m[1]] = t.value; renderPane(true); return true; }
  const c = /^dl-ck-(give|take)$/.exec(t.id);
  if (c) { const ps = document.getElementById(`dl-pair-${c[1]}`); if (ps) ps.hidden = t.value === 'alliance'; return true; }
  return false;
}

// ---------- Abflugtafel ----------
function boardRows() {
  const h = ui.t * 24, rows = [];
  for (const s of schedules) {
    if (!s.me) continue;
    s.legs.forEach((l, i) => {
      for (const off of [0, 24]) {
        const t0 = l.t0 + off, t1 = l.t1 + off;
        if (t1 < h || t0 > h + 20) continue;
        rows.push({ s, l, i, t0, t1 });
      }
    });
  }
  return rows.sort((a, b) => a.t0 - b.t0);
}
function boardStatus(x, h) {
  if (x.t0 <= h) return ['air', 'In der Luft'];
  if (x.t0 - h < 0.75) return ['board2', 'Boarding'];
  const st = rstats(x.l.r, 14), otp = st.otp === null ? 0.9 : st.otp;
  const roll = (((W.day + 1) * 7919 + x.i * 104729 + x.s.ac.id.length * 31 + Math.round(x.t0 * 13)) % 1000) / 1000;
  if (roll > otp) return ['late', `Verspätet +${10 + Math.round(roll * 40)}′`];
  return ['ok', 'Pünktlich'];
}
VIEWS.departures = function viewDepartures() {
  const h = ui.t * 24, rows = boardRows();
  const air = rows.filter((x) => x.t0 <= h && x.t1 >= h).sort((a, b) => (b.t1 - b.t0) - (a.t1 - a.t0));
  const next = rows.filter((x) => x.t0 > h).slice(0, 24);
  let html = `<h2 class="sec">Abflüge <small>${dateShort(W.day)} · ${clockText()} Uhr · ${air.length} in der Luft</small></h2>`;
  if (!rows.length) return html + '<div class="callout info">Noch keine Flüge im Plan. Sobald ein Flugzeug geliefert ist und eine Strecke hat, erscheint hier die Abflugtafel.</div>';
  if (air.length) {
    const x = air[0], l = x.l, f = Math.max(0, Math.min(1, (h - x.t0) / (x.t1 - x.t0)));
    html += `<button class="flightcard" data-act="selac" data-ac="${x.s.ac.id}">
      <div class="fc-h"><span class="badge">In der Luft</span><b>${flightNo(x.s.al, l.r, l.dir)}</b><small>${tl(x.s.ac.type_id)} · ${acName(x.s.ac.id)}</small></div>
      <div class="pc-route"><div><b>${l.a}</b><span>${esc(apName(l.a))}</span></div><i>✈</i><div><b>${l.b}</b><span>${esc(apName(l.b))}</span></div></div>
      <div class="pc-prog"><i style="width:${(f * 100).toFixed(0)}%"></i></div>
      <div class="pc-times"><span>${hhmm((x.t0 % 24 + 24) % 24)}</span><span>${n0((1 - f) * (x.t1 - x.t0) * 60)} Min. verbleibend</span><span>${hhmm((x.t1 % 24 + 24) % 24)}</span></div></button>`;
  }
  html += `<div class="tw"><table class="board"><thead><tr><th>Zeit</th><th>Flug</th><th>Nach</th><th>Flugzeug</th><th>Status</th></tr></thead><tbody>
    ${air.concat(next).slice(0, 30).map((x) => { const [cls, txt] = boardStatus(x, h); return `<tr data-act="selac" data-ac="${x.s.ac.id}" style="cursor:pointer"><td class="t">${hhmm((x.t0 % 24 + 24) % 24)}</td><td class="fl">${flightNo(x.s.al, x.l.r, x.l.dir)}</td><td><b>${x.l.b}</b> <span class="small muted">${esc(apName(x.l.b))}</span><div class="small muted">ab ${x.l.a}</div></td><td class="small">${x.s.ac.type_id}</td><td><span class="st ${cls}">${txt}</span></td></tr>`; }).join('')}
  </tbody></table></div>
  <p class="small muted">Zeiten in Ortszeit der Basis. Die Tafel folgt dem Spieltag.</p>`;
  return html;
};

// ---------------------------------------------------------------------------
// Assistenz: wählbare Begleitung, die erinnert, rät und über Ereignisse berichtet
// ---------------------------------------------------------------------------
const ASSISTANTS = {
  lena: { name: 'Lena Hoffmann', role: 'Strategin', color: '#8b5cf6', focus: 'strat', she: true,
    desc: 'War Strategiechefin bei einer Ferienairline. Denkt in Marktanteilen und Marke und sagt klar, wo es langgeht.',
    hello: (n) => `Schön, an Bord zu sein. Ich behalte für ${n} das große Bild im Blick: Märkte, Konkurrenz und Marke.`,
    pre: { crit: 'Das hat Vorrang:', warn: 'Mein Rat:', good: 'Gute Nachricht:', info: 'Zur Lage:' }, sign: 'Lena' },
  marco: { name: 'Marco Rossi', role: 'Operations-Profi', color: '#1fa463', focus: 'ops', she: false,
    desc: 'Zwanzig Jahre Flugbetrieb, erst als Kapitän, dann in der Leitstelle. Pünktlichkeit, Crews und Technik sind sein Revier.',
    hello: (n) => `Servus! Ich sorge dafür, dass bei ${n} die Flieger pünktlich gehen und die Crews stehen.`,
    pre: { crit: 'Achtung, Betrieb:', warn: 'Aus der Leitstelle:', good: 'Läuft:', info: 'Kurz notiert:' }, sign: 'Marco' },
  aiko: { name: 'Aiko Tanaka', role: 'Finanzexpertin', color: '#ef8a17', focus: 'fin', she: true,
    desc: 'Ex-Treasurerin einer Netzwerk-Airline. Liquidität, Kosten, Kerosin und Kredite – sie rechnet lieber zweimal.',
    hello: (n) => `Hallo! Ich halte bei ${n} Kasse, Kosten und Risiken im Blick. Liquidität vor Wachstum.`,
    pre: { crit: 'Dringend:', warn: 'Zahlen-Check:', good: 'Erfreulich:', info: 'Notiz:' }, sign: 'Aiko' },
  sam: { name: 'Samuel Okafor', role: 'Netzwerkplaner', color: '#2f7cf6', focus: 'net', she: false,
    desc: 'Plant seit Jahren Streckennetze und Umsteigewellen. Findet Lücken der Konkurrenz und die nächste gute Strecke.',
    hello: (n) => `Hi! Ich suche für ${n} die besten Märkte und sage Bescheid, wo Passagiere liegen bleiben.`,
    pre: { crit: 'Wichtig:', warn: 'Netz-Check:', good: 'Chance:', info: 'Netz-Update:' }, sign: 'Sam' },
};
function avatarSvg(id, cls = 'av') {
  const a = ASSISTANTS[id] || ASSISTANTS.lena;
  const look = {
    lena: { skin: '#f2c9a8', hair: '#8a5a2b', shirt: '#3b2a6b', back: '<path d="M17 30c0-12 6-19 15-19s15 7 15 19v14H17z"/>', front: '<path d="M20 26c1-9 6-14 12-14s11 5 12 13c-5-1-9-4-11-8-2 5-7 8-13 9z"/>', extra: '' },
    marco: { skin: '#d9a07a', hair: '#2b1d14', shirt: '#14532d', back: '', front: '<path d="M20 24c0-8 5-12 12-12s12 4 12 12c-2-3-5-5-12-5s-10 2-12 5z"/>', extra: '<path d="M24 35c2 4 5 5 8 5s6-1 8-5c-1 6-4 8-8 8s-7-2-8-8z" fill="#2b1d14" opacity=".55"/>' },
    aiko: { skin: '#f3d6ba', hair: '#14141c', shirt: '#7c2d12', back: '<path d="M18 28c0-11 6-17 14-17s14 6 14 17v8H18z"/>', front: '<path d="M19 27c0-9 6-15 13-15s13 6 13 15c-4-4-8-5-13-5s-9 1-13 5z"/>', extra: '' },
    sam: { skin: '#7a4b2e', hair: '#151010', shirt: '#1e3a8a', back: '', front: '<path d="M20 23c0-7 5-11 12-11s12 4 12 11c-3-2-7-3-12-3s-9 1-12 3z"/>', extra: '<g fill="none" stroke="#0b1a33" stroke-width="1.4"><circle cx="27.5" cy="28.5" r="3.2"/><circle cx="36.5" cy="28.5" r="3.2"/><path d="M30.7 28.5h2.6"/></g>' },
  }[id] || {};
  return `<svg class="${cls}" viewBox="0 0 64 64" role="img" aria-label="${esc(a.name)}"><defs><linearGradient id="avg-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a.color}" stop-opacity=".95"/><stop offset="1" stop-color="#0b1a33"/></linearGradient><clipPath id="avc-${id}"><circle cx="32" cy="32" r="32"/></clipPath></defs>
    <g clip-path="url(#avc-${id})"><rect width="64" height="64" fill="url(#avg-${id})"/>
    <g fill="${look.hair}">${look.back}</g>
    <path d="M10 66c2-13 10-19 22-19s20 6 22 19z" fill="${look.shirt}"/><path d="M27 40h10v9c-3 2-7 2-10 0z" fill="${look.skin}"/><path d="M26 49l6 6 6-6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>
    <ellipse cx="32" cy="29" rx="11.5" ry="13" fill="${look.skin}"/>
    <g fill="${look.hair}">${look.front}</g>${look.extra}
    <circle cx="27.5" cy="29" r="1.3" fill="#0b1a33"/><circle cx="36.5" cy="29" r="1.3" fill="#0b1a33"/>
    <path d="M28 35.5c2.2 1.8 5.8 1.8 8 0" fill="none" stroke="#7c2d12" stroke-width="1.4" stroke-linecap="round"/></g></svg>`;
}
const asst = () => (W && W.player && W.player.assistant ? W.player.assistant : null);
const asstP = () => { const a = asst(); return a ? ASSISTANTS[a.id] : null; };

/** Regelbasierte Hinweise. cat: ops, fin, net, strat – die Assistenz zieht ihr Fachgebiet nach vorn. */
function assistantHints() {
  const pl = W.player, out = [], routes = pl.activeRoutes(), add = (key, kind, cat, html, tab = null, extra = {}) => out.push({ key, kind, cat, html, tab, ...extra });
  const bs = SM.balanceSheet(pl);
  for (const d of incomingDeals().slice(0, 2)) add('deal' + d.id, 'info', 'strat', `<b>${esc(W.airlines[d.from].name)}</b> bietet einen Handel an (bis ${dateShort(d.expires)}): ${esc(SM.dealText(W, d))}.`, 'trade');
  for (const d of openDecisions()) add('dec' + d.id, 'crit', 'ops', `<b>Entscheidung bis ${dateShort(d.deadline)}:</b> ${esc(d.text)}`, 'cockpit');
  if (pl.status === 'restructuring') add('restr', 'crit', 'fin', `<b>Restrukturierung:</b> Noch ${P.INSOLVENCY_AFTER_DAYS - pl.distressDays} Tage, bis der Kontostand wieder positiv sein muss.`, 'credit');
  else if (netCash(pl) < 0 && bs.cash >= 0) add('dispo', 'warn', 'fin', `<b>Konto im Dispo</b> (${eur(netCash(pl))}). Das ist erlaubt, kostet aber ${pct(pl.creditRate(W.macro.rate, W.macro.bank ?? 1), 1)} Zins – und kürzt die Bank die Linie, wird der Überhang sofort eingezogen.`, 'credit');
  if (bs.cash < 0 && pl.status !== 'restructuring') add('neg', 'crit', 'fin', `<b>Dispo überzogen</b> (${eur(netCash(pl))}). Nach ${P.INSOLVENCY_AFTER_DAYS} Tagen droht die Insolvenz. Kredit aufnehmen oder Verlustbringer schließen.`, 'credit');
  else if (isFinite(pl.runway) && pl.runway < 60 && routes.length) add('runway', 'warn', 'fin', `Das Geld reicht beim jetzigen Abfluss noch etwa <b>${n0(pl.runway)} Tage</b>.`, 'credit');
  if (!pl.fleet.length) add('nofleet', 'info', 'strat', `Wir brauchen zuerst ein Flugzeug. Zwei <b>A320neo</b> im Leasing sind ein solider Start – das kostet nur die Kaution.`, 'fleetBuy');
  else if (!routes.length) add('noroute', 'info', 'net', `Die Flotte ist da oder unterwegs, aber es gibt noch <b>keine Strecke</b>. Tippen Sie ein Ziel auf der Karte an.`, 'plan');
  const cov = pl.staff.cov;
  if (cov && Object.values(cov.cancel).some((x) => x > 0)) add('cxstaff', 'crit', 'ops', `<b>Flugausfälle:</b> Heute fehlen Crews${pl.staff.agency ? '' : ', und Agenturpersonal ist abgeschaltet'}.`, 'staff');
  else if (cov && cov.agencyH > 0) add('agency', 'warn', 'ops', `Agenturpersonal fliegt mit – das kostet <b>${eur(cov.extraCost)} extra pro Tag</b>. Rechtzeitig fest einstellen.`, 'staff');
  const gap = SM.staffPlanOf(pl).filter((r) => r.have + r.pipe < r.need - 0.5);
  if (gap.length && routes.length) add('gap', 'warn', 'ops', `Personal reicht nicht: es fehlen ${gap.map((r) => `${n0(Math.ceil(r.need - r.have - r.pipe))} ${esc(r.label)}`).join(', ')}.`, 'staff');
  if (pl.staff.morale < 0.55 && SM.sumObj(pl.staff.pil) > 0) add('morale', 'warn', 'ops', `Die Stimmung liegt bei <b>${pct(pl.staff.morale)}</b>. Unter 55 % steigt das Streikrisiko – Gehalt prüfen.`, 'staff');
  for (const r of routes) if (r.partial && r.opened_day <= W.day) { const k = Math.ceil(pl.rotH(r) / SM.winOf(r.type_id)); add('part' + r.id, 'warn', 'net', `<b>${r.base}–${r.dest}</b> fliegt nur an ${pct(r.partial)} der Tage: Ein Umlauf dauert ${n1(pl.rotH(r))} h. Für täglichen Betrieb braucht es ${k} Flugzeuge.`, null, { route: r.id }); break; }
  if (pl.lineCut) add('linecut', 'crit', 'fin', 'Die Bank hat Ihre <b>Kreditlinie gekürzt</b>. Der Überhang wird vom Konto eingezogen.', 'credit');
  if (pl.staff && pl.staff.pay < wageNow() - 0.01) add('wage', 'warn', 'ops', `Ihr Gehalt liegt <b>${pct(1 - pl.staff.pay / wageNow())} unter dem Marktlohn</b> – die Konkurrenz wirbt ab, die Stimmung sinkt.`, 'staff');
  { const att = pl.events.filter((e) => e.kind === 'crit' && /greift Ihre Strecke/.test(e.msg) && e.day >= W.day - 21).pop(); if (att) add('att' + att.day, 'crit', 'net', esc(att.msg) + ' Preise und Frequenz prüfen.', 'routes'); }
  { const lot = (W.auctions || []).find((a) => !a.done && pl.fleet.some((x) => P.AIRCRAFT_TYPES[x.type_id].group === P.AIRCRAFT_TYPES[a.type].group) && a.bids[pl.id] === undefined); if (lot) add('lot' + lot.id, 'info', 'strat', `Auktion: ${lot.n} frühe Lieferpositionen für ${tl(lot.type)} bis ${dateShort(lot.closes)}.`, 'fleetBuy'); }
  if (routes.length >= 4 && !(pl.academy && Object.values(pl.academy).some((x) => x.lv)) && W.macro.laborTight > 1.25) add('acad', 'info', 'ops', 'Der Arbeitsmarkt ist angespannt. Eine geförderte <b>Flugschule</b> liefert eigenen Nachwuchs, der schwerer abzuwerben ist.', 'staff');
  const miss = unplacedNow();
  if (miss.length) add('unpl', 'warn', 'ops', `Ohne Flugzeug: ${miss.map(([r, k]) => `${r.base}–${r.dest} (${k}×)`).join(', ')}. Diese Flüge fallen aus.`, 'fleetPlan');
  for (const a of pl.fleet) {
    if (a.delivery_day <= W.day && !(a.used_hours > 0) && !(a.acmi && a.acmi.start <= W.day && a.acmi.end > W.day) && a.status !== 'ccheck' && a.status !== 'aog') { add('idle' + a.id, 'warn', 'ops', `<b>${acName(a.id)}</b> (${tl(a.type_id)}) steht ungenutzt und kostet ${eur(acDayCost(a))} pro Tag.`, 'fleetOwn'); break; }
  }
  for (const a of pl.fleet) {
    const toC = P.CCHECK_FH - (a.fh - a.lastC);
    if (a.delivery_day <= W.day && toC < 120 && a.status !== 'ccheck') { add('cc' + a.id, 'info', 'ops', `C-Check für <b>${acName(a.id)}</b> in ${n0(Math.max(0, toC))} Flugstunden – dann fehlt das Flugzeug einige Tage.`, 'fleetOwn'); break; }
  }
  for (const a of pl.fleet) if (a.delivery_day > W.day && a.delivery_day - W.day <= 4 && !(a.assigned || []).length && !routes.some((r) => r.type_id === a.type_id && r.base === a.base)) { add('dlv' + a.id, 'info', 'net', `${tl(a.type_id)} kommt am ${dateShort(a.delivery_day)} – es gibt noch keine Strecke dafür.`, 'plan'); break; }
  let worst = null, spill = null, empty = null, cheap = null;
  for (const r of routes) {
    const s30 = rstats(r, 30), s7 = rstats(r, 7);
    if (s30.n >= 14 && s30.db1 < 0 && (!worst || s30.db1 < worst.s.db1)) worst = { r, s: s30 };
    if (s7.n >= 5 && s7.demand > 0 && s7.spill / s7.demand > 0.08 && (!spill || s7.spill > spill.s.spill)) spill = { r, s: s7 };
    if (s30.n >= 14 && s30.lf < 0.55 && (!empty || s30.lf < empty.s.lf)) empty = { r, s: s30 };
    const c = W.competitorOffers(W.playerId, r.base, r.dest).filter((o) => o.fare < r.fare_out * 0.85).sort((a, b) => a.fare - b.fare)[0];
    if (c && !cheap) cheap = { r, c };
  }
  if (worst) add('loss' + worst.r.id, 'warn', 'fin', `<b>${worst.r.base}–${worst.r.dest}</b> deckt nicht einmal die direkten Kosten (${eur(worst.s.db1 / worst.s.n, { plus: true })} pro Tag).`, null, { route: worst.r.id });
  if (spill) add('spill' + spill.r.id, 'good', 'net', `Auf <b>${spill.r.base}–${spill.r.dest}</b> bleiben täglich etwa ${n0(spill.s.spill / spill.s.n)} Reisende ohne Platz – Preis rauf oder Frequenz ausbauen.`, null, { route: spill.r.id });
  if (empty) add('empty' + empty.r.id, 'warn', 'net', `<b>${empty.r.base}–${empty.r.dest}</b> fliegt nur zu ${pct(empty.s.lf)} voll. Kleineres Flugzeug oder günstigerer Tarif?`, null, { route: empty.r.id });
  if (cheap) add('cheap' + cheap.r.id, 'warn', 'strat', `${esc(W.airlines[cheap.c.airline].name)} unterbietet uns auf <b>${cheap.r.base}–${cheap.r.dest}</b> mit ${eur(cheap.c.fare)}.`, null, { route: cheap.r.id });
  const h = pl.hedge && pl.hedge.until > W.day ? pl.hedge : null;
  if (h && h.until - W.day <= 14) add('hedgeend', 'info', 'fin', `Die Kerosin-Absicherung läuft am <b>${dateShort(h.until)}</b> aus.`, 'supply');
  if (!h && routes.length && W.fuelPrice > W.fuelAvg() * 1.12) add('fuel', 'warn', 'fin', `Kerosin kostet ${pct(W.fuelPrice / W.fuelAvg() - 1)} mehr als im Jahresmittel – und wir sind nicht abgesichert.`, 'supply');
  const stations = new Set(stationsOf(pl));
  for (const e of W.activeEvents().concat(W.upcomingEvents())) {
    if (e.scope === 'all' || ![...stations].some((c) => W.eventAffects(e, c))) continue;
    add('ev' + (e.id || e.text), e.severity === 'crit' ? 'crit' : e.severity === 'good' ? 'good' : 'warn', 'ops', `${e.start > W.day ? `Ab ${dateShort(e.start)}: ` : ''}${esc(e.text)}`, 'world');
    if (out.filter((x) => x.key.startsWith('ev')).length >= 2) break;
  }
  if (routes.length >= 3 && pl.brand < 0.45 && !pl.marketing) add('brand', 'info', 'strat', `Unsere Marke steht bei ${n0(pl.brand * 100)} von 100 – ein kleines Marketingbudget hilft bei der Buchungswahl.`, 'supply');
  if (!pl.logo && W.day > 3) add('logo', 'info', 'strat', 'Geben Sie Ihrer Airline ein Gesicht: Form, Symbol und Farben für Ihr <b>Logo</b> auswählen.', 'profile');
  if (routes.length && routes.length < 6 && pl.fleet.length) {
    const base = pl.bases[0], d = bestFreeDest(base);
    if (d) add('idea' + d, 'info', 'net', `Noch unbedient ab ${base}: <b>${esc(apName(d))} (${d})</b> hat viel Potenzial.`, null, { plan: d });
  }
  const order = { crit: 0, warn: 1, good: 2, info: 3 }, focus = asstP() ? asstP().focus : null;
  return out.sort((a, b) => order[a.kind] - order[b.kind] || (b.cat === focus) - (a.cat === focus));
}
function hintBtn(x) {
  if (x.route) return `<button class="btn small" data-act="openroute" data-id="${x.route}">Strecke öffnen</button>`;
  if (x.plan) return `<button class="btn small" data-act="planfrom" data-apt="${x.plan}">Planen</button>`;
  if (x.tab) return `<button class="btn small" data-act="tab" data-tab="${x.tab}">Öffnen</button>`;
  return '';
}
function assistantCard() {
  const a = asst(), p = asstP();
  if (!p) return `<div class="card2 assist"><div class="assist-h"><div><b>Assistenz</b><span>noch nicht gewählt</span></div></div><p class="small ink2">Eine Assistenz erinnert an Wichtiges, gibt Tipps und meldet sich bei Ereignissen.</p><button class="btn small primary" data-act="pickassistant">Assistenz wählen</button></div>`;
  const hints = a.rem ? assistantHints().slice(0, 4) : [];
  return `<div class="card2 assist" style="--ac:${p.color}"><div class="assist-h">${avatarSvg(a.id)}<div style="min-width:0"><b>${esc(p.name)}</b><span>${p.role} · Ihre Assistenz</span></div></div>
    <div class="hints">${hints.length ? hints.map((x) => `<div class="hint ${x.kind}"><i></i><div><span class="pre">${p.pre[x.kind]}</span> ${x.html}${hintBtn(x) ? `<div>${hintBtn(x)}</div>` : ''}</div></div>`).join('')
      : `<div class="hint good"><i></i><div>${a.rem ? 'Alles im grünen Bereich. Ich melde mich, wenn etwas ansteht.' : 'Erinnerungen sind ausgeschaltet.'}</div></div>`}</div></div>`;
}
VIEWS.assistant = function viewAssistant() {
  const a = asst(), p = asstP();
  let html = `<h2 class="sec">Assistenz <small>${p ? `${esc(p.name)} · ${p.role}` : 'noch nicht gewählt'}</small></h2>`;
  html += `<p class="small ink2">Ihre Assistenz kennt das ganze Unternehmen. Sie erinnert an offene Aufgaben, gibt Tipps nach ihrem Fachgebiet und meldet sich mit einer Sprechblase, wenn etwas passiert.</p>`;
  html += `<div class="avpick">${Object.entries(ASSISTANTS).map(([k, x]) => `<button data-act="setassistant" data-id="${k}" aria-pressed="${a && a.id === k}" style="--ac:${x.color}">${avatarSvg(k)}<b>${esc(x.name)}</b><span>${x.role}</span><p>${esc(x.desc)}</p></button>`).join('')}</div>`;
  if (a) {
    html += `<div class="card pad stack"><h3>Was ${esc(p.sign)} für Sie tun soll</h3>
      <label class="chk"><input type="checkbox" data-asst="rem" ${a.rem ? 'checked' : ''}> <span><b>Erinnerungen und Tipps</b><br><span class="muted">Hinweise in der Seitenleiste: Personal, ungenutzte Flugzeuge, Verlustbringer, Chancen.</span></span></label>
      <label class="chk"><input type="checkbox" data-asst="mon" ${a.mon ? 'checked' : ''}> <span><b>Ereignisse melden</b><br><span class="muted">Sprechblase bei Streiks, Stürmen, Ausfällen, Entscheidungen und Lieferungen.</span></span></label>
      <label class="chk"><input type="checkbox" data-asst="rep" ${a.rep ? 'checked' : ''}> <span><b>Monatsbericht</b><br><span class="muted">Zum Monatswechsel eine kurze Bilanz mit Ergebnis, Auslastung und Kontostand.</span></span></label></div>`;
    const hints = assistantHints();
    html += `<div class="stack"><h2 class="sec">Alle aktuellen Hinweise <small>${hints.length}</small></h2>${hints.length ? hints.map((x) => `<div class="callout ${x.kind === 'info' ? 'info' : x.kind}"><span>${x.html}</span>${hintBtn(x) ? `<div>${hintBtn(x)}</div>` : ''}</div>`).join('') : '<p class="small muted">Nichts offen.</p>'}</div>`;
  }
  return html;
};
function setAssistant(id, opts = {}) {
  const cur = asst() || {};
  const res = doAction({ type: 'assistant', id, rem: opts.rem ?? cur.rem ?? true, rep: opts.rep ?? cur.rep ?? true, mon: opts.mon ?? cur.mon ?? true });
  return res.ok;
}
function showAssistantPick(onDone = null) {
  let sel = asst() ? asst().id : 'lena';
  const m = modal(`<h1>Wer begleitet Sie?</h1>
    <p class="ink2">Wählen Sie Ihre Assistenz. Sie erinnert an Wichtiges, gibt Tipps aus ihrem Fachgebiet und meldet sich bei Ereignissen. Sie können später unter Unternehmen → Assistenz wechseln.</p>
    <div class="avpick" id="apPick">${Object.entries(ASSISTANTS).map(([k, x]) => `<button type="button" data-id="${k}" aria-pressed="${k === sel}" style="--ac:${x.color}">${avatarSvg(k)}<b>${esc(x.name)}</b><span>${x.role}</span><p>${esc(x.desc)}</p></button>`).join('')}</div>
    <div class="row"><button class="btn primary" id="apOk" style="margin-left:auto">Mit ${esc(ASSISTANTS[sel].sign)} starten</button></div>`);
  m.querySelector('#apPick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]'); if (!b) return; sel = b.dataset.id;
    for (const x of m.querySelectorAll('#apPick [data-id]')) x.setAttribute('aria-pressed', String(x === b));
    $('#apOk').textContent = `Mit ${ASSISTANTS[sel].sign} starten`;
  });
  $('#apOk').addEventListener('click', () => {
    m.hidden = true;
    setAssistant(sel);
    refreshAll();
    greet();
    if (onDone) onDone();
  });
}
const assistantPicker = (prefix, sel = 'lena') => `<div class="stack"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Ihre Assistenz</span>
  <div class="avpick compact" id="${prefix}Asst">${Object.entries(ASSISTANTS).map(([k, x]) => `<button type="button" data-asst-id="${k}" aria-pressed="${k === sel}" style="--ac:${x.color}">${avatarSvg(k)}<b>${esc(x.name)}</b><span>${x.role}</span></button>`).join('')}</div></div>`;
function bindPicker(root, prefix, onSel) {
  const box = root.querySelector('#' + prefix + 'Asst'); if (!box) return;
  box.addEventListener('click', (e) => { const b = e.target.closest('[data-asst-id]'); if (!b) return; for (const x of box.querySelectorAll('[data-asst-id]')) x.setAttribute('aria-pressed', String(x === b)); onSel(b.dataset.asstId); });
}

// Sprechblasen
function bubble(kind, html, opts = {}) {
  const a = asst(), p = asstP(); if (!p) return;
  ui.bubbleQ.push({ kind, html, ...opts });
  if (ui.bubbleQ.length > 4) ui.bubbleQ.splice(0, ui.bubbleQ.length - 4);
  if ($('#bubble').hidden) nextBubble();
  void a;
}
function nextBubble() {
  const box = $('#bubble'), b = ui.bubbleQ.shift(), p = asstP();
  clearTimeout(nextBubble.h);
  if (!b || !p) { box.hidden = true; return; }
  const more = ui.bubbleQ.length;
  box.className = `bubble ${b.kind}`;
  box.innerHTML = `${avatarSvg(asst().id)}<div><b>${esc(p.name)}</b>${b.title ? ` <span class="small muted">· ${esc(b.title)}</span>` : ''}<p>${b.kind && p.pre[b.kind] && !b.noPre ? `<span class="pre">${p.pre[b.kind]}</span> ` : ''}${b.html}</p>
    <div class="row" style="margin-top:6px;gap:6px">${b.btn ? b.btn : ''}${more ? `<button class="btn small" data-bub="next">Weiter (${more})</button>` : ''}</div></div><button class="x" data-bub="close" aria-label="Schließen">×</button>`;
  box.hidden = false;
  const slow = SM.SPEEDS[speedNow()] && SM.SPEEDS[speedNow()].slow;
  if (b.kind !== 'crit') nextBubble.h = setTimeout(() => { box.hidden = true; if (ui.bubbleQ.length) nextBubble(); }, slow ? 30000 : 11000);
}
function onBubbleClick(e) {
  const b = e.target.closest('[data-bub], [data-act]'); if (!b) return;
  if (b.dataset.bub === 'next') { nextBubble(); return; }
  if (b.dataset.bub === 'close') { ui.bubbleQ = []; $('#bubble').hidden = true; return; }
  if (b.dataset.act) { onPaneClick(e); $('#bubble').hidden = true; if (ui.bubbleQ.length) setTimeout(nextBubble, 400); }
}
// ---------- Rundgang zum Start ----------
const tourKey = () => (ui.mp ? `skymarket-tour-${ui.mp.id}-${ui.mp.airlineId}` : `skymarket-tour-solo-${W.seed ?? 0}`);
function tourSeen() { try { return !!localStorage.getItem(tourKey()) || !!localStorage.getItem('skymarket-tour-off'); } catch (e) { return false; } }
/** Beim Start einer Runde: erst der kurze Rundgang, danach die Begrüßung. */
function greet() { if (tourSeen()) sayHello(); else setTimeout(() => startTour(sayHello), 350); }
function tourSteps() {
  const mpGuest = ui.mp && !ui.mp.host, chatOn = !$('#chatBtn').hidden;
  return [
    { t: null, h: `Willkommen bei <b>${esc(W.player.name)}</b>! Ich zeige Ihnen in einer halben Minute, wo Sie was finden.` },
    { t: '#sidebar', h: 'Hier links sehen Sie Ihre Airline auf einen Blick: Kontostand, Tagesergebnis, Auslastung und Pünktlichkeit. Darunter stehen meine Hinweise – „Öffnen“ springt direkt an die richtige Stelle.' },
    { t: '#mapwrap', h: 'Die Karte zeigt Flughäfen, Strecken und Flugzeuge live. <b>Flughafen antippen</b>: Markt ansehen und Strecke planen. <b>Flugzeug antippen</b>: Flugdaten. Zoomen mit Mausrad oder zwei Fingern, rechts die Knöpfe für Ihr Netz und die ganze Welt.' },
    { t: '#nav', h: 'Die sechs Bereiche: <b>Karte</b>, <b>Flotte</b>, <b>Strecken</b>, <b>Finanzen</b>, <b>Markt</b> und <b>Unternehmen</b>. Ein roter Punkt heißt: Dort wartet etwas auf Sie.' },
    { t: '#tabs', h: 'Jeder Bereich hat Unterseiten – in der Flotte etwa Beschaffung und Einsatzplan, im Markt Handel und Weltlage, im Unternehmen Personal und Meilensteine.' },
    { t: '#resizer', h: 'Diesen Rand können Sie ziehen und den Bereich breiter machen – praktisch für große Tabellen. Doppelklick stellt die Standardbreite wieder her.' },
    { t: '.speed', h: mpGuest ? 'Hier sehen Sie Datum, Uhrzeit und Tempo. Das Tempo stellt die Spielleitung ein.' : 'Hier steuern Sie die Zeit: <b>Pause</b>, <b>Weiter</b> und das Tempo. Die Leertaste pausiert ebenfalls.' },
    { t: '#bell', h: `Die Glocke sammelt alle Meldungen.${chatOn ? ' Daneben der <b>Chat</b> mit den Mitspielenden – an alle oder privat.' : ''} Der Kreis davor wechselt zwischen hellem und dunklem Design.` },
    { t: '#userBtn', h: `Im Menü finden Sie ${ui.mp ? 'die Einladung für Mitspielende' : 'Speichern und Neues Spiel'}, die Anleitung, Ihr Logo – und diesen Rundgang noch einmal.` },
    { t: null, h: `Das war's! Mein Vorschlag für den Start: zwei Flugzeuge unter <b>Flotte → Beschaffung</b> leasen, dann unter <b>Strecken → Planung</b> die ersten Ziele anlegen.`, end: true },
  ].filter((x) => { if (!x.t) return true; const el = $(x.t); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; });
}
function startTour(after = null) {
  if (!W || !W.player) return;
  ui.tour = { i: 0, steps: tourSteps(), after };
  try { localStorage.setItem(tourKey(), '1'); } catch (e) { /* egal */ }
  $('#bubble').hidden = true;
  showTourStep();
}
function endTour(go = null) {
  const t = ui.tour; ui.tour = null;
  $('#tour').hidden = true; $('#tour').innerHTML = '';
  if (go) setTab(go);
  if (t && t.after) t.after();
}
function showTourStep() {
  const T = ui.tour, box = $('#tour'); if (!T) return;
  const st = T.steps[T.i], p = asstP(), a = asst(), last = T.i === T.steps.length - 1;
  const el = st.t ? $(st.t) : null;
  if (el && window.innerWidth <= 900) el.scrollIntoView({ block: 'center' });
  box.hidden = false;
  box.innerHTML = `<div class="tour-spot${el ? '' : ' none'}"></div><div class="tour-card" role="dialog" aria-label="Rundgang">
    <div class="tour-head">${a ? avatarSvg(a.id) : ''}<div><b>${p ? esc(p.name) : 'Ihre Assistenz'}</b><span>Kurzer Rundgang · ${T.i + 1} von ${T.steps.length}</span></div></div>
    <p>${st.h}</p>
    <div class="row" style="justify-content:space-between;gap:6px"><button class="btn small" data-tour="skip">${last ? 'Schließen' : 'Überspringen'}</button>
      <span class="row" style="gap:6px">${T.i ? '<button class="btn small" data-tour="back">Zurück</button>' : ''}${st.end ? '<button class="btn small" data-tour="go">Zur Beschaffung</button>' : ''}<button class="btn small primary" data-tour="next">${last ? 'Los geht’s' : 'Weiter'}</button></span></div></div>`;
  placeTour();
}
function placeTour() {
  const T = ui.tour, box = $('#tour'); if (!T || box.hidden) return;
  const st = T.steps[T.i], el = st.t ? $(st.t) : null, spot = box.querySelector('.tour-spot'), card = box.querySelector('.tour-card');
  const vw = window.innerWidth, vh = window.innerHeight, cw = Math.min(360, vw - 24), ch = card.offsetHeight || 200, gap = 14;
  card.style.width = cw + 'px';
  if (!el) { card.style.left = (vw - cw) / 2 + 'px'; card.style.top = Math.max(12, (vh - ch) / 2) + 'px'; return; }
  const r = el.getBoundingClientRect(), pad = st.t === '#resizer' ? 2 : 6;
  Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + 2 * pad + 'px', height: r.height + 2 * pad + 'px' });
  const fits = { below: r.bottom + gap + ch < vh, above: r.top - gap - ch > 0, right: r.right + gap + cw < vw, left: r.left - gap - cw > 0 };
  const big = r.height > vh * 0.5;
  const order = big ? ['right', 'left', 'below', 'above'] : ['below', 'above', 'left', 'right'];
  const side = order.find((k) => fits[k]) || 'center';
  let x, y;
  if (side === 'below') { x = r.left + r.width / 2 - cw / 2; y = r.bottom + gap; }
  else if (side === 'above') { x = r.left + r.width / 2 - cw / 2; y = r.top - gap - ch; }
  else if (side === 'right') { x = r.right + gap; y = r.top + r.height / 2 - ch / 2; }
  else if (side === 'left') { x = r.left - gap - cw; y = r.top + r.height / 2 - ch / 2; }
  else { x = (vw - cw) / 2; y = vh - ch - 16; }
  card.style.left = Math.max(12, Math.min(vw - cw - 12, x)) + 'px';
  card.style.top = Math.max(12, Math.min(vh - ch - 12, y)) + 'px';
}
function onTourClick(e) {
  const b = e.target.closest('[data-tour]'); if (!b || !ui.tour) return;
  const k = b.dataset.tour, T = ui.tour;
  if (k === 'skip') endTour();
  else if (k === 'go') endTour('fleetBuy');
  else if (k === 'back') { T.i = Math.max(0, T.i - 1); showTourStep(); }
  else if (k === 'next') { if (T.i >= T.steps.length - 1) endTour(); else { T.i++; showTourStep(); } }
}

function sayHello() {
  const p = asstP(); if (!p) return;
  const first = assistantHints()[0];
  bubble('good', `${esc(p.hello(W.player.name))}${first ? ` ${first.kind === 'crit' || first.kind === 'warn' ? 'Als Erstes:' : 'Mein erster Tipp:'} ${first.html}` : ''}`, { noPre: true, title: p.role, btn: first ? hintBtn(first) : '' });
}
/** Nach jedem Spieltag (lokal) oder neuem Serverstand: neue Ereignisse melden, Monatsbericht, neue dringende Hinweise. */
function assistantAfterDays(prev) {
  const a = asst(), p = asstP(), pl = W.player; if (!a || !p || !prev) return;
  if (a.mon) {
    const local = new Set((W.events || []).filter((e) => e.scope !== 'all').map((e) => e.text));
    const evs = pl.events.slice(prev.ev).filter((e) => (e.kind === 'crit' || e.kind === 'warn' || e.kind === 'good') && !local.has(e.msg));
    for (const e of pl.events.slice(prev.ev).filter((x) => x.kind === 'deal').slice(-2)) bubble('info', esc(e.msg), { title: 'Handel', btn: '<button class="btn small" data-act="tab" data-tab="trade">Ansehen</button>' });
    const pick = evs.filter((e) => e.kind === 'crit').concat(evs.filter((e) => e.kind === 'warn'), evs.filter((e) => e.kind === 'good')).slice(0, 2);
    for (const e of pick) bubble(e.kind, esc(e.msg), { title: dateShort(e.day) });
    const stations = new Set(stationsOf(pl));
    const news = W.news.slice(prev.news).filter((n) => n.kind === 'crit' && !n.airline).slice(-1);
    for (const n of news) bubble('warn', esc(n.msg), { title: 'Markt' });
    for (const e of W.activeEvents().concat(W.upcomingEvents())) {
      const key = 'ev' + (e.id || e.text);
      if (ui.hintSeen[key] || e.scope === 'all' || ![...stations].some((c) => W.eventAffects(e, c))) continue;
      ui.hintSeen[key] = W.day;
      if (e.severity === 'crit' || e.severity === 'warn' || e.severity === 'good') bubble(e.severity === 'crit' ? 'crit' : e.severity === 'good' ? 'good' : 'warn', esc(e.text), { title: e.start > W.day ? `ab ${dateShort(e.start)}` : 'Lage', btn: '<button class="btn small" data-act="tab" data-tab="world">Weltlage</button>' });
    }
  }
  if (a.rem) {
    for (const h of assistantHints()) {
      if (h.kind !== 'crit' && !(h.kind === 'warn' && /^(idle|gap|runway|loss)/.test(h.key))) continue;
      if (h.key.startsWith('ev')) continue;
      if (ui.hintSeen[h.key] !== undefined && W.day - ui.hintSeen[h.key] < 21) continue;
      ui.hintSeen[h.key] = W.day;
      bubble(h.kind, h.html, { btn: hintBtn(h) });
      break;
    }
  }
  if (a.rep && SM.monthOf(W.day) !== SM.monthOf(prev.day) && pl.ledger.months.length) {
    const lm = pl.ledger.months.at(-1), c = pnlCol(lm.acc), routes = pl.activeRoutes(), s = routes.map((r) => rstats(r, 30));
    const seats = s.reduce((x, y) => x + y.seats, 0), pax = s.reduce((x, y) => x + y.pax, 0);
    const best = routes.map((r, i) => ({ r, d: s[i].db2 / Math.max(1, s[i].n) })).sort((x, y) => y.d - x.d)[0];
    const tip = { fin: c.net < 0 ? 'Wir verbrennen Geld – ich würde die schwächste Strecke hart prüfen.' : 'Solide. Ein Teil des Gewinns gehört als Reserve aufs Konto.',
      ops: `Pünktlichkeit ${playerOtp() === null ? '–' : pct(playerOtp())}, Stimmung ${pct(pl.staff.morale)}.`,
      net: best ? `Stärkste Strecke: ${best.r.base}–${best.r.dest} mit <span class="${sgn(best.d)}">${eur(best.d, { plus: true })}</span> pro Tag.` : 'Zeit für die erste Strecke!',
      strat: `Marke ${n0(pl.brand * 100)}/100, Rating ${pl.rating}.` }[p.focus];
    bubble(c.net < 0 ? 'warn' : 'good', `<b>${MONTHS_L[lm.label.m]}:</b> Ergebnis <span class="${sgn(c.net)}">${eur(c.net, { plus: true })}</span>, Umsatz ${eur(c.rev)}, Auslastung ${seats ? pct(pax / seats) : '–'}, Kontostand <span class="${sgn(netCash(pl))}">${eur(netCash(pl))}</span>. ${tip}`,
      { title: 'Monatsbericht', noPre: true, btn: '<button class="btn small" data-act="tab" data-tab="finance">Finanzen</button>' });
  }
}

// ---------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------
/** Alle Änderungen am Spiel laufen hierüber: lokal sofort, im Mehrspieler zusätzlich an den Server. */
function doAction(act) {
  const res = SM.applyAction(W, W.playerId, act);
  if (!res.ok) { toast(res.msg || 'Nicht möglich.'); return res; }
  if (ui.mp) mpSendAction(act);
  return res;
}
function refreshAll() { W.operableFreq(W.player); buildSchedules(); renderHeader(); renderTabs(); renderMapRoutes(true); renderPane(true); }
function onPaneClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.tagName === 'SELECT') return;
  e.preventDefault();
  const act = b.dataset.act, pl = W.player;
  if (act === 'pltype') { const sel = $('#pl-type'); if (sel) { sel.value = b.dataset.t; sel.dispatchEvent(new Event('change', { bubbles: true })); } return; }
  if (act === 'tour') { startTour(); return; }
  if (act.startsWith('mkt') && onMarketClick(act, b)) return;
  if (act.startsWith('deal') && onDealClick(act, b)) return;
  if ((act.startsWith('asg') || act === 'retype') && onAssignClick(act, b)) return;
  if (act.startsWith('lg') && onLogoClick(act, b)) return;
  if (onHardClick(act, b)) return;
  switch (act) {
    case 'tab': setTab(b.dataset.tab); break;
    case 'invite': showInvite(); break;
    case 'openchat': toggleChat(true); break;
    case 'guide': showGuide(); break;
    case 'pickassistant': showAssistantPick(); break;
    case 'setassistant': if (setAssistant(b.dataset.id)) { refreshAll(); sayHello(); } break;
    case 'selac': ui.sel = { ac: b.dataset.ac }; renderPlanes.last = 0; renderPlaneCard(); break;
    case 'rivflt': ui.rivFilter = b.dataset.v; renderPane(true); break;
    case 'rivals': { if (doAction({ type: 'setRivals', key: b.dataset.v }).ok) toast(`Konkurrenz: ${SM.RIVALS[b.dataset.v].label}`); refreshAll(); break; }
    case 'justacqclose': ui.justAcq = null; renderPane(true); break;
    case 'planwith': { const ja = ui.justAcq || {}; ui.planner = defaultPlanner(null, ja.base); if (ja.type) { ui.planner.type = ja.type; if (!SM.rangeOk(ui.planner.base, ui.planner.dest, ja.type)) ui.planner.dest = bestFreeDest(ui.planner.base); } ui.justAcq = null; ui.selApt = ui.planner.dest; setTab('plan'); renderMapRoutes(true); break; }
    case 'plan': ui.planner = defaultPlanner(ui.selApt && !pl.bases.includes(ui.selApt) ? ui.selApt : null); ui.selApt = ui.planner.dest; setTab('plan'); renderMapRoutes(true); break;
    case 'planfrom': ui.planner = defaultPlanner(b.dataset.apt); ui.selApt = ui.planner.dest; setTab('plan'); renderMapRoutes(true); break;
    case 'closeplan': ui.planner = null; ui.selApt = null; setTab('routes'); renderMapRoutes(true); break;
    case 'suggest': suggestPrice(); break;
    case 'openroute-new': openNewRoute(); break;
    case 'quicklease': { const t = b.dataset.type; const res = doAction({ type: 'acquire', typeId: t, mode: 'lease', base: b.dataset.base }); if (res.ok) toast(`${tl(t)} geleast. Lieferung in ${P.LEASE_DELIVERY_DAYS} Tagen.`); renderHeader(); updateForecast(); break; }
    case 'toggle': ui.expanded = ui.expanded === b.dataset.id ? null : b.dataset.id; ui.confirm = null; ui.viewDirty = true; renderPane(true); renderMapRoutes(true); break;
    case 'openroute': ui.expanded = b.dataset.id; setTab('routes'); renderMapRoutes(true); break;
    case 'applyroute': applyRoute(b.dataset.id); break;
    case 'askclose': ui.confirm = 'close:' + b.dataset.id; renderPane(true); break;
    case 'closeroute': { const r = pl.routes.find((x) => x.id === b.dataset.id); if (r && doAction({ type: 'closeRoute', id: r.id }).ok) { ui.expanded = null; ui.confirm = null; refreshAll(); toast(`${r.base}–${r.dest} eingestellt.`); } break; }
    case 'cancelconfirm': ui.confirm = null; renderPane(true); break;
    case 'acquire': {
      const t = b.dataset.type, mode = b.dataset.mode;
      const base = pl.bases.includes(ui.acqBase) ? ui.acqBase : pl.bases[0];
      const res = doAction({ type: 'acquire', typeId: t, mode, offerId: b.dataset.offer || null, base });
      if (res.ok) { toast(`${tl(t)} ${mode === 'buy' ? 'gekauft' : mode === 'factory' ? 'ab Werk bestellt' : mode === 'flex' ? 'per Flex-Leasing' : 'geleast'}. Lieferung am ${dateShort(res.delivery)} nach ${res.base}.`); ui.justAcq = { type: (W.player.fleet.at(-1) || {}).type_id || t, base: res.base || base, day: W.day }; }
      refreshAll(); break;
    }
    case 'askdispose': ui.confirm = 'dispose:' + b.dataset.id; renderPane(true); break;
    case 'dispose': { if (doAction({ type: 'dispose', acId: b.dataset.id }).ok) { ui.confirm = null; toast('Flugzeug abgegeben.'); } refreshAll(); break; }
    case 'acmi': { const sel = $(`#acmi-${b.dataset.id}`); if (doAction({ type: 'acmi', offerId: b.dataset.id, acId: sel && sel.value }).ok) toast('Charter vereinbart.'); refreshAll(); break; }
    case 'selapt': selectAirport(b.dataset.apt); break;
    case 'marketall': ui.marketAll = !ui.marketAll; renderPane(true); break;
    case 'hire': case 'fire': {
      const n = Math.floor(Number($(`#hire-${b.dataset.key}`).value));
      const res = doAction({ type: act, role: b.dataset.role, group: b.dataset.group || null, count: n });
      if (res.ok) toast(act === 'hire' ? `Eingestellt, Start in ${res.lead} Tagen. Kosten ${eur(res.cost)}.` : `Entlassen. Abfindung ${eur(res.cost)}.`); refreshAll(); break;
    }
    case 'fillstaff': { const res = doAction({ type: 'fillStaff' }); if (res.ok) toast(res.msg); refreshAll(); break; }
    case 'train': { if (doAction({ type: 'train', from: $('#tr-from').value, to: $('#tr-to').value, count: Math.floor(Number($('#tr-n').value)) }).ok) toast('Umschulung gestartet.'); refreshAll(); break; }
    case 'pay': doAction({ type: 'pay', v: Number(b.dataset.v) }); refreshAll(); break;
    case 'hireexpert': { if (doAction({ type: 'hireExpert', cid: b.dataset.id }).ok) toast('Eingestellt. Die Wirkung gilt ab sofort.'); refreshAll(); break; }
    case 'fireexpert': if (doAction({ type: 'fireExpert', id: b.dataset.id }).ok) toast('Freigestellt.'); refreshAll(); break;
    case 'term': { const res = doAction({ type: 'terminal', apt: b.dataset.apt, v: b.dataset.v }); refreshAll(); if (res.ok && res.msg) toast(res.msg); break; }
    case 'hand': doAction({ type: 'handling', apt: b.dataset.apt, v: b.dataset.v }); refreshAll(); break;
    case 'hangar': doAction({ type: 'hangar', apt: b.dataset.apt }); refreshAll(); break;
    case 'askclosebase': ui.confirm = 'closebase:' + b.dataset.apt; renderPane(true); break;
    case 'closebase': { const apt = b.dataset.apt, to = $('#cb-to') ? $('#cb-to').value : null; const res = doAction({ type: 'closeBase', apt, to, force: true }); if (res.ok) { ui.confirm = null; toast(`Basis ${apName(apt)} geschlossen.${res.moved ? ` ${res.moved} Flugzeuge nach ${res.target} verlegt.` : ''}`); } refreshAll(); break; }
    case 'openbase': { const c = $('#newbase').value; if (doAction({ type: 'openBase', apt: c }).ok) toast(`Basis ${apName(c)} eröffnet. Flugzeuge dorthin verlegen oder neu beschaffen.`); refreshAll(); break; }
    case 'hq': ui.hedge[b.dataset.k] = Number(b.dataset.v); renderPane(true); break;
    case 'hedge': { const res = doAction({ type: 'hedge', share: ui.hedge.share, months: ui.hedge.months }); if (res.ok) toast(`Abgesichert zu ${NF3.format(res.price)} €/kg.`); refreshAll(); break; }
    case 'unhedge': doAction({ type: 'unhedge' }); refreshAll(); break;
    case 'ins': doAction({ type: 'insurance', v: b.dataset.v }); refreshAll(); break;
    case 'mkt': doAction({ type: 'marketing', v: Number(b.dataset.v) }); refreshAll(); break;
    case 'study': { const res = doAction({ type: 'study', a: b.dataset.a, b: b.dataset.b }); if (res.ok) toast(`Studie beauftragt, fertig in ${res.days} Tagen.`); refreshAll(); break; }
    case 'lq': ui.loan[b.dataset.k] = Number(b.dataset.v); renderPane(true); break;
    case 'loan': { const res = doAction({ type: 'loan', amount: ui.loan.amount, years: ui.loan.years }); if (res.ok) toast(`Kredit ausgezahlt. Rate ${eur(res.annuity)} pro Monat.`); refreshAll(); break; }
    case 'repay': { if (doAction({ type: 'repay', id: b.dataset.id }).ok) toast('Kredit abgelöst.'); refreshAll(); break; }
    case 'decide': doAction({ type: 'decide', id: b.dataset.id, choice: b.dataset.choice }); refreshAll(); break;
    default: break;
  }
}
function bestFreeDest(base) {
  const pl = W.player, mine = new Set(pl.activeRoutes().map((r) => SM.pairKey(r.base, r.dest)));
  return SM.AP_CODES.filter((d) => d !== base && SM.routeKmOk(base, d) && SM.gcDistanceKm(base, d) < 6000 && !mine.has(SM.pairKey(base, d))).sort((a, b) => {
    const pa = SM.qPot(base, a), pb = SM.qPot(base, b);
    return (pb.leisure + pb.business + pb.vfr) - (pa.leisure + pa.business + pa.vfr);
  })[0];
}
let fcTimer = null;
function onPaneChange(e) {
  const t = e.target, pl = W.player;
  if (onMarketChange(t) || onDealChange(t) || onAssignChange(t) || onLogoChange(t) || onHardChange(t)) return;
  if (t.dataset.actChange === 'move') { if (doAction({ type: 'move', acId: t.dataset.id, base: t.value }).ok) toast(`Umstationiert nach ${t.value} (12.000 € Überführung).`); refreshAll(); return; }
  if (t.id === 'acq-base') { ui.acqBase = t.value; return; }
  if (t.id === 'agency') { doAction({ type: 'agency', on: t.checked }); refreshAll(); return; }
  if (t.id === 'cargo') { doAction({ type: 'cargo', on: t.checked }); refreshAll(); return; }
  if (t.dataset.asst && asst()) { setAssistant(asst().id, { [t.dataset.asst]: t.checked }); refreshAll(); return; }
  onPaneInput(e);
}
function onPaneInput(e) {
  if (!ui.planner || !e.target.id || !e.target.id.startsWith('pl-')) return;
  const changed = readPlanner();
  if (changed || e.target.id === 'pl-type' || e.target.id === 'pl-term') { renderPane(true); renderDraft(); renderMapRoutes(true); return; }
  clearTimeout(fcTimer); fcTimer = setTimeout(updateForecast, 180);
}

// ---------------------------------------------------------------------------
// Neues Spiel, Laden, Spielende
// ---------------------------------------------------------------------------
async function showStart(canClose = false) {
  setSpeed(0);
  const save = await findSave();
  const usable = save && save.v === 4;
  const aiBase = {}; for (const [, s] of Object.entries(SM.AI_SETUP)) aiBase[s[2]] = s[0];
  const sel = { base: 'HAM', diff: 'normal', rivals: 'normal', asst: 'lena', speed: 'x1' };
  const m = $('#modal');
  m.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgT">
    <div><h1 id="dlgT">Sky<span>market</span></h1><p class="ink2">Gründen Sie eine Airline und bauen Sie ein Netz über 118 Flughäfen weltweit auf. Sie beschaffen Flugzeuge, Personal, Kerosin und Terminalflächen selbst. 24 Konkurrenten, die auf jeden Ihrer Schritte reagieren, Konjunkturzyklen, Ölkrisen, Handelskriege, Streiks und Wetter machen es Ihnen schwer.</p></div>
    ${usable ? `<div class="callout info"><b>Gespeichertes Spiel: ${esc(save.name)}</b><span>${dateLong(save.day)} · ${save.where}</span><div class="row"><button class="btn primary" id="dlgLoad">Weiterspielen</button></div></div>` : ''}
    ${save && !usable ? `<div class="callout warn">Ihr Spielstand stammt aus einer älteren Version und passt nicht mehr zur neuen Weltkarte. Bitte neu gründen.</div>` : ''}
    <div class="grid2"><label class="f"><span>Name der Airline</span><input type="text" id="ngName" maxlength="28" value="Hanse Air"></label>
      <label class="f"><span>Kürzel (2 Zeichen)</span><input type="text" id="ngCode" maxlength="2" value="HX" style="text-transform:uppercase"></label></div>
    <div class="stack"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Heimatbasis</span><div class="basegroups">${byRegion(SM.AP_CODES).map(([rg, l]) => `<details ${rg === 'Europa' ? 'open' : ''}><summary>${esc(rg)} <span class="muted">${l.length}</span></summary><div class="basepick">
      ${l.map((c) => `<button type="button" data-base="${c}" aria-pressed="${c === sel.base}"><b>${c}</b><span>${esc(apName(c))}${aiBase[c] ? ' · Basis ' + aiBase[c].split(' ')[0] : ''}</span></button>`).join('')}</div></details>`).join('')}</div>
      <p class="small muted">118 Flughäfen weltweit: die 100 größten nach Passagieren, 14 Flughäfen in Afrika sowie Hamburg, Berlin, Düsseldorf und Wien. Hamburg ist unterversorgt und ein guter Start. In einer KI-Basis treffen Sie vom ersten Tag auf starke Konkurrenz.</p></div>
    <div class="stack"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Schwierigkeit</span><div class="seg wrap" id="ngDiff">
      ${Object.entries(SM.DIFFICULTY).map(([k, d]) => `<button type="button" data-diff="${k}" aria-pressed="${k === sel.diff}">${d.label} · ${n0(d.equity / 1e6)} Mio. €</button>`).join('')}</div>
      <p class="small muted">Zugänglich: mehr Kapital, mildere Zyklen. Realistisch: knappes Kapital, spürbare Krisen. Experte: wenig Kapital, tiefe Krisen.</p></div>
    ${rivalsPicker('ng', sel.rivals)}
    <div class="stack"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Tempo</span><div class="seg wrap" id="ngSpeed">
      ${['h1', 'm10', 'm1', 'x1'].map((k) => `<button type="button" data-speed="${k}" aria-pressed="${k === sel.speed}">${SM.SPEEDS[k].label}</button>`).join('')}</div>
      <p class="small muted">Die langsamen Stufen (1 Stunde, 10 Minuten oder 1 Minute pro Spieltag) sind für längere Partien: Beim nächsten Öffnen holt das Spiel die verpasste Zeit nach. Die schnellen Stufen laufen nur, solange das Spiel offen ist. Das Tempo lässt sich oben jederzeit ändern.</p></div>
    ${assistantPicker('ng', sel.asst)}
    <div class="row">${canClose ? '<button class="btn" id="dlgCancel">Zurück zum Spiel</button>' : ''}${ONLINE ? '<button class="btn" id="dlgOnline">Online spielen</button>' : ''}<button class="btn primary" id="dlgStart" style="margin-left:auto">Airline gründen</button></div>
  </div>`;
  m.hidden = false;
  m.onclick = async (e) => {
    const bb = e.target.closest('[data-base]'); if (bb) { sel.base = bb.dataset.base; for (const x of m.querySelectorAll('[data-base]')) x.setAttribute('aria-pressed', String(x === bb)); }
    const db = e.target.closest('[data-diff]'); if (db) { sel.diff = db.dataset.diff; for (const x of m.querySelectorAll('[data-diff]')) x.setAttribute('aria-pressed', String(x === db)); }
    const rb = e.target.closest('[data-rivals]'); if (rb) { sel.rivals = rb.dataset.rivals; for (const x of m.querySelectorAll('[data-rivals]')) x.setAttribute('aria-pressed', String(x === rb)); }
    const sb = e.target.closest('[data-speed]'); if (sb) { sel.speed = sb.dataset.speed; for (const x of m.querySelectorAll('[data-speed]')) x.setAttribute('aria-pressed', String(x === sb)); }
    const ab = e.target.closest('[data-asst-id]'); if (ab) { sel.asst = ab.dataset.asstId; for (const x of m.querySelectorAll('[data-asst-id]')) x.setAttribute('aria-pressed', String(x === ab)); }
    if (e.target.id === 'dlgCancel') m.hidden = true;
    if (e.target.id === 'dlgOnline') { if (mpState.user) showLobby(); else showAuth(); return; }
    if (e.target.id === 'dlgLoad') {
      try { W = SM.deserialize(await unpack(save)); } catch (err) { toast('Der Spielstand ließ sich nicht lesen.'); return; }
      resetUi(); ui.lastSaveDay = W.day; m.hidden = true;
      const days = resumeLocal(save);
      startWorld();
      if (!asst()) showAssistantPick();
      else if (days > 0) awayReport(days, save.cash);
      else toast('Spielstand geladen.');
    }
    if (e.target.id === 'dlgStart') {
      const name = ($('#ngName').value || 'Hanse Air').trim().slice(0, 28);
      const code = (($('#ngCode').value || 'HX').trim().toUpperCase() + 'XX').slice(0, 2);
      W = SM.newGame({ name, code, base: sel.base, difficulty: sel.diff, rivals: sel.rivals });
      resetUi();
      SM.applyAction(W, W.playerId, { type: 'assistant', id: sel.asst });
      m.hidden = true; startWorld();
      ui.lastSpeed = sel.speed;
      if (SM.SPEEDS[sel.speed].slow) setSpeed(sel.speed); else setSpeed('p');
      saveGame(false);
      greet();
    }
  };
}
function resetUi() {
  ui.sel = null; const pc = $('#planeCard'); if (pc) pc.hidden = true;
  Object.assign(ui, { tab: 'cockpit', expanded: null, planner: null, selApt: null, selBase: null, acqBase: null, lastSaveDay: null, newsSeen: 0, gameOverShown: false, t: 0.25, confirm: null, lastSub: {}, bubbleQ: [], hintSeen: {}, deal: null, asg: null });
  ui.decisionsSeen = W.player.decisions.length;
}
function gameOver() {
  if (ui.gameOverShown) return; ui.gameOverShown = true; setSpeed(0);
  const pl = W.player, endDay = (pl.events.find((e) => e.msg === 'Insolvenz') || { day: W.day }).day, worst = pl.routes.map((r) => ({ r, s: rstats(r, 60) })).sort((a, b) => a.s.db2 - b.s.db2).slice(0, 3);
  const m = $('#modal');
  m.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h1>Insolvenz</h1>
    <p>${esc(pl.name)} hat nach ${endDay} Tagen am ${dateLong(endDay)} den Flugbetrieb eingestellt. Die Kreditlinie war ausgeschöpft und der Kontostand blieb ${P.INSOLVENCY_AFTER_DAYS} Tage negativ.</p>
    ${worst.length ? `<div class="stack"><h3>Die größten Verlustbringer zuletzt</h3><table class="t"><tbody>${worst.map(({ r, s }) => `<tr><td>${r.base}–${r.dest} ${r.freq}x ${tl(r.type_id)}</td><td class="r">${pct(s.lf)} Auslastung</td><td class="r neg">${eur(s.n ? s.db2 / s.n : 0)} pro Tag</td></tr>`).join('')}</tbody></table></div>` : ''}
    <p class="small muted">Typische Ursachen: zu große Flugzeuge für den Markt, Strecken mit starker Bahnkonkurrenz, ungenutzte Flugzeuge, dauerhaft Agenturpersonal, Preiskampf gegen Low-Cost-Airlines, ungesicherter Ölpreisschock.</p>
    <div class="row"><button class="btn primary" id="goNew">${ui.mp ? 'Zurück zur Lobby' : 'Neue Airline gründen'}</button></div></div>`;
  m.hidden = false;
  m.onclick = (e) => { if (e.target.id === 'goNew') { if (ui.mp || ONLINE) { if (mpState.user) showLobby(); else showAuth(); } else showStart(false); } };
}

// ---------------------------------------------------------------------------
// Online: Anmeldung, Lobby, gemeinsames Spiel (Server rechnet, Browser zeigt an)
// ---------------------------------------------------------------------------
const ONLINE = !!window.SKYMARKET_ONLINE;
const mpState = { user: null, ver: '', clock: null, skew: 0, timer: null, busy: false, players: [], lastPing: 0, lastInfo: 0, pendingJoin: null, info: null };
async function api(path, opts = {}) {
  const r = await fetch('/api' + path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: opts.body ? { 'content-type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: 'same-origin', cache: 'no-store' });
  if (opts.raw) return r;
  let data = null; try { data = await r.json(); } catch (e) { /* leer */ }
  if (!r.ok) throw Object.assign(new Error((data && data.error) || `Fehler ${r.status}`), { status: r.status, data });
  return data;
}
async function gunzipToText(buf) {
  const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(ds).text();
}
function baseSelect(id, sel = 'HAM') {
  return `<select id="${id}">${byRegion(SM.AP_CODES).map(([rg, l]) => `<optgroup label="${esc(rg)}">${l.map((c) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${esc(apName(c))} (${c})</option>`).join('')}</optgroup>`).join('')}</select>`;
}
const airlineFields = (prefix, name = '', code = '') => `<div class="grid3">
  <label class="f"><span>Name Ihrer Airline</span><input type="text" id="${prefix}Name" maxlength="28" value="${esc(name)}" placeholder="z. B. Hanse Air"></label>
  <label class="f"><span>Kürzel (2 Zeichen)</span><input type="text" id="${prefix}Code" maxlength="2" value="${esc(code)}" placeholder="HX" style="text-transform:uppercase"></label>
  <label class="f"><span>Heimatbasis</span>${baseSelect(prefix + 'Base')}</label></div>`;
const readAirline = (prefix) => ({ name: ($('#' + prefix + 'Name').value || '').trim(), code: ($('#' + prefix + 'Code').value || '').trim().toUpperCase(), base: $('#' + prefix + 'Base').value });
function modal(html, wide = true) {
  const m = $('#modal');
  m.innerHTML = `<div class="dialog${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false; m.onclick = null;
  return m;
}
function formError(msg) { const e = $('#formErr'); if (e) { e.textContent = msg; e.hidden = !msg; } else toast(msg); }

// ---------- Anleitung (nach der Registrierung, später über „Anleitung“) ----------
const GUIDE = [
  { t: 'Willkommen bei Skymarket', html: () => `
    <div class="acv-box">${acSvg('A20N', { color: 'var(--accent)', code: (mpState.user && mpState.user.name ? mpState.user.name.slice(0, 2).toUpperCase() : 'SM') })}</div>
    <p>Sie gründen eine Airline und bauen ein Streckennetz über 118 Flughäfen weltweit auf. Sie beschaffen Flugzeuge, Personal, Kerosin und Terminalflächen selbst und treten gegen 24 KI-Airlines und bis zu drei Mitspielende an. Märkte, Arbeitskräfte, Leasingflugzeuge und Kerosin teilen sich alle – jede Entscheidung trifft die anderen.</p>
    <div class="gsteps">
      <div><b>Ziel</b><span>Wachsen und Gewinn machen, ohne dass das Geld ausgeht.</span></div>
      <div><b>Gefahr</b><span>Das Konto darf bis zur Kreditlinie ins Minus (Dispo). Ist auch der Dispo 30 Tage lang überzogen, ist die Airline insolvent.</span></div>
      <div><b>Wichtig</b><span>Kontostand und Gewinn sind zweierlei: Kautionen und Käufe kosten sofort Geld, wirken aber nicht als Verlust.</span></div>
      <div><b>Meilensteine</b><span>Erstflug, Passagierzahlen, Gewinnserien, Krisenfest … Unter Unternehmen → Meilensteine sehen alle, wer vorn liegt.</span></div>
    </div>` },
  { t: 'Gemeinsam spielen', html: () => `
    <ol class="glist-num">
      <li><b>Spiel anlegen:</b> In der Lobby auf „Neues Spiel“. Name, optional ein Passwort, Schwierigkeit und Tempo wählen, dann die eigene Airline mit Kürzel und Heimatbasis gründen.</li>
      <li><b>Einladen:</b> Im Spiel oben rechts auf Ihr Kürzel und dann „Mitspielende einladen“. Der <b>Link</b> funktioniert ohne Passwort, der <b>6-stellige Code</b> mit Passwort. Bis zu vier Airlines pro Spiel.</li>
      <li><b>Beitreten:</b> Link öffnen oder in der Lobby Code eingeben bzw. nach dem Spielnamen suchen.</li>
      <li><b>Chat:</b> Über das Sprechblasen-Symbol oben schreiben Sie allen oder privat an eine Airline – zum Verhandeln, Verabreden oder Sticheln.</li>
      <li><b>Zeit:</b> Wer das Spiel anlegt, leitet es und wählt oben das Tempo. Langsame Stufen: 1 Stunde, 10 Minuten oder 1 Minute pro Spieltag – sie laufen auch weiter, wenn niemand online ist, ideal für Partien über Tage. Dazu die schnellen Stufen (1 Tag in 12, 6 oder 3 Sekunden).</li>
    </ol>` },
  { t: 'Die ersten zehn Minuten', html: () => `
    <ol class="glist-num">
      <li><b>Strecke planen:</b> <b>Strecken → Planung</b> oder einen Flughafen auf der Karte antippen. Die Prognose zeigt Passagiere, Umsatz und den Streckenbeitrag (DB2) – „So rechnet die Prognose“ erklärt jede Zahl.</li>
      <li><b>Startpaket:</b> Fehlt ein Flugzeug, schlägt die Planung vor, es gleich mit zu leasen oder gebraucht zu übernehmen; der Einsatz wird automatisch geplant. Personal stellen Sie selbst unter Unternehmen → Personal ein – oder setzen im Startpaket das Häkchen.</li>
      <li><b>Zeit laufen lassen</b> und unter <b>Karte → Dashboard</b> sehen, was verdient, was voll ist und wo Personal fehlt. Ihre Assistenz meldet sich, wenn etwas ansteht.</li>
    </ol>
    <p class="small muted">Gute erste Ziele ab Hamburg: Paris, Barcelona, Wien, Rom, London – jeweils einmal täglich.</p>` },
  { t: 'Karte und Bedienung', html: () => `
    <div class="gsteps">
      <div><b>Zoomen und verschieben</b><span>Mausrad oder zwei Finger, Karte mit gedrückter Maus ziehen. Die Knöpfe rechts springen zu Ihrem Netz oder zur ganzen Welt und blenden die Konkurrenz aus.</span></div>
      <div><b>Flugzeug antippen</b><span>Zeigt Flugnummer, Route, Fortschritt, Passagiere und Tarif. Ihre Flugzeuge sind gelb, Mitspielende farbig, die KI grau.</span></div>
      <div><b>Flughafen antippen</b><span>Öffnet den Markt: Einzugsgebiet, Entgelte, Konkurrenz und die größten Ziele ab Ihrer Basis.</span></div>
      <div><b>Gestrichelte Kreise</b><span>Rot: Streik, Sturm oder Sperrung. Grün: Großereignis mit mehr Nachfrage.</span></div>
    </div>` },
  { t: 'Die Bereiche im Überblick', html: () => `
    <div class="gtabs">
      <div style="border-left:4px solid var(--c-karte)"><b>Karte</b>Dashboard (Auslastung, Profitabilität, Personal, Flotte auf einen Blick), Übersicht, Abflugtafel, Meldungen</div>
      <div style="border-left:4px solid var(--c-flotte)"><b>Flotte</b>Ihre Flugzeuge, Einsatzplan (Flugzeuge festen Strecken zuweisen), Beschaffung, Charter</div>
      <div style="border-left:4px solid var(--c-strecken)"><b>Strecken</b>Ihr Netz mit Preisen und Frequenzen, Planung neuer Strecken</div>
      <div style="border-left:4px solid var(--c-finanzen)"><b>Finanzen</b>Gewinn und Verlust, Bilanz, Kredite und Rating</div>
      <div style="border-left:4px solid var(--c-markt)"><b>Markt</b>Nachfrage und Marktstudien, Wettbewerb, Handel und Kooperationen mit Airlines und Mitspielenden, Marktplatz für Anzeigen an alle, Weltlage mit Konjunktur, Zöllen, Bankenstimmung und Leasingbestand</div>
      <div style="border-left:4px solid var(--c-unternehmen)"><b>Unternehmen</b>Profil und Logo, Meilensteine, Personal (Arbeitsmarkt, Akademien, Abwerben), Stationen, Einkauf (Kerosin, Versicherung, Marketing), Assistenz</div>
    </div>
    <p class="small muted">Links sehen Sie Kontostand, Tagesergebnis, Auslastung und Pünktlichkeit auf einen Blick, darunter die Hinweise Ihrer Assistenz.</p>` },
  { t: 'Tipps für den Erfolg', html: () => `
    <ul class="glist-num tips">
      <li><b>Klein anfangen:</b> zwei Flugzeuge, vier bis fünf Strecken mit einem Flug am Tag. Mehr Flugzeuge erst, wenn die Strecken grün sind.</li>
      <li><b>Preise selbst führen:</b> Es gibt keine Preisautomatik. Ist die Maschine dauerhaft voll, ist der Preis zu niedrig; unter 65 % zu hoch oder die Konkurrenz zu stark.</li>
      <li><b>Erfolg lockt Konkurrenz:</b> Läuft eine Strecke gut, kommen KI-Airlines mit Kampfpreisen und mehr Flügen. Rechnen Sie damit und bauen Sie Kosten- oder Markenvorteile auf.</li>
      <li><b>Alle teilen sich die Märkte:</b> Arbeitsmarkt, Slots, Lieferzeiten und Kerosin – was andere tun, trifft auch Sie. Gehalt unter Marktniveau lädt zum Abwerben ein.</li>
      <li><b>Unter 600 km gewinnt oft die Bahn,</b> und große Flugzeuge auf kleinen Märkten fliegen leer.</li>
      <li><b>Agenturpersonal kostet das 1,6-Fache.</b> Rechtzeitig einstellen, Einstellungen dauern 12–35 Tage.</li>
      <li><b>Reserve halten:</b> Ölpreisschocks, Streiks und Stürme kommen. Kerosin unter Unternehmen → Einkauf absichern, Kreditlinie im Blick behalten.</li>
      <li><b>Handeln statt warten:</b> Unter Markt → Handel kaufen Sie Flugzeuge sofort einsatzbereit, übernehmen Crews ohne Wartezeit, kaufen Slots oder bezahlen Konkurrenten für den Rückzug von Ihrer Strecke – mit KI-Airlines und Mitspielenden.</li>
      <li><b>Zölle und Konjunktur:</b> Handelskriege drücken Geschäftsreisen zwischen den Blöcken und verteuern Flugzeuge vom anderen Block. Die Regionen laufen zeitversetzt – ein Netz über mehrere Regionen streut das Risiko.</li>
      <li><b>Banken sind launisch:</b> Im Abschwung kürzen sie Kreditlinien, der Überhang wird sofort eingezogen. Nicht auf Kante planen.</li>
      <li><b>Eigener Nachwuchs:</b> Eine geförderte Flugschule oder Kabinenakademie liefert jeden Monat Personal am Arbeitsmarkt vorbei – teuer, aber in knappen Zeiten Gold wert.</li>
      <li><b>Berater mit Profil:</b> Tim Kaminski ist der Beste und kostet entsprechend. Luis Perez ist günstiger und erkennt, welches gebrauchte Flugzeug ein Schnäppchen ist und welches eine Gurke. Beide gibt es nur einmal – wer zuerst zugreift.</li>
      <li><b>Neue Muster per Auktion:</b> Frische Typen wie der A321XLR gibt es im ersten Jahr nur über verdeckte Gebote. Wer am meisten bietet, fliegt sie zuerst.</li>
      <li><b>Langstrecke erst später:</b> Großraumjets kosten rund 1 Mio. € Leasing im Monat und brauchen große Märkte.</li>
    </ul>` },
];
function showGuide(onDone = null, page = 0) {
  const g = GUIDE[page], last = page === GUIDE.length - 1;
  const m = modal(`<div class="spread"><span class="small muted">Anleitung · ${page + 1} von ${GUIDE.length}</span><button class="btn small" id="gdSkip">${last ? 'Schließen' : 'Überspringen'}</button></div>
    <h1 class="gtitle">${g.t}</h1>
    <div class="guide">${g.html()}</div>
    <div class="gdots">${GUIDE.map((_, i) => `<button data-gp="${i}" aria-label="Seite ${i + 1}" aria-current="${i === page}"></button>`).join('')}</div>
    <div class="row">${page > 0 ? '<button class="btn" id="gdBack">Zurück</button>' : ''}<button class="btn primary" id="gdNext" style="margin-left:auto">${last ? 'Los geht’s' : 'Weiter'}</button></div>`);
  const done = () => { try { localStorage.setItem('skymarket-guide-seen', '1'); } catch (e) { /* egal */ } if (onDone) onDone(); else m.hidden = true; };
  $('#gdSkip').addEventListener('click', done);
  $('#gdNext').addEventListener('click', () => (last ? done() : showGuide(onDone, page + 1)));
  if (page > 0) $('#gdBack').addEventListener('click', () => showGuide(onDone, page - 1));
  m.querySelectorAll('[data-gp]').forEach((b) => b.addEventListener('click', () => showGuide(onDone, Number(b.dataset.gp))));
}

// ---------- Anmeldung ----------
function showAuth(mode = 'login') {
  setSpeed(0);
  const m = modal(`<div><h1>Sky<span>market</span></h1><p class="ink2">Airline-Wirtschaftssimulation für bis zu vier Personen pro Spiel. Melden Sie sich an oder legen Sie ein Konto an.</p></div>
    <div class="seg" role="tablist"><button data-mode="login" aria-pressed="${mode === 'login'}">Anmelden</button><button data-mode="register" aria-pressed="${mode === 'register'}">Konto anlegen</button></div>
    <form id="authForm" class="stack">
      <label class="f"><span>Benutzername</span><input type="text" id="auUser" autocomplete="username" maxlength="20" required></label>
      <label class="f"><span>Passwort</span><input type="password" id="auPw" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required></label>
      ${mode === 'register' ? '<label class="f"><span>Passwort wiederholen</span><input type="password" id="auPw2" autocomplete="new-password" required></label><p class="small muted">3–20 Zeichen: Buchstaben, Ziffern, _ und -. Passwort mindestens 8 Zeichen.</p>' : ''}
      <p class="small neg" id="formErr" hidden></p>
      <div class="row"><button class="btn" type="button" id="auSolo">Ohne Konto allein spielen</button><button class="btn primary" type="submit" style="margin-left:auto">${mode === 'login' ? 'Anmelden' : 'Konto anlegen'}</button></div>
    </form>`, false);
  m.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => showAuth(b.dataset.mode)));
  $('#auSolo').addEventListener('click', () => showStart(false));
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#auUser').value.trim(), password = $('#auPw').value;
    if (mode === 'register' && password !== $('#auPw2').value) { formError('Die Passwörter stimmen nicht überein.'); return; }
    try { mpState.user = await api(mode === 'login' ? '/login' : '/register', { body: { username, password } }); if (mode === 'register') showGuide(() => showLobby()); else showLobby(); }
    catch (err) { formError(err.message); }
  });
  setTimeout(() => $('#auUser') && $('#auUser').focus(), 50);
}

// ---------- Lobby ----------
async function showLobby(tab = null) {
  stopOnline();
  setSpeed(0);
  if (mpState.pendingJoin) { const pj = mpState.pendingJoin; mpState.pendingJoin = null; return showJoin(pj.code, pj.token); }
  const m = modal(`<div class="spread"><h1>Sky<span>market</span></h1><div class="row small"><span class="muted">Angemeldet als <b>${esc(mpState.user.name)}</b>${mpState.user.admin ? ' <span class="chip me">Admin</span>' : ''}</span><button class="btn small" id="lbLogout">Abmelden</button></div></div>
    <div class="lobby">
      <section class="stack"><div class="spread"><h3>Meine Spiele</h3><button class="btn small primary" id="lbNew">Neues Spiel</button></div><div id="lbMine" class="glist"><p class="small muted">Lade …</p></div></section>
      ${mpState.user.admin ? `<section class="stack" style="grid-column:1/-1"><div class="spread"><h3>Verwaltung · alle Spiele</h3><span class="small muted">Als Admin sehen Sie alle Spiele – auch passwortgeschützte –, treten ohne Passwort bei und können jedes Spiel löschen.</span></div><div id="lbAdmin" class="glist"><p class="small muted">Lade …</p></div></section>` : ''}
      <section class="stack"><h3>Spiel beitreten</h3>
        <form id="lbCodeForm" class="row"><input type="text" id="lbCode" maxlength="6" placeholder="Code, z. B. K7QF2M" style="text-transform:uppercase;flex:1;min-width:140px"><button class="btn" type="submit">Suchen</button></form>
        <form id="lbSearchForm" class="row"><input type="text" id="lbQ" maxlength="40" placeholder="Spielname suchen" style="flex:1;min-width:140px"><button class="btn" type="submit">Finden</button></form>
        <div id="lbResults" class="glist"></div>
        <p class="small muted">Spiele mit Schloss brauchen ein Passwort, außer Sie kommen über einen Einladungslink.</p>
      </section>
    </div>
    <div class="row small"><button class="btn small" id="lbGuide">Anleitung</button><button class="btn small" id="lbSolo">Allein und offline spielen</button><span class="muted">Ein Offline-Spiel bleibt in diesem Browser.</span></div>`);
  $('#lbLogout').addEventListener('click', async () => { try { await api('/logout', { body: {} }); } catch (e) { /* egal */ } mpState.user = null; showAuth(); });
  $('#lbNew').addEventListener('click', showCreate);
  $('#lbSolo').addEventListener('click', () => showStart(false));
  $('#lbGuide').addEventListener('click', () => showGuide(() => showLobby()));
  $('#lbCodeForm').addEventListener('submit', (e) => { e.preventDefault(); const c = $('#lbCode').value.trim().toUpperCase(); if (c) showJoin(c); });
  $('#lbSearchForm').addEventListener('submit', (e) => { e.preventDefault(); lobbySearch($('#lbQ').value.trim()); });
  m.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]'); if (b) enterGame(b.dataset.open);
    const j = e.target.closest('[data-join]'); if (j) showJoin(j.dataset.join);
    const d = e.target.closest('[data-del]');
    if (d) {
      if (!d.dataset.armed) { d.dataset.armed = '1'; d.textContent = 'Wirklich löschen?'; return; }
      api(`/games/${d.dataset.del}/delete`, { body: {} }).then(() => { toast('Spiel gelöscht.'); showLobby(); }).catch((err) => toast(err.message));
    }
  });
  try {
    const mine = await api('/games/mine');
    $('#lbMine').innerHTML = mine.games.length ? mine.games.map(gameCard).join('') : '<p class="small muted">Noch keine Spiele. Legen Sie eines an oder treten Sie einem bei.</p>';
  } catch (e) { if (e.status === 401) return showAuth(); $('#lbMine').innerHTML = `<p class="small neg">${esc(e.message)}</p>`; }
  lobbySearch('');
  if (mpState.user.admin) {
    try { const a = await api('/admin/games'); $('#lbAdmin').innerHTML = a.games.length ? a.games.map(adminCard).join('') : '<p class="small muted">Keine Spiele vorhanden.</p>'; }
    catch (e) { $('#lbAdmin').innerHTML = `<p class="small neg">${esc(e.message)}</p>`; }
  }
}
function adminCard(g) {
  return `<div class="gcard"><div style="min-width:0"><b>${esc(g.name)}</b> ${g.locked ? '<span class="chip">🔒 Passwort</span>' : ''}
    <div class="small muted">Code ${esc(g.code)} · Leitung ${esc(g.hostName || '–')} · ${g.players}/${g.max} Airlines · Tag ${g.day + 1} · angelegt ${new Date(g.created).toLocaleDateString('de-DE')}${g.names ? ' · ' + g.names.map(esc).join(', ') : ''}</div></div>
    <span class="row" style="gap:6px;flex-wrap:nowrap">${g.players >= g.max ? '<span class="chip">voll</span>' : '<span class="chip good">offen</span>'}<button class="btn small danger" data-del="${g.id}">Löschen</button>${g.member ? `<button class="btn small primary" data-open="${g.id}">Öffnen</button>` : g.players < g.max ? `<button class="btn small" data-join="${esc(g.code)}">Beitreten</button>` : ''}</span></div>`;
}
function gameCard(g) {
  const mine = g.member;
  return `<div class="gcard"><div style="min-width:0"><b>${esc(g.name)}</b> ${g.locked ? '<span class="chip" title="Passwortgeschützt">🔒 Passwort</span>' : ''}${g.host ? ' <span class="chip me">Spielleitung</span>' : ''}
    <div class="small muted">Code ${esc(g.code)} · ${g.players}/${g.max} Airlines${g.day !== undefined ? ` · Tag ${g.day + 1}` : ''}${g.names ? ' · ' + g.names.map(esc).join(', ') : ''}</div></div>
    ${mine ? `<span class="row" style="gap:6px;flex-wrap:nowrap">${g.host ? `<button class="btn small danger" data-del="${g.id}">Löschen</button>` : ''}<button class="btn small primary" data-open="${g.id}">Öffnen</button></span>` : g.players >= g.max ? '<span class="chip">voll</span>' : `<button class="btn small" data-join="${esc(g.code)}">Beitreten</button>`}</div>`;
}
async function lobbySearch(q) {
  const box = $('#lbResults'); if (!box) return;
  try { const r = await api('/games/search?q=' + encodeURIComponent(q)); box.innerHTML = r.games.length ? r.games.map(gameCard).join('') : `<p class="small muted">${q ? 'Nichts gefunden.' : 'Gerade keine offenen Spiele.'}</p>`; }
  catch (e) { box.innerHTML = `<p class="small neg">${esc(e.message)}</p>`; }
}
function showCreate() {
  const m = modal(`<h1>Neues Spiel</h1>
    <form id="crForm" class="stack">
      <div class="grid2"><label class="f"><span>Spielname</span><input type="text" id="crGame" maxlength="40" required placeholder="z. B. Freitagsrunde"></label>
        <label class="f"><span>Passwort (optional)</span><input type="password" id="crPw" autocomplete="new-password" placeholder="leer lassen = offen"></label></div>
      <div class="grid2"><label class="f"><span>Schwierigkeit</span><select id="crDiff">${Object.entries(SM.DIFFICULTY).map(([k, d]) => `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${d.label} · ${n0(d.equity / 1e6)} Mio. € Startkapital</option>`).join('')}</select></label>
        <label class="f"><span>Konkurrenz</span><select id="crRivals">${Object.entries(SM.RIVALS).map(([k, r]) => `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${r.label} – ${r.desc}</option>`).join('')}</select></label>
        <label class="f"><span>Tempo</span><select id="crSpeed">${Object.entries(SM.SPEEDS).filter(([, v]) => !v.local).map(([k, v]) => `<option value="${k}" ${k === 'h1' ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label></div>
      ${airlineFields('cra', mpState.user.name.slice(0, 20) + ' Air', mpState.user.name.slice(0, 2).toUpperCase())}
      ${assistantPicker('cr')}
      <p class="small muted">Bis zu vier Personen, jede mit eigener Airline. Sie leiten das Spiel und bestimmen das Tempo. Die langsamen Stufen (1 Std., 10 Min. oder 1 Min. pro Spieltag) laufen auch weiter, wenn niemand online ist – ideal für Partien über Tage. Die schnellen Stufen halten nach einer Minute ohne Spielende an.</p>
      <p class="small neg" id="formErr" hidden></p>
      <div class="row"><button class="btn" type="button" id="crBack">Zurück</button><button class="btn primary" type="submit" style="margin-left:auto">Spiel anlegen</button></div>
    </form>`);
  let pick = 'lena';
  bindPicker(m, 'cr', (id) => { pick = id; });
  $('#crBack').addEventListener('click', () => showLobby());
  $('#crForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = { name: $('#crGame').value.trim(), password: $('#crPw').value, difficulty: $('#crDiff').value, rivals: $('#crRivals').value, speed: $('#crSpeed').value, tz: new Date().getTimezoneOffset(), airline: readAirline('cra') };
    try { const r = await api('/games', { body }); toast(`Spiel angelegt. Code ${r.code}`); mpState.pendingAssistant = pick; enterGame(r.id); }
    catch (err) { formError(err.message); }
  });
}
async function showJoin(code, token = null) {
  let g;
  try { g = await api(`/games/lookup?code=${encodeURIComponent(code)}${token ? '&t=' + encodeURIComponent(token) : ''}`); }
  catch (e) { if (e.status === 401) { mpState.pendingJoin = { code, token }; return showAuth(); } toast(e.message); return showLobby(); }
  if (g.member) return enterGame(g.id);
  const needPw = g.locked && !g.tokenOk && !g.adminOk;
  const taken = new Set(g.codes || []);
  const m = modal(`<h1>${esc(g.name)}</h1>
    <p class="ink2">Code ${esc(g.code)} · ${g.players}/${g.max} Airlines${g.names && g.names.length ? ': ' + g.names.map(esc).join(', ') : ''} · Tag ${g.day + 1}</p>
    ${g.players >= g.max ? '<div class="callout warn">Das Spiel ist voll.</div><div class="row"><button class="btn" id="jnBack">Zurück</button></div>' : `
    <form id="jnForm" class="stack">
      ${needPw ? '<label class="f"><span>Passwort des Spiels</span><input type="password" id="jnPw" autocomplete="off" required></label>' : g.locked ? `<div class="callout good">${g.tokenOk ? 'Einladungslink erkannt' : 'Als Admin'}, kein Passwort nötig.</div>` : ''}
      ${airlineFields('jn', mpState.user.name.slice(0, 20) + ' Air', '')}
      ${assistantPicker('jn')}
      ${taken.size ? `<p class="small muted">Schon vergeben: ${[...taken].map(esc).join(', ')}</p>` : ''}
      <p class="small muted">Sie steigen mit dem vollen Startkapital ein, auch wenn das Spiel schon läuft.</p>
      <p class="small neg" id="formErr" hidden></p>
      <div class="row"><button class="btn" type="button" id="jnBack">Zurück</button><button class="btn primary" type="submit" style="margin-left:auto">Beitreten</button></div>
    </form>`}`);
  $('#jnBack').addEventListener('click', () => showLobby());
  let pick = 'lena';
  bindPicker(m, 'jn', (id) => { pick = id; });
  const f = $('#jnForm');
  if (f) f.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api(`/games/${g.id}/join`, { body: { password: needPw ? $('#jnPw').value : '', invite: token, airline: readAirline('jn') } }); history.replaceState(null, '', location.pathname); mpState.pendingAssistant = pick; enterGame(g.id); }
    catch (err) { formError(err.message); }
  });
}

// ---------- Im Spiel ----------
async function enterGame(id) {
  stopOnline();
  try {
    const info = await api(`/games/${id}/info`);
    mpState.info = info; mpState.players = info.players; mpState.ver = ''; mpState.lastInfo = Date.now();
    ui.mp = { id, airlineId: info.me.airlineId, host: info.me.host, code: info.code, name: info.name, invite: info.invite };
    W = null;
    await mpPoll(true);
    if (!W) throw new Error('Spielstand nicht geladen.');
    $('#modal').hidden = true;
    applyOnlineChrome();
    const seenKey = `skymarket-seen-${id}-${ui.mp.airlineId}`;
    let seen = null; try { seen = JSON.parse(localStorage.getItem(seenKey) || 'null'); } catch (e) { /* egal */ }
    if (mpState.pendingAssistant) { const pa = mpState.pendingAssistant; mpState.pendingAssistant = null; setAssistant(pa); refreshAll(); greet(); }
    else if (!asst()) showAssistantPick();
    else if (seen && W.day > seen.day) awayReport(W.day - seen.day, seen.cash);
    else toast(`Willkommen in „${info.name}“`);
    mpState.seenKey = seenKey;
  } catch (e) { ui.mp = null; toast(e.message); showLobby(); }
}
function applyOnlineChrome() {
  renderSpeed(); renderUserMenu(); renderChatBtn();
  const u = $('#userBtn'); if (u) u.title = ui.mp ? `${ui.mp.name} · Menü` : 'Menü';
}
function stopOnline() { clearTimeout(mpState.timer); mpState.timer = null; ui.mp = null; mpState.clock = null; chatReset(); applyOnlineChrome(); }
/** Fortschritt im laufenden Spieltag nach Serveruhr (0..1), null bei Pause. */
function clockProgress() {
  const c = mpState.clock; if (!c) return null;
  const sp = SM.SPEEDS[SM.speedKey(c.speed)]; if (!sp || !sp.ms) return null;
  const now = Date.now() + mpState.skew, el = Math.min(Math.max(0, now - c.lastTick), sp.slow ? sp.ms * 2 : 60000);
  return (c.carry + el) / sp.ms;
}
function scheduleNext() {
  clearTimeout(mpState.timer);
  if (!ui.mp) return;
  const p = clockProgress(), sp = mpState.clock ? SM.SPEEDS[SM.speedKey(mpState.clock.speed)] : null;
  let wait = 5000;
  if (p !== null && sp && !sp.slow) wait = Math.max(700, Math.min(6000, (Math.max(0, 1 - (p % 1))) * sp.ms + 300));
  else if (p !== null && sp) wait = Math.max(1500, Math.min(8000, (1 - (p % 1)) * sp.ms + 500));
  mpState.timer = setTimeout(() => mpPoll(false), wait);
}
async function mpPoll(first) {
  if (!ui.mp || mpState.busy) { scheduleNext(); return; }
  mpState.busy = true;
  const id = ui.mp.id;
  try {
    const ping = Date.now() - mpState.lastPing > 15000;
    const r = await api(`/games/${id}/state?v=${encodeURIComponent(mpState.ver)}${ping ? '&ping=1' : ''}`, { raw: true });
    if (r.status === 401) { stopOnline(); showAuth(); return; }
    if (r.status === 403 || r.status === 404) { stopOnline(); toast('Kein Zugriff auf dieses Spiel.'); showLobby(); return; }
    if (!r.ok && r.status !== 204) throw new Error(`Server antwortet mit ${r.status}`);
    if (ping) mpState.lastPing = Date.now();
    const c = r.headers.get('x-clock');
    if (c) { mpState.clock = JSON.parse(c); mpState.skew = mpState.clock.now - Date.now(); }
    const cs = Number(r.headers.get('x-chat') || 0);
    if (cs > chat.seq) chatFetch(); else chat.loaded = true;
    if (r.status === 200 && ui.mp && ui.mp.id === id) {
      const txt = await gunzipToText(await r.arrayBuffer());
      applyServerState(JSON.parse(txt), r.headers.get('x-ver') || '', first);
    }
    if (Date.now() - mpState.lastInfo > 20000) { mpState.lastInfo = Date.now(); api(`/games/${id}/info`).then((info) => { mpState.info = info; mpState.players = info.players; renderLegend(); if (ui.tab === 'cockpit') renderPane(); }).catch(() => {}); }
    ui.mpOffline = false;
  } catch (e) { ui.mpOffline = true; }
  finally { mpState.busy = false; renderHeader(); scheduleNext(); }
}
function applyServerState(s, ver, first) {
  const myId = ui.mp.airlineId;
  const prev = W && !first ? { dec: W.player ? W.player.decisions.length : 0, ev: W.player ? W.player.events.length : 0, news: W.news.length, day: W.day } : null;
  W = SM.deserialize(s);
  W.playerId = myId;
  mpState.ver = ver;
  if (first) { const keep = { hintSeen: ui.hintSeen, bubbleQ: [] }; resetUi(); Object.assign(ui, keep); startWorld(); }
  else {
    for (const al of W.list) W.operableFreq(al);
    buildSchedules(); renderHeader(); renderTabs(); renderMapRoutes(); renderPane(); renderDraft();
  }
  const pl = W.player;
  if (!pl) return;
  try { if (mpState.seenKey) localStorage.setItem(mpState.seenKey, JSON.stringify({ day: W.day, cash: netCash(pl) })); } catch (e) { /* egal */ }
  if (pl.status === 'insolvent') { gameOver(); return; }
  if (prev && W.day !== prev.day) {
    if (pl.decisions.length > prev.dec && openDecisions().length && !asst()) toast('Entscheidung nötig: Die Gewerkschaft droht mit Streik.');
    if (asst()) assistantAfterDays(prev);
    else { const crit = pl.events.slice(prev.ev).filter((e) => e.kind === 'crit' || e.kind === 'deal').pop(); if (crit) toast(crit.msg); }
  }
}
async function mpSendAction(act) {
  if (!ui.mp) return;
  const id = ui.mp.id;
  try {
    const r = await api(`/games/${id}/action`, { body: { action: act } });
    if (r && r.ok === false && r.msg) toast(r.msg);
  } catch (e) { toast(e.status === 409 ? 'Der Server war beschäftigt, bitte noch einmal versuchen.' : e.message); }
  setTimeout(() => mpPoll(false), 150);
}
async function mpSetSpeed(k) {
  if (!ui.mp) return;
  if (!ui.mp.host) { toast('Nur die Spielleitung ändert das Tempo.'); return; }
  k = SM.speedKey(k);
  if (k !== 'p') ui.lastSpeed = k;
  try { await api(`/games/${ui.mp.id}/control`, { body: { speed: k, tz: new Date().getTimezoneOffset() } }); mpPoll(false); } catch (e) { toast(e.message); }
}
function showInvite() {
  const link = `${location.origin}${location.pathname}?join=${encodeURIComponent(ui.mp.code)}&t=${encodeURIComponent(ui.mp.invite)}`;
  const m = modal(`<h1>Mitspielende einladen</h1>
    <p class="ink2">Bis zu vier Airlines pro Spiel. Wer den Link öffnet und sich anmeldet, kommt ohne Passwort hinein. Mit dem Code allein ist das Passwort nötig, falls Sie eines gesetzt haben.</p>
    <label class="f"><span>Einladungslink</span><input type="text" id="invLink" readonly value="${esc(link)}"></label>
    <label class="f"><span>Code</span><input type="text" readonly value="${esc(ui.mp.code)}" style="font-family:var(--f-mono);font-size:18px;letter-spacing:.15em"></label>
    <div class="stack small"><b>Im Spiel</b>${mpState.players.map((p) => `<div class="row"><span class="sw" style="background:${colorOfId(p.airlineId)}"></span> ${esc(p.airlineName)} <span class="muted">(${esc(p.name)})</span>${p.online ? ' <span class="chip good">online</span>' : ''}${p.host ? ' <span class="chip me">Spielleitung</span>' : ''}</div>`).join('')}</div>
    <div class="row"><button class="btn" id="invClose">Schließen</button><button class="btn primary" id="invCopy" style="margin-left:auto">Link kopieren</button></div>`, false);
  $('#invClose').addEventListener('click', () => { m.hidden = true; });
  $('#invCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); toast('Link kopiert.'); } catch (e) { $('#invLink').select(); toast('Bitte markierten Link kopieren.'); } });
}
function colorOfId(id) { const al = W && W.airlines[id]; return al ? colorOf(al) : 'var(--ink-3)'; }
function playersCard() {
  if (!ui.mp) return '';
  const rows = W.humans.map((al) => {
    const p = mpState.players.find((x) => x.airlineId === al.id) || {};
    return `<tr><td><span class="lgi">${logoSvg(al, 18)}</span> ${esc(al.name)}${al.id === W.playerId ? ' <span class="chip me">Sie</span>' : ''}${al.status === 'insolvent' ? ' <span class="chip crit">insolvent</span>' : ''}</td><td class="small muted">${esc(p.name || '')}${p.online ? ' · online' : ''}</td><td class="r">${al.fleet.length} Flz.</td><td class="r">${al.activeRoutes().length} Str.</td></tr>`;
  }).join('');
  return `<div class="stack"><div class="spread"><h2 class="sec">Mitspielende <small>${esc(ui.mp.name)} · Code ${esc(ui.mp.code)}</small></h2><span class="row" style="gap:6px"><button class="btn small" data-act="openchat">Chat</button><button class="btn small" data-act="invite">Einladen</button></span></div><table class="t"><tbody>${rows}</tbody></table>
    ${mpState.clock ? `<p class="small muted">Tempo: ${SM.SPEEDS[SM.speedKey(mpState.clock.speed)].label}${ui.mp.host ? ' · Sie leiten das Spiel und stellen das Tempo oben ein.' : ' · Die Spielleitung stellt das Tempo ein.'}${ui.mpOffline ? ' · <span class="neg">Verbindung unterbrochen</span>' : ''}</p>` : ''}</div>`;
}
async function onlineBoot() {
  const q = new URLSearchParams(location.search);
  if (q.get('join')) mpState.pendingJoin = { code: q.get('join').toUpperCase(), token: q.get('t') };
  try { mpState.user = await api('/me'); } catch (e) { mpState.user = null; }
  if (mpState.user) showLobby(); else showAuth(mpState.pendingJoin ? 'register' : 'login');
}

// ---------------------------------------------------------------------------
// Zeit
// ---------------------------------------------------------------------------
function stepDay(quiet = false) {
  const pl = W.player, prev = { ev: pl.events.length, news: W.news.length, day: W.day, dec: pl.decisions.length };
  W.step();
  if (quiet) return prev;
  const slow = SM.SPEEDS[ui.speedKey] && SM.SPEEDS[ui.speedKey].slow;
  if (SM.monthOf(W.day) !== SM.monthOf(prev.day) || slow) saveGame(false);
  buildSchedules();
  renderHeader(); renderTabs(); renderMapRoutes(); renderPane();
  if (pl.status === 'insolvent') { gameOver(); return prev; }
  const newDec = pl.decisions.length > ui.decisionsSeen && openDecisions().length;
  ui.decisionsSeen = pl.decisions.length;
  if (newDec && !slow) { setSpeed('p'); setTab('cockpit'); }
  if (asst()) assistantAfterDays(prev);
  else {
    if (newDec) toast('Entscheidung nötig: Die Gewerkschaft droht mit Streik.');
    const crit = pl.events.slice(prev.ev).find((e) => e.kind === 'crit' || e.kind === 'deal') || W.news.slice(prev.news).find((n) => n.kind === 'crit');
    if (crit) toast(crit.msg);
  }
  return prev;
}
const localDayNum = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
const wallFrac = () => { const d = new Date(); return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000) / 86400; };
/** Lokales Langzeitspiel: verpasste Zeit seit dem letzten Speichern nachholen (höchstens 400 Tage). */
function resumeLocal(save) {
  const key = SM.speedKey(save.speed || 'p');
  ui.lastSpeed = key !== 'p' ? key : null;
  ui.t = typeof save.t === 'number' ? save.t : 0.25;
  const sp = SM.SPEEDS[key];
  if (!save.running || !sp || !sp.slow || !save.savedAt) { ui.speedKey = 'p'; return 0; }
  const el = Math.max(0, Date.now() - Date.parse(save.savedAt));
  let prog = ui.t + el / sp.ms, days = Math.min(400, Math.floor(prog));
  let n = 0;
  for (; n < days && W.player.status !== 'insolvent'; n++) W.step();
  ui.decisionsSeen = W.player.decisions.length;
  ui.speedKey = key;
  ui.t = key === 'rt' ? wallFrac() : prog % 1;
  ui.rtDay = localDayNum();
  return n;
}
function awayReport(days, cash0) {
  const pl = W.player, cash = netCash(pl), d = typeof cash0 === 'number' ? cash - cash0 : null;
  const txt = `Willkommen zurück! Seit Ihrem letzten Besuch sind <b>${n0(days)} ${days === 1 ? 'Tag' : 'Tage'}</b> vergangen. Kontostand ${eur(cash)}${d !== null ? ` (${eur(d, { plus: true })})` : ''}.`;
  if (asst()) {
    const h = assistantHints()[0];
    bubble(d !== null && d < 0 ? 'warn' : 'good', txt + (h ? ` Als Nächstes: ${h.html}` : ''), { noPre: true, title: 'Während Sie weg waren', btn: h ? hintBtn(h) : '<button class="btn small" data-act="tab" data-tab="news">Meldungen</button>' });
  } else toast(`${days} Tage vergangen · Kontostand ${eur(cash)}`);
}
let lastTs = null;
function frame(ts) {
  if (W) {
    const dt = lastTs === null ? 0 : Math.min(0.25, (ts - lastTs) / 1000);
    if (ui.mp) { const pr = clockProgress(); if (pr !== null) ui.t = Math.min(0.999, pr); }
    else if (ui.speedKey !== 'p' && $('#modal').hidden) {
      const sp = SM.SPEEDS[ui.speedKey];
      if (ui.speedKey === 'rt') {
        // Echtzeit: Spieluhr = Ortszeit; Mitternacht schließt den Tag
        ui.t = wallFrac();
        const today = localDayNum();
        if (ui.rtDay === undefined) ui.rtDay = today;
        let guard = 0;
        while (ui.rtDay < today && guard++ < 30) { ui.rtDay++; stepDay(); }
        if (ui.rtDay < today) ui.rtDay = today;
      } else {
        // Hintergrund-Tabs drosseln requestAnimationFrame: bei langsamen Stufen die echte Zeit nehmen
        const realDt = sp.slow ? (Date.now() - (frame.wall || Date.now())) / 1000 : dt;
        ui.t += realDt * 1000 / sp.ms;
        let guard = 0;
        while (ui.t >= 1 && guard++ < 30) { ui.t -= 1; if (!sp.slow && ui.t > 0.5) ui.t = 0; stepDay(); }
      }
    }
    frame.wall = Date.now();
    renderPlanes();
    const spx = SM.SPEEDS[speedNow()], bms = spx && spx.ms ? Math.max(600, Math.min(3000, spx.ms / 48)) : 3000;
    if (ui.tab === 'departures' && (!frame.board || ts - frame.board > bms) && !editing()) { frame.board = ts; renderPane(); }
  }
  lastTs = ts;
  requestAnimationFrame(frame);
}
function startWorld() {
  for (const al of W.list) W.operableFreq(al);
  buildSchedules();
  fitCodes(homeCodes());
  renderHeader(); renderTabs(); renderMapRoutes(true); renderPane(true); renderDraft();
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
function boot(hotData) {
  try { const th = localStorage.getItem('skymarket-theme'); if (th === 'dark' || th === 'light' || th === 'auto') { /* gesetzt */ } else localStorage.setItem('skymarket-theme', 'auto'); } catch (e) { /* ohne Speicher */ }
  document.documentElement.dataset.theme = 'dark';
  initMap();
  $('#pane').addEventListener('click', onPaneClick);
  $('#pane').addEventListener('change', onPaneChange);
  $('#pane').addEventListener('input', (e) => { if (e.target.type === 'number') onPaneInput(e); });
  $('#gPlanes').addEventListener('pointerdown', (e) => { const g = e.target.closest('.plane'); if (!g) return; e.stopPropagation(); ui.sel = { ac: g.dataset.ac }; $('#aptCard').hidden = true; renderPlanes.last = 0; renderPlaneCard(); });
  $('#planeCard').addEventListener('click', (e) => { const b = e.target.closest('[data-pc]'); if (!b) return; if (b.dataset.pc === 'close') { ui.sel = null; $('#planeCard').hidden = true; } else { ui.expanded = b.dataset.id; setTab('routes'); renderMapRoutes(true); } });
  $('#sidebar').addEventListener('click', onPaneClick);
  $('#bubble').addEventListener('click', onBubbleClick);
  $('#tour').addEventListener('click', onTourClick);
  window.addEventListener('resize', placeTour);
  document.addEventListener('keydown', (e) => { if (!ui.tour) return; if (e.key === 'Escape') endTour(); else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); $('#tour [data-tour="next"]').click(); } else if (e.key === 'ArrowLeft' && ui.tour.i) { ui.tour.i--; showTourStep(); } }, true);
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  initResizer();
  $('#nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sec]'); if (!b) return;
    const sec = SECTIONS.find((x) => x.key === b.dataset.sec);
    setTab((ui.lastSub && ui.lastSub[sec.key]) || sec.tabs[0][0]);
  });
  const play = () => speedChosen(ui.lastSpeed || (ui.mp ? 'h1' : 'x1'));
  $('#btnPause').addEventListener('click', () => speedChosen('p'));
  $('#btnPlay').addEventListener('click', play);
  $('#speedSel').addEventListener('change', (e) => speedChosen(e.target.value));
  $('#bell').addEventListener('click', () => setTab('news'));
  $('#themeBtn').addEventListener('click', cycleTheme);
  $('#chatBtn').addEventListener('click', () => toggleChat());
  $('#chatPanel').addEventListener('click', (e) => { if (e.target.closest('[data-chat=close]')) toggleChat(false); });
  $('#chatPanel').addEventListener('change', (e) => { if (e.target.id === 'chatTo') chat.to = e.target.value; });
  $('#chatPanel').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#chatText'); const v = i.value; i.value = ''; chatSend(v); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && chat.open) toggleChat(false); });
  applyTheme();
  $('#userBtn').addEventListener('click', (e) => { e.stopPropagation(); renderUserMenu(); $('#userMenu').hidden = !$('#userMenu').hidden; });
  $('#userMenu').addEventListener('click', (e) => { const b = e.target.closest('[data-um]'); if (b) onUserMenu(b.dataset.um); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#userMenu')) $('#userMenu').hidden = true; });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-acinfo]'); if (!b) return; e.preventDefault(); e.stopPropagation(); showAcInfo(b.dataset.acinfo); }, true);
  document.addEventListener('keydown', (e) => { if (e.key !== 'Enter') return; const b = e.target.closest && e.target.closest('[data-acinfo]'); if (!b) return; e.preventDefault(); e.stopPropagation(); showAcInfo(b.dataset.acinfo); }, true);
  $('#aptCard').addEventListener('click', (e) => {
    const sel = e.target.closest('[data-aptsel]'); if (sel) { e.preventDefault(); selectAirport(sel.dataset.aptsel); return; }
    const b = e.target.closest('[data-apc]'); if (!b) return;
    const k = b.dataset.apc;
    if (k === 'close') { $('#aptCard').hidden = true; ui.aptCard = null; return; }
    if (k === 'plan') { ui.planner = defaultPlanner(b.dataset.apt); ui.selApt = ui.planner.dest; setTab('plan'); renderMapRoutes(true); $('#aptCard').hidden = true; return; }
    if (k === 'market') { ui.selApt = b.dataset.apt; setTab('market'); renderMapRoutes(true); }
  });
  $('#flightFilter').addEventListener('change', (e) => { ui.flightFilter = e.target.value; renderMapRoutes(true); });
  $('#tglAi').addEventListener('click', (e) => { ui.showAi = !ui.showAi; e.currentTarget.setAttribute('aria-pressed', String(ui.showAi)); renderMapRoutes(true); });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName) && $('#modal').hidden) { e.preventDefault(); if (ui.mp && !ui.mp.host) return; if (speedNow() === 'p') play(); else speedChosen('p'); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && W && !ui.mp && SM.SPEEDS[ui.speedKey] && SM.SPEEDS[ui.speedKey].slow) frame.wall = frame.wall || Date.now(); });
  try { window.claude?.hot?.snapshot?.(() => ({ save: W ? SM.serialize(W) : null, tab: ui.tab })); } catch (e) { /* ohne Hot-Reload */ }
  if (hotData && hotData.save) {
    try { W = SM.deserialize(hotData.save); resetUi(); ui.tab = TAB_ALIAS[hotData.tab] || hotData.tab || 'cockpit'; if (!VIEWS[ui.tab]) ui.tab = 'cockpit'; startWorld(); } catch (e) { W = null; }
  }
  if (!W) {
    // Startbild: Vorschau-Welt hinter dem Dialog, damit die Karte lebt
    W = SM.newGame({ name: 'Hanse Air', code: 'HX', base: 'HAM', seed: 42 });
    resetUi();
    startWorld();
    if (ONLINE) onlineBoot(); else showStart(false);
  }
  applyOnlineChrome();
  requestAnimationFrame(frame);
  if (location.hash === '#debug') window.skymarketDebug = { world: () => W, days: (n) => { for (let i = 0; i < n; i++) stepDay(); }, ui };
}
if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {});
})();
