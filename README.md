# SKYMARKET Online (Testversion 0.11)

Airline-Wirtschaftssimulation im Browser: 118 Flughäfen weltweit (neu: 14 in Afrika), 24 KI-Airlines und gemeinsame Spiele mit bis zu vier Personen.

- **Anmelden:** Konto mit Benutzername und Passwort.
- **Spiel anlegen:** Name, optionales Passwort, Schwierigkeit und Tempo festlegen. Wer das Spiel anlegt, leitet es und stellt das Tempo ein.
- **Beitreten:** auf drei Wegen:
  - über den **Einladungslink**, ohne Passwort;
  - über den **6-stelligen Code**;
  - über die **Suche nach dem Spielnamen** in der Lobby.

  Bei Code und Suche ist das Passwort nötig, falls eines gesetzt ist.
- **Offline:** Allein spielen geht auch ohne Konto. Der Spielstand bleibt dann im Browser.
- **Neu in 0.10 – übersichtlicher und schneller:**
  - **Konkurrenz einstellbar** (Einfach / Mittel / Stark), unabhängig von der Schwierigkeit:
    - wählbar beim Spielstart und beim Anlegen eines Online-Spiels;
    - im Spiel unter Markt → Wettbewerb änderbar, online nur durch die Spielleitung;
    - wirkt auf Angriffe, Preiskämpfe, Abwerben, Planungsgenauigkeit und Kosten der KI.
  - **Strecke in einem Schritt:** Die Planung enthält ein „Startpaket“.
    - Fehlt ein Flugzeug, wird es geleast oder gebraucht übernommen.
    - Fehlendes Personal wird nur auf Wunsch mit eingestellt (Häkchen, standardmäßig aus).
    - Der Einsatz wird automatisch geplant.
    - Nach einem Kauf unter Beschaffung bietet das Spiel „Strecke dafür planen“ an.
  - **Dashboard** (Karte → Dashboard), alles auf einen Blick: Ergebnis, Kontostand, Auslastung, Pünktlichkeit, Profitabilität und Auslastung je Strecke, Ergebnis je Monat, Personal gegen Bedarf, Flotte (Nutzung, Ungenutzte, Wartung) sowie Markt und Risiko.
  - **Prognose transparent:**
    - Die Kacheln zeigen den Streckenbeitrag wie später in der Streckenliste. Gegenprobe: etwa 4 % Abweichung bei ausgereiften Strecken.
    - Darunter steht das Ergebnis nach allen Kosten.
    - „So rechnet die Prognose“ erklärt Markt, Anteil, Saison, Anlauf und Unsicherheit und zeigt die Kostenrechnung Zeile für Zeile.
  - **Marktplatz** (Markt → Handel): Anzeigen an alle Airlines.
    - Biete oder suche Flugzeuge (auch „irgendein A320neo bis 10 Jahre“), Personal oder Slots, mit oder ohne Preis.
    - KI-Airlines antworten mit Angeboten in den Eingang. Mitspielende können direkt kaufen oder liefern oder ein Angebot machen.
  - **Eigene Flugzeuge klar erkennbar:**
    - Die Flottenliste zeigt je Flugzeug „Crew besetzt“, „Crew teils Agentur“ oder „Crew fehlt“ sowie „Reserve in HAM“ oder „bereit ohne Strecke“, dazu oben eine Zusammenfassung.
    - Auf der Karte haben die eigenen Flugzeuge einen Ring. Ihre Flugzeugkarte zeigt „Ihr Flugzeug“ und die Crew-Lage.
  - **Gleiche Muster, gleiche Crews:**
    - Wettbewerb lässt sich nach Musterfamilie filtern („Gleiche Muster wie ich“).
    - Beim Abwerben stehen die Airlines mit der passenden Familie oben.
    - Piloten werden je Familie eingestellt (Typ-Rating, Umschulung möglich). Flugbegleiterinnen und Technik arbeiten auf allen Mustern.
  - **Tempo:** neu „1 Tag = 1 Min.“ (läuft wie die langsamen Stufen auch offline weiter). Den Echtzeit-Modus (1 Tag = 24 Std.) gibt es nicht mehr; laufende Spiele damit gehen automatisch auf 1 Tag = 1 Std.
  - **Datenblatt je Flugzeugmuster:** Jeder Mustername (Flotte, Beschaffung, Gebrauchtmarkt, Auktionen, Strecken, Flugzeugkarte, Planung) lässt sich anklicken. Das Datenblatt zeigt Sitzplätze, Reichweite, Geschwindigkeit, Crew, Verbrauch, Kosten und die größten erreichbaren Märkte mit Distanz und Blockzeit.
  - **Flughafen-Karte:** Ein Klick auf einen Flughafen zeigt direkt auf der Karte das Reisepotenzial zur eigenen Basis (beide Richtungen, Mix, Saison), Distanz, Bahn, Konkurrenz und die größten Märkte ab dort. Daraus geht es direkt in die Planung.
  - **Flugdistanz überall:** Die Planung, die Streckenliste und die Übersicht zeigen Distanz und Flugzeit. Auf der Karte trägt die geplante bzw. aufgeklappte Strecke ein Schild mit km und Stunden.
  - **Crew nach Auslastung statt je Strecke (ab 0.11 nach Blockstunden):**
    - Ein Pilot oder eine Flugbegleiterin fliegt im Schnitt 3 Blockstunden am Tag (Ruhezeiten, freie Tage, Urlaub, Krankheit – rund 1.100 im Jahr; die EU erlaubt höchstens 900, das Spiel rechnet also großzügig).
    - Bedarf je Flugzeug = Cockpitplätze × Blockstunden ÷ 3, Kabine ebenso, mindestens eine volle Besetzung. A320 mit 5 h am Tag: rund 4 Piloten und 7 Flugbegleiterinnen; mit 10 h: 7 und 14; mit 12 h: 8 und 16.
    - Piloten einer Musterfamilie und die Kabine teilen sich die ganze Flotte; aufgerundet wird erst in der Summe. Zwei A320 mit je 5 h brauchen zusammen 7 Piloten statt 8.
    - Die Planung zeigt nur den Mehrbedarf, den eine neue Strecke tatsächlich auslöst.
    - Unter Personal steht eine Übersicht „Crew je Flugzeug“.
  - **Fachkräfte geprüft:** Alle Wirkungen sind nachgemessen. Die Finanzfachkraft erhöht die Kreditlinie jetzt wirklich um +25 / +50 / +100 %. Der Text zum Revenue Management wurde berichtigt.
  - **Leistung:** Der Spieltag rechnet etwa 30 % schneller, die Rechenspitze am Monatsende ist halbiert.
