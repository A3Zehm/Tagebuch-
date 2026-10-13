// app.js – Ansichten und Bedienung
//
// Jede Ansicht hat eine Adresse hinter dem #, z. B. #/ordner/eingang.
// zeige() liest die Adresse und zeichnet die passende Ansicht in <main id="inhalt">.

const inhalt = document.getElementById('inhalt');
const ENTWURF_SCHLUESSEL = 'ausbildungstagebuch-entwurf';

const ICON_ORDNER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>';
const ICON_MEHR = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>';

// ---------- Hilfsfunktionen ----------

// Text sicher in HTML einsetzen (verhindert, dass < oder & das Layout zerstören).
function esc(wert) {
  return String(wert ?? '').replace(/[&<>"']/g, z => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[z]));
}

function datumText(iso, mitUhrzeit = false) {
  const datum = new Date(iso);
  const heute = new Date();
  const gestern = new Date();
  gestern.setDate(heute.getDate() - 1);
  const uhrzeit = datum.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (datum.toDateString() === heute.toDateString()) return 'heute, ' + uhrzeit;
  if (datum.toDateString() === gestern.toDateString()) return 'gestern, ' + uhrzeit;
  const tag = datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return mitUhrzeit ? tag + ', ' + uhrzeit : tag;
}

// "GAB: Grobabsteckung" → Kürzel hervorgehoben, Rest normal.
function ordnerNameHtml(name) {
  const teile = name.match(/^([A-ZÄÖÜ]{1,6}):\s*(.+)$/);
  return teile ? `<span class="kuerzel">${esc(teile[1])}</span>${esc(teile[2])}` : esc(name);
}

function toast(nachricht) {
  const el = document.getElementById('toast');
  el.textContent = nachricht;
  el.classList.add('sichtbar');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('sichtbar'), 2200);
}

// ---------- Bausteine für Listen ----------

function eintragKarte(eintrag, { ort = true, einsortieren = false } = {}) {
  return `
    <article class="eintrag" data-link="#/eintrag/${esc(eintrag.id)}">
      <h3><span class="titel">${esc(eintragTitel(eintrag))}</span>${eintrag.wichtig ? '<span class="stern" title="wichtig">★</span>' : ''}</h3>
      <p class="vorschau">${esc(eintrag.text)}</p>
      <p class="meta">
        ${ort ? `<span class="ort">${esc(ordnerPfadText(eintrag.ordnerId))}</span>` : ''}
        ${eintrag.von ? `<span>von ${esc(eintrag.von)}</span>` : ''}
        <span>${datumText(eintrag.erstellt)}</span>
      </p>
      ${einsortieren ? `<button class="knopf" data-aktion="verschieben" data-id="${esc(eintrag.id)}">Einsortieren</button>` : ''}
    </article>`;
}

function eintragListe(eintraege, optionen) {
  return `<div class="liste">${eintraege.map(e => eintragKarte(e, optionen)).join('')}</div>`;
}

function ordnerZeile(ordner) {
  const anzahl = anzahlEintraege(ordner.id);
  const hervorheben = ordner.id === EINGANG_ID && anzahl > 0;
  return `
    <a class="zeile" href="#/ordner/${esc(ordner.id)}">
      ${ICON_ORDNER}
      <span class="name">${ordnerNameHtml(ordner.name)}</span>
      <span class="zahl ${hervorheben ? 'voll' : ''}">${anzahl}</span>
      <span class="pfeil">›</span>
    </a>`;
}

// ---------- Dialoge ----------

// Kleines Fenster mit Text, optionalem Eingabefeld und Knöpfen.
// Liefert { wert, text }: wert vom gedrückten Knopf (null = weggetippt), text aus dem Eingabefeld.
function dialog({ titel, text = '', eingabe = null, knoepfe }) {
  return new Promise(fertig => {
    const hintergrund = document.createElement('div');
    hintergrund.className = 'dialog-hintergrund';
    hintergrund.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>${esc(titel)}</h2>
        ${text ? `<p>${esc(text)}</p>` : ''}
        ${eingabe !== null ? `<input class="feld" value="${esc(eingabe)}" autocomplete="off">` : ''}
        <div class="dialog-knoepfe">
          ${knoepfe.map((k, nr) => `<button class="knopf ${k.art || ''}" data-nr="${nr}">${esc(k.text)}</button>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(hintergrund);

    const feld = hintergrund.querySelector('input');
    const schliessen = wert => {
      hintergrund.remove();
      fertig({ wert, text: feld ? feld.value.trim() : '' });
    };

    hintergrund.addEventListener('click', ereignis => {
      ereignis.stopPropagation();
      if (ereignis.target === hintergrund) return schliessen(null);
      const knopf = ereignis.target.closest('[data-nr]');
      if (knopf) schliessen(knoepfe[knopf.dataset.nr].wert);
    });
    if (feld) {
      feld.addEventListener('keydown', ereignis => {
        if (ereignis.key === 'Enter') schliessen(knoepfe[0].wert);
      });
      feld.focus();
      feld.select();
    }
  });
}

async function bestaetigen(titel, text, jaText, gefaehrlich = false) {
  const antwort = await dialog({
    titel, text,
    knoepfe: [{ text: jaText, wert: true, art: gefaehrlich ? 'gefahr' : 'haupt' }, { text: 'Abbrechen', wert: false }],
  });
  return antwort.wert === true;
}

// Liefert den eingegebenen Text oder null bei Abbruch.
async function texteingabe(titel, vorgabe, okText) {
  const antwort = await dialog({
    titel, eingabe: vorgabe,
    knoepfe: [{ text: okText, wert: true, art: 'haupt' }, { text: 'Abbrechen', wert: false }],
  });
  return antwort.wert === true && antwort.text ? antwort.text : null;
}

// Vollbild-Liste aller Ordner zum Antippen.
// Liefert die Ordner-ID, OBERSTE_EBENE oder null bei Abbruch.
const OBERSTE_EBENE = '__oben__';

function ordnerWaehlen({ titel, aktuell = null, gesperrt = new Set(), obersteEbene = false }) {
  return new Promise(fertig => {
    const blatt = document.createElement('section');
    blatt.className = 'blatt auswahl';
    const punkte = ordnerListe().map(({ ordner, tiefe }) => `
      <button class="auswahl-punkt ${ordner.id === aktuell ? 'aktuell' : ''}" data-id="${esc(ordner.id)}"
              style="padding-left:${14 + tiefe * 24}px" ${gesperrt.has(ordner.id) ? 'disabled' : ''}>
        ${ICON_ORDNER}<span>${ordnerNameHtml(ordner.name)}</span>${ordner.id === aktuell ? '✓' : ''}
      </button>`).join('');
    blatt.innerHTML = `
      <header class="blatt-kopf">
        <button class="knopf text" data-id="">Abbrechen</button>
        <h2>${esc(titel)}</h2>
        <span class="platzhalter"></span>
      </header>
      <div class="blatt-inhalt liste-ohne-abstand">
        ${obersteEbene ? `<button class="auswahl-punkt ${aktuell === OBERSTE_EBENE ? 'aktuell' : ''}" data-id="${OBERSTE_EBENE}"><span>Oberste Ebene</span></button>` : ''}
        ${punkte}
      </div>`;
    document.body.appendChild(blatt);

    blatt.addEventListener('click', ereignis => {
      ereignis.stopPropagation();
      const knopf = ereignis.target.closest('[data-id]');
      if (!knopf || knopf.disabled) return;
      blatt.remove();
      fertig(knopf.dataset.id || null);
    });
  });
}

// ---------- Navigation ----------

let gezeigteAdresse = null;

function aktuelleRoute() {
  const teile = location.hash.replace(/^#\/?/, '').split('/');
  return { name: teile[0] || 'start', id: teile[1] ? decodeURIComponent(teile[1]) : null };
}

// Zu einer Adresse wechseln. Die Ansicht wird sofort gezeichnet
// (wichtig fürs iPhone: nur so öffnet sich z. B. bei der Suche direkt die Tastatur).
function gehe(adresse) {
  if (location.hash !== adresse) history.pushState(null, '', adresse);
  zeige();
  window.scrollTo(0, 0);
}

function zurueck() {
  if (history.length > 1) history.back();
  else gehe('#/');
}

function zeige() {
  const route = aktuelleRoute();
  const ansichten = {
    start: zeigeStart,
    ordner: zeigeOrdner,
  };
  (ansichten[route.name] || zeigeStart)(route.id);
  gezeigteAdresse = location.hash;

  const nav = { start: 'start', ordner: 'ordner', suche: 'suche', einstellungen: 'einstellungen' };
  document.querySelectorAll('.leiste a').forEach(a => {
    a.classList.toggle('aktiv', a.dataset.nav === nav[route.name]);
  });
}

// Zurück-Wischen bzw. Zurück-Taste des Browsers
window.addEventListener('popstate', () => {
  if (location.hash !== gezeigteAdresse) zeige();
});

// ---------- Ansichten ----------

function zeigeStart() {
  const unsortiert = eintraegeIn(EINGANG_ID).length;
  const wichtig = daten.eintraege.filter(e => e.wichtig).length;
  const neueste = neuesteEintraege(10);

  inhalt.innerHTML = `
    <header class="kopf"><h1>Ausbildungs-Tagebuch</h1></header>
    <div class="kacheln">
      <a class="kachel ${unsortiert ? 'markiert' : ''}" href="#/ordner/${EINGANG_ID}">
        <span class="zahl">${unsortiert}</span>
        <span class="name">Eingang</span>
        <span class="hinweis">unsortiert</span>
      </a>
      <a class="kachel" href="#/wichtig">
        <span class="zahl">${wichtig}</span>
        <span class="name">★ Wichtig</span>
        <span class="hinweis">markiert</span>
      </a>
    </div>
    <h2 class="abschnitt">Zuletzt hinzugefügt</h2>
    ${neueste.length
      ? eintragListe(neueste)
      : '<p class="leer">Noch keine Einträge.<br>Tippe auf <strong>+</strong>, um den ersten Tipp festzuhalten.</p>'}`;
}

function zeigeOrdner(id) {
  const ordner = id && ordnerMitId(id);
  if (!ordner) return zeigeOrdnerUebersicht();

  const istEingang = id === EINGANG_ID;
  const eltern = ordnerPfad(id).slice(0, -1);
  const unter = unterordner(id);
  const eintraege = eintraegeIn(id);

  let hinweis = '';
  if (istEingang) {
    hinweis = eintraege.length
      ? `<p class="leise">${eintraege.length} unsortiert. Mit „Einsortieren“ legst du einen Eintrag in den passenden Ordner.</p>`
      : '<p class="leer">Alles einsortiert. 👍</p>';
  } else if (!unter.length && !eintraege.length) {
    hinweis = '<p class="leer">Dieser Ordner ist noch leer.<br>Mit <strong>+</strong> landet ein neuer Eintrag direkt hier.</p>';
  }

  inhalt.innerHTML = `
    <nav class="brotkrumen">
      <a href="#/ordner">Ordner</a>
      ${eltern.map(o => `<span>›</span><a href="#/ordner/${esc(o.id)}">${esc(o.name)}</a>`).join('')}
    </nav>
    <header class="kopf">
      <h1>${ordnerNameHtml(ordner.name)}</h1>
      ${istEingang ? '' : `<button class="knopf rund" data-aktion="ordner-menue" data-id="${esc(id)}" aria-label="Ordner bearbeiten">${ICON_MEHR}</button>`}
    </header>
    ${hinweis}
    ${unter.length ? `<div>${unter.map(ordnerZeile).join('')}</div>` : ''}
    ${eintraege.length ? `
      <h2 class="abschnitt">${eintraege.length} ${eintraege.length === 1 ? 'Eintrag' : 'Einträge'}</h2>
      ${eintragListe(eintraege, { ort: false, einsortieren: istEingang })}` : ''}`;
}

function zeigeOrdnerUebersicht() {
  inhalt.innerHTML = `
    <header class="kopf"><h1>Ordner</h1></header>
    <div>${unterordner(null).map(ordnerZeile).join('')}</div>`;
}

// ---------- Eingabe (Editor) ----------

const editor = {
  blatt: document.getElementById('editor'),
  ueberschrift: document.getElementById('editor-ueberschrift'),
  text: document.getElementById('editor-text'),
  titel: document.getElementById('editor-titel'),
  von: document.getElementById('editor-von'),
  namen: document.getElementById('editor-namen'),
  ordnerName: document.getElementById('editor-ordner-name'),
  eintragId: null,      // null = neuer Eintrag
  ordnerId: EINGANG_ID,
};

function editorWerte() {
  return {
    text: editor.text.value,
    titel: editor.titel.value,
    von: editor.von.value,
    ordnerId: editor.ordnerId,
  };
}

function editorOeffnen(eintrag = null) {
  editor.eintragId = eintrag ? eintrag.id : null;

  let werte = eintrag;
  if (!werte) {
    // Angefangener, nicht gespeicherter Text? Dann den wiederherstellen.
    try { werte = JSON.parse(localStorage.getItem(ENTWURF_SCHLUESSEL)); } catch { werte = null; }
  }
  if (!werte) {
    // In einem Ordner geöffnet → dieser Ordner ist vorausgewählt, sonst Eingang.
    const route = aktuelleRoute();
    const ordnerId = route.name === 'ordner' && ordnerMitId(route.id) ? route.id : EINGANG_ID;
    werte = { text: '', titel: '', von: '', ordnerId };
  }

  editor.text.value = werte.text;
  editor.titel.value = werte.titel;
  editor.von.value = werte.von;
  editor.ordnerId = ordnerMitId(werte.ordnerId) ? werte.ordnerId : EINGANG_ID;
  editor.ueberschrift.textContent = eintrag ? 'Eintrag bearbeiten' : 'Neuer Eintrag';
  editorOrdnerAnzeigen();
  namenVorschlagen();

  editor.blatt.hidden = false;
  document.body.classList.add('blatt-offen');
  editor.text.focus();   // muss direkt im Klick passieren, damit das iPhone die Tastatur öffnet
}

function editorSchliessen() {
  editor.blatt.hidden = true;
  document.body.classList.remove('blatt-offen');
  localStorage.removeItem(ENTWURF_SCHLUESSEL);
}

function editorOrdnerAnzeigen() {
  editor.ordnerName.textContent = ordnerPfadText(editor.ordnerId);
}

// Unter "Von wem?" bereits benutzte Namen als antippbare Vorschläge zeigen.
function namenVorschlagen() {
  const eingabe = editor.von.value.trim().toLowerCase();
  const namen = vonNamen()
    .filter(name => name.toLowerCase() !== eingabe && name.toLowerCase().includes(eingabe))
    .slice(0, 8);
  editor.namen.innerHTML = namen
    .map(name => `<button type="button" class="chip" data-name="${esc(name)}">${esc(name)}</button>`)
    .join('');
}

// Bei jeder Eingabe den Entwurf sichern – so geht nichts verloren,
// auch wenn das iPhone die App zwischendurch schließt.
function entwurfSichern() {
  if (editor.eintragId) return;
  localStorage.setItem(ENTWURF_SCHLUESSEL, JSON.stringify(editorWerte()));
}

editor.blatt.addEventListener('input', entwurfSichern);
editor.von.addEventListener('input', namenVorschlagen);
editor.namen.addEventListener('click', ereignis => {
  const chip = ereignis.target.closest('[data-name]');
  if (!chip) return;
  editor.von.value = chip.dataset.name;
  namenVorschlagen();
  entwurfSichern();
});

function editorHatAenderungen() {
  const jetzt = editorWerte();
  if (!editor.eintragId) return jetzt.text.trim() !== '';
  const vorher = eintragMitId(editor.eintragId);
  return ['text', 'titel', 'von', 'ordnerId'].some(feld => jetzt[feld].trim() !== vorher[feld]);
}

// ---------- Aktionen ----------
// Jeder Knopf mit data-aktion="name" ruft hier aktionen.name(knopf) auf.

const aktionen = {
  neu() {
    editorOeffnen();
  },

  async 'editor-abbrechen'() {
    if (editorHatAenderungen() &&
        !(await bestaetigen('Verwerfen?', 'Deine Eingabe ist noch nicht gespeichert.', 'Verwerfen', true))) return;
    editorSchliessen();
  },

  'editor-speichern'() {
    const werte = editorWerte();
    if (!werte.text.trim()) {
      toast('Bitte zuerst den Text eingeben.');
      editor.text.focus();
      return;
    }
    if (editor.eintragId) {
      eintragAendern(editor.eintragId, werte);
      toast('Änderungen gespeichert');
    } else {
      eintragAnlegen(werte);
      dauerhaftSpeichernAnfragen();
      toast('Gespeichert in „' + ordnerMitId(werte.ordnerId).name + '“');
    }
    editorSchliessen();
    zeige();
  },

  async 'editor-ordner'() {
    const id = await ordnerWaehlen({ titel: 'Ordner wählen', aktuell: editor.ordnerId });
    if (!id) return;
    editor.ordnerId = id;
    editorOrdnerAnzeigen();
    entwurfSichern();
  },

  // Eintrag in einen anderen Ordner legen (z. B. aus dem Eingang einsortieren)
  async verschieben(knopf) {
    const eintrag = eintragMitId(knopf.dataset.id);
    const ziel = await ordnerWaehlen({ titel: 'Verschieben nach', aktuell: eintrag.ordnerId });
    if (!ziel || ziel === eintrag.ordnerId) return;
    eintragAendern(eintrag.id, { ordnerId: ziel });
    toast('Verschoben nach „' + ordnerMitId(ziel).name + '“');
    zeige();
  },
};

// Ein einziger Klick-Abfänger für die ganze App:
// data-aktion="..." führt eine Aktion aus, Links und data-link wechseln die Ansicht.
document.addEventListener('click', ereignis => {
  const ausloeser = ereignis.target.closest('[data-aktion]');
  if (ausloeser && aktionen[ausloeser.dataset.aktion]) {
    ereignis.preventDefault();
    aktionen[ausloeser.dataset.aktion](ausloeser);
    return;
  }
  const link = ereignis.target.closest('a[href^="#"], [data-link]');
  if (link) {
    ereignis.preventDefault();
    gehe(link.getAttribute('href') || link.dataset.link);
  }
});

// ---------- Start ----------

zeige();
