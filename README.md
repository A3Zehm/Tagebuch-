# Ausbildungs-Tagebuch

Kleine Web-App für die Ausbildung zur Vermessungstechnikerin / zum Vermessungstechniker:
Tipps von Kollegen schnell festhalten, in Ordnern sortieren, später wiederfinden.

Alles ist reines HTML, CSS und JavaScript, ohne Framework und ohne Build-Schritt.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst: Navigationsleiste, Plus-Button, Eingabefenster |
| `css/style.css` | Aussehen (dunkles und helles Design, Farben ganz oben als Variablen) |
| `js/daten.js` | Datenmodell: Ordner, Einträge, Speichern im Browser (`localStorage`) |
| `js/app.js` | Ansichten (Start, Ordner, Eintrag, Suche, Mehr) und Bedienung |
| `server.ps1`, `Starten.cmd` | Kleiner Webserver zum Testen am PC |

## Am PC testen

Doppelklick auf **`Starten.cmd`**. Die App öffnet sich unter <http://localhost:8080>.
Mit den Entwicklertools des Browsers (F12, dann das Handy-Symbol) siehst du sie in Handygröße.
