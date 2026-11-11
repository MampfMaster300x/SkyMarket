# Aircraft Collection – Anleitung zur Einrichtung und zum Betrieb

Stand: Version 0.21.63. Das Feature ist fest in SKYMARKET Online eingebaut. Die Sammlung hängt am Konto und gilt in jedem Spiel: Hauptwelt, private Online-Spiele und Offline-Spiele, solange man angemeldet ist. Alles ist rein kosmetisch.

## 1. Bestandsaufnahme: So ist es eingebaut

| Frage | Antwort |
|---|---|
| Technik | Netlify Functions (`server/api.mjs`), Netlify Blobs als Speicher, eine gebaute Seite (`public/index.html`) aus `src/shell.html`, `src/app.js` und der Engine |
| Datenbank | Keine SQL-Datenbank. Alles liegt als JSON in Netlify Blobs. Änderungen laufen über ETag-Prüfung („nur schreiben, wenn unverändert“), das ersetzt Transaktionen. |
| Flugzeuggrafik | Seitenansichten werden als SVG aus den Maßen je Muster gezeichnet (`acSvg`). Skins legen eine Lackierung darüber, die Geometrie bleibt die des Modells. |
| Spielstand | Wird nicht verändert. Skins hängen am Konto, nicht an der Airline. |

Neue und geänderte Dateien:

| Datei | Inhalt |
|---|---|
| `shared/skins.cjs` | Katalog: 28 Modelle, 420 Skins in fünf Stufen, Wahrscheinlichkeiten, Ziehung, Meilensteine, Angebote |
| `server/collection.mjs` | Alle Server-Funktionen: Inventar, Pack öffnen, Aktivieren, Tausch, Pack-Anfragen, Admin |
| `src/collection.js` | Oberfläche: Collection, Shop, Trading, Pack-Opening, Skin-Auswahl, Admin-Dialog, Karteneffekte |
| `server/api.mjs` | Leitet `/coll…` und `/shop…` weiter; `/games/<id>/info` liefert aktive Skins und Abzeichen |
| `src/app.js`, `src/shell.html` | Navigation „Collection“, Knopf „Skin ändern“ in der Flotte, Skins auf der Karte, Styles |
| `scripts/build.mjs` | Setzt Katalog und Oberfläche ein, kopiert Artworks |
| `scripts/smoke-test.mjs` | Tests für das ganze Feature |

Speicherorte in Netlify Blobs:

| Schlüssel | Inhalt |
|---|---|
| `coll/registry` | Sammlungen aller Konten (Skins, ungeöffnete und geöffnete Packs, aktive Skins), Tauschangebote, Statistik, Liste der gutgeschriebenen Anfragen |
| `coll/hist/<konto>` | Archiv aller geöffneten Packs eines Kontos |
| `coll/grants` | Protokoll der kostenlosen Vergaben (Admin, Empfänger, Anzahl, Grund, Zeit, Herkunft `admin_grant`) |
| `shop/requests` | Pack-Anfragen |
| `shop/log` | Protokoll: Anfrage, Freigabe, Ablehnung |

## 2. Einspielen

1. Die Zip-Datei wie bei jedem Update hochladen (Netlify-Deploy). Es gibt keine neuen Abhängigkeiten.
2. Prüfen, dass du als Admin eingetragen bist: Umgebungsvariable `ADMIN_USERS` (Benutzernamen in Kleinbuchstaben, mit Komma getrennt).
3. Fertig. Der Bereich „Collection“ erscheint in jedem Spiel angemeldeter Spieler. Anfragen sind zunächst gesperrt, kostenlose Packs kannst du sofort vergeben.

## 3. Pack-Anfragen freischalten

Das Spiel kennt kein Geld und keine Bezahlung. Die Angebote sind in Token ausgezeichnet. Standard: einzelne Packs (Anzahl 1 bis 50 frei wählbar, je 0,5 Token), 10 Packs für 5 Token, 20 Packs für 10 Token. Du kannst sie selbst anpassen (siehe unten). Token sind nur eine Angabe am Angebot; es gibt kein Token-Guthaben im Spiel. Ob und wofür jemand Packs bekommt, entscheidest du mit der Freigabe.