- **Neu in 0.9 – härter und vernetzter:**
  - **Schwierigkeit:** weniger Startkapital (leicht 25, normal 16, schwer 10 Mio. €). Mehr und stärkere Schocks, darunter Handelskriege, Ölkrise, Luftraumsperren, CO₂-Abgabe, Gebührenerhöhungen und Währungskrisen. Dazu ein regional versetzter Konjunkturzyklus.
  - **Keine Preisautomatik mehr:** Die Preise führen Sie selbst. Die Planung macht einen Vorschlag aus der Prognose.
  - **Aggressive Konkurrenz:** KI-Airlines greifen profitable Strecken von Spielenden mit mehr Frequenz und Kampfpreisen an. Pleite gegangene Airlines werden durch Neugründungen ersetzt.
  - **Geteilte, begrenzte Märkte:**
    - Arbeitsmarkt je Monat für alle zusammen. Viel Einstellen verknappt ihn, Löhne steigen.
    - Ab 0.11 deutlich größer: Grundstock 400 Piloten, 1.500 Flugbegleiterinnen, 500 Techniker pro Monat, plus 60 / 220 / 70 je menschlicher Airline; je Airline höchstens 120 / 400 / 120 pro Monat. Nur ein ausgerufener Pilotenmangel oder massives Einstellen vieler Airlines verknappt ihn spürbar.
    - **Gründungsphase:** In den ersten 60 Tagen einer Airline fangen neue Leute nach höchstens 5 Tagen an. So ist Personal am Anfang kein Engpass.
    - **Wartezeit danach (seit 0.11 halbiert):** Piloten 14 Tage, Flugbegleiterinnen 6, Technik 9 – kürzer mit Personal-Fachkraft, bei angespanntem Markt länger, aber höchstens +50 % (Piloten also nie mehr als 21 Tage). Abgeworbenes Personal fängt nach 7 Tagen an. Früher konnten es bei knappem Markt bis zu 100 Tage werden; ältere Spielstände werden beim Laden auf die neue Höchstdauer gekappt.
    - Unter Personal steht je Gruppe eine Liste der Einstellungsschübe, je Antrittstag eine Zeile – z. B. „5 kommen am 19. Mär · in 8 Tagen“, darunter „10 kommen am 22. Mär · in 11 Tagen“.
    - Online zeigt der Crew-Status jetzt die tatsächliche Deckung (vorher stand dort nach dem Laden fälschlich „Crew besetzt“, auch wenn Agenturpersonal flog).
    - Leasinggeber mit begrenztem Bestand je Typ. Ausverkauft heißt: kein Leasing. Viele Bestellungen verlängern die Lieferzeit.
    - Kerosin: Große Absicherungen treiben Termin- und Tagespreis für alle.
  - **Auktionen:** frühe Lieferpositionen per verdecktem Gebot. Neue Muster (A321XLR, 777-9) gibt es im ersten Jahr nur dort.
  - **Zölle:** Handelsblöcke. Zölle senken Geschäftsreisen zwischen Blöcken und verteuern Flugzeuge vom Hersteller des anderen Blocks.
  - **Personal und Fachkräfte abwerben**, auch bei Mitspielenden; die KI wirbt ebenfalls ab. Löhne relativ zum Marktlohn.
  - **Akademien:** Flugschule, Kabinenakademie und Technikschule finanziell fördern, dann kommt monatlich eigener Nachwuchs.
  - **Kooperationen im Handel:** Codeshare auf einer Strecke oder Allianz mit 2 % Kerosinrabatt.
  - **Strengere Kreditlinien als Dispo:** Die Linie hängt an Umsatz, Anlagevermögen und Bankenstimmung. Das Konto darf bis zur Linie ins Minus; Käufe, Leasing, Gebote und Handel sind bis „Kontostand + freier Dispo“ möglich. Der Kontostand wird wie bei der Bank netto angezeigt, also negativ im Dispo. Kürzt die Bank die Linie, wird der Überhang eingezogen. Wird auch der Dispo überzogen und bleibt 30 Tage so, folgt die Insolvenz.
  - **Meilensteine** je Spieler mit Punkten und Rangliste.
  - **Zwei Einzelberater**, die es pro Welt nur einmal gibt (Unternehmen → Personal):
    - **Tim Kaminski:** der Beste, wirkt in allen Bereichen über Expertenniveau. 260 Tsd. €/Monat plus 450 Tsd. € Antrittshonorar.
    - **Luis Perez:** etwas schwächer (Expertenniveau in allen Bereichen), dafür 85 Tsd. €/Monat plus 120 Tsd. €. Spezialist für Flugzeuge ab 8 Jahren:
      - sieht den verborgenen Zustand jedes Gebrauchtangebots;
      - Gebrauchtkauf und -leasing 10 % günstiger;
      - eigene ältere Flugzeuge verkaufen zum vollen Buchwert statt 92 %;
      - im Handel werden ältere Flugzeuge zu Ihren Gunsten bewertet.
    - Die KI wirbt beide ab und holt sie, wenn sie frei sind.
  - **Gebrauchtmarkt mit verborgenem Zustand:** Verbrauchte Maschinen verhalten sich wie deutlich ältere (mehr Kerosin, Wartung, Ausfälle). Ohne Gutachter sehen Sie nur Alter und Preis, mit einer Technik-Fachkraft ab Senior eine grobe Schätzung.
  - Länder ohne Nachfrage werden auf der Karte **ausgegraut**.
  - „Flugbegleiterinnen“ statt „Flugbegleiter“.
  - **Rundgang zum Start:** Zu Beginn jeder Runde zeigt die Assistenz in zehn kurzen Schritten, wo was zu finden ist. Die gezeigte Stelle ist hervorgehoben, den Rundgang kann man überspringen. Er kommt einmal je Spiel und Browser und lässt sich über das Menü oder „Erste Schritte“ wiederholen.
  - **Planung:** Eigene Flugzeugtypen stehen in der Typauswahl oben unter „Ihre Flugzeuge“ (★) und darunter als fette Schnellwahl-Knöpfe.
  - **Bedienung:** Die Bereichsleiste (Karte, Flotte, Strecken, Finanzen, Markt, Unternehmen) sitzt direkt über dem rechten Block. Der Block lässt sich an seinem linken Rand breiter oder schmaler ziehen; Doppelklick stellt die Standardbreite wieder her. Die Breite merkt sich der Browser.
  - **Handy:** Unter 760 px Breite bleibt die Kopfzeile mit Uhr, Pause/Weiter und Tempo oben fest, die sechs Bereiche liegen als Leiste unten am Daumen. Die Unterreiter scrollen seitlich und bleiben beim Scrollen sichtbar. Ein Bereichswechsel springt direkt zum Inhalt (Karte: nach oben). Tabellen scrollen seitlich statt die Seite zu verbreitern, Kacheln stehen zweispaltig, Flottenzeilen untereinander. Dialoge (Datenblatt, Angebote) öffnen als Blatt von unten, die Flughafenkarte bleibt kompakt mit festen Knöpfen. Eingabefelder haben 16 px, damit iOS beim Antippen nicht hineinzoomt. Das Design (hell/dunkel) wechselt man dort im Menü hinter dem Kürzel oben rechts.
