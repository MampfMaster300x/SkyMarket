// 0.21.74 Fair-Play-Wächter: erkennt, ob eine KI oder ein Skript für Spielende spielt (nicht, ob jemand eine KI um Rat fragt – das sieht kein Spiel).
// Jede eigene Aktion bringt einen kleinen Bedien-Nachweis des Spiels mit (fp). Der Server sammelt Zeiten und Auffälligkeiten je Konto,
// bewertet sie und zeigt sie den Admins. Gesperrt wird hier nie automatisch – nur offensichtliche Klickfluten werden gebremst.

export const FAIR = {
  keepT: 160,        // letzte Aktionszeiten
  keepEv: 60,        // letzte Belege
  days: 7,           // Stundenraster der letzten Tage
  noUiGap: 20000,    // so lange ohne eigene Eingabe vor einer Aktion = „ohne Bedienung“
  fastMs: 150,       // zwei Aktionen aus verschiedenen Eingaben schneller als das = übermenschlich
  rateN: 40, rateMs: 3000,   // mehr Aktionen in diesem Fenster werden abgewiesen (Klickflut)
  rhythmN: 24, rhythmCv: 0.12,   // so viele gleichmäßige Abstände (Variationskoeffizient darunter) = Maschinen-Takt
  levels: [[60, 'sehr verdächtig', 'crit'], [35, 'verdächtig', 'bad'], [15, 'beobachten', 'warn'], [0, 'unauffällig', 'ok']],
  // 0.21.78 Luftfahrtaufsicht: Stufen (Hinweis → Lizenzentzug). Fällig wird die nächste Stufe nur mit neuen Belegen seit der letzten Stufe bzw. Prüfung.
  stageScore: 35,          // ab dieser Bewertung der neuen Belege („verdächtig“)
  stageGap: 12 * 3600e3,   // frühestens so lange nach der letzten Stufe
  stageMinN: 10,           // mindestens so viele Aktionen seit der letzten Stufe
  calmDays: 30,            // so lange ohne neue Stufe und ohne neue Auffälligkeiten: eine Stufe zurück (Bewährung)
  autoMax: 2,              // Voreinstellung: bis zu dieser Stufe verhängt das Prüfsystem selbst, darüber schlägt es vor
  // 0.21.80 Spuren von KI-Agenten, die einen normalen Browser per Screenshot bedienen
  minClicks: 10,           // ab so vielen Mausklicks werden Mausweg und Klickpunkt bewertet
  teleR: 0.4,              // Anteil Klicks ohne Mausweg (Zeiger springt auf den Knopf), ab dem es auffällt
  ctrR: 0.35,              // Anteil Klicks exakt in der Knopfmitte (innerhalb 10 % des Halbmessers)
  keyCv: 0.12, keyMs: 25,  // Tippen gleichmäßiger bzw. schneller als das = Maschine
  thinkN: 25, thinkMin: 1800, thinkMed: 3000,   // so viele Abstände, nie kürzer als thinkMin, Median darüber = Screenshot-Denkpause-Klick
  originN: 20, originR: 0.6,   // Herkunft: ab so vielen Aktionen gilt das häufigste Land/die häufigste Zeitzone (Anteil) als üblich
};

const LABEL = {
  api: 'Aktionen direkt über die Schnittstelle (ohne Spieloberfläche)',
  webdriver: 'Automatisierter Browser (Webdriver)',
  headless: 'Browser ohne Bildschirm (headless)',
  script: 'Klicks per Skript statt per Finger oder Maus',
  noUi: 'Aktionen ohne vorherige Bedienung',
  hidden: 'Aktionen aus einem verborgenen Tab',
  debug: 'Debug-Werkzeug ohne Admin-Rechte',
  fast: 'Übermenschliches Tempo',
  rhythm: 'Maschinen-Takt (gleichmäßige Abstände)',
  clock: 'Dauerbetrieb rund um die Uhr',
  flood: 'Klickflut gebremst',
  teleport: 'Mauszeiger springt ohne Weg auf die Knöpfe',
  center: 'Klicks exakt in der Knopfmitte',
  synth: 'Text ohne Tastenanschläge eingefügt',
  keys: 'Tippen in maschinell gleichem Takt',
  think: 'Gleichförmige Denkpause vor jeder Aktion',
  origin: 'Aktionen aus anderem Land oder anderer Zeitzone als sonst',
};
export const FAIR_LABEL = LABEL;

