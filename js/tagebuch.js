// tagebuch.js – das digitale Tagebuch: Tagesansicht, Kalender, Liste
//
// Adressen:
//   #/tagebuch               → heutiger Tag
//   #/tagebuch/2026-10-13    → ein bestimmter Tag
//
// Die Daten-Funktionen (tagebuchSpeichern, tagebuchTag, …) stehen in daten.js.
// Die Knöpfe hier werden über tagebuchAktionen an app.js angehängt.

const STIMMUNGEN = [
  { stufe: 1, emoji: '😣', name: 'Schlecht', farbe: '#ff6b6b' },
  { stufe: 2, emoji: '😕', name: 'Nicht so gut', farbe: '#ff9f43' },
  { stufe: 3, emoji: '😐', name: 'Okay', farbe: '#ffd43b' },
  { stufe: 4, emoji: '🙂', name: 'Gut', farbe: '#a9e34b' },
  { stufe: 5, emoji: '😄', name: 'Super', farbe: '#40c057' },
];

function stimmung(stufe) {
  return STIMMUNGEN.find(s => s.stufe === stufe) || null;
}

function wochentag(schluessel) {
  return schluesselZuDatum(schluessel).toLocaleDateString('de-DE', { weekday: 'long' });
}

// "13. Oktober 2026"
function langesDatum(schluessel) {
  return schluesselZuDatum(schluessel).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
}

// "13.10.2026"
function kurzesDatum(schluessel) {
  return schluesselZuDatum(schluessel).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Die ersten Worte eines Tages als Vorschau.
function tagVorschau(tag, laenge = 90) {
  const text = (tag && tag.text || '').trim().replace(/\s+/g, ' ');
  return text.length > laenge ? text.slice(0, laenge).replace(/\s\S*$/, '') + ' …' : text;
}

// ---------- Tagesansicht ----------

let offenerTag = null;        // Datum des gerade angezeigten Tages
let speicherTimer = null;     // fürs automatische Speichern kurz nach dem Tippen

function zeigeTagebuch(schluessel) {
  const heute = heuteSchluessel();
  if (!istGueltigerTag(schluessel)) schluessel = heute;
  offenerTag = schluessel;

  const tag = tagebuchTag(schluessel);
  const istHeute = schluessel === heute;
  const text = tag ? tag.text : '';

  inhalt.innerHTML = `
    <header class="tag-kopf">
      <button class="knopf rund" data-aktion="tag-wechseln" data-tag="${tagVerschieben(schluessel, -1)}" aria-label="Vorheriger Tag">‹</button>
      <div class="tag-datum">
        <strong>${istHeute ? 'Heute' : esc(wochentag(schluessel))}</strong>
        <span>${istHeute ? esc(wochentag(schluessel)) + ', ' : ''}${esc(langesDatum(schluessel))}</span>
      </div>
      <button class="knopf rund" data-aktion="tag-wechseln" data-tag="${tagVerschieben(schluessel, 1)}"
              aria-label="Nächster Tag" ${schluessel >= heute ? 'disabled' : ''}>›</button>
    </header>

    <div class="tag-werkzeuge">
      <button class="knopf ${istHeute ? 'aktiv' : ''}" data-aktion="tag-wechseln" data-tag="${heute}">Heute</button>
      <a class="knopf" href="#/kalender/${schluessel.slice(0, 7)}">Kalender</a>
      <a class="knopf" href="#/tagebuchliste">Liste</a>
    </div>

    <div class="stimmungen" role="group" aria-label="Stimmung">
      ${STIMMUNGEN.map(s => `
        <button class="${tag && tag.stimmung === s.stufe ? 'aktiv' : ''}" data-aktion="stimmung" data-stufe="${s.stufe}"
                title="${s.name}" aria-label="${s.name}" style="--farbe:${s.farbe}">${s.emoji}</button>`).join('')}
    </div>

    <div class="takeaway-leiste">
      <button class="knopf" data-aktion="notiz-aus-markierung">✂ Markierung als Notiz</button>
    </div>
    <textarea id="tag-text" class="feld tag-text"
      placeholder="Was habt ihr gemacht? Wo habt ihr gemessen? Wie ging es dir – und warum?">${esc(text)}</textarea>
    <div class="tag-fuss">
      <span id="speicher-status" class="leise klein">${tag ? 'Gespeichert ✓' : ''}</span>
    </div>
    ${notizenAbschnitt(schluessel)}`;

  const feld = document.getElementById('tag-text');
  letzteMarkierung = null;
  for (const art of ['select', 'keyup', 'mouseup', 'touchend']) {
    feld.addEventListener(art, markierungMerken);
  }
  hoeheAnpassen(feld);
  feld.addEventListener('input', () => {
    letzteMarkierung = null;   // Text geändert → alte Markierung passt nicht mehr
    hoeheAnpassen(feld);
    document.getElementById('speicher-status').textContent = '…';
    clearTimeout(speicherTimer);
    speicherTimer = setTimeout(tagebuchSofortSpeichern, 600);
  });
  feld.addEventListener('blur', tagebuchSofortSpeichern);

  // Ist heute noch nichts geschrieben, gleich losschreiben können.
  if (istHeute && !text) feld.focus();
}

// Die Notizen, die aus diesem Tag entstanden sind ("Key Takeaways").
function notizenAbschnitt(schluessel) {
  const notizen = notizenAusTag(schluessel);
  if (!notizen.length) return '';
  return `
    <h2 class="abschnitt">Notizen aus diesem Tag</h2>
    ${eintragListe(notizen)}`;
}

// ---------- Markierung als Notiz ----------
// Auf dem iPhone verliert das Textfeld beim Tippen auf den Knopf den Fokus.
// Deshalb merken wir uns die Markierung schon vorher bei jeder Änderung.

let letzteMarkierung = null;

function markierungMerken() {
  const feld = document.getElementById('tag-text');
  if (feld && feld.selectionEnd > feld.selectionStart) {
    letzteMarkierung = { start: feld.selectionStart, ende: feld.selectionEnd };
  }
}

document.addEventListener('selectionchange', () => {
  if (document.activeElement && document.activeElement.id === 'tag-text') markierungMerken();
});

function markierterText() {
  const feld = document.getElementById('tag-text');
  if (!feld) return '';
  if (feld.selectionEnd > feld.selectionStart) {
    return feld.value.slice(feld.selectionStart, feld.selectionEnd).trim();
  }
  if (letzteMarkierung) return feld.value.slice(letzteMarkierung.start, letzteMarkierung.ende).trim();
  return '';
}

// Textfeld wächst mit dem Text mit, statt einen eigenen Scrollbalken zu bekommen.
function hoeheAnpassen(feld) {
  feld.style.height = 'auto';
  feld.style.height = Math.max(feld.scrollHeight + 2, 260) + 'px';
}

// Speichert noch nicht gesicherten Text sofort. Wird auch beim Verlassen der Ansicht
// und beim Schließen der App aufgerufen, damit kein Wort verloren geht.
function tagebuchSofortSpeichern() {
  clearTimeout(speicherTimer);
  speicherTimer = null;
  const feld = document.getElementById('tag-text');
  if (!feld || !offenerTag) return;
  const vorher = tagebuchTag(offenerTag);
  if ((vorher ? vorher.text : '') === feld.value) return;   // nichts geändert
  tagebuchSpeichern(offenerTag, { text: feld.value });
  const status = document.getElementById('speicher-status');
  if (status) status.textContent = 'Gespeichert ✓';
}

window.addEventListener('pagehide', tagebuchSofortSpeichern);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') tagebuchSofortSpeichern();
});

