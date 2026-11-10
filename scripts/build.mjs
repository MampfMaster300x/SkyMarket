// Baut public/index.html aus src/ (Oberfläche, Karte) und shared/engine.cjs (Wirtschaftskern).
import fs from 'node:fs';
const VERSION = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
// Server kennt dieselbe Version: veraltete offene Fenster bekommen den Hinweis zum Neuladen
fs.writeFileSync('server/version.mjs', `// automatisch von scripts/build.mjs erzeugt\nexport const APP_VERSION = ${JSON.stringify(VERSION)};\n`);
const shell = fs.readFileSync('src/shell.html', 'utf8');
const engine = fs.readFileSync('shared/engine.cjs', 'utf8').replace("if (typeof module !== 'undefined') module.exports = SM;", '');
const map = fs.readFileSync('src/world.json', 'utf8');
// Aircraft Collection: Katalog (shared/skins.cjs) und Oberfläche (src/collection.js) – Letztere läuft im selben Gültigkeitsbereich wie die App
const skins = fs.readFileSync('shared/skins.cjs', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8').replace('/*COLLECTION*/', () => fs.readFileSync('src/collection.js', 'utf8'));
// Artworks: PNG-Dateien aus assets/skins/<skinId>.png werden nach public/skins kopiert, die Liste steht in public/skins/manifest.json
{ const src = 'assets/skins', dst = 'public/skins'; fs.mkdirSync(dst, { recursive: true });
  const files = fs.existsSync(src) ? fs.readdirSync(src).filter((f) => /^[a-z0-9_]+__[a-z0-9_]+\.png$/.test(f)) : [];
  for (const f of files) fs.copyFileSync(`${src}/${f}`, `${dst}/${f}`);
  fs.writeFileSync(`${dst}/manifest.json`, JSON.stringify({ skins: files.map((f) => f.replace(/\.png$/, '')) })); }
const cut = shell.indexOf('</style>') + '</style>'.length;
const head = shell.slice(0, cut), body = shell.slice(cut)
  .replace('/*ENGINE*/', () => engine).replace('/*SKINS*/', () => skins).replace('/*MAP*/', () => 'window.SKYMAP = ' + map + ';').replace('/*APP*/', () => app);
const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="SKYMARKET – Airline-Wirtschaftssimulation: Hauptwelt für alle und private Runden">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23f2b400'/%3E%3Cpath d='M26 16 L20 14.5 L13 6 L10.5 6 L14 14.5 L8 14.5 L6 11.5 L4.5 11.5 L5.5 16 L4.5 20.5 L6 20.5 L8 17.5 L14 17.5 L10.5 26 L13 26 L20 17.5 L26 16Z' fill='%231a1400'/%3E%3C/svg%3E">
<style>[hidden]{display:none!important}</style>
<script>window.SKYMARKET_ONLINE = true; window.SKYMARKET_BUILD = ${JSON.stringify(VERSION)};</script>
${head}
</head>
<body>
${body}
</body>
</html>
`;
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/index.html', html);
console.log(`public/index.html gebaut (${Math.round(html.length / 1024)} KB, Version ${VERSION})`);