- **Neu in 0.8:**
  - **Chat** im Mehrspieler: an alle oder privat an eine Airline (Sprechblasen-Symbol oben, Zähler für Ungelesenes). Gespeichert in einem eigenen Blob je Spiel (letzte 300 Nachrichten).
  - **Logo gestalten** (Unternehmen → Profil & Logo): Form, Symbol und zwei Farben, aus Vorlagen oder frei. Erscheint in Seitenleiste, Menü, Handel, Mitspielerliste und auf dem Leitwerk.
  - **Design-Schalter** oben (Automatisch, Dunkel, Hell). Automatisch folgt bei langen Spieltagen (1 Std., 10 Min.) der Tageszeit, sonst dunkel.
  - **Basen schließen** (Unternehmen → Stationen): Strecken ab dort werden eingestellt, Flugzeuge an eine andere Basis verlegt.
  - **Fehlerbehebung Langstrecke:** Dauert ein Umlauf länger als das Betriebsfenster (z. B. BCN–LAS, 27,6 h), braucht der tägliche Flug zwei Flugzeuge. Mit nur einem fliegt die Strecke jetzt im Teilbetrieb jeden zweiten Tag statt gar nicht; Planung, Strecke und Assistenz erklären das.
- **Einsatzplan** (Flotte → Einsatzplan): Flugzeuge automatisch einsetzen, festen Strecken zuweisen oder als Reserve vorhalten. Grenzen: gleiche Basis, gleicher Typ wie die Strecke, höchstens 17 Stunden am Tag, nicht mehr Umläufe als die Frequenz; Langstrecke belegt ein Flugzeug ganz. Strecken lassen sich auf einen anderen Flugzeugtyp umstellen (Umflottung).
- **Neu in 0.7 – Handel zwischen Airlines** (Markt → Handel), mit KI-Airlines und Mitspielenden:
  - Flugzeuge samt Leasingvertrag bzw. Kredit und Kaution, Personal (Piloten je Musterfamilie, Flugbegleiterinnen, Technik), Slots an koordinierten Flughäfen, Geld.
  - Streckenrückzug mit Wettbewerbsverzicht (6, 12 oder 24 Monate), wahlweise mit Übergabe der Slots.
  - KI-Airlines antworten sofort: annehmen, ablehnen oder Gegenangebot. Sie machen zum Monatswechsel auch eigene Vorschläge.
  - Mitspielende sehen Angebote im Eingang und können annehmen, ablehnen oder ein Gegenangebot schicken. Angebote gelten 14 Spieltage.
  - Slot-Reserve: Wer an einem koordinierten Flughafen Flüge streicht, behält die Slots 180 Tage (per Handel erworbene 365 Tage).