// ---------- Kalender ----------
//   #/kalender/2026-10  → Monat
//   #/kalender/2026     → Jahr mit 12 Monaten (zum schnellen Wechseln)

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function zeigeKalender(wert) {
  if (/^\d{4}$/.test(wert || '')) return zeigeKalenderJahr(Number(wert));

  const heute = heuteSchluessel();
  const [jahr, monat] = /^\d{4}-\d{2}$/.test(wert || '') ? wert.split('-').map(Number) : heute.split('-').map(Number);
  const monatText = `${jahr}-${String(monat).padStart(2, '0')}`;
  const vorMonat = new Date(jahr, monat - 2, 1);
  const nachMonat = new Date(jahr, monat, 1);

  const ersterWochentag = (new Date(jahr, monat - 1, 1).getDay() + 6) % 7;   // Montag = 0
  const tageImMonat = new Date(jahr, monat, 0).getDate();

  let zellen = '<span class="leer-zelle"></span>'.repeat(ersterWochentag);
  for (let t = 1; t <= tageImMonat; t++) {
    const schluessel = `${monatText}-${String(t).padStart(2, '0')}`;
    const tag = tagebuchTag(schluessel);
    const st = tag && stimmung(tag.stimmung);
    zellen += `
      <a class="kal-tag ${schluessel === heute ? 'heute' : ''} ${tag ? 'hat-eintrag' : ''}" href="#/tagebuch/${schluessel}"
         ${st ? `style="--farbe:${st.farbe}"` : ''} aria-label="${t}. ${MONATE[monat - 1]}${tag ? ', mit Eintrag' : ''}">
        <span>${t}</span>${tag ? `<i class="punkt">${st ? st.emoji : ''}</i>` : ''}
      </a>`;
  }

  const anzahl = tagebuchTage().filter(s => s.startsWith(monatText)).length;

  inhalt.innerHTML = `
    <button class="zurueck" data-aktion="zurueck">‹ Zurück</button>
    <header class="tag-kopf">
      <button class="knopf rund" data-aktion="kalender-wechseln" data-ziel="${datumSchluessel(vorMonat).slice(0, 7)}" aria-label="Vorheriger Monat">‹</button>
      <a class="tag-datum" href="#/kalender/${jahr}">
        <strong>${MONATE[monat - 1]} ▾</strong><span>${jahr}</span>
      </a>
      <button class="knopf rund" data-aktion="kalender-wechseln" data-ziel="${datumSchluessel(nachMonat).slice(0, 7)}" aria-label="Nächster Monat">›</button>
    </header>
    <div class="kalender">
      ${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => `<span class="wochentag">${w}</span>`).join('')}
      ${zellen}
    </div>
    <p class="leise klein">${anzahl === 1 ? '1 Tag' : anzahl + ' Tage'} mit Eintrag in diesem Monat.</p>
    <div class="tag-werkzeuge zwei">
      <button class="knopf" data-aktion="kalender-wechseln" data-ziel="${heute.slice(0, 7)}">Dieser Monat</button>
      <a class="knopf" href="#/tagebuchliste">Liste</a>
    </div>`;
}