const berlinParts = (t) => {
  const s = new Date(t).toLocaleString('sv-SE', { timeZone: 'Europe/Berlin', hour12: false });   // „2026-11-12 10:17:00“
  return { day: s.slice(0, 10), hour: Number(s.slice(11, 13)) };
};

export function fairNew(key, name, now) {
  return { key, name, first: now, last: now, n: 0, t: [], g: {}, sig: {}, hours: {}, ev: [], review: null, warn: null, lastG: null, stage: 0 };
}

const topOf = (m) => { const e = Object.entries(m || {}), tot = e.reduce((a, [, n]) => a + n, 0); if (!e.length) return null; const [k, n] = e.sort((a, b) => b[1] - a[1])[0]; return { k, n, tot, r: n / tot }; };
const countIn = (m, k, max = 12) => { if (!k) return; m[k] = (m[k] || 0) + 1; const e = Object.entries(m); if (e.length > max) { e.sort((a, b) => a[1] - b[1]); delete m[e[0][0]]; } };
/** Eine Aktion einordnen. Gibt { rec, tooFast, hit } zurück; rec wird verändert. geo = Ländercode der Verbindung (vom Hosting, keine IP). */
export function fairRecord(rec, { now, game, fp, admin = false, type = '', geo = null }) {
  rec.last = now; rec.n = (rec.n || 0) + 1; rec.g[game] = (rec.g[game] || 0) + 1;
  const sig = rec.sig, hit = [];
  const bump = (k, detail) => { sig[k] = (sig[k] || 0) + 1; hit.push(k); if (detail !== false) { rec.ev.push({ t: now, k, game, type: String(type).slice(0, 40), d: detail || null }); if (rec.ev.length > FAIR.keepEv) rec.ev.splice(0, rec.ev.length - FAIR.keepEv); } };
  // Klickflut: zu viele Aktionen im kurzen Fenster → abweisen (zählt nicht als Aktion im Zeitraster)
  const recent = rec.t.filter((x) => now - x < FAIR.rateMs).length;
  if (recent >= FAIR.rateN) { if (!rec.floodAt || now - rec.floodAt > 60000) bump('flood', `${recent} Aktionen in ${FAIR.rateMs / 1000} s`); rec.floodAt = now; rec.n--; rec.g[game]--; return { rec, tooFast: true, hit }; }
  const prev = rec.t.length ? rec.t[rec.t.length - 1] : null;
  rec.t.push(now); if (rec.t.length > FAIR.keepT) rec.t.splice(0, rec.t.length - FAIR.keepT);
  sig.total = (sig.total || 0) + 1;
  const { day, hour } = berlinParts(now);
  const h = rec.hours[day] || (rec.hours[day] = Array(24).fill(0)); h[hour]++;
  const days = Object.keys(rec.hours).sort(); while (days.length > FAIR.days) delete rec.hours[days.shift()];
  if (!fp || typeof fp !== 'object') { bump('api', 'kein Bedien-Nachweis des Spiels'); return { rec, tooFast: false, hit }; }
  if (fp.wd) bump('webdriver', 'navigator.webdriver');
  if (fp.hl) bump('headless', 'Headless-Browser');
  if (Number(fp.ut) > 0) bump('script', `${Number(fp.ut)} Skript-Klick(s)`);
  if (fp.dbg && !admin) bump('debug', 'Debug-Modus aktiv');
  const gap = Number(fp.gap);
  if (fp.vis === 0) bump('hidden', 'Tab nicht sichtbar');
  else if (!(gap >= 0) || gap > FAIR.noUiGap) bump('noUi', gap >= 0 ? `letzte Eingabe vor ${Math.round(gap / 1000)} s` : 'noch keine Eingabe', false);
  // Tempo: zwei Aktionen aus verschiedenen Eingaben (Gesten) in kürzester Zeit
  const g = Number.isFinite(Number(fp.g)) ? Number(fp.g) : null;
  if (prev != null && now - prev < FAIR.fastMs && g != null && rec.lastG != null && g !== rec.lastG) bump('fast', `${now - prev} ms zwischen zwei Eingaben`);
  rec.lastG = g;
  // 0.21.80 Agenten-Spuren: Zähler je Konto (Belege höchstens einmal pro Stunde je Art, damit sie andere nicht verdrängen)
  const once = (k, d) => { const last = [...rec.ev].reverse().find((e) => e.k === k); if (!last || now - last.t > 3600e3) { rec.ev.push({ t: now, k, game, type: String(type).slice(0, 40), d }); if (rec.ev.length > FAIR.keepEv) rec.ev.splice(0, rec.ev.length - FAIR.keepEv); } hit.push(k); };
  const num = (x, max) => Math.max(0, Math.min(max, Math.round(Number(x) || 0)));
  const mc = num(fp.mc, 50), tp = Math.min(mc, num(fp.tp, 50)), ck = num(fp.ck, 50), cc = Math.min(ck, num(fp.cc, 50)), ti = num(fp.ti, 50), kn = num(fp.kn, 200);
  if (mc) { sig.mclk = (sig.mclk || 0) + mc; if (tp) { sig.tele = (sig.tele || 0) + tp; once('teleport', `${tp} von ${mc} Klicks ohne Mausweg`); } }
  if (ck) { sig.cclk = (sig.cclk || 0) + ck; if (cc) { sig.ctr = (sig.ctr || 0) + cc; if (cc / ck >= 0.5) once('center', `${cc} von ${ck} Klicks exakt mittig`); } }
  if (ti) { sig.synth = (sig.synth || 0) + ti; once('synth', `${ti}× Text ohne Tastenanschlag`); }
  if (kn >= 6 && (Number(fp.kv) < FAIR.keyCv || Number(fp.km) < FAIR.keyMs)) { sig.keys = (sig.keys || 0) + 1; once('keys', `${kn} Anschläge, ${Number(fp.km) || 0} ms ± ${Math.round((Number(fp.kv) || 0) * 100)} %`); }
  // Herkunft: Land der Verbindung, Zeitzone und Gerät des Browsers
  rec.geo = rec.geo || {}; rec.tz = rec.tz || {}; rec.dev = rec.dev || {};
  const tz = typeof fp.tz === 'string' ? fp.tz.slice(0, 40) : '', dv = typeof fp.dv === 'string' ? fp.dv.slice(0, 60) : '', cc2 = typeof geo === 'string' && /^[A-Z]{2}$/.test(geo) ? geo : '';
  const usual = (m) => { const t = topOf(m); return t && t.tot >= FAIR.originN && t.r >= FAIR.originR ? t.k : null; };
  const uG = usual(rec.geo), uT = usual(rec.tz), off = [];
  if (cc2 && uG && cc2 !== uG) off.push(`${cc2} statt ${uG}`); if (tz && uT && tz !== uT) off.push(`${tz} statt ${uT}`);
  if (off.length) { sig.origin = (sig.origin || 0) + 1; once('origin', off.join(', ')); }
  countIn(rec.geo, cc2); countIn(rec.tz, tz); countIn(rec.dev, dv);
  return { rec, tooFast: false, hit };
}