- **Neu in 0.6:**
  - Oberfläche im SKYMARKET-Design mit sechs farbcodierten Bereichen: Karte (blau), Flotte (grün), Strecken (violett), Finanzen (orange), Markt (pink), Unternehmen (türkis), jeweils mit Unter-Tabs.
  - **Echtzeit-Modus** (seit 0.10 entfernt) für Langzeitspiele: 1 Spieltag = 24 Stunden, die Spieluhr läuft mit der Ortszeit. Dazu „1 Tag = 1 Std.“ und „1 Tag = 10 Min.“.
  - **Assistenz:** Zum Start wählt jede Person Lena, Marco, Aiko oder Samuel. Die Assistenz gibt Hinweise, erinnert und meldet Ereignisse und Monatsberichte.

## Admin

Der Benutzer **Tim** (Groß-/Kleinschreibung egal) ist Admin. In der Lobby sieht er unter „Verwaltung · alle Spiele“ jedes Spiel, auch passwortgeschützte und volle. Er kann jedem offenen Spiel ohne Passwort beitreten und jedes Spiel löschen.

- **Wichtig:** Das Konto „Tim“ gleich nach dem Deploy registrieren. Wer den Namen zuerst anlegt, hat die Rechte.
- **Andere Admins:** In Netlify unter *Site configuration → Environment variables* `ADMIN_USERS` setzen, z. B. `tim,anna`. Danach neu deployen. Die Variable ersetzt die Vorgabe, „tim“ muss also mit drinstehen.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `public/index.html` | Fertig gebaute Seite. Spiel, Karte, Lobby und Anmeldung stecken in einer Datei. |
| `netlify/functions/api.mjs` | Netlify Function für alle Aufrufe unter `/api/*`. |
| `netlify/functions/tick.mjs` | Stündliche Scheduled Function: schreibt die Hauptwelt fort, auch ohne Besuch. |
| `server/api.mjs` | Konten, Spiele, Zeitfortschritt und Aktionen. Der Server hält den maßgeblichen Spielstand. |
| `server/memstore.mjs` | Speicher-Ersatz für lokale Tests. Er verhält sich wie Netlify Blobs, inklusive Versionsprüfung. |
| `shared/engine.cjs` | Wirtschaftskern. Browser und Server nutzen dieselbe Datei. |
| `src/` | Quellen der Oberfläche (`shell.html`, `app.js`) und der Weltkarte (`world.json`). |
| `scripts/build.mjs` | Baut `public/index.html` aus `src/` und `shared/`. |
| `scripts/smoke-test.mjs` | Prüft den API-Ablauf ohne Netlify. |
| `dev-server.mjs` | Lokaler Testserver ohne Netlify-Konto. |

