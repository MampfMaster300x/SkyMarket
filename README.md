# SKYMARKET Online (Testversion 0.14)

Airline-Wirtschaftssimulation im Browser: 211 Flughäfen auf allen Kontinenten, 30 KI-Airlines, eine dauerhafte Hauptwelt für alle (bis 60 Airlines) und private Runden mit bis zu vier Personen.

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

**Verwalten** (Lobby: Knopf „Verwalten“ an der Hauptwelt und an jedem Spiel; im Spiel: Mitspielende → „Verwaltung“) – auch ohne eigene Airline in der Welt:
- **Airline entfernen** – sofort: Strecken enden, Leasingflugzeuge gehen an die Leasinggeber zurück, Slots, Gates, Handelsangebote, Kooperationen und Gebote verfallen. Die Person kann neu beitreten – außer mit **„Entfernen + sperren“**. Gesperrte stehen in einer Liste mit „Sperre aufheben“.
- **Ereignisse annullieren** – in der Liste aller laufenden und angekündigten Ereignisse oder direkt an der Meldung („Annullieren“, nur für Admins sichtbar, mit Rückfrage). Angekündigte fallen aus, laufende enden sofort; Ticketsteuer, Entgelte, CO₂-Abgabe, Leitzins, Wechselkurs und Kerosinsprung werden zurückgenommen, Zölle neu berechnet, die Konjunktur nach einer Rezession entsprechend angehoben. Alle sehen eine Meldung „Spielleitung annulliert: …“.
- **Kapital buchen** – ± bis 100 Mio. € je Airline, z. B. um einen Fehler auszugleichen (als Eigenkapitalbewegung).
- **Tempo einstellen** – in der Verwaltung, auch ohne eigene Airline in der Welt: von „1 Tag = 1 Stunde“ bis zu den schnellen Stufen. Gilt sofort für alle, alle sehen eine Meldung. (Hauptwelt: nur Admins; private Spiele: Spielleitung und Admins.)
- **Welt neu starten** – Tag 1, neue Weltlage und Konkurrenz. Mit „Alle Mitspielenden behalten“ beginnen alle Airlines mit Name, Kürzel, Basis und Logo von vorn, sonst müssen alle neu beitreten. Die Hauptwelt kann nur der Admin neu starten.
  - **Mit Starttermin** (Feld „Start“, bei der Hauptwelt ist der nächste Freitag, 12:00 Uhr vorgeschlagen) und **Tempo nach dem Start** (Hauptwelt: 1 Tag = 20 Min.): Bis zum Termin steht die Uhr. Alle können sich anmelden, Logo, Name und Heimatbasis festlegen und Strecken vorplanen; Flugzeuge, Strecken und Personal gibt es erst ab dem Start – für alle gleichzeitig.
  - Solange der Start geplant ist, zeigt die Verwaltung **„Termin ändern“** und **„Jetzt starten“**.
