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

    <textarea id="tag-text" class="feld tag-text"
      placeholder="Was habt ihr gemacht? Wo habt ihr gemessen? Wie ging es dir – und warum?">${esc(text)}</textarea>
    <div class="tag-fuss">
      <span id="speicher-status" class="leise klein">${tag ? 'Gespeichert ✓' : ''}</span>
    </div>`;

  const feld = document.getElementById('tag-text');
  hoeheAnpassen(feld);
  feld.addEventListener('input', () => {
    hoeheAnpassen(feld);
    document.getElementById('speicher-status').textContent = '…';
    clearTimeout(speicherTimer);
    speicherTimer = setTimeout(tagebuchSofortSpeichern, 600);
  });
  feld.addEventListener('blur', tagebuchSofortSpeichern);

  // Ist heute noch nichts geschrieben, gleich losschreiben können.
  if (istHeute && !text) feld.focus();
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

// ---------- Aktionen ----------

const tagebuchAktionen = {
  'tag-wechseln'(knopf) {
    if (knopf.disabled) return;
    tagebuchSofortSpeichern();
    ersetze('#/tagebuch/' + knopf.dataset.tag);
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
