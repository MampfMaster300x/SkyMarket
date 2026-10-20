// Baut public/index.html aus src/ (Oberfläche, Karte) und shared/engine.cjs (Wirtschaftskern).
import fs from 'node:fs';
const shell = fs.readFileSync('src/shell.html', 'utf8');
const engine = fs.readFileSync('shared/engine.cjs', 'utf8').replace("if (typeof module !== 'undefined') module.exports = SM;", '');
const map = fs.readFileSync('src/world.json', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const cut = shell.indexOf('</style>') + '</style>'.length;
const head = shell.slice(0, cut), body = shell.slice(cut)
  .replace('/*ENGINE*/', () => engine).replace('/*MAP*/', () => 'window.SKYMAP = ' + map + ';').replace('/*APP*/', () => app);
const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="SKYMARKET – Airline-Wirtschaftssimulation für bis zu vier Personen">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23f2b400'/%3E%3Cpath d='M26 16 L20 14.5 L13 6 L10.5 6 L14 14.5 L8 14.5 L6 11.5 L4.5 11.5 L5.5 16 L4.5 20.5 L6 20.5 L8 17.5 L14 17.5 L10.5 26 L13 26 L20 17.5 L26 16Z' fill='%231a1400'/%3E%3C/svg%3E">
<style>[hidden]{display:none!important}</style>
<script>window.SKYMARKET_ONLINE = true;</script>
${head}
</head>
<body>
${body}
</body>
</html>
`;
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/index.html', html);
console.log(`public/index.html gebaut (${Math.round(html.length / 1024)} KB)`);
