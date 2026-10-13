// app.js – Ansichten und Bedienung
//
// Jede Ansicht hat eine Adresse hinter dem #, z. B. #/ordner/eingang.
// zeige() liest die Adresse und zeichnet die passende Ansicht in <main id="inhalt">.

const inhalt = document.getElementById('inhalt');

// ---------- Hilfsfunktionen ----------

// Text sicher in HTML einsetzen (verhindert, dass < oder & das Layout zerstören).
function esc(wert) {
  return String(wert ?? '').replace(/[&<>"']/g, z => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[z]));
}

function toast(nachricht) {
  const el = document.getElementById('toast');
  el.textContent = nachricht;
  el.classList.add('sichtbar');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('sichtbar'), 2200);
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
  inhalt.innerHTML = `
    <header class="kopf"><h1>Ausbildungs-Tagebuch</h1></header>
    <p class="leise">${daten.ordner.length} Ordner angelegt.</p>`;
}

// ---------- Klicks ----------

// Ein einziger Klick-Abfänger für die ganze App:
// data-aktion="..." führt eine Aktion aus, Links und data-link wechseln die Ansicht.
const aktionen = {};

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