1. Der Spieler wählt im Shop eine Anzahl einzelner Packs oder eines der Pakete mit 10 oder 20 Packs und sendet die Anfrage. Er bekommt eine Anfragenummer.
2. Du öffnest oben rechts das Menü → „Aircraft Pack Management“ und klickst bei der Anfrage auf „Freigeben“ (zweiter Klick bestätigt). Erst dann liegen die Packs im Inventar.
3. Du kannst Anfragen ablehnen. Der Spieler kann offene Anfragen selbst zurückziehen.

Freischalten: Menü oben rechts → „Aircraft Pack Management“ → „Anfragen freischalten“. Das gilt sofort für alle Spieler und lässt sich dort jederzeit wieder sperren. Im selben Feld kannst du einen Hinweistext für den Shop eintragen, zum Beispiel wie man Token bekommt. Ein Deploy ist dafür nicht nötig.

Angebote anpassen (ab 0.21.63): im selben Fenster unter „Angebote im Shop“. Je Angebot änderst du Bezeichnung, Anzahl Packs (bei den Einzelpacks die Höchstmenge je Anfrage), Preis in Token und ob es im Shop erscheint. „Paket hinzufügen“ legt ein neues Paket an, „Entfernen“ löscht eines, „Angebote speichern“ übernimmt alles sofort, „Standard wiederherstellen“ setzt die drei Standardangebote zurück. Schon gestellte Anfragen behalten Anzahl und Preis von damals; ausgeschaltete Angebote können nicht mehr angefragt werden.

Admin-Leiste in der Lobby (ab 0.21.63): Unter „Verwaltung · alle Spiele“ öffnest du direkt „Spielzeit der Spieler“, „Packs, Shop & Angebote“ (die Zahl am Knopf zeigt offene Pack-Anfragen), „Hauptwelt verwalten“ und das Fehlerprotokoll, ohne erst ein Spiel zu betreten.

Regeln im Code: höchstens 3 offene Anfragen je Konto; eine Anfrage kann nur einmal freigegeben werden; Packs aus Anfragen und kostenlose Packs werden getrennt gezählt.

## 4. Kostenlose Packs vergeben

Menü → „Aircraft Pack Management“ → Spieler suchen, Anzahl (1 bis 100) und optional einen Grund eintragen → „Kostenlos vergeben“. Der Spieler bekommt die Meldung „Sie haben ein kostenloses Aircraft Mystery Pack erhalten!“. Die Vergabe steht in der Historie und wird getrennt gezählt.

## 4a. Tägliches Gratis-Pack

Jedes angemeldete Konto bekommt einmal pro Kalendertag (Berliner Zeit) ein Pack, sobald es ein Spiel öffnet. Ein Fenster bietet „Jetzt öffnen“ an. Mehrfaches Öffnen am selben Tag gibt kein weiteres Pack. Ein- und ausschalten: Menü → „Aircraft Pack Management“ → „Tägliches Gratis-Pack“. Die Zahl der verteilten Tagespacks steht dort ebenfalls.

## 5. Eigene Artworks nachliefern

Bis eigene Grafiken da sind, zeichnet das Spiel jede Lackierung selbst auf die Seitenansicht des Modells. Alle Skin-IDs aus früheren Versionen bleiben gültig; neue Skins kommen nur hinzu.

1. PNG mit transparentem Hintergrund, Seitenansicht, Nase links, Seitenverhältnis 320 : 76 (z. B. 1280 × 304).
2. Dateiname = Skin-ID, z. B. `airbus_a350_900__royal_phoenix.png`. Die IDs stehen in `shared/skins.cjs` (Modell-ID, zwei Unterstriche, Design).
3. Datei nach `assets/skins/` legen, `node scripts/build.mjs` ausführen, deployen.

