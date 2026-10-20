(() => {
'use strict';
const P = SM.P, MAP = window.SKYMAP;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svgNS = 'http://www.w3.org/2000/svg';

let W = null;                       // Spielwelt
const ui = { tab: 'cockpit', speed: 0, t: 0.25, expanded: null, planner: null, selApt: null, showAi: true, acqBase: null,
  lastSaveDay: null, saveMode: 'lokal', confirm: null, routesSig: '', newsSeen: 0, gameOverShown: false, hedge: { share: 0.5, months: 6 },
  loan: { amount: 2e6, years: 5 }, decisionsSeen: 0, fleetView: 'own' };

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
const n1 = (x) => NF1.format(x);
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTHS_L = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function dateParts(day) {
  const y = 2027 + Math.floor(day / 365), doy = ((day % 365) + 365) % 365, m = SM.monthOf(doy);
  return { y, m, d: doy - SM.MONTH_STARTS[m] + 1, wd: WD[((day % 7) + 7) % 7] };
}
const dateShort = (day) => { const p = dateParts(day); return `${p.d}. ${MONTHS[p.m]}`; };
const dateLong = (day) => { const p = dateParts(day); return `${p.wd}, ${p.d}. ${MONTHS[p.m]} ${p.y}`; };
const apName = (c) => P.AIRPORTS[c].name;
const colorOf = (al) => (al.id === W.playerId ? 'var(--accent)' : al.archetype ? `var(--ai${al.color})` : `var(--hum${al.color || 1})`);
const svcLabel = (s) => P.SERVICE[s].label;
const bufLabel = (b) => P.BUFFER_POLICY[b].label;
const modeLabel = (a) => (a.owned ? 'Eigentum' : a.flex ? 'Flex-Leasing' : 'Leasing');
const cpi = () => W.macro.cpi;
const tl = (id) => (P.AIRCRAFT_TYPES[id] ? P.AIRCRAFT_TYPES[id].label : id);
const acName = (id) => (W.playerId && id.startsWith(W.playerId + '-') ? (W.player.code || 'SM') + id.slice(W.playerId.length) : id);
const LEVEL = ['', 'Junior', 'Senior', 'Experte'];
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
    const meta = { v: 4, day: W.day, name: W.player.name, savedAt: new Date().toISOString() };
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
    <g id="gWorld"><path class="land" d="${MAP.land}"/><path class="borders" d="${MAP.borders}"/><g id="gRoutes"></g><g id="gDraft"></g><g id="gTrails"></g></g>
    <g id="gApts"></g><g id="gPlanes"></g>`;
  const a = mapArea(); view.w = a.w; view.h = a.h; svg.setAttribute('viewBox', `0 0 ${a.w} ${a.h}`);
  window.addEventListener('resize', fitMap);
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
      const mine = stations.has(c), base = pl.bases.includes(c), sel = ui.selApt === c, ev = aptEventState(c);
      const r = 2.6 + Math.sqrt(a.pax || 20) * 0.32;
      let label = mine || sel || (a.rank || 999) <= rankLim || (!a.rank && k >= 1.6);
      if (label && !mine && !sel && placed.some(([px, py]) => Math.abs(px - x) < 34 && Math.abs(py - y) < 13)) label = false;
      if (label) placed.push([x, y]);
      const city = (k >= 2.6 && label) || base || sel;
      const left = x > view.w - mapArea().pw - 120;
      const tx = left ? x - r - 5 : x + r + 5, anchor = left ? 'end' : 'start';
      html += `<g class="apt${base ? ' base' : ''}${mine ? ' mine' : ''}${sel ? ' sel' : ''}${ev === 'bad' ? ' evbad' : ev === 'good' ? ' evgood' : ''}" data-apt="${c}" tabindex="0" role="button" aria-label="${esc(a.name)} (${c})">
        <circle class="hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 7).toFixed(1)}"/><circle class="halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 5).toFixed(1)}"/><circle class="ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>
        ${label ? `<text x="${tx.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="${anchor}">${c}</text>` : ''}${city ? `<text class="city" x="${tx.toFixed(1)}" y="${(y + 16).toFixed(1)}" text-anchor="${anchor}">${esc(a.name)}</text>` : ''}</g>`;
      if (shown) break;
    }
  }
  $('#gApts').innerHTML = html;
  ui.viewDirty = false;
}
function renderMapRoutes(force = false) {
  const evs = SM.AP_CODES.map(aptEventState).join(',');
  const sig = W.list.map((al) => al.activeRoutes().map((r) => r.id + r.freq + (r.flyingToday || 0)).join(',')).join('|') + ui.showAi + ui.expanded + ui.selApt + evs + W.player.bases.join();
  if (!force && sig === ui.routesSig) return;
  ui.routesSig = sig;
  let ai = '', mine = '';
  const seen = new Set();
  for (const al of W.list) {
    const me = al.id === W.playerId;
    if (!me && !ui.showAi) continue;
    for (const r of al.activeRoutes()) {
      const k = al.id + [r.base, r.dest].sort().join('');
      if (seen.has(k)) continue; seen.add(k);
      const d = lineD(gcLine(r.base, r.dest));
      if (!me && !al.archetype) { mine = `<path class="rt hu" d="${d}" stroke="${colorOf(al)}"/>` + mine; continue; }
      if (me) mine += `<path class="rt me${(r.flyingToday || 0) < r.freq ? ' wait' : ''}${ui.expanded === r.id ? ' hl' : ''}" d="${d}"/>`;
      else ai += `<path class="rt ai" d="${d}" stroke="${colorOf(al)}"/>`;
    }
  }
  $('#gRoutes').innerHTML = ai + mine;
  ui.viewDirty = true;
  renderLegend();
}
function renderDraft() {
  const p = ui.planner, g = $('#gDraft');
  if (!p || !p.dest || ui.tab !== 'routes') { g.innerHTML = ''; return; }
  g.innerHTML = `<path class="rt draft" d="${lineD(gcLine(p.base, p.dest))}"/>`;
}
function renderLegend() {
  const n = W.list.filter((al) => al.archetype && al.status !== 'insolvent').length;
  const items = [`<span><i style="background:var(--accent)"></i>${esc(W.player.name)}</span>`].concat(W.humans.filter((h) => h.id !== W.playerId).map((h) => `<span><i style="background:${colorOf(h)}"></i>${esc(h.name)}</span>`));
  if (ui.showAi) items.push(`<span><i style="background:var(--plane-ai)"></i>${n} Konkurrenten</span>`);
  const ev = SM.AP_CODES.some((c) => aptEventState(c) === 'bad') ? '<span><i class="dot crit"></i>Störung</span>' : '';
  const evg = SM.AP_CODES.some((c) => aptEventState(c) === 'good') ? '<span><i class="dot good"></i>Großereignis</span>' : '';
  $('#legend').innerHTML = `<div class="row">${items.join('')}${ev}${evg}</div>`;
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
    if (!s.me && !ui.showAi) continue;
    const sel = ui.sel && ui.sel.ac === s.ac.id;
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
  box.innerHTML = `<div class="pc-head${me ? '' : ' ai'}"><div><b>${flightNo(al, l.r, l.dir)}</b><small>${esc(al.name)}</small></div><button data-pc="close" aria-label="Schließen">×</button></div>
    ${acSvg(a.type_id, { color, code: me ? al.code : al.id.slice(0, 2), ink: me ? 'var(--on-accent)' : '#fff' })}
    <div class="pc-route"><div><b>${l.a}</b><span>${apName(l.a)}</span></div><i>✈</i><div><b>${l.b}</b><span>${apName(l.b)}</span></div></div>
    <div class="pc-prog"><i style="width:${(f * 100).toFixed(0)}%"></i></div>
    <div class="pc-times"><span>${hhmm((l.t0 % 24 + 24) % 24)}</span><span>${ground ? phase : `${n0(Math.max(0, (1 - f) * (l.t1 - l.t0)) * 60)} Min. verbleibend`}</span><span>${hhmm((l.t1 % 24 + 24) % 24)}</span></div>
    <dl><div><dt>Flugzeug</dt><dd>${t.label}</dd></div><div><dt>Kennung</dt><dd>${me ? acName(a.id) : a.id}</dd></div>
      <div><dt>Status</dt><dd>${ground ? 'am Boden' : phase}</dd></div><div><dt>Geschwindigkeit</dt><dd>${ground ? '–' : n0(f < 0.14 || f > 0.86 ? t.speed_kmh * 0.7 : t.speed_kmh + 40) + ' km/h'}</dd></div>
      <div><dt>Passagiere</dt><dd>${pax === null ? '–' : `${pax} / ${seatsDir}`}</dd></div><div><dt>Distanz</dt><dd>${n0(SM.gcDistanceKm(l.a, l.b))} km</dd></div>
      <div><dt>Alter</dt><dd>${n1(al.acAge(a, W.day))} Jahre</dd></div><div><dt>Tarif</dt><dd>${eur(l.dir === 'out' ? l.r.fare_out : l.r.fare_in)}</dd></div></dl>
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
function renderHeader() {
  const pl = W.player, bs = SM.balanceSheet(pl), p = dateParts(W.day);
  $('#tail').textContent = pl.code || 'SM';
  $('#brandName').textContent = pl.name;
  $('#brandSub').textContent = `${pl.stage().label} · Basis ${pl.bases.join(', ')}`;
  $('#date').innerHTML = `${p.wd}, ${p.d}. ${MONTHS[p.m]} ${p.y}<small>Tag ${W.day + 1}${ui.lastSaveDay !== null ? ` · gespeichert ${dateShort(ui.lastSaveDay)}` : ''}</small>`;
  const mr = monthResult(pl);
  $('#kpis').innerHTML = `
    <div class="kpi"><b class="${bs.cash < 0 ? 'neg' : ''}">${eur(bs.cash)}</b><span>Kontostand</span></div>
    <div class="kpi"><b>${eur(bs.equity)}</b><span>Eigenkapital</span></div>
    <div class="kpi"><b class="${mr < 0 ? 'neg' : 'pos'}">${eur(mr, { plus: true })}</b><span>Ergebnis ${MONTHS[p.m]}</span></div>
    <div class="kpi"><b>${NF2.format(W.fuelPrice)} €</b><span>Kerosin je kg</span></div>
    <div class="kpi"><b>${pl.rating}</b><span>Rating</span></div>`;
  const sp = ui.mp ? (mpState.clock ? mpState.clock.speed : 0) : ui.speed;
  for (const b of document.querySelectorAll('.speed button')) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === sp));
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
// Tabs
// ---------------------------------------------------------------------------
const TABS = [['cockpit', 'Cockpit'], ['routes', 'Strecken'], ['fleet', 'Flotte'], ['staff', 'Personal'], ['stations', 'Stationen'], ['supply', 'Einkauf'],
  ['market', 'Markt'], ['finance', 'Finanzen'], ['world', 'Welt'], ['news', 'Meldungen']];
function openDecisions() { return W.player.decisions.filter((d) => !d.resolved); }
function renderTabs() {
  const pl = W.player;
  const unread = W.news.length + pl.events.length > ui.newsSeen && ui.tab !== 'news';
  const warn = openDecisions().length > 0 || pl.events.some((e) => e.kind === 'crit' && e.day >= W.day - 3);
  const cov = pl.staff.cov, staffWarn = cov && (Object.values(cov.cancel).some((x) => x > 0) || cov.agencyH > 0);
  const evWarn = W.activeEvents().some((e) => e.severity === 'crit');
  const dot = { news: unread, cockpit: warn, staff: staffWarn, world: evWarn };
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${ui.tab === k}">${l}${dot[k] ? '<span class="dot"></span>' : ''}</button>`).join('');
}
function setTab(t) {
  ui.tab = t; ui.confirm = null;
  if (t === 'news') ui.newsSeen = W.news.length + W.player.events.length;
  renderTabs(); renderPane(true); renderDraft();
}
function editing() { const a = document.activeElement; return a && $('#pane').contains(a) && /INPUT|SELECT/.test(a.tagName); }
const VIEWS = {};
function renderPane(force = false) {
  if (!force && editing()) return;
  const pane = $('#pane'), st = pane.scrollTop;
  pane.innerHTML = VIEWS[ui.tab]();
  if (!force) pane.scrollTop = st;
  if (ui.tab === 'routes' && ui.planner) updateForecast();
}

// ---------- Cockpit ----------
VIEWS.cockpit = function viewCockpit() {
  const pl = W.player, bs = SM.balanceSheet(pl), routes = pl.activeRoutes();
  const st7 = routes.map((r) => rstats(r, 7)), st30 = routes.map((r) => rstats(r, 30));
  const seats = st7.reduce((s, x) => s + x.seats, 0), pax = st7.reduce((s, x) => s + x.pax, 0);
  const db2 = st30.reduce((s, x) => s + x.db2 / Math.max(x.n, 1), 0);
  const otp = playerOtp();
  const last = pl.ledger.months.at(-1);
  const lastRes = last ? Object.entries(last.acc).filter(([k]) => !k.startsWith('cf_')).reduce((s, [, v]) => s + v, 0) / 100 : null;
  let html = `<h2 class="sec">Cockpit <small>${dateLong(W.day)}</small></h2>`;
  for (const d of openDecisions()) html += decisionCard(d);
  html += playersCard();
  const staffed = SM.sumObj(pl.staff.pil) + pl.staff.cab + pl.staff.pipeline.length > 0;
  const steps = [
    [pl.fleet.length > 0, 'Flugzeug beschaffen', 'Im Tab Flotte leasen oder auf dem Gebrauchtmarkt kaufen. Leasing schont den Kontostand.', 'fleet'],
    [routes.length > 0, 'Erste Strecke planen', 'Ziel auf der Karte antippen oder im Tab Strecken planen. Die Prognose rechnet mit Ihren echten Kosten.', 'routes'],
    [staffed, 'Personal einstellen', 'Piloten, Flugbegleiter und Technik einstellen. Bis sie anfangen, springt teures Agenturpersonal ein.', 'staff'],
    [W.day > 20 && routes.length > 0, 'Zeit laufen lassen', ui.mp ? 'Die Spielleitung stellt oben das Tempo ein. Preise wirken nach zwei Tagen, Einstellungen nach einigen Wochen.' : 'Oben 1× bis 10× wählen. Preise wirken nach zwei Tagen, Einstellungen nach einigen Wochen.', null],
  ];
  if (steps.some((s) => !s[0])) {
    html += `<div class="card pad stack"><div class="spread"><h3>Erste Schritte</h3><button class="btn small" data-act="guide">Anleitung</button></div>${steps.map(([done, t, d, tab], i) => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="chip ${done ? 'good' : ''}" style="min-width:26px;justify-content:center">${done ? '✓' : i + 1}</span><div style="min-width:0"><b>${t}</b><div class="small muted">${d}</div></div>${!done && tab ? `<button class="btn small" data-act="tab" data-tab="${tab}" style="margin-left:auto">Öffnen</button>` : ''}</div>`).join('')}</div>`;
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
    <div class="tile"><span>Kontostand</span><b class="${bs.cash < 0 ? 'neg' : ''}">${eur(bs.cash)}</b><em>Kreditlinie ${eur(pl.creditUsed)} / ${eur(pl.creditLimit())}</em></div>
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
  html += `<div class="stack"><h2 class="sec">Kontostand <small>letzte ${Math.min(pl.ledger.cashHist.length, 365)} Tage</small></h2>${sparkline(pl.ledger.cashHist.slice(-365))}</div>`;
  if (routes.length) {
    const rows = routes.map((r, i) => ({ r, s: st30[i] })).sort((a, b) => b.s.db2 / Math.max(b.s.n, 1) - a.s.db2 / Math.max(a.s.n, 1));
    html += `<div class="stack"><h2 class="sec">Strecken nach Beitrag <small>Ø 30 Tage</small></h2><div class="tw"><table class="t"><thead><tr><th>Strecke</th><th class="r">Auslastung</th><th class="r">Ø Tarif</th><th class="r">DB2/Tag</th></tr></thead><tbody>
      ${rows.map(({ r, s }) => `<tr><td><a href="#" data-act="openroute" data-id="${r.id}">${r.base}–${r.dest}</a> <span class="muted small">${r.freq}x ${tl(r.type_id)}</span></td><td class="r">${s.n ? pct(s.lf) : '–'}</td><td class="r">${s.n ? eur(s.avgFare) : '–'}</td><td class="r ${s.db2 < 0 ? 'neg' : 'pos'}">${s.n ? eur(s.db2 / s.n, { plus: true }) : 'neu'}</td></tr>`).join('')}
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
    .map((a) => ({ a, free: P.OPERATING_WINDOW_H - (used[a.id] || 0) }));
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
  let html = '';
  if (ui.planner) html += viewPlanner();
  else html += `<div class="spread"><h2 class="sec">Strecken <small>${routes.length} aktiv</small></h2><button class="btn primary" data-act="plan">Neue Strecke planen</button></div>`;
  if (!routes.length && !ui.planner) html += `<div class="callout info">Noch keine Strecke. Wählen Sie ein Ziel auf der Karte oder planen Sie hier. Sie brauchen dafür ein Flugzeug an Ihrer Basis.</div>`;
  if (routes.length) {
    if (ui.planner) html += `<h2 class="sec">Ihre Strecken</h2>`;
    html += `<div class="rlist">${routes.map(routeItem).join('')}</div>`;
  }
  return html;
};
function routeItem(r) {
  const s7 = rstats(r, 7), s30 = rstats(r, 30), open = ui.expanded === r.id;
  const waiting = W.day < r.opened_day ? `startet ${dateShort(r.opened_day)}` : (r.flyingToday || 0) < r.freq ? `${r.flyingToday || 0} von ${r.freq} Umläufen haben ein Flugzeug` : null;
  const lfo = SM.routeLf(r, 7, 'out'), lfi = SM.routeLf(r, 7, 'in');
  let html = `<div class="ritem${open ? ' open' : ''}"><button class="rhead" data-act="toggle" data-id="${r.id}" aria-expanded="${open}">
    <div><div class="rcode">${r.base}<span class="arr">⇄</span>${r.dest}</div><div class="rmeta">${apName(r.dest)} · ${r.freq}x täglich · ${tl(r.type_id)} · ${svcLabel(r.service)} ${waiting ? `· <span class="warnc">${waiting}</span>` : ''}</div></div>
    <div class="rdb ${s30.db2 < 0 ? 'neg' : 'pos'}">${s30.n ? eur(s30.db2 / s30.n, { plus: true }) : '–'}<small>DB2 pro Tag</small></div>
    <div class="lfrow"><span>hin</span><div class="bar"><i class="me" style="width:${(lfo * 100).toFixed(0)}%"></i><span class="tgt" style="left:${r.targetLf * 100}%"></span></div><span class="num">${s7.n ? pct(lfo) : '–'}</span></div>
    <div class="lfrow"><span>zurück</span><div class="bar"><i class="me" style="width:${(lfi * 100).toFixed(0)}%"></i><span class="tgt" style="left:${r.targetLf * 100}%"></span></div><span class="num">${s7.n ? pct(lfi) : '–'}</span></div>
  </button>`;
  if (open) html += routeBody(r, s7, s30);
  return html + '</div>';
}
function insights(r, s7, s30) {
  const out = [], pl = W.player;
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
        <label class="f" style="flex:1"><span>Puffer</span><select id="ef-b-${r.id}">${Object.keys(P.BUFFER_POLICY).map((b) => `<option value="${b}" ${b === r.buffer ? 'selected' : ''}>${bufLabel(b)}</option>`).join('')}</select></label>
      </div>
      <div class="row"><label class="row small" style="gap:6px"><input type="checkbox" id="ef-a-${r.id}" ${r.autoPrice ? 'checked' : ''}> Preise wöchentlich automatisch anpassen, Ziel-Auslastung</label>
        <select id="ef-t-${r.id}" style="width:auto">${[0.7, 0.75, 0.8, 0.85, 0.9, 0.95].map((t) => `<option value="${t}" ${Math.abs(t - r.targetLf) < 1e-6 ? 'selected' : ''}>${pct(t)}</option>`).join('')}</select></div>
      ${pend}
      <div class="row"><button class="btn primary" data-act="applyroute" data-id="${r.id}">Änderungen übernehmen</button>
        ${c ? `<span class="small">Strecke wirklich einstellen?</span><button class="btn danger small" data-act="closeroute" data-id="${r.id}">Ja, einstellen</button><button class="btn small" data-act="cancelconfirm">Abbrechen</button>`
    : `<button class="btn danger" data-act="askclose" data-id="${r.id}" style="margin-left:auto">Strecke einstellen</button>`}</div>
      <p class="small muted">Preise wirken nach ${P.PRICE_CHANGE_LAG_DAYS} Tagen (Buchungsvorlauf). Mehr Frequenz braucht freie Flugzeugzeit, Crews und an koordinierten Flughäfen freie Slots.</p>
    </div>
    <div class="stack"><h3>Wettbewerb auf ${r.base}–${r.dest}</h3>${comp.length ? `<table class="t"><thead><tr><th>Airline</th><th class="r">Flüge/Tag</th><th class="r">Tarif hin</th><th>Produkt</th></tr></thead><tbody>${comp.map((o) => { const a = W.airlines[o.airline]; return `<tr><td><span class="sw" style="background:${colorOf(a)}"></span> ${esc(a.name)}</td><td class="r">${o.freq}</td><td class="r">${eur(o.fare)}</td><td>${svcLabel(o.service)}</td></tr>`; }).join('')}</tbody></table>` : '<p class="small muted">Keine Direktkonkurrenz. Ab 900 km konkurrieren Sie mit Umsteigeverbindungen über fremde Drehkreuze.</p>'}</div>
  </div>`;
}

// Planer
function viewPlanner() {
  const p = ui.planner, pl = W.player, base = p.base;
  const dests = SM.AP_CODES.filter((c) => c !== base && SM.routeKmOk(base, c));
  const types = Object.keys(P.AIRCRAFT_TYPES);
  const st = pl.stations[p.dest];
  return `<div class="card pad stack" id="planner">
    <div class="spread"><h2 class="sec">Neue Strecke ab ${base}</h2><button class="btn small" data-act="closeplan">Schließen</button></div>
    <div class="grid2">
      ${pl.bases.length > 1 ? `<label class="f"><span>Basis</span><select id="pl-base">${pl.bases.map((b) => `<option value="${b}" ${b === base ? 'selected' : ''}>${b} · ${apName(b)}</option>`).join('')}</select></label>` : ''}
      <label class="f"><span>Ziel</span><select id="pl-dest">${byRegion(dests).map(([rg, l]) => `<optgroup label="${esc(rg)}">${l.map((c) => `<option value="${c}" ${c === p.dest ? 'selected' : ''}>${esc(apName(c))} ${c} (${n0(SM.gcDistanceKm(base, c))} km)</option>`).join('')}</optgroup>`).join('')}</select></label>
      <label class="f"><span>Flugzeugtyp</span><select id="pl-type">${types.map((t) => { const own = pl.fleet.filter((a) => a.type_id === t && a.base === base).length; const ok = SM.rangeOk(base, p.dest, t); return `<option value="${t}" ${t === p.type ? 'selected' : ''} ${ok ? '' : 'disabled'}>${t} · ${P.AIRCRAFT_TYPES[t].label}${own ? ` · ${own} an ${base}` : ''}${ok ? '' : ' · Reichweite zu kurz'}</option>`; }).join('')}</select></label>
      <label class="f"><span>Terminal in ${p.dest}</span><select id="pl-term" ${st ? 'disabled' : ''}>${Object.entries(P.TERMINALS).map(([k, t]) => `<option value="${k}" ${k === p.term ? 'selected' : ''}>${t.label} · ${eur(t.rent * SM.apx(p.dest).cost * cpi())}/Mon.</option>`).join('')}</select></label>
    </div>
    <div class="grid3">
      <label class="f"><span>Flüge pro Tag</span><select id="pl-freq">${[1, 2, 3, 4, 5, 6].map((f) => `<option ${f === p.freq ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      <label class="f"><span>Produkt</span><select id="pl-svc">${Object.keys(P.SERVICE).map((s) => `<option value="${s}" ${s === p.service ? 'selected' : ''}>${svcLabel(s)}</option>`).join('')}</select></label>
      <label class="f"><span>Puffer</span><select id="pl-buf">${Object.keys(P.BUFFER_POLICY).map((b) => `<option value="${b}" ${b === p.buffer ? 'selected' : ''}>${bufLabel(b)} (${pct(P.BUFFER_POLICY[b].otp)} pünktlich)</option>`).join('')}</select></label>
    </div>
    <div class="grid2">
      <label class="f"><span>Tarif ${base} → ${p.dest} (€ netto)</span><input type="number" id="pl-fo" min="10" max="900" step="5" value="${p.fo}"></label>
      <label class="f"><span>Tarif ${p.dest} → ${base} (€ netto)</span><input type="number" id="pl-fi" min="10" max="900" step="5" value="${p.fi}"></label>
    </div>
    <div class="row"><button class="btn small" data-act="suggest">Preis mit bestem Beitrag suchen</button><label class="row small" style="gap:6px"><input type="checkbox" id="pl-auto" ${p.auto ? 'checked' : ''}> danach automatisch auf ${pct(p.target)} Auslastung steuern</label></div>
    ${st ? `<p class="small muted">In ${p.dest} haben Sie schon eine Station (${P.TERMINALS[st.terminal].label}). Ändern im Tab Stationen.</p>` : ''}
    <div id="forecast"><p class="small muted">Prognose wird berechnet …</p></div>
  </div>`;
}
function readPlanner() {
  const p = ui.planner; if (!p) return false;
  const v = (id) => $(id) && $(id).value;
  const nb = v('#pl-base');
  if (nb && nb !== p.base) { const keep = { freq: p.freq, service: p.service, buffer: p.buffer, auto: p.auto }; ui.planner = { ...defaultPlanner(p.dest === nb ? null : p.dest, nb), ...keep }; return true; }
  const nd = v('#pl-dest');
  if (nd && nd !== p.dest) { const keep = { freq: p.freq, service: p.service, buffer: p.buffer, auto: p.auto }; ui.planner = { ...defaultPlanner(nd, p.base), ...keep }; ui.selApt = nd; return true; }
  p.type = v('#pl-type') || p.type; p.freq = Number(v('#pl-freq') || p.freq); p.service = v('#pl-svc') || p.service; p.buffer = v('#pl-buf') || p.buffer;
  p.term = v('#pl-term') || p.term;
  p.fo = Math.max(10, Number(v('#pl-fo')) || p.fo); p.fi = Math.max(10, Number(v('#pl-fi')) || p.fi); p.auto = $('#pl-auto') ? $('#pl-auto').checked : p.auto;
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
  const slotsB = W.slotsFree(base), slotsD = W.slotsFree(p.dest), slotOk = W.slotsOk(base, p.dest, p.freq);
  const bh = SM.blockHours(base, p.dest, p.type) * 2 * p.freq;
  const needPil = 2 * bh / P.STAFF.pilotH, needCab = t.cabin * bh / P.STAFF.cabinH;
  const sp = staffPlan(pl), pilRow = sp.find((x) => x.key === t.group), cabRow = sp.find((x) => x.key === 'cab');
  const sparePil = pilRow ? pilRow.have + pilRow.pipe - pilRow.need : 0, spareCab = cabRow.have + cabRow.pipe - cabRow.need;
  const acNeed = fit ? null : `Für ${p.freq}x täglich fehlt Flugzeugzeit an ${base}: ein Umlauf braucht ${n1(rotH)} h, frei sind ${free.length ? free.map((x) => n1(x.free) + ' h').join(', ') : 'keine passenden Flugzeuge'}.`;
  box.innerHTML = `<div class="stack">
    <div class="fc">
      <div><span>Passagiere pro Tag</span><b>${n0(r.pax)}</b><em>beide Richtungen, Auslastung ${pct(r.lf)}</em></div>
      <div><span>Umsatz pro Tag</span><b>${eur(r.revenue)}</b><em>Ø Tarif ${eur(r.avgFare)}</em></div>
      <div><span>DB1 pro Tag</span><b class="${r.db1 < 0 ? 'neg' : 'pos'}">${eur(r.db1, { plus: true })}</b><em>nach direkten Kosten inkl. Crew</em></div>
      <div><span>DB2 pro Tag</span><b class="${r.db2 < 0 ? 'neg' : 'pos'}">${eur(r.db2, { plus: true })}</b><em>Spanne ${eur(lo.db2, { plus: true })} bis ${eur(hi.db2, { plus: true })}</em></div>
    </div>
    <p class="small ink2">Jahresmittel bei ausgereifter Strecke, mit Ihren Kosten: Crew zu Ihren Gehältern, Terminal, Slots, Marke ${n0(pl.brand * 100)}. Im ${MONTHS_L[m]}: DB2 ${eur(cur.db2, { plus: true })} pro Tag bei ${pct(cur.lf)} Auslastung. ${study && study.done ? `<b>Marktstudie liegt vor</b> (${esc(study.by)}): Nachfrage ${pct(study.est - 1, 0).replace(/^(?!-)/, '+')} gegenüber Modell, Unsicherheit ±${pct(study.err)}.` : `Ohne Marktstudie liegt die echte Nachfrage bis zu ±${pct(band)} daneben.`}</p>
    ${acNeed ? `<div class="callout warn">${acNeed} <button class="btn small" data-act="quicklease" data-type="${p.type}" data-base="${base}">${tl(p.type)} leasen (${eur(P.LEASE_DEPOSIT_MONTHS * t.lease_month)} Kaution)</button></div>` : `<div class="callout good">Passt auf ${free.length === 1 ? 'Ihr Flugzeug' : 'Ihre Flotte'}: ${n1(rotH * p.freq)} h von ${n0(P.OPERATING_WINDOW_H)} h Betriebsfenster pro Flugzeug.</div>`}
    ${!slotOk ? `<div class="callout crit">Keine Slots: ${[base, p.dest].filter((x) => W.slotsFree(x) < p.freq).map((x) => `${x} hat nur ${Math.max(0, W.slotsFree(x))} freie`).join(', ')}. Neue Slots kommen zum Sommer- und Winterflugplan (April, Oktober).</div>` : ''}
    ${(sparePil < needPil || spareCab < needCab) ? `<div class="callout warn">Personal reicht nicht: Diese Strecke braucht etwa ${n0(Math.ceil(needPil))} ${SM.roleLabel('pilot', t.group)} und ${n0(Math.ceil(needCab))} Flugbegleiter. Frei sind ${n0(Math.max(0, sparePil))} und ${n0(Math.max(0, spareCab))}. Ohne Einstellung fliegt Agenturpersonal zum 1,6-fachen Satz.</div>` : ''}
    <table class="t"><tbody>
      <tr><td>Reisepotenzial ${base}→${p.dest}</td><td class="r">${n0(potSum)} pro Tag</td></tr>
      <tr><td>Mix Ihrer Passagiere</td><td class="r">Urlaub ${pct(r.dirs.out.seg.leisure / segTot)} · Geschäft ${pct(r.dirs.out.seg.business / segTot)} · Besuch ${pct(r.dirs.out.seg.vfr / segTot)}</td></tr>
      ${rail > 0.02 ? `<tr><td>Bahn nimmt weg</td><td class="r">${pct(rail)} des Potenzials</td></tr>` : ''}
      <tr><td>Umsteiger über fremde Drehkreuze</td><td class="r">${r.dirs.out.indirect > 0.5 ? n0(r.dirs.out.indirect) + ' pro Tag' : 'keine'}</td></tr>
      <tr><td>Konkurrenz</td><td class="r">${(() => { const co = W.competitorOffers(W.playerId, base, p.dest); return co.length ? co.map((c) => `${esc(W.airlines[c.airline].name)} ${c.freq}x ${eur(c.fare)}`).join(', ') : 'keine'; })()}</td></tr>
      ${isFinite(slotsB) || isFinite(slotsD) ? `<tr><td>Freie Slots</td><td class="r">${[base, p.dest].filter((x) => isFinite(W.slotsFree(x))).map((x) => `${x} ${Math.max(0, W.slotsFree(x))}`).join(' · ')}</td></tr>` : ''}
      <tr><td>Kosten je angebotenem Sitz-km</td><td class="r">${NF2.format(r.caskCt)} ct (Erlös ${NF2.format(r.raskCt)} ct)</td></tr>
    </tbody></table>
    <button class="btn primary" data-act="openroute-new" ${slotOk ? '' : 'disabled'}>Strecke eröffnen</button>
  </div>`;
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
  const p = ui.planner, base = p.base;
  const res = doAction({ type: 'openRoute', base, dest: p.dest, typeId: p.type, freq: p.freq, fo: p.fo, fi: p.fi, service: p.service, buffer: p.buffer, target: p.target, auto: p.auto, term: p.term });
  if (!res.ok) return;
  ui.planner = null; ui.expanded = res.id; ui.selApt = null;
  toast(res.start > W.day + 1 ? `Strecke angelegt. Erster Flug am ${dateShort(res.start)}, wenn das Flugzeug da ist.` : `Strecke ${base}–${p.dest} eröffnet. Erster Flug morgen.`);
  refreshAll(); renderDraft();
}
function applyRoute(id) {
  const g = (k) => $(`#ef-${k}-${id}`);
  const res = doAction({ type: 'editRoute', id, fo: Number(g('o').value), fi: Number(g('i').value), freq: Number(g('f').value), service: g('s').value, buffer: g('b').value, auto: g('a').checked, target: Number(g('t').value) });
  if (res.ok) toast(res.msg || 'Änderungen gespeichert.');
  refreshAll();
}

// ---------- Flotte ----------
const acquireCost = (typeId, mode, offer = null) => SM.acquireCost(W.player, typeId, mode, offer, W.macro.eurusd);
function acStatus(pl, a) {
  if (a.delivery_day > W.day) return `<span class="chip warn">Lieferung ${dateShort(a.delivery_day)}</span>`;
  if (a.status === 'ccheck' && a.until > W.day) return `<span class="chip warn">C-Check bis ${dateShort(a.until)}</span>`;
  if (a.status === 'aog' && a.until > W.day) return `<span class="chip crit">Schaden, am Boden bis ${dateShort(a.until)}</span>`;
  if (a.acmi && a.acmi.start <= W.day && a.acmi.end > W.day) return `<span class="chip me">verchartert bis ${dateShort(a.acmi.end)}</span>`;
  if (a.used_hours > 0) return `<span class="chip good">im Einsatz ${n1(a.used_hours)} h/Tag</span>`;
  return `<span class="chip crit">ungenutzt${a.idle_days ? ' seit ' + a.idle_days + ' Tagen' : ''}</span>`;
}
VIEWS.fleet = function viewFleet() {
  const pl = W.player;
  W.operableFreq(pl);
  const base = pl.bases.includes(ui.acqBase) ? ui.acqBase : pl.bases[0];
  let html = `<div class="spread"><h2 class="sec">Flotte <small>${pl.fleet.length} Flugzeuge</small></h2><div class="seg" role="group">${[['own', 'Ihre Flotte'], ['market', 'Beschaffen'], ['acmi', 'Charter']].map(([k, l]) => `<button data-act="fleetview" data-v="${k}" aria-pressed="${ui.fleetView === k}">${l}</button>`).join('')}</div></div>`;
  if (ui.fleetView === 'own') {
    if (!pl.fleet.length) html += `<div class="callout info">Noch kein Flugzeug. Unter „Beschaffen“ gibt es neue Flugzeuge vom Leasinggeber, Gebrauchte vom Markt und Bestellungen ab Werk.</div>`;
    html += pl.fleet.map((a) => {
      const c = ui.confirm === 'dispose:' + a.id, dc = pl.disposeCost(W.day, a), age = pl.acAge(a, W.day), toC = P.CCHECK_FH - (a.fh - a.lastC);
      const routes = (a.assigned || []).map((id) => pl.routes.find((r) => r.id === id)).filter(Boolean).map((r) => r.dest);
      const upcoming = a.acmi && a.acmi.start > W.day ? ` · Charter ab ${dateShort(a.acmi.start)} (${esc(a.acmi.client)})` : '';
      const move = pl.bases.length > 1 ? `<select data-act-change="move" data-id="${a.id}" aria-label="Basis wechseln" style="width:auto">${pl.bases.map((b) => `<option ${b === a.base ? 'selected' : ''}>${b}</option>`).join('')}</select>` : '';
      return `<div class="fleet-row"><div style="min-width:0"><div class="acrow"><div class="thumb">${acSvg(a.type_id, { color: 'var(--accent)', code: pl.code })}</div><div style="min-width:0"><div class="row" style="gap:8px"><b class="mono">${acName(a.id)}</b> <span>${tl(a.type_id)}</span> ${acStatus(pl, a)}</div>
        <div class="small muted">${modeLabel(a)} · Basis ${a.base} · ${n1(age)} Jahre · ${eur(acDayCost(a))} pro Tag${routes.length ? ' · fliegt ' + [...new Set(routes)].join(', ') : ''}${upcoming}</div>
        <div class="small muted">Nächster C-Check in ${n0(Math.max(0, toC))} Flugstunden (dauert ${Math.max(4, P.CCHECK_DAYS - (pl.hangars.includes(a.base) ? P.HANGAR_CHECK_DAYS : 0) - pl.skill('tech'))} Tage)</div>
        </div></div><div class="bar" style="margin-top:6px" title="Auslastung des 17-Stunden-Betriebsfensters"><i class="me" style="width:${Math.min(100, a.used_hours / P.OPERATING_WINDOW_H * 100).toFixed(0)}%"></i></div></div>
        <div class="stack" style="justify-items:end">${move}${c ? `<div class="stack small" style="justify-items:end"><span>${a.owned ? `Verkauf: ${eur(dc.cash)} Zufluss nach Kredittilgung` : a.flex ? 'Rückgabe ohne Kosten' : `Rückgabe kostet ${eur(-dc.pnl)}`}</span><div class="row"><button class="btn danger small" data-act="dispose" data-id="${a.id}">${a.owned ? 'Verkaufen' : 'Zurückgeben'}</button><button class="btn small" data-act="cancelconfirm">Abbrechen</button></div></div>`
        : `<button class="btn small" data-act="askdispose" data-id="${a.id}">${a.owned ? 'Verkaufen' : 'Zurückgeben'}</button>`}</div></div>`;
    }).join('');
    if (pl.fleet.length) html += `<p class="small muted">Ältere Flugzeuge verbrauchen mehr Kerosin, kosten mehr Wartung und fallen öfter aus. Alle ${n0(P.CCHECK_FH)} Flugstunden steht ein C-Check an; ein eigener Hangar an der Basis verkürzt ihn.</p>`;
    return html;
  }
  if (ui.fleetView === 'acmi') {
    const offers = W.acmiOffers;
    html += `<p class="small ink2">ACMI heißt: Sie stellen Flugzeug, Crew, Wartung und Versicherung, der Kunde zahlt eine Tagesrate und trägt Treibstoff und Gebühren. Gut für Flugzeuge, die gerade wenig zu tun haben. In der Charterzeit fehlt das Flugzeug im eigenen Flugplan.</p>`;
    html += offers.length ? offers.map((o) => {
      const cands = pl.fleet.filter((a) => a.type_id === o.type && a.delivery_day <= o.start && !(a.acmi && a.acmi.end > o.start));
      return `<div class="card pad stack"><div class="spread"><b>${esc(o.client)}</b><span class="chip">${tl(o.type)}</span></div>${acSvg(o.type, { color: 'var(--ink-3)' })}
        <div class="small ink2">${dateShort(o.start)} bis ${dateShort(o.end)} (${o.end - o.start} Tage) · ${eur(o.rate)} pro Tag · gesamt ${eur(o.rate * (o.end - o.start))}</div>
        ${cands.length ? `<div class="row"><select id="acmi-${o.id}" style="width:auto">${cands.map((a) => `<option value="${a.id}">${acName(a.id)} · ${a.used_hours > 0 ? n1(a.used_hours) + ' h/Tag im Einsatz' : 'frei'}</option>`).join('')}</select><button class="btn small primary" data-act="acmi" data-id="${o.id}">Annehmen</button></div>` : `<span class="small muted">Keine passende ${tl(o.type)} verfügbar.</span>`}
        <span class="small muted">Angebot gilt bis ${dateShort(o.expires)}</span></div>`;
    }).join('') : '<p class="small muted">Gerade keine Anfragen. Neue kommen zum Monatswechsel.</p>';
    return html;
  }
  // Beschaffen
  const cash = pl.ledger.cash / 100;
  if (pl.bases.length > 1) html += `<label class="f"><span>Stationieren in</span><select id="acq-base">${pl.bases.map((b) => `<option ${b === base ? 'selected' : ''}>${b}</option>`).join('')}</select></label>`;
  const btn = (id, mode, label, offer = null, primary = false) => { const need = acquireCost(id, mode, offer); const ok = cash >= need; return `<button class="btn small${primary ? ' primary' : ''}" data-act="acquire" data-type="${id}" data-mode="${mode}"${offer ? ` data-offer="${offer.id}"` : ''} ${ok ? '' : 'disabled'} title="${ok ? `sofort ${eur(need)}` : 'Es fehlen ' + eur(need - cash)}">${label}</button>`; };
  html += `<div class="stack"><h2 class="sec">Gebrauchtmarkt <small>wechselt monatlich</small></h2><div class="tw"><table class="t"><thead><tr><th>Typ</th><th class="r">Alter</th><th class="r">Konditionen</th><th class="r">Lieferung</th><th></th></tr></thead><tbody>
    ${W.acMarket.slice().sort((a, b) => a.type.localeCompare(b.type) || a.age - b.age).map((o) => `<tr><td><div class="acrow"><div class="thumb">${acSvg(o.type, { color: 'var(--ink-3)' })}</div><div><b>${tl(o.type)}</b><div class="small muted">bis ${dateShort(o.expires)}</div></div></div></td><td class="r">${o.age} J.</td>
      <td class="r">${o.kind === 'lease' ? `${eur(o.lease_month)}/Mon.` : eur(o.price)}<div class="small muted">${o.kind === 'lease' ? 'Leasing 36 Mon.' : 'Kauf, 20 % Anzahlung'}</div></td><td class="r">${o.delivery} T.</td>
      <td class="r">${btn(o.type, o.kind === 'lease' ? 'lease' : 'buy', o.kind === 'lease' ? 'Leasen' : 'Kaufen', o)}</td></tr>`).join('')}
  </tbody></table></div><p class="small muted">Leasingraten sind in US-Dollar vereinbart: Fällt der Euro, wird das Leasing teurer.</p></div>`;
  html += `<h2 class="sec">Neu vom Leasinggeber oder ab Werk</h2><div class="types">${Object.entries(P.AIRCRAFT_TYPES).map(([id, t]) => {
    const known = pl.familyKnown(id), fam = P.TYPE_GROUPS[t.group];
    const intro = known ? `Familie ${fam} schon in der Flotte, Piloten können wechseln` : `neue Familie ${fam}: ${eur(P.TYPE_INTRO_COST)} Einführung${pl.typesIntroduced.length ? ` + ${eur(P.TYPE_COMPLEXITY_DAY)} pro Tag Komplexität, eigene Musterberechtigung für Piloten` : ''}`;
    return `<div class="type"><div class="type-h"><b>${t.label}</b><span class="small muted">${esc(t.maker)} · ${t.cls}${t.age >= 10 ? ` · ${t.age} J. alt` : ''}</span></div>
      <div class="acv-box">${acSvg(id, { color: 'var(--accent)', code: pl.code })}</div>
      <div class="specs"><div><span>Sitze</span><b>${t.seats.basic}/${t.seats.standard}/${t.seats.premium}</b></div><div><span>Reichweite</span><b>${n0(t.range_km)} km</b></div><div><span>Verbrauch</span><b>${n0(t.fuel_bh_kg)} kg/h</b></div><div><span>Crew</span><b>2 + ${t.cabin}</b></div></div>
      <div class="small ink2">${esc(t.note)}. ${esc(t.engines)}.</div>
      <div class="small muted">Leasing ${eur(t.lease_month * P.EURUSD / W.macro.eurusd)}/Monat · Flex ${eur(t.lease_month * (1 + P.FLEX_LEASE_PREMIUM) * P.EURUSD / W.macro.eurusd)}/Monat · ${t.age >= 10 ? `Kauf ${eur(t.value_eur)}` : `ab Werk ${eur(t.value_eur * 1.08)} in ${P.FACTORY_DELIVERY_DAYS} Tagen`} · ${intro}</div>
      <div class="row">${btn(id, 'lease', 'Leasen, 36 Monate', null, true)}${btn(id, 'flex', 'Flex-Leasing')}${t.age >= 10 ? '' : btn(id, 'factory', 'Ab Werk bestellen')}</div></div>`;
  }).join('')}</div>
  <p class="small muted">Lieferung: Leasing ${P.LEASE_DELIVERY_DAYS} Tage, Gebrauchtkauf je Angebot, ab Werk ${P.FACTORY_DELIVERY_DAYS} Tage. Flugzeuge kosten jeden Tag, auch wenn sie stehen.</p>`;
  return html;
};

// ---------- Personal ----------
VIEWS.staff = function viewStaff() {
  const pl = W.player, st = pl.staff, rows = staffPlan(pl), cov = st.cov;
  const hrLead = (role) => Math.round(P.STAFF.lead[role] * SM.lv3([1, 0.75, 0.6, 0.5], pl.skill('hr')) * (role === 'pilot' ? W.macro.laborTight : 1));
  let html = `<h2 class="sec">Personal <small>${n0(SM.sumObj(st.pil) + st.cab + st.tech)} Beschäftigte · ${eur(pl.staffMonthly(cpi()))} pro Monat</small></h2>`;
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
  <div class="row"><button class="btn primary" data-act="fillstaff">Bedarf plus 10 % Reserve decken</button><span class="small muted">Monatlich höchstens ${P.STAFF.maxHire.pilot} Piloten, ${P.STAFF.maxHire.cabin} Flugbegleiter, ${P.STAFF.maxHire.tech} Techniker. Entlassen kostet ${P.STAFF.severanceMonths} Monatsgehälter.</span></div>
  <p class="small muted">Bedarf aus dem Flugplan: Ein Pilot fliegt im Schnitt ${n1(P.STAFF.pilotH)} Blockstunden am Tag, eine Flugbegleiterin ${n1(P.STAFF.cabinH)}. Technik: ${n1(P.STAFF.techPerAc)} Personen je Flugzeug, sonst steigen Ausfälle und Wartungskosten.</p>`;
  const groups = SM.STAFF_GROUPS.filter((g) => st.pil[g] > 0);
  if (groups.length && new Set(pl.typesIntroduced.map((x) => P.AIRCRAFT_TYPES[x].group)).size > 1) {
    html += `<div class="card pad stack"><h3>Umschulung (Musterberechtigung)</h3><div class="row small"><select id="tr-from" style="width:auto">${groups.map((g) => `<option value="${g}">${P.TYPE_GROUPS[g]} (${st.pil[g]})</option>`).join('')}</select> → <select id="tr-to" style="width:auto">${SM.STAFF_GROUPS.map((g) => `<option value="${g}">${P.TYPE_GROUPS[g]}</option>`).join('')}</select>
      <input type="number" id="tr-n" min="1" value="2" style="width:60px"><button class="btn small" data-act="train">Umschulen</button></div><span class="small muted">${P.STAFF.trainDays} Tage, ${eur(P.STAFF.trainCost * cpi())} je Pilot. Während der Schulung fliegen sie nicht, bekommen aber Gehalt.</span></div>`;
  }
  html += `<div class="stack"><h2 class="sec">Tarif und Stimmung</h2>
    <div class="row"><span class="small">Gehaltsniveau</span><div class="seg">${[0.9, 0.95, 1, 1.05, 1.1, 1.2].map((v) => `<button data-act="pay" data-v="${v}" aria-pressed="${Math.abs(st.pay - v) < 0.001}">${v === 1 ? 'Markt' : (v > 1 ? '+' : '−') + n0(Math.abs(v - 1) * 100) + ' %'}</button>`).join('')}</div>${![0.9, 0.95, 1, 1.05, 1.1, 1.2].some((v) => Math.abs(st.pay - v) < 0.001) ? `<span class="chip">aktuell ${pct(st.pay - 1)} über Markt</span>` : ''}</div>
    <div class="lfrow" style="grid-template-columns:70px 1fr 48px"><span>Stimmung</span><div class="bar"><i class="${st.morale < 0.5 ? 'crit' : 'me'}" style="width:${(st.morale * 100).toFixed(0)}%"></i><span class="tgt" style="left:55%"></span></div><span class="num">${pct(st.morale)}</span></div>
    <p class="small muted">Die Stimmung folgt dem Gehalt und der Arbeitslast. Unter etwa 55 % steigen Kündigungen und das Streikrisiko. Eine Personalfachkraft hebt die Stimmung und beschleunigt Einstellungen.</p>
    <label class="chk"><input type="checkbox" id="agency" ${st.agency ? 'checked' : ''}> Lücken mit Agenturpersonal füllen (1,6-facher Stundensatz). Aus: Flüge ohne Crew fallen aus.</label></div>`;
  // Fachkräfte
  html += `<div class="stack"><h2 class="sec">Fachkräfte und Berater <small>${pl.experts.length} angestellt</small></h2>`;
  html += pl.experts.length ? pl.experts.map((e) => `<div class="card pad stack"><div class="spread"><b>${esc(e.name)}</b><span class="chip me">${P.EXPERT_ROLES[e.role].label} · ${LEVEL[e.level]}</span></div>
      <div class="small ink2">${esc(P.EXPERT_ROLES[e.role].effect[e.level - 1])}</div>
      <div class="spread small muted"><span>${e.years} Jahre Erfahrung, ${esc(e.prev)}, Schwerpunkt ${esc(e.region)}</span><span>${eur(e.salary * cpi())}/Monat <button class="btn small" data-act="fireexpert" data-id="${e.id}">Freistellen</button></span></div></div>`).join('')
    : '<p class="small muted">Noch niemand. Fachkräfte wirken sofort und dauerhaft, jede Rolle kann einmal besetzt werden (Marktanalyse zweimal).</p>';
  html += `<h3>Bewerbungen</h3>${W.candidates.slice().sort((a, b) => a.role.localeCompare(b.role) || b.level - a.level).map((c) => {
    const taken = pl.experts.filter((e) => e.role === c.role).length >= P.EXPERT_ROLES[c.role].max;
    return `<div class="cand"><div class="spread"><b>${esc(c.name)}</b><span class="chip">${P.EXPERT_ROLES[c.role].label} · ${LEVEL[c.level]}</span></div>
      <div class="small ink2">${esc(P.EXPERT_ROLES[c.role].effect[c.level - 1])}</div>
      <div class="spread small"><span class="muted">${c.years} Jahre, ${esc(c.trait)}, ${esc(c.prev)} · kennt ${esc(c.region)} · bis ${dateShort(c.expires)}</span>
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
    const slots = W.slotsFree(apt);
    return `<div class="card pad stack"><div class="spread"><b>${apt} · ${apName(apt)}</b><span>${isBase ? '<span class="chip me">Basis</span> ' : ''}${isFinite(slots) ? `<span class="chip ${slots < 2 ? 'warn' : ''}">${Math.max(0, slots)} Slots frei</span>` : '<span class="chip">ohne Slotvergabe</span>'}</span></div>
      <div class="small muted">${d.n} ${d.n === 1 ? 'Abflug' : 'Abflüge'} pro Tag · Fixkosten ${eur(monthly)} pro Monat</div>
      <div class="stack small"><span class="muted">Terminal</span><div class="opts">${Object.entries(P.TERMINALS).map(([k, t]) => `<button data-act="term" data-apt="${apt}" data-v="${k}" aria-pressed="${s.terminal === k}" title="${esc(t.desc)}"><b>${t.label}</b><span>${eur(t.rent * x.cost * cpi() * proc)}/Mon.</span></button>`).join('')}</div>
        <span class="muted">${esc(P.TERMINALS[s.terminal].desc)}. Passagierentgelte ×${NF2.format(P.TERMINALS[s.terminal].paxF)}, Bodenzeit ${P.TERMINALS[s.terminal].turn > 0 ? '+' : ''}${P.TERMINALS[s.terminal].turn} Min., Geschäftsreisende ${s.terminal === 'prem' ? 'zahlen lieber mehr' : s.terminal === 'lcc' ? 'meiden Sie eher' : 'neutral'}.</span></div>
      <div class="stack small"><span class="muted">Abfertigung</span><div class="opts"><button data-act="hand" data-apt="${apt}" data-v="contract" aria-pressed="${s.handling === 'contract'}"><b>Dienstleister</b><span>${eur(contract)}/Tag</span></button><button data-act="hand" data-apt="${apt}" data-v="own" aria-pressed="${s.handling === 'own'}"><b>Eigenes Team</b><span>${eur(own)}/Tag</span></button></div>
        <span class="muted">Ein eigenes Team kostet fest ${eur(P.OWN_HANDLING_DAY * x.cost * cpi())} pro Tag und lohnt sich ab vielen Abflügen.</span></div>
      ${isBase ? `<div class="row small"><span>Hangar: ${hangar ? 'gemietet' : 'keiner'}</span><button class="btn small" data-act="hangar" data-apt="${apt}">${hangar ? 'Kündigen' : `Mieten (${eur(P.HANGAR_MONTH * x.cost * cpi() * proc)}/Mon.)`}</button><span class="muted">Wartung −6 %, C-Check ${P.HANGAR_CHECK_DAYS} Tage kürzer für hier stationierte Flugzeuge</span></div>` : ''}
    </div>`;
  });
  let html = `<h2 class="sec">Stationen <small>${list.length} Flughäfen · ${eur(total)} pro Monat</small></h2>
    <p class="small ink2">An jedem Flughafen mieten Sie Schalter und Gates und kaufen die Abfertigung ein. Billige Bereiche sparen Miete und Entgelte, kosten aber Bodenzeit und Geschäftsreisende.</p>${cards.join('')}`;
  const cand = SM.AP_CODES.filter((c) => !pl.bases.includes(c));
  html += `<div class="card pad stack"><h3>Neue Basis eröffnen</h3><p class="small ink2">Eine Basis erlaubt Strecken von dort aus und Umsteigeverbindungen über diesen Flughafen. Einmalig ${eur(P.BASE_SETUP_COST * cpi())}, danach ${eur(P.BASE_FIXED_DAY * cpi())} pro Tag für Leitung und Crewräume. Flugzeuge lassen sich im Tab Flotte umstationieren.</p>
    <div class="row"><select id="newbase" style="width:auto">${cand.map((c) => { const al = W.list.find((x) => x.archetype && x.bases.includes(c)); return `<option value="${c}">${c} · ${apName(c)}${al ? ' · Basis ' + al.name : ''}</option>`; }).join('')}</select><button class="btn" data-act="openbase">Basis eröffnen</button></div></div>`;
  const slotApts = SM.AP_CODES.filter((c) => isFinite(W.slotsFree(c)));
  html += `<div class="stack"><h2 class="sec">Slots <small>koordinierte Flughäfen</small></h2><table class="t"><thead><tr><th>Flughafen</th><th class="r">frei</th><th class="r">Entgelt je Bewegung</th></tr></thead><tbody>${slotApts.map((c) => `<tr><td>${c} · ${apName(c)}</td><td class="r">${Math.max(0, W.slotsFree(c))}</td><td class="r">${eur(SM.apx(c).slotFee * cpi())}</td></tr>`).join('')}</tbody></table>
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
      <p class="small ink2">Festpreis ${NF3.format(hq.price)} €/kg für ${pct(ui.hedge.share)} des Bedarfs, Prämie ${pct(hq.prem, 1)} je Monat: <b>${eur(hq.cost)}</b> sofort.${kg ? '' : ' Ohne Flugplan gibt es nichts abzusichern.'}</p>
      <div class="row"><button class="btn primary" data-act="hedge" ${kg ? '' : 'disabled'}>${h ? 'Neu absichern (ersetzt die laufende)' : 'Absichern'}</button>${h ? '<button class="btn" data-act="unhedge">Absicherung beenden</button>' : ''}</div>
      <p class="small muted">Schützt vor Ölpreisschocks, kostet aber eine Prämie, und bei fallenden Preisen zahlen Sie mehr als die Konkurrenz. Eine Einkaufsfachkraft senkt Prämie und Kerosinpreis.</p></div></div>`;
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

// ---------- Markt ----------
function selectAirport(c) {
  ui.selApt = c;
  const pl = W.player;
  if (ui.tab === 'routes' && ui.planner && c !== ui.planner.base) { ui.planner = { ...defaultPlanner(c, ui.planner.base), freq: ui.planner.freq, service: ui.planner.service, buffer: ui.planner.buffer }; setTab('routes'); }
  else { if (pl.bases.includes(c)) ui.selBase = c; setTab('market'); }
  renderMapRoutes(true);
}
VIEWS.market = function viewMarket() {
  const pl = W.player, base = pl.bases.includes(ui.selBase) ? ui.selBase : pl.bases[0], c = ui.selApt || base, a = P.AIRPORTS[c];
  const based = W.list.filter((x) => x.bases.includes(c) && x.status !== 'insolvent');
  let html = `<div class="spread"><h2 class="sec">${esc(a.name)} <small>${c} · ${SM.COUNTRY_NAMES[a.country].replace(/^den /, '')}</small></h2>${c !== base ? `<button class="btn primary" data-act="planfrom" data-apt="${c}">Strecke ${base}–${c} planen</button>` : '<span class="chip me">Ihre Basis</span>'}</div>`;
  const ev = W.activeEvents().concat(W.upcomingEvents()).filter((e) => W.eventAffects(e, c) && e.scope !== 'all');
  for (const e of ev) html += `<div class="callout ${e.severity === 'good' ? 'good' : 'warn'}">${e.start > W.day ? `Ab ${dateShort(e.start)}: ` : ''}${esc(e.text)}</div>`;
  html += `<div class="tiles">
    <div class="tile"><span>Einzugsgebiet</span><b>${NF1.format(a.pop)} Mio.</b><em>Einwohner</em></div>
    <div class="tile"><span>Tourismus</span><b>${NF2.format(a.tour)}</b><em>Index, 1 = Mittel</em></div>
    <div class="tile"><span>Wirtschaft</span><b>${NF2.format(a.biz)}</b><em>Konjunktur ${pct(W.macro.econ[a.country] - 1).replace(/^(?!−|-)/, '+')}</em></div>
    <div class="tile"><span>Passagierentgelt</span><b>${eur(a.paxfee * cpi())}</b><em>je Abflug-Pax</em></div>
    <div class="tile"><span>Ticketsteuer</span><b>${eur(W.taxAt(c))}</b><em>zahlt der Kunde</em></div>
    <div class="tile"><span>Kerosin</span><b>${NF3.format(W.fuelPrice * SM.apx(c).fuel)} €</b><em>je kg vor Ort</em></div>
  </div>`;
  html += `<p class="small ink2">${based.length ? 'Basis von ' + based.map((x) => `<span class="sw" style="background:${colorOf(x)}"></span> ${esc(x.name)}`).join(', ') : 'Keine Airline hat hier eine Basis.'}${isFinite(W.slotsFree(c)) ? ` Koordinierter Flughafen: ${Math.max(0, W.slotsFree(c))} Slots frei.` : ''}${P.LEISURE_SEASON_PROFILE[c] ? ` Ferienziel mit starker Saison (${P.LEISURE_SEASON_PROFILE[c] === 'island' ? 'Insel: Sommer etwa dreimal so stark wie Winter' : 'Sommer deutlich stärker'}).` : ''}</p>`;
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
  ['marketing', 'Marketing'], ['overhead', 'Verwaltung'], ['one_off', 'Einmalkosten'],
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
  const cell = (col, k) => { if (!col) return '<td class="r muted">–</td>'; const x = k === 'ebit' ? col.ebit : k === 'net' ? col.net : col.v(k); return `<td class="r">${x === 0 ? '<span class="muted">0</span>' : eur(x)}</td>`; };
  const used = new Set(PNL_ROWS.filter(([k]) => k !== 'grp' && !['ebit', 'net'].includes(k) && (L.pnl[k] || L.month[k])).map(([k]) => k));
  let html = `<h2 class="sec">Finanzen <small>EBIT-Marge seit Start ${tot.rev ? pct(tot.ebit / tot.rev, 1) : '–'}</small></h2>`;
  html += `<div class="tiles">
    <div class="tile"><span>Kontostand</span><b class="${bs.cash < 0 ? 'neg' : ''}">${eur(bs.cash)}</b><em>verfügbares Geld</em></div>
    <div class="tile"><span>Kreditlinie</span><b>${eur(pl.creditUsed)}</b><em>von ${eur(pl.creditLimit())}, ${pct(pl.creditRate(W.macro.rate), 1)} Zins</em></div>
    <div class="tile"><span>Rating</span><b>${pl.rating}</b><em>Leitzins ${pct(W.macro.rate, 1)}</em></div>
  </div>`;
  // Kredite
  const lim = W.loanLimit(pl), rate = W.loanRate(pl);
  html += `<div class="card pad stack"><h3>Bankkredit</h3>
    ${pl.loans.length ? `<table class="t"><thead><tr><th>Kredit</th><th class="r">Rest</th><th class="r">Zins</th><th class="r">Rate/Mon.</th><th></th></tr></thead><tbody>${pl.loans.map((l) => `<tr><td>${dateShort(l.day)} · ${l.years} J.</td><td class="r">${eur(l.balance)}</td><td class="r">${pct(l.rate, 1)}</td><td class="r">${eur(l.annuity)}</td><td class="r"><button class="btn small" data-act="repay" data-id="${l.id}">Ablösen</button></td></tr>`).join('')}</tbody></table>` : ''}
    <div class="row small"><span>Betrag</span><div class="seg">${[1e6, 2e6, 5e6, 10e6].map((v) => `<button data-act="lq" data-k="amount" data-v="${v}" aria-pressed="${ui.loan.amount === v}">${n0(v / 1e6)} Mio.</button>`).join('')}</div>
      <span>Laufzeit</span><div class="seg">${[3, 5, 8].map((v) => `<button data-act="lq" data-k="years" data-v="${v}" aria-pressed="${ui.loan.years === v}">${v} J.</button>`).join('')}</div></div>
    <p class="small ink2">Bei Rating ${pl.rating} gibt die Bank bis ${eur(lim)} zu ${pct(rate, 1)} Zins. Monatsrate für ${eur(ui.loan.amount)}: ${eur(ui.loan.amount * (rate / 12) / (1 - (1 + rate / 12) ** -(ui.loan.years * 12)))}.</p>
    <div class="row"><button class="btn" data-act="loan" ${lim >= ui.loan.amount ? '' : 'disabled'}>Kredit aufnehmen</button></div>
    <p class="small muted">Das Rating ergibt sich monatlich aus Eigenkapitalquote (Leasingverpflichtungen zählen mit) und Zinsdeckung. Es bestimmt Zinsaufschlag und Kreditlinie. Eine Finanzfachkraft verbessert beides.</p></div>`;
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
  html += `<div class="stack"><h2 class="sec">Konjunktur <small>100 = normal, Geschäftsreisen reagieren am stärksten</small></h2><div class="econ">${[...new Set(stationsOf(W.player).map((c) => P.AIRPORTS[c].country).concat(['US', 'CN', 'DE', 'GB', 'JP', 'IN', 'AE', 'BR']))].map((c) => { const v = M.econ[c]; return `<div><span>${SM.COUNTRY_LABEL[c]}</span><div class="bar"><i class="${v < 0.97 ? 'crit' : v > 1.03 ? 'good' : ''}" style="width:${clampPct((v - 0.8) / 0.4)}%"></i><span class="tgt" style="left:50%"></span></div><b class="num">${n0(v * 100)}</b></div>`; }).join('')}</div></div>`;
  html += `<div class="stack"><h2 class="sec">Ereignisse</h2>${act.length + up.length ? `<div class="news">${up.concat(act).map(eventRow).join('')}</div>` : '<p class="small muted">Ruhige Lage.</p>'}</div>`;
  // Konkurrenz
  const rows = W.list.map((al) => {
    const ms = al.ledger.months.slice(-3);
    let rev = 0, ebit = 0;
    for (const m of ms) { const c = pnlCol(m.acc); rev += c.rev; ebit += c.ebit; }
    return { al, margin: rev ? ebit / rev : null };
  });
  const pl = W.player;
  html += `<div class="stack"><h2 class="sec">Airlines im Markt <small>Marge der letzten drei Monate</small></h2><div class="tw"><table class="t"><thead><tr><th>Airline</th><th>Modell</th><th>Basen</th><th class="r">Flotte</th><th class="r">Strecken</th><th class="r">Marge</th></tr></thead><tbody>
    ${rows.map(({ al, margin }) => `<tr><td><span class="sw" style="background:${colorOf(al)}"></span> ${esc(al.name)}${al.status !== 'active' ? ` <span class="chip crit">${al.status === 'insolvent' ? 'insolvent' : 'Restrukturierung'}</span>` : ''}</td><td>${al.archetype ? P.AI_ARCHETYPES[al.archetype].label : al.id === W.playerId ? 'Sie' : 'Mitspieler'}</td><td>${al.bases.join(', ')}</td><td class="r">${al.fleet.length}</td><td class="r">${al.activeRoutes().length}</td><td class="r ${margin !== null && margin < 0 ? 'neg' : ''}">${margin === null ? '–' : pct(margin, 1)}</td></tr>`).join('')}
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
  switch (act) {
    case 'tab': setTab(b.dataset.tab); break;
    case 'invite': showInvite(); break;
    case 'guide': showGuide(); break;
    case 'plan': ui.planner = defaultPlanner(ui.selApt && !pl.bases.includes(ui.selApt) ? ui.selApt : null); ui.selApt = ui.planner.dest; renderPane(true); renderDraft(); renderMapRoutes(true); break;
    case 'planfrom': ui.planner = defaultPlanner(b.dataset.apt); setTab('routes'); break;
    case 'closeplan': ui.planner = null; renderPane(true); renderDraft(); break;
    case 'suggest': suggestPrice(); break;
    case 'openroute-new': openNewRoute(); break;
    case 'quicklease': { const t = b.dataset.type; const res = doAction({ type: 'acquire', typeId: t, mode: 'lease', base: b.dataset.base }); if (res.ok) toast(`${tl(t)} geleast. Lieferung in ${P.LEASE_DELIVERY_DAYS} Tagen.`); renderHeader(); updateForecast(); break; }
    case 'toggle': ui.expanded = ui.expanded === b.dataset.id ? null : b.dataset.id; ui.confirm = null; renderPane(true); renderMapRoutes(true); break;
    case 'openroute': ui.expanded = b.dataset.id; setTab('routes'); renderMapRoutes(true); break;
    case 'applyroute': applyRoute(b.dataset.id); break;
    case 'askclose': ui.confirm = 'close:' + b.dataset.id; renderPane(true); break;
    case 'closeroute': { const r = pl.routes.find((x) => x.id === b.dataset.id); if (r && doAction({ type: 'closeRoute', id: r.id }).ok) { ui.expanded = null; ui.confirm = null; refreshAll(); toast(`${r.base}–${r.dest} eingestellt.`); } break; }
    case 'cancelconfirm': ui.confirm = null; renderPane(true); break;
    case 'fleetview': ui.fleetView = b.dataset.v; renderPane(true); break;
    case 'acquire': {
      const t = b.dataset.type, mode = b.dataset.mode;
      const base = pl.bases.includes(ui.acqBase) ? ui.acqBase : pl.bases[0];
      const res = doAction({ type: 'acquire', typeId: t, mode, offerId: b.dataset.offer || null, base });
      if (res.ok) toast(`${tl(t)} ${mode === 'buy' ? 'gekauft' : mode === 'factory' ? 'ab Werk bestellt' : mode === 'flex' ? 'per Flex-Leasing' : 'geleast'}. Lieferung am ${dateShort(res.delivery)} nach ${res.base}.`);
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
  if (t.dataset.actChange === 'move') { if (doAction({ type: 'move', acId: t.dataset.id, base: t.value }).ok) toast(`Umstationiert nach ${t.value} (12.000 € Überführung).`); refreshAll(); return; }
  if (t.id === 'acq-base') { ui.acqBase = t.value; return; }
  if (t.id === 'agency') { doAction({ type: 'agency', on: t.checked }); refreshAll(); return; }
  if (t.id === 'cargo') { doAction({ type: 'cargo', on: t.checked }); refreshAll(); return; }
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
  const sel = { base: 'HAM', diff: 'normal' };
  const m = $('#modal');
  m.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgT">
    <div><h1 id="dlgT">Sky<span>market</span></h1><p class="ink2">Gründen Sie eine Airline und bauen Sie ein Netz über 104 Flughäfen weltweit auf. Sie beschaffen Flugzeuge, Personal, Kerosin und Terminalflächen selbst. 14 Konkurrenten, Konjunktur, Ölpreis, Streiks und Wetter machen es Ihnen nicht leicht.</p></div>
    ${usable ? `<div class="callout info"><b>Gespeichertes Spiel: ${esc(save.name)}</b><span>${dateLong(save.day)} · ${save.where}</span><div class="row"><button class="btn primary" id="dlgLoad">Weiterspielen</button></div></div>` : ''}
    ${save && !usable ? `<div class="callout warn">Ihr Spielstand stammt aus einer älteren Version und passt nicht mehr zur neuen Weltkarte. Bitte neu gründen.</div>` : ''}
    <div class="grid2"><label class="f"><span>Name der Airline</span><input type="text" id="ngName" maxlength="28" value="Hanse Air"></label>
      <label class="f"><span>Kürzel (2 Zeichen)</span><input type="text" id="ngCode" maxlength="2" value="HX" style="text-transform:uppercase"></label></div>
    <div class="stack"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Heimatbasis</span><div class="basegroups">${byRegion(SM.AP_CODES).map(([rg, l]) => `<details ${rg === 'Europa' ? 'open' : ''}><summary>${esc(rg)} <span class="muted">${l.length}</span></summary><div class="basepick">
      ${l.map((c) => `<button type="button" data-base="${c}" aria-pressed="${c === sel.base}"><b>${c}</b><span>${esc(apName(c))}${aiBase[c] ? ' · Basis ' + aiBase[c].split(' ')[0] : ''}</span></button>`).join('')}</div></details>`).join('')}</div>
      <p class="small muted">104 Flughäfen weltweit: die 100 größten nach Passagieren plus Hamburg, Berlin, Düsseldorf und Wien. Hamburg ist unterversorgt und ein guter Start. In einer KI-Basis treffen Sie vom ersten Tag auf starke Konkurrenz.</p></div>
    <div class="stack"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Schwierigkeit</span><div class="seg wrap" id="ngDiff">
      ${Object.entries(SM.DIFFICULTY).map(([k, d]) => `<button type="button" data-diff="${k}" aria-pressed="${k === sel.diff}">${d.label} · ${n0(d.equity / 1e6)} Mio. €</button>`).join('')}</div>
      <p class="small muted">Zugänglich: mehr Kapital, weniger Krisen, KI schätzt ungenauer. Experte: wenig Kapital, häufigere Schocks, KI rechnet scharf.</p></div>
    <div class="row">${canClose ? '<button class="btn" id="dlgCancel">Zurück zum Spiel</button>' : ''}${ONLINE ? '<button class="btn" id="dlgOnline">Online spielen</button>' : ''}<button class="btn primary" id="dlgStart" style="margin-left:auto">Airline gründen</button></div>
  </div>`;
  m.hidden = false;
  m.onclick = async (e) => {
    const bb = e.target.closest('[data-base]'); if (bb) { sel.base = bb.dataset.base; for (const x of m.querySelectorAll('[data-base]')) x.setAttribute('aria-pressed', String(x === bb)); }
    const db = e.target.closest('[data-diff]'); if (db) { sel.diff = db.dataset.diff; for (const x of m.querySelectorAll('[data-diff]')) x.setAttribute('aria-pressed', String(x === db)); }
    if (e.target.id === 'dlgCancel') m.hidden = true;
    if (e.target.id === 'dlgOnline') { if (mpState.user) showLobby(); else showAuth(); return; }
    if (e.target.id === 'dlgLoad') { try { W = SM.deserialize(await unpack(save)); resetUi(); ui.lastSaveDay = W.day; m.hidden = true; startWorld(); toast('Spielstand geladen.'); } catch (err) { toast('Der Spielstand ließ sich nicht lesen.'); } }
    if (e.target.id === 'dlgStart') {
      const name = ($('#ngName').value || 'Hanse Air').trim().slice(0, 28);
      const code = (($('#ngCode').value || 'HX').trim().toUpperCase() + 'XX').slice(0, 2);
      W = SM.newGame({ name, code, base: sel.base, difficulty: sel.diff });
      resetUi();
      m.hidden = true; startWorld(); saveGame(false);
    }
  };
}
function resetUi() {
  ui.sel = null; const pc = $('#planeCard'); if (pc) pc.hidden = true;
  Object.assign(ui, { tab: 'cockpit', expanded: null, planner: null, selApt: null, selBase: null, acqBase: null, lastSaveDay: null, newsSeen: 0, gameOverShown: false, t: 0.25, fleetView: 'own', confirm: null });
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
    <p>Sie gründen eine Airline und bauen ein Streckennetz über 104 Flughäfen weltweit auf. Sie beschaffen Flugzeuge, Personal, Kerosin und Terminalflächen selbst und treten gegen 14 KI-Airlines und bis zu drei Mitspielende an.</p>
    <div class="gsteps">
      <div><b>Ziel</b><span>Wachsen und Gewinn machen, ohne dass das Geld ausgeht.</span></div>
      <div><b>Gefahr</b><span>Ist das Konto 30 Tage lang im Minus, ist die Airline insolvent.</span></div>
      <div><b>Wichtig</b><span>Kontostand und Gewinn sind zweierlei: Kautionen und Käufe kosten sofort Geld, wirken aber nicht als Verlust.</span></div>
    </div>` },
  { t: 'Gemeinsam spielen', html: () => `
    <ol class="glist-num">
      <li><b>Spiel anlegen:</b> In der Lobby auf „Neues Spiel“. Name, optional ein Passwort, Schwierigkeit und Tempo wählen, dann die eigene Airline mit Kürzel und Heimatbasis gründen.</li>
      <li><b>Einladen:</b> Im Spiel oben auf „Einladen“. Der <b>Link</b> funktioniert ohne Passwort, der <b>6-stellige Code</b> mit Passwort. Bis zu vier Airlines pro Spiel.</li>
      <li><b>Beitreten:</b> Link öffnen oder in der Lobby Code eingeben bzw. nach dem Spielnamen suchen.</li>
      <li><b>Zeit:</b> Wer das Spiel anlegt, leitet es und stellt oben Pause, 1×, 2× oder 4× ein. 1× heißt: ein Tag in 12 Sekunden. Ist niemand im Spiel, bleibt die Zeit stehen.</li>
    </ol>` },
  { t: 'Die ersten zehn Minuten', html: () => `
    <ol class="glist-num">
      <li><b>Flugzeug leasen:</b> Tab <b>Flotte → Beschaffen</b>. Zum Start eignen sich zwei Airbus A320neo. Leasing kostet nur die Kaution, Lieferung nach 14 Tagen.</li>
      <li><b>Strecke planen:</b> Tab <b>Strecken → Neue Strecke</b> oder einen Flughafen auf der Karte antippen. Die Prognose zeigt Passagiere, Erlös und den <b>DB2</b> (Beitrag nach Flugzeugkosten). Grün heißt: lohnt sich. „Preis mit bestem Beitrag suchen“ hilft beim Tarif.</li>
      <li><b>Personal einstellen:</b> Tab <b>Personal → Bedarf plus 10 % Reserve decken</b>. Bis die Leute anfangen, springt teures Agenturpersonal ein.</li>
      <li><b>Zeit laufen lassen</b> und nach ein paar Wochen im <b>Cockpit</b> nachsehen, welche Strecken verdienen.</li>
    </ol>
    <p class="small muted">Gute erste Ziele ab Hamburg: Paris, Barcelona, Wien, Rom, London – jeweils einmal täglich.</p>` },
  { t: 'Karte und Bedienung', html: () => `
    <div class="gsteps">
      <div><b>Zoomen und verschieben</b><span>Mausrad oder zwei Finger, Karte mit gedrückter Maus ziehen. „Mein Netz“ springt zu Ihren Strecken, „Welt“ zeigt alles.</span></div>
      <div><b>Flugzeug antippen</b><span>Zeigt Flugnummer, Route, Fortschritt, Passagiere und Tarif. Ihre Flugzeuge sind gelb, Mitspielende farbig, die KI grau.</span></div>
      <div><b>Flughafen antippen</b><span>Öffnet den Markt: Einzugsgebiet, Entgelte, Konkurrenz und die größten Ziele ab Ihrer Basis.</span></div>
      <div><b>Gestrichelte Kreise</b><span>Rot: Streik, Sturm oder Sperrung. Grün: Großereignis mit mehr Nachfrage.</span></div>
    </div>` },
  { t: 'Die Bereiche im Überblick', html: () => `
    <div class="gtabs">
      <div><b>Cockpit</b>Kontostand, Warnungen, Entscheidungen, Mitspielende</div>
      <div><b>Strecken</b>Planen, Preise, Frequenz, Produkt, einstellen</div>
      <div><b>Flotte</b>Ihre Flugzeuge, Gebrauchtmarkt, Neubestellung, Charter</div>
      <div><b>Personal</b>Crews, Gehalt, Stimmung, Fachkräfte und Berater</div>
      <div><b>Stationen</b>Terminal, Abfertigung, Hangar, Slots, neue Basen</div>
      <div><b>Einkauf</b>Kerosin absichern, Versicherung, Marketing, Fracht</div>
      <div><b>Markt</b>Nachfrage und Konkurrenz, Marktstudien</div>
      <div><b>Finanzen</b>Gewinn und Verlust, Bilanz, Kredite, Rating</div>
      <div><b>Welt</b>Konjunktur, Ölpreis, Zinsen, Ereignisse, alle Airlines</div>
      <div><b>Meldungen</b>Alles, was passiert ist</div>
    </div>` },
  { t: 'Tipps für den Erfolg', html: () => `
    <ul class="glist-num tips">
      <li><b>Klein anfangen:</b> zwei Flugzeuge, vier bis fünf Strecken mit einem Flug am Tag. Mehr Flugzeuge erst, wenn die Strecken grün sind.</li>
      <li><b>Auslastung 80–90 %:</b> Die Preisautomatik steuert das von selbst. Ist die Maschine dauerhaft voll, ist der Preis zu niedrig.</li>
      <li><b>Unter 600 km gewinnt oft die Bahn,</b> und große Flugzeuge auf kleinen Märkten fliegen leer.</li>
      <li><b>Agenturpersonal kostet das 1,6-Fache.</b> Rechtzeitig einstellen, Einstellungen dauern 12–35 Tage.</li>
      <li><b>Reserve halten:</b> Ölpreisschocks, Streiks und Stürme kommen. Kerosin im Tab Einkauf absichern, Kreditlinie im Blick behalten.</li>
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
  const m = modal(`<div class="spread"><h1>Sky<span>market</span></h1><div class="row small"><span class="muted">Angemeldet als <b>${esc(mpState.user.name)}</b></span><button class="btn small" id="lbLogout">Abmelden</button></div></div>
    <div class="lobby">
      <section class="stack"><div class="spread"><h3>Meine Spiele</h3><button class="btn small primary" id="lbNew">Neues Spiel</button></div><div id="lbMine" class="glist"><p class="small muted">Lade …</p></div></section>
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
        <label class="f"><span>Tempo zu Beginn</span><select id="crSpeed"><option value="0">Pausiert</option><option value="1" selected>1× (1 Tag in 12 s)</option><option value="2">2×</option><option value="4">4×</option></select></label></div>
      ${airlineFields('cra', mpState.user.name.slice(0, 20) + ' Air', mpState.user.name.slice(0, 2).toUpperCase())}
      <p class="small muted">Bis zu vier Personen, jede mit eigener Airline. Sie leiten das Spiel und bestimmen das Tempo. Läuft niemand im Spiel, steht die Zeit nach einer Minute still.</p>
      <p class="small neg" id="formErr" hidden></p>
      <div class="row"><button class="btn" type="button" id="crBack">Zurück</button><button class="btn primary" type="submit" style="margin-left:auto">Spiel anlegen</button></div>
    </form>`);
  $('#crBack').addEventListener('click', () => showLobby());
  $('#crForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = { name: $('#crGame').value.trim(), password: $('#crPw').value, difficulty: $('#crDiff').value, speed: Number($('#crSpeed').value), airline: readAirline('cra') };
    try { const r = await api('/games', { body }); toast(`Spiel angelegt. Code ${r.code}`); enterGame(r.id); }
    catch (err) { formError(err.message); }
  });
}
async function showJoin(code, token = null) {
  let g;
  try { g = await api(`/games/lookup?code=${encodeURIComponent(code)}${token ? '&t=' + encodeURIComponent(token) : ''}`); }
  catch (e) { if (e.status === 401) { mpState.pendingJoin = { code, token }; return showAuth(); } toast(e.message); return showLobby(); }
  if (g.member) return enterGame(g.id);
  const needPw = g.locked && !g.tokenOk;
  const taken = new Set(g.codes || []);
  const m = modal(`<h1>${esc(g.name)}</h1>
    <p class="ink2">Code ${esc(g.code)} · ${g.players}/${g.max} Airlines${g.names && g.names.length ? ': ' + g.names.map(esc).join(', ') : ''} · Tag ${g.day + 1}</p>
    ${g.players >= g.max ? '<div class="callout warn">Das Spiel ist voll.</div><div class="row"><button class="btn" id="jnBack">Zurück</button></div>' : `
    <form id="jnForm" class="stack">
      ${needPw ? '<label class="f"><span>Passwort des Spiels</span><input type="password" id="jnPw" autocomplete="off" required></label>' : g.locked ? '<div class="callout good">Einladungslink erkannt, kein Passwort nötig.</div>' : ''}
      ${airlineFields('jn', mpState.user.name.slice(0, 20) + ' Air', '')}
      ${taken.size ? `<p class="small muted">Schon vergeben: ${[...taken].map(esc).join(', ')}</p>` : ''}
      <p class="small muted">Sie steigen mit dem vollen Startkapital ein, auch wenn das Spiel schon läuft.</p>
      <p class="small neg" id="formErr" hidden></p>
      <div class="row"><button class="btn" type="button" id="jnBack">Zurück</button><button class="btn primary" type="submit" style="margin-left:auto">Beitreten</button></div>
    </form>`}`);
  $('#jnBack').addEventListener('click', () => showLobby());
  const f = $('#jnForm');
  if (f) f.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api(`/games/${g.id}/join`, { body: { password: needPw ? $('#jnPw').value : '', invite: token, airline: readAirline('jn') } }); history.replaceState(null, '', location.pathname); enterGame(g.id); }
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
    toast(`Willkommen in „${info.name}“`);
  } catch (e) { ui.mp = null; toast(e.message); showLobby(); }
}
function applyOnlineChrome() {
  $('#btnSave').textContent = ui.mp ? 'Einladen' : 'Speichern';
  $('#btnMenu').textContent = ui.mp ? 'Lobby' : (ONLINE ? 'Lobby' : 'Neues Spiel');
  for (const b of document.querySelectorAll('.speed button')) { const s = Number(b.dataset.speed); b.hidden = !!ui.mp && s > 4; b.disabled = !!ui.mp && !ui.mp.host; }
}
function stopOnline() { clearTimeout(mpState.timer); mpState.timer = null; ui.mp = null; mpState.clock = null; applyOnlineChrome(); }
const msPerDay = (speed) => (speed > 0 ? 12000 / speed : Infinity);
function clockProgress() {
  const c = mpState.clock; if (!c || !(c.speed > 0)) return null;
  const now = Date.now() + mpState.skew, el = Math.min(Math.max(0, now - c.lastTick), 60000);
  return (c.carry + el) / msPerDay(c.speed);
}
function scheduleNext() {
  clearTimeout(mpState.timer);
  if (!ui.mp) return;
  const p = clockProgress();
  let wait = 5000;
  if (p !== null) wait = Math.max(700, Math.min(6000, (Math.max(0, 1 - (p % 1))) * msPerDay(mpState.clock.speed) + 300));
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
  if (first) { resetUi(); startWorld(); }
  else {
    for (const al of W.list) W.operableFreq(al);
    buildSchedules(); renderHeader(); renderTabs(); renderMapRoutes(); renderPane(); renderDraft();
  }
  const pl = W.player;
  if (!pl) return;
  if (pl.status === 'insolvent') { gameOver(); return; }
  if (prev) {
    if (pl.decisions.length > prev.dec && openDecisions().length) { setTab('cockpit'); toast('Entscheidung nötig: Die Gewerkschaft droht mit Streik.'); }
    const crit = pl.events.slice(Math.max(0, pl.events.length - (pl.events.length - prev.ev))).filter((e) => e.kind === 'crit' && e.day >= prev.day).pop();
    if (crit) toast(crit.msg);
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
async function mpSetSpeed(s) {
  if (!ui.mp) return;
  if (!ui.mp.host) { toast('Nur die Spielleitung ändert das Tempo.'); return; }
  try { await api(`/games/${ui.mp.id}/control`, { body: { speed: s } }); mpPoll(false); } catch (e) { toast(e.message); }
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
    return `<tr><td><span class="sw" style="background:${colorOf(al)}"></span> ${esc(al.name)}${al.id === W.playerId ? ' <span class="chip me">Sie</span>' : ''}${al.status === 'insolvent' ? ' <span class="chip crit">insolvent</span>' : ''}</td><td class="small muted">${esc(p.name || '')}${p.online ? ' · online' : ''}</td><td class="r">${al.fleet.length} Flz.</td><td class="r">${al.activeRoutes().length} Str.</td></tr>`;
  }).join('');
  return `<div class="stack"><div class="spread"><h2 class="sec">Mitspielende <small>${esc(ui.mp.name)} · Code ${esc(ui.mp.code)}</small></h2><button class="btn small" data-act="invite">Einladen</button></div><table class="t"><tbody>${rows}</tbody></table>
    ${mpState.clock ? `<p class="small muted">Tempo ${mpState.clock.speed ? mpState.clock.speed + '×' : 'pausiert'}${ui.mp.host ? ' · Sie leiten das Spiel und stellen das Tempo oben ein.' : ' · Die Spielleitung stellt das Tempo ein.'}${ui.mpOffline ? ' · <span class="neg">Verbindung unterbrochen</span>' : ''}</p>` : ''}</div>`;
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
function setSpeed(s) { ui.speed = s; for (const b of document.querySelectorAll('.speed button')) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s)); }
function stepDay() {
  const m0 = SM.monthOf(W.day), pl = W.player, ev0 = pl.events.length, news0 = W.news.length;
  W.step();
  if (SM.monthOf(W.day) !== m0) saveGame(false);
  buildSchedules();
  renderHeader(); renderTabs(); renderMapRoutes(); renderPane();
  if (pl.status === 'insolvent') { gameOver(); return; }
  if (pl.decisions.length > ui.decisionsSeen && openDecisions().length) {
    ui.decisionsSeen = pl.decisions.length; setSpeed(0); setTab('cockpit');
    toast('Entscheidung nötig: Die Gewerkschaft droht mit Streik.');
    return;
  }
  ui.decisionsSeen = pl.decisions.length;
  const crit = pl.events.slice(ev0).find((e) => e.kind === 'crit') || W.news.slice(news0).find((n) => n.kind === 'crit');
  if (crit) toast(crit.msg);
}
let lastTs = null;
function frame(ts) {
  if (W) {
    const dt = lastTs === null ? 0 : Math.min(0.25, (ts - lastTs) / 1000);
    if (ui.mp) { const pr = clockProgress(); if (pr !== null) ui.t = Math.min(0.999, pr); }
    else if (ui.speed > 0 && $('#modal').hidden) {
      ui.t += dt * ui.speed / 12;
      if (ui.t >= 1) { ui.t -= 1; if (ui.t > 0.5) ui.t = 0.0; stepDay(); }
    }
    renderPlanes();
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
  initMap();
  $('#pane').addEventListener('click', onPaneClick);
  $('#pane').addEventListener('change', onPaneChange);
  $('#pane').addEventListener('input', (e) => { if (e.target.type === 'number') onPaneInput(e); });
  $('#gPlanes').addEventListener('pointerdown', (e) => { const g = e.target.closest('.plane'); if (!g) return; e.stopPropagation(); ui.sel = { ac: g.dataset.ac }; renderPlanes.last = 0; renderPlaneCard(); });
  $('#planeCard').addEventListener('click', (e) => { const b = e.target.closest('[data-pc]'); if (!b) return; if (b.dataset.pc === 'close') { ui.sel = null; $('#planeCard').hidden = true; } else { ui.expanded = b.dataset.id; setTab('routes'); renderMapRoutes(true); } });
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  for (const b of document.querySelectorAll('.speed button')) b.addEventListener('click', () => (ui.mp ? mpSetSpeed(Number(b.dataset.speed)) : setSpeed(Number(b.dataset.speed))));
  $('#btnSave').addEventListener('click', () => (ui.mp ? showInvite() : saveGame(true)));
  $('#btnMenu').addEventListener('click', () => (ONLINE ? (mpState.user ? showLobby() : showAuth()) : showStart(true)));
  $('#tglAi').addEventListener('click', (e) => { ui.showAi = !ui.showAi; e.currentTarget.setAttribute('aria-pressed', String(ui.showAi)); e.currentTarget.textContent = ui.showAi ? 'Konkurrenz ausblenden' : 'Konkurrenz zeigen'; renderMapRoutes(true); });
  $('#tglAi').textContent = 'Konkurrenz ausblenden';
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName) && $('#modal').hidden) { e.preventDefault(); if (ui.mp) { if (ui.mp.host) mpSetSpeed(mpState.clock && mpState.clock.speed ? 0 : 1); } else setSpeed(ui.speed ? 0 : 1); }
  });
  try { window.claude?.hot?.snapshot?.(() => ({ save: W ? SM.serialize(W) : null, tab: ui.tab })); } catch (e) { /* ohne Hot-Reload */ }
  if (hotData && hotData.save) {
    try { W = SM.deserialize(hotData.save); resetUi(); ui.tab = hotData.tab || 'cockpit'; startWorld(); } catch (e) { W = null; }
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
