// ===========================================================================
// AIRCRAFT COLLECTION – Skins sammeln, Packs öffnen, auf Flugzeugen zeigen, tauschen (nur online, rein kosmetisch)
// Wird beim Bauen in app.js eingesetzt (Marker /*COLLECTION*/) und nutzt dessen Hilfen ($, esc, api, modal, toast, W, ui, mpState …).
// ===========================================================================
const SK = window.SKINS;
const coll = { me: null, shop: null, admin: false, at: 0, busy: false, art: null };
const RAR = SK.RARITIES;
const rarChip = (rk) => `<span class="chip rar rar-${rk}">${RAR[rk].label}</span>`;
const modelOf = (s) => SK.MODEL_BY_ID[s.model];
/** Die Sammlung hängt am Konto und gilt in jedem Spiel: Hauptwelt, private Online-Spiele und Offline-Spiele (dort unter dem Schlüssel „solo“). */
const collOn = () => ONLINE && !!mpState.user;
const collGame = () => (ui.mp ? ui.mp.id : 'solo');
/** Daten der Sammlung laden (beim Betreten eines Spiels, nach Aktionen und alle 60 s); Benachrichtigungen als Hinweis zeigen. */
async function loadColl(force = false) {
  if (!ONLINE || !mpState.user || coll.busy) return;
  if (!force && coll.me && Date.now() - coll.at < 60000) return;
  coll.busy = true;
  try {
    const r = await api('/coll', { timeout: 20000 });
    coll.me = r.me; coll.shop = r.shop; coll.admin = r.admin; coll.at = Date.now();
    collNotes();
    collChrome();
    if (W && ['collection', 'shop', 'trading', 'fleetOwn'].includes(ui.tab)) renderPane(true);
    ui.planesNow = true;
  } catch (e) { /* nächster Versuch beim nächsten Mal */ } finally { coll.busy = false; }
}
function collNotes() {
  const n = coll.me && coll.me.notes; if (!n || !n.length) return;
  const ids = n.map((x) => x.id);
  const daily = n.find((x) => x.kind === 'daily');
  n.filter((x) => x.kind !== 'daily').slice(-3).forEach((x, i) => setTimeout(() => toast(x.msg), i * 1600));
  if (daily) setTimeout(() => showDaily(daily.msg), 900);
  coll.me.notes = [];
  api('/coll/notes/read', { body: { ids } }).catch(() => {});
}
/** 0.21.59: Tägliches Gratis-Pack – kleines Fenster mit „Jetzt öffnen“. */
function showDaily(msg, tries = 0) {
  if (!coll.me || !coll.me.packs.length || document.querySelector('#packOv:not([hidden])')) { toast(msg); return; }
  if (!$('#modal').hidden) { if (tries < 40) setTimeout(() => showDaily(msg, tries + 1), 3000); else toast(msg); return; }   // anderes Fenster offen: warten statt verdrängen
  const md = modal(`<div class="dly"><div class="dly-pack">${packSvg()}</div><div class="stack" style="gap:6px"><h1 style="margin:0">Tägliches Gratis-Pack</h1><p class="small" style="margin:0">${esc(msg.replace(/^Tägliches Gratis-Pack:\s*/, ''))}</p>
    <p class="small muted" style="margin:0">Jeden Tag ab Mitternacht liegt ein neues Pack bereit, sobald Sie das Spiel öffnen.</p></div></div>
    <div class="row" style="gap:8px;justify-content:flex-end"><button class="btn" data-x="later">Später</button><button class="btn primary" data-x="open">Jetzt öffnen</button></div>`);
  md.onclick = (e) => { const b = e.target.closest('[data-x]'); if (!b) return; md.hidden = true; if (b.dataset.x === 'open') openPack(coll.me.packs.find((p) => p.src === 'daily') ? coll.me.packs.find((p) => p.src === 'daily').id : null); };
}
/** Profilrahmen (Meilenstein 75) am Menüknopf. */
function collChrome() { const b = $('#userBtn'); if (b) b.classList.toggle('coll-frame', !!(coll.me && coll.me.ms.includes('frame'))); }
const hasMs = (k) => !!(coll.me && coll.me.ms && coll.me.ms.includes(k));
/** Aktiver Skin eines Flugzeugs (eigene aus der Sammlung, fremde aus den Spielinfos). */
function skinFor(al, acId) {
  if (!collOn() || !W || !al) return null;
  let id = null;
  if (al.id === W.playerId) id = coll.me && coll.me.active[`${collGame()}|${acId}`];
  else if (ui.mp) { const sk = mpState.info && mpState.info.skins; id = sk && sk[al.id] && sk[al.id][acId]; }
  return id ? SK.SKIN_BY_ID[id] || null : null;
}
const actCount = (id) => (coll.me ? Object.values(coll.me.active).filter((x) => x === id).length : 0);
/** Exemplare frei für den Tausch (0.21.61: ein Exemplar deckt SK.perCopy(id) Flugzeuge – Grün/Blau 2, ab Pink 1). */
const freeCopies = (id) => { const m = coll.me; if (!m) return 0; return (m.inv[id] || 0) - Math.ceil(actCount(id) / SK.perCopy(id)) - ((m.reserved || {})[id] || 0); };
/** Wie viele weitere Flugzeuge diesen Skin noch bekommen können. */
const freeSlots = (id) => { const m = coll.me; if (!m) return 0; return ((m.inv[id] || 0) - ((m.reserved || {})[id] || 0)) * SK.perCopy(id) - actCount(id); };