Die Daten liegen in **Netlify Blobs** im Speicher `skymarket`: Konten, Spiele, Spielstände und Anwesenheit. Eine Datenbank müssen Sie nicht einrichten.

## Auf Netlify veröffentlichen

**Neues Konto oder neues Projekt?** Einfach den kompletten Ordner in ein neues GitHub-Repository hochladen (alle Unterordner, also `netlify`, `public`, `scripts`, `server`, `shared`, `src` und die Dateien im Hauptordner) und dann Weg A gehen. Spielstände und Konten liegen in den Netlify Blobs des jeweiligen Projekts und ziehen nicht mit um – auf dem neuen Projekt beginnt alles frisch, Konten müssen neu angelegt werden. Optional ein eigenes `SESSION_SECRET` setzen (siehe unten).

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

## Hauptwelt (Dauerspiel)

- **Eine Welt für alle:** Jede angemeldete Person kann in der Hauptwelt genau eine Airline gründen (bis zu 60 Airlines, über die Umgebungsvariable `MAIN_MAX_PLAYERS` änderbar). Die Lobby zeigt sie ganz oben mit Spieltag, Zahl der Airlines und zuletzt aktiven Spielern.
- **Läuft immer weiter:** 1 Spieltag = 30 Minuten, also rund 48 Spieltage pro echtem Tag – auch wenn niemand online ist. Die Netlify-Funktion `tick` (Scheduled Function, stündlich) schreibt die Welt fort; zusätzlich holt jeder Aufruf verpasste Tage nach. Das Tempo stellen nur Admins (auch ohne eigene Airline), Spielende können nicht pausieren.
- **Angelegt wird sie automatisch** beim ersten Aufruf der Lobby. Löscht ein Admin sie, entsteht beim nächsten Aufruf eine frische Hauptwelt.
- **Täglich vorbeischauen:** Wer nach drei oder mehr Spieltagen zurückkommt, bekommt einen **Tagesbericht**: Kontostand und Ergebnis im Zeitraum, Passagiere, Flotte, Pünktlichkeit, Liquidität, die wichtigsten Warnungen, offene Entscheidungen und Handelsangebote sowie den Rat der Assistenz. Das gilt auch für private Runden und das Offline-Spiel.
- Neu: Tempostufe **„Dauerspiel (1 Tag = 30 Min.)“**, auch für private Runden wählbar (dort jetzt die Vorgabe).

