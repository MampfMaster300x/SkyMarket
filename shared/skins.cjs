/*
 * AIRCRAFT COLLECTION – Katalog der Flugzeug-Skins (rein kosmetisch).
 * 28 Modelle × 15 Skins = 420 Skins in fünf Seltenheitsstufen (5 grün, 4 blau, 3 pink, 2 rot, 1 gold je Modell).
 * 0.21.55: Stufe Rot (zwischen Pink und Gold) neu; je Modell ist einer der beiden roten Skins „Disco Fever“ (blinkt).
 * Alle Skin-IDs aus 0.21.52–0.21.54 bleiben unverändert gültig.
 * Wird vom Server (Ziehung, Inventar, Handel) und vom Browser (Darstellung) gemeinsam genutzt.
 * Die Ziehung bekommt den Zufall von außen (Server: crypto.randomInt), damit hier kein Math.random für produktive Ziehungen steckt.
 */
(function () {
  'use strict';
  const RARITIES = {
    u: { key: 'u', label: 'Ungewöhnlich', color: '#22c55e', colorName: 'Grün', order: 0, perModel: 5, odds: 55 },
    r: { key: 'r', label: 'Selten', color: '#3b82f6', colorName: 'Blau', order: 1, perModel: 4, odds: 27 },
    e: { key: 'e', label: 'Episch', color: '#d946ef', colorName: 'Pink', order: 2, perModel: 3, odds: 13 },
    m: { key: 'm', label: 'Mythisch', color: '#ef4444', colorName: 'Rot', order: 3, perModel: 2, odds: 4 },
    l: { key: 'l', label: 'Legendär', color: '#f5b301', colorName: 'Gold', order: 4, perModel: 1, odds: 1 },
  };
  const RARITY_ORDER = ['u', 'r', 'e', 'm', 'l'];
  /** Anzahl je Modell bis 0.21.54 – die ersten Skins jeder Stufe werden genauso gewählt wie damals (IDs bleiben gleich). */
  const OLD_PER_MODEL = { u: 4, r: 3, e: 2, m: 0, l: 1 };
  /** Anzahl Skins je Pack: 1 (80 %), 2 (17 %), 3 (3 %) */
  const PACK_COUNT_ODDS = [[1, 80], [2, 17], [3, 3]];
  const CATEGORIES = { regional: 'Regionalflugzeuge', short: 'Kurz- und Mittelstrecke', long: 'Langstrecke', cargo: 'Frachtflugzeuge', biz: 'Businessjets' };
  // Modelle: eindeutige ID, Spiel-Muster (P.AIRCRAFT_TYPES), Name, Kategorie
  const MODELS = [
    ['dash8_400', 'DH8D', 'Dash 8-400', 'regional'],
    ['atr72_600', 'AT76', 'ATR 72-600', 'regional'],
    ['embraer_e195_e2', 'E295', 'Embraer E195-E2', 'short'],
    ['airbus_a220_300', 'BCS3', 'Airbus A220-300', 'short'],
    ['airbus_a320ceo', 'A320', 'Airbus A320ceo', 'short'],
    ['airbus_a320neo', 'A20N', 'Airbus A320neo', 'short'],
    ['airbus_a321neo', 'A21N', 'Airbus A321neo', 'short'],
    ['airbus_a321xlr', 'A21X', 'Airbus A321XLR', 'short'],
    ['boeing_737_800', 'B738', 'Boeing 737-800', 'short'],
    ['boeing_737_max8', 'B38M', 'Boeing 737 MAX 8', 'short'],
    ['airbus_a330_900neo', 'A339', 'Airbus A330-900neo', 'long'],
    ['airbus_a350_900', 'A359', 'Airbus A350-900', 'long'],
    ['airbus_a350_1000', 'A35K', 'Airbus A350-1000', 'long'],
    ['airbus_a350_1000ulr', 'A35U', 'Airbus A350-1000ULR', 'long'],
    ['boeing_787_9', 'B789', 'Boeing 787-9', 'long'],
    ['boeing_777_300er', 'B77W', 'Boeing 777-300ER', 'long'],
    ['boeing_777_9', 'B779', 'Boeing 777-9', 'long'],
    ['airbus_a380_800', 'A388', 'Airbus A380-800', 'long'],
    ['boeing_747_8i', 'B748', 'Boeing 747-8 Intercontinental', 'long'],
    ['concorde', 'CONC', 'Concorde', 'long'],
    ['atr72_600f', 'AT7F', 'ATR 72-600F', 'cargo'],
    ['airbus_a321p2f', 'A21F', 'Airbus A321P2F', 'cargo'],
    ['boeing_767_300f', 'B76F', 'Boeing 767-300F', 'cargo'],
    ['boeing_777f', 'B77F', 'Boeing 777F', 'cargo'],
    ['cessna_citation_latitude', 'C68A', 'Cessna Citation Latitude', 'biz'],
    ['bombardier_challenger_350', 'CL35', 'Bombardier Challenger 350', 'biz'],
    ['gulfstream_g700', 'GLF7', 'Gulfstream G700', 'biz'],
    ['bombardier_global_7500', 'GL7T', 'Bombardier Global 7500', 'biz'],
  ].map(([id, type, name, cat], i) => ({ id, type, name, cat, idx: i }));
  const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m]));
  const MODEL_BY_TYPE = Object.fromEntries(MODELS.map((m) => [m.type, m]));

  /*
   * Lackierungen. pal: body (Rumpf), body2 (Verlauf), belly (Bauch), tail/tail2 (Leitwerk), stripe (Zierlinie), accent, line (Kontur), glass (Fenster), eng (Triebwerke).
   * pat: Muster auf Rumpf/Leitwerk (wird im Browser gezeichnet). glow: Leuchteffekt. desc: Beschreibung.
   */
  const DESIGNS = {
    u: [
      { k: 'forest', name: 'Forest', pal: { body: '#f4f7f2', belly: '#1f5f3a', tail: '#1f6b3f', tail2: '#3e9a5c', stripe: '#3e9a5c', accent: '#a7d08c', line: '#9fb3a4', glass: '#1d2f26', eng: '#1f5f3a' }, pat: 'leaves', desc: 'Tiefes Waldgrün am Bauch, Blattmuster am Leitwerk – ruhig, frisch, unverwechselbar.' },
      { k: 'ocean', name: 'Ocean', pal: { body: '#f3f8fc', belly: '#0b5ea8', tail: '#0b5ea8', tail2: '#2bb3e6', stripe: '#2bb3e6', accent: '#8fd8f5', line: '#9ab4c8', glass: '#10273b', eng: '#0b5ea8' }, pat: 'wave', desc: 'Eine Welle zieht vom Bug bis zum Heck – Atlantikblau mit hellen Schaumkronen.' },
      { k: 'arctic', name: 'Arctic', pal: { body: '#ffffff', belly: '#dbeaf5', tail: '#7cc4ea', tail2: '#d8f1ff', stripe: '#7cc4ea', accent: '#b9e3f7', line: '#a9c2d4', glass: '#24425a', eng: '#e7f2fa' }, pat: 'ice', desc: 'Schneeweiß mit eisblauen Kristallsplittern am Leitwerk – kühl und klar.' },
      { k: 'tropical', name: 'Tropical', pal: { body: '#fbfaf3', belly: '#0f9d8a', tail: '#ff8a3d', tail2: '#ffd23f', stripe: '#0f9d8a', accent: '#ffd23f', line: '#b9b49c', glass: '#173b36', eng: '#0f9d8a' }, pat: 'palm', desc: 'Lagunentürkis trifft Mango und Sonnengelb – Urlaubsstimmung schon am Gate.' },
      { k: 'sunset', name: 'Sunset', pal: { body: '#fff8f2', belly: '#5b2a86', tail: '#ff7a3d', tail2: '#ff3d77', stripe: '#ff7a3d', accent: '#ffc24b', line: '#c8ad9c', glass: '#2b1838', eng: '#5b2a86' }, pat: 'gradtail', desc: 'Ein Abendhimmel von Orange zu Pink am Leitwerk, darunter tiefes Violett.' },
      { k: 'racing', name: 'Racing', pal: { body: '#d7142b', belly: '#1a1a1a', tail: '#d7142b', tail2: '#ffffff', stripe: '#ffffff', accent: '#ffffff', line: '#8f0d1c', glass: '#1b0a0d', eng: '#1a1a1a' }, pat: 'race', desc: 'Rennrot mit doppelten Rallyestreifen über die ganze Länge – Startnummer inklusive.' },
      { k: 'classic', name: 'Classic', pal: { body: '#fbfbf8', belly: '#c9ccd2', tail: '#123a7a', tail2: '#123a7a', stripe: '#c8102e', accent: '#c8102e', line: '#a7adb7', glass: '#1a2233', eng: '#c9ccd2' }, pat: 'cheat', desc: 'Weißer Rumpf, roter Zierstreifen, dunkelblaues Leitwerk – zeitlos wie die goldene Ära.' },
      { k: 'nature', name: 'Nature', pal: { body: '#f2efe4', belly: '#7a8b4a', tail: '#5d6b36', tail2: '#c8b273', stripe: '#a68a4b', accent: '#c8b273', line: '#b3ab90', glass: '#262a1a', eng: '#7a8b4a' }, pat: 'hills', desc: 'Sand, Moos und Olive in sanften Hügellinien – erdig und unaufgeregt.' },
    ],
    r: [
      { k: 'metallic_blue', name: 'Metallic Blue', pal: { body: '#2c5fa8', body2: '#8fb6ea', belly: '#183b70', tail: '#183b70', tail2: '#6fa3e8', stripe: '#d6e6ff', accent: '#d6e6ff', line: '#163563', glass: '#0b1a33', eng: '#9fb5d3' }, pat: 'sheen', desc: 'Mehrschichtiger Metallic-Lack in Kobaltblau mit spiegelndem Glanzband.' },
      { k: 'midnight', name: 'Midnight', pal: { body: '#101b33', body2: '#24365c', belly: '#070d1b', tail: '#070d1b', tail2: '#2f4e86', stripe: '#c7d3ea', accent: '#7aa2ff', line: '#3a4c70', glass: '#7aa2ff', eng: '#24365c' }, pat: 'pin', desc: 'Nachtblau mit silbernen Nadelstreifen und beleuchteten Fenstern.' },
      { k: 'silver_arrow', name: 'Silver Arrow', pal: { body: '#c9d0d9', body2: '#f4f7fb', belly: '#8a95a5', tail: '#8a95a5', tail2: '#eef2f7', stripe: '#1f6feb', accent: '#1f6feb', line: '#7d8796', glass: '#18202c', eng: '#aab3c0' }, pat: 'arrow', desc: 'Gebürstetes Silber, ein blauer Pfeil zieht vom Bug nach hinten.' },
      { k: 'blue_lightning', name: 'Blue Lightning', pal: { body: '#eaf2ff', body2: '#ffffff', belly: '#1747b8', tail: '#1747b8', tail2: '#46a6ff', stripe: '#46a6ff', accent: '#9fe1ff', line: '#8aa3c9', glass: '#0d1f45', eng: '#1747b8' }, pat: 'bolt', desc: 'Ein Blitz in Stahlblau schlägt quer über den Rumpf – mit leuchtender Kante.' },
      { k: 'deep_ocean', name: 'Deep Ocean', pal: { body: '#0b3a5e', body2: '#1b6f9a', belly: '#05213a', tail: '#05213a', tail2: '#1fa3c9', stripe: '#5fd3f0', accent: '#5fd3f0', line: '#0a2e4a', glass: '#7fe3ff', eng: '#0b3a5e' }, pat: 'deepwave', desc: 'Tiefseeblau mit schimmernden Strömungslinien und türkisem Glanz.' },
      { k: 'polar_express', name: 'Polar Express', pal: { body: '#f7fbff', body2: '#d8ecff', belly: '#3a7bd5', tail: '#3a7bd5', tail2: '#bfe3ff', stripe: '#9cd2ff', accent: '#ffffff', line: '#9bb6d3', glass: '#173153', eng: '#3a7bd5' }, pat: 'streak', desc: 'Polarweiß mit eisigen Geschwindigkeitsstreifen und Metallic-Blau am Bauch.' },
    ],
    e: [
      { k: 'cyberpunk', name: 'Cyberpunk', pal: { body: '#14121f', body2: '#221c38', belly: '#0b0a12', tail: '#ff2bd6', tail2: '#22e5ff', stripe: '#22e5ff', accent: '#ff2bd6', line: '#3a2f5c', glass: '#ff2bd6', eng: '#14121f' }, pat: 'grid', glow: true, desc: 'Schwarzer Rumpf, Neon-Raster in Magenta und Cyan – wie eine Stadt bei Nacht.' },
      { k: 'galaxy', name: 'Galaxy', pal: { body: '#1b1035', body2: '#3b1f6e', belly: '#0c0720', tail: '#6d3bd6', tail2: '#e05cff', stripe: '#c9a7ff', accent: '#ffffff', line: '#3d2a6b', glass: '#c9a7ff', eng: '#1b1035' }, pat: 'stars', glow: true, desc: 'Ein Spiralnebel in Violett, durchzogen von hunderten funkelnden Sternen.' },
      { k: 'neon_pulse', name: 'Neon Pulse', pal: { body: '#0d1020', body2: '#1a1f3d', belly: '#06070f', tail: '#8b5cf6', tail2: '#22d3ee', stripe: '#a3ff12', accent: '#8b5cf6', line: '#2a2f55', glass: '#a3ff12', eng: '#0d1020' }, pat: 'pulse', glow: true, desc: 'Ein Herzschlag aus Neonlicht läuft den Rumpf entlang – Violett, Cyan, Giftgrün.' },
      { k: 'aurora', name: 'Aurora', pal: { body: '#0e1b2e', body2: '#173a4a', belly: '#07101c', tail: '#2ee6a6', tail2: '#a855f7', stripe: '#2ee6a6', accent: '#a855f7', line: '#22405a', glass: '#7cf5d0', eng: '#0e1b2e' }, pat: 'aurora', glow: true, desc: 'Polarlichter wehen in grünen und violetten Bändern über den Nachthimmel-Rumpf.' },
      { k: 'cosmic', name: 'Cosmic', pal: { body: '#120c2a', body2: '#2c1b5e', belly: '#070418', tail: '#ff6ad5', tail2: '#7b5cff', stripe: '#ffb86b', accent: '#ff6ad5', line: '#2f2457', glass: '#ffb86b', eng: '#120c2a' }, pat: 'nebula', glow: true, desc: 'Nebelwolken in Pink und Ultramarin, dazwischen ein glühender Planetenring.' },
      { k: 'electric_storm', name: 'Electric Storm', pal: { body: '#1f2433', body2: '#363d55', belly: '#0f121b', tail: '#7c3aed', tail2: '#c084fc', stripe: '#c084fc', accent: '#e9d5ff', line: '#3a4158', glass: '#c084fc', eng: '#1f2433' }, pat: 'storm', glow: true, desc: 'Gewittergrau mit violetten Entladungen, die über Rumpf und Leitwerk zucken.' },
    ],
    m: [
      { k: 'disco_fever', name: 'Disco Fever', pal: { body: '#1a0b24', body2: '#3a1450', belly: '#0b0410', tail: '#ff2bd6', tail2: '#22e5ff', stripe: '#ffe14d', accent: '#ffffff', line: '#3d1d52', glass: '#ffe14d', eng: '#1a0b24' }, pat: 'disco', glow: true, blink: true, desc: 'Spiegelkacheln in allen Farben, die im Takt blinken, und eine Discokugel am Leitwerk – die Party fliegt mit.' },
      { k: 'inferno', name: 'Inferno', pal: { body: '#1c0a06', body2: '#3a120a', belly: '#0d0403', tail: '#ff3b1f', tail2: '#ffb21f', stripe: '#ff6a1f', accent: '#ffd36a', line: '#4a1a0e', glass: '#ffb21f', eng: '#1c0a06' }, pat: 'flames', glow: true, desc: 'Flammen lodern vom Bauch bis über die Fenster – glühendes Rot, Orange und Gelb.' },
      { k: 'crimson_dragon', name: 'Crimson Dragon', pal: { body: '#8a0f1a', body2: '#c81e2c', belly: '#3a050b', tail: '#3a050b', tail2: '#e23a3a', stripe: '#ffcf5a', accent: '#ffcf5a', line: '#5a0a12', glass: '#ffcf5a', eng: '#3a050b' }, pat: 'scales', glow: true, desc: 'Karmesinrote Drachenschuppen mit goldenen Kanten, die im Licht schimmern.' },
      { k: 'ruby_comet', name: 'Ruby Comet', pal: { body: '#f8f1f2', body2: '#ffffff', belly: '#b3122a', tail: '#b3122a', tail2: '#ff5a6e', stripe: '#ff2d48', accent: '#ffd1d8', line: '#c9a3aa', glass: '#3a0a14', eng: '#b3122a' }, pat: 'comet', glow: true, desc: 'Ein rubinroter Komet zieht seinen glühenden Schweif über den weißen Rumpf.' },
      { k: 'volcano', name: 'Volcano', pal: { body: '#211c1c', body2: '#3a3232', belly: '#0f0b0b', tail: '#211c1c', tail2: '#ff4d1a', stripe: '#ff4d1a', accent: '#ffb347', line: '#3d3434', glass: '#ff7a33', eng: '#211c1c' }, pat: 'lava', glow: true, desc: 'Erstarrtes Basaltschwarz, durchzogen von glühenden Lavarissen.' },
    ],
    l: [
      { k: 'royal_phoenix', name: 'Royal Phoenix', pal: { body: '#7a0f1f', body2: '#c0262f', belly: '#3d0610', tail: '#f5b301', tail2: '#ff6a00', stripe: '#f5b301', accent: '#ffe08a', line: '#5a0a16', glass: '#ffe08a', eng: '#3d0610' }, pat: 'phoenix', glow: true, gold: true, desc: 'Ein goldener Phönix breitet seine Flammenschwingen über Karmesinrot aus.' },
      { k: 'golden_emperor', name: 'Golden Emperor', pal: { body: '#c99a1e', body2: '#ffe07a', belly: '#141414', tail: '#141414', tail2: '#c99a1e', stripe: '#141414', accent: '#fff3c4', line: '#8a6810', glass: '#141414', eng: '#141414' }, pat: 'emperor', glow: true, gold: true, desc: 'Vollgold mit schwarzem Bauch und kaiserlichem Wappen am Seitenleitwerk.' },
      { k: 'imperial', name: 'Imperial', pal: { body: '#fbf8f0', body2: '#ffffff', belly: '#3b145e', tail: '#3b145e', tail2: '#d4a017', stripe: '#d4a017', accent: '#d4a017', line: '#b9ad92', glass: '#2a1240', eng: '#3b145e' }, pat: 'imperial', glow: true, gold: true, desc: 'Elfenbein, Purpur und Blattgold – höfische Eleganz mit doppelter Goldlinie.' },
      { k: 'golden_titan', name: 'Golden Titan', pal: { body: '#b8860b', body2: '#f6d365', belly: '#4a3b12', tail: '#4a3b12', tail2: '#f6d365', stripe: '#2b2208', accent: '#fff1b8', line: '#7a5a08', glass: '#2b2208', eng: '#4a3b12' }, pat: 'titan', glow: true, gold: true, desc: 'Gebürstetes Titangold mit dunklen Panzerplatten – massiv und majestätisch.' },
      { k: 'sovereign', name: 'Sovereign', pal: { body: '#0d1b3e', body2: '#1d3270', belly: '#060d20', tail: '#0d1b3e', tail2: '#e7b94a', stripe: '#e7b94a', accent: '#fff0c2', line: '#24356a', glass: '#e7b94a', eng: '#0d1b3e' }, pat: 'sovereign', glow: true, gold: true, desc: 'Königsblau mit goldenen Nadelstreifen und einer Krone über dem Heck.' },
      { k: 'black_diamond', name: 'Black Diamond', pal: { body: '#0b0b0f', body2: '#2a2a33', belly: '#000000', tail: '#0b0b0f', tail2: '#f5c542', stripe: '#f5c542', accent: '#ffffff', line: '#2c2c36', glass: '#f5c542', eng: '#0b0b0f' }, pat: 'diamond', glow: true, gold: true, desc: 'Hochglanzschwarz mit goldgefassten Diamantfacetten – das Kronjuwel jeder Flotte.' },
    ],
  };
  const MAP_EFFECT = { u: 'paint', r: 'sheen', e: 'glow', m: 'fire', l: 'gold' };

  // 420 Skins: je Modell 5 aus 8 grünen, 4 aus 6 blauen, 3 aus 6 pinken, 2 roten (Disco Fever + 1 aus 4) und 1 aus 6 goldenen Designs.
  // Die ersten Skins jeder Stufe wie bis 0.21.54 (reihum), die neuen danach: die nächsten im Kreis, die das Modell noch nicht hat.
  const pickDesigns = (m, rk) => {
    const pool = DESIGNS[rk], n = RARITIES[rk].perModel, on = OLD_PER_MODEL[rk], out = [];
    if (rk === 'm') return [pool[0], pool[1 + (m.idx % (pool.length - 1))]];
    for (let j = 0; j < on; j++) out.push(pool[(m.idx * on + j + (rk === 'l' ? 0 : Math.floor(m.idx / pool.length))) % pool.length]);
    let k = pool.indexOf(out[out.length - 1]);
    while (out.length < n) { k = (k + 1) % pool.length; if (!out.includes(pool[k])) out.push(pool[k]); }
    return out;
  };
  const SKINS = [];
  for (const m of MODELS) {
    for (const rk of RARITY_ORDER) {
      for (const d of pickDesigns(m, rk)) {
        const id = `${m.id}__${d.k}`;
        SKINS.push({ id, model: m.id, type: m.type, name: d.name, rarity: rk, design: d.k, pal: d.pal, pat: d.pat, glow: !!d.glow, gold: !!d.gold, blink: !!d.blink,
          desc: d.desc, mapEffect: d.blink ? 'disco' : MAP_EFFECT[rk], artworkPath: `skins/${id}.png`, isTradable: true });
      }
    }
  }
  const SKIN_BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s]));
  const SKINS_BY_MODEL_RARITY = {};
  for (const s of SKINS) ((SKINS_BY_MODEL_RARITY[s.model] = SKINS_BY_MODEL_RARITY[s.model] || {})[s.rarity] = SKINS_BY_MODEL_RARITY[s.model][s.rarity] || []).push(s);

  /**
   * Ein Pack ziehen. rnd(n) muss eine gleichverteilte ganze Zahl in [0, n) liefern (Server: crypto.randomInt).
   * 1. Anzahl Skins (80/17/3), dann je Skin unabhängig: 2. Seltenheit (55/27/13/4/1), 3. Modell gleichverteilt (1/28), 4. Skin dieser Seltenheit des Modells gleichverteilt.
   */
  function drawPack(rnd) {
    const pick = (table) => { let r = rnd(100); for (const [v, w] of table) { if (r < w) return v; r -= w; } return table[table.length - 1][0]; };
    const n = pick(PACK_COUNT_ODDS), out = [];
    for (let i = 0; i < n; i++) {
      const rk = pick(RARITY_ORDER.map((k) => [k, RARITIES[k].odds]));
      const m = MODELS[rnd(MODELS.length)], list = SKINS_BY_MODEL_RARITY[m.id][rk];
      out.push(list[rnd(list.length)].id);
    }
    return out;
  }
  /** Meilensteine nach Anzahl verschiedener Skins (Duplikate zählen nicht). */
  const MILESTONES = [
    { n: 25, key: 'badge', label: 'Sammler-Abzeichen', desc: 'Abzeichen „Sammler“ in der Sammlung und bei den Mitspielenden.' },
    { n: 75, key: 'frame', label: 'Exklusiver Profilrahmen', desc: 'Leuchtender Cyan-Violett-Rahmen um Ihr Profilbild.' },
    { n: 150, key: 'trail', label: 'Besonderer Karteneffekt', desc: 'Ihre Flugspuren auf der Karte schimmern in Cyan und Violett.' },
    { n: 420, key: 'title', label: 'Titel „Ultimate Aircraft Collector“', desc: 'Der Titel erscheint bei Ihrem Namen.' },
  ];
  // Reihenfolge = Anzeige im Shop: einzelne Packs (Anzahl frei wählbar), dann die Bündel
  const OFFERS = {
    single: { key: 'single', label: 'Einzelne Packs', packs: 1, price: '0.5', currency: 'TOKEN', perPack: true, max: 50 },
    starter: { key: 'starter', label: 'Starter Pack', packs: 10, price: '5', currency: 'TOKEN' },
    collector: { key: 'collector', label: 'Collector Pack', packs: 20, price: '10', currency: 'TOKEN' },
  };
  /** 0.21.57: ein Exemplar eines Skins darf auf bis zu so vielen Flugzeugen gleichzeitig aktiv sein. */
  const PER_COPY = 5;
  const api = { PER_COPY, RARITIES, RARITY_ORDER, PACK_COUNT_ODDS, CATEGORIES, MODELS, MODEL_BY_ID, MODEL_BY_TYPE, DESIGNS, SKINS, SKIN_BY_ID, SKINS_BY_MODEL_RARITY, MILESTONES, OFFERS, drawPack, TOTAL: SKINS.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.SKINS = api;
})();
