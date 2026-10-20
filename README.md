# SKYMARKET Online (Testversion 0.5)

Airline-Wirtschaftssimulation im Browser: 104 Flughäfen weltweit, 14 KI-Airlines und gemeinsame Spiele mit bis zu vier Personen.

- **Anmelden:** Konto mit Benutzername und Passwort.
- **Spiel anlegen:** Name, optionales Passwort, Schwierigkeit und Tempo festlegen. Wer das Spiel anlegt, leitet es und stellt das Tempo ein.
- **Beitreten:** auf drei Wegen:
  - über den **Einladungslink**, ohne Passwort;
  - über den **6-stelligen Code**;
  - über die **Suche nach dem Spielnamen** in der Lobby.

  Bei Code und Suche ist das Passwort nötig, falls eines gesetzt ist.
- **Offline:** Allein spielen geht auch ohne Konto. Der Spielstand bleibt dann im Browser.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `public/index.html` | Fertig gebaute Seite. Spiel, Karte, Lobby und Anmeldung stecken in einer Datei. |
| `netlify/functions/api.mjs` | Netlify Function für alle Aufrufe unter `/api/*`. |
| `server/api.mjs` | Konten, Spiele, Zeitfortschritt und Aktionen. Der Server hält den maßgeblichen Spielstand. |
| `server/memstore.mjs` | Speicher-Ersatz für lokale Tests. Er verhält sich wie Netlify Blobs, inklusive Versionsprüfung. |
| `shared/engine.cjs` | Wirtschaftskern. Browser und Server nutzen dieselbe Datei. |
| `src/` | Quellen der Oberfläche (`shell.html`, `app.js`) und der Weltkarte (`world.json`). |
| `scripts/build.mjs` | Baut `public/index.html` aus `src/` und `shared/`. |
| `scripts/smoke-test.mjs` | Prüft den API-Ablauf ohne Netlify. |
| `dev-server.mjs` | Lokaler Testserver ohne Netlify-Konto. |

Die Daten liegen in **Netlify Blobs** im Speicher `skymarket`: Konten, Spiele, Spielstände und Anwesenheit. Eine Datenbank müssen Sie nicht einrichten.

## Auf Netlify veröffentlichen

Einfaches Hochziehen per Drag-and-drop (Netlify Drop) reicht nicht, weil die Seite eine Function braucht. Nehmen Sie Weg A oder Weg B.

### Weg A: über GitHub (empfohlen)

1. Den Ordner als neues Repository zu GitHub hochladen.
2. In Netlify **Add new project → Import an existing project** wählen und das Repository auswählen.
3. Die Einstellungen kommen aus `netlify.toml`:
   - Build-Befehl: `npm run build`
   - Ausgabeordner: `public`
   - Functions: `netlify/functions`

   Nichts ändern, nur **Deploy** klicken.
4. Fertig. Die Seite läuft unter `https://<name>.netlify.app`.

### Weg B: mit der Netlify CLI

```bash
npm install
npx netlify-cli login
npx netlify-cli deploy --build --prod
```

Beim ersten Mal fragt die CLI, ob ein neues Projekt angelegt werden soll. Mit Ja antworten.

### Optional: eigenes Sitzungsgeheimnis

Ohne Einstellung legt der Server beim ersten Aufruf selbst ein zufälliges Geheimnis an und speichert es in Netlify Blobs. Wenn Sie es selbst setzen wollen:

- **Wo:** Project configuration → Environment variables
- **Name:** `SESSION_SECRET`
- **Wert:** eine lange Zufallszeichenkette, z. B. aus `openssl rand -base64 32`

Wenn Sie das Geheimnis ändern, werden alle Personen abgemeldet.

## Lokal testen

```bash
npm install
npm run local        # http://localhost:8888, Daten in .local-data.json
npm test             # API-Ablauf prüfen (Konten, Passwort, Einladung, Zeit, Aktionen, max. 4)
```

Mit `npx netlify-cli dev` läuft es auch lokal mit dem echten Netlify-Stack, inklusive Blobs-Emulation.

## So funktioniert ein gemeinsames Spiel

- **Der Server rechnet, der Browser zeigt an.**
  - Jede Aktion (Flugzeug leasen, Strecke eröffnen, Personal einstellen …) wird lokal sofort geprüft und angezeigt.
  - Gleichzeitig geht sie an den Server. Er rechnet sie mit derselben Engine nach und ist maßgeblich.
- **Zeit:**
  - Wer das Spiel leitet, stellt Pause, 1×, 2× oder 4× ein (1× heißt 1 Tag in 12 Sekunden).
  - Die Spieltage laufen, solange jemand das Spiel geöffnet hat.
  - Ist niemand im Spiel, holt der Server höchstens eine Minute Spielzeit nach. Das Spiel läuft also nicht ohne Sie davon.
- **Airlines:**
  - Bis zu vier Personen spielen in einer gemeinsamen Welt, jede mit eigener Airline.
  - Sie konkurrieren auf denselben Märkten, um dieselben Bewerbungen, Gebrauchtflugzeuge und Charteranfragen.
  - Wer später einsteigt, bekommt das volle Startkapital.
- **Gleichzeitige Änderungen:** Der Server speichert mit Versionsprüfung (ETag). Wenn zwei Personen gleichzeitig ändern, verliert niemand eine Aktion.
- **Spiel löschen:** Wer ein Spiel leitet, kann es in der Lobby löschen. Der Knopf fragt einmal nach.

## Grenzen dieser Testversion

- **Konto:** Keine E-Mail, kein Passwort-Reset. Ein vergessenes Passwort heißt neues Konto.
- **Schutz vor Missbrauch:** Es gibt keine Begrenzung der Anmeldeversuche. Für einen öffentlichen Betrieb sollte eine dazukommen.
- **Netlify-Verbrauch:**
  - Jedes geöffnete Spiel fragt etwa alle 1 bis 6 Sekunden nach dem Stand.
  - Bei jedem neuen Spieltag lädt jedes Gerät den Spielstand (rund 150 bis 250 KB).
  - Auf dem kostenlosen Netlify-Plan reicht das gut für Testrunden. Behalten Sie die Function-Aufrufe und den Datenverkehr in der Netlify-Übersicht im Blick.
- **Spielstände:** Spielstände der Claude-Artifact-Version lassen sich hier nicht laden.