Der Build kopiert die Dateien nach `public/skins/` und schreibt eine Liste. Für jeden Skin mit Datei zeigt die Sammlung das PNG, für alle anderen weiter die gezeichnete Lackierung. Code muss dafür nicht geändert werden.

## 6. Was das System sicherstellt

- Ziehung nur auf dem Server mit `crypto.randomInt`, nie mit `Math.random`. Der Browser kann kein Ergebnis vorgeben.
- Das Ergebnis ist gespeichert, bevor die Animation startet. Ein zweiter Aufruf für dasselbe Pack liefert das gespeicherte Ergebnis.
- Skins lassen sich nur auf dem exakt passenden Modell und nur auf eigenen Flugzeugen aktivieren. Ein Exemplar deckt bei Grün und Blau bis zu 2 Flugzeuge, ab Pink (Pink, Rot, Gold) eines (ab 0.21.61; vorher 5). Was darüber hinaus aktiv war, wird beim nächsten Laden zurückgesetzt. Für den Tausch zählt ein Exemplar als belegt, sobald es auf mindestens einem Flugzeug aktiv ist.
- Aktive Skins und Skins in offenen Tauschangeboten sind gesperrt und können nicht doppelt verwendet werden.
- Ein Tausch überträgt beide Seiten in einem Schritt. Bei gleichzeitigen Klicks gewinnt genau einer.
- Admin-Funktionen werden auf dem Server geprüft.

Getestet in `npm test` (Abschnitt 0.21.52 der Tests): 200.000 Ziehungen gegen die Sollwerte, Öffnen einmalig (auch parallel), Aktivieren, Tausch, Anfrage mit Freigabe und Ablehnung, Admin-Sperren, Statistik.

## 7. Abgleich mit dem Konzept

| Punkt | Stand |
|---|---|
| 28 Modelle, 4 Seltenheiten | erweitert auf 420 Skins und 5 Stufen: je Modell 5 grün, 4 blau, 3 pink, 2 rot (davon „Disco Fever“, blinkt), 1 gold; Wahrscheinlichkeiten 55/27/13/4/1 % |
| Pack-Verteilung und Wahrscheinlichkeiten, im Shop sichtbar | umgesetzt |
| Pack-Inventar, Öffnen mit Animation, Seltenheitseffekte, Ton | umgesetzt; ab 0.21.55 Pack aufreißen (ziehen oder antippen), längere Inszenierung mit Bildschirmblitz, verdeckter Karte und Fanfare je Seltenheit |
| Sammlung mit Fortschritt, Filtern, Silhouetten, Duplikaten | umgesetzt |
| Skins in der Flotte und auf der Karte | umgesetzt; ab 0.21.56 direkt nach dem Ziehen per Knopf ausrüstbar |
| Trading | umgesetzt |
| Admin-Vergabe, Protokoll, Statistik | umgesetzt |
| Meilensteine | umgesetzt |
| PayPal, Preise in Euro, Kauf-Wortlaut | auf deinen Wunsch entfernt: Anfrage in Token mit Freigabe durch die Spielleitung |
| Freiwillige Unterstützung | auf deinen Wunsch entfernt |
| Fertige PNG-Artworks | Alle 280 Skins haben eine gezeichnete Lackierung auf der Seitenansicht ihres Modells. Gemalte Grafiken kann ich nicht erzeugen; die Schnittstelle dafür steht (Abschnitt 5). |

## 8. Hinweis

Ich bin kein Anwalt, und das hier ist keine Rechtsberatung. Im Spiel selbst gibt es keinen Kauf, keine Preise in Geld und keine Zahlungsfunktion. Die Bezeichnung „Token“ ändert aber nichts an der rechtlichen Einordnung, falls außerhalb des Spiels doch Geld für eine Freigabe fließt. Dann gelten dieselben Fragen wie bei jedem Verkauf von Zufallsinhalten (Lootboxen, Jugendschutz, Verbraucherrecht, Steuern). Solange Packs nur verschenkt oder für Aktionen im Spiel vergeben werden, stellt sich das nicht.