/** Gleichmäßigkeit der letzten Abstände (nur Abstände unter einer Minute, also innerhalb einer Sitzung). */
export function fairRhythm(t) {
  const iv = []; for (let i = 1; i < t.length; i++) { const d = t[i] - t[i - 1]; if (d > 0 && d < 60000) iv.push(d); }
  const last = iv.slice(-40); if (last.length < FAIR.rhythmN) return null;
  const m = last.reduce((a, b) => a + b, 0) / last.length, sd = Math.sqrt(last.reduce((a, b) => a + (b - m) ** 2, 0) / last.length);
  return { n: last.length, mean: m, cv: m > 0 ? sd / m : 0 };
}

/** 0.21.80: Denkpausen-Muster – ein Agent braucht für jeden Schritt Screenshot und Antwort: nie schnelle Folgeaktionen, immer einige Sekunden. */
export function fairThink(t) {
  const iv = []; for (let i = 1; i < t.length; i++) { const d = t[i] - t[i - 1]; if (d > 0 && d < 90000) iv.push(d); }
  const last = iv.slice(-30); if (last.length < FAIR.thinkN) return null;
  const sorted = last.slice().sort((a, b) => a - b), min = sorted[0], med = sorted[Math.floor(sorted.length / 2)];
  return { n: last.length, min, med, hit: min >= FAIR.thinkMin && med >= FAIR.thinkMed };
}
/** Aktive Stunden je Tag (mindestens eine Aktion in der Stunde). */
export function fairClock(hours) {
  const per = Object.entries(hours).map(([d, h]) => ({ d, n: h.filter((x) => x > 0).length }));
  const max = per.reduce((a, b) => Math.max(a, b.n), 0), long = per.filter((x) => x.n >= 14).length;
  return { max, long, per };
}

