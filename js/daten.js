// daten.js – Datenmodell und Speicherung
//
// Alle Daten liegen als EIN JSON-Objekt im localStorage des Browsers:
// {
//   version, erstellt, letztesBackup, thema,
//   ordner:    [{ id, name, elternId }]          elternId = null → oberste Ebene
//   eintraege: [{ id, text, titel, ordnerId, von, wichtig, erstellt, geaendert }]
// }

const SPEICHER_SCHLUESSEL = 'ausbildungstagebuch';
const RETTUNG_SCHLUESSEL = 'ausbildungstagebuch-rettung';
const EINGANG_ID = 'eingang';
const DATEN_VERSION = 1;

let daten = laden();

// ---------- Laden und Speichern ----------

function neueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function leereDaten() {
  return {
    version: DATEN_VERSION,
    erstellt: new Date().toISOString(),
    letztesBackup: null,
    thema: 'dunkel',
    ordner: startOrdner(),
    eintraege: [],
  };
}

function laden() {
  const roh = localStorage.getItem(SPEICHER_SCHLUESSEL);
  if (roh) {
    try {
      return JSON.parse(roh);
    } catch (fehler) {
      // Beschädigte Daten nicht überschreiben, sondern zur Rettung beiseitelegen.
      localStorage.setItem(RETTUNG_SCHLUESSEL, roh);
      console.error('Daten konnten nicht gelesen werden', fehler);
    }
  }
  const neu = leereDaten();
  localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(neu));
  return neu;
}

function speichern() {
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(daten));
  } catch (fehler) {
    alert('Speichern fehlgeschlagen! Bitte sofort ein Backup erstellen.\n\n' + fehler.message);
  }
}

// Bittet den Browser, die Daten nicht automatisch zu löschen.
function dauerhaftSpeichernAnfragen() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

// ---------- Ordner ----------

function startOrdner() {
  const ordner = [];
  function neu(name, elternId = null, id = neueId()) {
    ordner.push({ id, name, elternId });
    return id;
  }

  neu('Eingang', null, EINGANG_ID);
  neu('Allgemeines');
  const aussendienst = neu('Außendienst');
  neu('GH: Grenzherstellung', aussendienst);
  neu('T: Teilungsvermessung (Sonderung)', aussendienst);
  neu('AM: Gebäudeeinmessung', aussendienst);
  neu('TOP: Lageplan', aussendienst);
  neu('GAB: Grobabsteckung', aussendienst);
  neu('FAB: Feinabsteckung', aussendienst);
  const innendienst = neu('Innendienst');
  neu('GeografCAD', innendienst);
  neu('Zeichnen von Lageplänen', innendienst);
  neu('Bearbeitung von Gebäudeeinmessung', innendienst);
  neu('Begriffe');
  neu('Messgerät');
  return ordner;
}

function ordnerMitId(id) {
  return daten.ordner.find(o => o.id === id);
}

function unterordner(elternId) {
  return daten.ordner.filter(o => o.elternId === elternId);
}

// Liste vom obersten Ordner bis zum Ordner selbst.
function ordnerPfad(id) {
  const pfad = [];
  let ordner = ordnerMitId(id);
  while (ordner) {
    pfad.unshift(ordner);
    ordner = ordnerMitId(ordner.elternId);
  }
  return pfad;
}

function ordnerPfadText(id) {
  return ordnerPfad(id).map(o => o.name).join(' › ');
}

// Der Ordner selbst und alle Ordner darunter (beliebig tief).
function ordnerUndUnterordnerIds(id) {
  const ids = [id];
  for (const u of unterordner(id)) ids.push(...ordnerUndUnterordnerIds(u.id));
  return ids;
}

// Alle Ordner als flache Liste mit Einrücktiefe – für Auswahllisten.
function ordnerListe(elternId = null, tiefe = 0, liste = []) {
  for (const o of unterordner(elternId)) {
    liste.push({ ordner: o, tiefe });
    ordnerListe(o.id, tiefe + 1, liste);
  }
  return liste;
}

function ordnerAnlegen(name, elternId = null) {
  const ordner = { id: neueId(), name: name.trim(), elternId };
  daten.ordner.push(ordner);
  speichern();
  return ordner;
}

function ordnerUmbenennen(id, name) {
  const ordner = ordnerMitId(id);
  if (!ordner || id === EINGANG_ID) return;
  ordner.name = name.trim();
  speichern();
}

// Nicht erlaubt: den Eingang verschieben, etwas in den Eingang legen,
// oder einen Ordner in sich selbst bzw. in einen eigenen Unterordner legen.
function ordnerVerschieben(id, neuerElternId) {
  if (id === EINGANG_ID || neuerElternId === EINGANG_ID) return false;
  if (neuerElternId && ordnerUndUnterordnerIds(id).includes(neuerElternId)) return false;
  const ordner = ordnerMitId(id);
  ordner.elternId = neuerElternId;
  // ans Ende der Liste, damit er im neuen Ordner unten erscheint
  daten.ordner.splice(daten.ordner.indexOf(ordner), 1);
  daten.ordner.push(ordner);
  speichern();
  return true;
}

// Löscht den Ordner samt Unterordnern. Die Einträge darin wandern nach zielOrdnerId –
// oder werden mitgelöscht, wenn zielOrdnerId null ist.
function ordnerLoeschen(id, zielOrdnerId) {
  if (id === EINGANG_ID) return;
  const ids = new Set(ordnerUndUnterordnerIds(id));
  if (zielOrdnerId) {
    for (const e of daten.eintraege) if (ids.has(e.ordnerId)) e.ordnerId = zielOrdnerId;
  } else {
    daten.eintraege = daten.eintraege.filter(e => !ids.has(e.ordnerId));
  }
  daten.ordner = daten.ordner.filter(o => !ids.has(o.id));
  speichern();
}

