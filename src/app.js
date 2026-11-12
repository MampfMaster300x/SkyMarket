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
const slotTxt = (apt) => { const f = Math.max(0, W.slotsFree(apt) - W.waitBlock(apt, W.player)), h = W.player.heldAt(apt, W.day); return h ? `${f + h} (${h} aus Ihrer Reserve)` : String(f); };
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
/** 0.21.62: Spieler-Airlines in ihrer festen Farbe – auf jedem Gerät gleich, auch die eigene. */
const humHex = (c) => (P.AL_COLORS[(c || 1) - 1] || P.AL_COLORS[0]).hex;
const colorOf = (al) => (al.archetype ? `var(--ai${al.color})` : humHex(al.color));
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
// 0.21.49: Karte in Ebenen – während Ziehen/Zoomen wird nur die fertig gezeichnete SVG-Ebene per CSS verschoben/skaliert (Grafikkarte),
// das eigentliche Neuzeichnen (Strecken, Flughäfen) folgt gebündelt höchstens alle 400 ms und am Ende der Geste. Flugzeuge liegen auf einem eigenen Canvas.
// Die SVG-Ebene ist rundum um ein Viertel größer als der sichtbare Ausschnitt (Überstand), damit beim Ziehen fertig gezeichnete Karte nachrückt.
const committed = { tx: 0, ty: 0, k: 1 }, over = { x: 0, y: 0 };
let commitT = null, lastCommit = 0;
function sizeMapLayer(svg = $('#map')) {
  if (!svg) return;
  over.x = Math.round(view.w * 0.25); over.y = Math.round(view.h * 0.25);
  const W2 = view.w + 2 * over.x, H2 = view.h + 2 * over.y;
  svg.setAttribute('viewBox', `${-over.x} ${-over.y} ${W2} ${H2}`);
  Object.assign(svg.style, { left: -over.x + 'px', top: -over.y + 'px', width: W2 + 'px', height: H2 + 'px', transformOrigin: `${over.x}px ${over.y}px` });
  const sea = $('#mapSea'); if (sea) { sea.setAttribute('x', -over.x); sea.setAttribute('y', -over.y); sea.setAttribute('width', W2); sea.setAttribute('height', H2); }
}
function applyView(live = false) {
  clampView();
  const svg = $('#map');
  if (live && svg) {
    const s = view.k / committed.k, Tx = view.tx - committed.tx * s, Ty = view.ty - committed.ty * s;
    svg.style.transform = `translate(${Tx.toFixed(2)}px,${Ty.toFixed(2)}px) scale(${s.toFixed(5)})`;
    ui.planesNow = true;
    clearTimeout(commitT);
    // sichtbarer Ausschnitt in Koordinaten der gezeichneten Ebene – reicht der Überstand nicht mehr (oder wird es zu unscharf), neu zeichnen
    const x0 = -Tx / s, x1 = (view.w - Tx) / s, y0 = -Ty / s, y1 = (view.h - Ty) / s;
    const out = x0 < -over.x || x1 > view.w + over.x || y0 < -over.y || y1 > view.h + over.y || s > 1.6 || s < 0.62;
    if (out && performance.now() - lastCommit > 150) commitView(); else commitT = setTimeout(commitView, out ? 60 : 180);
    return;
  }
  commitView();
}
function commitView() {
  clearTimeout(commitT); commitT = null; lastCommit = performance.now();
  $('#gWorld').setAttribute('transform', `translate(${view.tx.toFixed(2)},${view.ty.toFixed(2)}) scale(${view.k.toFixed(5)})`);
  const svg = $('#map'); if (svg && svg.style.transform) svg.style.transform = '';
  committed.tx = view.tx; committed.ty = view.ty; committed.k = view.k;
  ui.viewDirty = true; ui.planesNow = true;
  if (W && W.player && $('#gApts')) renderAirports();   // sofort, damit Flughäfen und Hintergrund im selben Bild stimmen
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
  sizeMapLayer();
  view.tx = a.w / 2 - cx * view.k; view.ty = a.h / 2 - cy * view.k;
  sizePlaneCanvas();
  applyView();
}
function zoomAt(f, sx, sy, live = false) {
  const k2 = Math.max(kMin(), Math.min(14, view.k * f));
  view.tx = sx - (sx - view.tx) * k2 / view.k; view.ty = sy - (sy - view.ty) * k2 / view.k; view.k = k2;
  applyView(live);
}
function initMap() {
  const svg = $('#map');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = `<rect id="mapSea" x="0" y="0" width="100%" height="100%" fill="var(--sea)"/>
    <g id="gWorld"><path class="land" d="${MAP.land}"/><g id="gGrey"></g><path class="borders" d="${MAP.borders}"/><g id="gRoutes"></g><g id="gDraft"></g></g>
    <g id="gApts"></g>`;
  if (!$('#mapPlanes')) { const cv = document.createElement('canvas'); cv.id = 'mapPlanes'; cv.setAttribute('aria-hidden', 'true'); svg.after(cv); }
  planeCv.el = $('#mapPlanes'); planeCv.ctx = planeCv.el.getContext('2d');
  const a = mapArea(); view.w = a.w; view.h = a.h; sizeMapLayer(svg); sizePlaneCanvas();
  window.addEventListener('resize', fitMap);
  if (window.ResizeObserver) new ResizeObserver(() => fitMap()).observe($('#mapwrap'));
  // Zoom und Verschieben (Maus, Rad, Touch mit zwei Fingern)
  const ptrs = new Map(); let drag = null, pinch = null;
  // Bezug ist der Rahmen, nicht das SVG selbst – das wird während einer Geste per CSS verschoben/skaliert
  const local = (e) => { const wp = svg.parentNode, r = wp.getBoundingClientRect(); return [e.clientX - r.left - wp.clientLeft, e.clientY - r.top - wp.clientTop]; };
  svg.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = local(e); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), x, y, true); }, { passive: false });
  svg.addEventListener('pointerdown', (e) => {
    { const [lx, ly] = local(e), hp = ptrs.size ? null : planeAt(lx, ly);   // Flugzeuge liegen auf dem Canvas darüber: Treffer hier prüfen
      if (hp) { ui.suppressClick = performance.now(); ui.sel = { ac: hp.ac }; $('#aptCard').hidden = true; renderPlanes.last = 0; renderPlaneCard(); ui.planesNow = true; return; } }
    ptrs.set(e.pointerId, local(e));
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    if (ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; pinch = { d: Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), k: view.k, tx: view.tx, ty: view.ty, m: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2] }; drag = null; }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse') { const [lx, ly] = local(e), hp = planeAt(lx, ly), cur = hp ? 'pointer' : ''; if (svg.style.cursor !== cur) svg.style.cursor = cur; } return; }
    ptrs.set(e.pointerId, local(e));
    if (pinch && ptrs.size === 2) {
      const [p1, p2] = [...ptrs.values()], d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
      const k2 = Math.max(kMin(), Math.min(14, pinch.k * d / pinch.d)), m = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      view.k = k2; view.tx = m[0] - (pinch.m[0] - pinch.tx) * k2 / pinch.k; view.ty = m[1] - (pinch.m[1] - pinch.ty) * k2 / pinch.k;
      applyView(true); return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 4) { drag.moved = true; try { svg.setPointerCapture(e.pointerId); } catch (err) { /* egal */ } }
      if (drag.moved) { view.tx = drag.tx + dx; view.ty = drag.ty + dy; applyView(true); }
    }
  });
  const end = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { if (drag && drag.moved) { ui.suppressClick = performance.now(); commitView(); } drag = null; } };
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
  const pl = W.player, stations = new Set(stationsOf(pl)), k = view.k, pw = mapArea().pw;   // einmal je Aufruf (liest berechnete Stile)
  const rankLim = k < 0.55 ? 12 : k < 0.9 ? 30 : k < 1.6 ? 60 : 200;
  let html = '';
  const placed = [];
  const order = SM.AP_CODES.slice().sort((x, y) => (stations.has(y) - stations.has(x)) || ((P.AIRPORTS[y].pax || 0) - (P.AIRPORTS[x].pax || 0)));
  for (const c of order) {
    const a = P.AIRPORTS[c], [mx, my] = pt(c);
    let shown = false;
    for (const dx of [0, -MAP.W, MAP.W]) {
      const [x, y] = toScreen(mx + dx, my);
      if (x < -over.x - 40 || y < -over.y - 40 || x > view.w + over.x + 40 || y > view.h + over.y + 40) continue;   // auch im Überstand
      shown = true;
      const mine = stations.has(c), base = pl.bases.includes(c), sel = ui.selApt === c, ev = aptEventState(c), dd = ui.dead && ui.dead.has(a.country);
      const r = 2.6 + Math.sqrt(a.pax || 20) * 0.32;
      let label = mine || sel || (a.rank || 999) <= rankLim || (!a.rank && k >= 1.6);
      if (label && !mine && !sel && placed.some(([px, py]) => Math.abs(px - x) < 34 && Math.abs(py - y) < 13)) label = false;
      if (label) placed.push([x, y]);
      const city = (k >= 2.6 && label) || base || sel;
      const left = x > view.w - pw - 120;
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
/** 0.21.61: In der Legende ausgeblendete Airlines (je Spiel im Browser gemerkt). */
const hideKey = () => `sky-hideal-${ui.mp ? ui.mp.id : 'solo'}`;
function hiddenAl() {
  if (!ui.hideAl || ui.hideAl.key !== hideKey()) { let ids = []; try { ids = JSON.parse(localStorage.getItem(hideKey()) || '[]'); } catch (e) { ids = []; } ui.hideAl = { key: hideKey(), set: new Set(Array.isArray(ids) ? ids : []) }; }
  return ui.hideAl.set;
}
function toggleHideAl(id) {
  const h = hiddenAl(); if (h.has(id)) h.delete(id); else h.add(id);
  try { localStorage.setItem(hideKey(), JSON.stringify([...h])); } catch (e) { /* nur für diese Sitzung */ }
  renderMapRoutes(true); ui.planesNow = true;
}
function visibleAl(al) {
  if (al.id === W.playerId) return true;
  if (hiddenAl().has(al.id)) return false;
  if (al.status === 'insolvent' || al.removed) return false;   // insolvente und entfernte Airlines verschwinden von der Karte
  if (!al.archetype) return ui.flightFilter !== 'mine';
  return ui.flightFilter === 'all' && ui.showAi;
}
function renderMapRoutes(force = false) {
  const evs = SM.AP_CODES.map(aptEventState).join(','), dead = deadCountries();
  const sig = dead.join('') + W.list.map((al) => al.activeRoutes().map((r) => r.id + r.freq + (r.flyingToday || 0)).join(',') + (al.cg ? al.cgRoutes().map((q) => q.id + q.freq).join(',') : '')).join('|') + ui.showAi + ui.flightFilter + ui.expanded + ui.selApt + [...hiddenAl()].join() + evs + W.player.bases.join() + '|' + W.day + '|' + W.geoLists().fly.map((e) => e.id).join();
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
      if (me) mine += `<path class="rt meglow" d="${d}"/><path class="rt me${(r.flyingToday || 0) < r.freq || todayOps(r).canc > 0 ? ' wait' : ''}${ui.expanded === r.id ? ' hl' : ''}" d="${d}"/>`;
      else if (!al.archetype) hum += `<path class="rt huglow" d="${d}" stroke="${colorOf(al)}"/><path class="rt hu" d="${d}" stroke="${colorOf(al)}"/>`;
      else ai += `<path class="rt ai" d="${d}" stroke="${colorOf(al)}"/>`;
    }
  }
  // 0.21.56: Frachtstrecken gestrichelt (eigene kräftig, andere dünn)
  let cg = '';
  for (const al of W.list) { if (!al.cg || al.status === 'insolvent' || (al.id !== W.playerId && !visibleAl(al))) continue; for (const q of al.cgRoutes()) cg += `<path class="rt ${al.id === W.playerId ? 'cg' : 'cgai'}" d="${lineD(gcLine(q.base, q.dest))}"${al.id === W.playerId ? '' : ` stroke="${colorOf(al)}"`}/>`; }
  document.documentElement.style.setProperty('--mine', humHex(W.player.color));
  $('#gRoutes').innerHTML = ai + hum + cg + mine;
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
  const items = [`<span><i style="background:${colorOf(W.player)};box-shadow:0 0 8px ${colorOf(W.player)}"></i>${esc(W.player.name)}</span>`]
    .concat(ui.flightFilter === 'mine' ? [] : W.humans.filter((h) => h.id !== W.playerId && !h.removed && h.status !== 'insolvent').map((h) => { const off = hiddenAl().has(h.id); return `<button class="lg${off ? ' off' : ''}" data-lg="${h.id}" aria-pressed="${!off}" title="${off ? 'Einblenden' : 'Im Streckennetz ausblenden'}"><i style="background:${colorOf(h)};box-shadow:0 0 8px ${colorOf(h)}"></i>${esc(h.name)}</button>`; }));
  if (ui.flightFilter === 'all') items.push(`<button class="lg${ui.showAi ? '' : ' off'}" data-lg="_ai" aria-pressed="${!!ui.showAi}" title="${ui.showAi ? 'KI-Konkurrenz ausblenden' : 'KI-Konkurrenz einblenden'}"><i style="background:var(--plane-ai)"></i>${n} Konkurrenten</button>`);
  if (SM.AP_CODES.some((c) => aptEventState(c) === 'bad')) items.push('<span><i class="ring crit"></i>Störung</span>');
  if (SM.AP_CODES.some((c) => aptEventState(c) === 'good')) items.push('<span><i class="ring good"></i>Großereignis</span>');
  if (ui.dead && ui.dead.size) items.push('<span><i style="background:#6b7280"></i>keine Nachfrage</span>');
  if (W && W.geoLists().fly.length) items.push('<span><i style="background:transparent;border:1.5px dashed var(--crit)"></i>Überflug gesperrt</span>');
  if (hiddenAl().size) items.push(`<button class="lg lg-all" data-lg="_all">alle einblenden</button>`);
  const lg = $('#legend'); lg.innerHTML = `<div class="row">${items.join('')}</div>`;
  lg.onclick = (e) => { const b = e.target.closest('[data-lg]'); if (!b) return; e.stopPropagation(); const id = b.dataset.lg;
    if (id === '_ai') { ui.showAi = !ui.showAi; const t = $('#tglAi'); if (t) t.setAttribute('aria-pressed', String(ui.showAi)); renderMapRoutes(true); ui.planesNow = true; return; }
    if (id === '_all') { hiddenAl().clear(); try { localStorage.removeItem(hideKey()); } catch (x) { /* egal */ } renderMapRoutes(true); ui.planesNow = true; return; }
    toggleHideAl(id); };
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
/** Concorde: schlanker Rumpf, abgesenkte Nase, Deltaflügel, hohes Seitenleitwerk ohne Höhenleitwerk. */
function sstSvg(t, o) {
  const color = o.sil ? '#22304f' : o.color || 'var(--accent)', code = (o.code || '').slice(0, 2), f = (x) => x.toFixed(1);
  const x0 = 14, xe = 306, L = xe - x0, cy = 50, h = 11, top = cy - h / 2, bot = cy + h / 2;
  const fus = `M${f(x0)},${f(cy + 3)} L${f(x0 + 26)},${f(top + 1)} C${f(x0 + 40)},${f(top - 0.5)} ${f(x0 + 60)},${f(top)} ${f(x0 + 70)},${f(top)} L${f(xe - 30)},${f(top)} C${f(xe - 12)},${f(top)} ${f(xe - 4)},${f(top - 1)} ${f(xe)},${f(top - 2)} L${f(xe)},${f(top + 3)} C${f(xe - 10)},${f(bot)} ${f(xe - 30)},${f(bot)} ${f(xe - 40)},${f(bot)} L${f(x0 + 40)},${f(bot)} C${f(x0 + 28)},${f(bot)} ${f(x0 + 12)},${f(cy + 4)} ${f(x0)},${f(cy + 3)}Z`;
  const fin = `M${f(xe - L * 0.17)},${f(top + 0.5)} L${f(xe - L * 0.06)},${f(top - 27)} L${f(xe - L * 0.025)},${f(top - 27)} L${f(xe - 2)},${f(top - 2)}Z`;
  const wing = `M${f(x0 + L * 0.36)},${f(bot - 1)} C${f(x0 + L * 0.5)},${f(bot + 1)} ${f(x0 + L * 0.7)},${f(bot + 3)} ${f(xe - L * 0.06)},${f(bot + 3.2)} L${f(xe - L * 0.06)},${f(bot + 0.5)}Z`;
  const eng = [0.6, 0.66].map((k, i) => `<rect x="${f(x0 + L * k)}" y="${f(bot + 2.4 + i * 0.6)}" width="${f(L * 0.17)}" height="6" rx="1.2" fill="var(--eng,var(--fus))" stroke="var(--fus-line)" stroke-width=".8" ${i ? '' : 'opacity=".75"'}/>`).join('');
  let win = ''; for (let x = x0 + 34; x < xe - L * 0.24; x += 5.2) win += `<rect x="${f(x)}" y="${f(cy - 2.6)}" width="2" height="2.6" rx=".9"/>`;
  const gear = `<line x1="${f(x0 + 44)}" y1="${f(bot)}" x2="${f(x0 + 44)}" y2="${f(bot + 10)}" stroke="var(--gear)" stroke-width="1.2"/><circle cx="${f(x0 + 44)}" cy="${f(bot + 11)}" r="2.4" fill="var(--gear)"/>
    <line x1="${f(x0 + L * 0.6)}" y1="${f(bot + 3)}" x2="${f(x0 + L * 0.6)}" y2="${f(bot + 10)}" stroke="var(--gear)" stroke-width="1.6"/><circle cx="${f(x0 + L * 0.6)}" cy="${f(bot + 11.5)}" r="3" fill="var(--gear)"/>`;
  const label = o.pix ? `<image${o.pixId ? ` id="${o.pixId}"` : ''} href="${o.pix}" x="${f(xe - L * 0.065 - 6.5)}" y="${f(top - 20)}" width="13" height="13" style="image-rendering:pixelated"/>` : code ? `<text x="${f(xe - L * 0.065)}" y="${f(top - 11)}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="8" fill="${o.ink || 'var(--on-accent)'}">${esc(code)}</text>` : '';
  const LV = o.skin ? skinLivery(o.skin, { fus, fin, x0, xe, top, bot, cy, h, L, fh: 27, eyes: !!o.eyes }) : o.sil ? SIL : null;   // Aircraft Collection: Skin-Lackierung bzw. Silhouette
  if (o.geo) o.geo({ x0, xe, top, bot, cy, h, L });   // 0.21.69: Maße für die aufrechte Walkout-Figur
  return `<svg class="${o.cls || 'acv'}" viewBox="0 0 320 76" role="img" aria-label="${esc(t.label)}"${LV ? ` style="${LV.style}"` : ''}>${LV ? LV.defs : ''}
    <ellipse cx="160" cy="${f(bot + 14)}" rx="${f(L * 0.42)}" ry="2.2" fill="#000" opacity=".1"/>${gear}
    <path d="${fin}" fill="${LV ? LV.fin : color}"/>${LV ? LV.finOver : ''}<path d="${fus}" fill="${LV ? LV.body : 'var(--fus)'}" stroke="var(--fus-line)" stroke-width=".9"/>${LV ? LV.over : ''}
    <path d="M${f(x0 + 40)},${f(cy + 2.2)} L${f(xe - L * 0.2)},${f(cy + 2.2)}" stroke="${LV ? LV.stripe : color}" stroke-width="1.8" stroke-linecap="round"/>
    <g fill="var(--glass)">${win}</g><path d="M${f(x0 + 18)},${f(cy - 0.5)} L${f(x0 + 27)},${f(top + 1.6)} L${f(x0 + 31)},${f(top + 1.6)} L${f(x0 + 27)},${f(cy - 0.5)}Z" fill="var(--glass)"/>
    <path d="${wing}" fill="var(--fus-line)"/>${eng}${LV ? '' : label}${LV && LV.eyes ? LV.eyes : ''}
  </svg>`;
}
function acSvg(id, o = {}) {
  const t = P.AIRCRAFT_TYPES[id]; if (!t) return '';
  if (t.ill.kind === 'sst') return sstSvg(t, o);
  const I = t.ill, color = o.sil ? '#22304f' : o.color || 'var(--accent)', code = (o.code || '').slice(0, 2);
  const f = (x) => x.toFixed(1);
  const L = 150 + 150 * I.len, x0 = (320 - L) / 2, xe = x0 + L, prop = I.kind === 'prop';
  const h = prop ? 17 : I.deck2 ? 27 : 19 + (I.len >= 0.95 ? 1 : 0), cy = I.deck2 ? 49 : 52, top = cy - h / 2, bot = cy + h / 2;
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
  const cabinX0 = x0 + h * 1.7, cabinX1 = xe - L * 0.25, n = I.cargo ? 0 : Math.floor((cabinX1 - cabinX0) / 6.3);
  let win = '';
  for (let k = 0; k < n; k++) win += I.deck2 ? `<rect x="${f(cabinX0 + k * 6.3)}" y="${f(top + 5)}" width="2.8" height="3.2" rx="1.2"/><rect x="${f(cabinX0 + k * 6.3)}" y="${f(top + 14)}" width="2.8" height="3.4" rx="1.2"/>` : `<rect x="${f(cabinX0 + k * 6.3)}" y="${f(cy - h * 0.2)}" width="2.8" height="3.4" rx="1.2"/>`;
  // 747: Buckel mit Oberdeck vorn
  const hump = I.hump ? `<path d="M${f(x0 + h * 0.75)},${f(top + 1.5)} C${f(x0 + h * 1.4)},${f(top - 7)} ${f(x0 + L * 0.16)},${f(top - 8)} ${f(x0 + L * 0.27)},${f(top - 7.5)} C${f(x0 + L * 0.33)},${f(top - 7)} ${f(x0 + L * 0.37)},${f(top - 2)} ${f(x0 + L * 0.4)},${f(top + 0.4)}Z" fill="var(--fus)" stroke="var(--fus-line)" stroke-width=".9"/>${Array.from({ length: 7 }, (_, k) => `<rect x="${f(x0 + L * 0.09 + k * 6.3)}" y="${f(top - 4.5)}" width="2.6" height="3" rx="1.1" fill="var(--glass)"/>`).join('')}` : '';
  const doors = [x0 + h * 1.25, cabinX1 + 3].map((x) => `<rect x="${f(x)}" y="${f(top + 3)}" width="4.6" height="${f(h - 6)}" rx="1.4" fill="none" stroke="var(--fus-line)" stroke-width=".7"/>`).join('');
  const shield = `<path d="M${f(x0 + h * 0.32)},${f(cy - h * 0.12)} L${f(x0 + h * 0.72)},${f(top + h * 0.22)} L${f(x0 + h * 1.08)},${f(top + h * 0.22)} L${f(x0 + h * 1.02)},${f(cy - h * 0.12)}Z" fill="var(--glass)"/>`;
  let wing, eng, gear;
  if (prop) {
    const wx = x0 + L * 0.37;
    wing = `<path d="M${f(wx)},${f(top + 0.5)} L${f(wx + L * 0.2)},${f(top + 0.5)} L${f(wx + L * 0.18)},${f(top + 3.2)} L${f(wx + L * 0.015)},${f(top + 3.2)}Z" fill="var(--fus-line)"/>`;
    const nl = I.fin === 'dash' ? L * 0.17 : L * 0.12, nx = wx - L * 0.025;
    eng = `<rect x="${f(nx)}" y="${f(top - 1)}" width="${f(nl)}" height="9" rx="4" fill="var(--eng,var(--fus))" stroke="var(--fus-line)" stroke-width=".8"/>
      <ellipse cx="${f(nx - 1.5)}" cy="${f(top + 3.5)}" rx="1.4" ry="15" fill="var(--ink-3)" opacity=".28"/><ellipse cx="${f(nx - 1)}" cy="${f(top + 3.5)}" rx="2.6" ry="2.4" fill="var(--ink-2)"/>`;
    const gx = I.fin === 'dash' ? nx + nl - 6 : x0 + L * 0.5;
    gear = `<line x1="${f(x0 + h * 1.4)}" y1="${f(bot - 1)}" x2="${f(x0 + h * 1.4)}" y2="${f(bot + 5)}" stroke="var(--gear)" stroke-width="1.2"/><circle cx="${f(x0 + h * 1.4)}" cy="${f(bot + 6)}" r="2.4" fill="var(--gear)"/>
      <line x1="${f(gx)}" y1="${f(bot - 2)}" x2="${f(gx)}" y2="${f(bot + 4)}" stroke="var(--gear)" stroke-width="1.6"/><circle cx="${f(gx)}" cy="${f(bot + 5.5)}" r="3.2" fill="var(--gear)"/>
      ${I.fin === 'dash' ? '' : `<path d="M${f(x0 + L * 0.44)},${f(bot)} Q${f(x0 + L * 0.5)},${f(bot + 4)} ${f(x0 + L * 0.58)},${f(bot)}Z" fill="var(--fus)" stroke="var(--fus-line)" stroke-width=".7"/>`}`;
  } else {
    const wx = x0 + L * 0.37;
    wing = `<path d="M${f(wx)},${f(bot - 3)} L${f(wx + L * 0.22)},${f(bot - 1.2)} L${f(wx + L * 0.235)},${f(bot + 0.8)} L${f(wx + L * 0.02)},${f(bot + 0.6)}Z" fill="var(--fus-line)"/>`;
    const el = (I.neo ? 36 : 31) * L / 290, eh = I.neo ? 11.5 : 10, flat = I.fin === 'boeing', ex = wx - el * 0.45, ey = bot - (flat ? 1.5 : 0.5);
    const ex2 = ex + L * 0.12, ey2 = ey - 2.5;
    eng = (I.eng4 ? `<rect x="${f(ex2)}" y="${f(ey2)}" width="${f(el * 0.92)}" height="${f(eh * 0.92)}" rx="${f(eh / 2)}" fill="var(--eng,var(--fus))" stroke="var(--fus-line)" stroke-width=".8" opacity=".8"/><ellipse cx="${f(ex2 + 1.5)}" cy="${f(ey2 + eh * 0.46)}" rx="1.6" ry="${f(eh * 0.46 - 1)}" fill="var(--glass)" opacity=".7"/>` : '') + `<line x1="${f(ex + el * 0.6)}" y1="${f(bot - 1)}" x2="${f(ex + el * 0.75)}" y2="${f(ey + 2)}" stroke="var(--fus-line)" stroke-width="2"/>
      <rect x="${f(ex)}" y="${f(ey)}" width="${f(el)}" height="${f(eh)}" rx="${f(eh / 2)}" fill="var(--eng,var(--fus))" stroke="var(--fus-line)" stroke-width=".8"/>
      <ellipse cx="${f(ex + 1.6)}" cy="${f(ey + eh / 2)}" rx="1.8" ry="${f(eh / 2 - 1)}" fill="var(--glass)" opacity=".85"/>
      <path d="M${f(ex + el - 1)},${f(ey + 2.5)} L${f(ex + el + 4)},${f(ey + eh / 2)} L${f(ex + el - 1)},${f(ey + eh - 2.5)}Z" fill="var(--fus-line)"/>
      <rect x="${f(ex + el * 0.25)}" y="${f(ey + eh / 2 - 0.7)}" width="${f(el * 0.45)}" height="1.4" fill="${color}" opacity=".9"/>`;
    const gx = x0 + L * 0.53;
    gear = `<line x1="${f(x0 + h * 1.45)}" y1="${f(bot - 1)}" x2="${f(x0 + h * 1.45)}" y2="${f(bot + 6)}" stroke="var(--gear)" stroke-width="1.2"/><circle cx="${f(x0 + h * 1.45)}" cy="${f(bot + 7)}" r="2.6" fill="var(--gear)"/>
      <line x1="${f(gx)}" y1="${f(bot - 1)}" x2="${f(gx)}" y2="${f(bot + 5)}" stroke="var(--gear)" stroke-width="1.6"/><circle cx="${f(gx)}" cy="${f(bot + 7)}" r="3.4" fill="var(--gear)"/>`;
  }
  const pixS = prop ? 12 : 14, label = o.pix ? `<image${o.pixId ? ` id="${o.pixId}"` : ''} href="${o.pix}" x="${f((tailX + xe) / 2 + (prop ? 4 : 2) - pixS / 2)}" y="${f(top - fh * 0.42 - pixS * 0.62)}" width="${pixS}" height="${pixS}" style="image-rendering:pixelated" preserveAspectRatio="xMidYMid meet"/>` : code ? `<text x="${f((tailX + xe) / 2 + (prop ? 4 : 2))}" y="${f(top - fh * 0.42)}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="${prop ? 8 : 9}" fill="${o.ink || 'var(--on-accent)'}">${esc(code)}</text>` : '';
  const LV = o.skin ? skinLivery(o.skin, { fus, fin, x0, xe, top, bot, cy, h, L, fh, eyes: !!o.eyes }) : o.sil ? SIL : null;   // Aircraft Collection: Skin-Lackierung bzw. Silhouette
  if (o.geo) o.geo({ x0, xe, top, bot, cy, h, L });   // 0.21.69: Maße für die aufrechte Walkout-Figur
  return `<svg class="${o.cls || 'acv'}" viewBox="0 0 320 76" role="img" aria-label="${esc(t.label)}"${LV ? ` style="${LV.style}"` : ''}>${LV ? LV.defs : ''}
    <ellipse cx="160" cy="${f(bot + 10.5)}" rx="${f(L * 0.42)}" ry="2.4" fill="#000" opacity=".1"/>
    ${gear}${prop ? '' : eng}
    <path d="${fin}" fill="${LV ? LV.fin : color}"/>${LV ? LV.finOver : ''}
    <path d="${fus}" fill="${LV ? LV.body : 'var(--fus)'}" stroke="var(--fus-line)" stroke-width=".9"/>${hump}${LV ? LV.over : ''}
    <path d="M${f(x0 + h * 1.1)},${f(cy + h * 0.28)} L${f(tailX - 4)},${f(cy + h * 0.28)}" stroke="${LV ? LV.stripe : color}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="${stab}" fill="${prop ? (LV ? LV.fin : color) : 'var(--fus-line)'}"/>
    <g fill="var(--glass)">${win}</g>${doors}${shield}${wing}${prop ? eng : ''}${LV ? '' : label}${LV && LV.eyes ? LV.eyes : ''}
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
    const me = al.id === W.playerId, rotIdx = {}, risks = {};
    // Ausfälle des Tages: dieselben Würfel wie die Tagessimulation – annullierte Umläufe bleiben am Boden
    const cx = (r, k) => { const acc = rotIdx[r.id] || 0; rotIdx[r.id] = acc + 1 / k; const i = Math.floor(acc + 1e-9); const rk = risks[r.id] || (risks[r.id] = W.legRisk(al, r)); const x = W.legCancel(al, r, i, W.day, rk); return x.c ? x.why : null; };
    al.fleet.forEach((a, idx) => {
      if (!a.assigned || !a.assigned.length || a.delivery_day > W.day) return;
      const share = {};
      let t = 6 + ((idx * 0.37) % 1.4);
      const legs = [];
      for (const rid of a.assigned) {
        const r = byId[rid]; if (!r) continue;
        const tid = r.mix && a.type_id === r.mix.type_id ? a.type_id : r.type_id;   // 0.21.42: zweites Muster
        const bh = SM.blockHours(r.base, r.dest, tid), turn = SM.turnHours(tid, r.service, r.buffer);
        const w = SM.winOf(tid), rot = 2 * bh + 2 * turn;
        if (rot > w) {
          // Langer Umlauf auf mehreren Flugzeugen: jedes startet an jedem k-ten Tag
          const k = SM.kOf(tid, rot) || 1, slot = (share[rid] = share[rid] ?? (idx % k)), dOff = (W.day + slot) % k;
          const t0 = 8 + (idx % 3) - 24 * dOff, x = cx(r, k);
          legs.push({ a: r.base, b: r.dest, t0, t1: t0 + bh, r, dir: 'out', x });
          legs.push({ a: r.dest, b: r.base, t0: t0 + bh + turn, t1: t0 + 2 * bh + turn, r, dir: 'in', x });
          continue;
        }
        const x = cx(r, 1);
        legs.push({ a: r.base, b: r.dest, t0: t, t1: t + bh, r, dir: 'out', x }); t += bh + turn;
        legs.push({ a: r.dest, b: r.base, t0: t, t1: t + bh, r, dir: 'in', x }); t += bh + turn;
      }
      const kind = P.AIRCRAFT_TYPES[a.type_id].ill.kind;
      if (legs.length) schedules.push({ me, al, ac: a, icon: kind === 'prop' ? ICON_PROP : kind === 'wide' ? ICON_WIDE : ICON_JET, legs, lines: legs.map((l) => gcLine(l.a, l.b)) });
    });
  }
}
function legAt(s, h) {
  for (let i = 0; i < s.legs.length; i++) {
    const l = s.legs[i]; if (l.x) continue;   // annulliert: das Flugzeug bleibt am Boden
    for (const off of [0, 24]) if (h + off >= l.t0 && h + off <= l.t1) return [i, (h + off - l.t0) / (l.t1 - l.t0)];
  }
  return null;
}
/** 0.21.49: Flugzeuge und Spuren auf einem eigenen Canvas über der SVG-Karte – Bewegung zeichnet die Karte nicht mehr neu. */
const planeCv = { el: null, ctx: null, dpr: 1, hits: [], col: null, colAt: 0, paths: new Map() };
function sizePlaneCanvas() {
  const c = planeCv.el; if (!c) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(1, Math.round(view.w * dpr)), h = Math.max(1, Math.round(view.h * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  planeCv.dpr = dpr; ui.planesNow = true;
}
function planeColors() {
  const cs = getComputedStyle($('#map') || document.documentElement), g = (k, d) => cs.getPropertyValue(k).trim() || d;
  planeCv.col = { ai: g('--plane-ai', '#8c9db6'), me: W && W.player ? humHex(W.player.color) : g('--plane', '#f2b400'), edge: g('--plane-edge', '#5a4400'), trail: g('--trail', '#f2b400') };
  planeCv.cs = cs; planeCv.vars = new Map();
  planeCv.colAt = performance.now();
}
/** CSS-Farbe für das Canvas: var(--name) wird über die berechneten Stile aufgelöst (zwischengespeichert bis zum nächsten Themenwechsel). */
function cvColor(v) {
  if (!v || !v.startsWith('var(')) return v;
  let c = planeCv.vars.get(v);
  if (c === undefined) { c = planeCv.cs.getPropertyValue(v.slice(4, -1).trim()).trim() || planeCv.col.ai; planeCv.vars.set(v, c); }
  return c;
}
function planeAt(x, y) {
  let best = null, bd = Infinity;
  for (const p of planeCv.hits) { const d = Math.hypot(p.x - x, p.y - y); if (d <= 11 * p.sc + 3 && d < bd) { bd = d; best = p; } }
  return best;
}
function trailPath(ctx, pts, upto) {
  const t = Math.max(0, Math.min(1, upto)) * (pts.length - 1), n = Math.floor(t), seg = pts.slice(0, n + 1);
  if (t > n && n < pts.length - 1) { const p = lineAt(pts, upto); seg.push([p[0], p[1]]); }
  if (seg.length < 2) return;
  let minX = Infinity, maxX = -Infinity; for (const p of seg) { if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; }
  const offs = [0]; if (minX < 0) offs.push(MAP.W); if (maxX > MAP.W) offs.push(-MAP.W);
  for (const dx of offs) { seg.forEach(([x, y], i) => { const sx = (x + dx) * view.k + view.tx, sy = y * view.k + view.ty; if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }); }
}
function renderPlanes() {
  const h = ui.t * 24;
  if (ui.viewDirty) renderAirports();
  ui.planesNow = false;
  const cv = planeCv.el, ctx = planeCv.ctx; if (!cv || !ctx) return;
  if (!planeCv.col || performance.now() - planeCv.colAt > 2000) planeColors();
  const C = planeCv.col, dpr = planeCv.dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, view.w, view.h);
  const trails = [], planes = [], hits = [];
  let selPlane = null;
  const k = view.k, sc0 = Math.max(0.7, Math.min(1.25, 0.75 + k * 0.25));
  for (const s of schedules) {
    const sel = ui.sel && ui.sel.ac === s.ac.id;
    if (!sel && !visibleAl(s.al)) continue;
    const hit = legAt(s, h);
    if (!hit) continue;
    const [i, f] = hit, line = s.lines[i];
    const [mx, my, ang] = lineAt(line, f);
    const x0 = wrapX(mx);
    if (s.me || sel) { const sk0 = collOn() && s.me ? skinFor(s.al, s.ac.id) : null; trails.push([line, f, sel, sk0 && sk0.rarity === 'l' ? 'gold' : null]); }
    for (const dx of [0, -MAP.W, MAP.W]) {
      const [x, y] = toScreen(x0 + dx, my);
      if (x < -20 || y < -20 || x > view.w + 20 || y > view.h + 20) continue;
      const hu = !s.me && !s.al.archetype;
      const sk = collOn() ? skinMapStyle(skinFor(s.al, s.ac.id)) : null;
      // 0.21.57: Übersicht – fremde Flugzeuge ohne Skin klein und grau, Skins groß (Gold am größten)
      const p = { x, y, a: ang, sc: (sel ? 1.35 : sk ? (sk.fx === 'l' ? 1.5 : sk.fx === 'm' || sk.fx === 'disco' ? 1.35 : 1.2) : s.me ? 1.0 : 0.62) * sc0, me: s.me, sel, icon: s.icon, ac: s.ac.id, fill: null, grey: !s.me && !sk, sk };
      if (sk && sk.fx === 'l' && !s.me && !sel && k >= 0.8) trails.push([line, f, false, 'gold']);
      if (sel) selPlane = p; else planes.push(p);
      hits.push(p);
      break;
    }
  }
  // Spuren (eigene und ausgewählte Flüge), in Bildschirmpunkten wie vorher mit non-scaling-stroke
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const msTrail = collOn() && hasMs('trail');   // Meilenstein 150: schimmernde Spuren
  let msGrad = null; if (msTrail) { msGrad = ctx.createLinearGradient(0, 0, view.w, view.h); msGrad.addColorStop(0, '#22d3ee'); msGrad.addColorStop(1, '#a855f7'); }
  for (const [line, f, sel, gold] of trails) {
    ctx.beginPath(); trailPath(ctx, line, f);
    ctx.strokeStyle = sel ? '#22d3ee' : gold ? '#fff1b8' : msGrad || C.trail; ctx.setLineDash(gold && !sel ? [6, 4] : []);
    ctx.globalAlpha = sel ? 1 : gold ? 0.9 : 0.85; ctx.lineWidth = sel ? 2.6 : gold ? 2.2 : 2; ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  const pathOf = (d) => { let p2 = planeCv.paths.get(d); if (!p2) { p2 = new Path2D(d); planeCv.paths.set(d, p2); } return p2; };
  const ring = new Path2D(); ring.arc(0, 0, 11, 0, Math.PI * 2);
  const nowT = performance.now();
  const draw = (p) => {
    const c = Math.cos(p.a) * p.sc, sn = Math.sin(p.a) * p.sc;
    ctx.setTransform(dpr * c, dpr * sn, -dpr * sn, dpr * c, dpr * p.x, dpr * p.y);
    const ic = pathOf(p.icon);
    if (p.sel) { ctx.fillStyle = '#22d3ee'; ctx.fill(ic); ctx.strokeStyle = '#04122a'; ctx.lineWidth = 0.5; ctx.stroke(ic); return; }
    if (p.sk) {   // Aircraft Collection: Lackierung und Effekt je Seltenheit
      drawSkinFx(ctx, p, k, nowT);
      if (p.sk.fx === 'disco') { const dc = discoColor(nowT); ctx.shadowColor = dc; ctx.shadowBlur = 7 * dpr; ctx.fillStyle = dc; ctx.fill(ic); ctx.shadowBlur = 0; ctx.strokeStyle = '#1a0b24'; ctx.lineWidth = 0.6; ctx.stroke(ic); return; }
      if (p.sk.glow) { ctx.shadowColor = p.sk.glow; ctx.shadowBlur = (p.sk.fx === 'e' || p.sk.fx === 'm' ? 6 : 4) * dpr; }
      if (p.sk.fx === 'l') { ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 10 * dpr; }
      const mf = MAP_FILL[p.sk.d];   // 0.21.67: bewegte Lackierung ab Pink
      if (mf) mf(ctx, nowT, p.sk, dpr);
      else if (p.sk.fx === 'l') { ctx.fillStyle = goldSheen(ctx, nowT); }
      else ctx.fillStyle = p.sk.fill;
      ctx.fill(ic); ctx.shadowBlur = 0; ctx.strokeStyle = p.sk.edge; ctx.lineWidth = 0.6; ctx.stroke(ic);
      if (p.sk.fx === 'l') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 1.6 + Math.sin(nowT / 350) * 0.5, 0, Math.PI * 2); ctx.fill(); }
      return;
    }
    if (p.me) {
      ctx.globalAlpha = 0.16; ctx.fillStyle = C.me; ctx.fill(ring);
      ctx.globalAlpha = 0.75; ctx.strokeStyle = C.me; ctx.lineWidth = 0.8 / p.sc; ctx.stroke(ring); ctx.globalAlpha = 1;
      ctx.shadowColor = C.me; ctx.shadowBlur = 3 * dpr; ctx.fillStyle = C.me; ctx.fill(ic); ctx.shadowBlur = 0;
      ctx.strokeStyle = C.edge; ctx.lineWidth = 0.6; ctx.stroke(ic); return;
    }
    ctx.globalAlpha = 0.55; ctx.fillStyle = C.ai; ctx.fill(ic); ctx.globalAlpha = 1;   // 0.21.57: alle fremden Flugzeuge ohne Skin klein und grau
  };
  for (const p of planes) draw(p);
  if (selPlane) draw(selPlane);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  planeCv.hits = hits;
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
  const color = colorOf(al);
  const hu = !me && !al.archetype;
  box.innerHTML = `<div class="pc-head${me || hu ? '' : ' ai'}"${hu ? ` style="background:linear-gradient(120deg, ${colorOf(al)}, #0b1a33)"` : ''}><div><span class="badge">${ground ? 'Am Boden' : 'In der Luft'}</span><b style="display:block;margin-top:5px">${flightNo(al, l.r, l.dir)}</b><small>${esc(al.name)} · ${t.label}</small></div><button data-pc="close" aria-label="Schließen">×</button></div>
    ${(() => { const sk = skinFor(al, a.id); return sk ? acSvg(a.type_id, { skin: sk }) + `<div class="pc-skin">${rarChip(sk.rarity)} <b>${esc(sk.name)}</b></div>` : acSvg(a.type_id, { ...(al.logo ? { color: al.logo.c1, ink: al.logo.c2, code: al.code } : { color, code: me ? al.code : al.id.slice(0, 2), ink: me ? 'var(--on-accent)' : '#fff' }), pix: al.pixLogo ? pixUrl(al.pixLogo) || null : null }); })()}
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
  const s = { n: h.length, flights: 0, seats: 0, so: 0, pax: 0, rev: 0, cost: 0, cancelled: 0, late: 0, demand: 0, spill: 0, pax_out: 0, pax_in: 0, seats_out: 0, seats_in: 0, tr: 0, trd: 0, trr: 0, trrN: 0, prem: 0, cargo: 0 };
  for (const x of h) {
    s.flights += x.flights; s.seats += x.seats; s.so += SM.opSeats(x, 'out') + SM.opSeats(x, 'in'); s.pax += x.pax; s.rev += x.rev; s.cost += x.cost; s.cancelled += x.cancelled; s.late += x.late || 0;
    s.demand += (x.demand_out || 0) + (x.demand_in || 0); s.spill += (x.spill_out || 0) + (x.spill_in || 0);
    s.pax_out += x.pax_out; s.pax_in += x.pax_in; s.seats_out += x.seats_out; s.seats_in += x.seats_in; s.tr += (x.tr_out || 0) + (x.tr_in || 0); s.trd += x.trd || 0; s.prem += x.prem || 0; s.cargo += x.cargo || 0;
    if ((x.trr || 0) > 0 || !((x.tr_out || 0) + (x.tr_in || 0))) { s.trr += x.trr || 0; s.trrN++; }   // Umsteigererlös erst ab 0.21.41 erfasst
  }
  const rot = al.rotH(r) * r.freq;
  void rot;   // Flugzeugzeit wie in der Engine: Anteil am Betriebsfenster des Musters (Langstrecke 22 h), lange Umläufe binden ganze Flugzeuge
  s.acCost = SM.aircraftDayFixedGeneric(r.type_id) * SM.acShareOf(r.type_id, al.rotH(r), r.freq) * s.n;
  s.db1 = s.rev - s.cost; s.db2 = s.db1 - s.acCost;
  s.lf = s.so ? s.pax / s.so : 0;   // Auslastung der geflogenen Flüge (wie die Balken je Richtung)
  s.avgFare = s.pax ? (s.rev / s.pax) - P.SERVICE[r.service].ancillary * cpi() : 0;
  s.otp = s.flights ? 1 - (s.late + s.cancelled) / s.flights : null;
  return s;
}
function playerOtp() { const h = W.player.otpHist; return h.length ? h.reduce((a, b) => a + b, 0) / h.length : null; }
function acDayCost(a) {
  const pl = W.player, t = P.AIRCRAFT_TYPES[a.type_id];
  let c = SM.ovhAc(a.type_id) * cpi() + (a.owned ? a.nbv : t.value_eur) * P.INSURANCE[pl.insurance].rate / 365;
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
const staffPlan = (pl) => SM.staffPlanOf(pl, ui.tab === 'staff' && ui.hireStart ? ui.hireStart - W.day : undefined, W.day);

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
  gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 18 3-18"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
};
const icon = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
const SECTIONS = [
  { key: 'karte', label: 'Karte', sub: 'Live-Lage und Überblick', icon: 'globe', tabs: [['dashboard', 'Dashboard'], ['strategy', 'Strategie'], ['history', 'Verlauf'], ['cockpit', 'Übersicht'], ['departures', 'Abflüge'], ['news', 'Meldungen']] },
  { key: 'flotte', label: 'Flotte', sub: 'Jedes Flugzeug zählt', icon: 'plane', tabs: [['fleetOwn', 'Ihre Flotte'], ['fleetPlan', 'Einsatzplan'], ['fleetBuy', 'Beschaffung'], ['fleetAcmi', 'Charter']] },
  { key: 'strecken', label: 'Strecken', sub: 'Verbindungen sind Chancen', icon: 'route', tabs: [['routes', 'Netz'], ['plan', 'Planung'], ['plans', 'Pläne'], ['hubs', 'Drehkreuze'], ['slots', 'Slots']] },
  { key: 'cargo', label: 'Cargo', sub: 'Fracht mit eigenen Frachtern', icon: 'box', tabs: [['cargo', 'Frachtnetz'], ['cargoPlan', 'Planung'], ['cargoNew', 'Ziele finden'], ['cargoFleet', 'Frachter'], ['cargoMarket', 'Frachtmarkt']] },
  { key: 'finanzen', label: 'Finanzen', sub: 'Zahlen. Fakten. Entscheidungen.', icon: 'chart', tabs: [['finance', 'Ergebnis und Bilanz'], ['credit', 'Kredite und Rating'], ['rescue', 'Sanierung'], ['cfo', 'CFO-Beratung']] },
  { key: 'markt', label: 'Markt', sub: 'Trends erkennen. Chancen nutzen.', icon: 'trend', tabs: [['market', 'Nachfrage'], ['studies', 'Marktstudien'], ['rivals', 'Wettbewerb'], ['exchange', 'Börse'], ['players', 'Mitspielende', 'mp'], ['trade', 'Handel'], ['world', 'Weltlage']] },
  { key: 'sammlung', label: 'Collection', short: 'Sammlung', sub: 'Skins sammeln, öffnen, tauschen', icon: 'gem', mp: true, tabs: [['collection', 'Collection'], ['shop', 'Shop'], ['trading', 'Trading']] },
  { key: 'unternehmen', label: 'Unternehmen', short: 'Firma', sub: 'Menschen, Standorte, Einkauf', icon: 'building', tabs: [['profile', 'Profil & Logo'], ['milestones', 'Ansehen & Ziele'], ['staff', 'Personal'], ['stations', 'Stationen'], ['supply', 'Einkauf'], ['assistant', 'Assistenz']] },
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
  setHtml($('#nav'), SECTIONS.filter((s) => !s.mp || (s.key === 'sammlung' ? collOn() : ui.mp)).map((s) => `<button role="tab" data-sec="${s.key}" aria-selected="${s === cur}" title="${s.label}" style="--sc:var(--c-${s.key})">${icon(s.icon)}<span class="lbl">${s.label}</span><span class="lbs">${s.short || s.label}</span>${s.tabs.some(([k]) => dots[k] && k !== 'news') ? '<span class="dot"></span>' : ''}</button>`).join(''));
  const bell = $('#bell .dot'); if (bell) bell.hidden = !dots.news;
  fitNav();
}
/** Bereichsleiste: Beschriftungen ausblenden, sobald nicht alle Bereiche hineinpassen (Symbole bleiben alle sichtbar). */
function fitNav() {
  const nav = $('#nav'); if (!nav) return;
  const w = nav.clientWidth, key = w + '|' + nav.childElementCount;
  if (!fitNav.ro && typeof ResizeObserver !== 'undefined') { fitNav.ro = new ResizeObserver(() => fitNav()); fitNav.ro.observe(nav); }
  if (fitNav.key === key && nav.classList.contains('ico') === fitNav.ico) return;
  nav.classList.remove('ico');
  fitNav.ico = nav.scrollWidth > nav.clientWidth + 1;
  nav.classList.toggle('ico', fitNav.ico); fitNav.key = key;
}
/** Scrollpositionen eines Bereichs (und seiner Eltern/Kinder) über ein Neuzeichnen hinweg halten. */
function keepScroll(el, fn) {
  if (!el) return fn();
  const chain = []; for (let e = el; e && e !== document.body; e = e.parentElement) if (e.scrollTop) chain.push([e, e.scrollTop]);
  const kids = [...el.querySelectorAll('*')].filter((e) => e.scrollTop > 0).map((e) => [e.className, e.scrollTop]);
  const r = fn();
  for (const [e, t] of chain) if (e.scrollTop !== t) e.scrollTop = t;
  if (kids.length) { const all = [...el.querySelectorAll('*')]; for (const [c, t] of kids) { const k = all.find((x) => x.className === c); if (k) k.scrollTop = t; } }
  return r;
}
/** innerHTML nur setzen, wenn sich etwas geändert hat (hält Scrollposition, Fokus und spart Arbeit). */
function setHtml(el, html) { if (!el || el._html === html) return false; el.innerHTML = html; el._html = html; return true; }
function renderTabs() {
  const sec = sectionOf(ui.tab), dots = tabDots();
  const side = $('#side'); if (side) side.dataset.sec = sec.key;
  setHtml($('#secHead'), `<div class="secic">${icon(sec.icon)}</div><div><b>${sec.label}</b><span>${sec.sub}</span></div>`);
  const tabsEl = $('#tabs');
  if (setHtml(tabsEl, sec.tabs.filter(([, , only]) => only !== 'mp' || ui.mp).map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${ui.tab === k}">${l}${dots[k] ? '<span class="dot"></span>' : ''}</button>`).join(''))) {
    const cur = tabsEl.querySelector('[aria-selected="true"]'); if (cur && tabsEl.scrollWidth > tabsEl.clientWidth) { const l = cur.offsetLeft - tabsEl.offsetLeft; if (l < tabsEl.scrollLeft || l + cur.offsetWidth > tabsEl.scrollLeft + tabsEl.clientWidth) tabsEl.scrollLeft = Math.max(0, l - 16); }
  }
  renderNav();
}
function setTab(t) {
  t = TAB_ALIAS[t] || t;
  if (!VIEWS[t]) t = 'cockpit';
  const prevTab = ui.tab;
  ui.tab = t; ui.confirm = null; ui.viewDirty = true;
  ui.lastSub = ui.lastSub || {};
  ui.lastSub[sectionOf(t).key] = t;
  if (t === 'news') ui.newsSeen = W.news.length + W.player.events.length;
  renderTabs(); renderPane(true); renderDraft();
  $('#pane').scrollTop = 0;
  if (isPhone() && !ui.tour && !ui.mapNav && prevTab && prevTab !== t) phoneScroll(sectionOf(t).key, sectionOf(prevTab).key !== sectionOf(t).key);
}
// Wer scrollt die Seite? Auf schmalen Bildschirmen der App-Bereich (#app, damit iOS die feste Leiste unten nicht verschiebt), sonst das Fenster.
function pageScroller() { const a = document.getElementById('app'); return a && getComputedStyle(a).overflowY === 'auto' ? a : null; }
const pageY = () => { const sc = pageScroller(); return sc ? sc.scrollTop : window.scrollY; };
const pageMax = () => { const sc = pageScroller(); return sc ? sc.scrollHeight - sc.clientHeight : document.documentElement.scrollHeight - innerHeight; };
const pageTo = (y) => { const sc = pageScroller(); if (sc) sc.scrollTop = y; else window.scrollTo(0, y); };
// Handy: nach einem Wechsel den Inhalt zeigen (Karte oben, sonst Kopf des Bereichs)
function phoneScroll(sec, newSection) {
  const side = $('#side'); if (!side) return;
  const hh = $('header.top') ? $('header.top').offsetHeight : 0;
  if (newSection && sec === 'karte') { pageTo(0); return; }
  const y = Math.max(0, side.getBoundingClientRect().top + pageY() - hh - 4);
  // neuer Bereich: Kopf des Bereichs zeigen; Unterreiter: nur zurück nach oben, wenn man tiefer war
  if (newSection ? Math.abs(pageY() - y) > 4 : pageY() > y + 4) pageTo(y);
}
function editing() { if (ui.picker) return true; const a = document.activeElement; return a && $('#pane').contains(a) && /INPUT|SELECT/.test(a.tagName); }
const VIEWS = {};
const isPhone = () => window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
// Auf dem Handy jede Tabelle seitlich scrollbar machen, statt die Seite zu verbreitern
function wrapTables(root) {
  for (const t of root.querySelectorAll('table.t')) {
    if (t.parentElement && t.parentElement.classList.contains('tw')) continue;
    const w = document.createElement('div'); w.className = 'tw'; t.parentNode.insertBefore(w, t); w.appendChild(t);
  }
}
const KEEP_SCROLL = '.tw, .bp-list, .gt-list, .dbars, .roster, .basegroups';
/** Rechte Spalte neu aufbauen – Scrollposition der Seite, der Spalte und innerer Listen bleibt erhalten. */
/** Zuletzt aktiv gescrollt/berührt – solange das läuft, wird der Reiter nicht neu gezeichnet (sonst springt die Seite). */
let userScrollAt = 0;
for (const ev of ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown']) window.addEventListener(ev, () => { userScrollAt = performance.now(); }, { passive: true, capture: true });
window.addEventListener('scroll', () => { if (performance.now() - (ui.lastPaneRender || 0) > 120) userScrollAt = performance.now(); }, { passive: true, capture: true });
let paneRetry = 0;
function deferPane() { ui.paneStale = true; if (!paneRetry) paneRetry = setTimeout(() => { paneRetry = 0; if (ui.paneStale) renderPane(); }, 900); }
document.addEventListener('focusout', (e) => { if (ui.paneStale && e.target && $('#pane') && $('#pane').contains(e.target)) setTimeout(() => { if (ui.paneStale && !editing()) renderPane(); }, 60); });
// 0.21.41: Solange Maus oder Finger gedrückt sind, zeichnen Live-Updates nicht neu – sonst verschwindet der Knopf unter dem Zeiger und der Klick geht verloren
let ptrDownAt = 0, sbStale = false;
document.addEventListener('pointerdown', () => { ptrDownAt = performance.now(); }, true);
{ const end = () => { if (!ptrDownAt) return; setTimeout(() => { ptrDownAt = 0; if (sbStale) { sbStale = false; renderSidebar(); } }, 60); };
  document.addEventListener('pointerup', end, true); document.addEventListener('pointercancel', end, true); }
const pressing = () => ptrDownAt > 0 && performance.now() - ptrDownAt < 2000;
function renderPane(force = false) {
  if (!force && (editing() || pressing() || performance.now() - userScrollAt < 800)) { deferPane(); return; }
  ui.paneStale = false;
  const pane = $('#pane'), st = pane.scrollTop, wy = pageY();
  const inner = [...pane.querySelectorAll(KEEP_SCROLL)].map((e) => [e.scrollTop, e.scrollLeft]);
  pane.style.minHeight = pane.offsetHeight + 'px';   // Seite nicht kurz zusammenfallen lassen (sonst springt das Handy nach oben)
  pane.innerHTML = VIEWS[ui.tab]();
  if (isPhone()) wrapTables(pane);
  if (ui.tab === 'plan' && ui.planner) updateForecast();   // Prognose vor dem Zurückscrollen füllen, sonst ist die Seite kurz zu kurz
  pane.scrollTop = st;
  const els = pane.querySelectorAll(KEEP_SCROLL); for (let i = 0; i < els.length && i < inner.length; i++) { if (inner[i][0]) els[i].scrollTop = inner[i][0]; if (inner[i][1]) els[i].scrollLeft = inner[i][1]; }
  pane.style.minHeight = '';
  if (Math.abs(pageY() - wy) > 2) pageTo(wy);
  ui.lastPaneRender = performance.now();
  // Nachzügler (Bilder, Schriften): Position im nächsten Frame noch einmal setzen
  if (st > 0 || wy > 0) requestAnimationFrame(() => { if (performance.now() - userScrollAt < 300) return; if (Math.abs(pane.scrollTop - st) > 2 && pane.scrollHeight - pane.clientHeight >= st) pane.scrollTop = st; if (Math.abs(pageY() - wy) > 2 && pageMax() >= wy) pageTo(wy); });
}
/** Ansichten mit laufenden Zahlen – nur diese werden bei laufender Zeit neu gezeichnet. */
const LIVE_TABS = new Set(['cockpit', 'dashboard', 'routes', 'fleetOwn', 'fleetPlan', 'finance', 'credit', 'rescue', 'cfo', 'news', 'history', 'players', 'staff', 'exchange', 'departures', 'milestones', 'world']);
function tickPane() {
  if (!LIVE_TABS.has(ui.tab)) return;
  const sp = SM.SPEEDS[speedNow()], fast = sp && sp.ms && sp.ms < 10000;
  if (fast && performance.now() - (ui.lastPaneRender || 0) < 1500) return;
  renderPane();
}

// ---------------------------------------------------------------------------
// Kopfzeile, Seitenleiste, Zeit
// ---------------------------------------------------------------------------
const speedNow = () => (ui.mp ? (mpState.clock ? SM.speedKey(mpState.clock.speed) : 'p') : ui.speedKey || 'p');
function renderSpeed() {
  const cur = speedNow(), sel = $('#speedSel'); if (!sel) return;
  const keys = Object.keys(SM.SPEEDS).filter((k) => k !== 'p' && !(ui.mp && SM.SPEEDS[k].local));
  const show = cur === 'p' ? (ui.lastSpeed || (ui.mp ? 'm30' : 'x1')) : cur;
  const lbl = (k) => (isPhone() ? SM.SPEEDS[k].short.replace('/Tag', '') : SM.SPEEDS[k].short);
  sel.innerHTML = keys.map((k) => `<option value="${k}" ${k === show ? 'selected' : ''}>${lbl(k)}</option>`).join('');
  sel.title = SM.SPEEDS[show].label + (ui.mp && mpState.clock && mpState.clock.weekend ? ' – Wochenend-Tempo (Fr 17 Uhr bis Mo 6 Uhr)' : '');
  $('#btnPause').setAttribute('aria-pressed', String(cur === 'p'));
  $('#btnPlay').setAttribute('aria-pressed', String(cur !== 'p'));
  const lock = !!ui.mp && !ui.mp.host;
  for (const el of [$('#btnPause'), $('#btnPlay'), sel]) el.disabled = lock;
}
function clockText() {
  const mins = Math.floor((ui.t % 1) * 1440);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}
// ---------------------------------------------------------------------------
// Kalender oben links: Slotvergaben, öffentlich bekannte Großereignisse, angekündigte Ereignisse, eigene Termine
// ---------------------------------------------------------------------------
const CAL_KIND = { slot: ['Slotvergabe', 'var(--c-strecken)'], mega: ['Großereignisse', 'var(--accent)'], event: ['Angekündigt', 'var(--c-markt)'], own: ['Eigene Termine', 'var(--c-flotte)'] };
const dayOfYMD = (y, m, d) => (y - 2027) * 365 + SM.MONTH_STARTS[m] + d - 1;
function calItems(from, to) {
  const pl = W.player, out = [], add = (it) => { if ((it.end ?? it.day) >= from && it.day <= to) out.push(it); };
  // Slotvergaben (feste Termine)
  for (let d = from - 200; ;) { const n = SM.nextSlotDay(d); if (n.day > to) break; add({ day: n.day, kind: 'slot', label: `Slotvergabe ${n.summer ? 'Sommer' : 'Winter'}flugplan`, detail: 'Jeder Flughafen bekommt einen Slot dazu, die Wartelisten werden reihum bedient.', tab: 'slots' }); d = n.day; }
  // Öffentlich bekannte Großereignisse (Termine stehen lange fest)
  const y0 = dateParts(from).y - 1, y1 = dateParts(to).y;
  for (let y = y0; y <= y1; y++) for (const ev of SM.MEGA) {
    const st = SM.megaStart(ev, y); if (st === null || st === undefined) continue;
    const where = (ev.airports || []).slice(0, 3).map((c) => (P.AIRPORTS[c] ? P.AIRPORTS[c].name : c)).join(', ') || (ev.countries || []).map((c) => SM.COUNTRY_LABEL[c] || c).join(', ');
    const live = (W.events || []).some((e) => e.type === 'mega' && e.mega === ev.key + y);
    add({ day: st, end: st + (ev.dur || 1), kind: 'mega', label: ev.label + (ev.every ? '' : ' ' + y), detail: `${where}${ev.dur ? ` · ${ev.dur} Tage` : ''}${live ? ' · Nachfrage-Effekt angekündigt' : ''} – mehr Nachfrage, Charteranfragen möglich`, tab: 'fleetAcmi' });
  }
  // Angekündigte Ereignisse aus den Nachrichten (öffentlich, keine fremden Betriebsinterna)
  for (const e of W.events || []) {
    if (e.type === 'mega' || (e.announced ?? 0) > W.day || (e.airline && e.airline !== W.playerId) || e.averted) continue;
    const t = String(e.text || ''), lbl = t.split(/[:.–]/)[0].slice(0, 60);
    add({ day: e.start, end: e.end, kind: 'event', label: lbl || 'Ereignis', detail: t, tab: 'news', sev: e.severity });
  }
  // Eigene Termine
  for (const a of pl.fleet) {
    if (a.delivery_day > W.day) add({ day: a.delivery_day, kind: 'own', label: `Lieferung ${acName(a.id)}`, detail: tl(a.type_id) + ' · Basis ' + a.base, tab: 'fleetOwn' });
    for (const b of SM.acmiList(a, W.day)) { if (b.start > W.day) add({ day: b.start, kind: 'own', label: `Charter beginnt: ${acName(a.id)}`, detail: `${b.client} · ${eur(b.rate)}/Tag bis ${dateShort(b.end)}`, tab: 'fleetAcmi' }); add({ day: b.end, kind: 'own', label: `Charter endet: ${acName(a.id)}`, detail: `${b.client} – danach wieder frei`, tab: 'fleetAcmi' }); }
    if ((a.status === 'ccheck' || a.status === 'aog') && a.until > W.day) add({ day: a.until, kind: 'own', label: `${acName(a.id)} wieder einsatzbereit`, detail: a.status === 'ccheck' ? 'C-Check abgeschlossen' : 'Reparatur abgeschlossen', tab: 'fleetOwn' });
  }
  for (const r of pl.reports || []) if (r.status === 'running') add({ day: r.ready, kind: 'own', label: 'Marktstudie fertig', detail: `${P.STUDIES.kinds[r.kind].label} (${P.STUDIES.tiers[r.tier].label})`, tab: 'studies' });
  for (const e of pl.experts || []) if (e.startDay > W.day) add({ day: e.startDay, kind: 'own', label: `${e.name} fängt an`, detail: P.EXPERT_ROLES[e.role].label, tab: 'staff' });
  { const by = {}; for (const p of (pl.staff && pl.staff.pipeline) || []) if (p.ready > W.day) by[p.ready] = (by[p.ready] || 0) + p.count; for (const [d, n] of Object.entries(by)) add({ day: Number(d), kind: 'own', label: `${n0(n)} neue Crewmitglieder`, detail: 'Einstellungen und Umschulungen treten an', tab: 'staff' }); }
  for (const r of pl.routes) if (!r.closed && r.opened_day > W.day) add({ day: r.opened_day, kind: 'own', label: `Erstflug ${r.base}–${r.dest}`, detail: `${r.freq}× täglich`, tab: 'routes' });
  return out.sort((a, b) => a.day - b.day || ['slot', 'mega', 'own', 'event'].indexOf(a.kind) - ['slot', 'mega', 'own', 'event'].indexOf(b.kind));
}
/** Lange Lagen (Konjunktur, Pilotenmangel …) nur am Beginn zeigen, nicht als Band über Monate. */
const calLong = (x) => x.kind === 'event' && x.end && x.end - x.day > 30;
const calIn = (d) => { const n = d - W.day; return n === 0 ? 'heute' : n === 1 ? 'morgen' : n < 0 ? 'läuft' : `in ${n0(n)} Tagen`; };
function renderCalBtn() {
  const el = $('#calNext'); if (!el || !W || !W.player) return;
  $('#calBtn').hidden = false;
  const nx = calItems(W.day + 1, W.day + 400).filter((x) => x.day > W.day && (x.kind === 'slot' || x.kind === 'mega' || x.kind === 'own'))[0];
  setHtml(el, nx ? `<b>${dateShort(nx.day)} · ${esc(nx.label)}</b><span>${calIn(nx.day)} · Kalender öffnen</span>` : '<b>Kalender</b><span>wichtige Termine</span>');
  if (ui.cal && ui.cal.open) renderCalPop();
}
function renderCalPop() {
  const pop = $('#calPop'), C = ui.cal; if (!pop || !C) return;
  const p0 = dateParts(W.day), ym = C.ym ?? (p0.y * 12 + p0.m), y = Math.floor(ym / 12), m = ym % 12;
  const first = dayOfYMD(y, m, 1), len = (m === 11 ? 365 : SM.MONTH_STARTS[m + 1]) - SM.MONTH_STARTS[m], off = ((first % 7) + 7) % 7;
  const hide = C.hide || {}, items = calItems(first - 40, first + len + 200).filter((x) => !hide[x.kind]);
  const cells = []; for (let i = 0; i < off; i++) cells.push('<span></span>');
  for (let d = 1; d <= len; d++) {
    const day = first + d - 1, starts = items.filter((x) => x.day === day), spans = items.filter((x) => x.end && x.day < day && x.end > day && (x.kind === 'mega' || x.kind === 'event') && !calLong(x));
    const kinds = [...new Set(starts.map((x) => x.kind))];
    cells.push(`<button data-cal-day="${day}" class="${day < W.day ? 'past' : ''}${day === W.day ? ' today' : ''}${C.sel === day ? ' sel' : ''}" title="${esc(starts.map((x) => x.label).join(' · '))}"><span>${d}</span><span class="dots">${kinds.map((k) => `<i style="background:${CAL_KIND[k][1]}"></i>`).join('')}</span>${spans.length ? `<span class="band" style="background:${CAL_KIND[spans[0].kind][1]}"></span>` : ''}</button>`);
  }
  let list, head;
  if (C.sel !== null && C.sel !== undefined) { list = items.filter((x) => x.day === C.sel || (x.end && x.day <= C.sel && x.end > C.sel && !calLong(x))); head = `${dateLong(C.sel)}`; }
  else { list = items.filter((x) => ((x.end ?? x.day) >= W.day && !(calLong(x) && x.day < W.day)) && x.day <= W.day + 120); head = 'Die nächsten 120 Tage'; }
  const groups = []; for (const x of list) { const k = dateParts(Math.max(x.day, W.day)).y * 12 + dateParts(Math.max(x.day, W.day)).m; let g = groups.find((q) => q.k === k); if (!g) groups.push(g = { k, items: [] }); g.items.push(x); }
  setHtml(pop, `<div class="cal-hd"><button data-cal="prev" aria-label="Vormonat">‹</button><b>${MONTHS_L[m]} ${y}</b><button data-cal="next" aria-label="Nächster Monat">›</button><button data-cal="today">Heute</button><button data-cal="close" aria-label="Schließen">✕</button></div>
    <div class="cal-grid">${WD.map((w) => `<span class="wd">${w}</span>`).join('')}${cells.join('')}</div>
    <div class="cal-kinds">${Object.entries(CAL_KIND).map(([k, [l, c]]) => `<button class="chip-t" data-cal-kind="${k}" aria-pressed="${!hide[k]}"><i style="background:${c}"></i>${l}</button>`).join('')}</div>
    <div class="cal-list"><div class="spread"><b class="small">${head}</b>${C.sel !== null && C.sel !== undefined ? '<button class="btn small ghost" data-cal="all">alle Termine</button>' : ''}</div>
      ${list.length ? (C.sel !== null && C.sel !== undefined ? [{ items: list }] : groups).map((g) => `${g.k !== undefined ? `<h4>${MONTHS_L[g.k % 12]} ${Math.floor(g.k / 12)}</h4>` : ''}${g.items.map((x) => `<button class="cal-it" data-cal-go="${x.tab || ''}"><span>${dateShort(x.day)}<em>${x.end && x.end - x.day > 1 ? 'bis ' + dateShort(x.end - 1) : calIn(x.day)}</em></span><i style="background:${CAL_KIND[x.kind][1]}"></i><span><b>${esc(x.label)}</b><small>${esc(x.detail || '')}</small></span></button>`).join('')}`).join('') : '<p class="small muted">Keine Termine.</p>'}</div>`);
}
function toggleCal(open) {
  const pop = $('#calPop'), btn = $('#calBtn'); if (!pop || !btn || !W) return;
  ui.cal = ui.cal || { open: false, ym: null, sel: null, hide: {} };
  ui.cal.open = open ?? !ui.cal.open;
  if (ui.cal.open) { const hb = document.querySelector('header.top'); if (hb) pop.style.top = Math.round(hb.getBoundingClientRect().bottom + 6) + 'px'; ui.cal.ym = null; ui.cal.sel = null; pop._html = null; renderCalPop(); }
  pop.hidden = !ui.cal.open; btn.setAttribute('aria-expanded', String(ui.cal.open));
}
function initCal() {
  const btn = $('#calBtn'), pop = $('#calPop'); if (!btn || !pop) return;
  btn.addEventListener('click', (e) => { e.stopPropagation(); toggleCal(); });
  pop.addEventListener('click', (e) => {
    e.stopPropagation();
    const C = ui.cal, p0 = dateParts(W.day), cur = C.ym ?? (p0.y * 12 + p0.m);
    const a = e.target.closest('[data-cal]'), d = e.target.closest('[data-cal-day]'), k = e.target.closest('[data-cal-kind]'), go = e.target.closest('[data-cal-go]');
    if (a) { const v = a.dataset.cal; if (v === 'close') return toggleCal(false); if (v === 'prev') C.ym = cur - 1; if (v === 'next') C.ym = cur + 1; if (v === 'today') { C.ym = null; C.sel = null; } if (v === 'all') C.sel = null; renderCalPop(); return; }
    if (d) { const v = Number(d.dataset.calDay); C.sel = C.sel === v ? null : v; renderCalPop(); return; }
    if (k) { C.hide = C.hide || {}; C.hide[k.dataset.calKind] = !C.hide[k.dataset.calKind]; renderCalPop(); return; }
    if (go && go.dataset.calGo) { toggleCal(false); setTab(go.dataset.calGo); }
  });
  document.addEventListener('click', (e) => { if (ui.cal && ui.cal.open && !e.target.closest('#calPop') && !e.target.closest('#calBtn')) toggleCal(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.cal && ui.cal.open) toggleCal(false); });
}
function renderHeader() {
  if (!W || !W.player) return;
  const pl = W.player, p = dateParts(W.day);
  $('#date').innerHTML = `<b>${p.wd}, ${p.d}. ${MONTHS[p.m]} ${p.y}</b><span id="clock">${clockText()}</span><small><span class="d-day">${preStart() ? `Start in ${leftTxt(preStart() - Date.now() - (mpState.skew || 0))}` : `Tag ${W.day + 1} · ${SM.SPEEDS[speedNow()].short}`}</span><span class="d-date">${p.wd}, ${p.d}. ${MONTHS[p.m]} ${p.y}</span></small>`;
  $('#date').title = `Spieltag ${W.day + 1} · Tempo ${SM.SPEEDS[speedNow()].label}`;
  { const ub = $('#userBtn'), lk = JSON.stringify(logoOf(pl)) + pl.code; if (ub.dataset.lk !== lk) { ub.innerHTML = logoSvg(pl, 36); ub.dataset.lk = lk; } }
  renderCalBtn();
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
  if (pressing()) { sbStale = true; return; }
  const pl = W.player, bs = SM.balanceSheet(pl), h = netHistOf(pl), nc = netCash(pl);
  const routes = pl.activeRoutes(), s7 = routes.map((r) => rstats(r, 7)), s14 = routes.map((r) => rstats(r, 14));
  const seats7 = s7.reduce((a, x) => a + x.so, 0), pax7 = s7.reduce((a, x) => a + x.pax, 0);
  const seats14 = s14.reduce((a, x) => a + x.so, 0) - seats7, pax14 = s14.reduce((a, x) => a + x.pax, 0) - pax7;
  const lf = seats7 ? pax7 / seats7 : null, lfPrev = seats14 ? pax14 / seats14 : null, otp = playerOtp();
  const cashPrev = h.length > 30 ? h[h.length - 31] : h[0];
  const sbHtml = `
    <div class="card2 alcard"><button class="albadge" data-act="tab" data-tab="profile" title="Logo gestalten">${logoSvg(pl, 46)}</button><div style="min-width:0"><b>${esc(pl.name)}</b><span>${pl.stage().label} · Basis ${pl.bases.join(', ')}${ui.mp ? ' · ' + esc(ui.mp.name) : ''}</span>${preStart() && !pl.fleet.length ? '<button class="btn small ghost" data-act="rebase" style="margin-top:4px;padding:2px 8px">Basis ändern</button>' : ''}</div></div>
    <div class="card2 kpilist">
      <div><span>Kontostand${nc < 0 ? ' · im Dispo' : ''}</span><b class="${nc < 0 ? 'neg' : ''}">${eur(nc)}</b>${nc > 0 && cashPrev > 0 ? kpiDelta(trendPct(nc, cashPrev)) : '<em></em>'}</div>
      <div class="kpi-link" data-act="tab" data-tab="history" role="button" tabindex="0" title="Verlauf Tag für Tag"><span>Ergebnis gestern <i class="tl-go">↗</i></span><b class="${sgn(pl.ledger.lastDay || 0)}">${eur(pl.ledger.lastDay || 0, { plus: true })}</b>${(() => { const hh = (pl.dayHist || []).slice(-30); if (hh.length < 7) return '<em></em>'; const av = hh.reduce((a, x) => a + (x.net || 0), 0) / hh.length; return `<em style="color:var(--ink-2)">Ø ${hh.length} Tage ${eur(av, { plus: true })}</em>`; })()}</div>
      <div><span>Auslastung 7 Tage</span><b>${lf === null ? '–' : pct(lf)}</b>${lf !== null && lfPrev ? kpiDelta(lf - lfPrev) : '<em></em>'}</div>
      <div><span>Pünktlichkeit</span><b>${otp === null ? '–' : pct(otp)}</b><em></em></div>
      <div><span>Eigenkapital · Rating</span><b>${eur(bs.equity)}</b><em class="up" style="color:var(--ink-2)">${pl.rating}</em></div>
    </div>
    ${assistantCard()}`;
  keepScroll(sb, () => setHtml(sb, sbHtml));
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
  if (ONLINE && mpState.user) items.push(['sep'], ...(mpState.user.admin ? [['playtime', 'Spielzeit der Spieler'], ['diag', 'Fehlerprotokoll'], ['packs', 'Aircraft Pack Management']] : []), ['password', 'Passwort ändern'], ['logout', `Abmelden (${mpState.user.name})`]);
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
  else if (k === 'password') showPwChange({});
  else if (k === 'playtime') showPlaytime(() => { $('#modal').hidden = true; });
  else if (k === 'diag') showDiag(() => { $('#modal').hidden = true; });
  else if (k === 'packs') showPackAdmin();
  else if (k === 'logout') { api('/logout', { body: {} }).catch(() => {}).finally(() => { mpState.user = null; stopOnline(); showAuth(); }); }
}

// ---------- Cockpit ----------
// ---------- Dashboard: alles Wichtige auf einen Blick ----------
VIEWS.dashboard = function viewDashboard() {
  const pl = W.player, L = pl.ledger, F = fltState('dash'), routes = pl.activeRoutes(), froutes = routes.filter((r) => (!F.base || r.base === F.base) && (!F.type || r.type_id === F.type));
  const s30 = froutes.map((r) => ({ r, s: rstats(r, 30) })), s7 = routes.map((r) => rstats(r, 7));
  const seats7 = s7.reduce((a, x) => a + x.so, 0), pax7 = s7.reduce((a, x) => a + x.pax, 0), lf7 = seats7 ? pax7 / seats7 : null;
  const so30 = s30.reduce((a, x) => a + x.s.so, 0), px30 = s30.reduce((a, x) => a + x.s.pax, 0), lf30 = so30 ? px30 / so30 : null;
  const cur = pnlCol(L.month), prev = L.months.length ? pnlCol(L.months.at(-1).acc) : null;
  const nc = netCash(pl), otp = playerOtp();
  const panel = (title, tab, body, sub = '') => `<section class="dpanel"><div class="dp-head"><b>${title}</b>${sub ? `<span class="small muted">${sub}</span>` : ''}${tab ? `<button class="btn small" data-act="tab" data-tab="${tab}">Öffnen</button>` : ''}</div>${body}</section>`;
  const tile = (l, v, cls, em, go = null) => `<div class="tile${go ? ' tlink' : ''}"${go ? ` data-act="tab" data-tab="${go}" role="button" tabindex="0" title="Verlauf öffnen"` : ''}><span>${l}${go ? ' <i class="tl-go">↗</i>' : ''}</span><b class="${cls || ''}">${v}</b><em>${em || ''}</em></div>`;
  let html = pl.auto ? `<div class="callout warn"><b>Die KI vertritt Ihre Airline</b><span class="small">Seit ${P.AUTOPILOT.hours} Stunden keine eigene Steuerung. Die Vertretung hält Preise, Personal und Entscheidungen im Lot, setzt freie Flugzeuge ein und baut langsam aus (höchstens ein Leasingflugzeug im Monat, nur solange die Airline Geld verdient) – was sie getan hat, steht im Logbuch („Vertretung (KI)“). Jede eigene Aktion beendet sie.</span><div class="row"><button class="btn small primary" data-act="autoresume">Selbst übernehmen</button></div></div>` : '';
  html += offersHtml() + crisisCardsHtml();
  html += `<div class="spread"><h2 class="sec">Dashboard <small>${esc(pl.name)} · Ansehen ${SM.standingOf(pl, W.day).v} · ${SM.careerOf(pl) ? `Phase ${SM.careerLv(pl) + 1}: ${esc(SM.careerOf(pl).label)}` : pl.stage().label}</small></h2></div>`;
  // Kennzahlen
  html += `<div class="tiles dtiles">
    ${tile('Ergebnis ' + MONTHS[dateParts(W.day).m] + ' (lfd.)', eur(cur.net, { plus: true }), sgn(cur.net), `gestern <span class="${sgn(L.lastDay || 0)}">${eur(L.lastDay || 0, { plus: true })}</span>${prev ? ` · Vormonat <span class="${sgn(prev.net)}">${eur(prev.net, { plus: true })}</span>` : ''}`, 'history')}
    ${tile('Kontostand', eur(nc), nc < 0 ? 'neg' : '', `${nc < 0 ? 'im Dispo · ' : ''}mit Dispo verfügbar ${eur(pl.spendable(W.macro.bank ?? 1))}`)}
    ${tile('Auslastung 7 Tage', lf7 === null ? '–' : pct(lf7), lf7 !== null && lf7 < 0.65 ? 'warnc' : '', lf30 !== null ? `30 Tage ${pct(lf30)}` : 'noch keine Flüge')}
    ${tile('Pünktlichkeit', otp === null ? '–' : pct(otp), otp !== null && otp < 0.75 ? 'warnc' : '', `Marke ${n0(pl.brand * 100)} · Rating ${pl.rating}`)}
  </div>`;
  html += careerHtml(pl, true);
  html += `<section class="dpanel"><div class="dp-head"><b>Strategie</b><span class="small muted">Kabinen, Marketing, Vielflieger, Drehkreuze, Slots</span><button class="btn small" data-act="tab" data-tab="strategy">Öffnen</button></div>${strategySummary(pl)}</section>`;
  if (routes.length > 3 && (pl.bases.length > 1 || new Set(routes.map((r) => r.type_id)).size > 1)) html += `<div class="fltbar row">${pl.bases.length > 1 ? `<select id="flt-base" data-flt="dash" aria-label="Basis"><option value="">Alle Basen</option>${pl.bases.map((b) => `<option value="${b}" ${F.base === b ? 'selected' : ''}>Basis ${b}</option>`).join('')}</select>` : ''}${new Set(routes.map((r) => r.type_id)).size > 1 ? `<select id="flt-type" data-flt="dash" aria-label="Muster"><option value="">Alle Muster</option>${[...new Set(routes.map((r) => r.type_id))].sort().map((t) => `<option value="${t}" ${F.type === t ? 'selected' : ''}>${esc(tl(t))}</option>`).join('')}</select>` : ''}<span class="small muted">filtert die Strecken-Auswertungen</span>${F.base || F.type ? '<button class="btn small ghost" data-act="fltclear" data-k="dash">zurücksetzen</button>' : ''}</div>`;
  html += '<div class="dash">';
  // Profitabilität je Strecke
  const rows = s30.filter((x) => x.s.n).map((x) => ({ ...x, d: x.s.db2 / x.s.n })).sort((a, b) => b.d - a.d);
  const maxAbs = Math.max(1, ...rows.map((x) => Math.abs(x.d)));
  const prof = rows.length ? `<div class="dbars">${rows.slice(0, 10).map((x) => { const w = Math.abs(x.d) / maxAbs * 50;
      return `<div class="dbar" title="${x.r.base}–${x.r.dest}: ${eur(x.d, { plus: true })} pro Tag, Auslastung ${pct(x.s.lf)}"><span class="dl">${x.r.base}–${x.r.dest}</span><span class="dtrack div"><i class="${x.d < 0 ? 'neg' : 'pos'}" style="${x.d < 0 ? `right:50%;width:${w}%` : `left:50%;width:${w}%`}"></i></span><span class="dv ${sgn(x.d)}">${eur(x.d, { plus: true })}</span></div>`; }).join('')}</div>
      ${rows.length > 10 ? `<p class="small muted">${rows.length - 10} weitere Strecken unter Strecken → Netz.</p>` : ''}
      <p class="small muted">Streckenbeitrag (DB2) pro Tag, Mittel der letzten 30 Tage. ${rows.filter((x) => x.d < 0).length ? `<b>${rows.filter((x) => x.d < 0).length}</b> Strecke${rows.filter((x) => x.d < 0).length > 1 ? 'n' : ''} im Minus.` : 'Alle Strecken tragen sich.'}</p>
      ${!F.base && !F.type ? (() => { const h = (pl.dayHist || []).slice(-30); if (h.length < 7) return ''; const net = h.reduce((a, x) => a + (x.net || 0), 0) / h.length, db = rows.reduce((a, x) => a + x.d, 0), gap = net - db;
        const idle = pl.fleet.filter((a) => a.delivery_day <= W.day).map((a) => ({ a, h: a.fhDay || 0 })).filter((x) => x.h < 6);
        return Math.abs(gap) > 500 ? `<p class="small ${gap < 0 ? 'ink2' : 'muted'}">Außerhalb der Strecken: <b class="${sgn(gap)}">${eur(gap, { plus: true })}</b>/Tag (Leerlauf der Flugzeuge, Verwaltung, Basis, Personalreserve, Zinsen, Einmaliges) → Ergebnis Ø <b class="${sgn(net)}">${eur(net, { plus: true })}</b>/Tag (letzte ${h.length} Tage; gestern ${eur(pl.ledger.lastDay || 0, { plus: true })}).${idle.length ? ` Wenig genutzt: ${idle.map((x) => `${esc(acName(x.a.id))} (${tl(x.a.type_id)})`).join(', ')} – ein Flugzeug kostet auch am Boden.` : ''}</p>` : ''; })() : ''}`
    : '<p class="small muted">Noch keine Strecke im Betrieb.</p>';
  html += panel('Profitabilität je Strecke', 'routes', prof, rows.length ? `gesamt ${eur(rows.reduce((a, x) => a + x.d, 0), { plus: true })}/Tag` : '');
  // Monatsergebnisse
  const ms = L.months.slice(-11).map((m) => ({ lab: MONTHS[m.label.m], v: pnlCol(m.acc).net })).concat([{ lab: MONTHS[dateParts(W.day).m] + '*', v: cur.net }]);
  const mMax = Math.max(1, ...ms.map((x) => Math.abs(x.v)));
  html += panel('Ergebnis je Monat', 'history', `<div class="mbars">${ms.map((x) => `<div class="mb" title="${x.lab}: ${eur(x.v, { plus: true })}"><span class="mb-up">${x.v > 0 ? `<i class="pos" style="height:${(x.v / mMax * 100).toFixed(0)}%"></i>` : ''}</span><span class="mb-dn">${x.v < 0 ? `<i class="neg" style="height:${(-x.v / mMax * 100).toFixed(0)}%"></i>` : ''}</span><em>${x.lab}</em></div>`).join('')}</div>
    <p class="small muted">Jahresüberschuss je Monat, * = laufender Monat. Seit Start: <b class="${sgn(pnlCol(L.pnl).net)}">${eur(pnlCol(L.pnl).net, { plus: true })}</b>.</p>`);
  // Auslastung je Strecke
  const lfRows = s30.filter((x) => x.s.n).sort((a, b) => b.s.lf - a.s.lf);
  html += panel('Auslastung je Strecke', 'routes', lfRows.length ? `<div class="dbars">${lfRows.slice(0, 10).map((x) => { const full = x.s.lf >= 0.95;
      return `<div class="dbar" title="${x.r.base}–${x.r.dest}: ${pct(x.s.lf)} Auslastung"><span class="dl">${x.r.base}–${x.r.dest}</span><span class="dtrack"><i class="${x.s.lf < 0.65 ? 'warn' : 'me'}" style="width:${(x.s.lf * 100).toFixed(0)}%"></i><b class="tgt" style="left:80%"></b></span><span class="dv">${pct(x.s.lf)}${full ? ' <span class="chip warn" title="Fast ausgebucht – Preis oder Frequenz erhöhen">voll</span>' : ''}</span></div>`; }).join('')}</div>
      <p class="small muted">Letzte 30 Tage, Strich bei 80 %. „voll“: ab 95 % Auslastung – Preis oder Frequenz erhöhen. Unter 65 % (gelb): Preis zu hoch oder Konkurrenz zu stark.</p>` : '<p class="small muted">Noch keine Flüge.</p>');
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
  const seats = st7.reduce((s, x) => s + x.so, 0), pax = st7.reduce((s, x) => s + x.pax, 0);
  const db2 = st30.reduce((s, x) => s + x.db2 / Math.max(x.n, 1), 0);
  const otp = playerOtp();
  const last = pl.ledger.months.at(-1);
  const lastRes = last ? Object.entries(last.acc).filter(([k]) => !k.startsWith('cf_')).reduce((s, [, v]) => s + v, 0) / 100 : null;
  let html = `<h2 class="sec">Übersicht <small>${dateLong(W.day)}</small></h2>`;
  html += `<div class="only-narrow">${assistantCard()}</div>`;
  html += preStartCard();
  for (const d of openDecisions()) html += decisionCard(d);
  html += playersCard();
  const staffed = SM.sumObj(pl.staff.pil) + pl.staff.cab + pl.staff.pipeline.length > 0;
  const steps = [
    [pl.fleet.length > 0, 'Flugzeug beschaffen', 'Unter Flotte → Beschaffung leasen oder gebraucht kaufen. Leasing schont den Kontostand.', 'fleetBuy'],
    [routes.length > 0, 'Erste Strecke planen', 'Ziel auf der Karte antippen oder unter Strecken → Planung. Die Prognose rechnet mit Ihren echten Kosten.', 'plan'],
    [staffed, 'Personal einstellen', 'Unter Unternehmen → Personal. Bis die Leute anfangen, springt teures Agenturpersonal ein.', 'staff'],
    [W.day > 20 && routes.length > 0, 'Zeit laufen lassen', ui.mp ? (ui.mp.main ? `Die Hauptwelt läuft von selbst weiter: ${mpState.clock ? SM.SPEEDS[SM.speedKey(mpState.clock.speed)].short.replace('/Tag', ' pro Spieltag') : 'rund um die Uhr'}, auch wenn Sie offline sind. Schauen Sie täglich vorbei.` : 'Die Spielleitung stellt oben das Tempo ein, von 1 Stunde bis 3 Sekunden pro Spieltag.') : 'Oben Tempo wählen und auf Weiter drücken: von 1 Stunde pro Spieltag bis Turbo.', null],
  ];
  if (steps.some((s) => !s[0])) {
    html += `<div class="card pad stack"><div class="spread"><h3>Erste Schritte</h3><span class="row" style="gap:6px"><button class="btn small" data-act="tour">Rundgang</button><button class="btn small" data-act="guide">Anleitung</button></span></div>${steps.map(([done, t, d, tab], i) => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="chip ${done ? 'good' : ''}" style="min-width:26px;justify-content:center">${done ? '✓' : i + 1}</span><div style="min-width:0"><b>${t}</b><div class="small muted">${d}</div></div>${!done && tab ? `<button class="btn small" data-act="tab" data-tab="${tab}" style="margin-left:auto">Öffnen</button>` : ''}</div>`).join('')}</div>`;
  }
  const cov = pl.staff.cov;
  if (cov && routes.length) {
    const canc = Object.entries(cov.cancel).filter(([, v]) => v > 0);
    if (canc.length) html += `<div class="callout crit"><b>Personalmangel</b>Heute fallen Flüge aus, weil Crews fehlen${pl.staff.agency ? '' : ' und Agenturpersonal abgeschaltet ist'}. <button class="btn small" data-act="tab" data-tab="staff">Personal öffnen</button></div>`;
    else if (cov.agencyH > 0) html += `<div class="callout warn"><b>Agenturpersonal im Einsatz</b>Heute fliegen ${n0(cov.agencyH)} Personen über Agenturen zum 1,6-fachen Satz. Mehrkosten ${eur(cov.extraCost)} pro Tag. <button class="btn small" data-act="tab" data-tab="staff">Personal öffnen</button></div>`;
  }
  const warns = pl.events.filter((e) => (e.kind === 'warn' || e.kind === 'crit') && e.day >= W.day - 10).slice(-3).reverse();
  for (const e of warns) html += `<div class="callout ${e.kind}"><b>${dateShort(e.day)}</b>${esc(e.msg)}</div>`;
  if (pl.status === 'restructuring') html += `<div class="callout crit"><b>Restrukturierung läuft</b>Ohne positiven Kontostand innerhalb von ${P.RESTRUCT.humanDays - pl.distressDays} Tagen folgt die Insolvenz. <button class="btn small" data-act="tab" data-tab="rescue">Sanierung öffnen</button></div>`;
  const stg = pl.stage(), next = P.STAGES.find((s) => s.min > pl.fleet.length);
  html += `<div class="tiles">
    <div class="tile"><span>Kontostand</span><b class="${netCash(pl) < 0 ? 'neg' : ''}">${eur(netCash(pl))}</b><em>Dispo bis ${eur(-pl.creditLimit(W.macro.bank ?? 1))} · mit Dispo verfügbar ${eur(pl.spendable(W.macro.bank ?? 1))}</em></div>
    <div class="tile"><span>Eigenkapital</span><b>${eur(bs.equity)}</b><em>Start ${eur(pl.ledger.equityContrib / 100)}</em></div>
    <div class="tile"><span>Reichweite</span><b class="${pl.runway < 60 ? 'warnc' : ''}">${pl.runway === undefined || !isFinite(pl.runway) ? 'stabil' : `${n0(pl.runway)} Tage`}</b><em>beim Abfluss der letzten 30 Tage</em></div>
    <div class="tile"><span>Auslastung 7 T.</span><b>${seats ? pct(pax / seats) : '–'}</b><em>${n0(pax / 7)} Pax pro Tag</em></div>
    <div class="tile"><span>Pünktlichkeit</span><b>${otp === null ? '–' : pct(otp)}</b><em>letzte 60 Flüge</em></div>
    <div class="tile"><span>Streckenbeitrag</span><b class="${db2 < 0 ? 'neg' : 'pos'}">${routes.length ? eur(db2, { plus: true }) : '–'}</b><em>pro Tag, Ø 30 Tage</em></div>
    <div class="tile"><span>Marke</span><b>${n0(pl.brand * 100)} / 100</b><em>${pl.maturity(W.day) < 1 ? `wirkt erst zu ${pct(pl.maturity(W.day))} – Bekanntheit wächst im ersten Jahr` : 'Wettbewerber 60–70'}</em></div>
    <div class="tile"><span>Stimmung</span><b class="${pl.staff.morale < 0.5 ? 'warnc' : ''}">${pct(pl.staff.morale)}</b><em>unter 55 % droht Streik</em></div>
    <div class="tile"><span>Ansehen</span><b>${SM.standingOf(pl, W.day).v} / 100</b><em>Leasinggeber, Banken, Flughäfen</em></div>
    ${SM.careerOf(pl) ? `<div class="tile"><span>Phase</span><b>${SM.careerLv(pl) + 1} · ${esc(SM.careerOf(pl).label)}</b><em>${(() => { const c = SM.careerChecks(W, pl); return c ? `${c.checks.filter((x) => x.ok).length} von ${c.checks.length} Zielen für „${esc(c.label)}“` : 'höchste Phase'; })()}</em></div>` : `<div class="tile"><span>Stufe</span><b>${stg.label}</b><em>${next ? `${next.label} ab ${next.min} Flugzeugen` : 'höchste Stufe'}</em></div>`}
  </div>${careerHtml(pl, true)}`;
  if (last) html += `<p class="small ink2">Abgeschlossener Monat ${MONTHS_L[last.label.m]} ${2027 + last.label.y}: Ergebnis <b class="${lastRes < 0 ? 'neg' : 'pos'}">${eur(lastRes, { plus: true })}</b>.</p>`;
  const evs = W.activeEvents().concat(W.upcomingEvents()).filter((e) => e.type !== 'rate_change' && e.type !== 'fx_shock').slice(-4);
  if (evs.length) html += `<div class="stack"><h2 class="sec">Lage <small>laufende und angekündigte Ereignisse</small></h2><div class="news">${evs.map(eventRow).join('')}</div></div>`;
  html += `<div class="stack"><h2 class="sec">Kontostand <small>letzte ${Math.min(netHistOf(pl).length, 365)} Tage</small></h2>${sparkline(netHistOf(pl).slice(-365))}</div>`;
  if (routes.length) {
    const rows = routes.map((r, i) => ({ r, s: st30[i] })).sort((a, b) => b.s.db2 / Math.max(b.s.n, 1) - a.s.db2 / Math.max(a.s.n, 1));
    html += `<div class="stack"><h2 class="sec">Strecken nach Beitrag <small>Ø 30 Tage</small></h2><div class="tw"><table class="t"><thead><tr><th>Strecke</th><th class="r">Auslastung</th><th class="r">Ø Tarif</th><th class="r">DB2/Tag</th></tr></thead><tbody>
      ${rows.map(({ r, s }) => `<tr><td><a href="#" data-act="openroute" data-id="${r.id}">${r.base}–${r.dest}</a> <span class="muted small">${n0(SM.gcDistanceKm(r.base, r.dest))} km · ${freqTxt(r)} ${tlx(r.type_id)}</span></td><td class="r">${s.n ? pct(s.lf) : '–'}</td><td class="r">${s.n ? eur(s.avgFare) : '–'}</td><td class="r ${s.db2 < 0 ? 'neg' : 'pos'}">${s.n ? eur(s.db2 / s.n, { plus: true }) : 'neu'}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  }
  const news = mergedNews().slice(0, 5);
  if (news.length) html += `<div class="stack"><h2 class="sec">Neueste Meldungen</h2><div class="news">${news.map(newsRow).join('')}</div></div>`;
  return html;
};
function decisionCard(d) {
  const pl = W.player, monthly = pl.staffMonthly(cpi());
  if (d.type === 'auditpay') {
    const b = d.bill, Y = P.AUDIT.pay, due = b.claw + b.fine, sk = Math.round(b.fine * Y.skonto / 1e4) * 1e4, cash = netCash(pl);
    const rate = (k) => { const R = Y[k], tot = Math.round(due * R.x / 1e3) * 1e3; return `${R.n} × ${eur(Math.ceil(tot / R.n / 1e3) * 1e3)} = ${eur(tot)}${R.x > 1 ? ` (+${pct(R.x - 1)})` : ' (ohne Aufschlag)'}`; };
    return `<div class="callout crit"><b>Wirtschaftsprüfung – Zahlungsweise wählen bis ${dateShort(d.deadline)}</b><span>${esc(d.text)}</span>
    <div class="stack small" style="margin-top:6px">
      <div class="row"><button class="btn small primary" data-act="decide" data-id="${d.id}" data-choice="now">Sofort zahlen</button><span class="muted">${eur(due - sk)} – ${eur(sk)} Nachlass aufs Bußgeld${cash < due - sk ? '. Reicht das Geld nicht, wird die Hälfte der Kasse bezahlt und der Rest in 12 Raten' : ''}</span></div>
      ${['r6', 'r12', 'r24'].map((k) => `<div class="row"><button class="btn small" data-act="decide" data-id="${d.id}" data-choice="${k}">${Y[k].n} Monatsraten</button><span class="muted">${rate(k)}</span></div>`).join('')}
      <span class="muted">Ohne Wahl bis ${dateShort(d.deadline)}: ${Y[Y.auto].n} Monatsraten. Raten werden am Monatsende abgebucht; die Rückzahlung an den Partner geht zuerst.</span>
    </div></div>`;
  }
  if (d.type === 'agm') {
    const last = pl.ledger.months.at(-1), res = last ? Object.entries(last.acc).reduce((a, [k, v]) => a + (k.startsWith('cf_') ? 0 : v), 0) / 100 : 0, A = P.PAYOUT;
    const opt = (k) => { const r = d.rate * SM.agmFactor(pl, k); return `${pct(r)} vom Monatsgewinn${res > 0 ? ` (zuletzt ${eur(res * r)} im Monat)` : ''}`; };
    const ext = (pl.cap && pl.cap.ext) || d.ext || 0;
    return `<div class="callout warn"><b>Hauptversammlung – Abstimmung bis ${dateShort(d.deadline)}</b><span>${esc(d.text)}</span>
    <div class="stack small" style="margin-top:6px">
      <div class="row"><button class="btn small" data-act="decide" data-id="${d.id}" data-choice="yes">Zustimmen</button><span class="muted">${opt('yes')} für ${A.months} Monate · Kurs +${pct(A.yesSent - 1)}</span></div>
      <div class="row"><button class="btn small primary" data-act="decide" data-id="${d.id}" data-choice="half">Kompromiss</button><span class="muted">Sie stimmen für die Hälfte, die Minderheit für den vollen Antrag: ${opt('half')} für ${A.months} Monate, keine weiteren Folgen</span></div>
      <div class="row"><button class="btn small danger" data-act="decide" data-id="${d.id}" data-choice="no">Mit Mehrheit ablehnen</button><span class="muted">nur der Anteil der Minderheit: ${opt('no')} für ${A.noMonths} Monate · Kurs −${pct(1 - A.noSent)} · Ansehen −${A.noMalus} für ${A.noMonths} Monate</span></div>
      <span class="muted">Ihre Stimmen: ${pct(1 - ext)} · außerhalb ${pct(ext)}. Ohne Abstimmung beschließt die Minderheit den Antrag allein. Was ausgeschüttet wird, verlässt die Airline. Wer alle Aktien zurückkauft, entscheidet künftig allein.</span>
    </div></div>`;
  }
  if (d.type === 'profit') {
    const last = pl.ledger.months.at(-1), res = last ? Object.entries(last.acc).reduce((a, [k, v]) => a + (k.startsWith('cf_') ? 0 : v), 0) / 100 : 0, R = P.PRESSURE;
    return `<div class="callout warn"><b>Entscheidung bis ${dateShort(d.deadline)}</b><span>${esc(d.text)}</span>
    <div class="stack small" style="margin-top:6px">
      <div class="row"><button class="btn small primary" data-act="decide" data-id="${d.id}" data-choice="share">Gewinnbeteiligung</button><span class="muted">${pct(R.unionShare)} vom Monatsgewinn für ${R.unionMonths} Monate (zuletzt wären das ${eur(Math.max(0, res) * R.unionShare)}), nur in Gewinnmonaten, Stimmung +8</span></div>
      <div class="row"><button class="btn small" data-act="decide" data-id="${d.id}" data-choice="bonus">Einmalprämie</button><span class="muted">ein Monatsgehalt (${eur(monthly)}) sofort, wird mit 60 % Wahrscheinlichkeit angenommen</span></div>
      <div class="row"><button class="btn small danger" data-act="decide" data-id="${d.id}" data-choice="reject">Ablehnen</button><span class="muted">dreitägiger Streik in sechs Tagen, Stimmung −8</span></div>
    </div></div>`;
  }
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
  if (dest === base || !dest || !P.AIRPORTS[dest] || !SM.routeKmOk(base, dest)) dest = bestFreeDest(base);
  const types = [...new Set(pl.fleet.filter((a) => a.base === base).map((a) => a.type_id))];
  const starter = () => ['E295', 'AT76', 'A20N', 'A21N', 'A21X', 'A339', 'B789', 'A359'].find((t) => SM.rangeOk(base, dest, t) && !SM.riskTerms(pl, t).reject) || ['E295', 'A20N', 'B789', 'A359', 'A35U'].find((t) => SM.rangeOk(base, dest, t)) || 'A20N';
  let type = types.find((t) => SM.rangeOk(base, dest, t)) || starter();
  if (!SM.rangeOk(base, dest, type)) type = starter();
  const st = pl.stations[dest];
  return { base, dest, type, freq: 1, wk: 7, role: 'mixed', service: 'standard', buffer: 'normal', fo: Math.round(SM.refPrice(base, dest, cpi())), fi: Math.round(SM.refPrice(dest, base, cpi())),
    auto: true, target: 0.85, term: st ? st.terminal : 'std' };
}
VIEWS.routes = function viewRoutes() {
  const pl = W.player, routes = pl.routes.filter((r) => !r.closed);
  const s30 = routes.map((r) => rstats(r, 30)), db = s30.reduce((a, x) => a + x.db2 / Math.max(x.n, 1), 0);
  let html = `<div class="spread"><h2 class="sec">Ihr Netz <small>${routes.length} Strecken${routes.length ? ` · DB2 ${eur(db, { plus: true })} pro Tag` : ''}</small></h2><button class="btn primary" data-act="plan">Neue Strecke planen</button></div>`;
  if (!routes.length) html += `<div class="callout info">Noch keine Strecke. Wählen Sie ein Ziel auf der Karte oder öffnen Sie die Planung. Sie brauchen dafür ein Flugzeug an Ihrer Basis.</div>`;
  else {
    const shown = sortRoutes(routes.filter(fltRoute));
    html += fltBar('routes') + (shown.length < routes.length ? `<p class="small muted">${shown.length} von ${routes.length} Strecken · DB2 ${eur(shown.map((r) => rstats(r, 30)).reduce((a, x) => a + x.db2 / Math.max(x.n, 1), 0), { plus: true })} pro Tag</p>` : '');
    html += shown.length ? `<div class="rlist">${shown.map(routeItem).join('')}</div>` : '<p class="small muted">Keine Strecke passt zum Filter.</p>';
  }
  const np = (pl.plans || []).length;
  return (np ? `<div class="callout info row" style="gap:8px;align-items:center"><span><b>${np} gespeicherte${np > 1 ? '' : 'r'} ${np > 1 ? 'Pläne' : 'Plan'}</b> noch nicht umgesetzt · nächste Slotvergabe ${slotDateTxt()}</span><button class="btn small" data-act="tab" data-tab="plans" style="margin-left:auto">Pläne ansehen</button></div>` : '') + html;
};
const slotDateTxt = () => { const n = SM.nextSlotDay(W.day); return `${dateLong(n.day)} (${n.summer ? 'Sommer' : 'Winter'}flugplan, in ${n0(n.day - W.day)} Tagen)`; };
/** Reiter „Pläne“: gespeicherte, noch nicht umgesetzte Strecken und Frequenzerhöhungen. */
VIEWS.plans = function viewPlans() {
  const pl = W.player, plans = pl.plans || [];
  let html = `<h2 class="sec">Pläne <small>gespeichert, noch nicht umgesetzt</small></h2>
    <div class="callout info"><b>Nächste Slotvergabe: ${slotDateTxt()}</b><span class="small">Zum 1. April und 1. Oktober kommt an jedem koordinierten Flughafen ein Slot dazu, und die Wartelisten werden der Reihe nach bedient (je Wartendem ein Slot, dann der Nächste). Freie Slots ohne Warteschlange können Sie jederzeit kaufen. Pläne mit „automatisch“ starten, sobald alle Slots da sind.</span></div>`;
  html += `<p class="small"><a href="#" data-act="tab" data-tab="slots">Slots ohne Strecke kaufen oder auf die Warteliste → Strecken → Slots</a></p>`;
  if (!plans.length) return html + `<p class="small muted">Keine Pläne. In der <a href="#" data-act="tab" data-tab="plan">Planung</a> können Sie jede Strecke „als Plan speichern“ – etwa, wenn Slots fehlen oder Sie sie später eröffnen wollen.</p>`;
  html += `<div class="stack">${plans.map((x) => {
    const miss = W.planMissing(pl, x) || {}, r = x.route ? pl.routes.find((y) => y.id === x.route) : null, ready = !Object.keys(miss).length;
    const waits = (W.slotWait || []).filter((e) => e.plan === x.id);
    const acHere = pl.fleet.filter((a) => a.type_id === x.type && a.base === x.base).length;
    const sc = W.slotCost(pl, x.base, x.dest, r ? Math.max(0, x.freq - r.freq) : x.freq).cost, st = !r && !pl.stations[x.dest] ? SM.stationFee(W, x.dest) : 0;
    const slots = ready ? '<span class="chip good">alle Slots da</span>' : Object.entries(miss).map(([a, n]) => { const e = waits.find((y) => y.apt === a); if (!e) return `<span class="chip crit">${a}: ${n} fehl${n > 1 ? 'en' : 't'} · nicht auf der Warteliste</span>`; const g = W.waitForecast(a).byId[e.id] || 0; return `<span class="chip ${g >= n ? 'good' : 'warn'}" title="Prognose für den nächsten Vergabetermin: ${g} von ${n} Slots">${a}: ${n} fehl${n > 1 ? 'en' : 't'} · Platz ${W.waitPos(e)} · am ${dateShort(SM.nextSlotDay(W.day).day)} ${g >= n ? 'voraussichtlich alle' : g ? `voraussichtlich ${g}` : 'voraussichtlich keiner'}</span> <button class="btn small ghost" data-act="slotleave" data-id="${e.id}" title="Von der Warteliste streichen">austragen</button>`; }).join(' ');
    return `<div class="card pad stack"><div class="spread"><div><b class="mono" style="font-size:16px">${x.base}–${x.dest}</b> <span class="small muted">${esc(apName(x.dest))} · ${n0(SM.gcDistanceKm(x.base, x.dest))} km</span></div><span class="small muted">gespeichert ${dateShort(x.day)}</span></div>
      <div class="small">${r ? `Frequenz von ${r.freq}× auf <b>${x.freq}× täglich</b>` : `<b>${x.freq}× täglich</b> · ${tlx(x.type)} · Tarif ${eur(x.fo)} / ${eur(x.fi)}`}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap">${slots} ${r ? '' : acHere ? `<span class="chip">${acHere}× ${x.type} in ${x.base} stationiert</span>` : `<span class="chip warn">kein ${x.type} in ${x.base} – vorher beschaffen</span>`}</div>
      ${ready ? `<div class="small ink2">Beim Umsetzen fällig: ${[sc ? 'Slots ' + eur(sc) : '', st ? 'Station ' + eur(st) : ''].filter(Boolean).join(' + ') || 'nichts'}</div>` : ''}
      <div class="row" style="gap:6px;flex-wrap:wrap"><label class="chk small"><input type="checkbox" data-planauto="${x.id}" ${x.auto ? 'checked' : ''}> automatisch umsetzen</label>
        <button class="btn small ${ready ? 'primary' : ''}" data-act="planrun" data-id="${x.id}" ${ready ? '' : 'disabled'}>Jetzt umsetzen${ready && sc + st ? ' · ' + eurB(sc + st) : ''}</button>
        ${r ? '' : `<button class="btn small" data-act="planedit" data-id="${x.id}">Im Planer öffnen</button>`}
        ${!ready && Object.keys(miss).some((a) => !waits.some((e) => e.apt === a)) ? `<button class="btn small" data-act="planwait" data-id="${x.id}">auf Warteliste setzen</button>` : ''}
        <button class="btn small danger" data-act="plandel" data-id="${x.id}">Löschen</button></div></div>`;
  }).join('')}</div>`;
  return html;
};
VIEWS.plan = function viewPlan() {
  if (!ui.planner) { const pl = W.player; ui.planner = defaultPlanner(ui.selApt && !pl.bases.includes(ui.selApt) ? ui.selApt : null); ui.selApt = ui.planner.dest; setTimeout(() => { renderDraft(); renderMapRoutes(true); }, 0); }
  return viewPlanner();
};
/** 0.21.35: Flugverbote, gesperrte Flughäfen, Umwege und Sonderabgaben für eine Strecke – laufend und angekündigt. */
function geoNotes(al, o, d) {
  const out = [], seen = new Set(), clean = (t) => esc(String(t || '').replace(/^Angekündigt: /, ''));
  const ban = W.routeBan(al, o, d);
  if (ban) { seen.add(ban.id); out.push(['crit', `<b>Flugverbot bis ${dateShort(ban.end)}:</b> ${clean(ban.text)}`]); }
  for (const c of [o, d]) { const h = W.opsAt(c).hard; if (h && !seen.has(h.id)) { seen.add(h.id); out.push(['crit', `<b>${c} gesperrt bis ${dateShort(h.end)}:</b> ${clean(h.text)}`]); } }
  for (const e of W.upcomingEvents()) {
    if (seen.has(e.id) || e.cancelled) continue;
    const hit = (e.ban && W.routeBan(al, o, d, e.start) === e) || (e.ops && (e.ops.cancel || 0) >= 1 && [o, d].some((c) => W.opsAt(c, e.start).hard === e));
    if (hit) { seen.add(e.id); out.push(['warn', `<b>Ab ${dateShort(e.start)} ${e.ban ? 'verboten' : 'gesperrt'}:</b> ${clean(e.text)}`]); }
  }
  const dt = W.detour(al, o, d);
  if (dt.km > 0) out.push(['warn', `<b>Umweg +${n0(dt.km)} km</b> um gesperrten Luftraum (${esc(dt.e.overfly.name || dt.e.short || '')}): rund ${pct(dt.x - 1)} mehr Kerosin und Flugzeit, bis ${dateShort(dt.e.end)}.`]);
  const ff = Math.max(W.foreignFeeX(al, o), W.foreignFeeX(al, d));
  if (ff > 1) out.push(['warn', `<b>Sonderabgabe</b> für ausländische Airlines: Entgelte dort +${pct(ff - 1)}.`]);
  return out.map(([k, t]) => `<div class="callout ${k}"><span>${t}</span></div>`).join('');
}
/** Heutiger Betrieb einer Strecke: Umläufe mit Flugzeug und Ausfälle mit Grund – dieselben Würfel wie in der Tagessimulation. */
function todayOps(r, al = W.player) {
  const f = W.day < r.opened_day ? 0 : (r.flyingToday || 0), n = Math.ceil(f - 1e-9), risk = n ? W.legRisk(al, r) : null, why = {};
  let canc = 0;
  for (let i = 0; i < n; i++) { const x = W.legCancel(al, r, i, W.day, risk); if (x.c) { canc += Math.min(1, f - i); why[x.why] = (why[x.why] || 0) + 1; } }
  return { f, n, canc, all: n > 0 && canc >= f - 1e-6, why: Object.keys(why) };
}
/** Warum fehlen einer Strecke heute Flugzeuge? */
function noAcWhy(r, pl = W.player) {
  const d = W.day, acs = pl.fleet.filter((a) => a.type_id === r.type_id && a.base === r.base), out = [];
  if (!acs.length) return `kein ${tl(r.type_id)} in ${r.base}`;
  const cnt = (f) => acs.filter(f).length;
  const nC = cnt((a) => a.acmi && a.acmi.start <= d && a.acmi.end > d); if (nC) out.push(`${nC} verchartert`);
  const nP = cnt((a) => a.mode === 'charter' && !(a.acmi && a.acmi.start <= d && a.acmi.end > d)); if (nP) out.push(`${nP} im Charter-Pool`);
  const nM = cnt((a) => (a.status === 'ccheck' || a.status === 'aog') && a.until > d); if (nM) out.push(`${nM} in der Werft`);
  const nD = cnt((a) => a.delivery_day > d); if (nD) out.push(`${nD} noch nicht geliefert`);
  return out.join(', ') || 'Flugzeuge mit anderen Strecken ausgelastet';
}
function routeItem(r) {
  const s7 = rstats(r, 7), s30 = rstats(r, 30), open = ui.expanded === r.id;
  const waiting = W.day < r.opened_day ? `startet ${dateShort(r.opened_day)}` : r.partial ? `Teilbetrieb: fliegt an ${pct(r.partial)} der Tage` : r.wk && r.wk < 7 ? ((r.flyingToday || 0) < r.wk / 7 - 1e-6 ? `${Math.round((r.flyingToday || 0) * 7)} von ${r.wk} Flügen pro Woche haben ein Flugzeug` : null) : (r.flyingToday || 0) < r.freq ? `heute ${r.flyingToday || 0} von ${r.freq} Umläufen mit Flugzeug (${noAcWhy(r)})` : null;
  const tdy = todayOps(r), cxTxt = tdy.canc > 0 ? (tdy.all ? `heute fällt alles aus: ${tdy.why.join(', ')}` : `heute ${n0(tdy.canc)} von ${tdy.n} Umläufen annulliert: ${tdy.why.join(', ')}`) : null;
  const lfo = SM.routeLf(r, 7, 'out'), lfi = SM.routeLf(r, 7, 'in');
  let html = `<div class="ritem${open ? ' open' : ''}"><button class="rhead" data-act="toggle" data-id="${r.id}" aria-expanded="${open}">
    <div><div class="rcode">${r.base}<span class="arr">⇄</span>${r.dest}</div><div class="rmeta">${apName(r.dest)} · ${n0(SM.gcDistanceKm(r.base, r.dest))} km · ${n1(SM.blockHours(r.base, r.dest, r.type_id))} h · ${freqTxt(r)}${r.role === 'feeder' ? ' · Zubringer' : r.role === 'local' ? ' · Endziel' : ''} · ${tlx(r.type_id)} · ${svcLabel(r.service)}${r.ap ? ` · <span class="chip" title="Preisautomatik: ${esc(apSummary(SM.apCfgOf(r), r.ap))}">Auto ${pct(r.ap)}</span>${r.pm && r.pm !== 1 ? ` <span class="chip" title="Premiumaufschlag">Premium ${pct(r.pm)}</span>` : ''}` : ''}${(() => { const c = SM.cabinSeats(r.type_id, r.service, r.cab); return c.f || c.b ? ` · <span title="Sitze je Flug: First / Business / Economy">${c.f ? c.f + ' F · ' : ''}${c.b} B · ${c.e} Y</span>` : ''; })()} ${waiting ? `· <span class="warnc">${waiting}</span>` : ''}${cxTxt ? ` · <span class="neg">${esc(cxTxt)}</span>` : ''}</div></div>
    ${(() => { const h = s7.n >= 5 ? s7 : s30; return `<div class="rdb ${h.db2 < 0 ? 'neg' : 'pos'}">${h.n ? eur(h.db2 / h.n, { plus: true }) : '–'}<small>DB2 pro Tag${h === s7 ? ' · 7 T' : ''}</small></div>`; })()}
    <div class="lfrow"><span>hin</span><div class="bar"><i class="me" style="width:${(lfo * 100).toFixed(0)}%"></i></div><span class="num">${s7.n ? pct(lfo) : '–'}</span></div>
    <div class="lfrow"><span>zurück</span><div class="bar"><i class="me" style="width:${(lfi * 100).toFixed(0)}%"></i></div><span class="num">${s7.n ? pct(lfi) : '–'}</span></div>
  </button>`;
  if (open) html += routeBody(r, s7, s30);
  return html + '</div>';
}
/** Fast ausgebuchte Richtung erkennen – nur aus der Auslastung der geflogenen Flüge (wie viele Reisende keinen Platz bekamen, zeigt das Spiel nicht). */
function fullAdvice(r, s30) {
  const lo = SM.routeLf(r, 7, 'out'), li = SM.routeLf(r, 7, 'in'), name = (d) => (d === 'out' ? `${r.base} → ${r.dest}` : `${r.dest} → ${r.base}`);
  const fo = lo >= 0.95, fi = li >= 0.95; if (!fo && !fi) return null;
  if (fo && fi) return ['good', `Beide Richtungen sind fast ausgebucht (${pct(lo)} / ${pct(li)} in den letzten 7 Tagen): ${s30.n >= 7 && s30.db2 < 0 ? 'Preis erhöhen – mehr Frequenz lohnt erst, wenn die Strecke Geld verdient.' : 'Preis erhöhen, Frequenz ausbauen oder ein größeres Flugzeug einsetzen.'}`];
  const [d, other] = fo ? ['out', li] : ['in', lo];
  return ['good', `${name(d)} ist fast ausgebucht (${pct(fo ? lo : li)} in den letzten 7 Tagen), die Gegenrichtung liegt bei ${pct(other)}: ${other < 0.75 ? `Preis in Richtung ${name(d)} erhöhen – mehr Frequenz brächte vor allem leere Rückflüge.` : 'Preis erhöhen oder Frequenz ausbauen.'}`];
}
function insights(r, s7, s30) {
  const out = [], pl = W.player;
  { const h = pl.rotH(r), w = SM.winOf(r.type_id); if (h > w) { const k = SM.kOf(r.type_id, h), have = pl.fleet.filter((a) => a.type_id === r.type_id && a.base === r.base && a.delivery_day <= W.day).length;
    if (r.partial) out.push(['warn', `Langstrecke: Ein Umlauf dauert ${n1(h)} Stunden, ein Flugzeug ist ${k} Tage unterwegs. Für täglichen Betrieb braucht es ${k} Flugzeuge (${tl(r.type_id)} in ${r.base}); mit ${have} fliegt die Strecke an ${pct(r.partial)} der Tage.`]);
    else out.push(['info', `Langstrecke: Ein Umlauf dauert ${n1(h)} Stunden und bindet ${k} Flugzeuge pro täglichem Flug.`]); } }
  const ramp = r.ramp(W.day, pl.rampT());
  if (ramp < 0.9 && W.day >= r.opened_day) out.push(['info', `Markthochlauf: Die Strecke ist erst zu ${pct(ramp)} bekannt. Marketing und eine Marketingfachkraft beschleunigen das.`]);
  { const fa = s7.n >= 3 ? fullAdvice(r, s30) : null; if (fa) out.push(fa); }
  // Bewertung nach den letzten 7 Tagen (wie Auslastungsbalken und Kopfzeile) – sonst widersprechen sich alte 30-Tage-Werte und die aktuelle Lage
  const rec = s7.n >= 5 ? s7 : s30.n >= 14 ? s30 : null, span = rec === s7 ? 'in den letzten 7 Tagen' : 'in den letzten 30 Tagen';
  if (rec && rec.lf < 0.6) out.push(['warn', `Nur ${pct(rec.lf)} Auslastung ${span}. Preis senken, kleineres Flugzeug oder weniger Frequenz prüfen.`]);
  if (rec && rec.db1 > 0 && rec.db2 < 0) out.push(['warn', `Deckt ${span} die direkten Flugkosten, aber nicht die Flugzeugzeit. Lohnt nur, wenn das Flugzeug sonst leer stünde.`]);
  if (rec && rec.db1 < 0) out.push(['crit', `Deckt ${span} nicht einmal die direkten Flugkosten. Jeder Flug verbrennt Geld.`]);
  if (rec === s7 && s30.n >= 14 && s30.n > s7.n && (s30.db2 < 0) !== (s7.db2 < 0)) out.push(['info', `Über 30 Tage liegt die Strecke bei ${eur(s30.db2 / s30.n, { plus: true })} DB2 pro Tag, in den letzten 7 Tagen bei ${eur(s7.db2 / s7.n, { plus: true })}. ${s7.db2 >= 0 ? 'Die schwächeren Wochen davor ziehen den Monatsschnitt noch nach unten – die Strecke hat sich gefangen.' : 'Die letzten Tage sind schwächer als der Monat – Preis, Konkurrenz und Ereignisse prüfen.'}`]);
  if (s30.tr > 0) { const n = Math.max(s30.n, 1); out.push(['info', `Ø ${n0(s30.tr / n)} Umsteiger pro Tag über ${r.base}${s30.trrN ? `, Erlösanteil Ø ${eur(s30.trr / s30.trrN)} pro Tag` : ''}. Der Erlös einer Umsteigerreise wird nach den Einzeltarifen der Teilstrecken aufgeteilt. Mehr unter Strecken → Drehkreuze.`]); }
  const comp = W.competitorOffers(W.playerId, r.base, r.dest);
  const cheap = comp.filter((c) => c.fare < r.fare_out * 0.9);
  if (cheap.length) { const c = cheap.sort((a, b) => a.fare - b.fare)[0], full = s7.n >= 3 && Math.min(SM.routeLf(r, 7, 'out'), SM.routeLf(r, 7, 'in')) >= 0.85;
    out.push([full ? 'info' : 'warn', `${W.airlines[c.airline].name} fliegt dieselbe Strecke ${pct(1 - c.fare / r.fare_out)} günstiger (${eur(c.fare)})${full ? '. Ihre Flüge sind trotzdem gut gefüllt – kein Grund, nachzuziehen.' : '.'}`]); }
  if (s30.flights && s30.cancelled) out.push(['info', `${s30.cancelled} Flugausfälle in 30 Tagen (Technik, Wetter, Streik oder Personal). Betreuung und Entschädigung sind gebucht.`]);
  return out;
}
/** Heute und gestern auf einer Strecke – tagesaktuell statt nur Durchschnitt. */
function routeDayHtml(r) {
  if (W.day < r.opened_day) return '';
  const t = todayOps(r), last = r.hist.at(-1), y = W.day - 1;
  const today = !t.n ? `<b>Heute kein Flug</b> – ${esc(noAcWhy(r))}.` : t.canc > 0 ? `<b>Heute ${t.all ? 'fallen alle Flüge aus' : `fallen ${n0(t.canc)} von ${t.n} Umläufen aus`}</b>: ${esc(t.why.join(', '))}. Gebuchte Gäste werden betreut und entschädigt, Erlös gibt es für diese Flüge nicht.`
    : `<b>Heute</b> ${t.n === 1 && t.f < 1 ? 'fliegt die Strecke' : `${t.n} ${t.n > 1 ? 'Umläufe' : 'Umlauf'} (${t.n * 2} Flüge)`} planmäßig.`;
  const nf = (x) => (Math.abs(x - Math.round(x)) < 0.05 ? n0(x) : n1(x));
  const yd = !last ? 'noch keine Flüge' : last.d === y ? `gestern ${nf(last.flights)} Flüge${last.cancelled ? `, davon ${nf(last.cancelled)} ausgefallen` : ''} · ${n0(last.pax)} Passagiere · ${eur(last.rev - last.cost, { plus: true })} DB1`
    : `zuletzt geflogen am ${dateShort(last.d)}`;
  return `<div class="callout ${!t.n || t.canc > 0 ? 'crit' : 'info'}"><span>${today}</span><span class="small muted">${yd}</span></div>`;
}
function routeBody(r, s7, s30) {
  const comp = W.competitorOffers(W.playerId, r.base, r.dest);
  const c = ui.confirm === 'close:' + r.id;
  const pend = r.pending.length ? `<p class="small warnc">Neue Preise ${n0(r.pending.at(-1)[1])} / ${n0(r.pending.at(-1)[2])} € gelten ab ${dateShort(r.pending.at(-1)[0])}.</p>` : '';
  const ins = insights(r, s7, s30);
  const n = Math.max(s30.n, 1);
  return `<div class="rbody">
    ${routeDayHtml(r)}
    ${geoNotes(W.player, r.base, r.dest)}
    ${ins.map(([k, t]) => `<div class="callout ${k}">${esc(t)}</div>`).join('')}
    <p class="small muted" style="margin:6px 0 2px">Durchschnitt der letzten ${s30.n} Tage</p>
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
        <label class="f"><span>Tarif ${r.base} → ${r.dest} (€)</span><input type="number" id="ef-o-${r.id}" min="10" max="5000" step="5" value="${Math.round(r.fare_out)}"></label>
        <label class="f"><span>Tarif ${r.dest} → ${r.base} (€)</span><input type="number" id="ef-i-${r.id}" min="10" max="5000" step="5" value="${Math.round(r.fare_in)}"></label>
      </div>
      <div class="row erow">
        <label class="f" style="flex:1"><span>Frequenz</span><select id="ef-f-${r.id}">${freqOpts(r.wk || 7, r.freq)}</select></label>
        <label class="f" style="flex:1"><span>Rolle</span><select id="ef-r-${r.id}" title="${esc(Object.values(ROLE_TXT).map((x) => x.label + ': ' + x.tip).join(' '))}">${Object.entries(ROLE_TXT).map(([k, x]) => `<option value="${k}" ${(r.role || 'mixed') === k ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>
        <label class="f" style="flex:1"><span>Produkt</span><select id="ef-s-${r.id}">${Object.keys(P.SERVICE).map((s) => `<option value="${s}" ${s === r.service ? 'selected' : ''}>${svcLabel(s)}</option>`).join('')}</select></label>
        <label class="f" style="flex:1"><span>Flugzeugtyp</span><select id="ef-ty-${r.id}">${[...new Set([r.type_id, ...W.player.fleet.filter((x) => x.base === r.base).map((x) => x.type_id)])].filter((t) => SM.rangeOk(r.base, r.dest, t)).map((t) => `<option value="${t}" ${t === r.type_id ? 'selected' : ''}>${t} · ${P.AIRCRAFT_TYPES[t].seats[r.service]} Sitze</option>`).join('')}</select></label>
        <label class="f" style="flex:1"><span>Puffer</span><select id="ef-b-${r.id}">${Object.keys(P.BUFFER_POLICY).map((b) => `<option value="${b}" ${b === r.buffer ? 'selected' : ''}>${bufLabel(b)}</option>`).join('')}</select></label>
      </div>
      ${(() => {
        const coordEnds = [r.base, r.dest]; if (r.freq >= 8 || (r.wk && r.wk < 7)) return '';
        const lack = coordEnds.filter((x) => W.slotsFreeFor(W.player, x) < 1), planned = (W.player.plans || []).find((x) => x.route === r.id);
        if (planned) return `<p class="small">In Planung: ${planned.freq}x täglich – wartet auf Slots (Strecken → In Planung).</p>`;
        if (lack.length) return `<div class="row small" style="gap:8px;flex-wrap:wrap"><span class="warnc">Für mehr Flüge fehlen Slots in ${lack.join(' und ')}.</span><button class="btn small" data-act="planfreq" data-id="${r.id}" data-v="${r.freq + 1}">${r.freq + 1}x täglich in Planung speichern + Warteliste</button></div>`;
        const sc = W.slotCost(W.player, r.base, r.dest, 1);
        return sc.cost > 0 ? `<p class="small muted">Ein weiterer Flug täglich braucht ${sc.parts.map((x) => `einen Slot in ${x.apt}`).join(' und ')}: einmalig ${eur(sc.cost)}.</p>` : '';
      })()}
      ${(() => {
        const cfg = SM.apCfgOf(r), hasPrem = (() => { const c = SM.cabinSeats(r.type_id, r.service, r.cab); return !!(c.f || c.b); })(), ref = SM.refPrice(r.base, r.dest, W.macro.cpi);
        const C = P.CABIN[SM.haulOf(r.type_id)], pm = r.pm || 1;
        const premRow = hasPrem && !(r.ap && cfg.plf) ? `<div class="ap-row"><span class="small muted" title="Aufschlag für Business/First gegenüber dem Standard (Business ${n1(C.bizMult)}-fach Economy). Höher: mehr Erlös je Gast, weniger Premiumgäste.">Premiumaufschlag</span><div class="seg wrap">${[0.7, 0.85, 1, 1.2, 1.4].map((v) => `<button data-act="pmset" data-id="${r.id}" data-v="${v}" aria-pressed="${Math.abs(pm - v) < 0.004}">${pct(v)}</button>`).join('')}</div><span class="small muted">Business ≈ ${eur(r.fare_out * C.bizMult * pm)}</span></div>` : hasPrem ? `<p class="small muted">Premiumaufschlag derzeit ${pct(pm)} – Business ≈ ${eur(r.fare_out * C.bizMult * pm)} (von der Automatik geführt).</p>` : '';
        return `<label class="chk"><input type="checkbox" id="ap-${r.id}" data-ap="${r.id}" ${r.ap ? 'checked' : ''}> Preisautomatik: jede Woche Schritte Richtung Ziel-Auslastung, in Extremfällen sofort</label>
        ${r.ap ? `<div class="ap-box">${apRows(cfg, r.ap, r.id, hasPrem)}
          <div class="row small" style="gap:8px;flex-wrap:wrap"><span class="muted">Preisband hier: ${eur(Math.max(cfg.min * ref, 0)) === eur(0) ? 'Kostengrenze' : eur(cfg.min * ref)} bis ${eur(cfg.max * ref)} (Referenz ${eur(ref)})</span><button class="btn small" data-act="apstd" data-id="${r.id}">Standard aus dem Strategie-Hub übernehmen</button></div></div>` : ''}
        ${premRow}
        <p class="small muted">${r.ap ? 'Die Automatik startet zwei Wochen nach Eröffnung, verschiebt die Preise in kleinen Schritten und geht nie unter die Kostengrenze. Liegt ein Preis außerhalb des Bands, wandert er schrittweise zurück.' : 'Ohne Automatik führen Sie die Preise selbst.'} Die Konkurrenz beobachtet Ihre Tarife und reagiert jede Woche.</p>`;
      })()}
      ${pend}
      <div class="row"><button class="btn primary" data-act="applyroute" data-id="${r.id}">Änderungen übernehmen</button>
        ${c ? `<span class="small">Strecke wirklich einstellen?</span><button class="btn danger small" data-act="closeroute" data-id="${r.id}">Ja, einstellen</button><button class="btn small" data-act="cancelconfirm">Abbrechen</button>`
    : `<button class="btn danger" data-act="askclose" data-id="${r.id}" style="margin-left:auto">Strecke einstellen</button>`}</div>
      <p class="small muted">Preise wirken nach ${P.PRICE_CHANGE_LAG_DAYS} Tagen (Buchungsvorlauf). Mehr Frequenz braucht freie Flugzeugzeit, Crews und freie Slots an beiden Flughäfen.</p>
    </div>
    <div class="stack"><h3>Wettbewerb auf ${r.base}–${r.dest}</h3>${comp.length ? `<table class="t"><thead><tr><th>Airline</th><th class="r">Flüge/Tag</th><th class="r">Tarif hin</th><th>Produkt</th><th></th></tr></thead><tbody>${comp.map((o) => { const a = W.airlines[o.airline]; return `<tr><td><span class="sw" style="background:${colorOf(a)}"></span> ${esc(a.name)}</td><td class="r">${o.freq}</td><td class="r">${eur(o.fare)}</td><td>${svcLabel(o.service)}</td><td class="r">${a && a.id !== W.playerId && W.airlines[o.airline] ? `<button class="btn small" data-act="dealexit" data-al="${a.id}" data-pair="${SM.pairKey(r.base, r.dest)}" title="Ablöse für den Rückzug anbieten">Rückzug verhandeln</button>` : ''}</td></tr>`; }).join('')}</tbody></table>` : '<p class="small muted">Keine Direktkonkurrenz. Ab 900 km konkurrieren Sie mit Umsteigeverbindungen über fremde Drehkreuze.</p>'}</div>
  </div>`;
}

/** Saisonverlauf einer Strecke: Nachfrage je Monat im Verhältnis zum Jahresmittel, dazu angekündigte Großereignisse. */
function seasonHtml(a, b) {
  const tot = (q) => q.leisure + q.business + q.vfr, v = Array.from({ length: 12 }, (_, m) => tot(SM.qPot(a, b, m)) + tot(SM.qPot(b, a, m)));
  const avg = v.reduce((x, y) => x + y, 0) / 12 || 1, rel = v.map((x) => x / avg), mx = Math.max(...rel), cur = SM.monthOf(W.day);
  const hi = rel.map((x, m) => [x, m]).filter(([x]) => x >= 1.12).map(([, m]) => MONTHS[m]), lo = rel.map((x, m) => [x, m]).filter(([x]) => x <= 0.85).map(([, m]) => MONTHS[m]);
  const ev = W.activeEvents().concat(W.upcomingEvents()).filter((e) => e.type === 'mega' || e.type === 'big_event').filter((e) => W.eventAffects(e, a) || W.eventAffects(e, b));
  return `<div class="season"><div class="spread small"><b>Saison</b><span class="muted">${hi.length ? 'Hoch: ' + hi.join(', ') : 'ganzjährig ähnlich'}${lo.length ? ' · Tief: ' + lo.join(', ') : ''}</span></div>
    <div class="sbars">${rel.map((x, m) => `<div class="sb${m === cur ? ' cur' : ''}" title="${MONTHS[m]}: ${pct(x)} des Jahresmittels"><i style="height:${Math.max(6, x / mx * 100).toFixed(0)}%" class="${x >= 1.12 ? 'hi' : x <= 0.85 ? 'lo' : ''}"></i><span>${MONTHS[m].slice(0, 1)}</span></div>`).join('')}</div>
    ${ev.length ? `<div class="small">${ev.map((e) => `<span class="chip good">${e.start > W.day ? 'ab ' + dateShort(e.start) : 'jetzt'}</span> ${esc(e.text)}`).join('<br>')}</div>` : ''}</div>`;
}
// Planer
/** Vorschläge aus abgeschlossenen Streckenanalysen für die gewählte Basis (nur Ziele, die Sie noch nicht fliegen). */
function studySuggest(base) {
  const pl = W.player, flown = new Set(pl.activeRoutes().map((r) => SM.pairKey(r.base, r.dest))), best = new Map();
  for (const rep of (pl.reports || []).filter((r) => r.status === 'done' && r.kind === 'routes' && r.res && r.res.rows)) {
    for (const x of rep.res.rows) { if (x.o !== base || flown.has(SM.pairKey(x.o, x.d))) continue; const cur = best.get(x.d); if (!cur || rep.ready >= cur.day) best.set(x.d, { ...x, day: rep.ready }); }
  }
  const list = [...best.values()].sort((a, b) => b.db2 - a.db2).slice(0, 6);
  if (!list.length) return `<p class="small muted">Noch keine Streckenanalyse für ${base}. <a href="#" data-act="plstudy" data-base="${base}">Streckenanalyse ab ${base} beauftragen</a> – sie schlägt Ziele mit Prognose vor und verbessert Ihr Marktwissen.</p>`;
  return `<div class="stack" style="gap:6px"><span class="small muted">Aus Ihren Marktstudien (Beitrag pro Tag laut Studie, Stand ${dateShort(list[0].day)}):</span><div class="row" style="gap:6px;flex-wrap:wrap">${list.map((x) => `<button class="btn small${x.db2 > 0 ? '' : ' ghost'}" data-act="plpick" data-d="${x.d}" data-t="${x.type}" title="${esc(apName(x.d))} · ${n0(x.km)} km · Auslastung ${pct(x.lf)}">${x.d} · ${x.type} · <span class="${sgn(x.db2)}">${eur(x.db2, { plus: true })}</span></button>`).join('')}</div></div>`;
}
/** Ziele der Streckenplanung: Entfernungsfilter, Reichweite, Ordnung (Region, Entfernung, Größe). Das aktuelle Ziel bleibt immer wählbar. */
function planDests(p) {
  const base = p.base, F = fltState('plan'), km = (c) => SM.gcDistanceKm(base, c);
  const all = SM.AP_CODES.filter((c) => c !== base && SM.routeKmOk(base, c));
  const list = all.filter((c) => kmOk(F, km(c)) && (!F.range || SM.rangeOk(base, c, p.type)));
  const opt = (c) => `<option value="${c}" ${c === p.dest ? 'selected' : ''}>${esc(apName(c))} ${c} (${n0(km(c))} km)</option>`;
  let groups;
  if (F.sort === 'km' || F.sort === 'kmd') {
    const sorted = list.slice().sort((a, b) => (km(a) - km(b)) * (F.sort === 'kmd' ? -1 : 1));
    const bands = KM_BANDS.filter(([k]) => k && k !== 'own').map(([k, l]) => { const [lo, hi] = kmRange({ km: k }); return [l, sorted.filter((c) => km(c) >= lo && km(c) < hi)]; }).filter(([, l]) => l.length);
    groups = F.sort === 'kmd' ? bands.reverse() : bands;
  } else if (F.sort === 'pax') {
    const pax = (c) => P.AIRPORTS[c].pax || 0, sorted = list.slice().sort((a, b) => pax(b) - pax(a));
    groups = [['Drehkreuze (über 50 Mio. Gäste)', (c) => pax(c) > 50], ['Groß (20–50 Mio.)', (c) => pax(c) > 20 && pax(c) <= 50], ['Mittel (8–20 Mio.)', (c) => pax(c) > 8 && pax(c) <= 20], ['Klein (bis 8 Mio.)', (c) => pax(c) <= 8]].map(([l, f]) => [l, sorted.filter(f)]).filter(([, l]) => l.length);
  } else groups = byRegion(list);
  const extra = !list.includes(p.dest) && P.AIRPORTS[p.dest] ? `<optgroup label="Aktuelles Ziel (außerhalb des Filters)">${opt(p.dest)}</optgroup>` : '';
  return { html: extra + groups.map(([rg, l]) => `<optgroup label="${esc(rg)}">${l.map(opt).join('')}</optgroup>`).join(''), n: list.length, all: all.length, F };
}
function viewPlanner() {
  const p = ui.planner, pl = W.player, base = p.base;
  const D = planDests(p), FP = D.F;
  const types = Object.keys(P.AIRCRAFT_TYPES).filter((t) => !P.AIRCRAFT_TYPES[t].role);
  const st = pl.stations[p.dest];
  return `<div class="card pad stack" id="planner">
    <div class="spread"><h2 class="sec">Neue Strecke ${base}–${p.dest} <small>${n0(SM.gcDistanceKm(base, p.dest))} km · ${n1(SM.blockHours(base, p.dest, p.type))} h Flugzeit</small></h2><button class="btn small" data-act="closeplan">Verwerfen</button></div>
    <p class="small muted">Tipp: Ein Flughafen auf der Karte setzt das Ziel.</p>
    ${studySuggest(base)}
    <div class="fltbar row">${kmFilter('plan')}
      <select id="flt-sort" data-flt="plan" aria-label="Ziele ordnen">${[['', 'Ziele nach Region'], ['km', 'nach Entfernung ↑'], ['kmd', 'nach Entfernung ↓'], ['pax', 'nach Größe']].map(([k, l]) => `<option value="${k}" ${(FP.sort || '') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label class="chk"><input type="checkbox" id="flt-range" data-flt="plan" ${FP.range ? 'checked' : ''}> nur in Reichweite der ${esc(tl(p.type))}</label>
      ${FP.km || FP.sort || FP.range ? '<button class="btn small ghost" data-act="fltclear" data-k="plan">Filter zurücksetzen</button>' : ''}</div>
    <div class="grid2">
      ${pl.bases.length > 1 ? `<label class="f"><span>Basis</span><select id="pl-base">${pl.bases.map((b) => `<option value="${b}" ${b === base ? 'selected' : ''}>${b} · ${apName(b)}</option>`).join('')}</select></label>` : ''}
      <label class="f"><span>Ziel <span class="small muted">· ${D.n === D.all ? `${n0(D.all)} Ziele` : `${n0(D.n)} von ${n0(D.all)} Zielen`}</span></span><select id="pl-dest">${D.html}</select></label>
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
      <label class="f"><span>Frequenz</span><select id="pl-freq">${freqOpts(p.wk || 7, p.freq)}</select></label>
      <label class="f"><span>Produkt</span><select id="pl-svc">${Object.keys(P.SERVICE).map((s) => `<option value="${s}" ${s === p.service ? 'selected' : ''}>${svcLabel(s)}</option>`).join('')}</select></label>
      <label class="f"><span>Puffer</span><select id="pl-buf">${Object.keys(P.BUFFER_POLICY).map((b) => `<option value="${b}" ${b === p.buffer ? 'selected' : ''}>${bufLabel(b)} (${pct(P.BUFFER_POLICY[b].otp)} pünktlich)</option>`).join('')}</select></label>
    </div>
    <div class="grid2">
      <label class="f"><span>Tarif ${base} → ${p.dest} (€ netto)</span><input type="number" id="pl-fo" min="10" max="900" step="5" value="${p.fo}"></label>
      <label class="f"><span>Tarif ${p.dest} → ${base} (€ netto)</span><input type="number" id="pl-fi" min="10" max="900" step="5" value="${p.fi}"></label>
    </div>
    <div class="f"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Rolle der Strecke</span><div class="seg wrap" id="pl-role">${Object.entries(ROLE_TXT).map(([k, r]) => `<button type="button" data-act="plrole" data-v="${k}" aria-pressed="${(p.role || 'mixed') === k}" title="${esc(r.tip)}">${r.label}</button>`).join('')}</div><span class="small muted">${esc(ROLE_TXT[p.role || 'mixed'].tip)}</span></div>
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
  p.type = v('#pl-type') || p.type;
  { const fv = v('#pl-freq'); if (fv) { const x = parseFreq(fv); p.freq = x.freq; p.wk = x.wk; } } p.service = v('#pl-svc') || p.service; p.buffer = v('#pl-buf') || p.buffer;
  p.term = v('#pl-term') || p.term;
  { const acq = document.querySelector('input[name="pl-acq"]:checked'); if (acq) p.acq = acq.value; const hb = $('#pl-hire'); if (hb) p.hire = hb.checked; }
  p.fo = Math.max(10, Number(v('#pl-fo')) || p.fo); p.fi = Math.max(10, Number(v('#pl-fi')) || p.fi);
  return false;
}
function plannerSpec(p, fo = p.fo, fi = p.fi) {
  const wk = p.wk && p.wk < 7 ? p.wk : undefined;
  return { airline: W.playerId, base: p.base, dest: p.dest, type_id: p.type, freq: wk ? 1 : p.freq, wk, fare_out: fo, fare_in: fi, service: p.service, buffer: p.buffer, role: p.role || 'mixed' };
}
/** Frequenz: unter täglich als „x pro Woche“, sonst „x täglich“. */
const ROLE_TXT = {
  mixed: { label: 'Gemischt', tip: 'Nimmt Umsteiger und Ortsgäste – der Normalfall. Für lohnende Umsteiger hält sie bis zur Hälfte der Plätze frei.' },
  feeder: { label: 'Zubringer', tip: 'Bringt Reisende zu Ihrem Drehkreuz: hält bis zu 80 % der Plätze für Umsteiger frei, die ihren Anschluss bekommen und mehr einbringen als die verdrängten Ortsgäste. Ortsgäste finden die Strecke etwas weniger attraktiv.' },
  local: { label: 'Endziel', tip: 'Punkt-zu-Punkt für Ortsgäste: keine Umsteiger über diese Strecke, dafür etwas attraktiver für Direktreisende.' },
};
function freqOpts(wk, freq) {
  const out = [];
  for (let k = 1; k <= 6; k++) out.push(`<option value="w${k}" ${wk === k ? 'selected' : ''}>${k}x pro Woche</option>`);
  for (let f = 1; f <= 8; f++) out.push(`<option value="${f}" ${(wk || 7) >= 7 && f === freq ? 'selected' : ''}>${f}x täglich</option>`);
  return out.join('');
}
function parseFreq(v) { v = String(v); if (v[0] === 'w') return { wk: Math.max(1, Math.min(6, Number(v.slice(1)) || 3)), freq: 1 }; return { wk: 7, freq: Math.max(1, Math.min(8, Number(v) || 1)) }; }
const freqTxt = (r) => (r.wk && r.wk < 7 ? `${r.wk}x pro Woche` : `${r.freq}x täglich`);
function withPlannerStation(p, fn) {
  const pl = W.player, had = pl.stations[p.dest];
  if (!had) pl.stations[p.dest] = { handling: 'contract', terminal: p.term };
  try { return fn(); } finally { if (!had) delete pl.stations[p.dest]; }
}
function plannerForecast(p, opts = {}, fo, fi) {
  const pl = W.player, isNew = !stationsOf(pl).includes(p.dest);
  const rent = isNew ? P.TERMINALS[p.term].rent * SM.apx(p.dest).cost * cpi() / 30.4 : 0;
  return withPlannerStation(p, () => W.forecastFor(pl, plannerSpec(p, fo, fi), { tr: true, ...opts, extraDaily: rent }));   // mit Umsteigern über das Drehkreuz (0.21.41)
}
function updateForecast() {
  const p = ui.planner, box = $('#forecast'); if (!p || !box) return;
  const pl = W.player, base = p.base;
  if (!SM.aptOk(base, p.dest, p.type)) { box.innerHTML = `<div class="callout crit">${esc(SM.aptWhy(base, p.dest, p.type))}</div>`; return; }
  if (!SM.rangeOk(base, p.dest, p.type)) { box.innerHTML = `<div class="callout crit">Die ${tl(p.type)} schafft ${n0(SM.gcDistanceKm(base, p.dest))} km nicht. Anderen Typ wählen.</div>`; return; }
  const m = SM.monthOf(W.day);
  const r = plannerForecast(p, { nDraws: 4 });
  const kn = r.know || { lv: 0, sigma: P.MARKET_INFO.sigma[0], src: 'none' }, band = Math.exp(1.3 * kn.sigma) - 1;
  const lo = plannerForecast(p, { nDraws: 2, demandScale: Math.exp(-1.3 * kn.sigma) });
  const hi = plannerForecast(p, { nDraws: 2, demandScale: Math.exp(1.3 * kn.sigma) });
  const est = kn.lv >= 5 ? '' : '≈ ';
  const cur = plannerForecast(p, { nDraws: 2, month: m });
  const rotH = withPlannerStation(p, () => SM.rotationHours(base, p.dest, p.type, p.service, p.buffer, pl.turnExtra(base), pl.turnExtra(p.dest)));
  const free = fleetFree(p.type, base);
  const fit = (() => { let need = p.freq; for (const f of free.map((x) => x.free).sort((a, b) => b - a)) { need -= Math.floor((f + 1e-9) / rotH); if (need <= 0) return true; } return need <= 0; })();
  const kp = W.knownPot(pl, base, p.dest), potSum = kp.sum / 2;
  const rail = SM.railShare(base, p.dest);
  const segTot = r.dirs.out.seg.leisure + r.dirs.out.seg.business + r.dirs.out.seg.vfr || 1;
  const t = P.AIRCRAFT_TYPES[p.type];
  const study = pl.studies[SM.pairKey(base, p.dest)];
  const slotsB = slotsMine(base), slotsD = slotsMine(p.dest), slotOk = W.slotsOkFor(pl, base, p.dest, p.freq);
  const wnd = SM.winOf(p.type), kLong = SM.kOf(p.type, rotH);
  const freeWhole = free.filter((x) => x.free >= wnd - 1e-9).length;
  const acNeed = kLong ? (freeWhole >= kLong * p.freq ? null : `Langstrecke: Ein Umlauf dauert ${n1(rotH)} h – länger als das Betriebsfenster von ${wnd} h. Für ${p.freq}x täglich braucht es ${kLong * p.freq} freie ${tl(p.type)} in ${base}, frei sind ${freeWhole}. ${freeWhole ? `Mit ${freeWhole} fliegt die Strecke nur an ${pct(Math.min(1, freeWhole / kLong / p.freq))} der Tage.` : ''}`)
    : fit ? null : `Für ${p.freq}x täglich fehlt Flugzeugzeit an ${base}: ein Umlauf braucht ${n1(rotH)} h, frei sind ${free.length ? free.map((x) => n1(x.free) + ' h').join(', ') : 'keine passenden Flugzeuge'}.`;
  box.innerHTML = `<div class="stack">
    ${geoNotes(pl, base, p.dest)}
    <div class="fc">
      <div><span>Passagiere pro Tag</span><b>${est}${n0(r.pax)}</b><em>beide Richtungen, Auslastung ${pct(r.lf)}${r.trPax >= 1 ? `, davon ca. ${n0(r.trPax)} Umsteiger` : ''}${est ? ` · Spanne ${n0(lo.pax)}–${n0(hi.pax)}` : ''}</em></div>
      <div><span>Umsatz pro Tag</span><b>${est}${eur(r.revenue)}</b><em>Ø Tarif ${eur(r.avgFare)}</em></div>
      <div><span>DB1 pro Tag</span><b class="${sgn(r.db1List)}">${est}${eur(r.db1List, { plus: true })}</b><em>nach direkten Flugkosten</em></div>
      <div><span>DB2 pro Tag · Streckenbeitrag</span><b class="${sgn(r.db2List)}">${est}${eur(r.db2List, { plus: true })}</b><em>wie später in der Streckenliste · Spanne ${eur(lo.db2List, { plus: true })} bis ${eur(hi.db2List, { plus: true })}</em></div>
    </div>
    ${fcTransferHtml(r, p)}
    ${fcDetailHtml(r, p)}
    ${knowHtml(kn)}
    ${seasonHtml(base, p.dest)}
    <p class="small ink2">Nach <b>allen</b> Kosten – also auch Crew-Gehältern, Leasing, Versicherung, Technik, Slots und Terminal – bleiben <b class="${sgn(r.db2)}">${eur(r.db2, { plus: true })}</b> pro Tag. So viel landet im Ergebnis.</p>
    ${(() => { const lic = pl.stations[p.dest] ? 0 : SM.stationFee(W, p.dest); return lic ? `<p class="small ink2">Neuer Flughafen für Sie: Die Station in ${p.dest} kostet beim Eröffnen einmalig <b>${eur(lic)}</b>${SM.incentiveAt(p.dest) > 0.05 || SM.incentiveAt(base) > 0.05 ? '' : ''}.</p>` : ''; })()}
    ${(() => { const ib = Math.max(SM.incentiveAt(base), SM.incentiveAt(p.dest)); return ib > 0.05 ? `<p class="small pos">Anlaufrabatt: ${[base, p.dest].filter((x) => SM.incentiveAt(x) > 0.05).map((x) => `${x} erlässt ${pct(SM.incentiveAt(x))} der Entgelte`).join(', ')} – im ersten Jahr der Strecke, in der Prognose schon eingerechnet.</p>` : ''; })()}
    ${fcExplain(r, { band, cur, m, study, potSum, rail, kn })}
    <p class="small ink2">Jahresmittel bei ausgereifter Strecke, Marke ${n0(pl.brand * 100)}. Im ${MONTHS_L[m]}: Streckenbeitrag <b class="${sgn(cur.db2List)}">${eur(cur.db2List, { plus: true })}</b> pro Tag bei ${pct(cur.lf)} Auslastung. ${study && study.done ? `<b>Streckenstudie liegt vor</b> (${esc(study.by)}): Der Nachfragetrend ist eingerechnet.` : ''}</p>
    ${SM.haulOf(p.type) === 'long' || kLong ? `<p class="small ${kLong > 1 ? 'warnc' : 'pos'}">${kLong > 1 ? `Umlauf ${n1(rotH)} h (hin, Bodenzeit, zurück, Bodenzeit) – mehr als ${SM.P.LONG_WINDOW_H} h. Ein Flugzeug ist ${kLong} Tage unterwegs; für einen täglichen Flug braucht es ${kLong} Flugzeuge, mit einem fliegt die Strecke an jedem ${kLong}. Tag.` : kLong === 1 ? `Ein Flugzeug reicht für den täglichen Flug: Umlauf ${n1(rotH)} h – länger als der normale ${wnd}-Stunden-Tag, deshalb fliegt das Flugzeug nur diesen einen Umlauf (mit Nachtflug, bis ${SM.P.LONG_WINDOW_H} h).` : `Ein Flugzeug reicht für den täglichen Flug: Umlauf ${n1(rotH)} h, passt in das ${wnd}-Stunden-Fenster der Langstrecke (über Nacht).`}</p>` : ''}
    ${kitHtml(p, { acNeed, kLong, freeWhole, free, rotH, wnd, t })}
    ${!slotOk ? `<div class="callout crit stack"><span>Keine Slots: ${[base, p.dest].filter((x) => slotsMine(x) < p.freq).map((x) => `${x} hat für Sie nur ${slotTxt(x)} freie`).join(', ')}. Neue Slots werden nur zu festen Terminen vergeben: <b>${slotDateTxt()}</b> (1. April und 1. Oktober). Dazwischen werden nur Slots frei, wenn andere Strecken aufgeben.</span>
      <span class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small primary" data-act="plansave">Als Plan speichern + Warteliste</button><span class="small">Sobald die Slots da sind, eröffnet SKYMARKET die Strecke automatisch (abschaltbar unter Strecken → Pläne). Wartende bekommen frei werdende Slots reihum.</span></span></div>`
      : (() => { const sc = W.slotCost(pl, base, p.dest, p.freq), lic = pl.stations[p.dest] ? 0 : SM.stationFee(W, p.dest), tot = sc.cost + lic, pb = r.db2 > 0 ? tot / (r.db2 * 30.4) : null;
        return sc.cost > 0 ? `<p class="small ink2">Slots: ${sc.parts.map((x) => `${x.n} in ${x.apt}`).join(', ')} kosten beim Eröffnen einmalig <b>${eur(sc.cost)}</b> (danach gehören sie Ihnen als Vermögenswert; schließen Sie die Strecke, bleiben sie in Ihrer Reserve).${tot > 0 ? ` Zusammen mit ${lic ? 'Station' : 'allem'} ${eur(tot)} – ${pb === null ? 'bei dieser Schätzung verdient die Strecke das nicht zurück' : pb < 1 ? 'nach dieser Schätzung in unter einem Monat verdient' : `nach dieser Schätzung in rund ${n0(pb)} Monaten verdient`}.` : ''}</p>` : ''; })()}
    <table class="t"><tbody>
      <tr><td title="Wer bei den heutigen Preisen tatsächlich fliegt – mit Ihnen, mit der Konkurrenz oder mit Umsteigen über fremde Drehkreuze. Der Rest des Potenzials bleibt zu Hause oder fährt anders.">Reisende ${base}→${p.dest} (Markt heute)</td><td class="r">${(() => { const mk = r.dirs.out.market || {}; const fly = Math.max(0, (mk.potential || potSum) - (mk.outside || 0)); return `${n0(fly)} pro Tag <span class="muted small">· ${n0(fly * 365 / 1000)} Tsd. im Jahr · Potenzial ${n0(potSum)}</span>`; })()}</td></tr>
      <tr><td>Mix Ihrer Passagiere</td><td class="r">Urlaub ${pct(r.dirs.out.seg.leisure / segTot)} · Geschäft ${pct(r.dirs.out.seg.business / segTot)} · Besuch ${pct(r.dirs.out.seg.vfr / segTot)}</td></tr>
      ${rail > 0.02 ? `<tr><td>Bahn nimmt weg</td><td class="r">${pct(rail)} des Potenzials</td></tr>` : ''}
      <tr><td>Umsteiger über fremde Drehkreuze</td><td class="r">${r.dirs.out.indirect > 0.5 ? n0(r.dirs.out.indirect) + ' pro Tag' : 'keine'}</td></tr>
      <tr><td>Konkurrenz</td><td class="r">${(() => { const co = W.competitorOffers(W.playerId, base, p.dest); return co.length ? co.map((c) => `${esc(W.airlines[c.airline].name)} ${c.freq < 1 ? n0(c.freq * 7) + 'x/Woche' : c.freq + 'x'} ${eur(c.fare)}`).join(', ') : 'keine'; })()}</td></tr>
      ${r.dirs.out.incSeats > 0 ? `<tr><td title="Airlines außerhalb des Spiels, die diesen Markt heute schon bedienen (Bestandsverkehr). Sie nehmen einen Teil der Reisenden – vor allem auf großen Strecken.">Etablierte Airlines</td><td class="r">rund ${n0(r.dirs.out.incSeats)} Sitze pro Tag und Richtung</td></tr>` : ''}
      ${isFinite(slotsB) || isFinite(slotsD) ? `<tr><td>Freie Slots</td><td class="r">${[base, p.dest].filter((x) => isFinite(W.slotsFree(x))).map((x) => `${x} ${slotTxt(x)}`).join(' · ')}</td></tr>` : ''}
      <tr><td>Kosten je angebotenem Sitz-km</td><td class="r">${NF2.format(r.caskCt)} ct (Erlös ${NF2.format(r.raskCt)} ct)</td></tr>
    </tbody></table>
    ${slotOk ? planCostHtml(p) : ''}
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="openroute-new" ${slotOk ? '' : 'disabled'}>${kitLabel(p)}</button><button class="btn" data-act="plansave" title="Ohne Kosten merken – unter Strecken → Pläne umsetzen, sobald es passt">Als Plan speichern</button></div>
  </div>`;
}
const rivalsPicker = (prefix, cur) => `<div class="stack"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Konkurrenz</span><div class="seg wrap" id="${prefix}Rivals">
  ${Object.entries(SM.RIVALS).map(([k, r]) => `<button type="button" data-rivals="${k}" aria-pressed="${k === cur}">${r.label}</button>`).join('')}</div>
  <p class="small muted">${Object.values(SM.RIVALS).map((r) => `<b>${r.label}:</b> ${r.desc}.`).join(' ')} Lässt sich im Spiel unter Markt → Wettbewerb ändern.</p></div>`;
/** 0.21.42: Prognose im Detail – je Richtung, je Flug und pro Tag: Passagiere, Tarife, Erlöse, Verbrauch, jede Kostenart, Beiträge. */
function fcDetailHtml(r, p) {
  const O = r.dirs.out, I = r.dirs.in, D = [O, I], km = SM.gcDistanceKm(p.base, p.dest), t = P.AIRCRAFT_TYPES[p.type];
  const f = (x) => Math.max(1e-9, x.freq), fl = O.freq + I.freq;
  const n = (v) => n0(v), e = (v) => eur(v), sum = (g) => g(O) + g(I);
  const row = (label, g, fmt = e, opt = {}) => { const a = g(O), b = g(I), tot = opt.noSum ? null : a + b, pf = opt.perFlight === false ? null : (opt.avg ? (a + b) / 2 : (a + b) / fl);
    return `<tr${opt.cls ? ` class="${opt.cls}"` : ''}><td>${label}</td><td class="r">${fmt(a)}</td><td class="r">${fmt(b)}</td><td class="r">${pf === null ? '' : fmt(pf)}</td><td class="r">${tot === null ? '' : fmt(tot)}</td></tr>`; };
  const head = (label) => `<tr class="fcd-h"><td colspan="5">${label}</td></tr>`;
  const cost = (k) => (x) => (x.costs && x.costs[k]) || 0;
  const direct = (x) => Object.values(x.costs || {}).reduce((a, b) => a + b, 0), rev = (x) => x.fareRev + x.ancRev;
  const acDay = r.aircraftTimeCost || 0, crewSal = (r.db1 - r.db1List) || 0;
  const paxVar = sum(cost('pax_fees')) + sum(cost('pax_service')) + sum(cost('distribution')) + sum(cost('disruption_expected'));
  const fixed = sum(direct) - paxVar + acDay, revPax = r.pax ? r.revenue / r.pax : 0, varPax = r.pax ? paxVar / r.pax : 0;
  const bePax = revPax > varPax ? fixed / (revPax - varPax) : Infinity, beLf = r.seats ? bePax / r.seats : Infinity;
  const fuelPax = r.pax ? sum((x) => x.fuelKg) / r.pax : 0, lPer100 = r.pax && km ? fuelPax / 0.8 / km * 100 : 0;
  const body = `<div class="tw"><table class="t fcd"><thead><tr><th></th><th class="r">${p.base}→${p.dest}</th><th class="r">${p.dest}→${p.base}</th><th class="r">je Flug</th><th class="r">pro Tag</th></tr></thead><tbody>
    ${head('Betrieb')}
    ${row('Flüge', (x) => x.freq, (v) => NF1.format(v).replace(/,0$/, ''), { perFlight: false })}
    ${row('Blockzeit je Flug (h)', (x) => x.bh, (v) => NF1.format(v), { noSum: true, avg: true })}
    ${row('Sitze', (x) => x.seats, n)}
    ${head('Passagiere')}
    ${row('Passagiere', (x) => x.pax, n)}
    ${row('· aus diesem Markt', (x) => x.local, n)}
    ${r.trPax >= 0.5 ? row('· Umsteiger', (x) => x.tr, n) : ''}
    ${row('· davon Urlaub', (x) => x.seg.leisure, n)}
    ${row('· davon Geschäft', (x) => x.seg.business, n)}
    ${row('· davon Besuch', (x) => x.seg.vfr, n)}
    ${(O.prem || I.prem) ? row('· in Business/First', (x) => x.prem, n) : ''}
    ${row('Auslastung', (x) => x.lf, pct, { noSum: true, perFlight: false })}
    ${head('Preise und Erlöse')}
    ${row('Tarif netto', (x) => x.fare, e, { noSum: true, perFlight: false })}
    ${row('Ø Erlös je Passagier', (x) => (x.pax ? x.fareRev / x.pax : 0), e, { noSum: true, perFlight: false })}
    ${row('Tickets Ortsgäste', (x) => x.locRev - (x.premRev || 0) * (t.yieldF || 1), e)}
    ${(O.premRev || I.premRev) ? row('Premiumaufschlag', (x) => (x.premRev || 0) * (t.yieldF || 1), e) : ''}
    ${r.trPax >= 0.5 ? row('Umsteiger (Anteil)', (x) => x.trRev, e) : ''}
    ${row('Zusatzleistungen', (x) => x.ancRev, e)}
    ${row('<b>Erlös</b>', rev, e, { cls: 'fcd-s' })}
    ${head('Direkte Kosten')}
    ${row(`Kerosin (${n0(sum((x) => x.fuelKg) / fl)} kg je Flug)`, cost('fuel'), e)}
    ${row('Crew (Gehälter und Spesen)', cost('crew'), e)}
    ${row('Wartung', cost('maintenance'), e)}
    ${row('Streckengebühren', cost('navigation'), e)}
    ${row('Landeentgelte', cost('landing'), e)}
    ${row('Abfertigung', cost('handling'), e)}
    ${row('Passagierentgelte', cost('pax_fees'), e)}
    ${row('Bordservice', cost('pax_service'), e)}
    ${row('Vertrieb', cost('distribution'), e)}
    ${row('Ausfälle und Verspätungen (erwartet)', cost('disruption_expected'), e)}
    ${row('<b>Direkte Kosten</b>', direct, e, { cls: 'fcd-s' })}
    ${row('<b>DB1</b>', (x) => rev(x) - direct(x), (v) => `<span class="${sgn(v)}">${eur(v, { plus: true })}</span>`, { cls: 'fcd-s' })}
    </tbody></table></div>
    <div class="fcd-sum small">
      <div><span>DB1 nach allen Flugkosten</span><b class="${sgn(r.db1)}">${eur(r.db1, { plus: true })}</b></div>
      ${crewSal ? `<div><span>+ Crew-Gehälter (zählen in der Streckenliste nicht zum DB1) = DB1 wie in der Liste</span><b class="${sgn(r.db1List)}">${eur(r.db1List, { plus: true })}</b></div>` : ''}
      <div><span>− Flugzeugzeit zur Standardrate (${pct(r.aircraftShare || 0)} eines Flugzeugs)</span><b>${eur(-(r.acGeneric || 0))}</b></div>
      <div><span>= DB2, Streckenbeitrag wie in der Liste</span><b class="${sgn(r.db2List)}">${eur(r.db2List, { plus: true })}</b></div>
      <div><span>Nach allen Kosten (Ihr Leasing bzw. Abschreibung, Versicherung, Technik${r.slotFee ? ', Slots' : ''}${r.stationDaily ? ', Terminal' : ''})</span><b class="${sgn(r.db2)}">${eur(r.db2, { plus: true })}</b></div>
      <div><span>Erlös je Sitzkilometer · Kosten je Sitzkilometer</span><b>${NF1.format(r.raskCt)} ct · ${NF1.format(r.caskCt)} ct</b></div>
      <div><span>Verbrauch je Passagier</span><b>${n0(fuelPax)} kg · ${NF1.format(lPer100)} l je 100 km</b></div>
      <div><span>Gewinnschwelle (nach allen Kosten)</span><b>${isFinite(beLf) && beLf < 5 ? `${n0(bePax)} Passagiere am Tag · ${pct(beLf)} Auslastung` : 'nicht erreichbar'}</b></div>
    </div>
    <p class="small muted">Jahresmittel bei ausgereifter Strecke. „je Flug“ = Tageswert geteilt durch alle Flüge beider Richtungen. Die Gewinnschwelle rechnet mit Kosten je Flug als fest und Entgelten, Service und Vertrieb je Passagier.</p>`;
  const o = foldPref('sl-fcdet', false);
  return `<details class="card pad fold fcdet" data-keep="sl-fcdet" ${o ? 'open' : ''}><summary><b>Prognose im Detail</b> <span class="small muted">Passagiere, Tarife, Verbrauch, alle Kosten je Richtung und Flug</span><span class="fold-hint">${o ? 'ausblenden' : 'einblenden'}</span></summary><div class="stack">${body}</div></details>`;
}
/** Prognose: Umsteiger über das Drehkreuz (0.21.41) – wie viele mitfliegen, was sie bringen, was die übrigen Strecken davon haben. */
function fcTransferHtml(r, p) {
  const pl = W.player, role = p.role || 'mixed';
  if (role === 'local') return `<p class="small ink2">Endziel: Diese Strecke nimmt keine Umsteiger über ${p.base} mit.</p>`;
  const T = r.transfer; if (!T) return '';
  if (T.want < 1) return `<p class="small ink2">Umsteiger über ${p.base}: kaum – von Ihren heutigen Zielen ab ${p.base} führt keine sinnvolle Reise über diese Strecke.</p>`;
  const name = (id) => { const x = pl.routes.find((q) => q.id === id); return x ? `${x.base}–${x.dest}` : ''; };
  const top = [], seen = new Set(); for (const f of T.flows) { const k = [f.from, f.to].sort().join(' ⇄ '); if (seen.has(k)) continue; seen.add(k); top.push(k); if (top.length >= 5) break; }
  const full = [...new Set(T.flows.filter((f) => f.short).map((f) => name(f.via)).filter(Boolean))].slice(0, 4);
  const resv = Math.max(r.dirs.out.resv || 0, r.dirs.in.resv || 0), perFl = resv / Math.max(1, p.wk && p.wk < 7 ? p.wk / 7 : p.freq);
  return `<div class="callout info stack"><span><b>Umsteiger über ${p.base}:</b> ca. ${n0(r.trPax)} pro Tag fliegen auf dieser Strecke mit${r.trRev > 0 ? `, Erlösanteil ca. ${eur(r.trRev)} pro Tag (nach den Einzeltarifen der Teilstrecken)` : ''}. In Passagieren, Umsatz und DB oben schon enthalten.${perFl >= 1 ? ` Als ${ROLE_TXT[role].label} hält die Strecke für sie bis zu ${n0(perFl)} Plätze je Flug frei – für Ortsgäste bleiben entsprechend weniger.` : ''}</span>
    ${T.other.pax >= 1 ? `<span>Ihre übrigen Strecken ab ${p.base}: grob ${eur(T.other.net, { plus: true })} pro Tag durch ca. ${n0(T.other.pax)} zusätzliche Umsteiger (abzüglich verdrängter). Nur ein Richtwert – ob dort Platz ist, hängt von Saison und Preisen ab.</span>` : ''}
    <span class="small">Wichtigste Reisen: ${top.join(' · ')}${full.length ? ` · Anschluss oft voll: ${full.join(', ')}` : ''}</span></div>`;
}
/** Wie gut kennt die Airline diesen Markt? */
const KNOW_SRC = { none: 'nur aus allgemeinen Marktdaten', station: 'beide Flughäfen kennen Sie aus dem eigenen Betrieb', study: 'aus einer Marktstudie', analyst: 'von Ihrer Marktanalyse bewertet', pair: 'aus einer Streckenstudie' };
function knowHtml(kn) {
  if (!kn) return '';
  if (kn.lv >= 5) return '<p class="small ink2">Marktwissen: <b>Ist-Daten Ihrer eigenen Strecke</b> – die Prognose ist verlässlich.</p>';
  const MI = P.MARKET_INFO, span = Math.round((Math.exp(1.3 * kn.sigma) - 1) * 100), lv = Math.min(4, kn.lv);
  const bars = MI.labels.map((_, i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('');
  return `<div class="callout ${lv <= 1 ? 'warn' : lv === 2 ? 'info' : 'good'} know"><span class="kbar" aria-hidden="true">${bars}</span><b>Marktwissen: ${MI.labels[lv]}</b> – ${KNOW_SRC[kn.src] || ''}. Die echte Nachfrage kann etwa ±${span} % von dieser Schätzung abweichen${lv <= 1 ? ', im Einzelfall auch mehr' : ''}.${lv < 4 ? ` Genauer mit einer <a href="#" data-act="tab" data-tab="studies">Marktstudie</a>${W.player.skill('analyst') ? '' : ' oder einer Fachkraft für Marktanalyse'}.` : ''}</div>`;
}
/** Herleitung der Prognose: woher die Passagiere kommen und welche Kosten abgehen. */
function fcExplain(r, x) {
  const cb = r.costBreakdown || {}, crewPd = Math.max(0, (cb.crew || 0) - (r.crewSalary || 0));
  const fees = (cb.navigation || 0) + (cb.landing || 0) + (cb.pax_fees || 0);
  const svc = (cb.pax_service || 0) + (cb.distribution || 0) + crewPd;
  const acExtra = (r.acFull || 0) - (r.acGeneric || 0);
  const row = (l, v, cls = '', note = '') => `<tr class="${cls}"><td>${l}${note ? `<div class="small muted">${note}</div>` : ''}</td><td class="r ${cls === 'sum' ? sgn(v) : ''}" style="white-space:nowrap">${cls === 'sum' ? eur(v, { plus: true }) : l.startsWith('−') ? eur(Math.abs(v)) : eur(v)}</td></tr>`;
  return `<details class="fcx"><summary>So rechnet die Prognose</summary>
    <ol class="fcx-steps">
      <li><b>Markt:</b> Zwischen beiden Städten wollen ${x.kn && x.kn.lv >= 5 ? 'etwa' : 'nach Ihrer Schätzung etwa'} <b>${n0(x.potSum)}</b> Menschen pro Tag und Richtung reisen (Urlaub, Geschäft, Besuch)${x.rail > 0.02 ? `, ${pct(x.rail)} davon nimmt die Bahn` : ''}.</li>
      <li><b>Ihr Anteil:</b> Reisende wählen nach Preis, Abflügen pro Tag, Pünktlichkeit, Produkt und Marke – gegen Konkurrenz, Umsteigeverbindungen und den Verzicht aufs Fliegen. Ergebnis: <b>${n0(r.localPax ?? r.pax)}</b> Passagiere aus diesem Markt${r.trPax >= 1 ? ` und <b>${n0(r.trPax)}</b> Umsteiger über ${r.dirs.out.o} (für sie bleiben je nach Rolle Plätze frei)` : ''}, ${pct(r.lf)} Auslastung. Mehr als Sitze da sind, fliegen nicht mit.</li>
      <li><b>Saison:</b> Gezeigt ist das Jahresmittel. Im ${MONTHS_L[x.m]} ${x.cur.pax >= r.pax ? 'liegt die Nachfrage darüber' : 'liegt sie darunter'} (${n0(x.cur.pax)} Passagiere).</li>
      <li><b>Anlauf:</b> Eine neue Strecke muss erst bekannt werden – in den ersten Wochen kommen nur etwa 35–60 % der Passagiere, nach rund 90 Tagen ist sie ausgereift. Die Prognose zeigt den ausgereiften Zustand.</li>
      <li><b>Unsicherheit:</b> Marktwissen „${P.MARKET_INFO.labels[Math.min(4, x.kn ? x.kn.lv : 0)]}“ – die echte Nachfrage kann um etwa ±${n0(x.band * 100)} % abweichen. Der Fehler ist fest: Neu rechnen hilft nicht, nur besseres Wissen (Marktstudie, Fachkraft Marktanalyse, eigene Flüge). Nicht enthalten: wie die Konkurrenz reagiert – läuft die Strecke gut, kann eine KI-Airline mit Kampfpreisen nachziehen.</li>
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
  const stock = W.lessorStock && W.lessorStock[p.type] !== undefined ? W.lessorStock[p.type] : SM.capOf(W, p.type);
  const auctionOnly = t.launch && W.day < t.launch + 365;
  const leaseOk = n > 0 && !auctionOnly && stock >= n;
  const used = n === 1 ? W.acMarket.filter((o) => o.type === p.type).sort((a, b) => a.delivery - b.delivery).slice(0, 2) : [];
  const opts = [];
  const rk = SM.riskTerms(pl, p.type), roomL = SM.leaseRoom(pl, W.day).left;
  const buyOk = n > 0 && !auctionOnly && t.stock !== 0;
  const buyOpt = ['buy', `${n > 1 ? n + ' × ' : ''}${tl(p.type)} kaufen`, `${rk.reject ? `Leasing abgelehnt (${esc(rk.reject)} ${leaseWhenTxt(pl, p.type).replace(/<\/?b>/g, '')}) · ` : roomL < n ? `Die Leasinggeber machen gerade nur noch ${roomL} neue Verträge mit (wieder frei ab ${dateShort(SM.leaseOutlook(pl, p.type, W.day).roomDay)}) · ` : ''}sofort ${eur(acquireCost(p.type, 'buy') * n)}${rk.down < 1 ? ` Eigenanteil (${pct(rk.down)}), Rest als Bankkredit – baut Eigenkapital auf` : ' – ohne Bankkredit'}`];
  if (buyOk && (rk.reject || roomL < n)) opts.push(buyOpt);
  if (leaseOk && !rk.reject && roomL >= n) opts.push(['lease', `${n > 1 ? n + ' × ' : ''}${tl(p.type)} leasen${rk.cond ? ' – unter Auflagen' : ''}`, `${eur(t.lease_month * rk.lease * cpi())}/Monat${rk.lease > 1.001 ? ` (inkl. ${pct(rk.lease - 1)} Aufschlag der Leasinggeber, Ansehen ${rk.st}${rk.cond ? `, verlangt ${rk.req}` : ''})` : ''}, Kaution ${eur(acquireCost(p.type, 'lease') * n)}, Lieferung in ${SM.leaseDelivery(W, p.type, 'lease')} Tagen`]);
  if (buyOk && !rk.reject && roomL >= n) opts.push(buyOpt);
  for (const o of used.filter((o) => o.kind !== 'lease' || !rk.reject)) opts.push(['used:' + o.id, `Gebraucht${o.from ? ' (Insolvenzmasse ' + o.from + ')' : ''}: ${o.age} Jahre, ${o.kind === 'lease' ? eur(o.lease_month * pl.oldAcFactor(o.age)) + '/Monat' : 'Kauf ' + eur(o.price * pl.oldAcFactor(o.age))}`, `sofort ${eur(acquireCost(o.type, o.kind === 'lease' ? 'lease' : 'buy', o))}, Lieferung in ${o.delivery} Tagen${pl.oldAcExpert() ? ' · Zustand ' + condWord(o.cond || 1) : ''}`]);
  opts.push(['none', 'Ohne Flugzeug anlegen', 'Die Strecke startet, sobald ein passendes Flugzeug frei ist']);
  if (!opts.some((o) => o[0] === p.acq)) p.acq = n ? opts[0][0] : 'none';
  if (!n) p.acq = 'none';
  // Personal: Crew wird je Flugzeug gebraucht, nicht je Strecke
  const S = P.STAFF, leg = SM.blockHours(base, p.dest, p.type), seats = SM.pilotsFor(leg), bhRoute = leg * 2 * p.freq;
  const cur = pl.staffNeedPlanned(), perAc = cur.perAc || {};
  // Mehrbedarf in Köpfen (Bruchteile, flottenweit gemeinsam eingeplant): Cockpitplätze × Blockstunden ÷ 3, mindestens eine Besetzung
  const cf = (bh) => SM.crewFor(seats, t.cabin, bh), wasOf = (id) => perAc[id] ? cf(perAc[id].bh) : { pil: 0, cab: 0 };
  let addPil = 0, addCab = 0, crewNote = '', bhAc = 0;
  if (n) { const c = cf(bhRoute / Math.max(1, n)); addPil = c.pil * n; addCab = c.cab * n; bhAc = bhRoute / Math.max(1, n); crewNote = `${n > 1 ? `${n} neue Flugzeuge fliegen` : 'Das neue Flugzeug fliegt'} ${n1(bhAc)} Blockstunden am Tag.`; }
  else if (x.kLong) { const k = Math.max(1, x.kLong * p.freq), c = cf(bhRoute / k); addPil = c.pil * k; addCab = c.cab * k; bhAc = bhRoute / k; crewNote = `Langstrecke: ${k} Flugzeuge fliegen im Wechsel je ${n1(bhAc)} Blockstunden am Tag.`; }
  else {
    // wie der Einsatzplan: zuerst Flugzeuge, die schon fliegen und noch Zeit haben
    const cand = x.free.filter((y) => y.free + 1e-9 >= x.rotH).sort((a2, b2) => (perAc[b2.a.id] ? 1 : 0) - (perAc[a2.a.id] ? 1 : 0) || a2.free - b2.free)[0];
    if (cand) {
      const was = perAc[cand.a.id], bhNew = (was ? was.bh : 0) + bhRoute, c0 = wasOf(cand.a.id), c1 = cf(bhNew);
      addPil = c1.pil - c0.pil; addCab = c1.cab - c0.cab; bhAc = bhNew;
      crewNote = `${acName(cand.a.id)} fliegt dann ${n1(bhNew)} Blockstunden am Tag${was ? ` (bisher ${n1(was.bh)})` : ''}.`;
    }
  }
  const crewHow = `Ein Pilot fliegt im Schnitt ${P.STAFF.pilotH} Blockstunden am Tag (Ruhezeiten, freie Tage, Urlaub). Bei ${seats} Piloten im Cockpit braucht ${n1(bhAc || bhRoute)} h am Tag also rund ${n1(Math.max(seats, seats * (bhAc || bhRoute) / P.STAFF.pilotH))} Piloten und ${n1(Math.max(t.cabin, t.cabin * (bhAc || bhRoute) / P.STAFF.cabinH))} Flugbegleiterinnen – geteilt mit dem Rest Ihrer Flotte.`;
  const sp = staffPlan(pl), pilRow = sp.find((y) => y.key === t.group), cabRow = sp.find((y) => y.key === 'cab');
  // Bedarf danach: unaufgerundete Anteile aller Flugzeuge plus Mehrbedarf, erst dann aufrunden
  const fracPil = Object.values(perAc).filter((y) => y.group === t.group).reduce((a2, y) => a2 + y.pil, 0), fracCab = Object.values(perAc).reduce((a2, y) => a2 + y.cab, 0);
  const afterPil = Math.ceil(fracPil + Math.max(0, addPil) - 1e-6), afterCab = Math.ceil(fracCab + Math.max(0, addCab) - 1e-6);
  const misPil = pilRow ? Math.max(0, afterPil - pilRow.have - pilRow.pipe) : Math.ceil(Math.max(0, addPil) - 1e-6), misCab = Math.max(0, afterCab - cabRow.have - cabRow.pipe), misTech = n ? Math.ceil(S.techPerAc * n) : 0;
  const staffShort = misPil + misCab + misTech > 0;
  if (p.hire === undefined) p.hire = false;   // Personal nur auf Wunsch mit einstellen
  ui.plannerKit = { n, staffShort, misPil, misCab, misTech };
  const row = (ok, title, body) => `<div class="kit-row ${ok ? 'ok' : 'todo'}"><span class="kit-ic">${ok ? '✓' : '!'}</span><div><b>${title}</b>${body ? `<div class="small muted">${body}</div>` : ''}</div></div>`;
  return `<div class="kit card pad stack"><div class="spread"><b>Startpaket</b><span class="small muted">alles mit einem Klick</span></div>
    ${n ? row(false, `Flugzeug: ${x.acNeed}`, `<div class="kit-opts">${opts.map(([v, l, d]) => `<label class="chk"><input type="radio" name="pl-acq" id="pl-acq-${v.replace(':', '-')}" value="${v}" ${p.acq === v ? 'checked' : ''}> <span><b>${esc(l)}</b><br><span class="muted">${esc(d)}</span></span></label>`).join('')}</div>${auctionOnly ? '<span class="small muted">Dieses Muster gibt es im ersten Jahr nur per Auktion.</span>' : !leaseOk && stock < n ? '<span class="small muted">Beim Leasinggeber derzeit nicht genug auf Lager.</span>' : ''}`)
      : row(true, x.kLong ? `Flugzeuge: ${x.kLong * p.freq} fliegen die Langstrecke im Wechsel` : `Flugzeug: passt auf ${x.free.length === 1 ? 'Ihr Flugzeug' : 'Ihre Flotte'}`, `${n1(x.rotH * p.freq)} h von ${n0(x.wnd)} h Betriebsfenster – wird automatisch eingeplant`)}
    ${staffShort ? row(false, `Crew: es fehlen ${[misPil ? `${misPil} ${SM.roleLabel('pilot', t.group)}` : '', misCab ? `${misCab} Flugbegleiterinnen` : '', misTech ? `${misTech} Techniker` : ''].filter(Boolean).join(', ')}`,
      `${esc(crewNote)} ${esc(crewHow)}${misPil > Math.ceil(addPil - 1e-6) || misCab > Math.ceil(addCab - 1e-6) ? ` <b>Diese Strecke braucht zusätzlich nur rund ${n1(Math.max(0, addPil))} Piloten und ${n1(Math.max(0, addCab))} Flugbegleiterinnen</b> – der Rest fehlt schon für Ihren bisherigen Flugplan.` : ''}
      <label class="chk"><input type="checkbox" id="pl-hire" ${p.hire ? 'checked' : ''}> <span>Auf Wunsch gleich mit einstellen – ${n ? `<b>Antritt zur Lieferung des Flugzeugs</b> (in rund ${P.LEASE_DELIVERY_DAYS} Tagen), Gehalt erst ab dann` : 'Antritt so früh wie möglich'}. Sonst selbst unter <b>Unternehmen → Personal</b> (dort auch mit Antrittstermin) – bis dahin fliegt teures Agenturpersonal.</span></label>`)
      : row(true, addPil > 0.05 || addCab > 0.05 ? 'Crew: vorhanden' : 'Crew: keine zusätzliche nötig', esc(crewNote ? crewNote + ' Ihre vorhandene Crew reicht dafür.' : 'Die vorhandenen Crews reichen.'))}
    ${row(true, 'Einsatz: automatisch', 'Der Einsatzplan teilt Flugzeuge selbst zu. Unter Flotte → Einsatzplan können Sie später feste Umläufe vorgeben – nötig ist das nicht.')}
  </div>`;
}
function kitLabel(p) {
  const k = ui.plannerKit || {}, parts = [];
  if (k.n && p.acq && p.acq !== 'none') parts.push(p.acq === 'lease' ? (k.n > 1 ? `${k.n} Flugzeuge leasen` : 'Flugzeug leasen') : p.acq === 'buy' ? (k.n > 1 ? `${k.n} Flugzeuge kaufen` : 'Flugzeug kaufen') : 'Gebrauchtes übernehmen');
  if (k.staffShort && p.hire) parts.push('Personal einstellen');
  const c = planCost(p);
  return `${parts.length ? `Strecke eröffnen · ${parts.join(' · ')}` : 'Strecke eröffnen'}${c.total > 0 ? ` · zusammen ${eurB(c.total)}` : ' · ohne Einmalkosten'}`;
}
/** Was das Eröffnen einer geplanten Strecke sofort kostet (Startpaket inklusive), mit Aufschlüsselung und laufenden Kosten. */
const hireLbl = (role, n) => `Einstellen · Anwerbung ${eurB(SM.hireQuote(W, role, n))}`;
function planCost(p) {
  const pl = W.player, k = ui.plannerKit || {}, parts = [], monthly = [];
  const freq = p.wk && p.wk < 7 ? 1 : p.freq;
  const lic = pl.stations[p.dest] ? 0 : SM.stationFee(W, p.dest); if (lic) parts.push([`Station ${p.dest}`, lic]);
  const sc = W.slotCost(pl, p.base, p.dest, freq).cost; if (sc > 0) parts.push(['Slots', sc]);
  if (k.n && p.acq && p.acq !== 'none') {
    const intro = pl.familyKnown(p.type) ? 0 : P.TYPE_INTRO_COST;
    if (p.acq === 'buy') {
      const one = SM.acquireCost(pl, p.type, 'buy', null, W.macro.eurusd, W);
      parts.push([`Eigenanteil Kaufpreis${k.n > 1 ? ` ${k.n} Flugzeuge` : ''}`, (one - intro) * k.n]); if (intro) parts.push(['Einführung neues Muster', intro]);
    } else if (p.acq === 'lease') {
      const one = SM.acquireCost(pl, p.type, 'lease', null, W.macro.eurusd, W), dep = one - intro;
      parts.push([`Kaution${k.n > 1 ? ` ${k.n} Flugzeuge` : ''} (kommt bei Rückgabe zurück)`, dep * k.n]); if (intro) parts.push(['Einführung neues Muster', intro]);
      const rk = SM.riskTerms(pl, p.type); monthly.push(['Leasing', P.AIRCRAFT_TYPES[p.type].lease_month * rk.lease * (1 + SM.acTariff(W, pl, p.type)) * k.n]);
    } else {
      const o = W.acMarket.find((x) => x.id === p.acq.slice(5));
      if (o) { const need = SM.acquireCost(pl, o.type, o.kind === 'lease' ? 'lease' : 'buy', o, W.macro.eurusd, W); parts.push([o.kind === 'lease' ? 'Kaution Gebrauchtflugzeug' : 'Eigenanteil Kaufpreis', need - intro]); if (intro) parts.push(['Einführung neues Muster', intro]); if (o.kind === 'lease') monthly.push(['Leasing', o.lease_month * pl.oldAcFactor(o.age)]); }
    }
  }
  if (k.staffShort && p.hire) {
    const h = SM.hireQuote(W, 'pilot', k.misPil || 0) + SM.hireQuote(W, 'cabin', k.misCab || 0) + SM.hireQuote(W, 'tech', k.misTech || 0);
    if (h > 0) parts.push([`Anwerbung ${(k.misPil || 0) + (k.misCab || 0) + (k.misTech || 0)} Personen`, h]);
  }
  return { total: parts.reduce((a, x) => a + x[1], 0), parts, monthly: monthly.reduce((a, x) => a + x[1], 0) };
}
function planCostHtml(p) {
  const c = planCost(p), cash = W.player.spendable(W.macro.bank ?? 1);
  if (!c.parts.length) return '<p class="small muted">Sofort fällig: nichts – Flugzeug und Crew sind schon da, Slots und Lizenz vorhanden.</p>';
  return `<p class="small ink2 costline"><b>Sofort fällig:</b> ${c.parts.map(([l, v]) => `${esc(l)} ${eur(v)}`).join(' + ')} = <b>${eur(c.total)}</b>${c.monthly ? ` · danach laufend Leasing ${eur(c.monthly)}/Monat` : ''}${c.total > cash ? ` · <span class="neg">verfügbar nur ${eur(cash)}</span>` : c.total > W.player.ledger.cash / 100 ? ' · <span class="warnc">geht in den Dispo</span>' : ''}</p>`;
}
function suggestPrice() {
  readPlanner();
  const p = ui.planner;
  const ro = SM.refPrice(p.base, p.dest, cpi()), ri = SM.refPrice(p.dest, p.base, cpi());
  let best = null;
  for (let k = 0.55; k <= 1.9; k += 0.05) {
    const fo = Math.round(ro * k / 5) * 5, fi = Math.round(ri * k / 5) * 5;
    const r = plannerForecast(p, { nDraws: 2, seed: 3, trDraws: 1 }, fo, fi);
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
    if (p.acq === 'lease' || p.acq === 'buy') {
      for (let i = 0; i < kit.n; i++) { const r = doAction({ type: 'acquire', typeId: p.type, mode: p.acq, base }); if (!r.ok) { refreshAll(); return; } }
      done.push(`${kit.n > 1 ? kit.n + ' × ' : ''}${tl(p.type)} ${p.acq === 'buy' ? 'gekauft' : 'geleast'}`);
    } else {
      const r = doAction({ type: 'acquire', offerId: p.acq.slice(5), base }); if (!r.ok) { refreshAll(); return; }
      done.push(`gebrauchte ${tl(p.type)} übernommen`);
    }
  }
  // 2. Strecke eröffnen
  const res = doAction({ type: 'openRoute', base, dest: p.dest, typeId: p.type, freq: p.wk && p.wk < 7 ? 1 : p.freq, wk: p.wk && p.wk < 7 ? p.wk : undefined, role: p.role && p.role !== 'mixed' ? p.role : undefined, fo: p.fo, fi: p.fi, service: p.service, buffer: p.buffer, term: p.term });
  if (!res.ok) { refreshAll(); return; }
  // 3. Personal
  if (kit.staffShort && p.hire) { const late = res.start > W.day + 1, h = doAction({ type: 'fillStaff', start: late ? res.start : null }); if (h.ok && h.n) done.push(`${h.n} Personen eingestellt${late ? ` (Antritt zum ersten Flug am ${dateShort(res.start)})` : ''}`); }
  ui.planner = null; ui.plannerKit = null; ui.expanded = res.id; ui.selApt = null;
  toast(`${base}–${p.dest} ${res.start > W.day + 1 ? `angelegt, erster Flug am ${dateShort(res.start)}` : 'eröffnet, erster Flug morgen'}.${done.length ? ' ' + done.join(', ') + '.' : ''} Der Einsatz wird automatisch geplant.`);
  W.operableFreq(W.player); buildSchedules(); setTab('routes'); renderMapRoutes(true); renderHeader();
}
function applyRoute(id) {
  const g = (k) => $(`#ef-${k}-${id}`);
  const fq = parseFreq(g('f').value);
  const res = doAction({ type: 'editRoute', id, fo: Number(g('o').value), fi: Number(g('i').value), freq: fq.freq, wk: fq.wk, role: g('r') ? g('r').value : undefined, service: g('s').value, buffer: g('b').value, typeId: g('ty') ? g('ty').value : undefined,
 });
  if (res.ok) toast(res.msg || 'Änderungen gespeichert.');
  refreshAll();
}

// ---------- Flotte ----------
const acquireCost = (typeId, mode, offer = null) => SM.acquireCost(W.player, typeId, mode, offer, W.macro.eurusd, W);
/** Crew-Lage für ein Flugzeug: Piloten hängen an der Musterfamilie, Kabine und Technik sind allgemein. */
function crewInfo(pl, a) {
  const st = pl.staff; if (!st) return null;
  // ohne gespeicherte Tagesdeckung (ältere Online-Stände): Bedarf aus dem Einsatzplan, Agentur füllt Lücken
  const cov = st.cov || { need: pl.crewNeed(W.day), cancel: st.agency ? {} : null };
  if (!cov.cancel) { const n = cov.need; cov.cancel = {}; for (const g of SM.STAFF_GROUPS) cov.cancel[g] = n.pil[g] > st.pil[g] ? 1 - st.pil[g] / n.pil[g] : 0; cov.cancel.cab = n.cab > st.cab ? 1 - st.cab / n.cab : 0; }
  const g = P.AIRCRAFT_TYPES[a.type_id].group, S = P.STAFF;
  const own = (capH, needH) => (needH > 0 ? Math.min(1, capH / needH) : 1);
  const pOwn = own(st.pil[g], cov.need.pil[g] || 0), cOwn = own(st.cab, cov.need.cab || 0);
  const canc = Math.max(cov.cancel[g] || 0, cov.cancel.cab || 0);
  const fam = P.TYPE_GROUPS[g];
  if (canc > 0.001) return { cls: 'crit', txt: 'Crew fehlt – Flüge fallen aus', tip: `Piloten ${fam}: ${pct(pOwn)} eigen, Kabine ${pct(cOwn)} eigen, Agentur aus` };
  if (pOwn >= 0.999 && cOwn >= 0.999) return { cls: 'good', txt: 'Crew besetzt', tip: `eigene Piloten (${fam}) und Kabine` };
  return { cls: 'warn', txt: 'Crew teils Agentur', tip: `Piloten ${fam}: ${pct(pOwn)} eigen, Kabine ${pct(cOwn)} eigen – Rest Überstunden/Agentur (teuer)` };
}
function acRoleChips(pl, a) {
  const out = [];
  const inService = a.delivery_day <= W.day && !((a.status === 'ccheck' || a.status === 'aog') && a.until > W.day) && !(a.acmi && a.acmi.start <= W.day && a.acmi.end > W.day);
  if (a.cg) { const q = (pl.cgRoutes ? pl.cgRoutes() : []).find((x) => x.id === a.cg); out.push(`<span class="chip cgc" title="Fliegt auf einer Frachtstrecke (Cargo → Frachtnetz)">Fracht ${q ? `${q.base}–${q.dest}` : ''}</span>`); }
  else if (inService && a.used_hours > 0) { const c = crewInfo(pl, a); if (c) out.push(`<span class="chip ${c.cls}" title="${esc(c.tip)}">${c.txt}</span>`); }
  else if (inService && acMode(a) === 'charter') out.push(`<span class="chip warn" title="Fliegt nur Charteraufträge">Charter-Pool${SM.acmiList(a, W.day).length ? ' · ' + SM.acmiList(a, W.day).length + ' Auftr.' : ' · ohne Auftrag'}</span>`);
  else if (inService && acMode(a) === 'reserve') out.push(`<span class="chip me" title="Springt ein, wenn ein anderes Flugzeug ausfällt">Reserve in ${a.base}</span>`);
  else if (inService) out.push(`<span class="chip" title="Einsatzbereit, aber ohne Strecke – kostet trotzdem jeden Tag">bereit in ${a.base}</span>`);
  return out.join(' ');
}
function acStatus(pl, a) {
  if (a.delivery_day > W.day) return `<span class="chip warn">Lieferung ${dateShort(a.delivery_day)}</span>`;
  if (a.status === 'ccheck' && a.until > W.day) return `<span class="chip warn">C-Check bis ${dateShort(a.until)}</span>`;
  if (a.status === 'aog' && a.until > W.day) return `<span class="chip crit">${a.grounded ? 'Stillgelegt' : 'Schaden, am Boden'} bis ${dateShort(a.until)}</span>`;
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
/** Leasingflugzeug übernehmen: Knopf, nach Klick die Konditionen. */
function leaseBuyHtml(pl, a) {
  if (a.owned || a.delivery_day > W.day) return '';
  const q = SM.leaseBuyQuote(W, pl, a); if (!q.ok) return '';
  return `<button class="btn small${q.ended ? ' primary' : ''}" data-act="asklbuy" data-id="${a.id}" aria-pressed="${ui.confirm === 'lbuy:' + a.id}" title="${q.ended ? 'Mindestlaufzeit erreicht – Übernahme zum Restwert mit Abschlag' : `Vor Ende der Mindestlaufzeit (${dateY(q.end)}) mit Ablöse`}">Übernehmen${q.ended ? '' : ' (vorzeitig)'}</button>`;
}
/** Konditionen der Übernahme – als eigene Zeile unter dem Flugzeug. */
function leaseBuyDetail(pl, a) {
  if (ui.confirm !== 'lbuy:' + a.id) return '';
  const q = SM.leaseBuyQuote(W, pl, a); if (!q.ok) return '';
  return `<div class="callout info stack"><b>${acName(a.id)} vom Leasinggeber übernehmen</b>
    <span class="small">Kaufpreis <b>${eur(q.price)}</b>${q.ended ? ` – Restwert mit ${pct(1 - P.LEASE_BUY.endDisc)} Abschlag, die Mindestlaufzeit ist erreicht` : ` plus Ablöse <b>${eur(q.fee)}</b> – der Vertrag läuft noch bis ${dateY(q.end)}`}.</span>
    <span class="small">Eigenanteil ${eur(q.down)}, Kredit ${eur(q.loan)} zu ${pct(q.rate, 1)}${q.dep ? `, die Kaution von ${eur(q.dep)} wird verrechnet` : ''}. Aus der Kasse: <b>${eur(Math.max(0, q.cash))}</b>${q.cash < 0 ? ` (Sie bekommen ${eur(-q.cash)} zurück)` : ''}. Danach keine Leasingrate mehr (bisher ${eur(q.saves)} im Monat), dafür Abschreibung und Zinsen.</span>
    <div class="row"><button class="btn primary small" data-act="leasebuy" data-id="${a.id}">Übernehmen</button><button class="btn small" data-act="cancelconfirm">Abbrechen</button></div></div>`;
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
  const fShown = sortFleet(pl.fleet.filter(fltAc));
  if (pl.fleet.length > 3) html += fltBar('fleet') + (fShown.length < pl.fleet.length ? `<p class="small muted">${fShown.length} von ${pl.fleet.length} Flugzeugen</p>` : '');
  if (pl.fleet.length && !fShown.length) html += '<p class="small muted">Kein Flugzeug passt zum Filter.</p>';
  html += fShown.map((a) => {
    const c = ui.confirm === 'dispose:' + a.id, dc = pl.disposeCost(W.day, a), age = pl.acAge(a, W.day), toC = P.CCHECK_FH - (a.fh - a.lastC);
    const routes = (a.assigned || []).map((id) => pl.routes.find((r) => r.id === id)).filter(Boolean).map((r) => r.dest);
    const upcoming = a.acmi && a.acmi.start > W.day ? ` · Charter ab ${dateShort(a.acmi.start)} (${esc(a.acmi.client)})` : '';
    const move = pl.bases.length > 1 ? `<select data-act-change="move" data-id="${a.id}" aria-label="Basis wechseln" style="width:auto">${pl.bases.map((b) => `<option ${b === a.base ? 'selected' : ''}>${b}</option>`).join('')}</select>` : '';
    const sk = skinFor(pl, a.id);
    return `<div class="fleet-row"><div style="min-width:0"><div class="acrow"><div class="thumb${sk ? ' rar-' + sk.rarity : ''}" ${sk ? `title="Skin: ${esc(sk.name)}"` : ''}>${acSvg(a.type_id, sk ? { skin: sk } : { ...myAcColors(), code: pl.code })}</div><div style="min-width:0"><div class="row" style="gap:8px"><b class="mono">${acName(a.id)}</b> <span>${tlx(a.type_id)}</span> ${acStatus(pl, a)} ${acRoleChips(pl, a)}${acMode(a) !== 'auto' ? ` <span class="chip ${acMode(a) === 'manual' ? 'me' : 'warn'}">${MODE_LABEL[acMode(a)]}</span>` : ''}</div>
      <div class="small muted">${modeLabel(a)}${!a.owned && !a.flex && a.delivery_day <= W.day && W.day >= SM.leaseEnd(a) ? ' · <span class="pos">Leasing ausgelaufen – Übernahme möglich</span>' : ''} · Basis ${a.base} · ${n1(age)} Jahre${a.cond && a.cond !== 1 && pl.oldAcExpert() ? ` · Zustand <span class="${condCls(a.cond) === 'crit' ? 'neg' : condCls(a.cond) === 'good' ? 'pos' : ''}">${condWord(a.cond)}</span>` : ''} · ${eur(acDayCost(a))} pro Tag${routes.length ? ' · fliegt ' + [...new Set(routes)].join(', ') : ''}${upcoming}</div>
      ${a.owned && a.loan > 0.5 ? `<div class="small muted">Kredit ${eur(a.loan)} zu ${pct(a.loanRate || 0.06, 1)} <button class="btn small ghost" data-act="repayac" data-id="${a.id}" style="padding:1px 8px;margin-left:4px" title="Restschuld plus ${pct(P.AC_LOAN_PREPAY, 1)} Vorfälligkeit ablösen">ablösen</button></div>` : ''}
      <div class="small muted">${toC > 0 ? `Nächster C-Check in ${n0(toC)} Flugstunden` : 'C-Check fällig – wartet, bis das andere Flugzeug gleichen Musters aus der Werft zurück ist'} (dauert ${Math.max(4, P.CCHECK_DAYS - (pl.hangars.includes(a.base) ? P.HANGAR_CHECK_DAYS : 0) - Math.round(pl.skill('tech')))} Tage)</div>
      </div></div><div class="bar" style="margin-top:6px" title="Auslastung des 17-Stunden-Betriebsfensters"><i class="me" style="width:${Math.min(100, a.used_hours / P.OPERATING_WINDOW_H * 100).toFixed(0)}%"></i></div>${a.delivery_day <= W.day ? `<div class="small muted">Einsatz ${n1(a.used_hours || 0)} h pro Tag${(() => { const x = acLf(a); return x === null ? '' : ` · Auslastung der Flüge ${pct(x)}`; })()}</div>` : ''}</div>
      <div class="stack" style="justify-items:end">${move}${c ? `<div class="stack small" style="justify-items:end"><span>${a.owned ? `Verkauf: ${eur(dc.cash)} Zufluss nach Kredittilgung` : a.flex ? 'Rückgabe ohne Kosten' : `Rückgabe kostet ${eur(-dc.pnl)}`}</span><div class="row"><button class="btn danger small" data-act="dispose" data-id="${a.id}">${a.owned ? 'Verkaufen' : 'Zurückgeben'}</button><button class="btn small" data-act="cancelconfirm">Abbrechen</button></div></div>`
      : `<button class="btn small" data-act="askdispose" data-id="${a.id}">${a.owned ? 'Verkaufen' : 'Zurückgeben'}</button>`}${leaseBuyHtml(pl, a)}<button class="btn small" data-act="asgopen" data-id="${a.id}">Einsatz planen</button>${collOn() ? `<button class="btn small" data-act="skinpick" data-id="${a.id}" title="${sk ? 'Aktueller Skin: ' + esc(sk.name) : 'Standardlackierung'}">Skin ändern</button>` : ''}${a.delivery_day <= W.day && !(a.acmi && a.acmi.end > W.day) ? `<button class="btn small" data-act="dealac" data-id="${a.id}">An Airline abgeben</button>` : ''}</div></div>${leaseBuyDetail(pl, a)}`;
  }).join('');
  if (pl.fleet.length) html += `<p class="small muted">Ältere Flugzeuge verbrauchen mehr Kerosin, kosten mehr Wartung und fallen öfter aus. Alle ${n0(P.CCHECK_FH)} Flugstunden steht ein C-Check an; ein eigener Hangar an der Basis verkürzt ihn.</p>`;
  return html;
};
/** Charter: Pool, Kalender mit freien Zeiträumen, filterbare Anfragen. */
const grpOf = (t) => P.AIRCRAFT_TYPES[t].group;
function acmiGain(pl, o, a) {
  const rate = SM.acmiRateFor(o, a.type_id), T = P.AIRCRAFT_TYPES[a.type_id], maint = (T.maint_bh * 8 + T.maint_cycle * 3) * cpi();
  const routes = acMode(a) === 'charter' ? [] : [...new Set(a.assigned || [])].map((id) => pl.routes.find((r) => r.id === id)).filter(Boolean);
  const lost = routes.reduce((x, r) => x + Math.max(0, SM.routeDb(r, 30, pl) / Math.max(1, Math.min(30, r.hist.length))) * Math.min(1, (a.used_hours || 0) / Math.max(1, pl.rotH(r) * r.freq)), 0);
  return { rate, net: rate - maint - lost, lost, total: (rate - maint - lost) * (o.end - o.start) };
}
/** Kann Flugzeug a den Auftrag o fliegen (Familie, Lieferung, keine Überschneidung)? */
function acmiFits(a, o) { return !a.cg && grpOf(a.type_id) === grpOf(o.type) && (P.AIRCRAFT_TYPES[a.type_id].role || '') === (P.AIRCRAFT_TYPES[o.type].role || '') && a.delivery_day <= o.start && !SM.acmiList(a, W.day).some((b) => o.start < b.end && o.end > b.start) && !((a.status === 'ccheck' || a.status === 'aog') && a.until > o.start); }
function acmiCalendar(pl, rows, F) {
  const from = W.day, span = F.range, to = from + span, pc = (d) => ((Math.max(from, Math.min(to, d)) - from) / span * 100).toFixed(2);
  // Monatsköpfe
  const heads = []; for (let d = from; d < to;) { const p = dateParts(d), nxt = (() => { let e = d + 1; while (e < to && dateParts(e).m === p.m) e++; return e; })(); heads.push(`<span style="left:${pc(d)}%;width:${(pc(nxt) - pc(d)).toFixed(2)}%">${MONTHS[p.m].slice(0, 3)}${p.m === 0 || d === from ? ' ' + String(p.y).slice(2) : ''}</span>`); d = nxt; }
  const weeks = []; for (let d = from + ((7 - ((from + 4) % 7)) % 7); d < to; d += 7) weeks.push(`<i style="left:${pc(d)}%"></i>`);
  const evs = (W.events || []).filter((e) => e.mega && e.end > from && e.start < to).slice(0, 6).map((e) => `<span class="cal-ev" style="left:${pc(e.start)}%;width:${Math.min(100 - pc(e.start), Math.max(0.8, pc(e.end) - pc(e.start))).toFixed(2)}%" title="${esc(e.title || e.text || 'Großereignis')}"></span>`).join('');
  const row = (a) => {
    const bk = SM.acmiList(a, from).filter((b) => b.start < to), gaps = SM.acmiGaps(a, from, to), sel = F.gap && F.gap.ac === a.id;
    const bars = bk.map((b) => `<span class="cal-b${b.ev ? ' ev' : ''}" style="left:${pc(b.start)}%;width:${Math.min(100 - pc(b.start), Math.max(0.6, pc(b.end) - pc(b.start))).toFixed(2)}%" title="${esc(b.client)} · ${dateShort(b.start)}–${dateShort(b.end)} · ${eur(b.rate)}/Tag">${b.end - b.start >= span / 12 ? esc(b.client) : ''}</span>`).join('');
    const mt = (a.status === 'ccheck' || a.status === 'aog') && a.until > from ? `<span class="cal-m" style="left:0;width:${pc(a.until)}%" title="${a.status === 'ccheck' ? 'C-Check' : 'Reparatur'} bis ${dateShort(a.until)}"></span>` : '';
    const dl = a.delivery_day > from ? `<span class="cal-m" style="left:0;width:${pc(a.delivery_day)}%" title="Lieferung ${dateShort(a.delivery_day)}"></span>` : '';
    const gp = gaps.map(([g0, g1]) => `<button class="cal-g${sel && F.gap.from === g0 ? ' on' : ''}" data-act="acmigap" data-ac="${a.id}" data-from="${g0}" data-to="${g1}" style="left:${pc(g0)}%;width:${Math.min(100 - pc(g0), Math.max(0.6, pc(g1) - pc(g0))).toFixed(2)}%" title="frei ${dateShort(g0)}–${g1 >= to ? 'offen' : dateShort(g1)} (${g1 - g0}${g1 >= to ? '+' : ''} Tage) – antippen: passende Anfragen zeigen">${g1 - g0 >= span / 10 ? `frei ${g1 - g0}${g1 >= to ? '+' : ''} T.` : ''}</button>`).join('');
    const pool = acMode(a) === 'charter', freeDays = gaps.reduce((x, [g0, g1]) => x + g1 - g0, 0), busy = span - freeDays;
    return `<div class="cal-row"><div class="cal-l"><b class="mono">${acName(a.id)}</b><span class="small muted">${a.type_id} · ${a.base}${pool ? '' : ' · Linie'}</span><span class="small ${busy ? 'pos' : 'muted'}">${pct(busy / span)} gebucht</span></div><div class="cal-t">${weeks.join('')}${gp}${dl}${mt}${bars}</div></div>`;
  };
  return `<div class="cal"><div class="cal-row cal-head"><div class="cal-l"></div><div class="cal-t">${heads.join('')}${evs}</div></div>${rows.map(row).join('')}</div>
    <div class="cal-free">${rows.map((a) => { const g = SM.acmiGaps(a, from, to).filter(([g0, g1]) => g1 - g0 >= 2); return g.length ? `<div class="row small" style="gap:6px;flex-wrap:wrap;align-items:center"><b class="mono">${acName(a.id)}</b> frei: ${g.map(([g0, g1]) => `<button class="chip-t pick" aria-pressed="${!!(F.gap && F.gap.ac === a.id && F.gap.from === g0)}" data-act="acmigap" data-ac="${a.id}" data-from="${g0}" data-to="${g1}">${dateShort(g0)}–${g1 >= to ? 'offen' : dateShort(g1)} · ${g1 - g0}${g1 >= to ? '+' : ''} T.</button>`).join('')}</div>` : `<div class="small"><b class="mono">${acName(a.id)}</b> <span class="muted">im Zeitraum ausgebucht</span></div>`; }).join('')}</div>
    <div class="cal-key small muted"><span><i class="cal-b"></i>gebucht</span><span><i class="cal-b ev"></i>Großereignis</span><span><i class="cal-g"></i>frei – antippen filtert die Anfragen</span><span><i class="cal-m"></i>Werft/Lieferung</span><span><i class="cal-e"></i>Großereignis im Kalender</span></div>`;
}
VIEWS.fleetAcmi = function viewFleetAcmi() {
  const pl = W.player, F = ui.acf = ui.acf || { ac: '', fit: true, fam: '', kind: '', ev: false, sort: 'start', gap: null, range: 120 };
  const pool = pl.fleet.filter((a) => acMode(a) === 'charter' && !a.cg), withBk = pl.fleet.filter((a) => acMode(a) !== 'charter' && SM.acmiList(a, W.day).length);
  const calRows = [...pool, ...withBk];
  if (F.gap && !pl.fleet.some((a) => a.id === F.gap.ac)) F.gap = null;
  let html = `<h2 class="sec">Charter (ACMI) <small>${W.acmiOffers.length} Anfragen${W.acmiOffers.some((o) => o.ev) ? ` · ${W.acmiOffers.filter((o) => o.ev).length} zu Großereignissen` : ''}</small></h2>
    <p class="small ink2">ACMI: Sie stellen Flugzeug, Crew, Wartung und Versicherung, der Kunde zahlt eine Tagesrate und trägt Treibstoff und Gebühren. Ein Muster derselben Familie passt auch. Drei Geschäftszweige: Passagiercharter, <b>Privatjets</b> (kurze, gut bezahlte Einsätze für Vorstände, Stars und Delegationen) und <b>Fracht</b> (Paketdienste, Spediteure, oft monatelang). Privatjets und Frachter stehen immer im Charter-Pool und fliegen keine Linie. Ein Flugzeug kann mehrere Aufträge hintereinander haben – der Kalender zeigt, wo noch Platz ist.</p>`;
  // Charter-Pool
  const others = pl.fleet.filter((a) => acMode(a) !== 'charter');
  html += `<div class="card pad stack"><div class="spread"><h3>Charter-Flotte <small class="muted">${pool.length} Flugzeug${pool.length === 1 ? '' : 'e'} im Pool</small></h3></div>
    ${pool.length ? `<div class="row" style="gap:6px;flex-wrap:wrap">${pool.map((a) => `<span class="chip me" style="padding:4px 4px 4px 10px">${acName(a.id)} · ${a.type_id} ${P.AIRCRAFT_TYPES[a.type_id].role ? `<span class="small muted" style="padding:0 8px">${P.AIRCRAFT_TYPES[a.type_id].role === 'cargo' ? 'Frachter' : 'Privatjet'}</span>` : `<button class="btn small ghost" data-act="acmipool" data-id="${a.id}" data-on="0" title="Zurück in die automatische Einsatzplanung">zurück in den Linienflug</button>`}</span>`).join('')}</div>` : '<p class="small muted">Noch kein Flugzeug im Charter-Pool. Flugzeuge im Pool fliegen keine eigenen Strecken mehr und stehen nur für Charter bereit – sinnvoll für Maschinen, die im Netz wenig verdienen.</p>'}
    ${others.length ? `<div class="row" style="gap:8px;flex-wrap:wrap"><select id="acmi-pooladd" style="width:auto;flex:1;min-width:200px">${others.map((a) => `<option value="${a.id}">${acName(a.id)} · ${a.type_id} · ${a.base} · ${a.used_hours > 0 ? n1(a.used_hours) + ' h/Tag im Linienflug' : 'ohne Einsatz'}</option>`).join('')}</select><button class="btn small primary" data-act="acmipool" data-on="1">In den Charter-Pool</button></div>
      <p class="small muted">Fliegt die Maschine Strecken, übernehmen andere Flugzeuge die Umläufe – fehlt Kapazität, fallen Flüge aus.</p>` : ''}</div>`;
  // 0.21.50: Gebuchte Aufträge als Liste (laufende zuerst, dann nach Beginn)
  { const KIND = { pax: 'Passagiere', biz: 'Privatjet', cargo: 'Fracht' };
    const bks = pl.fleet.flatMap((a) => SM.acmiList(a, W.day).map((b) => ({ a, b }))).sort((x, y) => x.b.start - y.b.start);
    if (bks.length) {
      const run = bks.filter(({ b }) => b.start <= W.day), tot = bks.reduce((s, { b }) => s + b.rate * (b.end - b.start), 0);
      const open = bks.reduce((s, { b }) => s + b.rate * (b.end - Math.max(W.day, b.start)), 0);
      html += `<div class="stack"><h3 class="sec sm">Gebuchte Aufträge <small>${bks.length} Auftr${bks.length === 1 ? 'ag' : 'äge'} · ${run.length} laufend · gesamt ${eur(tot)}, davon noch offen ${eur(open)}</small></h3>
        <div class="card pad"><div class="hlist acmi-bk">
        ${bks.map(({ a, b }) => { const days = b.end - b.start, live = b.start <= W.day, done = Math.max(0, Math.min(W.day, b.end) - b.start), kind = b.kind || P.AIRCRAFT_TYPES[a.type_id].role || 'pax';
          return `<div class="hrow"><div style="min-width:0"><b>${esc(b.client)}</b> ${live ? `<span class="chip me">läuft · noch ${n0(b.end - W.day)} Tage</span>` : `<span class="chip">${b.start - W.day <= 14 ? `in ${n0(b.start - W.day)} Tagen` : `ab ${dateShort(b.start)}`}</span>`}${b.ev ? ' <span class="chip good">Großereignis</span>' : ''}
              <div class="small muted">${KIND[kind] || 'Passagiere'} · ${acName(a.id)} (${a.type_id}${acMode(a) === 'charter' ? '' : ', aus dem Linienbetrieb'})${b.apt ? ` · rund um ${esc(apName(b.apt))}` : ''}</div>
              <div class="small muted">${dateShort(b.start)} – ${dateShort(b.end)} · ${n0(days)} Tage · ${eur(b.rate)} pro Tag</div></div>
            <div class="n"><b>${eur(b.rate * days)}</b><span class="small muted">${live ? `verdient ${eur(b.rate * done)}` : 'gesamt'}</span></div></div>`; }).join('')}
        </div></div></div>`;
    } else if (pool.length) html += `<p class="small muted">Noch keine Aufträge gebucht – passende Anfragen stehen unten.</p>`;
  }
  // Kalender
  if (calRows.length) html += `<div class="stack"><div class="spread"><h3 class="sec sm">Charterkalender <small>${dateShort(W.day)} bis ${dateShort(W.day + F.range)}</small></h3><div class="seg" role="group">${[60, 120, 240].map((d) => `<button data-act="acmirange" data-v="${d}" aria-pressed="${F.range === d}">${d === 240 ? '8 Mon.' : d / 30 + ' Mon.'}</button>`).join('')}</div></div>${acmiCalendar(pl, calRows, F)}</div>`;
  // Anfragen filtern
  const fams = [...new Set(W.acmiOffers.map((o) => grpOf(o.type)))];
  const target = F.ac ? pl.fleet.filter((a) => a.id === F.ac) : calRows.length ? calRows : pl.fleet;
  let list = W.acmiOffers.filter((o) => (!F.fam || grpOf(o.type) === F.fam) && (!F.ev || o.ev) && (!F.kind || (o.kind || 'pax') === F.kind));
  if (F.gap) { const a = pl.fleet.find((x) => x.id === F.gap.ac); list = list.filter((o) => o.start >= F.gap.from && o.end <= F.gap.to && a && acmiFits(a, o)); }
  else if (F.fit) list = list.filter((o) => target.some((a) => acmiFits(a, o)));
  const best = (o) => { const c = pl.fleet.filter((a) => acmiFits(a, o)); return c.length ? Math.max(...c.map((a) => acmiGain(pl, o, a).total)) : -1e12; };
  const SORT = { start: (a, b) => a.start - b.start, rate: (a, b) => b.rate - a.rate, total: (a, b) => best(b) - best(a), dur: (a, b) => (b.end - b.start) - (a.end - a.start) };
  list.sort((a, b) => (!!b.ev - !!a.ev) * (F.sort === 'start' ? 0 : 0) || SORT[F.sort](a, b));
  html += `<div class="stack"><h3 class="sec sm">Anfragen <small>${list.length} von ${W.acmiOffers.length}</small></h3>
    <div class="row acf" style="gap:8px;flex-wrap:wrap"><select id="acf-ac" aria-label="Flugzeug"><option value="">${calRows.length ? 'Charter-Flotte' : 'alle Flugzeuge'}</option>${pl.fleet.map((a) => `<option value="${a.id}" ${F.ac === a.id ? 'selected' : ''}>${acName(a.id)} · ${a.type_id}</option>`).join('')}</select>
      <select id="acf-kind" aria-label="Geschäftszweig">${[['', 'alle Geschäftszweige'], ['pax', 'Passagiere'], ['biz', 'Privatjets'], ['cargo', 'Fracht']].map(([k, l]) => `<option value="${k}" ${(F.kind || '') === k ? 'selected' : ''}>${l} (${W.acmiOffers.filter((o) => !k || (o.kind || 'pax') === k).length})</option>`).join('')}</select>
      <select id="acf-fam" aria-label="Familie"><option value="">alle Familien</option>${fams.map((g) => `<option value="${g}" ${F.fam === g ? 'selected' : ''}>${esc(P.TYPE_GROUPS[g])}</option>`).join('')}</select>
      <select id="acf-sort" aria-label="Sortierung">${[['start', 'nach Beginn'], ['total', 'nach Gesamterlös'], ['rate', 'nach Tagesrate'], ['dur', 'nach Dauer']].map(([k, l]) => `<option value="${k}" ${F.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label class="chk small"><input type="checkbox" id="acf-fit" ${F.fit ? 'checked' : ''}> passt in freie Zeiträume</label><label class="chk small"><input type="checkbox" id="acf-ev" ${F.ev ? 'checked' : ''}> nur Großereignisse</label></div>
    ${F.gap ? `<div class="callout info row" style="gap:8px;align-items:center"><span>Freier Zeitraum <b>${acName(F.gap.ac)}</b>: ${dateShort(F.gap.from)} bis ${F.gap.to >= W.day + F.range ? 'offen' : dateShort(F.gap.to)}</span><button class="btn small" data-act="acmigap" data-clear="1" style="margin-left:auto">Filter aufheben</button></div>` : ''}`;
  html += list.length ? list.map((o) => {
    const cands = pl.fleet.filter((a) => acmiFits(a, o)).sort((a, b) => (acMode(b) === 'charter') - (acMode(a) === 'charter') || acmiGain(pl, o, b).net - acmiGain(pl, o, a).net);
    const show = F.gap ? cands.filter((a) => a.id === F.gap.ac) : F.ac ? cands.filter((a) => a.id === F.ac) : cands;
    const days = o.end - o.start, t = P.AIRCRAFT_TYPES[o.type];
    return `<div class="card pad stack${o.ev ? ' acmi-ev' : ''}"><div class="spread"><b>${esc(o.client)}</b><span class="row" style="gap:4px">${o.ev ? '<span class="chip good">Großereignis</span>' : ''}${o.kind ? `<span class="chip ${o.kind === 'cargo' ? 'warn' : 'me'}">${o.kind === 'cargo' ? 'Fracht' : 'Privatjet'}</span>` : ''}<span class="chip">${tlx(o.type)}</span></span></div>
      <div class="small ink2">${dateShort(o.start)} bis ${dateShort(o.end)} (${days} Tage) · <b>${eur(o.rate)} pro Tag</b> · gesamt ${eur(o.rate * days)}${o.apt ? ` · Einsatz rund um ${esc(apName(o.apt))}` : ''}</div>
      ${calRows.length ? `<div class="cal-mini" title="Zeitraum im Kalender">${(() => { const l = Math.min(98, Math.max(0, o.start - W.day) / F.range * 100), w = Math.max(2, Math.min(100 - l, (Math.min(o.end, W.day + F.range) - Math.max(o.start, W.day)) / F.range * 100)); return `<span style="left:${l.toFixed(1)}%;width:${w.toFixed(1)}%"></span>`; })()}</div>` : ''}
      ${show.length ? `<div class="stack" style="gap:6px">${show.slice(0, 4).map((a) => { const g = acmiGain(pl, o, a); return `<div class="acmi-c"><span class="small"><b>${acName(a.id)}</b> · ${a.type_id}${a.type_id !== o.type ? ' (Familie)' : ''} · ${acMode(a) === 'charter' ? '<span class="pos">Charter-Pool, frei</span>' : a.used_hours > 0 ? n1(a.used_hours) + ' h/Tag im Linienflug' : '<span class="pos">frei</span>'}<br><span class="muted">${eur(g.rate)}/Tag · netto <b class="${sgn(g.net)}">${eur(g.net, { plus: true })}</b>/Tag${g.lost > 0 ? ' nach entgangenem Streckenbeitrag' : ''} · gesamt ${eur(g.total, { plus: true })}</span></span><button class="btn small primary" data-act="acmi" data-id="${o.id}" data-ac="${a.id}">Verchartern · ${eurB(g.rate * days)}</button></div>`; }).join('')}${show.length > 4 ? `<span class="small muted">und ${show.length - 4} weitere passende Flugzeuge</span>` : ''}</div>`
        : `<span class="small muted">${cands.length ? 'Das gewählte Flugzeug ist in dem Zeitraum nicht frei.' : `Kein Flugzeug der Familie ${esc(P.TYPE_GROUPS[t.group])} in dem Zeitraum frei.`}</span>`}
      <span class="small muted">Angebot gilt bis ${dateShort(o.expires)}</span></div>`;
  }).join('') : W.acmiOffers.length ? `<div class="callout info"><span>Keine der ${W.acmiOffers.length} Anfragen passt zu den Filtern${F.fit || F.gap ? ' – „passt in freie Zeiträume“ zeigt nur Anfragen, die eines Ihrer Flugzeuge im passenden Zeitraum übernehmen kann' : ''}.</span><button class="btn small" data-act="acfall">Alle ${W.acmiOffers.length} Anfragen zeigen</button></div>`
    : `<p class="small muted">Gerade keine Anfragen. Neue kommen jede Woche, zum Monatswechsel und vor Großereignissen.</p>`;
  html += '</div>';
  return html;
};
/** Wann es mit dem Leasing wieder klappt – für Absagen und Auflagen. */
function leaseWhenTxt(pl, typeId) {
  const o = SM.leaseOutlook(pl, typeId, W.day), rk = SM.riskTerms(pl, typeId), out = [];
  if (o.roomLeft <= 0) out.push(`Leasingrahmen wieder frei ab <b>${dateShort(o.roomDay)}</b>`);
  if (o.condNeed > 0) out.push(o.condDay ? `unter Auflagen voraussichtlich ab <b>${dateShort(o.condDay)}</b>` : `unter Auflagen erst mit ${o.condNeed} Punkten mehr Ansehen`);
  if (o.freeNeed > 0) out.push(o.freeDay ? `ohne Auflagen ab <b>${dateShort(o.freeDay)}</b>` : `ohne Auflagen mit ${o.freeNeed} Punkten mehr Ansehen`);
  if (!out.length) return '';
  const fast = rk.reject || rk.cond ? ' Schneller geht es mit besserem Rating (je Stufe bis 5 Punkte), Eigenkapital über dem Start (+5), Pünktlichkeit (bis 10) und Marke (bis 15) – und wer kauft statt least, baut Eigenkapital auf.' : '';
  return `${out.join(' · ')} (Ansehen jetzt ${o.st}, verlangt ${o.req}; Erfahrung bringt rund 1 Punkt je Monat).${fast}`;
}
const newBaseCost = (pl, c) => { const ap0 = SM.baseApproval(pl, c); return SM.baseSetupCost(W, c) * SM.softX(pl, 'base') + Math.max(0, SM.licenceFee(W, c) * (ap0.x || 1) - (pl.stations[c] ? SM.stationFee(W, c) : 0)) + SM.baseSlotCost(W, c, pl) + SM.baseExtraFee(W, pl, c); };
const newBaseBtnTxt = (pl, c) => { const a = SM.baseApproval(pl, c); return a.ok ? `${a.cond ? 'Basis beantragen (Auflagen)' : 'Basis eröffnen'} · einmalig ${eurB(newBaseCost(pl, c))} inkl. ${SM.baseExtraFee(W, pl, c) ? 'Konzessionsabgabe und ' : ''}${SM.baseSlotN(pl, c)} Slots` : `Abgelehnt – Ansehen ${a.st} von ${a.req - SM.P.STANDING.baseCond} nötig`; };
VIEWS.fleetBuy = function viewFleetBuy() {
  const pl = W.player;
  const base = pl.bases.includes(ui.acqBase) ? ui.acqBase : pl.bases[0];
  let html = `<h2 class="sec">Beschaffung <small>Leasing, Gebrauchtmarkt, ab Werk, Auktionen</small></h2>` + justAcqHtml();
  html += `<p class="small muted">Tipp: Am schnellsten geht es über <b>Strecken → Planung</b> – dort beschaffen Sie das passende Flugzeug und das Personal gleich mit.</p>`;
  html += auctionsHtml();
  const cash = pl.spendable(W.macro.bank ?? 1);
  if (pl.bases.length > 1) html += `<label class="f"><span>Stationieren in</span><select id="acq-base">${pl.bases.map((b) => `<option ${b === base ? 'selected' : ''}>${b}</option>`).join('')}</select></label>`;
  const btn = (id, mode, label, offer = null, primary = false) => { const need = acquireCost(id, mode, offer); const ok = cash >= need; return `<button class="btn small${primary ? ' primary' : ''}" data-act="acquire" data-type="${id}" data-mode="${mode}"${offer ? ` data-offer="${offer.id}"` : ''} ${ok ? '' : 'disabled'} title="${ok ? `sofort ${eur(need)}${need > pl.ledger.cash / 100 ? ' – geht in den Dispo' : ''}` : 'Auch mit Dispo fehlen ' + eur(need - cash)}">${label}<span class="btn-sub">${need > 0 ? `sofort ${eurB(need)}` : 'ohne Anzahlung'}</span></button>`; };
  html += `<div class="stack"><h2 class="sec">Gebrauchtmarkt <small>wechselt monatlich</small></h2><div class="tw"><table class="t usedmkt"><thead><tr><th>Typ · Alter · Zustand</th><th class="r">Konditionen</th><th></th></tr></thead><tbody>
    ${W.acMarket.slice().sort((a, b) => a.type.localeCompare(b.type) || a.age - b.age).map((o) => `<tr><td><b>${tlx(o.type)}</b>${o.from ? ` <span class="chip warn" title="Aus einer Insolvenz – deutlich unter Marktpreis">aus der Insolvenz von ${esc(o.from)}</span>` : ''}<div class="small"><span class="mono">${o.age} J.</span> · ${condInfo(o)}</div><div class="small muted">Angebot bis ${dateShort(o.expires)} · Lieferung ${o.delivery} T.</div></td>
      <td style="text-align:right">${(() => { const f = pl.oldAcFactor(o.age), v = o.kind === 'lease' ? o.lease_month : o.price; return `<b class="mono">${eur(v * f)}${o.kind === 'lease' ? '/Mon.' : ''}</b><div class="small muted">${o.kind === 'lease' ? 'Leasing 36 M.' : 'Kauf'}${f < 1 ? ` · <span class="pos" title="statt ${eur(v)}">Luis −10 %</span>` : ''}</div>`; })()}</td>
      <td class="r">${btn(o.type, o.kind === 'lease' ? 'lease' : 'buy', o.kind === 'lease' ? 'Leasen' : 'Kaufen', o)}</td></tr>`).join('')}
  </tbody></table></div><p class="small muted">Leasingraten sind in US-Dollar vereinbart: Fällt der Euro, wird das Leasing teurer. Der Zustand gebrauchter Flugzeuge ist verborgen: Verbrauchte Maschinen verhalten sich wie deutlich ältere. ${pl.oldAcExpert() ? 'Luis Perez begutachtet jedes Angebot ab 8 Jahren.' : 'Ein Gutachter wie Luis Perez (Unternehmen → Personal) sieht ihn genau, Ihre Technik ab Senior grob.'}</p></div>`;
  const SEGS = [['reg', 'Regional', 'Turboprops und Regionaljets bis 120 Sitze – der Einstieg für junge Airlines'], ['nb', 'Kurz- und Mittelstrecke', 'Schmalrumpf: A220, A320-Familie, Boeing 737'], ['wb', 'Langstrecke und Großraum', 'Großraumjets, A321XLR und Concorde'], ['cargo', 'Frachter', 'Fliegen eigene Frachtstrecken (Cargo) und Fracht-Charter'], ['biz', 'Privatjets', 'Fliegen nur Privatjet-Charter']];
  const segOf = (t) => t.role || (['ATR', 'DH8', 'EJET'].includes(t.group) ? 'reg' : ['A220', 'A32F', 'B737'].includes(t.group) && t.range_km < 8000 ? 'nb' : 'wb');
  const segF = ui.buySeg || '';
  html += `<h2 class="sec">Neu vom Leasinggeber oder ab Werk</h2><div class="seg wrap" role="group" aria-label="Segment"><button data-act="buyseg" data-v="" aria-pressed="${!segF}">Alle</button>${SEGS.map(([k, l]) => `<button data-act="buyseg" data-v="${k}" aria-pressed="${segF === k}">${l}</button>`).join('')}</div>`;
  for (const [segK, segL, segD] of SEGS) { if (segF && segF !== segK) continue; html += `<h3 class="sec sm">${segL} <small>${segD}</small></h3><div class="types">${Object.entries(P.AIRCRAFT_TYPES).filter(([, t]) => (!t.launch || W.day >= t.launch - 30) && segOf(t) === segK).map(([id, t]) => {
    const known = pl.familyKnown(id), fam = P.TYPE_GROUPS[t.group];
    const stock = W.lessorStock && W.lessorStock[id] !== undefined ? W.lessorStock[id] : SM.capOf(W, id), duty = SM.acTariff(W, pl, id), auctionOnly = t.launch && W.day < t.launch + 365;
    const usedOnly = t.stock === 0;
    const avail = usedOnly ? `<span class="chip warn">Nur gebraucht – selten auf dem Gebrauchtmarkt${t.maxPerAirline ? `, höchstens ${t.maxPerAirline} je Airline` : ''}</span>${t.worldMax ? ` <span class="chip">weltweit ${W.typeCount(id)} von ${t.worldMax} im Einsatz</span>` : ''}` : auctionOnly ? `<span class="chip me">Neues Muster – im ersten Jahr nur per Auktion</span>` : `<span class="chip ${stock <= 0 ? 'crit' : stock <= 2 ? 'warn' : ''}">${stock <= 0 ? 'beim Leasinggeber ausverkauft' : `${stock} beim Leasinggeber`}</span> <span class="chip">Lieferung ${SM.leaseDelivery(W, id, 'lease')} T.</span>${duty ? ` <span class="chip crit">Zoll +${pct(duty)}</span>` : ''}`;
    const intro = known ? `Familie ${fam} schon in der Flotte, Piloten können wechseln` : `neue Familie ${fam}: ${eur(P.TYPE_INTRO_COST)} Einführung${pl.typesIntroduced.length ? ` + ${eur(P.TYPE_COMPLEXITY_DAY)} pro Tag Komplexität, eigene Musterberechtigung für Piloten` : ''}`;
    return `<div class="type${ui.buyFocus === id ? ' hl' : ''}" id="type-${id}"><div class="type-h"><b>${tlx(id)}</b><span class="small muted">${esc(t.maker)} · ${t.cls}${t.age >= 10 ? ` · ${t.age} J. alt` : ''}</span></div>
      <div class="acv-box">${acSvg(id, { ...myAcColors(), code: pl.code })}</div>
      <div class="specs">${t.role === 'cargo' ? `<div><span>Nutzlast</span><b>${n0(t.cargo_kg / 1000)} t</b></div>` : t.role === 'biz' ? `<div><span>Plätze</span><b>${t.seats.standard}</b></div>` : `<div><span>Sitze</span><b>${t.seats.basic}/${t.seats.standard}/${t.seats.premium}</b></div>`}<div><span>Reichweite</span><b>${n0(t.range_km)} km</b></div><div><span>Verbrauch</span><b>${n0(t.fuel_bh_kg)} kg/h</b></div><div><span>Crew</span><b>${t.cockpit || 2} + ${t.cabin}</b></div></div>
      <div class="small ink2">${esc(t.note)}. ${esc(t.engines)}.</div>
      <div class="row" style="gap:6px">${avail}</div>
      ${usedOnly ? `<div class="small muted">Gebraucht um ${eur(t.value_eur * (1 + duty))} Kaufpreis · Betrieb: ${n0(t.fuel_bh_kg)} kg Kerosin und ${eur(t.maint_bh)} Wartung je Blockstunde · ${known ? '' : `neue Familie ${fam}: ${eur(P.TYPE_INTRO_COST)} Einführung`}</div>` : `${(() => { const rk = SM.riskTerms(pl, id); return rk.reject ? `<div class="small neg">${esc(rk.reject)}</div><div class="small muted">${leaseWhenTxt(pl, id)}</div>` : rk.cond ? `<div class="small warnc">Leasing unter Auflagen (Ansehen ${rk.st}, verlangt ${rk.req}): Rate +${pct(rk.lease - 1)}, Kaution ${rk.dep} Monatsraten, Eigenanteil beim Kauf ${pct(rk.down)}.</div><div class="small muted">${leaseWhenTxt(pl, id)}</div>` : rk.lease > 1.001 ? `<div class="small muted">Junge Airline: Wartungsrücklage +${pct(rk.lease - 1)} auf die Rate.</div>` : ''; })()}<div class="small muted">Leasing ${eur(t.lease_month * SM.riskTerms(pl, id).lease * (1 + duty) * pl.oldAcFactor(t.age) * P.EURUSD / W.macro.eurusd)}/Monat · Flex ${eur(t.lease_month * SM.riskTerms(pl, id).lease * (1 + duty) * pl.oldAcFactor(t.age) * (1 + P.FLEX_LEASE_PREMIUM) * P.EURUSD / W.macro.eurusd)}/Monat${pl.oldAcFactor(t.age) < 1 ? ' (−10 % durch Luis)' : ''} · ${t.age >= 10 ? `Kauf ${eur(t.value_eur * (1 + duty) * pl.oldAcFactor(t.age))}` : `ab Werk ${eur(t.value_eur * 1.08 * (1 + duty))} in ${SM.leaseDelivery(W, id, 'factory')} Tagen`} · ${intro}</div>`}
      ${auctionOnly || usedOnly ? '' : `<div class="row">${stock > 0 && !SM.riskTerms(pl, id).reject ? btn(id, 'lease', 'Leasen, 36 Monate', null, true) + btn(id, 'flex', 'Flex-Leasing') : stock > 0 ? '<span class="small neg">Leasing abgelehnt</span>' + btn(id, 'buy', 'Kaufen', null, true) : '<span class="small neg">Leasing derzeit nicht möglich</span>'}${t.age >= 10 || t.noFactory ? '' : btn(id, 'factory', 'Ab Werk bestellen')}</div>`}${SM.minApt(id) ? `<div class="small warnc">Nur zwischen Flughäfen ab ${SM.minApt(id)} Mio. Passagieren im Jahr oder mit verlängerter Bahn (Code F).</div>` : ''}</div>`;
  }).join('')}</div>`; }
  html += `<p class="small muted">Leasinggeber haben nur begrenzten Bestand, den sich alle Airlines teilen; viele Bestellungen verlängern die Lieferzeiten. Flugzeuge kosten jeden Tag, auch wenn sie stehen.</p>`;
  return html;
};

// ---------- Personal ----------
VIEWS.staff = function viewStaff() {
  const pl = W.player, st = pl.staff, rows = staffPlan(pl), cov = st.cov;
  const foundLeft = P.STAFF.foundingDays - (W.day - (pl.joinedDay || 0));
  const hrLead = (role) => SM.hireLead(W, pl, role);
  let html = foundLeft > 0 ? `<div class="callout good"><b>Gründungsphase:</b> Noch ${n0(foundLeft)} ${foundLeft === 1 ? 'Tag' : 'Tage'} liegen Bewerbungen schon vor – wer jetzt eingestellt wird, fängt nach höchstens ${P.STAFF.foundingLead} Tagen an.</div>` : '';
  html += `<h2 class="sec">Personal <small>${n0(SM.sumObj(st.pil) + st.cab + st.tech)} Beschäftigte · ${eur(pl.staffMonthly(cpi()))} pro Monat</small></h2>`;
  html += `<div class="crewrule"><div><b>Piloten</b><span>je Musterfamilie eingestellt – ein Typ-Rating gilt nur für ${[...new Set(pl.fleet.map((a) => P.AIRCRAFT_TYPES[a.type_id].group))].map((g) => esc(P.TYPE_GROUPS[g])).join(', ') || 'die jeweilige Familie'}. Umschulung auf eine andere Familie dauert ${P.STAFF.trainDays} Tage.</span></div><div><b>Flugbegleiterinnen &amp; Technik</b><span>arbeiten auf allen Mustern und an allen Basen.</span></div></div>`;
  { const pa = (pl.staffNeedPlanned().perAc) || {}, ids = Object.keys(pa);
    if (ids.length) html += `<details class="fcx"><summary>Crew je Flugzeug (${ids.length} im Einsatz)</summary><table class="t"><thead><tr><th>Flugzeug</th><th class="r">Blockstunden/Tag</th><th class="r">Piloten</th><th class="r">Kabine</th></tr></thead><tbody>${ids.map((id) => { const x = pa[id], a = pl.fleet.find((y) => y.id === id); return `<tr><td><b class="mono">${acName(id)}</b> ${a ? tlx(a.type_id) : ''}</td><td class="r">${n1(x.bh)}</td><td class="r">${n1(x.pil)}</td><td class="r">${n1(x.cab)}</td></tr>`; }).join('')}</tbody></table>
      <p class="small muted">Anteile je Flugzeug; Piloten einer Musterfamilie und die Kabine teilen sich die ganze Flotte, aufgerundet wird erst in der Summe.</p></details>`; }
  if (cov) {
    const canc = Object.entries(cov.cancel).filter(([, v]) => v > 0);
    if (canc.length) html += `<div class="callout crit">Heute fallen Flüge aus: Es fehlen Crews${st.agency ? '' : ', und Agenturpersonal ist abgeschaltet'}.</div>`;
    else if (cov.agencyH > 0) html += `<div class="callout warn">Heute ${n0(cov.agencyH)} Personen über Agenturen (1,6-facher Satz) und ${n0(cov.overtimeH)} in Überstunden. Mehrkosten ${eur(cov.extraCost)} pro Tag.</div>`;
    else if (cov.overtimeH > 0) html += `<div class="callout info">Heute ${n0(cov.overtimeH)} Personen in Überstunden (1,5-facher Satz). Dauerhafte Überlastung drückt die Stimmung.</div>`;
  }
  { // Antrittstermin: sofort, zur nächsten Flugzeuglieferung oder zum Start einer angekündigten Strecke
    const opts = [];
    for (const a of pl.fleet.filter((x) => x.delivery_day > W.day).sort((x, y) => x.delivery_day - y.delivery_day)) opts.push([a.delivery_day, `Lieferung ${acName(a.id)} (${tl(a.type_id)}) am ${dateShort(a.delivery_day)}`]);
    for (const r of pl.activeRoutes().filter((x) => x.opened_day > W.day)) opts.push([r.opened_day, `Start ${r.base}–${r.dest} am ${dateShort(r.opened_day)}`]);
    const seen = new Set(), list = opts.filter(([d, l]) => { const k = d + l; if (seen.has(k)) return false; seen.add(k); return true; }).sort((x, y) => x[0] - y[0]).slice(0, 10);
    if (ui.hireStart && ui.hireStart <= W.day) ui.hireStart = null;
    const cur = ui.hireStart || '', inList = list.some(([d]) => String(d) === String(cur));
    html += `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><span class="small muted">Antritt neuer Leute</span><select id="hire-start" style="width:auto">
      <option value="">so früh wie möglich</option>${list.map(([d, l]) => `<option value="${d}" ${String(d) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`).join('')}
      ${cur && !inList ? `<option value="${cur}" selected>am ${dateShort(Number(cur))}</option>` : ''}</select>
      <span class="small muted">oder in</span><input type="number" id="hire-in" min="0" max="180" placeholder="Tagen" style="width:84px" value="${cur ? Number(cur) - W.day : ''}">
      <span class="small muted">${cur ? `Bedarf bis ${dateShort(Number(cur))} eingerechnet · Gehalt erst ab Antritt · Einstellungskosten sofort` : 'Neue fangen nach der Vorlaufzeit an.'}</span></div>`;
  }
  html += `<div class="tw"><table class="t"><thead><tr><th>Gruppe</th><th class="r">Bestand</th><th class="r">Bedarf</th><th class="r">kommen</th><th class="r">Gehalt</th></tr></thead><tbody>
    ${rows.map((r) => { const gap = r.have + r.pipe - r.need;
      const arr = st.pipeline.filter((p) => (p.kind === 'hire' && p.role === r.role && (r.role !== 'pilot' || p.group === r.group)) || (p.kind === 'train' && r.role === 'pilot' && p.to === r.group)).sort((a, b) => a.ready - b.ready);
      // Schübe nach Antrittstag zusammenfassen, je Tag eine Zeile
      const byDay = []; for (const p of arr) { const last = byDay[byDay.length - 1]; if (last && last.day === p.ready && last.train === (p.kind === 'train')) last.n += p.count; else byDay.push({ day: p.ready, n: p.count, train: p.kind === 'train' }); }
      const when = byDay.map((x) => `${n0(x.n)} am ${dateShort(x.day)} (in ${n0(Math.max(0, x.day - W.day))} T.)${x.train ? ' aus Umschulung' : ''}`).join(', ');
      const whenList = byDay.length ? `<ul class="arrivals">${byDay.map((x) => `<li><b>${n0(x.n)}</b> ${x.n === 1 ? 'kommt' : 'kommen'} am <b>${dateShort(x.day)}</b> <span class="muted">· ${x.day - W.day <= 0 ? 'heute' : x.day - W.day === 1 ? 'morgen' : `in ${n0(x.day - W.day)} Tagen`}${x.train ? ' · aus Umschulung' : ''}</span></li>`).join('')}</ul>` : '';
      return `<tr><td>${r.label}</td><td class="r">${n0(r.have)}</td><td class="r">${n0(Math.ceil(r.need))}</td><td class="r" ${when ? `title="${esc(when)}"` : ''}>${r.pipe ? '+' + n0(r.pipe) : '–'}</td><td class="r">${eur(r.salary * st.pay * cpi() * SM.wageX(pl.bases[0]))}</td></tr>
      <tr class="sub"><td colspan="5">${whenList}<div class="row small"><span class="${gap < 0 ? 'neg' : 'muted'}">${gap < 0 ? `fehlen ${n0(Math.ceil(-gap))}` : `Reserve ${n0(Math.floor(gap))}`}</span>
        <input type="number" id="hire-${r.key}" min="1" max="${P.STAFF.maxHire[r.role]}" value="${Math.max(1, Math.min(P.STAFF.maxHire[r.role], Math.ceil(Math.max(1, r.need * 1.1 - r.have - r.pipe))))}" style="width:64px">
        <button class="btn small primary" data-act="hire" data-role="${r.role}" data-group="${r.group || ''}" data-key="${r.key}" id="hirebtn-${r.key}">${hireLbl(r.role, Math.max(1, Math.min(P.STAFF.maxHire[r.role], Math.ceil(Math.max(1, r.need * 1.1 - r.have - r.pipe)))))}</button><button class="btn small" data-act="fire" data-role="${r.role}" data-group="${r.group || ''}" data-key="${r.key}">Entlassen</button>
<span class="muted">Neue fangen nach ${hrLead(r.role)} T. an · ${eur(P.STAFF.recruit[r.role] * cpi() * (r.role === 'pilot' ? W.macro.laborTight : 1))} je Einstellung</span></div></td></tr>`; }).join('')}
  </tbody></table></div>
  <div class="row"><button class="btn primary" data-act="fillstaff">Bedarf plus 10 % Reserve decken</button><button class="btn" data-act="dealnew">Crews per Handel übernehmen</button><span class="small muted">Arbeitsmarkt diesen Monat: noch ${['pilot', 'cabin', 'tech'].map((r) => { const x = SM.laborPool(W, r); return `${n0(Math.max(0, x.pool - x.used))} ${r === 'pilot' ? 'Piloten' : r === 'cabin' ? 'Flugbegleiterinnen' : 'Techniker'}`; }).join(', ')} (je Airline höchstens ${P.STAFF.maxHire.pilot} / ${P.STAFF.maxHire.cabin} / ${P.STAFF.maxHire.tech}). Entlassen kostet ${P.STAFF.severanceMonths} Monatsgehälter.</span></div>
  <p class="small muted">Bedarf nach Blockstunden: Ein Pilot oder eine Flugbegleiterin fliegt im Schnitt ${P.STAFF.pilotH} Blockstunden am Tag (Ruhezeiten, freie Tage, Urlaub, Krankheit – rund ${n0(P.STAFF.pilotH * 365)} im Jahr). Ein A320 mit 10 Stunden am Tag braucht also etwa 7 Piloten und 14 Flugbegleiterinnen, mit 5 Stunden etwa 4 und 7 – mindestens aber eine volle Besetzung. Die Crews teilen sich die ganze Flotte. Ab 9 Stunden Flugzeit fliegen 3, ab 13 Stunden 4 Piloten pro Flug. Technik: ${n1(P.STAFF.techPerAc)} Personen je Flugzeug.</p>`;
  const groups = SM.STAFF_GROUPS.filter((g) => st.pil[g] > 0);
  if (groups.length && new Set(pl.typesIntroduced.map((x) => P.AIRCRAFT_TYPES[x].group)).size > 1) {
    html += `<div class="card pad stack"><h3>Umschulung (Musterberechtigung)</h3><div class="row small"><select id="tr-from" style="width:auto">${groups.map((g) => `<option value="${g}">${P.TYPE_GROUPS[g]} (${st.pil[g]})</option>`).join('')}</select> → <select id="tr-to" style="width:auto">${SM.STAFF_GROUPS.map((g) => `<option value="${g}">${P.TYPE_GROUPS[g]}</option>`).join('')}</select>
      <input type="number" id="tr-n" min="1" value="2" style="width:60px"><button class="btn small" data-act="train">Umschulen</button></div><span class="small muted">${P.STAFF.trainDays} Tage, ${eur(P.STAFF.trainCost * cpi())} je Pilot. Während der Schulung fliegen sie nicht, bekommen aber Gehalt.</span></div>`;
  }
  html += `<div class="stack"><h2 class="sec">Tarif und Stimmung</h2>
    <div class="row"><span class="small">Gehaltsniveau</span><div class="seg">${[0.9, 0.95, 1, 1.05, 1.1, 1.2].map((v) => `<button data-act="payrel" data-v="${v}" aria-pressed="${Math.abs((st.payRel ?? st.pay / wageNow()) - v) < 0.004}">${v === 1 ? 'Markt' : (v > 1 ? '+' : '−') + n0(Math.abs(v - 1) * 100) + ' %'}</button>`).join('')}</div>${![0.9, 0.95, 1, 1.05, 1.1, 1.2].some((v) => Math.abs((st.payRel ?? st.pay / wageNow()) - v) < 0.004) ? `<span class="chip ${st.pay < wageNow() ? 'crit' : ''}">aktuell ${pct(st.pay / wageNow() - 1).replace(/^(?!-|−)/, '+')} zum Markt</span>` : ''}</div>
    <div class="lfrow" style="grid-template-columns:70px 1fr 48px"><span>Stimmung</span><div class="bar"><i class="${st.morale < 0.5 ? 'crit' : 'me'}" style="width:${(st.morale * 100).toFixed(0)}%"></i><span class="tgt" style="left:55%"></span></div><span class="num">${pct(st.morale)}</span></div>
    <p class="small muted">Die Stimmung folgt dem Gehalt und der Arbeitslast. Unter etwa 55 % steigen Kündigungen und das Streikrisiko. Eine Personalfachkraft hebt die Stimmung und beschleunigt Einstellungen.</p>
    <label class="chk"><input type="checkbox" id="agency" ${st.agency ? 'checked' : ''}> Lücken mit Agenturpersonal füllen (1,6-facher Stundensatz). Aus: Flüge ohne Crew fallen aus.</label></div>`;
  html += laborHtml() + academyHtml() + poachHtml();
  // Fachkräfte
  const tm = SM.expertTeam(pl);
  html += `<div class="stack"><h2 class="sec">Fachkräfte und Berater <small>${pl.experts.length} angestellt · Führungsspanne ${tm.cap}</small></h2>
    <div class="callout ${tm.over ? 'warn' : 'info'}"><span class="small">${tm.over ? `<b>Überbesetzt:</b> ${tm.n} Fachkräfte bei ${pl.fleet.length} Flugzeugen – sinnvoll sind ${tm.cap}. Alle wirken ${pct(1 - tm.eff)} schwächer (Abstimmung, Kompetenzgerangel), und Unterforderte kündigen eher.` : `<b>Führungsspanne:</b> Bei ${pl.fleet.length} Flugzeugen kann Ihre Airline ${tm.cap} Fachkräfte sinnvoll einbinden (jetzt ${tm.n}).`} Je ${P.EXPERT_TEAM.perAc} Flugzeuge kommt eine Person dazu. Darüber verlangen Bewerbungen ${pct(P.EXPERT_TEAM.salaryX)} mehr Gehalt je zusätzlicher Person, ab ${P.EXPERT_TEAM.refuseAt} über der Spanne sagen sie ab.</span></div>`;
  html += pl.experts.length ? pl.experts.map((e) => `<div class="card pad stack"><div class="spread"><b>${esc(e.name)}</b><span class="chip me">${P.EXPERT_ROLES[e.role].label} · ${LEVEL[e.level]}</span></div>
      <div class="small ink2">Zusage: ${esc(P.EXPERT_ROLES[e.role].effect[e.level - 1])}</div>
      ${e.note ? `<div class="small named-note">★ ${esc(e.grow && e.level >= e.grow.to ? 'Hat sich vom Junior zum Senior entwickelt.' : e.note)}${e.grow && e.level < e.grow.to ? ` Noch ${Math.max(0, e.grow.days - (W.day - (e.hiredDay ?? W.day)))} Tage.` : ''}</div>` : ''}
      ${expertPerfHtml(e)}
      ${expertContractHtml(e)}
      <div class="spread small muted"><span>${e.years} Jahre Erfahrung, ${esc(e.prev)}, Schwerpunkt ${esc(e.region)}${refsTxt(e)}</span><span>${eur(e.salary * cpi())}/Monat <button class="btn small" data-act="fireexpert" data-id="${e.id}">Freistellen</button></span></div></div>`).join('')
    : '<p class="small muted">Noch niemand. Fachkräfte wirken nach rund 30 Tagen Einarbeitung voll – wie gut genau, zeigt die monatliche Bewertung. Jede Rolle kann einmal besetzt werden (Marktanalyse zweimal).</p>';
  { const taken = SM.P.STAR_CONSULTANTS.map((S) => [S, W.starHolder(S.id)]).filter(([, h]) => h && h.id !== pl.id);
    if (taken.length) html += `<p class="small muted">${taken.map(([S, h]) => `${esc(S.name)} arbeitet gerade für ${esc(h.name)}.`).join(' ')} Wer ihn freistellt oder verliert, gibt ihn wieder frei.</p>`; }
  html += `<h3>Bewerbungen</h3>${W.candidates.filter((c) => c.expires > W.day).sort((a, b) => (P.EXPERT_ROLES[b.role].unique ? 2 : b.named ? 1 : 0) - (P.EXPERT_ROLES[a.role].unique ? 2 : a.named ? 1 : 0) || a.role.localeCompare(b.role) || b.level - a.level).map((c) => {
    const taken = pl.experts.filter((e) => e.role === c.role).length >= P.EXPERT_ROLES[c.role].max, of = SM.expertOffer(pl, c.salary);
    return `<div class="cand${c.named ? ' named' : ''}"><div class="spread"><b>${esc(c.name)}${c.named ? ' <span class="chip good">bekannt in der Branche</span>' : ''}</b><span class="chip">${P.EXPERT_ROLES[c.role].label} · ${LEVEL[c.level]}</span></div>
      <div class="small ink2">${esc(P.EXPERT_ROLES[c.role].effect[c.level - 1])}</div>
      ${c.note ? `<div class="small named-note">★ ${esc(c.note)}</div>` : ''}
      ${c.refs && c.refs.length ? `<div class="small">Referenz: ${c.refs.map((x) => `<b class="${x.perf >= 1 ? 'pos' : x.perf < 0.85 ? 'neg' : ''}">${pct(x.perf)}</b> der Zusage bei ${esc(x.airline)}${x.months ? ` (${x.months} Mon.)` : ''}`).join(' · ')} <span class="muted">– bei einem neuen Arbeitgeber kann es anders laufen</span></div>` : ''}
      <div class="spread small"><span class="muted">${c.years} Jahre, ${esc(c.trait)}, ${esc(c.prev)} · kennt ${esc(c.region)} · ${P.EXPERT_ROLES[c.role].unique ? `einmalig in der Welt – verfügbar, bis jemand zugreift · Antrittshonorar ${eur(P.EXPERT_ROLES[c.role].signOn)}` : 'bis ' + dateShort(c.expires)}</span>
        <span><b class="mono">${eur(c.salary * (of.ok ? of.x : 1))}</b>/Mon.${of.ok && of.x > 1 ? ` <span class="small warnc" title="Ihr Führungsteam ist schon groß – die Person verlangt mehr">(+${pct(of.x - 1)})</span>` : ''} <button class="btn small${taken || !of.ok ? '' : ' primary'}" data-act="hireexpert" data-id="${c.id}" ${taken ? 'disabled title="Rolle besetzt"' : !of.ok ? `disabled title="${esc(of.msg)}"` : ''}>${!of.ok && !taken ? 'Sagt ab' : 'Einstellen'}</button></span></div>${!of.ok && !taken ? `<div class="small muted">${esc(of.msg)}</div>` : ''}</div>`;
  }).join('')}<p class="small muted">Neue Bewerbungen kommen zum Monatswechsel. Wer eine Region kennt, liefert dort Marktstudien schneller und genauer. Der Lebenslauf ist ein Versprechen: Wie gut jemand bei Ihnen wirklich arbeitet, zeigt sich erst nach der Einarbeitung – mal unter, mal über der Zusage. Wer freigestellt wird, sucht neu und bringt die Bewertung als Referenz mit.</p></div>`;
  return html;
};

/** Ist-Leistung gegenüber der Zusage (Anteil in %), mit Balken. */
function expertPerfHtml(e) {
  if (e.startDay && e.startDay > W.day) return `<div class="small warnc">Beginnt am ${dateShort(e.startDay)} (Wettbewerbsverbot beim bisherigen Arbeitgeber).</div>`;
  const uniq = P.EXPERT_ROLES[e.role].unique, now = SM.expertPerf(e, W.day);
  if (e.ps === null || e.ps === undefined) return `<div class="small muted">Leistung: noch keine Bewertung – Einarbeitung, derzeit etwa ${pct(Math.min(1, now))} Wirkung. Die erste Bewertung kommt zum Monatswechsel.</div>`;
  const v = e.ps, cls = v >= 1.02 ? 'good' : v < 0.85 ? 'crit' : 'me', last = e.pm !== undefined && e.perf ? e.pm / e.perf : 1;
  const tag = v >= 1.15 ? 'übertrifft die Zusage deutlich' : v >= 1.02 ? 'übertrifft die Zusage' : v >= 0.93 ? 'hält, was versprochen wurde' : v >= 0.8 ? 'bleibt etwas hinter der Zusage' : 'bleibt klar hinter der Zusage';
  return `<div class="lfrow perf" style="grid-template-columns:92px 1fr 52px" title="Gleitender Schnitt der Monatsleistung, gemessen an der zugesagten Wirkung (100 %)"><span class="small">Ist / Zusage</span><div class="bar"><i class="${cls}" style="width:${Math.min(100, v / 1.4 * 100).toFixed(0)}%"></i><span class="tgt" style="left:${(100 / 1.4).toFixed(1)}%"></span></div><b class="num ${v >= 1 ? 'pos' : v < 0.85 ? 'neg' : ''}">${pct(v)}</b></div>
    <div class="small muted">${tag}${uniq ? '' : last < 0.6 ? ' · letzter Monat ein Fehlgriff' : last > 1.2 ? ' · letzter Monat ein Glücksgriff' : ''} · ${e.psN || 0} Monat${(e.psN || 0) === 1 ? '' : 'e'} bewertet</div>`;
}
const refsTxt = (e) => (e.refs && e.refs.length ? ` · vorher ${e.refs.map((x) => `${pct(x.perf)} bei ${esc(x.airline)}`).join(', ')}` : '');
function expertContractHtml(e) {
  if (P.EXPERT_ROLES[e.role].unique) return '';
  const C = P.EXPERT_CONTRACT, sh = W.poachShield(e, W.day), lvl = sh < 0.35 ? ['hoch', 'pos'] : sh < 0.75 ? ['mittel', ''] : ['gering', 'neg'];
  const bound = e.bindUntil > W.day;
  return `<div class="row small" style="gap:6px;flex-wrap:wrap"><span class="muted">Schutz vor Abwerbung: <b class="${lvl[1]}">${lvl[0]}</b></span>
    ${bound ? `<span class="chip good">gebunden bis ${dateShort(e.bindUntil)}</span>` : `<button class="btn small" data-act="exc" data-k="bind" data-id="${e.id}" title="Einmalig ${C.bindCost} Monatsgehälter. Zwölf Monate Bindung mit Kündigungsschutz: Abwerbung gelingt nur noch selten.">Halteprämie ${eur(e.salary * C.bindCost)}</button>`}
    <label class="chk" title="Wettbewerbsverbot: +${Math.round(C.ncaSalary * 100)} % Gehalt als Karenzausgleich. Wer abwirbt, zahlt ${C.ncaComp} Monatsgehälter Ablöse an Sie, und die Person darf erst nach ${C.ncaWait} Tagen anfangen."><input type="checkbox" data-exnca="${e.id}" ${e.nca ? 'checked' : ''}> Wettbewerbsverbot</label>
    <button class="btn small" data-act="exc" data-k="raise" data-v="0.1" data-id="${e.id}" title="Gehalt über Markt macht Abwerbung schwerer (bis 30 % über Markt).">Gehalt +10 %</button></div>`;
}
// ---------- Stationen ----------
// ---------- 0.21.56: Cargo – Frachtsparte mit eigenen Frachtern ----------
const CG_TYPES = () => Object.keys(P.AIRCRAFT_TYPES).filter((t) => SM.isFreighter(t));
const tKg = (kg) => `${NF1.format(kg / 1000)} t`;
/** Kennzahlen einer Frachtstrecke aus den letzten Tagen. hist: [Tag, Umläufe, kg hin, kg zurück, Kapazität je Richtung, Erlös, Kosten, Bedarf, Ausfälle] */
function cgStats(al, q, days = 30) {
  const h = (q.hist || []).slice(-days), n = h.length || 1, nAc = al.fleet.filter((a) => a.cg === q.id).length;
  const kg = h.reduce((x, e) => x + e[2] + e[3], 0), cap = h.reduce((x, e) => x + 2 * e[4], 0), rev = h.reduce((x, e) => x + e[5], 0), cost = h.reduce((x, e) => x + e[6], 0), fl = h.reduce((x, e) => x + e[1], 0), cx = h.reduce((x, e) => x + (e[8] || 0), 0);
  const fixed = SM.aircraftDayFixedGeneric(q.type_id) * nAc * cpi();
  return { days: h.length, nAc, kgDay: kg / n, lf: cap ? kg / cap : 0, revDay: rev / n, costDay: cost / n, fixed, resDay: (rev - cost) / n - fixed, fl, cx, rateKg: SM.freightRef(q.base, q.dest) * (q.rate || 1) * cpi() };
}
function cgFreeAt(pl, base, type) { return pl.fleet.filter((a) => a.type_id === type && a.base === base && !a.cg && !SM.acmiList(a, W.day).length); }
const rateSeg = (act, cur, extra = '') => `<div class="seg wrap">${[0.7, 0.85, 1, 1.15, 1.3].map((v) => `<button data-act="${act}" data-v="${v}"${extra} aria-pressed="${Math.abs((cur || 1) - v) < 0.001}">${n0(v * 100)} %</button>`).join('')}</div>`;
const freqStep = (act, f, extra = '') => `<div class="row" style="gap:8px;align-items:center"><button class="btn small" data-act="${act}" data-v="-1"${extra} ${f <= 1 ? 'disabled' : ''} aria-label="Weniger">−</button><b class="mono">${f}× pro Woche</b><button class="btn small" data-act="${act}" data-v="1"${extra} ${f >= P.FREIGHT.maxWeek ? 'disabled' : ''} aria-label="Mehr">+</button></div>`;
/** Eine Zeile als Karte (passt auf jede Breite): Titel, Unterzeile, Kennzahlen, Knopf rechts. */
const cgRow = (title, sub, vals, act = '', cls = '') => `<div class="cgr ${cls}"><div class="cgt"><b>${title}</b>${sub ? ` <span class="m">${sub}</span>` : ''}</div>${act ? `<div class="act">${act}</div>` : ''}<div class="v">${vals.filter(Boolean).map((v) => `<span>${v}</span>`).join('')}</div></div>`;
VIEWS.cargo = function viewCargo() {
  const pl = W.player, qs = pl.cgRoutes(), frs = pl.fleet.filter((a) => SM.isFreighter(a.type_id));
  let html = '<div class="stack">';
  if (!qs.length) html += `<div class="callout info stack"><b>Frachtsparte</b><span>Mit eigenen Frachtern fliegen Sie feste Frachtstrecken – getrennt von der Fracht, die in Ihren Passagierflügen mitfliegt. Jede Strecke hat ihren eigenen Frachtbedarf und eine Marktrate je Kilo. Andere Airlines (auch die KI) können ebenfalls Frachtsparten eröffnen und auf denselben Strecken konkurrieren.</span>
    <span class="small">So geht es: 1. Cargo → Neue Frachtstrecke zeigt, welche Strecke sich mit welchem Frachter ab Ihren Basen lohnt · 2. Frachter beschaffen (Flotte → Beschaffung: ATR 72-600F, A321P2F, 767-300F, 777F) · 3. Strecke eröffnen und hier Auslastung und Ergebnis verfolgen.</span>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small primary" data-act="tab" data-tab="cargoNew">Ziele finden</button><button class="btn small" data-act="cgbuy">Frachter beschaffen</button></div></div>`;
  const st = qs.map((q) => [q, cgStats(pl, q)]), tot = st.reduce((a, [, x]) => ({ kg: a.kg + x.kgDay, rev: a.rev + x.revDay, res: a.res + (x.days ? x.resDay : 0), cap: a.cap + (x.lf ? x.kgDay / x.lf : 0) }), { kg: 0, rev: 0, res: 0, cap: 0 });
  html += `<div class="tiles"><div class="tile"><span>Frachtstrecken</span><b>${qs.length}</b><em>${qs.filter((q) => q.opened_day > W.day).length ? `${qs.filter((q) => q.opened_day > W.day).length} starten bald` : 'in Betrieb'}</em></div>
    <div class="tile"><span>Frachter</span><b>${frs.filter((a) => a.cg).length} / ${frs.length}</b><em>auf Frachtstrecken / gesamt</em></div>
    <div class="tile"><span>Fracht</span><b>${tKg(tot.kg)}</b><em>pro Tag, beide Richtungen (30 Tage)</em></div>
    <div class="tile"><span>Auslastung</span><b>${tot.cap ? pct(tot.kg / tot.cap) : '–'}</b><em>Nutzlast der geflogenen Frachter</em></div>
    <div class="tile"><span>Umsatz</span><b>${eur(tot.rev)}</b><em>pro Tag</em></div>
    <div class="tile"><span>Ergebnis</span><b class="${sgn(tot.res)}">${eur(tot.res, { plus: true })}</b><em>pro Tag, nach Frachterkosten</em></div></div>`;
  if (qs.length) html += `<div class="cgl">${st.map(([q, x]) => {
    const t = P.AIRCRAFT_TYPES[q.type_id], ed = ui.cgEdit && ui.cgEdit.id === q.id;
    let row = cgRow(`${q.base}–${q.dest}`, `${esc(apName(q.dest))} · ${n0(SM.gcDistanceKm(q.base, q.dest))} km · ${x.nAc}× ${esc(t.label)}`,
      [`${q.freq}× pro Woche`, `${NF2.format(x.rateKg)} €/kg (${n0((q.rate || 1) * 100)} %)`, q.opened_day > W.day ? `startet ${dateShort(q.opened_day)}` : `Fracht ${tKg(x.kgDay)}/Tag`, x.days ? `Auslastung ${pct(x.lf)}` : '', x.days ? `<b class="${sgn(x.resDay)}">${eur(x.resDay, { plus: true })}/Tag</b>` : ''],
      `<button class="btn small" data-act="cgedit" data-id="${q.id}">${ed ? 'Zuklappen' : 'Ändern'}</button>`, ed ? 'sel' : '');
    if (ed) {
      const e = ui.cgEdit, qt = W.freightQuote(pl, q.base, q.dest, q.type_id, e.freq, e.rate, q.id), have = x.nAc, free = cgFreeAt(pl, q.base, q.type_id).length, bf = W.freightBest(pl, q.base, q.dest, q.type_id, e.rate, q.id);
      row += `<div class="card pad stack" style="gap:10px">
        <div class="stack" style="gap:6px"><span class="small muted">Umläufe pro Woche (je Umlauf hin und zurück)</span>${freqStep('cgefreq', e.freq)}<span class="small ${qt.need > have + free ? 'neg' : 'muted'}">braucht ${qt.need} Frachter – ${have} im Einsatz, ${free} frei in ${q.base}${bf && bf.freq !== e.freq ? ` · bestes Ergebnis mit ${bf.freq}× pro Woche (${eur(bf.res, { plus: true })}/Tag)` : ''}</span></div>
        <div class="stack" style="gap:6px"><span class="small muted">Rate gegenüber Markt (${NF2.format(SM.freightRef(q.base, q.dest) * cpi())} €/kg)</span>${rateSeg('cgerate', e.rate)}</div>
        <div class="small">Prognose: <b>${tKg(2 * qt.kg)}</b> Fracht pro Tag (Auslastung ${pct(qt.lf)}), Umsatz ${eur(qt.rev)}, Flug- und Frachtkosten ${eur(qt.flightCost + qt.cargoCost)}, Frachterkosten ${eur(qt.fixed)} → <b class="${sgn(qt.res)}">${eur(qt.res, { plus: true })} pro Tag</b>${qt.rivals ? ` · ${qt.rivals} Konkurrent${qt.rivals > 1 ? 'en' : ''} mit ${tKg(qt.comp)} pro Tag` : ' · keine Konkurrenz'}</div>
        <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small primary" data-act="cgsave" data-id="${q.id}">Übernehmen</button>${ui.confirm === 'cgclose:' + q.id ? `<button class="btn small danger" data-act="cgclose" data-id="${q.id}">Ja, Strecke schließen</button><button class="btn small" data-act="cancelconfirm">Abbrechen</button>` : `<button class="btn small danger" data-act="cgaskclose" data-id="${q.id}">Strecke schließen</button>`}</div></div>`;
    }
    return row; }).join('')}</div>`;
  const idle = frs.filter((a) => !a.cg && a.delivery_day <= W.day && !SM.acmiList(a, W.day).length);
  if (idle.length) html += `<div class="callout warn"><span><b>${idle.length} Frachter ohne Einsatz:</b> ${idle.slice(0, 6).map((a) => `${acName(a.id)} (${a.type_id}, ${a.base})`).join(', ')}. Sie kosten jeden Tag Leasing oder Abschreibung – auf eine Frachtstrecke setzen (Neue Frachtstrecke) oder Charteraufträge annehmen.</span></div>`;
  html += `<p class="small muted">Beiladefracht in Passagierflügen läuft getrennt davon (${pl.cargo ? 'eingeschaltet' : 'ausgeschaltet'} – Karte → Strategie). Frachter auf Frachtstrecken nehmen keine Charteraufträge an.</p>`;
  return html + '</div>';
};
/** Beste Frachtstrecken ab allen eigenen Basen (je Muster die 10 Ziele mit dem größten Potenzial, beste Frequenz). Einmal pro Spieltag gerechnet. */
function cgBestAll(pl, rate) {
  const key = `${W.day}|${rate}|${pl.bases.join()}|${pl.fleet.filter((a) => SM.isFreighter(a.type_id) && !a.cg).length}|${pl.cgRoutes().length}`;
  if (ui._cgBest && ui._cgBest.key === key) return ui._cgBest.list;
  const out = [];
  for (const base of pl.bases) for (const t of CG_TYPES()) {
    const cands = SM.AP_CODES.filter((c) => c !== base && SM.rangeOk(base, c, t) && !pl.cgRoutes().some((x) => x.type_id === t && [x.base, x.dest].sort().join() === [base, c].sort().join())).map((c) => [c, SM.freightDemand(base, c) * SM.freightRef(base, c)]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [c] of cands) { const q = W.freightBest(pl, base, c, t, rate); if (q && q.res > 0) out.push(q); }
  }
  out.sort((a, b) => b.res - a.res);
  ui._cgBest = { key, list: out }; return out;
}
VIEWS.cargoNew = function viewCargoNew() {
  const pl = W.player, F = ui.cgNew = ui.cgNew || { base: pl.bases[0], type: null, rate: 1 };
  if (!pl.bases.includes(F.base)) F.base = pl.bases[0];
  const types = CG_TYPES();
  if (!F.type) { const own = pl.fleet.find((a) => SM.isFreighter(a.type_id) && a.base === F.base && !a.cg); F.type = own ? own.type_id : 'A21F'; }
  const t = P.AIRCRAFT_TYPES[F.type], free = cgFreeAt(pl, F.base, F.type).length;
  const openBtn = (q, primary) => { const fr = cgFreeAt(pl, q.base, q.typeId).length; return fr >= q.need ? `<button class="btn small${primary ? ' primary' : ''}" data-act="cgopen" data-b="${q.base}" data-v="${q.dest}" data-t="${q.typeId}" data-f="${q.freq}">Eröffnen</button>` : `<button class="btn small" data-act="tab" data-tab="fleetBuy" title="${q.need} ${esc(P.AIRCRAFT_TYPES[q.typeId].label)} in ${q.base} nötig, frei: ${fr}">Frachter fehlt</button>`; };
  const qRow = (q, withType) => { const chk = W.cgCheck(pl, q.base, q.dest, q.typeId, q.freq), planned = ((pl.cg && pl.cg.plans) || []).some((x) => x.type_id === q.typeId && [x.base, x.dest].sort().join() === [q.base, q.dest].sort().join());
    return cgRow(`${withType ? `${q.base} → ` : ''}${q.dest} <span class="m">${esc(apName(q.dest))}</span>`, `${n0(q.km)} km${withType ? ` · ${esc(P.AIRCRAFT_TYPES[q.typeId].label)}` : ''} · Bedarf ${tKg(2 * q.dem)}/Tag${q.rivals ? ` · Konkurrenz ${tKg(2 * q.comp / P.FREIGHT.loadMax)}` : ''}`,
    [`<b>${q.freq}× pro Woche</b> (${q.need} Frachter)`, `${NF2.format(q.rateKg)} €/kg`, `Fracht ${tKg(2 * q.kg)}/Tag`, `Auslastung ${pct(q.lf)}`, `<b class="${sgn(q.res)}">${eur(q.res, { plus: true })}/Tag</b>${q.rev > 0 ? ` <span class="m">(${pct(q.margin)} Marge)</span>` : ''}`, cgReqHtml(chk)],
      `<div class="row" style="gap:6px;justify-content:flex-end;flex-wrap:wrap">${chk.ok ? `<button class="btn small${q.res > 0 ? ' primary' : ''}" data-act="cgopen" data-b="${q.base}" data-v="${q.dest}" data-t="${q.typeId}" data-f="${q.freq}">Eröffnen</button>` : ''}${planned ? '<span class="chip">in Planung</span>' : `<button class="btn small${!chk.ok && q.res > 0 ? ' primary' : ''}" data-act="cgplan" data-b="${q.base}" data-v="${q.dest}" data-t="${q.typeId}" data-f="${q.freq}">Planen</button>`}</div>`, q.res > 0 ? '' : 'weak'); };
  const best = cgBestAll(pl, F.rate).slice(0, 5);
  let html = '<div class="stack">';
  html += `<div class="card pad stack"><h3 style="margin:0">Lohnt sich am meisten</h3><p class="small muted">Über alle Ihre Basen und alle Frachter, jeweils mit der besten Frequenz. Bedarf, Fracht und Auslastung zählen beide Richtungen. Fehlt der Frachter, führt der Knopf zur Beschaffung.</p>
    ${best.length ? `<div class="cgl">${best.map((q) => qRow(q, true)).join('')}</div>` : '<p class="small">Ab Ihren Basen rechnet sich derzeit keine Frachtstrecke – zu wenig Frachtbedarf oder zu viel Konkurrenz. Große Drehkreuze (z. B. FRA, LHR, CDG, AMS, IST, DXB) haben den meisten Bedarf.</p>'}</div>`;
  html += `<div class="card pad stack"><h3 style="margin:0">Selbst wählen</h3>
    <div class="stack" style="gap:6px"><span class="small muted">Basis</span><div class="seg wrap">${pl.bases.map((b) => `<button data-act="cgnbase" data-v="${b}" aria-pressed="${b === F.base}">${b}</button>`).join('')}</div></div>
    <div class="stack" style="gap:6px"><span class="small muted">Frachter</span><div class="seg wrap">${types.map((k) => { const n = cgFreeAt(pl, F.base, k).length; return `<button data-act="cgntype" data-v="${k}" aria-pressed="${k === F.type}">${esc(P.AIRCRAFT_TYPES[k].label)} <span class="small muted">${n0(P.AIRCRAFT_TYPES[k].cargo_kg / 1000)} t${n ? ` · ${n} frei` : ''}</span></button>`; }).join('')}</div>
      <span class="small muted">${esc(t.label)}: ${n0(t.cargo_kg / 1000)} t Nutzlast, ${n0(t.range_km)} km Reichweite · in ${F.base} frei: <b>${free}</b>${free ? '' : ' – <a href="#" data-act="cgbuy">Frachter beschaffen</a>'}</span></div>
    <div class="stack" style="gap:6px"><span class="small muted">Rate gegenüber Markt</span>${rateSeg('cgnrate', F.rate)}</div></div>`;
  const all = SM.AP_CODES.filter((c) => c !== F.base && SM.rangeOk(F.base, c, F.type) && !pl.cgRoutes().some((x) => x.type_id === F.type && [x.base, x.dest].sort().join() === [F.base, c].sort().join())).map((c) => [c, SM.freightDemand(F.base, c) * SM.freightRef(F.base, c)]).sort((a, b) => b[1] - a[1]).slice(0, 30);
  const quotes = all.map(([c]) => W.freightBest(pl, F.base, c, F.type, F.rate)).filter(Boolean).sort((a, b) => b.res - a.res);
  const shown = ui.showAll && ui.showAll.cgdest ? quotes : quotes.slice(0, 10), pos = quotes.filter((q) => q.res > 0).length;
  html += `<div class="card pad stack"><h3 style="margin:0">Ziele ab ${F.base} mit ${esc(t.label)}</h3>
    ${pos ? `<p class="small muted">${pos} Ziel${pos > 1 ? 'e rechnen' : ' rechnet'} sich. Je Ziel mit der Frequenz, die das beste Ergebnis bringt; ändern können Sie sie nach der Eröffnung im Frachtnetz.</p>` : `<div class="callout warn"><span>Mit der ${esc(t.label)} rechnet sich ab ${F.base} kein Ziel – der Frachtbedarf reicht für diesen Frachter nicht. ${best.length ? `Besser: ${esc(P.AIRCRAFT_TYPES[best[0].typeId].label)} ab ${best[0].base} nach ${best[0].dest} (${eur(best[0].res, { plus: true })}/Tag).` : 'Ein kleinerer Frachter oder ein großes Drehkreuz als Basis hilft.'}</span></div>`}
    <div class="cgl">${shown.map((q) => qRow(q, false)).join('')}</div>
    ${quotes.length > 10 ? listMore('cgdest', quotes.length, 10) : ''}
    <p class="small muted">Prognose ohne Zufall, mit der heutigen Konkurrenz; Fracht und Auslastung für beide Richtungen, Ergebnis nach Flug-, Fracht- und Frachterkosten. Slots braucht es an beiden Flughäfen, der erste Flug startet ${P.FREIGHT.lead} Tage nach der Eröffnung. Eine Rate unter 100 % zieht Fracht von der Konkurrenz ab, über 100 % bringt mehr je Kilo, aber weniger Fracht.</p></div>`;
  return html + '</div>';
};
/** 0.21.60: Voraussetzungen als Chips (grün erfüllt, rot fehlt). */
function cgReqHtml(chk) {
  const ok = (t) => `<span class="chip good">✓ ${t}</span>`, no = (t) => `<span class="chip bad">✗ ${t}</span>`, out = [];
  if (!chk.isBase) out.push(no('keine eigene Basis'));
  if (!chk.range) out.push(no('Reichweite reicht nicht')); else if (!chk.apt) out.push(no(esc(chk.aptWhy || 'Startbahn zu kurz')));
  out.push(chk.free >= chk.need ? ok(`${chk.need} Frachter frei`) : no(`${chk.missing} ${esc(chk.typeLabel)} fehl${chk.missing > 1 ? 'en' : 't'}${chk.other ? ` (${chk.other} frei an anderer Basis)` : ''}`));
  out.push(!chk.slots.ok ? no(`keine Slots frei in ${chk.slots.short.join(' und ')}`) : chk.slots.cost > 0 ? `<span class="chip ${chk.cash ? 'warn' : 'bad'}">${chk.cash ? '!' : '✗'} ${chk.slots.parts.map((x) => `${x.n} Slot${x.n > 1 ? 's' : ''} ${x.apt}`).join(', ')} kaufen: ${eur(chk.slots.cost)}</span>` : ok(`Slots frei (${chk.slots.n} pro Tag)`));
  if (chk.dup) out.push(no('fliegen Sie schon'));
  return `<span class="cgreq">${out.join('')}</span>`;
}
VIEWS.cargoPlan = function viewCargoPlan() {
  const pl = W.player, plans = (pl.cg && pl.cg.plans) || [];
  let html = '<div class="stack">';
  if (!plans.length) return html + `<div class="callout info stack"><b>Frachtplanung</b><span>Merken Sie hier Frachtstrecken vor – auch bevor Sie Frachter oder Slots haben. Die Planung zeigt, was fehlt, was es kostet und was die Strecken bringen würden. Sobald alles erfüllt ist, eröffnen Sie mit einem Klick.</span><div class="row"><button class="btn small primary" data-act="tab" data-tab="cargoNew">Ziele finden</button></div></div></div>`;
  const rows = plans.map((x) => ({ x, q: W.freightQuote(pl, x.base, x.dest, x.type_id, x.freq, x.rate), chk: W.cgCheck(pl, x.base, x.dest, x.type_id, x.freq) }));
  // Bedarf an Frachtern je Muster und Basis über die ganze Planung
  const need = {}; for (const { x, chk } of rows) { const k = `${x.type_id}|${x.base}`; const e = need[k] || (need[k] = { t: x.type_id, b: x.base, n: 0, free: chk.free }); e.n += chk.need; }
  const sum = rows.reduce((a, { q, chk }) => ({ res: a.res + q.res, rev: a.rev + q.rev, slot: a.slot + (chk.slots.ok ? chk.slots.cost : 0) }), { res: 0, rev: 0, slot: 0 }), ready = rows.filter((r) => r.chk.ok).length;
  html += `<div class="tiles"><div class="tile"><span>Geplant</span><b>${plans.length}</b><em>${ready} sofort startklar</em></div><div class="tile"><span>Umsatz</span><b>${eur(sum.rev)}</b><em>pro Tag, wenn alle fliegen</em></div><div class="tile"><span>Ergebnis</span><b class="${sgn(sum.res)}">${eur(sum.res, { plus: true })}</b><em>pro Tag, nach Frachterkosten</em></div><div class="tile"><span>Slots kaufen</span><b>${eur(sum.slot)}</b><em>einmalig</em></div></div>`;
  html += `<div class="card pad stack"><h3 style="margin:0">Frachter für die Planung</h3><div class="cgl">${Object.values(need).map((e) => { const miss = Math.max(0, e.n - e.free), t = P.AIRCRAFT_TYPES[e.t]; return cgRow(`${esc(t.label)} in ${e.b}`, `${n0(t.cargo_kg / 1000)} t Nutzlast`, [`${e.n} nötig`, `${e.free} frei`, miss ? `<b class="neg">${miss} fehl${miss > 1 ? 'en' : 't'}</b>` : '<b class="pos">genug</b>', miss ? `Leasing etwa ${eur(t.lease_month * cpi() * miss)} pro Monat` : ''], miss ? `<button class="btn small primary" data-act="cgbuy">Beschaffen</button>` : ''); }).join('')}</div></div>`;
  html += `<div class="cgl">${rows.map(({ x, q, chk }) => cgRow(`${x.base}–${x.dest} <span class="m">${esc(apName(x.dest))}</span>`, `${n0(q.km)} km · ${esc(P.AIRCRAFT_TYPES[x.type_id].label)} · geplant am ${dateShort(x.added)}`,
    [`${freqStep('cgpfreq', x.freq, ` data-id="${x.id}"`)}`, `Fracht ${tKg(2 * q.kg)}/Tag (${pct(q.lf)})`, `${NF2.format(q.rateKg)} €/kg`, `<b class="${sgn(q.res)}">${eur(q.res, { plus: true })}/Tag</b>`, cgReqHtml(chk)],
    `<div class="row" style="gap:6px;justify-content:flex-end;flex-wrap:wrap">${chk.ok ? `<button class="btn small primary" data-act="cgopen" data-b="${x.base}" data-v="${x.dest}" data-t="${x.type_id}" data-f="${x.freq}">Eröffnen</button>` : chk.missing ? '<button class="btn small" data-act="cgbuy">Frachter beschaffen</button>' : ''}<button class="btn small ghost" data-act="cgplandel" data-id="${x.id}" aria-label="Aus der Planung entfernen">Entfernen</button></div>`, chk.ok ? 'sel' : '')).join('')}</div>`;
  html += `<p class="small muted">Prognose mit der heutigen Konkurrenz. Slotpreise und freie Frachter ändern sich – die Häkchen zeigen den Stand von heute.</p>`;
  return html + '</div>';
};
/** 0.21.76: Streckenvorschlag für einen Frachter – sucht über alle eigenen Basen die besten Ziele für sein Muster,
 * jeweils mit der besten Frequenz, die dieser eine Frachter allein fliegen kann. Andere Basis = vorher verlegen. */
function cgSuggest(pl, a) {
  const key = `${W.day}|${a.id}|${a.base}|${pl.bases.join()}|${pl.cgRoutes().length}`;
  if (ui._cgSug && ui._cgSug.key === key) return ui._cgSug.list;
  const t = a.type_id, out = [];
  for (const base of pl.bases) {
    const cands = SM.AP_CODES.filter((c) => c !== base && SM.rangeOk(base, c, t) && !pl.cgRoutes().some((x) => x.type_id === t && [x.base, x.dest].sort().join() === [base, c].sort().join()))
      .map((c) => [c, SM.freightDemand(base, c) * SM.freightRef(base, c)]).sort((x, y) => y[1] - x[1]).slice(0, 40);
    for (const [c] of cands) {
      let best = null;
      for (const f of [1, 2, 3, 4, 5, 7, 10, 14, 21, 28]) { if (f > P.FREIGHT.maxWeek) break; const q = W.freightQuote(pl, base, c, t, f, 1); if (q.need > 1) break; if (!best || q.res > best.res + 1) best = q; }
      if (best && best.res > 0) out.push(best);
    }
  }
  out.sort((x, y) => y.res - x.res);
  // machbare zuerst (Slots frei oder kaufbar, Flughafen geeignet), dann der Rest – jeweils nach Ergebnis
  const top = out.slice(0, 30).map((q) => { const c = W.cgCheck(pl, q.base, q.dest, q.typeId, q.freq); q._ok = c.slots.ok && c.apt ? 1 : 0; return q; });
  top.sort((x, y) => y._ok - x._ok || y.res - x.res); out.splice(0, top.length, ...top);
  const list = []; const perBase = {};
  for (const q of out) { if ((perBase[q.base] || 0) >= 3) continue; perBase[q.base] = (perBase[q.base] || 0) + 1; list.push(q); if (list.length >= 6) break; }
  ui._cgSug = { key, list }; return list;
}
function cgSuggestHtml(pl, a) {
  const t = P.AIRCRAFT_TYPES[a.type_id], list = cgSuggest(pl, a), mv = 12000 * cpi();
  const rows = list.map((q, i) => { const chk = W.cgCheck(pl, q.base, q.dest, q.typeId, q.freq), here = q.base === a.base;
    const slotChip = !chk.slots.ok ? `<span class="chip bad">✗ keine Slots frei in ${chk.slots.short.join(' und ')}</span>` : chk.slots.cost > 0 ? `<span class="chip warn">! Slots ${eur(chk.slots.cost)}</span>` : '<span class="chip good">✓ Slots frei</span>';
    const aptChip = chk.apt ? '' : `<span class="chip bad">✗ ${esc(chk.aptWhy || 'Startbahn zu kurz')}</span>`;
    const btn = !chk.slots.ok || !chk.apt ? '' : here ? `<button class="btn small${i === 0 ? ' primary' : ''}" data-act="cgopen" data-b="${q.base}" data-v="${q.dest}" data-t="${q.typeId}" data-f="${q.freq}">Eröffnen</button>`
      : `<button class="btn small${i === 0 ? ' primary' : ''}" data-act="cgsugopen" data-id="${a.id}" data-b="${q.base}" data-v="${q.dest}" data-t="${q.typeId}" data-f="${q.freq}" title="Verlegen kostet ${eur(mv)}">Nach ${q.base} verlegen und eröffnen</button>`;
    return cgRow(`${q.base} → ${q.dest} <span class="m">${esc(apName(q.dest))}</span>${here ? '' : ` <span class="chip">ab ${q.base} – verlegen</span>`}`, `${n0(q.km)} km · Bedarf ${tKg(2 * q.dem)}/Tag${q.rivals ? ` · Konkurrenz ${q.rivals}` : ' · keine Konkurrenz'}`,
      [`<b>${q.freq}× pro Woche</b>`, `Fracht ${tKg(2 * q.kg)}/Tag`, `Auslastung ${pct(q.lf)}`, `<b class="${sgn(q.res)}">${eur(q.res, { plus: true })}/Tag</b>`, `<span class="cgreq">${slotChip}${aptChip}</span>`], btn); }).join('');
  return `<div class="card pad stack cg-sug"><div class="spread"><h3 style="margin:0">Vorschläge für ${esc(acName(a.id))} <small>${esc(t.label)} · ${n0(t.cargo_kg / 1000)} t · ${n0(t.range_km)} km</small></h3><button class="btn small" data-act="cgsug" data-id="${a.id}">Schließen</button></div>
    <p class="small muted">Über alle Ihre Basen (${pl.bases.join(', ')}): die Ziele, die dieser Frachter allein am besten bedient – je Basis höchstens drei, mit der besten Frequenz für ein Flugzeug. Ab einer anderen Basis wird er vorher verlegt (${eur(mv)}).</p>
    ${rows ? `<div class="cgl">${rows}</div>` : `<div class="callout warn"><span>Mit der ${esc(t.label)} rechnet sich ab Ihren Basen gerade keine Frachtstrecke – zu wenig Frachtbedarf oder zu viel Konkurrenz. Eine Basis an einem großen Frachtdrehkreuz (FRA, LHR, CDG, AMS, DXB, HKG, MEM, LEJ) hilft.</span></div>`}
    <div class="row small"><a href="#" data-act="cgfind" data-b="${a.base}" data-t="${a.type_id}">Selbst Ziele ab ${a.base} durchsuchen ›</a></div></div>`;
}
VIEWS.cargoFleet = function viewCargoFleet() {
  const pl = W.player, frs = pl.fleet.filter((a) => SM.isFreighter(a.type_id)), qs = pl.cgRoutes();
  let html = `<div class="stack"><div class="row" style="gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center"><span class="small muted">${frs.length ? `${frs.length} Frachter · ${frs.filter((a) => a.cg).length} auf Frachtstrecken · ${frs.filter((a) => !a.cg && SM.acmiList(a, W.day).length).length} im Charter` : 'Noch keine Frachter in der Flotte.'}</span><button class="btn small primary" data-act="cgbuy">Frachter beschaffen</button></div>`;
  if (!frs.length) html += `<div class="callout info"><span>Frachter gibt es neu oder gebraucht unter Flotte → Beschaffung, Bereich „Frachter“: ATR 72-600F (9 t, Zubringer bis ~1.500 km), A321P2F (28 t, Mittelstrecke), 767-300F (52 t) und 777F (102 t, Langstrecke).</span></div>`;
  html += `<div class="cgl">${frs.map((a) => {
    const t = P.AIRCRAFT_TYPES[a.type_id], q = a.cg && qs.find((x) => x.id === a.cg), ch = SM.acmiList(a, W.day)[0];
    const st = a.delivery_day > W.day ? `<span class="chip">Auslieferung ${dateShort(a.delivery_day)}</span>` : a.status === 'ccheck' ? '<span class="chip warn">C-Check</span>' : a.status === 'aog' ? '<span class="chip bad">am Boden (AOG)</span>' : q ? `<span class="chip cgc">Fracht ${q.base}–${q.dest} · ${q.freq}× pro Woche</span>` : ch ? `<span class="chip">Charter bis ${dateShort(ch.end)}</span>` : '<span class="chip warn">ohne Einsatz</span>';
    const cost = a.owned ? `Eigentum · Buchwert ${eur(a.nbv || 0)}` : `Leasing ${eur((a.leaseMonth || t.lease_month) * 1)} pro Monat`;
    const act = q ? `<button class="btn small" data-act="tab" data-tab="cargo">Strecke</button>` : !ch && a.delivery_day <= W.day + 30 ? `<button class="btn small primary" data-act="cgsug" data-id="${a.id}" aria-expanded="${ui.cgSugFor === a.id}">${ui.cgSugFor === a.id ? 'Vorschlag schließen' : 'Strecke vorschlagen'}</button>` : '';
    return cgRow(`${acName(a.id)} <span class="m">${esc(t.label)}</span>`, `Basis ${a.base} · ${n0(t.cargo_kg / 1000)} t · ${cost}`, [st, a.fh ? `${n0(a.fh)} Flugstunden` : ''], act) + (ui.cgSugFor === a.id && !q ? cgSuggestHtml(pl, a) : '');
  }).join('')}</div></div>`;
  return html;
};
VIEWS.cargoMarket = function viewCargoMarket() {
  const rows = [], pairs = new Map();
  for (const al of W.list) { if (al.status === 'insolvent' || !al.cg) continue; const qs = al.cgRoutes(); if (!qs.length) continue;
    let kg = 0; for (const q of qs) { const x = cgStats(al, q); kg += x.kgDay; const k = [q.base, q.dest].sort().join('–'); const e = pairs.get(k) || { k, cap: 0, kg: 0, al: [] }; e.cap += W.cgCapDay(al, q) * 2; e.kg += x.kgDay; e.al.push(al); pairs.set(k, e); }
    rows.push({ al, n: qs.length, ac: al.fleet.filter((a) => a.cg).length, kg }); }
  rows.sort((a, b) => b.kg - a.kg);
  let html = `<div class="stack"><div class="card pad stack"><h3 style="margin:0">Frachtsparten im Markt</h3>${rows.length ? `<div class="tw"><table class="t"><thead><tr><th>Airline</th><th class="num">Strecken</th><th class="num">Frachter</th><th class="num">Fracht/Tag</th></tr></thead><tbody>${rows.map((x) => `<tr${x.al.id === W.playerId ? ' class="sel"' : ''}><td>${esc(x.al.name)}</td><td class="num">${x.n}</td><td class="num">${x.ac}</td><td class="num">${tKg(x.kg)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Noch hat keine Airline eine Frachtsparte. Wer zuerst kommt, hat die Strecken für sich.</p>'}</div>`;
  if (pairs.size) html += `<div class="card pad stack"><h3 style="margin:0">Beflogene Frachtstrecken</h3><div class="tw"><table class="t"><thead><tr><th>Strecke</th><th>Airlines</th><th class="num">Bedarf/Tag</th><th class="num">Kapazität/Tag</th><th class="num">Fracht/Tag</th></tr></thead><tbody>${[...pairs.values()].sort((a, b) => b.cap - a.cap).slice(0, 20).map((e) => { const [o, d] = e.k.split('–'); return `<tr><td style="white-space:nowrap"><b>${e.k}</b></td><td>${[...new Set(e.al.map((x) => x.name))].map(esc).join(', ')}</td><td class="num">${tKg(2 * SM.freightDemand(o, d))}</td><td class="num">${tKg(e.cap)}</td><td class="num">${tKg(e.kg)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  html += `<p class="small muted">Bedarf und Kapazität zählen beide Richtungen. Die Nachfrage schwankt von Tag zu Tag und folgt der Konjunktur; Zölle und Krisen treffen sie wie die Beiladefracht.</p>`;
  return html + '</div>';
};
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
    return `<div class="card pad stack"><div class="spread"><b>${apt} · ${apName(apt)} <span class="small muted">${NF1.format(SM.paxEff(apt))} Mio. Pax/Jahr${W.aptObs && W.aptObs[apt] ? ` – im Spiel gewachsen (ursprünglich ${NF1.format(P.AIRPORTS[apt].pax || 0)} Mio.)${SM.paxEff(apt) >= 25 && (P.AIRPORTS[apt].pax || 0) < 25 ? ', jetzt Code F' : ''}` : ''}</span></b><span>${pl.antitrust && pl.antitrust[apt] ? `<span class="chip crit" title="Wettbewerbsaufsicht: keine neuen Strecken, nach ${P.ANTITRUST.grace} Tagen monatliche Bußgelder">Kartellverfahren · ${pct(pl.antitrust[apt].share)} der Abflüge</span> ` : ''}${isBase ? '<span class="chip me">Basis</span> ' : ''}${isFinite(slots) ? `<span class="chip ${slots < 2 ? 'warn' : ''}">${slotTxt(apt)} Slots frei</span>` : '<span class="chip">ohne Slotvergabe</span>'}</span></div>
      <div class="small muted">${d.n} ${d.n === 1 ? 'Abflug' : 'Abflüge'} pro Tag · Fixkosten ${eur(monthly)} pro Monat</div>
      ${antiHtml(apt)}
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
  const bx = SM.softX(pl, 'base'), stv = SM.standingOf(pl, W.day).v, SB = P.STANDING;
  const pick = cand.includes(ui.newBasePick) ? ui.newBasePick : (cand.find((c) => SM.baseApproval(pl, c).ok) || cand[0]), apPick = SM.baseApproval(pl, pick);
  const lim = bx > 1 ? `Eine weitere Basis ist für Ihr Ansehen (${stv}) ein großer Schritt: Einrichtung ×${NF1.format(bx)}, laufende Kosten aller Basen +${n0(SM.CAREER.soft.baseDayX * 100 * Math.max(1, pl.bases.length + 1 - SM.basesFree(stv)))} %. Ohne Aufschlag ab Ansehen ${SM.basesFreeAt(pl.bases.length + 1)}.` : '';
  html += `<div class="card pad stack"><h3>Neue Basis beantragen</h3><p class="small ink2">Eine Basis erlaubt Strecken von dort aus und Umsteigeverbindungen über diesen Flughafen. Die Flughafengesellschaft prüft jeden Antrag nach dem <b>Ansehen</b> Ihrer Airline (jetzt ${stv} von 100): kleine Flughäfen sagen jedem zu, mittlere ab ${SB.baseReq.m}, große ab ${SB.baseReq.l}, Drehkreuze ab ${SB.baseReq.x}. Bis ${SB.baseCond} Punkte darunter gibt es eine Zusage unter Auflagen (Lizenz ×${NF1.format(SB.baseCondX)}), sonst eine Absage. Betriebslizenz nach Größe: klein bis 100 Tsd. €, mittel 100–500 Tsd. €, groß 1–2 Mio. €, Drehkreuz 2,5–4 Mio. €. Haben Sie dort schon eine Station, wird deren Gebühr angerechnet.</p>
    ${lim ? `<div class="callout warn">${esc(lim)}</div>` : ''}
    ${(() => { const R = P.BASE_RULE, yr = 2027 + Math.floor(W.day / 365), done = SM.baseOpensYear(W, pl), nx = pl.bases.length + 1, fee = SM.baseExtraFee(W, pl, '');
      const year = `<p class="small ${done >= R.perYear ? 'neg' : 'muted'}">Neue Basen ${yr}: ${done} von höchstens ${R.perYear}${done >= R.perYear ? ` – die nächste ist ab dem 1. Januar ${yr + 1} möglich` : ''}. Übernommene Basen zählen nicht mit.</p>`;
      if (SM.limitsLifted(pl)) return `<div class="callout ${nx >= R.extraFrom ? 'warn' : 'good'}"><b>Konzern: mehr als ${P.BASE_MAX} Basen möglich</b><span class="small">${pl.group && pl.group.names && pl.group.names.length ? `Nach der Übernahme von ${esc(pl.group.names.join(', '))}` : 'Mit 100 % an einer anderen Airline'} sind Sie nicht mehr an ${P.BASE_MAX} Basen gebunden. Ab der ${R.extraFrom}. Basis gilt aber: Konzessionsabgabe ${eurB(R.extraFee * cpi())} (jede weitere ×${NF1.format(R.extraX)}) und nur ${R.extraSlots} statt ${P.BASE_SLOTS.n} Basis-Slots. ${nx >= R.extraFrom ? `Ihre nächste wäre die ${nx}. Basis: Abgabe <b>${eurB(fee)}</b>.` : ''} Die Flughäfen entscheiden weiter nach Ihrem Ansehen.</span></div>${year}`;
      return (pl.bases.length >= P.BASE_MAX ? `<div class="callout info"><b>${pl.bases.length} von höchstens ${P.BASE_MAX} Basen</b><span class="small">Eine neue Basis gibt es erst, wenn Sie eine bestehende schließen.</span></div>` : `<p class="small muted">${pl.bases.length} von höchstens ${P.BASE_MAX} Basen. Nach einer Komplettübernahme sind mehr möglich – ab der ${R.extraFrom}. Basis aber sehr teuer (Konzessionsabgabe ab ${eurB(R.extraFee * cpi())}) und nur mit ${R.extraSlots} Slots.</p>`) + year; })()}
    <div class="row"><select id="newbase" style="width:auto">${cand.map((c) => { const al = W.list.find((x) => x.archetype && x.status !== 'insolvent' && x.bases.includes(c)), a = SM.baseApproval(pl, c); return `<option value="${c}" ${c === pick ? 'selected' : ''}>${a.ok ? (a.cond ? '◐ ' : '✓ ') : '✕ '}${c} · ${apName(c)} · ${a.ok ? `einmalig ${eur(newBaseCost(pl, c))}, ${eur(SM.baseDayCost(c) * 30.4 * cpi())}/Monat` : `abgelehnt (Ansehen ${a.req - SB.baseCond} nötig)`}${al ? ' · Basis ' + al.name : ''}</option>`; }).join('')}</select><button ${(pl.bases.length >= P.BASE_MAX && !SM.limitsLifted(pl)) || SM.baseOpensYear(W, pl) >= P.BASE_RULE.perYear ? 'disabled' : ''} class="btn" data-act="openbase" id="openbaseBtn" ${apPick.ok ? '' : 'disabled'}>${newBaseBtnTxt(pl, pick)}</button></div>
    <p class="small muted" id="newbaseNote">${apPick.msg ? esc(apPick.msg) : `${apName(pick)}: Zusage ohne Auflagen.`}</p></div>`;
  const slotApts = Object.keys(pl.stations).filter((c) => P.AIRPORTS[c]).sort();
  html += foldCard('sl-stations', `<h2 class="sec">Slots <small>Flughäfen in Ihrem Netz</small></h2>`, `<table class="t"><thead><tr><th>Flughafen</th><th class="r">für Sie frei</th><th class="r">Entgelt je Bewegung</th></tr></thead><tbody>${slotApts.map((c) => `<tr><td>${c} · ${apName(c)}</td><td class="r">${slotTxt(c)}</td><td class="r">${eur(SM.apx(c).slotFee * cpi())}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">Jeder tägliche Flug belegt einen Slot an beiden Enden. Zu jeder neuen Basis gehören drei Slots, ab der ${P.BASE_RULE.extraFrom}. Basis zwei (im Eröffnungspreis enthalten). Neue Slots gibt es zum 1. April und 1. Oktober; wer eine Strecke einstellt, behält seine Slots in der Reserve.</p>`, 'slfold');
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
    ${h ? `<div class="callout ${W.fuelPrice >= h.price ? 'good' : 'warn'}">Abgesichert: ${n0((h.kgDay || 0) * 30.4 / 1000)} t pro Monat (bei Abschluss ${pct(h.share)} des Bedarfs) zu ${NF3.format(h.price)} €/kg bis ${dateShort(h.until)}. Tagespreis heute ${NF3.format(W.fuelPrice)} €/kg: ${W.fuelPrice > h.price ? `Sie bekommen täglich ${eur((W.fuelPrice - h.price) * (h.kgDay || 0))} Ausgleich` : `Sie zahlen täglich ${eur((h.price - W.fuelPrice) * (h.kgDay || 0))} Ausgleich`}. Ergebnis bisher ${eur(h.pnl || 0, { plus: true })}.</div>` : ''}
    <div class="card pad stack"><h3>Preis absichern (Hedging)</h3>
      <div class="row small"><span>Anteil</span><div class="seg">${[0.25, 0.5, 0.8].map((v) => `<button data-act="hq" data-k="share" data-v="${v}" aria-pressed="${ui.hedge.share === v}">${pct(v)}</button>`).join('')}</div>
        <span>Laufzeit</span><div class="seg">${[3, 6, 12].map((v) => `<button data-act="hq" data-k="months" data-v="${v}" aria-pressed="${ui.hedge.months === v}">${v} Mon.</button>`).join('')}</div></div>
      <p class="small ink2">Festpreis ${NF3.format(hq.price)} €/kg für ${n0(ui.hedge.share * kg / 1000)} t pro Monat (${pct(ui.hedge.share)} des heutigen Bedarfs)${hq.impact > 0.002 ? ` (davon ${pct(hq.impact, 1)} Aufschlag, weil am Terminmarkt gerade viel gekauft wird)` : ''}, Prämie ${pct(hq.prem, 1)} je Monat: <b>${eur(hq.cost)}</b> sofort.${kg ? '' : ' Ohne Flugplan gibt es nichts abzusichern.'}</p>
      <div class="row"><button class="btn primary" data-act="hedge" ${kg ? '' : 'disabled'}>${h ? 'Neu absichern (ersetzt die laufende)' : 'Absichern'}</button>${h ? '<button class="btn" data-act="unhedge">Absicherung beenden (Restlaufzeit abrechnen)</button>' : ''}</div>
      <p class="small muted">Die Menge wird beim Abschluss festgeschrieben und täglich abgerechnet: Liegt der Tagespreis über dem Festpreis, bekommen Sie die Differenz, liegt er darunter, zahlen Sie sie. Wachsen Sie danach, ist der neue Bedarf nicht abgesichert. Vorzeitiges Beenden oder Ersetzen rechnet die Restlaufzeit zum aktuellen Terminpreis ab (plus 0,5 % Gebühr) – eine fallende Absicherung lässt sich also nicht mehr kostenlos wegwerfen. Schützt vor Ölpreisschocks, kostet aber eine Prämie. Große Absicherungen treiben den Terminpreis und im Folgemonat auch den Tagespreis – für alle Airlines. Eine Einkaufsfachkraft senkt Prämie und Kerosinpreis.</p></div></div>`;
  html += `<div class="stack"><h2 class="sec">Versicherung</h2><div class="opts">${Object.entries(P.INSURANCE).map(([k, v]) => `<button data-act="ins" data-v="${k}" aria-pressed="${pl.insurance === k}"><b>${v.label}</b><span>${NF2.format(v.rate * 100)} % vom Wert · Selbstbehalt ${eur(v.deductible)}</span></button>`).join('')}</div>
    <p class="small muted">Jahresprämie in Prozent des Flugzeugwerts. Der Selbstbehalt gilt je Triebwerks- oder Strukturschaden (Reparaturen kosten ${eur(P.AOG_COST[0])} bis ${eur(P.AOG_COST[1])}).</p></div>`;
  const mkp = pl.mktPct || 0;
  html += `<div class="stack"><h2 class="sec">Marketing <small>Marke ${n0(pl.brand * 100)} / 100 · ${mkp ? pctTxt(mkp) + ' vom Umsatz' : 'aus'}</small></h2><div class="seg wrap">${[0, 0.01, 0.02, 0.03, 0.05, 0.08].map((v) => `<button data-act="mktp" data-v="${v}" aria-pressed="${Math.abs(mkp - v) < 0.0005}">${v ? pctTxt(v) : 'aus'}</button>`).join('')}</div><p class="small muted">Anteil am Umsatz mit Sättigung – Details und Wirkung unter <a href="#" data-act="tab" data-tab="strategy">Karte → Strategie</a>.</p></div>`;
  const lm = pl.ledger.months.at(-1), cr = lm ? (lm.acc.rev_cargo || 0) / 100 : 0;
  html += `<div class="stack"><h2 class="sec">Beiladefracht</h2><label class="chk"><input type="checkbox" id="cargo" ${pl.cargo ? 'checked' : ''}> Frachtraum über einen Frachtagenten vermarkten (${eur(P.CARGO.gsaMonth * cpi())} pro Monat, 15 % Provision)</label>
    <p class="small muted">Nutzt den Frachtraum unter der Kabine. Lohnt auf Strecken zwischen Wirtschaftszentren, weniger auf Ferienstrecken. ${lm ? `Letzter Monat: ${eur(cr)} Frachterlös.` : ''}</p></div>`;
  return html;
};

// ---------- Datenblatt Flugzeugmuster ----------
function showAcInfo(id) {
  const t = P.AIRCRAFT_TYPES[id]; if (!t) return;
  const pl = W.player, base = curBase(), mine = pl.fleet.filter((a) => a.type_id === id), fam = P.TYPE_GROUPS[t.group];
  const reach = SM.AP_CODES.filter((c) => c !== base && SM.routeKmOk(base, c) && SM.rangeOk(base, c, id));
  const sample = reach.map((c) => ({ c, km: SM.gcDistanceKm(base, c), pot: potOf(base, c).sum })).sort((a, b) => b.pot - a.pot).slice(0, 6);
  const bh1000 = SM.blockHours(base, sample[0] ? sample[0].c : base, id);
  const cpiV = cpi(), rk = SM.riskTerms(pl, id), lease = t.lease_month * rk.lease * P.EURUSD / W.macro.eurusd;
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
        ${row('Leasing', `${eur(lease)}/Monat${rk.reject ? ` <span class="small neg" title="${esc(rk.reject)}">(abgelehnt – Ansehen ${rk.st}, verlangt ${rk.req})</span>` : rk.lease > 1.001 ? ` <span class="small warnc" title="Aufschlag der Leasinggeber nach Ansehen – sinkt, wenn Ihre Airline Erfahrung, Pünktlichkeit und solide Finanzen zeigt">(+${pct(rk.lease - 1)}, Kaution ${rk.dep} Raten)</span>` : ''}`)}
        ${row('Kaufpreis neu', eur(t.value_eur * 1.08))}
        ${row('Wartung', `${eur(t.maint_bh * cpiV)}/Blockstunde`)}
        ${row('Abfertigung', `${eur(t.handling * cpiV)} je Umlauf`)}
        ${row('Höchstgewicht', `${n0(t.mtow_t)} t`)}
        ${row('Ihre Flotte', mine.length ? `${mine.length} Stück` : pl.familyKnown(id) ? 'Familie bekannt' : `noch keins · Einführung ${eur(P.TYPE_INTRO_COST)}`)}
      </tbody></table>
    </div>
    ${sample.length ? `<div class="stack"><h3>Größte erreichbare Märkte ab ${base}</h3>${baseSwitch(base, 'data-acbase')}<table class="t"><thead><tr><th>Ziel</th><th class="r">Distanz</th><th class="r">Blockzeit</th><th class="r">Potenzial/Tag ⇄</th></tr></thead><tbody>${sample.map((x) => `<tr><td><b>${x.c}</b> <span class="small muted">${esc(apName(x.c))}</span></td><td class="r">${n0(x.km)} km</td><td class="r">${n1(SM.blockHours(base, x.c, id))} h</td><td class="r">${n0(x.pot)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <p class="small muted">Sitzplätze je nach Produkt (Basis, Standard, Komfort). Ab 9 Stunden Flugzeit fliegen drei, ab 13 Stunden vier Piloten.${void bh1000 || ''}</p>`, true);
  m.querySelector('#aiClose').addEventListener('click', () => { m.hidden = true; });
  m.querySelectorAll('[data-acbase]').forEach((x) => x.addEventListener('click', () => { if (setSelBase(x.dataset.acbase)) showAcInfo(id); }));
  m.onclick = (e) => { if (e.target === m) m.hidden = true; };
}

// ---------- Gewählte Basis (bei mehreren Hubs) ----------
const curBase = () => { const pl = W.player; return pl.bases.includes(ui.selBase) ? ui.selBase : pl.bases[0]; };
/** Umschalter zwischen den eigenen Basen – nur bei mehr als einer Basis. attr: Datenattribut für den Klick. */
function baseSwitch(base, attr, label = 'Ab Basis') {
  const pl = W.player; if (pl.bases.length < 2) return '';
  return `<div class="row baseswitch"><span class="small muted">${label}</span><div class="seg wrap" role="group" aria-label="Basis wählen">${pl.bases.map((b) => `<button type="button" ${attr}="${b}" aria-pressed="${b === base}" title="${esc(apName(b))}">${b}</button>`).join('')}</div></div>`;
}
function setSelBase(b) {
  const pl = W.player; if (!pl.bases.includes(b)) return false;
  if (!ui.selApt || pl.bases.includes(ui.selApt)) ui.selApt = b;   // stand eine Basis im Fokus, wechselt sie mit
  ui.selBase = b; return true;
}

// ---------- Flughafen-Karte auf der Karte: Reisepotenzial auf einen Blick ----------
function potOf(o, d) { return W.knownPot(W.player, o, d); }
/** Potenzial so, wie Sie es kennen: Zahl ab solidem Wissen, sonst Spanne. */
const potTxt = (p, div = 1) => (p.lv >= 2 ? n0(p.sum / div) : `${n0(p.lo / div)}–${n0(p.hi / div)}`);
const kbar = (lv) => `<span class="kbar" title="Marktwissen: ${P.MARKET_INFO.labels[Math.min(4, lv)] || 'Ist-Daten'}">${P.MARKET_INFO.labels.map((_, i) => `<i class="${i <= Math.min(4, lv) ? 'on' : ''}"></i>`).join('')}</span>`;
function aptCardHtml(c) {
  const pl = W.player, base = curBase(), a = P.AIRPORTS[c];
  const isBase = pl.bases.includes(c);
  let body = isBase ? '' : baseSwitch(base, 'data-apcbase');
  if (!isBase && SM.routeKmOk(base, c)) {
    const p = potOf(base, c), km = SM.gcDistanceKm(base, c), rail = SM.railShare(base, c);
    const comp = W.competitorOffers(W.playerId, base, c), mineAll = pl.activeRoutes().filter((r) => SM.pairKey(r.base, r.dest) === SM.pairKey(base, c)), mine = mineAll[0];
    const months = Array.from({ length: 12 }, (_, m) => W.knownPot(pl, base, c, m).sum);
    const mx = Math.max(...months);
    body += `<div class="ac-pot"><span>Reisepotenzial ${base} ⇄ ${c} ${kbar(p.lv)}</span><b>${p.lv >= 2 ? '≈ ' : ''}${potTxt(p)}</b><em>Menschen pro Tag, beide Richtungen · Ihre Schätzung (Marktwissen ${P.MARKET_INFO.labels[Math.min(4, p.lv)] || 'Ist-Daten'})</em></div>
      <div class="ac-mix"><span style="flex:${p.leisure}" title="Urlaub ${pct(p.leisure / p.sum)}" class="l"></span><span style="flex:${p.business}" title="Geschäft ${pct(p.business / p.sum)}" class="b"></span><span style="flex:${p.vfr}" title="Besuch ${pct(p.vfr / p.sum)}" class="v"></span></div>
      <div class="small muted">Urlaub ${pct(p.leisure / p.sum)} · Geschäft ${pct(p.business / p.sum)} · Besuch ${pct(p.vfr / p.sum)}</div>
      <div class="ac-season" title="Saison: Potenzial je Monat">${months.map((v, m) => `<i style="height:${(v / mx * 100).toFixed(0)}%" title="${MONTHS[m]}: ${n0(v)} pro Tag"></i>`).join('')}</div>
      <div class="small muted" style="display:flex;justify-content:space-between"><span>Jan</span><span>Saison</span><span>Dez</span></div>
      <div class="small">${n0(km)} km · ${n1(SM.blockHours(base, c, 'A20N'))} h mit A320neo${rail > 0.05 ? ` · Bahn nimmt ${pct(rail)}` : ''}</div>
      <div class="small">${mineAll.length ? `<span class="chip me">Sie fliegen ${mineAll.map((r) => `${r.freq}x ${r.type_id}`).join(' + ')}</span> ` : ''}${comp.length ? comp.map((o) => `<span class="sw" style="background:${colorOf(W.airlines[o.airline])}"></span> ${esc(W.airlines[o.airline].name)} ${o.freq}x ${eur(o.fare)}`).join(' · ') : 'Noch keine Konkurrenz auf dieser Strecke.'}</div>`;
  }
  const top = SM.AP_CODES.filter((d) => d !== c && SM.routeKmOk(c, d)).map((d) => ({ d, p: potOf(c, d) })).sort((x, y) => y.p.sum - x.p.sum).slice(0, 5);
  body += aptUpHtml(c);
  body += `<div class="small" style="margin-top:6px"><b>Größte Märkte ab ${c} (geschätzt):</b> ${top.map((x) => `<a href="#" data-aptsel="${x.d}">${x.d}</a> ${potTxt(x.p)}`).join(' · ')}</div>`;
  return `<div class="apc-head"><div><b>${c} · ${esc(a.name)}</b><span>${esc(SM.COUNTRY_NAMES[a.country].replace(/^den /, ''))} · ${NF1.format(a.pop)} Mio. Einwohner</span></div><button class="x" data-apc="close" aria-label="Schließen">×</button></div>
    <div class="apc-body">${body}</div>
    <div class="apc-foot">${!isBase && SM.routeKmOk(base, c) ? `<button class="btn small primary" data-apc="plan" data-apt="${c}">Strecke ${base}–${c} planen</button>` : ''}<button class="btn small" data-apc="market" data-apt="${c}">Markt ansehen</button></div>`;
}
/** 0.21.41: Flughafen ausbauen – Stand und Angebot im Flughafenfenster. */
function aptUpHtml(c) {
  const pl = W.player, st = W.aptState(c), U = P.APT_UP, a = P.AIRPORTS[c];
  const mine = pl.bases.includes(c) || pl.activeRoutes().some((r) => r.base === c || r.dest === c);
  const rb = pl.aptRebate && pl.aptRebate[c] && pl.aptRebate[c].until > W.day ? pl.aptRebate[c] : null;
  const info = `${NF1.format(st.paxEff)} Mio. Passagiere im Jahr${st.term ? ` · Terminal Stufe ${st.term}` : ''} · ${st.codeF ? 'A380 und 747-8 zugelassen' : `A380/747-8 erst ab ${U.codeF} Mio. oder mit verlängerter Bahn`}`;
  let h = `<div class="apc-up"><div class="small"><b>Flughafen:</b> ${info}${rb ? ` · <span class="pos">Sie zahlen hier ${pct(1 - rb.x)} weniger Entgelte (Bauherr)</span>` : ''}</div>`;
  { const hs = W.slotHolders(c), cap = W.slotCap[c], free = W.slotsFree(c), tot = hs.reduce((a2, x) => a2 + x.n, 0);
    if (free !== Infinity && hs.length) h += `<details class="apc-slots"><summary class="small"><b>Slots:</b> ${n0(cap)} am Tag, ${n0(Math.max(0, free))} frei · ${hs.length} Airline${hs.length > 1 ? 's' : ''}</summary>
      <div class="small">${hs.slice(0, 12).map((x) => { const al = W.airlines[x.id]; return `<div class="spread"><span><span class="sw" style="background:${colorOf(al)}"></span> ${esc(al.name)}${x.id === pl.id ? ' <span class="chip me">Sie</span>' : ''}</span><span class="mono">${n0(x.n)}${x.held ? ` <span class="muted">(${n0(x.held)} Reserve)</span>` : ''} · ${pct(x.n / Math.max(1, tot))}</span></div>`; }).join('')}${hs.length > 12 ? `<div class="muted">und ${hs.length - 12} weitere</div>` : ''}</div></details>`;
    else if (free === Infinity) h += `<div class="small muted">Keine Slotpflicht – Starts und Landungen frei.</div>`; }
  if (st.proj) { const by = W.airlines[st.proj.by]; h += `<div class="small warnc">Im Bau: ${st.proj.kind === 'rwy' ? 'längere Start- und Landebahn' : `Terminal Stufe ${st.proj.lv}`}, fertig am ${dateShort(st.proj.done)}${by ? ` (Bauherr ${esc(by.name)})` : ''}.</div>`; }
  else if (mine && ui.aptConfirm && ui.aptConfirm.c === c) {
    const q = W.aptInvestQuote(pl, c, ui.aptConfirm.kind);
    h += `<div class="callout warn stack" style="margin-top:6px"><span>${ui.aptConfirm.kind === 'rwy' ? 'Bahn verlängern' : `Terminal Stufe ${q.lv}`} in ${esc(a.name)} für <b>${eur(q.cost || 0)}</b> beauftragen? Fertig in rund ${Math.round((q.days || 0) / 30.4)} Monaten.</span><div class="row" style="gap:6px"><button class="btn small primary" data-apc="investok" data-apt="${c}" ${q.ok ? '' : 'disabled'}>Ja, beauftragen</button><button class="btn small" data-apc="investno">Abbrechen</button></div>${q.ok ? '' : `<span class="small neg">${esc(q.msg)}</span>`}</div>`;
  }
  else if (mine) {
    const qt = W.aptInvestQuote(pl, c, 'term'), qr = W.aptInvestQuote(pl, c, 'rwy');
    const btn = (q, kind, label) => q.cost ? `<button class="btn small" data-apc="invest" data-apt="${c}" data-kind="${kind}" ${q.ok ? '' : 'disabled'} title="${esc(q.msg || '')}">${label}<span class="btn-sub">${eur(q.cost)} · ${Math.round(q.days / 30.4)} Monate Bau</span></button>` : '';
    const bt = btn(qt, 'term', `Terminal ausbauen (Stufe ${st.term + 1})`), br = btn(qr, 'rwy', 'Bahn verlängern (Code F)');
    if (bt || br) h += `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px">${bt}${br}</div>
      <div class="small muted">Terminal: +${pct(U.term.paxX)} Kapazität, +${pct(U.term.demand)} Nachfrage auf allen Strecken hierher, mehr Slots – für alle Airlines. Bahn: A380 und 747-8 dürfen landen. Als Bauherr zahlen Sie hier ${U.investor.years} Jahre lang ${pct(1 - U.investor.x)} weniger Lande- und Passagierentgelte und bekommen ${U.investor.slots} Slots. Die Kosten sind ein Einmalposten.</div>`;
    else if (qt.msg || qr.msg) h += `<div class="small muted">${esc(qt.msg || qr.msg)}</div>`;
  }
  return h + '</div>';
}
function showAptCard(c) {
  const box = $('#aptCard'); if (!box || !W) return;
  if (!c) { box.hidden = true; return; }
  $('#planeCard').hidden = true; ui.sel = null;
  box.innerHTML = aptCardHtml(c); box.hidden = false; ui.aptCard = c;
}

// ---------- Drehkreuze (0.21.41): wohin die Umsteiger reisen, Engpässe, Nutzen, neue Ziele ----------
function hubStats(pl, H) {
  const rs = pl.activeRoutes().filter((r) => r.base === H && r.opened_day <= W.day);
  let tr = 0, trr = 0, trrN = 0, rev = 0, n = 0, pax = 0;
  const per = rs.map((r) => { const s = rstats(r, 30); tr += s.tr; trr += s.trr; rev += s.rev; pax += s.pax; n = Math.max(n, s.n); trrN = Math.max(trrN, s.trrN); return { r, s }; });
  return { rs, per, n, trips: n ? tr / n / 2 : 0, trr: trrN ? trr / trrN : 0, rev: n ? rev / n : 0, pax: n ? pax / n : 0, trLegs: n ? tr / n : 0 };
}
function hubFlowPairs(pl, H) {
  const F = (pl.hubFlows && pl.hubFlows[H]) || {}, m = new Map();
  for (const [k, v] of Object.entries(F)) {
    const two = k.endsWith('*'), [a, b] = k.replace('*', '').split('-'), key = [a, b].sort().join('-') + (two ? '*' : '');
    const e = m.get(key) || { a: [a, b].sort()[0], b: [a, b].sort()[1], two, car: 0, want: 0, necks: new Set() };
    e.car += v[0]; e.want += v[1]; if (v[2]) e.necks.add(v[2]); m.set(key, e);
  }
  return [...m.values()].sort((x, y) => y.want - x.want);
}
function hubTargetsCached(pl, H, lazy = false) {
  const key = H + '|' + pl.activeRoutes().length + '|' + Math.floor(W.day / 7);
  ui.hubT = ui.hubT || {};
  if (!ui.hubT[H] || ui.hubT[H].key !== key) {
    // 0.21.50: Die Zielsuche rechnet viele Märkte durch – erst den Reiter zeigen, dann rechnen (sonst hängt der Klick, auf dem Handy bis fast 1 s)
    if (lazy) { if (!hubTargetsCached.busy) { hubTargetsCached.busy = true; setTimeout(() => { hubTargetsCached.busy = false; if (!W || !W.player) return; hubTargetsCached(W.player, H); if (ui.tab === 'hubs') renderPane(true); }, 30); } return null; }
    ui.hubT[H] = { key, list: W.hubTargets(pl, H) };
  }
  return ui.hubT[H].list;
}
VIEWS.hubs = function viewHubs() {
  const pl = W.player, TR = P.TRANSFER;
  const all = pl.bases.map((B) => ({ B, st: hubStats(pl, B) }));
  if (!ui.hubSel || !pl.bases.includes(ui.hubSel)) ui.hubSel = (all.slice().sort((x, y) => y.st.trips - x.st.trips)[0] || { B: pl.bases[0] }).B;
  const H = ui.hubSel, st = all.find((x) => x.B === H).st, hl = (pl.hubs && pl.hubs[H]) || 0;
  const nLong = st.rs.filter((r) => r.role !== 'local' && SM.gcDistanceKm(r.base, r.dest) > 4000).length, attr = Math.min(TR.attrMax, TR.attrPerLong * nLong), conn = Math.max(0.6, TR.connH - TR.connHPerLv * hl);
  const rname = (id) => { const r = pl.routes.find((x) => x.id === id); return r ? `${r.base}–${r.dest}` : '?'; };
  let html = `<h2 class="sec">Drehkreuze <small>wohin Ihre Umsteiger reisen</small></h2>`;
  if (pl.bases.length > 1) html += `<div class="seg wrap" role="group" aria-label="Drehkreuz wählen">${all.map(({ B, st: s }) => `<button type="button" data-act="hubsel" data-apt="${B}" aria-pressed="${B === H}">${B}<span class="btn-sub">${n0(s.trips)} Umsteiger/Tag</span></button>`).join('')}</div>`;
  html += `<div class="slotsum">
    <div><span>Umsteiger pro Tag</span><b>${n0(st.trips)}</b><em>Reisen über ${H}, Ø 30 Tage</em></div>
    <div><span>Erlös aus Umsteigern</span><b>${st.trr > 0 ? eur(st.trr) : '–'}</b><em>pro Tag, alle Teilstrecken ab ${H}</em></div>
    <div><span>Anteil am Erlös</span><b>${st.rev > 0 && st.trr > 0 ? pct(st.trr / st.rev) : '–'}</b><em>der Strecken ab ${H}</em></div>
    <div><span>${esc(P.HUB[hl].label)}</span><b>${NF1.format(conn)} h</b><em>Umsteigezeit · Attraktivität +${pct(attr)}</em></div></div>`;
  if (!st.rs.length) return html + `<div class="callout info">Ab ${H} fliegen Sie noch keine Strecke.</div>`;
  // Nutzen
  html += foldCard('hub-why', `<b>Was das Drehkreuz bringt</b>`, `<ul class="small" style="margin:0;padding-left:18px">
    <li>Jede Strecke ab ${H} verbindet sich mit den anderen: ${st.rs.length} Ziele ergeben bis zu ${n0(st.rs.length * (st.rs.length - 1))} Reisen mit Umstieg (sinnvoll sind nur die mit höchstens ${pct(TR.max_detour + 0.1 * hl - 1)} Umweg und über ${TR.min_dist_km} km).</li>
    <li>Umsteiger zahlen für die ganze Reise ${pct(TR.discount + 0.03 * hl)} der Summe der Einzeltarife. Der Erlös wird nach den Einzeltarifen auf die Teilstrecken verteilt – jede Strecke bekommt ihren Tarif abzüglich Umsteigerrabatt.</li>
    <li>Sie füllen Plätze, die Ortsgäste frei lassen. Für lohnende Umsteiger halten Strecken Plätze frei: gemischt bis zur Hälfte, Zubringer bis 80 %. Lohnend heißt: Der Anschluss hat Platz, und die Reise bringt mehr als die Ortsgäste, die dafür keinen Platz bekommen.</li>
    <li>Ausbaustufen verkürzen die Umsteigezeit und erlauben mehr Umweg. Langstrecken machen das Drehkreuz attraktiver (+${pct(TR.attrPerLong)} je Langstrecke, höchstens +${pct(TR.attrMax)}).</li>
    <li>Volle Strecken bremsen: Wer keinen Platz auf dem Anschluss bekommt, fliegt mit anderen. Die Engpässe stehen unten.</li></ul>`);
  // Ströme
  const pairs = hubFlowPairs(pl, H), top = pairs.slice(0, 25), maxW = Math.max(1, ...top.map((x) => x.want));
  const neck = new Map(); for (const f of pairs) for (const id of f.necks) if (f.want > f.car * 1.15 + 1) { const e = neck.get(id) || { n: 0, w: 0 }; e.n++; e.w += f.want - f.car; neck.set(id, e); }
  const flowRows = top.map((f) => { const more = f.want > f.car * 1.15 + 1, nk = [...f.necks].map(rname).filter((x) => x !== '?');
    return `<div class="hrow"><div><b class="mono">${f.a} ⇄ ${f.b}</b>${f.two ? ' <span class="chip">2 Umstiege</span>' : ''} <span class="small muted">${esc(apName(f.a))} – ${esc(apName(f.b))} · ${n0(SM.gcDistanceKm(f.a, f.b))} km</span>
      <div class="hbar" title="Interesse an dieser Reise über ${H}, im Verhältnis zur gefragtesten"><i style="width:${Math.max(3, Math.round(100 * f.want / maxW))}%"></i></div>
      <div class="small ${more ? 'warnc' : 'muted'}">${more ? `mehr möglich – Anschluss voll${nk.length ? `: ${nk.slice(0, 2).join(', ')}` : ''}` : 'alle finden Platz'}</div></div>
      <div class="n"><b>${f.car >= 10 ? n0(f.car) : n1(f.car)}</b><span class="small muted">pro Tag</span></div></div>`; }).join('');
  html += foldCard('hub-flows', `<b>Wohin Ihre Umsteiger reisen</b> <span class="small muted">${pairs.length ? `${pairs.length} Reisen, die gefragtesten zuerst` : ''}</span>`,
    pairs.length ? `<p class="small muted" style="margin:0">Beide Richtungen zusammen, Ø der letzten rund zwei Wochen. Der Balken zeigt, wie gefragt eine Reise ist; die Zahl, wie viele tatsächlich mitfliegen.</p><div class="hlist">${flowRows}</div>`
      : `<p class="small muted">Noch keine Umsteiger erfasst – die Liste füllt sich ab dem nächsten Spieltag.</p>`);
  // Engpässe
  const necks = [...neck.entries()].sort((a, b) => b[1].w - a[1].w).slice(0, 6);
  if (necks.length) html += foldCard('hub-neck', `<b>Engpässe</b> <span class="small muted">volle Anschlüsse bremsen Umsteiger</span>`, `<div class="hlist">${necks.map(([id, e]) => { const r = pl.routes.find((x) => x.id === id); if (!r) return ''; const s = rstats(r, 14);
    return `<div class="hrow"><div><b class="mono">${r.base}–${r.dest}</b> <span class="small muted">${tl(r.type_id)} · ${freqTxt(r)} · ${ROLE_TXT[r.role || 'mixed'].label}</span><div class="small">bremst ${e.n} Reise${e.n === 1 ? '' : 'n'} · Auslastung ${pct(s.so ? s.pax / s.so : 0)}${s.pax > 0 ? ` · ${pct(s.tr / s.pax)} Umsteiger an Bord` : ''}</div><div class="small muted">Mehr Frequenz, größeres Flugzeug oder höherer Ortstarif schaffen Platz.</div></div>
      <div class="n"><button class="btn small" data-act="goroute" data-id="${r.id}">Zur Strecke</button></div></div>`; }).join('')}</div>`);
  // Strecken ab H
  const per = st.per.slice().sort((a, b) => b.s.tr - a.s.tr);
  html += foldCard('hub-spokes', `<b>Ihre Strecken ab ${H}</b> <span class="small muted">wer wie viele Umsteiger trägt</span>`, `<div class="hlist">${per.map(({ r, s }) => { const n = Math.max(1, s.n);
    return `<div class="hrow"><div><b class="mono">${r.base}–${r.dest}</b> <span class="small muted">${ROLE_TXT[r.role || 'mixed'].label} · ${n0(SM.gcDistanceKm(r.base, r.dest))} km</span><div class="small muted">Auslastung ${pct(s.so ? s.pax / s.so : 0)} · Umsteiger ${s.pax > 0 ? pct(s.tr / s.pax) : '–'} der Gäste${s.trrN ? ` · Erlösanteil ${eur(s.trr / s.trrN)}/Tag` : ''}</div></div>
      <div class="n"><b>${n0(s.tr / n)}</b><span class="small muted">Umsteiger/Tag</span></div></div>`; }).join('')}</div>`);
  // Neue Ziele
  const tg0 = hubTargetsCached(pl, H, true), tg = (tg0 || []).slice(0, 12);
  html += foldCard('hub-new', `<b>Neue Ziele für Umsteiger</b> <span class="small muted">ab ${H}, grob geschätzt</span>`, !tg0 ? '<p class="small muted">Ziele werden berechnet …</p>' : tg.length ? `<p class="small muted" style="margin:0">Je Ziel: wie viele Umsteiger ein täglicher Flug zum Marktpreis ungefähr bekäme – nur so viele, wie auf Ihren heutigen Anschlussflügen Platz finden, und bei genug Sitzen auf der neuen Strecke. Dazu der Ortsmarkt zwischen ${H} und dem Ziel. Die Streckenplanung rechnet genauer.</p>
    <div class="hlist">${tg.map((x) => `<div class="hrow"><div><b class="mono">${H}–${x.dest}</b> <span class="small muted">${esc(apName(x.dest))} · ${n0(x.km)} km · ${tl(x.type)}</span>
      <div class="small">ca. <b>${n0(x.car)}</b> Umsteiger pro Tag${x.car / 2 > x.seats ? ` – dafür bräuchte es rund ${Math.ceil(x.car / 2 / x.seats)}× täglich (${x.seats} Sitze je Flug)` : ''} · Ortsmarkt ca. ${n0(x.local)} Reisende je Richtung</div><div class="small muted">vor allem von und nach ${x.from.join(', ')}</div></div>
      <div class="n"><button class="btn small primary" data-act="planfrom" data-apt="${x.dest}" data-base="${H}">Planen</button></div></div>`).join('')}</div>`
    : `<p class="small muted">Keine sinnvollen neuen Ziele gefunden – für Umsteiger braucht es mindestens eine Strecke ab ${H} und ein passendes Flugzeug.</p>`);
  return html;
};

// ---------- Markt ----------
function selectAirport(c) {
  ui.selApt = c; showAptCard(c);
  const pl = W.player; ui.mapNav = true;
  if (ui.tab === 'plan' && ui.planner && c !== ui.planner.base) {
    // Zu kurze Strecken (unter der Mindestentfernung) setzen kein Ziel – sonst springt die Zielauswahl auf einen anderen Flughafen
    if (!SM.routeKmOk(ui.planner.base, c)) toast(`${ui.planner.base}–${c}: ${n0(SM.gcDistanceKm(ui.planner.base, c))} km – unter ${P.MIN_ROUTE_KM} km gibt es keine Linienflüge. Das Ziel bleibt ${ui.planner.dest}.`);
    else { ui.planner = { ...defaultPlanner(c, ui.planner.base), freq: ui.planner.freq, service: ui.planner.service, buffer: ui.planner.buffer }; setTab('plan'); }
  }
  else { if (pl.bases.includes(c)) ui.selBase = c; setTab('market'); }
  ui.mapNav = false;
  renderMapRoutes(true);
}
VIEWS.market = function viewMarket() {
  const pl = W.player, base = curBase(), c = ui.selApt || base, a = P.AIRPORTS[c];
  const based = W.list.filter((x) => x.bases.includes(c) && x.status !== 'insolvent');
  let html = baseSwitch(base, 'data-mktbase', 'Märkte ab Basis') + `<div class="spread"><h2 class="sec">${esc(a.name)} <small>${c} · ${SM.COUNTRY_NAMES[a.country].replace(/^den /, '')}</small></h2>${c !== base ? `<button class="btn primary" data-act="planfrom" data-apt="${c}">Strecke ${base}–${c} planen</button>` : '<span class="chip me">Ihre Basis</span>'}</div>`;
  const ev = W.activeEvents().concat(W.upcomingEvents()).filter((e) => W.eventAffects(e, c) && e.scope !== 'all');
  for (const e of ev) html += `<div class="callout ${e.severity === 'good' ? 'good' : 'warn'}">${e.start > W.day ? `Ab ${dateShort(e.start)}: ` : ''}${esc(e.text)}</div>`;
  if (c !== base && SM.routeKmOk(base, c)) { const p = potOf(base, c); html += `<div class="tiles"><div class="tile"><span>Reisepotenzial ${base} ⇄ ${c} ${kbar(p.lv)}</span><b>${p.lv >= 2 ? '≈ ' : ''}${potTxt(p)} pro Tag</b><em>Urlaub ${pct(p.leisure / p.sum)} · Geschäft ${pct(p.business / p.sum)} · Besuch ${pct(p.vfr / p.sum)}</em></div><div class="tile"><span>Distanz</span><b>${n0(SM.gcDistanceKm(base, c))} km</b><em>${SM.railShare(base, c) > 0.05 ? `Bahn nimmt ${pct(SM.railShare(base, c))}` : 'keine Bahnkonkurrenz'}</em></div><div class="tile"><span>Konkurrenz</span><b>${W.competitorOffers(W.playerId, base, c).length || 'keine'}</b><em>Airlines auf ${base}–${c}</em></div></div>`; }
  html += `<div class="tiles">
    <div class="tile"><span>Einzugsgebiet</span><b>${NF1.format(a.pop)} Mio.</b><em>Einwohner</em></div>
    <div class="tile"><span>Tourismus</span><b>${NF2.format(a.tour)}</b><em>Index, 1 = Mittel</em></div>
    <div class="tile"><span>Wirtschaft</span><b>${NF2.format(a.biz)}</b><em>Konjunktur ${pct(W.macro.econ[a.country] - 1).replace(/^(?!−|-)/, '+')}</em></div>
    <div class="tile"><span>Passagierentgelt</span><b>${eur(a.paxfee * cpi())}</b><em>je Abflug-Pax</em></div>
    <div class="tile"><span>Ticketsteuer</span><b>${eur(W.taxAt(c))}</b><em>zahlt der Kunde</em></div>
    <div class="tile"><span>Kerosin</span><b>${NF3.format(W.fuelPrice * SM.apx(c).fuel)} €</b><em>je kg vor Ort</em></div>
  </div>`;
  html += `<p class="small ink2">${based.length ? 'Basis von ' + based.map((x) => `<span class="sw" style="background:${colorOf(x)}"></span> ${esc(x.name)}`).join(', ') + '.' : 'Keine Airline hat hier eine Basis.'}${isFinite(W.slotsFree(c)) ? ` Slots: ${slotTxt(c)} frei (${SM.apx(c).cap} insgesamt, 1 je 200.000 Passagiere).` : ''}${P.LEISURE_SEASON_PROFILE[c] ? ` Ferienziel mit starker Saison (${P.LEISURE_SEASON_PROFILE[c] === 'island' ? 'Insel: Sommer etwa dreimal so stark wie Winter' : 'Sommer deutlich stärker'}).` : ''}</p>`;
  // Marktstudie
  if (c !== base) {
    const k = SM.pairKey(base, c), s = pl.studies[k], lv = pl.skill('analyst');
    html += `<div class="card pad stack"><h3>Marktstudie ${base}–${c}</h3>${s && s.done ? `<p class="small">Ergebnis von ${esc(s.by)} (${dateShort(s.ready)}): Die Nachfrage liegt <b>${pct(Math.abs(s.est - 1))} ${s.est >= 1 ? 'über' : 'unter'}</b> dem Modellwert, Unsicherheit ±${pct(s.err)}. Die Streckenprognose rechnet damit.</p>`
      : s ? `<p class="small">In Arbeit bei ${esc(s.by)}, fertig am ${dateShort(s.ready)}.</p>`
        : `<p class="small ink2">Jede Strecke hat einen eigenen, unbekannten Nachfragetrend. Eine Studie misst ihn (${eur(P.STUDY_COST * cpi())}).</p>`}
      ${lv ? `<div class="row"><button class="btn small" data-act="study" data-a="${base}" data-b="${c}" ${s && !s.done ? 'disabled' : ''}>${s && s.done ? 'Neu messen' : 'Studie beauftragen'} · ${eurB(P.STUDY_COST * cpi())}</button></div>` : '<p class="small muted">Dafür brauchen Sie eine Fachkraft für Marktanalyse (Tab Personal).</p>'}</div>`;
  }
  html += chancesHtml();
  const FM = fltState('market');
  const allRows = SM.AP_CODES.filter((d) => d !== base && SM.routeKmOk(base, d) && kmOk(FM, SM.gcDistanceKm(base, d))).map((d) => {
    const kp = W.knownPot(pl, base, d), sum = kp.sum / 2, pot = kp;
    const comp = W.competitorOffers(W.playerId, base, d);
    const mine = pl.activeRoutes().find((r) => (r.base === base && r.dest === d) || (r.dest === base && r.base === d));
    const st = pl.studies[SM.pairKey(base, d)];
    return { d, sum, kp, biz: pot.business / Math.max(1e-9, kp.sum), dist: SM.gcDistanceKm(base, d), rail: SM.railShare(base, d), comp, mine, st };
  }).sort((x, y) => (FM.sort === 'km' ? x.dist - y.dist : FM.sort === 'kmd' ? y.dist - x.dist : y.sum - x.sum));
  const rows = ui.marketAll ? allRows : allRows.slice(0, 25);
  const mSort = FM.sort === 'km' ? 'die nächsten 25' : FM.sort === 'kmd' ? 'die entferntesten 25' : 'die 25 größten';
  html += `<div class="stack"><h2 class="sec">Märkte ab ${base} <small>${ui.marketAll || allRows.length <= 25 ? `${allRows.length} Ziele` : mSort}${FM.km ? ` · ${esc(kmLabel(FM))}` : ''}, Potenzial pro Tag und Richtung</small></h2>${baseSwitch(base, 'data-mktbase', 'Andere Basis')}
    <div class="fltbar row">${kmFilter('market')}<select id="flt-sort" data-flt="market" aria-label="Sortieren">${[['', 'nach Potenzial'], ['km', 'nach Entfernung ↑'], ['kmd', 'nach Entfernung ↓']].map(([k, l]) => `<option value="${k}" ${(FM.sort || '') === k ? 'selected' : ''}>Sortieren: ${l}</option>`).join('')}</select>${FM.km || FM.sort ? '<button class="btn small ghost" data-act="fltclear" data-k="market">Filter zurücksetzen</button>' : ''}</div>
    ${allRows.length ? '' : '<p class="small muted">Kein Ziel in dieser Entfernung.</p>'}<div class="tw"><table class="t"><thead><tr><th>Ziel</th><th class="r">km</th><th class="r">Potenzial (geschätzt)</th><th>Wissen</th><th class="r">Geschäft</th><th>Angebot heute</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td><a href="#" data-act="selapt" data-apt="${r.d}">${r.d}</a> <span class="small muted">${apName(r.d)}</span>${r.rail > 0.1 ? ` <span class="chip">Bahn ${pct(r.rail)}</span>` : ''}${r.st && r.st.done ? ` <span class="chip ${r.st.est >= 1 ? 'good' : 'warn'}">Studie ${r.st.est >= 1 ? '+' : '−'}${pct(Math.abs(r.st.est - 1))}</span>` : ''}</td><td class="r">${n0(r.dist)}</td><td class="r">${potTxt(r.kp, 2)}</td><td>${kbar(r.kp.lv)}</td><td class="r">${r.kp.lv >= 1 ? pct(r.biz) : '?'}</td>
      <td class="small">${r.mine ? `<span class="chip me">Sie ${r.mine.freq}x</span> ` : ''}${r.comp.length ? r.comp.map((o) => `<span class="sw" style="background:${colorOf(W.airlines[o.airline])}"></span> ${o.freq}x ${eur(o.fare)}`).join(' ') : (r.mine ? '' : '<span class="muted">frei</span>')}</td></tr>`).join('')}
  </tbody></table></div><button class="btn small" data-act="marketall">${ui.marketAll ? 'Nur die 25 größten zeigen' : `Alle ${allRows.length} Ziele zeigen`}</button><p class="small muted">Potenzial heißt: so viele Menschen würden zum Referenzpreis eine Reise erwägen (Jahresmittel, ohne Konjunktur und Ereignisse). Das ist <b>Ihre Schätzung</b>: Ohne Marktwissen kann sie deutlich danebenliegen – Spannen zeigen, wie unsicher. Marktstudien, eine Fachkraft für Marktanalyse und eigene Flüge machen sie genauer. Wie viele tatsächlich fliegen, hängt von Preis, Frequenz, Produkt, Pünktlichkeit, Marke und Konkurrenz ab.</p></div>`;
  return html;
};

/**
 * Marktüberblick: Welche Märkte ab Ihren Basen versprechen Potenzial und sind noch wenig umkämpft?
 * Bewertet mit Ihrem Marktwissen (ungenau, solange Sie den Markt nicht studiert haben) – KI-Konkurrenz und eigene Flüge mindern die Chance.
 */
function chancesHtml() {
  const pl = W.player, flown = new Set(pl.activeRoutes().map((r) => SM.pairKey(r.base, r.dest))), out = [];
  const hide = new Set((ui.chHide || []).filter((b) => pl.bases.includes(b))); if (hide.size >= pl.bases.length) hide.clear();
  for (const base of pl.bases.filter((b) => !hide.has(b))) for (const d of SM.AP_CODES) {
    if (d === base || !SM.routeKmOk(base, d) || flown.has(SM.pairKey(base, d)) || SM.gcDistanceKm(base, d) > 9000 || !kmOk(fltState('market'), SM.gcDistanceKm(base, d))) continue;
    const kp = W.knownPot(pl, base, d), pot = kp.sum / 2; if (pot < 150) continue;
    const comp = W.competitorOffers(W.playerId, base, d), ai = comp.reduce((x, o) => x + o.freq * (o.seats || 180), 0);
    const free = Math.max(0, 1 - ai / Math.max(1, pot * 0.6)), score = pot * (0.25 + 0.75 * free) / Math.max(0.6, Math.sqrt(SM.gcDistanceKm(base, d) / 1500));
    out.push({ base, d, kp, pot, comp, free, score });
  }
  out.sort((a, b) => b.score - a.score);
  const top = out.slice(0, ui.chAll ? 30 : 8);
  if (!top.length) return '';
  return `<div class="card pad stack"><div class="spread"><h3>Chancen ab Ihren Basen</h3><span class="small muted">noch nicht geflogen, wenig KI-Konkurrenz</span></div>
    ${pl.bases.length > 1 ? `<div class="row" style="gap:6px;flex-wrap:wrap">${pl.bases.map((b) => `<button class="chip-t" data-act="chbase" data-v="${b}" aria-pressed="${!hide.has(b)}"><b class="mono">${b}</b> ${esc(apName(b))}</button>`).join('')}</div>` : ''}
    <div class="tw"><table class="t"><thead><tr><th>Markt</th><th class="r">Potenzial/Tag</th><th>Konkurrenz (KI)</th><th></th></tr></thead><tbody>
    ${top.map((x) => `<tr><td><b>${x.base}–${x.d}</b> <span class="small muted">${esc(apName(x.d))} · ${n0(SM.gcDistanceKm(x.base, x.d))} km</span></td><td class="r">${x.kp.lv >= 2 ? '≈ ' : ''}${potTxt(x.kp, 2)} ${kbar(x.kp.lv)}</td>
      <td class="small">${x.comp.length ? x.comp.map((o) => `<span class="sw" style="background:${colorOf(W.airlines[o.airline])}"></span> ${o.freq < 1 ? n0(o.freq * 7) + 'x/Wo.' : o.freq + 'x'}`).join(' ') : '<span class="pos">keine</span>'}</td>
      <td class="r"><button class="btn small" data-act="planfrom" data-base="${x.base}" data-apt="${x.d}">Planen</button></td></tr>`).join('')}
    </tbody></table></div>
    <p class="small muted">Etablierte Airlines außerhalb des Spiels fliegen fast überall mit – „keine“ heißt nur: keine simulierte Konkurrenz. Potenzial nach Ihrem Marktwissen: Spannen sind unsicher, erst eine Studie oder eigene Flüge zeigen den echten Wert. <a href="#" data-act="chall">${ui.chAll ? 'Weniger zeigen' : 'Mehr zeigen'}</a></p></div>`;
}
// ---------- Strategie: Kabinen, Marketing, Kundenbindung, Drehkreuze, Slots ----------
const CAB_PRESETS = {
  short: [['Nur Economy', 0, 0], ['Euro-Business', 0, 0.12], ['Business stark', 0, 0.25]],
  long: [['Nur Economy', 0, 0], ['Business', 0, 0.22], ['Business + First', 0.05, 0.28], ['Luxus', 0.15, 0.45]],
};
const HAUL_LBL = { short: 'Kurz- und Mittelstrecke', long: 'Langstrecke' };
const pctTxt = (x) => `${Math.round(x * 100)} %`;
// Preisautomatik: Einstellmöglichkeiten (Werte wie im Motor: Faktor auf den Referenzpreis, Schritt je Woche, Ziel-Auslastung Premium)
const AP_OPTS = {
  lf: { label: 'Ziel-Auslastung', tip: 'Auf diese Auslastung steuert die Automatik. Höher = mehr Passagiere, tiefere Preise; niedriger = höhere Preise, weniger Passagiere.', vals: [0.75, 0.8, 0.85, 0.9, 0.95], txt: (v) => pct(v) },
  min: { label: 'Untergrenze', tip: 'Tiefster Preis, bezogen auf den Referenzpreis der Strecke. „Kosten“: nur die Kostengrenze zählt.', vals: [0, 0.7, 0.85, 1], txt: (v) => (v ? pct(v) : 'Kosten') },
  max: { label: 'Obergrenze', tip: 'Höchster Preis, bezogen auf den Referenzpreis. Schützt vor Wucherpreisen, die Marke und Bewertungen kosten.', vals: [1.3, 1.5, 2, 3], txt: (v) => pct(v) },
  spd: { label: 'Tempo', tip: 'Größter Schritt pro Woche. Vorsichtig hält die Konkurrenz ruhig, schnell reagiert sofort auf Saison und Wettbewerb.', vals: [0.015, 0.03, 0.05, 0.08, 0.12], txt: (v) => (v < 0.02 ? 'vorsichtig ±1,5 %' : v < 0.04 ? 'normal ±3 %' : v < 0.06 ? 'zügig ±5 %' : v < 0.1 ? 'schnell ±8 %' : 'sehr schnell ±12 %') },
  ext: { label: 'Extremfälle', tip: 'Bricht die Auslastung ein (über 22 Punkte unter Ziel), werden über 30 % der Reisenden abgewiesen oder unterbietet die Konkurrenz um mehr als 20 % bei schwacher Auslastung, greift die Automatik sofort ein: täglich statt wöchentlich, bis zu 15 % je Schritt, danach 4 Tage Pause.', vals: [1, 0], txt: (v) => (v ? 'sofort eingreifen' : 'nur wöchentlich') },
  plf: { label: 'Premiumpreise', tip: 'Nur mit Business/First: Die Automatik verschiebt den Klassenaufschlag, bis die Premiumsitze so voll sind wie hier eingestellt. „fest“: Aufschlag bleibt, wie Sie ihn je Strecke setzen.', vals: [0, 0.6, 0.75, 0.9], txt: (v) => (v ? 'Ziel ' + pct(v) : 'fest') },
};
function apRows(cfg, lf, id, prem = true) {
  return Object.entries(AP_OPTS).filter(([k]) => prem || k !== 'plf').map(([k, o]) => {
    const cur = k === 'lf' ? lf : cfg[k];
    return `<div class="ap-row"><span class="small muted" title="${esc(o.tip)}">${o.label}</span><div class="seg wrap">${o.vals.map((v) => `<button data-act="apset" data-k="${k}" data-v="${v}"${id ? ` data-id="${id}"` : ''} aria-pressed="${Math.abs((cur || 0) - v) < 0.004}">${o.txt(v)}</button>`).join('')}</div></div>`;
  }).join('');
}
const apSummary = (cfg, lf) => `Ziel ${pct(lf)} · ${cfg.min ? pct(cfg.min) : 'Kosten'}–${pct(cfg.max)} vom Referenzpreis · ±${NF1.format(cfg.spd * 100)} %/Woche${cfg.ext ? ' · Extremfälle sofort' : ''}${cfg.plf ? ` · Premium Ziel ${pct(cfg.plf)}` : ''}`;
function cabCur(pl) { return SM.cabClone(pl.cabin) || { short: { f: 0, b: 0 }, long: { f: 0, b: 0 } }; }
function cabExampleType(pl, haul) {
  const cnt = {}; for (const a of pl.fleet) if (SM.haulOf(a.type_id) === haul) cnt[a.type_id] = (cnt[a.type_id] || 0) + 1;
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || (haul === 'long' ? 'B789' : 'A20N');
}
function cabSeatBar(typeId, cab) {
  const s = SM.cabinSeats(typeId, 'standard', cab), all = P.AIRCRAFT_TYPES[typeId].seats.standard, C = P.CABIN[SM.haulOf(typeId)];
  const w = (n, area) => (n * area / all * 100).toFixed(1);
  return `<div class="cab-bar" title="Kabinenfläche">${s.f ? `<i class="f" style="width:${w(s.f, C.firstArea)}%"></i>` : ''}${s.b ? `<i class="b" style="width:${w(s.b, C.bizArea)}%"></i>` : ''}<i class="e" style="flex:1"></i></div>
    <div class="cab-leg small"><span><i class="f"></i>First <b>${s.f}</b></span><span><i class="b"></i>Business <b>${s.b}</b></span><span><i class="e"></i>Economy <b>${s.e}</b></span><span class="muted">= ${s.total} Sitze (statt ${all})</span></div>`;
}
/** Erwartete Wirkung einer Kabinenaufteilung auf die heutigen Strecken (Prognose, Streckenbeitrag pro Tag). */
function cabImpact(pl, haul, draft) {
  const key = JSON.stringify([haul, draft[haul], W.day, pl.routes.length]); ui.cabImp = ui.cabImp || {};
  if (ui.cabImp[key] !== undefined) return ui.cabImp[key];
  const rs = pl.activeRoutes().filter((r) => SM.haulOf(r.type_id) === haul && r.opened_day <= W.day).slice(0, 40);
  if (!rs.length) return (ui.cabImp[key] = null);
  let a = 0, b = 0;
  for (const r of rs) {
    const spec = { airline: pl.id, base: r.base, dest: r.dest, type_id: r.type_id, freq: r.freq, fare_out: r.fare_out, fare_in: r.fare_in, service: r.service, buffer: r.buffer };
    a += W.forecastFor(pl, { ...spec, cab: cabCur(pl) }, { nDraws: 1, seed: 5 }).db2List;
    b += W.forecastFor(pl, { ...spec, cab: draft }, { nDraws: 1, seed: 5 }).db2List;
  }
  return (ui.cabImp[key] = { n: rs.length, now: a, next: b });
}
function cabCard(pl, haul) {
  const D = ui.cabDraft || (ui.cabDraft = cabCur(pl)), d = D[haul], cur = cabCur(pl)[haul], C = P.CABIN[haul], ty = cabExampleType(pl, haul);
  const changed = Math.abs(d.f - cur.f) + Math.abs(d.b - cur.b) > 0.004;
  const n = pl.fleet.filter((a) => SM.haulOf(a.type_id) === haul && a.delivery_day <= W.day).length;
  const cost = changed ? n * P.CABIN.refit[haul] * Math.min(1, (Math.abs(d.f - cur.f) + Math.abs(d.b - cur.b)) / 0.3) * cpi() : 0;
  const imp = changed ? cabImpact(pl, haul, D) : null;
  const sl = (k, max, v, lbl) => `<label class="cab-sl"><span>${lbl}</span><input type="range" id="cab-${haul}-${k}" min="0" max="${Math.round(max * 100)}" step="1" value="${Math.round(v * 100)}"><b id="cab-${haul}-${k}-v">${pctTxt(v)}</b></label>`;
  return `<div class="card pad stack scard"><div class="spread"><h3>${HAUL_LBL[haul]}</h3><span class="small muted">Beispiel ${tlx(ty)}</span></div>
    <div class="seg wrap">${CAB_PRESETS[haul].map(([l, f, b]) => `<button data-act="cabpre" data-h="${haul}" data-f="${f}" data-b="${b}" aria-pressed="${Math.abs(d.f - f) < 0.005 && Math.abs(d.b - b) < 0.005}">${l}</button>`).join('')}</div>
    ${haul === 'long' ? sl('f', C.maxF, d.f, 'First') : ''}${sl('b', Math.min(C.maxB, 1 - d.f), d.b, 'Business')}
    <div class="small muted">Economy: <b id="cab-${haul}-e">${pctTxt(1 - d.f - d.b)}</b> der Kabine</div>
    <div id="cab-${haul}-bar">${cabSeatBar(ty, D)}</div>
    ${changed ? `<div class="callout ${imp && imp.next < imp.now ? 'warn' : 'good'}">${imp ? `Prognose für Ihre ${imp.n} Strecke${imp.n > 1 ? 'n' : ''}: <b>${eur(imp.next - imp.now, { plus: true })} pro Tag</b> (Streckenbeitrag)` : 'Noch keine Strecken dieser Art – die Aufteilung gilt für alle künftigen.'}${n ? ` · Umbau von ${n} Flugzeug${n > 1 ? 'en' : ''}: ${eur(cost)}` : ''}</div>
      <div class="row"><button class="btn primary" data-act="cabsave" data-h="${haul}">Übernehmen</button><button class="btn" data-act="cabreset" data-h="${haul}">Verwerfen</button></div>` : `<p class="small muted">Aktuell: ${pctTxt(cur.f)} First · ${pctTxt(cur.b)} Business · ${pctTxt(1 - cur.f - cur.b)} Economy.</p>`}
  </div>`;
}
function mktTarget(pl, p) {
  const k = P.MARKETING_K * SM.lv3([1, 1.3, 1.6, 2], pl.skill('marketing')) * (P.MKT_K2 / P.MARKETING_K), A = p > 0 ? k * (1 - Math.exp(-p / P.MKT_SAT)) : 0;
  return Math.min(0.95, (A + 0.004) / (A + P.BRAND_DECAY * 0.5));
}
function mktCurve(pl, p) {
  const W2 = 260, H = 70, max = P.MKT_PCT_MAX, xs = Array.from({ length: 33 }, (_, i) => (i / 32) * max);
  const y = (x) => H - 6 - (1 - Math.exp(-x / P.MKT_SAT)) / (1 - Math.exp(-max / P.MKT_SAT)) * (H - 14);
  const path = xs.map((x, i) => `${i ? 'L' : 'M'}${(x / max * (W2 - 10) + 5).toFixed(1)} ${y(x).toFixed(1)}`).join(' ');
  return `<svg class="mkt-curve" viewBox="0 0 ${W2} ${H}" aria-hidden="true"><path d="${path}" fill="none" stroke="var(--c-markt)" stroke-width="2.5"/><line x1="5" x2="${W2 - 5}" y1="${H - 6}" y2="${H - 6}" stroke="var(--line-2)"/>
    <circle cx="${(p / max * (W2 - 10) + 5).toFixed(1)}" cy="${y(p).toFixed(1)}" r="5" fill="var(--accent)" stroke="var(--panel)" stroke-width="2"/><text x="5" y="10" class="mkt-t">Wirkung</text><text x="${W2 - 5}" y="${H - 9}" text-anchor="end" class="mkt-t">Anteil am Umsatz</text></svg>`;
}
VIEWS.strategy = function viewStrategy() {
  const pl = W.player, L = pl.ledger, rev30 = (pl.dayHist || []).slice(-30).reduce((a, x) => a + (x.g ? x.g[0] : x.rev || 0), 0), days = Math.min(30, (pl.dayHist || []).length) || 1;
  let html = `<h2 class="sec">Strategie <small>Kabinen, Marketing, Kundenbindung, Drehkreuze, Marktkontrolle</small></h2>`;
  // Kabinen
  html += `<div class="stack"><h2 class="sec sm">Kabinenaufteilung <small>gilt für alle Strecken der jeweiligen Art</small></h2>
    <p class="small ink2">Premiumsitze brauchen mehr Platz (Business auf Kurzstrecke 1,5, auf Langstrecke 3,4 Economy-Sitze, First 6) und bringen das ${NF1.format(P.CABIN.short.bizMult)}- bis ${NF1.format(P.CABIN.long.firstMult)}-Fache des Economy-Tarifs – wenn Geschäftsreisende da sind. Auf Ferienstrecken kosten sie vor allem Plätze. Das Bordprodukt (Basic/Standard/Premium) stellen Sie weiter je Strecke ein.</p>
    <div class="sgrid">${cabCard(pl, 'short')}${cabCard(pl, 'long')}</div></div>`;
  // Marketing
  const p = pl.mktPct || 0, mon = p * rev30 / days * 30.4, tgt = mktTarget(pl, p);
  html += `<div class="stack"><h2 class="sec sm">Marketing <small>Marke ${n0(pl.brand * 100)} / 100</small></h2><div class="card pad stack scard mkt">
    <div class="spread"><div class="seg wrap">${[0, 0.01, 0.02, 0.03, 0.05, 0.08].map((v) => `<button data-act="mktp" data-v="${v}" aria-pressed="${Math.abs(p - v) < 0.0005}">${v ? pctTxt(v) : 'aus'}</button>`).join('')}</div><span class="small muted">vom Umsatz</span></div>
    <div class="mkt-row">${mktCurve(pl, p)}<div class="stack" style="gap:4px"><span class="small muted">Kosten derzeit</span><b>${p ? `≈ ${eur(mon)} / Monat` : '–'}</b><span class="small muted">Marke langfristig</span><b>${n0(tgt * 100)} / 100</b></div></div>
    <p class="small muted">Das Budget wächst mit dem Umsatz. Die Wirkung sättigt: Die ersten 2–3 % bringen am meisten, ab 5 % fast nichts mehr dazu. Wettbewerber liegen bei 60–70, schlechte Pünktlichkeit kostet Punkte.</p></div></div>`;
  // Preisautomatik
  const nAp = pl.activeRoutes().filter((r) => r.ap).length, nAll = pl.activeRoutes().length, apT = pl.apDefault || pl.apLf || 0.85, apC = SM.apCfgOf(null, pl.apCfg);
  const nOwn = pl.activeRoutes().filter((r) => r.ap && r.apo && JSON.stringify(SM.apCfgOf(r)) !== JSON.stringify(apC)).length;
  html += `<div class="stack"><h2 class="sec sm">Preisautomatik <small>${nAp} von ${nAll} Strecken${pl.apDefault ? ' · auch für neue Strecken' : ''}</small></h2><div class="card pad stack scard">
    <p class="small muted" style="margin:0">Standard für alle Strecken mit Automatik${nOwn ? ` (${nOwn} Strecke${nOwn > 1 ? 'n haben' : ' hat'} eigene Einstellungen – eine Änderung hier überschreibt nur den geänderten Wert)` : ''}:</p>
    <div class="ap-box">${apRows(apC, apT, '', true)}</div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small primary" data-act="apall" data-on="1" data-v="${apT}">Für alle ${nAll} Strecken einschalten</button>${nAp ? '<button class="btn small" data-act="apall" data-on="0">überall aus</button>' : ''}</div>
    <p class="small muted">Einmal pro Woche verschiebt die Automatik jeden Tarif um höchstens das eingestellte Tempo – nach oben, wenn die Flüge voller sind als das Ziel, nach unten, wenn sie leerer sind. Nahe am Ziel (±2,5 Punkte) bleibt der Preis stehen; werden viele Reisende abgewiesen, wird der Preis nicht gesenkt. In Extremfällen (Einbruch, Ansturm, deutliche Unterbietung) greift sie sofort ein – täglich, bis zu 15 % je Schritt. Das Preisband begrenzt sie zwischen Untergrenze und Obergrenze, unter die Kostengrenze geht sie nie. Mit Business/First kann sie auch den Premiumaufschlag führen. Einzelne Strecken stellen Sie unter Strecken → Bearbeiten ab.</p></div></div>`;
  // Kundenbindung
  const lv = (pl.loyalty && pl.loyalty.lv) || 0, lf = pl.loyaltyFactor(W.day);
  html += `<div class="stack"><h2 class="sec sm">Vielfliegerprogramm ${lv ? `<small>${P.LOYALTY[lv].label} · Wirkung ${pct(lf)}</small>` : ''}</h2><div class="loy">${P.LOYALTY.map((x, i) => `<button class="loy-c${i === lv ? ' on' : ''}" data-act="loyalty" data-v="${i}" aria-pressed="${i === lv}"><b>${x.label}</b><span>${x.desc}</span>
      ${i ? `<em>Einführung ${eur(Math.max(0, x.setup - (lv && lv < i ? P.LOYALTY[lv].setup : 0)) * cpi())}${lv >= i ? ' (bezahlt)' : ''}</em><em>${eur(x.fixed * cpi())}/Monat + ${pct(x.cost, 1)} der Ticketerlöse</em><em>Partnererlöse ${pct(x.partner, 1)} · Geschäftsreisende +${n0(x.u.business * 100)}</em>` : '<em>keine Kosten</em>'}</button>`).join('')}</div>
    <p class="small muted">Meilen binden vor allem Geschäftsreisende: Sie buchen lieber bei Ihnen, auch wenn ein Konkurrent etwas billiger ist. Die Wirkung baut sich über sechs Monate auf und wächst mit der Größe Ihres Netzes (${pl.activeRoutes().length} Strecken).</p></div>`;
  // Drehkreuze
  const hubRows = pl.bases.map((B) => {
    const rs = pl.activeRoutes().filter((r) => r.base === B), hl = (pl.hubs && pl.hubs[B]) || 0, nx = P.HUB[hl + 1];
    let tr = 0, dem = 0, n = 0; for (const r of rs) { const h = r.hist.slice(-30); tr += h.reduce((a, x) => a + (x.tr_out || 0) + (x.tr_in || 0), 0); dem += h.reduce((a, x) => a + (x.trd || 0), 0); n = Math.max(n, h.length); }
    const trd = n ? tr / n / 2 : 0;
    const TR = P.TRANSFER, nLong = rs.filter((r) => r.role !== 'local' && SM.gcDistanceKm(r.base, r.dest) > 4000).length, attr = Math.min(TR.attrMax, TR.attrPerLong * nLong), conn = Math.max(0.6, TR.connH - TR.connHPerLv * hl);
    return `<tr><td><b class="mono">${B}</b> <span class="small muted">${esc(apName(B))}</span><div class="small muted" title="Viele Langstreckenziele machen ein Drehkreuz für Umsteiger attraktiver; jede Ausbaustufe verkürzt die Umsteigezeit.">Attraktivität +${pct(attr)} (${nLong} Langstrecke${nLong === 1 ? '' : 'n'}) · Umsteigen ${NF1.format(conn)} h${rs.some((r) => r.role === 'feeder') ? ` · ${rs.filter((r) => r.role === 'feeder').length} Zubringer` : ''}</div></td><td class="r">${rs.length}</td><td class="r">${n0(trd)}</td><td><div style="margin-bottom:4px"><span class="chip ${hl ? 'good' : ''}">${P.HUB[hl].label}</span></div>${nx ? `<button class="btn small ${rs.length >= nx.minRoutes ? 'primary' : ''}" data-act="hubup" data-apt="${B}" data-v="${hl + 1}" ${rs.length >= nx.minRoutes ? '' : 'disabled'} title="${esc(nx.desc)}">${nx.label}<span class="btn-sub">${eur(((nx.setup - (hl ? P.HUB[hl].setup : 0)) * SM.apx(B).cost) * cpi() * SM.softX(pl, 'hub', hl + 1))}${SM.softX(pl, 'hub', hl + 1) > 1 ? ' mit Aufschlag' : ''}</span></button>${rs.length < nx.minRoutes ? ` <span class="small muted">ab ${nx.minRoutes} Strecken</span>` : ''}` : '<span class="small muted">höchste Stufe</span>'}
      ${hl ? ` <button class="btn small" data-act="hubup" data-apt="${B}" data-v="${hl - 1}">zurückstufen</button>` : ''}</td></tr>`;
  }).join('');
  html += `<div class="stack"><div class="spread"><h2 class="sec sm">Drehkreuze <small>Umsteiger über Ihre Basen</small></h2><button class="btn small" data-act="tab" data-tab="hubs">Analyse: wohin Umsteiger reisen</button></div><div class="tw"><table class="t"><thead><tr><th>Basis</th><th class="r">Strecken</th><th class="r" title="Reisende pro Tag, die über die Basis umsteigen (je Reise einmal gezählt)">Umsteiger/Tag</th><th>Stufe · Ausbau</th></tr></thead><tbody>${hubRows}</tbody></table></div>
    <div class="hub-lv">${P.HUB.slice(1).map((x, i) => `<div><b>${i + 1}. ${x.label}</b><span>${x.desc}</span><em>ab ${x.minRoutes} Strecken · ${eur(x.monthly * cpi())}/Monat</em></div>`).join('')}</div>
    <p class="small muted">Jede Stufe macht Umsteigen bequemer (kürzere Umsteigezeit, abgestimmte Wellen, mehr sinnvolle Verbindungen) und bringt Geschäftsreisenden am Drehkreuz einen Heimvorteil. So wird auch ein kleinerer Flughafen zum Drehkreuz – Sie sind nicht auf London oder Frankfurt angewiesen. Umsteiger füllen freie Plätze: Am meisten bringt der Ausbau, wenn Ihre Flüge nicht schon voll sind.</p></div>`;
  // Marktkontrolle (Slots haben einen eigenen Reiter unter Strecken)
  const coordS = [...new Set([...pl.bases, ...pl.activeRoutes().flatMap((r) => [r.base, r.dest])])].filter((c) => P.AIRPORTS[c]).sort();
  const lockRows = coordS.map((c) => {
    const own = pl.gateLock && pl.gateLock[c], other = W.lockOwner(c), price = W.gateLockPrice(c);
    return `<tr><td><b class="mono">${c}</b> <span class="small muted">${esc(apName(c))} · ${NF1.format(SM.paxEff(c))} Mio. Pax/Jahr${W.aptObs && W.aptObs[c] ? ` <span title="Im Spiel gewachsen – ursprünglich ${NF1.format(P.AIRPORTS[c].pax || 0)} Mio.">↑</span>` : ''}</span></td>
      <td>${own ? `<span class="chip good">alle Gates bei Ihnen</span><div class="small muted">bis ${dateY(own.until || W.day)} · kein Kartellverfahren · Kündigung: ${eur(W.gateLockRefund(own))} zurück</div>` : other && other !== pl ? `<span class="chip crit">${esc(other.name)}</span>${other.gateLock[c].until ? `<div class="small muted">bis ${dateY(other.gateLock[c].until)}</div>` : ''}` : `${eur(price)} + ${eur(price * P.GATE_LOCK.monthlyRate)}/Monat<div class="small muted">${P.GATE_LOCK.years} Jahre</div>`}</td>
      <td>${own ? `<button class="btn small" data-act="gatelock" data-apt="${c}" data-on="0">kündigen</button>` : !other ? `<button class="btn small ${netCash(pl) >= price ? 'primary' : ''}" data-act="gatelock" data-apt="${c}" data-on="1">Exklusivvertrag<span class="btn-sub">${eurB(price)}</span></button>` : ''}</td></tr>`;
  }).join('');
  html += `<div class="stack"><h2 class="sec sm">Slots und Marktkontrolle</h2>
    <div class="callout info row" style="gap:8px;align-items:center"><span><b>Slots kaufen, Wartelisten und Vergabetermine</b> finden Sie jetzt unter Strecken → Slots. Nächste Vergabe: ${slotDateTxt()}.</span><button class="btn small" data-act="tab" data-tab="slots" style="margin-left:auto">Zu den Slots</button></div>
    ${lockRows ? `<div class="tw"><table class="t"><thead><tr><th>Flughafen in Ihrem Netz</th><th>Gate-Exklusivvertrag</th><th></th></tr></thead><tbody>${lockRows}</tbody></table></div>` : ''}
    <p class="small muted">Ein Gate-Exklusivvertrag ist ein genehmigtes Monopol: Andere Airlines können dort keine neuen Flüge mehr anbieten, bestehende bleiben. Die Wettbewerbsbehörde lässt ihn nur gegen einen sehr hohen Preis zu – er steigt mit der Größe des Flughafens überproportional (1 Mio. Pax ≈ ${eurB(8e6 * cpi())}, 5 Mio. ≈ ${eurB(8e6 * 5 ** 1.35 * cpi())}, 10 Mio. ≈ ${eurB(8e6 * 10 ** 1.35 * cpi())}), dazu ${pct(P.GATE_LOCK.monthlyRate, 1)} im Monat. Laufzeit ${P.GATE_LOCK.years} Jahre; solange gibt es dort kein Kartellverfahren, danach gilt wieder die Wettbewerbsaufsicht. Kündigung: ${pct(P.GATE_LOCK.refund)} des noch nicht genutzten Teils zurück.</p></div>`;
  return html;
};
// ---------------------------------------------------------------------------
// Strecken → Slots: kaufen und Warteliste ohne Streckenplanung, feste Vergabetermine
// ---------------------------------------------------------------------------
/** Reihum-Vergabe simulieren: total Slots auf die Einträge (Liste von Wünschen) verteilen. */
function rrAlloc(total, wants) { const got = wants.map(() => 0); let left = total, guard = 0; while (left > 0 && got.some((g, i) => g < wants[i]) && guard++ < 80) for (let i = 0; i < wants.length && left > 0; i++) if (got[i] < wants[i]) { got[i]++; left--; } return got; }
const slotAptOf = (v) => { const t = String(v || '').trim(), c = t.slice(0, 3).toUpperCase(); if (P.AIRPORTS[c] && (t.length === 3 || /^[A-Za-z]{3}\b/.test(t))) return c; const l = t.toLowerCase(); if (l.length < 3) return null; return SM.AP_CODES.find((x) => apName(x).toLowerCase() === l) || SM.AP_CODES.find((x) => apName(x).toLowerCase().startsWith(l)) || null; };
/** Alle Wartelisten im Spiel: filtern nach Airline und Flughafen – wer fragt wo wie viele Slots an. */
function allWaitHtml(pl) {
  const all = (W.slotWait || []).filter((e) => e.n > 0); if (!all.length) return '';
  const F = fltState('wl'), q = pickNorm(F.q || ''), als = [...new Set(all.map((e) => e.al))].map((id) => W.airlines[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const apts = [...new Set(all.map((e) => e.apt))].sort();
  const rows = [];
  for (const apt of apts) {
    const qu = W.waitQueue(apt).filter((e) => e.n > 0), fc = W.waitForecast(apt);
    qu.forEach((e, i) => { const a = W.airlines[e.al]; if (F.st && e.al !== F.st) return; if (q && !pickNorm(`${apt} ${apName(apt)} ${a ? a.name : ''}`).includes(q)) return; rows.push({ apt, e, a, pos: i + 1, of: qu.length, g: fc.byId[e.id] || 0 }); });
  }
  const sumN = rows.reduce((x, r) => x + r.e.n, 0);
  return foldCard('sl-all', `<h3>Alle Wartelisten <small class="muted">${all.length} Einträge an ${apts.length} Flughäfen</small></h3>`, `
    <div class="fltbar row"><select id="flt-st" data-flt="wl" aria-label="Airline"><option value="">Alle Airlines</option>${als.map((a) => `<option value="${a.id}" ${F.st === a.id ? 'selected' : ''}>${esc(a.name)}${a.id === pl.id ? ' (Sie)' : ''}</option>`).join('')}</select>
      <input type="search" id="flt-q" data-flt="wl" placeholder="Flughafen oder Airline suchen" value="${esc(F.q || '')}" aria-label="Suchen">${F.st || F.q ? '<button class="btn small ghost" data-act="fltclear" data-k="wl">Filter zurücksetzen</button>' : ''}</div>
    ${rows.length ? `<div class="tw"><table class="t"><thead><tr><th>Flughafen</th><th>Airline</th><th class="r">Slots</th><th class="r">Platz</th><th class="r">Prognose</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.e.al === pl.id ? 'me' : ''}"><td><b class="mono">${r.apt}</b> <span class="small muted">${esc(apName(r.apt))}</span></td><td>${r.a ? esc(r.a.name) : r.e.al}${r.e.al === pl.id ? ' (Sie)' : ''}<div class="small muted">${r.a ? `Rating ${n0(W.slotRating(r.a).score)}` : ''}${W.waitFirst(r.e) ? ' · Vorrang' : W.gotLastRound(r.e.al, r.apt) ? ' · kein Vorrang (Slot zuletzt erhalten)' : ''}${r.e.plan ? ' · für einen Plan' : ''}${waitExpires(r.e) ? ' · verfällt am 1. April' : ''}</div></td><td class="r">${r.e.n}</td><td class="r">${r.pos} von ${r.of}</td><td class="r ${r.g ? 'pos' : 'muted'}">${r.g} von ${r.e.n}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">${rows.length} Einträge · ${sumN} Slots angefragt · Prognose für die Vergabe am ${dateShort(SM.nextSlotDay(W.day).day)} (ohne Geldprüfung).</p>` : '<p class="small muted">Kein Eintrag passt zum Filter.</p>'}`);
}
/** Slot-Rating erklärt (Tooltip): Anteile der vier Bausteine. */
function ratingTip(al) {
  const r = W.slotRating(al), p = r.parts || {}, v = r.v || {};
  return `Slot-Rating ${n0(r.score)} von 100 – Flotte ${v.fleet ?? 0} (${pct(p.fleet || 0)}), Slots ${v.slots ?? 0} (${pct(p.slots || 0)}), Eigenkapital ${eurB(v.equity || 0)} (${pct(p.equity || 0)}), Ergebnis seit der letzten Vergabe ${eurB(v.profit || 0)} (${pct(p.profit || 0)}); jeweils im Verhältnis zur Größten im Spiel, je ein Viertel.`;
}
/** Wird dieser Eintrag am 1. April 2028 gekürzt (mehr als 3 Einträge der Airline, nur die frühesten bleiben)? */
function waitExpires(e) {
  if (SM.nextSlotDay(W.day).day < P.WAIT.from) return false;
  const mine = (W.slotWait || []).filter((x) => x.al === e.al); return mine.indexOf(e) >= P.WAIT.max;
}
/** Vorschau im Formular „Slots sichern“. */
function slotQuoteHtml(apt, n) {
  const pl = W.player; if (!apt) return '<p class="small muted">Flughafen eingeben – Code (z. B. FRA) oder Name.</p>';
  n = Math.max(1, Math.min(8, Math.round(n) || 1));
  const free = Math.max(0, W.slotsFree(apt) - W.waitBlock(apt, pl)), q = W.waitQueue(apt).filter((e) => e.n > 0), qn = q.reduce((a, e) => a + e.n, 0);
  const nsd = SM.nextSlotDay(W.day), total = Math.max(0, W.slotsFree(apt)) + 1, buyN = Math.min(n, free), ask = n - buyN || n, held = pl.heldAt(apt, W.day);
  // Prognose: heutige Liste und Liste mit der neuen Anfrage (sie kommt zu Ihrem Eintrag ohne Plan, sonst nach Flottengröße einsortiert) – reihum je einer
  const mineE = q.find((e) => e.al === pl.id && !e.plan), now = rrAlloc(total, q.map((e) => e.n));
  // neuer Eintrag: erster eigener am Flughafen → Vorrangplatz nach Größe; sonst ans Ende (Reihenfolge der Anmeldung)
  const sz = (e) => (W.airlines[e.al] ? W.slotRating(W.airlines[e.al]).score : 0), firstMine = !q.some((e) => e.al === pl.id), mySz = W.slotRating(pl).score;
  const at = firstMine ? q.filter((e) => W.waitFirst(e) && sz(e) <= mySz).length : q.length;
  const wants = q.map((e) => (e === mineE ? e.n + ask : e.n)); if (!mineE) wants.splice(at, 0, ask);
  const after = rrAlloc(total, wants), mineIdx = q.map((e, i) => (e.al === pl.id ? i : -1)).filter((i) => i >= 0);
  const myNow = mineIdx.reduce((a, i) => a + now[i], 0), myAsk = mineIdx.reduce((a, i) => a + q[i].n, 0);
  const extra = mineIdx.reduce((a, i) => a + after[!mineE && i >= at ? i + 1 : i], 0) + (mineE ? 0 : after[at]) - myNow;
  const list = q.length ? `<ol class="small slotq-list">${q.map((e, i) => { const a = W.airlines[e.al], me = e.al === pl.id; return `<li class="${me ? 'me' : ''}"><span>${a ? esc(a.name) : e.al}${me ? ' (Sie)' : ''}</span><span>${e.n} Slot${e.n > 1 ? 's' : ''}${me && e.plan ? ' für einen Plan' : ''}</span><span class="${now[i] ? 'pos' : 'muted'}">→ ${now[i]} am ${dateShort(nsd.day)}</span></li>`; }).join('')}</ol>` : '';
  const nTxt = total === 1 ? 'nur ein Slot' : `${total} Slots`;
  const why = q.length && extra < ask ? ` Vergeben wird ${nTxt}, reihum zuerst an die Einträge davor.${myNow ? ` ${myNow === total ? (total === 1 ? 'Er geht' : 'Sie gehen alle') : `${myNow} davon gehen`} schon an Ihre bisherigen Einträge (${myNow} von ${myAsk}).` : ''}` : '';
  return `<div class="slotq"><div class="slotstats"><div><span>sofort frei</span><b class="${free ? '' : 'neg'}">${free}</b>${free ? `<em>ab ${eurB(W.slotBuyPrice(apt, 1))} je Slot</em>` : '<em>voll</em>'}</div><div><span>Ihre Reserve</span><b>${held || '–'}</b></div><div><span>Warteliste</span><b>${q.length ? `${q.length} Eintr${q.length === 1 ? 'ag' : 'äge'} · ${qn} Slot${qn === 1 ? '' : 's'}` : 'leer'}</b></div><div><span>am ${dateShort(nsd.day)} zu vergeben</span><b>${total}</b><em>1 neuer + ${total - 1} freie</em></div></div>
    ${list}
    <div class="row" style="gap:6px;flex-wrap:wrap">${buyN ? `<button class="btn small primary" data-act="slotbuy" data-apt="${apt}" data-n="${buyN}">${buyN} sofort kaufen · ${eurB(W.slotBuyPrice(apt, buyN))}</button>` : ''}
      ${n > free || !free ? `<button class="btn small${buyN ? '' : ' primary'}" data-act="slotwait" data-apt="${apt}" data-n="${ask}">${ask} auf die Warteliste${mineE ? ' (zu Ihrem Eintrag)' : ` · Platz ${q.length + 1}`}</button>` : ''}</div>
    ${n > free || !free ? `<p class="small ${extra >= ask ? 'pos' : 'warnc'}">Prognose für ${dateLong(nsd.day)}: Mit dieser Anfrage bekämen Sie voraussichtlich <b>${extra} von ${ask}</b> ${myAsk ? 'weiteren ' : ''}Slot${ask > 1 ? 's' : ''}.${why} Bezahlt wird erst bei der Zuteilung (Tagespreis).</p>` : '<p class="small muted">Gekaufte Slots liegen in Ihrer Reserve, bis eine Strecke sie nutzt. Ungenutzt kosten sie die übliche Slotgebühr. Zurückgeben bringt 50 % des aktuellen Marktwerts – 80 %, wenn eine Airline vor Ort sie übernimmt.</p>'}</div>`;
}
function slotCardHtml(c, pl, nsd) {
  const free = Math.max(0, W.slotsFree(c) - W.waitBlock(c, pl)), bought = (pl.slotHold[c] || []).filter((h) => h.buy && h.until > W.day).reduce((a, h) => a + h.n, 0);
  const q = W.waitQueue(c), qn = q.reduce((a, e) => a + e.n, 0), mine = q.filter((e) => e.al === pl.id);
  const fc = q.length ? W.waitForecast(c) : null, total = Math.max(0, W.slotsFree(c)) + 1;
  const used = pl.activeRoutes().reduce((a, r) => a + (r.base === c || r.dest === c ? r.freq : 0), 0);
  const X = SM.apx(c), isBase = pl.bases.includes(c);
  const myTxt = mine.length ? mine.map((e) => { const g = fc.byId[e.id] || 0; return `<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><span>Platz <b>${W.waitPos(e)}</b> von ${q.length} · ${e.n} Slot${e.n > 1 ? 's' : ''}${e.plan ? ' für einen Plan' : ''}</span><span class="chip ${g >= e.n ? 'good' : g ? 'warn' : 'crit'}">am ${dateShort(nsd.day)} voraussichtlich ${g} von ${e.n}</span><button class="btn small ghost" data-act="slotleave" data-id="${e.id}">austragen</button></div>`; }).join('') : '';
  const queue = q.length ? `<details class="fold" data-keep="sq-${c}" ${ui.open && ui.open['sq-' + c] ? 'open' : ''}><summary><span class="small"><b>Warteliste ${c}</b> · ${q.length} Einträge, ${qn} Slots angefragt</span><span class="fold-hint">${ui.open && ui.open['sq-' + c] ? 'einklappen' : 'Reihenfolge'}</span></summary>
      <p class="small muted">Reihenfolge: Der erste Eintrag jeder Airline hat Vorrang – niedrigeres Slot-Rating zuerst (Flotte, Slots im Besitz, Eigenkapital, Ergebnis seit der letzten Vergabe), bei Gleichstand wer sich früher eingetragen hat. Weitere Einträge folgen danach in der Reihenfolge der Anmeldung. Vergeben wird reihum je ein Slot.</p>
      <ol class="small slotq-list">${q.map((e) => { const a = W.airlines[e.al], g = fc.byId[e.id] || 0; return `<li class="${e.al === pl.id ? 'me' : ''}"><span>${a ? esc(a.name) : e.al}${e.al === pl.id ? ' (Sie)' : ''}${a ? ` <span class="muted" title="${esc(ratingTip(a))}">· Rating ${n0(W.slotRating(a).score)}${W.waitFirst(e) ? ' · Vorrang' : W.gotLastRound(e.al, e.apt) ? ' · kein Vorrang (Slot zuletzt erhalten)' : ''}${waitExpires(e) ? ' · verfällt am 1. April' : ''}</span>` : ''}</span><span>${e.n} Slot${e.n > 1 ? 's' : ''}</span><span class="${g ? 'pos' : 'muted'}">→ ${g}</span></li>`; }).join('')}</ol></details>` : '';
  const buy = free > 0 ? `<button class="btn small" data-act="slotbuy" data-apt="${c}" data-n="1">1 kaufen · ${eurB(W.slotBuyPrice(c, 1))}</button>${free > 1 ? ` <button class="btn small" data-act="slotbuy" data-apt="${c}" data-n="all">alle ${free} · ${eurB(W.slotBuyPrice(c, free))}</button>` : ''}` : `<button class="btn small primary" data-act="slotwait" data-apt="${c}" data-n="1">${mine.some((e) => !e.plan) ? '+1 auf der Warteliste' : 'Auf die Warteliste'}</button>`;
  return `<div class="slotrow"><div class="slothead"><div><b class="mono">${c}</b> <span class="small muted">${esc(apName(c))}${isBase ? ' · Basis' : used ? '' : ' · noch nicht im Netz'}</span></div><span class="small muted" title="1 Slot je 200.000 Passagiere im Jahr. Einen Teil halten Airlines außerhalb des Spiels (Bestandsverkehr).">${W.slotCap[c] ?? X.simCap} Slots im Spiel</span></div>
    <div class="slotstats"><div><span>von Ihnen genutzt</span><b>${used}</b><em>tägliche Flüge</em></div><div><span>Ihre Reserve</span><b>${bought || '–'}</b><em>${bought ? (() => { const hs = (pl.slotHold[c] || []).filter((h) => h.buy && h.until > W.day && h.n > 0), first = Math.min(...hs.map((h) => (h.since ?? W.day) + P.SLOT_IDLE.days)); return `frei für neue Flüge · ungenutzt zurück am ${dateShort(first)}`; })() : 'keine'}</em></div><div><span>sofort frei</span><b class="${free <= 0 ? 'neg' : ''}">${free}</b><em>${free > 0 ? 'je ' + eurB(W.slotBuyPrice(c, 1)) : q.length ? 'gehen an die Warteliste' : 'voll'}</em></div><div><span>am ${dateShort(nsd.day)} zu vergeben</span><b>${q.length ? Math.min(total, qn) : '–'}</b><em>${q.length ? `an ${q.length} Wartende` : 'keine Warteliste'}</em></div></div>
    ${myTxt}${queue}
    <div class="row" style="gap:6px;flex-wrap:wrap">${buy}${bought ? ` <button class="btn small ghost" data-act="slotsell" data-apt="${c}">Reserve zurückgeben</button>` : ''}</div></div>`;
}
/** Ein- und ausblendbare Karten (Slots/Wartelisten): Zustand bleibt im Browser gespeichert. */
const FOLD_LS = 'skymarket-fold';
function foldPref(key, def = true) {
  if (ui.open && key in ui.open) return !!ui.open[key];
  try { const m = JSON.parse(localStorage.getItem(FOLD_LS) || '{}'); if (key in m) return !!m[key]; } catch (e) { /* privat */ }
  return def;
}
function foldCard(key, head, body, cls = 'card pad') {
  const o = foldPref(key);
  return `<details class="${cls} fold" data-keep="${key}" ${o ? 'open' : ''}><summary>${head}<span class="fold-hint">${o ? 'ausblenden' : 'einblenden'}</span></summary><div class="stack">${body}</div></details>`;
}
/** Ihre Slots: je Flughafen genutzt, Reserve (mit Rückgabedatum) und befristet gehaltene – wie die Liste der Wartelisten-Einträge. */
function mySlotsHtml(pl) {
  const num = (x) => (Number.isInteger(x) ? String(x) : NF1.format(x));
  const apts = [...new Set([...pl.bases, ...pl.activeRoutes().flatMap((r) => [r.base, r.dest]), ...Object.keys(pl.slotHold || {})])].filter((c) => P.AIRPORTS[c] && SM.apx(c).slots !== null);
  const rows = apts.map((c) => {
    const used = pl.activeRoutes().reduce((a, r) => a + (r.base === c || r.dest === c ? r.freq : 0), 0);
    const hs = (pl.slotHold[c] || []).filter((h) => h.until > W.day && h.n > 0), rs = hs.filter((h) => h.buy), ts = hs.filter((h) => !h.buy);
    const res = rs.reduce((a, h) => a + h.n, 0), tmp = ts.reduce((a, h) => a + h.n, 0);
    const back = res ? Math.min(...rs.map((h) => (h.since ?? W.day) + P.SLOT_IDLE.days)) : null, tUntil = tmp ? Math.min(...ts.map((h) => h.until)) : null;
    return { c, used, res, tmp, back, tUntil, tot: used + res + tmp };
  }).filter((x) => x.tot > 0).sort((a, b) => (pl.bases.includes(b.c) - pl.bases.includes(a.c)) || b.tot - a.tot || a.c.localeCompare(b.c));
  if (!rows.length) return '';
  const sum = (k) => rows.reduce((a, x) => a + x[k], 0);
  return foldCard('sl-mine', `<h3>Ihre Slots <small class="muted">${rows.length} ${rows.length === 1 ? 'Flughafen' : 'Flughäfen'} · ${num(sum('tot'))} Slots</small></h3>`, `
    <div class="row small" style="gap:6px;flex-wrap:wrap"><span class="chip">${num(sum('used'))} genutzt</span><span class="chip">${sum('res')} in Reserve</span>${sum('tmp') ? `<span class="chip">${sum('tmp')} befristet</span>` : ''}</div>
    <div class="stack" style="gap:6px">${rows.map((x) => { const soon = x.back !== null && x.back - W.day <= P.SLOT_IDLE.warn;
      return `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><b class="mono">${x.c}</b><span class="small">${esc(apName(x.c))}${pl.bases.includes(x.c) ? ' · Basis' : ''} · ${num(x.used)} genutzt${x.res ? ` · ${x.res} in Reserve, ungenutzt zurück am ${dateShort(x.back)}` : ''}${x.tmp ? ` · ${x.tmp} befristet bis ${dateShort(x.tUntil)}` : ''}</span><span class="chip ${soon ? 'warn' : 'good'}">${num(x.tot)} Slot${x.tot === 1 ? '' : 's'}</span>${x.res ? `<button class="btn small" data-act="slotsell" data-apt="${x.c}">Reserve zurückgeben</button>` : ''}</div>`; }).join('')}</div>
    <p class="small muted">Genutzt = tägliche Flüge, die dort starten oder landen. Reserve = freie Slots, die Ihnen gehören; sie gehen nach 6 Monaten ungenutzt an den Flughafen zurück. Flughäfen ohne Slotpflicht fehlen hier.</p>`);
}
VIEWS.slots = function viewSlots() {
  const pl = W.player, nsd = SM.nextSlotDay(W.day), nsIn = nsd.day - W.day;
  const allQ = W.slotWait || [], myQ = allQ.filter((e) => e.al === pl.id);
  const qApts = [...new Set(allQ.map((e) => e.apt))];
  let give = 0, ask = 0; for (const a of qApts) { const q = allQ.filter((e) => e.apt === a), n = q.reduce((s, e) => s + e.n, 0); ask += n; give += Math.min(n, Math.max(0, W.slotsFree(a)) + 1); }
  let myGot = 0, myAsk = 0; for (const e of myQ) { myAsk += e.n; myGot += W.waitForecast(e.apt).byId[e.id] || 0; }
  const coord = [...new Set([...pl.bases, ...pl.activeRoutes().flatMap((r) => [r.base, r.dest]), ...(ui.slotExtra || []), ...myQ.map((e) => e.apt), ...Object.keys(pl.slotHold || {})])].filter((c) => P.AIRPORTS[c]).sort((a, b) => (pl.bases.includes(b) - pl.bases.includes(a)) || a.localeCompare(b));
  const st = ui.slotForm = ui.slotForm || { apt: '', n: 1 };
  let html = `<h2 class="sec">Slots <small>kaufen, Warteliste, Vergabetermine</small></h2>
    <div class="slotdate"><div><span class="small muted">Nächste Slotvergabe</span><b>${dateLong(nsd.day)}</b><span class="small">${nsd.summer ? 'Sommerflugplan' : 'Winterflugplan'} · in ${nsIn} Tag${nsIn === 1 ? '' : 'en'}</span></div>
      <div class="slotsum"><div><span>Flughäfen mit Warteliste</span><b>${qApts.length}</b></div><div><span>angefragt / vergeben</span><b>${ask} / ${give}</b></div><div><span>Ihre Einträge</span><b>${myQ.length ? `${myGot} von ${myAsk}` : '–'}</b><em>${myQ.length ? `Slots voraussichtlich · ${myQ.length} von ${nsd.day >= P.WAIT.from ? P.WAIT.max : P.WAIT.maxOld} Einträgen` : 'keine'}</em></div><div title="${esc(ratingTip(pl))}"><span>Ihr Slot-Rating</span><b>${n0(W.slotRating(pl).score)}</b><em>von 100 · niedriger = früher dran</em></div></div>
      ${(() => { const o = foldPref('sl-rules'); return `<details class="fold" data-keep="sl-rules" ${o ? 'open' : ''}><summary><b class="small">Regeln der Slotvergabe</b><span class="fold-hint">${o ? 'ausblenden' : 'einblenden'}</span></summary>`; })()}<ol class="small"><li>Vergeben wird nur am <b>1. April</b> und <b>1. Oktober</b>.</li><li>Dann bekommt jeder Flughafen einen Slot dazu; mit den schon freien gehen sie reihum an die Warteliste – je Eintrag einer, dann der Nächste.</li><li>Der erste Eintrag jeder Airline hat Vorrang – niedrigeres <b>Slot-Rating</b> zuerst, egal wann eingetragen; bei Gleichstand zählt der frühere Eintrag. Weitere Einträge derselben Airline stehen danach in der Reihenfolge der Anmeldung.</li><li>Wer bei der letzten Vergabe an einem Flughafen einen Slot von der Warteliste bekommen hat, hat dort beim nächsten Mal keinen Vorrang – seine Einträge stehen nach Anmeldezeit hinter den Vorrangplätzen.</li><li>Slot-Rating (0–100): je ein Viertel Flotte (inkl. Bestellungen), Slots im Besitz, Eigenkapital und Ergebnis seit der letzten Vergabe – jeweils gemessen an der größten Airline im Spiel.</li><li>Ab der Vergabe am 1. April 2028 höchstens ${P.WAIT.max} Einträge je Airline; weitere verfallen dann (die frühesten bleiben).</li><li>Bezahlt wird bei der Zuteilung. Fehlt dann das Geld, rückt der Nächste vor.</li><li>Freie Slots ohne Warteschlange können Sie jederzeit sofort kaufen – auch ohne Strecke.</li></ol></details></div>
    ${mySlotsHtml(pl)}
    ${myQ.length ? foldCard('sl-wait', `<h3>Ihre Wartelisten-Einträge <small class="muted">${myQ.length}${nsd.day >= P.WAIT.from ? ` von höchstens ${P.WAIT.max}` : ''}</small></h3>`, `
      <div class="stack" style="gap:6px">${myQ.map((e) => { const g = W.waitForecast(e.apt).byId[e.id] || 0, pl0 = e.plan && (pl.plans || []).find((x) => x.id === e.plan);
        return `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><b class="mono">${e.apt}</b><span class="small">${esc(apName(e.apt))} · ${e.n} Slot${e.n > 1 ? 's' : ''}${pl0 ? ` für Plan ${pl0.base}–${pl0.dest}` : ''} · Platz ${W.waitPos(e)}${W.waitFirst(e) ? ' (Vorrang)' : W.gotLastRound(pl.id, e.apt) ? ' (kein Vorrang – Slot bei der letzten Vergabe erhalten)' : ''}${waitExpires(e) ? ' · verfällt am 1. April' : ''}</span><span class="chip ${g >= e.n ? 'good' : g ? 'warn' : 'crit'}">voraussichtlich ${g} von ${e.n}</span><button class="btn small" data-act="slotleave" data-id="${e.id}">Austragen</button></div>`; }).join('')}</div>
      <p class="small muted">Austragen geht jederzeit und kostet nichts – bezahlt wird erst bei der Zuteilung.</p>`) : ''}
    ${allWaitHtml(pl)}
    <div class="card pad stack"><h3>Slots sichern <small class="muted">ohne Streckenplanung</small></h3>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><label class="f" style="flex:3;min-width:200px"><span>Flughafen</span><input type="search" id="slot-apt" list="slot-apts" placeholder="Code oder Name, z. B. FRA" value="${esc(st.apt ? st.apt + ' · ' + apName(st.apt) : '')}" autocomplete="off"></label>
        <label class="f" style="flex:1;min-width:90px"><span>Anzahl</span><input type="number" id="slot-n" min="1" max="8" value="${st.n}"></label></div>
      <datalist id="slot-apts">${SM.AP_CODES.slice().sort((a, b) => apName(a).localeCompare(apName(b))).map((c) => `<option value="${c} · ${esc(apName(c))}">`).join('')}</datalist>
      <div id="slot-q">${slotQuoteHtml(st.apt, st.n)}</div></div>`;
  html += foldCard('sl-apts', `<h3 class="sec sm">Ihre Flughäfen <small>Basen, Strecken, Reserven und Wartelisten</small></h3>`, coord.length ? `<div class="stack" style="gap:8px">${coord.map((c) => slotCardHtml(c, pl, nsd)).join('')}</div>` : '<p class="small muted">Noch kein Flughafen im Netz.</p>', 'slfold') + `
    <p class="small muted">Jeder tägliche Flug belegt einen Slot an beiden Enden. Zu jeder Basis gehören drei Slots (ab der ${P.BASE_RULE.extraFrom}. Basis zwei), die bei der Eröffnung gekauft werden. Neue Strecken nutzen zuerst Ihre Reserve, fehlende Slots werden zum Tagespreis gekauft – je knapper ein Flughafen, desto teurer. Ist er voll, tragen Sie sich hier auf die Warteliste ein oder speichern die Strecke als Plan (Strecken → Pläne). Slots in der Reserve, die 6 Monate ungenutzt bleiben, gehen an den Flughafen zurück (Erstattung wie bei „Reserve zurückgeben“, Hinweis 30 Tage vorher); neue Strecken verbrauchen immer die älteste Reserve zuerst.</p>`;
  return html;
};
function strategySummary(pl) {
  const c = cabCur(pl), lv = (pl.loyalty && pl.loyalty.lv) || 0, hubs = Object.entries(pl.hubs || {}).filter(([, v]) => v);
  return `<div class="ssum"><span><em>Kabine Kurzstrecke</em><b>${c.short.b ? pctTxt(c.short.b) + ' Business' : 'nur Economy'}</b></span><span><em>Kabine Langstrecke</em><b>${c.long.f || c.long.b ? `${c.long.f ? pctTxt(c.long.f) + ' F · ' : ''}${pctTxt(c.long.b)} B` : 'nur Economy'}</b></span>
    <span><em>Marketing</em><b>${pl.mktPct ? pctTxt(pl.mktPct) + ' vom Umsatz' : pl.marketing ? eur(pl.marketing) + '/Monat' : 'aus'}</b></span><span><em>Vielflieger</em><b>${lv ? P.LOYALTY[lv].label : 'keins'}</b></span><span><em>Preisautomatik</em><b>${pl.activeRoutes().filter((r) => r.ap).length} Strecken</b></span>
    <span><em>Drehkreuze</em><b>${hubs.length ? hubs.map(([a, v]) => `${a} ${v}`).join(', ') : 'keins'}</b></span></div>`;
}
function onStrategyClick(act, b) {
  if (!['cabpre', 'cabsave', 'cabreset', 'mktp', 'loyalty', 'hubup', 'slotbuy', 'slotsell', 'gatelock', 'slotwait', 'slotleave'].includes(act)) return false;
  if (act === 'slotwait') { const n = Math.max(1, Number(b.dataset.n) || 1), r = doAction({ type: 'slotWait', apt: b.dataset.apt, n }); if (r.ok) { ui.slotExtra = [...new Set([...(ui.slotExtra || []), b.dataset.apt])]; toast(`Warteliste ${b.dataset.apt}: Platz ${r.pos} · Vergabe ${dateShort(SM.nextSlotDay(W.day).day)}.`); } refreshAll(); return true; }
  if (act === 'slotleave') { doAction({ type: 'slotWaitLeave', id: b.dataset.id }); refreshAll(); return true; }
  const pl = W.player, h = b.dataset.h;
  if (act === 'cabpre') { ui.cabDraft = ui.cabDraft || cabCur(pl); ui.cabDraft[h] = { f: Number(b.dataset.f), b: Number(b.dataset.b) }; renderPane(true); return true; }
  if (act === 'cabreset') { ui.cabDraft = ui.cabDraft || cabCur(pl); ui.cabDraft[h] = cabCur(pl)[h]; renderPane(true); return true; }
  if (act === 'cabsave') { const d = ui.cabDraft[h], r = doAction({ type: 'setCabin', haul: h, f: d.f, b: d.b }); if (r.ok) { toast(r.cost ? `Kabinen umgebaut (${eur(r.cost)}).` : 'Kabinenaufteilung übernommen.'); ui.cabDraft = null; ui.cabImp = {}; } refreshAll(); return true; }
  if (act === 'mktp') { doAction({ type: 'marketingPct', v: Number(b.dataset.v) }); refreshAll(); return true; }
  if (act === 'loyalty') { const v = Number(b.dataset.v), r = doAction({ type: 'loyalty', lv: v }); if (r.ok) toast(v ? `${P.LOYALTY[v].label} aktiv.` : 'Programm eingestellt.'); refreshAll(); return true; }
  if (act === 'hubup') { const r = doAction({ type: 'hubLevel', apt: b.dataset.apt, lv: Number(b.dataset.v) }); if (r.ok) toast(`${b.dataset.apt}: ${P.HUB[Number(b.dataset.v)].label}.`); refreshAll(); return true; }
  if (act === 'slotbuy') { const n = b.dataset.n === 'all' ? 'all' : Number(b.dataset.n), r = doAction({ type: 'buySlots', apt: b.dataset.apt, n }); if (r.ok) ui.slotExtra = [...new Set([...(ui.slotExtra || []), b.dataset.apt])]; if (r.ok) toast(`${r.n} Slot${r.n > 1 ? 's' : ''} in ${b.dataset.apt} gekauft.`); refreshAll(); return true; }
  if (act === 'slotsell') { const r = doAction({ type: 'sellSlots', apt: b.dataset.apt, n: 'all' }); if (r.ok) toast(`${r.n} Slots zurückgegeben (${eur(r.back)}).`); refreshAll(); return true; }
  if (act === 'gatelock') { const on = b.dataset.on === '1', r = doAction({ type: 'gateLock', apt: b.dataset.apt, on }); if (r.ok && on) toast(`Alle Gates in ${b.dataset.apt} gehören jetzt Ihnen.`); refreshAll(); return true; }
  return false;
}
/** Kabinen-Regler: live mitschreiben, beim Loslassen neu rechnen. */
function onCabRange(e, final) {
  const t = e.target, m = t.id && t.id.match(/^cab-(short|long)-(f|b)$/); if (!m) return false;
  const pl = W.player, D = ui.cabDraft || (ui.cabDraft = cabCur(pl)), [, h, k] = m;
  D[h] = { ...D[h], [k]: Number(t.value) / 100 };
  if (D[h].f + D[h].b > 1) D[h].b = Math.max(0, 1 - D[h].f);
  if (final) { renderPane(true); return true; }
  const v = $(`#cab-${h}-${k}-v`); if (v) v.textContent = pctTxt(D[h][k]);
  const e2 = $(`#cab-${h}-e`); if (e2) e2.textContent = pctTxt(1 - D[h].f - D[h].b);
  const bar = $(`#cab-${h}-bar`); if (bar) bar.innerHTML = cabSeatBar(cabExampleType(pl, h), D);
  return true;
}

// ---------- Filter: je Basis, je Muster, je Strecke ----------
/** Entfernungsfilter (Netz, Streckenplanung, Märkte): feste Bereiche oder eigene Spanne. */
const KM_BANDS = [['', 'Alle Entfernungen'], ['0-800', 'bis 800 km'], ['800-2000', '800–2.000 km'], ['2000-4500', '2.000–4.500 km'], ['4500-8000', '4.500–8.000 km'], ['8000-', 'über 8.000 km'], ['own', 'Eigene Spanne …']];
function kmRange(F) {
  if (!F || !F.km) return [0, Infinity];
  const [a, b] = F.km === 'own' ? [F.kmin, F.kmax] : F.km.split('-');
  const lo = Number(a) || 0, hi = b === '' || b === undefined || b === null || !(Number(b) > 0) ? Infinity : Number(b);
  return [lo, Math.max(lo, hi)];
}
const kmOk = (F, km) => { const [a, b] = kmRange(F); return km >= a && km <= b; };
const kmLabel = (F) => { if (F.km !== 'own') return (KM_BANDS.find(([k]) => k === F.km) || ['', ''])[1]; const [a, b] = kmRange(F); return b === Infinity ? `ab ${n0(a)} km` : `${n0(a)}–${n0(b)} km`; };
function kmFilter(kind) {
  const F = fltState(kind);
  return `<select id="flt-km" data-flt="${kind}" aria-label="Entfernung">${KM_BANDS.map(([k, l]) => `<option value="${k}" ${(F.km || '') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>${F.km === 'own' ? `<span class="row kmown"><input type="number" id="flt-kmin" data-flt="${kind}" min="0" step="100" inputmode="numeric" placeholder="ab km" value="${esc(String(F.kmin ?? ''))}" aria-label="ab Kilometer"><span class="small muted">bis</span><input type="number" id="flt-kmax" data-flt="${kind}" min="0" step="100" inputmode="numeric" placeholder="bis km" value="${esc(String(F.kmax ?? ''))}" aria-label="bis Kilometer"><span class="small muted">km</span></span>` : ''}`;
}
function fltState(kind = 'routes') { ui.flts = ui.flts || {}; return ui.flts[kind] || (ui.flts[kind] = { base: '', type: '', q: '', st: '', sort: '', dir: '' }); }
/** Netz sortieren: Kennzahl und Richtung (auf- oder absteigend). */
const ROUTE_SORT = { '': ['Eröffnung', 'asc', (r) => r.opened_day], name: ['Ziel A–Z', 'asc', (r) => apName(r.dest)], db2: ['DB2 pro Tag', 'desc', (r) => { const s = rstats(r, 30); return s.n ? s.db2 / s.n : -Infinity; }],
  rev: ['Umsatz pro Tag', 'desc', (r) => { const s = rstats(r, 30); return s.n ? s.rev / s.n : -Infinity; }], lf: ['Auslastung', 'desc', (r) => { const s = rstats(r, 30); return s.n ? s.lf : -Infinity; }],
  pax: ['Passagiere pro Tag', 'desc', (r) => { const s = rstats(r, 30); return s.n ? s.pax / s.n : -Infinity; }], freq: ['Frequenz', 'desc', (r) => r.freq], km: ['Entfernung', 'desc', (r) => SM.gcDistanceKm(r.base, r.dest)] };
function routeDir(F) { return F.dir || (ROUTE_SORT[F.sort] || ROUTE_SORT['']) [1]; }
/** 0.21.41: Flotte sortieren – Einsatzzeit, Auslastung der geflogenen Strecken, Alter, C-Check, Muster. */
function acLf(a) {   // Ø Auslastung der Strecken, die das Flugzeug heute fliegt (30 Tage, nach Sitzen)
  const pl = W.player; let pax = 0, so = 0;
  for (const id of a.assigned || []) { const r = pl.routes.find((x) => x.id === id); if (!r) continue; const s = rstats(r, 30); pax += s.pax; so += s.so; }
  return so > 0 ? pax / so : null;
}
const FLEET_SORT = { '': ['Reihenfolge', 'asc', (a) => W.player.fleet.indexOf(a)], use: ['Einsatzzeit pro Tag', 'desc', (a) => (a.delivery_day > W.day ? -1 : a.used_hours || 0)],
  lf: ['Auslastung der Flüge', 'desc', (a) => { const x = acLf(a); return x === null ? -1 : x; }], age: ['Alter', 'desc', (a) => W.player.acAge(a, W.day)],
  cc: ['nächster C-Check', 'asc', (a) => P.CCHECK_FH - (a.fh - a.lastC)], type: ['Muster', 'asc', (a) => tl(a.type_id)], base: ['Basis', 'asc', (a) => a.base] };
function sortDir(kind, F) { const S = kind === 'fleet' ? FLEET_SORT : ROUTE_SORT; return F.dir || (S[F.sort] || S['']) [1]; }
function sortFleet(list) {
  const F = fltState('fleet'), S = FLEET_SORT[F.sort] || FLEET_SORT[''], d = sortDir('fleet', F) === 'asc' ? 1 : -1, key = new Map(list.map((a) => [a, S[2](a)]));
  return list.slice().sort((a, b) => { const x = key.get(a), y = key.get(b); return (typeof x === 'string' ? x.localeCompare(y, 'de') : x - y) * d || W.player.fleet.indexOf(a) - W.player.fleet.indexOf(b); });
}
function sortRoutes(list) {
  const F = fltState('routes'), S = ROUTE_SORT[F.sort] || ROUTE_SORT[''], d = routeDir(F) === 'asc' ? 1 : -1, key = new Map(list.map((r) => [r, S[2](r)]));
  return list.slice().sort((a, b) => { const x = key.get(a), y = key.get(b); return (typeof x === 'string' ? x.localeCompare(y, 'de') : x - y) * d || a.opened_day - b.opened_day; });
}
function fltBar(kind) {
  const pl = W.player, F = fltState(kind);
  const types = [...new Set([...pl.fleet.map((a) => a.type_id), ...pl.activeRoutes().map((r) => r.type_id)])].sort();
  const any = F.base || F.type || F.q || F.st || F.sort || F.dir || F.km;
  return `<div class="fltbar row">${pl.bases.length > 1 ? `<select id="flt-base" data-flt="${kind}" aria-label="Basis"><option value="">Alle Basen</option>${pl.bases.map((b) => `<option value="${b}" ${F.base === b ? 'selected' : ''}>Basis ${b}</option>`).join('')}</select>` : ''}
    ${types.length > 1 ? `<select id="flt-type" data-flt="${kind}" aria-label="Flugzeugmuster"><option value="">Alle Muster</option>${types.map((t) => `<option value="${t}" ${F.type === t ? 'selected' : ''}>${esc(tl(t))}</option>`).join('')}</select>` : ''}
    ${kind === 'routes' ? kmFilter('routes') : ''}
    ${kind === 'routes' ? `<select id="flt-st" data-flt="routes" aria-label="Status"><option value="">Alle Strecken</option><option value="neg" ${F.st === 'neg' ? 'selected' : ''}>nur im Minus</option><option value="full" ${F.st === 'full' ? 'selected' : ''}>nur voll (über 90 %)</option><option value="low" ${F.st === 'low' ? 'selected' : ''}>nur schwach (unter 65 %)</option></select>` : ''}
    ${kind === 'fleet' ? `<select id="flt-st" data-flt="fleet" aria-label="Status"><option value="">Alle Flugzeuge</option><option value="fly" ${F.st === 'fly' ? 'selected' : ''}>im Einsatz</option><option value="idle" ${F.st === 'idle' ? 'selected' : ''}>ungenutzt</option><option value="maint" ${F.st === 'maint' ? 'selected' : ''}>in Wartung</option><option value="coming" ${F.st === 'coming' ? 'selected' : ''}>in Lieferung</option></select>` : ''}
    <input type="search" id="flt-q" data-flt="${kind}" placeholder="${kind === 'fleet' ? 'Kennung oder Muster' : 'Ziel suchen'}" value="${esc(F.q)}" aria-label="Suchen">
    ${kind === 'routes' || kind === 'fleet' ? `<select id="flt-sort" data-flt="${kind}" aria-label="Sortieren nach">${Object.entries(kind === 'fleet' ? FLEET_SORT : ROUTE_SORT).map(([k, v]) => `<option value="${k}" ${(F.sort || '') === k ? 'selected' : ''}>Sortieren: ${v[0]}</option>`).join('')}</select><button class="btn small" data-act="fltdir" data-k="${kind}" aria-label="Reihenfolge umkehren">${sortDir(kind, F) === 'asc' ? '↑ aufsteigend' : '↓ absteigend'}</button>` : ''}
    ${any ? `<button class="btn small ghost" data-act="fltclear" data-k="${kind}">Filter zurücksetzen</button>` : ''}</div>`;
}
function fltRoute(r) {
  const F = fltState('routes'), q = pickNorm(F.q);
  if (F.base && r.base !== F.base) return false;
  if (F.type && r.type_id !== F.type) return false;
  if (F.km && !kmOk(F, SM.gcDistanceKm(r.base, r.dest))) return false;
  if (q && !pickNorm(`${r.base} ${r.dest} ${apName(r.dest)} ${apName(r.base)}`).includes(q)) return false;
  if (F.st) { const s = rstats(r, 30); if (F.st === 'neg' && !(s.n && s.db2 < 0)) return false; if (F.st === 'full' && !(s.n && s.lf > 0.9)) return false; if (F.st === 'low' && !(s.n && s.lf < 0.65)) return false; }
  return true;
}
function fltAc(a) {
  const F = fltState('fleet'), q = pickNorm(F.q);
  if (F.base && a.base !== F.base) return false;
  if (F.type && a.type_id !== F.type) return false;
  if (q && !pickNorm(`${acName(a.id)} ${a.id} ${tl(a.type_id)} ${a.type_id}`).includes(q)) return false;
  if (F.st) {
    const maint = (a.status === 'ccheck' || a.status === 'aog') && a.until > W.day, coming = a.delivery_day > W.day, fly = a.used_hours > 0 && !maint;
    if (F.st === 'fly' && !fly) return false; if (F.st === 'idle' && (fly || maint || coming)) return false; if (F.st === 'maint' && !maint) return false; if (F.st === 'coming' && !coming) return false;
  }
  return true;
}
function onFltChange(t) {
  if (!/^flt-(base|type|st|sort|km|kmin|kmax|range)$/.test(t.id) || !t.dataset.flt) return false;
  if (t.dataset.flt === 'plan') readPlanner();   // eingetippte Werte der Planung nicht verlieren
  { const F = fltState(t.dataset.flt), k = t.id.slice(4);
    if (k === 'range') F.range = t.checked;
    else if (k === 'kmin' || k === 'kmax') F[k] = t.value === '' ? '' : Math.max(0, Math.round(Number(t.value) || 0));
    else { F[k] = t.value; if (k === 'sort') F.dir = ''; if (k === 'km' && t.value === 'own' && F.kmin === undefined) { F.kmin = ''; F.kmax = ''; } } }
  renderPane(true);
  if (t.id === 'flt-km' && t.value === 'own') { const i = $('#flt-kmin'); if (i) i.focus(); }
  return true;
}
function onFltInput(t) {
  if (t.id !== 'flt-q') return false;
  fltState(t.dataset.flt).q = t.value; renderPane(true);
  const q = $('#flt-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  return true;
}

// ---------- Verlauf: Ergebnis Tag für Tag und Monat für Monat ----------
const HG_COLORS = ['var(--good)', 'var(--c-finanzen)', 'var(--c-karte)', 'var(--c-unternehmen)', 'var(--c-flotte)', 'var(--c-markt)', 'var(--crit)', 'var(--ink-3)'];
function histDays() {
  const pl = W.player, h = pl.dayHist || [], ch = pl.ledger.cashHist || [];
  return h.map((x, i) => ({ ...x, cash: x.cash ?? ch[ch.length - (h.length - i)] ?? null }));
}
function histGroupsHtml(g, rev) {
  if (!g) return '<p class="small muted">Für diesen Tag gibt es noch keine Aufschlüsselung (erst ab Version 0.13.3 gespeichert).</p>';
  const max = Math.max(1, ...g.map((x) => Math.abs(x)));
  return `<div class="hgroups">${SM.DAY_GROUPS.map((l, i) => (g[i] ? `<div class="hg"><span class="hg-l"><i style="background:${HG_COLORS[i]}"></i>${l}</span><span class="hg-t"><b style="width:${(Math.abs(g[i]) / max * 100).toFixed(1)}%;background:${HG_COLORS[i]}"></b></span><span class="hg-v ${g[i] < 0 ? 'neg' : 'pos'}">${eur(g[i], { plus: true })}${i && rev > 0 ? ` <em>${pct(-g[i] / rev)}</em>` : ''}</span></div>` : '')).join('')}</div>`;
}
VIEWS.history = function viewHistory() {
  const pl = W.player, L = pl.ledger, H = ui.hist || (ui.hist = { mode: 'd30', sel: null });
  const seg = `<div class="seg">${[['d30', '30 Tage'], ['d90', '90 Tage'], ['m', 'Monate']].map(([k, l]) => `<button data-act="hmode" data-v="${k}" aria-pressed="${H.mode === k}">${l}</button>`).join('')}</div>`;
  let html = `<div class="spread"><h2 class="sec">Verlauf <small>${H.mode === 'm' ? 'Ergebnis je Monat' : 'Ergebnis Tag für Tag'}</small></h2>${seg}</div>`;
  if (H.mode === 'm') {
    H.view = null;
    const y0 = dateParts(0).y;
    const ms = L.months.map((m, i) => ({ i, lab: MONTHS[m.label.m], full: `${MONTHS[m.label.m]} ${y0 + (m.label.y || 0)}`, acc: m.acc })).concat([{ i: 'cur', lab: MONTHS[dateParts(W.day).m] + '*', full: `${MONTHS[dateParts(W.day).m]} ${dateParts(W.day).y} (bis heute)`, acc: L.month, cur: true }]);
    const rows = ms.map((x) => { const c = pnlCol(x.acc); return { ...x, net: c.net, rev: c.rev, g: SM.dayGroupsOf(x.acc) }; });
    const sel = rows.find((x) => String(x.i) === String(H.selM)) || rows[rows.length - 1];
    const mx = Math.max(1, ...rows.map((x) => Math.abs(x.net)));
    html += `<div class="hchart" role="list">${rows.map((x) => `<button class="hb${x === sel ? ' on' : ''}" data-act="hselm" data-v="${x.i}" title="${x.lab}: ${eur(x.net, { plus: true })}"><span class="hb-up">${x.net > 0 ? `<i class="pos" style="height:${(x.net / mx * 100).toFixed(1)}%"></i>` : ''}</span><span class="hb-dn">${x.net < 0 ? `<i class="neg" style="height:${(-x.net / mx * 100).toFixed(1)}%"></i>` : ''}</span><em>${x.lab}</em></button>`).join('')}</div>`;
    html += `<div class="card pad stack hdetail"><div class="spread"><div><span class="small muted">${sel.cur ? 'Laufender Monat' : 'Monat'}</span><h3 style="margin:0">${sel.full}</h3></div><b class="hbig ${sgn(sel.net)}">${eur(sel.net, { plus: true })}</b></div>
      ${histGroupsHtml(sel.g, sel.rev)}</div>`;
    html += `<div class="tw"><table class="t hlist"><thead><tr><th>Monat</th><th class="r">Erlöse</th><th class="r">Kosten</th><th class="r">Ergebnis</th></tr></thead><tbody>${rows.slice().reverse().map((x) => `<tr data-act="hselm" data-v="${x.i}" class="${x === sel ? 'on' : ''}"><td>${x.full}</td><td class="r">${eur(x.rev)}</td><td class="r">${eur(x.net - x.rev)}</td><td class="r ${sgn(x.net)}"><b>${eur(x.net, { plus: true })}</b></td></tr>`).join('')}</tbody></table></div>`;
    return html;
  }
  html += histFilterBar();
  if (H.view) return html + histFilteredHtml(H);
  const all = histDays(), n = H.mode === 'd90' ? 90 : 30, days = all.slice(-n);
  if (!days.length) return html + '<p class="small muted">Noch kein abgeschlossener Spieltag. Lassen Sie die Zeit laufen.</p>';
  const sel = days.find((x) => x.d === H.sel) || days[days.length - 1], si = all.indexOf(sel);
  const mx = Math.max(1, ...days.map((x) => Math.abs(x.net)));
  const sum = (k) => days.reduce((a, x) => a + (x[k] || 0), 0), net = sum('net');
  html += `<div class="tiles"><div class="tile"><span>Ergebnis ${days.length} Tage</span><b class="${sgn(net)}">${eur(net, { plus: true })}</b><em>Ø ${eur(net / days.length, { plus: true })} pro Tag</em></div>
    <div class="tile"><span>Beste / schwächste</span><b class="pos">${eur(Math.max(...days.map((x) => x.net)), { plus: true })}</b><em>schwächster Tag <span class="${sgn(Math.min(...days.map((x) => x.net)))}">${eur(Math.min(...days.map((x) => x.net)), { plus: true })}</span></em></div>
    <div class="tile"><span>Passagiere</span><b>${n0(sum('pax'))}</b><em>${sum('seats') ? `Auslastung ${pct(sum('pax') / sum('seats'))}` : 'noch keine Flüge'}</em></div></div>`;
  html += `<div class="hchart${n > 40 ? ' dense' : ''}">${days.map((x) => `<button class="hb${x === sel ? ' on' : ''}" data-act="hsel" data-v="${x.d}" title="${dateShort(x.d)}: ${eur(x.net, { plus: true })}"><span class="hb-up">${x.net > 0 ? `<i class="pos" style="height:${(x.net / mx * 100).toFixed(1)}%"></i>` : ''}</span><span class="hb-dn">${x.net < 0 ? `<i class="neg" style="height:${(-x.net / mx * 100).toFixed(1)}%"></i>` : ''}</span></button>`).join('')}</div>
    <div class="hax small muted"><span>${dateShort(days[0].d)}</span><span>Tippen Sie auf einen Tag</span><span>${dateShort(days[days.length - 1].d)}</span></div>`;
  const lf = sel.seats ? sel.pax / sel.seats : null;
  html += `<div class="card pad stack hdetail"><div class="spread"><button class="btn small" data-act="hsel" data-v="${all[si - 1] ? all[si - 1].d : sel.d}" ${si > 0 ? '' : 'disabled'} aria-label="Vortag">‹</button>
      <div style="text-align:center"><span class="small muted">${dateLong(sel.d)}</span><div class="hbig ${sgn(sel.net)}">${eur(sel.net, { plus: true })}</div></div>
      <button class="btn small" data-act="hsel" data-v="${all[si + 1] ? all[si + 1].d : sel.d}" ${si < all.length - 1 ? '' : 'disabled'} aria-label="Folgetag">›</button></div>
    <div class="hchips">${[['Passagiere', n0(sel.pax || 0)], ['Auslastung', lf === null ? '–' : pct(lf)], ['Flüge', n0(sel.fl || 0)], ['verspätet', n0(sel.late || 0)], ['ausgefallen', n0(sel.canc || 0)], ['Kontostand', sel.cash === null ? '–' : eur(sel.nc ?? sel.cash)]].map(([l, v]) => `<span><em>${l}</em><b>${v}</b></span>`).join('')}</div>
    ${histGroupsHtml(sel.g, sel.g ? sel.g[0] : sel.rev)}
    ${cfDayHtml(sel)}
    <p class="small muted">Erlöse aus Tickets, Zusatzleistungen, Fracht und Charter; Kosten nach Gruppen, Prozent = Anteil an den Erlösen des Tages. Einmalkosten sind z. B. Basen, Strafen oder Flugzeugrückgaben.</p></div>`;
  html += `<div class="tw"><table class="t hlist"><thead><tr><th>Tag</th><th class="r">Pax</th><th class="r">Ausl.</th><th class="r">Erlöse</th><th class="r">Kosten</th><th class="r">Ergebnis</th><th class="r">Kontostand</th></tr></thead><tbody>${days.slice().reverse().map((x) => { const rev = x.g ? x.g[0] : x.rev;
    return `<tr data-act="hsel" data-v="${x.d}" class="${x === sel ? 'on' : ''}"><td>${dateShort(x.d)}</td><td class="r">${n0(x.pax || 0)}</td><td class="r">${x.seats ? pct(x.pax / x.seats) : '–'}</td><td class="r">${eur(rev || 0)}</td><td class="r">${eur((x.net || 0) - (rev || 0))}</td><td class="r ${sgn(x.net)}"><b>${eur(x.net, { plus: true })}</b></td><td class="r">${x.cash === null ? '–' : eur(x.nc ?? x.cash)}${cfTop(x) ? `<div class="small muted">${cfTop(x)}</div>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  return html;
};
/** 0.21.61: Geldbewegungen ohne Ergebniswirkung an einem Tag (Kauf, Tilgung, Dividende, Dispo …). */
const CF_SKIP_TOP = new Set(['credit_draw', 'credit_repay']);
function cfTop(x) {
  if (!x.cf) return '';
  const e = Object.entries(x.cf).filter(([k]) => !CF_SKIP_TOP.has(k)).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  return e && Math.abs(e[1]) >= 1e4 ? `${esc(CF_LABEL[e[0]] || e[0])} ${eur(e[1], { plus: true })}` : '';
}
function cfDayHtml(x) {
  if (!x.cf) return '';
  const rows = Object.entries(x.cf).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const sum = rows.reduce((a, [, v]) => a + v, 0);
  return `<div class="stack" style="gap:4px"><b class="small">Geldbewegungen ohne Ergebniswirkung</b>${rows.map(([k, v]) => `<div class="spread small"><span>${esc(CF_LABEL[k] || k)}</span><b class="${sgn(v)}">${eur(v, { plus: true })}</b></div>`).join('')}
    <p class="small muted" style="margin:0">Ergebnis ${eur(x.net, { plus: true })} ${sum >= 0 ? '+' : '−'} Geldbewegungen ${eur(Math.abs(sum))} = Veränderung des Kontostands. Der Kontostand zeigt Guthaben abzüglich genutztem Dispo.</p></div>`;
}
function histFilterBar() {
  const pl = W.player, H = ui.hist, rs = pl.routes.filter((r) => r.hist.length).sort((a, b) => a.base.localeCompare(b.base) || a.dest.localeCompare(b.dest));
  const types = [...new Set(rs.map((r) => r.type_id))].sort();
  if (!rs.length) return '';
  return `<div class="fltbar row"><label class="f" style="flex:1;min-width:220px"><span>Ansicht</span><select id="hist-view"><option value="">Ganze Airline (alle Erlöse und Kosten)</option>
    ${pl.bases.length > 1 ? `<optgroup label="Je Basis">${pl.bases.map((b) => `<option value="b:${b}" ${H.view === 'b:' + b ? 'selected' : ''}>Basis ${b} · ${esc(apName(b))}</option>`).join('')}</optgroup>` : ''}
    <optgroup label="Je Flugzeugmuster">${types.map((t) => `<option value="t:${t}" ${H.view === 't:' + t ? 'selected' : ''}>${esc(tl(t))}</option>`).join('')}</optgroup>
    <optgroup label="Je Strecke">${rs.map((r) => `<option value="r:${r.id}" ${H.view === 'r:' + r.id ? 'selected' : ''}>${r.base}–${r.dest} · ${esc(apName(r.dest))}${r.closed ? ' (eingestellt)' : ''}</option>`).join('')}</optgroup></select></label></div>`;
}
/** Tageswerte einer Auswahl von Strecken aus deren Verlauf (bis 60 Tage): Streckenbeitrag statt Gesamtergebnis. */
function histSeries(view) {
  const pl = W.player, [k, v] = [view.slice(0, 1), view.slice(2)];
  const rs = pl.routes.filter((r) => (k === 'b' ? r.base === v : k === 't' ? r.type_id === v : r.id === v));
  const by = new Map();
  for (const r of rs) {
    const fix = SM.aircraftDayFixedGeneric(r.type_id) * SM.acShareOf(r.type_id, pl.rotH(r), r.freq) / Math.max(1, r.freq) * r.freq;
    r.hist.forEach((h, i) => {
      const d = h.d || (W.day - (r.hist.length - i));
      const x = by.get(d) || { d, rev: 0, cost: 0, fix: 0, pax: 0, seats: 0, fl: 0, late: 0, canc: 0, prem: 0, tr: 0, n: 0 };
      x.rev += h.rev || 0; x.cost += h.cost || 0; x.fix += fix; x.pax += h.pax || 0; x.seats += SM.opSeats(h, 'out') + SM.opSeats(h, 'in');   // Sitze der geflogenen Flüge x.fl += h.flights || 0; x.late += h.late || 0; x.canc += h.cancelled || 0; x.prem += h.prem || 0; x.tr += (h.tr_out || 0) + (h.tr_in || 0); x.n++;
      by.set(d, x);
    });
  }
  return { rs, days: [...by.values()].sort((a, b) => a.d - b.d).map((x) => ({ ...x, net: x.rev - x.cost - x.fix })) };
}
function histFilteredHtml(H) {
  const { rs, days: all } = histSeries(H.view), n = H.mode === 'd90' ? 90 : 30, days = all.slice(-n);
  const lbl = H.view.startsWith('b:') ? `Basis ${H.view.slice(2)}` : H.view.startsWith('t:') ? tl(H.view.slice(2)) : (() => { const r = rs[0]; return r ? `${r.base}–${r.dest}` : ''; })();
  if (!days.length) return '<p class="small muted">Für diese Auswahl gibt es noch keine Flugtage.</p>';
  const sel = days.find((x) => x.d === H.sel) || days[days.length - 1], si = all.indexOf(sel), mx = Math.max(1, ...days.map((x) => Math.abs(x.net)));
  const sum = (k) => days.reduce((a, x) => a + (x[k] || 0), 0), net = sum('net');
  let html = `<p class="small muted">${esc(lbl)}: ${rs.length} Strecke${rs.length === 1 ? '' : 'n'} · Werte je Tag = Streckenbeitrag (Erlöse − direkte Flugkosten − Flugzeugzeit), ohne Gemeinkosten wie Verwaltung, Gehälter oder Basen. Strecken speichern höchstens 60 Tage.</p>
    <div class="tiles"><div class="tile"><span>Streckenbeitrag ${days.length} Tage</span><b class="${sgn(net)}">${eur(net, { plus: true })}</b><em>Ø ${eur(net / days.length, { plus: true })} pro Tag</em></div>
    <div class="tile"><span>Erlöse</span><b>${eur(sum('rev'))}</b><em>${sum('pax') ? `${eur(sum('rev') / sum('pax'))} je Passagier` : ''}</em></div>
    <div class="tile"><span>Passagiere</span><b>${n0(sum('pax'))}</b><em>${sum('seats') ? `Auslastung ${pct(sum('pax') / sum('seats'))}` : ''}${sum('prem') ? ` · ${n0(sum('prem'))} Premium` : ''}</em></div></div>
    <div class="hchart${days.length > 40 ? ' dense' : ''}">${days.map((x) => `<button class="hb${x === sel ? ' on' : ''}" data-act="hsel" data-v="${x.d}" title="${dateShort(x.d)}: ${eur(x.net, { plus: true })}"><span class="hb-up">${x.net > 0 ? `<i class="pos" style="height:${(x.net / mx * 100).toFixed(1)}%"></i>` : ''}</span><span class="hb-dn">${x.net < 0 ? `<i class="neg" style="height:${(-x.net / mx * 100).toFixed(1)}%"></i>` : ''}</span></button>`).join('')}</div>
    <div class="hax small muted"><span>${dateShort(days[0].d)}</span><span>Tippen Sie auf einen Tag</span><span>${dateShort(days[days.length - 1].d)}</span></div>`;
  const g = [Math.round(sel.rev), -Math.round(sel.cost), -Math.round(sel.fix)], mxg = Math.max(1, ...g.map(Math.abs));
  html += `<div class="card pad stack hdetail"><div class="spread"><button class="btn small" data-act="hsel" data-v="${all[si - 1] ? all[si - 1].d : sel.d}" ${si > 0 ? '' : 'disabled'} aria-label="Vortag">‹</button>
      <div style="text-align:center"><span class="small muted">${dateLong(sel.d)} · ${esc(lbl)}</span><div class="hbig ${sgn(sel.net)}">${eur(sel.net, { plus: true })}</div></div>
      <button class="btn small" data-act="hsel" data-v="${all[si + 1] ? all[si + 1].d : sel.d}" ${si < all.length - 1 ? '' : 'disabled'} aria-label="Folgetag">›</button></div>
    <div class="hchips">${[['Passagiere', n0(sel.pax)], ['Auslastung', sel.seats ? pct(sel.pax / sel.seats) : '–'], ['Premium', n0(sel.prem)], ['Umsteiger', n0(sel.tr)], ['Flüge', n0(sel.fl)], ['verspätet', n0(sel.late)], ['ausgefallen', n0(sel.canc)]].map(([l, v]) => `<span><em>${l}</em><b>${v}</b></span>`).join('')}</div>
    <div class="hgroups">${[['Erlöse', g[0], 'var(--good)'], ['Direkte Flugkosten', g[1], 'var(--c-karte)'], ['Flugzeugzeit', g[2], 'var(--c-flotte)']].map(([l, v, c]) => `<div class="hg"><span class="hg-l"><i style="background:${c}"></i>${l}</span><span class="hg-t"><b style="width:${(Math.abs(v) / mxg * 100).toFixed(1)}%;background:${c}"></b></span><span class="hg-v ${v < 0 ? 'neg' : 'pos'}">${eur(v, { plus: true })}</span></div>`).join('')}</div></div>`;
  html += `<div class="tw"><table class="t hlist"><thead><tr><th>Tag</th><th class="r">Pax</th><th class="r">Ausl.</th><th class="r">Erlöse</th><th class="r">Kosten</th><th class="r">Beitrag</th></tr></thead><tbody>${days.slice().reverse().map((x) => `<tr data-act="hsel" data-v="${x.d}" class="${x === sel ? 'on' : ''}"><td>${dateShort(x.d)}</td><td class="r">${n0(x.pax)}</td><td class="r">${x.seats ? pct(x.pax / x.seats) : '–'}</td><td class="r">${eur(x.rev)}</td><td class="r">${eur(-(x.cost + x.fix))}</td><td class="r ${sgn(x.net)}"><b>${eur(x.net, { plus: true })}</b></td></tr>`).join('')}</tbody></table></div>`;
  return html;
}
function onHistClick(act, b) {
  if (!['hmode', 'hsel', 'hselm'].includes(act)) return false;
  const H = ui.hist || (ui.hist = { mode: 'd30', sel: null });
  if (act === 'hmode') H.mode = b.dataset.v;
  else if (act === 'hsel') H.sel = Number(b.dataset.v);
  else H.selM = b.dataset.v;
  renderPane(true); return true;
}

// ---------- Durchsuchbare Auswahllisten ----------
// Jede Auswahl mit vielen Einträgen bekommt statt der nativen Liste ein Suchfeld. Die echte <select> bleibt (versteckt) bestehen,
// damit alle bisherigen Abläufe (value, change-Ereignis) unverändert funktionieren.
const PICK_MIN = 7;
const pickNorm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
function pickLabel(sel) { const o = sel.options[sel.selectedIndex]; return o ? o.textContent : ''; }
function enhanceSelects(root = document) {
  for (const sel of root.querySelectorAll('select')) {
    if (sel.dataset.nopick !== undefined || sel.closest('.speed, .map-tools, .pick-pop')) continue;
    const btn = sel.nextElementSibling && sel.nextElementSibling.classList.contains('pick-btn') ? sel.nextElementSibling : null;
    if (sel.options.length < PICK_MIN) { if (btn) { btn.remove(); sel.classList.remove('picked'); } continue; }
    if (btn) { const t = pickLabel(sel); if (btn.firstChild.textContent !== t) btn.firstChild.textContent = t; btn.disabled = sel.disabled; continue; }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pick-btn'; b.disabled = sel.disabled;
    if (sel.getAttribute('style')) b.setAttribute('style', sel.getAttribute('style'));
    b.setAttribute('aria-haspopup', 'listbox');
    const lab = sel.closest('label'); if (lab) { const sp = lab.querySelector(':scope > span'); if (sp) b.setAttribute('aria-label', sp.textContent); }
    b.innerHTML = '<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>';
    b.firstChild.textContent = pickLabel(sel);
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openPicker(sel, b); });
    sel.classList.add('picked'); sel.after(b);
    sel.addEventListener('change', () => { if (b.isConnected) b.firstChild.textContent = pickLabel(sel); });
  }
}
function closePicker() { const p = ui.picker; ui.picker = null; if (p) { p.el.remove(); p.back && p.back.remove(); if (p.btn && p.btn.isConnected) p.btn.focus({ preventScroll: true }); } }
function openPicker(sel, btn) {
  closePicker();
  const items = []; let group = null;
  for (const el of sel.querySelectorAll('option, optgroup')) {
    if (el.tagName === 'OPTGROUP') { group = el.label; items.push({ head: el.label }); continue; }
    items.push({ v: el.value, t: el.textContent, dis: el.disabled, g: group, n: pickNorm(el.textContent + ' ' + el.value + ' ' + (group || '')) });
  }
  const phone = isPhone(), id = sel.id, el = document.createElement('div');
  el.className = 'pick-pop' + (phone ? ' sheet' : ''); el.setAttribute('role', 'dialog');
  const title = btn.getAttribute('aria-label') || 'Auswahl';
  el.innerHTML = `${phone ? `<div class="pick-head"><b>${esc(title)}</b><button type="button" class="btn small" data-pk="close">Schließen</button></div>` : ''}
    <input type="search" class="pick-q" placeholder="Suchen … (Name, Code, Land)" autocomplete="off" spellcheck="false" aria-label="Suchen">
    <div class="pick-list" role="listbox"></div><div class="pick-n small muted"></div>`;
  let back = null;
  if (phone) { back = document.createElement('div'); back.className = 'pick-back'; back.addEventListener('click', closePicker); document.body.appendChild(back); }
  document.body.appendChild(el);
  if (!phone) {
    const r = btn.getBoundingClientRect(), w = Math.max(r.width, 280), vh = window.innerHeight, below = vh - r.bottom - 12, above = r.top - 12;
    el.style.width = Math.min(w, window.innerWidth - 16) + 'px';
    el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    if (below >= 260 || below >= above) { el.style.top = (r.bottom + 4) + 'px'; el.style.maxHeight = Math.max(200, Math.min(380, below)) + 'px'; }
    else { el.style.bottom = (vh - r.top + 4) + 'px'; el.style.maxHeight = Math.max(200, Math.min(380, above)) + 'px'; }
  }
  const q = el.querySelector('.pick-q'), list = el.querySelector('.pick-list'), cnt = el.querySelector('.pick-n');
  let shown = [], act = 0;
  const draw = () => {
    const terms = pickNorm(q.value).split(/\s+/).filter(Boolean);
    shown = items.filter((x) => x.head === undefined && (!terms.length || terms.every((t) => x.n.includes(t))));
    const exact = terms.length === 1 ? shown.findIndex((x) => pickNorm(x.v) === terms[0]) : -1;
    if (exact > 0) shown.unshift(shown.splice(exact, 1)[0]);   // exakter Code (z. B. „CDG“) nach oben
    act = Math.max(0, shown.findIndex((x) => x.v === sel.value && !terms.length));
    let lastG = null, h = '';
    shown.forEach((x, i) => {
      if (!terms.length && x.g && x.g !== lastG) { h += `<div class="pick-g">${esc(x.g)}</div>`; lastG = x.g; }
      h += `<button type="button" role="option" class="pick-o${x.v === sel.value ? ' cur' : ''}${i === act ? ' act' : ''}" data-i="${i}" ${x.dis ? 'disabled' : ''} aria-selected="${x.v === sel.value}">${esc(x.t)}</button>`;
    });
    list.innerHTML = h || '<div class="pick-none small muted">Nichts gefunden.</div>';
    cnt.textContent = terms.length ? `${shown.length} von ${items.filter((x) => x.head === undefined).length}` : '';
    const a = list.querySelector('.act'); if (a) a.scrollIntoView({ block: 'nearest' });
  };
  const choose = (i) => {
    const x = shown[i]; if (!x || x.dis) return;
    const s = sel.isConnected ? sel : (id ? document.getElementById(id) : null);
    closePicker();
    if (!s) return;
    if (s.value !== x.v) { s.value = x.v; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }
    const b2 = s.nextElementSibling; if (b2 && b2.classList.contains('pick-btn')) b2.firstChild.textContent = pickLabel(s);
  };
  const move = (d) => { if (!shown.length) return; act = (act + d + shown.length) % shown.length; list.querySelectorAll('.pick-o').forEach((o) => o.classList.toggle('act', Number(o.dataset.i) === act)); const a = list.querySelector('.act'); if (a) a.scrollIntoView({ block: 'nearest' }); };
  q.addEventListener('input', draw);
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(act); } else if (e.key === 'Escape') { e.preventDefault(); closePicker(); } else if (e.key === 'Tab') closePicker();
  });
  list.addEventListener('click', (e) => { const o = e.target.closest('.pick-o'); if (o) choose(Number(o.dataset.i)); });
  el.addEventListener('click', (e) => { if (e.target.closest('[data-pk=close]')) closePicker(); });
  ui.picker = { el, back, btn, sel };
  draw();
  q.focus({ preventScroll: true });
}
document.addEventListener('pointerdown', (e) => { const p = ui.picker; if (p && !p.el.contains(e.target) && !(p.btn && p.btn.contains(e.target)) && !(p.back && p.back.contains(e.target))) closePicker(); }, true);
window.addEventListener('resize', () => { if (ui.picker && !isPhone()) closePicker(); });
let pickQueued = false;
new MutationObserver(() => { if (pickQueued) return; pickQueued = true; requestAnimationFrame(() => { pickQueued = false; enhanceSelects(); }); }).observe(document.documentElement, { childList: true, subtree: true });

// ---------- Finanzen ----------
const PNL_ROWS = [
  ['grp', 'Erlöse'], ['rev_ticket', 'Tickets'], ['rev_ancillary', 'Zusatzleistungen'], ['rev_cargo', 'Fracht'], ['rev_acmi', 'ACMI-Charter'], ['subsidy', 'Regionalförderung'],
  ['grp', 'Flugbetrieb'], ['fuel', 'Treibstoff'], ['hedge', 'Kerosin-Absicherung'], ['crew', 'Crew-Spesen'], ['maintenance', 'Wartung'], ['navigation', 'Flugsicherung'],
  ['landing', 'Landeentgelte'], ['handling', 'Abfertigung'], ['pax_fees', 'Passagierentgelte'], ['pax_service', 'Bordservice'], ['distribution', 'Vertrieb'], ['cargo_cost', 'Frachtkosten'], ['disruption', 'Störungen'],
  ['grp', 'Personal'], ['staff_cockpit', 'Cockpit'], ['staff_cabin', 'Kabine'], ['staff_tech', 'Technik'], ['staff_extra', 'Agentur, Überstunden, Recruiting'], ['experts', 'Fachkräfte'],
  ['grp', 'Flugzeuge, Standorte, Verwaltung'], ['lease', 'Leasing'], ['depreciation', 'Abschreibung'], ['insurance', 'Versicherung'], ['stations', 'Stationen und Hangars'], ['slots', 'Slotentgelte'],
  ['marketing', 'Marketing'], ['loyalty', 'Kundenbindung'], ['overhead', 'Verwaltung'], ['one_off', 'Einmalkosten'], ['trade', 'Handel mit Airlines'],
  ['ebit', 'Betriebsergebnis (EBIT)'], ['interest', 'Zinsen'], ['invest', 'Beteiligungen (anteiliger Gewinn, Verkäufe)'], ['tax', 'Steuern'], ['net', 'Jahresüberschuss'],
];
const PNL_ACCOUNTS_EBIT = SM.PNL_ACCOUNTS.filter((k) => k !== 'interest' && k !== 'tax' && k !== 'invest');
function pnlCol(acc) {
  const v = (k) => (acc[k] || 0) / 100;
  const ebit = PNL_ACCOUNTS_EBIT.reduce((s, k) => s + v(k), 0);
  return { v, ebit, net: ebit + v('interest') + v('invest') + v('tax'), rev: v('rev_ticket') + v('rev_ancillary') + v('rev_cargo') + v('rev_acmi') };
}
// ---------------------------------------------------------------------------
// Finanzbericht: GuV (top-down), Ergebnis nach Herkunft (bottom-up), Kapitalfluss, Bilanz, Eigenkapitalspiegel – jede Summe mit Abstimmung
// ---------------------------------------------------------------------------
const PNL_GROUPS = [
  { k: 'rev', l: 'Erlöse', acc: ['rev_ticket', 'rev_ancillary', 'rev_cargo', 'rev_acmi', 'subsidy'] },
  { k: 'ops', l: 'Flugbetrieb (direkte Kosten)', acc: ['fuel', 'hedge', 'crew', 'maintenance', 'navigation', 'landing', 'handling', 'pax_fees', 'pax_service', 'distribution', 'cargo_cost', 'disruption'] },
  { sub: 'db1', l: 'Deckungsbeitrag I', hint: 'Erlöse minus Flugbetrieb', of: ['rev', 'ops'] },
  { k: 'staff', l: 'Personal', acc: ['staff_cockpit', 'staff_cabin', 'staff_tech', 'staff_extra', 'experts'] },
  { k: 'fix', l: 'Flugzeuge, Standorte, Vertrieb, Verwaltung', acc: ['lease', 'depreciation', 'insurance', 'stations', 'slots', 'marketing', 'loyalty', 'overhead', 'one_off', 'trade'] },
  { sub: 'ebit', l: 'Betriebsergebnis (EBIT)', of: ['rev', 'ops', 'staff', 'fix'] },
  { k: 'fin', l: 'Finanzergebnis', acc: ['interest', 'invest'] },
  { k: 'tax', l: 'Steuern', acc: ['tax'] },
  { sub: 'net', l: 'Jahresüberschuss', hint: 'Ergebnis nach Steuern', of: ['rev', 'ops', 'staff', 'fix', 'fin', 'tax'] },
];
const ACC_LABEL = Object.fromEntries(PNL_ROWS.filter(([k]) => k !== 'grp').map(([k, l]) => [k, l]));
const accGroup = (k) => { const g = PNL_GROUPS.find((x) => x.acc && x.acc.includes(k)); return g ? g.k : 'fix'; };
const CF_LABEL = { start: 'Startkapital (Gründung)', capex: 'Flugzeugkäufe', asset_sale: 'Flugzeugverkäufe (Erlös)', deposit: 'Leasing-Kautionen gezahlt', deposit_back: 'Leasing-Kautionen zurück', slots: 'Slotkäufe', slots_sale: 'Slotverkäufe (Erlös)',
  stake_buy: 'Aktienkäufe (Beteiligungen)', stake_sell: 'Aktienverkäufe', ma: 'Übernahme: Kaufpreis', ma_cash: 'Übernahme: übernommene Kasse', loan_draw: 'Kredite aufgenommen', loan_repay: 'Kredite getilgt', credit_draw: 'Dispo in Anspruch genommen',
  credit_repay: 'Dispo zurückgeführt', bond: 'Anleihe ausgegeben', bond_repay: 'Anleihe zurückgezahlt', equity_issue: 'Kapitalerhöhung', buyback: 'Aktienrückkauf', dividend: 'Dividenden und Ausschüttungen', admin: 'Zuschuss oder Korrektur der Spielleitung',
  rescue: 'Rettungskapital', lease_deferred: 'Nachzahlung gestundeter Leasingraten', debt_swap: 'Schulden gegen Aktien (ohne Geldfluss)' };
const CF_INV = ['capex', 'asset_sale', 'deposit', 'deposit_back', 'slots', 'slots_sale', 'stake_buy', 'stake_sell', 'ma', 'ma_cash'];
const CF_FIN = ['start', 'loan_draw', 'loan_repay', 'credit_draw', 'credit_repay', 'bond', 'bond_repay', 'equity_issue', 'buyback', 'dividend', 'admin', 'rescue'];
const sumO = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
const ec = (c) => eur((c || 0) / 100);   // Cent → Anzeige
const okMark = (diff) => (Math.abs(diff) < 100 ? '<span class="pos" title="stimmt auf den Euro">✓ stimmt</span>' : `<span class="neg">Abweichung ${ec(diff)}</span>`);
/** Zeiträume des Berichts: laufender Monat, abgeschlossene Monate mit Aufschlüsselung, seit Gründung bzw. Beginn der Aufzeichnung. */
function finPeriods(pl) {
  const L = pl.ledger, F = L.fx, D = L.det, now = { cash: L.cash, ec: L.equityContrib, ni: sumO(L.pnl) };
  const split = (acc) => { const pnl = {}, cf = {}; for (const [k, v] of Object.entries(acc || {})) { if (k.startsWith('cf_')) cf[k.slice(3)] = v; else pnl[k] = v; } return { pnl, cf }; };
  const out = [{ k: 'cur', label: `${MONTHS[dateParts(W.day).m]} (lfd.)`, ...split(L.month), det: D ? D.m : null, fx: F ? { m0: F.m0, m1: now, nc: F.nc, eq: F.meq } : null }];
  for (let i = L.months.length - 1; i >= 0; i--) { const m = L.months[i]; if (!m.det && !m.fx) continue; out.push({ k: 'm' + i, label: `${MONTHS[m.label.m]} ${2027 + (m.label.y || 0)}`, ...split(m.acc), det: m.det || null, fx: m.fx || null }); }
  const since = F && F.t0.day !== null && F.t0.day !== undefined ? `seit ${dateShortY(F.t0.day)}` : 'seit Gründung';
  out.push({ k: 'all', label: since, pnl: L.pnl, cf: F ? F.cf : {}, det: D ? D.p : null, fx: F ? { m0: F.t0, m1: now, nc: F.tnc, eq: F.eq, all: true } : null });
  return out;
}
function finPeriod(pl) { const ps = finPeriods(pl); return ps.find((p) => p.k === ui.finP) || ps[0]; }
function finPeriodBar(pl) {
  const ps = finPeriods(pl), cur = finPeriod(pl).k;
  return `<div class="row fin-per" style="gap:6px;flex-wrap:wrap;align-items:center"><span class="small muted">Zeitraum für Herkunft, Kapitalfluss und Eigenkapital:</span><div class="seg wrap">${ps.map((p) => `<button data-act="finp" data-v="${p.k}" aria-pressed="${p.k === cur}">${esc(p.label)}</button>`).join('')}</div></div>`;
}
const finOpen = (k, def = false) => { const o = ui.finOpen || (ui.finOpen = {}); return o[k] === undefined ? def : o[k]; };
const finRow = (k, def, label, cells, cls = '') => `<tr class="fin-x${finOpen(k, def) ? ' open' : ''} ${cls}" data-act="finx" data-k="${esc(k)}" data-d="${def ? 1 : 0}" role="button" tabindex="0" aria-expanded="${finOpen(k, def)}"><td><i class="pnl-car">${finOpen(k, def) ? '▾' : '▸'}</i>${label}</td>${cells}</tr>`;

/** GuV top-down: Gruppen mit Summen → Konten → Einzelposten. Spalten: lfd. Monat, Vormonat, seit Start. */
function finPnlHtml(pl) {
  const L = pl.ledger, last = L.months.at(-1), cols = [L.month, last ? last.acc : null, L.pnl], pm = dateParts(W.day).m;
  const gsum = (acc, gk) => (acc ? (PNL_GROUPS.find((g) => g.k === gk).acc).reduce((a, k) => a + (acc[k] || 0), 0) : null);
  const vsum = (acc, of) => (acc ? of.reduce((a, gk) => a + gsum(acc, gk), 0) : null);
  const td = (c, bold = false) => (c === null ? '<td class="r muted">–</td>' : `<td class="r${bold ? ' ' + sgn(c) : ''}">${c === 0 ? '<span class="muted">0</span>' : ec(c)}</td>`);
  const used = (k) => cols.some((a) => a && a[k]);
  let rows = '';
  for (const g of PNL_GROUPS) {
    if (g.sub) { rows += `<tr class="sum fin-sub"><td>${g.l}${g.hint ? ` <span class="small muted">${g.hint}</span>` : ''}</td>${cols.map((a) => td(vsum(a, g.of), true)).join('')}</tr>`; continue; }
    const accs = g.acc.filter(used); if (!accs.length && g.k !== 'tax') continue;
    rows += finRow('g:' + g.k, true, `<b>${g.l}</b>`, cols.map((a) => td(gsum(a, g.k))).join(''), 'fin-grp');
    if (!finOpen('g:' + g.k, true)) continue;
    const op = ui.pnlOpen || (ui.pnlOpen = {});
    for (const k of accs) rows += `<tr class="pnl-x${op[k] ? ' open' : ''}" data-act="pnlx" data-k="${k}" role="button" tabindex="0" aria-expanded="${!!op[k]}"><td style="padding-left:22px"><i class="pnl-car">${op[k] ? '▾' : '▸'}</i>${ACC_LABEL[k] || k}</td>${cols.map((a) => td(a ? a[k] || 0 : null)).join('')}</tr>${op[k] ? pnlDetailRows(pl, k) : ''}`;
  }
  // Konten, die keiner Gruppe zugeordnet sind (sollte nicht vorkommen) – sichtbar statt verschluckt
  const known = new Set(PNL_GROUPS.flatMap((g) => g.acc || [])), extra = [...new Set(cols.flatMap((a) => Object.keys(a || {})))].filter((k) => !k.startsWith('cf_') && !known.has(k));
  for (const k of extra) rows += `<tr><td>${esc(k)}</td>${cols.map((a) => td(a ? a[k] || 0 : null)).join('')}</tr>`;
  return `<div class="stack"><h2 class="sec">Gewinn- und Verlustrechnung <small>von oben nach unten: Gruppe → Konto → Einzelposten · Zeile anklicken</small></h2><div class="tw"><table class="t pnl fin"><thead><tr><th></th><th class="r">${MONTHS[pm]} (lfd.)</th><th class="r">Vormonat</th><th class="r">seit Start</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small muted">Jede Zeile ist die Summe der Zeilen darunter; die Einzelposten ergeben exakt das Konto. Ergebnis ist nicht Kontostand – wie aus dem Ergebnis Geld wird, zeigt die Kapitalflussrechnung.</p></div>`;
}

/** Herkunft einer Buchung: Strecke, Flugzeug, Flughafen, Fachkraft, Belegschaft oder Unternehmen. */
const EXPERT_ROLE_LABELS = new Set(Object.values(P.EXPERT_ROLES).map((r) => r.label));
function originOf(acc, tag) {
  const t = String(tag || '');
  if (t === 'ohne Zuordnung') return { d: 'firm', o: 'ohne Zuordnung', sub: '' };
  let m = /^([A-Z]{3}–[A-Z]{3})(?: › (.*))?$/.exec(t); if (m) return { d: 'route', o: m[1], sub: m[2] || '' };
  m = /^(?:(.*) › )?([A-Za-z0-9]+-\d+ · [^›]+)$/.exec(t); if (m) return { d: 'ac', o: m[2], sub: m[1] || '' };
  m = /^(?:(.*) › )?(.+ \(([^()]+)\))$/.exec(t);
  if (m && EXPERT_ROLE_LABELS.has(m[3])) return { d: 'person', o: m[2], sub: m[1] || '' };
  if (m && /^[A-Z]{3}$/.test(m[3])) return { d: 'apt', o: m[2], sub: m[1] || '' };
  if (acc.startsWith('staff_')) return { d: 'staff', o: t.split(' › ')[0], sub: t.split(' › ').slice(1).join(' › ') };
  const i = t.indexOf(' › '); return { d: 'firm', o: i < 0 ? t : t.slice(0, i), sub: i < 0 ? '' : t.slice(i + 3) };
}
const ORIGIN_DIMS = [['route', 'Strecken', 'Erlöse und direkte Flugkosten je Strecke'], ['ac', 'Flugzeuge', 'Leasing, Abschreibung, Versicherung, Finanzierung, Charter je Flugzeug'], ['apt', 'Flughäfen und Basen', 'Slots, Stationen, Basen, Hangars, Lizenzen je Flughafen'],
  ['staff', 'Belegschaft', 'Gehälter je Gruppe, Einstellungen, Boni'], ['person', 'Fachkräfte', 'je Person'], ['firm', 'Unternehmen', 'Zentrale, Marketing, Zinsen, Steuern, Absicherung, Einmaliges'], ['old', 'vor Beginn der Aufschlüsselung', 'ältere Buchungen ohne Herkunft']];
function finOriginHtml(pl, per) {
  if (!per.det) return `<div class="stack"><h2 class="sec">Ergebnis nach Herkunft</h2><p class="small muted">Für ${esc(per.label)} gibt es keine Einzelposten.</p></div>`;
  const objs = {}, put = (d, o, acc, sub, v) => { const key = d + '|' + o, x = objs[key] || (objs[key] = { d, o, rev: 0, cost: 0, items: {} }); if (accGroup(acc) === 'rev') x.rev += v; else x.cost += v; const ik = acc + '|' + sub; x.items[ik] = (x.items[ik] || 0) + v; };
  for (const [acc, tags] of Object.entries(per.det)) for (const [tag, v] of Object.entries(tags)) { if (!v) continue; const g = originOf(acc, tag); put(g.d, g.o, acc, g.sub, v); }
  for (const [acc, v] of Object.entries(per.pnl)) { const rest = v - sumO(per.det[acc]); if (Math.abs(rest) >= 1) put('old', 'vor Beginn der Aufschlüsselung', acc, '', rest); }
  const net = sumO(per.pnl), all = Object.values(objs), tot = all.reduce((a, x) => a + x.rev + x.cost, 0);
  const td = (c, b = false) => `<td class="r${b ? ' ' + sgn(c) : ''}">${c ? ec(c) : '<span class="muted">0</span>'}</td>`;
  let rows = '';
  for (const [d, l, hint] of ORIGIN_DIMS) {
    const xs = all.filter((x) => x.d === d).sort((a, b) => (d === 'route' ? (b.rev + b.cost) - (a.rev + a.cost) : Math.abs(b.rev + b.cost) - Math.abs(a.rev + a.cost)));
    if (!xs.length) continue;
    const s = (f) => xs.reduce((a, x) => a + f(x), 0), gk = `o:${per.k}:${d}`;
    rows += finRow(gk, d !== 'old', `<b>${l}</b> <span class="small muted">${xs.length} · ${hint}</span>`, td(s((x) => x.rev)) + td(s((x) => x.cost)) + td(s((x) => x.rev + x.cost), true), 'fin-grp');
    if (!finOpen(gk, d !== 'old')) continue;
    const MAX = finOpen(gk + ':all') ? 999 : 20;
    for (const x of xs.slice(0, MAX)) {
      const ok = `o:${per.k}:${d}:${x.o}`;
      rows += finRow(ok, false, `<span style="padding-left:14px">${esc(x.o)}</span>`, td(x.rev) + td(x.cost) + td(x.rev + x.cost, true));
      if (finOpen(ok)) rows += Object.entries(x.items).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([ik, v]) => { const [acc, sub] = ik.split('|'); return `<tr class="pnl-d"><td style="padding-left:40px"><span class="muted">${esc(ACC_LABEL[acc] || acc)}${sub ? ' ›' : ''}</span> ${sub ? `<b>${esc(sub)}</b>` : ''}</td>${accGroup(acc) === 'rev' ? td(v) + '<td></td>' : '<td></td>' + td(v)}${td(v, true)}</tr>`; }).join('');
    }
    if (xs.length > MAX) rows += `<tr class="pnl-d more" data-act="finx" data-k="${esc(gk + ':all')}" data-d="0" role="button" tabindex="0"><td colspan="4"><span class="link">… ${xs.length - MAX} weitere anzeigen</span></td></tr>`;
  }
  rows += `<tr class="sum fin-sub"><td>Summe aller Herkünfte</td>${td(all.reduce((a, x) => a + x.rev, 0))}${td(all.reduce((a, x) => a + x.cost, 0))}${td(tot, true)}</tr>
    <tr class="fin-chk"><td colspan="3">= Jahresüberschuss laut GuV (${esc(per.label)}): ${ec(net)}</td><td class="r">${okMark(tot - net)}</td></tr>`;
  return `<div class="stack"><h2 class="sec">Ergebnis nach Herkunft <small>von unten nach oben: jede Buchung gehört zu genau einer Strecke, einem Flugzeug, Flughafen … · ${esc(per.label)}</small></h2>
    <div class="tw"><table class="t pnl fin"><thead><tr><th></th><th class="r">Erlöse</th><th class="r">Kosten</th><th class="r">Ergebnis</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small muted">Strecken tragen nur ihre direkten Kosten; was ein Flugzeug kostet (Leasing, Abschreibung, Versicherung), steht beim Flugzeug, Slots und Stationen beim Flughafen. Zusammen ergibt alles exakt den Jahresüberschuss.</p></div>`;
}

/** Kapitalflussrechnung: Kasse am Anfang + Ergebnis − nicht zahlungswirksame Posten ± Investitionen ± Finanzierung = Kasse am Ende. */
function finCashHtml(pl, per) {
  const X = per.fx;
  if (!X) return `<div class="stack"><h2 class="sec">Kapitalflussrechnung</h2><p class="small muted">Für ${esc(per.label)} liegen die Geldflüsse noch nicht aufgeschlüsselt vor – sie werden ab dem Update aufgezeichnet.</p></div>`;
  const ni = X.m1.ni - X.m0.ni, nc = X.nc || {}, cf = per.cf || {}, td = (c, b = false) => `<td class="r${b ? ' ' + sgn(c) : ''}">${c ? ec(c) : '<span class="muted">0</span>'}</td>`;
  const lab = (k) => CF_LABEL[k] || k, sec = (keys) => Object.entries(cf).filter(([k, v]) => keys(k) && v);
  const op = sec((k) => !CF_INV.includes(k) && !CF_FIN.includes(k)), inv = sec((k) => CF_INV.includes(k)), fin = sec((k) => CF_FIN.includes(k));
  const sOp = ni - sumO(nc) + op.reduce((a, [, v]) => a + v, 0), sInv = inv.reduce((a, [, v]) => a + v, 0), sFin = fin.reduce((a, [, v]) => a + v, 0), end = X.m0.cash + sOp + sInv + sFin;
  const k0 = `c:${per.k}`;
  let rows = `<tr><td><b>Kasse zu Beginn</b> <span class="small muted">${X.all ? (per.label === 'seit Gründung' ? 'bei Gründung' : 'bei Beginn der Aufzeichnung') : 'am Monatsanfang'}</span></td>${td(X.m0.cash)}</tr>`;
  rows += finRow(k0 + ':op', true, '<b>Cashflow aus dem Betrieb</b>', td(sOp, true), 'fin-grp');
  if (finOpen(k0 + ':op', true)) {
    rows += `<tr class="pnl-d"><td style="padding-left:26px">Jahresüberschuss des Zeitraums</td>${td(ni)}</tr>`;
    for (const [k, v] of Object.entries(nc).filter(([, v]) => v)) rows += `<tr class="pnl-d"><td style="padding-left:26px"><span class="muted">ohne Geldfluss gebucht ›</span> <b>${esc(ACC_LABEL[k] || k)}</b> ${k === 'depreciation' ? '<span class="small muted">(Wertverlust, kein Geld)</span>' : k === 'one_off' ? '<span class="small muted">(Buchgewinne/-verluste)</span>' : ''}</td>${td(-v)}</tr>`;
    for (const [k, v] of op) rows += `<tr class="pnl-d"><td style="padding-left:26px">${esc(lab(k))}</td>${td(v)}</tr>`;
  }
  rows += finRow(k0 + ':inv', true, '<b>Cashflow aus Investitionen</b>', td(sInv, true), 'fin-grp');
  if (finOpen(k0 + ':inv', true)) rows += inv.map(([k, v]) => `<tr class="pnl-d"><td style="padding-left:26px">${esc(lab(k))}</td>${td(v)}</tr>`).join('') || '<tr class="pnl-d"><td class="muted" style="padding-left:26px">keine</td><td></td></tr>';
  rows += finRow(k0 + ':fin', true, '<b>Cashflow aus Finanzierung</b>', td(sFin, true), 'fin-grp');
  if (finOpen(k0 + ':fin', true)) rows += fin.map(([k, v]) => `<tr class="pnl-d"><td style="padding-left:26px">${esc(lab(k))}</td>${td(v)}</tr>`).join('') || '<tr class="pnl-d"><td class="muted" style="padding-left:26px">keine</td><td></td></tr>';
  rows += `<tr class="sum fin-sub"><td>Kasse am Ende (berechnet)</td>${td(end)}</tr><tr class="fin-chk"><td>= Bankguthaben laut Konto: ${ec(X.m1.cash)}${X.all || per.k === 'cur' ? ` · nach Dispo ${eur(netCash(pl))}` : ''}</td><td class="r">${okMark(end - X.m1.cash)}</td></tr>`;
  return `<div class="stack"><h2 class="sec">Kapitalflussrechnung <small>wie aus dem Ergebnis Geld wird · ${esc(per.label)}</small></h2><div class="tw"><table class="t pnl fin"><tbody>${rows}</tbody></table></div>
    <p class="small muted">Abschreibungen mindern das Ergebnis, kosten aber kein Geld. Flugzeugkäufe, Kautionen, Slots und Tilgungen kosten Geld, mindern aber nicht das Ergebnis. Der Dispo ist hier Finanzierung: Was er ausgleicht, steht als „Dispo in Anspruch genommen“.</p></div>`;
}

/** Bilanz zum Stichtag mit Einzelposten je Flugzeug, Flughafen, Kredit, Beteiligung und Eigenkapital-Abstimmung. */
function finBalanceHtml(pl) {
  const bs = SM.balanceSheet(pl), L = pl.ledger, F = L.fx, d = W.day, td = (x) => `<td class="r">${x ? eur(x) : '<span class="muted">0</span>'}</td>`;
  const own = pl.fleet.filter((a) => a.owned), leased = pl.fleet.filter((a) => !a.owned && a.deposit > 0);
  const det = (k, label, val, items, note = '') => finRow('b:' + k, false, label + (note ? ` <span class="small muted">${note}</span>` : ''), td(val)) + (finOpen('b:' + k) ? (items.length ? items.map(([l, v, n]) => `<tr class="pnl-d"><td style="padding-left:26px">${l}${n ? ` <span class="small muted">${n}</span>` : ''}</td>${td(v)}</tr>`).join('') : '<tr class="pnl-d"><td class="muted" style="padding-left:26px">keine</td><td></td></tr>') : '');
  const stakes = Object.entries(pl.stakes || {}).filter(([, s]) => s.f > 1e-6), slots = Object.entries(pl.slotBook || {});
  let A = `<tr class="grp"><td colspan="2">Aktiva – was der Airline gehört</td></tr>`;
  A += `<tr><td>Bankguthaben</td>${td(bs.cash)}</tr>`;
  A += det('nbv', 'Flugzeuge im Eigentum', bs.nbv, own.map((a) => { const v0 = a.value0 || P.AIRCRAFT_TYPES[a.type_id].value_eur; return [`<b class="mono">${acName(a.id)}</b> ${tl(a.type_id)}`, a.nbv, `Anschaffung ${eur(v0)} − Abschreibung ${eur(v0 - a.nbv)}`]; }), `${own.length} Stück, Buchwert`);
  A += det('dep', 'Leasing-Kautionen', bs.deposits, leased.map((a) => [`<b class="mono">${acName(a.id)}</b> ${tl(a.type_id)}`, a.deposit, 'kommt bei Rückgabe zurück']));
  A += det('slots', 'Slots', bs.slots, slots.map(([apt, x]) => [`${apt} · ${esc(apName(apt))}`, x.v, `${x.n} Slot${x.n === 1 ? '' : 's'}, Kaufpreis`]), 'Buchwert = bezahlter Preis');
  A += det('stakes', 'Beteiligungen', bs.stakes, stakes.map(([id, s]) => [esc((W.airlines[id] || {}).name || id), s.book, `${pct(s.f, 1)} der Aktien · Buchwert`]));
  A += `<tr class="sum fin-sub"><td>Summe Aktiva</td>${td(bs.assets)}</tr>`;
  let Pa = `<tr class="grp"><td colspan="2">Passiva – wem die Airline das schuldet</td></tr>`;
  Pa += det('loans', 'Flugzeugkredite', bs.loans, own.filter((a) => a.loan > 0).map((a) => [`<b class="mono">${acName(a.id)}</b>`, a.loan, `${pct(a.loanRate || 0.06, 1)} Zins`]));
  Pa += det('bank', 'Bankkredite', bs.bank, pl.loans.map((l) => [`Kredit ${esc(l.id)}${l.rescue ? ' (Sanierung)' : ''}`, l.balance, `${pct(l.rate, 1)} Zins, ${l.years} Jahre, Rate ${eur(l.annuity || 0)}/Monat`]));
  Pa += `<tr><td>Dispo (Kreditlinie) <span class="small muted">Rahmen ${eur(pl.creditLimit(W.macro.bank ?? 1))}</span></td>${td(bs.credit)}</tr>`;
  Pa += det('bonds', 'Anleihen', bs.bonds, (pl.bonds || []).map((b) => [`Anleihe ${esc(b.id)}`, b.amount, `${pct(b.rate, 1)} Zins, fällig ${dateShort(b.until)}`]));
  const deferred = pl.defer ? pl.defer.owed || 0 : 0; if (deferred) Pa += `<tr><td>Gestundete Leasingraten</td>${td(deferred)}</tr>`;
  Pa += `<tr class="sum fin-sub"><td>Summe Fremdkapital</td>${td(bs.liabilities)}</tr>`;
  // Eigenkapital: Einlagen (Startkapital, Kapitalerhöhungen, Ausschüttungen …) + alle Ergebnisse seit Gründung
  const ni = L.netIncome(), eqItems = F ? Object.entries(F.eq).filter(([, v]) => v).map(([k, v]) => [esc(CF_LABEL[k] || k), v / 100, '']) : [];
  if (F && Math.abs(F.t0.ec) >= 100) eqItems.unshift(['Einlagen vor Beginn der Aufzeichnung', F.t0.ec / 100, 'Startkapital und frühere Bewegungen']);
  Pa += det('eq', 'Eigenkapital', bs.equity, [...eqItems, ['Alle Ergebnisse seit Gründung (Gewinne und Verluste)', ni, 'Summe aller Jahresüberschüsse']], 'Einlagen + Ergebnisse');
  Pa += `<tr class="sum fin-sub"><td>Summe Passiva</td>${td(bs.liabilities + bs.equity)}</tr>`;
  const chk = bs.assets - bs.liabilities - (L.equityContrib / 100 + ni);
  Pa += `<tr class="fin-chk"><td>Aktiva − Fremdkapital = Einlagen ${eur(L.equityContrib / 100)} + Ergebnisse ${eur(ni)}</td><td class="r">${okMark(chk * 100)}</td></tr>`;
  return `<div class="stack"><h2 class="sec">Bilanz <small>Stichtag ${dateShortY(d)} · Zeile anklicken für die Einzelposten</small></h2><div class="tw"><table class="t pnl fin"><tbody>${A}${Pa}</tbody></table></div>
    <p class="small muted">Außerhalb der Bilanz: Leasingverpflichtungen von rund ${eur(bs.leaseLiab)} (24 Monatsraten). Slots stehen mit dem bezahlten Preis in der Bilanz, Flugzeuge mit Anschaffung minus Abschreibung. Steuern: ${pct(P.TAX_RATE)} auf Monatsgewinne mit Verlustvortrag.</p></div>`;
}

/** Eigenkapitalspiegel: EK zu Beginn + Ergebnis + Einlagen − Ausschüttungen = EK am Ende. */
function finEquityHtml(pl, per) {
  const X = per.fx; if (!X) return '';
  const td = (c, b = false) => `<td class="r${b ? ' ' + sgn(c) : ''}">${c ? ec(c) : '<span class="muted">0</span>'}</td>`;
  const e0 = X.m0.ec + X.m0.ni, e1 = X.m1.ec + X.m1.ni, ni = X.m1.ni - X.m0.ni, moves = Object.entries(X.eq || {}).filter(([, v]) => v), calc = e0 + ni + moves.reduce((a, [, v]) => a + v, 0);
  let rows = `<tr><td><b>Eigenkapital zu Beginn</b></td>${td(e0)}</tr><tr><td>+ Jahresüberschuss des Zeitraums</td>${td(ni, true)}</tr>`;
  rows += moves.map(([k, v]) => `<tr><td>${v >= 0 ? '+' : '−'} ${esc(CF_LABEL[k] || k)}</td>${td(v)}</tr>`).join('');
  rows += `<tr class="sum fin-sub"><td>Eigenkapital am Ende</td>${td(calc)}</tr><tr class="fin-chk"><td>= Bilanz-Eigenkapital ${per.k === 'cur' || X.all ? 'heute' : 'am Monatsende'}: ${ec(e1)}</td><td class="r">${okMark(calc - e1)}</td></tr>`;
  return `<div class="stack"><h2 class="sec">Eigenkapitalspiegel <small>${esc(per.label)}</small></h2><div class="tw"><table class="t pnl fin"><tbody>${rows}</tbody></table></div></div>`;
}

/** Einzelposten eines P&L-Kontos: laufender Monat, Vormonat, seit Start (seit Beginn der Aufschlüsselung). */
function pnlDetailRows(pl, k) {
  const L = pl.ledger, D = L.det; if (!D) return '<tr class="pnl-d"><td colspan="4" class="small muted">Für diesen Spielstand gibt es noch keine Einzelposten.</td></tr>';
  const last = L.months.at(-1), cm = D.m[k] || {}, pm = last && last.det ? last.det[k] || {} : null, tm = D.p[k] || {};
  const tags = [...new Set([...Object.keys(cm), ...Object.keys(pm || {}), ...Object.keys(tm)])];
  const sumOf = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  // Was vor der Aufschlüsselung gebucht wurde (ältere Spielstände), steht als eigener Posten da
  const restT = (L.pnl[k] || 0) - sumOf(tm), restP = pm && last ? (last.acc[k] || 0) - sumOf(pm) : 0, restC = (L.month[k] || 0) - sumOf(cm);
  const rows = tags.map((t) => ({ t, c: cm[t] || 0, p: pm ? pm[t] || 0 : null, a: tm[t] || 0 }));
  if (Math.abs(restT) >= 100 || Math.abs(restP) >= 100 || Math.abs(restC) >= 100) rows.push({ t: 'vor Beginn der Aufschlüsselung gebucht', c: restC, p: pm ? restP : (last ? last.acc[k] || 0 : null), a: restT, old: true });
  rows.sort((x, y) => (x.old - y.old) || Math.abs(y.c || 0) - Math.abs(x.c || 0) || Math.abs(y.a) - Math.abs(x.a));
  const MAX = ui.pnlAll && ui.pnlAll[k] ? 999 : 25, shown = rows.slice(0, MAX), more = rows.slice(MAX);
  const v = (x) => (x === null ? '<td class="r muted">–</td>' : `<td class="r">${x === 0 ? '<span class="muted">0</span>' : eur(x / 100)}</td>`);
  const lbl = (t) => { const i = t.lastIndexOf(' › '); return i < 0 ? `<b>${esc(t)}</b>` : `<span class="muted">${esc(t.slice(0, i))} ›</span> <b>${esc(t.slice(i + 3))}</b>`; };
  let h = shown.map((r) => `<tr class="pnl-d${r.old ? ' old' : ''}"><td>${r.old ? `<span class="muted">${esc(r.t)}</span>` : lbl(r.t)}</td>${v(r.c)}${v(r.p)}${v(r.a)}</tr>`).join('');
  if (more.length) { const m = (f) => more.reduce((a, r) => a + (r[f] || 0), 0); h += `<tr class="pnl-d more" data-act="pnlall" data-k="${k}" role="button" tabindex="0"><td><span class="link">… ${more.length} weitere Posten anzeigen</span></td>${v(m('c'))}${v(pm ? m('p') : null)}${v(m('a'))}</tr>`; }
  if (!rows.length) h = '<tr class="pnl-d"><td colspan="4" class="small muted">Keine Buchungen.</td></tr>';
  return h;
}
/** Hauptversammlung, Aufsicht und Förderung. */
function ownersHtml(pl) {
  const A = P.PAYOUT, SH = P.SMALL_HELP, d = W.day, sh = (k) => (pl.shocks || []).filter((x) => x.k === k && x.from <= d && x.until > d && !x.silent);
  const n = pl.fleet.length, fuel = SH.fuel * Math.max(0, Math.min(1, (SH.fuelZero - n) / (SH.fuelZero - SH.fuelFull))), sub = Math.max(0, Math.min(1, (SH.subZero - n) / (SH.subZero - SH.subFull)));
  const parts = [];
  const ag = pl.agm, agOpen = (pl.decisions || []).some((x) => x.type === 'agm' && !x.resolved);
  if (agOpen) parts.push('<b>Hauptversammlung:</b> Abstimmung über eine Ausschüttung läuft – siehe Entscheidungen im Cockpit.');
  else if (ag && ag.until > d) parts.push(`<b>Beschluss der Hauptversammlung</b> bis ${dateShort(ag.until)}: ${pct(ag.rate)} vom Monatsgewinn werden ausgeschüttet (Antrag ${pct(ag.asked)}, ${ag.k === 'yes' ? 'angenommen' : ag.k === 'half' ? 'Kompromiss' : 'mit Mehrheit abgelehnt – Ansehen −' + A.noMalus}).`);
  if (pl.profitShare && pl.profitShare.until > d) parts.push(`<b>Gewinnbeteiligung</b> der Belegschaft: ${pct(pl.profitShare.rate)} vom Monatsgewinn bis ${dateShort(pl.profitShare.until)}.`);
  for (const x of sh('pricecap')) parts.push(`<b>Preisaufsicht in ${esc(apName(x.apt))}</b> bis ${dateShort(x.until)}: dort höchstens das ${NF1.format(P.AL_SHOCKS.pricecap.cap)}-fache des Marktpreises.`);
  for (const x of sh('fuelpool')) if (fuel > 0) parts.push(`<b>Einkaufsgemeinschaft Kerosin</b> bis ${dateShort(x.until)}: ${pct(fuel, 1)} günstiger (voll bis ${SH.fuelFull} Flugzeuge, ab ${SH.fuelZero} entfällt der Vorteil).`);
  for (const x of sh('subsidy')) if (sub > 0) parts.push(`<b>Regionalförderung ${esc(apName(x.apt))}</b> bis ${dateShort(x.until)}: bis ${eur(SH.subsidy * sub * cpi())} je Abflug.`);
  if (!parts.length) return '';
  return `<div class="card pad stack"><h3>Aktionäre, Aufsicht und Förderung</h3>${parts.map((x) => `<p class="small">${x}</p>`).join('')}</div>`;
}
/** 0.21.49: Online kommt der Spielstand schlank (ohne Einzelposten der Buchhaltung). Der Finanz-Reiter lädt sie für die eigene Airline nach. */
const ledgerDet = { busy: false, tries: 0 };
function ledgerDetMissing() { return !!(ui.mp && mpState.isView && W && W.player && W.player.ledger._detVer !== mpState.ver); }
async function ensureLedgerDetail() {
  if (!ledgerDetMissing() || ledgerDet.busy) return;
  ledgerDet.busy = true;
  try {
    const d = await api(`/games/${ui.mp.id}/ledger`, { timeout: 20000 });
    if (!W || !W.player || !ui.mp) return;
    if (d.ver !== mpState.ver) { if (ledgerDet.tries++ < 3) setTimeout(() => { if (ui.tab === 'finance') ensureLedgerDetail(); }, 800); return; }   // inzwischen neuer Stand: noch einmal
    const L = W.player.ledger;
    L.det = d.det; L.fx = d.fx; (d.months || []).forEach((m, i) => { const t = L.months[i]; if (!t) return; if (m.det) t.det = m.det; if (m.fx) t.fx = m.fx; });
    L._detVer = mpState.ver; ledgerDet.tries = 0;
    if (ui.tab === 'finance') renderPane(true);
  } catch (e) { /* nächster Versuch beim nächsten Öffnen */ } finally { ledgerDet.busy = false; }
}
VIEWS.finance = function viewFinance() {
  const pl = W.player, bs = SM.balanceSheet(pl), L = pl.ledger;
  if (ledgerDetMissing()) { ensureLedgerDetail(); if (!L.det) return `<h2 class="sec">Ergebnis und Bilanz</h2><p class="small muted">Einzelposten der Buchhaltung werden geladen …</p>`; }   // bis dahin die zuletzt geladenen zeigen
  const cur = pnlCol(L.month), prev = L.months.length ? pnlCol(L.months.at(-1).acc) : null, tot = pnlCol(L.pnl);
  const pm = dateParts(W.day).m;
  const cell = (col, k) => { if (!col) return '<td class="r muted">–</td>'; const x = k === 'ebit' ? col.ebit : k === 'net' ? col.net : col.v(k); return `<td class="r ${['ebit', 'net'].includes(k) ? sgn(x) : ''}">${x === 0 ? '<span class="muted">0</span>' : eur(x)}</td>`; };
  const used = new Set(PNL_ROWS.filter(([k]) => k !== 'grp' && !['ebit', 'net'].includes(k) && (L.pnl[k] || L.month[k])).map(([k]) => k));
  let html = `<h2 class="sec">Ergebnis und Bilanz <small>EBIT-Marge seit Start ${tot.rev ? pct(tot.ebit / tot.rev, 1) : '–'}</small></h2>`;
  html += ownersHtml(pl);
  html += `<div class="tiles">
    <div class="tile"><span>Kontostand</span><b class="${netCash(pl) < 0 ? 'neg' : ''}">${eur(netCash(pl))}</b><em>${netCash(pl) < 0 ? 'im Dispo' : 'Guthaben'} · mit Dispo verfügbar ${eur(pl.spendable(W.macro.bank ?? 1))}</em></div>
    <div class="tile"><span>Dispo genutzt</span><b class="${pl.creditUsed > 0 ? 'neg' : ''}">${pl.creditUsed > 0 ? eur(-pl.creditUsed) : eur(0)}</b><em>Rahmen ${eur(pl.creditLimit(W.macro.bank ?? 1))}, ${pct(pl.creditRate(W.macro.rate, W.macro.bank ?? 1), 1)} Zins</em></div>
    <div class="tile tlink" data-act="tab" data-tab="history" role="button" tabindex="0" title="Verlauf Tag für Tag"><span>Ergebnis gestern <i class="tl-go">↗</i></span><b class="${sgn(L.lastDay || 0)}">${eur(L.lastDay || 0, { plus: true })}</b><em>${MONTHS[pm]} bisher <span class="${sgn(cur.net)}">${eur(cur.net, { plus: true })}</span></em></div>
  </div>
  <div class="stack"><h2 class="sec">Kontostand <small>letzte ${Math.min(netHistOf(pl).length, 365)} Tage</small></h2>${sparkline(netHistOf(pl).slice(-365))}</div>`;
  // Abstimmung auf einen Blick: GuV = Summe der Herkünfte, Kasse = Kapitalfluss, Bilanz = Einlagen + Ergebnisse
  { const pc = finPeriods(pl)[0], net = sumO(pc.pnl), orig = pc.det ? Object.values(pc.det).reduce((a, o) => a + sumO(o), 0) + Object.entries(pc.pnl).reduce((a, [k, v]) => a + v - sumO(pc.det[k]), 0) : net;
    const X = pc.fx, cash = X ? X.m0.cash + (X.m1.ni - X.m0.ni) - sumO(X.nc) + sumO(pc.cf) - X.m1.cash : 0, bal = (bs.assets - bs.liabilities - (L.equityContrib / 100 + L.netIncome())) * 100;
    html += `<div class="fin-recon small"><span>${okMark(orig - net)} GuV = Summe aller Strecken, Flugzeuge, Flughäfen …</span><span>${X ? okMark(cash) : '<span class="muted">–</span>'} Kasse = Anfang + Kapitalfluss</span><span>${okMark(bal)} Bilanz: Vermögen − Schulden = Einlagen + Ergebnisse</span></div>`; }
  html += finPnlHtml(pl);
  html += finPeriodBar(pl);
  { const per = finPeriod(pl); html += finOriginHtml(pl, per) + finCashHtml(pl, per) + finBalanceHtml(pl) + finEquityHtml(pl, per); }
  return html;
};
function miniLine(vals, f) {
  if (vals.length < 2) return '<p class="small muted">Noch keine Daten.</p>';
  const w = 400, h = 50, lo = Math.min(...vals) * 0.98, hi = Math.max(...vals) * 1.02, sp = hi - lo || 1;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(i / (vals.length - 1) * w).toFixed(1)},${(h - 4 - (v - lo) / sp * (h - 8)).toFixed(1)}`).join(' ');
  return `<svg class="spark" style="height:50px" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Verlauf, aktuell ${f(vals.at(-1))}"><path d="${d}" fill="none" stroke="var(--ink-2)" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg><div class="spread small muted"><span>${f(Math.min(...vals))} – ${f(Math.max(...vals))}</span><span>aktuell ${f(vals.at(-1))}</span></div>`;
}

/** Wirtschaftsprüfung: Vorschau der Handelsbilanz mit Mitspielenden, laufende Bescheide, Selbstanzeige. */
function auditHtml(pl) {
  const debt = SM.auditDebtSum(pl.audit);
  if (!ui.mp && !(pl.audit && (debt.n || pl.audit.until > W.day))) return '';
  const A = P.AUDIT, rows = SM.auditPreview(W, pl), au = pl.audit, ye = 365 * (Math.floor(W.day / 365) + 1) - 1;
  const cur = au && au.until > W.day;
  if (!rows.length && !cur && !debt.n) return '';
  return `<div class="card pad stack"><div class="spread"><h3>Wirtschaftsprüfung zum Jahresabschluss</h3><span class="small muted">nächste Prüfung ${dateShort(ye)}</span></div>
    <p class="small ink2">Die Prüfer sehen sich alle Handelsgeschäfte mit Mitspielenden an. Wer daraus mehr als ${pct(A.tol)} über Marktwert gewinnt (mindestens ${eur(A.minGain * cpi())}), muss den Vorteil zurückzahlen (an den Partner – ist der pleite, entfernt oder neu gegründet, an die Staatskasse), zahlt ein Bußgeld (${A.fine.map((x) => pct(x)).join(' / ')} beim 1./2./3. Mal) und bekommt einen Prüfvermerk (Ansehen −${A.malus[0]} für ein Jahr). Wer vorher freiwillig zurückzahlt, bleibt straffrei. Wie gezahlt wird, wählen Sie nach dem Bescheid: sofort (10 % Nachlass aufs Bußgeld) oder in 6, 12 oder 24 Monatsraten (+2/+5/+12 %).</p>
    ${rows.length ? `<table class="t"><thead><tr><th>Partner</th><th class="r">erhalten · gegeben</th><th class="r">Vorteil</th><th></th></tr></thead><tbody>${rows.map((e) => `<tr><td>${esc(e.name)}<div class="small muted">${e.n} Geschäft${e.n === 1 ? '' : 'e'}</div></td><td class="r">${eur(e.got)}<div class="small muted">${eur(e.gave)}</div></td><td class="r ${e.flagged ? 'neg' : e.excess > 0 ? 'warnc' : ''}">${e.excess > 0 ? eur(e.excess) : '–'}${e.flagged ? '<div class="small">wird beanstandet</div>' : ''}</td><td class="r">${e.excess > 0 ? `<button class="btn small${e.flagged ? ' primary' : ''}" data-act="auditsettle" data-id="${e.partner}" title="Vorteil jetzt zurückzahlen – ohne Bußgeld und Prüfvermerk">Zurückzahlen</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Keine Handelsgeschäfte mit Mitspielenden in diesem Jahr.</p>'}
    ${cur ? `<div class="callout warn"><b>Prüfvermerk bis ${dateShort(au.until)}</b><span class="small">Ansehen −${au.malus}. ${au.strikes > 1 ? `${au.strikes}. Beanstandung – ` : ''}Nach zwei Jahren ohne neue Beanstandung wird die Zählung gelöscht.</span></div>` : ''}
    ${auditPendingHtml(pl)}${auditBillsHtml(pl, debt)}</div>`;
}
const AUDIT_MODE_TXT = { now: 'sofort', r6: '6 Monatsraten', r12: '12 Monatsraten', r24: '24 Monatsraten' };
/** 0.21.61: offene Wahl der Zahlungsweise mit Frist und dem, was ohne Antwort passiert. */
function auditPendingHtml(pl) {
  const Y = P.AUDIT.pay, open = (pl.decisions || []).filter((d) => d.type === 'auditpay' && !d.resolved);
  return open.map((d) => `<div class="callout warn stack"><b>Zahlungsweise offen – Bescheid vom ${dateShort(d.day)} (${esc(d.bill.name)})</b><span class="small">Rückzahlung ${eur(d.bill.claw)} ${d.bill.to ? `an ${esc(d.bill.name)}` : 'an die Staatskasse'}, Bußgeld ${eur(d.bill.fine)}. Bitte bis <b>${dateShort(d.deadline)}</b> wählen: sofort (${pct(Y.skonto)} Nachlass aufs Bußgeld), 6 Raten (+${pct(Y.r6.x - 1)}), 12 Raten (+${pct(Y.r12.x - 1)}) oder 24 Raten (+${pct(Y.r24.x - 1)}). Ohne Antwort gelten automatisch ${AUDIT_MODE_TXT[Y.auto]} (+${pct(Y[Y.auto].x - 1)}).</span>
    <div class="row" style="gap:6px;flex-wrap:wrap">${['now', 'r6', 'r12', 'r24'].map((m) => `<button class="btn small${m === 'now' ? ' primary' : ''}" data-act="decide" data-id="${d.id}" data-choice="${m}">${AUDIT_MODE_TXT[m]}</button>`).join('')}</div></div>`).join('');
}
/** 0.21.61: Jeder Bescheid einzeln – wie sich der Betrag zusammensetzt, wer die Zahlungsweise wann gewählt hat, Stand der Raten. */
function auditBillsHtml(pl, debt) {
  const au = pl.audit, bills = ((au && au.bills) || []).slice().reverse(), ds = SM.auditDebts ? SM.auditDebts(au) : [];
  let nextRate = W.day + 1; while (dateParts(nextRate + 1).d !== 1 && nextRate < W.day + 40) nextRate++;
  let html = '';
  for (const b of bills) {
    const rate = b.n && b.mode !== 'now', done = !b.rest || b.rest <= 0;
    const how = b.how === 'self' ? `von Ihnen gewählt am ${dateShort(b.chosen)}` : b.how === 'auto' ? `automatisch gewählt am ${dateShort(b.chosen)} – bis zur Frist ${b.deadline ? `(${dateShort(b.deadline)}) ` : ''}kam keine Antwort` : 'bei der Prüfung festgelegt';
    const lines = [[`Rückzahlung ${b.to ? `an ${esc(b.name)}` : 'an die Staatskasse'}`, b.claw],
      [`Bußgeld${b.fineRate ? ` (${pct(b.fineRate)} des Vorteils${b.strike ? `, ${b.strike}. Beanstandung` : ''})` : ''}`, b.fine0]];
    if (b.skonto > 0) lines.push(['Nachlass für Sofortzahlung', -b.skonto]);
    if (b.x > 1) lines.push([`Aufschlag für ${b.n} Monatsraten (+${pct(b.x - 1)})`, b.total - b.due]);
    html += `<div class="card pad stack" style="gap:6px"><div class="spread"><b>Bescheid vom ${dateShort(b.day)}${b.late ? ' (Nachprüfung)' : ''}</b><span class="chip ${done ? 'good' : 'warn'}">${done ? 'bezahlt' : `offen ${eur(b.rest)}`}</span></div>
      <span class="small muted">Geschäfte mit ${esc(b.name)}</span>
      ${lines.map(([l, v]) => `<div class="spread small"><span>${l}</span><span class="mono">${eur(v, { plus: v < 0 })}</span></div>`).join('')}
      <div class="spread small" style="border-top:1px solid var(--line);padding-top:4px"><b>Zu zahlen</b><b class="mono">${eur(b.total)}</b></div>
      <div class="small"><b>Zahlungsweise: ${b.mode === 'now' ? (b.short ? `sofort – verfügbar waren nur ${eur(b.now)}, der Rest von ${eur(b.total - b.now)} läuft in ${b.n} Monatsraten zu ${eur(b.monthly)}` : `sofort, ${eur(b.now)} am ${dateShort(b.chosen)} bezahlt`) : `${b.n} Monatsraten zu ${eur(b.monthly)}`}</b> · ${how}.</div>
      ${b.n ? `<div class="small">Stand: ${b.paidN || 0} von ${b.n} Raten bezahlt (${eur((b.paid || 0) - (b.now || 0))}${b.now ? ` plus ${eur(b.now)} sofort` : ''})${done ? '' : ` · offen ${eur(b.rest)} · nächste Rate ${eur(Math.min(b.monthly, b.rest))} am ${dateShort(nextRate)}`}</div>` : ''}</div>`;
  }
  const legacy = ds.filter((d) => !d.bill);
  if (legacy.length) { const left = legacy.reduce((a, d) => a + d.left, 0), mo = legacy.reduce((a, d) => a + Math.min(d.left, d.monthly), 0);
    html += `<div class="callout info"><b>Ratenplan aus älteren Bescheiden</b><span class="small">Noch ${eur(left)} offen, monatlich ${eur(mo)} (nächste Rate am ${dateShort(nextRate)}). Für diese Bescheide wurde die Zusammensetzung vor Version 0.21.61 nicht gespeichert.</span></div>`; }
  else if (!bills.length && debt.n) html += `<div class="callout info"><b>Ratenplan</b><span class="small">Noch ${eur(debt.left)} offen, monatlich ${eur(debt.monthly)}.</span></div>`;
  return html;
}
VIEWS.credit = function viewCredit() {
  const pl = W.player, bs = SM.balanceSheet(pl);
  let html = `<h2 class="sec">Kredite und Rating <small>Rating ${pl.rating} · Leitzins ${pct(W.macro.rate, 1)}</small></h2>`;
  html += auditHtml(pl);
  html += `<div class="tiles">
    <div class="tile"><span>Rating</span><b>${pl.rating}</b><em>monatlich neu bewertet</em></div>
    <div class="tile"><span>Dispo genutzt</span><b class="${pl.creditUsed > 0 ? 'neg' : ''}">${pl.creditUsed > 0 ? eur(-pl.creditUsed) : eur(0)}</b><em>Rahmen ${eur(pl.creditLimit(W.macro.bank ?? 1))}, ${pct(pl.creditRate(W.macro.rate, W.macro.bank ?? 1), 1)} Zins</em></div>
    <div class="tile"><span>Reichweite</span><b class="${pl.runway < 60 ? 'warnc' : ''}">${pl.runway === undefined || !isFinite(pl.runway) ? 'stabil' : `${n0(pl.runway)} Tage`}</b><em>Kontostand ${eur(netCash(pl))}</em></div>
  </div>`;
  { const ri = SM.ratingInfo(pl); let nm = W.day + 1; while (dateParts(nm).d !== 1 && nm < W.day + 40) nm++;
    const tips = [];
    if (ri.eqNext !== null) tips.push(`Eigenkapitalquote über ${pct(ri.eqNext)} (jetzt ${pct(ri.eqRatio)}) bringt einen Punkt`);
    if (ri.covNext !== null) tips.push(`Zinsdeckung über ${ri.covNext} (jetzt ${NF1.format(Math.max(-99, ri.cov))}: Ergebnis vor Zinsen ÷ Zinsen, letzte sechs Monate) bringt einen Punkt`);
    html += `<div class="card pad stack"><h3>Rating ${pl.rating} – und wie es besser wird</h3>
      <p class="small ink2">Banken bewerten jeden Monat neu – das nächste Mal um den <b>${dateShort(nm)}</b>. Punkte jetzt: Eigenkapital ${ri.se}, Zinsdeckung ${ri.sc} = ${ri.score} (A ab 4, BBB ab 3, BB ab 1, B ab 0).${ri.young ? ` In den ersten drei Monaten höchstens BBB (noch ${3 - ri.months} Monat${3 - ri.months === 1 ? '' : 'e'}).` : ''}</p>
      ${tips.length ? `<ul class="small" style="margin:0;padding-left:18px">${tips.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p class="small pos">Bestnote – mehr geht nicht.</p>'}
      <p class="small muted">Das Rating bestimmt Kreditrahmen und Zins, und es zählt bis zu 20 Punkte im Ansehen – also auch, welche Flugzeuge die Leasinggeber herausgeben. Gekaufte Flugzeuge und Gewinne heben die Eigenkapitalquote.</p></div>`; }
  // 0.21.42: Flugzeugkredite
  { const own = pl.fleet.filter((a) => a.owned && a.loan > 0.5).sort((x, y) => y.loan - x.loan);
    if (own.length) { const qa = W.acLoanQuote(pl);
      html += `<div class="card pad stack"><h3>Flugzeugkredite <small class="muted">${own.length} Flugzeug${own.length > 1 ? 'e' : ''} · ${eur(qa.bal)} offen</small></h3>
        <table class="t"><thead><tr><th>Flugzeug</th><th class="r">Rest</th><th class="r">Zins</th><th class="r">Zins/Tag</th><th></th></tr></thead><tbody>${own.slice(0, 30).map((a) => { const q = W.acLoanQuote(pl, [a.id]);
          return `<tr><td><b class="mono">${esc(acName(a.id))}</b> <span class="small muted">${tl(a.type_id)}</span></td><td class="r">${eur(a.loan)}</td><td class="r">${pct(a.loanRate || 0.06, 1)}</td><td class="r">${eur(a.loan * (a.loanRate || 0.06) / 365)}</td><td class="r"><button class="btn small" data-act="repayac" data-id="${a.id}" ${q.ok ? '' : 'disabled'} title="${q.ok ? `Kostet ${eur(q.cost)} inkl. ${pct(P.AC_LOAN_PREPAY, 1)} Vorfälligkeit${q.fromCredit > 0 ? `; davon ${eur(q.fromCredit)} vorübergehend aus dem Dispo` : ''}` : 'Kontostand und Dispo reichen nicht'}">Ablösen</button></td></tr>`; }).join('')}</tbody></table>
        ${own.length > 30 ? `<p class="small muted">und ${own.length - 30} weitere</p>` : ''}
        <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small primary" data-act="repayac" ${qa.ok ? '' : 'disabled'}>Alle ablösen<span class="btn-sub">${eur(qa.cost)} inkl. Vorfälligkeit</span></button>${qa.fromCredit > 0 && qa.ok ? `<span class="small muted">${eur(qa.fromCredit)} vorübergehend aus dem Dispo (${pct(qa.creditRate, 1)} Zins)</span>` : ''}</div>
        <p class="small muted">Ablösen kostet ${pct(P.AC_LOAN_PREPAY, 1)} Vorfälligkeit und spart ab dann die Zinsen (heute zusammen ${eur(qa.save)} am Tag). Das Flugzeug bleibt Ihres; beim Verkauf wird ein offener Kredit ohnehin abgelöst. Reicht das Guthaben nicht, springt der Dispo ein – lohnt sich vor allem, wenn der Kredit teurer ist als der Dispo.</p></div>`; } }
  // Kredite
  const lim = W.loanLimit(pl), rate = W.loanRate(pl);
  html += `<div class="card pad stack"><h3>Neuer Bankkredit</h3>
    ${pl.loans.length ? `<table class="t"><thead><tr><th>Kredit</th><th class="r">Rest</th><th class="r">Zins</th><th class="r">Rate/Mon.</th><th></th></tr></thead><tbody>${pl.loans.map((l) => `<tr><td>${dateShort(l.day)} · ${l.years} J.</td><td class="r">${eur(l.balance)}</td><td class="r">${pct(l.rate, 1)}</td><td class="r">${eur(l.annuity)}</td><td class="r">${(() => { const q = W.repayQuote(pl, l); return `<button class="btn small" data-act="repay" data-id="${l.id}" ${q.ok ? '' : 'disabled'} title="${q.ok ? `Kostet ${eur(q.cost)} inkl. 1 % Vorfälligkeit${q.fromCredit > 0 ? `; davon ${eur(q.fromCredit)} vorübergehend aus dem Dispo` : ''}` : 'Kontostand und Dispo reichen nicht'}">Ablösen</button>${q.fromCredit > 0 && q.ok ? `<div class="small muted">${eurB(q.fromCredit)} aus dem Dispo</div>` : ''}${l.rate > q.creditRate + 0.0005 ? '<div class="small pos">teurer als der Dispo</div>' : ''}`; })()}</td></tr>`).join('')}</tbody></table>
      <p class="small muted">Ablösen kostet 1 % Vorfälligkeit. Reicht das Guthaben nicht, springt der Dispo ein (heute ${pct(W.repayQuote(pl, pl.loans[0]).creditRate, 1)} Zins, variabel); Einnahmen führen ihn danach automatisch zurück. Lohnt sich vor allem, wenn der alte Kredit teurer ist als Dispo oder ein neuer Kredit (heute ${pct(rate, 1)}) – etwa nach einem besseren Rating.</p>` : ''}
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
  return `<div><time>${when}</time><span class="${cls}">${esc(e.text)}</span>${evCancelBtn(e.id)}</div>`;
}
/** Spielleitung: Knopf „Annullieren“ an Ereignissen und Ereignismeldungen. */
function evCancelBtn(eid) {
  if (!eid || !ui.mp || !ui.mp.manage) return '';
  if (!SM.adminEvents(W).some((x) => x.id === eid && !x.cancelled)) return '';
  return ` <button class="btn small ghost ev-x" data-act="evcancel" data-id="${esc(eid)}" title="Ereignis für alle annullieren (nur Spielleitung)">Annullieren</button>`;
}
/** 0.21.35: Welche eigenen Strecken sind von Sperren, Verboten, Umwegen oder Abgaben betroffen – heute und angekündigt? */
function geoRoutesHtml() {
  const pl = W.player, rows = [];
  for (const r of pl.activeRoutes()) {
    const ban = W.routeBan(pl, r.base, r.dest), hard = W.opsAt(r.base).hard || W.opsAt(r.dest).hard, dt = W.detour(pl, r.base, r.dest);
    const up = W.upcomingEvents().find((e) => !e.cancelled && ((e.ban && W.routeBan(pl, r.base, r.dest, e.start) === e) || (e.ops && (e.ops.cancel || 0) >= 1 && [r.base, r.dest].some((c) => W.opsAt(c, e.start).hard === e))));
    const ff = Math.max(W.foreignFeeX(pl, r.base), W.foreignFeeX(pl, r.dest));
    const what = ban ? ['crit', `Flugverbot bis ${dateShort(ban.end)}`, ban.short || ''] : hard ? ['crit', `gesperrt bis ${dateShort(hard.end)}`, hard.short || String(hard.text || '').split(':')[0]]
      : up ? ['warn', `ab ${dateShort(up.start)} ${up.ban ? 'verboten' : 'gesperrt'}`, up.short || String(up.text || '').replace(/^Angekündigt: /, '').split(':')[0]]
      : dt.km > 0 ? ['warn', `Umweg +${n0(dt.km)} km (+${pct(dt.x - 1)} Kerosin)`, dt.e.overfly.name || dt.e.short || ''] : ff > 1 ? ['warn', `Sonderabgabe +${pct(ff - 1)}`, ''] : null;
    if (what) rows.push({ r, k: what[0], t: what[1], why: what[2] });
  }
  if (!rows.length) return '';
  rows.sort((a, b) => (a.k === 'crit' ? 0 : 1) - (b.k === 'crit' ? 0 : 1));
  return `<div class="card pad stack"><h3>Ihre Strecken unter Sperren, Verboten und Umwegen <small class="muted">${rows.length}</small></h3>
    <div class="stack" style="gap:6px">${rows.map((x) => `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><b class="mono">${x.r.base}–${x.r.dest}</b><span class="chip ${x.k}">${esc(x.t)}</span><span class="small muted">${esc(x.why)}</span></div>`).join('')}</div>
    <p class="small muted">Gesperrte Strecken fliegen nicht – Flugzeuge und Crews kosten trotzdem. Bei langen Sperren lohnt es, die Flugzeuge auf andere Strecken zu setzen. Umwege kosten Kerosin und Flugzeit, die Preise bleiben gleich.</p></div>`;
}
VIEWS.world = function viewWorld() {
  const M = W.macro;
  const act = W.activeEvents(), up = W.upcomingEvents();
  let html = `<h2 class="sec">Weltlage <small>${dateLong(W.day)}</small></h2>`;
  html += crisisCardsHtml();
  html += `<div class="tiles">
    <div class="tile"><span>Kerosin</span><b>${NF3.format(M.fuelUsd)} $/kg</b><em>Referenz ${NF3.format(M.fuelRefUsd)} $${(() => { const x = SM.setFuelX(W); return Math.abs(x) > 0.03 ? ` · Marktpreise ${x > 0 ? '+' : '−'}${n0(Math.abs(x) * 12)}–${n0(Math.abs(x) * 30)} % (Kerosinzuschlag)` : ''; })()}</em></div>
    <div class="tile"><span>Euro</span><b>${NF3.format(M.eurusd)} $</b><em>Leasing und Kerosin in Dollar</em></div>
    <div class="tile"><span>Leitzins</span><b>${pct(M.rate, 2)}</b><em>Basis für Kredite</em></div>
    <div class="tile"><span>Preisniveau</span><b>${NF1.format(M.cpi * 100)}</b><em>Start 100, Inflation ~2,2 %</em></div>
    <div class="tile"><span>Arbeitsmarkt</span><b>${M.laborTight > 1.2 ? 'angespannt' : 'normal'}</b><em>Piloten${M.laborTight > 1.2 ? ' knapp und teurer' : ' verfügbar'}</em></div>
    <div class="tile"><span>Ereignisse</span><b>${act.length}</b><em>${up.length} angekündigt</em></div>
  </div>`;
  html += worldExtraHtml();
  html += geoRoutesHtml();
  html += `<div class="stack"><h2 class="sec">Konjunktur <small>100 = normal, Geschäftsreisen reagieren am stärksten</small></h2><div class="econ">${[...new Set(stationsOf(W.player).map((c) => P.AIRPORTS[c].country).concat(['US', 'CN', 'DE', 'GB', 'JP', 'IN', 'AE', 'BR']))].map((c) => { const v = M.econ[c]; return `<div><span>${SM.COUNTRY_LABEL[c]}</span><div class="bar"><i class="${v < 0.97 ? 'crit' : v > 1.03 ? 'good' : ''}" style="width:${clampPct((v - 0.8) / 0.4)}%"></i><span class="tgt" style="left:50%"></span></div><b class="num">${n0(v * 100)}</b></div>`; }).join('')}</div></div>`;
  html += `<div class="stack"><h2 class="sec">Ereignisse</h2>${act.length + up.length ? `<div class="news">${up.concat(act).map(eventRow).join('')}</div>` : '<p class="small muted">Ruhige Lage.</p>'}</div>`;
  return html;
};
/** 0.21.50: Lange Listen zuerst gekürzt zeigen (weniger DOM beim Reiterwechsel), „Alle zeigen“ blendet den Rest ein. */
const LIST_N = 20;
const listCap = (arr, key, n = LIST_N, keepFn = null) => { if (ui.showAll && ui.showAll[key]) return arr; const head = arr.slice(0, n); if (keepFn) for (const x of arr.slice(n)) if (keepFn(x)) head.push(x); return head; };
const listMore = (key, total, n = LIST_N, wrap = (h) => h) => (total > n && !(ui.showAll && ui.showAll[key]) ? wrap(`<button class="btn small" data-act="showall" data-k="${key}">Alle ${n0(total)} zeigen</button>`) : '');
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
    <div class="tw"><table class="t rivt"><thead><tr><th>Airline · Modell · Basen</th><th>Muster</th><th class="r">Flotte · Strecken</th><th class="r">Marge</th><th></th></tr></thead><tbody>
    ${listCap(rows.filter(({ al }) => keep(al)), 'riv', LIST_N, (x) => x.al.id === W.playerId).map(({ al, margin }) => `<tr><td><span class="lgi">${logoSvg(al, 18)}</span> ${esc(al.name)}${al.status !== 'active' ? ` <span class="chip crit">${al.mergedInto ? `übernommen von ${esc((W.airlines[al.mergedInto] || {}).name || '?')}` : al.status === 'insolvent' ? 'insolvent' : 'Restrukturierung'}</span>` : ''}<div class="small muted">${al.archetype ? P.AI_ARCHETYPES[al.archetype].label : al.id === W.playerId ? 'Sie' : 'Mitspieler'}${al.bases.length ? ' · ' + al.bases.join(', ') : ''}</div></td><td class="chips">${famsOf(al).map((g) => `<span class="chip ${al.id !== W.playerId && myFams.has(g) ? 'me' : ''}" title="${esc(P.TYPE_GROUPS[g])}${al.id !== W.playerId && myFams.has(g) ? ' – gleiche Piloten wie bei Ihnen' : ''}">${g}</span>`).join(' ') || '<span class="muted">–</span>'}</td><td class="r">${al.fleet.length} · ${al.activeRoutes().length}</td><td class="r ${margin !== null ? sgn(margin) : ''}">${margin === null ? '–' : pct(margin, 1)}</td><td class="r">${al.id !== W.playerId && al.status !== 'insolvent' ? `<button class="btn small" data-act="dealwith" data-al="${al.id}">Handeln</button>` : ''}</td></tr>`).join('')}
  </tbody></table></div>${listMore('riv', rows.filter(({ al }) => keep(al)).length, LIST_N, (h) => `<div class="row">${h}</div>`)}</div>`;
  const overlap = [];
  const mine = new Set(pl.activeRoutes().map((r) => SM.pairKey(r.base, r.dest)));
  for (const al of W.list) if (al.id !== W.playerId) for (const r of al.activeRoutes()) if (mine.has(SM.pairKey(r.base, r.dest))) overlap.push([al, r]);
  html += `<div class="stack"><h2 class="sec">Auf Ihren Strecken</h2>${overlap.length ? `<table class="t"><thead><tr><th>Airline</th><th>Strecke</th><th class="r">Flüge</th><th class="r">Tarife</th><th>Produkt</th></tr></thead><tbody>${overlap.map(([al, r]) => `<tr><td><span class="sw" style="background:${colorOf(al)}"></span> ${esc(al.name)}</td><td>${r.base}–${r.dest}</td><td class="r">${r.freq}x</td><td class="r">${n0(r.fare_out)} / ${n0(r.fare_in)} €</td><td>${svcLabel(r.service)}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Niemand fliegt direkt auf Ihren Strecken. Das bleibt nicht so, wenn die Strecken gut verdienen: Die KI prüft jeden Monat neue Märkte und jedes Quartal neue Basen.</p>'}</div>`;
  html += maHtml();
  html += `<div class="callout info">Die KI-Airlines rechnen mit demselben Nachfragemodell und denselben Flugkosten wie Sie. Sie sehen nur öffentliche Preise und Flugpläne und schätzen die Nachfrage mit eigenem Fehler. Ereignisse treffen alle.</div>`;
  return html;
};
const clampPct = (x) => Math.max(0, Math.min(100, x * 100)).toFixed(0);
// ---------- Sanierung: alle Hebel in der Krise ----------
VIEWS.rescue = function viewRescue() {
  const pl = W.player, R = P.RESTRUCT, o = SM.rescueOptions(W, pl), bs = SM.balanceSheet(pl), crisis = pl.status === 'restructuring', tight = crisis || o.cash < 0 || (pl.runway ?? Infinity) < 60;
  let html = `<h2 class="sec">Sanierung <small>${crisis ? 'Restrukturierung läuft' : tight ? 'Liquidität knapp' : 'für den Notfall'}</small></h2>`;
  html += crisis ? `<div class="callout crit"><b>Noch ${o.daysLeft} Tage bis zur Insolvenz</b>Der Kontostand steht ${eur(o.cash)} – ${o.cash < 0 ? `es fehlen ${eur(-o.cash)}, damit die Uhr stoppt.` : 'positiv halten, dann endet die Restrukturierung.'} Kreditlinie ${eur(o.credit)} von ${eur(o.limit)} genutzt.</div>`
    : `<p class="small ink2">Hier liegen alle Hebel, um Geld zu beschaffen – vorbeugend oder in der Krise. Rutscht das Konto über die Kreditlinie hinaus ins Minus, beginnt nach ${P.RESTRUCTURING_AFTER_DAYS} Tagen die Restrukturierung; nach ${R.humanDays} Tagen im Minus folgt die Insolvenz. Dann wird alles abgewickelt: Flugzeuge gehen billig an den Gebrauchtmarkt, Slots und Gates werden frei, das Personal sucht neue Jobs.</p>`;
  html += `<div class="tiles"><div class="tile"><span>Kontostand</span><b class="${sgn(o.cash)}">${eur(o.cash)}</b><em>Reichweite ${pl.runway === undefined || !isFinite(pl.runway) ? 'stabil' : n0(pl.runway) + ' Tage'}</em></div>
    <div class="tile"><span>Eigenkapital</span><b class="${sgn(bs.equity)}">${eur(bs.equity)}</b><em>Rating ${pl.rating}</em></div>
    <div class="tile"><span>Gestundete Leasingraten</span><b>${pl.defer && pl.defer.owed ? eur(pl.defer.owed) : '–'}</b><em>${pl.defer ? (pl.defer.until > W.day ? `gestundet bis ${dateShort(pl.defer.until)}` : 'wird nachgezahlt') : 'keine Stundung'}</em></div></div>`;
  // Flugzeuge
  const ac = o.aircraft;
  html += `<div class="card pad stack"><h3>Flugzeuge zu Geld machen</h3>${ac.length ? ac.map((a) => `<div class="spread small" style="gap:8px;flex-wrap:wrap"><span><b>${esc(acName(a.id))}</b> · ${tl(a.type)} · ${a.owned ? 'Eigentum' : a.flex ? 'Flex-Leasing' : `Leasing ${eur(a.lease)}/Monat`}${a.used ? '' : ' · <span class="warnc">ungenutzt</span>'}</span><span class="row rsbtns" style="gap:6px">${a.owned
      ? `<button class="btn small" data-act="rsell" data-id="${a.id}">Verkaufen: ${eur(a.sale, { plus: true })}</button><button class="btn small" data-act="rslb" data-id="${a.id}" title="Verkaufen und zurückmieten – das Flugzeug fliegt weiter">Sale & Lease-back: ${eur(a.slb, { plus: true })} · Miete ${eur(a.slbRate)}/Monat</button>`
      : `<button class="btn small" data-act="rsell" data-id="${a.id}">Zurückgeben: ${eur(a.ret, { plus: true })}</button>`}</span></div>`).join('') : '<p class="small muted">Keine Flugzeuge.</p>'}
    <p class="small muted">Verkauf: Erlös abzüglich Kredit. Sale & Lease-back: Ein Leasinggeber kauft das Flugzeug zum Marktwert und vermietet es Ihnen zurück – Geld sofort, das Flugzeug fliegt weiter. Rückgabe von Leasingflugzeugen: Kaution zurück minus Strafe${crisis ? ` (in der Restrukturierung nur ${pct(R.returnPenX)} der üblichen Strafe)` : ''}. Strecken ohne Flugzeug fliegen erst wieder, wenn eins frei ist.</p></div>`;
  // Rechte und Beteiligungen
  html += `<div class="card pad stack"><h3>Rechte und Beteiligungen verkaufen</h3>
    ${o.slots.map((x) => `<div class="spread small"><span>${x.n} Slot${x.n > 1 ? 's' : ''} in ${x.apt} (Reserve)</span><button class="btn small" data-act="rslot" data-apt="${x.apt}">${x.buyer ? `an ${esc(x.buyer)}` : 'an den Flughafen'}: +${eur(x.value)}</button></div>`).join('')}
    ${o.stakes.map((x) => `<div class="spread small"><span>${pct(x.f, 1)} an ${esc(x.name)}</span><button class="btn small" data-act="rstake" data-id="${x.id}">verkaufen: +${eur(x.value)}</button></div>`).join('')}
    ${o.gates.map((x) => `<div class="spread small"><span>Exklusivvertrag ${x.apt}</span><button class="btn small" data-act="rgate" data-apt="${x.apt}">kündigen: +${eur(x.value)}</button></div>`).join('')}
    ${!o.slots.length && !o.stakes.length && !o.gates.length ? '<p class="small muted">Keine freien Slots in Reserve, keine Beteiligungen, keine Exklusivverträge. Slots auf laufenden Strecken werden frei, wenn Sie die Strecke einstellen – dann lassen sie sich hier verkaufen.</p>' : ''}
    <p class="small muted">Slots verkaufen Sie an eine KI-Airline vor Ort (${pct(R.slotAI)} des Marktpreises) oder zurück an den Flughafen (${pct(R.slotPool)}).</p></div>`;
  // Kapital
  const iq = SM.issueQuote(W, pl, 0.2), c = SM.capState(pl);
  html += `<div class="card pad stack"><h3>Kapital und Gläubiger</h3>
    <div class="spread small" style="gap:8px;flex-wrap:wrap"><span><b>Leasingraten stunden</b> – ${R.defer.days} Tage keine Raten, danach über ${R.defer.repayDays} Tage nachzahlen (+${pct(R.defer.fee)})</span><button class="btn small" data-act="rdefer" ${pl.defer && W.day - pl.defer.day < R.defer.gap ? 'disabled' : ''}>Stundung beantragen</button></div>
    <div class="spread small" style="gap:8px;flex-wrap:wrap"><span><b>Notkapitalerhöhung</b> – neue Aktien mit ${pct(R.issueDisc)} Abschlag, ohne Sperrfrist${crisis ? '' : ' (nur in der Restrukturierung)'}</span><button class="btn small" data-act="capissue" data-q="${Math.min(0.2, Math.max(0.01, (P.CAPITAL.extMax - c.ext) / Math.max(0.01, 1 - c.ext)))}" ${crisis ? '' : 'disabled'}>bis +${eur(iq.net)}</button></div>
    <div class="spread small" style="gap:8px;flex-wrap:wrap"><span><b>Schulden gegen Aktien</b> – die Bank wandelt Ihre genutzte Kreditlinie (${eur(o.credit)}) in Aktien, der Rahmen ist danach wieder frei</span><button class="btn small" data-act="rswap" ${crisis && o.credit > 1e5 ? '' : 'disabled'}>wandeln</button></div>
    <div class="spread small" style="gap:8px;flex-wrap:wrap"><span><b>Sanierungskredit</b> – ein Fonds leiht ${pct(R.rescue.share)} Ihrer Flugzeuge, Slots und Beteiligungen zu ${pct(R.rescue.rate)} Zins, ${R.rescue.years} Jahre</span><button class="btn small" data-act="rloan" ${crisis && !pl.rescueLoan ? '' : 'disabled'}>beantragen</button></div>
    <p class="small muted">Außerdem: Verlustbringer unter <a href="#" data-act="tab" data-tab="routes">Strecken</a> einstellen, Personal und Gehälter unter <a href="#" data-act="tab" data-tab="staff">Personal</a> anpassen, eine Basis schließen, Marketing kürzen.</p></div>`;
  return html;
};
function onRescueClick(act, b) {
  if (!['rsell', 'rslb', 'rslot', 'rstake', 'rgate', 'rdefer', 'rswap', 'rloan'].includes(act)) return false;
  let r = null;
  if (act === 'rsell') { r = doAction({ type: 'dispose', acId: b.dataset.id }); if (r.ok) toast('Flugzeug abgegeben.'); }
  else if (act === 'rslb') { r = doAction({ type: 'saleLeaseback', acId: b.dataset.id }); if (r.ok) toast(`Verkauft und zurückgemietet: ${eur(r.value)} Erlös, ${eur(r.lease)}/Monat Miete.`); }
  else if (act === 'rslot') { r = doAction({ type: 'sellSlots', apt: b.dataset.apt, n: 'all' }); if (r.ok) toast(`Slots verkauft: +${eur(r.back)}.`); }
  else if (act === 'rstake') { r = doAction({ type: 'sellStake', target: b.dataset.id, q: 1 }); if (r.ok) toast(`Beteiligung verkauft: +${eur(r.proceeds)}.`); }
  else if (act === 'rgate') { r = doAction({ type: 'gateLock', apt: b.dataset.apt, on: false }); if (r.ok) toast(`Exklusivvertrag gekündigt${r.back ? `: +${eur(r.back)}` : ''}.`); }
  else if (act === 'rdefer') { r = doAction({ type: 'leaseDefer' }); if (r.ok) toast('Leasingraten gestundet.'); }
  else if (act === 'rswap') { r = doAction({ type: 'debtSwap' }); if (r.ok) toast(`${eur(r.amount)} Schulden in ${pct(r.q, 1)} Aktien gewandelt.`); }
  else if (act === 'rloan') { r = doAction({ type: 'rescueLoan' }); if (r.ok) toast(`Sanierungskredit: +${eur(r.amount)}.`); }
  refreshAll(); return true;
}
// ---------- Börse: Aktien, Beteiligungen, Kapitalerhöhung, Rückkauf, Dividende, Anleihen ----------
const mio = (x) => `${NF1.format((x || 0) / 1e6)} Mio. €`;
function miniSpark(vals) {
  if (!vals || vals.length < 2) return '<span class="small muted">–</span>';
  const mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1, w = 70, h = 20;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(i / (vals.length - 1) * w).toFixed(1)},${(h - 2 - (v - mn) / sp * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="${vals.at(-1) >= vals[0] ? 'var(--good)' : 'var(--crit)'}" stroke-width="1.5"/></svg>`;
}
function capChg(al) { const h = (al.cap && al.cap.hist) || []; return h.length >= 2 && h.at(-2) ? h.at(-1) / h.at(-2) - 1 : null; }
VIEWS.exchange = function viewExchange() {
  const pl = W.player, C = P.CAPITAL, c = SM.capState(pl), cap = SM.mktCap(W, pl), fl = SM.floatOf(W, pl), hs = SM.holdersOf(W, pl), bs = SM.balanceSheet(pl);
  const chg = capChg(pl), ann = SM.annualResult(pl), opE = SM.earnRecent(pl);
  let html = `<h2 class="sec">Börse <small>Aktien, Beteiligungen, Kapital</small></h2>
    <p class="small ink2">Jede Airline hat einen Börsenwert: Eigenkapital plus das Fünffache des operativen Jahresergebnisses (Mittel aus dem Schnitt der letzten zwölf und der letzten sechs Monate, ohne Sondereffekte und Beteiligungserträge; Verluste zählen doppelt), dazu 80 % der stillen Reserven in Beteiligungen (Börsenwert über Buchwert), mindestens 60 % des Eigenkapitals und nie unter dem Vierfachen des operativen Jahresergebnisses (KGV 4), dazu die Stimmung am Markt. Der Kurs wird zum Monatswechsel festgestellt und geht dabei den halben Weg zum neuen Wert – ohne Obergrenze nach oben oder unten; Kapitalerhöhungen, Rückkäufe und Dividenden verschieben ihn sofort um das bewegte Geld. Sie können Anteile anderer Airlines kaufen und bekommen dann Ihren Anteil am Gewinn (und Verlust) und an den Dividenden. Ab 25 % greift eine KI-Airline Ihre Strecken nicht mehr an, ab 50 % wird sie Konzernpartnerin und Sie können den Rest übernehmen. Eigene Aktien verkaufen bringt frisches Geld.</p>`;
  html += `<div class="tiles">
    <div class="tile"><span>Ihr Börsenwert</span><b>${mio(cap)}</b><em>${chg === null ? 'Verlauf ab dem ersten Monat' : `${chg >= 0 ? '+' : ''}${pct(chg)} zum Vormonat`}</em></div>
    <div class="tile"><span>Ihnen gehören</span><b>${pct(1 - c.ext)}</b><em>${c.ext > 0 ? `Streubesitz ${pct(fl)}${hs.length ? ' · ' + hs.map((h) => `${esc(h.al.name)} ${pct(h.f)}`).join(', ') : ''}` : 'alle Aktien'}</em></div>
    <div class="tile"><span>Jahresergebnis (hochgerechnet)</span><b class="${sgn(ann)}">${mio(ann)}</b><em title="KGV = Börsenwert ÷ operatives Jahresergebnis (letzte sechs Monate hochgerechnet, ohne Sondereffekte und Beteiligungserträge)">${opE > 0 ? `operativ ${mio(opE)} · KGV ${NF1.format(cap / opE)}` : 'operativ noch kein Gewinn'}</em></div>
    <div class="tile"><span>Beteiligungen</span><b>${mio(bs.stakes)}</b><em>Buchwert · Anleihen ${mio(bs.bonds)}</em></div>
  </div>`;
  // Eigenes Kapital
  const lv = SM.careerLv(pl) ?? 4, qs = [0.05, 0.1, 0.2].map((q) => ({ q, x: SM.issueQuote(W, pl, q) }));
  const gapLeft = W.day - (c.last ?? -999) < C.issueGap ? C.issueGap - (W.day - c.last) : 0;
  html += `<div class="grid2"><div class="card pad stack"><h3>Eigene Aktien</h3>
    <p class="small ink2">Kapitalerhöhung: neue Aktien an Anleger, das Geld geht in Ihre Kasse, Ihr Anteil sinkt. Höchstens ${pct(C.extMax)} dürfen außerhalb Ihrer Hand sein – Sie behalten immer die Mehrheit. Junge Airlines müssen die Aktien billiger abgeben (Abschlag jetzt ${pct(C.issueDisc[Math.min(lv, C.issueDisc.length - 1)])}).</p>
    <div class="row" style="gap:6px;flex-wrap:wrap">${qs.map(({ q, x }) => `<button class="btn small" data-act="capissue" data-q="${q}" ${x.extAfter > C.extMax + 1e-9 || gapLeft ? 'disabled' : ''} title="Danach ${pct(x.extAfter)} außerhalb">${pct(q)} neue Aktien: +${mio(x.net)}</button>`).join('')}</div>
    ${gapLeft ? `<p class="small muted">Nächste Kapitalerhöhung in ${gapLeft} Tagen möglich.</p>` : ''}
    ${fl > 0.004 ? (() => { const lock = Math.max(0, C.lockDays - (W.day - (c.last ?? -999))), done = (c.bb || []).filter((x) => x.day > W.day - C.buybackGap).reduce((a, x) => a + x.q, 0), left = Math.max(0, C.buybackMax - done);
      return `<div class="row" style="gap:6px;flex-wrap:wrap"><span class="small muted">Rückkauf aus dem Streubesitz:</span>${lock ? `<span class="small muted">nach der Kapitalerhöhung noch ${lock} Tage gesperrt</span>` : left < 0.005 ? `<span class="small muted">Limit von ${pct(C.buybackMax)} je ${C.buybackGap} Tage erreicht</span>` : [0.05, Math.min(fl, left)].filter((q, i, a) => q <= Math.min(fl, left) + 1e-9 && q >= 0.005 && a.indexOf(q) === i).map((q) => `<button class="btn small" data-act="capbuyback" data-q="${q}">${pct(q)} für ${mio(SM.buybackPrice(W, pl, q))}</button>`).join('')}</div>
      <p class="small muted">Rückkäufe: höchstens ${pct(C.buybackMax)} je ${C.buybackGap} Tage, nie unter dem höchsten Monatskurs der letzten ${C.buybackHist} Monate; ${C.lockDays} Tage nach einer Kapitalerhöhung gesperrt (und umgekehrt).</p>`; })() : ''}
    <div class="row" style="gap:6px;flex-wrap:wrap"><span class="small muted">Dividende vom Monatsgewinn:</span><div class="seg">${C.divOpts.map((v) => `<button data-act="capdiv" data-v="${v}" aria-pressed="${Math.abs((c.div ?? 0) - v) < 1e-6}">${pct(v)}</button>`).join('')}</div></div>
    <p class="small muted">${c.ext > 0 ? `Dividenden gehen an alle Aktionäre außerhalb (${pct(c.ext)} der Aktien) – keine Dividende drückt den Kurs.` : 'Solange alle Aktien Ihnen gehören, fließt keine Dividende ab.'} Satzung: Liegen mehr als ${pct(C.minDivExt)} der Aktien bei anderen, gehen in Gewinnmonaten mindestens ${pct(C.minDiv)} des Monatsgewinns an sie – auch wenn Sie weniger wählen (außer die Kasse reicht nicht oder das Eigenkapital ist negativ).${c.ext >= C.minDivExt && (c.div ?? 0) < C.minDiv ? ` <b>Für Sie gilt derzeit die Mindestquote von ${pct(C.minDiv)}.</b>` : ''}</p></div>
    <div class="card pad stack"><h3>Anleihen</h3>
    <p class="small ink2">Geld vom Kapitalmarkt gegen festen Zins, Rückzahlung am Ende in einer Summe. Zins jetzt <b>${(SM.bondRate(W, pl) * 100).toFixed(1).replace('.', ',')} %</b> (Rating ${pl.rating}), höchstens so viel wie Ihr Eigenkapital.</p>
    <div class="row" style="gap:6px;flex-wrap:wrap"><select id="bond-amt" style="width:auto">${[1, 2, 5, 10, 20, 50].map((v) => `<option value="${v * 1e6}" ${(ui.bondAmt || 5e6) === v * 1e6 ? 'selected' : ''}>${v} Mio. €</option>`).join('')}</select><select id="bond-yrs" style="width:auto">${C.bond.years.map((y) => `<option value="${y}" ${(ui.bondYrs || 5) === y ? 'selected' : ''}>${y} Jahre</option>`).join('')}</select><button class="btn small primary" data-act="capbond">Anleihe begeben</button></div>
    ${(pl.bonds || []).length ? pl.bonds.map((b) => `<div class="spread small" style="gap:8px;flex-wrap:wrap"><span><b>${mio(b.amount)}</b> · ${(b.rate * 100).toFixed(1).replace('.', ',')} % · fällig ${dateShort(b.until)}</span><button class="btn small" data-act="capbondpay" data-id="${b.id}">vorzeitig zurückzahlen (+2 %)</button></div>`).join('') : '<p class="small muted">Keine Anleihen offen.</p>'}</div></div>`;
  // Beteiligungen
  const stakes = Object.entries(pl.stakes || {}).filter(([id]) => W.airlines[id]);
  if (stakes.length) html += `<div class="stack"><h2 class="sec sm">Ihre Beteiligungen</h2>
    ${stakes.map(([id, st]) => { const T = W.airlines[id], mv = SM.mktCap(W, T) * st.f, ma = T.archetype ? SM.maValue(W, T, pl) : null, conf = ui.confirm === 'ma:' + id;
      return `<div class="card pad stack stk"><div class="spread"><b>${logoSvg(T, 20)} ${esc(T.name)}</b><span>${st.f >= C.majority ? '<span class="chip good">Mehrheit</span>' : st.f >= C.blocking ? '<span class="chip">Sperrminorität</span>' : ''} <b>${pct(st.f, 1)}</b></span></div>
        <div class="stk-kv"><span><em>Buchwert</em>${mio(st.book)}</span><span><em>Marktwert</em>${mio(mv)}</span><span><em>anteiliger Gewinn</em><b class="${sgn(st.inc || 0)}">${mio(st.inc || 0)}</b></span><span><em>Dividenden</em>${mio(st.div || 0)}<small class="muted"> · Quote ${pct(SM.divRate(T, 1))}${T.isPlayer && SM.divRate(T, 1) > (SM.capState(T).div ?? 0) ? ' (Mindestquote)' : ''}</small></span></div>
        ${groupHtml(pl, T, st)}
        <div class="row" style="gap:6px;flex-wrap:wrap">${SM.floatOf(W, T) > 0.0009 ? [0.01, 0.05].map((q) => `<button class="btn small" data-act="capbuy" data-t="${id}" data-q="${q}">+${pct(q)} für ${mio(SM.stakeBuyPrice(W, pl, T, Math.min(q, SM.floatOf(W, T))))}</button>`).join('') : ''}${[0.01, 0.05].filter((q) => q < st.f - 1e-9).map((q) => `<button class="btn small" data-act="capsell" data-t="${id}" data-q="${q}">−${pct(q)}</button>`).join('')}<button class="btn small" data-act="capsell" data-t="${id}" data-q="${st.f}">alles verkaufen</button>${capQtyHtml(id, true)}
        ${ma ? (conf ? `<button class="btn small danger" data-act="takeover" data-id="${id}">Ja, ${mio(ma.price)} bieten</button><button class="btn small" data-act="cancelconfirm">Nein</button>` : `<button class="btn small ${st.f >= C.majority ? 'primary' : ''}" data-act="askma" data-id="${id}" title="Angebot für die restlichen ${pct(ma.rest)}">Rest (${pct(ma.rest)}) übernehmen: ${mio(ma.price)}</button>`) : ''}</div></div>`; }).join('')}
    <p class="small muted">Anteiliger Gewinn: Ihr Anteil am Monatsergebnis wird Ihnen jeden Monat gutgeschrieben (Buchwert steigt oder fällt), Dividenden kommen als Geld. Übernahmeangebot für den Rest: mit Mehrheit Börsenwert × ${NF1.format(C.tender)}, ohne Mehrheit × ${NF1.format(C.hostile)}. Große Airlines haben Ankeraktionäre (Staat, Gründerfamilie, Fonds): Deren Anteil ist nicht an der Börse zu haben – sie verkaufen nur bei einer Komplettübernahme, nur an eine vergleichbar große Airline (mindestens ${pct(C.anchor.buyerSize)} der Flotte) und mit ${pct(C.anchor.prem)} Aufschlag.</p></div>`;
  // Markt
  const rows = W.list.filter((a) => a.id !== pl.id && a.status !== 'insolvent' && !a.removed).map((a) => ({ a, cap: SM.mktCap(W, a), fl: SM.floatOf(W, a), ann: SM.earnRecent(a) })).sort((x, y) => y.cap - x.cap);
  html += `<div class="stack"><h2 class="sec sm">Aktienmarkt <small>${rows.length} Airlines</small></h2><div class="stk-list">
    ${listCap(rows, 'stk', LIST_N, (x) => SM.stakeOf(pl, x.a) > 0).map(({ a, cap: cp, fl: f, ann: an }) => { const mine = SM.stakeOf(pl, a), hs2 = SM.holdersOf(W, a).filter((h) => h.al.id !== pl.id), ch = capChg(a);
      return `<div class="stk-row"><div class="stk-name">${logoSvg(a, 18)} <b>${esc(a.name)}</b>${a.isPlayer ? ' <span class="chip">Mitspieler</span>' : ''}${mine ? ` <span class="chip me">Sie ${pct(mine, 1)}</span>` : ''}<div class="small muted"><span title="Börsenwert ÷ operatives Jahresergebnis (letzte sechs Monate hochgerechnet, ohne Sondereffekte und Beteiligungserträge)">KGV ${an > 0 ? NF1.format(cp / an) : '–'}</span> · frei ${pct(f)}${a.archetype && SM.capState(a).ext < 0.999 ? ` · <span title="Staat, Gründerfamilie oder Fonds – verkaufen nicht an der Börse">Ankeraktionäre ${pct(1 - SM.capState(a).ext)}</span>` : ''}${hs2.length ? ' · ' + hs2.map((h) => `${esc(h.al.name)} ${pct(h.f)}`).join(', ') : ''}</div></div>
        <div class="stk-val">${miniSpark(a.cap && a.cap.hist)}<span><b>${mio(cp)}</b>${ch !== null ? `<em class="${ch >= 0 ? 'pos' : 'neg'}">${ch >= 0 ? '+' : ''}${pct(ch)}</em>` : ''}</span></div>
        <div class="stk-act">${f >= 0.001 ? [0.01, 0.05, 0.1].filter((q) => q <= f + 1e-9).map((q) => `<button class="btn small" data-act="capbuy" data-t="${a.id}" data-q="${q}">${pct(q)}: ${mio(SM.stakeBuyPrice(W, pl, a, q))}</button>`).join('') + capQtyHtml(a.id, false) : '<span class="small muted">nichts frei</span>'}</div></div>`; }).join('')}
    </div>${listMore('stk', rows.length, LIST_N, (h) => `<div class="row">${h}</div>`)}<p class="small muted">Große Pakete auf einmal treiben den Kurs (je 10 % rund ${pct(C.impact * 0.1)} Aufschlag); für die Anteile, mit denen Sie die Mehrheit überschreiten, kommt einmalig eine Kontrollprämie von ${pct(C.control)} dazu. Verkäufe großer Pakete drücken den Preis. Gebühr ${pct(C.fee)} je Kauf und Verkauf. Mitspielende haben nur so viele Aktien frei, wie sie selbst an die Börse gebracht haben.</p></div>`;
  return html;
};
/** 0.21.44: Börse – beliebiger Anteil in 0,1-%-Schritten. */
function capQtyHtml(id, sell) {
  return `<span class="capq"><input type="number" id="capq-${id}" min="0.1" max="100" step="0.1" value="${(ui.capQ && ui.capQ[id]) || 2.5}" aria-label="Anteil in Prozent"><span class="small muted">%</span><button class="btn small" data-act="capbuyx" data-t="${id}">kaufen</button>${sell ? `<button class="btn small" data-act="capsellx" data-t="${id}">verkaufen</button>` : ''}</span>`;
}
/** Konzernvorteile einer Beteiligung: Stufen 25 % (Sperrminorität) und 50 % (Mehrheit), bis zur Übernahme. */
function groupHtml(pl, T, st) {
  if (!T.archetype) return '';
  const C = P.CAPITAL, f = st.f, maj = f >= C.majority, blk = f >= C.blocking, c = SM.capState(T);
  const last = T.ledger.months.at(-1), res = last ? Object.entries(last.acc).reduce((x, [k, v]) => x + (k.startsWith('cf_') ? 0 : v), 0) / 100 : 0;
  const ben = (on, t) => `<li class="${on ? 'on' : ''}">${on ? '✓' : '○'} ${t}</li>`;
  let h = `<div class="grp"><div class="grp-kv small"><span><em>Monatsergebnis</em><b class="${sgn(res)}">${mio(res)}</b></span><span><em>Kasse</em>${mio(T.ledger.cash / 100)}</span><span><em>Flotte · Strecken</em>${T.fleet.length} · ${T.activeRoutes().length}</span><span><em>Basen</em>${T.bases.join(', ')}</span></div>
    <ul class="grp-ben small">
      ${ben(blk, 'ab 25 %: greift Ihre Strecken nicht mehr an')}
      ${ben(blk, `ab 25 %: im Handel ${maj ? 'ohne' : 'nur halber'} Aufschlag`)}
      ${ben(maj, 'ab 50 %: Konzernallianz – Codeshare auf gemeinsamen Strecken, 2 % günstigeres Kerosin')}
      ${ben(maj, 'ab 50 %: eröffnet keine Strecken gegen Sie und unterbietet Ihre Preise nicht')}
      ${ben(maj, 'ab 50 %: Sie bestimmen die Ausschüttung und können Sonderausschüttungen verlangen')}
      ${ben(false, 'erst bei Übernahme (100 %): Flotte, Strecken, Basen und Personal gehen auf Sie über')}
    </ul>`;
  if (maj) {
    const q = SM.groupSpecialQuote(W, T), mine = q.total * f;
    h += `<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><span class="small muted">Ausschüttung vom Monatsgewinn:</span><div class="seg">${C.group.divOpts.map((v) => `<button data-act="grpdiv" data-t="${T.id}" data-v="${v}" aria-pressed="${Math.abs((c.div ?? 0) - v) < 1e-6}">${pct(v)}</button>`).join('')}</div>
      <span class="small muted">${res > 0 ? `≈ ${mio(res * (c.div ?? 0) * f)} im Monat an Sie` : 'zurzeit kein Gewinn'}</span></div>
      <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><button class="btn small primary" data-act="grpspec" data-t="${T.id}" ${q.wait || q.total < 1e5 ? 'disabled' : ''}>Sonderausschüttung · ${mio(mine)} an Sie</button>
        <button class="btn small" data-act="grpdeal" data-t="${T.id}">Konzernhandel: Angebot an ${esc(T.name)}</button>
        <span class="small muted">${q.wait ? `wieder möglich in ${q.wait} Tagen` : q.total < 1e5 ? 'keine freie Liquidität über der Betriebsreserve' : `${pct(C.group.specShare)} der freien Liquidität (${mio(SM.groupFreeCash(W, T))}), alle ${C.group.specGap} Tage`}</span></div>
      <p class="small muted">Hohe Ausschüttungen bringen Ihnen Geld, bremsen aber das Wachstum der Tochter. Flugzeuge, Slots und Crews übernehmen Sie im Konzernhandel zum fairen Wert, ohne Aufschlag.</p>`;
  } else h += `<p class="small muted">${blk ? `Noch ${pct(C.majority - f, 1)} bis zur Mehrheit.` : `Noch ${pct(C.blocking - f, 1)} bis zur Sperrminorität.`}</p>`;
  return h + '</div>';
}
function onCapClick(act, b) {
  if (act === 'grpdiv') { const r = doAction({ type: 'groupDiv', t: b.dataset.t, v: Number(b.dataset.v) }); if (r.ok) toast(`Ausschüttung ${pct(Number(b.dataset.v))} festgelegt.`); refreshAll(); return true; }
  if (act === 'grpspec') { const r = doAction({ type: 'groupSpecial', t: b.dataset.t }); if (r.ok) toast(`Sonderausschüttung: ${mio(r.mine)} an Sie.`); refreshAll(); return true; }
  if (act === 'grpdeal') { startDeal(b.dataset.t); return true; }
  if (!act.startsWith('cap')) return false;
  const pl = W.player;
  let q = Number(b.dataset.q);
  if (act === 'capbuyx' || act === 'capsellx') { const inp = $(`#capq-${b.dataset.t}`), v = Math.round(Number(inp && inp.value) * 10) / 10; if (!(v >= 0.1)) { toast('Bitte einen Anteil ab 0,1 % angeben.'); return true; } (ui.capQ = ui.capQ || {})[b.dataset.t] = v; q = v / 100; act = act === 'capbuyx' ? 'capbuy' : 'capsell'; }
  let r = null;
  if (act === 'capbuy') { r = doAction({ type: 'buyStake', target: b.dataset.t, q }); if (r.ok) toast(`${pct(r.q, 1)} für ${mio(r.cost)} gekauft – Sie halten jetzt ${pct(r.f, 1)}.`); }
  else if (act === 'capsell') { r = doAction({ type: 'sellStake', target: b.dataset.t, q }); if (r.ok) toast(`Verkauft für ${mio(r.proceeds)} (${r.gain >= 0 ? 'Gewinn' : 'Verlust'} ${mio(Math.abs(r.gain))}).`); }
  else if (act === 'capissue') { r = doAction({ type: 'issueShares', q }); if (r.ok) toast(`Kapitalerhöhung: +${mio(r.net)} in der Kasse.`); }
  else if (act === 'capbuyback') { r = doAction({ type: 'buyback', q }); if (r.ok) toast(`Rückkauf für ${mio(r.cost)}.`); }
  else if (act === 'capdiv') { r = doAction({ type: 'dividend', v: Number(b.dataset.v) }); }
  else if (act === 'capbond') { const amt = Number(($('#bond-amt') || {}).value || 5e6), yrs = Number(($('#bond-yrs') || {}).value || 5); ui.bondAmt = amt; ui.bondYrs = yrs; r = doAction({ type: 'issueBond', amount: amt, years: yrs }); if (r.ok) toast(`Anleihe über ${mio(r.amount)} zu ${(r.rate * 100).toFixed(1).replace('.', ',')} % begeben.`); }
  else if (act === 'capbondpay') { r = doAction({ type: 'repayBond', id: b.dataset.id }); if (r.ok) toast('Anleihe zurückgezahlt.'); }
  else return false;
  refreshAll(); return true;
}
/** Übernahmen: KI-Airlines kaufen – mit Flotte, Strecken, Basen, Personal, Kasse und Schulden. */
function maHtml() {
  const pl = W.player, ais = W.list.filter((a) => a.archetype && a.status !== 'insolvent');
  if (!ais.length) return '';
  const block = SM.maBlock(W, pl, ais[0]), free = pl.spendable(W.macro.bank ?? 1), mx = SM.softX(pl, 'ma');
  const rows = ais.map((a) => ({ a, v: SM.maValue(W, a, pl) })).sort((x, y) => x.v.price - y.v.price);
  return `<div class="stack"><h2 class="sec">Übernahmen <small>KI-Airlines komplett kaufen</small></h2>
    ${mx > 1 ? `<div class="callout warn">Ihre Airline ist für Übernahmen noch klein: Verkäufer und Banken verlangen +${n0((mx - 1) * 100)} % auf den Kaufpreis. Ohne Aufschlag ab einem Ansehen von 40 (jetzt ${SM.standingOf(pl, W.day).v}).</div>` : ''}
    <div class="tw"><table class="t"><thead><tr><th>Airline</th><th class="r">Flotte · Strecken</th><th class="r">Eigenkapital · Ergebnis/Mon.</th><th class="r">Ihr Anteil · Preis für den Rest</th></tr></thead><tbody>
    ${rows.map(({ a, v }) => { const c = ui.confirm === 'ma:' + a.id; return `<tr><td><span class="lgi">${logoSvg(a, 18)}</span> ${esc(a.name)}<div class="small muted">Basis ${v.bases.join(', ')}</div></td><td class="r">${v.fleet} · ${v.routes}</td><td class="r">${eur(v.equity)}<div class="small ${v.profM < 0 ? 'neg' : 'pos'}">${eur(v.profM, { plus: true })}</div></td><td class="r wrap">${v.f ? `${pct(v.f, 1)} · ` : ''}<b>${eur(v.price)}</b>
      ${v.anchor > 0.001 ? `<div class="small muted">inkl. ${pct(v.anchor)} Ankeraktionäre (+${eurB(v.ancX)})</div>` : ''}<div>${SM.maBlock(W, pl, a) ? `<span class="small muted" title="${esc(SM.maBlock(W, pl, a))}">Ankeraktionäre verkaufen nicht</span>` : c ? `<span class="small">Wirklich kaufen?</span> <button class="btn small danger" data-act="takeover" data-id="${a.id}">Ja, für ${eurB(v.price)} übernehmen</button> <button class="btn small" data-act="cancelconfirm">Nein</button>` : `<button class="btn small ${free >= v.price ? 'primary' : ''}" data-act="askma" data-id="${a.id}" ${free >= v.price ? '' : 'disabled title="Dafür reicht das Geld nicht"'}>Übernehmen</button>`}</div></td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="callout ${SM.limitsLifted(pl) ? 'good' : 'info'}"><b>${SM.limitsLifted(pl) ? 'Konzern: Wachstumsgrenzen gelockert' : 'Nach einer Komplettübernahme gelten gelockerte Wachstumsgrenzen'}</b><span class="small">Mehr als ${P.BASE_MAX} Basen möglich – ab der ${P.BASE_RULE.extraFrom}. aber mit Konzessionsabgabe ab ${eurB(P.BASE_RULE.extraFee * cpi())} und nur ${P.BASE_RULE.extraSlots} Slots; höchstens ${P.BASE_RULE.perYear} neue Basen je Kalenderjahr. Keine Aufschläge für Drehkreuz-Ausbau und Übernahmen. Gilt nach einem Übernahmeangebot oder mit 100 % der Aktien einer anderen Airline.</span></div>
    <p class="small muted">Komplettübernahme: Angebot für alle Aktien, die Sie noch nicht haben – ohne Mehrheit Börsenwert × ${NF1.format(P.CAPITAL.hostile)} (feindlich), mit Mehrheit × ${NF1.format(P.CAPITAL.tender)}${mx > 1 ? `, dazu ×${NF1.format(mx)} für Ihr Ansehen` : ''}, Ankeraktionäre großer Airlines +${pct(P.CAPITAL.anchor.prem)} auf ihren Anteil. Günstiger geht es Schritt für Schritt: erst unter <a href="#" data-act="tab" data-tab="exchange">Börse</a> Anteile kaufen (anteiliger Gewinn und Dividenden inklusive), ab 50 % den Rest übernehmen. Sie übernehmen alles: Flugzeuge mit Leasingverträgen und Krediten, Strecken samt Slots, Basen, Personal, Kasse und Bankschulden. Die Prämie über dem Buchwert wird sofort abgeschrieben.</p></div>`;
}

// ---------- Meldungen ----------
function mergedNews() {
  const pl = W.player;
  const a = W.news.map((n) => ({ day: n.day, msg: n.msg, kind: n.kind, who: n.airline, eid: n.eid }));
  // Weltmeldungen stehen oft auch im eigenen Logbuch – dort nicht doppelt und nicht als „eigene“ Meldung zeigen
  const seen = new Set(W.news.map((n) => n.day + '|' + String(n.msg || '').replace(/^Angekündigt: /, '')));
  const b = pl.events.filter((e) => !seen.has(e.day + '|' + e.msg)).map((e) => ({ day: e.day, msg: e.msg, kind: e.kind, who: W.playerId }));
  return a.concat(b).sort((x, y) => y.day - x.day);
}
function newsRow(n) {
  const al = W.airlines[n.who];
  const cls = n.kind === 'crit' ? 'crit' : n.kind === 'warn' ? 'warn' : n.kind === 'good' ? 'good' : '';
  return `<div><time>${dateShort(n.day)}</time><span class="${cls}">${al ? `<span class="sw" style="background:${colorOf(al)}"></span> ` : ''}${esc(n.msg)}</span>${evCancelBtn(n.eid)}</div>`;
}
VIEWS.news = function viewNews() {
  const list = mergedNews().slice(0, 150);
  return `<h2 class="sec">Meldungen <small>Ihre Airline und der Markt</small></h2>${list.length ? `<div class="news">${list.map(newsRow).join('')}</div>` : '<p class="muted">Noch keine Meldungen.</p>'}`;
};

// ---------- Einsatzplan: Flugzeuge festen Strecken zuweisen ----------
const MODE_LABEL = { auto: 'Automatisch', manual: 'Feste Strecken', reserve: 'Reserve', charter: 'Charter-Pool' };
const ROUTE_HUES = [212, 152, 266, 32, 330, 186, 48, 0, 100, 290];
const routeColor = (r) => `hsl(${ROUTE_HUES[Math.max(0, W.player.routes.indexOf(r)) % ROUTE_HUES.length]} 75% 58%)`;
const acMode = (a) => a.mode || 'auto';
function unplacedNow() {
  const pl = W.player, { unplaced } = pl.plan(W.day, pl.activeRoutes().filter((r) => r.opened_day <= W.day));
  return Object.entries(unplaced).map(([rid, k]) => [pl.routes.find((r) => r.id === rid.replace('~', '')), k, rid.endsWith('~')]).filter(([r]) => r);   // „~“: zweites Muster der Strecke
}
function ganttSvg(a) {
  const s = schedules.find((x) => x.ac.id === a.id), X = (h) => Math.max(0, Math.min(24, h)) / 24 * 100;
  let body = '';
  const block = (cls, txt) => `<span class="gt-blk ${cls}" style="left:0;width:100%">${txt}</span>`;
  if (a.delivery_day > W.day) body = block('off', `Lieferung ${dateShort(a.delivery_day)}`);
  else if ((a.status === 'ccheck' || a.status === 'aog') && a.until > W.day) body = block('bad', `${a.status === 'ccheck' ? 'C-Check' : a.grounded ? 'Stilllegung' : 'Schaden'} bis ${dateShort(a.until)}`);
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
  if (miss.length) html += `<div class="callout warn"><b>Umläufe ohne Flugzeug</b>${miss.map(([r, k, mx]) => `${r.base}–${r.dest}: ${k} von ${mx ? r.mix.freq : r.freq - (r.mix ? r.mix.freq : 0)} (${tl(mx ? r.mix.type_id : r.type_id)})`).join(' · ')}. Diese Flüge fallen aus. Weitere Flugzeuge auf Automatik stellen, Zuweisungen ändern oder die Frequenz senken.</div>`;
  if (!pl.fleet.length) return html + '<div class="callout info">Noch keine Flugzeuge.</div>';
  html += `<div class="gt-axis"><span></span><div><span>0</span><span>6</span><span>12</span><span>18</span><span>24 Uhr</span></div></div>`;
  const types = [...new Set(pl.fleet.map((a) => a.type_id))].sort(), bases = [...new Set(pl.fleet.map((a) => a.base))].sort();
  if (ui.fpType && !types.includes(ui.fpType)) ui.fpType = null;
  if (ui.fpBase && !bases.includes(ui.fpBase)) ui.fpBase = null;
  if (types.length > 1 || bases.length > 1) html += `<div class="row" style="gap:6px;flex-wrap:wrap">${types.length > 1 ? `<div class="seg wrap" role="group" aria-label="Flugzeugtyp"><button data-act="fptype" data-v="" aria-pressed="${!ui.fpType}">Alle Typen</button>${types.map((t) => `<button data-act="fptype" data-v="${t}" aria-pressed="${ui.fpType === t}">${t} <span class="muted">${pl.fleet.filter((a) => a.type_id === t).length}</span></button>`).join('')}</div>` : ''}${bases.length > 1 ? `<div class="seg wrap" role="group" aria-label="Basis"><button data-act="fpbase" data-v="" aria-pressed="${!ui.fpBase}">Alle Basen</button>${bases.map((b) => `<button data-act="fpbase" data-v="${b}" aria-pressed="${ui.fpBase === b}">${b}</button>`).join('')}</div>` : ''}</div>`;
  { const sel = pl.fleet.filter((a) => (!ui.fpType || a.type_id === ui.fpType) && (!ui.fpBase || a.base === ui.fpBase) && a.delivery_day <= W.day), hrs = sel.reduce((x, a) => x + (a.fhDay || 0), 0), cap = sel.reduce((x, a) => x + SM.winOf(a.type_id), 0);
    if (sel.length) html += `<p class="small ink2">Auslastung der Flotte${ui.fpType ? ' ' + ui.fpType : ''}${ui.fpBase ? ' in ' + ui.fpBase : ''}: <b>${n1(hrs)} von ${n0(cap)} Stunden</b> Betriebsfenster am Tag (${pct(cap ? hrs / cap : 0)}).${sel.filter((a) => (a.fhDay || 0) < 4).length ? ` <span class="warnc">${sel.filter((a) => (a.fhDay || 0) < 4).map((a) => acName(a.id)).join(', ')} ${sel.filter((a) => (a.fhDay || 0) < 4).length > 1 ? 'fliegen' : 'fliegt'} kaum – ${sel.filter((a) => (a.fhDay || 0) < 4).length > 1 ? 'kosten' : 'kostet'} trotzdem Leasing, Versicherung und Crew.</span>` : ''}</p>`; }
  const list = pl.fleet.filter((a) => (!ui.fpType || a.type_id === ui.fpType) && (!ui.fpBase || a.base === ui.fpBase)).sort((x, y) => x.base.localeCompare(y.base) || x.type_id.localeCompare(y.type_id) || x.id.localeCompare(y.id));
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
    const tOf = (r) => (r.mix && a.type_id === r.mix.type_id ? a.type_id : r.type_id);   // 0.21.42: zweites Muster der Strecke
    const fits = (r) => r.base === a.base && tOf(r) === a.type_id;
    const row = (r) => {
      const h = pl.rotH({ base: r.base, dest: r.dest, type_id: tOf(r), service: r.service, buffer: r.buffer }), lh = h > SM.winOf(tOf(r)), wkR = r.wk && r.wk < 7 ? r.wk : 7;
      const taken = pl.fleet.filter((x) => x !== a && acMode(x) === 'manual').reduce((s, x) => s + (x.pins || []).filter((p) => p.route === r.id).reduce((t, p) => t + p.n, 0), 0);
      const n = D.pins[r.id] || 0;
      if (n) { if (lh) long = true; else hours += n * h * wkR / 7; }
      let ctl;
      if (r.base !== a.base) ctl = `<span class="muted">startet in ${r.base}</span>`;
      else if (tOf(r) !== a.type_id) ctl = SM.rangeOk(r.base, r.dest, a.type_id) ? `<span class="muted">fliegt ${r.type_id}</span> <button class="btn small" data-act="retype" data-route="${r.id}" data-type="${a.type_id}" title="Strecke auf ${tl(a.type_id)} umstellen">auf ${a.type_id} umstellen</button>` : `<span class="muted">Reichweite zu kurz</span>`;
      else {
        const max = lh ? 1 : Math.max(0, r.freq - taken);
        ctl = `<select id="asg-n-${r.id}" style="width:auto">${Array.from({ length: max + 1 }, (_, i) => `<option value="${i}" ${i === n ? 'selected' : ''}>${i ? (lh ? 'fest zugeordnet' : wkR < 7 ? `${wkR}× pro Woche` : i + '× täglich') : '–'}</option>`).join('')}</select>${taken ? ` <span class="muted">${taken} von ${r.freq} schon fest vergeben</span>` : ''}`;
      }
      return `<tr><td><span class="sw" style="background:${routeColor(r)}"></span> <b>${r.base}–${r.dest}</b><div class="small muted">${wkR < 7 ? `${wkR}× pro Woche` : r.freq + '× täglich'} · ${n1(h)} h je Umlauf${wkR < 7 ? ` (im Schnitt ${n1(h * wkR / 7)} h am Tag)` : ''}${lh ? ' · Langstrecke' : ''}</div></td><td class="r">${ctl}</td></tr>`;
    };
    const mine = pl.activeRoutes().filter(fits), other = pl.activeRoutes().filter((r) => !fits(r));
    const rows = mine.map(row).join('') + (other.length ? `<tr><td colspan="2"><details><summary class="small muted">${other.length} weitere Strecke${other.length > 1 ? 'n' : ''} mit anderem Typ oder anderer Basis</summary><table class="t"><tbody>${other.map(row).join('')}</tbody></table></details></td></tr>` : '');
    const over = hours > win + 1e-9, pctH = Math.min(100, hours / win * 100);
    html += `<table class="t"><tbody>${rows || '<tr><td class="muted">Noch keine Strecken.</td></tr>'}</tbody></table>
      <div class="lfrow" style="grid-template-columns:90px 1fr 96px"><span>Betriebszeit</span><div class="bar"><i class="${over ? 'crit' : 'me'}" style="width:${long ? 100 : pctH.toFixed(0)}%"></i></div><span class="num ${over ? 'neg' : ''}">${long ? 'Langstrecke' : `${n1(hours)} / ${win} h`}</span></div>
      ${over ? `<div class="callout crit">Zu viel: ${n1(hours)} Stunden passen nicht ins Betriebsfenster von ${win} Stunden.</div>` : ''}
      <p class="small muted">Grenzen: gleiche Basis, gleicher Flugzeugtyp wie die Strecke, höchstens ${win} Stunden am Tag, nicht mehr Umläufe als die Frequenz. Ein Langstreckenumlauf belegt das Flugzeug ganz. Fällt ein fest zugewiesenes Flugzeug aus, übernehmen Automatik- oder Reserveflugzeuge desselben Typs.</p>`;
  } else html += `<p class="small muted">${D.mode === 'charter' ? 'Das Flugzeug fliegt keine eigenen Strecken mehr und steht nur für Charteraufträge bereit – Kalender und passende Anfragen unter Flotte → Charter.' : D.mode === 'auto' ? 'Der Planer setzt das Flugzeug dort ein, wo Umläufe offen sind.' : 'Das Flugzeug fliegt nur, wenn sonst ein Umlauf ausfiele (Technik, C-Check, Charter). Bis dahin kostet es Leasing und Versicherung.'}</p>`;
  html += `<div class="row"><button class="btn primary" data-act="asgsave">Speichern</button><button class="btn" data-act="asgcancel">Abbrechen</button></div></div>`;
  return html;
}
function onAssignClick(act, b) {
  const pl = W.player;
  switch (act) {
    case 'asgopen': { const a = pl.fleet.find((x) => x.id === b.dataset.id); if (!a) return true; ui.asg = { acId: a.id, mode: acMode(a), pins: Object.fromEntries((a.pins || []).map((p) => [p.route, p.n])) }; if (ui.tab !== 'fleetPlan') setTab('fleetPlan'); else renderPane(true); return true; }
    case 'asgmode': ui.asg.mode = b.dataset.v; renderPane(true); return true;
    case 'fptype': ui.fpType = b.dataset.v || null; renderPane(true); return true;
    case 'fpbase': ui.fpBase = b.dataset.v || null; renderPane(true); return true;
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
// ---------- Pixel-Logo (64 × 64) ----------
const PIX_CACHE = new Map();
function pixDecode(b64) { const bin = atob(b64), out = new Uint8Array(4096); for (let i = 0; i < 2048; i++) { const v = bin.charCodeAt(i); out[2 * i] = v >> 4; out[2 * i + 1] = v & 15; } return out; }
function pixEncode(px) { let s = ''; for (let i = 0; i < 2048; i++) s += String.fromCharCode(((px[2 * i] & 15) << 4) | (px[2 * i + 1] & 15)); return btoa(s); }
function pixUrl(pl) {
  const key = pl.pal.join() + '|' + pl.px; if (PIX_CACHE.has(key)) return PIX_CACHE.get(key);
  let url = '';
  try {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'), img = g.createImageData(64, 64), px = pixDecode(pl.px);
    for (let i = 0; i < 4096; i++) { const v = px[i]; if (!v || !pl.pal[v - 1]) continue; const h = pl.pal[v - 1]; img.data[4 * i] = parseInt(h.slice(1, 3), 16); img.data[4 * i + 1] = parseInt(h.slice(3, 5), 16); img.data[4 * i + 2] = parseInt(h.slice(5, 7), 16); img.data[4 * i + 3] = 255; }
    g.putImageData(img, 0, 0); url = c.toDataURL('image/png');
  } catch (e) { url = ''; }
  if (PIX_CACHE.size > 200) PIX_CACHE.clear();
  PIX_CACHE.set(key, url); return url;
}
function logoSvg(al, size = 40, lg = null) {
  if (!lg && al && al.pixLogo) { const u = pixUrl(al.pixLogo); if (u) return `<img class="logo-svg pix" src="${u}" width="${size}" height="${size}" alt="Logo ${esc(al.name || '')}">`; }
  const L = lg || logoOf(al), code = esc((al.code || al.id || 'SM').slice(0, 2));
  const sym = LOGO_SYM[L.sym] || LOGO_SYM.paper, bg = L.shape !== 'none', fg = bg ? L.c2 : L.c1;
  const inner = L.sym === 'code'
    ? `<text x="24" y="24" dy=".36em" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="${L.shape === 'tail' ? 15 : 18}" fill="${fg}" letter-spacing=".5">${code}</text>`
    : `<g transform="translate(${L.shape === 'tail' ? 13.5 : 11} ${L.shape === 'shield' ? 10 : 11}) scale(${L.shape === 'none' ? 1.1 : 1.08})"><path d="${sym.d}" ${sym.st ? `fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"` : `fill="${fg}"`}/></g>`;
  return `<svg class="logo-svg" width="${size}" height="${size}" viewBox="0 0 48 48" role="img" aria-label="Logo ${esc(al.name || '')}">${bg ? `<g fill="${L.c1}">${LOGO_SHAPE[L.shape]}</g>` : ''}${inner}</svg>`;
}
/** 0.21.62: Farbe der Airline wählen – vergebene Farben sind gesperrt. */
function colorPickHtml(pl) {
  const used = SM.colorHolders(W, pl.id);
  return `<div class="card pad stack"><div class="spread"><b>Ihre Farbe auf der Karte</b><span class="small muted">${esc(P.AL_COLORS[(pl.color || 1) - 1].name)}</span></div>
    <span class="small muted">Strecken, Flugzeuge und Legende zeigen Ihre Airline in dieser Farbe – bei allen Mitspielenden gleich. Jede Farbe gibt es nur einmal; vergebene sind durchgestrichen.</span>
    <div class="swatches">${P.AL_COLORS.map((c, i) => { const n = i + 1, h = used[n], on = n === pl.color; return `<button class="swc${on ? ' on' : ''}${h ? ' taken' : ''}" style="--c:${c.hex}" data-act="setcolor" data-v="${n}" ${h ? 'disabled' : ''} aria-pressed="${on}" title="${esc(c.name)}${h ? ` – vergeben an ${esc(h.name)}` : ''}" aria-label="${esc(c.name)}${h ? `, vergeben an ${esc(h.name)}` : ''}"></button>`; }).join('')}</div></div>`;
}
VIEWS.profile = function viewProfile() {
  const pl = W.player, cur = logoOf(pl);
  ui.logo = ui.logo || { shape: cur.dflt ? 'shield' : cur.shape, sym: cur.dflt ? 'paper' : cur.sym, c1: cur.c1, c2: cur.c2 };
  const L = ui.logo, demo = { ...pl, logo: L };
  const canRb = !pl.fleet.length && !pl.activeRoutes().length && !Object.keys(pl.stakes || {}).length;
  return `<h2 class="sec">Profil & Logo <small>${esc(pl.name)} · ${esc(pl.code || '')}</small></h2>${colorPickHtml(pl)}
    <div class="card pad spread" style="gap:10px;flex-wrap:wrap"><div class="stack" style="gap:2px"><b>Name, Kürzel und Heimatbasis</b><span class="small">${esc(pl.name)} (${esc(pl.code || '')}) · Start in <b class="mono">${esc(pl.bases[0])}</b> ${esc(apName(pl.bases[0]))}</span>
      <span class="small muted">${canRb ? (preStart() ? `Bis zum Start am ${esc(startTxt(preStart()))} jederzeit änderbar.` : 'Änderbar, solange Sie noch kein Flugzeug, keine Strecke und keine Beteiligung haben.') : 'Nicht mehr änderbar – Ihre Airline hat schon Flugzeuge, Strecken oder Beteiligungen.'}</span></div>
      <button class="btn small${canRb ? ' primary' : ''}" data-act="rebase" ${canRb ? '' : 'disabled'}>Name und Basis ändern</button></div>
    <div class="logo-stage"><div class="logo-big">${pl.pixLogo ? logoSvg(pl, 112) : logoSvg(demo, 112, L)}</div>
      <div class="stack" style="gap:6px"><b style="font-size:18px">${esc(pl.name)}</b><span class="small muted">So erscheint Ihr Logo in der Seitenleiste, bei Mitspielenden, im Handel und auf dem Leitwerk.</span>
      <div class="acv-box" style="max-width:280px">${acSvg('A20N', { color: L.c1, code: pl.code, ink: L.c2, pix: pl.pixLogo ? pixUrl(pl.pixLogo) : null })}</div></div></div>
    ${pl.pixLogo ? `<div class="callout info"><b>Ihr Pixel-Logo ist aktiv</b><span class="small">Es ersetzt überall das gestaltete Logo – auch auf dem Leitwerk. Die Farben unten bestimmen weiter Leitwerk und Zierstreifen. Ändern können Sie das Pixel-Logo weiter unten; übernehmen Sie stattdessen ein gestaltetes Logo, wird das Pixel-Logo entfernt.</span></div>` : ''}
    <div class="stack"><h3>Form</h3><div class="logo-grid">${Object.keys(LOGO_SHAPE).map((k) => `<button data-act="lg" data-k="shape" data-v="${k}" aria-pressed="${L.shape === k}" title="${k}">${logoSvg(demo, 44, { ...L, shape: k })}</button>`).join('')}</div></div>
    <div class="stack"><h3>Symbol</h3><div class="logo-grid">${Object.keys(LOGO_SYM).map((k) => `<button data-act="lg" data-k="sym" data-v="${k}" aria-pressed="${L.sym === k}" title="${k === 'code' ? 'Kürzel' : k}">${logoSvg(demo, 44, { ...L, sym: k })}</button>`).join('')}</div></div>
    <div class="stack"><h3>Farben</h3><div class="logo-grid">${LOGO_PALETTES.map(([a, b]) => `<button data-act="lgpal" data-a="${a}" data-b="${b}" aria-pressed="${L.c1 === a && L.c2 === b}" title="${a} / ${b}">${logoSvg(demo, 44, { ...L, c1: a, c2: b })}</button>`).join('')}</div>
      <div class="row small"><label class="row" style="gap:6px">Grundfarbe <input type="color" id="lg-c1" value="${L.c1}"></label><label class="row" style="gap:6px">Symbolfarbe <input type="color" id="lg-c2" value="${L.c2}"></label></div></div>
    ${(() => { const tk = SM.logoTaken(W, pl, L); return tk ? `<div class="callout warn"><b>Schon vergeben</b><span class="small">Genau diese Kombination trägt bereits <span class="lgi">${logoSvg(tk, 18)}</span> ${esc(tk.name)}. Ändern Sie Form, Symbol oder eine Farbe.</span></div>` : ''; })()}
    <div class="row"><button class="btn primary" data-act="lgsave" ${SM.logoTaken(W, pl, L) ? 'disabled' : ''}>${pl.pixLogo ? 'Gestaltetes Logo übernehmen (ersetzt Pixel-Logo)' : 'Logo übernehmen'}</button>${pl.pixLogo ? '<button class="btn" data-act="lgcolors" title="Nur Leitwerk- und Streifenfarben ändern, Pixel-Logo bleibt">Nur Farben übernehmen</button>' : ''}<button class="btn" data-act="lgreset">Zurücksetzen</button></div>
    <p class="small muted">Ihre Farben erscheinen auch auf dem Leitwerk Ihrer Flugzeuge. Das Logo können Sie jederzeit ändern. Jede Kombination aus Form, Symbol und Farben gibt es pro Welt nur einmal.</p>
    ${!pl.fleet.length && !pl.activeRoutes().length ? `<div class="callout info"><b>Name und Heimatbasis</b><span class="small">Solange Sie noch kein Flugzeug und keine Strecke haben, können Sie Name, Kürzel und Basis ohne Nachteil ändern – es gilt dann die Lizenz des neuen Flughafens. Sie starten in <b>${esc(apName(pl.bases[0]))} (${esc(pl.bases[0])})</b>.</span><div class="row"><button class="btn small" data-act="rebase">Name und Basis ändern</button></div></div>` : ''}
    ${pixEditorHtml(pl)}
    ${pl.past && pl.past.length ? `<div class="stack"><h2 class="sec">Frühere Airlines <small>${pl.past.length} Neustart${pl.past.length > 1 ? 's' : ''}</small></h2><div class="tw"><table class="t"><thead><tr><th>Airline</th><th class="r">Zeitraum</th><th class="r">Passagiere</th><th class="r">Eigenkapital am Ende</th></tr></thead><tbody>${pl.past.slice().reverse().map((x) => `<tr><td>${esc(x.name)} <span class="small muted">${esc(x.code || '')}</span>${x.status === 'insolvent' ? ' <span class="chip crit">insolvent</span>' : ' <span class="chip">aufgegeben</span>'}</td><td class="r">${dateShort(x.from)} – ${dateShort(x.to)}</td><td class="r">${n0(x.pax)}</td><td class="r ${x.equity < 0 ? 'neg' : ''}">${eur(x.equity)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    <div class="callout warn stack"><b>Neu anfangen</b><span class="small">Läuft es gar nicht mehr, können Sie ${esc(pl.name)} aufgeben und ${ui.mp ? 'in derselben Welt' : 'in dieser Welt'} eine neue Airline mit vollem Startkapital gründen. Flugzeuge, Strecken, Personal und Slots gehen dabei verloren.</span><div class="row"><button class="btn small danger" data-act="restartvol">Airline aufgeben und neu gründen</button></div></div>`;
};
const PIX_PAL0 = ['#0e1a2d', '#ffffff', '#2f7cf6', '#dc3545', '#16a34a', '#f2b705', '#ff7a00', '#7c3aed', '#00a3c4', '#8b5a2b', '#9aa5b1', '#ff4fa3', '#0a4d8c', '#b7e3ff', '#5c6b7a'];
function pixState(pl) {
  if (!ui.pix) ui.pix = pl.pixLogo ? { pal: [...pl.pixLogo.pal, ...PIX_PAL0].slice(0, 15), px: pixDecode(pl.pixLogo.px), col: 1, tool: 'pen', size: 1 } : { pal: PIX_PAL0.slice(), px: new Uint8Array(4096), col: 1, tool: 'pen', size: 1 };
  return ui.pix;
}
function pixEditorHtml(pl) {
  const S = pixState(pl);
  setTimeout(pixPaint, 0);
  return `<div class="stack pixed"><h2 class="sec sm">Eigenes Pixel-Logo <small>64 × 64 Pixel, bis zu 15 Farben</small></h2>
    <div class="pix-wrap"><canvas id="pixc" width="64" height="64" aria-label="Zeichenfläche 64 mal 64 Pixel"></canvas>
      <div class="stack" style="gap:8px;min-width:0">
        <div class="seg wrap">${[['pen', 'Stift'], ['fill', 'Füllen'], ['erase', 'Radierer'], ['pick', 'Pipette']].map(([k, l]) => `<button data-act="pixtool" data-v="${k}" aria-pressed="${S.tool === k}">${l}</button>`).join('')}</div>
        <div class="seg wrap">${[1, 2, 4].map((k) => `<button data-act="pixsize" data-v="${k}" aria-pressed="${S.size === k}">${k} px</button>`).join('')}</div>
        <div class="pix-pal">${S.pal.map((c, i) => `<button data-act="pixcol" data-v="${i + 1}" aria-pressed="${S.col === i + 1}" style="background:${c}" title="Farbe ${i + 1}"></button>`).join('')}</div>
        <label class="row small" style="gap:6px">Gewählte Farbe ändern <input type="color" id="pix-color" value="${S.pal[S.col - 1]}"></label>
        <div class="row" style="gap:6px;flex-wrap:wrap"><span class="small muted">Vorschau:</span><img id="pixprev" width="40" height="40" alt="" class="logo-svg pix"><img id="pixprev2" width="18" height="18" alt="" class="logo-svg pix"></div>
        <div class="acv-box" style="max-width:240px">${acSvg('A20N', { ...myAcColors(pl), code: pl.code, pix: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', pixId: 'pixtail' })}</div>
      </div></div>
    <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><label class="btn" for="pix-file" style="cursor:pointer">Bild hochladen (64 × 64)</label><input type="file" id="pix-file" accept="image/png,image/gif,image/jpeg,image/webp,image/bmp" hidden><span class="small muted">PNG mit Transparenz am besten; andere Größen werden auf 64 × 64 gebracht, mehr als 15 Farben werden reduziert.</span></div>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn primary" data-act="pixsave">Pixel-Logo übernehmen</button><button class="btn" data-act="pixclear">Fläche leeren</button>${pl.pixLogo ? '<button class="btn" data-act="pixoff">Pixel-Logo entfernen</button>' : ''}</div>
    <p class="small muted">Zeichnen Sie mit Maus, Stift oder Finger. Das Pixel-Logo ersetzt überall das gestaltete Logo; exakt dasselbe Bild kann pro Welt nur eine Airline tragen.</p></div>`;
}
/** Bild hochladen: auf 64 × 64 bringen, Transparenz übernehmen, auf höchstens 15 Farben reduzieren – danach im Editor weiter bearbeitbar. */
const PIX_MAX_FILE = 2 * 1024 * 1024;
function pixUpload(file) {
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('Bitte eine Bilddatei wählen (PNG, GIF, JPG, WebP).'); return; }
  if (file.size > PIX_MAX_FILE) { toast('Das Bild ist zu groß (höchstens 2 MB).'); return; }
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d', { willReadFrequently: true });
      const w = img.naturalWidth, h = img.naturalHeight, k = Math.min(64 / w, 64 / h), dw = Math.max(1, Math.round(w * k)), dh = Math.max(1, Math.round(h * k));
      g.imageSmoothingEnabled = k < 1;   // verkleinern glätten, kleine Pixelbilder scharf vergrößern
      g.clearRect(0, 0, 64, 64); g.drawImage(img, Math.floor((64 - dw) / 2), Math.floor((64 - dh) / 2), dw, dh);
      const q = pixQuantize(g.getImageData(0, 0, 64, 64).data);
      if (!q.used) { toast('Das Bild ist leer oder komplett durchsichtig.'); return; }
      ui.pix = { pal: [...q.pal, ...PIX_PAL0].slice(0, 15), px: q.px, col: 1, tool: 'pen', size: 1 };
      renderPane(true);
      toast(`Bild übernommen${w !== 64 || h !== 64 ? ` (von ${w} × ${h} auf 64 × 64)` : ''}${q.reduced ? `, ${q.colors} Farben auf ${q.pal.length} reduziert` : ''} – noch „Pixel-Logo übernehmen“ klicken.`);
    } catch (e) { toast('Das Bild ließ sich nicht lesen.'); }
    finally { URL.revokeObjectURL(url); }
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('Das Bild ließ sich nicht lesen.'); };
  img.src = url;
}
/** Farben reduzieren: bis 15 Farben exakt, sonst k-Means (Start mit häufigster und jeweils entferntester Farbe). Alpha < 50 % = durchsichtig. */
function pixQuantize(d) {
  const hex = (r, g, b) => '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  const cnt = new Map(), op = [];
  for (let i = 0; i < 4096; i++) { if (d[4 * i + 3] < 128) continue; const key = (d[4 * i] << 16) | (d[4 * i + 1] << 8) | d[4 * i + 2]; cnt.set(key, (cnt.get(key) || 0) + 1); op.push(i); }
  const px = new Uint8Array(4096); if (!op.length) return { used: 0, px, pal: [] };
  const rgb = (key) => [key >> 16 & 255, key >> 8 & 255, key & 255];
  let cents;
  if (cnt.size <= 15) cents = [...cnt.keys()].sort((a, b) => cnt.get(b) - cnt.get(a)).map(rgb);
  else {
    const keys = [...cnt.keys()], cols = keys.map(rgb), wts = keys.map((x) => cnt.get(x)), d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    cents = [cols[wts.indexOf(Math.max(...wts))].slice()];
    while (cents.length < 15) { let best = -1, bi = 0; for (let j = 0; j < cols.length; j++) { const m = Math.min(...cents.map((c) => d2(c, cols[j]))) * Math.sqrt(wts[j]); if (m > best) { best = m; bi = j; } } if (best <= 0) break; cents.push(cols[bi].slice()); }
    for (let it = 0; it < 10; it++) {
      const acc = cents.map(() => [0, 0, 0, 0]);
      for (let j = 0; j < cols.length; j++) { let bk = 0, bd = Infinity; for (let k = 0; k < cents.length; k++) { const v = d2(cents[k], cols[j]); if (v < bd) { bd = v; bk = k; } } const A = acc[bk]; A[0] += cols[j][0] * wts[j]; A[1] += cols[j][1] * wts[j]; A[2] += cols[j][2] * wts[j]; A[3] += wts[j]; }
      cents = cents.map((c, k) => (acc[k][3] ? [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]] : c));
    }
  }
  const pal = cents.map((c) => hex(c[0], c[1], c[2])), memo = new Map();
  for (const i of op) {
    const key = (d[4 * i] << 16) | (d[4 * i + 1] << 8) | d[4 * i + 2];
    let k = memo.get(key);
    if (k === undefined) { const c = rgb(key); let bd = Infinity; k = 0; for (let j = 0; j < cents.length; j++) { const v = (cents[j][0] - c[0]) ** 2 + (cents[j][1] - c[1]) ** 2 + (cents[j][2] - c[2]) ** 2; if (v < bd) { bd = v; k = j; } } memo.set(key, k); }
    px[i] = k + 1;
  }
  return { used: op.length, px, pal, colors: cnt.size, reduced: cnt.size > 15 };
}
function pixPaint() {
  const c = $('#pixc'), S = ui.pix; if (!c || !S) return;
  const g = c.getContext('2d'), img = g.createImageData(64, 64);
  for (let i = 0; i < 4096; i++) { const v = S.px[i]; if (!v) { const ch = ((i % 64 >> 2) + (i >> 8)) & 1; img.data.set(ch ? [236, 240, 245, 255] : [248, 250, 252, 255], 4 * i); continue; } const h = S.pal[v - 1]; img.data.set([parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255], 4 * i); }
  g.putImageData(img, 0, 0);
  const u = pixUrl({ pal: S.pal, px: pixEncode(S.px) });
  for (const id of ['#pixprev', '#pixprev2']) { const e = $(id); if (e) e.src = u; }
  { const e = $('#pixtail'); if (e) e.setAttribute('href', u); }
}
function pixAt(e) { const c = $('#pixc'), r = c.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * 64), Math.floor((e.clientY - r.top) / r.height * 64)]; }
function pixApply(x, y) {
  const S = ui.pix; if (!S || x < 0 || y < 0 || x > 63 || y > 63) return;
  if (S.tool === 'pick') { const v = S.px[y * 64 + x]; if (v) { S.col = v; S.tool = 'pen'; renderPane(true); } return; }
  if (S.tool === 'fill') {
    const from = S.px[y * 64 + x], to = S.col; if (from === to) return;
    const st = [[x, y]]; while (st.length) { const [a, b] = st.pop(); if (a < 0 || b < 0 || a > 63 || b > 63 || S.px[b * 64 + a] !== from) continue; S.px[b * 64 + a] = to; st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
  } else { const v = S.tool === 'erase' ? 0 : S.col, k = S.size; for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { const a = x + dx - (k >> 1), b = y + dy - (k >> 1); if (a >= 0 && b >= 0 && a < 64 && b < 64) S.px[b * 64 + a] = v; } }
  pixPaint();
}
let pixDown = false;
document.addEventListener('pointerdown', (e) => { if (e.target && e.target.id === 'pixc') { pixDown = true; try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* synthetisches Ereignis */ } const [x, y] = pixAt(e); pixApply(x, y); e.preventDefault(); } });
document.addEventListener('pointermove', (e) => { if (pixDown && e.target && e.target.id === 'pixc' && ui.pix && ui.pix.tool !== 'fill' && ui.pix.tool !== 'pick') { const [x, y] = pixAt(e); pixApply(x, y); } });
document.addEventListener('pointerup', () => { pixDown = false; });
function onPixClick(act, b) {
  if (!['pixtool', 'pixsize', 'pixcol', 'pixsave', 'pixclear', 'pixoff'].includes(act)) return false;
  const S = pixState(W.player);
  if (act === 'pixtool') S.tool = b.dataset.v;
  else if (act === 'pixsize') S.size = Number(b.dataset.v);
  else if (act === 'pixcol') { S.col = Number(b.dataset.v); if (S.tool === 'erase' || S.tool === 'pick') S.tool = 'pen'; }
  else if (act === 'pixclear') S.px = new Uint8Array(4096);
  else if (act === 'pixoff') { doAction({ type: 'setPixLogo', clear: true }); ui.pix = null; refreshAll(); return true; }
  else if (act === 'pixsave') { const res = doAction({ type: 'setPixLogo', pal: S.pal, px: pixEncode(S.px) }); if (res.ok) toast('Pixel-Logo übernommen.'); refreshAll(); return true; }
  renderPane(true); return true;
}
function onLogoClick(act, b) {
  if (onPixClick(act, b)) return true;
  if (!['lg', 'lgpal', 'lgsave', 'lgreset', 'lgcolors'].includes(act)) return false;
  if (act === 'lgcolors') { const cur = W.player.logo || {}, res = doAction({ type: 'setLogo', ...cur, ...ui.logo, shape: cur.shape || ui.logo.shape, sym: cur.sym || ui.logo.sym, c1: ui.logo.c1, c2: ui.logo.c2 }); if (res.ok) toast('Farben übernommen – Ihr Pixel-Logo bleibt.'); else toast(res.msg); refreshAll(); return true; }
  const L = ui.logo;
  if (act === 'lg') L[b.dataset.k] = b.dataset.v;
  else if (act === 'lgpal') { L.c1 = b.dataset.a; L.c2 = b.dataset.b; }
  else if (act === 'lgreset') ui.logo = null;
  else { const res = doAction({ type: 'setLogo', ...L }); if (res.ok) { if (W.player.pixLogo) { doAction({ type: 'setPixLogo', clear: true }); ui.pix = null; } toast('Neues Logo übernommen.'); } refreshAll(); return true; }
  renderPane(true); return true;
}
function onLogoChange(t) {
  if (t.id === 'pix-color' && ui.pix) { ui.pix.pal[ui.pix.col - 1] = t.value; renderPane(true); return true; }
  if (!ui.logo || !/^lg-c[12]$/.test(t.id)) return false;
  ui.logo[t.id === 'lg-c1' ? 'c1' : 'c2'] = t.value; renderPane(true); return true;
}
const myAcColors = (pl = W.player) => { const L = pl.logo, pix = pl.pixLogo ? pixUrl(pl.pixLogo) || null : null; return L ? { color: L.c1, ink: L.c2, pix } : { color: 'var(--accent)', ink: 'var(--on-accent)', pix }; };

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
  const me = ui.mp.airlineId, others = visHumans().filter((h) => h.id !== me && !h.removed);
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
    if (blkOf('chat')) { toast(`Die Luftfahrtaufsicht hat den Chat für Ihr Konto bis ${fmtUntil(blkOf('chat'))} gesperrt.`); return; }
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
  if (document.documentElement.dataset.theme !== th) { document.documentElement.dataset.theme = th; ui.routesSig = ''; planeCv.col = null; ui.planesNow = true; if (W) { renderMapRoutes(true); renderSidebar(); } }
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
      <div class="row"><input type="number" id="bid-${a.id}" min="${a.minBid}" step="10000" value="${Math.max(a.minBid, (mine || 0) + 50000)}" style="width:150px" inputmode="numeric" data-fmt="bidf-${a.id}"><span class="small muted mono" id="bidf-${a.id}">= ${eur(Math.max(a.minBid, (mine || 0) + 50000))}</span><button class="btn small primary" data-act="bid" data-id="${a.id}">${mine ? 'Gebot erhöhen' : 'Bieten'}</button>${mine ? `<span class="small">Ihr Gebot: <b>${eur(mine)}</b></span>` : ''}</div></div>`;
  }).join('')}${recent.map((a) => `<p class="small ${a.winners && a.winners.includes(pl.id) ? 'pos' : 'muted'}">${P.AIRCRAFT_TYPES[a.type].label}: ${a.winners && a.winners.includes(pl.id) ? 'Zuschlag erhalten' : `kein Zuschlag (Zuschlag ab ${eur(a.cut || 0)})`}</p>`).join('')}</div>`;
}
function laborHtml() {
  const M = W.macro, crisis = SM.laborCrisis(W), rows = [['pilot', 'Piloten'], ['cabin', 'Flugbegleiterinnen'], ['tech', 'Techniker']].map(([r, l]) => { const x = SM.laborPool(W, r); return `<tr><td>${l}</td><td class="r">${Math.max(0, x.pool - x.used)} von ${x.pool}${x.free ? `<div class="small muted">davon ${n0(x.free)} aus Abbau und Insolvenzen</div>` : ''}</td></tr>`; }).join('');
  return `<div class="stack"><h2 class="sec">Arbeitsmarkt <small>gemeinsam für alle Airlines</small></h2>
    <div class="tiles"><div class="tile"><span>Marktlohn</span><b>${pct(wageNow() - 1, 1).replace(/^(?!-|−)/, '+')}</b><em>gegenüber Spielstart</em></div>
      <div class="tile"><span>Pilotenmarkt</span><b class="${M.laborTight > 1.3 ? 'warnc' : ''}">${M.laborTight > 1.6 ? 'leergefegt' : M.laborTight > 1.25 ? 'angespannt' : 'normal'}</b><em>Index ${NF2.format(M.laborTight)}</em></div>
      <div class="tile"><span>Ihr Gehalt</span><b class="${W.player.staff.pay < wageNow() - 0.005 ? 'neg' : ''}">${pct(W.player.staff.pay / wageNow() - 1).replace(/^(?!-|−)/, '+')}</b><em>gegenüber Markt</em></div></div>
    <table class="t"><thead><tr><th>Diesen Monat noch einstellbar (alle Mitspielenden zusammen)</th><th class="r"></th></tr></thead><tbody>${rows}</tbody></table>
    ${crisis ? '<div class="callout info"><b>Krise in der Branche</b><span class="small">Airlines stellen kaum ein und bauen ab – es gibt rund 50 % mehr Bewerbungen.</span></div>' : ''}
    <p class="small muted">Fachpersonal ist knapp. Mehr Bewerbungen gibt es in Krisen und wenn Airlines entlassen, Flugzeuge abgeben oder pleitegehen – dieses Personal steht einige Monate zur Verfügung (jeden Monat rund 30 % weniger). Wer viel einstellt, verknappt den Markt für alle: Recruiting wird teurer, Wartezeiten länger, Löhne steigen. Liegt Ihr Gehalt unter dem Marktlohn, sinkt die Stimmung und die Konkurrenz wirbt ab. Dauerhaft unabhängig machen eigene Akademien.</p></div>`;
}
function academyHtml() {
  const pl = W.player, A = pl.academy || {}, mx = SM.academyMax(pl), hx = SM.homeShares(pl), H = P.HOME, phase = (lv) => P.CAREER.levels[SM.ACADEMY_MAX.findIndex((x) => x >= lv)].label;
  return `<div class="stack"><h2 class="sec">Akademien <small>eigenen Nachwuchs fördern</small></h2>
    <p class="small ink2">Der Arbeitsmarkt ist knapp – mehr Bewerbungen gibt es nur in Krisen und wenn Airlines Personal abbauen oder pleitegehen. Mit monatlicher Förderung bilden Flugschule, Kabinenakademie und Technikschule exklusiv für Sie aus: teurer als Einstellen, aber ohne Arbeitsmarkt. Mit jeder Wachstumsphase wird eine größere Stufe frei und Sie können eine weitere Schule je Bereich eröffnen (heute bis Stufe ${mx}, bis zu ${mx} Schulen je Bereich).</p>
    <div class="tiles"><div class="tile"><span>Eigener Nachwuchs</span><b>${n0(hx.n)}</b><em>${pct(hx.all)} der Belegschaft</em></div>
      <div class="tile"><span>Stimmung</span><b class="pos">+${n0(H.morale * hx.all * 100)}</b><em>Ziel, bis +${n0(H.morale * 100)} bei 100 %</em></div>
      <div class="tile"><span>Kündigungen</span><b class="pos">−${pct(H.leave * hx.all)}</b><em>kennen Unternehmen und Abläufe</em></div>
      <div class="tile"><span>Pünktlichkeit</span><b class="pos">+${n1(H.otp * hx.crew * 100)} Pkt</b><em>technische Ausfälle −${pct(H.fail * hx.tech)}</em></div></div>
    ${Object.entries(SM.ACADEMY).map(([role, d]) => { const list = SM.acadList(pl, role), canMore = list.length < mx, tot = list.reduce((a, x) => a + (W.day >= x.since + d.ramp ? d.out[x.lv] : 0), 0);
      const school = (x) => { const ready = x.since + d.ramp;
        return `<div class="acad-school"><div class="spread" style="gap:8px;flex-wrap:wrap"><b class="small">${esc(d.label)} ${role === 'pilot' ? `· ${esc(P.TYPE_GROUPS[x.group] || '')}` : x.id.slice(1)}</b><span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end"><span class="chip ${W.day >= ready ? 'good' : 'warn'}">${W.day >= ready ? `${d.out[x.lv]} pro Monat` : `erste Absolventen ${dateShort(ready)}`}</span><button class="btn small danger" data-act="academy" data-role="${role}" data-id="${x.id}" data-lv="0">schließen</button></span></div>
          <div class="lvgrid">${d.cost.map((c, lv) => { if (!lv) return ''; const lock = lv > mx && lv > (x.lv || 0);
            return `<button data-act="academy" data-role="${role}" data-id="${x.id}" data-lv="${lv}" aria-pressed="${(x.lv || 0) === lv}"${lock ? ` disabled title="ab Phase „${esc(phase(lv))}“"` : ''}><b>Stufe ${lv}</b><span>${eur(c * cpi())}/Mon.</span><em>${lock ? `ab ${esc(phase(lv))}` : `${d.out[lv]} Absolventen/Mon.`}</em></button>`; }).join('')}</div>
          ${role === 'pilot' ? `<label class="f" style="max-width:300px"><span>Musterberechtigung der Absolventen</span><select class="acad-group" data-id="${x.id}">${SM.STAFF_GROUPS.map((g) => `<option value="${g}" ${(x.group || 'A32F') === g ? 'selected' : ''}>${P.TYPE_GROUPS[g]}</option>`).join('')}</select></label>` : ''}</div>`; };
      const groups = role === 'pilot' ? SM.STAFF_GROUPS.filter((g) => pl.fleet.some((a) => P.AIRCRAFT_TYPES[a.type_id].group === g)) : [];
      const nextG = groups.find((g) => !list.some((x) => x.group === g)) || groups[0] || 'A32F';
      return `<div class="card pad stack"><div class="spread"><b>${d.label}${list.length > 1 ? `n <small class="muted">${list.length} Schulen</small>` : ''}</b>${list.length ? `<span class="chip good">zusammen ${tot} pro Monat</span>` : '<span class="chip">nicht gefördert</span>'}</div>
        ${list.map(school).join('')}
        <div class="acad-foot">${canMore ? `<button class="btn small${list.length ? '' : ' primary'}" data-act="academy" data-role="${role}" data-id="new" data-lv="1" ${role === 'pilot' ? `data-group="${nextG}"` : ''}>${list.length ? 'Weitere Schule eröffnen' : 'Schule eröffnen'}</button><span class="small muted">Start mit Stufe 1 · ${eur(d.cost[1] * cpi())}/Mon.${role === 'pilot' ? ` · ${esc(P.TYPE_GROUPS[nextG])}` : ''} · Anlaufzeit ${d.ramp} Tage</span>` : `<span class="small muted">${list.length} von ${mx} Schulen – mit jeder Wachstumsphase kommt eine dazu. Anlaufzeit neuer Schulen ${d.ramp} Tage.</span>`}</div>
          ${role === 'pilot' ? '<span class="small muted">Je Schule eine Musterberechtigung – so bilden Sie für mehrere Flugzeugfamilien aus.</span>' : ''}</div>`; }).join('')}</div>`;
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
  const acLv = SM.acadLv(T, role);
  const p = Math.max(0.03, Math.min(0.85, (0.12 + 0.9 * (pl.staff.pay - (T.staff ? theirPay : 1 + ({ premium: 0.06, lcc: -0.04 }[T.archetype] || 0))) + 0.35 * Math.min(1, P0.bonus / (sal * 3)) + 0.8 * Math.max(0, 0.65 - theirMor)) * (1 - 0.12 * acLv)));
  const PO = P.POACH, pk = `${T.id}:${role}${role === 'pilot' ? ':' + group : ''}`;
  const last = pl.poachLog && pl.poachLog[pk] !== undefined ? pl.poachLog[pk] : null, wait = last !== null && W.day - last < PO.wait ? PO.wait - (W.day - last) : 0;
  const expOf = (a) => (a.archetype ? W.aiExpertsPreview(a) : a.experts) || [];
  const withExp = W.list.filter((h) => h.id !== pl.id && h.status !== 'insolvent' && !h.removed && (h === T || h.isPlayer) && expOf(h).length);
  return `<div class="stack"><h2 class="sec">Abwerben <small>Personal und Fachkräfte der Konkurrenz</small></h2>
    <div class="card pad stack"><div class="grid2"><label class="f"><span>Bei</span><select id="po-target">${targets.map((a) => `<option value="${a.id}" ${a.id === T.id ? 'selected' : ''}>${esc(a.name)}${a.archetype ? '' : ' (Mitspieler)'}${role === 'pilot' ? (flies(a, group) ? ` · fliegt ${group}` : ' · ohne ' + group) : ''}</option>`).join('')}</select></label>
      <label class="f"><span>Wen</span><select id="po-role">${ROLE_OPTS().map(([v, l]) => `<option value="${v}" ${v === P0.role ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div class="grid2"><label class="f"><span>Anzahl</span><input type="number" id="po-n" min="1" max="${PO.maxN}" value="${P0.n}"></label>
      <label class="f"><span>Wechselprämie je Person</span><select id="po-bonus">${[0, 5000, 10000, 20000, 40000, 80000].map((v) => `<option value="${v}" ${v === P0.bonus ? 'selected' : ''}>${v ? eur(v) : 'keine'}</option>`).join('')}</select></label></div>
      ${role === 'pilot' && !flies(T, group) ? `<div class="callout warn">${esc(T.name)} fliegt keine ${esc(P.TYPE_GROUPS[group])} – dort gibt es keine passenden Piloten. Oben stehen die Airlines mit dieser Familie.</div>` : ''}
      <p class="small muted">Piloten haben ein Typ-Rating je Musterfamilie und fliegen nur dort. Flugbegleiterinnen und Technik sind für alle Muster einsetzbar.</p>
      <p class="small ink2">Erfolgschance je Person etwa <b>${pct(p)}</b>${T.staff ? ` · Stimmung drüben ${pct(theirMor)}` : ''}. Kosten: Prämie je gewonnener Person plus ${eur(S.recruit[role] * 0.4 * cpi())} Headhunter je Versuch. Wer wechselt, beginnt nach 7 Tagen. Bis zu ${PO.maxN} Personen je Versuch; dieselbe Gruppe bei derselben Airline alle ${PO.wait} Tage, andere Gruppen sofort.${T.isPlayer ? ' Mitspielende werden informiert.' : ' Die KI merkt sich das und wirbt zurück.'}</p>
      <div class="row"><button class="btn primary" data-act="poach" ${wait ? 'disabled' : ''}>${wait ? `wieder in ${wait} Tagen` : `Abwerben · höchstens ${eurB(P0.n * (P0.bonus + S.recruit[role] * 0.4 * cpi()))}`}</button></div></div>
    ${withExp.length ? `<div class="card pad stack"><h3>Fachkräfte der Konkurrenz</h3><p class="small muted">Spezialistinnen und Spezialisten bei ${esc(T.name)}${W.humans.length > 1 ? ' und bei Mitspielenden' : ''} – oben bei „Bei“ eine andere Airline wählen, um deren Fachkräfte zu sehen. Wer wechselt, nimmt sein Können mit – bei einem Wettbewerbsverbot zahlen Sie Ablöse.</p>${withExp.map((h) => expOf(h).map((e) => `<div class="spread small"><span>${logoSvg(h, 16)} <b>${esc(e.name)}</b> · ${P.EXPERT_ROLES[e.role].label} ${LEVEL[e.level]} bei ${esc(h.name)} · ${eur(e.salary)}/Mon.${e.ps != null ? ` · leistet dort <b class="${e.ps >= 1 ? 'pos' : e.ps < 0.85 ? 'neg' : ''}">${pct(e.ps)}</b>` : ''}${e.nca ? ' · <span class="chip warn">Wettbewerbsverbot</span>' : ''}</span>
      <span class="row" style="gap:6px"><select id="pe-${e.id}" style="width:auto">${[1.1, 1.25, 1.4, 1.6].map((f) => `<option value="${f}">+${Math.round((f - 1) * 100)} % Gehalt</option>`).join('')}</select><button class="btn small" data-act="poachexp" data-t="${h.id}" data-id="${e.id}">Abwerben</button></span></div>`).join('')).join('')}</div>` : ''}
    ${corpHtml()}</div>`;
}
/** Firmenkunden abwerben: Vertriebsoffensive an einem Flughafen gegen eine Airline. */
function corpHtml() {
  const pl = W.player, C = P.POACH.corp, mine = [...new Set(pl.activeRoutes().flatMap((r) => [r.base, r.dest]))].sort();
  if (!mine.length) return '<div class="card pad stack"><h3>Firmenkunden abwerben</h3><p class="small muted">Sobald Sie Strecken fliegen, können Sie an Ihren Flughäfen Firmenkunden der Konkurrenz umwerben.</p></div>';
  const st = ui.corp || (ui.corp = { apt: mine[0], target: null, budget: C.budgets[1] }); if (!mine.includes(st.apt)) st.apt = mine[0];
  const freqAt = (x) => x.activeRoutes().filter((r) => r.base === st.apt || r.dest === st.apt).reduce((a, r) => a + r.freq, 0);
  const rivals = W.list.filter((a) => a.id !== pl.id && a.status !== 'insolvent' && !a.removed && freqAt(a) > 0).sort((a, b) => freqAt(b) - freqAt(a));
  if (!rivals.some((a) => a.id === st.target)) st.target = rivals[0] ? rivals[0].id : null;
  const T = st.target ? W.airlines[st.target] : null;
  const size = Math.max(0.5, Math.sqrt(P.AIRPORTS[st.apt].pax || 1) / 3);
  const p = T ? Math.max(0.05, Math.min(0.85, 0.2 + 0.25 * C.budgets.indexOf(st.budget) + 1.2 * (pl.brandEff(W.day) - (T.brandEff ? T.brandEff(W.day) : T.brand)) + 0.15 * Math.tanh((freqAt(pl) - freqAt(T)) / 4) + (pl.hubs && pl.hubs[st.apt] ? 0.1 : 0))) : 0;
  const act = Object.entries(pl.corp || {}).filter(([, c]) => c.until > W.day);
  const last = pl.corpLog && pl.corpLog[st.apt] !== undefined ? pl.corpLog[st.apt] : null, wait = last !== null && W.day - last < C.wait ? C.wait - (W.day - last) : 0;
  return `<div class="card pad stack"><h3>Firmenkunden abwerben</h3>
    <div class="grid3"><label class="f"><span>Flughafen</span><select id="corp-apt">${mine.map((c) => `<option value="${c}" ${c === st.apt ? 'selected' : ''}>${c} · ${esc(apName(c))}</option>`).join('')}</select></label>
      <label class="f"><span>Gegen</span><select id="corp-target">${rivals.length ? rivals.map((a) => `<option value="${a.id}" ${a.id === st.target ? 'selected' : ''}>${esc(a.name)} · ${n0(freqAt(a))} Flüge/Tag</option>`).join('') : '<option value="">niemand fliegt hier</option>'}</select></label>
      <label class="f"><span>Budget</span><select id="corp-budget">${C.budgets.map((v) => `<option value="${v}" ${v === st.budget ? 'selected' : ''}>${eur(v * size * cpi())}</option>`).join('')}</select></label></div>
    ${T ? `<p class="small ink2">Erfolgschance etwa <b>${pct(p)}</b> – hängt von Budget, Ihrer Marke gegen ${esc(T.name)}, Ihren Flügen ab ${st.apt} und einem Drehkreuz dort ab. Bei Erfolg buchen Geschäftsreisende an ${st.apt} ${C.days} Tage lang deutlich lieber bei Ihnen${T.isPlayer ? `, bei ${esc(T.name)} entsprechend seltener` : ''}. Danach ${C.wait} Tage Pause an diesem Flughafen.</p>
      <div class="row"><button class="btn primary" data-act="corppoach" ${wait ? 'disabled' : ''}>${wait ? `wieder in ${wait} Tagen` : 'Vertriebsoffensive starten'}</button></div>` : '<p class="small muted">An diesem Flughafen fliegt keine andere Airline.</p>'}
    ${act.length ? `<p class="small">Laufende Firmenverträge: ${act.map(([a, c]) => `<span class="chip ${c.u > 0 ? 'good' : 'crit'}">${a} ${c.u > 0 ? 'gewonnen' : 'verloren'} bis ${dateShort(c.until)}</span>`).join(' ')}</p>` : ''}</div>`;
}
function onHardClick(act, b) {
  const pl = W.player;
  switch (act) {
    case 'bid': { const v = Number($(`#bid-${b.dataset.id}`).value); const res = doAction({ type: 'bid', lot: b.dataset.id, amount: v }); if (res.ok) toast('Gebot abgegeben. Zuschläge am Ende der Auktion.'); refreshAll(); return true; }
    case 'academy': { const g = b.dataset.id && b.dataset.id !== 'new' ? document.querySelector(`.acad-group[data-id="${b.dataset.id}"]`) : null; const res = doAction({ type: 'academy', role: b.dataset.role, id: b.dataset.id, level: Number(b.dataset.lv), group: b.dataset.group || (g ? g.value : undefined) }); if (res.ok) toast(Number(b.dataset.lv) ? 'Förderung vereinbart.' : 'Förderung beendet.'); refreshAll(); return true; }
    case 'corppoach': { const c = ui.corp; const res = doAction({ type: 'poachCorp', target: c.target, apt: c.apt, budget: c.budget }); if (res.ok) toast(res.won ? `Gewonnen: Firmenkunden in ${c.apt} buchen jetzt lieber bei Ihnen.` : 'Die Firmen bleiben vorerst bei der Konkurrenz.'); refreshAll(); return true; }
    case 'poach': {
      readPoach(); const [role, group] = ui.poach.role.split(':');
      const res = doAction({ type: 'poach', target: ui.poach.target, role, group: group || null, n: ui.poach.n, bonus: ui.poach.bonus });
      if (res.ok) toast(res.taken ? `${res.taken} von ${res.tried} wechseln zu Ihnen (Start in 7 Tagen).` : 'Niemand wollte wechseln. Die Kosten für den Headhunter bleiben.');
      refreshAll(); return true;
    }
    case 'poachexp': { const f = Number($(`#pe-${b.dataset.id}`).value); const res = doAction({ type: 'poachExpert', target: b.dataset.t, id: b.dataset.id, factor: f }); if (res.ok) toast(res.taken ? 'Wechsel geglückt.' : 'Abgelehnt – die Person bleibt bei der Konkurrenz.'); refreshAll(); return true; }
    case 'payrel': doAction({ type: 'pay', rel: Number(b.dataset.v) }); refreshAll(); return true;
    default: return false;
  }
}
function readPoach() { if (!ui.poach) return; const g = (id) => $(id); if (g('#po-target')) ui.poach.target = g('#po-target').value; if (g('#po-role')) ui.poach.role = g('#po-role').value; if (g('#po-n')) ui.poach.n = Math.max(1, Math.min(P.POACH.maxN, Number(g('#po-n').value) || 1)); if (g('#po-bonus')) ui.poach.bonus = Number(g('#po-bonus').value); }
function onHardChange(t) {
  if (/^po-/.test(t.id)) { readPoach(); renderPane(true); return true; }
  if (/^corp-/.test(t.id) && ui.corp) { const k = t.id.slice(5); ui.corp[k === 'budget' ? 'budget' : k] = k === 'budget' ? Number(t.value) : t.value; renderPane(true); return true; }
  if (t.classList && t.classList.contains('acad-group')) { const x = SM.acadList(W.player, 'pilot').find((y) => y.id === t.dataset.id); if (x && x.lv) doAction({ type: 'academy', role: 'pilot', id: x.id, level: x.lv, group: t.value }); refreshAll(); return true; }
  return false;
}
VIEWS.milestones = function viewMilestones() {
  const pl = W.player, got = pl.milestones || {};
  const pts = (al) => SM.MILESTONES.reduce((s, m) => s + ((al.milestones || {})[m.id] !== undefined ? m.pts : 0), 0);
  const total = SM.MILESTONES.reduce((s, m) => s + m.pts, 0);
  let html = careerHtml(pl, false) + `<h2 class="sec">Meilensteine <small>${pts(pl)} von ${total} Punkten</small></h2>`;
  if (visHumans().length > 1) {
    const rank = visHumans().slice().sort((a, b) => (!!a.dq - !!b.dq) || (pts(b) - pts(a)));   // 0.21.75: aberkannte Wertung am Ende, ohne Punkte
    html += `<div class="stack"><h3>Rangliste</h3><table class="t"><thead><tr><th>#</th><th>Airline</th><th class="r">Punkte</th><th class="r">Eigenkapital</th><th class="r">Passagiere</th><th class="r">Flotte</th></tr></thead><tbody>${rank.map((h, i) => `<tr><td>${h.dq ? '–' : i + 1}</td><td><span class="lgi">${logoSvg(h, 18)}</span> ${esc(h.name)}${h.id === pl.id ? ' <span class="chip me">Sie</span>' : ''}${h.status === 'insolvent' ? ' <span class="chip crit">insolvent</span>' : ''}${h.dq ? ' <span class="chip crit" title="Wertung von der Luftfahrtaufsicht aberkannt">disqualifiziert</span>' : ''}</td><td class="r"><b>${h.dq ? '–' : pts(h)}</b></td><td class="r">${eur(SM.balanceSheet(h).equity)}</td><td class="r">${n0(h.paxTotal || 0)}</td><td class="r">${h.fleet.length}</td></tr>`).join('')}</tbody></table></div>`;
  }
  html += `<div class="ms-grid">${SM.MILESTONES.map((m) => { const d = got[m.id]; return `<div class="ms ${d !== undefined ? 'done' : ''}"><div class="ms-ic">${d !== undefined ? '★' : '☆'}</div><div><b>${esc(m.label)}</b><span>${esc(m.desc)}</span><em>${m.pts} Punkte${m.brand ? ` · Marke +${Math.round(m.brand * 100)}` : ''}${d !== undefined ? ` · erreicht ${dateShort(d)}` : ''}</em></div></div>`; }).join('')}</div>`;
  return html;
};
/** Karriere: Phase, Bedingungen für den Aufstieg, Freischaltungen, Konditionen der Leasinggeber. */
const RISK_CLASSES = [['DH8D', 'Turboprops'], ['E295', 'Regionaljets'], ['A20N', 'Mittelstrecke'], ['B789', 'Langstrecke'], ['A388', 'A380, 747, Concorde']];
function careerHtml(pl, compact) {
  const L = SM.careerOf(pl), lv = SM.careerLv(pl);
  if (!L) return '';
  const C = SM.CAREER.levels, c = SM.careerChecks(W, pl);
  const steps = `<div class="phwrap"><div class="phases">${C.map((x, i) => `<div class="ph ${i < lv ? 'done' : i === lv ? 'cur' : ''}" title="${esc(x.label)}"><i>${i + 1}</i><span>${esc(x.label)}</span></div>`).join('')}</div><div class="ph-cap small">Phase ${Math.min(lv, C.length - 1) + 1} von ${C.length}: <b>${esc(C[Math.min(lv, C.length - 1)].label)}</b>${C[lv + 1] ? ` <span class="muted">· danach ${esc(C[lv + 1].label)}</span>` : ''}</div></div>`;
  const checks = c ? `<div class="pchecks">${c.checks.map((x) => { const f = Math.max(0, Math.min(1, x.need ? x.have / x.need : 1)); return `<div class="pc ${x.ok ? 'ok' : ''}"><span>${esc(x.label)}</span><div class="bar"><i class="${x.ok ? 'good' : ''}" style="width:${(f * 100).toFixed(0)}%"></i></div><b>${x.money ? eur(x.have) : n0(x.have)} / ${x.money ? eur(x.need) : n0(x.need)}</b></div>`; }).join('')}</div>` : '<p class="small pos">Höchste Phase erreicht.</p>';
  const st = SM.standingOf(pl, W.day), room = SM.leaseRoom(pl, W.day), SB = P.STANDING;
  const stBar = `<div class="pchecks">${st.parts.map(([l, v, mx, why]) => `<div class="pc ${v >= mx * 0.8 ? 'ok' : ''}"><span title="${esc(why)}">${esc(l)}</span><div class="bar"><i class="${v >= mx * 0.8 ? 'good' : ''}" style="width:${(Math.max(0, Math.min(1, v / mx)) * 100).toFixed(0)}%"></i></div><b>${n0(v)} / ${mx}</b></div>`).join('')}</div>`;
  const verdict = (r) => r.reject ? '<span class="neg">Absage</span>' : r.cond ? '<span class="warnc">Auflagen</span>' : '<span class="pos">Zusage</span>';
  if (compact) return `<div class="card pad stack career"><div class="spread"><b>Ansehen ${st.v} / 100 · Phase ${lv + 1}: ${esc(L.label)}</b><button class="btn small" data-act="tab" data-tab="milestones">Ansehen und Ziele</button></div>
    <div class="row small" style="gap:6px">${RISK_CLASSES.map(([t, l]) => { const r = SM.riskTerms(pl, t); return `<span class="chip ${r.reject ? 'crit' : r.cond ? 'warn' : ''}" title="${esc(r.reject || (r.cond ? `Ansehen ${r.st}, verlangt ${r.req}: Rate +${pct(r.lease - 1)}, Kaution ${r.dep} Raten` : 'Leasing ohne Auflagen'))}">${l}: ${r.reject ? 'abgelehnt' : r.cond ? 'Auflagen' : 'Zusage'}</span>`; }).join('')}<span class="chip">Leasing: noch ${room.left} von ${room.max} in ${SB.leaseWin} T.</span></div>
    ${c ? `<p class="small muted">Für Phase „${esc(c.label)}“:</p>${checks}` : ''}</div>`;
  const terms = `<table class="t"><thead><tr><th>Muster</th><th style="text-align:right">Leasinggeber</th></tr></thead><tbody>${RISK_CLASSES.map(([t, l]) => { const r = SM.riskTerms(pl, t); return `<tr><td>${l}<div class="small muted">verlangt Ansehen ${r.req}</div></td><td style="text-align:right">${verdict(r)}<div class="small muted">${r.reject ? `Kauf mit ${pct(r.down)} Eigenanteil` : `Rate ${r.lease > 1.001 ? '+' + pct(r.lease - 1) : 'normal'} · ${r.dep} Raten Kaution · Kauf ${pct(r.down)}`}</div>${(() => { const o = SM.leaseOutlook(pl, t, W.day); return r.reject || r.cond ? `<div class="small">${o.roomLeft <= 0 ? `Rahmen frei ab ${dateShort(o.roomDay)}` : o.condNeed > 0 ? (o.condDay ? `Auflagen ab ${dateShort(o.condDay)}` : `+${o.condNeed} Ansehen nötig`) : o.freeDay ? `ohne Auflagen ab ${dateShort(o.freeDay)}` : `+${o.freeNeed} Ansehen nötig`}</div>` : ''; })()}</td></tr>`; }).join('')}</tbody></table>`;
  const bases = `<div class="tw"><table class="t"><thead><tr><th>Basis an …</th><th class="r">verlangt</th><th class="r">Antrag</th></tr></thead><tbody>${[['s', 'kleinem Flughafen (bis 8 Mio. Pax)'], ['m', 'mittlerem Flughafen (bis 20 Mio.)'], ['l', 'großem Flughafen (bis 50 Mio.)'], ['x', 'Drehkreuz (über 50 Mio.)']].map(([k, l]) => { const req = SB.baseReq[k], g = req - st.v; return `<tr><td>${l}</td><td class="r">${req}</td><td class="r">${g <= 0 ? '<span class="pos">Zusage</span>' : g <= SB.baseCond ? `<span class="warnc">Auflagen (Lizenz ×${NF1.format(SB.baseCondX)})</span>` : '<span class="neg">Absage</span>'}</td></tr>`; }).join('')}</tbody></table></div>`;
  return `<div class="stack career"><h2 class="sec">Ansehen Ihrer Airline <small>${st.v} von 100 – danach entscheiden Leasinggeber, Banken und Flughäfen</small></h2>
    <div class="grid2"><div class="card pad stack"><h3>Woraus sich das Ansehen ergibt</h3>${stBar}<p class="small muted">Erfahrung wächst mit jedem Monat Flugbetrieb, Größe mit der Flotte. Finanzen: Rating und Eigenkapital. Zuverlässigkeit: Pünktlichkeit der letzten Flüge; eine Sanierung kostet 15 Punkte. Marke: Bekanntheit durch Service und Marketing. Es gibt keine Stufen zum Freischalten – wer solide wirtschaftet, bekommt bessere Partner.</p></div>
    <div class="card pad stack"><h3>Leasing und Finanzierung</h3>${terms}<p class="small ink2">Neue Leasingverträge: <b>${room.recent} in ${SB.leaseWin} Tagen</b>, die Leasinggeber machen bei Ihrem Ansehen höchstens ${room.max} mit (je 10 Punkte einer mehr)${room.left <= 0 ? ` – der nächste ist ab <b>${dateShort(SM.leaseOutlook(pl, 'E295', W.day).roomDay)}</b> wieder möglich` : ''}. Darüber hinaus oder bei Absage: kaufen – mit Bankkredit für den Rest, sofern der Eigenanteil unter 100 % liegt.</p>
    <p class="small muted">Bis ${SB.cond} Punkte unter der Anforderung sagen die Leasinggeber unter Auflagen zu: höhere Rate, mehr Kaution. Darunter lehnen sie ab. Gekaufte Flugzeuge bauen Eigenkapital auf, verbessern das Rating und damit das Ansehen.</p></div></div>
    <div class="grid2"><div class="card pad stack"><h3>Basen beantragen</h3>${bases}<p class="small muted">Die Startbasis ist frei wählbar. Jede weitere Basis wird bei der Flughafengesellschaft beantragt. Ohne Aufschlag führen Sie ${SM.basesFree(st.v) >= 99 ? 'beliebig viele Basen' : SM.basesFree(st.v) === 1 ? 'eine Basis' : SM.basesFree(st.v) + ' Basen'}, Drehkreuz-Ausbau ohne Aufschlag bis „${P.HUB[Math.min(3, Math.floor(st.v / 25))].label}“, Übernahmen ohne Aufschlag ab Ansehen 40. Höchstens ${P.BASE_MAX} Basen und ${P.BASE_RULE.perYear} neue je Kalenderjahr.</p></div>
    <div class="card pad stack"><h3>${c ? `Ziel: Phase „${esc(c.label)}“` : 'Alle Phasen erreicht'}</h3>${steps}${checks}<p class="small muted">Phasen sind Etappenziele mit Meilensteinpunkten. Jede erreichte Phase bringt 2 Punkte Erfahrung im Ansehen.</p></div></div></div>`;
}
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
  { const mx = SM.shockX(W, 'mx'), lx = SM.shockX(W, 'lease'), dl = SM.shockX(W, 'delay'), rq = SM.shockX(W, 'req');
    const gr = W.events.filter((e) => e.type === 'grounding' && !e.cancelled && e.start <= W.day && e.end > W.day);
    const fx = [mx > 1.001 ? `Wartung +${pct(mx - 1)}` : '', lx > 1.001 ? `neue Leasingverträge +${pct(lx - 1)}` : '', dl ? `Auslieferungen +${dl} Tage` : '', rq ? `Leasinggeber verlangen +${rq} Ansehen` : '', ...gr.map((e) => `stillgelegt: ${e.types.map((t) => tl(t)).join(', ')} (${pct(e.share)})`)].filter(Boolean);
    if (fx.length) html += `<div class="callout warn"><b>Laufende Krisen wirken auf Ihre Rechnung</b><span>${fx.join(' · ')}</span></div>`; }

  html += `<div class="stack"><h2 class="sec">Konjunktur nach Regionen <small>Zyklen laufen versetzt – Streuung schützt</small></h2><div class="econ">${regs.map(([rg, v]) => `<div><span>${rg}</span><div class="bar"><i class="${v < 0.95 ? 'crit' : v > 1.04 ? 'good' : ''}" style="width:${clampPct((v - 0.7) / 0.6)}%"></i><span class="tgt" style="left:50%"></span></div><b class="num">${n0(v * 100)}</b></div>`).join('')}</div></div>`;
  html += `<div class="stack"><h2 class="sec">Handelskonflikte und Zölle</h2>${tariffs.length ? `<table class="t"><tbody>${tariffs.map(([k, v]) => { const [a, b] = k.split('|'); return `<tr><td>${esc(SM.blocName(a))} ↔ ${esc(SM.blocName(b))}</td><td class="r">${pct(v)}</td></tr>`; }).join('')}</tbody></table><p class="small muted">Zölle senken Geschäftsreisen (stark), Fracht und Urlaubsreisen zwischen den Blöcken und verteuern Flugzeuge aus dem jeweils anderen Block (Airbus/ATR: EU, Boeing: USA, Embraer: Brasilien, Dash 8: Kanada).</p>` : '<p class="small muted">Freier Handel. Das kann sich schnell ändern.</p>'}</div>`;
  if (carbon.length || fees.length) html += `<div class="stack"><h2 class="sec">Abgaben und Entgelte</h2><table class="t"><tbody>${carbon.map(([b, v]) => `<tr><td>CO₂-Abgabe ${esc(SM.blocName(b))}</td><td class="r">Kerosin +${pct(v)}</td></tr>`).join('')}${fees.map(([a, v]) => `<tr><td>Entgelte ${a} · ${esc(apName(a))}</td><td class="r">+${pct(v - 1)}</td></tr>`).join('')}</tbody></table></div>`;
  html += `<div class="stack"><h2 class="sec">Leasingmarkt <small>Bestand für alle Airlines</small></h2><div class="tw"><table class="t"><thead><tr><th>Typ</th><th class="r">verfügbar</th><th class="r">Lieferung</th><th class="r">ab Werk</th></tr></thead><tbody>${stock.map((k) => { const n = W.lessorStock && W.lessorStock[k] !== undefined ? W.lessorStock[k] : SM.capOf(W, k); return `<tr><td>${tl(k)}</td><td class="r ${n <= 0 ? 'neg' : ''}">${n <= 0 ? 'ausverkauft' : n}</td><td class="r">${SM.leaseDelivery(W, k, 'lease')} T.</td><td class="r">${SM.leaseDelivery(W, k, 'factory')} T.</td></tr>`; }).join('')}</tbody></table></div><p class="small muted">Leasinggeber füllen ihren Bestand monatlich nur teilweise auf. Wer viel bestellt, kauft anderen den Markt leer und verlängert die Lieferzeiten.</p></div>`;
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
/** Punkt in Entfernung km und Richtung brg (Grad) von lat/lon. */
function destPt(la, lo, brg, km) {
  const d = km / 6371, b = brg * RAD, p1 = la * RAD, l1 = lo * RAD;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [p2 / RAD, ((l2 / RAD + 540) % 360) - 180];
}
/** 0.21.35: gesperrte Überflugzonen (Konflikte, Sanktionen) als gestrichelte Flächen. */
function zonesSvg() {
  return W.geoLists().fly.map((e) => e.overfly.circles.map(([la, lo, km]) => {
    const pts = []; for (let b = 0; b <= 360; b += 10) pts.push(proj(...destPt(la, lo, b, km)));
    return `<path class="zonec" d="M${pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L')}Z"><title>${esc(e.short || 'Gesperrter Luftraum')}: Überflug verboten${e.overfly.from ? ' für Airlines aus ' + (e.overfly.from.length > 3 ? 'mehreren Ländern' : e.overfly.from.map((c) => SM.COUNTRY_LABEL[c] || c).join(', ')) : ''} bis ${dateShort(e.end)}</title></path>`;
  }).join('')).join('');
}
function renderGrey(dead) {
  const g = $('#gGrey'); if (!g) return;
  g.innerHTML = zonesSvg() + dead.map((c) => {
    const d = MAP.countries && MAP.countries[c];
    if (d) return `<path class="greyc" d="${d}"><title>${esc(SM.COUNTRY_LABEL[c] || c)}: ${SM.AP_CODES.some((x) => P.AIRPORTS[x].country === c && W.opsAt(x).hard) ? 'Luftraum gesperrt' : 'keine Nachfrage'}</title></path>`;
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
  else html += `<p class="small ink2">Handeln Sie mit KI-Airlines und Mitspielenden: Flugzeuge samt Leasingvertrag oder Kredit, Crews, Slots, Geld – und Rückzüge von Strecken mit Wettbewerbsverzicht. KI-Airlines antworten sofort, oft mit einem Gegenangebot.</p>`;
  html += marketHtml();
  html += `<div class="stack"><h2 class="sec">Eingang <small>${inc.length ? 'Antwort erwartet' : 'leer'}</small></h2>${inc.length ? inc.map(dealCard).join('') : '<p class="small muted">Keine offenen Angebote an Sie. KI-Airlines melden sich gelegentlich zum Monatswechsel.</p>'}</div>`;
  if (outg.length) html += `<div class="stack"><h2 class="sec">Ihre offenen Angebote</h2>${outg.map(dealCard).join('')}</div>`;
  const cps = (W.coops || []).filter((c) => c.until > W.day && (c.a === me.id || c.b === me.id));
  if (cps.length) html += `<div class="stack"><h2 class="sec">Kooperationen</h2><table class="t"><tbody>${cps.map((c) => { const o = W.airlines[c.a === me.id ? c.b : c.a]; return `<tr><td><span class="lgi">${logoSvg(o, 18)}</span> ${esc(o.name)}</td><td>${c.kind === 'alliance' ? 'Allianz' : 'Codeshare ' + c.pair.replace('-', '–')}</td><td class="r">bis ${dateY(c.until)}</td></tr>`; }).join('')}</tbody></table></div>`;
  const ags = (W.agreements || []).filter((g) => g.until > W.day && (g.airline === me.id || g.partner === me.id));
  if (ags.length) html += `<div class="stack"><h2 class="sec">Vereinbarungen <small>Wettbewerbsverzicht</small></h2><table class="t"><tbody>${ags.map((g) => `<tr><td>${g.airline === me.id ? `<b>Sie</b> verzichten gegenüber ${esc(W.airlines[g.partner].name)}` : `<b>${esc(W.airlines[g.airline].name)}</b> verzichtet zu Ihren Gunsten`}</td><td>${g.pair.replace('-', '–')}</td><td class="r">bis ${dateY(g.until)}</td></tr>`).join('')}</tbody></table></div>`;
  const holds = Object.keys(me.slotHold || {}).map((apt) => [apt, me.heldAt(apt, W.day), Math.min(...me.slotHold[apt].filter((h) => h.until > W.day).map((h) => h.until))]).filter((x) => x[1] > 0);
  html += `<div class="stack"><h2 class="sec">Ihre Slot-Reserve <small>freie Slots, die Ihnen gehören</small></h2>${holds.length ? `<table class="t"><tbody>${holds.map(([apt, n, until]) => `<tr><td><b>${apt}</b> ${esc(apName(apt))}</td><td class="r">${n} ${n === 1 ? 'Slot' : 'Slots'}</td><td class="r small muted wrap">${until > 1e8 ? 'gekauft, unbefristet' : 'verfällt ab ' + dateY(until)}</td><td class="r"><button class="btn small" data-act="dealslots" data-apt="${apt}">Verkaufen</button></td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Keine. Freie Slots, die Ihnen gehören – gekaufte, die drei Basis-Slots oder Slots eingestellter Strecken –, erscheinen hier und lassen sich an andere Airlines verkaufen. Kaufen und Wartelisten: Strecken → Slots.</p>'}</div>`;
  const hist = myDeals().filter((d) => d.status !== 'open').sort((a, b) => (b.resolvedDay ?? b.day) - (a.resolvedDay ?? a.day)).slice(0, 12);
  if (hist.length) html += `<details class="fold" data-keep="tradeHist" ${ui.open && ui.open.tradeHist ? 'open' : ''}><summary><h2 class="sec">Verlauf <small>${hist.length} abgeschlossene Angebote</small></h2><span class="fold-hint">${ui.open && ui.open.tradeHist ? 'einklappen' : 'aufklappen'}</span></summary><div class="stack">${hist.map(dealCard).join('')}</div></details>`;
  return html;
};
function dealOpts(side) {
  const D = ui.deal, me = W.player, partner = W.airlines[D.to], giver = side === 'give' ? me : partner;
  const k = (ui.dealK && ui.dealK[side]) || 'cash', id = (x) => `dl-${x}-${side}`;
  let f = '';
  if (k === 'cash') f = `<input type="number" id="${id('cash')}" min="0" step="5000" value="100000" inputmode="numeric"><span class="dl-quick"><span class="small muted dl-fmt" id="${id('fmt')}">= ${eur(100000)}</span>${[50e3, 250e3, 1e6, 5e6].map((v) => `<button type="button" class="btn small ghost" data-act="dealcashq" data-side="${side}" data-v="${v}">${eurB(v)}</button>`).join('')}</span>`;
  else if (k === 'ac') {
    const list = giver.fleet.filter((a) => a.delivery_day <= W.day && !(a.acmi && a.acmi.end > W.day) && !(D[side] || []).some((x) => x.k === 'ac' && x.id === a.id));
    f = list.length ? `<select id="${id('ac')}">${list.map((a) => `<option value="${a.id}">${giver === me ? acName(a.id) : a.id} · ${tl(a.type_id)} · ${a.owned ? 'Eigentum' : 'Leasing'} · ${n0(al_age(giver, a))} J.${a.used_hours > 0 ? ' · im Einsatz' : ''} · ~${eur(SM.acDealValue(W, a))}</option>`).join('')}</select>` : '<span class="small muted">Keine verfügbaren Flugzeuge.</span>';
  } else if (k === 'staff') {
    const opts = SM.STAFF_GROUPS.map((g) => [`pilot:${g}`, `Piloten ${P.TYPE_GROUPS[g]}`, giver.staff ? giver.staff.pil[g] : null]).concat([['cabin', 'Flugbegleiterinnen', giver.staff ? giver.staff.cab : null], ['tech', 'Techniker', giver.staff ? giver.staff.tech : null]]);
    f = `<select id="${id('role')}">${opts.filter((o) => o[2] === null || o[2] > 0).map(([v, l, h]) => `<option value="${v}">${l}${h !== null ? ` (${h} vorhanden)` : ''}</option>`).join('')}</select><input type="number" id="${id('n')}" min="1" max="${Math.min(60, Math.max(1, ...opts.map((o) => o[2] ?? 60)))}" value="3" style="width:70px">`;
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
  } else if (partner.isPlayer) {
    const f = (D.give.length || D.take.length) ? SM.tradeFairness(W, me, partner, D.give, D.take) : null;
    est = `<div class="callout ${f && !f.ok ? 'crit' : 'info'}">${f ? `<b>Marktwert:</b> Sie geben rund ${eur(f.va)}, ${esc(partner.name)} rund ${eur(f.vb)}. ${f.ok ? `Abweichung ${eur(f.diff)}, erlaubt bis ${eur(f.lim)}.` : `<b>Zu ungleich</b> – Abweichung ${eur(f.diff)}. Zwischen Spielenden sind bis zu ${pct(P.TRADE_FAIR.rel)} des Gesamtbetrags erlaubt, höchstens ${eur(P.TRADE_FAIR.max * cpi())} – hier ${eur(f.lim)}. Bitte Geld oder Posten anpassen.`} ` : ''}${esc(partner.name)} entscheidet selbst. Das Angebot gilt ${SM.DEAL_DAYS} Spieltage.</div>`;
  }
  const v = (D.give.length || D.take.length) ? myDealValue(pseudo) : null;
  return `<div class="card pad stack dealcomp"><div class="spread"><h3>${D.replyTo ? 'Gegenangebot' : 'Neues Angebot'}</h3><button class="btn small" data-act="dealcancel">Verwerfen</button></div>
    <label class="f"><span>Handelspartner</span><select id="dl-to" ${D.replyTo ? 'disabled' : ''}>
      ${W.humans.filter((h) => h.id !== me.id && h.status !== 'insolvent' && !h.removed).length ? `<optgroup label="Mitspielende">${W.humans.filter((h) => h.id !== me.id && h.status !== 'insolvent' && !h.removed).map((h) => `<option value="${h.id}" ${h.id === D.to ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</optgroup>` : ''}
      <optgroup label="KI-Airlines">${W.list.filter((a) => a.archetype && a.status !== 'insolvent').map((a) => `<option value="${a.id}" ${a.id === D.to ? 'selected' : ''}>${esc(a.name)} · ${P.AI_ARCHETYPES[a.archetype].label} · ${a.bases.join(', ')}</option>`).join('')}</optgroup></select></label>
    <div class="dealcols edit"><div><span>Sie geben</span>${items('give', me)}${dealOpts('give')}</div><div><span>Sie erhalten von ${esc(partner.name)}</span>${items('take', partner)}${dealOpts('take')}</div></div>
    <label class="f"><span>Nachricht (optional)</span><input type="text" id="dl-note" maxlength="200" value="${esc(D.note || '')}" placeholder="z. B. Wir brauchen die Maschine ab sofort."></label>
    ${err ? `<div class="callout crit">${esc(err)}</div>` : ''}${est}
    ${v !== null ? `<p class="small muted">Grobe Bewertung für Sie: <b class="${v < 0 ? 'neg' : 'pos'}">${eur(v, { plus: true })}</b></p>` : ''}
    <div class="row"><button class="btn primary" data-act="dealsend" ${err || !(D.give.length || D.take.length) || (partner.isPlayer && !SM.tradeFairness(W, me, partner, D.give, D.take).ok) ? 'disabled' : ''}>${partner.isPlayer ? 'Angebot senden' : 'Angebot machen'}</button>${!partner.isPlayer && (D.give.some((x) => x.k === 'cash') || D.take.some((x) => x.k === 'cash')) ? '<button class="btn" data-act="dealtune" title="Geldbetrag auf das setzen, was die KI gerade akzeptieren würde">Preis anpassen</button>' : ''}
      <span class="small muted">Flugzeuge wechseln mit Leasingvertrag bzw. Kredit und Kaution. Bei einem Rückzug stellt die Airline die Strecke sofort ein und darf sie in der Laufzeit nicht wieder fliegen.</span></div></div>`;
}
/** Personal im Handel: nur so viele anbieten, wie wirklich da sind (abzüglich schon eingetragener Posten). */
function staffClamp(giver, list, it) {
  if (!it || it.k !== 'staff' || !giver || !giver.staff) return it;
  const key = it.role === 'pilot' ? it.group : it.role, have = key === 'cabin' ? giver.staff.cab : key === 'tech' ? giver.staff.tech : giver.staff.pil[key] || 0;
  const used = list.filter((x) => x.k === 'staff' && (x.role === 'pilot' ? x.group : x.role) === key).reduce((a, x) => a + x.n, 0), left = have - used;
  if (left <= 0) { toast(`${giver === W.player ? 'Sie haben' : esc(giver.name) + ' hat'} keine weiteren ${it.role === 'pilot' ? 'Piloten dieser Familie' : it.role === 'cabin' ? 'Flugbegleiterinnen' : 'Techniker'} – alle ${have} sind schon eingetragen.`); return null; }
  if (it.n > left) { toast(`Nur ${left} verfügbar – auf ${left} gekürzt.`); it.n = left; }
  return it;
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
    else f = `<select id="mk-type">${[['', 'Passagierflugzeuge'], ['cargo', 'Frachter'], ['biz', 'Privatjets']].map(([role, lbl]) => { const L = Object.entries(P.AIRCRAFT_TYPES).filter(([, t]) => (t.role || '') === role && !(t.launch && W.day < t.launch)).sort((x, y) => x[1].label.localeCompare(y[1].label, 'de')); return L.length ? `<optgroup label="${lbl}">${L.map(([id, t]) => `<option value="${id}">${esc(t.label)}</option>`).join('')}</optgroup>` : ''; }).join('')}</select>
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
      <div class="grid2"><label class="f"><span>${sell ? 'Wunschpreis (leer = Angebote abwarten)' : 'Sie zahlen (leer = Preisangebote abwarten)'}</span><input type="number" id="mk-price" min="0" step="5000" value="${M.price || ''}" placeholder="z. B. 500000" inputmode="numeric" data-fmt="mk-pricefmt"><span class="small muted mono" id="mk-pricefmt">${M.price ? '= ' + eur(M.price) : ''}</span></label>
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
    case 'mktadd': { keep(); let it = mktReadItem(); if (it && it.k === 'staff' && ui.mkt.mode === 'sell') it = staffClamp(W.player, ui.mkt.items, it); if (it) ui.mkt.items.push(it); renderPane(true); return true; }
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
    case 'dealto': startDeal(b.dataset.al); return true;
    case 'dealnew': { const comp = W.list.find((x) => x.id !== pl.id && x.status !== 'insolvent' && !x.archetype) || W.list.find((x) => x.archetype && x.status !== 'insolvent'); startDeal(comp.id); return true; }
    case 'dealwith': startDeal(b.dataset.al); return true;
    case 'dealac': { const a = pl.fleet.find((x) => x.id === b.dataset.id); if (a) startDeal(bestBuyerFor(a), [{ k: 'ac', id: a.id }], [{ k: 'cash', amount: Math.max(5000, Math.round(SM.acDealValue(W, a) / 5000) * 5000) }], {}, true); return true; }
    case 'dealexit': { const al = W.airlines[b.dataset.al], pair = b.dataset.pair; startDeal(al.id, [{ k: 'cash', amount: Math.round(SM.exitLoss(W, al, pair, 365) * 1.1 / 5000) * 5000 }], [{ k: 'exit', pair, days: 365, withSlots: true }], {}, true); return true; }
    case 'dealslots': { const apt = b.dataset.apt, buyer = W.list.filter((x) => x.archetype && x.status === 'active').find((x) => x.bases.includes(apt) || x.activeRoutes().some((r) => r.base === apt || r.dest === apt)) || W.list.find((x) => x.archetype); startDeal(buyer.id, [{ k: 'slots', apt, n: 1 }], [{ k: 'cash', amount: Math.round(SM.slotValue(W, apt) * 0.9 / 5000) * 5000 }], {}, true); return true; }
    case 'dealcancel': ui.deal = null; renderPane(true); return true;
    case 'dealtune': readDealNote(); tuneCash(); renderPane(true); return true;
    case 'dealadd': { let it = readDealItem(b.dataset.side); if (!it) { toast('Bitte zuerst etwas auswählen.'); return true; }
      if (it.k === 'staff') { it = staffClamp(b.dataset.side === 'give' ? W.player : W.airlines[ui.deal.to], ui.deal[b.dataset.side], it); if (!it) return true; } readDealNote(); const arr = ui.deal[b.dataset.side]; const same = arr.find((x) => x.k === 'cash' && it.k === 'cash'); if (same) same.amount += it.amount; else arr.push(it); renderPane(true); return true; }
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
  if (x.l.x) return ['cx', `Annulliert – ${esc(x.l.x)}`];
  if (x.t0 <= h && x.t1 >= h) return ['air', 'In der Luft'];
  if (x.t1 < h) return ['ok', 'Gelandet'];
  if (x.t0 - h < 0.75) return ['board2', 'Boarding'];
  const st = rstats(x.l.r, 14), otp = st.otp === null ? 0.9 : st.otp;
  const roll = (((W.day + 1) * 7919 + x.i * 104729 + x.s.ac.id.length * 31 + Math.round(x.t0 * 13)) % 1000) / 1000;
  if (roll > otp) return ['late', `Verspätet +${10 + Math.round(roll * 40)}′`];
  return ['ok', 'Pünktlich'];
}
VIEWS.departures = function viewDepartures() {
  const h = ui.t * 24, rows = boardRows();
  const air = rows.filter((x) => !x.l.x && x.t0 <= h && x.t1 >= h).sort((a, b) => (b.t1 - b.t0) - (a.t1 - a.t0));
  const next = rows.filter((x) => x.t0 > h || (x.l.x && x.t1 >= h - 2)).sort((a, b) => a.t0 - b.t0).slice(0, 24);
  const cxN = rows.filter((x) => x.l.x).length;
  let html = `<h2 class="sec">Abflüge <small>${dateShort(W.day)} · ${clockText()} Uhr · ${air.length} in der Luft${cxN ? ` · <span class="neg">${cxN} annulliert</span>` : ''}</small></h2>`;
  if (!rows.length) { const rs = W.player.activeRoutes().filter((r) => r.opened_day <= W.day);
    return html + (rs.length ? `<div class="callout warn">Heute keine Abflüge: Keine Ihrer Strecken hat ein Flugzeug (${esc([...new Set(rs.map((r) => noAcWhy(r)))].join('; '))}).</div>` : '<div class="callout info">Noch keine Flüge im Plan. Sobald ein Flugzeug geliefert ist und eine Strecke hat, erscheint hier die Abflugtafel.</div>'); }
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

// ---------- 0.21.41: Krisenvorschläge, Startangebote ----------
/** Ereignisse (laufend oder angekündigt), die eigene Strecken spürbar treffen – mit Anpassungsvorschlag. */
function crisisList(max = 3) {
  const pl = W.player, done = pl.crisisDone || {}, out = [], routes = pl.activeRoutes();
  for (const e of W.activeEvents().concat(W.upcomingEvents())) {
    if (out.length >= max || !e.id || done[e.id] || e.cancelled || e.end + (e.recovery || 0) <= W.day) continue;
    const plan = W.crisisPlan(pl, e); if (!plan.length) continue;
    const down = plan.some((x) => x.f < 1), worst = Math.min(...plan.map((x) => x.f)), best = Math.max(...plan.map((x) => x.f));
    const name = EV_TYPE[e.type] || String(e.short || e.text || '').split(':')[0];
    const rn = (x) => { const r = routes.find((q) => q.id === x.id); return r ? `${r.base}–${r.dest}` : ''; };
    const nAp = plan.filter((x) => x.ap).length, cuts = plan.filter((x) => x.freq);
    const prop = [nAp ? `Preisautomatik auf ${nAp} Strecke${nAp > 1 ? 'n' : ''} einschalten (Ziel ${pct(down ? P.CRISIS_PLAN.lfDown : P.CRISIS_PLAN.lfUp)}, reagiert in Extremfällen sofort)` : '',
      cuts.length ? `Frequenz senken: ${cuts.slice(0, 3).map((x) => { const r = routes.find((q) => q.id === x.id); return `${rn(x)} ${r.freq}× → ${x.freq}×`; }).join(', ')}${cuts.length > 3 ? ` und ${cuts.length - 3} weitere` : ''} (die Slots bleiben Reserve)` : ''].filter(Boolean).join('; ');
    const one = plan.length === 1, hit = `${one ? 'Eine Ihrer Strecken' : `${plan.length} Ihrer Strecken`} ${down ? (one ? 'verliert' : 'verlieren') : (one ? 'gewinnt' : 'gewinnen')} voraussichtlich ${down ? `bis zu ${pct(1 - worst)}` : `bis zu ${pct(best - 1)}`} Nachfrage`;
    out.push({ e, plan, down, cuts, html: `<b>${esc(name)}</b>${e.start > W.day ? ` ab ${dateShort(e.start)}` : ''}: ${hit}${e.end ? ` (bis etwa ${dateShort(e.end + (e.recovery || 0))})` : ''}. Vorschlag: ${prop}.${cuts.length ? ' Nach der Krise lassen sich die Frequenzen mit einem Klick zurücknehmen.' : ''}` });
  }
  return out;
}
function crisisBack() { return W.player.activeRoutes().filter((r) => r.crisis && r.crisis.end <= W.day); }
function crisisBtns(eid) { return `<button class="btn small primary" data-act="crisisadj" data-ev="${eid}">Vorschlag übernehmen</button><button class="btn small" data-act="crisisno" data-ev="${eid}">Nein danke</button>`; }
function crisisCardsHtml() {
  const L = crisisList(), back = crisisBack();
  let h = L.map((x) => `<div class="callout ${x.down ? 'warn' : 'good'} stack"><span>${x.html}</span><div class="row" style="gap:8px;flex-wrap:wrap">${crisisBtns(x.e.id)}</div></div>`).join('');
  if (back.length) h += `<div class="callout good stack"><span><b>Die Krise ist vorbei:</b> ${back.slice(0, 4).map((r) => `${r.base}–${r.dest} ${r.freq}× → ${r.crisis.freq}×`).join(', ')}${back.length > 4 ? ` und ${back.length - 4} weitere` : ''} wieder auf die alte Frequenz?</span><div class="row"><button class="btn small primary" data-act="crisisrestore">Zurücknehmen</button></div></div>`;
  return h;
}
/** Startangebote für neue Airlines (zeitlich begrenzt). */
function offersHtml() {
  const pl = W.player, list = (pl.offers || []).filter((o) => o.until > W.day);
  if (!list.length) return '';
  return `<section class="card pad stack offers"><div class="spread"><h3 style="margin:0">Angebote zum Start <small class="muted">nur für neue Airlines</small></h3></div>
    ${list.map((o) => { const T = SM.offerText(pl, o); return `<div class="offer"><div><b>${esc(T.t)}</b><div class="small ink2">${esc(T.d)}</div><div class="small muted">gilt noch ${o.until - W.day} Tag${o.until - W.day === 1 ? '' : 'e'}</div></div>
      <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn small primary" data-act="offertake" data-id="${o.id}">Annehmen</button><button class="btn small ghost" data-act="offerdrop" data-id="${o.id}">Ablehnen</button></div></div>`; }).join('')}</section>`;
}
/** 0.21.55: Geldabfluss pro Tag (Mittel der letzten 30 Tage, 0 wenn das Konto wächst). */
function burnPerDay(pl) { const h = pl.netHist || []; if (h.length < 10) return 0; const k = Math.min(30, h.length - 1); return Math.max(0, (h[h.length - 1 - k] - h[h.length - 1]) / k); }
/** Kreditvorschlag mit Betrag (auf 0,5 Mio. gerundet, gedeckelt durch das Limit der Bank). */
function loanTip(pl, need) {
  if (!(need > 0)) return '';
  const lim = W.loanLimit(pl); if (!(lim >= 5e5)) return ' Die Bank gibt derzeit keinen neuen Kredit.';
  const amt = Math.min(Math.floor(lim / 5e5) * 5e5, Math.max(5e5, Math.ceil(need / 5e5) * 5e5));
  return ` Vorschlag: Kredit über <b>${eur(amt)}</b>${amt < need ? ` (mehr gibt die Bank nicht)` : ''}.`;
}
/** Die Strecke mit dem größten Verlust (direkte Kosten) als konkreter Vorschlag. */
function lossTip(routes) {
  let w = null; for (const r of routes) { const s = rstats(r, 30); if (s.n >= 14 && s.db1 < 0 && (!w || s.db1 / s.n < w.d)) w = { r, d: s.db1 / s.n }; }
  return w ? ` Größter Verlustbringer: ${w.r.base}–${w.r.dest} (${eur(w.d, { plus: true })} pro Tag) – schließen spart rund ${eur(-w.d * 30)} im Monat.` : '';
}
/** 0.21.55/0.21.77: Vorschlag zur Wettbewerbsaufsicht in einem Satz (konkrete Zahlen, Slot-Anteil). */
function antiAdvice(pa) {
  if (pa.ok) return `Grenze: unter ${n0(Math.ceil(pa.limit))} Slots – das ist schon erreicht, zum Monatsende endet das Verfahren.`;
  const cuts = pa.cuts.map((r) => r.close ? `<b>${r.base}–${r.dest}</b> schließen` : `<b>${r.base}–${r.dest}</b> ${r.freq}× → ${r.to}×`);
  const steps = [pa.giveRes ? `<b>${n0(pa.giveRes)} ungenutzte Reserve-Slots</b> zurückgeben` : '', cuts.length ? `${cuts.slice(0, 4).join(', ')}${cuts.length > 4 ? ` und ${cuts.length - 4} weitere` : ''} und die frei werdenden ${n0(pa.cutSlots)} Slots zurückgeben` : ''].filter(Boolean).join('; ');
  return `Vorschlag: höchstens <b>${n0(Math.ceil(pa.limit) - 1)} Slots</b> halten (−${n0(pa.own - pa.after)}): ${steps} – danach ${pa.bySize ? `${n0(pa.after)} Slots, unter der Prüfschwelle von ${P.ANTITRUST.minDeps} Slots` : pct(pa.afterShare)}. Nur Flüge kürzen reicht nicht: Die Slots blieben als Ihre Reserve und zählen weiter.${pa.lock ? ` Alternative: Exklusivvertrag für ${eur(pa.lock)}.` : ''}`;
}
/** Alle eigenen Strecken an einem Flughafen mit Wettbewerbsaufsicht (oder knapp davor), mit Vorschlag je Strecke. */
function antiHtml(c) {
  const pl = W.player, A = P.ANTITRUST, on = pl.antitrust && pl.antitrust[c];
  if (!on && (SM.paxEff(c) < A.minPax || (pl.gateLock && pl.gateLock[c]))) return '';
  const pa = W.antitrustPlan(pl, c);
  if (!pa.slots || (!on && (pa.share < A.share - 0.1 || pa.own < A.minDeps * 0.8))) return '';
  const riv = Object.entries(pa.rivals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => `${esc(W.airlines[id] ? W.airlines[id].name : id)} ${n1(n)}`).join(', ');
  const rows = pa.routes.slice().sort((a, b) => b.perDay - a.perDay).map((r) => `<tr class="${r.close || r.to < r.freq ? 'warn' : ''}"><td style="white-space:nowrap"><a href="#" data-act="openroute" data-id="${r.id}">${r.base}–${r.dest}</a></td><td class="num" style="white-space:nowrap">${r.wk < 7 ? `${r.wk}× pro Woche` : `${r.freq}× täglich`}</td><td class="num ${r.dayRes < 0 ? 'neg' : ''}">${eur(r.dayRes, { plus: true })}</td><td style="white-space:nowrap">${on || !pa.ok ? (r.close ? '<b>schließen</b>' : r.to < r.freq ? `<b>→ ${r.to}× täglich</b>` : '–') : ''}</td></tr>`).join('');
  return `<div class="callout ${on ? (W.day - on.since >= A.grace ? 'crit' : 'warn') : 'info'} stack"><span>${on ? `<b>Kartellverfahren:</b> ` : '<b>Wettbewerbsaufsicht – knapp unter der Grenze:</b> '}Sie halten ${pct(pa.share)} der Slots in ${apName(c)}: ${n0(pa.own)} von ${n0(pa.cap)} am Tag (${n0(pa.used)} genutzt, ${n0(pa.held)} Reserve${pa.sellable ? `, davon ${n0(pa.sellable)} zurückgebbar` : ''})${riv ? `. Andere: ${riv}` : ''}. ${on ? ` ${antiAdvice(pa)}` : ` Grenze ${pct(A.share)}: höchstens ${n0(Math.ceil(pa.limit) - 1)} Slots.`}</span>
    <div class="tw"><table class="t"><thead><tr><th>Strecke</th><th class="num">Flüge</th><th class="num">Ergebnis/Tag</th><th>${on || !pa.ok ? 'Vorschlag' : ''}</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${on && pa.sell ? `<div class="row"><button class="btn small primary" data-act="antiadj" data-apt="${c}">Vorschlag übernehmen (${pa.cuts.length ? 'kürzen und ' : ''}${n0(pa.sell)} Slots zurückgeben)</button></div>` : ''}</div>`;
}
/** Regelbasierte Hinweise. cat: ops, fin, net, strat – die Assistenz zieht ihr Fachgebiet nach vorn. */
function assistantHints() {
  const pl = W.player, out = [], routes = pl.activeRoutes(), add = (key, kind, cat, html, tab = null, extra = {}) => out.push({ key, kind, cat, html, tab, ...extra });
  const bs = SM.balanceSheet(pl);
  for (const d of incomingDeals().slice(0, 2)) add('deal' + d.id, 'info', 'strat', `<b>${esc(W.airlines[d.from].name)}</b> bietet einen Handel an (bis ${dateShort(d.expires)}): ${esc(SM.dealText(W, d))}.`, 'trade');
  for (const d of openDecisions()) add('dec' + d.id, 'crit', 'ops', `<b>Entscheidung bis ${dateShort(d.deadline)}:</b> ${esc(d.text)}`, 'cockpit');
  if (pl.status === 'restructuring') add('restr', 'crit', 'fin', `<b>Restrukturierung:</b> Noch ${P.RESTRUCT.humanDays - pl.distressDays} Tage, bis der Kontostand wieder positiv sein muss. Unter Finanzen → Sanierung liegen alle Hebel.`, 'credit');
  else if (netCash(pl) < 0 && bs.cash >= 0) add('dispo', 'warn', 'fin', `<b>Konto im Dispo</b> (${eur(netCash(pl))}). Das ist erlaubt, kostet aber ${pct(pl.creditRate(W.macro.rate, W.macro.bank ?? 1), 1)} Zins – und kürzt die Bank die Linie, wird der Überhang sofort eingezogen.${loanTip(pl, -netCash(pl) + 30 * burnPerDay(pl))}`, 'credit');
  if (bs.cash < 0 && pl.status !== 'restructuring') add('neg', 'crit', 'fin', `<b>Dispo überzogen</b> (${eur(netCash(pl))}). Nach ${P.INSOLVENCY_AFTER_DAYS} Tagen droht die Insolvenz.${loanTip(pl, -netCash(pl) + 30 * burnPerDay(pl))}${lossTip(routes)}`, 'credit');
  else if (isFinite(pl.runway) && pl.runway < 60 && routes.length) add('runway', 'warn', 'fin', `Das Geld reicht beim jetzigen Abfluss noch etwa <b>${n0(pl.runway)} Tage</b> (${eur(burnPerDay(pl))} weniger pro Tag).${loanTip(pl, Math.max(0, 90 - pl.runway) * burnPerDay(pl))}${lossTip(routes)}`, 'credit');
  if (ui.mp) { const fl = SM.auditPreview(W, pl).filter((e) => e.flagged); if (fl.length) add('audit', 'warn', 'fin', `Die Wirtschaftsprüfer würden zum Jahresabschluss die Geschäfte mit <b>${esc(fl[0].name)}</b> beanstanden: ${eur(fl[0].excess)} Vorteil über Marktwert. Freiwillig zurückzahlen erspart Bußgeld und Prüfvermerk.`, 'credit'); }
  if (pl.antitrust) for (const [c, x] of Object.entries(pl.antitrust)) { const late = W.day - x.since >= P.ANTITRUST.grace, pa = W.antitrustPlan(pl, c);
    add('anti' + c, late ? 'crit' : 'warn', 'strat', `<b>Kartellverfahren ${apName(c)}:</b> ${pct(pa.share)} der Slots (${n1(pa.own)} von ${n1(pa.cap)} am Tag). Neue Strecken dort sind untersagt${late ? `, jeden Monat kommen etwa <b>${eur(pa.fine)}</b> Bußgeld` : `, ab ${dateShort(x.since + P.ANTITRUST.grace)} etwa <b>${eur(pa.fine)}</b> Bußgeld pro Monat`}. ${antiAdvice(pa)}`, 'stations', { anti: c, antiOk: pa.sell > 0 }); }
  { const n = pl.fleet.length; if (n >= 90 && n < 100) add('hq100', 'info', 'strat', `Ab 100 Flugzeugen wächst die Verwaltung schneller als die Flotte: Bei 200 Flugzeugen kostet die Zentrale rund ${eur(200000 * cpi())} am Tag. Wachstum lohnt sich dann nur noch mit guten Strecken.`, 'finance'); }
  if (!pl.fleet.length) { const ok = ['A20N', 'E295', 'AT76', 'DH8D'].map((t) => [t, SM.riskTerms(pl, t)]), free = ok.find(([, r]) => !r.reject && !r.cond), a320 = ok[0][1];
    add('nofleet', 'info', 'strat', `Wir brauchen zuerst ein Flugzeug. Als junge Airline (Ansehen ${a320.st}) geben uns die Leasinggeber ${free ? `<b>${tl(free[0])}</b> und kleinere ohne Auflagen` : 'nur Turboprops ohne Auflagen'}${a320.reject ? ', die A320neo noch gar nicht' : a320.cond ? `, die A320neo nur unter Auflagen (+${pct(a320.lease - 1)} Rate, ${a320.dep} Monatsraten Kaution)` : ''}. Zwei ${free ? tl(free[0]) : 'Turboprops'} im Leasing sind ein solider Start – das kostet nur die Kaution. Mit Erfahrung, Pünktlichkeit und soliden Finanzen steigt das Ansehen.`, 'fleetBuy'); }
  else if (!routes.length) add('noroute', 'info', 'net', `Die Flotte ist da oder unterwegs, aber es gibt noch <b>keine Strecke</b>. Tippen Sie ein Ziel auf der Karte an.`, 'plan');
  const cov = pl.staff.cov;
  if (cov && Object.values(cov.cancel).some((x) => x > 0)) add('cxstaff', 'crit', 'ops', `<b>Flugausfälle:</b> Heute fehlen Crews${pl.staff.agency ? '' : ', und Agenturpersonal ist abgeschaltet'}.`, 'staff');
  else if (cov && cov.agencyH > 0) add('agency', 'warn', 'ops', `Agenturpersonal fliegt mit – das kostet <b>${eur(cov.extraCost)} extra pro Tag</b>. Rechtzeitig fest einstellen.`, 'staff');
  const gap = SM.staffPlanOf(pl).filter((r) => r.have + r.pipe < r.need - 0.5);
  if (gap.length && routes.length) add('gap', 'warn', 'ops', `Personal reicht nicht: es fehlen ${gap.map((r) => `${n0(Math.ceil(r.need - r.have - r.pipe))} ${esc(r.label)}`).join(', ')}.`, 'staff');
  if (pl.staff.morale < 0.55 && SM.sumObj(pl.staff.pil) > 0) add('morale', 'warn', 'ops', `Die Stimmung liegt bei <b>${pct(pl.staff.morale)}</b>. Unter 55 % steigt das Streikrisiko. Vorschlag: Gehalt um etwa <b>${n0(Math.min(15, Math.max(1, Math.ceil((0.62 - pl.staff.morale) / 1.6 * 100))))} %</b> anheben – die Stimmung zieht dann über einige Wochen nach.`, 'staff');
  for (const r of routes) if (r.partial && r.opened_day <= W.day) { const k = SM.kOf(r.type_id, pl.rotH(r)) || 1; add('part' + r.id, 'warn', 'net', `<b>${r.base}–${r.dest}</b> fliegt nur an ${pct(r.partial)} der Tage: Ein Umlauf dauert ${n1(pl.rotH(r))} h. Für täglichen Betrieb braucht es ${k} Flugzeuge.`, null, { route: r.id }); break; }
  if (pl.lineCut) add('linecut', 'crit', 'fin', 'Die Bank hat Ihre <b>Kreditlinie gekürzt</b>. Der Überhang wird vom Konto eingezogen.', 'credit');
  if (pl.staff && pl.staff.pay < wageNow() - 0.01) add('wage', 'warn', 'ops', `Ihr Gehalt liegt <b>${pct(1 - pl.staff.pay / wageNow())} unter dem Marktlohn</b> – die Konkurrenz wirbt ab, die Stimmung sinkt. Vorschlag: Gehalt um <b>${n0(Math.ceil((wageNow() / pl.staff.pay - 1) * 100))} %</b> anheben.`, 'staff');
  { const att = pl.events.filter((e) => e.kind === 'crit' && /greift Ihre Strecke/.test(e.msg) && e.day >= W.day - 21).pop(); if (att) { const m = /Strecke ([A-Z]{3})[–-]([A-Z]{3})/.exec(att.msg), r = m && routes.find((x) => (x.base === m[1] && x.dest === m[2]) || (x.base === m[2] && x.dest === m[1])); add('att' + att.day, 'crit', 'net', esc(att.msg) + ' Preise und Frequenz prüfen.', r ? null : 'routes', r ? { route: r.id } : {}); } }
  { const lot = (W.auctions || []).find((a) => !a.done && pl.fleet.some((x) => P.AIRCRAFT_TYPES[x.type_id].group === P.AIRCRAFT_TYPES[a.type].group) && a.bids[pl.id] === undefined); if (lot) add('lot' + lot.id, 'info', 'strat', `Auktion: ${lot.n} frühe Lieferpositionen für ${tl(lot.type)} bis ${dateShort(lot.closes)}.`, 'fleetBuy'); }
  if (routes.length >= 4 && !SM.acadAll(pl).some((x) => x.lv) && W.macro.laborTight > 1.25) add('acad', 'info', 'ops', 'Der Arbeitsmarkt ist angespannt. Eine geförderte <b>Flugschule</b> liefert eigenen Nachwuchs, der schwerer abzuwerben ist.', 'staff');
  const miss = unplacedNow();
  if (miss.length) add('unpl', 'warn', 'ops', `Ohne Flugzeug: ${miss.map(([r, k]) => `${r.base}–${r.dest} (${k}×)`).join(', ')}. Diese Flüge fallen aus.`, 'fleetPlan');
  for (const a of pl.fleet) {
    if (a.delivery_day <= W.day && !a.cg && !(a.used_hours > 0) && !(a.acmi && a.acmi.start <= W.day && a.acmi.end > W.day) && a.status !== 'ccheck' && a.status !== 'aog') { if (acMode(a) === 'charter') add('idle' + a.id, 'warn', 'ops', `<b>${acName(a.id)}</b> ist im Charter-Pool, hat heute aber keinen Auftrag – kostet ${eur(acDayCost(a))} pro Tag. ${W.acmiOffers.filter((o) => acmiFits(a, o)).length} passende Anfragen.`, 'fleetAcmi'); else add('idle' + a.id, 'warn', 'ops', `<b>${acName(a.id)}</b> (${tl(a.type_id)}) steht ungenutzt und kostet ${eur(acDayCost(a))} pro Tag.`, 'fleetOwn'); break; }
  }
  for (const a of pl.fleet) {
    const toC = P.CCHECK_FH - (a.fh - a.lastC);
    if (a.delivery_day <= W.day && toC < 120 && a.status !== 'ccheck') { add('cc' + a.id, 'info', 'ops', toC > 0 ? `C-Check für <b>${acName(a.id)}</b> in ${n0(toC)} Flugstunden – dann fehlt das Flugzeug einige Tage.` : `C-Check für <b>${acName(a.id)}</b> ist fällig und beginnt, sobald das andere Flugzeug gleichen Musters aus der Werft zurück ist.`, 'fleetOwn'); break; }
  }
  for (const a of pl.fleet) if (a.delivery_day > W.day && a.delivery_day - W.day <= 4 && !(a.assigned || []).length && !routes.some((r) => r.type_id === a.type_id && r.base === a.base)) { add('dlv' + a.id, 'info', 'net', `${tl(a.type_id)} kommt am ${dateShort(a.delivery_day)} – es gibt noch keine Strecke dafür.`, 'plan'); break; }
  let worst = null, spill = null, empty = null, cheap = null;
  for (const r of routes) {
    const s30 = rstats(r, 30), s7 = rstats(r, 7);
    if (s30.n >= 14 && s30.db1 < 0 && (!worst || s30.db1 < worst.s.db1)) worst = { r, s: s30 };
    if (s7.n >= 5 && s7.lf >= 0.95 && (!spill || s7.lf > spill.s.lf)) spill = { r, s: s7 };
    if (s30.n >= 14 && s30.lf < 0.55 && (!empty || s30.lf < empty.s.lf)) empty = { r, s: s30 };
    const c = W.competitorOffers(W.playerId, r.base, r.dest).filter((o) => o.fare < r.fare_out * 0.85).sort((a, b) => a.fare - b.fare)[0];
    if (c && !cheap) cheap = { r, c };
  }
  if (worst) add('loss' + worst.r.id, 'warn', 'fin', `<b>${worst.r.base}–${worst.r.dest}</b> deckt nicht einmal die direkten Kosten (${eur(worst.s.db1 / worst.s.n, { plus: true })} pro Tag). Schließen spart rund <b>${eur(-worst.s.db1 / worst.s.n * 30)} im Monat</b>${worst.r.freq > 1 && !(worst.r.wk < 7) ? `; oder erst die Frequenz senken: ${worst.r.freq}× → ${Math.max(1, Math.floor(worst.r.freq / 2))}× täglich` : ''}.`, null, { route: worst.r.id });
  if (spill) add('spill' + spill.r.id, 'good', 'net', `<b>${spill.r.base}–${spill.r.dest}</b> ist zu ${pct(spill.s.lf)} ausgelastet – fast ausgebucht. Vorschlag: Tarif um 8 % auf <b>${eur(spill.r.fare_out * 1.08)} / ${eur(spill.r.fare_in * 1.08)}</b>${spill.r.freq < 8 && !(spill.r.wk < 7) ? ` oder einen Flug mehr am Tag (${spill.r.freq}× → ${spill.r.freq + 1}×)` : ''}.`, null, { route: spill.r.id });
  if (empty) add('empty' + empty.r.id, 'warn', 'net', `<b>${empty.r.base}–${empty.r.dest}</b> fliegt nur zu ${pct(empty.s.lf)} voll. Vorschlag: ${(() => { const r = empty.r, nf = Math.max(1, Math.round(r.freq * empty.s.lf / 0.75)); return `${nf < r.freq && !(r.wk < 7) ? `Frequenz ${r.freq}× → ${nf}× täglich (Auslastung dann etwa ${pct(Math.min(0.95, empty.s.lf * r.freq / nf))}) oder ` : ''}Tarif um 10 % auf <b>${eur(r.fare_out * 0.9)} / ${eur(r.fare_in * 0.9)}</b> senken; sonst ein kleineres Flugzeug`; })()}.`, null, { route: empty.r.id });
  if (cheap) add('cheap' + cheap.r.id, 'warn', 'strat', `${esc(W.airlines[cheap.c.airline].name)} unterbietet uns auf <b>${cheap.r.base}–${cheap.r.dest}</b> mit ${eur(cheap.c.fare)} – wir verlangen ${eur(cheap.r.fare_out)} (${pct(cheap.c.fare / cheap.r.fare_out - 1)}). Gleichziehen hieße <b>${eur(cheap.c.fare)}</b>; mit besserem Service reichen oft ${eur(Math.max(cheap.c.fare, cheap.r.fare_out * 0.92))}.`, null, { route: cheap.r.id });
  const h = pl.hedge && pl.hedge.until > W.day ? pl.hedge : null;
  if (h && h.until - W.day <= 14) add('hedgeend', 'info', 'fin', `Die Kerosin-Absicherung läuft am <b>${dateShort(h.until)}</b> aus.`, 'supply');
  if (!h && routes.length && W.fuelPrice > W.fuelAvg() * 1.12) add('fuel', 'warn', 'fin', `Kerosin kostet ${pct(W.fuelPrice / W.fuelAvg() - 1)} mehr als im Jahresmittel – und wir sind nicht abgesichert.`, 'supply');
  for (const r of routes) {
    const ban = W.routeBan(pl, r.base, r.dest), hard = W.opsAt(r.base).hard || W.opsAt(r.dest).hard, e = ban || hard;
    if (e && e.end - W.day > 21) { add('geo' + r.id + e.id, 'crit', 'net', `<b>${r.base}–${r.dest}</b> ist bis ${dateShort(e.end)} gesperrt (${esc(e.short || String(e.text || '').split(':')[0])}). Die Flugzeuge stehen – auf eine andere Strecke setzen oder die Strecke ruhen lassen?`, null, { route: r.id }); break; }
  }
  for (const x of crisisList(2)) add('crisis' + x.e.id, x.down ? 'warn' : 'good', 'strat', x.html, null, { crisis: x.e.id });
  { const back = crisisBack(); if (back.length) add('crisisback', 'good', 'net', `Die Krise ist vorbei: ${back.slice(0, 3).map((r) => `${r.base}–${r.dest} ${r.freq}× → ${r.crisis.freq}×`).join(', ')} wieder auf die alte Frequenz?`, null, { restore: true }); }
  for (const o of (pl.offers || []).filter((x) => x.until > W.day).slice(0, 1)) add('offer' + o.id, 'good', 'strat', `<b>Angebot zum Start:</b> ${esc(SM.offerText(pl, o).t)} – noch ${o.until - W.day} Tage. Alle Angebote stehen im Dashboard.`, 'dashboard');
  const crisisIds = new Set(crisisList(9).map((x) => x.e.id));
  const stations = new Set(stationsOf(pl));
  for (const e of W.activeEvents().concat(W.upcomingEvents())) {
    if (crisisIds.has(e.id)) continue;
    if (e.scope === 'all' || ![...stations].some((c) => W.eventAffects(e, c))) continue;
    add('ev' + (e.id || e.text), e.severity === 'crit' ? 'crit' : e.severity === 'good' ? 'good' : 'warn', 'ops', `${e.start > W.day ? `Ab ${dateShort(e.start)}: ` : ''}${esc(e.text)}`, 'world');
    if (out.filter((x) => x.key.startsWith('ev')).length >= 2) break;
  }
  if (routes.length >= 3 && pl.brand < 0.45 && !pl.marketing && !pl.mktPct) add('brand', 'info', 'strat', `Unsere Marke steht bei ${n0(pl.brand * 100)} von 100 – schon 2 % vom Umsatz für Marketing helfen bei der Buchungswahl${(() => { const m = pl.ledger.months[pl.ledger.months.length - 1]; const rev = m ? ((m.acc.rev_ticket || 0) + (m.acc.rev_ancillary || 0)) / 100 : 0; return rev > 0 ? ` – bei uns etwa <b>${eur(rev * 0.02)} im Monat</b>` : ''; })()}.`, 'strategy');
  if (routes.length >= 3 && !pl.cabin && W.day > 20) add('cabin', 'info', 'strat', 'Auf Geschäftsstrecken lohnt meist eine kleine <b>Business-Kabine</b> (10–20 %) – Premium-Konkurrenten haben eine. Unter Karte → Strategie sehen Sie die Prognose für Ihr Netz.', 'strategy');
  if (!pl.logo && !pl.pixLogo && W.day > 3) add('logo', 'info', 'strat', 'Geben Sie Ihrer Airline ein Gesicht: Form, Symbol und Farben für Ihr <b>Logo</b> auswählen.', 'profile');
  if (routes.length && routes.length < 6 && pl.fleet.length) {
    const base = curBase(), d = bestFreeDest(base);
    if (d) add('idea' + d, 'info', 'net', `Noch unbedient ab ${base}: <b>${esc(apName(d))} (${d})</b> hat nach unserer Schätzung viel Potenzial – eine Marktstudie zeigt, ob es stimmt.`, null, { plan: d });
  }
  const order = { crit: 0, warn: 1, good: 2, info: 3 }, focus = asstP() ? asstP().focus : null;
  return out.sort((a, b) => order[a.kind] - order[b.kind] || (b.cat === focus) - (a.cat === focus));
}
function hintBtn(x) {
  if (x.anti) return `${x.antiOk ? `<button class="btn small primary" data-act="antiadj" data-apt="${x.anti}">Vorschlag übernehmen</button> ` : ''}<button class="btn small" data-act="tab" data-tab="stations">Strecken ansehen</button>`;
  if (x.crisis) return crisisBtns(x.crisis);
  if (x.restore) return `<button class="btn small primary" data-act="crisisrestore">Zurücknehmen</button>`;
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
    const seats = s.reduce((x, y) => x + y.so, 0), pax = s.reduce((x, y) => x + y.pax, 0);
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
const fmtUntil = (t) => new Date(t).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
const suspOf = () => (mpState.user && mpState.user.susp && mpState.user.susp.until > Date.now() && !mpState.user.admin ? mpState.user.susp : null);   // 0.21.75: zeitweise gesperrt
const blkOf = (k) => (mpState.user && mpState.user.blk && mpState.user.blk[k] > Date.now() && !mpState.user.admin ? mpState.user.blk[k] : null);   // 0.21.80: Teilsperren (Chat, Handel & Börse)
function doAction(act) {
  if (ui.mp && blkOf('trade') && (SM.FAIR_TRADE_ACTS || []).includes(act.type)) { toast(`Die Luftfahrtaufsicht hat Handel und Börse für Ihr Konto bis ${fmtUntil(blkOf('trade'))} gesperrt.`); return { ok: false, msg: 'Gesperrt.' }; }
  if (ui.mp && suspOf()) { toast(`Die Luftfahrtaufsicht hat Ihren Leitstand bis ${fmtUntil(suspOf().until)} stillgelegt – Sie können zuschauen, aber nicht handeln.`); return { ok: false, msg: 'Gesperrt.' }; }
  if (!W || !W.player) { if (ui.mp) { toast('Der Spielstand wird neu geladen …'); enterGame(ui.mp.id); } return { ok: false, msg: 'Kein Spielstand geladen.' }; }
  const res = SM.applyAction(W, W.playerId, act);
  if (!res.ok) { toast(res.msg || 'Nicht möglich.'); return res; }
  if (ui.mp) mpSendAction(act);
  return res;
}
function refreshAll() { W.operableFreq(W.player); buildSchedules(); renderHeader(); renderTabs(); renderMapRoutes(true); renderPane(true); }
// Auf-/Zuklappen merken, damit es beim Neuzeichnen so bleibt
document.addEventListener('toggle', (e) => { const d = e.target; if (!d || !d.dataset || !d.dataset.keep) return; const k = d.dataset.keep, sl = k.startsWith('sl-'); ui.open = ui.open || {}; ui.open[k] = d.open;
  if (sl) { try { const m = JSON.parse(localStorage.getItem(FOLD_LS) || '{}'); m[k] = d.open; localStorage.setItem(FOLD_LS, JSON.stringify(m)); } catch (err) { /* privat */ } }
  const h = d.querySelector(':scope > summary .fold-hint'); if (h) h.textContent = d.open ? (sl ? 'ausblenden' : 'einklappen') : (sl ? 'einblenden' : 'aufklappen'); }, true);
document.addEventListener('input', (e) => { const t = e.target; if (t && (t.id === 'slot-apt' || t.id === 'slot-n')) { const st = ui.slotForm = ui.slotForm || { apt: '', n: 1 }; if (t.id === 'slot-apt') st.apt = slotAptOf(t.value) || ''; else st.n = Math.max(1, Math.min(8, Math.round(Number(t.value)) || 1)); const box = $('#slot-q'); if (box) box.innerHTML = slotQuoteHtml(st.apt, st.n); return; } });
document.addEventListener('change', (e) => { const t = e.target; if (t && t.id === 'st-fresh' && ui.study) { ui.study.fresh = t.checked; } });
document.addEventListener('change', (e) => { const t = e.target; if (t && t.id === 'pix-file') { pixUpload(t.files && t.files[0]); t.value = ''; } });
document.addEventListener('change', (e) => { const t = e.target; if (!t || !t.id || !t.id.startsWith('acf-') || !ui.acf) return; const k = t.id.slice(4); ui.acf[k] = t.type === 'checkbox' ? t.checked : t.value; if (k === 'ac' || k === 'fit') ui.acf.gap = null; renderPane(true); });
document.addEventListener('input', (e) => { const t = e.target; if (!t || !t.id) return; const fid = t.id.startsWith('dl-cash-') ? t.id.replace('dl-cash-', 'dl-fmt-') : t.dataset && t.dataset.fmt; if (!fid) return; const f = document.getElementById(fid), v = Math.max(0, Math.round(Number(t.value) || 0)); if (f) f.textContent = v ? '= ' + eur(v) : ''; });
function onPaneClick(e) {
  const mb = e.target.closest('[data-mktbase]');
  if (mb) { e.preventDefault(); if (setSelBase(mb.dataset.mktbase)) { renderPane(true); if (ui.aptCard) showAptCard(ui.aptCard); renderMapRoutes(true); } return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.tagName === 'SELECT') return;
  e.preventDefault();
  const act = b.dataset.act, pl = W.player;
  if (collPaneClick(act, b)) return;   // Aircraft Collection
  if (act === 'acfall') { Object.assign(ui.acf, { fit: false, gap: null, fam: '', kind: '', ev: false, ac: '' }); renderPane(true); return; }   // 0.21.76: alle Charteranfragen zeigen
  if (act === 'chbase') { const v = b.dataset.v, h = new Set(ui.chHide || []); if (h.has(v)) h.delete(v); else if (h.size + 1 < W.player.bases.length) h.add(v); else { toast('Mindestens eine Basis bleibt eingeblendet.'); return; } ui.chHide = [...h]; renderPane(true); return; }
  if (act === 'dealcashq') { const i = $(`#dl-cash-${b.dataset.side}`); if (i) { i.value = b.dataset.v; i.dispatchEvent(new Event('input', { bubbles: true })); } return; }
  if (act === 'pltype') { const sel = $('#pl-type'); if (sel) { sel.value = b.dataset.t; sel.dispatchEvent(new Event('change', { bubbles: true })); } return; }
  if (act === 'tour') { startTour(); return; }
  if (act === 'restartvol') { showRestart(true); return; }
  if (act === 'plsort') { ui.plSort = b.dataset.v; renderPane(true); return; }
  if (act === 'finx') { const o = ui.finOpen || (ui.finOpen = {}), k = b.dataset.k, def = b.dataset.d === '1'; o[k] = !(o[k] === undefined ? def : o[k]); renderPane(true); return; }
  if (act === 'finp') { ui.finP = b.dataset.v; renderPane(true); return; }
  if (act === 'pnlx') { const o = ui.pnlOpen || (ui.pnlOpen = {}); o[b.dataset.k] = !o[b.dataset.k]; renderPane(true); return; }
  if (act === 'pnlall') { const o = ui.pnlAll || (ui.pnlAll = {}); o[b.dataset.k] = true; renderPane(true); return; }
  if (act === 'plall') { ui.plAll = true; renderPane(); return; }
  if (act === 'plroutes') { ui.plOpen = ui.plOpen || {}; ui.plOpen[b.dataset.al] = !ui.plOpen[b.dataset.al]; renderPane(true); return; }
  if (act === 'chatto') { chat.to = b.dataset.al; toggleChat(true); return; }
  if (/^st(kind|tier|order|plan|ac|base|basecheck|cfo|basetog|baseall)$/.test(act) && onStudyClick(act, b)) return;
  if (act.startsWith('cfo') && onCfoClick(act, b)) return;
  if (act.startsWith('h') && onHistClick(act, b)) return;
  if (onStrategyClick(act, b)) return;
  if (act === 'aplf') { doAction({ type: 'autoPrice', id: b.dataset.id, on: true, lf: Number(b.dataset.v) }); refreshAll(); return; }
  if (act === 'evcancel') {
    if (!ui.mp || !ui.mp.manage) return;
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Wirklich annullieren?'; b.classList.add('danger'); return; }
    b.disabled = true;
    api(`/games/${ui.mp.id}/admin`, { body: { cmd: 'cancelEvent', eventId: b.dataset.id } }).then((r) => { toast(r.msg || 'Ereignis annulliert.'); return mpPoll(true); }).then(() => refreshAll()).catch((err) => { toast(err.message); refreshAll(); });
    return;
  }
  if (act === 'admopen') { if (ui.mp && ui.mp.manage) showAdmin(ui.mp.id, () => { $('#modal').hidden = true; refreshAll(); }); return; }
  if (act === 'apset') { const k = b.dataset.k, v = Number(b.dataset.v), id = b.dataset.id || undefined, a = { type: 'autoPrice', id, on: true, keep: !id }; if (k === 'lf') a.lf = v; else a.cfg = { [k]: v }; doAction(a); refreshAll(); return; }
  if (act === 'apstd') { const pl = W.player; doAction({ type: 'autoPrice', id: b.dataset.id, on: true, lf: pl.apDefault || pl.apLf || 0.85, cfg: SM.apCfgOf(null, pl.apCfg) }); toast('Standard übernommen.'); refreshAll(); return; }
  if (act === 'pmset') { doAction({ type: 'premPrice', id: b.dataset.id, v: Number(b.dataset.v) }); refreshAll(); return; }
  if (act === 'apall') { const on = b.dataset.on === '1', r = doAction({ type: 'autoPrice', on, lf: Number(b.dataset.v || 0.85), reset: on }); if (r.ok) toast(on ? `Preisautomatik für ${r.n} Strecken an (Ziel ${pct(Number(b.dataset.v || 0.85))}).` : 'Preisautomatik überall aus.'); refreshAll(); return; }
  if (act === 'fltdir') { const k = b.dataset.k || 'routes', F = fltState(k); F.dir = sortDir(k, F) === 'asc' ? 'desc' : 'asc'; renderPane(true); return; }
  if (act === 'fltclear') { if (ui.flts) delete ui.flts[b.dataset.k || 'routes']; renderPane(true); return; }
  if (act.startsWith('mkt') && onMarketClick(act, b)) return;
  if (act.startsWith('deal') && onDealClick(act, b)) return;
  if ((act.startsWith('asg') || act.startsWith('fp') || act === 'retype') && onAssignClick(act, b)) return;
  if ((act.startsWith('lg') || act.startsWith('pix')) && onLogoClick(act, b)) return;
  if (onHardClick(act, b)) return;
  if (onCapClick(act, b)) return;
  if (onRescueClick(act, b)) return;
  switch (act) {
    case 'tab': setTab(b.dataset.tab); break;
    case 'hubsel': ui.hubSel = b.dataset.apt; renderPane(true); break;
    case 'cgedit': { const q = W.player.cgRoutes().find((x) => x.id === b.dataset.id); ui.cgEdit = ui.cgEdit && ui.cgEdit.id === b.dataset.id ? null : q ? { id: q.id, freq: q.freq, rate: q.rate || 1 } : null; ui.confirm = null; renderPane(true); break; }
    case 'cgefreq': if (ui.cgEdit) { ui.cgEdit.freq = Math.max(1, Math.min(P.FREIGHT.maxWeek, ui.cgEdit.freq + Number(b.dataset.v))); renderPane(true); } break;
    case 'cgerate': if (ui.cgEdit) { ui.cgEdit.rate = Number(b.dataset.v); renderPane(true); } break;
    case 'cgsave': { const e = ui.cgEdit; if (!e) break; const r = doAction({ type: 'cgEdit', id: e.id, freq: e.freq, rate: e.rate }); if (r.ok) { toast(r.msg); ui.cgEdit = null; } refreshAll(); break; }
    case 'cgaskclose': ui.confirm = 'cgclose:' + b.dataset.id; renderPane(true); break;
    case 'cgclose': { const r = doAction({ type: 'cgClose', id: b.dataset.id }); if (r.ok) toast(r.msg); ui.confirm = null; ui.cgEdit = null; refreshAll(); break; }
    case 'setcolor': { const r = doAction({ type: 'setColor', color: Number(b.dataset.v) }); toast(r.msg); planeCv.col = null; ui.planesNow = true; renderMapRoutes(true); refreshAll(); break; }
    case 'cgplan': { const r = doAction({ type: 'cgPlanAdd', base: b.dataset.b, dest: b.dataset.v, typeId: b.dataset.t, freq: Number(b.dataset.f), rate: (ui.cgNew && ui.cgNew.rate) || 1 }); toast(r.msg); refreshAll(); break; }
    case 'cgplandel': { const r = doAction({ type: 'cgPlanDel', id: b.dataset.id }); if (!r.ok) toast(r.msg); refreshAll(); break; }
    case 'cgpfreq': { const x = ((W.player.cg && W.player.cg.plans) || []).find((y) => y.id === b.dataset.id); if (x) { doAction({ type: 'cgPlanEdit', id: x.id, freq: x.freq + Number(b.dataset.v) }); refreshAll(); } break; }
    case 'cgbuy': ui.buySeg = 'cargo'; setTab('fleetBuy'); break;
    case 'cgsug': ui.cgSugFor = ui.cgSugFor === b.dataset.id ? null : b.dataset.id; renderPane(true); break;
    case 'cgsugopen': { const a = W.player.fleet.find((x) => x.id === b.dataset.id); if (!a) break;
      if (a.base !== b.dataset.b) { const mv = doAction({ type: 'move', acId: a.id, base: b.dataset.b }); if (!mv.ok) { toast(mv.msg || 'Verlegen nicht möglich.'); break; } }
      const r = doAction({ type: 'cgOpen', base: b.dataset.b, dest: b.dataset.v, typeId: b.dataset.t, freq: Number(b.dataset.f), rate: 1 }); if (r.ok) { toast(`${acName(a.id)} nach ${b.dataset.b} verlegt – ${r.msg}`); ui.cgSugFor = null; setTab('cargo'); } refreshAll(); break; }
    case 'cgfind': ui.cgNew = { ...(ui.cgNew || { rate: 1 }), base: b.dataset.b, type: b.dataset.t }; setTab('cargoNew'); break;
    case 'cgnbase': ui.cgNew = { ...(ui.cgNew || {}), base: b.dataset.v, type: null }; renderPane(true); break;
    case 'cgntype': ui.cgNew = { ...(ui.cgNew || {}), type: b.dataset.v }; renderPane(true); break;
    case 'cgnrate': if (ui.cgNew) { ui.cgNew.rate = Number(b.dataset.v); renderPane(true); } break;
    case 'cgopen': { const F = ui.cgNew || { rate: 1 }; const r = doAction({ type: 'cgOpen', base: b.dataset.b, dest: b.dataset.v, typeId: b.dataset.t, freq: Number(b.dataset.f), rate: F.rate || 1 }); if (r.ok) { toast(r.msg); setTab('cargo'); } refreshAll(); break; }
    case 'antiadj': { const r = doAction({ type: 'antitrustAdjust', apt: b.dataset.apt }); toast(r.msg); refreshAll(); renderSidebar(); break; }
    case 'crisisadj': { const r = doAction({ type: 'crisisAdjust', event: b.dataset.ev }); if (r.ok) toast(r.msg); refreshAll(); renderSidebar(); break; }
    case 'crisisno': { doAction({ type: 'crisisSkip', event: b.dataset.ev }); refreshAll(); renderSidebar(); break; }
    case 'crisisrestore': { const r = doAction({ type: 'crisisRestore' }); if (r.ok) toast(r.msg); refreshAll(); renderSidebar(); break; }
    case 'offertake': case 'offerdrop': { const r = doAction({ type: act === 'offertake' ? 'takeOffer' : 'dropOffer', id: b.dataset.id }); if (r.ok) toast(r.msg); refreshAll(); renderSidebar(); break; }
    case 'goroute': ui.expanded = b.dataset.id; setTab('routes'); break;
    case 'invite': showInvite(); break;
    case 'rebase': showRebase(); break;
    case 'openchat': toggleChat(true); break;
    case 'guide': showGuide(); break;
    case 'pickassistant': showAssistantPick(); break;
    case 'setassistant': if (setAssistant(b.dataset.id)) { refreshAll(); sayHello(); } break;
    case 'selac': ui.sel = { ac: b.dataset.ac }; renderPlanes.last = 0; renderPlaneCard(); break;
    case 'rivflt': ui.rivFilter = b.dataset.v; renderPane(true); break;
    case 'showall': ui.showAll = { ...(ui.showAll || {}), [b.dataset.k]: true }; renderPane(true); break;
    case 'rivals': { if (doAction({ type: 'setRivals', key: b.dataset.v }).ok) toast(`Konkurrenz: ${SM.RIVALS[b.dataset.v].label}`); refreshAll(); break; }
    case 'justacqclose': ui.justAcq = null; renderPane(true); break;
    case 'planwith': { const ja = ui.justAcq || {}; ui.planner = defaultPlanner(null, ja.base); if (ja.type) { ui.planner.type = ja.type; if (!SM.rangeOk(ui.planner.base, ui.planner.dest, ja.type)) ui.planner.dest = bestFreeDest(ui.planner.base); } ui.justAcq = null; ui.selApt = ui.planner.dest; setTab('plan'); renderMapRoutes(true); break; }
    case 'plan': ui.planner = defaultPlanner(ui.selApt && !pl.bases.includes(ui.selApt) ? ui.selApt : null); ui.selApt = ui.planner.dest; setTab('plan'); renderMapRoutes(true); break;
    case 'planfrom': ui.planner = defaultPlanner(b.dataset.apt, b.dataset.base && W.player.bases.includes(b.dataset.base) ? b.dataset.base : null); ui.selApt = ui.planner.dest; setTab('plan'); renderMapRoutes(true); break;
    case 'closeplan': ui.planner = null; ui.selApt = null; setTab('routes'); renderMapRoutes(true); break;
    case 'suggest': suggestPrice(); break;
    case 'plrole': readPlanner(); if (ui.planner) { ui.planner.role = b.dataset.v; renderPane(true); } break;
    case 'plpick': { const base = ui.planner ? ui.planner.base : W.player.bases[0]; ui.planner = { ...defaultPlanner(b.dataset.d, base), type: b.dataset.t }; ui.selApt = b.dataset.d; renderPane(true); break; }
    case 'plstudy': { const bb = b.dataset.base || (ui.planner ? ui.planner.base : W.player.bases[0]); ui.study = { kind: 'routes', tier: 'small', ft: '', fv: '', bases: [bb], knownBases: W.player.bases.slice() }; setTab('studies'); toast(`Streckenanalyse ab ${bb} vorbereitet – Paket wählen und beauftragen.`); break; }
    case 'openroute-new': openNewRoute(); break;
    case 'plansave': { readPlanner(); const p = ui.planner; const miss = !(slotsMine(p.base) >= p.freq && slotsMine(p.dest) >= p.freq); const r = doAction({ type: 'savePlan', base: p.base, dest: p.dest, typeId: p.type, freq: p.freq, fo: p.fo, fi: p.fi, service: p.service, buffer: p.buffer, term: p.term, auto: miss });
      if (r.ok) toast(`${p.base}–${p.dest} gespeichert (Strecken → Pläne)${r.waits && r.waits.length ? ' · Warteliste ' + r.waits.join(', ') + ' · Vergabe ' + slotDateTxt() : ''}.`); refreshAll(); break; }
    case 'planfreq': { const r = doAction({ type: 'savePlan', route: b.dataset.id, freq: Number(b.dataset.v), auto: true }); if (r.ok) toast(`Geplant: ${b.dataset.v}x täglich${r.waits && r.waits.length ? ' · Warteliste ' + r.waits.join(', ') : ''}.`); refreshAll(); break; }
    case 'planrun': { const r = doAction({ type: 'runPlan', id: b.dataset.id }); if (r.ok) toast('Plan umgesetzt.'); refreshAll(); break; }
    case 'plandel': doAction({ type: 'deletePlan', id: b.dataset.id }); toast('Plan gelöscht, Warteliste ausgetragen.'); refreshAll(); break;
    case 'planedit': { const x = (pl.plans || []).find((y) => y.id === b.dataset.id); if (!x) break; ui.planner = { ...defaultPlanner(x.dest, x.base), type: x.type, freq: x.freq, fo: x.fo, fi: x.fi, service: x.service, buffer: x.buffer }; ui.selApt = x.dest; setTab('plan'); break; }
    case 'planwait': { const x = (pl.plans || []).find((y) => y.id === b.dataset.id); if (!x) break; const miss = W.planMissing(pl, x) || {}; for (const [a, n] of Object.entries(miss)) doAction({ type: 'slotWait', apt: a, n, plan: x.id }); toast('Auf der Warteliste – Vergabe ' + slotDateTxt() + '.'); refreshAll(); break; }
    case 'planauto': doAction({ type: 'planAuto', id: b.dataset.id, on: b.dataset.on === '1' }); refreshAll(); break;
    case 'quicklease': { const t = b.dataset.type; const res = doAction({ type: 'acquire', typeId: t, mode: 'lease', base: b.dataset.base }); if (res.ok) toast(`${tl(t)} geleast. Lieferung in ${P.LEASE_DELIVERY_DAYS} Tagen.`); renderHeader(); updateForecast(); break; }
    case 'toggle': ui.expanded = ui.expanded === b.dataset.id ? null : b.dataset.id; ui.confirm = null; ui.viewDirty = true; renderPane(true); renderMapRoutes(true); break;
    case 'openroute': ui.expanded = b.dataset.id; setTab('routes'); renderMapRoutes(true); break;
    case 'applyroute': applyRoute(b.dataset.id); break;
    case 'askclose': ui.confirm = 'close:' + b.dataset.id; renderPane(true); break;
    case 'askma': ui.confirm = 'ma:' + b.dataset.id; renderPane(true); break;
    case 'takeover': { const r = doAction({ type: 'takeover', target: b.dataset.id }); ui.confirm = null; if (r.ok) toast(`Übernahme abgeschlossen: ${r.fleet} Flugzeuge, ${r.routes} Strecken, ${r.staff} Beschäftigte.`); refreshAll(); renderMapRoutes(true); break; }
    case 'closeroute': { const r = pl.routes.find((x) => x.id === b.dataset.id); if (r && doAction({ type: 'closeRoute', id: r.id }).ok) { ui.expanded = null; ui.confirm = null; refreshAll(); toast(`${r.base}–${r.dest} eingestellt.`); } break; }
    case 'cancelconfirm': ui.confirm = null; renderPane(true); break;
    case 'autoresume': { const r = doAction({ type: 'resume' }); if (r.ok) { toast('Sie steuern wieder selbst.'); refreshAll(); } break; }
    case 'acquire': {
      const t = b.dataset.type, mode = b.dataset.mode;
      const base = pl.bases.includes(ui.acqBase) ? ui.acqBase : pl.bases[0];
      const res = doAction({ type: 'acquire', typeId: t, mode, offerId: b.dataset.offer || null, base });
      if (res.ok) { toast(`${tl(t)} ${mode === 'buy' ? 'gekauft' : mode === 'factory' ? 'ab Werk bestellt' : mode === 'flex' ? 'per Flex-Leasing' : 'geleast'}. Lieferung am ${dateShort(res.delivery)} nach ${res.base}.`); ui.justAcq = { type: (W.player.fleet.at(-1) || {}).type_id || t, base: res.base || base, day: W.day }; }
      refreshAll(); break;
    }
    case 'askdispose': ui.confirm = 'dispose:' + b.dataset.id; renderPane(true); break;
    case 'asklbuy': ui.confirm = 'lbuy:' + b.dataset.id; renderPane(true); break;
    case 'leasebuy': { const r = doAction({ type: 'leaseBuy', acId: b.dataset.id }); if (r.ok) { ui.confirm = null; toast(`Übernommen für ${eur(r.price)}${r.fee ? ` plus ${eur(r.fee)} Ablöse` : ''} – keine Leasingrate mehr.`); } refreshAll(); break; }
    case 'dispose': { if (doAction({ type: 'dispose', acId: b.dataset.id }).ok) { ui.confirm = null; toast('Flugzeug abgegeben.'); } refreshAll(); break; }
    case 'acmi': { const sel = $(`#acmi-${b.dataset.id}`), acId = b.dataset.ac || (sel && sel.value); if (doAction({ type: 'acmi', offerId: b.dataset.id, acId }).ok) toast(`Charter vereinbart – ${acName(acId)} steht im Kalender.`); refreshAll(); break; }
    case 'acmipool': { const on = b.dataset.on === '1', id = on ? ($('#acmi-pooladd') || {}).value : b.dataset.id; if (!id) break; const r = doAction({ type: 'assignAircraft', acId: id, mode: on ? 'charter' : 'auto', pins: [] }); if (r.ok) toast(on ? `${acName(id)} ist im Charter-Pool.` : `${acName(id)} fliegt wieder im Netz.`); refreshAll(); break; }
    case 'auditsettle': { const res = doAction({ type: 'auditSettle', partner: b.dataset.id }); if (res.ok) toast(`Zurückgezahlt${res.state ? ' an die Staatskasse' : ''}: ${eur(res.amount)} – kein Bußgeld.`); refreshAll(); break; }
    case 'buyseg': ui.buySeg = b.dataset.v || ''; renderPane(true); break;
    case 'acmirange': ui.acf.range = Number(b.dataset.v) || 120; renderPane(true); break;
    case 'acmigap': ui.acf.gap = b.dataset.clear ? null : { ac: b.dataset.ac, from: Number(b.dataset.from), to: Number(b.dataset.to) }; renderPane(true); if (ui.acf.gap) { const h = [...document.querySelectorAll('#pane h3.sec')].find((x) => /Anfragen/.test(x.textContent)); if (h) h.scrollIntoView({ block: 'start', behavior: 'smooth' }); } break;
    case 'selapt': selectAirport(b.dataset.apt); break;
    case 'marketall': ui.marketAll = !ui.marketAll; renderPane(true); break;
    case 'chall': ui.chAll = !ui.chAll; renderPane(true); break;
    case 'hire': case 'fire': {
      const n = Math.floor(Number($(`#hire-${b.dataset.key}`).value));
      const res = doAction({ type: act, role: b.dataset.role, group: b.dataset.group || null, count: n, start: act === 'hire' && ui.hireStart ? ui.hireStart : null });
      if (res.ok) toast(act === 'hire' ? `Eingestellt, Start ${res.sched ? `zum Termin am ${dateShort(res.ready)}` : `in ${res.lead} Tagen`}. Kosten ${eur(res.cost)}.` : `Entlassen. Abfindung ${eur(res.cost)}.`); refreshAll(); break;
    }
    case 'fillstaff': { const res = doAction({ type: 'fillStaff', start: ui.tab === 'staff' && ui.hireStart ? ui.hireStart : null }); if (res.ok) toast(res.msg + (ui.tab === 'staff' && ui.hireStart && res.n ? ` Antritt am ${dateShort(ui.hireStart)}.` : '')); refreshAll(); break; }
    case 'train': { if (doAction({ type: 'train', from: $('#tr-from').value, to: $('#tr-to').value, count: Math.floor(Number($('#tr-n').value)) }).ok) toast('Umschulung gestartet.'); refreshAll(); break; }
    case 'pay': doAction({ type: 'pay', v: Number(b.dataset.v) }); refreshAll(); break;
    case 'hireexpert': { const rh = doAction({ type: 'hireExpert', cid: b.dataset.id }); if (rh.ok) toast('Eingestellt. Nach rund 30 Tagen Einarbeitung wirkt die Person voll – wie gut, zeigt die Bewertung ab dem Monatswechsel.'); refreshAll(); break; }
    case 'fireexpert': if (doAction({ type: 'fireExpert', id: b.dataset.id }).ok) toast('Freigestellt. Die Person sucht jetzt neu – mit Ihrer Bewertung als Referenz.'); refreshAll(); break;
    case 'exc': { const r = doAction({ type: 'expertContract', id: b.dataset.id, kind: b.dataset.k, v: Number(b.dataset.v || 0) }); if (r.ok) toast(b.dataset.k === 'bind' ? 'Halteprämie gezahlt: zwölf Monate gebunden.' : 'Gehalt erhöht.'); refreshAll(); break; }
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
    case 'repayac': { const r = doAction({ type: 'repayAc', id: b.dataset.id || undefined }); if (r.ok) toast(r.msg); refreshAll(); break; }
    case 'repay': { const r = doAction({ type: 'repay', id: b.dataset.id }); if (r.ok) toast(r.fromCredit > 0 ? `Kredit abgelöst – ${eur(r.fromCredit)} vorübergehend aus dem Dispo.` : 'Kredit abgelöst.'); refreshAll(); break; }
    case 'decide': doAction({ type: 'decide', id: b.dataset.id, choice: b.dataset.choice }); refreshAll(); break;
    default: break;
  }
}
function bestFreeDest(base) {
  const pl = W.player, mine = new Set(pl.activeRoutes().map((r) => SM.pairKey(r.base, r.dest)));
  return SM.AP_CODES.filter((d) => d !== base && SM.routeKmOk(base, d) && SM.gcDistanceKm(base, d) < 6000 && !mine.has(SM.pairKey(base, d))).sort((a, b) => {
    return W.knownPot(pl, base, b).sum - W.knownPot(pl, base, a).sum;
  })[0];
}
let fcTimer = null;
// ---------------------------------------------------------------------------
// Marktstudien (Beratungsaufträge) – Auftrag, Status, Berichte
// ---------------------------------------------------------------------------
const STK = () => SM.P.STUDIES;
/** Basen, ab denen die Studie sucht (Standard: alle). */
function stBases() { const pl = W.player, f = ui.study; if (!f.bases) f.bases = pl.bases.slice(); f.bases = f.bases.filter((b) => pl.bases.includes(b)); if (!f.bases.length) f.bases = pl.bases.slice(); for (const b of pl.bases) if (f.knownBases && !f.knownBases.includes(b) && !f.bases.includes(b)) f.bases.push(b); f.knownBases = pl.bases.slice(); return f.bases; }
const focusOpts = (t, v) => {
  if (t === 'region') return SM.REGION_ORDER.map((r) => `<option value="${r}" ${r === v ? 'selected' : ''}>${r}</option>`).join('');
  if (t === 'country') return SM.COUNTRIES.slice().sort((a, b) => (SM.COUNTRY_LABEL[a] || a).localeCompare(SM.COUNTRY_LABEL[b] || b)).map((c) => `<option value="${c}" ${c === v ? 'selected' : ''}>${esc(SM.COUNTRY_LABEL[c] || c)}</option>`).join('');
  if (t === 'apt') return SM.AP_CODES.slice().sort((a, b) => apName(a).localeCompare(apName(b))).map((c) => `<option value="${c}" ${c === v ? 'selected' : ''}>${esc(apName(c))} (${c})</option>`).join('');
  return '';
};
function studyForm() {
  const S = STK(), pl = W.player, f = ui.study = ui.study || { kind: 'routes', tier: 'extended', ft: '', fv: '' };
  if (f.ft && !f.fv) f.fv = f.ft === 'region' ? (P.AIRPORTS[pl.bases[0]].region) : f.ft === 'country' ? P.AIRPORTS[pl.bases[0]].country : pl.bases[0];
  const price = W.studyPrice(pl, f.tier), free = pl.spendable(W.macro.bank ?? 1), running = (pl.reports || []).filter((r) => r.status === 'running').length;
  const T = S.tiers[f.tier], lv = pl.skill('analyst');
  const scope = { small: 'schnell, wenige Kandidaten, grobe Empfehlung', extended: 'mehrere Optionen, drei Tarifstufen', full: 'tiefgehend, alle Kandidaten, vier Tarifstufen, misst Nachfragetrends' };
  return `<div class="card pad stack"><div class="spread"><b>Neue Studie beauftragen</b><span class="small muted">${running}/${S.maxRunning} laufen</span></div>
    <div class="stack" style="gap:6px"><span class="small muted">Art der Studie</span><div class="opts st-opts">${Object.entries(S.kinds).map(([k, x]) => `<button data-act="stkind" data-v="${k}" aria-pressed="${f.kind === k}"><b>${esc(x.label)}</b><span>${esc(x.desc)}</span></button>`).join('')}</div></div>
    <div class="stack" style="gap:6px"><span class="small muted">Paket</span><div class="opts st-opts st-tiers">${Object.entries(S.tiers).map(([k, x]) => { const pr = W.studyPrice(pl, k); return `<button data-act="sttier" data-v="${k}" aria-pressed="${f.tier === k}"><b>${esc(x.label)}</b><span class="mono">${eur(pr.cost)} · ${pr.days} Tage</span><span>${scope[k]} · ${x.top} Vorschläge</span></button>`; }).join('')}</div></div>
    ${(f.kind === 'routes' || f.kind === 'fleet') ? (() => { const sel = stBases(); return `<div class="stack" style="gap:6px"><span class="small muted">Ab welchen Basen? <span class="ink2">(antippen zum Ein- und Ausblenden)</span></span><div class="row" style="gap:6px;flex-wrap:wrap">${pl.bases.map((b) => `<button class="chip-t" data-act="stbasetog" data-v="${b}" aria-pressed="${sel.includes(b)}"><b class="mono">${b}</b> ${esc(apName(b))}</button>`).join('')}${pl.bases.length > 1 ? `<button class="btn small ghost" data-act="stbaseall">${sel.length === pl.bases.length ? 'nur erste' : 'alle'}</button>` : ''}</div></div>`; })() : ''}
    ${(() => { const prevN = (pl.reports || []).filter((r) => r.kind === f.kind && r.status === 'done' && (r.ready ?? 0) > W.day - 365).length; return prevN ? `<label class="chk small"><input type="checkbox" id="st-fresh" ${f.fresh !== false ? 'checked' : ''}> Nur neue Vorschläge: Ergebnisse aus ${prevN === 1 ? 'der früheren Studie' : `${prevN} früheren Studien`} dieser Art auslassen</label>` : ''; })()}
    <div class="row" style="gap:8px"><label class="f" style="flex:1;min-width:150px"><span>Schwerpunkt</span><select id="st-ft"><option value="">weltweit / ab allen Basen</option><option value="region" ${f.ft === 'region' ? 'selected' : ''}>Region</option><option value="country" ${f.ft === 'country' ? 'selected' : ''}>Land</option><option value="apt" ${f.ft === 'apt' ? 'selected' : ''}>Flughafen</option></select></label>
      ${f.ft ? `<label class="f" style="flex:2;min-width:180px"><span>${f.ft === 'region' ? 'Region' : f.ft === 'country' ? 'Land' : 'Flughafen'}</span><select id="st-fv">${focusOpts(f.ft, f.fv)}</select></label>` : ''}</div>
    <p class="small muted">${f.kind === 'routes' ? 'Mit Flughafen als Schwerpunkt: ist es eine Ihrer Basen, werden Ziele ab dort gesucht, sonst Verbindungen von Ihren Basen dorthin.' : f.kind === 'base' ? 'Der Schwerpunkt grenzt die möglichen Standorte ein, etwa „Australien“ oder „Ozeanien“.' : f.kind === 'gaps' ? 'Der Schwerpunkt grenzt die untersuchten Märkte ein.' : 'Der Schwerpunkt grenzt die neuen Kandidaten-Strecken ein; Ihre eigenen Strecken sind immer dabei.'}${lv ? ` Ihre Marktanalyse (Stufe ${lv}) senkt Preis und Dauer.` : ''}</p>
    <div class="spread"><span class="small">${esc(T.label)}: <b>${eur(price.cost)}</b> · Bericht am <b>${dateShort(W.day + price.days)}</b> · danach auf dem Konto ${eur(netCash(pl) - price.cost)}${pl.creditLimit(W.macro.bank ?? 1) - (pl.creditUsed || 0) > 1000 ? ` <span class="muted">(mit Dispo noch ${eur(free - price.cost)} verfügbar)</span>` : ''}</span>
      <button class="btn primary" data-act="storder" ${free < price.cost || running >= S.maxRunning ? 'disabled' : ''}>Studie beauftragen · ${eurB(price.cost)}</button></div>
    ${free < price.cost ? '<div class="callout warn">Für diese Studie reicht die Liquidität nicht – ein kleineres Paket wählen oder später beauftragen.</div>' : ''}</div>`;
}
const growthChip = (g) => `<span class="chip ${g === 'hoch' ? 'good' : g === 'mittel' ? 'warn' : ''}">Wachstumspotenzial ${g || '–'}</span>`;
const sg0 = (x) => `<span class="${x < 0 ? 'neg' : x > 0 ? 'pos' : ''}">${eur(x, { plus: true })}</span>`;
function studyRec(rep) {
  const r = rep.res.rec; if (!r) return '';
  const a = r.act; let btns = '';
  if (a && a.t === 'route') btns = `<button class="btn small primary" data-act="stplan" data-o="${a.o}" data-d="${a.d}" data-type="${a.type}" data-fare="${a.fare}">Strecke planen</button><button class="btn small" data-act="stcfo" data-k="route" data-o="${a.o}" data-d="${a.d}" data-type="${a.type}" data-fare="${a.fare}">CFO fragen</button>`;
  else if (a && a.t === 'aircraft') btns = `<button class="btn small primary" data-act="stac" data-type="${a.type}">Zur Beschaffung</button><button class="btn small" data-act="stcfo" data-k="aircraft" data-type="${a.type}">CFO fragen</button>`;
  else if (a && a.t === 'base') btns = `<button class="btn small primary" data-act="stbase" data-apt="${a.apt}">Basis eröffnen …</button><button class="btn small" data-act="stcfo" data-k="base" data-apt="${a.apt}" data-net="${a.net}">CFO fragen</button>`;
  else if (a && a.t === 'basecheck') btns = `<button class="btn small" data-act="stbasecheck" data-apt="${a.apt}">Basisanalyse für ${esc(P.AIRPORTS[a.apt].country)} vorbereiten</button>`;
  return `<div class="callout good stack" style="gap:6px"><b>Empfehlung</b><span>${esc(r.text)}</span><span class="small ink2">${esc(r.why || '')}</span>${btns ? `<div class="row" style="gap:6px">${btns}</div>` : ''}</div>`;
}
function studyBody(rep) {
  const R = rep.res, k = rep.kind; let h = '';
  if (k === 'routes') {
    h += `<div class="tw"><table class="t"><thead><tr><th>Strecke</th><th>Muster</th><th class="r">Tarif</th><th class="r">Pax/Tag</th><th class="r">Auslastung</th><th class="r">Erlös/Tag</th><th class="r">Kosten/Tag</th><th class="r">DB2/Tag</th><th></th></tr></thead><tbody>
      ${R.rows.map((x) => `<tr><td><b>${x.o}–${x.d}</b> <span class="small muted">${n0(x.km)} km · ${esc(apName(x.d))}</span></td><td>${tlx(x.type)}${x.nAc > 1 ? ` <span class="small muted">× ${x.nAc}</span>` : ''}</td><td class="r">${eur(x.fare)}</td><td class="r">${n0(x.pax)}</td><td class="r">${pct(x.lf)}</td><td class="r">${eur(x.rev)}</td><td class="r">${eur(x.cost)}</td><td class="r"><b>${sg0(x.db2)}</b></td>
        <td class="r"><button class="btn small" data-act="stplan" data-o="${x.o}" data-d="${x.d}" data-type="${x.type}" data-fare="${x.fare}">Planen</button></td></tr>
        <tr class="sub"><td colspan="9" class="small muted">Investition: ${x.nAc > 1 ? `${x.nAc} Flugzeuge, ` : ''}Kaution ${eur(x.invest)}, Leasing ${eur(x.leaseMonth)}/Monat${x.risks.length ? ' · Risiken: ' + esc(x.risks.join('; ')) : ''}</td></tr>`).join('')}</tbody></table></div>`;
  } else if (k === 'fleet') {
    h += `<div class="tw"><table class="t"><thead><tr><th>Muster</th><th class="r">Sitze</th><th class="r">Reichweite</th><th class="r">DB2/Tag gesamt</th><th>Bester Einsatz</th><th class="r">Kosten je Sitz-h</th><th class="r">Leasing/Monat</th><th class="r">Kaution</th><th class="r">Kauf</th></tr></thead><tbody>
      ${R.rows.map((x) => `<tr><td>${tlx(x.type)}${x.known ? '' : ' <span class="chip">neue Familie</span>'}</td><td class="r">${x.seats}</td><td class="r">${n0(x.range)} km</td><td class="r"><b>${eur(x.sumPos)}</b> <span class="small muted">${x.fits} Str.</span></td><td>${x.best ? `${x.best.o}–${x.best.d} ${sg0(x.best.db2)}` : '–'}</td><td class="r">${eur(x.costSeatH)}</td><td class="r">${eur(x.leaseMonth)}</td><td class="r">${eur(x.deposit)}</td><td class="r">${eur(x.buy)} <span class="small muted">${x.mode}</span></td></tr>`).join('')}</tbody></table></div>`;
    if (R.swaps && R.swaps.length) h += `<div class="stack"><h3>Typwechsel auf Ihren Strecken</h3><div class="tw"><table class="t"><tbody>${R.swaps.map((x) => `<tr><td><b>${x.o}–${x.d}</b></td><td>${tlx(x.from)} → ${tlx(x.to)}</td><td class="r">${sg0(x.gain)} pro Tag</td></tr>`).join('')}</tbody></table></div></div>`;
  } else if (k === 'base') {
    h += `<div class="tw"><table class="t"><thead><tr><th>Standort</th><th class="r">Netzwert/Tag</th><th>Beste Strecken (DB2/Tag)</th><th class="r">Einmalig</th><th class="r">laufend/Tag</th><th>Konkurrenz</th><th></th></tr></thead><tbody>
      ${R.rows.map((x) => `<tr><td><b>${x.apt}</b> ${esc(x.name)} <span class="small muted">${x.pax} Mio. Pax · ${x.reach} Ziele${x.slots !== null ? ` · ${x.slots} Slots frei` : ''}</span></td><td class="r"><b>${sg0(x.net)}</b></td><td class="small">${x.routes.length ? x.routes.map((q) => `${q.d} ${eur(q.db2)}`).join(' · ') : '<span class="muted">keine trägt sich</span>'}</td><td class="r">${eur(x.setup)}</td><td class="r">${eur(x.fixedDay)}</td><td class="small">${x.rivals.length ? esc(x.rivals.slice(0, 2).join(', ')) : '<span class="muted">keine Basis</span>'}</td>
        <td class="r"><button class="btn small" data-act="stcfo" data-k="base" data-apt="${x.apt}" data-net="${x.net}">CFO</button></td></tr>`).join('')}</tbody></table></div>`;
  } else {
    const gapRow = (x) => `<tr><td><b>${x.o}–${x.d}</b> <span class="small muted">${esc(apName(x.o))} – ${esc(apName(x.d))}</span></td><td><span class="chip ${x.cat === 'unbedient' ? 'good' : x.cat === 'voll ausgelastet' ? 'warn' : ''}">${x.cat}</span></td><td class="r">${n0(x.pot)}</td><td class="r">${n0(x.seats)}</td>
      <td class="small">${x.ops.length ? x.ops.map((q) => `${esc(q.name)} ${q.freq}× ${q.lf !== null ? pct(q.lf) : ''}`).join(', ') : '<span class="muted">niemand</span>'}</td>
      <td class="r small">${x.entry ? `${tlx(x.entry.type)} ${sg0(x.entry.db2)}${x.entry.db2 > 0 ? ` <button class="btn small" data-act="stplan" data-o="${x.entry.from}" data-d="${x.entry.to}" data-type="${x.entry.type}" data-fare="${x.entry.fare}">Planen</button>` : ''}` : `<span class="muted">Basis in ${x.needBase || x.o} nötig</span>`}</td></tr>`;
    const head = '<thead><tr><th>Markt</th><th>Lücke</th><th class="r">Potenzial/Tag</th><th class="r">Sitze heute</th><th>Konkurrenz (Auslastung)</th><th class="r">Ihr Einstieg (DB2/Tag)</th></tr></thead>';
    h += `<div class="stack"><h3>An Ihren Basen <small class="muted">${R.countMine ?? R.rows.length} gefunden</small></h3>${R.rows.length ? `<div class="tw"><table class="t">${head}<tbody>${R.rows.map(gapRow).join('')}</tbody></table></div>` : '<p class="small muted">Keine Lücke an Ihren Basen.</p>'}</div>`;
    if (R.others && R.others.length) h += `<div class="stack"><h3>Anderswo <small class="muted">${R.countOther} gefunden – brauchen eine Basis</small></h3><div class="tw"><table class="t">${head}<tbody>${R.others.map(gapRow).join('')}</tbody></table></div></div>`;
    if (R.mine && R.mine.length) h += `<div class="stack"><h3>Ihre Strecken im Wettbewerb</h3><div class="tw"><table class="t"><thead><tr><th>Strecke</th><th class="r">Ihr Tarif / Auslastung</th><th>Konkurrenz: Flüge, Tarif, Auslastung</th></tr></thead><tbody>${R.mine.map((x) => `<tr><td><b>${x.o}–${x.d}</b></td><td class="r">${eur(x.myFare)} · ${x.myLf !== null ? pct(x.myLf) : '–'}</td><td class="small">${x.ops.map((q) => `${esc(q.name)}: ${q.freq}× ${eur(q.fare)} ${q.lf !== null ? pct(q.lf) : ''}`).join(' · ')}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  return h;
}
function studyReport(rep, open) {
  const S = STK(), R = rep.res || {};
  return `<details class="fcx st-rep" ${open ? 'open' : ''}><summary><b>${esc(S.kinds[rep.kind].label)}</b> · ${esc(S.tiers[rep.tier].label)} · ${esc(R.focus || 'weltweit')} <span class="small muted">· ${dateShort(rep.ready)}</span><br><span class="small">${esc(R.title || '')}</span></summary>
    <div class="stack" style="gap:10px;margin-top:8px"><p class="small ink2">${esc(R.summary || '')}</p>${studyRec(rep)}${studyBody(rep)}
      <div class="row" style="gap:6px">${growthChip(R.growth)}<span class="chip">Kosten der Studie ${eur(rep.cost || 0)}</span></div>
      ${R.risks && R.risks.length ? `<div class="small"><b>Risiken und Unsicherheiten:</b> ${esc(R.risks.join(' '))}</div>` : ''}
      ${(R.notes || []).map((x) => `<p class="small muted">${esc(x)}</p>`).join('')}
      <p class="small muted"><b>Annahmen:</b> ${esc((R.assumptions || []).join(' '))}</p></div></details>`;
}
VIEWS.studies = function viewStudies() {
  const pl = W.player, reps = (pl.reports || []).slice().reverse();
  const run = reps.filter((r) => r.status === 'running'), done = reps.filter((r) => r.status !== 'running');
  let html = `<h2 class="sec">Marktstudien <small>externe Beratung · Berichte aus Ihren Spieldaten</small></h2>
    <p class="small ink2">Ohne Marktdaten schätzt Ihre Streckenplanung nur grob – sie kann um den Faktor zwei danebenliegen. Eine Studie erhebt echte Daten für alle untersuchten Verbindungen: Danach rechnet die Planung dort genauer – <b>klein: solide</b> (±${n0((Math.exp(1.3 * P.MARKET_INFO.sigma[2]) - 1) * 100)} %), <b>erweitert: gut</b> (±${n0((Math.exp(1.3 * P.MARKET_INFO.sigma[3]) - 1) * 100)} %), <b>umfassend: sehr genau</b> (±${n0((Math.exp(1.3 * P.MARKET_INFO.sigma[4]) - 1) * 100)} %). Das Wissen veraltet nach rund einem Jahr. Eine Fachkraft für Marktanalyse macht alles zusätzlich genauer und bewertet jeden Monat selbst neue Märkte.</p>`;
  html += studyForm();
  if (run.length) html += `<div class="stack"><h3>In Arbeit</h3>${run.map((r) => { const tot = Math.max(1, r.ready - r.day), el = Math.min(tot, W.day - r.day); return `<div class="st-run"><div class="spread"><span><b>${esc(STK().kinds[r.kind].label)}</b> · ${esc(STK().tiers[r.tier].label)} · ${esc(SM.focusLabel(r.focus))}</span><span class="small muted">fertig am ${dateShort(r.ready)}</span></div><div class="bar"><i class="me" style="width:${(el / tot * 100).toFixed(0)}%"></i></div></div>`; }).join('')}</div>`;
  html += `<div class="stack"><h3>Berichte <small class="muted">${done.length}</small></h3>${done.length ? done.map((r, i) => studyReport(r, i === 0 && ui.studyOpen !== false)).join('') : '<p class="small muted">Noch keine Berichte. Eine kleine Streckenanalyse ist günstig und in wenigen Tagen fertig.</p>'}</div>`;
  return html;
};
function onStudyClick(act, b) {
  const f = ui.study = ui.study || { kind: 'routes', tier: 'extended', ft: '', fv: '' };
  if (act === 'stkind') { f.kind = b.dataset.v; renderPane(true); return true; }
  if (act === 'sttier') { f.tier = b.dataset.v; renderPane(true); return true; }
  if (act === 'stbasetog') { const sel = stBases(), v = b.dataset.v; if (sel.includes(v)) { if (sel.length > 1) f.bases = sel.filter((x) => x !== v); else toast('Mindestens eine Basis muss dabei sein.'); } else f.bases = [...sel, v]; renderPane(true); return true; }
  if (act === 'stbaseall') { const pl = W.player; f.bases = stBases().length === pl.bases.length ? [pl.bases[0]] : pl.bases.slice(); renderPane(true); return true; }
  if (act === 'storder') {
    const focus = f.ft ? { t: f.ft, v: f.fv } : null;
    const r = doAction({ type: 'orderStudy', kind: f.kind, tier: f.tier, focus, bases: (f.kind === 'routes' || f.kind === 'fleet') ? stBases() : null, fresh: f.fresh !== false });
    if (r.ok) toast(`Studie beauftragt – Bericht in ${r.days} Tagen.`);
    refreshAll(); return true;
  }
  if (act === 'stplan') {
    const o = b.dataset.o, d = b.dataset.d, fare = Number(b.dataset.fare) || 0;
    ui.planner = defaultPlanner(d, o); ui.planner.type = b.dataset.type; if (fare) { ui.planner.fo = fare; ui.planner.fi = fare; ui.planner.auto = false; }
    setTab('plan'); renderMapRoutes(true); return true;
  }
  if (act === 'stac') { ui.buyFocus = b.dataset.type; setTab('fleetBuy'); setTimeout(() => { const el = $('#type-' + b.dataset.type); if (el) el.scrollIntoView({ block: 'center' }); }, 60); return true; }
  if (act === 'stbase') { ui.newBasePick = b.dataset.apt; setTab('stations'); setTimeout(() => { const el = $('#newbase'); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } }, 60); toast(`${apName(b.dataset.apt)} ist vorausgewählt – mit „Basis eröffnen“ bestätigen.`); return true; }
  if (act === 'stbasecheck') { ui.study = { kind: 'base', tier: 'extended', ft: 'country', fv: P.AIRPORTS[b.dataset.apt].country }; renderPane(true); $('#pane').scrollTop = 0; window.scrollTo && isPhone() && phoneScroll('markt', false); return true; }
  if (act === 'stcfo') {
    const d = b.dataset;
    ui.cfo = ui.cfo || {};
    ui.cfo.scen = d.k === 'route' ? { k: 'route', o: d.o, d: d.d, type: d.type, fare: Number(d.fare), freq: 1, newAc: true }
      : d.k === 'aircraft' ? { k: 'aircraft', type: d.type, mode: 'lease', n: 1, db1: null }
      : { k: 'base', apt: d.apt, net: Number(d.net) || 0 };
    ui.cfo.from = 'study';
    setTab('cfo'); return true;
  }
  return false;
}
function onStudyChange(t) {
  const f = ui.study = ui.study || { kind: 'routes', tier: 'extended', ft: '', fv: '' };
  if (t.id === 'st-ft') { f.ft = t.value; f.fv = ''; renderPane(true); return true; }
  if (t.id === 'st-fv') { f.fv = t.value; renderPane(true); return true; }
  return false;
}

// ---------------------------------------------------------------------------
// CFO: Finanzlage erklären, Fragen beantworten, Szenarien rechnen
// ---------------------------------------------------------------------------
const CFO = { name: 'Katrin Vogel', role: 'Finanzvorständin (CFO)' };
const CFO_Q = [
  ['lage', 'Wie steht unser Unternehmen finanziell da?'],
  ['flugzeug', 'Können wir uns ein weiteres Flugzeug leisten?'],
  ['basis', 'Sollten wir eine neue Basis eröffnen?'],
  ['strecken', 'Welche unserer Strecken sind unrentabel?'],
  ['kosten', 'Wo können wir Kosten senken?'],
  ['reserve', 'Wie viel Liquiditätsreserve sollten wir halten?'],
  ['invest', 'Welche Investition ist gerade am sinnvollsten?'],
  ['flotte', 'Wie wirken sich neue Flugzeuge auf unsere Finanzen aus?'],
  ['schulden', 'Können wir uns zusätzliche Schulden leisten?'],
  ['trend', 'Wie entwickeln sich Einnahmen und Ausgaben?'],
  ['gewinn', 'Was würde unseren Gewinn verbessern?'],
];
const CFO_TAG = { grow: ['Wachstum', 'good'], careful: ['Vorsicht', 'warn'], cost: ['Kostenoptimierung', 'me'], invest: ['Investitionsprüfung', ''], risk: ['Risikowarnung', 'crit'], info: ['Lagebild', ''] };
/** Kennzahlen für die CFO aus Ledger, Tagesreihe, Strecken und Flotte (alles aus dem Spielstand). */
function cfoData() {
  const pl = W.player, L = pl.ledger, bs = SM.balanceSheet(pl), c = cpi();
  const h = (pl.dayHist || []).slice(-30), hp = (pl.dayHist || []).slice(-60, -30);
  const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);
  const net30 = sum(h, 'net'), rev30 = sum(h, 'rev'), pax30 = sum(h, 'pax'), netP = sum(hp, 'net'), revP = sum(hp, 'rev');
  const nh = netHistOf(pl), cf30 = nh.length > 30 ? nh[nh.length - 1] - nh[nh.length - 31] : null;
  // Kostenblöcke: laufender Monat auf 30 Tage hochgerechnet, sonst Vormonat
  const dim = Math.max(1, dateParts(W.day).d);
  const useCur = dim >= 10 || !L.months.length, acc = useCur ? L.month : L.months.at(-1).acc, scale = useCur ? 30.4 / dim : 1;
  const v = (k) => -(acc[k] || 0) / 100 * scale;
  const FIX = ['lease', 'staff_cockpit', 'staff_cabin', 'staff_tech', 'stations', 'experts', 'insurance', 'overhead', 'slots', 'marketing', 'loyalty', 'interest'];
  const fixedM = FIX.reduce((s, k) => s + Math.max(0, v(k)), 0);
  const loanM = pl.loans.reduce((s, l) => s + l.annuity, 0);
  const costKeys = SM.PNL_ACCOUNTS.filter((k) => !k.startsWith('rev_') && k !== 'tax' && k !== 'hedge');
  const costs = costKeys.map((k) => [k, v(k)]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]);
  const costTot = costs.reduce((s, [, x]) => s + x, 0);
  const routes = pl.activeRoutes().filter((r) => r.opened_day <= W.day).map((r) => { const s = rstats(r, 30); return { r, n: s.n, db1: s.n ? s.db1 / s.n : 0, db2: s.n ? s.db2 / s.n : 0, lf: s.lf, age: W.day - r.opened_day }; });
  const flying = pl.fleet.filter((a) => a.delivery_day <= W.day);
  const idle = flying.filter((a) => !(a.used_hours > 0) && !(a.acmi && a.acmi.end > W.day) && a.status !== 'ccheck' && a.status !== 'aog');
  const db1Ac = flying.length ? routes.reduce((s, x) => s + x.db1, 0) / Math.max(1, flying.length - idle.length) : 0;
  const cash = netCash(pl), free = pl.spendable(W.macro.bank ?? 1), line = pl.creditLimit(W.macro.bank ?? 1);
  const reserve = Math.max(1e6 * c, 2 * fixedM);
  return { pl, bs, c, net30, rev30, pax30, netP, revP, days: h.length, cf30, fixedM, loanM, costs, costTot, v, routes, flying, idle, db1Ac, cash, free, line, reserve,
    runway: (() => { const flow = cf30 !== null ? cf30 : h.length >= 20 ? net30 : null; if (flow === null) return pl.runway; return flow >= 0 ? Infinity : Math.max(0, free / (-flow / 30.4)); })(), margin: rev30 > 0 ? net30 / rev30 : null, loanLimit: W.loanLimit(pl), loanRate: W.loanRate(pl), debt: bs.loans + bs.bank + bs.credit, leaseLiab: bs.leaseLiab,
    fuelShare: costTot > 0 ? v('fuel') / costTot : 0, hedge: pl.hedge };
}
const COST_LBL = { fuel: 'Kerosin', crew: 'Crew-Spesen', staff_cockpit: 'Gehälter Cockpit', staff_cabin: 'Gehälter Kabine', staff_tech: 'Gehälter Technik', staff_extra: 'Agentur, Überstunden, Einstellung', maintenance: 'Wartung', navigation: 'Flugsicherung', landing: 'Landeentgelte', handling: 'Abfertigung', pax_fees: 'Passagierentgelte', pax_service: 'Bordservice', distribution: 'Vertrieb', cargo_cost: 'Fracht', disruption: 'Störungen, Entschädigungen', stations: 'Stationen', slots: 'Slots', lease: 'Leasing', depreciation: 'Abschreibung', insurance: 'Versicherung', experts: 'Fachkräfte', marketing: 'Marketing', loyalty: 'Vielfliegerprogramm', overhead: 'Verwaltung', one_off: 'Einmalkosten', trade: 'Handel', interest: 'Zinsen' };
/** Laufende Monatskosten eines zusätzlichen Flugzeugs (ohne direkte Flugkosten, die stecken im DB1). */
function acMonthly(type, mode, bh = 10) {
  const t = P.AIRCRAFT_TYPES[type], c = cpi(), S = P.STAFF, pl = W.player;
  const own = mode === 'buy';
  const rk = SM.riskTerms(pl, type);
  const lease = own ? 0 : t.lease_month * rk.lease * (P.EURUSD / W.macro.eurusd) * (mode === 'flex' ? 1 + P.FLEX_LEASE_PREMIUM : 1);
  const price = t.value_eur, loan = price * (1 - rk.down), rate = W.macro.rate + 0.025, rm = rate / 12, n = P.LOAN_TERM_YEARS * 12;
  const annuity = own ? loan * rm / (1 - (1 + rm) ** -n) : 0;
  const crew = SM.crewFor(t.cockpit || 2, t.cabin, bh), pay = pl.staff ? pl.staff.pay : 1;
  const staff = (crew.pil * S.pilotSalary[t.group] + crew.cab * S.cabinSalary + S.techPerAc * S.techSalary) * pay * c * SM.wageX(W.player.bases[0]);
  const other = (SM.ovhAc(type) * c + price * P.INSURANCE[pl.insurance].rate / 365) * 30.4 + (pl.familyKnown(type) ? 0 : P.TYPE_COMPLEXITY_DAY * 30.4 * c);
  return { lease, annuity, staff, other, total: lease + annuity + staff + other, oneTime: SM.acquireCost(pl, type, mode === 'flex' ? 'flex' : mode, null, W.macro.eurusd, W), price };
}
function cfoAnswer(key, D) {
  const pl = D.pl, ttl = (k) => CFO_TAG[k];
  const out = (tag, html, acts = '') => ({ tag, html, acts });
  const res = (x) => `${eur(x)}`;
  const freeAfter = (x) => D.free - x;
  if (key === 'lage') {
    const red = (D.runway !== undefined && isFinite(D.runway) && D.runway < 90) || D.free < D.reserve * 0.5, yellow = D.net30 < 0 || D.free < D.reserve;
    const tag = red ? 'risk' : yellow ? 'careful' : 'grow';
    return out(tag, `<p>Wir haben <b>${res(D.cash)}</b> auf dem Konto und insgesamt <b>${res(D.free)}</b> verfügbar, wenn ich den freien Dispo von ${res(Math.max(0, D.line - (pl.creditUsed || 0)))} mitrechne. ${D.days ? `In den letzten ${D.days} Tagen haben wir ${D.net30 >= 0 ? 'verdient' : 'verloren'}: <b>${sg0(D.net30)}</b>${D.margin !== null ? ` bei ${res(D.rev30)} Umsatz, also ${pct(D.margin)} Marge` : ''}.` : 'Für eine Ergebnisbewertung fehlen noch Flugtage.'}${D.days >= 30 && D.netP ? ` Davor waren es ${sg0(D.netP)} – ${D.net30 > D.netP ? 'es geht aufwärts' : 'es geht abwärts'}.` : ''}</p>
      <p>Unsere festen Kosten liegen bei rund <b>${res(D.fixedM)}</b> im Monat (Leasing, Gehälter, Stationen, Verwaltung). ${D.runway !== undefined && isFinite(D.runway) && D.runway > 0 ? `Beim heutigen Mittelabfluss reicht das Geld noch etwa <b>${n0(D.runway)} Tage</b>.` : D.net30 >= 0 ? 'Wir verbrennen derzeit kein Geld.' : ''} Eigenkapital ${res(D.bs.equity)}, Rating ${pl.rating}, Schulden ${res(D.debt)}${D.leaseLiab ? ` plus Leasingverpflichtungen von rund ${res(D.leaseLiab)}` : ''}.</p>
      <p><b>Meine Einschätzung:</b> ${red ? 'Die Liquidität ist kritisch. Keine neuen Investitionen, Verlustbringer prüfen, notfalls einen Kredit aufnehmen.' : yellow ? `${D.net30 < 0 ? `Wir haben Zeit, verlieren aber Geld${D.runway !== undefined && isFinite(D.runway) ? ` – die Liquidität reicht beim heutigen Abfluss noch rund ${n0(D.runway / 30.4)} Monate` : ''}` : 'Wir verdienen Geld, liegen aber unter der Reserve, die ich halten möchte'}. Investitionen nur, wenn sie sich schnell tragen.` : 'Solide aufgestellt – wir haben Spielraum für gezieltes Wachstum.'}</p>`);
  }
  if (key === 'reserve') {
    const gap = D.free - D.reserve;
    return out(gap < 0 ? 'careful' : 'info', `<p>Ich halte <b>zwei Monate Fixkosten</b> als Reserve für richtig, mindestens ${res(1e6 * D.c)}: bei uns derzeit <b>${res(D.reserve)}</b>. Damit überstehen wir einen schwachen Monat, einen Ölpreisschock oder einen Streik, ohne in die Insolvenzgefahr zu laufen (30 Tage über dem Dispo = Insolvenz).</p>
      <p>Verfügbar sind ${res(D.free)} – ${gap >= 0 ? `also <b>${res(gap)}</b> über der Reserve. Das ist unser Investitionsspielraum.` : `<b>${res(-gap)} zu wenig</b>. Bitte erst Liquidität aufbauen.`}</p>
      <p class="small muted">Den Dispo rechne ich mit, plane ihn aber nicht dauerhaft ein: Er kostet ${pct(pl.creditRate(W.macro.rate, W.macro.bank ?? 1), 1)} Zinsen und kann bei schlechterem Rating sinken.</p>`);
  }
  if (key === 'flugzeug' || key === 'flotte') {
    const type = (() => { const cnt = {}; for (const a of pl.fleet) cnt[a.type_id] = (cnt[a.type_id] || 0) + 1; return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || 'A20N'; })();
    const L = acMonthly(type, 'lease'), B = acMonthly(type, 'buy'), contrib = Math.max(0, D.db1Ac) * 30.4;
    const after = freeAfter(L.oneTime), netM = contrib - L.total;
    const tag = after < D.reserve * 0.5 ? 'risk' : after < D.reserve ? 'careful' : netM > 0 ? 'grow' : 'invest';
    const ownLine = `Ein weiteres Flugzeug wie unsere ${tl(type)} kostet im Leasing einmalig <b>${res(L.oneTime)}</b> (Kaution${pl.familyKnown(type) ? '' : ' und Einführung'}) und laufend rund <b>${res(L.total)}</b> im Monat: ${res(L.lease)} Leasing, ${res(L.staff)} Crew und Technik bei 10 Blockstunden am Tag, ${res(L.other)} Versicherung und Verwaltung.`;
    const buyLine = `Kaufen hieße ${res(B.oneTime)} Anzahlung, dann ${res(B.annuity)} Kreditrate im Monat statt Leasing – günstiger im Monat, bindet aber Kapital und bringt Abschreibung.`;
    const earn = D.db1Ac > 0 ? `Unsere Flugzeuge erwirtschaften im Schnitt <b>${res(D.db1Ac)}</b> DB1 pro Tag (${res(contrib)} im Monat). Fliegt das neue genauso, bleiben ${sg0(netM)} im Monat.` : 'Unsere Flugzeuge decken derzeit im Schnitt nicht einmal die direkten Kosten – ein weiteres würde die Lage verschlechtern, solange das Netz nicht trägt.';
    if (key === 'flotte') {
      const rows = D.flying.map((a) => `<tr><td><b class="mono">${acName(a.id)}</b> ${tlx(a.type_id)}</td><td class="r">${n1(a.used_hours || 0)} h/Tag</td><td class="r">${eur(acDayCost(a))}</td></tr>`).join('');
      return out(tag, `<p>${ownLine}</p><p>${buyLine}</p><p>${earn}</p>${rows ? `<div class="tw"><table class="t"><thead><tr><th>Flugzeug</th><th class="r">Einsatz</th><th class="r">Fixkosten/Tag</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}${D.idle.length ? `<p class="neg">${D.idle.length} Flugzeug${D.idle.length > 1 ? 'e stehen' : ' steht'} ohne Einsatz und kosten trotzdem.</p>` : ''}`, `<button class="btn small" data-act="cfoscen" data-k="aircraft" data-type="${type}">Im Szenario rechnen</button>`);
    }
    return out(tag, `<p>${ownLine}</p><p>${earn}</p><p><b>Meine Einschätzung:</b> ${after < D.reserve * 0.5 ? `Nein – danach blieben nur ${res(after)} verfügbar, weit unter der Reserve von ${res(D.reserve)}.` : after < D.reserve ? `Machbar, aber knapp: danach ${res(after)} verfügbar, unter der Reserve von ${res(D.reserve)}. Nur mit einer Strecke, die sicher trägt.` : netM > 0 ? `Ja. Danach bleiben ${res(after)} verfügbar, und bei heutiger Leistung trägt sich das Flugzeug.` : `Finanziell ja (${res(after)} verbleiben), wirtschaftlich nur mit einer besseren Strecke als im Schnitt – vorher eine Streckenanalyse beauftragen.`}</p>`,
      `<button class="btn small" data-act="cfoscen" data-k="aircraft" data-type="${type}">Im Szenario rechnen</button>`);
  }
  if (key === 'basis') {
    const setup = P.BASE_SETUP_COST * D.c, fixedM = P.BASE_FIXED_DAY * 30.4 * D.c;
    const study = (pl.reports || []).filter((r) => r.status === 'done' && r.kind === 'base' && r.res && r.res.rows.length).at(-1);
    const best = study ? study.res.rows[0] : null;
    const after = freeAfter(setup);
    const tag = after < D.reserve ? 'careful' : D.net30 < 0 ? 'careful' : best && best.net > 0 ? 'grow' : 'invest';
    return out(tag, `<p>Eine Basis kostet einmalig <b>${res(setup)}</b> und dann rund <b>${res(fixedM)}</b> im Monat für Leitung und Crewräume, dazu die Terminalmiete. Sie braucht außerdem Flugzeuge und Personal vor Ort – das ist die eigentliche Investition.</p>
      <p>${best ? `Laut unserer Standortanalyse vom ${dateShort(study.ready)} ist <b>${esc(best.name)} (${best.apt})</b> am stärksten: rund ${sg0(best.net)} pro Tag nach den Basiskosten, mit Flugzeugen gerechnet.` : 'Eine Standortanalyse haben wir noch nicht – ohne sie würde ich nicht entscheiden.'}</p>
      <p><b>Meine Einschätzung:</b> ${D.net30 < 0 ? 'Erst das bestehende Netz profitabel machen. Eine zweite Basis verteilt Fixkosten, löst aber kein Ertragsproblem.' : after < D.reserve ? `Die Einrichtung selbst wäre bezahlbar, aber mit Flugzeugen wird es knapp (danach ${res(after)} verfügbar, Reserve ${res(D.reserve)}).` : best && best.net > 0 ? `Ja, ${esc(best.name)} ist aussichtsreich und finanzierbar. Ich würde mit zwei bis drei Flugzeugen starten.` : 'Finanziell möglich – aber nur mit einem Standort, dessen Strecken sich klar tragen.'}</p>`,
      `${best ? `<button class="btn small" data-act="cfoscen" data-k="base" data-apt="${best.apt}" data-net="${best.net}">Im Szenario rechnen</button>` : ''}<button class="btn small" data-act="tab" data-tab="studies">Standortanalyse beauftragen</button>`);
  }
  if (key === 'strecken') {
    const bad = D.routes.filter((x) => x.n >= 7 && x.db2 < 0).sort((a, b) => a.db2 - b.db2);
    if (!D.routes.length) return out('info', '<p>Wir fliegen noch keine Strecke mit genug Daten. Sobald die ersten Wochen gelaufen sind, kann ich das bewerten.</p>');
    if (!bad.length) return out('grow', `<p>Alle ${D.routes.length} Strecken mit mindestens einer Woche Betrieb tragen ihre Kosten einschließlich Flugzeug (DB2 positiv). Sehr gut.</p>`);
    const rows = bad.map((x) => `<tr><td><b>${x.r.base}–${x.r.dest}</b> <span class="small muted">${x.age < 30 ? 'Anlaufphase' : `${x.r.freq}× ${tl(x.r.type_id)}`}</span></td><td class="r">${pct(x.lf)}</td><td class="r">${sg0(x.db1)}</td><td class="r">${sg0(x.db2)}</td><td class="small">${x.age < 30 ? 'abwarten, Nachfrage baut sich auf' : x.db1 < 0 ? 'deckt nicht einmal die direkten Kosten – einstellen prüfen' : x.lf < 0.65 ? 'zu große Kapazität – kleineres Muster oder weniger Flüge' : 'Preis anheben oder Muster wechseln'}</td></tr>`).join('');
    const save = bad.filter((x) => x.age >= 30).reduce((s, x) => s - x.db2, 0) * 30.4;
    return out('cost', `<p>${bad.length} von ${D.routes.length} Strecken verdienen das eingesetzte Flugzeug nicht (DB2 negativ, Schnitt der letzten 30 Tage):</p><div class="tw"><table class="t"><thead><tr><th>Strecke</th><th class="r">Auslastung</th><th class="r">DB1/Tag</th><th class="r">DB2/Tag</th><th>Was ich tun würde</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p>${save > 0 ? `Würden wir die eingeschwungenen Verlustbringer einstellen und die Flugzeuge zurückgeben oder besser einsetzen, verbessert das das Ergebnis um rund <b>${res(save)}</b> im Monat.` : ''} Achtung: Strecken mit positivem DB1 tragen zu den Fixkosten bei – solange kein besserer Einsatz für das Flugzeug da ist, kann es sinnvoll sein, sie zu behalten.</p>`,
      bad[0] && bad[0].age >= 30 ? `<button class="btn small" data-act="cfoscen" data-k="close" data-id="${bad[0].r.id}">Einstellen von ${bad[0].r.base}–${bad[0].r.dest} rechnen</button>` : '');
  }
  if (key === 'kosten' || key === 'gewinn') {
    const lev = [];
    const agency = D.v('staff_extra'); if (agency > 50000 * D.c) lev.push([agency * 0.7, `Agentur, Überstunden und Einstellungen kosten ${res(agency)} im Monat – eigenes Personal einstellen spart rund 70 % davon.`, 'staff']);
    const idleC = D.idle.reduce((s, a) => s + acDayCost(a), 0) * 30.4; if (idleC > 0) lev.push([idleC, `${D.idle.length} Flugzeug${D.idle.length > 1 ? 'e stehen' : ' steht'} ungenutzt (${res(idleC)} im Monat) – einsetzen, verchartern oder zurückgeben.`, 'fleetOwn']);
    const lossR = D.routes.filter((x) => x.age >= 30 && x.db1 < 0).reduce((s, x) => s - x.db1, 0) * 30.4; if (lossR > 0) lev.push([lossR, `Strecken mit negativem DB1 kosten ${res(lossR)} im Monat mehr, als sie einbringen.`, 'routes']);
    const fuel = D.v('fuel'); if (fuel > 0 && !(D.hedge && D.hedge.share > 0.2)) lev.push([fuel * 0.03, `Kerosin ist mit ${pct(D.fuelShare)} der größte Block (${res(fuel)}/Monat). Eine Absicherung glättet Preissprünge; neuere Muster sparen 15–25 %.`, 'purchasing']);
    const fam = new Set(pl.fleet.map((a) => P.AIRCRAFT_TYPES[a.type_id].group)).size; if (fam > 2) lev.push([(fam - 1) * P.TYPE_COMPLEXITY_DAY * 30.4 * D.c, `${fam} Musterfamilien kosten ${res((fam - 1) * P.TYPE_COMPLEXITY_DAY * 30.4 * D.c)} Komplexität im Monat – eine schlankere Flotte spart das.`, 'fleetOwn']);
    const mk = D.v('marketing'); if (mk > 0 && pl.brand > 0.75) lev.push([mk * 0.3, `Marketing (${res(mk)}/Monat) bei bereits starker Marke (${n0(pl.brand * 100)}) – hier lässt sich etwas zurückfahren.`, 'purchasing']);
    if (key === 'gewinn') {
      const full = D.routes.filter((x) => x.n >= 7 && x.lf > 0.92); if (full.length) lev.push([full.reduce((s, x) => s + x.db1 * 0.08, 0) * 30.4, `${full.length} Strecke${full.length > 1 ? 'n sind' : ' ist'} über 92 % ausgelastet (${full.slice(0, 3).map((x) => x.r.base + '–' + x.r.dest).join(', ')}): Tarife um 5–10 % anheben oder Frequenz erhöhen.`, 'routes']);
    }
    lev.sort((a, b) => b[0] - a[0]);
    const top = D.costs.slice(0, 5).map(([k, x]) => `<tr><td>${COST_LBL[k] || k}</td><td class="r">${eur(x)}</td><td class="r">${pct(x / Math.max(1, D.costTot))}</td></tr>`).join('');
    return out(key === 'kosten' ? 'cost' : 'grow', `${key === 'kosten' ? `<p>Unsere größten Kostenblöcke (hochgerechnet auf einen Monat):</p><div class="tw"><table class="t"><tbody>${top}</tbody></table></div>` : ''}
      <p>${lev.length ? 'Wo ich ansetzen würde, nach Wirkung sortiert:' : 'Ich sehe gerade keinen großen Hebel – das Unternehmen arbeitet effizient.'}</p>${lev.length ? `<ol class="glist-num">${lev.slice(0, 6).map(([x, t, tab]) => `<li>${t} <span class="small muted">· Wirkung bis ${res(x)}/Monat</span> <a href="#" data-act="tab" data-tab="${tab}">öffnen</a></li>`).join('')}</ol>` : ''}
      <p class="small muted">Geschätzte Wirkung aus den Zahlen der letzten 30 Tage, keine Garantie.</p>`);
  }
  if (key === 'schulden') {
    const opCF = D.net30 + D.v('depreciation');   // Abschreibung kostet kein Geld
    const roomM = Math.max(0, opCF * 0.3 - D.loanM);
    const rm = D.loanRate / 12, n = 60, maxByCF = roomM > 0 ? roomM * (1 - (1 + rm) ** -n) / rm : 0;
    const maxNew = Math.min(D.loanLimit, maxByCF);
    const tag = opCF <= 0 ? 'risk' : maxNew < 1e6 ? 'careful' : 'invest';
    return out(tag, `<p>Bankkredite: ${pl.loans.length ? `${pl.loans.length} laufend, Rest ${res(pl.loans.reduce((s, l) => s + l.balance, 0))}, Raten ${res(D.loanM)} im Monat` : 'keine'}. Flugzeugkredite ${res(D.bs.loans)}, Dispo genutzt ${res(pl.creditUsed || 0)}. Die Bank gibt uns bei Rating ${pl.rating} höchstens <b>${res(D.loanLimit)}</b> zu etwa <b>${pct(D.loanRate, 1)}</b>.</p>
      <p>Unser operativer Mittelzufluss liegt bei rund ${sg0(opCF)} im Monat (Ergebnis plus Abschreibung). Ich würde höchstens 30 % davon für Kreditraten verwenden – ${opCF > 0 ? `das trägt zusätzlich etwa <b>${res(maxNew)}</b> über 5 Jahre.` : 'derzeit also nichts.'}</p>
      <p><b>Meine Einschätzung:</b> ${opCF <= 0 ? 'Schulden würden nur Zeit kaufen. Sinnvoll höchstens als Überbrückung, wenn ein klarer Plan zur Profitabilität steht.' : maxNew < 1e6 ? 'Kaum Spielraum für neue Schulden – lieber aus dem laufenden Ergebnis finanzieren.' : 'Ein Kredit ist vertretbar, wenn er eine Investition finanziert, die sich innerhalb der Laufzeit trägt.'}</p>`,
      `<button class="btn small" data-act="cfoscen" data-k="loan" data-amount="${Math.round(Math.max(1e6, Math.min(maxNew || D.loanLimit, D.loanLimit)) / 1e5) * 1e5}">Kredit im Szenario rechnen</button>`);
  }
  if (key === 'trend') {
    const ms = pl.ledger.months.slice(-4).map((m) => ({ label: `${MONTHS[m.label.m]} ${String(2027 + m.label.y).slice(2)}`, ...pnlCol(m.acc) }));
    const rows = ms.map((m) => `<tr><td>${m.label}</td><td class="r">${eur(m.rev)}</td><td class="r">${eur(m.rev - m.net)}</td><td class="r">${sg0(m.net)}</td></tr>`).join('');
    const dRev = D.revP ? D.rev30 / D.revP - 1 : null;
    return out('info', `<p>Die letzten 30 Tage: Umsatz ${res(D.rev30)}${dRev !== null ? ` (${dRev >= 0 ? '+' : ''}${pct(dRev)} gegenüber den 30 Tagen davor)` : ''}, Ergebnis ${sg0(D.net30)}, ${n0(D.pax30)} Passagiere.</p>
      ${rows ? `<div class="tw"><table class="t"><thead><tr><th>Monat</th><th class="r">Umsatz</th><th class="r">Kosten</th><th class="r">Ergebnis</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="small muted">Noch kein abgeschlossener Monat.</p>'}
      <p>${D.cf30 !== null ? `Der Kontostand hat sich in 30 Tagen um ${sg0(D.cf30)} verändert – darin stecken auch Kautionen, Anzahlungen und Tilgungen, nicht nur das Ergebnis.` : ''}</p>`);
  }
  if (key === 'invest') {
    const opts = [];
    const lastOf = (k) => (pl.reports || []).filter((r) => r.status === 'done' && r.kind === k && r.res && r.res.rec && r.res.rec.act).at(-1);
    const rs = lastOf('routes'); if (rs) { const a = rs.res.rows.find((x) => x.db2 > 0); if (a) opts.push([a.db2 * 30.4, a.invest, `Strecke ${a.o}–${a.d} (Streckenanalyse): rund ${res(a.db2 * 30.4)} DB2 im Monat, Kaution ${res(a.invest)}.`, `<button class="btn small" data-act="cfoscen" data-k="route" data-o="${a.o}" data-d="${a.d}" data-type="${a.type}" data-fare="${a.fare}">rechnen</button>`]); }
    const bs2 = lastOf('base'); if (bs2) { const b = bs2.res.rows[0]; if (b && b.net > 0) opts.push([b.net * 30.4, b.setup, `Basis ${b.name}: rund ${res(b.net * 30.4)} im Monat nach Basiskosten, einmalig ${res(b.setup)} plus Flugzeuge.`, `<button class="btn small" data-act="cfoscen" data-k="base" data-apt="${b.apt}" data-net="${b.net}">rechnen</button>`]); }
    const loss = D.routes.filter((x) => x.age >= 30 && x.db2 < 0).sort((a, b) => a.db2 - b.db2)[0]; if (loss) opts.push([-loss.db2 * 30.4, 0, `Verlustbringer ${loss.r.base}–${loss.r.dest} einstellen: ${res(-loss.db2 * 30.4)} im Monat besser, keine Investition.`, `<button class="btn small" data-act="cfoscen" data-k="close" data-id="${loss.r.id}">rechnen</button>`]);
    if (D.idle.length) opts.push([D.idle.reduce((s, a) => s + acDayCost(a), 0) * 30.4, 0, `Ungenutzte Flugzeuge einsetzen: sie kosten ohnehin – jede Strecke mit positivem DB1 hilft sofort.`, '<button class="btn small" data-act="tab" data-tab="plan">Strecke planen</button>']);
    opts.sort((a, b) => (b[0] / Math.max(1, b[1] / 12)) - (a[0] / Math.max(1, a[1] / 12)));
    return out(opts.length ? 'invest' : 'info', opts.length ? `<p>Nach Wirkung im Verhältnis zum Kapitaleinsatz:</p><ol class="glist-num">${opts.map(([m, inv, t, b]) => `<li>${t} ${b}</li>`).join('')}</ol><p>${D.free - D.reserve > 0 ? `Investitionsspielraum über der Reserve: <b>${res(D.free - D.reserve)}</b>.` : `<span class="neg">Wir liegen unter der Reserve</span> – zuerst Maßnahmen ohne Kapitaleinsatz.`}</p>`
      : '<p>Mir fehlen konkrete Vorschläge. Eine Strecken- oder Standortanalyse liefert sie – ich bewerte sie dann finanziell.</p>', '<button class="btn small" data-act="tab" data-tab="studies">Marktstudie beauftragen</button>');
  }
  return out('info', '<p>Dazu habe ich gerade keine Zahlen.</p>');
}
// ---------- Szenarien ----------
function cfoScenario(sc, D) {
  const pl = D.pl, c = D.c;
  let one = 0, month = 0, title = '', lines = [], notes = [];
  if (sc.k === 'aircraft') {
    if (P.AIRCRAFT_TYPES[sc.type] && P.AIRCRAFT_TYPES[sc.type].supersonic) sc.mode = 'buy';   // Concorde gibt es nur gebraucht zu kaufen
    const t = P.AIRCRAFT_TYPES[sc.type] || P.AIRCRAFT_TYPES.A20N, n = Math.max(1, Math.min(10, sc.n || 1)), M = acMonthly(sc.type, sc.mode || 'lease', sc.bh || 10);
    const db1 = sc.db1 !== null && sc.db1 !== undefined && sc.db1 !== '' ? Number(sc.db1) : Math.max(0, Math.round(D.db1Ac));
    one = M.oneTime * n; month = (db1 * 30.4 - M.total) * n;
    title = `${n} × ${t.label} (${sc.mode === 'buy' ? 'Kauf' : sc.mode === 'flex' ? 'Flex-Leasing' : 'Leasing'})`;
    lines = [['Einmalig', -one, sc.mode === 'buy' ? 'Anzahlung' : 'Kaution und Einführung'], ['Laufende Kosten', -M.total * n, `${sc.mode === 'buy' ? 'Kreditrate' : 'Leasing'}, Crew bei ${sc.bh || 10} h/Tag, Technik, Versicherung`], ['Erwarteter DB1', db1 * 30.4 * n, `${eur(db1)} pro Flugzeug und Tag`]];
    if (!pl.familyKnown(sc.type)) notes.push(`Neue Familie: ${eur(P.TYPE_INTRO_COST)} Einführung und eigene Piloten.`);
    if (t.supersonic) notes.push('Concorde: nur gebraucht zu kaufen (höchstens 2 je Airline). Kerosin und Wartung stecken im DB1 – den Durchschnitt Ihrer Flotte erreicht sie nur auf langen Geschäftsreise-Strecken wie London–New York; auf der falschen Strecke wird der DB1 tief negativ. Erst eine Strecke im Szenario „Neue Strecke“ rechnen und deren DB1 hier eintragen.');
  } else if (sc.k === 'base') {
    const fixedD = (P.BASE_FIXED_DAY + P.TERMINALS.std.rent * SM.apx(sc.apt).cost / 30.4) * c;
    // Strecken und Flugzeuge aus der jüngsten Standortanalyse, falls sie diesen Standort enthält
    const st = (pl.reports || []).filter((r) => r.kind === 'base' && r.status === 'done' && r.res && r.res.rows).reverse().map((r) => r.res.rows.find((x) => x.apt === sc.apt)).find(Boolean);
    let routesD = (Number(sc.net) || 0) + fixedD; if (Math.abs(routesD) < 5) routesD = 0;
    const deps = st && routesD > 0 ? st.routes.filter((x) => x.db2 > 0).slice(0, 5).map((x) => SM.acquireCost(pl, x.type, 'lease', null, W.macro.eurusd, W)) : [];
    const dep = deps.reduce((a, x) => a + x, 0);
    one = P.BASE_SETUP_COST * c + dep; month = (routesD - fixedD) * 30.4;
    title = `Neue Basis ${apName(sc.apt)} (${sc.apt})`;
    lines = [['Einrichtung', -P.BASE_SETUP_COST * c, 'einmalig'], ...(dep ? [['Kautionen', -dep, `${deps.length} Leasingflugzeug${deps.length > 1 ? 'e' : ''} für die Strecken der Studie`]] : []),
      ['Basiskosten', -fixedD * 30.4, 'Leitung, Crewräume, Terminal je Monat'],
      ['Strecken ab der Basis', routesD * 30.4, st ? 'laut Standortanalyse, nach Flugzeug- und Crewkosten' : routesD ? 'Ihr Eintrag' : 'noch keine eingerechnet – Wert eintragen oder Standortanalyse beauftragen']];
    if (!st && !(routesD > 0)) notes.push('Ohne Strecken zeigt das Szenario nur die Kosten der Basis. Eine Standortanalyse rechnet die besten Strecken ab diesem Flughafen durch.');
    notes.push('Personal vor Ort und rund 30 Tage Anlaufzeit kommen hinzu; die Konkurrenz reagiert auf neue Angebote.');
  } else if (sc.k === 'route') {
    const spec = { airline: pl.id, base: sc.o, dest: sc.d, type_id: sc.type, freq: sc.freq || 1, fare_out: sc.fare, fare_in: sc.fare, service: 'standard', buffer: 'normal' };
    const x = SM.rangeOk(sc.o, sc.d, sc.type) ? W.forecastFor(pl, spec, { nDraws: 3 }) : null;
    title = `Strecke ${sc.o}–${sc.d}, ${sc.freq || 1}× täglich ${tl(sc.type)} zu ${eur(sc.fare)}`;
    if (!x) { notes.push(SM.aptOk(sc.o, sc.d, sc.type) ? 'Außerhalb der Reichweite dieses Musters.' : SM.aptWhy(sc.o, sc.d, sc.type)); }
    else {
      const nAc = Math.max(1, Math.ceil(x.aircraftShare - 0.05)), M = acMonthly(sc.type, 'lease', x.rotationH * 0 + 10);
      one = sc.newAc ? M.oneTime * nAc : 0;
      month = sc.newAc ? (x.db1 * 30.4 - M.total * nAc) : x.db1 * 30.4;
      lines = [['Erlöse', x.revenue * 30.4, `${n0(x.pax)} Passagiere/Tag, ${pct(x.lf)} Auslastung`], ['Direkte Kosten', -(x.revenue - x.db1) * 30.4, 'Kerosin, Crew, Gebühren, Wartung'], ...(sc.newAc ? [['Flugzeug(e) neu', -M.total * nAc, `${nAc} × Leasing, Crew, Technik`], ['Einmalig', -one, 'Kaution']] : [['Flugzeugkosten', 0, 'vorhandenes Flugzeug (fällt ohnehin an)']])];
      notes.push('Prognose ohne Reaktion der Konkurrenz; neue Strecken brauchen etwa 30 Tage Anlauf.');
    }
  } else if (sc.k === 'close') {
    const x = D.routes.find((q) => q.r.id === sc.id);
    if (x) { title = `Strecke ${x.r.base}–${x.r.dest} einstellen`; month = -x.db1 * 30.4; lines = [['Wegfallender DB1', -x.db1 * 30.4, 'Erlöse minus direkte Kosten'], ['Flugzeug frei', 0, 'kostet weiter, bis es eingesetzt oder zurückgegeben ist']];
      if (x.db1 > 0) notes.push('Die Strecke deckt ihre direkten Kosten – einstellen lohnt nur, wenn das Flugzeug besser eingesetzt oder zurückgegeben wird.');
      const ac = pl.fleet.filter((a) => (a.assigned || []).includes(x.r.id)); if (ac.length) { const save = ac.reduce((s, a) => s + acDayCost(a), 0) * 30.4; lines.push(['Rückgabe der Flugzeuge (optional)', save, `${ac.length} Flugzeug${ac.length > 1 ? 'e' : ''}, Rückgabekosten beachten`]); notes.push(`Werden die Flugzeuge zurückgegeben, kommen ${eur(save)} im Monat hinzu (abzüglich einmaliger Rückgabekosten).`); }
    } else title = 'Strecke nicht gefunden';
  } else if (sc.k === 'fuel') {
    const p = (Number(sc.pct) || 0) / 100, fuel = D.v('fuel'), hedged = pl.hedge && pl.hedge.kgDay ? Math.min(1, pl.hedge.kgDay * 30.4 / Math.max(1, W.estFuelKgMonth(pl))) : pl.hedge && pl.hedge.share ? Math.min(1, pl.hedge.share) : 0;
    title = `Kerosinpreis ${p >= 0 ? '+' : ''}${Math.round(p * 100)} %`; month = -fuel * p * (1 - hedged);
    lines = [['Kerosinkosten heute', -fuel, 'pro Monat'], ['Veränderung', month, hedged ? `${pct(hedged)} abgesichert` : 'ohne Absicherung']];
  } else if (sc.k === 'loan') {
    const amt = Math.max(0, Number(sc.amount) || 0), yrs = [3, 5, 8].includes(Number(sc.years)) ? Number(sc.years) : 5, rm = D.loanRate / 12, nn = yrs * 12, ann = amt ? amt * rm / (1 - (1 + rm) ** -nn) : 0;
    title = `Kredit ${eur(amt)} über ${yrs} Jahre`; one = -amt; month = -ann;
    lines = [['Auszahlung', amt, `${pct(D.loanRate, 1)} Zins`], ['Rate', -ann, 'Zins und Tilgung pro Monat'], ['Zinsen gesamt', -(ann * nn - amt), 'über die Laufzeit']];
    if (amt > D.loanLimit + 1) notes.push(`Die Bank gibt bei Rating ${pl.rating} höchstens ${eur(D.loanLimit)}.`);
  }
  const base = D.cf30 !== null ? D.cf30 : D.net30;
  const after = D.free - one, proj = [], projB = [];
  for (let m = 0; m <= 6; m++) { projB.push(D.free + base * m); proj.push(after + (base + month) * m); }
  const minP = Math.min(...proj), payback = one > 0 && month > 0 ? one / month : null;
  const firstNeg = (arr) => { const i = arr.findIndex((x) => x < 0); return i < 0 ? null : i; }, mB = firstNeg(projB), mS = firstNeg(proj);
  let tag, verdict;
  if (sc.k === 'loan') { tag = month + base < 0 ? 'risk' : 'invest'; verdict = base <= 0 ? 'Der Kredit verschafft Luft, löst aber kein Ertragsproblem – nur mit Plan zur Profitabilität.' : `Tragbar: die Rate entspricht ${pct(-month / Math.max(1, base))} des heutigen Mittelzuflusses.`; }
  else if (after < 0) { tag = 'risk'; verdict = 'Nicht finanzierbar: schon die Einmalkosten übersteigen die verfügbare Liquidität.'; }
  else if (minP < 0 && mB !== null && month > 0) { tag = 'invest'; verdict = `Hilft, reicht aber allein nicht: Ohne Maßnahme wäre das Geld beim heutigen Abfluss in rund ${mB} Monaten aufgebraucht, mit ihr ${mS !== null ? `in ${mS}` : 'erst später'}. Das Ergebnis muss sich zusätzlich verbessern.`; }
  else if (minP < 0 && mB !== null) { tag = 'risk'; verdict = `Schon ohne diese Entscheidung reicht das Geld beim heutigen Abfluss nur rund ${mB} Monate – mit ihr ${mS !== null && mS < mB ? `nur noch ${mS}` : `ebenfalls rund ${mS ?? mB}`}. Erst das Ergebnis verbessern.`; }
  else if (minP < 0) { tag = 'risk'; verdict = `Nicht finanzierbar: in ${mS} Monaten wäre die Liquidität aufgebraucht.`; }
  else if (after < D.reserve) { tag = 'careful'; verdict = `Finanzierbar, aber danach unter der Reserve von ${eur(D.reserve)} (${eur(after)} verfügbar).`; }
  else if (month < 0 && sc.k !== 'close') { tag = 'careful'; verdict = `Belastet das Ergebnis mit ${eur(-month)} im Monat – nur strategisch sinnvoll.`; }
  else if (sc.k === 'close' || sc.k === 'fuel') { tag = month >= 0 ? 'cost' : 'risk'; verdict = month >= 0 ? `Verbessert das Monatsergebnis um ${eur(month)}.` : `Verschlechtert das Monatsergebnis um ${eur(-month)}.`; }
  else if (one > 0 && month <= 0) { tag = 'careful'; verdict = `Kostet einmalig ${eur(one)} und bringt nach dieser Rechnung (noch) keinen laufenden Überschuss – nur mit belastbarem Ertragsplan.`; }
  else if (payback !== null) { tag = payback <= 12 ? 'grow' : 'invest'; verdict = `Amortisiert sich nach rund ${n1(payback)} Monaten, die Reserve bleibt gewahrt.`; }
  else if (month > 0) { tag = 'grow'; verdict = `Verbessert das Monatsergebnis um ${eur(month)} ohne Einmalkosten.`; }
  else { tag = 'info'; verdict = 'Keine messbare Wirkung auf Liquidität und Ergebnis.'; }
  if (sc.k === 'route' && !lines.length) { tag = 'careful'; verdict = notes[0] || 'Diese Strecke lässt sich so nicht rechnen.'; }
  return { title, one, month, after, proj, projB, minP, payback, tag, verdict, lines, notes };
}
function projChart(a, b) {
  const all = a.concat(b), lo = Math.min(0, ...all), hi = Math.max(...all), W0 = 320, H0 = 90, px = (i) => 10 + i * (W0 - 20) / 6, py = (v) => H0 - 12 - (v - lo) / Math.max(1, hi - lo) * (H0 - 24);
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W0} ${H0}" class="cfo-chart" role="img" aria-label="Liquidität in den nächsten 6 Monaten"><line x1="10" x2="${W0 - 10}" y1="${py(0).toFixed(1)}" y2="${py(0).toFixed(1)}" class="zero"/>
    <path d="${path(b)}" class="base"/><path d="${path(a)}" class="scen"/>${a.map((v, i) => `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="2.4" class="scen"/>`).join('')}
    <text x="10" y="10" class="lbl">verfügbar heute bis in 6 Monaten</text></svg>`;
}
function scenForm(sc) {
  const pl = W.player, k = sc.k || 'aircraft';
  const types = Object.keys(P.AIRCRAFT_TYPES).filter((t) => !P.AIRCRAFT_TYPES[t].role && (!P.AIRCRAFT_TYPES[t].launch || W.day >= P.AIRCRAFT_TYPES[t].launch + 365));
  let f = '';
  if (k === 'aircraft') f = `<label class="f"><span>Muster</span><select id="cs-type">${types.map((t) => `<option value="${t}" ${t === sc.type ? 'selected' : ''}>${esc(tl(t))}</option>`).join('')}</select></label>
    <label class="f"><span>Art</span><select id="cs-mode"><option value="lease" ${sc.mode === 'lease' ? 'selected' : ''}>Leasing</option><option value="flex" ${sc.mode === 'flex' ? 'selected' : ''}>Flex-Leasing</option><option value="buy" ${sc.mode === 'buy' ? 'selected' : ''}>Kauf</option></select></label>
    <label class="f"><span>Anzahl</span><input type="number" id="cs-n" min="1" max="10" value="${sc.n || 1}"></label>
    <label class="f"><span>Erwarteter DB1 je Flugzeug und Tag (€)</span><input type="number" id="cs-db1" step="500" value="${sc.db1 ?? Math.max(0, Math.round(cfoData().db1Ac))}"></label>`;
  else if (k === 'base') f = `<label class="f"><span>Standort</span><select id="cs-apt">${SM.AP_CODES.filter((c) => !pl.bases.includes(c)).sort((a, b) => apName(a).localeCompare(apName(b))).map((c) => `<option value="${c}" ${c === sc.apt ? 'selected' : ''}>${esc(apName(c))} (${c})</option>`).join('')}</select></label>
    <label class="f"><span>Netzwert der Basis pro Tag, nach Basiskosten (€)</span><input type="number" id="cs-net" step="500" value="${sc.net ?? 0}"></label>`;
  else if (k === 'route') f = `<label class="f"><span>Von</span><select id="cs-o">${pl.bases.map((b) => `<option ${b === sc.o ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
    <label class="f"><span>Nach</span><select id="cs-d">${SM.AP_CODES.filter((c) => c !== sc.o).sort((a, b) => apName(a).localeCompare(apName(b))).map((c) => `<option value="${c}" ${c === sc.d ? 'selected' : ''}>${esc(apName(c))} (${c})</option>`).join('')}</select></label>
    <label class="f"><span>Muster</span><select id="cs-type">${types.map((t) => `<option value="${t}" ${t === sc.type ? 'selected' : ''} ${SM.rangeOk(sc.o, sc.d, t) ? '' : 'disabled'}>${esc(tl(t))}</option>`).join('')}</select></label>
    <label class="f"><span>Flüge/Tag</span><input type="number" id="cs-freq" min="1" max="6" value="${sc.freq || 1}"></label>
    <label class="f"><span>Tarif (€)</span><input type="number" id="cs-fare" min="10" step="5" value="${sc.fare || Math.round(SM.refPrice(sc.o, sc.d, cpi()))}"></label>
    <label class="chk" style="align-self:end"><input type="checkbox" id="cs-newac" ${sc.newAc ? 'checked' : ''}> <span>mit neuem Flugzeug</span></label>`;
  else if (k === 'close') f = `<label class="f"><span>Strecke</span><select id="cs-id">${pl.activeRoutes().map((r) => `<option value="${r.id}" ${r.id === sc.id ? 'selected' : ''}>${r.base}–${r.dest} ${r.freq}× ${tl(r.type_id)}</option>`).join('')}</select></label>`;
  else if (k === 'fuel') f = `<label class="f"><span>Veränderung Kerosinpreis (%)</span><input type="number" id="cs-pct" step="5" value="${sc.pct ?? 20}"></label>`;
  else if (k === 'loan') f = `<label class="f"><span>Betrag (€)</span><input type="number" id="cs-amount" step="100000" min="0" value="${sc.amount ?? 5000000}" inputmode="numeric" data-fmt="cs-amountf"><span class="small muted mono" id="cs-amountf">= ${eur(sc.amount ?? 5000000)}</span></label>
    <label class="f"><span>Laufzeit</span><select id="cs-years">${[3, 5, 8].map((y) => `<option ${y === (sc.years || 5) ? 'selected' : ''}>${y}</option>`).join('')}</select></label>`;
  return f;
}
const SCEN_K = [['aircraft', 'Flugzeug kaufen/leasen'], ['base', 'Neue Basis'], ['route', 'Neue Strecke'], ['close', 'Strecke einstellen'], ['fuel', 'Kerosinpreis'], ['loan', 'Kredit']];
function readScen() {
  const sc = ui.cfo.scen, g = (id) => $(id), num = (id) => (g(id) && g(id).value !== '' ? Number(g(id).value) : null);
  if (!sc) return;
  if (g('#cs-type')) sc.type = g('#cs-type').value; if (g('#cs-mode')) sc.mode = g('#cs-mode').value; if (g('#cs-n')) sc.n = num('#cs-n') || 1;
  if (g('#cs-db1')) sc.db1 = num('#cs-db1'); if (g('#cs-apt')) sc.apt = g('#cs-apt').value; if (g('#cs-net')) sc.net = num('#cs-net');
  if (g('#cs-o')) sc.o = g('#cs-o').value; if (g('#cs-d')) sc.d = g('#cs-d').value; if (g('#cs-freq')) sc.freq = num('#cs-freq') || 1; if (g('#cs-fare')) sc.fare = num('#cs-fare');
  if (g('#cs-newac')) sc.newAc = g('#cs-newac').checked; if (g('#cs-id')) sc.id = g('#cs-id').value; if (g('#cs-pct')) sc.pct = num('#cs-pct');
  if (g('#cs-amount')) sc.amount = num('#cs-amount'); if (g('#cs-years')) sc.years = num('#cs-years');
}
function defaultScen(k) {
  const pl = W.player, D = cfoData();
  if (k === 'aircraft') return { k, type: pl.fleet[0] ? pl.fleet[0].type_id : 'A20N', mode: 'lease', n: 1, db1: null };
  if (k === 'base') { const apt = SM.AP_CODES.find((c) => !pl.bases.includes(c) && (P.AIRPORTS[c].pax || 0) > 20);
    // ohne Studie: nur die Basiskosten (noch keine Strecken eingerechnet)
    return { k, apt, net: -Math.round((P.BASE_FIXED_DAY + P.TERMINALS.std.rent * SM.apx(apt).cost / 30.4) * cpi()) }; }
  if (k === 'route') { const o = curBase(), d = bestFreeDest(o); return { k, o, d, type: 'A20N', freq: 1, fare: Math.round(SM.refPrice(o, d, cpi())), newAc: !D.idle.length }; }
  if (k === 'close') return { k, id: pl.activeRoutes()[0] ? pl.activeRoutes()[0].id : '' };
  if (k === 'fuel') return { k, pct: 20 };
  return { k: 'loan', amount: Math.round(Math.min(5e6, D.loanLimit) / 1e5) * 1e5, years: 5 };
}
VIEWS.cfo = function viewCfo() {
  const D = cfoData(), pl = D.pl;
  ui.cfo = ui.cfo || {};
  const C = ui.cfo;
  if (!C.scen) C.scen = defaultScen('aircraft');
  const amp = (D.runway !== undefined && isFinite(D.runway) && D.runway < 90) || D.free < D.reserve * 0.5 ? 'crit' : D.net30 < 0 || D.free < D.reserve ? 'warn' : 'good';
  const tile = (l, v, e = '', cls = '') => `<div class="tile"><span>${l}</span><b class="${cls}">${v}</b>${e ? `<em>${e}</em>` : ''}</div>`;
  let html = `<div class="cfo-head"><div class="cfo-av">KV</div><div><b>${CFO.name}</b><span>${CFO.role} · rechnet mit Ihren echten Zahlen</span></div><span class="chip ${amp}" style="margin-left:auto">${amp === 'good' ? 'Lage stabil' : amp === 'warn' ? (D.free < D.reserve ? 'Reserve knapp' : 'im Minus, Polster vorhanden') : 'Liquidität kritisch'}</span></div>
    <div class="tiles">${tile('Verfügbar', eur(D.free), `Konto ${eur(D.cash)} + freier Dispo`)}${tile('Reserve-Ziel', eur(D.reserve), D.free >= D.reserve ? 'erfüllt' : 'unterschritten', D.free >= D.reserve ? 'pos' : 'neg')}${tile('Ergebnis 30 Tage', D.days ? sg0(D.net30) : '–', D.margin !== null ? `Marge ${pct(D.margin)}` : 'noch keine Erlöse')}
      ${tile('Fixkosten/Monat', eur(D.fixedM), 'Leasing, Gehälter, Stationen, Verwaltung')}${tile('Reichweite', D.runway !== undefined && isFinite(D.runway) && D.runway > 0 ? `${n0(D.runway)} Tage` : 'stabil', 'beim heutigen Abfluss')}${tile('Schulden', eur(D.debt), `Rating ${pl.rating} · Rahmen ${eur(D.loanLimit)}`)}</div>`;
  // Fragen
  html += `<div class="stack"><h2 class="sec">Fragen an die CFO</h2><div class="cfo-qs">${CFO_Q.map(([k, q]) => `<button class="btn small ${C.q === k ? 'primary' : ''}" data-act="cfoq" data-k="${k}">${esc(q)}</button>`).join('')}</div>`;
  if (C.q) { const a = cfoAnswer(C.q, D), [lbl, cls] = CFO_TAG[a.tag]; html += `<div class="cfo-chat"><div class="cfo-q">${esc(CFO_Q.find((x) => x[0] === C.q)[1])}</div><div class="cfo-a"><div class="spread"><b>${CFO.name}</b><span class="chip ${cls}">${lbl}</span></div>${a.html}${a.acts ? `<div class="row" style="gap:6px">${a.acts}</div>` : ''}<p class="small muted">Stand ${dateShort(W.day)} · Berechnungen aus Ihren Daten, keine Gewinngarantie.</p></div></div>`; }
  html += '</div>';
  // Szenarien
  const S = cfoScenario(C.scen, D), [lbl, cls] = CFO_TAG[S.tag];
  html += `<div class="stack"><h2 class="sec">Szenario-Rechner <small>was eine Entscheidung mit Liquidität und Ergebnis macht</small></h2>
    ${C.from === 'study' ? '<div class="callout info">Aus einer Marktstudie übernommen – Werte können Sie anpassen.</div>' : ''}
    <div class="seg">${SCEN_K.map(([k, l]) => `<button data-act="cfok" data-k="${k}" aria-pressed="${C.scen.k === k}">${l}</button>`).join('')}</div>
    <div class="grid3 cfo-form">${scenForm(C.scen)}</div>
    <div class="card pad stack cfo-res"><div class="spread"><b>${esc(S.title)}</b><span class="chip ${cls}">${lbl}</span></div>
      <div class="tiles">${tile('Einmalig', S.one ? eur(-S.one, { plus: true }) : '–', S.one < 0 ? 'Zufluss' : 'Abfluss')}${tile('Je Monat', sg0(S.month), 'Ergebniswirkung')}${tile('Danach verfügbar', eur(S.after), S.after < D.reserve ? 'unter der Reserve' : 'Reserve gewahrt', S.after < D.reserve ? 'neg' : 'pos')}${S.payback !== null ? tile('Amortisation', `${n1(S.payback)} Monate`) : ''}</div>
      ${S.lines.length ? `<div class="tw"><table class="t"><tbody>${S.lines.map(([l, x, e]) => `<tr><td>${esc(l)} <span class="small muted">${esc(e)}</span></td><td class="r">${sg0(x)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${projChart(S.proj, S.projB)}<div class="small muted"><span class="cfo-key scen"></span> mit Szenario · <span class="cfo-key base"></span> ohne (heutiger Mittelzufluss ${sg0(D.cf30 !== null ? D.cf30 : D.net30)} im Monat)</div>
      <p><b>Einschätzung:</b> ${esc(S.verdict)}</p>${S.notes.map((x) => `<p class="small muted">${esc(x)}</p>`).join('')}
      <div class="row" style="gap:6px"><button class="btn small" data-act="cfosave">Szenario merken</button>${(C.saved || []).length ? '<button class="btn small" data-act="cfoclear">Vergleich leeren</button>' : ''}</div></div>`;
  if ((C.saved || []).length) {
    const rows = C.saved.map((sc) => ({ sc, r: cfoScenario(sc, D) }));
    html += `<div class="tw"><table class="t"><thead><tr><th>Vergleich</th><th class="r">Einmalig</th><th class="r">Je Monat</th><th class="r">Danach verfügbar</th><th class="r">Tiefster Stand (6 M.)</th><th>Urteil</th></tr></thead><tbody>${rows.map(({ r }) => `<tr><td>${esc(r.title)}</td><td class="r">${r.one ? eur(-r.one, { plus: true }) : '–'}</td><td class="r">${sg0(r.month)}</td><td class="r ${r.after < D.reserve ? 'neg' : ''}">${eur(r.after)}</td><td class="r ${r.minP < 0 ? 'neg' : ''}">${eur(r.minP)}</td><td><span class="chip ${CFO_TAG[r.tag][1]}">${CFO_TAG[r.tag][0]}</span></td></tr>`).join('')}</tbody></table></div>`;
  }
  html += '</div><p class="small muted">Die CFO trifft keine Entscheidungen und führt nichts aus – sie rechnet und empfiehlt. Prognosen beruhen auf den letzten 30 Tagen und dem Prognosemodell der Streckenplanung.</p>';
  return html;
};
function onCfoClick(act, b) {
  ui.cfo = ui.cfo || {};
  const C = ui.cfo;
  if (act === 'cfoq') { C.q = C.q === b.dataset.k ? null : b.dataset.k; renderPane(true); return true; }
  if (act === 'cfok') { readScen(); C.scen = defaultScen(b.dataset.k); C.from = null; renderPane(true); return true; }
  if (act === 'cfoscen') {
    const d = b.dataset, k = d.k;
    C.scen = k === 'aircraft' ? { k, type: d.type, mode: 'lease', n: 1, db1: null } : k === 'base' ? { k, apt: d.apt, net: Number(d.net) || 0 } : k === 'route' ? { k, o: d.o, d: d.d, type: d.type, fare: Number(d.fare), freq: 1, newAc: true } : k === 'close' ? { k, id: d.id } : k === 'loan' ? { k, amount: Number(d.amount), years: 5 } : defaultScen(k);
    C.from = null; renderPane(true);
    const el = document.querySelector('.cfo-res'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    return true;
  }
  if (act === 'cfosave') { readScen(); C.saved = (C.saved || []).concat([{ ...C.scen }]).slice(-4); renderPane(true); toast('Szenario für den Vergleich gemerkt.'); return true; }
  if (act === 'cfoclear') { C.saved = []; renderPane(true); return true; }
  return false;
}
function onCfoChange(t) {
  if (!/^cs-/.test(t.id)) return false;
  readScen();
  const sc = ui.cfo.scen;
  if (sc.k === 'route' && (t.id === 'cs-o' || t.id === 'cs-d')) { if (!SM.rangeOk(sc.o, sc.d, sc.type)) sc.type = ['A20N', 'A21N', 'B789', 'A359'].find((x) => SM.rangeOk(sc.o, sc.d, x)) || sc.type; sc.fare = Math.round(SM.refPrice(sc.o, sc.d, cpi())); }
  renderPane(true); return true;
}

function onPaneChange(e) {
  const t = e.target, pl = W.player;
  if (onCabRange(e, true) || onFltChange(t)) return;
  if (t.id === 'hire-start') { ui.hireStart = t.value ? Number(t.value) : null; renderPane(true); return; }
  if (t.id === 'hire-in') { const v = Math.round(Number(t.value)); ui.hireStart = v > 0 ? W.day + Math.min(180, v) : null; renderPane(true); return; }
  if (t.dataset && t.dataset.planauto) { doAction({ type: 'planAuto', id: t.dataset.planauto, on: t.checked }); refreshAll(); return; }
  if (t.dataset && t.dataset.exnca) { doAction({ type: 'expertContract', id: t.dataset.exnca, kind: 'nca', v: t.checked }); refreshAll(); return; }
  if (t.dataset && t.dataset.ap) { const pl = W.player; doAction({ type: 'autoPrice', id: t.dataset.ap, on: t.checked, lf: pl.apDefault || pl.apLf || 0.85, cfg: t.checked ? SM.apCfgOf(null, pl.apCfg) : undefined }); refreshAll(); return; }
  if (t.id === 'hist-view') { ui.hist = ui.hist || { mode: 'd30' }; ui.hist.view = t.value || null; ui.hist.sel = null; if (ui.hist.mode === 'm') ui.hist.mode = 'd30'; renderPane(true); return; }
  if (onMarketChange(t) || onDealChange(t) || onAssignChange(t) || onLogoChange(t) || onHardChange(t) || onStudyChange(t) || onCfoChange(t)) return;
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
  if (changed || e.target.id === 'pl-type' || e.target.id === 'pl-term' || e.target.id === 'pl-freq') { renderPane(true); renderDraft(); renderMapRoutes(true); return; }
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
  const sel = { base: 'HAJ', diff: 'normal', rivals: 'normal', asst: 'lena', speed: 'x1' };
  const baseInfo = (c) => { const a = P.AIRPORTS[c], fake = { macro: { cpi: 1 } }, S = P.SLOT_RULE, slot = S.priceBase * Math.max(0.3, a.pax || 0.3) ** S.priceExp, big = (a.pax || 0) > SM.CAREER.startMaxPax;
    return `<b>${c} · ${esc(apName(c))}</b> (${NF1.format(a.pax || 0)} Mio. Passagiere): Lizenz ${eur(SM.licenceFee(fake, c))} · Basis ${eur(SM.baseDayCost(c) * 30.4)}/Monat · Slot ab ${eur(slot)}${SM.incentiveAt(c) > 0.05 ? ` · Anlaufrabatt ${pct(SM.incentiveAt(c))} auf Entgelte` : ''}. ${big ? '<span class="warnc">Großer Flughafen: teuer, starke Konkurrenz, Slots knapp.</span>' : '<span class="pos">Regionalflughafen: günstiger Einstieg.</span>'}`; };
  const m = $('#modal');
  m.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgT">
    <div><h1 id="dlgT">Sky<span>market</span></h1><p class="ink2">Gründen Sie eine Airline und bauen Sie ein Netz über ${SM.AP_CODES.length} Flughäfen auf allen Kontinenten auf. Sie beschaffen Flugzeuge, Personal, Kerosin und Terminalflächen selbst. ${Object.keys(SM.AI_SETUP).length} Konkurrenten, die auf jeden Ihrer Schritte reagieren, Konjunkturzyklen, Ölkrisen, Handelskriege, Streiks und Wetter machen es Ihnen schwer.</p></div>
    ${usable ? `<div class="callout info"><b>Gespeichertes Spiel: ${esc(save.name)}</b><span>${dateLong(save.day)} · ${save.where}</span><div class="row"><button class="btn primary" id="dlgLoad">Weiterspielen</button></div></div>` : ''}
    ${save && !usable ? `<div class="callout warn">Ihr Spielstand stammt aus einer älteren Version und passt nicht mehr zur neuen Weltkarte. Bitte neu gründen.</div>` : ''}
    <div class="grid2"><label class="f"><span>Name der Airline</span><input type="text" id="ngName" maxlength="28" value="Hanse Air"></label>
      <label class="f"><span>Kürzel (2 Zeichen)</span><input type="text" id="ngCode" maxlength="2" value="HX" style="text-transform:uppercase"></label></div>
    ${basePicker('ng', sel.base)}
    <p class="small muted">${SM.AP_CODES.length} Flughäfen weltweit. Regionalflughäfen (bis ${SM.CAREER.startMaxPax} Mio. Passagiere) sind der günstige Einstieg: niedrige Lizenz, billige Slots, Anlaufrabatte. Großflughäfen kosten ein Vermögen: Lizenz klein bis 100 Tsd. €, mittel bis 500 Tsd. €, groß 1–2 Mio. €, Drehkreuz 2,5–4 Mio. €. In einer KI-Basis treffen Sie vom ersten Tag auf starke Konkurrenz; in Afrika sind die Märkte klein.</p>
    <div class="stack"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Schwierigkeit</span><div class="seg wrap" id="ngDiff">
      ${Object.entries(SM.DIFFICULTY).map(([k, d]) => `<button type="button" data-diff="${k}" aria-pressed="${k === sel.diff}">${d.label} · ${n0(d.equity / 1e6)} Mio. €</button>`).join('')}</div>
      <p class="small muted">Zugänglich: mehr Kapital, mildere Zyklen. Realistisch: knappes Kapital, spürbare Krisen. Experte: wenig Kapital, tiefe Krisen.</p></div>
    ${rivalsPicker('ng', sel.rivals)}
    <div class="stack"><span class="small muted" style="text-transform:uppercase;letter-spacing:.07em;font-size:10.5px">Tempo</span><div class="seg wrap" id="ngSpeed">
      ${['h1', 'm10', 'm1', 'x1'].map((k) => `<button type="button" data-speed="${k}" aria-pressed="${k === sel.speed}">${SM.SPEEDS[k].label}</button>`).join('')}</div>
      <p class="small muted">Die langsamen Stufen (1 Stunde, 10 Minuten oder 1 Minute pro Spieltag) sind für längere Partien: Beim nächsten Öffnen holt das Spiel die verpasste Zeit nach. Die schnellen Stufen laufen nur, solange das Spiel offen ist. Das Tempo lässt sich oben jederzeit ändern.</p></div>
    ${assistantPicker('ng', sel.asst)}
    <div class="formbar"><div class="row">${canClose ? '<button class="btn" id="dlgCancel">Zurück zum Spiel</button>' : ''}${ONLINE ? '<button class="btn" id="dlgOnline">Online spielen</button>' : ''}<button class="btn primary" id="dlgStart" style="margin-left:auto">Airline gründen</button></div></div>
  </div>`;
  m.hidden = false;
  m.onclick = async (e) => {
    const bb = e.target.closest('[data-base]'); if (bb) { sel.base = bb.dataset.base; for (const x of m.querySelectorAll('[data-base]')) x.setAttribute('aria-pressed', String(x === bb)); const bi = $('#ngBaseInfo'); if (bi) bi.innerHTML = baseInfo(sel.base); }
    const db = e.target.closest('[data-diff]'); if (db) { sel.diff = db.dataset.diff; for (const x of m.querySelectorAll('[data-diff]')) x.setAttribute('aria-pressed', String(x === db)); }
    const rb = e.target.closest('[data-rivals]'); if (rb) { sel.rivals = rb.dataset.rivals; for (const x of m.querySelectorAll('[data-rivals]')) x.setAttribute('aria-pressed', String(x === rb)); }
    const sb = e.target.closest('[data-speed]'); if (sb) { sel.speed = sb.dataset.speed; for (const x of m.querySelectorAll('[data-speed]')) x.setAttribute('aria-pressed', String(x === sb)); }
    const ab = e.target.closest('[data-asst-id]'); if (ab) { sel.asst = ab.dataset.asstId; for (const x of m.querySelectorAll('[data-asst-id]')) x.setAttribute('aria-pressed', String(x === ab)); }
    if (e.target.id === 'dlgCancel') m.hidden = true;
    if (e.target.id === 'dlgOnline') { if (mpState.user) showLobby(); else showAuth(); return; }
    if (e.target.id === 'dlgLoad') {
      try { W = SM.deserialize(await unpack(save)); } catch (err) { toast('Der Spielstand ließ sich nicht lesen.'); return; }
      resetUi(); ui.lastSaveDay = W.day; m.hidden = true;
      const snap0 = snapOf(W.player);
      const days = resumeLocal(save);
      startWorld();
      if (!asst()) showAssistantPick();
      else if (days > 0) awayReport(days, snap0);
      else toast('Spielstand geladen.');
    }
    if (e.target.id === 'dlgStart') {
      const name = ($('#ngName').value || 'Hanse Air').trim().slice(0, 28);
      const code = (($('#ngCode').value || 'HX').trim().toUpperCase() + 'XX').slice(0, 2);
      W = SM.newGame({ name, code, base: $('#ngBase').value || sel.base, difficulty: sel.diff, rivals: sel.rivals });
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
  if (ui.gameOverShown) return; ui.gameOverShown = true; if (!ui.mp) setSpeed(0);
  const pl = W.player, endDay = (pl.events.find((e) => e.msg === 'Insolvenz') || { day: W.day }).day, worst = pl.routes.map((r) => ({ r, s: rstats(r, 60) })).sort((a, b) => a.s.db2 - b.s.db2).slice(0, 3);
  const m = $('#modal');
  m.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h1>Insolvenz</h1>
    <p>${esc(pl.name)} hat nach ${endDay} Tagen am ${dateLong(endDay)} den Flugbetrieb eingestellt. Die Kreditlinie war ausgeschöpft und der Kontostand blieb ${P.RESTRUCT.humanDays} Tage negativ.</p>
    ${pl.liq ? `<div class="callout info"><b>Abwicklung</b>${[pl.liq.own ? `${pl.liq.own} eigene Flugzeuge gehen mit Abschlag an den Gebrauchtmarkt` : '', pl.liq.lease ? `${pl.liq.lease} Leasingflugzeuge vermieten die Leasinggeber günstig weiter` : '', pl.liq.slots ? `${pl.liq.slots} Slots werden frei` : '', pl.liq.staff ? `${pl.liq.staff} Beschäftigte suchen neue Jobs` : '', pl.liq.experts ? `${pl.liq.experts} Fachkräfte stehen wieder auf dem Markt` : ''].filter(Boolean).join(' · ') || 'Es gab nichts mehr zu verwerten.'}. Andere Airlines – auch Ihre nächste – können sich daran bedienen.</div>` : ''}
    ${worst.length ? `<div class="stack"><h3>Die größten Verlustbringer zuletzt</h3><table class="t"><tbody>${worst.map(({ r, s }) => `<tr><td>${r.base}–${r.dest} ${freqTxt(r)} ${tl(r.type_id)}</td><td class="r">${pct(s.lf)} Auslastung</td><td class="r neg">${eur(s.n ? s.db2 / s.n : 0)} pro Tag</td></tr>`).join('')}</tbody></table></div>` : ''}
    <p class="small muted">Typische Ursachen: zu große Flugzeuge für den Markt, Strecken mit starker Bahnkonkurrenz, ungenutzte Flugzeuge, dauerhaft Agenturpersonal, Preiskampf gegen Low-Cost-Airlines, ungesicherter Ölpreisschock.</p>
    <div class="callout good"><b>Kein Grund aufzuhören.</b> Gründen Sie ${ui.mp ? 'in derselben Welt' : 'in dieser Welt'} eine neue Airline mit frischem Startkapital – Markt und Konkurrenz laufen einfach weiter.</div>
    <div class="row"><button class="btn primary" id="goRestart">Neue Airline gründen</button><button class="btn" id="goNew">${ui.mp ? 'Zur Lobby' : 'Ganz neues Spiel'}</button></div></div>`;
  m.hidden = false;
  m.onclick = (e) => {
    if (e.target.id === 'goRestart') showRestart(false);
    else if (e.target.id === 'goNew') { if (ui.mp || ONLINE) { if (mpState.user) showLobby(); else showAuth(); } else showStart(false); }
  };
}
/** Neustart: nach der Insolvenz oder freiwillig eine neue Airline in derselben Welt gründen. */
function showRestart(voluntary) {
  const pl = W.player, eq = (SM.DIFFICULTY[pl.difficulty] || SM.DIFFICULTY.normal).equity;
  const others = new Set(W.humans.filter((h) => h.id !== pl.id).map((h) => h.code));
  const m = modal(`<h1>${voluntary ? 'Airline aufgeben' : 'Neustart'}</h1>
    <p class="ink2">${voluntary ? `<b>${esc(pl.name)}</b> wird abgewickelt: Leasingflugzeuge gehen zurück, eigene werden verwertet, Strecken, Personal, Slots und offene Angebote verfallen. ` : ''}Ihre neue Airline startet ${ui.mp ? 'in derselben Welt' : 'in dieser Welt'} am ${dateLong(W.day)} mit <b>${eur(eq)}</b> Startkapital. Ihre Assistenz bleibt an Bord.</p>
    <form id="rsForm" class="stack">
      ${airlineFields('rs', '', '', pl.bases[0], bpCtx(null, true))}
      ${others.size ? `<p class="small muted">Schon vergeben: ${[...others].map(esc).join(', ')}</p>` : ''}
      ${voluntary ? `<label class="chk"><input type="checkbox" id="rsOk"> <span>Ja, ich gebe ${esc(pl.name)} endgültig auf.</span></label>` : ''}
      <div class="formbar"><p class="small neg" id="formErr" hidden></p>
      <div class="row"><button class="btn" type="button" id="rsBack">${voluntary ? 'Abbrechen' : 'Zurück'}</button><button class="btn primary" type="submit" style="margin-left:auto">Neu gründen</button></div></div>
    </form>`);
  $('#rsName').placeholder = 'z. B. ' + (pl.name.endsWith(' II') ? pl.name.slice(0, -3) + ' III' : pl.name + ' II');
  $('#rsBack').addEventListener('click', () => { if (voluntary) m.hidden = true; else { ui.gameOverShown = false; gameOver(); } });
  $('#rsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = readAirline('rs');
    if (a.name.length < 2) return formError('Bitte einen Namen mit mindestens 2 Zeichen angeben.');
    if (!/^[A-Z0-9]{2}$/.test(a.code)) return formError('Das Kürzel braucht genau 2 Buchstaben oder Ziffern.');
    if (others.has(a.code)) return formError(`Das Kürzel ${a.code} ist schon vergeben.`);
    if (voluntary && !$('#rsOk').checked) return formError('Bitte bestätigen Sie, dass Sie die Airline aufgeben.');
    try {
      if (ui.mp) {
        await api(`/games/${ui.mp.id}/restart`, { body: { airline: a, force: voluntary } });
        m.hidden = true; ui.gameOverShown = false; mpState.ver = ''; mpState.busy = false;
        await mpPoll(true);
        api(`/games/${ui.mp.id}/info`).then((info) => { mpState.info = info; mpState.players = info.players; renderLegend(); }).catch(() => {});
      } else {
        const r = SM.restartHuman(W, W.playerId, a);
        if (!r.ok) return formError(r.msg);
        m.hidden = true;
        const keep = { hintSeen: ui.hintSeen }; resetUi(); Object.assign(ui, keep); startWorld(); saveGame(false);
      }
      ui.logo = null;
      toast(`${a.name} ist gegründet – viel Erfolg beim zweiten Anlauf!`);
      if (asst()) bubble('good', `Neuer Anlauf mit <b>${esc(a.name)}</b>. Mein Rat: klein anfangen – zwei, drei Flugzeuge auf Strecken mit viel Nachfrage und wenig Konkurrenz, und den Kontostand im Blick behalten.`, { noPre: true, title: 'Neustart', btn: '<button class="btn small primary" data-act="tab" data-tab="plan">Strecke planen</button>' });
    } catch (err) { formError(err.message); }
  });
}

// ---------------------------------------------------------------------------
// Online: Anmeldung, Lobby, gemeinsames Spiel (Server rechnet, Browser zeigt an)
// ---------------------------------------------------------------------------
const ONLINE = !!window.SKYMARKET_ONLINE;
const mpState = { user: null, ver: '', clock: null, skew: 0, timer: null, busy: 0, sess: 1, players: [], lastPing: 0, lastInfo: 0, pendingJoin: null, info: null, noAirline: false, timing: null };
// ---------- Fehlerprotokoll für die Spielleitung (nur online): Ladeprobleme und Abstürze mit Gerät und Zeiten ----------
const DIAG = { n: 0, seen: new Set() };
function diag(kind, err, extra = {}) {
  if (!ONLINE || !mpState.user) return;
  const msg = String((err && err.message) || '').slice(0, 300), key = kind + '|' + msg;
  if (kind !== 'load' && DIAG.seen.has(key)) return;
  DIAG.seen.add(key); if (++DIAG.n > 15) return;
  const nav = navigator || {};
  const body = { kind, msg, stack: err && err.stack ? String(err.stack).slice(0, 1500) : null, status: err && err.status != null ? err.status : null, detail: err && err.detail ? String(err.detail).slice(0, 300) : null,
    build: window.SKYMARKET_BUILD || '', ua: String(nav.userAgent || '').slice(0, 250), mem: nav.deviceMemory || null, scr: `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}`,
    conn: nav.connection ? nav.connection.effectiveType || null : null, vis: document.visibilityState, game: ui.mp ? ui.mp.id : (extra.game || null), day: W ? W.day : null, extra };
  try { fetch('/api/diag', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin', keepalive: true }).catch(() => {}); } catch (e) { /* egal */ }
}
/** Merker „lädt gerade“: Startet die Seite während des Ladens neu (Handy wirft den Tab aus dem Speicher), wird das beim nächsten Öffnen gemeldet. */
const LOAD_MARK = 'skymarket-loading';
function setLoadMark(id) { try { sessionStorage.setItem(LOAD_MARK, JSON.stringify({ id, t: Date.now() })); } catch (e) { /* privat */ } }
function clearLoadMark() { try { sessionStorage.removeItem(LOAD_MARK); } catch (e) { /* privat */ } }
function checkLoadMark() { try { const x = JSON.parse(sessionStorage.getItem(LOAD_MARK) || 'null'); clearLoadMark(); if (x && Date.now() - x.t < 10 * 60000) diag('reload', null, { game: x.id, secs: Math.round((Date.now() - x.t) / 1000) }); } catch (e) { /* privat */ } }
addEventListener('error', (e) => { if (ui.mp) diag('js', e.error || { message: e.message }, { src: e.filename, line: e.lineno }); });
addEventListener('unhandledrejection', (e) => { if (ui.mp) diag('js', e.reason instanceof Error ? e.reason : { message: String(e.reason) }); });
async function api(path, opts = {}) {
  // Zeitlimit: hängende Anfragen (Handy im Funkloch, App im Hintergrund) blockieren sonst das Laden
  const ctl = !opts.signal && opts.timeout && typeof AbortController !== 'undefined' ? new AbortController() : null;
  const tm = ctl ? setTimeout(() => ctl.abort(), opts.timeout) : null;
  let r;
  try {
    r = await fetch('/api' + path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: opts.body ? { 'content-type': 'application/json' } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: 'same-origin', cache: 'no-store', signal: opts.signal || (ctl ? ctl.signal : undefined) });
  } catch (e) {
    const aborted = (opts.signal && opts.signal.aborted) || (ctl && ctl.signal.aborted);
    throw Object.assign(new Error(aborted ? 'Zeitüberschreitung – die Verbindung ist gerade sehr langsam.' : 'Keine Verbindung zum Server.'), { status: 0, net: true, detail: String((e && e.message) || e) });
  } finally { if (tm) clearTimeout(tm); }
  if (opts.raw) return r;
  let data = null; try { data = await r.json(); } catch (e) { /* leer */ }
  if (!r.ok) throw Object.assign(new Error((data && data.error) || `Fehler ${r.status}`), { status: r.status, data });
  return data;
}
async function gunzipToText(buf) {
  const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(ds).text();
}
function baseSelect(id, sel = 'HAJ') {
  return `<select id="${id}">${byRegion(SM.AP_CODES).map(([rg, l]) => `<optgroup label="${esc(rg)}">${l.map((c) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${esc(apName(c))} (${c}) · ${NF1.format(P.AIRPORTS[c].pax || 0)} Mio. Pax · Lizenz ${eur(SM.licenceFee({ macro: { cpi: 1 } }, c))}</option>`).join('')}</optgroup>`).join('')}</select>`;
}
const airlineFields = (prefix, name = '', code = '', base = 'HAJ', ctx = null) => `<div class="grid2">
  <label class="f"><span>Name Ihrer Airline</span><input type="text" id="${prefix}Name" maxlength="28" value="${esc(name)}" placeholder="z. B. Hanse Air"></label>
  <label class="f"><span>Kürzel (2 Zeichen)</span><input type="text" id="${prefix}Code" maxlength="2" value="${esc(code)}" placeholder="HX" style="text-transform:uppercase"></label></div>
  ${basePicker(prefix, base, ctx)}`;
// ---------- Heimatbasis finden: Filter nach Größe, Region, Kosten und Konkurrenz ----------
const BP = {};
const BP_SIZE = [['all', 'Alle Größen'], ['s', 'Klein · bis 8 Mio.'], ['m', 'Mittel · 8–20 Mio.'], ['l', 'Groß · 20–50 Mio.'], ['x', 'Drehkreuz · über 50 Mio.']];
const BP_SORT = { pax: ['Größe', (c) => -(P.AIRPORTS[c].pax || 0)], lic: ['Eröffnungskosten', (c) => bpCost(c).lic + bpCost(c).slots3], base: ['Basiskosten', (c) => bpCost(c).base], slot: ['Slotpreis', (c) => bpCost(c).slot],
  fee: ['Entgelte je Gast', (c) => bpCost(c).fee], comp: ['wenig Konkurrenz', (c, st) => bpComp(c, st).n * 1000 - (P.AIRPORTS[c].pax || 0)], name: ['Name', null] };
const bpSize = (c) => { const x = P.AIRPORTS[c].pax || 0; return x <= SM.CAREER.startMaxPax ? 's' : x <= 20 ? 'm' : x <= 50 ? 'l' : 'x'; };
const BP_COST = new Map();
function bpCost(c) {
  if (BP_COST.has(c)) return BP_COST.get(c);
  const a = P.AIRPORTS[c], S = P.SLOT_RULE, fake = { macro: { cpi: 1 } };
  const v = { lic: SM.licenceFee(fake, c), base: SM.baseDayCost(c) * 30.4, slot: S.priceBase * Math.max(0.3, a.pax || 0.3) ** S.priceExp, slots3: SM.baseSlotCost(fake, c), fee: (a.paxfee || 0) + (a.tax || 0), inc: SM.incentiveAt(c) };
  BP_COST.set(c, v); return v;
}
/** Konkurrenz an einem Flughafen: KI-Basen (aus der laufenden Welt oder der Startaufstellung) und Mitspielende, die dort starten. */
function bpCtx(extra = null, useWorld = false) {
  const ai = {}, hum = {};
  if (useWorld && W && W.list) {
    for (const al of W.list) { if (al.status === 'insolvent' || al.removed || al.mergedInto) continue; if (al.archetype) for (const b of al.bases) (ai[b] = ai[b] || []).push(al.name); else if (al.id !== W.playerId) (hum[al.bases[0]] = hum[al.bases[0]] || []).push(al.name); }
  } else for (const [, x] of Object.entries(SM.AI_SETUP)) (ai[x[2]] = ai[x[2]] || []).push(x[0]);
  if (extra) for (const r of extra) if (r && r.base) { const l = (hum[r.base] = hum[r.base] || []); if (!l.includes(r.name)) l.push(r.name); }
  return { ai, hum };
}
function bpComp(c, st = null) { const x = (st && st.ctx) || { ai: {}, hum: {} }; const ai = x.ai[c] || [], hum = x.hum[c] || []; return { ai, hum, n: ai.length + hum.length }; }
function baseInfoHtml(c, st = null) {
  const a = P.AIRPORTS[c], k = bpCost(c), sz = bpSize(c), cp = bpComp(c, st);
  return `<div class="bp-selhead"><b class="mono">${c}</b><div style="min-width:0"><b>${esc(apName(c))}</b> <span class="small muted">${esc(SM.COUNTRY_LABEL[a.country] || a.country)} · ${esc(a.region)}</span>
      <div class="small">${NF1.format(a.pax || 0)} Mio. Passagiere im Jahr · Einzugsgebiet ${NF1.format(a.pop || 0)} Mio. Menschen</div></div>
      <div class="bp-total" title="Wird bei der Eröffnung sofort vom Startkapital abgezogen"><span>Bei Eröffnung fällig</span><b>${eur(k.lic + k.slots3)}</b><em>Lizenz ${eurB(k.lic)} + ${P.BASE_SLOTS.n} Slots ${eurB(k.slots3)}</em><em>danach ${eurB(k.base)} im Monat</em></div></div>
    <div class="bp-kpis"><div><span>Lizenz beim Start</span><b>${eur(k.lic)}</b></div><div title="Drei Slots am Basisflughafen gehören zur Gründung – damit sind die ersten drei täglichen Abflüge sicher. Weitere Slots kosten je nach Knappheit mehr."><span>${P.BASE_SLOTS.n} Basis-Slots</span><b>${eur(k.slots3)}</b></div><div><span>Basis im Monat</span><b>${eur(k.base)}</b></div><div><span>Entgelte + Steuer je Gast</span><b>${eur(k.fee)}</b></div><div title="Neue Strecken: Nachlass auf Passagierentgelte im ersten Jahr – nur an kleinen und mittleren Flughäfen"><span>Anlaufrabatt</span>${k.inc > 0.005 ? `<b class="pos">${pct(k.inc)}</b>` : '<b class="muted">keiner</b>'}</div></div>
    <div class="small">${sz === 's' ? '<span class="pos">Regionalflughafen: günstiger Einstieg, kleine Märkte, wenig Slotdruck.</span>' : sz === 'm' ? '<span class="ink2">Mittlerer Flughafen: solide Nachfrage, spürbare Kosten.</span>' : '<span class="warnc">Großer Flughafen: teuer, starke Konkurrenz, Slots knapp, kein Anlaufrabatt – am Anfang ein großes Risiko.</span>'}
      ${cp.ai.length ? ` · KI-Basis: <b>${cp.ai.map(esc).join(', ')}</b>` : ' · keine KI-Basis'}${cp.hum.length ? ` · Hier starten auch: <b>${cp.hum.map(esc).join(', ')}</b>` : ''}</div>`;
}
function basePicker(prefix, sel = 'HAJ', ctx = null) {
  if (!P.AIRPORTS[sel]) sel = 'HAJ';
  const st = BP[prefix] = { sel, q: '', size: 'all', region: 'all', noAi: false, inc: false, sort: 'pax', ctx: ctx || bpCtx() };
  return `<div class="bp stack" data-bp="${prefix}"><input type="hidden" id="${prefix}Base" value="${sel}">
    <span class="bp-lbl">Heimatbasis – wichtige Entscheidung: Kosten, Markt und Konkurrenz hängen daran</span>
    <div class="bp-sel" id="${prefix}BPsel">${baseInfoHtml(sel, st)}</div>
    <div class="bp-tools">
      <input type="search" data-bpq placeholder="Flughafen, Stadt, Land oder Code suchen" aria-label="Flughafen suchen">
      <div class="seg wrap bp-seg" role="group" aria-label="Größe">${BP_SIZE.map(([k, l]) => `<button type="button" data-bpsize="${k}" aria-pressed="${k === 'all'}">${l}</button>`).join('')}</div>
      <div class="seg wrap bp-seg" role="group" aria-label="Region"><button type="button" data-bpreg="all" aria-pressed="true">Alle Regionen</button>${SM.REGION_ORDER.filter((r) => SM.AP_CODES.some((c) => P.AIRPORTS[c].region === r)).map((r) => `<button type="button" data-bpreg="${esc(r)}" aria-pressed="false">${esc(r)}</button>`).join('')}</div>
      <div class="row small bp-opts"><label class="chk"><input type="checkbox" data-bpopt="noAi"> ohne KI-Basis</label><label class="chk"><input type="checkbox" data-bpopt="inc"> mit Anlaufrabatt</label>
        <label class="row" style="gap:6px;margin-left:auto">Sortieren <select data-bpsort>${Object.entries(BP_SORT).map(([k, [l]]) => `<option value="${k}" ${k === 'pax' ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div></div>
    <div class="bp-list" id="${prefix}BPlist">${bpListHtml(st)}</div></div>`;
}
function bpListHtml(st) {
  const q = st.q.trim().toLowerCase();
  let l = SM.AP_CODES.filter((c) => {
    const a = P.AIRPORTS[c];
    if (st.size !== 'all' && bpSize(c) !== st.size) return false;
    if (st.region !== 'all' && a.region !== st.region) return false;
    if (st.noAi && bpComp(c, st).ai.length) return false;
    if (st.inc && !(bpCost(c).inc > 0.05)) return false;
    if (q && !(c.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (SM.COUNTRY_LABEL[a.country] || '').toLowerCase().includes(q))) return false;
    return true;
  });
  const f = BP_SORT[st.sort] && BP_SORT[st.sort][1];
  l.sort(f ? (x, y) => f(x, st) - f(y, st) || apName(x).localeCompare(apName(y), 'de') : (x, y) => apName(x).localeCompare(apName(y), 'de'));
  const total = l.length; l = l.slice(0, 120);
    const hl = (k, txt) => (st.sort === k ? `<b>${txt}</b>` : txt);
  return (l.length ? l.map((c) => { const a = P.AIRPORTS[c], k = bpCost(c), cp = bpComp(c, st), sz = bpSize(c);
    return `<button type="button" class="bp-row" data-bpa="${c}" aria-pressed="${c === st.sel}"><b class="mono">${c}</b><span class="bp-n"><span>${esc(apName(c))} <span class="muted">· ${esc(SM.COUNTRY_LABEL[a.country] || a.country)}</span></span>
      <span class="bp-m">${hl('pax', NF1.format(a.pax || 0) + ' Mio. Pax')} · <b>Eröffnung ${hl('lic', eurC(k.lic + k.slots3))}</b> · Basis ${hl('base', eurC(k.base))}/Mon. · Slot ${hl('slot', eurC(k.slot))} · Entgelte ${hl('fee', eurC(k.fee))}${k.inc > 0.05 ? ` · <span class="pos">Rabatt ${pct(k.inc)}</span>` : ''}</span></span>
      <span class="bp-tags"><span class="chip ${sz === 's' ? 'good' : sz === 'm' ? '' : 'warn'}">${sz === 's' ? 'klein' : sz === 'm' ? 'mittel' : sz === 'l' ? 'groß' : 'Drehkreuz'}</span>${cp.ai.length ? `<span class="chip" title="${esc(cp.ai.join(', '))}">KI ${cp.ai.length}</span>` : ''}${cp.hum.length ? `<span class="chip me" title="${esc(cp.hum.join(', '))}">${cp.hum.length} Spieler</span>` : ''}</span></button>`; }).join('')
    : '<p class="small muted" style="padding:8px">Kein Flughafen passt zu diesen Filtern.</p>') + `<p class="small muted bp-count">${total > l.length ? `Die ersten ${l.length} von ${total} Treffern – Filter oder Suche eingrenzen.` : `${total} von ${SM.AP_CODES.length} Flughäfen`}</p>`;
}
function bpUpdate(root) {
  const prefix = root.dataset.bp, st = BP[prefix]; if (!st) return;
  const list = root.querySelector('.bp-list'); if (list) list.innerHTML = bpListHtml(st);
}
// Ein Listener für alle Basis-Finder auf der Seite (Dialoge werden neu aufgebaut)
document.addEventListener('click', (e) => {
  const root = e.target.closest && e.target.closest('.bp'); if (!root) return;
  const st = BP[root.dataset.bp]; if (!st) return;
  const a = e.target.closest('[data-bpa]'), sz = e.target.closest('[data-bpsize]'), rg = e.target.closest('[data-bpreg]');
  if (a) { st.sel = a.dataset.bpa; root.querySelector('input[type=hidden]').value = st.sel; for (const x of root.querySelectorAll('[data-bpa]')) x.setAttribute('aria-pressed', String(x === a)); const s2 = root.querySelector('.bp-sel'); if (s2) { s2.innerHTML = baseInfoHtml(st.sel, st); s2.classList.remove('flash'); void s2.offsetWidth; s2.classList.add('flash'); } root.dispatchEvent(new CustomEvent('bpchange', { bubbles: true, detail: st.sel })); return; }
  if (sz) { st.size = sz.dataset.bpsize; for (const x of root.querySelectorAll('[data-bpsize]')) x.setAttribute('aria-pressed', String(x === sz)); bpUpdate(root); }
  if (rg) { st.region = rg.dataset.bpreg; for (const x of root.querySelectorAll('[data-bpreg]')) x.setAttribute('aria-pressed', String(x === rg)); bpUpdate(root); }
});
document.addEventListener('input', (e) => { const root = e.target.closest && e.target.closest('.bp'); if (!root || !e.target.matches('[data-bpq]')) return; const st = BP[root.dataset.bp]; if (!st) return; st.q = e.target.value; bpUpdate(root); });
document.addEventListener('change', (e) => {
  const root = e.target.closest && e.target.closest('.bp'); if (!root) return; const st = BP[root.dataset.bp]; if (!st) return;
  if (e.target.matches('[data-bpopt]')) { st[e.target.dataset.bpopt] = e.target.checked; bpUpdate(root); }
  if (e.target.matches('[data-bpsort]')) { st.sort = e.target.value; bpUpdate(root); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-bpq]')) { e.preventDefault(); const root = e.target.closest('.bp'), first = root && root.querySelector('[data-bpa]'); if (first) first.click(); } });
const readAirline = (prefix) => ({ name: ($('#' + prefix + 'Name').value || '').trim(), code: ($('#' + prefix + 'Code').value || '').trim().toUpperCase(), base: $('#' + prefix + 'Base').value });
function modal(html, wide = true) {
  const m = $('#modal');
  m.innerHTML = `<div class="dialog${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false; m.onclick = null;
  return m;
}
function formError(msg) { const e = $('#formErr'); if (e) { e.textContent = msg; e.hidden = !msg; if (msg) { try { e.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) { /* egal */ } toast(msg); } } else toast(msg); }

// ---------- Anleitung als bebilderter Durchlauf (nach der Registrierung, später über „Anleitung“) ----------
// Jeder Schritt: ein Bild (animiert, hell/dunkel über Design-Variablen), eine Überschrift, ein Satz, bis zu drei Stichworte.
const GI = {
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.6-4.6"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h1M12 12h1M15.5 12h0M8.5 15.5h1M12 15.5h1M8.5 18.5h1M12 18.5h1"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20.5c0-3.4 2.7-6.2 6-6.2s6 2.8 6 6.2"/><circle cx="17" cy="9" r="2.5"/><path d="M15.6 14.4c3 .3 5.4 2.7 5.4 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.2M12 17.2v.3"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M15 9a3.6 3.6 0 1 0 0 6M7.8 11h5.4M7.8 13.2h5"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  tag: '<path d="M3.5 12.5V4h8.5l9 9-8.5 8.5z"/><circle cx="8" cy="8.5" r="1.6"/>',
  fuel: '<path d="M5 21V5.5A2.5 2.5 0 0 1 7.5 3h5A2.5 2.5 0 0 1 15 5.5V21M3.5 21h13M15 9.5h2l2 2v6.5a1.5 1.5 0 0 1-3 0v-3h-2"/><path d="M8 7.5h4"/>',
  rail: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10.5h12M8.5 20l-1.5 2M15.5 20l1.5 2M9 16l-1 4h8l-1-4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1-1"/>',
  restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v4h4"/>',
  space: '<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 12h10"/>',
  bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
};
const gIc = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${GI[k] || IC[k] || ''}</svg>`;
const gChip = (ic, txt) => `<span class="gv-chip">${gIc(ic)}${txt}</span>`;
const gMotion = () => !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
/** Flugzeug-Symbol, das einem Pfad folgt (SMIL; bei „weniger Bewegung“ steht es still auf halber Strecke). */
function gPlaneOn(path, dur = 4, color = 'var(--accent)', scale = 1.1) {
  const glyph = `<g transform="rotate(90) scale(${scale}) translate(-12,-12)"><path d="${IC.plane.match(/d="([^"]+)"/)[1]}" fill="${color}" stroke="var(--panel)" stroke-width="1"/></g>`;
  return gMotion() ? `<g>${glyph}<animateMotion dur="${dur}s" repeatCount="indefinite" rotate="auto" path="${path}"/></g>`
    : `<g><animateMotion dur="0.01s" fill="freeze" keyPoints="0.5;0.5" keyTimes="0;1" calcMode="linear" rotate="auto" path="${path}"/>${glyph}</g>`;
}
const gHome = () => (W && W.player ? W.player.bases[0] : 'HAM');
const gArc = (a, b, lift = 0.35) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(b[0] - a[0], b[1] - a[1]); return `M${a[0]} ${a[1]} Q${mx} ${my - d * lift} ${b[0]} ${b[1]}`; };
const gApt = (p, label, home = false) => `<g class="gv-apt${home ? ' home' : ''}"><circle cx="${p[0]}" cy="${p[1]}" r="${home ? 7 : 4.5}"/>${home ? `<circle class="ring" cx="${p[0]}" cy="${p[1]}" r="7"/>` : ''}${label ? `<text x="${p[0]}" y="${p[1] + (home ? 22 : 17)}">${label}</text>` : ''}</g>`;
const gPerson = (cls, cap, delay) => `<svg class="gv-person ${cls}" viewBox="0 0 24 32" style="animation-delay:${delay}s" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M3 31c0-7 4-12 9-12s9 5 9 12z"/>${cap ? '<path class="cap" d="M5.5 5.2h13L16.6 1.8H7.4z"/>' : ''}</svg>`;

const SCENES = {
  standing() {
    const pl = W && W.player, st = pl ? SM.standingOf(pl, W.day) : { v: 25, parts: [['Erfahrung', 0, 25], ['Größe', 0, 20], ['Finanzen', 16, 25], ['Zuverlässigkeit', 5, 10], ['Marke', 6, 15]] };
    const vd = (t) => { const r = pl ? SM.riskTerms(pl, t) : null; return r ? (r.reject ? ['neg', 'Absage'] : r.cond ? ['warnc', 'Auflagen'] : ['pos', 'Zusage']) : ['pos', 'Zusage']; };
    return `<div class="gv-st"><div class="gv-st-bars">${st.parts.map(([l, v, mx], i) => `<div><span>${esc(l)}</span><div class="gv-lf"><i class="gv-grow" style="width:${Math.max(4, Math.round(v / mx * 100))}%;animation-delay:${0.15 * i}s"></i></div></div>`).join('')}<b class="gv-st-v">Ansehen ${st.v} / 100</b></div>
      <div class="gv-tags">${[['AT76', 'ATR 72'], ['E295', 'E195-E2'], ['A20N', 'A320neo'], ['B789', '787']].map(([t, l]) => { const [c, x] = vd(t); return `<div class="gv-tag${c === 'pos' ? ' on' : ''}"><b>${l}</b><span class="${c}">${x}</span></div>`; }).join('')}</div></div>`;
  },
  welcome() {
    const H = [250, 112], pts = [[78, 62], [132, 158], [196, 44], [372, 46], [430, 132], [318, 172]];
    const arcs = pts.map((p, i) => `<path class="gv-arc" style="animation-delay:${0.15 * i}s" d="${gArc(H, p, 0.28)}"/>`).join('');
    return `<svg class="gv-svg" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${arcs}
      ${pts.map((p) => gApt(p, '')).join('')}${gApt(H, gHome(), true)}${gPlaneOn(gArc(H, pts[3], 0.28), 4.5)}${gPlaneOn(gArc(pts[1], H, 0.28), 5.5, 'var(--plane-ai)', 0.9)}</svg>`;
  },
  aircraft() {
    const t = P.AIRCRAFT_TYPES.E295, cp = (W && W.macro.cpi) || 1, pl = W && W.player, rk = pl ? SM.riskTerms(pl, 'E295') : { lease: 1.08, dep: 2 }, ra = pl ? SM.riskTerms(pl, 'A20N') : null;
    const lease = t.lease_month * rk.lease * P.EURUSD / ((W && W.macro.eurusd) || P.EURUSD) * cp;
    return `<div class="gv-ac">${acSvg('E295', { ...(pl ? myAcColors() : { color: 'var(--accent)' }), code: pl ? pl.code : 'SM' })}</div>
      <div class="gv-tags"><div class="gv-tag on"><b>E195-E2 leasen</b><span>${eur(lease)} im Monat</span><em>Zusage · ${rk.dep} Monatsraten Kaution</em></div>
      <div class="gv-tag"><b>A320neo</b><span>${ra && ra.reject ? 'abgelehnt' : ra && ra.cond ? 'unter Auflagen' : 'Zusage'}</span><em>${ra && ra.cond ? `Rate +${pct(ra.lease - 1)}, ${ra.dep} Raten Kaution` : 'je nach Ansehen'}</em></div>
      <div class="gv-tag"><b>Kaufen</b><span>${eur(t.value_eur * cp)}</span><em>${pct(rk.down || 0.2)} Eigenanteil, baut Ansehen auf</em></div></div>`;
  },
  route() {
    const A = [92, 146], B = [408, 70], arc = gArc(A, B, 0.3);
    return `<svg class="gv-svg" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path class="gv-arc solid" d="${arc}"/>${gApt(A, gHome(), true)}${gApt(B, 'CDG')}${gPlaneOn(arc, 3.6)}</svg>
      <div class="gv-card gv-pop" style="animation-delay:.5s"><span class="small muted">Prognose ${gHome()}–CDG</span><div class="gv-lf"><i style="width:82%"></i></div><div class="spread small"><span>Auslastung <b>82 %</b></span><b class="pos">+4.300 € / Tag</b></div></div>
      <div class="gv-tap gv-pop" style="animation-delay:.2s">${gIc('target')}<span>antippen</span></div>`;
  },
  crew() {
    const pil = Array.from({ length: 4 }, (_, i) => gPerson('pil', true, 0.12 * i)).join(''), cab = Array.from({ length: 6 }, (_, i) => gPerson('cab', false, 0.5 + 0.1 * i)).join('');
    return `<div class="gv-crew"><div class="gv-crew-ac">${acSvg('E295', { ...(W && W.player ? myAcColors() : { color: 'var(--accent)' }), code: W && W.player ? W.player.code : 'SM' })}<span class="small muted">E195-E2 · 5 Std. am Tag</span></div>
      <div class="gv-crew-rows"><div><span class="gv-n">4</span><div class="gv-people">${pil}</div><span class="small muted">Piloten</span></div>
      <div><span class="gv-n">6</span><div class="gv-people">${cab}</div><span class="small muted">Kabine</span></div></div></div>`;
  },
  time() {
    const days = Array.from({ length: 8 }, (_, i) => `<span>${i + 1}. Jan</span>`).join('');
    return `<div class="gv-time"><div class="gv-speed"><span class="b">${icon('pause')}</span><span class="b on">${icon('play')}</span><span class="b sp">1×</span></div>
      <div class="gv-arrow">→</div><div class="gv-cal"><div class="gv-cal-roll">${days}</div></div>
      <div class="gv-ticks">${['+12.400 €', '+9.800 €', '−2.100 €', '+15.300 €'].map((x, i) => `<span class="${x.startsWith('−') ? 'neg' : 'pos'}" style="animation-delay:${0.6 * i}s">${x}</span>`).join('')}</div></div>`;
  },
  prices() {
    return `<div class="gv-price"><div class="gv-scale"><span class="z red" style="flex:65"><b>zu teuer</b></span><span class="z green" style="flex:27"><b>passt</b></span><span class="z yellow" style="flex:8"></span>
      <i class="gv-needle"></i></div><div class="gv-scale-l small muted"><span>0 %</span><span>Auslastung</span><span>100 %</span></div>
      <div class="gv-pa"><div class="neg">${gIc('down')}<span>leer → Preis runter</span></div><div class="pos">${gIc('up')}<span>immer voll → Preis rauf</span></div></div></div>`;
  },
  grow() {
    return `<div class="gv-stairs">${[['search', 'Marktstudie', 'Wo lohnt es sich?'], ['calc', 'CFO rechnet', 'Kann ich mir das leisten?'], ['plane', 'Investieren', 'Flugzeug, Strecke, Basis']]
      .map(([ic, a, b], i) => `<div class="gv-stair gv-pop" style="--h:${40 + i * 22}%;animation-delay:${0.25 * i}s"><span class="gv-sn">${i + 1}</span>${gIc(ic)}<b>${a}</b><em>${b}</em></div>`).join('')}</div>`;
  },
  money() {
    return `<div class="gv-money"><div class="gv-acct"><span class="z red">Dispo</span><span class="z mid"></span><span class="z ok">Guthaben</span><i class="gv-dot"></i></div>
      <div class="gv-chain"><span class="c warn">${gIc('clock')}30 Tage über Dispo</span><span class="ar">→</span><span class="c crit">${gIc('alert')}Insolvenz</span><span class="ar">→</span><span class="c">${gIc('restart')}Neustart</span></div>
      <div class="gv-hz">${[['fuel', 'Ölkrise'], ['bolt', 'Streik'], ['users', 'Konkurrenz']].map(([ic, l], i) => `<span class="gv-pop" style="animation-delay:${0.2 + 0.2 * i}s">${gIc(ic)}${l}</span>`).join('')}</div></div>`;
  },
  online() {
    return `<div class="gv-two"><div class="gv-mode gv-pop">${gIc('globe')}<b>Hauptwelt</b><span>bis 60 Airlines</span><span>1 Tag = 30 Min.</span><span>läuft immer weiter</span></div>
      <div class="gv-mode gv-pop" style="animation-delay:.2s">${gIc('users')}<b>Private Runde</b><span>bis 4 Personen</span><span>Link oder Code</span><span>eigenes Tempo</span></div></div>`;
  },
  areas() {
    const d = { karte: 'Lage & Dashboard', flotte: 'Flugzeuge', strecken: 'Netz & Planung', finanzen: 'Zahlen & CFO', markt: 'Nachfrage & Handel', unternehmen: 'Personal & Einkauf' };
    return `<div class="gv-areas">${SECTIONS.map((s, i) => `<div class="gv-area gv-pop" style="--c:var(--c-${s.key});animation-delay:${0.07 * i}s">${icon(s.icon)}<b>${s.short || s.label}</b><span>${d[s.key]}</span></div>`).join('')}</div>`;
  },
};
const GUIDE_ALL = [
  { k: 'welcome', t: 'Ihre Airline', lead: 'Sie bauen ein Streckennetz auf und verdienen Geld – ohne dass das Konto leerläuft.',
    chips: () => [gChip('globe', `${SM.AP_CODES.length} Flughäfen`), gChip('users', `${Object.keys(SM.AI_SETUP).length} KI-Airlines`), gChip('coin', `Start: ${n0(SM.DIFFICULTY.hard.equity / 1e6)}–${n0(SM.DIFFICULTY.easy.equity / 1e6)} Mio. €`)] },
  { k: 'aircraft', t: 'Flugzeug holen', lead: 'Leasen schont die Kasse – aber Leasinggeber vertrauen jungen Airlines nicht jedes Flugzeug an. Starten Sie mit Turboprops oder Regionaljets, die A320 gibt es anfangs nur unter Auflagen.', tab: 'fleetBuy', go: 'Zur Beschaffung',
    chips: () => [gChip('plane', 'Flotte → Beschaffung'), gChip('tag', 'Leasing = Kaution'), gChip('target', 'Kaufen baut Eigenkapital')] },
  { k: 'standing', t: 'Ansehen aufbauen', lead: 'Leasinggeber, Banken und Flughäfen entscheiden nach Ihrem Ansehen: Erfahrung, Größe, Finanzen, Pünktlichkeit und Marke. Größere Flugzeuge und Basen an großen Flughäfen müssen Sie anfragen – mit Zusage, Auflagen oder Absage.', tab: 'milestones', go: 'Zum Ansehen',
    chips: () => [gChip('building', 'Firma → Ansehen & Ziele'), gChip('chart', 'Start: rund 25 von 100'), gChip('clock', 'wächst mit jedem Monat')] },
  { k: 'route', t: 'Strecke planen', lead: 'Flughafen auf der Karte antippen und „Strecke planen“ wählen. Grüne Prognose heißt: lohnt sich.', tab: 'plan', go: 'Zur Planung',
    chips: () => [gChip('route', 'Ein Flug am Tag reicht'), gChip('rail', 'Unter 600 km: Bahn')] },
  { k: 'crew', t: 'Crew einstellen', lead: 'Ohne Crew bleibt das Flugzeug am Boden. Neue Leute fangen nach ein paar Tagen an.', tab: 'staff', go: 'Zum Personal',
    chips: () => [gChip('building', 'Firma → Personal'), gChip('clock', 'Anfangs max. 5 Tage'), gChip('coin', 'Agentur: 1,6× teurer')] },
  { k: 'time', t: 'Zeit starten', lead: 'Auf Play drücken. Jeder Tag bringt Passagiere, Kosten und Meldungen.', tab: 'dashboard', go: 'Zum Dashboard',
    chips: () => [gChip('space', 'Leertaste = Pause'), gChip('chart', 'Dashboard zeigt alles'), gChip('bell', 'Assistenz meldet sich')] },
  { k: 'prices', t: 'Preise führen', lead: 'Voll? Preis rauf. Leer? Preis runter. Selbst je Strecke – oder die Preisautomatik macht kleine Schritte für Sie.', tab: 'routes', go: 'Zum Netz',
    chips: () => [gChip('route', 'Strecken → Netz'), gChip('target', 'Ziel: 70–90 %'), gChip('bolt', 'Automatik: ±3 %/Woche')] },
  { k: 'grow', t: 'Klug wachsen', lead: 'Erst prüfen, dann zahlen. So wird aus zwei Flugzeugen ein Netz.', tab: 'studies', go: 'Zu den Studien',
    chips: () => [gChip('search', 'Markt → Marktstudien'), gChip('calc', 'Finanzen → CFO'), gChip('target', 'Karte → Strategie')] },
  { k: 'money', t: 'Geld im Blick', lead: 'Kontostand ist nicht Gewinn: Kautionen und Käufe kosten sofort Geld. Halten Sie Reserve.', tab: 'finance', go: 'Zu den Finanzen',
    chips: () => [gChip('fuel', 'Kerosin absichern'), gChip('coin', 'Kreditlinie beachten')] },
  { k: 'online', t: 'Online spielen', online: true, lead: 'In der Hauptwelt mit allen – oder privat mit Freunden.', tab: 'players', go: 'Mitspielende ansehen',
    chips: () => [gChip('link', 'Einladen per Link'), gChip('restart', 'Pleite? Neu gründen')] },
  { k: 'areas', t: 'Los geht’s', lead: 'Alles Weitere finden Sie in diesen sechs Bereichen.', final: true, chips: () => [] },
];
const GUIDE = GUIDE_ALL.filter((g) => !g.online || ONLINE);
const GUIDE_TIPS = ['Klein anfangen: zwei Turboprops oder Regionaljets, vier bis fünf Strecken.', 'Strategie: Business-Kabine auf Geschäftsstrecken, Marketing 2–3 % vom Umsatz, Drehkreuz ab vier Strecken.', 'Erfolg lockt Konkurrenz mit Kampfpreisen.', 'Gehalt unter Marktniveau lädt zum Abwerben ein.',
  'Banken kürzen im Abschwung die Kreditlinie.', 'Markt → Handel: Flugzeuge, Crews und Slots sofort.', 'Neue Muster gibt es im ersten Jahr nur per Auktion.',
  'Großraumjets erst für große Märkte; A380 nur an Großflughäfen.', 'Akademien liefern jeden Monat eigenen Nachwuchs.',
  'Karte: rote Kreise = Streik, Sturm, Sperrung; grüne = Großereignis.', 'Zoomen mit Mausrad oder zwei Fingern.'];
function showGuide(onDone = null, page = 0) {
  page = Math.max(0, Math.min(GUIDE.length - 1, page));
  const g = GUIDE[page], last = page === GUIDE.length - 1, inGame = !onDone && W && W.player;
  const canGo = inGame && g.tab && VIEWS[g.tab] && (g.tab !== 'players' || ui.mp);
  const m = modal(`<div class="gv">
    <div class="gv-top"><div class="gv-prog">${GUIDE.map((x, i) => `<button data-gp="${i}" class="${i < page ? 'done' : ''}" aria-current="${i === page}" aria-label="${esc(x.t)}" title="${esc(x.t)}"></button>`).join('')}</div>
      <button class="btn small ghost" id="gdSkip">${last ? 'Schließen' : 'Überspringen'}</button></div>
    <div class="gv-stage gv-${g.k}">${SCENES[g.k]()}</div>
    <div class="gv-body"><span class="gv-step">Schritt ${page + 1} von ${GUIDE.length}</span><h1 class="gv-title">${g.t}</h1><p class="gv-lead">${g.lead}</p>
      ${g.chips().length ? `<div class="gv-chips">${g.chips().join('')}</div>` : ''}
      ${g.final ? `<details class="gv-more"><summary>Profi-Tipps</summary><ul>${GUIDE_TIPS.map((x) => `<li>${x}</li>`).join('')}</ul></details>` : ''}</div>
    <div class="gv-foot">${page > 0 ? '<button class="btn" id="gdBack">Zurück</button>' : ''}${canGo ? `<button class="btn ghost" id="gdGo">${g.go} ↗</button>` : ''}${last && inGame ? '<button class="btn" id="gdTour">Rundgang durch die Oberfläche</button>' : ''}
      <button class="btn primary" id="gdNext" style="margin-left:auto">${last ? 'Los geht’s' : 'Weiter'}</button></div></div>`, false);
  const seen = () => { try { localStorage.setItem('skymarket-guide-seen', '1'); } catch (e) { /* egal */ } };
  const done = () => { seen(); ui.guidePage = null; if (onDone) onDone(); else m.hidden = true; };
  ui.guidePage = { page, onDone };
  $('#gdSkip').addEventListener('click', done);
  $('#gdNext').addEventListener('click', () => (last ? done() : showGuide(onDone, page + 1)));
  if (page > 0) $('#gdBack').addEventListener('click', () => showGuide(onDone, page - 1));
  if (canGo) $('#gdGo').addEventListener('click', () => { seen(); ui.guidePage = null; m.hidden = true; setTab(g.tab); });
  if (last && inGame) $('#gdTour').addEventListener('click', () => { seen(); ui.guidePage = null; m.hidden = true; startTour(); });
  m.querySelectorAll('[data-gp]').forEach((b) => b.addEventListener('click', () => showGuide(onDone, Number(b.dataset.gp))));
  // Wischen auf dem Handy
  const st = m.querySelector('.gv'); let x0 = null;
  st.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  st.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) < 50) return; if (dx < 0 && !last) showGuide(onDone, page + 1); else if (dx > 0 && page > 0) showGuide(onDone, page - 1); }, { passive: true });
}
// Pfeiltasten blättern im Durchlauf
document.addEventListener('keydown', (e) => {
  const G = ui.guidePage; if (!G || $('#modal').hidden || !$('#modal .gv')) return;
  if (e.key === 'ArrowRight' && G.page < GUIDE.length - 1) { e.preventDefault(); showGuide(G.onDone, G.page + 1); }
  else if (e.key === 'ArrowLeft' && G.page > 0) { e.preventDefault(); showGuide(G.onDone, G.page - 1); }
});

// ---------- Anmeldung ----------
function showAuth(mode = 'login') {
  setSpeed(0);
  const m = modal(`<div><h1>Sky<span>market</span></h1><p class="ink2">Airline-Wirtschaftssimulation: eine dauerhafte Hauptwelt für alle und private Runden für bis zu vier Personen. Melden Sie sich an oder legen Sie ein Konto an.</p></div>
    <div class="seg" role="tablist"><button data-mode="login" aria-pressed="${mode === 'login'}">Anmelden</button><button data-mode="register" aria-pressed="${mode === 'register'}">Konto anlegen</button></div>
    <form id="authForm" class="stack">
      <label class="f"><span>Benutzername</span><input type="text" id="auUser" autocomplete="username" maxlength="20" required></label>
      <label class="f"><span>Passwort</span><input type="password" id="auPw" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required></label>
      ${mode === 'register' ? '<label class="f"><span>Passwort wiederholen</span><input type="password" id="auPw2" autocomplete="new-password" required></label><p class="small muted">3–20 Zeichen: Buchstaben, Ziffern, _ und -. Passwort mindestens 8 Zeichen.</p>' : ''}
      <div class="formbar"><p class="small neg" id="formErr" hidden></p>
      <div class="row"><button class="btn" type="button" id="auSolo">Ohne Konto allein spielen</button><button class="btn primary" type="submit" style="margin-left:auto">${mode === 'login' ? 'Anmelden' : 'Konto anlegen'}</button></div></div>
    </form>`, false);
  m.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => showAuth(b.dataset.mode)));
  $('#auSolo').addEventListener('click', () => showStart(false));
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#auUser').value.trim(), password = $('#auPw').value;
    if (mode === 'register' && password !== $('#auPw2').value) { formError('Die Passwörter stimmen nicht überein.'); return; }
    try { mpState.user = await api(mode === 'login' ? '/login' : '/register', { body: { username, password } });
      if (mpState.user.mustChange) showPwChange({ forced: true, current: password, then: () => showLobby() });
      else if (mode === 'register' && !mpState.pendingJoin) showGuide(() => showLobby()); else { showLobby(); showPatch(); } }
    catch (err) { formError(err.message); }
  });
  setTimeout(() => $('#auUser') && $('#auUser').focus(), 50);
}

// ---------- Admin: Spielzeit der Spieler ----------
const fmtDur = (ms) => { const m = Math.round((ms || 0) / 60000); if (m < 60) return `${m} Min.`; const h = Math.floor(m / 60); return h < 100 ? `${h}:${String(m % 60).padStart(2, '0')} Std.` : `${n0(h)} Std.`; };
const berlinKey = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(t));
const agoTxt = (t, now) => { if (!t) return '–'; const m = Math.round((now - t) / 60000); if (m < 2) return 'gerade eben'; if (m < 60) return `vor ${m} Min.`; const h = Math.round(m / 60); if (h < 36) return `vor ${h} Std.`; return new Date(t).toLocaleDateString('de-DE'); };
/** Admin: Fehlerprotokoll der Geräte – Ladeprobleme, Neustarts beim Laden, langsames Laden, Skriptfehler. */
async function showDiag(onBack) {
  const m = modal('<h1>Fehlerprotokoll</h1><p class="small muted">Lade …</p>');
  let d; try { d = await api('/admin/diag', { timeout: 20000 }); } catch (e) { toast(e.message); onBack(); return; }
  const KIND = { load: 'Laden fehlgeschlagen', noairline: 'Airline fehlt im Stand', reload: 'Seite beim Laden neu gestartet', slow: 'Laden sehr langsam', poll: 'Abruf-Fehler', js: 'Skriptfehler' };
  const dev = (x) => { const ua = x.ua || ''; const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'anderes';
    const br = /CriOS|EdgiOS|FxiOS/.test(ua) ? 'iOS-Browser' : /Edg\//.test(ua) ? 'Edge' : /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : ''; return `${os} ${br}`.trim(); };
  const mobile = (x) => /iPhone|iPad|iPod|Android|Mobile/.test(x.ua || '');
  const tf = (t) => new Date(t).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const day = d.list.filter((x) => d.now - x.t < 864e5), by = {};
  for (const x of day) by[x.kind] = (by[x.kind] || 0) + 1;
  const tiles = [['Meldungen 24 h', n0(day.length), `${new Set(day.map((x) => x.u)).size} Konten`], ['davon Handy', n0(day.filter(mobile).length), day.length ? pct(day.filter(mobile).length / day.length) : '–'],
    ...Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => [KIND[k] || k, n0(v), 'letzte 24 h'])];
  const rows = d.list.map((x) => { const ex = x.extra || {};
    const facts = [x.status !== null && x.status !== undefined ? `HTTP ${x.status}` : '', ex.attempt ? `Versuch ${ex.attempt}` : '', ex.ms ? `${(ex.ms / 1000).toFixed(1)} s` : '', ex.secs ? `nach ${ex.secs} s` : '', ex.timing && ex.timing.kb ? `${ex.timing.kb} KB` : '', x.mem ? `${x.mem} GB RAM` : '', x.conn || '', x.build && x.build !== x.server ? `alte Version ${x.build}` : ''].filter(Boolean).join(' · ');
    return `<details class="diag-row"><summary><span class="mono small">${tf(x.t)}</span> <b>${esc(x.name || x.u)}</b> <span class="chip ${x.kind === 'slow' ? '' : 'warn'}">${esc(KIND[x.kind] || x.kind)}</span> <span class="small">${esc(x.msg || '')}</span> <span class="small muted">${esc(dev(x))}${facts ? ' · ' + esc(facts) : ''}</span></summary>
      <pre class="small">${esc(JSON.stringify({ spiel: x.game, spieltag: x.day, sichtbar: x.vis, bildschirm: x.scr, version: x.build, server: x.server, detail: x.detail, extra: x.extra, stack: x.stack, browser: x.ua }, null, 1))}</pre></details>`; }).join('');
  m.innerHTML = `<div class="dialog wide" role="dialog" aria-modal="true"><div class="spread"><h1>Fehlerprotokoll</h1><span class="row" style="gap:6px"><button class="btn small" data-dg="reload">Aktualisieren</button><button class="btn small danger" data-dg="clear">Leeren</button><button class="btn small" data-dg="close">Zurück</button></span></div>
    <p class="small muted">Meldungen der Geräte beim Laden und Spielen: fehlgeschlagenes Laden (mit Grund), Seite während des Ladens neu gestartet (meist zu wenig Speicher oder App gewechselt), Laden über 8 Sekunden (mit Zeiten), Skriptfehler. Die letzten 400 bleiben gespeichert.</p>
    <div class="tiles">${tiles.map(([k, v, s2]) => `<div class="tile"><span class="k">${esc(k)}</span><b class="v">${v}</b><span class="s">${esc(s2)}</span></div>`).join('')}</div>
    <div class="stack" style="gap:4px">${rows || '<p class="small muted">Keine Meldungen.</p>'}</div></div>`;
  m.onclick = async (e) => { const b = e.target.closest('[data-dg]'); if (!b) return; const v = b.dataset.dg;
    if (v === 'close') { m.onclick = null; onBack(); } else if (v === 'reload') showDiag(onBack);
    else if (v === 'clear') { try { await api('/admin/diag?clear=1', { timeout: 20000 }); } catch (err) { toast(err.message); } showDiag(onBack); } };
}
/** 0.21.74 Fair-Play-Wächter: wer lässt eine KI oder ein Skript für sich spielen? Bewertung mit Belegen, Prüfen/Verwarnen/Zurücksetzen. */
/** 0.21.80: Agenten-Spuren und Herkunft je Konto (Mausweg, Klickpunkt, Tippen, Land, Zeitzone, Gerät). */
function fairTraceHtml(r) {
  const t = r.trace || {}, pc = (a, b) => (b ? `${Math.round(a / b * 100)} %` : '–'), top = (m, n = 3) => Object.entries(m || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${esc(k)} (${n0(v)})`).join(', ') || '–';
  const warnT = (a, b, lim) => (b >= 10 && a / b >= lim ? ' class="neg"' : '');
  return `<div class="small muted fp-trace"><span>Maus: <b>${n0(t.mclk)}</b> Klicks · ohne Mausweg <b${warnT(t.tele, t.mclk, 0.4)}>${pc(t.tele, t.mclk)}</b> · exakt mittig <b${warnT(t.ctr, t.cclk, 0.35)}>${pc(t.ctr, t.cclk)}</b>${t.synth ? ` · Text ohne Tasten <b class="neg">${n0(t.synth)}×</b>` : ''}${t.keys ? ` · Maschinen-Tippen <b class="neg">${n0(t.keys)}×</b>` : ''}</span>
    <span>Land: ${top(r.geo)} · Zeitzone: ${top(r.tz, 2)}${t.origin ? ` · <b class="neg">${n0(t.origin)}× abweichend</b>` : ''}</span><span>Geräte: ${top(r.dev, 3)}</span></div>`;
}
/** 0.21.78: Stufe des Kontos, nächste Stufe verhängen, Stufe zurücknehmen. */
function fairStageBox(r, d) {
  const k = esc(r.key), st = r.stage || 0, nx = d.ladder[st], cur = d.ladder[st - 1];
  return `<div class="fp-stage"><div><b>${st ? `Stufe ${st} von 5 · ${esc(cur.label)}` : 'Noch keine Stufe'}</b>${r.stageAt ? ` <span class="small muted">seit ${new Date(r.stageAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>` : ''}
    <div class="small muted">${r.due ? `Neue Belege seit der letzten Stufe: <b>${r.due.score}</b> – Stufe ${r.due.n} ${r.due.auto ? 'verhängt das Prüfsystem bei der nächsten Aktion' : 'ist fällig und wartet auf Bestätigung'}.` : nx ? `Nächste Stufe: ${esc(nx.label)} – ${esc(nx.what)}.` : 'Höchste Stufe erreicht.'}</div></div>
    <div class="row" style="gap:6px;flex-wrap:wrap">${nx ? `<button class="btn small ${r.due ? 'danger' : ''}" data-fp="stage" data-n="${st + 1}" data-k="${k}">Stufe ${st + 1} verhängen</button>` : ''}${st ? `<button class="btn small" data-fp="stageDown" data-n="${st}" data-k="${k}">Stufe ${st} zurücknehmen</button>` : ''}</div></div>`;
}
/** 0.21.80: laufende Sperren mit Knopf zum Aufheben (alles, Chat, Handel & Börse, Packs). */
function fairLocksHtml(r) {
  const tf = (t) => new Date(t).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const L = [['all', 'Leitstand stillgelegt', r.susp], ['chat', 'Chat gesperrt', r.blk && r.blk.chat], ['trade', 'Handel & Börse gesperrt', r.blk && r.blk.trade], ['pack', 'Packs gesperrt', r.pack]].filter((x) => x[2]);
  return L.length ? `<div class="stack" style="gap:4px">${L.map(([k, l, x]) => `<div class="row small" style="gap:6px"><span class="chip ${k === 'all' ? 'crit' : 'warn'}">${l} bis ${tf(x.until)}</span><button class="btn small" data-fp="sx" data-v="unsuspend" data-scope="${k}">Aufheben</button></div>`).join('')}</div>` : '';
}
/** 0.21.75: Maßnahmen je Konto – Sperren (Konto), Pack-Sperre, Annullieren, Geldstrafe, Wertung aberkennen (je Spiel), Entfernen über die Spielverwaltung. */
function fairActions(r) {
  const k = esc(r.key), gOpts = r.games.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
  const dur = (name) => `<select data-fpf="${name}">${[[1, '1 Stunde'], [6, '6 Stunden'], [24, '1 Tag'], [72, '3 Tage'], [168, '7 Tage'], [720, '30 Tage']].map(([h, l]) => `<option value="${h}"${h === 24 ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  const noGame = !r.games.length ? 'disabled title="Keine Airline mit Aktionen bekannt"' : '';
  const hist = (r.sanctions || []).length ? `<details class="small"><summary>Bisherige Maßnahmen (${r.sanctions.length})</summary><ul class="fp-why">${r.sanctions.map((x) => `<li><span class="mono">${new Date(x.at).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span> ${esc(x.msg || x.kind)}${x.reason ? ` <span class="muted">· ${esc(x.reason)}</span>` : ''} <span class="muted">· ${esc(x.by)}</span></li>`).join('')}</ul></details>` : '';
  return `<details class="fp-act"><summary><b>Einzelmaßnahmen</b> <span class="small muted">außerhalb der Stufen – Spielende sehen sie ebenfalls als Luftfahrtaufsicht</span></summary>
    <div class="fp-acts" data-k="${k}">
      <label class="f fp-wide"><span>Grund (sieht der Spieler im Bescheid der Luftfahrtaufsicht)</span><input type="text" data-fpf="reason" maxlength="140" placeholder="z. B. automatisierte Steuerung festgestellt"></label>
      <label class="f fp-wide"><span>Spiel für Strafen</span><select data-fpf="game" ${noGame}>${gOpts}</select></label>
      <div class="fp-box fp-wide"><b>Zeitweise sperren</b><span class="small muted">Dauer frei wählbar. „Alles“ legt den Leitstand still (kein Handeln, kein Chat, die KI führt die Airline in allen Spielen). Teilsperren lassen den Rest spielbar.</span>
        <div class="row"><select data-fpf="scope"><option value="all">Alles (Leitstand stilllegen)</option><option value="chat">Nur Chat</option><option value="trade">Nur Handel &amp; Börse (inkl. Skin-Tausch)</option><option value="pack">Nur Packs</option></select></div>
        <div class="row fp-dur"><label><input type="number" data-fpf="dd" min="0" max="90" step="1" value="0"> Tage</label><label><input type="number" data-fpf="dh" min="0" max="23" step="1" value="1"> Std.</label><label><input type="number" data-fpf="dm" min="0" max="59" step="1" value="0"> Min.</label>
          <span class="row" style="gap:4px">${[[15, '15 Min.'], [60, '1 Std.'], [360, '6 Std.'], [1440, '1 Tag']].map(([m, l]) => `<button type="button" class="btn small ghost" data-fpq="${m}">${l}</button>`).join('')}</span></div>
        <button class="btn small danger" data-fp="sx" data-v="suspend">Sperren</button>
        ${fairLocksHtml(r)}</div>
      <div class="fp-box"><b>Annullieren</b><span class="small muted">Gewinne des Zeitraums einziehen und dort erreichte Meilensteine aberkennen.</span>
        <div class="row"><select data-fpf="days">${[[1, 'letzter Spieltag'], [3, 'letzte 3 Spieltage'], [7, 'letzte 7 Spieltage'], [14, 'letzte 14 Spieltage'], [30, 'letzte 30 Spieltage'], [90, 'letzte 90 Spieltage'], [3650, 'ganzes Spiel']].map(([d, l]) => `<option value="${d}"${d === 7 ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="row small"><label class="chk"><input type="checkbox" data-fpf="profits" checked> Gewinne einziehen</label><label class="chk"><input type="checkbox" data-fpf="milestones" checked> Meilensteine aberkennen</label></div>
        <button class="btn small danger" data-fp="sx" data-v="annul" ${noGame}>Annullieren</button></div>
      <div class="fp-box"><b>Geldstrafe</b><span class="small muted">Wird vom Eigenkapital abgezogen und im Logbuch vermerkt.</span><div class="row"><input type="number" data-fpf="amount" min="0.1" step="0.5" value="5" style="width:90px"> <span class="small">Mio. €</span><button class="btn small danger" data-fp="sx" data-v="fine" ${noGame}>Strafe buchen</button></div></div>
      <div class="fp-box"><b>Wertung aberkennen</b><span class="small muted">Airline steht ohne Punkte als „disqualifiziert“ am Ende der Rangliste.</span><div class="row"><button class="btn small danger" data-fp="sx" data-v="dq" ${noGame}>Aberkennen</button><button class="btn small" data-fp="sx" data-v="undq" ${noGame}>Wieder zulassen</button></div></div>
      <div class="fp-box"><b>Entfernen</b><span class="small muted">Airline aus dem Spiel nehmen und dauerhaft sperren – in der Spielverwaltung.</span>${r.games.map((g) => `<button class="btn small" data-fp="adm" data-g="${esc(g.id)}">${esc(g.name)} verwalten</button>`).join('') || '<span class="small muted">–</span>'}</div>
    </div>${hist}</details>`;
}
async function fairSanctionClick(b) {
  const box = b.closest('.fp-acts'), f = (n) => box.querySelector(`[data-fpf="${n}"]`), kind = b.dataset.v;
  const game = f('game') ? f('game').value : '', gName = f('game') && f('game').selectedOptions[0] ? f('game').selectedOptions[0].textContent : '';
  const body = { key: box.dataset.k, cmd: 'sanction', kind, reason: f('reason').value, game };
  const mins = Math.max(0, Number(f('dd').value) || 0) * 1440 + Math.max(0, Number(f('dh').value) || 0) * 60 + Math.max(0, Number(f('dm').value) || 0);
  const scopeL = { all: 'Leitstand stilllegen (alles)', chat: 'Chat sperren', trade: 'Handel & Börse sperren', pack: 'Packs sperren' };
  const durL = (m) => [Math.floor(m / 1440) ? `${Math.floor(m / 1440)} Tg.` : '', Math.floor((m % 1440) / 60) ? `${Math.floor((m % 1440) / 60)} Std.` : '', m % 60 ? `${m % 60} Min.` : ''].filter(Boolean).join(' ');
  if (kind === 'suspend') { body.scope = f('scope').value; body.minutes = mins; if (!(mins > 0)) { toast('Bitte eine Dauer eingeben.'); return; } }
  if (kind === 'unsuspend') body.scope = b.dataset.scope || 'all';
  if (kind === 'annul') { body.days = Number(f('days').value); body.profits = f('profits').checked; body.milestones = f('milestones').checked; }
  if (kind === 'fine') body.amount = Number(f('amount').value);
  const ask = { suspend: `${scopeL[body.scope]} für ${durL(mins)}?${body.scope === 'all' ? ' Die KI führt so lange die Airline.' : ''}`, annul: `In „${gName}“ annullieren: ${f('days').selectedOptions[0].textContent}${body.profits ? ', Gewinne einziehen' : ''}${body.milestones ? ', Meilensteine aberkennen' : ''}?`,
    fine: `In „${gName}“ eine Geldstrafe von ${body.amount} Mio. € buchen?`, dq: `In „${gName}“ die Wertung aberkennen?` }[kind];
  if (ask && !confirm(ask)) return;
  try { const r = await api('/admin/fairplay', { body, timeout: 30000 }); toast(r.msg || 'Erledigt.'); } catch (err) { toast(err.message); }
}
/** 0.21.78: Bescheid der Luftfahrtaufsicht (Stufe, Text, Stufenleiter). Wer die Maßnahme ausgelöst hat, steht nirgends – für Spielende erkennt sie das Prüfsystem. */
function showFairWarn(w) {
  const st = w.stage || 0, lad = w.ladder || (SM.FAIR_STAGES || []).slice(1).map((S) => ({ n: S.n, label: S.label, what: SM.fairStageWhat(S.n) }));
  const ladder = st ? `<ol class="fa-ladder">${lad.map((x) => `<li class="${x.n < st ? 'past' : x.n === st ? 'now' : ''}"><b>Stufe ${x.n} · ${esc(x.label)}</b><span class="small">${esc(x.what)}</span></li>`).join('')}</ol>` : '';
  const m = modal(`<div class="fa-head"><span class="fa-seal" aria-hidden="true">§</span><div><h1>Luftfahrtaufsicht</h1><span class="small muted">Bescheid vom ${esc(new Date(w.at || Date.now()).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))} Uhr${st ? ` · <b class="${st >= 3 ? 'neg' : 'warnc'}">Stufe ${st} von 5</b>` : ''}</span></div></div>
    <p style="white-space:pre-line">${esc(w.text)}</p>${ladder}<p class="small muted">Erlaubt ist, sich Rat zu holen – auch bei einer KI. Nicht erlaubt ist, eine KI, einen Bot oder ein Skript selbst spielen zu lassen.</p><div class="row"><button class="btn primary" data-fw="ok">Verstanden</button></div>`, false);
  m.onclick = async (e) => { if (!e.target.closest('[data-fw]')) return; m.onclick = null; m.hidden = true; try { await api('/fair/seen', { body: {} }); } catch (err) { /* später erneut */ } if (mpState.user) mpState.user.fairWarn = null; };
}
async function showFairPlay(onBack) {
  const m = modal('<h1>Fair Play</h1><p class="small muted">Lade …</p>');
  let d; try { d = await api('/admin/fairplay', { timeout: 20000 }); } catch (e) { toast(e.message); onBack(); return; }
  const tf = (t) => (t ? new Date(t).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–');
  const flt = ui.fairFlt || 'auff', rows = d.rows.filter((r) => flt === 'all' || r.score >= 15);
  const hoursBar = (r) => { const days = Object.keys(r.hours || {}).sort().slice(-7); if (!days.length) return '';
    return `<div class="fp-hours" title="Aktive Stunden je Tag (Berliner Zeit), letzte ${days.length} Tage">${days.map((k) => `<div class="fp-day"><span class="mono small">${k.slice(8, 10)}.${k.slice(5, 7)}.</span>${r.hours[k].map((v, h) => `<i class="${v ? (v > 20 ? 'h3' : v > 5 ? 'h2' : 'h1') : ''}" title="${h}–${h + 1} Uhr: ${v} Aktionen"></i>`).join('')}</div>`).join('')}</div>`; };
  const card = (r) => `<details class="card pad fp-row ${r.tone}"${r.open ? ' open' : ''}><summary class="spread"><span><b>${esc(r.name)}</b>${r.admin ? ' <span class="chip">Admin</span>' : ''}${r.online ? ' <span class="chip good">online</span>' : ''}${r.susp ? ` <span class="chip crit">gesperrt bis ${tf(r.susp.until)}</span>` : ''}${r.pack ? ` <span class="chip warn">Pack-Sperre bis ${tf(r.pack.until)}</span>` : ''}${r.blk && r.blk.chat ? ` <span class="chip warn">Chat gesperrt bis ${tf(r.blk.chat.until)}</span>` : ''}${r.blk && r.blk.trade ? ` <span class="chip warn">Handel gesperrt bis ${tf(r.blk.trade.until)}</span>` : ''} <span class="small muted">${n0(r.n)} Aktionen · zuletzt ${tf(r.last)}</span></span>
      <span class="row" style="gap:6px">${r.stage ? `<span class="chip ${r.stage >= 3 ? 'crit' : 'warn'}" title="${esc((d.ladder[r.stage - 1] || {}).what || '')}">Stufe ${r.stage} · ${esc((d.ladder[r.stage - 1] || {}).label || '')}</span>` : ''}${r.due && !r.due.auto ? `<span class="chip crit" title="Neue Belege seit der letzten Stufe: ${r.due.score}">Stufe ${r.due.n} fällig</span>` : ''}<span class="chip ${({ ok: 'good', warn: 'warn', bad: 'bad', crit: 'crit' })[r.tone]}">${esc(r.level)}</span><b class="mono fp-score">${r.score}</b></span></summary>
    <div class="fp-meter"><i style="width:${r.score}%"></i></div>
    ${r.reasons.length ? `<ul class="fp-why">${r.reasons.map((x) => `<li><b>${esc(x.label)}</b> <span class="small muted">· ${esc(x.why)} · ${n0(x.n)}×</span> <span class="mono small">+${x.w}</span></li>`).join('')}</ul>` : '<p class="small muted">Keine Auffälligkeiten.</p>'}
    ${r.review ? `<p class="small ok-t">Geprüft und für unbedenklich befunden von ${esc(r.review.by)} am ${tf(r.review.at)} (Bewertung damals ${r.review.score}).</p>` : ''}
    ${r.warn ? `<p class="small warn-t">Letzter Bescheid${r.warn.stage ? ` (Stufe ${r.warn.stage})` : ''} am ${tf(r.warn.at)}, ausgelöst von ${esc(r.warn.by)} · ${r.warn.seen ? `gelesen ${tf(r.warn.seen)}` : 'noch nicht gelesen'}</p>` : ''}
    ${fairStageBox(r, d)}
    <p class="small muted">Spiele: ${r.games.map((g) => `${esc(g.name)} (${n0(g.n)})`).join(', ') || '–'}</p>
    ${fairTraceHtml(r)}
    ${hoursBar(r)}
    ${r.ev.length ? `<details class="small"><summary>Letzte Belege (${r.ev.length})</summary><table class="fp-ev"><tbody>${r.ev.map((e) => `<tr><td class="mono">${tf(e.t)}</td><td>${esc(e.label)}</td><td class="muted">${esc(e.d || '')}</td><td class="muted">${esc(e.type || '')} · ${esc(e.gameName || '')}</td></tr>`).join('')}</tbody></table></details>` : ''}
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn small" data-fp="ok" data-k="${esc(r.key)}" title="Bisherige Belege zählen für die nächste Stufe nicht mehr">Unbedenklich</button><button class="btn small" data-fp="reset" data-k="${esc(r.key)}">Daten zurücksetzen</button></div>
    ${fairActions(r)}</details>`;
  m.innerHTML = `<div class="dialog wide" role="dialog" aria-modal="true"><div class="spread"><h1>Fair Play</h1><span class="row" style="gap:6px"><button class="btn small" data-fp="reload">Aktualisieren</button><button class="btn small" data-fp="close">Zurück</button></span></div>
    <p class="small muted">Der Wächter erkennt, wenn eine KI oder ein Skript selbst spielt: ferngesteuerte oder unsichtbare Browser, Klicks per Programm, Aktionen ohne Spieloberfläche oder ohne vorherige Bedienung (über ${Math.round(d.rules.noUiGap / 1000)} s), übermenschliches Tempo (unter ${d.rules.fastMs} ms), Maschinen-Takt, Dauerbetrieb rund um die Uhr und Aktionen aus verborgenen Tabs. Dazu die Spuren von KI-Agenten, die einen normalen Browser per Screenshot bedienen: Mauszeiger springt ohne Weg auf die Knöpfe, Klicks exakt in der Knopfmitte, Text ohne Tastenanschläge oder in gleichem Takt, gleichförmige Denkpausen und Aktionen aus anderem Land oder anderer Zeitzone (Land vom Hosting, keine IP). Mausweg und Klickpunkt zählen nur bei Maus, nicht bei Touch. Ob jemand nebenbei eine KI um Rat fragt, kann kein Spiel erkennen. Klickfluten (über ${d.rules.rateN} Aktionen in ${d.rules.rateMs / 1000} s) werden immer gebremst.</p>
    <div class="callout info stack"><span><b>Luftfahrtaufsicht:</b> Für Spielende kommt jede Maßnahme vom Prüfsystem der Aufsicht – Ihr Name erscheint nirgends, auch nicht bei Einzelmaßnahmen. Die nächste Stufe ist fällig, wenn die <i>neuen</i> Belege seit der letzten Stufe (oder seit „Unbedenklich“) mindestens ${d.rules.stageScore} Punkte ergeben – frühestens ${d.rules.stageGapH} Stunden nach der letzten Stufe. Wer ${d.rules.calmDays} Tage unauffällig bleibt, rutscht eine Stufe zurück. Spielende sehen nur „automatisierte Steuerung festgestellt“, nicht woran.</span>
      <ol class="fa-ladder cmp small">${d.ladder.map((x) => `<li class="${x.n <= d.conf.autoMax ? 'auto' : ''}"><b>Stufe ${x.n} · ${esc(x.label)}</b><span>${esc(x.what)}</span><em>${x.n <= d.conf.autoMax ? 'automatisch' : 'auf Bestätigung'}</em></li>`).join('')}</ol>
      <div class="fp-conf small"><span>Das Prüfsystem verhängt selbst bis</span><select data-fpconf>${[0, 1, 2, 3, 4, 5].map((n) => `<option value="${n}"${n === d.conf.autoMax ? ' selected' : ''}>${n ? `Stufe ${n}` : 'keine (nur vorschlagen)'}</option>`).join('')}</select><span class="muted">Höhere Stufen erscheinen unten als „fällig“.</span></div></div>
    <div class="tiles"><div class="tile"><span class="k">Offen</span><b class="v">${n0(d.open)}</b><span class="s">Stufe fällig oder ungeprüft verdächtig</span></div><div class="tile"><span class="k">Beobachtet</span><b class="v">${n0(d.rows.filter((r) => r.score >= 15).length)}</b><span class="s">von ${n0(d.rows.length)} Konten</span></div><div class="tile"><span class="k">Mit Stufe</span><b class="v">${n0(d.rows.filter((r) => r.stage > 0).length)}</b><span class="s">${n0(d.rows.filter((r) => r.warn && !r.warn.seen).length)} Bescheide ungelesen</span></div></div>
    <div class="row small" style="gap:6px"><button class="btn small ${flt === 'auff' ? 'primary' : ''}" data-fp="flt" data-v="auff">Nur auffällige</button><button class="btn small ${flt === 'all' ? 'primary' : ''}" data-fp="flt" data-v="all">Alle Konten</button></div>
    <div class="stack" style="gap:6px">${rows.map(card).join('') || '<p class="small muted">Niemand auffällig. 👍</p>'}</div>
    <p class="small muted">Entfernen oder sperren: in der Verwaltung des jeweiligen Spiels („Hauptwelt verwalten“ bzw. Spielverwaltung).</p></div>`;
  const cs = m.querySelector('[data-fpconf]'); if (cs) cs.onchange = async () => { try { const r = await api('/admin/fairplay', { body: { cmd: 'conf', autoMax: Number(cs.value) } }); toast(r.msg); } catch (err) { toast(err.message); } showFairPlay(onBack); };
  m.onclick = async (e) => { const q = e.target.closest('[data-fpq]'); if (q) { const box = q.closest('.fp-acts'), mm = Number(q.dataset.fpq), set = (n, v) => { box.querySelector(`[data-fpf="${n}"]`).value = v; }; set('dd', Math.floor(mm / 1440)); set('dh', Math.floor((mm % 1440) / 60)); set('dm', mm % 60); return; }
    const b = e.target.closest('[data-fp]'); if (!b) return; const v = b.dataset.fp;
    if (v === 'close') { m.onclick = null; onBack(); return; }
    if (v === 'reload') { showFairPlay(onBack); return; }
    if (v === 'flt') { ui.fairFlt = b.dataset.v; showFairPlay(onBack); return; }
    if (v === 'sx') { await fairSanctionClick(b); showFairPlay(onBack); return; }
    if (v === 'stage' || v === 'stageDown') {
      const n = Number(b.dataset.n), L = d.ladder[n - 1] || {};
      if (!confirm(v === 'stage' ? `Stufe ${n} (${L.label}) verhängen?\n\n${L.what}.\n\nDer Spieler sieht einen Bescheid der Luftfahrtaufsicht.` : `Stufe ${n} zurücknehmen? Laufende Sperren dieser Stufe enden; Bußgeld und Annullierung bleiben.`)) return;
      try { const r = await api('/admin/fairplay', { body: { key: b.dataset.k, cmd: v }, timeout: 60000 }); toast(r.msg || 'Erledigt.'); } catch (err) { toast(err.message); }
      showFairPlay(onBack); return; }
    if (v === 'adm') { m.onclick = null; showAdmin(b.dataset.g, () => showFairPlay(onBack)); return; }
    let text = '';
    if (v === 'warn') { text = prompt('Nachricht an den Spieler (leer = Standardtext):', '') ?? null; if (text === null) return; }
    if (v === 'reset' && !confirm('Alle gesammelten Fair-Play-Daten dieses Kontos löschen? (Die alte Bewertung wird archiviert.)')) return;
    try { await api('/admin/fairplay', { body: { key: b.dataset.k, cmd: v, text } }); toast(v === 'ok' ? 'Als unbedenklich markiert.' : v === 'warn' ? 'Verwarnung gesendet – der Spieler sieht sie beim nächsten Laden.' : 'Daten zurückgesetzt.'); } catch (err) { toast(err.message); }
    showFairPlay(onBack); };
}
async function showPlaytime(onBack) {
  const m = modal('<h1>Spielzeit</h1><p class="small muted">Lade …</p>');
  let d; try { d = await api('/admin/playtime'); } catch (e) { toast(e.message); onBack(); return; }
  const st = ui.playSort || 'total', now = d.now;
  const last = (n) => { const out = []; for (let i = n - 1; i >= 0; i--) out.push(berlinKey(now - i * 864e5)); return out; };
  const k7 = last(7), k30 = last(30), sumK = (r, ks) => ks.reduce((a, k) => a + ((r.days || {})[k] || 0), 0);
  const rows = d.rows.map((r) => { const act = Object.values(r.days || {}).filter((v) => v > 0).length; return { ...r, today: (r.days || {})[d.today] || 0, w7: sumK(r, k7), avg: act ? r.total / act : 0, act }; });
  const sorters = { total: (a, b) => b.total - a.total, w7: (a, b) => b.w7 - a.w7, today: (a, b) => b.today - a.today, last: (a, b) => (b.last || 0) - (a.last || 0), name: (a, b) => a.name.localeCompare(b.name, 'de') };
  rows.sort(sorters[st] || sorters.total);
  const tot = rows.reduce((a, r) => a + r.total, 0), max = Math.max(1, ...rows.map((r) => r.total)), daily = k30.map((k) => rows.reduce((a, r) => a + ((r.days || {})[k] || 0), 0)), dmax = Math.max(1, ...daily);
  const tiles = [['Konten', n0(rows.length), `${rows.filter((r) => r.total > 0).length} mit Spielzeit`], ['Spielzeit gesamt', fmtDur(tot), d.since ? `seit ${new Date(d.since).toLocaleDateString('de-DE')}` : 'noch nichts erfasst'],
    ['Heute', fmtDur(rows.reduce((a, r) => a + r.today, 0)), `${rows.filter((r) => r.today > 0).length} Spieler aktiv`], ['Letzte 7 Tage', fmtDur(rows.reduce((a, r) => a + r.w7, 0)), `${rows.filter((r) => r.w7 > 0).length} Spieler aktiv`], ['Gerade online', n0(rows.filter((r) => r.online).length), 'in einem Spiel']];
  const bars = `<div class="pt-days" role="img" aria-label="Spielzeit aller Spieler je Tag, letzte 30 Tage">${daily.map((v, i) => `<i style="height:${Math.max(v ? 3 : 0, v / dmax * 100).toFixed(1)}%" title="${new Date(now - (29 - i) * 864e5).toLocaleDateString('de-DE')}: ${fmtDur(v)}"></i>`).join('')}</div><div class="spread small muted"><span>vor 30 Tagen</span><span>heute</span></div>`;
  const spark = (r) => { const v = k30.map((k) => (r.days || {})[k] || 0), mx = Math.max(1, ...v); return `<span class="pt-spark">${v.map((x) => `<i style="height:${Math.max(x ? 8 : 0, x / mx * 100).toFixed(0)}%"></i>`).join('')}</span>`; };
  const th = (k, l, cls = 'r') => `<th class="${cls}"><button class="linkbtn${st === k ? ' on' : ''}" data-pt="${k}">${l}${st === k ? ' ▾' : ''}</button></th>`;
  const open = ui.playOpen || (ui.playOpen = {});
  const body = rows.map((r, i) => `<tr class="${r.total ? '' : 'muted'}" data-pto="${esc(r.key)}" style="cursor:pointer"><td class="r muted">${i + 1}</td><td><i class="pc-dot ${r.online ? 'on' : ''}"></i> <b>${esc(r.name)}</b>${r.admin ? ' <span class="chip">Admin</span>' : ''}</td>
      <td class="r"><b>${r.total ? fmtDur(r.total) : '–'}</b><div class="pt-bar"><i style="width:${(r.total / max * 100).toFixed(1)}%"></i></div></td><td class="r">${r.today ? fmtDur(r.today) : '–'}</td><td class="r">${r.w7 ? fmtDur(r.w7) : '–'}</td>
      <td class="r">${r.act ? fmtDur(r.avg) : '–'}</td><td class="r">${r.act || '–'}</td><td class="r">${r.sessions || '–'}</td><td>${spark(r)}</td><td class="r small">${r.online ? '<span class="pos">online</span>' : agoTxt(r.last, now)}</td></tr>
    ${open[r.key] ? `<tr class="pnl-d"><td></td><td colspan="9" class="small">${r.games.length ? r.games.map((g) => `${esc(g.name)}: <b>${fmtDur(g.ms)}</b>`).join(' · ') : 'noch keine erfasste Spielzeit'}${r.created ? ` · Konto seit ${new Date(r.created).toLocaleDateString('de-DE')}` : ''}${r.first ? ` · erste erfasste Sitzung ${new Date(r.first).toLocaleDateString('de-DE')}` : ''}</td></tr>` : ''}`).join('');
  m.innerHTML = `<div class="dialog wide pt" role="dialog" aria-modal="true"><div class="spread"><h1>Spielzeit der Spieler</h1><button class="btn small" data-pt="close">Schließen</button></div>
    <p class="small muted">Gezählt wird die Zeit mit sichtbarem, bedientem Spielfenster in einem Online-Spiel (Lebenszeichen alle 15–25 Sekunden). Nicht gezählt: Fenster im Hintergrund, gesperrtes Handy, ein offen stehendes Fenster ohne Maus, Tastatur oder Touch seit 10 Minuten und Lücken über 45 Sekunden (gedrosselte Hintergrund-Tabs). Zahlen vor dem 5. November 2026 können offen gelassene Fenster mitzählen. Erfasst wird seit dem Update ${d.since ? `(erste Sitzung ${new Date(d.since).toLocaleDateString('de-DE')})` : ''} – frühere Spielzeit ist nicht gespeichert.</p>
    <div class="tiles">${tiles.map(([a, b, c]) => `<div class="tile"><span>${a}</span><b>${b}</b><em>${c}</em></div>`).join('')}</div>
    <div class="stack"><h3>Alle Spieler je Tag</h3>${bars}</div>
    <div class="tw"><table class="t pt-t"><thead><tr><th class="r">#</th>${th('name', 'Spieler', '')}${th('total', 'Gesamt')}${th('today', 'Heute')}${th('w7', '7 Tage')}<th class="r">Ø je Spieltag</th><th class="r">Tage</th><th class="r">Sitzungen</th><th>30 Tage</th>${th('last', 'Zuletzt')}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="small muted">Zeile anklicken: Spielzeit je Spiel. „Ø je Spieltag“: Spielzeit geteilt durch die Tage, an denen gespielt wurde.</p></div>`;
  m.onclick = (e) => {
    const b = e.target.closest('[data-pt]'); if (b) { const v = b.dataset.pt; if (v === 'close') { m.onclick = null; onBack(); return; } ui.playSort = v; showPlaytime(onBack); return; }
    const r = e.target.closest('[data-pto]'); if (r) { open[r.dataset.pto] = !open[r.dataset.pto]; showPlaytime(onBack); }
  };
}
/** Passwort ändern – freiwillig oder Pflicht nach einem Zurücksetzen durch die Spielleitung. */
function showPwChange({ forced = false, current = '', then = null } = {}) {
  const back = then || (() => { $('#modal').hidden = true; });
  const m = modal(`<div><h1>${forced ? 'Neues Passwort wählen' : 'Passwort ändern'}</h1>
    <p class="ink2">${forced ? 'Ihr Passwort wurde von der Spielleitung zurückgesetzt. Bitte wählen Sie jetzt ein eigenes – das vorläufige gilt danach nicht mehr.' : 'Nach der Änderung müssen Sie sich auf anderen Geräten neu anmelden.'}</p></div>
    <form id="pwForm" class="stack">
      <label class="f"><span>${forced ? 'Vorläufiges Passwort' : 'Bisheriges Passwort'}</span><input type="password" id="pwCur" autocomplete="current-password" required value="${esc(current)}"></label>
      <label class="f"><span>Neues Passwort</span><input type="password" id="pwNew" autocomplete="new-password" minlength="8" required></label>
      <label class="f"><span>Neues Passwort wiederholen</span><input type="password" id="pwNew2" autocomplete="new-password" minlength="8" required></label>
      <p class="small muted">Mindestens 8 Zeichen. Niemand – auch nicht die Spielleitung – kann Ihr Passwort einsehen; gespeichert wird nur ein verschlüsselter Fingerabdruck.</p>
      <div class="formbar"><p class="small neg" id="formErr" hidden></p>
      <div class="row">${forced ? '<button class="btn" type="button" id="pwOut">Abmelden</button>' : '<button class="btn" type="button" id="pwCancel">Abbrechen</button>'}<button class="btn primary" type="submit" style="margin-left:auto">Passwort speichern</button></div></div>
    </form>`, false);
  const out = m.querySelector('#pwOut'), cancel = m.querySelector('#pwCancel');
  if (out) out.addEventListener('click', async () => { try { await api('/logout', { body: {} }); } catch (e) { /* egal */ } mpState.user = null; showAuth(); });
  if (cancel) cancel.addEventListener('click', back);
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = $('#pwCur').value, nx = $('#pwNew').value;
    if (nx !== $('#pwNew2').value) { formError('Die neuen Passwörter stimmen nicht überein.'); return; }
    if (nx.length < 8) { formError('Das neue Passwort braucht mindestens 8 Zeichen.'); return; }
    try { const r = await api('/password', { body: { current: cur, next: nx } }); if (mpState.user) mpState.user.mustChange = false; toast(r.msg || 'Passwort geändert.'); back(); }
    catch (err) { formError(err.message); }
  });
  setTimeout(() => { const f = $(current ? '#pwNew' : '#pwCur'); if (f) f.focus(); }, 50);
}

// ---------- Lobby ----------
async function showLobby(tab = null) {
  stopOnline();
  setSpeed(0);
  if (mpState.pendingJoin) { const pj = mpState.pendingJoin; mpState.pendingJoin = null; return showJoin(pj.code, pj.token); }
  const m = modal(`<div class="spread"><h1>Sky<span>market</span></h1><div class="row small"><span class="muted">Angemeldet als <b>${esc(mpState.user.name)}</b>${mpState.user.admin ? ' <span class="chip me">Admin</span>' : ''}</span><button class="btn small" id="lbPw">Passwort ändern</button><button class="btn small" id="lbLogout">Abmelden</button></div></div>
    ${!suspOf() && (blkOf('chat') || blkOf('trade')) ? `<div class="callout warn"><b>Luftfahrtaufsicht:</b><span class="small">${[blkOf('chat') ? `Chat gesperrt bis ${esc(fmtUntil(blkOf('chat')))}` : '', blkOf('trade') ? `Handel und Börse gesperrt bis ${esc(fmtUntil(blkOf('trade')))}` : ''].filter(Boolean).join(' · ')}. Alles andere können Sie wie gewohnt spielen.</span></div>` : ''}
    ${suspOf() ? `<div class="callout crit"><b>Luftfahrtaufsicht: Ihr Leitstand ist bis ${esc(fmtUntil(suspOf().until))} stillgelegt.</b><span class="small">${suspOf().reason ? `Grund: ${esc(suspOf().reason)} · ` : ''}Sie können zuschauen, aber nicht handeln oder schreiben. Die KI führt so lange Ihre Airline.</span></div>` : ''}
    <section class="mainworld" id="lbMain"><p class="small muted">Lade die Hauptwelt …</p></section>
    <div class="lobby">
      <section class="stack"><div class="spread"><h3>Meine Spiele</h3><button class="btn small primary" id="lbNew">Neues Spiel</button></div><div id="lbMine" class="glist"><p class="small muted">Lade …</p></div></section>
      ${mpState.user.admin ? `<section class="stack" style="grid-column:1/-1"><div class="spread"><h3>Verwaltung · alle Spiele</h3></div><div class="adm-bar"><button class="btn small primary" id="lbPlay">Spielzeit der Spieler</button><button class="btn small primary" id="lbPacks">Packs, Shop &amp; Angebote<span class="badge" id="lbPacksN" hidden></span></button><button class="btn small" id="lbMainAdm">Hauptwelt verwalten</button><button class="btn small" id="lbDiag">Fehlerprotokoll</button><button class="btn small" id="lbFair">Fair Play<span class="badge" id="lbFairN" hidden></span></button></div><p class="small muted">Als Admin sehen Sie alle Spiele – auch passwortgeschützte –, treten ohne Passwort bei und können jedes Spiel löschen.</p><div id="lbAdmin" class="glist"><p class="small muted">Lade …</p></div></section>` : ''}
      <section class="stack"><h3>Spiel beitreten</h3>
        <form id="lbCodeForm" class="row"><input type="text" id="lbCode" maxlength="6" placeholder="Code, z. B. K7QF2M" style="text-transform:uppercase;flex:1;min-width:140px"><button class="btn" type="submit">Suchen</button></form>
        <form id="lbSearchForm" class="row"><input type="text" id="lbQ" maxlength="40" placeholder="Spielname suchen" style="flex:1;min-width:140px"><button class="btn" type="submit">Finden</button></form>
        <div id="lbResults" class="glist"></div>
        <p class="small muted">Spiele mit Schloss brauchen ein Passwort, außer Sie kommen über einen Einladungslink.</p>
      </section>
    </div>
    <div class="row small"><button class="btn small" id="lbGuide">Anleitung</button><button class="btn small" id="lbSolo">Allein und offline spielen</button><span class="muted">Ein Offline-Spiel bleibt in diesem Browser.</span></div>`);
  $('#lbLogout').addEventListener('click', async () => { try { await api('/logout', { body: {} }); } catch (e) { /* egal */ } mpState.user = null; showAuth(); });
  $('#lbPw').addEventListener('click', () => showPwChange({ then: () => showLobby() }));
  if ($('#lbPlay')) $('#lbPlay').addEventListener('click', () => showPlaytime(() => showLobby()));
  if ($('#lbDiag')) $('#lbDiag').addEventListener('click', () => showDiag(() => showLobby()));
  if ($('#lbPacks')) { $('#lbPacks').addEventListener('click', () => showPackAdmin()); api('/coll/admin', { timeout: 15000 }).then((d) => { const n = d.requests.filter((q) => q.status === 'open').length, el = $('#lbPacksN'); if (el && n) { el.textContent = n; el.hidden = false; el.title = `${n} offene Pack-Anfrage${n > 1 ? 'n' : ''}`; } }).catch(() => {}); }
  if ($('#lbMainAdm')) $('#lbMainAdm').addEventListener('click', () => showAdmin('main', () => showLobby()));
  if ($('#lbFair')) { $('#lbFair').addEventListener('click', () => showFairPlay(() => showLobby())); api('/admin/fairplay', { timeout: 15000 }).then((d) => { const el = $('#lbFairN'); if (el && d.open) { el.textContent = d.open; el.hidden = false; el.title = `${d.open} auffällige${d.open > 1 ? '' : 's'} Konto${d.open > 1 ? 'en' : ''} ungeprüft`; } }).catch(() => {}); }
  $('#lbNew').addEventListener('click', showCreate);
  $('#lbSolo').addEventListener('click', () => showStart(false));
  $('#lbGuide').addEventListener('click', () => showGuide(() => showLobby()));
  $('#lbCodeForm').addEventListener('submit', (e) => { e.preventDefault(); const c = $('#lbCode').value.trim().toUpperCase(); if (c) showJoin(c); });
  $('#lbSearchForm').addEventListener('submit', (e) => { e.preventDefault(); lobbySearch($('#lbQ').value.trim()); });
  m.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]'); if (b) enterGame(b.dataset.open);
    const j = e.target.closest('[data-join]'); if (j) showJoin(j.dataset.join);
    const mg = e.target.closest('[data-manage]'); if (mg) { showAdmin(mg.dataset.manage, () => showLobby()); return; }
    const d = e.target.closest('[data-del]');
    if (d) {
      if (!d.dataset.armed) { d.dataset.armed = '1'; d.textContent = 'Wirklich löschen?'; return; }
      api(`/games/${d.dataset.del}/delete`, { body: {} }).then(() => { toast('Spiel gelöscht.'); showLobby(); }).catch((err) => toast(err.message));
    }
  });
  loadMainCard();
  try {
    const mine = await api('/games/mine');
    if (!$('#lbMine')) return;
    $('#lbMine').innerHTML = mine.games.length ? mine.games.map(gameCard).join('') : '<p class="small muted">Noch keine Spiele. Legen Sie eines an oder treten Sie einem bei.</p>';
  } catch (e) { if (e.status === 401) return showAuth(); if ($('#lbMine')) $('#lbMine').innerHTML = `<p class="small neg">${esc(e.message)}</p>`; }
  lobbySearch('');
  if (mpState.user.admin) {
    try { const a = await api('/admin/games'); if (!$('#lbAdmin')) return; /* Lobby inzwischen geschlossen */ $('#lbAdmin').innerHTML = a.games.length ? a.games.map(adminCard).join('') : '<p class="small muted">Keine Spiele vorhanden.</p>'; }
    catch (e) { if ($('#lbAdmin')) $('#lbAdmin').innerHTML = `<p class="small neg">${esc(e.message)}</p>`; }
  }
}
// ---------- Hauptwelt: dauerhafte gemeinsame Welt ----------
const MAIN_CODE = 'HAUPTW';
const startTxt = (t) => new Date(t).toLocaleString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
function leftTxt(ms) {
  if (ms <= 0) return 'jetzt';
  const m = Math.ceil(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? `${d} Tag${d > 1 ? 'e' : ''} ${h} Std.` : h ? `${h} Std. ${mm} Min.` : `${mm} Min.`;
}
/** Vor dem geplanten Start: Zeitpunkt (ms) oder null. */
const preStart = () => { const c = ui.mp && mpState.clock; return c && c.startAt && c.startAt > Date.now() + (mpState.skew || 0) ? c.startAt : null; };
let countTimer = null;
function tickCountdowns() {
  clearInterval(countTimer);
  countTimer = setInterval(() => {
    const els = document.querySelectorAll('[data-count]'); if (!els.length) { clearInterval(countTimer); return; }
    for (const el of els) { const left = Number(el.dataset.count) - Date.now() - (mpState.skew || 0); el.textContent = left > 0 ? leftTxt(left) : 'jetzt – bitte neu laden'; }
  }, 20000);
}
function rosterHtml(list, mine = null) {
  if (!list || !list.length) return '<p class="small muted">Noch keine Airline angemeldet – seien Sie die erste.</p>';
  return `<div class="roster">${list.map((r) => `<div class="ro${mine && r.name === mine ? ' me' : ''}"><span class="ro-logo">${logoSvg({ name: r.name, code: r.code, logo: r.logo, pixLogo: r.pixLogo }, 40)}</span>
    <div style="min-width:0"><b>${esc(r.name)}</b> <span class="small muted mono">${esc(r.code || '')}</span>${r.status === 'insolvent' ? ' <span class="chip crit">insolvent</span>' : ''}
      <div class="small">Start in <b class="mono">${esc(r.base || '–')}</b> <span class="muted">${r.base && P.AIRPORTS[r.base] ? esc(apName(r.base)) : ''}</span></div><div class="small muted">${esc(r.user || '')}</div></div></div>`).join('')}</div>`;
}
const mainLink = () => `${location.origin}${location.pathname}?join=${MAIN_CODE}`;
async function copyLink(link, inputSel) { try { await navigator.clipboard.writeText(link); toast('Link kopiert.'); } catch (e) { const el = $(inputSel); if (el) el.select(); toast('Bitte den markierten Link kopieren.'); } }
async function loadMainCard() {
  const box = $('#lbMain'); if (!box) return;
  try {
    const g = await api('/main');
    const sp = SM.SPEEDS[g.speed] || SM.SPEEDS.m20, perDay = sp.ms ? Math.round(86400000 / sp.ms) : 0;
    if (g.now) mpState.skew = g.now - Date.now();
    const wait = g.startAt && g.startAt > g.now;
    const roster = (g.roster || []).slice().sort((a, b) => (b.name === g.airlineName) - (a.name === g.airlineName) || (a.joined || 0) - (b.joined || 0));
    box.innerHTML = `<div class="mw-head"><div><span class="chip ${wait ? 'warn' : 'good'}">${wait ? 'Start geplant' : 'Dauerspiel'}</span><h2>Hauptwelt</h2>
        <p class="ink2">${wait ? `Der Neustart beginnt am <b>${esc(startTxt(g.startAt))}</b> – alle Airlines starten gleichzeitig. Schon jetzt können Sie Ihre Airline anmelden, Logo, Name und Heimatbasis festlegen und Mitspielende einladen. Danach läuft die Welt rund um die Uhr: ${esc(sp.short)}, also rund ${n0(perDay)} Spieltage pro echtem Tag.`
          : `Eine gemeinsame Welt für alle Angemeldeten. Sie läuft rund um die Uhr weiter – ${sp.ms ? `${esc(sp.short)} Spielzeit, also rund ${n0(perDay)} Spieltage pro echtem Tag` : 'gerade angehalten'}. Bauen Sie Ihre Airline über Wochen auf und schauen Sie täglich vorbei.`}</p></div>
        <div class="mw-stats">${wait ? `<div class="mw-count"><b data-count="${g.startAt}">${leftTxt(g.startAt - g.now)}</b><span>bis zum Start</span></div>` : `<div><b>${dateShortY(g.day)}</b><span>Spieltag ${n0(g.day + 1)}</span></div>`}<div><b>${g.players}/${g.max}</b><span>Airlines</span></div><div><b>${g.online}</b><span>zuletzt aktiv</span></div></div></div>
      <div class="row">${g.admin ? '<button class="btn small" data-manage="main">Verwalten</button>' : ''}${g.member ? `<span class="small">Ihre Airline: <b>${esc(g.airlineName || '')}</b></span><button class="btn primary" data-open="main" style="margin-left:auto">${wait ? 'Logo und Basis vorbereiten' : 'Weiterspielen'}</button>`
        : g.players >= g.max ? '<span class="chip">Die Hauptwelt ist gerade voll.</span>' : `<span class="small muted">${wait ? 'Anmelden geht schon jetzt, Name und Basis lassen sich bis zum Start ändern.' : 'Sie starten mit vollem Startkapital, egal wie lange die Welt schon läuft.'}</span><button class="btn primary" data-join="${MAIN_CODE}" style="margin-left:auto">${wait ? 'Airline anmelden' : 'Airline gründen'}</button>`}</div>
      <div class="stack"><div class="spread"><h3>${wait ? 'Angemeldete Airlines' : 'Airlines in der Hauptwelt'} <small class="muted">${roster.length}</small></h3></div>${rosterHtml(roster.slice(0, wait ? 200 : 24), g.airlineName)}${!wait && roster.length > 24 ? `<p class="small muted">… und ${roster.length - 24} weitere</p>` : ''}</div>
      <div class="stack"><h3>Freunde einladen</h3><div class="row"><input type="text" id="mwLink" readonly value="${esc(mainLink())}" style="flex:1;min-width:200px"><button class="btn" id="mwCopy">Link kopieren</button></div>
        <p class="small muted">Wer den Link öffnet, legt ein Konto an und kommt direkt zur Anmeldung der Airline.</p></div>`;
    $('#mwCopy').addEventListener('click', () => copyLink(mainLink(), '#mwLink'));
    if (wait) tickCountdowns();
  } catch (e) { if (e.status === 401) return showAuth(); box.innerHTML = `<p class="small neg">Hauptwelt nicht erreichbar: ${esc(e.message)}</p>`; }
}
/** Wert für <input type="datetime-local"> in Ortszeit. */
function dtLocal(t) { if (!t) return ''; const d = new Date(t), z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; }
/** Nächster Freitag, 12:00 Uhr (Ortszeit) – Vorschlag für den Neustart der Hauptwelt. */
function nextFriNoon() { const d = new Date(); d.setHours(12, 0, 0, 0); let add = (5 - d.getDay() + 7) % 7; if (add === 0 && d.getTime() <= Date.now()) add = 7; d.setDate(d.getDate() + add); return d.getTime(); }
const dateShortY = (day) => { const p = dateParts(day); return `${p.d}. ${MONTHS[p.m]} ${p.y}`; };
// ---------- Verwaltung eines Spiels (Admins überall, Spielleitung im eigenen Spiel) ----------
const EV_TYPE = { downturn: 'Branchenkrise', oil_glut: 'Ölschwemme', mega: 'Großereignis (Kalender)', storm: 'Unwetter', volcano: 'Vulkanasche', airspace: 'Luftraum', atc_strike: 'Lotsenstreik', airport_strike: 'Flughafenstreik', big_event: 'Großereignis', recession: 'Rezession', boom: 'Aufschwung', trade_war: 'Handelskrieg', trade_deal: 'Handelsabkommen', carbon: 'CO₂-Abgabe', fee_hike: 'Entgelte', tax_change: 'Ticketsteuer', rate_change: 'Leitzins', health: 'Gesundheitskrise', pilot_shortage: 'Pilotenmangel', fx_shock: 'Wechselkurs', fuel_spike: 'Kerosin', fuel_drop: 'Kerosin', own_strike: 'Streik (Airline)', strike: 'Streik (Airline)', sickness: 'Krankheitswelle', it_outage: 'IT-Ausfall',
  conflict: 'Konflikt', flight_ban: 'Flugverbot', sanctions: 'Sanktionen', carrier_ban: 'Landerechte', unrest: 'Unruhen', entry_ban: 'Einreisestopp', open_skies: 'Open Skies', visa_free: 'Visafreiheit',
  shorthaul_ban: 'Kurzstreckenverbot', foreign_fee: 'Sonderabgabe', domestic_aid: 'Inlandsförderung', epidemic: 'Krankheitsausbruch', solar: 'Sonnensturm', heatwave: 'Hitzewelle', sandstorm: 'Sandsturm',
  monsoon: 'Monsun', blizzard: 'Blizzard', wildfire: 'Waldbrände', quake: 'Erdbeben' };
async function showAdmin(id, onBack) {
  const m = modal('<h1>Verwaltung</h1><p class="small muted">Lade …</p>');
  let d;
  try { d = await api(`/games/${id}/admin`); } catch (e) { toast(e.message); onBack(); return; }
  const day = d.day, alName = (aid) => { const p = d.players.find((x) => x.airlineId === aid); return p ? p.airlineName : aid; };
  const pRow = (p) => `<div class="adm-p"><div style="min-width:0"><b>${esc(p.airlineName)}</b> <span class="small muted mono">${esc(p.code || '')}</span>${p.me ? ' <span class="chip me">Sie</span>' : ''}${p.host ? ' <span class="chip">Leitung</span>' : ''}${p.status === 'insolvent' ? ' <span class="chip crit">insolvent</span>' : ''}${p.auto ? ` <span class="chip warn" title="${p.autoForced ? 'Von der Spielleitung gestartet – endet, sobald die Person wieder spielt.' : 'Automatisch nach längerer Abwesenheit.'}">KI-Vertretung${p.autoForced ? ' (Leitung)' : ''}</span>` : ''}
      <div class="small muted"><i class="pc-dot ${p.online ? 'on' : ''}"></i>${esc(p.name)} · Basis ${esc(p.base || '–')} · ${p.equity === null ? '–' : 'EK ' + eur(p.equity)} · ${p.fleet} Flugzeuge · ${p.routes} Strecken · seit ${new Date(p.joined).toLocaleDateString('de-DE')}</div></div>
    ${p.me ? '' : `<div class="row adm-act"><span class="row" style="gap:4px"><input type="number" class="adm-amt" data-for="${esc(p.airlineId)}" step="1" min="-999" max="999" placeholder="± Mio. € (bis 999)" aria-label="Kapitalkorrektur in Mio. Euro"><button class="btn small" data-adm="grant" data-al="${esc(p.airlineId)}">Kapital buchen</button></span>
      ${p.status !== 'insolvent' && p.status !== 'fehlt' ? `<button class="btn small" data-adm="auto" data-al="${esc(p.airlineId)}" data-on="${p.auto ? '' : '1'}" title="${p.auto ? 'Die KI vertritt diese Airline gerade.' : 'Die KI führt die Airline auf mittlerem Niveau weiter, bis die Person wieder spielt.'}">${p.auto ? 'KI-Vertretung beenden' : 'KI vertreten lassen'}</button>` : ''}
      ${d.admin ? `<button class="btn small" data-adm="pw" data-u="${esc(p.u)}" data-n="${esc(p.name)}">Passwort zurücksetzen</button>` : ''}<button class="btn small danger" data-adm="kick" data-al="${esc(p.airlineId)}">Entfernen</button><button class="btn small danger" data-adm="kick" data-ban="1" data-al="${esc(p.airlineId)}">Entfernen + sperren</button></div>`}</div>`;
  const when = (e) => (e.cancelled ? 'annulliert' : e.start > day ? `ab ${dateShort(e.start)}` : e.end > day ? `bis ${dateShort(e.end)}` : 'wirkt nach');
  const eRow = (e) => `<div class="adm-e${e.cancelled ? ' off' : ''}"><span class="chip ${e.severity === 'crit' ? 'crit' : e.severity === 'good' ? 'good' : 'warn'}">${esc(EV_TYPE[e.type] || e.type)}</span><div style="min-width:0"><span class="small">${esc(e.text)}</span><div class="small muted">${when(e)}${e.airline ? ' · betrifft ' + esc(alName(e.airline)) : ''}</div></div>
    ${e.cancelled ? '' : `<button class="btn small" data-adm="cancel" data-ev="${esc(e.id)}">Annullieren</button>`}</div>`;
  m.innerHTML = `<div class="dialog wide" role="dialog" aria-modal="true"><div class="spread"><h1>Verwaltung <small class="muted">${esc(d.name)}</small></h1><button class="btn small" data-adm="close">Schließen</button></div>
    <p class="small muted">Spieltag ${n0(day + 1)} · ${d.players.length} Airlines. Alles, was Sie hier tun, sehen alle Mitspielenden als Meldung.</p>
    <section class="stack"><h3>Airlines</h3><div class="adm-list">${d.players.map(pRow).join('') || '<p class="small muted">Niemand spielt mit.</p>'}</div>
      <p class="small muted">„Entfernen“ beendet die Airline sofort: Strecken enden, Leasingflugzeuge gehen zurück, Slots, Gates und offene Angebote verfallen. Die Person kann danach neu beitreten – außer mit „sperren“. Kapital buchen: positiver Betrag schießt zu, negativer zieht ab (z. B. zum Ausgleich eines Fehlers).</p></section>
    ${d.audit ? adminAuditHtml(d.audit) : ''}
    ${d.banned.length ? `<section class="stack"><h3>Gesperrt</h3><div class="adm-list">${d.banned.map((b) => `<div class="adm-p"><div><b>${esc(b.name)}</b> <span class="small muted">zuletzt ${esc(b.airlineName || '')} · seit ${new Date(b.at).toLocaleDateString('de-DE')}</span></div><button class="btn small" data-adm="unban" data-u="${esc(b.u)}">Sperre aufheben</button></div>`).join('')}</div></section>` : ''}
    ${d.admin ? `<section class="stack"><h3>Konto zurücksetzen</h3><div class="row"><input type="text" id="adm-pwu" maxlength="20" placeholder="Benutzername" style="flex:1;min-width:160px" autocomplete="off"><button class="btn small" data-adm="pw">Vorläufiges Passwort erzeugen</button></div>
      <p class="small muted">Passwörter kann niemand einsehen – sie sind nur als Fingerabdruck gespeichert. Hier erzeugen Sie ein vorläufiges Passwort für ein beliebiges Konto. Geben Sie es der Person weiter; beim nächsten Anmelden muss sie ein eigenes wählen. Ihre bisherigen Sitzungen enden sofort.</p><div id="adm-pwout"></div></section>` : ''}
    ${d.canSpeed ? `<section class="stack"><h3>Tempo</h3><div class="seg wrap">${Object.entries(SM.SPEEDS).filter(([, v]) => !v.local).map(([k, v]) => `<button data-adm="speed" data-v="${k}" aria-pressed="${k === d.speed}">${esc(v.label)}</button>`).join('')}</div>
      <p class="small muted">Gilt sofort für alle in ${d.main ? 'der Hauptwelt' : 'diesem Spiel'}; die Uhr rechnet die angefangene Zeit um. Alle sehen eine Meldung.</p></section>` : ''}
    ${d.startAt ? `<section class="stack"><h3>Geplanter Start</h3><div class="callout info stack"><span><b>${esc(startTxt(d.startAt))}</b> · noch ${leftTxt(d.startAt - Date.now())} – bis dahin können sich alle anmelden, Logo, Name und Basis festlegen; die Uhr steht.</span>
      <div class="row"><label class="f" style="flex:1;min-width:200px"><span>Neuer Termin</span><input type="datetime-local" id="adm-start2" value="${dtLocal(d.startAt)}"></label><button class="btn small" data-adm="setstart">Termin ändern</button><button class="btn small primary" data-adm="startnow">Jetzt starten</button></div></div></section>` : ''}
    <section class="stack"><h3>Welt neu starten</h3><div class="callout warn stack"><span class="small">Startet ${d.main ? 'die Hauptwelt' : 'dieses Spiel'} bei Tag 1 mit neuer Weltlage und neuer Konkurrenz. Alle Airlines, Flotten, Strecken und Kassen verfallen.</span>
      <label class="chk small"><input type="checkbox" id="adm-keep" checked> Alle Mitspielenden behalten – sie beginnen mit Name, Kürzel, Basis und Logo wie bisher und frischem Startkapital</label>
      <div class="grid2"><label class="f"><span>Start (leer = sofort)</span><input type="datetime-local" id="adm-start" value="${d.main ? dtLocal(nextFriNoon()) : ''}"></label>
        <label class="f"><span>Tempo nach dem Start</span><select id="adm-speed">${Object.entries(SM.SPEEDS).filter(([k, v]) => !v.local && k !== 'p').map(([k, v]) => `<option value="${k}" ${k === (d.main ? 'm20' : d.speed) ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label></div>
      <p class="small muted">Mit Termin steht die Uhr bis dahin still: Alle können sich schon anmelden, Logo, Name und Heimatbasis festlegen und Pläne vorbereiten. Flugzeuge, Strecken und Personal gibt es erst ab dem Start – für alle gleichzeitig.</p>
      <div class="row"><button class="btn small danger" data-adm="reset">Welt neu starten</button></div></div></section>
    <section class="stack"><h3>Ereignisse</h3><div class="adm-list">${d.events.map(eRow).join('') || '<p class="small muted">Gerade keine Ereignisse.</p>'}</div>
      <p class="small muted">Annullieren: Angekündigte Ereignisse fallen aus, laufende enden sofort. Steuern, Entgelte, CO₂-Abgabe, Zins, Wechselkurs und Kerosinsprung werden zurückgenommen; die Konjunktur erholt sich nach einer Rezession entsprechend schneller. Bereits ausgefallene Flüge bleiben ausgefallen.</p></section></div>`;
  m.onchange = (e) => { if (e.target.id === 'adm-aa') { const nw = m.querySelector('#adm-anw'); if (nw) nw.hidden = e.target.value !== 'x:'; } };
  m.onclick = async (e) => {
    const b = e.target.closest('[data-adm]'); if (!b) return;
    const cmd = b.dataset.adm;
    if (cmd === 'close') { m.onclick = null; onBack(); return; }
    if (cmd === 'speed') { try { await api(`/games/${id}/control`, { body: { speed: b.dataset.v, tz: new Date().getTimezoneOffset() } }); toast(`Tempo: ${SM.SPEEDS[b.dataset.v].label}`); if (ui.mp && ui.mp.id === id) await mpPoll(true); } catch (err) { toast(err.message); } showAdmin(id, onBack); return; }
    if (cmd === 'pw') {
      const uname = b.dataset.u || ((m.querySelector('#adm-pwu') || {}).value || '').trim(), label = b.dataset.n || uname;
      if (!uname) { toast('Bitte einen Benutzernamen eingeben.'); return; }
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = `Passwort von ${label} wirklich zurücksetzen?`; b.classList.add('danger'); return; }
      b.disabled = true;
      try {
        const r = await api('/admin/password', { body: { username: uname } });
        const box = m.querySelector('#adm-pwout') || b.parentElement;
        const html = `<div class="callout good stack"><span>Vorläufiges Passwort für <b>${esc(r.name)}</b>:</span><div class="row"><input type="text" readonly id="adm-pwtmp" value="${esc(r.temp)}" class="mono" style="flex:1;min-width:160px"><button class="btn small" data-adm="pwcopy">Kopieren</button></div><span class="small">Nur jetzt sichtbar. ${esc(r.name)} muss beim nächsten Anmelden ein eigenes Passwort wählen.${r.self ? ' Das ist Ihr eigenes Konto – Sie werden gleich abgemeldet.' : ''}</span></div>`;
        if (m.querySelector('#adm-pwout')) { box.innerHTML = html; box.scrollIntoView({ block: 'center' }); } else toast(`Vorläufiges Passwort für ${r.name}: ${r.temp}`);
        b.textContent = 'Zurückgesetzt'; if (r.self) setTimeout(() => { mpState.user = null; showAuth(); }, 8000);
      } catch (err) { toast(err.message); b.disabled = false; delete b.dataset.armed; b.textContent = 'Passwort zurücksetzen'; }
      return;
    }
    if (cmd === 'pwcopy') { const i = m.querySelector('#adm-pwtmp'); if (!i) return; try { await navigator.clipboard.writeText(i.value); toast('Passwort kopiert.'); } catch (err) { i.select(); toast('Bitte das markierte Passwort kopieren.'); } return; }
    if (cmd === 'reset' && !b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Wirklich alles neu starten? Noch einmal klicken.'; return; }
    if (cmd === 'setstart' || cmd === 'startnow') {
      const v = cmd === 'startnow' ? null : new Date(($('#adm-start2') || {}).value || '').getTime();
      if (cmd === 'setstart' && !isFinite(v)) { toast('Bitte Datum und Uhrzeit wählen.'); return; }
      try { const r = await api(`/games/${id}/admin`, { body: { cmd: 'setStart', startAt: v } }); toast(r.msg || 'Erledigt.'); if (ui.mp && ui.mp.id === id) await mpPoll(true); } catch (err) { toast(err.message); }
      showAdmin(id, onBack); return;
    }
    if (cmd === 'reset') { b.disabled = true; const sv = ($('#adm-start') || {}).value, startAt = sv ? new Date(sv).getTime() : 0;
      if (sv && !isFinite(startAt)) { toast('Ungültiger Starttermin.'); b.disabled = false; return; }
      try { const r = await api(`/games/${id}/admin`, { body: { cmd: 'resetWorld', keep: !!(m.querySelector('#adm-keep') || {}).checked, startAt: startAt || null, speed: ($('#adm-speed') || {}).value } }); toast(r.msg || 'Neu gestartet.'); if (ui.mp && ui.mp.id === id) { ui.mpLastDay = null; await mpPoll(true); } } catch (err) { toast(err.message); } showAdmin(id, onBack); return; }
    if (cmd === 'audit') {
      const q = (s) => (m.querySelector(s) || {}).value || '', pv = q('#adm-aa'), ex = pv.startsWith('x:'), name = ex ? (pv.slice(2) || q('#adm-an').trim()) : '';
      const body = { cmd: 'auditOrder', b: q('#adm-ab'), a: ex ? '' : pv, name, amount: Number(String(q('#adm-av')).replace(',', '.')) * 1e6, state: ex || !!(m.querySelector('#adm-as') || {}).checked, mode: q('#adm-am') || 'choice' };
      if (!body.b || (!body.a && !body.name) || body.a === body.b) { toast(ex ? 'Bitte den Namen der Airline eingeben, die nicht mehr im Spiel ist.' : 'Bitte begünstigte Airline und Partner wählen.'); return; }
      if (!(body.amount >= 1e5)) { toast('Bitte den Vorteil in Mio. € angeben, z. B. 20.'); return; }
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.classList.add('danger'); b.textContent = `Wirklich ${eur(body.amount)} Vorteil beanstanden?`; return; }
      b.disabled = true;
      try { const r = await api(`/games/${id}/admin`, { body }); toast(r.msg || 'Angeordnet.'); if (ui.mp && ui.mp.id === id) await mpPoll(true); } catch (err) { toast(err.message); }
      showAdmin(id, onBack); return;
    }
    if ((cmd === 'kick' || cmd === 'cancel') && !b.dataset.armed) { b.dataset.armed = '1'; b.textContent = cmd === 'kick' ? (b.dataset.ban ? 'Wirklich entfernen und sperren?' : 'Wirklich entfernen?') : 'Wirklich annullieren?'; b.classList.add('danger'); return; }
    const body = cmd === 'auto' ? { cmd: 'autopilot', airlineId: b.dataset.al, on: !!b.dataset.on } : cmd === 'kick' ? { cmd: 'kick', airlineId: b.dataset.al, ban: !!b.dataset.ban } : cmd === 'unban' ? { cmd: 'unban', u: b.dataset.u } : cmd === 'cancel' ? { cmd: 'cancelEvent', eventId: b.dataset.ev }
      : { cmd: 'grant', airlineId: b.dataset.al, amount: Number((m.querySelector(`.adm-amt[data-for="${b.dataset.al}"]`) || {}).value || 0) * 1e6 };
    if (cmd === 'grant' && !body.amount) { toast('Bitte einen Betrag in Mio. € eingeben, z. B. 5 oder -5.'); return; }
    if (cmd === 'grant' && Math.abs(body.amount) > 999e6) { toast('Höchstens ±999 Mio. € auf einmal.'); return; }
    b.disabled = true;
    try { const r = await api(`/games/${id}/admin`, { body }); toast(r.msg || 'Erledigt.'); if (ui.mp && ui.mp.id === id) await mpPoll(true); }
    catch (err) { toast(err.message); }
    showAdmin(id, onBack);
  };
}
/** Verwaltung: Wirtschaftsprüfung nachvollziehen (erfasste Geschäfte, Prüfberichte) und eine Nachprüfung anordnen. */
function adminAuditHtml(a) {
  const yr = (y) => dateParts(y * 365).y, hs = a.humans, opt = (sel) => hs.map((h) => `<option value="${esc(h.id)}"${h.id === sel ? ' selected' : ''}>${esc(h.name)}</option>`).join('');
  const logRow = (r) => `<div class="adm-e"><span class="chip ${r.findings.length ? 'crit' : 'good'}">${r.late ? 'Nachprüfung' : 'Jahresabschluss'}</span><div style="min-width:0"><span class="small"><b>${dateY(r.day)}</b> · ${n0(r.n)} Geschäft${r.n === 1 ? '' : 'e'} · ${n0(r.pairs)} Paar${r.pairs === 1 ? '' : 'e'}${r.by ? ' · angeordnet' : ''}</span>
    <div class="small ${r.findings.length ? '' : 'muted'}">${r.findings.length ? r.findings.map((f) => `${esc(f.bName)} ← ${esc(f.aName)}: Rückzahlung ${eur(f.claw)}${f.state ? ' an die Staatskasse' : ''}, Bußgeld ${eur(f.fine)} · ${f.mode ? esc(a.modes[f.mode] || f.mode) : f.claw + f.fine - f.now > 0 ? `${eur(f.claw + f.fine - f.now)} in Raten` : 'sofort'}`).join('<br>') : 'keine Beanstandung'}</div></div></div>`;
  const pRow = (p) => { const d = p.aTo - p.bTo, big = Math.abs(d) >= a.minGain;
    return `<tr><td>${yr(p.year)}</td><td>${esc(p.aName)} ⇄ ${esc(p.bName)}${p.late ? ` <span class="chip">${p.late} nachgeprüft</span>` : ''}</td><td class="r">${n0(p.n)}</td><td class="r">${eur(p.aTo)}</td><td class="r">${eur(p.bTo)}</td><td class="r ${big ? 'neg' : ''}">${d === 0 ? '–' : `${eur(Math.abs(d))} an ${esc(d > 0 ? p.bName : p.aName)}`}${p.adv ? `<div class="small">angeordnet ${eur(p.adv)}</div>` : ''}</td></tr>`; };
  const prev = hs.flatMap((h) => h.preview.map((e) => ({ ...e, who: h.name }))).filter((e) => e.excess > 0);
  return `<section class="stack"><h3>Wirtschaftsprüfung</h3>
    <p class="small muted">Erfasst wird jedes angenommene Handelsgeschäft zwischen Airlines von Mitspielenden, bewertet zum Marktwert. Zum 31.12. wird je Paar geprüft: Beanstandet wird, wer mehr als ${pct(a.tol)} des Volumens über Marktwert gewinnt (mindestens ${eur(a.minGain)}). Laufendes Prüfjahr ab ${dateY(a.from)}.</p>
    <div class="adm-list">${a.log.map(logRow).join('') || '<p class="small muted">Noch kein Prüfbericht gespeichert – Berichte werden ab Version 0.21.21 aufbewahrt.</p>'}</div>
    ${prev.length ? `<div class="callout warn stack"><b>Vorschau zum nächsten Jahresabschluss</b><span class="small">${prev.map((e) => `${esc(e.who)} ← ${esc(e.name)}: ${eur(e.excess)} Vorteil${e.flagged ? ' – würde beanstandet' : ' (unter der Schwelle)'}`).join('<br>')}</span></div>` : ''}
    <div class="tw"><table class="t"><thead><tr><th>Jahr</th><th>Paar</th><th class="r">Geschäfte</th><th class="r">Wert von links</th><th class="r">Wert von rechts</th><th class="r">Saldo</th></tr></thead><tbody>${a.pairs.map(pRow).join('') || '<tr><td colspan="6" class="small muted">Keine Handelsgeschäfte zwischen Mitspielenden erfasst (gespeichert werden die letzten 400 Tage).</td></tr>'}</tbody></table></div>
    ${hs.length >= 1 ? `<div class="stack"><h4>Nachprüfung anordnen</h4>
      <div class="grid2"><label class="f"><span>Begünstigte Airline</span><select id="adm-ab">${opt(hs[0].id)}</select></label><label class="f"><span>Partner (hat den Vorteil gegeben)</span><select id="adm-aa">${opt(hs[1] ? hs[1].id : '')}${a.former.length ? `<optgroup label="nicht mehr im Spiel">${a.former.map((n) => `<option value="x:${esc(n)}">${esc(n)}</option>`).join('')}</optgroup>` : ''}<option value="x:">Andere, nicht mehr im Spiel …</option></select></label></div>
      <label class="f" id="adm-anw" hidden><span>Name der Airline, die nicht mehr im Spiel ist</span><input type="text" id="adm-an" maxlength="40" placeholder="z. B. Wodubist"></label>
      <div class="grid2"><label class="f"><span>Ungerechtfertigter Vorteil (Mio. €)</span><input type="number" id="adm-av" min="0.1" max="999" step="0.1" placeholder="z. B. 20"></label>
        <label class="f"><span>Zahlungsweise</span><select id="adm-am">${Object.entries(a.modes).map(([k, l]) => `<option value="${k}" ${k === 'choice' ? 'selected' : ''}>${esc(l)}${k === 'choice' ? ' (7 Tage, sonst 12 Raten)' : k === 'now' ? ' (fehlt Geld: Rest in 12 Raten)' : ''}</option>`).join('')}</select></label></div>
      <label class="chk small"><input type="checkbox" id="adm-as"> Rückzahlung an die Staatskasse statt an den Partner (bei Partnern, die nicht mehr im Spiel sind, immer)</label>
      <div class="row"><button class="btn small" data-adm="audit">Nachprüfung anordnen</button></div>
      <p class="small muted">Für die Mitspielenden sieht das aus wie eine gewöhnliche Nachprüfung der Wirtschaftsprüfer – Logbuch, Meldung und Entscheidung nennen die Spielleitung nicht. Wirkt wie eine Beanstandung beim Jahresabschluss: Rückzahlung, Bußgeld (10/25/50 % je nach Zahl der Beanstandungen), Prüfvermerk mit Ansehensabzug für ein Jahr. Zahlungsweisen: sofort (wählt die Airline das selbst, 10 % Nachlass aufs Bußgeld), 6 Raten (+2 %), 12 Raten (+5 %), 24 Raten (+12 %). Der Partner zahlt kein Bußgeld, wenn die Rückzahlung an die Staatskasse geht.</p></div>` : ''}
  </section>`;
}
function adminCard(g) {
  return `<div class="gcard"><div style="min-width:0"><b>${esc(g.name)}</b> ${g.locked ? '<span class="chip">🔒 Passwort</span>' : ''}
    <div class="small muted">Code ${esc(g.code)} · Leitung ${esc(g.hostName || '–')} · ${g.players}/${g.max} Airlines · Tag ${g.day + 1} · angelegt ${new Date(g.created).toLocaleDateString('de-DE')}${g.names ? ' · ' + g.names.map(esc).join(', ') : ''}</div></div>
    <span class="row" style="gap:6px;flex-wrap:nowrap">${g.players >= g.max ? '<span class="chip">voll</span>' : '<span class="chip good">offen</span>'}<button class="btn small" data-manage="${g.id}">Verwalten</button><button class="btn small danger" data-del="${g.id}">Löschen</button>${g.member ? `<button class="btn small primary" data-open="${g.id}">Öffnen</button>` : g.players < g.max ? `<button class="btn small" data-join="${esc(g.code)}">Beitreten</button>` : ''}</span></div>`;
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
        <label class="f"><span>Tempo</span><select id="crSpeed">${Object.entries(SM.SPEEDS).filter(([, v]) => !v.local).map(([k, v]) => `<option value="${k}" ${k === 'm30' ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label></div>
      ${airlineFields('cra', mpState.user.name.slice(0, 20) + ' Air', mpState.user.name.slice(0, 2).toUpperCase())}
      ${assistantPicker('cr')}
      <p class="small muted">Bis zu vier Personen, jede mit eigener Airline. Sie leiten das Spiel und bestimmen das Tempo. Die langsamen Stufen (1 Std., 30 Min., 10 Min. oder 1 Min. pro Spieltag) laufen auch weiter, wenn niemand online ist – ideal für Partien über Tage. Die schnellen Stufen halten nach einer Minute ohne Spielende an.</p>
      <div class="formbar"><p class="small neg" id="formErr" hidden></p>
      <div class="row"><button class="btn" type="button" id="crBack">Zurück</button><button class="btn primary" type="submit" style="margin-left:auto">Spiel anlegen</button></div></div>
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
/** Freies Kürzel vorschlagen: zuerst aus dem Namen, sonst Buchstabe + Ziffer. */
function freeCode(name, taken) {
  const L = String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SK';
  const tries = [L.slice(0, 2), L[0] + (L[2] || L[1] || 'X'), L[0] + (L[L.length - 1] || 'Y'), ...'ABCDEFGHKLMNPRSTVWXYZ'.split('').map((c) => L[0] + c), ...'23456789'.split('').map((c) => L[0] + c)];
  return tries.find((c) => c.length === 2 && !taken.has(c)) || '';
}
async function showJoin(code, token = null) {
  let g;
  try { g = await api(`/games/lookup?code=${encodeURIComponent(code)}${token ? '&t=' + encodeURIComponent(token) : ''}`); }
  catch (e) { if (e.status === 401) { mpState.pendingJoin = { code, token }; return showAuth(); } toast(e.message); return showLobby(); }
  if (g.member) return enterGame(g.id);
  const needPw = g.locked && !g.tokenOk && !g.adminOk;
  const taken = new Set(g.codes || []);
  const m = modal(`<h1>${esc(g.name)}</h1>
    <p class="ink2">Code ${esc(g.code)} · ${g.players}/${g.max} Airlines${g.names && g.names.length ? ': ' + g.names.slice(0, 8).map(esc).join(', ') + (g.names.length > 8 ? ` und ${g.names.length - 8} weitere` : '') : ''} · Tag ${g.day + 1}</p>
    ${g.startAt ? `<div class="callout info"><b>Start am ${esc(startTxt(g.startAt))}</b><span class="small">Sie melden Ihre Airline jetzt schon an. Bis zum Start können Sie Logo, Name und Heimatbasis ändern und Pläne vorbereiten; Flugzeuge und Strecken gibt es ab dem Start – für alle gleichzeitig.</span></div>`
      : g.main ? '<p class="small ink2">Die Hauptwelt läuft dauerhaft weiter – auch wenn Sie offline sind. Planen Sie so, dass Ihre Airline ein paar Tage ohne Sie auskommt, und schauen Sie täglich vorbei.</p>' : ''}
    ${g.players >= g.max ? '<div class="callout warn">Das Spiel ist voll.</div><div class="row"><button class="btn" id="jnBack">Zurück</button></div>' : `
    <form id="jnForm" class="stack">
      ${needPw ? '<label class="f"><span>Passwort des Spiels</span><input type="password" id="jnPw" autocomplete="off" required></label>' : g.locked ? `<div class="callout good">${g.tokenOk ? 'Einladungslink erkannt' : 'Als Admin'}, kein Passwort nötig.</div>` : ''}
      ${airlineFields('jn', mpState.user.name.slice(0, 20) + ' Air', freeCode(mpState.user.name, taken), 'HAJ', bpCtx(g.bases || null))}
      ${assistantPicker('jn')}
      ${taken.size ? `<p class="small muted">Schon vergeben: ${[...taken].map(esc).join(', ')}</p>` : ''}
      <p class="small muted">${g.startAt ? 'Alle beginnen zum Start mit dem vollen Startkapital.' : 'Sie steigen mit dem vollen Startkapital ein, auch wenn das Spiel schon läuft.'}</p>
      <div class="formbar"><p class="small neg" id="formErr" hidden></p>
      <div class="row"><button class="btn" type="button" id="jnBack">Zurück</button><button class="btn primary" type="submit" style="margin-left:auto">${g.startAt ? 'Airline anmelden' : 'Beitreten'}</button></div></div>
    </form>`}`);
  $('#jnBack').addEventListener('click', () => showLobby());
  let pick = 'lena';
  bindPicker(m, 'jn', (id) => { pick = id; });
  const f = $('#jnForm');
  const codeIn = $('#jnCode');
  if (codeIn) codeIn.addEventListener('input', () => { const c = codeIn.value.trim().toUpperCase(), er = $('#formErr'); if (!er) return; const bad = taken.has(c); er.textContent = bad ? `Das Kürzel ${c} ist schon vergeben – frei wäre z. B. ${freeCode(mpState.user.name, taken)}.` : ''; er.hidden = !bad; });
  if (f) f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (codeIn && taken.has(codeIn.value.trim().toUpperCase())) { formError(`Das Kürzel ${codeIn.value.trim().toUpperCase()} ist schon vergeben.`); codeIn.focus(); return; }
    try { await api(`/games/${g.id}/join`, { body: { password: needPw ? $('#jnPw').value : '', invite: token, airline: readAirline('jn') } }); history.replaceState(null, '', location.pathname); mpState.pendingAssistant = pick; enterGame(g.id); }
    catch (err) { formError(err.message); }
  });
}

// ---------- Im Spiel ----------
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
/** Ladeanzeige statt Lobby – verhindert Doppelklicks und zeigt, was gerade passiert. */
function loadingScreen(title, text) {
  const m = modal(`<h1>${esc(title)}</h1><div class="loadbar"><i></i></div><p class="small ink2" id="ldText">${esc(text)}</p>
    <div class="row"><button class="btn small" type="button" id="ldBack">Zurück zur Lobby</button></div>`, false);
  m.querySelector('#ldBack').onclick = () => { stopOnline(); clearLoadMark(); showLobby(); };
}
const ldText = (t) => { const e = $('#ldText'); if (e) e.textContent = t; };
async function enterGame(id) {
  stopOnline();
  const sess = mpState.sess, t0 = performance.now();
  const gname = id === 'main' ? 'Hauptwelt' : 'Spiel';
  loadingScreen(`${gname} wird geladen`, 'Verbinde mit dem Server …');
  setLoadMark(id);
  let lastErr = null, info = null, seen = null, seenKey = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      info = await api(`/games/${id}/info`, { timeout: 20000 });
      if (sess !== mpState.sess) return;
      mpState.info = info; mpState.players = info.players; mpState.ver = ''; mpState.lastInfo = Date.now(); mpState.noAirline = false;
      ui.mp = { id, airlineId: info.me.airlineId, host: info.me.host, admin: !!info.me.admin, manage: !!info.me.manage, code: info.code, name: info.name, invite: info.invite, main: !!info.main };
      // Stand vom letzten Besuch lesen, bevor der erste Abruf ihn überschreibt
      seenKey = `skymarket-seen-${id}-${ui.mp.airlineId}`;
      try { seen = JSON.parse(localStorage.getItem(seenKey) || 'null'); } catch (e) { /* egal */ }
      mpState.seenKey = null;
      W = null;
      ldText(attempt > 1 ? `Lade den Spielstand (Versuch ${attempt} von 3) …` : 'Lade den Spielstand …');
      await mpPoll(true);
      if (sess !== mpState.sess) return;
      if (mpState.noAirline || (W && !W.player)) throw Object.assign(new Error('Ihre Airline wurde im Spielstand nicht gefunden.'), { noAirline: true });
      if (!W) throw new Error('Spielstand nicht geladen.');
      lastErr = null; break;
    } catch (e) {
      if (sess !== mpState.sess) return;
      lastErr = e;
      diag('load', e, { attempt, game: id });
      if (e.status === 401) { stopOnline(); clearLoadMark(); showAuth(); return; }
      if (e.status === 403 || e.status === 404) break;
      if (attempt < 3) { ldText(`${e.message} Neuer Versuch in ${attempt * 2} Sekunden …`); await sleep(attempt * 2000); if (sess !== mpState.sess) return; }
    }
  }
  clearLoadMark();
  if (lastErr) {
    W = null; ui.mp = null; mpState.sess++;
    const m = modal(`<h1>${esc(gname)} konnte nicht geladen werden</h1>
      <div class="callout warn"><b>${esc(lastErr.message)}</b><span class="small">${lastErr.noAirline ? 'Der Spielstand kam an, aber ohne Ihre Airline. Das wurde der Spielleitung gemeldet.' : lastErr.net ? 'Die Verbindung ist abgebrochen oder zu langsam. Prüfen Sie den Empfang und versuchen Sie es noch einmal.' : 'Der Fehler wurde der Spielleitung gemeldet.'}</span></div>
      <div class="row"><button class="btn" type="button" id="leBack">Zur Lobby</button><button class="btn primary" type="button" id="leRetry" style="margin-left:auto">Erneut versuchen</button></div>`, false);
    m.querySelector('#leBack').onclick = () => showLobby();
    m.querySelector('#leRetry').onclick = () => enterGame(id);
    return;
  }
  const ms = Math.round(performance.now() - t0);
  if (ms > 8000) diag('slow', null, { ms, game: id, timing: mpState.timing });
  $('#modal').hidden = true;
  applyOnlineChrome();
  // 0.21.39: Wer zurückkommt, übernimmt sofort wieder selbst – was die KI-Vertretung getan hat, steht im Logbuch
  if (W.player && W.player.auto) { const since = W.player.auto; doAction({ type: 'resume' }); refreshAll(); setTimeout(() => toast(`Willkommen zurück: Die KI hat Ihre Airline seit ${new Date(since).toLocaleDateString('de-DE')} vertreten – Einträge „Vertretung (KI)“ im Logbuch.`), 400); }
  if (mpState.pendingAssistant) { const pa = mpState.pendingAssistant; mpState.pendingAssistant = null; setAssistant(pa); refreshAll(); greet(); }
  else if (!asst()) showAssistantPick();
  else if (seen && W.day > seen.day) awayReport(W.day - seen.day, seen);
  else toast(`Willkommen in „${info.name}“`);
  mpState.seenKey = seenKey;
  scheduleNext();
  loadColl(true);   // Aircraft Collection: Sammlung, aktive Skins, Benachrichtigungen   // 0.21.49: regelmäßig nachfragen, auch wenn man nur zuschaut (vorher erst nach der ersten eigenen Aktion)
}
function applyOnlineChrome() {
  renderSpeed(); renderUserMenu(); renderChatBtn();
  const u = $('#userBtn'); if (u) u.title = ui.mp ? `${ui.mp.name} · Menü` : 'Menü';
}
function stopOnline() { clearTimeout(mpState.timer); mpState.timer = null; mpState.sess++; mpState.busy = 0; ui.mp = null; mpState.clock = null; chatReset(); applyOnlineChrome(); }
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
/** Anwesenheit für die Spielzeit: Fenster sichtbar und in den letzten 10 Minuten bedient (Maus, Tastatur, Touch, Scrollen). */
const IDLE_MS = 10 * 60000;
let lastInput = Date.now();
for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll']) addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true, capture: true });
addEventListener('focus', () => { lastInput = Date.now(); });
function isActiveNow() { return document.visibilityState === 'visible' && Date.now() - lastInput < IDLE_MS; }
async function mpPoll(first) {
  if (!ui.mp) return;
  const sess = mpState.sess;
  if (mpState.busy === sess && !first) { scheduleNext(); return; }
  mpState.busy = sess;
  const id = ui.mp.id, T = { t0: performance.now() };
  // Zeitlimit für Abruf und Download zusammen; danach gilt die Anfrage als verloren
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, tm = ctl ? setTimeout(() => ctl.abort(), first ? 45000 : 25000) : null;
  try {
    const ping = Date.now() - mpState.lastPing > 15000;
    const r = await api(`/games/${id}/state?v=${encodeURIComponent(first ? '' : mpState.ver)}${ping ? `&ping=1&vis=${isActiveNow() ? 1 : 0}` : ''}`, { raw: true, signal: ctl ? ctl.signal : undefined });
    if (sess !== mpState.sess) return;   // Spiel inzwischen verlassen oder neu betreten: alte Antwort verwerfen
    if (r.status === 401) { stopOnline(); showAuth(); return; }
    if (r.status === 403 || r.status === 404) { stopOnline(); toast('Kein Zugriff mehr auf dieses Spiel – es wurde gelöscht oder die Spielleitung hat Ihre Airline entfernt.'); showLobby(); return; }
    if (!r.ok && r.status !== 204) { let msg = ''; try { msg = (await r.json()).error || ''; } catch (e) { /* leer */ } throw Object.assign(new Error(msg || `Server antwortet mit ${r.status}`), { status: r.status }); }
    if (ping) mpState.lastPing = Date.now();
    checkAppVersion(r.headers.get('x-app'));
    const c = r.headers.get('x-clock');
    if (c) { mpState.clock = JSON.parse(c); mpState.skew = mpState.clock.now - Date.now(); }
    const cs = Number(r.headers.get('x-chat') || 0);
    if (cs > chat.seq) chatFetch(); else chat.loaded = true;
    if (r.status === 200) {
      if (first) ldText('Spielstand wird übertragen …');
      const buf = await r.arrayBuffer(); T.fetch = performance.now() - T.t0; T.kb = Math.round(buf.byteLength / 1024);
      if (sess !== mpState.sess) return;
      if (first) ldText('Spielstand wird entpackt …');
      const txt = await gunzipToText(buf); T.unzip = performance.now() - T.t0 - T.fetch;
      if (sess !== mpState.sess) return;
      const t1 = performance.now(); const obj = JSON.parse(txt); T.parse = performance.now() - t1;
      if (first) { ldText('Welt wird aufgebaut …'); await sleep(0); if (sess !== mpState.sess) return; }
      const t2 = performance.now(); applyServerState(obj, r.headers.get('x-ver') || '', first, sess); T.apply = performance.now() - t2;
      if (first) mpState.timing = Object.fromEntries(Object.entries(T).filter(([k]) => k !== 't0').map(([k, v]) => [k, Math.round(v)]));
    }
    if (Date.now() - mpState.lastInfo > 20000) { mpState.lastInfo = Date.now(); api(`/games/${id}/info`, { timeout: 20000 }).then((info) => { if (sess !== mpState.sess) return; mpState.info = info; mpState.players = info.players; renderLegend(); ui.planesNow = true; loadColl(); if (ui.tab === 'cockpit') renderPane(); }).catch(() => {}); }
    ui.mpOffline = false;
  } catch (e) {
    if (sess !== mpState.sess) return;
    if (ctl && ctl.signal.aborted) e = Object.assign(new Error('Zeitüberschreitung – die Verbindung ist gerade sehr langsam.'), { status: 0, net: true });
    ui.mpOffline = true;
    if (first) throw e;
    if (!e.net) diag('poll', e, { game: id });
  } finally {
    if (tm) clearTimeout(tm);
    if (mpState.busy === sess) mpState.busy = 0;
    if (sess === mpState.sess && !first) { if (W) renderHeader(); scheduleNext(); }
  }
}
/** Nach einem Update: offenes Fenster mit alter Version neu laden – sofort, wenn es gerade nicht sichtbar ist, sonst per Hinweis (oder beim nächsten Zurückkehren). */
function checkAppVersion(v) {
  const mine = window.SKYMARKET_BUILD;
  if (!v || !mine || v === mine || ui.newVersion === v) return;
  ui.newVersion = v;
  const reload = () => { try { location.reload(); } catch (e) { /* nichts */ } };
  if (document.hidden) { reload(); return; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) reload(); });
  let el = document.getElementById('newver');
  if (!el) { el = document.createElement('div'); el.id = 'newver'; el.className = 'newver'; document.body.appendChild(el); }
  el.innerHTML = `<span><b>Neue Version ${esc(v)}</b> – bitte neu laden, damit alles richtig läuft.</span><button class="btn small primary" type="button">Jetzt neu laden</button>`;
  el.querySelector('button').onclick = reload;
}
function applyServerState(s, ver, first, sess = mpState.sess) {
  if (!ui.mp || sess !== mpState.sess) return false;
  let prev = W && !first ? { dec: W.player ? W.player.decisions.length : 0, ev: W.player ? W.player.events.length : 0, news: W.news.length, day: W.day } : null;
  const isView = !!s.view, keepDet = isView && W && W.player && W.player.ledger.det ? { id: W.player.id, L: W.player.ledger } : null;
  const nw = SM.deserialize(s);
  if (!ui.mp || sess !== mpState.sess) return false;
  // Eigene Airline: laut Anmeldung; nach einem Neustart der Welt über den Besitzer wiederfinden (aktive vor insolventen)
  const mine = (a) => !!(a && a.isPlayer && !a.removed);
  let myId = ui.mp.airlineId;
  if (!mine(nw.airlines[myId]) || (mpState.user && nw.airlines[myId].owner && nw.airlines[myId].owner !== mpState.user.key)) {
    const own = mpState.user ? nw.list.filter((a) => mine(a) && a.owner === mpState.user.key).sort((a, b) => (a.status === 'insolvent') - (b.status === 'insolvent'))[0] : null;
    if (own) { myId = ui.mp.airlineId = own.id; first = true; prev = null; }
  }
  if (!mine(nw.airlines[myId])) {   // Airline fehlt im Stand: nichts anzeigen, was mit einer fremden oder leeren Airline weiterarbeitet
    mpState.noAirline = true;
    diag('noairline', null, { game: ui.mp.id, airlineId: myId, airlines: nw.list.filter((a) => a.isPlayer).length, day: nw.day, owner: mpState.user ? mpState.user.key : null });
    if (first) return false;
    toast('Ihre Airline fehlt im Spielstand – bitte neu laden.'); return false;
  }
  mpState.noAirline = false;
  if (prev && nw.day < prev.day - 1) { first = true; prev = null; toast('Die Spielleitung hat die Welt neu gestartet.'); }
  W = nw;
  W.playerId = myId;
  mpState.ver = ver; mpState.isView = isView;
  if (keepDet && W.player && W.player.id === keepDet.id && !W.player.ledger.det) {   // Einzelposten des letzten Stands weiterzeigen, bis die neuen da sind
    const L = W.player.ledger, K0 = keepDet.L; L.det = K0.det; L.fx = K0.fx;
    for (const m of L.months) { const o = K0.months.find((x) => x.label && m.label && x.label.y === m.label.y && x.label.m === m.label.m); if (o) { if (o.det) m.det = o.det; if (o.fx) m.fx = o.fx; } }
  }
  if (first) { const keep = { hintSeen: ui.hintSeen, bubbleQ: [] }; resetUi(); Object.assign(ui, keep); startWorld(); }
  else {
    for (const al of W.list) W.operableFreq(al);
    buildSchedules(); renderHeader(); renderTabs(); renderMapRoutes(); renderPane(); renderDraft();
  }
  const pl = W.player;
  if (!pl) return;
  try { if (mpState.seenKey) localStorage.setItem(mpState.seenKey, JSON.stringify(snapOf(pl))); } catch (e) { /* egal */ }
  if (pl.status === 'insolvent') { gameOver(); return; }
  if (prev && W.day !== prev.day) {
    if (pl.decisions.length > prev.dec && openDecisions().length && !asst()) toast('Entscheidung nötig: Die Gewerkschaft droht mit Streik.');
    if (asst()) assistantAfterDays(prev);
    else { const crit = pl.events.slice(prev.ev).filter((e) => e.kind === 'crit' || e.kind === 'deal').pop(); if (crit) toast(crit.msg); }
  }
}
// 0.21.74 Fair-Play-Wächter: kleiner Bedien-Nachweis zu jeder Aktion (echte Eingaben, Skript-Klicks, ferngesteuerter Browser, sichtbarer Tab)
// 0.21.80: dazu Spuren von KI-Agenten, die einen normalen Browser per Screenshot bedienen – Mauszeiger springt ohne Weg auf den Knopf,
// Klick exakt in der Knopfmitte, Text ohne Tastenanschläge oder in gleichem Takt; außerdem Zeitzone und Gerät (Herkunft). Nur Zähler, keine Inhalte.
const FPT = { lastIn: 0, tr: 0, ut: 0, g: 0, mv: [], pos: null, pt: '', mc: 0, tp: 0, ck: 0, cc: 0, kt: [], kd: -1e9, ti: 0 };
for (const ev of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(ev, (e) => { if (e.isTrusted) { FPT.lastIn = Date.now(); FPT.tr++; FPT.g++; } }, true);
document.addEventListener('click', (e) => { if (!e.isTrusted && e.target && e.target.closest && e.target.closest('[data-act],[data-pk],[data-adm],button')) FPT.ut++; }, true);
document.addEventListener('pointermove', (e) => { if (!e.isTrusted || e.pointerType !== 'mouse') return; FPT.mv.push([performance.now(), e.clientX, e.clientY]); if (FPT.mv.length > 120) FPT.mv.splice(0, 60); }, { capture: true, passive: true });
document.addEventListener('pointerdown', (e) => {
  if (!e.isTrusted) return; FPT.pt = e.pointerType || '';
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  const t = performance.now(), n = FPT.mv.filter((m) => t - m[0] < 1500).length, from = FPT.mv.length > n ? FPT.mv[FPT.mv.length - n - 1] : FPT.pos;
  const dist = from ? Math.hypot(e.clientX - from[1], e.clientY - from[2]) : Infinity;
  FPT.mc++; if (n <= 1 && dist > 40) FPT.tp++;   // Mausweg fehlt: höchstens eine Bewegung, aber weit gesprungen
  FPT.pos = [t, e.clientX, e.clientY];
}, true);
document.addEventListener('click', (e) => {
  if (!e.isTrusted || e.detail === 0 || FPT.pt !== 'mouse' || !e.target || !e.target.closest) return;   // detail 0 = per Tastatur ausgelöst
  const el = e.target.closest('button, a, [data-act], [role="button"], summary, select, label'); if (!el) return;
  const r = el.getBoundingClientRect(); if (r.width < 16 || r.height < 12) return;
  const d = Math.hypot((e.clientX - (r.left + r.width / 2)) / (r.width / 2), (e.clientY - (r.top + r.height / 2)) / (r.height / 2));
  FPT.ck++; if (d < 0.1) FPT.cc++;
}, true);
document.addEventListener('keydown', (e) => { if (!e.isTrusted) return; FPT.kd = performance.now(); if (e.key && e.key.length === 1 && e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { FPT.kt.push(FPT.kd); if (FPT.kt.length > 60) FPT.kt.splice(0, 30); } }, true);
document.addEventListener('input', (e) => { if (e.isTrusted && e.inputType === 'insertText' && performance.now() - FPT.kd > 150) FPT.ti++; }, true);   // Text ohne vorherigen Tastenanschlag
const fpDev = (() => { try { const ua = navigator.userAgent || '', b = (ua.match(/(Edg|OPR|Firefox|CriOS|FxiOS|Chrome|Version)\/(\d+)/) || [])[0] || '?';
  return `${(navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '?'} · ${b.replace('Version', 'Safari')} · ${screen.width}×${screen.height}`.slice(0, 60); } catch (e) { return '?'; } })();
const fpTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })();
function fpStamp() {
  const iv = []; for (let i = 1; i < FPT.kt.length; i++) { const d = FPT.kt[i] - FPT.kt[i - 1]; if (d > 0 && d < 1000) iv.push(d); }
  const km = iv.length ? iv.reduce((a, b) => a + b, 0) / iv.length : 0, kv = iv.length && km ? Math.sqrt(iv.reduce((a, b) => a + (b - km) ** 2, 0) / iv.length) / km : 0;
  const o = { gap: FPT.lastIn ? Date.now() - FPT.lastIn : -1, tr: FPT.tr, ut: FPT.ut, g: FPT.g, wd: navigator.webdriver ? 1 : 0, hl: /HeadlessChrome|PhantomJS/i.test(navigator.userAgent || '') ? 1 : 0,
    dbg: window.skymarketDebug ? 1 : 0, vis: document.visibilityState === 'hidden' ? 0 : 1, v: window.SKYMARKET_BUILD || '',
    mc: FPT.mc, tp: FPT.tp, ck: FPT.ck, cc: FPT.cc, ti: FPT.ti, kn: iv.length, km: Math.round(km), kv: Math.round(kv * 100) / 100, tz: fpTz, dv: fpDev };
  Object.assign(FPT, { tr: 0, ut: 0, mc: 0, tp: 0, ck: 0, cc: 0, ti: 0, kt: [] }); return o;
}
async function mpSendAction(act) {
  if (!ui.mp) return;
  const id = ui.mp.id;
  try {
    const r = await api(`/games/${id}/action`, { body: { action: act, fp: fpStamp() } });
    if (r && r.ok === false && r.msg) toast(r.msg);
  } catch (e) { toast(e.status === 409 ? 'Der Server war beschäftigt, bitte noch einmal versuchen.' : e.status === 429 ? 'Zu viele Aktionen in kurzer Zeit – bitte etwas langsamer. Der Spielstand wird neu geladen.' : e.message); if (e.status === 429) setTimeout(() => mpPoll(true), 1200); }
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
    <p class="ink2">${ui.mp.main ? `Die Hauptwelt ist für alle offen (bis zu ${mpState.info && mpState.info.max || 60} Airlines). Wer den Link öffnet und sich anmeldet, kann direkt eine eigene Airline gründen.` : 'Bis zu vier Airlines pro Spiel. Wer den Link öffnet und sich anmeldet, kommt ohne Passwort hinein. Mit dem Code allein ist das Passwort nötig, falls Sie eines gesetzt haben.'}</p>
    <label class="f"><span>Einladungslink</span><input type="text" id="invLink" readonly value="${esc(link)}"></label>
    <label class="f"><span>Code</span><input type="text" readonly value="${esc(ui.mp.code)}" style="font-family:var(--f-mono);font-size:18px;letter-spacing:.15em"></label>
    <div class="stack small"><b>Im Spiel</b>${mpState.players.map((p) => `<div class="row"><span class="sw" style="background:${colorOfId(p.airlineId)}"></span> ${esc(p.airlineName)} <span class="muted">(${esc(p.name)})</span>${p.online ? ' <span class="chip good">online</span>' : ''}${p.host ? ' <span class="chip me">Spielleitung</span>' : ''}</div>`).join('')}</div>
    <div class="row"><button class="btn" id="invClose">Schließen</button><button class="btn primary" id="invCopy" style="margin-left:auto">Link kopieren</button></div>`, false);
  $('#invClose').addEventListener('click', () => { m.hidden = true; });
  $('#invCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); toast('Link kopiert.'); } catch (e) { $('#invLink').select(); toast('Bitte markierten Link kopieren.'); } });
}
function colorOfId(id) { const al = W && W.airlines[id]; return al ? colorOf(al) : 'var(--ink-3)'; }
// ---------- Mitspielende: Spielername, Airline und Kennzahlen ----------
/** Kennzahlen einer menschlichen Airline aus den letzten 30 Tagen (Tagesreihe) und der Bilanz. */
function humanKpis(al) {
  const h = (al.dayHist || []).slice(-30), sum = (k) => h.reduce((a, x) => a + (x[k] || 0), 0);
  // 0.21.44: Steigerung gegen das Startkapital der Gründung (vorher gegen die Einlagen nach Rückkäufen – nach großen Rückkäufen viel zu hoch)
  const eq = SM.balanceSheet(al).equity, start = (SM.DIFFICULTY[al.difficulty] || SM.DIFFICULTY.normal).equity, ec = al.ledger.equityContrib / 100, profit = eq - ec, capNet = ec + (al.divOut || 0) - start;
  const rev = sum('rev'), net = sum('net'), seats = sum('seats'), fl = sum('fl'), pax = sum('pax');
  return { eq, start, profit, capNet, divOut: al.divOut || 0, growth: start > 0 ? eq / start - 1 : null, net, rev, margin: rev > 0 ? net / rev : null, lf: seats > 0 ? pax / seats : null,
    paxDay: h.length ? pax / h.length : 0, otp: fl > 0 ? Math.max(0, 1 - sum('late') / fl) : null, days: h.length, fleet: al.fleet.length, routes: al.activeRoutes().length };
}
const seenTxt = (p) => { if (p.online) return 'online'; if (!p.seen) return 'noch nicht online'; const m = Math.round((Date.now() + (mpState.skew || 0) - p.seen) / 60000);
  return m < 60 ? `vor ${Math.max(1, m)} Min.` : m < 48 * 60 ? `vor ${Math.round(m / 60)} Std.` : `vor ${Math.round(m / 1440)} Tagen`; };
const PL_SORT = { eq: ['Eigenkapital', (r) => r.k.eq], net: ['Ergebnis 30 Tage', (r) => r.k.net], lf: ['Auslastung', (r) => r.k.lf ?? -1], pax: ['Passagiere', (r) => r.k.paxDay] };
/** Mitspielende, die alle sehen: Von der Spielleitung entfernte Airlines sieht nur die Spielleitung. */
const visHumans = () => (W ? W.humans : []).filter((h) => !h.removed || (ui.mp && (ui.mp.admin || ui.mp.manage || ui.mp.host)));
function playerRows() {
  return visHumans().map((al) => ({ al, p: mpState.players.find((x) => x.airlineId === al.id) || {}, k: humanKpis(al) }));
}
VIEWS.players = function viewPlayers() {
  if (!ui.mp) return '<h2 class="sec">Mitspielende</h2><p class="small muted">Gibt es nur in Online-Spielen.</p>';
  const key = PL_SORT[ui.plSort] ? ui.plSort : 'eq', q = (ui.plQ || '').trim().toLowerCase();
  const all = playerRows().sort((a, b) => (a.al.status === 'insolvent') - (b.al.status === 'insolvent') || PL_SORT[key][1](b) - PL_SORT[key][1](a));
  const rank = new Map(all.map((r, i) => [r.al.id, i + 1]));
  const list = q ? all.filter((r) => r.al.name.toLowerCase().includes(q) || (r.p.name || '').toLowerCase().includes(q) || (r.al.code || '').toLowerCase() === q) : all;
  const lim = ui.plAll || q ? list.length : 24, shown = list.slice(0, lim);
  if (!q && !shown.some((r) => r.al.id === W.playerId)) { const me = list.find((r) => r.al.id === W.playerId); if (me) shown.push(me); }
  const online = all.filter((r) => r.p.online).length;
  const sg = (x) => `<span class="${x < 0 ? 'neg' : x > 0 ? 'pos' : ''}">${eur(x, { plus: true })}</span>`;
  const card = ({ al, p, k }) => {
    const me = al.id === W.playerId, dead = al.status === 'insolvent';
    return `<div class="pcard${me ? ' me' : ''}${dead ? ' dead' : ''}${ui.plOpen && ui.plOpen[al.id] ? ' open' : ''}">
      <div class="pc-top"><span class="pc-rank">${rank.get(al.id)}</span><span class="lgi">${logoSvg(al, 34)}</span>
        <div class="pc-name"><b>${esc(al.name)}</b> <span class="small muted mono">${esc(al.code || '')}</span>
          <span class="small"><i class="pc-dot ${p.online ? 'on' : ''}"></i>${esc(p.name || '–')} · <span class="muted">${esc(seenTxt(p))}</span></span></div>
        <span class="pc-chips">${me ? '<span class="chip me">Sie</span>' : ''}${p.coll && p.coll.includes('title') ? '<span class="chip rar rar-l">Ultimate Aircraft Collector</span>' : p.coll && p.coll.includes('badge') ? '<span class="chip rar rar-r" title="Sammler-Abzeichen: mindestens 25 verschiedene Skins">Sammler</span>' : ''}${p.host ? '<span class="chip">Leitung</span>' : ''}${al.auto && !dead ? `<span class="chip warn" title="Seit ${P.AUTOPILOT.hours} Stunden nicht selbst gesteuert – die KI führt die Airline auf mittlerem Niveau weiter">KI-Vertretung</span>` : ''}${al.removed ? '<span class="chip crit">entfernt</span>' : dead ? '<span class="chip crit">insolvent</span>' : al.status === 'restructuring' ? '<span class="chip warn">Restrukturierung</span>' : ''}</span></div>
      <div class="pc-kpis">
        <div title="Startkapital ${eur(k.start)} · Gewinne seit Start ${eur(k.profit, { plus: true })} · Kapitalmaßnahmen netto ${eur(k.capNet, { plus: true })} (Kapitalerhöhungen minus Rückkäufe)${k.divOut ? ` · Dividenden ${eur(-k.divOut)}` : ''}"><span>Eigenkapital</span><b>${eur(k.eq)}</b><em>${k.growth === null ? '–' : `${k.growth >= 0 ? '+' : ''}${pct(k.growth)} seit Start (${eurB(k.start)})`}</em></div>
        <div><span>Ergebnis 30 Tage</span><b>${k.days ? sg(k.net) : '–'}</b><em>${k.margin === null ? 'noch kein Umsatz' : `Marge ${pct(k.margin)}`}</em></div>
        <div><span>Auslastung</span><b>${k.lf === null ? '–' : pct(k.lf)}</b><em>${k.paxDay ? `${n0(k.paxDay)} Pax/Tag` : 'noch keine Flüge'}</em></div>
      </div>
      <div class="pc-foot small muted"><span>${k.fleet} Flugzeug${k.fleet === 1 ? '' : 'e'} · ${k.routes} Strecke${k.routes === 1 ? '' : 'n'} · Basis ${esc(al.bases.join(', '))}${k.otp !== null ? ` · pünktlich ${pct(k.otp)}` : ''}</span>
        ${me || dead ? '' : `<span class="row" style="gap:6px"><button class="btn small" data-act="dealto" data-al="${al.id}">Handel</button>${ui.mp ? `<button class="btn small" data-act="chatto" data-al="${al.id}">Nachricht</button>` : ''}</span>`}</div>
      ${!dead && k.routes ? `<button class="pc-rbtn" data-act="plroutes" data-al="${al.id}" aria-expanded="${!!(ui.plOpen && ui.plOpen[al.id])}">${ui.plOpen && ui.plOpen[al.id] ? '▾' : '▸'} Strecken, Flugzeuge und Preise</button>${ui.plOpen && ui.plOpen[al.id] ? playerRoutesHtml(al) : ''}` : ''}
    </div>`;
  };
  let html = `<div class="spread"><h2 class="sec">Mitspielende <small>${all.length} Airline${all.length === 1 ? '' : 's'} · ${online} online${ui.mp.main ? ' · Hauptwelt' : ''}</small></h2>${ui.mp.manage ? '<button class="btn small" data-act="admopen">Verwaltung: Airlines, Sperren, Ereignisse</button>' : ''}</div>
    <div class="row" style="gap:8px"><span class="small muted">Sortieren:</span><div class="seg">${Object.entries(PL_SORT).map(([k2, [l]]) => `<button data-act="plsort" data-v="${k2}" aria-pressed="${k2 === key}">${l}</button>`).join('')}</div>
      ${all.length > 8 ? `<input type="search" id="mp-q" placeholder="Airline oder Name suchen" value="${esc(ui.plQ || '')}" style="flex:1;min-width:160px">` : ''}</div>
    <div class="pgrid">${shown.map(card).join('') || '<p class="small muted">Niemand gefunden.</p>'}</div>`;
  if (list.length > shown.length) html += `<div class="row"><button class="btn small" data-act="plall">Alle ${list.length} zeigen</button></div>`;
  html += `<p class="small muted">Kennzahlen der letzten 30 Spieltage: Ergebnis nach Steuern, Marge = Ergebnis ÷ Umsatz, Auslastung = Passagiere ÷ Sitze. Eigenkapital im Vergleich zum Startkapital${W.humans.some((h) => h.past && h.past.length) ? ' (nach einem Neustart ab der neuen Gründung)' : ''}.</p>`;
  return html;
};
/** Streckenliste einer anderen Airline: Strecke, Muster, Flüge pro Tag, Preise hin und zurück (öffentliche Angebotsdaten). */
function playerRoutesHtml(al) {
  const rs = al.activeRoutes().slice().sort((a, b) => a.base.localeCompare(b.base) || b.freq - a.freq || a.dest.localeCompare(b.dest));
  const mine = new Set(W.player.activeRoutes().map((r) => SM.pairKey(r.base, r.dest)));
  return `<div class="tw pc-routes"><table class="t"><thead><tr><th>Strecke</th><th>Flugzeug</th><th class="r">Flüge/Tag</th><th class="r">Preis hin</th><th class="r">Preis zurück</th></tr></thead><tbody>${rs.map((r) => `<tr>
    <td><a href="#" data-act="selapt" data-apt="${r.dest}"><b class="mono">${r.base}–${r.dest}</b></a> <span class="small muted">${esc(apName(r.dest))}</span>${mine.has(SM.pairKey(r.base, r.dest)) ? ' <span class="chip me" title="Diese Strecke fliegen Sie auch">auch Sie</span>' : ''}</td>
    <td>${tlx(r.type_id)} <span class="small muted">${P.SERVICE[r.service] ? P.SERVICE[r.service].label : ''}</span></td><td class="r">${r.freq}×</td><td class="r">${eur(r.fare_out)}</td><td class="r">${eur(r.fare_in)}</td></tr>`).join('')}</tbody></table></div>`;
}
// kompakte Beträge für schmale Bildschirme: 14,8 Mio. / −767 Tsd.
const eurB = (x) => { const t = eurC(x); return /(Mio\.|Tsd\.)$/.test(t) ? t + ' €' : t; };
const eurC = (x, plus = false) => { const a = Math.abs(x), sgn = x < 0 ? '−' : plus && x > 0 ? '+' : '';
  return a >= 1e6 ? `${sgn}${NF1.format(a / 1e6)} Mio.` : a >= 1e3 ? `${sgn}${n0(a / 1e3)} Tsd.` : `${sgn}${n0(a)} €`; };
/** Vor dem geplanten Start: Countdown und was man schon tun kann. */
function preStartCard() {
  const t = preStart(); if (!t) return '';
  tickCountdowns();
  const pl = W.player, others = W.humans.filter((h) => h.id !== pl.id && !h.removed);
  return `<div class="callout info prestart stack"><div class="row" style="align-items:center;gap:12px;flex-wrap:nowrap"><span class="ro-logo">${logoSvg(pl, 48)}</span><div class="stack" style="gap:4px;min-width:0"><b style="font-size:16px">Start am ${esc(startTxt(t))}</b>
      <span class="small">Noch <b data-count="${t}">${leftTxt(t - Date.now() - (mpState.skew || 0))}</b> bis zum Start. Dann beginnen alle ${visHumans().length} Airlines gleichzeitig mit vollem Startkapital. Flugzeuge, Strecken und Personal gibt es ab dem Start.</span></div></div>
    <div class="small"><b>Schon jetzt möglich:</b> Logo gestalten oder zeichnen, Name, Kürzel und Heimatbasis ändern (Sie starten in <b class="mono">${esc(pl.bases[0])}</b> · ${esc(apName(pl.bases[0]))}), Strecken als Plan vorbereiten, Mitspielende einladen.</div>
    <div class="row" style="gap:6px"><button class="btn small primary" data-act="tab" data-tab="profile">Logo gestalten</button><button class="btn small" data-act="rebase">Name und Basis ändern</button><button class="btn small" data-act="tab" data-tab="plan">Strecken vorplanen</button><button class="btn small" data-act="invite">Einladen</button></div>
    ${others.length ? `<div class="small muted">Angemeldet: ${others.slice(0, 30).map((h) => `<span class="lgi">${logoSvg(h, 16)}</span> ${esc(h.name)} (${esc(h.bases[0])})`).join(' · ')}${others.length > 30 ? ` und ${others.length - 30} weitere` : ''}</div>` : ''}</div>`;
}
/** Name, Kürzel und Heimatbasis ändern, solange die Airline noch nichts besitzt (vor dem Start oder vor dem ersten Flugzeug). */
function showRebase() {
  const pl = W.player;
  if (pl.fleet.length || pl.activeRoutes().length) { toast('Name und Basis lassen sich nur ändern, solange Sie noch kein Flugzeug und keine Strecke haben.'); return; }
  const others = new Set(W.humans.filter((h) => h.id !== pl.id && !h.removed).map((h) => h.code));
  const m = modal(`<h1>Name und Heimatbasis</h1>
    <p class="ink2">${preStart() ? `Bis zum Start am ${esc(startTxt(preStart()))} können Sie alles ändern.` : 'Solange Ihre Airline noch kein Flugzeug und keine Strecke hat, können Sie Name, Kürzel und Heimatbasis frei ändern.'} Logo, Assistenz und vorbereitete Pläne bleiben; die Lizenz zahlen Sie für den neuen Flughafen.</p>
    <form id="rbForm" class="stack">${airlineFields('rb', pl.name, pl.code, pl.bases[0], bpCtx(null, true))}
      ${others.size ? `<p class="small muted">Kürzel schon vergeben: ${[...others].map(esc).join(', ')}</p>` : ''}
      <div class="formbar"><p class="small neg" id="formErr" hidden></p>
      <div class="row"><button class="btn" type="button" id="rbBack">Abbrechen</button><button class="btn primary" type="submit" style="margin-left:auto">Übernehmen</button></div></div></form>`);
  $('#rbBack').addEventListener('click', () => { m.hidden = true; });
  $('#rbForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = readAirline('rb');
    if (a.name.length < 2) return formError('Bitte einen Namen mit mindestens 2 Zeichen angeben.');
    if (!/^[A-Z0-9]{2}$/.test(a.code)) return formError('Das Kürzel braucht genau 2 Buchstaben oder Ziffern.');
    if (others.has(a.code)) return formError(`Das Kürzel ${a.code} ist schon vergeben.`);
    try {
      if (ui.mp) {
        await api(`/games/${ui.mp.id}/rebase`, { body: { airline: a } });
        m.hidden = true; mpState.ver = ''; mpState.busy = false; await mpPoll(true);
        api(`/games/${ui.mp.id}/info`).then((info) => { mpState.info = info; mpState.players = info.players; renderLegend(); renderPane(); }).catch(() => {});
      } else {
        const r = SM.rebaseHuman(W, W.playerId, a); if (!r.ok) return formError(r.msg);
        m.hidden = true; const keep = { hintSeen: ui.hintSeen }; resetUi(); Object.assign(ui, keep); startWorld(); saveGame(false);
      }
      toast(`${a.name} startet in ${apName(a.base)}.`);
    } catch (err) { formError(err.message); }
  });
}
function playersCard() {
  if (!ui.mp) return '';
  const ph = isPhone(), fe = (x, plus) => (ph ? eurC(x, plus) : eur(x, plus ? { plus: true } : undefined));
  const all = playerRows().sort((a, b) => (b.al.id === W.playerId) - (a.al.id === W.playerId) || (a.al.status === 'insolvent') - (b.al.status === 'insolvent') || b.k.eq - a.k.eq);
  const LIM = 8, more = Math.max(0, all.length - LIM);
  const rows = all.slice(0, LIM).map(({ al, p, k }) => `<tr><td><span class="lgi">${logoSvg(al, 18)}</span> <b>${esc(al.name)}</b>${al.id === W.playerId ? ' <span class="chip me">Sie</span>' : ''}${al.status === 'insolvent' ? ' <span class="chip crit">insolvent</span>' : ''}<br><span class="small muted"><i class="pc-dot ${p.online ? 'on' : ''}"></i>${esc(p.name || '')} · Start in <b class="mono">${esc(al.bases[0] || '')}</b></span></td>
    <td class="r">${fe(k.eq)}</td><td class="r ${k.net < 0 ? 'neg' : k.net > 0 ? 'pos' : ''}">${k.days ? fe(k.net, true) : '–'}</td><td class="r">${k.lf === null ? '–' : pct(k.lf)}</td></tr>`).join('');
  return `<div class="stack"><div class="spread"><h2 class="sec">${ui.mp.main ? 'Airlines in der Hauptwelt' : 'Mitspielende'} <small>${ui.mp.main ? `${visHumans().length} Airlines` : `${esc(ui.mp.name)} · Code ${esc(ui.mp.code)}`}</small></h2><span class="row" style="gap:6px"><button class="btn small" data-act="tab" data-tab="players">Alle Kennzahlen</button><button class="btn small" data-act="openchat">Chat</button><button class="btn small" data-act="invite">Einladen</button></span></div>
    <table class="t"><thead><tr><th>Airline · Spieler</th><th class="r">${ph ? 'Eigenk.' : 'Eigenkapital'}</th><th class="r">${ph ? '30 T.' : 'Ergebnis 30 T.'}</th><th class="r">${ph ? 'Ausl.' : 'Auslastung'}</th></tr></thead><tbody>${rows}</tbody></table>${more ? `<p class="small muted">… und ${more} weitere. <a href="#" data-act="tab" data-tab="players">Alle Mitspielenden</a></p>` : ''}
    ${mpState.clock ? `<p class="small muted">Tempo: ${SM.SPEEDS[SM.speedKey(mpState.clock.speed)].label}${mpState.clock.weekend ? ' (Wochenend-Tempo, Fr 17 Uhr bis Mo 6 Uhr)' : ''}${ui.mp.main ? ' · Hauptwelt: läuft dauerhaft, auch wenn Sie offline sind' + (ui.mp.host ? ' · Als Admin stellen Sie das Tempo ein.' : '') : ui.mp.host ? ' · Sie leiten das Spiel und stellen das Tempo oben ein.' : ' · Die Spielleitung stellt das Tempo ein.'}${ui.mpOffline ? ' · <span class="neg">Verbindung unterbrochen</span>' : ''}</p>` : ''}</div>`;
}
async function onlineBoot() {
  const q = new URLSearchParams(location.search);
  if (q.get('join')) mpState.pendingJoin = { code: q.get('join').toUpperCase(), token: q.get('t') };
  try { mpState.user = await api('/me', { timeout: 20000 }); } catch (e) { mpState.user = null; }
  if (mpState.user && mpState.user.fairWarn) setTimeout(() => showFairWarn(mpState.user.fairWarn), 900);   // 0.21.74: Verwarnung der Spielleitung
  if (mpState.user) checkLoadMark();
  if (mpState.user && mpState.user.mustChange) showPwChange({ forced: true, then: () => showLobby() });
  else if (mpState.user) { showLobby(); showPatch(); } else showAuth(mpState.pendingJoin ? 'register' : 'login');
}
/** Patch-Hinweis einmal je Konto nach einem Update (der Server merkt sich, dass er gesehen wurde). */
function showPatch() {
  const raw = mpState.user && mpState.user.patch; if (!raw) return;
  const list = Array.isArray(raw) ? raw : [raw]; if (!list.length) return;
  const sec = (p) => `<section class="stack" style="gap:6px"><h2 style="margin:0">${esc(p.title)}</h2><p style="margin:0"><b>${esc(p.lead)}</b></p>${p.note ? `<p class="small ink2" style="margin:0">${esc(p.note)}</p>` : ''}
    ${p.more && p.more.length ? `<h3 style="margin:4px 0 0">Außerdem neu</h3><ul class="small">${p.more.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</section>`;
  const box = document.createElement('div'); box.id = 'patchNote'; box.className = 'patch-ov';
  box.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-label="Neu im Spiel"><span class="chip good">Update</span>${list.slice().reverse().map(sec).join('<hr style="border:0;border-top:1px solid var(--line, rgba(255,255,255,.12));margin:4px 0">')}
    <div class="row" style="justify-content:flex-end"><button class="btn primary" type="button" id="patchOk">Verstanden</button></div></div>`;
  document.body.appendChild(box);
  const done = () => { box.remove(); mpState.user.patch = null; api('/patch/seen', { body: {} }).catch(() => {}); };
  box.querySelector('#patchOk').onclick = done; box.onclick = (e) => { if (e.target === box) done(); };
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
  W.operableFreq(pl);   // Einsatzplan für den neuen Tag (Charter, Werft, Auslieferungen) – Karte und Netz zeigen den heutigen Stand
  buildSchedules();
  renderHeader(); renderTabs(); renderMapRoutes(); tickPane();
  if (pl.status === 'insolvent') { gameOver(); return prev; }
  const newDec = pl.decisions.length > ui.decisionsSeen && openDecisions().length;
  ui.decisionsSeen = pl.decisions.length;
  if (newDec && !slow) { setSpeed('p'); toast('Entscheidung nötig – das Spiel ist pausiert. Übersicht → Entscheidungen.'); }
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
const snapOf = (pl) => ({ day: W.day, cash: netCash(pl), ni: pl.ledger.netIncome(), pax: Math.round(pl.paxTotal || 0), name: pl.name });
/** Tagesbericht beim Wiederkommen: was ist passiert, seit Sie zuletzt da waren? */
function awayReport(days, seen) {
  const pl = W.player, cash = netCash(pl);
  const snap = typeof seen === 'number' ? { cash: seen } : seen || {};
  const same = !snap.name || snap.name === pl.name;
  const d = same && typeof snap.cash === 'number' ? cash - snap.cash : null;
  const ni = same && typeof snap.ni === 'number' ? pl.ledger.netIncome() - snap.ni : null;
  const pax = same && typeof snap.pax === 'number' ? Math.round(pl.paxTotal || 0) - snap.pax : null;
  const from = typeof snap.day === 'number' ? snap.day : W.day - days;
  const evs = pl.events.filter((e) => e.day > from && (e.kind === 'crit' || e.kind === 'warn' || e.kind === 'deal')).slice(-8).reverse();
  const dec = openDecisions().length, inc = incomingDeals().length;
  const h = asst() ? assistantHints()[0] : null;
  if (days < 3) {
    const txt = `Willkommen zurück! Seit Ihrem letzten Besuch ${days === 1 ? 'ist <b>1 Tag</b>' : `sind <b>${n0(days)} Tage</b>`} vergangen. Kontostand ${eur(cash)}${d !== null ? ` (${eur(d, { plus: true })})` : ''}.`;
    if (asst()) bubble(d !== null && d < 0 ? 'warn' : 'good', txt + (h ? ` Als Nächstes: ${h.html}` : ''), { noPre: true, title: 'Während Sie weg waren', btn: h ? hintBtn(h) : '<button class="btn small" data-act="tab" data-tab="news">Meldungen</button>' });
    else toast(`${days} ${days === 1 ? 'Tag' : 'Tage'} vergangen · Kontostand ${eur(cash)}`);
    return;
  }
  const tile = (l, v, e = '') => `<div class="tile"><span>${l}</span><b>${v}</b>${e ? `<em>${e}</em>` : ''}</div>`;
  const sg = (x) => `<span class="${x < 0 ? 'neg' : x > 0 ? 'pos' : ''}">${eur(x, { plus: true })}</span>`;
  const m = modal(`<div class="spread"><div><h1 style="margin:0">Tagesbericht</h1><span class="small muted">${esc(pl.name)} · ${dateLong(from)} bis ${dateLong(W.day)} · ${n0(days)} Spieltage</span></div><button class="btn small" id="arClose">Schließen</button></div>
    ${!same ? `<div class="callout info">Seit Ihrem letzten Besuch haben Sie neu gegründet: ${esc(snap.name)} → ${esc(pl.name)}.</div>` : ''}
    <div class="tiles">${tile('Kontostand', eur(cash), d !== null ? sg(d) + ' seither' : '')}${ni !== null ? tile('Ergebnis im Zeitraum', sg(ni), 'Gewinn/Verlust nach Steuern') : ''}${pax !== null ? tile('Passagiere', n0(pax), `≈ ${n0(pax / Math.max(1, days))} pro Tag`) : ''}
      ${tile('Flotte', `${pl.fleet.length} Flz.`, `${pl.activeRoutes().length} Strecken`)}${tile('Pünktlichkeit', playerOtp() === null ? '–' : pct(playerOtp()), `Marke ${n0(pl.brand * 100)}`)}${tile('Liquidität', pl.runway && isFinite(pl.runway) ? `${n0(pl.runway)} Tage` : 'stabil', pl.status !== 'active' ? `<span class="neg">${pl.status === 'insolvent' ? 'insolvent' : 'Restrukturierung'}</span>` : '')}</div>
    ${dec || inc ? `<div class="callout warn">${dec ? `<b>${dec} offene Entscheidung${dec > 1 ? 'en' : ''}</b> warten auf Sie. ` : ''}${inc ? `<b>${inc} Angebot${inc > 1 ? 'e' : ''}</b> im Handelseingang.` : ''}</div>` : ''}
    <div class="stack"><h3>Wichtige Meldungen</h3>${evs.length ? `<div class="stack" style="gap:6px">${evs.map((e) => `<div class="hint ${e.kind === 'deal' ? 'info' : e.kind}"><i></i><span><span class="small muted">${dateShort(e.day)}</span> ${esc(e.msg)}</span></div>`).join('')}</div>` : '<p class="small muted">Keine Warnungen – der Betrieb lief ruhig.</p>'}</div>
    ${h ? `<div class="callout info"><span><b>${asstP() ? esc(asstP().name) + ' rät' : 'Als Nächstes'}:</b> ${h.html}</span></div>` : ''}
    <div class="row">${dec ? '<button class="btn" data-ar="cockpit">Entscheidungen</button>' : ''}${inc ? '<button class="btn" data-ar="trade">Handel</button>' : ''}<button class="btn" data-ar="news">Alle Meldungen</button><button class="btn primary" data-ar="dashboard" style="margin-left:auto">Zum Dashboard</button></div>`);
  m.onclick = (e) => { const b = e.target.closest('[data-ar]'); if (e.target.id === 'arClose' || b) { m.hidden = true; if (b) setTab(b.dataset.ar); } };
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
    // Flugzeuge: bei vielen Maschinen 15–25 Bilder pro Sekunde, gar nicht, solange die Karte nicht sichtbar ist
    const n = schedules.length, gap = n > 500 ? 66 : n > 200 ? 40 : 0;
    if (!frame.vis || ts - frame.vis > 500) { frame.vis = ts; const r = $('#mapwrap') && $('#mapwrap').getBoundingClientRect(); frame.mapOn = !r || (r.bottom > 0 && r.top < window.innerHeight && r.width > 0); }
    if (ui.sel || ui.planesNow || ((!frame.pl || ts - frame.pl >= gap) && (frame.mapOn || ts - (frame.pl || 0) > 1000))) { frame.pl = ts; renderPlanes(); }
    const spx = SM.SPEEDS[speedNow()], bms = spx && spx.ms ? Math.max(600, Math.min(3000, spx.ms / 48)) : 3000;
    if (ui.tab === 'departures' && (!frame.board || ts - frame.board > bms) && !editing()) { frame.board = ts; renderPane(); }
  }
  lastTs = ts;
  requestAnimationFrame(frame);
}
function startWorld() {
  loadColl();   // Aircraft Collection gilt in jedem Spiel des Kontos, auch offline
  // 0.21.50: Die Nachfragetabelle (einmal je Seitenaufruf, auf dem Handy rund 0,4 s) im Leerlauf vorbereiten – nicht erst beim ersten Klick auf Planung oder Drehkreuze
  if (!startWorld.warm) { startWorld.warm = true; const go = () => { try { const b = W && W.player && W.player.bases[0]; if (b) SM.qBase(b, b === 'FRA' ? 'MUC' : 'FRA'); } catch (e) { /* egal */ } }; if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500); }
  for (const al of W.list) W.operableFreq(al);
  buildSchedules();
  fitCodes(homeCodes());
  renderHeader(); renderTabs(); renderMapRoutes(true); renderPane(true); renderDraft();
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
/*COLLECTION*/
function boot(hotData) {
  try { const th = localStorage.getItem('skymarket-theme'); if (th === 'dark' || th === 'light' || th === 'auto') { /* gesetzt */ } else localStorage.setItem('skymarket-theme', 'auto'); } catch (e) { /* ohne Speicher */ }
  document.documentElement.dataset.theme = 'dark';
  initMap();
  $('#pane').addEventListener('click', onPaneClick);
  $('#pane').addEventListener('change', onPaneChange);
  initCal();
  $('#pane').addEventListener('change', (e) => { if (e.target.id === 'newbase') { ui.newBasePick = e.target.value; const bt = $('#openbaseBtn'), a = SM.baseApproval(W.player, e.target.value), nt = $('#newbaseNote'); if (bt) { bt.textContent = newBaseBtnTxt(W.player, e.target.value); bt.disabled = !a.ok || (W.player.bases.length >= P.BASE_MAX && !SM.limitsLifted(W.player)); } if (nt) nt.textContent = a.msg || `${apName(e.target.value)}: Zusage ohne Auflagen.`; } });
  $('#pane').addEventListener('input', (e) => {
    if (onCabRange(e, false) || onFltInput(e.target)) return;
    if (e.target.id && e.target.id.startsWith('hire-')) { const k = e.target.id.slice(5), bt = $('#hirebtn-' + k), n = Math.floor(Number(e.target.value)); if (bt && n > 0) bt.textContent = hireLbl(bt.dataset.role, n); }
    if (e.target.id === 'mp-q') { ui.plQ = e.target.value; ui.plAll = false; renderPane(true); const q = $('#mp-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } return; }
    if (e.target.type === 'number') onPaneInput(e);
  });
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
  const play = () => speedChosen(ui.lastSpeed || (ui.mp ? 'm30' : 'x1'));
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
    const sb = e.target.closest('[data-apcbase]'); if (sb) { e.preventDefault(); if (setSelBase(sb.dataset.apcbase)) { showAptCard(ui.aptCard); if (ui.tab === 'market') renderPane(true); renderMapRoutes(true); } return; }
    const b = e.target.closest('[data-apc]'); if (!b) return;
    const k = b.dataset.apc;
    if (k === 'close') { $('#aptCard').hidden = true; ui.aptCard = null; return; }
    if (k === 'plan') { ui.planner = defaultPlanner(b.dataset.apt); ui.selApt = ui.planner.dest; setTab('plan'); renderMapRoutes(true); $('#aptCard').hidden = true; return; }
    if (k === 'market') { ui.selApt = b.dataset.apt; setTab('market'); renderMapRoutes(true); }
    if (k === 'invest') { const c = b.dataset.apt, q = W.aptInvestQuote(W.player, c, b.dataset.kind); if (!q.ok) { toast(q.msg); return; } ui.aptConfirm = { c, kind: b.dataset.kind }; showAptCard(c); return; }
    if (k === 'investno') { const c = ui.aptCard; ui.aptConfirm = null; if (c) showAptCard(c); return; }
    if (k === 'investok') { const c = b.dataset.apt, kind = ui.aptConfirm && ui.aptConfirm.c === c ? ui.aptConfirm.kind : null; ui.aptConfirm = null; if (!kind) return;
      const r = doAction({ type: 'aptInvest', apt: c, kind }); if (r.ok) toast(r.msg); refreshAll(); showAptCard(c); return; }
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
  // Vorschau-Seite für das Pack-Öffnen (nur wenn ausdrücklich eingeschaltet, z. B. in der Demo-Seite)
  if (window.SKYMARKET_PACKDEMO) window.skyPackDemo = (ids) => { const ov = packOverlay(); playReveal(ov, { res: ids, fresh: ids.map(() => true) }); };
  if (location.hash === '#debug') window.skymarketDebug = { poll: () => mpPoll(false), fairWarn: (x) => showFairWarn(x), coll: () => coll, reveal: async (res, quick) => { await loadColl(true); const ov = packOverlay(); playReveal(ov, { res, fresh: res.map(() => true) }); if (quick) ov._skip(); return true; }, planeHits: () => planeCv.hits, view: () => ({ ...view }), world: () => W, days: (n) => { for (let i = 0; i < n; i++) stepDay(); }, ui, setTab, enterGame, snapOf, mpState, playerRoutesHtml, render: () => renderPane(true), soft: () => renderPane(), planes: () => { const a = performance.now(); for (let i = 0; i < 10; i++) renderPlanes(); return (performance.now() - a) / 10; }, nSched: () => schedules.length, box: () => { const a = performance.now(); for (let i = 0; i < 10; i++) { renderActiveBox(); applyTheme(); } return (performance.now() - a) / 10; }, timing: () => { const t = {}, w = W; let a = performance.now(); w.step(); t.engine = performance.now() - a; a = performance.now(); buildSchedules(); t.sched = performance.now() - a; a = performance.now(); renderHeader(); renderTabs(); t.head = performance.now() - a; a = performance.now(); renderMapRoutes(); t.map = performance.now() - a; a = performance.now(); renderPane(); t.pane = performance.now() - a; return t; } };
}
if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {});
})();