/** Bewertung 0–100 mit Begründung. */
export function fairScore(rec) {
  const s = rec.sig || {}, tot = Math.max(1, s.total || 0), R = [];
  const add = (k, w, n, why) => { if (w > 0) R.push({ k, label: LABEL[k], n, w: Math.round(w), why }); };
  if (s.webdriver) add('webdriver', 45, s.webdriver, 'Browser meldet Fernsteuerung');
  if (s.headless) add('headless', 40, s.headless, 'Browser ohne Bildschirm');
  if (s.api >= 3) add('api', Math.min(70, 45 + s.api), s.api, `${s.api} Aktionen ohne Spieloberfläche – wird abgewiesen`);   // 0.21.84: eindeutig, unabhängig vom Anteil (verdünnt sich nicht mehr)
  if (s.script) add('script', Math.min(30, 8 + s.script * 4), s.script, 'per Programm ausgelöste Klicks');
  if (s.debug) add('debug', Math.min(30, 15 + s.debug), s.debug, 'Entwicklerwerkzeug benutzt');
  if (s.noUi && tot >= 10) { const r = s.noUi / tot; if (r >= 0.3) add('noUi', r * 30, s.noUi, `${Math.round(r * 100)} % der Aktionen`); }
  if (s.hidden >= 5) add('hidden', Math.min(20, s.hidden * 2), s.hidden, 'Spiel lief verborgen weiter');
  if (s.fast) add('fast', Math.min(25, s.fast * 3), s.fast, `schneller als ${FAIR.fastMs} ms`);
  const rh = fairRhythm(rec.t || []); if (rh && rh.cv < FAIR.rhythmCv) add('rhythm', 25, rh.n, `Abstände ${Math.round(rh.mean)} ms ± ${Math.round(rh.cv * 100)} %`);
  const ck = fairClock(rec.hours || {}); if (ck.max >= 18 || ck.long >= 3) add('clock', 20, ck.max, ck.max >= 18 ? `${ck.max} von 24 Stunden an einem Tag aktiv` : `${ck.long} Tage mit 14+ aktiven Stunden`);
  if (s.flood) add('flood', Math.min(20, s.flood * 5), s.flood, 'zu viele Aktionen in kurzer Zeit');
  // 0.21.80 Agenten-Spuren
  if ((s.mclk || 0) >= FAIR.minClicks) { const r = (s.tele || 0) / s.mclk; if (r >= FAIR.teleR) add('teleport', Math.min(45, r * 50), s.tele, `${Math.round(r * 100)} % von ${s.mclk} Mausklicks`); }
  if ((s.cclk || 0) >= FAIR.minClicks) { const r = (s.ctr || 0) / s.cclk; if (r >= FAIR.ctrR) add('center', Math.min(30, r * 40), s.ctr, `${Math.round(r * 100)} % von ${s.cclk} Klicks`); }
  if ((s.synth || 0) >= 3) add('synth', Math.min(25, 8 + s.synth * 3), s.synth, 'Eingabe per Programm statt Tastatur');
  if ((s.keys || 0) >= 2) add('keys', Math.min(20, 8 + s.keys * 4), s.keys, 'Abstände zwischen Tasten wie gestanzt');
  const th = fairThink(rec.t || []); if (th && th.hit) add('think', 15, th.n, `nie unter ${Math.round(th.min / 100) / 10} s, meist ${Math.round(th.med / 1000)} s`);
  if ((s.origin || 0) >= 5) add('origin', Math.min(25, 8 + s.origin), s.origin, 'Land oder Zeitzone weicht vom Üblichen ab');
  const score = Math.min(100, R.reduce((a, b) => a + b.w, 0));
  const [, label, tone] = FAIR.levels.find(([min]) => score >= min);
  return { score, level: label, tone, reasons: R.sort((a, b) => b.w - a.w), rhythm: rh, clock: ck, think: th };
}