// ---------- Einträge ----------

function neuesteZuerst(a, b) {
  return b.erstellt.localeCompare(a.erstellt);
}

function eintragMitId(id) {
  return daten.eintraege.find(e => e.id === id);
}

function eintraegeIn(ordnerId) {
  return daten.eintraege.filter(e => e.ordnerId === ordnerId).sort(neuesteZuerst);
}

// Anzahl inklusive aller Unterordner.
function anzahlEintraege(ordnerId) {
  const ids = new Set(ordnerUndUnterordnerIds(ordnerId));
  return daten.eintraege.filter(e => ids.has(e.ordnerId)).length;
}

function neuesteEintraege(anzahl) {
  return [...daten.eintraege].sort(neuesteZuerst).slice(0, anzahl);
}

// Titel oder – falls leer – die ersten Worte des Textes.
function eintragTitel(eintrag) {
  if (eintrag.titel) return eintrag.titel;
  const worte = eintrag.text.trim().split(/\s+/);
  let titel = worte.slice(0, 7).join(' ');
  if (titel.length > 60) titel = titel.slice(0, 60);
  return titel.length < eintrag.text.trim().length ? titel + ' …' : titel;
}

function eintragAnlegen({ text, titel = '', ordnerId = EINGANG_ID, von = '' }) {
  const jetzt = new Date().toISOString();
  const eintrag = {
    id: neueId(),
    text: text.trim(),
    titel: titel.trim(),
    ordnerId: ordnerMitId(ordnerId) ? ordnerId : EINGANG_ID,
    von: von.trim(),
    wichtig: false,
    erstellt: jetzt,
    geaendert: jetzt,
  };
  daten.eintraege.push(eintrag);
  speichern();
  return eintrag;
}

// Ändert nur die übergebenen Felder, z. B. eintragAendern(id, { ordnerId: 'abc' }).
function eintragAendern(id, felder) {
  const eintrag = eintragMitId(id);
  if (!eintrag) return;
  for (const [feld, wert] of Object.entries(felder)) {
    eintrag[feld] = typeof wert === 'string' ? wert.trim() : wert;
  }
  if (!ordnerMitId(eintrag.ordnerId)) eintrag.ordnerId = EINGANG_ID;
  eintrag.geaendert = new Date().toISOString();
  speichern();
}

function eintragLoeschen(id) {
  daten.eintraege = daten.eintraege.filter(e => e.id !== id);
  speichern();
}

function wichtigUmschalten(id) {
  const eintrag = eintragMitId(id);
  eintrag.wichtig = !eintrag.wichtig;
  speichern();
  return eintrag.wichtig;
}

function wichtigeEintraege() {
  return daten.eintraege.filter(e => e.wichtig).sort(neuesteZuerst);
}

// ---------- Suche ----------

// Kleinschreibung, ä→a, ö→o, ü→u, ß→ss – so findet "gebaude" auch "Gebäude".
function normalisieren(text) {
  return (text || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function passt(feld, begriff) {
  if (begriff.length > 3) return feld.includes(begriff);
  // Kurze Begriffe wie "AM" oder "GAB" nur am Wortanfang suchen,
  // sonst findet "am" jedes "Name" und "gab" jede "Abgabe".
  const sicher = begriff.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z0-9])' + sicher).test(feld);
}

// Jeder Suchbegriff muss irgendwo vorkommen: im Titel, Ordnerpfad, Kollegen-Namen oder Text.
// Treffer im Titel oder Ordner zählen mehr und stehen deshalb weiter oben.
function suchen(anfrage) {
  const begriffe = normalisieren(anfrage).split(/\s+/).filter(Boolean);
  if (!begriffe.length) return { ordner: [], eintraege: [] };

  const ordner = daten.ordner.filter(o => begriffe.every(b => passt(normalisieren(o.name), b)));

  const pfade = new Map(daten.ordner.map(o => [o.id, normalisieren(ordnerPfadText(o.id))]));
  const gewichte = { titel: 3, ordner: 3, von: 2, text: 1 };
  const treffer = [];

  for (const eintrag of daten.eintraege) {
    const felder = {
      titel: normalisieren(eintrag.titel),
      ordner: pfade.get(eintrag.ordnerId) || '',
      von: normalisieren(eintrag.von),
      text: normalisieren(eintrag.text),
    };
    let punkte = 0;
    const allesGefunden = begriffe.every(begriff => {
      let bester = 0;
      for (const [feld, gewicht] of Object.entries(gewichte)) {
        if (gewicht > bester && passt(felder[feld], begriff)) bester = gewicht;
      }
      punkte += bester;
      return bester > 0;
    });
    if (allesGefunden) treffer.push({ eintrag, punkte });
  }

  treffer.sort((a, b) => b.punkte - a.punkte || neuesteZuerst(a.eintrag, b.eintrag));
  return { ordner, eintraege: treffer.map(t => t.eintrag) };
}

// Bereits benutzte Kollegen-Namen, die häufigsten zuerst.
function vonNamen() {
  const anzahl = new Map();
  for (const e of daten.eintraege) {
    if (e.von) anzahl.set(e.von, (anzahl.get(e.von) || 0) + 1);
  }
  return [...anzahl.keys()].sort((a, b) => anzahl.get(b) - anzahl.get(a) || a.localeCompare(b, 'de'));
}