- In privaten Spielen kann auch die **Spielleitung** (wer das Spiel angelegt hat) Airlines entfernen, sperren, Ereignisse annullieren und Kapital buchen.

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
npm test             # API-Ablauf prüfen (Konten, Passwort, Einladung, Zeit, Aktionen, max. 4, Hauptwelt, Neustart, Studien)
```

Mit `npx netlify-cli dev` läuft es auch lokal mit dem echten Netlify-Stack, inklusive Blobs-Emulation.

## Neu in 0.18.1: Betriebslizenz nach Größenklasse

- Die Lizenz für eine Basis ist jetzt nach Größe gestaffelt: klein (bis 8 Mio. Pax) 20–100 Tsd. €, mittel (8–20) 100–500 Tsd. €, groß (20–50) 1–2 Mio. €, Drehkreuz (über 50) 2,5–4 Mio. €. Beispiele: Bremen 36 Tsd., Belgrad 100 Tsd., Hamburg 333 Tsd., Düsseldorf 500 Tsd., Berlin 1,17 Mio., München 1,73 Mio., Frankfurt 2,89 Mio., London-Heathrow 3,52 Mio., Atlanta 4 Mio. Slotpreise unverändert.
- Schlupfloch geschlossen: Wer an einem Flughafen schon eine Station hat (weil er ihn anfliegt), bekommt beim Basisausbau nur die Stationsgebühr angerechnet statt die ganze Lizenz zu sparen.

## Neu in 0.18.0: Börse ohne Schlupfloch, mehr Konkurrenz, Flughäfen geprüft

- **Börsenwert neu:** Eigenkapital plus 5 × operatives Jahresergebnis (Schnitt der letzten bis zu 12 abgeschlossenen Monate, ohne Sondereffekte und ohne Beteiligungserträge, die schon im Buchwert stecken; Verluste zählen doppelt), mindestens 60 % des Eigenkapitals. Der Kurs wird nur zum Monatswechsel festgestellt und bewegt sich höchstens +25 %/−20 % je Monat. Kapitalerhöhungen, Rückkäufe, Dividenden und Kapitalkorrekturen der Spielleitung verschieben ihn sofort um das bewegte Geld. Damit hängt er nicht mehr am Tagesergebnis.
- **Kein Kreislauf mehr aus „teuer ausgeben – Ergebnis drücken – billig zurückkaufen“:** Rückkauf 180 Tage nach einer Kapitalerhöhung gesperrt (und umgekehrt), höchstens 10 % je 90 Tage, Rückkaufpreis nie unter dem höchsten Monatskurs der letzten sechs Monate. Nachgestellt: 20 % für 460 Mio. ausgegeben, Ergebnis per Übernahme gedrückt – der Rückkauf ist gesperrt und später teurer als der Erlös.
- **Aktienkauf ohne Aufschaukeln:** Jedes Paket kostet den Börsenkurs plus einen Mengenaufschlag (je 10 % rund 3 %), eine Kontrollprämie von 25 % nur auf die Anteile, mit denen man die Mehrheit überschreitet. Vorher wurde jedes weitere 5-%-Paket teurer, weil der bisherige Anteil mit eingerechnet wurde.
- **Bilanz vollständig:** Slots, Beteiligungen, Anleihen und gestundete Raten stehen jetzt in der Bilanz (vorher fehlten sie, die Summen passten nicht zu den Zeilen).
- **Astana und Zentralasien:** Astana auf 4,5 Mio. Passagiere (−25 % Nachfrage). Kasachstan und Usbekistan: starke Bindungen nach Russland, in die Türkei und den Kaukasus, kaum Direktverkehr nach Ost- und Südostasien, Amerika und in die Golfstaaten außer den Emiraten.
- **Flughäfen geprüft:** Regionen und Länder stimmen; Passagierzahlen an aktuelle Werte angepasst bei Shanghai-Pudong (77), Guangzhou (76), Peking (67), Shenzhen (61), Chengdu-Tianfu (50), Peking-Daxing (50), Hangzhou (43), Shanghai-Hongqiao (44), Hongkong (53), Tokio-Haneda (85), Tokio-Narita (33), Busan (11), Kuala Lumpur (57), Istanbul-Sabiha (42).
- **KI-Neugründungen:** Die Welt wächst um bis zu zwölf KI-Airlines, etwa alle zwei bis drei Monate eine – bevorzugt in Ländern ohne KI-Basis und in Regionen mit wenig Konkurrenz im Verhältnis zum Verkehr (Asien, Lateinamerika, Afrika). Namen passen zur Region (Steppe Air in Kasachstan, Mekong Air in Vietnam, Pampa Air in Argentinien …), die Art zur Stadt (Ferienflieger an Urlaubszielen, Regionalairlines an kleinen Flughäfen). Bestehende KI-Airlines eröffnen häufiger weitere Basen (Low-Cost bis 4, Premium bis 3, Ferien- und Regionalflieger bis 2), nicht in politisch verfeindeten Ländern. 13 neue Airline-Farben.

## Neu in 0.17.11: Startbasis leichter ändern, Kapitalkorrektur bis 999 Mio.

- **Startbasis ändern:** Unter Unternehmen → Profil & Logo gibt es oben die Karte „Name, Kürzel und Heimatbasis“ mit „Name und Basis ändern“ – bis zum Start der Welt (und danach, solange noch kein Flugzeug, keine Strecke und keine Beteiligung da ist). Vor dem Start steht zusätzlich in der linken Spalte unter dem Airline-Namen „Basis ändern“. Der Dialog nutzt die Basisauswahl mit Filtern und Eröffnungskosten.
- **Spielleitung:** Kapitalkorrektur je Buchung jetzt bis ±999 Mio. € (vorher ±100 Mio.).

## Neu in 0.17.10: Eröffnungskosten auf einen Blick, kein Rabatt an großen Flughäfen

- **Basisauswahl:** Rechts neben dem Flughafen steht groß „Bei Eröffnung fällig“ (Lizenz + 3 Basis-Slots) mit Aufschlüsselung und den laufenden Kosten pro Monat. In der Liste steht statt der Lizenz jetzt „Eröffnung“ (Gesamtbetrag), die Sortierung „Eröffnungskosten“ sortiert danach.
- **Anlaufrabatt nur bis mittlere Flughäfen:** Große Flughäfen und Drehkreuze (über 20 Mio. Passagiere) geben keinen Anlaufrabatt mehr (vorher mindestens 8 %). Kleine und mittlere bleiben bei 15–50 %. Die Basisauswahl zeigt „Anlaufrabatt: keiner“.

## Neu in 0.17.9: Konzernvorteile bei Beteiligungen

Beteiligungen an KI-Airlines bringen jetzt gestaffelte Vorteile – deutlich weniger als eine Übernahme, bei der alles übergeht:
- **ab 25 % (Sperrminorität):** Die Airline greift Ihre Strecken nicht an (wie bisher); im Handel verlangt sie nur den halben Aufschlag.
- **ab 50 % (Mehrheit):** Konzernallianz mit Codeshare und 2 % günstigerem Kerosin (wie bisher). Neu: Die Tochter eröffnet keine Strecken auf Ihren Verbindungen und unterbietet Ihre Preise nicht. Sie handelt mit Ihnen zum fairen Wert ohne Aufschlag (Flugzeuge, Slots, Crews), auch Low-Cost-Töchter. Sie bestimmen die Ausschüttung vom Monatsgewinn (0/30/60/90 %) und können alle 90 Tage eine Sonderausschüttung verlangen: 20 % der freien Liquidität über der Betriebsreserve, jeder Aktionär bekommt seinen Anteil.
- **100 % (Übernahme):** wie bisher – Flotte, Strecken, Basen und Personal gehen über.
- In der Börse zeigt jede Beteiligung an einer KI-Airline Monatsergebnis, Kasse, Flotte, Strecken und Basen der Tochter, welche Vorteile aktiv sind und die Steuerung (Ausschüttung, Sonderausschüttung, Konzernhandel).

## Neu in 0.17.8: Kalender oben links, Dschidda halbiert

- **Kalender:** Oben links neben dem Logo steht der nächste wichtige Termin („10. Mai · Hadsch, in 16 Tagen“); ein Klick öffnet einen Monatskalender mit Markierungen und einer Liste der nächsten 120 Tage. Enthalten: Slotvergaben (1. April, 1. Oktober), alle öffentlich bekannten Großereignisse (WM, Olympia, Hadsch, Oktoberfest, Karneval …, mit Ort und Dauer), angekündigte Ereignisse aus den Nachrichten und eigene Termine (Lieferungen, Charterbeginn und -ende, Werft fertig, Marktstudien, neue Crews, Erstflüge, Antritt von Fachkräften). Arten lassen sich ein- und ausblenden, ein Tag antippen zeigt nur dessen Termine, ein Termin antippen führt zum passenden Reiter. Auf dem Handy als Kalender-Knopf in der Kopfzeile.
- **Dschidda halbiert:** Passagiere (53 → 26,5 Mio.) und Einzugsgebiet (4,5 → 2,25 Mio.) – damit die gesamte Nachfrage ab Dschidda (rund −50 %), dazu Slotkapazität, Lizenz- und Slotpreise. Dschidda liegt jetzt auf dem Niveau von Riad.

## Neu in 0.17.7: Bekannte Köpfe und Bordprodukt

- **Neue Fachrolle „Bordprodukt und Service“** (Junior/Senior/Experte): Kabinenstimmung +3/+6/+9 Punkte, bessere Wahrnehmung vor allem bei Geschäftsreisenden (+4/+7/+10 %), dafür Catering 12/24/36 % teurer. Erscheint auch bei normalen Bewerbungen.
- **Drei bekannte Köpfe der Branche** bewerben sich zu bestimmten Zeiten (Meldung im Nachrichtenticker), bleiben rund 75 Tage auf dem Markt und kommen später wieder, solange sie niemand angestellt hat. Sie sind keine Garantie: Leistung schwankt monatlich, Abwerbung durch KI-Airlines ist möglich (Halteprämie und Wettbewerbsverbot schützen).
  - **Lukas Flitz** – Operations (OCC), Experte, 19 Jahre, ehemals Leiter der Verkehrszentrale eines Ferienfliegers. Liefert zuverlässig über Zusage (rund 112 %). Persönliche Stärke: Bodenzeiten an allen Stationen 4 Minuten kürzer. Ab etwa Februar im Spiel.
  - **Marten Grillkalt** – Einkauf, Junior, 3 Jahre, „bleibt in jeder Verhandlung eiskalt“. Günstig, liefert deutlich über Junior-Niveau (rund 118 %) und wird nach einem Jahr im Haus Senior – Wirkung und Gehalt steigen dann. Ab etwa März.
  - **Philipp Peter Son** – Bordprodukt und Service, Experte, 22 Jahre, ehemals Catering und Kabinenkonzept einer Premium-Airline. Persönliche Stärke „Sterneküche an Bord“: Business- und First-Gäste zahlen 5 % mehr, Stimmung zusätzlich +3 Punkte. Ab etwa April.
- Bekannte Köpfe stehen in den Bewerbungen oben und sind hervorgehoben; ihre persönliche Stärke steht auf der Karte. Abgelaufene Bewerbungen werden nicht mehr angezeigt.

## Neu in 0.17.6: Charter-Flotte mit Kalender

- **Charter-Pool:** Unter Flotte → Charter (oder im Einsatzplan als Einsatzart „Charter-Pool“) schiebt man einzelne Flugzeuge ins Chartergeschäft. Sie fliegen dann keine eigenen Strecken mehr und stehen nur für Charteraufträge bereit; „zurück in den Linienflug“ holt sie wieder ins Netz.
- **Mehrere Aufträge je Flugzeug:** Ein Flugzeug kann jetzt mehrere Charteraufträge hintereinander haben. Überschneidungen werden abgelehnt (mit Datum des kollidierenden Auftrags). Vorher konnte ein späterer Auftrag einen laufenden versehentlich überschreiben. C-Checks starten nicht kurz vor einem gebuchten Auftrag.
- **Charterkalender:** Zeitleiste über 2, 4 oder 8 Monate für alle Pool-Flugzeuge und alle Flugzeuge mit Charter: gebuchte Aufträge (Großereignisse hervorgehoben), Werft und Lieferung, freie Zeiträume und Großereignisse als Marker. Je Flugzeug steht, wie viel des Zeitraums gebucht ist, darunter die freien Zeiträume als Knöpfe.
- **Anfragen filtern:** nach Flugzeug, Familie, „passt in freie Zeiträume“, „nur Großereignisse“; sortieren nach Beginn, Gesamterlös, Tagesrate oder Dauer. Ein Klick auf einen freien Zeitraum zeigt nur Anfragen, die genau hineinpassen. Jede Anfrage zeigt ihre Lage im Kalender und je passendem Flugzeug Tagesrate, Netto pro Tag, Gesamterlös und einen eigenen Buchungsknopf.
- Steht ein Pool-Flugzeug ohne Auftrag, weist die Assistenz mit der Zahl passender Anfragen darauf hin.

## Neu in 0.17.5: Basis-Slots, Reiter „Slots“, Studien je Basis

- **Drei Slots pro Basis:** Wer eine Basis eröffnet (auch die Heimatbasis beim Start), kauft dort drei Slots mit – garantiert verfügbar, auch an vollen Flughäfen. Der Festpreis wächst mit der Größe: Bremen rund 19 Tsd. €, Hannover 50 Tsd. €, Hamburg 135 Tsd. €, Frankfurt 570 Tsd. €, London 756 Tsd. €. Die Basisauswahl zeigt „3 Basis-Slots“ und „Start gesamt“, der Knopf „Basis eröffnen“ den Gesamtpreis inkl. Slots. Laufende Welten: Fehlende Basis-Slots werden beim nächsten Laden zugeteilt (zum Basispreis, ohne Kosten, wenn das Geld nicht reicht).
- **Strecken → Slots:** Neuer Reiter mit dem nächsten Vergabetermin und einer Übersicht (Flughäfen mit Warteliste, angefragt/vergeben, Ihre voraussichtliche Zuteilung). „Slots sichern“ funktioniert ohne Streckenplanung: Flughafen per Code oder Name eintippen, Anzahl wählen – sofort kaufen, soweit frei, sonst auf die Warteliste, mit Platz und Prognose für den Termin. Jeder eigene Flughafen ist eine Karte mit genutzten Slots, Reserve, freien Slots, „am Termin zu vergeben“ und aufklappbarer Wartelisten-Reihenfolge mit allen Airlines.
- **Marktstudien je Basis:** Bei Streckenanalyse und Flugzeugbeschaffung wählt man per Antippen, ab welchen Basen gesucht wird. Der Link im Planer bereitet eine Streckenanalyse ab der gerade gewählten Basis vor. Auch „Chancen ab Ihren Basen“ lässt sich je Basis ein- und ausblenden.
- **Scrollen im Planer:** Beim Neuzeichnen (online bei jedem Serverstand) sprang die Planung nach oben, weil die Prognose erst danach gefüllt wurde. Jetzt bleibt die Position in allen Reitern und Fenstergrößen.
- **Handel:** Der Verlauf abgeschlossener Angebote ist eingeklappt und lässt sich aufklappen; die Einstellung bleibt erhalten. Gekaufte Slots in der Reserve zeigen „unbefristet“ statt eines Fantasiedatums.

## Neu in 0.17.4: Feste Slottermine, Reiter „Pläne“, flüssiger auf 4x

- **Slotvergabe zu festen Terminen:** Nur noch zum 1. April (Sommerflugplan) und 1. Oktober (Winterflugplan). Dann bekommt jeder koordinierte Flughafen einen Slot dazu, und die Wartelisten werden reihum bedient (je Eintrag ein Slot, dann der Nächste). Freie Slots ohne Warteschlange kann man weiter jederzeit kaufen. Eine Meldung fasst jede Vergabe zusammen und nennt den nächsten Termin.
- **Slot-Übersicht neu:** Unter Strategie → Slots steht oben der nächste Termin mit Countdown und den Regeln in vier Sätzen. Jeder Flughafen ist eine eigene Karte mit freien Slots und Preis, Reserve, Wartelistenplatz („Platz 2 von 5“) und einer **Prognose**, wie viele Slots man beim nächsten Termin voraussichtlich bekommt.
- **Strecken → Pläne:** Neuer dritter Reiter neben Netz und Planung mit allen gespeicherten, noch nicht umgesetzten Strecken und Frequenzerhöhungen: fehlende Slots mit Wartelistenplatz und Prognose, passende Flugzeuge an der Basis, Kosten beim Umsetzen direkt am Knopf, „Im Planer öffnen“, „auf Warteliste setzen“, automatisch umsetzen, löschen. Im Planer gibt es „Als Plan speichern“ jetzt immer. Wartelisteneinträge aus einem Plan hängen am Plan.
- **Kein Springen beim Scrollen:** Während man scrollt, tippt oder ein Feld bearbeitet, wird der Reiter nicht neu gezeichnet; die Aktualisierung kommt kurz danach. Unterreiter, Navigation und linke Spalte werden nur noch neu aufgebaut, wenn sich etwas ändert, und behalten ihre Scrollposition.
- **Weniger Ruckler auf 4x:** Die KI plant nicht mehr alle am Monatsanfang, sondern verteilt über den Monat. Große Marktstudien rechnen in zwei Durchgängen (grob, dann fein), höchstens zwei werden pro Tag fertig. Flugzeuge auf der Karte werden bei großen Netzen seltener neu gezeichnet und gar nicht, wenn die Karte nicht sichtbar ist.
- **Beitreten:** Der Einladungslink zur Hauptwelt funktioniert auch, bevor sie angelegt ist. Nach der Registrierung über einen Link geht es direkt zum Beitritt statt zur Anleitung. Der Knopf „Beitreten“ bleibt in allen Formularen unten sichtbar (auch auf dem Handy), das Kürzel wird schon beim Tippen auf Doppelungen geprüft und ein freies vorgeschlagen, Fehler erscheinen direkt am Knopf.
- **Handel:** Geldbeträge zeigen beim Tippen den formatierten Wert („= 250.000 €“), dazu Schnellwahl 50 Tsd. / 250 Tsd. / 1 Mio. / 5 Mio. Gleiches für Marktplatz-Preise, Auktionsgebote und den Kreditbetrag im Szenario-Rechner.

## Neu in 0.17.3: Saudi-Arabien entschärft, Charter lohnt sich

**Riad, Dschidda und Co.**
- Riad–Dschidda war die einträglichste Strecke im Spiel: riesiger Inlandsmarkt ohne simulierte Konkurrenz, westliche Preise, billiger Treibstoff. Jetzt:
  - **Neue KI-Airline Najd Air** (Billigflieger, Basis Riad) fliegt Riad–Dschidda 5× täglich, dazu Dammam, Medina, Dubai, Kairo und Doha.
  - **Regulierte Inlandstarife** in Saudi-Arabien (Riad–Dschidda rund 80 € statt 94 €), Kerosin dort nur noch 7 % unter Weltmarkt (vorher 15 %).
  - Weniger Inlandsnachfrage auf den vier Flughäfen im Spiel (Saudi-Arabien hat viele weitere Inlandsflughäfen), mehr Umsteiger in Riad.
- Test (Startnetz Riad oder Dschidda, 18 Monate): −3 bis +1 Mio. € statt +3,5 bis +5 Mio. €.

**Charter (Flotte → Charter)**
- **Mehr Anfragen** (sechs im Monat), überwiegend für Muster, die Spielende tatsächlich fliegen; dazu kurze Einsätze (7–14 Tage) mit Aufschlag.
- **Familie reicht**: Eine A320neo kann eine A321neo-Anfrage übernehmen (Rate nach Sitzen angepasst).
- **Rund 12 % höhere Raten**.
- **Großereignisse**: Mit jeder Ankündigung kommen Charteranfragen – Fanreisen und Nationalmannschaften zu WM und EM, Sender und Teams zu Olympia, Pilgerreisen zum Hadsch, Pakete zum Oktoberfest – zu 30–55 % über der üblichen Rate. Wer ein passendes Flugzeug hat, bekommt eine Meldung.
- Die Ansicht zeigt für jedes passende Flugzeug, was der Charter **gegenüber Stillstand** bringt bzw. **nach entgangenem Streckenbeitrag**, wenn das Flugzeug gerade fliegt; Großereignis-Anfragen stehen oben.

## Neu in 0.17.2: Zwischenmaß, Kaufkraft, Großereignisse, Saison, bessere Planung

**Schwieriger als 0.17.1, leichter als 0.17**
- Strecken eröffnen bleibt günstig (Station statt Lizenz, Slots günstig solange frei).
- Zurückgenommen: neue Strecken füllen sich etwas langsamer, Zusatzerlöse (Basic 21 €, Standard 12 €), Garantie-Rabatt auf Wartung 18 %, Anlaufrabatt mindestens 15 % (Drehkreuze 8 %).
- **Kaufkraft**: Auf Kurz- und Mittelstrecke richten sich die Preise nach dem Einkommen (Türkei rund −15 %, Thailand −20 %, Indien −30 %, USA/Skandinavien leicht darüber); auf Langstrecke gleichen sie sich an. Dafür sind Crew und Technik dort günstiger (Türkei rund 62 %, Indien 36 % der deutschen Löhne). Vorher waren Märkte wie Istanbul, Bangkok oder São Paulo viel zu einträglich, weil dort Westpreise bei niedrigen Entgelten galten.
- Test mit festem Startnetz (Dash + A320neo, 18 Monate, Preisautomatik): Hamburg, Istanbul, Madrid und São Paulo liegen jetzt in einer ähnlichen Spanne; wer schlecht plant, verliert Geld.

**Großereignisse nach Kalender** (Monate vorher angekündigt, stark erhöhte Nachfrage zu den Austragungsorten, etwas mehr im ganzen Land)
- Jährlich: Oktoberfest (München), Karneval in Rio, Hadsch (Dschidda, Medina – wandert jedes Jahr rund elf Tage), Chinesisches Neujahr (Familienbesuche in China, Taiwan, Hongkong, Singapur, Malaysia), Großer Preis von Monaco (Nizza).
- 2027 Frauenfußball-WM Brasilien, Cricket-WM Südafrika, Rugby-WM Australien · 2028 Olympia und Paralympics Los Angeles, Fußball-EM Großbritannien/Irland · 2030 Winterspiele Französische Alpen, Fußball-WM Spanien/Portugal/Marokko (Eröffnung in Südamerika), Asienspiele Doha, Expo Riad · 2031 Frauen-WM Nordamerika · 2032 Olympia Brisbane, EM Italien/Türkei · 2034 WM Saudi-Arabien.

**Saison sichtbar**
- Die Streckenplanung zeigt den Saisonverlauf der Strecke (Nachfrage je Monat, Hoch- und Tiefsaison) und angekündigte Ereignisse an beiden Enden.

**Planung**
- **Streckenplanung**: Vorschläge aus Ihren Streckenanalysen für die gewählte Basis (Ziel, Typ, Beitrag laut Studie) – ein Klick übernimmt sie; ohne Studie ein Link zur passenden Marktstudie.
- **Markt → Nachfrage**: neue Tabelle **„Chancen ab Ihren Basen“** – Märkte mit Potenzial, die Sie noch nicht fliegen und auf denen wenig KI-Konkurrenz ist, bewertet nach Ihrem Marktwissen (unsicher, solange nicht studiert), mit „Planen“.
- **Einsatzplan**: Filter nach Flugzeugtyp und Basis, Auslastung der Flotte in Stunden und Hinweis auf kaum genutzte Flugzeuge. Bei festen Zuweisungen stehen passende Strecken (gleiche Basis, gleicher Typ) oben, die übrigen eingeklappt; Strecken mit z. B. 2× pro Woche werden als solche angezeigt und nur anteilig auf die Betriebszeit angerechnet.

**Personal**
- **Gehaltspolitik bleibt relativ**: „+5 % über Markt“ bleibt +5 %, auch wenn die Marktlöhne steigen (vorher galt der Betrag vom Tag der Einstellung).
- **Handel**: Personal lässt sich nur anbieten, soweit es wirklich da ist – die Auswahl zeigt den Bestand, die Menge wird gekürzt, mehrere Posten werden zusammengezählt; auch KI-Angebote werden geprüft.

## Neu in 0.17.1: Aufbau lohnt sich – günstiger starten, schneller rentabel, Konkurrenz schont Angeschlagene

**Strecken eröffnen kostet kein Vermögen mehr**
- Neues Ziel: **Station** statt Betriebslizenz (Madrid rund 90 Tsd. € statt 1,04 Mio. €, Palma 45 Tsd. €, kleine Flughäfen wenige Tausend). Die volle Lizenz gilt nur noch für die Heimatbasis und weitere Basen.
- **Slots** kosten wenig, solange ein Flughafen Platz hat (Hamburg rund 30 Tsd. €, Madrid rund 140 Tsd. €). Teuer wird es erst, wenn weniger als 30 % frei sind – bis zum Sechsfachen.
- Beispiel aus dem Test: Hamburg mit Dash 8 und A320neo, vier Strecken (Palma, Madrid, London-Stansted, Barcelona) – Eröffnung zusammen rund 760 Tsd. € statt 10,4 Mio. €.

**Schneller rentabel**
- Neue Strecken füllen sich schneller (Start bei 50 % der Nachfrage statt 35 %, nach rund drei Wochen weitgehend voll).
- **Anlaufrabatt** auf Entgelte im ersten Jahr jetzt an jedem Flughafen: mindestens 20 % (Drehkreuze über 60 Mio. Passagiere 10 %), kleine Flughäfen bis 50 %, dazu halber Rabatt auf die Abfertigung.
- **Garantie für junge Flugzeuge**: In den ersten zwei Jahren kostet die Wartung neuer oder junger Leasingflugzeuge 25 % weniger.
- Weniger Verwaltung für kleine Airlines, geringerer Aufschlag für Muster über der Phase (A320neo zum Start +15 % statt +50 % Leasingrate), mehr Zusatzerlöse je Gast (Gepäck, Sitzplatz: Basic 24 €, Standard 14 €), etwas geringere Kosten bei Ausfällen.
- Ergebnis im Test (Hamburg, zwei Flugzeuge, ohne weiteres Wachstum): nach 18 Monaten +1,5 bis +3,5 Mio. € Eigenkapital statt Insolvenz nach vier Monaten. Winter und Rezessionen bleiben spürbar.

**Ehrliche Übersicht**
- Im Dashboard steht unter „Profitabilität je Strecke“ jetzt auch, was **außerhalb der Strecken** anfällt (Leerlauf der Flugzeuge, Verwaltung, Basis, Personalreserve, Zinsen) und was am Ende als Ergebnis pro Tag bleibt; wenig genutzte Flugzeuge werden genannt.
- Strecken mit 2× pro Woche zeigen keinen falschen Hinweis „0 von 1 Umläufen“ mehr.

**Konkurrenz mit Augenmaß (verdeckt)**
- Die KI schätzt, wie gefährlich jede menschliche Airline ist: Wer gerade kämpft (Eigenkapital unter dem Einsatz, Verluste, Krise), wird kaum angegriffen, nicht unterboten und seltener abgeworben. Wer wächst und verdient, wird zum Ziel – Angriffe, Kapazität und Preiskampf richten sich vor allem gegen starke Herausforderer.

**Fairer Markt**
- Wer deutlich teurer ist als das günstigste vergleichbare Angebot, verliert steil Kunden. Vorher konnte ein einzelner Flug auf riesigen Märkten (z. B. Bangkok–Seoul, Singapur–Seoul) 50–75 % über dem üblichen Preis voll werden.
- Etablierte Airlines nehmen die Nachfrage auf, die sie bevorzugt – kein „Überlauf“ mehr, der kleinen Anbietern jeden Preis bezahlt.
- Golf-Drehkreuze: realistischer Umsteigeranteil (Dubai 66 %, Doha 76 %, Abu Dhabi 65 %), weniger lokale Nachfrage.

## Neu in 0.17: Starttermin für die Hauptwelt, Basis-Finder, Kosten auf jedem Knopf, Nachfrage je Region überarbeitet

**Hauptwelt mit Starttermin**
- Der Admin startet die Hauptwelt neu und legt einen **Termin** fest (Vorschlag: nächster Freitag, 12:00 Uhr). Bis dahin steht die Uhr; danach läuft die Welt mit **1 Tag = 20 Minuten** (neue Tempo-Stufe „Ausgedehnt“, auch Vorgabe für eine neue Hauptwelt).
- **Vorab anmelden**: Airline gründen, Logo gestalten oder zeichnen, **Name, Kürzel und Heimatbasis bis zum Start ändern** („Name und Basis ändern“), Strecken als Plan vorbereiten. Flugzeuge, Strecken, Personal und alle anderen Käufe gibt es erst ab dem Start – für alle gleichzeitig.
- **Lobby**: Countdown bis zum Start, **Liste aller angemeldeten Airlines mit Logo und „Start in HAM“**, und ein **Einladungslink** zum Kopieren (`…/?join=HAUPTW`): Wer ihn öffnet, legt ein Konto an und kommt direkt zur Anmeldung.
- Im Spiel zeigt die Übersicht bis zum Start eine Karte mit Countdown, dem, was schon geht, und allen Angemeldeten; oben steht „Start in 2 Tagen 21 Std.“.

**Heimatbasis finden statt Dropdown**
- Bei jeder Gründung (offline, neues Spiel, Beitritt, Neustart, Basiswechsel) gibt es einen **Basis-Finder**: Suche, Filter nach **Größe** (klein bis 8 Mio. · mittel · groß · Drehkreuz), **Region**, „ohne KI-Basis“, „mit Anlaufrabatt“, sortierbar nach Größe, Lizenz, Basiskosten, Slotpreis, Entgelten oder wenig Konkurrenz.
- Jede Zeile zeigt Passagiere, Lizenz, Basiskosten im Monat, Slotpreis, Entgelte je Gast und Anlaufrabatt; Kennzeichen für KI-Basen und **wie viele Mitspielende dort schon starten**. Die Auswahl zeigt alles noch einmal ausführlich.
- Name und Basis lassen sich auch später ändern, solange die Airline noch kein Flugzeug und keine Strecke hat (Profil & Logo).

**Kosten direkt am Knopf**
- **Strecke eröffnen**: Knopf mit Gesamtsumme („Strecke eröffnen · Flugzeug leasen · zusammen 848 Tsd. €“) und darüber die Aufschlüsselung: Lizenz + Slots + Kaution (kommt bei Rückgabe zurück) + Einführung neues Muster + Anwerbung Personal, dazu die laufende Leasingrate.
- **Flugzeuge** („Leasen, 36 Monate · sofort 490 Tsd. €“, Flex, ab Werk, Gebrauchtmarkt), **Basis eröffnen**, **Slots** (auch „1 kaufen“), **Gate-Exklusivvertrag**, **Personal einstellen** (Anwerbungskosten, passt sich der Anzahl an), **Studien**, **Abwerben** (Höchstbetrag), **Übernahme** („Ja, für 120 Mio. € übernehmen“).

**Nachfrage je Region geprüft – kein Golf-Monopol mehr**
- Ursache: Der Aufschlag für Strecken zwischen zwei großen Märkten wuchs ohne Grenze (Dubai–Seoul hatte 14.000 mögliche Reisende pro Tag und Richtung, rund 25-mal so viel wie real), und der Abschlag für Interkontinentalreisen galt auch für Nachbarn wie Dubai–Mumbai. Damit landete die Nachfrage der Golf-Drehkreuze auf wenigen Strecken.
- Jetzt: Aufschlag gedeckelt (höchstens × 5), zwischen Regionen zählt die **Entfernung** (bis 2.500 km wie eine Grenze in Europa, ab 6.000 km voller Abschlag), **Familienbesuche Golf ↔ Südasien, Philippinen, Ägypten**, wenig Austausch Golf ↔ Ostasien, politisch kleine Märkte (z. B. Israel ↔ Golf/Ägypten) gedämpft.
- Ergebnis: Stärkste Strecke je Mio. Passagiere am Flughafen – Nahost 160 (vorher 177, Ausreißer bis 14.000/Tag), Europa 143, Asien 156, Nordamerika 70. Ein Testbot mit perfekter Marktkenntnis wuchs in Dubai vorher in einem Jahr von 13 auf 63 Mio. € Eigenkapital, jetzt auf 18 Mio. € – vergleichbar mit Bangkok, Johannesburg oder São Paulo.
- Sale & Lease-back: Die Miete richtet sich jetzt nach der Marktmiete des Typs (+25 % Krisenaufschlag) statt pauschal 0,95 % des Werts.

## Neu in 0.16: Spielphasen, Marktwissen, teure Großflughäfen, Wettbewerb, Kapitalmarkt und Übernahmen, Sanierung und Insolvenz, mehr Abwerben, Pixel-Logo

**Strategischer Start – überall möglich, aber nicht überall bezahlbar**
- Gründen geht an jedem Flughafen. Große Flughäfen kosten aber ein Vermögen: **Betriebslizenz** beim Gründen und beim ersten Flug zu jedem neuen Flughafen (Bremen 23 Tsd. €, Hannover 67 Tsd. €, Hamburg 197 Tsd. €, Frankfurt 953 Tsd. €, London-Heathrow 1,3 Mio. €), **Basiskosten nach Größe** (Bremen rund 13 Tsd. € im Monat, Frankfurt 98 Tsd. €), Einrichtung einer weiteren Basis 204 Tsd. € (Bremen) bis 1,2 Mio. € (Heathrow).
- **Regionalflughäfen locken mit Anlaufrabatt**: Neue Strecken zahlen im ersten Jahr weniger Passagier- und Landeentgelte (Bremen −40 %, Hannover −22 %, ab 10 Mio. Passagieren keiner).
- **Regionalstrecken tragen höhere Preise**: Auf dünnen Strecken ab kleinen Flughäfen (ohne Billigflieger-Druck) liegt der Marktpreis bis zu 60 % höher (Bremen–Berlin 100 € statt 68 €).
- **Dash 8 als günstiger Einstieg**: Leasing 120 Tsd. € im Monat (vorher 175 Tsd.), Turboprop-Piloten etwas günstiger, Verwaltung wächst mit der Flotte (1 Flugzeug rund 60 Tsd. € im Monat statt 180 Tsd.), Verwaltung je Flugzeug nach Größe (Dash 8 rund 600 €/Tag, A380 1.440 €/Tag). Ergebnis im Test: Eine Dash 8 mit drei guten Strecken ab einem Regionalflughafen trägt sich; mit sauberen Preisen wächst das Eigenkapital um 200–300 Tsd. € im Monat.

**Fünf Spielphasen – keine Einstellung, keine Verbote, sondern Preise und Risiko**
- Jede Airline durchläuft die Phasen: Gründung → Regionalairline (5 Flugzeuge, 3 Monate, 1 Gewinnmonat) → Netzwerk-Airline (12 Flugzeuge, 9 Monate, 3 Gewinnmonate, 8 Strecken, Eigenkapital auf Startniveau) → Interkontinental (25 Flugzeuge, 18 Monate, 6 Gewinnmonate, 1,25 × Startkapital, 1 Mio. Fluggäste) → Global Player (50 Flugzeuge, 30 Monate, 12 Gewinnmonate, 2 × Startkapital, 5 Mio. Fluggäste).
- **Alles ist von Anfang an erlaubt – nur am Anfang teuer und riskant**:
  - Leasinggeber und Banken verlangen von jungen Airlines Risikoaufschläge. In der Gründungsphase: Dash 8 normal, Regionaljets +25 % Rate und 3 Monatsraten Kaution, A320 & Co. +50 % und 4 Raten, Langstrecke +85 % und 6 Raten, A380/747/Concorde +130 % und 8 Raten (Eigenanteil beim Kauf 20–70 %).
  - Wer schneller wächst, als die Phase hergibt, zahlt drauf: jedes weitere Flugzeug in 30 Tagen (über 2/3/5/8 je Phase) +12 % Rate und eine Monatsrate mehr Kaution; jede Basis über der Phase doppelte Einrichtung und +50 % laufende Basiskosten; Drehkreuz-Ausbau über der Phase doppelt so teuer; Übernahmen vor Phase 3 +50 % Kaufpreis.
  - **Langstrecke ist für Neulinge riskant**: Im ersten Jahr buchen Reisende eine unbekannte Airline auf Langstrecken nur zögerlich (London–New York zum Marktpreis: rund 24 % Auslastung statt 58 %).
  - Beispiel: Wer in London startet, bekommt mit 16 Mio. € Startkapital genau eine 787 (Kaution und erste Raten fast 12 Mio. €); für London–New York fehlen dann noch Slots für 7,4 Mio. € und die Lizenz in New York.
- Mit jeder Phase werden die Konditionen normal. Fortschritt, Konditionen und Aufschläge zeigt **Unternehmen → Ziele & Phasen**, die Phase steht auch im Dashboard.
- Bestehende Airlines (ältere Spielstände, Hauptwelt) bekommen beim Laden automatisch die Phase, die ihrer heutigen Größe entspricht.

**Marktwissen – Prognosen sind nicht mehr geschenkt**
- Jede Verbindung hat einen **festen, unbekannten Schätzfehler**. Ohne Marktdaten liegt die Prognose bis etwa Faktor 2,5 daneben (± 79 %), wer beide Flughäfen selbst anfliegt, schätzt grob (± 48 %). Neu rechnen hilft nicht – nur besseres Wissen.
- **Marktstudien** liefern Wissen für alle untersuchten Verbindungen: klein = solide (± 23 %), erweitert = gut (± 12 %), umfassend = sehr genau (± 5 %). Das Wissen veraltet nach rund einem Jahr um eine Stufe.
- **Fachkraft Marktanalyse**: macht alle Schätzungen 25–55 % genauer und bewertet jeden Monat selbst 6, 15 oder 30 neue Märkte ab Ihren Basen.
- Eigene Strecken: Ist-Daten, sehr genau.
- Streckenplanung zeigt Wissensstufe, Spanne und Quelle; Markt-Liste und Flughafenkarte zeigen **geschätzte** Potenziale (Spannen bei wenig Wissen) und sind danach sortiert.

**Wettbewerb und Nachfrage**
- **Etablierte Airlines**: Auf großen Märkten fliegen Airlines außerhalb des Spiels (Bestandsverkehr) und nehmen einen Teil der Reisenden. Die Streckenplanung zeigt ihre Sitze.
- Saudi-Arabien: Inlandsnachfrage korrigiert (Dschidda–Riad 12.700 statt 21.600 Reisende am Tag, real rund 11.000–14.000).
- KI-Airlines erhöhen eine Strecke höchstens auf 8 Flüge täglich.

**Slots an jedem Flughafen**
- **1 Slot je 200.000 Passagiere im Jahr** (mindestens 1). Je nach Größe hält Bestandsverkehr 30–90 % davon. Slots kosten nach Größe – kleine Flughäfen wenig, Großflughäfen sehr viel: Bremen 37 Tsd. €, Hannover 119 Tsd. €, Hamburg 387 Tsd. €, Düsseldorf 546 Tsd. €; ist ein Großflughafen voll, verdoppelt sich der Preis (München 2,7 Mio. €, Frankfurt 4,3 Mio. €, Heathrow 6,1 Mio. €).
- **Gekaufte Slots sind Vermögen**: Sie stehen mit dem Kaufpreis in der Bilanz (statt das Ergebnis zu belasten); Rückgabe zum halben Marktpreis.
- Neue Basis an einem vollen Flughafen: zwei Plätze aus dem Slotpool kommen dazu (zum Marktpreis).
- **Gate-Exklusivvertrag an jedem Flughafen** Ihres Netzes (Preis nach Größe).
- Drehkreuze bekommen zusätzliche Slots, je mehr Umsteiger sie bringen (1 je 200.000 im Jahr).
- Streckenplanung zeigt Slots, Lizenz und wann sich das wieder verdient hat.

**Flugplan und Netz**
- **Seltener als täglich**: 1× bis 6× pro Woche – ideal für dünne Strecken und Inseln.
- **Rolle je Strecke**: gemischt, Zubringer (Umsteiger haben Vorrang) oder Endziel (nur Ortsgäste). In Planung und Bearbeiten einstellbar.
- **Drehkreuze verbinden**: Umsteigen über zwei eigene Drehkreuze (z. B. Hamburg → Madeira → New York), Reisende wählen die kürzere Verbindung, außer der Umweg ist deutlich billiger. Viele Langstrecken machen ein Drehkreuz attraktiver (Strategie zeigt Attraktivität und Umsteigezeit).
- **Marke wirkt erst nach Anlauf**: Eine neue Airline braucht rund ein Jahr, bis Marke und Premiumprodukt voll zahlen (vorher zählte die Marke ab Tag 1).

**Hedging repariert**
- Absicherung als echter Swap auf eine feste Menge: täglich abgerechnet, steigt Kerosin, bekommen Sie Geld, fällt es, zahlen Sie. Vorzeitiges Beenden kostet den Marktwert der Restlaufzeit (vorher war die Absicherung eine Gratis-Option).

**Kapitalmarkt und Übernahmen Schritt für Schritt (neuer Reiter Markt → Börse)**
- **Jede Airline hat einen Börsenwert**: Eigenkapital + 5 × Jahresergebnis (mindestens 60 % des Eigenkapitals), dazu die Marktstimmung, die jeden Monat schwankt. Kursverlauf über 24 Monate.
- **Anteile an anderen Airlines kaufen und verkaufen** (KI-Airlines und Mitspielende, soweit deren Aktien frei sind). Je mehr Sie schon halten, desto teurer wird jedes weitere Prozent; große Verkäufe drücken den Preis.
- **Anteiliger Gewinn (Equity-Methode)**: Ihr Anteil am Monatsergebnis der Beteiligung landet jeden Monat in Ihrem Ergebnis (neue Zeile „Beteiligungen“, steuerfrei) und im Buchwert; Dividenden kommen als Geld.
- **Stufen**: ab 25 % Sperrminorität (die KI-Airline greift Ihre Strecken nicht mehr an), ab 50 % Mehrheit (Konzernallianz mit gemeinsamem Einkauf und Codeshare), dann **Übernahmeangebot für den Rest** zum Börsenwert × 1,3. Ohne Mehrheit ist die Komplettübernahme feindlich und kostet × 1,5. Andere Aktionäre bekommen ihren Anteil am Angebot.
- **Eigene Aktien verkaufen (Kapitalerhöhung)**: 5, 10 oder 20 % neue Aktien bringen frisches Geld, höchstens 49 % außerhalb Ihrer Hand (Sie behalten die Mehrheit), höchstens alle 90 Tage. Junge Airlines müssen mit Abschlag verkaufen (Phase 1: 35 %, später 10 %). Aktionäre außerhalb bekommen Dividenden (0, 25 oder 50 % vom Monatsgewinn, einstellbar). **Aktienrückkauf** aus dem Streubesitz.
- **Anleihen**: 1–50 Mio. € für 3, 5 oder 7 Jahre, Zins nach Rating (A 1,5 % bis B 6,5 % über dem Leitzins), Rückzahlung am Ende in einer Summe, höchstens so viel wie das Eigenkapital; vorzeitig mit 2 % Aufgeld.
- Gehört eine Airline nicht mehr zum Markt (Insolvenz, Neustart, entfernt), werden Beteiligungen daran abgeschrieben.

**Mehr Abwerben**
- **Personal**: bis zu 60 Personen je Versuch (vorher 20), Wechselprämie bis 80.000 €. Wartezeit gilt nur noch je Berufsgruppe und Airline (21 Tage) – Piloten, Kabine und Technik lassen sich gleichzeitig umwerben. KI-Airlines haben jetzt Personal passend zu ihrer Flottengröße.
- **Fachkräfte auch bei KI-Airlines**: Jede KI-Airline hat zwei bis drei Spezialistinnen und Spezialisten passend zum Geschäftsmodell (z. B. Revenue Management bei Premium-Airlines, Einkauf bei Billigfliegern).
- **Firmenkunden abwerben**: Vertriebsoffensive an einem Flughafen gegen eine bestimmte Airline (drei Budgetstufen). Erfolg hängt von Budget, Marke, Flügen ab dem Flughafen und einem Drehkreuz dort ab. Bei Erfolg buchen Geschäftsreisende dort ein halbes Jahr lieber bei Ihnen – bei Mitspielenden entsprechend seltener.

**Übernahmen (M&A)**
- Komplettübernahme (Markt → Wettbewerb → Übernahmen oder direkt an der Börse): Flotte samt Leasing und Krediten, Strecken samt Slots, Basen, Personal, Kasse und Bankschulden. Die Prämie über dem Buchwert wird sofort abgeschrieben. Vor Phase 3 kostet eine Übernahme 50 % mehr.

**Admin: Welt neu starten**
- In der Verwaltung kann der Admin die Hauptwelt neu starten (in privaten Spielen die Spielleitung ihr Spiel): neue Weltlage, neue Konkurrenz, Tag 1. Wahlweise behalten alle Mitspielenden Name, Kürzel und Basis und beginnen mit frischem Startkapital – oder alle müssen neu beitreten.

**Sanierung und Insolvenz (neuer Reiter Finanzen → Sanierung)**
- **Mehr Zeit für Spielende**: Nach 7 Tagen über der Kreditlinie beginnt die Restrukturierung, die Insolvenz kommt erst nach 45 Tagen im Minus (KI-Airlines: 30). Ihre Strecken werden nicht mehr automatisch geschlossen – Sie entscheiden selbst, was geht. Die Ansicht zeigt den Countdown und wie viel Geld fehlt.
- **Flugzeuge zu Geld machen**: verkaufen (Erlös abzüglich Kredit), **Sale & Lease-back** (ein Leasinggeber kauft zum Marktwert minus 5 % und vermietet zurück – Geld sofort, das Flugzeug fliegt weiter, Miete etwas über der Marktmiete) oder Leasingflugzeuge zurückgeben (in der Restrukturierung nur halbe Strafe).
- **Rechte und Beteiligungen verkaufen**: Slots in Reserve an eine KI-Airline vor Ort (80 % des Marktpreises) oder an den Flughafen (50 %), Anteile an anderen Airlines, Exklusivverträge für Gates (40 % des Preises zurück).
- **Kapital und Gläubiger**: Leasingraten 90 Tage stunden (danach über 180 Tage nachzahlen, +5 %, einmal im Jahr), **Notkapitalerhöhung** mit 55 % Abschlag ohne Sperrfrist, **Schulden gegen Aktien** (die Bank wandelt die genutzte Kreditlinie in Aktien, der Rahmen ist danach wieder frei), **Sanierungskredit** über 25 % der Sicherheiten (Flugzeuge, Slots, Beteiligungen) zu 14 % auf 3 Jahre.
- **Insolvenz wird abgewickelt – die Reste kommen an den Markt**: Eigene Flugzeuge stehen zu 60 % des Marktwerts im Gebrauchtmarkt („aus der Insolvenz von …“), Leasingflugzeuge gehen mit 15 % Rabatt auf die Rate an neue Mieter. Slots und Gates werden frei, das Personal sucht neue Arbeit (der Arbeitsmarkt entspannt sich), Fachkräfte stehen als Kandidaten bereit, Beteiligungen, Anleihen, Kooperationen und Verträge enden. Das gilt für Mitspielende und KI-Airlines gleichermaßen; das Insolvenzfenster zeigt, was abgewickelt wurde.

**Pixel-Logo**
- Unter Profil & Logo: eigenes Logo auf 64 × 64 Pixeln zeichnen (Stift, Füllen, Radierer, Pipette, 15 Farben). Es ersetzt überall das gestaltete Logo; exakt dasselbe Bild gibt es pro Welt nur einmal.

## Neu in 0.15: Langstrecke, Umsteiger, 175 neue Flughäfen, realistische Nachfrage je Standort, Slots mit Warteliste, Personal zum Termin, Preisautomatik, Verwaltung, Fachkräfte

**Langstrecke**
- **Ein Flugzeug reicht, solange der Umlauf (hin, Bodenzeit, zurück, Bodenzeit) höchstens 22 Stunden dauert** – das Flugzeug fliegt dann über Nacht genau diesen einen Umlauf. Beispiele: Frankfurt–New York 19,8 h, Frankfurt–Chicago 21,9 h, Frankfurt–Dubai 16,7 h, Singapur–Sydney 20 h. Das gilt jetzt auch für Schmalrumpfjets wie die A321neo auf dem Atlantik (vorher zählten dort 17 h, also zwei Flugzeuge). Grenze ab Frankfurt: etwa 7.200 km.
- **Über 22 Stunden geht es physikalisch nicht mit einem Flugzeug täglich**: Frankfurt–Singapur 30 h, Frankfurt–Los Angeles 27,7 h, Sydney–Los Angeles 34,3 h. Ein Flugzeug ist dann zwei Tage unterwegs – mit zweien fliegt die Strecke täglich, mit einem jeden zweiten Tag. Die Streckenplanung sagt das jetzt ausdrücklich (grün: „Ein Flugzeug reicht“, gelb: „braucht 2 Flugzeuge“).
- **Nachfrage neu kalibriert** (siehe „Nachfrage je Standort“ unten). Langstrecke lohnt sich vor allem zwischen großen Märkten (Frankfurt–Asien, Sydney–Asien, Dubai), auf umkämpften Strecken wie Frankfurt–New York braucht es Zubringer über ein eigenes Drehkreuz.
- **Kerosinzuschlag im Markt**: Steigt Kerosin dauerhaft, ziehen die Marktpreise mit (gleitender Index über rund 45 Tage; Kurzstrecke gibt etwa 11 %, Langstrecke bis 30 % des Anstiegs weiter). Vorher konnte eine Ölkrise (+84 %) reine Langstrecken-Airlines in vier Monaten in die Insolvenz treiben, weil jede Preiserhöhung Kunden kostete. Die Weltlage zeigt den aktuellen Zuschlag.
- Die Streckenliste rechnete die Flugzeugkosten bei Langstrecken bisher zu hoch (Umlauf ÷ 17 h statt tatsächlich gebundener Flugzeuge) – korrigiert.

**Umsteigen**
- **Sitzschutz für Umsteiger**: Ihre Flüge halten jetzt einen Teil der Plätze für Umsteiger frei, statt sie vorher vollständig an Direktreisende zu verkaufen (gelernt aus der Umsteigenachfrage der letzten Tage, höchstens die Hälfte der Sitze). Test „alle Verbindungen und alle Slots in Singapur“: vorher rund 60 Umsteiger je Strecke und 10 % Anteil, jetzt 130–300 je Strecke, rund 3.400 am Tag, 40 % aller Gäste (mit der neuen Nachfrage gerechnet).
- Strecken → Bearbeiten und Strategie-Hub zeigen **gewünschte und tatsächlich beförderte Umsteiger** – so sieht man, ob Sitze fehlen.

**Mehr Welt**
- **175 neue Flughäfen, 50 neue Länder** (386 insgesamt): u. a. Hannover, Bremen, Nürnberg, Leipzig, Belgien, Skandinavien, Osteuropa, Baltikum, Balkan, Israel, Jordanien, Libanon, Golfstaaten, Iran, Sri Lanka, Malediven, Nepal, Bangladesch, Pakistan, Kambodscha, Myanmar, Macau, Mongolei, Zentralasien, Kaukasus, Karibik und Mittelamerika, Venezuela, weitere Städte in USA, Kanada, China, Indien, Japan, Brasilien, Australien und Afrika. Karte mit allen Ländern.
- EU erweitert (Bulgarien, Kroatien, Baltikum, Malta, Zypern).
- Leasinggeber haben mehr Flugzeuge, je mehr Menschen mitspielen (+20 % je weitere Airline).

**Nachfrage je Standort – neu kalibriert**
- Geprüft an allen 386 Flughäfen (reales Aufkommen) und rund 110 realen Märkten. Befund vorher: Kleine Ferien- und Exotikziele hatten ein Vielfaches ihrer echten Nachfrage (Victoria Falls 20-fach, Seychellen, Tahiti, Sansibar 8–10-fach), große Inlandsstrecken nur einen Bruchteil (Sydney–Melbourne, Tokio–Sapporo, Seoul–Jeju, Delhi–Mumbai 3–10 % des Realen). Zwei Drittel der Hamburger Nachfrage gingen auf über 4.000 km.
- Neues Modell: Schwerkraft mit realistischerer Distanzabnahme, Grenzen (Inland > EU > Ausland > anderer Kontinent), Aufschlag zwischen großen Märkten auf der Langstrecke – und **Ausgleich je Flughafen**: Die Nachfrage jedes Flughafens entspricht seinem realen Aufkommen ohne Umsteiger, getrennt nach Inland und Ausland (z. B. USA 8 % international, New York-JFK 45 %, Deutschland 80 %). Fehlen einem Land im Spiel viele Inlandsziele (Norwegen), bleibt der Rest ungeflogen, statt eine Strecke aufzublähen.
- **Bahn, Auto und Bus** auf kurzen Landstrecken ohne eigene Bahnangabe: bei 300 km fliegt rund ein Viertel, bei 400 km die Hälfte, ab 600 km fast alle. Inseln und Meerengen sind ausgenommen (Mallorca, Kanaren, Sizilien, Hawaii, Okinawa, Jeju, Bali, Tasmanien, Südinsel …).
- Mindeststrecke 250 statt 300 km (Singapur–Kuala Lumpur, eine der meistgeflogenen Strecken der Welt, ist jetzt möglich).
- Ergebnis: Die Märkte liegen im Mittel beim Realen (Faktor 1,0), typische Abweichung Faktor 2,3 (vorher 2,4 – und Kurzstrecken systematisch 3- bis 10-fach zu niedrig). Langstrecke liegt bewusst unter den gezählten Passagieren auf den Flügen, weil dort viele Umsteiger mitfliegen, die im Spiel über Drehkreuze kommen. Beispiele, Potenzial pro Tag und Richtung (in 0.14): Sydney–Melbourne 10.500 (1.380), Hamburg–München 720 (620), Hamburg–Mallorca 690 (370), London–New York 2.300 (1.430), Frankfurt–New York 730 (620), Hamburg–New York 155 (485), Hamburg–Seoul 73 (410), Hamburg–Victoria Falls 6 (90).
- **Langstrecke ab Hamburg und anderen mittelgroßen Flughäfen deutlich weniger**: 15 % der Hamburger Nachfrage gehen auf über 4.000 km (vorher 63 %). Hamburg–Seoul: rund 40 Reisende am Tag und Richtung fliegen tatsächlich – ein eigener Nonstop-Flug lohnt sich nicht, wie in echt. Große Märkte (London, Paris, Frankfurt, New York, Dubai, Singapur, Seoul …) bleiben untereinander stark verbunden.
- Die Streckenplanung zeigt jetzt die **Reisenden im Markt** (wer bei heutigen Preisen tatsächlich fliegt) statt nur des Potenzials.
- Langzeittest (540 Tage, mit Krisen): Frankfurt rund das 5-Fache des Startkapitals (Singapur, Dubai, New York mit Zubringern), Hamburg das 4-Fache (dichtes Europa-Netz, Langstrecke lohnt sich ab Hamburg nicht), Sydney das 10-Fache (Asien und Los Angeles). Die KI-Welt bleibt stabil (30 von 30 Airlines nach einem Jahr, Auslastung 88 %).

**Slots: kaufen, Warteliste, Strecken in Planung**
- **Jeder Slot kostet**: Wer an einem koordinierten Flughafen eine Strecke eröffnet oder aufstockt, kauft die nötigen Slots zum Tagespreis (je knapper, desto teurer) – außer sie liegen schon in der eigenen Reserve. Die Planung zeigt den Betrag vorher. Gekaufte Slots gehören Ihnen: Schließen oder verkleinern Sie eine Strecke, bleiben sie in Ihrer Reserve (Slotgebühr läuft weiter, Rückgabe zum halben Preis). KI-Airlines bekommen weiter freie Slots vom Koordinator.
- **Slots für später**: Im Strategie-Hub lassen sich Slots an jedem koordinierten Flughafen kaufen, auch an solchen, die Sie noch nicht anfliegen.
- **Warteliste**: Ist ein Flughafen voll, tragen Sie sich ein. Frei werdende Slots (Sommer-/Winterflugplan, aufgegebene Strecken, Rückgaben) gehen jeden Tag **reihum** an die Wartenden – jeder bekommt einen, dann der Nächste – und werden beim Zuteilen bezahlt. Wer wartet, hat Vorrang: Andere können diese Slots nicht wegkaufen.
- **Strecken in Planung**: Fehlen Slots, speichern Sie die Strecke (oder einen dritten, vierten … Flug auf einer bestehenden Strecke) als Plan. Er trägt Sie automatisch auf die Warteliste ein und wird umgesetzt, sobald alle Slots da sind (abschaltbar; sonst „Jetzt umsetzen“). Übersicht unter Strecken → In Planung.

**Personal zum Termin**
- Unter Unternehmen → Personal wählen Sie den **Antritt neuer Leute**: so früh wie möglich, zur Lieferung eines bestimmten Flugzeugs, zum Start einer angekündigten Strecke oder in X Tagen (bis 180). „Bedarf decken“ rechnet dann den Bedarf bis zu diesem Tag ein, auch die neue Strecke und das neue Flugzeug. Einstellungskosten fallen sofort an, das Gehalt erst ab Antritt.
- In der Streckenplanung stellt „Personal gleich mit einstellen“ die Crew automatisch zum ersten Flug ein – least man ein Flugzeug mit 20 Tagen Lieferzeit, fangen die Leute an dem Tag an, an dem das Flugzeug kommt.

**Preisautomatik** (Strategie-Hub für alle, Strecken → Bearbeiten je Strecke)
- Einmal pro Woche kleine Schritte Richtung **Ziel-Auslastung** (75–95 %). Einstellbar: **Untergrenze** (nur Kostengrenze oder 70/85/100 % des Referenzpreises), **Obergrenze** (130/150/200/300 %), **Tempo** (vorsichtig ±1,5 %, normal ±3 %, zügig ±6 % pro Woche) und **Premiumpreise** (fest oder automatisch auf eine Ziel-Auslastung der Business/First-Sitze).
- Standard im Strategie-Hub gilt für alle Strecken mit Automatik (und auf Wunsch für neue); einzelne Strecken lassen sich abweichend einstellen oder mit „Standard übernehmen“ zurücksetzen. Preise außerhalb des Bands wandern schrittweise zurück, nie sprunghaft; die Automatik startet zwei Wochen nach Eröffnung.
- **Premiumaufschlag je Strecke** (70–140 % des Standards) auch von Hand. Höherer Aufschlag = mehr Erlös je Premiumgast, aber weniger Premiumgäste.

**Verwaltung für Admins** – Airlines entfernen und sperren, Ereignisse annullieren, Kapital buchen (siehe Abschnitt Admin).

**Fachkräfte: Versprechen und Ist-Leistung, Schutz vor Abwerbung**
- Jede Fachkraft hat ein verborgenes Talent und eine **Passung zum Arbeitgeber**. Nach rund 30 Tagen Einarbeitung leistet sie zwischen etwa 50 % und 140 % der zugesagten Wirkung. Jeden Monat schwankt das ein wenig; gelegentlich gibt es einen **Fehlgriff** („Marktprognose daneben – nur 35 % diesen Monat“) oder einen **Glücksgriff**.
- **Bewertung „Ist / Zusage“** in Prozent an jeder Fachkraft (gleitender Schnitt, mit Balken). Wer freigestellt wird, sucht neu und bringt die Bewertung als **Referenz** mit – bei einem neuen Arbeitgeber wird die Passung neu ausgewürfelt, dort kann es besser (oder schlechter) laufen. Auch abgeworbene Fachkräfte nehmen ihre Referenz mit.
- **Schutz vor Abwerbung**: **Halteprämie** (drei Monatsgehälter, zwölf Monate Bindung mit Kündigungsschutz – Abwerbung gelingt nur noch selten), **Wettbewerbsverbot** (+15 % Gehalt; wer abwirbt, zahlt sechs Monatsgehälter Ablöse an Sie, und die Person darf erst nach 30 Tagen anfangen) und **Gehalt nachverhandeln** (+10 %, bis 30 % über Markt; über Markt bezahlte Leute wechseln seltener). Auch die Betriebszugehörigkeit bindet. Die Anzeige „Schutz vor Abwerbung: hoch/mittel/gering“ fasst das zusammen; beim Abwerben sieht man Bewertung, Wettbewerbsverbot und Bindung der anderen.

## Neu in 0.14: Strategie-Hub, Kabinenklassen, Vielflieger, Drehkreuze, Marktkontrolle, Filter

**Strategie-Hub (Karte → Strategie, Kurzfassung oben im Dashboard)**
- **Kabinenaufteilung First / Business / Economy** – eine Einstellung für alle Strecken, getrennt für Kurz-/Mittelstrecke und Langstrecke (z. B. 30 % First, 50 % Business, 20 % Economy). Voreinstellungen oder Regler; das Bild zeigt sofort die Sitze je Klasse, darunter die **Prognose für Ihr ganzes Netz** (Streckenbeitrag pro Tag vorher/nachher) und die Umbaukosten.
  - Modell: Premiumsitze brauchen Fläche (Business kurz 1,5, lang 3,4 Economy-Sitze; First 6, nur Langstrecke) und erzielen das 2,1- (Business kurz), 3,4- (Business lang) bzw. 6-Fache (First) des Economy-Tarifs. Gebucht werden sie vor allem von Geschäftsreisenden (kurz 42 %, lang 55 % für Business, 10 % First), kaum von Urlaubern. Airlines mit Premiumkabine sind für Geschäftsreisende attraktiver (sättigt bei etwa 15 % Premiumsitzen). Premiumgäste kosten mehr Bordservice.
  - Ergebnis in Tests: Auf Geschäftsstrecken (London, Paris, Wien) bringen 10–20 % Business 15–40 % mehr Streckenbeitrag; zu viel Premium (50 % Business auf der Kurzstrecke) ist kaum besser oder sogar schlechter als reine Economy, weil die Plätze leer bleiben. Auf schwach ausgelasteten Strecken kostet Premium kaum etwas, auf vollen Ferienstrecken echte Plätze.
  - Die bisherigen Produkte Basic/Standard/Premium bleiben als Bordprodukt je Strecke. Premium-KI-Airlines fliegen jetzt ebenfalls mit Business (12 % kurz, 26 % + 4 % First lang).
  - Die Streckenliste zeigt die Sitze je Klasse (z. B. „14 B · 158 Y“).
- **Marketing als Anteil am Umsatz** (0–8 %) statt fester Summe – mit **Sättigung**: die ersten 2–3 % wirken am stärksten, ab 5 % kommt kaum noch etwas dazu. Kurve, Kosten pro Monat und die langfristig erreichbare Marke stehen dabei. Alte feste Budgets laufen weiter, bis Sie umstellen.
- **Vielfliegerprogramm** in drei Stufen (Meilen, Status mit Lounges, Premium mit Kreditkarte und Partnern): Einführung 0,6 / 2 / 5 Mio. €, Fixkosten plus 1,0–2,6 % der Ticketerlöse, dafür Partnererlöse und vor allem Bindung von Geschäftsreisenden. Die Wirkung baut sich über sechs Monate auf und wächst mit der Größe des Netzes. Neues GuV-Konto „Kundenbindung“.
- **Drehkreuze**: Jede Basis lässt sich zum Umsteigeknoten (ab 4 Strecken), Drehkreuz (ab 8) und Mega-Hub (ab 15) ausbauen. Jede Stufe macht Umsteigen bequemer (weniger Umsteige-Malus, abgestimmte Wellen, mehr sinnvolle Umwege, weniger Rabatt nötig) und gibt Geschäftsreisenden am Drehkreuz einen Heimvorteil. Test mit 15 Strecken ab Hamburg: +6 % / +11 % / +15 % Umsteiger, rund +4 % / +8 % / +11 % Erlös. So wird auch Hannover ein Drehkreuz – ohne Umweg über London.
- **Marktkontrolle über Slots**: An koordinierten Flughäfen kaufen Sie einzelne oder **alle freien Slots**. Danach kann dort niemand zusätzliche Flüge anbieten; bestehende Konkurrenzflüge bleiben (deren Slots gibt es im Handel). Je knapper der Rest, desto teurer der nächste Slot (der letzte kostet das Vierfache); ungenutzte gekaufte Slots kosten die übliche Slotgebühr, Rückgabe zum halben Preis.
- **Gate-Exklusivvertrag** an eigenen Basen ohne Slotkoordination (bis 25 Mio. Passagiere, z. B. Hamburg, Hannover): Einmalpreis 0,9 Mio. € je Mio. Jahrespassagiere plus 1,5 % im Monat. Andere Airlines – KI und Mitspielende – können dort keine neuen Flüge mehr anbieten oder aufstocken.

**Filter**
- **Verlauf (Karte → Verlauf)**: neue Auswahl „Ansicht“ – ganze Airline, **je Basis, je Flugzeugmuster oder je Strecke**. Gefiltert zeigt der Verlauf Tag für Tag den Streckenbeitrag (Erlöse − direkte Flugkosten − Flugzeugzeit) mit Passagieren, Auslastung, Premiumgästen, Umsteigern, Flügen, Verspätungen und Ausfällen (bis 60 Tage).
- **Strecken → Netz**: Filter nach Basis, Muster, Status (nur im Minus / voll / schwach) und Suche nach Ziel; die Summe passt sich an.
- **Flotte → Ihre Flotte**: Filter nach Basis, Muster, Status (im Einsatz / ungenutzt / Wartung / Lieferung) und Suche nach Kennung.
- **Dashboard**: Profitabilität und Auslastung je Strecke lassen sich nach Basis und Muster filtern.

## Neu in 0.13.3: Verlauf Tag für Tag, Strecken der Mitspielenden, Suche in allen Auswahllisten

- **Verlauf (Karte → Verlauf):** Ergebnis jedes einzelnen Tages der letzten 30 oder 90 Tage als Balken (grün/rot), dazu Summe, Tagesschnitt, bester und schwächster Tag.
  - Ein Tipp auf einen Balken oder eine Tabellenzeile zeigt den Tag im Detail: Ergebnis, Passagiere, Auslastung, Flüge, Verspätungen, Ausfälle, Kontostand und die Aufschlüsselung in Erlöse, Kerosin, Flugbetrieb, Personal, Flugzeuge & Standorte, Verwaltung & Marketing, Einmalkosten, Zinsen & Steuern (mit Anteil an den Erlösen). Mit ‹ › blättern Sie Tag für Tag.
  - Umschalter „Monate“: dasselbe je Monat für bis zu zwei Jahre, inklusive laufendem Monat.
  - Hinkommen: Klick auf die Kachel „Ergebnis … (lfd.)“ im Dashboard (zeigt jetzt auch „gestern“), auf „Tagesergebnis“ in der Seitenleiste, auf „Ergebnis gestern“ unter Finanzen oder „Öffnen“ bei „Ergebnis je Monat“.
  - Die Aufschlüsselung je Tag wird ab dieser Version gespeichert; ältere Tage zeigen Ergebnis, Passagiere und Kontostand.
- **Mitspielende (Markt → Mitspielende):** Jede Karte hat „▸ Strecken, Flugzeuge und Preise“. Aufgeklappt: alle Strecken der Airline mit Flugzeugmuster (Datenblatt per Klick), Produkt, Flügen pro Tag sowie Preis hin und zurück; „auch Sie“ markiert Strecken, die Sie selbst fliegen. Ein Klick auf die Strecke öffnet den Markt des Ziels.
- **Suche in Auswahllisten:** Jede Auswahlliste mit sieben oder mehr Einträgen (Ziel und Basis in der Streckenplanung, Flugzeugmuster, Airlines im Handel, Standorte in der CFO-Beratung, Marktstudien-Schwerpunkt, Arbeitsmarkt, Chat-Empfänger …) öffnet ein Suchfeld. Gesucht wird in Name, Code und Gruppe, ohne Rücksicht auf Akzente („sao“ findet São Paulo); ein exakter Flughafencode („jfk“) steht oben. Pfeiltasten, Enter und Esc funktionieren; auf dem Handy öffnet sich die Liste als großes Blatt von unten. Kürzere Listen (z. B. Tempo, Service, Puffer) bleiben normale Auswahllisten.

## Neu in 0.13.2: Anleitung als Bild-Durchlauf, eindeutige Logos

- **Anleitung neu als Durchlauf in 10 Schritten** (online; offline 9): Ihre Airline → Flugzeug holen → Strecke planen → Crew einstellen → Zeit starten → Preise führen → Klug wachsen → Geld im Blick → Online spielen → Los geht's.
  - Jeder Schritt hat ein großes, animiertes Bild (Flugzeuge auf Strecken, Prognosekarte, Crew-Figuren, Tempo-Knopf mit Kalender, Auslastungsskala mit Zeiger, Stufen „Studie → CFO → Investieren“, Konto mit Dispo-Zone, die sechs Bereiche), dazu eine Überschrift, einen Satz und zwei bis drei Stichworte.
  - Fortschrittsbalken oben (antippbar), Wischen auf dem Handy, Pfeiltasten am Rechner. Bei „weniger Bewegung“ im System stehen die Animationen still.
  - Im laufenden Spiel springt „Zur Beschaffung ↗“, „Zur Planung ↗“ usw. direkt an die passende Stelle; am Ende geht es auf Wunsch in den Rundgang durch die Oberfläche. Die ausführlichen Tipps stehen eingeklappt unter „Profi-Tipps“.
  - Hell und dunkel, Handy und Desktop geprüft.
- **Logos sind eindeutig:** Dieselbe Kombination aus Form, Symbol, Grund- und Symbolfarbe darf in einer Welt nur eine aktive Airline tragen. Der Logo-Editor zeigt sofort „Schon vergeben – trägt bereits …“ und sperrt „Logo übernehmen“; der Server prüft es zusätzlich. Eine andere Form, ein anderes Symbol oder eine andere Farbe genügt. Beim Symbol „Kürzel“ zählt das Kürzel mit, weil zwei Kürzel nie gleich aussehen. Insolvente Airlines geben ihr Logo frei. Bereits doppelt vorhandene Logos aus älteren Spielständen bleiben, bis jemand sein Logo ändert.

## Neu in 0.13.1: Mehrere Hubs

- **Basis umschalten:** Mit mehr als einer Basis zeigt **Markt → Nachfrage** oben und über der Zieltabelle einen Umschalter „Märkte ab Basis: HAM · MUC · …“. Vorher war dort immer die erste Basis zu sehen, wechseln ging nur über einen Klick auf die andere Basis in der Karte.
- Ist gerade ein Ziel ausgewählt (z. B. London), bleibt es stehen; Reisepotenzial, Distanz, Konkurrenz und „Strecke … planen“ rechnen dann ab der neu gewählten Basis.
- Derselbe Umschalter steht in der **Flughafen-Karte** auf der Karte und im **Datenblatt** eines Flugzeugmusters („Größte erreichbare Märkte ab …“). Alle drei merken sich die gewählte Basis gemeinsam; auch die Streckenplanung startet ab dort.
- Der Streckentipp der Assistenz und das Strecken-Szenario der CFO gehen ebenfalls von der gewählten Basis aus statt immer von der ersten.

## Neu in 0.13: Gesamtprüfung – Fehler behoben, KI erweitert, robuster

Diese Version ist das Ergebnis einer Prüfung aller Teile: Wirtschaftskern (Zufallstests über 500–900 Spieltage, feindliche Eingaben, Speichern/Laden), Oberfläche (über 350 Klicks auf Desktop und Handy), Spielbalance (automatische Testspielerin an zehn Heimatbasen über zwei Jahre) und Server (Hauptwelt mit 60 Airlines).

**Behobene Fehler**
- **C-Checks viel zu häufig auf der Langstrecke:** Teilen sich zwei Flugzeuge einen Umlauf (z. B. Sydney–Los Angeles), zählte jedes Flugzeug die vollen Flugstunden statt seines Anteils. Folge: doppelt so viele C-Checks, oft beide Flugzeuge gleichzeitig in der Werft und die Strecke fiel tagelang aus. Jetzt zählt jedes Flugzeug nur die Stunden, die es wirklich fliegt.
- **Checks gestaffelt:** Ist schon ein Flugzeug gleichen Musters derselben Basis in der Werft, wartet das nächste (höchstens 10 % über dem Intervall). Flotte und Assistenz zeigen dann „C-Check fällig – wartet …“.
- **„Ungenutzt“ während der Werft:** Flugzeuge im C-Check oder AOG zählten als ungenutzt (Assistenz, CFO, Dashboard). Behoben.
- **Basis ohne Geld:** Eine neue Basis ließ sich auch ohne Liquidität eröffnen (Konto bis weit unter den Dispo). Jetzt wird wie bei Flugzeugen geprüft.
- **Server-Sicherheit:** Manipulierte Anfragen (z. B. Terminal „constructor“, unbekannte Berufsgruppe) konnten einen Spielstand so beschädigen, dass die Welt beim nächsten Spieltag abstürzt – in der Hauptwelt für alle. Alle Eingaben werden jetzt vor der Verarbeitung bereinigt, Einstellen, Entlassen und Umschulen prüfen Beruf und Musterberechtigung. 20.000 Zufallsaktionen mit Müllwerten laufen fehlerfrei.
- **KI bestellte Flugzeuge ins Leere:** Reichte die Flugzeugzeit für eine geplante KI-Strecke am Ende nicht (z. B. weil der Leasingbestand ausging), blieben die schon geleasten Flugzeuge ungenutzt stehen und wurden nach 45 Tagen mit Vertragsstrafe zurückgegeben – vor allem Langstrecken-KIs verloren so Millionen. Jetzt werden solche Bestellungen vor der Lieferung storniert.
- **Australien:** Die Abflugsteuer von 35 € galt auch für Inlandsflüge und machte Sydney–Melbourne & Co. für alle unrentabel. Jetzt 10 € im Inland und auf kurzen Strecken, Langstrecke weiter 40 €.
- Kleinere: Fehlermeldungen beim Rückzahlen eines nicht vorhandenen Kredits und beim Freistellen einer Fachkraft; CFO zählt AOG-Flugzeuge nicht mehr als „steht herum“.

**Kerosin**
- Zwei Ölschocks konnten sich stapeln (Kerosin bis über das Dreifache – in Tests war damit jede Strecke im Minus). Jetzt gibt es keinen neuen Schock, solange der Preis noch über dem 1,4-Fachen liegt, und der Preis bleibt zwischen dem 0,5- und 2,2-Fachen des Referenzpreises. Eine Ölkrise tut weiter weh – Absichern lohnt sich.

**Sechs neue KI-Airlines** (in neuen Spielen; in laufenden Welten entstehen Neugründungen bevorzugt in Ländern ohne KI-Basis)
- **Coralsea Airways** (Premium, Sydney) und **Wattle Jet** (Low-Cost, Melbourne) – Australien, Neuseeland, dazu Los Angeles und Tokio.
- **Maple Crest Air** (Premium, Toronto) und **Cascadia Jet** (Low-Cost, Vancouver) – Kanada und USA.
- **Volga Avia** (Premium, Moskau) – Russland, Istanbul, Dubai.
- **Pampero** (Low-Cost, Buenos Aires) – Argentinien, Chile, Brasilien, Peru.
- Die Netze sind so bemessen, dass Platz für Spielende bleibt (in Tests 78–95 % Auslastung). Insgesamt jetzt 30 KI-Airlines.

**Texte und Anleitung**
- Anleitung neu: eigene Seiten „Die Hauptwelt“ und „Private Runden“ (nur online), Neustart nach der Pleite, Marktstudien und CFO-Beratung, A380/747/Concorde, richtige Antrittszeiten fürs Personal (3–21 Tage, in der Gründungsphase höchstens 5).
- Überall stimmen die Zahlen (211 Flughäfen, 30 KI-Airlines statt 118 und 24). Die Einladung in der Hauptwelt spricht nicht mehr von „bis zu vier Airlines“; Tempoänderungen in der Hauptwelt heißen nicht mehr „Die Spielleitung …“.

**Geprüft**
- Wirtschaftskern: 7 Zufallsläufe à 500–900 Tage mit allen Aktionsarten, keine Ausnahme, keine ungültigen Werte, Speichern/Laden deterministisch.
- Hauptwelt mit 60 Airlines über 400 Tage: rund 60 ms je Spieltag, Spitze 0,7 s am Monatsende, Spielstand 343 KB gepackt.
- Balance mit einer automatischen Testspielerin (wählt Strecken nach Prognose, führt Preise nach Auslastung, schließt Verlustbringer nach 60 Tagen), Eigenkapital-Zuwachs nach zwei Jahren bei rund 15 Mio. € Start: Toronto +165 Mio. €, St. Petersburg +116, Delhi +88, Buenos Aires +82, Moskau +60, São Paulo +48, Hamburg +37, Tokio −1. Sydney: einmal insolvent, einmal +16 Mio. €; Johannesburg −12 Mio. € (siehe Grenzen).
- KI-Welt über zwei Jahre: keine KI-Airline insolvent; die neuen KI-Airlines bleiben stabil.

## Neu in 0.12: Großraumjets, Concorde, Weltkarte, Marktstudien und CFO

**Flugzeuge**
- **Airbus A380-800** (520 Sitze Standard, 15.200 km) und **Boeing 747-8** (410 Sitze, 14.300 km, großer Frachtraum): je eigene Musterberechtigung (eigene Pilotengruppe). Beide werden nicht mehr gebaut – nur Leasing (knapper Bestand) oder Gebrauchtmarkt, keine Werksbestellung. Der A380 braucht große Flughäfen (Code F, im Spiel: ab 25 Mio. Passagieren im Jahr – 102 Flughäfen). Sie lohnen sich nur auf sehr dichten Strecken zwischen großen Drehkreuzen; auf den meisten Langstrecken verdienen 787/A350/777 mehr.
- **Concorde** (100 Sitze, 2.150 km/h, 7.200 km): bewusst extrem – rund 30 t Kerosin je Blockstunde, sehr teure Wartung, 3 Piloten. Nur gebraucht zu kaufen, weltweit höchstens 6, höchstens 2 je Airline. Geschäftsreisende zahlen für den Zeitgewinn (Nutzenaufschlag je eingesparter Stunde), dazu Prestige für die Marke. Auf London–New York um 2.500–3.500 € je Strecke verdient sie, auf den meisten anderen Strecken verliert sie 150.000–300.000 € pro Tag.

**Weltkarte: 211 statt 118 Flughäfen**
- Neu u. a. Australien (Brisbane, Perth, Adelaide, Gold Coast, Canberra, Cairns, Hobart, Darwin, Townsville, Newcastle, Sunshine Coast, Launceston, Alice Springs), Neuseeland und Pazifik (Auckland, Wellington, Christchurch, Queenstown, Nadi, Nouméa, Papeete, Port Moresby), Bali, Russland (St. Petersburg, Sotschi, Kasan, Jekaterinburg, Nowosibirsk, Irkutsk, Wladiwostok, Kaliningrad, Ufa, Krasnojarsk, Chabarowsk, Murmansk, Jakutsk, Mineralnyje Wody), Afrika (Durban, Sansibar, Kilimandscharo, Mombasa, Kigali, Entebbe, Lusaka, Harare, Victoria Falls, Maputo, Windhuk, Luanda, Abidjan, Douala, Abuja, Seychellen, Antananarivo, Scharm El-Scheich, Luxor, Agadir), Südamerika (Rio, Brasília, Belo Horizonte, Salvador, Recife, Fortaleza, Porto Alegre, Florianópolis, Manaus, Buenos Aires, Córdoba, Mendoza, Bariloche, Montevideo, Quito, Guayaquil, Medellín, Cartagena, Cali, Cusco, Asunción, Santa Cruz, Panama-Stadt) und Kanada (Montréal, Calgary, Edmonton, Ottawa, Winnipeg, Halifax, Québec, Victoria, Saskatoon, Regina, St. John's, Whitehorse, Yellowknife, Iqaluit). Echte IATA-Codes und Koordinaten, Einzugsgebiet und Passagierzahlen gerundet.
- Neue Länder mit eigenen Entgelten, Steuern und Kostenniveau (u. a. Neuseeland, Argentinien, Uruguay, Ecuador, Panama, Bolivien, Paraguay, Ruanda, Uganda, Sambia, Simbabwe, Mosambik, Namibia, Angola, Elfenbeinküste, Kamerun, Madagaskar, Seychellen, Fidschi, Papua-Neuguinea); Länderflächen auf der Karte für alle außer kleinen Inselstaaten.
- **Sydney:** vorher 59 Ziele in Reichweite, mit dem A320neo praktisch nur Melbourne lohnend; jetzt 113 Ziele, davon 21 mit dem A320neo erreichbar und 9 mit positivem Streckenbeitrag (Perth, Auckland, Bali, Brisbane, Gold Coast, Melbourne, Nadi …), dazu Langstrecken wie Los Angeles und Tokio.
- Inlandsflüge zwischen Regionen eines Landes (z. B. Moskau–Wladiwostok) gelten als Inland, nicht als interkontinental. Familienbande (VFR) für typische Paare wie Sydney–Auckland, Lissabon–São Paulo, Paris–Montréal.

**Marktstudien (Markt → Marktstudien)**
- Vier Arten: **Streckenanalyse**, **Flugzeugbeschaffung**, **Standort- und Basisanalyse**, **Wettbewerb und Marktlücken** – jeweils weltweit oder mit Schwerpunkt Region, Land oder Flughafen (das deckt „Markterweiterung“ und „Regionalanalyse“ ab).
- Drei Pakete: **Klein** 35.000 €, 4 Tage, 30 Kandidaten, 3 Vorschläge · **Erweitert** 140.000 €, 9 Tage, 80 Kandidaten, 3 Tarifstufen, 6 Vorschläge · **Umfassend** 420.000 €, 16 Tage, 160 Kandidaten, 4 Tarifstufen, 10 Vorschläge, misst zusätzlich den Nachfragetrend der drei besten Strecken. Preise und Umfang stehen in `P.STUDIES` in `shared/engine.cjs`. Eine Fachkraft für Marktanalyse macht Studien bis zu 30 % günstiger und schneller und die Zahlen genauer. Höchstens 3 Studien gleichzeitig, die letzten 12 Berichte bleiben gespeichert.
- Der Bericht entsteht erst am Liefertag aus dem dann aktuellen Spielstand – mit derselben Prognose wie die Streckenplanung: Nachfrage, Auslastung, Erlöse, Kosten, Streckenbeitrag, Investition, Wettbewerb, Risiken, Wachstumspotenzial, Vergleich und eine begründete Empfehlung. Aus jedem Vorschlag geht es direkt in die Planung, zum Datenblatt, zur Basis-Eröffnung oder zur CFO.
- Wo das Spiel keine Daten hat (z. B. künftige Reaktion der Konkurrenz), steht das als Risiko bzw. Annahme im Bericht.

**CFO-Beratung (Finanzen → CFO-Beratung)**
- Die CFO Katrin Vogel beantwortet elf Fragen aus den echten Zahlen: finanzielle Lage, ob ein Flugzeug oder eine neue Basis drin ist, unrentable Strecken, Kostensenkung, Liquiditätsreserve (zwei Monate Fixkosten), beste Investition, Wirkung neuer Flugzeuge, zusätzliche Schulden, Entwicklung von Einnahmen und Ausgaben, Gewinnhebel. Jede Antwort hat eine Einordnung (Wachstum, Vorsicht, Kostenoptimierung, Investitionsprüfung, Risikowarnung, Lagebild) und Knöpfe zum Handeln.
- **Szenario-Rechner:** Flugzeug kaufen/leasen, neue Basis, neue Strecke, Strecke einstellen, Kerosinpreis, Kredit – mit Einmalkosten, Monatswirkung, Liquidität danach, 6-Monats-Verlauf mit und ohne Entscheidung, Amortisation und Urteil. Bis zu vier Szenarien lassen sich nebeneinander vergleichen.
- Marktstudie und CFO greifen ineinander: „CFO fragen“ an jeder Empfehlung übernimmt Strecke, Muster oder Standort samt Netzwert und Kautionen in den Rechner. Die CFO führt nichts aus und garantiert nichts.
- Bewusst ohne freie Texteingabe: Ein echter Chat bräuchte eine externe KI-Schnittstelle; der Fragenkatalog rechnet dafür nachvollziehbar mit den Spielzahlen.

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
- Die alte Airline wird abgewickelt: Flugzeuge gehen günstig an den Gebrauchtmarkt, Slots und Gates werden frei, Personal und Fachkräfte wechseln an den Arbeitsmarkt, offene Angebote, Kooperationen und Auktionsgebote verfallen. Die Assistenz bleibt.
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

- **KI-Airlines** nutzen A380, 747 und Concorde nicht.
- **Schwere Heimatbasen:** In Sydney lohnen sich anfangs nur wenige Strecken (Bali, Los Angeles, Tokio – Inlandsflüge sind jetzt umkämpft) und Langstrecke braucht viel Kapital und Personal (eine 787 auf Ultralangstrecke rund 20 Piloten). **Afrika** bleibt wegen der niedrigen Einkommen im Nachfragemodell dünn: ab Johannesburg trägt anfangs praktisch nur Durban, Großraumjets nach Europa fliegen halb leer. Gute Starts: Toronto, St. Petersburg, Delhi, Buenos Aires, Moskau, São Paulo, Hamburg.
- **Hauptwelt:** Airlines von Personen, die nicht mehr spielen, bleiben bestehen und belegen einen der 60 Plätze. Ein Aufräumen verwaister Airlines gibt es noch nicht.
- **Studien** rechnen mit einem Flug täglich im Standardprodukt; Frequenz, Produkt und Konkurrenzreaktion prüfen Sie danach in der Streckenplanung bzw. im CFO-Szenario.
- Die Code-F-Grenze des A380 ist eine Vereinfachung über die Passagierzahl (manche reale A380-Flughäfen wie Brisbane oder Perth liegen darunter).
- **Konto:** Keine E-Mail, kein Passwort-Reset. Ein vergessenes Passwort heißt neues Konto.
- **Schutz vor Missbrauch:** Es gibt keine Begrenzung der Anmeldeversuche. Für einen öffentlichen Betrieb sollte eine dazukommen.
- **Netlify-Verbrauch:**
  - Jedes geöffnete Spiel fragt etwa alle 1 bis 6 Sekunden nach dem Stand.
  - Bei jedem neuen Spieltag lädt jedes Gerät den Spielstand (rund 150 bis 250 KB, in einer vollen Hauptwelt bis etwa 350 KB).
  - Auf dem kostenlosen Netlify-Plan reicht das gut für Testrunden. Behalten Sie die Function-Aufrufe und den Datenverkehr in der Netlify-Übersicht im Blick.
- **Spielstände:** Spielstände der Claude-Artifact-Version lassen sich hier nicht laden.
