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

// Bereits benutzte Kollegen-Namen, die häufigsten zuerst.
function vonNamen() {
  const anzahl = new Map();
  for (const e of daten.eintraege) {
    if (e.von) anzahl.set(e.von, (anzahl.get(e.von) || 0) + 1);
  }
  return [...anzahl.keys()].sort((a, b) => anzahl.get(b) - anzahl.get(a) || a.localeCompare(b, 'de'));
}