// ---------- Lackierungen auf den vorhandenen Seitenansichten ----------
let skinSeq = 0;
function skinRand(seed) { let h = 2166136261; for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
/** Lackierung für acSvg/sstSvg: Farben, Verläufe, Muster (auf Rumpf bzw. Leitwerk zugeschnitten), Leuchteffekt. */
function skinLivery(s, g) {
  const id = 'sk' + (++skinSeq), p = s.pal, f = (x) => x.toFixed(1), rnd = skinRand(s.id);
  const { x0, xe, top, bot, cy, h, L } = g;
  const finTop = top - (g.fh || 20);
  let defs = `<clipPath id="${id}f"><path d="${g.fus}"/></clipPath><clipPath id="${id}t"><path d="${g.fin}"/></clipPath>`;
  defs += `<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.body2 || p.body}"/><stop offset="1" stop-color="${p.body}"/></linearGradient>`;
  defs += `<linearGradient id="${id}g" x1="0" y1="1" x2="0.4" y2="0"><stop offset="0" stop-color="${p.tail}"/><stop offset="1" stop-color="${p.tail2 || p.tail}"/></linearGradient>`;
  if (s.glow) defs += `<filter id="${id}w" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  if (s.gold) defs += `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  const glow = s.glow ? ` filter="url(#${id}w)"` : '';
  const belly = (y = cy + h * 0.18, c = p.belly) => `<rect x="${f(x0 - 4)}" y="${f(y)}" width="${f(L + 8)}" height="${f(bot - y + 4)}" fill="${c}"/>`;
  const line = (y, c, w = 1.2, x1 = x0 + h, x2 = xe - L * 0.08) => `<path d="M${f(x1)},${f(y)} L${f(x2)},${f(y)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const wave = (y, amp, c, op = 1) => { let d = `M${f(x0 - 4)},${f(bot + 4)} L${f(x0 - 4)},${f(y)}`; for (let x = x0 - 4; x <= xe + 4; x += 8) d += ` L${f(x)},${f(y + Math.sin((x - x0) / 14) * amp)}`; return `<path d="${d} L${f(xe + 4)},${f(bot + 4)}Z" fill="${c}" opacity="${op}"/>`; };
  const bolt = (x, y, sc, c) => `<path d="M${f(x)},${f(y)} l${f(6 * sc)},${f(3 * sc)} l${f(-3 * sc)},${f(1 * sc)} l${f(8 * sc)},${f(5 * sc)} l${f(-9 * sc)},${f(-3 * sc)} l${f(3 * sc)},${f(-1 * sc)}Z" fill="${c}"/>`;
  // 0.21.67: Bewegung im Bild (SMIL – läuft auch als <img> in Sammlung, Pack und Shop)
  const an = (attr, values, dur, beg = 0, extra = '') => `<animate attributeName="${attr}" values="${values}" dur="${dur}s" begin="-${Math.abs(beg).toFixed(2)}s" repeatCount="indefinite"${extra}/>`;
  const spark = (x, y, r, c, dur, beg) => `<path d="M${f(x)},${f(y - r)} L${f(x + r * 0.22)},${f(y - r * 0.22)} L${f(x + r)},${f(y)} L${f(x + r * 0.22)},${f(y + r * 0.22)} L${f(x)},${f(y + r)} L${f(x - r * 0.22)},${f(y + r * 0.22)} L${f(x - r)},${f(y)} L${f(x - r * 0.22)},${f(y - r * 0.22)}Z" fill="${c}" opacity="0">${an('opacity', '0;0;1;0;0', dur, beg)}</path>`;
  const sparks = (n, c, ymin = top + 1, ymax = cy + h * 0.25, r = [1.2, 2.4]) => Array.from({ length: n }, (_, i) => spark(x0 + L * (0.12 + rnd() * 0.76), ymin + rnd() * (ymax - ymin), r[0] + rnd() * (r[1] - r[0]), c, 1.6 + rnd() * 1.4, rnd() * 3)).join('');
  const sweep = (key, c, dur, op = 0.6, w = 0.07) => { defs += `<linearGradient id="${id}${key}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset="${f(0.5 - w)}" stop-color="${c}" stop-opacity="0"/><stop offset=".5" stop-color="${c}" stop-opacity="${op}"/><stop offset="${f(0.5 + w)}" stop-color="${c}" stop-opacity="0"/><stop offset="1" stop-color="${c}" stop-opacity="0"/><animateTransform attributeName="gradientTransform" type="translate" values="-0.6 0;0.6 0" dur="${dur}s" repeatCount="indefinite"/></linearGradient>`;
    return `<rect x="${f(x0)}" y="${f(top - 2)}" width="${f(L)}" height="${f(h + 4)}" fill="url(#${id}${key})"/>`; };
  let over = '', fin = '', body = `url(#${id}b)`, finFill = `url(#${id}g)`;
  switch (s.pat) {
    case 'leaves': over = belly() + line(cy + h * 0.12, p.stripe, 1.4); for (let i = 0; i < 6; i++) fin += `<ellipse cx="${f(xe - L * 0.11 + rnd() * L * 0.08)}" cy="${f(top - 4 - rnd() * 14)}" rx="${f(3 + rnd() * 2)}" ry="1.4" transform="rotate(${-40 + rnd() * 50} ${f(xe - L * 0.08)} ${f(top - 8)})" fill="${i % 2 ? p.accent : p.tail2}" opacity=".9"/>`; break;
    case 'wave': over = wave(cy + h * 0.1, 2.4, p.belly) + wave(cy + h * 0.02, 1.6, p.tail2, 0.55); fin = wave(finTop + 10, 2, p.tail2, 0.8); break;
    case 'ice': over = belly(cy + h * 0.3) + line(cy + h * 0.15, p.stripe, 1); for (let i = 0; i < 7; i++) { const x = xe - L * 0.13 + rnd() * L * 0.11, y = top - 2 - rnd() * 16; fin += `<path d="M${f(x)},${f(y)} l2.5,-5 l2,6 Z" fill="${i % 2 ? '#ffffff' : p.tail2}" opacity=".85"/>`; } break;
    case 'palm': over = belly() + `<path d="M${f(x0 + h)},${f(cy + h * 0.15)} C${f(x0 + L * 0.35)},${f(cy - h * 0.3)} ${f(x0 + L * 0.6)},${f(cy + h * 0.4)} ${f(xe - L * 0.1)},${f(cy - h * 0.1)}" stroke="${p.tail}" stroke-width="2" fill="none"/>`; fin = `<circle cx="${f(xe - L * 0.07)}" cy="${f(top - 9)}" r="5" fill="${p.tail2}"/>`; break;
    case 'gradtail': over = belly() + line(cy + h * 0.14, p.stripe, 1.6); break;
    case 'race': body = p.body; over = belly(cy + h * 0.32) + line(cy - h * 0.18, p.stripe, 2.2) + line(cy - h * 0.02, p.stripe, 2.2); fin = `<path d="M${f(xe - L * 0.16)},${f(top)} L${f(xe - L * 0.05)},${f(finTop)}" stroke="#fff" stroke-width="3"/>`; finFill = p.tail; break;
    case 'cheat': body = p.body; over = belly(cy + h * 0.3) + line(cy - h * 0.02, p.stripe, 1.6); finFill = p.tail; fin = `<path d="M${f(xe - L * 0.14)},${f(top - 4)} L${f(xe - L * 0.035)},${f(finTop + 6)}" stroke="${p.stripe}" stroke-width="2"/>`; break;
    case 'hills': over = wave(cy + h * 0.2, 2.8, p.belly) + wave(cy + h * 0.32, 2, p.stripe, 0.7); fin = wave(finTop + 12, 2.5, p.tail2, 0.9); break;
    case 'sheen': over = belly(cy + h * 0.26) + `<rect x="${f(x0)}" y="${f(top + 1.2)}" width="${f(L)}" height="${f(h * 0.18)}" fill="#fff" opacity=".35"/>` + line(cy + h * 0.16, p.stripe, 1); break;
    case 'pin': over = belly(cy + h * 0.3) + line(cy - h * 0.3, p.stripe, 0.5) + line(cy + h * 0.14, p.stripe, 0.5) + line(cy + h * 0.2, p.accent, 0.5); fin = line(top - 6, p.stripe, 0.6, xe - L * 0.12, xe - L * 0.03); break;
    case 'arrow': over = belly(cy + h * 0.3) + `<path d="M${f(x0 + h * 0.8)},${f(cy + h * 0.05)} L${f(xe - L * 0.2)},${f(cy - h * 0.25)} L${f(xe - L * 0.2)},${f(cy + h * 0.25)}Z" fill="${p.stripe}" opacity=".9"/>`; break;
    case 'bolt': over = belly(cy + h * 0.28) + `<g${glow}>${bolt(x0 + L * 0.3, cy - h * 0.35, 1.3, p.stripe)}${bolt(x0 + L * 0.55, cy - h * 0.3, 1.1, p.accent)}</g>`; fin = `<g${glow}>${bolt(xe - L * 0.12, finTop + 4, 1, p.accent)}</g>`; break;
    case 'deepwave': over = wave(cy + h * 0.15, 2.2, p.belly) + `<path d="M${f(x0)},${f(cy - h * 0.1)} C${f(x0 + L * 0.3)},${f(cy - h * 0.4)} ${f(x0 + L * 0.6)},${f(cy + h * 0.2)} ${f(xe)},${f(cy - h * 0.2)}" stroke="${p.stripe}" stroke-width="1" fill="none" opacity=".8"/>`; break;
    case 'streak': over = belly(cy + h * 0.3); for (let i = 0; i < 6; i++) { const x = x0 + L * (0.25 + i * 0.09); over += `<path d="M${f(x)},${f(cy - h * 0.1)} l${f(L * 0.06)},0 l${f(-3)},${f(h * 0.25)} l${f(-L * 0.06)},0Z" fill="${p.stripe}" opacity="${0.35 + i * 0.1}"/>`; } break;
    case 'grid': over = belly(cy + h * 0.3) + `<g${glow} stroke-width=".6">` + [cy - h * 0.15, cy + h * 0.05, cy + h * 0.22].map((y, i) => `<path d="M${f(x0)},${f(y)} L${f(xe)},${f(y)}" stroke="${i % 2 ? p.accent : p.stripe}"/>`).join('') + Array.from({ length: 12 }, (_, i) => `<path d="M${f(x0 + L * (0.15 + i * 0.065))},${f(cy - h * 0.15)} L${f(x0 + L * (0.15 + i * 0.065) - 2)},${f(cy + h * 0.22)}" stroke="${i % 2 ? p.stripe : p.accent}" opacity=".7"/>`).join('') + '</g>'; break;
    case 'stars': defs += `<radialGradient id="${id}n"><stop offset="0" stop-color="${p.tail2}" stop-opacity=".7"/><stop offset="1" stop-color="${p.tail2}" stop-opacity="0"/></radialGradient>`; over = `<ellipse cx="${f(x0 + L * 0.45)}" cy="${f(cy)}" rx="${f(L * 0.22)}" ry="${f(h)}" fill="url(#${id}n)"/>`; for (let i = 0; i < 40; i++) over += `<circle cx="${f(x0 + rnd() * L)}" cy="${f(top + rnd() * h)}" r="${f(0.25 + rnd() * 0.6)}" fill="#fff" opacity="${f(0.4 + rnd() * 0.6)}"/>`; for (let i = 0; i < 8; i++) fin += `<circle cx="${f(xe - L * 0.13 + rnd() * L * 0.11)}" cy="${f(top - rnd() * 18)}" r=".6" fill="#fff"/>`; break;
    case 'pulse': { let d = `M${f(x0 + h)},${f(cy)}`; for (let x = x0 + h; x < xe - L * 0.1; x += 18) d += ` L${f(x + 6)},${f(cy)} L${f(x + 8)},${f(cy - h * 0.35)} L${f(x + 11)},${f(cy + h * 0.3)} L${f(x + 13)},${f(cy)}`; over = belly(cy + h * 0.3) + `<path d="${d}" stroke="${p.stripe}" stroke-width="1.1" fill="none"${glow}>${an('opacity', '.55;1;.55', 1.1)}</path><path d="${d}" stroke="#ffffff" stroke-width="1.6" fill="none" stroke-dasharray="10 90" stroke-linecap="round"${glow}>${an('stroke-dashoffset', '100;0', 1.2)}</path>`; break; }
    case 'aurora': over = `<g${glow} opacity=".75">${an('opacity', '.45;.95;.45', 3.2)}<animateTransform attributeName="transform" type="translate" values="0 0;0 -1.6;0 1.2;0 0" dur="2.6s" repeatCount="indefinite"/>${[0, 1, 2].map((i) => `<path d="M${f(x0)},${f(cy + h * (0.1 - i * 0.12))} C${f(x0 + L * 0.3)},${f(cy - h * (0.5 - i * 0.1))} ${f(x0 + L * 0.6)},${f(cy + h * 0.4)} ${f(xe)},${f(cy - h * (0.2 + i * 0.1))}" stroke="${i === 1 ? p.accent : p.stripe}" stroke-width="${2.6 - i * 0.6}" fill="none"/>`).join('')}</g>`; break;
    case 'nebula': defs += `<radialGradient id="${id}n"><stop offset="0" stop-color="${p.tail}" stop-opacity=".8"/><stop offset="1" stop-color="${p.tail}" stop-opacity="0"/></radialGradient><radialGradient id="${id}m"><stop offset="0" stop-color="${p.tail2}" stop-opacity=".8"/><stop offset="1" stop-color="${p.tail2}" stop-opacity="0"/></radialGradient>`;
      over = `<ellipse cx="${f(x0 + L * 0.3)}" cy="${f(cy)}" rx="${f(L * 0.16)}" ry="${f(h)}" fill="url(#${id}n)"/><ellipse cx="${f(x0 + L * 0.62)}" cy="${f(cy + 2)}" rx="${f(L * 0.18)}" ry="${f(h)}" fill="url(#${id}m)"/><ellipse cx="${f(x0 + L * 0.5)}" cy="${f(cy)}" rx="${f(L * 0.08)}" ry="${f(h * 0.2)}" fill="none" stroke="${p.stripe}" stroke-width=".9"${glow}/>`;
      for (let i = 0; i < 18; i++) over += `<circle cx="${f(x0 + rnd() * L)}" cy="${f(top + rnd() * h)}" r=".4" fill="#fff"/>`; break;
    case 'storm': over = belly(cy + h * 0.3) + `<g${glow}>${an('opacity', '1;.15;1;1;.1;1;.6;1', 1.3, 0, ' calcMode="discrete"')}${bolt(x0 + L * 0.25, top + 1, 1.2, p.stripe)}${bolt(x0 + L * 0.5, top + 2, 1.4, p.accent)}${bolt(x0 + L * 0.68, top + 1, 1, p.stripe)}</g>`; fin = `<g${glow}>${an('opacity', '1;.2;1;.1;1;1', 0.9, 0.4, ' calcMode="discrete"')}${bolt(xe - L * 0.12, finTop + 3, 1.1, p.accent)}</g>`; break;
    case 'phoenix': over = belly(cy + h * 0.3) + `<path d="M${f(x0 + L * 0.15)},${f(cy + h * 0.2)} C${f(x0 + L * 0.35)},${f(cy - h * 0.6)} ${f(x0 + L * 0.55)},${f(cy - h * 0.2)} ${f(xe - L * 0.18)},${f(cy - h * 0.45)} C${f(x0 + L * 0.6)},${f(cy + h * 0.05)} ${f(x0 + L * 0.4)},${f(cy + h * 0.1)} ${f(x0 + L * 0.15)},${f(cy + h * 0.2)}Z" fill="${p.stripe}"${glow}>${an('opacity', '1;.55;1;.75;1', 0.9)}${an('fill', `${p.stripe};${p.tail2};${p.accent};${p.stripe}`, 1.6)}</path>`;
      for (let i = 0; i < 5; i++) fin += `<path d="M${f(xe - L * 0.15 + i * L * 0.02)},${f(top)} Q${f(xe - L * 0.1 + i * L * 0.015)},${f(top - 10 - i * 2)} ${f(xe - L * 0.05 + i * L * 0.008)},${f(finTop + 2 + i)}" stroke="${i % 2 ? p.tail2 : p.accent}" stroke-width="1.4" fill="none"/>`; break;
    case 'emperor': over = belly(cy + h * 0.25) + line(cy + h * 0.2, p.accent, 0.8); finFill = p.tail; fin = `<g${glow}><circle cx="${f(xe - L * 0.075)}" cy="${f(top - 10)}" r="4.5" fill="none" stroke="${p.tail2}" stroke-width="1.2"/><path d="M${f(xe - L * 0.09)},${f(top - 10)} l1.5,-3 l1.5,2 l1.5,-3 l1.5,3 l1.5,-2 l1.5,3 Z" fill="${p.tail2}"/></g>`; break;
    case 'imperial': body = p.body; over = belly(cy + h * 0.3) + line(cy + h * 0.12, p.stripe, 1) + line(cy + h * 0.22, p.stripe, 0.6); finFill = p.tail; fin = `<g${glow}><path d="M${f(xe - L * 0.095)},${f(top - 7)} l1.6,-4 l1.6,2.6 l1.6,-4 l1.6,4 l1.6,-2.6 l1.6,4 Z" fill="${p.tail2}"/></g>`; break;
    case 'titan': over = belly(cy + h * 0.3) + Array.from({ length: 6 }, (_, i) => `<rect x="${f(x0 + L * (0.15 + i * 0.11))}" y="${f(cy - h * 0.38)}" width="${f(L * 0.09)}" height="${f(h * 0.12)}" fill="${p.stripe}" opacity=".55">${an('opacity', '.25;1;.25;.25', 1.4, 1.4 - i * 0.18)}</rect>`).join('') + `<rect x="${f(x0)}" y="${f(top + 1)}" width="${f(L)}" height="${f(h * 0.12)}" fill="#fff" opacity=".3"/>`; break;
    case 'sovereign': over = belly(cy + h * 0.3) + line(cy - h * 0.25, p.stripe, 0.5) + line(cy + h * 0.15, p.stripe, 0.7) + line(cy + h * 0.21, p.stripe, 0.4); fin = `<g${glow}><path d="M${f(xe - L * 0.095)},${f(top - 8)} l1.6,-4 l1.6,2.6 l1.6,-4 l1.6,4 l1.6,-2.6 l1.6,4 Z" fill="${p.stripe}"/></g>`; finFill = `url(#${id}g)`; break;
    case 'diamond': over = belly(cy + h * 0.3) + `<g${glow}>` + Array.from({ length: 7 }, (_, i) => { const x = x0 + L * (0.2 + i * 0.085), y = cy - h * 0.05; return `<path d="M${f(x)},${f(y - 3.5)} l3,3.5 l-3,3.5 l-3,-3.5Z" fill="none" stroke="${p.stripe}" stroke-width=".7">${an('stroke', `${p.stripe};#ff6b6b;#ffd34d;#4ade80;#60a5fa;#c084fc;${p.stripe}`, 2.4, i * 0.3)}${an('opacity', '.5;1;.5', 1.2, i * 0.17)}</path>`; }).join('') + '</g>'; fin = `<g${glow}><path d="M${f(xe - L * 0.075)},${f(top - 14)} l4,5 l-4,5 l-4,-5Z" fill="${p.stripe}"/></g>`; break;
    // 0.21.55: Stufe Rot
    case 'disco': {   // Spiegelkacheln in vier Gruppen, jede Gruppe wechselt im Takt die Farbe (SMIL: läuft auch in <img>)
      const C = ['#ff2bd6', '#22e5ff', '#ffe14d', '#7cff4f', '#ff7a1a'], grp = [[], [], [], []];
      for (let y = top + h * 0.08, row = 0; y < cy + h * 0.24; y += h * 0.15, row++) for (let x = x0 + h * 0.9 + (row % 2) * 2.5, col = 0; x < xe - L * 0.1; x += 5.2, col++) grp[Math.floor(rnd() * 4)].push(`<rect x="${f(x)}" y="${f(y)}" width="4.2" height="${f(h * 0.12)}" rx=".6"/>`);
      over = belly(cy + h * 0.3) + grp.map((g, i) => `<g fill="${C[i]}" opacity=".92"><animate attributeName="fill" values="${[0, 1, 2, 3, 4, 0].map((j) => C[(i + j) % 5]).join(';')}" dur="1.8s" begin="-${(i * 0.45).toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/>${g.join('')}</g>`).join('')
        + `<rect x="${f(x0)}" y="${f(top + 1)}" width="${f(L)}" height="${f(h * 0.08)}" fill="#fff" opacity=".25"/>`;
      const bx = xe - L * 0.085, by = top - 9;
      defs += `<radialGradient id="${id}d" cx=".35" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c9d2e3"/><stop offset="1" stop-color="#5b6577"/></radialGradient>`;
      fin = `<circle cx="${f(bx)}" cy="${f(by)}" r="6" fill="url(#${id}d)"/>` + [-3, 0, 3].map((d) => `<path d="M${f(bx - 6)},${f(by + d)} L${f(bx + 6)},${f(by + d)} M${f(bx + d)},${f(by - 6)} L${f(bx + d)},${f(by + 6)}" stroke="#5b6577" stroke-width=".35"/>`).join('')
        + C.slice(0, 4).map((c, i) => `<circle cx="${f(bx + [-3.4, 2.6, 3.2, -2][i])}" cy="${f(by + [-2.4, -3.2, 2.2, 3][i])}" r=".9" fill="${c}"><animate attributeName="opacity" values="1;.1;1" dur="${(0.7 + i * 0.2).toFixed(1)}s" repeatCount="indefinite"/></circle>`).join('');
      break; }
    case 'flames': {
      defs += `<linearGradient id="${id}x" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.tail}"/><stop offset=".6" stop-color="${p.stripe}"/><stop offset="1" stop-color="${p.tail2}"/></linearGradient>`;
      const tongue = (base, hi, step, ph) => { let d = `M${f(x0 - 4)},${f(bot + 4)} L${f(x0 - 4)},${f(base)}`; for (let x = x0, i = 0; x < xe; x += step, i++) { const tip = base - hi * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + ph))) * Math.min(1, (x - x0) / (L * 0.25) + 0.2); d += ` Q${f(x + step * 0.2)},${f(tip + hi * 0.25)} ${f(x + step * 0.55)},${f(tip)} Q${f(x + step * 0.7)},${f(base - hi * 0.15)} ${f(x + step)},${f(base)}`; } return `${d} L${f(xe + 4)},${f(bot + 4)}Z`; };
      over = `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.6;0 .6;0 -1;0 0" dur=".55s" repeatCount="indefinite"/><path d="${tongue(cy + h * 0.32, h * 0.75, 11, 0)}" fill="url(#${id}x)"${glow}/></g><g><animateTransform attributeName="transform" type="translate" values="0 0;0 .8;0 -1.3;0 0" dur=".42s" repeatCount="indefinite"/><path d="${tongue(cy + h * 0.4, h * 0.42, 8, 1.3)}" fill="${p.accent}" opacity=".75">${an('opacity', '.75;.35;.9;.5;.75', 0.38)}</path></g>`;
      fin = `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.4;0 .5;0 0" dur=".5s" repeatCount="indefinite"/><path d="${tongue(top + 2, 14, 5, 0.6).replace(/^M[^L]*L/, `M${f(xe - L * 0.2)},${f(top + 4)} L`)}" fill="url(#${id}x)" opacity=".9"/></g>`; break; }
    case 'scales': {
      over = belly(cy + h * 0.32); let sc = '';
      for (let y = top + h * 0.15, row = 0; y < cy + h * 0.3; y += h * 0.13, row++) for (let x = x0 + h * 0.6 + (row % 2) * 3.2; x < xe - L * 0.06; x += 6.4) sc += `M${f(x)},${f(y)} a3.2,3.2 0 0 0 6.4,0 `;
      over += `<path d="${sc}" fill="none" stroke="${p.stripe}" stroke-width=".55" opacity=".7"/>` + line(cy + h * 0.3, p.stripe, 1.1);
      for (let i = 0; i < 5; i++) fin += `<path d="M${f(xe - L * 0.15 + i * L * 0.022)},${f(top + 1)} l${f(L * 0.012)},-7 l${f(L * 0.012)},7" fill="${p.tail2}" stroke="${p.stripe}" stroke-width=".4"/>`; break; }
    case 'comet': {
      defs += `<linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.stripe}" stop-opacity="1"/><stop offset="1" stop-color="${p.tail2}" stop-opacity="0"/></linearGradient>`;
      const hx = x0 + L * 0.3, hy = cy - h * 0.02;
      over = belly(cy + h * 0.3) + `<path d="M${f(hx)},${f(hy - h * 0.16)} L${f(xe - L * 0.08)},${f(hy - h * 0.38)} L${f(xe - L * 0.08)},${f(hy + h * 0.18)} L${f(hx)},${f(hy + h * 0.16)}Z" fill="url(#${id}c)"/>`
        + `<circle cx="${f(hx)}" cy="${f(hy)}" r="${f(h * 0.2)}" fill="${p.stripe}"${glow}/><circle cx="${f(hx - 1)}" cy="${f(hy - 1)}" r="${f(h * 0.08)}" fill="#fff"/>`;
      for (let i = 0; i < 10; i++) over += `<circle cx="${f(hx + rnd() * L * 0.5)}" cy="${f(hy + (rnd() - 0.5) * h * 0.4)}" r="${f(0.3 + rnd() * 0.5)}" fill="${p.accent}"/>`;
      fin = `<circle cx="${f(xe - L * 0.08)}" cy="${f(top - 9)}" r="3" fill="${p.stripe}"${glow}/>`; break; }
    case 'lava': {
      over = belly(cy + h * 0.32); let cr = '';
      for (let i = 0; i < 9; i++) { let x = x0 + L * (0.08 + rnd() * 0.8), y = top + rnd() * h * 0.3; cr += `M${f(x)},${f(y)}`; for (let j = 0; j < 4; j++) { x += (rnd() - 0.3) * 9; y += 2 + rnd() * h * 0.18; cr += ` L${f(x)},${f(y)}`; } }
      over += `<path d="${cr}" fill="none" stroke="${p.stripe}" stroke-width="1.3" stroke-linejoin="round"${glow}>${an('opacity', '.3;1;.5;.9;.3', 2.2)}</path><path d="${cr}" fill="none" stroke="${p.accent}" stroke-width=".45">${an('opacity', '.4;1;.4', 1.3, 0.5)}</path>`;
      fin = `<path d="M${f(xe - L * 0.14)},${f(top)} L${f(xe - L * 0.1)},${f(top - 8)} L${f(xe - L * 0.07)},${f(top - 5)} L${f(xe - L * 0.05)},${f(finTop + 4)}" fill="none" stroke="${p.stripe}" stroke-width="1.2"${glow}>${an('opacity', '.3;1;.3', 1.8)}</path>`; break; }
    default: over = belly();
  }
  // Zusätzliche Bewegung je Muster (Pink und höher)
  if (s.pat === 'grid') over += sweep('v', '#22e5ff', 1.6, 0.75, 0.05) + Array.from({ length: 8 }, (_, i) => `<rect x="${f(x0 + L * (0.18 + i * 0.09))}" y="${f(cy - h * 0.17)}" width="1.6" height="1.6" fill="#22e5ff">${an('fill', '#22e5ff;#ff2bd6;#22e5ff', 0.8, i * 0.1, ' calcMode="discrete"')}${an('opacity', '1;.2;1', 0.6, i * 0.13)}</rect>`).join('');
  if (s.pat === 'stars') over += sparks(10, '#ffffff') + sweep('v', p.tail2, 3.4, 0.35, 0.12);
  if (s.pat === 'nebula') over += sparks(8, '#ffffff') + sweep('v', p.tail, 3, 0.4, 0.14);
  if (s.pat === 'storm') over += `<rect x="${f(x0)}" y="${f(top - 2)}" width="${f(L)}" height="${f(h + 4)}" fill="#e0f2fe" opacity="0">${an('opacity', '0;.75;0;.4;0;0;.65;0;0;0', 1.5, 0, ' calcMode="discrete"')}</rect>` + sparks(4, '#e0f2fe', top + 1, cy, [1.5, 2.6]);
  if (s.pat === 'scales') over += sweep('v', '#ff8a8a', 2.2, 0.5, 0.08);
  if (s.pat === 'comet') over += sweep('v', '#ffd1dc', 1.8, 0.6, 0.06) + sparks(6, '#ffd1dc', cy - h * 0.25, cy + h * 0.15, [0.8, 1.6]);
  if (s.pat === 'pulse' || s.pat === 'aurora') over += sparks(5, '#ffffff', top + 1, cy, [0.8, 1.5]);
  if (s.pat === 'emperor' || s.pat === 'imperial' || s.pat === 'sovereign') fin += spark(xe - L * 0.075, top - 12, 3, '#ffffff', 1.4, 0) + spark(xe - L * 0.095, top - 9, 1.8, '#fff7d6', 1.9, 0.7);
  if (s.gold) { // durchgehend glänzen: zwei Glanzstreifen, funkelnde Sterne
    defs += `<linearGradient id="${id}s2" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset=".58" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/><animateTransform attributeName="gradientTransform" type="translate" values="-0.7 0;0.7 0;0.7 0" keyTimes="0;.6;1" dur="2.2s" repeatCount="indefinite"/></linearGradient>`;
    over += `<rect x="${f(x0)}" y="${f(top - 2)}" width="${f(L)}" height="${f(h + 4)}" fill="url(#${id}s2)"/>` + sweep('s3', '#fff7d6', 3.3, 0.45, 0.04) + sparks(7, '#ffffff', top + 1, cy + h * 0.2, [1.4, 2.8]);
    fin += spark(xe - L * 0.1, top - 6, 2.2, '#ffffff', 1.7, 0.3) + spark(xe - L * 0.065, top - 13, 1.7, '#ffffff', 2.1, 1.1);
  }
  const style = `--fus:${p.body};--fus-line:${p.line};--glass:${p.glass};--eng:${p.eng}`;
  // 0.21.68: Glubschaugen am Cockpit (nur für den goldenen Walkout)
  const eyes = g.eyes ? [0.95, 1.6].map((k, i) => { const ex = x0 + h * k + (h < 10 ? (k - 0.95) * 4 : 0), ey = cy - h * 0.14, r = Math.max(h * 0.27, 2.6), pr = r * 0.5;
    return `<circle cx="${f(ex)}" cy="${f(ey)}" r="${f(r)}" fill="#fff" stroke="#111" stroke-width="${f(r * 0.18)}"/><circle cx="${f(ex)}" cy="${f(ey)}" r="${f(pr)}" fill="#111"><animate attributeName="cx" values="${f(ex - r * 0.4)};${f(ex + r * 0.35)};${f(ex - r * 0.1)};${f(ex - r * 0.4)}" dur="${i ? 0.37 : 0.45}s" repeatCount="indefinite"/><animate attributeName="cy" values="${f(ey + r * 0.3)};${f(ey - r * 0.4)};${f(ey + r * 0.4)};${f(ey + r * 0.3)}" dur="${i ? 0.41 : 0.33}s" repeatCount="indefinite"/></circle>`; }).join('') : '';
  return { defs: `<defs>${defs}</defs>`, style, body, fin: finFill, stripe: p.stripe, eyes,
    over: `<g clip-path="url(#${id}f)">${over}</g>`, finOver: fin ? `<g clip-path="url(#${id}t)">${fin}</g>` : '' };
}
const SIL = { defs: '', style: '--fus:#16213a;--fus-line:#22304f;--glass:#16213a;--eng:#16213a;--gear:#22304f', body: 'var(--fus)', fin: '#22304f', stripe: 'transparent', over: '', finOver: '' };
/** SVG-Text eines Skins als Bild-URL (für Karten in der Sammlung: ein Element statt vieler). Echte Artworks aus public/skins/ haben Vorrang. */
const skinUrlCache = new Map();
function skinArt(s, sil = false, eyes = false) {
  if (!sil && !eyes && coll.art && coll.art.has(s.id)) return s.artworkPath;
  const k = s.id + (sil ? ':s' : '') + (eyes ? ':e' : ''); let u = skinUrlCache.get(k);
  if (!u) {
    // als eigenständiges SVG-Bild: Namensraum ergänzen, Farbvariablen fest eintragen (nur ein style-Attribut – sonst ist das XML ungültig)
    const base = '--gear:#5b6577;--ink-2:#8a94a6;--ink-3:#a3acbb;--accent:#64748b;--fus:#f4f6f9;--fus-line:#9aa5b5;--glass:#1d2a3d;';
    let svg = acSvg(s.type, sil ? { sil: true } : { skin: s, eyes });
    svg = /^<svg[^>]* style="/.test(svg) ? svg.replace(/^(<svg[^>]*) style="([^"]*)"/, (m, a, st) => `${a} style="${base}${st}"`) : svg.replace('<svg ', `<svg style="${base}" `);
    svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); skinUrlCache.set(k, u);
  }
  return u;
}
/** Vorhandene Artwork-Dateien (public/skins/manifest.json, vom Build erzeugt). */
async function loadArtManifest() { if (coll.art) return; coll.art = new Set(); try { const r = await fetch('skins/manifest.json', { cache: 'no-store' }); if (r.ok) coll.art = new Set((await r.json()).skins || []); } catch (e) { /* keine Artworks */ } }