/** 0.21.78: Nur die Belege seit der letzten Stufe oder Prüfung (Ausgangspunkt base = { at, sig, n }). */
export function fairDelta(rec) {
  const b = rec.base || { at: 0, sig: {}, n: 0 }, sig = {};
  for (const [k, v] of Object.entries(rec.sig || {})) { const d = v - ((b.sig || {})[k] || 0); if (d > 0) sig[k] = d; }
  const day0 = b.at ? berlinParts(b.at).day : '', hours = {};
  for (const [d, h] of Object.entries(rec.hours || {})) if (d > day0) hours[d] = h;
  return { sig, t: (rec.t || []).filter((x) => x > (b.at || 0)), hours, n: (rec.n || 0) - (b.n || 0) };
}
/** Neuer Ausgangspunkt (nach einer Stufe oder „unbedenklich“): ältere Belege zählen für die nächste Stufe nicht mehr. */
export function fairRebase(rec, now) { rec.base = { at: now, sig: { ...(rec.sig || {}) }, n: rec.n || 0 }; }
/** Ist die nächste Stufe fällig? → { n, score, auto, reasons } oder null. */
export function fairDue(rec, now, autoMax = FAIR.autoMax) {
  const st = rec.stage || 0; if (st >= 5) return null;
  if (rec.stageAt && now - rec.stageAt < FAIR.stageGap) return null;
  const d = fairDelta(rec); if (d.n < FAIR.stageMinN) return null;
  const sc = fairScore(d); if (sc.score < FAIR.stageScore) return null;
  if (rec.review && !(rec.base && rec.base.at >= rec.review.at) && fairScore(rec).score < (rec.review.score || 0) + 10) return null;   // vor 0.21.78 als unbedenklich geprüft
  return { n: st + 1, score: sc.score, auto: st + 1 <= autoMax, reasons: sc.reasons };
}
/** Bewährung: Nach calmDays ohne neue Stufe und ohne neue Auffälligkeiten sinkt die Stufe um eins. Gibt true zurück, wenn sich etwas geändert hat. */
export function fairCalm(rec, now) {
  const st = rec.stage || 0, gap = FAIR.calmDays * 864e5; if (!st) return false;
  if (now - (rec.stageAt || 0) < gap || now - (rec.calmAt || 0) < gap) return false;
  if (fairScore(fairDelta(rec)).score >= 15) return false;
  rec.stage = st - 1; rec.calmAt = now;
  rec.sanctions = [...(rec.sanctions || []), { at: now, by: 'Prüfsystem', kind: 'calm', n: st - 1, msg: `Bewährung: Stufe ${st} → ${st - 1}` }].slice(-40);
  return true;
}
