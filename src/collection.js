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
  n.slice(-3).forEach((x, i) => setTimeout(() => toast(x.msg), i * 1600));
  coll.me.notes = [];
  api('/coll/notes/read', { body: { ids } }).catch(() => {});
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
const freeCopies = (id) => { const m = coll.me; if (!m) return 0; const act = Object.values(m.active).filter((x) => x === id).length; return (m.inv[id] || 0) - act - ((m.reserved || {})[id] || 0); };

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
    case 'pulse': { let d = `M${f(x0 + h)},${f(cy)}`; for (let x = x0 + h; x < xe - L * 0.1; x += 18) d += ` L${f(x + 6)},${f(cy)} L${f(x + 8)},${f(cy - h * 0.35)} L${f(x + 11)},${f(cy + h * 0.3)} L${f(x + 13)},${f(cy)}`; over = belly(cy + h * 0.3) + `<path d="${d}" stroke="${p.stripe}" stroke-width="1.1" fill="none"${glow}/>`; break; }
    case 'aurora': over = `<g${glow} opacity=".75">${[0, 1, 2].map((i) => `<path d="M${f(x0)},${f(cy + h * (0.1 - i * 0.12))} C${f(x0 + L * 0.3)},${f(cy - h * (0.5 - i * 0.1))} ${f(x0 + L * 0.6)},${f(cy + h * 0.4)} ${f(xe)},${f(cy - h * (0.2 + i * 0.1))}" stroke="${i === 1 ? p.accent : p.stripe}" stroke-width="${2.6 - i * 0.6}" fill="none"/>`).join('')}</g>`; break;
    case 'nebula': defs += `<radialGradient id="${id}n"><stop offset="0" stop-color="${p.tail}" stop-opacity=".8"/><stop offset="1" stop-color="${p.tail}" stop-opacity="0"/></radialGradient><radialGradient id="${id}m"><stop offset="0" stop-color="${p.tail2}" stop-opacity=".8"/><stop offset="1" stop-color="${p.tail2}" stop-opacity="0"/></radialGradient>`;
      over = `<ellipse cx="${f(x0 + L * 0.3)}" cy="${f(cy)}" rx="${f(L * 0.16)}" ry="${f(h)}" fill="url(#${id}n)"/><ellipse cx="${f(x0 + L * 0.62)}" cy="${f(cy + 2)}" rx="${f(L * 0.18)}" ry="${f(h)}" fill="url(#${id}m)"/><ellipse cx="${f(x0 + L * 0.5)}" cy="${f(cy)}" rx="${f(L * 0.08)}" ry="${f(h * 0.2)}" fill="none" stroke="${p.stripe}" stroke-width=".9"${glow}/>`;
      for (let i = 0; i < 18; i++) over += `<circle cx="${f(x0 + rnd() * L)}" cy="${f(top + rnd() * h)}" r=".4" fill="#fff"/>`; break;
    case 'storm': over = belly(cy + h * 0.3) + `<g${glow}>${bolt(x0 + L * 0.25, top + 1, 1.2, p.stripe)}${bolt(x0 + L * 0.5, top + 2, 1.4, p.accent)}${bolt(x0 + L * 0.68, top + 1, 1, p.stripe)}</g>`; fin = `<g${glow}>${bolt(xe - L * 0.12, finTop + 3, 1.1, p.accent)}</g>`; break;
    case 'phoenix': over = belly(cy + h * 0.3) + `<path d="M${f(x0 + L * 0.15)},${f(cy + h * 0.2)} C${f(x0 + L * 0.35)},${f(cy - h * 0.6)} ${f(x0 + L * 0.55)},${f(cy - h * 0.2)} ${f(xe - L * 0.18)},${f(cy - h * 0.45)} C${f(x0 + L * 0.6)},${f(cy + h * 0.05)} ${f(x0 + L * 0.4)},${f(cy + h * 0.1)} ${f(x0 + L * 0.15)},${f(cy + h * 0.2)}Z" fill="${p.stripe}"${glow}/>`;
      for (let i = 0; i < 5; i++) fin += `<path d="M${f(xe - L * 0.15 + i * L * 0.02)},${f(top)} Q${f(xe - L * 0.1 + i * L * 0.015)},${f(top - 10 - i * 2)} ${f(xe - L * 0.05 + i * L * 0.008)},${f(finTop + 2 + i)}" stroke="${i % 2 ? p.tail2 : p.accent}" stroke-width="1.4" fill="none"/>`; break;
    case 'emperor': over = belly(cy + h * 0.25) + line(cy + h * 0.2, p.accent, 0.8); finFill = p.tail; fin = `<g${glow}><circle cx="${f(xe - L * 0.075)}" cy="${f(top - 10)}" r="4.5" fill="none" stroke="${p.tail2}" stroke-width="1.2"/><path d="M${f(xe - L * 0.09)},${f(top - 10)} l1.5,-3 l1.5,2 l1.5,-3 l1.5,3 l1.5,-2 l1.5,3 Z" fill="${p.tail2}"/></g>`; break;
    case 'imperial': body = p.body; over = belly(cy + h * 0.3) + line(cy + h * 0.12, p.stripe, 1) + line(cy + h * 0.22, p.stripe, 0.6); finFill = p.tail; fin = `<g${glow}><path d="M${f(xe - L * 0.095)},${f(top - 7)} l1.6,-4 l1.6,2.6 l1.6,-4 l1.6,4 l1.6,-2.6 l1.6,4 Z" fill="${p.tail2}"/></g>`; break;
    case 'titan': over = belly(cy + h * 0.3) + Array.from({ length: 6 }, (_, i) => `<rect x="${f(x0 + L * (0.15 + i * 0.11))}" y="${f(cy - h * 0.38)}" width="${f(L * 0.09)}" height="${f(h * 0.12)}" fill="${p.stripe}" opacity=".55"/>`).join('') + `<rect x="${f(x0)}" y="${f(top + 1)}" width="${f(L)}" height="${f(h * 0.12)}" fill="#fff" opacity=".3"/>`; break;
    case 'sovereign': over = belly(cy + h * 0.3) + line(cy - h * 0.25, p.stripe, 0.5) + line(cy + h * 0.15, p.stripe, 0.7) + line(cy + h * 0.21, p.stripe, 0.4); fin = `<g${glow}><path d="M${f(xe - L * 0.095)},${f(top - 8)} l1.6,-4 l1.6,2.6 l1.6,-4 l1.6,4 l1.6,-2.6 l1.6,4 Z" fill="${p.stripe}"/></g>`; finFill = `url(#${id}g)`; break;
    case 'diamond': over = belly(cy + h * 0.3) + `<g${glow}>` + Array.from({ length: 7 }, (_, i) => { const x = x0 + L * (0.2 + i * 0.085), y = cy - h * 0.05; return `<path d="M${f(x)},${f(y - 3.5)} l3,3.5 l-3,3.5 l-3,-3.5Z" fill="none" stroke="${p.stripe}" stroke-width=".7"/>`; }).join('') + '</g>'; fin = `<g${glow}><path d="M${f(xe - L * 0.075)},${f(top - 14)} l4,5 l-4,5 l-4,-5Z" fill="${p.stripe}"/></g>`; break;
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
      over = `<path d="${tongue(cy + h * 0.32, h * 0.75, 11, 0)}" fill="url(#${id}x)"${glow}/><path d="${tongue(cy + h * 0.4, h * 0.42, 8, 1.3)}" fill="${p.accent}" opacity=".75"/>`;
      fin = `<path d="${tongue(top + 2, 14, 5, 0.6).replace(/^M[^L]*L/, `M${f(xe - L * 0.2)},${f(top + 4)} L`)}" fill="url(#${id}x)" opacity=".9"/>`; break; }
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
      over += `<path d="${cr}" fill="none" stroke="${p.stripe}" stroke-width="1.3" stroke-linejoin="round"${glow}/><path d="${cr}" fill="none" stroke="${p.accent}" stroke-width=".45"/>`;
      fin = `<path d="M${f(xe - L * 0.14)},${f(top)} L${f(xe - L * 0.1)},${f(top - 8)} L${f(xe - L * 0.07)},${f(top - 5)} L${f(xe - L * 0.05)},${f(finTop + 4)}" fill="none" stroke="${p.stripe}" stroke-width="1.2"${glow}/>`; break; }
    default: over = belly();
  }
  if (s.gold) over += `<rect x="${f(x0)}" y="${f(top - 2)}" width="${f(L)}" height="${f(h + 4)}" fill="url(#${id}s)" class="sk-shine"/>`;
  const style = `--fus:${p.body};--fus-line:${p.line};--glass:${p.glass};--eng:${p.eng}`;
  return { defs: `<defs>${defs}</defs>`, style, body, fin: finFill, stripe: p.stripe, over: `<g clip-path="url(#${id}f)">${over}</g>`, finOver: fin ? `<g clip-path="url(#${id}t)">${fin}</g>` : '' };
}
const SIL = { defs: '', style: '--fus:#16213a;--fus-line:#22304f;--glass:#16213a;--eng:#16213a;--gear:#22304f', body: 'var(--fus)', fin: '#22304f', stripe: 'transparent', over: '', finOver: '' };
/** SVG-Text eines Skins als Bild-URL (für Karten in der Sammlung: ein Element statt vieler). Echte Artworks aus public/skins/ haben Vorrang. */
const skinUrlCache = new Map();
function skinArt(s, sil = false) {
  if (!sil && coll.art && coll.art.has(s.id)) return s.artworkPath;
  const k = s.id + (sil ? ':s' : ''); let u = skinUrlCache.get(k);
  if (!u) {
    // als eigenständiges SVG-Bild: Namensraum ergänzen, Farbvariablen fest eintragen (nur ein style-Attribut – sonst ist das XML ungültig)
    const base = '--gear:#5b6577;--ink-2:#8a94a6;--ink-3:#a3acbb;--accent:#64748b;--fus:#f4f6f9;--fus-line:#9aa5b5;--glass:#1d2a3d;';
    let svg = acSvg(s.type, sil ? { sil: true } : { skin: s });
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
    <button class="btn primary ac-open" data-act="accopen" ${m.packs.length ? '' : 'disabled'}>${m.packs.length ? `Pack öffnen <b>${n0(m.packs.length)}</b>` : 'Keine ungeöffneten Packs'}</button></div>
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
  html += `<p class="small muted">Alle Skins sind rein kosmetisch: Sie ändern weder Reichweite noch Kosten, Einnahmen oder sonst etwas am Spiel. Ein Exemplar kann auf einem Flugzeug des passenden Modells aktiv sein; Duplikate lassen sich auf weiteren Flugzeugen zeigen oder tauschen.</p></div>`;
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
    <div class="small muted">Im Besitz: ${n} · frei: ${Math.max(0, free)}${(m.reserved || {})[s.id] ? ` · im Tauschangebot: ${m.reserved[s.id]}` : ''} · Karteneffekt: ${({ paint: 'neue Lackierung', sheen: 'blauer Glanz', glow: 'pinkes Leuchten mit Partikeln', fire: 'rotes Glühen mit Funken', disco: 'blinkt in allen Farben', gold: 'goldener Ring, goldene Route' })[s.mapEffect]}</div>
    ${here.length ? `<div class="stack" style="gap:6px"><b class="small">Aktiv auf</b>${here.map(([, ac]) => `<div class="spread small"><span class="mono">${esc(acName(ac))}</span><button class="btn small" data-sd="off" data-ac="${esc(ac)}">Standardlackierung</button></div>`).join('')}</div>` : ''}
    ${acts.length > here.length ? `<p class="small muted">Außerdem aktiv in ${acts.length - here.length} Flugzeug(en) anderer Spiele.</p>` : ''}
    ${n && free > 0 && fits.length ? `<div class="stack" style="gap:6px"><b class="small">Auf Flugzeug aktivieren</b><div class="row" style="gap:6px;flex-wrap:wrap">${fits.map((a) => { const cur = skinFor(pl, a.id); return `<button class="btn small" data-sd="on" data-ac="${a.id}" ${cur && cur.id === s.id ? 'disabled' : ''}>${esc(acName(a.id))}${cur ? ` <span class="small muted">(${esc(cur.name)})</span>` : ''}</button>`; }).join('')}</div></div>`
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
      ${list.map((s) => { const free = freeCopies(s.id), on = cur && cur.id === s.id; return `<button class="ac-card rar-${s.rarity}" data-sp="on" data-id="${s.id}" ${on || free < 1 ? 'disabled' : ''}><span class="ac-art"><img src="${skinArt(s)}" alt=""></span><span class="ac-name">${esc(s.name)}</span><span class="ac-meta">${rarChip(s.rarity)}${on ? '<span class="chip good">aktiv</span>' : free < 1 ? '<span class="chip">kein Exemplar frei</span>' : `<span class="chip">${free} frei</span>`}</span></button>`; }).join('')}</div>
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
const packSvg = () => `<svg viewBox="0 0 220 300" class="pk-svg" aria-hidden="true"><defs><linearGradient id="pkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2b58"/><stop offset=".55" stop-color="#0f1a3c"/><stop offset="1" stop-color="#0a1230"/></linearGradient><linearGradient id="pke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".35" stop-color="#d946ef"/><stop offset=".7" stop-color="#ef4444"/><stop offset="1" stop-color="#f5b301"/></linearGradient><linearGradient id="pks" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26407c"/><stop offset="1" stop-color="#16244a"/></linearGradient></defs>
  <rect x="10" y="40" width="200" height="252" rx="16" fill="url(#pkg)" stroke="url(#pke)" stroke-width="3"/>
  <rect x="22" y="52" width="176" height="228" rx="10" fill="none" stroke="#22d3ee" stroke-opacity=".28"/>
  <text x="110" y="80" text-anchor="middle" fill="#e6f6ff" font-size="13" font-weight="800" textLength="164" lengthAdjust="spacingAndGlyphs">AIRCRAFT COLLECTION</text>
  <path d="M34 92 H186 M34 238 H186" stroke="#22d3ee" stroke-opacity=".45"/>
  <circle cx="110" cy="165" r="54" fill="#22d3ee" opacity=".08"/>
  <path transform="translate(110 165) scale(1.55) translate(-100 -126)" d="M100 96 l10 26 l34 12 v8 l-34 -4 l-4 22 l10 8 v6 l-16 -4 l-16 4 v-6 l10 -8 l-4 -22 l-34 4 v-8 l34 -12z" fill="#e6f6ff" opacity=".92"/>
  <text x="110" y="263" text-anchor="middle" fill="#a5f3fc" font-size="19" font-weight="800" letter-spacing="1.5">MYSTERY PACK</text>
  ${['#22c55e', '#3b82f6', '#d946ef', '#ef4444', '#f5b301'].map((c, i) => `<rect x="${43 + i * 28}" y="272" width="22" height="4" rx="2" fill="${c}"/>`).join('')}
  <g class="pk-strip"><path d="M10 40 V18 Q10 6 22 6 H198 Q210 6 210 18 V40 Z" fill="url(#pks)" stroke="url(#pke)" stroke-width="3"/>
    ${Array.from({ length: 21 }, (_, i) => `<path d="M${20 + i * 9} 12 V34" stroke="#ffffff" stroke-opacity=".1" stroke-width="1.6"/>`).join('')}
    <path d="M196 23 l-8 -5 v10 z" fill="#22d3ee" opacity=".8"/></g>
  <path d="M15 40 H205" stroke="#a5f3fc" stroke-width="1.4" stroke-dasharray="4 4" opacity=".7"/>
  <path class="pk-rip" d="M15 40 H205" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/></svg>`;
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
const FLIP = { u: 500, r: 800, e: 1100, m: 1400, l: 1800 };   // Kartenrückseite, bis sie sich dreht
function pkBg(n = 40) { return `<div class="pk-bg" aria-hidden="true"><div class="pk-bgrays"></div>${Array.from({ length: n }, () => `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;--s:${(1 + Math.random() * 2.5).toFixed(1)}px;--d:${(1 + Math.random() * 2.5).toFixed(2)}s;--w:${(Math.random() * 2).toFixed(2)}s"></i>`).join('')}</div><div class="pk-white" aria-hidden="true"></div>`; }
function playReveal(ov, pack) {
  const items = pack.res.map((id, i) => ({ s: SK.SKIN_BY_ID[id], fresh: pack.fresh ? pack.fresh[i] : false })).filter((x) => x.s);
  const best = items.reduce((a, x) => (RAR[x.s.rarity].order > RAR[a].order ? x.s.rarity : a), 'u');
  const T = RT[best] || 1, reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const parts = (n, multi) => Array.from({ length: n }, (_, i) => `<i style="--a:${(i * 360 / n + Math.random() * 20).toFixed(0)}deg;--d:${(120 + Math.random() * 260).toFixed(0)}px;--t:${(0.9 + Math.random() * 1.1).toFixed(2)}s${multi ? `;background:${DISCO[i % DISCO.length]};box-shadow:0 0 10px ${DISCO[i % DISCO.length]}` : ''}"></i>`).join('');
  const nParts = { u: 24, r: 40, e: 56, m: 72, l: 96 };
  ov.innerHTML = `${pkBg()}<button class="btn small pk-skip" data-pk="skip">Überspringen ›</button><div class="pk-stage">
    <div class="pk-box" role="button" tabindex="0" aria-label="Pack aufreißen">${packSvg()}<span class="pk-lines"></span><span class="pk-seam"></span></div><div class="pk-halo"></div><div class="pk-beam"></div><div class="pk-beam b2"></div><div class="pk-flash"></div>
    <div class="pk-wave"></div><div class="pk-wave w2"></div><div class="pk-wave w3"></div><div class="pk-parts">${parts(nParts[best], best === 'l')}</div><div class="pk-rays"></div>
    <div class="pk-hint"><b>Oben aufreißen</b><span class="pk-swipe"></span><span>Lasche zur Seite ziehen – oder antippen</span></div>
    <p class="pk-cap">${items.length > 1 ? `${items.length} Skins in diesem Pack` : 'Aircraft Mystery Pack'}</p></div>`;
  // Ablauf: Pack erscheint und leuchtet → Spieler reißt die Lasche ab (oder tippt) → Pack lädt sich auf (Beben, Licht aus der Naht, Aufheulen)
  // → Farben flackern → Lichtsäulen in der Seltenheitsfarbe → Explosion (Blitz über den ganzen Bildschirm, Druckwellen, Funken, Knall) → Karte verdeckt → dreht sich mit Fanfare
  const st = ov.querySelector('.pk-stage'), box = st.querySelector('.pk-box');
  const seq = [[0, 'charge'], [900 * T, 'tease'], [1700 * T, 'beam'], [2500 * T, 'open']];
  let i = 0, idx = 0, done = false, torn = false, drag = null;
  const tick = () => {
    if (done) return;
    if (i < seq.length) { const k = seq[i][1]; st.classList.add(k);
      if (k === 'charge') pkRiser(2.5 * T);
      if (k === 'beam') { st.classList.add('rc-' + best); ov.classList.add('rc-' + best); }
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
    done = true; clearTimeout(ov._t); clearTimeout(ov._f); idx = k;
    const x = items[k], s = x.s, last = k === items.length - 1, rk = s.rarity, fd = quick || reduce ? 0 : FLIP[rk];
    ov.className = 'pk-ov rc-' + rk;
    ov.innerHTML = `${pkBg()}${items.length > 1 && !last ? '<button class="btn small pk-skip" data-pk="all">Alle zeigen ›</button>' : ''}<div class="pk-stage reveal rc-${rk}${s.blink ? ' disco' : ''}" style="--fd:${fd}ms">
      <div class="pk-flash"></div><div class="pk-wave"></div><div class="pk-wave w2"></div><div class="pk-wave w3"></div><div class="pk-parts">${parts(nParts[rk], rk === 'l' || s.blink)}</div><div class="pk-rays"></div>
      <div class="pk-flip"><div class="pk-inner">
        <div class="pk-face pk-back rar-${rk}"><span class="pk-q">?</span><span class="pk-backt">AIRCRAFT COLLECTION</span></div>
        <div class="pk-face pk-front"><div class="pk-card rar-${rk}"><span class="pk-rar">${RAR[rk].label}${x.fresh ? ' · NEU' : ''}</span><img src="${skinArt(s)}" alt="${esc(s.name)}"><h2>${esc(s.name)}</h2><span class="pk-model">${esc(modelOf(s).name)}</span><p>${esc(s.desc)}</p>
          <span class="small">${items.length > 1 ? `Skin ${k + 1} von ${items.length}` : ''}</span></div></div></div></div>
      <div class="row pk-btns">${last ? `<button class="btn" data-pk="more">Zusammenfassung</button>` : `<button class="btn primary" data-pk="more">Nächster Skin</button>`}</div></div>`;
    const st2 = ov.querySelector('.pk-stage');
    const flip = () => { st2.classList.add('flipped', 'burst'); ov.classList.add('boom'); pkFanfare(rk); if (rk === 'm' || rk === 'l') ov.classList.add('quake'); setTimeout(() => ov.classList.remove('quake', 'boom'), 900); };
    ov.classList.remove('quake', 'boom');
    if (fd) { st2.classList.add('tease'); ov._f = setTimeout(flip, fd); } else flip();
    st2.querySelector('.pk-flip').onclick = () => { if (!st2.classList.contains('flipped')) { clearTimeout(ov._f); flip(); } };
  };
  const summary = () => {
    clearTimeout(ov._f); const left = coll.me ? coll.me.packs.length : 0;
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
  const icons = (n) => `<div class="sh-icons">${Array.from({ length: n }, () => '<i></i>').join('')}</div>`;
  let html = `<div class="ac-wrap sh-dark"><div class="sh-hero"><div class="sh-pack">${packSvg()}</div><div class="stack"><span class="ac-kicker">AIRCRAFT COLLECTION</span><h2>Aircraft Mystery Pack</h2>
    <p>Jedes Pack enthält 1 bis 3 zufällige Flugzeug-Skins aus ${SK.TOTAL} Lackierungen für ${SK.MODELS.length} Modelle. Rein kosmetisch – ohne Einfluss auf das Spiel.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><span class="chip">${n0(m.packs.length)} ungeöffnete Packs</span>${m.packs.length ? '<button class="btn primary small" data-act="accopen">Pack öffnen</button>' : ''}</div></div></div>`;
  if (!en) html += `<div class="callout warn"><b>Anfragen sind noch nicht freigeschaltet.</b><span class="small">${coll.admin ? 'Freischalten im Menü oben rechts → Aircraft Pack Management. Kostenlose Packs können Sie schon jetzt vergeben.' : 'Packs gibt es bis dahin über Aktionen der Spielleitung und im Tausch.'}</span></div>`;
  const q = ui.shQty = Math.max(1, Math.min(50, ui.shQty || 1));
  html += `<div class="sh-offers">${S.offers.map((o) => o.perPack
    ? `<div class="sh-offer ${o.key}"><span class="chip">frei wählbar</span><h3>${esc(o.label.toUpperCase())}</h3>${icons(Math.min(q, 10))}
      <div class="sh-qty"><button class="btn small" data-act="shqty" data-v="-1" ${q <= 1 ? 'disabled' : ''} aria-label="Ein Pack weniger">−</button><b class="sh-n">${q} ${q === 1 ? 'PACK' : 'PACKS'}</b><button class="btn small" data-act="shqty" data-v="1" ${q >= (o.max || 50) ? 'disabled' : ''} aria-label="Ein Pack mehr">+</button></div>
      <span class="sh-price">${tokS(q * Number(o.price))}</span><span class="small">${String(o.price).replace('.', ',')} Token pro Pack</span>
      <button class="btn primary" data-act="shbuy" data-v="${o.key}" ${en ? '' : 'disabled'}>${q} ${q === 1 ? 'Pack' : 'Packs'} anfragen</button></div>`
    : `<div class="sh-offer ${o.key}"><span class="chip">Paket</span><h3>${esc(o.label.toUpperCase())}</h3>${icons(o.packs)}<b class="sh-n">${o.packs} PACKS</b>
      <span class="sh-price">${tokS(o.price)}</span><span class="small">${String(Number(o.price) / o.packs).replace('.', ',')} Token pro Pack</span>
      <button class="btn ${o.key === 'collector' ? 'gold' : 'primary'}" data-act="shbuy" data-v="${o.key}" ${en ? '' : 'disabled'}>${o.packs} Packs anfragen</button></div>`).join('')}</div>
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
    case 'shqty': ui.shQty = Math.max(1, Math.min(50, (ui.shQty || 1) + Number(b.dataset.v))); renderPane(true); return true;
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
function skinMapStyle(s) { return s ? { fill: s.rarity === 'l' ? '#f5b301' : s.pal.tail, edge: s.rarity === 'l' ? '#5a3d00' : s.pal.line, fx: s.blink ? 'disco' : s.rarity, glow: s.rarity === 'r' ? '#60a5fa' : s.rarity === 'e' ? (s.pal.accent || '#d946ef') : s.rarity === 'm' ? '#ef4444' : null } : null; }
const DISCO = ['#ff2bd6', '#22e5ff', '#ffe14d', '#7cff4f', '#ff7a1a'];
/** Disco Fever: Farbe wechselt im Takt (auf der Karte und in Listen). */
const discoColor = (now) => DISCO[Math.floor(now / 260) % DISCO.length];
function drawSkinFx(ctx, p, k, now) {
  const st = p.sk; if (!st) return;
  if (st.fx === 'e' && k >= 1) {   // violette Partikel hinter dem Flugzeug (nur nah genug herangezoomt)
    ctx.fillStyle = st.glow;
    for (let i = 1; i <= 3; i++) { const ph = ((now / 600) + i * 0.33) % 1; ctx.globalAlpha = 0.5 * (1 - ph); ctx.beginPath(); ctx.arc(-9 - i * 4 - ph * 4, Math.sin(now / 300 + i) * 1.5, 1.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  if ((st.fx === 'm' || st.fx === 'disco') && k >= 0.9) {   // Funken (rot) bzw. bunte Lichtpunkte (Disco) hinter dem Flugzeug
    for (let i = 1; i <= 4; i++) { const ph = ((now / 520) + i * 0.25) % 1; ctx.fillStyle = st.fx === 'disco' ? DISCO[(i + Math.floor(now / 260)) % DISCO.length] : (i % 2 ? '#ef4444' : '#ffb21f'); ctx.globalAlpha = 0.7 * (1 - ph); ctx.beginPath(); ctx.arc(-9 - i * 3.5 - ph * 5, Math.sin(now / 240 + i * 2) * 2, 1.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  if (st.fx === 'l') {   // pulsierender goldener Ring
    const r = 12 + (k >= 0.9 ? Math.sin(now / 350) * 1.6 : 0);
    ctx.strokeStyle = '#f5b301'; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.2 / p.sc; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#f5b301'; ctx.fill(); ctx.globalAlpha = 1;
  }
}
