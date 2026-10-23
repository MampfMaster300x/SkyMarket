# SKYMARKET Online (Testversion 0.13.2)

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