// ---------- Sammlung ----------
const CAT_KEYS = Object.keys(SK.CATEGORIES);
VIEWS.collection = function viewCollection() {
  if (!coll.me) { loadColl(true); return '<div class="ac-wrap"><p class="small muted">Sammlung wird geladen …</p></div>'; }
  loadArtManifest();
  const m = coll.me, F = ui.cf = ui.cf || { cat: '', rar: '', own: '' };
  const byR = {}; for (const rk of SK.RARITY_ORDER) byR[rk] = SK.SKINS.filter((s) => s.rarity === rk && m.inv[s.id] > 0).length;
  const share = m.uniq / SK.TOTAL;
  let html = `<div class="ac-wrap"><div class="ac-head"><div><span class="ac-kicker">AIRCRAFT COLLECTION</span><h2>Ihre Sammlung${hasMs('title') ? ' <span class="chip rar rar-l">Ultimate Aircraft Collector</span>' : ''}</h2></div>
    <button class="btn primary ac-open" data-act="accopen" ${m.packs.length ? '' : 'disabled'}>${m.packs.length ? `Pack öffnen <b>${n0(m.packs.length)}</b>` : 'Keine ungeöffneten Packs'}</button>${coll.shop && coll.shop.daily ? `<span class="small muted">${m.dailyDay && m.dailyDay === m.today ? 'Tägliches Gratis-Pack für heute abgeholt – das nächste gibt es ab Mitternacht.' : 'Tägliches Gratis-Pack: jeden Tag eins beim Öffnen des Spiels.'}</span>` : ''}</div>
    <div class="ac-progress"><div class="spread"><b>${n0(m.uniq)} / ${SK.TOTAL} SKINS GESAMMELT</b><span>${pct(share, 1)}</span></div><div class="ac-bar"><i style="width:${(share * 100).toFixed(1)}%"></i></div></div>
    <div class="ac-tiles">${SK.RARITY_ORDER.map((rk) => `<div class="ac-tile rar-${rk}"><span>${RAR[rk].label}</span><b>${byR[rk]}<small> / ${SK.MODELS.length * RAR[rk].perModel}</small></b></div>`).join('')}
      <div class="ac-tile"><span>Ungeöffnete Packs</span><b>${n0(m.packs.length)}</b></div><div class="ac-tile"><span>Geöffnet</span><b>${n0(m.openedTotal)}</b></div></div>
    <div class="ac-ms">${SK.MILESTONES.map((x) => `<div class="ac-msi${hasMs(x.key) ? ' on' : ''}" title="${esc(x.desc)}"><b>${x.n}</b><span>${esc(x.label)}</span></div>`).join('')}</div>`;
  const segs = (key, list) => `<div class="seg wrap">${list.map(([v, l]) => `<button data-act="acf" data-k="${key}" data-v="${v}" aria-pressed="${F[key] === v}">${l}</button>`).join('')}</div>`;
  html += `<div class="ac-filters">${segs('cat', [['', 'Alle Flugzeuge'], ...CAT_KEYS.map((k) => [k, SK.CATEGORIES[k]])])}${segs('rar', [['', 'Alle Seltenheiten'], ...SK.RARITY_ORDER.map((k) => [k, RAR[k].colorName])])}${segs('own', [['', 'Alle'], ['have', 'Gesammelt'], ['miss', 'Nicht gesammelt'], ['dup', 'Duplikate']])}</div>`;
  const keep = (s) => (!F.cat || modelOf(s).cat === F.cat) && (!F.rar || s.rarity === F.rar) && (!F.own || (F.own === 'have' ? m.inv[s.id] > 0 : F.own === 'miss' ? !(m.inv[s.id] > 0) : m.inv[s.id] > 1));
  const models = SK.MODELS.filter((md) => !F.cat || md.cat === F.cat), shownAll = ui.showAll && ui.showAll.acgrid;
  let nModels = 0, more = 0;
  for (const md of models) {
    const list = SK.SKINS.filter((s) => s.model === md.id && keep(s)); if (!list.length) continue;
    if (!shownAll && nModels >= 6) { more++; continue; }
    nModels++;
    const have = SK.SKINS.filter((s) => s.model === md.id && m.inv[s.id] > 0).length;
    html += `<section class="ac-model"><h3>${esc(md.name)} <small>${have} / ${SK.SKINS.filter((s) => s.model === md.id).length}</small></h3><div class="ac-grid">${list.map((s) => skinCard(s)).join('')}</div></section>`;
  }
  if (more) html += `<div class="row"><button class="btn small" data-act="showall" data-k="acgrid">Weitere ${more} Modelle zeigen</button></div>`;
  if (!nModels) html += '<p class="small muted">Kein Skin passt zu den Filtern.</p>';
  if (m.opened.length) html += `<section class="ac-model"><h3>Zuletzt geöffnet</h3><div class="ac-hist">${m.opened.slice(0, 10).map((p) => `<div class="ac-hrow"><span class="small muted">${new Date(p.op).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${p.src === 'admin_grant' ? ' · Geschenk' : ''}</span>${p.res.map((id) => { const s = SK.SKIN_BY_ID[id]; return s ? `<button class="ac-mini rar-${s.rarity}" data-act="acdetail" data-id="${s.id}" title="${esc(s.name)} · ${esc(modelOf(s).name)}"><img src="${skinArt(s)}" alt=""><span>${esc(s.name)}</span></button>` : ''; }).join('')}</div>`).join('')}</div></section>`;
  html += `<p class="small muted">Alle Skins sind rein kosmetisch: Sie ändern weder Reichweite noch Kosten, Einnahmen oder sonst etwas am Spiel. Ein Exemplar gilt für bis zu 2 Flugzeuge des passenden Modells (Grün und Blau), ab Pink für eins; Duplikate lassen sich auf weiteren Flugzeugen zeigen oder tauschen.</p></div>`;
  return html;
};
function skinCard(s) {
  const m = coll.me, n = m.inv[s.id] || 0, act = Object.values(m.active).filter((x) => x === s.id).length;
  return `<button class="ac-card rar-${s.rarity}${n ? '' : ' miss'}" data-act="acdetail" data-id="${s.id}" aria-label="${esc(s.name)}, ${esc(modelOf(s).name)}, ${RAR[s.rarity].label}${n ? `, ${n} im Besitz` : ', nicht gesammelt'}">
    <span class="ac-art"><img src="${skinArt(s, !n)}" alt="" loading="lazy"></span>
    <span class="ac-name">${n ? esc(s.name) : '???'}</span><span class="ac-model-n">${esc(modelOf(s).name)}</span>
    <span class="ac-meta">${rarChip(s.rarity)}${n > 1 ? `<span class="chip">×${n}</span>` : ''}${act ? `<span class="chip good">aktiv${act > 1 ? ' ×' + act : ''}</span>` : ''}</span></button>`;
}
/** Detail eines Skins: groß, Beschreibung, Besitz, auf welchen Flugzeugen aktiv, aktivieren. */
function showSkinDetail(id) {
  const s = SK.SKIN_BY_ID[id]; if (!s || !coll.me) return;
  const m = coll.me, n = m.inv[s.id] || 0, free = freeCopies(s.id), pl = W && W.player;
  const acts = Object.entries(m.active).filter(([, x]) => x === s.id).map(([k]) => k.split('|'));
  const here = acts.filter(([g]) => g === collGame()), fits = pl ? pl.fleet.filter((a) => a.type_id === s.type) : [];
  const md = modal(`<div class="ac-detail rar-${s.rarity}"><div class="spread"><span class="ac-kicker">${esc(modelOf(s).name)}</span><button class="btn small" data-sd="close">Schließen</button></div>
    <div class="ac-big${n ? '' : ' miss'}"><img src="${skinArt(s, !n)}" alt="${esc(s.name)}"></div>
    <h2>${n ? esc(s.name) : 'Noch nicht gesammelt'} ${rarChip(s.rarity)}</h2>
    <p class="ink2">${n ? esc(s.desc) : 'Diesen Skin gibt es nur in Aircraft Mystery Packs oder im Tausch mit anderen Spielern.'}</p>
    <div class="small muted">Im Besitz: ${n} · aktiv auf ${actCount(s.id)} von ${Math.max(0, (n - ((m.reserved || {})[s.id] || 0)) * SK.perCopy(s.id))} möglichen Flugzeugen (je Exemplar ${SK.perCopy(s.id) === 1 ? 'eins' : SK.perCopy(s.id)})${(m.reserved || {})[s.id] ? ` · im Tauschangebot: ${m.reserved[s.id]}` : ''} · Karteneffekt: ${({ paint: 'neue Lackierung', sheen: 'blauer Glanz', glow: 'pinkes Leuchten', fire: 'rotes Glühen', disco: 'blinkt in allen Farben', gold: 'goldener Ring, goldene Route' })[s.mapEffect]}${MAP_THEME_TXT[s.design] && !s.blink ? ' · ' + MAP_THEME_TXT[s.design] : ''}</div>
    ${acts.length > here.length ? `<p class="small muted">Außerdem aktiv in ${acts.length - here.length} Flugzeug(en) anderer Spiele.</p>` : ''}
    ${n && fits.length ? `<div class="stack" style="gap:6px"><b class="small">Flugzeuge wählen <span class="muted">(antippen zum An- und Abwählen, noch ${Math.max(0, freeSlots(s.id))} frei)</span></b><div class="row" style="gap:6px;flex-wrap:wrap">${fits.map((a) => { const cur = skinFor(pl, a.id), on = cur && cur.id === s.id; return `<button class="btn small${on ? ' primary' : ''}" data-sd="${on ? 'off' : 'on'}" data-ac="${a.id}" aria-pressed="${!!on}" ${!on && freeSlots(s.id) < 1 ? 'disabled' : ''}>${on ? '✓ ' : ''}${esc(acName(a.id))}${cur && !on ? ` <span class="small muted">(${esc(cur.name)})</span>` : ''}</button>`; }).join('')}</div></div>`
      : n && !fits.length ? `<p class="small muted">Sie haben keine ${esc(modelOf(s).name)} in Ihrer Flotte.</p>` : ''}
    ${n && free > 0 ? '<div class="row"><button class="btn small" data-sd="trade">Zum Tausch anbieten</button></div>' : ''}</div>`);
  md.onclick = async (e) => {
    const b = e.target.closest('[data-sd]'); if (!b) { if (e.target === md) md.hidden = true; return; }
    const k = b.dataset.sd;
    if (k === 'close') { md.hidden = true; return; }
    if (k === 'trade') { md.hidden = true; ui.tr = { ...(ui.tr || {}), give: [...((ui.tr && ui.tr.give) || []), s.id] }; setTab('trading'); return; }
    b.disabled = true;
    try { await activateSkin(b.dataset.ac, k === 'on' ? s.id : null); showSkinDetail(s.id); } catch (err) { toast(err.message); b.disabled = false; }
  };
}
async function activateSkin(acId, skinId) {
  const pl = W.player, a = pl.fleet.find((x) => x.id === acId);
  const r = await api('/coll/activate', { body: ui.mp ? { game: ui.mp.id, acId, skinId } : { game: 'solo', acId, skinId, type: a && a.type_id, fleet: pl.fleet.map((x) => x.id) } });
  coll.me = r.me; ui.planesNow = true; skinUrlCache.size > 2000 && skinUrlCache.clear();
  if (['fleetOwn', 'collection'].includes(ui.tab)) renderPane(true);
  toast(skinId ? `${SK.SKIN_BY_ID[skinId].name} ist auf ${acName(acId)} aktiv.` : `${acName(acId)} fliegt wieder in Ihrer Standardlackierung.`);
}
/** Flotte → „Skin ändern“: passende freie Skins des Modells. */
function showSkinPicker(acId) {
  const pl = W.player, a = pl.fleet.find((x) => x.id === acId); if (!a || !coll.me) return;
  const cur = skinFor(pl, a.id), list = SK.SKINS.filter((s) => s.type === a.type_id && coll.me.inv[s.id] > 0);
  const md = modal(`<div class="spread"><h1 style="margin:0">Skin für ${esc(acName(a.id))}</h1><button class="btn small" data-sp="close">Schließen</button></div>
    <p class="small muted">${esc(tl(a.type_id))} · aktuell: ${cur ? `<b>${esc(cur.name)}</b>` : 'Standardlackierung Ihrer Airline'}. Skins ändern nur die Darstellung – Kennung, Wartung, Leasing, Crew, Flugstunden und Einsatz bleiben, wie sie sind.</p>
    <div class="ac-grid ac-pick">${cur ? `<button class="ac-card" data-sp="off"><span class="ac-art">${acSvg(a.type_id, { ...myAcColors(), code: pl.code })}</span><span class="ac-name">Standardlackierung</span></button>` : ''}
      ${list.map((s) => { const free = freeSlots(s.id), on = cur && cur.id === s.id; return `<button class="ac-card rar-${s.rarity}" data-sp="on" data-id="${s.id}" ${on || freeSlots(s.id) < 1 ? 'disabled' : ''}><span class="ac-art"><img src="${skinArt(s)}" alt=""></span><span class="ac-name">${esc(s.name)}</span><span class="ac-meta">${rarChip(s.rarity)}${on ? '<span class="chip good">aktiv</span>' : free < 1 ? '<span class="chip">alle Plätze belegt</span>' : `<span class="chip">noch ${free} Flugzeuge</span>`}</span></button>`; }).join('')}</div>
    ${list.length ? '' : `<p class="small muted">Sie besitzen noch keinen Skin für die ${esc(tl(a.type_id))}. Skins gibt es in Aircraft Mystery Packs (Collection → Shop) oder im Tausch.</p>`}`);
  md.onclick = async (e) => {
    const b = e.target.closest('[data-sp]'); if (!b) { if (e.target === md) md.hidden = true; return; }
    if (b.dataset.sp === 'close') { md.hidden = true; return; }
    b.disabled = true;
    try { await activateSkin(a.id, b.dataset.sp === 'on' ? b.dataset.id : null); md.hidden = true; } catch (err) { toast(err.message); b.disabled = false; }
  };
}

// ---------- Pack öffnen (Ergebnis kommt vom Server, die Animation zeigt es nur) ----------
/** 0.21.55: Pack mit Aufreißlasche oben (Perforation, Lasche kippt beim Ziehen), Titel passt immer (textLength), fünf Seltenheitsfarben. */
// 0.21.72: unsaubere Reißkante – Zickzack mit kleinen Fasern, Pack und Lasche passen genau aufeinander
const PK_TEAR = (() => { const r = skinRand('pack-tear'), pts = [[10, 40]]; for (let x = 10; x < 210;) { x = Math.min(210, x + 4 + r() * 7); pts.push([x, 40 + (r() - 0.45) * 7]); } pts[pts.length - 1][1] = 40; return pts; })();
const PK_TEAR_D = PK_TEAR.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const PK_TEAR_BACK = PK_TEAR.slice().reverse().map(([x, y]) => `L${x.toFixed(1)} ${(y + 0.8).toFixed(1)}`).join(' ');   // Lippe überlappt die Tüte minimal, damit vor dem Reißen keine Naht durchscheint
const PK_FIBERS = PK_TEAR.filter((_, i) => i % 3 === 1).map(([x, y], i) => `M${x.toFixed(1)} ${y.toFixed(1)} l${(i % 2 ? 1.4 : -1.2).toFixed(1)} ${(-2.2 - (i % 3)).toFixed(1)}`).join(' ');
/** Logo aus dem Seitenkopf (ein Bild, nur einmal eingebettet). */
const packLogo = () => ((typeof document !== 'undefined' && document.querySelector('.logo-img')) || {}).src || '';
const packSvg = () => `<svg viewBox="0 0 220 300" class="pk-svg" aria-hidden="true"><defs><linearGradient id="pkg" gradientUnits="userSpaceOnUse" x1="10" y1="6" x2="210" y2="292"><stop offset="0" stop-color="#1a2b58"/><stop offset=".55" stop-color="#0f1a3c"/><stop offset="1" stop-color="#0a1230"/></linearGradient><linearGradient id="pke" gradientUnits="userSpaceOnUse" x1="10" y1="6" x2="210" y2="292"><stop offset="0" stop-color="#22d3ee"/><stop offset=".35" stop-color="#d946ef"/><stop offset=".7" stop-color="#ef4444"/><stop offset="1" stop-color="#f5b301"/></linearGradient><linearGradient id="pks" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26407c"/><stop offset="1" stop-color="#16244a"/></linearGradient></defs>
  <path d="${PK_TEAR_D} V276 Q210 292 194 292 H26 Q10 292 10 276 Z" fill="url(#pkg)"/><path d="M10 40 V276 Q10 292 26 292 H194 Q210 292 210 276 V40" fill="none" stroke="url(#pke)" stroke-width="3" stroke-linejoin="round"/>
  <path d="M22 52 H198 V270 Q198 280 188 280 H32 Q22 280 22 270 Z" fill="none" stroke="#22d3ee" stroke-opacity=".28"/>
  <text x="110" y="80" text-anchor="middle" fill="#e6f6ff" font-size="13" font-weight="800" textLength="164" lengthAdjust="spacingAndGlyphs">AIRCRAFT COLLECTION</text>
  <path d="M34 92 H186 M34 238 H186" stroke="#22d3ee" stroke-opacity=".45"/>
  <circle cx="110" cy="165" r="54" fill="#22d3ee" opacity=".08"/>
  <image href="${packLogo()}" x="22" y="112" width="176" height="120" preserveAspectRatio="xMidYMid meet"/>   <!-- 0.21.73: Skymarket-Logo 1:1 -->
  <text x="110" y="263" text-anchor="middle" fill="#a5f3fc" font-size="19" font-weight="800" letter-spacing="1.5">MYSTERY PACK</text>
  ${['#22c55e', '#3b82f6', '#d946ef', '#ef4444', '#f5b301'].map((c, i) => `<rect x="${43 + i * 28}" y="272" width="22" height="4" rx="2" fill="${c}"/>`).join('')}
  <path class="pk-edge" d="${PK_TEAR_D}" stroke="#f1f5ff" stroke-width="1.4" stroke-linejoin="bevel" fill="none"/><path class="pk-fib" d="${PK_FIBERS}" stroke="#e6edf7" stroke-width=".9" stroke-linecap="round" fill="none"/>
  <g class="pk-strip"><path d="M10 33 V18 Q10 6 22 6 H198 Q210 6 210 18 V33 Z" fill="url(#pks)"/><path d="M10 32.6 H210 V40 ${PK_TEAR_BACK} Z" fill="url(#pkg)"/><path d="M10 33 H210" stroke="#22d3ee" stroke-opacity=".25"/><path d="M10 40 V18 Q10 6 22 6 H198 Q210 6 210 18 V40" fill="none" stroke="url(#pke)" stroke-width="3" stroke-linejoin="round"/>
    ${Array.from({ length: 21 }, (_, i) => `<path d="M${20 + i * 9} 11 V29" stroke="#ffffff" stroke-opacity=".1" stroke-width="1.6"/>`).join('')}
    <path d="M196 23 l-8 -5 v10 z" fill="#22d3ee" opacity=".8"/><path class="pk-edge" d="${PK_TEAR_D}" stroke="#f1f5ff" stroke-width="1.4" stroke-linejoin="bevel" fill="none"/></g></svg>`;
let pkAudio = null;
function goldChime() {
  try { pkAudio = pkAudio || new (window.AudioContext || window.webkitAudioContext)(); const t = pkAudio.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => { const o = pkAudio.createOscillator(), g = pkAudio.createGain(); o.type = 'triangle'; o.frequency.value = fr; g.gain.setValueAtTime(0, t + i * 0.12); g.gain.linearRampToValueAtTime(0.12, t + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.9); o.connect(g).connect(pkAudio.destination); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 1); });
  } catch (e) { /* ohne Ton */ }
}
/** Kurzes Reißgeräusch (gefiltertes Rauschen). */
function ripSound() {
  try { pkAudio = pkAudio || new (window.AudioContext || window.webkitAudioContext)(); const a = pkAudio, t = a.currentTime, n = Math.floor(a.sampleRate * 0.28), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) * (0.6 + 0.4 * Math.sin(i / 90));
    const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(); src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.8; g.gain.value = 0.18;
    src.connect(bp).connect(g).connect(a.destination); src.start(t);
  } catch (e) { /* ohne Ton */ }
}
async function openPack(packId = null) {
  if (!coll.me || !coll.me.packs.length) { toast('Keine ungeöffneten Packs.'); return; }
  const id = packId || coll.me.packs[0].id;
  const ov = packOverlay();
  ov.className = 'pk-ov'; ov.innerHTML = `${pkBg()}<div class="pk-stage"><div class="pk-box wait">${packSvg()}</div><p class="pk-cap">Pack wird vorbereitet …</p></div>`; pkAc();
  let r;
  try { r = await api('/coll/open', { body: { packId: id }, timeout: 20000 }); }
  catch (e) { ov.innerHTML = `<div class="pk-stage"><p class="pk-cap">${esc(e.message)}</p><button class="btn" data-pk="close">Schließen</button></div>`; return; }
  coll.me = r.me;   // Ergebnis ist gespeichert – auch wenn die Animation jetzt abbricht, bleibt es in der Sammlung
  playReveal(ov, r.pack);
}
function packOverlay() {
  let ov = $('#packOv');
  if (!ov) { ov = document.createElement('div'); ov.id = 'packOv'; ov.className = 'pk-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Pack öffnen'); document.body.appendChild(ov); }
  ov.hidden = false; ov.onclick = onPackOv;
  return ov;
}
function onPackOv(e) {
  const b = e.target.closest('[data-pk]'); if (!b) return;
  const k = b.dataset.pk, ov = $('#packOv');
  if (k === 'close' || k === 'coll') { ov.hidden = true; ov.innerHTML = ''; ov.className = 'pk-ov'; clearTimeout(ov._t); clearTimeout(ov._f); if (k === 'coll') setTab('collection'); else if (ui.tab === 'collection' || ui.tab === 'shop') renderPane(true); }
  else if (k === 'next') openPack();
  else if (k === 'skip' && ov._skip) ov._skip();
  else if (k === 'all' && ov._all) ov._all();
  else if (k === 'eq' && ov._cur) { const s = ov._cur, box = ov.querySelector('.pk-equip'); b.disabled = true;
    activateSkin(b.dataset.ac, s.id).then(() => { if (box) box.innerHTML = equipHtml(s, `${s.name} ist auf ${acName(b.dataset.ac)} aktiv.`); }).catch((err) => { toast(err.message); b.disabled = false; }); }
  else if (k === 'more' && ov._more) ov._more();
}
// ---------- Klang: Aufladen, Knall, Fanfare je Seltenheit ----------
const pkAc = () => { try { pkAudio = pkAudio || new (window.AudioContext || window.webkitAudioContext)(); if (pkAudio.state === 'suspended') pkAudio.resume(); return pkAudio; } catch (e) { return null; } };
function pkTone(fr, t0, dur, vol = 0.08, type = 'square') {
  const a = pkAc(); if (!a) return; const t = a.currentTime + t0, o = a.createOscillator(), o2 = a.createOscillator(), lp = a.createBiquadFilter(), g = a.createGain();
  o.type = type; o.frequency.value = fr; o2.type = 'triangle'; o2.frequency.value = fr / 2; lp.type = 'lowpass'; lp.frequency.value = 2400;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
  o.connect(lp); o2.connect(lp); lp.connect(g).connect(a.destination); o.start(t); o2.start(t); o.stop(t + dur + 0.3); o2.stop(t + dur + 0.3);
}
function pkRiser(sec) {
  const a = pkAc(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), lp = a.createBiquadFilter(), g = a.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(880, t + sec); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(4000, t + sec);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + sec); g.gain.exponentialRampToValueAtTime(0.0001, t + sec + 0.15);
  o.connect(lp).connect(g).connect(a.destination); o.start(t); o.stop(t + sec + 0.2);
}
function pkWhoosh(sec) {   // Vorbeiflug: Rauschen mit wanderndem Bandpass
  const a = pkAc(); if (!a) return; const t = a.currentTime, n = Math.floor(a.sampleRate * (sec + 0.3)), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(); src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2600, t + sec * 0.75); bp.frequency.exponentialRampToValueAtTime(500, t + sec + 0.25);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + sec * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + sec + 0.28);
  src.connect(bp).connect(g).connect(a.destination); src.start(t); src.stop(t + sec + 0.3);
}
function pkStep(i) { pkTone(i % 2 ? 98 : 82, 0, 0.09, 0.09, 'triangle'); pkTone(i % 2 ? 330 : 294, 0.02, 0.05, 0.03, 'square'); }   // tapsige Schritte
function pkBoom() {
  const a = pkAc(); if (!a) return; const t = a.currentTime, n = Math.floor(a.sampleRate * 0.6), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain(); src.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 900; g.gain.value = 0.35; src.connect(lp).connect(g).connect(a.destination); src.start(t);
  const o = a.createOscillator(), g2 = a.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.5); g2.gain.setValueAtTime(0.3, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); o.connect(g2).connect(a.destination); o.start(t); o.stop(t + 0.65);
}
/** „Taramtamtam“: je seltener, desto länger und voller. */
function pkFanfare(rk) {
  const N = { G4: 392, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5 };
  const tunes = { u: [['G4', 0, 0.12], ['C5', 0.14, 0.3]], r: [['C5', 0, 0.1], ['E5', 0.12, 0.1], ['G5', 0.24, 0.4]],
    e: [['C5', 0, 0.1], ['E5', 0.12, 0.1], ['G5', 0.24, 0.1], ['C6', 0.36, 0.55]],
    m: [['G4', 0, 0.09], ['C5', 0.11, 0.09], ['E5', 0.3, 0.16], ['E5', 0.5, 0.16], ['G5', 0.7, 0.18], ['C6', 0.92, 0.7]],
    l: [['C5', 0, 0.1], ['C5', 0.13, 0.1], ['C5', 0.26, 0.1], ['E5', 0.39, 0.32], ['D5', 0.75, 0.1], ['F5', 0.88, 0.1], ['A5', 1.01, 0.12], ['G5', 1.16, 0.2], ['C6', 1.4, 0.9]] };
  for (const [n, t, d] of tunes[rk] || tunes.u) pkTone(N[n], t, d, rk === 'u' ? 0.05 : 0.07);
  if (rk === 'l') setTimeout(goldChime, 1500);
}
const RT = { u: 1, r: 1.1, e: 1.25, m: 1.45, l: 1.8 };   // Dauer der Spannung je Seltenheit
const FLIP = { u: 500, r: 800, e: 1100, m: 1400, l: 1800 };   // (alt, nur noch Gesamtdauer-Referenz)
// 0.21.65: Spannungsleiter – jede Karte beginnt grün und springt kurz vor dem Aufdecken Stufe um Stufe hoch bis zur gezogenen Seltenheit.
const LADDER = ['u', 'r', 'e', 'm', 'l'];
const STEP_MS = [1300, 1250, 1350, 1500, 1700];   // Aufbau je Stufe (0.21.66: langsamer); nach der letzten platzt das Pack bzw. dreht sich die Karte
const STEP_HZ = [523.25, 659.25, 783.99, 1046.5, 1318.5];
function ladderOf(rk) { const n = LADDER.indexOf(rk); return LADDER.slice(0, n < 0 ? 1 : n + 1); }
function ladderMs(rk) { return ladderOf(rk).reduce((t, _, i) => t + STEP_MS[i], 0); }
function pkBg(n = 40) { return `<div class="pk-bg" aria-hidden="true"><div class="pk-bgrays"></div>${Array.from({ length: n }, () => `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;--s:${(1 + Math.random() * 2.5).toFixed(1)}px;--d:${(1 + Math.random() * 2.5).toFixed(2)}s;--w:${(Math.random() * 2).toFixed(2)}s"></i>`).join('')}</div><div class="pk-white" aria-hidden="true"></div>`; }
/** 0.21.56: Direkt nach dem Ziehen ausrüsten – passende eigene Flugzeuge dieses Spiels. */
function equipHtml(s, msg = '') {
  const pl = W && W.player, fits = pl ? pl.fleet.filter((a) => a.type_id === s.type) : [], head = msg ? `<span class="pk-eqok">${esc(msg)}</span>` : '';
  if (!fits.length) return head || `<span class="small" style="color:#a5b4d0">Keine ${esc(modelOf(s).name)} in Ihrer Flotte – der Skin wartet in der Sammlung.</span>`;
  const left = freeSlots(s.id), cur = (a) => { const k = skinFor(pl, a.id); return k ? k.name : 'Standard'; }, on = (a) => { const k = skinFor(pl, a.id); return !!(k && k.id === s.id); };
  const btn = (a) => `<button class="btn small${on(a) ? '' : ' gold'}" data-pk="eq" data-ac="${a.id}" ${on(a) || left < 1 ? 'disabled' : ''}>${on(a) ? '✓ ' : ''}${esc(acName(a.id))}${on(a) ? '' : ` <span class="small" style="opacity:.75">(${esc(cur(a))})</span>`}</button>`;
  return `${head}<span class="small" style="color:#c3cde0">${left > 0 ? `Jetzt ausrüsten – ${SK.perCopy(s.id) === 1 ? 'ein Flugzeug je Exemplar' : `bis zu ${SK.perCopy(s.id)} Flugzeuge je Exemplar`} (noch ${left} frei):` : `Alle Plätze dieses Skins sind belegt (${SK.perCopy(s.id) === 1 ? 'ein Flugzeug' : `${SK.perCopy(s.id)} Flugzeuge`} je Exemplar).`}</span><div class="row" style="gap:6px;flex-wrap:wrap;justify-content:center">${fits.slice(0, 10).map(btn).join('')}</div>${fits.length > 10 ? `<span class="small" style="color:#a5b4d0">und ${fits.length - 10} weitere – in der Sammlung wählbar</span>` : ''}`;
}
// 0.21.69: Gold-Walkout – Einlauf- und Jubelvarianten (Dauer in ms passend zu den CSS-Animationen)
const WALK_IN = [{ k: 'waddle', ms: 3000, step: 300 }, { k: 'moon', ms: 3200, step: 400 }, { k: 'sprint', ms: 1500, step: 120 }, { k: 'hop', ms: 2800, step: 400 }, { k: 'sneak', ms: 3400, step: 570 },
  { k: 'noodle', ms: 3000, step: 300 }, { k: 'strut', ms: 3200, step: 400 }, { k: 'wheel', ms: 2600, step: 650 }];
const CHEERS = [{ k: 'siu', say: 'SIUUU!', ms: 2400 }, { k: 'plane', say: 'Wuuuuh!', ms: 2800 }, { k: 'slide', say: 'Auf die Knie!', ms: 2400 }, { k: 'flip', say: 'Hopp!', ms: 2300 }, { k: 'floss', say: '♪ ♫ ♪', ms: 2600 }, { k: 'fist', say: 'Komm schon!', ms: 2400 },
  { k: 'silence', say: 'Psssst!', ms: 2600 }, { k: 'baby', say: 'Für mein Baby!', ms: 2600 }, { k: 'robot', say: 'Bip. Bop. Tor.', ms: 2600 }, { k: 'cart', say: 'Juhuuu!', ms: 2500 }, { k: 'spin', say: 'Brrrrr!', ms: 2500 }, { k: 'archer', say: 'Peng!', ms: 2400 },
  // 0.21.70: Tänze mit gebogenem Rumpf
  { k: 'dab', say: 'Dab!', ms: 2600 }, { k: 'noodle', say: 'Wabbel!', ms: 2600 }, { k: 'bow', say: 'Danke, danke!', ms: 2800 }, { k: 'limbo', say: 'Limbo!', ms: 2800 },
  { k: 'shuffle', say: 'Shuffle!', ms: 2800 }, { k: 'fever', say: 'Fieber!', ms: 2800 }, { k: 'arms', say: 'Eeeeh!', ms: 3200 }, { k: 'horse', say: 'Hü-hott!', ms: 2800 },
  { k: 'wave', say: 'Welle!', ms: 2800 }, { k: 'hype', say: 'Hype!', ms: 2600 }, { k: 'swing', say: 'La la la!', ms: 2800 }, { k: 'twist', say: 'Twist!', ms: 2800 }];
/** Aufrechte Figur aus der Seitenansicht: Nase unten mit Beinen, Heck oben mit Gesicht, Arme an der Seite (inline-SVG, damit CSS die Glieder bewegen kann). */
let walkSeq = 0;
function walkerSvg(s) {
  let G = null; const raw = acSvg(s.type, { skin: s, geo: (g) => { G = g; } }), raw2 = acSvg(s.type, { skin: s });   // zweite Kopie (eigene IDs) für den Oberkörper
  const m = raw.match(/^<svg[^>]*>/), m2 = raw2.match(/^<svg[^>]*>/); if (!G || !m || !m2) return `<img src="${skinArt(s)}" alt="">`;
  const st = (m[0].match(/ style="([^"]*)"/) || [])[1] || '', inner = raw.slice(m[0].length, raw.lastIndexOf('</svg>'));
  const st2 = (m2[0].match(/ style="([^"]*)"/) || [])[1] || '', inner2 = raw2.slice(m2[0].length, raw2.lastIndexOf('</svg>'));
  const base = '--gear:#5b6577;--ink-2:#8a94a6;--ink-3:#a3acbb;--accent:#64748b;--fus:#f4f6f9;--fus-line:#9aa5b5;--glass:#1d2a3d;';
  const { x0, xe, top, bot, cy, h, L } = G, f = (v) => (+v).toFixed(1), Y = (x) => 320 - x;   // Seiten-x → Figur-y
  const noseY = Y(x0), headY = Y(xe), legL = Math.max(38, L * 0.21), armL = Math.max(30, L * 0.16), hipY = noseY - h * 0.6, footY = hipY + legL;
  const shY = Y(xe - L * 0.42), faceY = Y(xe - L * 0.2), er = Math.max(h * 0.32, 4.2);
  const leg = (i) => { const hx = cy + (i ? 1 : -1) * h * 0.3, kx = hx - 5, ky = hipY + legL * 0.52, fx = hx - 1, fy = footY - 5, d = `M${f(hx)},${f(hipY)} L${f(kx)},${f(ky)} L${f(fx)},${f(fy)}`;
    return `<g class="wk-leg l${i}" style="transform-origin:${f(hx)}px ${f(hipY)}px"><path d="${d}" stroke="#141420" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${d}" stroke="#f1f2f6" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M${f(fx)},${f(fy - 6)} L${f(fx)},${f(fy)}" stroke="#ffd34d" stroke-width="6.5" stroke-linecap="round"/><ellipse cx="${f(fx - 7)}" cy="${f(fy + 4)}" rx="11" ry="5.5" fill="#fff" stroke="#c9a227" stroke-width="1.6"/><path d="M${f(fx - 12)},${f(fy + 1.5)} l6,-2 M${f(fx - 9)},${f(fy + 3.5)} l6,-2" stroke="#c9a227" stroke-width="1.2"/></g>`; };
  const arm = (i) => { const sx = i ? bot + 1 : top - 1, sg = i ? 1 : -1, ex = sx + sg * 9, ey = shY + armL * 0.5, hx = sx + sg * 6, hy = shY + armL, d = `M${f(sx)},${f(shY)} L${f(ex)},${f(ey)} L${f(hx)},${f(hy)}`;
    return `<g class="wk-arm a${i}" style="transform-origin:${f(sx)}px ${f(shY)}px;--s:${i ? -1 : 1}"><path d="${d}" stroke="#141420" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${d}" stroke="#f1f2f6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="${f(hx)}" cy="${f(hy + 2)}" r="5.5" fill="#fff" stroke="#141420" stroke-width="1.6"/></g>`; };
  const eye = (i) => { const ex = cy + (i ? 1 : -1) * er * 1.05, pr = er * 0.5;
    return `<circle cx="${f(ex)}" cy="${f(faceY)}" r="${f(er)}" fill="#fff" stroke="#111" stroke-width="1.4"/><circle cx="${f(ex)}" cy="${f(faceY)}" r="${f(pr)}" fill="#111"><animate attributeName="cx" values="${f(ex - er * 0.4)};${f(ex + er * 0.35)};${f(ex - er * 0.1)};${f(ex - er * 0.4)}" dur="${i ? 0.37 : 0.45}s" repeatCount="indefinite"/><animate attributeName="cy" values="${f(faceY + er * 0.3)};${f(faceY - er * 0.4)};${f(faceY + er * 0.4)};${f(faceY + er * 0.3)}" dur="${i ? 0.41 : 0.33}s" repeatCount="indefinite"/></circle>`; };
  const my = faceY + er * 2.1, mw = er * 1.2;
  const face = eye(0) + eye(1) + `<path class="wk-smile" d="M${f(cy - mw)},${f(my)} Q${f(cy)},${f(my + mw * 0.9)} ${f(cy + mw)},${f(my)}" stroke="#111" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse class="wk-shout" cx="${f(cy)}" cy="${f(my + 1.5)}" rx="${f(mw * 0.55)}" ry="${f(mw * 0.75)}" fill="#3a0d0d" stroke="#111" stroke-width="1.4"/>`;
  const vx = cy - 70, vy = headY - 14, vw = 140, vh = footY + 12 - vy;
  // 0.21.70: Taille – der Oberkörper (Heck mit Gesicht und Armen) kann sich biegen
  const waistY = Y(x0 + L * 0.44), id = 'wk' + (++walkSeq), rot = 'translate(0,320) rotate(-90)';
  const clip = `<defs><clipPath id="${id}l"><rect x="${f(vx - 80)}" y="${f(waistY)}" width="${vw + 160}" height="600"/></clipPath><clipPath id="${id}u"><rect x="${f(vx - 80)}" y="${f(vy - 300)}" width="${vw + 160}" height="${f(waistY - vy + 300.6)}"/></clipPath></defs>`;
  const joint = `<ellipse cx="${f(cy)}" cy="${f(waistY)}" rx="${f(h * 0.62)}" ry="${f(h * 0.5)}" fill="${s.pal.body}" stroke="${s.pal.line}" stroke-width="1"/>`;
  return `<svg class="wk-fig" viewBox="${f(vx)} ${f(vy)} ${vw} ${f(vh)}" style="aspect-ratio:${vw}/${f(vh)}" aria-hidden="true">${clip}${leg(0)}${leg(1)}`
    + `<g class="wk-lowerb" clip-path="url(#${id}l)"><g style="${base}${st}" transform="${rot}">${inner}</g></g>`
    + `<g class="wk-upper" style="transform-origin:${f(cy)}px ${f(waistY)}px">${joint}<g clip-path="url(#${id}u)"><g style="${base}${st2}" transform="${rot}">${inner2}</g></g>${arm(0)}${arm(1)}${face}</g></svg>`;
}
const WALK_STEPS = { hints: [300, 1700, 3100, 4500], themed: 5600, go: 6300 };
const MAKERS = ['Airbus', 'Boeing', 'Embraer', 'Bombardier', 'Cessna', 'Gulfstream', 'ATR'];
/** Vorlauf-Texte: Seltenheit, Kategorie, Hersteller, Modell (erscheinen nacheinander, beim Auftritt rutschen sie klein nach oben). */
function walkIntro(s, rk) {
  const m = modelOf(s), w1 = m.name.split(' ')[0], maker = MAKERS.includes(w1) ? w1 : /^Dash/.test(m.name) ? 'De Havilland' : /^Concorde/.test(m.name) ? 'Aérospatiale · BAC' : w1;
  const model = MAKERS.includes(w1) && w1 !== 'ATR' ? m.name.slice(w1.length + 1) : m.name;
  const H = WALK_STEPS.hints;
  return `<div class="wk-intro"><p class="wk-l rar" style="--at:${H[0]}ms">${esc(RAR[rk].label)}</p><p class="wk-l cat opt" style="--at:${H[1]}ms"><span>${esc(SK.CATEGORIES[m.cat] || '')}</span></p>`
    + `<p class="wk-l mk opt" style="--at:${H[2]}ms">${esc(maker)}</p><p class="wk-l md" style="--at:${H[3]}ms">${esc(model)}</p></div>`;
}
/** 0.21.69: Walkout-Hintergrund passend zum Motto des Skins (Verlauf + bewegte Teilchen). */
const WALK_THEME = { inferno: 'rise', crimson_dragon: 'drift', ruby_comet: 'streak', volcano: 'fall', disco_fever: 'twinkle',
  royal_phoenix: 'rise', golden_emperor: 'coins', imperial: 'twinkle', golden_titan: 'rise', sovereign: 'fall', black_diamond: 'twinkle' };
function walkTheme(s) {
  const mode = WALK_THEME[s.design]; if (!mode) return '';
  const n = mode === 'streak' ? 7 : 22;
  return `<div class="wk-theme th-${s.design} m-${mode}" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--y:${(Math.random() * 100).toFixed(1)}%;--z:${(3 + Math.random() * 6).toFixed(1)}px;--t:${(2 + Math.random() * 3).toFixed(2)}s;--d:-${(Math.random() * 5).toFixed(2)}s;--h:${Math.floor(Math.random() * 360)}"></i>`).join('')}</div>`;
}
function pkBoing() { const a = pkAc(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(620, t + 0.18); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.27); }
function pkCrowd() {   // Jubel der Menge: breites Rauschen, schwillt an und ab
  const a = pkAc(); if (!a) return; const t = a.currentTime, n = Math.floor(a.sampleRate * 2.2), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / a.sampleRate * 23));
  const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(); src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.6;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
  src.connect(bp).connect(g).connect(a.destination); src.start(t); src.stop(t + 2.2);
}
function playReveal(ov, pack) {
  const items = pack.res.map((id, i) => ({ s: SK.SKIN_BY_ID[id], fresh: pack.fresh ? pack.fresh[i] : false })).filter((x) => x.s);
  const best = items.reduce((a, x) => (RAR[x.s.rarity].order > RAR[a].order ? x.s.rarity : a), 'u');
  const T = 1.15, reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const parts = (n, multi) => Array.from({ length: n }, (_, i) => `<i style="--a:${(i * 360 / n + Math.random() * 20).toFixed(0)}deg;--d:${(120 + Math.random() * 260).toFixed(0)}px;--t:${(0.9 + Math.random() * 1.1).toFixed(2)}s${multi ? `;background:${DISCO[i % DISCO.length]};box-shadow:0 0 10px ${DISCO[i % DISCO.length]}` : ''}"></i>`).join('');
  const nParts = { u: 24, r: 40, e: 56, m: 72, l: 96 };
  ov.innerHTML = `${pkBg()}<button class="btn small pk-skip" data-pk="skip">Überspringen ›</button><div class="pk-stage">
    <div class="pk-box" role="button" tabindex="0" aria-label="Pack aufreißen">${packSvg()}<span class="pk-lines"></span><span class="pk-seam"></span></div><div class="pk-halo"></div><div class="pk-beam"></div><div class="pk-beam b2"></div><div class="pk-flash"></div>
    <div class="pk-wave"></div><div class="pk-wave w2"></div><div class="pk-wave w3"></div><div class="pk-parts">${parts(nParts.r, false)}</div><div class="pk-rays"></div>
    <div class="pk-hint"><b>Oben aufreißen</b><span class="pk-swipe"></span><span>Lasche zur Seite ziehen – oder antippen</span></div>
    <p class="pk-cap">${items.length > 1 ? `${items.length} Skins in diesem Pack` : 'Aircraft Mystery Pack'}</p></div>`;
  // Ablauf: Pack erscheint und leuchtet → Spieler reißt die Lasche ab (oder tippt) → Pack lädt sich auf (Beben, Licht aus der Naht, Aufheulen)
  // → Farben flackern → Lichtsäulen in der Seltenheitsfarbe → Explosion (Blitz über den ganzen Bildschirm, Druckwellen, Funken, Knall) → Karte verdeckt → dreht sich mit Fanfare
  const st = ov.querySelector('.pk-stage'), box = st.querySelector('.pk-box');
  // 0.21.66: Das Pack selbst steigt stufenweise – grün aufladen, kurz vor dem Platzen eine Farbe höher, bis zur besten Seltenheit im Pack
  const packLad = ladderOf(best), seq = [[0, 'charge'], [900 * T, 'tease'], [1700 * T, 'beam']];
  let tAt = 1700 * T; for (let n = 1; n < packLad.length; n++) { tAt += STEP_MS[n - 1]; seq.push([tAt, 'up' + n]); }
  seq.push([tAt + STEP_MS[packLad.length - 1], 'open']);
  const paintPack = (c) => { for (const r of LADDER) { st.classList.toggle('rc-' + r, r === c); ov.classList.toggle('rc-' + r, r === c); } };
  let i = 0, idx = 0, done = false, torn = false, drag = null;
  const tick = () => {
    if (done) return;
    if (i < seq.length) { const k = seq[i][1]; st.classList.add(k);
      if (k === 'charge') { paintPack('u'); pkRiser(1.7 * T); }
      if (k === 'beam') { paintPack('u'); pkRiser(STEP_MS[0] / 1000); }
      if (k.startsWith('up')) { const n = +k.slice(2); paintPack(packLad[n]); st.classList.remove('up' + n, 'kick'); void st.offsetWidth; st.classList.add('kick');
        pkTone(STEP_HZ[n], 0, 0.16, 0.07); pkTone(STEP_HZ[n] * 1.5, 0.05, 0.2, 0.05); pkRiser(STEP_MS[n] / 1000);
        try { navigator.vibrate && navigator.vibrate(25 + 15 * n); } catch (e) { /* egal */ } }
      if (k === 'open') st.classList.remove('kick');
      if (k === 'open') { pkBoom(); ov.classList.add('quake', 'boom'); try { navigator.vibrate && navigator.vibrate([40, 30, 80]); } catch (e) { /* egal */ } }
      const nx = seq[i + 1] ? seq[i + 1][0] - seq[i][0] : 750 * T; i++; ov._t = setTimeout(tick, nx); }
    else show(0);
  };
  const setT = (v) => box.style.setProperty('--tear', v.toFixed(3));
  const tear = () => {
    if (torn || done) return; torn = true; setT(1); box.classList.add('torn'); st.classList.add('torn'); ripSound();
    try { navigator.vibrate && navigator.vibrate(18); } catch (e) { /* egal */ }
    ov._t = setTimeout(tick, 500);
  };
  const autoTear = () => { if (torn) return; const t0 = performance.now(); const step = (now) => { if (torn || done) return; const v = Math.min(1, (now - t0) / 420); setT(v); if (v < 1) requestAnimationFrame(step); else tear(); }; requestAnimationFrame(step); };
  box.onpointerdown = (e) => { if (torn) return; pkAc(); drag = { x: e.clientX, w: box.getBoundingClientRect().width, moved: false }; try { box.setPointerCapture(e.pointerId); } catch (x) { /* egal */ } box.classList.remove('snap'); };
  box.onpointermove = (e) => { if (!drag || torn) return; const dx = Math.abs(e.clientX - drag.x); if (dx > 8) drag.moved = true; const v = Math.min(1, dx / (drag.w * 0.7)); setT(v); if (v >= 1) { drag = null; tear(); } };
  box.onpointerup = box.onpointercancel = () => { if (!drag || torn) return; const d = drag; drag = null;
    if (!d.moved) { autoTear(); return; }
    if ((parseFloat(box.style.getPropertyValue('--tear')) || 0) > 0.55) tear(); else { box.classList.add('snap'); setT(0); } };
  box.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); autoTear(); } };
  const show = (k, quick = false) => {
    done = true; clearTimeout(ov._t); clearTimeout(ov._f); (ov._w || []).forEach(clearTimeout); idx = k;
    const x = items[k], s = x.s, last = k === items.length - 1, rk = s.rarity, multi = items.length > 1;
    // 0.21.69: Ab Rot startet der Walkout direkt – keine verdeckte Karte davor
    const walkout = !quick && !reduce && (rk === 'm' || rk === 'l');
    const fd = quick || reduce ? 0 : walkout ? 1 : multi ? ladderMs(rk) : STEP_MS[0], lad = walkout ? [rk] : multi ? ladderOf(rk) : [rk], c0 = fd ? lad[0] : rk;   // Einzelpack: Leiter lief schon am Pack
    ov.className = 'pk-ov rc-' + c0;
    ov.innerHTML = `${pkBg()}${items.length > 1 && !last ? '<button class="btn small pk-skip" data-pk="all">Alle zeigen ›</button>' : ''}<div class="pk-stage reveal rc-${c0}${s.blink && !fd ? ' disco' : ''}${walkout ? ' pre-walk' : ''}" style="--fd:${fd}ms">
      <div class="pk-flash"></div><div class="pk-wave"></div><div class="pk-wave w2"></div><div class="pk-wave w3"></div><div class="pk-parts">${parts(nParts[rk], rk === 'l' || s.blink)}</div><div class="pk-rays"></div>
      <div class="pk-flip"><div class="pk-inner">
        <div class="pk-face pk-back rar-${c0}"><span class="pk-q">?</span><span class="pk-backt">AIRCRAFT COLLECTION</span></div>
        <div class="pk-face pk-front"><div class="pk-card rar-${rk}"><span class="pk-rar">${RAR[rk].label}${x.fresh ? ' · NEU' : ''}</span><img src="${skinArt(s)}" alt="${esc(s.name)}"><h2>${esc(s.name)}</h2><span class="pk-model">${esc(modelOf(s).name)}</span><p>${esc(s.desc)}</p>
          <span class="small">${items.length > 1 ? `Skin ${k + 1} von ${items.length}` : ''}</span></div></div></div></div>
      <div class="pk-equip">${equipHtml(s)}</div>
      <div class="row pk-btns">${last ? `<button class="btn" data-pk="more">Zusammenfassung</button>` : `<button class="btn primary" data-pk="more">Nächster Skin</button>`}</div></div>`;
    ov._cur = s;
    const st2 = ov.querySelector('.pk-stage');
    const back = st2.querySelector('.pk-back');
    const paint = (c) => { for (const r of LADDER) { st2.classList.toggle('rc-' + r, r === c); ov.classList.toggle('rc-' + r, r === c); back.classList.toggle('rar-' + r, r === c); } };
    const flip = () => { clearTimeout(ov._f); (ov._w || []).forEach(clearTimeout); ov.querySelectorAll('.pk-walk:not(.out)').forEach((x) => x.remove());
      if (st2.classList.contains('pre-walk')) st2.classList.replace('pre-walk', 'after-walk');
      paint(rk); if (s.blink) st2.classList.add('disco'); st2.classList.remove('kick'); st2.classList.add('flipped', 'burst'); ov.classList.add('boom'); pkFanfare(rk); if (rk === 'm' || rk === 'l') ov.classList.add('quake'); setTimeout(() => ov.classList.remove('quake', 'boom'), 900); };
    // Walkout wie im Fußballspiel: Rot fliegt ein, Gold läuft aufrecht herein (Nase = Beine) und jubelt – Einlauf und Jubel jedes Mal zufällig
    const doWalk = () => {
      paint(rk); const gold = rk === 'l';
      const wi = gold ? WALK_IN[Math.floor(Math.random() * WALK_IN.length)] : null, cj = gold ? CHEERS[Math.floor(Math.random() * CHEERS.length)] : null;
      const w = document.createElement('div');
      w.className = `pk-walk rc-${rk} ${gold ? `walk wi-${wi.k} cj-${cj.k}` : 'fly'}${s.blink ? ' disco' : ''}`;
      w.innerHTML = `${walkTheme(s)}<div class="wk-spot"></div><div class="wk-floor"></div>${walkIntro(s, rk)}
        <div class="wk-plane"><div class="wk-body">${gold ? walkerSvg(s) : `<span class="wk-trail"></span><span class="wk-trail t2"></span><img src="${skinArt(s)}" alt="">`}</div>${gold && cj.k === 'siu' ? `<span class="wk-say">${esc(cj.say)}</span>` : ''}</div>
        <div class="pk-parts wk-parts">${parts(gold ? 70 : 44, gold || s.blink)}</div><span class="small wk-skip">Tippen zum Überspringen</span>`;
      ov.appendChild(w);
      // 0.21.69: Vorlauf in Stufen wie beim Fußball-Walkout – Seltenheit, Kategorie, Hersteller, Modell, dann Motto-Bühne und Auftritt
      const T0 = WALK_STEPS.go, TRAVEL = gold ? wi.ms : 1500, HOLD = gold ? cj.ms : 900;
      const end = () => { clearTimeout(ov._f); (ov._w || []).forEach(clearTimeout); w.classList.add('out'); flip(); setTimeout(() => w.remove(), 450); };
      w.onclick = (e) => { e.stopPropagation(); end(); };
      ov._w = [setTimeout(() => { w.classList.add('go'); if (!gold) pkWhoosh(TRAVEL / 1000); }, T0),
        ...WALK_STEPS.hints.map((t, i) => setTimeout(() => (i === 3 ? (pkBoom(), pkTone(783.99, 0.05, 0.4, 0.07)) : (pkTone(73.4 + i * 18, 0, 0.3, 0.14, 'sine'), pkTone(293.7 + i * 74, 0.02, 0.18, 0.05))), t)),
        setTimeout(() => { w.classList.add('themed'); pkRiser((T0 - WALK_STEPS.themed) / 1000 + 0.2); }, WALK_STEPS.themed)];
      if (gold) for (let t = 0, i = 0; t < TRAVEL; t += wi.step, i++) ov._w.push(setTimeout(() => (wi.k === 'hop' ? pkBoing() : pkStep(i)), T0 + t));
      ov._w.push(setTimeout(() => { w.classList.add('arrived'); pkBoom(); if (gold) { pkCrowd(); pkTone(523.25, 0.1, 0.12, 0.06); pkTone(659.25, 0.25, 0.12, 0.06); pkTone(783.99, 0.4, 0.3, 0.07); } try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (e) { /* egal */ } }, T0 + TRAVEL));
      ov._f = setTimeout(end, T0 + TRAVEL + HOLD);
    };
    // Stufe für Stufe: aufladen wie vor dem Aufdecken – dann im letzten Moment eine Farbe höher springen, bis die gezogene erreicht ist
    const step = (n) => {
      if (n >= lad.length - 1) { ov._f = setTimeout(flip, STEP_MS[n]); return; }
      ov._f = setTimeout(() => {
        paint(lad[n + 1]); st2.classList.remove('kick'); void st2.offsetWidth; st2.classList.add('kick');
        pkTone(STEP_HZ[n + 1], 0, 0.16, 0.07); pkTone(STEP_HZ[n + 1] * 1.5, 0.05, 0.2, 0.05);
        try { navigator.vibrate && navigator.vibrate(25 + 15 * n); } catch (e) { /* egal */ }
        pkRiser(STEP_MS[n + 1] / 1000); step(n + 1);
      }, STEP_MS[n]);
    };
    ov.classList.remove('quake', 'boom');
    if (walkout) doWalk();
    else if (fd) { st2.classList.add('tease'); pkRiser(STEP_MS[0] / 1000); step(0); } else flip();
    st2.querySelector('.pk-flip').onclick = () => { if (!st2.classList.contains('flipped')) { clearTimeout(ov._f); flip(); } };
  };
  const summary = () => {
    clearTimeout(ov._f); (ov._w || []).forEach(clearTimeout); const left = coll.me ? coll.me.packs.length : 0;
    ov.className = 'pk-ov rc-' + best;
    ov.innerHTML = `${pkBg()}<div class="pk-stage sum"><h2>Erhalten</h2><div class="pk-sum">${items.map((x) => `<div class="pk-mini rar-${x.s.rarity}"><img src="${skinArt(x.s)}" alt=""><b>${esc(x.s.name)}</b><span>${esc(modelOf(x.s).name)}</span>${rarChip(x.s.rarity)}${x.fresh ? '<span class="chip good">neu</span>' : '<span class="chip">Duplikat</span>'}</div>`).join('')}</div>
      <div class="row pk-btns"><button class="btn" data-pk="coll">Zur Sammlung</button>${left ? `<button class="btn primary" data-pk="next">Nächstes Pack öffnen (${left})</button>` : '<button class="btn" data-pk="close">Schließen</button>'}</div></div>`;
  };
  ov._skip = () => show(0, true);
  ov._all = () => summary();
  ov._more = () => { if (idx < items.length - 1) show(idx + 1); else summary(); };
  ov.className = 'pk-ov';
  if (reduce) show(0);
  else { ov._t = setTimeout(() => { st.classList.add('appear'); ov._t = setTimeout(() => { st.classList.add('float'); try { box.focus({ preventScroll: true }); } catch (e) { /* egal */ } }, 700); }, 40); }
}

// ---------- Shop ----------
VIEWS.shop = function viewShop() {
  if (!coll.me) { loadColl(true); return '<div class="ac-wrap"><p class="small muted">Shop wird geladen …</p></div>'; }
  const S = coll.shop || { enabled: false, offers: [], odds: { count: [], rarity: [] } }, m = coll.me, en = S.enabled;
  if (!ui.shReqs && !ui.shReqBusy) { ui.shReqBusy = true; api('/shop/requests').then((r) => { ui.shReqs = r.requests; ui.shReqBusy = false; if (ui.tab === 'shop') renderPane(true); }).catch(() => { ui.shReqBusy = false; ui.shReqs = []; }); }
  const tokS = (v) => `${Number(v).toLocaleString('de-DE')} Token`;
    let html = `<div class="ac-wrap sh-dark"><div class="sh-hero"><div class="sh-pack">${packSvg()}</div><div class="stack"><span class="ac-kicker">AIRCRAFT COLLECTION</span><h2>Aircraft Mystery Pack</h2>
    <p>Jedes Pack enthält 1 bis 3 zufällige Flugzeug-Skins aus ${SK.TOTAL} Lackierungen für ${SK.MODELS.length} Modelle. Rein kosmetisch – ohne Einfluss auf das Spiel.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><span class="chip">${n0(m.packs.length)} ungeöffnete Packs</span>${m.packs.length ? '<button class="btn primary small" data-act="accopen">Pack öffnen</button>' : ''}</div></div></div>`;
  if (!en) html += `<div class="callout warn"><b>Anfragen sind noch nicht freigeschaltet.</b><span class="small">${coll.admin ? 'Freischalten im Menü oben rechts → Aircraft Pack Management. Kostenlose Packs können Sie schon jetzt vergeben.' : 'Packs gibt es bis dahin über Aktionen der Spielleitung und im Tausch.'}</span></div>`;
  const sMax = ((S.offers || []).find((o) => o.perPack) || {}).max || 50, q = ui.shQty = Math.max(1, Math.min(sMax, ui.shQty || 1));
  html += `<div class="sh-offers">${S.offers.map((o) => { const big = !o.perPack && o.packs >= 20, n = o.perPack ? q : o.packs, pp = o.perPack ? Number(o.price) : Number(o.price) / o.packs;
    return `<div class="sh-offer ${o.key}${big ? ' collector' : ''}${o.perPack ? ' single' : ''}"><div class="sh-o-l"><b>${esc(o.label)}</b><span class="small">${String(+pp.toFixed(2)).replace('.', ',')} Token pro Pack</span></div>
      ${o.perPack ? `<div class="sh-qty"><button class="btn small" data-act="shqty" data-v="-1" ${q <= 1 ? 'disabled' : ''} aria-label="Ein Pack weniger">−</button><b class="sh-n">${q}</b><button class="btn small" data-act="shqty" data-v="1" ${q >= (o.max || 50) ? 'disabled' : ''} aria-label="Ein Pack mehr">+</button></div>` : `<b class="sh-n">${o.packs}×</b>`}
      <span class="sh-price">${tokS(o.perPack ? q * Number(o.price) : o.price)}</span>
      <button class="btn small ${big ? 'gold' : 'primary'}" data-act="shbuy" data-v="${o.key}" ${en ? '' : 'disabled'}>${n} ${n === 1 ? 'Pack' : 'Packs'} anfragen</button></div>`; }).join('')}</div>
    <p class="small" style="position:relative;color:#c3cde0">So läuft es ab: Sie fragen ein Angebot an. Die Spielleitung prüft die Anfrage und gibt die Packs frei – danach liegen sie in Ihrem Inventar. ${esc(S.payInfo || '')}</p>`;
  { const R = ui.shReqs || [], ST = { open: 'wartet auf Freigabe', approved: 'freigegeben', declined: 'abgelehnt', cancelled: 'zurückgezogen' };
    if (R.length) html += `<div class="card pad stack"><h3>Ihre Anfragen</h3>${R.map((q) => `<div class="spread small" style="gap:8px;flex-wrap:wrap"><span><b class="mono">${esc(q.id)}</b> · ${new Date(q.created).toLocaleDateString('de-DE')} · ${q.packs} ${q.packs === 1 ? 'Pack' : 'Packs'} · ${tokS(q.amount)}</span><span><span class="chip ${q.status === 'approved' ? 'good' : q.status === 'open' ? 'warn' : ''}">${ST[q.status] || esc(q.status)}</span>${q.note ? ` <span class="muted">${esc(q.note)}</span>` : ''}${q.status === 'open' ? ` <button class="btn small" data-act="shcancel" data-id="${esc(q.id)}">Zurückziehen</button>` : ''}</span></div>`).join('')}
      </div>`; }
  const cnt = S.odds.count.map(([n, w]) => `<tr><td>${n} Skin${n > 1 ? 's' : ''}</td><td class="r">${w} %</td></tr>`).join('');
  const rar = S.odds.rarity.map(([k, w]) => `<tr><td>${rarChip(k)}</td><td class="r">${w} %</td><td class="r small muted">${SK.MODELS.length * RAR[k].perModel} Skins</td></tr>`).join('');
  html += `<div class="card pad stack"><h3>Wahrscheinlichkeiten</h3><div class="grid2"><table class="t"><thead><tr><th>Skins je Pack</th><th class="r">Chance</th></tr></thead><tbody>${cnt}</tbody></table>
      <table class="t"><thead><tr><th>Seltenheit je Skin</th><th class="r">Chance</th><th class="r">Auswahl</th></tr></thead><tbody>${rar}</tbody></table></div>
    <p class="small muted">Für jeden Skin wird unabhängig gezogen: erst die Seltenheit, dann eines der ${SK.MODELS.length} Modelle (jedes mit 1/${SK.MODELS.length} = ${(100 / SK.MODELS.length).toFixed(2).replace('.', ',')} %), dann einer der Skins dieser Seltenheit für das Modell. Doppelte Skins sind möglich. Die Wahrscheinlichkeiten passen sich nie an. Gezogen wird auf dem Server mit einem kryptografisch sicheren Zufallsgenerator, sobald Sie ein Pack öffnen.</p></div>`;
  return html + '</div>';
};
function showBuy(key) {
  const S = coll.shop, o = S && S.offers.find((x) => x.key === key); if (!o) return;
  const n = o.perPack ? ui.shQty || 1 : o.packs, price = o.perPack ? n * Number(o.price) : Number(o.price);
  const md = modal(`<h1>${n} Aircraft Mystery ${n === 1 ? 'Pack' : 'Packs'}${o.perPack ? '' : ` (${esc(o.label)})`}</h1>
    <p><b>${price.toLocaleString('de-DE')} Token</b></p>
    <p class="small ink2">Sie senden eine Anfrage an die Spielleitung. Sobald sie freigegeben ist, ${n === 1 ? 'liegt das Pack' : `liegen die ${n} Packs`} in Ihrem Inventar. ${esc(S.payInfo || '')} Jedes Pack enthält 1 bis 3 zufällige, rein kosmetische Skins (Wahrscheinlichkeiten stehen im Shop).</p>
    <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn" data-b="no">Abbrechen</button><button class="btn primary" data-b="go">Anfrage senden</button></div>`, false);
  md.onclick = async (e) => {
    const b = e.target.closest('[data-b]'); if (!b) return;
    if (b.dataset.b === 'no' || b.dataset.b === 'ok') { md.hidden = true; return; }
    b.disabled = true;
    try {
      const r = await api('/shop/request', { body: { offer: key, count: n }, timeout: 25000 });
      ui.shReqs = null;
      md.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h1>Anfrage ${esc(r.request.id)} gesendet</h1><p>Ihre Anfragenummer: <b class="mono">${esc(r.request.id)}</b></p><p class="small ink2">Die ${r.request.packs} Packs erscheinen in Ihrem Inventar, sobald die Spielleitung die Anfrage freigegeben hat. ${esc(r.payInfo || '')}</p><div class="row" style="justify-content:flex-end"><button class="btn primary" data-b="ok">OK</button></div></div>`;
      if (ui.tab === 'shop') renderPane(true);
    } catch (err) { toast(err.message); b.disabled = false; }
  };
}

// ---------- Tausch ----------
VIEWS.trading = function viewTrading() {
  if (!coll.me) { loadColl(true); return '<div class="ac-wrap"><p class="small muted">Wird geladen …</p></div>'; }
  const T = ui.tr = ui.tr || { q: '', players: null, target: null, their: null, give: [], want: [], list: null };
  if (!T.list && !T.loading) { T.loading = true; api('/coll/trades').then((r) => { T.list = r.trades; T.loading = false; if (ui.tab === 'trading') renderPane(true); }).catch(() => { T.loading = false; }); }
  const me = mpState.user.key, list = T.list || [];
  const mini = (ids) => ids.length ? `<div class="tr-items">${ids.map((id) => { const s = SK.SKIN_BY_ID[id]; return s ? `<span class="ac-mini rar-${s.rarity}" title="${esc(s.name)} · ${esc(modelOf(s).name)}"><img src="${skinArt(s)}" alt=""><span>${esc(s.name)}<small>${esc(modelOf(s).name)}</small></span></span>` : ''; }).join('')}</div>` : '<span class="small muted">nichts</span>';
  const tradeCard = (t) => { const out = t.from === me, other = out ? t.toName : t.fromName;
    return `<div class="card pad stack tr-card"><div class="spread"><b>${out ? `An ${esc(other)}` : `Von ${esc(other)}`}</b><span class="small muted">${new Date(t.created).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></div>
      <div class="tr-grid"><div><span class="small muted">${out ? 'Sie geben' : `${esc(other)} gibt`}</span>${mini(t.give)}</div><div><span class="small muted">${out ? 'Sie erhalten' : 'Sie geben dafür'}</span>${mini(t.want)}</div></div>
      ${t.status === 'open' ? (out ? `<div class="row"><button class="btn small" data-act="trx" data-k="cancel" data-id="${t.id}">Angebot zurückziehen</button></div>` : `<div class="row" style="gap:8px"><button class="btn small primary" data-act="trx" data-k="accept" data-id="${t.id}">Annehmen</button><button class="btn small" data-act="trx" data-k="decline" data-id="${t.id}">Ablehnen</button></div>`)
        : `<span class="chip ${t.status === 'done' ? 'good' : ''}">${({ done: 'getauscht', declined: 'abgelehnt', cancelled: 'zurückgezogen', void: 'hinfällig' })[t.status] || t.status}${t.closed ? ' · ' + new Date(t.closed).toLocaleDateString('de-DE') : ''}</span>`}</div>`; };
  const inc = list.filter((t) => t.status === 'open' && t.to === me), outg = list.filter((t) => t.status === 'open' && t.from === me), hist = list.filter((t) => t.status !== 'open');
  let html = `<div class="ac-wrap"><div class="ac-head"><div><span class="ac-kicker">AIRCRAFT COLLECTION</span><h2>Trading</h2></div></div>
    <p class="small muted">Tauschen Sie Skins mit anderen Spielern. Beide müssen ausdrücklich zustimmen: Sie mit dem Senden, die andere Seite mit „Annehmen“. Übertragen wird in einem Schritt auf dem Server. Skins lassen sich nur innerhalb des Spiels und nur gegen andere Skins tauschen.</p>`;
  html += `<section class="stack"><h3 class="sec sm">Eingehende Angebote <small>${inc.length}</small></h3>${inc.length ? inc.map(tradeCard).join('') : '<p class="small muted">Keine offenen Angebote an Sie.</p>'}</section>`;
  // Neues Angebot
  const myFree = SK.SKINS.filter((s) => freeCopies(s.id) > 0);
  html += `<section class="card pad stack"><h3>Neues Angebot</h3>
    <div class="row" style="gap:8px;flex-wrap:wrap"><input id="tr-q" type="search" placeholder="Spieler suchen" value="${esc(T.q)}" style="flex:1;min-width:160px" aria-label="Spieler suchen"><button class="btn small" data-act="trsearch">Suchen</button></div>
    ${T.players ? `<div class="row" style="gap:6px;flex-wrap:wrap">${T.players.length ? T.players.map((p) => `<button class="btn small${T.target === p.key ? ' primary' : ''}" data-act="trpick" data-v="${esc(p.key)}">${esc(p.name)} <span class="small muted">${p.uniq} Skins</span></button>`).join('') : '<span class="small muted">Niemand gefunden.</span>'}</div>` : ''}
    ${T.target ? `<div class="tr-build"><div><b class="small">Sie geben</b>${mini(T.give)}<details><summary class="small">Skin hinzufügen</summary><div class="tr-pool">${myFree.map((s) => `<button class="ac-mini rar-${s.rarity}" data-act="tradd" data-k="give" data-id="${s.id}"><img src="${skinArt(s)}" alt=""><span>${esc(s.name)}<small>${esc(modelOf(s).name)} · ${freeCopies(s.id) - T.give.filter((x) => x === s.id).length} frei</small></span></button>`).join('') || '<span class="small muted">Keine freien Skins.</span>'}</div></details></div>
      <div><b class="small">Sie erhalten von ${esc((T.players || []).concat(T.targetInfo ? [T.targetInfo] : []).find((p) => p.key === T.target)?.name || T.target)}</b>${mini(T.want)}<details><summary class="small">Skin wünschen</summary><div class="tr-pool">${T.their ? Object.entries(T.their).map(([id, n]) => { const s = SK.SKIN_BY_ID[id]; return s ? `<button class="ac-mini rar-${s.rarity}" data-act="tradd" data-k="want" data-id="${s.id}"><img src="${skinArt(s)}" alt=""><span>${esc(s.name)}<small>${esc(modelOf(s).name)} · ${n} frei</small></span></button>` : ''; }).join('') || '<span class="small muted">Keine freien Skins.</span>' : '<span class="small muted">Lädt …</span>'}</div></details></div></div>
      <div class="row" style="gap:8px"><button class="btn small" data-act="trclear">Leeren</button><button class="btn small primary" data-act="trsend" ${T.give.length || T.want.length ? '' : 'disabled'}>Angebot senden</button></div>` : '<p class="small muted">Erst einen Spieler suchen und auswählen.</p>'}</section>`;
  html += `<section class="stack"><h3 class="sec sm">Ihre offenen Angebote <small>${outg.length}</small></h3>${outg.length ? outg.map(tradeCard).join('') : '<p class="small muted">Keine.</p>'}</section>`;
  html += `<section class="stack"><h3 class="sec sm">Verlauf</h3>${hist.length ? hist.slice(0, 20).map(tradeCard).join('') : '<p class="small muted">Noch keine abgeschlossenen Tausche.</p>'}</section></div>`;
  return html;
};
async function trSearch() {
  const T = ui.tr; T.q = ($('#tr-q') || {}).value || '';
  try { const r = await api('/coll/players?q=' + encodeURIComponent(T.q)); T.players = r.players; } catch (e) { toast(e.message); }
  renderPane(true);
}
async function trPick(key) {
  const T = ui.tr; T.target = key; T.their = null; T.want = []; renderPane(true);
  try { const r = await api('/coll/user/' + encodeURIComponent(key)); T.their = r.free; T.targetInfo = { key, name: r.name }; } catch (e) { toast(e.message); }
  if (ui.tab === 'trading') renderPane(true);
}
async function trAct(id, k) {
  try { const r = await api(`/coll/trade/${encodeURIComponent(id)}/${k}`, { body: {} }); if (r.me) coll.me = r.me; toast(k === 'accept' ? 'Getauscht! Die Skins sind in Ihrer Sammlung.' : k === 'decline' ? 'Abgelehnt.' : 'Angebot zurückgezogen.'); }
  catch (e) { toast(e.message); }
  ui.tr.list = null; loadColl(true); renderPane(true);
}
async function trSend() {
  const T = ui.tr;
  try { await api('/coll/trade', { body: { to: T.target, give: T.give, want: T.want } }); toast('Angebot gesendet.'); T.give = []; T.want = []; T.list = null; await loadColl(true); }
  catch (e) { toast(e.message); }
  renderPane(true);
}

/** Klicks in den Collection-Reitern (aus onPaneClick). true = erledigt. */
function collPaneClick(act, b) {
  switch (act) {
    case 'accopen': openPack(); return true;
    case 'acf': ui.cf[b.dataset.k] = b.dataset.v; renderPane(true); return true;
    case 'acdetail': showSkinDetail(b.dataset.id); return true;
    case 'skinpick': if (!coll.me) { loadColl(true).then(() => showSkinPicker(b.dataset.id)); } else showSkinPicker(b.dataset.id); return true;
    case 'shbuy': showBuy(b.dataset.v); return true;
    case 'shqty': ui.shQty = Math.max(1, Math.min(((coll.shop && coll.shop.offers || []).find((o) => o.perPack) || {}).max || 50, (ui.shQty || 1) + Number(b.dataset.v))); renderPane(true); return true;
    case 'shcancel': api(`/shop/request/${encodeURIComponent(b.dataset.id)}/cancel`, { body: {} }).then(() => { ui.shReqs = null; renderPane(true); }).catch((e) => toast(e.message)); return true;
    case 'trsearch': trSearch(); return true;
    case 'trpick': trPick(b.dataset.v); return true;
    case 'tradd': { const T = ui.tr, k = b.dataset.k, id = b.dataset.id; const lim = k === 'give' ? freeCopies(id) : (T.their || {})[id] || 0; if (T[k].filter((x) => x === id).length >= lim) { toast('Keine weiteren freien Exemplare.'); return true; } T[k].push(id); renderPane(true); return true; }
    case 'trclear': ui.tr.give = []; ui.tr.want = []; renderPane(true); return true;
    case 'trsend': trSend(); return true;
    case 'trx': trAct(b.dataset.id, b.dataset.k); return true;
    default: return false;
  }
}

// ---------- Admin: kostenlose Packs, Protokoll, Statistik ----------
/** 0.21.63: eine Zeile im Angebots-Editor. */
function offerEditRow(o, i) {
  const pp = !!o.perPack;
  return `<div class="pa-of" data-key="${esc(o.key)}" data-pp="${pp ? '1' : ''}"><label class="f"><span>Bezeichnung</span><input data-f="label" maxlength="30" value="${esc(o.label)}"></label>
    ${pp ? `<label class="f"><span>höchstens</span><input data-f="max" type="number" min="1" max="200" value="${o.max || 50}"></label>` : `<label class="f"><span>Packs</span><input data-f="packs" type="number" min="1" max="200" value="${o.packs}"></label>`}
    <label class="f"><span>${pp ? 'Token je Pack' : 'Token gesamt'}</span><input data-f="price" inputmode="decimal" value="${esc(String(o.price).replace('.', ','))}"></label>
    <label class="pa-on"><input type="checkbox" data-f="active" ${o.active !== false ? 'checked' : ''}><span>im Shop</span></label>${pp ? '<span class="small muted pa-x">Einzelpacks</span>' : `<button class="btn small ghost" data-pa="ofdel" aria-label="Paket entfernen">Entfernen</button>`}</div>`;
}
async function showPackAdmin() {
  const m = modal('<h1>Aircraft Pack Management</h1><p class="small muted">Lade …</p>');
  let d; try { d = await api('/coll/admin', { timeout: 20000 }); } catch (e) { toast(e.message); m.hidden = true; return; }
  const S = d.stats, tokC = (c) => `${(c / 100).toLocaleString('de-DE')} Token`, tf = (t) => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const tiles = [['Packs aus Anfragen', n0(S.paidPacks), `${n0(S.orders)} freigegebene Anfragen`], ['Kostenlose Admin-Packs', n0(S.adminPacks), 'getrennt gezählt'], ['Geöffnete Packs', n0(S.opened), `${n0(S.unopened)} noch zu`], ['Gezogene Skins', n0(S.skinsOut), `${n0(S.uniqAll)} verschiedene im Umlauf`],
    ['Token (Anfragen)', tokC(S.revenueCents), 'nur freigegebene Anfragen'], ['Tauschvorgänge', n0(S.trades), `${n0(S.collectors)} Sammler`],
    ['Seltenheiten', SK.RARITY_ORDER.map((k) => `${S.rarity[k] || 0}`).join(' / '), SK.RARITY_ORDER.map((k) => RAR[k].colorName.toLowerCase()).join(' / ')]];
  m.innerHTML = `<div class="dialog wide" role="dialog" aria-modal="true"><div class="spread"><h1>Aircraft Pack Management</h1><button class="btn small" data-pa="close">Schließen</button></div>
    <div class="tiles">${tiles.map(([k, v, s]) => `<div class="tile"><span>${esc(k)}</span><b>${v}</b><em>${esc(s)}</em></div>`).join('')}</div>
    <section class="card pad stack"><h3>Pack-Anfragen für alle Spieler</h3>
      <p class="small ${d.shop.enabled ? 'pos' : 'muted'}">${d.shop.enabled ? 'Freigeschaltet: Spieler können im Shop Packs anfragen.' : 'Gesperrt: Der Shop zeigt die Angebote, Anfragen sind aber nicht möglich. Kostenlose Vergabe geht trotzdem.'}</p>
      <label class="f"><span>Hinweistext im Shop (optional)</span><input id="pa-info" maxlength="600" value="${esc(d.shop.payInfo || '')}" placeholder="z. B. wie man Token bekommt"></label>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn ${d.shop.enabled ? '' : 'primary'}" data-pa="shop" data-on="${d.shop.enabled ? '' : '1'}">${d.shop.enabled ? 'Anfragen sperren' : 'Anfragen freischalten'}</button><button class="btn" data-pa="shop" data-on="${d.shop.enabled ? '1' : ''}">Nur Text speichern</button></div></section>
    <section class="card pad stack"><h3>Angebote im Shop</h3>
      <p class="small muted">Bezeichnung, Anzahl Packs und Preis in Token anpassen, Angebote aus- und einschalten oder neue Pakete anlegen. Gilt sofort für neue Anfragen; offene Anfragen behalten ihren Preis.</p>
      <div class="pa-offers" id="pa-offers">${(d.shop.offersAll || d.shop.offers).map((o, i) => offerEditRow(o, i)).join('')}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small" data-pa="ofadd">Paket hinzufügen</button><button class="btn small primary" data-pa="ofsave">Angebote speichern</button><button class="btn small ghost" data-pa="ofreset">Standard wiederherstellen</button></div></section>
    <section class="card pad stack"><h3>Tägliches Gratis-Pack</h3>
      <p class="small ${d.shop.daily ? 'pos' : 'muted'}">${d.shop.daily ? 'An: Jeder angemeldete Spieler bekommt einmal pro Kalendertag (Berliner Zeit) ein Pack, sobald er das Spiel öffnet.' : 'Aus: Es gibt keine täglichen Gratis-Packs.'}${d.stats.dailyPacks ? ` Bisher verteilt: ${d.stats.dailyPacks}.` : ''}</p>
      <div class="row"><button class="btn ${d.shop.daily ? '' : 'primary'}" data-pa="daily" data-on="${d.shop.daily ? '' : '1'}">${d.shop.daily ? 'Ausschalten' : 'Einschalten'}</button></div></section>
    <section class="card pad stack"><h3>Pack-Anfragen <small class="muted">${d.requests.filter((q) => q.status === 'open').length} offen</small></h3>
      <p class="small muted">Die Freigabe schreibt die Packs sofort gut und lässt sich nicht zurücknehmen.</p>
      ${d.requests.length ? d.requests.map((q) => `<div class="spread small" style="gap:8px;flex-wrap:wrap"><span><b class="mono">${esc(q.id)}</b> · ${tf(q.created)} · <b>${esc(q.userName)}</b> · ${q.packs} ${q.packs === 1 ? 'Pack' : 'Packs'} · ${Number(q.amount).toLocaleString('de-DE')} Token</span>
        ${q.status === 'open' ? `<span class="row" style="gap:6px"><button class="btn small primary" data-pa="rq" data-k="approve" data-id="${esc(q.id)}">Freigeben</button><button class="btn small" data-pa="rq" data-k="decline" data-id="${esc(q.id)}">Ablehnen</button></span>` : `<span class="chip ${q.status === 'approved' ? 'good' : ''}">${({ approved: 'freigegeben', declined: 'abgelehnt', cancelled: 'zurückgezogen' })[q.status]}${q.by ? ' · ' + esc(q.by) : ''}</span>`}</div>`).join('') : '<p class="small muted">Keine Anfragen.</p>'}</section>
    <section class="card pad stack"><h3>Kostenlose Packs vergeben</h3>
      <div class="row" style="gap:8px;flex-wrap:wrap"><input id="pa-q" type="search" placeholder="Spieler (Name)" style="flex:1;min-width:160px"><button class="btn small" data-pa="find">Suchen</button></div>
      <div id="pa-res" class="row" style="gap:6px;flex-wrap:wrap"></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><label class="f" style="min-width:140px"><span>Spieler</span><input id="pa-user" placeholder="Benutzername"></label><label class="f" style="width:110px"><span>Anzahl</span><input id="pa-n" type="number" min="1" max="100" value="1"></label><label class="f" style="flex:1;min-width:180px"><span>Grund (optional)</span><input id="pa-why" maxlength="200" placeholder="z. B. Community-Gewinnspiel"></label></div>
      <div class="row"><button class="btn primary" data-pa="grant">Kostenlos vergeben</button></div></section>
    <section class="stack"><h3>Vergabehistorie</h3><div class="tw"><table class="t"><thead><tr><th>Zeit</th><th>Admin</th><th>Spieler</th><th class="r">Packs</th><th>Grund</th></tr></thead><tbody>${d.grants.map((g) => `<tr><td class="small">${tf(g.t)}</td><td>${esc(g.adminName)}</td><td>${esc(g.userName)}</td><td class="r">${g.count}</td><td class="small">${esc(g.reason || '–')}</td></tr>`).join('') || '<tr><td colspan="5" class="small muted">Noch keine.</td></tr>'}</tbody></table></div></section>
    <details><summary><b>Protokoll</b> <span class="small muted">(${d.payments.length} letzte Einträge)</span></summary><div class="tw"><table class="t"><thead><tr><th>Zeit</th><th>Vorgang</th><th>Konto</th><th>Anfrage</th><th>Betrag</th><th>Details</th></tr></thead><tbody>${d.payments.map((p) => `<tr><td class="small">${tf(p.t)}</td><td>${esc(p.kind)}</td><td>${esc(p.user || '')}</td><td class="mono small">${esc((p.oid || '').slice(0, 8))}</td><td>${p.amount ? esc(p.amount + ' ' + (p.currency || '')) : ''}</td><td class="small">${esc([p.what, p.by ? 'durch ' + p.by : '', p.note].filter(Boolean).join(' · '))}</td></tr>`).join('')}</tbody></table></div></details></div>`;
  m.onclick = async (e) => {
    const b = e.target.closest('[data-pa]'); if (!b) return;
    const k = b.dataset.pa;
    if (k === 'close') { m.hidden = true; return; }
    if (k === 'ofadd') { const box = $('#pa-offers'), i = box.children.length; box.insertAdjacentHTML('beforeend', offerEditRow({ key: `p${Date.now() % 100000}`, label: 'Neues Paket', packs: 5, price: '2.5', active: true }, i)); return; }
    if (k === 'ofdel') { b.closest('.pa-of').remove(); return; }
    if (k === 'ofsave' || k === 'ofreset') {
      const offers = k === 'ofreset' ? 'reset' : [...document.querySelectorAll('#pa-offers .pa-of')].map((r) => ({ key: r.dataset.key, perPack: r.dataset.pp === '1', label: r.querySelector('[data-f=label]').value, packs: r.querySelector('[data-f=packs]') ? r.querySelector('[data-f=packs]').value : 1, max: r.querySelector('[data-f=max]') ? r.querySelector('[data-f=max]').value : undefined, price: r.querySelector('[data-f=price]').value, active: r.querySelector('[data-f=active]').checked }));
      if (k === 'ofreset' && !b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Wirklich zurücksetzen?'; return; }
      b.disabled = true;
      try { await api('/coll/admin/shop', { body: { offers } }); coll.at = 0; await loadColl(true); toast(k === 'ofreset' ? 'Standardangebote wiederhergestellt.' : 'Angebote gespeichert.'); showPackAdmin(); } catch (err) { toast(err.message); b.disabled = false; }
      return;
    }
    if (k === 'daily') { b.disabled = true; try { await api('/coll/admin/shop', { body: { daily: !!b.dataset.on } }); coll.at = 0; await loadColl(true); toast(b.dataset.on ? 'Tägliches Gratis-Pack ist an.' : 'Tägliches Gratis-Pack ist aus.'); showPackAdmin(); } catch (err) { toast(err.message); b.disabled = false; } return; }
    if (k === 'shop') { b.disabled = true; try { await api('/coll/admin/shop', { body: { enabled: !!b.dataset.on, info: $('#pa-info').value } }); coll.at = 0; await loadColl(true); toast(b.dataset.on ? 'Pack-Anfragen sind freigeschaltet.' : 'Pack-Anfragen sind gesperrt.'); showPackAdmin(); } catch (err) { toast(err.message); b.disabled = false; } return; }
    if (k === 'find') { try { const r = await api('/coll/players?q=' + encodeURIComponent($('#pa-q').value)); $('#pa-res').innerHTML = r.players.map((p) => `<button class="btn small" data-pa="pick" data-v="${esc(p.key)}">${esc(p.name)}</button>`).join('') || '<span class="small muted">Niemand gefunden.</span>'; } catch (err) { toast(err.message); } return; }
    if (k === 'pick') { $('#pa-user').value = b.dataset.v; return; }
    if (k === 'rq') {
      const act = b.dataset.k;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = act === 'approve' ? 'Wirklich freigeben?' : 'Wirklich ablehnen?'; return; }
      b.disabled = true;
      try { await api(`/shop/request/${encodeURIComponent(b.dataset.id)}/${act}`, { body: {} }); toast(act === 'approve' ? 'Packs freigegeben.' : 'Anfrage abgelehnt.'); } catch (err) { toast(err.message); }
      showPackAdmin(); return;
    }
    if (k === 'grant') {
      const user = $('#pa-user').value.trim(), count = Number($('#pa-n').value), reason = $('#pa-why').value.trim();
      if (!user) { toast('Bitte einen Spieler angeben.'); return; }
      b.disabled = true;
      try { await api('/coll/admin/grant', { body: { user, count, reason } }); toast(`${count} Pack${count > 1 ? 's' : ''} an ${user} vergeben.`); showPackAdmin(); } catch (err) { toast(err.message); b.disabled = false; }
    }
  };
}

// ---------- Karte: Skin-Effekte für das Flugzeug-Canvas ----------
/** Farbe und Effekt eines Skins auf der Karte (nur Darstellung). */
function skinMapStyle(s) { return s ? { fill: s.rarity === 'l' ? '#fff3c4' : s.pal.tail, edge: s.rarity === 'l' ? '#3a2600' : s.pal.line, fx: s.blink ? 'disco' : s.rarity, d: s.design, glow: s.rarity === 'r' ? '#60a5fa' : s.rarity === 'e' ? '#e879f9' : s.rarity === 'm' ? '#ef4444' : s.rarity === 'l' ? '#ffd34d' : null } : null; }
const DISCO = ['#ff2bd6', '#22e5ff', '#ffe14d', '#7cff4f', '#ff7a1a'];
/** Disco Fever: Farbe wechselt im Takt (auf der Karte und in Listen). */
const discoColor = (now) => DISCO[Math.floor(now / 260) % DISCO.length];
function drawSkinFx(ctx, p, k, now) {
  // 0.21.57: deutlich auffälliger als die eigenen (gelben) Flugzeuge – Effekte auch weit herausgezoomt
  const st = p.sk; if (!st) return;
  const lw = 1 / p.sc, th = MAP_THEME[st.d];
  if (th) { ctx.save(); th(ctx, now, lw); ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  if (st.fx === 'r') {   // blauer Glanzring
    ctx.strokeStyle = '#60a5fa'; ctx.globalAlpha = 0.45 + 0.25 * Math.sin(now / 500); ctx.lineWidth = 1.2 * lw; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (st.fx === 'e') {   // pinker Schweif aus Partikeln, leuchtender Ring
    ctx.fillStyle = st.glow;
    if (!th) for (let i = 1; i <= 5; i++) { const ph = ((now / 600) + i * 0.2) % 1; ctx.globalAlpha = 0.6 * (1 - ph); ctx.beginPath(); ctx.arc(-9 - i * 3.5 - ph * 4, Math.sin(now / 300 + i) * 1.6, 1.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(now / 400); ctx.strokeStyle = st.glow; ctx.lineWidth = 1.4 * lw; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (st.fx === 'm' || st.fx === 'disco') {   // Funkenschweif (rot) bzw. bunte Lichtpunkte, pulsierender Ring
    if (!th || st.fx === 'disco') for (let i = 1; i <= 6; i++) { const ph = ((now / 520) + i / 6) % 1; ctx.fillStyle = st.fx === 'disco' ? DISCO[(i + Math.floor(now / 260)) % DISCO.length] : (i % 2 ? '#ef4444' : '#ffb21f'); ctx.globalAlpha = 0.8 * (1 - ph); ctx.beginPath(); ctx.arc(-9 - i * 3.2 - ph * 6, Math.sin(now / 240 + i * 2) * 2.4, 1.4, 0, Math.PI * 2); ctx.fill(); }
    const c = st.fx === 'disco' ? discoColor(now) : '#ef4444';
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 220); ctx.strokeStyle = c; ctx.lineWidth = 1.6 * lw; ctx.beginPath(); ctx.arc(0, 0, 11.5 + Math.sin(now / 220), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (st.fx === 'l') {   // Gold: rotierende Strahlen, doppelter pulsierender Ring, Glitzersterne
    const r = 13 + Math.sin(now / 350) * 1.8, rot = now / 1600;
    ctx.save(); ctx.rotate(rot); ctx.globalAlpha = th ? 0.12 : 0.28; ctx.fillStyle = '#ffd34d';
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r + 7, -1.6); ctx.lineTo(r + 7, 1.6); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.globalAlpha = 0.95; ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 1.6 * lw; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8 * lw; ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) { const a = rot * 2 + i * Math.PI / 2, ph = (Math.sin(now / 260 + i * 1.7) + 1) / 2, x = Math.cos(a) * (r + 3), y = Math.sin(a) * (r + 3), z = 1 + ph * 1.6;
      ctx.globalAlpha = 0.4 + 0.6 * ph; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - z); ctx.lineTo(x + z * 0.3, y); ctx.lineTo(x, y + z); ctx.lineTo(x - z * 0.3, y); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

/* 0.21.67: Eigene Karteneffekte je Design – lokale Koordinaten: Nase zeigt nach +x, Heck nach −x, Rumpf etwa ±9. */
const fxFrac = (x) => x - Math.floor(x);
const fxWob = (t, i) => Math.sin(t + i * 2.17) * 0.5 + Math.sin(t * 1.7 + i * 1.31) * 0.5;   // weiches Rauschen −1…1
const fxHash = (n) => fxFrac(Math.sin(n * 12.9898) * 43758.5453);
function fxDot(ctx, x, y, r, c, a) { ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0.15, r), 0, Math.PI * 2); ctx.fill(); }
function fxStar(ctx, x, y, r, c, a, rot = 0) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, an = rot + i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } ctx.closePath(); ctx.fill(); }
function fxGem(ctx, x, y, r, c, a) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.7, y); ctx.closePath(); ctx.fill(); }
function fxFlame(ctx, now, cols, len = 30, n = 16, w = 3.2, speed = 700) {   // Flammenschweif hinter dem Heck
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const ph = fxFrac(now / speed + i / n), x = -7 - ph * len, y = fxWob(now / 120, i) * (0.6 + ph * 3.2), r = (w - ph * w * 0.55) * (0.8 + 0.35 * fxWob(now / 80, i + 3));
    fxDot(ctx, x, y, r, cols[Math.min(cols.length - 1, Math.floor(ph * cols.length))], 0.8 * (1 - ph)); }
}
function fxBolt(ctx, x0, y0, x1, y1, seed, c) {
  ctx.beginPath(); ctx.moveTo(x0, y0); const n = 5;
  for (let i = 1; i < n; i++) { const t = i / n, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, off = (fxHash(seed + i) - 0.5) * 7; ctx.lineTo(x0 + (x1 - x0) * t + nx / l * off, y0 + (y1 - y0) * t + ny / l * off); }
  ctx.lineTo(x1, y1); ctx.strokeStyle = c; ctx.stroke();
}
const MAP_THEME = {
  // —— Rot ——
  inferno(ctx, now) { fxFlame(ctx, now, ['#fff3b0', '#ffd34d', '#ff8a1f', '#ff4d1f', '#c81e1e'], 34, 18, 3.6); fxDot(ctx, -7, 0, 3.4 + Math.sin(now / 70), '#fff1c2', 0.55); },
  crimson_dragon(ctx, now) {   // Feueratem nach vorn, Schuppen dahinter
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) { const ph = fxFrac(now / 420 + i / 14), x = 10 + ph * 18, y = fxWob(now / 70, i) * ph * 4.5; fxDot(ctx, x, y, 0.8 + ph * 2.8, ph < 0.3 ? '#fff1a8' : ph < 0.6 ? '#ff8a1f' : '#dc2626', 0.85 * (1 - ph)); }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 7; i++) { const ph = fxFrac(now / 1000 + i / 7); fxGem(ctx, -9 - ph * 24, Math.sin(now / 300 + i) * 2, 1.8 - ph, i % 2 ? '#7f1d1d' : '#dc2626', 0.8 * (1 - ph)); }
  },
  ruby_comet(ctx, now) {   // langer Kometenschweif mit Funkeln
    const w = 3.6 + Math.sin(now / 160) * 0.6, g = ctx.createLinearGradient(-6, 0, -46, 0); g.addColorStop(0, 'rgba(255,77,109,.9)'); g.addColorStop(0.4, 'rgba(225,29,72,.45)'); g.addColorStop(1, 'rgba(225,29,72,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-5, -w); ctx.quadraticCurveTo(-26, -w * 0.4, -46, 0); ctx.quadraticCurveTo(-26, w * 0.4, -5, w); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 9; i++) { const ph = fxFrac(now / 900 + i / 9); fxStar(ctx, -8 - ph * 36, fxWob(now / 200, i) * 3, 1.5 * (1 - ph) + 0.4, i % 3 ? '#ffd1dc' : '#ff4d6d', 0.9 * (1 - ph), now / 300 + i); }
  },
  volcano(ctx, now) {   // Rauch und aufsteigende Glut
    for (let i = 0; i < 5; i++) { const ph = fxFrac(now / 1600 + i / 5); fxDot(ctx, -10 - ph * 22, fxWob(now / 900, i) * 3, 2 + ph * 5, '#57534e', 0.35 * (1 - ph)); }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) { const ph = fxFrac(now / 800 + i / 12), side = i % 2 ? 1 : -1; fxDot(ctx, -6 - ph * 16, side * (2 + ph * 12) + fxWob(now / 150, i), 1.1 * (1 - ph) + 0.3, i % 3 ? '#ff7a1a' : '#ffd34d', 0.9 * (1 - ph)); }
    fxDot(ctx, 0, 0, 12 + Math.sin(now / 260) * 1.5, '#ff4d1f', 0.12);
  },
  // —— Pink ——
  cyberpunk(ctx, now, lw) {   // zwei schwenkende Laser aus den Flügelspitzen, Glitch-Pixel dahinter
    ctx.globalCompositeOperation = 'lighter';
    for (const [y0, c, ph] of [[-6, '#22e5ff', 0], [6, '#ff2bd6', Math.PI]]) {
      const an = Math.sin(now / 380 + ph) * 0.55, x1 = Math.cos(an) * 40, y1 = y0 + Math.sin(an) * 40;
      ctx.strokeStyle = c; ctx.globalAlpha = 0.25; ctx.lineWidth = 3.2 * lw; ctx.beginPath(); ctx.moveTo(1, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha = 0.95; ctx.lineWidth = 1 * lw; ctx.stroke(); fxDot(ctx, x1, y1, 1.4, '#ffffff', 0.9);
    }
    const tk = Math.floor(now / 110);
    for (let i = 0; i < 8; i++) { const x = -9 - fxHash(tk + i * 7) * 26, y = (fxHash(tk * 3 + i) - 0.5) * 10, sz = 1 + fxHash(i + tk) * 1.6; ctx.globalAlpha = 0.85; ctx.fillStyle = i % 2 ? '#22e5ff' : '#ff2bd6'; ctx.fillRect(x, y, sz, sz); }
  },
  galaxy(ctx, now) {   // zwei Spiralarme aus Sternen, Nebel dahinter
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const ph = fxFrac(now / 2400 + i / 4); fxDot(ctx, -10 - ph * 20, fxWob(now / 700, i) * 3, 4 + ph * 4, i % 2 ? '#7c3aed' : '#2563eb', 0.22 * (1 - ph)); }
    for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 9; i++) { const an = now / 800 + i * 0.5 + arm * Math.PI, r = 6 + i * 1.5; fxDot(ctx, Math.cos(an) * r, Math.sin(an) * r, 0.5 + (9 - i) * 0.09, i % 3 ? '#e9d5ff' : '#ffffff', 0.9 - i * 0.07); }
  },
  neon_pulse(ctx, now, lw) {   // Neonwellen in Pink und Cyan
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const ph = fxFrac(now / 1100 + i / 3), c = i % 2 ? '#22e5ff' : '#ff2bd6';
      ctx.globalAlpha = 0.9 * (1 - ph); ctx.strokeStyle = c; ctx.lineWidth = (2.6 - ph * 1.8) * lw; ctx.beginPath(); ctx.arc(0, 0, 9 + ph * 22, 0, Math.PI * 2); ctx.stroke(); }
  },
  aurora(ctx, now, lw) {   // wehende Polarlicht-Bänder
    ctx.globalCompositeOperation = 'lighter';
    [['#34d399', -2.4], ['#22d3ee', 0], ['#a78bfa', 2.4]].forEach(([c, y0], b) => {
      const g = ctx.createLinearGradient(-6, 0, -48, 0); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = g; ctx.globalAlpha = 0.85; ctx.lineWidth = 2.6 * lw; ctx.beginPath();
      for (let x = -6; x >= -48; x -= 2) { const y = y0 + Math.sin(x * 0.22 + now / 260 + b * 1.3) * (1.5 + (-x) * 0.06); x === -6 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); });
  },
  cosmic(ctx, now, lw) {   // zwei Planeten auf Umlaufbahnen, Sternenstaub
    ctx.globalAlpha = 0.25; ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 0.6 * lw; ctx.beginPath(); ctx.ellipse(0, 0, 15, 10, 0.4, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, 21, 13, -0.3, 0, Math.PI * 2); ctx.stroke();
    const a1 = now / 700, a2 = -now / 1100;
    const p1 = [Math.cos(a1) * 15, Math.sin(a1) * 10], p2 = [Math.cos(a2) * 21, Math.sin(a2) * 13];
    const r1 = [p1[0] * Math.cos(0.4) - p1[1] * Math.sin(0.4), p1[0] * Math.sin(0.4) + p1[1] * Math.cos(0.4)], r2 = [p2[0] * Math.cos(-0.3) - p2[1] * Math.sin(-0.3), p2[0] * Math.sin(-0.3) + p2[1] * Math.cos(-0.3)];
    fxDot(ctx, r1[0], r1[1], 2.2, '#fb923c', 1); ctx.globalAlpha = 0.9; ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 0.7 * lw; ctx.beginPath(); ctx.ellipse(r1[0], r1[1], 3.6, 1.2, 0.5, 0, Math.PI * 2); ctx.stroke();
    fxDot(ctx, r2[0], r2[1], 1.6, '#60a5fa', 1);
    ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 8; i++) { const ph = fxFrac(now / 1300 + i / 8); fxStar(ctx, -9 - ph * 26, fxWob(now / 400, i) * 4, 1.2 * (1 - ph) + 0.3, '#f5f3ff', 0.9 * (1 - ph), i); }
  },
  electric_storm(ctx, now, lw) {   // zuckende Blitze rund ums Flugzeug
    ctx.globalCompositeOperation = 'lighter'; const tk = Math.floor(now / 130);
    for (let b = 0; b < 3; b++) { if (fxHash(tk * 5 + b) < 0.35) continue; const an = fxHash(tk * 11 + b) * Math.PI * 2, r = 15 + fxHash(tk + b * 3) * 9, x0 = Math.cos(an) * 6, y0 = Math.sin(an) * 6, x1 = Math.cos(an) * r, y1 = Math.sin(an) * r;
      ctx.globalAlpha = 0.35; ctx.lineWidth = 3 * lw; fxBolt(ctx, x0, y0, x1, y1, tk * 13 + b, '#60a5fa'); ctx.globalAlpha = 1; ctx.lineWidth = 1 * lw; fxBolt(ctx, x0, y0, x1, y1, tk * 13 + b, '#e0f2fe'); }
    fxDot(ctx, 0, 0, 12, '#93c5fd', 0.08 + 0.1 * fxHash(tk));
  },
  // —— Gold ——
  royal_phoenix(ctx, now) {   // schlagende Feuerflügel und goldener Flammenschweif
    fxFlame(ctx, now, ['#fffbe6', '#ffe58a', '#ffc21f', '#ff8a1f', '#e0531f'], 30, 16, 3.4, 650);
    const flap = Math.sin(now / 170), span = 15 + flap * 4;
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) { const g = ctx.createLinearGradient(0, 0, -6, side * span); g.addColorStop(0, 'rgba(255,229,138,.95)'); g.addColorStop(0.6, 'rgba(255,138,31,.6)'); g.addColorStop(1, 'rgba(224,83,31,0)');
      ctx.globalAlpha = 0.9; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(3, side * 2); ctx.quadraticCurveTo(4, side * span * 0.8, -6, side * span); ctx.quadraticCurveTo(-4, side * span * 0.55, -10, side * span * 0.75); ctx.quadraticCurveTo(-5, side * span * 0.3, -4, side * 2); ctx.closePath(); ctx.fill(); }
  },
  golden_emperor(ctx, now) {   // sich drehende Goldmünzen regnen hinterher
    for (let i = 0; i < 9; i++) { const ph = fxFrac(now / 1200 + i / 9), x = -9 - ph * 26, y = (i % 3 - 1) * 4 + ph * 6 * (i % 2 ? 1 : -1), sx = Math.abs(Math.cos(now / 180 + i)) * 2 + 0.3;
      ctx.globalAlpha = 0.95 * (1 - ph); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.ellipse(x, y, sx, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 0.4; ctx.stroke(); }
    fxStar(ctx, 13, 0, 2.6 + Math.sin(now / 200) * 0.5, '#fff7d1', 0.95, now / 600);
  },
  imperial(ctx, now) {   // Kranz aus kreisenden Goldsternen
    for (let i = 0; i < 10; i++) { const an = now / 1500 + i * Math.PI / 5, tw = (Math.sin(now / 220 + i) + 1) / 2; fxStar(ctx, Math.cos(an) * 18, Math.sin(an) * 18, 1.6 + tw * 1.1, i % 2 ? '#ffd34d' : '#fff7d1', 0.6 + 0.4 * tw, an); }
  },
  golden_titan(ctx, now, lw) {   // schwere Druckwellen und Goldstrahl
    for (let i = 0; i < 2; i++) { const ph = fxFrac(now / 1400 + i / 2); ctx.globalAlpha = 0.85 * (1 - ph); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = (4 - ph * 3) * lw; ctx.beginPath(); ctx.arc(0, 0, 10 + ph * 26, 0, Math.PI * 2); ctx.stroke(); }
    const g = ctx.createLinearGradient(-6, 0, -40, 0); g.addColorStop(0, 'rgba(255,211,77,.9)'); g.addColorStop(1, 'rgba(255,211,77,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(-40, -2.2, 34, 4.4);
  },
  sovereign(ctx, now, lw) {   // kreisende Juwelen und Banner in Purpur und Gold
    [['#a855f7', -1.6], ['#ffd34d', 1.6]].forEach(([c, y0], b) => { ctx.strokeStyle = c; ctx.globalAlpha = 0.85; ctx.lineWidth = 2.2 * lw; ctx.beginPath();
      for (let x = -6; x >= -36; x -= 2) { const y = y0 + Math.sin(x * 0.3 + now / 220 + b) * 1.8; x === -6 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); });
    ['#ef4444', '#3b82f6', '#22c55e'].forEach((c, i) => { const an = now / 900 + i * Math.PI * 2 / 3, x = Math.cos(an) * 16, y = Math.sin(an) * 16; fxGem(ctx, x, y, 2.8, c, 1); fxDot(ctx, x - 0.6, y - 1, 0.6, '#ffffff', 0.9); });
  },
  black_diamond(ctx, now) {   // dunkler Halo mit Regenbogen-Glanzlichtern
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 20); g.addColorStop(0, 'rgba(10,10,20,.0)'); g.addColorStop(0.6, 'rgba(10,10,20,.55)'); g.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const an = now / 1300 + i * Math.PI / 3, tw = (Math.sin(now / 180 + i * 1.9) + 1) / 2; fxGem(ctx, Math.cos(an) * 14, Math.sin(an) * 14, 1.4 + tw * 1.6, `hsl(${(now / 12 + i * 60) % 360} 95% 70%)`, 0.4 + 0.6 * tw); }
    for (let i = 0; i < 5; i++) { const ph = fxFrac(now / 1400 + i / 5); fxGem(ctx, -9 - ph * 22, fxWob(now / 500, i) * 3, 1.8 * (1 - ph) + 0.4, '#e5e7eb', 0.8 * (1 - ph)); }
  },
  // —— Blau (dezent) ——
  midnight(ctx, now) { for (let i = 0; i < 6; i++) { const ph = fxFrac(now / 1400 + i / 6); fxStar(ctx, -9 - ph * 20, fxWob(now / 500, i) * 3, 0.9 * (1 - ph) + 0.3, '#e0e7ff', 0.9 * (1 - ph), i); } },
  silver_arrow(ctx, now, lw) { ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.8 * lw; for (let i = 0; i < 3; i++) { const ph = fxFrac(now / 500 + i / 3); ctx.globalAlpha = 0.8 * (1 - ph); ctx.beginPath(); ctx.moveTo(-8 - ph * 10, (i - 1) * 3.5); ctx.lineTo(-18 - ph * 16, (i - 1) * 3.5); ctx.stroke(); } },
  blue_lightning(ctx, now, lw) { const tk = Math.floor(now / 160); if (fxHash(tk) < 0.4) return; ctx.globalAlpha = 0.9; ctx.lineWidth = 0.8 * lw; fxBolt(ctx, -8, 0, -24, (fxHash(tk + 1) - 0.5) * 10, tk, '#93c5fd'); },
  deep_ocean(ctx, now, lw) { ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 0.6 * lw; for (let i = 0; i < 6; i++) { const ph = fxFrac(now / 1500 + i / 6); ctx.globalAlpha = 0.85 * (1 - ph); ctx.beginPath(); ctx.arc(-9 - ph * 18, fxWob(now / 600, i) * 3 - ph * 3, 0.6 + ph * 1.4, 0, Math.PI * 2); ctx.stroke(); } },
  polar_express(ctx, now, lw) { ctx.strokeStyle = '#f0f9ff'; ctx.lineWidth = 0.5 * lw; for (let i = 0; i < 6; i++) { const ph = fxFrac(now / 1700 + i / 6), x = -9 - ph * 20, y = fxWob(now / 700, i) * 4, r = 1.3 * (1 - ph) + 0.4; ctx.globalAlpha = 0.9 * (1 - ph); ctx.beginPath(); for (let a = 0; a < 3; a++) { const an = a * Math.PI / 3 + now / 900; ctx.moveTo(x - Math.cos(an) * r, y - Math.sin(an) * r); ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } ctx.stroke(); } },
};
/* 0.21.67: Bewegte Lackierung des Flugzeugs selbst auf der Karte (ab Pink). Setzt fillStyle (und ggf. Leuchten). */
const fxHsl = (h, s2, l) => `hsl(${((h % 360) + 360) % 360} ${s2}% ${l}%)`;
function goldSheen(ctx, now, base = ['#b07800', '#ffd34d', '#fff3c4']) {   // goldener Grund, heller Glanzstreifen läuft durch, zweiter kleiner hinterher
  const g = ctx.createLinearGradient(-11, -7, 11, 7), m = fxFrac(now / 1300) * 1.4 - 0.2, m2 = fxFrac(now / 1300 + 0.45) * 1.4 - 0.2, cl = (x) => Math.max(0, Math.min(1, x));
  const st = [[0, base[0]], [0.5, base[1]], [1, base[2]], [cl(m - 0.12), null], [cl(m), '#ffffff'], [cl(m + 0.12), null], [cl(m2), '#fff7d6']].filter((x) => x[1]).sort((a, b) => a[0] - b[0]);
  for (const [o, c] of st) g.addColorStop(o, c); return g;
}
const fxLin = (ctx, cols, rot = 0) => { const c = Math.cos(rot) * 11, s2 = Math.sin(rot) * 11, g = ctx.createLinearGradient(-c, -s2, c, s2); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; };
const MAP_FILL = {
  inferno(ctx, now, st, dpr) { const f = (Math.sin(now / 90) + Math.sin(now / 53)) / 4 + 0.5; ctx.fillStyle = fxLin(ctx, ['#7a0f05', fxHsl(8 + f * 30, 100, 45 + f * 15), '#ffd34d']); ctx.shadowColor = '#ff6a1f'; ctx.shadowBlur = (6 + f * 6) * dpr; },
  crimson_dragon(ctx, now, st, dpr) { const f = (Math.sin(now / 300) + 1) / 2; ctx.fillStyle = fxLin(ctx, ['#3b0505', fxHsl(355, 85, 30 + f * 22), '#ff8a8a'], Math.PI / 2); ctx.shadowColor = '#dc2626'; ctx.shadowBlur = (5 + f * 6) * dpr; },
  ruby_comet(ctx, now, st, dpr) { const f = fxFrac(now / 900); ctx.fillStyle = fxLin(ctx, ['#7f1030', f < 0.5 ? '#ff4d6d' : '#ffd1dc', '#e11d48'], now / 1500); ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = 7 * dpr; },
  volcano(ctx, now, st, dpr) { const f = (Math.sin(now / 420) + 1) / 2; ctx.fillStyle = fxLin(ctx, ['#1c1917', fxHsl(20 + f * 15, 100, 35 + f * 20), '#1c1917']); ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = (4 + f * 8) * dpr; },
  cyberpunk(ctx, now, st, dpr) { const on = Math.floor(now / 280) % 2; ctx.fillStyle = fxLin(ctx, on ? ['#22e5ff', '#0b1530', '#ff2bd6'] : ['#ff2bd6', '#0b1530', '#22e5ff']); ctx.shadowColor = on ? '#22e5ff' : '#ff2bd6'; ctx.shadowBlur = 8 * dpr; },
  galaxy(ctx, now, st, dpr) { ctx.fillStyle = fxLin(ctx, ['#1e1b4b', '#7c3aed', '#60a5fa', '#f5f3ff'], now / 900); ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 7 * dpr; },
  neon_pulse(ctx, now, st, dpr) { const f = (Math.sin(now / 260) + 1) / 2; ctx.fillStyle = fxHsl(320 - f * 135, 100, 60); ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = (6 + f * 8) * dpr; },
  aurora(ctx, now, st, dpr) { const h = 150 + (Math.sin(now / 700) + 1) * 60; ctx.fillStyle = fxLin(ctx, [fxHsl(h, 80, 55), fxHsl(h + 50, 80, 60), fxHsl(h + 100, 70, 65)], Math.PI / 2); ctx.shadowColor = fxHsl(h, 80, 60); ctx.shadowBlur = 7 * dpr; },
  cosmic(ctx, now, st, dpr) { ctx.fillStyle = fxLin(ctx, ['#312e81', '#fb923c', '#c084fc'], -now / 1100); ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 6 * dpr; },
  electric_storm(ctx, now, st, dpr) { const tk = Math.floor(now / 110), fl = fxHash(tk) > 0.62; ctx.fillStyle = fl ? '#f0f9ff' : fxLin(ctx, ['#1e3a8a', '#3b82f6', '#93c5fd']); ctx.shadowColor = fl ? '#ffffff' : '#60a5fa'; ctx.shadowBlur = (fl ? 16 : 6) * dpr; },
  disco_fever(ctx, now, st, dpr) { ctx.fillStyle = discoColor(now); ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 7 * dpr; },
  royal_phoenix(ctx, now) { ctx.fillStyle = goldSheen(ctx, now, ['#c2410c', '#ffb21f', '#fff3c4']); },
  golden_titan(ctx, now) { ctx.fillStyle = goldSheen(ctx, now, ['#8a5a00', '#e0a800', '#ffe58a']); },
  sovereign(ctx, now) { ctx.fillStyle = goldSheen(ctx, now, ['#6b21a8', '#ffd34d', '#fff3c4']); },
  black_diamond(ctx, now, st, dpr) { const g = ctx.createLinearGradient(-11, -7, 11, 7), m = Math.max(0.02, Math.min(0.98, fxFrac(now / 1500))); g.addColorStop(0, '#0a0a12'); g.addColorStop(Math.max(0, m - 0.08), '#1f1f2e'); g.addColorStop(m, fxHsl(now / 8, 95, 75)); g.addColorStop(Math.min(1, m + 0.08), '#1f1f2e'); g.addColorStop(1, '#0a0a12'); ctx.fillStyle = g; ctx.shadowColor = fxHsl(now / 8, 95, 70); ctx.shadowBlur = 10 * dpr; },
};
const MAP_THEME_TXT = { inferno: 'Flammenschweif', crimson_dragon: 'Feueratem und Drachenschuppen', ruby_comet: 'Kometenschweif mit Rubinfunkeln', volcano: 'Rauch und Glutregen',
  cyberpunk: 'zwei schwenkende Laser, Glitch-Pixel', galaxy: 'Sternenspirale und Nebel', neon_pulse: 'Neonwellen in Pink und Cyan', aurora: 'wehende Polarlicht-Bänder', cosmic: 'kreisende Planeten, Sternenstaub', electric_storm: 'zuckende Blitze',
  royal_phoenix: 'Feuerflügel und goldener Flammenschweif', golden_emperor: 'Goldmünzenregen', imperial: 'Kranz aus Goldsternen', golden_titan: 'goldene Druckwellen und Goldstrahl', sovereign: 'kreisende Juwelen, Banner in Purpur und Gold', black_diamond: 'dunkler Halo mit Regenbogen-Glanzlichtern',
  midnight: 'Sternenspur', silver_arrow: 'Geschwindigkeitslinien', blue_lightning: 'kleine Blitze', deep_ocean: 'Luftblasen', polar_express: 'Schneeflocken', disco_fever: 'blinkt in allen Farben' };
