# Ausbildungs-Tagebuch

Kleine Web-App für die Ausbildung zur Vermessungstechnikerin / zum Vermessungstechniker:
Tipps von Kollegen schnell festhalten, in Ordnern sortieren, später wiederfinden.

Alles ist reines HTML, CSS und JavaScript, ohne Framework und ohne Build-Schritt.
Wie die App aufs iPhone kommt, steht in **[ANLEITUNG.md](ANLEITUNG.md)**.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst: Navigationsleiste, Plus-Button, Eingabefenster |
| `css/style.css` | Aussehen (dunkles und helles Design, Farben ganz oben als Variablen) |
| `js/daten.js` | Datenmodell: Ordner, Notizen, Tagebuch-Tage, Suche, Backup, Speichern im Browser (`localStorage`) |
| `js/tagebuch.js` | Tagebuch: Tagesansicht, Kalender, Liste, „Markierung als Notiz“ |
| `js/app.js` | Ansichten (Start, Ordner, Notiz, Suche, Wichtig, Mehr), Notiz-Editor und Bedienung |
| `sw.js` | Service Worker: macht die App offline-fähig |
| `manifest.json`, `icons/` | Name und Icon für den Homescreen |
| `server.ps1`, `Starten.cmd` | Kleiner Webserver zum Testen am PC |

## So hängt alles zusammen

- **Ansichten:** Jede Ansicht hat eine Adresse hinter dem `#`, z. B. `#/ordner/eingang` oder `#/suche`.
  `zeige()` in `app.js` liest die Adresse und ruft die passende Funktion auf (`zeigeStart`, `zeigeOrdner`, …).
- **Knöpfe:** Ein Knopf mit `data-aktion="name"` ruft beim Antippen `aktionen.name(...)` in `app.js` auf.
- **Daten:** Alles liegt in der Variablen `daten` und wird nach jeder Änderung mit `speichern()` als JSON
  im Browser abgelegt. Neue Funktionen für Daten gehören in `daten.js`.

## Am PC testen

Doppelklick auf **`Starten.cmd`**. Die App öffnet sich unter <http://localhost:8080>.
Mit den Entwicklertools des Browsers (F12, dann das Handy-Symbol) siehst du sie in Handygröße.
Weil die App sich selbst offline speichert, musst du nach einer Änderung **zweimal neu laden**.

## Tagebuch

- Jeder Tag steht in `daten.tage` unter seinem Datum, z. B. `"2026-10-13": { text, stimmung }`.
  Jahr, Monat und Tag ergeben sich aus diesem Datum, Ordner braucht es dafür nicht.
- Adressen: `#/tagebuch` (heute), `#/tagebuch/2026-10-13`, `#/kalender/2026-10` (Monat),
  `#/kalender/2026` (Jahr), `#/tagebuchliste`.
- Eine Notiz, die aus dem Tagebuch entsteht, bekommt das Feld `tag` mit dem Datum.
  Darüber laufen die Links in beide Richtungen.
- Ältere Daten ohne Tagebuch werden beim Laden von `datenAktualisieren()` in `daten.js`
  ergänzt, dabei geht nichts verloren. Zurück zum Stand vor dem Tagebuch: `git checkout vor-tagebuch`.