function zeigeKalenderJahr(jahr) {
  const tage = tagebuchTage();
  const jetzt = heuteSchluessel().slice(0, 7);
  const monate = MONATE.map((name, i) => {
    const monatText = `${jahr}-${String(i + 1).padStart(2, '0')}`;
    const anzahl = tage.filter(s => s.startsWith(monatText)).length;
    return `
      <a class="monat-kachel ${monatText === jetzt ? 'heute' : ''} ${anzahl ? 'hat-eintrag' : ''}" href="#/kalender/${monatText}">
        <strong>${name.slice(0, 3)}</strong><span>${anzahl ? anzahl + (anzahl === 1 ? ' Tag' : ' Tage') : '–'}</span>
      </a>`;
  }).join('');

  inhalt.innerHTML = `
    <button class="zurueck" data-aktion="zurueck">‹ Zurück</button>
    <header class="tag-kopf">
      <button class="knopf rund" data-aktion="kalender-wechseln" data-ziel="${jahr - 1}" aria-label="Vorheriges Jahr">‹</button>
      <div class="tag-datum"><strong>${jahr}</strong><span>Monat wählen</span></div>
      <button class="knopf rund" data-aktion="kalender-wechseln" data-ziel="${jahr + 1}" aria-label="Nächstes Jahr">›</button>
    </header>
    <div class="monate">${monate}</div>`;
}

// ---------- Liste: Jahr › Monat › Tage ----------
//   #/tagebuchliste

function zeigeTagebuchListe() {
  const tage = tagebuchTage();   // neueste zuerst
  const jetzt = heuteSchluessel();

  // gruppieren: Jahr → Monat → Tage. Eine Map behält die Reihenfolge (neueste zuerst) bei;
  // ein normales Objekt würde Zahlen-Schlüssel wie "2025" von selbst aufsteigend sortieren.
  const jahre = new Map();
  for (const s of tage) {
    const [jahr, monat] = s.split('-');
    if (!jahre.has(jahr)) jahre.set(jahr, new Map());
    const monate = jahre.get(jahr);
    if (!monate.has(monat)) monate.set(monat, []);
    monate.get(monat).push(s);
  }

  // Aufgeklappt sind das aktuelle Jahr und der Monat mit dem neuesten Eintrag.
  const html = [...jahre].map(([jahr, monate]) => {
    const anzahlJahr = [...monate.values()].reduce((summe, liste) => summe + liste.length, 0);
    return `
      <details class="gruppe-auf" ${jahr === jetzt.slice(0, 4) || jahr === tage[0].slice(0, 4) ? 'open' : ''}>
        <summary class="jahr"><span>${jahr}</span><span class="zahl">${anzahlJahr}</span></summary>
        ${[...monate].map(([monat, liste]) => `
          <details class="gruppe-auf" ${`${jahr}-${monat}` === tage[0].slice(0, 7) ? 'open' : ''}>
            <summary class="monat"><span>${MONATE[Number(monat) - 1]}</span><span class="zahl">${liste.length}</span></summary>
            <div class="liste">${liste.map(tagZeile).join('')}</div>
          </details>`).join('')}
      </details>`;
  }).join('');

  inhalt.innerHTML = `
    <button class="zurueck" data-aktion="zurueck">‹ Zurück</button>
    <header class="kopf"><h1>Tagebuch</h1></header>
    ${tage.length
      ? html
      : '<p class="leer">Noch keine Tagebuch-Einträge.<br>Tippe unten auf <strong>Tagebuch</strong>, um mit heute zu beginnen.</p>'}`;
}