## Mitspielende im Überblick

- **Markt → Mitspielende** (nur online): je Airline eine Karte mit Spielername, Airline und Kürzel, online bzw. „zuletzt vor …“ sowie drei Kennzahlen – **Eigenkapital** (mit Entwicklung seit Start), **Ergebnis der letzten 30 Tage** (mit Marge) und **Auslastung** (mit Passagieren pro Tag). Darunter Flotte, Strecken, Basis, Pünktlichkeit und die Knöpfe „Handel“ und „Nachricht“.
- Sortierbar nach Eigenkapital, Ergebnis, Auslastung oder Passagieren; ab neun Airlines mit Suche nach Airline oder Name, in der Hauptwelt zunächst die ersten 24.
- Die Übersicht (Karte → Übersicht) zeigt dieselben drei Kennzahlen kompakt für bis zu acht Airlines, auf dem Handy mit kurzen Zahlen (z. B. „14,8 Mio.“).
- Handy: Oben steht jetzt das Datum statt „Tag 8“; der Spieltag steht im Tooltip und auf großen Bildschirmen weiter unter der Uhr.

## Neustart nach der Pleite

- Ist die Airline insolvent, bietet das Insolvenz-Fenster **„Neue Airline gründen“**: neuer Name, neues Kürzel, neue Heimatbasis, volles Startkapital – in **derselben Welt**, Markt und Konkurrenz laufen weiter. Das gilt in der Hauptwelt, in privaten Runden und im Offline-Spiel.
- Freiwillig geht es auch: **Unternehmen → Profil & Logo → „Airline aufgeben und neu gründen“** (mit Bestätigung).
- Die alte Airline wird abgewickelt: Leasingflugzeuge gehen an die Leasinggeber zurück, Strecken, Personal, Slots, offene Angebote, Kooperationen und Auktionsgebote verfallen. Die Assistenz bleibt.
- Frühere Airlines stehen mit Zeitraum, Passagieren und Eigenkapital am Ende im Profil.

## So funktioniert ein gemeinsames Spiel

- **Der Server rechnet, der Browser zeigt an.**
  - Jede Aktion (Flugzeug leasen, Strecke eröffnen, Personal einstellen …) wird lokal sofort geprüft und angezeigt.
  - Gleichzeitig geht sie an den Server. Er rechnet sie mit derselben Engine nach und ist maßgeblich.
- **Zeit:**
  - Wer das Spiel leitet, wählt das Tempo: 1 Tag = 1 Std., 1 Tag = 30 Min., 1 Tag = 10 Min., 1 Tag = 1 Min. oder die schnellen Stufen 1×, 2×, 4× (1× = 1 Tag in 12 Sekunden).
  - **Langsame Stufen laufen auch ohne Spielende weiter.** Der Server holt beim nächsten Aufruf die verpasste Zeit nach (bis zu 400 Tage, höchstens 30 Tage je Anfrage).
  - Bei den schnellen Stufen holt der Server ohne Spielende höchstens eine Minute nach. Das Spiel läuft also nicht ohne Sie davon.
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