// Eine Zeile pro Tag: Wochentag + Datum, Stimmung, erste Worte
function tagZeile(schluessel) {
  const tag = tagebuchTag(schluessel);
  const st = stimmung(tag.stimmung);
  const datum = schluesselZuDatum(schluessel);
  return `
    <a class="eintrag tag-zeile" href="#/tagebuch/${schluessel}">
      <span class="tag-nr">
        <small>${datum.toLocaleDateString('de-DE', { weekday: 'short' })}</small>
        <strong>${datum.getDate()}.</strong>
      </span>
      <span class="tag-vorschau">${esc(tagVorschau(tag)) || '<em class="leise">nur Stimmung</em>'}</span>
      ${st ? `<span class="tag-stimmung" title="${st.name}">${st.emoji}</span>` : ''}
    </a>`;
}

// ---------- Suchtreffer ----------

// Karte für einen Tagebuch-Treffer: Schild, Datum, Stimmung und der Textausschnitt rund um den Treffer.
function tagTrefferKarte(schluessel, anfrage) {
  const tag = tagebuchTag(schluessel);
  const st = stimmung(tag.stimmung);
  return `
    <a class="eintrag" href="#/tagebuch/${schluessel}">
      <span class="schild tagebuch">📖 Tagebuch</span>
      <h3><span class="titel">${esc(wochentag(schluessel))}, ${esc(kurzesDatum(schluessel))}</span>${st ? `<span title="${st.name}">${st.emoji}</span>` : ''}</h3>
      <p class="vorschau">${esc(textAusschnitt(tag.text, anfrage)) || '<em>nur Stimmung</em>'}</p>
    </a>`;
}

// Ein Stück Text rund um das erste gefundene Suchwort (statt immer nur den Anfang).
function textAusschnitt(text, anfrage) {
  const flach = text.replace(/\s+/g, ' ').trim();
  const klein = flach.toLowerCase();
  const stellen = anfrage.toLowerCase().split(/\s+/).filter(Boolean)
    .map(b => klein.indexOf(b)).filter(i => i >= 0);
  if (!stellen.length) return tagVorschau({ text: flach }, 140);
  let start = Math.max(0, Math.min(...stellen) - 50);
  if (start > 0) start = flach.indexOf(' ', start) + 1;   // nicht mitten im Wort anfangen
  const stueck = flach.slice(start, start + 160);
  return (start > 0 ? '… ' : '') + stueck + (start + 160 < flach.length ? ' …' : '');
}

// ---------- Aktionen ----------

const tagebuchAktionen = {
  // Monat bzw. Jahr wechseln, ohne den Verlauf vollzumüllen
  'kalender-wechseln'(knopf) {
    ersetze('#/kalender/' + knopf.dataset.ziel);
  },

  'tag-wechseln'(knopf) {
    if (knopf.disabled) return;
    tagebuchSofortSpeichern();
    ersetze('#/tagebuch/' + knopf.dataset.tag);
  },

  'notiz-aus-markierung'() {
    const text = markierterText();
    if (!text) {
      dialog({
        titel: 'Erst Text markieren',
        text: 'Markiere im Tagebuch den Teil, den du als Notiz behalten willst: Wort lange drücken, dann die Markierung mit den Anfassern ziehen. Danach hier tippen.',
        knoepfe: [{ text: 'OK', wert: null, art: 'haupt' }],
      });
      return;
    }
    tagebuchSofortSpeichern();
    editorOeffnen(null, { text, tag: offenerTag });
  },

  stimmung(knopf) {
    const stufe = Number(knopf.dataset.stufe);
    const tag = tagebuchTag(offenerTag);
    const neu = tag && tag.stimmung === stufe ? null : stufe;   // nochmal antippen = entfernen
    tagebuchSofortSpeichern();
    tagebuchSpeichern(offenerTag, { stimmung: neu });
    // Nur die Knöpfe umfärben, nicht neu zeichnen – sonst wäre der Cursor im Text weg.
    document.querySelectorAll('.stimmungen button').forEach(b => {
      b.classList.toggle('aktiv', Number(b.dataset.stufe) === neu);
    });
    document.getElementById('speicher-status').textContent = 'Gespeichert ✓';
  },
};
